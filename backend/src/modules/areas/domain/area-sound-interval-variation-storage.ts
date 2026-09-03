export const AREA_SOUND_INTERVAL_VARIATION_STORAGE_REVISION =
  "aurora-area-sound-interval-variation-storage.v1" as const;
export const MAX_AREA_SOUND_INTERVAL_VARIATION_MILLISECONDS = 60_000;
export const AREA_SOUND_INTERVAL_VARIATION_MILLISECOND_STEP = 10;
export const MAX_AREA_SOUND_PITCH_VARIATION_HUNDREDTHS = 100;
export const MAX_AREA_SOUND_VOLUME_VARIATION_BYTE = 0x7f;
export const MAX_AREA_SOUND_INTERVAL_VARIATION_MUTATIONS_PER_UPDATE = 1024;

const STORAGE_KEYS = Object.freeze([
  "intervalMilliseconds",
  "intervalVariationMilliseconds",
  "pitchVariationHundredths",
  "volumeVariationByte",
]);
const MUTATION_KEYS = Object.freeze([
  "kind",
  "sourceObjectId",
  "sourceIndex",
  "expectedValue",
  "value",
]);
const SOURCE_OBJECT_ID_MAX_CODE_UNITS = 256;

export interface AreaSoundIntervalVariationStorage {
  readonly intervalMilliseconds: number;
  readonly intervalVariationMilliseconds: number;
  readonly pitchVariationHundredths: number;
  readonly volumeVariationByte: number;
}

export interface ExistingAreaSoundIntervalVariationMutation {
  readonly kind: "sound";
  readonly sourceObjectId: string;
  readonly sourceIndex: number;
  readonly expectedValue: AreaSoundIntervalVariationStorage;
  readonly value: AreaSoundIntervalVariationStorage;
}

export function readAreaSoundIntervalVariationStorage(
  value: unknown,
): AreaSoundIntervalVariationStorage | null {
  if (!isExactRecord(value, STORAGE_KEYS)) return null;
  if (!isAdmittedIntervalMilliseconds(value.intervalMilliseconds)) return null;
  if (!isAdmittedIntervalMilliseconds(value.intervalVariationMilliseconds)) return null;
  if (!isIntegerInRange(value.pitchVariationHundredths, 0, MAX_AREA_SOUND_PITCH_VARIATION_HUNDREDTHS)) {
    return null;
  }
  if (!isIntegerInRange(value.volumeVariationByte, 0, MAX_AREA_SOUND_VOLUME_VARIATION_BYTE)) {
    return null;
  }
  return Object.freeze({
    intervalMilliseconds: value.intervalMilliseconds,
    intervalVariationMilliseconds: value.intervalVariationMilliseconds,
    pitchVariationHundredths: value.pitchVariationHundredths,
    volumeVariationByte: value.volumeVariationByte,
  });
}

export function areaSoundIntervalVariationStoragesEqual(
  left: unknown,
  right: unknown,
): boolean {
  const admittedLeft = readAreaSoundIntervalVariationStorage(left);
  const admittedRight = readAreaSoundIntervalVariationStorage(right);
  return admittedLeft !== null
    && admittedRight !== null
    && admittedLeft.intervalMilliseconds === admittedRight.intervalMilliseconds
    && admittedLeft.intervalVariationMilliseconds === admittedRight.intervalVariationMilliseconds
    && admittedLeft.pitchVariationHundredths === admittedRight.pitchVariationHundredths
    && admittedLeft.volumeVariationByte === admittedRight.volumeVariationByte;
}

export function pitchVariationFloat32FromHundredths(hundredths: number): number {
  return Math.fround(hundredths / 100);
}

export function readExistingAreaSoundIntervalVariationMutation(
  value: unknown,
): ExistingAreaSoundIntervalVariationMutation | null {
  if (!isExactRecord(value, MUTATION_KEYS)) return null;
  if (value.kind !== "sound" || !isSourceObjectId(value.sourceObjectId)) return null;
  if (!Number.isSafeInteger(value.sourceIndex) || Number(value.sourceIndex) < 0) return null;
  const expectedValue = readAreaSoundIntervalVariationStorage(value.expectedValue);
  const targetValue = readAreaSoundIntervalVariationStorage(value.value);
  if (
    !expectedValue
    || !targetValue
    || areaSoundIntervalVariationStoragesEqual(expectedValue, targetValue)
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

function isAdmittedIntervalMilliseconds(value: unknown): value is number {
  return isIntegerInRange(value, 0, MAX_AREA_SOUND_INTERVAL_VARIATION_MILLISECONDS)
    && value % AREA_SOUND_INTERVAL_VARIATION_MILLISECOND_STEP === 0;
}

function isIntegerInRange(value: unknown, minimum: number, maximum: number): value is number {
  return typeof value === "number"
    && Number.isSafeInteger(value)
    && value >= minimum
    && value <= maximum;
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
