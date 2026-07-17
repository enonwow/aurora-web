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
  "processing.creature.read",
  "processing.creature.run",
  "processing.item.read",
  "processing.item.run",
  "processing.encounter.read",
  "processing.encounter.run",
  "processing.area.read",
  "processing.area.run",
  "processing.tile.read",
  "processing.tile.run",
  "processing.sound.read",
  "processing.sound.run",
  "processing.vfx.read",
  "processing.vfx.run",
  "processing.job.read",
  "processing.job.run",
  "processing.graph.read",
  "processing.graph.run"
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const PROCESSING_ROLE_PERMISSIONS: Permission[] = [
  "processing.placeable.read",
  "processing.placeable.run",
  "processing.creature.read",
  "processing.creature.run",
  "processing.item.read",
  "processing.item.run",
  "processing.encounter.read",
  "processing.encounter.run",
  "processing.area.read",
  "processing.area.run",
  "processing.tile.read",
  "processing.tile.run",
  "processing.sound.read",
  "processing.sound.run",
  "processing.vfx.read",
  "processing.vfx.run",
  "processing.job.read",
  "processing.job.run",
  "processing.graph.read",
  "processing.graph.run"
];

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  viewer: ["scene.read", "asset.preview"],
  builder: [
    "scene.read",
    "scene.edit",
    "asset.place",
    "asset.delete",
    ...PROCESSING_ROLE_PERMISSIONS
  ],
  dm: [
    "scene.read",
    "dm.spawn_creature",
    "dm.spawn_vfx",
    ...PROCESSING_ROLE_PERMISSIONS
  ],
  admin: [
    "scene.read",
    "scene.edit",
    "asset.place",
    "asset.delete",
    "admin.config.write",
    "admin.user.manage",
    ...PROCESSING_ROLE_PERMISSIONS
  ]
};

export function hasRequiredPermissions(
  granted: Permission[],
  required: Permission[]
): boolean {
  return required.every((permission) => granted.includes(permission));
}
