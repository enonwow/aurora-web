import { beforeEach, describe, expect, it } from "vitest";
import { createSeedAreaScene } from "../../../../src/modules/scene/sceneFactory";
import {
  clearLocalSceneDraft,
  loadLocalSceneDraft,
  loadLocalSceneAutosaves,
  saveLocalSceneAutosave,
  saveLocalSceneDraft
} from "../../../../src/modules/scene/localDraftStore";

describe("localDraftStore", () => {
  const userId = "u_builder_001";

  beforeEach(() => {
    window.localStorage.clear();
  });

  it("saves and loads draft by user id", () => {
    const scene = createSeedAreaScene();
    saveLocalSceneDraft(userId, scene, window.localStorage);

    const loaded = loadLocalSceneDraft(userId, window.localStorage);
    expect(loaded).not.toBeNull();
    expect(loaded?.source).toBe("local_draft");
    expect(loaded?.tiles).toHaveLength(scene.tiles.length);
  });

  it("clears saved draft", () => {
    const scene = createSeedAreaScene();
    saveLocalSceneDraft(userId, scene, window.localStorage);
    clearLocalSceneDraft(userId, window.localStorage);

    const loaded = loadLocalSceneDraft(userId, window.localStorage);
    expect(loaded).toBeNull();
  });

  it("stores autosave snapshots with max-entries eviction", () => {
    const scene = createSeedAreaScene();
    saveLocalSceneAutosave(userId, { ...scene, areaName: "A" }, window.localStorage, 2);
    saveLocalSceneAutosave(userId, { ...scene, areaName: "B" }, window.localStorage, 2);
    saveLocalSceneAutosave(userId, { ...scene, areaName: "C" }, window.localStorage, 2);

    const autosaves = loadLocalSceneAutosaves(userId, window.localStorage);
    expect(autosaves).toHaveLength(2);
    expect(autosaves[0]?.areaName).toBe("C");
    expect(autosaves[1]?.areaName).toBe("B");
  });
});
