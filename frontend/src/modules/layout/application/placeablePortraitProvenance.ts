import type {
  SceneObjectPlaceableAdvancedSettings,
  SceneObjectSourceMetadata,
  ScenePlaceablePortraitCatalog,
} from "../../scene/contracts";
import {
  readPlaceablePortraitCatalog,
  readPlaceablePortraitProvenance,
} from "../../scene/domain/placeablePortrait";

function admittedCatalog(
  source: SceneObjectSourceMetadata | undefined,
  catalog: ScenePlaceablePortraitCatalog | null | undefined,
) {
  if (source?.type !== "aurora_git" || source.sourceKind !== "placeable") return null;
  const provenance = readPlaceablePortraitProvenance(source.placeablePortrait);
  const exactCatalog = readPlaceablePortraitCatalog(catalog);
  if (!provenance || !exactCatalog ||
    exactCatalog.descriptor.sha256 !== provenance.tableSha256 ||
    exactCatalog.descriptor.rowCount !== provenance.tableRowCount ||
    !exactCatalog.rows.some((row) => row.rowIndex === provenance.expectedValue)) return null;
  return { provenance, catalog: exactCatalog };
}

export function canEditExistingPlaceablePortrait(
  source: SceneObjectSourceMetadata | undefined,
  catalog: ScenePlaceablePortraitCatalog | null | undefined,
): boolean {
  return admittedCatalog(source, catalog) !== null;
}

export function materializeExistingPlaceablePortrait(
  source: SceneObjectSourceMetadata | undefined,
  current: SceneObjectPlaceableAdvancedSettings | undefined,
  candidateRow: unknown,
  catalog: ScenePlaceablePortraitCatalog | null | undefined,
): SceneObjectPlaceableAdvancedSettings | undefined {
  const admitted = admittedCatalog(source, catalog);
  if (!admitted || !current || !Number.isSafeInteger(candidateRow)) return current;
  const row = admitted.catalog.rows.find((entry) => entry.rowIndex === candidateRow);
  if (!row) return current;
  return { ...current, portraitId: row.rowIndex, portraitResRef: row.baseResRef };
}
