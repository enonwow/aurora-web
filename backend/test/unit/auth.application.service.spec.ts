import * as bcrypt from "bcryptjs";
import { AppConfigService } from "../../src/common/config/app-config.service";
import { AppException } from "../../src/common/http/app-exception";
import { AuthApplicationService } from "../../src/modules/auth/application/auth.application.service";
import type { AuthRepositoryPort } from "../../src/modules/auth/application/ports/auth-repository.port";
import type {
  SessionRecord,
  SessionWithUser,
  UserRecord
} from "../../src/modules/auth/domain/auth.types";

describe("AuthApplicationService", () => {
  let repository: jest.Mocked<AuthRepositoryPort>;
  let service: AuthApplicationService;

  beforeEach(() => {
    repository = {
      upsertUser: jest.fn(),
      findUserByUsername: jest.fn(),
      createSession: jest.fn(),
      findSessionWithUserByToken: jest.fn(),
      deleteSession: jest.fn()
    };

    process.env.NODE_ENV = "test";
    process.env.SESSION_TTL_SECONDS = "3600";
    process.env.AUTH_REPOSITORY_DRIVER = "memory";

    const config = new AppConfigService();
    service = new AuthApplicationService(repository, config);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("rejects invalid credentials when user is missing", async () => {
    repository.findUserByUsername.mockResolvedValue(null);

    await expectInvalidCredentials(
      service.authenticate("missing.user", "secret"),
      "Invalid username or password."
    );
    expect(repository.createSession).not.toHaveBeenCalled();
  });

  it("rejects invalid credentials when password check fails", async () => {
    const user = await buildUser("builder.user", "builder", "builder123");
    repository.findUserByUsername.mockResolvedValue(user);

    await expectInvalidCredentials(
      service.authenticate("builder.user", "wrong"),
      "Invalid username or password."
    );
    expect(repository.createSession).not.toHaveBeenCalled();
  });

  it("creates session and returns contract payload after successful authentication", async () => {
    const user = await buildUser("dm.user", "dm", "dm123");
    repository.findUserByUsername.mockResolvedValue(user);

    const result = await service.authenticate("dm.user", "dm123");

    expect(result.user.userId).toBe(user.id);
    expect(result.user.roles).toEqual(["dm"]);
    expect(result.session.accessToken).toEqual(expect.any(String));
    expect(result.session.accessToken).toMatch(/^[a-f0-9]{32}$/u);
    expect(result.session.issuedAt).toEqual(expect.any(String));
    expect(result.session.expiresAt).toEqual(expect.any(String));
    expect(repository.createSession).toHaveBeenCalledTimes(1);
  });

  it("returns null and deletes expired session", async () => {
    const sessionWithUser: SessionWithUser = {
      session: {
        token: "expired-token",
        userId: "u_viewer_001",
        issuedAt: new Date(Date.now() - 10_000),
        expiresAt: new Date(Date.now() - 1000)
      },
      user: await buildUser("viewer.user", "viewer", "viewer123")
    };
    repository.findSessionWithUserByToken.mockResolvedValue(sessionWithUser);

    const result = await service.resolveSession("expired-token");

    expect(result).toBeNull();
    expect(repository.deleteSession).toHaveBeenCalledWith("expired-token");
  });

  it("treats session expiring exactly now as expired", async () => {
    const now = 1_700_000_000_000;
    jest.spyOn(Date, "now").mockReturnValue(now);

    const user = await buildUser("viewer.user", "viewer", "viewer123");
    const sessionWithUser: SessionWithUser = {
      session: {
        token: "exact-boundary-token",
        userId: user.id,
        issuedAt: new Date(now - 10_000),
        expiresAt: new Date(now)
      },
      user
    };
    repository.findSessionWithUserByToken.mockResolvedValue(sessionWithUser);

    const result = await service.resolveSession("exact-boundary-token");

    expect(result).toBeNull();
    expect(repository.deleteSession).toHaveBeenCalledWith("exact-boundary-token");
  });

  it("returns auth context with role permissions for active session", async () => {
    const user = await buildUser("builder.user", "builder", "builder123");
    const sessionWithUser: SessionWithUser = {
      session: {
        token: "active-token",
        userId: user.id,
        issuedAt: new Date(Date.now() - 1000),
        expiresAt: new Date(Date.now() + 60_000)
      },
      user
    };
    repository.findSessionWithUserByToken.mockResolvedValue(sessionWithUser);

    const result = await service.resolveSession("active-token");

    expect(result).not.toBeNull();
    expect(result!.user.role).toBe("builder");
    expect(result!.permissions).toContain("scene.edit");
    expect(result!.permissions).not.toContain("dm.spawn_creature");
  });

  it("falls back to empty permission list when role mapping is missing", async () => {
    const user = await buildUser("custom.user", "viewer", "viewer123");
    const sessionWithUser: SessionWithUser = {
      session: {
        token: "custom-role-token",
        userId: user.id,
        issuedAt: new Date(Date.now() - 1000),
        expiresAt: new Date(Date.now() + 60_000)
      },
      user: {
        ...user,
        role: "custom_role" as unknown as UserRecord["role"]
      }
    };
    repository.findSessionWithUserByToken.mockResolvedValue(sessionWithUser);

    const result = await service.resolveSession("custom-role-token");

    expect(result).not.toBeNull();
    expect(result!.permissions).toEqual([]);
  });

  it("delegates logout to repository", async () => {
    await service.logout("token-123");
    expect(repository.deleteSession).toHaveBeenCalledWith("token-123");
  });

  it("seeds default users on module init", async () => {
    repository.findUserByUsername.mockResolvedValue(null);
    repository.upsertUser.mockImplementation(async (user: UserRecord) => user);

    await service.onModuleInit();

    expect(repository.findUserByUsername).toHaveBeenCalledTimes(4);
    expect(repository.upsertUser).toHaveBeenCalledTimes(4);
    expect(repository.findUserByUsername.mock.calls.map(([username]) => username)).toEqual([
      "viewer.user",
      "builder.user",
      "dm.user",
      "admin.user"
    ]);

    const seededUsers = repository.upsertUser.mock.calls.map(([user]) => user);
    expect(seededUsers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "u_viewer_001",
          username: "viewer.user",
          displayName: "Viewer User"
        }),
        expect.objectContaining({
          id: "u_builder_001",
          username: "builder.user",
          displayName: "Builder User"
        }),
        expect.objectContaining({
          id: "u_dm_001",
          username: "dm.user",
          displayName: "DM User"
        }),
        expect.objectContaining({
          id: "u_admin_001",
          username: "admin.user",
          displayName: "Admin User"
        })
      ])
    );
  });

  it("does not reseed user that already exists", async () => {
    const existingViewer = await buildUser("viewer.user", "viewer", "viewer123");
    repository.findUserByUsername.mockImplementation(async (username) => {
      if (username === "viewer.user") {
        return existingViewer;
      }
      return null;
    });
    repository.upsertUser.mockImplementation(async (user: UserRecord) => user);

    await service.onModuleInit();

    expect(repository.upsertUser).toHaveBeenCalledTimes(3);
    const upsertedUsernames = repository.upsertUser.mock.calls.map(([user]) => user.username);
    expect(upsertedUsernames).toEqual(["builder.user", "dm.user", "admin.user"]);
  });
});

async function expectInvalidCredentials(
  promise: Promise<unknown>,
  expectedMessage: string
): Promise<void> {
  try {
    await promise;
    throw new Error("Expected INVALID_CREDENTIALS exception.");
  } catch (error) {
    if (error instanceof Error && error.message === "Expected INVALID_CREDENTIALS exception.") {
      throw error;
    }
    expect(error).toBeInstanceOf(AppException);
    const appError = error as AppException;
    expect(appError.code).toBe("INVALID_CREDENTIALS");
    expect(appError.getStatus()).toBe(401);
    expect((appError.getResponse() as { message: string }).message).toBe(expectedMessage);
  }
}

async function buildUser(
  username: string,
  role: UserRecord["role"],
  password: string
): Promise<UserRecord> {
  return {
    id: `u_${role}_test`,
    username,
    passwordHash: await bcrypt.hash(password, 4),
    displayName: `${role} test`,
    role,
    createdAt: new Date()
  };
}
