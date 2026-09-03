import { describe, expect, it, vi } from "vitest";
import {
  createAreaEditingFacade,
  type AreaEditingFacadeDependencies,
} from "../../../../src/modules/areas/application/areaEditingFacade";
import type { AuroraAreaEditingState } from "../../../../src/modules/scene/domain/auroraAreaEditing";
import { buildAreaTileCatalogCertificationKey } from "../../../../src/modules/areas/application/areaTileCatalogFilter";

const definition = {
  tilesetResRef: "tms01",
  fingerprint: "a".repeat(64),
  defaults: {},
  transitionRules: [],
  tiles: [],
  groups: [],
};

function createDependencies(): AreaEditingFacadeDependencies {
  return {
    source: {
      listAreaTilesets: vi.fn(async () => [
        { tilesetResRef: "tms01", displayName: "Microset" },
      ]),
      getAreaTilesetDefinition: vi.fn(async () => definition),
      getAreaEditingDefinitionForArea: vi.fn(async () => ({
        definition,
        areaFingerprint: "b".repeat(64),
      })),
    },
    transfer: {
      verify: vi.fn(async () => ({
        valid: true,
        issues: [],
        stats: {
          width: 2,
          height: 2,
          expectedTileCount: 4,
          tileCount: 4,
          uniqueTileIds: 1,
          groupTileCount: 0,
          sourceProvenanceTileCount: 4,
          modelResolvedTileCount: 4,
          minHeight: 0,
          maxHeight: 0,
        },
        tilesetFingerprint: "a".repeat(64),
      })),
      exportAre: vi.fn(async () => ({
        bytes: new ArrayBuffer(4),
        contentType: "application/octet-stream",
        fileName: "area.are",
      })),
    },
    download: {
      downloadAre: vi.fn(),
    },
  };
}

describe("Area editing facade", () => {
  it("keeps source queries behind the source port", async () => {
    const dependencies = createDependencies();
    const facade = createAreaEditingFacade(dependencies);

    await expect(facade.queries.listTilesets("token")).resolves.toEqual([
      { tilesetResRef: "tms01", displayName: "Microset" },
    ]);
    await expect(
      facade.queries.getTilesetDefinition("token", "tms01"),
    ).resolves.toMatchObject({ tilesetResRef: "tms01" });
    await expect(
      facade.queries.getDefinitionForArea("token", "area_01"),
    ).resolves.toMatchObject({ areaFingerprint: "b".repeat(64) });

    expect(dependencies.source.listAreaTilesets).toHaveBeenCalledWith("token");
    expect(dependencies.source.getAreaTilesetDefinition).toHaveBeenCalledWith(
      "token",
      "tms01",
    );
    expect(
      dependencies.source.getAreaEditingDefinitionForArea,
    ).toHaveBeenCalledWith("token", "area_01");
  });

  it("routes verification and export/download through separate ports", async () => {
    const dependencies = createDependencies();
    const facade = createAreaEditingFacade(dependencies);
    const request = {
      accessToken: "token",
      name: "Area",
      state: { areaResRef: "area" } as AuroraAreaEditingState,
    };

    await expect(facade.queries.verify(request)).resolves.toMatchObject({
      valid: true,
    });
    await expect(facade.commands.exportAndDownloadAre(request)).resolves.toEqual({
      bytes: expect.any(ArrayBuffer),
      contentType: "application/octet-stream",
      fileName: "area.are",
    });

    expect(dependencies.transfer.verify).toHaveBeenCalledWith(request);
    expect(dependencies.transfer.exportAre).toHaveBeenCalledWith(request);
    expect(dependencies.download.downloadAre).toHaveBeenCalledWith(
      expect.objectContaining({ fileName: "area.are" }),
    );
    expect(Object.isFrozen(facade)).toBe(true);
    expect(Object.isFrozen(facade.queries)).toBe(true);
    expect(Object.isFrozen(facade.commands)).toBe(true);
  });

  it("does not download when export fails", async () => {
    const dependencies = createDependencies();
    vi.mocked(dependencies.transfer.exportAre).mockRejectedValueOnce(
      new Error("export failed"),
    );
    const facade = createAreaEditingFacade(dependencies);

    await expect(
      facade.commands.exportAndDownloadAre({
        accessToken: "token",
        name: "Area",
        state: { areaResRef: "area" } as AuroraAreaEditingState,
      }),
    ).rejects.toThrow("export failed");
    expect(dependencies.download.downloadAre).not.toHaveBeenCalled();
  });

  it("loads every immutable certification page into one exact tile index", async () => {
    const baseDependencies = createDependencies();
    const pageMetadata = {
      schemaVersion: "area-tile-certification-page.v1" as const,
      generatedAtIso: "2026-08-21T18:00:00.000Z",
      planId: "a".repeat(64),
      corpusHash: "b".repeat(64),
      profileId: "source-bound-v7",
      ledgerSha256: "c".repeat(64),
      reportSha256: "d".repeat(64),
      tilesetResRef: "tms01",
      total: 2,
      limit: 1,
    };
    const row = (tileId: number) => ({
      tileId,
      rowId: `tile:tms01:${tileId}`,
      capabilityId: "tile-definition",
      eligibility: { status: "eligible" as const },
      identity: {
        schemaVersion: "area-certification.v1" as const,
        planId: "a".repeat(64),
        corpusHash: "b".repeat(64),
        profileId: "source-bound-v7",
        subject: {
          kind: "tile-definition" as const,
          id: `tms01:${tileId}`,
        },
      },
      proofs: {
        inventory: "verified" as const,
        assetClosure: "missing" as const,
        render: "missing" as const,
        visualSeam: "missing" as const,
        setAdjacency: "missing" as const,
        pathReference: "missing" as const,
        pathConnect: "missing" as const,
        wokSeam: "missing" as const,
        persistence: "missing" as const,
        toolset: "missing" as const,
        nwnRuntime: "missing" as const,
      },
    });
    const certification = {
      getTilesetPage: vi.fn(async (_token, _resRef, query) => ({
        ...pageMetadata,
        offset: query.offset,
        items: query.offset === 0 ? [row(2)] : [row(7)],
      })),
    };
    const dependencies = { ...baseDependencies, certification };
    const facade = createAreaEditingFacade(dependencies);

    const index = await facade.queries.getTileCertificationIndex("token", "tms01", 1);

    expect([...index.keys()]).toEqual([
      buildAreaTileCatalogCertificationKey("tms01", 2),
      buildAreaTileCatalogCertificationKey("tms01", 7),
    ]);
    expect(
      index.get(buildAreaTileCatalogCertificationKey("tms01", 7)),
    ).toMatchObject({ rowId: "tile:tms01:7" });
    expect(certification.getTilesetPage).toHaveBeenNthCalledWith(
      1,
      "token",
      "tms01",
      { limit: 1, offset: 0 },
    );
    expect(certification.getTilesetPage).toHaveBeenNthCalledWith(
      2,
      "token",
      "tms01",
      { limit: 1, offset: 1 },
    );
  });

  it("fails closed on missing delivery, page identity drift, duplicates, or no progress", async () => {
    const unavailable = createAreaEditingFacade(createDependencies());
    await expect(
      unavailable.queries.getTileCertificationIndex("token", "tms01"),
    ).rejects.toThrow("Area tile-certification port is unavailable.");

    const dependencies = {
      ...createDependencies(),
      certification: {
        getTilesetPage: vi.fn(async () => ({
          schemaVersion: "area-tile-certification-page.v1",
          generatedAtIso: "2026-08-21T18:00:00.000Z",
          planId: "a".repeat(64),
          corpusHash: "b".repeat(64),
          profileId: "source-bound-v7",
          ledgerSha256: "c".repeat(64),
          reportSha256: "d".repeat(64),
          tilesetResRef: "tin01",
          items: [],
          total: 1,
          limit: 256,
          offset: 0,
        })),
      },
    };
    const facade = createAreaEditingFacade(dependencies);
    await expect(
      facade.queries.getTileCertificationIndex("token", "tms01"),
    ).rejects.toThrow("Area tile-certification page identity changed during pagination.");
  });
});
