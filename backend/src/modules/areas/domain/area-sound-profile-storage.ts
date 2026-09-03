import { deriveAreaSoundPriorityByte } from "./area-sound-play-style-storage";
import { isAreaSoundResRef } from "./area-sound-playback-storage";

export const AREA_SOUND_PROFILE_STORAGE_REVISION =
  "aurora-area-sound-profile-storage.v1" as const;
export const MAX_AREA_SOUND_PROFILE_MUTATIONS_PER_UPDATE = 1024;
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
const MUTATION_KEYS = Object.freeze([
  "kind", "sourceObjectId", "sourceIndex", "expectedValue", "value",
]);
const SOURCE_OBJECT_ID_MAX_CODE_UNITS = 256;

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

export interface ExistingAreaSoundProfileMutation {
  readonly kind: "sound";
  readonly sourceObjectId: string;
  readonly sourceIndex: number;
  readonly expectedValue: AreaSoundProfileStorage;
  readonly value: AreaSoundProfileStorage;
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
    || !isExactFloat32InRange(
      value.elevationFloat32,
      MIN_AREA_SOUND_ELEVATION_FLOAT32,
      MAX_AREA_SOUND_ELEVATION_FLOAT32,
    )
    || !isExactFloat32InRange(
      value.maxDistanceFloat32,
      MIN_AREA_SOUND_MAX_DISTANCE_FLOAT32,
      MAX_AREA_SOUND_SPATIAL_FLOAT32,
    )
    || !isExactFloat32InRange(value.minDistanceFloat32, 0, value.maxDistanceFloat32)
    || !isExactFloat32InRange(value.randomRangeXFloat32, 0, MAX_AREA_SOUND_SPATIAL_FLOAT32)
    || !isExactFloat32InRange(value.randomRangeYFloat32, 0, MAX_AREA_SOUND_SPATIAL_FLOAT32)
    || !isUint32(value.intervalDword)
    || !isUint32(value.intervalVariationDword)
  ) {
    return null;
  }
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

export function readExistingAreaSoundProfileMutation(
  value: unknown,
): ExistingAreaSoundProfileMutation | null {
  if (!isExactRecord(value, MUTATION_KEYS)) return null;
  if (value.kind !== "sound" || !isSourceObjectId(value.sourceObjectId)) return null;
  if (!Number.isSafeInteger(value.sourceIndex) || Number(value.sourceIndex) < 0) return null;
  const expectedValue = readAreaSoundProfileStorage(value.expectedValue);
  const targetValue = readAreaSoundProfileStorage(value.value);
  if (
    !expectedValue
    || !targetValue
    || areaSoundProfileStoragesEqual(expectedValue, targetValue)
    || expectedValue.intervalDword !== targetValue.intervalDword
    || expectedValue.intervalVariationDword !== targetValue.intervalVariationDword
  ) {
    return null;
  }
  return Object.freeze({
    kind: "sound",
    sourceObjectId: value.sourceObjectId,
    sourceIndex: Number(value.sourceIndex),
    expectedValue,
    value: targetValue,
  });
}

function isCanonicalByte(value: unknown): value is 0 | 1 {
  return value === 0 || value === 1;
}

function isExactFloat32InRange(value: unknown, min: number, max: number): value is number {
  return typeof value === "number"
    && Number.isFinite(value)
    && !Object.is(value, -0)
    && Math.fround(value) === value
    && value >= min
    && value <= max;
}

function isUint32(value: unknown): value is number {
  return typeof value === "number"
    && Number.isSafeInteger(value)
    && value >= 0
    && value <= 0xffff_ffff;
}

function isSourceObjectId(value: unknown): value is string {
  return typeof value === "string"
    && value.length > 0
    && value.length <= SOURCE_OBJECT_ID_MAX_CODE_UNITS
    && !value.includes("\0");
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
