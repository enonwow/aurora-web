import { createHash } from "node:crypto";

import {
  parseAuroraTwoDaTable,
  type AuroraTwoDaRow,
} from "../../../common/aurora/two-da/aurora-two-da-table";

export const MAX_EFFECTIVE_BODYBAG_TWO_DA_BYTES = 16 * 1024 * 1024;
export const MAX_EFFECTIVE_BODYBAG_TWO_DA_ROWS = 256;
export const MAX_EFFECTIVE_BODYBAG_TWO_DA_SOURCE_OBJECT_KEY_LENGTH = 2048;
export const MAX_EFFECTIVE_BODYBAG_TWO_DA_LABEL_CODE_UNITS = 256;
export const MAX_EFFECTIVE_BODYBAG_TWO_DA_DISPLAY_CODE_UNITS = 1024;

export type EffectiveBodyBagTwoDaSourceLayer = "module" | "hak" | "vanilla";

export interface EffectiveBodyBagTwoDaDescriptor {
  resourceName: "bodybag.2da";
  sourceObjectKey: string;
  sourceLayer: EffectiveBodyBagTwoDaSourceLayer;
  sha256: string;
  sizeBytes: number;
  rowCount: number;
}

export interface EffectiveBodyBagTwoDaSourceRow {
  rowIndex: number;
  label?: string;
  nameStrRef: number;
}

export type EffectiveBodyBagTwoDaDisplaySource = "strref" | "label" | "row_index";

export interface EffectiveBodyBagTwoDaRowOption extends EffectiveBodyBagTwoDaSourceRow {
  displayName: string;
  displaySource: EffectiveBodyBagTwoDaDisplaySource;
}

export interface EffectiveBodyBagTwoDaTable {
  descriptor: EffectiveBodyBagTwoDaDescriptor;
  rows: EffectiveBodyBagTwoDaSourceRow[];
}

export interface EffectiveBodyBagTwoDaResolvedTable {
  descriptor: EffectiveBodyBagTwoDaDescriptor;
  rows: EffectiveBodyBagTwoDaRowOption[];
}

export interface EffectiveBodyBagTwoDaInput {
  bytes: Buffer;
  sourceObjectKey: string;
  sourceLayer: string;
}

function isSourceLayer(value: string): value is EffectiveBodyBagTwoDaSourceLayer {
  return value === "module" || value === "hak" || value === "vanilla";
}

export function isEffectiveBodyBagTwoDaInputAdmitted(
  input: EffectiveBodyBagTwoDaInput,
): input is EffectiveBodyBagTwoDaInput & { sourceLayer: EffectiveBodyBagTwoDaSourceLayer } {
  return Buffer.isBuffer(input.bytes) &&
    input.bytes.length >= 1 &&
    input.bytes.length <= MAX_EFFECTIVE_BODYBAG_TWO_DA_BYTES &&
    typeof input.sourceObjectKey === "string" &&
    input.sourceObjectKey.length >= 1 &&
    input.sourceObjectKey.length <= MAX_EFFECTIVE_BODYBAG_TWO_DA_SOURCE_OBJECT_KEY_LENGTH &&
    isSourceLayer(input.sourceLayer);
}

function readCell(
  row: AuroraTwoDaRow,
  header: readonly string[],
  column: string,
): string | undefined {
  const index = header.indexOf(column);
  return index < 0 ? undefined : row.cells[index]?.value;
}

function readUint32(value: string | undefined): number | null {
  if (!/^\d+$/u.test(value ?? "")) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed <= 0xffff_ffff ? parsed : null;
}

function readOptionalLabel(value: string | undefined): string | null | undefined {
  if (value === undefined || value === "****") return undefined;
  return value.length >= 1 &&
    value.length <= MAX_EFFECTIVE_BODYBAG_TWO_DA_LABEL_CODE_UNITS &&
    !value.includes("\0")
    ? value
    : null;
}

export function parseEffectiveBodyBagTwoDa(
  input: EffectiveBodyBagTwoDaInput,
): EffectiveBodyBagTwoDaTable | null {
  if (!isEffectiveBodyBagTwoDaInputAdmitted(input)) return null;
  const sha256 = createHash("sha256").update(input.bytes).digest("hex");
  const table = parseAuroraTwoDaTable(input.bytes, {
    tableName: "bodybag.2da",
    profile: "effective-bodybag-source-provenance",
    sourceObjectKey: input.sourceObjectKey,
    sourceLayer: input.sourceLayer,
    sourceHash: sha256,
  });
  if (
    table.rows.length < 1 ||
    table.rows.length > MAX_EFFECTIVE_BODYBAG_TWO_DA_ROWS ||
    table.header.filter((column) => column === "Name").length !== 1 ||
    table.diagnostics.some((entry) => entry.severity === "error")
  ) return null;

  const rows: EffectiveBodyBagTwoDaSourceRow[] = [];
  for (const row of table.rows) {
    const label = readOptionalLabel(readCell(row, table.header, "LABEL"));
    const nameStrRef = readUint32(readCell(row, table.header, "Name"));
    if (label === null || nameStrRef === null) return null;
    rows.push({
      rowIndex: row.physicalRowIndex,
      ...(label === undefined ? {} : { label }),
      nameStrRef,
    });
  }
  return {
    descriptor: {
      resourceName: "bodybag.2da",
      sourceObjectKey: input.sourceObjectKey,
      sourceLayer: input.sourceLayer,
      sha256,
      sizeBytes: input.bytes.length,
      rowCount: rows.length,
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

function isDisplayName(value: unknown): value is string {
  return typeof value === "string" && value.length >= 1 &&
    value.length <= MAX_EFFECTIVE_BODYBAG_TWO_DA_DISPLAY_CODE_UNITS &&
    !value.includes("\0");
}

export function isExactEffectiveBodyBagTwoDaResolvedTable(
  value: unknown,
): value is EffectiveBodyBagTwoDaResolvedTable {
  if (!isPlainRecord(value) || !hasExactKeys(value, ["descriptor", "rows"]) ||
    !isPlainRecord(value.descriptor) || !Array.isArray(value.rows)) return false;
  const descriptor = value.descriptor;
  if (!hasExactKeys(descriptor, [
    "resourceName", "sourceObjectKey", "sourceLayer", "sha256", "sizeBytes", "rowCount",
  ]) || descriptor.resourceName !== "bodybag.2da" ||
    typeof descriptor.sourceObjectKey !== "string" || descriptor.sourceObjectKey.length < 1 ||
    descriptor.sourceObjectKey.length > MAX_EFFECTIVE_BODYBAG_TWO_DA_SOURCE_OBJECT_KEY_LENGTH ||
    typeof descriptor.sourceLayer !== "string" || !isSourceLayer(descriptor.sourceLayer) ||
    typeof descriptor.sha256 !== "string" || !/^[a-f0-9]{64}$/u.test(descriptor.sha256) ||
    !Number.isSafeInteger(descriptor.sizeBytes) || Number(descriptor.sizeBytes) < 1 ||
    Number(descriptor.sizeBytes) > MAX_EFFECTIVE_BODYBAG_TWO_DA_BYTES ||
    !Number.isSafeInteger(descriptor.rowCount) || Number(descriptor.rowCount) < 1 ||
    Number(descriptor.rowCount) > MAX_EFFECTIVE_BODYBAG_TWO_DA_ROWS ||
    value.rows.length !== descriptor.rowCount) return false;
  return value.rows.every((rawRow, index) => {
    if (!isPlainRecord(rawRow)) return false;
    const allowed = ["rowIndex", "label", "nameStrRef", "displayName", "displaySource"];
    return !Object.keys(rawRow).some((key) => !allowed.includes(key)) &&
      rawRow.rowIndex === index &&
      Number.isSafeInteger(rawRow.nameStrRef) && Number(rawRow.nameStrRef) >= 0 &&
      Number(rawRow.nameStrRef) <= 0xffff_ffff &&
      (rawRow.label === undefined || (typeof rawRow.label === "string" &&
        rawRow.label.length >= 1 &&
        rawRow.label.length <= MAX_EFFECTIVE_BODYBAG_TWO_DA_LABEL_CODE_UNITS &&
        !rawRow.label.includes("\0"))) &&
      isDisplayName(rawRow.displayName) &&
      (rawRow.displaySource === "strref" || rawRow.displaySource === "label" ||
        rawRow.displaySource === "row_index");
  });
}

export function buildEffectiveBodyBagTwoDaRowOptions(
  rows: readonly EffectiveBodyBagTwoDaSourceRow[],
  resolveStrRef: (strRef: number) => string | undefined,
): EffectiveBodyBagTwoDaRowOption[] {
  return rows.map((row) => {
    let localizedName: string | undefined;
    try {
      const resolved = resolveStrRef(row.nameStrRef);
      localizedName = isDisplayName(resolved) ? resolved : undefined;
    } catch {
      localizedName = undefined;
    }
    return {
      ...row,
      displayName: localizedName ?? row.label ?? `Row ${row.rowIndex}`,
      displaySource: localizedName ? "strref" : row.label ? "label" : "row_index",
    };
  });
}
