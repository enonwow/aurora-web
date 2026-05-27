import { z } from "zod";
import type {
  AuthenticateResponse,
  AuthorizationResponse,
  AuthCredentials,
  AuthSession,
  IAuthFacade,
  UserRole
} from "../contracts";
import { createAuthBenchmarkRecorderPort } from "./authBenchmarkRecorderPort";
import { createAuthTelemetryFacadePort } from "./authTelemetryFacadePort";
import { resolveRolePermissions } from "../domain/rolePermissions";
import type { TelemetryFacade } from "../../telemetry/application/telemetryFacade";

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

interface HttpBackendAuthFacadeOptions {
  fetchFn?: FetchLike;
  baseUrl?: string;
  telemetryFacade: TelemetryFacade;
  nowMs?: () => number;
}

export interface BackendHealthProbeResult {
  available: boolean;
  service: string | null;
}

class BackendAuthRequestError extends Error {
  readonly status: number;
  readonly code: string | null;

  constructor(message: string, status: number, code: string | null) {
    super(message);
    this.name = "BackendAuthRequestError";
    this.status = status;
    this.code = code;
  }
}

const roleSchema = z.enum(["viewer", "builder", "dm", "admin"]);

const loginEnvelopeSchema = z.object({
  data: z.object({
    session: z.object({
      accessToken: z.string().min(1),
      issuedAt: z.string().min(1),
      expiresAt: z.string().min(1)
    }),
    user: z.object({
      userId: z.string().min(1),
      roles: z.array(roleSchema).min(1),
      displayName: z.string().min(1)
    })
  })
});

const meEnvelopeSchema = z.object({
  data: z.object({
    userId: z.string().min(1),
    roles: z.array(roleSchema).min(1),
    displayName: z.string().min(1),
    permissions: z.array(z.string())
  })
});

const healthSchema = z.object({
  status: z.string().min(1),
  service: z.string().optional()
});

function resolveBaseUrl(): string {
  const candidate = import.meta.env.VITE_BACKEND_API_BASE_URL as string | undefined;
  if (!candidate || candidate.trim().length === 0) {
    return "http://localhost:3000/api/v1";
  }
  return candidate.replace(/\/+$/u, "");
}

async function parseResponseOrThrow(response: Response): Promise<unknown> {
  const payload = await response.json().catch(() => null);
  if (response.ok) {
    return payload;
  }

  const code =
    typeof payload === "object" &&
    payload !== null &&
    "error" in payload &&
    typeof payload.error === "object" &&
    payload.error !== null &&
    "code" in payload.error &&
    typeof payload.error.code === "string"
      ? payload.error.code
      : null;

  const message =
    typeof payload === "object" &&
    payload !== null &&
    "error" in payload &&
    typeof payload.error === "object" &&
    payload.error !== null &&
    "message" in payload.error &&
    typeof payload.error.message === "string"
      ? payload.error.message
      : `Backend request failed with status ${response.status}.`;

  throw new BackendAuthRequestError(message, response.status, code);
}

function mapFailure(): AuthenticateResponse {
  return {
    ok: false,
    error: {
      code: "INVALID_CREDENTIALS",
      message: "Login failed."
    }
  };
}

export async function probeBackendHealth(
  fetchFn: FetchLike = fetch.bind(globalThis),
  baseUrl = resolveBaseUrl()
): Promise<BackendHealthProbeResult> {
  try {
    const response = await fetchFn(`${baseUrl}/health`, { method: "GET" });
    const payload = await parseResponseOrThrow(response);
    const parsed = healthSchema.parse(payload);
    return {
      available: parsed.status.toLowerCase() === "ok",
      service: parsed.service ?? null
    };
  } catch {
    return {
      available: false,
      service: null
    };
  }
}

class HttpBackendAuthFacade implements IAuthFacade {
  private readonly fetchFn: FetchLike;
  private readonly baseUrl: string;
  private readonly nowMs: () => number;
  private readonly benchmarkPort = createAuthBenchmarkRecorderPort();
  private readonly telemetryPort;
  private readonly authorizationByToken = new Map<string, AuthorizationResponse>();

  constructor(options: HttpBackendAuthFacadeOptions) {
    this.fetchFn = options.fetchFn ?? fetch.bind(globalThis);
    this.baseUrl = (options.baseUrl ?? resolveBaseUrl()).replace(/\/+$/u, "");
    this.nowMs = options.nowMs ?? (() => Date.now());
    this.telemetryPort = createAuthTelemetryFacadePort(options.telemetryFacade);
  }

  async authenticate(credentials: AuthCredentials): Promise<AuthenticateResponse> {
    const startedAt = this.nowMs();
    this.telemetryPort.track("auth.authenticate.requested", {
      username: credentials.username
    });

    try {
      const loginResponse = await this.fetchFn(`${this.baseUrl}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          username: credentials.username,
          password: credentials.password
        })
      });
      const loginPayload = await parseResponseOrThrow(loginResponse);
      const loginParsed = loginEnvelopeSchema.parse(loginPayload);

      const me = await this.fetchMe(loginParsed.data.session.accessToken);
      const role = this.resolveRole(me.roles);
      if (!role) {
        this.recordFailure(credentials, startedAt, "UNAUTHORIZED_ROLE");
        return {
          ok: false,
          error: {
            code: "UNAUTHORIZED_ROLE",
            message: "Login failed."
          }
        };
      }

      const authorization: AuthorizationResponse = {
        role,
        permissions: [...me.permissions]
      };
      this.authorizationByToken.set(loginParsed.data.session.accessToken, authorization);

      const session: AuthSession = {
        accessToken: loginParsed.data.session.accessToken,
        issuedAt: loginParsed.data.session.issuedAt,
        expiresAt: loginParsed.data.session.expiresAt,
        user: {
          id: me.userId,
          username: credentials.username,
          displayName: me.displayName,
          role
        }
      };

      const durationMs = this.nowMs() - startedAt;
      this.benchmarkPort.record({
        operation: "authenticate",
        durationMs,
        success: true,
        timestamp: new Date().toISOString()
      });
      this.telemetryPort.track("auth.authenticate.accepted", {
        userId: session.user.id,
        role: session.user.role,
        durationMs
      });

      return { ok: true, session };
    } catch (error) {
      const errorCode =
        error instanceof BackendAuthRequestError && error.code === "UNAUTHORIZED_ROLE"
          ? "UNAUTHORIZED_ROLE"
          : "INVALID_CREDENTIALS";
      this.recordFailure(credentials, startedAt, errorCode);
      return mapFailure();
    }
  }

  async authorize(session: AuthSession): Promise<AuthorizationResponse> {
    const startedAt = this.nowMs();
    const cached = this.authorizationByToken.get(session.accessToken);
    if (cached) {
      this.recordAuthorizeSuccess(session.user.id, cached.role, cached.permissions.length, startedAt);
      return cached;
    }

    try {
      const me = await this.fetchMe(session.accessToken);
      const role = this.resolveRole(me.roles) ?? session.user.role;
      const permissions = [...me.permissions];
      const authorization: AuthorizationResponse = { role, permissions };
      this.authorizationByToken.set(session.accessToken, authorization);
      this.recordAuthorizeSuccess(session.user.id, role, permissions.length, startedAt);
      return authorization;
    } catch {
      const fallbackPermissions = resolveRolePermissions(session.user.role);
      const fallback: AuthorizationResponse = {
        role: session.user.role,
        permissions: fallbackPermissions
      };
      this.authorizationByToken.set(session.accessToken, fallback);
      this.recordAuthorizeSuccess(
        session.user.id,
        fallback.role,
        fallback.permissions.length,
        startedAt
      );
      return fallback;
    }
  }

  async signOut(session: AuthSession): Promise<void> {
    this.authorizationByToken.delete(session.accessToken);
    try {
      await this.fetchFn(`${this.baseUrl}/auth/logout`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.accessToken}`
        }
      });
    } catch {
      // Ignore network/logout errors on client sign out.
    }
    this.telemetryPort.track("auth.signout.completed", {
      userId: session.user.id,
      role: session.user.role
    });
  }

  private async fetchMe(accessToken: string): Promise<z.infer<typeof meEnvelopeSchema>["data"]> {
    const meResponse = await this.fetchFn(`${this.baseUrl}/auth/me`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });
    const mePayload = await parseResponseOrThrow(meResponse);
    return meEnvelopeSchema.parse(mePayload).data;
  }

  private resolveRole(roles: UserRole[]): UserRole | null {
    return roles[0] ?? null;
  }

  private recordFailure(
    credentials: AuthCredentials,
    startedAt: number,
    code: "INVALID_CREDENTIALS" | "UNAUTHORIZED_ROLE"
  ) {
    const durationMs = this.nowMs() - startedAt;
    this.benchmarkPort.record({
      operation: "authenticate",
      durationMs,
      success: false,
      timestamp: new Date().toISOString()
    });
    this.telemetryPort.track("auth.authenticate.rejected", {
      username: credentials.username,
      code,
      durationMs
    });
  }

  private recordAuthorizeSuccess(
    userId: string,
    role: UserRole,
    permissionCount: number,
    startedAt: number
  ) {
    const durationMs = this.nowMs() - startedAt;
    this.benchmarkPort.record({
      operation: "authorize",
      durationMs,
      success: true,
      timestamp: new Date().toISOString()
    });
    this.telemetryPort.track("auth.authorize.completed", {
      userId,
      role,
      permissionCount,
      durationMs
    });
  }
}

export function createHttpBackendAuthFacade(
  options: HttpBackendAuthFacadeOptions
): IAuthFacade {
  return new HttpBackendAuthFacade(options);
}
