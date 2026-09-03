import type {
  TileCertificationProofs,
  TileEligibility,
} from "../domain/tileCertificationPolicy";

export const AREA_TILE_CERTIFICATION_PAGE_SCHEMA_VERSION =
  "area-tile-certification-page.v1" as const;
export const AREA_TILE_CERTIFICATION_PAGE_MAX_LIMIT = 256;
export const AREA_TILE_CERTIFICATION_PAGE_MAX_OFFSET = 99_999;

export interface AreaTileCertificationPageQuery {
  readonly limit: number;
  readonly offset: number;
}

export interface AreaTileCertificationIdentity {
  readonly schemaVersion: "area-certification.v1";
  readonly planId: string;
  readonly corpusHash: string;
  readonly profileId: string;
  readonly subject: Readonly<{
    kind: "tile-definition";
    id: string;
  }>;
}

export interface AreaTileCertificationPageItem {
  readonly tileId: number;
  readonly rowId: string;
  readonly capabilityId: string;
  readonly eligibility: TileEligibility;
  readonly identity: AreaTileCertificationIdentity;
  readonly proofs: TileCertificationProofs;
}

export interface AreaTileCertificationPage {
  readonly schemaVersion: typeof AREA_TILE_CERTIFICATION_PAGE_SCHEMA_VERSION;
  readonly generatedAtIso: string;
  readonly planId: string;
  readonly corpusHash: string;
  readonly profileId: string;
  readonly ledgerSha256: string;
  readonly reportSha256: string;
  readonly tilesetResRef: string;
  readonly items: readonly AreaTileCertificationPageItem[];
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
}

export interface AreaTileCertificationPort {
  getTilesetPage(
    accessToken: string,
    tilesetResRef: string,
    query: AreaTileCertificationPageQuery,
  ): Promise<AreaTileCertificationPage>;
}
