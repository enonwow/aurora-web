import { describe, expect, it, vi } from "vitest";
import { createSceneCanvasFacade } from "../../../../../src/modules/scene/application/sceneCanvasFacade";
import type { AreaScene } from "../../../../../src/modules/scene/contracts";
import type { SceneDraftPort } from "../../../../../src/modules/scene/ports/sceneDraftPort";
import { createSeedAreaScene } from "../../../../../src/modules/scene/sceneFactory";

describe("sceneCanvasFacade", () => {
  it("creates 2x2 seed history when draft is missing", () => {
    const draftPort: SceneDraftPort = {
      loadByUserId: () => null,
      saveByUserId: () => undefined
    };
    const facade = createSceneCanvasFacade({ draftPort, now: () => 1700000000000 });

    const history = facade.createInitialHistory("u_builder_001");

    expect(history.present.width).toBe(2);
    expect(history.present.height).toBe(2);
    expect(history.present.tiles).toHaveLength(4);
    expect(history.present.source).toBe("seed");
  });

  it("migrates legacy 18x18 seed draft into 2x2 with proportional object placement", () => {
    const legacyDraft = createSeedAreaScene(18, 18);
    const draftPort: SceneDraftPort = {
      loadByUserId: () => legacyDraft,
      saveByUserId: () => undefined
    };
    const facade = createSceneCanvasFacade({ draftPort, now: () => 1700000000000 });

    const history = facade.createInitialHistory("u_builder_001");
    const barrel = history.present.objects.find((object) => object.id === "plc_barrel_01");

    expect(history.present.width).toBe(2);
    expect(history.present.height).toBe(2);
    expect(history.present.tiles).toHaveLength(4);
    expect(barrel?.x).toBeCloseTo((3.2 / 18) * 2, 5);
    expect(barrel?.y).toBeCloseTo((5.7 / 18) * 2, 5);
  });

  it("falls back to seed history when draft port load throws", () => {
    const draftPort: SceneDraftPort = {
      loadByUserId: () => {
        throw new Error("storage unavailable");
      },
      saveByUserId: () => undefined
    };
    const facade = createSceneCanvasFacade({ draftPort, now: () => 1700000000000 });

    const history = facade.createInitialHistory("u_builder_001");

    expect(history.present.width).toBe(2);
    expect(history.present.height).toBe(2);
    expect(history.present.source).toBe("seed");
  });

  it("delegates local draft save through draft port", () => {
    const saveByUserId = vi.fn();
    const draftPort: SceneDraftPort = {
      loadByUserId: () => null,
      saveByUserId
    };
    const facade = createSceneCanvasFacade({ draftPort, now: () => 1700000000000 });
    const scene: AreaScene = createSeedAreaScene();

    facade.saveLocalDraft("u_builder_001", scene);

    expect(saveByUserId).toHaveBeenCalledTimes(1);
    expect(saveByUserId).toHaveBeenCalledWith("u_builder_001", scene);
  });
});

