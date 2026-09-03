import { createHash } from "node:crypto";

import {
  parseAuroraTwoDaTable,
  type AuroraTwoDaRow,
} from "../../../common/aurora/two-da/aurora-two-da-table";

export const MAX_EFFECTIVE_TRAPS_TWO_DA_BYTES = 16 * 1024 * 1024;
export const MAX_EFFECTIVE_TRAPS_TWO_DA_ROWS = 256;
export const MAX_EFFECTIVE_TRAPS_TWO_DA_SOURCE_OBJECT_KEY_LENGTH = 2048;
export const MAX_EFFECTIVE_TRAPS_TWO_DA_LABEL_CODE_UNITS = 256;
export const MAX_EFFECTIVE_TRAPS_TWO_DA_DISPLAY_CODE_UNITS = 1024;

export type EffectiveTrapsTwoDaSourceLayer = "module" | "hak" | "vanilla";

export interface EffectiveTrapsTwoDaDescriptor {
  resourceName: "traps.2da";
  sourceObjectKey: string;
  sourceLayer: EffectiveTrapsTwoDaSourceLayer;
  sha256: string;
  sizeBytes: number;
  rowCount: number;
}

export interface EffectiveTrapsTwoDaSourceRow {
  rowIndex: number;
  label?: string;
  trapNameStrRef?: number;
  setDc: number;
  detectDcMod: number;
  disarmDcMod: number;
}

export type EffectiveTrapsTwoDaDisplaySource = "strref" | "label" | "row_index";

export interface EffectiveTrapsTwoDaRowOption extends EffectiveTrapsTwoDaSourceRow {
  displayName: string;
  displaySource: EffectiveTrapsTwoDaDisplaySource;
}

export interface EffectiveTrapsTwoDaTable {
  descriptor: EffectiveTrapsTwoDaDescriptor;
  rows: EffectiveTrapsTwoDaSourceRow[];
}

export interface EffectiveTrapsTwoDaResolvedTable {
  descriptor: EffectiveTrapsTwoDaDescriptor;
  rows: EffectiveTrapsTwoDaRowOption[];
}

export interface EffectiveTrapsTwoDaInput {
  bytes: Buffer;
  sourceObjectKey: string;
  sourceLayer: string;
}

const REQUIRED_COLUMNS = [
  "TrapName",
  "SetDC",
  "DetectDCMod",
  "DisarmDCMod",
] as const;

function isSourceLayer(value: string): value is EffectiveTrapsTwoDaSourceLayer {
  return value === "module" || value === "hak" || value === "vanilla";
}

export function isEffectiveTrapsTwoDaInputAdmitted(
  input: EffectiveTrapsTwoDaInput,
): input is EffectiveTrapsTwoDaInput & { sourceLayer: EffectiveTrapsTwoDaSourceLayer } {
  return Buffer.isBuffer(input.bytes) &&
    input.bytes.length >= 1 &&
    input.bytes.length <= MAX_EFFECTIVE_TRAPS_TWO_DA_BYTES &&
    typeof input.sourceObjectKey === "string" &&
    input.sourceObjectKey.length >= 1 &&
    input.sourceObjectKey.length <= MAX_EFFECTIVE_TRAPS_TWO_DA_SOURCE_OBJECT_KEY_LENGTH &&
    isSourceLayer(input.sourceLayer);
}

function readCell(
  row: AuroraTwoDaRow,
  header: readonly string[],
  column: string,
): string | undefined {
  const index = header.indexOf(column);
  return row.cells[index]?.value;
}

function readByte(value: string | undefined): number | null {
  if (!/^\d+$/u.test(value ?? "")) {
    return null;
  }
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed <= 0xff
    ? parsed
    : null;
}

function readOptionalUint32(value: string | undefined): number | null | undefined {
  if (value === "****") {
    return undefined;
  }
  if (!/^\d+$/u.test(value ?? "")) {
    return null;
  }
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed <= 0xffff_ffff
    ? parsed
    : null;
}

function readOptionalLabel(value: string | undefined): string | null | undefined {
  if (value === undefined || value === "****") {
    return undefined;
  }
  return value.length >= 1 &&
    value.length <= MAX_EFFECTIVE_TRAPS_TWO_DA_LABEL_CODE_UNITS &&
    !value.includes("\0")
    ? value
    : null;
}

export function parseEffectiveTrapsTwoDa(
  input: EffectiveTrapsTwoDaInput,
): EffectiveTrapsTwoDaTable | null {
  if (!isEffectiveTrapsTwoDaInputAdmitted(input)) {
    return null;
  }

  const sha256 = createHash("sha256").update(input.bytes).digest("hex");
  const table = parseAuroraTwoDaTable(input.bytes, {
    tableName: "traps.2da",
    profile: "effective-traps-source-provenance",
    sourceObjectKey: input.sourceObjectKey,
    sourceLayer: input.sourceLayer,
    sourceHash: sha256,
  });
  if (
    table.rows.length < 1 ||
    table.rows.length > MAX_EFFECTIVE_TRAPS_TWO_DA_ROWS ||
    REQUIRED_COLUMNS.some(
      (column) => table.header.filter((candidate) => candidate === column).length !== 1,
    ) ||
    table.diagnostics.some((entry) => entry.severity === "error")
  ) {
    return null;
  }

  const rows: EffectiveTrapsTwoDaSourceRow[] = [];
  for (const row of table.rows) {
    const label = readOptionalLabel(readCell(row, table.header, "Label"));
    const trapNameStrRef = readOptionalUint32(readCell(row, table.header, "TrapName"));
    const setDc = readByte(readCell(row, table.header, "SetDC"));
    const detectDcMod = readByte(readCell(row, table.header, "DetectDCMod"));
    const disarmDcMod = readByte(readCell(row, table.header, "DisarmDCMod"));
    if (
      label === null ||
      trapNameStrRef === null ||
      setDc === null ||
      detectDcMod === null ||
      disarmDcMod === null
    ) {
      return null;
    }
    rows.push({
      rowIndex: row.physicalRowIndex,
      ...(label === undefined ? {} : { label }),
      ...(trapNameStrRef === undefined ? {} : { trapNameStrRef }),
      setDc,
      detectDcMod,
      disarmDcMod,
    });
  }

  return {
    descriptor: {
      resourceName: "traps.2da",
      sourceObjectKey: input.sourceObjectKey,
      sourceLayer: input.sourceLayer,
      sha256,
      sizeBytes: input.bytes.length,
      rowCount: rows.length,
    },
    rows,
  };
}

function isDisplayName(value: unknown): value is string {
  return typeof value === "string" &&
    value.length >= 1 &&
    value.length <= MAX_EFFECTIVE_TRAPS_TWO_DA_DISPLAY_CODE_UNITS &&
    !value.includes("\0");
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype;
}

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const keys = Object.keys(value);
  return keys.length === expected.length && expected.every((key) => keys.includes(key));
}

function isByte(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0 && Number(value) <= 0xff;
}

export function isExactEffectiveTrapsTwoDaResolvedTable(
  value: unknown,
): value is EffectiveTrapsTwoDaResolvedTable {
  if (!isPlainRecord(value) || !hasExactKeys(value, ["descriptor", "rows"]) ||
    !isPlainRecord(value.descriptor) || !Array.isArray(value.rows)) return false;
  const descriptor = value.descriptor;
  if (!hasExactKeys(descriptor, [
    "resourceName", "sourceObjectKey", "sourceLayer", "sha256", "sizeBytes", "rowCount",
  ]) || descriptor.resourceName !== "traps.2da" ||
    typeof descriptor.sourceObjectKey !== "string" || descriptor.sourceObjectKey.length < 1 ||
    descriptor.sourceObjectKey.length > MAX_EFFECTIVE_TRAPS_TWO_DA_SOURCE_OBJECT_KEY_LENGTH ||
    !isSourceLayer(descriptor.sourceLayer as string) ||
    typeof descriptor.sha256 !== "string" || !/^[a-f0-9]{64}$/u.test(descriptor.sha256) ||
    !Number.isSafeInteger(descriptor.sizeBytes) || Number(descriptor.sizeBytes) < 1 ||
    Number(descriptor.sizeBytes) > MAX_EFFECTIVE_TRAPS_TWO_DA_BYTES ||
    !Number.isSafeInteger(descriptor.rowCount) || Number(descriptor.rowCount) < 1 ||
    Number(descriptor.rowCount) > MAX_EFFECTIVE_TRAPS_TWO_DA_ROWS ||
    value.rows.length !== descriptor.rowCount) return false;
  return value.rows.every((rawRow, index) => {
    if (!isPlainRecord(rawRow)) return false;
    const allowed = [
      "rowIndex", "label", "trapNameStrRef", "setDc", "detectDcMod", "disarmDcMod",
      "displayName", "displaySource",
    ];
    if (Object.keys(rawRow).some((key) => !allowed.includes(key)) ||
      rawRow.rowIndex !== index || !isByte(rawRow.setDc) || !isByte(rawRow.detectDcMod) ||
      !isByte(rawRow.disarmDcMod) ||
      (rawRow.label !== undefined && (typeof rawRow.label !== "string" ||
        rawRow.label.length < 1 || rawRow.label.length > MAX_EFFECTIVE_TRAPS_TWO_DA_LABEL_CODE_UNITS ||
        rawRow.label.includes("\0"))) ||
      (rawRow.trapNameStrRef !== undefined && (!Number.isSafeInteger(rawRow.trapNameStrRef) ||
        Number(rawRow.trapNameStrRef) < 0 || Number(rawRow.trapNameStrRef) > 0xffff_ffff)) ||
      !isDisplayName(rawRow.displayName) ||
      (rawRow.displaySource !== "strref" && rawRow.displaySource !== "label" &&
        rawRow.displaySource !== "row_index")) return false;
    return true;
  });
}

export function buildEffectiveTrapsTwoDaRowOptions(
  rows: readonly EffectiveTrapsTwoDaSourceRow[],
  resolveStrRef: (strRef: number) => string | undefined,
): EffectiveTrapsTwoDaRowOption[] {
  return rows.map((row) => {
    let localizedName: string | undefined;
    if (row.trapNameStrRef !== undefined) {
      try {
        const resolved = resolveStrRef(row.trapNameStrRef);
        localizedName = isDisplayName(resolved) ? resolved : undefined;
      } catch {
        localizedName = undefined;
      }
    }
    return {
      ...row,
      displayName: localizedName ?? row.label ?? `Row ${row.rowIndex}`,
      displaySource: localizedName
        ? "strref"
        : row.label
          ? "label"
          : "row_index",
    };
  });
}
