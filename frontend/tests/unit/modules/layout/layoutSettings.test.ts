import { beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_LAYOUT_SETTINGS,
  LEGACY_LAYOUT_SETTINGS_STORAGE_KEY,
  LAYOUT_SETTINGS_STORAGE_KEY,
  loadLayoutSettingsFromStorage,
  persistLayoutSettingsToStorage
} from "../../../../src/modules/layout/layoutSettings";
import { LAYOUT_THEME_STORAGE_KEY } from "../../../../src/modules/layout/themeSettings";

describe("layoutSettings", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("returns defaults when storage is empty", () => {
    expect(loadLayoutSettingsFromStorage(window.localStorage)).toEqual(
      DEFAULT_LAYOUT_SETTINGS
    );
  });

  it("persists and loads single layout model", () => {
    const next = {
      theme: "forest-night" as const,
      leftSidebarCollapsed: true,
      rightSidebarCollapsed: false
    };

    window.localStorage.setItem(LAYOUT_THEME_STORAGE_KEY, "dawn-steel");
    window.localStorage.setItem("aurora_web.viewport_control_preset", "aurora-classic");

    persistLayoutSettingsToStorage(next, window.localStorage);
    const raw = window.localStorage.getItem(LAYOUT_SETTINGS_STORAGE_KEY);
    expect(raw).not.toBeNull();
    expect(window.localStorage.getItem(LEGACY_LAYOUT_SETTINGS_STORAGE_KEY)).toBeNull();
    expect(window.localStorage.getItem(LAYOUT_THEME_STORAGE_KEY)).toBeNull();
    expect(window.localStorage.getItem("aurora_web.viewport_control_preset")).toBeNull();
    expect(loadLayoutSettingsFromStorage(window.localStorage)).toEqual(next);
  });

  it("loads legacy split keys when unified model is missing", () => {
    window.localStorage.setItem(LAYOUT_THEME_STORAGE_KEY, "obsidian-slate");

    expect(loadLayoutSettingsFromStorage(window.localStorage)).toEqual({
      theme: "obsidian-slate",
      leftSidebarCollapsed: false,
      rightSidebarCollapsed: false
    });
  });

  it("loads legacy unified key", () => {
    window.localStorage.setItem(
      LEGACY_LAYOUT_SETTINGS_STORAGE_KEY,
      JSON.stringify({
        theme: "dawn-steel",
        leftSidebarCollapsed: true,
        rightSidebarCollapsed: true
      })
    );

    expect(loadLayoutSettingsFromStorage(window.localStorage)).toEqual({
      theme: "dawn-steel",
      leftSidebarCollapsed: true,
      rightSidebarCollapsed: true
    });
  });

  it("sanitizes invalid sidebar collapsed flags to defaults", () => {
    window.localStorage.setItem(
      LAYOUT_SETTINGS_STORAGE_KEY,
      JSON.stringify({
        theme: "aurora-deep-blue",
        leftSidebarCollapsed: "yes",
        rightSidebarCollapsed: 1
      })
    );

    expect(loadLayoutSettingsFromStorage(window.localStorage)).toEqual({
      theme: "aurora-deep-blue",
      leftSidebarCollapsed: false,
      rightSidebarCollapsed: false
    });
  });
});
