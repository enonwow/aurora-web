import type {
  AreaCreateCandidateModuleIfo,
  AreaCreateCandidateResource,
  AreaCreateJournalState,
  AreaCreateModuleState,
  AreaCreatePersistedArtifact,
  AreaCreatePersistedModuleIfo,
} from "./area-create-transaction.types";
import type { AreaDeleteCommand } from "./area-delete-command.validation";
import type { AreaDeletePreview } from "./area-delete.types";

export type AreaDeleteModuleState = AreaCreateModuleState;
export type AreaDeleteJournalState = AreaCreateJournalState;

export interface AreaDeleteCompiledCandidate {
  readonly areaId: string;
  readonly preview: AreaDeletePreview;
  readonly removedResources: readonly AreaCreateCandidateResource[];
  readonly moduleIfo: AreaCreateCandidateModuleIfo;
  readonly survivorCount: number;
}

export interface AreaDeleteReadbackResult {
  readonly verified: boolean;
  readonly newModuleRevision: string;
  readonly removedResources: readonly AreaCreatePersistedArtifact[];
  readonly moduleIfo: AreaCreatePersistedModuleIfo;
  readonly survivorCount: number;
  readonly diagnostics: readonly string[];
}

export const AREA_DELETE_RECEIPT_SCHEMA_VERSION = "area-delete-receipt.v1" as const;

export interface AreaDeleteReceipt {
  readonly schemaVersion: typeof AREA_DELETE_RECEIPT_SCHEMA_VERSION;
  readonly transactionId: string;
  readonly areaResRef: string;
  readonly moduleId: string;
  readonly previousModuleRevision: string;
  readonly newModuleRevision: string;
  readonly commandHash: string;
  readonly previewSha256: string;
  readonly scanVersion: string;
  readonly removedResources: readonly AreaCreatePersistedArtifact[];
  readonly moduleIfo: Readonly<{
    key: string;
    baselineSha256: string;
    candidateSha256: string;
    size: number;
  }>;
  readonly survivorCount: number;
  readonly blockerCount: 0;
  readonly readbackStatus: "verified";
  readonly warnings: readonly string[];
  readonly deletedAt: string;
}

export interface AreaDeleteExecutionInput {
  readonly actorId: string;
  readonly idempotencyKey: string;
  readonly ifMatchHeader: string | undefined;
  readonly command: AreaDeleteCommand;
  readonly commandHash: string;
}

export interface AreaDeleteExecutionResult {
  readonly idempotency: "created" | "replayed";
  readonly receipt: AreaDeleteReceipt;
}

export interface AreaDeleteCandidateManifest {
  readonly areaId: string;
  readonly previewSha256: string;
  readonly removedResources: readonly AreaCreatePersistedArtifact[];
  readonly moduleIfo: Readonly<{
    key: string;
    fileName: string;
    resourceType: number;
    baselineSize: number;
    baselineSha256: string;
    candidateSize: number;
    candidateSha256: string;
  }>;
  readonly survivorCount: number;
}

export interface AreaDeleteJournalRecord {
  readonly transactionId: string;
  readonly moduleId: string;
  readonly areaResRef: string;
  readonly actorId: string;
  readonly idempotencyKey: string;
  readonly commandHash: string;
  readonly expectedModuleRevision: string;
  readonly previewSha256: string;
  readonly leaseId: string;
  readonly fencingToken: number;
  readonly candidate: AreaDeleteCompiledCandidate;
  readonly createdAt: string;
}

export interface AreaDeletePersistedJournalRecord {
  readonly transactionId: string;
  readonly moduleId: string;
  readonly areaResRef: string;
  readonly actorId: string;
  readonly idempotencyKey: string;
  readonly commandHash: string;
  readonly expectedModuleRevision: string;
  readonly previewSha256: string;
  readonly leaseId: string;
  readonly fencingToken: number;
  readonly state: AreaDeleteJournalState;
  readonly candidateManifest: AreaDeleteCandidateManifest;
  readonly receipt?: AreaDeleteReceipt;
  readonly diagnostics: readonly string[];
  readonly createdAt: string;
  readonly updatedAt: string;
}
