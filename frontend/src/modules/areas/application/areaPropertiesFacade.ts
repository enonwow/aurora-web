import type { AreaScene, SceneAreaGlobalLighting } from "../../scene/contracts";
import {
  MAX_AREA_COMMENTS_CODE_UNITS,
  isAreaCommentsValue,
  type ExistingAreaCommentsMutation,
} from "../domain/areaComments";
import {
  AREA_EVENT_SCRIPT_FIELDS,
  isAreaEventScriptResRef,
  type AreaEventScriptSlot,
  type ExistingAreaEventScriptMutations,
} from "../domain/areaEventScripts";
import {
  areaNameStorageEntriesEqual,
  areaNameStorageEntryIdentifiersFormAdmittedTarget,
  areaNameStorageProfileForEntries,
  cloneAreaNameStorageEntries,
  isAreaNameStorageProfile,
  isEditableAreaName,
  isEditableAreaTag,
  readEditableAreaNameEntries,
  type EditableAreaNameStorageEntry,
  type AreaNameStorageProfile,
  type ExistingAreaBasicIdentityMutations,
} from "../domain/areaBasicIdentity";
import {
  isAreaAdvancedFlags,
  isAreaCheckModifier,
  isAreaLoadingScreenId,
  isAreaPlayerVsPlayerMode,
  isAreaTerrainTypeFlags,
  terrainTypeFlagsEqual,
  type AreaPlayerVsPlayerMode,
  type AreaTerrainTypeFlags,
  type ExistingAreaAdvancedFlagMutations,
} from "../domain/areaAdvancedFlags";
import {
  areaModuleStartLocationsEqual,
  isAreaModuleStartLocation,
  normalizeAreaModuleStartLocation,
  readModuleStartLocationTargets,
  type AreaModuleStartLocation,
  type ExistingAreaModuleStartLocationMutation,
} from "../domain/areaModuleStartLocation";
import {
  areaAudioEnvironmentsEqual,
  isAreaAudioEnvironment,
  type AreaAudioEnvironment,
  type ExistingAreaAudioEnvironmentMutation,
} from "../domain/areaAudioEnvironment";
import {
  AREA_VISUAL_ENVIRONMENT_LIGHTING_FIELD_NAMES,
  areaVisualEnvironmentsEqual,
  cloneAreaVisualEnvironment,
  isAreaVisualEnvironment,
  toAreaVisualEnvironmentLightingFields,
  type AreaVisualEnvironment,
  type ExistingAreaVisualEnvironmentMutation,
} from "../domain/areaVisualEnvironment";
import {
  areaVisualEnvironmentScalarControlsEqual,
  cloneAreaVisualEnvironmentScalarControls,
  isAreaVisualEnvironmentScalarControls,
  toAreaVisualEnvironmentScalarLightingFields,
  type AreaVisualEnvironmentScalarControls,
  type ExistingAreaVisualEnvironmentScalarControlsMutation,
} from "../domain/areaVisualEnvironmentScalarControls";
import {
  cloneEffectiveAreaAudioCatalogBundle,
  isEffectiveAreaAudioCatalogBundle,
  type EffectiveAreaAudioCatalogBundle,
} from "../domain/effectiveAreaAudioCatalog";
import {
  cloneEffectiveAreaLoadingScreenCatalog,
  isEffectiveAreaLoadingScreenCatalog,
  type EffectiveAreaLoadingScreenCatalog,
} from "../domain/effectiveAreaLoadingScreenCatalog";
import {
  cloneEffectiveAreaVisualEnvironmentCatalogBundle,
  isEffectiveAreaVisualEnvironmentCatalogBundle,
  type EffectiveAreaVisualEnvironmentCatalogBundle,
} from "../domain/effectiveAreaVisualEnvironmentCatalog";
import {
  areaVisualEnvironmentCatalogSelectionsEqual,
  cloneAreaVisualEnvironmentCatalogSelection,
  isAreaVisualEnvironmentCatalogSelection,
  type AreaVisualEnvironmentCatalogSelection,
} from "../domain/areaVisualEnvironmentCatalogSelection";
import {
  buildExistingAreaVisualEnvironmentCatalogSelectionMutation,
  type ExistingAreaVisualEnvironmentCatalogSelectionMutation,
} from "../domain/areaVisualEnvironmentCatalogSelectionMutation";
import {
  auroraVariableEntriesEqual,
  auroraVariableTargetEntriesEqual,
  readAuroraVariableProvenance,
  readAuroraVariableTargetEntries,
  type AuroraVariableTargetEntry,
} from "../../shared/domain/auroraVariableTable";
import type { ExistingAreaVariableMutation } from "../domain/areaVariableTable";

export interface AreaEventScriptDraftValue {
  readonly value: string;
  readonly state: "editable" | "preserve_only";
}

export interface AreaBasicIdentityDraftValue {
  readonly value: string;
  readonly state: "editable" | "preserve_only";
  readonly profile?: AreaNameStorageProfile;
  readonly entries?: readonly EditableAreaNameStorageEntry[];
}

export interface AreaAdvancedFlagDraftValue<T> {
  readonly value: T;
  readonly state: "editable" | "preserve_only";
}

export interface AreaPropertiesDraft {
  readonly comments: string;
  readonly commentsState: "editable" | "preserve_only";
  readonly maxCommentsCodeUnits: typeof MAX_AREA_COMMENTS_CODE_UNITS;
  readonly eventScripts?: Readonly<Record<AreaEventScriptSlot, AreaEventScriptDraftValue>>;
  readonly basicIdentity?: Readonly<{
    name: AreaBasicIdentityDraftValue;
    tag: AreaBasicIdentityDraftValue;
  }>;
  readonly advancedFlags?: Readonly<{
    terrainType: AreaAdvancedFlagDraftValue<AreaTerrainTypeFlags>;
    playerVsPlayer: AreaAdvancedFlagDraftValue<AreaPlayerVsPlayerMode>;
    noRest: AreaAdvancedFlagDraftValue<boolean>;
    listenCheckModifier: AreaAdvancedFlagDraftValue<number>;
    spotCheckModifier: AreaAdvancedFlagDraftValue<number>;
    loadingScreenId: AreaAdvancedFlagDraftValue<number>;
  }>;
  readonly moduleStartLocation?: Readonly<{
    value: AreaModuleStartLocation;
    sourceValue?: AreaModuleStartLocation;
    currentAreaResRef?: string;
    targetAreaResRefs?: readonly string[];
    state: "editable" | "preserve_only";
  }>;
  readonly visualEnvironment?: Readonly<{
    value: AreaVisualEnvironment;
    sourceValue?: AreaVisualEnvironment;
    state: "editable" | "preserve_only";
  }>;
  readonly visualEnvironmentScalarControls?: Readonly<{
    value: AreaVisualEnvironmentScalarControls;
    sourceValue?: AreaVisualEnvironmentScalarControls;
    state: "editable" | "preserve_only";
  }>;
  readonly audioEnvironment?: Readonly<{
    value: AreaAudioEnvironment;
    sourceValue?: AreaAudioEnvironment;
    catalogs?: EffectiveAreaAudioCatalogBundle;
    state: "editable" | "preserve_only";
  }>;
  readonly loadingScreenCatalog?: EffectiveAreaLoadingScreenCatalog;
  readonly visualEnvironmentCatalogs?: EffectiveAreaVisualEnvironmentCatalogBundle;
  readonly visualEnvironmentCatalogSelection?: Readonly<{
    value: AreaVisualEnvironmentCatalogSelection;
    sourceValue?: AreaVisualEnvironmentCatalogSelection;
    state: "editable" | "preserve_only";
  }>;
  readonly variables?: Readonly<{
    readonly value: readonly AuroraVariableTargetEntry[];
    readonly sourceValue?: readonly AuroraVariableTargetEntry[];
    readonly state: "editable" | "preserve_only";
  }>;
}

export type AreaPropertiesApplyResult =
  | Readonly<{ ok: true; changed: boolean; value: AreaScene }>
  | Readonly<{
      ok: false;
      error: Readonly<{
        code:
          | "AREA_COMMENTS_PRESERVE_ONLY"
          | "AREA_COMMENTS_INVALID"
          | "AREA_EVENT_SCRIPT_PRESERVE_ONLY"
          | "AREA_EVENT_SCRIPT_INVALID"
          | "AREA_BASIC_IDENTITY_PRESERVE_ONLY"
          | "AREA_BASIC_IDENTITY_INVALID"
          | "AREA_ADVANCED_FLAG_PRESERVE_ONLY"
          | "AREA_ADVANCED_FLAG_INVALID"
          | "AREA_START_LOCATION_PRESERVE_ONLY"
          | "AREA_START_LOCATION_INVALID"
          | "AREA_VISUAL_ENVIRONMENT_PRESERVE_ONLY"
          | "AREA_VISUAL_ENVIRONMENT_INVALID"
          | "AREA_VISUAL_ENVIRONMENT_SCALAR_CONTROLS_PRESERVE_ONLY"
          | "AREA_VISUAL_ENVIRONMENT_SCALAR_CONTROLS_INVALID"
          | "AREA_VISUAL_ENVIRONMENT_CATALOG_SELECTION_PRESERVE_ONLY"
          | "AREA_VISUAL_ENVIRONMENT_CATALOG_SELECTION_INVALID"
          | "AREA_AUDIO_ENVIRONMENT_PRESERVE_ONLY"
          | "AREA_AUDIO_ENVIRONMENT_INVALID"
          | "AREA_VARIABLES_PRESERVE_ONLY"
          | "AREA_VARIABLES_INVALID";
        path:
          | "areaComments"
          | `areaEventScripts.${AreaEventScriptSlot}`
          | "areaName"
          | "areaTag"
          | "areaAdvancedFlags.terrainType"
          | "areaAdvancedFlags.playerVsPlayer"
          | "areaAdvancedFlags.noRest"
          | "areaAdvancedFlags.listenCheckModifier"
          | "areaAdvancedFlags.spotCheckModifier"
          | "areaAdvancedFlags.loadingScreenId"
          | "moduleStartLocation"
          | "areaVisualEnvironment"
          | "areaVisualEnvironmentScalarControls"
          | "areaVisualEnvironmentCatalogSelection"
          | "areaAudioEnvironment"
          | "areaVariables";
        message: string;
      }>;
    }>;

export interface AreaPropertiesFacade {
  buildDraft(scene: AreaScene): AreaPropertiesDraft;
  buildMutation(scene: AreaScene, sourceArea: unknown): ExistingAreaCommentsMutation | undefined;
  buildEventScriptMutations(
    scene: AreaScene,
    sourceArea: unknown,
  ): ExistingAreaEventScriptMutations | undefined;
  buildBasicIdentityMutations(
    scene: AreaScene,
    sourceArea: unknown,
  ): ExistingAreaBasicIdentityMutations | undefined;
  buildAdvancedFlagMutations(
    scene: AreaScene,
    sourceArea: unknown,
  ): ExistingAreaAdvancedFlagMutations | undefined;
  buildModuleStartLocationMutation(
    scene: AreaScene,
    sourceArea: unknown,
  ): ExistingAreaModuleStartLocationMutation | undefined;
  buildVisualEnvironmentMutation(
    scene: AreaScene,
    sourceArea: unknown,
  ): ExistingAreaVisualEnvironmentMutation | undefined;
  buildVisualEnvironmentScalarControlsMutation(
    scene: AreaScene,
    sourceArea: unknown,
  ): ExistingAreaVisualEnvironmentScalarControlsMutation | undefined;
  buildVisualEnvironmentCatalogSelectionMutation(
    scene: AreaScene,
    sourceArea: unknown,
  ): ExistingAreaVisualEnvironmentCatalogSelectionMutation | undefined;
  buildAudioEnvironmentMutation(
    scene: AreaScene,
    sourceArea: unknown,
  ): ExistingAreaAudioEnvironmentMutation | undefined;
  buildVariableMutation(
    scene: AreaScene,
    sourceArea: unknown,
  ): ExistingAreaVariableMutation | undefined;
  apply(scene: AreaScene, draft: AreaPropertiesDraft): AreaPropertiesApplyResult;
}

export function createAreaPropertiesFacade(
  now: () => number = () => Date.now(),
): AreaPropertiesFacade {
  return Object.freeze({
    buildDraft(scene: AreaScene): AreaPropertiesDraft {
      const currentAreaResRef = scene.auroraAreaEditing?.state.areaResRef;
      const sourceStartLocationTargets = scene.moduleStartLocationTargets === undefined
        ? undefined
        : readModuleStartLocationTargets(scene.moduleStartLocationTargets) ?? undefined;
      const targetAreaResRefs = sourceStartLocationTargets
        ?? (scene.moduleStartLocationTargets === undefined && currentAreaResRef
          ? Object.freeze([currentAreaResRef])
          : undefined);
      const sourceStartLocation = isAreaModuleStartLocation(scene.moduleStartLocation)
        ? scene.moduleStartLocation
        : undefined;
      const sourceVisualEnvironment = isAreaVisualEnvironment(scene.areaVisualEnvironment)
        ? scene.areaVisualEnvironment
        : undefined;
      const sourceVisualEnvironmentScalarControls = isAreaVisualEnvironmentScalarControls(
        scene.areaVisualEnvironmentScalarControls,
      )
        ? scene.areaVisualEnvironmentScalarControls
        : undefined;
      const sourceAudioEnvironment = isAreaAudioEnvironment(scene.areaAudioEnvironment)
        ? scene.areaAudioEnvironment
        : undefined;
      const sourceAudioCatalogs = isEffectiveAreaAudioCatalogBundle(
        scene.areaAudioEnvironmentCatalogs,
      )
        ? cloneEffectiveAreaAudioCatalogBundle(scene.areaAudioEnvironmentCatalogs)
        : undefined;
      const sourceVisualEnvironmentCatalogs =
        isEffectiveAreaVisualEnvironmentCatalogBundle(scene.areaVisualEnvironmentCatalogs)
          ? cloneEffectiveAreaVisualEnvironmentCatalogBundle(
              scene.areaVisualEnvironmentCatalogs,
            )
          : undefined;
      const sourceVisualEnvironmentCatalogSelection =
        isAreaVisualEnvironmentCatalogSelection(scene.areaVisualEnvironmentCatalogSelection)
          ? cloneAreaVisualEnvironmentCatalogSelection(
              scene.areaVisualEnvironmentCatalogSelection,
            )
          : undefined;
      const sourceLoadingScreenCatalog = isEffectiveAreaLoadingScreenCatalog(
        scene.areaLoadingScreenCatalog,
      )
        ? cloneEffectiveAreaLoadingScreenCatalog(scene.areaLoadingScreenCatalog)
        : undefined;
      const sourceVariables = readAuroraVariableTargetEntries(scene.areaVariables);
      const sourceNameEntries = readEditableAreaNameEntries(
        scene.areaBasicIdentity?.nameEntries,
      );
      const variableValue = cloneVariableTargetEntries(sourceVariables ?? []);
      return Object.freeze({
        comments: scene.areaComments ?? "",
        commentsState: scene.areaComments === undefined ? "preserve_only" : "editable",
        maxCommentsCodeUnits: MAX_AREA_COMMENTS_CODE_UNITS,
        eventScripts: Object.fromEntries(AREA_EVENT_SCRIPT_FIELDS.map(({ slot }) => [
          slot,
          Object.freeze({
            value: scene.areaEventScripts?.[slot] ?? "",
            state: scene.areaEventScripts?.[slot] === undefined ? "preserve_only" : "editable",
          }),
        ])) as Record<AreaEventScriptSlot, AreaEventScriptDraftValue>,
        basicIdentity: {
          name: Object.freeze({
            value: scene.areaName,
            state: scene.areaBasicIdentity?.name === undefined
              || !isAreaNameStorageProfile(scene.areaBasicIdentity.nameProfile)
              ? "preserve_only"
              : "editable",
            ...(isAreaNameStorageProfile(scene.areaBasicIdentity?.nameProfile)
              ? { profile: scene.areaBasicIdentity.nameProfile }
              : {}),
            ...(sourceNameEntries
              ? { entries: cloneAreaNameStorageEntries(sourceNameEntries) }
              : {}),
          }),
          tag: Object.freeze({
            value: scene.areaTag ?? "",
            state: scene.areaBasicIdentity?.tag === undefined ? "preserve_only" : "editable",
          }),
        },
        advancedFlags: {
          terrainType: Object.freeze({
            value: scene.areaAdvancedFlags?.terrainType
              ? { ...scene.areaAdvancedFlags.terrainType }
              : { interior: false, natural: false, subterranean: false },
            state: scene.areaAdvancedFlags?.terrainType === undefined
              ? "preserve_only"
              : "editable",
          }),
          playerVsPlayer: Object.freeze({
            value: scene.areaAdvancedFlags?.playerVsPlayer ?? 0,
            state: scene.areaAdvancedFlags?.playerVsPlayer === undefined
              ? "preserve_only"
              : "editable",
          }),
          noRest: Object.freeze({
            value: scene.areaAdvancedFlags?.noRest ?? false,
            state: scene.areaAdvancedFlags?.noRest === undefined
              ? "preserve_only"
              : "editable",
          }),
          listenCheckModifier: Object.freeze({
            value: scene.areaAdvancedFlags?.listenCheckModifier ?? 0,
            state: scene.areaAdvancedFlags?.listenCheckModifier === undefined
              ? "preserve_only"
              : "editable",
          }),
          spotCheckModifier: Object.freeze({
            value: scene.areaAdvancedFlags?.spotCheckModifier ?? 0,
            state: scene.areaAdvancedFlags?.spotCheckModifier === undefined
              ? "preserve_only"
              : "editable",
          }),
          loadingScreenId: Object.freeze({
            value: scene.areaAdvancedFlags?.loadingScreenId ?? 0,
            state: scene.areaAdvancedFlags?.loadingScreenId === undefined
              ? "preserve_only"
              : "editable",
          }),
        },
        moduleStartLocation: Object.freeze({
          value: Object.freeze(sourceStartLocation
            ? { ...sourceStartLocation }
            : {
                areaResRef: "",
                x: 0,
                y: 0,
                z: 0,
                directionX: 0,
                directionY: 0,
              }),
          ...(sourceStartLocation
            ? { sourceValue: Object.freeze({ ...sourceStartLocation }) }
            : {}),
          ...(currentAreaResRef ? { currentAreaResRef } : {}),
          ...(targetAreaResRefs
            ? { targetAreaResRefs: Object.freeze([...targetAreaResRefs]) }
            : {}),
          state: sourceStartLocation && currentAreaResRef
              && targetAreaResRefs?.includes(currentAreaResRef)
            ? "editable"
            : "preserve_only",
        }),
        visualEnvironment: Object.freeze({
          value: freezeAreaVisualEnvironment(
            sourceVisualEnvironment ?? emptyAreaVisualEnvironment(),
          ),
          ...(sourceVisualEnvironment
            ? { sourceValue: freezeAreaVisualEnvironment(sourceVisualEnvironment) }
            : {}),
          state: sourceVisualEnvironment && currentAreaResRef
            ? "editable"
            : "preserve_only",
        }),
        visualEnvironmentScalarControls: Object.freeze({
          value: Object.freeze(cloneAreaVisualEnvironmentScalarControls(
            sourceVisualEnvironmentScalarControls
              ?? emptyAreaVisualEnvironmentScalarControls(),
          )),
          ...(sourceVisualEnvironmentScalarControls
            ? {
                sourceValue: Object.freeze(cloneAreaVisualEnvironmentScalarControls(
                  sourceVisualEnvironmentScalarControls,
                )),
              }
            : {}),
          state: sourceVisualEnvironmentScalarControls && currentAreaResRef
            ? "editable"
            : "preserve_only",
        }),
        audioEnvironment: Object.freeze({
          value: Object.freeze(sourceAudioEnvironment
            ? { ...sourceAudioEnvironment }
            : emptyAreaAudioEnvironment()),
          ...(sourceAudioEnvironment
            ? { sourceValue: Object.freeze({ ...sourceAudioEnvironment }) }
            : {}),
          ...(sourceAudioCatalogs ? { catalogs: sourceAudioCatalogs } : {}),
          state: sourceAudioEnvironment && currentAreaResRef
            ? "editable"
            : "preserve_only",
        }),
        ...(sourceLoadingScreenCatalog
          ? { loadingScreenCatalog: sourceLoadingScreenCatalog }
          : {}),
        ...(sourceVisualEnvironmentCatalogs
          ? { visualEnvironmentCatalogs: sourceVisualEnvironmentCatalogs }
          : {}),
        ...(sourceVisualEnvironmentCatalogSelection
          ? {
              visualEnvironmentCatalogSelection: Object.freeze({
                value: Object.freeze(cloneAreaVisualEnvironmentCatalogSelection(
                  sourceVisualEnvironmentCatalogSelection,
                )),
                sourceValue: Object.freeze(cloneAreaVisualEnvironmentCatalogSelection(
                  sourceVisualEnvironmentCatalogSelection,
                )),
                state: sourceVisualEnvironmentCatalogs && sourceVisualEnvironment
                  && sourceVisualEnvironmentScalarControls && currentAreaResRef
                  && sourceVisualEnvironmentCatalogs.lightingSchemes.rows.some(
                    (row) => row.rowIndex ===
                      sourceVisualEnvironmentCatalogSelection.lightingSchemeRowIndex,
                  )
                  && sourceVisualEnvironmentCatalogs.skyBoxes.rows.some(
                    (row) => row.rowIndex ===
                      sourceVisualEnvironmentCatalogSelection.skyBoxRowIndex,
                  )
                  ? "editable"
                  : "preserve_only",
              }),
            }
          : {}),
        variables: Object.freeze({
          value: variableValue,
          ...(sourceVariables
            ? { sourceValue: cloneVariableTargetEntries(sourceVariables) }
            : {}),
          state: sourceVariables ? "editable" : "preserve_only",
        }),
      });
    },
    buildMutation(
      scene: AreaScene,
      sourceArea: unknown,
    ): ExistingAreaCommentsMutation | undefined {
      if (scene.areaComments === undefined) return undefined;
      if (!isAreaCommentsValue(scene.areaComments)) {
        throw new Error("Editable Area Comments are outside the admitted value budget.");
      }
      const sourceComments = sourceArea
        && typeof sourceArea === "object"
        && !Array.isArray(sourceArea)
        ? (sourceArea as Record<string, unknown>).comments
        : undefined;
      if (!isAreaCommentsValue(sourceComments)) {
        throw new Error(
          "Editable Area Comments require exact immutable source provenance.",
        );
      }
      return sourceComments === scene.areaComments
        ? undefined
        : Object.freeze({ expectedValue: sourceComments, value: scene.areaComments });
    },
    buildEventScriptMutations(
      scene: AreaScene,
      sourceArea: unknown,
    ): ExistingAreaEventScriptMutations | undefined {
      if (!scene.areaEventScripts) return undefined;
      const sourceScripts = sourceArea
        && typeof sourceArea === "object"
        && !Array.isArray(sourceArea)
        && "eventScripts" in sourceArea
        && sourceArea.eventScripts
        && typeof sourceArea.eventScripts === "object"
        && !Array.isArray(sourceArea.eventScripts)
        ? sourceArea.eventScripts as Record<string, unknown>
        : undefined;
      const result: Partial<Record<AreaEventScriptSlot, { expectedResRef: string; resRef: string }>> = {};
      for (const { slot } of AREA_EVENT_SCRIPT_FIELDS) {
        if (!Object.prototype.hasOwnProperty.call(scene.areaEventScripts, slot)) continue;
        const target = scene.areaEventScripts[slot];
        const source = sourceScripts?.[slot];
        if (!isAreaEventScriptResRef(target) || !isAreaEventScriptResRef(source)) {
          throw new Error(
            `Editable Area event script ${slot} requires exact immutable source provenance.`,
          );
        }
        if (source !== target) result[slot] = { expectedResRef: source, resRef: target };
      }
      return Object.keys(result).length === 0 ? undefined : result;
    },
    buildBasicIdentityMutations(
      scene: AreaScene,
      sourceArea: unknown,
    ): ExistingAreaBasicIdentityMutations | undefined {
      const sourceIdentity = sourceArea
        && typeof sourceArea === "object"
        && !Array.isArray(sourceArea)
        && "basicIdentity" in sourceArea
        && sourceArea.basicIdentity
        && typeof sourceArea.basicIdentity === "object"
        && !Array.isArray(sourceArea.basicIdentity)
        ? sourceArea.basicIdentity as Record<string, unknown>
        : undefined;
      const result: {
        name?: {
          expectedValue: string;
          value: string;
          expectedProfile: AreaNameStorageProfile;
          expectedEntries?: readonly EditableAreaNameStorageEntry[];
          valueEntries?: readonly EditableAreaNameStorageEntry[];
        };
        tag?: { expectedValue: string; value: string };
      } = {};
      if (scene.areaBasicIdentity?.name !== undefined) {
        const source = sourceIdentity?.name;
        const sourceProfile = sourceIdentity?.nameProfile;
        const targetProfile = scene.areaBasicIdentity.nameProfile;
        const sourceEntries = readEditableAreaNameEntries(sourceIdentity?.nameEntries);
        const targetEntries = readEditableAreaNameEntries(scene.areaBasicIdentity.nameEntries);
        if (
          !isEditableAreaName(scene.areaName)
          || !isEditableAreaName(source)
          || !isAreaNameStorageProfile(sourceProfile)
          || !isAreaNameStorageProfile(targetProfile)
          || (sourceEntries === undefined
            && targetEntries === undefined
            && targetProfile !== sourceProfile)
        ) {
          throw new Error("Editable Area Name requires exact immutable source provenance.");
        }
        if ((sourceIdentity?.nameEntries !== undefined && !sourceEntries)
          || (scene.areaBasicIdentity.nameEntries !== undefined && !targetEntries)
          || ((sourceEntries === undefined) !== (targetEntries === undefined))) {
          throw new Error("Editable Area Name entries require exact immutable source provenance.");
        }
        if (sourceEntries && targetEntries && (
          sourceEntries.find((entry) => entry.languageId === 0)?.text !== source
          || targetEntries.find((entry) => entry.languageId === 0)?.text !== scene.areaName
          || areaNameStorageProfileForEntries(sourceEntries) !== sourceProfile
          || areaNameStorageProfileForEntries(targetEntries) !== targetProfile
          || !areaNameStorageEntryIdentifiersFormAdmittedTarget(sourceEntries, targetEntries)
        )) {
          throw new Error(
            "Editable Area Name target entries must retain identifier 0 and contain only unique source or verified catalog identifiers with nonempty text for additions.",
          );
        }
        if (source !== scene.areaName
          || (sourceEntries && targetEntries
            && !areaNameStorageEntriesEqual(sourceEntries, targetEntries))) {
          result.name = {
            expectedValue: source,
            value: scene.areaName,
            expectedProfile: sourceProfile,
            ...(sourceEntries && targetEntries
              ? {
                  expectedEntries: cloneAreaNameStorageEntries(sourceEntries),
                  valueEntries: cloneAreaNameStorageEntries(targetEntries),
                }
              : {}),
          };
        }
      }
      if (scene.areaBasicIdentity?.tag !== undefined) {
        const source = sourceIdentity?.tag;
        if (!isEditableAreaTag(scene.areaTag) || !isEditableAreaTag(source)) {
          throw new Error("Editable Area Tag requires exact immutable source provenance.");
        }
        if (source !== scene.areaTag) {
          result.tag = { expectedValue: source, value: scene.areaTag };
        }
      }
      return Object.keys(result).length === 0 ? undefined : result;
    },
    buildAdvancedFlagMutations(
      scene: AreaScene,
      sourceArea: unknown,
    ): ExistingAreaAdvancedFlagMutations | undefined {
      if (!scene.areaAdvancedFlags) return undefined;
      const rawSource = sourceArea
        && typeof sourceArea === "object"
        && !Array.isArray(sourceArea)
        ? (sourceArea as Record<string, unknown>).advancedFlags
        : undefined;
      const source = isAreaAdvancedFlags(rawSource) ? rawSource : undefined;
      const result: {
        terrainType?: ExistingAreaAdvancedFlagMutations["terrainType"];
        playerVsPlayer?: ExistingAreaAdvancedFlagMutations["playerVsPlayer"];
        noRest?: ExistingAreaAdvancedFlagMutations["noRest"];
        listenCheckModifier?: ExistingAreaAdvancedFlagMutations["listenCheckModifier"];
        spotCheckModifier?: ExistingAreaAdvancedFlagMutations["spotCheckModifier"];
        loadingScreenId?: ExistingAreaAdvancedFlagMutations["loadingScreenId"];
      } = {};

      if (scene.areaAdvancedFlags.terrainType !== undefined) {
        if (!isAreaTerrainTypeFlags(source?.terrainType)) {
          throw new Error("Editable Area terrain type requires exact immutable source provenance.");
        }
        if (!terrainTypeFlagsEqual(source.terrainType, scene.areaAdvancedFlags.terrainType)) {
          result.terrainType = {
            expectedValue: { ...source.terrainType },
            value: { ...scene.areaAdvancedFlags.terrainType },
          };
        }
      }
      if (scene.areaAdvancedFlags.playerVsPlayer !== undefined) {
        if (!isAreaPlayerVsPlayerMode(source?.playerVsPlayer)) {
          throw new Error("Editable Area PvP mode requires exact immutable source provenance.");
        }
        if (source.playerVsPlayer !== scene.areaAdvancedFlags.playerVsPlayer) {
          result.playerVsPlayer = {
            expectedValue: source.playerVsPlayer,
            value: scene.areaAdvancedFlags.playerVsPlayer,
          };
        }
      }
      if (scene.areaAdvancedFlags.noRest !== undefined) {
        if (typeof source?.noRest !== "boolean") {
          throw new Error("Editable Area no-rest value requires exact immutable source provenance.");
        }
        if (source.noRest !== scene.areaAdvancedFlags.noRest) {
          result.noRest = {
            expectedValue: source.noRest,
            value: scene.areaAdvancedFlags.noRest,
          };
        }
      }
      for (const [key, label] of [
        ["listenCheckModifier", "Listen check modifier"],
        ["spotCheckModifier", "Spot check modifier"],
      ] as const) {
        const target = scene.areaAdvancedFlags[key];
        if (target === undefined) continue;
        const sourceValue = source?.[key];
        if (!isAreaCheckModifier(sourceValue)) {
          throw new Error(`Editable Area ${label} requires exact immutable source provenance.`);
        }
        if (sourceValue !== target) {
          result[key] = { expectedValue: sourceValue, value: target };
        }
      }
      if (scene.areaAdvancedFlags.loadingScreenId !== undefined) {
        const sourceValue = source?.loadingScreenId;
        if (!isAreaLoadingScreenId(sourceValue)) {
          throw new Error(
            "Editable Area loading-screen ID requires exact immutable source provenance.",
          );
        }
        if (sourceValue !== scene.areaAdvancedFlags.loadingScreenId) {
          result.loadingScreenId = {
            expectedValue: sourceValue,
            value: scene.areaAdvancedFlags.loadingScreenId,
          };
        }
      }
      return Object.keys(result).length === 0 ? undefined : result;
    },
    buildModuleStartLocationMutation(
      scene: AreaScene,
      sourceArea: unknown,
    ): ExistingAreaModuleStartLocationMutation | undefined {
      if (!scene.moduleStartLocation) return undefined;
      const sourceRecord = sourceArea
        && typeof sourceArea === "object"
        && !Array.isArray(sourceArea)
        ? sourceArea as Record<string, unknown>
        : undefined;
      const rawSource = sourceRecord?.moduleStartLocation;
      if (!isAreaModuleStartLocation(rawSource)
          || !isAreaModuleStartLocation(scene.moduleStartLocation)) {
        throw new Error(
          "Editable module start location requires exact immutable source provenance.",
        );
      }
      if (areaModuleStartLocationsEqual(rawSource, scene.moduleStartLocation)) {
        return undefined;
      }
      const currentAreaResRef = scene.auroraAreaEditing?.state.areaResRef;
      const rawTargets = sourceRecord?.moduleStartLocationTargets;
      const targetAreaResRefs = rawTargets === undefined
        ? (currentAreaResRef ? Object.freeze([currentAreaResRef]) : null)
        : readModuleStartLocationTargets(rawTargets);
      if (!targetAreaResRefs?.includes(scene.moduleStartLocation.areaResRef)) {
        throw new Error(
          "A changed module start location must target immutable module membership.",
        );
      }
      return Object.freeze({
        expectedValue: Object.freeze({ ...rawSource }),
        value: Object.freeze({ ...scene.moduleStartLocation }),
      });
    },
    buildAudioEnvironmentMutation(
      scene: AreaScene,
      sourceArea: unknown,
    ): ExistingAreaAudioEnvironmentMutation | undefined {
      if (!scene.areaAudioEnvironment) return undefined;
      const rawSource = sourceArea
        && typeof sourceArea === "object"
        && !Array.isArray(sourceArea)
        ? (sourceArea as Record<string, unknown>).audioEnvironment
        : undefined;
      if (!isAreaAudioEnvironment(rawSource)
          || !isAreaAudioEnvironment(scene.areaAudioEnvironment)) {
        throw new Error(
          "Editable Area audio environment requires exact immutable source provenance.",
        );
      }
      return areaAudioEnvironmentsEqual(rawSource, scene.areaAudioEnvironment)
        ? undefined
        : Object.freeze({
            expectedValue: Object.freeze({ ...rawSource }),
            value: Object.freeze({ ...scene.areaAudioEnvironment }),
          });
    },
    buildVisualEnvironmentMutation(
      scene: AreaScene,
      sourceArea: unknown,
    ): ExistingAreaVisualEnvironmentMutation | undefined {
      if (!scene.areaVisualEnvironment) return undefined;
      const rawSource = sourceArea
        && typeof sourceArea === "object"
        && !Array.isArray(sourceArea)
        ? (sourceArea as Record<string, unknown>).visualEnvironment
        : undefined;
      if (!isAreaVisualEnvironment(rawSource)
          || !isAreaVisualEnvironment(scene.areaVisualEnvironment)) {
        throw new Error(
          "Editable Area visual environment requires exact immutable source provenance.",
        );
      }
      return areaVisualEnvironmentsEqual(rawSource, scene.areaVisualEnvironment)
        ? undefined
        : Object.freeze({
            expectedValue: freezeAreaVisualEnvironment(rawSource),
            value: freezeAreaVisualEnvironment(scene.areaVisualEnvironment),
          });
    },
    buildVisualEnvironmentScalarControlsMutation(
      scene: AreaScene,
      sourceArea: unknown,
    ): ExistingAreaVisualEnvironmentScalarControlsMutation | undefined {
      if (!scene.areaVisualEnvironmentScalarControls) return undefined;
      const rawSource = sourceArea
        && typeof sourceArea === "object"
        && !Array.isArray(sourceArea)
        ? (sourceArea as Record<string, unknown>).visualEnvironmentScalarControls
        : undefined;
      if (!isAreaVisualEnvironmentScalarControls(rawSource)
          || !isAreaVisualEnvironmentScalarControls(
            scene.areaVisualEnvironmentScalarControls,
          )) {
        throw new Error(
          "Editable Area visual-environment scalar controls require exact immutable source provenance.",
        );
      }
      return areaVisualEnvironmentScalarControlsEqual(
        rawSource,
        scene.areaVisualEnvironmentScalarControls,
      )
        ? undefined
        : Object.freeze({
            expectedValue: Object.freeze(
              cloneAreaVisualEnvironmentScalarControls(rawSource),
            ),
            value: Object.freeze(cloneAreaVisualEnvironmentScalarControls(
              scene.areaVisualEnvironmentScalarControls,
            )),
          });
    },
    buildVisualEnvironmentCatalogSelectionMutation(
      scene: AreaScene,
      sourceArea: unknown,
    ): ExistingAreaVisualEnvironmentCatalogSelectionMutation | undefined {
      if (!scene.areaVisualEnvironmentCatalogSelection) return undefined;
      const sourceRecord = isPlainRecord(sourceArea) ? sourceArea : undefined;
      const catalogs = sourceRecord?.visualEnvironmentCatalogs;
      const sourceSelection = sourceRecord?.visualEnvironmentCatalogSelection;
      const sourceVisualEnvironment = sourceRecord?.visualEnvironment;
      const sourceScalarControls = sourceRecord?.visualEnvironmentScalarControls;
      if (!isEffectiveAreaVisualEnvironmentCatalogBundle(catalogs)
          || !isAreaVisualEnvironmentCatalogSelection(sourceSelection)
          || !isAreaVisualEnvironment(sourceVisualEnvironment)
          || !isAreaVisualEnvironmentScalarControls(sourceScalarControls)
          || !isAreaVisualEnvironmentCatalogSelection(
            scene.areaVisualEnvironmentCatalogSelection,
          )
          || !isAreaVisualEnvironment(scene.areaVisualEnvironment)
          || !isAreaVisualEnvironmentScalarControls(
            scene.areaVisualEnvironmentScalarControls,
          )) {
        throw new Error(
          "Editable Area visual selection requires exact immutable catalog and Area source provenance.",
        );
      }
      return buildExistingAreaVisualEnvironmentCatalogSelectionMutation({
        catalogs,
        sourceSelection,
        targetSelection: scene.areaVisualEnvironmentCatalogSelection,
        sourceVisualEnvironment,
        targetVisualEnvironment: scene.areaVisualEnvironment,
        sourceScalarControls,
        targetScalarControls: scene.areaVisualEnvironmentScalarControls,
      });
    },
    buildVariableMutation(
      scene: AreaScene,
      sourceArea: unknown,
    ): ExistingAreaVariableMutation | undefined {
      if (scene.areaVariables === undefined) return undefined;
      const entries = readAuroraVariableTargetEntries(scene.areaVariables);
      const sourceRecord = isPlainRecord(sourceArea) ? sourceArea : undefined;
      const provenance = readAuroraVariableProvenance(sourceRecord?.variables);
      const resources = isPlainRecord(sourceRecord?.sourceResources)
        ? sourceRecord.sourceResources
        : undefined;
      const sourceGitSha256 = resources?.gitSha256;
      if (!entries || !provenance || typeof sourceGitSha256 !== "string" ||
          !/^[a-f0-9]{64}$/u.test(sourceGitSha256)) {
        throw new Error(
          "Editable Area variables require exact immutable GIT source provenance.",
        );
      }
      if (auroraVariableEntriesEqual(provenance.expectedEntries, entries)) {
        return undefined;
      }
      return Object.freeze({
        expectedEntries: cloneVariableSourceEntries(provenance.expectedEntries),
        entries: cloneVariableTargetEntries(entries),
        sourceGitSha256,
      });
    },
    apply(scene: AreaScene, draft: AreaPropertiesDraft): AreaPropertiesApplyResult {
      if (
        scene.areaComments === undefined
        && (draft.commentsState !== "preserve_only" || draft.comments !== "")
      ) {
        return Object.freeze({
          ok: false as const,
          error: Object.freeze({
            code: "AREA_COMMENTS_PRESERVE_ONLY" as const,
            path: "areaComments" as const,
            message: "The retained ARE has no exact editable Comments field.",
          }),
        });
      }
      if (scene.areaComments !== undefined && !isAreaCommentsValue(draft.comments)) {
        return Object.freeze({
          ok: false as const,
          error: Object.freeze({
            code: "AREA_COMMENTS_INVALID" as const,
            path: "areaComments" as const,
            message: "Area Comments must contain at most 4096 code units without U+0000.",
          }),
        });
      }
      let changed = scene.areaComments !== undefined && scene.areaComments !== draft.comments;
      const sourceVariables = readAuroraVariableTargetEntries(scene.areaVariables);
      let nextAreaVariables = scene.areaVariables;
      const variableDraft = draft.variables;
      if (variableDraft) {
        const target = readAuroraVariableTargetEntries(variableDraft.value);
        const draftSource = variableDraft.sourceValue === undefined
          ? undefined
          : readAuroraVariableTargetEntries(variableDraft.sourceValue);
        if (!sourceVariables) {
          if (variableDraft.state !== "preserve_only" || draftSource !== undefined ||
              !target || target.length !== 0) {
            return variablePreserveOnly();
          }
        } else if (variableDraft.state !== "editable" || !draftSource ||
            !auroraVariableTargetEntriesEqual(sourceVariables, draftSource)) {
          return variablePreserveOnly();
        } else if (!target) {
          return variableInvalid();
        } else if (!auroraVariableTargetEntriesEqual(sourceVariables, target)) {
          nextAreaVariables = cloneVariableTargetEntries(target) as AuroraVariableTargetEntry[];
          changed = true;
        }
      }
      let nextVisualEnvironment = scene.areaVisualEnvironment;
      let nextLighting = scene.lighting;
      const visualDraft = draft.visualEnvironment;
      let nextVisualEnvironmentCatalogSelection =
        scene.areaVisualEnvironmentCatalogSelection;
      const catalogSelectionDraft = draft.visualEnvironmentCatalogSelection;
      if (catalogSelectionDraft) {
        const sourceSelection = scene.areaVisualEnvironmentCatalogSelection;
        const catalogs = scene.areaVisualEnvironmentCatalogs;
        if (!isAreaVisualEnvironmentCatalogSelection(sourceSelection)) {
          return visualEnvironmentCatalogSelectionPreserveOnly();
        }
        if (!isEffectiveAreaVisualEnvironmentCatalogBundle(catalogs)
            || catalogSelectionDraft.state !== "editable") {
          if (!isAreaVisualEnvironmentCatalogSelection(
            catalogSelectionDraft.sourceValue,
          ) || !areaVisualEnvironmentCatalogSelectionsEqual(
            sourceSelection,
            catalogSelectionDraft.sourceValue,
          ) || !areaVisualEnvironmentCatalogSelectionsEqual(
            sourceSelection,
            catalogSelectionDraft.value,
          )) {
            return visualEnvironmentCatalogSelectionPreserveOnly();
          }
        } else {
          if (!isAreaVisualEnvironmentCatalogSelection(
            catalogSelectionDraft.sourceValue,
          ) || !areaVisualEnvironmentCatalogSelectionsEqual(
            sourceSelection,
            catalogSelectionDraft.sourceValue,
          )) {
            return visualEnvironmentCatalogSelectionPreserveOnly();
          }
          if (!isAreaVisualEnvironmentCatalogSelection(
            catalogSelectionDraft.value,
          ) || !catalogSelectionRowsExist(catalogs, catalogSelectionDraft.value)) {
            return visualEnvironmentCatalogSelectionInvalid();
          }
          if (!areaVisualEnvironmentCatalogSelectionsEqual(
            sourceSelection,
            catalogSelectionDraft.value,
          )) {
            const lightingSchemeChanged = sourceSelection.lightingSchemeRowIndex
              !== catalogSelectionDraft.value.lightingSchemeRowIndex;
            if (lightingSchemeChanged && (!visualDraft
                || visualDraft.state !== "editable"
                || !isAreaVisualEnvironment(visualDraft.sourceValue)
                || !areaVisualEnvironmentsEqual(
                  scene.areaVisualEnvironment,
                  visualDraft.sourceValue,
                )
                || !isAreaVisualEnvironment(visualDraft.value)
                || !draft.visualEnvironmentScalarControls
                || draft.visualEnvironmentScalarControls.state !== "editable"
                || !isAreaVisualEnvironmentScalarControls(
                  draft.visualEnvironmentScalarControls.sourceValue,
                )
                || !areaVisualEnvironmentScalarControlsEqual(
                  scene.areaVisualEnvironmentScalarControls,
                  draft.visualEnvironmentScalarControls.sourceValue,
                )
                || !isAreaVisualEnvironmentScalarControls(
                  draft.visualEnvironmentScalarControls.value,
                ))) {
              return visualEnvironmentCatalogSelectionInvalid();
            }
            nextVisualEnvironmentCatalogSelection = Object.freeze(
              cloneAreaVisualEnvironmentCatalogSelection(
                catalogSelectionDraft.value,
              ),
            );
            changed = true;
          }
        }
      }
      if (visualDraft) {
        if (!scene.areaVisualEnvironment) {
          if (visualDraft.state !== "preserve_only"
              || visualDraft.sourceValue !== undefined
              || !areaVisualEnvironmentsEqual(
                visualDraft.value,
                emptyAreaVisualEnvironment(),
              )) {
            return visualEnvironmentPreserveOnly();
          }
        } else if (visualDraft.state !== "editable") {
          if (!isAreaVisualEnvironment(visualDraft.sourceValue)
              || !areaVisualEnvironmentsEqual(
                scene.areaVisualEnvironment,
                visualDraft.sourceValue,
              )
              || !areaVisualEnvironmentsEqual(
                scene.areaVisualEnvironment,
                visualDraft.value,
              )) {
            return visualEnvironmentPreserveOnly();
          }
        } else {
          if (!isAreaVisualEnvironment(visualDraft.sourceValue)
              || !areaVisualEnvironmentsEqual(
                scene.areaVisualEnvironment,
                visualDraft.sourceValue,
              )) {
            return visualEnvironmentPreserveOnly();
          }
          if (!isAreaVisualEnvironment(visualDraft.value)) {
            return visualEnvironmentInvalid();
          }
          if (!areaVisualEnvironmentsEqual(
            scene.areaVisualEnvironment,
            visualDraft.value,
          )) {
            nextVisualEnvironment = freezeAreaVisualEnvironment(visualDraft.value);
            nextLighting = mergeVisualEnvironmentLighting(
              scene.lighting,
              visualDraft.value,
            );
            changed = true;
          }
        }
      }
      let nextVisualEnvironmentScalarControls = scene.areaVisualEnvironmentScalarControls;
      const scalarDraft = draft.visualEnvironmentScalarControls;
      if (scalarDraft) {
        if (!scene.areaVisualEnvironmentScalarControls) {
          if (scalarDraft.state !== "preserve_only"
              || scalarDraft.sourceValue !== undefined
              || !areaVisualEnvironmentScalarControlsEqual(
                scalarDraft.value,
                emptyAreaVisualEnvironmentScalarControls(),
              )) {
            return visualEnvironmentScalarControlsPreserveOnly();
          }
        } else if (scalarDraft.state !== "editable") {
          if (!isAreaVisualEnvironmentScalarControls(scalarDraft.sourceValue)
              || !areaVisualEnvironmentScalarControlsEqual(
                scene.areaVisualEnvironmentScalarControls,
                scalarDraft.sourceValue,
              )
              || !areaVisualEnvironmentScalarControlsEqual(
                scene.areaVisualEnvironmentScalarControls,
                scalarDraft.value,
              )) {
            return visualEnvironmentScalarControlsPreserveOnly();
          }
        } else {
          if (!isAreaVisualEnvironmentScalarControls(scalarDraft.sourceValue)
              || !areaVisualEnvironmentScalarControlsEqual(
                scene.areaVisualEnvironmentScalarControls,
                scalarDraft.sourceValue,
              )) {
            return visualEnvironmentScalarControlsPreserveOnly();
          }
          if (!isAreaVisualEnvironmentScalarControls(scalarDraft.value)) {
            return visualEnvironmentScalarControlsInvalid();
          }
          if (!areaVisualEnvironmentScalarControlsEqual(
            scene.areaVisualEnvironmentScalarControls,
            scalarDraft.value,
          )) {
            nextVisualEnvironmentScalarControls = Object.freeze(
              cloneAreaVisualEnvironmentScalarControls(scalarDraft.value),
            );
            nextLighting = mergeVisualEnvironmentScalarLighting(
              nextLighting,
              scalarDraft.value,
            );
            changed = true;
          }
        }
      }
      let nextAudioEnvironment = scene.areaAudioEnvironment;
      const audioDraft = draft.audioEnvironment;
      if (audioDraft) {
        if (!scene.areaAudioEnvironment) {
          if (audioDraft.state !== "preserve_only"
              || audioDraft.sourceValue !== undefined
              || !areaAudioEnvironmentsEqual(audioDraft.value, emptyAreaAudioEnvironment())) {
            return audioEnvironmentPreserveOnly();
          }
        } else if (audioDraft.state !== "editable") {
          if (!isAreaAudioEnvironment(audioDraft.sourceValue)
              || !areaAudioEnvironmentsEqual(scene.areaAudioEnvironment, audioDraft.sourceValue)
              || !areaAudioEnvironmentsEqual(scene.areaAudioEnvironment, audioDraft.value)) {
            return audioEnvironmentPreserveOnly();
          }
        } else {
          if (!isAreaAudioEnvironment(audioDraft.sourceValue)
              || !areaAudioEnvironmentsEqual(scene.areaAudioEnvironment, audioDraft.sourceValue)) {
            return audioEnvironmentPreserveOnly();
          }
          if (!isAreaAudioEnvironment(audioDraft.value)) {
            return audioEnvironmentInvalid(
              "Area audio environment requires six non-negative IDs, volumes 0-127, and a whole-second delay from -99 through 99 seconds.",
            );
          }
          if (!areaAudioEnvironmentsEqual(scene.areaAudioEnvironment, audioDraft.value)) {
            nextAudioEnvironment = Object.freeze({ ...audioDraft.value });
            changed = true;
          }
        }
      }
      let nextModuleStartLocation = scene.moduleStartLocation;
      const startDraft = draft.moduleStartLocation;
      if (startDraft) {
        if (!scene.moduleStartLocation) {
          const isEmptyPreserveSentinel = startDraft.value.areaResRef === ""
            && startDraft.value.x === 0
            && startDraft.value.y === 0
            && startDraft.value.z === 0
            && startDraft.value.directionX === 0
            && startDraft.value.directionY === 0;
          if (startDraft.state !== "preserve_only"
              || startDraft.sourceValue !== undefined
              || !isEmptyPreserveSentinel) {
            return startLocationPreserveOnly();
          }
        } else if (startDraft.state !== "editable") {
          const preservedTarget = normalizeAreaModuleStartLocation(startDraft.value);
          if (!isAreaModuleStartLocation(startDraft.sourceValue)
              || !preservedTarget
              || !areaModuleStartLocationsEqual(
                scene.moduleStartLocation,
                startDraft.sourceValue,
              )
              || !areaModuleStartLocationsEqual(
                scene.moduleStartLocation,
                preservedTarget,
              )) {
            return startLocationPreserveOnly();
          }
        } else {
          const target = normalizeAreaModuleStartLocation(startDraft.value);
          if (!isAreaModuleStartLocation(startDraft.sourceValue)
              || !areaModuleStartLocationsEqual(
                scene.moduleStartLocation,
                startDraft.sourceValue,
              )) {
            return startLocationPreserveOnly();
          }
          if (!target) {
            return startLocationInvalid(
              "Module start location requires a canonical Area ResRef and five finite binary32-storable numbers.",
            );
          }
          if (!areaModuleStartLocationsEqual(scene.moduleStartLocation, target)) {
            const currentAreaResRef = startDraft.currentAreaResRef
              ?? scene.auroraAreaEditing?.state.areaResRef;
            const targetAreaResRefs = startDraft.targetAreaResRefs === undefined
              ? (currentAreaResRef ? Object.freeze([currentAreaResRef]) : null)
              : readModuleStartLocationTargets(startDraft.targetAreaResRefs);
            if (!targetAreaResRefs?.includes(target.areaResRef)) {
              return startLocationInvalid(
                "A changed module start location must target immutable module membership.",
              );
            }
            nextModuleStartLocation = target;
            changed = true;
          }
        }
      }
      let nextName = scene.areaName;
      let nextTag = scene.areaTag;
      const nextBasicIdentity = { ...(scene.areaBasicIdentity ?? {}) };
      if (draft.basicIdentity) {
        const sourceName = scene.areaBasicIdentity?.name;
        const targetName = draft.basicIdentity.name;
        const sourceNameEntries = readEditableAreaNameEntries(
          scene.areaBasicIdentity?.nameEntries,
        );
        const targetNameEntries = readEditableAreaNameEntries(targetName.entries);
        if (sourceName === undefined) {
          if (targetName.state !== "preserve_only" || targetName.value !== scene.areaName) {
            return Object.freeze({
              ok: false as const,
              error: Object.freeze({
                code: "AREA_BASIC_IDENTITY_PRESERVE_ONLY" as const,
                path: "areaName" as const,
                message: "The retained ARE Name is not admitted editable inline storage.",
              }),
            });
          }
        } else if (targetName.state !== "editable") {
          return Object.freeze({
            ok: false as const,
            error: Object.freeze({
              code: "AREA_BASIC_IDENTITY_PRESERVE_ONLY" as const,
              path: "areaName" as const,
              message: "An admitted existing ARE Name must remain explicitly editable.",
            }),
          });
        } else if (!isAreaNameStorageProfile(scene.areaBasicIdentity?.nameProfile)
          || !isAreaNameStorageProfile(targetName.profile)
          || (sourceNameEntries === undefined
            && targetNameEntries === undefined
            && targetName.profile !== scene.areaBasicIdentity.nameProfile)) {
          return Object.freeze({
            ok: false as const,
            error: Object.freeze({
              code: "AREA_BASIC_IDENTITY_PRESERVE_ONLY" as const,
              path: "areaName" as const,
              message: "The Area Name source and target localization profiles must be explicit.",
            }),
            });
        } else if ((scene.areaBasicIdentity?.nameEntries !== undefined && !sourceNameEntries)
          || (targetName.entries !== undefined && !targetNameEntries)
          || ((sourceNameEntries === undefined) !== (targetNameEntries === undefined))) {
          return Object.freeze({
            ok: false as const,
            error: Object.freeze({
              code: "AREA_BASIC_IDENTITY_PRESERVE_ONLY" as const,
              path: "areaName" as const,
              message: "The Area Name entry list must match immutable source provenance.",
            }),
          });
        } else if (!isEditableAreaName(targetName.value)) {
          return Object.freeze({
            ok: false as const,
            error: Object.freeze({
              code: "AREA_BASIC_IDENTITY_INVALID" as const,
              path: "areaName" as const,
              message: "Area Name must be 1-256 printable ASCII characters and not whitespace-only.",
            }),
          });
        } else if (sourceNameEntries && targetNameEntries && (
          sourceNameEntries.find((entry) => entry.languageId === 0)?.text !== sourceName
          || targetNameEntries.find((entry) => entry.languageId === 0)?.text !== targetName.value
          || areaNameStorageProfileForEntries(sourceNameEntries)
            !== scene.areaBasicIdentity.nameProfile
          || areaNameStorageProfileForEntries(targetNameEntries)
            !== targetName.profile
          || !areaNameStorageEntryIdentifiersFormAdmittedTarget(
            sourceNameEntries,
            targetNameEntries,
          )
        )) {
          return Object.freeze({
            ok: false as const,
            error: Object.freeze({
              code: "AREA_BASIC_IDENTITY_PRESERVE_ONLY" as const,
              path: "areaName" as const,
              message: "Area Name target entries must retain identifier 0 and use only unique source or verified catalog identifiers with nonempty text for additions.",
            }),
          });
        } else if (targetName.value !== sourceName
          || (sourceNameEntries && targetNameEntries
            && !areaNameStorageEntriesEqual(sourceNameEntries, targetNameEntries))) {
          nextName = targetName.value;
          nextBasicIdentity.name = targetName.value;
          nextBasicIdentity.nameProfile = targetName.profile;
          if (targetNameEntries) {
            nextBasicIdentity.nameEntries = cloneAreaNameStorageEntries(targetNameEntries);
          }
          changed = true;
        }

        const sourceTag = scene.areaBasicIdentity?.tag;
        const targetTag = draft.basicIdentity.tag;
        if (sourceTag === undefined) {
          if (targetTag.state !== "preserve_only" || targetTag.value !== "") {
            return Object.freeze({
              ok: false as const,
              error: Object.freeze({
                code: "AREA_BASIC_IDENTITY_PRESERVE_ONLY" as const,
                path: "areaTag" as const,
                message: "The retained ARE has no exact editable Tag field.",
              }),
            });
          }
        } else if (targetTag.state !== "editable") {
          return Object.freeze({
            ok: false as const,
            error: Object.freeze({
              code: "AREA_BASIC_IDENTITY_PRESERVE_ONLY" as const,
              path: "areaTag" as const,
              message: "An admitted existing ARE Tag must remain explicitly editable.",
            }),
          });
        } else if (!isEditableAreaTag(targetTag.value)) {
          return Object.freeze({
            ok: false as const,
            error: Object.freeze({
              code: "AREA_BASIC_IDENTITY_INVALID" as const,
              path: "areaTag" as const,
              message: "Area Tag must contain at most 64 printable ASCII characters.",
            }),
          });
        } else if (targetTag.value !== sourceTag) {
          nextTag = targetTag.value;
          nextBasicIdentity.tag = targetTag.value;
          changed = true;
        }
      }
      const nextEventScripts = { ...(scene.areaEventScripts ?? {}) };
      const eventDrafts = draft.eventScripts;
      if (eventDrafts) {
        for (const { slot } of AREA_EVENT_SCRIPT_FIELDS) {
          const source = scene.areaEventScripts?.[slot];
          const target = eventDrafts[slot];
          if (source === undefined) {
            if (target.state !== "preserve_only" || target.value !== "") {
              return Object.freeze({
                ok: false as const,
                error: Object.freeze({
                  code: "AREA_EVENT_SCRIPT_PRESERVE_ONLY" as const,
                  path: `areaEventScripts.${slot}` as const,
                  message: `The retained ARE has no exact editable ${slot} field.`,
                }),
              });
            }
            continue;
          }
          if (!isAreaEventScriptResRef(target.value)) {
            return Object.freeze({
              ok: false as const,
              error: Object.freeze({
                code: "AREA_EVENT_SCRIPT_INVALID" as const,
                path: `areaEventScripts.${slot}` as const,
                message: "Area event script ResRef must be empty or 1-16 lowercase ASCII [a-z0-9_] characters.",
              }),
            });
          }
          if (source !== target.value) {
            nextEventScripts[slot] = target.value;
            changed = true;
          }
        }
      }
      const nextAdvancedFlags = {
        ...(scene.areaAdvancedFlags ?? {}),
        ...(scene.areaAdvancedFlags?.terrainType
          ? { terrainType: { ...scene.areaAdvancedFlags.terrainType } }
          : {}),
      };
      const advancedDraft = draft.advancedFlags;
      if (advancedDraft) {
        const sourceTerrain = scene.areaAdvancedFlags?.terrainType;
        const targetTerrain = advancedDraft.terrainType;
        if (sourceTerrain === undefined) {
          if (
            targetTerrain.state !== "preserve_only"
            || !terrainTypeFlagsEqual(
              targetTerrain.value,
              { interior: false, natural: false, subterranean: false },
            )
          ) {
            return advancedPreserveOnly("terrainType", "terrain type");
          }
        } else if (
          targetTerrain.state !== "editable"
          || !isAreaTerrainTypeFlags(targetTerrain.value)
        ) {
          return targetTerrain.state !== "editable"
            ? advancedPreserveOnly("terrainType", "terrain type")
            : advancedInvalid("terrainType", "Area terrain type must contain three exact boolean choices.");
        } else if (!terrainTypeFlagsEqual(sourceTerrain, targetTerrain.value)) {
          nextAdvancedFlags.terrainType = { ...targetTerrain.value };
          changed = true;
        }

        const sourcePvp = scene.areaAdvancedFlags?.playerVsPlayer;
        const targetPvp = advancedDraft.playerVsPlayer;
        if (sourcePvp === undefined) {
          if (targetPvp.state !== "preserve_only" || targetPvp.value !== 0) {
            return advancedPreserveOnly("playerVsPlayer", "PvP mode");
          }
        } else if (targetPvp.state !== "editable") {
          return advancedPreserveOnly("playerVsPlayer", "PvP mode");
        } else if (!isAreaPlayerVsPlayerMode(targetPvp.value)) {
          return advancedInvalid("playerVsPlayer", "Area PvP mode must be one of 0, 1, 2, or 3.");
        } else if (sourcePvp !== targetPvp.value) {
          nextAdvancedFlags.playerVsPlayer = targetPvp.value;
          changed = true;
        }

        const sourceNoRest = scene.areaAdvancedFlags?.noRest;
        const targetNoRest = advancedDraft.noRest;
        if (sourceNoRest === undefined) {
          if (targetNoRest.state !== "preserve_only" || targetNoRest.value !== false) {
            return advancedPreserveOnly("noRest", "No Rest");
          }
        } else if (targetNoRest.state !== "editable") {
          return advancedPreserveOnly("noRest", "No Rest");
        } else if (typeof targetNoRest.value !== "boolean") {
          return advancedInvalid("noRest", "Area No Rest must be a boolean value.");
        } else if (sourceNoRest !== targetNoRest.value) {
          nextAdvancedFlags.noRest = targetNoRest.value;
          changed = true;
        }

        for (const [key, label] of [
          ["listenCheckModifier", "Listen check modifier"],
          ["spotCheckModifier", "Spot check modifier"],
        ] as const) {
          const sourceValue = scene.areaAdvancedFlags?.[key];
          const targetValue = advancedDraft[key];
          if (sourceValue === undefined) {
            if (targetValue.state !== "preserve_only" || targetValue.value !== 0) {
              return advancedPreserveOnly(key, label);
            }
          } else if (targetValue.state !== "editable") {
            return advancedPreserveOnly(key, label);
          } else if (!isAreaCheckModifier(targetValue.value)) {
            return advancedInvalid(
              key,
              `Area ${label} must be an integer from -99 through 99.`,
            );
          } else if (sourceValue !== targetValue.value) {
            nextAdvancedFlags[key] = targetValue.value;
            changed = true;
          }
        }
        const sourceLoadingScreenId = scene.areaAdvancedFlags?.loadingScreenId;
        const targetLoadingScreenId = advancedDraft.loadingScreenId;
        if (sourceLoadingScreenId === undefined) {
          if (
            targetLoadingScreenId.state !== "preserve_only"
            || targetLoadingScreenId.value !== 0
          ) {
            return advancedPreserveOnly("loadingScreenId", "loading-screen ID");
          }
        } else if (targetLoadingScreenId.state !== "editable") {
          return advancedPreserveOnly("loadingScreenId", "loading-screen ID");
        } else if (!isAreaLoadingScreenId(targetLoadingScreenId.value)) {
          return advancedInvalid(
            "loadingScreenId",
            "Area loading-screen ID must be an integer from 0 through 65535.",
          );
        } else if (sourceLoadingScreenId !== targetLoadingScreenId.value) {
          nextAdvancedFlags.loadingScreenId = targetLoadingScreenId.value;
          changed = true;
        }
      }
      if (!changed) {
        return Object.freeze({ ok: true as const, changed: false, value: scene });
      }
      const timestamp = Math.max(
        scene.updatedAtUnixMs + 1,
        Math.floor(now()),
      );
      return Object.freeze({
        ok: true as const,
        changed: true,
        value: {
          ...scene,
          areaName: nextName,
          ...(nextTag !== undefined ? { areaTag: nextTag } : {}),
          ...(Object.keys(nextBasicIdentity).length > 0
            ? { areaBasicIdentity: nextBasicIdentity }
            : {}),
          ...(scene.areaComments !== undefined ? { areaComments: draft.comments } : {}),
          ...(Object.keys(nextEventScripts).length > 0
            ? { areaEventScripts: nextEventScripts }
            : {}),
          ...(Object.keys(nextAdvancedFlags).length > 0
            ? { areaAdvancedFlags: nextAdvancedFlags }
            : {}),
          ...(nextModuleStartLocation
            ? { moduleStartLocation: nextModuleStartLocation }
            : {}),
          ...(nextVisualEnvironment
            ? { areaVisualEnvironment: nextVisualEnvironment }
            : {}),
          ...(nextVisualEnvironmentScalarControls
            ? { areaVisualEnvironmentScalarControls: nextVisualEnvironmentScalarControls }
            : {}),
          ...(nextVisualEnvironmentCatalogSelection
            ? {
                areaVisualEnvironmentCatalogSelection:
                  nextVisualEnvironmentCatalogSelection,
              }
            : {}),
          ...(nextLighting ? { lighting: nextLighting } : {}),
          ...(nextAudioEnvironment
            ? { areaAudioEnvironment: nextAudioEnvironment }
            : {}),
          ...(nextAreaVariables !== undefined
            ? { areaVariables: nextAreaVariables }
            : {}),
          updatedAtUnixMs: timestamp,
        },
      });
    },
  });
}

function cloneVariableTargetEntries(
  entries: readonly AuroraVariableTargetEntry[],
): readonly AuroraVariableTargetEntry[] {
  return Object.freeze(entries.map((entry) => Object.freeze({ ...entry })));
}

function cloneVariableSourceEntries(
  entries: NonNullable<ReturnType<typeof readAuroraVariableProvenance>>["expectedEntries"],
) {
  return Object.freeze(entries.map((entry) => Object.freeze({ ...entry })));
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype;
}

function variablePreserveOnly(): AreaPropertiesApplyResult {
  return Object.freeze({
    ok: false as const,
    error: Object.freeze({
      code: "AREA_VARIABLES_PRESERVE_ONLY" as const,
      path: "areaVariables" as const,
      message: "The retained GIT does not have one exact editable Area VarTable profile.",
    }),
  });
}

function variableInvalid(): AreaPropertiesApplyResult {
  return Object.freeze({
    ok: false as const,
    error: Object.freeze({
      code: "AREA_VARIABLES_INVALID" as const,
      path: "areaVariables" as const,
      message: "Area variables exceed the admitted entry, type, value, or text budgets.",
    }),
  });
}

function emptyAreaAudioEnvironment(): AreaAudioEnvironment {
  return {
    ambientSoundDayId: 0,
    ambientSoundNightId: 0,
    ambientSoundDayVolume: 0,
    ambientSoundNightVolume: 0,
    environmentAudioId: 0,
    musicBattleId: 0,
    musicDayId: 0,
    musicNightId: 0,
    musicDelayMilliseconds: 0,
  };
}

function emptyAreaVisualEnvironment(): AreaVisualEnvironment {
  return {
    dayNightMode: "cycle",
    shadowOpacity: 0,
    chanceRain: 0,
    chanceSnow: 0,
    chanceLightning: 0,
    sun: {
      ambientColor: 0,
      diffuseColor: 0,
      fogColor: 0,
      fogAmount: 0,
      shadows: false,
    },
    moon: {
      ambientColor: 0,
      diffuseColor: 0,
      fogColor: 0,
      fogAmount: 0,
      shadows: false,
    },
  };
}

function freezeAreaVisualEnvironment(
  value: AreaVisualEnvironment,
): AreaVisualEnvironment {
  const cloned = cloneAreaVisualEnvironment(value);
  return Object.freeze({
    ...cloned,
    sun: Object.freeze(cloned.sun),
    moon: Object.freeze(cloned.moon),
  });
}

function mergeVisualEnvironmentLighting(
  lighting: SceneAreaGlobalLighting | undefined,
  value: AreaVisualEnvironment,
): SceneAreaGlobalLighting {
  const environmentFields = new Set<string>(AREA_VISUAL_ENVIRONMENT_LIGHTING_FIELD_NAMES);
  const fields: SceneAreaGlobalLighting["fields"] = [
    ...(lighting?.fields ?? [])
      .filter((field) => !environmentFields.has(field.field))
      .map((field) => Object.freeze({ ...field })),
    ...toAreaVisualEnvironmentLightingFields(value)
      .map((field) => Object.freeze({ ...field })),
  ];
  return Object.freeze({
    source: "are-root-fields" as const,
    fields,
  });
}

function emptyAreaVisualEnvironmentScalarControls(): AreaVisualEnvironmentScalarControls {
  return {
    fogClipDistance: 45,
    windPower: 0,
  };
}

function mergeVisualEnvironmentScalarLighting(
  lighting: SceneAreaGlobalLighting | undefined,
  value: AreaVisualEnvironmentScalarControls,
): SceneAreaGlobalLighting {
  const scalarFields = new Set(["FogClipDist", "WindPower"]);
  const fields: SceneAreaGlobalLighting["fields"] = [
    ...(lighting?.fields ?? [])
      .filter((field) => !scalarFields.has(field.field))
      .map((field) => Object.freeze({ ...field })),
    ...toAreaVisualEnvironmentScalarLightingFields(value)
      .map((field) => Object.freeze({ ...field })),
  ];
  return Object.freeze({
    source: "are-root-fields" as const,
    fields,
  });
}

function visualEnvironmentPreserveOnly(): AreaPropertiesApplyResult {
  return Object.freeze({
    ok: false as const,
    error: Object.freeze({
      code: "AREA_VISUAL_ENVIRONMENT_PRESERVE_ONLY" as const,
      path: "areaVisualEnvironment" as const,
      message: "The retained ARE has no complete exact editable visual-environment tuple.",
    }),
  });
}

function visualEnvironmentInvalid(): AreaPropertiesApplyResult {
  return Object.freeze({
    ok: false as const,
    error: Object.freeze({
      code: "AREA_VISUAL_ENVIRONMENT_INVALID" as const,
      path: "areaVisualEnvironment" as const,
      message: "Area visual environment exceeds the admitted mode, percent, RGB, fog, or shadow bounds.",
    }),
  });
}

function visualEnvironmentScalarControlsPreserveOnly(): AreaPropertiesApplyResult {
  return Object.freeze({
    ok: false as const,
    error: Object.freeze({
      code: "AREA_VISUAL_ENVIRONMENT_SCALAR_CONTROLS_PRESERVE_ONLY" as const,
      path: "areaVisualEnvironmentScalarControls" as const,
      message: "The retained ARE has no complete exact editable FogClipDist/WindPower pair.",
    }),
  });
}

function visualEnvironmentScalarControlsInvalid(): AreaPropertiesApplyResult {
  return Object.freeze({
    ok: false as const,
    error: Object.freeze({
      code: "AREA_VISUAL_ENVIRONMENT_SCALAR_CONTROLS_INVALID" as const,
      path: "areaVisualEnvironmentScalarControls" as const,
      message: "Fog Clip Distance must be an integer from 30 through 9999 and Wind Power an integer from 0 through 2.",
    }),
  });
}

function visualEnvironmentCatalogSelectionPreserveOnly(): AreaPropertiesApplyResult {
  return Object.freeze({
    ok: false as const,
    error: Object.freeze({
      code: "AREA_VISUAL_ENVIRONMENT_CATALOG_SELECTION_PRESERVE_ONLY" as const,
      path: "areaVisualEnvironmentCatalogSelection" as const,
      message: "The Area visual selection is not bound to complete effective 2DA catalogs.",
    }),
  });
}

function visualEnvironmentCatalogSelectionInvalid(): AreaPropertiesApplyResult {
  return Object.freeze({
    ok: false as const,
    error: Object.freeze({
      code: "AREA_VISUAL_ENVIRONMENT_CATALOG_SELECTION_INVALID" as const,
      path: "areaVisualEnvironmentCatalogSelection" as const,
      message: "The Area Lighting Scheme or Sky Box row is absent or malformed.",
    }),
  });
}

function catalogSelectionRowsExist(
  catalogs: EffectiveAreaVisualEnvironmentCatalogBundle,
  selection: AreaVisualEnvironmentCatalogSelection,
): boolean {
  return catalogs.lightingSchemes.rows.some(
    (row) => row.rowIndex === selection.lightingSchemeRowIndex,
  ) && catalogs.skyBoxes.rows.some(
    (row) => row.rowIndex === selection.skyBoxRowIndex,
  );
}

function audioEnvironmentPreserveOnly(): AreaPropertiesApplyResult {
  return Object.freeze({
    ok: false as const,
    error: Object.freeze({
      code: "AREA_AUDIO_ENVIRONMENT_PRESERVE_ONLY" as const,
      path: "areaAudioEnvironment" as const,
      message: "The retained GIT has no complete exact editable Area audio tuple.",
    }),
  });
}

function audioEnvironmentInvalid(message: string): AreaPropertiesApplyResult {
  return Object.freeze({
    ok: false as const,
    error: Object.freeze({
      code: "AREA_AUDIO_ENVIRONMENT_INVALID" as const,
      path: "areaAudioEnvironment" as const,
      message,
    }),
  });
}

function startLocationPreserveOnly(): AreaPropertiesApplyResult {
  return Object.freeze({
    ok: false as const,
    error: Object.freeze({
      code: "AREA_START_LOCATION_PRESERVE_ONLY" as const,
      path: "moduleStartLocation" as const,
      message: "The retained module.ifo has no exact editable start-location tuple.",
    }),
  });
}

function startLocationInvalid(message: string): AreaPropertiesApplyResult {
  return Object.freeze({
    ok: false as const,
    error: Object.freeze({
      code: "AREA_START_LOCATION_INVALID" as const,
      path: "moduleStartLocation" as const,
      message,
    }),
  });
}

function advancedPreserveOnly(
  field: "terrainType" | "playerVsPlayer" | "noRest" | "listenCheckModifier" | "spotCheckModifier" | "loadingScreenId",
  label: string,
): AreaPropertiesApplyResult {
  return Object.freeze({
    ok: false as const,
    error: Object.freeze({
      code: "AREA_ADVANCED_FLAG_PRESERVE_ONLY" as const,
      path: `areaAdvancedFlags.${field}` as const,
      message: `The retained ARE has no exact editable ${label} field.`,
    }),
  });
}

function advancedInvalid(
  field: "terrainType" | "playerVsPlayer" | "noRest" | "listenCheckModifier" | "spotCheckModifier" | "loadingScreenId",
  message: string,
): AreaPropertiesApplyResult {
  return Object.freeze({
    ok: false as const,
    error: Object.freeze({
      code: "AREA_ADVANCED_FLAG_INVALID" as const,
      path: `areaAdvancedFlags.${field}` as const,
      message,
    }),
  });
}
