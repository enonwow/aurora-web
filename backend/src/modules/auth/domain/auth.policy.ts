import type { UserRole } from "./auth.types";

export const PERMISSIONS = [
  "scene.read",
  "asset.preview",
  "scene.edit",
  "asset.place",
  "asset.delete",
  "dm.spawn_creature",
  "dm.spawn_vfx",
  "admin.config.write",
  "admin.user.manage",
  "processing.placeable.read",
  "processing.placeable.run",
  "processing.vfx.read",
  "processing.vfx.run"
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  viewer: ["scene.read", "asset.preview"],
  builder: [
    "scene.read",
    "scene.edit",
    "asset.place",
    "asset.delete",
    "processing.placeable.read",
    "processing.placeable.run",
    "processing.vfx.read",
    "processing.vfx.run"
  ],
  dm: [
    "scene.read",
    "dm.spawn_creature",
    "dm.spawn_vfx",
    "processing.placeable.read",
    "processing.placeable.run",
    "processing.vfx.read",
    "processing.vfx.run"
  ],
  admin: [
    "scene.read",
    "scene.edit",
    "asset.place",
    "asset.delete",
    "admin.config.write",
    "admin.user.manage",
    "processing.placeable.read",
    "processing.placeable.run",
    "processing.vfx.read",
    "processing.vfx.run"
  ]
};

export function hasRequiredPermissions(
  granted: Permission[],
  required: Permission[]
): boolean {
  return required.every((permission) => granted.includes(permission));
}
