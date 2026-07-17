import { describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import {
  applyCatalogVfxEmitterObviousProofMode,
  applyCatalogVfxPreviewAreaShadowOpacityOverride,
  applyCatalogVfxPreviewLightStateOverride,
  applyCatalogVfxPreviewMaxLightsOverride,
  applyCatalogVfxPreviewShadowSizeOverride,
  applyCatalogVfxPreviewTextureSourceOverride,
  createCatalogVfxPreviewDebugState,
  frameCameraForEmitter,
  findSourceMdlPreviewGroup,
  loginForDevPreview,
  readCatalogVfxPreviewRouteRequest,
  readCatalogVfxPreviewStoredAccessToken,
  readEmitterDrawMetrics,
  rewriteCatalogVfxPreviewPayloadDeliveryUrls
} from "../../../../../src/modules/vfx/dev/CatalogVfxPreviewRunner";

describe("CatalogVfxPreviewRunner", () => {
  it("maps area-instance identity from the proof route into the placeable process request", () => {
    const request = readCatalogVfxPreviewRouteRequest(
      "?resref=tm_pl_lightred&subtype=vfx&appearanceType=332&genericType=0" +
        "&tag=VFXFlameLarge1&localizedName=Large%20Flame&emitterCameraDistanceScale=0.35"
    );

    expect(request).toMatchObject({
      templateId: "",
      resref: "tm_pl_lightred",
      subtypeHint: "vfx",
      appearanceType: 332,
      genericType: 0,
      tag: "VFXFlameLarge1",
      localizedName: "Large Flame",
      emitterCameraDistanceScale: 0.35
    });
  });

  it("rejects invalid area-instance numeric identity instead of coercing it", () => {
    const request = readCatalogVfxPreviewRouteRequest(
      "?resref=tm_pl_lightred&appearanceType=-1&genericType=2.5"
    );

    expect(request.appearanceType).toBeNull();
    expect(request.genericType).toBeNull();
  });

  it("uses a capture-seeded auth token before falling back to dev login", () => {
    const storage = {
      getItem: vi.fn(() =>
        JSON.stringify({
          session: {
            accessToken: " seeded-token "
          }
        })
      )
    };

    expect(readCatalogVfxPreviewStoredAccessToken(storage)).toBe("seeded-token");
    expect(storage.getItem).toHaveBeenCalledWith("aurora_web.auth_session.v1");
  });

  it("ignores malformed capture auth state", () => {
    expect(
      readCatalogVfxPreviewStoredAccessToken({
        getItem: vi.fn(() => "{")
      })
    ).toBeNull();
  });

  it("reuses a stored access token only when the backend confirms the session", async () => {
    window.localStorage.setItem(
      "aurora_web.auth_session.v1",
      JSON.stringify({ session: { accessToken: "valid-seeded-token" } })
    );
    const fetchFn = vi.fn(async () => new Response(null, { status: 200 }));

    await expect(loginForDevPreview("http://localhost:3000/api/v1", fetchFn)).resolves.toBe(
      "valid-seeded-token"
    );
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(fetchFn).toHaveBeenCalledWith(
      "http://localhost:3000/api/v1/auth/me",
      expect.objectContaining({
        headers: { Authorization: "Bearer valid-seeded-token" }
      })
    );
  });

  it("refreshes an expired stored access token through deterministic dev login", async () => {
    window.localStorage.setItem(
      "aurora_web.auth_session.v1",
      JSON.stringify({ session: { accessToken: "expired-seeded-token" } })
    );
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ data: { session: { accessToken: "fresh-dev-token" } } }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      );

    await expect(loginForDevPreview("http://localhost:3000/api/v1", fetchFn)).resolves.toBe(
      "fresh-dev-token"
    );
    expect(fetchFn).toHaveBeenNthCalledWith(
      2,
      "http://localhost:3000/api/v1/auth/login",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("frames the source-mdl emitter instead of leaving Magic Mouth tiny in the scene grid", () => {
    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 1000);
    camera.position.set(24, 22, 24);
    const target = new THREE.Vector3();
    const runtime = {
      camera,
      controls: {
        target,
        update: vi.fn()
      }
    } as unknown as Parameters<typeof frameCameraForEmitter>[0];
    const emitterGroup = new THREE.Group();
    emitterGroup.userData.auroraEmitterPackageSource = "source-mdl";
    const material = new THREE.MeshBasicMaterial();
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.4, 0.34), material);
    mesh.position.set(1.02, 0.04, 1);
    emitterGroup.add(mesh);

    frameCameraForEmitter(runtime, emitterGroup);

    expect(runtime.controls.update).toHaveBeenCalled();
    expect(target.x).toBeCloseTo(1.02, 2);
    expect(target.y).toBeCloseTo(0.04, 2);
    expect(target.z).toBeCloseTo(1, 2);
    expect(camera.position.distanceTo(target)).toBeLessThan(4);
    expect(camera.position.distanceTo(new THREE.Vector3(24, 22, 24))).toBeGreaterThan(20);
  });

  it("uses the requested close proof distance when framing obvious emitter videos", () => {
    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 1000);
    camera.position.set(24, 22, 24);
    const target = new THREE.Vector3();
    const runtime = {
      camera,
      controls: {
        target,
        update: vi.fn()
      }
    } as unknown as Parameters<typeof frameCameraForEmitter>[0];
    const root = new THREE.Group();
    const emitterGroup = new THREE.Group();
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.01, 0.01, 0.01),
      new THREE.MeshBasicMaterial()
    );
    emitterGroup.add(mesh);
    root.add(emitterGroup);

    expect(applyCatalogVfxEmitterObviousProofMode(root, emitterGroup, 0.2)).toBe(true);
    frameCameraForEmitter(runtime, emitterGroup);

    expect(emitterGroup.userData.catalogVfxEmitterProofDistanceScale).toBe(0.2);
    expect(camera.position.distanceTo(target)).toBeCloseTo(Math.sqrt(2.81) * 0.25, 3);
    expect(runtime.controls.update).toHaveBeenCalled();
  });

  it("selects the source-mdl multi-emitter parent instead of the first emitter child", () => {
    const root = new THREE.Group();
    const multiEmitterParent = new THREE.Group();
    const flameEmitter = new THREE.Group();
    const smokeEmitter = new THREE.Group();
    flameEmitter.userData.auroraEmitterPackageSource = "source-mdl";
    flameEmitter.userData.auroraEmitterNode = "OmenEmitter250";
    smokeEmitter.userData.auroraEmitterPackageSource = "source-mdl";
    smokeEmitter.userData.auroraEmitterNode = "fire!52";
    multiEmitterParent.add(flameEmitter, smokeEmitter);
    root.add(multiEmitterParent);

    expect(findSourceMdlPreviewGroup(root)).toBe(multiEmitterParent);
  });

  it("exposes visible emitter draw mesh and vertex metrics for visual evidence packets", () => {
    const emitterGroup = new THREE.Group();
    emitterGroup.userData.auroraEmitterPackageSource = "source-mdl";
    emitterGroup.userData.auroraEmitterType = "Fountain";
    emitterGroup.userData.auroraEmitterBlendMode = "Lighten";
    emitterGroup.userData.auroraEmitterRenderMode = "Normal";

    const visibleGeometry = new THREE.BufferGeometry();
    visibleGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(
        [
          -1, -1, 0,
          1, -1, 0,
          1, 1, 0,
          -1, -1, 0,
          1, 1, 0,
          -1, 1, 0
        ],
        3
      )
    );
    const visibleMesh = new THREE.Mesh(visibleGeometry, new THREE.MeshBasicMaterial());
    emitterGroup.add(visibleMesh);

    const hiddenGeometry = new THREE.BoxGeometry(1, 1, 1);
    const hiddenMesh = new THREE.Mesh(hiddenGeometry, new THREE.MeshBasicMaterial());
    hiddenMesh.visible = false;
    emitterGroup.add(hiddenMesh);

    const metrics = readEmitterDrawMetrics(emitterGroup);

    expect(metrics.drawParticles).toBe(1);
    expect(metrics.renderedVertices).toBe(6);
    expect(metrics.drawLanes).toEqual(["source-mdl", "Fountain", "Lighten", "Normal"]);
    expect(metrics.auroraLightNodes).toEqual([]);
    expect(metrics.auroraLightSourceNodeCount).toBe(0);
    expect(metrics.auroraLightAcceptedNodeCount).toBe(0);
    expect(metrics.auroraLightFlarePayloadNodeCount).toBe(0);
    expect(metrics.auroraLightFlareRadiusWriteUnverified).toBe(false);
    expect(metrics.auroraLightShadowCastCount).toBe(0);
    expect(metrics.auroraLightShadowProofStatuses).toEqual([]);
    expect(metrics.auroraLightAnimatedSourceRadius).toBeNull();
    expect(metrics.auroraLightQuadraticAtten).toBeNull();
    expect(metrics.auroraLightQuadraticAttenProofStatuses).toEqual([]);
    expect(metrics.auroraLightBudgetCap).toBeNull();
    expect(metrics.auroraLightBudgetHardCap).toBeNull();
    expect(metrics.auroraLightConfiguredMaxLights).toBeNull();
    expect(metrics.auroraLightBudgetStrategy).toBe("");
    expect(metrics.auroraLightBudgetStrategySource).toBe("");
    expect(metrics.auroraLightBudgetStrategyProofStatus).toBe("");
    expect(metrics.auroraLightPreviewMode).toBe("");
    expect(metrics.auroraLightSamples).toEqual([]);
  });

  it("exposes source-mdl light-node metrics for visual evidence packets", () => {
    const lightGroup = new THREE.Group();
    lightGroup.userData.auroraLightNodes = ["pulsing_light03"];
    lightGroup.userData.auroraLightSourceNodeCount = 1;
    lightGroup.userData.auroraLightAcceptedNodeCount = 1;
    lightGroup.userData.auroraLightFlarePayloadNodeCount = 1;
    lightGroup.userData.auroraLightFlareRadiusWriteUnverified = true;
    lightGroup.userData.auroraLightBudgetCap = 16;
    lightGroup.userData.auroraLightBudgetHardCap = 128;
    lightGroup.userData.auroraLightConfiguredMaxLights = 16;
    lightGroup.userData.auroraLightBudgetStrategy =
      "source-backed-retail-score-ascending-global-budget-preview-camera-fallback";
    lightGroup.userData.auroraLightBudgetStrategySource =
      "C:/Projects/New Folder/export/decompiled_all.c:865838-865929 FUN_00a41850 computes retail MDL light score at +0x84";
    lightGroup.userData.auroraLightBudgetStrategyProofStatus =
      "source-backed-retail-score-sort-slot-cap-preview-camera-field-fallback";
    lightGroup.userData.auroraLightPreviewMode = "source-mdl-light-node-preview";

    const core = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 4), new THREE.MeshBasicMaterial());
    core.userData.auroraLightNodeName = "pulsing_light03";
    lightGroup.add(core);
    const pointLight = new THREE.PointLight(0xffcc44, 1, 3, 2);
    pointLight.castShadow = true;
    pointLight.userData.auroraLightNodeName = "pulsing_light03";
    pointLight.userData.auroraLightShadowProofStatus =
      "source-backed-mdl-shadow-pointlight-castShadow";
    pointLight.userData.auroraLightSourceRadius = 3;
    pointLight.userData.auroraLightSourceRadiusUnits = "aurora-model-units";
    pointLight.userData.auroraLightSourceUnitScale = 1;
    pointLight.userData.auroraLightSourceRadiusWorldDistance = 3;
    pointLight.userData.auroraLightAnimatedSourceRadius = 3;
    pointLight.userData.auroraLightQuadraticAtten = 0.5;
    pointLight.userData.auroraLightQuadraticAttenProofStatus =
      "source-backed-mdl-radius-quadratic-attenuation";
    lightGroup.add(pointLight);

    const metrics = readEmitterDrawMetrics(lightGroup);

    expect(metrics.drawParticles).toBe(1);
    expect(metrics.renderedVertices).toBeGreaterThan(0);
    expect(metrics.drawLanes).toEqual([]);
    expect(metrics.auroraLightNodes).toEqual(["pulsing_light03"]);
    expect(metrics.auroraLightSourceNodeCount).toBe(1);
    expect(metrics.auroraLightAcceptedNodeCount).toBe(1);
    expect(metrics.auroraLightFlarePayloadNodeCount).toBe(1);
    expect(metrics.auroraLightFlareRadiusWriteUnverified).toBe(true);
    expect(metrics.auroraLightShadowCastCount).toBe(1);
    expect(metrics.auroraLightShadowProofStatuses).toEqual([
      "source-backed-mdl-shadow-pointlight-castShadow"
    ]);
    expect(metrics.auroraLightAnimatedSourceRadius).toBe(3);
    expect(metrics.auroraLightQuadraticAtten).toBe(0.5);
    expect(metrics.auroraLightQuadraticAttenProofStatuses).toEqual([
      "source-backed-mdl-radius-quadratic-attenuation"
    ]);
    expect(metrics.auroraLightBudgetCap).toBe(16);
    expect(metrics.auroraLightBudgetHardCap).toBe(128);
    expect(metrics.auroraLightConfiguredMaxLights).toBe(16);
    expect(metrics.auroraLightBudgetStrategy).toBe(
      "source-backed-retail-score-ascending-global-budget-preview-camera-fallback"
    );
    expect(metrics.auroraLightBudgetStrategySource).toContain("FUN_00a41850");
    expect(metrics.auroraLightBudgetStrategyProofStatus).toBe(
      "source-backed-retail-score-sort-slot-cap-preview-camera-field-fallback"
    );
    expect(metrics.auroraLightPreviewMode).toBe("source-mdl-light-node-preview");
    expect(metrics.auroraLightSamples).toEqual([
      expect.stringContaining(
        "role=unknown;node=pulsing_light03;color=1,0.6038,0.0578;intensity=1;distance=3;castShadow=true"
      )
    ]);
    expect(metrics.auroraLightSamples[0]).toContain(
      "quadraticProof=source-backed-mdl-radius-quadratic-attenuation"
    );
    expect(metrics.auroraLightSamples[0]).toContain(
      "sourceRadius=3;sourceRadiusUnits=aurora-model-units;sourceUnitScale=1;sourceWorldDistance=3"
    );
    expect(metrics.auroraLightSamples[0]).toContain(
      "shadowProof=source-backed-mdl-shadow-pointlight-castShadow"
    );
  });

  it("applies a dev-only LightState override without mutating the fetched payload", () => {
    const payload = {
      templateId: "plc_plc_i06",
      cacheKey: "cache",
      cacheHit: false,
      storedAt: "2026-07-01T00:00:00.000Z",
      hits: 0,
      placeable: {
        templateId: "plc_plc_i06",
        resref: "plc_i06",
        name: "Campfire",
        category: "light_source",
        placeableSubtype: "light_source",
        metadata: {
          source2daLightColorRaw: "6"
        },
        render: {
          frontendType: "model",
          isVfx: false,
          status: "ready",
          diagnostics: []
        },
        assetManifest: {
          version: "placeable-asset-manifest/v1",
          source: "module-blob-snapshot",
          generatedAt: "2026-07-01T00:00:00.000Z",
          assetCount: 0,
          candidatesScanned: 0,
          assets: []
        }
      },
      assetContracts: {
        assets: []
      }
    } as Parameters<typeof applyCatalogVfxPreviewLightStateOverride>[0];

    const overridden = applyCatalogVfxPreviewLightStateOverride(payload, 0);

    expect(overridden).not.toBe(payload);
    expect(overridden.placeable.placeableRuntime?.state?.lightState).toBe(0);
    expect(overridden.placeable.metadata?.lightState).toBe(0);
    expect(overridden.placeable.metadata?.lightStateOverrideSource).toBe(
      "dev-catalog-vfx-preview-query"
    );
    expect(payload.placeable.placeableRuntime).toBeUndefined();
    expect(payload.placeable.metadata?.lightState).toBeUndefined();
    expect(applyCatalogVfxPreviewLightStateOverride(payload, null)).toBe(payload);
  });

  it("applies a dev-only ShadowSize override as local diagnostic metadata", () => {
    const payload = {
      templateId: "plc_plc_i06",
      cacheKey: "cache",
      cacheHit: false,
      storedAt: "2026-07-01T00:00:00.000Z",
      hits: 0,
      placeable: {
        templateId: "plc_plc_i06",
        resref: "plc_i06",
        name: "Campfire",
        category: "light_source",
        placeableSubtype: "light_source",
        metadata: {
          source2daLightColorRaw: "6",
          source2daShadowSize: 1
        },
        render: {
          frontendType: "model",
          isVfx: false,
          status: "ready",
          diagnostics: []
        },
        assetManifest: {
          version: "placeable-asset-manifest/v1",
          source: "module-blob-snapshot",
          generatedAt: "2026-07-01T00:00:00.000Z",
          assetCount: 0,
          candidatesScanned: 0,
          assets: []
        }
      },
      assetContracts: {
        assets: []
      }
    } as Parameters<typeof applyCatalogVfxPreviewShadowSizeOverride>[0];

    const overridden = applyCatalogVfxPreviewShadowSizeOverride(payload, 2.9);

    expect(overridden).not.toBe(payload);
    expect(overridden.placeable.metadata?.source2daShadowSize).toBe(2);
    expect(overridden.placeable.metadata?.source2daShadowSizeOverrideSource).toBe(
      "dev-catalog-vfx-preview-query-shadowSize-local-diagnostic-override"
    );
    expect(overridden.placeable.metadata?.source2daShadowSizeOverrideProofStatus).toBe(
      "local-diagnostic-shadowsize-override-source-backed-retail-selection-rule"
    );
    expect(payload.placeable.metadata?.source2daShadowSize).toBe(1);
    expect(applyCatalogVfxPreviewShadowSizeOverride(payload, null)).toBe(payload);
  });

  it("rewrites dev proof payload asset URLs to a direct backend API base", () => {
    window.history.replaceState({}, "", "/dev/catalog-vfx-preview");
    const payload = {
      templateId: "plc_plc_i06",
      cacheKey: "cache",
      cacheHit: false,
      storedAt: "2026-07-07T00:00:00.000Z",
      hits: 0,
      placeable: {
        templateId: "plc_plc_i06",
        resref: "plc_i06",
        name: "Campfire",
        category: "light_source",
        placeableSubtype: "light_source",
        metadata: {},
        render: {
          frontendType: "placeable",
          isVfx: false,
          status: "ready",
          diagnostics: []
        },
        assetManifest: {
          version: "placeable-asset-manifest/v1",
          source: "module-blob-snapshot",
          generatedAt: "2026-07-07T00:00:00.000Z",
          assetCount: 1,
          candidatesScanned: 1,
          assets: [
            {
              assetId: "asset-glb",
              role: "model",
              fileName: "plc_i06.glb",
              objectKey: "objects/plc_i06.glb",
              extension: "glb",
              sizeBytes: 1,
              contentType: "model/gltf-binary"
            }
          ]
        }
      },
      renderPackage: {
        status: "ready",
        diagnostics: [],
        assetRefs: {
          modelAssetIds: ["asset-glb"],
          textureAssetIds: ["asset-tex"],
          derivedModelAssetIds: ["asset-glb"],
          chunkModelAssetIds: [],
          sourceModelAssetIds: []
        },
        glbUrl: "/_aurora/v1/catalog/placeables/cache/cache/assets/asset-glb.glb",
        modelUrl: "/api/v1/catalog/placeables/cache/cache/assets/asset-glb.glb",
        textureUrls: ["/api/v1/catalog/placeables/cache/cache/assets/asset-tex.tga"],
        textureBindings: [
          {
            reference: "plc_i06",
            assetId: "asset-tex",
            fileName: "plc_i06.tga",
            objectKey: "objects/plc_i06.tga",
            deliveryUrl: "/_aurora/v1/catalog/placeables/cache/cache/assets/asset-tex.tga"
          }
        ]
      },
      assetContracts: {
        cacheKey: "cache",
        moduleHash: "module",
        assets: [
          {
            assetId: "asset-glb",
            objectKey: "objects/plc_i06.glb",
            contentType: "model/gltf-binary",
            sizeBytes: 1,
            deliveryPath: "/api/v1/catalog/placeables/cache/cache/assets/asset-glb.glb",
            deliveryUrl: "/_aurora/v1/catalog/placeables/cache/cache/assets/asset-glb.glb"
          }
        ]
      }
    } as Parameters<typeof rewriteCatalogVfxPreviewPayloadDeliveryUrls>[0];

    const rewritten = rewriteCatalogVfxPreviewPayloadDeliveryUrls(
      payload,
      "http://127.0.0.1:3000/api/v1"
    );

    expect(rewritten).not.toBe(payload);
    expect(rewritten.renderPackage?.glbUrl).toBe(
      "http://127.0.0.1:3000/api/v1/catalog/placeables/cache/cache/assets/asset-glb.glb"
    );
    expect(rewritten.renderPackage?.modelUrl).toBe(
      "http://127.0.0.1:3000/api/v1/catalog/placeables/cache/cache/assets/asset-glb.glb"
    );
    expect(rewritten.renderPackage?.textureUrls).toEqual([
      "http://127.0.0.1:3000/api/v1/catalog/placeables/cache/cache/assets/asset-tex.tga"
    ]);
    expect(rewritten.renderPackage?.textureBindings?.[0]?.deliveryUrl).toBe(
      "http://127.0.0.1:3000/api/v1/catalog/placeables/cache/cache/assets/asset-tex.tga"
    );
    expect(rewritten.assetContracts.assets[0]?.deliveryUrl).toBe(
      "http://127.0.0.1:3000/api/v1/catalog/placeables/cache/cache/assets/asset-glb.glb"
    );
    expect(payload.renderPackage?.glbUrl).toContain("/_aurora/v1/");
  });

  it("reorders duplicate texture bindings by requested dev proof source without changing reference order", () => {
    const payload = {
      templateId: "plc_plc_i06",
      cacheKey: "cache",
      cacheHit: false,
      storedAt: "2026-07-07T00:00:00.000Z",
      hits: 0,
      placeable: {
        templateId: "plc_plc_i06",
        resref: "plc_i06",
        name: "Campfire",
        category: "light_source",
        placeableSubtype: "light_source",
        metadata: {},
        render: {
          frontendType: "placeable",
          isVfx: false,
          status: "ready",
          diagnostics: []
        },
        assetManifest: {
          version: "placeable-asset-manifest/v1",
          source: "module-blob-snapshot",
          generatedAt: "2026-07-07T00:00:00.000Z",
          assetCount: 3,
          candidatesScanned: 3,
          assets: []
        }
      },
      renderPackage: {
        status: "ready",
        diagnostics: [],
        assetRefs: {
          modelAssetIds: [],
          textureAssetIds: ["hak-flame", "vanilla-flame", "smoke"],
          derivedModelAssetIds: [],
          chunkModelAssetIds: [],
          sourceModelAssetIds: []
        },
        textureUrls: ["hak-flame-url", "vanilla-flame-url", "smoke-url"],
        textureBindings: [
          {
            reference: "fxpa_flame00",
            assetId: "hak-flame",
            fileName: "fxpa_flame00.tga",
            objectKey: "modules/current/__aurora/sources/hak/cep3_vfx/fxpa_flame00.tga",
            deliveryUrl: "hak-flame-url"
          },
          {
            reference: "fxpa_flame00",
            assetId: "vanilla-flame",
            fileName: "fxpa_flame00.tga",
            objectKey: "modules/current/__aurora/sources/vanilla/textures/fxpa_flame00.tga",
            deliveryUrl: "vanilla-flame-url"
          },
          {
            reference: "fxpa_smoke01",
            assetId: "smoke",
            fileName: "fxpa_smoke01.tga",
            objectKey: "modules/current/__aurora/sources/hak/cep3_vfx/fxpa_smoke01.tga",
            deliveryUrl: "smoke-url"
          }
        ]
      },
      assetContracts: {
        assets: []
      }
    } as Parameters<typeof applyCatalogVfxPreviewTextureSourceOverride>[0];

    const rewritten = applyCatalogVfxPreviewTextureSourceOverride(payload, "vanilla");

    expect(rewritten).not.toBe(payload);
    expect(rewritten.renderPackage?.textureBindings?.map((binding) => binding.assetId)).toEqual([
      "vanilla-flame",
      "hak-flame",
      "smoke"
    ]);
    expect(rewritten.renderPackage?.textureUrls).toEqual([
      "vanilla-flame-url",
      "hak-flame-url",
      "smoke-url"
    ]);
    expect(rewritten.renderPackage?.diagnostics).toEqual([
      expect.objectContaining({
        code: "CATALOG_VFX_PREVIEW_TEXTURE_SOURCE_OVERRIDE",
        severity: "warn"
      })
    ]);
    expect(payload.renderPackage?.textureBindings?.[0]?.assetId).toBe("hak-flame");
    expect(applyCatalogVfxPreviewTextureSourceOverride(payload, null)).toBe(payload);
  });

  it("applies a dev-only ARE ShadowOpacity override through terrain scene userData", () => {
    const runtime = {
      scene: new THREE.Scene()
    } as Parameters<typeof applyCatalogVfxPreviewAreaShadowOpacityOverride>[0];

    applyCatalogVfxPreviewAreaShadowOpacityOverride(runtime, 50);

    expect(runtime.scene.userData.auroraTerrainAreaGlobalShadowOpacity).toBe(50);
    expect(runtime.scene.userData.auroraTerrainAreaGlobalShadowOpacitySource).toBe(
      "ARE.ShadowOpacity read/write at decompiled_all.c:255224/255904; normalized to shadowOpacity/100 at decompiled_all.c:256306"
    );
    expect(runtime.scene.userData.auroraTerrainAreaGlobalShadowOpacityFactor).toBe(0.5);
    expect(runtime.scene.userData.auroraTerrainAreaGlobalShadowOpacityFactorSource).toBe(
      "decompiled_all.c:256306 stores ShadowOpacity/100, then shadow plane alpha multiplies that factor at decompiled_all.c:910844"
    );

    applyCatalogVfxPreviewAreaShadowOpacityOverride(runtime, null);
    expect(runtime.scene.userData.auroraTerrainAreaGlobalShadowOpacity).toBe(50);
  });

  it("applies a dev-only MDL light max-lights override through scene userData", () => {
    const runtime = {
      scene: new THREE.Scene()
    } as Parameters<typeof applyCatalogVfxPreviewMaxLightsOverride>[0];

    applyCatalogVfxPreviewMaxLightsOverride(runtime, 16.8);

    expect(runtime.scene.userData.auroraLightConfiguredMaxLights).toBe(16);

    applyCatalogVfxPreviewMaxLightsOverride(runtime, null);
    expect(runtime.scene.userData.auroraLightConfiguredMaxLights).toBe(16);
  });

  it("applies dev-only light and shadow debug overrides for catalog proof routes", () => {
    const defaults = createCatalogVfxPreviewDebugState({
      useAreaLightingOverride: null,
      displayShadowsOverride: null
    });
    expect(defaults.useAreaLighting).toBe(true);
    expect(defaults.displayShadows).toBe(true);

    const overridden = createCatalogVfxPreviewDebugState({
      useAreaLightingOverride: false,
      displayShadowsOverride: false
    });
    expect(overridden.useAreaLighting).toBe(false);
    expect(overridden.displayShadows).toBe(false);
  });
});
