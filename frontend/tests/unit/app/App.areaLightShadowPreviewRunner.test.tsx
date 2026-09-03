import { render, screen } from "@testing-library/react";
import * as THREE from "three";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "../../../src/App";
import {
  ALS_ORACLE_CAMPFIRE_FIXTURE_ID,
  ALS_ORACLE_CAMPFIRE_SOURCE_MDL_SHA256,
  ALS_ORACLE_TILE_MODEL_ASSET_SHA256,
  ALS_ORACLE_TILE_SOURCE_MDL_SHA256,
  ALS_ORACLE_TILE_TEXTURE_SHA256,
  CAMPFIRE_PROOF_APPEARANCE_TYPE,
  applyAreaLightShadowPreviewAreaFreshnessPolicy,
  applyAreaLightShadowPreviewPlaceableFreshnessPolicy,
  buildAreaVfxExpectedHostGraph,
  createAlsOracleCampfireAreaFixture,
  evaluateAreaLightShadowPreviewPlaceableLightProjection,
  evaluateAreaLightShadowPreviewPlaceableSourceLineage,
  evaluateAreaLightShadowPreviewTerrainSourceLineage,
  hideAreaLightShadowPreviewEditorLayers,
  isAreaLightShadowPreviewPlaceableTextureSettled,
  readAreaLightShadowPreviewPostprocessDiagnostics,
  renderAreaLightShadowPreviewRuntime,
  rotateAreaLightShadowPreviewCameraAzimuth,
  resolveCampfireProofPlacementForTests
} from "../../../src/modules/areas/dev/AreaLightShadowPreviewRunner";
import { clearTelemetry } from "../../../src/modules/telemetry/telemetryStore";

function makeOracleLightProjectionProof(
  overrides: Record<string, unknown> = {}
) {
  return {
    profile: { pointLight: true },
    facts: {
      pointLightSpatialSamples: [
        {
          name: "campfire-point-light",
          role: "placeables-2da-point-light",
          worldPosition: [5.475929, 0.019465, 6.5011],
          color: [1, 1, 0.526316],
          distance: 3.8,
          intensity: 1,
          decay: 1.25,
          layersMask: 1,
          sourceLightColorRow: 6,
          sourceColor: [1.9, 1.9, 1],
          sourceRadius: 10,
          sourceUnitScale: 0.1,
          sourceRadiusWorld: 1,
          sourceOffset: [0.240711, 0.011001, 0.194654],
          mappedOffset: [0.024071, 0.019465, 0.0011],
          offsetScale: 0.1,
          falloffMode: "enhanced-performance",
          falloffProofStatus:
            "retail-binary-and-shader-backed-enhanced-performance-point-light-falloff",
          falloffRendererPatchStatus: "installed",
          ...overrides
        }
      ]
    }
  } as never;
}

describe("App area light shadow preview route", () => {
  beforeEach(() => {
    clearTelemetry();
    window.localStorage.clear();
  });

  it("renders the dev Area light shadow proof route without auth redirecting", () => {
    window.history.replaceState(
      {},
      "",
      "/dev/area-light-shadow-preview?areaId=area__winds_study"
    );

    render(<App />);

    const runner = screen.getByTestId("area-light-shadow-preview-runner");
    expect(runner).toHaveAttribute("data-render-status", "skipped-test");
    expect(runner).toHaveAttribute("data-area-id", "area__winds_study");
    expect(runner).toHaveAttribute("data-use-area-lighting", "true");
    expect(runner).toHaveAttribute("data-display-fog", "false");
    expect(runner).toHaveAttribute("data-vfx-runtime-observability-version", "");
    expect(runner).toHaveAttribute("data-vfx-runtime-proof-gate-status", "");
    expect(runner).toHaveAttribute("data-placeable-model-texture-status", "");
    expect(runner).toHaveAttribute("data-placeable-model-texture-settled", "false");
    expect(
      screen.queryByRole("heading", { name: /sign in to aurora web/i })
    ).not.toBeInTheDocument();
  });

  it("preserves a close proof-camera distance scale for readable placeable captures", () => {
    window.history.replaceState(
      {},
      "",
      "/dev/area-light-shadow-preview?areaId=area__winds_study&cameraDistanceScale=0.08"
    );

    render(<App />);

    expect(screen.getByTestId("area-light-shadow-preview-runner")).toHaveAttribute(
      "data-camera-distance-scale",
      "0.08"
    );
  });

  it("preserves an explicit proof-camera azimuth for matched NWN framing", () => {
    window.history.replaceState(
      {},
      "",
      "/dev/area-light-shadow-preview?cameraAzimuthDegrees=180"
    );

    render(<App />);

    expect(screen.getByTestId("area-light-shadow-preview-runner")).toHaveAttribute(
      "data-camera-azimuth-degrees",
      "180"
    );
  });

  it("rotates the proof camera around its target without changing distance or height", () => {
    const camera = {
      position: new THREE.Vector3(3, 4, 5),
      lookAt: vi.fn(),
      updateMatrixWorld: vi.fn()
    };
    const controls = {
      target: new THREE.Vector3(1, 2, 1),
      update: vi.fn()
    };

    rotateAreaLightShadowPreviewCameraAzimuth({ camera, controls } as never, 180);

    expect(camera.position.x).toBeCloseTo(-1, 6);
    expect(camera.position.y).toBeCloseTo(4, 6);
    expect(camera.position.z).toBeCloseTo(-3, 6);
    expect(camera.position.distanceTo(controls.target)).toBeCloseTo(Math.sqrt(24), 6);
    expect(camera.lookAt).toHaveBeenCalledWith(controls.target);
    expect(camera.updateMatrixWorld).toHaveBeenCalledWith(true);
    expect(controls.update).toHaveBeenCalledOnce();
  });

  it("expects only static branches owned by the primary placeable model", () => {
    const payloadByObjectId = {
      campfire: {
        renderPackage: {
          assetRefs: {
            modelAssetIds: ["primary-model"],
            chunkModelAssetIds: ["inactive-chunk-model"]
          },
          auroraModelGraph: {
            staticGeometryNodes: [
              {
                sourceModelAssetId: "primary-model",
                nodeName: "CampfireBody"
              },
              {
                sourceModelAssetId: "inactive-chunk-model",
                nodeName: "ExplosionChunk"
              }
            ]
          },
          auroraEmitter: { emitters: [] },
          auroraLight: { lights: [] }
        }
      }
    } as unknown as Parameters<typeof buildAreaVfxExpectedHostGraph>[0];

    expect(buildAreaVfxExpectedHostGraph(payloadByObjectId).staticBranches).toEqual([
      "CampfireBody"
    ]);
  });

  it("can hide the injected campfire selection overlay for visual proof", () => {
    window.history.replaceState(
      {},
      "",
      "/dev/area-light-shadow-preview?areaId=area__winds_study&injectCampfire=true&highlightInjectedCampfire=false"
    );

    render(<App />);

    expect(screen.getByTestId("area-light-shadow-preview-runner")).toHaveAttribute(
      "data-highlight-injected-campfire",
      "false"
    );
  });

  it("places the injected campfire on the selected tile-height surface unless Z is explicit", () => {
    const scene = {
      width: 2,
      height: 2,
      tiles: [
        { id: "tile-0", col: 0, row: 0, height: 0 },
        { id: "tile-3", col: 1, row: 1, height: 1 }
      ],
      auroraAreaEditing: {
        definition: { defaults: { transition: 5 } }
      }
    } as never;

    expect(
      resolveCampfireProofPlacementForTests(scene, {
        x: 1,
        y: 1,
        z: null
      })
    ).toMatchObject({ x: 1, y: 1, z: 0.5, tileId: "tile-3" });
    expect(
      resolveCampfireProofPlacementForTests(scene, {
        x: 1,
        y: 1,
        z: 2.25
      })
    ).toMatchObject({ x: 1, y: 1, z: 2.25, tileId: "tile-3" });
  });

  it("uses the retail Campfr appearance row so Area payloads generate a browser model", () => {
    expect(CAMPFIRE_PROOF_APPEARANCE_TYPE).toBe(58);
  });

  it("reconstructs the immutable als_oracle receiver instead of comparing NWN wood to an unrelated Web Area", () => {
    const fixture = createAlsOracleCampfireAreaFixture({
      areaId: "unrelated-area",
      name: "unrelated",
      biome: "unrelated",
      width: 2,
      height: 2,
      tags: [],
      benchmark: false,
      previewImageUrl: "",
      textureAtlas: {
        atlasId: "unrelated-atlas",
        cacheKey: "unrelated-cache",
        strategy: "blob-cache"
      },
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
      updatedAt: "2026-08-19T00:00:00.000Z",
      processedAt: "2026-08-19T00:00:00.000Z",
      objects: []
    });

    expect(ALS_ORACLE_CAMPFIRE_FIXTURE_ID).toBe("als-oracle-campfire-v1");
    expect(fixture).toMatchObject({
      areaId: "area__als_light_lab_oracle",
      name: "enon_test_effects",
      biome: "tin01",
      width: 12,
      height: 12,
      tileSet: "tin01",
      objects: [],
      sourceResources: {
        areSha256: "f550902c496a0eba85877d3dc27d40fd1015b001015b1e7a3c43a54214d64c1c",
        gitSha256: "0202de0642a6670adfb4e10f9b5d635f77765736f53a0e2fd8df972f7c549a01",
        gicSha256: "20b5f2935ab06c9b974b154423a98830d1513d17ac049abd6a943b0d07728f89"
      }
    });
    expect(fixture.tiles).toHaveLength(144);
    expect(new Set(fixture.tiles?.map((tile) => tile.modelResRef))).toEqual(
      new Set(["tin01_d11_01"])
    );
    expect(fixture.tiles?.[0]).toMatchObject({
      tileId: 18,
      row: 0,
      col: 0,
      orientation: 0,
      tilesetOrientation: 0,
      mainLight1: 0,
      mainLight2: 0,
      sourceLight1: 0,
      sourceLight2: 0,
      animLoop1: 1,
      animLoop2: 1,
      animLoop3: 1,
      height: 0
    });
    expect(fixture.lighting?.fields).toEqual(
      expect.arrayContaining([
        { field: "LightingScheme", value: 12 },
        { field: "DayNightCycle", value: 0 },
        { field: "IsNight", value: 1 },
        { field: "MoonAmbientColor", value: 3947580 },
        { field: "MoonDiffuseColor", value: 11184810 },
        { field: "MoonFogAmount", value: 5 },
        { field: "MoonShadows", value: 0 }
      ])
    );
  });

  it("exposes the selected immutable oracle fixture in the proof route", () => {
    window.history.replaceState(
      {},
      "",
      "/dev/area-light-shadow-preview?oracleFixture=als-oracle-campfire-v1"
    );

    render(<App />);

    expect(screen.getByTestId("area-light-shadow-preview-runner")).toHaveAttribute(
      "data-oracle-fixture",
      "als-oracle-campfire-v1"
    );
  });

  it("accepts only the exact retail plc_i06 source-MDL lineage for the oracle fixture", () => {
    const sourceModelObjectKey =
      "proof/placeable-lighting-vanilla-20260819/__aurora/sources/vanilla/models/plc_i06.mdl";
    const lineage = evaluateAreaLightShadowPreviewPlaceableSourceLineage(
      {
        renderPackage: {
          auroraEmitter: {
            emitters: [
              {
                sourceModelObjectKey,
                sourceModelHash: ALS_ORACLE_CAMPFIRE_SOURCE_MDL_SHA256
              }
            ]
          },
          auroraLight: {
            lights: [
              {
                sourceModelObjectKey,
                sourceModelHash: ALS_ORACLE_CAMPFIRE_SOURCE_MDL_SHA256
              }
            ]
          }
        }
      } as never,
      ALS_ORACLE_CAMPFIRE_FIXTURE_ID
    );

    expect(lineage).toEqual({
      status: "pass",
      sourceModelObjectKeys: [sourceModelObjectKey],
      sourceModelHashes: [ALS_ORACLE_CAMPFIRE_SOURCE_MDL_SHA256],
      blockerCodes: []
    });
  });

  it("bypasses legacy placeable cache only for the immutable oracle fixture", () => {
    const payload = { templateId: "plc_plc_i06", resref: "plc_i06" };

    expect(
      applyAreaLightShadowPreviewPlaceableFreshnessPolicy(
        payload,
        ALS_ORACLE_CAMPFIRE_FIXTURE_ID
      )
    ).toEqual({ ...payload, bypassCache: true });
    expect(
      applyAreaLightShadowPreviewPlaceableFreshnessPolicy(payload, "")
    ).toBe(payload);
  });

  it("bypasses legacy Area cache only for the immutable oracle fixture", () => {
    const options = {};

    expect(
      applyAreaLightShadowPreviewAreaFreshnessPolicy(
        options,
        ALS_ORACLE_CAMPFIRE_FIXTURE_ID
      )
    ).toEqual({ bypassCache: true });
    expect(applyAreaLightShadowPreviewAreaFreshnessPolicy(options, "")).toBe(options);
  });

  it("admits only the decompilation-backed plc_i06 point-light projection", () => {
    const result = evaluateAreaLightShadowPreviewPlaceableLightProjection(
      makeOracleLightProjectionProof(),
      ALS_ORACLE_CAMPFIRE_FIXTURE_ID
    );

    expect(result).toMatchObject({ status: "pass", blockerCodes: [] });
  });

  it("blocks a present campfire light whose range, intensity or shader projection regressed", () => {
    const result = evaluateAreaLightShadowPreviewPlaceableLightProjection(
      makeOracleLightProjectionProof({
        distance: 1,
        intensity: 1.9,
        decay: 1,
        falloffRendererPatchStatus: "blocked-three-shaderchunk-shape-unrecognized"
      }),
      ALS_ORACLE_CAMPFIRE_FIXTURE_ID
    );

    expect(result.status).toBe("blocked");
    expect(result.blockerCodes).toEqual(
      expect.arrayContaining([
        "ALS_ORACLE_LIGHT_PROJECTION_EFFECTIVE_RANGE_MISMATCH",
        "ALS_ORACLE_LIGHT_PROJECTION_INTENSITY_MISMATCH",
        "ALS_ORACLE_LIGHT_PROJECTION_DECAY_MISMATCH",
        "ALS_ORACLE_LIGHT_PROJECTION_SHADER_PATCH_BLOCKED"
      ])
    );
  });

  it("blocks a HAK plc_i06 even when the filename matches the retail fixture", () => {
    const lineage = evaluateAreaLightShadowPreviewPlaceableSourceLineage(
      {
        renderPackage: {
          auroraEmitter: {
            emitters: [
              {
                sourceModelObjectKey:
                  "proof/current/__aurora/sources/hak/lc_hd_plcbls/plc_i06.mdl",
                sourceModelHash: ALS_ORACLE_CAMPFIRE_SOURCE_MDL_SHA256
              }
            ]
          }
        }
      } as never,
      ALS_ORACLE_CAMPFIRE_FIXTURE_ID
    );

    expect(lineage.status).toBe("blocked");
    expect(lineage.blockerCodes).toContain(
      "ALS_ORACLE_SOURCE_MDL_OBJECT_KEY_MISMATCH"
    );
  });

  it("blocks legacy payloads that do not expose a byte-derived source-MDL hash", () => {
    const lineage = evaluateAreaLightShadowPreviewPlaceableSourceLineage(
      {
        renderPackage: {
          auroraEmitter: {
            emitters: [
              {
                sourceModelObjectKey:
                  "proof/current/__aurora/sources/vanilla/models/plc_i06.mdl"
              }
            ]
          }
        }
      } as never,
      ALS_ORACLE_CAMPFIRE_FIXTURE_ID
    );

    expect(lineage.status).toBe("blocked");
    expect(lineage.blockerCodes).toContain(
      "ALS_ORACLE_SOURCE_MDL_HASH_MISSING"
    );
  });

  it("blocks a vanilla object key whose source bytes do not match the retail oracle", () => {
    const lineage = evaluateAreaLightShadowPreviewPlaceableSourceLineage(
      {
        renderPackage: {
          auroraLight: {
            lights: [
              {
                sourceModelObjectKey:
                  "proof/current/__aurora/sources/vanilla/models/plc_i06.mdl",
                sourceModelHash: "a".repeat(64)
              }
            ]
          }
        }
      } as never,
      ALS_ORACLE_CAMPFIRE_FIXTURE_ID
    );

    expect(lineage.status).toBe("blocked");
    expect(lineage.blockerCodes).toContain(
      "ALS_ORACLE_SOURCE_MDL_HASH_MISMATCH"
    );
  });

  it("accepts only the exact vanilla terrain receiver lineage for the ALS oracle", () => {
    const lineage = evaluateAreaLightShadowPreviewTerrainSourceLineage(
      {
        status: "ready",
        entries: [
          {
            modelResRef: "tin01_d11_01",
            status: "ready",
            sourceObjectKey:
              "proof/placeable-lighting-vanilla-20260819/__aurora/sources/vanilla/models/tin01_d11_01.mdl",
            mdlSourceContentSha256: ALS_ORACLE_TILE_SOURCE_MDL_SHA256,
            modelAssetObjectKey:
              "proof/placeable-lighting-vanilla-20260819/__aurora/derived/models/aurora-mdl-to-glb_v18-source-proven-texture-aliases/tin01_d11_01.glb",
            modelAssetContentSha256: ALS_ORACLE_TILE_MODEL_ASSET_SHA256,
            materialTextureAssets: [
              {
                reference: "tin01_shpflr1",
                resref: "tin01_shpflr1",
                extension: "dds",
                source: "vanilla",
                objectKey:
                  "proof/placeable-lighting-vanilla-20260819/__aurora/sources/vanilla/textures/tin01_shpflr1.dds",
                contentSha256: ALS_ORACLE_TILE_TEXTURE_SHA256
              }
            ]
          }
        ]
      } as never,
      ALS_ORACLE_CAMPFIRE_FIXTURE_ID
    );

    expect(lineage).toMatchObject({
      status: "pass",
      blockerCodes: [],
      sourceModelHashes: [ALS_ORACLE_TILE_SOURCE_MDL_SHA256],
      modelAssetHashes: [ALS_ORACLE_TILE_MODEL_ASSET_SHA256],
      textureHashes: [ALS_ORACLE_TILE_TEXTURE_SHA256]
    });
  });

  it("blocks a CEP terrain receiver even when its resref matches the ALS oracle", () => {
    const lineage = evaluateAreaLightShadowPreviewTerrainSourceLineage(
      {
        status: "ready",
        entries: [
          {
            modelResRef: "tin01_d11_01",
            status: "ready",
            sourceObjectKey:
              "modules/current/__aurora/sources/hak/cep3_tiles/models/tin01_d11_01.mdl",
            mdlSourceContentSha256: "a".repeat(64),
            modelAssetObjectKey:
              "modules/current/__aurora/derived/models/aurora-mdl-to-glb_v18-source-proven-texture-aliases/tin01_d11_01.glb",
            modelAssetContentSha256: "b".repeat(64),
            materialTextureAssets: [
              {
                reference: "tin01_shpflr1",
                resref: "tin01_shpflr1",
                extension: "dds",
                source: "hak",
                objectKey:
                  "modules/current/__aurora/sources/hak/cep3_tiles/textures/tin01_shpflr1.dds",
                contentSha256: "c".repeat(64)
              }
            ]
          }
        ]
      } as never,
      ALS_ORACLE_CAMPFIRE_FIXTURE_ID
    );

    expect(lineage.status).toBe("blocked");
    expect(lineage.blockerCodes).toEqual(
      expect.arrayContaining([
        "ALS_ORACLE_TERRAIN_SOURCE_MDL_OBJECT_KEY_MISMATCH",
        "ALS_ORACLE_TERRAIN_SOURCE_MDL_HASH_MISMATCH",
        "ALS_ORACLE_TERRAIN_MODEL_ASSET_HASH_MISMATCH",
        "ALS_ORACLE_TERRAIN_TEXTURE_SOURCE_MISMATCH",
        "ALS_ORACLE_TERRAIN_TEXTURE_OBJECT_KEY_MISMATCH",
        "ALS_ORACLE_TERRAIN_TEXTURE_HASH_MISMATCH"
      ])
    );
  });

  it("exposes independently switchable placeable-lighting proof lanes", () => {
    window.history.replaceState(
      {},
      "",
      "/dev/area-light-shadow-preview?lightingReceiver=area&lightingPointLight=true&lightingHalo=false&lightingVfx=false&lightingShadow=false&lightingPostprocess=false"
    );

    render(<App />);

    const runner = screen.getByTestId("area-light-shadow-preview-runner");
    expect(runner).toHaveAttribute(
      "data-placeable-lighting-proof-profile-version",
      "aurora-placeable-lighting-proof-profile/v1"
    );
    expect(runner).toHaveAttribute("data-placeable-lighting-proof-receiver", "area");
    expect(runner).toHaveAttribute("data-placeable-lighting-proof-point-light", "true");
    expect(runner).toHaveAttribute("data-placeable-lighting-proof-halo", "false");
    expect(runner).toHaveAttribute("data-placeable-lighting-proof-vfx", "false");
    expect(runner).toHaveAttribute("data-placeable-lighting-proof-shadow", "false");
    expect(runner).toHaveAttribute("data-placeable-lighting-proof-postprocess", "false");
  });

  it("renders area proof frames through the shared runtime pipeline", () => {
    const update = vi.fn();
    const renderFrame = vi.fn();
    const runtime = {
      controls: { update }
    } as never;

    renderAreaLightShadowPreviewRuntime(runtime, renderFrame);

    expect(update).toHaveBeenCalledOnce();
    expect(renderFrame).toHaveBeenCalledWith(runtime);
  });

  it("exposes the live HDR/bloom diagnostics instead of trusting the postprocess query flag", () => {
    const getDiagnostics = vi.fn(() => ({ status: "active", threshold: 1 }));
    const readFrameEnergyDiagnostics = vi.fn(() => ({
      status: "readback-complete",
      stages: []
    }));
    const runtime = {
      renderer: { id: "renderer" },
      auroraRetailBloomPass: { getDiagnostics, readFrameEnergyDiagnostics }
    } as never;

    expect(readAreaLightShadowPreviewPostprocessDiagnostics(runtime)).toEqual({
      contract: { status: "active", threshold: 1 },
      frameEnergy: { status: "readback-complete", stages: [] }
    });
    expect(readFrameEnergyDiagnostics).toHaveBeenCalledWith(runtime.renderer);
  });

  it("fails placeable settlement until an expected texture is fully applied", () => {
    expect(
      isAreaLightShadowPreviewPlaceableTextureSettled({
        placeableModelStatus: "loaded",
        placeableModelTextureStatus: "loading",
        placeableModelTextureCount: "1",
        placeableModelTextureLoaded: "0"
      })
    ).toBe(false);

    expect(
      isAreaLightShadowPreviewPlaceableTextureSettled({
        placeableModelStatus: "loaded",
        placeableModelTextureStatus: "applied",
        placeableModelTextureCount: "2",
        placeableModelTextureLoaded: "1"
      })
    ).toBe(false);

    expect(
      isAreaLightShadowPreviewPlaceableTextureSettled({
        placeableModelStatus: "loaded",
        placeableModelTextureStatus: "applied",
        placeableModelTextureCount: "2",
        placeableModelTextureLoaded: "2"
      })
    ).toBe(true);
  });

  it("accepts a genuinely texture-free model only when it is explicitly not applicable", () => {
    expect(
      isAreaLightShadowPreviewPlaceableTextureSettled({
        placeableModelStatus: "loaded",
        placeableModelTextureStatus: "not-applicable",
        placeableModelTextureCount: "0",
        placeableModelTextureLoaded: "0"
      })
    ).toBe(true);
    expect(
      isAreaLightShadowPreviewPlaceableTextureSettled({
        placeableModelStatus: "loaded",
        placeableModelTextureStatus: "missing",
        placeableModelTextureCount: "0",
        placeableModelTextureLoaded: "0"
      })
    ).toBe(false);
  });

  it("hides editor-only axes and grid layers from full-terrain proof frames", () => {
    const runtime = {
      gridLayer: { visible: true },
      tileOverlayLayer: { visible: true },
      axesHelper: { visible: true }
    } as never;

    hideAreaLightShadowPreviewEditorLayers(runtime);

    expect(runtime.gridLayer.visible).toBe(false);
    expect(runtime.tileOverlayLayer.visible).toBe(false);
    expect(runtime.axesHelper.visible).toBe(false);
  });
});
