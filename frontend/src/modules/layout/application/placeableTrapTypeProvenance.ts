import type {
  SceneObjectPlaceableTrapSettings,
  SceneObjectSourceMetadata,
  ScenePlaceableTrapTypeCatalog,
} from "../../scene/contracts";
import {
  readPlaceableTrapTypeCatalog,
  readPlaceableTrapTypeProvenance,
} from "../../scene/domain/placeableTrapType";

function readProvenance(source: SceneObjectSourceMetadata | undefined) {
  if (source?.type !== "aurora_git" || source.sourceKind !== "placeable") return null;
  return readPlaceableTrapTypeProvenance(source.placeableTrapType);
}

function admittedCatalog(
  source: SceneObjectSourceMetadata | undefined,
  catalog: ScenePlaceableTrapTypeCatalog | null | undefined,
) {
  const provenance = readProvenance(source);
  const exactCatalog = readPlaceableTrapTypeCatalog(catalog);
  return provenance && exactCatalog &&
    exactCatalog.descriptor.sha256 === provenance.tableSha256 &&
    exactCatalog.descriptor.rowCount === provenance.tableRowCount
      ? { provenance, catalog: exactCatalog }
      : null;
}

export function canEditExistingPlaceableTrapType(
  source: SceneObjectSourceMetadata | undefined,
  catalog: ScenePlaceableTrapTypeCatalog | null | undefined,
): boolean {
  return admittedCatalog(source, catalog) !== null;
}

export function materializeExistingPlaceableTrapType(
  source: SceneObjectSourceMetadata | undefined,
  current: SceneObjectPlaceableTrapSettings | undefined,
  candidateRow: unknown,
  catalog: ScenePlaceableTrapTypeCatalog | null | undefined,
): SceneObjectPlaceableTrapSettings | undefined {
  const admitted = admittedCatalog(source, catalog);
  if (!admitted || !current || !Number.isSafeInteger(candidateRow) || Number(candidateRow) < 0 ||
    Number(candidateRow) >= admitted.provenance.tableRowCount) return current;
  const row = admitted.catalog.rows[Number(candidateRow)]!;
  return {
    ...current,
    trapTypeRow: row.rowIndex,
    setDc: row.setDc,
    detectDcModWhenSetByRogue: row.detectDcMod,
    disarmDcModWhenSetByRogue: row.disarmDcMod,
  };
}
