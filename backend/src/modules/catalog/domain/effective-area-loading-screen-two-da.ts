import { createHash } from "node:crypto";
import {
  parseAuroraTwoDaTable,
  type AuroraTwoDaRow,
} from "../../../common/aurora/two-da/aurora-two-da-table";

export const AREA_LOADING_SCREEN_CATALOG_SCHEMA_VERSION =
  "area-loading-screen-catalog.v1" as const;
export const AREA_LOADING_SCREEN_DEFAULT_STRREF = 0xf933;
export const MAX_EFFECTIVE_AREA_LOADING_SCREEN_TWO_DA_BYTES = 16 * 1024 * 1024;
export const MAX_EFFECTIVE_AREA_LOADING_SCREEN_ROWS = 4096;
export const MAX_EFFECTIVE_AREA_LOADING_SCREEN_IMAGE_BYTES = 16 * 1024 * 1024;
export const MAX_EFFECTIVE_AREA_LOADING_SCREEN_IMAGES = 512;
export const MAX_EFFECTIVE_AREA_LOADING_SCREEN_TOTAL_IMAGE_BYTES = 256 * 1024 * 1024;
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

export interface EffectiveAreaLoadingScreenTwoDaDescriptor {
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

export interface EffectiveAreaLoadingScreenSourceRow {
  readonly rowIndex: number;
  readonly sourceRowId: number;
  readonly label?: string;
  readonly imageResRef?: string;
  readonly tileSetResRef?: string;
  readonly strRef?: number;
}

export interface EffectiveAreaLoadingScreenCatalogRow
  extends EffectiveAreaLoadingScreenSourceRow {
  readonly displayName: string;
  readonly displaySource: EffectiveAreaLoadingScreenDisplaySource;
  readonly toolsetSelectable: boolean;
  readonly imageAsset?: EffectiveAreaLoadingScreenImageAsset;
}

export interface EffectiveAreaLoadingScreenTwoDaTable {
  readonly descriptor: EffectiveAreaLoadingScreenTwoDaDescriptor;
  readonly rows: readonly EffectiveAreaLoadingScreenSourceRow[];
}

export interface EffectiveAreaLoadingScreenCatalog {
  readonly schemaVersion: typeof AREA_LOADING_SCREEN_CATALOG_SCHEMA_VERSION;
  readonly descriptor: EffectiveAreaLoadingScreenTwoDaDescriptor;
  readonly rows: readonly EffectiveAreaLoadingScreenCatalogRow[];
}

export interface EffectiveAreaLoadingScreenTwoDaInput {
  readonly bytes: Buffer;
  readonly sourceObjectKey: string;
  readonly sourceLayer: EffectiveAreaLoadingScreenSourceLayer;
}

const REQUIRED_COLUMNS = Object.freeze(["Label", "BMPResRef", "TileSet", "StrRef"]);

export function parseEffectiveAreaLoadingScreenTwoDa(
  input: EffectiveAreaLoadingScreenTwoDaInput,
): EffectiveAreaLoadingScreenTwoDaTable | null {
  if (!isInputAdmitted(input)) return null;
  const sha256 = createHash("sha256").update(input.bytes).digest("hex");
  const table = parseAuroraTwoDaTable(input.bytes, {
    tableName: "loadscreens.2da",
    profile: "effective-area-loading-screen-source-provenance",
    sourceObjectKey: input.sourceObjectKey,
    sourceLayer: input.sourceLayer,
    sourceHash: sha256,
  });
  if (table.rows.length < 1 ||
      table.rows.length > MAX_EFFECTIVE_AREA_LOADING_SCREEN_ROWS ||
      table.diagnostics.some((entry) =>
        entry.severity === "error" || entry.code === "VFX_2DA_ROW_ID_REQUIRED"
      ) ||
      REQUIRED_COLUMNS.some(
        (column) => table.header.filter((candidate) => candidate === column).length !== 1,
      )) return null;

  const rows: EffectiveAreaLoadingScreenSourceRow[] = [];
  for (let index = 0; index < table.rows.length; index += 1) {
    const row = table.rows[index];
    if (!row || row.physicalRowIndex !== index || !Number.isSafeInteger(row.rowId) ||
        row.rowId < 0) return null;
    const parsed = parseRow(row, table.header);
    if (!parsed) return null;
    rows.push(Object.freeze({
      rowIndex: row.physicalRowIndex,
      sourceRowId: row.rowId,
      ...parsed,
    }));
  }

  return Object.freeze({
    descriptor: Object.freeze({
      resourceName: "loadscreens.2da" as const,
      sourceObjectKey: input.sourceObjectKey,
      sourceLayer: input.sourceLayer,
      sha256,
      sizeBytes: input.bytes.length,
      rowCount: rows.length,
    }),
    rows: Object.freeze(rows),
  });
}

export function buildEffectiveAreaLoadingScreenCatalog(
  table: EffectiveAreaLoadingScreenTwoDaTable,
  resolveStrRef: (strRef: number) => string | undefined,
  resolveImageAsset: (
    imageResRef: string,
  ) => EffectiveAreaLoadingScreenImageAsset | undefined,
): EffectiveAreaLoadingScreenCatalog {
  const rows = table.rows.map((row) => {
    const localizedName = resolveBoundedDisplay(
      row.rowIndex === 0 ? AREA_LOADING_SCREEN_DEFAULT_STRREF : row.strRef,
      resolveStrRef,
    );
    const imageAsset = row.imageResRef
      ? resolveExactImageAsset(row.imageResRef, resolveImageAsset)
      : undefined;
    const displayName = localizedName ??
      (row.rowIndex > 0 ? row.label : undefined) ?? `Row ${row.rowIndex}`;
    const displaySource: EffectiveAreaLoadingScreenDisplaySource = localizedName
      ? row.rowIndex === 0 ? "area_default_strref" : "strref"
      : row.rowIndex > 0 && row.label
        ? "label"
        : "row_index";
    return Object.freeze({
      ...row,
      displayName,
      displaySource,
      toolsetSelectable: imageAsset !== undefined,
      ...(imageAsset ? { imageAsset: Object.freeze({ ...imageAsset }) } : {}),
    });
  });
  return Object.freeze({
    schemaVersion: AREA_LOADING_SCREEN_CATALOG_SCHEMA_VERSION,
    descriptor: Object.freeze({ ...table.descriptor }),
    rows: Object.freeze(rows),
  });
}

export function isExactEffectiveAreaLoadingScreenCatalog(
  value: unknown,
): value is EffectiveAreaLoadingScreenCatalog {
  if (!isPlainRecord(value) || !hasExactKeys(value, [
    "schemaVersion", "descriptor", "rows",
  ]) || value.schemaVersion !== AREA_LOADING_SCREEN_CATALOG_SCHEMA_VERSION ||
      !isExactDescriptor(value.descriptor) || !Array.isArray(value.rows) ||
      value.rows.length !== value.descriptor.rowCount) return false;

  for (let index = 0; index < value.rows.length; index += 1) {
    if (!isExactRow(value.rows[index], index)) return false;
  }
  try {
    return Buffer.byteLength(JSON.stringify(value), "utf8") <=
      MAX_EFFECTIVE_AREA_LOADING_SCREEN_CATALOG_BYTES;
  } catch {
    return false;
  }
}

function parseRow(
  row: AuroraTwoDaRow,
  header: readonly string[],
): Omit<EffectiveAreaLoadingScreenSourceRow, "rowIndex" | "sourceRowId"> | null {
  const label = readOptionalLabel(readCell(row, header, "Label"));
  const imageResRef = readOptionalResRef(readCell(row, header, "BMPResRef"));
  const tileSetResRef = readOptionalResRef(readCell(row, header, "TileSet"));
  const strRef = readOptionalUint32(readCell(row, header, "StrRef"));
  if (label === null || imageResRef === null || tileSetResRef === null || strRef === null) {
    return null;
  }
  return {
    ...(label === undefined ? {} : { label }),
    ...(imageResRef === undefined ? {} : { imageResRef }),
    ...(tileSetResRef === undefined ? {} : { tileSetResRef }),
    ...(strRef === undefined ? {} : { strRef }),
  };
}

function isInputAdmitted(input: EffectiveAreaLoadingScreenTwoDaInput): boolean {
  return Buffer.isBuffer(input.bytes) && input.bytes.length >= 1 &&
    input.bytes.length <= MAX_EFFECTIVE_AREA_LOADING_SCREEN_TWO_DA_BYTES &&
    isBoundedSourceKey(input.sourceObjectKey) &&
    (input.sourceLayer === "module" || input.sourceLayer === "hak" ||
      input.sourceLayer === "vanilla");
}

function readCell(row: AuroraTwoDaRow, header: readonly string[], column: string) {
  return row.cells[header.indexOf(column)]?.value;
}

function readOptionalUint32(value: string | undefined): number | null | undefined {
  if (value === undefined || value === "****") return undefined;
  if (!/^\d+$/u.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed <= 0xffff_ffff ? parsed : null;
}

function readOptionalResRef(value: string | undefined): string | null | undefined {
  if (value === undefined || value === "****") return undefined;
  return /^[A-Za-z0-9_]{1,16}$/u.test(value) ? value : null;
}

function readOptionalLabel(value: string | undefined): string | null | undefined {
  if (value === undefined || value === "****") return undefined;
  return value.length >= 1 &&
    value.length <= MAX_EFFECTIVE_AREA_LOADING_SCREEN_LABEL_CODE_UNITS &&
    !value.includes("\0") ? value : null;
}

function resolveBoundedDisplay(
  strRef: number | undefined,
  resolveStrRef: (strRef: number) => string | undefined,
): string | undefined {
  if (strRef === undefined) return undefined;
  try {
    const value = resolveStrRef(strRef);
    return isBoundedDisplay(value) ? value : undefined;
  } catch {
    return undefined;
  }
}

function resolveExactImageAsset(
  imageResRef: string,
  resolveImageAsset: (
    imageResRef: string,
  ) => EffectiveAreaLoadingScreenImageAsset | undefined,
): EffectiveAreaLoadingScreenImageAsset | undefined {
  try {
    const value = resolveImageAsset(imageResRef);
    return isExactImageAsset(value, imageResRef) ? value : undefined;
  } catch {
    return undefined;
  }
}

function isExactDescriptor(value: unknown): value is EffectiveAreaLoadingScreenTwoDaDescriptor {
  return isPlainRecord(value) && hasExactKeys(value, [
    "resourceName", "sourceObjectKey", "sourceLayer", "sha256", "sizeBytes", "rowCount",
  ]) && value.resourceName === "loadscreens.2da" && isBoundedSourceKey(value.sourceObjectKey) &&
    isSourceLayer(value.sourceLayer) && typeof value.sha256 === "string" &&
    /^[a-f0-9]{64}$/u.test(value.sha256) && isIntegerInRange(
      value.sizeBytes,
      1,
      MAX_EFFECTIVE_AREA_LOADING_SCREEN_TWO_DA_BYTES,
    ) && isIntegerInRange(value.rowCount, 1, MAX_EFFECTIVE_AREA_LOADING_SCREEN_ROWS);
}

function isExactRow(value: unknown, expectedRowIndex: number): boolean {
  if (!isPlainRecord(value)) return false;
  const allowed = [
    "rowIndex", "sourceRowId", "label", "imageResRef", "tileSetResRef", "strRef",
    "displayName", "displaySource", "toolsetSelectable", "imageAsset",
  ];
  if (Object.keys(value).some((key) => !allowed.includes(key)) ||
      value.rowIndex !== expectedRowIndex ||
      !isIntegerInRange(value.sourceRowId, 0, Number.MAX_SAFE_INTEGER) ||
      (value.label !== undefined && !isBoundedLabel(value.label)) ||
      (value.imageResRef !== undefined && !isResRef(value.imageResRef)) ||
      (value.tileSetResRef !== undefined && !isResRef(value.tileSetResRef)) ||
      (value.strRef !== undefined && !isIntegerInRange(value.strRef, 0, 0xffff_ffff)) ||
      !isBoundedDisplay(value.displayName) || typeof value.toolsetSelectable !== "boolean" ||
      (value.displaySource !== "area_default_strref" && value.displaySource !== "strref" &&
        value.displaySource !== "label" && value.displaySource !== "row_index")) return false;

  const imageAsset = value.imageAsset;
  if ((imageAsset !== undefined) !== value.toolsetSelectable ||
      (imageAsset !== undefined && (typeof value.imageResRef !== "string" ||
        !isExactImageAsset(imageAsset, value.imageResRef)))) return false;
  if (value.displaySource === "area_default_strref" && value.rowIndex !== 0) return false;
  if (value.displaySource === "strref" &&
      (value.rowIndex === 0 || value.strRef === undefined)) return false;
  if (value.displaySource === "label" &&
      (value.rowIndex === 0 || value.label === undefined)) return false;
  return true;
}

function isExactImageAsset(
  value: unknown,
  imageResRef: string,
): value is EffectiveAreaLoadingScreenImageAsset {
  return isPlainRecord(value) && hasExactKeys(value, [
    "resourceName", "sourceObjectKey", "sourceLayer", "sha256", "sizeBytes",
  ]) && value.resourceName === `${imageResRef.toLowerCase()}.tga` &&
    isBoundedSourceKey(value.sourceObjectKey) && isSourceLayer(value.sourceLayer) &&
    typeof value.sha256 === "string" && /^[a-f0-9]{64}$/u.test(value.sha256) &&
    isIntegerInRange(value.sizeBytes, 1, MAX_EFFECTIVE_AREA_LOADING_SCREEN_IMAGE_BYTES);
}

function isBoundedSourceKey(value: unknown): value is string {
  return typeof value === "string" && value.length >= 1 &&
    value.length <= MAX_EFFECTIVE_AREA_LOADING_SCREEN_SOURCE_KEY_CODE_UNITS &&
    !value.includes("\0");
}

function isBoundedLabel(value: unknown): value is string {
  return typeof value === "string" && value.length >= 1 &&
    value.length <= MAX_EFFECTIVE_AREA_LOADING_SCREEN_LABEL_CODE_UNITS &&
    !value.includes("\0");
}

function isBoundedDisplay(value: unknown): value is string {
  return typeof value === "string" && value.length >= 1 &&
    value.length <= MAX_EFFECTIVE_AREA_LOADING_SCREEN_DISPLAY_CODE_UNITS &&
    !value.includes("\0");
}

function isResRef(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_]{1,16}$/u.test(value);
}

function isSourceLayer(value: unknown): value is EffectiveAreaLoadingScreenSourceLayer {
  return value === "module" || value === "hak" || value === "vanilla";
}

function isIntegerInRange(value: unknown, minimum: number, maximum: number): value is number {
  return Number.isSafeInteger(value) && Number(value) >= minimum && Number(value) <= maximum;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype;
}

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const keys = Object.keys(value);
  return keys.length === expected.length && expected.every((key) => keys.includes(key));
}
