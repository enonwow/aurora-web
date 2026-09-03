import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  applyTerrainTileMaterialTexturesFromMeshMetadataForTests,
  applyTerrainTileModelOverdrawVisibilityForTests,
  applyTerrainTileRotatingTextureCompensationForTests,
  applyTerrainTileTextureColorMaterialModeForTests,
  applyTerrainTileVoidMaskVisibilityForTests,
  createTerrainImageMapTextureWithTransparentVoidForTests,
  isTerrainImageMapSourceBackedOverlayEnabledForTests,
  isTerrainTileCeilingMeshForTests,
  isTerrainTileGroundSurfaceMeshForTests,
  isTerrainTileVoidMaskMeshForTests,
  resolveTerrainExtentFillColorForTests,
  resolveTerrainImageMapVoidAlphaForTests,
  resolveTerrainImageMapStatusForTests,
  shouldRenderTerrainTileImageMapForTests,
  syncTerrainExtentFillBelowLoadedGroundSurfacesForTests,
  summarizeTerrainTileMaterialMapCoverageForTests
} from "../../../../src/modules/layout/adapters/three/workspaceTerrainMesh";
import { resolveAreaTileRenderProfile } from "../../../../src/modules/tiles/domain/areaTileRenderProfile";

const SIC11_BLANK_RENDER_PROFILE = resolveAreaTileRenderProfile(
  "d2e9e820f3dcbf0a8aca4a461e45a9fca86892ed54c94c1de4b6ebe69394303a"
);
const TNI01_VOID_RENDER_PROFILE = resolveAreaTileRenderProfile(
  "0e6ca4c04b1548bcf71111cf3ddb1e9d7c3255aaf15816940852278588cca731"
);
const GIN11_CROP_RENDER_PROFILE = resolveAreaTileRenderProfile(
  "0e84d5a36c2b3d0ab5bedbd4ade4f3e2d58b94c5840207fc529a11165874efe5"
);

describe("workspaceTerrainMesh ceiling visibility", () => {
  it("matches the extent backing plane to Aurora interior crop masks", () => {
    expect(resolveTerrainExtentFillColorForTests({ interior: true })).toBe("#000000");
    expect(resolveTerrainExtentFillColorForTests({ interior: false })).toBe("#0c1420");
    expect(resolveTerrainExtentFillColorForTests({})).toBe("#0c1420");
  });

  it("keeps the renderer-owned extent fill below a source-authored lowered floor", () => {
    const scene = new THREE.Group();
    const extentLayer = new THREE.Group();
    extentLayer.name = "terrain-area-extent-footprint";
    const extentFill = new THREE.Mesh(
      new THREE.PlaneGeometry(3, 4),
      new THREE.MeshBasicMaterial({ color: "#000000" })
    );
    extentFill.name = "terrain-area-extent-fill";
    extentFill.position.y = -0.018;
    extentLayer.add(extentFill);
    scene.add(extentLayer);

    const modelLayer = new THREE.Group();
    scene.add(modelLayer);
    const sourceFloorGeometry = new THREE.PlaneGeometry(10, 10);
    sourceFloorGeometry.rotateX(-Math.PI / 2);
    sourceFloorGeometry.translate(0, -5, 0);
    const sourceFloor = new THREE.Mesh(
      sourceFloorGeometry,
      new THREE.MeshBasicMaterial({ name: "Aurora material mtr_nkey_0163" })
    );
    sourceFloor.name = "floor";
    sourceFloor.userData = {
      aurora: {
        sourceMesh: "floor",
        textureReference: "mtr_nkey_0163"
      }
    };
    const model = new THREE.Group();
    model.scale.setScalar(0.1);
    model.add(sourceFloor);

    const result = syncTerrainExtentFillBelowLoadedGroundSurfacesForTests(
      modelLayer,
      model
    );

    expect(result).toEqual({
      adjusted: true,
      groundSurfaceCount: 1,
      sourceGroundMinY: -0.5,
      fillY: -0.518
    });
    expect(extentFill.position.y).toBeCloseTo(-0.518);
    expect(extentFill.userData.auroraTerrainExtentFillElevationSource).toBe(
      "loaded-source-ground-min-y"
    );
  });

  it("keeps the renderer-owned extent fill below a source-authored water plane", () => {
    const scene = new THREE.Group();
    const extentLayer = new THREE.Group();
    extentLayer.name = "terrain-area-extent-footprint";
    const extentFill = new THREE.Mesh(
      new THREE.PlaneGeometry(3, 4),
      new THREE.MeshBasicMaterial()
    );
    extentFill.name = "terrain-area-extent-fill";
    extentFill.position.y = -0.018;
    extentLayer.add(extentFill);
    scene.add(extentLayer);
    const modelLayer = new THREE.Group();
    scene.add(modelLayer);

    const waterGeometry = new THREE.PlaneGeometry(10, 10);
    waterGeometry.rotateX(-Math.PI / 2);
    waterGeometry.translate(0, -1, 0);
    const water = new THREE.Mesh(
      waterGeometry,
      new THREE.MeshBasicMaterial({ name: "Aurora material atj01_water01" })
    );
    water.name = "WaterPlane03v";
    water.userData = {
      aurora: {
        sourceMesh: "WaterPlane03v",
        textureReference: "atj01_water01"
      }
    };
    const model = new THREE.Group();
    model.scale.setScalar(0.1);
    model.add(water);

    expect(isTerrainTileGroundSurfaceMeshForTests(water)).toBe(true);

    const result = syncTerrainExtentFillBelowLoadedGroundSurfacesForTests(
      modelLayer,
      model
    );

    expect(result).toMatchObject({
      adjusted: true,
      groundSurfaceCount: 1
    });
    expect(result.sourceGroundMinY).toBeCloseTo(-0.1);
    expect(result.fillY).toBeCloseTo(-0.118);
    expect(extentFill.position.y).toBeCloseTo(-0.118);
  });

  it("does not raise the extent fill for ordinary or elevated source floors", () => {
    const scene = new THREE.Group();
    const extentLayer = new THREE.Group();
    extentLayer.name = "terrain-area-extent-footprint";
    const extentFill = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial()
    );
    extentFill.name = "terrain-area-extent-fill";
    extentFill.position.y = -0.018;
    extentLayer.add(extentFill);
    scene.add(extentLayer);
    const modelLayer = new THREE.Group();
    scene.add(modelLayer);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(10, 10).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ name: "Aurora material stone_floor" })
    );
    floor.name = "floor";
    floor.userData = {
      aurora: { sourceMesh: "floor", textureReference: "stone_floor" }
    };
    const model = new THREE.Group();
    model.add(floor);

    const result = syncTerrainExtentFillBelowLoadedGroundSurfacesForTests(
      modelLayer,
      model
    );

    expect(result.adjusted).toBe(false);
    expect(result.sourceGroundMinY).toBeCloseTo(0);
    expect(result.fillY).toBeCloseTo(-0.018);
    expect(extentFill.position.y).toBeCloseTo(-0.018);
  });

  it("classifies Aurora black void masks separately from ceilings", () => {
    const blackShellGeometry = new THREE.BoxGeometry(10, 4.7, 10);
    blackShellGeometry.translate(0, 2.35, 0);
    const blackMask = new THREE.Mesh(
      blackShellGeometry,
      new THREE.MeshBasicMaterial({ name: "Aurora material sic11_black" })
    );
    blackMask.name = "sic11_a00_00";
    blackMask.userData = {
      aurora: {
        sourceMesh: "nero_01",
        textureReference: "sic11_black"
      }
    };

    expect(isTerrainTileCeilingMeshForTests(blackMask)).toBe(false);
    expect(isTerrainTileVoidMaskMeshForTests(blackMask)).toBe(true);
  });

  it("keeps sic11_f16_12 source-rendered doorway shell geometry", () => {
    const blackRoom = new THREE.Mesh(
      new THREE.BoxGeometry(10, 4.7, 10),
      new THREE.MeshBasicMaterial({ name: "Aurora material sic11_black" })
    );
    blackRoom.name = "sic11_f16_12";
    blackRoom.userData = {
      aurora: {
        sourceMesh: "box01",
        textureReference: "sic11_black"
      }
    };
    const root = new THREE.Group();
    root.userData.auroraTerrainTileId = "tile-217";
    root.userData.auroraTerrainTileModelResRef = "sic11_f16_12";
    root.add(blackRoom);

    expect(isTerrainTileVoidMaskMeshForTests(blackRoom)).toBe(true);
    const visibility = applyTerrainTileVoidMaskVisibilityForTests(root);
    expect(visibility.hiddenCount).toBe(0);
    expect(visibility.requiresBlackExtentBacking).toBe(true);
    expect(visibility.visibleCropMaskCount).toBe(1);
    expect(blackRoom.visible).toBe(true);
    expect(blackRoom.userData.auroraTerrainVoidMaskVisibility).toBe(
      "kept_only_tile_geometry"
    );
    expect(blackRoom.userData.auroraTerrainVoidMaskRenderContract).toBe(
      "source_crop_mask"
    );
  });

  it("hides all-black blank a00_00 shells", () => {
    const blankMask = new THREE.Mesh(
      new THREE.BoxGeometry(10, 4.7, 10),
      new THREE.MeshBasicMaterial({ name: "Aurora material sic11_black" })
    );
    blankMask.name = "sic11_a00_00";
    blankMask.userData = {
      aurora: {
        sourceMesh: "nero_01",
        textureReference: "sic11_black"
      }
    };
    const root = new THREE.Group();
    root.userData.auroraTerrainTileId = "tile-0";
    root.userData.auroraTerrainTileModelResRef = "sic11_a00_00";
    root.add(blankMask);

    expect(
      applyTerrainTileVoidMaskVisibilityForTests(root, SIC11_BLANK_RENDER_PROFILE)
        .hiddenCount
    ).toBe(1);
    expect(blankMask.visible).toBe(false);
  });

  it("hides an all-black horizontal placeholder tile while preserving structural masks", () => {
    const blackBase = new THREE.Mesh(
      new THREE.PlaneGeometry(10, 10).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ name: "Aurora material tni01_black" })
    );
    blackBase.name = "Plane96";
    blackBase.userData = {
      aurora: {
        sourceMesh: "Plane96",
        textureReference: "tni01_black"
      }
    };
    const root = new THREE.Group();
    root.userData.auroraTerrainTileModelResRef = "tni01_o20_01";
    root.add(blackBase);

    const visibility = applyTerrainTileVoidMaskVisibilityForTests(
      root,
      TNI01_VOID_RENDER_PROFILE
    );
    expect(visibility.hiddenCount).toBe(1);
    expect(visibility.requiresBlackExtentBacking).toBe(false);
    expect(blackBase.visible).toBe(false);
    expect(blackBase.userData.auroraTerrainVoidMaskVisibility).toBe(
      "hidden_all_black_tile_base"
    );
  });

  it("uses a hidden black tile base alongside drawable terrain as backing evidence", () => {
    const blackBase = new THREE.Mesh(
      new THREE.PlaneGeometry(10, 10).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ name: "Aurora material black" })
    );
    blackBase.name = "black";
    blackBase.userData = {
      aurora: { sourceMesh: "black", textureReference: "black" }
    };
    const floor = new THREE.Mesh(
      new THREE.BoxGeometry(8, 0.2, 8),
      new THREE.MeshBasicMaterial({ name: "Aurora material tdx01_muck01" })
    );
    floor.name = "water_floor";
    floor.userData = {
      aurora: { sourceMesh: "water_floor", textureReference: "tdx01_muck01" }
    };
    const root = new THREE.Group();
    root.userData.auroraTerrainTileModelResRef = "tdx01_j10_01";
    root.add(blackBase, floor);

    const visibility = applyTerrainTileVoidMaskVisibilityForTests(root);
    expect(visibility.hiddenCount).toBe(1);
    expect(visibility.requiresBlackExtentBacking).toBe(true);
    expect(visibility.visibleCropMaskCount).toBe(0);
    expect(blackBase.visible).toBe(false);
    expect(floor.visible).toBe(true);
  });

  it("hides the vertical all-black geometry of the explicit tni01 void tile", () => {
    const blackWall = new THREE.Mesh(
      new THREE.BoxGeometry(3, 4, 0.2),
      new THREE.MeshBasicMaterial({ name: "Aurora material tni01_black" })
    );
    blackWall.name = "black_placeholder_wall";
    blackWall.userData = {
      aurora: {
        sourceMesh: "black_placeholder_wall",
        textureReference: "tni01_black"
      }
    };
    const root = new THREE.Group();
    root.userData.auroraTerrainTileModelResRef = "renamed_without_behavior_change";
    root.add(blackWall);

    expect(
      applyTerrainTileVoidMaskVisibilityForTests(root, TNI01_VOID_RENDER_PROFILE)
        .hiddenCount
    ).toBe(1);
    expect(blackWall.visible).toBe(false);
  });

  it("hides a wide elevated black crop slab and the known gin11 crop portal", () => {
    const cropSlabGeometry = new THREE.BoxGeometry(10, 1, 10);
    cropSlabGeometry.translate(0, 3.5, 0);
    const cropSlab = new THREE.Mesh(
      cropSlabGeometry,
      new THREE.MeshBasicMaterial({ name: "Aurora material black" })
    );
    cropSlab.name = "black";
    cropSlab.userData = { aurora: { sourceMesh: "black", textureReference: "black" } };
    const doorway = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 3.2, 2.1),
      new THREE.MeshBasicMaterial({ name: "Aurora material black" })
    );
    doorway.name = "door_black";
    doorway.userData = {
      aurora: { sourceMesh: "door_black", textureReference: "black" }
    };
    const root = new THREE.Group();
    root.userData.auroraTerrainTileModelResRef = "gin11_s01_02";
    root.add(cropSlab, doorway);

    expect(
      applyTerrainTileVoidMaskVisibilityForTests(root, GIN11_CROP_RENDER_PROFILE)
        .hiddenCount
    ).toBe(2);
    expect(cropSlab.visible).toBe(false);
    expect(doorway.visible).toBe(false);
  });

  it("hides the 10x1.2x10 bci01 black room cap instead of reporting a false visible-ready tile", () => {
    const roomCapGeometry = new THREE.BoxGeometry(10, 1.2, 10);
    roomCapGeometry.translate(0, 6.6, 0);
    const roomCap = new THREE.Mesh(
      roomCapGeometry,
      new THREE.MeshBasicMaterial({ name: "Aurora material tno01_black01" })
    );
    roomCap.name = "black_01";
    roomCap.userData = {
      aurora: {
        sourceMesh: "black_01",
        textureReference: "tno01_black01"
      }
    };
    const wall = new THREE.Mesh(
      new THREE.BoxGeometry(10, 4, 0.4),
      new THREE.MeshBasicMaterial({ name: "Aurora material bci01_plaster01" })
    );
    const root = new THREE.Group();
    root.userData.auroraTerrainTileModelResRef = "bci01_c01_05";
    root.add(roomCap, wall);

    const visibility = applyTerrainTileVoidMaskVisibilityForTests(root);
    expect(visibility.hiddenCount).toBe(1);
    expect(roomCap.visible).toBe(false);
    expect(wall.visible).toBe(true);
    expect(roomCap.userData.auroraTerrainVoidMaskVisibility).toBe(
      "hidden_all_black_tile_base"
    );
  });

  it("hides the 10x3x10 tcn01 full-tile crop volume while preserving narrow black masks", () => {
    const cropVolumeGeometry = new THREE.BoxGeometry(10, 3, 10);
    const cropVolume = new THREE.Mesh(
      cropVolumeGeometry,
      new THREE.MeshBasicMaterial({ name: "Aurora material tcn01_black" })
    );
    cropVolume.name = "Line94";
    // The source GLB stores Line94 elevation on the node transform rather
    // than baking it into the geometry-local bounding box.
    cropVolume.position.y = 4.7;
    cropVolume.userData = {
      aurora: {
        sourceMesh: "Line94",
        textureReference: "tcn01_black"
      }
    };
    const doorMaskGeometry = new THREE.BoxGeometry(1.8, 3.2, 2.1);
    doorMaskGeometry.translate(0, 1.6, 0);
    const doorMask = new THREE.Mesh(
      doorMaskGeometry,
      new THREE.MeshBasicMaterial({ name: "Aurora material tcn01_black" })
    );
    doorMask.name = "door_black";
    doorMask.userData = {
      aurora: {
        sourceMesh: "door_black",
        textureReference: "tcn01_black"
      }
    };
    const root = new THREE.Group();
    root.userData.auroraTerrainTileModelResRef = "tcn01_c01_01";
    root.add(cropVolume, doorMask);

    const visibility = applyTerrainTileVoidMaskVisibilityForTests(root);
    expect(visibility.hiddenCount).toBe(1);
    expect(cropVolume.visible).toBe(false);
    expect(doorMask.visible).toBe(true);
  });

  it("keeps black crop mask submeshes visible inside real room tiles", () => {
    const blackSubmesh = new THREE.Mesh(
      new THREE.BoxGeometry(10, 0.1, 10),
      new THREE.MeshBasicMaterial({ name: "Aurora material sic11_black" })
    );
    blackSubmesh.name = "sic11_a01_07";
    blackSubmesh.userData = {
      aurora: {
        sourceMesh: "nerotile",
        textureReference: "sic11_black"
      }
    };
    const root = new THREE.Group();
    root.userData.auroraTerrainTileId = "tile-197";
    root.userData.auroraTerrainTileModelResRef = "sic11_a01_07";
    root.add(
      new THREE.Mesh(
        new THREE.BoxGeometry(10, 2, 0.4),
        new THREE.MeshBasicMaterial({ name: "Aurora material sic11_wall01" })
      )
    );
    root.add(blackSubmesh);

    expect(isTerrainTileVoidMaskMeshForTests(blackSubmesh)).toBe(true);
    const visibility = applyTerrainTileVoidMaskVisibilityForTests(root);
    expect(visibility.hiddenCount).toBe(0);
    expect(visibility.requiresBlackExtentBacking).toBe(true);
    expect(visibility.visibleCropMaskCount).toBe(1);
    expect(blackSubmesh.visible).toBe(true);
    expect(blackSubmesh.userData.auroraTerrainVoidMaskVisibility).toBe(
      "kept_source_crop_mask"
    );
    expect(blackSubmesh.userData.auroraTerrainVoidMaskRenderContract).toBe(
      "source_crop_mask"
    );
    expect(blackSubmesh.renderOrder).toBe(0);
    expect((blackSubmesh.material as THREE.Material).side).toBe(THREE.DoubleSide);
    expect((blackSubmesh.material as THREE.Material).depthWrite).toBe(true);
    expect((blackSubmesh.material as THREE.Material).depthTest).toBe(true);
  });

  it("does not reclassify elevated black crop masks as ceilings", () => {
    const blackCrop = new THREE.Mesh(
      new THREE.PlaneGeometry(10, 10),
      new THREE.MeshBasicMaterial({ name: "Aurora material sic11_black" })
    );
    blackCrop.name = "nerotile";
    blackCrop.geometry.rotateX(-Math.PI / 2);
    blackCrop.geometry.translate(0, 4.66667, 0);
    blackCrop.userData = {
      aurora: {
        sourceMesh: "nerotile",
        textureReference: "sic11_black"
      }
    };

    expect(isTerrainTileVoidMaskMeshForTests(blackCrop)).toBe(true);
    expect(isTerrainTileCeilingMeshForTests(blackCrop)).toBe(false);
  });

  it("does not hide visible a00_00 tile meshes just because the root model is blank", () => {
    const visibleWall = new THREE.Mesh(
      new THREE.BoxGeometry(10, 2, 0.4),
      new THREE.MeshBasicMaterial({ name: "Aurora material sic11_wall01" })
    );
    visibleWall.name = "muro01__a00";
    visibleWall.userData = {
      aurora: {
        sourceMesh: "muro01__a00",
        textureReference: "sic11_wall01"
      }
    };
    const root = new THREE.Group();
    root.userData.auroraTerrainTileId = "tile-0";
    root.userData.auroraTerrainTileModelResRef = "sic11_a00_00";
    root.add(visibleWall);

    expect(isTerrainTileVoidMaskMeshForTests(visibleWall)).toBe(false);
  });

  it("still identifies roof meshes as ceilings", () => {
    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(10, 0.2, 10),
      new THREE.MeshBasicMaterial({ name: "Aurora material sic11_roof" })
    );
    roof.name = "soffitto__143";

    expect(isTerrainTileCeilingMeshForTests(roof)).toBe(true);
  });

  it("keeps sic11_a01_12 wall trim beams visible instead of treating them as ceilings", () => {
    const upperTrim = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 0.4, 1.6),
      new THREE.MeshBasicMaterial({ name: "Aurora material sic11_wall01" })
    );
    upperTrim.name = "trave08";
    upperTrim.userData = {
      aurora: {
        sourceMesh: "trave08",
        textureReference: "sic11_wall01"
      }
    };
    const root = new THREE.Group();
    root.userData.auroraTerrainTileId = "tile-231";
    root.userData.auroraTerrainTileModelResRef = "sic11_a01_12";
    root.add(upperTrim);

    expect(isTerrainTileCeilingMeshForTests(upperTrim)).toBe(false);
  });

  it("keeps large sic11_a01_07 structural trave meshes visible", () => {
    const structuralBeam = new THREE.Mesh(
      new THREE.BoxGeometry(9, 4.7, 9),
      new THREE.MeshBasicMaterial({ name: "Aurora material sic11_wall01" })
    );
    structuralBeam.name = "trave";
    structuralBeam.userData = {
      aurora: {
        sourceMesh: "trave",
        textureReference: "sic11_wall01"
      }
    };
    const root = new THREE.Group();
    root.userData.auroraTerrainTileId = "tile-197";
    root.userData.auroraTerrainTileModelResRef = "sic11_a01_07";
    root.add(structuralBeam);

    expect(isTerrainTileCeilingMeshForTests(structuralBeam)).toBe(false);
  });

  it("identifies floor meshes as ground surfaces, not ceilings or void masks", () => {
    const floor = new THREE.Mesh(
      new THREE.BoxGeometry(10, 0.04, 10),
      new THREE.MeshBasicMaterial({ name: "Aurora material sic11_floor03" })
    );
    floor.name = "pavimento3__170";
    floor.userData = {
      aurora: {
        sourceMesh: "pavimento3__170",
        textureReference: "sic11_floor03"
      }
    };

    expect(isTerrainTileGroundSurfaceMeshForTests(floor)).toBe(true);
    expect(isTerrainTileCeilingMeshForTests(floor)).toBe(false);
    expect(isTerrainTileVoidMaskMeshForTests(floor)).toBe(false);
  });

  it("treats elevated wood room planes as ceilings instead of ground", () => {
    const woodRoomPlaneGeometry = new THREE.BoxGeometry(8, 0.04, 8);
    woodRoomPlaneGeometry.translate(0, 4, 0);
    const woodRoomPlane = new THREE.Mesh(
      woodRoomPlaneGeometry,
      new THREE.MeshBasicMaterial({ name: "Aurora material tno01_wood05" })
    );
    woodRoomPlane.name = "object11";
    woodRoomPlane.userData = {
      aurora: {
        sourceMesh: "object11",
        textureReference: "tno01_wood05"
      }
    };

    expect(isTerrainTileCeilingMeshForTests(woodRoomPlane)).toBe(true);
    expect(isTerrainTileGroundSurfaceMeshForTests(woodRoomPlane)).toBe(false);
  });

  it("keeps the bci01 Plane07 wood floor at Aurora Y=3 visible as ground", () => {
    const floorGeometry = new THREE.BoxGeometry(8, 0.04, 8);
    floorGeometry.translate(0, 3, 0);
    const floor = new THREE.Mesh(
      floorGeometry,
      new THREE.MeshBasicMaterial({ name: "Aurora material bci01_wood02" })
    );
    floor.name = "Plane07";
    floor.userData = {
      aurora: {
        sourceMesh: "Plane07",
        textureReference: "bci01_wood02"
      }
    };

    expect(isTerrainTileCeilingMeshForTests(floor)).toBe(false);
    expect(isTerrainTileGroundSurfaceMeshForTests(floor)).toBe(true);
  });

  it("does not hide an explicitly named elevated Aurora ground mesh as a ceiling", () => {
    const groundGeometry = new THREE.PlaneGeometry(10, 10);
    groundGeometry.rotateX(-Math.PI / 2);
    groundGeometry.translate(0, 5, 0);
    const ground = new THREE.Mesh(
      groundGeometry,
      new THREE.MeshBasicMaterial({ name: "Aurora material tcm01_cobble01" })
    );
    ground.name = "ground01";
    ground.userData = {
      aurora: { sourceMesh: "ground01", textureReference: "tcm01_cobble01" }
    };

    expect(isTerrainTileCeilingMeshForTests(ground)).toBe(false);
    expect(isTerrainTileGroundSurfaceMeshForTests(ground)).toBe(true);
  });

  it("binds terrain tile material maps from mesh Aurora texture metadata", () => {
    const texture = new THREE.Texture();
    const material = new THREE.MeshStandardMaterial({
      name: "Aurora material placeholder"
    });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material);
    mesh.userData = {
      aurora: {
        sourceMesh: "object01",
        textureReference: "tni01_lwalls"
      }
    };
    const root = new THREE.Group();
    root.add(mesh);

    const result = applyTerrainTileMaterialTexturesFromMeshMetadataForTests(
      root,
      new Map([["tni01_lwalls", texture]])
    );

    expect(result.appliedMaterialCount).toBe(1);
    expect(material.map).toBe(texture);
    expect(material.userData.auroraTerrainTileMaterialTextureBindingSource).toBe(
      "terrain-mesh-source-metadata"
    );
  });

  it("does not report intentionally textureless Aurora material slots as missing maps", () => {
    const texture = new THREE.Texture();
    const textured = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshBasicMaterial({
        name: "Aurora material sic11_floor03",
        map: texture
      })
    );
    textured.userData = {
      aurora: { textureReference: "sic11_floor03" }
    };
    const colorOnly = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshBasicMaterial({ name: "Aurora material null" })
    );
    colorOnly.userData = {
      aurora: { textureReference: "null" }
    };
    const root = new THREE.Group();
    root.add(textured, colorOnly);

    expect(summarizeTerrainTileMaterialMapCoverageForTests(root)).toEqual({
      textureCapableMaterialCount: 1,
      texturedMaterialCount: 1,
      missingReferenceSample: "none"
    });
  });

  it("keeps an authored texture reference without a map blocking material coverage", () => {
    const missing = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshBasicMaterial({ name: "Aurora material sic11_wall01" })
    );
    missing.userData = {
      aurora: { textureReference: "sic11_wall01" }
    };

    expect(summarizeTerrainTileMaterialMapCoverageForTests(missing)).toEqual({
      textureCapableMaterialCount: 1,
      texturedMaterialCount: 0,
      missingReferenceSample: "sic11_wall01"
    });
  });

  it("rotates rotatetexture tile material maps with the source-backed compensation", () => {
    const texture = new THREE.Texture();
    const rotatingMaterial = new THREE.MeshBasicMaterial({ map: texture });
    const rotatingFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      rotatingMaterial
    );
    rotatingFloor.userData = {
      aurora: {
        sourceMesh: "pavimento3__170",
        textureReference: "sic11_floor03",
        material: {
          rotateTexture: true
        }
      }
    };
    const staticMaterial = new THREE.MeshBasicMaterial({ map: texture });
    const staticFloor = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), staticMaterial);
    staticFloor.userData = {
      aurora: {
        sourceMesh: "pavimento2__171",
        textureReference: "sic11_floor02",
        material: {
          rotateTexture: false
        }
      }
    };
    const root = new THREE.Group();
    root.userData.auroraTerrainTileRenderYawQuarterTurns = 1;
    root.add(rotatingFloor, staticFloor);

    const result = applyTerrainTileRotatingTextureCompensationForTests(root);

    expect(result.adjustedMaterialCount).toBe(1);
    expect(rotatingFloor.material).not.toBe(rotatingMaterial);
    expect((rotatingFloor.material as THREE.MeshBasicMaterial).map).not.toBe(texture);
    expect((rotatingFloor.material as THREE.MeshBasicMaterial).map?.rotation).toBeCloseTo(
      -Math.PI / 2
    );
    expect(staticFloor.material).toBe(staticMaterial);
  });

  it("recovers rotatetexture for known sic11 floor material maps", () => {
    const texture = new THREE.Texture();
    const recoveredMaterial = new THREE.MeshBasicMaterial({ map: texture });
    const recoveredFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      recoveredMaterial
    );
    recoveredFloor.userData = {
      aurora: {
        sourceMesh: "pavimento3__98",
        textureReference: "sic11_floor03"
      }
    };
    const nonRotatingMaterial = new THREE.MeshBasicMaterial({ map: texture });
    const nonRotatingFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      nonRotatingMaterial
    );
    nonRotatingFloor.userData = {
      aurora: {
        sourceMesh: "23r54w34tfwersd",
        textureReference: "sic11_floor03"
      }
    };
    const root = new THREE.Group();
    root.userData.auroraTerrainTileRenderYawQuarterTurns = 2;
    root.add(recoveredFloor, nonRotatingFloor);

    const result = applyTerrainTileRotatingTextureCompensationForTests(root);

    expect(result.adjustedMaterialCount).toBe(1);
    expect(recoveredFloor.material).not.toBe(recoveredMaterial);
    expect((recoveredFloor.material as THREE.MeshBasicMaterial).map?.rotation).toBeCloseTo(
      -Math.PI
    );
    expect(nonRotatingFloor.material).toBe(nonRotatingMaterial);
  });

  it("converts loaded terrain tile model materials to texture-color basic without dropping crop state", () => {
    const texture = new THREE.Texture();
    const alphaMap = new THREE.Texture();
    const standardMaterial = new THREE.MeshStandardMaterial({
      name: "Aurora material sic11_floor03",
      map: texture,
      alphaMap,
      color: new THREE.Color(0xffffff),
      transparent: true,
      opacity: 0.75,
      alphaTest: 0.25,
      side: THREE.DoubleSide,
      depthWrite: false,
      depthTest: true,
      blending: THREE.NormalBlending
    });
    standardMaterial.vertexColors = true;
    standardMaterial.userData.auroraTextureTxiReference = "sic11_floor03";
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), standardMaterial);
    const alreadyBasic = new THREE.MeshBasicMaterial({ map: texture });
    const mask = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), alreadyBasic);
    const root = new THREE.Group();
    root.add(floor, mask);

    const result = applyTerrainTileTextureColorMaterialModeForTests(root);

    expect(result).toEqual({
      convertedMaterialCount: 1,
      inspectedMaterialCount: 2
    });
    expect(floor.material).toBeInstanceOf(THREE.MeshBasicMaterial);
    expect(floor.material).not.toBe(standardMaterial);
    expect((floor.material as THREE.MeshBasicMaterial).map).toBe(texture);
    expect((floor.material as THREE.MeshBasicMaterial).alphaMap).toBe(alphaMap);
    expect((floor.material as THREE.MeshBasicMaterial).transparent).toBe(true);
    expect((floor.material as THREE.MeshBasicMaterial).opacity).toBeCloseTo(0.75);
    expect((floor.material as THREE.MeshBasicMaterial).alphaTest).toBeCloseTo(0.25);
    expect((floor.material as THREE.MeshBasicMaterial).side).toBe(THREE.DoubleSide);
    expect((floor.material as THREE.MeshBasicMaterial).depthWrite).toBe(false);
    expect((floor.material as THREE.MeshBasicMaterial).depthTest).toBe(true);
    expect((floor.material as THREE.MeshBasicMaterial).vertexColors).toBe(true);
    expect((floor.material as THREE.MeshBasicMaterial).userData.auroraTextureTxiReference).toBe(
      "sic11_floor03"
    );
    expect(mask.material).toBe(alreadyBasic);
    expect(root.userData.auroraTerrainTileMaterialLightingMode).toBe(
      "texture_color_unlit_use_area_lighting_disabled"
    );
  });

  it("does not classify vertical wood wall meshes as replaceable ground surfaces", () => {
    const wall = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 2, 10),
      new THREE.MeshBasicMaterial({ name: "Aurora material sic11_wood02" })
    );
    wall.name = "travemuro04";
    wall.userData = {
      aurora: {
        sourceMesh: "travemuro04",
        textureReference: "sic11_wood02"
      }
    };

    expect(isTerrainTileGroundSurfaceMeshForTests(wall)).toBe(false);
  });

  it("keeps ImageMap2D disabled over source-backed tile GLB materials", () => {
    expect(isTerrainImageMapSourceBackedOverlayEnabledForTests()).toBe(false);
    expect(
      shouldRenderTerrainTileImageMapForTests(
        { tileId: 0, modelResRef: "sic11_a00_00" },
        true
      )
    ).toBe(false);
    expect(
      shouldRenderTerrainTileImageMapForTests(
        { tileId: 217, modelResRef: "sic11_f16_12" },
        true
      )
    ).toBe(false);
    expect(
      shouldRenderTerrainTileImageMapForTests(
        { tileId: 94, modelResRef: "tni01_o20_01" },
        true
      )
    ).toBe(false);
    expect(
      shouldRenderTerrainTileImageMapForTests(
        { tileId: 0, modelResRef: "sic11_a00_00" },
        false
      )
    ).toBe(true);
    expect(
      shouldRenderTerrainTileImageMapForTests(
        { tileId: 94, modelResRef: "tni01_o20_01" },
        false
      )
    ).toBe(true);
  });

  it("settles ImageMap2D status when source-backed texture loads fail", () => {
    expect(resolveTerrainImageMapStatusForTests(0, 0, 0)).toBe("missing");
    expect(resolveTerrainImageMapStatusForTests(5, 0, 0)).toBe("loading");
    expect(resolveTerrainImageMapStatusForTests(5, 5, 0)).toBe("ready");
    expect(resolveTerrainImageMapStatusForTests(5, 2, 3)).toBe("partial");
    expect(resolveTerrainImageMapStatusForTests(5, 0, 5)).toBe("failed");
  });

  it("treats near-black ImageMap2D pixels as source-backed void alpha", () => {
    expect(resolveTerrainImageMapVoidAlphaForTests(0, 0, 0)).toBe(0);
    expect(resolveTerrainImageMapVoidAlphaForTests(8, 7, 6)).toBe(0);
    expect(resolveTerrainImageMapVoidAlphaForTests(32, 24, 12)).toBe(255);
    expect(resolveTerrainImageMapVoidAlphaForTests(96, 50, 20)).toBe(255);
  });

  it("applies source-backed void alpha to decoded TPC/DDS DataTexture image maps", () => {
    const source = new THREE.DataTexture(
      new Uint8Array([
        0, 0, 0, 255,
        6, 4, 2, 255,
        32, 24, 12, 255,
        96, 50, 20, 255
      ]),
      2,
      2,
      THREE.RGBAFormat
    );

    const transparent =
      createTerrainImageMapTextureWithTransparentVoidForTests(source) as THREE.DataTexture;
    const data = transparent.image.data as Uint8Array;

    expect(transparent).not.toBe(source);
    expect(transparent.userData.auroraTerrainImageMapVoidAlphaSource).toBe(
      "data-texture"
    );
    expect(data[3]).toBe(0);
    expect(data[7]).toBe(0);
    expect(data[11]).toBe(255);
    expect(data[15]).toBe(255);
  });

  it("keeps tile floors, walls, beams, and stairs visible while hiding explicit source model overdraw", () => {
    const floor = new THREE.Mesh(
      new THREE.BoxGeometry(10, 0.04, 10),
      new THREE.MeshBasicMaterial({ name: "Aurora material sic11_floor03" })
    );
    floor.name = "pavimento3__170";
    floor.userData = {
      aurora: {
        sourceMesh: "pavimento3__170",
        textureReference: "sic11_floor03"
      }
    };
    const wall = new THREE.Mesh(
      new THREE.BoxGeometry(10, 2, 0.4),
      new THREE.MeshBasicMaterial({ name: "Aurora material sic11_wall01" })
    );
    wall.name = "muro01__88";
    wall.userData = {
      aurora: {
        sourceMesh: "muro01__88",
        textureReference: "sic11_wall01"
      }
    };
    const looseBeam = new THREE.Mesh(
      new THREE.BoxGeometry(4.7, 4.7, 11.8),
      new THREE.MeshBasicMaterial({ name: "Aurora material sic11_wall01" })
    );
    looseBeam.name = "trave07";
    looseBeam.userData = {
      aurora: {
        sourceMesh: "trave07",
        textureReference: "sic11_wall01"
      }
    };
    const stair = new THREE.Mesh(
      new THREE.BoxGeometry(4.7, 0.75, 4.7),
      new THREE.MeshBasicMaterial({ name: "Aurora material sic11_stair1" })
    );
    stair.name = "34teegyrye";
    stair.userData = {
      aurora: {
        sourceMesh: "34teegyrye",
        textureReference: "sic11_stair1"
      }
    };
    const explicitOverdraw = new THREE.Mesh(
      new THREE.BoxGeometry(10, 0.04, 10),
      new THREE.MeshBasicMaterial({ name: "Aurora material tile_overdraw" })
    );
    explicitOverdraw.name = "tile_overdraw_mask";
    explicitOverdraw.userData = {
      aurora: {
        sourceMesh: "tile_overdraw_mask",
        textureReference: "tile_overdraw"
      }
    };
    const root = new THREE.Group();
    root.add(floor, wall, looseBeam, stair, explicitOverdraw);

    const result = applyTerrainTileModelOverdrawVisibilityForTests(root);

    expect(result.hiddenCount).toBe(1);
    expect(floor.visible).toBe(true);
    expect(wall.visible).toBe(true);
    expect(looseBeam.visible).toBe(true);
    expect(stair.visible).toBe(true);
    expect(explicitOverdraw.visible).toBe(false);
    expect(root.visible).toBe(true);
  });
});
