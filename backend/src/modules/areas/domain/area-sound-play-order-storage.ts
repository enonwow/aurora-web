export const AREA_SOUND_PLAY_ORDER_STORAGE_REVISION =
  "aurora-area-sound-play-order-storage.v1" as const;
export const MAX_AREA_SOUND_PLAY_ORDER_MUTATIONS_PER_UPDATE = 1024;

const STORAGE_KEYS = Object.freeze(["randomByte"]);
const MUTATION_KEYS = Object.freeze([
  "kind", "sourceObjectId", "sourceIndex", "expectedValue", "value",
]);
const SOURCE_OBJECT_ID_MAX_CODE_UNITS = 256;

export interface AreaSoundPlayOrderStorage {
  readonly randomByte: 0 | 1;
}

export interface ExistingAreaSoundPlayOrderMutation {
  readonly kind: "sound";
  readonly sourceObjectId: string;
  readonly sourceIndex: number;
  readonly expectedValue: AreaSoundPlayOrderStorage;
  readonly value: AreaSoundPlayOrderStorage;
}

export function readAreaSoundPlayOrderStorage(value: unknown): AreaSoundPlayOrderStorage | null {
  if (!isExactRecord(value, STORAGE_KEYS) || !isRandomByte(value.randomByte)) return null;
  return Object.freeze({ randomByte: value.randomByte });
}

export function areaSoundPlayOrderStoragesEqual(left: unknown, right: unknown): boolean {
  const admittedLeft = readAreaSoundPlayOrderStorage(left);
  const admittedRight = readAreaSoundPlayOrderStorage(right);
  return admittedLeft !== null
    && admittedRight !== null
    && admittedLeft.randomByte === admittedRight.randomByte;
}

export function readExistingAreaSoundPlayOrderMutation(
  value: unknown,
): ExistingAreaSoundPlayOrderMutation | null {
  if (!isExactRecord(value, MUTATION_KEYS)) return null;
  if (value.kind !== "sound" || !isSourceObjectId(value.sourceObjectId)) return null;
  if (!Number.isSafeInteger(value.sourceIndex) || Number(value.sourceIndex) < 0) return null;
  const expectedValue = readAreaSoundPlayOrderStorage(value.expectedValue);
  const targetValue = readAreaSoundPlayOrderStorage(value.value);
  if (!expectedValue || !targetValue || areaSoundPlayOrderStoragesEqual(expectedValue, targetValue)) {
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

function isRandomByte(value: unknown): value is 0 | 1 {
  return value === 0 || value === 1;
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
