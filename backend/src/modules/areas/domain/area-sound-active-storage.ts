export const AREA_SOUND_ACTIVE_STORAGE_REVISION =
  "aurora-area-sound-active-storage.v1" as const;
export const MAX_AREA_SOUND_ACTIVE_MUTATIONS_PER_UPDATE = 1024;

const STORAGE_KEYS = Object.freeze(["activeByte"]);
const MUTATION_KEYS = Object.freeze([
  "kind", "sourceObjectId", "sourceIndex", "expectedValue", "value",
]);
const SOURCE_OBJECT_ID_MAX_CODE_UNITS = 256;

export interface AreaSoundActiveStorage {
  readonly activeByte: 0 | 1;
}

export interface ExistingAreaSoundActiveMutation {
  readonly kind: "sound";
  readonly sourceObjectId: string;
  readonly sourceIndex: number;
  readonly expectedValue: AreaSoundActiveStorage;
  readonly value: AreaSoundActiveStorage;
}

export function readAreaSoundActiveStorage(value: unknown): AreaSoundActiveStorage | null {
  if (!isExactRecord(value, STORAGE_KEYS) || !isActiveByte(value.activeByte)) return null;
  return Object.freeze({ activeByte: value.activeByte });
}

export function areaSoundActiveStoragesEqual(left: unknown, right: unknown): boolean {
  const admittedLeft = readAreaSoundActiveStorage(left);
  const admittedRight = readAreaSoundActiveStorage(right);
  return admittedLeft !== null
    && admittedRight !== null
    && admittedLeft.activeByte === admittedRight.activeByte;
}

export function readExistingAreaSoundActiveMutation(
  value: unknown,
): ExistingAreaSoundActiveMutation | null {
  if (!isExactRecord(value, MUTATION_KEYS)) return null;
  if (value.kind !== "sound" || !isSourceObjectId(value.sourceObjectId)) return null;
  if (!Number.isSafeInteger(value.sourceIndex) || Number(value.sourceIndex) < 0) return null;
  const expectedValue = readAreaSoundActiveStorage(value.expectedValue);
  const targetValue = readAreaSoundActiveStorage(value.value);
  if (!expectedValue || !targetValue || areaSoundActiveStoragesEqual(expectedValue, targetValue)) {
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

function isActiveByte(value: unknown): value is 0 | 1 {
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
