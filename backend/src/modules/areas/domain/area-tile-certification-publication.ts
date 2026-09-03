import { createHash } from "node:crypto";
import {
  buildAreaCertificationPlan,
  type AreaCertificationReleasePlanV2,
} from "./area-certification.plan";
import {
  buildAreaCertificationReleaseReport,
  type AreaCertificationReleaseReport,
} from "./area-certification.release-report";
import type { AreaProofStates } from "./area-certification.types";

export const AREA_TILE_CERTIFICATION_PUBLICATION_POLICY_VERSION =
  "area-tile-certification-publication-policy.v1" as const;

export const AREA_TILE_CERTIFICATION_CAPABILITY_ID =
  "topology_certified_placement_gate" as const;

export const AREA_TILE_CERTIFICATION_PLACEHOLDER_REASON =
  "TILE_MODEL_INTENTIONAL_PLACEHOLDER" as const;

export const AREA_TILE_MODEL_SOURCE_STATUSES = [
  "source_resolved",
  "source_missing",
  "intentional_placeholder",
  "invalid_missing_model_field",
] as const;

export type AreaTileModelSourceStatus =
  (typeof AREA_TILE_MODEL_SOURCE_STATUSES)[number];

export interface AreaTileCertificationPublicationBinding {
  readonly catalogSha256: string;
  readonly sourceInventorySha256: string;
  readonly modelSourceInventorySha256: string;
  readonly matrixPlanId: string;
  readonly matrixManifestSchema: string;
  readonly matrixContractRevision: string;
  readonly matrixContractFingerprint: string;
  readonly runtimeBuildProfileId: string;
  readonly runtimeBuildProfileSha256: string;
  readonly runtimeBuildBindingSha256: string;
  readonly profileId: string;
}

export interface AreaTileCertificationCatalogRow {
  readonly tilesetResRef: string;
  readonly tileId: number;
  readonly modelSourceStatus: AreaTileModelSourceStatus;
}

export interface AreaTileCertificationPublicationInput {
  readonly generatedAtIso: string;
  readonly binding: AreaTileCertificationPublicationBinding;
  readonly catalogRows: readonly AreaTileCertificationCatalogRow[];
  readonly acceptedAddRenderSubjects: readonly string[];
}

export interface AreaTileCertificationCorpusDescriptor {
  readonly policyVersion: typeof AREA_TILE_CERTIFICATION_PUBLICATION_POLICY_VERSION;
  readonly catalogSha256: string;
  readonly sourceInventorySha256: string;
  readonly modelSourceInventorySha256: string;
  readonly matrixPlanId: string;
  readonly matrixManifestSchema: string;
  readonly matrixContractRevision: string;
  readonly matrixContractFingerprint: string;
  readonly runtimeBuildProfileId: string;
  readonly runtimeBuildProfileSha256: string;
  readonly runtimeBuildBindingSha256: string;
  readonly profileId: string;
}

export interface AreaTileCertificationPublication {
  readonly corpus: AreaTileCertificationCorpusDescriptor;
  readonly corpusHash: string;
  readonly plan: AreaCertificationReleasePlanV2;
  readonly report: AreaCertificationReleaseReport;
}

export class InvalidAreaTileCertificationPublicationError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "InvalidAreaTileCertificationPublicationError";
    this.code = code;
  }
}

const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const TILESET_RESREF_PATTERN = /^[a-z0-9_]{1,16}$/u;
const TILE_SUBJECT_PATTERN = /^([a-z0-9_]{1,16}):(0|[1-9][0-9]{0,5})$/u;
const MAX_TILE_ID = 999_999;
const MAX_ROWS = 100_000;

const ALL_MISSING_PROOFS: AreaProofStates = Object.freeze({
  inventory: "missing",
  assetClosure: "missing",
  render: "missing",
  visualSeam: "missing",
  setAdjacency: "missing",
  pathReference: "missing",
  pathConnect: "missing",
  wokSeam: "missing",
  persistence: "missing",
  toolset: "missing",
  nwnRuntime: "missing",
});

function fail(code: string, message: string): never {
  throw new InvalidAreaTileCertificationPublicationError(code, message);
}

export function buildAreaTileCertificationPublication(
  input: AreaTileCertificationPublicationInput,
): AreaTileCertificationPublication {
  assertInput(input);
  const binding = validateBinding(input.binding);
  if (!isCanonicalIsoTimestamp(input.generatedAtIso)) {
    return fail(
      "invalid_generated_at",
      "Tile-certification publication time must be a canonical ISO timestamp.",
    );
  }

  const accepted = validateAcceptedSubjects(input.acceptedAddRenderSubjects);
  const rows = validateCatalogRows(input.catalogRows);
  const rowsBySubject = new Map(rows.map((row) => [subjectId(row), row]));
  for (const acceptedSubject of accepted) {
    const row = rowsBySubject.get(acceptedSubject);
    if (!row) {
      return fail(
        "accepted_subject_not_in_catalog",
        `Accepted Add/Render subject ${acceptedSubject} is not in the immutable catalog.`,
      );
    }
    if (row.modelSourceStatus !== "source_resolved") {
      return fail(
        "accepted_subject_not_source_resolved",
        `Accepted Add/Render subject ${acceptedSubject} is not source-resolved.`,
      );
    }
  }

  const corpus = deepFreeze({
    policyVersion: AREA_TILE_CERTIFICATION_PUBLICATION_POLICY_VERSION,
    catalogSha256: binding.catalogSha256,
    sourceInventorySha256: binding.sourceInventorySha256,
    modelSourceInventorySha256: binding.modelSourceInventorySha256,
    matrixPlanId: binding.matrixPlanId,
    matrixManifestSchema: binding.matrixManifestSchema,
    matrixContractRevision: binding.matrixContractRevision,
    matrixContractFingerprint: binding.matrixContractFingerprint,
    runtimeBuildProfileId: binding.runtimeBuildProfileId,
    runtimeBuildProfileSha256: binding.runtimeBuildProfileSha256,
    runtimeBuildBindingSha256: binding.runtimeBuildBindingSha256,
    profileId: binding.profileId,
  });
  const corpusHash = sha256(corpus);
  const builtPlan = buildAreaCertificationPlan({
    corpusHash,
    profileId: binding.profileId,
    rows: rows.map((row) => toPlanSeed(row, accepted.has(subjectId(row)))),
  });
  const report = buildAreaCertificationReleaseReport({
    generatedAtIso: input.generatedAtIso,
    plan: builtPlan.plan,
    rows: builtPlan.rows,
  });
  return deepFreeze({
    corpus,
    corpusHash,
    plan: builtPlan.plan,
    report,
  });
}

function assertInput(value: unknown): asserts value is AreaTileCertificationPublicationInput {
  if (!isRecord(value) || !exactKeys(value, [
    "generatedAtIso",
    "binding",
    "catalogRows",
    "acceptedAddRenderSubjects",
  ])) {
    return fail(
      "invalid_input",
      "Tile-certification publication input contains unexpected or missing keys.",
    );
  }
}

function validateBinding(
  value: unknown,
): AreaTileCertificationPublicationBinding {
  const keys = [
    "catalogSha256",
    "sourceInventorySha256",
    "modelSourceInventorySha256",
    "matrixPlanId",
    "matrixManifestSchema",
    "matrixContractRevision",
    "matrixContractFingerprint",
    "runtimeBuildProfileId",
    "runtimeBuildProfileSha256",
    "runtimeBuildBindingSha256",
    "profileId",
  ];
  if (!isRecord(value) || !exactKeys(value, keys)) {
    return fail(
      "invalid_binding",
      "Tile-certification publication binding contains unexpected or missing keys.",
    );
  }
  for (const key of [
    "catalogSha256",
    "sourceInventorySha256",
    "modelSourceInventorySha256",
    "matrixPlanId",
    "matrixContractFingerprint",
    "runtimeBuildProfileSha256",
    "runtimeBuildBindingSha256",
  ] as const) {
    if (!SHA256_PATTERN.test(String(value[key] ?? ""))) {
      return fail("invalid_binding", `Publication binding ${key} must be a lowercase SHA-256.`);
    }
  }
  for (const key of [
    "matrixManifestSchema",
    "matrixContractRevision",
    "runtimeBuildProfileId",
    "profileId",
  ] as const) {
    if (!isBoundedText(value[key], 256)) {
      return fail("invalid_binding", `Publication binding ${key} must be bounded text.`);
    }
  }
  return deepFreeze({
    catalogSha256: value.catalogSha256 as string,
    sourceInventorySha256: value.sourceInventorySha256 as string,
    modelSourceInventorySha256: value.modelSourceInventorySha256 as string,
    matrixPlanId: value.matrixPlanId as string,
    matrixManifestSchema: value.matrixManifestSchema as string,
    matrixContractRevision: value.matrixContractRevision as string,
    matrixContractFingerprint: value.matrixContractFingerprint as string,
    runtimeBuildProfileId: value.runtimeBuildProfileId as string,
    runtimeBuildProfileSha256: value.runtimeBuildProfileSha256 as string,
    runtimeBuildBindingSha256: value.runtimeBuildBindingSha256 as string,
    profileId: value.profileId as string,
  });
}

function validateCatalogRows(
  value: unknown,
): readonly AreaTileCertificationCatalogRow[] {
  if (!Array.isArray(value) || value.length > MAX_ROWS) {
    return fail("invalid_catalog_rows", `Publication supports at most ${MAX_ROWS} catalog rows.`);
  }
  const seen = new Set<string>();
  const result: AreaTileCertificationCatalogRow[] = [];
  for (const candidate of value) {
    if (!isRecord(candidate) || !exactKeys(candidate, [
      "tilesetResRef",
      "tileId",
      "modelSourceStatus",
    ])) {
      return fail(
        "invalid_catalog_row",
        "Tile-certification catalog row contains unexpected or missing keys.",
      );
    }
    if (
      typeof candidate.tilesetResRef !== "string" ||
      !TILESET_RESREF_PATTERN.test(candidate.tilesetResRef) ||
      !Number.isInteger(candidate.tileId) ||
      (candidate.tileId as number) < 0 ||
      (candidate.tileId as number) > MAX_TILE_ID
    ) {
      return fail("invalid_catalog_row", "Tile-certification catalog identity is invalid.");
    }
    if (
      typeof candidate.modelSourceStatus !== "string" ||
      !AREA_TILE_MODEL_SOURCE_STATUSES.includes(
        candidate.modelSourceStatus as AreaTileModelSourceStatus,
      )
    ) {
      return fail(
        "unknown_model_source_status",
        "Tile-certification catalog model-source status is unsupported.",
      );
    }
    const row = deepFreeze({
      tilesetResRef: candidate.tilesetResRef,
      tileId: candidate.tileId as number,
      modelSourceStatus: candidate.modelSourceStatus as AreaTileModelSourceStatus,
    });
    const subject = subjectId(row);
    if (seen.has(subject)) {
      return fail(
        "duplicate_catalog_subject",
        `Tile-certification catalog subject ${subject} is duplicated.`,
      );
    }
    seen.add(subject);
    result.push(row);
  }
  result.sort((left, right) => subjectId(left).localeCompare(subjectId(right)));
  return Object.freeze(result);
}

function validateAcceptedSubjects(value: unknown): ReadonlySet<string> {
  if (!Array.isArray(value) || value.length > MAX_ROWS) {
    return fail("invalid_accepted_subjects", "Accepted Add/Render subjects must be bounded.");
  }
  const result = new Set<string>();
  for (const candidate of value) {
    if (typeof candidate !== "string" || !TILE_SUBJECT_PATTERN.test(candidate)) {
      return fail(
        "invalid_accepted_subject",
        "Accepted Add/Render subject must be a canonical tileset:Tile_ID identity.",
      );
    }
    if (result.has(candidate)) {
      return fail(
        "duplicate_accepted_subject",
        `Accepted Add/Render subject ${candidate} is duplicated.`,
      );
    }
    result.add(candidate);
  }
  return result;
}

function toPlanSeed(
  row: AreaTileCertificationCatalogRow,
  addRenderAccepted: boolean,
) {
  const proofs: AreaProofStates = {
    ...ALL_MISSING_PROOFS,
    inventory: row.modelSourceStatus === "source_resolved"
      ? "verified"
      : row.modelSourceStatus === "intentional_placeholder"
        ? "missing"
        : "failed",
    assetClosure: addRenderAccepted ? "verified" : "missing",
    render: addRenderAccepted ? "verified" : "missing",
  };
  return {
    rowId: `tile:${subjectId(row)}`,
    capabilityId: AREA_TILE_CERTIFICATION_CAPABILITY_ID,
    releaseScope: "production" as const,
    eligibility: row.modelSourceStatus === "intentional_placeholder"
      ? {
          status: "excluded" as const,
          reason: AREA_TILE_CERTIFICATION_PLACEHOLDER_REASON,
        }
      : { status: "eligible" as const },
    subject: {
      kind: "tile-definition" as const,
      id: subjectId(row),
    },
    proofs,
  };
}

function subjectId(row: AreaTileCertificationCatalogRow): string {
  return `${row.tilesetResRef}:${row.tileId}`;
}

function isCanonicalIsoTimestamp(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString() === value;
}

function isBoundedText(value: unknown, maxLength: number): value is string {
  return typeof value === "string" &&
    value.trim().length > 0 &&
    value.length <= maxLength &&
    !value.includes("\0");
}

function exactKeys(value: object, expected: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const sortedExpected = [...expected].sort();
  return actual.length === sortedExpected.length &&
    actual.every((key, index) => key === sortedExpected[index]);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sha256(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value), "utf8").digest("hex");
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
