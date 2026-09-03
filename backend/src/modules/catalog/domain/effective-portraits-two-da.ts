import { createHash } from "node:crypto";

import {
  parseAuroraTwoDaTable,
  type AuroraTwoDaRow,
} from "../../../common/aurora/two-da/aurora-two-da-table";

export const MAX_EFFECTIVE_PORTRAITS_TWO_DA_BYTES = 16 * 1024 * 1024;
export const MAX_EFFECTIVE_PORTRAITS_TWO_DA_ROWS = 65_536;
export const MAX_EFFECTIVE_PORTRAITS_TWO_DA_SOURCE_OBJECT_KEY_LENGTH = 2048;

export type EffectivePortraitsTwoDaSourceLayer = "module" | "hak" | "vanilla";

export interface EffectivePortraitsTwoDaDescriptor {
  resourceName: "portraits.2da";
  sourceObjectKey: string;
  sourceLayer: EffectivePortraitsTwoDaSourceLayer;
  sha256: string;
  sizeBytes: number;
  rowCount: number;
}

export interface EffectivePortraitsTwoDaRow {
  rowIndex: number;
  baseResRef: string;
}

export interface EffectivePortraitsTwoDaTable {
  descriptor: EffectivePortraitsTwoDaDescriptor;
  rows: EffectivePortraitsTwoDaRow[];
}

export interface EffectivePortraitsTwoDaInput {
  bytes: Buffer;
  sourceObjectKey: string;
  sourceLayer: string;
}

function isSourceLayer(value: string): value is EffectivePortraitsTwoDaSourceLayer {
  return value === "module" || value === "hak" || value === "vanilla";
}

export function isEffectivePortraitsTwoDaInputAdmitted(
  input: EffectivePortraitsTwoDaInput,
): input is EffectivePortraitsTwoDaInput & { sourceLayer: EffectivePortraitsTwoDaSourceLayer } {
  return Buffer.isBuffer(input.bytes) &&
    input.bytes.length >= 1 &&
    input.bytes.length <= MAX_EFFECTIVE_PORTRAITS_TWO_DA_BYTES &&
    typeof input.sourceObjectKey === "string" &&
    input.sourceObjectKey.length >= 1 &&
    input.sourceObjectKey.length <= MAX_EFFECTIVE_PORTRAITS_TWO_DA_SOURCE_OBJECT_KEY_LENGTH &&
    isSourceLayer(input.sourceLayer);
}

export function isPlaceablePortraitBaseResRef(value: unknown): value is string {
  return typeof value === "string" && /^[a-z0-9_]{1,16}$/u.test(value);
}

function normalizeSourcePortraitBaseResRef(value: unknown): string | null {
  return typeof value === "string" && /^[A-Za-z0-9_]{1,16}$/u.test(value)
    ? value.toLowerCase()
    : null;
}

function readCell(
  row: AuroraTwoDaRow,
  header: readonly string[],
  column: string,
): string | undefined {
  const index = header.indexOf(column);
  return index < 0 ? undefined : row.cells[index]?.value;
}

export function parseEffectivePortraitsTwoDa(
  input: EffectivePortraitsTwoDaInput,
): EffectivePortraitsTwoDaTable | null {
  if (!isEffectivePortraitsTwoDaInputAdmitted(input)) return null;
  const sha256 = createHash("sha256").update(input.bytes).digest("hex");
  const table = parseAuroraTwoDaTable(input.bytes, {
    tableName: "portraits.2da",
    profile: "effective-placeable-portraits-source-provenance",
    sourceObjectKey: input.sourceObjectKey,
    sourceLayer: input.sourceLayer,
    sourceHash: sha256,
  });
  if (
    table.rows.length < 1 ||
    table.rows.length > MAX_EFFECTIVE_PORTRAITS_TWO_DA_ROWS ||
    table.header.filter((column) => column === "BaseResRef").length !== 1 ||
    table.diagnostics.some((entry) => entry.severity === "error")
  ) return null;

  const rows: EffectivePortraitsTwoDaRow[] = [];
  for (const row of table.rows) {
    const sourceBaseResRef = readCell(row, table.header, "BaseResRef");
    if (sourceBaseResRef === "****") continue;
    const baseResRef = normalizeSourcePortraitBaseResRef(sourceBaseResRef);
    if (!baseResRef) return null;
    rows.push({ rowIndex: row.physicalRowIndex, baseResRef });
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

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype;
}

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const keys = Object.keys(value);
  return keys.length === expected.length && expected.every((key) => keys.includes(key));
}

export function isExactEffectivePortraitsTwoDaTable(
  value: unknown,
): value is EffectivePortraitsTwoDaTable {
  if (!isPlainRecord(value) || !hasExactKeys(value, ["descriptor", "rows"]) ||
    !isPlainRecord(value.descriptor) || !Array.isArray(value.rows)) return false;
  const descriptor = value.descriptor;
  if (!hasExactKeys(descriptor, [
    "resourceName", "sourceObjectKey", "sourceLayer", "sha256", "sizeBytes", "rowCount",
  ]) || descriptor.resourceName !== "portraits.2da" ||
    typeof descriptor.sourceObjectKey !== "string" || descriptor.sourceObjectKey.length < 1 ||
    descriptor.sourceObjectKey.length > MAX_EFFECTIVE_PORTRAITS_TWO_DA_SOURCE_OBJECT_KEY_LENGTH ||
    typeof descriptor.sourceLayer !== "string" || !isSourceLayer(descriptor.sourceLayer) ||
    typeof descriptor.sha256 !== "string" || !/^[a-f0-9]{64}$/u.test(descriptor.sha256) ||
    !Number.isSafeInteger(descriptor.sizeBytes) || Number(descriptor.sizeBytes) < 1 ||
    Number(descriptor.sizeBytes) > MAX_EFFECTIVE_PORTRAITS_TWO_DA_BYTES ||
    !Number.isSafeInteger(descriptor.rowCount) || Number(descriptor.rowCount) < 1 ||
    Number(descriptor.rowCount) > MAX_EFFECTIVE_PORTRAITS_TWO_DA_ROWS ||
    value.rows.length < 1 || value.rows.length > Number(descriptor.rowCount)) return false;

  let previousRowIndex = -1;
  for (const row of value.rows) {
    if (!isPlainRecord(row) || !hasExactKeys(row, ["rowIndex", "baseResRef"]) ||
      !Number.isSafeInteger(row.rowIndex) || Number(row.rowIndex) <= previousRowIndex ||
      Number(row.rowIndex) >= Number(descriptor.rowCount) ||
      !isPlaceablePortraitBaseResRef(row.baseResRef)) return false;
    previousRowIndex = Number(row.rowIndex);
  }
  return true;
}
