import type { UserRole } from "../auth/contracts";

export type WorkspaceSectionKey = "area" | "assets" | "render" | "dm" | "admin";

export interface WorkspaceSection {
  key: WorkspaceSectionKey;
  label: string;
}

const sectionsByRole: Record<UserRole, WorkspaceSection[]> = {
  viewer: [{ key: "area", label: "Area" }],
  builder: [
    { key: "area", label: "Area" },
    { key: "assets", label: "Assets" },
    { key: "render", label: "Render" }
  ],
  dm: [
    { key: "area", label: "Area" },
    { key: "dm", label: "DM" },
    { key: "render", label: "Render" }
  ],
  admin: [
    { key: "area", label: "Area" },
    { key: "assets", label: "Assets" },
    { key: "render", label: "Render" },
    { key: "admin", label: "Admin" }
  ]
};

export function getRoleTopbarSections(role: UserRole): WorkspaceSection[] {
  return sectionsByRole[role];
}
