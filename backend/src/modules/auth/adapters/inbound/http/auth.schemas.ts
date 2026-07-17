import { z } from "zod";
import { AppException } from "../../../../../common/http/app-exception";

export const loginRequestSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1)
});

export const createUserRequestSchema = z.object({
  username: z.string().trim().min(3).max(64),
  password: z.string().min(8).max(128),
  displayName: z.string().trim().min(1).max(128),
  role: z.enum(["viewer", "builder", "dm", "admin"])
});

export type LoginRequest = z.infer<typeof loginRequestSchema>;
export type CreateUserRequest = z.infer<typeof createUserRequestSchema>;

export function parseLoginRequest(input: unknown): LoginRequest {
  const parsed = loginRequestSchema.safeParse(input);
  if (parsed.success) {
    return parsed.data;
  }

  throw new AppException({
    status: 422,
    code: "VALIDATION_FAILED",
    message: "Login payload validation failed.",
    details: parsed.error.issues.map((issue) => ({
      path: issue.path.join("."),
      reason: issue.message
    }))
  });
}

export function parseCreateUserRequest(input: unknown): CreateUserRequest {
  const parsed = createUserRequestSchema.safeParse(input);
  if (parsed.success) {
    return parsed.data;
  }

  throw new AppException({
    status: 422,
    code: "VALIDATION_FAILED",
    message: "Create user payload validation failed.",
    details: parsed.error.issues.map((issue) => ({
      path: issue.path.join("."),
      reason: issue.message
    }))
  });
}

