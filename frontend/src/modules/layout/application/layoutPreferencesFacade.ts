import {
  DEFAULT_LAYOUT_SETTINGS,
  LAYOUT_SETTINGS_STORAGE_KEY,
  loadLayoutSettingsFromStorage,
  persistLayoutSettingsToStorage,
  type LayoutSettings
} from "../layoutSettings";
import {
  DEFAULT_LAYOUT_THEME,
  LAYOUT_THEME_OPTIONS,
  LAYOUT_THEME_STORAGE_KEY,
  type LayoutThemeId
} from "../themeSettings";
import {
  DEFAULT_WORKSPACE_OPTION_SETTINGS,
  LEGACY_WORKSPACE_OPTIONS_STORAGE_KEY,
  loadWorkspaceOptionSettingsFromStorage,
  persistWorkspaceOptionSettingsToStorage,
  WORKSPACE_OPTIONS_STORAGE_KEY,
  type SelectionBoxMode,
  type WorkspaceOptionSettings
} from "../workspaceOptionSettings";
import type { LayoutPreferencesPort } from "../ports/layoutPreferencesPort";

export interface LayoutPreferencesFacade {
  loadLayoutSettings(): LayoutSettings;
  persistLayoutSettings(settings: LayoutSettings): void;
  applyTheme(theme: LayoutThemeId): void;
  loadWorkspaceOptions(): WorkspaceOptionSettings;
  persistWorkspaceOptions(settings: WorkspaceOptionSettings): void;
}

function asStorage(port: LayoutPreferencesPort): Storage {
  return {
    getItem(key: string): string | null {
      return port.read(key);
    },
    setItem(key: string, value: string): void {
      port.write(key, value);
    },
    removeItem(key: string): void {
      port.remove(key);
    },
    clear(): void {
      // Not used by this facade.
    },
    key(_index: number): string | null {
      return null;
    },
    get length(): number {
      return 0;
    }
  };
}

export function createLayoutPreferencesFacade(
  preferencesPort: LayoutPreferencesPort
): LayoutPreferencesFacade {
  const storage = asStorage(preferencesPort);

  return {
    loadLayoutSettings() {
      return loadLayoutSettingsFromStorage(storage);
    },
    persistLayoutSettings(settings) {
      persistLayoutSettingsToStorage(settings, storage);
    },
    applyTheme(theme) {
      preferencesPort.applyTheme(theme);
    },
    loadWorkspaceOptions() {
      return loadWorkspaceOptionSettingsFromStorage(storage);
    },
    persistWorkspaceOptions(settings) {
      persistWorkspaceOptionSettingsToStorage(settings, storage);
    }
  };
}

export type { LayoutSettings, LayoutThemeId, SelectionBoxMode, WorkspaceOptionSettings };

export {
  DEFAULT_LAYOUT_SETTINGS,
  DEFAULT_LAYOUT_THEME,
  DEFAULT_WORKSPACE_OPTION_SETTINGS,
  LAYOUT_SETTINGS_STORAGE_KEY,
  LAYOUT_THEME_OPTIONS,
  LAYOUT_THEME_STORAGE_KEY,
  LEGACY_WORKSPACE_OPTIONS_STORAGE_KEY,
  WORKSPACE_OPTIONS_STORAGE_KEY
};
