import { createHash } from "node:crypto";
import { z } from "zod";

export const AREA_RENAME_PREVIEW_COMMAND_SCHEMA_VERSION =
  "area-rename-preview-command.v1" as const;
export const AREA_RENAME_COMMAND_SCHEMA_VERSION = "area-rename-command.v1" as const;

const OPAQUE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const RESREF_PATTERN = /^[a-z0-9_]{1,16}$/u;
const resRef = z.string().trim().toLowerCase().regex(RESREF_PATTERN);
const sha256 = z.string().toLowerCase().regex(SHA256_PATTERN);

const identityFields = {
  moduleId: z.string().regex(OPAQUE_ID_PATTERN),
  areaResRef: resRef,
  targetAreaResRef: resRef,
  expectedModuleRevision: sha256,
  clientCommandId: z.string().regex(OPAQUE_ID_PATTERN),
};

const previewSchema = z.object({
  schemaVersion: z.literal(AREA_RENAME_PREVIEW_COMMAND_SCHEMA_VERSION),
  ...identityFields,
}).strict().superRefine(assertDistinctIdentities);

const renameSchema = z.object({
  schemaVersion: z.literal(AREA_RENAME_COMMAND_SCHEMA_VERSION),
  ...identityFields,
  preview: z.object({ sha256 }).strict(),
  confirmation: z.object({
    sourceAreaResRef: resRef,
    targetAreaResRef: resRef,
    policy: z.literal("block_on_references"),
  }).strict(),
}).strict().superRefine((value, context) => {
  assertDistinctIdentities(value, context);
  if (value.confirmation.sourceAreaResRef !== value.areaResRef) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["confirmation", "sourceAreaResRef"],
      message: "Confirmed source ResRef must exactly match the source Area.",
    });
  }
  if (value.confirmation.targetAreaResRef !== value.targetAreaResRef) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["confirmation", "targetAreaResRef"],
      message: "Confirmed target ResRef must exactly match the rename target.",
    });
  }
});

export type AreaRenamePreviewCommand = z.infer<typeof previewSchema>;
export type AreaRenameCommand = z.infer<typeof renameSchema>;

export interface AreaRenameCommandIssue {
  readonly code: "unknown_field" | "invalid_field";
  readonly path: string;
  readonly message: string;
}

export type AreaRenameCommandValidationResult<T> =
  | Readonly<{
      valid: true;
      value: T;
      canonicalJson: string;
      commandHash: string;
    }>
  | Readonly<{ valid: false; issues: readonly AreaRenameCommandIssue[] }>;

export function validateAndNormalizeAreaRenamePreviewCommand(
  input: unknown,
): AreaRenameCommandValidationResult<AreaRenamePreviewCommand> {
  return validate(previewSchema, input);
}

export function validateAndNormalizeAreaRenameCommand(
  input: unknown,
): AreaRenameCommandValidationResult<AreaRenameCommand> {
  return validate(renameSchema, input);
}

function assertDistinctIdentities(
  value: Readonly<{ areaResRef: string; targetAreaResRef: string }>,
  context: z.RefinementCtx,
): void {
  if (value.areaResRef === value.targetAreaResRef) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["targetAreaResRef"],
      message: "Area rename target must differ from the source ResRef.",
    });
  }
}

function validate<T>(
  schema: z.ZodType<T>,
  input: unknown,
): AreaRenameCommandValidationResult<T> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return Object.freeze({
      valid: false as const,
      issues: Object.freeze(parsed.error.issues.map((issue) => Object.freeze({
        code: issue.code === z.ZodIssueCode.unrecognized_keys
          ? "unknown_field" as const
          : "invalid_field" as const,
        path: issue.path.length === 0 ? "$" : issue.path.join("."),
        message: issue.message,
      }))),
    });
  }
  const value = deepFreeze(structuredClone(parsed.data));
  const canonicalJson = canonicalize(value);
  return Object.freeze({
    valid: true as const,
    value,
    canonicalJson,
    commandHash: createHash("sha256").update(canonicalJson, "utf8").digest("hex"),
  });
}

export function canonicalizeAreaRenameCommand(value: unknown): string {
  return canonicalize(value);
}

function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalize(record[key])}`)
    .join(",")}}`;
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  return Object.freeze(value);
}
