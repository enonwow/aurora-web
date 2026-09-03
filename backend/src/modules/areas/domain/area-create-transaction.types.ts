import type { AreaCreateCommand } from "./area-create-command.types";
import type {
  AreaTileProductionAdmissionBinding,
} from "./area-tile-production-admission";

export const AREA_CREATE_RECEIPT_SCHEMA_VERSION =
  "area-create-receipt.v1" as const;

export type AreaCreateResourceExtension = "are" | "git" | "gic";

export interface AreaCreateCandidateResource {
  readonly extension: AreaCreateResourceExtension;
  readonly key: string;
  readonly fileName: string;
  readonly resourceType: number;
  readonly bytes: Buffer;
  readonly size: number;
  readonly sha256: string;
}

export interface AreaCreateCandidateModuleIfo {
  readonly key: string;
  readonly fileName: string;
  readonly resourceType: number;
  readonly baselineBytes: Buffer;
  readonly baselineSha256: string;
  readonly candidateBytes: Buffer;
  readonly candidateSha256: string;
}

export interface AreaCreateCompiledCandidate {
  readonly areaId: string;
  readonly resources: readonly AreaCreateCandidateResource[];
  readonly moduleIfo: AreaCreateCandidateModuleIfo;
}

export interface AreaCreateModuleState {
  readonly moduleId: string;
  readonly revision: string;
  readonly quarantined: boolean;
}

export interface AreaCreatePersistedArtifact {
  readonly extension: AreaCreateResourceExtension;
  readonly key: string;
  readonly fileName: string;
  readonly resourceType: number;
  readonly size: number;
  readonly sha256: string;
}

export interface AreaCreatePersistedModuleIfo {
  readonly key: string;
  readonly size: number;
  readonly sha256: string;
}

export interface AreaCreateReadbackResult {
  readonly verified: boolean;
  readonly newModuleRevision: string;
  readonly resources: readonly AreaCreatePersistedArtifact[];
  readonly moduleIfo: AreaCreatePersistedModuleIfo;
  readonly diagnostics: readonly string[];
}

export interface AreaCreateCandidateValidationIssue {
  readonly code: string;
  readonly message: string;
}

export type AreaCreateCandidateValidationResult =
  | Readonly<{ valid: true; issues: readonly [] }>
  | Readonly<{
      valid: false;
      issues: readonly AreaCreateCandidateValidationIssue[];
    }>;

export interface AreaCreateReceipt {
  readonly schemaVersion: typeof AREA_CREATE_RECEIPT_SCHEMA_VERSION;
  readonly transactionId: string;
  readonly areaId: string;
  readonly resRef: string;
  readonly name: string;
  readonly tag: string;
  readonly moduleId: string;
  readonly previousModuleRevision: string;
  readonly newModuleRevision: string;
  readonly profileId: string;
  readonly profileFingerprintSha256: string;
  readonly setFingerprintSha256: string;
  readonly tileProductionAdmission: AreaTileProductionAdmissionBinding;
  readonly draftNormalizedSha256: string;
  readonly commandHash: string;
  readonly validatorVersion: string;
  readonly resources: readonly AreaCreatePersistedArtifact[];
  readonly moduleIfo: AreaCreatePersistedModuleIfo;
  readonly readbackStatus: "verified";
  readonly warnings: readonly string[];
  readonly createdAt: string;
}

export interface AreaCreateExecutionInput {
  readonly actorId: string;
  readonly idempotencyKey: string;
  readonly ifMatchHeader: string | undefined;
  readonly command: AreaCreateCommand;
  readonly commandHash: string;
}

export interface AreaCreateExecutionResult {
  readonly idempotency: "created" | "replayed";
  readonly receipt: AreaCreateReceipt;
}

export type AreaCreateJournalState =
  | "prepared"
  | "staged"
  | "resources_committed"
  | "ifo_committed"
  | "readback_verified"
  | "complete"
  | "compensation_pending"
  | "compensated"
  | "quarantine_required";

export interface AreaCreateJournalRecord {
  readonly transactionId: string;
  readonly moduleId: string;
  readonly actorId: string;
  readonly idempotencyKey: string;
  readonly commandHash: string;
  readonly expectedModuleRevision: string;
  readonly profileId: string;
  readonly profileFingerprintSha256: string;
  readonly setFingerprintSha256: string;
  readonly tileProductionAdmission: AreaTileProductionAdmissionBinding;
  readonly draftRevision: number;
  readonly draftNormalizedSha256: string;
  readonly leaseId: string;
  readonly fencingToken: number;
  readonly candidate: AreaCreateCompiledCandidate;
  readonly createdAt: string;
}

export interface AreaCreateCandidateManifest {
  readonly areaId: string;
  readonly tileProductionAdmission: AreaTileProductionAdmissionBinding;
  readonly resources: readonly AreaCreatePersistedArtifact[];
  readonly moduleIfo: Readonly<{
    key: string;
    fileName: string;
    resourceType: number;
    baselineSize: number;
    baselineSha256: string;
    candidateSize: number;
    candidateSha256: string;
  }>;
}

export interface AreaCreatePersistedJournalRecord {
  readonly transactionId: string;
  readonly moduleId: string;
  readonly actorId: string;
  readonly idempotencyKey: string;
  readonly commandHash: string;
  readonly expectedModuleRevision: string;
  readonly profileId: string;
  readonly profileFingerprintSha256: string;
  readonly setFingerprintSha256: string;
  readonly draftRevision: number;
  readonly draftNormalizedSha256: string;
  readonly leaseId: string;
  readonly fencingToken: number;
  readonly state: AreaCreateJournalState;
  readonly candidateManifest: AreaCreateCandidateManifest;
  readonly receipt?: AreaCreateReceipt;
  readonly diagnostics: readonly string[];
  readonly createdAt: string;
  readonly updatedAt: string;
}
