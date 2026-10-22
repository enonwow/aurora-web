import type {
  AreaScene,
  SceneHistoryState,
  SceneObject,
  SceneObjectPlaceableProperties,
  SceneObjectKind,
  SceneEncounterDifficultyPair,
  SceneObjectEncounterCreatureListTargetEntry,
  SceneObjectEncounterSpawnPointTargetEntry,
  SceneObjectEncounterVariableTargetEntry,
  SceneObjectTriggerVariableTargetEntry,
  TerrainBrushKind
} from "../contracts";
import type { SceneFacadeBundle } from "./sceneFacadeBundle";
import type { AuroraAreaCandidateSelector, AuroraAreaEdge } from "../domain/auroraAreaEditing";
import type { AreaObjectPolygonGeometry } from "../../areas/domain/areaObjectPolygonGeometry";
import type { EncounterActiveStorage } from "../domain/encounterActive";
import type { EncounterPlayerOnlyStorage } from "../domain/encounterPlayerOnly";
import type { EncounterResetStorage } from "../domain/encounterReset";
import type { EncounterResetTimeStorage } from "../domain/encounterResetTime";
import type { EncounterSpawnOptionStorage } from "../domain/encounterSpawnOption";
import type { EncounterRespawnsStorage } from "../domain/encounterRespawns";
import type { EncounterCreatureCountStorage } from "../domain/encounterCreatureCounts";
import type { EncounterScriptResRefsStorage } from "../domain/encounterScriptResRefs";
import type { TriggerScriptResRefsStorage } from "../domain/triggerScriptResRefs";
import type { TriggerTransitionStorage } from "../domain/triggerTransitionStorage";
import type { TriggerCoreProperties } from "../domain/triggerCoreProperties";
import type { TriggerTrapProperties } from "../domain/triggerTrapProperties";
import type { ExistingWaypointPropertiesInput } from "./sceneMutationsFacade";

export interface SceneViewportPoint {
  x: number;
  y: number;
}

export interface SceneViewportTranslationDelta {
  x: number;
  y: number;
}

export interface SceneViewportAbsoluteLocationInput {
  x: number;
  y: number;
  z: number;
  bearing: number;
}

export interface SceneViewportVisualTransformInput {
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

export interface SceneViewportPlaceablePropertiesInput {
  name: string;
  tag: string;
  resRef: string;
  isStatic: boolean;
  placeableProperties?: SceneObjectPlaceableProperties;
}

export interface SceneViewportCopyAnchorParams {
  cursorAnchor: SceneViewportPoint | null;
  sourcePoints: SceneViewportPoint[];
  fallbackOffset: number;
}

export interface SceneViewportCopyTranslationParams {
  sourcePoints: SceneViewportPoint[];
  anchor: SceneViewportPoint;
  snapGrid: boolean;
  snapGridStep: number;
}

export interface SceneViewportPort {
  createInitialHistory(userId: string): SceneHistoryState;
  createHistoryFromScene(scene: AreaScene): SceneHistoryState;
  saveLocalDraft(userId: string, scene: AreaScene): void;
  commitHistory(history: SceneHistoryState, nextScene: AreaScene): SceneHistoryState;
  undoHistory(history: SceneHistoryState): SceneHistoryState;
  redoHistory(history: SceneHistoryState): SceneHistoryState;
  appendObjects(scene: AreaScene, objects: SceneObject[]): AreaScene;
  deleteObjectsByIds(scene: AreaScene, objectIds: string[]): AreaScene;
  deleteObjectById(scene: AreaScene, objectId: string): AreaScene;
  setExistingWaypointTagById(scene: AreaScene, objectId: string, tag: string): AreaScene;
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
  setExistingTriggerCorePropertiesById(
    scene: AreaScene,
    objectId: string,
    properties: TriggerCoreProperties,
  ): AreaScene;
  setExistingTriggerTrapPropertiesById(
    scene: AreaScene,
    objectId: string,
    properties: TriggerTrapProperties,
  ): AreaScene;
  setExistingTriggerVariablesById(
    scene: AreaScene,
    objectId: string,
    variables: readonly SceneObjectTriggerVariableTargetEntry[],
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
    input: SceneViewportPlaceablePropertiesInput
  ): AreaScene;
  setObjectsAbsoluteLocationByIds(
    scene: AreaScene,
    objectIds: string[],
    input: SceneViewportAbsoluteLocationInput
  ): AreaScene;
  setObjectsVisualTransformByIds(
    scene: AreaScene,
    objectIds: string[],
    input: SceneViewportVisualTransformInput
  ): AreaScene;
  restoreObjectsPlacementBySnapshots(scene: AreaScene, snapshots: SceneObject[]): AreaScene;
  translateObjectsByIds(
    scene: AreaScene,
    objectIds: string[],
    delta: SceneViewportTranslationDelta
  ): AreaScene;
  adjustObjectsHeightByIds(scene: AreaScene, objectIds: string[], deltaZ: number): AreaScene;
  rotateObjectsBearingByIds(
    scene: AreaScene,
    objectIds: string[],
    deltaBearingRad: number
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
  createObject(kind: SceneObjectKind, x: number, y: number, sequence: number): SceneObject;
  createDoorAtHook(scene: AreaScene, x: number, y: number, sequence: number): SceneObject | undefined;
  resolveCopyAnchor(params: SceneViewportCopyAnchorParams): SceneViewportPoint | null;
  computeCopyTranslation(
    params: SceneViewportCopyTranslationParams
  ): SceneViewportPoint | null;
  getSceneScale(width: number, height: number): number;
}

export function createSceneViewportPort(bundle: SceneFacadeBundle): SceneViewportPort {
  return {
    createInitialHistory(userId: string): SceneHistoryState {
      return bundle.canvas.createInitialHistory(userId);
    },
    createHistoryFromScene(scene: AreaScene): SceneHistoryState {
      return bundle.canvas.createHistoryFromScene(scene);
    },
    saveLocalDraft(userId: string, scene: AreaScene): void {
      bundle.canvas.saveLocalDraft(userId, scene);
    },
    commitHistory(history: SceneHistoryState, nextScene: AreaScene): SceneHistoryState {
      return bundle.history.commit(history, nextScene);
    },
    undoHistory(history: SceneHistoryState): SceneHistoryState {
      return bundle.history.undo(history);
    },
    redoHistory(history: SceneHistoryState): SceneHistoryState {
      return bundle.history.redo(history);
    },
    appendObjects(scene: AreaScene, objects: SceneObject[]): AreaScene {
      return bundle.mutations.appendObjects(scene, objects);
    },
    deleteObjectsByIds(scene: AreaScene, objectIds: string[]): AreaScene {
      return bundle.mutations.deleteObjectsByIds(scene, objectIds);
    },
    deleteObjectById(scene: AreaScene, objectId: string): AreaScene {
      return bundle.mutations.deleteObjectById(scene, objectId);
    },
    setExistingWaypointTagById(scene: AreaScene, objectId: string, tag: string): AreaScene {
      return bundle.mutations.setExistingWaypointTagById(scene, objectId, tag);
    },
    setExistingWaypointPropertiesById(
      scene: AreaScene,
      objectId: string,
      input: ExistingWaypointPropertiesInput,
    ): AreaScene {
      return bundle.mutations.setExistingWaypointPropertiesById(scene, objectId, input);
    },
    setExistingEncounterTemplateResRefById(
      scene: AreaScene,
      objectId: string,
      templateResRef: string,
    ): AreaScene {
      return bundle.mutations.setExistingEncounterTemplateResRefById(
        scene,
        objectId,
        templateResRef,
      );
    },
    setExistingTriggerTemplateResRefById(
      scene: AreaScene,
      objectId: string,
      templateResRef: string,
    ): AreaScene {
      return bundle.mutations.setExistingTriggerTemplateResRefById(
        scene,
        objectId,
        templateResRef,
      );
    },
    setExistingTriggerLocalizedNameById(
      scene: AreaScene,
      objectId: string,
      localizedName: string,
    ): AreaScene {
      return bundle.mutations.setExistingTriggerLocalizedNameById(
        scene,
        objectId,
        localizedName,
      );
    },
    setExistingTriggerEditorCommentById(
      scene: AreaScene,
      objectId: string,
      editorComment: string,
    ): AreaScene {
      return bundle.mutations.setExistingTriggerEditorCommentById(
        scene,
        objectId,
        editorComment,
      );
    },
    setExistingTriggerScriptResRefsById(
      scene: AreaScene,
      objectId: string,
      scripts: TriggerScriptResRefsStorage,
    ): AreaScene {
      return bundle.mutations.setExistingTriggerScriptResRefsById(
        scene,
        objectId,
        scripts,
      );
    },
    setExistingTriggerTransitionStorageById(
      scene: AreaScene,
      objectId: string,
      storage: TriggerTransitionStorage,
    ): AreaScene {
      return bundle.mutations.setExistingTriggerTransitionStorageById(
        scene,
        objectId,
        storage,
      );
    },
    setExistingTriggerCorePropertiesById(
      scene: AreaScene,
      objectId: string,
      properties: TriggerCoreProperties,
    ): AreaScene {
      return bundle.mutations.setExistingTriggerCorePropertiesById(
        scene,
        objectId,
        properties,
      );
    },
    setExistingTriggerTrapPropertiesById(
      scene: AreaScene,
      objectId: string,
      properties: TriggerTrapProperties,
    ): AreaScene {
      return bundle.mutations.setExistingTriggerTrapPropertiesById(
        scene,
        objectId,
        properties,
      );
    },
    setExistingTriggerVariablesById(
      scene: AreaScene,
      objectId: string,
      variables: readonly SceneObjectTriggerVariableTargetEntry[],
    ): AreaScene {
      return bundle.mutations.setExistingTriggerVariablesById(
        scene,
        objectId,
        variables,
      );
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
      if (encounterSpawnPoints !== undefined) {
        return bundle.mutations.setAreaObjectPolygonGeometryById(
          scene,
          objectId,
          geometry,
          tag,
          encounterActive,
          encounterPlayerOnly,
          encounterReset,
          encounterResetTime,
          encounterSpawnOption,
          encounterRespawns,
          encounterCreatureCounts,
          encounterScriptResRefs,
          encounterFactionId,
          encounterDifficulty,
          encounterLocalizedName,
          encounterEditorComment,
          encounterVariables,
          encounterCreatureList,
          encounterSpawnPoints,
        );
      }
      if (encounterCreatureList !== undefined) {
        return bundle.mutations.setAreaObjectPolygonGeometryById(
          scene,
          objectId,
          geometry,
          tag,
          encounterActive,
          encounterPlayerOnly,
          encounterReset,
          encounterResetTime,
          encounterSpawnOption,
          encounterRespawns,
          encounterCreatureCounts,
          encounterScriptResRefs,
          encounterFactionId,
          encounterDifficulty,
          encounterLocalizedName,
          encounterEditorComment,
          encounterVariables,
          encounterCreatureList,
        );
      }
      if (encounterVariables !== undefined) {
        return bundle.mutations.setAreaObjectPolygonGeometryById(
          scene,
          objectId,
          geometry,
          tag,
          encounterActive,
          encounterPlayerOnly,
          encounterReset,
          encounterResetTime,
          encounterSpawnOption,
          encounterRespawns,
          encounterCreatureCounts,
          encounterScriptResRefs,
          encounterFactionId,
          encounterDifficulty,
          encounterLocalizedName,
          encounterEditorComment,
          encounterVariables,
        );
      }
      if (encounterEditorComment !== undefined) {
        return bundle.mutations.setAreaObjectPolygonGeometryById(
          scene,
          objectId,
          geometry,
          tag,
          encounterActive,
          encounterPlayerOnly,
          encounterReset,
          encounterResetTime,
          encounterSpawnOption,
          encounterRespawns,
          encounterCreatureCounts,
          encounterScriptResRefs,
          encounterFactionId,
          encounterDifficulty,
          encounterLocalizedName,
          encounterEditorComment,
        );
      }
      if (encounterLocalizedName !== undefined) {
        return bundle.mutations.setAreaObjectPolygonGeometryById(
          scene,
          objectId,
          geometry,
          tag,
          encounterActive,
          encounterPlayerOnly,
          encounterReset,
          encounterResetTime,
          encounterSpawnOption,
          encounterRespawns,
          encounterCreatureCounts,
          encounterScriptResRefs,
          encounterFactionId,
          encounterDifficulty,
          encounterLocalizedName,
        );
      }
      if (encounterDifficulty !== undefined) {
        return bundle.mutations.setAreaObjectPolygonGeometryById(
          scene,
          objectId,
          geometry,
          tag,
          encounterActive,
          encounterPlayerOnly,
          encounterReset,
          encounterResetTime,
          encounterSpawnOption,
          encounterRespawns,
          encounterCreatureCounts,
          encounterScriptResRefs,
          encounterFactionId,
          encounterDifficulty,
        );
      }
      if (encounterFactionId !== undefined) {
        return bundle.mutations.setAreaObjectPolygonGeometryById(
          scene,
          objectId,
          geometry,
          tag,
          encounterActive,
          encounterPlayerOnly,
          encounterReset,
          encounterResetTime,
          encounterSpawnOption,
          encounterRespawns,
          encounterCreatureCounts,
          encounterScriptResRefs,
          encounterFactionId,
        );
      }
      if (encounterScriptResRefs !== undefined) {
        return bundle.mutations.setAreaObjectPolygonGeometryById(
          scene,
          objectId,
          geometry,
          tag,
          encounterActive,
          encounterPlayerOnly,
          encounterReset,
          encounterResetTime,
          encounterSpawnOption,
          encounterRespawns,
          encounterCreatureCounts,
          encounterScriptResRefs,
        );
      }
      if (encounterCreatureCounts !== undefined) {
        return bundle.mutations.setAreaObjectPolygonGeometryById(
          scene,
          objectId,
          geometry,
          tag,
          encounterActive,
          encounterPlayerOnly,
          encounterReset,
          encounterResetTime,
          encounterSpawnOption,
          encounterRespawns,
          encounterCreatureCounts,
        );
      }
      if (encounterRespawns !== undefined) {
        return bundle.mutations.setAreaObjectPolygonGeometryById(
          scene,
          objectId,
          geometry,
          tag,
          encounterActive,
          encounterPlayerOnly,
          encounterReset,
          encounterResetTime,
          encounterSpawnOption,
          encounterRespawns,
        );
      }
      if (encounterSpawnOption !== undefined) {
        return bundle.mutations.setAreaObjectPolygonGeometryById(
          scene,
          objectId,
          geometry,
          tag,
          encounterActive,
          encounterPlayerOnly,
          encounterReset,
          encounterResetTime,
          encounterSpawnOption,
        );
      }
      if (encounterResetTime !== undefined) {
        return bundle.mutations.setAreaObjectPolygonGeometryById(
          scene,
          objectId,
          geometry,
          tag,
          encounterActive,
          encounterPlayerOnly,
          encounterReset,
          encounterResetTime,
        );
      }
      if (encounterReset !== undefined) {
        return bundle.mutations.setAreaObjectPolygonGeometryById(
          scene,
          objectId,
          geometry,
          tag,
          encounterActive,
          encounterPlayerOnly,
          encounterReset,
        );
      }
      if (encounterPlayerOnly !== undefined) {
        return bundle.mutations.setAreaObjectPolygonGeometryById(
          scene,
          objectId,
          geometry,
          tag,
          encounterActive,
          encounterPlayerOnly,
        );
      }
      if (encounterActive !== undefined) {
        return bundle.mutations.setAreaObjectPolygonGeometryById(
          scene,
          objectId,
          geometry,
          tag,
          encounterActive,
        );
      }
      return tag === undefined
        ? bundle.mutations.setAreaObjectPolygonGeometryById(scene, objectId, geometry)
        : bundle.mutations.setAreaObjectPolygonGeometryById(scene, objectId, geometry, tag);
    },
    setPlaceablePropertiesByIds(
      scene: AreaScene,
      objectIds: string[],
      input: SceneViewportPlaceablePropertiesInput
    ): AreaScene {
      return bundle.mutations.setPlaceablePropertiesByIds(scene, objectIds, input);
    },
    setObjectsAbsoluteLocationByIds(
      scene: AreaScene,
      objectIds: string[],
      input: SceneViewportAbsoluteLocationInput
    ): AreaScene {
      return bundle.mutations.setObjectsAbsoluteLocationByIds(scene, objectIds, input);
    },
    setObjectsVisualTransformByIds(
      scene: AreaScene,
      objectIds: string[],
      input: SceneViewportVisualTransformInput
    ): AreaScene {
      return bundle.mutations.setObjectsVisualTransformByIds(scene, objectIds, input);
    },
    restoreObjectsPlacementBySnapshots(scene: AreaScene, snapshots: SceneObject[]): AreaScene {
      return bundle.mutations.restoreObjectsPlacementBySnapshots(scene, snapshots);
    },
    translateObjectsByIds(
      scene: AreaScene,
      objectIds: string[],
      delta: SceneViewportTranslationDelta
    ): AreaScene {
      return bundle.mutations.translateObjectsByIds(scene, objectIds, delta);
    },
    adjustObjectsHeightByIds(scene: AreaScene, objectIds: string[], deltaZ: number): AreaScene {
      return bundle.mutations.adjustObjectsHeightByIds(scene, objectIds, deltaZ);
    },
    rotateObjectsBearingByIds(
      scene: AreaScene,
      objectIds: string[],
      deltaBearingRad: number
    ): AreaScene {
      return bundle.mutations.rotateObjectsBearingByIds(scene, objectIds, deltaBearingRad);
    },
    updateTileTerrain(scene: AreaScene, tileId: string, terrain: TerrainBrushKind): AreaScene {
      return bundle.mutations.updateTileTerrain(scene, tileId, terrain);
    },
    applyAuroraAreaTerrainBrush(
      scene: AreaScene,
      tileId: string,
      terrain: string,
      selector?: AuroraAreaCandidateSelector
    ): AreaScene {
      return selector
        ? bundle.mutations.applyAuroraAreaTerrainBrush(scene, tileId, terrain, selector)
        : bundle.mutations.applyAuroraAreaTerrainBrush(scene, tileId, terrain);
    },
    placeAuroraAreaGroup(
      scene: AreaScene,
      tileId: string,
      groupId: string,
      orientation: 0 | 1 | 2 | 3,
      selector?: AuroraAreaCandidateSelector
    ): AreaScene {
      return selector
        ? bundle.mutations.placeAuroraAreaGroup(scene, tileId, groupId, orientation, selector)
        : bundle.mutations.placeAuroraAreaGroup(scene, tileId, groupId, orientation);
    },
    applyAuroraAreaCrosserBrush(scene, tileId, edge, crosser, selector) {
      return bundle.mutations.applyAuroraAreaCrosserBrush(scene, tileId, edge, crosser, selector);
    },
    applyAuroraAreaHeightBrush(scene, tileId, delta, selector) {
      return bundle.mutations.applyAuroraAreaHeightBrush(scene, tileId, delta, selector);
    },
    applyAuroraAreaEraser(scene: AreaScene, tileId: string): AreaScene {
      return bundle.mutations.applyAuroraAreaEraser(scene, tileId);
    },
    removeAuroraAreaGroup(scene: AreaScene, tileId: string): AreaScene {
      return bundle.mutations.removeAuroraAreaGroup(scene, tileId);
    },
    rotateAuroraAreaGroup(scene: AreaScene, tileId: string, delta: -1 | 1): AreaScene {
      return bundle.mutations.rotateAuroraAreaGroup(scene, tileId, delta);
    },
    changeAuroraAreaGroupHeight(
      scene: AreaScene,
      tileId: string,
      delta: -1 | 1
    ): AreaScene {
      return bundle.mutations.changeAuroraAreaGroupHeight(scene, tileId, delta);
    },
    resetObjectTransform(scene: AreaScene, objectId: string): AreaScene {
      return bundle.mutations.resetObjectTransform(scene, objectId);
    },
    createObject(kind: SceneObjectKind, x: number, y: number, sequence: number): SceneObject {
      return bundle.authoring.createObject(kind, x, y, sequence);
    },
    createDoorAtHook(scene: AreaScene, x: number, y: number, sequence: number): SceneObject | undefined {
      return bundle.authoring.createDoorAtHook(scene, x, y, sequence);
    },
    resolveCopyAnchor(params: SceneViewportCopyAnchorParams): SceneViewportPoint | null {
      return bundle.authoring.resolveCopyAnchor(params);
    },
    computeCopyTranslation(
      params: SceneViewportCopyTranslationParams
    ): SceneViewportPoint | null {
      return bundle.authoring.computeCopyTranslation(params);
    },
    getSceneScale(width: number, height: number): number {
      return bundle.authoring.getSceneScale(width, height);
    }
  };
}
