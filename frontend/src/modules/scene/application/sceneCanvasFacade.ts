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
    const currentScale = object.visualTransform.scale;
    const nextScale =
      typeof currentScale === "number" && Number.isFinite(currentScale) && currentScale > 0
        ? currentScale
        : 1;
    const nextBearing = normalizeBearingRadians(object.bearing);
    if (nextScale === currentScale && nextBearing === object.bearing) {
      return object;
    }
    changed = true;
    return {
      ...object,
      bearing: nextBearing,
      visualTransform: {
        ...object.visualTransform,
        scale: nextScale
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
      dependencies.draftPort.saveByUserId(userId, scene);
    }
  };
}
