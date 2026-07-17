import { describe, expect, it } from "vitest";
import { createLayoutFacadeBundle } from "../../../../../src/modules/layout/application/layoutFacadeBundle";
import { createBrowserLayoutFacadeBundle } from "../../../../../src/modules/layout/composition/createBrowserLayoutFacadeBundle";
import { createBrowserLayoutPreferencesPort } from "../../../../../src/modules/layout/adapters/browserLayoutPreferencesPort";

describe("layoutFacadeBundle", () => {
  it("creates preferences, chrome, and viewport facades together", () => {
    const bundle = createLayoutFacadeBundle({
      preferencesPort: createBrowserLayoutPreferencesPort({
        storage: window.localStorage,
        rootElement: document.documentElement
      })
    });
    const browserBundle = createBrowserLayoutFacadeBundle();

    expect(bundle.preferences.loadLayoutSettings()).toEqual(
      browserBundle.preferences.loadLayoutSettings()
    );
    expect(bundle.chrome.getRoleToolbarGroups("builder").length).toBeGreaterThan(0);
    expect(bundle.viewport.defaultMasterCellsPerTile).toBe(10);
  });
});
