import { createHash } from "node:crypto";

import {
  parseAuroraTwoDaTable,
  type AuroraTwoDaRow,
} from "../../../common/aurora/two-da/aurora-two-da-table";

export const MAX_EFFECTIVE_CREATURE_WALK_RATES_TWO_DA_BYTES = 64 * 1024 * 1024;
export const MAX_EFFECTIVE_CREATURE_WALK_RATES_TWO_DA_ROWS = 1_000_000;
export const MAX_EFFECTIVE_CREATURE_WALK_RATES_SOURCE_OBJECT_KEY_LENGTH = 2048;
export const MAX_EFFECTIVE_CREATURE_WALK_RATES_PAGE_ROWS = 256;
export const MAX_EFFECTIVE_CREATURE_WALK_RATES_QUERY_CODE_UNITS = 128;
export const MAX_EFFECTIVE_CREATURE_WALK_RATES_DISPLAY_CODE_UNITS = 1024;
export const MAX_EFFECTIVE_CREATURE_WALK_RATES_TWO_DA_NAME_CODE_UNITS = 128;

const DWORD_MAX = 0xffff_ffff;

export type EffectiveCreatureWalkRatesTwoDaSourceLayer = "module" | "hak" | "vanilla";

export interface EffectiveCreatureWalkRatesTwoDaDescriptor {
  readonly resourceName: "creaturespeed.2da";
  readonly sourceObjectKey: string;
  readonly sourceLayer: EffectiveCreatureWalkRatesTwoDaSourceLayer;
  readonly sha256: string;
  readonly sizeBytes: number;
  readonly rowCount: number;
}

export type EffectiveCreatureWalkRatesTwoDaDisplaySource = "strref" | "strref_id";

export interface EffectiveCreatureWalkRatesTwoDaRow {
  readonly rowIndex: number;
  readonly displayName: string;
  readonly displaySource: EffectiveCreatureWalkRatesTwoDaDisplaySource;
  readonly nameStrRef: number;
  readonly twoDaName: string;
}

export interface EffectiveCreatureWalkRatesTwoDaTable {
  readonly descriptor: EffectiveCreatureWalkRatesTwoDaDescriptor;
  readonly rows: readonly EffectiveCreatureWalkRatesTwoDaRow[];
}

export interface EffectiveCreatureWalkRatesTwoDaInput {
  readonly bytes: Buffer;
  readonly sourceObjectKey: string;
  readonly sourceLayer: string;
  readonly resolveStrRef: (strRef: number) => string | undefined;
}

const DESCRIPTOR_KEYS = [
  "resourceName", "sourceObjectKey", "sourceLayer", "sha256", "sizeBytes", "rowCount",
] as const;

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype;
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value);
  return actual.length === keys.length && keys.every((key) => actual.includes(key));
}

function isSourceLayer(value: unknown): value is EffectiveCreatureWalkRatesTwoDaSourceLayer {
  return value === "module" || value === "hak" || value === "vanilla";
}

function readCell(
  row: AuroraTwoDaRow,
  normalizedHeader: readonly string[],
  column: "NAME" | "2DANAME",
): string | undefined {
  const index = normalizedHeader.indexOf(column);
  return index < 0 ? undefined : row.cells[index]?.value;
}

function readNameStrRef(value: unknown): number | null {
  if (typeof value !== "string" || !/^\d+$/u.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 1 && parsed < DWORD_MAX ? parsed : null;
}

function readDisplayName(value: unknown): string | null {
  return typeof value === "string" && value.length >= 1 &&
    value.length <= MAX_EFFECTIVE_CREATURE_WALK_RATES_DISPLAY_CODE_UNITS &&
    !value.includes("\0") ? value : null;
}

function readTwoDaName(value: unknown): string | null {
  return typeof value === "string" && value !== "****" && value.length >= 1 &&
    value.length <= MAX_EFFECTIVE_CREATURE_WALK_RATES_TWO_DA_NAME_CODE_UNITS &&
    !value.includes("\0") ? value : null;
}

export function isCreatureWalkRateRowIndex(value: unknown, rowCount: number): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 1 && Number(value) < rowCount;
}

export function parseEffectiveCreatureWalkRatesTwoDa(
  input: EffectiveCreatureWalkRatesTwoDaInput,
): EffectiveCreatureWalkRatesTwoDaTable | null {
  if (!Buffer.isBuffer(input.bytes) || input.bytes.length < 1 ||
    input.bytes.length > MAX_EFFECTIVE_CREATURE_WALK_RATES_TWO_DA_BYTES ||
    typeof input.sourceObjectKey !== "string" || input.sourceObjectKey.length < 1 ||
    input.sourceObjectKey.length > MAX_EFFECTIVE_CREATURE_WALK_RATES_SOURCE_OBJECT_KEY_LENGTH ||
    !isSourceLayer(input.sourceLayer) || typeof input.resolveStrRef !== "function") return null;

  const sha256 = createHash("sha256").update(input.bytes).digest("hex");
  const table = parseAuroraTwoDaTable(input.bytes, {
    tableName: "creaturespeed.2da",
    profile: "effective-creature-walk-rates-toolset-positional-selector",
    sourceObjectKey: input.sourceObjectKey,
    sourceLayer: input.sourceLayer,
    sourceHash: sha256,
  });
  const normalizedHeader = table.header.map((entry) => entry.toUpperCase());
  if (table.version !== "2DA V2.0" ||
    normalizedHeader.filter((entry) => entry === "NAME").length !== 1 ||
    normalizedHeader.filter((entry) => entry === "2DANAME").length !== 1 ||
    table.rows.length < 2 || table.rows.length > MAX_EFFECTIVE_CREATURE_WALK_RATES_TWO_DA_ROWS ||
    table.diagnostics.some(
      (entry) => entry.severity === "error" || entry.code === "VFX_2DA_ROW_ID_REQUIRED",
    )) return null;

  const rowZero = table.rows[0];
  if (!rowZero || rowZero.physicalRowIndex !== 0 ||
    readNameStrRef(readCell(rowZero, normalizedHeader, "NAME")) !== null ||
    readTwoDaName(readCell(rowZero, normalizedHeader, "2DANAME")) === null) return null;

  const rows: EffectiveCreatureWalkRatesTwoDaRow[] = [];
  for (let rowIndex = 1; rowIndex < table.rows.length; rowIndex += 1) {
    const row = table.rows[rowIndex];
    if (!row || row.physicalRowIndex !== rowIndex) return null;
    const nameStrRef = readNameStrRef(readCell(row, normalizedHeader, "NAME"));
    const twoDaName = readTwoDaName(readCell(row, normalizedHeader, "2DANAME"));
    if (nameStrRef === null || twoDaName === null) return null;
    let displayName: string | null = null;
    try {
      displayName = readDisplayName(input.resolveStrRef(nameStrRef));
    } catch {
      displayName = null;
    }
    rows.push(Object.freeze({
      rowIndex,
      displayName: displayName ?? `StringRef ${nameStrRef}`,
      displaySource: displayName ? "strref" as const : "strref_id" as const,
      nameStrRef,
      twoDaName,
    }));
  }

  return Object.freeze({
    descriptor: Object.freeze({
      resourceName: "creaturespeed.2da",
      sourceObjectKey: input.sourceObjectKey,
      sourceLayer: input.sourceLayer,
      sha256,
      sizeBytes: input.bytes.length,
      rowCount: table.rows.length,
    }),
    rows: Object.freeze(rows),
  });
}

export function localizeEffectiveCreatureWalkRatesTwoDa(
  table: EffectiveCreatureWalkRatesTwoDaTable,
  resolveStrRef: (strRef: number) => string | undefined,
): EffectiveCreatureWalkRatesTwoDaTable {
  if (!isExactEffectiveCreatureWalkRatesTwoDaTable(table) ||
    typeof resolveStrRef !== "function") return table;
  return Object.freeze({
    descriptor: Object.freeze({ ...table.descriptor }),
    rows: Object.freeze(table.rows.map((row) => {
      let displayName: string | null = null;
      try {
        displayName = readDisplayName(resolveStrRef(row.nameStrRef));
      } catch {
        displayName = null;
      }
      return Object.freeze({
        ...row,
        displayName: displayName ?? `StringRef ${row.nameStrRef}`,
        displaySource: displayName ? "strref" as const : "strref_id" as const,
      });
    })),
  });
}

function isDescriptor(value: unknown): value is EffectiveCreatureWalkRatesTwoDaDescriptor {
  if (!isPlainRecord(value) || !hasExactKeys(value, DESCRIPTOR_KEYS)) return false;
  return value.resourceName === "creaturespeed.2da" &&
    typeof value.sourceObjectKey === "string" && value.sourceObjectKey.length >= 1 &&
    value.sourceObjectKey.length <= MAX_EFFECTIVE_CREATURE_WALK_RATES_SOURCE_OBJECT_KEY_LENGTH &&
    isSourceLayer(value.sourceLayer) && typeof value.sha256 === "string" &&
    /^[a-f0-9]{64}$/u.test(value.sha256) && Number.isSafeInteger(value.sizeBytes) &&
    Number(value.sizeBytes) >= 1 &&
    Number(value.sizeBytes) <= MAX_EFFECTIVE_CREATURE_WALK_RATES_TWO_DA_BYTES &&
    Number.isSafeInteger(value.rowCount) && Number(value.rowCount) >= 2 &&
    Number(value.rowCount) <= MAX_EFFECTIVE_CREATURE_WALK_RATES_TWO_DA_ROWS;
}

export function isExactEffectiveCreatureWalkRatesTwoDaTable(
  value: unknown,
): value is EffectiveCreatureWalkRatesTwoDaTable {
  if (!isPlainRecord(value) || !hasExactKeys(value, ["descriptor", "rows"]) ||
    !isDescriptor(value.descriptor) || !Array.isArray(value.rows) ||
    value.rows.length !== value.descriptor.rowCount - 1) return false;
  for (let index = 0; index < value.rows.length; index += 1) {
    const row = value.rows[index];
    if (!isPlainRecord(row) ||
      !hasExactKeys(row, ["rowIndex", "displayName", "displaySource", "nameStrRef", "twoDaName"]) ||
      row.rowIndex !== index + 1 || !readDisplayName(row.displayName) ||
      (row.displaySource !== "strref" && row.displaySource !== "strref_id") ||
      !Number.isSafeInteger(row.nameStrRef) || Number(row.nameStrRef) < 1 ||
      Number(row.nameStrRef) >= DWORD_MAX || readTwoDaName(row.twoDaName) === null) return false;
  }
  return true;
}
