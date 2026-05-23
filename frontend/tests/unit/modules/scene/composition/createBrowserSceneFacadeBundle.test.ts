import { describe, expect, it } from "vitest";
import { createBrowserSceneFacadeBundle } from "../../../../../src/modules/scene/composition/createBrowserSceneFacadeBundle";
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

describe("createBrowserSceneFacadeBundle", () => {
  it("builds browser scene facades over provided storage adapter", () => {
    const storage = createMemoryStorage();
    const bundle = createBrowserSceneFacadeBundle(storage, () => 1700000000000);
    const scene = createSeedAreaScene();

    bundle.canvas.saveLocalDraft("u_builder_001", scene);
    const history = bundle.canvas.createInitialHistory("u_builder_001");
    const authored = bundle.authoring.createObject("sounds", 1, 1, 9);

    expect(history.present.sceneId).toBe(scene.sceneId);
    expect(history.present.objects).toHaveLength(scene.objects.length);
    expect(authored.id).toBe("sou_009");
  });

  it("falls back to seed history when storage is unavailable", () => {
    const bundle = createBrowserSceneFacadeBundle(null, () => 1700000000000);

    const history = bundle.canvas.createInitialHistory("u_builder_001");

    expect(history.present.source).toBe("seed");
    expect(history.present.width).toBe(2);
    expect(history.present.height).toBe(2);
  });
});
