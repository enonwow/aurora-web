import { createHash } from "node:crypto";
import {
  parseAuroraTwoDaTable,
  type AuroraTwoDaRow,
} from "../../../common/aurora/two-da/aurora-two-da-table";

export const AREA_AUDIO_ENVIRONMENT_CATALOGS_SCHEMA_VERSION =
  "area-audio-environment-catalogs.v1" as const;
export const MAX_EFFECTIVE_AREA_AUDIO_TWO_DA_BYTES = 16 * 1024 * 1024;
export const MAX_EFFECTIVE_AREA_AUDIO_TWO_DA_ROWS = 4096;
export const MAX_EFFECTIVE_AREA_AUDIO_CATALOG_BUNDLE_BYTES = 2 * 1024 * 1024;
export const MAX_EFFECTIVE_AREA_AUDIO_SOURCE_KEY_CODE_UNITS = 2048;
export const MAX_EFFECTIVE_AREA_AUDIO_LABEL_CODE_UNITS = 256;
export const MAX_EFFECTIVE_AREA_AUDIO_DISPLAY_CODE_UNITS = 1024;

export type EffectiveAreaAudioTwoDaResourceName =
  | "ambientsound.2da"
  | "ambientmusic.2da"
  | "soundeax.2da";
export type EffectiveAreaAudioTwoDaSourceLayer = "module" | "hak" | "vanilla";
export type EffectiveAreaAudioDisplaySource =
  | "strref"
  | "display_name"
  | "label"
  | "resource"
  | "row_index";

export interface EffectiveAreaAudioTwoDaDescriptor {
  readonly resourceName: EffectiveAreaAudioTwoDaResourceName;
  readonly sourceObjectKey: string;
  readonly sourceLayer: EffectiveAreaAudioTwoDaSourceLayer;
  readonly sha256: string;
  readonly sizeBytes: number;
  readonly rowCount: number;
}

export interface EffectiveAreaAudioSourceRow {
  readonly rowIndex: number;
  readonly descriptionStrRef?: number;
  readonly resourceResRef?: string;
  readonly displayNameRaw?: string;
  readonly label?: string;
  readonly battleEligible?: boolean;
}

export interface EffectiveAreaAudioRow extends EffectiveAreaAudioSourceRow {
  readonly displayName: string;
  readonly displaySource: EffectiveAreaAudioDisplaySource;
}

export interface EffectiveAreaAudioTwoDaTable {
  readonly descriptor: EffectiveAreaAudioTwoDaDescriptor;
  readonly rows: readonly EffectiveAreaAudioSourceRow[];
}

export interface EffectiveAreaAudioCatalog {
  readonly descriptor: EffectiveAreaAudioTwoDaDescriptor;
  readonly rows: readonly EffectiveAreaAudioRow[];
}

export interface EffectiveAreaAudioCatalogBundle {
  readonly schemaVersion: typeof AREA_AUDIO_ENVIRONMENT_CATALOGS_SCHEMA_VERSION;
  readonly ambientSound: EffectiveAreaAudioCatalog;
  readonly ambientMusic: EffectiveAreaAudioCatalog;
  readonly environmentalAudio: EffectiveAreaAudioCatalog;
}

export interface EffectiveAreaAudioTwoDaInput {
  readonly resourceName: EffectiveAreaAudioTwoDaResourceName;
  readonly bytes: Buffer;
  readonly sourceObjectKey: string;
  readonly sourceLayer: EffectiveAreaAudioTwoDaSourceLayer;
}

const REQUIRED_COLUMNS: Readonly<Record<EffectiveAreaAudioTwoDaResourceName, readonly string[]>> =
  Object.freeze({
    "ambientsound.2da": Object.freeze(["Description", "Resource", "DisplayName"]),
    "ambientmusic.2da": Object.freeze(["Description", "Resource", "DisplayName"]),
    "soundeax.2da": Object.freeze(["Label", "Description"]),
  });

export function parseEffectiveAreaAudioTwoDa(
  input: EffectiveAreaAudioTwoDaInput,
): EffectiveAreaAudioTwoDaTable | null {
  if (!isInputAdmitted(input)) return null;
  const sha256 = createHash("sha256").update(input.bytes).digest("hex");
  const table = parseAuroraTwoDaTable(input.bytes, {
    tableName: input.resourceName,
    profile: "effective-area-audio-source-provenance",
    sourceObjectKey: input.sourceObjectKey,
    sourceLayer: input.sourceLayer,
    sourceHash: sha256,
  });
  if (table.rows.length < 1 || table.rows.length > MAX_EFFECTIVE_AREA_AUDIO_TWO_DA_ROWS ||
    table.diagnostics.some((entry) => entry.severity === "error") ||
    REQUIRED_COLUMNS[input.resourceName].some(
      (column) => table.header.filter((candidate) => candidate === column).length !== 1,
    )) return null;

  const rows: EffectiveAreaAudioSourceRow[] = [];
  const rowIndexes = new Set<number>();
  for (const row of table.rows) {
    if (!Number.isSafeInteger(row.rowId) || row.rowId < 0 || rowIndexes.has(row.rowId)) return null;
    rowIndexes.add(row.rowId);
    const parsed = input.resourceName === "soundeax.2da"
      ? parseSoundEaxRow(row, table.header)
      : parseAmbientRow(row, table.header, input.resourceName === "ambientmusic.2da");
    if (!parsed) return null;
    rows.push(Object.freeze({ rowIndex: row.rowId, ...parsed }));
  }
  rows.sort((left, right) => left.rowIndex - right.rowIndex);
  return Object.freeze({
    descriptor: Object.freeze({
      resourceName: input.resourceName,
      sourceObjectKey: input.sourceObjectKey,
      sourceLayer: input.sourceLayer,
      sha256,
      sizeBytes: input.bytes.length,
      rowCount: rows.length,
    }),
    rows: Object.freeze(rows),
  });
}

export function buildEffectiveAreaAudioCatalog(
  table: EffectiveAreaAudioTwoDaTable,
  resolveStrRef: (strRef: number) => string | undefined,
): EffectiveAreaAudioCatalog {
  return Object.freeze({
    descriptor: Object.freeze({ ...table.descriptor }),
    rows: Object.freeze(table.rows.map((row) => {
      let localizedName: string | undefined;
      if (row.descriptionStrRef !== undefined) {
        try {
          const resolved = resolveStrRef(row.descriptionStrRef);
          localizedName = isBoundedDisplay(resolved) ? resolved : undefined;
        } catch {
          localizedName = undefined;
        }
      }
      const displayName = localizedName ?? row.displayNameRaw ?? row.label ??
        row.resourceResRef ?? `Row ${row.rowIndex}`;
      const displaySource: EffectiveAreaAudioDisplaySource = localizedName
        ? "strref"
        : row.displayNameRaw
          ? "display_name"
          : row.label
            ? "label"
            : row.resourceResRef
              ? "resource"
              : "row_index";
      return Object.freeze({ ...row, displayName, displaySource });
    })),
  });
}

export function isExactEffectiveAreaAudioCatalogBundle(
  value: unknown,
): value is EffectiveAreaAudioCatalogBundle {
  if (!isPlainRecord(value) || !hasExactKeys(value, [
    "schemaVersion", "ambientSound", "ambientMusic", "environmentalAudio",
  ]) || value.schemaVersion !== AREA_AUDIO_ENVIRONMENT_CATALOGS_SCHEMA_VERSION) return false;
  const exact = isExactCatalog(value.ambientSound, "ambientsound.2da") &&
    isExactCatalog(value.ambientMusic, "ambientmusic.2da") &&
    isExactCatalog(value.environmentalAudio, "soundeax.2da");
  if (!exact) return false;
  try {
    return Buffer.byteLength(JSON.stringify(value), "utf8") <=
      MAX_EFFECTIVE_AREA_AUDIO_CATALOG_BUNDLE_BYTES;
  } catch {
    return false;
  }
}

function parseAmbientRow(
  row: AuroraTwoDaRow,
  header: readonly string[],
  music: boolean,
): Omit<EffectiveAreaAudioSourceRow, "rowIndex"> | null {
  const descriptionStrRef = readOptionalUint32(readCell(row, header, "Description"));
  const resourceResRef = readOptionalResRef(readCell(row, header, "Resource"));
  const displayNameRaw = readOptionalLabel(readCell(row, header, "DisplayName"));
  if (descriptionStrRef === null || resourceResRef === null || displayNameRaw === null) return null;
  return {
    ...(descriptionStrRef === undefined ? {} : { descriptionStrRef }),
    ...(resourceResRef === undefined ? {} : { resourceResRef }),
    ...(displayNameRaw === undefined ? {} : { displayNameRaw }),
    ...(music
      ? { battleEligible: resourceResRef?.toLowerCase().startsWith("mus_bat_") ?? false }
      : {}),
  };
}

function parseSoundEaxRow(
  row: AuroraTwoDaRow,
  header: readonly string[],
): Omit<EffectiveAreaAudioSourceRow, "rowIndex"> | null {
  const label = readOptionalLabel(readCell(row, header, "Label"));
  const descriptionStrRef = readOptionalUint32(readCell(row, header, "Description"));
  if (label === null || descriptionStrRef === null) return null;
  return {
    ...(label === undefined ? {} : { label }),
    ...(descriptionStrRef === undefined ? {} : { descriptionStrRef }),
  };
}

function isInputAdmitted(input: EffectiveAreaAudioTwoDaInput): boolean {
  return (input.resourceName === "ambientsound.2da" ||
      input.resourceName === "ambientmusic.2da" ||
      input.resourceName === "soundeax.2da") &&
    Buffer.isBuffer(input.bytes) && input.bytes.length >= 1 &&
    input.bytes.length <= MAX_EFFECTIVE_AREA_AUDIO_TWO_DA_BYTES &&
    typeof input.sourceObjectKey === "string" && input.sourceObjectKey.length >= 1 &&
    input.sourceObjectKey.length <= MAX_EFFECTIVE_AREA_AUDIO_SOURCE_KEY_CODE_UNITS &&
    !input.sourceObjectKey.includes("\0") &&
    (input.sourceLayer === "module" || input.sourceLayer === "hak" ||
      input.sourceLayer === "vanilla");
}

function readCell(row: AuroraTwoDaRow, header: readonly string[], column: string) {
  return row.cells[header.indexOf(column)]?.value;
}

function readOptionalUint32(value: string | undefined): number | null | undefined {
  if (value === undefined || value === "****") return undefined;
  if (!/^\d+$/u.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed <= 0xffff_ffff ? parsed : null;
}

function readOptionalResRef(value: string | undefined): string | null | undefined {
  if (value === undefined || value === "****") return undefined;
  return /^[A-Za-z0-9_]{1,16}$/u.test(value) ? value : null;
}

function readOptionalLabel(value: string | undefined): string | null | undefined {
  if (value === undefined || value === "****") return undefined;
  return value.length >= 1 && value.length <= MAX_EFFECTIVE_AREA_AUDIO_LABEL_CODE_UNITS &&
    !value.includes("\0") ? value : null;
}

function isBoundedDisplay(value: unknown): value is string {
  return typeof value === "string" && value.length >= 1 &&
    value.length <= MAX_EFFECTIVE_AREA_AUDIO_DISPLAY_CODE_UNITS && !value.includes("\0");
}

function isExactCatalog(
  value: unknown,
  resourceName: EffectiveAreaAudioTwoDaResourceName,
): value is EffectiveAreaAudioCatalog {
  if (!isPlainRecord(value) || !hasExactKeys(value, ["descriptor", "rows"]) ||
    !isExactDescriptor(value.descriptor, resourceName) || !Array.isArray(value.rows) ||
    value.rows.length !== value.descriptor.rowCount) return false;
  let previousRowIndex = -1;
  for (const row of value.rows) {
    if (!isExactRow(row, resourceName) || row.rowIndex <= previousRowIndex) return false;
    previousRowIndex = row.rowIndex;
  }
  return true;
}

function isExactDescriptor(
  value: unknown,
  resourceName: EffectiveAreaAudioTwoDaResourceName,
): value is EffectiveAreaAudioTwoDaDescriptor {
  return isPlainRecord(value) && hasExactKeys(value, [
    "resourceName", "sourceObjectKey", "sourceLayer", "sha256", "sizeBytes", "rowCount",
  ]) && value.resourceName === resourceName && typeof value.sourceObjectKey === "string" &&
    value.sourceObjectKey.length >= 1 &&
    value.sourceObjectKey.length <= MAX_EFFECTIVE_AREA_AUDIO_SOURCE_KEY_CODE_UNITS &&
    !value.sourceObjectKey.includes("\0") &&
    (value.sourceLayer === "module" || value.sourceLayer === "hak" ||
      value.sourceLayer === "vanilla") && typeof value.sha256 === "string" &&
    /^[a-f0-9]{64}$/u.test(value.sha256) && Number.isSafeInteger(value.sizeBytes) &&
    Number(value.sizeBytes) >= 1 && Number(value.sizeBytes) <= MAX_EFFECTIVE_AREA_AUDIO_TWO_DA_BYTES &&
    Number.isSafeInteger(value.rowCount) && Number(value.rowCount) >= 1 &&
    Number(value.rowCount) <= MAX_EFFECTIVE_AREA_AUDIO_TWO_DA_ROWS;
}

function isExactRow(value: unknown, resourceName: EffectiveAreaAudioTwoDaResourceName): boolean {
  if (!isPlainRecord(value)) return false;
  const allowed = resourceName === "soundeax.2da"
    ? ["rowIndex", "label", "descriptionStrRef", "displayName", "displaySource"]
    : resourceName === "ambientmusic.2da"
      ? [
          "rowIndex", "descriptionStrRef", "resourceResRef", "displayNameRaw",
          "battleEligible", "displayName", "displaySource",
        ]
      : [
          "rowIndex", "descriptionStrRef", "resourceResRef", "displayNameRaw",
          "displayName", "displaySource",
        ];
  if (Object.keys(value).some((key) => !allowed.includes(key)) ||
    !Number.isSafeInteger(value.rowIndex) || Number(value.rowIndex) < 0 ||
    !isBoundedDisplay(value.displayName) ||
    (value.displaySource !== "strref" && value.displaySource !== "display_name" &&
      value.displaySource !== "label" && value.displaySource !== "resource" &&
      value.displaySource !== "row_index") ||
    (value.descriptionStrRef !== undefined && (!Number.isSafeInteger(value.descriptionStrRef) ||
      Number(value.descriptionStrRef) < 0 || Number(value.descriptionStrRef) > 0xffff_ffff)) ||
    (value.resourceResRef !== undefined && (typeof value.resourceResRef !== "string" ||
      !/^[A-Za-z0-9_]{1,16}$/u.test(value.resourceResRef))) ||
    (value.displayNameRaw !== undefined && (typeof value.displayNameRaw !== "string" ||
      readOptionalLabel(value.displayNameRaw) !== value.displayNameRaw)) ||
    (value.label !== undefined && (typeof value.label !== "string" ||
      readOptionalLabel(value.label) !== value.label))) return false;
  return resourceName !== "ambientmusic.2da" || typeof value.battleEligible === "boolean";
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype;
}

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const keys = Object.keys(value);
  return keys.length === expected.length && expected.every((key) => keys.includes(key));
}
