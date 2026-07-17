import { describe, expect, it } from "vitest";
import {
  applyAuroraAreaObjectLayerRenderFrameForTests,
  applyAreaObjectToolsetLayeringForTests,
  isPlaceableMaterialTextureSignatureAppliedForTests,
  markPlaceableMaterialTextureSignatureForTests,
  resolveAreaObjectFinalVisualTransformMatrixForTests,
  resolveAreaObjectModelSurfaceLiftForTests,
  resolveAreaObjectTerrainSurfaceEvidenceForTests,
  resolveAreaObjectTerrainSurfaceClipForTests,
  resolveAreaTerrainOverlayPresentationScaleForTests,
  resolveAreaTerrainOverlayRenderOrderForTests,
  resolveInactiveAreaPlaceableDamageStateMeshSuppressionModeForTests,
  resolveObjectVisualOffsetVectorForTests,
  resolveObjectVisualRotationEulerForTests,
  resolveObjectVisualScaleVectorForTests,
  resolvePlaceableModelMaterialMapTextureUrlsByReferenceForTests,
  resolvePlaceableModelTextureSignatureForTests,
  resolvePlaceableModelVisibleMaterialMapTextureUrlsByReferenceForTests,
  shouldSuppressInactiveAreaPlaceableDamageStateMeshForTests,
  summarizePlaceableModelMaterialTextureCoverageForTests,
  updateObjectMeshSelectionState
} from "../../../../src/modules/layout/adapters/three/workspaceObjectMeshLayer";
import * as THREE from "three";
import type { SceneObject } from "../../../../src/modules/scene/contracts";
import type { SceneObjectVisualTransform } from "../../../../src/modules/scene/contracts";
import { isVisualTransformAppliedToObject } from "../../../../src/modules/layout/visualTransformGizmoRules";

const VISUAL_TRANSFORM: SceneObjectVisualTransform = {
  scale: 1,
  scaleX: 1,
  scaleY: 1,
  scaleZ: 1,
  offsetX: 0,
  offsetY: 0,
  offsetZ: 0,
  pitch: 0.25,
  yaw: 0.5,
  roll: 0.75
};

const AREA_SOLID_OBJECT_RENDER_ORDER_FOR_TESTS = 6;
const AURORA_TO_THREE_VISUAL_BASIS_FOR_TESTS = new THREE.Matrix4().set(
  1, 0, 0, 0,
  0, 0, 1, 0,
  0, 1, 0, 0,
  0, 0, 0, 1
);
const THREE_TO_AURORA_VISUAL_BASIS_FOR_TESTS =
  AURORA_TO_THREE_VISUAL_BASIS_FOR_TESTS.clone().invert();
const AURORA_VISUAL_AXIS_X_FOR_TESTS = new THREE.Vector3(1, 0, 0);
const AURORA_VISUAL_AXIS_Y_FOR_TESTS = new THREE.Vector3(0, 1, 0);
const AURORA_VISUAL_AXIS_Z_FOR_TESTS = new THREE.Vector3(0, 0, 1);

function deg(value: number): number {
  return THREE.MathUtils.degToRad(value);
}

const ENON_BAKERY_NON_STATIC_VISUAL_TRANSFORM_ROWS: readonly {
  readonly sourceId: string;
  readonly templateId: string;
  readonly isStatic: false;
  readonly bearing: number;
  readonly transform: SceneObjectVisualTransform;
}[] = [
  ["obj_plc_scaffold_segment", "plc_other_001", 0, 1, 1, 1, 0, 0, 90],
  ["obj_plc_scaffold_segment_2", "plc_other_001", 0, 1, 1, 1, 0, 0, 90],
  ["obj_plc_bagsacks2", "plc_witcher290", 90.0002, 1, 1, 1, 0, 90, 0],
  ["obj_plc_witcher_plant_3", "plc_witcher763", 90.0002, 2, 2, 2, 0, 0, 0],
  ["obj_plc_q_floorwooden_1", "plc_q_155", 269.9998, 0.5, 0.5, 0.5, 0, 0, 90],
  ["obj_plc_q_floorwooden_1_2", "plc_q_155", 90.0002, 0.5, 0.5, 0.5, 0, 0, 90],
  ["obj_plc_q_floorwooden_1_3", "plc_q_155", 0, 0.5, 0.5, 0.5, 270, 0, 90],
  ["obj_plc_q_floorwooden_1_4", "plc_q_155", 90.0002, 0.5, 0.5, 0.5, 0, 0, 90],
  ["obj_plc_scaffold_segment_6", "plc_other_001", 0, 1, 1, 1, 0, 0, 90],
  ["obj_plc_scaffold_segment_7", "plc_other_001", 0, 1.1, 1.1, 1.1, 0, 0, 45],
  ["obj_plc_scaffold_segment_8", "plc_other_001", 0, 1, 1, 1, 0, 0, 90],
  ["obj_plc_scaffold_segment_9", "plc_other_001", 180.0004, 1.1, 1.1, 1.1, 0, 0, 45],
  ["obj_plc_witcher_bucket_3", "plc_witcher377", 90.0002, 0.5, 0.5, 0.5, 0, 0, 0],
  ["obj_plc_zep_dirt01_3", "plc_zep_dirt008", 337.4999, 0.2, 0.2, 0.2, 0, 0, 0],
  ["obj_plc_witcherwindow8", "plc_witcher290", 135.0003, 0.82, 0.82, 0.82, 0, 0, 0],
  ["obj_plc_witcherwindow8_2", "plc_witcher290", 180.0004, 0.82, 0.82, 0.82, 0, 0, 0],
  ["obj_plc_valeshopbox1", "plc_witcher290", 348.7528, 0.87, 0.87, 0.87, 0, 0, 0]
].map(
  ([
    sourceId,
    templateId,
    bearingDegrees,
    scaleX,
    scaleY,
    scaleZ,
    rotateX,
    rotateY,
    rotateZ
  ]) => ({
    sourceId,
    templateId,
    isStatic: false,
    bearing: deg(bearingDegrees),
    transform: {
      scale: scaleX,
      scaleX,
      scaleY,
      scaleZ,
      offsetX: 0,
      offsetY: 0,
      offsetZ: 0,
      pitch: deg(rotateX),
      roll: deg(rotateY),
      yaw: deg(rotateZ)
    }
  })
);

function createAreaPlaceableObject(
  overrides: Partial<SceneObject> = {}
): SceneObject {
  return {
    id: "area_enon_bakery:obj_plc_zep_throwrug058",
    kind: "placeables",
    name: "ZEP_THROWRUG058",
    resRef: "zep_throwrug058",
    tag: "ZEP_THROWRUG058",
    x: 2.495,
    y: 1.1,
    z: 0,
    bearing: 0,
    visualTransform: {
      scale: 1,
      scaleX: 1,
      scaleY: 1,
      scaleZ: 1,
      offsetX: 0,
      offsetY: 0,
      offsetZ: 0,
      pitch: 0,
      yaw: 0,
      roll: 0
    },
    source: {
      type: "aurora_git",
      areaId: "area_enon_bakery",
      sourceKind: "placeable",
      sourceObjectId: "obj_plc_zep_throwrug058",
      templateId: "plc_zep_throwrug058",
      sourceModelResRef: "plc_v10"
    },
    ...overrides
  } as SceneObject;
}

function createModelWithBounds(size: {
  x: number;
  y: number;
  z: number;
}): THREE.Object3D {
  const model = new THREE.Group();
  model.add(
    new THREE.Mesh(
      new THREE.BoxGeometry(size.x, size.y, size.z),
      new THREE.MeshBasicMaterial()
    )
  );
  return model;
}

function createTerrainSurfaceEvidence(surfaceY: number) {
  return {
    status: "hit" as const,
    surfaceY,
    worldX: 1.5,
    worldZ: 2.5,
    rayOriginY: 4,
    rayFar: 12,
    hitCount: 1,
    candidateMeshCount: 4,
    meshName: "terrain-floor",
    tileId: "tile-0-0",
    modelResRef: "sic11_a01_12"
  };
}

function createNoHitTerrainSurfaceEvidence() {
  return {
    status: "no-hit" as const,
    surfaceY: 0,
    worldX: 3.126,
    worldZ: 2.216,
    rayOriginY: 4,
    rayFar: 12,
    hitCount: 0,
    candidateMeshCount: 8,
    meshName: "",
    tileId: "",
    modelResRef: ""
  };
}

function expectQuaternionClose(
  actualEuler: THREE.Euler,
  expectedQuaternion: THREE.Quaternion
): void {
  const actualQuaternion = new THREE.Quaternion().setFromEuler(actualEuler);
  expect(Math.abs(actualQuaternion.dot(expectedQuaternion.normalize()))).toBeCloseTo(1, 6);
}

function expectMatrixClose(actual: THREE.Matrix4, expected: THREE.Matrix4): void {
  actual.elements.forEach((value, index) => {
    expect(value).toBeCloseTo(expected.elements[index], 6);
  });
}

function expectedAreaVisualTransformQuaternion(
  transform: SceneObjectVisualTransform,
  bearing: number,
  resolveRenderYaw: (yaw: number) => number
): THREE.Quaternion {
  const auroraRotation = new THREE.Matrix4().makeRotationFromQuaternion(
    new THREE.Quaternion()
      .setFromAxisAngle(AURORA_VISUAL_AXIS_Z_FOR_TESTS, transform.pitch)
      .multiply(
        new THREE.Quaternion().setFromAxisAngle(
          AURORA_VISUAL_AXIS_X_FOR_TESTS,
          transform.roll
        )
      )
      .multiply(
        new THREE.Quaternion().setFromAxisAngle(
          AURORA_VISUAL_AXIS_Y_FOR_TESTS,
          transform.yaw
        )
      )
      .normalize()
  );
  const visualRotation = AURORA_TO_THREE_VISUAL_BASIS_FOR_TESTS
    .clone()
    .multiply(auroraRotation)
    .multiply(THREE_TO_AURORA_VISUAL_BASIS_FOR_TESTS);
  const visualQuaternion = new THREE.Quaternion()
    .setFromRotationMatrix(visualRotation)
    .normalize();
  return new THREE.Quaternion()
    .setFromAxisAngle(new THREE.Vector3(0, 1, 0), resolveRenderYaw(bearing))
    .multiply(visualQuaternion)
    .normalize();
}

describe("workspaceObjectMeshLayer visual transform rotation", () => {
  it("mirrors the area object layer while keeping local placeable X in source coordinates", () => {
    const runtime = {
      objectLayer: new THREE.Group(),
      boundsLayer: new THREE.Group()
    };

    applyAuroraAreaObjectLayerRenderFrameForTests(runtime as never, true, 4);

    expect(runtime.objectLayer.position.x).toBe(4);
    expect(runtime.objectLayer.scale.x).toBe(-1);
    expect(runtime.boundsLayer.position.x).toBe(4);
    expect(runtime.boundsLayer.scale.x).toBe(-1);
    expect(runtime.objectLayer.userData.auroraAreaRenderFrameMirror).toBe("coordinate-x");
    expect(runtime.boundsLayer.userData.auroraAreaRenderFrameMirrorWidth).toBe(4);

    runtime.objectLayer.updateMatrixWorld(true);
    const sourceLocal = new THREE.Vector3(1.2, 0, 2.5);
    const world = runtime.objectLayer.localToWorld(sourceLocal.clone());
    expect(world.x).toBeCloseTo(2.8);
    expect(world.z).toBeCloseTo(2.5);
  });

  it("preserves VisualTransform scale axes in the Three render frame", () => {
    const transform: SceneObjectVisualTransform = {
      ...VISUAL_TRANSFORM,
      scale: 1,
      scaleX: 1.1,
      scaleY: 1.2,
      scaleZ: 1.3
    };
    const scale = resolveObjectVisualScaleVectorForTests(transform, 1);

    expect(scale.x).toBeCloseTo(1.1, 6);
    expect(scale.y).toBeCloseTo(1.3, 6);
    expect(scale.z).toBeCloseTo(1.2, 6);
  });

  it("keeps preview object VisualTransform scale on the existing Three axes", () => {
    const transform: SceneObjectVisualTransform = {
      ...VISUAL_TRANSFORM,
      scale: 1,
      scaleX: 1.1,
      scaleY: 1.2,
      scaleZ: 1.3
    };
    const scale = resolveObjectVisualScaleVectorForTests(transform, 1.16);

    expect(scale.x).toBeCloseTo(1.1 * 1.16, 6);
    expect(scale.y).toBeCloseTo(1.3 * 1.16, 6);
    expect(scale.z).toBeCloseTo(1.2 * 1.16, 6);
  });

  it("composes imported area VisualTransform in the object's local facing frame", () => {
    const bearing = 1.25;
    const euler = resolveObjectVisualRotationEulerForTests(
      VISUAL_TRANSFORM,
      bearing,
      (yaw) => -yaw,
      true
    );
    const expected = expectedAreaVisualTransformQuaternion(
      VISUAL_TRANSFORM,
      bearing,
      (yaw) => -yaw
    );

    expectQuaternionClose(euler, expected);
  });

  it("keeps Aurora retail YawPitchRoll order when multiple VisualTransform rotation axes are set", () => {
    const transform: SceneObjectVisualTransform = {
      ...VISUAL_TRANSFORM,
      pitch: 0.4,
      roll: 0.7,
      yaw: 1.1
    };
    const bearing = 0.35;
    const euler = resolveObjectVisualRotationEulerForTests(
      transform,
      bearing,
      (yaw) => -yaw,
      true
    );
    const expected = expectedAreaVisualTransformQuaternion(
      transform,
      bearing,
      (yaw) => -yaw
    );
    const previousEulerXyzQuaternion = new THREE.Quaternion()
      .setFromAxisAngle(new THREE.Vector3(0, 1, 0), -bearing)
      .multiply(
        new THREE.Quaternion().setFromEuler(
          new THREE.Euler(transform.pitch, transform.roll, transform.yaw, "XYZ")
        )
      )
      .normalize();
    const actualQuaternion = new THREE.Quaternion().setFromEuler(euler);

    expectQuaternionClose(euler, expected);
    expect(Math.abs(actualQuaternion.dot(previousEulerXyzQuaternion))).toBeLessThan(0.999);
  });

  it("applies source pitch/yaw/roll to non-static floor-token VisualTransform", () => {
    const transform: SceneObjectVisualTransform = {
      ...VISUAL_TRANSFORM,
      pitch: (Math.PI * 3) / 2,
      yaw: Math.PI / 2,
      roll: 0
    };
    const floorObject = createAreaPlaceableObject({
      id: "area_enon_bakery:obj_plc_q_floorwooden_1_3",
      name: "[Q] Podloga drewniana 1x1",
      resRef: "q_155",
      tag: "q_floorwooden_1",
      isStatic: false,
      source: {
        type: "aurora_git",
        areaId: "area_enon_bakery",
        sourceKind: "placeable",
        sourceObjectId: "obj_plc_q_floorwooden_1_3",
        templateId: "plc_q_155",
        sourceModelResRef: "pfl_b01"
      }
    });
    const euler = resolveObjectVisualRotationEulerForTests(
      transform,
      0,
      (yaw) => -yaw,
      true,
      floorObject
    );
    const expected = expectedAreaVisualTransformQuaternion(transform, 0, (yaw) => -yaw);

    expectQuaternionClose(euler, expected);
  });

  it("applies every enon_bakery non-static VisualTransform through the shared Area render path", () => {
    expect(ENON_BAKERY_NON_STATIC_VISUAL_TRANSFORM_ROWS).toHaveLength(17);
    for (const row of ENON_BAKERY_NON_STATIC_VISUAL_TRANSFORM_ROWS) {
      const object = createAreaPlaceableObject({
        id: `area_enon_bakery:${row.sourceId}`,
        isStatic: row.isStatic,
        bearing: row.bearing,
        visualTransform: row.transform,
        source: {
          type: "aurora_git",
          areaId: "area_enon_bakery",
          sourceKind: "placeable",
          sourceObjectId: row.sourceId,
          templateId: row.templateId
        }
      });
      const scale = resolveObjectVisualScaleVectorForTests(row.transform, 1);
      const euler = resolveObjectVisualRotationEulerForTests(
        row.transform,
        row.bearing,
        (yaw) => -yaw,
        true,
        object
      );
      const expected = expectedAreaVisualTransformQuaternion(
        row.transform,
        row.bearing,
        (yaw) => -yaw
      );

      expect(row.isStatic).toBe(false);
      expect(isVisualTransformAppliedToObject(object)).toBe(true);
      expect(scale.x).toBeCloseTo(row.transform.scaleX ?? row.transform.scale, 6);
      expect(scale.y).toBeCloseTo(row.transform.scaleZ ?? row.transform.scale, 6);
      expect(scale.z).toBeCloseTo(row.transform.scaleY ?? row.transform.scale, 6);
      expectQuaternionClose(euler, expected);
    }
  });

  it("resolves visual transform offsets in the object's facing frame", () => {
    const transform: SceneObjectVisualTransform = {
      ...VISUAL_TRANSFORM,
      offsetX: 0,
      offsetY: 0.25,
      offsetZ: 0.4
    };
    const offset = resolveObjectVisualOffsetVectorForTests(
      transform,
      Math.PI / 2,
      (yaw) => yaw,
      false
    );

    expect(offset.x).toBeCloseTo(0.25, 6);
    expect(offset.y).toBeCloseTo(0.4, 6);
    expect(offset.z).toBeCloseTo(0, 6);
  });

  it("resolves area visual transform offsets through mirrored object bearing", () => {
    const transform: SceneObjectVisualTransform = {
      ...VISUAL_TRANSFORM,
      offsetX: 0,
      offsetY: 0.25,
      offsetZ: 0.4
    };
    const offset = resolveObjectVisualOffsetVectorForTests(
      transform,
      Math.PI / 2,
      (yaw) => -yaw,
      true
    );

    expect(offset.x).toBeCloseTo(-0.25, 6);
    expect(offset.y).toBeCloseTo(0.4, 6);
    expect(offset.z).toBeCloseTo(0, 6);
  });

  it("keeps source-frame visual transform offsetX before the Area object layer mirror", () => {
    const transform: SceneObjectVisualTransform = {
      ...VISUAL_TRANSFORM,
      offsetX: 0.2,
      offsetY: 0,
      offsetZ: 0.4
    };
    const offset = resolveObjectVisualOffsetVectorForTests(
      transform,
      0,
      (yaw) => -yaw,
      true
    );

    expect(offset.x).toBeCloseTo(0.2, 6);
    expect(offset.y).toBeCloseTo(0.4, 6);
    expect(offset.z).toBeCloseTo(0, 6);
  });

  it("composes Area placement and VisualTransform as two separate matrices", () => {
    const transform: SceneObjectVisualTransform = {
      scale: 1,
      scaleX: 1.1,
      scaleY: 1.2,
      scaleZ: 1.3,
      offsetX: 0.2,
      offsetY: 0.4,
      offsetZ: 0.6,
      pitch: deg(15),
      roll: deg(30),
      yaw: deg(45)
    };
    const basePosition = new THREE.Vector3(3, 1, 4);
    const bearing = deg(90);
    const renderYaw = (yaw: number) => -yaw;
    const expectedPlacement = new THREE.Matrix4().compose(
      basePosition,
      new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -bearing),
      new THREE.Vector3(1, 1, 1)
    );
    const expectedVisual = new THREE.Matrix4().compose(
      new THREE.Vector3(transform.offsetX, transform.offsetZ, transform.offsetY),
      expectedAreaVisualTransformQuaternion(transform, 0, () => 0),
      new THREE.Vector3(transform.scaleX, transform.scaleZ, transform.scaleY)
    );
    const expectedFinal = expectedPlacement.clone().multiply(expectedVisual);
    const actualFinal = resolveAreaObjectFinalVisualTransformMatrixForTests(
      basePosition,
      transform,
      bearing,
      renderYaw
    );

    expectMatrixClose(actualFinal, expectedFinal);

    const position = new THREE.Vector3();
    actualFinal.decompose(position, new THREE.Quaternion(), new THREE.Vector3());
    expect(position.x).toBeCloseTo(2.6, 6);
    expect(position.y).toBeCloseTo(1.6, 6);
    expect(position.z).toBeCloseTo(4.2, 6);
  });

  it("keeps preview-mode visual transforms on the existing Three axes", () => {
    const bearing = 1.25;
    const euler = resolveObjectVisualRotationEulerForTests(
      VISUAL_TRANSFORM,
      bearing,
      (yaw) => yaw,
      false
    );
    const expected = expectedAreaVisualTransformQuaternion(
      VISUAL_TRANSFORM,
      bearing,
      (yaw) => yaw
    );

    expectQuaternionClose(euler, expected);
  });
});

describe("workspaceObjectMeshLayer Area terrain overlay presentation", () => {
  it("hides selected-only source affordances when the selection is cleared", () => {
    const object = createAreaPlaceableObject();
    const root = new THREE.Group();
    const footprint = new THREE.Mesh(
      new THREE.TorusGeometry(0.24, 0.01, 8, 16),
      new THREE.MeshBasicMaterial({ opacity: 0.98, transparent: true })
    );
    const label = new THREE.Sprite(new THREE.SpriteMaterial());
    footprint.userData = {
      areaObjectSourceAffordance: true
    };
    label.userData = {
      role: "area-object-source-id-label"
    };
    root.add(footprint);
    root.add(label);

    updateObjectMeshSelectionState(
      {
        objectMeshById: new Map([[object.id, root]])
      } as never,
      [object],
      [],
      {
        bounds: false,
        collisionOverlay: false,
        objectLabels: false
      } as never,
      1,
      true
    );

    expect(footprint.visible).toBe(false);
    expect(label.visible).toBe(false);
  });

  it("keeps undersized thin rug overlays at source scale", () => {
    const model = createModelWithBounds({ x: 0.22, y: 0.01, z: 0.16 });
    const scale = resolveAreaTerrainOverlayPresentationScaleForTests(
      model,
      createAreaPlaceableObject()
    );

    expect(scale).toBe(1);
  });

  it("keeps localized dywan carpet placeables at source scale", () => {
    const model = createModelWithBounds({ x: 0.54, y: 0.05, z: 0.3 });
    const scale = resolveAreaTerrainOverlayPresentationScaleForTests(
      model,
      createAreaPlaceableObject({
        id: "area_enon_bakery:obj_plc_witcher2_dywan",
        name: "[W2] Dywan",
        resRef: "witcher217",
        tag: "witcher2_Dywan",
        source: {
          type: "aurora_git",
          areaId: "area_enon_bakery",
          sourceKind: "placeable",
          sourceObjectId: "obj_plc_witcher2_dywan",
          templateId: "plc_witcher217",
          sourceModelResRef: "wit2_0004"
        }
      })
    );

    expect(scale).toBe(1);
  });

  it("draws floor overlays below localized dywan carpet overlays", () => {
    const floorOrder = resolveAreaTerrainOverlayRenderOrderForTests(
      createAreaPlaceableObject({
        id: "area_enon_bakery:obj_plc_q_155",
        name: "Wood floor overlay",
        resRef: "q_155",
        tag: "q_floorwooden_1",
        source: {
          type: "aurora_git",
          areaId: "area_enon_bakery",
          sourceKind: "placeable",
          sourceObjectId: "obj_plc_q_155",
          templateId: "plc_q_155",
          sourceModelResRef: "pfl_b01"
        }
      })
    );
    const dywanOrder = resolveAreaTerrainOverlayRenderOrderForTests(
      createAreaPlaceableObject({
        id: "area_enon_bakery:obj_plc_witcher2_dywan",
        name: "[W2] Dywan",
        resRef: "witcher217",
        tag: "witcher2_Dywan",
        source: {
          type: "aurora_git",
          areaId: "area_enon_bakery",
          sourceKind: "placeable",
          sourceObjectId: "obj_plc_witcher2_dywan",
          templateId: "plc_witcher217",
          sourceModelResRef: "wit2_0004"
        }
      })
    );

    expect(floorOrder).toBeLessThan(dywanOrder);
  });

  it("preserves source Z for thin localized dywan overlays", () => {
    const model = createModelWithBounds({ x: 0.54, y: 0.05, z: 0.3 });
    const lift = resolveAreaObjectModelSurfaceLiftForTests(
      model,
      createAreaPlaceableObject({
        id: "area_enon_bakery:obj_plc_witcher2_dywan",
        name: "[W2] Dywan",
        resRef: "witcher217",
        tag: "witcher2_Dywan",
        source: {
          type: "aurora_git",
          areaId: "area_enon_bakery",
          sourceKind: "placeable",
          sourceObjectId: "obj_plc_witcher2_dywan",
          templateId: "plc_witcher217",
          sourceModelResRef: "wit2_0004"
        }
      })
    );

    expect(lift).toBeCloseTo(0, 6);
  });

  it("lifts terrain-hit rug overlays above the sampled floor when their model dips below it", () => {
    const model = new THREE.Group();
    const geometry = new THREE.BoxGeometry(0.54, 0.006, 0.3);
    geometry.translate(0, 0.0003, 0);
    model.add(new THREE.Mesh(geometry, new THREE.MeshBasicMaterial()));

    const lift = resolveAreaObjectModelSurfaceLiftForTests(
      model,
      createAreaPlaceableObject({
        id: "area_enon_bakery:obj_plc_witcher2_dywan",
        name: "[W2] Dywan",
        resRef: "witcher217",
        tag: "witcher2_Dywan",
        source: {
          type: "aurora_git",
          areaId: "area_enon_bakery",
          sourceKind: "placeable",
          sourceObjectId: "obj_plc_witcher2_dywan",
          templateId: "plc_witcher217",
          sourceModelResRef: "wit2_0004"
        }
      }),
      0,
      1,
      createTerrainSurfaceEvidence(0)
    );

    expect(lift).toBeCloseTo(0.0087, 6);
    expect(-0.0027 + lift).toBeCloseTo(0.006, 6);
  });

  it("preserves source anchors for regular area placeables whose bounds dip below the floor", () => {
    const model = createModelWithBounds({ x: 0.4, y: 0.3, z: 0.4 });
    const lift = resolveAreaObjectModelSurfaceLiftForTests(
      model,
      createAreaPlaceableObject({
        id: "area_enon_bakery:obj_plc_bakery_counter",
        name: "Bakery Counter",
        resRef: "plc_bakery_counter",
        tag: "PLC_BAKERY_COUNTER",
        source: {
          type: "aurora_git",
          areaId: "area_enon_bakery",
          sourceKind: "placeable",
          sourceObjectId: "obj_plc_bakery_counter",
          templateId: "plc_bakery_counter",
          sourceModelResRef: "plc_bakery_counter"
        }
      })
    );

    expect(lift).toBeCloseTo(0, 6);
  });

  it("raycasts area terrain surface at the rendered object anchor without remirroring X", () => {
    const scene = new THREE.Scene();
    const layer = new THREE.Group();
    layer.name = "terrain-backend-tile-models";
    const tileRoot = new THREE.Group();
    tileRoot.userData = {
      auroraTerrainTileId: "area_enon_bakery:tile:5",
      auroraTerrainTileModelResRef: "sic11_a01_07"
    };
    const terrainMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.02, 0.5),
      new THREE.MeshBasicMaterial()
    );
    terrainMesh.position.set(1.25, 0, 2.25);
    terrainMesh.userData = {
      auroraTerrainGroundSurfaceDepthWrite: "disabled"
    };
    tileRoot.add(terrainMesh);
    layer.add(tileRoot);
    scene.add(layer);

    const evidence = resolveAreaObjectTerrainSurfaceEvidenceForTests(
      { scene } as Parameters<typeof resolveAreaObjectTerrainSurfaceEvidenceForTests>[0],
      true,
      4,
      1.25,
      2.25
    );

    expect(evidence.status).toBe("hit");
    expect(evidence.worldX).toBeCloseTo(1.25, 6);
    expect(evidence.worldZ).toBeCloseTo(2.25, 6);
    expect(evidence.tileId).toBe("area_enon_bakery:tile:5");
  });

  it("clips thin Aurora source-anchor placeables when their terrain anchor has no surface hit", () => {
    const model = createModelWithBounds({ x: 0.0296, y: 0.6, z: 0.0296 });
    const evidence = resolveAreaObjectTerrainSurfaceClipForTests(
      model,
      createAreaPlaceableObject({
        id: "area_enon_bakery:obj_plc_thin_source_anchor",
        name: "Thin source anchor",
        resRef: "thin_anchor",
        tag: "thin_anchor",
        x: 0.874,
        y: 2.216,
        z: 0.447,
        visualTransform: {
          scale: 1,
          scaleX: 1,
          scaleY: 1,
          scaleZ: 1,
          offsetX: 0,
          offsetY: 0,
          offsetZ: 0,
          pitch: 0,
          yaw: Math.PI / 2,
          roll: 0
        },
        source: {
          type: "aurora_git",
          areaId: "area_enon_bakery",
          sourceKind: "placeable",
          sourceObjectId: "obj_plc_thin_source_anchor",
          templateId: "plc_thin_source_anchor",
          sourceModelResRef: "thin_anchor"
        }
      }),
      createNoHitTerrainSurfaceEvidence()
    );

    expect(evidence.status).toBe("clipped");
    expect(evidence.applied).toBe(true);
    expect(evidence.reason).toBe("thin-source-anchor-no-terrain-surface");
    expect(evidence.footprint).toBeCloseTo(0.0296, 6);
    expect(evidence.height).toBeCloseTo(0.6, 6);
  });

  it("keeps Toolset scaffold helper placeables visible as transform markers when terrain has a surface hit", () => {
    const model = createModelWithBounds({ x: 0.0296, y: 0.6, z: 0.0296 });
    const evidence = resolveAreaObjectTerrainSurfaceClipForTests(
      model,
      createAreaPlaceableObject({
        id: "area_enon_bakery:obj_plc_scaffold_segment_7",
        name: "Craft: Scaffold Segment V2",
        resRef: "other_001",
        tag: "scaffold_segment",
        x: 1.59,
        y: 2.217,
        z: -0.02,
        visualTransform: {
          scale: 1.1,
          scaleX: 1.1,
          scaleY: 1.1,
          scaleZ: 1.1,
          offsetX: 0,
          offsetY: 0,
          offsetZ: 0,
          pitch: 0,
          yaw: Math.PI / 4,
          roll: 0
        },
        source: {
          type: "aurora_git",
          areaId: "area_enon_bakery",
          sourceKind: "placeable",
          sourceObjectId: "obj_plc_scaffold_segment_7",
          templateId: "plc_other_001",
          sourceModelResRef: "zlc_fky_b15",
          appearanceType: 8810
        }
      }),
      createTerrainSurfaceEvidence(0)
    );

    expect(evidence.status).toBe("visible");
    expect(evidence.applied).toBe(false);
    expect(evidence.reason).toBe("toolset-scaffold-helper-marker-visible");
    expect(evidence.terrainSurfaceStatus).toBe("hit");
  });

  it("keeps non-helper thin source-anchor placeables visible when terrain surface is hit", () => {
    const model = createModelWithBounds({ x: 0.0296, y: 0.6, z: 0.0296 });
    const evidence = resolveAreaObjectTerrainSurfaceClipForTests(
      model,
      createAreaPlaceableObject({
        id: "area_enon_bakery:obj_plc_thin_source_anchor_hit",
        name: "Thin source anchor",
        resRef: "thin_anchor",
        tag: "thin_anchor",
        x: 1.474,
        y: 2.216,
        z: 0.447,
        source: {
          type: "aurora_git",
          areaId: "area_enon_bakery",
          sourceKind: "placeable",
          sourceObjectId: "obj_plc_thin_source_anchor_hit",
          templateId: "plc_thin_source_anchor",
          sourceModelResRef: "thin_anchor"
        }
      }),
      createTerrainSurfaceEvidence(0)
    );

    expect(evidence.status).toBe("visible");
    expect(evidence.applied).toBe(false);
    expect(evidence.reason).toBe("terrain-surface-hit");
  });

  it("does not clip larger no-hit placeables with the thin scaffold guard", () => {
    const model = createModelWithBounds({ x: 0.4, y: 0.5, z: 0.3 });
    const evidence = resolveAreaObjectTerrainSurfaceClipForTests(
      model,
      createAreaPlaceableObject({
        id: "area_enon_bakery:obj_plc_large_no_hit",
        name: "Large no-hit diagnostic placeable",
        resRef: "large_no_hit",
        tag: "large_no_hit",
        source: {
          type: "aurora_git",
          areaId: "area_enon_bakery",
          sourceKind: "placeable",
          sourceObjectId: "obj_plc_large_no_hit",
          templateId: "plc_large_no_hit",
          sourceModelResRef: "large_no_hit"
        }
      }),
      createNoHitTerrainSurfaceEvidence()
    );

    expect(evidence.status).toBe("visible");
    expect(evidence.applied).toBe(false);
    expect(evidence.reason).toBe("no-hit-model-not-thin-source-anchor");
  });

  it("preserves elevated model origins on regular Aurora source anchors", () => {
    const model = new THREE.Group();
    const geometry = new THREE.BoxGeometry(0.24, 0.08, 0.24);
    geometry.translate(0, 0.11, 0);
    model.add(new THREE.Mesh(geometry, new THREE.MeshBasicMaterial()));

    const lift = resolveAreaObjectModelSurfaceLiftForTests(
      model,
      createAreaPlaceableObject({
        id: "area_enon_bakery:obj_plc_mtt_v2_068",
        name: "Elevated origin placeable",
        resRef: "mtt_v2_068",
        tag: "MTT_V2_068",
        z: 0.1472,
        source: {
          type: "aurora_git",
          areaId: "area_enon_bakery",
          sourceKind: "placeable",
          sourceObjectId: "obj_plc_mtt_v2_068",
          templateId: "plc_mtt_v2_068",
          sourceModelResRef: "mtt_v2_068"
        }
      }),
      0.1472
    );

    expect(lift).toBeCloseTo(0, 6);
  });

  it("keeps elevated source anchors unchanged in child-model units", () => {
    const model = new THREE.Group();
    const geometry = new THREE.BoxGeometry(0.24, 0.08, 0.24);
    geometry.translate(0, 0.11, 0);
    model.add(new THREE.Mesh(geometry, new THREE.MeshBasicMaterial()));

    const lift = resolveAreaObjectModelSurfaceLiftForTests(
      model,
      createAreaPlaceableObject({
        id: "area_enon_bakery:obj_plc_mtt_v2_068_scaled",
        name: "Scaled elevated origin placeable",
        resRef: "mtt_v2_068",
        tag: "MTT_V2_068",
        z: 0.1472,
        visualTransform: { scale: 0.5, scaleX: 0.5, scaleY: 0.5, scaleZ: 0.5 },
        source: {
          type: "aurora_git",
          areaId: "area_enon_bakery",
          sourceKind: "placeable",
          sourceObjectId: "obj_plc_mtt_v2_068_scaled",
          templateId: "plc_mtt_v2_068",
          sourceModelResRef: "mtt_v2_068"
        }
      }),
      0.1472,
      0.5
    );

    expect(lift).toBeCloseTo(0, 6);
    expect(0.1472 + lift * 0.5).toBeCloseTo(0.1472, 6);
  });

  it("preserves negative source Z anchors instead of compensating them to floor zero", () => {
    const model = new THREE.Group();
    const geometry = new THREE.BoxGeometry(0.08, 0.06, 0.08);
    geometry.translate(0, 0.03, 0);
    model.add(new THREE.Mesh(geometry, new THREE.MeshBasicMaterial()));

    const lift = resolveAreaObjectModelSurfaceLiftForTests(
      model,
      createAreaPlaceableObject({
        id: "area_enon_bakery:obj_plc_nwn_bread",
        name: "Bread",
        resRef: "nwn2_chleb",
        tag: "nwn_bread",
        z: -0.075,
        source: {
          type: "aurora_git",
          areaId: "area_enon_bakery",
          sourceKind: "placeable",
          sourceObjectId: "obj_plc_nwn_bread",
          templateId: "plc_nwn2_chleb",
          sourceModelResRef: "nw2_bread"
        }
      }),
      -0.075
    );

    expect(lift).toBeCloseTo(0, 6);
  });

  it("does not use sampled terrain surface height to rewrite regular placeable Z anchors", () => {
    const model = new THREE.Group();
    const geometry = new THREE.BoxGeometry(0.08, 0.06, 0.08);
    geometry.translate(0, 0.03, 0);
    model.add(new THREE.Mesh(geometry, new THREE.MeshBasicMaterial()));

    const lift = resolveAreaObjectModelSurfaceLiftForTests(
      model,
      createAreaPlaceableObject({
        id: "area_enon_bakery:obj_plc_surface_probe",
        name: "Surface Probe",
        resRef: "surface_probe",
        tag: "SURFACE_PROBE",
        z: 0.1,
        source: {
          type: "aurora_git",
          areaId: "area_enon_bakery",
          sourceKind: "placeable",
          sourceObjectId: "obj_plc_surface_probe",
          templateId: "plc_surface_probe",
          sourceModelResRef: "surface_probe"
        }
      }),
      0.1,
      1,
      createTerrainSurfaceEvidence(0.18)
    );

    expect(lift).toBeCloseTo(0, 6);
  });

  it("does not lower regular area placeables when sampled terrain is below the anchor", () => {
    const model = new THREE.Group();
    const geometry = new THREE.BoxGeometry(0.08, 0.06, 0.08);
    geometry.translate(0, 0.03, 0);
    model.add(new THREE.Mesh(geometry, new THREE.MeshBasicMaterial()));

    const lift = resolveAreaObjectModelSurfaceLiftForTests(
      model,
      createAreaPlaceableObject({
        id: "area_enon_bakery:obj_plc_surface_probe",
        name: "Surface Probe",
        resRef: "surface_probe",
        tag: "SURFACE_PROBE",
        source: {
          type: "aurora_git",
          areaId: "area_enon_bakery",
          sourceKind: "placeable",
          sourceObjectId: "obj_plc_surface_probe",
          templateId: "plc_surface_probe",
          sourceModelResRef: "surface_probe"
        }
      }),
      0,
      1,
      createTerrainSurfaceEvidence(-0.15)
    );

    expect(lift).toBeCloseTo(0, 6);
  });

  it("preserves elevated source Z for floor overlay placeables", () => {
    const model = new THREE.Group();
    const geometry = new THREE.PlaneGeometry(1, 1);
    geometry.rotateX(-Math.PI / 2);
    model.add(new THREE.Mesh(geometry, new THREE.MeshBasicMaterial()));

    const offset = resolveAreaObjectModelSurfaceLiftForTests(
      model,
      createAreaPlaceableObject({
        id: "area_enon_bakery:obj_plc_q_floorwooden_1",
        name: "Wood floor overlay",
        resRef: "q_155",
        tag: "q_floorwooden_1",
        z: 0.195,
        source: {
          type: "aurora_git",
          areaId: "area_enon_bakery",
          sourceKind: "placeable",
          sourceObjectId: "obj_plc_q_floorwooden_1",
          templateId: "plc_q_155",
          sourceModelResRef: "pfl_b01"
        }
      }),
      0.195
    );

    expect(offset).toBeCloseTo(0, 6);

    const scaledParentOffset = resolveAreaObjectModelSurfaceLiftForTests(
      model,
      createAreaPlaceableObject({
        id: "area_enon_bakery:obj_plc_q_floorwooden_1",
        name: "Wood floor overlay",
        resRef: "q_155",
        tag: "q_floorwooden_1",
        z: 0.195,
        visualTransform: { scale: 0.5, scaleX: 0.5, scaleY: 0.5, scaleZ: 0.5 },
        source: {
          type: "aurora_git",
          areaId: "area_enon_bakery",
          sourceKind: "placeable",
          sourceObjectId: "obj_plc_q_floorwooden_1",
          templateId: "plc_q_155",
          sourceModelResRef: "pfl_b01"
        }
      }),
      0.195,
      0.5
    );

    expect(scaledParentOffset).toBeCloseTo(0, 6);
    expect(0.195 + 0.5 * scaledParentOffset).toBeCloseTo(0.195, 6);
  });

  it("preserves elevated source Z for token decal terrain overlays", () => {
    const model = new THREE.Group();
    const geometry = new THREE.PlaneGeometry(1, 1);
    geometry.rotateX(-Math.PI / 2);
    model.add(new THREE.Mesh(geometry, new THREE.MeshBasicMaterial()));

    const offset = resolveAreaObjectModelSurfaceLiftForTests(
      model,
      createAreaPlaceableObject({
        id: "area_enon_bakery:obj_plc_zep_dirt01_3",
        name: "Dirt overlay",
        resRef: "zep_dirt008",
        tag: "ZEP_DIRT01",
        z: 0.086,
        visualTransform: { scale: 0.2, scaleX: 0.2, scaleY: 0.2, scaleZ: 0.2 },
        source: {
          type: "aurora_git",
          areaId: "area_enon_bakery",
          sourceKind: "placeable",
          sourceObjectId: "obj_plc_zep_dirt01_3",
          templateId: "plc_zep_dirt008",
          sourceModelResRef: "zep_dirt008"
        }
      }),
      0.086,
      0.2
    );

    expect(offset).toBeCloseTo(0, 6);
    expect(0.086 + 0.2 * offset).toBeCloseTo(0.086, 6);

    const splatOffset = resolveAreaObjectModelSurfaceLiftForTests(
      model,
      createAreaPlaceableObject({
        id: "area_enon_bakery:obj_plc_zep_splat007",
        name: "Splat overlay",
        resRef: "zep_splat007",
        tag: "ZEP_SPLAT007",
        z: 0.0843,
        source: {
          type: "aurora_git",
          areaId: "area_enon_bakery",
          sourceKind: "placeable",
          sourceObjectId: "obj_plc_zep_splat007",
          templateId: "plc_zep_splat007",
          sourceModelResRef: "zep_splat007"
        }
      }),
      0.0843
    );

    expect(splatOffset).toBeCloseTo(0, 6);
    expect(0.0843 + splatOffset).toBeCloseTo(0.0843, 6);
  });

  it("does not upscale non-rug objects or already readable rug overlays", () => {
    const smallModel = createModelWithBounds({ x: 0.22, y: 0.01, z: 0.16 });
    const readableRug = createModelWithBounds({ x: 0.74, y: 0.01, z: 0.2 });

    expect(
      resolveAreaTerrainOverlayPresentationScaleForTests(
        smallModel,
        createAreaPlaceableObject({
          id: "area_enon_bakery:obj_plc_bakery_counter",
          name: "Bakery Counter",
          resRef: "plc_bakery_counter",
          tag: "PLC_BAKERY_COUNTER",
          source: {
            type: "aurora_git",
            areaId: "area_enon_bakery",
            sourceKind: "placeable",
            sourceObjectId: "obj_plc_bakery_counter",
            templateId: "plc_bakery_counter",
            sourceModelResRef: "plc_bakery_counter"
          }
        })
      )
    ).toBe(1);
    expect(
      resolveAreaTerrainOverlayPresentationScaleForTests(
        readableRug,
        createAreaPlaceableObject()
      )
    ).toBe(1);
  });
});

describe("workspaceObjectMeshLayer placeable texture material signatures", () => {
  function createTextureReferencedModel(): {
    model: THREE.Object3D;
    material: THREE.MeshBasicMaterial;
  } {
    const model = new THREE.Group();
    const material = new THREE.MeshBasicMaterial();
    material.name = "Aurora material ob_plantmag_03";
    model.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material));
    return { model, material };
  }

  it("does not treat signed Aurora materials without maps as fully textured", () => {
    const { model } = createTextureReferencedModel();

    markPlaceableMaterialTextureSignatureForTests(model, "plant-signature");

    expect(
      isPlaceableMaterialTextureSignatureAppliedForTests(model, "plant-signature")
    ).toBe(false);
    expect(summarizePlaceableModelMaterialTextureCoverageForTests(model)).toEqual({
      referencedMaterialCount: 1,
      mappedMaterialCount: 0,
      missingMapMaterialCount: 1
    });
  });

  it("accepts the shared texture signature only after the referenced material has a map", () => {
    const { model, material } = createTextureReferencedModel();
    material.map = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);

    markPlaceableMaterialTextureSignatureForTests(model, "plant-signature");

    expect(
      isPlaceableMaterialTextureSignatureAppliedForTests(model, "plant-signature")
    ).toBe(true);
    expect(summarizePlaceableModelMaterialTextureCoverageForTests(model)).toEqual({
      referencedMaterialCount: 1,
      mappedMaterialCount: 1,
      missingMapMaterialCount: 0
    });
  });

  it("does not fail the signature for material references without advertised texture bindings", () => {
    const { model } = createTextureReferencedModel();
    const advertisedReferences = new Set(["nwp_default_n"]);

    markPlaceableMaterialTextureSignatureForTests(
      model,
      "normal-only-signature",
      advertisedReferences
    );

    expect(
      isPlaceableMaterialTextureSignatureAppliedForTests(
        model,
        "normal-only-signature",
        advertisedReferences
      )
    ).toBe(true);
    expect(
      summarizePlaceableModelMaterialTextureCoverageForTests(model, advertisedReferences)
    ).toEqual({
      referencedMaterialCount: 0,
      mappedMaterialCount: 0,
      missingMapMaterialCount: 0
    });
  });

  it("loads the visible material map before secondary Aurora MTR texture slots", () => {
    const model = new THREE.Group();
    const material = new THREE.MeshBasicMaterial();
    material.name = "Aurora material d_hp019";
    model.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material));
    const textureUrlsByReference = new Map([
      ["d_hp019_n", "/assets/d_hp019_n.dds"],
      ["d_hp019_r", "/assets/d_hp019_r.dds"],
      ["d_hp019_s", "/assets/d_hp019_s.dds"],
      ["d_hp019", "/assets/d_hp019.dds"]
    ]);

    const materialMapTextures =
      resolvePlaceableModelMaterialMapTextureUrlsByReferenceForTests(
        model,
        textureUrlsByReference
      );

    expect(Array.from(materialMapTextures.entries())).toEqual([
      ["d_hp019", "/assets/d_hp019.dds"]
    ]);
  });

  it("loads material maps referenced by imported primary MDL material metadata", () => {
    const model = new THREE.Group();
    const material = new THREE.MeshBasicMaterial();
    material.userData = {
      auroraPrimaryTextureReference: "w_greatsword"
    };
    model.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material));
    const textureUrlsByReference = new Map([
      ["c_bathorror", "/assets/c_bathorror.dds"],
      ["w_greatsword", "/assets/w_greatsword.dds"],
      ["w_greatsword_2", "/assets/w_greatsword_2.dds"]
    ]);

    const materialMapTextures =
      resolvePlaceableModelMaterialMapTextureUrlsByReferenceForTests(
        model,
        textureUrlsByReference
      );

    expect(Array.from(materialMapTextures.entries())).toEqual([
      ["w_greatsword", "/assets/w_greatsword.dds"]
    ]);
  });

  it("loads backend MTR texture slots for material base references", () => {
    const model = new THREE.Group();
    const material = new THREE.MeshBasicMaterial();
    material.name = "Aurora material c2_spidgi_b01";
    model.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material));
    const textureUrlsByReference = new Map([
      ["c2_spidgi_b01_d", "/assets/c2_spidgi_b01_d.dds"],
      ["c2_spidgi_b01_n", "/assets/c2_spidgi_b01_n.dds"],
      ["c2_spidgi_b01_r", "/assets/c2_spidgi_b01_r.dds"],
      ["c2_spidgi_b01_s", "/assets/c2_spidgi_b01_s.dds"]
    ]);

    const materialMapTextures =
      resolvePlaceableModelMaterialMapTextureUrlsByReferenceForTests(
        model,
        textureUrlsByReference,
        {
          auroraMaterial: {
            source: "mtr",
            materials: [
              {
                source: "aurora-mtr",
                materialAssetId: "mat_spider",
                materialFileName: "c2_spidgi_b01.mtr",
                materialObjectKey: "modules/current/materials/c2_spidgi_b01.mtr",
                state: {
                  textureSlots: [
                    { slot: 0, role: "diffuse", reference: "c2_spidgi_b01_d" },
                    { slot: 1, role: "normal", reference: "c2_spidgi_b01_n" },
                    { slot: 2, role: "specular", reference: "c2_spidgi_b01_s" },
                    { slot: 3, role: "roughness", reference: "c2_spidgi_b01_r" }
                  ]
                }
              }
            ],
            diagnostics: []
          }
        }
      );

    expect(Array.from(materialMapTextures.entries())).toEqual([
      ["c2_spidgi_b01_d", "/assets/c2_spidgi_b01_d.dds"],
      ["c2_spidgi_b01_n", "/assets/c2_spidgi_b01_n.dds"],
      ["c2_spidgi_b01_r", "/assets/c2_spidgi_b01_r.dds"],
      ["c2_spidgi_b01_s", "/assets/c2_spidgi_b01_s.dds"]
    ]);

    const visibleMaterialMapTextures =
      resolvePlaceableModelVisibleMaterialMapTextureUrlsByReferenceForTests(
        model,
        textureUrlsByReference,
        {
          auroraMaterial: {
            source: "mtr",
            materials: [
              {
                source: "aurora-mtr",
                materialAssetId: "mat_spider",
                materialFileName: "c2_spidgi_b01.mtr",
                materialObjectKey: "modules/current/materials/c2_spidgi_b01.mtr",
                state: {
                  textureSlots: [
                    { slot: 0, role: "diffuse", reference: "c2_spidgi_b01_d" },
                    { slot: 1, role: "normal", reference: "c2_spidgi_b01_n" },
                    { slot: 2, role: "specular", reference: "c2_spidgi_b01_s" },
                    { slot: 3, role: "roughness", reference: "c2_spidgi_b01_r" }
                  ]
                }
              }
            ],
            diagnostics: []
          }
        }
      );

    expect(Array.from(visibleMaterialMapTextures.entries())).toEqual([
      ["c2_spidgi_b01_d", "/assets/c2_spidgi_b01_d.dds"]
    ]);
  });

  it("prefers backend MTR slots over legacy base textures when both are advertised", () => {
    const model = new THREE.Group();
    const material = new THREE.MeshBasicMaterial();
    material.name = "Aurora material tdm01_crtes01";
    model.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material));
    const textureUrlsByReference = new Map([
      ["tdm01_crtes01", "/assets/tdm01_crtes01.dds"],
      ["tdm01_crtes01_d", "/assets/tdm01_crtes01_d.dds"],
      ["tdm01_crtes01_n", "/assets/tdm01_crtes01_n.dds"],
      ["tdm01_crtes01_r", "/assets/tdm01_crtes01_r.dds"],
      ["tdm01_crtes01_s", "/assets/tdm01_crtes01_s.dds"]
    ]);

    const materialMapTextures =
      resolvePlaceableModelMaterialMapTextureUrlsByReferenceForTests(
        model,
        textureUrlsByReference,
        {
          auroraMaterial: {
            source: "mtr",
            materials: [
              {
                source: "aurora-mtr",
                materialAssetId: "mat_crates",
                materialFileName: "tdm01_crtes01.mtr",
                materialObjectKey:
                  "modules/current/__aurora/sources/hak/cep3_facelift/tdm01_crtes01.mtr",
                state: {
                  textureSlots: [
                    { slot: 0, role: "diffuse", reference: "tdm01_crtes01_d" },
                    { slot: 1, role: "normal", reference: "tdm01_crtes01_n" },
                    { slot: 2, role: "specular", reference: "tdm01_crtes01_s" },
                    { slot: 3, role: "roughness", reference: "tdm01_crtes01_r" }
                  ]
                }
              }
            ],
            diagnostics: []
          }
        }
      );

    expect(Array.from(materialMapTextures.entries())).toEqual([
      ["tdm01_crtes01_d", "/assets/tdm01_crtes01_d.dds"],
      ["tdm01_crtes01_n", "/assets/tdm01_crtes01_n.dds"],
      ["tdm01_crtes01_r", "/assets/tdm01_crtes01_r.dds"],
      ["tdm01_crtes01_s", "/assets/tdm01_crtes01_s.dds"]
    ]);
  });

  it("does not let global secondary texture lists replace unrelated primary material maps", () => {
    const model = new THREE.Group();
    const donkeyMaterial = new THREE.MeshBasicMaterial();
    donkeyMaterial.name = "Aurora material donkey";
    donkeyMaterial.userData = {
      aurora: {
        textureReference: "donkey",
        textureReferences: ["tdm01_crtes01", "tdm01_crtes01_d", "donkey"]
      }
    };
    const crateMaterial = new THREE.MeshBasicMaterial();
    crateMaterial.name = "Aurora material tdm01_crtes01";
    model.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), donkeyMaterial));
    model.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), crateMaterial));
    const textureUrlsByReference = new Map([
      ["donkey", "/assets/donkey.dds"],
      ["tdm01_crtes01", "/assets/tdm01_crtes01.dds"],
      ["tdm01_crtes01_d", "/assets/tdm01_crtes01_d.dds"],
      ["tdm01_crtes01_n", "/assets/tdm01_crtes01_n.dds"],
      ["tdm01_crtes01_s", "/assets/tdm01_crtes01_s.dds"]
    ]);

    const materialMapTextures =
      resolvePlaceableModelMaterialMapTextureUrlsByReferenceForTests(
        model,
        textureUrlsByReference,
        {
          auroraMaterial: {
            source: "mtr",
            materials: [
              {
                source: "aurora-mtr",
                materialAssetId: "mat_crates",
                materialFileName: "tdm01_crtes01.mtr",
                materialObjectKey:
                  "modules/current/__aurora/sources/hak/cep3_facelift/tdm01_crtes01.mtr",
                state: {
                  textureSlots: [
                    { slot: 0, role: "diffuse", reference: "tdm01_crtes01_d" },
                    { slot: 1, role: "normal", reference: "tdm01_crtes01_n" },
                    { slot: 2, role: "specular", reference: "tdm01_crtes01_s" }
                  ]
                }
              }
            ],
            diagnostics: []
          }
        }
      );

    expect(Array.from(materialMapTextures.entries())).toEqual([
      ["donkey", "/assets/donkey.dds"],
      ["tdm01_crtes01_d", "/assets/tdm01_crtes01_d.dds"],
      ["tdm01_crtes01_n", "/assets/tdm01_crtes01_n.dds"],
      ["tdm01_crtes01_s", "/assets/tdm01_crtes01_s.dds"]
    ]);
  });

  it("includes Aurora MTR state in the shared material texture signature", () => {
    const textureUrlsByReference = new Map([
      ["fxpa_smoke01", "/assets/fxpa_smoke01.tga"]
    ]);

    const textureOnlySignature = resolvePlaceableModelTextureSignatureForTests(
      textureUrlsByReference
    );
    const materialSignature = resolvePlaceableModelTextureSignatureForTests(
      textureUrlsByReference,
      null,
      undefined,
      {
        source: "mtr",
        materials: [
          {
            source: "aurora-mtr",
            materialAssetId: "mat_tti01_iceclear",
            materialFileName: "tti01_iceclear.mtr",
            materialObjectKey: "modules/current/materials/tti01_iceclear.mtr",
            state: {
              customShaderVS: "vslit_sm",
              customShaderFS: "fslit_sm",
              specularity: 0.0179
            }
          }
        ],
        diagnostics: []
      }
    );

    expect(materialSignature).not.toBe(textureOnlySignature);
    expect(materialSignature).toContain("tti01_iceclear.mtr");
    expect(materialSignature).toContain("fs=fslit_sm");
  });

  it("does not load unrelated texture bindings for material refs without an available map", () => {
    const model = new THREE.Group();
    const material = new THREE.MeshBasicMaterial();
    material.name = "Aurora material tti01_iceclear";
    material.userData = {
      aurora: {
        textureReference: "tti01_iceclear",
        textureReferences: ["fxpa_smoke01", "tti01_iceclear"]
      }
    };
    model.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material));
    const textureUrlsByReference = new Map([
      ["fxpa_smoke01", "/assets/fxpa_smoke01.dds"],
      ["fxpa_smoke01i", "/assets/fxpa_smoke01i.dds"]
    ]);

    const materialMapTextures =
      resolvePlaceableModelMaterialMapTextureUrlsByReferenceForTests(
        model,
        textureUrlsByReference
      );

    expect(materialMapTextures.size).toBe(0);
  });

  it("does not count secondary MTR references as missing diffuse maps", () => {
    const model = new THREE.Group();
    const material = new THREE.MeshBasicMaterial();
    material.name = "Aurora material tti01_iceclear";
    material.userData = {
      aurora: {
        textureReference: "tti01_iceclear",
        textureReferences: ["fxpa_smoke01", "tti01_iceclear"]
      }
    };
    model.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material));
    const advertisedReferences = new Set(["fxpa_smoke01"]);

    markPlaceableMaterialTextureSignatureForTests(
      model,
      "iceclear-signature",
      advertisedReferences
    );

    expect(
      isPlaceableMaterialTextureSignatureAppliedForTests(
        model,
        "iceclear-signature",
        advertisedReferences
      )
    ).toBe(true);
    expect(
      summarizePlaceableModelMaterialTextureCoverageForTests(model, advertisedReferences)
    ).toEqual({
      referencedMaterialCount: 0,
      mappedMaterialCount: 0,
      missingMapMaterialCount: 0
    });
  });

  it("does not count global texture reference lists on default damage materials as missing diffuse maps", () => {
    const model = new THREE.Group();
    const damageMaterial = new THREE.MeshBasicMaterial();
    damageMaterial.name = "Aurora default material";
    damageMaterial.userData = {
      aurora: {
        textureReferences: ["fxpa_smoke01", "qp_barrel_02"]
      }
    };
    model.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), damageMaterial));
    const advertisedReferences = new Set(["fxpa_smoke01", "qp_barrel_02"]);

    markPlaceableMaterialTextureSignatureForTests(
      model,
      "barrel-signature",
      advertisedReferences
    );

    expect(
      isPlaceableMaterialTextureSignatureAppliedForTests(
        model,
        "barrel-signature",
        advertisedReferences
      )
    ).toBe(true);
    expect(
      summarizePlaceableModelMaterialTextureCoverageForTests(model, advertisedReferences)
    ).toEqual({
      referencedMaterialCount: 0,
      mappedMaterialCount: 0,
      missingMapMaterialCount: 0
    });
  });

  it("ignores hidden placeable damage-state meshes in texture coverage", () => {
    const model = new THREE.Group();
    const visibleMaterial = new THREE.MeshBasicMaterial();
    visibleMaterial.name = "Aurora material wit2_0004_b";
    visibleMaterial.map = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
    model.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), visibleMaterial));

    const damageMaterial = new THREE.MeshBasicMaterial();
    damageMaterial.name = "Aurora material wit2_0004_damage";
    const damageMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), damageMaterial);
    damageMesh.name = "damage50";
    damageMesh.visible = false;
    model.add(damageMesh);

    expect(summarizePlaceableModelMaterialTextureCoverageForTests(model)).toEqual({
      referencedMaterialCount: 1,
      mappedMaterialCount: 1,
      missingMapMaterialCount: 0
    });
  });

  it("suppresses untextured inactive placeable damage-state meshes in Areas render", () => {
    const damageMaterial = new THREE.MeshBasicMaterial();
    damageMaterial.name = "Aurora default material";
    const damageMesh = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      damageMaterial
    );
    damageMesh.name = "damage50";

    expect(
      shouldSuppressInactiveAreaPlaceableDamageStateMeshForTests(
        damageMesh,
        createAreaPlaceableObject({
          id: "area_enon_bakery:obj_plc_witcher2_dywan",
          resRef: "witcher217",
          tag: "witcher2_dywan",
          source: {
            type: "aurora_git",
            areaId: "area_enon_bakery",
            sourceKind: "placeable",
            sourceObjectId: "obj_plc_witcher2_dywan",
            templateId: "plc_witcher217",
            sourceModelResRef: "wit2_0004"
          }
        })
      )
    ).toBe(true);
  });

  it("suppresses only the empty damage-state surface when renderable children hang below it", () => {
    const damageMaterial = new THREE.MeshBasicMaterial();
    damageMaterial.name = "Aurora default material";
    const damageParent = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      damageMaterial
    );
    damageParent.name = "damage50";

    const childMaterial = new THREE.MeshBasicMaterial();
    childMaterial.name = "Aurora material wit2_0004_b";
    childMaterial.userData = {
      aurora: {
        textureReference: "wit2_0004_b"
      }
    };
    const renderableChild = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      childMaterial
    );
    renderableChild.name = "Mesh_4279.rip";
    damageParent.add(renderableChild);

    const object = createAreaPlaceableObject({
      id: "area_enon_bakery:obj_plc_witcher2_dywan",
      resRef: "witcher217",
      tag: "witcher2_dywan",
      source: {
        type: "aurora_git",
        areaId: "area_enon_bakery",
        sourceKind: "placeable",
        sourceObjectId: "obj_plc_witcher2_dywan",
        templateId: "plc_witcher217",
        sourceModelResRef: "wit2_0004"
      }
    });

    expect(
      resolveInactiveAreaPlaceableDamageStateMeshSuppressionModeForTests(
        damageParent,
        object
      )
    ).toBe("surface");
    expect(
      shouldSuppressInactiveAreaPlaceableDamageStateMeshForTests(damageParent, object)
    ).toBe(true);
  });

  it("renders terrain-overlay placeable materials as unlit texture-color surfaces", () => {
    const texture = new THREE.Texture();
    const alphaMap = new THREE.Texture();
    const standardMaterial = new THREE.MeshStandardMaterial({
      name: "Aurora material wit2_0004_b",
      map: texture,
      alphaMap,
      color: new THREE.Color(0x8899aa),
      transparent: true,
      opacity: 0.72,
      alphaTest: 0.18,
      side: THREE.DoubleSide,
      depthTest: false,
      depthWrite: true,
      blending: THREE.NormalBlending,
      polygonOffset: false
    });
    standardMaterial.userData = {
      auroraTextureAlphaMode: "blend",
      auroraTextureReference: "wit2_0004_b"
    };
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 0.02, 0.4),
      standardMaterial
    );
    const model = new THREE.Group();
    model.add(mesh);

    applyAreaObjectToolsetLayeringForTests(
      model,
      createAreaPlaceableObject({
        id: "area_enon_bakery:obj_plc_witcher2_dywan",
        resRef: "witcher217",
        tag: "witcher2_dywan",
        source: {
          type: "aurora_git",
          areaId: "area_enon_bakery",
          sourceKind: "placeable",
          sourceObjectId: "obj_plc_witcher2_dywan",
          templateId: "plc_witcher217",
          sourceModelResRef: "wit2_0004"
        }
      })
    );

    expect(mesh.material).toBeInstanceOf(THREE.MeshBasicMaterial);
    const material = mesh.material as THREE.MeshBasicMaterial;
    expect(material.map).toBe(texture);
    expect(material.alphaMap).toBe(alphaMap);
    expect(material.color.getHex()).toBe(0xffffff);
    expect(material.transparent).toBe(true);
    expect(material.opacity).toBeCloseTo(0.72);
    expect(material.alphaTest).toBeCloseTo(0.18);
    expect(material.side).toBe(THREE.DoubleSide);
    expect(material.depthTest).toBe(true);
    expect(material.depthWrite).toBe(false);
    expect(material.polygonOffset).toBe(true);
    expect(material.userData.auroraTextureReference).toBe("wit2_0004_b");
    expect(material.userData.auroraAreaObjectLayerMaterialLightingMode).toBe(
      "unlit-texture-color"
    );
    expect(
      material.userData.auroraAreaObjectLayerMaterialLightingConvertedFrom
    ).toBe("MeshStandardMaterial");
    expect(model.userData.auroraAreaObjectLayerMaterialLightingConvertedCount).toBe(1);
  });

  it("keeps non-flat localized dywan placeables in the solid object lane", () => {
    const material = new THREE.MeshBasicMaterial({
      name: "Aurora material mtr_core_0151",
      depthWrite: true
    });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.12, 0.06), material);
    const model = new THREE.Group();
    model.add(mesh);

    applyAreaObjectToolsetLayeringForTests(
      model,
      createAreaPlaceableObject({
        id: "area_enon_bakery:obj_plc_mtt_v2_031",
        name: "[MTT] Dywan 4",
        resRef: "mtt_v2_031",
        tag: "mtt_v2_031",
        source: {
          type: "aurora_git",
          areaId: "area_enon_bakery",
          sourceKind: "placeable",
          sourceObjectId: "obj_plc_mtt_v2_031",
          templateId: "plc_mtt_v2_031",
          sourceModelResRef: "plc_core_0291"
        }
      })
    );

    expect(model.userData.auroraAreaObjectLayering).toBe("solid");
    expect(model.userData.auroraAreaObjectLayeringReason).toBe(
      "token-pattern-bounds-not-flat-or-too-small"
    );
    expect(mesh.renderOrder).toBe(AREA_SOLID_OBJECT_RENDER_ORDER_FOR_TESTS);
    expect(material.depthWrite).toBe(true);
  });

  it("keeps flat opaque non-overlay props in the solid object lane", () => {
    const material = new THREE.MeshBasicMaterial({
      name: "Aurora material twc03_wood02",
      depthWrite: true
    });
    material.userData = {
      auroraTextureAlphaMode: "opaque",
      auroraTextureReference: "twc03_wood02"
    };
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.02, 0.12), material);
    const model = new THREE.Group();
    model.add(mesh);

    applyAreaObjectToolsetLayeringForTests(
      model,
      createAreaPlaceableObject({
        id: "area_enon_bakery:obj_plc_qfoodbins",
        name: "[W] Balustrada",
        resRef: "witcher290",
        tag: "QFoodBins",
        source: {
          type: "aurora_git",
          areaId: "area_enon_bakery",
          sourceKind: "placeable",
          sourceObjectId: "obj_plc_qfoodbins",
          templateId: "plc_witcher290",
          sourceModelResRef: "pms_z03"
        }
      })
    );

    expect(model.userData.auroraAreaObjectLayering).toBe("solid");
    expect(model.userData.auroraAreaObjectLayeringReason).toBe("no-overlay-token");
    expect(mesh.renderOrder).toBe(AREA_SOLID_OBJECT_RENDER_ORDER_FOR_TESTS);
    expect(material.depthWrite).toBe(true);
  });

  it("moves opaque terrain-overlay placeable surfaces into the transparent pass", () => {
    const material = new THREE.MeshBasicMaterial({
      name: "Aurora material wit2_0004_b",
      transparent: false,
      depthTest: true,
      depthWrite: true
    });
    material.userData = {
      auroraTextureAlphaMode: "opaque",
      auroraTextureReference: "wit2_0004_b"
    };
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.02, 0.4), material);
    const model = new THREE.Group();
    model.add(mesh);

    applyAreaObjectToolsetLayeringForTests(
      model,
      createAreaPlaceableObject({
        id: "area_enon_bakery:obj_plc_witcher2_dywan",
        resRef: "witcher217",
        tag: "witcher2_dywan",
        source: {
          type: "aurora_git",
          areaId: "area_enon_bakery",
          sourceKind: "placeable",
          sourceObjectId: "obj_plc_witcher2_dywan",
          templateId: "plc_witcher217",
          sourceModelResRef: "wit2_0004"
        }
      })
    );

    expect(model.userData.auroraAreaObjectLayering).toBe("terrain-overlay");
    expect(material.transparent).toBe(true);
    expect(material.depthTest).toBe(true);
    expect(material.depthWrite).toBe(false);
    expect(mesh.renderOrder).toBe(5);
  });

  it("renders non-static visual-transform floor-plane placeables as visible solid placeables", () => {
    const material = new THREE.MeshBasicMaterial({
      name: "Aurora material plc_woodb256",
      transparent: false,
      depthWrite: true
    });
    material.userData = {
      auroraTextureAlphaMode: "opaque",
      auroraTextureReference: "plc_woodb256"
    };
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 0.01, 1), material);
    const model = new THREE.Group();
    model.add(mesh);

    applyAreaObjectToolsetLayeringForTests(
      model,
      createAreaPlaceableObject({
        id: "area_enon_bakery:obj_plc_q_floorwooden_1",
        name: "[Q] Podloga drewniana 1x1",
        resRef: "q_155",
        tag: "q_floorwooden_1",
        isStatic: false,
        visualTransform: {
          scale: 0.5,
          scaleX: 0.5,
          scaleY: 0.5,
          scaleZ: 0.5,
          offsetX: 0,
          offsetY: 0,
          offsetZ: 0,
          pitch: 0,
          yaw: Math.PI / 2,
          roll: 0
        },
        source: {
          type: "aurora_git",
          areaId: "area_enon_bakery",
          sourceKind: "placeable",
          sourceObjectId: "obj_plc_q_floorwooden_1",
          templateId: "plc_q_155",
          sourceModelResRef: "pfl_b01"
        }
      })
    );

    expect(model.userData.auroraAreaObjectLayering).toBe("solid");
    expect(model.userData.auroraAreaObjectLayeringReason).toBe(
      "visual-transform-floor-plane-placeable-solid"
    );
    expect(model.userData.auroraAreaObjectToolsetPhysicalVisibility).toBe(
      "visible"
    );
    expect(model.visible).toBe(true);
    expect(material.transparent).toBe(false);
    expect(material.depthWrite).toBe(true);
    expect(mesh.renderOrder).toBe(AREA_SOLID_OBJECT_RENDER_ORDER_FOR_TESTS);
  });

  it("keeps tilted floor-token visual-transform placeables visible as solid placeables", () => {
    const material = new THREE.MeshBasicMaterial({
      name: "Aurora material plc_woodb256",
      transparent: false,
      depthWrite: true
    });
    material.userData = {
      auroraTextureAlphaMode: "opaque",
      auroraTextureReference: "plc_woodb256"
    };
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 0.01, 1), material);
    const model = new THREE.Group();
    model.add(mesh);

    applyAreaObjectToolsetLayeringForTests(
      model,
      createAreaPlaceableObject({
        id: "area_enon_bakery:obj_plc_q_floorwooden_1_3",
        name: "[Q] Podloga drewniana 1x1",
        resRef: "q_155",
        tag: "q_floorwooden_1",
        isStatic: false,
        visualTransform: {
          scale: 0.5,
          scaleX: 0.5,
          scaleY: 0.5,
          scaleZ: 0.5,
          offsetX: 0,
          offsetY: 0,
          offsetZ: 0,
          pitch: (Math.PI * 3) / 2,
          yaw: Math.PI / 2,
          roll: 0
        },
        source: {
          type: "aurora_git",
          areaId: "area_enon_bakery",
          sourceKind: "placeable",
          sourceObjectId: "obj_plc_q_floorwooden_1_3",
          templateId: "plc_q_155",
          sourceModelResRef: "pfl_b01"
        }
      })
    );

    expect(model.userData.auroraAreaObjectLayering).toBe("solid");
    expect(model.userData.auroraAreaObjectLayeringReason).toBe(
      "visual-transform-floor-plane-placeable-solid"
    );
    expect(model.userData.auroraAreaObjectToolsetPhysicalVisibility).toBe(
      "visible"
    );
    expect(model.visible).toBe(true);
    expect(material.depthWrite).toBe(true);
  });

  it("keeps textured damage-named meshes and non-placeable meshes visible", () => {
    const texturedMaterial = new THREE.MeshBasicMaterial();
    texturedMaterial.name = "Aurora material damage50";
    texturedMaterial.map = new THREE.Texture();
    texturedMaterial.userData = {
      aurora: {
        textureReference: "damage50"
      }
    };
    const texturedDamageMesh = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      texturedMaterial
    );
    texturedDamageMesh.name = "damage50";

    expect(
      shouldSuppressInactiveAreaPlaceableDamageStateMeshForTests(
        texturedDamageMesh,
        createAreaPlaceableObject()
      )
    ).toBe(false);
    expect(
      shouldSuppressInactiveAreaPlaceableDamageStateMeshForTests(
        texturedDamageMesh,
        {
          ...createAreaPlaceableObject(),
          kind: "creatures"
        } as SceneObject
      )
    ).toBe(false);
  });
});
