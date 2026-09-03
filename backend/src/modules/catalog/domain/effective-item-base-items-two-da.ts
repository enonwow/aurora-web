import { createHash } from "node:crypto";

import {
  parseAuroraTwoDaTable,
  type AuroraTwoDaRow,
} from "../../../common/aurora/two-da/aurora-two-da-table";

export const MAX_EFFECTIVE_ITEM_BASE_ITEMS_TWO_DA_BYTES = 16 * 1024 * 1024;
export const MAX_EFFECTIVE_ITEM_BASE_ITEMS_TWO_DA_ROWS = 4096;
export const MAX_EFFECTIVE_ITEM_BASE_ITEMS_SOURCE_OBJECT_KEY_LENGTH = 2048;
export const MAX_EFFECTIVE_ITEM_BASE_ITEMS_LABEL_CODE_UNITS = 256;
export const MAX_EFFECTIVE_ITEM_BASE_ITEMS_CLASS_CODE_UNITS = 64;
export const MAX_EFFECTIVE_ITEM_BASE_ITEMS_DISPLAY_CODE_UNITS = 1024;
export const MAX_EFFECTIVE_ITEM_BASE_ITEMS_INVENTORY_SLOT_DIMENSION = 10;

export type EffectiveItemBaseItemsTwoDaSourceLayer = "module" | "hak" | "vanilla";
export type EffectiveItemBaseItemModelType = 0 | 1 | 2 | 3;

export interface EffectiveItemBaseItemsTwoDaDescriptor {
  readonly resourceName: "baseitems.2da";
  readonly sourceObjectKey: string;
  readonly sourceLayer: EffectiveItemBaseItemsTwoDaSourceLayer;
  readonly sha256: string;
  readonly sizeBytes: number;
  readonly rowCount: number;
}

export interface EffectiveItemBaseItemRow {
  readonly rowIndex: number;
  readonly nameStrRef?: number;
  readonly label?: string;
  readonly modelType: EffectiveItemBaseItemModelType;
  readonly itemClass?: string;
  readonly displayName: string;
  readonly invSlotWidth?: number;
  readonly invSlotHeight?: number;
}

export interface EffectiveItemBaseItemsTwoDaTable {
  readonly descriptor: EffectiveItemBaseItemsTwoDaDescriptor;
  readonly rows: readonly EffectiveItemBaseItemRow[];
}

export interface EffectiveItemBaseItemsTwoDaInput {
  readonly bytes: Buffer;
  readonly sourceObjectKey: string;
  readonly sourceLayer: string;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype;
}

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const keys = Object.keys(value);
  return keys.length === expected.length && expected.every((key) => keys.includes(key));
}

function isSourceLayer(value: unknown): value is EffectiveItemBaseItemsTwoDaSourceLayer {
  return value === "module" || value === "hak" || value === "vanilla";
}

function isBoundedString(value: unknown, maximum: number): value is string {
  return typeof value === "string" && value.length >= 1 && value.length <= maximum &&
    !value.includes("\0");
}

function isModelType(value: unknown): value is EffectiveItemBaseItemModelType {
  return value === 0 || value === 1 || value === 2 || value === 3;
}

function readCell(row: AuroraTwoDaRow, header: readonly string[], column: string): string | undefined {
  const index = header.indexOf(column);
  return index < 0 ? undefined : row.cells[index]?.value;
}

function readOptionalText(value: string | undefined, maximum: number): string | null | undefined {
  if (value === undefined || value === "****") return undefined;
  return isBoundedString(value, maximum) ? value : null;
}

function readOptionalUint32(value: string | undefined): number | null | undefined {
  if (value === undefined || value === "****") return undefined;
  if (!/^\d+$/u.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 && parsed <= 0xffff_ffff ? parsed : null;
}

function readOptionalInventorySlotDimension(
  value: string | undefined,
): number | null | undefined {
  if (value === undefined || value === "****") return undefined;
  if (!/^\d+$/u.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 1 &&
    parsed <= MAX_EFFECTIVE_ITEM_BASE_ITEMS_INVENTORY_SLOT_DIMENSION
    ? parsed
    : null;
}

function readModelType(value: string | undefined): EffectiveItemBaseItemModelType | null {
  if (!/^[0-3]$/u.test(value ?? "")) return null;
  const parsed = Number(value);
  return isModelType(parsed) ? parsed : null;
}

export function isEffectiveItemBaseItemsTwoDaInputAdmitted(
  input: EffectiveItemBaseItemsTwoDaInput,
): input is EffectiveItemBaseItemsTwoDaInput & {
  sourceLayer: EffectiveItemBaseItemsTwoDaSourceLayer;
} {
  return Buffer.isBuffer(input.bytes) && input.bytes.length >= 1 &&
    input.bytes.length <= MAX_EFFECTIVE_ITEM_BASE_ITEMS_TWO_DA_BYTES &&
    isBoundedString(
      input.sourceObjectKey,
      MAX_EFFECTIVE_ITEM_BASE_ITEMS_SOURCE_OBJECT_KEY_LENGTH,
    ) && isSourceLayer(input.sourceLayer);
}

export function parseEffectiveItemBaseItemsTwoDa(
  input: EffectiveItemBaseItemsTwoDaInput,
): EffectiveItemBaseItemsTwoDaTable | null {
  if (!isEffectiveItemBaseItemsTwoDaInputAdmitted(input)) return null;
  const sha256 = createHash("sha256").update(input.bytes).digest("hex");
  const table = parseAuroraTwoDaTable(input.bytes, {
    tableName: "baseitems.2da",
    profile: "effective-item-base-items-source-provenance",
    sourceObjectKey: input.sourceObjectKey,
    sourceLayer: input.sourceLayer,
    sourceHash: sha256,
  });
  if (
    table.rows.length < 1 ||
    table.rows.length > MAX_EFFECTIVE_ITEM_BASE_ITEMS_TWO_DA_ROWS ||
    table.header.filter((column) => column === "ModelType").length !== 1 ||
    table.diagnostics.some((entry) => entry.severity === "error")
  ) return null;

  const rows: EffectiveItemBaseItemRow[] = [];
  for (const row of table.rows) {
    if (row.rowId !== row.physicalRowIndex) return null;
    const nameStrRef = readOptionalUint32(readCell(row, table.header, "Name"));
    const label = readOptionalText(
      readCell(row, table.header, "label"),
      MAX_EFFECTIVE_ITEM_BASE_ITEMS_LABEL_CODE_UNITS,
    );
    const itemClass = readOptionalText(
      readCell(row, table.header, "ItemClass"),
      MAX_EFFECTIVE_ITEM_BASE_ITEMS_CLASS_CODE_UNITS,
    );
    const modelType = readModelType(readCell(row, table.header, "ModelType"));
    const invSlotWidth = readOptionalInventorySlotDimension(
      readCell(row, table.header, "InvSlotWidth"),
    );
    const invSlotHeight = readOptionalInventorySlotDimension(
      readCell(row, table.header, "InvSlotHeight"),
    );
    if (nameStrRef === null || label === null || itemClass === null || modelType === null ||
      invSlotWidth === null || invSlotHeight === null) {
      return null;
    }
    rows.push(Object.freeze({
      rowIndex: row.physicalRowIndex,
      ...(nameStrRef === undefined ? {} : { nameStrRef }),
      ...(label === undefined ? {} : { label }),
      modelType,
      ...(itemClass === undefined ? {} : { itemClass }),
      displayName: label ?? `Row ${row.physicalRowIndex}`,
      ...(invSlotWidth === undefined ? {} : { invSlotWidth }),
      ...(invSlotHeight === undefined ? {} : { invSlotHeight }),
    }));
  }
  return Object.freeze({
    descriptor: Object.freeze({
      resourceName: "baseitems.2da",
      sourceObjectKey: input.sourceObjectKey,
      sourceLayer: input.sourceLayer,
      sha256,
      sizeBytes: input.bytes.length,
      rowCount: rows.length,
    }),
    rows: Object.freeze(rows),
  });
}

export function isExactEffectiveItemBaseItemsTwoDaTable(
  value: unknown,
): value is EffectiveItemBaseItemsTwoDaTable {
  if (!isPlainRecord(value) || !hasExactKeys(value, ["descriptor", "rows"]) ||
    !isPlainRecord(value.descriptor) || !Array.isArray(value.rows)) return false;
  const descriptor = value.descriptor;
  if (!hasExactKeys(descriptor, [
    "resourceName", "sourceObjectKey", "sourceLayer", "sha256", "sizeBytes", "rowCount",
  ]) || descriptor.resourceName !== "baseitems.2da" ||
    !isBoundedString(
      descriptor.sourceObjectKey,
      MAX_EFFECTIVE_ITEM_BASE_ITEMS_SOURCE_OBJECT_KEY_LENGTH,
    ) || !isSourceLayer(descriptor.sourceLayer) ||
    typeof descriptor.sha256 !== "string" || !/^[a-f0-9]{64}$/u.test(descriptor.sha256) ||
    !Number.isSafeInteger(descriptor.sizeBytes) || Number(descriptor.sizeBytes) < 1 ||
    Number(descriptor.sizeBytes) > MAX_EFFECTIVE_ITEM_BASE_ITEMS_TWO_DA_BYTES ||
    !Number.isSafeInteger(descriptor.rowCount) || Number(descriptor.rowCount) < 1 ||
    Number(descriptor.rowCount) > MAX_EFFECTIVE_ITEM_BASE_ITEMS_TWO_DA_ROWS ||
    value.rows.length !== descriptor.rowCount) return false;
  return value.rows.every((rawRow, index) => {
    if (!isPlainRecord(rawRow)) return false;
    const allowed = [
      "rowIndex", "nameStrRef", "label", "modelType", "itemClass", "displayName",
      "invSlotWidth", "invSlotHeight",
    ];
    return !Object.keys(rawRow).some((key) => !allowed.includes(key)) &&
      rawRow.rowIndex === index && isModelType(rawRow.modelType) &&
      (rawRow.nameStrRef === undefined ||
        (Number.isSafeInteger(rawRow.nameStrRef) && Number(rawRow.nameStrRef) >= 0 &&
          Number(rawRow.nameStrRef) <= 0xffff_ffff)) &&
      (rawRow.label === undefined || isBoundedString(
        rawRow.label,
        MAX_EFFECTIVE_ITEM_BASE_ITEMS_LABEL_CODE_UNITS,
      )) &&
      (rawRow.itemClass === undefined || isBoundedString(
        rawRow.itemClass,
        MAX_EFFECTIVE_ITEM_BASE_ITEMS_CLASS_CODE_UNITS,
      )) && isBoundedString(rawRow.displayName, MAX_EFFECTIVE_ITEM_BASE_ITEMS_DISPLAY_CODE_UNITS) &&
      (rawRow.invSlotWidth === undefined ||
        (Number.isSafeInteger(rawRow.invSlotWidth) && Number(rawRow.invSlotWidth) >= 1 &&
          Number(rawRow.invSlotWidth) <=
            MAX_EFFECTIVE_ITEM_BASE_ITEMS_INVENTORY_SLOT_DIMENSION)) &&
      (rawRow.invSlotHeight === undefined ||
        (Number.isSafeInteger(rawRow.invSlotHeight) && Number(rawRow.invSlotHeight) >= 1 &&
          Number(rawRow.invSlotHeight) <=
            MAX_EFFECTIVE_ITEM_BASE_ITEMS_INVENTORY_SLOT_DIMENSION));
  });
}
