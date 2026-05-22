import {
  applyToolbarAction,
  createDefaultToolbarState
} from "../../../../src/modules/layout/roleTopbarPolicy";

describe("roleTopbarPolicy canvas tools", () => {
  it("switches gizmo mode across translate/rotate/scale", () => {
    const initial = createDefaultToolbarState();

    const translate = applyToolbarAction(initial, "canvas_gizmo_translate");
    expect(translate.canvasDebug.gizmoMode).toBe("translate");

    const rotate = applyToolbarAction(translate, "canvas_gizmo_rotate");
    expect(rotate.canvasDebug.gizmoMode).toBe("rotate");

    const scale = applyToolbarAction(rotate, "canvas_gizmo_scale");
    expect(scale.canvasDebug.gizmoMode).toBe("scale");
  });

  it("toggles snapping flags", () => {
    const initial = createDefaultToolbarState();
    const next = applyToolbarAction(initial, "snap_grid_toggle");
    expect(next.canvasDebug.snapGrid).toBe(!initial.canvasDebug.snapGrid);

    const angle = applyToolbarAction(next, "snap_angle_toggle");
    expect(angle.canvasDebug.snapAngle).toBe(!next.canvasDebug.snapAngle);

    const height = applyToolbarAction(angle, "snap_height_toggle");
    expect(height.canvasDebug.snapHeight).toBe(!angle.canvasDebug.snapHeight);
  });

  it("toggles layer locks and unlocks all", () => {
    const initial = createDefaultToolbarState();
    const lockPlaceables = applyToolbarAction(initial, "lock_placeables");
    const lockCreatures = applyToolbarAction(lockPlaceables, "lock_creatures");
    expect(lockCreatures.canvasDebug.lockedKinds.placeables).toBe(true);
    expect(lockCreatures.canvasDebug.lockedKinds.creatures).toBe(true);

    const unlocked = applyToolbarAction(lockCreatures, "unlock_all_layers");
    expect(unlocked.canvasDebug.lockedKinds.placeables).toBe(false);
    expect(unlocked.canvasDebug.lockedKinds.creatures).toBe(false);
    expect(unlocked.canvasDebug.lockedKinds.doors).toBe(false);
    expect(unlocked.canvasDebug.lockedKinds.items).toBe(false);
    expect(unlocked.canvasDebug.lockedKinds.sounds).toBe(false);
  });

  it("sets and clears isolate mode", () => {
    const initial = createDefaultToolbarState();
    const isolated = applyToolbarAction(initial, "isolate_doors");
    expect(isolated.canvasDebug.isolateKind).toBe("doors");

    const isolatedAgain = applyToolbarAction(isolated, "isolate_doors");
    expect(isolatedAgain.canvasDebug.isolateKind).toBe("none");

    const cleared = applyToolbarAction(
      applyToolbarAction(initial, "isolate_placeables"),
      "clear_isolation"
    );
    expect(cleared.canvasDebug.isolateKind).toBe("none");
  });

  it("toggles perf and extra overlay switches", () => {
    const initial = createDefaultToolbarState();
    const chunk = applyToolbarAction(initial, "debug_chunks");
    expect(chunk.canvasDebug.chunkBounds).toBe(!initial.canvasDebug.chunkBounds);

    const labels = applyToolbarAction(chunk, "debug_object_labels");
    expect(labels.canvasDebug.objectLabels).toBe(!chunk.canvasDebug.objectLabels);

    const perf = applyToolbarAction(labels, "debug_perf_hud");
    expect(perf.canvasDebug.perfHud).toBe(!labels.canvasDebug.perfHud);

    const walkmesh = applyToolbarAction(perf, "debug_walkmesh_overlay");
    expect(walkmesh.canvasDebug.walkmeshOverlay).toBe(!perf.canvasDebug.walkmeshOverlay);

    const collision = applyToolbarAction(walkmesh, "debug_collision_overlay");
    expect(collision.canvasDebug.collisionOverlay).toBe(
      !walkmesh.canvasDebug.collisionOverlay
    );

    const controlsHint = applyToolbarAction(collision, "debug_controls_hint");
    expect(controlsHint.canvasDebug.controlsHint).toBe(
      !collision.canvasDebug.controlsHint
    );

    const runtimeHud = applyToolbarAction(controlsHint, "debug_runtime_hud");
    expect(runtimeHud.canvasDebug.runtimeHud).toBe(!controlsHint.canvasDebug.runtimeHud);
  });

  it("keeps command semantics for selection and camera bookmark actions", () => {
    const initial = createDefaultToolbarState();
    const same = applyToolbarAction(initial, "select_same_resref");
    expect(same.lastCommand).toBe("select_same_resref");

    const invert = applyToolbarAction(same, "select_invert");
    expect(invert.lastCommand).toBe("select_invert");

    const radius = applyToolbarAction(invert, "select_radius");
    expect(radius.lastCommand).toBe("select_radius");

    const saveBookmark = applyToolbarAction(radius, "camera_bookmark_save_1");
    expect(saveBookmark.lastCommand).toBe("camera_bookmark_save_1");

    const loadBookmark = applyToolbarAction(saveBookmark, "camera_bookmark_load_1");
    expect(loadBookmark.lastCommand).toBe("camera_bookmark_load_1");

    const exportReport = applyToolbarAction(loadBookmark, "debug_export_status_report");
    expect(exportReport.lastCommand).toBe("debug_export_status_report");
  });
});
