import { createHash } from "node:crypto";

import {
  parseAuroraTwoDaTable,
  type AuroraTwoDaRow,
} from "../../../common/aurora/two-da/aurora-two-da-table";
import {
  isExactEffectiveCreatureClassesTwoDaTable,
  type EffectiveCreatureClassesTwoDaDescriptor,
  type EffectiveCreatureClassesTwoDaTable,
} from "./effective-creature-classes-two-da";

export const MAX_EFFECTIVE_CREATURE_CLASS_SPELLS_TWO_DA_BYTES = 64 * 1024 * 1024;
export const MAX_EFFECTIVE_CREATURE_CLASS_SPELLS_TWO_DA_ROWS = 65_536;
export const MAX_EFFECTIVE_CREATURE_CLASS_SPELLS_ENTRIES = 262_144;
export const MAX_EFFECTIVE_CREATURE_CLASS_SPELLS_SOURCE_OBJECT_KEY_LENGTH = 2_048;
export const MAX_EFFECTIVE_CREATURE_CLASS_SPELLS_DISPLAY_CODE_UNITS = 1_024;

const DWORD_MAX = 0xffff_ffff;
const WORD_MAX = 0xffff;
const FALLBACK_CLASS_COLUMNS = new Map<number, string>([
  [1, "Bard"],
  [2, "Cleric"],
  [3, "Druid"],
  [6, "Paladin"],
  [7, "Ranger"],
  [9, "Wiz_Sorc"],
  [10, "Wiz_Sorc"],
]);

export type EffectiveCreatureClassSpellsTwoDaSourceLayer = "module" | "hak" | "vanilla";
export type EffectiveCreatureClassSpellsTwoDaDisplaySource = "strref" | "strref_id";

export interface EffectiveCreatureClassSpellsTwoDaDescriptor {
  readonly resourceName: "spells.2da";
  readonly sourceObjectKey: string;
  readonly sourceLayer: EffectiveCreatureClassSpellsTwoDaSourceLayer;
  readonly sha256: string;
  readonly sizeBytes: number;
  readonly rowCount: number;
}

export interface EffectiveCreatureClassSpellsTwoDaRow {
  readonly classId: number;
  readonly rowIndex: number;
  readonly spellLevel: number;
  readonly nameStrRef: number;
  readonly spellDescStrRef?: number;
  readonly displayName: string;
  readonly displaySource: EffectiveCreatureClassSpellsTwoDaDisplaySource;
}

export interface EffectiveCreatureClassSpellsTwoDaTable {
  readonly descriptor: EffectiveCreatureClassSpellsTwoDaDescriptor;
  readonly classesDescriptor: EffectiveCreatureClassesTwoDaDescriptor;
  readonly rows: readonly EffectiveCreatureClassSpellsTwoDaRow[];
}

export interface EffectiveCreatureClassSpellsTwoDaInput {
  readonly bytes: Buffer;
  readonly sourceObjectKey: string;
  readonly sourceLayer: string;
  readonly classesTable: EffectiveCreatureClassesTwoDaTable;
  readonly resolveStrRef: (strRef: number) => string | undefined;
}

const DESCRIPTOR_KEYS = [
  "resourceName", "sourceObjectKey", "sourceLayer", "sha256", "sizeBytes", "rowCount",
] as const;
const REQUIRED_ROW_KEYS = [
  "classId", "rowIndex", "spellLevel", "nameStrRef", "displayName", "displaySource",
] as const;
const ROW_KEYS_WITH_DESCRIPTION = [
  "classId", "rowIndex", "spellLevel", "nameStrRef", "spellDescStrRef", "displayName",
  "displaySource",
] as const;

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype;
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value);
  return actual.length === keys.length && keys.every((key) => actual.includes(key));
}

function isSourceLayer(value: unknown): value is EffectiveCreatureClassSpellsTwoDaSourceLayer {
  return value === "module" || value === "hak" || value === "vanilla";
}

function readCell(row: AuroraTwoDaRow, header: readonly string[], column: string) {
  const index = header.indexOf(column.toUpperCase());
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
    value.length <= MAX_EFFECTIVE_CREATURE_CLASS_SPELLS_DISPLAY_CODE_UNITS &&
    !value.includes("\0") ? value : null;
}

function isSha256(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{64}$/u.test(value);
}

function cloneClassesDescriptor(
  descriptor: EffectiveCreatureClassesTwoDaDescriptor,
): EffectiveCreatureClassesTwoDaDescriptor {
  return Object.freeze({ ...descriptor });
}

export function resolveCreatureSpellTableColumn(
  classId: number,
  configuredColumn: string | undefined,
): string | null {
  return configuredColumn ?? FALLBACK_CLASS_COLUMNS.get(classId) ?? null;
}

export function parseEffectiveCreatureClassSpellsTwoDa(
  input: EffectiveCreatureClassSpellsTwoDaInput,
): EffectiveCreatureClassSpellsTwoDaTable | null {
  if (!Buffer.isBuffer(input.bytes) || input.bytes.length < 1 ||
    input.bytes.length > MAX_EFFECTIVE_CREATURE_CLASS_SPELLS_TWO_DA_BYTES ||
    typeof input.sourceObjectKey !== "string" || input.sourceObjectKey.length < 1 ||
    input.sourceObjectKey.length > MAX_EFFECTIVE_CREATURE_CLASS_SPELLS_SOURCE_OBJECT_KEY_LENGTH ||
    !isSourceLayer(input.sourceLayer) ||
    !isExactEffectiveCreatureClassesTwoDaTable(input.classesTable) ||
    typeof input.resolveStrRef !== "function") return null;

  const sha256 = createHash("sha256").update(input.bytes).digest("hex");
  const table = parseAuroraTwoDaTable(input.bytes, {
    tableName: "spells.2da",
    profile: "effective-creature-class-spells-toolset-selector",
    sourceObjectKey: input.sourceObjectKey,
    sourceLayer: input.sourceLayer,
    sourceHash: sha256,
  });
  const normalizedHeader = table.header.map((entry) => entry.toUpperCase());
  if (table.version !== "2DA V2.0" || table.rows.length < 1 ||
    table.rows.length > MAX_EFFECTIVE_CREATURE_CLASS_SPELLS_TWO_DA_ROWS ||
    normalizedHeader.filter((entry) => entry === "NAME").length !== 1 ||
    normalizedHeader.filter((entry) => entry === "MASTER").length !== 1 ||
    table.diagnostics.some((entry) => entry.severity === "error")) return null;

  const classColumns = input.classesTable.rows.flatMap((classRow) => {
    const columnName = resolveCreatureSpellTableColumn(
      classRow.rowIndex,
      classRow.spellTableColumn,
    );
    if (!columnName) return [];
    const normalized = columnName.toUpperCase();
    return normalizedHeader.filter((entry) => entry === normalized).length === 1
      ? [{ classId: classRow.rowIndex, columnName }]
      : [];
  });
  if (classColumns.length === 0) return null;

  const rows: EffectiveCreatureClassSpellsTwoDaRow[] = [];
  for (const classColumn of classColumns) {
    for (const row of table.rows) {
      if (row.physicalRowIndex > WORD_MAX) return null;
      const nameStrRef = readUnsignedInt(readCell(row, normalizedHeader, "NAME"), DWORD_MAX - 1, 1);
      const spellLevel = readUnsignedInt(
        readCell(row, normalizedHeader, classColumn.columnName),
        13,
      );
      const master = readCell(row, normalizedHeader, "MASTER");
      if (nameStrRef === null || spellLevel === null ||
        readUnsignedInt(master, DWORD_MAX) !== null) continue;
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
        classId: classColumn.classId,
        rowIndex: row.physicalRowIndex,
        spellLevel,
        nameStrRef,
        ...(spellDescStrRef === null ? {} : { spellDescStrRef }),
        displayName: localized ?? `StringRef ${nameStrRef}`,
        displaySource: localized ? "strref" as const : "strref_id" as const,
      }));
      if (rows.length > MAX_EFFECTIVE_CREATURE_CLASS_SPELLS_ENTRIES) return null;
    }
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
    classesDescriptor: cloneClassesDescriptor(input.classesTable.descriptor),
    rows: Object.freeze(rows),
  });
}

export function localizeEffectiveCreatureClassSpellsTwoDa(
  table: EffectiveCreatureClassSpellsTwoDaTable,
  resolveStrRef: (strRef: number) => string | undefined,
): EffectiveCreatureClassSpellsTwoDaTable {
  if (!isExactEffectiveCreatureClassSpellsTwoDaTable(table) ||
    typeof resolveStrRef !== "function") return table;
  return Object.freeze({
    descriptor: Object.freeze({ ...table.descriptor }),
    classesDescriptor: Object.freeze({ ...table.classesDescriptor }),
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

export function isExactEffectiveCreatureClassSpellsTwoDaTable(
  value: unknown,
): value is EffectiveCreatureClassSpellsTwoDaTable {
  if (!isPlainRecord(value) || !hasExactKeys(value, ["descriptor", "classesDescriptor", "rows"]) ||
    !isPlainRecord(value.descriptor) || !Array.isArray(value.rows)) return false;
  const descriptor = value.descriptor;
  if (!hasExactKeys(descriptor, DESCRIPTOR_KEYS) || descriptor.resourceName !== "spells.2da" ||
    typeof descriptor.sourceObjectKey !== "string" || descriptor.sourceObjectKey.length < 1 ||
    descriptor.sourceObjectKey.length > MAX_EFFECTIVE_CREATURE_CLASS_SPELLS_SOURCE_OBJECT_KEY_LENGTH ||
    !isSourceLayer(descriptor.sourceLayer) || !isSha256(descriptor.sha256) ||
    !Number.isSafeInteger(descriptor.sizeBytes) || Number(descriptor.sizeBytes) < 1 ||
    Number(descriptor.sizeBytes) > MAX_EFFECTIVE_CREATURE_CLASS_SPELLS_TWO_DA_BYTES ||
    !Number.isSafeInteger(descriptor.rowCount) || Number(descriptor.rowCount) < 1 ||
    Number(descriptor.rowCount) > MAX_EFFECTIVE_CREATURE_CLASS_SPELLS_TWO_DA_ROWS ||
    value.rows.length > MAX_EFFECTIVE_CREATURE_CLASS_SPELLS_ENTRIES) return false;
  const classesTableShape = { descriptor: value.classesDescriptor, rows: [{
    rowIndex: 0, displayName: "shape", displaySource: "strref_id", nameStrRef: 0,
  }] };
  if (!isPlainRecord(value.classesDescriptor) ||
    !isExactEffectiveCreatureClassesTwoDaTable(classesTableShape) ||
    Number(value.classesDescriptor.rowCount) < 1) return false;

  let previousClassId = -1;
  let previousRowIndex = -1;
  for (const row of value.rows) {
    if (!isPlainRecord(row)) return false;
    const hasDescription = Object.prototype.hasOwnProperty.call(row, "spellDescStrRef");
    if (!hasExactKeys(row, hasDescription ? ROW_KEYS_WITH_DESCRIPTION : REQUIRED_ROW_KEYS) ||
      !Number.isSafeInteger(row.classId) || Number(row.classId) < 0 ||
      Number(row.classId) >= Number(value.classesDescriptor.rowCount) ||
      !Number.isSafeInteger(row.rowIndex) || Number(row.rowIndex) < 0 ||
      Number(row.rowIndex) >= Number(descriptor.rowCount) || Number(row.rowIndex) > WORD_MAX ||
      !Number.isSafeInteger(row.spellLevel) || Number(row.spellLevel) < 0 ||
      Number(row.spellLevel) > 13 ||
      !Number.isSafeInteger(row.nameStrRef) || Number(row.nameStrRef) < 1 ||
      Number(row.nameStrRef) >= DWORD_MAX ||
      hasDescription && (!Number.isSafeInteger(row.spellDescStrRef) ||
        Number(row.spellDescStrRef) < 1 || Number(row.spellDescStrRef) >= DWORD_MAX) ||
      readDisplayName(row.displayName) === null ||
      (row.displaySource !== "strref" && row.displaySource !== "strref_id") ||
      row.displaySource === "strref_id" && row.displayName !== `StringRef ${row.nameStrRef}` ||
      Number(row.classId) < previousClassId ||
      Number(row.classId) === previousClassId && Number(row.rowIndex) <= previousRowIndex) return false;
    previousClassId = Number(row.classId);
    previousRowIndex = Number(row.rowIndex);
  }
  return true;
}
