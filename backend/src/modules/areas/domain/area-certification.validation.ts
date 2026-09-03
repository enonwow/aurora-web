import {
  AREA_CERTIFICATION_SCHEMA_VERSION,
  AREA_CERTIFICATION_SUBJECT_KINDS,
  AREA_PROOF_DIMENSIONS,
  AREA_PROOF_STATES,
  type AreaCertificationEligibility,
  type AreaCertificationIdentity,
  type AreaCertificationReleaseScope,
  type AreaCertificationRow,
  type AreaCertificationSubjectIdentity,
  type AreaProofState,
  type AreaProofStates,
} from "./area-certification.types";

export type AreaCertificationValidationIssueCode =
  | "invalid_row"
  | "required_string"
  | "invalid_release_scope"
  | "invalid_eligibility"
  | "exclusion_reason_required"
  | "eligible_reason_forbidden"
  | "production_identity_required"
  | "invalid_identity"
  | "invalid_schema_version"
  | "invalid_subject_kind"
  | "invalid_proof_state";

export interface AreaCertificationValidationIssue {
  readonly code: AreaCertificationValidationIssueCode;
  readonly path: string;
  readonly message: string;
}

export type AreaCertificationValidationResult =
  | Readonly<{
      valid: true;
      value: AreaCertificationRow;
    }>
  | Readonly<{
      valid: false;
      issues: readonly AreaCertificationValidationIssue[];
    }>;

const RELEASE_SCOPES = new Set<AreaCertificationReleaseScope>([
  "development",
  "production",
]);

const PROOF_STATES = new Set<AreaProofState>(AREA_PROOF_STATES);
const SUBJECT_KINDS = new Set(AREA_CERTIFICATION_SUBJECT_KINDS);

export function validateAreaCertificationRow(
  input: unknown,
): AreaCertificationValidationResult {
  if (!isRecord(input)) {
    return invalid([
      issue("invalid_row", "$", "Certification row must be an object."),
    ]);
  }

  const issues: AreaCertificationValidationIssue[] = [];

  validateRequiredString(input.rowId, "rowId", issues);
  validateRequiredString(input.capabilityId, "capabilityId", issues);

  const releaseScope = readReleaseScope(input.releaseScope, issues);
  const eligibility = readEligibility(input.eligibility, issues);
  const identity = readIdentity(input.identity, issues);
  const proofs = readProofs(input.proofs, issues);

  if (
    releaseScope === "production" &&
    eligibility?.status === "eligible" &&
    input.identity === undefined
  ) {
    issues.push(
      issue(
        "production_identity_required",
        "identity",
        "An eligible production row requires immutable plan, corpus, profile, and subject identity.",
      ),
    );
  }

  if (
    issues.length > 0 ||
    releaseScope === undefined ||
    eligibility === undefined ||
    proofs === undefined
  ) {
    return invalid(issues);
  }

  const value: AreaCertificationRow = {
    rowId: input.rowId as string,
    capabilityId: input.capabilityId as string,
    releaseScope,
    eligibility,
    ...(identity === undefined ? {} : { identity }),
    proofs,
  };

  return Object.freeze({
    valid: true,
    value: deepFreeze(value),
  });
}

function readReleaseScope(
  value: unknown,
  issues: AreaCertificationValidationIssue[],
): AreaCertificationReleaseScope | undefined {
  if (
    typeof value !== "string" ||
    !RELEASE_SCOPES.has(value as AreaCertificationReleaseScope)
  ) {
    issues.push(
      issue(
        "invalid_release_scope",
        "releaseScope",
        "Release scope must be development or production.",
      ),
    );
    return undefined;
  }
  return value as AreaCertificationReleaseScope;
}

function readEligibility(
  value: unknown,
  issues: AreaCertificationValidationIssue[],
): AreaCertificationEligibility | undefined {
  if (!isRecord(value)) {
    issues.push(
      issue(
        "invalid_eligibility",
        "eligibility",
        "Eligibility must be an eligible or excluded object.",
      ),
    );
    return undefined;
  }

  if (value.status === "eligible") {
    if (Object.prototype.hasOwnProperty.call(value, "reason")) {
      issues.push(
        issue(
          "eligible_reason_forbidden",
          "eligibility.reason",
          "An eligible row cannot carry an exclusion reason.",
        ),
      );
      return undefined;
    }
    return Object.freeze({ status: "eligible" });
  }

  if (value.status === "excluded") {
    if (!isNonBlankString(value.reason)) {
      issues.push(
        issue(
          "exclusion_reason_required",
          "eligibility.reason",
          "An excluded row requires a non-blank immutable reason.",
        ),
      );
      return undefined;
    }
    return Object.freeze({ status: "excluded", reason: value.reason });
  }

  issues.push(
    issue(
      "invalid_eligibility",
      "eligibility.status",
      "Eligibility status must be eligible or excluded.",
    ),
  );
  return undefined;
}

function readIdentity(
  value: unknown,
  issues: AreaCertificationValidationIssue[],
): AreaCertificationIdentity | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (!isRecord(value)) {
    issues.push(
      issue(
        "invalid_identity",
        "identity",
        "Certification identity must be an object when present.",
      ),
    );
    return undefined;
  }

  if (value.schemaVersion !== AREA_CERTIFICATION_SCHEMA_VERSION) {
    issues.push(
      issue(
        "invalid_schema_version",
        "identity.schemaVersion",
        `Schema version must be ${AREA_CERTIFICATION_SCHEMA_VERSION}.`,
      ),
    );
  }
  validateRequiredString(value.planId, "identity.planId", issues);
  validateRequiredString(value.corpusHash, "identity.corpusHash", issues);
  validateRequiredString(value.profileId, "identity.profileId", issues);

  const subject = readSubjectIdentity(value.subject, issues);
  if (
    value.schemaVersion !== AREA_CERTIFICATION_SCHEMA_VERSION ||
    !isNonBlankString(value.planId) ||
    !isNonBlankString(value.corpusHash) ||
    !isNonBlankString(value.profileId) ||
    subject === undefined
  ) {
    return undefined;
  }

  return Object.freeze({
    schemaVersion: AREA_CERTIFICATION_SCHEMA_VERSION,
    planId: value.planId,
    corpusHash: value.corpusHash,
    profileId: value.profileId,
    subject,
  });
}

function readSubjectIdentity(
  value: unknown,
  issues: AreaCertificationValidationIssue[],
): AreaCertificationSubjectIdentity | undefined {
  if (!isRecord(value)) {
    issues.push(
      issue(
        "invalid_identity",
        "identity.subject",
        "Certification subject identity must be an object.",
      ),
    );
    return undefined;
  }

  if (
    typeof value.kind !== "string" ||
    !SUBJECT_KINDS.has(
      value.kind as (typeof AREA_CERTIFICATION_SUBJECT_KINDS)[number],
    )
  ) {
    issues.push(
      issue(
        "invalid_subject_kind",
        "identity.subject.kind",
        "Certification subject kind is not supported.",
      ),
    );
  }
  validateRequiredString(value.id, "identity.subject.id", issues);

  if (
    typeof value.kind !== "string" ||
    !SUBJECT_KINDS.has(
      value.kind as (typeof AREA_CERTIFICATION_SUBJECT_KINDS)[number],
    ) ||
    !isNonBlankString(value.id)
  ) {
    return undefined;
  }

  return Object.freeze({
    kind: value.kind as (typeof AREA_CERTIFICATION_SUBJECT_KINDS)[number],
    id: value.id,
  });
}

function readProofs(
  value: unknown,
  issues: AreaCertificationValidationIssue[],
): AreaProofStates | undefined {
  if (!isRecord(value)) {
    for (const dimension of AREA_PROOF_DIMENSIONS) {
      issues.push(invalidProofStateIssue(dimension));
    }
    return undefined;
  }

  const proofs: Partial<Record<(typeof AREA_PROOF_DIMENSIONS)[number], AreaProofState>> = {};
  for (const dimension of AREA_PROOF_DIMENSIONS) {
    const proofState = value[dimension];
    if (
      typeof proofState !== "string" ||
      !PROOF_STATES.has(proofState as AreaProofState)
    ) {
      issues.push(invalidProofStateIssue(dimension));
      continue;
    }
    proofs[dimension] = proofState as AreaProofState;
  }

  if (issues.some((entry) => entry.code === "invalid_proof_state")) {
    return undefined;
  }
  return Object.freeze(proofs as AreaProofStates);
}

function validateRequiredString(
  value: unknown,
  path: string,
  issues: AreaCertificationValidationIssue[],
): void {
  if (!isNonBlankString(value)) {
    issues.push(
      issue("required_string", path, `${path} must be a non-blank string.`),
    );
  }
}

function invalidProofStateIssue(
  dimension: (typeof AREA_PROOF_DIMENSIONS)[number],
): AreaCertificationValidationIssue {
  return issue(
    "invalid_proof_state",
    `proofs.${dimension}`,
    `${dimension} must be verified, failed, or missing.`,
  );
}

function issue(
  code: AreaCertificationValidationIssueCode,
  path: string,
  message: string,
): AreaCertificationValidationIssue {
  return Object.freeze({ code, path, message });
}

function invalid(
  issues: readonly AreaCertificationValidationIssue[],
): AreaCertificationValidationResult {
  return Object.freeze({
    valid: false,
    issues: Object.freeze([...issues]),
  });
}

function isNonBlankString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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
