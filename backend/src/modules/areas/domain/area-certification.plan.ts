import { createHash } from "node:crypto";
import {
  AREA_CERTIFICATION_SCHEMA_VERSION,
  AREA_PROOF_DIMENSIONS,
  type AreaCertificationEligibility,
  type AreaCertificationReleaseScope,
  type AreaCertificationRow,
  type AreaCertificationSubjectIdentity,
  type AreaProofStates,
} from "./area-certification.types";
import { validateAreaCertificationRow } from "./area-certification.validation";

export const AREA_CERTIFICATION_PLAN_SCHEMA_VERSION_V2 =
  "area-certification-plan.v2" as const;
export const MAX_AREA_CERTIFICATION_PLAN_ROWS = 100_000;

const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const PLACEHOLDER_PLAN_ID = "0".repeat(64);

export interface AreaCertificationPlanRowSeed {
  readonly rowId: string;
  readonly capabilityId: string;
  readonly releaseScope: AreaCertificationReleaseScope;
  readonly eligibility: AreaCertificationEligibility;
  readonly subject: AreaCertificationSubjectIdentity;
  readonly proofs: AreaProofStates;
}

export interface AreaCertificationReleasePlanV2 {
  readonly schemaVersion: typeof AREA_CERTIFICATION_PLAN_SCHEMA_VERSION_V2;
  readonly planId: string;
  readonly corpusHash: string;
  readonly profileId: string;
  readonly rowCount: number;
  readonly plannedRowsSha256: string;
}

export type AreaCertificationReleasePlanV2Core = Omit<
  AreaCertificationReleasePlanV2,
  "planId"
>;

export interface BuildAreaCertificationPlanInput {
  readonly corpusHash: string;
  readonly profileId: string;
  readonly rows: readonly AreaCertificationPlanRowSeed[];
}

export interface AreaCertificationPlanBuildResult {
  readonly plan: AreaCertificationReleasePlanV2;
  readonly rows: readonly AreaCertificationRow[];
}

interface PlannedRowDescriptor {
  readonly rowId: string;
  readonly capabilityId: string;
  readonly releaseScope: AreaCertificationReleaseScope;
  readonly eligibility: AreaCertificationEligibility;
  readonly subject: AreaCertificationSubjectIdentity | null;
}

export class InvalidAreaCertificationPlanError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "InvalidAreaCertificationPlanError";
    this.code = code;
  }
}

function fail(code: string, message: string): never {
  throw new InvalidAreaCertificationPlanError(code, message);
}

export function buildAreaCertificationPlan(
  input: BuildAreaCertificationPlanInput,
): AreaCertificationPlanBuildResult {
  if (!isRecord(input)) {
    return fail("invalid_input", "Certification plan input must be an object.");
  }
  if (!exactKeys(input, ["corpusHash", "profileId", "rows"])) {
    return fail(
      "invalid_input_keys",
      "Certification plan input contains unexpected or missing keys.",
    );
  }
  if (!SHA256_PATTERN.test(input.corpusHash)) {
    return fail(
      "invalid_corpus_hash",
      "Certification plan corpusHash must be a lowercase SHA-256 digest.",
    );
  }
  if (!isBoundedText(input.profileId, 256)) {
    return fail(
      "invalid_profile_id",
      "Certification plan profileId must be a bounded non-empty string.",
    );
  }
  if (!Array.isArray(input.rows)) {
    return fail("invalid_rows", "Certification plan rows must be an array.");
  }
  if (input.rows.length > MAX_AREA_CERTIFICATION_PLAN_ROWS) {
    return fail(
      "row_budget_exceeded",
      `Certification plans support at most ${MAX_AREA_CERTIFICATION_PLAN_ROWS} rows.`,
    );
  }

  const seen = new Set<string>();
  const validatedSeeds: AreaCertificationPlanRowSeed[] = [];
  for (const seed of input.rows) {
    assertExactSeedContract(seed);
    const candidate = seedToRow(
      seed,
      PLACEHOLDER_PLAN_ID,
      input.corpusHash,
      input.profileId,
    );
    const validation = validateAreaCertificationRow(candidate);
    if (!validation.valid) {
      return fail(
        "invalid_certification_row",
        `Certification plan row ${readRowId(seed)} is invalid: ${validation.issues
          .map((issue) => issue.code)
          .join(", ")}.`,
      );
    }
    if (seen.has(validation.value.rowId)) {
      return fail(
        "duplicate_row_id",
        `Certification plan rowId ${validation.value.rowId} is duplicated.`,
      );
    }
    seen.add(validation.value.rowId);
    validatedSeeds.push(deepFreeze({
      rowId: validation.value.rowId,
      capabilityId: validation.value.capabilityId,
      releaseScope: validation.value.releaseScope,
      eligibility: validation.value.eligibility,
      subject: validation.value.identity!.subject,
      proofs: validation.value.proofs,
    }));
  }
  validatedSeeds.sort((left, right) => left.rowId.localeCompare(right.rowId));

  const plannedRowsSha256 = sha256(
    validatedSeeds.map((seed) => seedToDescriptor(seed)),
  );
  const planCore = {
    schemaVersion: AREA_CERTIFICATION_PLAN_SCHEMA_VERSION_V2,
    corpusHash: input.corpusHash,
    profileId: input.profileId,
    rowCount: validatedSeeds.length,
    plannedRowsSha256,
  } as const;
  const plan = deepFreeze({
    ...planCore,
    planId: computeAreaCertificationPlanId(planCore),
  });
  const rows = Object.freeze(
    validatedSeeds.map((seed) =>
      deepFreeze(seedToRow(seed, plan.planId, plan.corpusHash, plan.profileId)),
    ),
  );
  return deepFreeze({ plan, rows });
}

export function computeAreaCertificationPlanId(
  plan: AreaCertificationReleasePlanV2Core,
): string {
  return sha256(plan);
}

export function fingerprintAreaCertificationPlanRows(
  rows: readonly AreaCertificationRow[],
): string {
  const descriptors = rows
    .map((row): PlannedRowDescriptor => ({
      rowId: row.rowId,
      capabilityId: row.capabilityId,
      releaseScope: row.releaseScope,
      eligibility: row.eligibility,
      subject: row.identity?.subject ?? null,
    }))
    .sort((left, right) => left.rowId.localeCompare(right.rowId));
  return sha256(descriptors);
}

function seedToRow(
  seed: AreaCertificationPlanRowSeed,
  planId: string,
  corpusHash: string,
  profileId: string,
): AreaCertificationRow {
  return {
    rowId: seed.rowId,
    capabilityId: seed.capabilityId,
    releaseScope: seed.releaseScope,
    eligibility: seed.eligibility,
    identity: {
      schemaVersion: AREA_CERTIFICATION_SCHEMA_VERSION,
      planId,
      corpusHash,
      profileId,
      subject: seed.subject,
    },
    proofs: seed.proofs,
  };
}

function seedToDescriptor(seed: AreaCertificationPlanRowSeed): PlannedRowDescriptor {
  return {
    rowId: seed.rowId,
    capabilityId: seed.capabilityId,
    releaseScope: seed.releaseScope,
    eligibility: seed.eligibility,
    subject: seed.subject,
  };
}

function assertExactSeedContract(value: unknown): asserts value is AreaCertificationPlanRowSeed {
  if (!isRecord(value) || !exactKeys(value, [
    "rowId",
    "capabilityId",
    "releaseScope",
    "eligibility",
    "subject",
    "proofs",
  ])) {
    return fail(
      "invalid_row_keys",
      "Certification plan row contains unexpected or missing keys.",
    );
  }
  if (!isRecord(value.eligibility)) {
    return fail("invalid_eligibility_keys", "Certification plan eligibility must be an object.");
  }
  const eligibilityKeys = value.eligibility.status === "excluded"
    ? ["status", "reason"]
    : ["status"];
  if (!exactKeys(value.eligibility, eligibilityKeys)) {
    return fail(
      "invalid_eligibility_keys",
      "Certification plan eligibility contains unexpected or missing keys.",
    );
  }
  if (!isRecord(value.subject) || !exactKeys(value.subject, ["kind", "id"])) {
    return fail(
      "invalid_subject_keys",
      "Certification plan subject contains unexpected or missing keys.",
    );
  }
  if (!isRecord(value.proofs) || !exactKeys(value.proofs, AREA_PROOF_DIMENSIONS)) {
    return fail(
      "invalid_proof_keys",
      "Certification plan proofs contain unexpected or missing dimensions.",
    );
  }
}

function exactKeys(value: object, allowed: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...allowed].sort();
  return actual.length === expected.length &&
    actual.every((key, index) => key === expected[index]);
}

function readRowId(value: unknown): string {
  return isRecord(value) && typeof value.rowId === "string" ? value.rowId : "<unknown>";
}

function isBoundedText(value: unknown, maxLength: number): value is string {
  return typeof value === "string" &&
    value.trim().length > 0 &&
    value.length <= maxLength &&
    !value.includes("\0");
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
  for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  return Object.freeze(value);
}
