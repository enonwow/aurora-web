export type ViewportControlPresetId = "aurora-classic";

export interface ViewportControlPresetOption {
  id: ViewportControlPresetId;
  label: string;
}

export const VIEWPORT_CONTROL_STORAGE_KEY = "aurora_web.viewport_control_preset";

export const DEFAULT_VIEWPORT_CONTROL_PRESET: ViewportControlPresetId = "aurora-classic";

export const VIEWPORT_CONTROL_OPTIONS: ViewportControlPresetOption[] = [
  { id: "aurora-classic", label: "Aurora Classic" }
];

export function isViewportControlPresetId(
  value: unknown
): value is ViewportControlPresetId {
  return VIEWPORT_CONTROL_OPTIONS.some((option) => option.id === value);
}

export function loadViewportControlPresetFromStorage(
  storage: Storage | null
): ViewportControlPresetId {
  if (!storage) {
    return DEFAULT_VIEWPORT_CONTROL_PRESET;
  }

  try {
    const persisted = storage.getItem(VIEWPORT_CONTROL_STORAGE_KEY);
    if (isViewportControlPresetId(persisted)) {
      return persisted;
    }
  } catch {
    return DEFAULT_VIEWPORT_CONTROL_PRESET;
  }

  return DEFAULT_VIEWPORT_CONTROL_PRESET;
}

export function persistViewportControlPresetToStorage(
  preset: ViewportControlPresetId,
  storage: Storage | null
): void {
  if (!storage) {
    return;
  }

  try {
    storage.setItem(VIEWPORT_CONTROL_STORAGE_KEY, preset);
  } catch {
    // Ignore storage quota/privacy failures while storing viewport controls.
  }
}
