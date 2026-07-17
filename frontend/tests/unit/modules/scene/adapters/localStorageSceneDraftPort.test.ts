import { describe, expect, it } from "vitest";
import { createLocalStorageSceneDraftPort } from "../../../../../src/modules/scene/adapters/localStorageSceneDraftPort";
import { createSeedAreaScene } from "../../../../../src/modules/scene/domain/sceneFactory";

function createMemoryStorage(): Storage {
  const memory = new Map<string, string>();
  return {
    get length() {
      return memory.size;
    },
    clear() {
      memory.clear();
    },
    getItem(key: string) {
      return memory.get(key) ?? null;
    },
    key(index: number) {
      return Array.from(memory.keys())[index] ?? null;
    },
    removeItem(key: string) {
      memory.delete(key);
    },
    setItem(key: string, value: string) {
      memory.set(key, value);
    }
  };
}

describe("localStorageSceneDraftPort", () => {
  it("returns null and no-ops when storage is unavailable", () => {
    const port = createLocalStorageSceneDraftPort(null);
    const scene = createSeedAreaScene();

    expect(port.loadByUserId("u_builder_001")).toBeNull();
    expect(() => port.saveByUserId("u_builder_001", scene)).not.toThrow();
  });

  it("loads and saves draft data via provided storage", () => {
    const storage = createMemoryStorage();
    const port = createLocalStorageSceneDraftPort(storage);
    const scene = {
      ...createSeedAreaScene(),
      areaName: "Dock Ward"
    };

    port.saveByUserId("u_builder_001", scene);
    const loaded = port.loadByUserId("u_builder_001");

    expect(loaded).not.toBeNull();
    expect(loaded?.source).toBe("local_draft");
    expect(loaded?.areaName).toBe("Dock Ward");
    expect(loaded?.tiles).toHaveLength(scene.tiles.length);
  });
});
