import { describe, expect, it, vi } from "vitest";
import {
  fetchPlaceableViewportRenderPayloadBatch,
  fetchPlaceableViewportRenderPayload
} from "../../../../src/modules/placeables/application/placeableRenderPayloadResolver";
import type {
  PlaceableApiAssetContractsResult,
  PlaceableApiAssetDeliveryContract,
  PlaceableApiAssetEntry,
  PlaceableRenderPackage,
  PlaceableApiProcessResult
} from "../../../../src/modules/placeables/contracts";
import type { PlaceableApiPort } from "../../../../src/modules/placeables/ports/placeableApiPort";

function createManifestAsset(
  assetId: string,
  role: PlaceableApiAssetEntry["role"],
  fileName = `${assetId}.bin`
): PlaceableApiAssetEntry {
  return {
    assetId,
    role,
    fileName,
    objectKey: `module/${assetId}.bin`,
    extension: "bin",
    sizeBytes: 1,
    contentType: "application/octet-stream"
  };
}

function createDeliveryAsset(
  assetId: string,
  deliveryUrl: string
): PlaceableApiAssetDeliveryContract {
  return {
    assetId,
    objectKey: `module/${assetId}`,
    contentType: "application/octet-stream",
    sizeBytes: 1,
    deliveryPath: `/api/v1/catalog/placeables/cache/cache_key/assets/${assetId}`,
    deliveryUrl
  };
}

function createProcessResult(assets: PlaceableApiAssetEntry[]): PlaceableApiProcessResult {
  return createProcessResultWithRenderPackage(assets, undefined);
}

function createProcessResultWithRenderPackage(
  assets: PlaceableApiAssetEntry[],
  renderPackage?: PlaceableRenderPackage
): PlaceableApiProcessResult {
  return {
    cacheKey: "cache_key",
    cacheHit: false,
    storedAt: "2026-01-01T00:00:00.000Z",
    hits: 0,
    placeable: {
      templateId: "plc_001",
      resref: "plc_001",
      name: "PLC_001",
      category: "placeables",
      placeableSubtype: "generic",
      render: {
        backendType: "generic",
        frontendType: "placeable",
        rendererPreset: "default",
        isDoor: false,
        isVfx: false
      },
      assetManifest: {
        version: "placeable-asset-manifest/v1",
        source: "module-blob-snapshot",
        generatedAt: "2026-01-01T00:00:00.000Z",
        assetCount: assets.length,
        candidatesScanned: assets.length,
        assets
      },
      renderPackage
    }
  };
}

function createProcessResultForTemplate(templateId: string): PlaceableApiProcessResult {
  const result = createProcessResult([]);
  return {
    ...result,
    cacheKey: `cache_${templateId}`,
    placeable: {
      ...result.placeable,
      templateId,
      resref: templateId,
      name: templateId.toUpperCase()
    }
  };
}

function createPortStub(
  processResult: PlaceableApiProcessResult,
  getContractsImpl: (
    accessToken: string,
    cacheKey: string,
    assetIds?: string[]
  ) => Promise<PlaceableApiAssetContractsResult>
): PlaceableApiPort {
  return {
    listPlaceables: vi.fn(async () => ({
      items: [],
      total: 0,
      limit: 100,
      offset: 0
    })),
    getPlaceablePreview: vi.fn(async () => ({
      templateId: "plc_001",
      resref: "plc_001",
      name: "PLC_001",
      category: "placeables",
      previewImageUrl: "/preview/plc_001.png"
    })),
    processPlaceable: vi.fn(async () => processResult),
    getPlaceableAssetContracts: vi.fn(getContractsImpl)
  };
}

describe("fetchPlaceableViewportRenderPayload", () => {
  it("publishes process payloads before asset contract batches settle", async () => {
    const processResult = createProcessResultForTemplate("plc_contract_wait");
    const processPlaceables = vi.fn(async () => ({
      items: [processResult]
    }));
    let resolveContractsBatch:
      | ((value: { items: PlaceableApiAssetContractsResult[] }) => void)
      | null = null;
    const getPlaceableAssetContractsBatch = vi.fn(
      () =>
        new Promise<{ items: PlaceableApiAssetContractsResult[] }>((resolve) => {
          resolveContractsBatch = resolve;
        })
    );
    const port: PlaceableApiPort = {
      ...createPortStub(createProcessResult([]), async (cacheKey) => ({
        cacheKey,
        assets: []
      })),
      processPlaceables,
      getPlaceableAssetContractsBatch
    };
    const onProcessPayload = vi.fn();

    const payloadPromise = fetchPlaceableViewportRenderPayloadBatch(
      port,
      "token",
      [{ key: "area_alpha:obj_contract_wait", lookup: { templateId: "plc_contract_wait" } }],
      {
        onProcessPayload,
        preferBackendViewportBatch: false
      }
    );

    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });

    expect(onProcessPayload).toHaveBeenCalledWith(
      expect.objectContaining({
        templateId: "plc_contract_wait",
        cacheKey: "cache_plc_contract_wait"
      }),
      {
        key: "area_alpha:obj_contract_wait",
        lookup: { templateId: "plc_contract_wait" }
      }
    );

    resolveContractsBatch?.({
      items: [
        {
          cacheKey: "cache_plc_contract_wait",
          assets: []
        }
      ]
    });
    await expect(payloadPromise).resolves.toEqual([
      expect.objectContaining({
        key: "area_alpha:obj_contract_wait",
        payload: expect.objectContaining({
          templateId: "plc_contract_wait",
          cacheKey: "cache_plc_contract_wait"
        })
      })
    ]);
  });

  it("keeps successful Area batch payloads when slow entries fall back to partial recovery", async () => {
    const processPlaceables = vi.fn(async () => {
      throw new Error("process batch unavailable");
    });
    const processPlaceable = vi.fn(async (_token: string, payload: { templateId?: string }) => {
      const templateId = payload.templateId ?? "plc_unknown";
      if (templateId === "plc_slow") {
        throw new Error("single process timed out");
      }
      return createProcessResultForTemplate(templateId);
    });
    const getPlaceableAssetContractsBatch = vi.fn(
      async (_token: string, items: Array<{ cacheKey: string }>) => ({
        items: items.map((item) => ({
          cacheKey: item.cacheKey,
          assets: []
        }))
      })
    );
    const port: PlaceableApiPort = {
      ...createPortStub(createProcessResult([]), async (cacheKey) => ({
        cacheKey,
        assets: []
      })),
      processPlaceable,
      processPlaceables,
      getPlaceableAssetContractsBatch
    };

    const payloads = await fetchPlaceableViewportRenderPayloadBatch(
      port,
      "token",
      [
        { key: "plc_ready", lookup: { templateId: "plc_ready" } },
        { key: "plc_slow", lookup: { templateId: "plc_slow" } }
      ],
      {
        allowPartialProcessBatchResults: true,
        preferBackendViewportBatch: false
      }
    );

    expect(processPlaceables).toHaveBeenCalledTimes(1);
    expect(processPlaceable).toHaveBeenCalledTimes(2);
    expect(payloads.map((payload) => payload.key)).toEqual(["plc_ready"]);
    expect(payloads[0]?.payload.templateId).toBe("plc_ready");
  });

  it("falls back to process recovery when the backend viewport batch fast path fails", async () => {
    const getPlaceableViewportRenderPayloadBatch = vi.fn(async () => {
      throw new Error("viewport batch unavailable");
    });
    const processPlaceables = vi.fn(async () => {
      throw new Error("process batch unavailable");
    });
    const processPlaceable = vi.fn(async (_token: string, payload: { templateId?: string }) =>
      createProcessResultForTemplate(payload.templateId ?? "plc_unknown")
    );
    const getPlaceableAssetContractsBatch = vi.fn(
      async (_token: string, items: Array<{ cacheKey: string }>) => ({
        items: items.map((item) => ({
          cacheKey: item.cacheKey,
          assets: []
        }))
      })
    );
    const port: PlaceableApiPort = {
      ...createPortStub(createProcessResult([]), async (cacheKey) => ({
        cacheKey,
        assets: []
      })),
      getPlaceableViewportRenderPayloadBatch,
      processPlaceable,
      processPlaceables,
      getPlaceableAssetContractsBatch
    };

    const payloads = await fetchPlaceableViewportRenderPayloadBatch(
      port,
      "token",
      [
        { key: "plc_ready_a", lookup: { templateId: "plc_ready_a" } },
        { key: "plc_ready_b", lookup: { templateId: "plc_ready_b" } }
      ],
      {
        allowPartialProcessBatchResults: true
      }
    );

    expect(getPlaceableViewportRenderPayloadBatch).toHaveBeenCalledTimes(1);
    expect(processPlaceables).toHaveBeenCalledTimes(1);
    expect(processPlaceable).toHaveBeenCalledTimes(2);
    expect(payloads.map((payload) => payload.key)).toEqual(["plc_ready_a", "plc_ready_b"]);
  });

  it("uses deterministic preferred ids and returns deterministic asset order prioritizing model/texture", async () => {
    const processResult = createProcessResult([
      createManifestAsset("meta_1", "metadata"),
      createManifestAsset("tex_1", "texture"),
      createManifestAsset("mdl_1", "model"),
      createManifestAsset("unk_1", "unknown"),
      createManifestAsset("mdl_2", "model"),
      createManifestAsset("mat_1", "material")
    ]);

    const port = createPortStub(processResult, async (_token, cacheKey, assetIds) => {
      expect(cacheKey).toBe("cache_key");
      expect(assetIds).toEqual(["mdl_1", "mdl_2", "tex_1", "mat_1", "meta_1", "unk_1"]);
      return {
        cacheKey,
        assets: [
          createDeliveryAsset("tex_1", "/delivery/tex_1"),
          createDeliveryAsset("unk_1", "/delivery/unk_1"),
          createDeliveryAsset("mdl_2", "/delivery/mdl_2"),
          createDeliveryAsset("mdl_1", ""),
          createDeliveryAsset("meta_1", "/delivery/meta_1"),
          createDeliveryAsset("mat_1", "/delivery/mat_1"),
          createDeliveryAsset("mdl_1", "/delivery/mdl_1")
        ]
      };
    });

    const payload = await fetchPlaceableViewportRenderPayload(port, "token", "plc_001");

    expect(port.processPlaceable).toHaveBeenCalledWith("token", {
      templateId: "plc_001",
      includeBenchmarkMetadata: false
    });
    expect(payload.assetContracts.assets.map((asset) => asset.assetId)).toEqual([
      "mdl_1",
      "mdl_2",
      "tex_1",
      "mat_1",
      "meta_1",
      "unk_1"
    ]);
    expect(payload.assetContracts.assets.find((asset) => asset.assetId === "mdl_1")?.deliveryUrl).toBe(
      "/delivery/mdl_1"
    );
    expect(payload.renderPackage).toBeUndefined();
    expect(port.getPlaceableAssetContracts).toHaveBeenCalledTimes(1);
  });

  it("passes through renderPackage to PlaceableViewportRenderPayload", async () => {
    const processResult = createProcessResultWithRenderPackage(
      [
        createManifestAsset("tex_1", "texture"),
        createManifestAsset("mdl_1", "model"),
        createManifestAsset("mat_1", "material")
      ],
      {
        status: "ready",
        diagnostics: [
          {
            code: "PLACEABLE_RENDER_READY",
            severity: "warn",
            message: "Derived model asset exists."
          }
        ],
        assetRefs: {
          modelAssetIds: ["mdl_1"],
          derivedModelAssetIds: [],
          textureAssetIds: ["tex_1"],
          materialAssetIds: ["mat_1"],
          metadataAssetIds: [],
          otherAssetIds: []
        },
        modelUrl: "/cache/model.glb",
        textureUrls: ["/cache/texture.dds"]
      }
    );

    const port = createPortStub(processResult, async (_token, cacheKey, assetIds) => {
      expect(cacheKey).toBe("cache_key");
      expect(assetIds).toEqual(["mdl_1", "tex_1", "mat_1"]);
      return {
        cacheKey,
        assets: [
          createDeliveryAsset("mdl_1", "/delivery/mdl_1"),
          createDeliveryAsset("tex_1", "/delivery/tex_1"),
          createDeliveryAsset("mat_1", "/delivery/mat_1")
        ]
      };
    });

    const payload = await fetchPlaceableViewportRenderPayload(port, "token", "plc_001");

    expect(payload.renderPackage).toEqual({
      status: "ready",
      diagnostics: [
        {
          code: "PLACEABLE_RENDER_READY",
          severity: "warn",
          message: "Derived model asset exists."
        }
      ],
      assetRefs: {
        modelAssetIds: ["mdl_1"],
        derivedModelAssetIds: [],
        textureAssetIds: ["tex_1"],
        materialAssetIds: ["mat_1"],
        metadataAssetIds: [],
        otherAssetIds: []
      },
      modelUrl: "/cache/model.glb",
      glbUrl: undefined,
      textureUrls: ["/cache/texture.dds"]
    });
    expect(port.getPlaceableAssetContracts).toHaveBeenCalledTimes(1);
  });

  it("requests VFX texture contracts even when renderPackage texture URLs are present", async () => {
    const processResult = createProcessResultWithRenderPackage(
      [
        createManifestAsset("mdl_source_1", "model", "phod_fx_pntgrm2.mdl"),
        createManifestAsset("mdl_derived_1", "model", "phod_fx_pntgrm2.glb"),
        createManifestAsset("mdl_chunk_giblet", "model", "red_m_giblet.glb"),
        createManifestAsset("tex_pentagram", "texture", "phod_fx_pntgrm.tga"),
        createManifestAsset("meta_1", "metadata", "phod_fx_pntgrm2.txi")
      ],
      {
        status: "ready",
        diagnostics: [],
        assetRefs: {
          modelAssetIds: ["mdl_source_1"],
          derivedModelAssetIds: ["mdl_derived_1"],
          chunkModelAssetIds: ["mdl_chunk_giblet"],
          textureAssetIds: ["tex_pentagram"],
          metadataAssetIds: ["meta_1"]
        },
        glbUrl: "/cache/phod_fx_pntgrm2.glb",
        textureUrls: ["/cache/phod_fx_pntgrm.tga"],
        auroraEmitter: {
          source: "source-mdl",
          diagnostics: [],
          emitters: [
            {
              source: "aurora-mdl-binary",
              sourceModelAssetId: "mdl_source_1",
              sourceModelFileName: "phod_fx_pntgrm2.mdl",
              sourceModelObjectKey: "module/phod_fx_pntgrm2.mdl",
              nodeName: "lightshaft_purple08",
              texture: "phod_fx_pntgrm",
              emitterType: "Fountain",
              renderMode: "Aligned_to_World_Z"
            }
          ]
        }
      }
    );
    processResult.placeable.placeableSubtype = "vfx";
    processResult.placeable.render = {
      backendType: "vfx",
      frontendType: "vfx",
      rendererPreset: "vfx-emitter",
      isDoor: false,
      isVfx: true
    };

    const port = createPortStub(processResult, async (_token, cacheKey, assetIds) => {
      expect(cacheKey).toBe("cache_key");
      expect(assetIds).toEqual(["mdl_chunk_giblet", "tex_pentagram"]);
      return {
        cacheKey,
        assets: [
          createDeliveryAsset("mdl_chunk_giblet", "/delivery/red_m_giblet.glb"),
          createDeliveryAsset("tex_pentagram", "/delivery/phod_fx_pntgrm.tga")
        ]
      };
    });

    const payload = await fetchPlaceableViewportRenderPayload(port, "token", "plc_pentagram");

    expect(payload.assetContracts.assets.map((asset) => asset.assetId)).toEqual([
      "mdl_chunk_giblet",
      "tex_pentagram"
    ]);
    expect(port.getPlaceableAssetContracts).toHaveBeenCalledTimes(1);
  });

  it("requests VFX texture contracts when the render package has no texture URLs", async () => {
    const processResult = createProcessResultWithRenderPackage(
      [
        createManifestAsset("mdl_source_1", "model", "phod_fx_pntgrm2.mdl"),
        createManifestAsset("tex_pentagram", "texture", "phod_fx_pntgrm.tga")
      ],
      {
        status: "ready",
        diagnostics: [],
        assetRefs: {
          modelAssetIds: ["mdl_source_1"],
          textureAssetIds: ["tex_pentagram"]
        }
      }
    );
    processResult.placeable.placeableSubtype = "vfx";
    processResult.placeable.render = {
      backendType: "vfx",
      frontendType: "vfx",
      rendererPreset: "vfx-emitter",
      isDoor: false,
      isVfx: true
    };

    const port = createPortStub(processResult, async (_token, cacheKey, assetIds) => {
      expect(cacheKey).toBe("cache_key");
      expect(assetIds).toEqual(["tex_pentagram"]);
      return {
        cacheKey,
        assets: [createDeliveryAsset("tex_pentagram", "/delivery/phod_fx_pntgrm.tga")]
      };
    });

    const payload = await fetchPlaceableViewportRenderPayload(port, "token", "plc_pentagram");

    expect(payload.assetContracts.assets.map((asset) => asset.assetId)).toEqual(["tex_pentagram"]);
    expect(port.getPlaceableAssetContracts).toHaveBeenCalledTimes(1);
  });

  it("retries missing/partial critical contracts and merges deterministically", async () => {
    const processResult = createProcessResult([
      createManifestAsset("mdl_1", "model"),
      createManifestAsset("tex_1", "texture"),
      createManifestAsset("meta_1", "metadata")
    ]);

    const getContracts = vi
      .fn<
        (
          accessToken: string,
          cacheKey: string,
          assetIds?: string[]
        ) => Promise<PlaceableApiAssetContractsResult>
      >()
      .mockImplementationOnce(async (_token, cacheKey, assetIds) => {
        expect(assetIds).toEqual(["mdl_1", "tex_1", "meta_1"]);
        return {
          cacheKey,
          assets: [
            createDeliveryAsset("tex_1", ""),
            createDeliveryAsset("meta_1", "/delivery/meta_1")
          ]
        };
      })
      .mockImplementationOnce(async (_token, cacheKey, assetIds) => {
        expect(assetIds).toEqual(["mdl_1", "tex_1"]);
        return {
          cacheKey,
          assets: [
            createDeliveryAsset("mdl_1", "/delivery/mdl_1"),
            createDeliveryAsset("tex_1", "/delivery/tex_1")
          ]
        };
      });

    const port = createPortStub(processResult, getContracts);
    const payload = await fetchPlaceableViewportRenderPayload(port, "token", "plc_001");

    expect(port.getPlaceableAssetContracts).toHaveBeenCalledTimes(2);
    expect(payload.assetContracts.assets.map((asset) => asset.assetId)).toEqual([
      "mdl_1",
      "tex_1",
      "meta_1"
    ]);
    expect(payload.assetContracts.assets.find((asset) => asset.assetId === "mdl_1")?.deliveryUrl).toBe(
      "/delivery/mdl_1"
    );
    expect(payload.assetContracts.assets.find((asset) => asset.assetId === "tex_1")?.deliveryUrl).toBe(
      "/delivery/tex_1"
    );
  });

  it("preserves multiple texture assets across manifest + contract merge for texture reference mapping", async () => {
    const processResult = createProcessResult([
      createManifestAsset("mdl_1", "model", "model.mdl"),
      createManifestAsset("tex_wood", "texture", "PLX_TX_WOOD.dds"),
      createManifestAsset("tex_metal", "texture", "plx_tx_metal.tga"),
      createManifestAsset("tex_stone", "texture", "PLX_TX_STONE.dds")
    ]);

    const port = createPortStub(processResult, async (_token, cacheKey, assetIds) => {
      expect(cacheKey).toBe("cache_key");
      expect(assetIds).toEqual(["mdl_1", "tex_wood", "tex_metal", "tex_stone"]);
      return {
        cacheKey,
        assets: [
          createDeliveryAsset("mdl_1", "/delivery/model.glb"),
          createDeliveryAsset("tex_wood", ""),
          createDeliveryAsset("tex_metal", "/delivery/tex_metal.tga"),
          createDeliveryAsset("tex_stone", "/delivery/tex_stone.dds"),
          createDeliveryAsset("tex_wood", "/delivery/tex_wood.dds")
        ]
      };
    });

    const payload = await fetchPlaceableViewportRenderPayload(port, "token", "plc_001");

    expect(payload.assetContracts.assets.map((asset) => asset.assetId)).toEqual([
      "mdl_1",
      "tex_wood",
      "tex_metal",
      "tex_stone"
    ]);
    expect(payload.assetContracts.assets.find((asset) => asset.assetId === "tex_wood")?.deliveryUrl).toBe(
      "/delivery/tex_wood.dds"
    );
    expect(payload.assetContracts.assets.find((asset) => asset.assetId === "tex_metal")?.deliveryUrl).toBe(
      "/delivery/tex_metal.tga"
    );
    expect(payload.assetContracts.assets.find((asset) => asset.assetId === "tex_stone")?.deliveryUrl).toBe(
      "/delivery/tex_stone.dds"
    );
  });
});
