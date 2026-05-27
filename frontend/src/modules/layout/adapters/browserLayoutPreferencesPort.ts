import type { LayoutThemeId } from "../themeSettings";
import type { LayoutPreferencesPort } from "../ports/layoutPreferencesPort";

interface BrowserLayoutPreferencesPortOptions {
  storage: Storage | null;
  rootElement: HTMLElement | null;
}

export function createBrowserLayoutPreferencesPort(
  options: BrowserLayoutPreferencesPortOptions
): LayoutPreferencesPort {
  const { rootElement, storage } = options;

  return {
    read(key) {
      if (!storage) {
        return null;
      }
      try {
        return storage.getItem(key);
      } catch {
        return null;
      }
    },
    write(key, value) {
      if (!storage) {
        return;
      }
      try {
        storage.setItem(key, value);
      } catch {
        // Ignore privacy/quota failures in mock mode.
      }
    },
    remove(key) {
      if (!storage) {
        return;
      }
      try {
        storage.removeItem(key);
      } catch {
        // Ignore privacy/quota failures in mock mode.
      }
    },
    applyTheme(theme: LayoutThemeId) {
      if (!rootElement) {
        return;
      }
      rootElement.setAttribute("data-layout-theme", theme);
    }
  };
}

