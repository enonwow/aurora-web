import { beforeEach, describe, expect, it } from "vitest";
import { createSeedAreaScene } from "../../../../src/modules/scene/domain/sceneFactory";
import {
  clearLocalSceneDraft,
  loadLocalSceneDraft,
  saveLocalSceneDraft
} from "../../../../src/modules/scene/adapters/localDraftStore";

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

  it("keeps drafts isolated per user", () => {
    const scene = createSeedAreaScene();
    saveLocalSceneDraft("u_a", { ...scene, areaName: "Area A" }, window.localStorage);
    saveLocalSceneDraft("u_b", { ...scene, areaName: "Area B" }, window.localStorage);

    const draftA = loadLocalSceneDraft("u_a", window.localStorage);
    const draftB = loadLocalSceneDraft("u_b", window.localStorage);

    expect(draftA?.areaName).toBe("Area A");
    expect(draftB?.areaName).toBe("Area B");
  });

});
