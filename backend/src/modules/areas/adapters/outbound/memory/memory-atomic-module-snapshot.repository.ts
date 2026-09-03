import { createHash } from "node:crypto";
import type {
  AreaCreateLeaseGuardPort,
  AreaCreateSnapshotStageDescriptor,
  AtomicModuleSnapshotRepositoryPort,
  ModuleSnapshotContentRecord,
  ModuleSnapshotHead,
  ModuleSnapshotHeadIdentity,
  ModuleSnapshotPublicationResult,
  ModuleSnapshotQuarantineRecord,
  ModuleSnapshotRestorationResult,
} from "../../../application/ports/atomic-module-snapshot.port";
import {
  AREA_CREATE_SNAPSHOT_STAGE_SCHEMA_VERSION,
  MODULE_SNAPSHOT_HEAD_SCHEMA_VERSION,
} from "../../../application/ports/atomic-module-snapshot.port";
import type { AreaCreateModuleLease } from "../../../application/ports/area-create-transaction.port";
import {
  buildModuleSnapshotContentKey,
  buildModuleSnapshotManifestKey,
  hashModuleSnapshotManifest,
  normalizeModuleSnapshotLogicalKey,
  validateModuleSnapshotManifest,
  type ModuleSnapshotManifest,
} from "../../../domain/module-snapshot-manifest";

const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const MAX_DIAGNOSTICS = 100;
const MAX_DIAGNOSTIC_BYTES = 1_024;

export class MemoryAtomicModuleSnapshotRepository
  implements AtomicModuleSnapshotRepositoryPort
{
  private readonly contents = new Map<string, ModuleSnapshotContentRecord>();
  private readonly manifests = new Map<string, ModuleSnapshotManifest>();
  private readonly stages = new Map<string, AreaCreateSnapshotStageDescriptor>();
  private readonly heads = new Map<string, ModuleSnapshotHead>();
  private readonly quarantines = new Map<string, ModuleSnapshotQuarantineRecord>();

  constructor(
    private readonly leaseGuard: AreaCreateLeaseGuardPort,
    private readonly now: () => Date = () => new Date(),
  ) {}

  static manifestKey(manifest: ModuleSnapshotManifest): string {
    return buildModuleSnapshotManifestKey(manifest);
  }

  static manifestSha256(manifest: ModuleSnapshotManifest): string {
    return hashModuleSnapshotManifest(manifest);
  }

  async bootstrap(
    manifest: ModuleSnapshotManifest,
    contentsByLogicalKey: Readonly<Record<string, Buffer>>,
    updatedAt: string,
  ): Promise<ModuleSnapshotHead> {
    const verified = validateManifest(manifest);
    const existingHead = this.heads.get(verified.moduleId);
    if (existingHead) {
      const expected = identityFor(verified);
      if (sameIdentity(existingHead, expected) && !existingHead.quarantined) {
        return cloneFrozen(existingHead);
      }
      throw snapshotError(
        "AREA_SNAPSHOT_HEAD_CONFLICT",
        "Module snapshot head already exists with another baseline.",
      );
    }
    const suppliedKeys = Object.keys(contentsByLogicalKey).sort();
    const expectedKeys = verified.objects.map((entry) => entry.logicalKey).sort();
    if (JSON.stringify(suppliedKeys) !== JSON.stringify(expectedKeys)) {
      throw snapshotError(
        "AREA_SNAPSHOT_BOOTSTRAP_MISMATCH",
        "Bootstrap content keys do not match the complete manifest.",
      );
    }
    for (const descriptor of verified.objects) {
      const bytes = Buffer.from(contentsByLogicalKey[descriptor.logicalKey]);
      if (
        bytes.length !== descriptor.size ||
        sha256Hex(bytes) !== descriptor.sha256
      ) {
        throw snapshotError(
          "AREA_SNAPSHOT_BOOTSTRAP_MISMATCH",
          `Bootstrap content does not match ${descriptor.logicalKey}.`,
        );
      }
      await this.putContentIfAbsent(bytes, descriptor.sha256);
    }
    await this.putManifestIfAbsent(verified);
    const head = createHead(verified.moduleId, identityFor(verified), false, 0, updatedAt);
    this.heads.set(verified.moduleId, head);
    return cloneFrozen(head);
  }

  async readHead(moduleId: string): Promise<ModuleSnapshotHead | null> {
    const head = this.heads.get(moduleId);
    return head ? cloneFrozen(head) : null;
  }

  async readManifest(manifestKey: string): Promise<ModuleSnapshotManifest | null> {
    const manifest = this.manifests.get(manifestKey);
    return manifest ? cloneFrozen(manifest) : null;
  }

  async readContent(contentKey: string): Promise<ModuleSnapshotContentRecord | null> {
    const record = this.contents.get(contentKey);
    return record
      ? Object.freeze({
          contentKey: record.contentKey,
          size: record.size,
          sha256: record.sha256,
          bytes: Buffer.from(record.bytes),
        })
      : null;
  }

  async putContentIfAbsent(
    bytes: Buffer,
    sha256: string,
  ): Promise<Omit<ModuleSnapshotContentRecord, "bytes">> {
    const candidate = Buffer.from(bytes);
    const actual = sha256Hex(candidate);
    if (actual !== sha256) {
      throw snapshotError(
        "AREA_SNAPSHOT_CONTENT_HASH_MISMATCH",
        "Content bytes do not match the declared SHA-256.",
      );
    }
    const contentKey = buildModuleSnapshotContentKey(sha256);
    const existing = this.contents.get(contentKey);
    if (existing && !existing.bytes.equals(candidate)) {
      throw snapshotError(
        "AREA_SNAPSHOT_CONTENT_CONFLICT",
        "Immutable content key is already bound to different bytes.",
      );
    }
    if (!existing) {
      this.contents.set(
        contentKey,
        Object.freeze({
          contentKey,
          size: candidate.length,
          sha256,
          bytes: Buffer.from(candidate),
        }),
      );
    }
    return Object.freeze({ contentKey, size: candidate.length, sha256 });
  }

  async putManifestIfAbsent(
    manifest: ModuleSnapshotManifest,
  ): Promise<ModuleSnapshotManifest> {
    const verified = validateManifest(manifest);
    const key = MemoryAtomicModuleSnapshotRepository.manifestKey(verified);
    const existing = this.manifests.get(key);
    if (existing && JSON.stringify(existing) !== JSON.stringify(verified)) {
      throw snapshotError(
        "AREA_SNAPSHOT_MANIFEST_CONFLICT",
        "Immutable manifest key is already bound to different content.",
      );
    }
    if (!existing) {
      this.manifests.set(key, cloneFrozen(verified));
    }
    return cloneFrozen(verified);
  }

  async putStageIfAbsent(
    stage: AreaCreateSnapshotStageDescriptor,
  ): Promise<AreaCreateSnapshotStageDescriptor> {
    const existing = this.stages.get(stage.transactionId);
    if (existing) {
      if (JSON.stringify(existing) !== JSON.stringify(stage)) {
        throw snapshotError(
          "AREA_SNAPSHOT_STAGE_CONFLICT",
          "Area Create stage is already bound to a different snapshot transition.",
        );
      }
      return cloneFrozen(existing);
    }
    const verified = this.validateStage(stage);
    this.stages.set(verified.transactionId, verified);
    return cloneFrozen(verified);
  }

  async readStage(
    transactionId: string,
  ): Promise<AreaCreateSnapshotStageDescriptor | null> {
    const stage = this.stages.get(transactionId);
    return stage ? cloneFrozen(stage) : null;
  }

  async compareAndSetHead(
    transactionId: string,
    lease: AreaCreateModuleLease,
  ): Promise<ModuleSnapshotPublicationResult> {
    await this.leaseGuard.assertCurrent(lease);
    const stage = this.requireStage(transactionId);
    assertPublishLease(stage, lease);
    const current = this.requireHead(stage.moduleId);
    if (current.quarantined) {
      throw snapshotError(
        "AREA_SNAPSHOT_MODULE_QUARANTINED",
        "Module snapshot is quarantined and cannot be published.",
      );
    }
    this.requireManifestIdentity(stage.successor);
    if (sameIdentity(current, stage.successor)) {
      return "already_published";
    }
    if (!sameIdentity(current, stage.base)) {
      throw snapshotError(
        "AREA_SNAPSHOT_HEAD_REVISION_CONFLICT",
        "Module snapshot head no longer matches the stage baseline.",
      );
    }
    this.heads.set(
      stage.moduleId,
      createHead(
        stage.moduleId,
        stage.successor,
        false,
        lease.fencingToken,
        this.now().toISOString(),
      ),
    );
    return "published";
  }

  async restoreBaseline(
    transactionId: string,
    lease: AreaCreateModuleLease,
  ): Promise<ModuleSnapshotRestorationResult> {
    await this.leaseGuard.assertCurrent(lease);
    const stage = this.requireStage(transactionId);
    assertRecoveryLease(stage, lease);
    const current = this.requireHead(stage.moduleId);
    this.requireManifestIdentity(stage.base);
    if (sameIdentity(current, stage.base)) {
      return "already_baseline";
    }
    if (!sameIdentity(current, stage.successor)) {
      throw snapshotError(
        "AREA_SNAPSHOT_HEAD_REVISION_CONFLICT",
        "Module snapshot head is neither the stage baseline nor successor.",
      );
    }
    this.heads.set(
      stage.moduleId,
      createHead(
        stage.moduleId,
        stage.base,
        false,
        lease.fencingToken,
        this.now().toISOString(),
      ),
    );
    return "restored";
  }

  async quarantine(
    transactionId: string,
    lease: AreaCreateModuleLease,
    diagnostics: readonly string[],
  ): Promise<void> {
    await this.leaseGuard.assertCurrent(lease);
    const stage = this.requireStage(transactionId);
    assertRecoveryLease(stage, lease);
    const bounded = validateDiagnostics(diagnostics);
    const current = this.requireHead(stage.moduleId);
    this.heads.set(
      stage.moduleId,
      Object.freeze({
        ...current,
        quarantined: true,
        fencingToken: lease.fencingToken,
        updatedAt: this.now().toISOString(),
      }),
    );
    this.quarantines.set(
      stage.moduleId,
      Object.freeze({
        transactionId,
        diagnostics: Object.freeze([...bounded]),
      }),
    );
  }

  async quarantineModule(
    moduleId: string,
    transactionId: string,
    lease: AreaCreateModuleLease,
    diagnostics: readonly string[],
  ): Promise<void> {
    await this.leaseGuard.assertCurrent(lease);
    if (
      lease.moduleId !== moduleId ||
      lease.ownerTransactionId !== transactionId
    ) {
      throw snapshotError(
        "AREA_SNAPSHOT_STAGE_IDENTITY_MISMATCH",
        "Recovery lease does not own the module quarantine operation.",
      );
    }
    const bounded = validateDiagnostics(diagnostics);
    const current = this.requireHead(moduleId);
    this.heads.set(
      moduleId,
      Object.freeze({
        ...current,
        quarantined: true,
        fencingToken: lease.fencingToken,
        updatedAt: this.now().toISOString(),
      }),
    );
    this.quarantines.set(
      moduleId,
      Object.freeze({
        transactionId,
        diagnostics: Object.freeze([...bounded]),
      }),
    );
  }

  async readQuarantine(
    moduleId: string,
  ): Promise<ModuleSnapshotQuarantineRecord | null> {
    const record = this.quarantines.get(moduleId);
    return record ? cloneFrozen(record) : null;
  }

  async forceHeadForTest(head: ModuleSnapshotHead): Promise<void> {
    this.heads.set(head.moduleId, cloneFrozen(head));
  }

  async deleteManifestForTest(manifestKey: string): Promise<void> {
    this.manifests.delete(manifestKey);
  }

  private validateStage(
    stage: AreaCreateSnapshotStageDescriptor,
  ): AreaCreateSnapshotStageDescriptor {
    if (
      stage.schemaVersion !== AREA_CREATE_SNAPSHOT_STAGE_SCHEMA_VERSION ||
      !ID_PATTERN.test(stage.transactionId) ||
      !ID_PATTERN.test(stage.moduleId) ||
      !ID_PATTERN.test(stage.leaseId) ||
      !Number.isSafeInteger(stage.fencingToken) ||
      stage.fencingToken < 1 ||
      new Date(stage.createdAt).toISOString() !== stage.createdAt
    ) {
      throw snapshotError(
        "AREA_SNAPSHOT_STAGE_INVALID",
        "Area Create stage identity is invalid.",
      );
    }
    const baseManifest = this.requireManifestIdentity(stage.base);
    const successorManifest = this.requireManifestIdentity(stage.successor);
    if (
      baseManifest.moduleId !== stage.moduleId ||
      successorManifest.moduleId !== stage.moduleId ||
      successorManifest.parentRevision !== baseManifest.revision
    ) {
      throw snapshotError(
        "AREA_SNAPSHOT_STAGE_INVALID",
        "Area Create stage manifest lineage is invalid.",
      );
    }
    if (!Array.isArray(stage.candidateLogicalKeys) || stage.candidateLogicalKeys.length === 0) {
      throw snapshotError(
        "AREA_SNAPSHOT_STAGE_INVALID",
        "Area Create stage candidate key list is empty.",
      );
    }
    const keys = stage.candidateLogicalKeys.map(normalizeModuleSnapshotLogicalKey);
    const sorted = [...keys].sort((left, right) =>
      left.toLowerCase().localeCompare(right.toLowerCase(), "en"),
    );
    if (
      new Set(keys.map((key) => key.toLowerCase())).size !== keys.length ||
      JSON.stringify(keys) !== JSON.stringify(sorted)
    ) {
      throw snapshotError(
        "AREA_SNAPSHOT_STAGE_INVALID",
        "Area Create stage candidate keys must be unique and sorted.",
      );
    }
    const successorKeys = new Set(
      successorManifest.objects.map((entry) => entry.logicalKey.toLowerCase()),
    );
    if (keys.some((key) => !successorKeys.has(key.toLowerCase()))) {
      throw snapshotError(
        "AREA_SNAPSHOT_STAGE_INVALID",
        "Area Create stage candidate key is absent from the successor manifest.",
      );
    }
    return cloneFrozen({ ...stage, candidateLogicalKeys: keys });
  }

  private requireStage(transactionId: string): AreaCreateSnapshotStageDescriptor {
    const stage = this.stages.get(transactionId);
    if (!stage) {
      throw snapshotError(
        "AREA_SNAPSHOT_STAGE_MISSING",
        "Area Create snapshot stage does not exist.",
      );
    }
    return stage;
  }

  private requireHead(moduleId: string): ModuleSnapshotHead {
    const head = this.heads.get(moduleId);
    if (!head) {
      throw snapshotError(
        "AREA_SNAPSHOT_HEAD_MISSING",
        "Module snapshot head does not exist.",
      );
    }
    return head;
  }

  private requireManifestIdentity(
    identity: ModuleSnapshotHeadIdentity,
  ): ModuleSnapshotManifest {
    if (
      !SHA256_PATTERN.test(identity.revision) ||
      !SHA256_PATTERN.test(identity.manifestSha256)
    ) {
      throw snapshotError(
        "AREA_SNAPSHOT_MANIFEST_INVALID",
        "Snapshot manifest identity contains an invalid SHA-256.",
      );
    }
    const manifest = this.manifests.get(identity.manifestKey);
    if (!manifest) {
      throw snapshotError(
        "AREA_SNAPSHOT_MANIFEST_MISSING",
        "Snapshot manifest referenced by the head is missing.",
      );
    }
    if (
      manifest.revision !== identity.revision ||
      MemoryAtomicModuleSnapshotRepository.manifestKey(manifest) !== identity.manifestKey ||
      MemoryAtomicModuleSnapshotRepository.manifestSha256(manifest) !==
        identity.manifestSha256
    ) {
      throw snapshotError(
        "AREA_SNAPSHOT_MANIFEST_CONFLICT",
        "Snapshot manifest identity does not match its immutable artifact.",
      );
    }
    return manifest;
  }
}

function validateManifest(manifest: ModuleSnapshotManifest): ModuleSnapshotManifest {
  return validateModuleSnapshotManifest(manifest);
}

function identityFor(manifest: ModuleSnapshotManifest): ModuleSnapshotHeadIdentity {
  return Object.freeze({
    revision: manifest.revision,
    manifestKey: MemoryAtomicModuleSnapshotRepository.manifestKey(manifest),
    manifestSha256: MemoryAtomicModuleSnapshotRepository.manifestSha256(manifest),
  });
}

function createHead(
  moduleId: string,
  identity: ModuleSnapshotHeadIdentity,
  quarantined: boolean,
  fencingToken: number,
  updatedAt: string,
): ModuleSnapshotHead {
  return Object.freeze({
    schemaVersion: MODULE_SNAPSHOT_HEAD_SCHEMA_VERSION,
    moduleId,
    ...identity,
    quarantined,
    fencingToken,
    updatedAt,
  });
}

function sameIdentity(
  head: ModuleSnapshotHead,
  identity: ModuleSnapshotHeadIdentity,
): boolean {
  return (
    head.revision === identity.revision &&
    head.manifestKey === identity.manifestKey &&
    head.manifestSha256 === identity.manifestSha256
  );
}

function assertPublishLease(
  stage: AreaCreateSnapshotStageDescriptor,
  lease: AreaCreateModuleLease,
): void {
  if (
    lease.moduleId !== stage.moduleId ||
    lease.ownerTransactionId !== stage.transactionId ||
    lease.leaseId !== stage.leaseId ||
    lease.fencingToken !== stage.fencingToken
  ) {
    throw snapshotError(
      "AREA_SNAPSHOT_STAGE_IDENTITY_MISMATCH",
      "Publication lease does not match the staged transaction.",
    );
  }
}

function assertRecoveryLease(
  stage: AreaCreateSnapshotStageDescriptor,
  lease: AreaCreateModuleLease,
): void {
  if (
    lease.moduleId !== stage.moduleId ||
    lease.ownerTransactionId !== stage.transactionId ||
    lease.fencingToken < stage.fencingToken
  ) {
    throw snapshotError(
      "AREA_SNAPSHOT_STAGE_IDENTITY_MISMATCH",
      "Recovery lease does not own the staged transaction.",
    );
  }
}

function validateDiagnostics(values: readonly string[]): readonly string[] {
  if (!Array.isArray(values) || values.length === 0 || values.length > MAX_DIAGNOSTICS) {
    throw snapshotError(
      "AREA_SNAPSHOT_QUARANTINE_INVALID",
      "Quarantine diagnostics must contain 1..100 entries.",
    );
  }
  for (const value of values) {
    if (
      typeof value !== "string" ||
      value.length === 0 ||
      Buffer.byteLength(value, "utf8") > MAX_DIAGNOSTIC_BYTES
    ) {
      throw snapshotError(
        "AREA_SNAPSHOT_QUARANTINE_INVALID",
        "Quarantine diagnostic is empty or exceeds 1,024 UTF-8 bytes.",
      );
    }
  }
  return Object.freeze([...values]);
}

function sha256Hex(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function snapshotError(code: string, message: string): Error {
  return new Error(`${code}: ${message}`);
}

function cloneFrozen<T>(value: T): T {
  return deepFreeze(structuredClone(value));
}

function deepFreeze<T>(value: T): T {
  if (Object(value) !== value) {
    return value;
  }
  for (const child of Object.values(value as Record<string, unknown>)) {
    deepFreeze(child);
  }
  return Object.freeze(value);
}
