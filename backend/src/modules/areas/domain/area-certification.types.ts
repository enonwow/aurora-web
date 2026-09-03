export const AREA_CERTIFICATION_SCHEMA_VERSION = "area-certification.v1" as const;

export const AREA_PROOF_DIMENSIONS = [
  "inventory",
  "assetClosure",
  "render",
  "visualSeam",
  "setAdjacency",
  "pathReference",
  "pathConnect",
  "wokSeam",
  "persistence",
  "toolset",
  "nwnRuntime",
] as const;

export const AREA_PROOF_STATES = ["verified", "failed", "missing"] as const;

export const AREA_CERTIFICATION_SUBJECT_KINDS = [
  "area-capability",
  "tile-definition",
  "tile-group",
  "tile-connection",
] as const;

export type AreaCertificationSchemaVersion =
  typeof AREA_CERTIFICATION_SCHEMA_VERSION;

export type AreaProofDimension = (typeof AREA_PROOF_DIMENSIONS)[number];

export type AreaProofState = (typeof AREA_PROOF_STATES)[number];

export type AreaCertificationSubjectKind =
  (typeof AREA_CERTIFICATION_SUBJECT_KINDS)[number];

export type AreaCertificationReleaseScope = "development" | "production";

export type AreaCertificationEligibility =
  | Readonly<{
      status: "eligible";
      reason?: never;
    }>
  | Readonly<{
      status: "excluded";
      reason: string;
    }>;

export type AreaProofStates = Readonly<
  Record<AreaProofDimension, AreaProofState>
>;

export interface AreaCertificationSubjectIdentity {
  readonly kind: AreaCertificationSubjectKind;
  readonly id: string;
}

export interface AreaCertificationIdentity {
  readonly schemaVersion: AreaCertificationSchemaVersion;
  readonly planId: string;
  readonly corpusHash: string;
  readonly profileId: string;
  readonly subject: AreaCertificationSubjectIdentity;
}

/**
 * One immutable capability/certification ledger row.
 *
 * Development and explicitly excluded rows may exist before a complete proof
 * identity is available. An eligible production row may not: the validator
 * enforces its full plan, corpus, profile, and subject identity.
 */
export interface AreaCertificationRow {
  readonly rowId: string;
  readonly capabilityId: string;
  readonly releaseScope: AreaCertificationReleaseScope;
  readonly eligibility: AreaCertificationEligibility;
  readonly identity?: AreaCertificationIdentity;
  readonly proofs: AreaProofStates;
}
