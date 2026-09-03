import { createHash } from "node:crypto";
import type { AtomicModuleSnapshotRepositoryPort } from "../../../application/ports/atomic-module-snapshot.port";
import {
  NwnScriptSourceSnapshotError,
  type CapturedNwnScriptSourceSnapshot,
  type NwnScriptSourceSnapshotCaptureInput,
  type NwnScriptSourceSnapshotPort,
} from "../../../application/ports/nwn-script-source-snapshot.port";
import {
  AREA_EVENT_SCRIPT_NSS_RESOURCE_TYPE,
} from "../../../domain/area-event-script-catalog";
import {
  AREA_EVENT_SCRIPT_INCLUDE_MAX_COUNT,
  AREA_EVENT_SCRIPT_SOURCE_MAX_BYTES,
} from "../../../domain/area-event-script-source-command";
import {
  buildModuleSnapshotManifestKey,
  hashModuleSnapshotManifest,
  validateModuleSnapshotManifest,
} from "../../../domain/module-snapshot-manifest";

const RESREF_PATTERN = /^[a-z0-9_]{1,16}$/u;
const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const MAX_TOTAL_COMPILATION_SOURCE_BYTES = 8 * 1024 * 1024;

export class CommittedNwnScriptSourceSnapshotAdapter
  implements NwnScriptSourceSnapshotPort
{
  constructor(
    private readonly repository: Pick<
      AtomicModuleSnapshotRepositoryPort,
      "readHead" | "readManifest" | "readContent"
    >,
  ) {}

  async capture(
    input: NwnScriptSourceSnapshotCaptureInput,
  ): Promise<CapturedNwnScriptSourceSnapshot> {
    assertInput(input);
    const head = await this.repository.readHead(input.moduleId);
    if (!head || head.quarantined) {
      throw storageError("Committed module snapshot is unavailable or quarantined.");
    }
    if (head.revision !== input.expectedModuleRevision) {
      throw new NwnScriptSourceSnapshotError(
        "AREA_EVENT_SCRIPT_MODULE_REVISION_CONFLICT",
        "Committed module revision changed before include capture.",
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

    const includes: Array<Readonly<{ resref: string; bytes: Buffer }>> = [];
    let totalBytes = input.targetSourceSize;
    const normalizedResRefs = [...input.includeResRefs].sort(compareAscii);
    for (const [index, resref] of normalizedResRefs.entries()) {
      const logicalKey = `${resref}.nss`;
      const matches = manifest.objects.filter(
        (entry) => entry.logicalKey.toLowerCase() === logicalKey,
      );
      if (
        matches.length !== 1 ||
        matches[0].logicalKey !== logicalKey ||
        matches[0].resourceType !== AREA_EVENT_SCRIPT_NSS_RESOURCE_TYPE ||
        matches[0].size > AREA_EVENT_SCRIPT_SOURCE_MAX_BYTES
      ) {
        throw includeError(index, "descriptor_missing_or_invalid");
      }
      const descriptor = matches[0];
      const content = await this.repository.readContent(descriptor.contentKey);
      if (
        !content ||
        content.contentKey !== descriptor.contentKey ||
        content.size !== descriptor.size ||
        content.sha256 !== descriptor.sha256 ||
        content.bytes.length !== descriptor.size ||
        sha256(content.bytes) !== descriptor.sha256
      ) {
        throw storageError(`Committed include content failed readback at ordinal ${index}.`);
      }
      totalBytes += content.bytes.length;
      if (totalBytes > MAX_TOTAL_COMPILATION_SOURCE_BYTES) {
        throw includeError(index, "aggregate_byte_budget_exceeded");
      }
      includes.push(Object.freeze({ resref, bytes: Buffer.from(content.bytes) }));
    }
    return Object.freeze({
      moduleId: input.moduleId,
      revision: head.revision,
      includes: Object.freeze(includes),
    });
  }
}

function assertInput(input: NwnScriptSourceSnapshotCaptureInput): void {
  const values = input?.includeResRefs;
  if (
    typeof input?.moduleId !== "string" ||
    !SHA256_PATTERN.test(input?.expectedModuleRevision ?? "") ||
    !Number.isSafeInteger(input?.targetSourceSize) ||
    input.targetSourceSize < 0 ||
    input.targetSourceSize > AREA_EVENT_SCRIPT_SOURCE_MAX_BYTES ||
    !Array.isArray(values) ||
    values.length > AREA_EVENT_SCRIPT_INCLUDE_MAX_COUNT ||
    values.some((value) => typeof value !== "string" || !RESREF_PATTERN.test(value)) ||
    new Set(values).size !== values.length
  ) {
    throw new NwnScriptSourceSnapshotError(
      "AREA_EVENT_SCRIPT_INCLUDE_INVALID",
      "Include snapshot request is not canonical or exceeds its budget.",
    );
  }
}

function includeError(index: number, reason: string): NwnScriptSourceSnapshotError {
  return new NwnScriptSourceSnapshotError(
    "AREA_EVENT_SCRIPT_INCLUDE_INVALID",
    `Committed include is invalid at ordinal ${index}: ${reason}.`,
  );
}

function storageError(message: string): NwnScriptSourceSnapshotError {
  return new NwnScriptSourceSnapshotError(
    "AREA_EVENT_SCRIPT_STORAGE_UNAVAILABLE",
    message,
  );
}

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function compareAscii(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
