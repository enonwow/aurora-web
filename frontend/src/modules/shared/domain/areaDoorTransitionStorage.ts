export const MAX_AREA_DOOR_LINKED_TO_CODE_UNITS = 256;

export interface AreaDoorTransitionStorage {
  readonly linkedTo: string;
  readonly linkedToFlags: number;
  readonly loadScreenId: number;
}

const EXACT_KEYS = ["linkedTo", "linkedToFlags", "loadScreenId"] as const;

export function isAreaDoorTransitionStorage(
  value: unknown,
): value is AreaDoorTransitionStorage {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record);
  if (keys.length !== EXACT_KEYS.length || EXACT_KEYS.some((key) => !keys.includes(key))) {
    return false;
  }
  return typeof record.linkedTo === "string" &&
    record.linkedTo.length <= MAX_AREA_DOOR_LINKED_TO_CODE_UNITS &&
    !record.linkedTo.includes("\0") &&
    isIntegerInRange(record.linkedToFlags, 0, 0xff) &&
    isIntegerInRange(record.loadScreenId, 0, 0xffff);
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

export function areaDoorTransitionStorageEqual(
  left: AreaDoorTransitionStorage,
  right: AreaDoorTransitionStorage,
): boolean {
  return left.linkedTo === right.linkedTo &&
    left.linkedToFlags === right.linkedToFlags &&
    left.loadScreenId === right.loadScreenId;
}

function isIntegerInRange(value: unknown, minimum: number, maximum: number): value is number {
  return typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= minimum &&
    value <= maximum;
}
