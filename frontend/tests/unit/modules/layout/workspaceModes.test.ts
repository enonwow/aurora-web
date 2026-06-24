import { describe, expect, it } from "vitest";
import {
  DEFAULT_WORKSPACE_MODE_ID,
  getDefaultWorkspaceMode,
  getDefaultWorkspaceModeId,
  getWorkspaceModeById,
  isWorkspaceModeId,
  listWorkspaceModes,
  resolveWorkspaceMode,
  resolveWorkspaceModeId
} from "../../../../src/modules/layout/workspaceModes";

describe("workspaceModes", () => {
  it("exposes stable areas_mode as default mode", () => {
    expect(DEFAULT_WORKSPACE_MODE_ID).toBe("areas_mode");
    expect(getDefaultWorkspaceModeId()).toBe("areas_mode");

    const defaultMode = getDefaultWorkspaceMode();
    expect(defaultMode.id).toBe("areas_mode");
    expect(defaultMode.showAreaSelectionPanel).toBe(true);
    expect(defaultMode.showSceneObjectAddPanel).toBe(true);
    expect(defaultMode.showSceneObjectListPanel).toBe(true);
    expect(defaultMode.defaultAddType).toBe("placeables");
    expect(defaultMode.defaultListType).toBe("all");
    expect(defaultMode.allowedCatalogTypes).toContain("all");
  });

  it("resolves valid ids and falls back invalid ids to default", () => {
    expect(resolveWorkspaceModeId("placeables_mode")).toBe("placeables_mode");
    expect(resolveWorkspaceModeId("sounds_mode")).toBe("sounds_mode");
    expect(resolveWorkspaceModeId("areas_mode")).toBe("areas_mode");
    expect(resolveWorkspaceModeId("unknown_mode")).toBe("areas_mode");
    expect(resolveWorkspaceModeId(null)).toBe("areas_mode");
    expect(resolveWorkspaceModeId(undefined)).toBe("areas_mode");

    const resolvedDefault = resolveWorkspaceMode("unknown_mode");
    expect(resolvedDefault.id).toBe("areas_mode");
  });

  it("defines placeables_mode as focused catalog mode", () => {
    const placeablesMode = getWorkspaceModeById("placeables_mode");

    expect(placeablesMode.allowedCatalogTypes).toEqual(["placeables"]);
    expect(placeablesMode.defaultAddType).toBe("placeables");
    expect(placeablesMode.defaultListType).toBe("placeables");
    expect(placeablesMode.showAreaSelectionPanel).toBe(false);
    expect(placeablesMode.showSceneObjectAddPanel).toBe(true);
    expect(placeablesMode.showSceneObjectListPanel).toBe(false);
  });

  it("defines sounds_mode as independent backend sound catalog mode", () => {
    const soundsMode = getWorkspaceModeById("sounds_mode");

    expect(soundsMode.allowedCatalogTypes).toEqual(["sounds"]);
    expect(soundsMode.defaultAddType).toBe("sounds");
    expect(soundsMode.defaultListType).toBe("sounds");
    expect(soundsMode.renderAreaGeometry).toBe(false);
    expect(soundsMode.showAreaSelectionPanel).toBe(false);
    expect(soundsMode.showSceneObjectAddPanel).toBe(true);
    expect(soundsMode.showSceneObjectListPanel).toBe(false);
  });

  it("lists available modes in stable order for UI selectors", () => {
    const modes = listWorkspaceModes();
    expect(modes.map((mode) => mode.id)).toEqual([
      "areas_mode",
      "placeables_mode",
      "sounds_mode"
    ]);
    expect(modes.map((mode) => mode.label)).toEqual([
      "Areas Mode",
      "Placeables Mode",
      "Sounds Mode"
    ]);
  });

  it("exposes mode id guard", () => {
    expect(isWorkspaceModeId("areas_mode")).toBe(true);
    expect(isWorkspaceModeId("placeables_mode")).toBe(true);
    expect(isWorkspaceModeId("sounds_mode")).toBe(true);
    expect(isWorkspaceModeId(42)).toBe(false);
  });
});
