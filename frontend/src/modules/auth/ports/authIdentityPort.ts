import type { AuthCredentials, UserRole } from "../contracts";

export interface AuthIdentity {
  id: string;
  username: string;
  displayName: string;
  role: UserRole;
}

export interface AuthIdentityPort {
  findByCredentials(credentials: AuthCredentials): AuthIdentity | null;
}
