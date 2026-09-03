import { createHash } from "node:crypto";
import {
  AreaRenameImpactScanner,
  AreaRenamePreviewError,
} from "./area-rename-impact-scanner";
import type { AtomicModuleSnapshotRepositoryPort } from "./ports/atomic-module-snapshot.port";
import type { AreaRenameCommand } from "../domain/area-rename-command.validation";
import type {
  AreaRenameCandidateResource,
  AreaRenameCompiledCandidate,
  AreaRenameModuleState,
} from "../domain/area-rename-transaction.types";
import {
  applyModuleSnapshotMutation,
  buildModuleSnapshotManifestKey,
  hashModuleSnapshotManifest,
  validateModuleSnapshotManifest,
  type ModuleSnapshotManifest,
  type ModuleSnapshotObjectDescriptor,
} from "../domain/module-snapshot-manifest";
import {
  readExactAreaRootResRef,
  readExactModuleAreaIdentity,
  renameAreaRootResRef,
  renameModuleAreaIdentity,
} from "../adapters/outbound/blob/aurora-gff-area-resref-rename-writer";

const EXTENSIONS = ["are", "gic", "git"] as const;

export type AreaRenameCompilerFailureCode =
  | "AREA_RENAME_PREVIEW_STALE"
  | "AREA_RENAME_REFERENCES_BLOCKED"
  | "AREA_RENAME_SCAN_INCOMPLETE"
  | "AREA_RENAME_IDENTITY_INVALID"
  | "AREA_RENAME_MEMBERSHIP_INVALID"
  | "AREA_RENAME_SOURCE_MISSING"
  | "AREA_RENAME_RESOURCE_COLLISION"
  | "AREA_RENAME_STORAGE_UNAVAILABLE";

export class AreaRenameCompilerFailure extends Error {
  constructor(
    readonly code: AreaRenameCompilerFailureCode,
    readonly status: number,
    message: string,
    readonly details: readonly string[] = [],
  ) {
    super(message);
    this.name = "AreaRenameCompilerFailure";
    this.details = Object.freeze([...details]);
  }
}

export interface AreaRenameCandidateCompilerDependencies {
  readonly repository: Pick<
    AtomicModuleSnapshotRepositoryPort,
    "readHead" | "readManifest" | "readContent"
  >;
  readonly scanner: Pick<AreaRenameImpactScanner, "scan">;
}

export class AreaRenameCandidateCompiler {
  constructor(private readonly dependencies: AreaRenameCandidateCompilerDependencies) {}

  async compile(
    command: AreaRenameCommand,
    moduleState: AreaRenameModuleState,
    _actorId: string,
    _transactionId: string,
  ): Promise<AreaRenameCompiledCandidate> {
    if (moduleState.moduleId !== command.moduleId ||
        moduleState.revision !== command.expectedModuleRevision ||
        moduleState.quarantined) {
      throw failure(
        "AREA_RENAME_STORAGE_UNAVAILABLE",
        503,
        "Locked module state is outside the Area rename command scope.",
      );
    }

    let preview;
    try {
      preview = await this.dependencies.scanner.scan({
        moduleId: command.moduleId,
        areaResRef: command.areaResRef,
        targetAreaResRef: command.targetAreaResRef,
        expectedModuleRevision: command.expectedModuleRevision,
      });
    } catch (error) {
      if (error instanceof AreaRenamePreviewError) {
        throw failure(
          error.code === "AREA_RENAME_SOURCE_MISSING"
            ? "AREA_RENAME_SOURCE_MISSING"
            : error.code === "AREA_RENAME_RESOURCE_COLLISION"
              ? "AREA_RENAME_RESOURCE_COLLISION"
              : "AREA_RENAME_STORAGE_UNAVAILABLE",
          error.status,
          error.message,
          error.details,
        );
      }
      throw error;
    }
    if (preview.previewSha256 !== command.preview.sha256) {
      throw failure(
        "AREA_RENAME_PREVIEW_STALE",
        412,
        "Locked Area rename preview differs from the confirmed preview.",
        [`expected=${command.preview.sha256}`, `actual=${preview.previewSha256}`],
      );
    }
    assertPreviewHasNoBlockers(preview);

    const head = await this.dependencies.repository.readHead(command.moduleId);
    if (!head || head.quarantined ||
        head.revision !== moduleState.revision || head.moduleId !== moduleState.moduleId) {
      throw failure(
        "AREA_RENAME_STORAGE_UNAVAILABLE",
        503,
        "Module head changed after the locked Area rename preview.",
      );
    }
    const manifest = await this.dependencies.repository.readManifest(head.manifestKey);
    if (!manifest) {
      throw failure("AREA_RENAME_STORAGE_UNAVAILABLE", 503, "Module manifest is missing.");
    }
    assertManifest(manifest, head);

    const source: AreaRenameCandidateResource[] = [];
    for (const extension of EXTENSIONS) {
      const sourceKey = `${command.areaResRef}.${extension}`;
      const targetKey = `${command.targetAreaResRef}.${extension}`;
      const descriptor = requireDescriptor(manifest, sourceKey, resourceType(extension));
      if (manifest.objects.some((entry) => entry.logicalKey.toLowerCase() === targetKey)) {
        throw failure(
          "AREA_RENAME_RESOURCE_COLLISION",
          409,
          `Area rename target resource already exists: ${targetKey}.`,
        );
      }
      const baselineBytes = await this.readVerified(descriptor);
      let candidateBytes: Buffer = Buffer.from(baselineBytes);
      if (extension === "are") {
        try {
          candidateBytes = renameAreaRootResRef(
            baselineBytes,
            command.areaResRef,
            command.targetAreaResRef,
          ).bytes;
        } catch (error) {
          throw failure(
            "AREA_RENAME_IDENTITY_INVALID",
            409,
            "Source ARE identity cannot be renamed exactly once.",
            [errorMessage(error)],
          );
        }
      }
      source.push(Object.freeze({
        extension,
        sourceKey,
        targetKey,
        resourceType: descriptor.resourceType,
        baselineBytes,
        baselineSize: descriptor.size,
        baselineSha256: descriptor.sha256,
        candidateBytes,
        candidateSize: candidateBytes.length,
        candidateSha256: sha256(candidateBytes),
      }));
    }

    const ifoDescriptor = requireDescriptor(manifest, "module.ifo", 2014);
    const baselineIfo = await this.readVerified(ifoDescriptor);
    let renamedIfo;
    try {
      renamedIfo = renameModuleAreaIdentity(
        baselineIfo,
        command.areaResRef,
        command.targetAreaResRef,
      );
    } catch (error) {
      throw failure(
        "AREA_RENAME_MEMBERSHIP_INVALID",
        409,
        "Module IFO Area identity cannot be renamed exactly once.",
        [errorMessage(error)],
      );
    }
    const moduleIfo = Object.freeze({
      key: "module.ifo" as const,
      resourceType: 2014 as const,
      baselineBytes: baselineIfo,
      baselineSize: ifoDescriptor.size,
      baselineSha256: ifoDescriptor.sha256,
      candidateBytes: renamedIfo.bytes,
      candidateSize: renamedIfo.bytes.length,
      candidateSha256: sha256(renamedIfo.bytes),
    });
    const successorManifest = applyModuleSnapshotMutation(manifest, {
      removals: source.map((entry) => entry.sourceKey),
      upserts: [
        ...source.map((entry) => ({
          logicalKey: entry.targetKey,
          resourceType: entry.resourceType,
          size: entry.candidateSize,
          sha256: entry.candidateSha256,
        })),
        {
          logicalKey: moduleIfo.key,
          resourceType: moduleIfo.resourceType,
          size: moduleIfo.candidateSize,
          sha256: moduleIfo.candidateSha256,
        },
      ],
    });
    assertSuccessor(
      manifest,
      successorManifest,
      source,
      moduleIfo,
      command.areaResRef,
      command.targetAreaResRef,
      renamedIfo.entryAreaUpdated,
    );

    return deepFreeze({
      areaId: command.areaResRef,
      targetAreaId: command.targetAreaResRef,
      preview,
      resources: source,
      moduleIfo,
      entryAreaUpdated: renamedIfo.entryAreaUpdated,
      survivorCount: manifest.objects.length - source.length,
      baselineManifest: manifest,
      successorManifest,
    });
  }

  private async readVerified(descriptor: ModuleSnapshotObjectDescriptor): Promise<Buffer> {
    const retained = await this.dependencies.repository.readContent(descriptor.contentKey);
    if (!retained || retained.size !== descriptor.size ||
        retained.sha256 !== descriptor.sha256 || retained.bytes.length !== descriptor.size ||
        sha256(retained.bytes) !== descriptor.sha256) {
      throw failure(
        "AREA_RENAME_STORAGE_UNAVAILABLE",
        503,
        `Snapshot content differs for ${descriptor.logicalKey}.`,
      );
    }
    return Buffer.from(retained.bytes);
  }
}

function assertPreviewHasNoBlockers(
  preview: Awaited<ReturnType<AreaRenameImpactScanner["scan"]>>,
): void {
  if (preview.blockerCount === 0) return;
  const codes = new Set(preview.findings.map((entry) => entry.code));
  const details = preview.findings.map(
    (entry) => `${entry.code}:${entry.resourceKey}:${entry.fieldPath}`,
  );
  if (codes.has("AREA_RENAME_SOURCE_IDENTITY_INVALID")) {
    throw failure("AREA_RENAME_IDENTITY_INVALID", 409, "Source Area identity is malformed.", details);
  }
  if (codes.has("AREA_RENAME_MEMBERSHIP_INVALID")) {
    throw failure("AREA_RENAME_MEMBERSHIP_INVALID", 409, "Module Area membership is malformed.", details);
  }
  if (codes.has("AREA_RENAME_COMPANION_INVALID") ||
      codes.has("AREA_RENAME_SCAN_BUDGET_EXCEEDED") ||
      codes.has("AREA_RENAME_REFERENCE_SCAN_TRUNCATED")) {
    throw failure("AREA_RENAME_SCAN_INCOMPLETE", 409, "Area rename impact scan is incomplete.", details);
  }
  throw failure("AREA_RENAME_REFERENCES_BLOCKED", 409, "Static Area references block rename.", details);
}

function assertSuccessor(
  baseline: ModuleSnapshotManifest,
  successor: ModuleSnapshotManifest,
  resources: readonly Readonly<{
    sourceKey: string;
    targetKey: string;
    candidateBytes: Buffer;
    candidateSize: number;
    candidateSha256: string;
  }>[],
  moduleIfo: Readonly<{ candidateBytes: Buffer; candidateSize: number; candidateSha256: string }>,
  sourceAreaResRef: string,
  targetAreaResRef: string,
  entryAreaUpdated: boolean,
): void {
  if (successor.parentRevision !== baseline.revision) {
    throw failure("AREA_RENAME_STORAGE_UNAVAILABLE", 503, "Successor parent revision is invalid.");
  }
  for (const resource of resources) {
    if (findDescriptor(successor, resource.sourceKey) ||
        !descriptorMatches(findDescriptor(successor, resource.targetKey), resource)) {
      throw failure("AREA_RENAME_STORAGE_UNAVAILABLE", 503, "Successor resource move is invalid.");
    }
  }
  const ifoDescriptor = findDescriptor(successor, "module.ifo");
  if (!descriptorMatches(ifoDescriptor, moduleIfo)) {
    throw failure("AREA_RENAME_STORAGE_UNAVAILABLE", 503, "Successor module IFO descriptor is invalid.");
  }
  const sourceReadback = readExactModuleAreaIdentity(moduleIfo.candidateBytes, sourceAreaResRef);
  const targetReadback = readExactModuleAreaIdentity(moduleIfo.candidateBytes, targetAreaResRef);
  if (!sourceReadback || !targetReadback ||
      sourceReadback.membershipCount !== 0 || targetReadback.membershipCount !== 1 ||
      (entryAreaUpdated && targetReadback.entryAreaResRef !== targetAreaResRef)) {
    throw failure("AREA_RENAME_MEMBERSHIP_INVALID", 409, "Candidate IFO readback is invalid.");
  }
  const candidateAre = resources.find((entry) => entry.targetKey.endsWith(".are"));
  if (!candidateAre || readExactAreaRootResRef(candidateAre.candidateBytes) !== targetAreaResRef) {
    throw failure("AREA_RENAME_IDENTITY_INVALID", 409, "Candidate ARE identity is invalid.");
  }
  const changedKeys = new Set([
    ...resources.map((entry) => entry.sourceKey.toLowerCase()),
    "module.ifo",
  ]);
  for (const descriptor of baseline.objects) {
    if (changedKeys.has(descriptor.logicalKey.toLowerCase())) continue;
    const retained = findDescriptor(successor, descriptor.logicalKey);
    if (!retained || JSON.stringify(retained) !== JSON.stringify(descriptor)) {
      throw failure("AREA_RENAME_STORAGE_UNAVAILABLE", 503, "Successor changed an unrelated descriptor.");
    }
  }
}

function descriptorMatches(
  descriptor: ModuleSnapshotObjectDescriptor | undefined,
  expected: Readonly<{ candidateSize: number; candidateSha256: string }>,
): boolean {
  return descriptor?.size === expected.candidateSize && descriptor.sha256 === expected.candidateSha256;
}

function findDescriptor(
  manifest: ModuleSnapshotManifest,
  logicalKey: string,
): ModuleSnapshotObjectDescriptor | undefined {
  return manifest.objects.find((entry) => entry.logicalKey.toLowerCase() === logicalKey.toLowerCase());
}

function assertManifest(
  manifest: ModuleSnapshotManifest,
  head: Readonly<{ revision: string; manifestKey: string; manifestSha256: string }>,
): void {
  try {
    const verified = validateModuleSnapshotManifest(manifest);
    if (verified.revision !== head.revision ||
        buildModuleSnapshotManifestKey(verified) !== head.manifestKey ||
        hashModuleSnapshotManifest(verified) !== head.manifestSha256) {
      throw new Error("captured head mismatch");
    }
  } catch (error) {
    throw failure(
      "AREA_RENAME_STORAGE_UNAVAILABLE",
      503,
      "Module manifest is not the captured immutable snapshot.",
      [errorMessage(error)],
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
    throw failure("AREA_RENAME_SOURCE_MISSING", 404, `Missing resource ${logicalKey}.`);
  }
  if (matches.length !== 1 || matches[0]?.resourceType !== expectedType) {
    throw failure("AREA_RENAME_RESOURCE_COLLISION", 409, `Resource identity collides for ${logicalKey}.`);
  }
  return matches[0];
}

function resourceType(extension: typeof EXTENSIONS[number]): number {
  return extension === "are" ? 2012 : extension === "git" ? 2023 : 2046;
}

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function failure(
  code: AreaRenameCompilerFailureCode,
  status: number,
  message: string,
  details: readonly string[] = [],
): AreaRenameCompilerFailure {
  return new AreaRenameCompilerFailure(code, status, message, details);
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
