import { createHash } from "node:crypto";
import { AreaDeleteImpactScanner, AreaDeletePreviewError } from "./area-delete-impact-scanner";
import type { AtomicModuleSnapshotRepositoryPort } from "./ports/atomic-module-snapshot.port";
import type { AreaDeleteCompilerPort } from "./ports/area-delete-transaction.port";
import type { AreaDeleteCommand } from "../domain/area-delete-command.validation";
import type {
  AreaDeleteCompiledCandidate,
  AreaDeleteModuleState,
} from "../domain/area-delete-transaction.types";
import {
  buildModuleSnapshotManifestKey,
  hashModuleSnapshotManifest,
  validateModuleSnapshotManifest,
  type ModuleSnapshotManifest,
  type ModuleSnapshotObjectDescriptor,
} from "../domain/module-snapshot-manifest";
import { removeAreaFromModuleIfoAreaList } from "../adapters/outbound/blob/aurora-gff-module-ifo-area-writer";

export type AreaDeleteCompilerFailureCode =
  | "AREA_DELETE_PREVIEW_STALE"
  | "AREA_DELETE_ENTRY_AREA_BLOCKED"
  | "AREA_DELETE_REFERENCES_BLOCKED"
  | "AREA_DELETE_SCAN_INCOMPLETE"
  | "AREA_DELETE_MEMBERSHIP_INVALID"
  | "AREA_DELETE_SOURCE_MISSING"
  | "AREA_DELETE_RESOURCE_COLLISION"
  | "AREA_DELETE_STORAGE_UNAVAILABLE";

export class AreaDeleteCompilerFailure extends Error {
  constructor(
    readonly code: AreaDeleteCompilerFailureCode,
    readonly status: number,
    message: string,
    readonly details: readonly string[] = [],
  ) {
    super(message);
    this.name = "AreaDeleteCompilerFailure";
    this.details = Object.freeze([...details]);
  }
}

export interface AreaDeleteCandidateCompilerDependencies {
  readonly repository: Pick<
    AtomicModuleSnapshotRepositoryPort,
    "readHead" | "readManifest" | "readContent"
  >;
  readonly scanner: Pick<AreaDeleteImpactScanner, "scan">;
}

export class AreaDeleteCandidateCompiler implements AreaDeleteCompilerPort {
  constructor(private readonly dependencies: AreaDeleteCandidateCompilerDependencies) {}

  async compile(
    command: AreaDeleteCommand,
    moduleState: AreaDeleteModuleState,
    _actorId: string,
    _transactionId: string,
  ): Promise<AreaDeleteCompiledCandidate> {
    if (
      moduleState.moduleId !== command.moduleId ||
      moduleState.revision !== command.expectedModuleRevision ||
      moduleState.quarantined
    ) {
      throw failure(
        "AREA_DELETE_STORAGE_UNAVAILABLE",
        503,
        "Locked module state is outside the Area Delete command scope.",
      );
    }
    let preview;
    try {
      preview = await this.dependencies.scanner.scan({
        moduleId: command.moduleId,
        areaResRef: command.areaResRef,
        expectedModuleRevision: command.expectedModuleRevision,
      });
    } catch (error) {
      if (error instanceof AreaDeletePreviewError) {
        throw failure(
          error.code === "AREA_DELETE_SOURCE_MISSING"
            ? "AREA_DELETE_SOURCE_MISSING"
            : error.code === "AREA_DELETE_RESOURCE_COLLISION"
              ? "AREA_DELETE_RESOURCE_COLLISION"
              : "AREA_DELETE_STORAGE_UNAVAILABLE",
          error.status,
          error.message,
          error.details,
        );
      }
      throw error;
    }
    if (preview.previewSha256 !== command.preview.sha256) {
      throw failure(
        "AREA_DELETE_PREVIEW_STALE",
        412,
        "Locked Area Delete preview differs from the confirmed preview.",
        [`expected=${command.preview.sha256}`, `actual=${preview.previewSha256}`],
      );
    }
    if (preview.blockerCount > 0) {
      const codes = new Set(preview.findings.map((entry) => entry.code));
      const details = preview.findings.map(
        (entry) => `${entry.code}:${entry.resourceKey}:${entry.fieldPath}`,
      );
      if (codes.has("AREA_DELETE_ENTRY_AREA_REFERENCE")) {
        throw failure(
          "AREA_DELETE_ENTRY_AREA_BLOCKED",
          409,
          "The native module entry Area cannot be deleted.",
          details,
        );
      }
      if (codes.has("AREA_DELETE_MEMBERSHIP_INVALID")) {
        throw failure(
          "AREA_DELETE_MEMBERSHIP_INVALID",
          409,
          "Target IFO membership is not exactly one.",
          details,
        );
      }
      if ([
        "AREA_DELETE_COMPILED_SCRIPT_UNINSPECTABLE",
        "AREA_DELETE_GIT_SCAN_INVALID",
        "AREA_DELETE_TARGET_RESOURCE_INVALID",
        "AREA_DELETE_REFERENCE_SCAN_TRUNCATED",
      ].some((code) => codes.has(code as never))) {
        throw failure(
          "AREA_DELETE_SCAN_INCOMPLETE",
          409,
          "Area Delete impact scan is incomplete.",
          details,
        );
      }
      throw failure(
        "AREA_DELETE_REFERENCES_BLOCKED",
        409,
        "Inbound Area references block deletion.",
        details,
      );
    }

    const head = await this.dependencies.repository.readHead(command.moduleId);
    if (
      !head ||
      head.quarantined ||
      head.revision !== moduleState.revision ||
      head.moduleId !== moduleState.moduleId
    ) {
      throw failure(
        "AREA_DELETE_STORAGE_UNAVAILABLE",
        503,
        "Module head changed after the locked preview.",
      );
    }
    const manifest = await this.dependencies.repository.readManifest(head.manifestKey);
    if (!manifest) {
      throw failure("AREA_DELETE_STORAGE_UNAVAILABLE", 503, "Module manifest is missing.");
    }
    assertManifest(manifest, head);
    const removedResources = [];
    for (const extension of ["are", "gic", "git"] as const) {
      const logicalKey = `${command.areaResRef}.${extension}`;
      const descriptor = requireDescriptor(manifest, logicalKey, resourceType(extension));
      const bytes = await this.readVerified(descriptor);
      removedResources.push(Object.freeze({
        extension,
        key: logicalKey,
        fileName: descriptor.logicalKey,
        resourceType: descriptor.resourceType,
        bytes,
        size: descriptor.size,
        sha256: descriptor.sha256,
      }));
    }
    const ifoDescriptor = requireDescriptor(manifest, "module.ifo", 2014);
    const baselineIfo = await this.readVerified(ifoDescriptor);
    let candidateIfo: Buffer;
    try {
      candidateIfo = removeAreaFromModuleIfoAreaList(
        baselineIfo,
        command.areaResRef,
      ).bytes;
    } catch (error) {
      throw failure(
        "AREA_DELETE_MEMBERSHIP_INVALID",
        409,
        "Target IFO membership cannot be removed exactly once.",
        [errorMessage(error)],
      );
    }
    return deepFreeze({
      areaId: command.areaResRef,
      preview,
      removedResources,
      moduleIfo: {
        key: "module.ifo",
        fileName: ifoDescriptor.logicalKey,
        resourceType: ifoDescriptor.resourceType,
        baselineBytes: baselineIfo,
        baselineSha256: ifoDescriptor.sha256,
        candidateBytes: candidateIfo,
        candidateSha256: sha256(candidateIfo),
      },
      survivorCount: manifest.objects.length - removedResources.length,
    });
  }

  private async readVerified(descriptor: ModuleSnapshotObjectDescriptor): Promise<Buffer> {
    const retained = await this.dependencies.repository.readContent(descriptor.contentKey);
    if (
      !retained ||
      retained.size !== descriptor.size ||
      retained.sha256 !== descriptor.sha256 ||
      retained.bytes.length !== descriptor.size ||
      sha256(retained.bytes) !== descriptor.sha256
    ) {
      throw failure(
        "AREA_DELETE_STORAGE_UNAVAILABLE",
        503,
        `Snapshot content differs for ${descriptor.logicalKey}.`,
      );
    }
    return Buffer.from(retained.bytes);
  }
}

function assertManifest(
  manifest: ModuleSnapshotManifest,
  head: Readonly<{ revision: string; manifestKey: string; manifestSha256: string }>,
): void {
  let verified: ModuleSnapshotManifest;
  let manifestKey: string;
  let manifestSha256: string;
  try {
    verified = validateModuleSnapshotManifest(manifest);
    manifestKey = buildModuleSnapshotManifestKey(verified);
    manifestSha256 = hashModuleSnapshotManifest(verified);
  } catch (error) {
    throw failure(
      "AREA_DELETE_STORAGE_UNAVAILABLE",
      503,
      "Module manifest is not a canonical immutable snapshot.",
      [errorMessage(error)],
    );
  }
  if (
    verified.revision !== head.revision ||
    manifestKey !== head.manifestKey ||
    manifestSha256 !== head.manifestSha256
  ) {
    throw failure(
      "AREA_DELETE_STORAGE_UNAVAILABLE",
      503,
      "Module manifest does not match the captured head.",
    );
  }
}

function requireDescriptor(
  manifest: ModuleSnapshotManifest,
  logicalKey: string,
  expectedType: number,
): ModuleSnapshotObjectDescriptor {
  const matches = manifest.objects.filter(
    (entry) => entry.logicalKey.toLowerCase() === logicalKey.toLowerCase(),
  );
  if (matches.length === 0) {
    throw failure("AREA_DELETE_SOURCE_MISSING", 404, `Missing resource ${logicalKey}.`);
  }
  if (matches.length !== 1 || matches[0].resourceType !== expectedType) {
    throw failure(
      "AREA_DELETE_RESOURCE_COLLISION",
      409,
      `Resource identity collides for ${logicalKey}.`,
    );
  }
  return matches[0];
}

function resourceType(extension: "are" | "git" | "gic"): number {
  return extension === "are" ? 2012 : extension === "git" ? 2023 : 2046;
}

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function failure(
  code: AreaDeleteCompilerFailureCode,
  status: number,
  message: string,
  details: readonly string[] = [],
): AreaDeleteCompilerFailure {
  return new AreaDeleteCompilerFailure(code, status, message, details);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  if (ArrayBuffer.isView(value)) return value;
  for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  return Object.freeze(value);
}
