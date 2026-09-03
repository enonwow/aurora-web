import type {
  ModuleBlobObjectPayload,
  ModuleBlobSnapshotSummary,
} from "../../../runtime-settings/application/ports/module-blob-storage.port";

export const COMMITTED_MODULE_SNAPSHOT_READER = Symbol(
  "COMMITTED_MODULE_SNAPSHOT_READER",
);

export interface CapturedCommittedModuleObjectDescriptor {
  readonly logicalKey: string;
  readonly resourceType: number;
  readonly size: number;
  readonly sha256: string;
}

export interface CapturedCommittedModuleSnapshot {
  readonly moduleId: string;
  readonly revision: string;
  readonly capturedAt: string;
  listCommittedObjectDescriptors(): readonly CapturedCommittedModuleObjectDescriptor[];
  listModuleSnapshot(options?: Readonly<{
    limit?: number;
    continuationToken?: string;
  }>): Promise<ModuleBlobSnapshotSummary>;
  getModuleObject(key: string): Promise<ModuleBlobObjectPayload | null>;
}

export interface CommittedModuleSnapshotReaderPort {
  capture(): Promise<CapturedCommittedModuleSnapshot>;
}
