import { createHash } from "node:crypto";

import {
  parseAuroraTwoDaTable,
  type AuroraTwoDaRow,
  type AuroraTwoDaTable,
} from "../../../common/aurora/two-da/aurora-two-da-table";

export const MAX_EFFECTIVE_CREATURE_PHENOTYPE_TWO_DA_BYTES = 64 * 1024 * 1024;
export const MAX_EFFECTIVE_CREATURE_PHENOTYPE_TWO_DA_ROWS = 1_000_000;
export const MAX_EFFECTIVE_CREATURE_PHENOTYPE_TWO_DA_SOURCE_OBJECT_KEY_LENGTH = 2048;
export const MAX_EFFECTIVE_CREATURE_PHENOTYPE_TWO_DA_PAGE_ROWS = 256;
export const MAX_EFFECTIVE_CREATURE_PHENOTYPE_TWO_DA_QUERY_CODE_UNITS = 128;
export const MAX_EFFECTIVE_CREATURE_PHENOTYPE_TWO_DA_DISPLAY_CODE_UNITS = 1024;
export const MAX_EFFECTIVE_CREATURE_PHENOTYPE_TWO_DA_LABEL_CODE_UNITS = 256;
export const MAX_CREATURE_PHENOTYPE_BYTE_ROW_INDEX = 0xff;

const DWORD_MAX = 0xffff_ffff;

export type EffectiveCreaturePhenotypeTwoDaSourceLayer = "module" | "hak" | "vanilla";

export interface EffectiveCreaturePhenotypeTwoDaDescriptor {
  resourceName: "phenotype.2da";
  sourceObjectKey: string;
  sourceLayer: EffectiveCreaturePhenotypeTwoDaSourceLayer;
  sha256: string;
  sizeBytes: number;
  rowCount: number;
}

export interface EffectiveCreaturePhenotypeTwoDaDescriptorInput {
  bytes: Buffer;
  sourceObjectKey: string;
  sourceLayer: string;
}

export interface EffectiveCreaturePhenotypeTwoDaSourceRow {
  rowIndex: number;
  nameStrRef?: number;
  label?: string;
}

export type EffectiveCreaturePhenotypeTwoDaDisplaySource = "strref" | "strref_id";

export interface EffectiveCreaturePhenotypeTwoDaRowOption
  extends EffectiveCreaturePhenotypeTwoDaSourceRow {
  displayName: string;
  displaySource: EffectiveCreaturePhenotypeTwoDaDisplaySource;
  nameStrRef: number;
}

function isEffectiveSourceLayer(
  value: string,
): value is EffectiveCreaturePhenotypeTwoDaSourceLayer {
  return value === "module" || value === "hak" || value === "vanilla";
}

export function isSupportedEffectiveCreaturePhenotypeTwoDaInput(
  input: EffectiveCreaturePhenotypeTwoDaDescriptorInput,
): input is EffectiveCreaturePhenotypeTwoDaDescriptorInput & {
  sourceLayer: EffectiveCreaturePhenotypeTwoDaSourceLayer;
} {
  return Buffer.isBuffer(input.bytes) &&
    input.bytes.length >= 1 &&
    input.bytes.length <= MAX_EFFECTIVE_CREATURE_PHENOTYPE_TWO_DA_BYTES &&
    typeof input.sourceObjectKey === "string" &&
    input.sourceObjectKey.length >= 1 &&
    input.sourceObjectKey.length <=
      MAX_EFFECTIVE_CREATURE_PHENOTYPE_TWO_DA_SOURCE_OBJECT_KEY_LENGTH &&
    isEffectiveSourceLayer(input.sourceLayer);
}

export function isSupportedEffectiveCreaturePhenotypeTwoDaTable(
  table: AuroraTwoDaTable,
): boolean {
  const normalizedHeader = table.header.map((entry) => entry.toUpperCase());
  return !(
    table.version !== "2DA V2.0" ||
    normalizedHeader.filter((entry) => entry === "NAME").length !== 1 ||
    table.rows.length < 1 ||
    table.rows.length > MAX_EFFECTIVE_CREATURE_PHENOTYPE_TWO_DA_ROWS ||
    table.diagnostics.some(
      (entry) => entry.severity === "error" || entry.code === "VFX_2DA_ROW_ID_REQUIRED",
    )
  );
}

export function buildEffectiveCreaturePhenotypeTwoDaDescriptor(
  input: EffectiveCreaturePhenotypeTwoDaDescriptorInput,
): EffectiveCreaturePhenotypeTwoDaDescriptor | null {
  if (!isSupportedEffectiveCreaturePhenotypeTwoDaInput(input)) return null;
  const sha256 = createHash("sha256").update(input.bytes).digest("hex");
  const table = parseAuroraTwoDaTable(input.bytes, {
    tableName: "phenotype.2da",
    profile: "effective-creature-phenotype-source-provenance",
    sourceObjectKey: input.sourceObjectKey,
    sourceLayer: input.sourceLayer,
    sourceHash: sha256,
  });
  if (!isSupportedEffectiveCreaturePhenotypeTwoDaTable(table)) return null;
  return {
    resourceName: "phenotype.2da",
    sourceObjectKey: input.sourceObjectKey,
    sourceLayer: input.sourceLayer,
    sha256,
    sizeBytes: input.bytes.length,
    rowCount: table.rows.length,
  };
}

function readDecodedRowValues(
  row: AuroraTwoDaRow,
  header: string[],
): { label?: string; name?: string } {
  const normalizedHeader = header.map((entry) => entry.toUpperCase());
  return {
    label: row.cells[normalizedHeader.indexOf("LABEL")]?.value,
    name: row.cells[normalizedHeader.indexOf("NAME")]?.value,
  };
}

function readLabel(value: string | undefined): string | undefined {
  return typeof value === "string" &&
    value.length >= 1 &&
    value.length <= MAX_EFFECTIVE_CREATURE_PHENOTYPE_TWO_DA_LABEL_CODE_UNITS &&
    value !== "****" &&
    !value.includes("\0")
    ? value
    : undefined;
}

function readNameStrRef(value: string | undefined): number | undefined {
  if (!value || !/^-?\d+$/u.test(value)) return undefined;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < -1 || parsed > DWORD_MAX) return undefined;
  return parsed === -1 ? DWORD_MAX : parsed;
}

export function parseEffectiveCreaturePhenotypeTwoDaRows(
  bytes: Buffer,
): EffectiveCreaturePhenotypeTwoDaSourceRow[] | null {
  const table = parseAuroraTwoDaTable(bytes, {
    tableName: "phenotype.2da",
    profile: "effective-creature-phenotype-toolset-row-catalog",
  });
  if (!isSupportedEffectiveCreaturePhenotypeTwoDaTable(table)) return null;
  return table.rows.map((row) => {
    const decoded = readDecodedRowValues(row, table.header);
    const nameStrRef = readNameStrRef(decoded.name);
    const label = readLabel(decoded.label);
    return {
      rowIndex: row.physicalRowIndex,
      ...(nameStrRef !== undefined ? { nameStrRef } : {}),
      ...(label !== undefined ? { label } : {}),
    };
  });
}

function isSupportedDisplayName(value: unknown): value is string {
  return typeof value === "string" &&
    value.length >= 1 &&
    value.length <= MAX_EFFECTIVE_CREATURE_PHENOTYPE_TWO_DA_DISPLAY_CODE_UNITS &&
    !value.includes("\0");
}

export function buildEffectiveCreaturePhenotypeTwoDaRowOptions(
  rows: readonly EffectiveCreaturePhenotypeTwoDaSourceRow[],
  resolveStrRef: (strRef: number) => string | undefined,
): EffectiveCreaturePhenotypeTwoDaRowOption[] {
  const options: EffectiveCreaturePhenotypeTwoDaRowOption[] = [];
  for (const row of rows) {
    if (
      !Number.isSafeInteger(row.rowIndex) ||
      row.rowIndex < 0 ||
      row.rowIndex > MAX_CREATURE_PHENOTYPE_BYTE_ROW_INDEX ||
      row.rowIndex === 1 ||
      !Number.isSafeInteger(row.nameStrRef) ||
      Number(row.nameStrRef) < 1 ||
      Number(row.nameStrRef) >= DWORD_MAX
    ) continue;
    let localizedName: string | undefined;
    try {
      const resolved = resolveStrRef(Number(row.nameStrRef));
      localizedName = isSupportedDisplayName(resolved) ? resolved : undefined;
    } catch {
      localizedName = undefined;
    }
    options.push({
      rowIndex: row.rowIndex,
      displayName: localizedName ?? `StringRef ${row.nameStrRef}`,
      displaySource: localizedName ? "strref" : "strref_id",
      nameStrRef: Number(row.nameStrRef),
      ...(readLabel(row.label) ? { label: row.label } : {}),
    });
  }
  return options;
}
