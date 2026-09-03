import type {
  SceneObjectPlaceableAdvancedSettings,
  SceneObjectSourceMetadata,
  ScenePlaceableFactionCatalog,
} from "../../scene/contracts";
import {
  readPlaceableFactionCatalog,
  readPlaceableFactionProvenance,
} from "../../scene/domain/placeableFaction";

function admittedCatalog(
  source: SceneObjectSourceMetadata | undefined,
  catalog: ScenePlaceableFactionCatalog | null | undefined,
) {
  if (source?.type !== "aurora_git" || source.sourceKind !== "placeable") return null;
  const provenance = readPlaceableFactionProvenance(source.placeableFaction);
  const exactCatalog = readPlaceableFactionCatalog(catalog);
  if (!provenance || !exactCatalog ||
    exactCatalog.descriptor.sha256 !== provenance.catalogSha256 ||
    exactCatalog.descriptor.factionCount !== provenance.catalogFactionCount ||
    !exactCatalog.rows.some((row) => row.factionId === provenance.expectedValue)) return null;
  return { provenance, catalog: exactCatalog };
}

export function canEditExistingPlaceableFaction(
  source: SceneObjectSourceMetadata | undefined,
  catalog: ScenePlaceableFactionCatalog | null | undefined,
): boolean {
  return admittedCatalog(source, catalog) !== null;
}

export function materializeExistingPlaceableFaction(
  source: SceneObjectSourceMetadata | undefined,
  current: SceneObjectPlaceableAdvancedSettings | undefined,
  candidateFactionId: unknown,
  catalog: ScenePlaceableFactionCatalog | null | undefined,
): SceneObjectPlaceableAdvancedSettings | undefined {
  const admitted = admittedCatalog(source, catalog);
  if (!admitted || !current || !Number.isSafeInteger(candidateFactionId)) return current;
  const row = admitted.catalog.rows.find((entry) => entry.factionId === candidateFactionId);
  if (!row) return current;
  return { ...current, factionId: row.factionId, belongsToFaction: row.name };
}
