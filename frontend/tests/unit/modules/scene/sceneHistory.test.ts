import { describe, expect, it } from "vitest";
import { createSceneMutationsFacade } from "../../../../src/modules/scene/application/sceneMutationsFacade";
import { createSeedAreaScene } from "../../../../src/modules/scene/domain/sceneFactory";
import {
  commitSceneHistory,
  createSceneHistory,
  redoSceneHistory,
  undoSceneHistory
} from "../../../../src/modules/scene/domain/sceneHistory";

describe("sceneHistory", () => {
  it("commits scene mutations and supports undo/redo", () => {
    const seed = createSeedAreaScene();
    const history0 = createSceneHistory(seed);

    const history1 = commitSceneHistory(history0, {
      ...history0.present,
      areaName: "Modified Area"
    });
    expect(history1.present.areaName).toBe("Modified Area");
    expect(history1.past).toHaveLength(1);

    const history2 = undoSceneHistory(history1);
    expect(history2.present.areaName).toBe(seed.areaName);
    expect(history2.future).toHaveLength(1);

    const history3 = redoSceneHistory(history2);
    expect(history3.present.areaName).toBe("Modified Area");
    expect(history3.past).toHaveLength(1);
  });

  it("keeps history unchanged on undo/redo when stacks are empty", () => {
    const history = createSceneHistory(createSeedAreaScene());

    expect(undoSceneHistory(history)).toEqual(history);
    expect(redoSceneHistory(history)).toEqual(history);
  });

  it("trims past history to limit and keeps most recent entries", () => {
    const seed = createSeedAreaScene();
    const h0 = createSceneHistory(seed);
    const h1 = commitSceneHistory(h0, { ...seed, areaName: "A" }, 2);
    const h2 = commitSceneHistory(h1, { ...seed, areaName: "B" }, 2);
    const h3 = commitSceneHistory(h2, { ...seed, areaName: "C" }, 2);

    expect(h3.past).toHaveLength(2);
    expect(h3.past[0]?.areaName).toBe("A");
    expect(h3.past[1]?.areaName).toBe("B");
  });

  it("clears future stack on new commit after undo", () => {
    const seed = createSeedAreaScene();
    const h0 = createSceneHistory(seed);
    const h1 = commitSceneHistory(h0, { ...seed, areaName: "A" });
    const h2 = commitSceneHistory(h1, { ...seed, areaName: "B" });
    const undone = undoSceneHistory(h2);
    expect(undone.future).toHaveLength(1);

    const recommit = commitSceneHistory(undone, { ...seed, areaName: "C" });
    expect(recommit.future).toHaveLength(0);
    expect(recommit.present.areaName).toBe("C");
  });

  it("keeps absolute-location and visual-transform as separate undo/redo commit steps", () => {
    const mutations = createSceneMutationsFacade();
    const seed = createSeedAreaScene();
    const target = seed.objects.find((object) => object.id === "plc_barrel_01");
    expect(target).toBeDefined();

    const history0 = createSceneHistory(seed);
    const absoluteStepScene = mutations.setObjectsAbsoluteLocationByIds(
      history0.present,
      [target!.id],
      { x: 1.2, y: 1.1, z: 0.5, bearing: 0.75 }
    );
    const history1 = commitSceneHistory(history0, absoluteStepScene);

    const visualStepScene = mutations.setObjectsVisualTransformByIds(
      history1.present,
      [target!.id],
      {
        scale: 1.4,
        offsetX: 0.25,
        offsetY: -0.15,
        offsetZ: 0.7,
        pitch: 0.1,
        yaw: 0.2,
        roll: -0.05
      }
    );
    const history2 = commitSceneHistory(history1, visualStepScene);

    expect(history2.past).toHaveLength(2);

    const undoVisual = undoSceneHistory(history2);
    const afterUndoVisual = undoVisual.present.objects.find((object) => object.id === target!.id);
    expect(afterUndoVisual).toBeDefined();
    expect(afterUndoVisual?.x).toBeCloseTo(1.2);
    expect(afterUndoVisual?.y).toBeCloseTo(1.1);
    expect(afterUndoVisual?.bearing).toBeCloseTo(0.75);
    expect(afterUndoVisual?.visualTransform.scale).toBeCloseTo(1);
    expect(afterUndoVisual?.visualTransform.offsetX).toBeCloseTo(0);
    expect(afterUndoVisual?.visualTransform.offsetY).toBeCloseTo(0);
    expect(afterUndoVisual?.z).toBeCloseTo(0.5);
    expect(afterUndoVisual?.visualTransform.offsetZ).toBeCloseTo(0);

    const undoAbsolute = undoSceneHistory(undoVisual);
    const afterUndoAbsolute = undoAbsolute.present.objects.find((object) => object.id === target!.id);
    expect(afterUndoAbsolute).toBeDefined();
    expect(afterUndoAbsolute?.x).toBeCloseTo(target!.x);
    expect(afterUndoAbsolute?.y).toBeCloseTo(target!.y);
    expect(afterUndoAbsolute?.z).toBeCloseTo(target!.z);
    expect(afterUndoAbsolute?.bearing).toBeCloseTo(target!.bearing);
    expect(afterUndoAbsolute?.visualTransform.offsetZ).toBeCloseTo(target!.visualTransform.offsetZ);

    const redoAbsolute = redoSceneHistory(undoAbsolute);
    const afterRedoAbsolute = redoAbsolute.present.objects.find((object) => object.id === target!.id);
    expect(afterRedoAbsolute).toBeDefined();
    expect(afterRedoAbsolute?.x).toBeCloseTo(1.2);
    expect(afterRedoAbsolute?.y).toBeCloseTo(1.1);
    expect(afterRedoAbsolute?.z).toBeCloseTo(0.5);
    expect(afterRedoAbsolute?.bearing).toBeCloseTo(0.75);
    expect(afterRedoAbsolute?.visualTransform.offsetZ).toBeCloseTo(0);

    const redoVisual = redoSceneHistory(redoAbsolute);
    const afterRedoVisual = redoVisual.present.objects.find((object) => object.id === target!.id);
    expect(afterRedoVisual).toBeDefined();
    expect(afterRedoVisual?.visualTransform.scale).toBeCloseTo(1.4);
    expect(afterRedoVisual?.visualTransform.offsetX).toBeCloseTo(0.25);
    expect(afterRedoVisual?.visualTransform.offsetY).toBeCloseTo(-0.15);
    expect(afterRedoVisual?.visualTransform.offsetZ).toBeCloseTo(0.7);
    expect(afterRedoVisual?.visualTransform.pitch).toBeCloseTo(0.1);
    expect(afterRedoVisual?.visualTransform.yaw).toBeCloseTo(0.2);
    expect(afterRedoVisual?.visualTransform.roll).toBeCloseTo(-0.05);
  });

  it("keeps combined absolute-location + visual-transform in one commit step", () => {
    const mutations = createSceneMutationsFacade();
    const seed = createSeedAreaScene();
    const target = seed.objects.find((object) => object.id === "plc_barrel_01");
    expect(target).toBeDefined();

    const history0 = createSceneHistory(seed);
    const absoluteStep = mutations.setObjectsAbsoluteLocationByIds(
      history0.present,
      [target!.id],
      { x: 1.25, y: 1.15, z: 0.45, bearing: 0.6 }
    );
    const combinedStep = mutations.setObjectsVisualTransformByIds(absoluteStep, [target!.id], {
      scale: 1.35,
      offsetX: 0.2,
      offsetY: -0.1,
      offsetZ: 0.65,
      pitch: 0.08,
      yaw: -0.04,
      roll: 0.02
    });
    const history1 = commitSceneHistory(history0, combinedStep);

    expect(history1.past).toHaveLength(1);

    const undone = undoSceneHistory(history1);
    const afterUndo = undone.present.objects.find((object) => object.id === target!.id);
    expect(afterUndo).toBeDefined();
    expect(afterUndo?.x).toBeCloseTo(target!.x);
    expect(afterUndo?.y).toBeCloseTo(target!.y);
    expect(afterUndo?.z).toBeCloseTo(target!.z);
    expect(afterUndo?.bearing).toBeCloseTo(target!.bearing);
    expect(afterUndo?.visualTransform.scale).toBeCloseTo(target!.visualTransform.scale);
    expect(afterUndo?.visualTransform.offsetZ).toBeCloseTo(target!.visualTransform.offsetZ);

    const redone = redoSceneHistory(undone);
    const afterRedo = redone.present.objects.find((object) => object.id === target!.id);
    expect(afterRedo).toBeDefined();
    expect(afterRedo?.x).toBeCloseTo(1.25);
    expect(afterRedo?.y).toBeCloseTo(1.15);
    expect(afterRedo?.z).toBeCloseTo(0.45);
    expect(afterRedo?.bearing).toBeCloseTo(0.6);
    expect(afterRedo?.visualTransform.scale).toBeCloseTo(1.35);
    expect(afterRedo?.visualTransform.offsetX).toBeCloseTo(0.2);
    expect(afterRedo?.visualTransform.offsetY).toBeCloseTo(-0.1);
    expect(afterRedo?.visualTransform.offsetZ).toBeCloseTo(0.65);
  });
});
