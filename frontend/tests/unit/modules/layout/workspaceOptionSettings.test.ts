import { beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_WORKSPACE_OPTION_SETTINGS,
  LEGACY_WORKSPACE_OPTIONS_STORAGE_KEY,
  WORKSPACE_OPTIONS_STORAGE_KEY,
  loadWorkspaceOptionSettingsFromStorage,
  persistWorkspaceOptionSettingsToStorage
} from "../../../../src/modules/layout/workspaceOptionSettings";

describe("workspaceOptionSettings", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("returns defaults when storage is empty", () => {
    expect(loadWorkspaceOptionSettingsFromStorage(window.localStorage)).toEqual(
      DEFAULT_WORKSPACE_OPTION_SETTINGS
    );
  });

  it("persists and loads workspace options", () => {
    const next = {
      ...DEFAULT_WORKSPACE_OPTION_SETTINGS,
      snapGridStep: 2,
      snapAngleStepDeg: 30,
      snapHeightStep: 1,
      selectionBoxMode: "intersect" as const,
      cameraRotateSpeed: 1.4,
      cameraZoomSpeed: 1.3,
      cameraPanSpeed: 1.2,
      cameraDampingFactor: 0.12
    };

    persistWorkspaceOptionSettingsToStorage(next, window.localStorage);

    expect(window.localStorage.getItem(WORKSPACE_OPTIONS_STORAGE_KEY)).not.toBeNull();
    expect(window.localStorage.getItem(LEGACY_WORKSPACE_OPTIONS_STORAGE_KEY)).toBeNull();
    expect(loadWorkspaceOptionSettingsFromStorage(window.localStorage)).toEqual(next);
  });

  it("sanitizes out-of-range persisted values", () => {
    window.localStorage.setItem(
      WORKSPACE_OPTIONS_STORAGE_KEY,
      JSON.stringify({
        snapGridStep: 999,
        snapAngleStepDeg: -10,
        snapHeightStep: 0,
        selectionBoxMode: "invalid",
        cameraRotateSpeed: 0,
        cameraZoomSpeed: 9,
        cameraPanSpeed: -5,
        cameraDampingFactor: 99
      })
    );

    const loaded = loadWorkspaceOptionSettingsFromStorage(window.localStorage);

    expect(loaded.snapGridStep).toBe(8);
    expect(loaded.snapAngleStepDeg).toBe(1);
    expect(loaded.snapHeightStep).toBe(0.05);
    expect(loaded.selectionBoxMode).toBe("replace");
    expect(loaded.cameraRotateSpeed).toBe(0.1);
    expect(loaded.cameraZoomSpeed).toBe(4);
    expect(loaded.cameraPanSpeed).toBe(0.1);
    expect(loaded.cameraDampingFactor).toBe(0.35);
  });

  it("loads legacy key and coerces string payload types", () => {
    window.localStorage.setItem(
      LEGACY_WORKSPACE_OPTIONS_STORAGE_KEY,
      JSON.stringify({
        snapGridStep: "2",
        snapAngleStepDeg: "45",
        snapHeightStep: "1",
        selectionBoxMode: "add",
        cameraRotateSpeed: "1.2",
        cameraZoomSpeed: "1.3",
        cameraPanSpeed: "1.4",
        cameraDampingFactor: "0.11"
      })
    );

    const loaded = loadWorkspaceOptionSettingsFromStorage(window.localStorage);
    expect(loaded.snapGridStep).toBe(2);
    expect(loaded.snapAngleStepDeg).toBe(45);
    expect(loaded.snapHeightStep).toBe(1);
    expect(loaded.selectionBoxMode).toBe("add");
    expect(loaded.cameraRotateSpeed).toBe(1.2);
    expect(loaded.cameraZoomSpeed).toBe(1.3);
    expect(loaded.cameraPanSpeed).toBe(1.4);
    expect(loaded.cameraDampingFactor).toBe(0.11);
  });

  it("prefers active key when both active and legacy keys exist", () => {
    window.localStorage.setItem(
      WORKSPACE_OPTIONS_STORAGE_KEY,
      JSON.stringify({
        ...DEFAULT_WORKSPACE_OPTION_SETTINGS,
        snapGridStep: 3
      })
    );
    window.localStorage.setItem(
      LEGACY_WORKSPACE_OPTIONS_STORAGE_KEY,
      JSON.stringify({
        ...DEFAULT_WORKSPACE_OPTION_SETTINGS,
        snapGridStep: 7
      })
    );

    const loaded = loadWorkspaceOptionSettingsFromStorage(window.localStorage);
    expect(loaded.snapGridStep).toBe(3);
  });
});
