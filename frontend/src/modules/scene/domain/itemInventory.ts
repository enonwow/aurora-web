import type {
  SceneObjectItemInventoryBlueprintEntry,
  SceneObjectItemInventorySourceEntry,
  SceneObjectItemInventoryTargetEntry,
} from "../contracts";
import { AREA_ITEM_DYNAMIC_CONSTRUCTION_PROFILE } from "./areaItemDynamicConstructionProfile";

export const MAX_AREA_ITEM_INVENTORY_ENTRIES = 1024;

const RETAINED_ENTRY_KEYS = Object.freeze(["sourceIndex", "resRef", "x", "y"] as const);
const BLUEPRINT_ENTRY_KEYS = Object.freeze([
  "resRef",
  "itemTemplateId",
  "itemResRef",
  "itemSourceProfileId",
  "itemSourceObjectKey",
  "itemSourceSizeBytes",
  "itemSourceFingerprint",
  "itemTag",
  "x",
  "y",
] as const);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype;
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value);
  return actual.length === keys.length && keys.every((key) => actual.includes(key));
}

function readWord(value: unknown): number | null {
  return Number.isSafeInteger(value) && Number(value) >= 0 && Number(value) <= 0xffff
    ? Number(value)
    : null;
}

function readResRef(value: unknown): string | null {
  return typeof value === "string" && /^[A-Za-z0-9_]{1,16}$/u.test(value)
    ? value
    : null;
}

function readEntry(value: unknown): SceneObjectItemInventorySourceEntry | null {
  if (!isRecord(value) || !hasExactKeys(value, RETAINED_ENTRY_KEYS)) return null;
  const sourceIndex = Number.isSafeInteger(value.sourceIndex) && Number(value.sourceIndex) >= 0
    ? Number(value.sourceIndex)
    : null;
  const resRef = readResRef(value.resRef);
  const x = readWord(value.x);
  const y = readWord(value.y);
  return sourceIndex === null || resRef === null || x === null || y === null
    ? null
    : { sourceIndex, resRef, x, y };
}

function readBlueprintEntry(value: unknown): SceneObjectItemInventoryBlueprintEntry | null {
  const profile = AREA_ITEM_DYNAMIC_CONSTRUCTION_PROFILE;
  if (!isRecord(value) || !hasExactKeys(value, BLUEPRINT_ENTRY_KEYS)) return null;
  const resRef = typeof value.resRef === "string" && /^[a-z0-9_]{1,16}$/u.test(value.resRef)
    ? value.resRef
    : null;
  const itemResRef = typeof value.itemResRef === "string" &&
    /^[a-z0-9_]{1,16}$/u.test(value.itemResRef)
    ? value.itemResRef
    : null;
  const itemTemplateId = typeof value.itemTemplateId === "string" &&
    /^[A-Za-z0-9_-]{1,80}$/u.test(value.itemTemplateId)
    ? value.itemTemplateId
    : null;
  const itemSourceObjectKey = typeof value.itemSourceObjectKey === "string" &&
    value.itemSourceObjectKey.trim().length > 0 &&
    value.itemSourceObjectKey.length <= profile.maxSourceObjectKeyCodeUnits &&
    !value.itemSourceObjectKey.includes("\0")
    ? value.itemSourceObjectKey
    : null;
  const itemSourceSizeBytes = Number.isSafeInteger(value.itemSourceSizeBytes) &&
    Number(value.itemSourceSizeBytes) >= 1 &&
    Number(value.itemSourceSizeBytes) <= profile.maxSourceBytes
    ? Number(value.itemSourceSizeBytes)
    : null;
  const itemSourceFingerprint = typeof value.itemSourceFingerprint === "string" &&
    /^[a-f0-9]{64}$/u.test(value.itemSourceFingerprint)
    ? value.itemSourceFingerprint
    : null;
  const itemTag = typeof value.itemTag === "string" && value.itemTag.length >= 1 &&
    value.itemTag.length <= 256 && !value.itemTag.includes("\0")
    ? value.itemTag
    : null;
  const x = readWord(value.x);
  const y = readWord(value.y);
  if (!resRef || !itemResRef || resRef !== itemResRef || !itemTemplateId ||
    value.itemSourceProfileId !== profile.id || !itemSourceObjectKey ||
    itemSourceSizeBytes === null || !itemSourceFingerprint || !itemTag ||
    x === null || y === null) return null;
  return {
    resRef,
    itemTemplateId,
    itemResRef,
    itemSourceProfileId: profile.id,
    itemSourceObjectKey,
    itemSourceSizeBytes,
    itemSourceFingerprint,
    itemTag,
    x,
    y,
  };
}

export function readItemInventorySourceEntries(
  value: unknown,
): SceneObjectItemInventorySourceEntry[] | null {
  if (!Array.isArray(value) || value.length > MAX_AREA_ITEM_INVENTORY_ENTRIES) return null;
  const result: SceneObjectItemInventorySourceEntry[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const entry = readEntry(value[index]);
    if (!entry || entry.sourceIndex !== index) return null;
    result.push(entry);
  }
  return result;
}

export function readItemInventoryTargetEntries(
  value: unknown,
  sourceValue: unknown,
): SceneObjectItemInventoryTargetEntry[] | null {
  const source = readItemInventorySourceEntries(sourceValue);
  if (!source || !Array.isArray(value) || value.length > MAX_AREA_ITEM_INVENTORY_ENTRIES) {
    return null;
  }
  const used = new Set<number>();
  const result: SceneObjectItemInventoryTargetEntry[] = [];
  for (const rawEntry of value) {
    if (isRecord(rawEntry) && !Object.prototype.hasOwnProperty.call(rawEntry, "sourceIndex")) {
      const blueprint = readBlueprintEntry(rawEntry);
      if (!blueprint) return null;
      result.push(blueprint);
      continue;
    }
    const entry = readEntry(rawEntry);
    if (!entry || used.has(entry.sourceIndex)) return null;
    const retained = source[entry.sourceIndex];
    if (!retained || retained.resRef !== entry.resRef) return null;
    used.add(entry.sourceIndex);
    result.push(entry);
  }
  return result;
}

export function itemInventoryEntriesEqual(
  left: readonly SceneObjectItemInventoryTargetEntry[],
  right: readonly SceneObjectItemInventoryTargetEntry[],
): boolean {
  return left.length === right.length && left.every((entry, index) => {
    const candidate = right[index];
    if (!candidate || ("sourceIndex" in entry) !== ("sourceIndex" in candidate)) return false;
    if ("sourceIndex" in entry && "sourceIndex" in candidate) {
      return entry.sourceIndex === candidate.sourceIndex && entry.resRef === candidate.resRef &&
        entry.x === candidate.x && entry.y === candidate.y;
    }
    if ("sourceIndex" in entry || "sourceIndex" in candidate) return false;
    return entry.resRef === candidate.resRef &&
      entry.itemTemplateId === candidate.itemTemplateId &&
      entry.itemResRef === candidate.itemResRef &&
      entry.itemSourceProfileId === candidate.itemSourceProfileId &&
      entry.itemSourceObjectKey === candidate.itemSourceObjectKey &&
      entry.itemSourceSizeBytes === candidate.itemSourceSizeBytes &&
      entry.itemSourceFingerprint === candidate.itemSourceFingerprint &&
      entry.itemTag === candidate.itemTag && entry.x === candidate.x && entry.y === candidate.y;
  });
}
