export const AREA_SOUND_PLAY_ORDER_STORAGE_REVISION =
  "aurora-area-sound-play-order-storage.v1" as const;

const STORAGE_KEYS = Object.freeze(["randomByte"]);

export interface AreaSoundPlayOrderStorage {
  readonly randomByte: 0 | 1;
}

export interface AreaSoundPlayOrderPresentation {
  readonly playOrder: "sequential" | "random";
}

export function readAreaSoundPlayOrderStorage(value: unknown): AreaSoundPlayOrderStorage | null {
  if (!isExactRecord(value, STORAGE_KEYS) || !isRandomByte(value.randomByte)) return null;
  return Object.freeze({ randomByte: value.randomByte });
}

export function cloneAreaSoundPlayOrderStorage(
  value: AreaSoundPlayOrderStorage,
): AreaSoundPlayOrderStorage {
  const admitted = readAreaSoundPlayOrderStorage(value);
  if (!admitted) throw new Error("Malformed Area sound Play Order storage.");
  return admitted;
}

export function areaSoundPlayOrderStoragesEqual(left: unknown, right: unknown): boolean {
  const admittedLeft = readAreaSoundPlayOrderStorage(left);
  const admittedRight = readAreaSoundPlayOrderStorage(right);
  return admittedLeft !== null
    && admittedRight !== null
    && admittedLeft.randomByte === admittedRight.randomByte;
}

export function soundPlayOrderPresentationFromStorage(
  value: AreaSoundPlayOrderStorage,
): AreaSoundPlayOrderPresentation {
  const admitted = cloneAreaSoundPlayOrderStorage(value);
  return Object.freeze({ playOrder: admitted.randomByte === 1 ? "random" : "sequential" });
}

export function soundPlayOrderStorageFromPresentation(
  value: { readonly playOrder?: unknown },
): AreaSoundPlayOrderStorage | null {
  if (value.playOrder !== "sequential" && value.playOrder !== "random") return null;
  return readAreaSoundPlayOrderStorage({ randomByte: value.playOrder === "random" ? 1 : 0 });
}

function isRandomByte(value: unknown): value is 0 | 1 {
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
