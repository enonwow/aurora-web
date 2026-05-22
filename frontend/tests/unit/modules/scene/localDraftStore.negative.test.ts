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

  it("returns null for draft entry with unsupported source", () => {
    const scene = createSeedAreaScene();
    window.localStorage.setItem(
      "aurora-web.local-area-drafts.v1",
      JSON.stringify({
        "user:u_builder_001": {
          ...scene,
          source: "external_import"
        }
      })
    );

    expect(loadLocalSceneDraft(userId, window.localStorage)).toBeNull();
  });

  it("returns null when draft entry has invalid primitive fields", () => {
    const scene = createSeedAreaScene();
    window.localStorage.setItem(
      "aurora-web.local-area-drafts.v1",
      JSON.stringify({
        "user:u_builder_001": {
          ...scene,
          width: "18",
          height: null
        }
      })
    );

    expect(loadLocalSceneDraft(userId, window.localStorage)).toBeNull();
  });

  it("returns empty autosaves for malformed payload", () => {
    window.localStorage.setItem("aurora-web.local-area-autosaves.v1", "{bad-json");
    expect(loadLocalSceneAutosaves(userId, window.localStorage)).toEqual([]);
  });

  it("drops invalid autosave entries from mixed payload", () => {
    const scene = createSeedAreaScene();
    window.localStorage.setItem(
      "aurora-web.local-area-autosaves.v1",
      JSON.stringify({
        "user:u_builder_001": [
          {
            ...scene,
            areaName: "VALID"
          },
          {
            ...scene,
            objects: "invalid-objects"
          }
        ]
      })
    );

    const autosaves = loadLocalSceneAutosaves(userId, window.localStorage);
    expect(autosaves).toHaveLength(1);
    expect(autosaves[0]?.areaName).toBe("VALID");
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
