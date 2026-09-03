import {
  isExactEffectiveItemBaseItemsTwoDaTable,
  MAX_EFFECTIVE_ITEM_BASE_ITEMS_TWO_DA_ROWS,
  type EffectiveItemBaseItemsTwoDaTable,
} from "../../catalog/domain/effective-item-base-items-two-da";

export const AREA_STORE_RESTRICTION_ENTRY_STRUCT_TYPE_ID = 0x0001_7e4d as const;
export const MAX_AREA_STORE_RESTRICTION_ENTRIES = 4_096;

const INT32_MAX = 0x7fff_ffff;
const MAX_OPAQUE_SIBLING_FIELDS = 65_535;
const RAW_LIST_KEYS = [
  "present",
  "nativeType",
  "entryStructTypeId",
  "baseItemNativeType",
  "baseItemIds",
  "opaqueSiblingFieldCounts",
] as const;

export type AreaStoreRestrictionRawListStorage =
  | Readonly<{ present: false }>
  | Readonly<{
      present: true;
      nativeType: "list";
      entryStructTypeId: typeof AREA_STORE_RESTRICTION_ENTRY_STRUCT_TYPE_ID;
      baseItemNativeType: "int";
      baseItemIds: readonly number[];
      opaqueSiblingFieldCounts: readonly number[];
    }>;

export interface AreaStoreRestrictionsRawStorage {
  readonly willNotBuy: AreaStoreRestrictionRawListStorage;
  readonly willOnlyBuy: AreaStoreRestrictionRawListStorage;
}

export interface AreaStoreRestrictionExpectedList {
  readonly present: boolean;
  readonly baseItemIds: readonly number[];
}

export interface AreaStoreRestrictionsExpectedValue {
  readonly willNotBuy: AreaStoreRestrictionExpectedList;
  readonly willOnlyBuy: AreaStoreRestrictionExpectedList;
}

export interface AreaStoreRestrictionsTarget {
  readonly willNotBuy: readonly number[];
  readonly willOnlyBuy: readonly number[];
}

export interface ExistingAreaStoreRestrictionsProvenance {
  readonly expectedValue: AreaStoreRestrictionsExpectedValue;
  readonly tableSha256: string;
  readonly tableRowCount: number;
}

export interface ExistingAreaStoreRestrictionsMutation
  extends ExistingAreaStoreRestrictionsProvenance {
  readonly value: AreaStoreRestrictionsTarget;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype;
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value);
  return actual.length === keys.length && keys.every((key) => actual.includes(key));
}

function readBaseItemIds(value: unknown, maximumLength: number): readonly number[] | null {
  if (!Array.isArray(value) || value.length > maximumLength || value.some((entry) =>
    !Number.isSafeInteger(entry) || Number(entry) < 0 || Number(entry) > INT32_MAX)) return null;
  return Object.freeze(value.map(Number));
}

function readOpaqueSiblingFieldCounts(
  value: unknown,
  expectedLength: number,
): readonly number[] | null {
  if (!Array.isArray(value) || value.length !== expectedLength || value.some((entry) =>
    !Number.isSafeInteger(entry) || Number(entry) < 0 ||
    Number(entry) > MAX_OPAQUE_SIBLING_FIELDS || Number(entry) !== 0)) return null;
  return Object.freeze(value.map(Number));
}

function readRawList(value: unknown): AreaStoreRestrictionRawListStorage | null {
  if (!isPlainRecord(value)) return null;
  if (hasExactKeys(value, ["present"]) && value.present === false) {
    return Object.freeze({ present: false });
  }
  if (!hasExactKeys(value, RAW_LIST_KEYS) || value.present !== true ||
    value.nativeType !== "list" ||
    value.entryStructTypeId !== AREA_STORE_RESTRICTION_ENTRY_STRUCT_TYPE_ID ||
    value.baseItemNativeType !== "int") return null;
  const baseItemIds = readBaseItemIds(value.baseItemIds, MAX_AREA_STORE_RESTRICTION_ENTRIES);
  if (!baseItemIds) return null;
  const opaqueSiblingFieldCounts = readOpaqueSiblingFieldCounts(
    value.opaqueSiblingFieldCounts,
    baseItemIds.length,
  );
  return opaqueSiblingFieldCounts ? Object.freeze({
    present: true,
    nativeType: "list",
    entryStructTypeId: AREA_STORE_RESTRICTION_ENTRY_STRUCT_TYPE_ID,
    baseItemNativeType: "int",
    baseItemIds,
    opaqueSiblingFieldCounts,
  }) : null;
}

export function readAreaStoreRestrictionsRawStorage(
  value: unknown,
): AreaStoreRestrictionsRawStorage | null {
  if (!isPlainRecord(value) || !hasExactKeys(value, ["willNotBuy", "willOnlyBuy"])) {
    return null;
  }
  const willNotBuy = readRawList(value.willNotBuy);
  const willOnlyBuy = readRawList(value.willOnlyBuy);
  if (!willNotBuy || !willOnlyBuy) return null;
  const count = (willNotBuy.present ? willNotBuy.baseItemIds.length : 0) +
    (willOnlyBuy.present ? willOnlyBuy.baseItemIds.length : 0);
  return count <= MAX_AREA_STORE_RESTRICTION_ENTRIES
    ? Object.freeze({ willNotBuy, willOnlyBuy })
    : null;
}

function expectedListFromRaw(
  value: AreaStoreRestrictionRawListStorage,
): AreaStoreRestrictionExpectedList {
  return Object.freeze({
    present: value.present,
    baseItemIds: Object.freeze(value.present ? [...value.baseItemIds] : []),
  });
}

function readExpectedList(value: unknown): AreaStoreRestrictionExpectedList | null {
  if (!isPlainRecord(value) || !hasExactKeys(value, ["present", "baseItemIds"]) ||
    typeof value.present !== "boolean") return null;
  const baseItemIds = readBaseItemIds(value.baseItemIds, MAX_AREA_STORE_RESTRICTION_ENTRIES);
  if (!baseItemIds || (!value.present && baseItemIds.length !== 0)) return null;
  return Object.freeze({ present: value.present, baseItemIds });
}

function readExpectedValue(value: unknown): AreaStoreRestrictionsExpectedValue | null {
  if (!isPlainRecord(value) || !hasExactKeys(value, ["willNotBuy", "willOnlyBuy"])) {
    return null;
  }
  const willNotBuy = readExpectedList(value.willNotBuy);
  const willOnlyBuy = readExpectedList(value.willOnlyBuy);
  if (!willNotBuy || !willOnlyBuy ||
    willNotBuy.baseItemIds.length + willOnlyBuy.baseItemIds.length >
      MAX_AREA_STORE_RESTRICTION_ENTRIES) return null;
  return Object.freeze({ willNotBuy, willOnlyBuy });
}

export function readAreaStoreRestrictionsTarget(
  value: unknown,
  rowCount: number,
): AreaStoreRestrictionsTarget | null {
  if (!isPlainRecord(value) || !hasExactKeys(value, ["willNotBuy", "willOnlyBuy"])) {
    return null;
  }
  const willNotBuy = readBaseItemIds(value.willNotBuy, MAX_AREA_STORE_RESTRICTION_ENTRIES);
  const willOnlyBuy = readBaseItemIds(value.willOnlyBuy, MAX_AREA_STORE_RESTRICTION_ENTRIES);
  if (!willNotBuy || !willOnlyBuy ||
    willNotBuy.length + willOnlyBuy.length > MAX_AREA_STORE_RESTRICTION_ENTRIES ||
    [...willNotBuy, ...willOnlyBuy].some((baseItemId) => baseItemId >= rowCount)) return null;
  return Object.freeze({ willNotBuy, willOnlyBuy });
}

function expectedTarget(value: AreaStoreRestrictionsExpectedValue): AreaStoreRestrictionsTarget {
  return Object.freeze({
    willNotBuy: Object.freeze([...value.willNotBuy.baseItemIds]),
    willOnlyBuy: Object.freeze([...value.willOnlyBuy.baseItemIds]),
  });
}

function listEqual(left: readonly number[], right: readonly number[]): boolean {
  return left.length === right.length && left.every((entry, index) => entry === right[index]);
}

export function areaStoreRestrictionTargetsEqual(
  left: AreaStoreRestrictionsTarget,
  right: AreaStoreRestrictionsTarget,
): boolean {
  return listEqual(left.willNotBuy, right.willNotBuy) &&
    listEqual(left.willOnlyBuy, right.willOnlyBuy);
}

export function bindEffectiveBaseItemsTwoDaToStoreRestrictions(
  rawInput: unknown,
  tableInput: unknown,
): ExistingAreaStoreRestrictionsProvenance | null {
  const raw = readAreaStoreRestrictionsRawStorage(rawInput);
  if (!raw || !isExactEffectiveItemBaseItemsTwoDaTable(tableInput)) return null;
  const table: EffectiveItemBaseItemsTwoDaTable = tableInput;
  const expectedValue = Object.freeze({
    willNotBuy: expectedListFromRaw(raw.willNotBuy),
    willOnlyBuy: expectedListFromRaw(raw.willOnlyBuy),
  });
  const ids = [
    ...expectedValue.willNotBuy.baseItemIds,
    ...expectedValue.willOnlyBuy.baseItemIds,
  ];
  if (ids.some((baseItemId) => table.rows[baseItemId]?.rowIndex !== baseItemId)) return null;
  return Object.freeze({
    expectedValue,
    tableSha256: table.descriptor.sha256,
    tableRowCount: table.descriptor.rowCount,
  });
}

export function readExistingAreaStoreRestrictionsProvenance(
  value: unknown,
): ExistingAreaStoreRestrictionsProvenance | null {
  if (!isPlainRecord(value) || !hasExactKeys(value, [
    "expectedValue", "tableSha256", "tableRowCount",
  ]) || typeof value.tableSha256 !== "string" ||
    !/^[a-f0-9]{64}$/u.test(value.tableSha256) ||
    !Number.isSafeInteger(value.tableRowCount) || Number(value.tableRowCount) < 1 ||
    Number(value.tableRowCount) > MAX_EFFECTIVE_ITEM_BASE_ITEMS_TWO_DA_ROWS) return null;
  const expectedValue = readExpectedValue(value.expectedValue);
  const tableRowCount = Number(value.tableRowCount);
  if (!expectedValue || [
    ...expectedValue.willNotBuy.baseItemIds,
    ...expectedValue.willOnlyBuy.baseItemIds,
  ].some((baseItemId) => baseItemId >= tableRowCount)) return null;
  return Object.freeze({
    expectedValue,
    tableSha256: value.tableSha256,
    tableRowCount,
  });
}

export function cloneAreaStoreRestrictionsProvenance(
  value: ExistingAreaStoreRestrictionsProvenance,
): ExistingAreaStoreRestrictionsProvenance {
  return Object.freeze({
    expectedValue: Object.freeze({
      willNotBuy: Object.freeze({
        present: value.expectedValue.willNotBuy.present,
        baseItemIds: Object.freeze([...value.expectedValue.willNotBuy.baseItemIds]),
      }),
      willOnlyBuy: Object.freeze({
        present: value.expectedValue.willOnlyBuy.present,
        baseItemIds: Object.freeze([...value.expectedValue.willOnlyBuy.baseItemIds]),
      }),
    }),
    tableSha256: value.tableSha256,
    tableRowCount: value.tableRowCount,
  });
}

export function readExistingAreaStoreRestrictionsMutation(
  value: unknown,
): ExistingAreaStoreRestrictionsMutation | null {
  if (!isPlainRecord(value) || !hasExactKeys(value, [
    "expectedValue", "value", "tableSha256", "tableRowCount",
  ])) return null;
  const provenance = readExistingAreaStoreRestrictionsProvenance({
    expectedValue: value.expectedValue,
    tableSha256: value.tableSha256,
    tableRowCount: value.tableRowCount,
  });
  if (!provenance) return null;
  const target = readAreaStoreRestrictionsTarget(value.value, provenance.tableRowCount);
  if (!target || areaStoreRestrictionTargetsEqual(expectedTarget(provenance.expectedValue), target)) {
    return null;
  }
  return Object.freeze({ ...provenance, value: target });
}

export function materializeAreaStoreRestrictionTargetStorage(
  expectedValue: AreaStoreRestrictionsExpectedValue,
  target: AreaStoreRestrictionsTarget,
): AreaStoreRestrictionsExpectedValue {
  return Object.freeze({
    willNotBuy: Object.freeze({
      present: expectedValue.willNotBuy.present || target.willNotBuy.length > 0,
      baseItemIds: Object.freeze([...target.willNotBuy]),
    }),
    willOnlyBuy: Object.freeze({
      present: expectedValue.willOnlyBuy.present || target.willOnlyBuy.length > 0,
      baseItemIds: Object.freeze([...target.willOnlyBuy]),
    }),
  });
}

export function areaStoreRestrictionsRawMatchesExpected(
  rawInput: unknown,
  expectedInput: unknown,
): boolean {
  const raw = readAreaStoreRestrictionsRawStorage(rawInput);
  const expected = readExpectedValue(expectedInput);
  return raw !== null && expected !== null &&
    raw.willNotBuy.present === expected.willNotBuy.present &&
    raw.willOnlyBuy.present === expected.willOnlyBuy.present &&
    listEqual(
      raw.willNotBuy.present ? raw.willNotBuy.baseItemIds : [],
      expected.willNotBuy.baseItemIds,
    ) && listEqual(
      raw.willOnlyBuy.present ? raw.willOnlyBuy.baseItemIds : [],
      expected.willOnlyBuy.baseItemIds,
    );
}
