import type { AreaCreateModuleLease } from "./area-create-transaction.port";
import type { ModuleSnapshotManifest } from "../../domain/module-snapshot-manifest";

export const ATOMIC_MODULE_SNAPSHOT_REPOSITORY = Symbol(
  "ATOMIC_MODULE_SNAPSHOT_REPOSITORY",
);

export const MODULE_SNAPSHOT_HEAD_SCHEMA_VERSION =
  "aurora-module-snapshot-head.v1" as const;
export const AREA_CREATE_SNAPSHOT_STAGE_SCHEMA_VERSION =
  "area-create-snapshot-stage.v1" as const;

export interface AreaCreateLeaseGuardPort {
  assertCurrent(lease: AreaCreateModuleLease): Promise<void>;
}

export interface ModuleSnapshotHeadIdentity {
  readonly revision: string;
  readonly manifestKey: string;
  readonly manifestSha256: string;
}

export interface ModuleSnapshotHead extends ModuleSnapshotHeadIdentity {
  readonly schemaVersion: typeof MODULE_SNAPSHOT_HEAD_SCHEMA_VERSION;
  readonly moduleId: string;
  readonly quarantined: boolean;
  readonly fencingToken: number;
  readonly updatedAt: string;
}

export interface AreaCreateSnapshotStageDescriptor {
  readonly schemaVersion: typeof AREA_CREATE_SNAPSHOT_STAGE_SCHEMA_VERSION;
  readonly transactionId: string;
  readonly moduleId: string;
  readonly leaseId: string;
  readonly fencingToken: number;
  readonly base: ModuleSnapshotHeadIdentity;
  readonly successor: ModuleSnapshotHeadIdentity;
  readonly candidateLogicalKeys: readonly string[];
  readonly createdAt: string;
}

export interface ModuleSnapshotContentRecord {
  readonly contentKey: string;
  readonly size: number;
  readonly sha256: string;
  readonly bytes: Buffer;
}

export interface ModuleSnapshotQuarantineRecord {
  readonly transactionId: string;
  readonly diagnostics: readonly string[];
}

export type ModuleSnapshotPublicationResult = "published" | "already_published";
export type ModuleSnapshotRestorationResult = "restored" | "already_baseline";

export interface AtomicModuleSnapshotRepositoryPort {
  bootstrap(
    manifest: ModuleSnapshotManifest,
    contentsByLogicalKey: Readonly<Record<string, Buffer>>,
    updatedAt: string,
  ): Promise<ModuleSnapshotHead>;
  readHead(moduleId: string): Promise<ModuleSnapshotHead | null>;
  readManifest(manifestKey: string): Promise<ModuleSnapshotManifest | null>;
  readContent(contentKey: string): Promise<ModuleSnapshotContentRecord | null>;
  putContentIfAbsent(
    bytes: Buffer,
    sha256: string,
  ): Promise<Omit<ModuleSnapshotContentRecord, "bytes">>;
  putManifestIfAbsent(manifest: ModuleSnapshotManifest): Promise<ModuleSnapshotManifest>;
  putStageIfAbsent(
    stage: AreaCreateSnapshotStageDescriptor,
  ): Promise<AreaCreateSnapshotStageDescriptor>;
  readStage(transactionId: string): Promise<AreaCreateSnapshotStageDescriptor | null>;
  compareAndSetHead(
    transactionId: string,
    lease: AreaCreateModuleLease,
  ): Promise<ModuleSnapshotPublicationResult>;
  restoreBaseline(
    transactionId: string,
    lease: AreaCreateModuleLease,
  ): Promise<ModuleSnapshotRestorationResult>;
  quarantine(
    transactionId: string,
    lease: AreaCreateModuleLease,
    diagnostics: readonly string[],
  ): Promise<void>;
  quarantineModule(
    moduleId: string,
    transactionId: string,
    lease: AreaCreateModuleLease,
    diagnostics: readonly string[],
  ): Promise<void>;
}
