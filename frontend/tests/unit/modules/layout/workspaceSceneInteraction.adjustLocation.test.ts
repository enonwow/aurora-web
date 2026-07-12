import { describe, expect, it } from "vitest";
import {
  buildAdjustLocationDraft,
  buildAdjustLocationVisualTransformInput,
  clampHeightDeltaToSurface,
  fromAdjustLocationCoordinate,
  fromAdjustLocationVisualTranslation,
  resolveAdjustLocationVisualTransformMeta,
  resolveNextAdjustLocationDraftField,
  toAdjustLocationCoordinate,
  toAdjustLocationVisualTranslation
} from "../../../../src/modules/layout/application/workspaceSceneInteraction";
import { createSceneMutationsFacade } from "../../../../src/modules/scene/application/sceneMutationsFacade";
import type { SceneObject } from "../../../../src/modules/scene/contracts";
import {
  createNewSceneObject,
  createSeedAreaScene
} from "../../../../src/modules/scene/domain/sceneFactory";

describe("workspaceSceneInteraction Adjust Location visual transform units", () => {
  it("exposes Visual Transform fields for static placeables", () => {
    const staticPlaceable: SceneObject = {
      ...createNewSceneObject("placeables", 1, 1, 1),
      isStatic: true
    };

    const meta = resolveAdjustLocationVisualTransformMeta([staticPlaceable]);

    expect(meta.showVisualTransforms).toBe(true);
    expect(meta.mixedStaticPlaceables).toBe(false);
  });

  it("uses the same Adjust Location units for visual translation on every axis", () => {
    const object: SceneObject = {
      ...createNewSceneObject("placeables", 1, 1, 1),
      visualTransform: {
        scale: 1,
        scaleX: 1,
        scaleY: 1,
        scaleZ: 1,
        offsetX: 0.25,
        offsetY: -0.35,
        offsetZ: 0.45,
        pitch: 0,
        yaw: 0,
        roll: 0
      }
    };

    const draft = buildAdjustLocationDraft(object, 10, 4, 4);

    expect(draft.xTranslation).toBeCloseTo(2.5, 6);
    expect(draft.yTranslation).toBeCloseTo(-3.5, 6);
    expect(draft.zTranslation).toBeCloseTo(4.5, 6);
    expect(draft.scale).toBeCloseTo(1, 6);
    expect(draft.scaleX).toBeCloseTo(1, 6);
    expect(draft.scaleY).toBeCloseTo(1, 6);
    expect(draft.scaleZ).toBeCloseTo(1, 6);
    expect(fromAdjustLocationVisualTranslation(draft.xTranslation, 10)).toBeCloseTo(0.25, 6);
    expect(fromAdjustLocationVisualTranslation(draft.yTranslation, 10)).toBeCloseTo(-0.35, 6);
    expect(fromAdjustLocationVisualTranslation(draft.zTranslation, 10)).toBeCloseTo(0.45, 6);
    expect(toAdjustLocationVisualTranslation(0.25, 10)).toBeCloseTo(2.5, 6);

    const input = buildAdjustLocationVisualTransformInput(
      {
        ...draft,
        xTranslation: 5,
        yTranslation: -7,
        zTranslation: 9,
        xRotationDeg: 90,
        yRotationDeg: 180,
        zRotationDeg: 270
      },
      10
    );

    expect(input.offsetX).toBeCloseTo(0.5, 6);
    expect(input.offsetY).toBeCloseTo(-0.7, 6);
    expect(input.offsetZ).toBeCloseTo(0.9, 6);
    expect(input.pitch).toBeCloseTo(Math.PI / 2, 6);
    expect(input.yaw).toBeCloseTo(Math.PI, 6);
    expect(input.roll).toBeCloseTo((Math.PI * 3) / 2, 6);
  });

  it("shows source/toolset position units without mirroring area coordinates", () => {
    expect(toAdjustLocationCoordinate(0.8741, 4, 10)).toBeCloseTo(8.741, 6);
    expect(toAdjustLocationCoordinate(2.2161, 4, 10)).toBeCloseTo(22.161, 6);
    expect(fromAdjustLocationCoordinate(8.741, 4, 10)).toBeCloseTo(0.8741, 6);
    expect(fromAdjustLocationCoordinate(22.161, 4, 10)).toBeCloseTo(2.2161, 6);
  });

  it("allows negative Aurora height deltas for transform controls", () => {
    const object: SceneObject = {
      ...createNewSceneObject("placeables", 1, 1, 1),
      z: 0.2
    };

    expect(clampHeightDeltaToSurface([object], -0.7)).toBeCloseTo(-0.7, 6);
  });

  it("round-trips imported per-axis Visual Transform scale through Adjust Location", () => {
    const object: SceneObject = {
      ...createNewSceneObject("placeables", 1, 1, 1),
      visualTransform: {
        scale: 0.75,
        scaleX: 0.5,
        scaleY: 0.75,
        scaleZ: 1,
        offsetX: 0,
        offsetY: 0,
        offsetZ: 0,
        pitch: 0,
        yaw: 0,
        roll: 0
      }
    };

    const draft = buildAdjustLocationDraft(object, 10, 4, 4);

    expect(draft.scale).toBeCloseTo(0.75, 6);
    expect(draft.scaleX).toBeCloseTo(0.5, 6);
    expect(draft.scaleY).toBeCloseTo(0.75, 6);
    expect(draft.scaleZ).toBeCloseTo(1, 6);

    const input = buildAdjustLocationVisualTransformInput(
      {
        ...draft,
        scaleX: 0.6,
        scaleY: 0.9,
        scaleZ: 1.2
      },
      10
    );

    expect(input.scale).toBeCloseTo(0.9, 6);
    expect(input.scaleX).toBeCloseTo(0.6, 6);
    expect(input.scaleY).toBeCloseTo(0.9, 6);
    expect(input.scaleZ).toBeCloseTo(1.2, 6);
  });

  it("round-trips imported RotateX through Adjust Location Visual Transform", () => {
    const object: SceneObject = {
      ...createNewSceneObject("placeables", 1, 1, 1),
      source: {
        type: "aurora_git",
        areaId: "area_enon_bakery",
        sourceKind: "placeable",
        sourceObjectId: "obj_plc_q_floorwooden_1_3",
        templateId: "plc_q_155",
        sourceModelResRef: "pfl_b01"
      },
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
      }
    };

    const draft = buildAdjustLocationDraft(object, 10, 4, 4);
    const input = buildAdjustLocationVisualTransformInput(draft, 10);

    expect(draft.xRotationDeg).toBeCloseTo(270, 6);
    expect(draft.yRotationDeg).toBeCloseTo(90, 6);
    expect(draft.zRotationDeg).toBeCloseTo(0, 6);
    expect(input.pitch).toBeCloseTo((Math.PI * 3) / 2, 6);
    expect(input.yaw).toBeCloseTo(Math.PI / 2, 6);
    expect(input.roll).toBeCloseTo(0, 6);
  });

  it("keeps Adjust Location uniform scale and per-axis scale draft fields synchronized", () => {
    const object = createNewSceneObject("placeables", 1, 1, 1);
    const draft = buildAdjustLocationDraft(object, 10, 4, 4);

    const uniformDraft = resolveNextAdjustLocationDraftField(draft, "scale", "1.8");
    expect(uniformDraft).not.toBeNull();
    expect(uniformDraft?.scale).toBeCloseTo(1.8, 6);
    expect(uniformDraft?.scaleX).toBeCloseTo(1.8, 6);
    expect(uniformDraft?.scaleY).toBeCloseTo(1.8, 6);
    expect(uniformDraft?.scaleZ).toBeCloseTo(1.8, 6);

    const axisDraft = resolveNextAdjustLocationDraftField(uniformDraft!, "scaleX", "0.6");
    expect(axisDraft).not.toBeNull();
    expect(axisDraft?.scaleX).toBeCloseTo(0.6, 6);
    expect(axisDraft?.scaleY).toBeCloseTo(1.8, 6);
    expect(axisDraft?.scaleZ).toBeCloseTo(1.8, 6);
    expect(axisDraft?.scale).toBeCloseTo(1.4, 6);

    expect(resolveNextAdjustLocationDraftField(axisDraft!, "scaleY", "abc")).toBeNull();
  });

  it("applies Adjust Location Visual Transform input to a static placeable scene object", () => {
    const facade = createSceneMutationsFacade();
    const scene = createSeedAreaScene();
    const placeable = scene.objects.find((object) => object.kind === "placeables");
    expect(placeable).toBeDefined();
    expect(placeable?.isStatic ?? true).toBe(true);

    const draft = {
      ...buildAdjustLocationDraft(placeable!, 10, scene.width, scene.height),
      scale: 1.35,
      scaleX: 1.2,
      scaleY: 1.35,
      scaleZ: 1.5,
      xRotationDeg: 15,
      yRotationDeg: 30,
      zRotationDeg: 45,
      xTranslation: 4,
      yTranslation: -3,
      zTranslation: 2
    };

    const nextScene = facade.setObjectsVisualTransformByIds(
      scene,
      [placeable!.id],
      buildAdjustLocationVisualTransformInput(draft, 10)
    );
    const changed = nextScene.objects.find((object) => object.id === placeable!.id);

    expect(changed?.visualTransform.scale).toBeCloseTo(1.35, 6);
    expect(changed?.visualTransform.scaleX).toBeCloseTo(1.2, 6);
    expect(changed?.visualTransform.scaleY).toBeCloseTo(1.35, 6);
    expect(changed?.visualTransform.scaleZ).toBeCloseTo(1.5, 6);
    expect(changed?.visualTransform.offsetX).toBeCloseTo(0.4, 6);
    expect(changed?.visualTransform.offsetY).toBeCloseTo(-0.3, 6);
    expect(changed?.visualTransform.offsetZ).toBeCloseTo(0.2, 6);
    expect(changed?.visualTransform.pitch).toBeCloseTo(Math.PI / 12, 6);
    expect(changed?.visualTransform.yaw).toBeCloseTo(Math.PI / 6, 6);
    expect(changed?.visualTransform.roll).toBeCloseTo(Math.PI / 4, 6);
  });
});
