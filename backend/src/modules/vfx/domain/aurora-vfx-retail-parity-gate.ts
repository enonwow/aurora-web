export type AuroraVfxRetailParityStatus =
  | "missing"
  | "captured"
  | "compared"
  | "passed"
  | "failed"
  | "unknown";

export type AuroraVfxRetailBehaviorClaim =
  | "canonical"
  | "diagnostic"
  | "preview_only";

export type AuroraVfxRetailRequiredCase =
  | "dm_visualeffect_row_duration"
  | "scripted_effect_visual_effect"
  | "scripted_effect_beam"
  | "explosion_plus_detonate"
  | "fountain_plus_atlas_playback"
  | "chunk_particles"
  | "p2p_gravity"
  | "linked_chain"
  | "punch_through_vs_mode2_lighten"
  | "plt_visual_known_layer_colors";

export type AuroraVfxRetailParityEvidenceKey =
  | "retailBuild"
  | "source"
  | "parserSnapshot"
  | "resolverTrace"
  | "runtimeTickDump"
  | "renderContractSnapshot"
  | "captureReference"
  | "comparison";

export interface AuroraVfxRetailParityEvidenceRef {
  path: string | null;
  hash: string | null;
  capturedAt?: string | null;
}

export interface AuroraVfxRetailBuildEvidence {
  buildId: string | null;
  buildProfile: string | null;
  client: string | null;
  captureMachine: string | null;
  evidenceRef: string | null;
}

export interface AuroraVfxRetailSourceEvidence {
  tableName: string | null;
  profile: string | null;
  tableHash: string | null;
  rowId: number | null;
  label: string | null;
  sourceAuthority: string | null;
}

export interface AuroraVfxRetailEffectContextEvidence {
  constructorKind:
    | "dm_visualeffect"
    | "EffectVisualEffect"
    | "EffectBeam"
    | "MDL_EMITTER"
    | "ITEM_PROPERTY_VISUAL"
    | string;
  applicationMode: "object" | "location" | "source_only" | string;
  durationType?: "instant" | "temporary" | "permanent" | string | null;
  durationSeconds?: number | null;
  sourceRowId?: number | null;
  targetRef?: string | null;
  effectorRef?: string | null;
  bodyNode?: string | null;
  rawInvocation: string | null;
  evidenceRef: string | null;
}

export interface AuroraVfxRetailCaptureReference {
  screenshotPath: string | null;
  videoPath: string | null;
  captureReference: string | null;
  notes?: string | null;
}

export interface AuroraVfxRetailComparisonEvidence {
  path: string | null;
  hash: string | null;
  result: "passed" | "failed" | "unknown" | null;
  comparedAt?: string | null;
}

export interface AuroraVfxRetailParityFixture {
  fixtureId: string;
  requiredCase: AuroraVfxRetailRequiredCase;
  title: string;
  status: AuroraVfxRetailParityStatus;
  behaviorClaim: AuroraVfxRetailBehaviorClaim;
  retailBuild: AuroraVfxRetailBuildEvidence;
  source: AuroraVfxRetailSourceEvidence;
  effectContext: AuroraVfxRetailEffectContextEvidence;
  parserSnapshot: AuroraVfxRetailParityEvidenceRef;
  resolverTrace: AuroraVfxRetailParityEvidenceRef;
  runtimeTickDump: AuroraVfxRetailParityEvidenceRef;
  renderContractSnapshot: AuroraVfxRetailParityEvidenceRef;
  captureReference: AuroraVfxRetailCaptureReference;
  comparison: AuroraVfxRetailComparisonEvidence;
  expectedDiagnostics: string[];
  notCanonicalReason: string | null;
  notes: string[];
}

export interface AuroraVfxRetailParityManifest {
  version: "aurora-vfx-retail-parity-manifest/v1";
  policy: {
    canonicalRequires: string[];
    screenshotAloneIsParityProof: false;
  };
  fixtures: AuroraVfxRetailParityFixture[];
}

export interface AuroraVfxRetailParityGateDiagnostic {
  code: string;
  severity: "info" | "warn" | "error";
  fixtureId?: string;
  message: string;
}

export interface AuroraVfxRetailParityFixtureGateResult {
  fixtureId: string;
  requiredCase: string;
  status: AuroraVfxRetailParityStatus;
  behaviorClaim: AuroraVfxRetailBehaviorClaim;
  evidence: {
    hasRetailBuild: boolean;
    hasSource: boolean;
    hasParserSnapshot: boolean;
    hasResolverTrace: boolean;
    hasRuntimeTickDump: boolean;
    hasRenderContractSnapshot: boolean;
    hasCaptureReference: boolean;
    hasComparison: boolean;
  };
  missingEvidence: AuroraVfxRetailParityEvidenceKey[];
  nextActions: string[];
  canonicalAllowed: boolean;
  diagnostics: AuroraVfxRetailParityGateDiagnostic[];
}

export interface AuroraVfxRetailParityManifestGateResult {
  version: "aurora-vfx-retail-parity-gate/v1";
  fixtureCount: number;
  canonicalAllowedFixtureCount: number;
  blockedFixtureCount: number;
  missingEvidenceSummary: Record<AuroraVfxRetailParityEvidenceKey, number>;
  allCanonicalClaimsValid: boolean;
  fixtures: AuroraVfxRetailParityFixtureGateResult[];
  diagnostics: AuroraVfxRetailParityGateDiagnostic[];
}

const MANIFEST_VERSION = "aurora-vfx-retail-parity-manifest/v1";

const STATUSES: readonly AuroraVfxRetailParityStatus[] = [
  "missing",
  "captured",
  "compared",
  "passed",
  "failed",
  "unknown"
] as const;

const BEHAVIOR_CLAIMS: readonly AuroraVfxRetailBehaviorClaim[] = [
  "canonical",
  "diagnostic",
  "preview_only"
] as const;

const EVIDENCE_KEYS: readonly AuroraVfxRetailParityEvidenceKey[] = [
  "retailBuild",
  "source",
  "parserSnapshot",
  "resolverTrace",
  "runtimeTickDump",
  "renderContractSnapshot",
  "captureReference",
  "comparison"
] as const;

const REQUIRED_CASES: readonly AuroraVfxRetailRequiredCase[] = [
  "dm_visualeffect_row_duration",
  "scripted_effect_visual_effect",
  "scripted_effect_beam",
  "explosion_plus_detonate",
  "fountain_plus_atlas_playback",
  "chunk_particles",
  "p2p_gravity",
  "linked_chain",
  "punch_through_vs_mode2_lighten",
  "plt_visual_known_layer_colors"
] as const;

const FIXTURE_ID_PATTERN = /^[a-z0-9][a-z0-9._-]*$/;

export function isAuroraVfxRetailParityStatus(
  value: unknown
): value is AuroraVfxRetailParityStatus {
  return typeof value === "string" && STATUSES.includes(value as AuroraVfxRetailParityStatus);
}

export function isAuroraVfxRetailBehaviorClaim(
  value: unknown
): value is AuroraVfxRetailBehaviorClaim {
  return (
    typeof value === "string" &&
    BEHAVIOR_CLAIMS.includes(value as AuroraVfxRetailBehaviorClaim)
  );
}

export function isAuroraVfxRetailRequiredCase(
  value: unknown
): value is AuroraVfxRetailRequiredCase {
  return (
    typeof value === "string" &&
    REQUIRED_CASES.includes(value as AuroraVfxRetailRequiredCase)
  );
}

export function isAuroraVfxRetailFixtureId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    FIXTURE_ID_PATTERN.test(value) &&
    value !== "_template"
  );
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function getAuroraVfxRetailParityStatuses(): readonly AuroraVfxRetailParityStatus[] {
  return STATUSES;
}

export function getAuroraVfxRetailBehaviorClaims(): readonly AuroraVfxRetailBehaviorClaim[] {
  return BEHAVIOR_CLAIMS;
}

export function getAuroraVfxRetailParityEvidenceKeys(): readonly AuroraVfxRetailParityEvidenceKey[] {
  return EVIDENCE_KEYS;
}

export function getAuroraVfxRetailParityRequiredCases(): readonly AuroraVfxRetailRequiredCase[] {
  return REQUIRED_CASES;
}

export function validateAuroraVfxRetailParityManifest(
  manifest: AuroraVfxRetailParityManifest
): AuroraVfxRetailParityManifestGateResult {
  const diagnostics: AuroraVfxRetailParityGateDiagnostic[] = [];
  const rawManifestFixtures: unknown[] = Array.isArray(manifest.fixtures) ? manifest.fixtures : [];
  const manifestFixtures = rawManifestFixtures.filter(isObjectRecord) as unknown as AuroraVfxRetailParityFixture[];
  const manifestPolicy: Record<string, unknown> = isObjectRecord(manifest.policy)
    ? manifest.policy
    : {};
  const fixtures = manifestFixtures.map(validateAuroraVfxRetailParityFixture);
  const presentCases = new Set(manifestFixtures.map((fixture) => fixture.requiredCase));
  const seenFixtureIds = new Set<string>();
  const fixturesByRequiredCase = new Map<
    AuroraVfxRetailRequiredCase,
    AuroraVfxRetailParityFixture[]
  >();

  if (manifest.version !== MANIFEST_VERSION) {
    diagnostics.push({
      code: "VFX_RETAIL_MANIFEST_VERSION_INVALID",
      severity: "error",
      message: `Retail parity manifest has invalid version '${String(manifest.version)}'.`
    });
  }

  if (!Array.isArray(manifest.fixtures)) {
    diagnostics.push({
      code: "VFX_RETAIL_MANIFEST_FIXTURES_LIST_INVALID",
      severity: "error",
      message: "Retail parity manifest fixtures must be an array."
    });
  }

  for (const [index, fixture] of rawManifestFixtures.entries()) {
    if (!isObjectRecord(fixture)) {
      diagnostics.push({
        code: "VFX_RETAIL_FIXTURE_ENTRY_INVALID",
        severity: "error",
        message: `Retail parity manifest fixture at index ${index} must be an object.`
      });
    }
  }

  for (const fixture of manifestFixtures) {
    if (!isAuroraVfxRetailFixtureId(fixture.fixtureId)) {
      diagnostics.push({
        code: "VFX_RETAIL_FIXTURE_ID_INVALID",
        severity: "error",
        fixtureId: fixture.fixtureId,
        message: `Retail parity manifest has invalid fixtureId '${fixture.fixtureId}'.`
      });
    }

    if (seenFixtureIds.has(fixture.fixtureId)) {
      diagnostics.push({
        code: "VFX_RETAIL_FIXTURE_ID_DUPLICATE",
        severity: "error",
        fixtureId: fixture.fixtureId,
        message: `Retail parity manifest has duplicate fixtureId '${fixture.fixtureId}'.`
      });
    }
    seenFixtureIds.add(fixture.fixtureId);

    if (isAuroraVfxRetailRequiredCase(fixture.requiredCase)) {
      const matchingFixtures = fixturesByRequiredCase.get(fixture.requiredCase) ?? [];
      matchingFixtures.push(fixture);
      fixturesByRequiredCase.set(fixture.requiredCase, matchingFixtures);
    }
  }

  for (const requiredCase of REQUIRED_CASES) {
    if (!presentCases.has(requiredCase)) {
      diagnostics.push({
        code: "VFX_RETAIL_REQUIRED_CASE_MISSING",
        severity: "error",
        message: `Retail parity manifest is missing required case '${requiredCase}'.`
      });
    }
  }

  for (const [requiredCase, matchingFixtures] of fixturesByRequiredCase) {
    for (const duplicateFixture of matchingFixtures.slice(1)) {
      diagnostics.push({
        code: "VFX_RETAIL_REQUIRED_CASE_DUPLICATE",
        severity: "error",
        fixtureId: duplicateFixture.fixtureId,
        message: `Retail parity manifest has duplicate required case '${requiredCase}'.`
      });
    }
  }

  if (!isObjectRecord(manifest.policy)) {
    diagnostics.push({
      code: "VFX_RETAIL_MANIFEST_POLICY_INVALID",
      severity: "error",
      message: "Retail parity manifest policy must be an object."
    });
  }

  if (manifestPolicy.screenshotAloneIsParityProof !== false) {
    diagnostics.push({
      code: "VFX_RETAIL_SCREENSHOT_ALONE_POLICY_FORBIDDEN",
      severity: "error",
      message: "Retail parity policy must state that screenshots/videos alone are not parity proof."
    });
  }

  if (!Array.isArray(manifestPolicy.canonicalRequires)) {
    diagnostics.push({
      code: "VFX_RETAIL_CANONICAL_POLICY_EVIDENCE_LIST_INVALID",
      severity: "error",
      message: "Retail parity policy canonicalRequires must be an array of evidence keys."
    });
  }

  const canonicalRequires = Array.isArray(manifestPolicy.canonicalRequires)
    ? manifestPolicy.canonicalRequires
    : [];
  const seenCanonicalEvidenceKeys = new Set<string>();
  for (const evidenceKey of EVIDENCE_KEYS) {
    if (!canonicalRequires.includes(evidenceKey)) {
      diagnostics.push({
        code: "VFX_RETAIL_CANONICAL_POLICY_EVIDENCE_REQUIRED",
        severity: "error",
        message: `Retail parity policy canonicalRequires is missing '${evidenceKey}'.`
      });
    }
  }
  for (const evidenceKey of canonicalRequires) {
    if (seenCanonicalEvidenceKeys.has(evidenceKey)) {
      diagnostics.push({
        code: "VFX_RETAIL_CANONICAL_POLICY_EVIDENCE_DUPLICATE",
        severity: "error",
        message: `Retail parity policy canonicalRequires contains duplicate evidence key '${String(evidenceKey)}'.`
      });
    }
    seenCanonicalEvidenceKeys.add(evidenceKey);

    if (!EVIDENCE_KEYS.includes(evidenceKey as AuroraVfxRetailParityEvidenceKey)) {
      diagnostics.push({
        code: "VFX_RETAIL_CANONICAL_POLICY_EVIDENCE_UNKNOWN",
        severity: "error",
        message: `Retail parity policy canonicalRequires contains unknown evidence key '${String(evidenceKey)}'.`
      });
    }
  }

  const allDiagnostics = [
    ...diagnostics,
    ...fixtures.flatMap((fixture) => fixture.diagnostics)
  ];

  return {
    version: "aurora-vfx-retail-parity-gate/v1",
    fixtureCount: rawManifestFixtures.length,
    canonicalAllowedFixtureCount: fixtures.filter((fixture) => fixture.canonicalAllowed).length,
    blockedFixtureCount: fixtures.filter((fixture) => !fixture.canonicalAllowed).length,
    missingEvidenceSummary: summarizeMissingEvidence(fixtures),
    allCanonicalClaimsValid: fixtures.every(
      (fixture) => fixture.behaviorClaim !== "canonical" || fixture.canonicalAllowed
    ),
    fixtures,
    diagnostics: allDiagnostics
  };
}

export function validateAuroraVfxRetailParityFixture(
  fixture: AuroraVfxRetailParityFixture
): AuroraVfxRetailParityFixtureGateResult {
  const diagnostics: AuroraVfxRetailParityGateDiagnostic[] = [];
  const evidence = {
    hasRetailBuild: hasRetailBuildEvidence(fixture),
    hasSource: hasSourceEvidence(fixture),
    hasParserSnapshot: hasEvidenceRef(fixture.parserSnapshot),
    hasResolverTrace: hasEvidenceRef(fixture.resolverTrace),
    hasRuntimeTickDump: hasEvidenceRef(fixture.runtimeTickDump),
    hasRenderContractSnapshot: hasEvidenceRef(fixture.renderContractSnapshot),
    hasCaptureReference: hasCaptureReference(fixture.captureReference),
    hasComparison: hasComparisonEvidence(fixture.comparison)
  };

  if (!isAuroraVfxRetailParityStatus(fixture.status)) {
    diagnostics.push(fixtureDiagnostic(
      fixture,
      "VFX_RETAIL_FIXTURE_STATUS_INVALID",
      "error",
      `Retail parity fixture has invalid status '${String(fixture.status)}'.`
    ));
  }

  if (!isAuroraVfxRetailRequiredCase(fixture.requiredCase)) {
    diagnostics.push(fixtureDiagnostic(
      fixture,
      "VFX_RETAIL_REQUIRED_CASE_INVALID",
      "error",
      `Retail parity fixture has invalid requiredCase '${String(fixture.requiredCase)}'.`
    ));
  }

  if (!isAuroraVfxRetailBehaviorClaim(fixture.behaviorClaim)) {
    diagnostics.push(fixtureDiagnostic(
      fixture,
      "VFX_RETAIL_BEHAVIOR_CLAIM_INVALID",
      "error",
      `Retail parity fixture has invalid behaviorClaim '${String(fixture.behaviorClaim)}'.`
    ));
  }

  if (!isObjectRecord(fixture.parserSnapshot)) {
    diagnostics.push(fixtureDiagnostic(
      fixture,
      "VFX_RETAIL_PARSER_SNAPSHOT_REF_INVALID",
      "error",
      "Parser snapshot evidence reference must be an object."
    ));
  }

  if (!isObjectRecord(fixture.resolverTrace)) {
    diagnostics.push(fixtureDiagnostic(
      fixture,
      "VFX_RETAIL_RESOLVER_TRACE_REF_INVALID",
      "error",
      "Resolver trace evidence reference must be an object."
    ));
  }

  addMissingEvidenceDiagnostics(fixture, evidence, diagnostics);

  if (
    evidence.hasCaptureReference &&
    (!evidence.hasParserSnapshot || !evidence.hasResolverTrace || !evidence.hasRuntimeTickDump)
  ) {
    diagnostics.push(fixtureDiagnostic(
      fixture,
      "VFX_RETAIL_SCREENSHOT_ALONE_NOT_PARITY_PROOF",
      "error",
      "Screenshot/video capture is present, but parser snapshot, resolver trace, and runtime dump are required before parity can be claimed."
    ));
  }

  if (
    ["passed", "compared", "failed"].includes(fixture.status) &&
    !evidence.hasComparison
  ) {
    diagnostics.push(fixtureDiagnostic(
      fixture,
      "VFX_RETAIL_COMPARISON_EVIDENCE_REQUIRED",
      "error",
      "Compared/passed/failed retail parity fixtures require comparison evidence."
    ));
  }

  const missingEvidence = collectMissingEvidence(evidence);
  const canonicalAllowed = canAuroraVfxFixtureBeCanonical(fixture, evidence);

  if (fixture.behaviorClaim === "canonical" && !canonicalAllowed) {
    diagnostics.push(fixtureDiagnostic(
      fixture,
      "VFX_CANONICAL_RETAIL_EVIDENCE_REQUIRED",
      "error",
      "VFX behavior cannot be labelled canonical without source, parser, resolver, runtime, render, capture, comparison, and retail build evidence."
    ));
  }

  return {
    fixtureId: fixture.fixtureId,
    requiredCase: fixture.requiredCase,
    status: fixture.status,
    behaviorClaim: fixture.behaviorClaim,
    evidence,
    missingEvidence,
    nextActions: buildNextActions(fixture, missingEvidence),
    canonicalAllowed,
    diagnostics
  };
}

export function canAuroraVfxFixtureBeCanonical(
  fixture: AuroraVfxRetailParityFixture,
  evidence = {
    hasRetailBuild: hasRetailBuildEvidence(fixture),
    hasSource: hasSourceEvidence(fixture),
    hasParserSnapshot: hasEvidenceRef(fixture.parserSnapshot),
    hasResolverTrace: hasEvidenceRef(fixture.resolverTrace),
    hasRuntimeTickDump: hasEvidenceRef(fixture.runtimeTickDump),
    hasRenderContractSnapshot: hasEvidenceRef(fixture.renderContractSnapshot),
    hasCaptureReference: hasCaptureReference(fixture.captureReference),
    hasComparison: hasComparisonEvidence(fixture.comparison)
  }
): boolean {
  return (
    fixture.status === "passed" &&
    evidence.hasRetailBuild &&
    evidence.hasSource &&
    evidence.hasParserSnapshot &&
    evidence.hasResolverTrace &&
    evidence.hasRuntimeTickDump &&
    evidence.hasRenderContractSnapshot &&
    evidence.hasCaptureReference &&
    evidence.hasComparison &&
    fixture.comparison.result === "passed"
  );
}

function addMissingEvidenceDiagnostics(
  fixture: AuroraVfxRetailParityFixture,
  evidence: AuroraVfxRetailParityFixtureGateResult["evidence"],
  diagnostics: AuroraVfxRetailParityGateDiagnostic[]
): void {
  const required = [
    ["hasRetailBuild", "VFX_RETAIL_BUILD_PROFILE_REQUIRED", "Retail build/profile evidence is required."],
    ["hasSource", "VFX_RETAIL_SOURCE_EVIDENCE_REQUIRED", "Source table/profile/hash and row identity are required."],
    ["hasParserSnapshot", "VFX_RETAIL_PARSER_SNAPSHOT_REQUIRED", "Parser snapshot JSON evidence is required."],
    ["hasResolverTrace", "VFX_RETAIL_RESOLVER_TRACE_REQUIRED", "Resolver trace evidence is required."],
    ["hasRuntimeTickDump", "VFX_RETAIL_RUNTIME_DUMP_REQUIRED", "Runtime tick dump evidence is required."],
    ["hasRenderContractSnapshot", "VFX_RETAIL_RENDER_CONTRACT_SNAPSHOT_REQUIRED", "Render contract snapshot evidence is required."],
    ["hasCaptureReference", "VFX_RETAIL_CAPTURE_REFERENCE_REQUIRED", "Screenshot/video capture reference is required."],
    ["hasComparison", "VFX_RETAIL_COMPARISON_EVIDENCE_REQUIRED", "Comparison evidence is required."]
  ] as const;

  for (const [key, code, message] of required) {
    if (!evidence[key]) {
      diagnostics.push(fixtureDiagnostic(fixture, code, "warn", message));
    }
  }
}

function collectMissingEvidence(
  evidence: AuroraVfxRetailParityFixtureGateResult["evidence"]
): AuroraVfxRetailParityEvidenceKey[] {
  const missing: AuroraVfxRetailParityEvidenceKey[] = [];
  if (!evidence.hasRetailBuild) {
    missing.push("retailBuild");
  }
  if (!evidence.hasSource) {
    missing.push("source");
  }
  if (!evidence.hasParserSnapshot) {
    missing.push("parserSnapshot");
  }
  if (!evidence.hasResolverTrace) {
    missing.push("resolverTrace");
  }
  if (!evidence.hasRuntimeTickDump) {
    missing.push("runtimeTickDump");
  }
  if (!evidence.hasRenderContractSnapshot) {
    missing.push("renderContractSnapshot");
  }
  if (!evidence.hasCaptureReference) {
    missing.push("captureReference");
  }
  if (!evidence.hasComparison) {
    missing.push("comparison");
  }
  return missing;
}

function summarizeMissingEvidence(
  fixtures: AuroraVfxRetailParityFixtureGateResult[]
): Record<AuroraVfxRetailParityEvidenceKey, number> {
  const summary: Record<AuroraVfxRetailParityEvidenceKey, number> = {
    retailBuild: 0,
    source: 0,
    parserSnapshot: 0,
    resolverTrace: 0,
    runtimeTickDump: 0,
    renderContractSnapshot: 0,
    captureReference: 0,
    comparison: 0
  };
  for (const fixture of fixtures) {
    for (const key of fixture.missingEvidence) {
      summary[key] += 1;
    }
  }
  return summary;
}

function buildNextActions(
  fixture: AuroraVfxRetailParityFixture,
  missingEvidence: AuroraVfxRetailParityEvidenceKey[]
): string[] {
  return missingEvidence.map((key) => {
    switch (key) {
      case "retailBuild":
        return `Record retail build/profile/client metadata for ${fixture.fixtureId}.`;
      case "source":
        return `Attach source table/profile/hash plus row id/label for ${fixture.fixtureId}.`;
      case "parserSnapshot":
        return `Generate parser snapshot JSON for ${fixture.fixtureId}.`;
      case "resolverTrace":
        return `Capture resolver trace with source-policy/resource provenance for ${fixture.fixtureId}.`;
      case "runtimeTickDump":
        return `Capture deterministic runtime tick dump for ${fixture.fixtureId}.`;
      case "renderContractSnapshot":
        return `Store renderer-agnostic render contract snapshot for ${fixture.fixtureId}.`;
      case "captureReference":
        return `Attach screenshot/video/capture metadata reference for ${fixture.fixtureId}.`;
      case "comparison":
        return `Run and store comparison JSON for ${fixture.fixtureId}.`;
    }
  });
}

function hasRetailBuildEvidence(fixture: AuroraVfxRetailParityFixture): boolean {
  return Boolean(
    fixture.retailBuild.buildId &&
      fixture.retailBuild.buildProfile &&
      fixture.retailBuild.client &&
      fixture.retailBuild.evidenceRef
  );
}

function hasSourceEvidence(fixture: AuroraVfxRetailParityFixture): boolean {
  return Boolean(
    fixture.source.tableName &&
      fixture.source.profile &&
      fixture.source.tableHash &&
      typeof fixture.source.rowId === "number" &&
      fixture.source.label
  );
}

function hasEvidenceRef(ref: unknown): boolean {
  if (!isObjectRecord(ref)) {
    return false;
  }
  return Boolean(ref.path && ref.hash);
}

function hasCaptureReference(ref: AuroraVfxRetailCaptureReference): boolean {
  return Boolean(ref.screenshotPath || ref.videoPath || ref.captureReference);
}

function hasComparisonEvidence(ref: AuroraVfxRetailComparisonEvidence): boolean {
  return Boolean(ref.path && ref.hash && ref.result);
}

function fixtureDiagnostic(
  fixture: AuroraVfxRetailParityFixture,
  code: string,
  severity: AuroraVfxRetailParityGateDiagnostic["severity"],
  message: string
): AuroraVfxRetailParityGateDiagnostic {
  return {
    code,
    severity,
    fixtureId: fixture.fixtureId,
    message
  };
}
