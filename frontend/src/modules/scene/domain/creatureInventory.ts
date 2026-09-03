import type {
  SceneObjectCreatureInventoryBlueprintEntry,
  SceneObjectCreatureInventorySourceEntry,
  SceneObjectCreatureInventoryTargetEntry,
  SceneObjectSourceMetadata
} from "../contracts";
import { AREA_ITEM_CONSTRUCTION_PROFILE } from "./areaWaypointConstructionProfile";

export const CREATURE_INVENTORY_COORDINATE_MAX = 0xffff;
export const CREATURE_INVENTORY_ENTRY_MAX = 1024;
export const CREATURE_INVENTORY_SOURCE_PAYLOAD_MAX_UNITS = 1024 * 1024;

const CREATURE_INVENTORY_RESREF_PATTERN = /^[A-Za-z0-9_]{1,16}$/u;
const SOURCE_KEYS = new Set([
  "sourceIndex",
  "resRef",
  "x",
  "y",
  "dropable",
  "pickpocketable"
]);
const BLUEPRINT_KEYS = new Set([
  "resRef",
  "itemResRef",
  "itemSourceObjectKey",
  "itemSourceFingerprint",
  "x",
  "y",
  "dropable",
  "pickpocketable"
]);

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(
  value: Readonly<Record<string, unknown>>,
  expected: ReadonlySet<string>
): boolean {
  const keys = Object.keys(value);
  return keys.length === expected.size && keys.every((key) => expected.has(key));
}

function isResRef(value: unknown): value is string {
  return typeof value === "string" && CREATURE_INVENTORY_RESREF_PATTERN.test(value);
}

function isCoordinate(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0 && Number(value) <= 0xffff;
}

function isFlag(value: unknown): value is boolean {
  return typeof value === "boolean";
}

function readSourceArray(
  value: unknown,
  expectedCount: number
): readonly SceneObjectCreatureInventorySourceEntry[] | undefined {
  if (
    !Array.isArray(value) ||
    value.length !== expectedCount ||
    value.length > CREATURE_INVENTORY_ENTRY_MAX
  ) {
    return undefined;
  }
  const entries: SceneObjectCreatureInventorySourceEntry[] = [];
  for (const candidate of value) {
    if (
      !isRecord(candidate) ||
      !hasExactKeys(candidate, SOURCE_KEYS) ||
      candidate.sourceIndex !== entries.length ||
      !isResRef(candidate.resRef) ||
      !isCoordinate(candidate.x) ||
      !isCoordinate(candidate.y) ||
      !isFlag(candidate.dropable) ||
      !isFlag(candidate.pickpocketable)
    ) {
      return undefined;
    }
    entries.push(Object.freeze({
      sourceIndex: candidate.sourceIndex,
      resRef: candidate.resRef,
      x: candidate.x,
      y: candidate.y,
      dropable: candidate.dropable,
      pickpocketable: candidate.pickpocketable
    }));
  }
  return Object.freeze(entries);
}

export function readCreatureInventorySourceEntries(
  payload: unknown,
  count: unknown
): readonly SceneObjectCreatureInventorySourceEntry[] | undefined {
  if (
    typeof payload !== "string" ||
    payload.length > CREATURE_INVENTORY_SOURCE_PAYLOAD_MAX_UNITS ||
    !Number.isSafeInteger(count) ||
    Number(count) < 0 ||
    Number(count) > CREATURE_INVENTORY_ENTRY_MAX
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

export function readCreatureInventoryTargetEntries(
  value: unknown,
  sourceEntries: readonly SceneObjectCreatureInventorySourceEntry[]
): readonly SceneObjectCreatureInventoryTargetEntry[] | undefined {
  const exactSource = readSourceArray(sourceEntries, sourceEntries.length);
  if (!exactSource || !Array.isArray(value) || value.length > CREATURE_INVENTORY_ENTRY_MAX) {
    return undefined;
  }
  const usedSourceIndices = new Set<number>();
  const target: SceneObjectCreatureInventoryTargetEntry[] = [];
  for (const candidate of value) {
    if (!isRecord(candidate)) return undefined;
    if (Object.prototype.hasOwnProperty.call(candidate, "sourceIndex")) {
      if (
        !hasExactKeys(candidate, SOURCE_KEYS) ||
        !Number.isSafeInteger(candidate.sourceIndex) ||
        Number(candidate.sourceIndex) < 0 ||
        usedSourceIndices.has(Number(candidate.sourceIndex)) ||
        !isResRef(candidate.resRef) ||
        !isCoordinate(candidate.x) ||
        !isCoordinate(candidate.y) ||
        !isFlag(candidate.dropable) ||
        !isFlag(candidate.pickpocketable)
      ) {
        return undefined;
      }
      const sourceIndex = Number(candidate.sourceIndex);
      const source = exactSource[sourceIndex];
      if (!source || source.resRef !== candidate.resRef) return undefined;
      usedSourceIndices.add(sourceIndex);
      target.push(Object.freeze({
        sourceIndex,
        resRef: candidate.resRef,
        x: candidate.x,
        y: candidate.y,
        dropable: candidate.dropable,
        pickpocketable: candidate.pickpocketable
      }));
      continue;
    }
    if (
      !hasExactKeys(candidate, BLUEPRINT_KEYS) ||
      candidate.resRef !== AREA_ITEM_CONSTRUCTION_PROFILE.templateResRef ||
      candidate.itemResRef !== AREA_ITEM_CONSTRUCTION_PROFILE.templateResRef ||
      candidate.itemSourceObjectKey !== AREA_ITEM_CONSTRUCTION_PROFILE.id ||
      candidate.itemSourceFingerprint !== AREA_ITEM_CONSTRUCTION_PROFILE.sourceSha256 ||
      !isCoordinate(candidate.x) ||
      !isCoordinate(candidate.y) ||
      !isFlag(candidate.dropable) ||
      !isFlag(candidate.pickpocketable)
    ) {
      return undefined;
    }
    target.push(Object.freeze({
      resRef: AREA_ITEM_CONSTRUCTION_PROFILE.templateResRef,
      itemResRef: AREA_ITEM_CONSTRUCTION_PROFILE.templateResRef,
      itemSourceObjectKey: AREA_ITEM_CONSTRUCTION_PROFILE.id,
      itemSourceFingerprint: AREA_ITEM_CONSTRUCTION_PROFILE.sourceSha256,
      x: candidate.x,
      y: candidate.y,
      dropable: candidate.dropable,
      pickpocketable: candidate.pickpocketable
    }));
  }
  return Object.freeze(target);
}

export function createAdmittedCreatureInventoryItem(): SceneObjectCreatureInventoryBlueprintEntry {
  return {
    resRef: AREA_ITEM_CONSTRUCTION_PROFILE.templateResRef,
    itemResRef: AREA_ITEM_CONSTRUCTION_PROFILE.templateResRef,
    itemSourceObjectKey: AREA_ITEM_CONSTRUCTION_PROFILE.id,
    itemSourceFingerprint: AREA_ITEM_CONSTRUCTION_PROFILE.sourceSha256,
    x: 0,
    y: 0,
    dropable: false,
    pickpocketable: false
  };
}

export function canEditExistingCreatureInventory(
  source: SceneObjectSourceMetadata | undefined
): boolean {
  return (
    source?.type === "aurora_git" &&
    source.sourceKind === "creature" &&
    typeof source.sourceObjectId === "string" &&
    source.sourceObjectId.length > 0 &&
    Number.isSafeInteger(source.sourceIndex) &&
    Number(source.sourceIndex) >= 0 &&
    Array.isArray(source.creatureInventoryItems) &&
    readSourceArray(
      source.creatureInventoryItems,
      source.creatureInventoryItems.length
    ) !== undefined
  );
}

export function normalizeCreatureInventoryCoordinate(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(CREATURE_INVENTORY_COORDINATE_MAX, Math.max(0, Math.trunc(value)));
}

export function moveCreatureInventoryEntry<T>(
  entries: readonly T[],
  index: number,
  direction: "up" | "down"
): T[] {
  const targetIndex = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || index >= entries.length || targetIndex < 0 || targetIndex >= entries.length) {
    return [...entries];
  }
  const moved = [...entries];
  [moved[index], moved[targetIndex]] = [moved[targetIndex]!, moved[index]!];
  return moved;
}
