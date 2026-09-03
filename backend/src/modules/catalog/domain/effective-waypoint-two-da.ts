import { createHash } from "node:crypto";

import {
  parseAuroraTwoDaTable,
  type AuroraTwoDaRow,
  type AuroraTwoDaTable,
} from "../../../common/aurora/two-da/aurora-two-da-table";

export const MAX_EFFECTIVE_WAYPOINT_TWO_DA_BYTES = 1024 * 1024;
export const MAX_EFFECTIVE_WAYPOINT_TWO_DA_ROWS = 256;
export const MAX_EFFECTIVE_WAYPOINT_TWO_DA_PAGE_ROWS = 256;
export const MAX_EFFECTIVE_WAYPOINT_TWO_DA_QUERY_CODE_UNITS = 128;
export const MAX_EFFECTIVE_WAYPOINT_TWO_DA_SOURCE_OBJECT_KEY_LENGTH = 2048;
export const MAX_EFFECTIVE_WAYPOINT_TWO_DA_DISPLAY_CODE_UNITS = 1024;
export const MAX_EFFECTIVE_WAYPOINT_TWO_DA_LABEL_CODE_UNITS = 256;

export type EffectiveWaypointTwoDaSourceLayer = "module" | "hak" | "vanilla";

export interface EffectiveWaypointTwoDaDescriptor {
  readonly resourceName: "waypoint.2da";
  readonly sourceObjectKey: string;
  readonly sourceLayer: EffectiveWaypointTwoDaSourceLayer;
  readonly sha256: string;
  readonly sizeBytes: number;
  readonly rowCount: number;
}

export interface EffectiveWaypointTwoDaDescriptorInput {
  readonly bytes: Buffer;
  readonly sourceObjectKey: string;
  readonly sourceLayer: string;
}

export interface EffectiveWaypointTwoDaSourceRow {
  readonly rowIndex: number;
  readonly modelResRef: string;
  readonly strRef: number;
  readonly label?: string;
}

export type EffectiveWaypointTwoDaDisplaySource = "strref" | "label" | "model_resref";

export interface EffectiveWaypointTwoDaRowOption extends EffectiveWaypointTwoDaSourceRow {
  readonly displayName: string;
  readonly displaySource: EffectiveWaypointTwoDaDisplaySource;
}

export interface EffectiveWaypointTwoDaTable {
  readonly descriptor: EffectiveWaypointTwoDaDescriptor;
  readonly rows: readonly EffectiveWaypointTwoDaRowOption[];
}

function isSourceLayer(value: string): value is EffectiveWaypointTwoDaSourceLayer {
  return value === "module" || value === "hak" || value === "vanilla";
}

function isSupportedTable(table: AuroraTwoDaTable): boolean {
  return table.version === "2DA V2.0" &&
    table.rows.length >= 1 &&
    table.rows.length <= MAX_EFFECTIVE_WAYPOINT_TWO_DA_ROWS &&
    ["LABEL", "RESREF", "STRREF"].every((column) => table.header.includes(column)) &&
    !table.diagnostics.some((entry) => entry.severity === "error");
}

function parseTable(bytes: Buffer, profile: string): AuroraTwoDaTable | null {
  if (!Buffer.isBuffer(bytes) || bytes.length < 1 ||
    bytes.length > MAX_EFFECTIVE_WAYPOINT_TWO_DA_BYTES) {
    return null;
  }
  const table = parseAuroraTwoDaTable(bytes, {
    tableName: "waypoint.2da",
    profile,
  });
  return isSupportedTable(table) ? table : null;
}

export function buildEffectiveWaypointTwoDaDescriptor(
  input: EffectiveWaypointTwoDaDescriptorInput,
): EffectiveWaypointTwoDaDescriptor | null {
  if (
    !Buffer.isBuffer(input.bytes) ||
    typeof input.sourceObjectKey !== "string" ||
    input.sourceObjectKey.length < 1 ||
    input.sourceObjectKey.length > MAX_EFFECTIVE_WAYPOINT_TWO_DA_SOURCE_OBJECT_KEY_LENGTH ||
    !isSourceLayer(input.sourceLayer)
  ) {
    return null;
  }
  const table = parseTable(input.bytes, "effective-waypoint-source-provenance");
  if (!table) return null;
  return Object.freeze({
    resourceName: "waypoint.2da",
    sourceObjectKey: input.sourceObjectKey,
    sourceLayer: input.sourceLayer,
    sha256: createHash("sha256").update(input.bytes).digest("hex"),
    sizeBytes: input.bytes.length,
    rowCount: table.rows.length,
  });
}

export function parseEffectiveWaypointTwoDaRows(
  bytes: Buffer,
): EffectiveWaypointTwoDaSourceRow[] | null {
  const table = parseTable(bytes, "effective-waypoint-physical-row-catalog");
  if (!table) return null;
  return table.rows.flatMap((row) => {
    const decoded = readRow(row);
    return decoded ? [decoded] : [];
  });
}

export function buildEffectiveWaypointTwoDaRowOptions(
  rows: readonly EffectiveWaypointTwoDaSourceRow[],
  resolveStrRef: (strRef: number) => string | undefined,
): EffectiveWaypointTwoDaRowOption[] {
  return rows.map((row) => {
    let localized: string | undefined;
    try {
      const candidate = resolveStrRef(row.strRef);
      localized = isDisplayName(candidate) ? candidate : undefined;
    } catch {
      localized = undefined;
    }
    const displayName = localized ?? row.label ?? row.modelResRef;
    return Object.freeze({
      ...row,
      displayName,
      displaySource: localized ? "strref" : row.label ? "label" : "model_resref",
    });
  });
}

function readRow(row: AuroraTwoDaRow): EffectiveWaypointTwoDaSourceRow | null {
  if (!Number.isInteger(row.physicalRowIndex) ||
    row.physicalRowIndex < 0 || row.physicalRowIndex >= MAX_EFFECTIVE_WAYPOINT_TWO_DA_ROWS) {
    return null;
  }
  const modelResRef = row.cellsByColumn.RESREF?.value;
  const rawStrRef = row.cellsByColumn.STRREF?.value;
  if (!modelResRef || modelResRef === "****" || modelResRef.includes("\0") ||
    !/^[A-Za-z0-9_]{1,16}$/u.test(modelResRef) ||
    !rawStrRef || !/^\d+$/u.test(rawStrRef)) {
    return null;
  }
  const strRef = Number(rawStrRef);
  if (!Number.isSafeInteger(strRef) || strRef < 0 || strRef > 0xffff_ffff) {
    return null;
  }
  const rawLabel = row.cellsByColumn.LABEL?.value;
  const label = rawLabel && rawLabel !== "****" && !rawLabel.includes("\0") &&
    rawLabel.length <= MAX_EFFECTIVE_WAYPOINT_TWO_DA_LABEL_CODE_UNITS
    ? rawLabel
    : undefined;
  return Object.freeze({
    rowIndex: row.physicalRowIndex,
    modelResRef,
    strRef,
    ...(label ? { label } : {}),
  });
}

function isDisplayName(value: unknown): value is string {
  return typeof value === "string" && value.length >= 1 &&
    value.length <= MAX_EFFECTIVE_WAYPOINT_TWO_DA_DISPLAY_CODE_UNITS &&
    !value.includes("\0");
}
