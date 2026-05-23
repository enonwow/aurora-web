import type {
  AuthenticateResponse,
  AuthorizationResponse,
  AuthCredentials,
  AuthSession,
  IAuthFacade
} from "../contracts";
import { resolveRolePermissions } from "../domain/rolePermissions";
import type { AuthBenchmarkPort } from "../ports/authBenchmarkPort";
import type { AuthClockPort } from "../ports/authClockPort";
import type { AuthIdentityPort } from "../ports/authIdentityPort";
import type { AuthSessionFactoryPort } from "../ports/authSessionFactoryPort";
import type { AuthTelemetryPort } from "../ports/authTelemetryPort";

interface AuthFacadeDependencies {
  benchmarkPort: AuthBenchmarkPort;
  clockPort: AuthClockPort;
  identityPort: AuthIdentityPort;
  sessionFactoryPort: AuthSessionFactoryPort;
  telemetryPort: AuthTelemetryPort;
}

function recordAuthenticationFailure(
  dependencies: AuthFacadeDependencies,
  credentials: AuthCredentials,
  durationMs: number
): AuthenticateResponse {
  dependencies.benchmarkPort.record({
    operation: "authenticate",
    durationMs,
    success: false,
    timestamp: new Date().toISOString()
  });
  dependencies.telemetryPort.track("auth.authenticate.rejected", {
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

function recordAuthenticationSuccess(
  dependencies: AuthFacadeDependencies,
  session: AuthSession,
  durationMs: number
): AuthenticateResponse {
  dependencies.benchmarkPort.record({
    operation: "authenticate",
    durationMs,
    success: true,
    timestamp: new Date().toISOString()
  });
  dependencies.telemetryPort.track("auth.authenticate.accepted", {
    userId: session.user.id,
    role: session.user.role,
    durationMs
  });
  return { ok: true, session };
}

export function createAuthFacade(
  dependencies: AuthFacadeDependencies
): IAuthFacade {
  return {
    async authenticate(credentials) {
      const startedAt = dependencies.clockPort.nowMs();
      dependencies.telemetryPort.track("auth.authenticate.requested", {
        username: credentials.username
      });

      const identity = dependencies.identityPort.findByCredentials(credentials);
      const durationMs = dependencies.clockPort.nowMs() - startedAt;

      if (!identity) {
        return recordAuthenticationFailure(dependencies, credentials, durationMs);
      }

      const session = dependencies.sessionFactoryPort.createSession(identity);
      return recordAuthenticationSuccess(dependencies, session, durationMs);
    },

    async authorize(session) {
      const startedAt = dependencies.clockPort.nowMs();
      const permissions = resolveRolePermissions(session.user.role);
      const durationMs = dependencies.clockPort.nowMs() - startedAt;

      dependencies.benchmarkPort.record({
        operation: "authorize",
        durationMs,
        success: true,
        timestamp: new Date().toISOString()
      });
      dependencies.telemetryPort.track("auth.authorize.completed", {
        userId: session.user.id,
        role: session.user.role,
        permissionCount: permissions.length,
        durationMs
      });

      const authorization: AuthorizationResponse = {
        role: session.user.role,
        permissions
      };
      return authorization;
    },

    async signOut(session) {
      dependencies.telemetryPort.track("auth.signout.completed", {
        userId: session.user.id,
        role: session.user.role
      });
    }
  };
}
