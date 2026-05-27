import { Inject, Injectable, OnModuleInit } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import * as bcrypt from "bcryptjs";
import { AppConfigService } from "../../../common/config/app-config.service";
import { AppException } from "../../../common/http/app-exception";
import {
  AUTH_REPOSITORY,
  type AuthRepositoryPort
} from "./ports/auth-repository.port";
import {
  type RequestAuthContext,
  type SessionRecord,
  type UserRecord
} from "../domain/auth.types";
import { ROLE_PERMISSIONS } from "../domain/auth.policy";

interface CreateUserCommand {
  username: string;
  password: string;
  displayName: string;
  role: UserRecord["role"];
}

@Injectable()
export class AuthApplicationService implements OnModuleInit {
  constructor(
    @Inject(AUTH_REPOSITORY)
    private readonly authRepository: AuthRepositoryPort,
    private readonly config: AppConfigService
  ) {}

  async onModuleInit(): Promise<void> {
    await this.seedUsers();
  }

  async authenticate(username: string, password: string) {
    const user = await this.authRepository.findUserByUsername(username);

    if (!user) {
      throw new AppException({
        status: 401,
        code: "INVALID_CREDENTIALS",
        message: "Invalid username or password."
      });
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      throw new AppException({
        status: 401,
        code: "INVALID_CREDENTIALS",
        message: "Invalid username or password."
      });
    }

    const issuedAt = new Date();
    const expiresAt = new Date(
      issuedAt.getTime() + this.config.sessionTtlSeconds * 1000
    );
    const accessToken = randomUUID().replace(/-/g, "");

    const session: SessionRecord = {
      token: accessToken,
      userId: user.id,
      issuedAt,
      expiresAt
    };
    await this.authRepository.createSession(session);

    return {
      session: {
        accessToken,
        issuedAt: issuedAt.toISOString(),
        expiresAt: expiresAt.toISOString()
      },
      user: {
        userId: user.id,
        roles: [user.role],
        displayName: user.displayName
      }
    };
  }

  async createUser(command: CreateUserCommand, createdBy: string) {
    const username = command.username.trim();
    const displayName = command.displayName.trim();

    const existing = await this.authRepository.findUserByUsername(username);
    if (existing) {
      throw new AppException({
        status: 409,
        code: "USER_ALREADY_EXISTS",
        message: "User with this username already exists."
      });
    }

    const user: UserRecord = {
      id: `u_${randomUUID().replace(/-/g, "")}`,
      username,
      passwordHash: await bcrypt.hash(command.password, 10),
      displayName,
      role: command.role,
      createdAt: new Date()
    };

    const stored = await this.authRepository.upsertUser(user);
    if (stored.id !== user.id) {
      throw new AppException({
        status: 409,
        code: "USER_ALREADY_EXISTS",
        message: "User with this username already exists."
      });
    }

    return {
      userId: stored.id,
      username: stored.username,
      displayName: stored.displayName,
      role: stored.role,
      createdAt: stored.createdAt.toISOString(),
      createdBy
    };
  }

  async resolveSession(token: string): Promise<RequestAuthContext | null> {
    const sessionWithUser = await this.authRepository.findSessionWithUserByToken(token);
    if (!sessionWithUser) {
      return null;
    }

    if (sessionWithUser.session.expiresAt.getTime() <= Date.now()) {
      await this.authRepository.deleteSession(token);
      return null;
    }

    const permissions = ROLE_PERMISSIONS[sessionWithUser.user.role] ?? [];
    return {
      sessionToken: sessionWithUser.session.token,
      issuedAt: sessionWithUser.session.issuedAt.toISOString(),
      expiresAt: sessionWithUser.session.expiresAt.toISOString(),
      user: {
        id: sessionWithUser.user.id,
        username: sessionWithUser.user.username,
        displayName: sessionWithUser.user.displayName,
        role: sessionWithUser.user.role
      },
      permissions: [...permissions]
    };
  }

  async logout(sessionToken: string): Promise<void> {
    await this.authRepository.deleteSession(sessionToken);
  }

  private async seedUsers(): Promise<void> {
    const users = [
      {
        id: "u_viewer_001",
        username: "viewer.user",
        password: "viewer123",
        displayName: "Viewer User",
        role: "viewer" as const
      },
      {
        id: "u_builder_001",
        username: "builder.user",
        password: "builder123",
        displayName: "Builder User",
        role: "builder" as const
      },
      {
        id: "u_dm_001",
        username: "dm.user",
        password: "dm123",
        displayName: "DM User",
        role: "dm" as const
      },
      {
        id: "u_admin_001",
        username: "admin.user",
        password: "admin123",
        displayName: "Admin User",
        role: "admin" as const
      }
    ];

    for (const item of users) {
      const existing = await this.authRepository.findUserByUsername(item.username);
      if (existing) {
        continue;
      }

      const passwordHash = await bcrypt.hash(item.password, 10);
      const user: UserRecord = {
        id: item.id,
        username: item.username,
        passwordHash,
        displayName: item.displayName,
        role: item.role,
        createdAt: new Date()
      };
      await this.authRepository.upsertUser(user);
    }
  }
}
