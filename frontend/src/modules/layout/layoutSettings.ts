import {
  DEFAULT_LAYOUT_THEME,
  LAYOUT_THEME_STORAGE_KEY,
  isLayoutThemeId,
  loadLayoutThemeFromStorage,
  type LayoutThemeId
} from "./themeSettings";

export interface LayoutSettings {
  theme: LayoutThemeId;
  leftSidebarCollapsed: boolean;
  rightSidebarCollapsed: boolean;
}

export const LAYOUT_SETTINGS_STORAGE_KEY = "aurora_web.layout_settings";
export const LEGACY_LAYOUT_SETTINGS_STORAGE_KEY = "aurora_web.layout_settings.v1";

export const DEFAULT_LAYOUT_SETTINGS: LayoutSettings = {
  theme: DEFAULT_LAYOUT_THEME,
  leftSidebarCollapsed: false,
  rightSidebarCollapsed: false
};

function sanitizeLayoutSettings(value: Partial<LayoutSettings>): LayoutSettings {
  return {
    theme: isLayoutThemeId(value.theme) ? value.theme : DEFAULT_LAYOUT_THEME,
    leftSidebarCollapsed:
      typeof value.leftSidebarCollapsed === "boolean"
        ? value.leftSidebarCollapsed
        : DEFAULT_LAYOUT_SETTINGS.leftSidebarCollapsed,
    rightSidebarCollapsed:
      typeof value.rightSidebarCollapsed === "boolean"
        ? value.rightSidebarCollapsed
        : DEFAULT_LAYOUT_SETTINGS.rightSidebarCollapsed
  };
}

function loadLegacyLayoutSettings(storage: Storage | null): LayoutSettings {
  return {
    theme: loadLayoutThemeFromStorage(storage),
    leftSidebarCollapsed: DEFAULT_LAYOUT_SETTINGS.leftSidebarCollapsed,
    rightSidebarCollapsed: DEFAULT_LAYOUT_SETTINGS.rightSidebarCollapsed
  };
}

export function loadLayoutSettingsFromStorage(storage: Storage | null): LayoutSettings {
  if (!storage) {
    return DEFAULT_LAYOUT_SETTINGS;
  }

  try {
    const keys = [LAYOUT_SETTINGS_STORAGE_KEY, LEGACY_LAYOUT_SETTINGS_STORAGE_KEY];
    for (const key of keys) {
      const raw = storage.getItem(key);
      if (!raw) {
        continue;
      }
      const parsed = JSON.parse(raw) as unknown;
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        continue;
      }
      return sanitizeLayoutSettings(parsed as Partial<LayoutSettings>);
    }
    return loadLegacyLayoutSettings(storage);
  } catch {
    return loadLegacyLayoutSettings(storage);
  }
}

export function persistLayoutSettingsToStorage(
  settings: LayoutSettings,
  storage: Storage | null
): void {
  if (!storage) {
    return;
  }

  try {
    const serialized = JSON.stringify(settings);
    storage.setItem(LAYOUT_SETTINGS_STORAGE_KEY, serialized);
    storage.removeItem(LEGACY_LAYOUT_SETTINGS_STORAGE_KEY);
    storage.removeItem(LAYOUT_THEME_STORAGE_KEY);
    storage.removeItem("aurora_web.viewport_control_preset");
  } catch {
    // Ignore quota / privacy storage errors while storing layout settings.
  }
}
