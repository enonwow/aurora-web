import { createHash } from "node:crypto";
import { z } from "zod";
import {
  AREA_UPDATE_COMMAND_SCHEMA_VERSION,
  type AreaUpdateCommand,
  type AreaUpdateCommandIssue,
  type AreaUpdateCommandResult,
} from "./area-update-command.types";

const OPAQUE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const RESREF_PATTERN = /^[a-z0-9_]{1,16}$/u;

const commandSchema = z
  .object({
    schemaVersion: z.literal(AREA_UPDATE_COMMAND_SCHEMA_VERSION),
    moduleId: z.string().regex(OPAQUE_ID_PATTERN),
    areaResRef: z.string().trim().toLowerCase().regex(RESREF_PATTERN),
    expectedModuleRevision: z.string().toLowerCase().regex(SHA256_PATTERN),
    draft: z
      .object({
        id: z.string().regex(OPAQUE_ID_PATTERN),
        revision: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
        normalizedSha256: z.string().toLowerCase().regex(SHA256_PATTERN),
      })
      .strict(),
    clientCommandId: z.string().regex(OPAQUE_ID_PATTERN),
  })
  .strict();

export function validateAndNormalizeAreaUpdateCommand(
  input: unknown,
): AreaUpdateCommandResult {
  const parsed = commandSchema.safeParse(input);
  if (!parsed.success) {
    return Object.freeze({
      valid: false as const,
      issues: Object.freeze(
        parsed.error.issues.map((issue) =>
          Object.freeze({
            code:
              issue.code === z.ZodIssueCode.unrecognized_keys
                ? "unknown_field"
                : "invalid_field",
            path: issue.path.length === 0 ? "$" : issue.path.join("."),
            message: issue.message,
          } satisfies AreaUpdateCommandIssue),
        ),
      ),
    });
  }

  const value: AreaUpdateCommand = deepFreeze({
    schemaVersion: AREA_UPDATE_COMMAND_SCHEMA_VERSION,
    moduleId: parsed.data.moduleId,
    areaResRef: parsed.data.areaResRef,
    expectedModuleRevision: parsed.data.expectedModuleRevision,
    draft: { ...parsed.data.draft },
    clientCommandId: parsed.data.clientCommandId,
  });
  const canonicalJson = canonicalize(value);
  return Object.freeze({
    valid: true as const,
    value,
    canonicalJson,
    commandHash: createHash("sha256").update(canonicalJson, "utf8").digest("hex"),
  });
}

export function canonicalizeAreaUpdateCommand(command: AreaUpdateCommand): string {
  return canonicalize(command);
}

function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((entry) => canonicalize(entry)).join(",")}]`;
  }
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalize(record[key])}`)
    .join(",")}}`;
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) {
    return value;
  }
  for (const child of Object.values(value as Record<string, unknown>)) {
    deepFreeze(child);
  }
  return Object.freeze(value);
}
