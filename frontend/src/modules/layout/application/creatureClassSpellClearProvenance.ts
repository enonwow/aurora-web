import type {
  SceneObjectCreatureClassEntry,
  SceneObjectSourceMetadata,
} from "../../scene/contracts";
import { readCreatureClassIdentityState } from "../../scene/domain/creatureClassIdentity";

export interface ExistingCreatureClassSpellClearProvenance {
  readonly classListGraphSha256: string;
  readonly sourceClassIds: readonly number[];
  readonly sourceLevels: readonly number[];
  readonly canonicalSpellListFieldCounts: readonly number[];
}

export interface MaterializedCreatureClassSpellClear {
  readonly classListGraphSha256: string;
  readonly expectedClassIds: readonly number[];
  readonly expectedLevels: readonly number[];
  readonly classSlotIndices: readonly number[];
  readonly destructiveSpellClearConfirmed: true;
}

export function readExistingCreatureClassSpellClearProvenance(
  source: SceneObjectSourceMetadata | undefined,
): ExistingCreatureClassSpellClearProvenance | null {
  if (source?.type !== "aurora_git" || source.sourceKind !== "creature" ||
    !Number.isSafeInteger(source.sourceIndex) || Number(source.sourceIndex) < 0) return null;
  const identity = readCreatureClassIdentityState(source.creatureClassIdentityState);
  if (!identity?.present) return null;
  return Object.freeze({
    classListGraphSha256: identity.classListGraphSha256,
    sourceClassIds: Object.freeze(identity.entries.map((entry) => entry.classId)),
    sourceLevels: Object.freeze(identity.entries.map((entry) => entry.level)),
    canonicalSpellListFieldCounts: Object.freeze(
      identity.entries.map((entry) => entry.canonicalSpellListFieldCount),
    ),
  });
}

export function materializeExistingCreatureClassSpellClear(
  source: SceneObjectSourceMetadata | undefined,
  currentClassEntries: readonly SceneObjectCreatureClassEntry[],
  requestedClassSlotIndices: readonly number[],
  destructiveSpellClearConfirmed: unknown,
): MaterializedCreatureClassSpellClear | null {
  const provenance = readExistingCreatureClassSpellClearProvenance(source);
  if (!provenance || destructiveSpellClearConfirmed !== true ||
    currentClassEntries.length !== provenance.sourceClassIds.length ||
    requestedClassSlotIndices.length < 1 ||
    requestedClassSlotIndices.length > provenance.sourceClassIds.length) return null;

  for (let index = 0; index < currentClassEntries.length; index += 1) {
    const current = currentClassEntries[index];
    if (!current || current.classId !== provenance.sourceClassIds[index] ||
      current.level !== provenance.sourceLevels[index]) return null;
  }

  let previous = -1;
  for (const classSlotIndex of requestedClassSlotIndices) {
    if (!Number.isSafeInteger(classSlotIndex) || classSlotIndex <= previous ||
      classSlotIndex < 0 || classSlotIndex >= provenance.sourceClassIds.length ||
      provenance.canonicalSpellListFieldCounts[classSlotIndex] === 0) return null;
    previous = classSlotIndex;
  }

  return Object.freeze({
    classListGraphSha256: provenance.classListGraphSha256,
    expectedClassIds: Object.freeze([...provenance.sourceClassIds]),
    expectedLevels: Object.freeze([...provenance.sourceLevels]),
    classSlotIndices: Object.freeze([...requestedClassSlotIndices]),
    destructiveSpellClearConfirmed: true as const,
  });
}
