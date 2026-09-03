export const AREA_SOUND_SCHEDULE_STORAGE_REVISION =
  "aurora-area-sound-schedule-storage.v1" as const;
export const MAX_AREA_SOUND_HOURS_MASK = 0x00ff_ffff;
export const MAX_AREA_SOUND_TIMES_BYTE = 3;
export const MAX_AREA_SOUND_SCHEDULE_MUTATIONS_PER_UPDATE = 1024;

const STORAGE_KEYS = Object.freeze(["hoursMask", "timesByte"]);
const MUTATION_KEYS = Object.freeze([
  "kind",
  "sourceObjectId",
  "sourceIndex",
  "expectedValue",
  "value",
]);
const SOURCE_OBJECT_ID_MAX_CODE_UNITS = 256;

export interface AreaSoundScheduleStorage {
  readonly hoursMask: number;
  readonly timesByte: number;
}

export interface ExistingAreaSoundScheduleMutation {
  readonly kind: "sound";
  readonly sourceObjectId: string;
  readonly sourceIndex: number;
  readonly expectedValue: AreaSoundScheduleStorage;
  readonly value: AreaSoundScheduleStorage;
}

export function readAreaSoundScheduleStorage(value: unknown): AreaSoundScheduleStorage | null {
  if (!isExactRecord(value, STORAGE_KEYS)) return null;
  if (!isHoursMask(value.hoursMask) || !isTimesByte(value.timesByte)) return null;
  return Object.freeze({ hoursMask: value.hoursMask, timesByte: value.timesByte });
}

export function areaSoundScheduleStoragesEqual(left: unknown, right: unknown): boolean {
  const admittedLeft = readAreaSoundScheduleStorage(left);
  const admittedRight = readAreaSoundScheduleStorage(right);
  return admittedLeft !== null
    && admittedRight !== null
    && admittedLeft.hoursMask === admittedRight.hoursMask
    && admittedLeft.timesByte === admittedRight.timesByte;
}

export function readExistingAreaSoundScheduleMutation(
  value: unknown,
): ExistingAreaSoundScheduleMutation | null {
  if (!isExactRecord(value, MUTATION_KEYS)) return null;
  if (value.kind !== "sound" || !isSourceObjectId(value.sourceObjectId)) return null;
  if (!Number.isSafeInteger(value.sourceIndex) || Number(value.sourceIndex) < 0) return null;
  const expectedValue = readAreaSoundScheduleStorage(value.expectedValue);
  const targetValue = readAreaSoundScheduleStorage(value.value);
  if (!expectedValue || !targetValue || areaSoundScheduleStoragesEqual(expectedValue, targetValue)) {
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

function isHoursMask(value: unknown): value is number {
  return typeof value === "number"
    && Number.isSafeInteger(value)
    && value >= 0
    && value <= MAX_AREA_SOUND_HOURS_MASK;
}

function isTimesByte(value: unknown): value is number {
  return typeof value === "number"
    && Number.isSafeInteger(value)
    && value >= 0
    && value <= MAX_AREA_SOUND_TIMES_BYTE;
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
