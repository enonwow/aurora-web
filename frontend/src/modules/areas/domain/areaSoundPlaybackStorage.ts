import {
  deriveAreaSoundPriorityByte,
  type AreaSoundPlayStyle,
} from "./areaSoundPlayStyleStorage";

export const AREA_SOUND_PLAYBACK_STORAGE_REVISION =
  "aurora-area-sound-playback-storage.v1" as const;
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
const PRESENTATION_KEYS = Object.freeze(["sounds", "playStyle"]);
const SOUND_RESREF_PATTERN = /^[a-z0-9_]{1,16}$/u;

export interface AreaSoundPlaybackStorage {
  readonly sounds: readonly string[];
  readonly loopingByte: 0 | 1;
  readonly continuousByte: 0 | 1;
  readonly priorityByte: 2 | 3 | 19 | 20;
  readonly positionalByte: 0 | 1;
  readonly intervalDword: number;
  readonly intervalVariationDword: number;
}

export interface AreaSoundPlaybackPresentation {
  readonly sounds: readonly string[];
  readonly playStyle: AreaSoundPlayStyle;
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

export function cloneAreaSoundPlaybackStorage(
  value: AreaSoundPlaybackStorage,
): AreaSoundPlaybackStorage {
  const admitted = readAreaSoundPlaybackStorage(value);
  if (!admitted) throw new Error("Malformed Area sound playback storage.");
  return admitted;
}

export function areaSoundPlaybackStoragesEqual(left: unknown, right: unknown): boolean {
  const admittedLeft = readAreaSoundPlaybackStorage(left);
  const admittedRight = readAreaSoundPlaybackStorage(right);
  return admittedLeft !== null
    && admittedRight !== null
    && admittedLeft.sounds.length === admittedRight.sounds.length
    && admittedLeft.sounds.every((value, index) => value === admittedRight.sounds[index])
    && admittedLeft.loopingByte === admittedRight.loopingByte
    && admittedLeft.continuousByte === admittedRight.continuousByte
    && admittedLeft.priorityByte === admittedRight.priorityByte
    && admittedLeft.positionalByte === admittedRight.positionalByte
    && admittedLeft.intervalDword === admittedRight.intervalDword
    && admittedLeft.intervalVariationDword === admittedRight.intervalVariationDword;
}

export function areaSoundPlaybackPresentationFromStorage(
  value: AreaSoundPlaybackStorage,
): AreaSoundPlaybackPresentation {
  const admitted = cloneAreaSoundPlaybackStorage(value);
  const playStyle: AreaSoundPlayStyle = admitted.loopingByte === 1
    ? "loop"
    : admitted.continuousByte === 1 ? "repeat" : "once";
  return Object.freeze({ sounds: Object.freeze([...admitted.sounds]), playStyle });
}

export function areaSoundPlaybackStorageFromPresentation(
  source: AreaSoundPlaybackStorage,
  presentation: { readonly sounds?: unknown; readonly playStyle?: unknown },
): AreaSoundPlaybackStorage | null {
  const admittedSource = readAreaSoundPlaybackStorage(source);
  if (
    !admittedSource
    || !isExactRecord(presentation, PRESENTATION_KEYS)
    || !Array.isArray(presentation.sounds)
    || presentation.sounds.length > MAX_AREA_SOUND_PLAYBACK_LIST_ENTRIES
    || !presentation.sounds.every(isAreaSoundResRef)
    || (
      presentation.playStyle !== "once"
      && presentation.playStyle !== "repeat"
      && presentation.playStyle !== "loop"
    )
  ) {
    return null;
  }
  const loopingByte = presentation.playStyle === "loop" ? 1 : 0;
  const continuousByte = presentation.playStyle === "repeat" ? 1 : 0;
  const priorityByte = deriveAreaSoundPriorityByte({
    loopingByte,
    continuousByte,
    positionalByte: admittedSource.positionalByte,
    soundsCount: presentation.sounds.length,
    intervalDword: admittedSource.intervalDword,
    intervalVariationDword: admittedSource.intervalVariationDword,
  });
  if (priorityByte === null) return null;
  return readAreaSoundPlaybackStorage({
    sounds: [...presentation.sounds],
    loopingByte,
    continuousByte,
    priorityByte,
    positionalByte: admittedSource.positionalByte,
    intervalDword: admittedSource.intervalDword,
    intervalVariationDword: admittedSource.intervalVariationDword,
  });
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

function isExactRecord(
  value: unknown,
  expectedKeys: readonly string[],
): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const keys = Object.keys(value);
  return keys.length === expectedKeys.length
    && expectedKeys.every((key) => Object.prototype.hasOwnProperty.call(value, key));
}
