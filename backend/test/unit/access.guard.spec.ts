import type { ExecutionContext } from "@nestjs/common";
import type { Reflector } from "@nestjs/core";
import { AppException } from "../../src/common/http/app-exception";
import { AuthApplicationService } from "../../src/modules/auth/application/auth.application.service";
import type { Permission } from "../../src/modules/auth/domain/auth.policy";
import type { RequestAuthContext, UserRole } from "../../src/modules/auth/domain/auth.types";
import { AccessGuard } from "../../src/modules/auth/adapters/inbound/http/access.guard";
import { IS_PUBLIC_KEY } from "../../src/modules/auth/adapters/inbound/http/public.decorator";
import { PERMISSIONS_KEY } from "../../src/modules/auth/adapters/inbound/http/permissions.decorator";
import { ROLES_KEY } from "../../src/modules/auth/adapters/inbound/http/roles.decorator";

describe("AccessGuard", () => {
  let reflector: Reflector;
  let authService: jest.Mocked<AuthApplicationService>;
  let guard: AccessGuard;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn()
    } as unknown as Reflector;

    authService = {
      resolveSession: jest.fn()
    } as unknown as jest.Mocked<AuthApplicationService>;

    guard = new AccessGuard(reflector, authService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("allows public route without auth resolution", async () => {
    setupReflector(reflector, {
      [IS_PUBLIC_KEY]: true
    });
    const { context } = createContext();

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(authService.resolveSession).not.toHaveBeenCalled();
  });

  it("rejects request when bearer token is missing", async () => {
    setupReflector(reflector, {
      [IS_PUBLIC_KEY]: false
    });
    const { context } = createContext();

    await expectException(guard.canActivate(context), {
      status: 401,
      code: "UNAUTHORIZED",
      message: "Missing or invalid bearer token."
    });
  });

  it("rejects request when authorization scheme is not Bearer", async () => {
    setupReflector(reflector, {
      [IS_PUBLIC_KEY]: false
    });
    const { context } = createContext("Basic abc");

    await expectException(guard.canActivate(context), {
      status: 401,
      code: "UNAUTHORIZED",
      message: "Missing or invalid bearer token."
    });
  });

  it("rejects request when route has no explicit roles", async () => {
    setupReflector(reflector, {
      [IS_PUBLIC_KEY]: false
    });
    authService.resolveSession.mockResolvedValue(buildAuth("viewer", ["scene.read"]));
    const { context } = createContext("Bearer abc");

    await expectException(guard.canActivate(context), {
      status: 403,
      code: "FORBIDDEN_ROLE",
      message: "Access denied by default policy."
    });
  });

  it("rejects request when role is not allowed", async () => {
    setupReflector(reflector, {
      [IS_PUBLIC_KEY]: false,
      [ROLES_KEY]: ["admin"]
    });
    authService.resolveSession.mockResolvedValue(buildAuth("viewer", ["scene.read"]));
    const { context } = createContext("Bearer abc");

    await expectException(guard.canActivate(context), {
      status: 403,
      code: "FORBIDDEN_ROLE",
      message: "Role is not allowed to access this resource."
    });
  });

  it("rejects request when required permission is missing", async () => {
    setupReflector(reflector, {
      [IS_PUBLIC_KEY]: false,
      [ROLES_KEY]: ["builder", "dm"],
      [PERMISSIONS_KEY]: ["dm.spawn_creature"]
    });
    authService.resolveSession.mockResolvedValue(
      buildAuth("builder", ["scene.read", "scene.edit"])
    );
    const { context } = createContext("Bearer abc");

    await expectException(guard.canActivate(context), {
      status: 403,
      code: "FORBIDDEN_PERMISSION",
      message: "User does not have required permissions for this action."
    });
  });

  it("allows request when role and permission checks pass", async () => {
    setupReflector(reflector, {
      [IS_PUBLIC_KEY]: false,
      [ROLES_KEY]: ["builder", "dm"],
      [PERMISSIONS_KEY]: ["dm.spawn_creature"]
    });
    const authContext = buildAuth("dm", ["scene.read", "dm.spawn_creature"]);
    authService.resolveSession.mockResolvedValue(authContext);
    const { context, request } = createContext("Bearer abc");

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.auth).toEqual(authContext);
  });

  it("trims bearer token before resolving session", async () => {
    setupReflector(reflector, {
      [IS_PUBLIC_KEY]: false,
      [ROLES_KEY]: ["viewer"]
    });
    authService.resolveSession.mockImplementation(async (token) => {
      if (token === "token-ok") {
        return buildAuth("viewer", ["scene.read"]);
      }
      return null;
    });

    const { context } = createContext("Bearer token-ok   ");
    await expect(guard.canActivate(context)).resolves.toBe(true);
  });
});

function setupReflector(
  reflector: Reflector,
  values: Record<string, unknown>
): void {
  (reflector.getAllAndOverride as jest.Mock).mockImplementation((key: string) => {
    return values[key];
  });
}

function createContext(authorization?: string): {
  context: ExecutionContext;
  request: { headers: { authorization?: string }; auth?: RequestAuthContext };
} {
  const request: { headers: { authorization?: string }; auth?: RequestAuthContext } = {
    headers: {}
  };
  if (authorization) {
    request.headers.authorization = authorization;
  }

  const context = {
    getHandler: () => function handler() {},
    getClass: () => class ControllerClass {},
    switchToHttp: () => ({
      getRequest: () => request
    })
  } as unknown as ExecutionContext;

  return { context, request };
}

function buildAuth(role: UserRole, permissions: Permission[]): RequestAuthContext {
  return {
    sessionToken: "session-token",
    issuedAt: new Date(Date.now() - 1000).toISOString(),
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
    user: {
      id: "u_test",
      username: "test.user",
      displayName: "Test User",
      role
    },
    permissions
  };
}

async function expectException(
  promise: Promise<unknown>,
  expected: { status: number; code: string; message: string }
): Promise<void> {
  expect.assertions(4);
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(AppException);
    const appError = error as AppException;
    expect(appError.getStatus()).toBe(expected.status);
    expect(appError.code).toBe(expected.code);
    expect((appError.getResponse() as { message: string }).message).toBe(
      expected.message
    );
  }
}
