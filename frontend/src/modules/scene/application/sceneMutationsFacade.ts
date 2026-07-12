import type {
  AreaScene,
  SceneObject,
  SceneSoundPropertiesModel,
  SceneObjectKind,
  SceneTile,
  TerrainBrushKind
} from "../contracts";
import { normalizeBearingRadians } from "../domain/bearing";
import {
  areSceneSoundPropertiesEqual,
  normalizeSceneSoundPropertiesInput,
  normalizeSoundPositioningPreservePayload,
  toSceneSoundPropertiesModel
} from "../domain/sound";
import {
  applyAuroraAreaCrosserBrush,
  applyAuroraAreaEraser,
  applyAuroraAreaHeightBrush,
  applyAuroraAreaTerrainBrush,
  changeAuroraAreaGroupHeightAtSceneTile,
  removeAuroraAreaGroupAtSceneTile,
  rotateAuroraAreaGroupAtSceneTile,
  placeAuroraAreaGroupAtSceneTile
} from "../domain/auroraAreaEditingSceneMapper";
import type { AuroraAreaCandidateSelector, AuroraAreaEdge } from "../domain/auroraAreaEditing";

export interface SceneObjectTranslationDelta {
  x: number;
  y: number;
}

export interface SceneObjectAbsoluteLocationInput {
  x: number;
  y: number;
  z: number;
  bearing: number;
}

export interface SceneObjectVisualTransformInput {
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

export interface SceneObjectPlaceablePropertiesInput {
  name: string;
  tag: string;
  resRef: string;
  isStatic: boolean;
}

export interface SceneMutationsFacade {
  appendObjects(scene: AreaScene, objects: SceneObject[]): AreaScene;
  deleteObjectsByIds(scene: AreaScene, objectIds: string[]): AreaScene;
  deleteObjectById(scene: AreaScene, objectId: string): AreaScene;
  setPlaceablePropertiesByIds(
    scene: AreaScene,
    objectIds: string[],
    input: SceneObjectPlaceablePropertiesInput
  ): AreaScene;
  getSoundPropertiesById(scene: AreaScene, objectId: string): SceneSoundPropertiesModel | null;
  setSoundPropertiesByIds(
    scene: AreaScene,
    objectIds: string[],
    input: SceneSoundPropertiesModel
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
  setObjectsAbsoluteLocationByIds(
    scene: AreaScene,
    objectIds: string[],
    input: SceneObjectAbsoluteLocationInput
  ): AreaScene;
  setObjectsVisualTransformByIds(
    scene: AreaScene,
    objectIds: string[],
    input: SceneObjectVisualTransformInput
  ): AreaScene;
  restoreObjectsPlacementBySnapshots(scene: AreaScene, snapshots: SceneObject[]): AreaScene;
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
  "encounters",
  "items",
  "sounds",
  "stores",
  "triggers",
  "waypoints"
]);
const VISUAL_TRANSFORM_OBJECT_KINDS = new Set<SceneObjectKind>([
  "creatures",
  "doors",
  "encounters",
  "items",
  "placeables",
  "sounds",
  "stores",
  "triggers",
  "waypoints"
]);

const SCENE_COORDINATE_MIN = 0;
const SCENE_COORDINATE_EPSILON = 1e-4;
const SCENE_VISUAL_SCALE_MIN = 0.01;

function clampNumber(value: number, min: number, max: number): number {
  if (min > max) {
    return min;
  }
  return Math.min(max, Math.max(min, value));
}

function normalizeVisualScale(value: number | undefined, fallback = 1): number {
  return Math.max(SCENE_VISUAL_SCALE_MIN, resolveFiniteNumber(value, fallback));
}

function resolveNextVisualScaleAxes(
  currentTransform: SceneObject["visualTransform"],
  input: SceneObjectVisualTransformInput,
  nextScale: number
): { scaleX: number; scaleY: number; scaleZ: number } {
  const currentScale = normalizeVisualScale(currentTransform.scale);
  const scaleFactor = currentScale > 0 ? nextScale / currentScale : nextScale;
  const resolveAxis = (
    inputAxis: number | undefined,
    currentAxis: number | undefined
  ): number => {
    if (inputAxis !== undefined) {
      return normalizeVisualScale(inputAxis);
    }
    return normalizeVisualScale(
      normalizeVisualScale(currentAxis ?? currentTransform.scale) * scaleFactor
    );
  };

  return {
    scaleX: resolveAxis(input.scaleX, currentTransform.scaleX),
    scaleY: resolveAxis(input.scaleY, currentTransform.scaleY),
    scaleZ: resolveAxis(input.scaleZ, currentTransform.scaleZ)
  };
}

function resolveFiniteNumber(value: number | undefined, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
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
  const nextX = clampNumber(resolveFiniteNumber(object.x, 0), SCENE_COORDINATE_MIN, maxX);
  const nextY = clampNumber(resolveFiniteNumber(object.y, 0), SCENE_COORDINATE_MIN, maxY);
  const nextZ = resolveFiniteNumber(
    object.z,
    resolveFiniteNumber(object.visualTransform.offsetZ, 0)
  );
  const nextBearing = normalizeBearingRadians(object.bearing);
  const rawOffsetZ = resolveFiniteNumber(object.visualTransform.offsetZ, 0);
  const nextOffsetZ = rawOffsetZ;
  const nextScale = normalizeVisualScale(object.visualTransform.scale);

  if (
    nextX === object.x &&
    nextY === object.y &&
    nextZ === object.z &&
    nextBearing === object.bearing &&
    nextOffsetZ === object.visualTransform.offsetZ &&
    nextScale === object.visualTransform.scale
  ) {
    return object;
  }

  return {
    ...object,
    x: nextX,
    y: nextY,
    z: nextZ,
    bearing: nextBearing,
    visualTransform: {
      ...object.visualTransform,
      scale: nextScale,
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

function resolveGenericTransformTargets(scene: AreaScene, objectIds: string[]): SceneObject[] {
  const targets = resolveMovableTargets(scene, objectIds);
  if (targets.length === 0) {
    return [];
  }
  // Aurora-first parity: generic world transforms (move/height/bearing) apply to placeables
  // regardless of Static flag. Static only gates visual-transform rendering channels.
  return targets;
}

function resolveVisualTransformTargets(scene: AreaScene, objectIds: string[]): SceneObject[] {
  if (objectIds.length === 0) {
    return [];
  }

  const idSet = new Set(objectIds);
  const targets = scene.objects.filter((object) => idSet.has(object.id));
  if (targets.length === 0) {
    return [];
  }

  if (targets.some((object) => !VISUAL_TRANSFORM_OBJECT_KINDS.has(object.kind))) {
    return [];
  }

  return targets;
}

function resolvePrimaryTarget(targets: SceneObject[], objectIds: string[]): SceneObject | null {
  if (targets.length === 0 || objectIds.length === 0) {
    return null;
  }

  const targetById = new Map(targets.map((object) => [object.id, object]));
  for (const objectId of objectIds) {
    const matched = targetById.get(objectId);
    if (matched) {
      return matched;
    }
  }

  return targets[0] ?? null;
}

export function createSceneMutationsFacade(): SceneMutationsFacade {
  return {
    appendObjects(scene: AreaScene, objects: SceneObject[]): AreaScene {
      if (objects.length === 0) {
        return scene;
      }
      const normalizedObjects = objects.map((object) =>
        normalizeObjectPlacement(scene, object)
      );
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
    setPlaceablePropertiesByIds(
      scene: AreaScene,
      objectIds: string[],
      input: SceneObjectPlaceablePropertiesInput
    ): AreaScene {
      if (objectIds.length === 0) {
        return scene;
      }

      const idSet = new Set(objectIds);
      if (!scene.objects.some((object) => idSet.has(object.id) && object.kind === "placeables")) {
        return scene;
      }

      const nextName = input.name.trim();
      const nextTag = input.tag.trim();
      const nextResRef = input.resRef.trim();
      const nextIsStatic = Boolean(input.isStatic);

      let changed = false;
      const nextObjects = scene.objects.map((object) => {
        if (!idSet.has(object.id) || object.kind !== "placeables") {
          return object;
        }

        const currentName = object.name ?? object.tag;
        const currentIsStatic = object.isStatic ?? true;
        if (
          currentName === nextName &&
          object.tag === nextTag &&
          object.resRef === nextResRef &&
          currentIsStatic === nextIsStatic
        ) {
          return object;
        }

        changed = true;
        return {
          ...object,
          name: nextName,
          tag: nextTag,
          resRef: nextResRef,
          isStatic: nextIsStatic
        };
      });

      if (!changed) {
        return scene;
      }
      return replaceSceneObjects(scene, nextObjects);
    },
    getSoundPropertiesById(scene: AreaScene, objectId: string): SceneSoundPropertiesModel | null {
      const sound = scene.objects.find((object) => object.id === objectId);
      if (!sound || sound.kind !== "sounds") {
        return null;
      }
      return toSceneSoundPropertiesModel(sound);
    },
    setSoundPropertiesByIds(
      scene: AreaScene,
      objectIds: string[],
      input: SceneSoundPropertiesModel
    ): AreaScene {
      if (objectIds.length === 0) {
        return scene;
      }
      const idSet = new Set(objectIds);
      if (!scene.objects.some((object) => idSet.has(object.id) && object.kind === "sounds")) {
        return scene;
      }

      const normalizedInput = normalizeSceneSoundPropertiesInput(input);
      let changed = false;
      const nextObjects = scene.objects.map((object) => {
        if (!idSet.has(object.id) || object.kind !== "sounds") {
          return object;
        }

        const currentModel = toSceneSoundPropertiesModel(object);
        if (currentModel && areSceneSoundPropertiesEqual(currentModel, normalizedInput)) {
          return object;
        }

        changed = true;
        const preserve = normalizeSoundPositioningPreservePayload({
          ...(object.soundPositioning?.preserve ?? {}),
          active: normalizedInput.active,
          whenToPlay: normalizedInput.whenToPlay,
          dayNight: normalizedInput.dayNight,
          hoursStart: normalizedInput.hoursStart,
          hoursEnd: normalizedInput.hoursEnd,
          playStyle: normalizedInput.playStyle,
          playOrder: normalizedInput.playOrder,
          intervalMs: normalizedInput.intervalMs,
          intervalVariationMs: normalizedInput.intervalVariationMs,
          volumeVariation: normalizedInput.volumeVariation,
          pitchVariation: normalizedInput.pitchVariation
        });

        return {
          ...object,
          name: normalizedInput.name,
          tag: normalizedInput.tag,
          resRef: normalizedInput.resRef,
          soundPositioning: {
            mode: normalizedInput.mode,
            elevation: normalizedInput.elevation,
            maxVolumeDistance: normalizedInput.maxVolumeDistance,
            cutoffDistance: normalizedInput.cutoffDistance,
            randomRangeWestEast: normalizedInput.randomRangeWestEast,
            randomRangeNorthSouth: normalizedInput.randomRangeNorthSouth,
            preserve
          }
        };
      });

      if (!changed) {
        return scene;
      }
      return replaceSceneObjects(scene, nextObjects);
    },
    applyAuroraAreaTerrainBrush(
      scene: AreaScene,
      tileId: string,
      terrain: string,
      selector?: AuroraAreaCandidateSelector
    ): AreaScene {
      return selector
        ? applyAuroraAreaTerrainBrush(scene, tileId, terrain, selector)
        : applyAuroraAreaTerrainBrush(scene, tileId, terrain);
    },
    placeAuroraAreaGroup(
      scene: AreaScene,
      tileId: string,
      groupId: string,
      orientation: 0 | 1 | 2 | 3,
      selector?: AuroraAreaCandidateSelector
    ): AreaScene {
      return selector
        ? placeAuroraAreaGroupAtSceneTile(scene, tileId, groupId, orientation, selector)
        : placeAuroraAreaGroupAtSceneTile(scene, tileId, groupId, orientation);
    },
    applyAuroraAreaCrosserBrush(scene, tileId, edge, crosser, selector) {
      return applyAuroraAreaCrosserBrush(scene, tileId, edge, crosser, selector);
    },
    applyAuroraAreaHeightBrush(scene, tileId, delta, selector) {
      return applyAuroraAreaHeightBrush(scene, tileId, delta, selector);
    },
    applyAuroraAreaEraser(scene: AreaScene, tileId: string): AreaScene {
      return applyAuroraAreaEraser(scene, tileId);
    },
    removeAuroraAreaGroup(scene: AreaScene, tileId: string): AreaScene {
      return removeAuroraAreaGroupAtSceneTile(scene, tileId);
    },
    rotateAuroraAreaGroup(scene: AreaScene, tileId: string, delta: -1 | 1): AreaScene {
      return rotateAuroraAreaGroupAtSceneTile(scene, tileId, delta);
    },
    changeAuroraAreaGroupHeight(
      scene: AreaScene,
      tileId: string,
      delta: -1 | 1
    ): AreaScene {
      return changeAuroraAreaGroupHeightAtSceneTile(scene, tileId, delta);
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
          object.visualTransform.scale !== 1 ||
          (object.visualTransform.scaleX ?? 1) !== 1 ||
          (object.visualTransform.scaleY ?? 1) !== 1 ||
          (object.visualTransform.scaleZ ?? 1) !== 1 ||
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
            scale: 1,
            scaleX: 1,
            scaleY: 1,
            scaleZ: 1,
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
    setObjectsAbsoluteLocationByIds(
      scene: AreaScene,
      objectIds: string[],
      input: SceneObjectAbsoluteLocationInput
    ): AreaScene {
      if (objectIds.length === 0) {
        return scene;
      }

      const targets = resolveMovableTargets(scene, objectIds);
      if (targets.length === 0) {
        return scene;
      }

      const primaryTarget = resolvePrimaryTarget(targets, objectIds);
      if (!primaryTarget) {
        return scene;
      }

      const maxX = resolveSceneCoordinateMax(scene.width);
      const maxY = resolveSceneCoordinateMax(scene.height);
      const requestedX = clampNumber(input.x, SCENE_COORDINATE_MIN, maxX);
      const requestedY = clampNumber(input.y, SCENE_COORDINATE_MIN, maxY);
      const requestedZ = resolveFiniteNumber(
        input.z,
        resolveFiniteNumber(primaryTarget.z, primaryTarget.visualTransform.offsetZ)
      );
      const requestedBearing = normalizeBearingRadians(input.bearing);
      const requestedDeltaX = requestedX - primaryTarget.x;
      const requestedDeltaY = requestedY - primaryTarget.y;
      const requestedDeltaZ =
        requestedZ - resolveFiniteNumber(primaryTarget.z, primaryTarget.visualTransform.offsetZ);
      const requestedDeltaBearing = requestedBearing - primaryTarget.bearing;

      const translationBounds = resolveTranslationBounds(scene, targets);
      const clampedDeltaX = clampDeltaToBounds(
        requestedDeltaX,
        translationBounds.minDeltaX,
        translationBounds.maxDeltaX
      );
      const clampedDeltaY = clampDeltaToBounds(
        requestedDeltaY,
        translationBounds.minDeltaY,
        translationBounds.maxDeltaY
      );
      const clampedDeltaZ = requestedDeltaZ;
      if (
        clampedDeltaX === 0 &&
        clampedDeltaY === 0 &&
        clampedDeltaZ === 0 &&
        requestedDeltaBearing === 0
      ) {
        return scene;
      }

      const idSet = new Set(targets.map((object) => object.id));
      let changed = false;

      const nextObjects = scene.objects.map((object) => {
        if (!idSet.has(object.id)) {
          return object;
        }
        const nextX = clampNumber(object.x + clampedDeltaX, SCENE_COORDINATE_MIN, maxX);
        const nextY = clampNumber(object.y + clampedDeltaY, SCENE_COORDINATE_MIN, maxY);
        const currentZ = resolveFiniteNumber(object.z, object.visualTransform.offsetZ);
        const nextZ = currentZ + clampedDeltaZ;
        const nextBearing = normalizeBearingRadians(object.bearing + requestedDeltaBearing);
        if (
          object.x === nextX &&
          object.y === nextY &&
          currentZ === nextZ &&
          object.bearing === nextBearing
        ) {
          return object;
        }
        changed = true;
        return {
          ...object,
          x: nextX,
          y: nextY,
          z: nextZ,
          bearing: nextBearing,
        };
      });

      if (!changed) {
        return scene;
      }
      return replaceSceneObjects(scene, nextObjects);
    },
    setObjectsVisualTransformByIds(
      scene: AreaScene,
      objectIds: string[],
      input: SceneObjectVisualTransformInput
    ): AreaScene {
      if (objectIds.length === 0) {
        return scene;
      }

      const targets = resolveVisualTransformTargets(scene, objectIds);
      if (targets.length === 0) {
        return scene;
      }

      const idSet = new Set(targets.map((object) => object.id));
      let changed = false;

      const nextObjects = scene.objects.map((object) => {
        if (!idSet.has(object.id)) {
          return object;
        }
        const nextScale = normalizeVisualScale(input.scale, object.visualTransform.scale);
        const nextScaleAxes = resolveNextVisualScaleAxes(
          object.visualTransform,
          input,
          nextScale
        );
        const nextOffsetZ = resolveFiniteNumber(input.offsetZ, object.visualTransform.offsetZ);
        if (
          object.visualTransform.scale === nextScale &&
          (object.visualTransform.scaleX ?? object.visualTransform.scale) === nextScaleAxes.scaleX &&
          (object.visualTransform.scaleY ?? object.visualTransform.scale) === nextScaleAxes.scaleY &&
          (object.visualTransform.scaleZ ?? object.visualTransform.scale) === nextScaleAxes.scaleZ &&
          object.visualTransform.offsetX === input.offsetX &&
          object.visualTransform.offsetY === input.offsetY &&
          object.visualTransform.offsetZ === nextOffsetZ &&
          object.visualTransform.pitch === input.pitch &&
          object.visualTransform.yaw === input.yaw &&
          object.visualTransform.roll === input.roll
        ) {
          return object;
        }
        changed = true;
        return {
          ...object,
          visualTransform: {
            ...object.visualTransform,
            scale: nextScale,
            scaleX: nextScaleAxes.scaleX,
            scaleY: nextScaleAxes.scaleY,
            scaleZ: nextScaleAxes.scaleZ,
            offsetX: input.offsetX,
            offsetY: input.offsetY,
            offsetZ: nextOffsetZ,
            pitch: input.pitch,
            yaw: input.yaw,
            roll: input.roll
          }
        };
      });

      if (!changed) {
        return scene;
      }
      return replaceSceneObjects(scene, nextObjects);
    },
    restoreObjectsPlacementBySnapshots(scene: AreaScene, snapshots: SceneObject[]): AreaScene {
      if (snapshots.length === 0) {
        return scene;
      }

      const snapshotById = new Map(snapshots.map((object) => [object.id, object]));
      const targets = resolveMovableTargets(scene, Array.from(snapshotById.keys()));
      if (targets.length === 0) {
        return scene;
      }

      const targetIdSet = new Set(targets.map((object) => object.id));
      let changed = false;
      const nextObjects = scene.objects.map((object) => {
        if (!targetIdSet.has(object.id)) {
          return object;
        }
        const snapshot = snapshotById.get(object.id);
        if (!snapshot) {
          return object;
        }
        if (
          object.x === snapshot.x &&
          object.y === snapshot.y &&
          object.z === snapshot.z &&
          object.bearing === snapshot.bearing &&
          object.visualTransform.scale === snapshot.visualTransform.scale &&
          (object.visualTransform.scaleX ?? object.visualTransform.scale) ===
            (snapshot.visualTransform.scaleX ?? snapshot.visualTransform.scale) &&
          (object.visualTransform.scaleY ?? object.visualTransform.scale) ===
            (snapshot.visualTransform.scaleY ?? snapshot.visualTransform.scale) &&
          (object.visualTransform.scaleZ ?? object.visualTransform.scale) ===
            (snapshot.visualTransform.scaleZ ?? snapshot.visualTransform.scale) &&
          object.visualTransform.offsetX === snapshot.visualTransform.offsetX &&
          object.visualTransform.offsetY === snapshot.visualTransform.offsetY &&
          object.visualTransform.offsetZ === snapshot.visualTransform.offsetZ &&
          object.visualTransform.pitch === snapshot.visualTransform.pitch &&
          object.visualTransform.yaw === snapshot.visualTransform.yaw &&
          object.visualTransform.roll === snapshot.visualTransform.roll
        ) {
          return object;
        }
        changed = true;
        return normalizeObjectPlacement(scene, {
          ...object,
          x: snapshot.x,
          y: snapshot.y,
          z: snapshot.z,
          bearing: snapshot.bearing,
          visualTransform: { ...snapshot.visualTransform }
        });
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

      const targets = resolveGenericTransformTargets(scene, objectIds);
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
      if (objectIds.length === 0 || deltaZ === 0 || !Number.isFinite(deltaZ)) {
        return scene;
      }

      const targets = resolveGenericTransformTargets(scene, objectIds);
      if (targets.length === 0) {
        return scene;
      }

      const clampedDeltaZ = deltaZ;
      if (clampedDeltaZ === 0) {
        return scene;
      }

      const idSet = new Set(targets.map((object) => object.id));
      let changed = false;
      const nextObjects = scene.objects.map((object) => {
        if (!idSet.has(object.id)) {
          return object;
        }
        const currentZ = resolveFiniteNumber(object.z, object.visualTransform.offsetZ);
        const nextZ = currentZ + clampedDeltaZ;
        if (nextZ === currentZ) {
          return object;
        }
        changed = true;
        return {
          ...object,
          z: nextZ
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

      const targets = resolveGenericTransformTargets(scene, objectIds);
      if (targets.length === 0) {
        return scene;
      }

      const idSet = new Set(targets.map((object) => object.id));
      let changed = false;
      const nextObjects = scene.objects.map((object) => {
        if (!idSet.has(object.id)) {
          return object;
        }
        const nextBearing = normalizeBearingRadians(object.bearing + deltaBearingRad);
        if (nextBearing === object.bearing) {
          return object;
        }
        changed = true;
        return {
          ...object,
          bearing: nextBearing
        };
      });
      if (!changed) {
        return scene;
      }
      return replaceSceneObjects(scene, nextObjects);
    }
  };
}
