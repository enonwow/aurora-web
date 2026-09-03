import { createHash } from "node:crypto";

import {
  parseAuroraTwoDaTable,
  type AuroraTwoDaRow,
  type AuroraTwoDaTable,
} from "../../../common/aurora/two-da/aurora-two-da-table";

export const MAX_EFFECTIVE_CREATURE_GENDER_TWO_DA_BYTES = 64 * 1024 * 1024;
export const MAX_EFFECTIVE_CREATURE_GENDER_TWO_DA_ROWS = 1_000_000;
export const MAX_EFFECTIVE_CREATURE_GENDER_TWO_DA_SOURCE_OBJECT_KEY_LENGTH = 2048;
export const MAX_EFFECTIVE_CREATURE_GENDER_TWO_DA_PAGE_ROWS = 256;
export const MAX_EFFECTIVE_CREATURE_GENDER_TWO_DA_QUERY_CODE_UNITS = 128;
export const MAX_EFFECTIVE_CREATURE_GENDER_TWO_DA_DISPLAY_CODE_UNITS = 1024;
export const MAX_EFFECTIVE_CREATURE_GENDER_TWO_DA_TOKEN_CODE_UNITS = 64;
export const MAX_EFFECTIVE_CREATURE_GENDER_TWO_DA_CONSTANT_CODE_UNITS = 256;
export const MAX_CREATURE_GENDER_BYTE_ROW_INDEX = 0xff;

const DWORD_MAX = 0xffff_ffff;

export type EffectiveCreatureGenderTwoDaSourceLayer = "module" | "hak" | "vanilla";

export interface EffectiveCreatureGenderTwoDaDescriptor {
  resourceName: "gender.2da";
  sourceObjectKey: string;
  sourceLayer: EffectiveCreatureGenderTwoDaSourceLayer;
  sha256: string;
  sizeBytes: number;
  rowCount: number;
}

export interface EffectiveCreatureGenderTwoDaDescriptorInput {
  bytes: Buffer;
  sourceObjectKey: string;
  sourceLayer: string;
}

export interface EffectiveCreatureGenderTwoDaSourceRow {
  rowIndex: number;
  nameStrRef?: number;
  genderToken?: string;
  constant?: string;
}

export type EffectiveCreatureGenderTwoDaDisplaySource = "strref" | "strref_id";

export interface EffectiveCreatureGenderTwoDaRowOption {
  rowIndex: number;
  displayName: string;
  displaySource: EffectiveCreatureGenderTwoDaDisplaySource;
  nameStrRef: number;
  genderToken: string;
  constant?: string;
}

function isEffectiveSourceLayer(value: string): value is EffectiveCreatureGenderTwoDaSourceLayer {
  return value === "module" || value === "hak" || value === "vanilla";
}

export function isSupportedEffectiveCreatureGenderTwoDaInput(
  input: EffectiveCreatureGenderTwoDaDescriptorInput,
): input is EffectiveCreatureGenderTwoDaDescriptorInput & {
  sourceLayer: EffectiveCreatureGenderTwoDaSourceLayer;
} {
  return Buffer.isBuffer(input.bytes) &&
    input.bytes.length >= 1 &&
    input.bytes.length <= MAX_EFFECTIVE_CREATURE_GENDER_TWO_DA_BYTES &&
    typeof input.sourceObjectKey === "string" &&
    input.sourceObjectKey.length >= 1 &&
    input.sourceObjectKey.length <= MAX_EFFECTIVE_CREATURE_GENDER_TWO_DA_SOURCE_OBJECT_KEY_LENGTH &&
    isEffectiveSourceLayer(input.sourceLayer);
}

export function isSupportedEffectiveCreatureGenderTwoDaTable(table: AuroraTwoDaTable): boolean {
  return table.version === "2DA V2.0" &&
    table.header.includes("NAME") &&
    table.header.includes("GENDER") &&
    table.rows.length >= 1 &&
    table.rows.length <= MAX_EFFECTIVE_CREATURE_GENDER_TWO_DA_ROWS &&
    !table.diagnostics.some(
      (entry) => entry.severity === "error" || entry.code === "VFX_2DA_ROW_ID_REQUIRED",
    );
}

export function buildEffectiveCreatureGenderTwoDaDescriptor(
  input: EffectiveCreatureGenderTwoDaDescriptorInput,
): EffectiveCreatureGenderTwoDaDescriptor | null {
  if (!isSupportedEffectiveCreatureGenderTwoDaInput(input)) return null;
  const sha256 = createHash("sha256").update(input.bytes).digest("hex");
  const table = parseAuroraTwoDaTable(input.bytes, {
    tableName: "gender.2da",
    profile: "effective-creature-gender-source-provenance",
    sourceObjectKey: input.sourceObjectKey,
    sourceLayer: input.sourceLayer,
    sourceHash: sha256,
  });
  if (!isSupportedEffectiveCreatureGenderTwoDaTable(table)) return null;
  return {
    resourceName: "gender.2da",
    sourceObjectKey: input.sourceObjectKey,
    sourceLayer: input.sourceLayer,
    sha256,
    sizeBytes: input.bytes.length,
    rowCount: table.rows.length,
  };
}

function readRowCell(row: AuroraTwoDaRow, header: readonly string[], name: string): string | undefined {
  const index = header.indexOf(name);
  return index >= 0 ? row.cells[index]?.value : undefined;
}

function readNameStrRef(value: string | undefined): number | undefined {
  if (!value || !/^\d+$/u.test(value)) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 1 && parsed < DWORD_MAX
    ? parsed
    : undefined;
}

function readBoundedToken(value: string | undefined, maxCodeUnits: number): string | undefined {
  return typeof value === "string" &&
    value !== "****" &&
    value.length >= 1 &&
    value.length <= maxCodeUnits &&
    !value.includes("\0")
    ? value
    : undefined;
}

export function parseEffectiveCreatureGenderTwoDaRows(
  bytes: Buffer,
): EffectiveCreatureGenderTwoDaSourceRow[] | null {
  const table = parseAuroraTwoDaTable(bytes, {
    tableName: "gender.2da",
    profile: "effective-creature-gender-toolset-row-catalog",
  });
  if (!isSupportedEffectiveCreatureGenderTwoDaTable(table)) return null;
  return table.rows.map((row) => {
    const nameStrRef = readNameStrRef(readRowCell(row, table.header, "NAME"));
    const genderToken = readBoundedToken(
      readRowCell(row, table.header, "GENDER"),
      MAX_EFFECTIVE_CREATURE_GENDER_TWO_DA_TOKEN_CODE_UNITS,
    );
    const constant = readBoundedToken(
      readRowCell(row, table.header, "CONSTANT"),
      MAX_EFFECTIVE_CREATURE_GENDER_TWO_DA_CONSTANT_CODE_UNITS,
    );
    return {
      rowIndex: row.physicalRowIndex,
      ...(nameStrRef !== undefined ? { nameStrRef } : {}),
      ...(genderToken !== undefined ? { genderToken } : {}),
      ...(constant !== undefined ? { constant } : {}),
    };
  });
}

function isSupportedDisplayName(value: unknown): value is string {
  return typeof value === "string" &&
    value.length >= 1 &&
    value.length <= MAX_EFFECTIVE_CREATURE_GENDER_TWO_DA_DISPLAY_CODE_UNITS &&
    !value.includes("\0");
}

export function buildEffectiveCreatureGenderTwoDaRowOptions(
  rows: readonly EffectiveCreatureGenderTwoDaSourceRow[],
  resolveStrRef: (strRef: number) => string | undefined,
): EffectiveCreatureGenderTwoDaRowOption[] {
  const options: EffectiveCreatureGenderTwoDaRowOption[] = [];
  for (const row of rows) {
    if (
      !Number.isSafeInteger(row.rowIndex) ||
      row.rowIndex < 0 ||
      row.rowIndex > MAX_CREATURE_GENDER_BYTE_ROW_INDEX ||
      !Number.isSafeInteger(row.nameStrRef) ||
      Number(row.nameStrRef) < 1 ||
      Number(row.nameStrRef) >= DWORD_MAX ||
      !readBoundedToken(
        row.genderToken,
        MAX_EFFECTIVE_CREATURE_GENDER_TWO_DA_TOKEN_CODE_UNITS,
      )
    ) continue;
    let localizedName: string | undefined;
    try {
      const resolved = resolveStrRef(row.nameStrRef!);
      localizedName = isSupportedDisplayName(resolved) ? resolved : undefined;
    } catch {
      localizedName = undefined;
    }
    const constant = readBoundedToken(
      row.constant,
      MAX_EFFECTIVE_CREATURE_GENDER_TWO_DA_CONSTANT_CODE_UNITS,
    );
    options.push({
      rowIndex: row.rowIndex,
      displayName: localizedName ?? `StringRef ${row.nameStrRef}`,
      displaySource: localizedName ? "strref" : "strref_id",
      nameStrRef: row.nameStrRef!,
      genderToken: row.genderToken!,
      ...(constant !== undefined ? { constant } : {}),
    });
  }
  return options;
}
