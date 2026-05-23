import { describe, expect, it } from "vitest";
import { createWorkspaceChromeFacade } from "../../../../../src/modules/layout/application/workspaceChromeFacade";

describe("workspaceChromeFacade", () => {
  it("exposes toolbar groups, shortcuts, and role panels", () => {
    const facade = createWorkspaceChromeFacade();

    const builderGroups = facade.getRoleToolbarGroups("builder");
    const builderShortcuts = facade.getRoleKeyboardShortcuts("builder");
    const builderPanels = facade.getRoleWorkspacePanels("builder");

    expect(builderGroups.length).toBeGreaterThan(0);
    expect(builderGroups.some((group) => group.key === "canvas")).toBe(true);
    expect(builderShortcuts.some((shortcut) => shortcut.key === "?")).toBe(true);
    expect(builderPanels.left.length).toBeGreaterThan(0);
  });

  it("creates and mutates toolbar state through facade actions", () => {
    const facade = createWorkspaceChromeFacade();
    const initial = facade.createDefaultToolbarState();

    const toggledGrid = facade.applyToolbarAction(initial, "snap_grid_toggle");
    const toTerrain = facade.applyToolbarAction(initial, "select_terrain");

    expect(initial.canvasDebug.snapGrid).toBe(true);
    expect(toggledGrid.canvasDebug.snapGrid).toBe(false);
    expect(toTerrain.selectionMode).toBe("terrain");
  });
});

