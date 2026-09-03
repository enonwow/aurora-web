import { z } from "zod";
import { AppException } from "../../../../../common/http/app-exception";

const queryInteger = (minimum: number, maximum: number) => z.union([
  z.number().int(),
  z.string().regex(/^(?:0|[1-9][0-9]*)$/u).transform(Number),
]).pipe(z.number().int().min(minimum).max(maximum));

const querySchema = z.object({
  search: z.string().regex(/^[a-z0-9_]{0,16}$/u).default(""),
  limit: queryInteger(1, 200).default(100),
  offset: queryInteger(0, Number.MAX_SAFE_INTEGER).default(0),
}).strict();

export function parseAreaEventScriptCatalogQuery(input: unknown) {
  const parsed = querySchema.safeParse(input);
  if (parsed.success) return parsed.data;
  throw new AppException({
    status: 422,
    code: "AREA_EVENT_SCRIPT_CATALOG_QUERY_INVALID",
    message: "Area event-script catalog query validation failed.",
    details: parsed.error.issues.map((issue) => ({
      path: issue.path.join("."),
      reason: issue.message,
    })),
  });
}
