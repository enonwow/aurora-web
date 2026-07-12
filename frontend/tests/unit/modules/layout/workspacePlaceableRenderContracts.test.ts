import { describe, expect, it } from "vitest";
import type { PlaceableViewportRenderPayload } from "../../../../src/modules/placeables/application/placeableRenderPayloadResolver";
import type { SceneObject } from "../../../../src/modules/scene/contracts";
import {
  isAreaSharedPlaceablesRendererSceneObject,
  isAreaPreviewOnlyAuroraVfxPayload,
  resolveAreaPlaceablePlaceholderReason,
  resolvePlaceableRenderPayloadFromLookup,
  resolvePlaceableRenderPayloadLookup,
  resolvePlaceableRenderContractState,
  resolvePublishedPlaceableRenderPayloadKeys,
  SHARED_PLACEABLES_RENDERER_PATH
} from "../../../../src/modules/layout/application/workspacePlaceableRenderContracts";

const DEFAULT_VISUAL_TRANSFORM = {
  scale: 1,
  offsetX: 0,
  offsetY: 0,
  offsetZ: 0,
  pitch: 0,
  yaw: 0,
  roll: 0
};

function buildAreaObject(overrides: Partial<SceneObject> = {}): SceneObject {
  return {
    id: "area_ikea:plc_001",
    kind: "placeables",
    name: "Area Placeable",
    resRef: "plc_area_table",
    tag: "PLC_AREA_TABLE",
    isStatic: true,
    x: 2,
    y: 3,
    z: 0.25,
    bearing: 1.5,
    visualTransform: { ...DEFAULT_VISUAL_TRANSFORM },
    source: {
      type: "aurora_git",
      areaId: "area_ikea",
      sourceObjectId: "plc_001",
      sourceKind: "placeable",
      templateId: "utp_area_table"
    },
    ...overrides
  };
}

function buildPayload(overrides: Partial<PlaceableViewportRenderPayload> = {}) {
  return {
    templateId: "plc_resolved_table",
    cacheKey: "cache_table",
    cacheHit: false,
    storedAt: "2026-06-23T00:00:00.000Z",
    hits: 0,
    placeable: {
      templateId: "plc_resolved_table",
      resref: "zep_tomest_001",
      name: "Resolved Table",
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
        generatedAt: "2026-06-23T00:00:00.000Z",
        assetCount: 0,
        candidatesScanned: 0,
        assets: []
      }
    },
    assetContracts: {
      cacheKey: "cache_table",
      assets: []
    },
    ...overrides
  } as PlaceableViewportRenderPayload;
}

describe("workspace placeable render contracts", () => {
  it("uses the shared placeables renderer path for Aurora GIT placeables", () => {
    const object = buildAreaObject();

    expect(isAreaSharedPlaceablesRendererSceneObject(object)).toBe(true);
    expect(SHARED_PLACEABLES_RENDERER_PATH).toBe("shared-placeables-renderer");
  });

  it("builds area instance placeable lookups from GIT appearance facts", () => {
    const lookup = resolvePlaceableRenderPayloadLookup(
      buildAreaObject({
        resRef: "zep_tomest_001",
        source: {
          type: "aurora_git",
          areaId: "area_ikea",
          sourceObjectId: "plc_001",
          sourceKind: "placeable",
          templateId: "utp_tomestone",
          appearanceType: 104
        }
      })
    );

    expect(lookup).toMatchObject({
      cacheKey: "area-instance-render-row:placeables:appearance:104:generic:none:tag:plc_area_table:label:none",
      processPayload: {
        templateId: "zep_tomest_001",
        resref: "zep_tomest_001",
        tag: "PLC_AREA_TABLE",
        subtypeHint: "generic",
        appearanceType: 104
      },
      indexKeys: [
        "area-instance-render-row:placeables:appearance:104:generic:none:tag:plc_area_table:label:none",
        "area_ikea:plc_001"
      ],
      publishTemplateAliases: false
    });
  });

  it("builds area instance door lookups from GIT appearance and generic type facts", () => {
    const lookup = resolvePlaceableRenderPayloadLookup(
      buildAreaObject({
        id: "area_ikea:door_001",
        kind: "doors",
        resRef: "nw_door_ttr_11",
        source: {
          type: "aurora_git",
          areaId: "area_ikea",
          sourceObjectId: "door_001",
          sourceKind: "door",
          templateId: "utd_city_gate_01",
          appearanceType: 7,
          genericType: 3
        }
      })
    );

    expect(lookup).toMatchObject({
      cacheKey: "area-instance-render-row:doors:appearance:7:generic:3:tag:plc_area_table:label:none",
      processPayload: {
        templateId: "nw_door_ttr_11",
        resref: "nw_door_ttr_11",
        tag: "PLC_AREA_TABLE",
        subtypeHint: "door",
        appearanceType: 7,
        genericType: 3
      },
      publishTemplateAliases: false
    });
  });

  it("keeps source template aliases for non-instance Area lookups", () => {
    const lookup = resolvePlaceableRenderPayloadLookup(
      buildAreaObject({
        id: "area_ikea:plc_002",
        resRef: "zep_tomest_001",
        source: {
          type: "aurora_git",
          areaId: "area_ikea",
          sourceObjectId: "plc_002",
          sourceKind: "placeable",
          templateId: "utp_tomestone"
        }
      })
    );
    const payload = buildPayload();

    expect(lookup.processPayload).toEqual({
      templateId: "zep_tomest_001",
      resref: "zep_tomest_001",
      subtypeHint: "generic",
      tag: "PLC_AREA_TABLE"
    });
    expect(lookup.indexKeys).toEqual([
      "zep_tomest_001",
      "area_ikea:plc_002",
      "utp_tomestone",
      "plc_zep_tomest_001",
      "plc_utp_tomestone"
    ]);
    expect(
      resolvePlaceableRenderPayloadFromLookup(
        {
          utp_tomestone: payload
        },
        lookup
      )
    ).toBe(payload);
    expect(resolvePublishedPlaceableRenderPayloadKeys(lookup, payload)).toEqual([
      "zep_tomest_001",
      "area_ikea:plc_002",
      "utp_tomestone",
      "plc_zep_tomest_001",
      "plc_utp_tomestone",
      "plc_resolved_table"
    ]);
  });

  it("carries Aurora GIT tags into placeable process payloads", () => {
    const lookup = resolvePlaceableRenderPayloadLookup(
      buildAreaObject({
        id: "area_bakery:plc_light_001",
        resRef: "plc_campfr",
        tag: "VALELightNodeOrange03m",
        source: {
          type: "aurora_git",
          areaId: "area_bakery",
          sourceObjectId: "plc_light_001",
          sourceKind: "placeable",
          templateId: "plc_campfr",
          appearanceType: 26949
        }
      })
    );

    expect(lookup.cacheKey).toBe(
      "area-instance-render-row:placeables:appearance:26949:generic:none:tag:valelightnodeorange03m:label:none"
    );
    expect(lookup.processPayload).toMatchObject({
      templateId: "plc_campfr",
      resref: "plc_campfr",
      tag: "VALELightNodeOrange03m",
      subtypeHint: "generic",
      appearanceType: 26949
    });
  });

  it("carries Aurora GIT localized text into placeable process payloads", () => {
    const lookup = resolvePlaceableRenderPayloadLookup(
      buildAreaObject({
        id: "area_bakery:plc_qfoodbins",
        resRef: "witcher290",
        tag: "QFoodBins",
        source: {
          type: "aurora_git",
          areaId: "area_bakery",
          sourceObjectId: "plc_qfoodbins",
          sourceKind: "placeable",
          templateId: "witcher290",
          appearanceType: 12285,
          localizedName: "[W] Balustrada",
          description: "[Q]Pallet, Empty"
        }
      })
    );

    expect(lookup.cacheKey).toContain(":label:");
    expect(lookup.processPayload).toMatchObject({
      templateId: "witcher290",
      resref: "witcher290",
      tag: "QFoodBins",
      localizedName: "[W] Balustrada",
      description: "[Q]Pallet, Empty",
      subtypeHint: "generic",
      appearanceType: 12285
    });
  });

  it("does not force Aurora GIT VFX-like placeables through the generic lane", () => {
    const lookup = resolvePlaceableRenderPayloadLookup(
      buildAreaObject({
        id: "area_bakery:plc_vfx_flame_001",
        resRef: "tm_pl_lightred",
        tag: "VFXFlameLarge1",
        source: {
          type: "aurora_git",
          areaId: "area_bakery",
          sourceObjectId: "plc_vfx_flame_001",
          sourceKind: "placeable",
          templateId: "tm_pl_lightred",
          appearanceType: 332
        }
      })
    );

    expect(lookup.processPayload).toEqual({
      templateId: "tm_pl_lightred",
      resref: "tm_pl_lightred",
      tag: "VFXFlameLarge1",
      appearanceType: 332
    });
  });

  it("classifies shared Area placeable placeholder reasons from payload state", () => {
    const payloadMissingModelUrl = buildPayload({
      placeable: {
        ...buildPayload().placeable,
        assetManifest: {
          ...buildPayload().placeable.assetManifest,
          assets: [{ assetId: "model-1", role: "model" }]
        }
      },
      assetContracts: {
        cacheKey: "cache_table",
        assets: [{ assetId: "model-1" }]
      },
      renderPackage: {
        status: "ready"
      }
    } as Partial<PlaceableViewportRenderPayload>);

    expect(
      resolveAreaPlaceablePlaceholderReason({
        payload: null,
        isPending: true
      })
    ).toBe("still-loading");
    expect(resolveAreaPlaceablePlaceholderReason({ payload: null })).toBe(
      "missing-payload"
    );
    expect(
      resolveAreaPlaceablePlaceholderReason({ payload: buildPayload() })
    ).toBe("asset-contract-blocked");
    expect(
      resolveAreaPlaceablePlaceholderReason({ payload: payloadMissingModelUrl })
    ).toBe("payload-missing-model-url");
    const payloadVfxEmitterWithoutModelUrl = buildPayload({
      placeable: {
        ...buildPayload().placeable,
        placeableSubtype: "vfx",
        render: {
          backendType: "vfx",
          frontendType: "vfx",
          rendererPreset: "vfx-emitter",
          isDoor: false,
          isVfx: true
        }
      },
      renderPackage: {
        status: "ready",
        auroraEmitter: {
          source: "aurora-mdl-ascii",
          emitters: [
            {
              emitterName: "flame",
              texture: "fxpa_flame00",
              simulation: {
                birthrate: 12,
                lifeExp: 0.8
              }
            }
          ]
        }
      }
    } as Partial<PlaceableViewportRenderPayload>);

    expect(resolvePlaceableRenderContractState(payloadVfxEmitterWithoutModelUrl)).toMatchObject({
      modelUrl: null,
      renderableWithoutModel: true,
      fallbackToPrimitive: false
    });
    expect(
      resolveAreaPlaceablePlaceholderReason({
        payload: payloadVfxEmitterWithoutModelUrl
      })
    ).toBe("none");
    const payloadPreviewOnlyVfxEmitter = buildPayload({
      placeable: {
        ...buildPayload().placeable,
        placeableSubtype: "vfx",
        render: {
          backendType: "vfx",
          frontendType: "vfx",
          rendererPreset: "vfx-emitter",
          isDoor: false,
          isVfx: true
        }
      },
      renderPackage: {
        status: "ready",
        diagnostics: [
          {
            code: "VFX_AURORA_MDL_EMITTER_PREVIEW_NON_CANONICAL",
            severity: "warn",
            message: "Source MDL emitter payload is preview-only."
          }
        ],
        auroraEmitter: {
          source: "source-mdl",
          emitters: [
            {
              emitterName: "flame",
              texture: "fxpa_flame00",
              simulation: {
                birthrate: 12,
                lifeExp: 0.8
              }
            }
          ]
        }
      }
    } as Partial<PlaceableViewportRenderPayload>);

    expect(isAreaPreviewOnlyAuroraVfxPayload(payloadPreviewOnlyVfxEmitter)).toBe(true);
    expect(
      resolveAreaPlaceablePlaceholderReason({
        payload: payloadPreviewOnlyVfxEmitter
      })
    ).toBe("none");
    expect(
      resolveAreaPlaceablePlaceholderReason({
        payload: buildPayload({
          renderPackage: {
            status: "ready",
            glbUrl: "/assets/zep_tomest_001.glb"
          }
        } as Partial<PlaceableViewportRenderPayload>)
      })
    ).toBe("none");
    expect(
      resolveAreaPlaceablePlaceholderReason({
        payload: payloadMissingModelUrl,
        modelLoadFailed: true
      })
    ).toBe("model-load-failed");
    expect(
      resolveAreaPlaceablePlaceholderReason({
        payload: buildPayload({
          renderPackage: {
            status: "unsupported",
            diagnostics: [
              {
                code: "PLACEABLE_RENDER_AREA_INSTANCE_HELPER_NO_GEOMETRY",
                severity: "warn",
                message: "Area GIT light_node instance is an Aurora helper."
              }
            ],
            assetRefs: {}
          }
        } as Partial<PlaceableViewportRenderPayload>)
      })
    ).toBe("not-applicable");
  });
});
