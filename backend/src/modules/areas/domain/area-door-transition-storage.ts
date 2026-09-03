export const MAX_AREA_DOOR_LINKED_TO_CODE_UNITS = 256;

export interface AreaDoorTransitionStorage {
  readonly linkedTo: string;
  readonly linkedToFlags: number;
  readonly loadScreenId: number;
}

export interface ExistingAreaDoorTransitionStorageMutation {
  readonly expectedValue: AreaDoorTransitionStorage;
  readonly value: AreaDoorTransitionStorage;
}

const STORAGE_KEYS = Object.freeze([
  "linkedTo",
  "linkedToFlags",
  "loadScreenId",
] as const);
const MUTATION_KEYS = Object.freeze(["expectedValue", "value"] as const);

export function isAreaDoorTransitionStorage(
  value: unknown,
): value is AreaDoorTransitionStorage {
  if (!isPlainRecord(value) || !hasExactKeys(value, STORAGE_KEYS)) return false;
  return typeof value.linkedTo === "string" &&
    value.linkedTo.length <= MAX_AREA_DOOR_LINKED_TO_CODE_UNITS &&
    !value.linkedTo.includes("\0") &&
    isUnsignedInteger(value.linkedToFlags, 0xff) &&
    isUnsignedInteger(value.loadScreenId, 0xffff);
}

export function areaDoorTransitionStorageEqual(left: unknown, right: unknown): boolean {
  return isAreaDoorTransitionStorage(left) &&
    isAreaDoorTransitionStorage(right) &&
    left.linkedTo === right.linkedTo &&
    left.linkedToFlags === right.linkedToFlags &&
    left.loadScreenId === right.loadScreenId;
}

export function cloneAreaDoorTransitionStorage(
  value: AreaDoorTransitionStorage,
): AreaDoorTransitionStorage {
  return Object.freeze({
    linkedTo: value.linkedTo,
    linkedToFlags: value.linkedToFlags,
    loadScreenId: value.loadScreenId,
  });
}

export function readExistingAreaDoorTransitionStorageMutation(
  value: unknown,
): ExistingAreaDoorTransitionStorageMutation | null {
  if (!isPlainRecord(value) || !hasExactKeys(value, MUTATION_KEYS) ||
      !isAreaDoorTransitionStorage(value.expectedValue) ||
      !isAreaDoorTransitionStorage(value.value) ||
      areaDoorTransitionStorageEqual(value.expectedValue, value.value)) return null;
  return Object.freeze({
    expectedValue: cloneAreaDoorTransitionStorage(value.expectedValue),
    value: cloneAreaDoorTransitionStorage(value.value),
  });
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype;
}

function hasExactKeys(
  value: Readonly<Record<string, unknown>>,
  expected: readonly string[],
): boolean {
  const keys = Object.keys(value);
  return keys.length === expected.length && expected.every((key) => keys.includes(key));
}

function isUnsignedInteger(value: unknown, maximum: number): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 0 && (value as number) <= maximum;
}
