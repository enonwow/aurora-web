import type { AreaAudioEnvironmentProperty } from "./areaAudioEnvironment";

export const AREA_AUDIO_ENVIRONMENT_CATALOGS_SCHEMA_VERSION =
  "area-audio-environment-catalogs.v1" as const;
export const MAX_EFFECTIVE_AREA_AUDIO_TWO_DA_BYTES = 16 * 1024 * 1024;
export const MAX_EFFECTIVE_AREA_AUDIO_TWO_DA_ROWS = 4096;
export const MAX_EFFECTIVE_AREA_AUDIO_CATALOG_BUNDLE_BYTES = 2 * 1024 * 1024;
export const MAX_EFFECTIVE_AREA_AUDIO_SOURCE_KEY_CODE_UNITS = 2048;
export const MAX_EFFECTIVE_AREA_AUDIO_LABEL_CODE_UNITS = 256;
export const MAX_EFFECTIVE_AREA_AUDIO_DISPLAY_CODE_UNITS = 1024;

export type EffectiveAreaAudioResourceName =
  | "ambientsound.2da"
  | "ambientmusic.2da"
  | "soundeax.2da";
export type EffectiveAreaAudioSourceLayer = "module" | "hak" | "vanilla";
export type EffectiveAreaAudioDisplaySource =
  | "strref"
  | "display_name"
  | "label"
  | "resource"
  | "row_index";

export interface EffectiveAreaAudioCatalogDescriptor {
  readonly resourceName: EffectiveAreaAudioResourceName;
  readonly sourceObjectKey: string;
  readonly sourceLayer: EffectiveAreaAudioSourceLayer;
  readonly sha256: string;
  readonly sizeBytes: number;
  readonly rowCount: number;
}

export interface EffectiveAreaAudioCatalogRow {
  readonly rowIndex: number;
  readonly descriptionStrRef?: number;
  readonly resourceResRef?: string;
  readonly displayNameRaw?: string;
  readonly label?: string;
  readonly battleEligible?: boolean;
  readonly displayName: string;
  readonly displaySource: EffectiveAreaAudioDisplaySource;
}

export interface EffectiveAreaAudioCatalog {
  readonly descriptor: EffectiveAreaAudioCatalogDescriptor;
  readonly rows: readonly EffectiveAreaAudioCatalogRow[];
}

export interface EffectiveAreaAudioCatalogBundle {
  readonly schemaVersion: typeof AREA_AUDIO_ENVIRONMENT_CATALOGS_SCHEMA_VERSION;
  readonly ambientSound: EffectiveAreaAudioCatalog;
  readonly ambientMusic: EffectiveAreaAudioCatalog;
  readonly environmentalAudio: EffectiveAreaAudioCatalog;
}

export type AreaAudioCatalogBackedProperty = Extract<
  AreaAudioEnvironmentProperty,
  | "ambientSoundDayId"
  | "ambientSoundNightId"
  | "environmentAudioId"
  | "musicBattleId"
  | "musicDayId"
  | "musicNightId"
>;

export function isEffectiveAreaAudioCatalogBundle(
  value: unknown,
): value is EffectiveAreaAudioCatalogBundle {
  if (!isRecord(value) || !hasExactKeys(value, [
    "schemaVersion", "ambientSound", "ambientMusic", "environmentalAudio",
  ]) || value.schemaVersion !== AREA_AUDIO_ENVIRONMENT_CATALOGS_SCHEMA_VERSION) return false;
  if (!isCatalog(value.ambientSound, "ambientsound.2da")
      || !isCatalog(value.ambientMusic, "ambientmusic.2da")
      || !isCatalog(value.environmentalAudio, "soundeax.2da")) return false;
  try {
    return new TextEncoder().encode(JSON.stringify(value)).byteLength <=
      MAX_EFFECTIVE_AREA_AUDIO_CATALOG_BUNDLE_BYTES;
  } catch {
    return false;
  }
}

export function cloneEffectiveAreaAudioCatalogBundle(
  value: EffectiveAreaAudioCatalogBundle,
): EffectiveAreaAudioCatalogBundle {
  const cloneCatalog = (catalog: EffectiveAreaAudioCatalog): EffectiveAreaAudioCatalog =>
    Object.freeze({
      descriptor: Object.freeze({ ...catalog.descriptor }),
      rows: Object.freeze(catalog.rows.map((row) => Object.freeze({ ...row }))),
    });
  return Object.freeze({
    schemaVersion: AREA_AUDIO_ENVIRONMENT_CATALOGS_SCHEMA_VERSION,
    ambientSound: cloneCatalog(value.ambientSound),
    ambientMusic: cloneCatalog(value.ambientMusic),
    environmentalAudio: cloneCatalog(value.environmentalAudio),
  });
}

export function resolveEffectiveAreaAudioRows(
  catalogs: EffectiveAreaAudioCatalogBundle,
  property: AreaAudioCatalogBackedProperty,
): readonly EffectiveAreaAudioCatalogRow[] {
  if (property === "ambientSoundDayId" || property === "ambientSoundNightId") {
    return catalogs.ambientSound.rows;
  }
  if (property === "environmentAudioId") return catalogs.environmentalAudio.rows;
  if (property === "musicBattleId") {
    return catalogs.ambientMusic.rows.filter((row) => row.battleEligible === true);
  }
  return catalogs.ambientMusic.rows.filter((row) => row.battleEligible === false);
}

function isCatalog(
  value: unknown,
  resourceName: EffectiveAreaAudioResourceName,
): value is EffectiveAreaAudioCatalog {
  if (!isRecord(value) || !hasExactKeys(value, ["descriptor", "rows"])
      || !isDescriptor(value.descriptor, resourceName) || !Array.isArray(value.rows)
      || value.rows.length !== value.descriptor.rowCount) return false;
  let previousRowIndex = -1;
  for (const row of value.rows) {
    if (!isRow(row, resourceName) || row.rowIndex <= previousRowIndex) return false;
    previousRowIndex = row.rowIndex;
  }
  return true;
}

function isDescriptor(
  value: unknown,
  resourceName: EffectiveAreaAudioResourceName,
): value is EffectiveAreaAudioCatalogDescriptor {
  return isRecord(value) && hasExactKeys(value, [
    "resourceName", "sourceObjectKey", "sourceLayer", "sha256", "sizeBytes", "rowCount",
  ]) && value.resourceName === resourceName && isBoundedText(
    value.sourceObjectKey,
    MAX_EFFECTIVE_AREA_AUDIO_SOURCE_KEY_CODE_UNITS,
  ) && (value.sourceLayer === "module" || value.sourceLayer === "hak"
    || value.sourceLayer === "vanilla") && typeof value.sha256 === "string"
    && /^[a-f0-9]{64}$/u.test(value.sha256) && isIntegerInRange(
      value.sizeBytes,
      1,
      MAX_EFFECTIVE_AREA_AUDIO_TWO_DA_BYTES,
    ) && isIntegerInRange(value.rowCount, 1, MAX_EFFECTIVE_AREA_AUDIO_TWO_DA_ROWS);
}

function isRow(
  value: unknown,
  resourceName: EffectiveAreaAudioResourceName,
): value is EffectiveAreaAudioCatalogRow {
  if (!isRecord(value)) return false;
  const allowed = resourceName === "soundeax.2da"
    ? ["rowIndex", "label", "descriptionStrRef", "displayName", "displaySource"]
    : resourceName === "ambientmusic.2da"
      ? [
          "rowIndex", "descriptionStrRef", "resourceResRef", "displayNameRaw",
          "battleEligible", "displayName", "displaySource",
        ]
      : [
          "rowIndex", "descriptionStrRef", "resourceResRef", "displayNameRaw",
          "displayName", "displaySource",
        ];
  return Object.keys(value).every((key) => allowed.includes(key))
    && isIntegerInRange(value.rowIndex, 0, Number.MAX_SAFE_INTEGER)
    && isBoundedText(value.displayName, MAX_EFFECTIVE_AREA_AUDIO_DISPLAY_CODE_UNITS)
    && (value.displaySource === "strref" || value.displaySource === "display_name"
      || value.displaySource === "label" || value.displaySource === "resource"
      || value.displaySource === "row_index")
    && (value.descriptionStrRef === undefined
      || isIntegerInRange(value.descriptionStrRef, 0, 0xffff_ffff))
    && (value.resourceResRef === undefined || (typeof value.resourceResRef === "string"
      && /^[A-Za-z0-9_]{1,16}$/u.test(value.resourceResRef)))
    && (value.displayNameRaw === undefined || isBoundedText(
      value.displayNameRaw,
      MAX_EFFECTIVE_AREA_AUDIO_LABEL_CODE_UNITS,
    ))
    && (value.label === undefined || isBoundedText(
      value.label,
      MAX_EFFECTIVE_AREA_AUDIO_LABEL_CODE_UNITS,
    ))
    && (resourceName !== "ambientmusic.2da" || typeof value.battleEligible === "boolean");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    && Object.getPrototypeOf(value) === Object.prototype;
}

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const keys = Object.keys(value);
  return keys.length === expected.length && expected.every((key) => keys.includes(key));
}

function isBoundedText(value: unknown, maxCodeUnits: number): value is string {
  return typeof value === "string" && value.length >= 1 && value.length <= maxCodeUnits
    && !value.includes("\0");
}

function isIntegerInRange(value: unknown, minimum: number, maximum: number): value is number {
  return Number.isSafeInteger(value) && Number(value) >= minimum && Number(value) <= maximum;
}
