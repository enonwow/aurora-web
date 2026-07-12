import type { UserRole } from "../contracts";

export interface TestUserRecord {
  id: string;
  username: string;
  password: string;
  displayName: string;
  role: UserRole;
}

export const testUsers: TestUserRecord[] = [
  {
    id: "u_viewer_001",
    username: "viewer.user",
    password: "viewer123",
    displayName: "Viewer User",
    role: "viewer"
  },
  {
    id: "u_builder_001",
    username: "builder.user",
    password: "builder123",
    displayName: "Builder User",
    role: "builder"
  },
  {
    id: "u_dm_001",
    username: "dm.user",
    password: "dm123",
    displayName: "DM User",
    role: "dm"
  },
  {
    id: "u_admin_001",
    username: "admin.user",
    password: "admin123",
    displayName: "Admin User",
    role: "admin"
  }
];
