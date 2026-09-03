import type { AreaCreateModuleState } from "./area-create-transaction.types";
import type { AreaCreateJournalState } from "./area-create-transaction.types";
import type { AreaRenameCommand } from "./area-rename-command.validation";
import type { AreaRenamePreview } from "./area-rename.types";
import type { ModuleSnapshotManifest } from "./module-snapshot-manifest";

export type AreaRenameModuleState = AreaCreateModuleState;

export interface AreaRenameCandidateResource {
  readonly extension: "are" | "gic" | "git";
  readonly sourceKey: string;
  readonly targetKey: string;
  readonly resourceType: number;
  readonly baselineBytes: Buffer;
  readonly baselineSize: number;
  readonly baselineSha256: string;
  readonly candidateBytes: Buffer;
  readonly candidateSize: number;
  readonly candidateSha256: string;
}

export interface AreaRenameCandidateModuleIfo {
  readonly key: "module.ifo";
  readonly resourceType: 2014;
  readonly baselineBytes: Buffer;
  readonly baselineSize: number;
  readonly baselineSha256: string;
  readonly candidateBytes: Buffer;
  readonly candidateSize: number;
  readonly candidateSha256: string;
}

export interface AreaRenameCompiledCandidate {
  readonly areaId: string;
  readonly targetAreaId: string;
  readonly preview: AreaRenamePreview;
  readonly resources: readonly AreaRenameCandidateResource[];
  readonly moduleIfo: AreaRenameCandidateModuleIfo;
  readonly entryAreaUpdated: boolean;
  readonly survivorCount: number;
  readonly baselineManifest: ModuleSnapshotManifest;
  readonly successorManifest: ModuleSnapshotManifest;
}

export interface AreaRenamePersistedArtifact {
  readonly extension: "are" | "gic" | "git";
  readonly sourceKey: string;
  readonly targetKey: string;
  readonly resourceType: number;
  readonly baselineSize: number;
  readonly baselineSha256: string;
  readonly candidateSize: number;
  readonly candidateSha256: string;
}

export interface AreaRenameReadbackResult {
  readonly verified: boolean;
  readonly newModuleRevision: string;
  readonly resources: readonly AreaRenamePersistedArtifact[];
  readonly moduleIfo: Readonly<{
    key: "module.ifo";
    baselineSize: number;
    baselineSha256: string;
    candidateSize: number;
    candidateSha256: string;
  }>;
  readonly survivorCount: number;
  readonly entryAreaUpdated: boolean;
  readonly diagnostics: readonly string[];
}

export type AreaRenameJournalState = AreaCreateJournalState;

export const AREA_RENAME_RECEIPT_SCHEMA_VERSION = "area-rename-receipt.v1" as const;

export interface AreaRenameReceipt {
  readonly schemaVersion: typeof AREA_RENAME_RECEIPT_SCHEMA_VERSION;
  readonly transactionId: string;
  readonly moduleId: string;
  readonly areaResRef: string;
  readonly targetAreaResRef: string;
  readonly previousModuleRevision: string;
  readonly newModuleRevision: string;
  readonly commandHash: string;
  readonly previewSha256: string;
  readonly scanVersion: string;
  readonly resources: readonly AreaRenamePersistedArtifact[];
  readonly moduleIfo: Readonly<{
    key: "module.ifo";
    baselineSize: number;
    baselineSha256: string;
    candidateSize: number;
    candidateSha256: string;
  }>;
  readonly entryAreaUpdated: boolean;
  readonly blockerCount: 0;
  readonly warningCount: number;
  readonly readbackStatus: "verified";
  readonly warnings: readonly string[];
  readonly renamedAt: string;
}

export interface AreaRenameExecutionInput {
  readonly actorId: string;
  readonly idempotencyKey: string;
  readonly ifMatchHeader: string | undefined;
  readonly command: AreaRenameCommand;
  readonly commandHash: string;
}

export interface AreaRenameExecutionResult {
  readonly idempotency: "created" | "replayed";
  readonly receipt: AreaRenameReceipt;
}

export interface AreaRenameCandidateManifest {
  readonly areaId: string;
  readonly targetAreaId: string;
  readonly previewSha256: string;
  readonly resources: readonly AreaRenamePersistedArtifact[];
  readonly moduleIfo: Readonly<{
    key: "module.ifo";
    resourceType: 2014;
    baselineSize: number;
    baselineSha256: string;
    candidateSize: number;
    candidateSha256: string;
  }>;
  readonly entryAreaUpdated: boolean;
  readonly entryAreaResRef: string | null;
  readonly survivorCount: number;
  readonly baselineRevision: string;
  readonly successorRevision: string;
}

export interface AreaRenameJournalRecord {
  readonly transactionId: string;
  readonly moduleId: string;
  readonly areaResRef: string;
  readonly targetAreaResRef: string;
  readonly actorId: string;
  readonly idempotencyKey: string;
  readonly commandHash: string;
  readonly expectedModuleRevision: string;
  readonly previewSha256: string;
  readonly leaseId: string;
  readonly fencingToken: number;
  readonly candidate: AreaRenameCompiledCandidate;
  readonly createdAt: string;
}

export interface AreaRenamePersistedJournalRecord {
  readonly transactionId: string;
  readonly moduleId: string;
  readonly areaResRef: string;
  readonly targetAreaResRef: string;
  readonly actorId: string;
  readonly idempotencyKey: string;
  readonly commandHash: string;
  readonly expectedModuleRevision: string;
  readonly previewSha256: string;
  readonly leaseId: string;
  readonly fencingToken: number;
  readonly state: AreaRenameJournalState;
  readonly candidateManifest: AreaRenameCandidateManifest;
  readonly receipt?: AreaRenameReceipt;
  readonly diagnostics: readonly string[];
  readonly createdAt: string;
  readonly updatedAt: string;
}
