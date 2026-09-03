const MAX_TABLE_BYTES = 1024 * 1024;
const MAX_TABLE_ROWS = 256;
const MAX_SOURCE_OBJECT_KEY_CODE_UNITS = 2048;
const SHA256 = /^[a-f0-9]{64}$/u;

export interface AreaWaypointAppearanceTableProvenance {
  readonly resourceName: "waypoint.2da";
  readonly sourceObjectKey: string;
  readonly sourceLayer: "module" | "hak" | "vanilla";
  readonly sha256: string;
  readonly sizeBytes: number;
  readonly rowCount: number;
  readonly rowIndex: number;
}

export interface AreaWaypointAppearanceProvenance {
  readonly present: true;
  readonly nativeType: "byte";
  readonly value: number;
  readonly table: AreaWaypointAppearanceTableProvenance;
}

export interface AreaWaypointAppearanceStorage {
  readonly present: true;
  readonly nativeType: "byte";
  readonly value: number;
}

export interface ExistingAreaWaypointAppearanceMutation {
  readonly expectedValue: number;
  readonly value: number;
  readonly tableSha256: string;
  readonly rowCount: number;
}

const PROVENANCE_KEYS = ["present", "nativeType", "value", "table"] as const;
const TABLE_KEYS = [
  "resourceName", "sourceObjectKey", "sourceLayer", "sha256",
  "sizeBytes", "rowCount", "rowIndex",
] as const;
const MUTATION_KEYS = ["expectedValue", "value", "tableSha256", "rowCount"] as const;

export function parseAreaWaypointAppearanceProvenance(
  value: unknown,
): AreaWaypointAppearanceProvenance | null {
  if (!isRecord(value) || !hasExactKeys(value, PROVENANCE_KEYS) ||
    value.present !== true || value.nativeType !== "byte" || !isByte(value.value) ||
    !isRecord(value.table) || !hasExactKeys(value.table, TABLE_KEYS)) {
    return null;
  }
  const table = value.table;
  if (
    table.resourceName !== "waypoint.2da" ||
    typeof table.sourceObjectKey !== "string" || table.sourceObjectKey.length < 1 ||
    table.sourceObjectKey.length > MAX_SOURCE_OBJECT_KEY_CODE_UNITS ||
    (table.sourceLayer !== "module" && table.sourceLayer !== "hak" &&
      table.sourceLayer !== "vanilla") ||
    typeof table.sha256 !== "string" || !SHA256.test(table.sha256) ||
    !isIntegerBetween(table.sizeBytes, 1, MAX_TABLE_BYTES) ||
    !isIntegerBetween(table.rowCount, 1, MAX_TABLE_ROWS) ||
    !isByte(table.rowIndex) || table.rowIndex >= table.rowCount ||
    value.value !== table.rowIndex
  ) {
    return null;
  }
  return Object.freeze({
    present: true,
    nativeType: "byte",
    value: value.value,
    table: Object.freeze({
      resourceName: "waypoint.2da",
      sourceObjectKey: table.sourceObjectKey,
      sourceLayer: table.sourceLayer,
      sha256: table.sha256,
      sizeBytes: table.sizeBytes,
      rowCount: table.rowCount,
      rowIndex: table.rowIndex,
    }),
  });
}

export function parseAreaWaypointAppearanceMutation(
  value: unknown,
): ExistingAreaWaypointAppearanceMutation | null {
  if (!isRecord(value) || !hasExactKeys(value, MUTATION_KEYS) ||
    !isByte(value.expectedValue) || !isByte(value.value) ||
    value.expectedValue === value.value ||
    typeof value.tableSha256 !== "string" || !SHA256.test(value.tableSha256) ||
    !isIntegerBetween(value.rowCount, 1, MAX_TABLE_ROWS) ||
    value.expectedValue >= value.rowCount || value.value >= value.rowCount) {
    return null;
  }
  return Object.freeze({
    expectedValue: value.expectedValue,
    value: value.value,
    tableSha256: value.tableSha256,
    rowCount: value.rowCount,
  });
}

export function bindEffectiveWaypointTwoDaToAppearance(
  storage: AreaWaypointAppearanceStorage,
  descriptor: EffectiveWaypointTwoDaDescriptor | null | undefined,
  rows: readonly EffectiveWaypointTwoDaRowOption[],
): AreaWaypointAppearanceProvenance | undefined {
  if (!descriptor || !isByte(storage.value) ||
    !rows.some((row) => row.rowIndex === storage.value)) return undefined;
  return parseAreaWaypointAppearanceProvenance({
    present: true,
    nativeType: "byte",
    value: storage.value,
    table: {
      resourceName: descriptor.resourceName,
      sourceObjectKey: descriptor.sourceObjectKey,
      sourceLayer: descriptor.sourceLayer,
      sha256: descriptor.sha256,
      sizeBytes: descriptor.sizeBytes,
      rowCount: descriptor.rowCount,
      rowIndex: storage.value,
    },
  }) ?? undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && Object.getPrototypeOf(value) === Object.prototype;
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value);
  return actual.length === keys.length && keys.every((key) => actual.includes(key));
}

function isIntegerBetween(value: unknown, minimum: number, maximum: number): value is number {
  return Number.isSafeInteger(value) && (value as number) >= minimum && (value as number) <= maximum;
}

function isByte(value: unknown): value is number {
  return isIntegerBetween(value, 0, 0xff);
}
import type {
  EffectiveWaypointTwoDaDescriptor,
  EffectiveWaypointTwoDaRowOption,
} from "../../catalog/domain/effective-waypoint-two-da";
