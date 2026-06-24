export type LayoutThemeId =
  | "aurora-toolset-classic"
  | "aurora-deep-blue"
  | "obsidian-slate"
  | "dawn-steel"
  | "forest-night";

export interface LayoutThemeOption {
  id: LayoutThemeId;
  label: string;
}

export const LAYOUT_THEME_STORAGE_KEY = "aurora_web.layout_theme";

export const DEFAULT_LAYOUT_THEME: LayoutThemeId = "aurora-toolset-classic";

export const LAYOUT_THEME_OPTIONS: LayoutThemeOption[] = [
  { id: "aurora-toolset-classic", label: "Aurora Toolset Classic" },
  { id: "aurora-deep-blue", label: "Aurora Deep Blue" },
  { id: "obsidian-slate", label: "Obsidian Slate" },
  { id: "dawn-steel", label: "Dawn Steel" },
  { id: "forest-night", label: "Forest Night" }
];

export function isLayoutThemeId(value: unknown): value is LayoutThemeId {
  return LAYOUT_THEME_OPTIONS.some((option) => option.id === value);
}

export function loadLayoutThemeFromStorage(storage: Storage | null): LayoutThemeId {
  if (!storage) {
    return DEFAULT_LAYOUT_THEME;
  }

  try {
    const persisted = storage.getItem(LAYOUT_THEME_STORAGE_KEY);
    if (isLayoutThemeId(persisted)) {
      return persisted;
    }
  } catch {
    return DEFAULT_LAYOUT_THEME;
  }

  return DEFAULT_LAYOUT_THEME;
}

export function persistLayoutThemeToStorage(
  theme: LayoutThemeId,
  storage: Storage | null
): void {
  if (!storage) {
    return;
  }

  try {
    storage.setItem(LAYOUT_THEME_STORAGE_KEY, theme);
  } catch {
    // Ignore quota / privacy storage errors for mock mode.
  }
}

export function applyLayoutThemeToDocument(
  theme: LayoutThemeId,
  rootElement: HTMLElement | null
): void {
  if (!rootElement) {
    return;
  }

  rootElement.setAttribute("data-layout-theme", theme);
}
