import type {
  SceneObjectCreatureAdvancedSettings,
  SceneObjectSourceMetadata,
  ScenePlaceableFactionCatalog,
} from "../../scene/contracts";
import {
  readCreatureFactionProvenance,
} from "../../scene/domain/creatureFaction";
import { readPlaceableFactionCatalog } from "../../scene/domain/placeableFaction";

function admittedCatalog(
  source: SceneObjectSourceMetadata | undefined,
  catalog: ScenePlaceableFactionCatalog | null | undefined,
) {
  if (source?.type !== "aurora_git" || source.sourceKind !== "creature") return null;
  const provenance = readCreatureFactionProvenance(source.creatureFaction);
  const exactCatalog = readPlaceableFactionCatalog(catalog);
  if (!provenance || !exactCatalog ||
    exactCatalog.descriptor.sha256 !== provenance.catalogSha256 ||
    exactCatalog.descriptor.factionCount !== provenance.catalogFactionCount ||
    !exactCatalog.rows.some((row) => row.factionId === provenance.expectedValue)) return null;
  return { provenance, catalog: exactCatalog };
}

export function canEditExistingCreatureFaction(
  source: SceneObjectSourceMetadata | undefined,
  catalog: ScenePlaceableFactionCatalog | null | undefined,
): boolean {
  return admittedCatalog(source, catalog) !== null;
}

export function materializeExistingCreatureFaction<
  TAdvanced extends SceneObjectCreatureAdvancedSettings,
>(
  source: SceneObjectSourceMetadata | undefined,
  current: TAdvanced | undefined,
  candidateFactionId: unknown,
  catalog: ScenePlaceableFactionCatalog | null | undefined,
): TAdvanced | undefined {
  const admitted = admittedCatalog(source, catalog);
  if (!admitted || !current || !Number.isSafeInteger(candidateFactionId)) return current;
  const row = admitted.catalog.rows.find((entry) => entry.factionId === candidateFactionId);
  if (!row) return current;
  return { ...current, factionId: row.factionId, faction: row.name };
}
