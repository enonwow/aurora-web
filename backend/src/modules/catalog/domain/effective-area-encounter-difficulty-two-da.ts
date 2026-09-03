import { createHash } from "node:crypto";
import {
  BLANK_CELL,
  parseAuroraTwoDaTable,
  type AuroraTwoDaRow,
} from "../../../common/aurora/two-da/aurora-two-da-table";

export const AREA_ENCOUNTER_DIFFICULTY_CATALOG_SCHEMA_VERSION =
  "area-encounter-difficulty-catalog.v1" as const;
export const MAX_EFFECTIVE_AREA_ENCOUNTER_DIFFICULTY_TWO_DA_BYTES =
  16 * 1024 * 1024;
export const MAX_EFFECTIVE_AREA_ENCOUNTER_DIFFICULTY_ROWS = 256;
export const MAX_EFFECTIVE_AREA_ENCOUNTER_DIFFICULTY_CATALOG_BYTES =
  256 * 1024;
const MAX_SOURCE_KEY_CODE_UNITS = 2048;
const MAX_DISPLAY_CODE_UNITS = 1024;

export type EffectiveAreaEncounterDifficultySourceLayer =
  | "module"
  | "hak"
  | "vanilla";
export type EffectiveAreaEncounterDifficultyDisplaySource =
  | "strref"
  | "row_index";

export interface EffectiveAreaEncounterDifficultyTwoDaDescriptor {
  readonly resourceName: "encdifficulty.2da";
  readonly sourceObjectKey: string;
  readonly sourceLayer: EffectiveAreaEncounterDifficultySourceLayer;
  readonly sha256: string;
  readonly sizeBytes: number;
  readonly rowCount: number;
}

export interface EffectiveAreaEncounterDifficultySourceRow {
  readonly rowIndex: number;
  readonly strRef: number;
  readonly value: number;
}

export interface EffectiveAreaEncounterDifficultyCatalogRow
  extends EffectiveAreaEncounterDifficultySourceRow {
  readonly displayName: string;
  readonly displaySource: EffectiveAreaEncounterDifficultyDisplaySource;
}

export interface EffectiveAreaEncounterDifficultyTwoDaTable {
  readonly descriptor: EffectiveAreaEncounterDifficultyTwoDaDescriptor;
  readonly rows: readonly EffectiveAreaEncounterDifficultySourceRow[];
}

export interface EffectiveAreaEncounterDifficultyCatalog {
  readonly schemaVersion: typeof AREA_ENCOUNTER_DIFFICULTY_CATALOG_SCHEMA_VERSION;
  readonly descriptor: EffectiveAreaEncounterDifficultyTwoDaDescriptor;
  readonly rows: readonly EffectiveAreaEncounterDifficultyCatalogRow[];
}

export interface EffectiveAreaEncounterDifficultyTwoDaInput {
  readonly bytes: Buffer;
  readonly sourceObjectKey: string;
  readonly sourceLayer: EffectiveAreaEncounterDifficultySourceLayer;
}

export function parseEffectiveAreaEncounterDifficultyTwoDa(
  input: EffectiveAreaEncounterDifficultyTwoDaInput,
): EffectiveAreaEncounterDifficultyTwoDaTable | null {
  if (!isInputAdmitted(input)) return null;
  const sha256 = createHash("sha256").update(input.bytes).digest("hex");
  const table = parseAuroraTwoDaTable(input.bytes, {
    tableName: "encdifficulty.2da",
    profile: "effective-area-encounter-difficulty-source-provenance",
    sourceObjectKey: input.sourceObjectKey,
    sourceLayer: input.sourceLayer,
    sourceHash: sha256,
  });
  if (table.rows.length < 1 ||
      table.rows.length > MAX_EFFECTIVE_AREA_ENCOUNTER_DIFFICULTY_ROWS ||
      table.diagnostics.some((entry) => entry.severity === "error") ||
      table.header.filter((column) => column === "STRREF").length !== 1 ||
      table.header.filter((column) => column === "VALUE").length !== 1) {
    return null;
  }

  const rows: EffectiveAreaEncounterDifficultySourceRow[] = [];
  for (let index = 0; index < table.rows.length; index += 1) {
    const row = table.rows[index];
    if (!row || row.physicalRowIndex !== index) return null;
    const strRef = readRequiredInteger(row, "STRREF", 0, 0xffff_ffff);
    const value = readRequiredInteger(row, "VALUE", -20, 20);
    if (strRef === null || value === null) return null;
    rows.push(Object.freeze({ rowIndex: index, strRef, value }));
  }

  return Object.freeze({
    descriptor: Object.freeze({
      resourceName: "encdifficulty.2da" as const,
      sourceObjectKey: input.sourceObjectKey,
      sourceLayer: input.sourceLayer,
      sha256,
      sizeBytes: input.bytes.length,
      rowCount: rows.length,
    }),
    rows: Object.freeze(rows),
  });
}

export function buildEffectiveAreaEncounterDifficultyCatalog(
  table: EffectiveAreaEncounterDifficultyTwoDaTable,
  resolveStrRef: (strRef: number) => string | undefined,
): EffectiveAreaEncounterDifficultyCatalog {
  return Object.freeze({
    schemaVersion: AREA_ENCOUNTER_DIFFICULTY_CATALOG_SCHEMA_VERSION,
    descriptor: Object.freeze({ ...table.descriptor }),
    rows: Object.freeze(table.rows.map((row) => {
      const localized = resolveBoundedDisplay(row.strRef, resolveStrRef);
      return Object.freeze({
        ...row,
        displayName: localized ?? `Row ${row.rowIndex}`,
        displaySource: localized ? "strref" as const : "row_index" as const,
      });
    })),
  });
}

export function isExactEffectiveAreaEncounterDifficultyCatalog(
  value: unknown,
): value is EffectiveAreaEncounterDifficultyCatalog {
  if (!isPlainRecord(value) || !hasExactKeys(value, [
    "schemaVersion", "descriptor", "rows",
  ]) || value.schemaVersion !== AREA_ENCOUNTER_DIFFICULTY_CATALOG_SCHEMA_VERSION ||
      !isExactDescriptor(value.descriptor) || !Array.isArray(value.rows) ||
      value.rows.length !== value.descriptor.rowCount ||
      !value.rows.every(isExactRow)) return false;
  try {
    return Buffer.byteLength(JSON.stringify(value), "utf8") <=
      MAX_EFFECTIVE_AREA_ENCOUNTER_DIFFICULTY_CATALOG_BYTES;
  } catch {
    return false;
  }
}

function readRequiredInteger(
  row: AuroraTwoDaRow,
  column: string,
  minimum: number,
  maximum: number,
): number | null {
  const cell = row.cellsByColumn[column];
  if (!cell || cell.missing || cell.blank || cell.value === BLANK_CELL ||
      !/^-?\d+$/u.test(cell.value)) return null;
  const parsed = Number(cell.value);
  return Number.isSafeInteger(parsed) && parsed >= minimum && parsed <= maximum
    ? parsed
    : null;
}

function resolveBoundedDisplay(
  strRef: number,
  resolveStrRef: (strRef: number) => string | undefined,
): string | undefined {
  try {
    const value = resolveStrRef(strRef);
    return typeof value === "string" && value.length >= 1 &&
      value.length <= MAX_DISPLAY_CODE_UNITS && !value.includes("\0")
      ? value
      : undefined;
  } catch {
    return undefined;
  }
}

function isInputAdmitted(input: EffectiveAreaEncounterDifficultyTwoDaInput): boolean {
  return Buffer.isBuffer(input.bytes) && input.bytes.length >= 1 &&
    input.bytes.length <= MAX_EFFECTIVE_AREA_ENCOUNTER_DIFFICULTY_TWO_DA_BYTES &&
    isBoundedSourceKey(input.sourceObjectKey) && isSourceLayer(input.sourceLayer);
}

function isExactDescriptor(
  value: unknown,
): value is EffectiveAreaEncounterDifficultyTwoDaDescriptor {
  return isPlainRecord(value) && hasExactKeys(value, [
    "resourceName", "sourceObjectKey", "sourceLayer", "sha256", "sizeBytes", "rowCount",
  ]) && value.resourceName === "encdifficulty.2da" &&
    isBoundedSourceKey(value.sourceObjectKey) && isSourceLayer(value.sourceLayer) &&
    typeof value.sha256 === "string" && /^[a-f0-9]{64}$/u.test(value.sha256) &&
    isIntegerInRange(value.sizeBytes, 1, MAX_EFFECTIVE_AREA_ENCOUNTER_DIFFICULTY_TWO_DA_BYTES) &&
    isIntegerInRange(value.rowCount, 1, MAX_EFFECTIVE_AREA_ENCOUNTER_DIFFICULTY_ROWS);
}

function isExactRow(
  value: unknown,
  expectedRowIndex: number,
): value is EffectiveAreaEncounterDifficultyCatalogRow {
  return isPlainRecord(value) && hasExactKeys(value, [
    "rowIndex", "strRef", "value", "displayName", "displaySource",
  ]) && value.rowIndex === expectedRowIndex &&
    isIntegerInRange(value.strRef, 0, 0xffff_ffff) &&
    isIntegerInRange(value.value, -20, 20) &&
    typeof value.displayName === "string" && value.displayName.length >= 1 &&
    value.displayName.length <= MAX_DISPLAY_CODE_UNITS && !value.displayName.includes("\0") &&
    (value.displaySource === "strref" || value.displaySource === "row_index");
}

function isBoundedSourceKey(value: unknown): value is string {
  return typeof value === "string" && value.length >= 1 &&
    value.length <= MAX_SOURCE_KEY_CODE_UNITS && !value.includes("\0");
}

function isSourceLayer(value: unknown): value is EffectiveAreaEncounterDifficultySourceLayer {
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
