import type { LayoutThemeId } from "../themeSettings";

export interface LayoutPreferencesPort {
  read(key: string): string | null;
  write(key: string, value: string): void;
  remove(key: string): void;
  applyTheme(theme: LayoutThemeId): void;
}

