import {
  applyToolbarAction,
  createDefaultToolbarState,
  getRoleToolbarGroups,
  type ToolbarActionKey
} from "../../../../src/modules/layout/roleTopbarPolicy";

describe("roleTopbarPolicy all toolbar actions", () => {
  it("applies every declared action key from all role groups without runtime errors", () => {
    const keys = new Set<ToolbarActionKey>();

    (["viewer", "builder", "dm", "admin"] as const).forEach((role) => {
      getRoleToolbarGroups(role).forEach((group) => {
        group.actions.forEach((action) => keys.add(action.key));
      });
    });

    let state = createDefaultToolbarState();
    keys.forEach((key) => {
      state = applyToolbarAction(state, key);
      expect(state.lastCommand).toBe(key);
    });
  });

  it("switches selection scope modes in deterministic order", () => {
    let state = createDefaultToolbarState();

    state = applyToolbarAction(state, "scope_all");
    expect(state.selectionMode).toBe("object");
    expect(state.selectionScope).toBe("all");

    state = applyToolbarAction(state, "scope_creatures");
    expect(state.selectionScope).toBe("creatures");

    state = applyToolbarAction(state, "scope_doors");
    expect(state.selectionScope).toBe("doors");

    state = applyToolbarAction(state, "scope_items");
    expect(state.selectionScope).toBe("items");

    state = applyToolbarAction(state, "scope_placeables");
    expect(state.selectionScope).toBe("placeables");

    state = applyToolbarAction(state, "scope_sounds");
    expect(state.selectionScope).toBe("sounds");
  });

  it("switches status map and texture compression through all variants", () => {
    let state = createDefaultToolbarState();

    state = applyToolbarAction(state, "debug_status_map_placeables");
    expect(state.canvasDebug.statusMap).toBe("placeables");
    state = applyToolbarAction(state, "debug_status_map_doors");
    expect(state.canvasDebug.statusMap).toBe("doors");
    state = applyToolbarAction(state, "debug_status_map_creatures");
    expect(state.canvasDebug.statusMap).toBe("creatures");
    state = applyToolbarAction(state, "debug_status_map_items");
    expect(state.canvasDebug.statusMap).toBe("items");
    state = applyToolbarAction(state, "debug_status_map_sounds");
    expect(state.canvasDebug.statusMap).toBe("sounds");
    state = applyToolbarAction(state, "debug_status_map_all");
    expect(state.canvasDebug.statusMap).toBe("all");
    state = applyToolbarAction(state, "debug_status_map_off");
    expect(state.canvasDebug.statusMap).toBe("off");

    state = applyToolbarAction(state, "debug_texture_compression_none");
    expect(state.canvasDebug.textureCompression).toBe("none");
    state = applyToolbarAction(state, "debug_texture_compression_etc1s");
    expect(state.canvasDebug.textureCompression).toBe("etc1s");
    state = applyToolbarAction(state, "debug_texture_compression_uastc");
    expect(state.canvasDebug.textureCompression).toBe("uastc");
  });
});

