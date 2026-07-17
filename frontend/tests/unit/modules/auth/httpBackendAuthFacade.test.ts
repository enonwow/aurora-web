import { describe, expect, it, vi } from "vitest";
import {
  createHttpBackendAuthFacade,
  probeBackendHealth
} from "../../../../src/modules/auth/adapters/httpBackendAuthFacade";
import { browserTelemetryFacade } from "../../../../src/modules/telemetry/composition/browserTelemetrySingleton";

describe("httpBackendAuthFacade", () => {
  it("authenticates against backend login + me and returns backend session", async () => {
    const fetchStub = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              session: {
                accessToken: "token_live_001",
                issuedAt: "2026-05-27T10:00:00.000Z",
                expiresAt: "2026-05-27T20:00:00.000Z"
              },
              user: {
                userId: "u_builder_001",
                roles: ["builder"],
                displayName: "Builder User"
              }
            }
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              userId: "u_builder_001",
              roles: ["builder"],
              displayName: "Builder User",
              permissions: ["scene.read", "scene.edit"]
            }
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      );

    const facade = createHttpBackendAuthFacade({
      telemetryFacade: browserTelemetryFacade,
      fetchFn: fetchStub as unknown as typeof fetch,
      baseUrl: "http://localhost:3000/api/v1"
    });

    const authResult = await facade.authenticate({
      username: "builder.user",
      password: "builder123"
    });

    expect(authResult.ok).toBe(true);
    if (!authResult.ok) {
      return;
    }
    expect(authResult.session.accessToken).toBe("token_live_001");
    expect(authResult.session.user.id).toBe("u_builder_001");
    expect(authResult.session.user.role).toBe("builder");
    expect(fetchStub).toHaveBeenCalledWith(
      "http://localhost:3000/api/v1/auth/login",
      expect.objectContaining({ method: "POST" })
    );
    expect(fetchStub).toHaveBeenCalledWith(
      "http://localhost:3000/api/v1/auth/me",
      expect.objectContaining({ method: "GET" })
    );
  });

  it("returns generic login error on backend auth failure", async () => {
    const fetchStub = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          error: {
            code: "INVALID_CREDENTIALS",
            message: "Invalid username or password."
          }
        }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      )
    );
    const facade = createHttpBackendAuthFacade({
      telemetryFacade: browserTelemetryFacade,
      fetchFn: fetchStub as unknown as typeof fetch,
      baseUrl: "http://localhost:3000/api/v1"
    });

    const authResult = await facade.authenticate({
      username: "builder.user",
      password: "wrong"
    });

    expect(authResult.ok).toBe(false);
    if (authResult.ok) {
      return;
    }
    expect(authResult.error.message).toBe("Login failed.");
  });

  it("rejects stale persisted sessions instead of fabricating local authorization", async () => {
    const fetchStub = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          error: {
            code: "UNAUTHORIZED",
            message: "Missing or invalid bearer token."
          }
        }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      )
    );
    const facade = createHttpBackendAuthFacade({
      telemetryFacade: browserTelemetryFacade,
      fetchFn: fetchStub as unknown as typeof fetch,
      baseUrl: "http://localhost:3000/api/v1"
    });

    await expect(
      facade.authorize({
        accessToken: "stale_token_001",
        issuedAt: "2026-05-27T10:00:00.000Z",
        expiresAt: "2026-05-27T20:00:00.000Z",
        user: {
          id: "u_builder_001",
          username: "builder.user",
          displayName: "Builder User",
          role: "builder"
        }
      })
    ).rejects.toThrow("Missing or invalid bearer token.");

    expect(fetchStub).toHaveBeenCalledWith(
      "http://localhost:3000/api/v1/auth/me",
      expect.objectContaining({
        headers: {
          Authorization: "Bearer stale_token_001"
        },
        method: "GET"
      })
    );
  });

  it("probes backend health endpoint", async () => {
    const fetchStub = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ status: "ok", service: "aurora-backend" }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      })
    );

    const result = await probeBackendHealth(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1"
    );

    expect(result.available).toBe(true);
    expect(result.service).toBe("aurora-backend");
  });
});
