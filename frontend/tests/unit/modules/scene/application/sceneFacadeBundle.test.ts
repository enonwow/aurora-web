import { describe, expect, it, vi } from "vitest";
import { createSceneFacadeBundle } from "../../../../../src/modules/scene/application/sceneFacadeBundle";
import type { SceneDraftPort } from "../../../../../src/modules/scene/ports/sceneDraftPort";
import { createSeedAreaScene } from "../../../../../src/modules/scene/sceneFactory";
import { createSceneHistory } from "../../../../../src/modules/scene/sceneHistory";

describe("sceneFacadeBundle", () => {
  it("exposes canvas, history, and mutations facades together", () => {
    const saveByUserId = vi.fn();
    const draftPort: SceneDraftPort = {
      loadByUserId: () => null,
      saveByUserId
    };
    const bundle = createSceneFacadeBundle({
      draftPort,
      now: () => 1700000000000
    });

    const initialHistory = bundle.canvas.createInitialHistory("u_builder_001");
    const seed = createSeedAreaScene();
    const history = createSceneHistory(seed);
    const editedScene = { ...seed, areaName: "Edited Area" };
    const committedHistory = bundle.history.commit(history, editedScene);
    const mutatedScene = bundle.mutations.deleteObjectsByIds(seed, [seed.objects[0].id]);

    bundle.canvas.saveLocalDraft("u_builder_001", initialHistory.present);

    expect(initialHistory.present.width).toBe(2);
    expect(initialHistory.present.height).toBe(2);
    expect(committedHistory.present.areaName).toBe("Edited Area");
    expect(mutatedScene.objects).toHaveLength(seed.objects.length - 1);
    expect(saveByUserId).toHaveBeenCalledWith("u_builder_001", initialHistory.present);
  });
});
