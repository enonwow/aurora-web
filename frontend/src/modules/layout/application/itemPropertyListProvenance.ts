import type {
  SceneObjectItemPropertyEntry,
  SceneObjectSourceMetadata,
} from "../../scene/contracts";
import {
  MAX_ITEM_PROPERTY_LIST_ENTRIES,
  readItemPropertyListProvenance,
  readItemPropertyListTargetEntries,
} from "../../scene/domain/itemPropertyList";

const FIELD_MAXIMUMS = Object.freeze({
  propertyName: 0xffff,
  subtype: 0xffff,
  costTable: 0xff,
  costValue: 0xffff,
  param1: 0xff,
  param1Value: 0xff,
  chanceAppear: 0xff,
} as const);

type PersistenceField = keyof typeof FIELD_MAXIMUMS;

function admitted(source: SceneObjectSourceMetadata | undefined) {
  if (source?.type !== "aurora_git" || source.sourceKind !== "item") return null;
  const provenance = readItemPropertyListProvenance(source.itemPropertyList);
  return provenance?.present ? provenance : null;
}

function cloneEntries(
  entries: readonly SceneObjectItemPropertyEntry[] | undefined,
): SceneObjectItemPropertyEntry[] | undefined {
  return entries?.map((entry) => ({ ...entry }));
}

function isPersistenceField(field: keyof SceneObjectItemPropertyEntry): field is PersistenceField {
  return Object.prototype.hasOwnProperty.call(FIELD_MAXIMUMS, field);
}

export function canEditExistingItemPropertyList(
  source: SceneObjectSourceMetadata | undefined,
): boolean {
  return admitted(source) !== null;
}

export function appendExistingItemProperty(
  source: SceneObjectSourceMetadata | undefined,
  current: readonly SceneObjectItemPropertyEntry[],
): readonly SceneObjectItemPropertyEntry[] {
  if (!admitted(source) || current.length >= MAX_ITEM_PROPERTY_LIST_ENTRIES) return current;
  return [...current, {}];
}

export function updateExistingItemPropertyField(
  source: SceneObjectSourceMetadata | undefined,
  current: readonly SceneObjectItemPropertyEntry[],
  index: number,
  field: keyof SceneObjectItemPropertyEntry,
  value: unknown,
): readonly SceneObjectItemPropertyEntry[] {
  if (
    !admitted(source) ||
    !Number.isSafeInteger(index) ||
    index < 0 ||
    index >= current.length ||
    !isPersistenceField(field)
  ) return current;
  if (
    value !== undefined &&
    (!Number.isSafeInteger(value) || Number(value) < 0 || Number(value) > FIELD_MAXIMUMS[field])
  ) return current;
  return current.map((entry, currentIndex) =>
    currentIndex === index ? { ...entry, [field]: value } : entry,
  );
}

export function removeExistingItemProperty(
  source: SceneObjectSourceMetadata | undefined,
  current: readonly SceneObjectItemPropertyEntry[],
  index: number,
): readonly SceneObjectItemPropertyEntry[] {
  if (!admitted(source) || !Number.isSafeInteger(index) || index < 0 || index >= current.length) {
    return current;
  }
  return current.filter((_entry, currentIndex) => currentIndex !== index);
}

export function moveExistingItemProperty(
  source: SceneObjectSourceMetadata | undefined,
  current: readonly SceneObjectItemPropertyEntry[],
  index: number,
  direction: "up" | "down",
): readonly SceneObjectItemPropertyEntry[] {
  if (!admitted(source) || !Number.isSafeInteger(index)) return current;
  const target = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || index >= current.length || target < 0 || target >= current.length) return current;
  const next = [...current];
  [next[index], next[target]] = [next[target]!, next[index]!];
  return next;
}

export function materializeExistingItemPropertyList(
  source: SceneObjectSourceMetadata | undefined,
  current: readonly SceneObjectItemPropertyEntry[] | undefined,
  candidate: unknown,
): SceneObjectItemPropertyEntry[] | undefined {
  if (!admitted(source)) return cloneEntries(current);
  const entries = readItemPropertyListTargetEntries(candidate);
  return entries?.map((entry) => ({ ...entry })) ?? cloneEntries(current);
}
