import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  applyAuroraPlaceableLightingProofProfile,
  collectAuroraPlaceableLightingProofSceneFacts
} from "../../../../src/modules/layout/adapters/three/auroraPlaceableLightingProofAdapter";
import { resolveAuroraPlaceableLightingProofProfile } from "../../../../src/modules/layout/application/auroraPlaceableLightingProof";

function createTerrainMesh(material: THREE.Material, name: string): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
  mesh.name = name;
  return mesh;
}

describe("Aurora placeable lighting proof Three adapter", () => {
  it("classifies current MeshBasic Area terrain as unlit and lit Three materials as reactive", () => {
    const scene = new THREE.Scene();
    const objectLayer = new THREE.Group();
    scene.add(objectLayer);
    const terrainLayer = new THREE.Group();
    terrainLayer.name = "terrain-backend-tile-models";
    terrainLayer.add(
      createTerrainMesh(new THREE.MeshStandardMaterial(), "reactive-tile"),
      createTerrainMesh(new THREE.MeshBasicMaterial(), "unlit-tile")
    );
    scene.add(terrainLayer);

    const pointLight = new THREE.PointLight(0xffffff, 1, 4);
    pointLight.userData.placeableTwoDaLightPreviewRole = "placeables-2da-point-light";
    objectLayer.add(pointLight);

    const facts = collectAuroraPlaceableLightingProofSceneFacts({
      scene,
      objectLayer,
      tileMesh: null,
      assetSettlementStatus: "settled"
    });

    expect(facts.areaReceiverMeshCount).toBe(2);
    expect(facts.reactiveReceiverMaterialCount).toBe(1);
    expect(facts.unlitReceiverMaterialCount).toBe(1);
    expect(facts.unknownReceiverMaterialCount).toBe(0);
    expect(facts.pointLightCount).toBe(1);
    expect(facts.receiverMaterialFamilies).toEqual([
      expect.objectContaining({ family: "MeshBasicMaterial", reactiveness: "unlit" }),
      expect.objectContaining({ family: "MeshStandardMaterial", reactiveness: "reactive" })
    ]);
  });

  it("excludes source crop-mask geometry from Area receiver facts", () => {
    const scene = new THREE.Scene();
    const objectLayer = new THREE.Group();
    scene.add(objectLayer);
    const terrainLayer = new THREE.Group();
    terrainLayer.name = "terrain-backend-tile-models";
    const receiver = createTerrainMesh(
      new THREE.MeshStandardMaterial(),
      "source-floor"
    );
    const cropMask = createTerrainMesh(
      new THREE.MeshBasicMaterial(),
      "source-crop-mask"
    );
    cropMask.userData.auroraTerrainVoidMaskRenderContract = "source_crop_mask";
    terrainLayer.add(receiver, cropMask);
    scene.add(terrainLayer);

    const facts = collectAuroraPlaceableLightingProofSceneFacts({
      scene,
      objectLayer,
      tileMesh: null,
      assetSettlementStatus: "settled"
    });

    expect(facts.areaReceiverMeshCount).toBe(1);
    expect(facts.reactiveReceiverMaterialCount).toBe(1);
    expect(facts.unlitReceiverMaterialCount).toBe(0);
  });

  it("records when an admitted point light is below the real Area receiver", () => {
    const scene = new THREE.Scene();
    const objectLayer = new THREE.Group();
    scene.add(objectLayer);
    const terrainLayer = new THREE.Group();
    terrainLayer.name = "terrain-backend-tile-models";
    const receiver = createTerrainMesh(
      new THREE.MeshStandardMaterial(),
      "raised-floor"
    );
    receiver.rotation.x = -Math.PI / 2;
    receiver.position.y = 0.5;
    terrainLayer.add(receiver);
    scene.add(terrainLayer);
    const light = new THREE.PointLight(0xffcc77, 1.9, 1, 1);
    light.name = "campfire-point";
    light.position.set(0, 0.02, 0);
    light.userData.placeableTwoDaLightPreviewRole = "placeables-2da-point-light";
    objectLayer.add(light);
    scene.updateMatrixWorld(true);

    const facts = collectAuroraPlaceableLightingProofSceneFacts({
      scene,
      objectLayer,
      tileMesh: null,
      assetSettlementStatus: "settled"
    });

    expect(facts.pointLightSpatialSamples).toEqual([
      expect.objectContaining({
        name: "campfire-point",
        worldPosition: [0, 0.02, 0],
        distance: 1,
        intensity: 1.9
      })
    ]);
    expect(facts.receiverMeshSpatialSamples).toEqual([
      expect.objectContaining({
        name: "raised-floor",
        worldBoundsMin: [-0.5, 0.5, -0.5],
        worldBoundsMax: [0.5, 0.5, 0.5]
      })
    ]);
    expect(facts.pointLightReceiverPairSamples).toEqual([
      expect.objectContaining({
        lightName: "campfire-point",
        receiverName: "raised-floor",
        layerOverlap: true,
        verticalRelation: "below",
        lightHeightAboveReceiverMaxY: -0.48
      })
    ]);
  });

  it("records the source-backed placeables.2da projection used by the oracle gate", () => {
    const scene = new THREE.Scene();
    const objectLayer = new THREE.Group();
    scene.add(objectLayer);
    const light = new THREE.PointLight();
    light.color.setRGB(1, 1, 0.526316);
    light.intensity = 1;
    light.distance = 3.8;
    light.decay = 1.25;
    light.userData = {
      placeableTwoDaLightPreviewRole: "placeables-2da-point-light",
      placeableTwoDaLightColorRow: 6,
      placeableTwoDaLightColor: [1.9, 1.9, 1],
      placeableTwoDaLightSourceRadius: 10,
      placeableTwoDaLightSourceUnitScale: 0.1,
      placeableTwoDaLightSourceRadiusWorldDistance: 1,
      placeableTwoDaLightOffset: [0.240711, 0.011001, 0.194654],
      placeableTwoDaLightMappedOffset: [0.0240711, 0.0194654, 0.0011001],
      placeableTwoDaLightOffsetScale: 0.1,
      placeableTwoDaLightFalloffMode: "enhanced-performance",
      placeableTwoDaLightFalloffProofStatus:
        "retail-binary-and-shader-backed-enhanced-performance-point-light-falloff",
      placeableTwoDaLightFalloffRendererPatchStatus: "installed"
    };
    objectLayer.add(light);

    const facts = collectAuroraPlaceableLightingProofSceneFacts({
      scene,
      objectLayer,
      tileMesh: null,
      assetSettlementStatus: "settled"
    });

    expect(facts.pointLightSpatialSamples).toEqual([
      expect.objectContaining({
        role: "placeables-2da-point-light",
        color: [1, 1, 0.526316],
        distance: 3.8,
        intensity: 1,
        decay: 1.25,
        sourceLightColorRow: 6,
        sourceColor: [1.9, 1.9, 1],
        sourceRadius: 10,
        sourceUnitScale: 0.1,
        sourceRadiusWorld: 1,
        sourceOffset: [0.240711, 0.011001, 0.194654],
        mappedOffset: [0.024071, 0.019465, 0.0011],
        offsetScale: 0.1,
        falloffMode: "enhanced-performance",
        falloffRendererPatchStatus: "installed"
      })
    ]);
  });

  it("classifies every admitted Three material family and honors explicit overrides", () => {
    const scene = new THREE.Scene();
    const objectLayer = new THREE.Group();
    scene.add(objectLayer);
    const terrainLayer = new THREE.Group();
    terrainLayer.name = "terrain-imagemap2d-tiles";
    scene.add(terrainLayer);

    const explicitReactive = new THREE.ShaderMaterial();
    explicitReactive.userData.auroraPlaceableLightingProofReactsToLocalPointLight =
      true;
    const explicitUnlit = new THREE.MeshStandardMaterial();
    explicitUnlit.userData.auroraPlaceableLightingProofReactsToLocalPointLight =
      false;
    const materials: THREE.Material[] = [
      new THREE.MeshLambertMaterial(),
      new THREE.MeshPhongMaterial(),
      new THREE.MeshStandardMaterial(),
      new THREE.MeshToonMaterial(),
      explicitReactive,
      new THREE.MeshBasicMaterial(),
      new THREE.MeshNormalMaterial(),
      new THREE.MeshMatcapMaterial(),
      new THREE.MeshDepthMaterial(),
      new THREE.MeshDistanceMaterial(),
      new THREE.SpriteMaterial(),
      new THREE.PointsMaterial(),
      new THREE.LineBasicMaterial(),
      new THREE.LineDashedMaterial(),
      explicitUnlit,
      new THREE.ShaderMaterial()
    ];
    materials.forEach((material, index) => {
      terrainLayer.add(createTerrainMesh(material, `receiver-${index}`));
    });

    const facts = collectAuroraPlaceableLightingProofSceneFacts({
      scene,
      objectLayer,
      tileMesh: null,
      assetSettlementStatus: "settled"
    });

    expect(facts.reactiveReceiverMaterialCount).toBe(5);
    expect(facts.unlitReceiverMaterialCount).toBe(10);
    expect(facts.unknownReceiverMaterialCount).toBe(1);
  });

  it("counts every supported point-light owner and ignores hidden or lookalike nodes", () => {
    const scene = new THREE.Scene();
    const objectLayer = new THREE.Group();
    scene.add(objectLayer);
    const addRoleLight = (role: string): THREE.PointLight => {
      const light = new THREE.PointLight();
      light.userData.placeableTwoDaLightPreviewRole = role;
      objectLayer.add(light);
      return light;
    };
    addRoleLight("placeables-2da-point-light");
    addRoleLight("source-mdl-point-light");
    const canonical = new THREE.PointLight();
    canonical.userData.auroraVfxCanonicalSourceMdlLight = true;
    objectLayer.add(canonical);
    const progFx = new THREE.PointLight();
    progFx.userData.auroraVfxProgFxType4PreviewRole =
      "progfx-type4-point-light";
    objectLayer.add(progFx);
    const invalid = new THREE.PointLight();
    invalid.userData.placeableTwoDaLightPreviewRole = "not-a-light-role";
    objectLayer.add(invalid);
    const lookalike = createTerrainMesh(new THREE.MeshBasicMaterial(), "lookalike");
    lookalike.userData.placeableTwoDaLightPreviewRole =
      "placeables-2da-point-light";
    objectLayer.add(lookalike);
    const hiddenParent = new THREE.Group();
    hiddenParent.visible = false;
    const hidden = new THREE.PointLight();
    hidden.userData.placeableTwoDaLightPreviewRole = "placeables-2da-point-light";
    hiddenParent.add(hidden);
    objectLayer.add(hiddenParent);

    const facts = collectAuroraPlaceableLightingProofSceneFacts({
      scene,
      objectLayer,
      tileMesh: null,
      assetSettlementStatus: "settled"
    });

    expect(facts.pointLightCount).toBe(4);
    expect(facts.debugReceiverMeshCount).toBe(0);
  });

  it("recognizes canonical and ProgFX point-light owners independently", () => {
    const countFor = (light: THREE.PointLight): number => {
      const scene = new THREE.Scene();
      const objectLayer = new THREE.Group();
      scene.add(objectLayer);
      objectLayer.add(light);
      return collectAuroraPlaceableLightingProofSceneFacts({
        scene,
        objectLayer,
        tileMesh: null,
        assetSettlementStatus: "settled"
      }).pointLightCount;
    };
    const canonical = new THREE.PointLight();
    canonical.userData.auroraVfxCanonicalSourceMdlLight = true;
    const progFx = new THREE.PointLight();
    progFx.userData.auroraVfxProgFxType4PreviewRole =
      "progfx-type4-point-light";
    const unrelated = new THREE.PointLight();

    expect(countFor(canonical)).toBe(1);
    expect(countFor(progFx)).toBe(1);
    expect(countFor(unrelated)).toBe(0);
  });

  it("isolates the point-light lane without hiding the placeable model", () => {
    const scene = new THREE.Scene();
    const objectLayer = new THREE.Group();
    scene.add(objectLayer);
    const model = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshBasicMaterial()
    );
    model.name = "placeable-model";
    objectLayer.add(model);

    const pointLight = new THREE.PointLight(0xffffff, 1, 4);
    pointLight.castShadow = true;
    pointLight.userData.placeableTwoDaLightPreviewRole = "placeables-2da-point-light";
    objectLayer.add(pointLight);

    const halo = new THREE.Sprite(new THREE.SpriteMaterial());
    halo.userData.placeableTwoDaLightPreviewRole = "placeables-2da-light-halo";
    objectLayer.add(halo);

    const vfx = new THREE.Group();
    vfx.name = "aurora_vfx_canonical_runtime_playback";
    const vfxDraw = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial()
    );
    vfx.add(vfxDraw);
    objectLayer.add(vfx);

    const shadow = createTerrainMesh(
      new THREE.MeshBasicMaterial(),
      "placeable_2da_light_fast_shadow-main"
    );
    objectLayer.add(shadow);
    const shadowLookalike = createTerrainMesh(
      new THREE.MeshBasicMaterial(),
      "prefix-placeable_2da_light_fast_shadow"
    );
    objectLayer.add(shadowLookalike);

    const profile = resolveAuroraPlaceableLightingProofProfile({
      pointLight: true,
      halo: false,
      vfx: false,
      shadow: false,
      postprocess: false
    });
    const result = applyAuroraPlaceableLightingProofProfile(
      { scene, objectLayer },
      profile
    );

    expect(model.visible).toBe(true);
    expect(pointLight.visible).toBe(true);
    expect(pointLight.castShadow).toBe(false);
    expect(halo.visible).toBe(false);
    expect(vfx.visible).toBe(true);
    expect(vfxDraw.visible).toBe(false);
    expect(shadow.visible).toBe(false);
    expect(shadowLookalike.visible).toBe(true);
    expect(result).toMatchObject({
      pointLightNodeCount: 1,
      haloNodeCount: 1,
      vfxRootCount: 1,
      vfxDrawNodeCount: 1,
      shadowNodeCount: 1,
      debugReceiverNodeCount: 0,
      areaReceiverRootCount: 0
    });
  });

  it("restores original lane visibility when the profile is toggled back on", () => {
    const scene = new THREE.Scene();
    const objectLayer = new THREE.Group();
    scene.add(objectLayer);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial());
    halo.userData.auroraLightPreviewRole = "source-mdl-light-halo";
    objectLayer.add(halo);
    const originallyHiddenHalo = new THREE.Sprite(new THREE.SpriteMaterial());
    originallyHiddenHalo.visible = false;
    originallyHiddenHalo.userData.auroraLightPreviewRole =
      "source-mdl-light-halo";
    objectLayer.add(originallyHiddenHalo);
    const light = new THREE.PointLight();
    light.castShadow = true;
    light.userData.placeableTwoDaLightPreviewRole = "placeables-2da-point-light";
    objectLayer.add(light);
    const noShadowLight = new THREE.PointLight();
    noShadowLight.castShadow = false;
    noShadowLight.userData.placeableTwoDaLightPreviewRole =
      "placeables-2da-point-light";
    objectLayer.add(noShadowLight);

    applyAuroraPlaceableLightingProofProfile(
      { scene, objectLayer },
      resolveAuroraPlaceableLightingProofProfile({ halo: false, shadow: false })
    );
    expect(halo.visible).toBe(false);
    expect(light.castShadow).toBe(false);

    applyAuroraPlaceableLightingProofProfile(
      { scene, objectLayer },
      resolveAuroraPlaceableLightingProofProfile({ halo: true, shadow: true })
    );
    expect(halo.visible).toBe(true);
    expect(originallyHiddenHalo.visible).toBe(false);
    expect(light.castShadow).toBe(true);
    expect(noShadowLight.castShadow).toBe(false);
  });

  it("creates one explicitly labelled reactive debug receiver without promoting it as an Area receiver", () => {
    const scene = new THREE.Scene();
    const objectLayer = new THREE.Group();
    scene.add(objectLayer);
    const terrainLayer = new THREE.Group();
    terrainLayer.name = "terrain-backend-tile-models";
    terrainLayer.add(createTerrainMesh(new THREE.MeshBasicMaterial(), "area-floor"));
    scene.add(terrainLayer);
    const pointLight = new THREE.PointLight(0xffaa55, 1, 6);
    pointLight.position.set(2, 1.5, 3);
    pointLight.userData.placeableTwoDaLightPreviewRole = "placeables-2da-point-light";
    objectLayer.add(pointLight);
    const secondPointLight = new THREE.PointLight(0xffaa55, 1, 20);
    secondPointLight.position.set(20, 4, 30);
    secondPointLight.userData.placeableTwoDaLightPreviewRole =
      "placeables-2da-point-light";
    objectLayer.add(secondPointLight);

    const profile = resolveAuroraPlaceableLightingProofProfile({
      receiver: "debug",
      halo: false,
      vfx: false,
      shadow: false,
      postprocess: false
    });
    applyAuroraPlaceableLightingProofProfile({ scene, objectLayer }, profile);
    applyAuroraPlaceableLightingProofProfile({ scene, objectLayer }, profile);

    const receiver = objectLayer.getObjectByName(
      "aurora_placeable_lighting_proof_debug_receiver"
    );
    expect(receiver).toBeInstanceOf(THREE.Mesh);
    expect((receiver as THREE.Mesh).material).toBeInstanceOf(
      THREE.MeshStandardMaterial
    );
    expect(
      ((receiver as THREE.Mesh).geometry as THREE.CircleGeometry).parameters.radius
    ).toBeCloseTo(2.7);
    expect(receiver?.rotation.x).toBeCloseTo(-Math.PI / 2);
    expect((receiver as THREE.Mesh).material.userData).toMatchObject({
      auroraPlaceableLightingProofReactsToLocalPointLight: true,
      auroraPlaceableLightingProofDebugOnly: true
    });
    expect(receiver?.userData).toMatchObject({
      placeableTwoDaLightPreviewRole: "placeables-2da-light-receiver",
      auroraPlaceableLightingProofDebugOnly: true,
      auroraPlaceableLightingProofRetailParityStatus:
        "blocked_debug_receiver_not_area_surface"
    });
    expect(receiver?.position.toArray()).toEqual([2, 0.012, 3]);
    expect(
      objectLayer.children.filter(
        (child) => child.name === "aurora_placeable_lighting_proof_debug_receiver"
      )
    ).toHaveLength(1);
    expect(terrainLayer.visible).toBe(false);

    const facts = collectAuroraPlaceableLightingProofSceneFacts({
      scene,
      objectLayer,
      tileMesh: null,
      assetSettlementStatus: "settled"
    });
    expect(facts.areaReceiverMeshCount).toBe(0);
    expect(facts.debugReceiverMeshCount).toBe(1);

    const areaResult = applyAuroraPlaceableLightingProofProfile(
      { scene, objectLayer },
      resolveAuroraPlaceableLightingProofProfile({ receiver: "area" })
    );
    expect(terrainLayer.visible).toBe(true);
    expect(areaResult.areaReceiverRootCount).toBe(1);
  });

  it("does not create a debug receiver without an admitted point light", () => {
    const scene = new THREE.Scene();
    const objectLayer = new THREE.Group();
    scene.add(objectLayer);

    const result = applyAuroraPlaceableLightingProofProfile(
      { scene, objectLayer },
      resolveAuroraPlaceableLightingProofProfile({ receiver: "debug" })
    );

    expect(
      objectLayer.getObjectByName("aurora_placeable_lighting_proof_debug_receiver")
    ).toBeUndefined();
    expect(result.debugReceiverNodeCount).toBe(0);
  });

  it("uses the first light world position, clamps debug radius, and toggles generic terrain", () => {
    const scene = new THREE.Scene();
    const objectLayer = new THREE.Group();
    scene.add(objectLayer);
    const genericTerrain = new THREE.Group();
    genericTerrain.name = "terrain-tiles";
    scene.add(genericTerrain);
    const parent = new THREE.Group();
    parent.position.set(5, 0, 7);
    objectLayer.add(parent);
    const first = new THREE.PointLight(0xffffff, 1, 100);
    first.position.set(2, 3, 4);
    first.userData.placeableTwoDaLightPreviewRole = "source-mdl-point-light";
    parent.add(first);
    const second = new THREE.PointLight(0xffffff, 1, 1);
    second.position.set(50, 3, 60);
    second.userData.placeableTwoDaLightPreviewRole = "source-mdl-point-light";
    objectLayer.add(second);

    const debugResult = applyAuroraPlaceableLightingProofProfile(
      { scene, objectLayer },
      resolveAuroraPlaceableLightingProofProfile({ receiver: "debug" })
    );
    const receiver = objectLayer.getObjectByName(
      "aurora_placeable_lighting_proof_debug_receiver"
    ) as THREE.Mesh<THREE.CircleGeometry>;

    expect(receiver.position.toArray()).toEqual([7, 0.012, 11]);
    expect(receiver.geometry.parameters.radius).toBe(6);
    expect(genericTerrain.visible).toBe(false);
    expect(debugResult.areaReceiverRootCount).toBe(1);
    expect(debugResult.debugReceiverNodeCount).toBe(1);

    const areaResult = applyAuroraPlaceableLightingProofProfile(
      { scene, objectLayer },
      resolveAuroraPlaceableLightingProofProfile({ receiver: "area" })
    );
    expect(genericTerrain.visible).toBe(true);
    expect(receiver.visible).toBe(false);
    expect(areaResult.areaReceiverRootCount).toBe(1);
  });

  it("caps material mesh samples at twelve, uses UUID fallback, and excludes hidden receivers", () => {
    const scene = new THREE.Scene();
    const objectLayer = new THREE.Group();
    scene.add(objectLayer);
    const terrainLayer = new THREE.Group();
    terrainLayer.name = "terrain-backend-tile-models";
    scene.add(terrainLayer);
    const unnamed = createTerrainMesh(new THREE.MeshBasicMaterial(), "");
    terrainLayer.add(unnamed);
    for (let index = 1; index < 14; index += 1) {
      terrainLayer.add(
        createTerrainMesh(new THREE.MeshBasicMaterial(), `receiver-${index}`)
      );
    }
    const hiddenGroup = new THREE.Group();
    hiddenGroup.visible = false;
    hiddenGroup.add(createTerrainMesh(new THREE.MeshBasicMaterial(), "hidden"));
    terrainLayer.add(hiddenGroup);

    const facts = collectAuroraPlaceableLightingProofSceneFacts({
      scene,
      objectLayer,
      tileMesh: null,
      assetSettlementStatus: "settled"
    });
    const basic = facts.receiverMaterialFamilies?.find(
      (family) => family.family === "MeshBasicMaterial"
    );

    expect(facts.areaReceiverMeshCount).toBe(14);
    expect(facts.unlitReceiverMaterialCount).toBe(14);
    expect(basic?.materialCount).toBe(14);
    expect(basic?.meshSamples).toHaveLength(12);
    expect(basic?.meshSamples[0]).toBe(unnamed.uuid);
    expect(basic?.meshSamples).not.toContain("hidden");
  });
});
