import { describe, expect, it } from "vitest";
import { ZodError } from "zod";
import {
  parseAuthenticateResponse,
  parseAuthorizationResponse
} from "../../../../src/modules/auth/contractSchemas";

describe("auth contract runtime schemas - negative cases", () => {
  it("rejects authenticate payload without discriminant", () => {
    expect(() =>
      parseAuthenticateResponse({
        session: {}
      })
    ).toThrowError(ZodError);
  });

  it("rejects authenticate success payload with invalid role", () => {
    expect(() =>
      parseAuthenticateResponse({
        ok: true,
        session: {
          accessToken: "token",
          issuedAt: "2026-01-01T10:00:00.000Z",
          expiresAt: "2026-01-01T11:00:00.000Z",
          user: {
            id: "u_1",
            username: "x",
            displayName: "X",
            role: "super-admin"
          }
        }
      })
    ).toThrowError(ZodError);
  });

  it("rejects authenticate success payload with invalid datetime fields", () => {
    expect(() =>
      parseAuthenticateResponse({
        ok: true,
        session: {
          accessToken: "token",
          issuedAt: "not-a-date",
          expiresAt: "2026-01-01",
          user: {
            id: "u_1",
            username: "x",
            displayName: "X",
            role: "builder"
          }
        }
      })
    ).toThrowError(ZodError);
  });

  it("rejects authorization payload with empty permission entry", () => {
    expect(() =>
      parseAuthorizationResponse({
        role: "dm",
        permissions: ["dm.spawn_creature", ""]
      })
    ).toThrowError(ZodError);
  });

  it("rejects authorization payload with non-array permissions", () => {
    expect(() =>
      parseAuthorizationResponse({
        role: "viewer",
        permissions: "scene.read"
      })
    ).toThrowError(ZodError);
  });
});

