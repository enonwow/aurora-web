export const AREA_SOUND_SCHEDULE_STORAGE_REVISION =
  "aurora-area-sound-schedule-storage.v1" as const;
export const MAX_AREA_SOUND_HOURS_MASK = 0x00ff_ffff;
export const MAX_AREA_SOUND_TIMES_BYTE = 3;
export const AREA_SOUND_HOUR_COUNT = 24;

const STORAGE_KEYS = Object.freeze(["hoursMask", "timesByte"]);
const PRESENTATION_KEYS = Object.freeze(["whenToPlay", "dayNight", "hourMask"]);

export interface AreaSoundScheduleStorage {
  readonly hoursMask: number;
  readonly timesByte: number;
}

export interface AreaSoundSchedulePresentation {
  readonly whenToPlay: "always" | "dayNight" | "hours";
  readonly dayNight: "both" | "day" | "night";
  readonly hourMask: string;
}

export function readAreaSoundScheduleStorage(value: unknown): AreaSoundScheduleStorage | null {
  if (!isExactRecord(value, STORAGE_KEYS)) return null;
  if (!isHoursMask(value.hoursMask) || !isTimesByte(value.timesByte)) return null;
  return Object.freeze({ hoursMask: value.hoursMask, timesByte: value.timesByte });
}

export function cloneAreaSoundScheduleStorage(
  value: AreaSoundScheduleStorage,
): AreaSoundScheduleStorage {
  const admitted = readAreaSoundScheduleStorage(value);
  if (!admitted) throw new Error("Malformed Area sound schedule storage.");
  return admitted;
}

export function areaSoundScheduleStoragesEqual(left: unknown, right: unknown): boolean {
  const admittedLeft = readAreaSoundScheduleStorage(left);
  const admittedRight = readAreaSoundScheduleStorage(right);
  return admittedLeft !== null
    && admittedRight !== null
    && admittedLeft.hoursMask === admittedRight.hoursMask
    && admittedLeft.timesByte === admittedRight.timesByte;
}

export function areaSoundSchedulePresentationFromStorage(
  value: AreaSoundScheduleStorage,
): AreaSoundSchedulePresentation {
  const admitted = cloneAreaSoundScheduleStorage(value);
  const mode = presentationModeFromTimesByte(admitted.timesByte);
  return Object.freeze({
    ...mode,
    hourMask: hourMaskStringFromStorage(admitted.hoursMask),
  });
}

export function areaSoundScheduleStorageFromPresentation(
  value: AreaSoundSchedulePresentation,
): AreaSoundScheduleStorage | null {
  if (!isExactRecord(value, PRESENTATION_KEYS)) return null;
  const timesByte = timesByteFromPresentationMode(value.whenToPlay, value.dayNight);
  const hoursMask = storageHoursMaskFromString(value.hourMask);
  if (timesByte === null || hoursMask === null) return null;
  return readAreaSoundScheduleStorage({ hoursMask, timesByte });
}

function presentationModeFromTimesByte(
  timesByte: number,
): Pick<AreaSoundSchedulePresentation, "whenToPlay" | "dayNight"> {
  if (timesByte === 0) return { whenToPlay: "hours", dayNight: "both" };
  if (timesByte === 1) return { whenToPlay: "dayNight", dayNight: "day" };
  if (timesByte === 2) return { whenToPlay: "dayNight", dayNight: "night" };
  return { whenToPlay: "always", dayNight: "both" };
}

function timesByteFromPresentationMode(
  whenToPlay: unknown,
  dayNight: unknown,
): number | null {
  if (whenToPlay === "hours" && dayNight === "both") return 0;
  if (whenToPlay === "dayNight" && dayNight === "day") return 1;
  if (whenToPlay === "dayNight" && dayNight === "night") return 2;
  if (whenToPlay === "always" && dayNight === "both") return 3;
  return null;
}

function hourMaskStringFromStorage(hoursMask: number): string {
  return Array.from(
    { length: AREA_SOUND_HOUR_COUNT },
    (_, index) => (Math.floor(hoursMask / (2 ** index)) % 2 === 1 ? "1" : "0"),
  ).join("");
}

function storageHoursMaskFromString(value: unknown): number | null {
  if (typeof value !== "string" || !/^[01]{24}$/u.test(value)) return null;
  return value.split("").reduce(
    (mask, bit, index) => mask + (bit === "1" ? 2 ** index : 0),
    0,
  );
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

function isExactRecord(
  value: unknown,
  expectedKeys: readonly string[],
): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const keys = Object.keys(value);
  return keys.length === expectedKeys.length
    && expectedKeys.every((key) => Object.prototype.hasOwnProperty.call(value, key));
}
