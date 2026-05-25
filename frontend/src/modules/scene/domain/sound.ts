import type {
  SceneObject,
  SceneObjectSoundPositioning,
  SceneObjectSoundPositioningPreservePayload,
  ScenePreservePrimitive,
  SceneSoundDayNight,
  SceneSoundPlayOrder,
  SceneSoundPlayStyle,
  SceneSoundPositioningMode,
  SceneSoundPropertiesModel,
  SceneSoundWhenToPlay
} from "../contracts";

export const DEFAULT_SOUND_MODE: SceneSoundPositioningMode = "specific";
export const DEFAULT_SOUND_ELEVATION = 0;
export const DEFAULT_SOUND_MAX_VOLUME_DISTANCE = 1;
export const DEFAULT_SOUND_CUTOFF_DISTANCE = 10;
export const DEFAULT_SOUND_RANDOM_RANGE_WEST_EAST = 0;
export const DEFAULT_SOUND_RANDOM_RANGE_NORTH_SOUTH = 0;

export const DEFAULT_SOUND_ACTIVE = true;
export const DEFAULT_SOUND_WHEN_TO_PLAY: SceneSoundWhenToPlay = "always";
export const DEFAULT_SOUND_DAY_NIGHT: SceneSoundDayNight = "both";
export const DEFAULT_SOUND_HOURS_START = 0;
export const DEFAULT_SOUND_HOURS_END = 23;
export const DEFAULT_SOUND_PLAY_STYLE: SceneSoundPlayStyle = "repeat";
export const DEFAULT_SOUND_PLAY_ORDER: SceneSoundPlayOrder = "sequential";
export const DEFAULT_SOUND_INTERVAL_MS = 6000;
export const DEFAULT_SOUND_INTERVAL_VARIATION_MS = 0;
export const DEFAULT_SOUND_VOLUME = 1;
export const DEFAULT_SOUND_VOLUME_VARIATION = 0;
export const DEFAULT_SOUND_PITCH_VARIATION = 0;
export const DEFAULT_SOUND_PRIORITY = 0;

const SOUND_MODES = new Set<SceneSoundPositioningMode>(["everywhere", "random", "specific"]);
const SOUND_WHEN_TO_PLAY_MODES = new Set<SceneSoundWhenToPlay>(["always", "dayNight", "hours"]);
const SOUND_DAY_NIGHT_MODES = new Set<SceneSoundDayNight>(["both", "day", "night"]);
const SOUND_PLAY_STYLES = new Set<SceneSoundPlayStyle>(["once", "repeat", "loop"]);
const SOUND_PLAY_ORDERS = new Set<SceneSoundPlayOrder>(["sequential", "random"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asFiniteNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asString(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function clampMin(value: number, min: number): number {
  return value < min ? min : value;
}

function clampRange(value: number, min: number, max: number): number {
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return value;
}

function asSoundMode(value: unknown, fallback: SceneSoundPositioningMode): SceneSoundPositioningMode {
  return typeof value === "string" && SOUND_MODES.has(value as SceneSoundPositioningMode)
    ? (value as SceneSoundPositioningMode)
    : fallback;
}

function asWhenToPlay(value: unknown, fallback: SceneSoundWhenToPlay): SceneSoundWhenToPlay {
  return typeof value === "string" && SOUND_WHEN_TO_PLAY_MODES.has(value as SceneSoundWhenToPlay)
    ? (value as SceneSoundWhenToPlay)
    : fallback;
}

function asDayNight(value: unknown, fallback: SceneSoundDayNight): SceneSoundDayNight {
  return typeof value === "string" && SOUND_DAY_NIGHT_MODES.has(value as SceneSoundDayNight)
    ? (value as SceneSoundDayNight)
    : fallback;
}

function asPlayStyle(value: unknown, fallback: SceneSoundPlayStyle): SceneSoundPlayStyle {
  return typeof value === "string" && SOUND_PLAY_STYLES.has(value as SceneSoundPlayStyle)
    ? (value as SceneSoundPlayStyle)
    : fallback;
}

function asPlayOrder(value: unknown, fallback: SceneSoundPlayOrder): SceneSoundPlayOrder {
  return typeof value === "string" && SOUND_PLAY_ORDERS.has(value as SceneSoundPlayOrder)
    ? (value as SceneSoundPlayOrder)
    : fallback;
}

function isPreservePrimitive(value: unknown): value is ScenePreservePrimitive {
  return (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean" ||
    (typeof value === "number" && Number.isFinite(value))
  );
}

function normalizeBooleanMap(value: unknown): Record<string, boolean> {
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

function normalizePrimitiveMap(value: unknown): Record<string, ScenePreservePrimitive> {
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

export function createDefaultSoundPositioningPreservePayload(): SceneObjectSoundPositioningPreservePayload {
  return {
    timeWindow: "",
    hourMask: "",
    active: DEFAULT_SOUND_ACTIVE,
    whenToPlay: DEFAULT_SOUND_WHEN_TO_PLAY,
    dayNight: DEFAULT_SOUND_DAY_NIGHT,
    hoursStart: DEFAULT_SOUND_HOURS_START,
    hoursEnd: DEFAULT_SOUND_HOURS_END,
    playStyle: DEFAULT_SOUND_PLAY_STYLE,
    playOrder: DEFAULT_SOUND_PLAY_ORDER,
    intervalMs: DEFAULT_SOUND_INTERVAL_MS,
    intervalVariationMs: DEFAULT_SOUND_INTERVAL_VARIATION_MS,
    volume: DEFAULT_SOUND_VOLUME,
    volumeVariation: DEFAULT_SOUND_VOLUME_VARIATION,
    pitchVariation: DEFAULT_SOUND_PITCH_VARIATION,
    priority: DEFAULT_SOUND_PRIORITY,
    flags: {},
    extra: {}
  };
}

export function normalizeSoundPositioningPreservePayload(
  value: unknown
): SceneObjectSoundPositioningPreservePayload {
  const defaults = createDefaultSoundPositioningPreservePayload();
  const fallbackActive = defaults.active ?? DEFAULT_SOUND_ACTIVE;
  if (!isRecord(value)) {
    return defaults;
  }

  const intervalMs = clampMin(asFiniteNumber(value.intervalMs, defaults.intervalMs), 0);
  const intervalVariationMs = clampRange(
    asFiniteNumber(value.intervalVariationMs, defaults.intervalVariationMs),
    0,
    intervalMs
  );

  return {
    timeWindow: asString(value.timeWindow, defaults.timeWindow),
    hourMask: asString(value.hourMask, defaults.hourMask),
    active: asBoolean(value.active, fallbackActive),
    whenToPlay: asWhenToPlay(value.whenToPlay, defaults.whenToPlay ?? DEFAULT_SOUND_WHEN_TO_PLAY),
    dayNight: asDayNight(value.dayNight, defaults.dayNight ?? DEFAULT_SOUND_DAY_NIGHT),
    hoursStart: clampRange(
      Math.round(asFiniteNumber(value.hoursStart, defaults.hoursStart ?? DEFAULT_SOUND_HOURS_START)),
      0,
      23
    ),
    hoursEnd: clampRange(
      Math.round(asFiniteNumber(value.hoursEnd, defaults.hoursEnd ?? DEFAULT_SOUND_HOURS_END)),
      0,
      23
    ),
    playStyle: asPlayStyle(value.playStyle, defaults.playStyle ?? DEFAULT_SOUND_PLAY_STYLE),
    playOrder: asPlayOrder(value.playOrder, defaults.playOrder ?? DEFAULT_SOUND_PLAY_ORDER),
    intervalMs,
    intervalVariationMs,
    volume: clampMin(asFiniteNumber(value.volume, defaults.volume), 0),
    volumeVariation: clampRange(
      asFiniteNumber(value.volumeVariation, defaults.volumeVariation),
      0,
      1
    ),
    pitchVariation: clampRange(
      asFiniteNumber(value.pitchVariation, defaults.pitchVariation),
      0,
      1
    ),
    priority: Math.round(clampMin(asFiniteNumber(value.priority, defaults.priority), 0)),
    flags: normalizeBooleanMap(value.flags),
    extra: normalizePrimitiveMap(value.extra)
  };
}

export function normalizeSoundPositioning(
  raw: Partial<Record<keyof SceneObjectSoundPositioning, unknown>> | undefined,
  fallbackElevation: number
): SceneObjectSoundPositioning {
  const mode = asSoundMode(raw?.mode, DEFAULT_SOUND_MODE);
  const maxVolumeDistance = clampMin(
    asFiniteNumber(raw?.maxVolumeDistance, DEFAULT_SOUND_MAX_VOLUME_DISTANCE),
    0
  );
  const cutoffDistance = Math.max(
    clampMin(asFiniteNumber(raw?.cutoffDistance, DEFAULT_SOUND_CUTOFF_DISTANCE), 0),
    maxVolumeDistance
  );

  return {
    mode,
    elevation: clampMin(asFiniteNumber(raw?.elevation, fallbackElevation), 0),
    maxVolumeDistance,
    cutoffDistance,
    randomRangeWestEast:
      mode === "random"
        ? clampMin(asFiniteNumber(raw?.randomRangeWestEast, DEFAULT_SOUND_RANDOM_RANGE_WEST_EAST), 0)
        : 0,
    randomRangeNorthSouth:
      mode === "random"
        ? clampMin(
            asFiniteNumber(raw?.randomRangeNorthSouth, DEFAULT_SOUND_RANDOM_RANGE_NORTH_SOUTH),
            0
          )
        : 0
  };
}

export function toSceneSoundPropertiesModel(object: SceneObject): SceneSoundPropertiesModel | null {
  if (object.kind !== "sounds") {
    return null;
  }
  const fallbackElevation = clampMin(asFiniteNumber(object.z, DEFAULT_SOUND_ELEVATION), 0);
  const positioning = normalizeSoundPositioning(
    object.soundPositioning as Partial<Record<keyof SceneObjectSoundPositioning, unknown>> | undefined,
    fallbackElevation
  );
  const preserve = normalizeSoundPositioningPreservePayload(object.soundPositioning?.preserve);

  return {
    name: object.name ?? object.tag,
    tag: object.tag,
    resRef: object.resRef,
    mode: positioning.mode,
    elevation: positioning.elevation,
    maxVolumeDistance: positioning.maxVolumeDistance,
    cutoffDistance: positioning.cutoffDistance,
    randomRangeWestEast: positioning.randomRangeWestEast,
    randomRangeNorthSouth: positioning.randomRangeNorthSouth,
    active: preserve.active ?? DEFAULT_SOUND_ACTIVE,
    whenToPlay: preserve.whenToPlay ?? DEFAULT_SOUND_WHEN_TO_PLAY,
    dayNight: preserve.dayNight ?? DEFAULT_SOUND_DAY_NIGHT,
    hoursStart: preserve.hoursStart ?? DEFAULT_SOUND_HOURS_START,
    hoursEnd: preserve.hoursEnd ?? DEFAULT_SOUND_HOURS_END,
    playStyle: preserve.playStyle ?? DEFAULT_SOUND_PLAY_STYLE,
    playOrder: preserve.playOrder ?? DEFAULT_SOUND_PLAY_ORDER,
    intervalMs: preserve.intervalMs,
    intervalVariationMs: preserve.intervalVariationMs,
    volumeVariation: preserve.volumeVariation,
    pitchVariation: preserve.pitchVariation
  };
}

export function normalizeSceneSoundPropertiesInput(
  input: SceneSoundPropertiesModel
): SceneSoundPropertiesModel {
  const preserve = normalizeSoundPositioningPreservePayload({
    active: input.active,
    whenToPlay: input.whenToPlay,
    dayNight: input.dayNight,
    hoursStart: input.hoursStart,
    hoursEnd: input.hoursEnd,
    playStyle: input.playStyle,
    playOrder: input.playOrder,
    intervalMs: input.intervalMs,
    intervalVariationMs: input.intervalVariationMs,
    volumeVariation: input.volumeVariation,
    pitchVariation: input.pitchVariation
  });
  const positioning = normalizeSoundPositioning(
    {
      mode: input.mode,
      elevation: input.elevation,
      maxVolumeDistance: input.maxVolumeDistance,
      cutoffDistance: input.cutoffDistance,
      randomRangeWestEast: input.randomRangeWestEast,
      randomRangeNorthSouth: input.randomRangeNorthSouth
    },
    DEFAULT_SOUND_ELEVATION
  );

  return {
    name: input.name.trim(),
    tag: input.tag.trim(),
    resRef: input.resRef.trim(),
    mode: positioning.mode,
    elevation: positioning.elevation,
    maxVolumeDistance: positioning.maxVolumeDistance,
    cutoffDistance: positioning.cutoffDistance,
    randomRangeWestEast: positioning.randomRangeWestEast,
    randomRangeNorthSouth: positioning.randomRangeNorthSouth,
    active: preserve.active ?? DEFAULT_SOUND_ACTIVE,
    whenToPlay: preserve.whenToPlay ?? DEFAULT_SOUND_WHEN_TO_PLAY,
    dayNight: preserve.dayNight ?? DEFAULT_SOUND_DAY_NIGHT,
    hoursStart: preserve.hoursStart ?? DEFAULT_SOUND_HOURS_START,
    hoursEnd: preserve.hoursEnd ?? DEFAULT_SOUND_HOURS_END,
    playStyle: preserve.playStyle ?? DEFAULT_SOUND_PLAY_STYLE,
    playOrder: preserve.playOrder ?? DEFAULT_SOUND_PLAY_ORDER,
    intervalMs: preserve.intervalMs,
    intervalVariationMs: preserve.intervalVariationMs,
    volumeVariation: preserve.volumeVariation,
    pitchVariation: preserve.pitchVariation
  };
}

export function areSceneSoundPropertiesEqual(
  left: SceneSoundPropertiesModel,
  right: SceneSoundPropertiesModel
): boolean {
  return (
    left.name === right.name &&
    left.tag === right.tag &&
    left.resRef === right.resRef &&
    left.mode === right.mode &&
    left.elevation === right.elevation &&
    left.maxVolumeDistance === right.maxVolumeDistance &&
    left.cutoffDistance === right.cutoffDistance &&
    left.randomRangeWestEast === right.randomRangeWestEast &&
    left.randomRangeNorthSouth === right.randomRangeNorthSouth &&
    left.active === right.active &&
    left.whenToPlay === right.whenToPlay &&
    left.dayNight === right.dayNight &&
    left.hoursStart === right.hoursStart &&
    left.hoursEnd === right.hoursEnd &&
    left.playStyle === right.playStyle &&
    left.playOrder === right.playOrder &&
    left.intervalMs === right.intervalMs &&
    left.intervalVariationMs === right.intervalVariationMs &&
    left.volumeVariation === right.volumeVariation &&
    left.pitchVariation === right.pitchVariation
  );
}
