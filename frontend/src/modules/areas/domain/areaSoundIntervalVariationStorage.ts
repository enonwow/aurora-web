export const AREA_SOUND_INTERVAL_VARIATION_STORAGE_REVISION =
  "aurora-area-sound-interval-variation-storage.v1" as const;
export const MAX_AREA_SOUND_INTERVAL_VARIATION_MILLISECONDS = 60_000;
export const AREA_SOUND_INTERVAL_VARIATION_MILLISECOND_STEP = 10;
export const MAX_AREA_SOUND_PITCH_VARIATION_HUNDREDTHS = 100;
export const MAX_AREA_SOUND_VOLUME_VARIATION_BYTE = 0x7f;

const STORAGE_KEYS = Object.freeze([
  "intervalMilliseconds",
  "intervalVariationMilliseconds",
  "pitchVariationHundredths",
  "volumeVariationByte",
]);

export interface AreaSoundIntervalVariationStorage {
  readonly intervalMilliseconds: number;
  readonly intervalVariationMilliseconds: number;
  readonly pitchVariationHundredths: number;
  readonly volumeVariationByte: number;
}

export interface AreaSoundIntervalVariationPresentation {
  readonly intervalMs: number;
  readonly intervalVariationMs: number;
  readonly pitchVariation: number;
  readonly volumeVariation: number;
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

export function cloneAreaSoundIntervalVariationStorage(
  value: AreaSoundIntervalVariationStorage,
): AreaSoundIntervalVariationStorage {
  const admitted = readAreaSoundIntervalVariationStorage(value);
  if (!admitted) throw new Error("Malformed Area sound interval/variation storage.");
  return admitted;
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

export function soundIntervalVariationPresentationFromStorage(
  value: AreaSoundIntervalVariationStorage,
): AreaSoundIntervalVariationPresentation {
  const admitted = cloneAreaSoundIntervalVariationStorage(value);
  return Object.freeze({
    intervalMs: admitted.intervalMilliseconds,
    intervalVariationMs: admitted.intervalVariationMilliseconds,
    pitchVariation: Math.fround(admitted.pitchVariationHundredths / 100),
    volumeVariation: admitted.volumeVariationByte / 127,
  });
}

export function soundIntervalVariationStorageFromPresentation(
  value: AreaSoundIntervalVariationPresentation,
): AreaSoundIntervalVariationStorage | null {
  if (!isAdmittedIntervalMilliseconds(value.intervalMs)) return null;
  if (!isAdmittedIntervalMilliseconds(value.intervalVariationMs)) return null;
  if (typeof value.pitchVariation !== "number" || !Number.isFinite(value.pitchVariation)) return null;
  if (typeof value.volumeVariation !== "number" || !Number.isFinite(value.volumeVariation)) return null;
  const pitchVariationHundredths = Math.round(value.pitchVariation * 100);
  const canonicalPitch = pitchVariationHundredths / 100;
  if (
    !isIntegerInRange(pitchVariationHundredths, 0, MAX_AREA_SOUND_PITCH_VARIATION_HUNDREDTHS)
    || (value.pitchVariation !== canonicalPitch
      && value.pitchVariation !== Math.fround(canonicalPitch))
  ) {
    return null;
  }
  const volumeVariationByte = Math.round(value.volumeVariation * 127);
  if (
    !isIntegerInRange(volumeVariationByte, 0, MAX_AREA_SOUND_VOLUME_VARIATION_BYTE)
    || value.volumeVariation !== volumeVariationByte / 127
  ) {
    return null;
  }
  return readAreaSoundIntervalVariationStorage({
    intervalMilliseconds: value.intervalMs,
    intervalVariationMilliseconds: value.intervalVariationMs,
    pitchVariationHundredths,
    volumeVariationByte,
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

function isExactRecord(
  value: unknown,
  expectedKeys: readonly string[],
): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const keys = Object.keys(value);
  return keys.length === expectedKeys.length
    && expectedKeys.every((key) => Object.prototype.hasOwnProperty.call(value, key));
}
