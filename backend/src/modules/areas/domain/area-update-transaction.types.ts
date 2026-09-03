import type {
  AreaCreateCompiledCandidate,
  AreaCreateJournalState,
  AreaCreateModuleState,
  AreaCreatePersistedArtifact,
  AreaCreatePersistedModuleIfo,
} from "./area-create-transaction.types";
import type { AreaUpdateCommand } from "./area-update-command.types";
import type { ProjectedAreaUpdateDraft } from "./area-update-draft-projector";
import type {
  AreaTileProductionAdmissionBinding,
} from "./area-tile-production-admission";
import type { AreaModuleStartLocation } from "./area-module-start-location";
import type { AreaAudioEnvironment } from "./area-audio-environment";
import type {
  AuroraVariableSourceEntry,
  AuroraVariableTargetEntry,
} from "./aurora-variable-table";
import type { ResolvedAreaVisualEnvironmentCatalogSelectionMutation } from "./area-visual-environment-catalog-selection-mutation";

export type AreaUpdateModuleState = AreaCreateModuleState;

export interface AreaUpdateObjectFamilyCounts {
  readonly creature: number;
  readonly door: number;
  readonly encounter: number;
  readonly item: number;
  readonly placeable: number;
  readonly sound: number;
  readonly store: number;
  readonly trigger: number;
  readonly waypoint: number;
}

export interface AreaUpdateObjectMutationSummary {
  readonly sourceGitSha256: string;
  readonly sourceGicSha256: string;
  readonly candidateGitSha256: string;
  readonly candidateGicSha256: string;
  readonly sourceCounts: AreaUpdateObjectFamilyCounts;
  readonly candidateCounts: AreaUpdateObjectFamilyCounts;
  readonly deletedCounts: AreaUpdateObjectFamilyCounts;
  readonly transformedCounts: AreaUpdateObjectFamilyCounts;
  readonly propertyUpdatedCounts?: AreaUpdateObjectFamilyCounts;
  readonly polygonUpdatedCounts?: AreaUpdateObjectFamilyCounts;
  readonly soundIntervalVariationUpdatedCounts?: AreaUpdateObjectFamilyCounts;
  readonly soundVolumeUpdatedCounts?: AreaUpdateObjectFamilyCounts;
  readonly soundScheduleUpdatedCounts?: AreaUpdateObjectFamilyCounts;
  readonly soundActiveUpdatedCounts?: AreaUpdateObjectFamilyCounts;
  readonly soundPlayOrderUpdatedCounts?: AreaUpdateObjectFamilyCounts;
  readonly soundPlayStyleUpdatedCounts?: AreaUpdateObjectFamilyCounts;
  readonly soundPlaybackUpdatedCounts?: AreaUpdateObjectFamilyCounts;
  readonly soundProfileUpdatedCounts?: AreaUpdateObjectFamilyCounts;
  readonly addedCounts: AreaUpdateObjectFamilyCounts;
  readonly totalDeleted: number;
  readonly totalTransformed: number;
  readonly totalPropertyUpdated?: number;
  readonly totalPolygonUpdated?: number;
  readonly totalSoundIntervalVariationUpdated?: number;
  readonly totalSoundVolumeUpdated?: number;
  readonly totalSoundScheduleUpdated?: number;
  readonly totalSoundActiveUpdated?: number;
  readonly totalSoundPlayOrderUpdated?: number;
  readonly totalSoundPlayStyleUpdated?: number;
  readonly totalSoundPlaybackUpdated?: number;
  readonly totalSoundProfileUpdated?: number;
  readonly totalAdded: number;
  readonly blueprintSources: readonly Readonly<{
    sourceProfileId: string;
    templateResRef: string;
    sourceSha256: string;
    dependencyCount?: number;
    dependencySetSha256?: string;
    addedCount: number;
  }>[];
}

export interface AreaUpdateCompiledCandidate extends AreaCreateCompiledCandidate {
  readonly sourceAreaSha256: string;
  readonly candidateAreaSha256: string;
  readonly setFingerprintSha256: string;
  readonly projectedDraft: ProjectedAreaUpdateDraft;
  readonly unchangedCompanions?: Readonly<{
    gitSha256: string;
    gicSha256: string;
    moduleIfoSha256: string;
  }>;
  readonly objectMutation?: AreaUpdateObjectMutationSummary;
  readonly moduleStartLocationMutation?: AreaUpdateModuleStartLocationMutationSummary;
  readonly audioEnvironmentMutation?: AreaUpdateAudioEnvironmentMutationSummary;
  readonly variableMutation?: AreaUpdateVariableMutationSummary;
  readonly visualEnvironmentCatalogSelectionMutation?:
    ResolvedAreaVisualEnvironmentCatalogSelectionMutation;
}

export interface AreaUpdateModuleStartLocationMutationSummary {
  readonly expectedValue: AreaModuleStartLocation;
  readonly value: AreaModuleStartLocation;
  readonly sourceIfoSha256: string;
  readonly candidateIfoSha256: string;
}

export interface AreaUpdateAudioEnvironmentMutationSummary {
  readonly expectedValue: AreaAudioEnvironment;
  readonly value: AreaAudioEnvironment;
  readonly sourceGitSha256: string;
  readonly candidateGitSha256: string;
}

export interface AreaUpdateVariableMutationSummary {
  readonly expectedEntries: readonly AuroraVariableSourceEntry[];
  readonly entries: readonly AuroraVariableTargetEntry[];
  readonly sourceGitSha256: string;
  readonly candidateGitSha256: string;
}

export const AREA_UPDATE_RECEIPT_SCHEMA_VERSION = "area-update-receipt.v1" as const;

export interface AreaUpdateReceipt {
  readonly schemaVersion: typeof AREA_UPDATE_RECEIPT_SCHEMA_VERSION;
  readonly transactionId: string;
  readonly areaResRef: string;
  readonly moduleId: string;
  readonly previousModuleRevision: string;
  readonly newModuleRevision: string;
  readonly sourceAreaSha256: string;
  readonly candidateAreaSha256: string;
  readonly draft: AreaUpdateCommand["draft"];
  readonly setFingerprintSha256: string;
  readonly tileProductionAdmission: AreaTileProductionAdmissionBinding;
  readonly commandHash: string;
  readonly validatorVersion: string;
  readonly resources: readonly AreaCreatePersistedArtifact[];
  readonly moduleIfo: AreaCreatePersistedModuleIfo;
  readonly unchangedCompanions?: NonNullable<AreaUpdateCompiledCandidate["unchangedCompanions"]>;
  readonly objectMutation?: AreaUpdateObjectMutationSummary;
  readonly moduleStartLocationMutation?: AreaUpdateModuleStartLocationMutationSummary;
  readonly audioEnvironmentMutation?: AreaUpdateAudioEnvironmentMutationSummary;
  readonly variableMutation?: AreaUpdateVariableMutationSummary;
  readonly visualEnvironmentCatalogSelectionMutation?:
    ResolvedAreaVisualEnvironmentCatalogSelectionMutation;
  readonly readbackStatus: "verified";
  readonly warnings: readonly string[];
  readonly updatedAt: string;
}

export interface AreaUpdateExecutionInput {
  readonly actorId: string;
  readonly idempotencyKey: string;
  readonly ifMatchHeader: string | undefined;
  readonly command: AreaUpdateCommand;
  readonly commandHash: string;
}

export interface AreaUpdateExecutionResult {
  readonly idempotency: "created" | "replayed";
  readonly receipt: AreaUpdateReceipt;
}

export type AreaUpdateJournalState = AreaCreateJournalState;

export interface AreaUpdateJournalRecord {
  readonly transactionId: string;
  readonly moduleId: string;
  readonly areaResRef: string;
  readonly actorId: string;
  readonly idempotencyKey: string;
  readonly commandHash: string;
  readonly expectedModuleRevision: string;
  readonly sourceAreaSha256: string;
  readonly candidateAreaSha256: string;
  readonly setFingerprintSha256: string;
  readonly tileProductionAdmission: AreaTileProductionAdmissionBinding;
  readonly draftRevision: number;
  readonly draftNormalizedSha256: string;
  readonly leaseId: string;
  readonly fencingToken: number;
  readonly candidate: AreaUpdateCompiledCandidate;
  readonly createdAt: string;
}

export interface AreaUpdateCandidateManifest {
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

export interface AreaUpdatePersistedJournalRecord {
  readonly transactionId: string;
  readonly moduleId: string;
  readonly areaResRef: string;
  readonly actorId: string;
  readonly idempotencyKey: string;
  readonly commandHash: string;
  readonly expectedModuleRevision: string;
  readonly sourceAreaSha256: string;
  readonly candidateAreaSha256: string;
  readonly setFingerprintSha256: string;
  readonly draftRevision: number;
  readonly draftNormalizedSha256: string;
  readonly leaseId: string;
  readonly fencingToken: number;
  readonly state: AreaUpdateJournalState;
  readonly candidateManifest: AreaUpdateCandidateManifest;
  readonly receipt?: AreaUpdateReceipt;
  readonly diagnostics: readonly string[];
  readonly createdAt: string;
  readonly updatedAt: string;
}
