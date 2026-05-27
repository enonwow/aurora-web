import type {
  AreaScene,
  SceneHistoryState,
  SceneObject,
  SceneObjectKind,
  TerrainBrushKind
} from "../contracts";
import type { SceneFacadeBundle } from "./sceneFacadeBundle";

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
  saveLocalDraft(userId: string, scene: AreaScene): void;
  commitHistory(history: SceneHistoryState, nextScene: AreaScene): SceneHistoryState;
  undoHistory(history: SceneHistoryState): SceneHistoryState;
  redoHistory(history: SceneHistoryState): SceneHistoryState;
  appendObjects(scene: AreaScene, objects: SceneObject[]): AreaScene;
  deleteObjectsByIds(scene: AreaScene, objectIds: string[]): AreaScene;
  deleteObjectById(scene: AreaScene, objectId: string): AreaScene;
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
  resetObjectTransform(scene: AreaScene, objectId: string): AreaScene;
  createObject(kind: SceneObjectKind, x: number, y: number, sequence: number): SceneObject;
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
    resetObjectTransform(scene: AreaScene, objectId: string): AreaScene {
      return bundle.mutations.resetObjectTransform(scene, objectId);
    },
    createObject(kind: SceneObjectKind, x: number, y: number, sequence: number): SceneObject {
      return bundle.authoring.createObject(kind, x, y, sequence);
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
