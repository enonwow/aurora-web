import { z } from "zod";

export const userRoleSchema = z.enum(["viewer", "builder", "dm", "admin"]);

export const authFailureSchema = z.object({
  code: z.enum(["INVALID_CREDENTIALS", "UNAUTHORIZED_ROLE"]),
  message: z.string().min(1)
});

export const authenticatedUserSchema = z.object({
  id: z.string().min(1),
  username: z.string().min(1),
  displayName: z.string().min(1),
  role: userRoleSchema
});

export const authSessionSchema = z.object({
  accessToken: z.string().min(1),
  issuedAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
  user: authenticatedUserSchema
});

export const authenticateSuccessSchema = z.object({
  ok: z.literal(true),
  session: authSessionSchema
});

export const authenticateFailureSchema = z.object({
  ok: z.literal(false),
  error: authFailureSchema
});

export const authenticateResponseSchema = z.discriminatedUnion("ok", [
  authenticateSuccessSchema,
  authenticateFailureSchema
]);

export const authorizationResponseSchema = z.object({
  role: userRoleSchema,
  permissions: z.array(z.string().min(1))
});

export function parseAuthenticateResponse(payload: unknown) {
  return authenticateResponseSchema.parse(payload);
}

export function parseAuthorizationResponse(payload: unknown) {
  return authorizationResponseSchema.parse(payload);
}
