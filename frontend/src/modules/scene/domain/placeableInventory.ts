import type {
  SceneObjectPlaceableInventoryItemReference,
  SceneObjectPlaceableInventorySourceEntry,
  SceneObjectSourceMetadata
} from "../contracts";
import { AREA_ITEM_CONSTRUCTION_PROFILE } from "./areaWaypointConstructionProfile";

export const PLACEABLE_INVENTORY_COORDINATE_MAX = 0xffff;
export const ADMITTED_PLACEABLE_INVENTORY_TEMPLATE_RESREF =
  AREA_ITEM_CONSTRUCTION_PROFILE.templateResRef;
export const PLACEABLE_INVENTORY_SOURCE_PAYLOAD_MAX_UNITS = 1024;

const PLACEABLE_INVENTORY_RESREF_PATTERN = /^[A-Za-z0-9_]{1,16}$/;
const PLACEABLE_INVENTORY_SOURCE_ENTRY_KEYS = new Set([
  "sourceIndex",
  "resRef",
  "x",
  "y"
]);

function isCoordinate(value: unknown): value is number {
  return (
    Number.isSafeInteger(value) &&
    (value as number) >= 0 &&
    (value as number) <= PLACEABLE_INVENTORY_COORDINATE_MAX
  );
}

function isResRef(value: unknown): value is string {
  return typeof value === "string" && PLACEABLE_INVENTORY_RESREF_PATTERN.test(value);
}

export function readPlaceableInventorySourceEntries(
  value: unknown
): readonly SceneObjectPlaceableInventorySourceEntry[] | undefined {
  if (
    typeof value !== "string" ||
    value.length > PLACEABLE_INVENTORY_SOURCE_PAYLOAD_MAX_UNITS
  ) {
    return undefined;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return undefined;
  }
  if (!Array.isArray(parsed)) return undefined;

  const entries: SceneObjectPlaceableInventorySourceEntry[] = [];
  for (const candidate of parsed) {
    if (candidate === null) return undefined;
    const candidateRecord = candidate as Record<string, unknown>;
    const candidateKeys = Object.keys(candidateRecord);
    if (
      candidateKeys.some((key) => !PLACEABLE_INVENTORY_SOURCE_ENTRY_KEYS.has(key)) ||
      candidateRecord.sourceIndex !== entries.length ||
      !isResRef(candidateRecord.resRef) ||
      !isCoordinate(candidateRecord.x) ||
      !isCoordinate(candidateRecord.y)
    ) {
      return undefined;
    }
    entries.push(
      Object.freeze({
        sourceIndex: candidateRecord.sourceIndex,
        resRef: candidateRecord.resRef,
        x: candidateRecord.x,
        y: candidateRecord.y
      })
    );
  }
  return Object.freeze(entries);
}

export function canEditExistingPlaceableInventory(
  source: SceneObjectSourceMetadata | undefined
): boolean {
  return (
    source?.type === "aurora_git" &&
    source.sourceKind === "placeable" &&
    typeof source.sourceObjectId === "string" &&
    source.sourceObjectId.length > 0 &&
    Array.isArray(source.placeableInventoryItems)
  );
}

export function createAdmittedPlaceableInventoryItem(): SceneObjectPlaceableInventoryItemReference {
  return {
    resRef: AREA_ITEM_CONSTRUCTION_PROFILE.templateResRef,
    itemResRef: AREA_ITEM_CONSTRUCTION_PROFILE.templateResRef,
    itemSourceObjectKey: AREA_ITEM_CONSTRUCTION_PROFILE.id,
    itemSourceFingerprint: AREA_ITEM_CONSTRUCTION_PROFILE.sourceSha256,
    x: 0,
    y: 0
  };
}

export function normalizePlaceableInventoryCoordinate(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(PLACEABLE_INVENTORY_COORDINATE_MAX, Math.max(0, Math.trunc(value)));
}

export function movePlaceableInventoryEntry<T>(
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
