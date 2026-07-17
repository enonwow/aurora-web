import type { Permission } from "./auth.policy";

export type UserRole = "viewer" | "builder" | "dm" | "admin";

export interface UserRecord {
  id: string;
  username: string;
  passwordHash: string;
  displayName: string;
  role: UserRole;
  createdAt: Date;
}

export interface SessionRecord {
  token: string;
  userId: string;
  issuedAt: Date;
  expiresAt: Date;
}

export interface SessionWithUser {
  session: SessionRecord;
  user: UserRecord;
}

export interface RequestAuthContext {
  sessionToken: string;
  issuedAt: string;
  expiresAt: string;
  user: {
    id: string;
    username: string;
    displayName: string;
    role: UserRole;
  };
  permissions: Permission[];
}

export const ALL_ROLES: UserRole[] = ["viewer", "builder", "dm", "admin"];
