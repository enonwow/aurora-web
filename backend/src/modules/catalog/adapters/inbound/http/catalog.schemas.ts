import { z } from "zod";
import { AppException } from "../../../../../common/http/app-exception";

const listQuerySchema = z.object({
  query: z.string().trim().min(1).optional(),
  category: z.string().trim().min(1).optional(),
  tag: z.string().trim().min(1).optional(),
  subtype: z
    .enum(["generic", "door", "vfx", "container", "light_source", "trigger_proxy"])
    .optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0)
});

export function parseCatalogListQuery(input: unknown) {
  const parsed = listQuerySchema.safeParse(input);
  if (parsed.success) {
    return parsed.data;
  }

  throw new AppException({
    status: 422,
    code: "VALIDATION_FAILED",
    message: "Catalog list query validation failed.",
    details: parsed.error.issues.map((issue) => ({
      path: issue.path.join("."),
      reason: issue.message
    }))
  });
}
