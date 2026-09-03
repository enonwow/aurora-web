import { parseAuroraTwoDaTable, type AuroraTwoDaRow } from "../../../common/aurora/two-da/aurora-two-da-table";
import {
  isSupportedEffectivePlaceablesTwoDaTable,
  type EffectivePlaceablesTwoDaDescriptor,
} from "./effective-placeables-two-da-descriptor";

export const MAX_EFFECTIVE_PLACEABLES_TWO_DA_PAGE_ROWS = 256;
export const MAX_EFFECTIVE_PLACEABLES_TWO_DA_QUERY_CODE_UNITS = 128;
export const MAX_EFFECTIVE_PLACEABLES_TWO_DA_DISPLAY_CODE_UNITS = 1024;
export const MAX_EFFECTIVE_PLACEABLES_TWO_DA_LABEL_CODE_UNITS = 256;

export interface EffectivePlaceablesTwoDaSourceRow {
  rowIndex: number;
  strRef?: number;
  label?: string;
}

export type EffectivePlaceablesTwoDaDisplaySource = "strref" | "label" | "row_index";

export interface EffectivePlaceablesTwoDaRowOption extends EffectivePlaceablesTwoDaSourceRow {
  displayName: string;
  displaySource: EffectivePlaceablesTwoDaDisplaySource;
}

export function shouldAdmitEffectivePlaceablesTwoDaSource(
  renderRowCount: number,
  descriptor: EffectivePlaceablesTwoDaDescriptor | null,
): boolean {
  return renderRowCount > 0 || descriptor !== null;
}

function readDecodedRowValues(
  row: AuroraTwoDaRow,
  header: string[],
): { label?: string; strRef?: string } {
  return {
    label: row.cells[header.indexOf("Label")]?.value,
    strRef: row.cells[header.indexOf("StrRef")]?.value,
  };
}

function readLabel(value: string | undefined): string | undefined {
  return value &&
    value !== "****" &&
    value.length <= MAX_EFFECTIVE_PLACEABLES_TWO_DA_LABEL_CODE_UNITS &&
    !value.includes("\0")
    ? value
    : undefined;
}

function readStrRef(value: string | undefined): number | undefined {
  if (!value || !/^\d+$/u.test(value)) {
    return undefined;
  }
  const parsed = Number(value);
  return parsed <= 0xffff_ffff ? parsed : undefined;
}

export function parseEffectivePlaceablesTwoDaRows(
  bytes: Buffer,
): EffectivePlaceablesTwoDaSourceRow[] | null {
  const table = parseAuroraTwoDaTable(bytes, {
    tableName: "placeables.2da",
    profile: "effective-placeables-physical-row-catalog",
  });
  if (!isSupportedEffectivePlaceablesTwoDaTable(table)) {
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
    value.length <= MAX_EFFECTIVE_PLACEABLES_TWO_DA_DISPLAY_CODE_UNITS &&
    !value.includes("\0");
}

export function buildEffectivePlaceablesTwoDaRowOptions(
  rows: readonly EffectivePlaceablesTwoDaSourceRow[],
  resolveStrRef: (strRef: number) => string | undefined,
): EffectivePlaceablesTwoDaRowOption[] {
  return rows.map((row) => {
    let localizedName: string | undefined;
    if (row.strRef !== undefined) {
      try {
        const resolved = resolveStrRef(row.strRef);
        localizedName = isSupportedDisplayName(resolved) ? resolved : undefined;
      } catch {
        localizedName = undefined;
      }
    }
    const displayName = localizedName ?? row.label ?? `Row ${row.rowIndex}`;
    const displaySource: EffectivePlaceablesTwoDaDisplaySource = localizedName
      ? "strref"
      : row.label
        ? "label"
        : "row_index";
    return {
      rowIndex: row.rowIndex,
      displayName,
      displaySource,
      ...(row.strRef !== undefined ? { strRef: row.strRef } : {}),
      ...(row.label !== undefined ? { label: row.label } : {}),
    };
  });
}
