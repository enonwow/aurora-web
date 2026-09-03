import { Injectable } from "@nestjs/common";
import type { AuthRepositoryPort } from "../../../application/ports/auth-repository.port";
import type {
  SessionRecord,
  SessionWithUser,
  UserRecord
} from "../../../domain/auth.types";

@Injectable()
export class MemoryAuthRepository implements AuthRepositoryPort {
  private readonly usersByUsername = new Map<string, UserRecord>();
  private readonly usersById = new Map<string, UserRecord>();
  private readonly sessionsByToken = new Map<string, SessionRecord>();

  async upsertUser(user: UserRecord): Promise<UserRecord> {
    const existing = this.usersByUsername.get(user.username);
    if (existing) {
      return existing;
    }
    this.usersByUsername.set(user.username, user);
    this.usersById.set(user.id, user);
    return user;
  }

  async findUserByUsername(username: string): Promise<UserRecord | null> {
    return this.usersByUsername.get(username) ?? null;
  }

  async findUserById(id: string): Promise<UserRecord | null> {
    return this.usersById.get(id) ?? null;
  }

  async createSession(session: SessionRecord): Promise<void> {
    this.sessionsByToken.set(session.token, session);
  }

  async findSessionWithUserByToken(token: string): Promise<SessionWithUser | null> {
    const session = this.sessionsByToken.get(token);
    if (!session) {
      return null;
    }
    const user = this.usersById.get(session.userId);
    if (!user) {
      return null;
    }
    return { session, user };
  }

  async deleteSession(token: string): Promise<void> {
    this.sessionsByToken.delete(token);
  }

  async deleteAllSessions(): Promise<number> {
    const deleted = this.sessionsByToken.size;
    this.sessionsByToken.clear();
    return deleted;
  }
}
