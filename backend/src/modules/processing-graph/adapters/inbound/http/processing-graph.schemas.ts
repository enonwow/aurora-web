import { z } from "zod";
import { AppException } from "../../../../../common/http/app-exception";

const areaSubgraphParamSchema = z.object({
  areaId: z.string().trim().min(1)
});

const deltaJobParamSchema = z.object({
  jobId: z.string().uuid()
});

const deltaJobListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(20)
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

export function parseDeltaJobParams(input: unknown): { jobId: string } {
  const parsed = deltaJobParamSchema.safeParse(input);
  if (parsed.success) {
    return parsed.data;
  }

  throw new AppException({
    status: 422,
    code: "VALIDATION_FAILED",
    message: "Delta job request validation failed.",
    details: parsed.error.issues.map((issue) => ({
      path: issue.path.join("."),
      reason: issue.message
    }))
  });
}

export function parseDeltaJobListQuery(input: unknown): { limit: number } {
  const parsed = deltaJobListQuerySchema.safeParse(input);
  if (parsed.success) {
    return parsed.data;
  }

  throw new AppException({
    status: 422,
    code: "VALIDATION_FAILED",
    message: "Delta job list query validation failed.",
    details: parsed.error.issues.map((issue) => ({
      path: issue.path.join("."),
      reason: issue.message
    }))
  });
}
