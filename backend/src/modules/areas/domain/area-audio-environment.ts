export const AREA_AUDIO_ENVIRONMENT_FIELD_MAPPINGS = Object.freeze([
  { property: "ambientSoundDayId", label: "AmbientSndDay" },
  { property: "ambientSoundNightId", label: "AmbientSndNight" },
  { property: "ambientSoundDayVolume", label: "AmbientSndDayVol" },
  { property: "ambientSoundNightVolume", label: "AmbientSndNitVol" },
  { property: "environmentAudioId", label: "EnvAudio" },
  { property: "musicBattleId", label: "MusicBattle" },
  { property: "musicDayId", label: "MusicDay" },
  { property: "musicNightId", label: "MusicNight" },
  { property: "musicDelayMilliseconds", label: "MusicDelay" },
] as const);

export type AreaAudioEnvironmentProperty =
  (typeof AREA_AUDIO_ENVIRONMENT_FIELD_MAPPINGS)[number]["property"];

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

const EXACT_KEYS = new Set<AreaAudioEnvironmentProperty>(
  AREA_AUDIO_ENVIRONMENT_FIELD_MAPPINGS.map(({ property }) => property),
);
const MAX_SIGNED_GFF_INT = 0x7fff_ffff;

export function isAreaAudioEnvironment(value: unknown): value is AreaAudioEnvironment {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record);
  if (keys.length !== EXACT_KEYS.size || keys.some((key) => !EXACT_KEYS.has(
    key as AreaAudioEnvironmentProperty,
  ))) return false;

  for (const property of [
    "ambientSoundDayId",
    "ambientSoundNightId",
    "environmentAudioId",
    "musicBattleId",
    "musicDayId",
    "musicNightId",
  ] as const) {
    const candidate = record[property];
    if (!Number.isInteger(candidate) || (candidate as number) < 0 ||
        (candidate as number) > MAX_SIGNED_GFF_INT) return false;
  }
  for (const property of [
    "ambientSoundDayVolume",
    "ambientSoundNightVolume",
  ] as const) {
    const candidate = record[property];
    if (!Number.isInteger(candidate) || (candidate as number) < 0 ||
        (candidate as number) > 127) return false;
  }
  const delay = record.musicDelayMilliseconds;
  return Number.isInteger(delay) &&
    (delay as number) >= -99_000 &&
    (delay as number) <= 99_000 &&
    (delay as number) % 1000 === 0;
}

export function areaAudioEnvironmentsEqual(
  left: unknown,
  right: unknown,
): boolean {
  if (!isAreaAudioEnvironment(left) || !isAreaAudioEnvironment(right)) return false;
  return AREA_AUDIO_ENVIRONMENT_FIELD_MAPPINGS.every(
    ({ property }) => left[property] === right[property],
  );
}
