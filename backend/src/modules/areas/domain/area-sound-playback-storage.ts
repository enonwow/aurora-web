import { deriveAreaSoundPriorityByte } from "./area-sound-play-style-storage";

export const AREA_SOUND_PLAYBACK_STORAGE_REVISION =
  "aurora-area-sound-playback-storage.v1" as const;
export const MAX_AREA_SOUND_PLAYBACK_MUTATIONS_PER_UPDATE = 1024;
export const MAX_AREA_SOUND_PLAYBACK_LIST_ENTRIES = 1024;

const STORAGE_KEYS = Object.freeze([
  "sounds",
  "loopingByte",
  "continuousByte",
  "priorityByte",
  "positionalByte",
  "intervalDword",
  "intervalVariationDword",
]);
const MUTATION_KEYS = Object.freeze([
  "kind", "sourceObjectId", "sourceIndex", "expectedValue", "value",
]);
const SOUND_RESREF_PATTERN = /^[a-z0-9_]{1,16}$/u;
const SOURCE_OBJECT_ID_MAX_CODE_UNITS = 256;

export interface AreaSoundPlaybackStorage {
  readonly sounds: readonly string[];
  readonly loopingByte: 0 | 1;
  readonly continuousByte: 0 | 1;
  readonly priorityByte: 2 | 3 | 19 | 20;
  readonly positionalByte: 0 | 1;
  readonly intervalDword: number;
  readonly intervalVariationDword: number;
}

export interface ExistingAreaSoundPlaybackMutation {
  readonly kind: "sound";
  readonly sourceObjectId: string;
  readonly sourceIndex: number;
  readonly expectedValue: AreaSoundPlaybackStorage;
  readonly value: AreaSoundPlaybackStorage;
}

export function isAreaSoundResRef(value: unknown): value is string {
  return typeof value === "string" && SOUND_RESREF_PATTERN.test(value);
}

export function readAreaSoundPlaybackStorage(value: unknown): AreaSoundPlaybackStorage | null {
  if (!isExactRecord(value, STORAGE_KEYS) || !Array.isArray(value.sounds)) return null;
  if (
    value.sounds.length > MAX_AREA_SOUND_PLAYBACK_LIST_ENTRIES
    || !value.sounds.every(isAreaSoundResRef)
    || !isCanonicalByte(value.loopingByte)
    || !isCanonicalByte(value.continuousByte)
    || (value.loopingByte === 1 && value.continuousByte === 1)
    || !isCanonicalByte(value.positionalByte)
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
    intervalDword: value.intervalDword,
    intervalVariationDword: value.intervalVariationDword,
  });
}

export function areaSoundPlaybackStoragesEqual(left: unknown, right: unknown): boolean {
  const admittedLeft = readAreaSoundPlaybackStorage(left);
  const admittedRight = readAreaSoundPlaybackStorage(right);
  return admittedLeft !== null
    && admittedRight !== null
    && orderedStringsEqual(admittedLeft.sounds, admittedRight.sounds)
    && admittedLeft.loopingByte === admittedRight.loopingByte
    && admittedLeft.continuousByte === admittedRight.continuousByte
    && admittedLeft.priorityByte === admittedRight.priorityByte
    && admittedLeft.positionalByte === admittedRight.positionalByte
    && admittedLeft.intervalDword === admittedRight.intervalDword
    && admittedLeft.intervalVariationDword === admittedRight.intervalVariationDword;
}

export function readExistingAreaSoundPlaybackMutation(
  value: unknown,
): ExistingAreaSoundPlaybackMutation | null {
  if (!isExactRecord(value, MUTATION_KEYS)) return null;
  if (value.kind !== "sound" || !isSourceObjectId(value.sourceObjectId)) return null;
  if (!Number.isSafeInteger(value.sourceIndex) || Number(value.sourceIndex) < 0) return null;
  const expectedValue = readAreaSoundPlaybackStorage(value.expectedValue);
  const targetValue = readAreaSoundPlaybackStorage(value.value);
  if (
    !expectedValue
    || !targetValue
    || areaSoundPlaybackStoragesEqual(expectedValue, targetValue)
    || expectedValue.positionalByte !== targetValue.positionalByte
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

function orderedStringsEqual(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function isCanonicalByte(value: unknown): value is 0 | 1 {
  return value === 0 || value === 1;
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
