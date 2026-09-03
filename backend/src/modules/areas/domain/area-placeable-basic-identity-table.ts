import type {
  AreaPlaceableBasicIdentity,
  AreaPlaceableBasicIdentityTable,
} from "./area.types";

const MAX_TABLE_BYTES = 64 * 1024 * 1024;
const MAX_TABLE_ROWS = 1_000_000;
const MAX_SOURCE_OBJECT_KEY_LENGTH = 2048;
const TABLE_KEYS = [
  "resourceName",
  "sourceObjectKey",
  "sourceLayer",
  "sha256",
  "sizeBytes",
  "rowCount",
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null &&
    Object.getPrototypeOf(value) === Object.prototype;
}

function hasExactTableKeys(value: Record<string, unknown>): boolean {
  const keys = Object.keys(value);
  return keys.length === TABLE_KEYS.length && TABLE_KEYS.every((key) => keys.includes(key));
}

function readTableDescriptor(value: unknown): Omit<AreaPlaceableBasicIdentityTable, "rowIndex"> | null {
  if (!isRecord(value) || !hasExactTableKeys(value)) {
    return null;
  }
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
    (value.rowCount as number) > MAX_TABLE_ROWS
  ) {
    return null;
  }
  return {
    resourceName: "placeables.2da",
    sourceObjectKey: value.sourceObjectKey,
    sourceLayer: value.sourceLayer,
    sha256: value.sha256,
    sizeBytes: value.sizeBytes as number,
    rowCount: value.rowCount as number,
  };
}

export function bindEffectivePlaceablesTwoDaToBasicIdentity(
  identity: AreaPlaceableBasicIdentity,
  descriptor: unknown,
): AreaPlaceableBasicIdentity {
  const appearance = identity.appearance;
  if (
    !appearance.present ||
    appearance.nativeType !== "dword" ||
    !Number.isSafeInteger(appearance.value) ||
    appearance.value < 0
  ) {
    return identity;
  }
  const table = readTableDescriptor(descriptor);
  if (!table || appearance.value >= table.rowCount) {
    return identity;
  }
  return {
    tag: { ...identity.tag },
    appearance: {
      ...appearance,
      table: {
        ...table,
        rowIndex: appearance.value,
      },
    },
  };
}
