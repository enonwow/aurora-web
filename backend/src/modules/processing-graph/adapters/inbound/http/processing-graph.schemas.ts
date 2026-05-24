import { z } from "zod";
import { AppException } from "../../../../../common/http/app-exception";

const areaSubgraphParamSchema = z.object({
  areaId: z.string().trim().min(1)
});

export function parseAreaSubgraphParams(input: unknown): { areaId: string } {
  const parsed = areaSubgraphParamSchema.safeParse(input);
  if (parsed.success) {
    return parsed.data;
  }

  throw new AppException({
    status: 422,
    code: "VALIDATION_FAILED",
    message: "Area subgraph request validation failed.",
    details: parsed.error.issues.map((issue) => ({
      path: issue.path.join("."),
      reason: issue.message
    }))
  });
}
