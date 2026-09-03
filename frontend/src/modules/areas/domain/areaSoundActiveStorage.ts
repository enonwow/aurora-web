export const AREA_SOUND_ACTIVE_STORAGE_REVISION =
  "aurora-area-sound-active-storage.v1" as const;

const STORAGE_KEYS = Object.freeze(["activeByte"]);

export interface AreaSoundActiveStorage {
  readonly activeByte: 0 | 1;
}

export interface AreaSoundActivePresentation {
  readonly active: boolean;
}

export function readAreaSoundActiveStorage(value: unknown): AreaSoundActiveStorage | null {
  if (!isExactRecord(value, STORAGE_KEYS) || !isActiveByte(value.activeByte)) return null;
  return Object.freeze({ activeByte: value.activeByte });
}

export function cloneAreaSoundActiveStorage(value: AreaSoundActiveStorage): AreaSoundActiveStorage {
  const admitted = readAreaSoundActiveStorage(value);
  if (!admitted) throw new Error("Malformed Area sound Active storage.");
  return admitted;
}

export function areaSoundActiveStoragesEqual(left: unknown, right: unknown): boolean {
  const admittedLeft = readAreaSoundActiveStorage(left);
  const admittedRight = readAreaSoundActiveStorage(right);
  return admittedLeft !== null
    && admittedRight !== null
    && admittedLeft.activeByte === admittedRight.activeByte;
}

export function soundActivePresentationFromStorage(
  value: AreaSoundActiveStorage,
): AreaSoundActivePresentation {
  const admitted = cloneAreaSoundActiveStorage(value);
  return Object.freeze({ active: admitted.activeByte === 1 });
}

export function soundActiveStorageFromPresentation(
  value: AreaSoundActivePresentation,
): AreaSoundActiveStorage | null {
  if (typeof value.active !== "boolean") return null;
  return readAreaSoundActiveStorage({ activeByte: value.active ? 1 : 0 });
}

function isActiveByte(value: unknown): value is 0 | 1 {
  return value === 0 || value === 1;
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
