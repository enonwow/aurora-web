import { afterEach, describe, expect, it, vi } from "vitest";
import type { AreaApiDetail } from "../../../../src/modules/areas/contracts";
import {
  buildAreaTileProcessContractSceneKey,
  DEFAULT_TILE_PROCESS_CONTRACT_TIMEOUT_MS,
  isCurrentAreaTileProcessRequest,
  resolveAreaTileProcessContractReadiness,
  resolveAreaTileProcessContractReadinessForModelResRefs,
  resolveAreaTileProcessReadinessPublicationDecision,
  scopeAreaTileProcessReadinessToScene,
  shouldRequestAreaTileProcessReadiness,
  type AreaTileProcessContractReadiness
} from "../../../../src/modules/tiles/application/areaTileProcessContractReadiness";
import type {
  TileApiProcessBatchRequestItem,
  TileApiProcessBatchResult,
  TileApiProcessResult
} from "../../../../src/modules/tiles/contracts";
import type { TileApiPort } from "../../../../src/modules/tiles/ports/tileApiPort";

function createAreaDetail(modelResRef: string): AreaApiDetail {
  return {
    areaId: "area_enon_bakery",
    name: "enon_bakery",
    biome: "generic",
    width: 1,
    height: 1,
    tags: [],
    benchmark: false,
    previewImageUrl: "",
    textureAtlas: {
      textureAtlasId: "atlas_sic11_v1",
      previewImageUrl: ""
    },
    tileSet: "sic11",
    tiles: [
      {
        tileInstanceId: "area_enon_bakery:tile:0",
        areaId: "area_enon_bakery",
        tilesetResRef: "sic11",
        row: 0,
        col: 0,
        tileIndex: 0,
        tileId: 2,
        modelResRef
      }
    ],
    composition: {
      placeables: 0,
      doors: 0,
      creatures: 0,
      encounters: 0,
      items: 0,
      sounds: 0,
      stores: 0,
      triggers: 0,
      waypoints: 0,
      total: 0
    },
    updatedAt: "2026-07-02T00:00:00.000Z",
    objects: []
  };
}

function createProcessedTile(tileId: string, resref: string): TileApiProcessResult {
  return {
    cache: {
      key: "a35b27b98cde6783bfc0ff58bf0c6755d87e58f545c59b185b4031fa3c74696f",
      hit: false,
      storedAt: "2026-07-02T00:00:00.000Z",
      hits: 0
    },
    tile: {
      tileId,
      resref,
      name: "Sic11 A01 02",
      tileset: "sic11",
      variant: "a01",
      textureAtlas: {
        atlasId: "atlas_tile_sic11_v1",
        cacheKey: "atlas_tile_sic11_v1:tile_sic11_a01_02",
        strategy: "blob-cache",
        objectKey: "modules/current/__aurora/sources/hak/_sic11/sic11_a01_02.mdl",
        contentType: "application/octet-stream",
        sizeBytes: 4096
      },
      sourceAsset: {
        objectKey: "modules/current/__aurora/sources/hak/_sic11/sic11_a01_02.mdl",
        extension: "mdl",
        role: "mdl_source",
        origin: "module-snapshot",
        sizeBytes: 4096
      },
      render: {
        backendType: "tile",
        frontendType: "tile",
        rendererPreset: "tile-standard"
      },
      renderAssetContract: {
        sourceAssetStatus: "ready",
        mdlSourceStatus: "ready",
        mdlSourceObjectKey:
          "modules/current/__aurora/sources/hak/_sic11/sic11_a01_02.mdl",
        glbGeometryStatus: "ready",
        textureDeliveryStatus: "texture_material_contract_ready",
        materialBindingStatus: "ready",
        rendererHandoffStatus: "ready",
        modelDeliveryStatus: "ready",
        modelAsset: {
          objectKey:
            "modules/current/__aurora/derived/models/aurora-mdl-to-glb_v11-binary-skin-inverse-binds-modelbase/sic11_a01_02.glb",
          extension: "glb",
          contentType: "model/gltf-binary",
          sizeBytes: 8192,
          deliveryPath:
            "/api/v1/catalog/tiles/cache/a35b27b98cde6783bfc0ff58bf0c6755d87e58f545c59b185b4031fa3c74696f/model",
          deliveryUrl:
            "/api/v1/catalog/tiles/cache/a35b27b98cde6783bfc0ff58bf0c6755d87e58f545c59b185b4031fa3c74696f/model"
        },
        materialTextureAssets: [
          {
            reference: "sic11_floor03",
            textureId: "sic11_floor03.tga",
            resref: "sic11_floor03",
            objectKey: "modules/current/__aurora/textures/sic11_floor03.tga",
            extension: "tga",
            contentType: "image/x-tga",
            sizeBytes: 1024,
            source: "hak",
            sourcePath: "hak/+sic11.hak",
            deliveryPath: "/api/v1/assets/textures/sic11_floor03",
            deliveryUrl: "/api/v1/assets/textures/sic11_floor03",
            s3Url: "/api/v1/assets/textures/sic11_floor03"
          }
        ],
        blockers: []
      },
      processedAt: "2026-07-02T00:00:00.000Z"
    }
  };
}

describe("areaTileProcessContractReadiness", () => {
  it("does not let an older A request clear a newer A request after A -> B -> A", () => {
    const newerA = { sceneKey: "area_a|model", revision: 3 };

    expect(isCurrentAreaTileProcessRequest(newerA, "area_a|model", 1)).toBe(false);
    expect(isCurrentAreaTileProcessRequest(newerA, "area_a|model", 3)).toBe(true);
  });

  it("publishes readiness only for the current edited scene key", () => {
    const readiness = { areaId: "area_a" } as AreaTileProcessContractReadiness;

    expect(
      scopeAreaTileProcessReadinessToScene(readiness, "area_a|m1", "area_b|m2")
    ).toBeNull();
    expect(
      scopeAreaTileProcessReadinessToScene(readiness, "area_a|m1", "area_a|m1")
    ).toBe(readiness);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("waits for Aurora tile model generation instead of timing out during normal cold processing", async () => {
    vi.useFakeTimers();
    const tileId = "tile_sic11_a01_02";
    const tileApiPort: TileApiPort = {
      processTile: vi.fn(),
      processTiles: vi.fn(
        () =>
          new Promise<TileApiProcessBatchResult>((resolve) => {
            setTimeout(() => {
              resolve({
                items: [
                  {
                    tileId,
                    status: "ready",
                    result: createProcessedTile(tileId, "sic11_a01_02")
                  }
                ]
              });
            }, 20_000);
          })
      ),
      getTileTextureAtlasContracts: vi.fn()
    };

    const readinessPromise = resolveAreaTileProcessContractReadiness(
      tileApiPort,
      "token",
      createAreaDetail("sic11_a01_02")
    );

    await vi.advanceTimersByTimeAsync(20_000);
    const readiness = await readinessPromise;

    expect(DEFAULT_TILE_PROCESS_CONTRACT_TIMEOUT_MS).toBeGreaterThan(20_000);
    expect(tileApiPort.processTiles).toHaveBeenCalledWith("token", [
      { tileId, bypassCache: false } satisfies TileApiProcessBatchRequestItem
    ]);
    expect(readiness.status).toBe("ready");
    expect(readiness.readyCandidateCount).toBe(1);
    expect(readiness.renderLoaderReadyCount).toBe(1);
    expect(readiness.glbGeometryReadyCount).toBe(1);
    expect(readiness.renderAssetContractBlockerSummary).toBe("tile_sic11_a01_02:none");
  });

  it("resolves the current edited Tile_ID model contract and refreshes after its model changes", async () => {
    const processTiles = vi.fn(async (_token: string, items: TileApiProcessBatchRequestItem[]) => ({
      items: items.map(({ tileId }) => ({
        tileId,
        status: "ready" as const,
        result: createProcessedTile(tileId, tileId.replace(/^tile_/u, ""))
      }))
    }));
    const tileApiPort: TileApiPort = {
      processTile: vi.fn(),
      processTiles,
      getTileTextureAtlasContracts: vi.fn()
    };

    const initial = await resolveAreaTileProcessContractReadinessForModelResRefs(
      tileApiPort,
      "token",
      "area_new_area",
      ["sic11_a00_00", "sic11_a00_00"]
    );
    const changed = await resolveAreaTileProcessContractReadinessForModelResRefs(
      tileApiPort,
      "token",
      "area_new_area",
      ["sic11_a01_02", "sic11_a00_00"]
    );

    expect(initial.entries.map((entry) => entry.modelResRef)).toEqual(["sic11_a00_00"]);
    expect(changed.entries.map((entry) => entry.modelResRef)).toEqual([
      "sic11_a01_02",
      "sic11_a00_00"
    ]);
    expect(processTiles).toHaveBeenNthCalledWith(1, "token", [
      { tileId: "tile_sic11_a00_00", bypassCache: false }
    ]);
    expect(processTiles).toHaveBeenNthCalledWith(2, "token", [
      { tileId: "tile_sic11_a01_02", bypassCache: false },
      { tileId: "tile_sic11_a00_00", bypassCache: false }
    ]);
    expect(buildAreaTileProcessContractSceneKey("area_new_area", ["B", "a", "b"])).toBe(
      "area_new_area\u0000a\u0000b"
    );
  });

  it("rejects a late source-Area publication after the edited scene changed Tile_ID", () => {
    const sourceKey = buildAreaTileProcessContractSceneKey("area_same", ["sic11_a00_00"]);
    const editedKey = buildAreaTileProcessContractSceneKey("area_same", [
      "sic11_a00_00",
      "sic11_a01_02"
    ]);

    expect(
      resolveAreaTileProcessReadinessPublicationDecision({
        currentSceneKey: editedKey,
        acceptedSceneKey: sourceKey,
        publishedSceneKey: sourceKey
      })
    ).toBe("ignore");
    expect(
      resolveAreaTileProcessReadinessPublicationDecision({
        currentSceneKey: editedKey,
        acceptedSceneKey: editedKey,
        publishedSceneKey: null
      })
    ).toBe("ignore");
    expect(
      resolveAreaTileProcessReadinessPublicationDecision({
        currentSceneKey: editedKey,
        acceptedSceneKey: sourceKey,
        publishedSceneKey: null
      })
    ).toBe("clear");
  });

  it("requests the restored A contracts after B is cancelled by immediate Undo", () => {
    const keyA = buildAreaTileProcessContractSceneKey("area_same", ["sic11_a00_00"]);
    const keyB = buildAreaTileProcessContractSceneKey("area_same", ["sic11_a01_02"]);

    expect(
      shouldRequestAreaTileProcessReadiness({
        currentSceneKey: keyB,
        acceptedSceneKey: keyA,
        inFlightSceneKey: null,
        hasReadiness: true
      })
    ).toBe(true);
    expect(
      shouldRequestAreaTileProcessReadiness({
        currentSceneKey: keyB,
        acceptedSceneKey: null,
        inFlightSceneKey: keyB,
        hasReadiness: false
      })
    ).toBe(false);
    expect(
      shouldRequestAreaTileProcessReadiness({
        currentSceneKey: keyA,
        acceptedSceneKey: null,
        inFlightSceneKey: null,
        hasReadiness: false
      })
    ).toBe(true);
  });
});
