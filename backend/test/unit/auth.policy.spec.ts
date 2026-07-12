import {
  ROLE_PERMISSIONS,
  hasRequiredPermissions,
  type Permission
} from "../../src/modules/auth/domain/auth.policy";

describe("auth policy", () => {
  it("maps roles to stable permission sets", () => {
    expect(ROLE_PERMISSIONS.viewer).toContain("scene.read");
    expect(ROLE_PERMISSIONS.builder).toContain("scene.edit");
    expect(ROLE_PERMISSIONS.builder).toContain("processing.placeable.run");
    expect(ROLE_PERMISSIONS.builder).toContain("processing.creature.run");
    expect(ROLE_PERMISSIONS.builder).toContain("processing.encounter.run");
    expect(ROLE_PERMISSIONS.builder).toContain("processing.area.run");
    expect(ROLE_PERMISSIONS.builder).toContain("processing.job.run");
    expect(ROLE_PERMISSIONS.builder).toContain("processing.graph.run");
    expect(ROLE_PERMISSIONS.builder).toContain("processing.vfx.run");
    expect(ROLE_PERMISSIONS.dm).toContain("dm.spawn_creature");
    expect(ROLE_PERMISSIONS.dm).toContain("processing.creature.read");
    expect(ROLE_PERMISSIONS.dm).toContain("processing.encounter.read");
    expect(ROLE_PERMISSIONS.dm).toContain("processing.sound.read");
    expect(ROLE_PERMISSIONS.dm).toContain("processing.vfx.read");
    expect(ROLE_PERMISSIONS.admin).toContain("admin.config.write");
  });

  it("returns true when no permission is required", () => {
    expect(hasRequiredPermissions(["scene.read"], [])).toBe(true);
  });

  it("returns true when all required permissions are granted", () => {
    const granted: Permission[] = ["scene.read", "dm.spawn_creature"];
    expect(hasRequiredPermissions(granted, ["scene.read"])).toBe(true);
    expect(hasRequiredPermissions(granted, ["scene.read", "dm.spawn_creature"])).toBe(
      true
    );
  });

  it("returns false when any required permission is missing", () => {
    const granted: Permission[] = ["scene.read"];
    expect(hasRequiredPermissions(granted, ["dm.spawn_creature"])).toBe(false);
    expect(hasRequiredPermissions(granted, ["scene.read", "dm.spawn_creature"])).toBe(
      false
    );
  });
});
