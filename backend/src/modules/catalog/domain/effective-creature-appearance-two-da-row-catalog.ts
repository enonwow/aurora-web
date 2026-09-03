import {
  parseAuroraTwoDaTable,
  type AuroraTwoDaRow,
} from "../../../common/aurora/two-da/aurora-two-da-table";
import {
  isSupportedEffectiveCreatureAppearanceTwoDaTable,
  type EffectiveCreatureAppearanceTwoDaDescriptor,
} from "./effective-creature-appearance-two-da-descriptor";

export const MAX_EFFECTIVE_CREATURE_APPEARANCE_TWO_DA_PAGE_ROWS = 256;
export const MAX_EFFECTIVE_CREATURE_APPEARANCE_TWO_DA_QUERY_CODE_UNITS = 128;
export const MAX_EFFECTIVE_CREATURE_APPEARANCE_TWO_DA_DISPLAY_CODE_UNITS = 1024;
export const MAX_EFFECTIVE_CREATURE_APPEARANCE_TWO_DA_LABEL_CODE_UNITS = 256;
export const MAX_CREATURE_APPEARANCE_WORD_ROW_INDEX = 0xffff;

const DWORD_MAX = 0xffff_ffff;

export interface EffectiveCreatureAppearanceTwoDaSourceRow {
  rowIndex: number;
  strRef?: number;
  label?: string;
}

export type EffectiveCreatureAppearanceTwoDaDisplaySource =
  | "strref"
  | "strref_id"
  | "label";

export interface EffectiveCreatureAppearanceTwoDaRowOption
  extends EffectiveCreatureAppearanceTwoDaSourceRow {
  displayName: string;
  displaySource: EffectiveCreatureAppearanceTwoDaDisplaySource;
}

export function shouldAdmitEffectiveCreatureAppearanceTwoDaSource(
  descriptor: EffectiveCreatureAppearanceTwoDaDescriptor | null,
): descriptor is EffectiveCreatureAppearanceTwoDaDescriptor {
  return descriptor !== null;
}

function readDecodedRowValues(
  row: AuroraTwoDaRow,
  header: string[],
): { label?: string; strRef?: string } {
  return {
    label: row.cells[header.indexOf("LABEL")]?.value,
    strRef: row.cells[header.indexOf("STRING_REF")]?.value,
  };
}

function readLabel(value: string | undefined): string | undefined {
  return isSupportedLabel(value) &&
    value !== "****"
    ? value
    : undefined;
}

function isSupportedLabel(value: unknown): value is string {
  return typeof value === "string" &&
    value.length >= 1 &&
    value.length <= MAX_EFFECTIVE_CREATURE_APPEARANCE_TWO_DA_LABEL_CODE_UNITS &&
    !value.includes("\0");
}

function readStrRef(value: string | undefined): number | undefined {
  if (!value || !/^-?\d+$/u.test(value)) {
    return undefined;
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < -1 || parsed > DWORD_MAX) {
    return undefined;
  }
  return parsed === -1 ? DWORD_MAX : parsed;
}

export function parseEffectiveCreatureAppearanceTwoDaRows(
  bytes: Buffer,
): EffectiveCreatureAppearanceTwoDaSourceRow[] | null {
  const table = parseAuroraTwoDaTable(bytes, {
    tableName: "appearance.2da",
    profile: "effective-creature-appearance-toolset-row-catalog",
  });
  if (!isSupportedEffectiveCreatureAppearanceTwoDaTable(table)) {
    return null;
  }

  return table.rows.map((row) => {
    const decoded = readDecodedRowValues(row, table.header);
    const label = readLabel(decoded.label);
    const strRef = readStrRef(decoded.strRef);
    return {
      rowIndex: row.physicalRowIndex,
      ...(strRef !== undefined ? { strRef } : {}),
      ...(label !== undefined ? { label } : {}),
    };
  });
}

function isSupportedDisplayName(value: unknown): value is string {
  return typeof value === "string" &&
    value.length >= 1 &&
    value.length <= MAX_EFFECTIVE_CREATURE_APPEARANCE_TWO_DA_DISPLAY_CODE_UNITS &&
    !value.includes("\0");
}

export function buildEffectiveCreatureAppearanceTwoDaRowOptions(
  rows: readonly EffectiveCreatureAppearanceTwoDaSourceRow[],
  resolveStrRef: (strRef: number) => string | undefined,
): EffectiveCreatureAppearanceTwoDaRowOption[] {
  const options: EffectiveCreatureAppearanceTwoDaRowOption[] = [];
  for (const row of rows) {
    if (
      !Number.isSafeInteger(row.rowIndex) ||
      row.rowIndex < 0 ||
      row.rowIndex > MAX_CREATURE_APPEARANCE_WORD_ROW_INDEX
    ) {
      continue;
    }

    if (row.strRef !== undefined) {
      if (row.strRef === 0 || row.strRef === DWORD_MAX) {
        continue;
      }
      let localizedName: string | undefined;
      try {
        const resolved = resolveStrRef(row.strRef);
        localizedName = isSupportedDisplayName(resolved) ? resolved : undefined;
      } catch {
        localizedName = undefined;
      }
      options.push({
        rowIndex: row.rowIndex,
        displayName: localizedName ?? `StringRef ${row.strRef}`,
        displaySource: localizedName ? "strref" : "strref_id",
        strRef: row.strRef,
        ...(isSupportedLabel(row.label) ? { label: row.label } : {}),
      });
      continue;
    }

    if (isSupportedLabel(row.label)) {
      options.push({
        rowIndex: row.rowIndex,
        displayName: row.label,
        displaySource: "label",
        label: row.label,
      });
    }
  }
  return options;
}
