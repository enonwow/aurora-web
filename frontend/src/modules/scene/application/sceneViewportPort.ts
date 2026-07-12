import type {
  AreaScene,
  SceneHistoryState,
  SceneObject,
  SceneObjectKind,
  TerrainBrushKind
} from "../contracts";
import type { SceneFacadeBundle } from "./sceneFacadeBundle";
import type { AuroraAreaCandidateSelector, AuroraAreaEdge } from "../domain/auroraAreaEditing";

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
