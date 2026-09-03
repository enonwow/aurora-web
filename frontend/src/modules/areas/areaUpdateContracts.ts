import type {
  AreaTileProductionAdmissionBinding,
} from "./areaTileProductionAdmissionContracts";
import type {
  AreaVariableSourceEntry,
  AreaVariableTargetEntry,
} from "./domain/areaVariableTable";
import type { AreaAudioEnvironment } from "./domain/areaAudioEnvironment";
import type { AreaModuleStartLocation } from "./domain/areaModuleStartLocation";

export const AREA_UPDATE_VALIDATION_COMMAND_SCHEMA_VERSION =
  "area-update-validation.v1" as const;
export const AREA_UPDATE_COMMAND_SCHEMA_VERSION = "area-update-command.v1" as const;
export const AREA_UPDATE_VALIDATION_RECEIPT_SCHEMA_VERSION =
  "area-update-validation-receipt.v1" as const;
export const AREA_UPDATE_RECEIPT_SCHEMA_VERSION = "area-update-receipt.v1" as const;

export interface AreaUpdateDraftIdentity {
  readonly id: string;
  readonly revision: number;
  readonly normalizedSha256: string;
}

interface AreaUpdateCommandBase {
  readonly moduleId: string;
  readonly areaResRef: string;
  readonly expectedModuleRevision: string;
  readonly draft: AreaUpdateDraftIdentity;
  readonly clientCommandId: string;
}

export interface AreaUpdateValidationCommand extends AreaUpdateCommandBase {
  readonly schemaVersion: typeof AREA_UPDATE_VALIDATION_COMMAND_SCHEMA_VERSION;
}

export interface AreaUpdateCommand extends AreaUpdateCommandBase {
  readonly schemaVersion: typeof AREA_UPDATE_COMMAND_SCHEMA_VERSION;
}

export type AreaUpdateResourceExtension = "are" | "git" | "gic";

export interface AreaUpdateResourceDescriptor {
  readonly extension: AreaUpdateResourceExtension;
  readonly fileName: string;
  readonly resourceType: number;
  readonly size: number;
  readonly sha256: string;
}

export interface AreaUpdatePersistedResource extends AreaUpdateResourceDescriptor {
  readonly key: string;
}

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

export interface AreaUpdateUnchangedCompanions {
  readonly gitSha256: string;
  readonly gicSha256: string;
  readonly moduleIfoSha256: string;
}

export interface AreaUpdateVariableMutationSummary {
  readonly expectedEntries: readonly AreaVariableSourceEntry[];
  readonly entries: readonly AreaVariableTargetEntry[];
  readonly sourceGitSha256: string;
  readonly candidateGitSha256: string;
}

export interface AreaUpdateAudioEnvironmentMutationSummary {
  readonly expectedValue: AreaAudioEnvironment;
  readonly value: AreaAudioEnvironment;
  readonly sourceGitSha256: string;
  readonly candidateGitSha256: string;
}

export interface AreaUpdateModuleStartLocationMutationSummary {
  readonly expectedValue: AreaModuleStartLocation;
  readonly value: AreaModuleStartLocation;
  readonly sourceIfoSha256: string;
  readonly candidateIfoSha256: string;
}

export interface AreaUpdateValidationReceipt {
  readonly schemaVersion: typeof AREA_UPDATE_VALIDATION_RECEIPT_SCHEMA_VERSION;
  readonly validationId: string;
  readonly commandHash: string;
  readonly moduleId: string;
  readonly moduleRevision: string;
  readonly areaResRef: string;
  readonly sourceAreaSha256: string;
  readonly draft: AreaUpdateDraftIdentity;
  readonly setFingerprintSha256: string;
  readonly tileProductionAdmission: AreaTileProductionAdmissionBinding;
  readonly candidateAre: AreaUpdateResourceDescriptor;
  readonly candidateResources: readonly AreaUpdateResourceDescriptor[];
  readonly candidateModuleIfo: Readonly<{
    fileName: string;
    resourceType: number;
    size: number;
    sha256: string;
  }>;
  readonly unchangedCompanions?: AreaUpdateUnchangedCompanions;
  readonly objectMutation?: AreaUpdateObjectMutationSummary;
  readonly variableMutation?: AreaUpdateVariableMutationSummary;
  readonly audioEnvironmentMutation?: AreaUpdateAudioEnvironmentMutationSummary;
  readonly moduleStartLocationMutation?: AreaUpdateModuleStartLocationMutationSummary;
  readonly validatorVersion: string;
  readonly createdAt: string;
  readonly expiresAt: string;
}

export interface AreaUpdateReceipt {
  readonly schemaVersion: typeof AREA_UPDATE_RECEIPT_SCHEMA_VERSION;
  readonly transactionId: string;
  readonly areaResRef: string;
  readonly moduleId: string;
  readonly previousModuleRevision: string;
  readonly newModuleRevision: string;
  readonly sourceAreaSha256: string;
  readonly candidateAreaSha256: string;
  readonly draft: AreaUpdateDraftIdentity;
  readonly setFingerprintSha256: string;
  readonly tileProductionAdmission: AreaTileProductionAdmissionBinding;
  readonly commandHash: string;
  readonly validatorVersion: string;
  readonly resources: readonly AreaUpdatePersistedResource[];
  readonly moduleIfo: Readonly<{ key: string; size: number; sha256: string }>;
  readonly unchangedCompanions?: AreaUpdateUnchangedCompanions;
  readonly objectMutation?: AreaUpdateObjectMutationSummary;
  readonly variableMutation?: AreaUpdateVariableMutationSummary;
  readonly audioEnvironmentMutation?: AreaUpdateAudioEnvironmentMutationSummary;
  readonly moduleStartLocationMutation?: AreaUpdateModuleStartLocationMutationSummary;
  readonly readbackStatus: "verified";
  readonly warnings: readonly string[];
  readonly updatedAt: string;
}
