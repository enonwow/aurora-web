import { z } from "zod";
import { AppException } from "../../../../../common/http/app-exception";

export const loginRequestSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1)
});

export type LoginRequest = z.infer<typeof loginRequestSchema>;

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
