import type {
  AuthCredentials,
  AuthenticateResponse,
  AuthSession,
  AuthorizationResponse,
  IAuthFacade,
  UserRole
} from "./contracts";
import { recordAuthBenchmark } from "./authBenchmarks";
import { trackTelemetry } from "../telemetry/telemetryStore";

interface MockUserRecord {
  id: string;
  username: string;
  password: string;
  displayName: string;
  role: UserRole;
}

const rolePermissions: Record<UserRole, string[]> = {
  viewer: ["scene.read", "asset.preview"],
  builder: ["scene.read", "scene.edit", "asset.place", "asset.delete"],
  dm: ["scene.read", "dm.spawn_creature", "dm.spawn_vfx"],
  admin: [
    "scene.read",
    "scene.edit",
    "asset.place",
    "asset.delete",
    "admin.config.write",
    "admin.user.manage"
  ]
};

const mockUsers: MockUserRecord[] = [
  {
    id: "u_viewer_001",
    username: "viewer.user",
    password: "viewer123",
    displayName: "Viewer User",
    role: "viewer"
  },
  {
    id: "u_builder_001",
    username: "builder.user",
    password: "builder123",
    displayName: "Builder User",
    role: "builder"
  },
  {
    id: "u_dm_001",
    username: "dm.user",
    password: "dm123",
    displayName: "DM User",
    role: "dm"
  },
  {
    id: "u_admin_001",
    username: "admin.user",
    password: "admin123",
    displayName: "Admin User",
    role: "admin"
  }
];

function nowMs(): number {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }
  return Date.now();
}

function buildSession(user: MockUserRecord): AuthSession {
  const issuedAt = new Date();
  const expiresAt = new Date(issuedAt.getTime() + 1000 * 60 * 60);

  return {
    accessToken: `mock-token-${user.id}-${issuedAt.getTime()}`,
    issuedAt: issuedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    user: {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role
    }
  };
}

class MockAuthFacade implements IAuthFacade {
  async authenticate(credentials: AuthCredentials): Promise<AuthenticateResponse> {
    const startedAt = nowMs();
    trackTelemetry("auth.authenticate.requested", {
      username: credentials.username
    });

    const user = mockUsers.find(
      (entry) =>
        entry.username === credentials.username &&
        entry.password === credentials.password
    );

    if (!user) {
      const durationMs = nowMs() - startedAt;
      recordAuthBenchmark({
        operation: "authenticate",
        durationMs,
        success: false,
        timestamp: new Date().toISOString()
      });
      trackTelemetry("auth.authenticate.rejected", {
        username: credentials.username,
        durationMs
      });

      return {
        ok: false,
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Invalid username or password."
        }
      };
    }

    const session = buildSession(user);
    const durationMs = nowMs() - startedAt;

    recordAuthBenchmark({
      operation: "authenticate",
      durationMs,
      success: true,
      timestamp: new Date().toISOString()
    });
    trackTelemetry("auth.authenticate.accepted", {
      userId: user.id,
      role: user.role,
      durationMs
    });

    return { ok: true, session };
  }

  async authorize(session: AuthSession): Promise<AuthorizationResponse> {
    const startedAt = nowMs();
    const permissions = rolePermissions[session.user.role] ?? [];
    const durationMs = nowMs() - startedAt;

    recordAuthBenchmark({
      operation: "authorize",
      durationMs,
      success: true,
      timestamp: new Date().toISOString()
    });
    trackTelemetry("auth.authorize.completed", {
      userId: session.user.id,
      role: session.user.role,
      permissionCount: permissions.length,
      durationMs
    });

    return {
      role: session.user.role,
      permissions
    };
  }

  async signOut(session: AuthSession): Promise<void> {
    trackTelemetry("auth.signout.completed", {
      userId: session.user.id,
      role: session.user.role
    });
  }
}

export const mockAuthFacade: IAuthFacade = new MockAuthFacade();
