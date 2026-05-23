import { describe, expect, it } from "vitest";
import { createWorkspaceChromeFacade } from "../../../../../src/modules/layout/application/workspaceChromeFacade";
import { createWorkspaceTopbarActionStateFacade } from "../../../../../src/modules/layout/application/workspaceTopbarActionStateFacade";

describe("workspaceTopbarActionStateFacade", () => {
  it("reflects active actions for default toolbar state", () => {
    const chromeFacade = createWorkspaceChromeFacade();
    const actionStateFacade = createWorkspaceTopbarActionStateFacade();
    const initial = chromeFacade.createDefaultToolbarState();

    expect(actionStateFacade.isActionActive("select_object", initial)).toBe(true);
    expect(actionStateFacade.isActionActive("scope_all", initial)).toBe(true);
    expect(actionStateFacade.isActionActive("show_none", initial)).toBe(false);
    expect(actionStateFacade.isActionActive("debug_textures", initial)).toBe(true);
    expect(actionStateFacade.isActionActive("debug_status_map_off", initial)).toBe(true);
    expect(actionStateFacade.isActionActive("canvas_gizmo_translate", initial)).toBe(true);
    expect(actionStateFacade.isActionActive("unlock_all_layers", initial)).toBe(true);
    expect(actionStateFacade.isActionActive("clear_isolation", initial)).toBe(true);
  });

  it("tracks visibility matrix updates from toolbar actions", () => {
    const chromeFacade = createWorkspaceChromeFacade();
    const actionStateFacade = createWorkspaceTopbarActionStateFacade();
    const hidden = chromeFacade.applyToolbarAction(
      chromeFacade.createDefaultToolbarState(),
      "show_none"
    );

    expect(actionStateFacade.isActionActive("show_none", hidden)).toBe(true);
    expect(actionStateFacade.isActionActive("show_creatures", hidden)).toBe(false);
    expect(actionStateFacade.isActionActive("show_doors", hidden)).toBe(false);
    expect(actionStateFacade.isActionActive("show_items", hidden)).toBe(false);
    expect(actionStateFacade.isActionActive("show_placeables", hidden)).toBe(false);
    expect(actionStateFacade.isActionActive("show_sounds", hidden)).toBe(false);
  });

  it("tracks lock and isolation canvas states", () => {
    const chromeFacade = createWorkspaceChromeFacade();
    const actionStateFacade = createWorkspaceTopbarActionStateFacade();
    const initial = chromeFacade.createDefaultToolbarState();
    const lockedCreatures = chromeFacade.applyToolbarAction(initial, "lock_creatures");
    const isolatedCreatures = chromeFacade.applyToolbarAction(lockedCreatures, "isolate_creatures");
    const isolationCleared = chromeFacade.applyToolbarAction(
      isolatedCreatures,
      "isolate_creatures"
    );

    expect(actionStateFacade.isActionActive("lock_creatures", lockedCreatures)).toBe(true);
    expect(actionStateFacade.isActionActive("unlock_all_layers", lockedCreatures)).toBe(false);
    expect(actionStateFacade.isActionActive("isolate_creatures", isolatedCreatures)).toBe(true);
    expect(actionStateFacade.isActionActive("clear_isolation", isolatedCreatures)).toBe(false);
    expect(actionStateFacade.isActionActive("clear_isolation", isolationCleared)).toBe(true);
  });
});
