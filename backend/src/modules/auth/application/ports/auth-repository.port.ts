import type {
  SessionRecord,
  SessionWithUser,
  UserRecord
} from "../../domain/auth.types";

export const AUTH_REPOSITORY = Symbol("AUTH_REPOSITORY");

export interface AuthRepositoryPort {
  upsertUser(user: UserRecord): Promise<UserRecord>;
  findUserByUsername(username: string): Promise<UserRecord | null>;
  findUserById(id: string): Promise<UserRecord | null>;
  createSession(session: SessionRecord): Promise<void>;
  findSessionWithUserByToken(token: string): Promise<SessionWithUser | null>;
  deleteSession(token: string): Promise<void>;
  deleteAllSessions(): Promise<number>;
}
