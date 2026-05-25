import type {
  AreaScene,
  SceneHistoryState
} from "../contracts";
import {
  createSeedAreaScene,
  DEFAULT_SEED_SCENE_HEIGHT_TILES,
  DEFAULT_SEED_SCENE_WIDTH_TILES,
  LEGACY_SEED_SCENE_HEIGHT_TILES,
  LEGACY_SEED_SCENE_WIDTH_TILES,
  normalizeSceneObjectMetadata,
  rescaleSceneObjectsToSize
} from "../domain/sceneFactory";
import { normalizeBearingRadians } from "../domain/bearing";
import { createSceneHistory } from "../domain/sceneHistory";
import type { SceneDraftPort } from "../ports/sceneDraftPort";

interface SceneCanvasFacadeDependencies {
  draftPort: SceneDraftPort;
  now?: () => number;
}

export interface SceneCanvasFacade {
  createInitialHistory(userId: string): SceneHistoryState;
  saveLocalDraft(userId: string, scene: AreaScene): void;
}

const SCENE_OBJECT_MIN_Z = 0;

function isLegacySeedDraft(draft: AreaScene, fallback: AreaScene): boolean {
  return (
    draft.sceneId === fallback.sceneId &&
    draft.width === LEGACY_SEED_SCENE_WIDTH_TILES &&
    draft.height === LEGACY_SEED_SCENE_HEIGHT_TILES
  );
}

function migrateLegacySeedDraft(draft: AreaScene, now: () => number): AreaScene {
  const migratedSeed = createSeedAreaScene(
    DEFAULT_SEED_SCENE_WIDTH_TILES,
    DEFAULT_SEED_SCENE_HEIGHT_TILES
  );
  return {
    ...draft,
    width: migratedSeed.width,
    height: migratedSeed.height,
    tiles: migratedSeed.tiles,
    objects: rescaleSceneObjectsToSize(
      draft.objects,
      draft.width,
      draft.height,
      migratedSeed.width,
      migratedSeed.height
    ),
    updatedAtUnixMs: now()
  };
}

function normalizeDraftVisualTransform(scene: AreaScene): AreaScene {
  let changed = false;
  const normalizedObjects = scene.objects.map((object) => {
    const withMetadata = normalizeSceneObjectMetadata(object);
    const hasNormalizedZ = Number.isFinite(withMetadata.z);
    const nextZ = Math.max(
      SCENE_OBJECT_MIN_Z,
      hasNormalizedZ ? withMetadata.z : withMetadata.visualTransform.offsetZ
    );
    const nextOffsetZ = hasNormalizedZ
      ? Math.max(SCENE_OBJECT_MIN_Z, withMetadata.visualTransform.offsetZ)
      : 0;
    const currentScale = object.visualTransform.scale;
    const nextScale =
      typeof currentScale === "number" && Number.isFinite(currentScale) && currentScale > 0
        ? currentScale
        : 1;
    const nextBearing = normalizeBearingRadians(object.bearing);
    if (
      nextZ === withMetadata.z &&
      nextScale === currentScale &&
      nextBearing === object.bearing &&
      nextOffsetZ === withMetadata.visualTransform.offsetZ &&
      withMetadata === object
    ) {
      return object;
    }
    changed = true;
    return {
      ...withMetadata,
      z: nextZ,
      bearing: nextBearing,
      visualTransform: {
        ...withMetadata.visualTransform,
        scale: nextScale,
        offsetZ: nextOffsetZ
      }
    };
  });

  if (!changed) {
    return scene;
  }
  return {
    ...scene,
    objects: normalizedObjects
  };
}

export function createSceneCanvasFacade(
  dependencies: SceneCanvasFacadeDependencies
): SceneCanvasFacade {
  const now = dependencies.now ?? (() => Date.now());

  return {
    createInitialHistory(userId: string): SceneHistoryState {
      const fallback = createSeedAreaScene();
      let draft: AreaScene | null = null;
      try {
        draft = dependencies.draftPort.loadByUserId(userId);
      } catch {
        return createSceneHistory(fallback);
      }
      if (!draft) {
        return createSceneHistory(fallback);
      }
      if (isLegacySeedDraft(draft, fallback)) {
        return createSceneHistory(normalizeDraftVisualTransform(migrateLegacySeedDraft(draft, now)));
      }
      return createSceneHistory(normalizeDraftVisualTransform(draft));
    },
    saveLocalDraft(userId: string, scene: AreaScene): void {
      dependencies.draftPort.saveByUserId(userId, normalizeDraftVisualTransform(scene));
    }
  };
}
