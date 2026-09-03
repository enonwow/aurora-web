import { z } from "zod";

export const AREA_CAPABILITY_SCOPES = [
  "lifecycle",
  "topology",
  "properties",
  "objects",
  "workspace",
  "render",
  "connectivity",
  "certification",
] as const;
export const AREA_CAPABILITY_OWNERS = ["backend", "frontend", "shared", "proof"] as const;
export const AREA_CAPABILITY_EVIDENCE_STATES = [
  "verified",
  "project_policy",
  "not_required",
  "missing",
] as const;
export const AREA_CAPABILITY_IMPLEMENTATION_STATES = [
  "implemented",
  "partial",
  "preserve_only",
  "not_started",
] as const;
export const AREA_CAPABILITY_RELEASE_STATES = ["available", "blocked", "hidden"] as const;

export type AreaCapabilityScope = (typeof AREA_CAPABILITY_SCOPES)[number];
export type AreaCapabilityOwner = (typeof AREA_CAPABILITY_OWNERS)[number];
export type AreaCapabilityEvidenceState = (typeof AREA_CAPABILITY_EVIDENCE_STATES)[number];
export type AreaCapabilityImplementationState =
  (typeof AREA_CAPABILITY_IMPLEMENTATION_STATES)[number];
export type AreaCapabilityReleaseState = (typeof AREA_CAPABILITY_RELEASE_STATES)[number];

export interface AreaCapabilityItem {
  readonly id: string;
  readonly scope: AreaCapabilityScope;
  readonly label: string;
  readonly owner: AreaCapabilityOwner;
  readonly auroraEvidence: AreaCapabilityEvidenceState;
  readonly implementation: AreaCapabilityImplementationState;
  readonly release: AreaCapabilityReleaseState;
  readonly testIds: readonly string[];
  readonly proofIds: readonly string[];
  readonly blockers: readonly string[];
}

export interface AreaCapabilityCatalog {
  readonly schemaVersion: "area-capabilities.v1";
  readonly catalogRevision: string;
  readonly items: readonly Readonly<AreaCapabilityItem>[];
  readonly summary: Readonly<{
    total: number;
    implementation: Readonly<Record<AreaCapabilityImplementationState, number>>;
    release: Readonly<Record<AreaCapabilityReleaseState, number>>;
  }>;
}

export type AreaCapabilityAvailability = Readonly<
  | { available: true; reason: "available" }
  | { available: false; reason: "blocked" | "hidden" | "absent" }
>;

const itemIdSchema = z.string().regex(/^[a-z][a-z0-9_]{2,95}$/u);
const blockerSchema = z.string().regex(/^[a-z0-9][a-z0-9_]{2,127}$/u);
const referenceSchema = z.string().min(1).max(512).refine((value) => !value.includes("\0"));
const itemSchema = z.object({
  id: itemIdSchema,
  scope: z.enum(AREA_CAPABILITY_SCOPES),
  label: z.string().min(1).max(256).refine((value) => !value.includes("\0")),
  owner: z.enum(AREA_CAPABILITY_OWNERS),
  auroraEvidence: z.enum(AREA_CAPABILITY_EVIDENCE_STATES),
  implementation: z.enum(AREA_CAPABILITY_IMPLEMENTATION_STATES),
  release: z.enum(AREA_CAPABILITY_RELEASE_STATES),
  testIds: z.array(referenceSchema).max(128),
  proofIds: z.array(referenceSchema).max(32),
  blockers: z.array(blockerSchema).max(64),
}).strict();
const summarySchema = z.object({
  total: z.number().int().min(0).max(256),
  implementation: z.object({
    implemented: z.number().int().min(0).max(256),
    partial: z.number().int().min(0).max(256),
    preserve_only: z.number().int().min(0).max(256),
    not_started: z.number().int().min(0).max(256),
  }).strict(),
  release: z.object({
    available: z.number().int().min(0).max(256),
    blocked: z.number().int().min(0).max(256),
    hidden: z.number().int().min(0).max(256),
  }).strict(),
}).strict();
const catalogSchema = z.object({
  schemaVersion: z.literal("area-capabilities.v1"),
  catalogRevision: z.string().regex(/^\d{4}-\d{2}-\d{2}\.[1-9]\d*$/u),
  items: z.array(itemSchema).max(256),
  summary: summarySchema,
}).strict();

function deriveSummary(items: readonly AreaCapabilityItem[]) {
  const implementation: Record<AreaCapabilityImplementationState, number> = {
    implemented: 0,
    partial: 0,
    preserve_only: 0,
    not_started: 0,
  };
  const release: Record<AreaCapabilityReleaseState, number> = {
    available: 0,
    blocked: 0,
    hidden: 0,
  };
  for (const item of items) {
    implementation[item.implementation] += 1;
    release[item.release] += 1;
  }
  return {
    total: items.length,
    implementation,
    release,
  };
}

function freezeCatalog(value: z.infer<typeof catalogSchema>): AreaCapabilityCatalog {
  const items = Object.freeze(value.items.map((item) => Object.freeze({
    ...item,
    testIds: Object.freeze([...item.testIds]),
    proofIds: Object.freeze([...item.proofIds]),
    blockers: Object.freeze([...item.blockers]),
  })));
  const summary = deriveSummary(items);
  return Object.freeze({
    schemaVersion: "area-capabilities.v1",
    catalogRevision: value.catalogRevision,
    items,
    summary: Object.freeze({
      total: summary.total,
      implementation: Object.freeze(summary.implementation),
      release: Object.freeze(summary.release),
    }),
  });
}

export function readAreaCapabilityCatalog(value: unknown): AreaCapabilityCatalog | null {
  const parsed = catalogSchema.safeParse(value);
  if (!parsed.success) return null;
  const ids = parsed.data.items.map((item) => item.id);
  const sorted = [...ids].sort((left, right) => left.localeCompare(right));
  if (new Set(ids).size !== ids.length || ids.some((id, index) => id !== sorted[index])) {
    return null;
  }
  for (const item of parsed.data.items) {
    if (item.release === "available" &&
      (item.implementation !== "implemented" || item.auroraEvidence === "missing")) {
      return null;
    }
    if ((item.implementation === "preserve_only" || item.implementation === "not_started") &&
      item.release === "available") {
      return null;
    }
    if (item.auroraEvidence === "verified" && item.testIds.length + item.proofIds.length === 0) {
      return null;
    }
  }
  const normalized = freezeCatalog(parsed.data);
  if (JSON.stringify(normalized.summary) !== JSON.stringify(parsed.data.summary)) return null;
  return normalized;
}

export function resolveAreaCapabilityAvailability(
  catalog: AreaCapabilityCatalog,
  capabilityId: string,
): AreaCapabilityAvailability {
  const capability = catalog.items.find((item) => item.id === capabilityId);
  if (!capability) return { available: false, reason: "absent" };
  if (capability.release !== "available") {
    return { available: false, reason: capability.release };
  }
  return { available: true, reason: "available" };
}
