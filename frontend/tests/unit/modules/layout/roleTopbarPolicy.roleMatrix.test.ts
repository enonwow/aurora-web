import {
  applyToolbarAction,
  createDefaultToolbarState,
  getRoleKeyboardShortcuts,
  getRoleQuickActions,
  getRoleToolbarGroups
} from "../../../../src/modules/layout/roleTopbarPolicy";

describe("roleTopbarPolicy role matrix and visibility semantics", () => {
  it("returns role-specific quick actions", () => {
    expect(getRoleQuickActions("viewer")).toEqual([]);
    expect(getRoleQuickActions("dm")).toEqual([]);
    expect(getRoleQuickActions("builder").map((entry) => entry.key)).toEqual([
      "undo",
      "redo"
    ]);
    expect(getRoleQuickActions("admin").map((entry) => entry.key)).toEqual([
      "undo",
      "redo"
    ]);
  });

  it("exposes DM command group only for dm role", () => {
    const dmKeys = getRoleToolbarGroups("dm").map((group) => group.key);
    const builderKeys = getRoleToolbarGroups("builder").map((group) => group.key);

    expect(dmKeys).toContain("dm_commands");
    expect(dmKeys).not.toContain("module");
    expect(builderKeys).toContain("module");
    expect(builderKeys).not.toContain("dm_commands");
  });

  it("provides common and role-specific keyboard shortcuts", () => {
    const viewerShortcuts = getRoleKeyboardShortcuts("viewer").map((entry) => entry.key);
    const builderShortcuts = getRoleKeyboardShortcuts("builder").map((entry) => entry.key);

    expect(viewerShortcuts).toEqual(expect.arrayContaining(["?", "Esc"]));
    expect(builderShortcuts).toEqual(
      expect.arrayContaining(["Ctrl/Cmd + Z", "Ctrl/Cmd + S"])
    );
    expect(viewerShortcuts).not.toContain("Ctrl/Cmd + S");
  });

  it("applies show_none by turning off all visibility flags", () => {
    const initial = createDefaultToolbarState();
    const next = applyToolbarAction(initial, "show_none");

    expect(next.visibility.creatures).toBe(false);
    expect(next.visibility.doors).toBe(false);
    expect(next.visibility.encounters).toBe(false);
    expect(next.visibility.items).toBe(false);
    expect(next.visibility.merchants).toBe(false);
    expect(next.visibility.placeables).toBe(false);
    expect(next.visibility.sounds).toBe(false);
    expect(next.visibility.triggers).toBe(false);
    expect(next.visibility.waypoints).toBe(false);
    expect(next.visibility.start_location).toBe(false);
    expect(next.lastCommand).toBe("show_none");
  });

  it("applies show_all by restoring MVP visibility channels", () => {
    const hidden = applyToolbarAction(createDefaultToolbarState(), "show_none");
    const next = applyToolbarAction(hidden, "show_all");

    expect(next.visibility.creatures).toBe(true);
    expect(next.visibility.doors).toBe(true);
    expect(next.visibility.items).toBe(true);
    expect(next.visibility.placeables).toBe(true);
    expect(next.visibility.sounds).toBe(true);

    expect(next.visibility.encounters).toBe(false);
    expect(next.visibility.merchants).toBe(false);
    expect(next.visibility.triggers).toBe(false);
    expect(next.visibility.waypoints).toBe(false);
    expect(next.visibility.start_location).toBe(false);
    expect(next.lastCommand).toBe("show_all");
  });
});

