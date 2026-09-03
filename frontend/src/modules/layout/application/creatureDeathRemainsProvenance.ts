import type {
  SceneObjectSourceMetadata,
  ScenePlaceableBodyBagCatalog,
} from "../../scene/contracts";
import {
  canEditExistingCreatureBodyBag,
  canEditExistingCreatureDecayTime,
  creatureDecaySecondsToMilliseconds,
} from "../../scene/domain/creatureDeathRemains";

export function materializeExistingCreatureBodyBagRow(
  source: SceneObjectSourceMetadata | undefined,
  catalog: ScenePlaceableBodyBagCatalog | null | undefined,
  currentRow: number | undefined,
  candidateRow: unknown,
  currentLootable: boolean,
): number | undefined {
  if (!canEditExistingCreatureBodyBag(source, catalog, currentLootable) ||
    !Number.isSafeInteger(candidateRow) ||
    Number(candidateRow) < 0 ||
    Number(candidateRow) > 0xff ||
    catalog?.rows[Number(candidateRow)]?.rowIndex !== Number(candidateRow)) {
    return currentRow;
  }
  return Number(candidateRow);
}

export function materializeExistingCreatureDecayTimeSeconds(
  source: SceneObjectSourceMetadata | undefined,
  currentSeconds: number | undefined,
  candidateSeconds: unknown,
  currentLootable: boolean,
): number | undefined {
  if (!canEditExistingCreatureDecayTime(source, currentLootable) ||
    creatureDecaySecondsToMilliseconds(candidateSeconds) === undefined) {
    return currentSeconds;
  }
  return Number(candidateSeconds);
}
