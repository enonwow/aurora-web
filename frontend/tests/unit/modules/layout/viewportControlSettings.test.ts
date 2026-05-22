import { beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_VIEWPORT_CONTROL_PRESET,
  VIEWPORT_CONTROL_STORAGE_KEY,
  isViewportControlPresetId,
  loadViewportControlPresetFromStorage,
  persistViewportControlPresetToStorage
} from "../../../../src/modules/layout/viewportControlSettings";

describe("viewportControlSettings", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("validates preset ids", () => {
    expect(isViewportControlPresetId("aurora-classic")).toBe(true);
    expect(isViewportControlPresetId("blender-viewport")).toBe(true);
    expect(isViewportControlPresetId("unknown")).toBe(false);
  });

  it("returns default preset when storage is empty", () => {
    expect(loadViewportControlPresetFromStorage(window.localStorage)).toBe(
      DEFAULT_VIEWPORT_CONTROL_PRESET
    );
  });

  it("persists and loads selected preset", () => {
    persistViewportControlPresetToStorage("blender-viewport", window.localStorage);
    expect(window.localStorage.getItem(VIEWPORT_CONTROL_STORAGE_KEY)).toBe(
      "blender-viewport"
    );
    expect(loadViewportControlPresetFromStorage(window.localStorage)).toBe(
      "blender-viewport"
    );
  });
});
