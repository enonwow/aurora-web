import type { SceneObjectPlaceableBasicIdentity } from "../contracts";

const DWORD_MAX = 0xffff_ffff;
const BYTE_MAX = 0xff;
const MAX_TABLE_BYTES = 64 * 1024 * 1024;
const MAX_TABLE_ROWS = 1_000_000;
const MAX_SOURCE_OBJECT_KEY_LENGTH = 2048;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const keys = Object.keys(value);
  return keys.length === expected.length && expected.every((key) => keys.includes(key));
}

function readTag(
  value: unknown,
): SceneObjectPlaceableBasicIdentity["tag"] | undefined {
  if (!isRecord(value) || typeof value.present !== "boolean") return undefined;
  if (!value.present) {
    return hasExactKeys(value, ["present"]) ? { present: false } : undefined;
  }
  return hasExactKeys(value, ["present", "value"]) && typeof value.value === "string"
    ? { present: true, value: value.value }
    : undefined;
}

function readAppearance(
  value: unknown,
): SceneObjectPlaceableBasicIdentity["appearance"] | undefined {
  if (!isRecord(value) || typeof value.present !== "boolean") return undefined;
  if (!value.present) {
    return hasExactKeys(value, ["present"]) ? { present: false } : undefined;
  }
  if (value.nativeType !== "dword" && value.nativeType !== "byte") return undefined;
  const hasTable = Object.prototype.hasOwnProperty.call(value, "table");
  const expectedKeys = hasTable
    ? ["present", "nativeType", "value", "table"]
    : ["present", "nativeType", "value"];
  if (!hasExactKeys(value, expectedKeys)) return undefined;
  if (value.nativeType === "byte" && hasTable) return undefined;
  if (!Number.isSafeInteger(value.value)) return undefined;
  const maximum = value.nativeType === "dword" ? DWORD_MAX : BYTE_MAX;
  if ((value.value as number) < 0 || (value.value as number) > maximum) return undefined;
  const table = hasTable ? readAppearanceTable(value.table, value.value as number) : undefined;
  if (hasTable && !table) return undefined;
  return {
    present: true,
    nativeType: value.nativeType,
    value: value.value as number,
    ...(table ? { table } : {}),
  };
}

function readAppearanceTable(
  value: unknown,
  appearanceValue: number,
): NonNullable<Extract<
  SceneObjectPlaceableBasicIdentity["appearance"],
  { present: true; nativeType: "dword" }
>["table"]> | undefined {
  if (!isRecord(value) || !hasExactKeys(value, [
    "resourceName",
    "sourceObjectKey",
    "sourceLayer",
    "sha256",
    "sizeBytes",
    "rowCount",
    "rowIndex",
  ])) return undefined;
  if (
    value.resourceName !== "placeables.2da" ||
    typeof value.sourceObjectKey !== "string" ||
    value.sourceObjectKey.length < 1 ||
    value.sourceObjectKey.length > MAX_SOURCE_OBJECT_KEY_LENGTH ||
    (value.sourceLayer !== "module" && value.sourceLayer !== "hak" && value.sourceLayer !== "vanilla") ||
    typeof value.sha256 !== "string" ||
    !/^[a-f0-9]{64}$/u.test(value.sha256) ||
    !Number.isSafeInteger(value.sizeBytes) ||
    (value.sizeBytes as number) < 1 ||
    (value.sizeBytes as number) > MAX_TABLE_BYTES ||
    !Number.isSafeInteger(value.rowCount) ||
    (value.rowCount as number) > MAX_TABLE_ROWS ||
    !Number.isSafeInteger(value.rowIndex) ||
    value.rowIndex !== appearanceValue ||
    (value.rowIndex as number) >= (value.rowCount as number)
  ) return undefined;
  return {
    resourceName: "placeables.2da",
    sourceObjectKey: value.sourceObjectKey,
    sourceLayer: value.sourceLayer,
    sha256: value.sha256,
    sizeBytes: value.sizeBytes as number,
    rowCount: value.rowCount as number,
    rowIndex: value.rowIndex as number,
  };
}

export function readPlaceableBasicIdentity(
  value: unknown,
): SceneObjectPlaceableBasicIdentity | undefined {
  if (!isRecord(value) || !hasExactKeys(value, ["tag", "appearance"])) return undefined;
  const tag = readTag(value.tag);
  const appearance = readAppearance(value.appearance);
  return tag && appearance ? { tag, appearance } : undefined;
}
