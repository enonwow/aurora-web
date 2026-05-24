import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_LAYOUT_SETTINGS,
  LEGACY_LAYOUT_SETTINGS_STORAGE_KEY,
  LAYOUT_SETTINGS_STORAGE_KEY,
  loadLayoutSettingsFromStorage,
  persistLayoutSettingsToStorage
} from "../../../../src/modules/layout/layoutSettings";

describe("layoutSettings - negative cases", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("falls back to defaults for malformed JSON payload", () => {
    window.localStorage.setItem(LAYOUT_SETTINGS_STORAGE_KEY, "{bad-json");
    expect(loadLayoutSettingsFromStorage(window.localStorage)).toEqual(
      DEFAULT_LAYOUT_SETTINGS
    );
  });

  it("skips non-object payload and falls back to legacy key when available", () => {
    window.localStorage.setItem(LAYOUT_SETTINGS_STORAGE_KEY, "[]");
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

  it("skips empty unified payload and still reads legacy unified settings", () => {
    window.localStorage.setItem(LAYOUT_SETTINGS_STORAGE_KEY, "");
    window.localStorage.setItem(
      LEGACY_LAYOUT_SETTINGS_STORAGE_KEY,
      JSON.stringify({
        theme: "obsidian-slate",
        leftSidebarCollapsed: true,
        rightSidebarCollapsed: true
      })
    );

    expect(loadLayoutSettingsFromStorage(window.localStorage)).toEqual({
      theme: "obsidian-slate",
      leftSidebarCollapsed: true,
      rightSidebarCollapsed: true
    });
  });

  it("skips primitive unified payload and still reads legacy unified settings", () => {
    window.localStorage.setItem(LAYOUT_SETTINGS_STORAGE_KEY, "123");
    window.localStorage.setItem(
      LEGACY_LAYOUT_SETTINGS_STORAGE_KEY,
      JSON.stringify({
        theme: "obsidian-slate",
        leftSidebarCollapsed: true,
        rightSidebarCollapsed: true
      })
    );

    expect(loadLayoutSettingsFromStorage(window.localStorage)).toEqual({
      theme: "obsidian-slate",
      leftSidebarCollapsed: true,
      rightSidebarCollapsed: true
    });
  });

  it("sanitizes invalid theme value to default theme", () => {
    window.localStorage.setItem(
      LAYOUT_SETTINGS_STORAGE_KEY,
      JSON.stringify({
        theme: "unknown-theme",
        leftSidebarCollapsed: true,
        rightSidebarCollapsed: false
      })
    );

    const loaded = loadLayoutSettingsFromStorage(window.localStorage);
    expect(loaded.theme).toBe(DEFAULT_LAYOUT_SETTINGS.theme);
    expect(loaded.leftSidebarCollapsed).toBe(true);
    expect(loaded.rightSidebarCollapsed).toBe(false);
  });

  it("does not throw when persisting to null storage", () => {
    expect(() =>
      persistLayoutSettingsToStorage(DEFAULT_LAYOUT_SETTINGS, null)
    ).not.toThrow();
  });

  it("returns defaults when loading settings from null storage", () => {
    expect(loadLayoutSettingsFromStorage(null)).toEqual(DEFAULT_LAYOUT_SETTINGS);
  });

  it("does not serialize settings when storage is null", () => {
    const stringifySpy = vi.spyOn(JSON, "stringify");

    persistLayoutSettingsToStorage(DEFAULT_LAYOUT_SETTINGS, null);

    expect(stringifySpy).not.toHaveBeenCalled();
    stringifySpy.mockRestore();
  });
});

