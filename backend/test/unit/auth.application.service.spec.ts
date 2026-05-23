import * as bcrypt from "bcryptjs";
import { AppConfigService } from "../../src/common/config/app-config.service";
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

    await expect(service.authenticate("missing.user", "secret")).rejects.toMatchObject({
      code: "INVALID_CREDENTIALS"
    });
    expect(repository.createSession).not.toHaveBeenCalled();
  });

  it("rejects invalid credentials when password check fails", async () => {
    const user = await buildUser("builder.user", "builder", "builder123");
    repository.findUserByUsername.mockResolvedValue(user);

    await expect(service.authenticate("builder.user", "wrong")).rejects.toMatchObject({
      code: "INVALID_CREDENTIALS"
    });
    expect(repository.createSession).not.toHaveBeenCalled();
  });

  it("creates session and returns contract payload after successful authentication", async () => {
    const user = await buildUser("dm.user", "dm", "dm123");
    repository.findUserByUsername.mockResolvedValue(user);

    const result = await service.authenticate("dm.user", "dm123");

    expect(result.user.userId).toBe(user.id);
    expect(result.user.roles).toEqual(["dm"]);
    expect(result.session.accessToken).toEqual(expect.any(String));
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
  });
});

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
