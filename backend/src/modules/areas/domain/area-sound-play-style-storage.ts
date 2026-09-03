export const AREA_SOUND_PLAY_STYLE_STORAGE_REVISION =
  "aurora-area-sound-play-style-storage.v1" as const;
export const MAX_AREA_SOUND_PLAY_STYLE_MUTATIONS_PER_UPDATE = 1024;
export const MAX_AREA_SOUND_PLAY_STYLE_UINT32 = 0xffff_ffff;

const STORAGE_KEYS = Object.freeze([
  "loopingByte",
  "continuousByte",
  "priorityByte",
  "positionalByte",
  "soundsCount",
  "intervalDword",
  "intervalVariationDword",
]);
const MUTATION_KEYS = Object.freeze([
  "kind", "sourceObjectId", "sourceIndex", "expectedValue", "value",
]);
const SOURCE_OBJECT_ID_MAX_CODE_UNITS = 256;

export type AreaSoundPriorityByte = 2 | 3 | 19 | 20;

export interface AreaSoundPlayStyleDerivationInputs {
  readonly loopingByte: 0 | 1;
  readonly continuousByte: 0 | 1;
  readonly positionalByte: 0 | 1;
  readonly soundsCount: number;
  readonly intervalDword: number;
  readonly intervalVariationDword: number;
}

export interface AreaSoundPlayStyleStorage extends AreaSoundPlayStyleDerivationInputs {
  readonly priorityByte: AreaSoundPriorityByte;
}

export interface ExistingAreaSoundPlayStyleMutation {
  readonly kind: "sound";
  readonly sourceObjectId: string;
  readonly sourceIndex: number;
  readonly expectedValue: AreaSoundPlayStyleStorage;
  readonly value: AreaSoundPlayStyleStorage;
}

export function deriveAreaSoundPriorityByte(
  value: AreaSoundPlayStyleDerivationInputs,
): AreaSoundPriorityByte | null {
  if (
    !isCanonicalByte(value.loopingByte)
    || !isCanonicalByte(value.continuousByte)
    || !isCanonicalStyle(value.loopingByte, value.continuousByte)
    || !isCanonicalByte(value.positionalByte)
    || !isUint32(value.soundsCount)
    || !isUint32(value.intervalDword)
    || !isUint32(value.intervalVariationDword)
  ) {
    return null;
  }
  const continuousLike = value.loopingByte === 1
    || (
      value.continuousByte === 1
      && value.soundsCount === 1
      && value.intervalDword === 0
      && value.intervalVariationDword === 0
    );
  if (continuousLike) return value.positionalByte === 1 ? 3 : 2;
  return value.positionalByte === 1 ? 20 : 19;
}

export function readAreaSoundPlayStyleStorage(value: unknown): AreaSoundPlayStyleStorage | null {
  if (!isExactRecord(value, STORAGE_KEYS)) return null;
  const priorityByte = deriveAreaSoundPriorityByte(value as unknown as AreaSoundPlayStyleDerivationInputs);
  if (priorityByte === null || value.priorityByte !== priorityByte) return null;
  return Object.freeze({
    loopingByte: value.loopingByte as 0 | 1,
    continuousByte: value.continuousByte as 0 | 1,
    priorityByte,
    positionalByte: value.positionalByte as 0 | 1,
    soundsCount: Number(value.soundsCount),
    intervalDword: Number(value.intervalDword),
    intervalVariationDword: Number(value.intervalVariationDword),
  });
}

export function areaSoundPlayStyleStoragesEqual(left: unknown, right: unknown): boolean {
  const admittedLeft = readAreaSoundPlayStyleStorage(left);
  const admittedRight = readAreaSoundPlayStyleStorage(right);
  return admittedLeft !== null
    && admittedRight !== null
    && admittedLeft.loopingByte === admittedRight.loopingByte
    && admittedLeft.continuousByte === admittedRight.continuousByte
    && admittedLeft.priorityByte === admittedRight.priorityByte
    && admittedLeft.positionalByte === admittedRight.positionalByte
    && admittedLeft.soundsCount === admittedRight.soundsCount
    && admittedLeft.intervalDword === admittedRight.intervalDword
    && admittedLeft.intervalVariationDword === admittedRight.intervalVariationDword;
}

export function readExistingAreaSoundPlayStyleMutation(
  value: unknown,
): ExistingAreaSoundPlayStyleMutation | null {
  if (!isExactRecord(value, MUTATION_KEYS)) return null;
  if (value.kind !== "sound" || !isSourceObjectId(value.sourceObjectId)) return null;
  if (!Number.isSafeInteger(value.sourceIndex) || Number(value.sourceIndex) < 0) return null;
  const expectedValue = readAreaSoundPlayStyleStorage(value.expectedValue);
  const targetValue = readAreaSoundPlayStyleStorage(value.value);
  if (
    !expectedValue
    || !targetValue
    || areaSoundPlayStyleStoragesEqual(expectedValue, targetValue)
    || !derivationDependenciesEqual(expectedValue, targetValue)
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

function derivationDependenciesEqual(
  left: AreaSoundPlayStyleStorage,
  right: AreaSoundPlayStyleStorage,
): boolean {
  return left.positionalByte === right.positionalByte
    && left.soundsCount === right.soundsCount
    && left.intervalDword === right.intervalDword
    && left.intervalVariationDword === right.intervalVariationDword;
}

function isCanonicalByte(value: unknown): value is 0 | 1 {
  return value === 0 || value === 1;
}

function isCanonicalStyle(loopingByte: 0 | 1, continuousByte: 0 | 1): boolean {
  return loopingByte === 0 || continuousByte === 0;
}

function isUint32(value: unknown): value is number {
  return typeof value === "number"
    && Number.isSafeInteger(value)
    && value >= 0
    && value <= MAX_AREA_SOUND_PLAY_STYLE_UINT32;
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
