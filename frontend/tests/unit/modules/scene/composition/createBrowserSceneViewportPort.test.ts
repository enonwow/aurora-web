import { describe, expect, it } from "vitest";
import { createBrowserSceneViewportPort } from "../../../../../src/modules/scene/composition/createBrowserSceneViewportPort";
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

describe("createBrowserSceneViewportPort", () => {
  it("creates viewport port backed by browser scene composition", () => {
    const storage = createMemoryStorage();
    const port = createBrowserSceneViewportPort(storage, () => 1700000000000);
    const scene = createSeedAreaScene();

    port.saveLocalDraft("u_builder_001", scene);
    const history = port.createInitialHistory("u_builder_001");
    const created = port.createObject("creatures", 1, 1, 5);

    expect(history.present.sceneId).toBe(scene.sceneId);
    expect(history.present.objects).toHaveLength(scene.objects.length);
    expect(created.id).toBe("cre_005");
  });

  it("returns seed history when storage is unavailable", () => {
    const port = createBrowserSceneViewportPort(null, () => 1700000000000);

    const history = port.createInitialHistory("u_builder_001");

    expect(history.present.source).toBe("seed");
    expect(history.present.width).toBe(2);
    expect(history.present.height).toBe(2);
  });
});
