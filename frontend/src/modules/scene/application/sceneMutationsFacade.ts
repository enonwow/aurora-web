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
}

const MOVABLE_OBJECT_KINDS = new Set<SceneObjectKind>([
  "placeables",
  "creatures",
  "items",
  "sounds"
]);

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

export function createSceneMutationsFacade(): SceneMutationsFacade {
  return {
    appendObjects(scene: AreaScene, objects: SceneObject[]): AreaScene {
      if (objects.length === 0) {
        return scene;
      }
      return replaceSceneObjects(scene, [...scene.objects, ...objects]);
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

      const idSet = new Set(objectIds);
      const targets = scene.objects.filter((object) => idSet.has(object.id));
      if (targets.length === 0) {
        return scene;
      }

      // Aurora First: doors are anchor-bound and cannot be moved with generic object transforms.
      if (targets.some((object) => object.kind === "doors")) {
        return scene;
      }

      if (targets.some((object) => !MOVABLE_OBJECT_KINDS.has(object.kind))) {
        return scene;
      }

      const nextObjects = scene.objects.map((object) => {
        if (!idSet.has(object.id)) {
          return object;
        }
        return {
          ...object,
          x: object.x + delta.x,
          y: object.y + delta.y
        };
      });
      return replaceSceneObjects(scene, nextObjects);
    }
  };
}
