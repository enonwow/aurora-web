import type {
  SceneObjectPlaceablePortraitProvenance,
  ScenePlaceablePortraitCatalog,
  ScenePlaceablePortraitRow,
} from "../contracts";

const MAX_ROWS = 65_536;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype;
}

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const keys = Object.keys(value);
  return keys.length === expected.length && expected.every((key) => keys.includes(key));
}

function isIntegerBetween(value: unknown, min: number, max: number): value is number {
  return Number.isSafeInteger(value) && Number(value) >= min && Number(value) <= max;
}

function isBaseResRef(value: unknown): value is string {
  return typeof value === "string" && /^[a-z0-9_]{1,16}$/u.test(value);
}

export function readPlaceablePortraitCatalog(value: unknown): ScenePlaceablePortraitCatalog | null {
  if (!isRecord(value) || !hasExactKeys(value, ["descriptor", "rows"]) ||
    !isRecord(value.descriptor) || !Array.isArray(value.rows)) return null;
  const descriptor = value.descriptor;
  if (!hasExactKeys(descriptor, [
    "resourceName", "sourceObjectKey", "sourceLayer", "sha256", "sizeBytes", "rowCount",
  ]) || descriptor.resourceName !== "portraits.2da" ||
    typeof descriptor.sourceObjectKey !== "string" || descriptor.sourceObjectKey.length < 1 ||
    descriptor.sourceObjectKey.length > 2048 ||
    (descriptor.sourceLayer !== "module" && descriptor.sourceLayer !== "hak" &&
      descriptor.sourceLayer !== "vanilla") ||
    typeof descriptor.sha256 !== "string" || !/^[a-f0-9]{64}$/u.test(descriptor.sha256) ||
    !isIntegerBetween(descriptor.sizeBytes, 1, 16 * 1024 * 1024) ||
    !isIntegerBetween(descriptor.rowCount, 1, MAX_ROWS) ||
    value.rows.length < 1 || value.rows.length > descriptor.rowCount) return null;

  const rows: ScenePlaceablePortraitRow[] = [];
  let previousRowIndex = -1;
  for (const candidate of value.rows) {
    if (!isRecord(candidate) || !hasExactKeys(candidate, ["rowIndex", "baseResRef"]) ||
      !isIntegerBetween(candidate.rowIndex, 0, descriptor.rowCount - 1) ||
      candidate.rowIndex <= previousRowIndex || !isBaseResRef(candidate.baseResRef)) return null;
    previousRowIndex = candidate.rowIndex;
    rows.push(Object.freeze({
      rowIndex: candidate.rowIndex,
      baseResRef: candidate.baseResRef,
    }));
  }
  return Object.freeze({
    descriptor: Object.freeze({
      resourceName: "portraits.2da",
      sourceObjectKey: descriptor.sourceObjectKey,
      sourceLayer: descriptor.sourceLayer,
      sha256: descriptor.sha256,
      sizeBytes: descriptor.sizeBytes,
      rowCount: descriptor.rowCount,
    }),
    rows: Object.freeze(rows),
  });
}

export function readPlaceablePortraitProvenance(
  value: unknown,
): SceneObjectPlaceablePortraitProvenance | null {
  if (!isRecord(value) || !hasExactKeys(value, [
    "expectedValue", "tableSha256", "tableRowCount",
  ]) || !isIntegerBetween(value.expectedValue, 0, 0xffff) ||
    typeof value.tableSha256 !== "string" || !/^[a-f0-9]{64}$/u.test(value.tableSha256) ||
    !isIntegerBetween(value.tableRowCount, 1, MAX_ROWS) ||
    value.expectedValue >= value.tableRowCount) return null;
  return Object.freeze({
    expectedValue: value.expectedValue,
    tableSha256: value.tableSha256,
    tableRowCount: value.tableRowCount,
  });
}

export function readPlaceablePortraitBinding(
  storage: unknown,
  catalog: ScenePlaceablePortraitCatalog | null | undefined,
): SceneObjectPlaceablePortraitProvenance | null {
  if (!catalog || !isRecord(storage) ||
    !hasExactKeys(storage, ["present", "nativeType", "value"]) ||
    storage.present !== true || storage.nativeType !== "word" ||
    !isIntegerBetween(storage.value, 0, 0xffff) ||
    !catalog.rows.some((row) => row.rowIndex === storage.value)) return null;
  return readPlaceablePortraitProvenance({
    expectedValue: storage.value,
    tableSha256: catalog.descriptor.sha256,
    tableRowCount: catalog.descriptor.rowCount,
  });
}
