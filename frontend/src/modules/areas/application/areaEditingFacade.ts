import type {
  AreaEditingDefinitionResult,
  AreaEditingDownloadPort,
  AreaEditingDraftRequest,
  AreaEditingExportArtifact,
  AreaEditingSourcePort,
  AreaEditingTransferPort,
  AreaEditingVerificationResult,
  AreaTilesetEditingSummary,
} from "../ports/areaEditingPort";
import type { AuroraAreaTilesetDefinition } from "../../scene/domain/auroraAreaEditing";
import type { AreaTileCatalogCertificationIndex } from "./areaTileCatalogFilter";
import { buildAreaTileCatalogCertificationKey } from "./areaTileCatalogFilter";
import type { AreaTileCertificationPort } from "../ports/areaTileCertificationPort";
import { AREA_TILE_CERTIFICATION_PAGE_MAX_LIMIT } from "../ports/areaTileCertificationPort";
import type { TileCertificationRow } from "../domain/tileCertificationPolicy";

export type {
  AreaEditingDefinitionResult,
  AreaEditingDraftRequest,
  AreaEditingExportArtifact,
  AreaEditingVerificationResult,
  AreaTilesetEditingSummary,
} from "../ports/areaEditingPort";

export interface AreaEditingQueryFacade {
  listTilesets(accessToken: string): Promise<readonly AreaTilesetEditingSummary[]>;
  getTilesetDefinition(
    accessToken: string,
    tilesetResRef: string,
  ): Promise<AuroraAreaTilesetDefinition>;
  getDefinitionForArea(
    accessToken: string,
    areaId: string,
  ): Promise<AreaEditingDefinitionResult>;
  getTileCertificationIndex(
    accessToken: string,
    tilesetResRef: string,
    pageSize?: number,
  ): Promise<AreaTileCatalogCertificationIndex>;
  verify(input: AreaEditingDraftRequest): Promise<AreaEditingVerificationResult>;
}

export interface AreaEditingCommandFacade {
  exportAndDownloadAre(
    input: AreaEditingDraftRequest,
  ): Promise<AreaEditingExportArtifact>;
}

export interface AreaEditingFacade {
  readonly queries: AreaEditingQueryFacade;
  readonly commands: AreaEditingCommandFacade;
}

export interface AreaEditingFacadeDependencies {
  readonly source: AreaEditingSourcePort;
  readonly certification?: AreaTileCertificationPort;
  readonly transfer: AreaEditingTransferPort;
  readonly download: AreaEditingDownloadPort;
}

export function createAreaEditingFacade(
  dependencies: AreaEditingFacadeDependencies,
): AreaEditingFacade {
  const queries = Object.freeze<AreaEditingQueryFacade>({
    listTilesets(accessToken) {
      return dependencies.source.listAreaTilesets(accessToken);
    },
    getTilesetDefinition(accessToken, tilesetResRef) {
      return dependencies.source.getAreaTilesetDefinition(
        accessToken,
        tilesetResRef,
      );
    },
    getDefinitionForArea(accessToken, areaId) {
      return dependencies.source.getAreaEditingDefinitionForArea(
        accessToken,
        areaId,
      );
    },
    async getTileCertificationIndex(
      accessToken,
      tilesetResRef,
      pageSize = AREA_TILE_CERTIFICATION_PAGE_MAX_LIMIT,
    ) {
      if (!dependencies.certification) {
        throw new Error("Area tile-certification port is unavailable.");
      }
      if (!Number.isInteger(pageSize) || pageSize < 1 ||
          pageSize > AREA_TILE_CERTIFICATION_PAGE_MAX_LIMIT) {
        throw new Error("Area tile-certification page size is invalid.");
      }
      const normalizedTilesetResRef = tilesetResRef.trim().toLowerCase();
      if (!/^[a-z0-9_]{1,16}$/u.test(normalizedTilesetResRef)) {
        throw new Error("Area tile-certification tileset identity is invalid.");
      }
      const index = new Map<string, TileCertificationRow>();
      let expectedBinding: string | null = null;
      let expectedTotal: number | null = null;
      let offset = 0;
      while (expectedTotal === null || offset < expectedTotal) {
        const page = await dependencies.certification.getTilesetPage(
          accessToken,
          normalizedTilesetResRef,
          { limit: pageSize, offset },
        );
        const binding = [
          page.schemaVersion,
          page.generatedAtIso,
          page.planId,
          page.corpusHash,
          page.profileId,
          page.ledgerSha256,
          page.reportSha256,
          page.tilesetResRef,
          page.total,
        ].join("\0");
        if (
          page.tilesetResRef !== normalizedTilesetResRef ||
          page.limit !== pageSize ||
          page.offset !== offset ||
          (expectedBinding !== null && binding !== expectedBinding)
        ) {
          throw new Error(
            "Area tile-certification page identity changed during pagination.",
          );
        }
        expectedBinding ??= binding;
        expectedTotal ??= page.total;
        if (page.total !== expectedTotal ||
            (offset < expectedTotal && page.items.length === 0)) {
          throw new Error("Area tile-certification pagination made no progress.");
        }
        for (const item of page.items) {
          const key = buildAreaTileCatalogCertificationKey(
            normalizedTilesetResRef,
            item.tileId,
          );
          if (index.has(key)) {
            throw new Error("Area tile-certification page contains a duplicate tile identity.");
          }
          index.set(key, Object.freeze({
            rowId: item.rowId,
            eligibility: item.eligibility,
            proofs: item.proofs,
          }));
        }
        offset += page.items.length;
        if (expectedTotal === 0) break;
      }
      if (offset !== expectedTotal) {
        throw new Error("Area tile-certification pagination did not reach its exact total.");
      }
      return index;
    },
    verify(input) {
      return dependencies.transfer.verify(input);
    },
  });
  const commands = Object.freeze<AreaEditingCommandFacade>({
    async exportAndDownloadAre(input) {
      const artifact = await dependencies.transfer.exportAre(input);
      dependencies.download.downloadAre(artifact);
      return artifact;
    },
  });
  return Object.freeze({ queries, commands });
}
