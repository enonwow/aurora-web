import type {
  AreaScene,
  SceneObjectDoorTransitionPayload,
  SceneObject,
  SceneObjectPlaceableDisabledFlags,
  SceneObjectPlaceableProperties,
  SceneObjectPlaceableScriptSlots,
  SceneObjectSoundPositioningPreservePayload,
  SceneObjectSoundPositioning,
  SceneObjectVfxPreservePayload,
  ScenePreservePrimitive,
  SceneObjectKind,
  SceneTile,
  TerrainBrushKind
} from "../contracts";
import { createWalkmeshDomainModel } from "./walkmesh";

const TERRAIN_SEQUENCE: TerrainBrushKind[] = [
  "corridor",
  "doorway",
  "inn",
  "kitchen",
  "livingroom",
  "shop",
  "wall"
];

export const LEGACY_SEED_SCENE_WIDTH_TILES = 18;
export const LEGACY_SEED_SCENE_HEIGHT_TILES = 18;
export const DEFAULT_SEED_SCENE_WIDTH_TILES = 2;
export const DEFAULT_SEED_SCENE_HEIGHT_TILES = 2;

const DEFAULT_PLACEABLE_PROPERTIES: SceneObjectPlaceableProperties = {
  plot: false,
  useable: false,
  hasInventory: false
};

const DEFAULT_PLACEABLE_SCRIPT_SLOTS: SceneObjectPlaceableScriptSlots = {
  onClick: "",
  onClosed: "",
  onDamaged: "",
  onDeath: "",
  onHeartbeat: "",
  onInvDisturbed: "",
  onLock: "",
  onMeleeAttacked: "",
  onOpen: "",
  onSpellCastAt: "",
  onUnlock: "",
  onUsed: "",
  onUserDefined: ""
};

const DEFAULT_PLACEABLE_DISABLED_FLAGS: SceneObjectPlaceableDisabledFlags = {
  plot: true,
  useable: true,
  hasInventory: true
};

const DEFAULT_SOUND_POSITIONING_BASELINE: Omit<
  SceneObjectSoundPositioning,
  "elevation"
> = {
  mode: "specific",
  maxVolumeDistance: 8,
  cutoffDistance: 16,
  randomRangeWestEast: 0,
  randomRangeNorthSouth: 0
};

const DEFAULT_SOUND_POSITIONING_PRESERVE: SceneObjectSoundPositioningPreservePayload = {
  timeWindow: "",
  hourMask: "",
  intervalMs: 0,
  intervalVariationMs: 0,
  volume: 0,
  volumeVariation: 0,
  pitchVariation: 0,
  priority: 0,
  flags: {},
  extra: {}
};

const DEFAULT_VFX_PAYLOAD: SceneObjectVfxPreservePayload = {
  profile: "",
  emitter: "",
  script: "",
  flags: {},
  extra: {}
};

const SOUND_POSITIONING_MODES = new Set<SceneObjectSoundPositioning["mode"]>([
  "everywhere",
  "random",
  "specific"
]);

function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asString(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

function asFiniteNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function clampMin(value: number, min: number): number {
  return value < min ? min : value;
}

function isPreservePrimitive(value: unknown): value is ScenePreservePrimitive {
  return (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean" ||
    (typeof value === "number" && Number.isFinite(value))
  );
}

function normalizeDoorTransitionFlags(value: unknown): Record<string, boolean> {
  if (!isRecord(value)) {
    return {};
  }
  const normalized: Record<string, boolean> = {};
  Object.entries(value).forEach(([key, candidate]) => {
    if (typeof candidate === "boolean") {
      normalized[key] = candidate;
    }
  });
  return normalized;
}

function normalizePreserveBooleanMap(value: unknown): Record<string, boolean> {
  if (!isRecord(value)) {
    return {};
  }
  const normalized: Record<string, boolean> = {};
  Object.entries(value).forEach(([key, candidate]) => {
    if (typeof candidate === "boolean") {
      normalized[key] = candidate;
    }
  });
  return normalized;
}

function normalizePreservePrimitiveMap(
  value: unknown
): Record<string, ScenePreservePrimitive> {
  if (!isRecord(value)) {
    return {};
  }
  const normalized: Record<string, ScenePreservePrimitive> = {};
  Object.entries(value).forEach(([key, candidate]) => {
    if (isPreservePrimitive(candidate)) {
      normalized[key] = candidate;
    }
  });
  return normalized;
}

function normalizeSoundPositioningPreservePayload(
  value: unknown
): SceneObjectSoundPositioningPreservePayload | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  return {
    timeWindow: asString(value.timeWindow, DEFAULT_SOUND_POSITIONING_PRESERVE.timeWindow),
    hourMask: asString(value.hourMask, DEFAULT_SOUND_POSITIONING_PRESERVE.hourMask),
    intervalMs: asFiniteNumber(value.intervalMs, DEFAULT_SOUND_POSITIONING_PRESERVE.intervalMs),
    intervalVariationMs: asFiniteNumber(
      value.intervalVariationMs,
      DEFAULT_SOUND_POSITIONING_PRESERVE.intervalVariationMs
    ),
    volume: asFiniteNumber(value.volume, DEFAULT_SOUND_POSITIONING_PRESERVE.volume),
    volumeVariation: asFiniteNumber(
      value.volumeVariation,
      DEFAULT_SOUND_POSITIONING_PRESERVE.volumeVariation
    ),
    pitchVariation: asFiniteNumber(
      value.pitchVariation,
      DEFAULT_SOUND_POSITIONING_PRESERVE.pitchVariation
    ),
    priority: asFiniteNumber(value.priority, DEFAULT_SOUND_POSITIONING_PRESERVE.priority),
    flags: normalizePreserveBooleanMap(value.flags),
    extra: normalizePreservePrimitiveMap(value.extra)
  };
}

function normalizeVfxPayload(value: unknown): SceneObjectVfxPreservePayload | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  return {
    profile: asString(value.profile, DEFAULT_VFX_PAYLOAD.profile),
    emitter: asString(value.emitter, DEFAULT_VFX_PAYLOAD.emitter),
    script: asString(value.script, DEFAULT_VFX_PAYLOAD.script),
    flags: normalizePreserveBooleanMap(value.flags),
    extra: normalizePreservePrimitiveMap(value.extra)
  };
}

function areBooleanMapsEqual(left: Record<string, boolean>, right: Record<string, boolean>): boolean {
  const leftEntries = Object.entries(left);
  const rightEntries = Object.entries(right);
  if (leftEntries.length !== rightEntries.length) {
    return false;
  }
  return leftEntries.every(([key, value]) => right[key] === value);
}

function arePrimitiveMapsEqual(
  left: Record<string, ScenePreservePrimitive>,
  right: Record<string, ScenePreservePrimitive>
): boolean {
  const leftEntries = Object.entries(left);
  const rightEntries = Object.entries(right);
  if (leftEntries.length !== rightEntries.length) {
    return false;
  }
  return leftEntries.every(([key, value]) => right[key] === value);
}

function areSoundPositioningPreservePayloadEqual(
  left: SceneObjectSoundPositioningPreservePayload | undefined,
  right: SceneObjectSoundPositioningPreservePayload | undefined
): boolean {
  if (left === undefined || right === undefined) {
    return left === right;
  }
  return (
    left.timeWindow === right.timeWindow &&
    left.hourMask === right.hourMask &&
    left.intervalMs === right.intervalMs &&
    left.intervalVariationMs === right.intervalVariationMs &&
    left.volume === right.volume &&
    left.volumeVariation === right.volumeVariation &&
    left.pitchVariation === right.pitchVariation &&
    left.priority === right.priority &&
    areBooleanMapsEqual(left.flags, right.flags) &&
    arePrimitiveMapsEqual(left.extra, right.extra)
  );
}

function areVfxPayloadsEqual(
  left: SceneObjectVfxPreservePayload | undefined,
  right: SceneObjectVfxPreservePayload | undefined
): boolean {
  if (left === undefined || right === undefined) {
    return left === right;
  }
  return (
    left.profile === right.profile &&
    left.emitter === right.emitter &&
    left.script === right.script &&
    areBooleanMapsEqual(left.flags, right.flags) &&
    arePrimitiveMapsEqual(left.extra, right.extra)
  );
}

function areDoorTransitionFlagsEqual(
  left: Record<string, boolean>,
  right: Record<string, boolean>
): boolean {
  const leftEntries = Object.entries(left);
  const rightEntries = Object.entries(right);
  if (leftEntries.length !== rightEntries.length) {
    return false;
  }
  return leftEntries.every(([key, value]) => right[key] === value);
}

function isSoundPositioningMode(value: unknown): value is SceneObjectSoundPositioning["mode"] {
  return typeof value === "string" &&
    SOUND_POSITIONING_MODES.has(value as SceneObjectSoundPositioning["mode"]);
}

function terrainByIndex(index: number): TerrainBrushKind {
  return TERRAIN_SEQUENCE[index % TERRAIN_SEQUENCE.length];
}

function createTile(row: number, col: number): SceneTile {
  const id = `tile_${row}_${col}`;
  const sequenceIndex = (row * 17 + col * 31) % TERRAIN_SEQUENCE.length;
  return {
    id,
    row,
    col,
    terrain: terrainByIndex(sequenceIndex),
    orientation: ((row + col) % 4) as 0 | 1 | 2 | 3,
    rotateTexture: (row + col) % 2 === 0,
    plot: false
  };
}

function scaleCoordinate(value: number, from: number, to: number): number {
  if (from <= 0) {
    return value;
  }
  return (value / from) * to;
}

export function normalizeSceneObjectMetadata(object: SceneObject): SceneObject {
  const rawVfxPayload =
    (object.vfxPayload as Partial<Record<keyof SceneObjectVfxPreservePayload, unknown>> | undefined) ??
    undefined;
  const shouldNormalizeVfxPayload = isRecord(rawVfxPayload) || object.vfxPayload !== undefined;
  const nextVfxPayload: SceneObjectVfxPreservePayload | undefined = shouldNormalizeVfxPayload
    ? normalizeVfxPayload(rawVfxPayload) ?? { ...DEFAULT_VFX_PAYLOAD }
    : undefined;
  const hasVfxChanged = !areVfxPayloadsEqual(object.vfxPayload, nextVfxPayload);
  const normalizedObject = hasVfxChanged
    ? {
        ...object,
        vfxPayload: nextVfxPayload
      }
    : object;

  if (normalizedObject.kind === "placeables") {
    const rawPlaceableProperties =
      (normalizedObject.placeableProperties as
        | Partial<Record<keyof SceneObjectPlaceableProperties, unknown>>
        | undefined) ?? undefined;
    const hasRawScriptSlots = isRecord(rawPlaceableProperties?.scriptSlots);
    const hasRawDisabledFlags = isRecord(rawPlaceableProperties?.disabledFlags);
    const rawScriptSlots = hasRawScriptSlots
      ? (rawPlaceableProperties?.scriptSlots as Partial<
          Record<keyof SceneObjectPlaceableScriptSlots, unknown>
        >)
      : undefined;
    const rawDisabledFlags = hasRawDisabledFlags
      ? (rawPlaceableProperties?.disabledFlags as Partial<
          Record<keyof SceneObjectPlaceableDisabledFlags, unknown>
        >)
      : undefined;
    const currentPlaceableProperties = normalizedObject.placeableProperties;
    const shouldNormalizeScriptSlots =
      hasRawScriptSlots || currentPlaceableProperties?.scriptSlots !== undefined;
    const shouldNormalizeDisabledFlags =
      hasRawDisabledFlags || currentPlaceableProperties?.disabledFlags !== undefined;

    const nextScriptSlots: SceneObjectPlaceableScriptSlots | undefined = shouldNormalizeScriptSlots
      ? {
          onClick: asString(rawScriptSlots?.onClick, DEFAULT_PLACEABLE_SCRIPT_SLOTS.onClick),
          onClosed: asString(rawScriptSlots?.onClosed, DEFAULT_PLACEABLE_SCRIPT_SLOTS.onClosed),
          onDamaged: asString(rawScriptSlots?.onDamaged, DEFAULT_PLACEABLE_SCRIPT_SLOTS.onDamaged),
          onDeath: asString(rawScriptSlots?.onDeath, DEFAULT_PLACEABLE_SCRIPT_SLOTS.onDeath),
          onHeartbeat: asString(rawScriptSlots?.onHeartbeat, DEFAULT_PLACEABLE_SCRIPT_SLOTS.onHeartbeat),
          onInvDisturbed: asString(
            rawScriptSlots?.onInvDisturbed,
            DEFAULT_PLACEABLE_SCRIPT_SLOTS.onInvDisturbed
          ),
          onLock: asString(rawScriptSlots?.onLock, DEFAULT_PLACEABLE_SCRIPT_SLOTS.onLock),
          onMeleeAttacked: asString(
            rawScriptSlots?.onMeleeAttacked,
            DEFAULT_PLACEABLE_SCRIPT_SLOTS.onMeleeAttacked
          ),
          onOpen: asString(rawScriptSlots?.onOpen, DEFAULT_PLACEABLE_SCRIPT_SLOTS.onOpen),
          onSpellCastAt: asString(
            rawScriptSlots?.onSpellCastAt,
            DEFAULT_PLACEABLE_SCRIPT_SLOTS.onSpellCastAt
          ),
          onUnlock: asString(rawScriptSlots?.onUnlock, DEFAULT_PLACEABLE_SCRIPT_SLOTS.onUnlock),
          onUsed: asString(rawScriptSlots?.onUsed, DEFAULT_PLACEABLE_SCRIPT_SLOTS.onUsed),
          onUserDefined: asString(
            rawScriptSlots?.onUserDefined,
            DEFAULT_PLACEABLE_SCRIPT_SLOTS.onUserDefined
          )
        }
      : undefined;

    const nextDisabledFlags: SceneObjectPlaceableDisabledFlags | undefined =
      shouldNormalizeDisabledFlags
        ? {
            plot: isBoolean(rawDisabledFlags?.plot)
              ? rawDisabledFlags.plot
              : DEFAULT_PLACEABLE_DISABLED_FLAGS.plot,
            useable: isBoolean(rawDisabledFlags?.useable)
              ? rawDisabledFlags.useable
              : DEFAULT_PLACEABLE_DISABLED_FLAGS.useable,
            hasInventory: isBoolean(rawDisabledFlags?.hasInventory)
              ? rawDisabledFlags.hasInventory
              : DEFAULT_PLACEABLE_DISABLED_FLAGS.hasInventory
          }
        : undefined;

    const nextPlaceableProperties: SceneObjectPlaceableProperties = {
      plot: isBoolean(rawPlaceableProperties?.plot)
        ? rawPlaceableProperties.plot
        : DEFAULT_PLACEABLE_PROPERTIES.plot,
      useable: isBoolean(rawPlaceableProperties?.useable)
        ? rawPlaceableProperties.useable
        : DEFAULT_PLACEABLE_PROPERTIES.useable,
      hasInventory: isBoolean(rawPlaceableProperties?.hasInventory)
        ? rawPlaceableProperties.hasInventory
        : DEFAULT_PLACEABLE_PROPERTIES.hasInventory
    };
    if (nextScriptSlots !== undefined) {
      nextPlaceableProperties.scriptSlots = nextScriptSlots;
    }
    if (nextDisabledFlags !== undefined) {
      nextPlaceableProperties.disabledFlags = nextDisabledFlags;
    }

    const currentScriptSlots = currentPlaceableProperties?.scriptSlots;
    const currentDisabledFlags = currentPlaceableProperties?.disabledFlags;
    const isScriptSlotsUnchanged =
      nextScriptSlots === undefined
        ? currentScriptSlots === undefined
        : currentScriptSlots?.onClick === nextScriptSlots.onClick &&
          currentScriptSlots?.onClosed === nextScriptSlots.onClosed &&
          currentScriptSlots?.onDamaged === nextScriptSlots.onDamaged &&
          currentScriptSlots?.onDeath === nextScriptSlots.onDeath &&
          currentScriptSlots?.onHeartbeat === nextScriptSlots.onHeartbeat &&
          currentScriptSlots?.onInvDisturbed === nextScriptSlots.onInvDisturbed &&
          currentScriptSlots?.onLock === nextScriptSlots.onLock &&
          currentScriptSlots?.onMeleeAttacked === nextScriptSlots.onMeleeAttacked &&
          currentScriptSlots?.onOpen === nextScriptSlots.onOpen &&
          currentScriptSlots?.onSpellCastAt === nextScriptSlots.onSpellCastAt &&
          currentScriptSlots?.onUnlock === nextScriptSlots.onUnlock &&
          currentScriptSlots?.onUsed === nextScriptSlots.onUsed &&
          currentScriptSlots?.onUserDefined === nextScriptSlots.onUserDefined;
    const isDisabledFlagsUnchanged =
      nextDisabledFlags === undefined
        ? currentDisabledFlags === undefined
        : currentDisabledFlags?.plot === nextDisabledFlags.plot &&
          currentDisabledFlags?.useable === nextDisabledFlags.useable &&
          currentDisabledFlags?.hasInventory === nextDisabledFlags.hasInventory;

    if (
      currentPlaceableProperties?.plot === nextPlaceableProperties.plot &&
      currentPlaceableProperties?.useable === nextPlaceableProperties.useable &&
      currentPlaceableProperties?.hasInventory === nextPlaceableProperties.hasInventory &&
      isScriptSlotsUnchanged &&
      isDisabledFlagsUnchanged &&
      normalizedObject.soundPositioning === undefined
    ) {
      return normalizedObject;
    }

    return {
      ...normalizedObject,
      placeableProperties: nextPlaceableProperties,
      soundPositioning: undefined
    };
  }

  if (normalizedObject.kind === "doors") {
    const rawDoorTransition =
      (normalizedObject.doorTransition as
        | Partial<Record<keyof SceneObjectDoorTransitionPayload, unknown>>
        | undefined) ?? undefined;
    const shouldNormalizeDoorTransition = rawDoorTransition !== undefined;
    const nextDoorTransition: SceneObjectDoorTransitionPayload | undefined = shouldNormalizeDoorTransition
      ? {
          linkedTarget: asString(rawDoorTransition?.linkedTarget, ""),
          linkedModule: asString(rawDoorTransition?.linkedModule, ""),
          linkedTag: asString(rawDoorTransition?.linkedTag, ""),
          linkedWaypoint: asString(rawDoorTransition?.linkedWaypoint, ""),
          loadScreen: asString(rawDoorTransition?.loadScreen, ""),
          flags: normalizeDoorTransitionFlags(rawDoorTransition?.flags)
        }
      : undefined;
    const currentDoorTransition = normalizedObject.doorTransition;
    const isDoorTransitionUnchanged =
      nextDoorTransition === undefined
        ? currentDoorTransition === undefined
        : currentDoorTransition?.linkedTarget === nextDoorTransition.linkedTarget &&
          currentDoorTransition?.linkedModule === nextDoorTransition.linkedModule &&
          currentDoorTransition?.linkedTag === nextDoorTransition.linkedTag &&
          currentDoorTransition?.linkedWaypoint === nextDoorTransition.linkedWaypoint &&
          currentDoorTransition?.loadScreen === nextDoorTransition.loadScreen &&
          areDoorTransitionFlagsEqual(currentDoorTransition?.flags ?? {}, nextDoorTransition.flags);

    if (
      normalizedObject.placeableProperties === undefined &&
      normalizedObject.soundPositioning === undefined &&
      isDoorTransitionUnchanged
    ) {
      return normalizedObject;
    }

    return {
      ...normalizedObject,
      placeableProperties: undefined,
      soundPositioning: undefined,
      doorTransition: nextDoorTransition
    };
  }

  if (normalizedObject.kind === "sounds") {
    const rawSoundPositioning =
      (normalizedObject.soundPositioning as
        | Partial<Record<keyof SceneObjectSoundPositioning, unknown>>
        | undefined) ?? undefined;
    const nextMode: SceneObjectSoundPositioning["mode"] = isSoundPositioningMode(
      rawSoundPositioning?.mode
    )
      ? rawSoundPositioning.mode
      : DEFAULT_SOUND_POSITIONING_BASELINE.mode;
    const fallbackElevation = clampMin(asFiniteNumber(normalizedObject.z, 0), 0);
    const nextMaxVolumeDistance = clampMin(
      asFiniteNumber(
        rawSoundPositioning?.maxVolumeDistance,
        DEFAULT_SOUND_POSITIONING_BASELINE.maxVolumeDistance
      ),
      0
    );
    const nextCutoffDistanceBase = clampMin(
      asFiniteNumber(
        rawSoundPositioning?.cutoffDistance,
        DEFAULT_SOUND_POSITIONING_BASELINE.cutoffDistance
      ),
      0
    );
    const nextCutoffDistance = Math.max(nextCutoffDistanceBase, nextMaxVolumeDistance);
    const nextRandomRangeWestEast =
      nextMode === "random"
        ? clampMin(
            asFiniteNumber(
              rawSoundPositioning?.randomRangeWestEast,
              DEFAULT_SOUND_POSITIONING_BASELINE.randomRangeWestEast
            ),
            0
          )
        : 0;
    const nextRandomRangeNorthSouth =
      nextMode === "random"
        ? clampMin(
            asFiniteNumber(
              rawSoundPositioning?.randomRangeNorthSouth,
              DEFAULT_SOUND_POSITIONING_BASELINE.randomRangeNorthSouth
            ),
            0
          )
        : 0;
    const shouldNormalizePreservePayload =
      isRecord(rawSoundPositioning?.preserve) ||
      normalizedObject.soundPositioning?.preserve !== undefined;
    const nextPreservePayload: SceneObjectSoundPositioningPreservePayload | undefined =
      shouldNormalizePreservePayload
        ? normalizeSoundPositioningPreservePayload(rawSoundPositioning?.preserve) ?? {
            ...DEFAULT_SOUND_POSITIONING_PRESERVE
          }
        : undefined;
    const nextSoundPositioning: SceneObjectSoundPositioning = {
      mode: nextMode,
      elevation: clampMin(asFiniteNumber(rawSoundPositioning?.elevation, fallbackElevation), 0),
      maxVolumeDistance: nextMaxVolumeDistance,
      cutoffDistance: nextCutoffDistance,
      randomRangeWestEast: nextRandomRangeWestEast,
      randomRangeNorthSouth: nextRandomRangeNorthSouth
    };
    if (nextPreservePayload !== undefined) {
      nextSoundPositioning.preserve = nextPreservePayload;
    }
    const currentSoundPositioning = normalizedObject.soundPositioning;
    if (
      currentSoundPositioning?.mode === nextSoundPositioning.mode &&
      currentSoundPositioning?.elevation === nextSoundPositioning.elevation &&
      currentSoundPositioning?.maxVolumeDistance === nextSoundPositioning.maxVolumeDistance &&
      currentSoundPositioning?.cutoffDistance === nextSoundPositioning.cutoffDistance &&
      currentSoundPositioning?.randomRangeWestEast === nextSoundPositioning.randomRangeWestEast &&
      currentSoundPositioning?.randomRangeNorthSouth === nextSoundPositioning.randomRangeNorthSouth &&
      areSoundPositioningPreservePayloadEqual(
        currentSoundPositioning?.preserve,
        nextSoundPositioning.preserve
      ) &&
      normalizedObject.placeableProperties === undefined
    ) {
      return normalizedObject;
    }

    return {
      ...normalizedObject,
      placeableProperties: undefined,
      soundPositioning: nextSoundPositioning
    };
  }

  if (
    normalizedObject.placeableProperties === undefined &&
    normalizedObject.soundPositioning === undefined
  ) {
    return normalizedObject;
  }

  // Defensive cleanup for corrupted drafts where metadata ended up on unsupported kinds.
  // This keeps runtime behavior deterministic without changing public API contracts.
  return {
    ...normalizedObject,
    placeableProperties: undefined,
    soundPositioning: undefined
  };
}

export function rescaleSceneObjectsToSize(
  objects: SceneObject[],
  fromWidth: number,
  fromHeight: number,
  toWidth: number,
  toHeight: number
): SceneObject[] {
  return objects.map((object) =>
    normalizeSceneObjectMetadata({
      ...object,
      x: scaleCoordinate(object.x, fromWidth, toWidth),
      y: scaleCoordinate(object.y, fromHeight, toHeight)
    })
  );
}

function createSeedObjects(width: number, height: number): SceneObject[] {
  const seedObjects: Array<
    Omit<SceneObject, "visualTransform" | "bearing" | "tag" | "resRef" | "z"> & {
      resRef: string;
      tag: string;
      bearing?: number;
    }
  > = [
    { id: "plc_barrel_01", kind: "placeables", x: 3.2, y: 5.7, resRef: "plc_a01", tag: "PLC_BARREL_01" },
    { id: "plc_table_02", kind: "placeables", x: 6.6, y: 9.4, resRef: "plc_a02", tag: "PLC_TABLE_02" },
    { id: "plc_chair_03", kind: "placeables", x: 10.1, y: 8.1, resRef: "plc_x02", tag: "PLC_CHAIR_03" },
    { id: "plc_crate_04", kind: "placeables", x: 12.8, y: 13.4, resRef: "plc_a03", tag: "PLC_CRATE_04" },
    { id: "crt_devo_01", kind: "creatures", x: 8.4, y: 7.3, resRef: "nw_battdevour", tag: "CRT_DEVOURER_01" },
    { id: "crt_guard_02", kind: "creatures", x: 13.7, y: 6.4, resRef: "nw_hguard", tag: "CRT_GUARD_02" },
    { id: "dr_nw_01", kind: "doors", x: 1.5, y: 8.5, resRef: "nw_door_ttr_11", tag: "DOOR_WEST_01" },
    { id: "dr_nw_02", kind: "doors", x: 17.2, y: 9.1, resRef: "nw_door_ttr_11", tag: "DOOR_EAST_02" },
    { id: "itm_chest_01", kind: "items", x: 9.8, y: 4.7, resRef: "nw_it_mpotion001", tag: "ITEM_CHEST_01" },
    { id: "itm_sword_02", kind: "items", x: 14.2, y: 12.7, resRef: "nw_wswm001", tag: "ITEM_SWORD_02" },
    { id: "snd_amb_01", kind: "sounds", x: 5.1, y: 14.8, resRef: "as_amb_forest", tag: "SOUND_FOREST_01" },
    { id: "snd_amb_02", kind: "sounds", x: 15.4, y: 3.2, resRef: "as_amb_caves", tag: "SOUND_CAVES_02" }
  ];

  return seedObjects.map((entry) =>
    normalizeSceneObjectMetadata({
      ...entry,
      name: entry.tag,
      isStatic: entry.kind === "placeables",
      x: scaleCoordinate(entry.x, LEGACY_SEED_SCENE_WIDTH_TILES, width),
      y: scaleCoordinate(entry.y, LEGACY_SEED_SCENE_HEIGHT_TILES, height),
      z: 0,
      bearing: entry.bearing ?? 0,
      visualTransform: {
        scale: 1,
        offsetX: 0,
        offsetY: 0,
        offsetZ: 0,
        pitch: 0,
        roll: 0,
        yaw: 0
      }
    })
  );
}

export function createSeedAreaScene(
  width = DEFAULT_SEED_SCENE_WIDTH_TILES,
  height = DEFAULT_SEED_SCENE_HEIGHT_TILES
): AreaScene {
  const tiles: SceneTile[] = [];
  for (let row = 0; row < height; row += 1) {
    for (let col = 0; col < width; col += 1) {
      tiles.push(createTile(row, col));
    }
  }

  return {
    sceneId: "wnd_seed_builder_v1",
    areaName: "Seed Area (MVP Runtime)",
    width,
    height,
    tiles,
    objects: createSeedObjects(width, height),
    walkmesh: createWalkmeshDomainModel({}),
    updatedAtUnixMs: Date.now(),
    source: "seed"
  };
}

export function createNewSceneObject(
  kind: SceneObjectKind,
  x: number,
  y: number,
  sequence: number
): SceneObject {
  const index = String(sequence).padStart(3, "0");
  const baseResRefByKind: Record<SceneObjectKind, string> = {
    placeables: "plc_a01",
    creatures: "nw_hguard",
    doors: "nw_door_ttr_11",
    items: "nw_it_mpotion001",
    sounds: "as_amb_forest"
  };

  const key = kind.slice(0, 3);
  return normalizeSceneObjectMetadata({
    id: `${key}_${index}`,
    kind,
    name: `${kind.toUpperCase()}_${index}`,
    resRef: baseResRefByKind[kind],
    tag: `${kind.toUpperCase()}_${index}`,
    isStatic: kind === "placeables",
    x,
    y,
    z: 0,
    bearing: 0,
    visualTransform: {
      scale: 1,
      offsetX: 0,
      offsetY: 0,
      offsetZ: 0,
      pitch: 0,
      roll: 0,
      yaw: 0
    }
  });
}
