import { createHash } from "node:crypto";
import {
  BLANK_CELL,
  parseAuroraTwoDaTable,
  type AuroraTwoDaRow,
} from "../../../common/aurora/two-da/aurora-two-da-table";
import type { AreaVisualEnvironment } from "../../areas/domain/area-visual-environment";
import type { AreaVisualEnvironmentScalarControls } from "../../areas/domain/area-visual-environment-scalar-controls";

export const AREA_VISUAL_ENVIRONMENT_CATALOGS_SCHEMA_VERSION =
  "area-visual-environment-catalogs.v1" as const;
export const MAX_EFFECTIVE_AREA_VISUAL_TWO_DA_BYTES = 16 * 1024 * 1024;
export const MAX_EFFECTIVE_AREA_VISUAL_ROWS = 256;
export const MAX_EFFECTIVE_AREA_VISUAL_CATALOG_BUNDLE_BYTES = 2 * 1024 * 1024;
const MAX_SOURCE_KEY_CODE_UNITS = 2048;
const MAX_LABEL_CODE_UNITS = 256;
const MAX_DISPLAY_CODE_UNITS = 1024;

export type EffectiveAreaVisualResourceName = "environment.2da" | "skyboxes.2da";
export type EffectiveAreaVisualSourceLayer = "module" | "hak" | "vanilla";
export type EffectiveAreaVisualDisplaySource = "strref" | "label" | "row_index";

export interface EffectiveAreaVisualTwoDaDescriptor {
  readonly resourceName: EffectiveAreaVisualResourceName;
  readonly sourceObjectKey: string;
  readonly sourceLayer: EffectiveAreaVisualSourceLayer;
  readonly sha256: string;
  readonly sizeBytes: number;
  readonly rowCount: number;
}

export interface EffectiveAreaLightingSchemeSourceRow {
  readonly rowIndex: number;
  readonly label?: string;
  readonly strRef?: number;
  readonly visualEnvironment: AreaVisualEnvironment;
  readonly visualEnvironmentScalarControls: AreaVisualEnvironmentScalarControls;
  readonly skyBoxRowIndex: number;
}

export interface EffectiveAreaLightingSchemeCatalogRow
  extends EffectiveAreaLightingSchemeSourceRow {
  readonly displayName: string;
  readonly displaySource: EffectiveAreaVisualDisplaySource;
}

export interface EffectiveAreaSkyBoxSourceRow {
  readonly rowIndex: number;
  readonly label?: string;
  readonly stringRef?: number;
}

export interface EffectiveAreaSkyBoxCatalogRow extends EffectiveAreaSkyBoxSourceRow {
  readonly displayName: string;
  readonly displaySource: EffectiveAreaVisualDisplaySource;
}

export interface EffectiveAreaEnvironmentTwoDaTable {
  readonly descriptor: EffectiveAreaVisualTwoDaDescriptor & {
    readonly resourceName: "environment.2da";
  };
  readonly rows: readonly EffectiveAreaLightingSchemeSourceRow[];
}

export interface EffectiveAreaSkyBoxesTwoDaTable {
  readonly descriptor: EffectiveAreaVisualTwoDaDescriptor & {
    readonly resourceName: "skyboxes.2da";
  };
  readonly rows: readonly EffectiveAreaSkyBoxSourceRow[];
}

export interface EffectiveAreaLightingSchemeCatalog {
  readonly descriptor: EffectiveAreaEnvironmentTwoDaTable["descriptor"];
  readonly rows: readonly EffectiveAreaLightingSchemeCatalogRow[];
}

export interface EffectiveAreaSkyBoxCatalog {
  readonly descriptor: EffectiveAreaSkyBoxesTwoDaTable["descriptor"];
  readonly rows: readonly EffectiveAreaSkyBoxCatalogRow[];
}

export interface EffectiveAreaVisualEnvironmentCatalogBundle {
  readonly schemaVersion: typeof AREA_VISUAL_ENVIRONMENT_CATALOGS_SCHEMA_VERSION;
  readonly lightingSchemes: EffectiveAreaLightingSchemeCatalog;
  readonly skyBoxes: EffectiveAreaSkyBoxCatalog;
}

export interface EffectiveAreaVisualTwoDaInput {
  readonly bytes: Buffer;
  readonly sourceObjectKey: string;
  readonly sourceLayer: EffectiveAreaVisualSourceLayer;
}

const ENVIRONMENT_REQUIRED_COLUMNS = Object.freeze([
  "LABEL", "STRREF", "DAYNIGHT",
  "LIGHT_AMB_RED", "LIGHT_AMB_GREEN", "LIGHT_AMB_BLUE",
  "LIGHT_DIFF_RED", "LIGHT_DIFF_GREEN", "LIGHT_DIFF_BLUE", "LIGHT_SHADOWS",
  "DARK_AMB_RED", "DARK_AMB_GREEN", "DARK_AMB_BLUE",
  "DARK_DIFF_RED", "DARK_DIFF_GREEN", "DARK_DIFF_BLUE", "DARK_SHADOWS",
  "LIGHT_FOG_RED", "LIGHT_FOG_GREEN", "LIGHT_FOG_BLUE",
  "DARK_FOG_RED", "DARK_FOG_GREEN", "DARK_FOG_BLUE",
  "LIGHT_FOG", "DARK_FOG", "WIND", "SNOW", "RAIN", "LIGHTNING",
  "SHADOW_ALPHA",
] as const);
const ENVIRONMENT_OPTIONAL_COLUMNS = Object.freeze(["FOG_CLIP_DIST", "SKYBOX"] as const);

export function parseEffectiveAreaEnvironmentTwoDa(
  input: EffectiveAreaVisualTwoDaInput,
): EffectiveAreaEnvironmentTwoDaTable | null {
  const parsed = parseSource(input, "environment.2da");
  if (!parsed || !hasRequiredColumns(
    parsed.header,
    ENVIRONMENT_REQUIRED_COLUMNS,
    ENVIRONMENT_OPTIONAL_COLUMNS,
  )) return null;
  const rows: EffectiveAreaLightingSchemeSourceRow[] = [];
  for (const row of parsed.rows) {
    if (row.physicalRowIndex < 0 || row.physicalRowIndex >= MAX_EFFECTIVE_AREA_VISUAL_ROWS) {
      return null;
    }
    const value = parseEnvironmentRow(row, parsed.header);
    if (!value) return null;
    rows.push(Object.freeze({ rowIndex: row.physicalRowIndex, ...value }));
  }
  if (rows.length < 1 || rows.length > MAX_EFFECTIVE_AREA_VISUAL_ROWS) return null;
  return Object.freeze({
    descriptor: buildDescriptor(input, "environment.2da", rows.length),
    rows: Object.freeze(rows),
  });
}

export function parseEffectiveAreaSkyBoxesTwoDa(
  input: EffectiveAreaVisualTwoDaInput,
): EffectiveAreaSkyBoxesTwoDaTable | null {
  const parsed = parseSource(input, "skyboxes.2da");
  if (!parsed || !hasRequiredColumns(parsed.header, ["LABEL", "STRING_REF"], [])) {
    return null;
  }
  const rows: EffectiveAreaSkyBoxSourceRow[] = [];
  for (const row of parsed.rows) {
    if (row.physicalRowIndex < 0 || row.physicalRowIndex >= MAX_EFFECTIVE_AREA_VISUAL_ROWS) {
      return null;
    }
    const label = readOptionalText(row, "LABEL");
    const stringRef = readOptionalInteger(row, "STRING_REF", 0, 0xffff_ffff);
    if (label === null || stringRef === null) return null;
    rows.push(Object.freeze({
      rowIndex: row.physicalRowIndex,
      ...(label === undefined ? {} : { label }),
      ...(stringRef === undefined ? {} : { stringRef }),
    }));
  }
  if (rows.length < 1 || rows.length > MAX_EFFECTIVE_AREA_VISUAL_ROWS) return null;
  return Object.freeze({
    descriptor: buildDescriptor(input, "skyboxes.2da", rows.length),
    rows: Object.freeze(rows),
  });
}

export function buildEffectiveAreaLightingSchemeCatalog(
  table: EffectiveAreaEnvironmentTwoDaTable,
  resolveStrRef: (strRef: number) => string | undefined,
): EffectiveAreaLightingSchemeCatalog {
  return Object.freeze({
    descriptor: Object.freeze({ ...table.descriptor }),
    rows: Object.freeze(table.rows.map((row) => Object.freeze({
      ...cloneLightingSchemeSourceRow(row),
      ...resolveDisplay(row.strRef, row.label, row.rowIndex, resolveStrRef),
    }))),
  });
}

export function buildEffectiveAreaSkyBoxCatalog(
  table: EffectiveAreaSkyBoxesTwoDaTable,
  resolveStrRef: (strRef: number) => string | undefined,
): EffectiveAreaSkyBoxCatalog {
  return Object.freeze({
    descriptor: Object.freeze({ ...table.descriptor }),
    rows: Object.freeze(table.rows.map((row) => Object.freeze({
      ...row,
      ...resolveDisplay(row.stringRef, row.label, row.rowIndex, resolveStrRef),
    }))),
  });
}

export function isExactEffectiveAreaVisualEnvironmentCatalogBundle(
  value: unknown,
): value is EffectiveAreaVisualEnvironmentCatalogBundle {
  if (!isRecord(value) || !hasExactKeys(value, [
    "schemaVersion", "lightingSchemes", "skyBoxes",
  ]) || value.schemaVersion !== AREA_VISUAL_ENVIRONMENT_CATALOGS_SCHEMA_VERSION ||
      !isCatalog(value.lightingSchemes, "environment.2da") ||
      !isCatalog(value.skyBoxes, "skyboxes.2da")) return false;
  try {
    return Buffer.byteLength(JSON.stringify(value), "utf8") <=
      MAX_EFFECTIVE_AREA_VISUAL_CATALOG_BUNDLE_BYTES;
  } catch {
    return false;
  }
}

function parseSource(input: EffectiveAreaVisualTwoDaInput, resourceName: EffectiveAreaVisualResourceName) {
  if (!Buffer.isBuffer(input.bytes) || input.bytes.length < 1 ||
      input.bytes.length > MAX_EFFECTIVE_AREA_VISUAL_TWO_DA_BYTES ||
      !isBoundedText(input.sourceObjectKey, MAX_SOURCE_KEY_CODE_UNITS) ||
      !["module", "hak", "vanilla"].includes(input.sourceLayer)) return null;
  const sha256 = createHash("sha256").update(input.bytes).digest("hex");
  const table = parseAuroraTwoDaTable(input.bytes, {
    tableName: resourceName,
    profile: "effective-area-visual-environment-source-provenance",
    sourceObjectKey: input.sourceObjectKey,
    sourceLayer: input.sourceLayer,
    sourceHash: sha256,
  });
  if (table.diagnostics.some((entry) => entry.severity === "error")) return null;
  return table;
}

function buildDescriptor<TResourceName extends EffectiveAreaVisualResourceName>(
  input: EffectiveAreaVisualTwoDaInput,
  resourceName: TResourceName,
  rowCount: number,
): EffectiveAreaVisualTwoDaDescriptor & { readonly resourceName: TResourceName } {
  return Object.freeze({
    resourceName,
    sourceObjectKey: input.sourceObjectKey,
    sourceLayer: input.sourceLayer,
    sha256: createHash("sha256").update(input.bytes).digest("hex"),
    sizeBytes: input.bytes.length,
    rowCount,
  });
}

function parseEnvironmentRow(
  row: AuroraTwoDaRow,
  header: readonly string[],
): Omit<EffectiveAreaLightingSchemeSourceRow, "rowIndex"> | null {
  const label = readOptionalText(row, "LABEL");
  const strRef = readOptionalInteger(row, "STRREF", 0, 0xffff_ffff);
  const dayNight = readRequiredText(row, "DAYNIGHT");
  if (label === null || strRef === null || !dayNight ||
      !["cycle", "light", "dark"].includes(dayNight)) return null;
  const readBool = (column: string) => readRequiredInteger(row, column, 0, 1);
  const lightAmbient = readColor(row, "LIGHT_AMB");
  const lightDiffuse = readColor(row, "LIGHT_DIFF");
  const darkAmbient = readColor(row, "DARK_AMB");
  const darkDiffuse = readColor(row, "DARK_DIFF");
  const lightFog = readColor(row, "LIGHT_FOG");
  const darkFog = readColor(row, "DARK_FOG");
  const lightFogAmount = readRequiredInteger(row, "LIGHT_FOG", 0, 15);
  const darkFogAmount = readRequiredInteger(row, "DARK_FOG", 0, 15);
  const lightShadows = readBool("LIGHT_SHADOWS");
  const darkShadows = readBool("DARK_SHADOWS");
  const windPower = readRequiredInteger(row, "WIND", 0, 2);
  const chanceSnow = readRequiredInteger(row, "SNOW", 0, 100);
  const chanceRain = readRequiredInteger(row, "RAIN", 0, 100);
  const chanceLightning = readRequiredInteger(row, "LIGHTNING", 0, 100);
  const shadowAlpha = readRequiredFinite(row, "SHADOW_ALPHA", 0, 1);
  const shadowOpacity = shadowAlpha === null ? null : shadowAlpha * 100;
  const fogClipDistance = header.includes("FOG_CLIP_DIST")
    ? readRequiredFinite(row, "FOG_CLIP_DIST", 30, 9999)
    : 45;
  const skyBoxRowIndex = header.includes("SKYBOX")
    ? readRequiredInteger(row, "SKYBOX", 0, 255)
    : 0;
  if ([
    lightAmbient, lightDiffuse, darkAmbient, darkDiffuse, lightFog, darkFog,
    lightFogAmount, darkFogAmount, lightShadows, darkShadows, windPower,
    chanceSnow, chanceRain, chanceLightning, shadowOpacity, fogClipDistance,
    skyBoxRowIndex,
  ].some((value) => value === null) || !Number.isInteger(shadowOpacity) ||
      !Number.isInteger(fogClipDistance)) return null;
  return {
    ...(label === undefined ? {} : { label }),
    ...(strRef === undefined ? {} : { strRef }),
    visualEnvironment: Object.freeze({
      dayNightMode: dayNight === "cycle"
        ? "cycle"
        : dayNight === "light"
          ? "always_day"
          : "always_night",
      shadowOpacity: shadowOpacity!,
      chanceRain: chanceRain!,
      chanceSnow: chanceSnow!,
      chanceLightning: chanceLightning!,
      sun: Object.freeze({
        ambientColor: lightAmbient!,
        diffuseColor: lightDiffuse!,
        fogColor: lightFog!,
        fogAmount: lightFogAmount!,
        shadows: lightShadows === 1,
      }),
      moon: Object.freeze({
        ambientColor: darkAmbient!,
        diffuseColor: darkDiffuse!,
        fogColor: darkFog!,
        fogAmount: darkFogAmount!,
        shadows: darkShadows === 1,
      }),
    }),
    visualEnvironmentScalarControls: Object.freeze({
      fogClipDistance: fogClipDistance!,
      windPower: windPower!,
    }),
    skyBoxRowIndex: skyBoxRowIndex!,
  };
}

function readColor(row: AuroraTwoDaRow, prefix: string): number | null {
  const red = readRequiredInteger(row, `${prefix}_RED`, 0, 255);
  const green = readRequiredInteger(row, `${prefix}_GREEN`, 0, 255);
  const blue = readRequiredInteger(row, `${prefix}_BLUE`, 0, 255);
  return red === null || green === null || blue === null
    ? null
    : red | (green << 8) | (blue << 16);
}

function cloneLightingSchemeSourceRow(
  row: EffectiveAreaLightingSchemeSourceRow,
): EffectiveAreaLightingSchemeSourceRow {
  return {
    ...row,
    visualEnvironment: {
      ...row.visualEnvironment,
      sun: { ...row.visualEnvironment.sun },
      moon: { ...row.visualEnvironment.moon },
    },
    visualEnvironmentScalarControls: { ...row.visualEnvironmentScalarControls },
  };
}

function resolveDisplay(
  strRef: number | undefined,
  label: string | undefined,
  rowIndex: number,
  resolveStrRef: (strRef: number) => string | undefined,
): Pick<EffectiveAreaLightingSchemeCatalogRow, "displayName" | "displaySource"> {
  let localized: string | undefined;
  if (strRef !== undefined) {
    try {
      const value = resolveStrRef(strRef);
      localized = isBoundedText(value, MAX_DISPLAY_CODE_UNITS) ? value : undefined;
    } catch {
      localized = undefined;
    }
  }
  return localized
    ? { displayName: localized, displaySource: "strref" }
    : label
      ? { displayName: label, displaySource: "label" }
      : { displayName: `Row ${rowIndex}`, displaySource: "row_index" };
}

function hasRequiredColumns(
  header: readonly string[],
  required: readonly string[],
  optional: readonly string[],
): boolean {
  const admitted = new Set([...required, ...optional]);
  return required.every((column) => header.filter((value) => value === column).length === 1)
    && optional.every((column) => header.filter((value) => value === column).length <= 1)
    && header.every((column, index) => !admitted.has(column) || header.indexOf(column) === index);
}

function readRequiredText(row: AuroraTwoDaRow, column: string): string | null {
  const cell = row.cellsByColumn[column];
  return !cell || cell.missing || cell.blank || cell.value === BLANK_CELL
    ? null
    : cell.value;
}

function readOptionalText(row: AuroraTwoDaRow, column: string): string | undefined | null {
  const cell = row.cellsByColumn[column];
  if (!cell || cell.missing || cell.blank || cell.value === BLANK_CELL) return undefined;
  return isBoundedText(cell.value, MAX_LABEL_CODE_UNITS) ? cell.value : null;
}

function readRequiredInteger(
  row: AuroraTwoDaRow,
  column: string,
  minimum: number,
  maximum: number,
): number | null {
  const value = readRequiredText(row, column);
  if (value === null || !/^-?\d+$/u.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= minimum && parsed <= maximum ? parsed : null;
}

function readOptionalInteger(
  row: AuroraTwoDaRow,
  column: string,
  minimum: number,
  maximum: number,
): number | undefined | null {
  const cell = row.cellsByColumn[column];
  if (!cell || cell.missing || cell.blank || cell.value === BLANK_CELL) return undefined;
  return readRequiredInteger(row, column, minimum, maximum);
}

function readRequiredFinite(
  row: AuroraTwoDaRow,
  column: string,
  minimum: number,
  maximum: number,
): number | null {
  const value = readRequiredText(row, column);
  if (value === null || !/^-?(?:\d+(?:\.\d*)?|\.\d+)$/u.test(value)) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= minimum && parsed <= maximum ? parsed : null;
}

function isCatalog(
  value: unknown,
  resourceName: EffectiveAreaVisualResourceName,
): boolean {
  if (!isRecord(value) || !hasExactKeys(value, ["descriptor", "rows"]) ||
      !isDescriptor(value.descriptor, resourceName) || !Array.isArray(value.rows) ||
      value.rows.length !== value.descriptor.rowCount) return false;
  return value.rows.every((row, index) => resourceName === "environment.2da"
    ? isLightingSchemeCatalogRow(row, index)
    : isSkyBoxCatalogRow(row, index));
}

function isDescriptor(value: unknown, resourceName: EffectiveAreaVisualResourceName): value is EffectiveAreaVisualTwoDaDescriptor {
  return isRecord(value) && hasExactKeys(value, [
    "resourceName", "sourceObjectKey", "sourceLayer", "sha256", "sizeBytes", "rowCount",
  ]) && value.resourceName === resourceName &&
    isBoundedText(value.sourceObjectKey, MAX_SOURCE_KEY_CODE_UNITS) &&
    ["module", "hak", "vanilla"].includes(String(value.sourceLayer)) &&
    typeof value.sha256 === "string" && /^[a-f0-9]{64}$/u.test(value.sha256) &&
    isInteger(value.sizeBytes, 1, MAX_EFFECTIVE_AREA_VISUAL_TWO_DA_BYTES) &&
    isInteger(value.rowCount, 1, MAX_EFFECTIVE_AREA_VISUAL_ROWS);
}

function isLightingSchemeCatalogRow(value: unknown, index: number): boolean {
  if (!isRecord(value) || !hasAllowedKeys(value, [
    "rowIndex", "label", "strRef", "visualEnvironment",
    "visualEnvironmentScalarControls", "skyBoxRowIndex", "displayName", "displaySource",
  ]) || value.rowIndex !== index || !isBoundedText(value.displayName, MAX_DISPLAY_CODE_UNITS) ||
      !["strref", "label", "row_index"].includes(String(value.displaySource)) ||
      !isInteger(value.skyBoxRowIndex, 0, 255) ||
      !isRecord(value.visualEnvironment) || !isRecord(value.visualEnvironmentScalarControls)) {
    return false;
  }
  return isVisualEnvironment(value.visualEnvironment) &&
    isScalarControls(value.visualEnvironmentScalarControls) &&
    optionalDisplayFieldsValid(value, "strRef");
}

function isSkyBoxCatalogRow(value: unknown, index: number): boolean {
  return isRecord(value) && hasAllowedKeys(value, [
    "rowIndex", "label", "stringRef", "displayName", "displaySource",
  ]) && value.rowIndex === index && isBoundedText(value.displayName, MAX_DISPLAY_CODE_UNITS) &&
    ["strref", "label", "row_index"].includes(String(value.displaySource)) &&
    optionalDisplayFieldsValid(value, "stringRef");
}

function optionalDisplayFieldsValid(value: Record<string, unknown>, refKey: string): boolean {
  return (value.label === undefined || isBoundedText(value.label, MAX_LABEL_CODE_UNITS)) &&
    (value[refKey] === undefined || isInteger(value[refKey], 0, 0xffff_ffff));
}

function isVisualEnvironment(value: Record<string, unknown>): boolean {
  const phase = (candidate: unknown) => isRecord(candidate) && hasExactKeys(candidate, [
    "ambientColor", "diffuseColor", "fogColor", "fogAmount", "shadows",
  ]) && isInteger(candidate.ambientColor, 0, 0xff_ffff) &&
    isInteger(candidate.diffuseColor, 0, 0xff_ffff) &&
    isInteger(candidate.fogColor, 0, 0xff_ffff) && isInteger(candidate.fogAmount, 0, 15) &&
    typeof candidate.shadows === "boolean";
  return hasExactKeys(value, [
    "dayNightMode", "shadowOpacity", "chanceRain", "chanceSnow", "chanceLightning",
    "sun", "moon",
  ]) && ["cycle", "always_day", "always_night"].includes(String(value.dayNightMode)) &&
    isInteger(value.shadowOpacity, 0, 100) && isInteger(value.chanceRain, 0, 100) &&
    isInteger(value.chanceSnow, 0, 100) && isInteger(value.chanceLightning, 0, 100) &&
    phase(value.sun) && phase(value.moon);
}

function isScalarControls(value: Record<string, unknown>): boolean {
  return hasExactKeys(value, ["fogClipDistance", "windPower"]) &&
    isInteger(value.fogClipDistance, 30, 9999) && isInteger(value.windPower, 0, 2);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype;
}

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const keys = Object.keys(value);
  return keys.length === expected.length && expected.every((key) => keys.includes(key));
}

function hasAllowedKeys(value: Record<string, unknown>, allowed: readonly string[]): boolean {
  return Object.keys(value).every((key) => allowed.includes(key));
}

function isBoundedText(value: unknown, maximum: number): value is string {
  return typeof value === "string" && value.length >= 1 && value.length <= maximum &&
    !value.includes("\0");
}

function isInteger(value: unknown, minimum: number, maximum: number): value is number {
  return Number.isSafeInteger(value) && Number(value) >= minimum && Number(value) <= maximum;
}
