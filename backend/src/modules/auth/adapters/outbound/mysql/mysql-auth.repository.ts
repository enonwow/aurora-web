import { Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { DatabaseService } from "../../../../../database/database.service";
import { sessionsTable, usersTable } from "../../../../../database/schema";
import type { AuthRepositoryPort } from "../../../application/ports/auth-repository.port";
import type {
  SessionRecord,
  SessionWithUser,
  UserRecord
} from "../../../domain/auth.types";

@Injectable()
export class MySqlAuthRepository implements AuthRepositoryPort {
  constructor(private readonly databaseService: DatabaseService) {}

  async upsertUser(user: UserRecord): Promise<UserRecord> {
    const existing = await this.findUserByUsername(user.username);
    if (existing) {
      return existing;
    }

    await this.databaseService.db.insert(usersTable).values({
      id: user.id,
      username: user.username,
      passwordHash: user.passwordHash,
      displayName: user.displayName,
      role: user.role,
      createdAt: user.createdAt
    });

    return user;
  }

  async findUserByUsername(username: string): Promise<UserRecord | null> {
    const rows = await this.databaseService.db
      .select()
      .from(usersTable)
      .where(eq(usersTable.username, username))
      .limit(1);

    if (!rows[0]) {
      return null;
    }

    return {
      id: rows[0].id,
      username: rows[0].username,
      passwordHash: rows[0].passwordHash,
      displayName: rows[0].displayName,
      role: rows[0].role as UserRecord["role"],
      createdAt: rows[0].createdAt
    };
  }

  async createSession(session: SessionRecord): Promise<void> {
    await this.databaseService.db.insert(sessionsTable).values({
      token: session.token,
      userId: session.userId,
      issuedAt: session.issuedAt,
      expiresAt: session.expiresAt
    });
  }

  async findSessionWithUserByToken(token: string): Promise<SessionWithUser | null> {
    const rows = await this.databaseService.db
      .select({
        token: sessionsTable.token,
        userId: sessionsTable.userId,
        issuedAt: sessionsTable.issuedAt,
        expiresAt: sessionsTable.expiresAt,
        id: usersTable.id,
        username: usersTable.username,
        passwordHash: usersTable.passwordHash,
        displayName: usersTable.displayName,
        role: usersTable.role,
        createdAt: usersTable.createdAt
      })
      .from(sessionsTable)
      .innerJoin(usersTable, eq(sessionsTable.userId, usersTable.id))
      .where(eq(sessionsTable.token, token))
      .limit(1);

    if (!rows[0]) {
      return null;
    }

    return {
      session: {
        token: rows[0].token,
        userId: rows[0].userId,
        issuedAt: rows[0].issuedAt,
        expiresAt: rows[0].expiresAt
      },
      user: {
        id: rows[0].id,
        username: rows[0].username,
        passwordHash: rows[0].passwordHash,
        displayName: rows[0].displayName,
        role: rows[0].role as UserRecord["role"],
        createdAt: rows[0].createdAt
      }
    };
  }

  async deleteSession(token: string): Promise<void> {
    await this.databaseService.db.delete(sessionsTable).where(eq(sessionsTable.token, token));
  }
}
