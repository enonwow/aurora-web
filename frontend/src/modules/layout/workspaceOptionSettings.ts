export type SelectionBoxMode = "replace" | "add" | "subtract" | "intersect";

export interface WorkspaceOptionSettings {
  snapGridStep: number;
  snapAngleStepDeg: number;
  snapHeightStep: number;
  selectionBoxMode: SelectionBoxMode;
  cameraRotateSpeed: number;
  cameraZoomSpeed: number;
  cameraPanSpeed: number;
  cameraDampingFactor: number;
}

export const WORKSPACE_OPTIONS_STORAGE_KEY = "aurora_web.workspace_options";
export const LEGACY_WORKSPACE_OPTIONS_STORAGE_KEY = "aurora_web.workspace_options.v1";

export const DEFAULT_WORKSPACE_OPTION_SETTINGS: WorkspaceOptionSettings = {
  snapGridStep: 1,
  snapAngleStepDeg: 15,
  snapHeightStep: 0.5,
  selectionBoxMode: "replace",
  cameraRotateSpeed: 1,
  cameraZoomSpeed: 1,
  cameraPanSpeed: 1,
  cameraDampingFactor: 0.08
};

function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.max(min, Math.min(max, value));
}

function coerceNumber(value: unknown, fallback: number): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : fallback;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function isSelectionBoxMode(value: unknown): value is SelectionBoxMode {
  return value === "replace" || value === "add" || value === "subtract" || value === "intersect";
}

function sanitizeSettings(value: Partial<WorkspaceOptionSettings>): WorkspaceOptionSettings {
  return {
    snapGridStep: clampNumber(
      coerceNumber(value.snapGridStep, DEFAULT_WORKSPACE_OPTION_SETTINGS.snapGridStep),
      0.1,
      8
    ),
    snapAngleStepDeg: clampNumber(
      coerceNumber(value.snapAngleStepDeg, DEFAULT_WORKSPACE_OPTION_SETTINGS.snapAngleStepDeg),
      1,
      180
    ),
    snapHeightStep: clampNumber(
      coerceNumber(value.snapHeightStep, DEFAULT_WORKSPACE_OPTION_SETTINGS.snapHeightStep),
      0.05,
      8
    ),
    selectionBoxMode: isSelectionBoxMode(value.selectionBoxMode)
      ? value.selectionBoxMode
      : DEFAULT_WORKSPACE_OPTION_SETTINGS.selectionBoxMode,
    cameraRotateSpeed: clampNumber(
      coerceNumber(value.cameraRotateSpeed, DEFAULT_WORKSPACE_OPTION_SETTINGS.cameraRotateSpeed),
      0.1,
      4
    ),
    cameraZoomSpeed: clampNumber(
      coerceNumber(value.cameraZoomSpeed, DEFAULT_WORKSPACE_OPTION_SETTINGS.cameraZoomSpeed),
      0.1,
      4
    ),
    cameraPanSpeed: clampNumber(
      coerceNumber(value.cameraPanSpeed, DEFAULT_WORKSPACE_OPTION_SETTINGS.cameraPanSpeed),
      0.1,
      4
    ),
    cameraDampingFactor: clampNumber(
      coerceNumber(
        value.cameraDampingFactor,
        DEFAULT_WORKSPACE_OPTION_SETTINGS.cameraDampingFactor
      ),
      0.01,
      0.35
    )
  };
}

function loadRawSettings(storage: Storage): Partial<WorkspaceOptionSettings> | null {
  const keys = [WORKSPACE_OPTIONS_STORAGE_KEY, LEGACY_WORKSPACE_OPTIONS_STORAGE_KEY];

  for (const key of keys) {
    const raw = storage.getItem(key);
    if (!raw) {
      continue;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw) as unknown;
    } catch {
      continue;
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      continue;
    }
    return parsed as Partial<WorkspaceOptionSettings>;
  }

  return null;
}

export function loadWorkspaceOptionSettingsFromStorage(
  storage: Storage | null
): WorkspaceOptionSettings {
  if (!storage) {
    return DEFAULT_WORKSPACE_OPTION_SETTINGS;
  }

  try {
    const loaded = loadRawSettings(storage);
    if (!loaded) {
      return DEFAULT_WORKSPACE_OPTION_SETTINGS;
    }
    return sanitizeSettings(loaded);
  } catch {
    return DEFAULT_WORKSPACE_OPTION_SETTINGS;
  }
}

export function persistWorkspaceOptionSettingsToStorage(
  settings: WorkspaceOptionSettings,
  storage: Storage | null
): void {
  if (!storage) {
    return;
  }

  try {
    const serialized = JSON.stringify(settings);
    storage.setItem(WORKSPACE_OPTIONS_STORAGE_KEY, serialized);
    storage.removeItem(LEGACY_WORKSPACE_OPTIONS_STORAGE_KEY);
  } catch {
    // Ignore private mode / quota errors in mock mode.
  }
}
