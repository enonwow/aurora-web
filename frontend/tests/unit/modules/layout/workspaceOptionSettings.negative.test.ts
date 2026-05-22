import { beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_WORKSPACE_OPTION_SETTINGS,
  LEGACY_WORKSPACE_OPTIONS_STORAGE_KEY,
  WORKSPACE_OPTIONS_STORAGE_KEY,
  loadWorkspaceOptionSettingsFromStorage,
  persistWorkspaceOptionSettingsToStorage
} from "../../../../src/modules/layout/workspaceOptionSettings";

describe("workspaceOptionSettings - negative cases", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("falls back to defaults for malformed active JSON payload", () => {
    window.localStorage.setItem(WORKSPACE_OPTIONS_STORAGE_KEY, "{broken-json");
    expect(loadWorkspaceOptionSettingsFromStorage(window.localStorage)).toEqual(
      DEFAULT_WORKSPACE_OPTION_SETTINGS
    );
  });

  it("falls back to legacy key when active payload is malformed", () => {
    window.localStorage.setItem(WORKSPACE_OPTIONS_STORAGE_KEY, "{broken-json");
    window.localStorage.setItem(
      LEGACY_WORKSPACE_OPTIONS_STORAGE_KEY,
      JSON.stringify({
        ...DEFAULT_WORKSPACE_OPTION_SETTINGS,
        snapGridStep: 3.5
      })
    );

    const loaded = loadWorkspaceOptionSettingsFromStorage(window.localStorage);
    expect(loaded.snapGridStep).toBe(3.5);
  });

  it("ignores non-object payload and resolves defaults", () => {
    window.localStorage.setItem(WORKSPACE_OPTIONS_STORAGE_KEY, "[]");
    expect(loadWorkspaceOptionSettingsFromStorage(window.localStorage)).toEqual(
      DEFAULT_WORKSPACE_OPTION_SETTINGS
    );
  });

  it("does not throw when persisting with null storage", () => {
    expect(() =>
      persistWorkspaceOptionSettingsToStorage(DEFAULT_WORKSPACE_OPTION_SETTINGS, null)
    ).not.toThrow();
  });
});

