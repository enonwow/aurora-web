import { beforeEach, describe, expect, it } from "vitest";
import {
  createLayoutPreferencesFacade,
  DEFAULT_LAYOUT_SETTINGS,
  DEFAULT_WORKSPACE_OPTION_SETTINGS
} from "../../../../../src/modules/layout/application/layoutPreferencesFacade";
import { createBrowserLayoutPreferencesPort } from "../../../../../src/modules/layout/adapters/browserLayoutPreferencesPort";

describe("layoutPreferencesFacade", () => {
  const createFacade = () =>
    createLayoutPreferencesFacade(
      createBrowserLayoutPreferencesPort({
        storage: window.localStorage,
        rootElement: document.documentElement
      })
    );

  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute("data-layout-theme");
  });

  it("loads and persists layout preferences through the facade", () => {
    const facade = createFacade();
    const nextSettings = {
      theme: "forest-night" as const,
      leftSidebarCollapsed: true,
      rightSidebarCollapsed: false
    };

    expect(facade.loadLayoutSettings()).toEqual(DEFAULT_LAYOUT_SETTINGS);

    facade.persistLayoutSettings(nextSettings);
    expect(facade.loadLayoutSettings()).toEqual(nextSettings);
  });

  it("loads and persists workspace options through the facade", () => {
    const facade = createFacade();
    const nextOptions = {
      ...DEFAULT_WORKSPACE_OPTION_SETTINGS,
      snapGridStep: 0.5,
      cameraZoomSpeed: 1.6
    };

    expect(facade.loadWorkspaceOptions()).toEqual(DEFAULT_WORKSPACE_OPTION_SETTINGS);

    facade.persistWorkspaceOptions(nextOptions);
    expect(facade.loadWorkspaceOptions()).toEqual(nextOptions);
  });

  it("applies selected theme to a root element", () => {
    const facade = createFacade();

    facade.applyTheme("obsidian-slate");

    expect(document.documentElement.getAttribute("data-layout-theme")).toBe("obsidian-slate");
  });
});
