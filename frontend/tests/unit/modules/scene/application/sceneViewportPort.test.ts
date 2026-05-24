import { describe, expect, it, vi } from "vitest";
import type { SceneFacadeBundle } from "../../../../../src/modules/scene/application/sceneFacadeBundle";
import { createSceneViewportPort } from "../../../../../src/modules/scene/application/sceneViewportPort";
import { createSceneHistory } from "../../../../../src/modules/scene/domain/sceneHistory";
import { createSeedAreaScene } from "../../../../../src/modules/scene/domain/sceneFactory";

describe("sceneViewportPort", () => {
  it("delegates viewport use-cases to bundled scene facades", () => {
    const seed = createSeedAreaScene();
    const nextScene = {
      ...seed,
      areaName: "Edited Area"
    };
    const history = createSceneHistory(seed);
    const committedHistory = createSceneHistory(nextScene);
    const createdObject = seed.objects[0];

    const bundle: SceneFacadeBundle = {
      canvas: {
        createInitialHistory: vi.fn(() => history),
        saveLocalDraft: vi.fn()
      },
      history: {
        commit: vi.fn(() => committedHistory),
        undo: vi.fn(() => history),
        redo: vi.fn(() => committedHistory)
      },
      mutations: {
        appendObjects: vi.fn(() => nextScene),
        deleteObjectsByIds: vi.fn(() => nextScene),
        deleteObjectById: vi.fn(() => nextScene),
        translateObjectsByIds: vi.fn(() => nextScene),
        adjustObjectsHeightByIds: vi.fn(() => nextScene),
        rotateObjectsBearingByIds: vi.fn(() => nextScene),
        updateTileTerrain: vi.fn(() => nextScene),
        resetObjectTransform: vi.fn(() => nextScene)
      },
      authoring: {
        createObject: vi.fn(() => createdObject),
        resolveCopyAnchor: vi.fn(() => ({ x: 1.1, y: 2.2 })),
        computeCopyTranslation: vi.fn(() => ({ x: 0.5, y: 0.25 })),
        createSeedObjectsSnapshot: vi.fn(() => seed.objects),
        getSceneScale: vi.fn(() => 0.66)
      }
    };

    const port = createSceneViewportPort(bundle);

    const initialHistory = port.createInitialHistory("u_builder_001");
    port.saveLocalDraft("u_builder_001", seed);
    const committed = port.commitHistory(history, nextScene);
    const undone = port.undoHistory(committed);
    const redone = port.redoHistory(undone);
    const appended = port.appendObjects(seed, []);
    const deletedMany = port.deleteObjectsByIds(seed, [seed.objects[0].id]);
    const deletedOne = port.deleteObjectById(seed, seed.objects[0].id);
    const translated = port.translateObjectsByIds(seed, [seed.objects[0].id], { x: 0.5, y: -0.25 });
    const adjustedHeight = port.adjustObjectsHeightByIds(seed, [seed.objects[0].id], 0.4);
    const rotatedBearing = port.rotateObjectsBearingByIds(seed, [seed.objects[0].id], 0.2);
    const retiled = port.updateTileTerrain(seed, seed.tiles[0].id, "wall");
    const reset = port.resetObjectTransform(seed, seed.objects[0].id);
    const created = port.createObject("items", 1, 2, 7);
    const anchor = port.resolveCopyAnchor({
      cursorAnchor: { x: 0, y: 0 },
      sourcePoints: [{ x: 1, y: 1 }],
      fallbackOffset: 0.5
    });
    const translation = port.computeCopyTranslation({
      sourcePoints: [{ x: 1, y: 1 }],
      anchor: { x: 2, y: 3 },
      snapGrid: true,
      snapGridStep: 0.25
    });
    const scale = port.getSceneScale(seed.width, seed.height);

    expect(initialHistory).toBe(history);
    expect(committed).toBe(committedHistory);
    expect(undone).toBe(history);
    expect(redone).toBe(committedHistory);
    expect(appended).toBe(nextScene);
    expect(deletedMany).toBe(nextScene);
    expect(deletedOne).toBe(nextScene);
    expect(translated).toBe(nextScene);
    expect(adjustedHeight).toBe(nextScene);
    expect(rotatedBearing).toBe(nextScene);
    expect(retiled).toBe(nextScene);
    expect(reset).toBe(nextScene);
    expect(created).toBe(createdObject);
    expect(anchor).toEqual({ x: 1.1, y: 2.2 });
    expect(translation).toEqual({ x: 0.5, y: 0.25 });
    expect(scale).toBe(0.66);

    expect(bundle.canvas.createInitialHistory).toHaveBeenCalledWith("u_builder_001");
    expect(bundle.canvas.saveLocalDraft).toHaveBeenCalledWith("u_builder_001", seed);
    expect(bundle.history.commit).toHaveBeenCalledWith(history, nextScene);
    expect(bundle.history.undo).toHaveBeenCalledWith(committedHistory);
    expect(bundle.history.redo).toHaveBeenCalledWith(history);
    expect(bundle.mutations.appendObjects).toHaveBeenCalledWith(seed, []);
    expect(bundle.mutations.deleteObjectsByIds).toHaveBeenCalledWith(seed, [seed.objects[0].id]);
    expect(bundle.mutations.deleteObjectById).toHaveBeenCalledWith(seed, seed.objects[0].id);
    expect(bundle.mutations.translateObjectsByIds).toHaveBeenCalledWith(
      seed,
      [seed.objects[0].id],
      { x: 0.5, y: -0.25 }
    );
    expect(bundle.mutations.adjustObjectsHeightByIds).toHaveBeenCalledWith(
      seed,
      [seed.objects[0].id],
      0.4
    );
    expect(bundle.mutations.rotateObjectsBearingByIds).toHaveBeenCalledWith(
      seed,
      [seed.objects[0].id],
      0.2
    );
    expect(bundle.mutations.updateTileTerrain).toHaveBeenCalledWith(seed, seed.tiles[0].id, "wall");
    expect(bundle.mutations.resetObjectTransform).toHaveBeenCalledWith(seed, seed.objects[0].id);
    expect(bundle.authoring.createObject).toHaveBeenCalledWith("items", 1, 2, 7);
    expect(bundle.authoring.resolveCopyAnchor).toHaveBeenCalledWith({
      cursorAnchor: { x: 0, y: 0 },
      sourcePoints: [{ x: 1, y: 1 }],
      fallbackOffset: 0.5
    });
    expect(bundle.authoring.computeCopyTranslation).toHaveBeenCalledWith({
      sourcePoints: [{ x: 1, y: 1 }],
      anchor: { x: 2, y: 3 },
      snapGrid: true,
      snapGridStep: 0.25
    });
    expect(bundle.authoring.getSceneScale).toHaveBeenCalledWith(seed.width, seed.height);
  });
});
