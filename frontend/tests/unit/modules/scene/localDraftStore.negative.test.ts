import { beforeEach, describe, expect, it } from "vitest";
import { createSeedAreaScene } from "../../../../src/modules/scene/sceneFactory";
import {
  loadLocalSceneAutosaves,
  loadLocalSceneDraft,
  saveLocalSceneAutosave,
  saveLocalSceneDraft
} from "../../../../src/modules/scene/localDraftStore";

describe("localDraftStore - negative cases", () => {
  const userId = "u_builder_001";

  beforeEach(() => {
    window.localStorage.clear();
  });

  it("returns null for malformed draft payload", () => {
    window.localStorage.setItem("aurora-web.local-area-drafts.v1", "{bad-json");
    expect(loadLocalSceneDraft(userId, window.localStorage)).toBeNull();
  });

  it("returns null for non-scene draft entry shape", () => {
    window.localStorage.setItem(
      "aurora-web.local-area-drafts.v1",
      JSON.stringify({
        "user:u_builder_001": "not-scene"
      })
    );
    expect(loadLocalSceneDraft(userId, window.localStorage)).toBeNull();
  });

  it("returns empty autosaves for malformed payload", () => {
    window.localStorage.setItem("aurora-web.local-area-autosaves.v1", "{bad-json");
    expect(loadLocalSceneAutosaves(userId, window.localStorage)).toEqual([]);
  });

  it("clamps autosave maxEntries to minimum 1 for invalid or negative values", () => {
    const scene = createSeedAreaScene();
    saveLocalSceneAutosave(userId, { ...scene, areaName: "A" }, window.localStorage, -100);
    saveLocalSceneAutosave(userId, { ...scene, areaName: "B" }, window.localStorage, 0);
    const autosaves = loadLocalSceneAutosaves(userId, window.localStorage);
    expect(autosaves).toHaveLength(1);
    expect(autosaves[0]?.areaName).toBe("B");
  });

  it("returns deep-cloned draft so consumer mutation does not corrupt storage", () => {
    const scene = createSeedAreaScene();
    saveLocalSceneDraft(userId, scene, window.localStorage);
    const loaded = loadLocalSceneDraft(userId, window.localStorage);
    expect(loaded).not.toBeNull();
    if (!loaded) {
      return;
    }
    loaded.areaName = "MUTATED";

    const reloaded = loadLocalSceneDraft(userId, window.localStorage);
    expect(reloaded?.areaName).toBe(scene.areaName);
  });
});

