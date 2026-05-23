import type { AuthSession } from "../contracts";
import type { AuthIdentity } from "./authIdentityPort";

export interface AuthSessionFactoryPort {
  createSession(identity: AuthIdentity): AuthSession;
}
