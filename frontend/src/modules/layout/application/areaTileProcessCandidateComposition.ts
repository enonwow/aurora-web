import { buildAreaTileCatalogCertificationKey } from "../../areas/application/areaTileCatalogFilter";
import type { AreaTileProductionCertificationSource } from "../../areas/application/areaTileProductionPlacementAdmission";
import type { AreaTileProcessContractCandidateInput } from "../../tiles/application/areaTileProcessContractReadiness";

export interface AreaTileProcessCandidateSource {
  readonly tileId?: number;
  readonly modelResRef?: string | null;
}

/**
 * Converts immutable certification data into renderer-neutral process policy.
 * Asset names remain opaque payload: only typed eligibility and proof states
 * may select process, blocked, or excluded behavior.
 */
export function composeAreaTileProcessContractCandidates(
  tiles: readonly AreaTileProcessCandidateSource[],
  tilesetResRef: string,
  certification: AreaTileProductionCertificationSource
): AreaTileProcessContractCandidateInput[] {
  const normalizedTilesetResRef = tilesetResRef.trim().toLowerCase();
  const certificationReady =
    certification.status === "ready" &&
    certification.tilesetResRef.trim().toLowerCase() === normalizedTilesetResRef;

  return tiles.map((tile) => {
    const base = {
      modelResRef: tile.modelResRef,
      ...(Number.isInteger(tile.tileId) ? { tileDefinitionId: tile.tileId } : {})
    };
    if (!certificationReady || !Number.isInteger(tile.tileId)) {
      return { ...base, disposition: "process" as const };
    }

    const row = certification.index.get(
      buildAreaTileCatalogCertificationKey(normalizedTilesetResRef, tile.tileId!)
    );
    if (!row) {
      return { ...base, disposition: "process" as const };
    }
    if (row.eligibility.status === "excluded") {
      return {
        ...base,
        disposition: "excluded" as const,
        reasonCode: row.eligibility.reasonCode
      };
    }
    if (row.proofs.inventory !== "verified") {
      return {
        ...base,
        disposition: "blocked" as const,
        reasonCode:
          row.proofs.inventory === "failed"
            ? "TILE_MODEL_INVENTORY_FAILED"
            : "TILE_MODEL_INVENTORY_MISSING"
      };
    }
    return { ...base, disposition: "process" as const };
  });
}
