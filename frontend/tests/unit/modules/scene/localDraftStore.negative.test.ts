import { beforeEach, describe, expect, it } from "vitest";
import { createSeedAreaScene } from "../../../../src/modules/scene/domain/sceneFactory";
import {
  loadLocalSceneDraft,
  saveLocalSceneDraft
} from "../../../../src/modules/scene/adapters/localDraftStore";

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

  it("returns null when collection root is an array payload", () => {
    window.localStorage.setItem(
      "aurora-web.local-area-drafts.v1",
      JSON.stringify([
        {
          foo: "bar"
        }
      ])
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

  it("returns null when draft entry misses required scene metadata", () => {
    const scene = createSeedAreaScene();

    window.localStorage.setItem(
      "aurora-web.local-area-drafts.v1",
      JSON.stringify({
        "user:u_builder_001": {
          ...scene,
          sceneId: 123,
          areaName: null
        }
      })
    );

    expect(loadLocalSceneDraft(userId, window.localStorage)).toBeNull();
  });

  it("accepts seed source for legacy-compatible hydrated drafts", () => {
    const scene = createSeedAreaScene();

    window.localStorage.setItem(
      "aurora-web.local-area-drafts.v1",
      JSON.stringify({
        "user:u_builder_001": {
          ...scene,
          source: "seed"
        }
      })
    );

    const loaded = loadLocalSceneDraft(userId, window.localStorage);
    expect(loaded).not.toBeNull();
    expect(loaded?.source).toBe("seed");
  });

  it("returns null when each required scalar field is invalid", () => {
    const scene = createSeedAreaScene();
    const invalidCases: Array<{
      name: string;
      override: Record<string, unknown>;
    }> = [
      {
        name: "sceneId",
        override: { sceneId: 123 }
      },
      {
        name: "areaName",
        override: { areaName: null }
      },
      {
        name: "width",
        override: { width: "18" }
      },
      {
        name: "height",
        override: { height: "18" }
      },
      {
        name: "updatedAtUnixMs",
        override: { updatedAtUnixMs: "1700000000000" }
      }
    ];

    invalidCases.forEach(({ name, override }) => {
      window.localStorage.setItem(
        "aurora-web.local-area-drafts.v1",
        JSON.stringify({
          "user:u_builder_001": {
            ...scene,
            ...override
          }
        })
      );

      expect(
        loadLocalSceneDraft(userId, window.localStorage),
        `expected invalid '${name}' field to reject draft`
      ).toBeNull();
    });
  });

  it("rebuilds collection from malformed primitive root on save", () => {
    const scene = createSeedAreaScene();
    window.localStorage.setItem("aurora-web.local-area-drafts.v1", "123");

    expect(() => {
      saveLocalSceneDraft(userId, scene, window.localStorage);
    }).not.toThrow();

    const raw = window.localStorage.getItem("aurora-web.local-area-drafts.v1");
    const parsed = JSON.parse(raw ?? "{}") as Record<string, unknown>;
    expect(Array.isArray(parsed)).toBe(false);
    expect(typeof parsed["user:u_builder_001"]).toBe("object");
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

  it("rejects primitive draft payloads even when primitive prototypes are polluted", () => {
    const stringProto = String.prototype as Record<string, unknown>;
    const original = {
      sceneId: stringProto.sceneId,
      areaName: stringProto.areaName,
      width: stringProto.width,
      height: stringProto.height,
      updatedAtUnixMs: stringProto.updatedAtUnixMs,
      source: stringProto.source,
      tiles: stringProto.tiles,
      objects: stringProto.objects
    };

    stringProto.sceneId = "proto_scene";
    stringProto.areaName = "Proto Area";
    stringProto.width = 2;
    stringProto.height = 2;
    stringProto.updatedAtUnixMs = 1700000000000;
    stringProto.source = "seed";
    stringProto.tiles = [];
    stringProto.objects = [];

    try {
      window.localStorage.setItem(
        "aurora-web.local-area-drafts.v1",
        JSON.stringify({
          "user:u_builder_001": "primitive-draft"
        })
      );
      expect(loadLocalSceneDraft(userId, window.localStorage)).toBeNull();
    } finally {
      if (original.sceneId === undefined) {
        delete stringProto.sceneId;
      } else {
        stringProto.sceneId = original.sceneId;
      }
      if (original.areaName === undefined) {
        delete stringProto.areaName;
      } else {
        stringProto.areaName = original.areaName;
      }
      if (original.width === undefined) {
        delete stringProto.width;
      } else {
        stringProto.width = original.width;
      }
      if (original.height === undefined) {
        delete stringProto.height;
      } else {
        stringProto.height = original.height;
      }
      if (original.updatedAtUnixMs === undefined) {
        delete stringProto.updatedAtUnixMs;
      } else {
        stringProto.updatedAtUnixMs = original.updatedAtUnixMs;
      }
      if (original.source === undefined) {
        delete stringProto.source;
      } else {
        stringProto.source = original.source;
      }
      if (original.tiles === undefined) {
        delete stringProto.tiles;
      } else {
        stringProto.tiles = original.tiles;
      }
      if (original.objects === undefined) {
        delete stringProto.objects;
      } else {
        stringProto.objects = original.objects;
      }
    }
  });
});
