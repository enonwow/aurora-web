export type UserRole = "viewer" | "builder" | "dm" | "admin";

export interface AuthCredentials {
  username: string;
  password: string;
}

export interface AuthenticatedUser {
  id: string;
  username: string;
  displayName: string;
  role: UserRole;
}

export interface AuthSession {
  accessToken: string;
  issuedAt: string;
  expiresAt: string;
  user: AuthenticatedUser;
}

export interface AuthFailure {
  code: "INVALID_CREDENTIALS" | "UNAUTHORIZED_ROLE";
  message: string;
}

export type AuthenticateResponse =
  | {
      ok: true;
      session: AuthSession;
    }
  | {
      ok: false;
      error: AuthFailure;
    };

export interface AuthorizationResponse {
  role: UserRole;
  permissions: string[];
}

export interface IAuthFacade {
  authenticate(credentials: AuthCredentials): Promise<AuthenticateResponse>;
  authorize(session: AuthSession): Promise<AuthorizationResponse>;
  signOut(session: AuthSession): Promise<void>;
}
