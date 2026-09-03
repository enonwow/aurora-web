import type { SceneItemBaseItemCatalog } from "../contracts";
import { readItemBaseItemCatalog } from "./itemBaseAppearance";

export const MAX_AREA_STORE_RESTRICTION_ENTRIES = 4_096;

const SIGNED_INT_MAX = 0x7fff_ffff;
const MAX_CATALOG_ROWS = 4_096;

export interface AreaStoreRestrictionExpectedList {
  readonly present: boolean;
  readonly baseItemIds: readonly number[];
}

export interface AreaStoreRestrictionsExpectedValue {
  readonly willNotBuy: AreaStoreRestrictionExpectedList;
  readonly willOnlyBuy: AreaStoreRestrictionExpectedList;
}

export interface AreaStoreRestrictionsProvenance {
  readonly expectedValue: AreaStoreRestrictionsExpectedValue;
  readonly tableSha256: string;
  readonly tableRowCount: number;
}

export interface AreaStoreRestrictionsTarget {
  readonly willNotBuy: readonly number[];
  readonly willOnlyBuy: readonly number[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype;
}

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const keys = Object.keys(value);
  return keys.length === expected.length && expected.every((key) => keys.includes(key));
}

function isIntegerBetween(value: unknown, minimum: number, maximum: number): value is number {
  return Number.isSafeInteger(value) && Number(value) >= minimum && Number(value) <= maximum;
}

function readBaseItemIds(value: unknown, maximumLength: number): readonly number[] | null {
  if (!Array.isArray(value) || value.length > maximumLength || value.some((entry) =>
    !isIntegerBetween(entry, 0, SIGNED_INT_MAX))) return null;
  return Object.freeze(value.map(Number));
}

function readExpectedList(value: unknown): AreaStoreRestrictionExpectedList | null {
  if (!isRecord(value) || !hasExactKeys(value, ["present", "baseItemIds"]) ||
    typeof value.present !== "boolean") return null;
  const baseItemIds = readBaseItemIds(value.baseItemIds, MAX_AREA_STORE_RESTRICTION_ENTRIES);
  if (!baseItemIds || (!value.present && baseItemIds.length !== 0)) return null;
  return Object.freeze({ present: value.present, baseItemIds });
}

export function readStoreRestrictionsProvenance(
  value: unknown,
): AreaStoreRestrictionsProvenance | null {
  if (!isRecord(value) || !hasExactKeys(value, [
    "expectedValue", "tableSha256", "tableRowCount",
  ]) || !isRecord(value.expectedValue) ||
    !hasExactKeys(value.expectedValue, ["willNotBuy", "willOnlyBuy"]) ||
    typeof value.tableSha256 !== "string" ||
    !/^[a-f0-9]{64}$/u.test(value.tableSha256) ||
    !isIntegerBetween(value.tableRowCount, 1, MAX_CATALOG_ROWS)) return null;
  const willNotBuy = readExpectedList(value.expectedValue.willNotBuy);
  const willOnlyBuy = readExpectedList(value.expectedValue.willOnlyBuy);
  if (!willNotBuy || !willOnlyBuy ||
    willNotBuy.baseItemIds.length + willOnlyBuy.baseItemIds.length >
      MAX_AREA_STORE_RESTRICTION_ENTRIES ||
    [...willNotBuy.baseItemIds, ...willOnlyBuy.baseItemIds].some((baseItemId) =>
      baseItemId >= Number(value.tableRowCount))) return null;
  return Object.freeze({
    expectedValue: Object.freeze({ willNotBuy, willOnlyBuy }),
    tableSha256: value.tableSha256,
    tableRowCount: Number(value.tableRowCount),
  });
}

export function readStoreRestrictionsTarget(
  value: unknown,
  rowCount: number,
): AreaStoreRestrictionsTarget | null {
  if (!isIntegerBetween(rowCount, 1, MAX_CATALOG_ROWS) || !isRecord(value) ||
    !hasExactKeys(value, ["willNotBuy", "willOnlyBuy"])) return null;
  const willNotBuy = readBaseItemIds(value.willNotBuy, MAX_AREA_STORE_RESTRICTION_ENTRIES);
  const willOnlyBuy = readBaseItemIds(value.willOnlyBuy, MAX_AREA_STORE_RESTRICTION_ENTRIES);
  if (!willNotBuy || !willOnlyBuy ||
    willNotBuy.length + willOnlyBuy.length > MAX_AREA_STORE_RESTRICTION_ENTRIES ||
    [...willNotBuy, ...willOnlyBuy].some((baseItemId) => baseItemId >= rowCount)) return null;
  return Object.freeze({ willNotBuy, willOnlyBuy });
}

export function bindStoreRestrictionsProvenanceToCatalog(
  provenanceInput: unknown,
  catalogInput: unknown,
): AreaStoreRestrictionsProvenance | null {
  const provenance = readStoreRestrictionsProvenance(provenanceInput);
  const catalog: SceneItemBaseItemCatalog | null = readItemBaseItemCatalog(catalogInput);
  if (!provenance || !catalog ||
    catalog.descriptor.sha256 !== provenance.tableSha256 ||
    catalog.descriptor.rowCount !== provenance.tableRowCount) return null;
  const ids = [
    ...provenance.expectedValue.willNotBuy.baseItemIds,
    ...provenance.expectedValue.willOnlyBuy.baseItemIds,
  ];
  return ids.every((baseItemId) => catalog.rows[baseItemId]?.rowIndex === baseItemId)
    ? provenance
    : null;
}

export function cloneStoreRestrictionsProvenance(
  value: AreaStoreRestrictionsProvenance,
): AreaStoreRestrictionsProvenance {
  return readStoreRestrictionsProvenance(value)!;
}

export function cloneStoreRestrictionsTarget(
  value: AreaStoreRestrictionsTarget,
): AreaStoreRestrictionsTarget {
  const maximumId = Math.max(-1, ...value.willNotBuy, ...value.willOnlyBuy);
  return readStoreRestrictionsTarget(value, Math.max(1, maximumId + 1))!;
}

function listsEqual(left: readonly number[], right: readonly number[]): boolean {
  return left.length === right.length && left.every((entry, index) => entry === right[index]);
}

export function areaStoreRestrictionTargetsEqual(
  left: AreaStoreRestrictionsTarget,
  right: AreaStoreRestrictionsTarget,
): boolean {
  return listsEqual(left.willNotBuy, right.willNotBuy) &&
    listsEqual(left.willOnlyBuy, right.willOnlyBuy);
}
