import type {
  SceneCreaturePortraitCatalog,
  SceneObjectSourceMetadata,
} from "../../scene/contracts";
import {
  admittedCreaturePortraitRows,
  readCreaturePortraitStorage,
} from "../../scene/domain/creaturePortrait";

export interface CreaturePortraitSelection {
  readonly portraitId?: number;
  readonly portraitResRef: string;
}

export function reduceExistingCreaturePortrait<T extends CreaturePortraitSelection>(
  source: SceneObjectSourceMetadata | undefined,
  current: T,
  candidateRow: unknown,
  catalog: SceneCreaturePortraitCatalog | null | undefined,
): T {
  if (!Number.isSafeInteger(candidateRow)) return current;
  const row = admittedCreaturePortraitRows(source, catalog)
    .find((candidate) => candidate.rowIndex === candidateRow);
  if (!row) return current;
  return {
    ...current,
    portraitId: row.rowIndex,
    portraitResRef: row.baseResRef,
  };
}

export const materializeExistingCreaturePortrait = reduceExistingCreaturePortrait;

export function readExistingCreaturePortraitProvenance(
  source: SceneObjectSourceMetadata | undefined,
) {
  const storage = readCreaturePortraitStorage(source?.creaturePortrait);
  if (source?.type !== "aurora_git" || source.sourceKind !== "creature" ||
    !Number.isSafeInteger(source.sourceIndex) || Number(source.sourceIndex) < 0 ||
    !storage?.present || !storage.selectorContext || !storage.table) return null;
  return Object.freeze({
    expectedValue: storage.value,
    sourceBaseResRef: storage.table.baseResRef,
    tableSha256: storage.table.sha256,
    tableRowCount: storage.table.rowCount,
    genderExpectedValue: storage.selectorContext.genderValue,
    raceExpectedValue: storage.selectorContext.raceValue,
  });
}
