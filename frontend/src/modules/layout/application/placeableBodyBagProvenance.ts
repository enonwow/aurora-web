import type {
  SceneObjectPlaceableAdvancedSettings,
  SceneObjectSourceMetadata,
  ScenePlaceableBodyBagCatalog,
} from "../../scene/contracts";
import {
  readPlaceableBodyBagCatalog,
  readPlaceableBodyBagProvenance,
} from "../../scene/domain/placeableBodyBag";

function admittedCatalog(
  source: SceneObjectSourceMetadata | undefined,
  catalog: ScenePlaceableBodyBagCatalog | null | undefined,
) {
  if (source?.type !== "aurora_git" || source.sourceKind !== "placeable") return null;
  const provenance = readPlaceableBodyBagProvenance(source.placeableBodyBag);
  const exactCatalog = readPlaceableBodyBagCatalog(catalog);
  return provenance && exactCatalog &&
    exactCatalog.descriptor.sha256 === provenance.tableSha256 &&
    exactCatalog.descriptor.rowCount === provenance.tableRowCount
      ? { provenance, catalog: exactCatalog }
      : null;
}

export function canEditExistingPlaceableBodyBag(
  source: SceneObjectSourceMetadata | undefined,
  catalog: ScenePlaceableBodyBagCatalog | null | undefined,
): boolean {
  return admittedCatalog(source, catalog) !== null;
}

export function materializeExistingPlaceableBodyBag(
  source: SceneObjectSourceMetadata | undefined,
  current: SceneObjectPlaceableAdvancedSettings | undefined,
  candidateRow: unknown,
  catalog: ScenePlaceableBodyBagCatalog | null | undefined,
): SceneObjectPlaceableAdvancedSettings | undefined {
  const admitted = admittedCatalog(source, catalog);
  if (!admitted || !current || !Number.isSafeInteger(candidateRow) || Number(candidateRow) < 0 ||
    Number(candidateRow) >= admitted.provenance.tableRowCount) return current;
  return { ...current, treasureModelRow: Number(candidateRow) };
}
