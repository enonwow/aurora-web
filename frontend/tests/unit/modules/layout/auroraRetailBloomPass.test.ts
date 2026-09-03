import * as THREE from "three";
import { describe, expect, it } from "vitest";
import row216Presentation from "../../../../public/dev-fixtures/vfx-broad-row216/presentation-profile.json";
import {
  AURORA_RETAIL_CAPTURE_LIGHT_CUTOFF_RANGE_MULTIPLIER,
  AURORA_RETAIL_BLOOM_DEFAULT_PROFILE,
  AURORA_RETAIL_POSTPROCESS_DEFAULT_PROFILE,
  AURORA_RETAIL_SSAO_DEFAULT_PROFILE,
  AuroraRetailBloomPass,
  collectAuroraMtrFramebufferRenderPlan,
  collectAuroraRawGammaVfxRenderPlan,
  resolveAuroraRetailDynamicContrastSceneState,
  resolveAuroraRetailDynamicContrastMidpoint,
  resolveAuroraRetailDynamicContrastSourcePointLightContribution,
  resolveAuroraRetailBloomLevelSizes,
  resolveAuroraRetailBloomNormalizationFactor,
  resolveAuroraRetailColorCorrectionType4,
  resolveAuroraRetailParticleFogFrameState
} from "../../../../src/modules/layout/adapters/three/auroraRetailBloomPass";
import { materializeVfxPresentationProfile } from "../../../../src/modules/vfx/domain/vfxIdentityNeutralProfiles";

describe("AuroraRetailBloomPass source contract", () => {
  it("uses the approved nwtoolset.exe default bloom profile", () => {
    expect(AURORA_RETAIL_BLOOM_DEFAULT_PROFILE).toEqual({
      downscaleOffset: 0,
      downscaleSteps: 7,
      threshold: 1,
      softness: 0.9,
      multiplier: 1
    });
  });

  it("uses the admitted retail SSAO profile and active source lineage", () => {
    expect(AURORA_RETAIL_SSAO_DEFAULT_PROFILE).toEqual({
      enabled: true,
      intensity: 0.5,
      shaderQualityMode: 1,
      angularFidelity: 8,
      rangeFidelity: 6,
      range: 30,
      nearFade: 0.135,
      occlusionDarkness: 0.15,
      exposureHighlightIntensity: 0.075,
      exposureOcclusionRatio: 4,
      fragmentSourceSha256:
        "98674a357fea91fbcec331a84eb66e0f60b4bfa3bee4d304560d0116ddb774bf",
      includeSourceSha256:
        "944c76f59f7e9bcaaae1d9f66a1f2b83cb57bed116fad2ee4ee06910f3f04671",
      framebufferSourceSha256:
        "4779a9fe01a4419a8a1e394ffddd095d9bbda743e2476277ebc38add23421686",
      vertexSourceSha256:
        "f68bed245a280f4e7c34189693c397942dea4a45fea906e5273222cb843a82c1"
    });
  });

  it("installs the recovered three-pass SSAO contract before raw-gamma VFX", () => {
    const pass = new AuroraRetailBloomPass();
    const runtime = pass as unknown as {
      ssaoModifierTarget: THREE.WebGLRenderTarget;
      ssaoBlurTarget: THREE.WebGLRenderTarget;
      ssaoSceneTarget: THREE.WebGLRenderTarget;
      ssaoModifierMaterial: THREE.ShaderMaterial;
      ssaoBlurMaterial: THREE.ShaderMaterial;
      ssaoApplyMaterial: THREE.ShaderMaterial;
    };

    expect(runtime.ssaoModifierTarget).toBeInstanceOf(THREE.WebGLRenderTarget);
    expect(runtime.ssaoBlurTarget).toBeInstanceOf(THREE.WebGLRenderTarget);
    expect(runtime.ssaoSceneTarget).toBeInstanceOf(THREE.WebGLRenderTarget);
    expect(runtime.ssaoModifierMaterial.fragmentShader).toContain(
      "ssaoProbeAngle(7, state)"
    );
    expect(runtime.ssaoModifierMaterial.fragmentShader).toContain(
      "ssaoProbeRange(probe, state)"
    );
    expect(runtime.ssaoBlurMaterial.fragmentShader).toContain("modifier /= 14.0");
    expect(runtime.ssaoApplyMaterial.fragmentShader).toContain(
      "sceneColor.rgb * modifier"
    );
    expect(pass.getDiagnostics()).toMatchObject({
      ssaoConfiguredEnabled: true,
      ssaoRuntimeStatus: "pending-perspective-camera",
      ssaoIntensity: 0.5,
      ssaoShaderQualityMode: 1,
      ssaoPassCount: 3,
      ssaoBlendSourceFactor: "GL_ZERO",
      ssaoBlendDestinationFactor: "GL_SRC_ALPHA",
      ssaoStageOrder: [
        "opaque_scene",
        "ssao_modifier",
        "ssao_diagonal_blur_1",
        "ssao_diagonal_blur_2_multiply",
        "later_vfx_buckets"
      ]
    });
    pass.dispose();
  });

  it("builds the seven source-backed bit-shift levels", () => {
    expect(resolveAuroraRetailBloomLevelSizes(960, 540)).toEqual([
      { width: 480, height: 270 },
      { width: 240, height: 135 },
      { width: 120, height: 67 },
      { width: 60, height: 33 },
      { width: 30, height: 16 },
      { width: 15, height: 8 },
      { width: 7, height: 4 }
    ]);
  });

  it("normalizes the geometric softness sequence used by the retail apply pass", () => {
    const expected =
      (AURORA_RETAIL_BLOOM_DEFAULT_PROFILE.softness - 1) /
      (AURORA_RETAIL_BLOOM_DEFAULT_PROFILE.softness ** 8 - 1);

    expect(resolveAuroraRetailBloomNormalizationFactor()).toBeCloseTo(expected, 12);
  });

  it("derives the row216 dynamic-contrast lower bound from the captured area fields", () => {
    const capturedProfile = materializeVfxPresentationProfile(row216Presentation)
      .postprocessProfile;
    const midpoint = resolveAuroraRetailDynamicContrastMidpoint({
      areaAmbientGamma: [60 / 255, 60 / 255, 60 / 255],
      areaDiffuseGamma: [170 / 255, 170 / 255, 170 / 255],
      areaDiffuseDirectionZ: 0,
      dynamicContrastMidpoint: 0.4000000059604645,
      fogColorGamma: [0, 0, 0],
      fogStart: 25 - (5 * 25) / 15,
      fogEnd: 45
    });

    expect(midpoint).toBeCloseTo(capturedProfile?.dynamicContrastMidpoint ?? -1, 12);
    expect(capturedProfile).toMatchObject({
      sharpenEnabled: true,
      dynamicContrastEnabled: true,
      dynamicContrastInputMode: "static",
      dynamicContrastIntensity: 0.15000000596046448,
      vibranceEnabled: true,
      vibrance: 0.699999988079071,
      fogStart: 25 - (5 * 25) / 15,
      fogEnd: 45
    });
  });

  it("keeps the approved postprocess settings active but resolves workspace midpoint from scene inputs", () => {
    expect(AURORA_RETAIL_POSTPROCESS_DEFAULT_PROFILE).toMatchObject({
      sharpenEnabled: true,
      dynamicContrastEnabled: true,
      dynamicContrastInputMode: "scene-area",
      dynamicContrastIntensity: 0.15000000596046448,
      dynamicContrastMidpoint: 0.4000000059604645,
      vibranceEnabled: true,
      vibrance: 0.699999988079071
    });
  });

  it("keeps independent scene and raw-gamma depth attachments", () => {
    const pass = new AuroraRetailBloomPass();
    const targets = pass as unknown as {
      sceneTarget: THREE.WebGLRenderTarget;
      rawGammaVfxCompositeTarget: THREE.WebGLRenderTarget;
    };

    expect(targets.sceneTarget.depthTexture).toBeInstanceOf(THREE.DepthTexture);
    expect(targets.rawGammaVfxCompositeTarget.depthTexture).toBeInstanceOf(
      THREE.DepthTexture
    );
    expect(targets.rawGammaVfxCompositeTarget.depthTexture).not.toBe(
      targets.sceneTarget.depthTexture
    );
    const rawGammaDepthTexture = targets.rawGammaVfxCompositeTarget.depthTexture;
    pass.dispose();
    expect(targets.rawGammaVfxCompositeTarget.depthTexture).toBe(
      rawGammaDepthTexture
    );
  });

  it("reads HDR stage energy so a nominally active bloom pass cannot hide a zero-energy frame", () => {
    const pass = new AuroraRetailBloomPass();
    pass.setSize(2, 1);
    const half = THREE.DataUtils.toHalfFloat;
    const renderer = {
      readRenderTargetPixels: (
        target: THREE.WebGLRenderTarget,
        _x: number,
        _y: number,
        _width: number,
        _height: number,
        output: Uint16Array
      ) => {
        const targets = pass as unknown as {
          sceneTarget: THREE.WebGLRenderTarget;
          rawGammaVfxCompositeTarget: THREE.WebGLRenderTarget;
          thresholdTarget: THREE.WebGLRenderTarget;
          bloomCompositeTarget: THREE.WebGLRenderTarget;
        };
        const rgb = target === targets.sceneTarget
          ? [0.5, 0.25, 0.125]
          : target === targets.rawGammaVfxCompositeTarget
            ? [2, 1, 0.5]
            : target === targets.thresholdTarget
              ? [1, 0.5, 0.25]
              : [1.5, 0.75, 0.375];
        for (let pixel = 0; pixel < output.length / 4; pixel += 1) {
          output[pixel * 4] = half(rgb[0] ?? 0);
          output[pixel * 4 + 1] = half(rgb[1] ?? 0);
          output[pixel * 4 + 2] = half(rgb[2] ?? 0);
          output[pixel * 4 + 3] = half(1);
        }
      }
    } as unknown as THREE.WebGLRenderer;

    expect(pass.readFrameEnergyDiagnostics(renderer)).toEqual({
      status: "readback-complete",
      stages: [
        expect.objectContaining({
          stage: "linear-scene",
          maximumRgb: [0.5, 0.25, 0.125],
          maximumChannel: 0.5,
          pixelsAboveBloomThreshold: 0
        }),
        expect.objectContaining({
          stage: "raw-gamma-vfx-composite",
          maximumRgb: [2, 1, 0.5],
          maximumChannel: 2,
          pixelsAboveBloomThreshold: 2
        }),
        expect.objectContaining({
          stage: "threshold",
          maximumRgb: [1, 0.5, 0.25],
          maximumChannel: 1
        }),
        expect.objectContaining({
          stage: "bloom-composite",
          maximumRgb: [1.5, 0.75, 0.375],
          maximumChannel: 1.5
        })
      ]
    });
    pass.dispose();
  });

  it("resolves source area fog for the retail particle frame uniforms", () => {
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x000000, 1.5, 4.5);
    scene.userData.auroraTerrainAreaGlobalFogStatus = "active";
    scene.userData.auroraTerrainAreaGlobalFogColor = [0.2, 0.4, 0.6];

    expect(resolveAuroraRetailParticleFogFrameState(scene)).toEqual({
      enabled: true,
      start: 1.5,
      end: 4.5,
      colorGamma: [0.2, 0.4, 0.6],
      status: "source_area_fog_active"
    });
  });

  it("does not invent particle fog without active source area fog", () => {
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x778899, 1.5, 4.5);
    scene.userData.auroraTerrainAreaGlobalFogStatus =
      "available_disabled_by_capture";

    expect(resolveAuroraRetailParticleFogFrameState(scene)).toEqual({
      enabled: false,
      start: 0,
      end: 1,
      colorGamma: [0, 0, 0],
      status: "disabled_no_active_source_area_fog"
    });
  });

  it("clamps the HDR dynamic-contrast brightness term exactly like inc_postpr_dyn_c", () => {
    const pass = new AuroraRetailBloomPass();
    const fragmentShader = (
      pass as unknown as {
        postprocessMaterial: THREE.ShaderMaterial;
      }
    ).postprocessMaterial.fragmentShader;

    expect(fragmentShader).toContain(
      "max(0.0, 1.0 - brightness * brightness)"
    );
    pass.dispose();
  });

  it("uses active retail color-correction type 4 instead of the superseded type 1 branch", () => {
    expect(resolveAuroraRetailColorCorrectionType4([2, 0.2, 0.2])).toEqual([
      2,
      0.6499999999999999,
      0.6499999999999999
    ]);
    expect(resolveAuroraRetailColorCorrectionType4([0.8, 0.2, 0.1])).toEqual([
      0.8,
      0.2,
      0.1
    ]);

    const pass = new AuroraRetailBloomPass();
    const fragmentShader = (
      pass as unknown as {
        postprocessMaterial: THREE.ShaderMaterial;
      }
    ).postprocessMaterial.fragmentShader;
    expect(fragmentShader).toContain(
      "1.0 - square((maximum - 1.0) / maximum)"
    );
    expect(fragmentShader).not.toContain("brightness3 >= 3.0");
    expect(pass.getDiagnostics()).toMatchObject({
      colorCorrectionType: 4,
      colorCorrectionMode: "active-retail-overflow-preserving-type-4",
      colorCorrectionConfigSourceSha256:
        "8ae83f7fa429b2d646e7fe421edd25bdfb8c13724a56d5bdb2346b27ae258a8d",
      colorCorrectionTonemapSourceSha256:
        "d59921acbe17cf2e990b70acf2a69cf2f4624e93e3cc8d0f0ba58ef7bc683133"
    });
    pass.dispose();
  });

  it("derives dynamic contrast from source-labelled area lights and raw ARE fog fields", () => {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera();
    camera.position.set(0, 0, 0);
    camera.lookAt(0, 0, -1);
    camera.updateMatrixWorld(true);
    const ambient = new THREE.AmbientLight(0xffffff, 1);
    ambient.userData.auroraTerrainAreaGlobalLightRole = "ambient";
    ambient.userData.auroraTerrainAreaGlobalLightColor = [
      60 / 255,
      60 / 255,
      60 / 255
    ];
    const directional = new THREE.DirectionalLight(0xffffff, 1);
    directional.position.set(0, 0, -1);
    directional.userData.auroraTerrainAreaGlobalLightRole = "diffuse";
    directional.userData.auroraTerrainAreaGlobalLightColor = [
      170 / 255,
      170 / 255,
      170 / 255
    ];
    const localPointLight = new THREE.PointLight(0x4477ff, 1, 5);
    scene.add(ambient, directional, localPointLight);
    scene.userData.auroraTerrainAreaGlobalLightingStatus = "active";
    scene.userData.auroraTerrainAreaGlobalFogColor = [0, 0, 0];
    scene.userData.auroraTerrainAreaGlobalFogAmount = 5;
    scene.userData.auroraTerrainAreaGlobalFogClipDistance = 45;
    scene.fog = new THREE.Fog(0x000000, 1.5, 4.5);

    const state = resolveAuroraRetailDynamicContrastSceneState(
      scene,
      camera,
      0.4000000059604645
    );

    expect(state).toMatchObject({
      status: "source-backed-scene-light-input-active",
      areaAmbientLightCount: 1,
      areaDiffuseLightCount: 1,
      localPointLightCount: 1,
      sourceMdlLocalPointLightCount: 0,
      pendingLocalPointLightCount: 1,
      localPointLightContributionStatus: "pending-unmapped-visible-point-lights",
      fogStart: 1.5,
      fogEnd: 4.5
    });
    expect(state.midpoint).toBeCloseTo(
      resolveAuroraRetailDynamicContrastMidpoint({
        areaAmbientGamma: [60 / 255, 60 / 255, 60 / 255],
        areaDiffuseGamma: [170 / 255, 170 / 255, 170 / 255],
        areaDiffuseDirectionZ: -1,
        dynamicContrastMidpoint: 0.4000000059604645,
        fogColorGamma: [0, 0, 0],
        fogStart: 25 - (5 * 25) / 15,
        fogEnd: 45
      }),
      12
    );
  });

  it("derives the exact gamma-corrected local-light alpha range and projection contribution", () => {
    const camera = new THREE.PerspectiveCamera(90, 1, 0.1, 100);
    camera.position.set(0, 0, 0);
    camera.lookAt(0, 0, -1);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld(true);
    const light = new THREE.PointLight(0xffffff, 1.5, 5);
    light.position.set(0, 0, -4);
    light.userData = {
      auroraVfxCanonicalSourceMdlLight: true,
      auroraVfxCanonicalSourceMdlLightColor: [2, 1, 0.5],
      auroraVfxCanonicalSourceMdlLightRadius: 5,
      auroraVfxCanonicalSourceMdlLightMultiplier: 1.5,
      auroraVfxCanonicalSourceMdlLightAmbientOnly: false
    };

    const contribution =
      resolveAuroraRetailDynamicContrastSourcePointLightContribution(light, camera);
    const expectedRange =
      5 *
      1.5 *
      2 *
      AURORA_RETAIL_CAPTURE_LIGHT_CUTOFF_RANGE_MULTIPLIER;
    const expectedFactor = 0.6 ** 2 / (1 + 4 ** 2 / expectedRange);

    expect(contribution).toMatchObject({
      ambientOnly: false,
      effectiveRange: expectedRange,
      signedRangeSquared: expectedRange ** 2,
      sourceKind: "canonical-vfx"
    });
    expect(contribution?.contributionLinear[0]).toBeCloseTo(expectedFactor, 12);
    expect(contribution?.contributionLinear[1]).toBeCloseTo(expectedFactor * 0.5, 12);
    expect(contribution?.contributionLinear[2]).toBeCloseTo(expectedFactor * 0.25, 12);
  });

  it("skips screen-position attenuation only for ambientOnly local lights", () => {
    const camera = new THREE.PerspectiveCamera(90, 1, 0.1, 100);
    camera.lookAt(0, 0, -1);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld(true);
    const makeLight = (x: number, ambientOnly: boolean) => {
      const light = new THREE.PointLight(0xffffff, 1, 5);
      light.position.set(x, 0, -4);
      light.userData = {
        auroraVfxCanonicalSourceMdlLight: true,
        auroraVfxCanonicalSourceMdlLightColor: [1, 1, 1],
        auroraVfxCanonicalSourceMdlLightRadius: 5,
        auroraVfxCanonicalSourceMdlLightMultiplier: 1,
        auroraVfxCanonicalSourceMdlLightAmbientOnly: ambientOnly
      };
      return light;
    };

    const ambientCenter =
      resolveAuroraRetailDynamicContrastSourcePointLightContribution(
        makeLight(0, true),
        camera
      );
    const ambientOffAxis =
      resolveAuroraRetailDynamicContrastSourcePointLightContribution(
        makeLight(2, true),
        camera
      );
    const diffuseCenter =
      resolveAuroraRetailDynamicContrastSourcePointLightContribution(
        makeLight(0, false),
        camera
      );
    const diffuseOffAxis =
      resolveAuroraRetailDynamicContrastSourcePointLightContribution(
        makeLight(2, false),
        camera
      );

    expect(ambientOffAxis?.contributionLinear[0]).toBeCloseTo(
      ambientCenter?.contributionLinear[0] ?? 0,
      12
    );
    expect(diffuseOffAxis?.contributionLinear[0] ?? 0).toBeLessThan(
      diffuseCenter?.contributionLinear[0] ?? 0
    );
    expect(ambientCenter?.signedRangeSquared).toBeLessThan(0);
    expect(diffuseCenter?.signedRangeSquared).toBeGreaterThan(0);
  });

  it("activates dynamic contrast from a source-MDL local light without guessed area lights", () => {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(90, 1, 0.1, 100);
    camera.lookAt(0, 0, -1);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld(true);
    const light = new THREE.PointLight(0x4477ff, 1.5, 5);
    light.position.set(0, 0, -3);
    light.userData = {
      auroraVfxCanonicalSourceMdlLight: true,
      auroraVfxCanonicalSourceMdlLightColor: [0.25, 0.5, 1],
      auroraVfxCanonicalSourceMdlLightRadius: 5,
      auroraVfxCanonicalSourceMdlLightMultiplier: 1.5,
      auroraVfxCanonicalSourceMdlLightAmbientOnly: false
    };
    scene.add(light);

    const state = resolveAuroraRetailDynamicContrastSceneState(
      scene,
      camera,
      0.4000000059604645
    );

    expect(state).toMatchObject({
      status: "source-backed-scene-light-input-active",
      areaAmbientLightCount: 0,
      areaDiffuseLightCount: 0,
      localPointLightCount: 1,
      sourceMdlLocalPointLightCount: 1,
      pendingLocalPointLightCount: 0,
      localPointLightContributionStatus:
        "source-backed-native-lightColor-alpha-projection-active"
    });
    expect(state.midpoint).toBeGreaterThan(0);
    expect(state.midpointSource).toContain(
      "source-backed lightColor alpha/projection local lights"
    );
  });

  it("shares the recovered local-light contract with placeable and creature source-MDL previews", () => {
    const camera = new THREE.PerspectiveCamera(90, 1, 0.1, 100);
    camera.lookAt(0, 0, -1);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld(true);
    const placeableLight = new THREE.PointLight(0xffffff, 2, 4);
    placeableLight.position.set(-1, 0, -3);
    placeableLight.userData = {
      auroraLightPreviewRole: "source-mdl-point-light",
      auroraLightColor: [1.5, 0.75, 0.25],
      auroraLightAnimatedMultiplier: 2,
      auroraLightSourceRadiusWorldDistance: 4,
      auroraLightAmbientOnly: false
    };
    const creatureLight = new THREE.PointLight(0xffffff, 1, 3);
    creatureLight.position.set(1, 0, -3);
    creatureLight.userData = {
      creatureAuroraLightPreviewRole:
        "source-mdl-localized-ambient-point-light",
      creatureAuroraLightPreviewColor: [0.25, 0.5, 1],
      creatureAuroraLightAnimatedMultiplier: 1,
      creatureAuroraLightSourceRadiusWorldDistance: 3,
      creatureAuroraLightAmbientOnly: true
    };

    const placeableContribution =
      resolveAuroraRetailDynamicContrastSourcePointLightContribution(
        placeableLight,
        camera
      );
    const creatureContribution =
      resolveAuroraRetailDynamicContrastSourcePointLightContribution(
        creatureLight,
        camera
      );

    expect(placeableContribution).toMatchObject({
      ambientOnly: false,
      effectiveRange: 24,
      signedRangeSquared: 576,
      sourceKind: "placeable-source-mdl"
    });
    expect(creatureContribution).toMatchObject({
      ambientOnly: true,
      effectiveRange: 6,
      signedRangeSquared: -36,
      sourceKind: "creature-source-mdl"
    });
  });

  it("includes the fx_placeable01-backed placeables.2da light in dynamic contrast", () => {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(90, 1, 0.1, 100);
    camera.lookAt(0, 0, -1);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld(true);
    const light = new THREE.PointLight(0xffffff, 1.9, 1);
    light.position.set(0, 0, -3);
    light.userData = {
      placeableTwoDaLightPreviewRole: "placeables-2da-point-light",
      placeableTwoDaLightColor: [1.9, 1.9, 1],
      placeableTwoDaLightSourceRadiusWorldDistance: 1,
      placeableTwoDaLightSourceModelFileName: "fx_placeable01.mdl",
      placeableTwoDaLightSourceNodeName: "AuroraLight01"
    };
    scene.add(light);

    const contribution =
      resolveAuroraRetailDynamicContrastSourcePointLightContribution(light, camera);
    const state = resolveAuroraRetailDynamicContrastSceneState(
      scene,
      camera,
      0.4000000059604645
    );

    expect(contribution).toMatchObject({
      ambientOnly: false,
      effectiveRange:
        1 * 1.9 * AURORA_RETAIL_CAPTURE_LIGHT_CUTOFF_RANGE_MULTIPLIER,
      sourceKind: "placeable-two-da"
    });
    expect(state).toMatchObject({
      localPointLightCount: 1,
      sourceBackedLocalPointLightCount: 1,
      sourceMdlLocalPointLightCount: 0,
      placeableTwoDaLocalPointLightCount: 1,
      pendingLocalPointLightCount: 0,
      localPointLightContributionStatus:
        "source-backed-native-lightColor-alpha-projection-active"
    });
  });

  it("does not mistake generic workspace fill lights for source area inputs", () => {
    const scene = new THREE.Scene();
    scene.add(new THREE.AmbientLight(0xffffff, 0.68));
    scene.add(new THREE.DirectionalLight(0xffffff, 0.78));
    scene.add(new THREE.PointLight(0xffffff, 1, 5));

    expect(
      resolveAuroraRetailDynamicContrastSceneState(
        scene,
        new THREE.PerspectiveCamera(),
        0.4000000059604645
      )
    ).toMatchObject({
      status: "scene-area-input-unavailable",
      areaAmbientLightCount: 0,
      areaDiffuseLightCount: 0,
      localPointLightCount: 1,
      sourceMdlLocalPointLightCount: 0,
      pendingLocalPointLightCount: 1,
      localPointLightContributionStatus: "pending-unmapped-visible-point-lights",
      midpoint: 0
    });
  });

  it("orders visible MTR framebuffer meshes as mainscene then lane 5 then lane 6", () => {
    const scene = new THREE.Scene();
    const lane5 = new THREE.Mesh();
    const lane6 = new THREE.Mesh();
    const hiddenLane5 = new THREE.Mesh();
    lane5.userData.auroraMaterialFramebufferRuntimeLane = 5;
    lane6.userData.auroraMaterialFramebufferRuntimeLane = 6;
    hiddenLane5.userData.auroraMaterialFramebufferRuntimeLane = 5;
    hiddenLane5.visible = false;
    scene.add(lane6, hiddenLane5, lane5);

    const plan = collectAuroraMtrFramebufferRenderPlan(scene);
    expect(plan.lane5).toEqual([lane5]);
    expect(plan.lane6).toEqual([lane6]);
    expect(plan.stageOrder).toEqual([
      "mainscene",
      "framebuffer_lane_5",
      "framebuffer_lane_6"
    ]);
  });

  it("orders visible source-backed raw-gamma normal and additive particles in one composite", () => {
    const scene = new THREE.Scene();
    const normal = new THREE.Mesh();
    const additive = new THREE.Mesh();
    const sourceAdditiveDecal = new THREE.Mesh();
    const regular = new THREE.Mesh();
    const hiddenAdditive = new THREE.Mesh();
    normal.userData.auroraVfxCanonicalColorAccumulationLane =
      "aurora_raw_gamma_normal_before_retail_bloom";
    additive.userData.auroraVfxCanonicalColorAccumulationLane =
      "aurora_raw_gamma_additive_before_retail_bloom";
    sourceAdditiveDecal.userData.auroraCanonicalColorAccumulationLane =
      "aurora_raw_gamma_additive_before_retail_bloom";
    hiddenAdditive.userData.auroraVfxCanonicalColorAccumulationLane =
      "aurora_raw_gamma_additive_before_retail_bloom";
    hiddenAdditive.visible = false;
    scene.add(regular, hiddenAdditive, normal, additive, sourceAdditiveDecal);

    const plan = collectAuroraRawGammaVfxRenderPlan(scene);
    expect(plan.normalMeshes).toEqual([normal]);
    expect(plan.additiveMeshes).toEqual([additive, sourceAdditiveDecal]);
    expect(plan.meshes).toEqual([normal, additive, sourceAdditiveDecal]);
    expect(plan.stageOrder).toEqual([
      "linear_scene",
      "retail_ssao",
      "raw_gamma_vfx_composite",
      "retail_bloom",
      "retail_postprocess",
      "raw_gamma_output"
    ]);
  });
});
