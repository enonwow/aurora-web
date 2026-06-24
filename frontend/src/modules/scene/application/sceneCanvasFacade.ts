import type {
  AreaScene,
  SceneSoundPropertiesModel,
  SceneHistoryState
} from "../contracts";
import {
  createBlankAreaScene,
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
import {
  normalizeWalkmeshPayload,
  validateWalkmeshDomainModel,
  type WalkmeshDomainModel
} from "../domain/walkmesh";
import { toSceneSoundPropertiesModel } from "../domain/sound";
import type { SceneDraftPort } from "../ports/sceneDraftPort";

interface SceneCanvasFacadeDependencies {
  draftPort: SceneDraftPort;
  now?: () => number;
}

export interface SceneCanvasFacade {
  createInitialHistory(userId: string): SceneHistoryState;
  createHistoryFromScene(scene: AreaScene): SceneHistoryState;
  saveLocalDraft(userId: string, scene: AreaScene): void;
  getSoundPropertiesById(scene: AreaScene, objectId: string): SceneSoundPropertiesModel | null;
}

const SCENE_OBJECT_MIN_Z = 0;
const LEGACY_SEED_SCENE_ID = "wnd_seed_builder_v1";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isWalkmeshDomainModelLike(value: unknown): value is WalkmeshDomainModel {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.schemaVersion === "number" &&
    Array.isArray(value.vertices) &&
    Array.isArray(value.triangles)
  );
}

function isLegacySeedDraft(draft: AreaScene, fallback: AreaScene): boolean {
  return (
    draft.sceneId === fallback.sceneId &&
    draft.width === LEGACY_SEED_SCENE_WIDTH_TILES &&
    draft.height === LEGACY_SEED_SCENE_HEIGHT_TILES
  );
}

function isLegacyStartupSeedDraft(draft: AreaScene): boolean {
  return draft.sceneId === LEGACY_SEED_SCENE_ID && draft.source === "seed";
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
  const normalizeWalkmesh = (): AreaScene => {
    const currentWalkmesh = scene.walkmesh;
    if (currentWalkmesh === undefined) {
      return scene;
    }

    if (
      isWalkmeshDomainModelLike(currentWalkmesh) &&
      validateWalkmeshDomainModel(currentWalkmesh).isValid
    ) {
      return scene;
    }

    const normalizedWalkmesh = normalizeWalkmeshPayload(currentWalkmesh).model;
    return {
      ...scene,
      walkmesh: normalizedWalkmesh
    };
  };

  const sceneWithWalkmesh = normalizeWalkmesh();
  let changed = false;
  const normalizedObjects = sceneWithWalkmesh.objects.map((object) => {
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
    return sceneWithWalkmesh;
  }
  return {
    ...sceneWithWalkmesh,
    objects: normalizedObjects
  };
}

export function createSceneCanvasFacade(
  dependencies: SceneCanvasFacadeDependencies
): SceneCanvasFacade {
  const now = dependencies.now ?? (() => Date.now());

  return {
    createInitialHistory(userId: string): SceneHistoryState {
      const fallback = createBlankAreaScene(
        DEFAULT_SEED_SCENE_WIDTH_TILES,
        DEFAULT_SEED_SCENE_HEIGHT_TILES,
        now()
      );
      const legacySeedFallback = createSeedAreaScene(
        LEGACY_SEED_SCENE_WIDTH_TILES,
        LEGACY_SEED_SCENE_HEIGHT_TILES
      );
      let draft: AreaScene | null = null;
      try {
        draft = dependencies.draftPort.loadByUserId(userId);
      } catch {
        return createSceneHistory(fallback);
      }
      if (!draft) {
        return createSceneHistory(fallback);
      }
      if (isLegacyStartupSeedDraft(draft)) {
        return createSceneHistory(fallback);
      }
      if (isLegacySeedDraft(draft, legacySeedFallback)) {
        return createSceneHistory(normalizeDraftVisualTransform(migrateLegacySeedDraft(draft, now)));
      }
      return createSceneHistory(normalizeDraftVisualTransform(draft));
    },
    createHistoryFromScene(scene: AreaScene): SceneHistoryState {
      return createSceneHistory(scene);
    },
    saveLocalDraft(userId: string, scene: AreaScene): void {
      dependencies.draftPort.saveByUserId(
        userId,
        normalizeDraftVisualTransform({
          ...scene,
          source: "local_draft"
        })
      );
    },
    getSoundPropertiesById(scene: AreaScene, objectId: string): SceneSoundPropertiesModel | null {
      const object = scene.objects.find((candidate) => candidate.id === objectId);
      if (!object) {
        return null;
      }
      return toSceneSoundPropertiesModel(object);
    }
  };
}
