import { createHash } from "node:crypto";

import {
  BLANK_CELL,
  parseAuroraTwoDaTable,
  type AuroraTwoDaRow,
} from "../../../common/aurora/two-da/aurora-two-da-table";

export const MAX_EFFECTIVE_CREATURE_SPECIAL_ABILITIES_TWO_DA_BYTES = 64 * 1024 * 1024;
export const MAX_EFFECTIVE_CREATURE_SPECIAL_ABILITIES_TWO_DA_ROWS = 65_536;
export const MAX_EFFECTIVE_CREATURE_SPECIAL_ABILITIES_SOURCE_OBJECT_KEY_LENGTH = 2_048;
export const MAX_EFFECTIVE_CREATURE_SPECIAL_ABILITIES_DISPLAY_CODE_UNITS = 1_024;

const DWORD_MAX = 0xffff_ffff;

export type EffectiveCreatureSpecialAbilitiesTwoDaSourceLayer =
  | "module"
  | "hak"
  | "vanilla";
export type EffectiveCreatureSpecialAbilitiesTwoDaDisplaySource = "strref" | "strref_id";

export interface EffectiveCreatureSpecialAbilitiesTwoDaDescriptor {
  readonly resourceName: "spells.2da";
  readonly sourceObjectKey: string;
  readonly sourceLayer: EffectiveCreatureSpecialAbilitiesTwoDaSourceLayer;
  readonly sha256: string;
  readonly sizeBytes: number;
  readonly rowCount: number;
}

export interface EffectiveCreatureSpecialAbilitiesTwoDaRow {
  readonly rowIndex: number;
  readonly nameStrRef: number;
  readonly spellDescStrRef?: number;
  readonly userType: 1 | 2;
  readonly displayName: string;
  readonly displaySource: EffectiveCreatureSpecialAbilitiesTwoDaDisplaySource;
}

export interface EffectiveCreatureSpecialAbilitiesTwoDaTable {
  readonly descriptor: EffectiveCreatureSpecialAbilitiesTwoDaDescriptor;
  readonly rows: readonly EffectiveCreatureSpecialAbilitiesTwoDaRow[];
}

export interface EffectiveCreatureSpecialAbilitiesTwoDaInput {
  readonly bytes: Buffer;
  readonly sourceObjectKey: string;
  readonly sourceLayer: string;
  readonly resolveStrRef: (strRef: number) => string | undefined;
}

const DESCRIPTOR_KEYS = [
  "resourceName", "sourceObjectKey", "sourceLayer", "sha256", "sizeBytes", "rowCount",
] as const;
const REQUIRED_ROW_KEYS = [
  "rowIndex", "nameStrRef", "userType", "displayName", "displaySource",
] as const;
const ROW_KEYS_WITH_DESCRIPTION = [
  "rowIndex", "nameStrRef", "spellDescStrRef", "userType", "displayName", "displaySource",
] as const;

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype;
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value);
  return actual.length === keys.length && keys.every((key) => actual.includes(key));
}

function isSourceLayer(
  value: unknown,
): value is EffectiveCreatureSpecialAbilitiesTwoDaSourceLayer {
  return value === "module" || value === "hak" || value === "vanilla";
}

function readCell(
  row: AuroraTwoDaRow,
  normalizedHeader: readonly string[],
  column: string,
): string | undefined {
  const index = normalizedHeader.indexOf(column);
  return index < 0 ? undefined : row.cells[index]?.value;
}

function readUnsignedInt(value: unknown, maximum: number, minimum = 0): number | null {
  if (typeof value !== "string" || !/^\d+$/u.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= minimum && parsed <= maximum
    ? parsed
    : null;
}

function readDisplayName(value: unknown): string | null {
  return typeof value === "string" && value.length >= 1 &&
    value.length <= MAX_EFFECTIVE_CREATURE_SPECIAL_ABILITIES_DISPLAY_CODE_UNITS &&
    !value.includes("\0") ? value : null;
}

function isEmptyMaster(value: string | undefined): boolean {
  return value === undefined || value.length === 0 || value === BLANK_CELL;
}

export function parseEffectiveCreatureSpecialAbilitiesTwoDa(
  input: EffectiveCreatureSpecialAbilitiesTwoDaInput,
): EffectiveCreatureSpecialAbilitiesTwoDaTable | null {
  if (!Buffer.isBuffer(input.bytes) || input.bytes.length < 1 ||
    input.bytes.length > MAX_EFFECTIVE_CREATURE_SPECIAL_ABILITIES_TWO_DA_BYTES ||
    typeof input.sourceObjectKey !== "string" || input.sourceObjectKey.length < 1 ||
    input.sourceObjectKey.length >
      MAX_EFFECTIVE_CREATURE_SPECIAL_ABILITIES_SOURCE_OBJECT_KEY_LENGTH ||
    !isSourceLayer(input.sourceLayer) || typeof input.resolveStrRef !== "function") return null;

  const sha256 = createHash("sha256").update(input.bytes).digest("hex");
  const table = parseAuroraTwoDaTable(input.bytes, {
    tableName: "spells.2da",
    profile: "effective-creature-special-abilities-toolset-selector",
    sourceObjectKey: input.sourceObjectKey,
    sourceLayer: input.sourceLayer,
    sourceHash: sha256,
  });
  const normalizedHeader = table.header.map((entry) => entry.toUpperCase());
  const requiredColumns = ["NAME", "SPELLDESC", "USERTYPE", "MASTER"];
  if (table.version !== "2DA V2.0" || table.rows.length < 1 ||
    table.rows.length > MAX_EFFECTIVE_CREATURE_SPECIAL_ABILITIES_TWO_DA_ROWS ||
    requiredColumns.some((column) =>
      normalizedHeader.filter((entry) => entry === column).length !== 1) ||
    table.diagnostics.some((entry) => entry.severity === "error")) return null;

  const rows: EffectiveCreatureSpecialAbilitiesTwoDaRow[] = [];
  for (const row of table.rows) {
    if (row.physicalRowIndex > 0xffff) return null;
    const nameStrRef = readUnsignedInt(
      readCell(row, normalizedHeader, "NAME"),
      DWORD_MAX - 1,
      1,
    );
    const userType = readUnsignedInt(readCell(row, normalizedHeader, "USERTYPE"), 2, 1);
    if (nameStrRef === null || (userType !== 1 && userType !== 2) ||
      !isEmptyMaster(readCell(row, normalizedHeader, "MASTER"))) continue;
    const spellDescStrRef = readUnsignedInt(
      readCell(row, normalizedHeader, "SPELLDESC"),
      DWORD_MAX - 1,
      1,
    );
    let localized: string | null = null;
    try {
      localized = readDisplayName(input.resolveStrRef(nameStrRef));
    } catch {
      localized = null;
    }
    rows.push(Object.freeze({
      rowIndex: row.physicalRowIndex,
      nameStrRef,
      ...(spellDescStrRef === null ? {} : { spellDescStrRef }),
      userType,
      displayName: localized ?? `StringRef ${nameStrRef}`,
      displaySource: localized ? "strref" as const : "strref_id" as const,
    }));
  }

  return Object.freeze({
    descriptor: Object.freeze({
      resourceName: "spells.2da",
      sourceObjectKey: input.sourceObjectKey,
      sourceLayer: input.sourceLayer,
      sha256,
      sizeBytes: input.bytes.length,
      rowCount: table.rows.length,
    }),
    rows: Object.freeze(rows),
  });
}

export function localizeEffectiveCreatureSpecialAbilitiesTwoDa(
  table: EffectiveCreatureSpecialAbilitiesTwoDaTable,
  resolveStrRef: (strRef: number) => string | undefined,
): EffectiveCreatureSpecialAbilitiesTwoDaTable {
  if (!isExactEffectiveCreatureSpecialAbilitiesTwoDaTable(table) ||
    typeof resolveStrRef !== "function") return table;
  return Object.freeze({
    descriptor: Object.freeze({ ...table.descriptor }),
    rows: Object.freeze(table.rows.map((row) => {
      let localized: string | null = null;
      try {
        localized = readDisplayName(resolveStrRef(row.nameStrRef));
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

export function isExactEffectiveCreatureSpecialAbilitiesTwoDaTable(
  value: unknown,
): value is EffectiveCreatureSpecialAbilitiesTwoDaTable {
  if (!isPlainRecord(value) || !hasExactKeys(value, ["descriptor", "rows"]) ||
    !isPlainRecord(value.descriptor) || !Array.isArray(value.rows)) return false;
  const descriptor = value.descriptor;
  if (!hasExactKeys(descriptor, DESCRIPTOR_KEYS) ||
    descriptor.resourceName !== "spells.2da" ||
    typeof descriptor.sourceObjectKey !== "string" || descriptor.sourceObjectKey.length < 1 ||
    descriptor.sourceObjectKey.length >
      MAX_EFFECTIVE_CREATURE_SPECIAL_ABILITIES_SOURCE_OBJECT_KEY_LENGTH ||
    !isSourceLayer(descriptor.sourceLayer) || typeof descriptor.sha256 !== "string" ||
    !/^[a-f0-9]{64}$/u.test(descriptor.sha256) ||
    !Number.isSafeInteger(descriptor.sizeBytes) || Number(descriptor.sizeBytes) < 1 ||
    Number(descriptor.sizeBytes) > MAX_EFFECTIVE_CREATURE_SPECIAL_ABILITIES_TWO_DA_BYTES ||
    !Number.isSafeInteger(descriptor.rowCount) || Number(descriptor.rowCount) < 1 ||
    Number(descriptor.rowCount) > MAX_EFFECTIVE_CREATURE_SPECIAL_ABILITIES_TWO_DA_ROWS ||
    value.rows.length > Number(descriptor.rowCount)) return false;

  let previous = -1;
  for (const row of value.rows) {
    if (!isPlainRecord(row)) return false;
    const hasDescription = Object.prototype.hasOwnProperty.call(row, "spellDescStrRef");
    if (!hasExactKeys(row, hasDescription ? ROW_KEYS_WITH_DESCRIPTION : REQUIRED_ROW_KEYS) ||
      !Number.isSafeInteger(row.rowIndex) || Number(row.rowIndex) < 0 ||
      Number(row.rowIndex) >= Number(descriptor.rowCount) || Number(row.rowIndex) <= previous ||
      !Number.isSafeInteger(row.nameStrRef) || Number(row.nameStrRef) < 1 ||
      Number(row.nameStrRef) >= DWORD_MAX ||
      hasDescription && (!Number.isSafeInteger(row.spellDescStrRef) ||
        Number(row.spellDescStrRef) < 1 || Number(row.spellDescStrRef) >= DWORD_MAX) ||
      (row.userType !== 1 && row.userType !== 2) ||
      readDisplayName(row.displayName) === null ||
      (row.displaySource !== "strref" && row.displaySource !== "strref_id") ||
      (row.displaySource === "strref_id" &&
        row.displayName !== `StringRef ${row.nameStrRef}`)) return false;
    previous = Number(row.rowIndex);
  }
  return true;
}
