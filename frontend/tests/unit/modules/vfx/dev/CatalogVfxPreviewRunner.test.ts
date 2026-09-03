import { describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import {
  applyCatalogVfxEmitterObviousProofMode,
  applyCatalogVfxPreviewAreaShadowOpacityOverride,
  applyCatalogVfxPreviewLightStateOverride,
  applyCatalogVfxPreviewMaxLightsOverride,
  applyCatalogVfxPreviewShadowSizeOverride,
  applyCatalogVfxPreviewTextureSourceOverride,
  buildCatalogVfxExpectedRuntimeAssets,
  createCatalogVfxPreviewDebugState,
  findPlaceableSourceStaticGraphCenter,
  findPlaceableStaticGeometryCenter,
  frameCameraForEmitter,
  findSourceMdlPreviewGroup,
  loginForDevPreview,
  readCatalogVfxPreviewRouteRequest,
  readCatalogVfxPreviewStoredAccessToken,
  readEmitterDrawMetrics,
  readNumericUserData,
  rewriteCatalogVfxPreviewPayloadDeliveryUrls
} from "../../../../../src/modules/vfx/dev/CatalogVfxPreviewRunner";

describe("CatalogVfxPreviewRunner", () => {
  it("reads finite numeric values from runtime dataset strings", () => {
    expect(readNumericUserData("12")).toBe(12);
    expect(readNumericUserData(" 3.5 ")).toBe(3.5);
    expect(readNumericUserData("")).toBeNull();
    expect(readNumericUserData("loading")).toBeNull();
    expect(readNumericUserData(Number.POSITIVE_INFINITY)).toBeNull();
  });

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

  it("supports whole-placeable framing without changing the source-MDL emitter default", () => {
    expect(
      readCatalogVfxPreviewRouteRequest("?resref=tm_pl_lightred&emitterCameraTarget=placeable")
        .emitterCameraTarget
    ).toBe("placeable");
    expect(readCatalogVfxPreviewRouteRequest("?resref=tm_pl_lightred").emitterCameraTarget).toBe(
      "source-mdl"
    );
  });

  it("targets static placeable geometry without letting a tall canonical VFX draw shift the center", () => {
    const root = new THREE.Group();
    const placeable = new THREE.Mesh(
      new THREE.BoxGeometry(1, 0.4, 1),
      new THREE.MeshBasicMaterial()
    );
    placeable.name = "Plane25";
    placeable.position.set(1, 0.2, 1);
    const unrelatedProxy = new THREE.Mesh(
      new THREE.BoxGeometry(4, 12, 4),
      new THREE.MeshBasicMaterial()
    );
    unrelatedProxy.name = "proof-helper";
    unrelatedProxy.position.set(1, 6, 1);
    const playback = new THREE.Group();
    playback.userData.auroraVfxCanonicalRuntimePlayback = true;
    const particles = new THREE.Mesh(
      new THREE.BoxGeometry(2, 12, 2),
      new THREE.MeshBasicMaterial()
    );
    particles.position.set(1, 6, 1);
    playback.add(particles);
    placeable.add(playback);
    root.add(placeable, unrelatedProxy);

    expect(findPlaceableStaticGeometryCenter(root, ["Rectangle121", "Plane25"])?.toArray()).toEqual([
      expect.closeTo(1, 6),
      expect.closeTo(0.2, 6),
      expect.closeTo(1, 6)
    ]);
  });

  it("maps source static-node centers from Aurora z-up into the placeable scene root", () => {
    const root = new THREE.Group();
    root.position.set(1, 0, 1);

    expect(
      findPlaceableSourceStaticGraphCenter(root, [
        { transform: { position: [-0.03, -0.006, 0] } },
        { transform: { position: [-0.006, -0.002, 0.02] } }
      ])?.toArray()
    ).toEqual([
      expect.closeTo(0.982, 6),
      expect.closeTo(0.01, 6),
      expect.closeTo(0.996, 6)
    ]);
  });

  it("uses the neutral backdrop only when the proof route asks for it", () => {
    expect(
      readCatalogVfxPreviewRouteRequest("?resref=tm_pl_lightred&proofBackdrop=neutral")
        .previewBackdrop
    ).toBe("neutral");
    expect(readCatalogVfxPreviewRouteRequest("?resref=tm_pl_lightred").previewBackdrop).toBe(
      "default"
    );
  });

  it("gates the structured VFX debug overlay to the explicit development profile", () => {
    expect(
      readCatalogVfxPreviewRouteRequest(
        "?resref=tm_pl_lightred&vfxDebugOverlay=true&debugProfile=development"
      )
    ).toEqual(
      expect.objectContaining({ vfxDebugOverlay: true, debugProfile: "development" })
    );
    expect(
      readCatalogVfxPreviewRouteRequest(
        "?resref=tm_pl_lightred&vfxDebugOverlay=true&debugProfile=final"
      )
    ).toEqual(expect.objectContaining({ vfxDebugOverlay: true, debugProfile: "final" }));
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

  it("routes absolute backend asset URLs through the same-origin dev proxy", () => {
    const payload = {
      renderPackage: {
        modelUrl:
          "http://127.0.0.1:3000/api/v1/catalog/placeables/cache/cache/assets/model.glb",
        textureUrls: [
          "http://127.0.0.1:3000/api/v1/catalog/placeables/cache/cache/assets/texture.dds"
        ]
      }
    } as Parameters<typeof rewriteCatalogVfxPreviewPayloadDeliveryUrls>[0];

    const rewritten = rewriteCatalogVfxPreviewPayloadDeliveryUrls(payload, "/_aurora/v1");

    expect(rewritten.renderPackage?.modelUrl).toBe(
      "/_aurora/v1/catalog/placeables/cache/cache/assets/model.glb"
    );
    expect(rewritten.renderPackage?.textureUrls).toEqual([
      "/_aurora/v1/catalog/placeables/cache/cache/assets/texture.dds"
    ]);
  });

  it("registers only renderer delivery assets in the VFX settlement ledger", () => {
    const payload = {
      cacheKey: "cache-vfx",
      placeable: {
        assetManifest: {
          assets: [
            {
              assetId: "model-id",
              role: "model",
              fileName: "campfire.glb",
              objectKey: "derived/campfire.glb"
            },
            {
              assetId: "texture-id",
              role: "texture",
              fileName: "fxpa_flame00.tga",
              objectKey: "textures/fxpa_flame00.tga"
            },
            {
              assetId: "source-id",
              role: "source",
              fileName: "placeables.2da",
              objectKey: "sources/placeables.2da"
            }
          ]
        }
      },
      renderPackage: {
        status: "ready",
        glbUrl: "/_aurora/v1/catalog/placeables/cache/cache-vfx/assets/model-id.glb",
        textureUrls: [
          "/_aurora/v1/catalog/placeables/cache/cache-vfx/assets/texture-id.tga"
        ],
        textureBindings: [],
        assetRefs: {
          derivedModelAssetIds: [],
          modelAssetIds: [],
          textureAssetIds: ["texture-id"],
          chunkModelAssetIds: []
        }
      },
      assetContracts: {
        cacheKey: "cache-vfx",
        moduleHash: "module-hash",
        assets: [
          {
            assetId: "source-id",
            contentType: "application/octet-stream",
            deliveryPath: "",
            deliveryUrl:
              "http://127.0.0.1:8888/buckets/aurora-module-assets/modules/current/sources/placeables.2da"
          }
        ]
      }
    } as Parameters<typeof buildCatalogVfxExpectedRuntimeAssets>[0];

    const assets = buildCatalogVfxExpectedRuntimeAssets(payload);

    expect(assets).toHaveLength(2);
    expect(assets.map((asset) => asset.kind).sort()).toEqual(["model", "texture"]);
    expect(assets.map((asset) => asset.key)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("/assets/model-id.glb"),
        expect.stringContaining("/assets/texture-id.tga")
      ])
    );
    expect(assets.some((asset) => asset.key.includes("placeables.2da"))).toBe(false);
  });

  it("does not expect a resolved chunk model while its canonical lane has no active particles", () => {
    const payload = {
      placeable: {
        assetManifest: {
          assets: [
            {
              assetId: "inactive-chunk-model",
              role: "model",
              fileName: "plc_chunk_w01.glb",
              objectKey: "derived/plc_chunk_w01.glb"
            }
          ]
        }
      },
      renderPackage: {
        assetRefs: {
          modelAssetIds: [],
          derivedModelAssetIds: [],
          textureAssetIds: [],
          chunkModelAssetIds: ["inactive-chunk-model"]
        },
        auroraVfxPayload: {
          contracts: {
            renderContract: {
              version: "aurora-vfx-runtime-render-contract/v1",
              drawLane: "chunk_model",
              activeParticleCount: 0,
              chunkLane: {
                lane: "chunk_model",
                activeParticleCount: 0,
                resourceResolveStatus: "resolved",
                resolvedResource: { resourceKey: "plc_chunk_w01.glb" }
              }
            }
          }
        }
      },
      assetContracts: {
        assets: [
          {
            assetId: "inactive-chunk-model",
            deliveryUrl: "/assets/inactive-chunk-model.glb"
          }
        ]
      }
    } as unknown as Parameters<typeof buildCatalogVfxExpectedRuntimeAssets>[0];

    expect(buildCatalogVfxExpectedRuntimeAssets(payload)).toEqual([]);
  });

  it("expects the exact resolved chunk model while its canonical lane is active", () => {
    const payload = {
      placeable: {
        assetManifest: {
          assets: [
            {
              assetId: "active-chunk-model",
              role: "model",
              fileName: "plc_chunk_w01.glb",
              objectKey: "derived/plc_chunk_w01.glb"
            },
            {
              assetId: "inactive-chunk-model",
              role: "model",
              fileName: "plc_chunk_w02.glb",
              objectKey: "derived/plc_chunk_w02.glb"
            }
          ]
        }
      },
      renderPackage: {
        assetRefs: {
          modelAssetIds: [],
          derivedModelAssetIds: [],
          textureAssetIds: [],
          chunkModelAssetIds: ["active-chunk-model", "inactive-chunk-model"]
        },
        auroraVfxPayload: {
          contracts: {
            renderContract: {
              version: "aurora-vfx-runtime-render-contract/v1",
              drawLane: "chunk_model",
              activeParticleCount: 1,
              chunkLane: {
                lane: "chunk_model",
                activeParticleCount: 1,
                resourceResolveStatus: "resolved",
                resolvedResource: { resourceKey: "plc_chunk_w01.glb" }
              }
            }
          }
        }
      },
      assetContracts: {
        assets: [
          {
            assetId: "active-chunk-model",
            deliveryUrl: "/assets/active-chunk-model.glb"
          },
          {
            assetId: "inactive-chunk-model",
            deliveryUrl: "/assets/inactive-chunk-model.glb"
          }
        ]
      }
    } as unknown as Parameters<typeof buildCatalogVfxExpectedRuntimeAssets>[0];

    expect(buildCatalogVfxExpectedRuntimeAssets(payload)).toEqual([
      expect.objectContaining({
        kind: "chunk-model",
        reference: "active-chunk-model"
      })
    ]);
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
