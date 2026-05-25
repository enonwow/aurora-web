import { describe, expect, it, vi } from "vitest";
import { createSceneCanvasFacade } from "../../../../../src/modules/scene/application/sceneCanvasFacade";
import type { AreaScene } from "../../../../../src/modules/scene/contracts";
import type { SceneDraftPort } from "../../../../../src/modules/scene/ports/sceneDraftPort";
import { createSeedAreaScene } from "../../../../../src/modules/scene/domain/sceneFactory";

type SceneObjectLikeWithoutZ = {
  z?: number;
  visualTransform: {
    scale: number;
    offsetX: number;
    offsetY: number;
    offsetZ: number;
    pitch: number;
    roll: number;
    yaw: number;
  };
};

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

  it("preserves placeable/sound baseline payloads during legacy draft migration", () => {
    const legacyDraft = createSeedAreaScene(18, 18);
    const draftPort: SceneDraftPort = {
      loadByUserId: () => legacyDraft,
      saveByUserId: () => undefined
    };
    const facade = createSceneCanvasFacade({ draftPort, now: () => 1700000000000 });

    const history = facade.createInitialHistory("u_builder_001");
    const placeable = history.present.objects.find((object) => object.id === "plc_barrel_01");
    const sound = history.present.objects.find((object) => object.id === "snd_amb_01");

    expect(placeable?.placeableProperties).toEqual({
      plot: false,
      useable: false,
      hasInventory: false
    });
    expect(sound?.soundPositioning).toEqual({
      mode: "specific",
      elevation: 0,
      maxVolumeDistance: 8,
      cutoffDistance: 16,
      randomRangeWestEast: 0,
      randomRangeNorthSouth: 0
    });
  });

  it("backfills missing sound/placeable metadata when loading legacy draft", () => {
    const legacyDraft = createSeedAreaScene(18, 18);
    const legacyWithoutMetadata: AreaScene = {
      ...legacyDraft,
      objects: legacyDraft.objects.map((object) => {
        if (object.kind === "placeables") {
          return {
            ...object,
            placeableProperties: undefined
          };
        }
        if (object.kind === "sounds") {
          return {
            ...object,
            soundPositioning: undefined
          };
        }
        return object;
      })
    };
    const draftPort: SceneDraftPort = {
      loadByUserId: () => legacyWithoutMetadata,
      saveByUserId: () => undefined
    };
    const facade = createSceneCanvasFacade({ draftPort, now: () => 1700000000000 });

    const history = facade.createInitialHistory("u_builder_001");
    const placeable = history.present.objects.find((object) => object.id === "plc_barrel_01");
    const sound = history.present.objects.find((object) => object.id === "snd_amb_01");

    expect(placeable?.placeableProperties).toEqual({
      plot: false,
      useable: false,
      hasInventory: false
    });
    expect(sound?.soundPositioning).toEqual({
      mode: "specific",
      elevation: 0,
      maxVolumeDistance: 8,
      cutoffDistance: 16,
      randomRangeWestEast: 0,
      randomRangeNorthSouth: 0
    });
  });

  it("roundtrips sound/placeable metadata through draft save/load serialization", () => {
    const serializedByUserId = new Map<string, string>();
    const draftPort: SceneDraftPort = {
      loadByUserId: (userId) => {
        const serialized = serializedByUserId.get(userId);
        if (!serialized) {
          return null;
        }
        return JSON.parse(serialized) as AreaScene;
      },
      saveByUserId: (userId, scene) => {
        serializedByUserId.set(userId, JSON.stringify(scene));
      }
    };
    const facade = createSceneCanvasFacade({ draftPort, now: () => 1700000000000 });
    const source = createSeedAreaScene();
    const sceneWithMetadata: AreaScene = {
      ...source,
      source: "local_draft",
      objects: source.objects.map((object) => {
        if (object.id === "plc_barrel_01") {
          return {
            ...object,
            placeableProperties: {
              plot: true,
              useable: true,
              hasInventory: true
            }
          };
        }
        if (object.id === "snd_amb_01") {
          return {
            ...object,
            soundPositioning: {
              mode: "random",
              elevation: 1.5,
              maxVolumeDistance: 11,
              cutoffDistance: 22,
              randomRangeWestEast: 2,
              randomRangeNorthSouth: 3
            }
          };
        }
        return object;
      })
    };

    facade.saveLocalDraft("u_builder_001", sceneWithMetadata);
    const history = facade.createInitialHistory("u_builder_001");
    const placeable = history.present.objects.find((object) => object.id === "plc_barrel_01");
    const sound = history.present.objects.find((object) => object.id === "snd_amb_01");

    expect(placeable?.placeableProperties).toEqual({
      plot: true,
      useable: true,
      hasInventory: true
    });
    expect(sound?.soundPositioning).toEqual({
      mode: "random",
      elevation: 1.5,
      maxVolumeDistance: 11,
      cutoffDistance: 22,
      randomRangeWestEast: 2,
      randomRangeNorthSouth: 3
    });
  });

  it("normalizes invalid metadata from loaded draft to safe baselines", () => {
    const draft = createSeedAreaScene();
    const corruptedDraft: AreaScene = {
      ...draft,
      source: "local_draft",
      objects: draft.objects.map((object) => {
        if (object.id === "plc_barrel_01") {
          return {
            ...object,
            placeableProperties: {
              plot: "bad",
              useable: 0,
              hasInventory: "true"
            } as unknown as typeof object.placeableProperties
          };
        }
        if (object.id === "snd_amb_01") {
          return {
            ...object,
            soundPositioning: {
              mode: "everywhere",
              elevation: Number.NEGATIVE_INFINITY,
              maxVolumeDistance: -4,
              cutoffDistance: 1,
              randomRangeWestEast: 12,
              randomRangeNorthSouth: 13
            } as unknown as NonNullable<typeof object.soundPositioning>
          };
        }
        return object;
      })
    };
    const draftPort: SceneDraftPort = {
      loadByUserId: () => corruptedDraft,
      saveByUserId: () => undefined
    };
    const facade = createSceneCanvasFacade({ draftPort, now: () => 1700000000000 });

    const history = facade.createInitialHistory("u_builder_001");
    const placeable = history.present.objects.find((object) => object.id === "plc_barrel_01");
    const sound = history.present.objects.find((object) => object.id === "snd_amb_01");

    expect(placeable?.placeableProperties).toEqual({
      plot: false,
      useable: false,
      hasInventory: false
    });
    expect(sound?.soundPositioning).toEqual({
      mode: "everywhere",
      elevation: 0,
      maxVolumeDistance: 0,
      cutoffDistance: 1,
      randomRangeWestEast: 0,
      randomRangeNorthSouth: 0
    });
  });

  it("normalizes malformed walkmesh payload when loading draft", () => {
    const draft = createSeedAreaScene();
    const corruptedDraft: AreaScene = {
      ...draft,
      walkmesh: {
        schemaVersion: "x",
        vertices: "bad",
        triangles: null
      } as unknown as AreaScene["walkmesh"]
    };
    const draftPort: SceneDraftPort = {
      loadByUserId: () => corruptedDraft,
      saveByUserId: () => undefined
    };
    const facade = createSceneCanvasFacade({ draftPort, now: () => 1700000000000 });

    const history = facade.createInitialHistory("u_builder_001");

    expect(history.present.walkmesh).toBeDefined();
    expect(history.present.walkmesh?.schemaVersion).toBe(1);
    expect(history.present.walkmesh?.vertices).toEqual([]);
    expect(history.present.walkmesh?.triangles).toEqual([]);
  });

  it("roundtrips valid walkmesh payload through save/load flow", () => {
    const serializedByUserId = new Map<string, string>();
    const draftPort: SceneDraftPort = {
      loadByUserId: (userId) => {
        const serialized = serializedByUserId.get(userId);
        if (!serialized) {
          return null;
        }
        return JSON.parse(serialized) as AreaScene;
      },
      saveByUserId: (userId, scene) => {
        serializedByUserId.set(userId, JSON.stringify(scene));
      }
    };
    const facade = createSceneCanvasFacade({ draftPort, now: () => 1700000000000 });
    const source = createSeedAreaScene();
    const sceneWithWalkmesh: AreaScene = {
      ...source,
      source: "local_draft",
      walkmesh: {
        schemaVersion: 2,
        vertices: [
          { x: 0, y: 0, z: 0 },
          { x: 1, y: 0, z: 0 },
          { x: 0, y: 1, z: 0 }
        ],
        triangles: [{ a: 0, b: 1, c: 2 }],
        metadata: { group: "room_a" }
      }
    };

    facade.saveLocalDraft("u_builder_001", sceneWithWalkmesh);
    const history = facade.createInitialHistory("u_builder_001");

    expect(history.present.walkmesh).toEqual(sceneWithWalkmesh.walkmesh);
  });

  it("migrates legacy drafts that only store offsetZ into split z + VT offsetZ", () => {
    const seed = createSeedAreaScene();
    const legacyLikeDraft = {
      ...seed,
      source: "local_draft",
      objects: seed.objects.map((object) => {
        if (object.id !== "plc_barrel_01") {
          return object;
        }
        const clone = {
          ...object,
          visualTransform: {
            ...object.visualTransform,
            offsetZ: 1.75
          }
        } as SceneObjectLikeWithoutZ;
        delete clone.z;
        return clone;
      })
    } as unknown as AreaScene;
    const draftPort: SceneDraftPort = {
      loadByUserId: () => legacyLikeDraft,
      saveByUserId: () => undefined
    };
    const facade = createSceneCanvasFacade({ draftPort, now: () => 1700000000000 });

    const history = facade.createInitialHistory("u_builder_001");
    const migrated = history.present.objects.find((object) => object.id === "plc_barrel_01");
    expect(migrated).toBeDefined();
    expect(migrated?.z).toBeCloseTo(1.75, 6);
    expect(migrated?.visualTransform.offsetZ).toBeCloseTo(0, 6);
  });

  it("does not migrate non-seed legacy-sized draft when scene id differs", () => {
    const customDraft = {
      ...createSeedAreaScene(18, 18),
      sceneId: "custom_area_scene_001"
    };
    const draftPort: SceneDraftPort = {
      loadByUserId: () => customDraft,
      saveByUserId: () => undefined
    };
    const facade = createSceneCanvasFacade({ draftPort, now: () => 1700000000000 });

    const history = facade.createInitialHistory("u_builder_001");

    expect(history.present.sceneId).toBe("custom_area_scene_001");
    expect(history.present.width).toBe(18);
    expect(history.present.height).toBe(18);
    expect(history.present.tiles).toHaveLength(18 * 18);
  });

  it("does not migrate draft when only one legacy dimension matches", () => {
    const nonLegacyDraft = createSeedAreaScene(18, 17);
    const draftPort: SceneDraftPort = {
      loadByUserId: () => nonLegacyDraft,
      saveByUserId: () => undefined
    };
    const facade = createSceneCanvasFacade({ draftPort, now: () => 1700000000000 });

    const history = facade.createInitialHistory("u_builder_001");

    expect(history.present.width).toBe(18);
    expect(history.present.height).toBe(17);
    expect(history.present.tiles).toHaveLength(18 * 17);
  });

  it("does not migrate draft when only legacy height matches", () => {
    const nonLegacyDraft = createSeedAreaScene(17, 18);
    const draftPort: SceneDraftPort = {
      loadByUserId: () => nonLegacyDraft,
      saveByUserId: () => undefined
    };
    const facade = createSceneCanvasFacade({ draftPort, now: () => 1700000000000 });

    const history = facade.createInitialHistory("u_builder_001");

    expect(history.present.width).toBe(17);
    expect(history.present.height).toBe(18);
    expect(history.present.tiles).toHaveLength(17 * 18);
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

  it("normalizes bearing from loaded draft into 0..2pi", () => {
    const draft = createSeedAreaScene();
    const target = draft.objects.find((object) => object.kind === "placeables");
    expect(target).toBeDefined();
    const patchedDraft: AreaScene = {
      ...draft,
      objects: draft.objects.map((object) =>
        object.id === target!.id
          ? {
              ...object,
              bearing: -0.35
            }
          : object
      )
    };
    const draftPort: SceneDraftPort = {
      loadByUserId: () => patchedDraft,
      saveByUserId: () => undefined
    };
    const facade = createSceneCanvasFacade({ draftPort, now: () => 1700000000000 });

    const history = facade.createInitialHistory("u_builder_001");
    const normalized = history.present.objects.find((object) => object.id === target!.id);
    expect(normalized).toBeDefined();
    expect(normalized!.bearing).toBeGreaterThanOrEqual(0);
    expect(normalized!.bearing).toBeLessThan(Math.PI * 2);
    expect(normalized!.bearing).toBeCloseTo((Math.PI * 2) - 0.35, 6);
  });
});
