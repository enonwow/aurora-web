export const AREA_LOADING_SCREEN_CATALOG_SCHEMA_VERSION =
  "area-loading-screen-catalog.v1" as const;
export const MAX_EFFECTIVE_AREA_LOADING_SCREEN_TWO_DA_BYTES = 16 * 1024 * 1024;
export const MAX_EFFECTIVE_AREA_LOADING_SCREEN_ROWS = 4096;
export const MAX_EFFECTIVE_AREA_LOADING_SCREEN_IMAGE_BYTES = 16 * 1024 * 1024;
export const MAX_EFFECTIVE_AREA_LOADING_SCREEN_CATALOG_BYTES = 1024 * 1024;
export const MAX_EFFECTIVE_AREA_LOADING_SCREEN_SOURCE_KEY_CODE_UNITS = 2048;
export const MAX_EFFECTIVE_AREA_LOADING_SCREEN_LABEL_CODE_UNITS = 256;
export const MAX_EFFECTIVE_AREA_LOADING_SCREEN_DISPLAY_CODE_UNITS = 1024;

export type EffectiveAreaLoadingScreenSourceLayer = "module" | "hak" | "vanilla";
export type EffectiveAreaLoadingScreenDisplaySource =
  | "area_default_strref"
  | "strref"
  | "label"
  | "row_index";

export interface EffectiveAreaLoadingScreenDescriptor {
  readonly resourceName: "loadscreens.2da";
  readonly sourceObjectKey: string;
  readonly sourceLayer: EffectiveAreaLoadingScreenSourceLayer;
  readonly sha256: string;
  readonly sizeBytes: number;
  readonly rowCount: number;
}

export interface EffectiveAreaLoadingScreenImageAsset {
  readonly resourceName: string;
  readonly sourceObjectKey: string;
  readonly sourceLayer: EffectiveAreaLoadingScreenSourceLayer;
  readonly sha256: string;
  readonly sizeBytes: number;
}

export interface EffectiveAreaLoadingScreenCatalogRow {
  readonly rowIndex: number;
  readonly sourceRowId: number;
  readonly label?: string;
  readonly imageResRef?: string;
  readonly tileSetResRef?: string;
  readonly strRef?: number;
  readonly displayName: string;
  readonly displaySource: EffectiveAreaLoadingScreenDisplaySource;
  readonly toolsetSelectable: boolean;
  readonly imageAsset?: EffectiveAreaLoadingScreenImageAsset;
}

export interface EffectiveAreaLoadingScreenCatalog {
  readonly schemaVersion: typeof AREA_LOADING_SCREEN_CATALOG_SCHEMA_VERSION;
  readonly descriptor: EffectiveAreaLoadingScreenDescriptor;
  readonly rows: readonly EffectiveAreaLoadingScreenCatalogRow[];
}

export interface EffectiveAreaLoadingScreenOption {
  readonly value: number;
  readonly displayName: string;
  readonly state: "selectable" | "retained";
  readonly row?: EffectiveAreaLoadingScreenCatalogRow;
}

export function isEffectiveAreaLoadingScreenCatalog(
  value: unknown,
): value is EffectiveAreaLoadingScreenCatalog {
  if (!isRecord(value) || !hasExactKeys(value, ["schemaVersion", "descriptor", "rows"])
      || value.schemaVersion !== AREA_LOADING_SCREEN_CATALOG_SCHEMA_VERSION
      || !isDescriptor(value.descriptor) || !Array.isArray(value.rows)
      || value.rows.length !== value.descriptor.rowCount) return false;
  for (let index = 0; index < value.rows.length; index += 1) {
    if (!isRow(value.rows[index], index)) return false;
  }
  try {
    return new TextEncoder().encode(JSON.stringify(value)).byteLength <=
      MAX_EFFECTIVE_AREA_LOADING_SCREEN_CATALOG_BYTES;
  } catch {
    return false;
  }
}

export function cloneEffectiveAreaLoadingScreenCatalog(
  value: EffectiveAreaLoadingScreenCatalog,
): EffectiveAreaLoadingScreenCatalog {
  return Object.freeze({
    schemaVersion: AREA_LOADING_SCREEN_CATALOG_SCHEMA_VERSION,
    descriptor: Object.freeze({ ...value.descriptor }),
    rows: Object.freeze(value.rows.map((row) => Object.freeze({
      ...row,
      ...(row.imageAsset
        ? { imageAsset: Object.freeze({ ...row.imageAsset }) }
        : {}),
    }))),
  });
}

export function resolveEffectiveAreaLoadingScreenOptions(
  catalog: EffectiveAreaLoadingScreenCatalog,
  currentValue: number,
): readonly EffectiveAreaLoadingScreenOption[] {
  const options: EffectiveAreaLoadingScreenOption[] = [];
  const defaultRow = catalog.rows[0];
  options.push(Object.freeze({
    value: 0,
    displayName: defaultRow?.displayName ?? "Row 0",
    state: "selectable" as const,
    ...(defaultRow ? { row: defaultRow } : {}),
  }));
  for (const row of catalog.rows) {
    if (row.rowIndex === 0 || !row.toolsetSelectable) continue;
    options.push(Object.freeze({
      value: row.rowIndex,
      displayName: row.displayName,
      state: "selectable" as const,
      row,
    }));
  }
  if (!options.some((option) => option.value === currentValue)) {
    const retainedRow = catalog.rows[currentValue];
    options.push(Object.freeze({
      value: currentValue,
      displayName: retainedRow?.displayName ?? `Row ${currentValue}`,
      state: "retained" as const,
      ...(retainedRow ? { row: retainedRow } : {}),
    }));
  }
  return Object.freeze(options);
}

function isDescriptor(value: unknown): value is EffectiveAreaLoadingScreenDescriptor {
  return isRecord(value) && hasExactKeys(value, [
    "resourceName", "sourceObjectKey", "sourceLayer", "sha256", "sizeBytes", "rowCount",
  ]) && value.resourceName === "loadscreens.2da" && isBoundedText(
    value.sourceObjectKey,
    MAX_EFFECTIVE_AREA_LOADING_SCREEN_SOURCE_KEY_CODE_UNITS,
  ) && isSourceLayer(value.sourceLayer) && typeof value.sha256 === "string"
    && /^[a-f0-9]{64}$/u.test(value.sha256) && isIntegerInRange(
      value.sizeBytes,
      1,
      MAX_EFFECTIVE_AREA_LOADING_SCREEN_TWO_DA_BYTES,
    ) && isIntegerInRange(value.rowCount, 1, MAX_EFFECTIVE_AREA_LOADING_SCREEN_ROWS);
}

function isRow(value: unknown, expectedRowIndex: number): value is EffectiveAreaLoadingScreenCatalogRow {
  if (!isRecord(value)) return false;
  const allowedKeys = [
    "rowIndex", "sourceRowId", "label", "imageResRef", "tileSetResRef", "strRef",
    "displayName", "displaySource", "toolsetSelectable", "imageAsset",
  ];
  if (Object.keys(value).some((key) => !allowedKeys.includes(key))
      || value.rowIndex !== expectedRowIndex
      || !isIntegerInRange(value.sourceRowId, 0, Number.MAX_SAFE_INTEGER)
      || (value.label !== undefined && !isBoundedText(
        value.label,
        MAX_EFFECTIVE_AREA_LOADING_SCREEN_LABEL_CODE_UNITS,
      ))
      || (value.imageResRef !== undefined && !isResRef(value.imageResRef))
      || (value.tileSetResRef !== undefined && !isResRef(value.tileSetResRef))
      || (value.strRef !== undefined && !isIntegerInRange(value.strRef, 0, 0xffff_ffff))
      || !isBoundedText(value.displayName, MAX_EFFECTIVE_AREA_LOADING_SCREEN_DISPLAY_CODE_UNITS)
      || typeof value.toolsetSelectable !== "boolean"
      || !isDisplaySource(value.displaySource)) return false;
  if ((value.imageAsset !== undefined) !== value.toolsetSelectable) return false;
  if (value.imageAsset !== undefined && (
    typeof value.imageResRef !== "string" || !isImageAsset(value.imageAsset, value.imageResRef)
  )) return false;
  if (value.displaySource === "area_default_strref" && value.rowIndex !== 0) return false;
  if (value.displaySource === "strref" && (value.rowIndex === 0 || value.strRef === undefined)) {
    return false;
  }
  if (value.displaySource === "label" && (value.rowIndex === 0 || value.label === undefined)) {
    return false;
  }
  return true;
}

function isImageAsset(
  value: unknown,
  imageResRef: string,
): value is EffectiveAreaLoadingScreenImageAsset {
  return isRecord(value) && hasExactKeys(value, [
    "resourceName", "sourceObjectKey", "sourceLayer", "sha256", "sizeBytes",
  ]) && value.resourceName === `${imageResRef.toLowerCase()}.tga`
    && isBoundedText(value.sourceObjectKey, MAX_EFFECTIVE_AREA_LOADING_SCREEN_SOURCE_KEY_CODE_UNITS)
    && isSourceLayer(value.sourceLayer) && typeof value.sha256 === "string"
    && /^[a-f0-9]{64}$/u.test(value.sha256)
    && isIntegerInRange(value.sizeBytes, 1, MAX_EFFECTIVE_AREA_LOADING_SCREEN_IMAGE_BYTES);
}

function isDisplaySource(value: unknown): value is EffectiveAreaLoadingScreenDisplaySource {
  return value === "area_default_strref" || value === "strref" || value === "label"
    || value === "row_index";
}

function isSourceLayer(value: unknown): value is EffectiveAreaLoadingScreenSourceLayer {
  return value === "module" || value === "hak" || value === "vanilla";
}

function isResRef(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_]{1,16}$/u.test(value);
}

function isBoundedText(value: unknown, maxCodeUnits: number): value is string {
  return typeof value === "string" && value.length >= 1 && value.length <= maxCodeUnits
    && !value.includes("\0");
}

function isIntegerInRange(value: unknown, minimum: number, maximum: number): value is number {
  return Number.isSafeInteger(value) && Number(value) >= minimum && Number(value) <= maximum;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    && Object.getPrototypeOf(value) === Object.prototype;
}

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const keys = Object.keys(value);
  return keys.length === expected.length && expected.every((key) => keys.includes(key));
}
