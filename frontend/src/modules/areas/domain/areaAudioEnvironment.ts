export const AREA_AUDIO_ENVIRONMENT_PROPERTIES = Object.freeze([
  "ambientSoundDayId",
  "ambientSoundNightId",
  "ambientSoundDayVolume",
  "ambientSoundNightVolume",
  "environmentAudioId",
  "musicBattleId",
  "musicDayId",
  "musicNightId",
  "musicDelayMilliseconds",
] as const);

export type AreaAudioEnvironmentProperty =
  (typeof AREA_AUDIO_ENVIRONMENT_PROPERTIES)[number];

export interface AreaAudioEnvironment {
  readonly ambientSoundDayId: number;
  readonly ambientSoundNightId: number;
  readonly ambientSoundDayVolume: number;
  readonly ambientSoundNightVolume: number;
  readonly environmentAudioId: number;
  readonly musicBattleId: number;
  readonly musicDayId: number;
  readonly musicNightId: number;
  readonly musicDelayMilliseconds: number;
}

export interface ExistingAreaAudioEnvironmentMutation {
  readonly expectedValue: AreaAudioEnvironment;
  readonly value: AreaAudioEnvironment;
}

const PROPERTY_SET = new Set<string>(AREA_AUDIO_ENVIRONMENT_PROPERTIES);
const MAX_SIGNED_GFF_INT = 0x7fff_ffff;

export function isAreaAudioEnvironment(value: unknown): value is AreaAudioEnvironment {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record);
  if (keys.length !== PROPERTY_SET.size || keys.some((key) => !PROPERTY_SET.has(key))) {
    return false;
  }
  for (const property of [
    "ambientSoundDayId",
    "ambientSoundNightId",
    "environmentAudioId",
    "musicBattleId",
    "musicDayId",
    "musicNightId",
  ] as const) {
    const candidate = record[property];
    if (!Number.isInteger(candidate) || (candidate as number) < 0
        || (candidate as number) > MAX_SIGNED_GFF_INT) return false;
  }
  for (const property of ["ambientSoundDayVolume", "ambientSoundNightVolume"] as const) {
    const candidate = record[property];
    if (!Number.isInteger(candidate) || (candidate as number) < 0
        || (candidate as number) > 127) return false;
  }
  const delay = record.musicDelayMilliseconds;
  return Number.isInteger(delay) && (delay as number) >= -99_000
    && (delay as number) <= 99_000 && (delay as number) % 1000 === 0;
}

export function areaAudioEnvironmentsEqual(left: unknown, right: unknown): boolean {
  return isAreaAudioEnvironment(left) && isAreaAudioEnvironment(right)
    && AREA_AUDIO_ENVIRONMENT_PROPERTIES.every(
      (property) => left[property] === right[property],
    );
}
