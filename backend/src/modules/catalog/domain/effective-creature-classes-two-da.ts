import { createHash } from "node:crypto";

import {
  parseAuroraTwoDaTable,
  type AuroraTwoDaRow,
} from "../../../common/aurora/two-da/aurora-two-da-table";

export const MAX_EFFECTIVE_CREATURE_CLASSES_TWO_DA_BYTES = 16 * 1024 * 1024;
export const MAX_EFFECTIVE_CREATURE_CLASSES_TWO_DA_ROWS = 65_536;
export const MAX_EFFECTIVE_CREATURE_CLASSES_SOURCE_OBJECT_KEY_LENGTH = 2048;
export const MAX_EFFECTIVE_CREATURE_CLASSES_DISPLAY_CODE_UNITS = 1024;

const DWORD_MAX = 0xffff_ffff;
const INT_MAX = 0x7fff_ffff;

export type EffectiveCreatureClassesTwoDaSourceLayer = "module" | "hak" | "vanilla";
export type EffectiveCreatureClassesTwoDaDisplaySource = "strref" | "strref_id";

export interface EffectiveCreatureClassesTwoDaDescriptor {
  readonly resourceName: "classes.2da";
  readonly sourceObjectKey: string;
  readonly sourceLayer: EffectiveCreatureClassesTwoDaSourceLayer;
  readonly sha256: string;
  readonly sizeBytes: number;
  readonly rowCount: number;
}

export interface EffectiveCreatureClassesTwoDaRow {
  readonly rowIndex: number;
  readonly displayName: string;
  readonly displaySource: EffectiveCreatureClassesTwoDaDisplaySource;
  readonly nameStrRef: number;
  readonly spellTableColumn?: string;
}

export interface EffectiveCreatureClassesTwoDaTable {
  readonly descriptor: EffectiveCreatureClassesTwoDaDescriptor;
  readonly rows: readonly EffectiveCreatureClassesTwoDaRow[];
}

export interface EffectiveCreatureClassesTwoDaInput {
  readonly bytes: Buffer;
  readonly sourceObjectKey: string;
  readonly sourceLayer: string;
  readonly resolveStrRef: (strRef: number) => string | undefined;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype;
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value);
  return actual.length === keys.length && keys.every((key) => actual.includes(key));
}

function isSourceLayer(value: unknown): value is EffectiveCreatureClassesTwoDaSourceLayer {
  return value === "module" || value === "hak" || value === "vanilla";
}

function readCell(
  row: AuroraTwoDaRow,
  normalizedHeader: readonly string[],
  column: string,
): string | undefined {
  const index = normalizedHeader.indexOf(column);
  return index < 0 ? undefined : row.cells[index]?.value;
}

function readUint32(value: unknown): number | null {
  if (typeof value !== "string" || !/^\d+$/u.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 && parsed <= DWORD_MAX ? parsed : null;
}

function readDisplayText(value: unknown): string | null {
  return typeof value === "string" && value.length >= 1 &&
    value.length <= MAX_EFFECTIVE_CREATURE_CLASSES_DISPLAY_CODE_UNITS &&
    !value.includes("\0") ? value : null;
}

function readSpellTableColumn(value: unknown): string | null {
  return typeof value === "string" && value !== "****" && value.length >= 1 &&
    value.length <= 64 && /^[A-Za-z0-9_]+$/u.test(value) ? value : null;
}

export function isCreatureClassRowIndex(value: unknown, rowCount: number): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0 && Number(value) <= INT_MAX &&
    Number(value) < rowCount;
}

export function parseEffectiveCreatureClassesTwoDa(
  input: EffectiveCreatureClassesTwoDaInput,
): EffectiveCreatureClassesTwoDaTable | null {
  if (!Buffer.isBuffer(input.bytes) || input.bytes.length < 1 ||
    input.bytes.length > MAX_EFFECTIVE_CREATURE_CLASSES_TWO_DA_BYTES ||
    typeof input.sourceObjectKey !== "string" || input.sourceObjectKey.length < 1 ||
    input.sourceObjectKey.length > MAX_EFFECTIVE_CREATURE_CLASSES_SOURCE_OBJECT_KEY_LENGTH ||
    !isSourceLayer(input.sourceLayer) || typeof input.resolveStrRef !== "function") return null;

  const sha256 = createHash("sha256").update(input.bytes).digest("hex");
  const table = parseAuroraTwoDaTable(input.bytes, {
    tableName: "classes.2da",
    profile: "effective-creature-classes-toolset-selector",
    sourceObjectKey: input.sourceObjectKey,
    sourceLayer: input.sourceLayer,
    sourceHash: sha256,
  });
  const normalizedHeader = table.header.map((entry) => entry.toUpperCase());
  if (table.version !== "2DA V2.0" || table.rows.length < 1 ||
    table.rows.length > MAX_EFFECTIVE_CREATURE_CLASSES_TWO_DA_ROWS ||
    normalizedHeader.filter((entry) => entry === "NAME").length !== 1 ||
    table.diagnostics.some((entry) => entry.severity === "error")) return null;

  const rows: EffectiveCreatureClassesTwoDaRow[] = [];
  for (const row of table.rows) {
    if (row.physicalRowIndex > INT_MAX) continue;
    const nameStrRef = readUint32(readCell(row, normalizedHeader, "NAME"));
    if (nameStrRef === null) continue;
    let localized: string | null = null;
    try {
      localized = readDisplayText(input.resolveStrRef(nameStrRef));
    } catch {
      localized = null;
    }
    rows.push(Object.freeze({
      rowIndex: row.physicalRowIndex,
      displayName: localized ?? `StringRef ${nameStrRef}`,
      displaySource: localized ? "strref" as const : "strref_id" as const,
      nameStrRef,
      ...(readSpellTableColumn(
        readCell(row, normalizedHeader, "SPELLTABLECOLUMN"),
      ) === null ? {} : {
        spellTableColumn: readSpellTableColumn(
          readCell(row, normalizedHeader, "SPELLTABLECOLUMN"),
        )!,
      }),
    }));
  }
  if (rows.length === 0) return null;

  return Object.freeze({
    descriptor: Object.freeze({
      resourceName: "classes.2da",
      sourceObjectKey: input.sourceObjectKey,
      sourceLayer: input.sourceLayer,
      sha256,
      sizeBytes: input.bytes.length,
      rowCount: table.rows.length,
    }),
    rows: Object.freeze(rows),
  });
}

export function localizeEffectiveCreatureClassesTwoDa(
  table: EffectiveCreatureClassesTwoDaTable,
  resolveStrRef: (strRef: number) => string | undefined,
): EffectiveCreatureClassesTwoDaTable {
  if (!isExactEffectiveCreatureClassesTwoDaTable(table) ||
    typeof resolveStrRef !== "function") return table;
  return Object.freeze({
    descriptor: Object.freeze({ ...table.descriptor }),
    rows: Object.freeze(table.rows.map((row) => {
      let localized: string | null = null;
      try {
        localized = readDisplayText(resolveStrRef(row.nameStrRef));
      } catch {
        localized = null;
      }
      return Object.freeze({
        ...row,
        displayName: localized ?? `StringRef ${row.nameStrRef}`,
        displaySource: localized ? "strref" as const : "strref_id" as const,
      });
    })),
  });
}

export function isExactEffectiveCreatureClassesTwoDaTable(
  value: unknown,
): value is EffectiveCreatureClassesTwoDaTable {
  if (!isPlainRecord(value) || !hasExactKeys(value, ["descriptor", "rows"]) ||
    !isPlainRecord(value.descriptor) || !Array.isArray(value.rows)) return false;
  const descriptor = value.descriptor;
  if (!hasExactKeys(descriptor, [
    "resourceName", "sourceObjectKey", "sourceLayer", "sha256", "sizeBytes", "rowCount",
  ]) || descriptor.resourceName !== "classes.2da" ||
    typeof descriptor.sourceObjectKey !== "string" || descriptor.sourceObjectKey.length < 1 ||
    descriptor.sourceObjectKey.length > MAX_EFFECTIVE_CREATURE_CLASSES_SOURCE_OBJECT_KEY_LENGTH ||
    !isSourceLayer(descriptor.sourceLayer) || typeof descriptor.sha256 !== "string" ||
    !/^[a-f0-9]{64}$/u.test(descriptor.sha256) || !Number.isSafeInteger(descriptor.sizeBytes) ||
    Number(descriptor.sizeBytes) < 1 ||
    Number(descriptor.sizeBytes) > MAX_EFFECTIVE_CREATURE_CLASSES_TWO_DA_BYTES ||
    !Number.isSafeInteger(descriptor.rowCount) || Number(descriptor.rowCount) < 1 ||
    Number(descriptor.rowCount) > MAX_EFFECTIVE_CREATURE_CLASSES_TWO_DA_ROWS ||
    value.rows.length < 1 || value.rows.length > Number(descriptor.rowCount)) return false;

  let previousRowIndex = -1;
  for (const row of value.rows) {
    if (!isPlainRecord(row)) return false;
    const hasSpellTableColumn = Object.prototype.hasOwnProperty.call(row, "spellTableColumn");
    if (!hasExactKeys(row, hasSpellTableColumn ? [
      "rowIndex", "displayName", "displaySource", "nameStrRef", "spellTableColumn",
    ] : [
      "rowIndex", "displayName", "displaySource", "nameStrRef",
    ]) || !isCreatureClassRowIndex(row.rowIndex, Number(descriptor.rowCount)) ||
      Number(row.rowIndex) <= previousRowIndex || readDisplayText(row.displayName) === null ||
      (row.displaySource !== "strref" && row.displaySource !== "strref_id") ||
      !Number.isSafeInteger(row.nameStrRef) || Number(row.nameStrRef) < 0 ||
      Number(row.nameStrRef) > DWORD_MAX ||
      hasSpellTableColumn && readSpellTableColumn(row.spellTableColumn) === null) return false;
    previousRowIndex = Number(row.rowIndex);
  }
  return true;
}
