import type {
  SceneObjectCreatureClassEntry,
  SceneObjectCreatureSpellEntry,
  SceneObjectSourceMetadata,
} from "../../scene/contracts";
import { readCreatureClassIdentityState } from "../../scene/domain/creatureClassIdentity";

export type CreatureClassSpellListKind = "known" | "memorized";

export interface CreatureClassSpellRemovalTarget {
  readonly classSlotIndex: number;
  readonly listKind: CreatureClassSpellListKind;
  readonly spellLevel: number;
  readonly entryIndex: number;
}

export interface ExistingCreatureClassSpellRemovalEntry {
  readonly target: CreatureClassSpellRemovalTarget;
  readonly spellId: number;
  readonly spellMetaMagic: number;
  readonly spellFlags: number;
  readonly opaqueSiblingFieldCount: number;
}

export interface ExistingCreatureClassSpellRemovalProvenance {
  readonly classListGraphSha256: string;
  readonly sourceClassIds: readonly number[];
  readonly sourceLevels: readonly number[];
  readonly entries: readonly ExistingCreatureClassSpellRemovalEntry[];
}

export interface MaterializedCreatureClassSpellRemoval {
  readonly expectedClassIds: readonly number[];
  readonly expectedLevels: readonly number[];
  readonly classListGraphSha256: string;
  readonly targets: readonly CreatureClassSpellRemovalTarget[];
  readonly destructiveSpellRemovalConfirmed: true;
}

export function readExistingCreatureClassSpellRemovalProvenance(
  source: SceneObjectSourceMetadata | undefined,
): ExistingCreatureClassSpellRemovalProvenance | null {
  if (source?.type !== "aurora_git" || source.sourceKind !== "creature" ||
    !Number.isSafeInteger(source.sourceIndex) || Number(source.sourceIndex) < 0) return null;
  const state = readCreatureClassIdentityState(source.creatureClassIdentityState);
  if (!state?.present || state.entries.some((entry) => !entry.spellLists)) return null;
  const entries: ExistingCreatureClassSpellRemovalEntry[] = [];
  state.entries.forEach((classEntry, classSlotIndex) => {
    classEntry.spellLists!.forEach((list) => {
      list.entries.forEach((spell, entryIndex) => entries.push(Object.freeze({
        target: Object.freeze({
          classSlotIndex,
          listKind: list.listKind,
          spellLevel: list.spellLevel,
          entryIndex,
        }),
        ...spell,
      })));
    });
  });
  if (entries.length < 1 || entries.length > 256) return null;
  return Object.freeze({
    classListGraphSha256: state.classListGraphSha256,
    sourceClassIds: Object.freeze(state.entries.map((entry) => entry.classId)),
    sourceLevels: Object.freeze(state.entries.map((entry) => entry.level)),
    entries: Object.freeze(entries),
  });
}

export function materializeExistingCreatureClassSpellRemoval(
  source: SceneObjectSourceMetadata | undefined,
  currentClassEntries: readonly SceneObjectCreatureClassEntry[],
  requestedTargets: readonly CreatureClassSpellRemovalTarget[],
  destructiveSpellRemovalConfirmed: unknown,
): MaterializedCreatureClassSpellRemoval | null {
  const provenance = readExistingCreatureClassSpellRemovalProvenance(source);
  if (!provenance || destructiveSpellRemovalConfirmed !== true || requestedTargets.length < 1 ||
    requestedTargets.length > provenance.entries.length ||
    currentClassEntries.length !== provenance.sourceClassIds.length) return null;
  if (currentClassEntries.some((entry, index) =>
    entry.classId !== provenance.sourceClassIds[index] ||
    entry.level !== provenance.sourceLevels[index])) return null;

  const sourceTargets = new Set(provenance.entries.map((entry) => targetKey(entry.target)));
  let previous = -1;
  const targets: CreatureClassSpellRemovalTarget[] = [];
  for (const candidate of requestedTargets) {
    if (!isTarget(candidate) || !sourceTargets.has(targetKey(candidate))) return null;
    const order = targetOrder(candidate);
    if (order <= previous) return null;
    previous = order;
    targets.push(Object.freeze({ ...candidate }));
  }
  return Object.freeze({
    expectedClassIds: Object.freeze([...provenance.sourceClassIds]),
    expectedLevels: Object.freeze([...provenance.sourceLevels]),
    classListGraphSha256: provenance.classListGraphSha256,
    targets: Object.freeze(targets),
    destructiveSpellRemovalConfirmed: true,
  });
}

export function filterRemovedCreatureClassSpells(
  current: readonly SceneObjectCreatureSpellEntry[],
  provenance: ExistingCreatureClassSpellRemovalProvenance,
  targets: readonly CreatureClassSpellRemovalTarget[],
): readonly SceneObjectCreatureSpellEntry[] {
  const result = current.map((entry) => ({ ...entry }));
  const sourceByTarget = new Map(provenance.entries.map((entry) =>
    [targetKey(entry.target), entry] as const));
  for (const target of targets) {
    const source = sourceByTarget.get(targetKey(target));
    if (!source) continue;
    const index = result.findIndex((entry) =>
      entry.classIndex === target.classSlotIndex &&
      entry.prepared === (target.listKind === "memorized") &&
      entry.spellLevel === target.spellLevel && entry.spellId === source.spellId &&
      entry.metaMagic === source.spellMetaMagic && entry.flags === (source.spellFlags | 1));
    if (index >= 0) result.splice(index, 1);
  }
  return Object.freeze(result.map((entry) => Object.freeze(entry)));
}

function isTarget(value: CreatureClassSpellRemovalTarget): boolean {
  return Number.isSafeInteger(value.classSlotIndex) && value.classSlotIndex >= 0 &&
    (value.listKind === "known" || value.listKind === "memorized") &&
    Number.isSafeInteger(value.spellLevel) && value.spellLevel >= 0 && value.spellLevel <= 13 &&
    Number.isSafeInteger(value.entryIndex) && value.entryIndex >= 0 && value.entryIndex < 256;
}

function targetOrder(target: CreatureClassSpellRemovalTarget): number {
  return target.classSlotIndex * 28 * 256 + (target.listKind === "known" ? 0 : 14) * 256 +
    target.spellLevel * 256 + target.entryIndex;
}

function targetKey(target: CreatureClassSpellRemovalTarget): string {
  return `${target.classSlotIndex}:${target.listKind}:${target.spellLevel}:${target.entryIndex}`;
}
