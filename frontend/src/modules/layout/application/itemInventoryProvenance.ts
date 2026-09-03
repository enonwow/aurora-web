import type {
  SceneObject,
  SceneObjectItemBlueprintEquipmentEntry,
  SceneObjectItemBlueprintInventoryEntry,
  SceneObjectItemInventoryBlueprintEntry,
  SceneObjectItemInventoryTargetEntry,
  SceneObjectSourceMetadata,
} from "../../scene/contracts";
import {
  AREA_ITEM_DYNAMIC_CONSTRUCTION_PROFILE,
  readDynamicAreaItemConstructionDefaults,
} from "../../scene/domain/areaItemDynamicConstructionProfile";
import {
  ITEM_BLUEPRINT_EQUIPMENT_SLOT_MASKS,
  MAX_ITEM_BLUEPRINT_REFERENCE_COUNT,
  readItemBlueprintReferenceLists,
} from "../../scene/domain/itemBlueprintInventory";
import {
  MAX_AREA_ITEM_INVENTORY_ENTRIES,
  readItemInventorySourceEntries,
  readItemInventoryTargetEntries,
} from "../../scene/domain/itemInventory";

export { MAX_ITEM_BLUEPRINT_REFERENCE_COUNT, readItemBlueprintReferenceLists };

export interface ExistingItemInventoryBlueprintOption {
  readonly templateObjectId: string;
  readonly label: string;
}

function admitted(source: SceneObjectSourceMetadata | undefined) {
  if (source?.type !== "aurora_git" || source.sourceKind !== "item") return null;
  return readItemInventorySourceEntries(source.itemInventoryItems);
}

function cloneEntries(
  entries: readonly SceneObjectItemInventoryTargetEntry[] | undefined,
): SceneObjectItemInventoryTargetEntry[] | undefined {
  return entries?.map((entry) => ({ ...entry }));
}

function readExistingItemInventoryBlueprintEntry(
  template: SceneObject,
): SceneObjectItemInventoryBlueprintEntry | null {
  if (template.kind !== "items" ||
    template.source?.type !== "aurora_blueprint" ||
    template.source.sourceKind !== "item" ||
    template.source.sourceProfileId !== AREA_ITEM_DYNAMIC_CONSTRUCTION_PROFILE.id) {
    return null;
  }
  const templateSource = template.source;
  const defaults = readDynamicAreaItemConstructionDefaults({
    templateId: templateSource.templateId ?? "",
    resref: template.resRef,
    metadata: {
      sourceObjectKey: templateSource.sourceObjectKey ?? "",
      sourceSizeBytes: templateSource.sourceSizeBytes ?? 0,
      sourceSha256: templateSource.sourceEtag ?? "",
      sourceExtension: "uti",
      sourceFileType: templateSource.sourceFileType ?? "",
      sourceFileVersion: templateSource.sourceFileVersion ?? "",
      sourceStructTypeId: templateSource.sourceStructTypeId ?? -1,
      templateResRef: templateSource.templateResRef ?? "",
      tag: template.tag,
    },
  });
  if (!defaults || defaults.source.sourceObjectKey !== templateSource.sourceObjectKey ||
    defaults.source.sourceSizeBytes !== templateSource.sourceSizeBytes ||
    defaults.source.sourceEtag !== templateSource.sourceEtag) return null;
  return {
    resRef: defaults.resRef,
    itemTemplateId: defaults.source.templateId,
    itemResRef: defaults.source.templateResRef,
    itemSourceProfileId: defaults.source.sourceProfileId,
    itemSourceObjectKey: defaults.source.sourceObjectKey,
    itemSourceSizeBytes: defaults.source.sourceSizeBytes,
    itemSourceFingerprint: defaults.source.sourceEtag,
    itemTag: defaults.tag,
    x: 0,
    y: 0,
  };
}

export function listExistingItemInventoryBlueprintOptions(
  templates: readonly SceneObject[],
): readonly ExistingItemInventoryBlueprintOption[] {
  const seenObjectIds = new Set<string>();
  const options: ExistingItemInventoryBlueprintOption[] = [];
  for (const template of templates) {
    const entry = readExistingItemInventoryBlueprintEntry(template);
    if (!entry || template.id.length === 0 || template.id.includes("\0") ||
      seenObjectIds.has(template.id)) continue;
    seenObjectIds.add(template.id);
    const name = template.name?.trim();
    options.push({
      templateObjectId: template.id,
      label: name ? `${name} (${entry.resRef})` : entry.resRef,
    });
  }
  return options;
}

export function canEditExistingItemInventory(
  source: SceneObjectSourceMetadata | undefined,
): boolean {
  return admitted(source) !== null;
}

export function updateExistingItemInventoryCoordinate(
  source: SceneObjectSourceMetadata | undefined,
  current: readonly SceneObjectItemInventoryTargetEntry[],
  index: number,
  field: "x" | "y",
  value: number,
): readonly SceneObjectItemInventoryTargetEntry[] {
  if (!admitted(source) || !Number.isSafeInteger(index) || index < 0 ||
      index >= current.length || !Number.isFinite(value)) return current;
  const nextValue = Math.max(0, Math.min(0xffff, Math.trunc(value)));
  return current.map((entry, currentIndex) =>
    currentIndex === index ? { ...entry, [field]: nextValue } : entry,
  );
}

export function moveExistingItemInventoryEntry(
  source: SceneObjectSourceMetadata | undefined,
  current: readonly SceneObjectItemInventoryTargetEntry[],
  index: number,
  direction: "up" | "down",
): readonly SceneObjectItemInventoryTargetEntry[] {
  if (!admitted(source) || !Number.isSafeInteger(index)) return current;
  const target = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || index >= current.length || target < 0 || target >= current.length) {
    return current;
  }
  const next = [...current];
  [next[index], next[target]] = [next[target]!, next[index]!];
  return next;
}

export function removeExistingItemInventoryEntry(
  source: SceneObjectSourceMetadata | undefined,
  current: readonly SceneObjectItemInventoryTargetEntry[],
  index: number,
): readonly SceneObjectItemInventoryTargetEntry[] {
  if (!admitted(source) || !Number.isSafeInteger(index) || index < 0 || index >= current.length) {
    return current;
  }
  return current.filter((_entry, currentIndex) => currentIndex !== index);
}

export function materializeExistingItemInventory(
  source: SceneObjectSourceMetadata | undefined,
  current: readonly SceneObjectItemInventoryTargetEntry[] | undefined,
  candidate: unknown,
): SceneObjectItemInventoryTargetEntry[] | undefined {
  const expected = admitted(source);
  if (!expected) return cloneEntries(current);
  const entries = readItemInventoryTargetEntries(candidate, expected);
  return entries?.map((entry) => ({ ...entry })) ?? cloneEntries(current);
}

export function appendExistingItemInventoryBlueprintEntry(
  source: SceneObjectSourceMetadata | undefined,
  current: readonly SceneObjectItemInventoryTargetEntry[],
  template: SceneObject,
): readonly SceneObjectItemInventoryTargetEntry[] {
  const expected = admitted(source);
  if (!expected || current.length >= MAX_AREA_ITEM_INVENTORY_ENTRIES) return current;
  const parsedCurrent = readItemInventoryTargetEntries(current, expected);
  const entry = readExistingItemInventoryBlueprintEntry(template);
  if (!parsedCurrent || !entry) return current;
  return [
    ...parsedCurrent.map((entry) => ({ ...entry })),
    entry,
  ];
}

export function appendWizardItemInventoryEntry(
  current: readonly SceneObjectItemBlueprintInventoryEntry[],
  equipment: readonly SceneObjectItemBlueprintEquipmentEntry[],
): readonly SceneObjectItemBlueprintInventoryEntry[] {
  if (current.length + equipment.length >= MAX_ITEM_BLUEPRINT_REFERENCE_COUNT) return current;
  return [...current, { resRef: "", x: 0, y: 0 }];
}

export function updateWizardItemInventoryEntry(
  current: readonly SceneObjectItemBlueprintInventoryEntry[],
  index: number,
  field: "resRef" | "x" | "y",
  value: string | number,
): readonly SceneObjectItemBlueprintInventoryEntry[] {
  if (!Number.isSafeInteger(index) || index < 0 || index >= current.length) return current;
  if (field === "resRef" && typeof value !== "string") return current;
  if (field !== "resRef" &&
      (!Number.isSafeInteger(value) || Number(value) < 0 || Number(value) > 0xffff)) return current;
  if (current[index]?.[field] === value) return current;
  return current.map((entry, entryIndex) =>
    entryIndex === index ? { ...entry, [field]: value } : entry,
  ) as SceneObjectItemBlueprintInventoryEntry[];
}

export function moveWizardItemInventoryEntry(
  current: readonly SceneObjectItemBlueprintInventoryEntry[],
  index: number,
  direction: "up" | "down",
): readonly SceneObjectItemBlueprintInventoryEntry[] {
  if (!Number.isSafeInteger(index)) return current;
  const target = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || index >= current.length || target < 0 || target >= current.length) {
    return current;
  }
  const next = [...current];
  [next[index], next[target]] = [next[target]!, next[index]!];
  return next;
}

export function removeWizardItemInventoryEntry(
  current: readonly SceneObjectItemBlueprintInventoryEntry[],
  index: number,
): readonly SceneObjectItemBlueprintInventoryEntry[] {
  return Number.isSafeInteger(index) && index >= 0 && index < current.length
    ? current.filter((_entry, entryIndex) => entryIndex !== index)
    : current;
}

export function appendWizardItemEquipmentEntry(
  inventory: readonly SceneObjectItemBlueprintInventoryEntry[],
  current: readonly SceneObjectItemBlueprintEquipmentEntry[],
): readonly SceneObjectItemBlueprintEquipmentEntry[] {
  if (inventory.length + current.length >= MAX_ITEM_BLUEPRINT_REFERENCE_COUNT) return current;
  const used = new Set(current.map((entry) => entry.slotMask));
  const slotMask = ITEM_BLUEPRINT_EQUIPMENT_SLOT_MASKS.find((mask) => !used.has(mask));
  if (slotMask === undefined) return current;
  return [...current, { resRef: "", slotMask }]
    .sort((left, right) => left.slotMask - right.slotMask);
}

export function updateWizardItemEquipmentEntry(
  current: readonly SceneObjectItemBlueprintEquipmentEntry[],
  index: number,
  field: "resRef" | "slotMask",
  value: string | number,
): readonly SceneObjectItemBlueprintEquipmentEntry[] {
  if (!Number.isSafeInteger(index) || index < 0 || index >= current.length) return current;
  if (field === "resRef") {
    if (typeof value !== "string" || current[index]?.resRef === value) return current;
    return current.map((entry, entryIndex) =>
      entryIndex === index ? { ...entry, resRef: value } : entry,
    );
  }
  if (
    !Number.isSafeInteger(value) ||
    !ITEM_BLUEPRINT_EQUIPMENT_SLOT_MASKS.includes(
      Number(value) as (typeof ITEM_BLUEPRINT_EQUIPMENT_SLOT_MASKS)[number],
    ) ||
    current.some((entry, entryIndex) => entryIndex !== index && entry.slotMask === value)
  ) return current;
  if (current[index]?.slotMask === value) return current;
  return current.map((entry, entryIndex) =>
    entryIndex === index ? { ...entry, slotMask: Number(value) } : entry,
  ).sort((left, right) => left.slotMask - right.slotMask);
}

export function removeWizardItemEquipmentEntry(
  current: readonly SceneObjectItemBlueprintEquipmentEntry[],
  index: number,
): readonly SceneObjectItemBlueprintEquipmentEntry[] {
  return Number.isSafeInteger(index) && index >= 0 && index < current.length
    ? current.filter((_entry, entryIndex) => entryIndex !== index)
    : current;
}
