import type {
  SceneObjectCreatureClassEntry,
  SceneObjectSourceMetadata,
} from "../../scene/contracts";
import { readCreatureClassLevelState } from "../../scene/domain/creatureClassLevels";
import { readCreatureHitPointState } from "../../scene/domain/creatureHitPoints";

export interface ExistingCreatureClassLevelProvenance {
  readonly classIds: readonly number[];
  readonly sourceLevels: readonly number[];
  readonly opaqueSiblingFieldCounts: readonly number[];
}

export function readExistingCreatureClassLevelProvenance(
  source: SceneObjectSourceMetadata | undefined,
): ExistingCreatureClassLevelProvenance | null {
  if (source?.type !== "aurora_git" || source.sourceKind !== "creature" ||
    !Number.isSafeInteger(source.sourceIndex) || Number(source.sourceIndex) < 0) return null;
  const classState = readCreatureClassLevelState(source.creatureClassLevelState);
  const hitPoints = readCreatureHitPointState(source.creatureHitPointState);
  if (!classState?.present || !hitPoints?.present || !hitPoints.racialTypes ||
    hitPoints.classLevels.length !== classState.entries.length ||
    hitPoints.classLevels.some(
      (level, index) => level !== classState.entries[index]?.level,
    )) return null;
  return Object.freeze({
    classIds: Object.freeze(classState.entries.map((entry) => entry.classId)),
    sourceLevels: Object.freeze(classState.entries.map((entry) => entry.level)),
    opaqueSiblingFieldCounts: Object.freeze(
      classState.entries.map((entry) => entry.opaqueSiblingFieldCount),
    ),
  });
}

export function canEditExistingCreatureClassLevels(
  source: SceneObjectSourceMetadata | undefined,
  entries: readonly SceneObjectCreatureClassEntry[] | undefined,
): boolean {
  const provenance = readExistingCreatureClassLevelProvenance(source);
  return provenance !== null && Array.isArray(entries) &&
    entries.length === provenance.classIds.length && entries.every((entry, index) =>
      entry.classId === provenance.classIds[index] &&
      entry.level === provenance.sourceLevels[index]);
}

export function materializeExistingCreatureClassEntries<
  T extends SceneObjectCreatureClassEntry,
>(
  source: SceneObjectSourceMetadata | undefined,
  current: readonly T[],
  candidate: readonly SceneObjectCreatureClassEntry[],
): readonly T[] {
  const provenance = readExistingCreatureClassLevelProvenance(source);
  if (!provenance || current.length !== provenance.classIds.length ||
    candidate.length !== provenance.classIds.length) return current;
  let totalLevel = 0;
  for (let index = 0; index < provenance.classIds.length; index += 1) {
    const currentEntry = current[index];
    const candidateEntry = candidate[index];
    if (!currentEntry || !candidateEntry ||
      currentEntry.classId !== provenance.classIds[index] ||
      currentEntry.level !== provenance.sourceLevels[index] ||
      candidateEntry.classId !== provenance.classIds[index] ||
      !Number.isSafeInteger(candidateEntry.level) || candidateEntry.level < 1 ||
      candidateEntry.level > 60) return current;
    totalLevel += candidateEntry.level;
  }
  if (totalLevel > 180) return current;
  return Object.freeze(current.map((entry, index) => Object.freeze({
    ...entry,
    level: candidate[index]!.level,
  })));
}
