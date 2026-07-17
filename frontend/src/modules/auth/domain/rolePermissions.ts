import type { UserRole } from "../contracts";

const rolePermissions: Record<UserRole, string[]> = {
  viewer: ["scene.read", "asset.preview"],
  builder: ["scene.read", "scene.edit", "asset.place", "asset.delete"],
  dm: ["scene.read", "dm.spawn_creature", "dm.spawn_vfx"],
  admin: [
    "scene.read",
    "scene.edit",
    "asset.place",
    "asset.delete",
    "admin.config.write",
    "admin.user.manage"
  ]
};

export function resolveRolePermissions(role: UserRole): string[] {
  const permissions = rolePermissions[role] ?? [];
  return [...permissions];
}
