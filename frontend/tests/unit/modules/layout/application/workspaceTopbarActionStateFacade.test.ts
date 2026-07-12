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
    expect(actionStateFacade.isActionActive("display_shadows", initial)).toBe(true);
    expect(actionStateFacade.isActionActive("display_fog", initial)).toBe(false);
    expect(actionStateFacade.isActionActive("use_area_lighting", initial)).toBe(false);
    expect(actionStateFacade.isActionActive("canvas_gizmo_translate", initial)).toBe(true);
    expect(actionStateFacade.isActionActive("canvas_gizmo_vt_rotate", initial)).toBe(false);
    expect(actionStateFacade.isActionActive("canvas_gizmo_vt_translate", initial)).toBe(false);
    expect(actionStateFacade.isActionActive("canvas_gizmo_vt_scale", initial)).toBe(false);
    expect(actionStateFacade.isActionActive("debug_show_vt_physical_anchor", initial)).toBe(false);
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

  it("tracks area environment light/fog/shadow toggles", () => {
    const chromeFacade = createWorkspaceChromeFacade();
    const actionStateFacade = createWorkspaceTopbarActionStateFacade();
    const shadowsOff = chromeFacade.applyToolbarAction(
      chromeFacade.createDefaultToolbarState(),
      "display_shadows"
    );
    const fogOn = chromeFacade.applyToolbarAction(shadowsOff, "display_fog");
    const lightingOn = chromeFacade.applyToolbarAction(fogOn, "use_area_lighting");

    expect(actionStateFacade.isActionActive("display_shadows", shadowsOff)).toBe(false);
    expect(actionStateFacade.isActionActive("display_fog", fogOn)).toBe(true);
    expect(actionStateFacade.isActionActive("use_area_lighting", lightingOn)).toBe(true);
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

  it("marks VT gizmo actions active only for matching VT mode", () => {
    const chromeFacade = createWorkspaceChromeFacade();
    const actionStateFacade = createWorkspaceTopbarActionStateFacade();
    const vtRotateState = {
      ...chromeFacade.createDefaultToolbarState(),
      canvasDebug: {
        ...chromeFacade.createDefaultToolbarState().canvasDebug,
        gizmoMode: "vt_rotate" as const
      }
    };

    expect(actionStateFacade.isActionActive("canvas_gizmo_vt_rotate", vtRotateState)).toBe(true);
    expect(actionStateFacade.isActionActive("canvas_gizmo_vt_translate", vtRotateState)).toBe(false);
    expect(actionStateFacade.isActionActive("canvas_gizmo_vt_scale", vtRotateState)).toBe(false);
  });

  it("switches active state when VT actions are issued", () => {
    const chromeFacade = createWorkspaceChromeFacade();
    const actionStateFacade = createWorkspaceTopbarActionStateFacade();
    const vtRotateState = chromeFacade.applyToolbarAction(
      chromeFacade.createDefaultToolbarState(),
      "canvas_gizmo_vt_rotate"
    );
    const afterVtTranslate = chromeFacade.applyToolbarAction(
      vtRotateState,
      "canvas_gizmo_vt_translate"
    );
    const afterVtScale = chromeFacade.applyToolbarAction(afterVtTranslate, "canvas_gizmo_vt_scale");

    expect(afterVtScale.lastCommand).toBe("canvas_gizmo_vt_scale");
    expect(actionStateFacade.isActionActive("canvas_gizmo_vt_rotate", afterVtScale)).toBe(false);
    expect(actionStateFacade.isActionActive("canvas_gizmo_vt_translate", afterVtScale)).toBe(false);
    expect(actionStateFacade.isActionActive("canvas_gizmo_vt_scale", afterVtScale)).toBe(true);
  });

  it("returns false for command-only and non-toggle action keys", () => {
    const chromeFacade = createWorkspaceChromeFacade();
    const actionStateFacade = createWorkspaceTopbarActionStateFacade();
    const initial = chromeFacade.createDefaultToolbarState();

    expect(actionStateFacade.isActionActive("undo", initial)).toBe(false);
    expect(actionStateFacade.isActionActive("redo", initial)).toBe(false);
    expect(actionStateFacade.isActionActive("save_local_draft", initial)).toBe(false);
    expect(actionStateFacade.isActionActive("debug_export_status_report", initial)).toBe(false);
    expect(actionStateFacade.isActionActive("dm_spawn_creature", initial)).toBe(false);
  });

  it("marks VT physical anchor toggle active after action", () => {
    const chromeFacade = createWorkspaceChromeFacade();
    const actionStateFacade = createWorkspaceTopbarActionStateFacade();
    const next = chromeFacade.applyToolbarAction(
      chromeFacade.createDefaultToolbarState(),
      "debug_show_vt_physical_anchor"
    );

    expect(actionStateFacade.isActionActive("debug_show_vt_physical_anchor", next)).toBe(true);
  });
});
