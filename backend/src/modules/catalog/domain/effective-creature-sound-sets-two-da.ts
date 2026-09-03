import { createHash } from "node:crypto";

import {
  parseAuroraTwoDaTable,
  type AuroraTwoDaRow,
} from "../../../common/aurora/two-da/aurora-two-da-table";

export const MAX_EFFECTIVE_CREATURE_SOUND_SETS_TWO_DA_BYTES = 64 * 1024 * 1024;
export const MAX_EFFECTIVE_CREATURE_SOUND_SETS_TWO_DA_ROWS = 1_000_000;
export const MAX_EFFECTIVE_CREATURE_SOUND_SETS_SOURCE_OBJECT_KEY_LENGTH = 2048;
export const MAX_EFFECTIVE_CREATURE_SOUND_SETS_PAGE_ROWS = 256;
export const MAX_EFFECTIVE_CREATURE_SOUND_SETS_QUERY_CODE_UNITS = 128;
export const MAX_EFFECTIVE_CREATURE_SOUND_SETS_DISPLAY_CODE_UNITS = 1024;

const DWORD_MAX = 0xffff_ffff;
const WORD_MAX = 0xffff;
const REQUIRED_COLUMNS = ["LABEL", "RESREF", "STRREF", "GENDER", "TYPE"] as const;

export type EffectiveCreatureSoundSetsTwoDaSourceLayer = "module" | "hak" | "vanilla";
export type EffectiveCreatureSoundSetsTwoDaDisplaySource = "strref" | "strref_id" | "label";

export interface EffectiveCreatureSoundSetsTwoDaDescriptor {
  readonly resourceName: "soundset.2da";
  readonly sourceObjectKey: string;
  readonly sourceLayer: EffectiveCreatureSoundSetsTwoDaSourceLayer;
  readonly sha256: string;
  readonly sizeBytes: number;
  readonly rowCount: number;
}

export interface EffectiveCreatureSoundSetsTwoDaRow {
  readonly rowIndex: number;
  readonly displayName: string;
  readonly displaySource: EffectiveCreatureSoundSetsTwoDaDisplaySource;
  readonly nameStrRef: number | null;
  readonly resRef: string;
}

export interface EffectiveCreatureSoundSetsTwoDaTable {
  readonly descriptor: EffectiveCreatureSoundSetsTwoDaDescriptor;
  readonly rows: readonly EffectiveCreatureSoundSetsTwoDaRow[];
}

export interface EffectiveCreatureSoundSetsTwoDaInput {
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

function isSourceLayer(value: unknown): value is EffectiveCreatureSoundSetsTwoDaSourceLayer {
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

function readStringRef(value: unknown): number | null {
  if (typeof value !== "string" || !/^\d+$/u.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 1 && parsed < DWORD_MAX ? parsed : null;
}

function readDisplayText(value: unknown): string | null {
  return typeof value === "string" && value !== "****" && value.length >= 1 &&
    value.length <= MAX_EFFECTIVE_CREATURE_SOUND_SETS_DISPLAY_CODE_UNITS &&
    !value.includes("\0") ? value : null;
}

function readResRef(value: unknown): string | null {
  return typeof value === "string" && /^[A-Za-z0-9_]{1,16}$/u.test(value)
    ? value.toLowerCase()
    : null;
}

export function isCreatureSoundSetFileRowIndex(value: unknown, rowCount: number): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0 && Number(value) <= WORD_MAX &&
    Number(value) < rowCount;
}

export function parseEffectiveCreatureSoundSetsTwoDa(
  input: EffectiveCreatureSoundSetsTwoDaInput,
): EffectiveCreatureSoundSetsTwoDaTable | null {
  if (!Buffer.isBuffer(input.bytes) || input.bytes.length < 1 ||
    input.bytes.length > MAX_EFFECTIVE_CREATURE_SOUND_SETS_TWO_DA_BYTES ||
    typeof input.sourceObjectKey !== "string" || input.sourceObjectKey.length < 1 ||
    input.sourceObjectKey.length > MAX_EFFECTIVE_CREATURE_SOUND_SETS_SOURCE_OBJECT_KEY_LENGTH ||
    !isSourceLayer(input.sourceLayer) || typeof input.resolveStrRef !== "function") return null;

  const sha256 = createHash("sha256").update(input.bytes).digest("hex");
  const table = parseAuroraTwoDaTable(input.bytes, {
    tableName: "soundset.2da",
    profile: "effective-creature-sound-sets-toolset-selector",
    sourceObjectKey: input.sourceObjectKey,
    sourceLayer: input.sourceLayer,
    sourceHash: sha256,
  });
  const normalizedHeader = table.header.map((entry) => entry.toUpperCase());
  if (table.version !== "2DA V2.0" || table.rows.length < 1 ||
    table.rows.length > MAX_EFFECTIVE_CREATURE_SOUND_SETS_TWO_DA_ROWS ||
    REQUIRED_COLUMNS.some(
      (column) => normalizedHeader.filter((entry) => entry === column).length !== 1,
    ) || table.diagnostics.some((entry) => entry.severity === "error")) return null;

  const rows: EffectiveCreatureSoundSetsTwoDaRow[] = [];
  for (const row of table.rows) {
    if (row.physicalRowIndex > WORD_MAX) continue;
    const resRef = readResRef(readCell(row, normalizedHeader, "RESREF"));
    if (!resRef) continue;
    const nameStrRef = readStringRef(readCell(row, normalizedHeader, "STRREF"));
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
      displayName: nameStrRef === null ? label! : localized ?? `StringRef ${nameStrRef}`,
      displaySource: nameStrRef === null
        ? "label" as const
        : localized ? "strref" as const : "strref_id" as const,
      nameStrRef,
      resRef,
    }));
  }
  if (rows.length === 0) return null;

  return Object.freeze({
    descriptor: Object.freeze({
      resourceName: "soundset.2da",
      sourceObjectKey: input.sourceObjectKey,
      sourceLayer: input.sourceLayer,
      sha256,
      sizeBytes: input.bytes.length,
      rowCount: table.rows.length,
    }),
    rows: Object.freeze(rows),
  });
}

export function localizeEffectiveCreatureSoundSetsTwoDa(
  table: EffectiveCreatureSoundSetsTwoDaTable,
  resolveStrRef: (strRef: number) => string | undefined,
): EffectiveCreatureSoundSetsTwoDaTable {
  if (!isExactEffectiveCreatureSoundSetsTwoDaTable(table) ||
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

export function isExactEffectiveCreatureSoundSetsTwoDaTable(
  value: unknown,
): value is EffectiveCreatureSoundSetsTwoDaTable {
  if (!isPlainRecord(value) || !hasExactKeys(value, ["descriptor", "rows"]) ||
    !isPlainRecord(value.descriptor) || !Array.isArray(value.rows)) return false;
  const descriptor = value.descriptor;
  if (!hasExactKeys(descriptor, [
    "resourceName", "sourceObjectKey", "sourceLayer", "sha256", "sizeBytes", "rowCount",
  ]) || descriptor.resourceName !== "soundset.2da" ||
    typeof descriptor.sourceObjectKey !== "string" || descriptor.sourceObjectKey.length < 1 ||
    descriptor.sourceObjectKey.length > MAX_EFFECTIVE_CREATURE_SOUND_SETS_SOURCE_OBJECT_KEY_LENGTH ||
    !isSourceLayer(descriptor.sourceLayer) || typeof descriptor.sha256 !== "string" ||
    !/^[a-f0-9]{64}$/u.test(descriptor.sha256) || !Number.isSafeInteger(descriptor.sizeBytes) ||
    Number(descriptor.sizeBytes) < 1 ||
    Number(descriptor.sizeBytes) > MAX_EFFECTIVE_CREATURE_SOUND_SETS_TWO_DA_BYTES ||
    !Number.isSafeInteger(descriptor.rowCount) || Number(descriptor.rowCount) < 1 ||
    Number(descriptor.rowCount) > MAX_EFFECTIVE_CREATURE_SOUND_SETS_TWO_DA_ROWS ||
    value.rows.length < 1 || value.rows.length > Math.min(Number(descriptor.rowCount), WORD_MAX + 1)) {
    return false;
  }

  let previousRowIndex = -1;
  for (const row of value.rows) {
    if (!isPlainRecord(row) || !hasExactKeys(row, [
      "rowIndex", "displayName", "displaySource", "nameStrRef", "resRef",
    ]) || !isCreatureSoundSetFileRowIndex(row.rowIndex, Number(descriptor.rowCount)) ||
      Number(row.rowIndex) <= previousRowIndex || readDisplayText(row.displayName) === null ||
      (row.displaySource !== "strref" && row.displaySource !== "strref_id" &&
        row.displaySource !== "label") ||
      (row.nameStrRef !== null && (!Number.isSafeInteger(row.nameStrRef) ||
        Number(row.nameStrRef) < 1 || Number(row.nameStrRef) >= DWORD_MAX)) ||
      (row.displaySource === "label") !== (row.nameStrRef === null) ||
      readResRef(row.resRef) !== row.resRef) return false;
    previousRowIndex = Number(row.rowIndex);
  }
  return true;
}
