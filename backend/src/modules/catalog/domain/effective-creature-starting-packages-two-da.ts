import { createHash } from "node:crypto";

import {
  parseAuroraTwoDaTable,
  type AuroraTwoDaRow,
} from "../../../common/aurora/two-da/aurora-two-da-table";

export const MAX_EFFECTIVE_CREATURE_STARTING_PACKAGES_TWO_DA_BYTES = 16 * 1024 * 1024;
export const MAX_EFFECTIVE_CREATURE_STARTING_PACKAGES_TWO_DA_ROWS = 256;
export const MAX_EFFECTIVE_CREATURE_STARTING_PACKAGES_SOURCE_OBJECT_KEY_LENGTH = 2048;
export const MAX_EFFECTIVE_CREATURE_STARTING_PACKAGES_PAGE_ROWS = 256;
export const MAX_EFFECTIVE_CREATURE_STARTING_PACKAGES_QUERY_CODE_UNITS = 128;
export const MAX_EFFECTIVE_CREATURE_STARTING_PACKAGES_DISPLAY_CODE_UNITS = 1024;

const DWORD_MAX = 0xffff_ffff;
const INT_MAX = 0x7fff_ffff;
const BYTE_MAX = 0xff;
const REQUIRED_COLUMNS = ["LABEL", "NAME", "CLASSID"] as const;

export type EffectiveCreatureStartingPackagesTwoDaSourceLayer = "module" | "hak" | "vanilla";
export type EffectiveCreatureStartingPackagesTwoDaDisplaySource =
  "strref" | "strref_id" | "label";

export interface EffectiveCreatureStartingPackagesTwoDaDescriptor {
  readonly resourceName: "packages.2da";
  readonly sourceObjectKey: string;
  readonly sourceLayer: EffectiveCreatureStartingPackagesTwoDaSourceLayer;
  readonly sha256: string;
  readonly sizeBytes: number;
  readonly rowCount: number;
}

export interface EffectiveCreatureStartingPackagesTwoDaRow {
  readonly rowIndex: number;
  readonly classId: number;
  readonly displayName: string;
  readonly displaySource: EffectiveCreatureStartingPackagesTwoDaDisplaySource;
  readonly nameStrRef: number | null;
}

export interface EffectiveCreatureStartingPackagesTwoDaTable {
  readonly descriptor: EffectiveCreatureStartingPackagesTwoDaDescriptor;
  readonly rows: readonly EffectiveCreatureStartingPackagesTwoDaRow[];
}

export interface EffectiveCreatureStartingPackagesTwoDaInput {
  readonly bytes: Buffer;
  readonly sourceObjectKey: string;
  readonly sourceLayer: string;
  readonly resolveStrRef: (strRef: number) => string | undefined;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype;
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value);
  return actual.length === keys.length && keys.every((key) => actual.includes(key));
}

function isSourceLayer(value: unknown): value is EffectiveCreatureStartingPackagesTwoDaSourceLayer {
  return value === "module" || value === "hak" || value === "vanilla";
}

function readCell(
  row: AuroraTwoDaRow,
  normalizedHeader: readonly string[],
  column: (typeof REQUIRED_COLUMNS)[number],
): string | undefined {
  const index = normalizedHeader.indexOf(column);
  return index < 0 ? undefined : row.cells[index]?.value;
}

function readUint32(value: unknown): number | null {
  if (typeof value !== "string" || !/^\d+$/u.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 && parsed <= DWORD_MAX ? parsed : null;
}

function readClassId(value: unknown): number | null {
  if (typeof value !== "string" || !/^\d+$/u.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 && parsed <= INT_MAX ? parsed : null;
}

function readDisplayText(value: unknown): string | null {
  return typeof value === "string" && value !== "****" && value.length >= 1 &&
    value.length <= MAX_EFFECTIVE_CREATURE_STARTING_PACKAGES_DISPLAY_CODE_UNITS &&
    !value.includes("\0") ? value : null;
}

export function isCreatureStartingPackageRowIndex(
  value: unknown,
  rowCount: number,
): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0 && Number(value) <= BYTE_MAX &&
    Number(value) < rowCount;
}

export function parseEffectiveCreatureStartingPackagesTwoDa(
  input: EffectiveCreatureStartingPackagesTwoDaInput,
): EffectiveCreatureStartingPackagesTwoDaTable | null {
  if (!Buffer.isBuffer(input.bytes) || input.bytes.length < 1 ||
    input.bytes.length > MAX_EFFECTIVE_CREATURE_STARTING_PACKAGES_TWO_DA_BYTES ||
    typeof input.sourceObjectKey !== "string" || input.sourceObjectKey.length < 1 ||
    input.sourceObjectKey.length > MAX_EFFECTIVE_CREATURE_STARTING_PACKAGES_SOURCE_OBJECT_KEY_LENGTH ||
    !isSourceLayer(input.sourceLayer) || typeof input.resolveStrRef !== "function") return null;

  const sha256 = createHash("sha256").update(input.bytes).digest("hex");
  const table = parseAuroraTwoDaTable(input.bytes, {
    tableName: "packages.2da",
    profile: "effective-creature-starting-packages-toolset-selector",
    sourceObjectKey: input.sourceObjectKey,
    sourceLayer: input.sourceLayer,
    sourceHash: sha256,
  });
  const normalizedHeader = table.header.map((entry) => entry.toUpperCase());
  if (table.version !== "2DA V2.0" || table.rows.length < 1 ||
    table.rows.length > MAX_EFFECTIVE_CREATURE_STARTING_PACKAGES_TWO_DA_ROWS ||
    REQUIRED_COLUMNS.some(
      (column) => normalizedHeader.filter((entry) => entry === column).length !== 1,
    ) || table.diagnostics.some((entry) => entry.severity === "error")) return null;

  const rows: EffectiveCreatureStartingPackagesTwoDaRow[] = [];
  for (const row of table.rows) {
    if (row.physicalRowIndex > BYTE_MAX) continue;
    const classId = readClassId(readCell(row, normalizedHeader, "CLASSID"));
    if (classId === null) continue;
    const nameStrRef = readUint32(readCell(row, normalizedHeader, "NAME"));
    const label = readDisplayText(readCell(row, normalizedHeader, "LABEL"));
    if (nameStrRef === null && label === null) continue;
    let localized: string | null = null;
    if (nameStrRef !== null) {
      try {
        localized = readDisplayText(input.resolveStrRef(nameStrRef));
      } catch {
        localized = null;
      }
    }
    rows.push(Object.freeze({
      rowIndex: row.physicalRowIndex,
      classId,
      displayName: nameStrRef === null ? label! : localized ?? `StringRef ${nameStrRef}`,
      displaySource: nameStrRef === null
        ? "label" as const
        : localized ? "strref" as const : "strref_id" as const,
      nameStrRef,
    }));
  }
  if (rows.length === 0) return null;

  return Object.freeze({
    descriptor: Object.freeze({
      resourceName: "packages.2da",
      sourceObjectKey: input.sourceObjectKey,
      sourceLayer: input.sourceLayer,
      sha256,
      sizeBytes: input.bytes.length,
      rowCount: table.rows.length,
    }),
    rows: Object.freeze(rows),
  });
}

export function localizeEffectiveCreatureStartingPackagesTwoDa(
  table: EffectiveCreatureStartingPackagesTwoDaTable,
  resolveStrRef: (strRef: number) => string | undefined,
): EffectiveCreatureStartingPackagesTwoDaTable {
  if (!isExactEffectiveCreatureStartingPackagesTwoDaTable(table) ||
    typeof resolveStrRef !== "function") return table;
  return Object.freeze({
    descriptor: Object.freeze({ ...table.descriptor }),
    rows: Object.freeze(table.rows.map((row) => {
      if (row.nameStrRef === null) return Object.freeze({ ...row });
      let localized: string | null = null;
      try {
        localized = readDisplayText(resolveStrRef(row.nameStrRef));
      } catch {
        localized = null;
      }
      return Object.freeze({
        ...row,
        displayName: localized ?? `StringRef ${row.nameStrRef}`,
        displaySource: localized ? "strref" as const : "strref_id" as const,
      });
    })),
  });
}

export function isExactEffectiveCreatureStartingPackagesTwoDaTable(
  value: unknown,
): value is EffectiveCreatureStartingPackagesTwoDaTable {
  if (!isPlainRecord(value) || !hasExactKeys(value, ["descriptor", "rows"]) ||
    !isPlainRecord(value.descriptor) || !Array.isArray(value.rows)) return false;
  const descriptor = value.descriptor;
  if (!hasExactKeys(descriptor, [
    "resourceName", "sourceObjectKey", "sourceLayer", "sha256", "sizeBytes", "rowCount",
  ]) || descriptor.resourceName !== "packages.2da" ||
    typeof descriptor.sourceObjectKey !== "string" || descriptor.sourceObjectKey.length < 1 ||
    descriptor.sourceObjectKey.length > MAX_EFFECTIVE_CREATURE_STARTING_PACKAGES_SOURCE_OBJECT_KEY_LENGTH ||
    !isSourceLayer(descriptor.sourceLayer) || typeof descriptor.sha256 !== "string" ||
    !/^[a-f0-9]{64}$/u.test(descriptor.sha256) || !Number.isSafeInteger(descriptor.sizeBytes) ||
    Number(descriptor.sizeBytes) < 1 ||
    Number(descriptor.sizeBytes) > MAX_EFFECTIVE_CREATURE_STARTING_PACKAGES_TWO_DA_BYTES ||
    !Number.isSafeInteger(descriptor.rowCount) || Number(descriptor.rowCount) < 1 ||
    Number(descriptor.rowCount) > MAX_EFFECTIVE_CREATURE_STARTING_PACKAGES_TWO_DA_ROWS ||
    value.rows.length < 1 || value.rows.length > Number(descriptor.rowCount)) return false;

  let previousRowIndex = -1;
  for (const row of value.rows) {
    if (!isPlainRecord(row) || !hasExactKeys(row, [
      "rowIndex", "classId", "displayName", "displaySource", "nameStrRef",
    ]) || !isCreatureStartingPackageRowIndex(row.rowIndex, Number(descriptor.rowCount)) ||
      Number(row.rowIndex) <= previousRowIndex || !Number.isSafeInteger(row.classId) ||
      Number(row.classId) < 0 || Number(row.classId) > INT_MAX ||
      readDisplayText(row.displayName) === null ||
      (row.displaySource !== "strref" && row.displaySource !== "strref_id" &&
        row.displaySource !== "label") ||
      (row.nameStrRef !== null && (!Number.isSafeInteger(row.nameStrRef) ||
        Number(row.nameStrRef) < 0 || Number(row.nameStrRef) > DWORD_MAX)) ||
      (row.displaySource === "label") !== (row.nameStrRef === null)) return false;
    previousRowIndex = Number(row.rowIndex);
  }
  return true;
}
