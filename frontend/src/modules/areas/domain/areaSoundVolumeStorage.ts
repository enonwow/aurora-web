export const AREA_SOUND_VOLUME_STORAGE_REVISION =
  "aurora-area-sound-volume-storage.v1" as const;
export const MAX_AREA_SOUND_VOLUME_BYTE = 0x7f;

const STORAGE_KEYS = Object.freeze(["volumeByte"]);

export interface AreaSoundVolumeStorage {
  readonly volumeByte: number;
}

export interface AreaSoundVolumePresentation {
  readonly volume: number;
}

export function readAreaSoundVolumeStorage(value: unknown): AreaSoundVolumeStorage | null {
  if (!isExactRecord(value, STORAGE_KEYS)) return null;
  if (!isVolumeByte(value.volumeByte)) return null;
  return Object.freeze({ volumeByte: value.volumeByte });
}

export function cloneAreaSoundVolumeStorage(
  value: AreaSoundVolumeStorage,
): AreaSoundVolumeStorage {
  const admitted = readAreaSoundVolumeStorage(value);
  if (!admitted) throw new Error("Malformed Area sound base-volume storage.");
  return admitted;
}

export function areaSoundVolumeStoragesEqual(left: unknown, right: unknown): boolean {
  const admittedLeft = readAreaSoundVolumeStorage(left);
  const admittedRight = readAreaSoundVolumeStorage(right);
  return admittedLeft !== null
    && admittedRight !== null
    && admittedLeft.volumeByte === admittedRight.volumeByte;
}

export function soundVolumePresentationFromStorage(
  value: AreaSoundVolumeStorage,
): AreaSoundVolumePresentation {
  const admitted = cloneAreaSoundVolumeStorage(value);
  return Object.freeze({ volume: admitted.volumeByte / MAX_AREA_SOUND_VOLUME_BYTE });
}

export function soundVolumeStorageFromPresentation(
  value: AreaSoundVolumePresentation,
): AreaSoundVolumeStorage | null {
  if (typeof value.volume !== "number" || !Number.isFinite(value.volume)) return null;
  const volumeByte = Math.round(value.volume * MAX_AREA_SOUND_VOLUME_BYTE);
  if (!isVolumeByte(volumeByte) || value.volume !== volumeByte / MAX_AREA_SOUND_VOLUME_BYTE) {
    return null;
  }
  return readAreaSoundVolumeStorage({ volumeByte });
}

function isVolumeByte(value: unknown): value is number {
  return typeof value === "number"
    && Number.isSafeInteger(value)
    && value >= 0
    && value <= MAX_AREA_SOUND_VOLUME_BYTE;
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
