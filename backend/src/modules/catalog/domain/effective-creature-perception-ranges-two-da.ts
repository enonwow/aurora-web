import { createHash } from "node:crypto";

import {
  parseAuroraTwoDaTable,
  type AuroraTwoDaRow,
} from "../../../common/aurora/two-da/aurora-two-da-table";

export const MAX_EFFECTIVE_CREATURE_PERCEPTION_RANGES_TWO_DA_BYTES = 64 * 1024 * 1024;
export const MAX_EFFECTIVE_CREATURE_PERCEPTION_RANGES_TWO_DA_ROWS = 1_000_000;
export const MAX_EFFECTIVE_CREATURE_PERCEPTION_RANGES_SOURCE_OBJECT_KEY_LENGTH = 2048;
export const MAX_EFFECTIVE_CREATURE_PERCEPTION_RANGES_PAGE_ROWS = 16;
export const MAX_EFFECTIVE_CREATURE_PERCEPTION_RANGES_QUERY_CODE_UNITS = 128;
export const MAX_EFFECTIVE_CREATURE_PERCEPTION_RANGES_DISPLAY_CODE_UNITS = 1024;
export const CREATURE_PERCEPTION_RANGE_ROW_INDICES = Object.freeze([8, 9, 10, 11] as const);

const DWORD_MAX = 0xffff_ffff;

export type EffectiveCreaturePerceptionRangesTwoDaSourceLayer = "module" | "hak" | "vanilla";

export interface EffectiveCreaturePerceptionRangesTwoDaDescriptor {
  readonly resourceName: "ranges.2da";
  readonly sourceObjectKey: string;
  readonly sourceLayer: EffectiveCreaturePerceptionRangesTwoDaSourceLayer;
  readonly sha256: string;
  readonly sizeBytes: number;
  readonly rowCount: number;
}

export type EffectiveCreaturePerceptionRangesTwoDaDisplaySource = "strref" | "strref_id";

export interface EffectiveCreaturePerceptionRangesTwoDaRow {
  readonly rowIndex: number;
  readonly displayName: string;
  readonly displaySource: EffectiveCreaturePerceptionRangesTwoDaDisplaySource;
  readonly nameStrRef: number;
}

export interface EffectiveCreaturePerceptionRangesTwoDaTable {
  readonly descriptor: EffectiveCreaturePerceptionRangesTwoDaDescriptor;
  readonly rows: readonly EffectiveCreaturePerceptionRangesTwoDaRow[];
}

export interface EffectiveCreaturePerceptionRangesTwoDaInput {
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

function isSourceLayer(value: unknown): value is EffectiveCreaturePerceptionRangesTwoDaSourceLayer {
  return value === "module" || value === "hak" || value === "vanilla";
}

function readNameCell(row: AuroraTwoDaRow, normalizedHeader: readonly string[]): string | undefined {
  const index = normalizedHeader.indexOf("NAME");
  return index < 0 ? undefined : row.cells[index]?.value;
}

function readNameStrRef(value: unknown): number | null {
  if (typeof value !== "string" || !/^\d+$/u.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 1 && parsed < DWORD_MAX ? parsed : null;
}

function readDisplayName(value: unknown): string | null {
  return typeof value === "string" && value.length >= 1 &&
    value.length <= MAX_EFFECTIVE_CREATURE_PERCEPTION_RANGES_DISPLAY_CODE_UNITS &&
    !value.includes("\0") ? value : null;
}

export function isCreaturePerceptionRangeRowIndex(value: unknown): value is 8 | 9 | 10 | 11 {
  return Number.isSafeInteger(value) &&
    CREATURE_PERCEPTION_RANGE_ROW_INDICES.includes(value as 8 | 9 | 10 | 11);
}

export function parseEffectiveCreaturePerceptionRangesTwoDa(
  input: EffectiveCreaturePerceptionRangesTwoDaInput,
): EffectiveCreaturePerceptionRangesTwoDaTable | null {
  if (!Buffer.isBuffer(input.bytes) || input.bytes.length < 1 ||
    input.bytes.length > MAX_EFFECTIVE_CREATURE_PERCEPTION_RANGES_TWO_DA_BYTES ||
    typeof input.sourceObjectKey !== "string" || input.sourceObjectKey.length < 1 ||
    input.sourceObjectKey.length >
      MAX_EFFECTIVE_CREATURE_PERCEPTION_RANGES_SOURCE_OBJECT_KEY_LENGTH ||
    !isSourceLayer(input.sourceLayer) || typeof input.resolveStrRef !== "function") return null;

  const sha256 = createHash("sha256").update(input.bytes).digest("hex");
  const table = parseAuroraTwoDaTable(input.bytes, {
    tableName: "ranges.2da",
    profile: "effective-creature-perception-ranges-toolset-selector",
    sourceObjectKey: input.sourceObjectKey,
    sourceLayer: input.sourceLayer,
    sourceHash: sha256,
  });
  const normalizedHeader = table.header.map((entry) => entry.toUpperCase());
  if (table.version !== "2DA V2.0" ||
    normalizedHeader.filter((entry) => entry === "NAME").length !== 1 ||
    table.rows.length < 1 ||
    table.rows.length > MAX_EFFECTIVE_CREATURE_PERCEPTION_RANGES_TWO_DA_ROWS ||
    table.diagnostics.some(
      (entry) => entry.severity === "error" || entry.code === "VFX_2DA_ROW_ID_REQUIRED",
    )) return null;

  const rows: EffectiveCreaturePerceptionRangesTwoDaRow[] = [];
  for (const row of table.rows) {
    if (!isCreaturePerceptionRangeRowIndex(row.physicalRowIndex)) continue;
    const nameStrRef = readNameStrRef(readNameCell(row, normalizedHeader));
    if (nameStrRef === null) continue;
    let displayName: string | null = null;
    try {
      displayName = readDisplayName(input.resolveStrRef(nameStrRef));
    } catch {
      displayName = null;
    }
    rows.push(Object.freeze({
      rowIndex: row.physicalRowIndex,
      displayName: displayName ?? `StringRef ${nameStrRef}`,
      displaySource: displayName ? "strref" : "strref_id",
      nameStrRef,
    }));
  }

  return Object.freeze({
    descriptor: Object.freeze({
      resourceName: "ranges.2da",
      sourceObjectKey: input.sourceObjectKey,
      sourceLayer: input.sourceLayer,
      sha256,
      sizeBytes: input.bytes.length,
      rowCount: table.rows.length,
    }),
    rows: Object.freeze(rows),
  });
}

export function localizeEffectiveCreaturePerceptionRangesTwoDa(
  table: EffectiveCreaturePerceptionRangesTwoDaTable,
  resolveStrRef: (strRef: number) => string | undefined,
): EffectiveCreaturePerceptionRangesTwoDaTable {
  if (!isExactEffectiveCreaturePerceptionRangesTwoDaTable(table) ||
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

function isDescriptor(value: unknown): value is EffectiveCreaturePerceptionRangesTwoDaDescriptor {
  if (!isPlainRecord(value) || !hasExactKeys(value, DESCRIPTOR_KEYS)) return false;
  return value.resourceName === "ranges.2da" &&
    typeof value.sourceObjectKey === "string" && value.sourceObjectKey.length >= 1 &&
    value.sourceObjectKey.length <=
      MAX_EFFECTIVE_CREATURE_PERCEPTION_RANGES_SOURCE_OBJECT_KEY_LENGTH &&
    isSourceLayer(value.sourceLayer) && typeof value.sha256 === "string" &&
    /^[a-f0-9]{64}$/u.test(value.sha256) && Number.isSafeInteger(value.sizeBytes) &&
    Number(value.sizeBytes) >= 1 &&
    Number(value.sizeBytes) <= MAX_EFFECTIVE_CREATURE_PERCEPTION_RANGES_TWO_DA_BYTES &&
    Number.isSafeInteger(value.rowCount) && Number(value.rowCount) >= 1 &&
    Number(value.rowCount) <= MAX_EFFECTIVE_CREATURE_PERCEPTION_RANGES_TWO_DA_ROWS;
}

export function isExactEffectiveCreaturePerceptionRangesTwoDaTable(
  value: unknown,
): value is EffectiveCreaturePerceptionRangesTwoDaTable {
  if (!isPlainRecord(value) || !hasExactKeys(value, ["descriptor", "rows"]) ||
    !isDescriptor(value.descriptor) || !Array.isArray(value.rows) ||
    value.rows.length > CREATURE_PERCEPTION_RANGE_ROW_INDICES.length) return false;
  let previous = -1;
  for (const row of value.rows) {
    if (!isPlainRecord(row) ||
      !hasExactKeys(row, ["rowIndex", "displayName", "displaySource", "nameStrRef"]) ||
      !isCreaturePerceptionRangeRowIndex(row.rowIndex) || Number(row.rowIndex) <= previous ||
      Number(row.rowIndex) >= value.descriptor.rowCount ||
      !readDisplayName(row.displayName) ||
      (row.displaySource !== "strref" && row.displaySource !== "strref_id") ||
      !Number.isSafeInteger(row.nameStrRef) || Number(row.nameStrRef) < 1 ||
      Number(row.nameStrRef) >= DWORD_MAX) return false;
    previous = Number(row.rowIndex);
  }
  return true;
}
