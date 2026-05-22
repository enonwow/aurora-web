import { beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_VIEWPORT_CONTROL_PRESET,
  VIEWPORT_CONTROL_STORAGE_KEY,
  loadViewportControlPresetFromStorage,
  persistViewportControlPresetToStorage
} from "../../../../src/modules/layout/viewportControlSettings";

function createThrowingStorage(): Storage {
  return {
    length: 0,
    clear() {},
    getItem() {
      throw new Error("blocked");
    },
    key() {
      return null;
    },
    removeItem() {},
    setItem() {
      throw new Error("blocked");
    }
  };
}

describe("viewportControlSettings - negative cases", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("falls back to default when persisted preset is invalid", () => {
    window.localStorage.setItem(VIEWPORT_CONTROL_STORAGE_KEY, "blender-view");
    expect(loadViewportControlPresetFromStorage(window.localStorage)).toBe(
      DEFAULT_VIEWPORT_CONTROL_PRESET
    );
  });

  it("falls back to default when storage getItem throws", () => {
    expect(loadViewportControlPresetFromStorage(createThrowingStorage())).toBe(
      DEFAULT_VIEWPORT_CONTROL_PRESET
    );
  });

  it("does not throw when persisting to unavailable storage", () => {
    expect(() =>
      persistViewportControlPresetToStorage("aurora-classic", null)
    ).not.toThrow();
    expect(() =>
      persistViewportControlPresetToStorage("aurora-classic", createThrowingStorage())
    ).not.toThrow();
  });
});
