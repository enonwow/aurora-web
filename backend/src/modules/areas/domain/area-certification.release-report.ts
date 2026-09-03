import { createHash } from "node:crypto";
import {
  aggregateAreaCertificationRows,
  type AreaCertificationAggregate,
} from "./area-certification.aggregate";
import {
  AREA_PROOF_DIMENSIONS,
  type AreaCertificationRow,
  type AreaProofDimension,
} from "./area-certification.types";
import { validateAreaCertificationRow } from "./area-certification.validation";
import {
  AREA_CERTIFICATION_PLAN_SCHEMA_VERSION_V2,
  computeAreaCertificationPlanId,
  fingerprintAreaCertificationPlanRows,
  type AreaCertificationReleasePlanV2,
} from "./area-certification.plan";

export const AREA_CERTIFICATION_PLAN_SCHEMA_VERSION =
  "area-certification-plan.v1" as const;
export const AREA_CERTIFICATION_RELEASE_REPORT_SCHEMA_VERSION =
  "area-certification-release-report.v1" as const;
export const MAX_AREA_CERTIFICATION_RELEASE_REPORT_ROWS = 100_000;

const SHA256_PATTERN = /^[a-f0-9]{64}$/u;

export interface AreaCertificationReleasePlanV1 {
  readonly schemaVersion: typeof AREA_CERTIFICATION_PLAN_SCHEMA_VERSION;
  readonly planId: string;
  readonly corpusHash: string;
  readonly profileId: string;
}

export type AreaCertificationReleasePlan =
  | AreaCertificationReleasePlanV1
  | AreaCertificationReleasePlanV2;

export interface AreaCertificationBlockingProofRows {
  readonly failedRowIds: readonly string[];
  readonly missingRowIds: readonly string[];
}

export interface AreaCertificationReleaseReport {
  readonly schemaVersion: typeof AREA_CERTIFICATION_RELEASE_REPORT_SCHEMA_VERSION;
  readonly generatedAtIso: string;
  readonly plan: AreaCertificationReleasePlan;
  readonly ledgerSha256: string;
  readonly aggregate: AreaCertificationAggregate;
  readonly release: {
    readonly status: "ready" | "blocked";
    readonly readyRowIds: readonly string[];
    readonly blockedRowIds: readonly string[];
    readonly excludedRowIds: readonly string[];
    readonly developmentRowIds: readonly string[];
    readonly blockerCodes: readonly (
      | "no_production_eligible_rows"
      | "production_rows_incomplete"
      | "unbounded_plan_membership"
    )[];
    readonly blockingProofs: Readonly<
      Partial<Record<AreaProofDimension, AreaCertificationBlockingProofRows>>
    >;
  };
  readonly rowLedger: readonly AreaCertificationRow[];
  readonly reportSha256: string;
}

export interface BuildAreaCertificationReleaseReportInput {
  readonly generatedAtIso: string;
  readonly plan: AreaCertificationReleasePlan;
  readonly rows: readonly AreaCertificationRow[];
}

export class InvalidAreaCertificationReleaseReportError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "InvalidAreaCertificationReleaseReportError";
    this.code = code;
  }
}

function fail(code: string, message: string): never {
  throw new InvalidAreaCertificationReleaseReportError(code, message);
}

function exactKeys(value: object, allowed: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...allowed].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

function isCanonicalIsoTimestamp(value: string): boolean {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString() === value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertExactRowContract(value: unknown): void {
  if (!isRecord(value)) return;
  if (!exactKeys(value, ["rowId", "capabilityId", "releaseScope", "eligibility", "identity", "proofs"]) &&
      !exactKeys(value, ["rowId", "capabilityId", "releaseScope", "eligibility", "proofs"])) {
    fail("invalid_row_keys", "Certification row contains unexpected or missing keys.");
  }
  if (isRecord(value.eligibility)) {
    const allowed = value.eligibility.status === "excluded" ? ["status", "reason"] : ["status"];
    if (!exactKeys(value.eligibility, allowed)) {
      fail("invalid_eligibility_keys", "Certification eligibility contains unexpected or missing keys.");
    }
  }
  if (isRecord(value.proofs) && !exactKeys(value.proofs, AREA_PROOF_DIMENSIONS)) {
    fail("invalid_proof_keys", "Certification proofs contain unexpected or missing dimensions.");
  }
  if (value.identity !== undefined && isRecord(value.identity)) {
    if (!exactKeys(value.identity, ["schemaVersion", "planId", "corpusHash", "profileId", "subject"])) {
      fail("invalid_identity_keys", "Certification identity contains unexpected or missing keys.");
    }
    if (isRecord(value.identity.subject) && !exactKeys(value.identity.subject, ["kind", "id"])) {
      fail("invalid_subject_keys", "Certification subject identity contains unexpected or missing keys.");
    }
  }
}

function validatePlan(value: AreaCertificationReleasePlan): AreaCertificationReleasePlan {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return fail("invalid_plan", "Certification release plan must be an object.");
  }
  const isV1 = value.schemaVersion === AREA_CERTIFICATION_PLAN_SCHEMA_VERSION;
  const isV2 = value.schemaVersion === AREA_CERTIFICATION_PLAN_SCHEMA_VERSION_V2;
  const expectedKeys = isV2
    ? [
        "schemaVersion",
        "planId",
        "corpusHash",
        "profileId",
        "rowCount",
        "plannedRowsSha256",
      ]
    : ["schemaVersion", "planId", "corpusHash", "profileId"];
  if (!exactKeys(value, expectedKeys)) {
    return fail("invalid_plan_keys", "Certification release plan contains unexpected or missing keys.");
  }
  if (!isV1 && !isV2) {
    return fail(
      "invalid_plan_schema",
      `Certification release plan schema must be ${AREA_CERTIFICATION_PLAN_SCHEMA_VERSION} or ${AREA_CERTIFICATION_PLAN_SCHEMA_VERSION_V2}.`,
    );
  }
  if (!SHA256_PATTERN.test(value.planId)) {
    return fail("invalid_plan_id", "Certification planId must be a lowercase SHA-256 digest.");
  }
  if (!SHA256_PATTERN.test(value.corpusHash)) {
    return fail(
      "invalid_plan_corpus_hash",
      "Certification corpusHash must be a lowercase SHA-256 digest.",
    );
  }
  if (
    typeof value.profileId !== "string" ||
    value.profileId.trim().length < 1 ||
    value.profileId.length > 256 ||
    value.profileId.includes("\0")
  ) {
    return fail("invalid_plan_profile", "Certification profileId must be a bounded non-empty string.");
  }
  if (isV2) {
    if (
      !Number.isInteger(value.rowCount) ||
      value.rowCount < 0 ||
      value.rowCount > MAX_AREA_CERTIFICATION_RELEASE_REPORT_ROWS
    ) {
      return fail(
        "invalid_plan_row_count",
        "Certification plan rowCount must fit the release-report row budget.",
      );
    }
    if (!SHA256_PATTERN.test(value.plannedRowsSha256)) {
      return fail(
        "invalid_plan_rows_fingerprint",
        "Certification plannedRowsSha256 must be a lowercase SHA-256 digest.",
      );
    }
    const normalized = Object.freeze({
      schemaVersion: AREA_CERTIFICATION_PLAN_SCHEMA_VERSION_V2,
      corpusHash: value.corpusHash,
      profileId: value.profileId,
      rowCount: value.rowCount,
      plannedRowsSha256: value.plannedRowsSha256,
    });
    if (computeAreaCertificationPlanId(normalized) !== value.planId) {
      return fail(
        "invalid_plan_id_binding",
        "Certification planId does not match the immutable v2 plan content.",
      );
    }
    return Object.freeze({ ...normalized, planId: value.planId });
  }
  return Object.freeze({
    schemaVersion: AREA_CERTIFICATION_PLAN_SCHEMA_VERSION,
    planId: value.planId,
    corpusHash: value.corpusHash,
    profileId: value.profileId,
  });
}

function validateAndOrderRows(
  rows: readonly AreaCertificationRow[],
  plan: AreaCertificationReleasePlan,
): readonly AreaCertificationRow[] {
  if (!Array.isArray(rows)) {
    return fail("invalid_row_ledger", "Certification row ledger must be an array.");
  }
  if (rows.length > MAX_AREA_CERTIFICATION_RELEASE_REPORT_ROWS) {
    return fail(
      "row_budget_exceeded",
      `Certification release reports support at most ${MAX_AREA_CERTIFICATION_RELEASE_REPORT_ROWS} rows.`,
    );
  }

  const seen = new Set<string>();
  const validated: AreaCertificationRow[] = [];
  for (const input of rows) {
    assertExactRowContract(input);
    const validation = validateAreaCertificationRow(input);
    if (!validation.valid) {
      return fail(
        "invalid_certification_row",
        `Certification row ${typeof input?.rowId === "string" ? input.rowId : "<unknown>"} is invalid: ${validation.issues.map((issue) => issue.code).join(", ")}.`,
      );
    }
    const row = validation.value;
    if (seen.has(row.rowId)) {
      return fail("duplicate_row_id", `Certification rowId ${row.rowId} is duplicated.`);
    }
    seen.add(row.rowId);
    if (
      row.identity &&
      (row.identity.planId !== plan.planId ||
        row.identity.corpusHash !== plan.corpusHash ||
        row.identity.profileId !== plan.profileId)
    ) {
      return fail(
        "row_plan_identity_mismatch",
        `Certification row ${row.rowId} does not belong to the requested immutable plan.`,
      );
    }
    validated.push(row);
  }
  validated.sort((left, right) => left.rowId.localeCompare(right.rowId));
  return Object.freeze(validated);
}

function sha256(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value), "utf8").digest("hex");
}

function buildRelease(
  rows: readonly AreaCertificationRow[],
  aggregate: AreaCertificationAggregate,
  plan: AreaCertificationReleasePlan,
): AreaCertificationReleaseReport["release"] {
  const readyRowIds: string[] = [];
  const blockedRowIds: string[] = [];
  const excludedRowIds: string[] = [];
  const developmentRowIds: string[] = [];
  const blockingProofs: Partial<
    Record<AreaProofDimension, { failedRowIds: string[]; missingRowIds: string[] }>
  > = {};

  for (const row of rows) {
    if (row.eligibility.status === "excluded") {
      excludedRowIds.push(row.rowId);
      continue;
    }
    if (row.releaseScope === "development") {
      developmentRowIds.push(row.rowId);
      continue;
    }

    let isReady = true;
    for (const dimension of AREA_PROOF_DIMENSIONS) {
      const state = row.proofs[dimension];
      if (state === "verified") continue;
      isReady = false;
      const current = blockingProofs[dimension] ?? { failedRowIds: [], missingRowIds: [] };
      current[state === "failed" ? "failedRowIds" : "missingRowIds"].push(row.rowId);
      blockingProofs[dimension] = current;
    }
    (isReady ? readyRowIds : blockedRowIds).push(row.rowId);
  }

  const blockerCodes: Array<
    | "no_production_eligible_rows"
    | "production_rows_incomplete"
    | "unbounded_plan_membership"
  > = [];
  if (plan.schemaVersion === AREA_CERTIFICATION_PLAN_SCHEMA_VERSION) {
    blockerCodes.push("unbounded_plan_membership");
  }
  if (aggregate.rows.productionEligible === 0) {
    blockerCodes.push("no_production_eligible_rows");
  } else if (aggregate.rows.productionBlocked > 0) {
    blockerCodes.push("production_rows_incomplete");
  }

  return deepFreeze({
    status: blockerCodes.length === 0 ? "ready" : "blocked",
    readyRowIds,
    blockedRowIds,
    excludedRowIds,
    developmentRowIds,
    blockerCodes,
    blockingProofs,
  });
}

function validatePlanMembership(
  plan: AreaCertificationReleasePlan,
  rows: readonly AreaCertificationRow[],
): void {
  if (plan.schemaVersion !== AREA_CERTIFICATION_PLAN_SCHEMA_VERSION_V2) return;
  if (rows.length !== plan.rowCount) {
    return fail(
      "plan_row_count_mismatch",
      `Certification ledger has ${rows.length} rows; immutable plan ${plan.planId} requires ${plan.rowCount}.`,
    );
  }
  const actualFingerprint = fingerprintAreaCertificationPlanRows(rows);
  if (actualFingerprint !== plan.plannedRowsSha256) {
    return fail(
      "plan_rows_fingerprint_mismatch",
      "Certification ledger capability, scope, eligibility, or subject membership differs from the immutable plan.",
    );
  }
}

export function buildAreaCertificationReleaseReport(
  input: BuildAreaCertificationReleaseReportInput,
): AreaCertificationReleaseReport {
  if (!input || typeof input !== "object") {
    return fail("invalid_input", "Certification release report input must be an object.");
  }
  if (!isCanonicalIsoTimestamp(input.generatedAtIso)) {
    return fail(
      "invalid_generated_at",
      "Certification release generatedAtIso must be a canonical ISO timestamp.",
    );
  }
  const plan = validatePlan(input.plan);
  const rowLedger = validateAndOrderRows(input.rows, plan);
  validatePlanMembership(plan, rowLedger);
  const aggregate = aggregateAreaCertificationRows(rowLedger);
  const release = buildRelease(rowLedger, aggregate, plan);
  const ledgerSha256 = sha256(rowLedger);
  const core = {
    schemaVersion: AREA_CERTIFICATION_RELEASE_REPORT_SCHEMA_VERSION,
    generatedAtIso: input.generatedAtIso,
    plan,
    ledgerSha256,
    aggregate,
    release,
    rowLedger,
  };
  return deepFreeze({
    ...core,
    reportSha256: sha256(core),
  });
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) {
    return value;
  }
  for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  return Object.freeze(value);
}
