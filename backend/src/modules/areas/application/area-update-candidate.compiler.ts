import { createHash } from "node:crypto";
import { AppException } from "../../../common/http/app-exception";
import {
  validateAreaUpdateCandidate,
} from "../adapters/outbound/blob/aurora-area-update-candidate-validator";
import {
  AreaExistingObjectDeletionPlanError,
  planExistingAreaObjectDeletions,
} from "../adapters/outbound/blob/area-existing-object-deletion-planner";
import {
  AreaObjectPairMutationError,
  mutateExistingAreaObjectsInGitGic,
  type ExistingAreaCreaturePropertyMutation,
  type ExistingAreaObjectPropertyMutation,
  type NewAreaObjectAddition,
} from "../adapters/outbound/blob/aurora-gff-area-object-pair-writer";
import type { AreaEditingApplicationService } from "./area-editing.application.service";
import type {
  AreaDynamicItemBlueprintCopyTelemetryEvent,
  AreaDynamicItemBlueprintCopyTelemetryPort,
} from
  "./ports/area-dynamic-item-blueprint-copy-telemetry.port";
import type {
  AreaStoreCommerceTelemetryEvent,
  AreaStoreCommerceTelemetryPort,
} from "./ports/area-store-commerce-telemetry.port";
import type {
  AreaStoreScriptResRefsTelemetryEvent,
  AreaStoreScriptResRefsTelemetryPort,
} from "./ports/area-store-script-resrefs-telemetry.port";
import type {
  AreaTriggerScriptResRefsTelemetryEvent,
  AreaTriggerScriptResRefsTelemetryPort,
} from "./ports/area-trigger-script-resrefs-telemetry.port";
import type {
  AreaTriggerTransitionStorageTelemetryEvent,
  AreaTriggerTransitionStorageTelemetryPort,
} from "./ports/area-trigger-transition-storage-telemetry.port";
import type {
  AreaTriggerCorePropertiesTelemetryEvent,
  AreaTriggerCorePropertiesTelemetryPort,
} from "./ports/area-trigger-core-properties-telemetry.port";
import type {
  AreaTriggerTrapPropertiesTelemetryEvent,
  AreaTriggerTrapPropertiesTelemetryPort,
} from "./ports/area-trigger-trap-properties-telemetry.port";
import type {
  AreaTriggerVariableTableTelemetryEvent,
  AreaTriggerVariableTableTelemetryPort,
} from "./ports/area-trigger-variable-table-telemetry.port";
import type {
  AreaStoreVariableTableTelemetryEvent,
  AreaStoreVariableTableTelemetryPort,
} from "./ports/area-store-variable-table-telemetry.port";
import type {
  AreaStoreRestrictionsTelemetryEvent,
  AreaStoreRestrictionsTelemetryPort,
} from "./ports/area-store-restrictions-telemetry.port";
import type {
  AreaStoreInventoryTelemetryEvent,
  AreaStoreInventoryTelemetryPort,
} from "./ports/area-store-inventory-telemetry.port";
import type { AtomicModuleSnapshotRepositoryPort } from "./ports/atomic-module-snapshot.port";
import {
  AreaDraftRepositoryError,
  type AreaDraftRepositoryPort,
} from "./ports/area-draft.repository.port";
import {
  AreaObjectBlueprintSourceError,
  type AreaObjectBlueprintSourcePort,
} from "./ports/area-object-blueprint-source.port";
import type { AreaUpdateCommand } from "../domain/area-update-command.types";
import {
  AreaUpdateDraftProjectionError,
  projectAreaUpdateDraft,
  type ProjectedNewAreaObject,
} from "../domain/area-update-draft-projector";
import type {
  AreaCreateCandidateResource,
  AreaCreateResourceExtension,
} from "../domain/area-create-transaction.types";
import type {
  AreaUpdateCompiledCandidate,
  AreaUpdateModuleState,
  AreaUpdateObjectMutationSummary,
} from "../domain/area-update-transaction.types";
import {
  buildModuleSnapshotManifestKey,
  hashModuleSnapshotManifest,
  validateModuleSnapshotManifest,
  type ModuleSnapshotManifest,
  type ModuleSnapshotObjectDescriptor,
} from "../domain/module-snapshot-manifest";
import {
  AREA_STORE_CONSTRUCTION_PROFILE,
  AREA_STORE_DYNAMIC_CONSTRUCTION_PROFILE,
  hashAreaStoreConstructionDependencies,
} from "../domain/area-store-construction-profile";
import { AREA_ENCOUNTER_DYNAMIC_CONSTRUCTION_PROFILE } from
  "../domain/area-encounter-construction-profile";
import { AREA_WAYPOINT_DYNAMIC_CONSTRUCTION_PROFILE } from
  "../domain/area-waypoint-construction-profile";
import {
  AREA_ENCOUNTER_CREATURE_LIST_BLUEPRINT_PROFILE_ID,
  MAX_AREA_ENCOUNTER_CREATURE_LIST_BLUEPRINT_BYTES,
  parseAreaEncounterCreatureListResolvedMutation,
  type AreaEncounterCreatureListBlueprintTargetEntry,
  type ExistingAreaEncounterCreatureListMutation,
  type ExistingAreaEncounterCreatureListResolvedMutation,
} from "../domain/area-encounter-creature-single-spawn";
import { AREA_STORE_COMMERCE_FIELDS } from "../domain/area-store-commerce";
import { AREA_STORE_SCRIPT_RESREF_FIELDS } from "../domain/area-store-script-resrefs";
import { AREA_TRIGGER_SCRIPT_RESREF_FIELDS } from "../domain/area-trigger-script-resrefs";
import { AREA_TRIGGER_CORE_PROPERTY_FIELDS } from "../domain/area-trigger-core-properties";
import { AREA_TRIGGER_TRAP_PROPERTY_FIELDS } from "../domain/area-trigger-trap-properties";
import { AREA_DOOR_CONSTRUCTION_PROFILE } from "../domain/area-door-construction-profile";
import { AREA_PLACEABLE_DYNAMIC_CONSTRUCTION_PROFILE } from "../domain/area-placeable-construction-profile";
import { AREA_ITEM_DYNAMIC_CONSTRUCTION_PROFILE } from "../domain/area-item-construction-profile";
import type { TemplateCatalogRepositoryPort } from "../../catalog/application/ports/template-catalog-repository.port";
import { isExactEffectiveTrapsTwoDaResolvedTable } from "../../catalog/domain/effective-traps-two-da";
import { isExactEffectiveBodyBagTwoDaResolvedTable } from "../../catalog/domain/effective-bodybag-two-da";
import { isExactEffectivePortraitsTwoDaTable } from "../../catalog/domain/effective-portraits-two-da";
import { isExactEffectiveItemBaseItemsTwoDaTable } from
  "../../catalog/domain/effective-item-base-items-two-da";
import { packAreaStoreInventoryBuckets } from "../domain/area-store-inventory";
import { isExactModuleFactionCatalog } from "../../catalog/domain/module-faction-catalog";
import { isExactEffectiveAreaEncounterDifficultyCatalog } from
  "../../catalog/domain/effective-area-encounter-difficulty-two-da";
import { parseRawGffDocument } from "../../catalog/adapters/outbound/blob/aurora-gff-template-parser";
import {
  readModuleIfoStartLocation,
  updateModuleIfoStartLocation,
} from "../adapters/outbound/blob/aurora-gff-module-ifo-area-writer";
import { areaModuleStartLocationsEqual } from "../domain/area-module-start-location";
import { updateGitAreaAudioEnvironment } from "../adapters/outbound/blob/aurora-gff-area-audio-writer";
import { updateGitAreaVariables } from "../adapters/outbound/blob/aurora-gff-area-variable-writer";
import {
  admitCreatureGenderCatalogMutations,
  AreaCreatureGenderCatalogAdmissionError,
} from "./area-creature-gender-catalog-admission";
import {
  admitCreatureAppendageCatalogMutations,
  AreaCreatureAppendageCatalogAdmissionError,
} from "./area-creature-appendage-catalog-admission";
import {
  admitCreaturePerceptionRangeCatalogMutations,
  AreaCreaturePerceptionRangeCatalogAdmissionError,
} from "./area-creature-perception-range-catalog-admission";
import {
  admitCreatureWalkRateCatalogMutations,
  AreaCreatureWalkRateCatalogAdmissionError,
} from "./area-creature-walk-rate-catalog-admission";
import {
  admitCreatureSoundSetFileCatalogMutations,
  AreaCreatureSoundSetFileCatalogAdmissionError,
} from "./area-creature-sound-set-file-catalog-admission";
import {
  admitCreatureStartingPackageCatalogMutations,
  AreaCreatureStartingPackageCatalogAdmissionError,
} from "./area-creature-starting-package-catalog-admission";
import {
  admitCreatureClassIdentityCatalogMutations,
  AreaCreatureClassIdentityCatalogAdmissionError,
} from "./area-creature-class-identity-catalog-admission";
import {
  admitCreatureClassSpellReplacementCatalogMutations,
  AreaCreatureClassSpellReplacementCatalogAdmissionError,
} from "./area-creature-class-spell-replacement-catalog-admission";
import {
  admitCreatureSkillListCatalogMutations,
  AreaCreatureSkillListCatalogAdmissionError,
} from "./area-creature-skill-list-catalog-admission";
import {
  admitCreatureFeatListCatalogMutations,
  AreaCreatureFeatListCatalogAdmissionError,
} from "./area-creature-feat-list-catalog-admission";
import {
  admitCreatureSpecialAbilityListCatalogMutations,
  AreaCreatureSpecialAbilityListCatalogAdmissionError,
} from "./area-creature-special-ability-list-catalog-admission";
import {
  admitCreaturePhenotypeCatalogMutations,
  AreaCreaturePhenotypeCatalogAdmissionError,
} from "./area-creature-phenotype-catalog-admission";
import {
  admitCreaturePortraitCatalogMutations,
  AreaCreaturePortraitCatalogAdmissionError,
} from "./area-creature-portrait-catalog-admission";
import {
  admitCreatureHitPointCatalogMutations,
  AreaCreatureHitPointCatalogAdmissionError,
} from "./area-creature-hit-point-catalog-admission";

const RESOURCE_TYPES: Readonly<Record<AreaCreateResourceExtension, number>> =
  Object.freeze({ are: 2012, git: 2023, gic: 2046 });

export type AreaUpdateCompilerFailureCode =
  | "AREA_UPDATE_INVALID"
  | "AREA_UPDATE_DRAFT_NOT_FOUND"
  | "AREA_UPDATE_DRAFT_REVISION_CONFLICT"
  | "AREA_UPDATE_SOURCE_MISSING"
  | "AREA_UPDATE_SOURCE_STALE"
  | "AREA_UPDATE_TILESET_STALE"
  | "AREA_UPDATE_COMPANION_MISSING"
  | "AREA_UPDATE_COMPANION_MISMATCH"
  | "AREA_UPDATE_OBJECT_MUTATION_INVALID"
  | "AREA_UPDATE_CANDIDATE_INVALID"
  | "AREA_UPDATE_STORAGE_UNAVAILABLE";

export class AreaUpdateCompilerFailure extends Error {
  constructor(
    readonly code: AreaUpdateCompilerFailureCode,
    readonly status: number,
    message: string,
    readonly details: readonly string[] = [],
  ) {
    super(message);
    this.name = "AreaUpdateCompilerFailure";
  }
}

export interface AreaUpdateCandidateCompilerDependencies {
  readonly repository: Pick<
    AtomicModuleSnapshotRepositoryPort,
    "readHead" | "readManifest" | "readContent"
  >;
  readonly drafts: Pick<AreaDraftRepositoryPort, "read">;
  readonly areaEditing: Pick<AreaEditingApplicationService, "exportAre">;
  readonly blueprints: AreaObjectBlueprintSourcePort;
  readonly dynamicItemTelemetry?: AreaDynamicItemBlueprintCopyTelemetryPort;
  readonly storeCommerceTelemetry?: AreaStoreCommerceTelemetryPort;
  readonly storeScriptResRefsTelemetry?: AreaStoreScriptResRefsTelemetryPort;
  readonly triggerScriptResRefsTelemetry?: AreaTriggerScriptResRefsTelemetryPort;
  readonly triggerTransitionStorageTelemetry?: AreaTriggerTransitionStorageTelemetryPort;
  readonly triggerCorePropertiesTelemetry?: AreaTriggerCorePropertiesTelemetryPort;
  readonly triggerTrapPropertiesTelemetry?: AreaTriggerTrapPropertiesTelemetryPort;
  readonly triggerVariableTableTelemetry?: AreaTriggerVariableTableTelemetryPort;
  readonly storeVariableTableTelemetry?: AreaStoreVariableTableTelemetryPort;
  readonly storeRestrictionsTelemetry?: AreaStoreRestrictionsTelemetryPort;
  readonly storeInventoryTelemetry?: AreaStoreInventoryTelemetryPort;
  readonly appearanceCatalog: Pick<
    TemplateCatalogRepositoryPort,
    | "resolveEffectivePlaceablesTwoDaDescriptor"
    | "resolveEffectiveTemplateBlueprint"
    | "listEffectivePlaceablesTwoDaRows"
    | "resolveEffectiveWaypointTwoDaDescriptor"
    | "resolveEffectiveWaypointTwoDaRow"
    | "resolveEffectiveCreatureAppearanceTwoDaDescriptor"
    | "resolveEffectiveCreatureAppearanceTwoDaRow"
    | "resolveEffectiveCreatureGenderTwoDaDescriptor"
    | "resolveEffectiveCreatureGenderTwoDaRow"
    | "resolveEffectiveCreatureAppendageTwoDaDescriptor"
    | "resolveEffectiveCreatureAppendageTwoDaRow"
    | "resolveEffectiveCreaturePerceptionRangesTwoDaTable"
    | "resolveEffectiveCreatureWalkRatesTwoDaTable"
    | "resolveEffectiveCreatureSoundSetsTwoDaTable"
    | "resolveEffectiveCreatureStartingPackagesTwoDaTable"
    | "resolveEffectiveCreatureClassesTwoDaTable"
    | "resolveEffectiveCreatureClassSpellsTwoDaTable"
    | "resolveEffectiveCreatureSkillsTwoDaTable"
    | "resolveEffectiveCreatureFeatsTwoDaTable"
    | "resolveEffectiveCreatureSpecialAbilitiesTwoDaTable"
    | "resolveEffectiveCreaturePhenotypeTwoDaDescriptor"
    | "resolveEffectiveCreaturePhenotypeTwoDaRow"
    | "resolveCreatureAppearanceProfile"
    | "resolveEffectiveCreaturePortraitsTwoDaTable"
    | "resolveEffectiveCreatureRacialTypesTwoDaTable"
    | "resolveEffectiveTrapsTwoDaTable"
    | "resolveEffectiveItemBaseItemsTwoDaTable"
    | "resolveEffectiveBodyBagTwoDaTable"
    | "resolveEffectivePortraitsTwoDaTable"
    | "resolveModuleFactionCatalog"
    | "resolveEffectiveAreaEncounterDifficultyCatalog"
  >;
}

type DynamicItemBlueprintResolution = Readonly<{
  bytes: Buffer;
  resref: string;
  modelType: 0 | 1 | 2 | 3;
  dependencies: readonly Readonly<{
    templateResRef: string;
    resourceType: number;
    sha256: string;
    bytes: Buffer;
    resolvedModelType: 0 | 1 | 2 | 3;
  }>[];
  propertyCount: number;
  variableCount: number;
  nestedInventoryState: "absent" | "empty" | "expanded" | "blocked";
}>;

type EncounterCreatureBlueprintResolution = Readonly<{
  appearance: number;
  challengeRating: number;
  resRef: string;
}>;

type DynamicItemBlueprintDraftIdentity = Readonly<{
  sourceProfileId: string;
  templateId: string;
  sourceObjectKey?: string;
  sourceSizeBytes?: number;
  sourceSha256: string;
  resRef: string;
  tag: string;
}>;

type DynamicStoreBlueprintResolution = Readonly<{
  bytes: Buffer;
  resref: string;
  dependencies: readonly Readonly<{
    templateResRef: string;
    resourceType: number;
    sha256: string;
    bytes: Buffer;
    resolvedModelType: 0 | 1 | 2 | 3;
  }>[];
}>;

type DynamicEncounterBlueprintResolution = Readonly<{
  bytes: Buffer;
  resref: string;
}>;

type DynamicWaypointBlueprintResolution = Readonly<{
  bytes: Buffer;
  resref: string;
}>;

export class AreaUpdateCandidateCompiler {
  constructor(private readonly dependencies: AreaUpdateCandidateCompilerDependencies) {}

  async compile(
    command: AreaUpdateCommand,
    moduleState: AreaUpdateModuleState,
    actorId: string,
    _transactionId: string,
  ): Promise<AreaUpdateCompiledCandidate> {
    const { manifest } = await this.readCapturedSnapshot(command, moduleState);
    const descriptors = this.requireAreaDescriptors(manifest, command.areaResRef);
    const are = await this.readVerifiedContent(descriptors.are);
    const git = await this.readVerifiedContent(descriptors.git);
    const gic = await this.readVerifiedContent(descriptors.gic);
    const ifo = await this.readVerifiedContent(descriptors.ifo);

    let snapshot;
    try {
      snapshot = await this.dependencies.drafts.read({
        actorId,
        draftId: command.draft.id,
        revision: command.draft.revision,
      });
    } catch (error) {
      throw mapDraftError(error);
    }

    let projected;
    try {
      projected = projectAreaUpdateDraft(snapshot, {
        areaResRef: command.areaResRef,
        draftId: command.draft.id,
        draftRevision: command.draft.revision,
        draftNormalizedSha256: command.draft.normalizedSha256,
      });
    } catch (error) {
      if (error instanceof AreaUpdateDraftProjectionError) {
        throw compilerError("AREA_UPDATE_INVALID", 422, error.message, [error.path]);
      }
      throw error;
    }

    if (projected.areaFingerprint !== descriptors.are.sha256) {
      throw compilerError(
        "AREA_UPDATE_SOURCE_STALE",
        409,
        "The source ARE changed after the draft was opened.",
        [
          `expected=${projected.areaFingerprint}`,
          `actual=${descriptors.are.sha256}`,
        ],
      );
    }

    let candidateIfoBytes = ifo;
    let moduleStartLocationMutation: AreaUpdateCompiledCandidate["moduleStartLocationMutation"];
    if (projected.moduleStartLocation) {
      const retained = readModuleIfoStartLocation(ifo);
      if (!retained) {
        throw compilerError(
          "AREA_UPDATE_CANDIDATE_INVALID",
          422,
          "The retained module start-location tuple is not safely editable.",
        );
      }
      if (!areaModuleStartLocationsEqual(
        retained,
        projected.moduleStartLocation.expectedValue,
      )) {
        throw compilerError(
          "AREA_UPDATE_SOURCE_STALE",
          409,
          "The module start location changed after the draft was opened.",
        );
      }
      try {
        candidateIfoBytes = updateModuleIfoStartLocation(
          ifo,
          projected.moduleStartLocation,
        ).bytes;
      } catch (error) {
        throw compilerError(
          "AREA_UPDATE_CANDIDATE_INVALID",
          422,
          "The module start-location candidate is invalid.",
          [errorMessage(error)],
        );
      }
      moduleStartLocationMutation = Object.freeze({
        expectedValue: projected.moduleStartLocation.expectedValue,
        value: projected.moduleStartLocation.value,
        sourceIfoSha256: descriptors.ifo.sha256,
        candidateIfoSha256: sha256Hex(candidateIfoBytes),
      });
    }

    let candidateGitBytes = git;
    let candidateGicBytes = gic;
    let objectMutation: AreaUpdateCompiledCandidate["objectMutation"];
    if (projected.objectEditing) {
      const storeCommerceTelemetryProfiles = (
        projected.objectEditing.propertyMutations ?? []
      ).flatMap((mutation) => mutation.kind === "store" && mutation.commerce
        ? [Object.freeze({
            changedFieldCount: AREA_STORE_COMMERCE_FIELDS.filter(
              (field) => mutation.commerce?.expectedValue[field.key] !==
                mutation.commerce?.value[field.key],
            ).length,
          })]
        : []);
      const storeScriptResRefsTelemetryProfiles = (
        projected.objectEditing.propertyMutations ?? []
      ).flatMap((mutation) => mutation.kind === "store" && mutation.scripts
        ? [Object.freeze({
            changedFieldCount: AREA_STORE_SCRIPT_RESREF_FIELDS.filter(
              (field) => mutation.scripts?.expectedValue[field.key] !==
                mutation.scripts?.value[field.key],
            ).length,
          })]
        : []);
      const triggerScriptResRefsTelemetryProfiles = (
        projected.objectEditing.propertyMutations ?? []
      ).flatMap((mutation) => mutation.kind === "trigger" && mutation.scripts
        ? [Object.freeze({
            changedFieldCount: AREA_TRIGGER_SCRIPT_RESREF_FIELDS.filter(
              (field) => mutation.scripts?.expectedValue[field.key] !==
                mutation.scripts?.value[field.key],
            ).length,
          })]
        : []);
      const triggerTransitionStorageTelemetryProfiles = (
        projected.objectEditing.propertyMutations ?? []
      ).flatMap((mutation) => mutation.kind === "trigger" && mutation.transitionStorage
        ? [Object.freeze({
            changedFieldCount:
              Number(
                mutation.transitionStorage.expectedValue.linkedTo !==
                  mutation.transitionStorage.value.linkedTo,
              ) +
              Number(
                mutation.transitionStorage.expectedValue.linkedToFlags !==
                  mutation.transitionStorage.value.linkedToFlags,
              ) +
              Number(
                mutation.transitionStorage.expectedValue.loadScreenId !==
                  mutation.transitionStorage.value.loadScreenId,
              ),
          })]
        : []);
      const triggerCorePropertiesTelemetryProfiles = (
        projected.objectEditing.propertyMutations ?? []
      ).flatMap((mutation) => mutation.kind === "trigger" && mutation.coreProperties
        ? [Object.freeze({
            changedFieldCount: AREA_TRIGGER_CORE_PROPERTY_FIELDS.filter(
              (field) => mutation.coreProperties?.expectedValue[field.key] !==
                mutation.coreProperties?.value[field.key],
            ).length,
          })]
        : []);
      const triggerTrapPropertiesTelemetryProfiles = (
        projected.objectEditing.propertyMutations ?? []
      ).flatMap((mutation) => mutation.kind === "trigger" && mutation.trapProperties
        ? [Object.freeze({
            changedFieldCount: AREA_TRIGGER_TRAP_PROPERTY_FIELDS.filter(
              (field) => mutation.trapProperties?.expectedValue[field.key] !==
                mutation.trapProperties?.value[field.key],
            ).length,
          })]
        : []);
      const triggerVariableTableTelemetryProfiles = (
        projected.objectEditing.propertyMutations ?? []
      ).flatMap((mutation) => mutation.kind === "trigger" && mutation.variables
        ? [Object.freeze({
            changedEntryCount: changedVariableEntryCount(
              mutation.variables.expectedEntries,
              mutation.variables.entries,
            ),
          })]
        : []);
      const storeVariableTableTelemetryProfiles = (
        projected.objectEditing.propertyMutations ?? []
      ).flatMap((mutation) => mutation.kind === "store" && mutation.variables
        ? [Object.freeze({ entryCount: mutation.variables.entries.length })]
        : []);
      const storeRestrictionsTelemetryProfiles = (
        projected.objectEditing.propertyMutations ?? []
      ).flatMap((mutation) => mutation.kind === "store" && mutation.restrictions
        ? [Object.freeze({
            entryCount: mutation.restrictions.value.willNotBuy.length +
              mutation.restrictions.value.willOnlyBuy.length,
            changedListCount: (["willNotBuy", "willOnlyBuy"] as const).filter((key) => {
              const expected = mutation.restrictions!.expectedValue[key].baseItemIds;
              const target = mutation.restrictions!.value[key];
              return expected.length !== target.length ||
                expected.some((entry, index) => entry !== target[index]);
            }).length,
          })]
        : []);
      const storeInventoryTelemetryProfiles = (
        projected.objectEditing.propertyMutations ?? []
      ).flatMap((mutation) => mutation.kind === "store" && mutation.inventory
        ? [Object.freeze({
            bucketCount: mutation.inventory.buckets.length,
            entryCount: mutation.inventory.buckets.reduce(
              (count, bucket) => count + bucket.entries.length,
              0,
            ),
            changedEntryCount: mutation.inventory.buckets.reduce((count, bucket, index) => {
              const expected = mutation.inventory!.expectedBuckets[index]?.entries ?? [];
              const changed = Math.max(expected.length, bucket.entries.length);
              let unchanged = 0;
              for (let entryIndex = 0; entryIndex < Math.min(
                expected.length,
                bucket.entries.length,
              ); entryIndex += 1) {
                const source = expected[entryIndex];
                const target = bucket.entries[entryIndex];
                if (source?.sourceIndex === target?.sourceIndex &&
                  source.resRef === target.resRef && source.baseItemId === target.baseItemId &&
                  source.infinite === target.infinite) unchanged += 1;
              }
              return count + changed - unchanged;
            }, 0),
          })]
        : []);
      const storeCommerceStartedAt = Date.now();
      const storeScriptResRefsStartedAt = Date.now();
      const triggerScriptResRefsStartedAt = Date.now();
      const triggerTransitionStorageStartedAt = Date.now();
      const triggerCorePropertiesStartedAt = Date.now();
      const triggerTrapPropertiesStartedAt = Date.now();
      const triggerVariableTableStartedAt = Date.now();
      const storeVariableTableStartedAt = Date.now();
      const storeRestrictionsStartedAt = Date.now();
      const storeInventoryStartedAt = Date.now();
      if (projected.objectEditing.sourceGitSha256 !== descriptors.git.sha256) {
        this.emitStoreCommerceTelemetryBatch(storeCommerceTelemetryProfiles, {
          operation: "plan",
          outcome: "failed",
          resultCode: "source_git_stale",
          durationMs: elapsedMilliseconds(storeCommerceStartedAt),
        });
        this.emitStoreScriptResRefsTelemetryBatch(storeScriptResRefsTelemetryProfiles, {
          operation: "plan",
          outcome: "failed",
          resultCode: "source_git_stale",
          durationMs: elapsedMilliseconds(storeScriptResRefsStartedAt),
        });
        this.emitTriggerScriptResRefsTelemetryBatch(triggerScriptResRefsTelemetryProfiles, {
          operation: "plan",
          outcome: "failed",
          resultCode: "source_git_stale",
          durationMs: elapsedMilliseconds(triggerScriptResRefsStartedAt),
        });
        this.emitTriggerTransitionStorageTelemetryBatch(
          triggerTransitionStorageTelemetryProfiles,
          {
            operation: "plan",
            outcome: "failed",
            resultCode: "source_git_stale",
            durationMs: elapsedMilliseconds(triggerTransitionStorageStartedAt),
          },
        );
        this.emitTriggerCorePropertiesTelemetryBatch(triggerCorePropertiesTelemetryProfiles, {
          operation: "plan",
          outcome: "failed",
          resultCode: "source_git_stale",
          durationMs: elapsedMilliseconds(triggerCorePropertiesStartedAt),
        });
        this.emitTriggerTrapPropertiesTelemetryBatch(triggerTrapPropertiesTelemetryProfiles, {
          operation: "plan",
          outcome: "failed",
          resultCode: "source_git_stale",
          durationMs: elapsedMilliseconds(triggerTrapPropertiesStartedAt),
        });
        this.emitTriggerVariableTableTelemetryBatch(triggerVariableTableTelemetryProfiles, {
          operation: "plan",
          outcome: "failed",
          resultCode: "source_git_stale",
          durationMs: elapsedMilliseconds(triggerVariableTableStartedAt),
        });
        this.emitStoreVariableTableTelemetryBatch(storeVariableTableTelemetryProfiles, {
          operation: "plan",
          outcome: "failed",
          resultCode: "source_git_stale",
          durationMs: elapsedMilliseconds(storeVariableTableStartedAt),
        });
        this.emitStoreRestrictionsTelemetryBatch(storeRestrictionsTelemetryProfiles, {
          operation: "plan",
          outcome: "failed",
          resultCode: "source_git_stale",
          durationMs: elapsedMilliseconds(storeRestrictionsStartedAt),
        });
        this.emitStoreInventoryTelemetryBatch(storeInventoryTelemetryProfiles, {
          operation: "plan",
          outcome: "failed",
          resultCode: "source_git_stale",
          durationMs: elapsedMilliseconds(storeInventoryStartedAt),
        });
        throw compilerError(
          "AREA_UPDATE_SOURCE_STALE",
          409,
          "The source GIT changed after the draft was opened.",
          [
            `expected=${projected.objectEditing.sourceGitSha256}`,
            `actual=${descriptors.git.sha256}`,
          ],
        );
      }
      if (
        projected.objectEditing.sourceGicSha256 !== undefined &&
        projected.objectEditing.sourceGicSha256 !== descriptors.gic.sha256
      ) {
        this.emitStoreCommerceTelemetryBatch(storeCommerceTelemetryProfiles, {
          operation: "plan",
          outcome: "failed",
          resultCode: "source_gic_stale",
          durationMs: elapsedMilliseconds(storeCommerceStartedAt),
        });
        this.emitStoreScriptResRefsTelemetryBatch(storeScriptResRefsTelemetryProfiles, {
          operation: "plan",
          outcome: "failed",
          resultCode: "source_gic_stale",
          durationMs: elapsedMilliseconds(storeScriptResRefsStartedAt),
        });
        this.emitTriggerScriptResRefsTelemetryBatch(triggerScriptResRefsTelemetryProfiles, {
          operation: "plan",
          outcome: "failed",
          resultCode: "source_gic_stale",
          durationMs: elapsedMilliseconds(triggerScriptResRefsStartedAt),
        });
        this.emitTriggerTransitionStorageTelemetryBatch(
          triggerTransitionStorageTelemetryProfiles,
          {
            operation: "plan",
            outcome: "failed",
            resultCode: "source_gic_stale",
            durationMs: elapsedMilliseconds(triggerTransitionStorageStartedAt),
          },
        );
        this.emitTriggerCorePropertiesTelemetryBatch(triggerCorePropertiesTelemetryProfiles, {
          operation: "plan",
          outcome: "failed",
          resultCode: "source_gic_stale",
          durationMs: elapsedMilliseconds(triggerCorePropertiesStartedAt),
        });
        this.emitTriggerTrapPropertiesTelemetryBatch(triggerTrapPropertiesTelemetryProfiles, {
          operation: "plan",
          outcome: "failed",
          resultCode: "source_gic_stale",
          durationMs: elapsedMilliseconds(triggerTrapPropertiesStartedAt),
        });
        this.emitTriggerVariableTableTelemetryBatch(triggerVariableTableTelemetryProfiles, {
          operation: "plan",
          outcome: "failed",
          resultCode: "source_gic_stale",
          durationMs: elapsedMilliseconds(triggerVariableTableStartedAt),
        });
        this.emitStoreVariableTableTelemetryBatch(storeVariableTableTelemetryProfiles, {
          operation: "plan",
          outcome: "failed",
          resultCode: "source_gic_stale",
          durationMs: elapsedMilliseconds(storeVariableTableStartedAt),
        });
        this.emitStoreRestrictionsTelemetryBatch(storeRestrictionsTelemetryProfiles, {
          operation: "plan",
          outcome: "failed",
          resultCode: "source_gic_stale",
          durationMs: elapsedMilliseconds(storeRestrictionsStartedAt),
        });
        this.emitStoreInventoryTelemetryBatch(storeInventoryTelemetryProfiles, {
          operation: "plan",
          outcome: "failed",
          resultCode: "source_gic_stale",
          durationMs: elapsedMilliseconds(storeInventoryStartedAt),
        });
        throw compilerError(
          "AREA_UPDATE_SOURCE_STALE",
          409,
          "The source GIC changed after the draft was opened.",
          [
            `expected=${projected.objectEditing.sourceGicSha256}`,
            `actual=${descriptors.gic.sha256}`,
          ],
        );
      }
      try {
        let plan: ReturnType<typeof planExistingAreaObjectDeletions>;
        try {
          plan = planExistingAreaObjectDeletions(git, gic, projected.objectEditing);
        } catch (error) {
          this.emitStoreCommerceTelemetryBatch(storeCommerceTelemetryProfiles, {
            operation: "plan",
            outcome: "failed",
            resultCode: "source_or_cas_rejected",
            durationMs: elapsedMilliseconds(storeCommerceStartedAt),
          });
          this.emitStoreScriptResRefsTelemetryBatch(storeScriptResRefsTelemetryProfiles, {
            operation: "plan",
            outcome: "failed",
            resultCode: "source_or_cas_rejected",
            durationMs: elapsedMilliseconds(storeScriptResRefsStartedAt),
          });
          this.emitTriggerScriptResRefsTelemetryBatch(triggerScriptResRefsTelemetryProfiles, {
            operation: "plan",
            outcome: "failed",
            resultCode: "source_or_cas_rejected",
            durationMs: elapsedMilliseconds(triggerScriptResRefsStartedAt),
          });
          this.emitTriggerTransitionStorageTelemetryBatch(
            triggerTransitionStorageTelemetryProfiles,
            {
              operation: "plan",
              outcome: "failed",
              resultCode: "source_or_cas_rejected",
              durationMs: elapsedMilliseconds(triggerTransitionStorageStartedAt),
            },
          );
          this.emitTriggerCorePropertiesTelemetryBatch(triggerCorePropertiesTelemetryProfiles, {
            operation: "plan",
            outcome: "failed",
            resultCode: "source_or_cas_rejected",
            durationMs: elapsedMilliseconds(triggerCorePropertiesStartedAt),
          });
          this.emitTriggerTrapPropertiesTelemetryBatch(triggerTrapPropertiesTelemetryProfiles, {
            operation: "plan",
            outcome: "failed",
            resultCode: "source_or_cas_rejected",
            durationMs: elapsedMilliseconds(triggerTrapPropertiesStartedAt),
          });
          this.emitTriggerVariableTableTelemetryBatch(triggerVariableTableTelemetryProfiles, {
            operation: "plan",
            outcome: "failed",
            resultCode: "source_or_cas_rejected",
            durationMs: elapsedMilliseconds(triggerVariableTableStartedAt),
          });
          this.emitStoreVariableTableTelemetryBatch(storeVariableTableTelemetryProfiles, {
            operation: "plan",
            outcome: "failed",
            resultCode: "source_or_cas_rejected",
            durationMs: elapsedMilliseconds(storeVariableTableStartedAt),
          });
          this.emitStoreRestrictionsTelemetryBatch(storeRestrictionsTelemetryProfiles, {
            operation: "plan",
            outcome: "failed",
            resultCode: "source_or_cas_rejected",
            durationMs: elapsedMilliseconds(storeRestrictionsStartedAt),
          });
          this.emitStoreInventoryTelemetryBatch(storeInventoryTelemetryProfiles, {
            operation: "plan",
            outcome: "failed",
            resultCode: "source_or_cas_rejected",
            durationMs: elapsedMilliseconds(storeInventoryStartedAt),
          });
          throw error;
        }
        this.emitStoreCommerceTelemetryBatch(storeCommerceTelemetryProfiles, {
          operation: "parse_source",
          outcome: "succeeded",
          resultCode: "source_vector_parsed",
          durationMs: elapsedMilliseconds(storeCommerceStartedAt),
        });
        this.emitStoreScriptResRefsTelemetryBatch(storeScriptResRefsTelemetryProfiles, {
          operation: "parse_source",
          outcome: "succeeded",
          resultCode: "source_vector_parsed",
          durationMs: elapsedMilliseconds(storeScriptResRefsStartedAt),
        });
        this.emitTriggerScriptResRefsTelemetryBatch(triggerScriptResRefsTelemetryProfiles, {
          operation: "parse_source",
          outcome: "succeeded",
          resultCode: "source_tuple_parsed",
          durationMs: elapsedMilliseconds(triggerScriptResRefsStartedAt),
        });
        this.emitTriggerTransitionStorageTelemetryBatch(
          triggerTransitionStorageTelemetryProfiles,
          {
            operation: "parse_source",
            outcome: "succeeded",
            resultCode: "source_tuple_parsed",
            durationMs: elapsedMilliseconds(triggerTransitionStorageStartedAt),
          },
        );
        this.emitTriggerCorePropertiesTelemetryBatch(triggerCorePropertiesTelemetryProfiles, {
          operation: "parse_source",
          outcome: "succeeded",
          resultCode: "source_tuple_parsed",
          durationMs: elapsedMilliseconds(triggerCorePropertiesStartedAt),
        });
        this.emitTriggerTrapPropertiesTelemetryBatch(triggerTrapPropertiesTelemetryProfiles, {
          operation: "parse_source",
          outcome: "succeeded",
          resultCode: "source_tuple_parsed",
          durationMs: elapsedMilliseconds(triggerTrapPropertiesStartedAt),
        });
        this.emitTriggerVariableTableTelemetryBatch(triggerVariableTableTelemetryProfiles, {
          operation: "parse_source",
          outcome: "succeeded",
          resultCode: "source_vector_parsed",
          durationMs: elapsedMilliseconds(triggerVariableTableStartedAt),
        });
        this.emitStoreVariableTableTelemetryBatch(storeVariableTableTelemetryProfiles, {
          operation: "parse_source",
          outcome: "succeeded",
          resultCode: "source_vector_parsed",
          durationMs: elapsedMilliseconds(storeVariableTableStartedAt),
        });
        this.emitStoreRestrictionsTelemetryBatch(storeRestrictionsTelemetryProfiles, {
          operation: "parse_source",
          outcome: "succeeded",
          resultCode: "source_pair_parsed",
          durationMs: elapsedMilliseconds(storeRestrictionsStartedAt),
        });
        this.emitStoreInventoryTelemetryBatch(storeInventoryTelemetryProfiles, {
          operation: "parse_source",
          outcome: "succeeded",
          resultCode: "five_buckets_parsed",
          durationMs: elapsedMilliseconds(storeInventoryStartedAt),
        });
        await this.validateStoreRestrictionMutations(
          plan.propertyMutations,
          storeRestrictionsTelemetryProfiles,
          storeRestrictionsStartedAt,
        );
        this.emitStoreRestrictionsTelemetryBatch(storeRestrictionsTelemetryProfiles, {
          operation: "admit_profile",
          outcome: "succeeded",
          resultCode: "complete_pair_admitted",
          durationMs: elapsedMilliseconds(storeRestrictionsStartedAt),
        });
        this.emitStoreRestrictionsTelemetryBatch(storeRestrictionsTelemetryProfiles, {
          operation: "plan",
          outcome: "succeeded",
          resultCode: "cas_planned",
          durationMs: elapsedMilliseconds(storeRestrictionsStartedAt),
        });
        await this.validateStoreInventoryMutations(
          plan.propertyMutations,
          storeInventoryTelemetryProfiles,
          storeInventoryStartedAt,
        );
        this.emitStoreInventoryTelemetryBatch(storeInventoryTelemetryProfiles, {
          operation: "admit_profile",
          outcome: "succeeded",
          resultCode: "complete_inventory_admitted",
          durationMs: elapsedMilliseconds(storeInventoryStartedAt),
        });
        this.emitStoreInventoryTelemetryBatch(storeInventoryTelemetryProfiles, {
          operation: "plan",
          outcome: "succeeded",
          resultCode: "cas_planned",
          durationMs: elapsedMilliseconds(storeInventoryStartedAt),
        });
        this.emitStoreInventoryTelemetryBatch(storeInventoryTelemetryProfiles, {
          operation: "pack",
          outcome: "succeeded",
          resultCode: "repository_packed",
          durationMs: elapsedMilliseconds(storeInventoryStartedAt),
        });
        this.emitStoreCommerceTelemetryBatch(storeCommerceTelemetryProfiles, {
          operation: "admit_profile",
          outcome: "succeeded",
          resultCode: "complete_vector_admitted",
          durationMs: elapsedMilliseconds(storeCommerceStartedAt),
        });
        this.emitStoreScriptResRefsTelemetryBatch(storeScriptResRefsTelemetryProfiles, {
          operation: "admit_profile",
          outcome: "succeeded",
          resultCode: "complete_vector_admitted",
          durationMs: elapsedMilliseconds(storeScriptResRefsStartedAt),
        });
        this.emitTriggerScriptResRefsTelemetryBatch(triggerScriptResRefsTelemetryProfiles, {
          operation: "plan",
          outcome: "succeeded",
          resultCode: "cas_planned",
          durationMs: elapsedMilliseconds(triggerScriptResRefsStartedAt),
        });
        this.emitTriggerTransitionStorageTelemetryBatch(
          triggerTransitionStorageTelemetryProfiles,
          {
            operation: "plan",
            outcome: "succeeded",
            resultCode: "cas_planned",
            durationMs: elapsedMilliseconds(triggerTransitionStorageStartedAt),
          },
        );
        this.emitTriggerCorePropertiesTelemetryBatch(triggerCorePropertiesTelemetryProfiles, {
          operation: "plan",
          outcome: "succeeded",
          resultCode: "cas_planned",
          durationMs: elapsedMilliseconds(triggerCorePropertiesStartedAt),
        });
        this.emitTriggerTrapPropertiesTelemetryBatch(triggerTrapPropertiesTelemetryProfiles, {
          operation: "plan",
          outcome: "succeeded",
          resultCode: "cas_planned",
          durationMs: elapsedMilliseconds(triggerTrapPropertiesStartedAt),
        });
        this.emitTriggerVariableTableTelemetryBatch(triggerVariableTableTelemetryProfiles, {
          operation: "plan",
          outcome: "succeeded",
          resultCode: "cas_planned",
          durationMs: elapsedMilliseconds(triggerVariableTableStartedAt),
        });
        this.emitStoreVariableTableTelemetryBatch(storeVariableTableTelemetryProfiles, {
          operation: "admit_profile",
          outcome: "succeeded",
          resultCode: "complete_vector_admitted",
          durationMs: elapsedMilliseconds(storeVariableTableStartedAt),
        });
        this.emitStoreCommerceTelemetryBatch(storeCommerceTelemetryProfiles, {
          operation: "plan",
          outcome: "succeeded",
          resultCode: "cas_planned",
          durationMs: elapsedMilliseconds(storeCommerceStartedAt),
        });
        this.emitStoreScriptResRefsTelemetryBatch(storeScriptResRefsTelemetryProfiles, {
          operation: "plan",
          outcome: "succeeded",
          resultCode: "cas_planned",
          durationMs: elapsedMilliseconds(storeScriptResRefsStartedAt),
        });
        this.emitStoreVariableTableTelemetryBatch(storeVariableTableTelemetryProfiles, {
          operation: "plan",
          outcome: "succeeded",
          resultCode: "cas_planned",
          durationMs: elapsedMilliseconds(storeVariableTableStartedAt),
        });
        await this.validatePlaceableAppearanceMutations(plan.propertyMutations);
        await this.validateWaypointAppearanceMutations(plan.propertyMutations);
        await this.validateCreatureAppearanceMutations(plan.propertyMutations);
        await this.validateCreatureGenderMutations(plan.propertyMutations);
        await this.validateCreatureAppendageMutations(plan.propertyMutations);
        await this.validateCreaturePerceptionRangeMutations(plan.propertyMutations);
        await this.validateCreatureWalkRateMutations(plan.propertyMutations);
        await this.validateCreatureSoundSetFileMutations(plan.propertyMutations);
        await this.validateCreatureStartingPackageMutations(plan.propertyMutations);
        await this.validateCreatureClassIdentityMutations(plan.propertyMutations);
        await this.validateCreatureClassSpellReplacementMutations(plan.propertyMutations);
        await this.validateCreatureSkillListMutations(plan.propertyMutations);
        await this.validateCreatureFeatListMutations(plan.propertyMutations);
        await this.validateCreatureSpecialAbilityListMutations(plan.propertyMutations);
        await this.validateCreaturePhenotypeMutations(plan.propertyMutations);
        await this.validateCreaturePortraitMutations(plan.propertyMutations);
        await this.validateCreatureHitPointMutations(plan.propertyMutations);
        await this.validatePlaceableTrapTypeMutations(plan.propertyMutations);
        await this.validateItemBaseAppearanceMutations(plan.propertyMutations);
        await this.validateBodyBagMutations(plan.propertyMutations);
        await this.validatePlaceablePortraitMutations(plan.propertyMutations);
        await this.validateFactionMutations(plan.propertyMutations);
        await this.validateEncounterDifficultyMutations(plan.propertyMutations);
        const resolvedBlueprints = new Map<string, ReturnType<AreaObjectBlueprintSourcePort["resolve"]>>();
        const resolvedDynamicPlaceables = new Map<string, Promise<Readonly<{
          bytes: Buffer;
          resref: string;
          portraitId: number;
          dependencies: readonly Readonly<{
            templateResRef: string;
            resourceType: number;
            sha256: string;
            bytes: Buffer;
          }>[];
        }>>>();
        const resolvedDynamicItems = new Map<string, Promise<DynamicItemBlueprintResolution>>();
        const resolvedDynamicStores = new Map<string, Promise<DynamicStoreBlueprintResolution>>();
        const resolvedDynamicEncounters = new Map<
          string,
          Promise<DynamicEncounterBlueprintResolution>
        >();
        const resolvedDynamicWaypoints = new Map<
          string,
          Promise<DynamicWaypointBlueprintResolution>
        >();
        const resolvedEncounterCreatureBlueprints = new Map<
          string,
          Promise<EncounterCreatureBlueprintResolution>
        >();
        const resolveBlueprint = async (request: Readonly<{
          sourceKind: Parameters<AreaObjectBlueprintSourcePort["resolve"]>[0]["sourceKind"];
          sourceProfileId: string;
          templateResRef: string;
          expectedSha256: string;
        }>) => {
          const sourceKey = `${request.sourceKind}|${request.sourceProfileId}|${request.templateResRef}|${request.expectedSha256}`;
          let resolution = resolvedBlueprints.get(sourceKey);
          if (!resolution) {
            resolution = this.dependencies.blueprints.resolve(request);
            resolvedBlueprints.set(sourceKey, resolution);
          }
          const resolved = await resolution;
          if (
            resolved.sourceKind !== request.sourceKind ||
            resolved.sourceProfileId !== request.sourceProfileId ||
            resolved.templateResRef !== request.templateResRef ||
            resolved.sha256 !== request.expectedSha256
          ) {
            throw new AreaObjectBlueprintSourceError(
              "AREA_OBJECT_BLUEPRINT_SOURCE_INVALID",
              `Resolved ${request.sourceKind} blueprint identity differs from the retained draft provenance.`,
              Object.freeze(["resolved_identity_mismatch"]),
            );
          }
          return resolved;
        };
        const resolveDynamicPlaceable = async (addition: Extract<ProjectedNewAreaObject, {
          sourceKind: "placeable";
        }>) => {
          const sourceObjectKey = addition.sourceObjectKey;
          if (addition.sourceProfileId !== AREA_PLACEABLE_DYNAMIC_CONSTRUCTION_PROFILE.id ||
            typeof sourceObjectKey !== "string") {
            throw compilerError(
              "AREA_UPDATE_OBJECT_MUTATION_INVALID",
              422,
              "Dynamic Placeable provenance is incomplete.",
            );
          }
          const cacheKey = `${addition.templateId}|${sourceObjectKey}|${addition.sourceSha256}`;
          let resolution = resolvedDynamicPlaceables.get(cacheKey);
          if (!resolution) {
            resolution = this.resolveDynamicPlaceableBlueprint(addition, sourceObjectKey);
            resolvedDynamicPlaceables.set(cacheKey, resolution);
          }
          return resolution;
        };
        const resolveDynamicItem = async (addition: DynamicItemBlueprintDraftIdentity) => {
          const sourceObjectKey = addition.sourceObjectKey;
          const sourceSizeBytes = addition.sourceSizeBytes;
          if (addition.sourceProfileId !== AREA_ITEM_DYNAMIC_CONSTRUCTION_PROFILE.id ||
            typeof sourceObjectKey !== "string" || !Number.isSafeInteger(sourceSizeBytes)) {
            throw compilerError(
              "AREA_UPDATE_OBJECT_MUTATION_INVALID",
              422,
              "Dynamic Item provenance is incomplete.",
            );
          }
          const cacheKey = `${addition.templateId}|${sourceObjectKey}|${addition.sourceSha256}|${sourceSizeBytes}`;
          let resolution = resolvedDynamicItems.get(cacheKey);
          if (!resolution) {
            resolution = this.resolveDynamicItemBlueprint(
              addition,
              sourceObjectKey,
              Number(sourceSizeBytes),
            );
            resolvedDynamicItems.set(cacheKey, resolution);
          }
          return resolution;
        };
        const resolveDynamicStore = async (addition: Extract<ProjectedNewAreaObject, {
          sourceKind: "store";
        }>) => {
          const sourceObjectKey = addition.sourceObjectKey;
          const sourceSizeBytes = addition.sourceSizeBytes;
          if (addition.sourceProfileId !== AREA_STORE_DYNAMIC_CONSTRUCTION_PROFILE.id ||
            typeof sourceObjectKey !== "string" || !Number.isSafeInteger(sourceSizeBytes)) {
            throw compilerError(
              "AREA_UPDATE_OBJECT_MUTATION_INVALID",
              422,
              "Dynamic Store provenance is incomplete.",
            );
          }
          const cacheKey = `${addition.templateId}|${sourceObjectKey}|${addition.sourceSha256}|${sourceSizeBytes}`;
          let resolution = resolvedDynamicStores.get(cacheKey);
          if (!resolution) {
            resolution = this.resolveDynamicStoreBlueprint(
              addition,
              sourceObjectKey,
              Number(sourceSizeBytes),
            );
            resolvedDynamicStores.set(cacheKey, resolution);
          }
          return resolution;
        };
        const resolveDynamicEncounter = async (addition: Extract<ProjectedNewAreaObject, {
          sourceKind: "encounter";
        }>) => {
          const sourceObjectKey = addition.sourceObjectKey;
          const sourceSizeBytes = addition.sourceSizeBytes;
          if (addition.sourceProfileId !== AREA_ENCOUNTER_DYNAMIC_CONSTRUCTION_PROFILE.id ||
            typeof sourceObjectKey !== "string" || !Number.isSafeInteger(sourceSizeBytes)) {
            throw compilerError(
              "AREA_UPDATE_OBJECT_MUTATION_INVALID",
              422,
              "Dynamic Encounter provenance is incomplete.",
            );
          }
          const cacheKey = `${addition.templateId}|${sourceObjectKey}|${addition.sourceSha256}|${sourceSizeBytes}`;
          let resolution = resolvedDynamicEncounters.get(cacheKey);
          if (!resolution) {
            resolution = this.resolveDynamicEncounterBlueprint(
              addition,
              sourceObjectKey,
              Number(sourceSizeBytes),
            );
            resolvedDynamicEncounters.set(cacheKey, resolution);
          }
          return resolution;
        };
        const resolveDynamicWaypoint = async (addition: Extract<ProjectedNewAreaObject, {
          sourceKind: "waypoint";
        }>) => {
          const sourceObjectKey = addition.sourceObjectKey;
          const sourceSizeBytes = addition.sourceSizeBytes;
          if (addition.sourceProfileId !== AREA_WAYPOINT_DYNAMIC_CONSTRUCTION_PROFILE.id ||
            typeof sourceObjectKey !== "string" || !Number.isSafeInteger(sourceSizeBytes)) {
            throw compilerError(
              "AREA_UPDATE_OBJECT_MUTATION_INVALID",
              422,
              "Dynamic Waypoint provenance is incomplete.",
            );
          }
          const cacheKey = `${addition.templateId}|${sourceObjectKey}|${addition.sourceSha256}|${sourceSizeBytes}`;
          let resolution = resolvedDynamicWaypoints.get(cacheKey);
          if (!resolution) {
            resolution = this.resolveDynamicWaypointBlueprint(
              addition,
              sourceObjectKey,
              Number(sourceSizeBytes),
            );
            resolvedDynamicWaypoints.set(cacheKey, resolution);
          }
          return resolution;
        };
        const additions: readonly NewAreaObjectAddition[] = await Promise.all(projected.objectEditing.newObjects.map(async (addition) => {
          if (
            addition.sourceKind === "waypoint" &&
            addition.sourceProfileId === AREA_WAYPOINT_DYNAMIC_CONSTRUCTION_PROFILE.id
          ) {
            const resolved = await resolveDynamicWaypoint(addition);
            return Object.freeze({
              kind: addition.sourceKind,
              localObjectId: addition.localObjectId,
              sourceProfileId: addition.sourceProfileId,
              sourceObjectKey: addition.sourceObjectKey,
              sourceSizeBytes: addition.sourceSizeBytes,
              templateResRef: resolved.resref,
              resRef: addition.resRef,
              tag: addition.tag,
              sourceSha256: addition.sourceSha256,
              blueprintBytes: Buffer.from(resolved.bytes),
              x: addition.x,
              y: addition.y,
              z: addition.z,
              bearing: addition.bearing,
            }) as NewAreaObjectAddition;
          }
          if (
            addition.sourceKind === "encounter" &&
            addition.sourceProfileId === AREA_ENCOUNTER_DYNAMIC_CONSTRUCTION_PROFILE.id
          ) {
            const resolved = await resolveDynamicEncounter(addition);
            return Object.freeze({
              kind: addition.sourceKind,
              localObjectId: addition.localObjectId,
              sourceProfileId: addition.sourceProfileId,
              sourceObjectKey: addition.sourceObjectKey,
              sourceSizeBytes: addition.sourceSizeBytes,
              templateResRef: resolved.resref,
              resRef: addition.resRef,
              tag: addition.tag,
              sourceSha256: addition.sourceSha256,
              blueprintBytes: Buffer.from(resolved.bytes),
              x: addition.x,
              y: addition.y,
              z: addition.z,
              bearing: addition.bearing,
            }) as NewAreaObjectAddition;
          }
          if (
            addition.sourceKind === "item" &&
            addition.sourceProfileId === AREA_ITEM_DYNAMIC_CONSTRUCTION_PROFILE.id
          ) {
            const resolved = await resolveDynamicItem(addition);
            return Object.freeze({
              kind: addition.sourceKind,
              localObjectId: addition.localObjectId,
              sourceProfileId: addition.sourceProfileId,
              sourceObjectKey: addition.sourceObjectKey,
              sourceSizeBytes: addition.sourceSizeBytes,
              templateResRef: resolved.resref,
              resRef: addition.resRef,
              tag: addition.tag,
              sourceSha256: addition.sourceSha256,
              resolvedModelType: resolved.modelType,
              blueprintBytes: Buffer.from(resolved.bytes),
              ...(resolved.dependencies.length > 0
                ? {
                    blueprintDependencies: resolved.dependencies.map((dependency) =>
                      Object.freeze({
                        templateResRef: dependency.templateResRef,
                        resourceType: dependency.resourceType,
                        sha256: dependency.sha256,
                        bytes: Buffer.from(dependency.bytes),
                        resolvedModelType: dependency.resolvedModelType,
                      })),
                  }
                : {}),
              x: addition.x,
              y: addition.y,
              z: addition.z,
              bearing: addition.bearing,
            }) as NewAreaObjectAddition;
          }
          if (
            addition.sourceKind === "store" &&
            addition.sourceProfileId === AREA_STORE_DYNAMIC_CONSTRUCTION_PROFILE.id
          ) {
            const resolved = await resolveDynamicStore(addition);
            return Object.freeze({
              kind: addition.sourceKind,
              localObjectId: addition.localObjectId,
              sourceProfileId: addition.sourceProfileId,
              sourceObjectKey: addition.sourceObjectKey,
              sourceSizeBytes: addition.sourceSizeBytes,
              templateResRef: resolved.resref,
              resRef: addition.resRef,
              tag: addition.tag,
              sourceSha256: addition.sourceSha256,
              blueprintBytes: Buffer.from(resolved.bytes),
              ...(resolved.dependencies.length > 0
                ? {
                    blueprintDependencies: resolved.dependencies.map((dependency) =>
                      Object.freeze({
                        templateResRef: dependency.templateResRef,
                        resourceType: dependency.resourceType,
                        sha256: dependency.sha256,
                        bytes: Buffer.from(dependency.bytes),
                        resolvedModelType: dependency.resolvedModelType,
                      })),
                  }
                : {}),
              x: addition.x,
              y: addition.y,
              z: addition.z,
              bearing: addition.bearing,
            }) as NewAreaObjectAddition;
          }
          if (
            addition.sourceKind === "placeable" &&
            addition.sourceProfileId === AREA_PLACEABLE_DYNAMIC_CONSTRUCTION_PROFILE.id
          ) {
            const resolved = await resolveDynamicPlaceable(addition);
            return Object.freeze({
              kind: addition.sourceKind,
              localObjectId: addition.localObjectId,
              sourceProfileId: addition.sourceProfileId,
              sourceObjectKey: addition.sourceObjectKey,
              templateResRef: resolved.resref,
              resRef: addition.resRef,
              tag: addition.tag,
              sourceSha256: addition.sourceSha256,
              resolvedPortraitId: resolved.portraitId,
              blueprintBytes: Buffer.from(resolved.bytes),
              ...(resolved.dependencies.length > 0
                ? {
                    blueprintDependencies: resolved.dependencies.map((dependency) => Object.freeze({
                      templateResRef: dependency.templateResRef,
                      resourceType: dependency.resourceType,
                      sha256: dependency.sha256,
                      bytes: Buffer.from(dependency.bytes),
                    })),
                  }
                : {}),
              x: addition.x,
              y: addition.y,
              z: addition.z,
              bearing: addition.bearing,
            }) as NewAreaObjectAddition;
          }
          const resolved = await resolveBlueprint({
            sourceKind: addition.sourceKind,
            sourceProfileId: addition.sourceProfileId,
            templateResRef: addition.templateId,
            expectedSha256: addition.sourceSha256,
          });
          return Object.freeze({
            kind: addition.sourceKind,
            localObjectId: addition.localObjectId,
            sourceProfileId: addition.sourceProfileId,
            templateResRef: addition.templateId,
            resRef: addition.resRef,
            tag: addition.tag,
            sourceSha256: addition.sourceSha256,
            blueprintBytes: Buffer.from(resolved.bytes),
            blueprintDependencies: resolved.dependencies?.map((dependency) => Object.freeze({
              templateResRef: dependency.templateResRef,
              resourceType: dependency.resourceType,
              sha256: dependency.sha256,
              bytes: Buffer.from(dependency.bytes),
            })),
            x: addition.x,
            y: addition.y,
            z: addition.z,
            bearing: addition.bearing,
            ...(addition.sourceKind === "door" ? { doorHook: addition.doorHook } : {}),
          }) as NewAreaObjectAddition;
        }));
        const propertyMutations: readonly ExistingAreaObjectPropertyMutation[] = await Promise.all(
          plan.propertyMutations.map(async (mutation) => {
            if (mutation.kind === "creature") {
              if (!mutation.inventory) return mutation;
              const entries = await Promise.all(mutation.inventory.entries.map(async (entry) => {
                if (!("itemSourceObjectKey" in entry)) return entry;
                const resolved = await resolveBlueprint({
                  sourceKind: "item",
                  sourceProfileId: entry.itemSourceObjectKey,
                  templateResRef: entry.itemResRef,
                  expectedSha256: entry.itemSourceFingerprint,
                });
                return Object.freeze({
                  ...entry,
                  blueprintBytes: Buffer.from(resolved.bytes),
                });
              }));
              return Object.freeze({
                ...mutation,
                inventory: Object.freeze({
                  expectedEntries: mutation.inventory.expectedEntries,
                  entries: Object.freeze(entries),
                }),
              });
            }
            if (mutation.kind === "item") {
              if (!mutation.inventory) return mutation;
              const entries = await Promise.all(mutation.inventory.entries.map(async (entry) => {
                if ("sourceIndex" in entry) return entry;
                const resolved = await resolveDynamicItem({
                  sourceProfileId: entry.itemSourceProfileId,
                  templateId: entry.itemTemplateId,
                  sourceObjectKey: entry.itemSourceObjectKey,
                  sourceSizeBytes: entry.itemSourceSizeBytes,
                  sourceSha256: entry.itemSourceFingerprint,
                  resRef: entry.itemResRef,
                  tag: entry.itemTag,
                });
                return Object.freeze({
                  ...entry,
                  blueprintBytes: Buffer.from(resolved.bytes),
                  resolvedModelType: resolved.modelType,
                  ...(resolved.dependencies.length > 0
                    ? {
                        blueprintDependencies: resolved.dependencies.map((dependency) =>
                          Object.freeze({
                            templateResRef: dependency.templateResRef,
                            resourceType: dependency.resourceType,
                            sha256: dependency.sha256,
                            bytes: Buffer.from(dependency.bytes),
                            resolvedModelType: dependency.resolvedModelType,
                          })
                        ),
                      }
                    : {}),
                });
              }));
              return Object.freeze({
                ...mutation,
                inventory: Object.freeze({
                  expectedEntries: mutation.inventory.expectedEntries,
                  entries: Object.freeze(entries),
                }),
              });
            }
            if (mutation.kind === "encounter") {
              if (!mutation.creatureList) return mutation;
              return Object.freeze({
                ...mutation,
                creatureList: await this.resolveEncounterCreatureListMutation(
                  mutation.creatureList,
                  resolvedEncounterCreatureBlueprints,
                ),
              });
            }
            if (
              mutation.kind === "store" || mutation.kind === "trigger" ||
              mutation.kind === "waypoint"
            ) return mutation;
            if (!mutation.inventory) return mutation;
            const entries = await Promise.all(mutation.inventory.entries.map(async (entry) => {
              if (!("itemSourceObjectKey" in entry)) return entry;
              const resolved = await resolveBlueprint({
                sourceKind: "item",
                sourceProfileId: entry.itemSourceObjectKey,
                templateResRef: entry.itemResRef,
                expectedSha256: entry.itemSourceFingerprint,
              });
              return Object.freeze({
                ...entry,
                blueprintBytes: Buffer.from(resolved.bytes),
              });
            }));
            return Object.freeze({
              ...mutation,
              inventory: Object.freeze({
                expectedEntries: mutation.inventory.expectedEntries,
                entries: Object.freeze(entries),
              }),
            });
          }),
        );
        const dynamicItemProfiles = await Promise.all(resolvedDynamicItems.values());
        const writeStartedAt = Date.now();
        let mutation;
        try {
          mutation = mutateExistingAreaObjectsInGitGic({
            sourceGit: git,
            sourceGic: gic,
            deletions: plan.deletions,
            transforms: plan.transforms,
            propertyMutations,
            doorTransitionMutations: plan.doorTransitionMutations,
            polygonMutations: plan.polygonMutations,
            soundIntervalVariationMutations: plan.soundIntervalVariationMutations,
            soundVolumeMutations: plan.soundVolumeMutations,
            soundScheduleMutations: plan.soundScheduleMutations,
            soundActiveMutations: plan.soundActiveMutations,
            soundPlayOrderMutations: plan.soundPlayOrderMutations,
            soundPlayStyleMutations: plan.soundPlayStyleMutations,
            soundPlaybackMutations: plan.soundPlaybackMutations,
            soundProfileMutations: plan.soundProfileMutations,
            additions,
          });
        } catch (error) {
          this.emitStoreCommerceTelemetryBatch(storeCommerceTelemetryProfiles, {
            operation: "write",
            outcome: "failed",
            resultCode: "pair_write_or_readback_rejected",
            durationMs: elapsedMilliseconds(writeStartedAt),
          });
          this.emitStoreScriptResRefsTelemetryBatch(storeScriptResRefsTelemetryProfiles, {
            operation: "write",
            outcome: "failed",
            resultCode: "pair_write_or_readback_rejected",
            durationMs: elapsedMilliseconds(writeStartedAt),
          });
          this.emitTriggerScriptResRefsTelemetryBatch(triggerScriptResRefsTelemetryProfiles, {
            operation: "write",
            outcome: "failed",
            resultCode: "pair_write_or_readback_rejected",
            durationMs: elapsedMilliseconds(writeStartedAt),
          });
          this.emitTriggerTransitionStorageTelemetryBatch(
            triggerTransitionStorageTelemetryProfiles,
            {
              operation: "write",
              outcome: "failed",
              resultCode: "pair_write_or_readback_rejected",
              durationMs: elapsedMilliseconds(writeStartedAt),
            },
          );
          this.emitTriggerCorePropertiesTelemetryBatch(triggerCorePropertiesTelemetryProfiles, {
            operation: "write",
            outcome: "failed",
            resultCode: "pair_write_or_readback_rejected",
            durationMs: elapsedMilliseconds(writeStartedAt),
          });
          this.emitTriggerTrapPropertiesTelemetryBatch(triggerTrapPropertiesTelemetryProfiles, {
            operation: "write",
            outcome: "failed",
            resultCode: "pair_write_or_readback_rejected",
            durationMs: elapsedMilliseconds(writeStartedAt),
          });
          this.emitTriggerVariableTableTelemetryBatch(triggerVariableTableTelemetryProfiles, {
            operation: "write",
            outcome: "failed",
            resultCode: "pair_write_or_readback_rejected",
            durationMs: elapsedMilliseconds(writeStartedAt),
          });
          this.emitStoreVariableTableTelemetryBatch(storeVariableTableTelemetryProfiles, {
            operation: "write",
            outcome: "failed",
            resultCode: "pair_write_or_readback_rejected",
            durationMs: elapsedMilliseconds(writeStartedAt),
          });
          this.emitStoreRestrictionsTelemetryBatch(storeRestrictionsTelemetryProfiles, {
            operation: "write",
            outcome: "failed",
            resultCode: "pair_write_or_readback_rejected",
            durationMs: elapsedMilliseconds(writeStartedAt),
          });
          this.emitStoreInventoryTelemetryBatch(storeInventoryTelemetryProfiles, {
            operation: "write",
            outcome: "failed",
            resultCode: "pair_write_or_readback_rejected",
            durationMs: elapsedMilliseconds(writeStartedAt),
          });
          for (const profile of dynamicItemProfiles) {
            this.emitDynamicItemTelemetry({
              operation: "admit_profile",
              outcome: "failed",
              resultCode: "profile_or_pair_rejected",
              ...dynamicItemTelemetryProfile(profile),
              durationMs: elapsedMilliseconds(writeStartedAt),
            });
          }
          throw error;
        }
        this.emitStoreCommerceTelemetryBatch(storeCommerceTelemetryProfiles, {
          operation: "write",
          outcome: "succeeded",
          resultCode: "git_vector_written",
          durationMs: elapsedMilliseconds(writeStartedAt),
        });
        this.emitStoreScriptResRefsTelemetryBatch(storeScriptResRefsTelemetryProfiles, {
          operation: "write",
          outcome: "succeeded",
          resultCode: "git_vector_written",
          durationMs: elapsedMilliseconds(writeStartedAt),
        });
        this.emitTriggerScriptResRefsTelemetryBatch(triggerScriptResRefsTelemetryProfiles, {
          operation: "write",
          outcome: "succeeded",
          resultCode: "git_tuple_written",
          durationMs: elapsedMilliseconds(writeStartedAt),
        });
        this.emitTriggerTransitionStorageTelemetryBatch(
          triggerTransitionStorageTelemetryProfiles,
          {
            operation: "write",
            outcome: "succeeded",
            resultCode: "git_tuple_written",
            durationMs: elapsedMilliseconds(writeStartedAt),
          },
        );
        this.emitTriggerCorePropertiesTelemetryBatch(triggerCorePropertiesTelemetryProfiles, {
          operation: "write",
          outcome: "succeeded",
          resultCode: "git_tuple_written",
          durationMs: elapsedMilliseconds(writeStartedAt),
        });
        this.emitTriggerTrapPropertiesTelemetryBatch(triggerTrapPropertiesTelemetryProfiles, {
          operation: "write",
          outcome: "succeeded",
          resultCode: "git_tuple_written",
          durationMs: elapsedMilliseconds(writeStartedAt),
        });
        this.emitTriggerVariableTableTelemetryBatch(triggerVariableTableTelemetryProfiles, {
          operation: "write",
          outcome: "succeeded",
          resultCode: "git_vector_written",
          durationMs: elapsedMilliseconds(writeStartedAt),
        });
        this.emitStoreVariableTableTelemetryBatch(storeVariableTableTelemetryProfiles, {
          operation: "write",
          outcome: "succeeded",
          resultCode: "git_vector_written",
          durationMs: elapsedMilliseconds(writeStartedAt),
        });
        this.emitStoreRestrictionsTelemetryBatch(storeRestrictionsTelemetryProfiles, {
          operation: "write",
          outcome: "succeeded",
          resultCode: "git_pair_written",
          durationMs: elapsedMilliseconds(writeStartedAt),
        });
        this.emitStoreInventoryTelemetryBatch(storeInventoryTelemetryProfiles, {
          operation: "write",
          outcome: "succeeded",
          resultCode: "git_inventory_written",
          durationMs: elapsedMilliseconds(writeStartedAt),
        });
        this.emitStoreCommerceTelemetryBatch(storeCommerceTelemetryProfiles, {
          operation: "readback",
          outcome: "succeeded",
          resultCode: "candidate_vector_verified",
          durationMs: elapsedMilliseconds(writeStartedAt),
        });
        this.emitStoreScriptResRefsTelemetryBatch(storeScriptResRefsTelemetryProfiles, {
          operation: "readback",
          outcome: "succeeded",
          resultCode: "candidate_vector_verified",
          durationMs: elapsedMilliseconds(writeStartedAt),
        });
        this.emitTriggerScriptResRefsTelemetryBatch(triggerScriptResRefsTelemetryProfiles, {
          operation: "readback",
          outcome: "succeeded",
          resultCode: "candidate_tuple_verified",
          durationMs: elapsedMilliseconds(writeStartedAt),
        });
        this.emitTriggerTransitionStorageTelemetryBatch(
          triggerTransitionStorageTelemetryProfiles,
          {
            operation: "readback",
            outcome: "succeeded",
            resultCode: "candidate_tuple_verified",
            durationMs: elapsedMilliseconds(writeStartedAt),
          },
        );
        this.emitTriggerCorePropertiesTelemetryBatch(triggerCorePropertiesTelemetryProfiles, {
          operation: "readback",
          outcome: "succeeded",
          resultCode: "candidate_tuple_verified",
          durationMs: elapsedMilliseconds(writeStartedAt),
        });
        this.emitTriggerTrapPropertiesTelemetryBatch(triggerTrapPropertiesTelemetryProfiles, {
          operation: "readback",
          outcome: "succeeded",
          resultCode: "candidate_tuple_verified",
          durationMs: elapsedMilliseconds(writeStartedAt),
        });
        this.emitTriggerVariableTableTelemetryBatch(triggerVariableTableTelemetryProfiles, {
          operation: "readback",
          outcome: "succeeded",
          resultCode: "candidate_vector_verified",
          durationMs: elapsedMilliseconds(writeStartedAt),
        });
        this.emitStoreVariableTableTelemetryBatch(storeVariableTableTelemetryProfiles, {
          operation: "readback",
          outcome: "succeeded",
          resultCode: "candidate_vector_verified",
          durationMs: elapsedMilliseconds(writeStartedAt),
        });
        this.emitStoreRestrictionsTelemetryBatch(storeRestrictionsTelemetryProfiles, {
          operation: "readback",
          outcome: "succeeded",
          resultCode: "candidate_pair_verified",
          durationMs: elapsedMilliseconds(writeStartedAt),
        });
        this.emitStoreInventoryTelemetryBatch(storeInventoryTelemetryProfiles, {
          operation: "readback",
          outcome: "succeeded",
          resultCode: "candidate_inventory_verified",
          durationMs: elapsedMilliseconds(writeStartedAt),
        });
        for (const profile of dynamicItemProfiles) {
          const telemetryProfile = dynamicItemTelemetryProfile(profile);
          this.emitDynamicItemTelemetry({
            operation: "admit_profile",
            outcome: "succeeded",
            resultCode: "profile_admitted",
            ...telemetryProfile,
            durationMs: elapsedMilliseconds(writeStartedAt),
          });
          this.emitDynamicItemTelemetry({
            operation: "write",
            outcome: "succeeded",
            resultCode: "pair_written",
            ...telemetryProfile,
            durationMs: elapsedMilliseconds(writeStartedAt),
          });
          this.emitDynamicItemTelemetry({
            operation: "readback",
            outcome: "succeeded",
            resultCode: "readback_verified",
            ...telemetryProfile,
            durationMs: elapsedMilliseconds(writeStartedAt),
          });
        }
        candidateGitBytes = mutation.gitBytes;
        candidateGicBytes = mutation.gicBytes;
        objectMutation = Object.freeze({
          sourceGitSha256: descriptors.git.sha256,
          sourceGicSha256: descriptors.gic.sha256,
          candidateGitSha256: sha256Hex(candidateGitBytes),
          candidateGicSha256: sha256Hex(candidateGicBytes),
          sourceCounts: Object.freeze({ ...mutation.source.counts }),
          candidateCounts: Object.freeze({ ...mutation.candidate.counts }),
          deletedCounts: Object.freeze({ ...mutation.deletedCounts }),
          transformedCounts: Object.freeze({ ...mutation.transformedCounts }),
          propertyUpdatedCounts: Object.freeze({ ...mutation.propertyUpdatedCounts }),
          polygonUpdatedCounts: Object.freeze({ ...mutation.polygonUpdatedCounts }),
          soundIntervalVariationUpdatedCounts: Object.freeze({
            ...mutation.soundIntervalVariationUpdatedCounts,
          }),
          soundVolumeUpdatedCounts: Object.freeze({ ...mutation.soundVolumeUpdatedCounts }),
          soundScheduleUpdatedCounts: Object.freeze({ ...mutation.soundScheduleUpdatedCounts }),
          soundActiveUpdatedCounts: Object.freeze({ ...mutation.soundActiveUpdatedCounts }),
          soundPlayOrderUpdatedCounts: Object.freeze({
            ...mutation.soundPlayOrderUpdatedCounts,
          }),
          soundPlayStyleUpdatedCounts: Object.freeze({
            ...mutation.soundPlayStyleUpdatedCounts,
          }),
          soundPlaybackUpdatedCounts: Object.freeze({
            ...mutation.soundPlaybackUpdatedCounts,
          }),
          soundProfileUpdatedCounts: Object.freeze({
            ...mutation.soundProfileUpdatedCounts,
          }),
          addedCounts: Object.freeze({ ...mutation.addedCounts }),
          totalDeleted: plan.deletions.length,
          totalTransformed: plan.transforms.length,
          totalPropertyUpdated:
            plan.propertyMutations.length + plan.doorTransitionMutations.length,
          totalPolygonUpdated: plan.polygonMutations.length,
          totalSoundIntervalVariationUpdated: plan.soundIntervalVariationMutations.length,
          totalSoundVolumeUpdated: plan.soundVolumeMutations.length,
          totalSoundScheduleUpdated: plan.soundScheduleMutations.length,
          totalSoundActiveUpdated: plan.soundActiveMutations.length,
          totalSoundPlayOrderUpdated: plan.soundPlayOrderMutations.length,
          totalSoundPlayStyleUpdated: plan.soundPlayStyleMutations.length,
          totalSoundPlaybackUpdated: plan.soundPlaybackMutations.length,
          totalSoundProfileUpdated: plan.soundProfileMutations.length,
          totalAdded: additions.length,
          blueprintSources: aggregateBlueprintSources(
            additions,
            propertyMutations,
          ),
        });
      } catch (error) {
        throw mapObjectMutationError(error);
      }
    }

    let audioEnvironmentMutation: AreaUpdateCompiledCandidate["audioEnvironmentMutation"];
    if (projected.audioEnvironment) {
      if (projected.audioEnvironment.sourceGitSha256 !== descriptors.git.sha256) {
        throw compilerError(
          "AREA_UPDATE_SOURCE_STALE",
          409,
          "The source GIT changed after the Area audio draft was opened.",
          [
            `expected=${projected.audioEnvironment.sourceGitSha256}`,
            `actual=${descriptors.git.sha256}`,
          ],
        );
      }
      try {
        candidateGitBytes = updateGitAreaAudioEnvironment(
          candidateGitBytes,
          projected.audioEnvironment,
        ).bytes;
      } catch (error) {
        throw compilerError(
          "AREA_UPDATE_CANDIDATE_INVALID",
          422,
          "The Area audio-environment candidate is invalid.",
          [errorMessage(error)],
        );
      }
      const candidateGitSha256 = sha256Hex(candidateGitBytes);
      audioEnvironmentMutation = Object.freeze({
        expectedValue: projected.audioEnvironment.expectedValue,
        value: projected.audioEnvironment.value,
        sourceGitSha256: descriptors.git.sha256,
        candidateGitSha256,
      });
      if (objectMutation) {
        objectMutation = Object.freeze({
          ...objectMutation,
          candidateGitSha256,
        });
      }
    }

    let variableMutation: AreaUpdateCompiledCandidate["variableMutation"];
    if (projected.variables) {
      if (projected.variables.sourceGitSha256 !== descriptors.git.sha256) {
        throw compilerError(
          "AREA_UPDATE_SOURCE_STALE",
          409,
          "The source GIT changed after the Area variable draft was opened.",
          [
            `expected=${projected.variables.sourceGitSha256}`,
            `actual=${descriptors.git.sha256}`,
          ],
        );
      }
      try {
        candidateGitBytes = updateGitAreaVariables(
          candidateGitBytes,
          projected.variables,
          git,
        ).bytes;
      } catch (error) {
        throw compilerError(
          "AREA_UPDATE_CANDIDATE_INVALID",
          422,
          "The Area variable-table candidate is invalid.",
          [errorMessage(error)],
        );
      }
      const candidateGitSha256 = sha256Hex(candidateGitBytes);
      variableMutation = Object.freeze({
        expectedEntries: Object.freeze(projected.variables.expectedEntries.map(
          (entry) => Object.freeze({ ...entry }),
        )),
        entries: Object.freeze(projected.variables.entries.map(
          (entry) => Object.freeze({ ...entry }),
        )),
        sourceGitSha256: descriptors.git.sha256,
        candidateGitSha256,
      });
      if (objectMutation) {
        objectMutation = Object.freeze({
          ...objectMutation,
          candidateGitSha256,
        });
      }
      if (audioEnvironmentMutation) {
        audioEnvironmentMutation = Object.freeze({
          ...audioEnvironmentMutation,
          candidateGitSha256,
        });
      }
    }

    let exported;
    try {
      exported = await this.dependencies.areaEditing.exportAre({
        ...projected,
        tiles: projected.tiles.map((tile) => ({ ...tile })),
      });
    } catch (error) {
      throw mapWriterError(error);
    }
    if (
      exported.fileName.toLowerCase() !== `${command.areaResRef}.are` ||
      exported.size !== exported.bytes.length
    ) {
      throw compilerError(
        "AREA_UPDATE_CANDIDATE_INVALID",
        422,
        "The ARE writer returned inconsistent candidate metadata.",
      );
    }
    if (
      Boolean(projected.visualEnvironmentCatalogSelection)
      !== Boolean(exported.visualEnvironmentCatalogSelection)
    ) {
      throw compilerError(
        "AREA_UPDATE_CANDIDATE_INVALID",
        422,
        "The ARE writer returned inconsistent visual-selection metadata.",
      );
    }
    const candidateValidation = validateAreaUpdateCandidate(
      projected,
      exported.bytes,
      are,
      exported.visualEnvironmentCatalogSelection,
    );
    if (!candidateValidation.valid) {
      throw compilerError(
        "AREA_UPDATE_CANDIDATE_INVALID",
        422,
        "The compiled ARE candidate failed independent validation.",
        candidateValidation.issues.map(
          (issue) => `${issue.code}:${issue.path}:${issue.message}`,
        ),
      );
    }

    const areCandidate = resource(
      descriptors.are,
      "are",
      Buffer.from(exported.bytes),
    );
    const gitCandidate = resource(descriptors.git, "git", candidateGitBytes);
    const gicCandidate = resource(descriptors.gic, "gic", candidateGicBytes);
    const candidateAreaSha256 = areCandidate.sha256;
    return Object.freeze({
      areaId: command.areaResRef,
      sourceAreaSha256: descriptors.are.sha256,
      candidateAreaSha256,
      setFingerprintSha256: projected.tilesetFingerprint,
      projectedDraft: projected,
      ...(exported.visualEnvironmentCatalogSelection
        ? {
            visualEnvironmentCatalogSelectionMutation:
              exported.visualEnvironmentCatalogSelection,
          }
        : {}),
      ...(objectMutation ? { objectMutation } : {}),
      ...(!objectMutation && !audioEnvironmentMutation && !variableMutation
        ? {
            unchangedCompanions: Object.freeze({
              gitSha256: descriptors.git.sha256,
              gicSha256: descriptors.gic.sha256,
              moduleIfoSha256: descriptors.ifo.sha256,
            }),
          }
        : {}),
      ...(moduleStartLocationMutation ? { moduleStartLocationMutation } : {}),
      ...(audioEnvironmentMutation ? { audioEnvironmentMutation } : {}),
      ...(variableMutation ? { variableMutation } : {}),
      resources: Object.freeze([areCandidate, gitCandidate, gicCandidate]),
      moduleIfo: Object.freeze({
        key: descriptors.ifo.logicalKey,
        fileName: descriptors.ifo.logicalKey,
        resourceType: descriptors.ifo.resourceType,
        baselineBytes: Buffer.from(ifo),
        baselineSha256: descriptors.ifo.sha256,
        candidateBytes: Buffer.from(candidateIfoBytes),
        candidateSha256: sha256Hex(candidateIfoBytes),
      }),
    });
  }

  private async resolveEncounterCreatureListMutation(
    mutation: ExistingAreaEncounterCreatureListMutation,
    resolvedBlueprints: Map<string, Promise<EncounterCreatureBlueprintResolution>>,
  ): Promise<ExistingAreaEncounterCreatureListResolvedMutation> {
    const entries = await Promise.all(mutation.entries.map(async (entry, targetIndex) => {
      if ("singleSpawnByte" in entry) {
        return Object.freeze({
          sourceIndex: targetIndex,
          appearance: entry.appearance,
          challengeRating: entry.challengeRating,
          resRef: entry.resRef,
          singleSpawnByte: entry.singleSpawnByte,
        });
      }
      if (entry.entryKind === "retained") {
        const source = mutation.expectedEntries[entry.sourceIndex];
        if (!source) {
          throw compilerError(
            "AREA_UPDATE_OBJECT_MUTATION_INVALID",
            422,
            "Encounter CreatureList retained source identity is invalid.",
          );
        }
        return Object.freeze({
          sourceIndex: targetIndex,
          appearance: source.appearance,
          challengeRating: source.challengeRating,
          resRef: source.resRef,
          singleSpawnByte: entry.singleSpawn ? 1 as const : 0 as const,
        });
      }

      const cacheKey = [
        entry.templateId,
        entry.sourceObjectKey,
        entry.sourceSha256,
        entry.sourceSizeBytes,
      ].join("|");
      let resolution = resolvedBlueprints.get(cacheKey);
      if (!resolution) {
        resolution = this.resolveEncounterCreatureBlueprint(entry);
        resolvedBlueprints.set(cacheKey, resolution);
      }
      const resolved = await resolution;
      return Object.freeze({
        sourceIndex: targetIndex,
        appearance: resolved.appearance,
        challengeRating: resolved.challengeRating,
        resRef: resolved.resRef,
        singleSpawnByte: entry.singleSpawn ? 1 as const : 0 as const,
      });
    }));

    try {
      return parseAreaEncounterCreatureListResolvedMutation({
        expectedEntries: mutation.expectedEntries,
        entries,
      });
    } catch (error) {
      throw compilerError(
        "AREA_UPDATE_OBJECT_MUTATION_INVALID",
        422,
        "The resolved Encounter CreatureList mutation is invalid.",
        [errorMessage(error)],
      );
    }
  }

  private async resolveEncounterCreatureBlueprint(
    entry: AreaEncounterCreatureListBlueprintTargetEntry,
  ): Promise<EncounterCreatureBlueprintResolution> {
    if (entry.sourceProfileId !== AREA_ENCOUNTER_CREATURE_LIST_BLUEPRINT_PROFILE_ID) {
      throw compilerError(
        "AREA_UPDATE_OBJECT_MUTATION_INVALID",
        422,
        "Encounter CreatureList blueprint provenance is invalid.",
      );
    }
    const resolveBlueprint = this.dependencies.appearanceCatalog.resolveEffectiveTemplateBlueprint;
    if (!resolveBlueprint) {
      throw compilerError(
        "AREA_UPDATE_STORAGE_UNAVAILABLE",
        503,
        "The effective creature blueprint catalog is unavailable.",
      );
    }
    let resolved;
    try {
      resolved = await resolveBlueprint.call(this.dependencies.appearanceCatalog, {
        kind: "creature",
        templateId: entry.templateId,
        sourceObjectKey: entry.sourceObjectKey,
        expectedSha256: entry.sourceSha256,
      });
    } catch {
      throw compilerError(
        "AREA_UPDATE_STORAGE_UNAVAILABLE",
        503,
        "The effective creature blueprint could not be resolved.",
      );
    }
    if (!resolved || resolved.kind !== "creature"
      || resolved.templateId !== entry.templateId
      || resolved.resref !== entry.resRef
      || resolved.sourceObjectKey !== entry.sourceObjectKey
      || resolved.sha256 !== entry.sourceSha256) {
      throw compilerError(
        "AREA_UPDATE_SOURCE_STALE",
        409,
        "The effective creature blueprint changed after the draft was created.",
      );
    }
    if (!Buffer.isBuffer(resolved.bytes) || resolved.bytes.length < 1
      || resolved.bytes.length !== entry.sourceSizeBytes
      || resolved.bytes.length > MAX_AREA_ENCOUNTER_CREATURE_LIST_BLUEPRINT_BYTES
      || sha256Hex(resolved.bytes) !== entry.sourceSha256
      || (resolved.dependencies !== undefined && !Array.isArray(resolved.dependencies))) {
      throw compilerError(
        "AREA_UPDATE_OBJECT_MUTATION_INVALID",
        422,
        "The effective creature blueprint payload is invalid.",
      );
    }

    const document = parseRawGffDocument(resolved.bytes);
    if (!document || document.fileType !== "UTC " || document.fileVersion !== "V3.2"
      || document.rootStructTypeId !== 0xffff_ffff) {
      throw compilerError(
        "AREA_UPDATE_OBJECT_MUTATION_INVALID",
        422,
        "The effective creature blueprint has an unsupported GFF identity.",
      );
    }
    const templateFields = document.fields.filter((field) => field.label === "TemplateResRef");
    const appearanceFields = document.fields.filter((field) => field.label === "Appearance_Type");
    const challengeRatingFields = document.fields.filter(
      (field) => field.label === "ChallengeRating",
    );
    const templateField = templateFields[0];
    const appearanceField = appearanceFields[0];
    const challengeRatingField = challengeRatingFields[0];
    if (templateFields.length !== 1 || templateField?.type !== "resref"
      || templateField.value !== entry.resRef
      || appearanceFields.length !== 1 || appearanceField?.type !== "word"
      || !Number.isSafeInteger(appearanceField.value)
      || appearanceField.value < 0 || appearanceField.value > 0xffff
      || appearanceField.value !== entry.appearance
      || challengeRatingFields.length !== 1 || challengeRatingField?.type !== "float"
      || !Number.isFinite(challengeRatingField.value)
      || !Object.is(Math.fround(challengeRatingField.value), challengeRatingField.value)
      || !Object.is(challengeRatingField.value, entry.challengeRating)) {
      throw compilerError(
        "AREA_UPDATE_OBJECT_MUTATION_INVALID",
        422,
        "The effective creature blueprint tuple differs from the retained draft binding.",
      );
    }
    return Object.freeze({
      appearance: appearanceField.value,
      challengeRating: challengeRatingField.value,
      resRef: templateField.value,
    });
  }

  private async resolveDynamicPlaceableBlueprint(
    addition: Extract<ProjectedNewAreaObject, { sourceKind: "placeable" }>,
    sourceObjectKey: string,
  ): Promise<Readonly<{
    bytes: Buffer;
    resref: string;
    portraitId: number;
    dependencies: readonly Readonly<{
      templateResRef: string;
      resourceType: number;
      sha256: string;
      bytes: Buffer;
    }>[];
  }>> {
    const resolveBlueprint = this.dependencies.appearanceCatalog.resolveEffectiveTemplateBlueprint;
    if (!resolveBlueprint) {
      throw compilerError(
        "AREA_UPDATE_STORAGE_UNAVAILABLE",
        503,
        "The effective Placeable blueprint catalog is unavailable.",
      );
    }
    let resolved;
    try {
      resolved = await resolveBlueprint.call(this.dependencies.appearanceCatalog, {
        kind: "placeable",
        templateId: addition.templateId,
        sourceObjectKey,
        expectedSha256: addition.sourceSha256,
      });
    } catch {
      throw compilerError(
        "AREA_UPDATE_STORAGE_UNAVAILABLE",
        503,
        "The effective Placeable blueprint could not be resolved.",
      );
    }
    if (!resolved || resolved.kind !== "placeable" ||
      resolved.templateId !== addition.templateId ||
      resolved.resref !== addition.resRef ||
      resolved.sourceObjectKey !== sourceObjectKey ||
      resolved.sha256 !== addition.sourceSha256) {
      throw compilerError(
        "AREA_UPDATE_SOURCE_STALE",
        409,
        "The effective Placeable blueprint changed after the draft was created.",
      );
    }
    if (!Buffer.isBuffer(resolved.bytes) || resolved.bytes.length < 1 ||
      resolved.bytes.length > AREA_PLACEABLE_DYNAMIC_CONSTRUCTION_PROFILE.maxSourceBytes) {
      throw compilerError(
        "AREA_UPDATE_OBJECT_MUTATION_INVALID",
        422,
        "The effective Placeable blueprint payload is invalid.",
      );
    }
    const portraitId = await this.resolveDynamicPlaceablePortraitId(resolved.bytes);
    const sourceDependencies = resolved.dependencies ?? [];
    if (!Array.isArray(sourceDependencies) || sourceDependencies.length > 2) {
      throw compilerError(
        "AREA_UPDATE_OBJECT_MUTATION_INVALID",
        422,
        "The effective Placeable blueprint dependency set is invalid.",
      );
    }
    const dependencies = sourceDependencies.map((dependency, dependencyIndex) => {
      if (!dependency || typeof dependency.templateResRef !== "string" ||
        !/^[a-z0-9_]{1,16}$/u.test(dependency.templateResRef) ||
        dependency.resourceType !== 2025 || typeof dependency.sha256 !== "string" ||
        !/^[a-f0-9]{64}$/u.test(dependency.sha256) || !Buffer.isBuffer(dependency.bytes) ||
        dependency.bytes.length < 1 ||
        dependency.bytes.length > AREA_PLACEABLE_DYNAMIC_CONSTRUCTION_PROFILE.maxSourceBytes ||
        sha256Hex(dependency.bytes) !== dependency.sha256) {
        throw compilerError(
          "AREA_UPDATE_OBJECT_MUTATION_INVALID",
          422,
          "The effective Placeable blueprint dependency is invalid.",
          [`dependency=${dependencyIndex}`],
        );
      }
      return Object.freeze({
        templateResRef: dependency.templateResRef,
        resourceType: dependency.resourceType,
        sha256: dependency.sha256,
        bytes: Buffer.from(dependency.bytes),
      });
    });
    return Object.freeze({
      bytes: Buffer.from(resolved.bytes),
      resref: resolved.resref,
      portraitId,
      dependencies: Object.freeze(dependencies),
    });
  }

  private async resolveDynamicItemBlueprint(
    addition: DynamicItemBlueprintDraftIdentity,
    sourceObjectKey: string,
    sourceSizeBytes: number,
  ): Promise<DynamicItemBlueprintResolution> {
    const resolveStartedAt = Date.now();
    const resolveBlueprint = this.dependencies.appearanceCatalog.resolveEffectiveTemplateBlueprint;
    if (!resolveBlueprint) {
      this.emitDynamicItemTelemetry({
        operation: "resolve_blueprint",
        outcome: "failed",
        resultCode: "catalog_unavailable",
        durationMs: elapsedMilliseconds(resolveStartedAt),
      });
      throw compilerError(
        "AREA_UPDATE_STORAGE_UNAVAILABLE",
        503,
        "The effective Item blueprint catalog is unavailable.",
      );
    }
    let resolved;
    try {
      resolved = await resolveBlueprint.call(this.dependencies.appearanceCatalog, {
        kind: "item",
        templateId: addition.templateId,
        sourceObjectKey,
        expectedSha256: addition.sourceSha256,
      });
    } catch {
      this.emitDynamicItemTelemetry({
        operation: "resolve_blueprint",
        outcome: "failed",
        resultCode: "catalog_unavailable",
        durationMs: elapsedMilliseconds(resolveStartedAt),
      });
      throw compilerError(
        "AREA_UPDATE_STORAGE_UNAVAILABLE",
        503,
        "The effective Item blueprint could not be resolved.",
      );
    }
    if (!resolved) {
      this.emitDynamicItemTelemetry({
        operation: "resolve_blueprint",
        outcome: "failed",
        resultCode: "effective_winner_missing",
        durationMs: elapsedMilliseconds(resolveStartedAt),
      });
      throw compilerError(
        "AREA_UPDATE_SOURCE_STALE",
        409,
        "The effective Item blueprint changed after the draft was created.",
      );
    }
    this.emitDynamicItemTelemetry({
      operation: "resolve_blueprint",
      outcome: "succeeded",
      resultCode: "effective_winner_resolved",
      durationMs: elapsedMilliseconds(resolveStartedAt),
    });
    const identityStartedAt = Date.now();
    if (resolved.kind !== "item" ||
      resolved.templateId !== addition.templateId ||
      resolved.resref !== addition.resRef ||
      resolved.sourceObjectKey !== sourceObjectKey ||
      resolved.sha256 !== addition.sourceSha256) {
      this.emitDynamicItemTelemetry({
        operation: "validate_identity",
        outcome: "failed",
        resultCode: "source_identity_stale",
        durationMs: elapsedMilliseconds(identityStartedAt),
      });
      throw compilerError(
        "AREA_UPDATE_SOURCE_STALE",
        409,
        "The effective Item blueprint changed after the draft was created.",
      );
    }
    if (!Buffer.isBuffer(resolved.bytes) || resolved.bytes.length < 1 ||
      resolved.bytes.length !== sourceSizeBytes ||
      resolved.bytes.length > AREA_ITEM_DYNAMIC_CONSTRUCTION_PROFILE.maxSourceBytes ||
      sha256Hex(resolved.bytes) !== addition.sourceSha256 ||
      (resolved.dependencies !== undefined && !Array.isArray(resolved.dependencies))) {
      this.emitDynamicItemTelemetry({
        operation: "validate_identity",
        outcome: "failed",
        resultCode: "payload_or_dependencies_invalid",
        durationMs: elapsedMilliseconds(identityStartedAt),
      });
      throw compilerError(
        "AREA_UPDATE_OBJECT_MUTATION_INVALID",
        422,
        "The effective Item blueprint payload or dependency set is invalid.",
      );
    }
    const dependencies = resolved.dependencies ?? [];
    if (dependencies.length > AREA_ITEM_DYNAMIC_CONSTRUCTION_PROFILE.maxUniqueDependencies) {
      this.emitDynamicItemTelemetry({
        operation: "validate_identity",
        outcome: "failed",
        resultCode: "dependency_count_exceeded",
        durationMs: elapsedMilliseconds(identityStartedAt),
      });
      throw compilerError(
        "AREA_UPDATE_OBJECT_MUTATION_INVALID",
        422,
        "The effective Item dependency count exceeds the admitted profile.",
      );
    }
    const dependencyBaseItems = new Map<string, number>();
    let dependencyBytes = 0;
    for (const dependency of dependencies) {
      dependencyBytes += Buffer.isBuffer(dependency.bytes) ? dependency.bytes.length : 0;
      const baseItemValue = parseDynamicItemDependencyBaseItem(dependency);
      if (baseItemValue === null || dependencyBaseItems.has(dependency.templateResRef) ||
        dependencyBytes > AREA_ITEM_DYNAMIC_CONSTRUCTION_PROFILE.maxDependencyBytes) {
        this.emitDynamicItemTelemetry({
          operation: "validate_identity",
          outcome: "failed",
          resultCode: "dependency_identity_invalid",
          durationMs: elapsedMilliseconds(identityStartedAt),
        });
        throw compilerError(
          "AREA_UPDATE_OBJECT_MUTATION_INVALID",
          422,
          "The effective Item dependency closure is invalid.",
        );
      }
      dependencyBaseItems.set(dependency.templateResRef, baseItemValue);
    }
    this.emitDynamicItemTelemetry({
      operation: "validate_identity",
      outcome: "succeeded",
      resultCode: "source_identity_valid",
      durationMs: elapsedMilliseconds(identityStartedAt),
    });
    const parseStartedAt = Date.now();
    const document = parseRawGffDocument(resolved.bytes);
    const profile = AREA_ITEM_DYNAMIC_CONSTRUCTION_PROFILE;
    if (!document || document.fileType !== profile.fileType ||
      document.fileVersion !== profile.fileVersion ||
      document.rootStructTypeId !== profile.rootStructTypeId) {
      this.emitDynamicItemTelemetry({
        operation: "parse_source",
        outcome: "failed",
        resultCode: "gff_identity_invalid",
        durationMs: elapsedMilliseconds(parseStartedAt),
      });
      throw compilerError(
        "AREA_UPDATE_OBJECT_MUTATION_INVALID",
        422,
        "The effective Item blueprint has an unsupported GFF identity.",
      );
    }
    const baseItems = document.fields.filter((field) => field.label === "BaseItem");
    const baseItem = baseItems[0];
    if (baseItems.length !== 1 || baseItem?.type !== "int" ||
      !Number.isSafeInteger(baseItem.value) || baseItem.value < 0) {
      this.emitDynamicItemTelemetry({
        operation: "parse_source",
        outcome: "failed",
        resultCode: "base_item_identity_invalid",
        durationMs: elapsedMilliseconds(parseStartedAt),
      });
      throw compilerError(
        "AREA_UPDATE_OBJECT_MUTATION_INVALID",
        422,
        "The effective Item blueprint BaseItem identity is invalid.",
      );
    }
    const propertyCount = listEntryCount(document.fields, "PropertiesList");
    const variableCount = listEntryCount(document.fields, "VarTable");
    const nestedInventoryState = dynamicItemNestedInventoryState(document.fields);
    this.emitDynamicItemTelemetry({
      operation: "parse_source",
      outcome: "succeeded",
      resultCode: "source_parsed",
      propertyCount,
      variableCount,
      nestedInventoryState,
      durationMs: elapsedMilliseconds(parseStartedAt),
    });
    const baseItemsStartedAt = Date.now();
    const resolveTable = this.dependencies.appearanceCatalog.resolveEffectiveItemBaseItemsTwoDaTable;
    if (!resolveTable) {
      this.emitDynamicItemTelemetry({
        operation: "resolve_baseitems",
        outcome: "failed",
        resultCode: "catalog_unavailable",
        propertyCount,
        variableCount,
        nestedInventoryState,
        durationMs: elapsedMilliseconds(baseItemsStartedAt),
      });
      throw compilerError(
        "AREA_UPDATE_STORAGE_UNAVAILABLE",
        503,
        "The authoritative baseitems.2da catalog is unavailable.",
      );
    }
    let table;
    try {
      table = await resolveTable.call(this.dependencies.appearanceCatalog);
    } catch {
      this.emitDynamicItemTelemetry({
        operation: "resolve_baseitems",
        outcome: "failed",
        resultCode: "catalog_unavailable",
        propertyCount,
        variableCount,
        nestedInventoryState,
        durationMs: elapsedMilliseconds(baseItemsStartedAt),
      });
      throw compilerError(
        "AREA_UPDATE_STORAGE_UNAVAILABLE",
        503,
        "The authoritative baseitems.2da catalog could not be resolved.",
      );
    }
    if (!table) {
      this.emitDynamicItemTelemetry({
        operation: "resolve_baseitems",
        outcome: "failed",
        resultCode: "effective_table_missing",
        propertyCount,
        variableCount,
        nestedInventoryState,
        durationMs: elapsedMilliseconds(baseItemsStartedAt),
      });
      throw compilerError(
        "AREA_UPDATE_SOURCE_STALE",
        409,
        "The effective baseitems.2da source is no longer available.",
      );
    }
    if (!isExactEffectiveItemBaseItemsTwoDaTable(table)) {
      this.emitDynamicItemTelemetry({
        operation: "resolve_baseitems",
        outcome: "failed",
        resultCode: "catalog_inconsistent",
        propertyCount,
        variableCount,
        nestedInventoryState,
        durationMs: elapsedMilliseconds(baseItemsStartedAt),
      });
      throw compilerError(
        "AREA_UPDATE_STORAGE_UNAVAILABLE",
        503,
        "The authoritative baseitems.2da catalog returned inconsistent data.",
      );
    }
    const row = table.rows[baseItem.value];
    if (!row || row.rowIndex !== baseItem.value) {
      this.emitDynamicItemTelemetry({
        operation: "resolve_baseitems",
        outcome: "failed",
        resultCode: "base_item_row_missing",
        propertyCount,
        variableCount,
        nestedInventoryState,
        durationMs: elapsedMilliseconds(baseItemsStartedAt),
      });
      throw compilerError(
        "AREA_UPDATE_SOURCE_STALE",
        409,
        "The effective BaseItem row is no longer available.",
      );
    }
    const resolvedDependencies: Array<Readonly<{
      templateResRef: string;
      resourceType: number;
      sha256: string;
      bytes: Buffer;
      resolvedModelType: 0 | 1 | 2 | 3;
    }>> = [];
    for (const dependency of dependencies) {
      const dependencyBaseItem = dependencyBaseItems.get(dependency.templateResRef);
      const dependencyRow = dependencyBaseItem === undefined
        ? undefined
        : table.rows[dependencyBaseItem];
      if (!dependencyRow || dependencyRow.rowIndex !== dependencyBaseItem) {
        this.emitDynamicItemTelemetry({
          operation: "resolve_baseitems",
          outcome: "failed",
          resultCode: "dependency_base_item_row_missing",
          propertyCount,
          variableCount,
          nestedInventoryState,
          durationMs: elapsedMilliseconds(baseItemsStartedAt),
        });
        throw compilerError(
          "AREA_UPDATE_SOURCE_STALE",
          409,
          "An effective nested Item BaseItem row is no longer available.",
          [`templateResRef=${dependency.templateResRef}:BaseItem=${dependencyBaseItem ?? "missing"}`],
        );
      }
      resolvedDependencies.push(Object.freeze({
        templateResRef: dependency.templateResRef,
        resourceType: dependency.resourceType,
        sha256: dependency.sha256,
        bytes: Buffer.from(dependency.bytes),
        resolvedModelType: dependencyRow.modelType,
      }));
    }
    this.emitDynamicItemTelemetry({
      operation: "resolve_baseitems",
      outcome: "succeeded",
      resultCode: "base_item_row_resolved",
      modelType: row.modelType,
      propertyCount,
      variableCount,
      nestedInventoryState,
      durationMs: elapsedMilliseconds(baseItemsStartedAt),
    });
    return Object.freeze({
      bytes: Buffer.from(resolved.bytes),
      resref: resolved.resref,
      modelType: row.modelType,
      dependencies: Object.freeze(resolvedDependencies),
      propertyCount,
      variableCount,
      nestedInventoryState,
    });
  }

  private async resolveDynamicStoreBlueprint(
    addition: Extract<ProjectedNewAreaObject, { sourceKind: "store" }>,
    sourceObjectKey: string,
    sourceSizeBytes: number,
  ): Promise<DynamicStoreBlueprintResolution> {
    const resolveBlueprint = this.dependencies.appearanceCatalog.resolveEffectiveTemplateBlueprint;
    if (!resolveBlueprint) {
      throw compilerError(
        "AREA_UPDATE_STORAGE_UNAVAILABLE",
        503,
        "The effective Store blueprint catalog is unavailable.",
      );
    }
    let resolved;
    try {
      resolved = await resolveBlueprint.call(this.dependencies.appearanceCatalog, {
        kind: "store",
        templateId: addition.templateId,
        sourceObjectKey,
        expectedSha256: addition.sourceSha256,
      });
    } catch {
      throw compilerError(
        "AREA_UPDATE_STORAGE_UNAVAILABLE",
        503,
        "The effective Store blueprint could not be resolved.",
      );
    }
    const profile = AREA_STORE_DYNAMIC_CONSTRUCTION_PROFILE;
    if (!resolved || resolved.kind !== "store" ||
      resolved.templateId !== addition.templateId ||
      resolved.resref !== addition.resRef ||
      resolved.sourceObjectKey !== sourceObjectKey ||
      resolved.sha256 !== addition.sourceSha256) {
      throw compilerError(
        "AREA_UPDATE_SOURCE_STALE",
        409,
        "The effective Store blueprint changed after the draft was created.",
      );
    }
    if (!Buffer.isBuffer(resolved.bytes) || resolved.bytes.length < 1 ||
      resolved.bytes.length !== sourceSizeBytes ||
      resolved.bytes.length > profile.maxSourceBytes ||
      sha256Hex(resolved.bytes) !== addition.sourceSha256 ||
      (resolved.dependencies !== undefined && !Array.isArray(resolved.dependencies))) {
      throw compilerError(
        "AREA_UPDATE_OBJECT_MUTATION_INVALID",
        422,
        "The effective Store blueprint payload or dependency set is invalid.",
      );
    }
    const document = parseRawGffDocument(resolved.bytes);
    const resRefs = document?.fields.filter((field) => field.label === "ResRef") ?? [];
    const tags = document?.fields.filter((field) => field.label === "Tag") ?? [];
    if (!document || document.fileType !== profile.fileType ||
      document.fileVersion !== profile.fileVersion ||
      document.rootStructTypeId !== profile.rootStructTypeId ||
      resRefs.length !== 1 || resRefs[0]?.type !== "resref" ||
      resRefs[0].value !== addition.resRef || tags.length !== 1 ||
      tags[0]?.type !== "cexostring" || tags[0].value !== addition.tag) {
      throw compilerError(
        "AREA_UPDATE_OBJECT_MUTATION_INVALID",
        422,
        "The effective Store blueprint identity is invalid.",
      );
    }
    const dependencies = resolved.dependencies ?? [];
    if (dependencies.length > profile.maxUniqueDependencies) {
      throw compilerError(
        "AREA_UPDATE_OBJECT_MUTATION_INVALID",
        422,
        "The effective Store dependency count exceeds the admitted profile.",
      );
    }
    const dependencyBaseItems = new Map<string, number>();
    let dependencyBytes = 0;
    for (const dependency of dependencies) {
      dependencyBytes += Buffer.isBuffer(dependency.bytes) ? dependency.bytes.length : 0;
      const baseItemValue = parseDynamicItemDependencyBaseItem(dependency);
      if (baseItemValue === null || dependencyBaseItems.has(dependency.templateResRef) ||
        dependencyBytes > profile.maxDependencyBytes) {
        throw compilerError(
          "AREA_UPDATE_OBJECT_MUTATION_INVALID",
          422,
          "The effective Store Item dependency closure is invalid.",
        );
      }
      dependencyBaseItems.set(dependency.templateResRef, baseItemValue);
    }
    const resolveTable = this.dependencies.appearanceCatalog.resolveEffectiveItemBaseItemsTwoDaTable;
    if (!resolveTable) {
      throw compilerError(
        "AREA_UPDATE_STORAGE_UNAVAILABLE",
        503,
        "The authoritative baseitems.2da catalog is unavailable.",
      );
    }
    let table;
    try {
      table = await resolveTable.call(this.dependencies.appearanceCatalog);
    } catch {
      throw compilerError(
        "AREA_UPDATE_STORAGE_UNAVAILABLE",
        503,
        "The authoritative baseitems.2da catalog could not be resolved.",
      );
    }
    if (!table || !isExactEffectiveItemBaseItemsTwoDaTable(table)) {
      throw compilerError(
        "AREA_UPDATE_SOURCE_STALE",
        409,
        "The effective baseitems.2da source is no longer available.",
      );
    }
    const resolvedDependencies = dependencies.map((dependency) => {
      const baseItem = dependencyBaseItems.get(dependency.templateResRef);
      const row = baseItem === undefined ? undefined : table.rows[baseItem];
      if (!row || row.rowIndex !== baseItem) {
        throw compilerError(
          "AREA_UPDATE_SOURCE_STALE",
          409,
          "An effective Store Item BaseItem row is no longer available.",
          [`templateResRef=${dependency.templateResRef}:BaseItem=${baseItem ?? "missing"}`],
        );
      }
      return Object.freeze({
        templateResRef: dependency.templateResRef,
        resourceType: dependency.resourceType,
        sha256: dependency.sha256,
        bytes: Buffer.from(dependency.bytes),
        resolvedModelType: row.modelType,
      });
    });
    return Object.freeze({
      bytes: Buffer.from(resolved.bytes),
      resref: resolved.resref,
      dependencies: Object.freeze(resolvedDependencies),
    });
  }

  private async resolveDynamicEncounterBlueprint(
    addition: Extract<ProjectedNewAreaObject, { sourceKind: "encounter" }>,
    sourceObjectKey: string,
    sourceSizeBytes: number,
  ): Promise<DynamicEncounterBlueprintResolution> {
    const resolveBlueprint = this.dependencies.appearanceCatalog.resolveEffectiveTemplateBlueprint;
    if (!resolveBlueprint) {
      throw compilerError(
        "AREA_UPDATE_STORAGE_UNAVAILABLE",
        503,
        "The effective Encounter blueprint catalog is unavailable.",
      );
    }
    let resolved;
    try {
      resolved = await resolveBlueprint.call(this.dependencies.appearanceCatalog, {
        kind: "encounter",
        templateId: addition.templateId,
        sourceObjectKey,
        expectedSha256: addition.sourceSha256,
      });
    } catch {
      throw compilerError(
        "AREA_UPDATE_STORAGE_UNAVAILABLE",
        503,
        "The effective Encounter blueprint could not be resolved.",
      );
    }
    const profile = AREA_ENCOUNTER_DYNAMIC_CONSTRUCTION_PROFILE;
    if (!resolved || resolved.kind !== "encounter" ||
      resolved.templateId !== addition.templateId ||
      resolved.resref !== addition.resRef ||
      resolved.sourceObjectKey !== sourceObjectKey ||
      resolved.sha256 !== addition.sourceSha256) {
      throw compilerError(
        "AREA_UPDATE_SOURCE_STALE",
        409,
        "The effective Encounter blueprint changed after the draft was created.",
      );
    }
    if (!Buffer.isBuffer(resolved.bytes) || resolved.bytes.length < 1 ||
      resolved.bytes.length !== sourceSizeBytes ||
      resolved.bytes.length > profile.maxSourceBytes ||
      sha256Hex(resolved.bytes) !== addition.sourceSha256 ||
      (resolved.dependencies !== undefined &&
        (!Array.isArray(resolved.dependencies) || resolved.dependencies.length !== 0))) {
      throw compilerError(
        "AREA_UPDATE_OBJECT_MUTATION_INVALID",
        422,
        "The effective Encounter blueprint payload or dependency set is invalid.",
      );
    }
    const document = parseRawGffDocument(resolved.bytes);
    const templateResRefs = document?.fields.filter(
      (field) => field.label === "TemplateResRef",
    ) ?? [];
    const tags = document?.fields.filter((field) => field.label === "Tag") ?? [];
    if (!document || document.fileType !== profile.fileType ||
      document.fileVersion !== profile.fileVersion ||
      document.rootStructTypeId !== profile.rootStructTypeId ||
      templateResRefs.length !== 1 || templateResRefs[0]?.type !== "resref" ||
      templateResRefs[0].value !== addition.resRef || tags.length !== 1 ||
      tags[0]?.type !== "cexostring" || tags[0].value !== addition.tag) {
      throw compilerError(
        "AREA_UPDATE_OBJECT_MUTATION_INVALID",
        422,
        "The effective Encounter blueprint identity is invalid.",
      );
    }
    return Object.freeze({
      bytes: Buffer.from(resolved.bytes),
      resref: resolved.resref,
    });
  }

  private async resolveDynamicWaypointBlueprint(
    addition: Extract<ProjectedNewAreaObject, { sourceKind: "waypoint" }>,
    sourceObjectKey: string,
    sourceSizeBytes: number,
  ): Promise<DynamicWaypointBlueprintResolution> {
    const resolveBlueprint = this.dependencies.appearanceCatalog.resolveEffectiveTemplateBlueprint;
    if (!resolveBlueprint) {
      throw compilerError(
        "AREA_UPDATE_STORAGE_UNAVAILABLE",
        503,
        "The effective Waypoint blueprint catalog is unavailable.",
      );
    }
    let resolved;
    try {
      resolved = await resolveBlueprint.call(this.dependencies.appearanceCatalog, {
        kind: "waypoint",
        templateId: addition.templateId,
        sourceObjectKey,
        expectedSha256: addition.sourceSha256,
      });
    } catch {
      throw compilerError(
        "AREA_UPDATE_STORAGE_UNAVAILABLE",
        503,
        "The effective Waypoint blueprint could not be resolved.",
      );
    }
    const profile = AREA_WAYPOINT_DYNAMIC_CONSTRUCTION_PROFILE;
    if (!resolved || resolved.kind !== "waypoint" ||
      resolved.templateId !== addition.templateId ||
      resolved.resref !== addition.resRef ||
      resolved.sourceObjectKey !== sourceObjectKey ||
      resolved.sha256 !== addition.sourceSha256) {
      throw compilerError(
        "AREA_UPDATE_SOURCE_STALE",
        409,
        "The effective Waypoint blueprint changed after the draft was created.",
      );
    }
    if (!Buffer.isBuffer(resolved.bytes) || resolved.bytes.length < 1 ||
      resolved.bytes.length !== sourceSizeBytes ||
      resolved.bytes.length > profile.maxSourceBytes ||
      sha256Hex(resolved.bytes) !== addition.sourceSha256 ||
      (resolved.dependencies !== undefined &&
        (!Array.isArray(resolved.dependencies) || resolved.dependencies.length !== 0))) {
      throw compilerError(
        "AREA_UPDATE_OBJECT_MUTATION_INVALID",
        422,
        "The effective Waypoint blueprint payload or dependency set is invalid.",
      );
    }
    const document = parseRawGffDocument(resolved.bytes);
    const templateResRefs = document?.fields.filter(
      (field) => field.label === "TemplateResRef",
    ) ?? [];
    const tags = document?.fields.filter((field) => field.label === "Tag") ?? [];
    if (!document || document.fileType !== profile.fileType ||
      document.fileVersion !== profile.fileVersion ||
      document.rootStructTypeId !== profile.rootStructTypeId ||
      templateResRefs.length !== 1 || templateResRefs[0]?.type !== "resref" ||
      templateResRefs[0].value !== addition.resRef || tags.length !== 1 ||
      tags[0]?.type !== "cexostring" || tags[0].value !== addition.tag) {
      throw compilerError(
        "AREA_UPDATE_OBJECT_MUTATION_INVALID",
        422,
        "The effective Waypoint blueprint identity is invalid.",
      );
    }
    return Object.freeze({
      bytes: Buffer.from(resolved.bytes),
      resref: resolved.resref,
    });
  }

  private emitDynamicItemTelemetry(
    event: Omit<AreaDynamicItemBlueprintCopyTelemetryEvent, "eventName">,
  ): void {
    try {
      this.dependencies.dynamicItemTelemetry?.emit(Object.freeze({
        eventName: "area_dynamic_item_blueprint_copy.v1",
        ...event,
      }));
    } catch {
      // Telemetry is intentionally best-effort and cannot change Area compilation.
    }
  }

  private emitStoreCommerceTelemetryBatch(
    profiles: readonly Readonly<{ changedFieldCount: number }>[],
    event: Omit<AreaStoreCommerceTelemetryEvent, "eventName" | "changedFieldCount">,
  ): void {
    for (const profile of profiles) {
      try {
        this.dependencies.storeCommerceTelemetry?.emit(Object.freeze({
          eventName: "area_store_commerce_cas.v1",
          ...event,
          changedFieldCount: profile.changedFieldCount,
        }));
      } catch {
        // Telemetry is intentionally best-effort and cannot change Area compilation.
      }
    }
  }

  private emitStoreScriptResRefsTelemetryBatch(
    profiles: readonly Readonly<{ changedFieldCount: number }>[],
    event: Omit<
      AreaStoreScriptResRefsTelemetryEvent,
      "eventName" | "changedFieldCount"
    >,
  ): void {
    for (const profile of profiles) {
      try {
        this.dependencies.storeScriptResRefsTelemetry?.emit(Object.freeze({
          eventName: "area_store_script_resrefs_cas.v1",
          ...event,
          changedFieldCount: profile.changedFieldCount,
        }));
      } catch {
        // Telemetry is intentionally best-effort and cannot change Area compilation.
      }
    }
  }

  private emitTriggerScriptResRefsTelemetryBatch(
    profiles: readonly Readonly<{ changedFieldCount: number }>[],
    event: Omit<
      AreaTriggerScriptResRefsTelemetryEvent,
      "eventName" | "changedFieldCount"
    >,
  ): void {
    for (const profile of profiles) {
      try {
        this.dependencies.triggerScriptResRefsTelemetry?.emit(Object.freeze({
          eventName: "area_trigger_script_resrefs_cas.v1",
          ...event,
          changedFieldCount: profile.changedFieldCount,
        }));
      } catch {
        // Telemetry is intentionally best-effort and cannot change Area compilation.
      }
    }
  }

  private emitTriggerTransitionStorageTelemetryBatch(
    profiles: readonly Readonly<{ changedFieldCount: number }>[],
    event: Omit<
      AreaTriggerTransitionStorageTelemetryEvent,
      "eventName" | "changedFieldCount"
    >,
  ): void {
    for (const profile of profiles) {
      try {
        this.dependencies.triggerTransitionStorageTelemetry?.emit(Object.freeze({
          eventName: "area_trigger_transition_storage_cas.v1",
          ...event,
          changedFieldCount: profile.changedFieldCount,
        }));
      } catch {
        // Telemetry is intentionally best-effort and cannot change Area compilation.
      }
    }
  }

  private emitTriggerCorePropertiesTelemetryBatch(
    profiles: readonly Readonly<{ changedFieldCount: number }>[],
    event: Omit<
      AreaTriggerCorePropertiesTelemetryEvent,
      "eventName" | "changedFieldCount"
    >,
  ): void {
    for (const profile of profiles) {
      try {
        this.dependencies.triggerCorePropertiesTelemetry?.emit(Object.freeze({
          eventName: "area_trigger_core_properties_cas.v1",
          ...event,
          changedFieldCount: profile.changedFieldCount,
        }));
      } catch {
        // Telemetry is intentionally best-effort and cannot change Area compilation.
      }
    }
  }

  private emitTriggerTrapPropertiesTelemetryBatch(
    profiles: readonly Readonly<{ changedFieldCount: number }>[],
    event: Omit<
      AreaTriggerTrapPropertiesTelemetryEvent,
      "eventName" | "changedFieldCount"
    >,
  ): void {
    for (const profile of profiles) {
      try {
        this.dependencies.triggerTrapPropertiesTelemetry?.emit(Object.freeze({
          eventName: "area_trigger_trap_properties_cas.v1",
          ...event,
          changedFieldCount: profile.changedFieldCount,
        }));
      } catch {
        // Telemetry is intentionally best-effort and cannot change Area compilation.
      }
    }
  }

  private emitStoreVariableTableTelemetryBatch(
    profiles: readonly Readonly<{ entryCount: number }>[],
    event: Omit<
      AreaStoreVariableTableTelemetryEvent,
      "eventName" | "entryCount"
    >,
  ): void {
    for (const profile of profiles) {
      try {
        this.dependencies.storeVariableTableTelemetry?.emit(Object.freeze({
          eventName: "area_store_variable_table_cas.v1",
          ...event,
          entryCount: profile.entryCount,
        }));
      } catch {
        // Telemetry is intentionally best-effort and cannot change Area compilation.
      }
    }
  }

  private emitTriggerVariableTableTelemetryBatch(
    profiles: readonly Readonly<{ changedEntryCount: number }>[],
    event: Omit<
      AreaTriggerVariableTableTelemetryEvent,
      "eventName" | "changedEntryCount"
    >,
  ): void {
    for (const profile of profiles) {
      try {
        this.dependencies.triggerVariableTableTelemetry?.emit(Object.freeze({
          eventName: "area_trigger_variable_table_cas.v1",
          ...event,
          changedEntryCount: profile.changedEntryCount,
        }));
      } catch {
        // Telemetry is intentionally best-effort and cannot change Area compilation.
      }
    }
  }

  private emitStoreRestrictionsTelemetryBatch(
    profiles: readonly Readonly<{
      entryCount: number;
      changedListCount: number;
    }>[],
    event: Omit<
      AreaStoreRestrictionsTelemetryEvent,
      "eventName" | "entryCount" | "changedListCount"
    >,
  ): void {
    for (const profile of profiles) {
      try {
        this.dependencies.storeRestrictionsTelemetry?.emit(Object.freeze({
          eventName: "area_store_restrictions_cas.v1",
          ...event,
          entryCount: profile.entryCount,
          changedListCount: profile.changedListCount,
        }));
      } catch {
        // Telemetry is intentionally best-effort and cannot change Area compilation.
      }
    }
  }

  private emitStoreInventoryTelemetryBatch(
    profiles: readonly Readonly<{
      bucketCount: number;
      entryCount: number;
      changedEntryCount: number;
    }>[],
    event: Omit<
      AreaStoreInventoryTelemetryEvent,
      "eventName" | "bucketCount" | "entryCount" | "changedEntryCount"
    >,
  ): void {
    for (const profile of profiles) {
      try {
        this.dependencies.storeInventoryTelemetry?.emit(Object.freeze({
          eventName: "area_store_inventory_cas.v1",
          ...event,
          bucketCount: profile.bucketCount,
          entryCount: profile.entryCount,
          changedEntryCount: profile.changedEntryCount,
        }));
      } catch {
        // Telemetry is intentionally best-effort and cannot change Area compilation.
      }
    }
  }

  private async resolveDynamicPlaceablePortraitId(bytes: Buffer): Promise<number> {
    const document = parseRawGffDocument(bytes);
    const profile = AREA_PLACEABLE_DYNAMIC_CONSTRUCTION_PROFILE;
    if (!document || document.fileType !== profile.fileType ||
      document.fileVersion !== profile.fileVersion ||
      document.rootStructTypeId !== profile.rootStructTypeId) {
      throw compilerError(
        "AREA_UPDATE_OBJECT_MUTATION_INVALID",
        422,
        "The effective Placeable blueprint has an unsupported GFF identity.",
      );
    }
    const portraitIds = document.fields.filter((field) => field.label === "PortraitId");
    const portraitResRefs = document.fields.filter((field) => field.label === "Portrait");
    if (portraitIds.length + portraitResRefs.length !== 1) {
      throw compilerError(
        "AREA_UPDATE_OBJECT_MUTATION_INVALID",
        422,
        "The effective Placeable blueprint portrait identity is ambiguous or missing.",
      );
    }
    const direct = portraitIds[0];
    if (direct) {
      if (direct.type !== "word" || !Number.isSafeInteger(direct.value) ||
        direct.value < 0 || direct.value > 0xffff) {
        throw compilerError(
          "AREA_UPDATE_OBJECT_MUTATION_INVALID",
          422,
          "The effective Placeable blueprint PortraitId is invalid.",
        );
      }
      return direct.value;
    }
    const legacy = portraitResRefs[0];
    if (!legacy || legacy.type !== "resref" || !/^po_[A-Za-z0-9_]{1,13}$/u.test(legacy.value)) {
      throw compilerError(
        "AREA_UPDATE_OBJECT_MUTATION_INVALID",
        422,
        "The effective Placeable blueprint legacy Portrait is invalid.",
      );
    }
    const resolveTable = this.dependencies.appearanceCatalog.resolveEffectivePortraitsTwoDaTable;
    if (!resolveTable) {
      throw compilerError(
        "AREA_UPDATE_STORAGE_UNAVAILABLE",
        503,
        "The authoritative portraits.2da catalog is unavailable.",
      );
    }
    let table;
    try {
      table = await resolveTable.call(this.dependencies.appearanceCatalog);
    } catch {
      throw compilerError(
        "AREA_UPDATE_STORAGE_UNAVAILABLE",
        503,
        "The authoritative portraits.2da catalog could not be resolved.",
      );
    }
    if (!table) {
      throw compilerError(
        "AREA_UPDATE_SOURCE_STALE",
        409,
        "The effective portraits.2da source is no longer available.",
      );
    }
    if (!isExactEffectivePortraitsTwoDaTable(table)) {
      throw compilerError(
        "AREA_UPDATE_STORAGE_UNAVAILABLE",
        503,
        "The authoritative portraits.2da catalog returned inconsistent data.",
      );
    }
    const legacyBaseResRef = legacy.value.slice(3).toLowerCase();
    const matches = table.rows.filter(
      (row) => row.baseResRef.toLowerCase() === legacyBaseResRef,
    );
    if (matches.length !== 1 || matches[0]!.rowIndex > 0xffff) {
      throw compilerError(
        "AREA_UPDATE_OBJECT_MUTATION_INVALID",
        422,
        "The effective Placeable legacy Portrait has no unique physical portraits.2da row.",
      );
    }
    return matches[0]!.rowIndex;
  }

  private async readCapturedSnapshot(
    command: AreaUpdateCommand,
    moduleState: AreaUpdateModuleState,
  ): Promise<Readonly<{ head: NonNullable<Awaited<ReturnType<AtomicModuleSnapshotRepositoryPort["readHead"]>>>; manifest: ModuleSnapshotManifest }>> {
    const head = await this.dependencies.repository.readHead(command.moduleId);
    if (
      !head ||
      head.moduleId !== command.moduleId ||
      head.revision !== moduleState.revision ||
      head.quarantined ||
      moduleState.moduleId !== command.moduleId ||
      moduleState.quarantined
    ) {
      throw compilerError(
        "AREA_UPDATE_STORAGE_UNAVAILABLE",
        503,
        "The captured module snapshot is unavailable, stale, or quarantined.",
      );
    }
    const retained = await this.dependencies.repository.readManifest(head.manifestKey);
    if (!retained) {
      throw compilerError(
        "AREA_UPDATE_STORAGE_UNAVAILABLE",
        503,
        "The captured module snapshot manifest is missing.",
      );
    }
    let manifest: ModuleSnapshotManifest;
    try {
      manifest = validateModuleSnapshotManifest(retained);
    } catch (error) {
      throw compilerError(
        "AREA_UPDATE_STORAGE_UNAVAILABLE",
        503,
        "The captured module snapshot manifest is invalid.",
        [errorMessage(error)],
      );
    }
    if (
      manifest.moduleId !== command.moduleId ||
      manifest.revision !== head.revision ||
      buildModuleSnapshotManifestKey(manifest) !== head.manifestKey ||
      hashModuleSnapshotManifest(manifest) !== head.manifestSha256
    ) {
      throw compilerError(
        "AREA_UPDATE_STORAGE_UNAVAILABLE",
        503,
        "The captured module head and manifest identities differ.",
      );
    }
    return Object.freeze({ head, manifest });
  }

  private requireAreaDescriptors(manifest: ModuleSnapshotManifest, resRef: string) {
    const are = findDescriptor(manifest, `${resRef}.are`);
    if (!are) {
      throw compilerError(
        "AREA_UPDATE_SOURCE_MISSING",
        404,
        "The source ARE is missing from the captured module snapshot.",
      );
    }
    const git = findDescriptor(manifest, `${resRef}.git`);
    const gic = findDescriptor(manifest, `${resRef}.gic`);
    const ifo = findDescriptor(manifest, "module.ifo");
    if (!git || !gic || !ifo) {
      throw compilerError(
        "AREA_UPDATE_COMPANION_MISSING",
        409,
        "The Area GIT/GIC or module IFO companion is missing.",
        [
          ...(!git ? [`${resRef}.git`] : []),
          ...(!gic ? [`${resRef}.gic`] : []),
          ...(!ifo ? ["module.ifo"] : []),
        ],
      );
    }
    for (const [extension, descriptor] of [
      ["are", are],
      ["git", git],
      ["gic", gic],
    ] as const) {
      if (descriptor.resourceType !== RESOURCE_TYPES[extension]) {
        throw compilerError(
          "AREA_UPDATE_STORAGE_UNAVAILABLE",
          503,
          `The ${extension.toUpperCase()} snapshot resource type is invalid.`,
        );
      }
    }
    return Object.freeze({ are, git, gic, ifo });
  }

  private async readVerifiedContent(
    descriptor: ModuleSnapshotObjectDescriptor,
  ): Promise<Buffer> {
    const content = await this.dependencies.repository.readContent(descriptor.contentKey);
    if (
      !content ||
      content.contentKey !== descriptor.contentKey ||
      content.size !== descriptor.size ||
      content.bytes.length !== descriptor.size ||
      content.sha256 !== descriptor.sha256 ||
      sha256Hex(content.bytes) !== descriptor.sha256
    ) {
      throw compilerError(
        "AREA_UPDATE_STORAGE_UNAVAILABLE",
        503,
        `Snapshot content failed exact readback for ${descriptor.logicalKey}.`,
      );
    }
    return Buffer.from(content.bytes);
  }

  private async validatePlaceableAppearanceMutations(
    mutations: readonly ExistingAreaObjectPropertyMutation[],
  ): Promise<void> {
    const appearances = mutations.flatMap((mutation) =>
      mutation.kind === "placeable" && mutation.appearance ? [mutation.appearance] : []);
    if (appearances.length === 0) return;
    const resolveDescriptor = this.dependencies.appearanceCatalog.resolveEffectivePlaceablesTwoDaDescriptor;
    const listRows = this.dependencies.appearanceCatalog.listEffectivePlaceablesTwoDaRows;
    if (!resolveDescriptor || !listRows) {
      throw compilerError(
        "AREA_UPDATE_STORAGE_UNAVAILABLE",
        503,
        "The authoritative placeables.2da catalog is unavailable.",
      );
    }
    let descriptor;
    try {
      descriptor = await resolveDescriptor.call(this.dependencies.appearanceCatalog);
    } catch (error) {
      throw compilerError(
        "AREA_UPDATE_STORAGE_UNAVAILABLE",
        503,
        "The authoritative placeables.2da descriptor could not be resolved.",
        [errorMessage(error)],
      );
    }
    if (!descriptor) {
      throw compilerError(
        "AREA_UPDATE_SOURCE_STALE",
        409,
        "The effective placeables.2da source is no longer available.",
        ["actual=missing"],
      );
    }
    for (const appearance of appearances) {
      if (descriptor.sha256 !== appearance.tableSha256) {
        throw compilerError(
          "AREA_UPDATE_SOURCE_STALE",
          409,
          "The effective placeables.2da changed after the draft was opened.",
          [`expected=${appearance.tableSha256}`, `actual=${descriptor.sha256}`],
        );
      }
      if (descriptor.rowCount !== appearance.rowCount) {
        throw compilerError(
          "AREA_UPDATE_SOURCE_STALE",
          409,
          "The effective placeables.2da row count changed after the draft was opened.",
          [`expected=${appearance.rowCount}`, `actual=${descriptor.rowCount}`],
        );
      }
    }
    const uniqueTargets = [...new Set(appearances.map((appearance) => appearance.value))];
    await Promise.all(uniqueTargets.map(async (targetRow) => {
      let result;
      try {
        result = await listRows.call(this.dependencies.appearanceCatalog, {
          limit: 1,
          offset: targetRow,
        });
      } catch (error) {
        throw compilerError(
          "AREA_UPDATE_STORAGE_UNAVAILABLE",
          503,
          "The authoritative placeables.2da row could not be resolved.",
          [errorMessage(error)],
        );
      }
      if (!result) {
        throw compilerError(
          "AREA_UPDATE_STORAGE_UNAVAILABLE",
          503,
          "The authoritative placeables.2da row catalog is unavailable.",
          [`row=${targetRow}`],
        );
      }
      if (
        result.descriptor.sha256 !== descriptor.sha256 ||
        result.descriptor.rowCount !== descriptor.rowCount
      ) {
        throw compilerError(
          "AREA_UPDATE_SOURCE_STALE",
          409,
          "The effective placeables.2da changed while the update candidate was compiled.",
          [
            `expected=${descriptor.sha256}:${descriptor.rowCount}`,
            `actual=${result.descriptor.sha256}:${result.descriptor.rowCount}`,
          ],
        );
      }
      if (
        result.limit !== 1 ||
        result.offset !== targetRow ||
        result.total !== descriptor.rowCount
      ) {
        throw compilerError(
          "AREA_UPDATE_STORAGE_UNAVAILABLE",
          503,
          "The authoritative placeables.2da row catalog returned inconsistent metadata.",
          [`row=${targetRow}`],
        );
      }
      if (result.items.length !== 1 || result.items[0]?.rowIndex !== targetRow) {
        throw compilerError(
          "AREA_UPDATE_OBJECT_MUTATION_INVALID",
          422,
          "The requested Placeable Appearance is not a current physical placeables.2da row.",
          [`placeable:Appearance:row=${targetRow}:not_found`],
        );
      }
    }));
  }

  private async validateWaypointAppearanceMutations(
    mutations: readonly ExistingAreaObjectPropertyMutation[],
  ): Promise<void> {
    const appearances = mutations.flatMap((mutation) =>
      mutation.kind === "waypoint" && mutation.appearance ? [mutation.appearance] : []);
    if (appearances.length === 0) return;
    const resolveDescriptor = this.dependencies.appearanceCatalog
      .resolveEffectiveWaypointTwoDaDescriptor;
    const resolveRow = this.dependencies.appearanceCatalog.resolveEffectiveWaypointTwoDaRow;
    if (!resolveDescriptor || !resolveRow) {
      throw compilerError(
        "AREA_UPDATE_STORAGE_UNAVAILABLE",
        503,
        "The authoritative waypoint.2da catalog is unavailable.",
      );
    }
    let descriptor;
    try {
      descriptor = await resolveDescriptor.call(this.dependencies.appearanceCatalog);
    } catch (error) {
      throw compilerError(
        "AREA_UPDATE_STORAGE_UNAVAILABLE",
        503,
        "The authoritative waypoint.2da descriptor could not be resolved.",
        [errorMessage(error)],
      );
    }
    if (!descriptor) {
      throw compilerError(
        "AREA_UPDATE_SOURCE_STALE",
        409,
        "The effective waypoint.2da source is no longer available.",
      );
    }
    for (const appearance of appearances) {
      if (
        descriptor.resourceName !== "waypoint.2da" ||
        descriptor.sha256 !== appearance.tableSha256 ||
        descriptor.rowCount !== appearance.rowCount
      ) {
        throw compilerError(
          "AREA_UPDATE_SOURCE_STALE",
          409,
          "The effective waypoint.2da changed after the draft was opened.",
        );
      }
    }
    const uniqueTargets = [...new Set(appearances.map((appearance) => appearance.value))];
    for (const targetRow of uniqueTargets) {
      let result;
      try {
        result = await resolveRow.call(this.dependencies.appearanceCatalog, targetRow);
      } catch (error) {
        throw compilerError(
          "AREA_UPDATE_STORAGE_UNAVAILABLE",
          503,
          "The authoritative waypoint.2da row could not be resolved.",
          [errorMessage(error)],
        );
      }
      if (!result ||
        result.descriptor.resourceName !== "waypoint.2da" ||
        result.descriptor.sha256 !== descriptor.sha256 ||
        result.descriptor.rowCount !== descriptor.rowCount) {
        throw compilerError(
          "AREA_UPDATE_SOURCE_STALE",
          409,
          "The effective waypoint.2da changed while the update candidate was compiled.",
        );
      }
      if (!result.row || result.row.rowIndex !== targetRow) {
        throw compilerError(
          "AREA_UPDATE_OBJECT_MUTATION_INVALID",
          422,
          "The requested Waypoint Appearance is not admitted by the current Toolset selector.",
          [`waypoint:Appearance:row=${targetRow}:not_admitted`],
        );
      }
    }
  }

  private async validateCreatureAppearanceMutations(
    mutations: readonly ExistingAreaObjectPropertyMutation[],
  ): Promise<void> {
    const appearances = mutations.flatMap((mutation) =>
      mutation.kind === "creature" && mutation.appearance ? [mutation.appearance] : []);
    if (appearances.length === 0) return;
    const resolveDescriptor = this.dependencies.appearanceCatalog
      .resolveEffectiveCreatureAppearanceTwoDaDescriptor;
    const resolveRow = this.dependencies.appearanceCatalog
      .resolveEffectiveCreatureAppearanceTwoDaRow;
    if (!resolveDescriptor || !resolveRow) {
      throw compilerError(
        "AREA_UPDATE_STORAGE_UNAVAILABLE",
        503,
        "The authoritative Creature appearance.2da catalog is unavailable.",
      );
    }
    let descriptor;
    try {
      descriptor = await resolveDescriptor.call(this.dependencies.appearanceCatalog);
    } catch {
      throw compilerError(
        "AREA_UPDATE_STORAGE_UNAVAILABLE",
        503,
        "The authoritative Creature appearance.2da descriptor could not be resolved.",
      );
    }
    if (!descriptor) {
      throw compilerError(
        "AREA_UPDATE_SOURCE_STALE",
        409,
        "The effective Creature appearance.2da source is no longer available.",
      );
    }
    for (const appearance of appearances) {
      if (
        descriptor.resourceName !== "appearance.2da" ||
        descriptor.sha256 !== appearance.tableSha256 ||
        descriptor.rowCount !== appearance.rowCount
      ) {
        throw compilerError(
          "AREA_UPDATE_SOURCE_STALE",
          409,
          "The effective Creature appearance.2da changed after the draft was opened.",
        );
      }
    }
    const uniqueTargets = [...new Set(appearances.map((appearance) => appearance.value))];
    for (const targetRow of uniqueTargets) {
      let result;
      try {
        result = await resolveRow.call(this.dependencies.appearanceCatalog, targetRow);
      } catch {
        throw compilerError(
          "AREA_UPDATE_STORAGE_UNAVAILABLE",
          503,
          "The authoritative Creature appearance.2da row could not be resolved.",
        );
      }
      if (!result) {
        throw compilerError(
          "AREA_UPDATE_SOURCE_STALE",
          409,
          "The effective Creature appearance.2da changed while the update candidate was compiled.",
        );
      }
      if (
        result.descriptor.resourceName !== "appearance.2da" ||
        result.descriptor.sha256 !== descriptor.sha256 ||
        result.descriptor.rowCount !== descriptor.rowCount
      ) {
        throw compilerError(
          "AREA_UPDATE_SOURCE_STALE",
          409,
          "The effective Creature appearance.2da changed while the update candidate was compiled.",
        );
      }
      if (!result.row || result.row.rowIndex !== targetRow) {
        throw compilerError(
          "AREA_UPDATE_OBJECT_MUTATION_INVALID",
          422,
          "The requested Creature Appearance is not admitted by the current Toolset selector.",
          [`creature:Appearance_Type:row=${targetRow}:not_admitted`],
        );
      }
    }
  }

  private async validateCreatureGenderMutations(
    mutations: readonly ExistingAreaObjectPropertyMutation[],
  ): Promise<void> {
    try {
      await admitCreatureGenderCatalogMutations(
        mutations,
        this.dependencies.appearanceCatalog,
      );
    } catch (error) {
      if (!(error instanceof AreaCreatureGenderCatalogAdmissionError)) throw error;
      switch (error.reason) {
        case "catalog_unavailable":
          throw compilerError(
            "AREA_UPDATE_STORAGE_UNAVAILABLE",
            503,
            "The authoritative Creature gender.2da catalog is unavailable.",
          );
        case "descriptor_lookup_failed":
          throw compilerError(
            "AREA_UPDATE_STORAGE_UNAVAILABLE",
            503,
            "The authoritative Creature gender.2da descriptor could not be resolved.",
          );
        case "source_unavailable":
          throw compilerError(
            "AREA_UPDATE_SOURCE_STALE",
            409,
            "The effective Creature gender.2da source is no longer available.",
          );
        case "draft_source_changed":
          throw compilerError(
            "AREA_UPDATE_SOURCE_STALE",
            409,
            "The effective Creature gender.2da changed after the draft was opened.",
          );
        case "row_lookup_failed":
          throw compilerError(
            "AREA_UPDATE_STORAGE_UNAVAILABLE",
            503,
            "The authoritative Creature gender.2da row could not be resolved.",
          );
        case "compile_source_changed":
          throw compilerError(
            "AREA_UPDATE_SOURCE_STALE",
            409,
            "The effective Creature gender.2da changed while the update candidate was compiled.",
          );
        case "row_not_admitted":
          throw compilerError(
            "AREA_UPDATE_OBJECT_MUTATION_INVALID",
            422,
            "The requested Creature Gender is not admitted by the current Toolset selector.",
            [`creature:Gender:row=${error.targetRow}:not_admitted`],
          );
      }
    }
  }

  private async validateCreatureAppendageMutations(
    mutations: readonly ExistingAreaObjectPropertyMutation[],
  ): Promise<void> {
    try {
      await admitCreatureAppendageCatalogMutations(
        mutations,
        this.dependencies.appearanceCatalog,
      );
    } catch (error) {
      if (!(error instanceof AreaCreatureAppendageCatalogAdmissionError)) throw error;
      const member = error.member ?? "wings";
      switch (error.reason) {
        case "catalog_unavailable":
        case "descriptor_lookup_failed":
        case "row_lookup_failed":
          throw compilerError(
            "AREA_UPDATE_STORAGE_UNAVAILABLE",
            503,
            "The authoritative Creature appendage catalog could not be resolved.",
          );
        case "source_unavailable":
        case "draft_source_changed":
        case "compile_source_changed":
          throw compilerError(
            "AREA_UPDATE_SOURCE_STALE",
            409,
            "The effective Creature appendage table changed.",
          );
        case "row_not_admitted":
          throw compilerError(
            "AREA_UPDATE_OBJECT_MUTATION_INVALID",
            422,
            "The requested Creature appendage is not admitted by the current Toolset selector.",
            [`creature:${member}:row=${error.targetRow}:not_admitted`],
          );
      }
    }
  }

  private async validateCreaturePerceptionRangeMutations(
    mutations: readonly ExistingAreaObjectPropertyMutation[],
  ): Promise<void> {
    try {
      await admitCreaturePerceptionRangeCatalogMutations(
        mutations,
        this.dependencies.appearanceCatalog,
      );
    } catch (error) {
      if (!(error instanceof AreaCreaturePerceptionRangeCatalogAdmissionError)) throw error;
      switch (error.reason) {
        case "catalog_unavailable":
        case "table_lookup_failed":
          throw compilerError(
            "AREA_UPDATE_STORAGE_UNAVAILABLE",
            503,
            "The authoritative Creature ranges.2da catalog could not be resolved.",
          );
        case "source_unavailable":
        case "draft_source_changed":
          throw compilerError(
            "AREA_UPDATE_SOURCE_STALE",
            409,
            "The effective Creature ranges.2da source changed.",
          );
        case "row_not_admitted":
          throw compilerError(
            "AREA_UPDATE_OBJECT_MUTATION_INVALID",
            422,
            "The requested Creature PerceptionRange is not admitted by the current Toolset selector.",
            [`creature:PerceptionRange:row=${error.targetRow}:not_admitted`],
          );
      }
    }
  }

  private async validateCreatureWalkRateMutations(
    mutations: readonly ExistingAreaObjectPropertyMutation[],
  ): Promise<void> {
    try {
      await admitCreatureWalkRateCatalogMutations(
        mutations,
        this.dependencies.appearanceCatalog,
      );
    } catch (error) {
      if (!(error instanceof AreaCreatureWalkRateCatalogAdmissionError)) throw error;
      switch (error.reason) {
        case "catalog_unavailable":
        case "table_lookup_failed":
          throw compilerError(
            "AREA_UPDATE_STORAGE_UNAVAILABLE",
            503,
            "The authoritative Creature creaturespeed.2da catalog could not be resolved.",
          );
        case "source_unavailable":
        case "draft_source_changed":
          throw compilerError(
            "AREA_UPDATE_SOURCE_STALE",
            409,
            "The effective Creature creaturespeed.2da source changed.",
          );
        case "row_not_admitted":
          throw compilerError(
            "AREA_UPDATE_OBJECT_MUTATION_INVALID",
            422,
            "The requested Creature WalkRate is not admitted by the current Toolset selector.",
            [`creature:WalkRate:row=${error.targetRow}:not_admitted`],
          );
      }
    }
  }

  private async validateCreatureSoundSetFileMutations(
    mutations: readonly ExistingAreaObjectPropertyMutation[],
  ): Promise<void> {
    try {
      await admitCreatureSoundSetFileCatalogMutations(
        mutations,
        this.dependencies.appearanceCatalog,
      );
    } catch (error) {
      if (!(error instanceof AreaCreatureSoundSetFileCatalogAdmissionError)) throw error;
      switch (error.reason) {
        case "catalog_unavailable":
        case "table_lookup_failed":
          throw compilerError(
            "AREA_UPDATE_STORAGE_UNAVAILABLE",
            503,
            "The authoritative Creature soundset.2da catalog could not be resolved.",
          );
        case "source_unavailable":
        case "draft_source_changed":
          throw compilerError(
            "AREA_UPDATE_SOURCE_STALE",
            409,
            "The effective Creature soundset.2da source changed.",
          );
        case "row_not_admitted":
          throw compilerError(
            "AREA_UPDATE_OBJECT_MUTATION_INVALID",
            422,
            "The requested Creature SoundSetFile is not admitted by the current Toolset selector.",
            [`creature:SoundSetFile:row=${error.targetRow}:not_admitted`],
          );
      }
    }
  }

  private async validateCreatureStartingPackageMutations(
    mutations: readonly ExistingAreaObjectPropertyMutation[],
  ): Promise<void> {
    try {
      await admitCreatureStartingPackageCatalogMutations(
        mutations,
        this.dependencies.appearanceCatalog,
      );
    } catch (error) {
      if (!(error instanceof AreaCreatureStartingPackageCatalogAdmissionError)) throw error;
      switch (error.reason) {
        case "catalog_unavailable":
        case "table_lookup_failed":
          throw compilerError(
            "AREA_UPDATE_STORAGE_UNAVAILABLE",
            503,
            "The effective Creature packages.2da catalog could not be resolved.",
          );
        case "source_unavailable":
          throw compilerError(
            "AREA_UPDATE_OBJECT_MUTATION_INVALID",
            422,
            "The effective Creature packages.2da source is unavailable.",
          );
        case "draft_source_changed":
          throw compilerError(
            "AREA_UPDATE_SOURCE_STALE",
            409,
            "The effective Creature packages.2da source changed.",
          );
        case "row_not_admitted":
          throw compilerError(
            "AREA_UPDATE_OBJECT_MUTATION_INVALID",
            422,
            "The requested Creature StartingPackage is not admitted for the retained ClassList.",
            [`creature:StartingPackage:row=${error.targetRow}:not_admitted`],
          );
      }
    }
  }

  private async validateCreatureClassIdentityMutations(
    mutations: readonly ExistingAreaObjectPropertyMutation[],
  ): Promise<void> {
    try {
      await admitCreatureClassIdentityCatalogMutations(
        mutations,
        this.dependencies.appearanceCatalog,
      );
    } catch (error) {
      if (!(error instanceof AreaCreatureClassIdentityCatalogAdmissionError)) throw error;
      switch (error.reason) {
        case "catalog_unavailable":
        case "table_lookup_failed":
          throw compilerError(
            "AREA_UPDATE_STORAGE_UNAVAILABLE",
            503,
            "The effective Creature class/package catalogs could not be resolved.",
            error.resource ? [`creature:class_identity:${error.resource}:lookup_failed`] : [],
          );
        case "source_unavailable":
          throw compilerError(
            "AREA_UPDATE_OBJECT_MUTATION_INVALID",
            422,
            `The effective Creature ${error.resource ?? "class/package"} source is unavailable.`,
          );
        case "draft_source_changed":
          throw compilerError(
            "AREA_UPDATE_SOURCE_STALE",
            409,
            `The effective Creature ${error.resource ?? "class/package"} source changed.`,
          );
        case "class_row_not_admitted":
          throw compilerError(
            "AREA_UPDATE_OBJECT_MUTATION_INVALID",
            422,
            "A Creature class row is not admitted by the current Toolset selector.",
            [
              `creature:ClassList:phase=${error.phase}:row=${error.targetRow}:not_admitted`,
            ],
          );
        case "package_row_not_admitted":
          throw compilerError(
            "AREA_UPDATE_OBJECT_MUTATION_INVALID",
            422,
            "A Creature package row is not admitted for the corresponding ClassList.",
            [
              `creature:StartingPackage:phase=${error.phase}:row=${error.targetRow}:not_admitted`,
            ],
          );
      }
    }
  }

  private async validateCreatureClassSpellReplacementMutations(
    mutations: readonly ExistingAreaObjectPropertyMutation[],
  ): Promise<void> {
    try {
      await admitCreatureClassSpellReplacementCatalogMutations(
        mutations,
        this.dependencies.appearanceCatalog,
      );
    } catch (error) {
      if (!(error instanceof AreaCreatureClassSpellReplacementCatalogAdmissionError)) {
        throw error;
      }
      switch (error.reason) {
        case "catalog_unavailable":
        case "table_lookup_failed":
        case "source_unavailable":
          throw compilerError(
            "AREA_UPDATE_STORAGE_UNAVAILABLE",
            503,
            "The effective Creature class-spell catalogs could not be resolved.",
          );
        case "draft_source_changed":
          throw compilerError(
            "AREA_UPDATE_SOURCE_STALE",
            409,
            "The effective Creature classes.2da or spells.2da source changed.",
          );
        case "target_row_missing":
        case "target_level_mismatch":
          throw compilerError(
            "AREA_UPDATE_OBJECT_MUTATION_INVALID",
            422,
            "The requested Creature class spell is not admitted at the retained level.",
            ["creature:ClassList:spell_replacement:not_admitted"],
          );
      }
    }
  }

  private async validateCreatureSkillListMutations(
    mutations: readonly ExistingAreaObjectPropertyMutation[],
  ): Promise<void> {
    try {
      await admitCreatureSkillListCatalogMutations(
        mutations,
        this.dependencies.appearanceCatalog,
      );
    } catch (error) {
      if (!(error instanceof AreaCreatureSkillListCatalogAdmissionError)) throw error;
      switch (error.reason) {
        case "catalog_unavailable":
        case "table_lookup_failed":
          throw compilerError(
            "AREA_UPDATE_STORAGE_UNAVAILABLE",
            503,
            "The effective Creature skills.2da catalog could not be resolved.",
          );
        case "source_unavailable":
        case "draft_source_changed":
          throw compilerError(
            "AREA_UPDATE_SOURCE_STALE",
            409,
            "The effective Creature skills.2da source changed.",
          );
      }
    }
  }

  private async validateCreatureFeatListMutations(
    mutations: readonly ExistingAreaObjectPropertyMutation[],
  ): Promise<void> {
    try {
      await admitCreatureFeatListCatalogMutations(
        mutations,
        this.dependencies.appearanceCatalog,
      );
    } catch (error) {
      if (!(error instanceof AreaCreatureFeatListCatalogAdmissionError)) throw error;
      switch (error.reason) {
        case "catalog_unavailable":
        case "table_lookup_failed":
          throw compilerError(
            "AREA_UPDATE_STORAGE_UNAVAILABLE",
            503,
            "The effective Creature feat.2da catalog could not be resolved.",
          );
        case "source_unavailable":
        case "draft_source_changed":
          throw compilerError(
            "AREA_UPDATE_SOURCE_STALE",
            409,
            "The effective Creature feat.2da source changed.",
          );
        case "row_missing":
          throw compilerError(
            "AREA_UPDATE_OBJECT_MUTATION_INVALID",
            422,
            "A Creature FeatList row is not admitted by the effective feat.2da.",
            ["creature:FeatList:row_missing"],
          );
        case "metamagic_coupling_required":
          throw compilerError(
            "AREA_UPDATE_OBJECT_MUTATION_INVALID",
            422,
            "Removing this Creature feat requires coupled metamagic spell-list authoring.",
            ["creature:FeatList:metamagic_coupling_required"],
          );
      }
    }
  }

  private async validateCreatureSpecialAbilityListMutations(
    mutations: readonly ExistingAreaObjectPropertyMutation[],
  ): Promise<void> {
    try {
      await admitCreatureSpecialAbilityListCatalogMutations(
        mutations,
        this.dependencies.appearanceCatalog,
      );
    } catch (error) {
      if (!(error instanceof AreaCreatureSpecialAbilityListCatalogAdmissionError)) {
        throw error;
      }
      switch (error.reason) {
        case "catalog_unavailable":
        case "table_lookup_failed":
          throw compilerError(
            "AREA_UPDATE_STORAGE_UNAVAILABLE",
            503,
            "The effective Creature spells.2da catalog could not be resolved.",
          );
        case "source_unavailable":
        case "draft_source_changed":
          throw compilerError(
            "AREA_UPDATE_SOURCE_STALE",
            409,
            "The effective Creature spells.2da source changed.",
          );
        case "row_missing":
          throw compilerError(
            "AREA_UPDATE_OBJECT_MUTATION_INVALID",
            422,
            "A Creature SpecAbilityList row is not admitted by effective spells.2da.",
            ["creature:SpecAbilityList:row_missing"],
          );
        case "profile_invalid":
          throw compilerError(
            "AREA_UPDATE_OBJECT_MUTATION_INVALID",
            422,
            "A Creature SpecAbilityList row has an invalid Toolset caster profile.",
            ["creature:SpecAbilityList:profile_invalid"],
          );
      }
    }
  }

  private async validateCreaturePhenotypeMutations(
    mutations: readonly ExistingAreaObjectPropertyMutation[],
  ): Promise<void> {
    try {
      await admitCreaturePhenotypeCatalogMutations(
        mutations,
        this.dependencies.appearanceCatalog,
      );
    } catch (error) {
      if (!(error instanceof AreaCreaturePhenotypeCatalogAdmissionError)) throw error;
      switch (error.reason) {
        case "catalog_unavailable":
        case "descriptor_lookup_failed":
        case "row_lookup_failed":
        case "appearance_lookup_failed":
          throw compilerError(
            "AREA_UPDATE_STORAGE_UNAVAILABLE",
            503,
            "The authoritative Creature Phenotype catalog could not be resolved.",
          );
        case "source_unavailable":
        case "draft_source_changed":
        case "appearance_source_changed":
        case "compile_source_changed":
          throw compilerError(
            "AREA_UPDATE_SOURCE_STALE",
            409,
            "The effective Creature Phenotype or Appearance source changed.",
          );
        case "row_not_admitted":
          throw compilerError(
            "AREA_UPDATE_OBJECT_MUTATION_INVALID",
            422,
            "The requested Creature Phenotype is not admitted by the current Toolset selector.",
            [`creature:Phenotype:row=${error.targetRow}:not_admitted`],
          );
        case "appearance_not_player_model":
          throw compilerError(
            "AREA_UPDATE_OBJECT_MUTATION_INVALID",
            422,
            "Creature Phenotype is editable only for the retained MODELTYPE=P appearance.",
            [`creature:Appearance_Type:row=${error.targetRow}:modeltype_not_p`],
          );
      }
    }
  }

  private async validateCreaturePortraitMutations(
    mutations: readonly ExistingAreaObjectPropertyMutation[],
  ): Promise<void> {
    const creaturePortraitMutations = mutations.flatMap((mutation) =>
      mutation.kind === "creature" && mutation.portrait
        ? [{ kind: mutation.kind, portrait: mutation.portrait }]
        : []);
    try {
      await admitCreaturePortraitCatalogMutations(
        creaturePortraitMutations,
        this.dependencies.appearanceCatalog,
      );
    } catch (error) {
      if (!(error instanceof AreaCreaturePortraitCatalogAdmissionError)) throw error;
      switch (error.reason) {
        case "catalog_unavailable":
        case "table_lookup_failed":
          throw compilerError(
            "AREA_UPDATE_STORAGE_UNAVAILABLE",
            503,
            "The authoritative Creature portraits.2da catalog could not be resolved.",
          );
        case "source_unavailable":
        case "draft_source_changed":
        case "compile_source_changed":
          throw compilerError(
            "AREA_UPDATE_SOURCE_STALE",
            409,
            "The effective Creature portraits.2da source changed.",
          );
        case "row_not_admitted":
          throw compilerError(
            "AREA_UPDATE_OBJECT_MUTATION_INVALID",
            422,
            "The requested Creature PortraitId is not admitted for retained Gender/Race.",
            [`creature:PortraitId:row=${error.targetRow}:not_admitted`],
          );
      }
    }
  }

  private async validateCreatureHitPointMutations(
    mutations: readonly ExistingAreaObjectPropertyMutation[],
  ): Promise<void> {
    const creatureMutations = mutations.filter(
      (mutation): mutation is ExistingAreaCreaturePropertyMutation =>
        mutation.kind === "creature",
    );
    try {
      await admitCreatureHitPointCatalogMutations(
        creatureMutations,
        this.dependencies.appearanceCatalog,
      );
    } catch (error) {
      if (!(error instanceof AreaCreatureHitPointCatalogAdmissionError)) throw error;
      switch (error.reason) {
        case "catalog_unavailable":
        case "table_lookup_failed":
          throw compilerError(
            "AREA_UPDATE_STORAGE_UNAVAILABLE",
            503,
            "The authoritative Creature racialtypes.2da catalog could not be resolved.",
          );
        case "source_unavailable":
        case "draft_source_changed":
        case "compile_source_changed":
        case "race_row_changed":
          throw compilerError(
            "AREA_UPDATE_SOURCE_STALE",
            409,
            "The effective Creature racialtypes.2da source changed.",
          );
      }
    }
  }

  private async validateStoreRestrictionMutations(
    mutations: readonly ExistingAreaObjectPropertyMutation[],
    telemetryProfiles: readonly Readonly<{
      entryCount: number;
      changedListCount: number;
    }>[],
    startedAt: number,
  ): Promise<void> {
    const restrictions = mutations.flatMap((mutation) =>
      mutation.kind === "store" && mutation.restrictions
        ? [mutation.restrictions]
        : []);
    if (restrictions.length === 0) return;
    const emitBindingFailure = (resultCode: string): void => {
      this.emitStoreRestrictionsTelemetryBatch(telemetryProfiles, {
        operation: "bind_catalog",
        outcome: "failed",
        resultCode,
        durationMs: elapsedMilliseconds(startedAt),
      });
    };
    const resolveTable = this.dependencies.appearanceCatalog
      .resolveEffectiveItemBaseItemsTwoDaTable;
    if (!resolveTable) {
      emitBindingFailure("catalog_unavailable");
      throw compilerError(
        "AREA_UPDATE_STORAGE_UNAVAILABLE",
        503,
        "The authoritative baseitems.2da catalog is unavailable.",
      );
    }
    let table;
    try {
      table = await resolveTable.call(this.dependencies.appearanceCatalog);
    } catch (error) {
      emitBindingFailure("catalog_unavailable");
      throw compilerError(
        "AREA_UPDATE_STORAGE_UNAVAILABLE",
        503,
        "The authoritative baseitems.2da catalog could not be resolved.",
        [errorMessage(error)],
      );
    }
    if (!table) {
      emitBindingFailure("catalog_stale");
      throw compilerError(
        "AREA_UPDATE_SOURCE_STALE",
        409,
        "The effective baseitems.2da source is no longer available.",
        ["actual=missing"],
      );
    }
    if (!isExactEffectiveItemBaseItemsTwoDaTable(table)) {
      emitBindingFailure("catalog_invalid");
      throw compilerError(
        "AREA_UPDATE_STORAGE_UNAVAILABLE",
        503,
        "The authoritative baseitems.2da catalog returned inconsistent data.",
      );
    }
    for (const restriction of restrictions) {
      if (table.descriptor.sha256 !== restriction.tableSha256 ||
        table.descriptor.rowCount !== restriction.tableRowCount) {
        emitBindingFailure("catalog_stale");
        throw compilerError(
          "AREA_UPDATE_SOURCE_STALE",
          409,
          "The effective baseitems.2da changed after the Store draft was opened.",
        );
      }
      const baseItemIds = [
        ...restriction.expectedValue.willNotBuy.baseItemIds,
        ...restriction.expectedValue.willOnlyBuy.baseItemIds,
        ...restriction.value.willNotBuy,
        ...restriction.value.willOnlyBuy,
      ];
      if (baseItemIds.some((baseItemId) =>
        table.rows[baseItemId]?.rowIndex !== baseItemId)) {
        emitBindingFailure("catalog_stale");
        throw compilerError(
          "AREA_UPDATE_SOURCE_STALE",
          409,
          "A Store restriction BaseItem row changed after the draft was opened.",
        );
      }
    }
    this.emitStoreRestrictionsTelemetryBatch(telemetryProfiles, {
      operation: "bind_catalog",
      outcome: "succeeded",
      resultCode: "catalog_bound",
      durationMs: elapsedMilliseconds(startedAt),
    });
  }

  private async validateStoreInventoryMutations(
    mutations: readonly ExistingAreaObjectPropertyMutation[],
    telemetryProfiles: readonly Readonly<{
      bucketCount: number;
      entryCount: number;
      changedEntryCount: number;
    }>[],
    startedAt: number,
  ): Promise<void> {
    const inventories = mutations.flatMap((mutation) =>
      mutation.kind === "store" && mutation.inventory ? [mutation.inventory] : []);
    if (inventories.length === 0) return;
    const emitFailure = (operation: "bind_catalog" | "pack", resultCode: string): void => {
      this.emitStoreInventoryTelemetryBatch(telemetryProfiles, {
        operation,
        outcome: "failed",
        resultCode,
        durationMs: elapsedMilliseconds(startedAt),
      });
    };
    const resolveTable = this.dependencies.appearanceCatalog
      .resolveEffectiveItemBaseItemsTwoDaTable;
    if (!resolveTable) {
      emitFailure("bind_catalog", "catalog_unavailable");
      throw compilerError(
        "AREA_UPDATE_STORAGE_UNAVAILABLE",
        503,
        "The authoritative baseitems.2da catalog is unavailable.",
      );
    }
    let table;
    try {
      table = await resolveTable.call(this.dependencies.appearanceCatalog);
    } catch (error) {
      emitFailure("bind_catalog", "catalog_unavailable");
      throw compilerError(
        "AREA_UPDATE_STORAGE_UNAVAILABLE",
        503,
        "The authoritative baseitems.2da catalog could not be resolved.",
        [errorMessage(error)],
      );
    }
    if (!table) {
      emitFailure("bind_catalog", "catalog_stale");
      throw compilerError(
        "AREA_UPDATE_SOURCE_STALE",
        409,
        "The effective baseitems.2da source is no longer available.",
        ["actual=missing"],
      );
    }
    if (!isExactEffectiveItemBaseItemsTwoDaTable(table)) {
      emitFailure("bind_catalog", "catalog_invalid");
      throw compilerError(
        "AREA_UPDATE_STORAGE_UNAVAILABLE",
        503,
        "The authoritative baseitems.2da catalog returned inconsistent data.",
      );
    }
    for (const inventory of inventories) {
      if (table.descriptor.sha256 !== inventory.tableSha256 ||
        table.descriptor.rowCount !== inventory.tableRowCount ||
        inventory.expectedBuckets.some((bucket) => bucket.entries.some((entry) => {
          const row = table.rows[entry.baseItemId];
          return row?.rowIndex !== entry.baseItemId || row.invSlotWidth !== entry.slotWidth ||
            row.invSlotHeight !== entry.slotHeight;
        }))) {
        emitFailure("bind_catalog", "catalog_stale");
        throw compilerError(
          "AREA_UPDATE_SOURCE_STALE",
          409,
          "The effective baseitems.2da inventory dimensions changed after the Store draft was opened.",
        );
      }
      if (!packAreaStoreInventoryBuckets(inventory.expectedBuckets, inventory.buckets)) {
        emitFailure("pack", "repository_capacity_exceeded");
        throw compilerError(
          "AREA_UPDATE_OBJECT_MUTATION_INVALID",
          422,
          "The retained Store inventory cannot be packed into the native repository budget.",
        );
      }
    }
    this.emitStoreInventoryTelemetryBatch(telemetryProfiles, {
      operation: "bind_catalog",
      outcome: "succeeded",
      resultCode: "catalog_bound",
      durationMs: elapsedMilliseconds(startedAt),
    });
  }

  private async validateItemBaseAppearanceMutations(
    mutations: readonly ExistingAreaObjectPropertyMutation[],
  ): Promise<void> {
    const itemMutations = mutations.flatMap((mutation) =>
      mutation.kind === "item" && mutation.baseAppearance
        ? [mutation.baseAppearance]
        : []);
    if (itemMutations.length === 0) return;
    const resolveTable = this.dependencies.appearanceCatalog
      .resolveEffectiveItemBaseItemsTwoDaTable;
    if (!resolveTable) {
      throw compilerError(
        "AREA_UPDATE_STORAGE_UNAVAILABLE",
        503,
        "The authoritative baseitems.2da catalog is unavailable.",
      );
    }
    let table;
    try {
      table = await resolveTable.call(this.dependencies.appearanceCatalog);
    } catch (error) {
      throw compilerError(
        "AREA_UPDATE_STORAGE_UNAVAILABLE",
        503,
        "The authoritative baseitems.2da catalog could not be resolved.",
        [errorMessage(error)],
      );
    }
    if (!table) {
      throw compilerError(
        "AREA_UPDATE_SOURCE_STALE",
        409,
        "The effective baseitems.2da source is no longer available.",
        ["actual=missing"],
      );
    }
    if (!isExactEffectiveItemBaseItemsTwoDaTable(table)) {
      throw compilerError(
        "AREA_UPDATE_STORAGE_UNAVAILABLE",
        503,
        "The authoritative baseitems.2da catalog returned inconsistent data.",
      );
    }
    for (const mutation of itemMutations) {
      if (table.descriptor.sha256 !== mutation.tableSha256 ||
        table.descriptor.rowCount !== mutation.tableRowCount) {
        throw compilerError(
          "AREA_UPDATE_SOURCE_STALE",
          409,
          "The effective baseitems.2da changed after the draft was opened.",
        );
      }
      for (const value of [mutation.expectedValue, mutation.value]) {
        const row = table.rows[value.baseItem];
        if (!row || row.rowIndex !== value.baseItem || row.modelType !== value.modelType) {
          throw compilerError(
            "AREA_UPDATE_SOURCE_STALE",
            409,
            "The effective BaseItem row or ModelType changed after the draft was opened.",
          );
        }
      }
    }
  }

  private async validatePlaceableTrapTypeMutations(
    mutations: readonly ExistingAreaObjectPropertyMutation[],
  ): Promise<void> {
    const trapTypes = mutations.flatMap((mutation) =>
      mutation.kind === "placeable" && mutation.trapType ? [mutation.trapType] : []);
    if (trapTypes.length === 0) return;
    const resolveTable = this.dependencies.appearanceCatalog.resolveEffectiveTrapsTwoDaTable;
    if (!resolveTable) {
      throw compilerError(
        "AREA_UPDATE_STORAGE_UNAVAILABLE",
        503,
        "The authoritative traps.2da catalog is unavailable.",
      );
    }
    let table;
    try {
      table = await resolveTable.call(this.dependencies.appearanceCatalog);
    } catch (error) {
      throw compilerError(
        "AREA_UPDATE_STORAGE_UNAVAILABLE",
        503,
        "The authoritative traps.2da catalog could not be resolved.",
        [errorMessage(error)],
      );
    }
    if (!table) {
      throw compilerError(
        "AREA_UPDATE_SOURCE_STALE",
        409,
        "The effective traps.2da source is no longer available.",
        ["actual=missing"],
      );
    }
    for (const trapType of trapTypes) {
      if (table.descriptor.sha256 !== trapType.tableSha256) {
        throw compilerError(
          "AREA_UPDATE_SOURCE_STALE",
          409,
          "The effective traps.2da changed after the draft was opened.",
          [`expected=${trapType.tableSha256}`, `actual=${table.descriptor.sha256}`],
        );
      }
      if (table.descriptor.rowCount !== trapType.tableRowCount) {
        throw compilerError(
          "AREA_UPDATE_SOURCE_STALE",
          409,
          "The effective traps.2da row count changed after the draft was opened.",
          [`expected=${trapType.tableRowCount}`, `actual=${table.descriptor.rowCount}`],
        );
      }
    }
    if (!isExactEffectiveTrapsTwoDaResolvedTable(table)) {
      throw compilerError(
        "AREA_UPDATE_STORAGE_UNAVAILABLE",
        503,
        "The authoritative traps.2da catalog returned inconsistent data.",
      );
    }
  }

  private async validateBodyBagMutations(
    mutations: readonly ExistingAreaObjectPropertyMutation[],
  ): Promise<void> {
    const bodyBags = mutations.flatMap((mutation) =>
      (mutation.kind === "placeable" || mutation.kind === "creature") && mutation.bodyBag
        ? [mutation.bodyBag]
        : []);
    if (bodyBags.length === 0) return;
    const resolveTable = this.dependencies.appearanceCatalog.resolveEffectiveBodyBagTwoDaTable;
    if (!resolveTable) {
      throw compilerError(
        "AREA_UPDATE_STORAGE_UNAVAILABLE",
        503,
        "The authoritative bodybag.2da catalog is unavailable.",
      );
    }
    let table;
    try {
      table = await resolveTable.call(this.dependencies.appearanceCatalog);
    } catch (error) {
      throw compilerError(
        "AREA_UPDATE_STORAGE_UNAVAILABLE",
        503,
        "The authoritative bodybag.2da catalog could not be resolved.",
        [errorMessage(error)],
      );
    }
    if (!table) {
      throw compilerError(
        "AREA_UPDATE_SOURCE_STALE",
        409,
        "The effective bodybag.2da source is no longer available.",
        ["actual=missing"],
      );
    }
    if (!isExactEffectiveBodyBagTwoDaResolvedTable(table)) {
      throw compilerError(
        "AREA_UPDATE_STORAGE_UNAVAILABLE",
        503,
        "The authoritative bodybag.2da catalog returned inconsistent data.",
      );
    }
    for (const bodyBag of bodyBags) {
      if (table.descriptor.sha256 !== bodyBag.tableSha256) {
        throw compilerError(
          "AREA_UPDATE_SOURCE_STALE",
          409,
          "The effective bodybag.2da changed after the draft was opened.",
          [`expected=${bodyBag.tableSha256}`, `actual=${table.descriptor.sha256}`],
        );
      }
      if (table.descriptor.rowCount !== bodyBag.tableRowCount) {
        throw compilerError(
          "AREA_UPDATE_SOURCE_STALE",
          409,
          "The effective bodybag.2da row count changed after the draft was opened.",
          [`expected=${bodyBag.tableRowCount}`, `actual=${table.descriptor.rowCount}`],
        );
      }
    }
  }

  private async validatePlaceablePortraitMutations(
    mutations: readonly ExistingAreaObjectPropertyMutation[],
  ): Promise<void> {
    const portraits = mutations.flatMap((mutation) =>
      mutation.kind === "placeable" && mutation.portrait ? [mutation.portrait] : []);
    if (portraits.length === 0) return;
    const resolveTable = this.dependencies.appearanceCatalog.resolveEffectivePortraitsTwoDaTable;
    if (!resolveTable) {
      throw compilerError(
        "AREA_UPDATE_STORAGE_UNAVAILABLE",
        503,
        "The authoritative portraits.2da catalog is unavailable.",
      );
    }
    let table;
    try {
      table = await resolveTable.call(this.dependencies.appearanceCatalog);
    } catch (error) {
      throw compilerError(
        "AREA_UPDATE_STORAGE_UNAVAILABLE",
        503,
        "The authoritative portraits.2da catalog could not be resolved.",
        [errorMessage(error)],
      );
    }
    if (!table) {
      throw compilerError(
        "AREA_UPDATE_SOURCE_STALE",
        409,
        "The effective portraits.2da source is no longer available.",
        ["actual=missing"],
      );
    }
    if (!isExactEffectivePortraitsTwoDaTable(table)) {
      throw compilerError(
        "AREA_UPDATE_STORAGE_UNAVAILABLE",
        503,
        "The authoritative portraits.2da catalog returned inconsistent data.",
      );
    }
    const selectableRows = new Set(table.rows.map((row) => row.rowIndex));
    for (const portrait of portraits) {
      if (table.descriptor.sha256 !== portrait.tableSha256) {
        throw compilerError(
          "AREA_UPDATE_SOURCE_STALE",
          409,
          "The effective portraits.2da changed after the draft was opened.",
          [`expected=${portrait.tableSha256}`, `actual=${table.descriptor.sha256}`],
        );
      }
      if (table.descriptor.rowCount !== portrait.tableRowCount) {
        throw compilerError(
          "AREA_UPDATE_SOURCE_STALE",
          409,
          "The effective portraits.2da row count changed after the draft was opened.",
          [`expected=${portrait.tableRowCount}`, `actual=${table.descriptor.rowCount}`],
        );
      }
      for (const rowIndex of [portrait.expectedValue, portrait.value]) {
        if (!selectableRows.has(rowIndex)) {
          throw compilerError(
            "AREA_UPDATE_OBJECT_MUTATION_INVALID",
            422,
            "The selected Placeable portrait row is not selectable in the authoritative portraits.2da.",
            [`PortraitId=${rowIndex}:not_selectable`],
          );
        }
      }
    }
  }

  private async validateFactionMutations(
    mutations: readonly ExistingAreaObjectPropertyMutation[],
  ): Promise<void> {
    const factions = mutations.flatMap((mutation) =>
      (mutation.kind === "placeable" || mutation.kind === "creature"
        || mutation.kind === "encounter") && mutation.faction
        ? [{ kind: mutation.kind, value: mutation.faction }]
        : []);
    if (factions.length === 0) return;
    const resolveCatalog = this.dependencies.appearanceCatalog.resolveModuleFactionCatalog;
    if (!resolveCatalog) {
      throw compilerError(
        "AREA_UPDATE_STORAGE_UNAVAILABLE",
        503,
        "The authoritative module repute.fac catalog is unavailable.",
      );
    }
    let catalog;
    try {
      catalog = await resolveCatalog.call(this.dependencies.appearanceCatalog);
    } catch (error) {
      throw compilerError(
        "AREA_UPDATE_STORAGE_UNAVAILABLE",
        503,
        "The authoritative module repute.fac catalog could not be resolved.",
        [errorMessage(error)],
      );
    }
    if (!catalog) {
      throw compilerError(
        "AREA_UPDATE_SOURCE_STALE",
        409,
        "The module repute.fac source is no longer available.",
        ["actual=missing"],
      );
    }
    if (!isExactModuleFactionCatalog(catalog)) {
      throw compilerError(
        "AREA_UPDATE_STORAGE_UNAVAILABLE",
        503,
        "The authoritative module repute.fac catalog returned inconsistent data.",
      );
    }
    const factionIds = new Set(catalog.rows.map((row) => row.factionId));
    for (const selected of factions) {
      const faction = selected.value;
      if (catalog.descriptor.sha256 !== faction.catalogSha256) {
        throw compilerError(
          "AREA_UPDATE_SOURCE_STALE",
          409,
          "The module repute.fac changed after the draft was opened.",
          [`expected=${faction.catalogSha256}`, `actual=${catalog.descriptor.sha256}`],
        );
      }
      if (catalog.descriptor.factionCount !== faction.catalogFactionCount) {
        throw compilerError(
          "AREA_UPDATE_SOURCE_STALE",
          409,
          "The module faction count changed after the draft was opened.",
          [`expected=${faction.catalogFactionCount}`, `actual=${catalog.descriptor.factionCount}`],
        );
      }
      for (const factionId of [faction.expectedValue, faction.value]) {
        if (!factionIds.has(factionId)) {
          throw compilerError(
            "AREA_UPDATE_OBJECT_MUTATION_INVALID",
            422,
            `The selected ${selected.kind === "creature"
              ? "Creature"
              : selected.kind === "encounter"
                ? "Encounter"
                : "Placeable"} faction is absent from the authoritative repute.fac.`,
            [`Faction=${factionId}:not_selectable`],
          );
        }
      }
    }
  }

  private async validateEncounterDifficultyMutations(
    mutations: readonly ExistingAreaObjectPropertyMutation[],
  ): Promise<void> {
    const difficulties = mutations.flatMap((mutation) =>
      mutation.kind === "encounter" && mutation.difficulty
        ? [mutation.difficulty]
        : []);
    if (difficulties.length === 0) return;
    const resolveCatalog = this.dependencies.appearanceCatalog
      .resolveEffectiveAreaEncounterDifficultyCatalog;
    if (!resolveCatalog) {
      throw compilerError(
        "AREA_UPDATE_STORAGE_UNAVAILABLE",
        503,
        "The authoritative Encounter encdifficulty.2da catalog is unavailable.",
      );
    }
    let catalog;
    try {
      catalog = await resolveCatalog.call(this.dependencies.appearanceCatalog);
    } catch (error) {
      throw compilerError(
        "AREA_UPDATE_STORAGE_UNAVAILABLE",
        503,
        "The authoritative Encounter encdifficulty.2da catalog could not be resolved.",
        [errorMessage(error)],
      );
    }
    if (!catalog) {
      throw compilerError(
        "AREA_UPDATE_SOURCE_STALE",
        409,
        "The Encounter encdifficulty.2da source is no longer available.",
        ["actual=missing"],
      );
    }
    if (!isExactEffectiveAreaEncounterDifficultyCatalog(catalog)) {
      throw compilerError(
        "AREA_UPDATE_STORAGE_UNAVAILABLE",
        503,
        "The authoritative Encounter encdifficulty.2da catalog returned inconsistent data.",
      );
    }
    for (const difficulty of difficulties) {
      if (catalog.descriptor.sha256 !== difficulty.catalogSha256) {
        throw compilerError(
          "AREA_UPDATE_SOURCE_STALE",
          409,
          "The Encounter encdifficulty.2da changed after the draft was opened.",
          [`expected=${difficulty.catalogSha256}`, `actual=${catalog.descriptor.sha256}`],
        );
      }
      if (catalog.descriptor.rowCount !== difficulty.catalogRowCount) {
        throw compilerError(
          "AREA_UPDATE_SOURCE_STALE",
          409,
          "The Encounter difficulty row count changed after the draft was opened.",
          [`expected=${difficulty.catalogRowCount}`, `actual=${catalog.descriptor.rowCount}`],
        );
      }
      for (const pair of [difficulty.expectedValue, difficulty.value]) {
        const row = catalog.rows[pair.difficultyIndex];
        if (!row || row.value !== pair.difficulty) {
          throw compilerError(
            "AREA_UPDATE_OBJECT_MUTATION_INVALID",
            422,
            "The selected Encounter difficulty pair is absent from the authoritative encdifficulty.2da.",
            [
              `Difficulty=${pair.difficulty}`,
              `DifficultyIndex=${pair.difficultyIndex}:not_selectable`,
            ],
          );
        }
      }
    }
  }
}

function resource(
  descriptor: ModuleSnapshotObjectDescriptor,
  extension: AreaCreateResourceExtension,
  bytes: Buffer,
): AreaCreateCandidateResource {
  const retained = Buffer.from(bytes);
  return Object.freeze({
    extension,
    key: descriptor.logicalKey,
    fileName: descriptor.logicalKey,
    resourceType: descriptor.resourceType,
    bytes: retained,
    size: retained.length,
    sha256: sha256Hex(retained),
  });
}

function aggregateBlueprintSources(
  additions: readonly NewAreaObjectAddition[],
  propertyMutations: readonly ExistingAreaObjectPropertyMutation[] = [],
): AreaUpdateObjectMutationSummary["blueprintSources"] {
  const aggregates = new Map<string, {
    sourceProfileId: string;
    templateResRef: string;
    sourceSha256: string;
    dependencyCount?: number;
    dependencySetSha256?: string;
    addedCount: number;
  }>();
  const retain = (addition: Readonly<{
    kind: NewAreaObjectAddition["kind"];
    sourceProfileId: string;
    templateResRef: string;
    sourceSha256: string;
    blueprintDependencies?: readonly Readonly<{
      templateResRef: string;
      resourceType: number;
      sha256: string;
    }>[];
  }>) => {
    const templateResRef = addition.templateResRef;
    if (!templateResRef) {
      throw compilerError(
        "AREA_UPDATE_OBJECT_MUTATION_INVALID",
        422,
        "Blueprint source summary identity is incomplete.",
      );
    }
    const key = `${addition.kind}|${addition.sourceProfileId}|${templateResRef}|${addition.sourceSha256}`;
    const retained = aggregates.get(key);
    aggregates.set(key, retained
      ? { ...retained, addedCount: retained.addedCount + 1 }
      : {
          sourceProfileId: addition.sourceProfileId,
          templateResRef,
          sourceSha256: addition.sourceSha256,
          ...(addition.kind === "store"
            ? addition.sourceProfileId === AREA_STORE_DYNAMIC_CONSTRUCTION_PROFILE.id
              ? {
                  dependencyCount: addition.blueprintDependencies?.length ?? 0,
                  dependencySetSha256: hashAreaStoreConstructionDependencies(
                    addition.blueprintDependencies ?? [],
                  ),
                }
              : {
                  dependencyCount: AREA_STORE_CONSTRUCTION_PROFILE.dependencyCount,
                  dependencySetSha256: AREA_STORE_CONSTRUCTION_PROFILE.dependencySetSha256,
                }
            : addition.kind === "encounter" &&
                addition.sourceProfileId === AREA_ENCOUNTER_DYNAMIC_CONSTRUCTION_PROFILE.id
              ? { dependencyCount: 0 }
            : addition.kind === "waypoint" &&
                addition.sourceProfileId === AREA_WAYPOINT_DYNAMIC_CONSTRUCTION_PROFILE.id
              ? { dependencyCount: 0 }
            : addition.kind === "door" ? {
            dependencyCount: 1,
            dependencySetSha256: AREA_DOOR_CONSTRUCTION_PROFILE.hook.tilesetSha256,
          } : {}),
          addedCount: 1,
        });
  };
  for (const addition of additions) {
    retain(addition);
  }
  for (const mutation of propertyMutations) {
    if (mutation.kind !== "placeable" && mutation.kind !== "creature") continue;
    for (const entry of mutation.inventory?.entries ?? []) {
      if (!("itemSourceObjectKey" in entry)) continue;
      retain({
        kind: "item",
        sourceProfileId: entry.itemSourceObjectKey,
        templateResRef: entry.itemResRef,
        sourceSha256: entry.itemSourceFingerprint,
      });
    }
  }
  return Object.freeze([...aggregates.values()].map((entry) => Object.freeze(entry)));
}

function findDescriptor(
  manifest: ModuleSnapshotManifest,
  logicalKey: string,
): ModuleSnapshotObjectDescriptor | undefined {
  const target = logicalKey.toLowerCase();
  return manifest.objects.find((entry) => entry.logicalKey.toLowerCase() === target);
}

function mapDraftError(error: unknown): AreaUpdateCompilerFailure {
  if (error instanceof AreaDraftRepositoryError) {
    if (error.code === "AREA_DRAFT_NOT_FOUND") {
      return compilerError(
        "AREA_UPDATE_DRAFT_NOT_FOUND",
        404,
        "The requested retained draft revision was not found.",
      );
    }
    if (error.code === "AREA_DRAFT_REVISION_CONFLICT") {
      return compilerError(
        "AREA_UPDATE_DRAFT_REVISION_CONFLICT",
        412,
        "The requested retained draft revision is stale.",
      );
    }
  }
  return compilerError(
    "AREA_UPDATE_STORAGE_UNAVAILABLE",
    503,
    "Area draft storage is unavailable.",
    [errorMessage(error)],
  );
}

function mapWriterError(error: unknown): AreaUpdateCompilerFailure {
  if (error instanceof AppException) {
    if (error.code === "AREA_SOURCE_MISSING") {
      return compilerError("AREA_UPDATE_SOURCE_MISSING", 404, "The source ARE is missing.");
    }
    if (error.code === "AREA_FINGERPRINT_MISMATCH") {
      return compilerError(
        "AREA_UPDATE_SOURCE_STALE",
        409,
        "The source ARE changed after the draft was opened.",
      );
    }
    if (error.code === "TILESET_FINGERPRINT_MISMATCH") {
      return compilerError(
        "AREA_UPDATE_TILESET_STALE",
        409,
        "The SET source changed after the draft was opened.",
      );
    }
    if (
      error.code === "AREA_PRESERVE_UNAVAILABLE" ||
      error.code === "INVALID_AREA_TOPOLOGY"
    ) {
      return compilerError("AREA_UPDATE_CANDIDATE_INVALID", 422, error.message);
    }
  }
  return compilerError(
    "AREA_UPDATE_STORAGE_UNAVAILABLE",
    503,
    "The preserve-first ARE writer failed.",
    [errorMessage(error)],
  );
}

function mapObjectMutationError(error: unknown): AreaUpdateCompilerFailure {
  if (error instanceof AreaUpdateCompilerFailure) {
    return error;
  }
  if (error instanceof AreaObjectBlueprintSourceError) {
    return error.code === "AREA_OBJECT_BLUEPRINT_SOURCE_INVALID"
      ? compilerError(
          "AREA_UPDATE_OBJECT_MUTATION_INVALID",
          422,
          error.message,
          error.diagnostics,
        )
      : compilerError(
          "AREA_UPDATE_STORAGE_UNAVAILABLE",
          503,
          error.message,
          error.diagnostics,
        );
  }
  if (error instanceof AreaExistingObjectDeletionPlanError) {
    if (
      error.message ===
        "The exact source GIT/GIC pair cannot be parsed as paired Area object resources." &&
      error.details.length === 0
    ) {
      return compilerError(
        "AREA_UPDATE_COMPANION_MISMATCH",
        409,
        "Area GIT/GIC does not satisfy the canonical nine-family paired profile.",
      );
    }
    return compilerError(
      "AREA_UPDATE_OBJECT_MUTATION_INVALID",
      422,
      error.message,
      error.details,
    );
  }
  if (error instanceof AreaObjectPairMutationError) {
    return compilerError(
      error.code,
      error.code === "AREA_UPDATE_COMPANION_MISMATCH" ? 409 : 422,
      error.message,
      error.diagnostics,
    );
  }
  return compilerError(
    "AREA_UPDATE_STORAGE_UNAVAILABLE",
    503,
    "The paired GIT/GIC object mutation failed.",
    [errorMessage(error)],
  );
}

function compilerError(
  code: AreaUpdateCompilerFailureCode,
  status: number,
  message: string,
  details: readonly string[] = [],
): AreaUpdateCompilerFailure {
  return new AreaUpdateCompilerFailure(code, status, message, Object.freeze([...details]));
}

function sha256Hex(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function dynamicItemTelemetryProfile(
  profile: DynamicItemBlueprintResolution,
): Pick<
  AreaDynamicItemBlueprintCopyTelemetryEvent,
  "modelType" | "propertyCount" | "variableCount" | "nestedInventoryState"
> {
  return {
    modelType: profile.modelType,
    propertyCount: profile.propertyCount,
    variableCount: profile.variableCount,
    nestedInventoryState: profile.nestedInventoryState,
  };
}

function listEntryCount(
  fields: NonNullable<ReturnType<typeof parseRawGffDocument>>["fields"],
  label: string,
): number {
  const matches = fields.filter((field) => field.label === label);
  return matches.length === 1 && matches[0]?.type === "list"
    ? matches[0].value.length
    : 0;
}

function dynamicItemNestedInventoryState(
  fields: NonNullable<ReturnType<typeof parseRawGffDocument>>["fields"],
): "absent" | "empty" | "expanded" | "blocked" {
  const matches = fields.filter(
    (field) => field.label === "ItemList" || field.label === "Equip_ItemList",
  );
  if (matches.length === 0) return "absent";
  if (matches.some((field) => field.type !== "list")) return "blocked";
  return matches.every((field) => field.type === "list" && field.value.length === 0)
    ? "empty"
    : "expanded";
}

function parseDynamicItemDependencyBaseItem(dependency: Readonly<{
  templateResRef: string;
  resourceType: number;
  sha256: string;
  bytes: Buffer;
}>): number | null {
  const profile = AREA_ITEM_DYNAMIC_CONSTRUCTION_PROFILE;
  if (!/^[a-z0-9_]{1,16}$/u.test(dependency.templateResRef) ||
    dependency.resourceType !== profile.resourceType ||
    !/^[a-f0-9]{64}$/u.test(dependency.sha256) ||
    !Buffer.isBuffer(dependency.bytes) || dependency.bytes.length < 1 ||
    dependency.bytes.length > profile.maxSourceBytes ||
    sha256Hex(dependency.bytes) !== dependency.sha256) {
    return null;
  }
  const document = parseRawGffDocument(dependency.bytes);
  if (!document || document.fileType !== profile.fileType ||
    document.fileVersion !== profile.fileVersion ||
    document.rootStructTypeId !== profile.rootStructTypeId) {
    return null;
  }
  const templates = document.fields.filter((field) => field.label === "TemplateResRef");
  const baseItems = document.fields.filter((field) => field.label === "BaseItem");
  const baseItem = baseItems[0];
  if (templates.length !== 1 || templates[0]?.type !== "resref" ||
    templates[0].value !== dependency.templateResRef ||
    baseItems.length !== 1 || baseItem?.type !== "int" ||
    !Number.isSafeInteger(baseItem.value) || baseItem.value < 0) {
    return null;
  }
  return baseItem.value;
}

function elapsedMilliseconds(startedAt: number): number {
  return Math.max(0, Date.now() - startedAt);
}

function changedVariableEntryCount(
  expectedEntries: readonly Readonly<{
    name: string;
    type: "int" | "float" | "string";
    value: number | string;
  }>[],
  entries: readonly Readonly<{
    name: string;
    type: "int" | "float" | "string";
    value: number | string;
  }>[],
): number {
  const comparedLength = Math.max(expectedEntries.length, entries.length);
  let changed = 0;
  for (let index = 0; index < comparedLength; index += 1) {
    const expected = expectedEntries[index];
    const target = entries[index];
    if (!expected || !target || expected.name !== target.name ||
      expected.type !== target.type || !Object.is(expected.value, target.value)) {
      changed += 1;
    }
  }
  return changed;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
