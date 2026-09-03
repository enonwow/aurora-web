import type {
  AreaScene,
  SceneObject,
  SceneObjectKind
} from "../contracts";
import {
  computeCopyTranslationVector,
  resolveCopyAnchorPoint,
  type CopyPoint2D
} from "../domain/copyPlacement";
import {
  createNewDoorHookSceneObject,
  createNewSceneObject,
  createSeedAreaScene,
  LEGACY_SEED_SCENE_HEIGHT_TILES,
  LEGACY_SEED_SCENE_WIDTH_TILES
} from "../domain/sceneFactory";

interface CopyAnchorParams {
  cursorAnchor: CopyPoint2D | null;
  sourcePoints: CopyPoint2D[];
  fallbackOffset: number;
}

interface CopyTranslationParams {
  sourcePoints: CopyPoint2D[];
  anchor: CopyPoint2D;
  snapGrid: boolean;
  snapGridStep: number;
}

export interface SceneAuthoringFacade {
  createObject(kind: SceneObjectKind, x: number, y: number, sequence: number): SceneObject;
  createDoorAtHook(scene: AreaScene, x: number, y: number, sequence: number): SceneObject | undefined;
  resolveCopyAnchor(params: CopyAnchorParams): CopyPoint2D | null;
  computeCopyTranslation(params: CopyTranslationParams): CopyPoint2D | null;
  createSeedObjectsSnapshot(): SceneObject[];
  getSceneScale(width: number, height: number): number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function createSceneAuthoringFacade(): SceneAuthoringFacade {
  return {
    createObject(kind: SceneObjectKind, x: number, y: number, sequence: number): SceneObject {
      return createNewSceneObject(kind, x, y, sequence);
    },
    createDoorAtHook(scene: AreaScene, x: number, y: number, sequence: number): SceneObject | undefined {
      return createNewDoorHookSceneObject(scene, x, y, sequence);
    },
    resolveCopyAnchor(params: CopyAnchorParams): CopyPoint2D | null {
      return resolveCopyAnchorPoint(params);
    },
    computeCopyTranslation(params: CopyTranslationParams): CopyPoint2D | null {
      return computeCopyTranslationVector(params);
    },
    createSeedObjectsSnapshot(): SceneObject[] {
      return createSeedAreaScene().objects;
    },
    getSceneScale(width: number, height: number): number {
      return clamp(
        Math.min(
          width / LEGACY_SEED_SCENE_WIDTH_TILES,
          height / LEGACY_SEED_SCENE_HEIGHT_TILES
        ),
        0.08,
        1
      );
    }
  };
}
