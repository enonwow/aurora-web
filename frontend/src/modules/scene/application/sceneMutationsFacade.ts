import type {
  AreaScene,
  SceneObject,
  SceneObjectPlaceableProperties,
  SceneSoundPropertiesModel,
  SceneObjectKind,
  SceneEncounterDifficultyPair,
  SceneObjectEncounterCreatureListTargetEntry,
  SceneObjectEncounterSpawnPointTargetEntry,
  SceneObjectEncounterVariableTargetEntry,
  SceneObjectWaypointVariableTargetEntry,
  SceneTile,
  TerrainBrushKind
} from "../contracts";
import { normalizeBearingRadians } from "../domain/bearing";
import {
  areSceneSoundPropertiesEqual,
  normalizeSceneSoundPropertiesInput,
  normalizeSoundPositioningPreservePayload,
  toSceneSoundPropertiesModel
} from "../domain/sound";
import {
  applyAuroraAreaCrosserBrush,
  applyAuroraAreaEraser,
  applyAuroraAreaHeightBrush,
  applyAuroraAreaTerrainBrush,
  changeAuroraAreaGroupHeightAtSceneTile,
  removeAuroraAreaGroupAtSceneTile,
  rotateAuroraAreaGroupAtSceneTile,
  placeAuroraAreaGroupAtSceneTile
} from "../domain/auroraAreaEditingSceneMapper";
import type { AuroraAreaCandidateSelector, AuroraAreaEdge } from "../domain/auroraAreaEditing";
import {
  areaObjectPolygonGeometriesEqual,
  cloneAreaObjectPolygonGeometry,
  isAreaObjectPolygonGeometry,
  type AreaObjectPolygonGeometry,
} from "../../areas/domain/areaObjectPolygonGeometry";
import {
  canEditRetainedItemVisualTransform,
  sceneVisualTransformToItemStorage,
} from "../domain/itemVisualTransform";
import {
  canEditExistingTriggerTag,
  isEditableTriggerTag,
} from "../domain/triggerTag";
import {
  canEditExistingTriggerTemplateResRef,
  isTriggerTemplateResRef,
} from "../domain/triggerTemplateResRef";
import {
  canEditExistingTriggerLocalizedName,
  isTriggerLocalizedNameInlineAsciiText,
} from "../domain/triggerLocalizedName";
import {
  canEditExistingTriggerEditorComment,
  isTriggerEditorComment,
} from "../domain/triggerEditorComment";
import {
  canEditExistingTriggerScriptResRefs,
  cloneTriggerScriptResRefsStorage,
  readTriggerScriptResRefsStorage,
  readTriggerScriptResRefsTargetStorage,
  triggerScriptResRefsStoragesEqual,
  type TriggerScriptResRefsStorage,
} from "../domain/triggerScriptResRefs";
import {
  canEditExistingTriggerTransitionStorage,
  cloneTriggerTransitionStorage,
  isTriggerTransitionStorage,
  triggerTransitionStoragesEqual,
  type TriggerTransitionStorage,
} from "../domain/triggerTransitionStorage";
import {
  canEditExistingEncounterTag,
  isEditableEncounterTag,
} from "../domain/encounterTag";
import {
  canEditExistingEncounterTemplateResRef,
  isEncounterTemplateResRef,
} from "../domain/encounterTemplateResRef";
import {
  canEditExistingWaypointTag,
  isEditableWaypointTag,
} from "../domain/waypointTag";
import {
  canEditExistingWaypointTemplateResRef,
  isWaypointTemplateResRef,
} from "../domain/waypointTemplateResRef";
import {
  canEditExistingWaypointLocalizedName,
  isWaypointLocalizedNameInlineAsciiText,
} from "../domain/waypointLocalizedName";
import {
  canEditExistingWaypointDescription,
  isWaypointDescriptionInlineAsciiText,
} from "../domain/waypointDescription";
import {
  canEditExistingWaypointEditorComment,
  isWaypointEditorComment,
} from "../domain/waypointEditorComment";
import {
  canEditExistingWaypointMapNote,
  cloneWaypointMapNoteValue,
  readWaypointMapNoteValue,
  waypointMapNoteValuesEqual,
} from "../domain/waypointMapNote";
import type { SceneObjectWaypointMapNoteValue } from "../contracts";
import {
  readWaypointVariableProvenance,
  readWaypointVariableTargetEntries,
  waypointVariableTargetEntriesEqual,
} from "../domain/waypointVariableTable";
import {
  canEditExistingEncounterActive,
  cloneEncounterActiveStorage,
  encounterActiveStoragesEqual,
  readEncounterActiveStorage,
  type EncounterActiveStorage,
} from "../domain/encounterActive";
import {
  canEditExistingEncounterPlayerOnly,
  cloneEncounterPlayerOnlyStorage,
  encounterPlayerOnlyStoragesEqual,
  readEncounterPlayerOnlyStorage,
  type EncounterPlayerOnlyStorage,
} from "../domain/encounterPlayerOnly";
import {
  canEditExistingEncounterReset,
  cloneEncounterResetStorage,
  encounterResetStoragesEqual,
  readEncounterResetStorage,
  type EncounterResetStorage,
} from "../domain/encounterReset";
import {
  canEditExistingEncounterResetTime,
  cloneEncounterResetTimeStorage,
  encounterResetTimeStoragesEqual,
  readEncounterResetTimeStorage,
  type EncounterResetTimeStorage,
} from "../domain/encounterResetTime";
import {
  canEditExistingEncounterSpawnOption,
  cloneEncounterSpawnOptionStorage,
  encounterSpawnOptionStoragesEqual,
  readEncounterSpawnOptionStorage,
  type EncounterSpawnOptionStorage,
} from "../domain/encounterSpawnOption";
import {
  canEditExistingEncounterRespawns,
  cloneEncounterRespawnsStorage,
  encounterRespawnsStoragesEqual,
  readEncounterRespawnsStorage,
  type EncounterRespawnsStorage,
} from "../domain/encounterRespawns";
import {
  canEditExistingEncounterCreatureCounts,
  cloneEncounterCreatureCountStorage,
  encounterCreatureCountStoragesEqual,
  readEncounterCreatureCountStorage,
  type EncounterCreatureCountStorage,
} from "../domain/encounterCreatureCounts";
import {
  canEditExistingEncounterScriptResRefs,
  cloneEncounterScriptResRefsStorage,
  encounterScriptResRefsStoragesEqual,
  readEncounterScriptResRefsStorage,
  readEncounterScriptResRefsTargetStorage,
  type EncounterScriptResRefsStorage,
} from "../domain/encounterScriptResRefs";
import { readEncounterFactionCatalogBinding } from "../domain/encounterFaction";
import {
  encounterDifficultyPairsEqual,
  readEncounterDifficultyCatalogBinding,
  readEncounterDifficultyTarget,
} from "../domain/encounterDifficulty";
import {
  isEncounterLocalizedNameInlineAsciiText,
  readExistingEncounterLocalizedNameSourceValue,
} from "../domain/encounterLocalizedName";
import { isEncounterEditorComment } from "../domain/encounterEditorComment";
import {
  encounterVariableTargetEntriesEqual,
  readEncounterVariableProvenance,
  readEncounterVariableTargetEntries,
} from "../domain/encounterVariableTable";
import {
  encounterCreatureListIdentityMatches,
  encounterCreatureListTargetEntriesEqual,
  readEncounterCreatureListProvenance,
  readEncounterCreatureListTargetEntries,
} from "../domain/encounterCreatureSingleSpawn";
import {
  encounterSpawnPointTargetEntriesEqual,
  readEncounterSpawnPointListProvenance,
  readEncounterSpawnPointTargetEntries,
} from "../domain/encounterSpawnPointList";

export interface SceneObjectTranslationDelta {
  x: number;
  y: number;
}

export interface SceneObjectAbsoluteLocationInput {
  x: number;
  y: number;
  z: number;
  bearing: number;
}

export interface SceneObjectVisualTransformInput {
  scale: number;
  scaleX?: number;
  scaleY?: number;
  scaleZ?: number;
  offsetX: number;
  offsetY: number;
  offsetZ: number;
  pitch: number;
  yaw: number;
  roll: number;
}

export interface SceneObjectPlaceablePropertiesInput {
  name: string;
  tag: string;
  resRef: string;
  isStatic: boolean;
  placeableProperties?: SceneObjectPlaceableProperties;
}

export interface ExistingWaypointPropertiesInput {
  readonly tag?: string;
  readonly templateResRef?: string;
  readonly localizedName?: string;
  readonly description?: string;
  readonly mapNote?: SceneObjectWaypointMapNoteValue;
  readonly appearance?: number;
  readonly waypointVariables?: readonly SceneObjectWaypointVariableTargetEntry[];
  readonly editorComment?: string;
}

export interface SceneMutationsFacade {
  appendObjects(scene: AreaScene, objects: SceneObject[]): AreaScene;
  deleteObjectsByIds(scene: AreaScene, objectIds: string[]): AreaScene;
  deleteObjectById(scene: AreaScene, objectId: string): AreaScene;
  setExistingWaypointTagById(
    scene: AreaScene,
    objectId: string,
    tag: string,
  ): AreaScene;
  setExistingWaypointPropertiesById(
    scene: AreaScene,
    objectId: string,
    input: ExistingWaypointPropertiesInput,
  ): AreaScene;
  setExistingEncounterTemplateResRefById(
    scene: AreaScene,
    objectId: string,
    templateResRef: string,
  ): AreaScene;
  setExistingTriggerTemplateResRefById(
    scene: AreaScene,
    objectId: string,
    templateResRef: string,
  ): AreaScene;
  setExistingTriggerLocalizedNameById(
    scene: AreaScene,
    objectId: string,
    localizedName: string,
  ): AreaScene;
  setExistingTriggerEditorCommentById(
    scene: AreaScene,
    objectId: string,
    editorComment: string,
  ): AreaScene;
  setExistingTriggerScriptResRefsById(
    scene: AreaScene,
    objectId: string,
    scripts: TriggerScriptResRefsStorage,
  ): AreaScene;
  setExistingTriggerTransitionStorageById(
    scene: AreaScene,
    objectId: string,
    storage: TriggerTransitionStorage,
  ): AreaScene;
  setAreaObjectPolygonGeometryById(
    scene: AreaScene,
    objectId: string,
    geometry: AreaObjectPolygonGeometry,
    tag?: string,
    encounterActive?: EncounterActiveStorage,
    encounterPlayerOnly?: EncounterPlayerOnlyStorage,
    encounterReset?: EncounterResetStorage,
    encounterResetTime?: EncounterResetTimeStorage,
    encounterSpawnOption?: EncounterSpawnOptionStorage,
    encounterRespawns?: EncounterRespawnsStorage,
    encounterCreatureCounts?: EncounterCreatureCountStorage,
    encounterScriptResRefs?: EncounterScriptResRefsStorage,
    encounterFactionId?: number,
    encounterDifficulty?: SceneEncounterDifficultyPair,
    encounterLocalizedName?: string,
    encounterEditorComment?: string,
    encounterVariables?: readonly SceneObjectEncounterVariableTargetEntry[],
    encounterCreatureList?: readonly SceneObjectEncounterCreatureListTargetEntry[],
    encounterSpawnPoints?: readonly SceneObjectEncounterSpawnPointTargetEntry[],
  ): AreaScene;
  setPlaceablePropertiesByIds(
    scene: AreaScene,
    objectIds: string[],
    input: SceneObjectPlaceablePropertiesInput
  ): AreaScene;
  getSoundPropertiesById(scene: AreaScene, objectId: string): SceneSoundPropertiesModel | null;
  setSoundPropertiesByIds(
    scene: AreaScene,
    objectIds: string[],
    input: SceneSoundPropertiesModel
  ): AreaScene;
  updateTileTerrain(scene: AreaScene, tileId: string, terrain: TerrainBrushKind): AreaScene;
  applyAuroraAreaTerrainBrush(
    scene: AreaScene,
    tileId: string,
    terrain: string,
    selector?: AuroraAreaCandidateSelector
  ): AreaScene;
  applyAuroraAreaCrosserBrush(scene: AreaScene, tileId: string, edge: AuroraAreaEdge, crosser: string, selector?: AuroraAreaCandidateSelector): AreaScene;
  applyAuroraAreaHeightBrush(scene: AreaScene, tileId: string, delta: -1 | 1, selector?: AuroraAreaCandidateSelector): AreaScene;
  applyAuroraAreaEraser(scene: AreaScene, tileId: string): AreaScene;
  placeAuroraAreaGroup(
    scene: AreaScene,
    tileId: string,
    groupId: string,
    orientation: 0 | 1 | 2 | 3,
    selector?: AuroraAreaCandidateSelector
  ): AreaScene;
  removeAuroraAreaGroup(scene: AreaScene, tileId: string): AreaScene;
  rotateAuroraAreaGroup(scene: AreaScene, tileId: string, delta: -1 | 1): AreaScene;
  changeAuroraAreaGroupHeight(scene: AreaScene, tileId: string, delta: -1 | 1): AreaScene;
  resetObjectTransform(scene: AreaScene, objectId: string): AreaScene;
  setObjectsAbsoluteLocationByIds(
    scene: AreaScene,
    objectIds: string[],
    input: SceneObjectAbsoluteLocationInput
  ): AreaScene;
  setObjectsVisualTransformByIds(
    scene: AreaScene,
    objectIds: string[],
    input: SceneObjectVisualTransformInput
  ): AreaScene;
  restoreObjectsPlacementBySnapshots(scene: AreaScene, snapshots: SceneObject[]): AreaScene;
  translateObjectsByIds(
    scene: AreaScene,
    objectIds: string[],
    delta: SceneObjectTranslationDelta
  ): AreaScene;
  adjustObjectsHeightByIds(scene: AreaScene, objectIds: string[], deltaZ: number): AreaScene;
  rotateObjectsBearingByIds(scene: AreaScene, objectIds: string[], deltaBearingRad: number): AreaScene;
}

const MOVABLE_OBJECT_KINDS = new Set<SceneObjectKind>([
  "placeables",
  "creatures",
  "encounters",
  "items",
  "sounds",
  "stores",
  "triggers",
  "waypoints"
]);
const VISUAL_TRANSFORM_OBJECT_KINDS = new Set<SceneObjectKind>([
  "creatures",
  "doors",
  "encounters",
  "items",
  "placeables",
  "sounds",
  "stores",
  "triggers",
  "waypoints"
]);

const SCENE_COORDINATE_MIN = 0;
const SCENE_COORDINATE_EPSILON = 1e-4;
const SCENE_VISUAL_SCALE_MIN = 0.01;

function clampNumber(value: number, min: number, max: number): number {
  if (min > max) {
    return min;
  }
  return Math.min(max, Math.max(min, value));
}

function normalizeVisualScale(value: number | undefined, fallback = 1): number {
  return Math.max(SCENE_VISUAL_SCALE_MIN, resolveFiniteNumber(value, fallback));
}

function resolveNextVisualScaleAxes(
  currentTransform: SceneObject["visualTransform"],
  input: SceneObjectVisualTransformInput,
  nextScale: number
): { scaleX: number; scaleY: number; scaleZ: number } {
  const currentScale = normalizeVisualScale(currentTransform.scale);
  const scaleFactor = currentScale > 0 ? nextScale / currentScale : nextScale;
  const resolveAxis = (
    inputAxis: number | undefined,
    currentAxis: number | undefined
  ): number => {
    if (inputAxis !== undefined) {
      return normalizeVisualScale(inputAxis);
    }
    return normalizeVisualScale(
      normalizeVisualScale(currentAxis ?? currentTransform.scale) * scaleFactor
    );
  };

  return {
    scaleX: resolveAxis(input.scaleX, currentTransform.scaleX),
    scaleY: resolveAxis(input.scaleY, currentTransform.scaleY),
    scaleZ: resolveAxis(input.scaleZ, currentTransform.scaleZ)
  };
}

function resolveFiniteNumber(value: number | undefined, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function resolveSceneCoordinateMax(size: number): number {
  if (!Number.isFinite(size)) {
    return SCENE_COORDINATE_MIN;
  }
  return Math.max(SCENE_COORDINATE_MIN, size - SCENE_COORDINATE_EPSILON);
}

function clampDeltaToBounds(delta: number, minDelta: number, maxDelta: number): number {
  if (delta > 0) {
    if (maxDelta <= 0) {
      return 0;
    }
    return Math.min(delta, maxDelta);
  }

  if (delta < 0) {
    if (minDelta >= 0) {
      return 0;
    }
    return Math.max(delta, minDelta);
  }

  return 0;
}

function normalizeObjectPlacement(scene: AreaScene, object: SceneObject): SceneObject {
  const maxX = resolveSceneCoordinateMax(scene.width);
  const maxY = resolveSceneCoordinateMax(scene.height);
  const nextX = clampNumber(resolveFiniteNumber(object.x, 0), SCENE_COORDINATE_MIN, maxX);
  const nextY = clampNumber(resolveFiniteNumber(object.y, 0), SCENE_COORDINATE_MIN, maxY);
  const nextZ = resolveFiniteNumber(
    object.z,
    resolveFiniteNumber(object.visualTransform.offsetZ, 0)
  );
  const nextBearing = normalizeBearingRadians(object.bearing);
  const rawOffsetZ = resolveFiniteNumber(object.visualTransform.offsetZ, 0);
  const nextOffsetZ = rawOffsetZ;
  const nextScale = normalizeVisualScale(object.visualTransform.scale);

  if (
    nextX === object.x &&
    nextY === object.y &&
    nextZ === object.z &&
    nextBearing === object.bearing &&
    nextOffsetZ === object.visualTransform.offsetZ &&
    nextScale === object.visualTransform.scale
  ) {
    return object;
  }

  return {
    ...object,
    x: nextX,
    y: nextY,
    z: nextZ,
    bearing: nextBearing,
    visualTransform: {
      ...object.visualTransform,
      scale: nextScale,
      offsetZ: nextOffsetZ
    }
  };
}

function resolveTranslationBounds(scene: AreaScene, targets: SceneObject[]): {
  minDeltaX: number;
  maxDeltaX: number;
  minDeltaY: number;
  maxDeltaY: number;
} {
  const maxX = resolveSceneCoordinateMax(scene.width);
  const maxY = resolveSceneCoordinateMax(scene.height);
  let minDeltaX = Number.NEGATIVE_INFINITY;
  let maxDeltaX = Number.POSITIVE_INFINITY;
  let minDeltaY = Number.NEGATIVE_INFINITY;
  let maxDeltaY = Number.POSITIVE_INFINITY;

  targets.forEach((object) => {
    minDeltaX = Math.max(minDeltaX, SCENE_COORDINATE_MIN - object.x);
    maxDeltaX = Math.min(maxDeltaX, maxX - object.x);
    minDeltaY = Math.max(minDeltaY, SCENE_COORDINATE_MIN - object.y);
    maxDeltaY = Math.min(maxDeltaY, maxY - object.y);
  });

  return {
    minDeltaX,
    maxDeltaX,
    minDeltaY,
    maxDeltaY
  };
}

function replaceSceneTiles(scene: AreaScene, nextTiles: SceneTile[]): AreaScene {
  if (nextTiles === scene.tiles) {
    return scene;
  }
  return {
    ...scene,
    tiles: nextTiles
  };
}

function replaceSceneObjects(scene: AreaScene, nextObjects: SceneObject[]): AreaScene {
  if (nextObjects === scene.objects) {
    return scene;
  }
  return {
    ...scene,
    objects: nextObjects
  };
}

function resolveMovableTargets(scene: AreaScene, objectIds: string[]): SceneObject[] {
  if (objectIds.length === 0) {
    return [];
  }

  const idSet = new Set(objectIds);
  const targets = scene.objects.filter((object) => idSet.has(object.id));
  if (targets.length === 0) {
    return [];
  }

  // Aurora First: doors are anchor-bound and cannot be moved with generic object transforms.
  if (targets.some((object) => object.kind === "doors")) {
    return [];
  }

  if (targets.some((object) => !MOVABLE_OBJECT_KINDS.has(object.kind))) {
    return [];
  }

  return targets;
}

function resolveGenericTransformTargets(scene: AreaScene, objectIds: string[]): SceneObject[] {
  const targets = resolveMovableTargets(scene, objectIds);
  if (targets.length === 0) {
    return [];
  }
  // Aurora-first parity: generic world transforms (move/height/bearing) apply to placeables
  // regardless of Static flag. Static only gates visual-transform rendering channels.
  return targets;
}

function resolveVisualTransformTargets(scene: AreaScene, objectIds: string[]): SceneObject[] {
  if (objectIds.length === 0) {
    return [];
  }

  const idSet = new Set(objectIds);
  const targets = scene.objects.filter((object) => idSet.has(object.id));
  if (targets.length === 0) {
    return [];
  }

  if (targets.some((object) => !VISUAL_TRANSFORM_OBJECT_KINDS.has(object.kind))) {
    return [];
  }
  if (targets.some((object) => !isVisualTransformPersistenceSupported(object))) {
    return [];
  }

  return targets;
}

function setExistingWaypointProperties(
  scene: AreaScene,
  objectId: string,
  input: ExistingWaypointPropertiesInput,
): AreaScene {
  let changed = false;
  const nextObjects = scene.objects.map((object) => {
    if (object.id !== objectId || object.kind !== "waypoints") return object;
    const nextTag = input.tag !== undefined &&
      canEditExistingWaypointTag(object.source) &&
      isEditableWaypointTag(input.tag)
      ? input.tag
      : object.tag;
    const nextTemplateResRef = input.templateResRef !== undefined &&
      canEditExistingWaypointTemplateResRef(object.source) &&
      isWaypointTemplateResRef(input.templateResRef)
      ? input.templateResRef
      : object.waypointTemplateResRef;
    const nextLocalizedName = input.localizedName !== undefined &&
      canEditExistingWaypointLocalizedName(object.source) &&
      isWaypointLocalizedNameInlineAsciiText(input.localizedName)
      ? input.localizedName
      : object.waypointLocalizedName;
    const nextDescription = input.description !== undefined &&
      canEditExistingWaypointDescription(object.source) &&
      isWaypointDescriptionInlineAsciiText(input.description)
      ? input.description
      : object.waypointDescription;
    const inputMapNote = input.mapNote === undefined
      ? undefined
      : readWaypointMapNoteValue(input.mapNote);
    const nextMapNote = inputMapNote && canEditExistingWaypointMapNote(object.source)
      ? cloneWaypointMapNoteValue(inputMapNote)
      : object.waypointMapNote;
    const appearanceProvenance = object.source?.waypointAppearance;
    const nextAppearance = input.appearance !== undefined &&
      appearanceProvenance?.present === true &&
      appearanceProvenance.nativeType === "byte" &&
      Number.isSafeInteger(input.appearance) && input.appearance >= 0 &&
      input.appearance <= 0xff && input.appearance < appearanceProvenance.table.rowCount
      ? input.appearance
      : object.waypointAppearance;
    const sourceVariables = readWaypointVariableProvenance(object.source?.waypointVariables);
    const inputVariables = input.waypointVariables === undefined
      ? undefined
      : readWaypointVariableTargetEntries(input.waypointVariables);
    const nextVariables = sourceVariables && inputVariables
      ? inputVariables.map((entry) => ({ ...entry }))
      : object.waypointVariables;
    const nextEditorComment = input.editorComment !== undefined &&
      canEditExistingWaypointEditorComment(object.source) &&
      isWaypointEditorComment(input.editorComment)
      ? input.editorComment
      : object.waypointEditorComment;
    const tagChanged = nextTag !== object.tag;
    const templateResRefChanged = nextTemplateResRef !== object.waypointTemplateResRef;
    const localizedNameChanged = nextLocalizedName !== object.waypointLocalizedName;
    const descriptionChanged = nextDescription !== object.waypointDescription;
    const mapNoteChanged = nextMapNote !== undefined && (
      object.waypointMapNote === undefined ||
      !waypointMapNoteValuesEqual(nextMapNote, object.waypointMapNote)
    );
    const appearanceChanged = nextAppearance !== object.waypointAppearance;
    const variablesChanged = nextVariables !== undefined &&
      !waypointVariableTargetEntriesEqual(nextVariables, object.waypointVariables);
    const editorCommentChanged = nextEditorComment !== object.waypointEditorComment;
    if (!tagChanged && !templateResRefChanged && !localizedNameChanged && !descriptionChanged && !mapNoteChanged &&
        !appearanceChanged &&
        !variablesChanged &&
        !editorCommentChanged) {
      return object;
    }
    changed = true;
    return {
      ...object,
      ...(tagChanged ? { tag: nextTag } : {}),
      ...(templateResRefChanged
        ? { waypointTemplateResRef: nextTemplateResRef }
        : {}),
      ...(localizedNameChanged
        ? {
            name: nextLocalizedName,
            waypointLocalizedName: nextLocalizedName,
          }
        : {}),
      ...(descriptionChanged
        ? { waypointDescription: nextDescription }
        : {}),
      ...(mapNoteChanged
        ? { waypointMapNote: nextMapNote }
        : {}),
      ...(appearanceChanged
        ? { waypointAppearance: nextAppearance }
        : {}),
      ...(variablesChanged
        ? { waypointVariables: nextVariables }
        : {}),
      ...(editorCommentChanged
        ? { waypointEditorComment: nextEditorComment }
        : {}),
    };
  });
  return changed ? replaceSceneObjects(scene, nextObjects) : scene;
}

function setExistingEncounterTemplateResRef(
  scene: AreaScene,
  objectId: string,
  templateResRef: string,
): AreaScene {
  if (!isEncounterTemplateResRef(templateResRef)) return scene;
  const targetIndex = scene.objects.findIndex((object) => object.id === objectId);
  const object = targetIndex < 0 ? undefined : scene.objects[targetIndex];
  if (
    !object ||
    object.kind !== "encounters" ||
    !canEditExistingEncounterTemplateResRef(object.source) ||
    !isEncounterTemplateResRef(object.encounterTemplateResRef) ||
    object.encounterTemplateResRef === templateResRef
  ) {
    return scene;
  }
  const nextObjects = [...scene.objects];
  nextObjects[targetIndex] = { ...object, encounterTemplateResRef: templateResRef };
  return replaceSceneObjects(scene, nextObjects);
}

function setExistingTriggerTemplateResRef(
  scene: AreaScene,
  objectId: string,
  templateResRef: string,
): AreaScene {
  if (!isTriggerTemplateResRef(templateResRef)) return scene;
  const targetIndex = scene.objects.findIndex((object) => object.id === objectId);
  const object = targetIndex < 0 ? undefined : scene.objects[targetIndex];
  if (
    !object ||
    object.kind !== "triggers" ||
    !canEditExistingTriggerTemplateResRef(object.source) ||
    !isTriggerTemplateResRef(object.triggerTemplateResRef) ||
    object.triggerTemplateResRef === templateResRef
  ) {
    return scene;
  }
  const nextObjects = [...scene.objects];
  nextObjects[targetIndex] = { ...object, triggerTemplateResRef: templateResRef };
  return replaceSceneObjects(scene, nextObjects);
}

function setExistingTriggerLocalizedName(
  scene: AreaScene,
  objectId: string,
  localizedName: string,
): AreaScene {
  if (!isTriggerLocalizedNameInlineAsciiText(localizedName)) return scene;
  const targetIndex = scene.objects.findIndex((object) => object.id === objectId);
  const object = targetIndex < 0 ? undefined : scene.objects[targetIndex];
  if (
    !object ||
    object.kind !== "triggers" ||
    !canEditExistingTriggerLocalizedName(object.source) ||
    !isTriggerLocalizedNameInlineAsciiText(object.triggerLocalizedName) ||
    object.triggerLocalizedName === localizedName
  ) {
    return scene;
  }
  const nextObjects = [...scene.objects];
  nextObjects[targetIndex] = { ...object, triggerLocalizedName: localizedName };
  return replaceSceneObjects(scene, nextObjects);
}

function setExistingTriggerEditorComment(
  scene: AreaScene,
  objectId: string,
  editorComment: string,
): AreaScene {
  if (!isTriggerEditorComment(editorComment)) return scene;
  const targetIndex = scene.objects.findIndex((object) => object.id === objectId);
  const object = targetIndex < 0 ? undefined : scene.objects[targetIndex];
  if (
    !object ||
    object.kind !== "triggers" ||
    !canEditExistingTriggerEditorComment(object.source) ||
    !isTriggerEditorComment(object.triggerEditorComment) ||
    object.triggerEditorComment === editorComment
  ) {
    return scene;
  }
  const nextObjects = [...scene.objects];
  nextObjects[targetIndex] = { ...object, triggerEditorComment: editorComment };
  return replaceSceneObjects(scene, nextObjects);
}

function setExistingTriggerScriptResRefs(
  scene: AreaScene,
  objectId: string,
  scripts: TriggerScriptResRefsStorage,
): AreaScene {
  const target = readTriggerScriptResRefsTargetStorage(scripts);
  if (!target) return scene;
  const targetIndex = scene.objects.findIndex((object) => object.id === objectId);
  const object = targetIndex < 0 ? undefined : scene.objects[targetIndex];
  if (
    !object
    || object.kind !== "triggers"
    || !canEditExistingTriggerScriptResRefs(object.source)
    || !readTriggerScriptResRefsStorage(object.triggerScriptResRefs)
    || triggerScriptResRefsStoragesEqual(object.triggerScriptResRefs, target)
  ) return scene;
  const nextObjects = [...scene.objects];
  nextObjects[targetIndex] = {
    ...object,
    triggerScriptResRefs: cloneTriggerScriptResRefsStorage(target),
  };
  return replaceSceneObjects(scene, nextObjects);
}

function setExistingTriggerTransitionStorage(
  scene: AreaScene,
  objectId: string,
  storage: TriggerTransitionStorage,
): AreaScene {
  if (!isTriggerTransitionStorage(storage)) return scene;
  const targetIndex = scene.objects.findIndex((object) => object.id === objectId);
  const object = targetIndex < 0 ? undefined : scene.objects[targetIndex];
  if (
    !object
    || object.kind !== "triggers"
    || !canEditExistingTriggerTransitionStorage(object.source)
    || !isTriggerTransitionStorage(object.triggerTransitionStorage)
    || triggerTransitionStoragesEqual(object.triggerTransitionStorage, storage)
  ) return scene;
  const nextObjects = [...scene.objects];
  nextObjects[targetIndex] = {
    ...object,
    triggerTransitionStorage: cloneTriggerTransitionStorage(storage),
  };
  return replaceSceneObjects(scene, nextObjects);
}

function isVisualTransformPersistenceSupported(object: SceneObject): boolean {
  if (object.kind !== "items") return true;
  return canEditRetainedItemVisualTransform(object);
}

function resolvePrimaryTarget(targets: SceneObject[], objectIds: string[]): SceneObject | null {
  if (targets.length === 0 || objectIds.length === 0) {
    return null;
  }

  const targetById = new Map(targets.map((object) => [object.id, object]));
  for (const objectId of objectIds) {
    const matched = targetById.get(objectId);
    if (matched) {
      return matched;
    }
  }

  return targets[0] ?? null;
}

export function createSceneMutationsFacade(): SceneMutationsFacade {
  return {
    appendObjects(scene: AreaScene, objects: SceneObject[]): AreaScene {
      if (objects.length === 0) {
        return scene;
      }
      const normalizedObjects = objects.map((object) =>
        normalizeObjectPlacement(scene, object)
      );
      return replaceSceneObjects(scene, [...scene.objects, ...normalizedObjects]);
    },
    deleteObjectsByIds(scene: AreaScene, objectIds: string[]): AreaScene {
      if (objectIds.length === 0) {
        return scene;
      }
      const idSet = new Set(objectIds);
      const nextObjects = scene.objects.filter((object) => !idSet.has(object.id));
      if (nextObjects.length === scene.objects.length) {
        return scene;
      }
      return replaceSceneObjects(scene, nextObjects);
    },
    deleteObjectById(scene: AreaScene, objectId: string): AreaScene {
      const nextObjects = scene.objects.filter((object) => object.id !== objectId);
      if (nextObjects.length === scene.objects.length) {
        return scene;
      }
      return replaceSceneObjects(scene, nextObjects);
    },
    setExistingWaypointTagById(
      scene: AreaScene,
      objectId: string,
      tag: string,
    ): AreaScene {
      return setExistingWaypointProperties(scene, objectId, { tag });
    },
    setExistingWaypointPropertiesById(
      scene: AreaScene,
      objectId: string,
      input: ExistingWaypointPropertiesInput,
    ): AreaScene {
      return setExistingWaypointProperties(scene, objectId, input);
    },
    setExistingEncounterTemplateResRefById(
      scene: AreaScene,
      objectId: string,
      templateResRef: string,
    ): AreaScene {
      return setExistingEncounterTemplateResRef(scene, objectId, templateResRef);
    },
    setExistingTriggerTemplateResRefById(
      scene: AreaScene,
      objectId: string,
      templateResRef: string,
    ): AreaScene {
      return setExistingTriggerTemplateResRef(scene, objectId, templateResRef);
    },
    setExistingTriggerLocalizedNameById(
      scene: AreaScene,
      objectId: string,
      localizedName: string,
    ): AreaScene {
      return setExistingTriggerLocalizedName(scene, objectId, localizedName);
    },
    setExistingTriggerEditorCommentById(
      scene: AreaScene,
      objectId: string,
      editorComment: string,
    ): AreaScene {
      return setExistingTriggerEditorComment(scene, objectId, editorComment);
    },
    setExistingTriggerScriptResRefsById(
      scene: AreaScene,
      objectId: string,
      scripts: TriggerScriptResRefsStorage,
    ): AreaScene {
      return setExistingTriggerScriptResRefs(scene, objectId, scripts);
    },
    setExistingTriggerTransitionStorageById(
      scene: AreaScene,
      objectId: string,
      storage: TriggerTransitionStorage,
    ): AreaScene {
      return setExistingTriggerTransitionStorage(scene, objectId, storage);
    },
    setAreaObjectPolygonGeometryById(
      scene: AreaScene,
      objectId: string,
      geometry: AreaObjectPolygonGeometry,
      tag?: string,
      encounterActive?: EncounterActiveStorage,
      encounterPlayerOnly?: EncounterPlayerOnlyStorage,
      encounterReset?: EncounterResetStorage,
      encounterResetTime?: EncounterResetTimeStorage,
      encounterSpawnOption?: EncounterSpawnOptionStorage,
      encounterRespawns?: EncounterRespawnsStorage,
      encounterCreatureCounts?: EncounterCreatureCountStorage,
      encounterScriptResRefs?: EncounterScriptResRefsStorage,
      encounterFactionId?: number,
      encounterDifficulty?: SceneEncounterDifficultyPair,
      encounterLocalizedName?: string,
      encounterEditorComment?: string,
      encounterVariables?: readonly SceneObjectEncounterVariableTargetEntry[],
      encounterCreatureList?: readonly SceneObjectEncounterCreatureListTargetEntry[],
      encounterSpawnPoints?: readonly SceneObjectEncounterSpawnPointTargetEntry[],
    ): AreaScene {
      if (!isAreaObjectPolygonGeometry(geometry)) {
        return scene;
      }
      const targetIndex = scene.objects.findIndex((object) => object.id === objectId);
      if (targetIndex < 0) {
        return scene;
      }
      const object = scene.objects[targetIndex];
      if (!object || (object.kind !== "triggers" && object.kind !== "encounters")) {
        return scene;
      }
      const expectedSourceKind = object.kind === "triggers" ? "trigger" : "encounter";
      if (
        object.source?.type !== "aurora_git"
        || object.source.sourceKind !== expectedSourceKind
        || !Number.isSafeInteger(object.source.sourceIndex)
        || Number(object.source.sourceIndex) < 0
        || !isAreaObjectPolygonGeometry(object.source.polygonGeometry)
      ) {
        return scene;
      }
      const exactEncounterActive = encounterActive === undefined
        ? null
        : readEncounterActiveStorage(encounterActive);
      const exactEncounterPlayerOnly = encounterPlayerOnly === undefined
        ? null
        : readEncounterPlayerOnlyStorage(encounterPlayerOnly);
      const exactEncounterReset = encounterReset === undefined
        ? null
        : readEncounterResetStorage(encounterReset);
      const exactEncounterResetTime = encounterResetTime === undefined
        ? null
        : readEncounterResetTimeStorage(encounterResetTime);
      const exactEncounterSpawnOption = encounterSpawnOption === undefined
        ? null
        : readEncounterSpawnOptionStorage(encounterSpawnOption);
      const exactEncounterRespawns = encounterRespawns === undefined
        ? null
        : readEncounterRespawnsStorage(encounterRespawns);
      const exactEncounterCreatureCounts = encounterCreatureCounts === undefined
        ? null
        : readEncounterCreatureCountStorage(encounterCreatureCounts);
      const exactEncounterScriptResRefs = encounterScriptResRefs === undefined
        ? null
        : readEncounterScriptResRefsTargetStorage(encounterScriptResRefs);
      const encounterFactionBinding = readEncounterFactionCatalogBinding(
        object.source,
        scene.placeableFactionCatalog,
      );
      const exactEncounterFactionId = encounterFactionId === undefined
        ? null
        : Number.isSafeInteger(encounterFactionId)
          ? Number(encounterFactionId)
          : null;
      const encounterDifficultyBinding = readEncounterDifficultyCatalogBinding(
        object.source,
        scene.encounterDifficultyCatalog,
      );
      const exactEncounterDifficulty = encounterDifficulty === undefined
        ? null
        : readEncounterDifficultyTarget(
            encounterDifficulty,
            encounterDifficultyBinding?.catalog,
          );
      const currentEncounterDifficulty = readEncounterDifficultyTarget(
        object.encounterDifficulty,
        encounterDifficultyBinding?.catalog,
      );
      const sourceEncounterLocalizedName =
        readExistingEncounterLocalizedNameSourceValue(object.source);
      const exactEncounterLocalizedName = encounterLocalizedName === undefined
        ? null
        : isEncounterLocalizedNameInlineAsciiText(encounterLocalizedName)
          ? encounterLocalizedName
          : null;
      const sourceEncounterEditorComment = object.source.type === "aurora_git" &&
          object.source.sourceKind === "encounter" &&
          isEncounterEditorComment(object.source.encounterEditorComment)
        ? object.source.encounterEditorComment
        : undefined;
      const exactEncounterEditorComment = encounterEditorComment === undefined
        ? null
        : isEncounterEditorComment(encounterEditorComment)
          ? encounterEditorComment
          : null;
      const sourceEncounterVariables = object.source.type === "aurora_git" &&
          object.source.sourceKind === "encounter"
        ? readEncounterVariableProvenance(object.source.encounterVariables)
        : null;
      const currentEncounterVariables = readEncounterVariableTargetEntries(
        object.encounterProperties?.variables,
      );
      const exactEncounterVariables = encounterVariables === undefined
        ? null
        : readEncounterVariableTargetEntries(encounterVariables);
      const sourceEncounterCreatureList = object.source.type === "aurora_git" &&
          object.source.sourceKind === "encounter"
        ? readEncounterCreatureListProvenance(object.source.encounterCreatureList)
        : null;
      const currentEncounterCreatureList = readEncounterCreatureListTargetEntries(
        object.encounterProperties?.creatureList,
      );
      const exactEncounterCreatureList = encounterCreatureList === undefined
        ? null
        : readEncounterCreatureListTargetEntries(encounterCreatureList);
      const sourceEncounterSpawnPoints = object.source.type === "aurora_git" &&
          object.source.sourceKind === "encounter"
        ? readEncounterSpawnPointListProvenance(object.source.encounterSpawnPoints)
        : null;
      const currentEncounterSpawnPoints = readEncounterSpawnPointTargetEntries(
        object.encounterProperties?.spawnPoints,
      );
      const exactEncounterSpawnPoints = encounterSpawnPoints === undefined
        ? null
        : readEncounterSpawnPointTargetEntries(encounterSpawnPoints);
      if (
        encounterActive !== undefined
        && (
          object.kind !== "encounters"
          || !canEditExistingEncounterActive(object.source)
          || !readEncounterActiveStorage(object.encounterActive)
          || !exactEncounterActive
        )
      ) {
        return scene;
      }
      if (
        encounterPlayerOnly !== undefined
        && (
          object.kind !== "encounters"
          || !canEditExistingEncounterPlayerOnly(object.source)
          || !readEncounterPlayerOnlyStorage(object.encounterPlayerOnly)
          || !exactEncounterPlayerOnly
        )
      ) {
        return scene;
      }
      if (
        encounterReset !== undefined
        && (
          object.kind !== "encounters"
          || !canEditExistingEncounterReset(object.source)
          || !readEncounterResetStorage(object.encounterReset)
          || !exactEncounterReset
        )
      ) {
        return scene;
      }
      if (
        encounterResetTime !== undefined
        && (
          object.kind !== "encounters"
          || !canEditExistingEncounterResetTime(object.source)
          || !readEncounterResetTimeStorage(object.encounterResetTime)
          || !exactEncounterResetTime
        )
      ) {
        return scene;
      }
      if (
        encounterSpawnOption !== undefined
        && (
          object.kind !== "encounters"
          || !canEditExistingEncounterSpawnOption(object.source)
          || !readEncounterSpawnOptionStorage(object.encounterSpawnOption)
          || !exactEncounterSpawnOption
        )
      ) {
        return scene;
      }
      if (
        encounterRespawns !== undefined
        && (
          object.kind !== "encounters"
          || !canEditExistingEncounterRespawns(object.source)
          || !readEncounterRespawnsStorage(object.encounterRespawns)
          || !exactEncounterRespawns
        )
      ) {
        return scene;
      }
      if (
        encounterCreatureCounts !== undefined
        && (
          object.kind !== "encounters"
          || !canEditExistingEncounterCreatureCounts(object.source)
          || !readEncounterCreatureCountStorage(object.encounterCreatureCounts)
          || !exactEncounterCreatureCounts
        )
      ) {
        return scene;
      }
      if (
        encounterScriptResRefs !== undefined
        && (
          object.kind !== "encounters"
          || !canEditExistingEncounterScriptResRefs(object.source)
          || !readEncounterScriptResRefsStorage(object.encounterScriptResRefs)
          || !exactEncounterScriptResRefs
        )
      ) {
        return scene;
      }
      if (
        encounterFactionId !== undefined
        && (
          object.kind !== "encounters"
          || !encounterFactionBinding
          || exactEncounterFactionId === null
          || !Number.isSafeInteger(object.encounterFactionId)
          || !encounterFactionBinding.catalog.rows.some(
            (row) => row.factionId === object.encounterFactionId && row.factionId >= 1,
          )
          || !encounterFactionBinding.catalog.rows.some(
            (row) => row.factionId === exactEncounterFactionId && row.factionId >= 1,
          )
        )
      ) {
        return scene;
      }
      if (
        encounterDifficulty !== undefined
        && (
          object.kind !== "encounters"
          || !encounterDifficultyBinding
          || !currentEncounterDifficulty
          || !exactEncounterDifficulty
        )
      ) {
        return scene;
      }
      if (
        encounterLocalizedName !== undefined
        && (
          object.kind !== "encounters"
          || sourceEncounterLocalizedName === undefined
          || !isEncounterLocalizedNameInlineAsciiText(object.encounterLocalizedName)
          || exactEncounterLocalizedName === null
        )
      ) {
        return scene;
      }
      if (
        encounterEditorComment !== undefined
        && (
          object.kind !== "encounters"
          || sourceEncounterEditorComment === undefined
          || !isEncounterEditorComment(object.encounterProperties?.comments)
          || exactEncounterEditorComment === null
        )
      ) {
        return scene;
      }
      if (
        encounterVariables !== undefined
        && (
          object.kind !== "encounters"
          || sourceEncounterVariables === null
          || currentEncounterVariables === null
          || exactEncounterVariables === null
        )
      ) {
        return scene;
      }
      if (
        encounterCreatureList !== undefined
        && (
          object.kind !== "encounters"
          || sourceEncounterCreatureList === null
          || currentEncounterCreatureList === null
          || exactEncounterCreatureList === null
          || !encounterCreatureListIdentityMatches(
            sourceEncounterCreatureList.expectedEntries,
            currentEncounterCreatureList,
          )
          || !encounterCreatureListIdentityMatches(
            sourceEncounterCreatureList.expectedEntries,
            exactEncounterCreatureList,
          )
        )
      ) {
        return scene;
      }
      if (
        encounterSpawnPoints !== undefined
        && (
          object.kind !== "encounters"
          || sourceEncounterSpawnPoints === null
          || currentEncounterSpawnPoints === null
          || exactEncounterSpawnPoints === null
        )
      ) {
        return scene;
      }
      const geometryChanged = !areaObjectPolygonGeometriesEqual(
        object.polygonGeometry,
        geometry,
      );
      const tagChanged = tag !== undefined && object.tag !== tag && (
        object.kind === "triggers"
          ? canEditExistingTriggerTag(object.source) && isEditableTriggerTag(tag)
          : canEditExistingEncounterTag(object.source) && isEditableEncounterTag(tag)
      );
      const encounterActiveChanged = exactEncounterActive !== null
        && !encounterActiveStoragesEqual(object.encounterActive, exactEncounterActive);
      const encounterPlayerOnlyChanged = exactEncounterPlayerOnly !== null
        && !encounterPlayerOnlyStoragesEqual(
          object.encounterPlayerOnly,
          exactEncounterPlayerOnly,
        );
      const encounterResetChanged = exactEncounterReset !== null
        && !encounterResetStoragesEqual(object.encounterReset, exactEncounterReset);
      const encounterResetTimeChanged = exactEncounterResetTime !== null
        && !encounterResetTimeStoragesEqual(
          object.encounterResetTime,
          exactEncounterResetTime,
        );
      const encounterSpawnOptionChanged = exactEncounterSpawnOption !== null
        && !encounterSpawnOptionStoragesEqual(
          object.encounterSpawnOption,
          exactEncounterSpawnOption,
        );
      const encounterRespawnsChanged = exactEncounterRespawns !== null
        && !encounterRespawnsStoragesEqual(
          object.encounterRespawns,
          exactEncounterRespawns,
        );
      const encounterCreatureCountsChanged = exactEncounterCreatureCounts !== null
        && !encounterCreatureCountStoragesEqual(
          object.encounterCreatureCounts,
          exactEncounterCreatureCounts,
        );
      const encounterScriptResRefsChanged = exactEncounterScriptResRefs !== null
        && !encounterScriptResRefsStoragesEqual(
          object.encounterScriptResRefs,
          exactEncounterScriptResRefs,
        );
      const encounterFactionChanged = exactEncounterFactionId !== null
        && object.encounterFactionId !== exactEncounterFactionId;
      const encounterDifficultyChanged = exactEncounterDifficulty !== null &&
        !encounterDifficultyPairsEqual(
          currentEncounterDifficulty,
          exactEncounterDifficulty,
        );
      const encounterLocalizedNameChanged = exactEncounterLocalizedName !== null
        && object.encounterLocalizedName !== exactEncounterLocalizedName;
      const encounterEditorCommentChanged = exactEncounterEditorComment !== null
        && object.encounterProperties?.comments !== exactEncounterEditorComment;
      const encounterVariablesChanged = exactEncounterVariables !== null &&
        !encounterVariableTargetEntriesEqual(
          currentEncounterVariables ?? undefined,
          exactEncounterVariables,
        );
      const encounterCreatureListChanged = exactEncounterCreatureList !== null &&
        !encounterCreatureListTargetEntriesEqual(
          currentEncounterCreatureList ?? undefined,
          exactEncounterCreatureList,
        );
      const encounterSpawnPointsChanged = exactEncounterSpawnPoints !== null &&
        !encounterSpawnPointTargetEntriesEqual(
          currentEncounterSpawnPoints ?? undefined,
          exactEncounterSpawnPoints,
        );
      const effectiveSpawnOption = exactEncounterSpawnOption
        ?? readEncounterSpawnOptionStorage(object.encounterSpawnOption);
      const effectiveReset = exactEncounterReset
        ?? readEncounterResetStorage(object.encounterReset);
      if (
        (encounterResetChanged || encounterResetTimeChanged)
        && (
          !canEditExistingEncounterSpawnOption(object.source)
          || !effectiveSpawnOption
          || (
            exactEncounterSpawnOption === null
            && effectiveSpawnOption.spawnOption !== 0
          )
        )
      ) {
        return scene;
      }
      if (
        encounterRespawnsChanged
        && (
          !canEditExistingEncounterSpawnOption(object.source)
          || !canEditExistingEncounterReset(object.source)
          || !effectiveSpawnOption
          || !effectiveReset
          || (
            exactEncounterSpawnOption === null
            && effectiveSpawnOption.spawnOption !== 0
          )
          || (
            exactEncounterReset === null
            && effectiveReset.resetByte !== 1
          )
        )
      ) {
        return scene;
      }
      if (
        !geometryChanged
        && !tagChanged
        && !encounterActiveChanged
        && !encounterPlayerOnlyChanged
        && !encounterResetChanged
        && !encounterResetTimeChanged
        && !encounterSpawnOptionChanged
        && !encounterRespawnsChanged
        && !encounterCreatureCountsChanged
        && !encounterScriptResRefsChanged
        && !encounterFactionChanged
        && !encounterDifficultyChanged
        && !encounterLocalizedNameChanged
        && !encounterEditorCommentChanged
        && !encounterVariablesChanged
        && !encounterCreatureListChanged
        && !encounterSpawnPointsChanged
      ) {
        return scene;
      }
      const nextObjects = [...scene.objects];
      nextObjects[targetIndex] = {
        ...object,
        ...(geometryChanged
          ? { polygonGeometry: cloneAreaObjectPolygonGeometry(geometry) }
          : {}),
        ...(tagChanged ? { tag } : {}),
        ...(encounterActiveChanged && exactEncounterActive
          ? { encounterActive: cloneEncounterActiveStorage(exactEncounterActive) }
          : {}),
        ...(encounterPlayerOnlyChanged && exactEncounterPlayerOnly
          ? {
              encounterPlayerOnly:
                cloneEncounterPlayerOnlyStorage(exactEncounterPlayerOnly),
            }
          : {}),
        ...(encounterResetChanged && exactEncounterReset
          ? { encounterReset: cloneEncounterResetStorage(exactEncounterReset) }
          : {}),
        ...(encounterResetTimeChanged && exactEncounterResetTime
          ? {
              encounterResetTime:
                cloneEncounterResetTimeStorage(exactEncounterResetTime),
            }
          : {}),
        ...(encounterSpawnOptionChanged && exactEncounterSpawnOption
          ? {
              encounterSpawnOption:
                cloneEncounterSpawnOptionStorage(exactEncounterSpawnOption),
            }
          : {}),
        ...(encounterRespawnsChanged && exactEncounterRespawns
          ? {
              encounterRespawns:
                cloneEncounterRespawnsStorage(exactEncounterRespawns),
            }
          : {}),
        ...(encounterCreatureCountsChanged && exactEncounterCreatureCounts
          ? {
              encounterCreatureCounts:
                cloneEncounterCreatureCountStorage(exactEncounterCreatureCounts),
            }
          : {}),
        ...(encounterScriptResRefsChanged && exactEncounterScriptResRefs
          ? {
              encounterScriptResRefs:
                cloneEncounterScriptResRefsStorage(exactEncounterScriptResRefs),
            }
          : {}),
        ...(encounterFactionChanged && exactEncounterFactionId !== null
          ? { encounterFactionId: exactEncounterFactionId }
          : {}),
        ...(encounterDifficultyChanged && exactEncounterDifficulty
          ? { encounterDifficulty: { ...exactEncounterDifficulty } }
          : {}),
        ...(encounterLocalizedNameChanged && exactEncounterLocalizedName !== null
          ? { encounterLocalizedName: exactEncounterLocalizedName }
          : {}),
        ...((encounterEditorCommentChanged && exactEncounterEditorComment !== null) ||
            (encounterVariablesChanged && exactEncounterVariables !== null) ||
            (encounterCreatureListChanged && exactEncounterCreatureList !== null) ||
            (encounterSpawnPointsChanged && exactEncounterSpawnPoints !== null)
          ? {
              encounterProperties: {
                ...object.encounterProperties,
                ...(encounterEditorCommentChanged && exactEncounterEditorComment !== null
                  ? { comments: exactEncounterEditorComment }
                  : {}),
                ...(encounterVariablesChanged && exactEncounterVariables !== null
                  ? { variables: exactEncounterVariables.map((entry) => ({ ...entry })) }
                  : {}),
                ...(encounterCreatureListChanged && exactEncounterCreatureList !== null
                  ? {
                      creatureList: exactEncounterCreatureList.map(
                        (entry) => ({ ...entry }),
                      ),
                    }
                  : {}),
                ...(encounterSpawnPointsChanged && exactEncounterSpawnPoints !== null
                  ? {
                      spawnPoints: exactEncounterSpawnPoints.map(
                        (entry) => ({ ...entry }),
                      ),
                    }
                  : {}),
              },
            }
          : {}),
      };
      return replaceSceneObjects(scene, nextObjects);
    },
    setPlaceablePropertiesByIds(
      scene: AreaScene,
      objectIds: string[],
      input: SceneObjectPlaceablePropertiesInput
    ): AreaScene {
      if (objectIds.length === 0) {
        return scene;
      }

      const idSet = new Set(objectIds);
      if (!scene.objects.some((object) => idSet.has(object.id) && object.kind === "placeables")) {
        return scene;
      }

      const nextName = input.name.trim();
      const nextTag = input.tag.trim();
      const nextResRef = input.resRef.trim();
      const nextIsStatic = Boolean(input.isStatic);
      const hasPlaceablePropertiesInput = input.placeableProperties !== undefined;

      let changed = false;
      const nextObjects = scene.objects.map((object) => {
        if (!idSet.has(object.id) || object.kind !== "placeables") {
          return object;
        }

        const currentName = object.name ?? object.tag;
        const currentIsStatic = object.isStatic ?? true;
        const nextPlaceableProperties = hasPlaceablePropertiesInput
          ? structuredClone(input.placeableProperties)
          : object.placeableProperties;
        const arePlaceablePropertiesUnchanged = !hasPlaceablePropertiesInput ||
          JSON.stringify(object.placeableProperties) === JSON.stringify(nextPlaceableProperties);
        if (
          currentName === nextName &&
          object.tag === nextTag &&
          object.resRef === nextResRef &&
          currentIsStatic === nextIsStatic &&
          arePlaceablePropertiesUnchanged
        ) {
          return object;
        }

        changed = true;
        return {
          ...object,
          name: nextName,
          tag: nextTag,
          resRef: nextResRef,
          isStatic: nextIsStatic,
          ...(hasPlaceablePropertiesInput
            ? { placeableProperties: nextPlaceableProperties }
            : {})
        };
      });

      if (!changed) {
        return scene;
      }
      return replaceSceneObjects(scene, nextObjects);
    },
    getSoundPropertiesById(scene: AreaScene, objectId: string): SceneSoundPropertiesModel | null {
      const sound = scene.objects.find((object) => object.id === objectId);
      if (!sound || sound.kind !== "sounds") {
        return null;
      }
      return toSceneSoundPropertiesModel(sound);
    },
    setSoundPropertiesByIds(
      scene: AreaScene,
      objectIds: string[],
      input: SceneSoundPropertiesModel
    ): AreaScene {
      if (objectIds.length === 0) {
        return scene;
      }
      const idSet = new Set(objectIds);
      if (!scene.objects.some((object) => idSet.has(object.id) && object.kind === "sounds")) {
        return scene;
      }

      const normalizedInput = normalizeSceneSoundPropertiesInput(input);
      let changed = false;
      const nextObjects = scene.objects.map((object) => {
        if (!idSet.has(object.id) || object.kind !== "sounds") {
          return object;
        }

        const currentModel = toSceneSoundPropertiesModel(object);
        if (currentModel && areSceneSoundPropertiesEqual(currentModel, normalizedInput)) {
          return object;
        }

        changed = true;
        const preserve = normalizeSoundPositioningPreservePayload({
          ...(object.soundPositioning?.preserve ?? {}),
          active: normalizedInput.active,
          whenToPlay: normalizedInput.whenToPlay,
          dayNight: normalizedInput.dayNight,
          hoursStart: normalizedInput.hoursStart,
          hoursEnd: normalizedInput.hoursEnd,
          playStyle: normalizedInput.playStyle,
          playOrder: normalizedInput.playOrder,
          intervalMs: normalizedInput.intervalMs,
          intervalVariationMs: normalizedInput.intervalVariationMs,
          volumeVariation: normalizedInput.volumeVariation,
          pitchVariation: normalizedInput.pitchVariation
        });

        return {
          ...object,
          name: normalizedInput.name,
          tag: normalizedInput.tag,
          resRef: normalizedInput.resRef,
          soundPositioning: {
            mode: normalizedInput.mode,
            elevation: normalizedInput.elevation,
            maxVolumeDistance: normalizedInput.maxVolumeDistance,
            cutoffDistance: normalizedInput.cutoffDistance,
            randomRangeWestEast: normalizedInput.randomRangeWestEast,
            randomRangeNorthSouth: normalizedInput.randomRangeNorthSouth,
            preserve
          }
        };
      });

      if (!changed) {
        return scene;
      }
      return replaceSceneObjects(scene, nextObjects);
    },
    applyAuroraAreaTerrainBrush(
      scene: AreaScene,
      tileId: string,
      terrain: string,
      selector?: AuroraAreaCandidateSelector
    ): AreaScene {
      return selector
        ? applyAuroraAreaTerrainBrush(scene, tileId, terrain, selector)
        : applyAuroraAreaTerrainBrush(scene, tileId, terrain);
    },
    placeAuroraAreaGroup(
      scene: AreaScene,
      tileId: string,
      groupId: string,
      orientation: 0 | 1 | 2 | 3,
      selector?: AuroraAreaCandidateSelector
    ): AreaScene {
      return selector
        ? placeAuroraAreaGroupAtSceneTile(scene, tileId, groupId, orientation, selector)
        : placeAuroraAreaGroupAtSceneTile(scene, tileId, groupId, orientation);
    },
    applyAuroraAreaCrosserBrush(scene, tileId, edge, crosser, selector) {
      return applyAuroraAreaCrosserBrush(scene, tileId, edge, crosser, selector);
    },
    applyAuroraAreaHeightBrush(scene, tileId, delta, selector) {
      return applyAuroraAreaHeightBrush(scene, tileId, delta, selector);
    },
    applyAuroraAreaEraser(scene: AreaScene, tileId: string): AreaScene {
      return applyAuroraAreaEraser(scene, tileId);
    },
    removeAuroraAreaGroup(scene: AreaScene, tileId: string): AreaScene {
      return removeAuroraAreaGroupAtSceneTile(scene, tileId);
    },
    rotateAuroraAreaGroup(scene: AreaScene, tileId: string, delta: -1 | 1): AreaScene {
      return rotateAuroraAreaGroupAtSceneTile(scene, tileId, delta);
    },
    changeAuroraAreaGroupHeight(
      scene: AreaScene,
      tileId: string,
      delta: -1 | 1
    ): AreaScene {
      return changeAuroraAreaGroupHeightAtSceneTile(scene, tileId, delta);
    },
    updateTileTerrain(scene: AreaScene, tileId: string, terrain: TerrainBrushKind): AreaScene {
      let changed = false;
      const nextTiles = scene.tiles.map((tile) => {
        if (tile.id !== tileId) {
          return tile;
        }
        if (tile.terrain === terrain) {
          return tile;
        }
        changed = true;
        return {
          ...tile,
          terrain
        };
      });
      if (!changed) {
        return scene;
      }
      return replaceSceneTiles(scene, nextTiles);
    },
    resetObjectTransform(scene: AreaScene, objectId: string): AreaScene {
      let changed = false;
      const nextObjects = scene.objects.map((object) => {
        if (object.id !== objectId) {
          return object;
        }
        const hasTransformChange =
          object.bearing !== 0 ||
          object.visualTransform.scale !== 1 ||
          (object.visualTransform.scaleX ?? 1) !== 1 ||
          (object.visualTransform.scaleY ?? 1) !== 1 ||
          (object.visualTransform.scaleZ ?? 1) !== 1 ||
          object.visualTransform.offsetX !== 0 ||
          object.visualTransform.offsetY !== 0 ||
          object.visualTransform.offsetZ !== 0 ||
          object.visualTransform.pitch !== 0 ||
          object.visualTransform.roll !== 0 ||
          object.visualTransform.yaw !== 0;
        if (!hasTransformChange) {
          return object;
        }
        changed = true;
        return {
          ...object,
          bearing: 0,
          visualTransform: {
            scale: 1,
            scaleX: 1,
            scaleY: 1,
            scaleZ: 1,
            offsetX: 0,
            offsetY: 0,
            offsetZ: 0,
            pitch: 0,
            roll: 0,
            yaw: 0
          }
        };
      });
      if (!changed) {
        return scene;
      }
      return replaceSceneObjects(scene, nextObjects);
    },
    setObjectsAbsoluteLocationByIds(
      scene: AreaScene,
      objectIds: string[],
      input: SceneObjectAbsoluteLocationInput
    ): AreaScene {
      if (objectIds.length === 0) {
        return scene;
      }

      const targets = resolveMovableTargets(scene, objectIds);
      if (targets.length === 0) {
        return scene;
      }

      const primaryTarget = resolvePrimaryTarget(targets, objectIds);
      if (!primaryTarget) {
        return scene;
      }

      const maxX = resolveSceneCoordinateMax(scene.width);
      const maxY = resolveSceneCoordinateMax(scene.height);
      const requestedX = clampNumber(input.x, SCENE_COORDINATE_MIN, maxX);
      const requestedY = clampNumber(input.y, SCENE_COORDINATE_MIN, maxY);
      const requestedZ = resolveFiniteNumber(
        input.z,
        resolveFiniteNumber(primaryTarget.z, primaryTarget.visualTransform.offsetZ)
      );
      const requestedBearing = normalizeBearingRadians(input.bearing);
      const requestedDeltaX = requestedX - primaryTarget.x;
      const requestedDeltaY = requestedY - primaryTarget.y;
      const requestedDeltaZ =
        requestedZ - resolveFiniteNumber(primaryTarget.z, primaryTarget.visualTransform.offsetZ);
      const requestedDeltaBearing = requestedBearing - primaryTarget.bearing;

      const translationBounds = resolveTranslationBounds(scene, targets);
      const clampedDeltaX = clampDeltaToBounds(
        requestedDeltaX,
        translationBounds.minDeltaX,
        translationBounds.maxDeltaX
      );
      const clampedDeltaY = clampDeltaToBounds(
        requestedDeltaY,
        translationBounds.minDeltaY,
        translationBounds.maxDeltaY
      );
      const clampedDeltaZ = requestedDeltaZ;
      if (
        clampedDeltaX === 0 &&
        clampedDeltaY === 0 &&
        clampedDeltaZ === 0 &&
        requestedDeltaBearing === 0
      ) {
        return scene;
      }

      const idSet = new Set(targets.map((object) => object.id));
      let changed = false;

      const nextObjects = scene.objects.map((object) => {
        if (!idSet.has(object.id)) {
          return object;
        }
        const nextX = clampNumber(object.x + clampedDeltaX, SCENE_COORDINATE_MIN, maxX);
        const nextY = clampNumber(object.y + clampedDeltaY, SCENE_COORDINATE_MIN, maxY);
        const currentZ = resolveFiniteNumber(object.z, object.visualTransform.offsetZ);
        const nextZ = currentZ + clampedDeltaZ;
        const nextBearing = normalizeBearingRadians(object.bearing + requestedDeltaBearing);
        if (
          object.x === nextX &&
          object.y === nextY &&
          currentZ === nextZ &&
          object.bearing === nextBearing
        ) {
          return object;
        }
        changed = true;
        return {
          ...object,
          x: nextX,
          y: nextY,
          z: nextZ,
          bearing: nextBearing,
        };
      });

      if (!changed) {
        return scene;
      }
      return replaceSceneObjects(scene, nextObjects);
    },
    setObjectsVisualTransformByIds(
      scene: AreaScene,
      objectIds: string[],
      input: SceneObjectVisualTransformInput
    ): AreaScene {
      if (objectIds.length === 0) {
        return scene;
      }

      const targets = resolveVisualTransformTargets(scene, objectIds);
      if (targets.length === 0) {
        return scene;
      }

      const idSet = new Set(targets.map((object) => object.id));
      let changed = false;

      const nextObjects = scene.objects.map((object) => {
        if (!idSet.has(object.id)) {
          return object;
        }
        const nextScale = normalizeVisualScale(input.scale, object.visualTransform.scale);
        const nextScaleAxes = resolveNextVisualScaleAxes(
          object.visualTransform,
          input,
          nextScale
        );
        const nextOffsetZ = resolveFiniteNumber(input.offsetZ, object.visualTransform.offsetZ);
        const nextVisualTransform = {
          ...object.visualTransform,
          scale: nextScale,
          scaleX: nextScaleAxes.scaleX,
          scaleY: nextScaleAxes.scaleY,
          scaleZ: nextScaleAxes.scaleZ,
          offsetX: input.offsetX,
          offsetY: input.offsetY,
          offsetZ: nextOffsetZ,
          pitch: input.pitch,
          yaw: input.yaw,
          roll: input.roll,
        };
        if (
          object.visualTransform.scale === nextScale &&
          (object.visualTransform.scaleX ?? object.visualTransform.scale) === nextScaleAxes.scaleX &&
          (object.visualTransform.scaleY ?? object.visualTransform.scale) === nextScaleAxes.scaleY &&
          (object.visualTransform.scaleZ ?? object.visualTransform.scale) === nextScaleAxes.scaleZ &&
          object.visualTransform.offsetX === input.offsetX &&
          object.visualTransform.offsetY === input.offsetY &&
          object.visualTransform.offsetZ === nextOffsetZ &&
          object.visualTransform.pitch === input.pitch &&
          object.visualTransform.yaw === input.yaw &&
          object.visualTransform.roll === input.roll
        ) {
          return object;
        }
        const itemVisualTransform = object.kind === "items"
          ? sceneVisualTransformToItemStorage(nextVisualTransform)
          : undefined;
        if (object.kind === "items" && !itemVisualTransform) {
          return object;
        }
        changed = true;
        return {
          ...object,
          visualTransform: nextVisualTransform,
          ...(itemVisualTransform
            ? {
                itemProperties: {
                  ...object.itemProperties,
                  visualTransform: itemVisualTransform,
                },
              }
            : {}),
        };
      });

      if (!changed) {
        return scene;
      }
      return replaceSceneObjects(scene, nextObjects);
    },
    restoreObjectsPlacementBySnapshots(scene: AreaScene, snapshots: SceneObject[]): AreaScene {
      if (snapshots.length === 0) {
        return scene;
      }

      const snapshotById = new Map(snapshots.map((object) => [object.id, object]));
      const targets = resolveMovableTargets(scene, Array.from(snapshotById.keys()));
      if (targets.length === 0) {
        return scene;
      }

      const targetIdSet = new Set(targets.map((object) => object.id));
      let changed = false;
      const nextObjects = scene.objects.map((object) => {
        if (!targetIdSet.has(object.id)) {
          return object;
        }
        const snapshot = snapshotById.get(object.id);
        if (!snapshot) {
          return object;
        }
        if (
          object.x === snapshot.x &&
          object.y === snapshot.y &&
          object.z === snapshot.z &&
          object.bearing === snapshot.bearing &&
          object.visualTransform.scale === snapshot.visualTransform.scale &&
          (object.visualTransform.scaleX ?? object.visualTransform.scale) ===
            (snapshot.visualTransform.scaleX ?? snapshot.visualTransform.scale) &&
          (object.visualTransform.scaleY ?? object.visualTransform.scale) ===
            (snapshot.visualTransform.scaleY ?? snapshot.visualTransform.scale) &&
          (object.visualTransform.scaleZ ?? object.visualTransform.scale) ===
            (snapshot.visualTransform.scaleZ ?? snapshot.visualTransform.scale) &&
          object.visualTransform.offsetX === snapshot.visualTransform.offsetX &&
          object.visualTransform.offsetY === snapshot.visualTransform.offsetY &&
          object.visualTransform.offsetZ === snapshot.visualTransform.offsetZ &&
          object.visualTransform.pitch === snapshot.visualTransform.pitch &&
          object.visualTransform.yaw === snapshot.visualTransform.yaw &&
          object.visualTransform.roll === snapshot.visualTransform.roll
        ) {
          return object;
        }
        changed = true;
        return normalizeObjectPlacement(scene, {
          ...object,
          x: snapshot.x,
          y: snapshot.y,
          z: snapshot.z,
          bearing: snapshot.bearing,
          visualTransform: { ...snapshot.visualTransform }
        });
      });
      if (!changed) {
        return scene;
      }
      return replaceSceneObjects(scene, nextObjects);
    },
    translateObjectsByIds(
      scene: AreaScene,
      objectIds: string[],
      delta: SceneObjectTranslationDelta
    ): AreaScene {
      if (
        objectIds.length === 0 ||
        (delta.x === 0 && delta.y === 0)
      ) {
        return scene;
      }

      const targets = resolveGenericTransformTargets(scene, objectIds);
      if (targets.length === 0) {
        return scene;
      }

      const bounded = resolveTranslationBounds(scene, targets);
      const clampedDeltaX = clampDeltaToBounds(delta.x, bounded.minDeltaX, bounded.maxDeltaX);
      const clampedDeltaY = clampDeltaToBounds(delta.y, bounded.minDeltaY, bounded.maxDeltaY);
      if (clampedDeltaX === 0 && clampedDeltaY === 0) {
        return scene;
      }

      const idSet = new Set(targets.map((object) => object.id));
      const maxX = resolveSceneCoordinateMax(scene.width);
      const maxY = resolveSceneCoordinateMax(scene.height);
      let changed = false;

      const nextObjects = scene.objects.map((object) => {
        if (!idSet.has(object.id)) {
          return object;
        }
        const nextX = clampNumber(object.x + clampedDeltaX, SCENE_COORDINATE_MIN, maxX);
        const nextY = clampNumber(object.y + clampedDeltaY, SCENE_COORDINATE_MIN, maxY);
        if (nextX === object.x && nextY === object.y) {
          return object;
        }
        changed = true;
        return {
          ...object,
          x: nextX,
          y: nextY
        };
      });
      if (!changed) {
        return scene;
      }
      return replaceSceneObjects(scene, nextObjects);
    },
    adjustObjectsHeightByIds(scene: AreaScene, objectIds: string[], deltaZ: number): AreaScene {
      if (objectIds.length === 0 || deltaZ === 0 || !Number.isFinite(deltaZ)) {
        return scene;
      }

      const targets = resolveGenericTransformTargets(scene, objectIds);
      if (targets.length === 0) {
        return scene;
      }

      const clampedDeltaZ = deltaZ;
      if (clampedDeltaZ === 0) {
        return scene;
      }

      const idSet = new Set(targets.map((object) => object.id));
      let changed = false;
      const nextObjects = scene.objects.map((object) => {
        if (!idSet.has(object.id)) {
          return object;
        }
        const currentZ = resolveFiniteNumber(object.z, object.visualTransform.offsetZ);
        const nextZ = currentZ + clampedDeltaZ;
        if (nextZ === currentZ) {
          return object;
        }
        changed = true;
        return {
          ...object,
          z: nextZ
        };
      });
      if (!changed) {
        return scene;
      }
      return replaceSceneObjects(scene, nextObjects);
    },
    rotateObjectsBearingByIds(
      scene: AreaScene,
      objectIds: string[],
      deltaBearingRad: number
    ): AreaScene {
      if (objectIds.length === 0 || deltaBearingRad === 0) {
        return scene;
      }

      const targets = resolveGenericTransformTargets(scene, objectIds);
      if (targets.length === 0) {
        return scene;
      }

      const idSet = new Set(targets.map((object) => object.id));
      let changed = false;
      const nextObjects = scene.objects.map((object) => {
        if (!idSet.has(object.id)) {
          return object;
        }
        const nextBearing = normalizeBearingRadians(object.bearing + deltaBearingRad);
        if (nextBearing === object.bearing) {
          return object;
        }
        changed = true;
        return {
          ...object,
          bearing: nextBearing
        };
      });
      if (!changed) {
        return scene;
      }
      return replaceSceneObjects(scene, nextObjects);
    }
  };
}
