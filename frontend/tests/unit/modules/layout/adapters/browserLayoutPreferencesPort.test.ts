import { beforeEach, describe, expect, it } from "vitest";
import { createBrowserLayoutPreferencesPort } from "../../../../../src/modules/layout/adapters/browserLayoutPreferencesPort";

describe("browserLayoutPreferencesPort", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute("data-layout-theme");
  });

  it("reads and writes through localStorage safely", () => {
    const port = createBrowserLayoutPreferencesPort({
      storage: window.localStorage,
      rootElement: document.documentElement
    });

    port.write("aurora.test", "value");

    expect(port.read("aurora.test")).toBe("value");

    port.remove("aurora.test");
    expect(port.read("aurora.test")).toBeNull();
  });

  it("applies theme on root element and tolerates null dependencies", () => {
    const browserPort = createBrowserLayoutPreferencesPort({
      storage: window.localStorage,
      rootElement: document.documentElement
    });
    const nullPort = createBrowserLayoutPreferencesPort({
      storage: null,
      rootElement: null
    });

    browserPort.applyTheme("forest-night");
    expect(document.documentElement.getAttribute("data-layout-theme")).toBe("forest-night");

    expect(() => {
      nullPort.write("x", "y");
      nullPort.remove("x");
      nullPort.applyTheme("aurora-deep-blue");
    }).not.toThrow();
  });
});

