import { createHash } from "node:crypto";

import {
  parseAuroraTwoDaTable,
  type AuroraTwoDaRow,
  type AuroraTwoDaTable,
} from "../../../common/aurora/two-da/aurora-two-da-table";

export const CREATURE_APPENDAGE_TWO_DA_RESOURCE_NAMES = Object.freeze([
  "wingmodel.2da",
  "tailmodel.2da",
] as const);
export type EffectiveCreatureAppendageTwoDaResourceName =
  typeof CREATURE_APPENDAGE_TWO_DA_RESOURCE_NAMES[number];
export type EffectiveCreatureAppendageTwoDaSourceLayer = "module" | "hak" | "vanilla";

export const MAX_EFFECTIVE_CREATURE_APPENDAGE_TWO_DA_BYTES = 64 * 1024 * 1024;
export const MAX_EFFECTIVE_CREATURE_APPENDAGE_TWO_DA_ROWS = 1_000_000;
export const MAX_EFFECTIVE_CREATURE_APPENDAGE_TWO_DA_SOURCE_OBJECT_KEY_LENGTH = 2048;
export const MAX_EFFECTIVE_CREATURE_APPENDAGE_TWO_DA_PAGE_ROWS = 256;
export const MAX_EFFECTIVE_CREATURE_APPENDAGE_TWO_DA_QUERY_CODE_UNITS = 128;
export const MAX_EFFECTIVE_CREATURE_APPENDAGE_TWO_DA_DISPLAY_CODE_UNITS = 1024;

export interface EffectiveCreatureAppendageTwoDaDescriptor {
  resourceName: EffectiveCreatureAppendageTwoDaResourceName;
  sourceObjectKey: string;
  sourceLayer: EffectiveCreatureAppendageTwoDaSourceLayer;
  sha256: string;
  sizeBytes: number;
  rowCount: number;
}

export interface EffectiveCreatureAppendageTwoDaDescriptorInput {
  bytes: Buffer;
  resourceName: string;
  sourceObjectKey: string;
  sourceLayer: string;
}

export interface EffectiveCreatureAppendageTwoDaSourceRow {
  rowIndex: number;
  displayName?: string;
}

export interface EffectiveCreatureAppendageTwoDaRowOption {
  rowIndex: number;
  displayName: string;
}

function isResourceName(value: string): value is EffectiveCreatureAppendageTwoDaResourceName {
  return CREATURE_APPENDAGE_TWO_DA_RESOURCE_NAMES.includes(
    value as EffectiveCreatureAppendageTwoDaResourceName,
  );
}

function isSourceLayer(value: string): value is EffectiveCreatureAppendageTwoDaSourceLayer {
  return value === "module" || value === "hak" || value === "vanilla";
}

export function isSupportedEffectiveCreatureAppendageTwoDaInput(
  input: EffectiveCreatureAppendageTwoDaDescriptorInput,
): input is EffectiveCreatureAppendageTwoDaDescriptorInput & {
  resourceName: EffectiveCreatureAppendageTwoDaResourceName;
  sourceLayer: EffectiveCreatureAppendageTwoDaSourceLayer;
} {
  return Buffer.isBuffer(input.bytes) &&
    input.bytes.length >= 1 &&
    input.bytes.length <= MAX_EFFECTIVE_CREATURE_APPENDAGE_TWO_DA_BYTES &&
    isResourceName(input.resourceName) &&
    typeof input.sourceObjectKey === "string" &&
    input.sourceObjectKey.length >= 1 &&
    input.sourceObjectKey.length <= MAX_EFFECTIVE_CREATURE_APPENDAGE_TWO_DA_SOURCE_OBJECT_KEY_LENGTH &&
    isSourceLayer(input.sourceLayer);
}

export function isSupportedEffectiveCreatureAppendageTwoDaTable(
  table: AuroraTwoDaTable,
): boolean {
  return table.version === "2DA V2.0" &&
    table.header.includes("LABEL") &&
    table.rows.length >= 1 &&
    table.rows.length <= MAX_EFFECTIVE_CREATURE_APPENDAGE_TWO_DA_ROWS &&
    !table.diagnostics.some(
      (entry) => entry.severity === "error" || entry.code === "VFX_2DA_ROW_ID_REQUIRED",
    );
}

export function buildEffectiveCreatureAppendageTwoDaDescriptor(
  input: EffectiveCreatureAppendageTwoDaDescriptorInput,
): EffectiveCreatureAppendageTwoDaDescriptor | null {
  if (!isSupportedEffectiveCreatureAppendageTwoDaInput(input)) return null;
  const sha256 = createHash("sha256").update(input.bytes).digest("hex");
  const table = parseAuroraTwoDaTable(input.bytes, {
    tableName: input.resourceName,
    profile: "effective-creature-appendage-source-provenance",
    sourceObjectKey: input.sourceObjectKey,
    sourceLayer: input.sourceLayer,
    sourceHash: sha256,
  });
  if (!isSupportedEffectiveCreatureAppendageTwoDaTable(table)) return null;
  return {
    resourceName: input.resourceName,
    sourceObjectKey: input.sourceObjectKey,
    sourceLayer: input.sourceLayer,
    sha256,
    sizeBytes: input.bytes.length,
    rowCount: table.rows.length,
  };
}

function readRowCell(
  row: AuroraTwoDaRow,
  header: readonly string[],
  name: string,
): string | undefined {
  const index = header.indexOf(name);
  return index >= 0 ? row.cells[index]?.value : undefined;
}

function readDisplayName(value: string | undefined): string | undefined {
  return typeof value === "string" &&
    value !== "****" &&
    value.length >= 1 &&
    value.length <= MAX_EFFECTIVE_CREATURE_APPENDAGE_TWO_DA_DISPLAY_CODE_UNITS &&
    !value.includes("\0")
    ? value
    : undefined;
}

export function parseEffectiveCreatureAppendageTwoDaRows(
  bytes: Buffer,
  resourceName: EffectiveCreatureAppendageTwoDaResourceName,
): EffectiveCreatureAppendageTwoDaSourceRow[] | null {
  const table = parseAuroraTwoDaTable(bytes, {
    tableName: resourceName,
    profile: "effective-creature-appendage-toolset-row-catalog",
  });
  if (!isSupportedEffectiveCreatureAppendageTwoDaTable(table)) return null;
  return table.rows.map((row) => {
    const displayName = readDisplayName(readRowCell(row, table.header, "LABEL"));
    return {
      rowIndex: row.physicalRowIndex,
      ...(displayName !== undefined ? { displayName } : {}),
    };
  });
}

export function buildEffectiveCreatureAppendageTwoDaRowOptions(
  rows: readonly EffectiveCreatureAppendageTwoDaSourceRow[],
): EffectiveCreatureAppendageTwoDaRowOption[] {
  return rows.flatMap((row) =>
    Number.isSafeInteger(row.rowIndex) &&
      row.rowIndex >= 0 &&
      row.rowIndex <= 0xffff_ffff &&
      readDisplayName(row.displayName) !== undefined
      ? [{ rowIndex: row.rowIndex, displayName: row.displayName! }]
      : []
  );
}
