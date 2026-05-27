import { describe, expect, it } from "vitest";
import { ZodError } from "zod";
import {
  parseAuthenticateResponse,
  parseAuthorizationResponse
} from "../../../../src/modules/auth/contractSchemas";
import { mockAuthFacade } from "../../../../src/modules/auth/mockAuthFacade";

describe("auth contract runtime schemas", () => {
  it("accepts valid authenticate success payload", async () => {
    const response = await mockAuthFacade.authenticate({
      username: "admin.user",
      password: "admin123"
    });

    const parsed = parseAuthenticateResponse(response);
    expect(parsed.ok).toBe(true);
  });

  it("accepts valid authenticate failure payload", async () => {
    const response = await mockAuthFacade.authenticate({
      username: "admin.user",
      password: "wrong-pass"
    });

    const parsed = parseAuthenticateResponse(response);
    expect(parsed.ok).toBe(false);
  });

  it("accepts valid authorization payload", async () => {
    const auth = await mockAuthFacade.authenticate({
      username: "builder.user",
      password: "builder123"
    });
    if (!auth.ok) {
      throw new Error("Expected successful authentication");
    }

    const authz = await mockAuthFacade.authorize(auth.session);
    const parsed = parseAuthorizationResponse(authz);

    expect(parsed.role).toBe("builder");
    expect(parsed.permissions.length).toBeGreaterThan(0);
  });

  it("rejects invalid runtime payload shape", () => {
    const invalidPayload = {
      ok: true,
      session: {
        accessToken: "token"
      }
    };

    expect(() => parseAuthenticateResponse(invalidPayload)).toThrowError(ZodError);
  });
});
