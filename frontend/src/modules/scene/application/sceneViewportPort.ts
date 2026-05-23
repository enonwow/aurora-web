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
  translateObjectsByIds(
    scene: AreaScene,
    objectIds: string[],
    delta: SceneViewportTranslationDelta
  ): AreaScene;
  adjustObjectsHeightByIds(scene: AreaScene, objectIds: string[], deltaZ: number): AreaScene;
  rotateObjectsPitchByIds(
    scene: AreaScene,
    objectIds: string[],
    deltaPitchRad: number
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
    rotateObjectsPitchByIds(
      scene: AreaScene,
      objectIds: string[],
      deltaPitchRad: number
    ): AreaScene {
      return bundle.mutations.rotateObjectsPitchByIds(scene, objectIds, deltaPitchRad);
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
