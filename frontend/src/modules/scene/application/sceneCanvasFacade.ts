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
} from "../sceneFactory";
import { createSceneHistory } from "../sceneHistory";
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
        return createSceneHistory(migrateLegacySeedDraft(draft, now));
      }
      return createSceneHistory(draft);
    },
    saveLocalDraft(userId: string, scene: AreaScene): void {
      dependencies.draftPort.saveByUserId(userId, scene);
    }
  };
}
