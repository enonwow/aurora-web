import type {
  SceneObject,
  SceneObjectEncounterCreatureListBlueprintTargetEntry,
  SceneObjectEncounterCreatureListTargetEntry,
  SceneObjectEncounterSpawnPointTargetEntry,
  SceneObjectEncounterVariableTargetEntry,
  SceneObjectSourceMetadata,
  SceneEncounterDifficultyCatalog,
  SceneEncounterDifficultyPair,
  ScenePlaceableFactionCatalog,
} from "../../scene/contracts";
import {
  canEditExistingTriggerTag,
  materializeExistingTriggerTag,
  reduceExistingTriggerTag,
} from "../../layout/application/triggerTagProvenance";
import {
  canEditExistingEncounterTag,
  materializeExistingEncounterTag,
  reduceExistingEncounterTag,
} from "../../layout/application/encounterTagProvenance";
import {
  canEditExistingEncounterActive,
  materializeExistingEncounterActive,
  reduceExistingEncounterActive,
} from "../../layout/application/encounterActiveProvenance";
import {
  cloneEncounterActiveStorage,
  encounterActivePresentationFromStorage,
  readEncounterActiveStorage,
  type EncounterActiveStorage,
} from "../../scene/domain/encounterActive";
import {
  canEditExistingEncounterPlayerOnly,
  materializeExistingEncounterPlayerOnly,
  reduceExistingEncounterPlayerOnly,
} from "../../layout/application/encounterPlayerOnlyProvenance";
import {
  cloneEncounterPlayerOnlyStorage,
  encounterPlayerOnlyPresentationFromStorage,
  readEncounterPlayerOnlyStorage,
  type EncounterPlayerOnlyStorage,
} from "../../scene/domain/encounterPlayerOnly";
import {
  canEditExistingEncounterReset,
  materializeExistingEncounterReset,
  reduceExistingEncounterReset,
} from "../../layout/application/encounterResetProvenance";
import {
  cloneEncounterResetStorage,
  encounterResetPresentationFromStorage,
  readEncounterResetStorage,
  type EncounterResetStorage,
} from "../../scene/domain/encounterReset";
import {
  canEditExistingEncounterResetTime,
  materializeExistingEncounterResetTime,
  reduceExistingEncounterResetTime,
} from "../../layout/application/encounterResetTimeProvenance";
import {
  cloneEncounterResetTimeStorage,
  readEncounterResetTimeStorage,
  type EncounterResetTimeStorage,
} from "../../scene/domain/encounterResetTime";
import {
  canEditExistingEncounterSpawnOption,
  materializeExistingEncounterSpawnOption,
  reduceExistingEncounterSpawnOption,
} from "../../layout/application/encounterSpawnOptionProvenance";
import {
  cloneEncounterSpawnOptionStorage,
  readEncounterSpawnOptionStorage,
  type EncounterSpawnOption,
  type EncounterSpawnOptionStorage,
} from "../../scene/domain/encounterSpawnOption";
import {
  canEditExistingEncounterRespawns,
  materializeExistingEncounterRespawns,
  reduceExistingEncounterRespawnsFinite,
  reduceExistingEncounterRespawnsInfinite,
} from "../../layout/application/encounterRespawnsProvenance";
import {
  cloneEncounterRespawnsStorage,
  encounterRespawnsFinitePresentationFromStorage,
  encounterRespawnsInfinitePresentationFromStorage,
  readEncounterRespawnsStorage,
  type EncounterRespawnsStorage,
} from "../../scene/domain/encounterRespawns";
import {
  canEditExistingEncounterCreatureCounts,
  materializeExistingEncounterCreatureCounts,
  reduceExistingEncounterMaximumCreatures,
  reduceExistingEncounterMinimumCreatures,
} from "../../layout/application/encounterCreatureCountsProvenance";
import {
  cloneEncounterCreatureCountStorage,
  readEncounterCreatureCountStorage,
  type EncounterCreatureCountStorage,
} from "../../scene/domain/encounterCreatureCounts";
import {
  canEditExistingEncounterScriptResRefs,
  materializeExistingEncounterScriptResRefs,
  reduceExistingEncounterScriptResRef,
} from "../../layout/application/encounterScriptResRefsProvenance";
import {
  cloneEncounterScriptResRefsStorage,
  encounterScriptResRefsStoragesEqual,
  readEncounterScriptResRefsStorage,
  type EncounterScriptResRefField,
  type EncounterScriptResRefsStorage,
} from "../../scene/domain/encounterScriptResRefs";
import {
  canEditExistingTriggerScriptResRefs,
  materializeExistingTriggerScriptResRefs,
  reduceExistingTriggerScriptResRef,
} from "../../layout/application/triggerScriptResRefsProvenance";
import {
  cloneTriggerScriptResRefsStorage,
  readTriggerScriptResRefsStorage,
  triggerScriptResRefsStoragesEqual,
  type TriggerScriptResRefField,
  type TriggerScriptResRefsStorage,
} from "../../scene/domain/triggerScriptResRefs";
import {
  canEditExistingTriggerTransitionStorage,
  materializeExistingTriggerTransitionStorage,
  reduceExistingTriggerTransitionStorage,
} from "../../layout/application/triggerTransitionStorageProvenance";
import {
  cloneTriggerTransitionStorage,
  isTriggerTransitionStorage,
  triggerTransitionStoragesEqual,
  type TriggerTransitionStorage,
} from "../../scene/domain/triggerTransitionStorage";
import {
  canEditExistingEncounterFaction,
  materializeExistingEncounterFaction,
} from "../../layout/application/encounterFactionProvenance";
import {
  canEditExistingEncounterDifficulty,
  materializeExistingEncounterDifficulty,
} from "../../layout/application/encounterDifficultyProvenance";
import { readEncounterDifficultyTarget } from
  "../../scene/domain/encounterDifficulty";
import {
  canEditExistingEncounterLocalizedName,
  materializeExistingEncounterLocalizedName,
  readExistingEncounterLocalizedName,
  reduceExistingEncounterLocalizedName,
} from "../../layout/application/encounterLocalizedNameProvenance";
import {
  isEncounterLocalizedNameInlineAsciiText,
  readEncounterLocalizedNameStorage,
} from
  "../../scene/domain/encounterLocalizedName";
import {
  canEditExistingTriggerLocalizedName,
  materializeExistingTriggerLocalizedName,
  readExistingTriggerLocalizedName,
  reduceExistingTriggerLocalizedName,
} from "../../layout/application/triggerLocalizedNameProvenance";
import {
  isTriggerLocalizedNameInlineAsciiText,
  readTriggerLocalizedNameStorage,
} from "../../scene/domain/triggerLocalizedName";
import {
  canEditExistingEncounterTemplateResRef,
  materializeExistingEncounterTemplateResRef,
  reduceExistingEncounterTemplateResRef,
} from "../../layout/application/encounterTemplateResRefProvenance";
import {
  isEncounterTemplateResRef,
  readEncounterTemplateResRefStorage,
} from "../../scene/domain/encounterTemplateResRef";
import {
  canEditExistingTriggerTemplateResRef,
  materializeExistingTriggerTemplateResRef,
  reduceExistingTriggerTemplateResRef,
} from "../../layout/application/triggerTemplateResRefProvenance";
import {
  isTriggerTemplateResRef,
  readTriggerTemplateResRefStorage,
} from "../../scene/domain/triggerTemplateResRef";
import {
  canEditExistingEncounterEditorComment,
  materializeExistingEncounterEditorComment,
  reduceExistingEncounterEditorComment,
} from "../../layout/application/encounterEditorCommentProvenance";
import { isEncounterEditorComment } from "../../scene/domain/encounterEditorComment";
import {
  canEditExistingTriggerEditorComment,
  materializeExistingTriggerEditorComment,
  reduceExistingTriggerEditorComment,
} from "../../layout/application/triggerEditorCommentProvenance";
import { isTriggerEditorComment } from "../../scene/domain/triggerEditorComment";
import { canEditExistingEncounterVariables } from
  "../../layout/application/encounterVariableProvenance";
import {
  encounterVariableTargetEntriesEqual,
  readEncounterVariableProvenance,
  readEncounterVariableTargetEntries,
} from "../../scene/domain/encounterVariableTable";
import {
  appendExistingEncounterCreatureListEntry,
  canEditExistingEncounterCreatureSingleSpawn,
  moveExistingEncounterCreatureListEntry,
  removeExistingEncounterCreatureListEntry,
  replaceExistingEncounterCreatureListEntry,
  updateExistingEncounterCreatureSingleSpawn,
} from "../../layout/application/encounterCreatureSingleSpawnProvenance";
import {
  normalizeEncounterCreatureListTargetEntries,
  projectEncounterCreatureListSourceEntries,
  readEncounterCreatureListProvenance,
  readEncounterCreatureListTargetEntries,
} from "../../scene/domain/encounterCreatureSingleSpawn";
import {
  MAX_ENCOUNTER_SPAWN_POINT_ENTRIES,
  readEncounterSpawnPointListProvenance,
  readEncounterSpawnPointTargetEntries,
  sourceEncounterSpawnPointsToTarget,
} from "../../scene/domain/encounterSpawnPointList";
import {
  cloneAreaObjectPolygonGeometry,
  isAreaObjectPolygonGeometry,
  MAX_AREA_OBJECT_POLYGON_POINTS,
  MIN_AREA_OBJECT_POLYGON_POINTS,
  type AreaObjectPolygonGeometry,
} from "../domain/areaObjectPolygonGeometry";

export interface AreaObjectPolygonPointDraft {
  readonly x: string;
  readonly y: string;
  readonly z: string;
}

export interface AreaObjectPolygonDraft {
  readonly objectId: string;
  readonly objectKind: "triggers" | "encounters";
  readonly tag?: string;
  readonly tagControlState?: "ACTIVE_NOW" | "PRESERVE_ONLY";
  readonly active?: boolean;
  readonly activeControlState?: "ACTIVE_NOW" | "PRESERVE_ONLY";
  readonly playerOnly?: boolean;
  readonly playerOnlyControlState?: "ACTIVE_NOW" | "PRESERVE_ONLY";
  readonly reset?: boolean;
  readonly resetControlState?: "ACTIVE_NOW" | "PRESERVE_ONLY";
  readonly resetTime?: number;
  readonly resetTimeControlState?: "ACTIVE_NOW" | "PRESERVE_ONLY";
  readonly spawnOption?: EncounterSpawnOption;
  readonly spawnOptionControlState?: "ACTIVE_NOW" | "PRESERVE_ONLY";
  readonly respawns?: number;
  readonly respawnsInfinite?: boolean;
  readonly respawnsControlState?: "ACTIVE_NOW" | "PRESERVE_ONLY";
  readonly respawnsInfiniteControlState?: "ACTIVE_NOW" | "PRESERVE_ONLY";
  readonly creatureCounts?: EncounterCreatureCountStorage;
  readonly creatureCountsControlState?: "ACTIVE_NOW" | "PRESERVE_ONLY";
  readonly scriptResRefs?: EncounterScriptResRefsStorage;
  readonly scriptResRefsControlState?: "ACTIVE_NOW" | "PRESERVE_ONLY";
  readonly triggerScriptResRefs?: TriggerScriptResRefsStorage;
  readonly triggerScriptResRefsControlState?: "ACTIVE_NOW" | "PRESERVE_ONLY";
  readonly triggerTransitionStorage?: TriggerTransitionStorage;
  readonly triggerTransitionStorageControlState?: "ACTIVE_NOW" | "PRESERVE_ONLY";
  readonly factionId?: number;
  readonly factionControlState?: "ACTIVE_NOW" | "PRESERVE_ONLY";
  readonly difficulty?: SceneEncounterDifficultyPair;
  readonly difficultyControlState?: "ACTIVE_NOW" | "PRESERVE_ONLY";
  readonly localizedName?: string;
  readonly localizedNameControlState?: "ACTIVE_NOW" | "PRESERVE_ONLY";
  readonly templateResRef?: string;
  readonly templateResRefControlState?: "ACTIVE_NOW" | "PRESERVE_ONLY";
  readonly editorComment?: string;
  readonly editorCommentControlState?: "ACTIVE_NOW" | "PRESERVE_ONLY";
  readonly variables?: readonly SceneObjectEncounterVariableTargetEntry[];
  readonly variablesControlState?: "ACTIVE_NOW" | "PRESERVE_ONLY";
  readonly creatureList?: readonly SceneObjectEncounterCreatureListTargetEntry[];
  readonly creatureListControlState?: "ACTIVE_NOW" | "PRESERVE_ONLY";
  readonly spawnPoints?: readonly SceneObjectEncounterSpawnPointTargetEntry[];
  readonly spawnPointsControlState?: "ACTIVE_NOW" | "PRESERVE_ONLY";
  readonly points: readonly AreaObjectPolygonPointDraft[];
}

export type AreaObjectPolygonPointField = keyof AreaObjectPolygonPointDraft;

export function buildAreaObjectPolygonDraft(
  object: SceneObject,
  encounterFactionCatalog?: ScenePlaceableFactionCatalog | null,
  encounterDifficultyCatalog?: SceneEncounterDifficultyCatalog | null,
): AreaObjectPolygonDraft | null {
  if (object.kind !== "triggers" && object.kind !== "encounters") return null;
  const sourceKind = object.kind === "triggers" ? "trigger" : "encounter";
  if (
    object.source?.type !== "aurora_git"
    || object.source.sourceKind !== sourceKind
    || !Number.isSafeInteger(object.source.sourceIndex)
    || Number(object.source.sourceIndex) < 0
    || !isAreaObjectPolygonGeometry(object.source.polygonGeometry)
  ) {
    return null;
  }
  const geometry = isAreaObjectPolygonGeometry(object.polygonGeometry)
    ? cloneAreaObjectPolygonGeometry(object.polygonGeometry)
    : cloneAreaObjectPolygonGeometry(object.source.polygonGeometry);
  const encounterActive = object.kind === "encounters"
    ? readEncounterActiveStorage(
      object.encounterActive ?? object.source.encounterActiveStorage,
    )
    : null;
  const encounterPlayerOnly = object.kind === "encounters"
    ? readEncounterPlayerOnlyStorage(
      object.encounterPlayerOnly ?? object.source.encounterPlayerOnlyStorage,
    )
    : null;
  const encounterReset = object.kind === "encounters"
    ? readEncounterResetStorage(
      object.encounterReset ?? object.source.encounterResetStorage,
    )
    : null;
  const encounterResetTime = object.kind === "encounters"
    ? readEncounterResetTimeStorage(
      object.encounterResetTime ?? object.source.encounterResetTimeStorage,
    )
    : null;
  const encounterSpawnOption = object.kind === "encounters"
    ? readEncounterSpawnOptionStorage(
      object.encounterSpawnOption ?? object.source.encounterSpawnOptionStorage,
    )
    : null;
  const encounterRespawns = object.kind === "encounters"
    ? readEncounterRespawnsStorage(
      object.encounterRespawns ?? object.source.encounterRespawnsStorage,
    )
    : null;
  const encounterCreatureCounts = object.kind === "encounters"
    ? readEncounterCreatureCountStorage(
      object.encounterCreatureCounts
        ?? object.source.encounterCreatureCountsStorage,
    )
    : null;
  const encounterScriptResRefs = object.kind === "encounters"
    ? readEncounterScriptResRefsStorage(
      object.encounterScriptResRefs
        ?? object.source.encounterScriptResRefsStorage,
    )
    : null;
  const triggerScriptResRefs = object.kind === "triggers"
    ? readTriggerScriptResRefsStorage(
      object.triggerScriptResRefs
        ?? object.source.triggerScriptResRefsStorage,
    )
    : null;
  const triggerTransitionStorage = object.kind === "triggers"
    && isTriggerTransitionStorage(
      object.triggerTransitionStorage ?? object.source.triggerTransitionStorage,
    )
    ? object.triggerTransitionStorage ?? object.source.triggerTransitionStorage
    : undefined;
  const encounterFactionId = object.kind === "encounters"
    && Number.isSafeInteger(object.encounterFactionId)
    && Number(object.encounterFactionId) >= 1
    ? Number(object.encounterFactionId)
    : undefined;
  const encounterDifficulty = object.kind === "encounters"
    ? readEncounterDifficultyTarget(
        object.encounterDifficulty,
        encounterDifficultyCatalog,
      )
    : null;
  const encounterLocalizedNameStorage = object.kind === "encounters"
    ? readEncounterLocalizedNameStorage(
        object.source.encounterLocalizedNameStorage,
      )
    : undefined;
  const retainedEncounterLocalizedName = object.kind === "encounters"
    ? readExistingEncounterLocalizedName(object.source)
    : undefined;
  const encounterLocalizedName = retainedEncounterLocalizedName !== undefined
    && isEncounterLocalizedNameInlineAsciiText(object.encounterLocalizedName)
    ? object.encounterLocalizedName
    : retainedEncounterLocalizedName;
  const encounterTemplateResRefStorage = object.kind === "encounters"
    ? readEncounterTemplateResRefStorage(object.source.encounterTemplateResRef)
    : null;
  const encounterTemplateResRef = encounterTemplateResRefStorage?.present === true
    ? isEncounterTemplateResRef(object.encounterTemplateResRef)
      ? object.encounterTemplateResRef
      : encounterTemplateResRefStorage.value
    : undefined;
  const triggerTemplateResRefStorage = object.kind === "triggers"
    ? readTriggerTemplateResRefStorage(object.source.triggerTemplateResRef)
    : null;
  const triggerTemplateResRef = triggerTemplateResRefStorage?.present === true
    ? isTriggerTemplateResRef(object.triggerTemplateResRef)
      ? object.triggerTemplateResRef
      : triggerTemplateResRefStorage.value
    : undefined;
  const triggerLocalizedNameStorage = object.kind === "triggers"
    ? readTriggerLocalizedNameStorage(
        object.source.triggerLocalizedNameStorage,
      )
    : undefined;
  const retainedTriggerLocalizedName = object.kind === "triggers"
    ? readExistingTriggerLocalizedName(object.source)
    : undefined;
  const triggerLocalizedName = retainedTriggerLocalizedName !== undefined
    && isTriggerLocalizedNameInlineAsciiText(object.triggerLocalizedName)
    ? object.triggerLocalizedName
    : retainedTriggerLocalizedName;
  const retainedTriggerEditorComment = object.kind === "triggers" &&
      canEditExistingTriggerEditorComment(object.source)
    ? object.source.triggerEditorComment
    : undefined;
  const triggerEditorComment = retainedTriggerEditorComment !== undefined &&
      isTriggerEditorComment(object.triggerEditorComment)
    ? object.triggerEditorComment
    : retainedTriggerEditorComment;
  const retainedEncounterEditorComment = object.kind === "encounters" &&
      canEditExistingEncounterEditorComment(object.source)
    ? object.source.encounterEditorComment
    : undefined;
  const encounterEditorComment = retainedEncounterEditorComment !== undefined &&
      isEncounterEditorComment(object.encounterProperties?.comments)
    ? object.encounterProperties.comments
    : retainedEncounterEditorComment;
  const encounterVariableProvenance = object.kind === "encounters"
    ? readEncounterVariableProvenance(object.source.encounterVariables)
    : null;
  const encounterVariableTarget = encounterVariableProvenance
    ? readEncounterVariableTargetEntries(object.encounterProperties?.variables)
      ?? encounterVariableProvenance.expectedEntries.map(
        ({ sourceIndex: _, ...entry }) => ({ ...entry }),
      )
    : null;
  const encounterCreatureListProvenance = object.kind === "encounters"
    ? readEncounterCreatureListProvenance(object.source.encounterCreatureList)
    : null;
  const currentEncounterCreatureList = encounterCreatureListProvenance
    ? readEncounterCreatureListTargetEntries(object.encounterProperties?.creatureList)
    : null;
  const encounterCreatureListTarget = encounterCreatureListProvenance
    ? currentEncounterCreatureList
      ? normalizeEncounterCreatureListTargetEntries(
          encounterCreatureListProvenance.expectedEntries,
          currentEncounterCreatureList,
        ) ?? projectEncounterCreatureListSourceEntries(
          encounterCreatureListProvenance.expectedEntries,
        )
      : projectEncounterCreatureListSourceEntries(
          encounterCreatureListProvenance.expectedEntries,
        )
    : null;
  const encounterSpawnPointListProvenance = object.kind === "encounters"
    ? readEncounterSpawnPointListProvenance(object.source.encounterSpawnPoints)
    : null;
  const currentEncounterSpawnPoints = encounterSpawnPointListProvenance
    ? readEncounterSpawnPointTargetEntries(object.encounterProperties?.spawnPoints)
    : null;
  const encounterSpawnPointTarget = encounterSpawnPointListProvenance
    ? currentEncounterSpawnPoints
      ?? sourceEncounterSpawnPointsToTarget(
        encounterSpawnPointListProvenance.expectedEntries,
      )
    : null;
  const spawnOptionEditable = encounterSpawnOption !== null
    && canEditExistingEncounterSpawnOption(object.source);
  const spawnOptionContinuous = spawnOptionEditable
    && encounterSpawnOption.spawnOption === 0;
  const respawnsEditable = encounterRespawns !== null
    && canEditExistingEncounterRespawns(object.source);
  const respawnsInfinite = encounterRespawns
    ? encounterRespawnsInfinitePresentationFromStorage(encounterRespawns)
    : false;
  const resetEnabled = encounterReset?.resetByte === 1;
  return Object.freeze({
    objectId: object.id,
    objectKind: object.kind,
    tag: object.tag,
    tagControlState: (
      object.kind === "triggers"
        ? canEditExistingTriggerTag(object.source)
        : canEditExistingEncounterTag(object.source)
    ) ? "ACTIVE_NOW" as const : "PRESERVE_ONLY" as const,
    ...(encounterActive
      ? {
        active: encounterActivePresentationFromStorage(encounterActive).active,
        activeControlState: canEditExistingEncounterActive(object.source)
          ? "ACTIVE_NOW" as const
          : "PRESERVE_ONLY" as const,
      }
      : {}),
    ...(encounterPlayerOnly
      ? {
        playerOnly: encounterPlayerOnlyPresentationFromStorage(
          encounterPlayerOnly,
        ).playerOnly,
        playerOnlyControlState: canEditExistingEncounterPlayerOnly(object.source)
          ? "ACTIVE_NOW" as const
          : "PRESERVE_ONLY" as const,
      }
      : {}),
    ...(encounterReset
      ? {
        reset: encounterResetPresentationFromStorage(encounterReset).reset,
        resetControlState: canEditExistingEncounterReset(object.source)
          && spawnOptionContinuous
          ? "ACTIVE_NOW" as const
          : "PRESERVE_ONLY" as const,
      }
      : {}),
    ...(encounterResetTime
      ? {
        resetTime: encounterResetTime.resetTime,
        resetTimeControlState: canEditExistingEncounterResetTime(object.source)
          && encounterReset !== null
          && encounterReset.resetByte === 1
          && spawnOptionContinuous
          ? "ACTIVE_NOW" as const
          : "PRESERVE_ONLY" as const,
      }
      : {}),
    ...(encounterSpawnOption
      ? {
        spawnOption: encounterSpawnOption.spawnOption,
        spawnOptionControlState: spawnOptionEditable
          ? "ACTIVE_NOW" as const
          : "PRESERVE_ONLY" as const,
      }
      : {}),
    ...(encounterRespawns
      ? {
        respawns: encounterRespawnsFinitePresentationFromStorage(encounterRespawns),
        respawnsInfinite,
        respawnsInfiniteControlState: respawnsEditable
          && resetEnabled
          && spawnOptionContinuous
          ? "ACTIVE_NOW" as const
          : "PRESERVE_ONLY" as const,
        respawnsControlState: respawnsEditable
          && resetEnabled
          && spawnOptionContinuous
          && !respawnsInfinite
          ? "ACTIVE_NOW" as const
          : "PRESERVE_ONLY" as const,
      }
      : {}),
    ...(encounterCreatureCounts
      ? {
        creatureCounts: cloneEncounterCreatureCountStorage(
          encounterCreatureCounts,
        ),
        creatureCountsControlState:
          canEditExistingEncounterCreatureCounts(object.source)
            ? "ACTIVE_NOW" as const
            : "PRESERVE_ONLY" as const,
      }
      : {}),
    ...(encounterScriptResRefs
      ? {
        scriptResRefs: cloneEncounterScriptResRefsStorage(encounterScriptResRefs),
        scriptResRefsControlState:
          canEditExistingEncounterScriptResRefs(object.source)
            ? "ACTIVE_NOW" as const
            : "PRESERVE_ONLY" as const,
      }
      : {}),
    ...(triggerScriptResRefs
      ? {
        triggerScriptResRefs: cloneTriggerScriptResRefsStorage(triggerScriptResRefs),
        triggerScriptResRefsControlState:
          canEditExistingTriggerScriptResRefs(object.source)
            ? "ACTIVE_NOW" as const
            : "PRESERVE_ONLY" as const,
      }
      : {}),
    ...(triggerTransitionStorage
      ? {
        triggerTransitionStorage:
          cloneTriggerTransitionStorage(triggerTransitionStorage),
        triggerTransitionStorageControlState:
          canEditExistingTriggerTransitionStorage(object.source)
            ? "ACTIVE_NOW" as const
            : "PRESERVE_ONLY" as const,
      }
      : {}),
    ...(encounterFactionId !== undefined
      ? {
        factionId: encounterFactionId,
        factionControlState: canEditExistingEncounterFaction(
          object.source,
          encounterFactionCatalog,
        )
          ? "ACTIVE_NOW" as const
          : "PRESERVE_ONLY" as const,
      }
      : {}),
    ...(encounterDifficulty
      ? {
        difficulty: Object.freeze({ ...encounterDifficulty }),
        difficultyControlState: canEditExistingEncounterDifficulty(
          object.source,
          encounterDifficultyCatalog,
        )
          ? "ACTIVE_NOW" as const
          : "PRESERVE_ONLY" as const,
      }
      : {}),
    ...(encounterLocalizedNameStorage
      ? {
        localizedName: encounterLocalizedName ?? "",
        localizedNameControlState: canEditExistingEncounterLocalizedName(
          object.source,
        )
          ? "ACTIVE_NOW" as const
          : "PRESERVE_ONLY" as const,
      }
      : {}),
    ...(encounterTemplateResRefStorage
      ? {
        templateResRef: encounterTemplateResRef ?? "",
        templateResRefControlState: canEditExistingEncounterTemplateResRef(
          object.source,
        )
          ? "ACTIVE_NOW" as const
          : "PRESERVE_ONLY" as const,
      }
      : {}),
    ...(triggerTemplateResRefStorage
      ? {
        templateResRef: triggerTemplateResRef ?? "",
        templateResRefControlState: canEditExistingTriggerTemplateResRef(
          object.source,
        )
          ? "ACTIVE_NOW" as const
          : "PRESERVE_ONLY" as const,
      }
      : {}),
    ...(triggerLocalizedNameStorage
      ? {
        localizedName: triggerLocalizedName ?? "",
        localizedNameControlState: canEditExistingTriggerLocalizedName(
          object.source,
        )
          ? "ACTIVE_NOW" as const
          : "PRESERVE_ONLY" as const,
      }
      : {}),
    ...(triggerEditorComment !== undefined
      ? {
          editorComment: triggerEditorComment,
          editorCommentControlState: "ACTIVE_NOW" as const,
        }
      : {}),
    ...(encounterEditorComment !== undefined
      ? {
        editorComment: encounterEditorComment,
        editorCommentControlState: "ACTIVE_NOW" as const,
      }
      : {}),
    ...(encounterVariableTarget
      ? {
        variables: Object.freeze(encounterVariableTarget.map((entry) => Object.freeze({ ...entry }))),
        variablesControlState: canEditExistingEncounterVariables(object.source)
          ? "ACTIVE_NOW" as const
          : "PRESERVE_ONLY" as const,
      }
      : {}),
    ...(encounterCreatureListTarget
      ? {
          creatureList: Object.freeze(
            encounterCreatureListTarget.map((entry) => Object.freeze({ ...entry })),
          ),
          creatureListControlState: canEditExistingEncounterCreatureSingleSpawn(
            object.source,
          )
            ? "ACTIVE_NOW" as const
            : "PRESERVE_ONLY" as const,
        }
      : {}),
    ...(encounterSpawnPointTarget
      ? {
          spawnPoints: Object.freeze(
            encounterSpawnPointTarget.map((entry) => Object.freeze({ ...entry })),
          ),
          spawnPointsControlState: "ACTIVE_NOW" as const,
        }
      : {}),
    points: Object.freeze(geometry.points.map((point) => Object.freeze({
      x: String(point.x),
      y: String(point.y),
      z: String(point.z),
    }))),
  });
}

export function updateAreaObjectPolygonDraftActive(
  draft: AreaObjectPolygonDraft,
  source: SceneObjectSourceMetadata | undefined,
  value: unknown,
): AreaObjectPolygonDraft {
  if (draft.objectKind !== "encounters" || draft.active === undefined) return draft;
  const active = reduceExistingEncounterActive(source, draft.active, value);
  return active === draft.active ? draft : Object.freeze({ ...draft, active });
}

export function materializeAreaObjectPolygonDraftActive(
  draft: AreaObjectPolygonDraft,
  source: SceneObjectSourceMetadata | undefined,
  currentStorage: EncounterActiveStorage | undefined,
): EncounterActiveStorage | undefined {
  const current = readEncounterActiveStorage(currentStorage);
  if (!current) return undefined;
  if (draft.objectKind !== "encounters" || draft.active === undefined) {
    return cloneEncounterActiveStorage(current);
  }
  return materializeExistingEncounterActive(source, current, draft.active);
}

export function updateAreaObjectPolygonDraftPlayerOnly(
  draft: AreaObjectPolygonDraft,
  source: SceneObjectSourceMetadata | undefined,
  value: unknown,
): AreaObjectPolygonDraft {
  if (draft.objectKind !== "encounters" || draft.playerOnly === undefined) return draft;
  const playerOnly = reduceExistingEncounterPlayerOnly(
    source,
    draft.playerOnly,
    value,
  );
  return playerOnly === draft.playerOnly
    ? draft
    : Object.freeze({ ...draft, playerOnly });
}

export function materializeAreaObjectPolygonDraftPlayerOnly(
  draft: AreaObjectPolygonDraft,
  source: SceneObjectSourceMetadata | undefined,
  currentStorage: EncounterPlayerOnlyStorage | undefined,
): EncounterPlayerOnlyStorage | undefined {
  const current = readEncounterPlayerOnlyStorage(currentStorage);
  if (!current) return undefined;
  if (draft.objectKind !== "encounters" || draft.playerOnly === undefined) {
    return cloneEncounterPlayerOnlyStorage(current);
  }
  return materializeExistingEncounterPlayerOnly(source, current, draft.playerOnly);
}

export function updateAreaObjectPolygonDraftReset(
  draft: AreaObjectPolygonDraft,
  source: SceneObjectSourceMetadata | undefined,
  value: unknown,
): AreaObjectPolygonDraft {
  if (
    draft.objectKind !== "encounters"
    || draft.reset === undefined
    || draft.spawnOption !== 0
    || !canEditExistingEncounterSpawnOption(source)
  ) return draft;
  const reset = reduceExistingEncounterReset(source, draft.reset, value);
  if (reset === draft.reset) return draft;
  return Object.freeze({
    ...draft,
    reset,
    resetTimeControlState: reset
      && canEditExistingEncounterResetTime(source)
      ? "ACTIVE_NOW"
      : "PRESERVE_ONLY",
    respawnsInfiniteControlState: reset
      && draft.spawnOption === 0
      && canEditExistingEncounterRespawns(source)
      ? "ACTIVE_NOW"
      : "PRESERVE_ONLY",
    respawnsControlState: reset
      && draft.spawnOption === 0
      && draft.respawnsInfinite === false
      && canEditExistingEncounterRespawns(source)
      ? "ACTIVE_NOW"
      : "PRESERVE_ONLY",
  });
}

export function materializeAreaObjectPolygonDraftReset(
  draft: AreaObjectPolygonDraft,
  source: SceneObjectSourceMetadata | undefined,
  currentStorage: EncounterResetStorage | undefined,
): EncounterResetStorage | undefined {
  const current = readEncounterResetStorage(currentStorage);
  if (!current) return undefined;
  if (draft.objectKind !== "encounters" || draft.reset === undefined) {
    return cloneEncounterResetStorage(current);
  }
  return materializeExistingEncounterReset(source, current, draft.reset);
}

export function updateAreaObjectPolygonDraftResetTime(
  draft: AreaObjectPolygonDraft,
  source: SceneObjectSourceMetadata | undefined,
  value: unknown,
): AreaObjectPolygonDraft {
  if (draft.objectKind !== "encounters" || draft.resetTime === undefined) return draft;
  const resetTime = reduceExistingEncounterResetTime(
    source,
    draft.resetTime,
    value,
    draft.reset === true,
    draft.spawnOption === 0 && canEditExistingEncounterSpawnOption(source),
  );
  return resetTime === draft.resetTime
    ? draft
    : Object.freeze({ ...draft, resetTime });
}

export function materializeAreaObjectPolygonDraftResetTime(
  draft: AreaObjectPolygonDraft,
  source: SceneObjectSourceMetadata | undefined,
  currentStorage: EncounterResetTimeStorage | undefined,
): EncounterResetTimeStorage | undefined {
  const current = readEncounterResetTimeStorage(currentStorage);
  if (!current) return undefined;
  if (draft.objectKind !== "encounters" || draft.resetTime === undefined) {
    return cloneEncounterResetTimeStorage(current);
  }
  return materializeExistingEncounterResetTime(source, current, draft.resetTime);
}

export function updateAreaObjectPolygonDraftSpawnOption(
  draft: AreaObjectPolygonDraft,
  source: SceneObjectSourceMetadata | undefined,
  value: unknown,
): AreaObjectPolygonDraft {
  if (draft.objectKind !== "encounters" || draft.spawnOption === undefined) return draft;
  const spawnOption = reduceExistingEncounterSpawnOption(
    source,
    draft.spawnOption,
    value,
  );
  if (spawnOption === draft.spawnOption) return draft;
  const continuous = spawnOption === 0;
  return Object.freeze({
    ...draft,
    spawnOption,
    resetControlState: continuous
      && canEditExistingEncounterReset(source)
      ? "ACTIVE_NOW"
      : "PRESERVE_ONLY",
    resetTimeControlState: continuous
      && draft.reset === true
      && canEditExistingEncounterResetTime(source)
      ? "ACTIVE_NOW"
      : "PRESERVE_ONLY",
    respawnsInfiniteControlState: continuous
      && draft.reset === true
      && canEditExistingEncounterRespawns(source)
      ? "ACTIVE_NOW"
      : "PRESERVE_ONLY",
    respawnsControlState: continuous
      && draft.reset === true
      && draft.respawnsInfinite === false
      && canEditExistingEncounterRespawns(source)
      ? "ACTIVE_NOW"
      : "PRESERVE_ONLY",
  });
}

export function materializeAreaObjectPolygonDraftSpawnOption(
  draft: AreaObjectPolygonDraft,
  source: SceneObjectSourceMetadata | undefined,
  currentStorage: EncounterSpawnOptionStorage | undefined,
): EncounterSpawnOptionStorage | undefined {
  const current = readEncounterSpawnOptionStorage(currentStorage);
  if (!current) return undefined;
  if (draft.objectKind !== "encounters" || draft.spawnOption === undefined) {
    return cloneEncounterSpawnOptionStorage(current);
  }
  return materializeExistingEncounterSpawnOption(source, current, draft.spawnOption);
}

export function updateAreaObjectPolygonDraftRespawnsFinite(
  draft: AreaObjectPolygonDraft,
  source: SceneObjectSourceMetadata | undefined,
  value: unknown,
): AreaObjectPolygonDraft {
  if (
    draft.objectKind !== "encounters"
    || draft.respawns === undefined
    || draft.respawnsInfinite === undefined
  ) return draft;
  const respawns = reduceExistingEncounterRespawnsFinite(
    source,
    draft.respawns,
    value,
    draft.reset === true,
    draft.spawnOption === 0 && canEditExistingEncounterSpawnOption(source),
    draft.respawnsInfinite,
  );
  return respawns === draft.respawns
    ? draft
    : Object.freeze({ ...draft, respawns });
}

export function updateAreaObjectPolygonDraftRespawnsInfinite(
  draft: AreaObjectPolygonDraft,
  source: SceneObjectSourceMetadata | undefined,
  value: unknown,
): AreaObjectPolygonDraft {
  if (
    draft.objectKind !== "encounters"
    || draft.respawns === undefined
    || draft.respawnsInfinite === undefined
  ) return draft;
  const respawnsInfinite = reduceExistingEncounterRespawnsInfinite(
    source,
    draft.respawnsInfinite,
    value,
    draft.reset === true,
    draft.spawnOption === 0 && canEditExistingEncounterSpawnOption(source),
  );
  if (respawnsInfinite === draft.respawnsInfinite) return draft;
  return Object.freeze({
    ...draft,
    respawnsInfinite,
    respawnsControlState: !respawnsInfinite
      && draft.reset === true
      && draft.spawnOption === 0
      && canEditExistingEncounterRespawns(source)
      ? "ACTIVE_NOW"
      : "PRESERVE_ONLY",
  });
}

export function materializeAreaObjectPolygonDraftRespawns(
  draft: AreaObjectPolygonDraft,
  source: SceneObjectSourceMetadata | undefined,
  currentStorage: EncounterRespawnsStorage | undefined,
): EncounterRespawnsStorage | undefined {
  const current = readEncounterRespawnsStorage(currentStorage);
  if (!current) return undefined;
  if (
    draft.objectKind !== "encounters"
    || draft.respawns === undefined
    || draft.respawnsInfinite === undefined
  ) {
    return cloneEncounterRespawnsStorage(current);
  }
  return materializeExistingEncounterRespawns(
    source,
    current,
    draft.respawns,
    draft.respawnsInfinite,
  );
}

export function updateAreaObjectPolygonDraftMaximumCreatures(
  draft: AreaObjectPolygonDraft,
  source: SceneObjectSourceMetadata | undefined,
  value: unknown,
): AreaObjectPolygonDraft {
  if (draft.objectKind !== "encounters" || !draft.creatureCounts) return draft;
  const creatureCounts = reduceExistingEncounterMaximumCreatures(
    source,
    draft.creatureCounts,
    value,
  );
  return creatureCounts.maxCreatures === draft.creatureCounts.maxCreatures
      && creatureCounts.recCreatures === draft.creatureCounts.recCreatures
    ? draft
    : Object.freeze({ ...draft, creatureCounts });
}

export function updateAreaObjectPolygonDraftMinimumCreatures(
  draft: AreaObjectPolygonDraft,
  source: SceneObjectSourceMetadata | undefined,
  value: unknown,
): AreaObjectPolygonDraft {
  if (draft.objectKind !== "encounters" || !draft.creatureCounts) return draft;
  const creatureCounts = reduceExistingEncounterMinimumCreatures(
    source,
    draft.creatureCounts,
    value,
  );
  return creatureCounts.maxCreatures === draft.creatureCounts.maxCreatures
      && creatureCounts.recCreatures === draft.creatureCounts.recCreatures
    ? draft
    : Object.freeze({ ...draft, creatureCounts });
}

export function materializeAreaObjectPolygonDraftCreatureCounts(
  draft: AreaObjectPolygonDraft,
  source: SceneObjectSourceMetadata | undefined,
  currentStorage: EncounterCreatureCountStorage | undefined,
): EncounterCreatureCountStorage | undefined {
  const current = readEncounterCreatureCountStorage(currentStorage);
  if (!current) return undefined;
  if (draft.objectKind !== "encounters" || !draft.creatureCounts) {
    return cloneEncounterCreatureCountStorage(current);
  }
  return materializeExistingEncounterCreatureCounts(
    source,
    current,
    draft.creatureCounts,
  );
}

export function updateAreaObjectPolygonDraftScriptResRef(
  draft: AreaObjectPolygonDraft,
  source: SceneObjectSourceMetadata | undefined,
  field: EncounterScriptResRefField,
  value: unknown,
): AreaObjectPolygonDraft {
  if (draft.objectKind !== "encounters" || !draft.scriptResRefs) return draft;
  const scriptResRefs = reduceExistingEncounterScriptResRef(
    source,
    draft.scriptResRefs,
    field,
    value,
  );
  return encounterScriptResRefsStoragesEqual(scriptResRefs, draft.scriptResRefs)
    ? draft
    : Object.freeze({ ...draft, scriptResRefs });
}

export function materializeAreaObjectPolygonDraftScriptResRefs(
  draft: AreaObjectPolygonDraft,
  source: SceneObjectSourceMetadata | undefined,
  currentStorage: EncounterScriptResRefsStorage | undefined,
): EncounterScriptResRefsStorage | undefined {
  const current = readEncounterScriptResRefsStorage(currentStorage);
  if (!current) return undefined;
  if (draft.objectKind !== "encounters" || !draft.scriptResRefs) {
    return cloneEncounterScriptResRefsStorage(current);
  }
  return materializeExistingEncounterScriptResRefs(
    source,
    current,
    draft.scriptResRefs,
  );
}

export function updateAreaObjectPolygonDraftTriggerScriptResRef(
  draft: AreaObjectPolygonDraft,
  source: SceneObjectSourceMetadata | undefined,
  field: TriggerScriptResRefField,
  value: unknown,
): AreaObjectPolygonDraft {
  if (draft.objectKind !== "triggers" || !draft.triggerScriptResRefs) return draft;
  const triggerScriptResRefs = reduceExistingTriggerScriptResRef(
    source,
    draft.triggerScriptResRefs,
    field,
    value,
  );
  return triggerScriptResRefsStoragesEqual(
    triggerScriptResRefs,
    draft.triggerScriptResRefs,
  )
    ? draft
    : Object.freeze({ ...draft, triggerScriptResRefs });
}

export function materializeAreaObjectPolygonDraftTriggerScriptResRefs(
  draft: AreaObjectPolygonDraft,
  source: SceneObjectSourceMetadata | undefined,
  currentStorage: TriggerScriptResRefsStorage | undefined,
): TriggerScriptResRefsStorage | undefined {
  const current = readTriggerScriptResRefsStorage(currentStorage);
  if (!current) return undefined;
  if (draft.objectKind !== "triggers" || !draft.triggerScriptResRefs) {
    return cloneTriggerScriptResRefsStorage(current);
  }
  return materializeExistingTriggerScriptResRefs(
    source,
    current,
    draft.triggerScriptResRefs,
  );
}

export function updateAreaObjectPolygonDraftTriggerTransitionStorage(
  draft: AreaObjectPolygonDraft,
  source: SceneObjectSourceMetadata | undefined,
  value: unknown,
): AreaObjectPolygonDraft {
  if (
    draft.objectKind !== "triggers"
    || !draft.triggerTransitionStorage
  ) return draft;
  const triggerTransitionStorage = reduceExistingTriggerTransitionStorage(
    source,
    draft.triggerTransitionStorage,
    value,
  );
  return triggerTransitionStoragesEqual(
    triggerTransitionStorage,
    draft.triggerTransitionStorage,
  )
    ? draft
    : Object.freeze({ ...draft, triggerTransitionStorage });
}

export function materializeAreaObjectPolygonDraftTriggerTransitionStorage(
  draft: AreaObjectPolygonDraft,
  source: SceneObjectSourceMetadata | undefined,
  currentStorage: TriggerTransitionStorage | undefined,
): TriggerTransitionStorage | undefined {
  if (!isTriggerTransitionStorage(currentStorage)) return undefined;
  if (
    draft.objectKind !== "triggers"
    || !draft.triggerTransitionStorage
  ) return cloneTriggerTransitionStorage(currentStorage);
  return materializeExistingTriggerTransitionStorage(
    source,
    currentStorage,
    draft.triggerTransitionStorage,
  );
}

export function updateAreaObjectPolygonDraftFaction(
  draft: AreaObjectPolygonDraft,
  source: SceneObjectSourceMetadata | undefined,
  catalog: ScenePlaceableFactionCatalog | null | undefined,
  value: unknown,
): AreaObjectPolygonDraft {
  if (draft.objectKind !== "encounters" || draft.factionId === undefined) {
    return draft;
  }
  const factionId = materializeExistingEncounterFaction(
    source,
    draft.factionId,
    value,
    catalog,
  );
  return factionId === draft.factionId || factionId === undefined
    ? draft
    : Object.freeze({ ...draft, factionId });
}

export function materializeAreaObjectPolygonDraftFaction(
  draft: AreaObjectPolygonDraft,
  source: SceneObjectSourceMetadata | undefined,
  currentFactionId: number | undefined,
  catalog: ScenePlaceableFactionCatalog | null | undefined,
): number | undefined {
  if (draft.objectKind !== "encounters" || draft.factionId === undefined) {
    return currentFactionId;
  }
  return materializeExistingEncounterFaction(
    source,
    currentFactionId,
    draft.factionId,
    catalog,
  );
}

export function updateAreaObjectPolygonDraftDifficulty(
  draft: AreaObjectPolygonDraft,
  source: SceneObjectSourceMetadata | undefined,
  catalog: SceneEncounterDifficultyCatalog | null | undefined,
  difficultyIndex: unknown,
): AreaObjectPolygonDraft {
  if (draft.objectKind !== "encounters" || !draft.difficulty ||
      !Number.isSafeInteger(difficultyIndex)) return draft;
  const row = catalog?.rows[Number(difficultyIndex)];
  if (!row || row.rowIndex !== difficultyIndex) return draft;
  const difficulty = materializeExistingEncounterDifficulty(
    source,
    draft.difficulty,
    { difficulty: row.value, difficultyIndex: row.rowIndex },
    catalog,
  );
  return !difficulty || (difficulty.difficulty === draft.difficulty.difficulty &&
    difficulty.difficultyIndex === draft.difficulty.difficultyIndex)
    ? draft
    : Object.freeze({ ...draft, difficulty: Object.freeze({ ...difficulty }) });
}

export function materializeAreaObjectPolygonDraftDifficulty(
  draft: AreaObjectPolygonDraft,
  source: SceneObjectSourceMetadata | undefined,
  current: SceneEncounterDifficultyPair | undefined,
  catalog: SceneEncounterDifficultyCatalog | null | undefined,
): SceneEncounterDifficultyPair | undefined {
  if (draft.objectKind !== "encounters" || !draft.difficulty) return current;
  return materializeExistingEncounterDifficulty(
    source,
    current,
    draft.difficulty,
    catalog,
  );
}

export function updateAreaObjectPolygonDraftLocalizedName(
  draft: AreaObjectPolygonDraft,
  source: SceneObjectSourceMetadata | undefined,
  value: unknown,
): AreaObjectPolygonDraft {
  if (draft.localizedName === undefined) {
    return draft;
  }
  const localizedName = draft.objectKind === "triggers"
    ? reduceExistingTriggerLocalizedName(source, draft.localizedName, value)
    : reduceExistingEncounterLocalizedName(source, draft.localizedName, value);
  return localizedName === draft.localizedName
    ? draft
    : Object.freeze({ ...draft, localizedName });
}

export function materializeAreaObjectPolygonDraftLocalizedName(
  draft: AreaObjectPolygonDraft,
  source: SceneObjectSourceMetadata | undefined,
  current: string | undefined,
): string | undefined {
  if (draft.localizedName === undefined) {
    return current;
  }
  return draft.objectKind === "triggers"
    ? materializeExistingTriggerLocalizedName(source, current, draft.localizedName)
    : materializeExistingEncounterLocalizedName(source, current, draft.localizedName);
}

export function updateAreaObjectPolygonDraftTemplateResRef(
  draft: AreaObjectPolygonDraft,
  source: SceneObjectSourceMetadata | undefined,
  value: unknown,
): AreaObjectPolygonDraft {
  if (draft.templateResRef === undefined) {
    return draft;
  }
  const templateResRef = draft.objectKind === "triggers"
    ? reduceExistingTriggerTemplateResRef(source, draft.templateResRef, value)
    : reduceExistingEncounterTemplateResRef(source, draft.templateResRef, value);
  return templateResRef === draft.templateResRef
    ? draft
    : Object.freeze({ ...draft, templateResRef });
}

export function materializeAreaObjectPolygonDraftTemplateResRef(
  draft: AreaObjectPolygonDraft,
  source: SceneObjectSourceMetadata | undefined,
  current: string | undefined,
): string | undefined {
  if (draft.templateResRef === undefined) {
    return current;
  }
  return draft.objectKind === "triggers"
    ? materializeExistingTriggerTemplateResRef(source, current, draft.templateResRef)
    : materializeExistingEncounterTemplateResRef(source, current, draft.templateResRef);
}

export function updateAreaObjectPolygonDraftEditorComment(
  draft: AreaObjectPolygonDraft,
  source: SceneObjectSourceMetadata | undefined,
  value: unknown,
): AreaObjectPolygonDraft {
  if (draft.editorComment === undefined) {
    return draft;
  }
  const editorComment = draft.objectKind === "triggers"
    ? reduceExistingTriggerEditorComment(source, draft.editorComment, value)
    : reduceExistingEncounterEditorComment(source, draft.editorComment, value);
  return editorComment === draft.editorComment
    ? draft
    : Object.freeze({ ...draft, editorComment });
}

export function updateAreaObjectPolygonDraftVariables(
  draft: AreaObjectPolygonDraft,
  source: SceneObjectSourceMetadata | undefined,
  value: unknown,
): AreaObjectPolygonDraft {
  if (draft.objectKind !== "encounters" || draft.variables === undefined ||
      !canEditExistingEncounterVariables(source)) return draft;
  const variables = readEncounterVariableTargetEntries(value);
  if (!variables || encounterVariableTargetEntriesEqual(draft.variables, variables)) {
    return draft;
  }
  return Object.freeze({
    ...draft,
    variables: Object.freeze(variables.map((entry) => Object.freeze({ ...entry }))),
  });
}

export function materializeAreaObjectPolygonDraftVariables(
  draft: AreaObjectPolygonDraft,
  source: SceneObjectSourceMetadata | undefined,
  current: readonly SceneObjectEncounterVariableTargetEntry[] | undefined,
): readonly SceneObjectEncounterVariableTargetEntry[] | undefined {
  if (draft.objectKind !== "encounters" || draft.variables === undefined ||
      draft.variablesControlState !== "ACTIVE_NOW" ||
      !canEditExistingEncounterVariables(source)) return current;
  const variables = readEncounterVariableTargetEntries(draft.variables);
  return variables?.map((entry) => ({ ...entry })) ?? current;
}

export function updateAreaObjectPolygonDraftCreatureSingleSpawn(
  draft: AreaObjectPolygonDraft,
  source: SceneObjectSourceMetadata | undefined,
  index: number,
  singleSpawn: boolean,
): AreaObjectPolygonDraft {
  if (
    draft.objectKind !== "encounters"
    || draft.creatureList === undefined
    || draft.creatureListControlState !== "ACTIVE_NOW"
  ) return draft;
  const creatureList = updateExistingEncounterCreatureSingleSpawn(
    source,
    draft.creatureList,
    index,
    singleSpawn,
  );
  return creatureList === draft.creatureList
    ? draft
    : Object.freeze({ ...draft, creatureList });
}

export function appendAreaObjectPolygonDraftCreature(
  draft: AreaObjectPolygonDraft,
  source: SceneObjectSourceMetadata | undefined,
  entry: SceneObjectEncounterCreatureListBlueprintTargetEntry,
): AreaObjectPolygonDraft {
  return mutateAreaObjectPolygonDraftCreatureList(draft, (current) =>
    appendExistingEncounterCreatureListEntry(source, current, entry));
}

export function replaceAreaObjectPolygonDraftCreature(
  draft: AreaObjectPolygonDraft,
  source: SceneObjectSourceMetadata | undefined,
  index: number,
  entry: SceneObjectEncounterCreatureListBlueprintTargetEntry,
): AreaObjectPolygonDraft {
  return mutateAreaObjectPolygonDraftCreatureList(draft, (current) =>
    replaceExistingEncounterCreatureListEntry(source, current, index, entry));
}

export function removeAreaObjectPolygonDraftCreature(
  draft: AreaObjectPolygonDraft,
  source: SceneObjectSourceMetadata | undefined,
  index: number,
): AreaObjectPolygonDraft {
  return mutateAreaObjectPolygonDraftCreatureList(draft, (current) =>
    removeExistingEncounterCreatureListEntry(source, current, index));
}

export function moveAreaObjectPolygonDraftCreature(
  draft: AreaObjectPolygonDraft,
  source: SceneObjectSourceMetadata | undefined,
  index: number,
  direction: -1 | 1,
): AreaObjectPolygonDraft {
  return mutateAreaObjectPolygonDraftCreatureList(draft, (current) =>
    moveExistingEncounterCreatureListEntry(source, current, index, direction));
}

function mutateAreaObjectPolygonDraftCreatureList(
  draft: AreaObjectPolygonDraft,
  mutation: (
    current: readonly SceneObjectEncounterCreatureListTargetEntry[],
  ) => readonly SceneObjectEncounterCreatureListTargetEntry[],
): AreaObjectPolygonDraft {
  if (draft.objectKind !== "encounters" || draft.creatureList === undefined
    || draft.creatureListControlState !== "ACTIVE_NOW") return draft;
  const creatureList = mutation(draft.creatureList);
  return creatureList === draft.creatureList
    ? draft
    : Object.freeze({ ...draft, creatureList });
}

export function materializeAreaObjectPolygonDraftCreatureList(
  draft: AreaObjectPolygonDraft,
  source: SceneObjectSourceMetadata | undefined,
  current: unknown,
): readonly SceneObjectEncounterCreatureListTargetEntry[] | undefined {
  const exactCurrent = readEncounterCreatureListTargetEntries(current) ?? undefined;
  if (
    draft.objectKind !== "encounters"
    || draft.creatureList === undefined
    || draft.creatureListControlState !== "ACTIVE_NOW"
    || !canEditExistingEncounterCreatureSingleSpawn(source)
  ) return exactCurrent;
  const provenance = readEncounterCreatureListProvenance(source?.encounterCreatureList);
  const target = provenance
    ? normalizeEncounterCreatureListTargetEntries(
        provenance.expectedEntries,
        draft.creatureList,
      )
    : null;
  if (!target) return exactCurrent;
  return target.map((entry) => ({ ...entry }));
}

export type AreaObjectPolygonSpawnPointField =
  keyof SceneObjectEncounterSpawnPointTargetEntry;

export function updateAreaObjectPolygonDraftSpawnPoint(
  draft: AreaObjectPolygonDraft,
  source: SceneObjectSourceMetadata | undefined,
  index: number,
  field: AreaObjectPolygonSpawnPointField,
  value: unknown,
): AreaObjectPolygonDraft {
  if (!canEditAreaObjectPolygonDraftSpawnPoints(draft, source)) return draft;
  if (!Number.isSafeInteger(index) || index < 0 || index >= draft.spawnPoints.length) {
    return draft;
  }
  if (typeof value !== "number" || !Number.isFinite(value)) return draft;
  const exactValue = Math.fround(value);
  if (!Number.isFinite(exactValue)) return draft;
  const current = draft.spawnPoints[index];
  if (!current || Object.is(current[field], exactValue)) return draft;
  const spawnPoints = draft.spawnPoints.map((entry, entryIndex) => Object.freeze(
    entryIndex === index ? { ...entry, [field]: exactValue } : { ...entry },
  ));
  return readEncounterSpawnPointTargetEntries(spawnPoints)
    ? Object.freeze({ ...draft, spawnPoints: Object.freeze(spawnPoints) })
    : draft;
}

export function appendAreaObjectPolygonDraftSpawnPoint(
  draft: AreaObjectPolygonDraft,
  source: SceneObjectSourceMetadata | undefined,
  seed: SceneObjectEncounterSpawnPointTargetEntry,
): AreaObjectPolygonDraft {
  if (
    !canEditAreaObjectPolygonDraftSpawnPoints(draft, source)
    || draft.spawnPoints.length >= MAX_ENCOUNTER_SPAWN_POINT_ENTRIES
  ) return draft;
  const admittedSeed = readEncounterSpawnPointTargetEntries([seed]);
  if (!admittedSeed?.[0]) return draft;
  const spawnPoints = Object.freeze([
    ...draft.spawnPoints.map((entry) => Object.freeze({ ...entry })),
    Object.freeze({ ...admittedSeed[0] }),
  ]);
  return Object.freeze({ ...draft, spawnPoints });
}

export function removeAreaObjectPolygonDraftSpawnPoint(
  draft: AreaObjectPolygonDraft,
  source: SceneObjectSourceMetadata | undefined,
  index: number,
): AreaObjectPolygonDraft {
  if (!canEditAreaObjectPolygonDraftSpawnPoints(draft, source)) return draft;
  if (!Number.isSafeInteger(index) || index < 0 || index >= draft.spawnPoints.length) {
    return draft;
  }
  const spawnPoints = Object.freeze(draft.spawnPoints
    .filter((_, entryIndex) => entryIndex !== index)
    .map((entry) => Object.freeze({ ...entry })));
  return Object.freeze({ ...draft, spawnPoints });
}

export function moveAreaObjectPolygonDraftSpawnPoint(
  draft: AreaObjectPolygonDraft,
  source: SceneObjectSourceMetadata | undefined,
  index: number,
  direction: -1 | 1,
): AreaObjectPolygonDraft {
  if (!canEditAreaObjectPolygonDraftSpawnPoints(draft, source)) return draft;
  const nextIndex = index + direction;
  if (
    !Number.isSafeInteger(index)
    || (direction !== -1 && direction !== 1)
    || index < 0
    || index >= draft.spawnPoints.length
    || nextIndex < 0
    || nextIndex >= draft.spawnPoints.length
  ) return draft;
  const spawnPoints = draft.spawnPoints.map((entry) => Object.freeze({ ...entry }));
  const current = spawnPoints[index];
  const next = spawnPoints[nextIndex];
  if (!current || !next) return draft;
  spawnPoints[index] = next;
  spawnPoints[nextIndex] = current;
  return Object.freeze({ ...draft, spawnPoints: Object.freeze(spawnPoints) });
}

export function materializeAreaObjectPolygonDraftSpawnPoints(
  draft: AreaObjectPolygonDraft,
  source: SceneObjectSourceMetadata | undefined,
  current: unknown,
): readonly SceneObjectEncounterSpawnPointTargetEntry[] | undefined {
  const exactCurrent = readEncounterSpawnPointTargetEntries(current) ?? undefined;
  if (!canEditAreaObjectPolygonDraftSpawnPoints(draft, source)) return exactCurrent;
  const target = readEncounterSpawnPointTargetEntries(draft.spawnPoints);
  return target?.map((entry) => ({ ...entry })) ?? exactCurrent;
}

function canEditAreaObjectPolygonDraftSpawnPoints(
  draft: AreaObjectPolygonDraft,
  source: SceneObjectSourceMetadata | undefined,
): draft is AreaObjectPolygonDraft & {
  readonly spawnPoints: readonly SceneObjectEncounterSpawnPointTargetEntry[];
} {
  return draft.objectKind === "encounters"
    && draft.spawnPointsControlState === "ACTIVE_NOW"
    && readEncounterSpawnPointListProvenance(source?.encounterSpawnPoints) !== null
    && readEncounterSpawnPointTargetEntries(draft.spawnPoints) !== null;
}

export function materializeAreaObjectPolygonDraftEditorComment(
  draft: AreaObjectPolygonDraft,
  source: SceneObjectSourceMetadata | undefined,
  current: string | undefined,
): string | undefined {
  if (draft.editorComment === undefined) {
    return current;
  }
  return draft.objectKind === "triggers"
    ? materializeExistingTriggerEditorComment(source, current, draft.editorComment)
    : materializeExistingEncounterEditorComment(source, current, draft.editorComment);
}

export function updateAreaObjectPolygonDraftTag(
  draft: AreaObjectPolygonDraft,
  source: SceneObjectSourceMetadata | undefined,
  value: unknown,
): AreaObjectPolygonDraft {
  if (draft.tag === undefined) return draft;
  const tag = draft.objectKind === "triggers"
    ? reduceExistingTriggerTag(source, draft.tag, value)
    : reduceExistingEncounterTag(source, draft.tag, value);
  return tag === draft.tag ? draft : Object.freeze({ ...draft, tag });
}

export function materializeAreaObjectPolygonDraftTag(
  draft: AreaObjectPolygonDraft,
  source: SceneObjectSourceMetadata | undefined,
  currentTag: string,
): string {
  if (draft.tag === undefined) return currentTag;
  return draft.objectKind === "triggers"
    ? materializeExistingTriggerTag(source, currentTag, draft.tag)
    : materializeExistingEncounterTag(source, currentTag, draft.tag);
}

export function updateAreaObjectPolygonDraftPoint(
  draft: AreaObjectPolygonDraft,
  pointIndex: number,
  field: AreaObjectPolygonPointField,
  value: string,
): AreaObjectPolygonDraft {
  if (!Number.isSafeInteger(pointIndex) || pointIndex < 0 || pointIndex >= draft.points.length) {
    return draft;
  }
  const point = draft.points[pointIndex];
  if (!point || point[field] === value) return draft;
  const points = [...draft.points];
  points[pointIndex] = Object.freeze({ ...point, [field]: value });
  return Object.freeze({ ...draft, points: Object.freeze(points) });
}

export function appendAreaObjectPolygonDraftPoint(
  draft: AreaObjectPolygonDraft,
): AreaObjectPolygonDraft {
  if (draft.points.length >= MAX_AREA_OBJECT_POLYGON_POINTS) return draft;
  const last = draft.points.at(-1);
  if (!last) return draft;
  return Object.freeze({
    ...draft,
    points: Object.freeze([...draft.points, Object.freeze({ ...last })]),
  });
}

export function removeAreaObjectPolygonDraftPoint(
  draft: AreaObjectPolygonDraft,
  pointIndex: number,
): AreaObjectPolygonDraft {
  if (
    draft.points.length <= MIN_AREA_OBJECT_POLYGON_POINTS
    || !Number.isSafeInteger(pointIndex)
    || pointIndex < 0
    || pointIndex >= draft.points.length
  ) {
    return draft;
  }
  return Object.freeze({
    ...draft,
    points: Object.freeze(draft.points.filter((_point, index) => index !== pointIndex)),
  });
}

export function materializeAreaObjectPolygonDraft(
  draft: AreaObjectPolygonDraft,
): AreaObjectPolygonGeometry | null {
  const points = draft.points.map((point) => ({
    x: parseDraftCoordinate(point.x),
    y: parseDraftCoordinate(point.y),
    z: parseDraftCoordinate(point.z),
  }));
  if (points.some((point) => point.x === null || point.y === null || point.z === null)) {
    return null;
  }
  const candidate = {
    coordinateSpace: "native_local" as const,
    points: points.map((point) => ({
      x: point.x as number,
      y: point.y as number,
      z: point.z as number,
    })),
  };
  return isAreaObjectPolygonGeometry(candidate)
    ? cloneAreaObjectPolygonGeometry(candidate)
    : null;
}

function parseDraftCoordinate(value: string): number | null {
  if (value.trim().length === 0) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
