import type {
  AreaScene,
  SceneObject,
  SceneObjectKind,
  SceneTile,
  TerrainBrushKind
} from "../contracts";

export interface SceneObjectTranslationDelta {
  x: number;
  y: number;
}

export interface SceneMutationsFacade {
  appendObjects(scene: AreaScene, objects: SceneObject[]): AreaScene;
  deleteObjectsByIds(scene: AreaScene, objectIds: string[]): AreaScene;
  deleteObjectById(scene: AreaScene, objectId: string): AreaScene;
  updateTileTerrain(scene: AreaScene, tileId: string, terrain: TerrainBrushKind): AreaScene;
  resetObjectTransform(scene: AreaScene, objectId: string): AreaScene;
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
  "items",
  "sounds"
]);

const SCENE_COORDINATE_MIN = 0;
const SCENE_COORDINATE_EPSILON = 1e-4;
const SCENE_OBJECT_MIN_OFFSET_Z = 0;

function clampNumber(value: number, min: number, max: number): number {
  if (min > max) {
    return min;
  }
  return Math.min(max, Math.max(min, value));
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
  const nextX = clampNumber(object.x, SCENE_COORDINATE_MIN, maxX);
  const nextY = clampNumber(object.y, SCENE_COORDINATE_MIN, maxY);
  const nextOffsetZ = Math.max(SCENE_OBJECT_MIN_OFFSET_Z, object.visualTransform.offsetZ);

  if (
    nextX === object.x &&
    nextY === object.y &&
    nextOffsetZ === object.visualTransform.offsetZ
  ) {
    return object;
  }

  return {
    ...object,
    x: nextX,
    y: nextY,
    visualTransform: {
      ...object.visualTransform,
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

export function createSceneMutationsFacade(): SceneMutationsFacade {
  return {
    appendObjects(scene: AreaScene, objects: SceneObject[]): AreaScene {
      if (objects.length === 0) {
        return scene;
      }
      const normalizedObjects = objects.map((object) => normalizeObjectPlacement(scene, object));
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

      const targets = resolveMovableTargets(scene, objectIds);
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
      if (objectIds.length === 0 || deltaZ === 0) {
        return scene;
      }

      const targets = resolveMovableTargets(scene, objectIds);
      if (targets.length === 0) {
        return scene;
      }

      const minDeltaZ = targets.reduce(
        (bound, object) => Math.max(bound, SCENE_OBJECT_MIN_OFFSET_Z - object.visualTransform.offsetZ),
        Number.NEGATIVE_INFINITY
      );
      const clampedDeltaZ =
        deltaZ < 0
          ? clampDeltaToBounds(deltaZ, minDeltaZ, Number.POSITIVE_INFINITY)
          : deltaZ;
      if (clampedDeltaZ === 0) {
        return scene;
      }

      const idSet = new Set(targets.map((object) => object.id));
      let changed = false;
      const nextObjects = scene.objects.map((object) => {
        if (!idSet.has(object.id)) {
          return object;
        }
        const nextOffsetZ = Math.max(
          SCENE_OBJECT_MIN_OFFSET_Z,
          object.visualTransform.offsetZ + clampedDeltaZ
        );
        if (nextOffsetZ === object.visualTransform.offsetZ) {
          return object;
        }
        changed = true;
        return {
          ...object,
          visualTransform: {
            ...object.visualTransform,
            offsetZ: nextOffsetZ
          }
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

      const targets = resolveMovableTargets(scene, objectIds);
      if (targets.length === 0) {
        return scene;
      }

      const idSet = new Set(targets.map((object) => object.id));
      const nextObjects = scene.objects.map((object) => {
        if (!idSet.has(object.id)) {
          return object;
        }
        return {
          ...object,
          bearing: object.bearing + deltaBearingRad
        };
      });
      return replaceSceneObjects(scene, nextObjects);
    }
  };
}
