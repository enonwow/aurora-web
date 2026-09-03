import type {
  SceneObjectCreatureEquipmentSourceEntry,
  SceneObjectCreatureEquipmentTargetEntry,
  SceneObjectSourceMetadata
} from "../contracts";

export const CREATURE_EQUIPMENT_SLOT_MASKS = Object.freeze([
  0x1,
  0x2,
  0x4,
  0x8,
  0x10,
  0x20,
  0x40,
  0x80,
  0x100,
  0x200,
  0x400,
  0x800,
  0x1000,
  0x2000,
  0x4000,
  0x8000,
  0x10000,
  0x20000
] as const);

export const CREATURE_EQUIPMENT_ENTRY_MAX = CREATURE_EQUIPMENT_SLOT_MASKS.length;
export const CREATURE_EQUIPMENT_SOURCE_PAYLOAD_MAX_UNITS = 64 * 1024;

const SLOT_MASKS = new Set<number>(CREATURE_EQUIPMENT_SLOT_MASKS);
const SOURCE_KEYS = new Set([
  "sourceIndex",
  "resRef",
  "slotMask",
  "dropable",
  "pickpocketable"
]);
const RESREF_PATTERN = /^[A-Za-z0-9_]{1,16}$/u;

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Readonly<Record<string, unknown>>): boolean {
  const keys = Object.keys(value);
  return keys.length === SOURCE_KEYS.size && keys.every((key) => SOURCE_KEYS.has(key));
}

function readSourceArray(
  value: unknown,
  expectedCount: number
): readonly SceneObjectCreatureEquipmentSourceEntry[] | undefined {
  if (
    !Array.isArray(value) ||
    value.length !== expectedCount ||
    value.length > CREATURE_EQUIPMENT_ENTRY_MAX
  ) {
    return undefined;
  }
  const usedSlotMasks = new Set<number>();
  const entries: SceneObjectCreatureEquipmentSourceEntry[] = [];
  for (const candidate of value) {
    if (
      !isRecord(candidate) ||
      !hasExactKeys(candidate) ||
      candidate.sourceIndex !== entries.length ||
      typeof candidate.resRef !== "string" ||
      !RESREF_PATTERN.test(candidate.resRef) ||
      !Number.isSafeInteger(candidate.slotMask) ||
      !SLOT_MASKS.has(Number(candidate.slotMask)) ||
      usedSlotMasks.has(Number(candidate.slotMask)) ||
      typeof candidate.dropable !== "boolean" ||
      typeof candidate.pickpocketable !== "boolean"
    ) {
      return undefined;
    }
    const slotMask = Number(candidate.slotMask);
    usedSlotMasks.add(slotMask);
    entries.push(Object.freeze({
      sourceIndex: entries.length,
      resRef: candidate.resRef,
      slotMask,
      dropable: candidate.dropable,
      pickpocketable: candidate.pickpocketable
    }));
  }
  return Object.freeze(entries);
}

export function readCreatureEquipmentSourceEntries(
  payload: unknown,
  count: unknown
): readonly SceneObjectCreatureEquipmentSourceEntry[] | undefined {
  if (
    typeof payload !== "string" ||
    payload.length > CREATURE_EQUIPMENT_SOURCE_PAYLOAD_MAX_UNITS ||
    !Number.isSafeInteger(count) ||
    Number(count) < 0 ||
    Number(count) > CREATURE_EQUIPMENT_ENTRY_MAX
  ) {
    return undefined;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(payload);
  } catch {
    return undefined;
  }
  return readSourceArray(parsed, Number(count));
}

export function readCreatureEquipmentTargetEntries(
  value: unknown,
  sourceEntries: readonly SceneObjectCreatureEquipmentSourceEntry[]
): readonly SceneObjectCreatureEquipmentTargetEntry[] | undefined {
  const source = readSourceArray(sourceEntries, sourceEntries.length);
  if (!source || !Array.isArray(value) || value.length > CREATURE_EQUIPMENT_ENTRY_MAX) {
    return undefined;
  }
  const usedSourceIndices = new Set<number>();
  let previousSlotMask = 0;
  const entries: SceneObjectCreatureEquipmentTargetEntry[] = [];
  for (const candidate of value) {
    if (
      !isRecord(candidate) ||
      !hasExactKeys(candidate) ||
      !Number.isSafeInteger(candidate.sourceIndex) ||
      Number(candidate.sourceIndex) < 0 ||
      usedSourceIndices.has(Number(candidate.sourceIndex)) ||
      typeof candidate.resRef !== "string" ||
      !RESREF_PATTERN.test(candidate.resRef) ||
      !Number.isSafeInteger(candidate.slotMask) ||
      !SLOT_MASKS.has(Number(candidate.slotMask)) ||
      typeof candidate.dropable !== "boolean" ||
      typeof candidate.pickpocketable !== "boolean"
    ) {
      return undefined;
    }
    const sourceIndex = Number(candidate.sourceIndex);
    const sourceEntry = source[sourceIndex];
    const slotMask = Number(candidate.slotMask);
    if (
      !sourceEntry ||
      candidate.resRef !== sourceEntry.resRef ||
      slotMask !== sourceEntry.slotMask ||
      slotMask <= previousSlotMask
    ) {
      return undefined;
    }
    usedSourceIndices.add(sourceIndex);
    previousSlotMask = slotMask;
    entries.push(Object.freeze({
      sourceIndex,
      resRef: candidate.resRef,
      slotMask,
      dropable: candidate.dropable,
      pickpocketable: candidate.pickpocketable
    }));
  }
  return Object.freeze(entries);
}

export function sortCreatureEquipmentTargetEntries(
  sourceEntries: readonly SceneObjectCreatureEquipmentSourceEntry[]
): readonly SceneObjectCreatureEquipmentTargetEntry[] | undefined {
  const source = readSourceArray(sourceEntries, sourceEntries.length);
  if (!source) return undefined;
  return Object.freeze(
    [...source]
      .sort((left, right) => left.slotMask - right.slotMask)
      .map((entry) => Object.freeze({ ...entry }))
  );
}

export function canEditExistingCreatureEquipment(
  source: SceneObjectSourceMetadata | undefined
): boolean {
  return (
    source?.type === "aurora_git" &&
    source.sourceKind === "creature" &&
    typeof source.sourceObjectId === "string" &&
    source.sourceObjectId.length > 0 &&
    Number.isSafeInteger(source.sourceIndex) &&
    Number(source.sourceIndex) >= 0 &&
    Array.isArray(source.creatureEquippedItems) &&
    readSourceArray(
      source.creatureEquippedItems,
      source.creatureEquippedItems.length
    ) !== undefined
  );
}
