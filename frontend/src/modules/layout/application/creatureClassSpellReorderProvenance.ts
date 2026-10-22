import type {
  SceneObjectCreatureClassEntry,
  SceneObjectCreatureClassSpellEntryState,
  SceneObjectCreatureSpellEntry,
  SceneObjectSourceMetadata,
} from "../../scene/contracts";
import { readCreatureClassIdentityState } from "../../scene/domain/creatureClassIdentity";

export type CreatureClassSpellReorderListKind = "known" | "memorized";

export interface CreatureClassSpellReorder {
  readonly classSlotIndex: number;
  readonly listKind: CreatureClassSpellReorderListKind;
  readonly spellLevel: number;
  readonly entryOrder: readonly number[];
}

export interface ExistingCreatureClassSpellReorderList {
  readonly classSlotIndex: number;
  readonly listKind: CreatureClassSpellReorderListKind;
  readonly spellLevel: number;
  readonly entries: readonly SceneObjectCreatureClassSpellEntryState[];
}

export interface ExistingCreatureClassSpellReorderProvenance {
  readonly classListGraphSha256: string;
  readonly sourceClassIds: readonly number[];
  readonly sourceLevels: readonly number[];
  readonly lists: readonly ExistingCreatureClassSpellReorderList[];
}

export interface MaterializedCreatureClassSpellReorder {
  readonly expectedClassIds: readonly number[];
  readonly expectedLevels: readonly number[];
  readonly classListGraphSha256: string;
  readonly reorders: readonly CreatureClassSpellReorder[];
  readonly spellReorderConfirmed: true;
}

export function readExistingCreatureClassSpellReorderProvenance(
  source: SceneObjectSourceMetadata | undefined,
): ExistingCreatureClassSpellReorderProvenance | null {
  if (source?.type !== "aurora_git" || source.sourceKind !== "creature" ||
    !Number.isSafeInteger(source.sourceIndex) || Number(source.sourceIndex) < 0) return null;
  const state = readCreatureClassIdentityState(source.creatureClassIdentityState);
  if (!state?.present || state.entries.some((entry) => !entry.spellLists)) return null;
  const lists: ExistingCreatureClassSpellReorderList[] = [];
  state.entries.forEach((classEntry, classSlotIndex) => {
    classEntry.spellLists!.forEach((list) => {
      if (list.entries.length < 2) return;
      lists.push(Object.freeze({
        classSlotIndex,
        listKind: list.listKind,
        spellLevel: list.spellLevel,
        entries: Object.freeze(list.entries.map((entry) => Object.freeze({ ...entry }))),
      }));
    });
  });
  if (lists.length < 1 || lists.length > 224 ||
    lists.reduce((sum, list) => sum + list.entries.length, 0) > 256) return null;
  return Object.freeze({
    classListGraphSha256: state.classListGraphSha256,
    sourceClassIds: Object.freeze(state.entries.map((entry) => entry.classId)),
    sourceLevels: Object.freeze(state.entries.map((entry) => entry.level)),
    lists: Object.freeze(lists),
  });
}

export function materializeExistingCreatureClassSpellReorder(
  source: SceneObjectSourceMetadata | undefined,
  currentClassEntries: readonly SceneObjectCreatureClassEntry[],
  requestedReorders: readonly CreatureClassSpellReorder[],
  spellReorderConfirmed: unknown,
): MaterializedCreatureClassSpellReorder | null {
  const provenance = readExistingCreatureClassSpellReorderProvenance(source);
  if (!provenance || spellReorderConfirmed !== true || requestedReorders.length < 1 ||
    requestedReorders.length > provenance.lists.length ||
    currentClassEntries.length !== provenance.sourceClassIds.length) return null;
  if (currentClassEntries.some((entry, index) =>
    entry.classId !== provenance.sourceClassIds[index] ||
    entry.level !== provenance.sourceLevels[index])) return null;

  const sourceLists = new Map(provenance.lists.map((list) => [listKey(list), list] as const));
  let previousOrder = -1;
  let carriedEntryCount = 0;
  const reorders: CreatureClassSpellReorder[] = [];
  for (const candidate of requestedReorders) {
    if (!isReorder(candidate)) return null;
    const order = reorderOrder(candidate);
    if (order <= previousOrder) return null;
    previousOrder = order;
    const sourceList = sourceLists.get(listKey(candidate));
    if (!sourceList || candidate.entryOrder.length !== sourceList.entries.length ||
      !isNonIdentityPermutation(candidate.entryOrder)) return null;
    carriedEntryCount += candidate.entryOrder.length;
    if (carriedEntryCount > 256) return null;
    reorders.push(Object.freeze({
      classSlotIndex: candidate.classSlotIndex,
      listKind: candidate.listKind,
      spellLevel: candidate.spellLevel,
      entryOrder: Object.freeze([...candidate.entryOrder]),
    }));
  }
  return Object.freeze({
    expectedClassIds: Object.freeze([...provenance.sourceClassIds]),
    expectedLevels: Object.freeze([...provenance.sourceLevels]),
    classListGraphSha256: provenance.classListGraphSha256,
    reorders: Object.freeze(reorders),
    spellReorderConfirmed: true,
  });
}

export function applyCreatureClassSpellReorders(
  current: readonly SceneObjectCreatureSpellEntry[],
  provenance: ExistingCreatureClassSpellReorderProvenance,
  reorders: readonly CreatureClassSpellReorder[],
): readonly SceneObjectCreatureSpellEntry[] {
  const result = current.map((entry) => ({ ...entry }));
  const original = () => Object.freeze(current.map((entry) => Object.freeze({ ...entry })));
  const sourceLists = new Map(provenance.lists.map((list) => [listKey(list), list] as const));
  for (const reorder of reorders) {
    const sourceList = sourceLists.get(listKey(reorder));
    if (!sourceList || reorder.entryOrder.length !== sourceList.entries.length ||
      !isNonIdentityPermutation(reorder.entryOrder)) return original();
    const positions = result.flatMap((entry, index) =>
      isDisplayEntryInList(entry, reorder) ? [index] : []);
    if (positions.length !== sourceList.entries.length || positions.some((position, index) =>
      !matchesSourceEntry(result[position]!, sourceList.entries[index]!))) return original();
    const sourceEntries = positions.map((position) => result[position]!);
    positions.forEach((position, index) => {
      result[position] = { ...sourceEntries[reorder.entryOrder[index]!]! };
    });
  }
  return Object.freeze(result.map((entry) => Object.freeze(entry)));
}

function isReorder(value: CreatureClassSpellReorder): boolean {
  return Number.isSafeInteger(value.classSlotIndex) && value.classSlotIndex >= 0 &&
    value.classSlotIndex < 8 &&
    (value.listKind === "known" || value.listKind === "memorized") &&
    Number.isSafeInteger(value.spellLevel) && value.spellLevel >= 0 && value.spellLevel <= 13 &&
    Array.isArray(value.entryOrder) && value.entryOrder.length >= 2 &&
    value.entryOrder.length <= 256;
}

function isNonIdentityPermutation(entryOrder: readonly number[]): boolean {
  const seen = new Set<number>();
  let changed = false;
  for (let index = 0; index < entryOrder.length; index += 1) {
    const value = entryOrder[index];
    if (!Number.isSafeInteger(value) || value! < 0 || value! >= entryOrder.length ||
      seen.has(value!)) return false;
    seen.add(value!);
    changed ||= value !== index;
  }
  return changed;
}

function reorderOrder(value: Pick<CreatureClassSpellReorder, "classSlotIndex" | "listKind" | "spellLevel">): number {
  return value.classSlotIndex * 28 + (value.listKind === "known" ? 0 : 14) + value.spellLevel;
}

function listKey(value: Pick<CreatureClassSpellReorder, "classSlotIndex" | "listKind" | "spellLevel">): string {
  return `${value.classSlotIndex}:${value.listKind}:${value.spellLevel}`;
}

function isDisplayEntryInList(
  entry: SceneObjectCreatureSpellEntry,
  list: Pick<CreatureClassSpellReorder, "classSlotIndex" | "listKind" | "spellLevel">,
): boolean {
  return entry.classIndex === list.classSlotIndex &&
    entry.prepared === (list.listKind === "memorized") &&
    entry.spellLevel === list.spellLevel;
}

function matchesSourceEntry(
  entry: SceneObjectCreatureSpellEntry,
  source: SceneObjectCreatureClassSpellEntryState,
): boolean {
  return entry.spellId === source.spellId && entry.metaMagic === source.spellMetaMagic &&
    entry.flags === (source.spellFlags | 1);
}
