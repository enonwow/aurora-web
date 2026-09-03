export const AREA_SOUND_VOLUME_STORAGE_REVISION =
  "aurora-area-sound-volume-storage.v1" as const;
export const MAX_AREA_SOUND_VOLUME_BYTE = 0x7f;
export const MAX_AREA_SOUND_VOLUME_MUTATIONS_PER_UPDATE = 1024;

const STORAGE_KEYS = Object.freeze(["volumeByte"]);
const MUTATION_KEYS = Object.freeze([
  "kind",
  "sourceObjectId",
  "sourceIndex",
  "expectedValue",
  "value",
]);
const SOURCE_OBJECT_ID_MAX_CODE_UNITS = 256;

export interface AreaSoundVolumeStorage {
  readonly volumeByte: number;
}

export interface ExistingAreaSoundVolumeMutation {
  readonly kind: "sound";
  readonly sourceObjectId: string;
  readonly sourceIndex: number;
  readonly expectedValue: AreaSoundVolumeStorage;
  readonly value: AreaSoundVolumeStorage;
}

export function readAreaSoundVolumeStorage(value: unknown): AreaSoundVolumeStorage | null {
  if (!isExactRecord(value, STORAGE_KEYS)) return null;
  if (!isVolumeByte(value.volumeByte)) return null;
  return Object.freeze({ volumeByte: value.volumeByte });
}

export function areaSoundVolumeStoragesEqual(left: unknown, right: unknown): boolean {
  const admittedLeft = readAreaSoundVolumeStorage(left);
  const admittedRight = readAreaSoundVolumeStorage(right);
  return admittedLeft !== null
    && admittedRight !== null
    && admittedLeft.volumeByte === admittedRight.volumeByte;
}

export function readExistingAreaSoundVolumeMutation(
  value: unknown,
): ExistingAreaSoundVolumeMutation | null {
  if (!isExactRecord(value, MUTATION_KEYS)) return null;
  if (value.kind !== "sound" || !isSourceObjectId(value.sourceObjectId)) return null;
  if (!Number.isSafeInteger(value.sourceIndex) || Number(value.sourceIndex) < 0) return null;
  const expectedValue = readAreaSoundVolumeStorage(value.expectedValue);
  const targetValue = readAreaSoundVolumeStorage(value.value);
  if (!expectedValue || !targetValue || areaSoundVolumeStoragesEqual(expectedValue, targetValue)) {
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

function isVolumeByte(value: unknown): value is number {
  return typeof value === "number"
    && Number.isSafeInteger(value)
    && value >= 0
    && value <= MAX_AREA_SOUND_VOLUME_BYTE;
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
