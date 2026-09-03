import type {
  SceneObjectPlaceableBodyBagProvenance,
  ScenePlaceableBodyBagCatalog,
  ScenePlaceableBodyBagRow,
} from "../contracts";

const MAX_ROWS = 256;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null &&
    Object.getPrototypeOf(value) === Object.prototype;
}

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const keys = Object.keys(value);
  return keys.length === expected.length && expected.every((key) => keys.includes(key));
}

function isIntegerBetween(value: unknown, min: number, max: number): value is number {
  return Number.isSafeInteger(value) && Number(value) >= min && Number(value) <= max;
}

function readRow(value: unknown, index: number): ScenePlaceableBodyBagRow | null {
  if (!isRecord(value)) return null;
  const allowed = ["rowIndex", "label", "nameStrRef", "displayName", "displaySource"];
  if (Object.keys(value).some((key) => !allowed.includes(key)) ||
    value.rowIndex !== index ||
    !isIntegerBetween(value.nameStrRef, 0, 0xffff_ffff) ||
    (value.label !== undefined && (typeof value.label !== "string" || value.label.length < 1 ||
      value.label.length > 256 || value.label.includes("\0"))) ||
    typeof value.displayName !== "string" || value.displayName.length < 1 ||
    value.displayName.length > 1024 || value.displayName.includes("\0") ||
    (value.displaySource !== "strref" && value.displaySource !== "label" &&
      value.displaySource !== "row_index")) {
    return null;
  }
  return Object.freeze({
    rowIndex: index,
    ...(value.label === undefined ? {} : { label: value.label }),
    nameStrRef: value.nameStrRef,
    displayName: value.displayName,
    displaySource: value.displaySource,
  });
}

export function readPlaceableBodyBagCatalog(value: unknown): ScenePlaceableBodyBagCatalog | null {
  if (!isRecord(value) || !hasExactKeys(value, ["descriptor", "rows"]) ||
    !isRecord(value.descriptor) || !Array.isArray(value.rows)) return null;
  const descriptor = value.descriptor;
  if (!hasExactKeys(descriptor, [
    "resourceName", "sourceObjectKey", "sourceLayer", "sha256", "sizeBytes", "rowCount",
  ]) || descriptor.resourceName !== "bodybag.2da" ||
    typeof descriptor.sourceObjectKey !== "string" || descriptor.sourceObjectKey.length < 1 ||
    descriptor.sourceObjectKey.length > 2048 ||
    (descriptor.sourceLayer !== "module" && descriptor.sourceLayer !== "hak" &&
      descriptor.sourceLayer !== "vanilla") ||
    typeof descriptor.sha256 !== "string" || !/^[a-f0-9]{64}$/u.test(descriptor.sha256) ||
    !isIntegerBetween(descriptor.sizeBytes, 1, 16 * 1024 * 1024) ||
    !isIntegerBetween(descriptor.rowCount, 1, MAX_ROWS) ||
    value.rows.length !== descriptor.rowCount) return null;
  const rows = value.rows.map(readRow);
  if (rows.some((row) => row === null)) return null;
  return Object.freeze({
    descriptor: Object.freeze({
      resourceName: "bodybag.2da",
      sourceObjectKey: descriptor.sourceObjectKey,
      sourceLayer: descriptor.sourceLayer,
      sha256: descriptor.sha256,
      sizeBytes: descriptor.sizeBytes,
      rowCount: descriptor.rowCount,
    }),
    rows: Object.freeze(rows as ScenePlaceableBodyBagRow[]),
  });
}

export function readPlaceableBodyBagProvenance(
  value: unknown,
): SceneObjectPlaceableBodyBagProvenance | null {
  if (!isRecord(value) || !hasExactKeys(value, [
    "expectedValue", "tableSha256", "tableRowCount",
  ]) || !isIntegerBetween(value.expectedValue, 0, 0xff) ||
    typeof value.tableSha256 !== "string" || !/^[a-f0-9]{64}$/u.test(value.tableSha256) ||
    !isIntegerBetween(value.tableRowCount, 1, MAX_ROWS) ||
    value.expectedValue >= value.tableRowCount) return null;
  return Object.freeze({
    expectedValue: value.expectedValue,
    tableSha256: value.tableSha256,
    tableRowCount: value.tableRowCount,
  });
}

export function readPlaceableBodyBagBinding(
  storage: unknown,
  catalog: ScenePlaceableBodyBagCatalog | null | undefined,
): SceneObjectPlaceableBodyBagProvenance | null {
  if (!catalog || !isRecord(storage) ||
    !hasExactKeys(storage, ["present", "nativeType", "value"]) ||
    storage.present !== true || storage.nativeType !== "byte" ||
    !isIntegerBetween(storage.value, 0, 0xff) ||
    catalog.rows[storage.value]?.rowIndex !== storage.value) return null;
  return readPlaceableBodyBagProvenance({
    expectedValue: storage.value,
    tableSha256: catalog.descriptor.sha256,
    tableRowCount: catalog.descriptor.rowCount,
  });
}
