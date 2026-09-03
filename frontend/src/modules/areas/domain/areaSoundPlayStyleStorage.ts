export const AREA_SOUND_PLAY_STYLE_STORAGE_REVISION =
  "aurora-area-sound-play-style-storage.v1" as const;
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
const PRESENTATION_KEYS = Object.freeze(["playStyle"]);

export type AreaSoundPriorityByte = 2 | 3 | 19 | 20;
export type AreaSoundPlayStyle = "once" | "repeat" | "loop";

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

export interface AreaSoundPlayStylePresentation {
  readonly playStyle: AreaSoundPlayStyle;
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

export function cloneAreaSoundPlayStyleStorage(
  value: AreaSoundPlayStyleStorage,
): AreaSoundPlayStyleStorage {
  const admitted = readAreaSoundPlayStyleStorage(value);
  if (!admitted) throw new Error("Malformed Area sound Play Style storage.");
  return admitted;
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

export function areaSoundPlayStylePresentationFromStorage(
  value: AreaSoundPlayStyleStorage,
): AreaSoundPlayStylePresentation {
  const admitted = cloneAreaSoundPlayStyleStorage(value);
  if (admitted.loopingByte === 1) return Object.freeze({ playStyle: "loop" });
  return Object.freeze({
    playStyle: admitted.continuousByte === 1 ? "repeat" : "once",
  });
}

export function areaSoundPlayStyleStorageFromPresentation(
  source: AreaSoundPlayStyleStorage,
  presentation: { readonly playStyle?: unknown },
): AreaSoundPlayStyleStorage | null {
  const admittedSource = readAreaSoundPlayStyleStorage(source);
  if (!admittedSource || !isExactRecord(presentation, PRESENTATION_KEYS)) return null;
  const style = presentation.playStyle;
  if (style !== "once" && style !== "repeat" && style !== "loop") return null;
  const loopingByte = style === "loop" ? 1 : 0;
  const continuousByte = style === "repeat" ? 1 : 0;
  const priorityByte = deriveAreaSoundPriorityByte({
    loopingByte,
    continuousByte,
    positionalByte: admittedSource.positionalByte,
    soundsCount: admittedSource.soundsCount,
    intervalDword: admittedSource.intervalDword,
    intervalVariationDword: admittedSource.intervalVariationDword,
  });
  if (priorityByte === null) return null;
  return readAreaSoundPlayStyleStorage({
    loopingByte,
    continuousByte,
    priorityByte,
    positionalByte: admittedSource.positionalByte,
    soundsCount: admittedSource.soundsCount,
    intervalDword: admittedSource.intervalDword,
    intervalVariationDword: admittedSource.intervalVariationDword,
  });
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

function isExactRecord(
  value: unknown,
  expectedKeys: readonly string[],
): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const keys = Object.keys(value);
  return keys.length === expectedKeys.length
    && expectedKeys.every((key) => Object.prototype.hasOwnProperty.call(value, key));
}
