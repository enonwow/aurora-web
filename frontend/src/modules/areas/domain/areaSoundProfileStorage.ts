import {
  deriveAreaSoundPriorityByte,
  type AreaSoundPlayStyle,
} from "./areaSoundPlayStyleStorage";
import { isAreaSoundResRef } from "./areaSoundPlaybackStorage";

export const AREA_SOUND_PROFILE_STORAGE_REVISION =
  "aurora-area-sound-profile-storage.v1" as const;
export const MAX_AREA_SOUND_PROFILE_LIST_ENTRIES = 1024;
export const MIN_AREA_SOUND_MAX_DISTANCE_FLOAT32 = Math.fround(0.2);
export const MAX_AREA_SOUND_SPATIAL_FLOAT32 = Math.fround(320);
export const MIN_AREA_SOUND_ELEVATION_FLOAT32 = Math.fround(-10);
export const MAX_AREA_SOUND_ELEVATION_FLOAT32 = Math.fround(10);

const STORAGE_KEYS = Object.freeze([
  "sounds", "loopingByte", "continuousByte", "priorityByte", "positionalByte",
  "randomPositionByte", "elevationFloat32", "maxDistanceFloat32",
  "minDistanceFloat32", "randomRangeXFloat32", "randomRangeYFloat32",
  "intervalDword", "intervalVariationDword",
]);
const PRESENTATION_KEYS = Object.freeze([
  "sounds", "playStyle", "mode", "elevation", "cutoffDistance",
  "maxVolumeDistance", "randomRangeWestEast", "randomRangeNorthSouth",
]);

export type AreaSoundPositioningMode = "everywhere" | "random" | "specific";

export interface AreaSoundProfileStorage {
  readonly sounds: readonly string[];
  readonly loopingByte: 0 | 1;
  readonly continuousByte: 0 | 1;
  readonly priorityByte: 2 | 3 | 19 | 20;
  readonly positionalByte: 0 | 1;
  readonly randomPositionByte: 0 | 1;
  readonly elevationFloat32: number;
  readonly maxDistanceFloat32: number;
  readonly minDistanceFloat32: number;
  readonly randomRangeXFloat32: number;
  readonly randomRangeYFloat32: number;
  readonly intervalDword: number;
  readonly intervalVariationDword: number;
}

export interface AreaSoundProfilePresentation {
  readonly sounds: readonly string[];
  readonly playStyle: AreaSoundPlayStyle;
  readonly mode: AreaSoundPositioningMode;
  readonly elevation: number;
  readonly cutoffDistance: number;
  readonly maxVolumeDistance: number;
  readonly randomRangeWestEast: number;
  readonly randomRangeNorthSouth: number;
}

export function readAreaSoundProfileStorage(value: unknown): AreaSoundProfileStorage | null {
  if (!isExactRecord(value, STORAGE_KEYS) || !Array.isArray(value.sounds)) return null;
  if (
    value.sounds.length > MAX_AREA_SOUND_PROFILE_LIST_ENTRIES
    || !value.sounds.every(isAreaSoundResRef)
    || !isCanonicalByte(value.loopingByte)
    || !isCanonicalByte(value.continuousByte)
    || (value.loopingByte === 1 && value.continuousByte === 1)
    || !isCanonicalByte(value.positionalByte)
    || !isCanonicalByte(value.randomPositionByte)
    || (value.positionalByte === 0 && value.randomPositionByte !== 0)
    || !isExactFloat32InRange(value.elevationFloat32, -10, 10)
    || !isExactFloat32InRange(value.maxDistanceFloat32, MIN_AREA_SOUND_MAX_DISTANCE_FLOAT32, 320)
    || !isExactFloat32InRange(value.minDistanceFloat32, 0, value.maxDistanceFloat32)
    || !isExactFloat32InRange(value.randomRangeXFloat32, 0, 320)
    || !isExactFloat32InRange(value.randomRangeYFloat32, 0, 320)
    || !isUint32(value.intervalDword)
    || !isUint32(value.intervalVariationDword)
  ) return null;
  const priorityByte = deriveAreaSoundPriorityByte({
    loopingByte: value.loopingByte,
    continuousByte: value.continuousByte,
    positionalByte: value.positionalByte,
    soundsCount: value.sounds.length,
    intervalDword: value.intervalDword,
    intervalVariationDword: value.intervalVariationDword,
  });
  if (priorityByte === null || value.priorityByte !== priorityByte) return null;
  return Object.freeze({
    sounds: Object.freeze([...value.sounds]),
    loopingByte: value.loopingByte,
    continuousByte: value.continuousByte,
    priorityByte,
    positionalByte: value.positionalByte,
    randomPositionByte: value.randomPositionByte,
    elevationFloat32: value.elevationFloat32,
    maxDistanceFloat32: value.maxDistanceFloat32,
    minDistanceFloat32: value.minDistanceFloat32,
    randomRangeXFloat32: value.randomRangeXFloat32,
    randomRangeYFloat32: value.randomRangeYFloat32,
    intervalDword: value.intervalDword,
    intervalVariationDword: value.intervalVariationDword,
  });
}

export function cloneAreaSoundProfileStorage(value: AreaSoundProfileStorage): AreaSoundProfileStorage {
  const admitted = readAreaSoundProfileStorage(value);
  if (!admitted) throw new Error("Malformed Area sound profile storage.");
  return admitted;
}

export function areaSoundProfileStoragesEqual(left: unknown, right: unknown): boolean {
  const admittedLeft = readAreaSoundProfileStorage(left);
  const admittedRight = readAreaSoundProfileStorage(right);
  return admittedLeft !== null
    && admittedRight !== null
    && admittedLeft.sounds.length === admittedRight.sounds.length
    && admittedLeft.sounds.every((entry, index) => entry === admittedRight.sounds[index])
    && STORAGE_KEYS.slice(1).every(
      (key) => admittedLeft[key as keyof AreaSoundProfileStorage]
        === admittedRight[key as keyof AreaSoundProfileStorage],
    );
}

export function areaSoundProfilePresentationFromStorage(
  value: AreaSoundProfileStorage,
): AreaSoundProfilePresentation {
  const admitted = cloneAreaSoundProfileStorage(value);
  return Object.freeze({
    sounds: Object.freeze([...admitted.sounds]),
    playStyle: admitted.loopingByte === 1
      ? "loop"
      : admitted.continuousByte === 1 ? "repeat" : "once",
    mode: admitted.positionalByte === 0
      ? "everywhere"
      : admitted.randomPositionByte === 1 ? "random" : "specific",
    elevation: admitted.elevationFloat32,
    cutoffDistance: admitted.maxDistanceFloat32,
    maxVolumeDistance: admitted.minDistanceFloat32,
    randomRangeWestEast: admitted.randomRangeXFloat32,
    randomRangeNorthSouth: admitted.randomRangeYFloat32,
  });
}

export function areaSoundProfileStorageFromPresentation(
  source: AreaSoundProfileStorage,
  presentation: unknown,
): AreaSoundProfileStorage | null {
  const admittedSource = readAreaSoundProfileStorage(source);
  if (
    !admittedSource
    || !isExactRecord(presentation, PRESENTATION_KEYS)
    || !Array.isArray(presentation.sounds)
    || presentation.sounds.length > MAX_AREA_SOUND_PROFILE_LIST_ENTRIES
    || !presentation.sounds.every(isAreaSoundResRef)
    || !isPlayStyle(presentation.playStyle)
    || !isPositioningMode(presentation.mode)
    || !isFiniteNumber(presentation.elevation)
    || !isFiniteNumber(presentation.cutoffDistance)
    || !isFiniteNumber(presentation.maxVolumeDistance)
    || !isFiniteNumber(presentation.randomRangeWestEast)
    || !isFiniteNumber(presentation.randomRangeNorthSouth)
  ) return null;
  const loopingByte = presentation.playStyle === "loop" ? 1 : 0;
  const continuousByte = presentation.playStyle === "repeat" ? 1 : 0;
  const positionalByte = presentation.mode === "everywhere" ? 0 : 1;
  const randomPositionByte = presentation.mode === "random" ? 1 : 0;
  const priorityByte = deriveAreaSoundPriorityByte({
    loopingByte,
    continuousByte,
    positionalByte,
    soundsCount: presentation.sounds.length,
    intervalDword: admittedSource.intervalDword,
    intervalVariationDword: admittedSource.intervalVariationDword,
  });
  if (priorityByte === null) return null;
  return readAreaSoundProfileStorage({
    sounds: [...presentation.sounds],
    loopingByte,
    continuousByte,
    priorityByte,
    positionalByte,
    randomPositionByte,
    elevationFloat32: Math.fround(presentation.elevation),
    maxDistanceFloat32: Math.fround(presentation.cutoffDistance),
    minDistanceFloat32: Math.fround(presentation.maxVolumeDistance),
    randomRangeXFloat32: Math.fround(presentation.randomRangeWestEast),
    randomRangeYFloat32: Math.fround(presentation.randomRangeNorthSouth),
    intervalDword: admittedSource.intervalDword,
    intervalVariationDword: admittedSource.intervalVariationDword,
  });
}

function isPlayStyle(value: unknown): value is AreaSoundPlayStyle {
  return value === "once" || value === "repeat" || value === "loop";
}

function isPositioningMode(value: unknown): value is AreaSoundPositioningMode {
  return value === "everywhere" || value === "random" || value === "specific";
}

function isCanonicalByte(value: unknown): value is 0 | 1 {
  return value === 0 || value === 1;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isExactFloat32InRange(value: unknown, min: number, max: number): value is number {
  return isFiniteNumber(value)
    && !Object.is(value, -0)
    && Math.fround(value) === value
    && value >= min
    && value <= max;
}

function isUint32(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0 && Number(value) <= 0xffff_ffff;
}

function isExactRecord(
  value: unknown,
  expectedKeys: readonly string[],
): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const keys = Object.keys(value);
  return keys.length === expectedKeys.length
    && expectedKeys.every((key) => Object.prototype.hasOwnProperty.call(value, key));
}
