import type {
  SceneObjectItemBlueprintEquipmentEntry,
  SceneObjectItemBlueprintInventoryEntry,
} from "../contracts";

export const MAX_ITEM_BLUEPRINT_REFERENCE_COUNT = 1024;
export const ITEM_BLUEPRINT_EQUIPMENT_SLOT_MASKS = Object.freeze([
  1, 2, 4, 8, 16, 32, 64, 128, 256,
  512, 1024, 2048, 4096, 8192, 16384, 32768, 65536, 131072,
] as const);

const RESREF_PATTERN = /^[a-z0-9_]{1,16}$/u;
const INVENTORY_KEYS = Object.freeze(["resRef", "x", "y"] as const);
const EQUIPMENT_KEYS = Object.freeze(["resRef", "slotMask"] as const);
const EQUIPMENT_SLOT_SET = new Set<number>(ITEM_BLUEPRINT_EQUIPMENT_SLOT_MASKS);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype;
}

function hasExactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
): boolean {
  const actual = Object.keys(value);
  return actual.length === expected.length && expected.every((key) => actual.includes(key));
}

function readResRef(value: unknown): string | null {
  return typeof value === "string" && RESREF_PATTERN.test(value) ? value : null;
}

function readWord(value: unknown): number | null {
  return Number.isSafeInteger(value) && Number(value) >= 0 && Number(value) <= 0xffff
    ? Number(value)
    : null;
}

export function readItemBlueprintInventoryEntries(
  value: unknown,
): SceneObjectItemBlueprintInventoryEntry[] | null {
  if (!Array.isArray(value) || value.length > MAX_ITEM_BLUEPRINT_REFERENCE_COUNT) return null;
  const result: SceneObjectItemBlueprintInventoryEntry[] = [];
  for (const rawEntry of value) {
    if (!isRecord(rawEntry) || !hasExactKeys(rawEntry, INVENTORY_KEYS)) return null;
    const resRef = readResRef(rawEntry.resRef);
    const x = readWord(rawEntry.x);
    const y = readWord(rawEntry.y);
    if (resRef === null || x === null || y === null) return null;
    result.push({ resRef, x, y });
  }
  return result;
}

export function readItemBlueprintEquipmentEntries(
  value: unknown,
): SceneObjectItemBlueprintEquipmentEntry[] | null {
  if (!Array.isArray(value) || value.length > ITEM_BLUEPRINT_EQUIPMENT_SLOT_MASKS.length) {
    return null;
  }
  const result: SceneObjectItemBlueprintEquipmentEntry[] = [];
  let previousSlotMask = 0;
  for (const rawEntry of value) {
    if (!isRecord(rawEntry) || !hasExactKeys(rawEntry, EQUIPMENT_KEYS)) return null;
    const resRef = readResRef(rawEntry.resRef);
    const slotMask = Number.isSafeInteger(rawEntry.slotMask) ? Number(rawEntry.slotMask) : null;
    if (
      resRef === null || slotMask === null || !EQUIPMENT_SLOT_SET.has(slotMask) ||
      slotMask <= previousSlotMask
    ) return null;
    previousSlotMask = slotMask;
    result.push({ resRef, slotMask });
  }
  return result;
}

export function readItemBlueprintReferenceLists(
  inventoryValue: unknown,
  equipmentValue: unknown,
  targetResRef?: string,
): Readonly<{
  inventory: SceneObjectItemBlueprintInventoryEntry[];
  equipment: SceneObjectItemBlueprintEquipmentEntry[];
}> | null {
  if (targetResRef !== undefined && !RESREF_PATTERN.test(targetResRef)) return null;
  const inventory = readItemBlueprintInventoryEntries(inventoryValue);
  const equipment = readItemBlueprintEquipmentEntries(equipmentValue);
  if (!inventory || !equipment ||
      inventory.length + equipment.length > MAX_ITEM_BLUEPRINT_REFERENCE_COUNT) return null;
  if (targetResRef && [...inventory, ...equipment].some((entry) => entry.resRef === targetResRef)) {
    return null;
  }
  return { inventory, equipment };
}
