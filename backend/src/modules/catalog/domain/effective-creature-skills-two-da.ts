import { createHash } from "node:crypto";

import {
  parseAuroraTwoDaTable,
  type AuroraTwoDaRow,
} from "../../../common/aurora/two-da/aurora-two-da-table";

export const MAX_EFFECTIVE_CREATURE_SKILLS_TWO_DA_BYTES = 16 * 1024 * 1024;
export const MAX_EFFECTIVE_CREATURE_SKILLS_TWO_DA_ROWS = 4_096;
export const MAX_EFFECTIVE_CREATURE_SKILLS_SOURCE_OBJECT_KEY_LENGTH = 2_048;
export const MAX_EFFECTIVE_CREATURE_SKILLS_PAGE_ROWS = 128;
export const MAX_EFFECTIVE_CREATURE_SKILLS_QUERY_CODE_UNITS = 128;
export const MAX_EFFECTIVE_CREATURE_SKILLS_DISPLAY_CODE_UNITS = 1_024;

const DWORD_MAX = 0xffff_ffff;

export type EffectiveCreatureSkillsTwoDaSourceLayer = "module" | "hak" | "vanilla";
export type EffectiveCreatureSkillsTwoDaDisplaySource = "strref" | "strref_id";

export interface EffectiveCreatureSkillsTwoDaDescriptor {
  readonly resourceName: "skills.2da";
  readonly sourceObjectKey: string;
  readonly sourceLayer: EffectiveCreatureSkillsTwoDaSourceLayer;
  readonly sha256: string;
  readonly sizeBytes: number;
  readonly rowCount: number;
}

export interface EffectiveCreatureSkillsTwoDaRow {
  readonly rowIndex: number;
  readonly nameStrRef: number;
  readonly displayName: string;
  readonly displaySource: EffectiveCreatureSkillsTwoDaDisplaySource;
}

export interface EffectiveCreatureSkillsTwoDaTable {
  readonly descriptor: EffectiveCreatureSkillsTwoDaDescriptor;
  readonly rows: readonly EffectiveCreatureSkillsTwoDaRow[];
}

export interface EffectiveCreatureSkillsTwoDaInput {
  readonly bytes: Buffer;
  readonly sourceObjectKey: string;
  readonly sourceLayer: string;
  readonly resolveStrRef: (strRef: number) => string | undefined;
}

const DESCRIPTOR_KEYS = [
  "resourceName", "sourceObjectKey", "sourceLayer", "sha256", "sizeBytes", "rowCount",
] as const;
const ROW_KEYS = ["rowIndex", "nameStrRef", "displayName", "displaySource"] as const;

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype;
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value);
  return actual.length === keys.length && keys.every((key) => actual.includes(key));
}

function isSourceLayer(value: unknown): value is EffectiveCreatureSkillsTwoDaSourceLayer {
  return value === "module" || value === "hak" || value === "vanilla";
}

function readNameCell(row: AuroraTwoDaRow, normalizedHeader: readonly string[]): string | undefined {
  const index = normalizedHeader.indexOf("NAME");
  return index < 0 ? undefined : row.cells[index]?.value;
}

function readNameStrRef(value: unknown): number | null {
  if (typeof value !== "string" || !/^\d+$/u.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 1 && parsed < DWORD_MAX ? parsed : null;
}

function readDisplayName(value: unknown): string | null {
  return typeof value === "string" && value.length >= 1 &&
    value.length <= MAX_EFFECTIVE_CREATURE_SKILLS_DISPLAY_CODE_UNITS &&
    !value.includes("\0") ? value : null;
}

export function parseEffectiveCreatureSkillsTwoDa(
  input: EffectiveCreatureSkillsTwoDaInput,
): EffectiveCreatureSkillsTwoDaTable | null {
  if (!Buffer.isBuffer(input.bytes) || input.bytes.length < 1 ||
    input.bytes.length > MAX_EFFECTIVE_CREATURE_SKILLS_TWO_DA_BYTES ||
    typeof input.sourceObjectKey !== "string" || input.sourceObjectKey.length < 1 ||
    input.sourceObjectKey.length > MAX_EFFECTIVE_CREATURE_SKILLS_SOURCE_OBJECT_KEY_LENGTH ||
    !isSourceLayer(input.sourceLayer) || typeof input.resolveStrRef !== "function") return null;

  const sha256 = createHash("sha256").update(input.bytes).digest("hex");
  const table = parseAuroraTwoDaTable(input.bytes, {
    tableName: "skills.2da",
    profile: "effective-creature-skills-toolset-selector",
    sourceObjectKey: input.sourceObjectKey,
    sourceLayer: input.sourceLayer,
    sourceHash: sha256,
  });
  const normalizedHeader = table.header.map((entry) => entry.toUpperCase());
  if (table.version !== "2DA V2.0" || table.rows.length < 1 ||
    table.rows.length > MAX_EFFECTIVE_CREATURE_SKILLS_TWO_DA_ROWS ||
    normalizedHeader.filter((entry) => entry === "NAME").length !== 1 ||
    table.diagnostics.some((entry) => entry.severity === "error")) return null;

  const rows: EffectiveCreatureSkillsTwoDaRow[] = [];
  for (const row of table.rows) {
    const nameStrRef = readNameStrRef(readNameCell(row, normalizedHeader));
    if (nameStrRef === null) continue;
    let localized: string | null = null;
    try {
      localized = readDisplayName(input.resolveStrRef(nameStrRef));
    } catch {
      localized = null;
    }
    rows.push(Object.freeze({
      rowIndex: row.physicalRowIndex,
      nameStrRef,
      displayName: localized ?? `StringRef ${nameStrRef}`,
      displaySource: localized ? "strref" as const : "strref_id" as const,
    }));
  }

  return Object.freeze({
    descriptor: Object.freeze({
      resourceName: "skills.2da",
      sourceObjectKey: input.sourceObjectKey,
      sourceLayer: input.sourceLayer,
      sha256,
      sizeBytes: input.bytes.length,
      rowCount: table.rows.length,
    }),
    rows: Object.freeze(rows),
  });
}

export function localizeEffectiveCreatureSkillsTwoDa(
  table: EffectiveCreatureSkillsTwoDaTable,
  resolveStrRef: (strRef: number) => string | undefined,
): EffectiveCreatureSkillsTwoDaTable {
  if (!isExactEffectiveCreatureSkillsTwoDaTable(table) ||
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

export function isExactEffectiveCreatureSkillsTwoDaTable(
  value: unknown,
): value is EffectiveCreatureSkillsTwoDaTable {
  if (!isPlainRecord(value) || !hasExactKeys(value, ["descriptor", "rows"]) ||
    !isPlainRecord(value.descriptor) || !Array.isArray(value.rows)) return false;
  const descriptor = value.descriptor;
  if (!hasExactKeys(descriptor, DESCRIPTOR_KEYS) || descriptor.resourceName !== "skills.2da" ||
    typeof descriptor.sourceObjectKey !== "string" || descriptor.sourceObjectKey.length < 1 ||
    descriptor.sourceObjectKey.length > MAX_EFFECTIVE_CREATURE_SKILLS_SOURCE_OBJECT_KEY_LENGTH ||
    !isSourceLayer(descriptor.sourceLayer) || typeof descriptor.sha256 !== "string" ||
    !/^[a-f0-9]{64}$/u.test(descriptor.sha256) || !Number.isSafeInteger(descriptor.sizeBytes) ||
    Number(descriptor.sizeBytes) < 1 ||
    Number(descriptor.sizeBytes) > MAX_EFFECTIVE_CREATURE_SKILLS_TWO_DA_BYTES ||
    !Number.isSafeInteger(descriptor.rowCount) || Number(descriptor.rowCount) < 1 ||
    Number(descriptor.rowCount) > MAX_EFFECTIVE_CREATURE_SKILLS_TWO_DA_ROWS ||
    value.rows.length > Number(descriptor.rowCount)) return false;
  let previous = -1;
  for (const row of value.rows) {
    if (!isPlainRecord(row) || !hasExactKeys(row, ROW_KEYS) ||
      !Number.isSafeInteger(row.rowIndex) || Number(row.rowIndex) < 0 ||
      Number(row.rowIndex) >= Number(descriptor.rowCount) || Number(row.rowIndex) <= previous ||
      !Number.isSafeInteger(row.nameStrRef) || Number(row.nameStrRef) < 1 ||
      Number(row.nameStrRef) >= DWORD_MAX || readDisplayName(row.displayName) === null ||
      (row.displaySource !== "strref" && row.displaySource !== "strref_id") ||
      (row.displaySource === "strref_id" && row.displayName !== `StringRef ${row.nameStrRef}`)) {
      return false;
    }
    previous = Number(row.rowIndex);
  }
  return true;
}
