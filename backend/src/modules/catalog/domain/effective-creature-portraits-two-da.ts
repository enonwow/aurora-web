import { createHash } from "node:crypto";

import {
  parseAuroraTwoDaTable,
  type AuroraTwoDaRow,
} from "../../../common/aurora/two-da/aurora-two-da-table";

export const MAX_EFFECTIVE_CREATURE_PORTRAITS_TWO_DA_BYTES = 16 * 1024 * 1024;
export const MAX_EFFECTIVE_CREATURE_PORTRAITS_TWO_DA_ROWS = 65_536;
export const MAX_EFFECTIVE_CREATURE_PORTRAITS_SOURCE_OBJECT_KEY_LENGTH = 2048;

export type EffectiveCreaturePortraitsTwoDaSourceLayer = "module" | "hak" | "vanilla";

export interface EffectiveCreaturePortraitsTwoDaDescriptor {
  readonly resourceName: "portraits.2da";
  readonly sourceObjectKey: string;
  readonly sourceLayer: EffectiveCreaturePortraitsTwoDaSourceLayer;
  readonly sha256: string;
  readonly sizeBytes: number;
  readonly rowCount: number;
}

export interface EffectiveCreaturePortraitsTwoDaRow {
  readonly rowIndex: number;
  readonly baseResRef: string;
  readonly sex: number;
  readonly race: number;
  readonly plot: 0;
}

export interface EffectiveCreaturePortraitsTwoDaTable {
  readonly descriptor: EffectiveCreaturePortraitsTwoDaDescriptor;
  readonly rows: readonly EffectiveCreaturePortraitsTwoDaRow[];
}

export interface EffectiveCreaturePortraitsTwoDaInput {
  readonly bytes: Buffer;
  readonly sourceObjectKey: string;
  readonly sourceLayer: string;
}

function isSourceLayer(value: string): value is EffectiveCreaturePortraitsTwoDaSourceLayer {
  return value === "module" || value === "hak" || value === "vanilla";
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype;
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value);
  return actual.length === keys.length && keys.every((key) => actual.includes(key));
}

function readCell(
  row: AuroraTwoDaRow,
  header: readonly string[],
  column: string,
): string | undefined {
  const index = header.indexOf(column);
  return index < 0 ? undefined : row.cells[index]?.value;
}

function readByteCell(value: string | undefined): number | null {
  if (!value || !/^\d{1,3}$/u.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 && parsed <= 0xff ? parsed : null;
}

function readBaseResRef(value: string | undefined): string | null {
  return typeof value === "string" && /^[A-Za-z0-9_]{1,16}$/u.test(value)
    ? value.toLowerCase()
    : null;
}

export function parseEffectiveCreaturePortraitsTwoDa(
  input: EffectiveCreaturePortraitsTwoDaInput,
): EffectiveCreaturePortraitsTwoDaTable | null {
  if (
    !Buffer.isBuffer(input.bytes) ||
    input.bytes.length < 1 ||
    input.bytes.length > MAX_EFFECTIVE_CREATURE_PORTRAITS_TWO_DA_BYTES ||
    typeof input.sourceObjectKey !== "string" ||
    input.sourceObjectKey.length < 1 ||
    input.sourceObjectKey.length > MAX_EFFECTIVE_CREATURE_PORTRAITS_SOURCE_OBJECT_KEY_LENGTH ||
    !isSourceLayer(input.sourceLayer)
  ) return null;

  const sha256 = createHash("sha256").update(input.bytes).digest("hex");
  const table = parseAuroraTwoDaTable(input.bytes, {
    tableName: "portraits.2da",
    profile: "effective-creature-portraits-toolset-selector",
    sourceObjectKey: input.sourceObjectKey,
    sourceLayer: input.sourceLayer,
    sourceHash: sha256,
  });
  const requiredColumns = ["BaseResRef", "Sex", "Race", "Plot"] as const;
  if (
    table.rows.length < 1 ||
    table.rows.length > MAX_EFFECTIVE_CREATURE_PORTRAITS_TWO_DA_ROWS ||
    requiredColumns.some(
      (column) => table.header.filter((candidate) => candidate === column).length !== 1,
    ) ||
    table.diagnostics.some((entry) => entry.severity === "error")
  ) return null;

  const rows: EffectiveCreaturePortraitsTwoDaRow[] = [];
  for (const row of table.rows) {
    const rawBaseResRef = readCell(row, table.header, "BaseResRef");
    if (rawBaseResRef === "****") continue;
    const baseResRef = readBaseResRef(rawBaseResRef);
    if (!baseResRef) return null;
    const sex = readByteCell(readCell(row, table.header, "Sex"));
    const race = readByteCell(readCell(row, table.header, "Race"));
    const plot = readByteCell(readCell(row, table.header, "Plot"));
    // Toolset filtering compares numeric Sex/Race and admits Plot exactly equal to zero.
    // Non-numeric cells and plot rows can never satisfy that selector and stay excluded.
    if (sex === null || race === null || plot !== 0) continue;
    rows.push({ rowIndex: row.physicalRowIndex, baseResRef, sex, race, plot: 0 });
  }
  if (rows.length === 0) return null;
  return {
    descriptor: {
      resourceName: "portraits.2da",
      sourceObjectKey: input.sourceObjectKey,
      sourceLayer: input.sourceLayer,
      sha256,
      sizeBytes: input.bytes.length,
      rowCount: table.rows.length,
    },
    rows,
  };
}

export function isEffectiveCreaturePortraitRowAdmitted(
  row: EffectiveCreaturePortraitsTwoDaRow,
  gender: number,
  race: number,
): boolean {
  if (
    !Number.isSafeInteger(gender) || gender < 0 || gender > 0xff ||
    !Number.isSafeInteger(race) || race < 0 || race > 0xff ||
    // The native Portrait dialog replaces the Sex filter with row 4 for races above 6.
    row.sex !== (race > 6 ? 4 : gender) || row.plot !== 0
  ) return false;
  return race === 4 ? row.race === 6 || row.race === 1 : row.race === race;
}

export function filterEffectiveCreaturePortraitRows(
  rows: readonly EffectiveCreaturePortraitsTwoDaRow[],
  gender: number,
  race: number,
): EffectiveCreaturePortraitsTwoDaRow[] {
  return rows.filter((row) => isEffectiveCreaturePortraitRowAdmitted(row, gender, race));
}

export function isExactEffectiveCreaturePortraitsTwoDaTable(
  value: unknown,
): value is EffectiveCreaturePortraitsTwoDaTable {
  if (!isPlainRecord(value) || !hasExactKeys(value, ["descriptor", "rows"]) ||
    !isPlainRecord(value.descriptor) || !Array.isArray(value.rows)) return false;
  const descriptor = value.descriptor;
  if (!hasExactKeys(descriptor, [
    "resourceName", "sourceObjectKey", "sourceLayer", "sha256", "sizeBytes", "rowCount",
  ]) || descriptor.resourceName !== "portraits.2da" ||
    typeof descriptor.sourceObjectKey !== "string" || descriptor.sourceObjectKey.length < 1 ||
    descriptor.sourceObjectKey.length > MAX_EFFECTIVE_CREATURE_PORTRAITS_SOURCE_OBJECT_KEY_LENGTH ||
    typeof descriptor.sourceLayer !== "string" || !isSourceLayer(descriptor.sourceLayer) ||
    typeof descriptor.sha256 !== "string" || !/^[a-f0-9]{64}$/u.test(descriptor.sha256) ||
    !Number.isSafeInteger(descriptor.sizeBytes) || Number(descriptor.sizeBytes) < 1 ||
    Number(descriptor.sizeBytes) > MAX_EFFECTIVE_CREATURE_PORTRAITS_TWO_DA_BYTES ||
    !Number.isSafeInteger(descriptor.rowCount) || Number(descriptor.rowCount) < 1 ||
    Number(descriptor.rowCount) > MAX_EFFECTIVE_CREATURE_PORTRAITS_TWO_DA_ROWS ||
    value.rows.length < 1 || value.rows.length > Number(descriptor.rowCount)) return false;

  let previousRowIndex = -1;
  for (const row of value.rows) {
    if (!isPlainRecord(row) ||
      !hasExactKeys(row, ["rowIndex", "baseResRef", "sex", "race", "plot"]) ||
      !Number.isSafeInteger(row.rowIndex) || Number(row.rowIndex) <= previousRowIndex ||
      Number(row.rowIndex) >= Number(descriptor.rowCount) ||
      typeof row.baseResRef !== "string" || !/^[a-z0-9_]{1,16}$/u.test(row.baseResRef) ||
      !Number.isSafeInteger(row.sex) || Number(row.sex) < 0 || Number(row.sex) > 0xff ||
      !Number.isSafeInteger(row.race) || Number(row.race) < 0 || Number(row.race) > 0xff ||
      row.plot !== 0) return false;
    previousRowIndex = Number(row.rowIndex);
  }
  return true;
}
