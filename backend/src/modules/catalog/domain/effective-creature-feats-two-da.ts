import { createHash } from "node:crypto";

import {
  parseAuroraTwoDaTable,
  type AuroraTwoDaRow,
} from "../../../common/aurora/two-da/aurora-two-da-table";

export const MAX_EFFECTIVE_CREATURE_FEATS_TWO_DA_BYTES = 64 * 1024 * 1024;
export const MAX_EFFECTIVE_CREATURE_FEATS_TWO_DA_ROWS = 65_536;
export const MAX_EFFECTIVE_CREATURE_FEATS_SOURCE_OBJECT_KEY_LENGTH = 2_048;
export const MAX_EFFECTIVE_CREATURE_FEATS_DISPLAY_CODE_UNITS = 1_024;

const DWORD_MAX = 0xffff_ffff;
const BYTE_MAX = 0xff;

export type EffectiveCreatureFeatsTwoDaSourceLayer = "module" | "hak" | "vanilla";
export type EffectiveCreatureFeatsTwoDaDisplaySource = "strref" | "strref_id";

export interface EffectiveCreatureFeatsTwoDaDescriptor {
  readonly resourceName: "feat.2da";
  readonly sourceObjectKey: string;
  readonly sourceLayer: EffectiveCreatureFeatsTwoDaSourceLayer;
  readonly sha256: string;
  readonly sizeBytes: number;
  readonly rowCount: number;
}

export interface EffectiveCreatureFeatsTwoDaRow {
  readonly rowIndex: number;
  readonly featNameStrRef: number;
  readonly descriptionStrRef?: number;
  readonly toolsCategory: number;
  readonly displayName: string;
  readonly displaySource: EffectiveCreatureFeatsTwoDaDisplaySource;
}

export interface EffectiveCreatureFeatsTwoDaTable {
  readonly descriptor: EffectiveCreatureFeatsTwoDaDescriptor;
  readonly rows: readonly EffectiveCreatureFeatsTwoDaRow[];
}

export interface EffectiveCreatureFeatsTwoDaInput {
  readonly bytes: Buffer;
  readonly sourceObjectKey: string;
  readonly sourceLayer: string;
  readonly resolveStrRef: (strRef: number) => string | undefined;
}

const DESCRIPTOR_KEYS = [
  "resourceName", "sourceObjectKey", "sourceLayer", "sha256", "sizeBytes", "rowCount",
] as const;
const REQUIRED_ROW_KEYS = [
  "rowIndex", "featNameStrRef", "toolsCategory", "displayName", "displaySource",
] as const;
const ROW_KEYS_WITH_DESCRIPTION = [
  "rowIndex", "featNameStrRef", "descriptionStrRef", "toolsCategory", "displayName",
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

function isSourceLayer(value: unknown): value is EffectiveCreatureFeatsTwoDaSourceLayer {
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
    value.length <= MAX_EFFECTIVE_CREATURE_FEATS_DISPLAY_CODE_UNITS &&
    !value.includes("\0") ? value : null;
}

export function parseEffectiveCreatureFeatsTwoDa(
  input: EffectiveCreatureFeatsTwoDaInput,
): EffectiveCreatureFeatsTwoDaTable | null {
  if (!Buffer.isBuffer(input.bytes) || input.bytes.length < 1 ||
    input.bytes.length > MAX_EFFECTIVE_CREATURE_FEATS_TWO_DA_BYTES ||
    typeof input.sourceObjectKey !== "string" || input.sourceObjectKey.length < 1 ||
    input.sourceObjectKey.length > MAX_EFFECTIVE_CREATURE_FEATS_SOURCE_OBJECT_KEY_LENGTH ||
    !isSourceLayer(input.sourceLayer) || typeof input.resolveStrRef !== "function") return null;

  const sha256 = createHash("sha256").update(input.bytes).digest("hex");
  const table = parseAuroraTwoDaTable(input.bytes, {
    tableName: "feat.2da",
    profile: "effective-creature-feats-toolset-selector",
    sourceObjectKey: input.sourceObjectKey,
    sourceLayer: input.sourceLayer,
    sourceHash: sha256,
  });
  const normalizedHeader = table.header.map((entry) => entry.toUpperCase());
  if (table.version !== "2DA V2.0" || table.rows.length < 1 ||
    table.rows.length > MAX_EFFECTIVE_CREATURE_FEATS_TWO_DA_ROWS ||
    normalizedHeader.filter((entry) => entry === "FEAT").length !== 1 ||
    normalizedHeader.filter((entry) => entry === "DESCRIPTION").length !== 1 ||
    normalizedHeader.filter((entry) => entry === "TOOLSCATEGORIES").length !== 1 ||
    table.diagnostics.some((entry) => entry.severity === "error")) return null;

  const rows: EffectiveCreatureFeatsTwoDaRow[] = [];
  for (const row of table.rows) {
    const featNameStrRef = readUnsignedInt(
      readCell(row, normalizedHeader, "FEAT"),
      DWORD_MAX - 1,
      1,
    );
    if (featNameStrRef === null) continue;
    const toolsCategory = readUnsignedInt(
      readCell(row, normalizedHeader, "TOOLSCATEGORIES"),
      BYTE_MAX,
    );
    if (toolsCategory === null || row.physicalRowIndex > 0xffff) return null;
    const descriptionStrRef = readUnsignedInt(
      readCell(row, normalizedHeader, "DESCRIPTION"),
      DWORD_MAX - 1,
      1,
    );
    let localized: string | null = null;
    try {
      localized = readDisplayName(input.resolveStrRef(featNameStrRef));
    } catch {
      localized = null;
    }
    rows.push(Object.freeze({
      rowIndex: row.physicalRowIndex,
      featNameStrRef,
      ...(descriptionStrRef === null ? {} : { descriptionStrRef }),
      toolsCategory,
      displayName: localized ?? `StringRef ${featNameStrRef}`,
      displaySource: localized ? "strref" as const : "strref_id" as const,
    }));
  }

  return Object.freeze({
    descriptor: Object.freeze({
      resourceName: "feat.2da",
      sourceObjectKey: input.sourceObjectKey,
      sourceLayer: input.sourceLayer,
      sha256,
      sizeBytes: input.bytes.length,
      rowCount: table.rows.length,
    }),
    rows: Object.freeze(rows),
  });
}

export function localizeEffectiveCreatureFeatsTwoDa(
  table: EffectiveCreatureFeatsTwoDaTable,
  resolveStrRef: (strRef: number) => string | undefined,
): EffectiveCreatureFeatsTwoDaTable {
  if (!isExactEffectiveCreatureFeatsTwoDaTable(table) ||
    typeof resolveStrRef !== "function") return table;
  return Object.freeze({
    descriptor: Object.freeze({ ...table.descriptor }),
    rows: Object.freeze(table.rows.map((row) => {
      let localized: string | null = null;
      try {
        localized = readDisplayName(resolveStrRef(row.featNameStrRef));
      } catch {
        localized = null;
      }
      return Object.freeze({
        ...row,
        displayName: localized ?? `StringRef ${row.featNameStrRef}`,
        displaySource: localized ? "strref" as const : "strref_id" as const,
      });
    })),
  });
}

export function isExactEffectiveCreatureFeatsTwoDaTable(
  value: unknown,
): value is EffectiveCreatureFeatsTwoDaTable {
  if (!isPlainRecord(value) || !hasExactKeys(value, ["descriptor", "rows"]) ||
    !isPlainRecord(value.descriptor) || !Array.isArray(value.rows)) return false;
  const descriptor = value.descriptor;
  if (!hasExactKeys(descriptor, DESCRIPTOR_KEYS) || descriptor.resourceName !== "feat.2da" ||
    typeof descriptor.sourceObjectKey !== "string" || descriptor.sourceObjectKey.length < 1 ||
    descriptor.sourceObjectKey.length > MAX_EFFECTIVE_CREATURE_FEATS_SOURCE_OBJECT_KEY_LENGTH ||
    !isSourceLayer(descriptor.sourceLayer) || typeof descriptor.sha256 !== "string" ||
    !/^[a-f0-9]{64}$/u.test(descriptor.sha256) ||
    !Number.isSafeInteger(descriptor.sizeBytes) || Number(descriptor.sizeBytes) < 1 ||
    Number(descriptor.sizeBytes) > MAX_EFFECTIVE_CREATURE_FEATS_TWO_DA_BYTES ||
    !Number.isSafeInteger(descriptor.rowCount) || Number(descriptor.rowCount) < 1 ||
    Number(descriptor.rowCount) > MAX_EFFECTIVE_CREATURE_FEATS_TWO_DA_ROWS ||
    value.rows.length > Number(descriptor.rowCount)) return false;

  let previous = -1;
  for (const row of value.rows) {
    if (!isPlainRecord(row)) return false;
    const hasDescription = Object.prototype.hasOwnProperty.call(row, "descriptionStrRef");
    if (!hasExactKeys(row, hasDescription ? ROW_KEYS_WITH_DESCRIPTION : REQUIRED_ROW_KEYS) ||
      !Number.isSafeInteger(row.rowIndex) || Number(row.rowIndex) < 0 ||
      Number(row.rowIndex) >= Number(descriptor.rowCount) || Number(row.rowIndex) <= previous ||
      !Number.isSafeInteger(row.featNameStrRef) || Number(row.featNameStrRef) < 1 ||
      Number(row.featNameStrRef) >= DWORD_MAX ||
      hasDescription && (!Number.isSafeInteger(row.descriptionStrRef) ||
        Number(row.descriptionStrRef) < 1 || Number(row.descriptionStrRef) >= DWORD_MAX) ||
      !Number.isSafeInteger(row.toolsCategory) || Number(row.toolsCategory) < 0 ||
      Number(row.toolsCategory) > BYTE_MAX || readDisplayName(row.displayName) === null ||
      (row.displaySource !== "strref" && row.displaySource !== "strref_id") ||
      (row.displaySource === "strref_id" &&
        row.displayName !== `StringRef ${row.featNameStrRef}`)) return false;
    previous = Number(row.rowIndex);
  }
  return true;
}
