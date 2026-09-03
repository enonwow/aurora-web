import type {
  SceneObjectSourceMetadata,
  ScenePlaceableFactionCatalog,
} from "../../scene/contracts";
import { readEncounterFactionCatalogBinding } from "../../scene/domain/encounterFaction";

function admittedCatalog(
  source: SceneObjectSourceMetadata | undefined,
  catalog: ScenePlaceableFactionCatalog | null | undefined,
) {
  return readEncounterFactionCatalogBinding(source, catalog);
}

export function canEditExistingEncounterFaction(
  source: SceneObjectSourceMetadata | undefined,
  catalog: ScenePlaceableFactionCatalog | null | undefined,
): boolean {
  return admittedCatalog(source, catalog) !== null;
}

export function materializeExistingEncounterFaction(
  source: SceneObjectSourceMetadata | undefined,
  currentFactionId: number | undefined,
  candidateFactionId: unknown,
  catalog: ScenePlaceableFactionCatalog | null | undefined,
): number | undefined {
  const admitted = admittedCatalog(source, catalog);
  if (!admitted || !Number.isSafeInteger(currentFactionId)
    || !Number.isSafeInteger(candidateFactionId)) return currentFactionId;
  const row = admitted.catalog.rows.find(
    (entry) => entry.factionId === candidateFactionId && entry.factionId >= 1,
  );
  return row?.factionId ?? currentFactionId;
}
