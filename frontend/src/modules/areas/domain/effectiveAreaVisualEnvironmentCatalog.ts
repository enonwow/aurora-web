import {
  cloneAreaVisualEnvironment,
  isAreaVisualEnvironment,
  type AreaVisualEnvironment,
} from "./areaVisualEnvironment";
import {
  cloneAreaVisualEnvironmentScalarControls,
  isAreaVisualEnvironmentScalarControls,
  type AreaVisualEnvironmentScalarControls,
} from "./areaVisualEnvironmentScalarControls";

export const AREA_VISUAL_ENVIRONMENT_CATALOGS_SCHEMA_VERSION =
  "area-visual-environment-catalogs.v1" as const;
export const MAX_EFFECTIVE_AREA_VISUAL_TWO_DA_BYTES = 16 * 1024 * 1024;
export const MAX_EFFECTIVE_AREA_VISUAL_ROWS = 256;
export const MAX_EFFECTIVE_AREA_VISUAL_CATALOG_BUNDLE_BYTES = 2 * 1024 * 1024;
export const MAX_EFFECTIVE_AREA_VISUAL_SOURCE_KEY_CODE_UNITS = 2048;
export const MAX_EFFECTIVE_AREA_VISUAL_LABEL_CODE_UNITS = 256;
export const MAX_EFFECTIVE_AREA_VISUAL_DISPLAY_CODE_UNITS = 1024;

export type EffectiveAreaVisualResourceName = "environment.2da" | "skyboxes.2da";
export type EffectiveAreaVisualSourceLayer = "module" | "hak" | "vanilla";
export type EffectiveAreaVisualDisplaySource = "strref" | "label" | "row_index";

export interface EffectiveAreaVisualCatalogDescriptor {
  readonly resourceName: EffectiveAreaVisualResourceName;
  readonly sourceObjectKey: string;
  readonly sourceLayer: EffectiveAreaVisualSourceLayer;
  readonly sha256: string;
  readonly sizeBytes: number;
  readonly rowCount: number;
}

export interface EffectiveAreaLightingSchemeCatalogRow {
  readonly rowIndex: number;
  readonly label?: string;
  readonly strRef?: number;
  readonly displayName: string;
  readonly displaySource: EffectiveAreaVisualDisplaySource;
  readonly visualEnvironment: AreaVisualEnvironment;
  readonly visualEnvironmentScalarControls: AreaVisualEnvironmentScalarControls;
  readonly skyBoxRowIndex: number;
}

export interface EffectiveAreaSkyBoxCatalogRow {
  readonly rowIndex: number;
  readonly label?: string;
  readonly stringRef?: number;
  readonly displayName: string;
  readonly displaySource: EffectiveAreaVisualDisplaySource;
}

export interface EffectiveAreaLightingSchemeCatalog {
  readonly descriptor: EffectiveAreaVisualCatalogDescriptor & {
    readonly resourceName: "environment.2da";
  };
  readonly rows: readonly EffectiveAreaLightingSchemeCatalogRow[];
}

export interface EffectiveAreaSkyBoxCatalog {
  readonly descriptor: EffectiveAreaVisualCatalogDescriptor & {
    readonly resourceName: "skyboxes.2da";
  };
  readonly rows: readonly EffectiveAreaSkyBoxCatalogRow[];
}

export interface EffectiveAreaVisualEnvironmentCatalogBundle {
  readonly schemaVersion: typeof AREA_VISUAL_ENVIRONMENT_CATALOGS_SCHEMA_VERSION;
  readonly lightingSchemes: EffectiveAreaLightingSchemeCatalog;
  readonly skyBoxes: EffectiveAreaSkyBoxCatalog;
}

export function isEffectiveAreaVisualEnvironmentCatalogBundle(
  value: unknown,
): value is EffectiveAreaVisualEnvironmentCatalogBundle {
  if (!isRecord(value) || !hasExactKeys(value, [
    "schemaVersion", "lightingSchemes", "skyBoxes",
  ]) || value.schemaVersion !== AREA_VISUAL_ENVIRONMENT_CATALOGS_SCHEMA_VERSION
      || !isCatalog(value.lightingSchemes, "environment.2da")
      || !isCatalog(value.skyBoxes, "skyboxes.2da")) return false;
  try {
    return new TextEncoder().encode(JSON.stringify(value)).byteLength <=
      MAX_EFFECTIVE_AREA_VISUAL_CATALOG_BUNDLE_BYTES;
  } catch {
    return false;
  }
}

export function cloneEffectiveAreaVisualEnvironmentCatalogBundle(
  value: EffectiveAreaVisualEnvironmentCatalogBundle,
): EffectiveAreaVisualEnvironmentCatalogBundle {
  return Object.freeze({
    schemaVersion: AREA_VISUAL_ENVIRONMENT_CATALOGS_SCHEMA_VERSION,
    lightingSchemes: Object.freeze({
      descriptor: Object.freeze({ ...value.lightingSchemes.descriptor }),
      rows: Object.freeze(value.lightingSchemes.rows.map((row) => Object.freeze({
        ...row,
        visualEnvironment: Object.freeze(cloneAreaVisualEnvironment(row.visualEnvironment)),
        visualEnvironmentScalarControls: Object.freeze(
          cloneAreaVisualEnvironmentScalarControls(row.visualEnvironmentScalarControls),
        ),
      }))),
    }),
    skyBoxes: Object.freeze({
      descriptor: Object.freeze({ ...value.skyBoxes.descriptor }),
      rows: Object.freeze(value.skyBoxes.rows.map((row) => Object.freeze({ ...row }))),
    }),
  });
}

function isCatalog(
  value: unknown,
  resourceName: EffectiveAreaVisualResourceName,
): boolean {
  if (!isRecord(value) || !hasExactKeys(value, ["descriptor", "rows"])
      || !isDescriptor(value.descriptor, resourceName) || !Array.isArray(value.rows)
      || value.rows.length !== value.descriptor.rowCount) return false;
  return value.rows.every((row, index) => resourceName === "environment.2da"
    ? isLightingSchemeRow(row, index)
    : isSkyBoxRow(row, index));
}

function isDescriptor(
  value: unknown,
  resourceName: EffectiveAreaVisualResourceName,
): value is EffectiveAreaVisualCatalogDescriptor {
  return isRecord(value) && hasExactKeys(value, [
    "resourceName", "sourceObjectKey", "sourceLayer", "sha256", "sizeBytes", "rowCount",
  ]) && value.resourceName === resourceName
    && isBoundedText(value.sourceObjectKey, MAX_EFFECTIVE_AREA_VISUAL_SOURCE_KEY_CODE_UNITS)
    && isSourceLayer(value.sourceLayer) && typeof value.sha256 === "string"
    && /^[a-f0-9]{64}$/u.test(value.sha256)
    && isIntegerInRange(value.sizeBytes, 1, MAX_EFFECTIVE_AREA_VISUAL_TWO_DA_BYTES)
    && isIntegerInRange(value.rowCount, 1, MAX_EFFECTIVE_AREA_VISUAL_ROWS);
}

function isLightingSchemeRow(value: unknown, expectedRowIndex: number): boolean {
  if (!isRecord(value)) return false;
  const allowed = [
    "rowIndex", "label", "strRef", "displayName", "displaySource",
    "visualEnvironment", "visualEnvironmentScalarControls", "skyBoxRowIndex",
  ];
  return Object.keys(value).every((key) => allowed.includes(key))
    && value.rowIndex === expectedRowIndex
    && isOptionalBoundedText(value.label, MAX_EFFECTIVE_AREA_VISUAL_LABEL_CODE_UNITS)
    && (value.strRef === undefined || isIntegerInRange(value.strRef, 0, 0xffff_ffff))
    && isBoundedText(value.displayName, MAX_EFFECTIVE_AREA_VISUAL_DISPLAY_CODE_UNITS)
    && isDisplaySource(value.displaySource)
    && isAreaVisualEnvironment(value.visualEnvironment)
    && isAreaVisualEnvironmentScalarControls(value.visualEnvironmentScalarControls)
    && isIntegerInRange(value.skyBoxRowIndex, 0, MAX_EFFECTIVE_AREA_VISUAL_ROWS - 1);
}

function isSkyBoxRow(value: unknown, expectedRowIndex: number): boolean {
  if (!isRecord(value)) return false;
  const allowed = ["rowIndex", "label", "stringRef", "displayName", "displaySource"];
  return Object.keys(value).every((key) => allowed.includes(key))
    && value.rowIndex === expectedRowIndex
    && isOptionalBoundedText(value.label, MAX_EFFECTIVE_AREA_VISUAL_LABEL_CODE_UNITS)
    && (value.stringRef === undefined || isIntegerInRange(value.stringRef, 0, 0xffff_ffff))
    && isBoundedText(value.displayName, MAX_EFFECTIVE_AREA_VISUAL_DISPLAY_CODE_UNITS)
    && isDisplaySource(value.displaySource);
}

function isDisplaySource(value: unknown): value is EffectiveAreaVisualDisplaySource {
  return value === "strref" || value === "label" || value === "row_index";
}

function isSourceLayer(value: unknown): value is EffectiveAreaVisualSourceLayer {
  return value === "module" || value === "hak" || value === "vanilla";
}

function isOptionalBoundedText(value: unknown, maximum: number): boolean {
  return value === undefined || isBoundedText(value, maximum);
}

function isBoundedText(value: unknown, maximum: number): value is string {
  return typeof value === "string" && value.length >= 1 && value.length <= maximum
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
