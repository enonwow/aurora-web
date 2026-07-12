import { z } from "zod";
import { AppException } from "../../../../../common/http/app-exception";

const areaResRefSchema = z.string().trim().toLowerCase().regex(/^[a-z0-9_]{1,16}$/u);

const editableTileSchema = z.object({
  row: z.number().int().min(0).max(31),
  col: z.number().int().min(0).max(31),
  sourceRow: z.number().int().min(0).max(31).optional(),
  sourceCol: z.number().int().min(0).max(31).optional(),
  tileId: z.number().int().min(0),
  orientation: z.number().int().min(0).max(3),
  height: z.number().int().min(0).max(32),
  mainLight1: z.number().int().min(0).max(255).optional(),
  mainLight2: z.number().int().min(0).max(255).optional(),
  sourceLight1: z.number().int().min(0).max(255).optional(),
  sourceLight2: z.number().int().min(0).max(255).optional(),
  animLoop1: z.number().int().min(0).max(255).optional(),
  animLoop2: z.number().int().min(0).max(255).optional(),
  animLoop3: z.number().int().min(0).max(255).optional()
}).superRefine((tile, context) => {
  if ((tile.sourceRow === undefined) !== (tile.sourceCol === undefined)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: tile.sourceRow === undefined ? ["sourceRow"] : ["sourceCol"],
      message: "sourceRow and sourceCol must either both be present or both be absent."
    });
  }
});

const areaEditingExportSchema = z.object({
  areaResRef: areaResRefSchema,
  name: z.string().trim().min(1).max(256),
  width: z.number().int().min(2).max(32),
  height: z.number().int().min(2).max(32),
  tilesetResRef: areaResRefSchema,
  tilesetFingerprint: z.string().regex(/^[a-f0-9]{64}$/iu),
  areaFingerprint: z.string().regex(/^[a-f0-9]{64}$/iu).optional(),
  tiles: z.array(editableTileSchema).min(4).max(1024)
});

export type AreaEditingExportDraftRequest = z.infer<typeof areaEditingExportSchema>;

export function parseAreaEditingExportDraft(input: unknown): AreaEditingExportDraftRequest {
  const parsed = areaEditingExportSchema.safeParse(input);
  if (parsed.success) {
    return parsed.data;
  }
  throw new AppException({
    status: 422,
    code: "VALIDATION_FAILED",
    message: "Area editing export payload validation failed.",
    details: parsed.error.issues.map((issue) => ({
      path: issue.path.join("."),
      reason: issue.message
    }))
  });
}
