import { z } from "zod";
import { AppException } from "../../../../../common/http/app-exception";

const templateProcessPayloadSchema = z
  .object({
    templateId: z.string().trim().min(1).optional(),
    resref: z.string().trim().min(1).optional(),
    bypassCache: z.coerce.boolean().default(false),
    includeBenchmarkMetadata: z.coerce.boolean().default(true)
  })
  .superRefine((value, context) => {
    if (!value.templateId && !value.resref) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["templateId"],
        message: "Either templateId or resref must be provided."
      });
    }
  });

const cacheKeySchema = z
  .string()
  .trim()
  .min(16)
  .max(128)
  .regex(/^[a-f0-9]+$/iu, "cacheKey must be hexadecimal.");

export function parseTemplateProcessPayload(input: unknown) {
  const parsed = templateProcessPayloadSchema.safeParse(input);
  if (parsed.success) {
    return parsed.data;
  }

  throwValidationError(parsed.error.issues, "Template process payload validation failed.");
}

export function parseTemplateCacheKey(input: unknown): string {
  const parsed = cacheKeySchema.safeParse(input);
  if (parsed.success) {
    return parsed.data;
  }

  throwValidationError(parsed.error.issues, "Template cache key validation failed.");
}

function throwValidationError(
  issues: Array<{ path: Array<string | number>; message: string }>,
  message: string
): never {
  throw new AppException({
    status: 422,
    code: "VALIDATION_FAILED",
    message,
    details: issues.map((issue) => ({
      path: issue.path.join("."),
      reason: issue.message
    }))
  });
}
