import { z } from "zod";
import { AppException } from "../../../../../common/http/app-exception";
import {
  AREA_TILE_CERTIFICATION_PAGE_MAX_LIMIT,
  AREA_TILE_CERTIFICATION_PAGE_MAX_OFFSET,
} from "../../../application/area-tile-certification-query.application.service";

const tilesetResRefSchema = z.string().regex(/^[a-z0-9_]{1,16}$/u);
const pageQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(AREA_TILE_CERTIFICATION_PAGE_MAX_LIMIT).default(256),
  offset: z.coerce.number().int().min(0).max(AREA_TILE_CERTIFICATION_PAGE_MAX_OFFSET).default(0),
}).strict();

export function parseAreaTileCertificationTilesetResRef(value: unknown): string {
  const parsed = tilesetResRefSchema.safeParse(value);
  if (parsed.success) return parsed.data;
  throw invalidQuery(parsed.error.issues);
}

export function parseAreaTileCertificationPageQuery(value: unknown) {
  const parsed = pageQuerySchema.safeParse(value);
  if (parsed.success) return parsed.data;
  throw invalidQuery(parsed.error.issues);
}

function invalidQuery(issues: readonly z.ZodIssue[]): AppException {
  return new AppException({
    status: 422,
    code: "AREA_TILE_CERTIFICATION_QUERY_INVALID",
    message: "Area tile-certification query validation failed.",
    details: issues.map((issue) => ({
      path: issue.path.join("."),
      reason: issue.message,
    })),
  });
}
