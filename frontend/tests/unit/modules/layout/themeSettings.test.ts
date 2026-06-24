import { beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_LAYOUT_THEME,
  LAYOUT_THEME_STORAGE_KEY,
  isLayoutThemeId,
  loadLayoutThemeFromStorage,
  persistLayoutThemeToStorage,
  applyLayoutThemeToDocument
} from "../../../../src/modules/layout/themeSettings";

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

describe("themeSettings", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("recognizes valid and invalid theme ids", () => {
    expect(DEFAULT_LAYOUT_THEME).toBe("aurora-toolset-classic");
    expect(isLayoutThemeId("aurora-toolset-classic")).toBe(true);
    expect(isLayoutThemeId("aurora-deep-blue")).toBe(true);
    expect(isLayoutThemeId("obsidian-slate")).toBe(true);
    expect(isLayoutThemeId("dawn-steel")).toBe(true);
    expect(isLayoutThemeId("forest-night")).toBe(true);
    expect(isLayoutThemeId("invalid-theme")).toBe(false);
    expect(isLayoutThemeId(null)).toBe(false);
  });

  it("loads default theme when storage is null or empty", () => {
    expect(loadLayoutThemeFromStorage(null)).toBe(DEFAULT_LAYOUT_THEME);
    expect(loadLayoutThemeFromStorage(window.localStorage)).toBe(DEFAULT_LAYOUT_THEME);
  });

  it("loads persisted valid theme", () => {
    window.localStorage.setItem(LAYOUT_THEME_STORAGE_KEY, "forest-night");
    expect(loadLayoutThemeFromStorage(window.localStorage)).toBe("forest-night");
  });

  it("falls back to default for invalid persisted theme", () => {
    window.localStorage.setItem(LAYOUT_THEME_STORAGE_KEY, "legacy-theme");
    expect(loadLayoutThemeFromStorage(window.localStorage)).toBe(DEFAULT_LAYOUT_THEME);
  });

  it("falls back to default when storage access throws", () => {
    expect(loadLayoutThemeFromStorage(createThrowingStorage())).toBe(DEFAULT_LAYOUT_THEME);
  });

  it("persists theme when storage is available", () => {
    persistLayoutThemeToStorage("obsidian-slate", window.localStorage);
    expect(window.localStorage.getItem(LAYOUT_THEME_STORAGE_KEY)).toBe("obsidian-slate");
  });

  it("does not throw when persist storage throws", () => {
    expect(() =>
      persistLayoutThemeToStorage("aurora-deep-blue", createThrowingStorage())
    ).not.toThrow();
  });

  it("applies theme to root element and handles null element", () => {
    const root = document.createElement("div");
    applyLayoutThemeToDocument("dawn-steel", root);
    expect(root.getAttribute("data-layout-theme")).toBe("dawn-steel");
    expect(() => applyLayoutThemeToDocument("dawn-steel", null)).not.toThrow();
  });
});
