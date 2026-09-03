import { createHash } from "node:crypto";

import {
  parseAuroraTwoDaTable,
  type AuroraTwoDaRow,
} from "../../../common/aurora/two-da/aurora-two-da-table";

export const MAX_EFFECTIVE_CREATURE_RACIAL_TYPES_TWO_DA_BYTES = 64 * 1024 * 1024;
export const MAX_EFFECTIVE_CREATURE_RACIAL_TYPES_TWO_DA_ROWS = 1_000_000;
export const MAX_EFFECTIVE_CREATURE_RACIAL_TYPES_SOURCE_OBJECT_KEY_LENGTH = 2048;

export type EffectiveCreatureRacialTypesTwoDaSourceLayer = "module" | "hak" | "vanilla";

export interface EffectiveCreatureRacialTypesTwoDaDescriptor {
  readonly resourceName: "racialtypes.2da";
  readonly sourceObjectKey: string;
  readonly sourceLayer: EffectiveCreatureRacialTypesTwoDaSourceLayer;
  readonly sha256: string;
  readonly sizeBytes: number;
  readonly rowCount: number;
}

export interface EffectiveCreatureRacialTypesTwoDaRow {
  readonly rowIndex: number;
  readonly constitutionAdjust: number;
}

export interface EffectiveCreatureRacialTypesTwoDaTable {
  readonly descriptor: EffectiveCreatureRacialTypesTwoDaDescriptor;
  readonly rows: readonly EffectiveCreatureRacialTypesTwoDaRow[];
}

export interface EffectiveCreatureRacialTypesTwoDaInput {
  readonly bytes: Buffer;
  readonly sourceObjectKey: string;
  readonly sourceLayer: string;
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

function isSourceLayer(value: unknown): value is EffectiveCreatureRacialTypesTwoDaSourceLayer {
  return value === "module" || value === "hak" || value === "vanilla";
}

function readCell(
  row: AuroraTwoDaRow,
  header: readonly string[],
  column: string,
): string | undefined {
  const index = header.indexOf(column);
  return index < 0 ? undefined : row.cells[index]?.value;
}

function readSignedInt32(value: unknown): number | null {
  if (typeof value !== "string" || !/^[+-]?\d+$/u.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= -0x8000_0000 && parsed <= 0x7fff_ffff
    ? parsed
    : null;
}

function isDescriptor(value: unknown): value is EffectiveCreatureRacialTypesTwoDaDescriptor {
  if (!isPlainRecord(value) || !hasExactKeys(value, DESCRIPTOR_KEYS)) return false;
  return value.resourceName === "racialtypes.2da" &&
    typeof value.sourceObjectKey === "string" && value.sourceObjectKey.length >= 1 &&
    value.sourceObjectKey.length <= MAX_EFFECTIVE_CREATURE_RACIAL_TYPES_SOURCE_OBJECT_KEY_LENGTH &&
    isSourceLayer(value.sourceLayer) && typeof value.sha256 === "string" &&
    /^[a-f0-9]{64}$/u.test(value.sha256) && Number.isSafeInteger(value.sizeBytes) &&
    Number(value.sizeBytes) >= 1 &&
    Number(value.sizeBytes) <= MAX_EFFECTIVE_CREATURE_RACIAL_TYPES_TWO_DA_BYTES &&
    Number.isSafeInteger(value.rowCount) && Number(value.rowCount) >= 1 &&
    Number(value.rowCount) <= MAX_EFFECTIVE_CREATURE_RACIAL_TYPES_TWO_DA_ROWS;
}

export function parseEffectiveCreatureRacialTypesTwoDa(
  input: EffectiveCreatureRacialTypesTwoDaInput,
): EffectiveCreatureRacialTypesTwoDaTable | null {
  if (!Buffer.isBuffer(input.bytes) || input.bytes.length < 1 ||
    input.bytes.length > MAX_EFFECTIVE_CREATURE_RACIAL_TYPES_TWO_DA_BYTES ||
    typeof input.sourceObjectKey !== "string" || input.sourceObjectKey.length < 1 ||
    input.sourceObjectKey.length > MAX_EFFECTIVE_CREATURE_RACIAL_TYPES_SOURCE_OBJECT_KEY_LENGTH ||
    !isSourceLayer(input.sourceLayer)) return null;

  const sha256 = createHash("sha256").update(input.bytes).digest("hex");
  const table = parseAuroraTwoDaTable(input.bytes, {
    tableName: "racialtypes.2da",
    profile: "effective-creature-racial-types-hit-points",
    sourceObjectKey: input.sourceObjectKey,
    sourceLayer: input.sourceLayer,
    sourceHash: sha256,
  });
  if (table.version !== "2DA V2.0" || table.rows.length < 1 ||
    table.rows.length > MAX_EFFECTIVE_CREATURE_RACIAL_TYPES_TWO_DA_ROWS ||
    table.header.filter((candidate) => candidate === "ConAdjust").length !== 1 ||
    table.diagnostics.some(
      (entry) => entry.severity === "error" || entry.code === "VFX_2DA_ROW_ID_REQUIRED",
    )) return null;

  const rows: EffectiveCreatureRacialTypesTwoDaRow[] = [];
  for (const row of table.rows) {
    const constitutionAdjust = readSignedInt32(readCell(row, table.header, "ConAdjust"));
    if (constitutionAdjust === null) continue;
    rows.push(Object.freeze({
      rowIndex: row.physicalRowIndex,
      constitutionAdjust,
    }));
  }
  return Object.freeze({
    descriptor: Object.freeze({
      resourceName: "racialtypes.2da",
      sourceObjectKey: input.sourceObjectKey,
      sourceLayer: input.sourceLayer,
      sha256,
      sizeBytes: input.bytes.length,
      rowCount: table.rows.length,
    }),
    rows: Object.freeze(rows),
  });
}

export function isExactEffectiveCreatureRacialTypesTwoDaTable(
  value: unknown,
): value is EffectiveCreatureRacialTypesTwoDaTable {
  if (!isPlainRecord(value) || !hasExactKeys(value, ["descriptor", "rows"]) ||
    !isDescriptor(value.descriptor) || !Array.isArray(value.rows) ||
    value.rows.length > value.descriptor.rowCount) return false;
  let previousRowIndex = -1;
  for (const row of value.rows) {
    if (!isPlainRecord(row) ||
      !hasExactKeys(row, ["rowIndex", "constitutionAdjust"]) ||
      !Number.isSafeInteger(row.rowIndex) || Number(row.rowIndex) <= previousRowIndex ||
      Number(row.rowIndex) >= value.descriptor.rowCount ||
      !Number.isSafeInteger(row.constitutionAdjust) ||
      Number(row.constitutionAdjust) < -0x8000_0000 ||
      Number(row.constitutionAdjust) > 0x7fff_ffff) return false;
    previousRowIndex = Number(row.rowIndex);
  }
  return true;
}
