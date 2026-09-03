import { createHash } from "node:crypto";
import type { AtomicModuleSnapshotRepositoryPort } from "../../../application/ports/atomic-module-snapshot.port";
import {
  AREA_EVENT_SCRIPT_SOURCE_SNAPSHOT_SCHEMA_VERSION,
  AreaEventScriptSourceQueryError,
  type AreaEventScriptSourceQueryInput,
  type AreaEventScriptSourceQueryPort,
  type AreaEventScriptSourceSnapshot,
} from "../../../application/ports/area-event-script-source-query.port";
import { AREA_EVENT_SCRIPT_NSS_RESOURCE_TYPE } from "../../../domain/area-event-script-catalog";
import { AREA_EVENT_SCRIPT_SOURCE_MAX_BYTES } from "../../../domain/area-event-script-source-command";
import {
  buildModuleSnapshotManifestKey,
  hashModuleSnapshotManifest,
  validateModuleSnapshotManifest,
} from "../../../domain/module-snapshot-manifest";

const MODULE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const RESREF_PATTERN = /^[a-z0-9_]{1,16}$/u;
const SHA256_PATTERN = /^[a-f0-9]{64}$/u;

export class CommittedAreaEventScriptSourceQueryAdapter
  implements AreaEventScriptSourceQueryPort
{
  constructor(
    private readonly repository: Pick<
      AtomicModuleSnapshotRepositoryPort,
      "readHead" | "readManifest" | "readContent"
    >,
  ) {}

  async read(input: AreaEventScriptSourceQueryInput): Promise<AreaEventScriptSourceSnapshot> {
    assertInput(input);
    const head = await this.repository.readHead(input.moduleId);
    if (!head || head.quarantined || head.moduleId !== input.moduleId) {
      throw storageError("Committed module snapshot is unavailable or quarantined.");
    }
    if (head.revision !== input.expectedModuleRevision) {
      throw queryError(
        "AREA_EVENT_SCRIPT_MODULE_REVISION_CONFLICT",
        "Committed module revision changed before source capture.",
      );
    }
    const rawManifest = await this.repository.readManifest(head.manifestKey);
    let manifest;
    try {
      manifest = rawManifest && validateModuleSnapshotManifest(rawManifest);
    } catch {
      throw storageError("Committed module manifest failed validation.");
    }
    if (
      !manifest ||
      manifest.moduleId !== input.moduleId ||
      manifest.revision !== head.revision ||
      buildModuleSnapshotManifestKey(manifest) !== head.manifestKey ||
      hashModuleSnapshotManifest(manifest) !== head.manifestSha256
    ) {
      throw storageError("Committed module head does not resolve to its exact manifest.");
    }

    const logicalKey = `${input.targetResRef}.nss`;
    const matches = manifest.objects.filter(
      (descriptor) => descriptor.logicalKey.toLowerCase() === logicalKey,
    );
    if (matches.length === 0) {
      throw queryError(
        "AREA_EVENT_SCRIPT_SOURCE_NOT_FOUND",
        "Committed script source does not exist.",
      );
    }
    const descriptor = matches[0];
    if (
      matches.length !== 1 ||
      descriptor.logicalKey !== logicalKey ||
      descriptor.resourceType !== AREA_EVENT_SCRIPT_NSS_RESOURCE_TYPE
    ) {
      throw storageError("Committed script source descriptor is ambiguous or invalid.");
    }
    if (descriptor.size > AREA_EVENT_SCRIPT_SOURCE_MAX_BYTES) {
      throw queryError(
        "AREA_EVENT_SCRIPT_SOURCE_INVALID",
        "Committed script source exceeds the editable source budget.",
      );
    }
    const content = await this.repository.readContent(descriptor.contentKey);
    if (
      !content ||
      content.contentKey !== descriptor.contentKey ||
      content.size !== descriptor.size ||
      content.sha256 !== descriptor.sha256 ||
      content.bytes.length !== descriptor.size ||
      sha256(content.bytes) !== descriptor.sha256
    ) {
      throw storageError("Committed script source content failed readback.");
    }
    const sourceText = content.bytes.toString("utf8");
    if (!Buffer.from(sourceText, "utf8").equals(content.bytes)) {
      throw queryError(
        "AREA_EVENT_SCRIPT_SOURCE_INVALID",
        "Committed script source is not lossless UTF-8 text.",
      );
    }
    return Object.freeze({
      schemaVersion: AREA_EVENT_SCRIPT_SOURCE_SNAPSHOT_SCHEMA_VERSION,
      moduleId: input.moduleId,
      moduleRevision: head.revision,
      targetResRef: input.targetResRef,
      sourceEncoding: "utf-8",
      sourceText,
      sourceSize: content.size,
      sourceSha256: content.sha256,
    });
  }
}

function assertInput(input: AreaEventScriptSourceQueryInput): void {
  if (
    !input ||
    !MODULE_ID_PATTERN.test(input.moduleId ?? "") ||
    !RESREF_PATTERN.test(input.targetResRef ?? "") ||
    input.targetResRef === "nwscript" ||
    !SHA256_PATTERN.test(input.expectedModuleRevision ?? "")
  ) {
    throw queryError(
      "AREA_EVENT_SCRIPT_SOURCE_INVALID",
      "Script source query identity is not canonical.",
    );
  }
}

function storageError(message: string): AreaEventScriptSourceQueryError {
  return queryError("AREA_EVENT_SCRIPT_STORAGE_UNAVAILABLE", message);
}

function queryError(
  code: ConstructorParameters<typeof AreaEventScriptSourceQueryError>[0],
  message: string,
): AreaEventScriptSourceQueryError {
  return new AreaEventScriptSourceQueryError(code, message);
}

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}
