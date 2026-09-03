import { z } from "zod";

export const AREA_EVENT_SCRIPT_CATALOG_SCHEMA_VERSION =
  "area-event-script-catalog.v1" as const;
export const AREA_EVENT_SCRIPT_CATALOG_PAGE_LIMIT = 200;
export const AREA_EVENT_SCRIPT_CATALOG_RESPONSE_BYTE_LIMIT = 256 * 1024;

const resRefSchema = z.string().regex(/^[a-z0-9_]{1,16}$/u);
const sha256Schema = z.string().regex(/^[a-f0-9]{64}$/u);
const descriptorBase = z.object({
  logicalKey: z.string().min(5).max(20),
  resourceType: z.number().int(),
  size: z.number().int().min(0).max(2_147_483_647),
  sha256: sha256Schema,
}).strict();
const sourceDescriptorSchema = descriptorBase.extend({
  resourceType: z.literal(2009),
}).strict();
const bytecodeDescriptorSchema = descriptorBase.extend({
  resourceType: z.literal(2010),
}).strict();
const itemSchema = z.discriminatedUnion("artifactStatus", [
  z.object({
    resRef: resRefSchema,
    artifactStatus: z.literal("source_and_bytecode"),
    freshness: z.literal("unverified"),
    source: sourceDescriptorSchema,
    bytecode: bytecodeDescriptorSchema,
  }).strict(),
  z.object({
    resRef: resRefSchema,
    artifactStatus: z.literal("source_only"),
    freshness: z.null(),
    source: sourceDescriptorSchema,
  }).strict(),
  z.object({
    resRef: resRefSchema,
    artifactStatus: z.literal("bytecode_only"),
    freshness: z.null(),
    bytecode: bytecodeDescriptorSchema,
  }).strict(),
]);
const diagnosticSchema = z.enum([
  "external_runtime_layers_not_resolved",
  "paired_freshness_unverified",
  "rejected_committed_descriptors",
]);
const catalogSchema = z.object({
  schemaVersion: z.literal(AREA_EVENT_SCRIPT_CATALOG_SCHEMA_VERSION),
  moduleId: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u),
  moduleRevision: sha256Schema,
  coverage: z.literal("committed_module_only"),
  items: z.array(itemSchema).max(AREA_EVENT_SCRIPT_CATALOG_PAGE_LIMIT),
  total: z.number().int().min(0).max(10_000),
  limit: z.number().int().min(1).max(AREA_EVENT_SCRIPT_CATALOG_PAGE_LIMIT),
  offset: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
  summary: z.object({
    admittedCatalogCount: z.number().int().min(0).max(10_000),
    sourceAndBytecode: z.number().int().min(0).max(10_000),
    sourceOnly: z.number().int().min(0).max(10_000),
    bytecodeOnly: z.number().int().min(0).max(10_000),
    rejectedDescriptors: z.number().int().min(0).max(50_000),
  }).strict(),
  diagnostics: z.array(diagnosticSchema).min(1).max(3),
}).strict();

export type AreaEventScriptCatalog = Readonly<z.infer<typeof catalogSchema>>;
export type AreaEventScriptCatalogItem = AreaEventScriptCatalog["items"][number];
export type AreaEventScriptCatalogQuery = Readonly<{
  search: string;
  limit: number;
  offset: number;
}>;

export function readAreaEventScriptCatalog(value: unknown): AreaEventScriptCatalog | null {
  const parsed = catalogSchema.safeParse(value);
  if (!parsed.success || !hasValidCatalogInvariants(parsed.data)) return null;
  if (new TextEncoder().encode(JSON.stringify(parsed.data)).byteLength
    >= AREA_EVENT_SCRIPT_CATALOG_RESPONSE_BYTE_LIMIT) return null;
  return deepFreeze(structuredClone(parsed.data));
}

export function readAreaEventScriptCatalogQuery(
  value: unknown,
): AreaEventScriptCatalogQuery | null {
  if (!isRecord(value)) return null;
  if (Object.keys(value).some((key) => !["search", "limit", "offset"].includes(key))) {
    return null;
  }
  const { search, limit, offset } = value;
  if (
    typeof search !== "string"
    || !/^[a-z0-9_]{0,16}$/u.test(search)
    || !Number.isInteger(limit)
    || Number(limit) < 1
    || Number(limit) > AREA_EVENT_SCRIPT_CATALOG_PAGE_LIMIT
    || !Number.isSafeInteger(offset)
    || Number(offset) < 0
  ) return null;
  return Object.freeze({ search, limit: Number(limit), offset: Number(offset) });
}

function hasValidCatalogInvariants(catalog: z.infer<typeof catalogSchema>): boolean {
  if (catalog.items.length > catalog.limit || catalog.total > catalog.summary.admittedCatalogCount) {
    return false;
  }
  if (catalog.items.length > 0 && (
    catalog.offset >= catalog.total
    || catalog.items.length > catalog.total - catalog.offset
  )) return false;
  if (
    catalog.summary.sourceAndBytecode
      + catalog.summary.sourceOnly
      + catalog.summary.bytecodeOnly
    !== catalog.summary.admittedCatalogCount
  ) return false;
  const expectedDiagnostics = [
    "external_runtime_layers_not_resolved",
    ...(catalog.summary.sourceAndBytecode > 0 ? ["paired_freshness_unverified"] : []),
    ...(catalog.summary.rejectedDescriptors > 0 ? ["rejected_committed_descriptors"] : []),
  ];
  if (JSON.stringify(catalog.diagnostics) !== JSON.stringify(expectedDiagnostics)) return false;

  let previous = "";
  for (const item of catalog.items) {
    if (previous && item.resRef <= previous) return false;
    previous = item.resRef;
    if ("source" in item && item.source.logicalKey !== `${item.resRef}.nss`) return false;
    if ("bytecode" in item && item.bytecode.logicalKey !== `${item.resRef}.ncs`) return false;
  }
  return true;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function deepFreeze<T>(value: T): T {
  if (Object(value) !== value || Object.isFrozen(value)) return value;
  for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  return Object.freeze(value);
}
