import { z } from "zod";

export const AREA_EVENT_SCRIPT_SOURCE_COMMAND_SCHEMA_VERSION =
  "area-event-script-source-command.v1" as const;
export const AREA_EVENT_SCRIPT_SOURCE_SNAPSHOT_SCHEMA_VERSION =
  "area-event-script-source-snapshot.v1" as const;
export const AREA_EVENT_SCRIPT_VALIDATION_RESULT_SCHEMA_VERSION =
  "area-event-script-validation-result.v1" as const;
export const AREA_EVENT_SCRIPT_PUBLICATION_RECEIPT_SCHEMA_VERSION =
  "area-event-script-publication-receipt.v1" as const;
export const AREA_EVENT_SCRIPT_SOURCE_MAX_BYTES = 256 * 1024;
export const AREA_EVENT_SCRIPT_INCLUDE_MAX_COUNT = 1_024;
export const AREA_EVENT_SCRIPT_COMMAND_MAX_BYTES = 512 * 1024;
const COMPILED_ARTIFACT_MAX_BYTES = 4 * 1024 * 1024;

const moduleIdSchema = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u);
const resRefSchema = z.string().regex(/^[a-z0-9_]{1,16}$/u).refine(
  (value) => value !== "nwscript",
);
const sha256Schema = z.string().regex(/^[a-f0-9]{64}$/u);
const providerSchema = z.object({
  providerId: z.literal("neverwinter-nim-official-script-compiler"),
  executableSha256: sha256Schema,
  versionMarker: z.string().min(1).refine((value) => utf8Size(value) <= 256),
  versionOutputSha256: sha256Schema,
  languageSpecSha256: sha256Schema,
  runtimeLibrarySetSha256: sha256Schema,
  launcherFileSetSha256: sha256Schema,
}).strict();
const diagnosticSchema = z.object({
  code: z.enum([
    "NWNSCRIPT_COMPILE_ERROR",
    "NWNSCRIPT_COMPILE_WARNING",
    "NWNSCRIPT_COMPILER_REJECTED",
  ]),
  severity: z.enum(["error", "warning"]),
  line: z.number().int().min(1).optional(),
  column: z.number().int().min(1).optional(),
  message: z.string().min(1).refine((value) => utf8Size(value) <= 1_024),
  detailSha256: sha256Schema.optional(),
}).strict();
const artifactSchema = z.object({
  size: z.number().int().min(0).max(COMPILED_ARTIFACT_MAX_BYTES),
  sha256: sha256Schema,
}).strict();
const commandSchema = z.object({
  schemaVersion: z.literal(AREA_EVENT_SCRIPT_SOURCE_COMMAND_SCHEMA_VERSION),
  moduleId: moduleIdSchema,
  targetResRef: resRefSchema,
  expectedModuleRevision: sha256Schema,
  sourceText: z.string().refine(hasWellFormedUnicode).refine(
    (value) => utf8Size(value) <= AREA_EVENT_SCRIPT_SOURCE_MAX_BYTES,
  ),
  includeResRefs: z.array(resRefSchema).max(AREA_EVENT_SCRIPT_INCLUDE_MAX_COUNT),
}).strict();
const sourceSnapshotSchema = z.object({
  schemaVersion: z.literal(AREA_EVENT_SCRIPT_SOURCE_SNAPSHOT_SCHEMA_VERSION),
  moduleId: moduleIdSchema,
  moduleRevision: sha256Schema,
  targetResRef: resRefSchema,
  sourceEncoding: z.literal("utf-8"),
  sourceText: z.string().refine(hasWellFormedUnicode).refine(
    (value) => utf8Size(value) <= AREA_EVENT_SCRIPT_SOURCE_MAX_BYTES,
  ),
  sourceSize: z.number().int().min(0).max(AREA_EVENT_SCRIPT_SOURCE_MAX_BYTES),
  sourceSha256: sha256Schema,
}).strict();
const validationCommon = z.object({
  schemaVersion: z.literal(AREA_EVENT_SCRIPT_VALIDATION_RESULT_SCHEMA_VERSION),
  moduleId: moduleIdSchema,
  moduleRevision: sha256Schema,
  targetResRef: resRefSchema,
  sourceSha256: sha256Schema,
  includeSetSha256: sha256Schema,
  executionProfileSha256: sha256Schema,
  provider: providerSchema,
  diagnostics: z.array(diagnosticSchema).max(100),
  compilerReceiptSha256: sha256Schema,
});
const validationSchema = z.discriminatedUnion("status", [
  validationCommon.extend({
    status: z.literal("compiled"),
    artifacts: z.object({ ncs: artifactSchema, ndb: artifactSchema }).strict(),
  }).strict(),
  validationCommon.extend({ status: z.literal("rejected") }).strict(),
]);
const publicationResourceSchema = z.object({
  extension: z.enum(["ncs", "ndb", "nss"]),
  logicalKey: z.string().min(5).max(20),
  resourceType: z.number().int().min(0).max(65_535),
  size: z.number().int().min(0).max(COMPILED_ARTIFACT_MAX_BYTES),
  sha256: sha256Schema,
}).strict();
const publicationReceiptSchema = z.object({
  schemaVersion: z.literal(AREA_EVENT_SCRIPT_PUBLICATION_RECEIPT_SCHEMA_VERSION),
  transactionId: z.string().min(1).max(128),
  moduleId: moduleIdSchema,
  targetResRef: resRefSchema,
  previousModuleRevision: sha256Schema,
  newModuleRevision: sha256Schema,
  commandHash: sha256Schema,
  sourceSha256: sha256Schema,
  includeSetSha256: sha256Schema,
  executionProfileSha256: sha256Schema,
  provider: providerSchema,
  compilerReceiptSha256: sha256Schema,
  resources: z.array(publicationResourceSchema).length(3),
  readbackStatus: z.literal("verified"),
  warnings: z.array(diagnosticSchema).max(100),
  publishedAt: z.string().datetime({ offset: true }),
}).strict();

export type AreaEventScriptSourceCommand = Readonly<z.infer<typeof commandSchema>>;
export type AreaEventScriptSourceSnapshot = Readonly<z.infer<typeof sourceSnapshotSchema>>;
export type AreaEventScriptValidationResult = Readonly<z.infer<typeof validationSchema>>;
export type AreaEventScriptPublicationReceipt = Readonly<z.infer<typeof publicationReceiptSchema>>;
export type AreaEventScriptCompilerDiagnostic = AreaEventScriptValidationResult["diagnostics"][number];

export interface CreateAreaEventScriptSourceCommandInput {
  readonly moduleId: string;
  readonly targetResRef: string;
  readonly expectedModuleRevision: string;
  readonly sourceText: string;
  readonly includeResRefs: readonly string[];
}

export function createAreaEventScriptSourceCommand(
  input: CreateAreaEventScriptSourceCommandInput,
): AreaEventScriptSourceCommand | null {
  if (!Array.isArray(input.includeResRefs) || new Set(input.includeResRefs).size
    !== input.includeResRefs.length || input.includeResRefs.includes(input.targetResRef)) {
    return null;
  }
  const candidate = {
    schemaVersion: AREA_EVENT_SCRIPT_SOURCE_COMMAND_SCHEMA_VERSION,
    moduleId: input.moduleId,
    targetResRef: input.targetResRef,
    expectedModuleRevision: input.expectedModuleRevision,
    sourceText: input.sourceText,
    includeResRefs: [...input.includeResRefs].sort(compareAscii),
  };
  return readAreaEventScriptSourceCommand(candidate);
}

export function readAreaEventScriptSourceCommand(
  value: unknown,
): AreaEventScriptSourceCommand | null {
  const parsed = commandSchema.safeParse(value);
  if (!parsed.success || !isCanonicalIncludeSet(parsed.data)) return null;
  if (utf8Size(JSON.stringify(parsed.data)) > AREA_EVENT_SCRIPT_COMMAND_MAX_BYTES) return null;
  return deepFreeze(structuredClone(parsed.data));
}

export function readAreaEventScriptSourceSnapshot(
  value: unknown,
): AreaEventScriptSourceSnapshot | null {
  const parsed = sourceSnapshotSchema.safeParse(value);
  if (!parsed.success || utf8Size(parsed.data.sourceText) !== parsed.data.sourceSize) return null;
  return deepFreeze(structuredClone(parsed.data));
}

export function readAreaEventScriptValidationResult(
  value: unknown,
): AreaEventScriptValidationResult | null {
  const parsed = validationSchema.safeParse(value);
  return parsed.success ? deepFreeze(structuredClone(parsed.data)) : null;
}

export function readAreaEventScriptPublicationReceipt(
  value: unknown,
): AreaEventScriptPublicationReceipt | null {
  const parsed = publicationReceiptSchema.safeParse(value);
  if (!parsed.success || !hasPublicationResourceInvariants(parsed.data)) return null;
  return deepFreeze(structuredClone(parsed.data));
}

function hasPublicationResourceInvariants(
  receipt: z.infer<typeof publicationReceiptSchema>,
): boolean {
  const expected = [
    ["ncs", 2010],
    ["ndb", 2064],
    ["nss", 2009],
  ] as const;
  return receipt.resources.every((resource, index) => {
    const [extension, resourceType] = expected[index];
    return resource.extension === extension
      && resource.resourceType === resourceType
      && resource.logicalKey === `${receipt.targetResRef}.${extension}`
      && (extension !== "nss" || (
        resource.sha256 === receipt.sourceSha256
        && resource.size <= AREA_EVENT_SCRIPT_SOURCE_MAX_BYTES
      ));
  });
}

function isCanonicalIncludeSet(command: z.infer<typeof commandSchema>): boolean {
  return command.includeResRefs.every((value, index) =>
    value !== command.targetResRef
      && (index === 0 || compareAscii(command.includeResRefs[index - 1], value) < 0));
}

function hasWellFormedUnicode(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return false;
      index += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff) return false;
  }
  return true;
}

function utf8Size(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

function compareAscii(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function deepFreeze<T>(value: T): T {
  if (Object(value) !== value || Object.isFrozen(value)) return value;
  for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  return Object.freeze(value);
}
