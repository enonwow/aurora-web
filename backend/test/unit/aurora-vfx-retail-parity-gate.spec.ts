import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  canAuroraVfxFixtureBeCanonical,
  getAuroraVfxRetailBehaviorClaims,
  getAuroraVfxRetailParityEvidenceKeys,
  getAuroraVfxRetailParityRequiredCases,
  getAuroraVfxRetailParityStatuses,
  isAuroraVfxRetailBehaviorClaim,
  isAuroraVfxRetailFixtureId,
  isAuroraVfxRetailParityStatus,
  isAuroraVfxRetailRequiredCase,
  validateAuroraVfxRetailParityFixture,
  validateAuroraVfxRetailParityManifest,
  type AuroraVfxRetailParityFixture,
  type AuroraVfxRetailParityManifest,
  type AuroraVfxRetailParityStatus
} from "../../src/modules/vfx/domain/aurora-vfx-retail-parity-gate";

describe("Aurora VFX retail parity gate", () => {
  it("validates manifest completeness and keeps missing retail captures blocked", () => {
    const manifest = readManifest();
    const result = validateAuroraVfxRetailParityManifest(manifest);

    expect(manifest.fixtures.map((fixture) => fixture.requiredCase).sort()).toEqual(
      [...getAuroraVfxRetailParityRequiredCases()].sort()
    );
    expect(result.fixtureCount).toBe(getAuroraVfxRetailParityRequiredCases().length);
    expect(result.canonicalAllowedFixtureCount).toBe(0);
    expect(result.blockedFixtureCount).toBe(result.fixtureCount);
    expect(result.missingEvidenceSummary.retailBuild).toBe(result.fixtureCount);
    expect(result.missingEvidenceSummary.runtimeTickDump).toBe(result.fixtureCount);
    expect(result.missingEvidenceSummary.captureReference).toBe(result.fixtureCount);
    expect(Object.keys(result.missingEvidenceSummary).sort()).toEqual(
      [...getAuroraVfxRetailParityEvidenceKeys()].sort()
    );
    expect(result.allCanonicalClaimsValid).toBe(true);
    expect(result.diagnostics.map((entry) => entry.code)).toContain(
      "VFX_RETAIL_RUNTIME_DUMP_REQUIRED"
    );
  });

  it("declares expected capture and comparison blockers for fixtures missing those evidence refs", () => {
    const manifest = readManifest();

    const missingDeclarations = manifest.fixtures.flatMap((fixture) => {
      const result = validateAuroraVfxRetailParityFixture(fixture);
      const expectedDiagnostics = new Set(fixture.expectedDiagnostics);
      const missing: string[] = [];

      if (
        result.missingEvidence.includes("captureReference") &&
        !expectedDiagnostics.has("VFX_RETAIL_CAPTURE_REFERENCE_REQUIRED")
      ) {
        missing.push(`${fixture.fixtureId}:VFX_RETAIL_CAPTURE_REFERENCE_REQUIRED`);
      }
      if (
        result.missingEvidence.includes("comparison") &&
        !expectedDiagnostics.has("VFX_RETAIL_COMPARISON_EVIDENCE_REQUIRED")
      ) {
        missing.push(`${fixture.fixtureId}:VFX_RETAIL_COMPARISON_EVIDENCE_REQUIRED`);
      }

      return missing;
    });

    expect(missingDeclarations).toEqual([]);
  });

  it("declares expected retail build blockers for fixtures missing build/profile evidence", () => {
    const manifest = readManifest();

    const missingDeclarations = manifest.fixtures
      .filter((fixture) =>
        validateAuroraVfxRetailParityFixture(fixture).missingEvidence.includes("retailBuild")
      )
      .filter((fixture) =>
        !fixture.expectedDiagnostics.includes("VFX_RETAIL_BUILD_PROFILE_REQUIRED")
      )
      .map((fixture) => `${fixture.fixtureId}:VFX_RETAIL_BUILD_PROFILE_REQUIRED`);

    expect(missingDeclarations).toEqual([]);
  });

  it("declares expected parser, resolver, runtime, and render blockers when those refs are missing", () => {
    const manifest = readManifest();
    const requiredDiagnostics = [
      ["parserSnapshot", "VFX_RETAIL_PARSER_SNAPSHOT_REQUIRED"],
      ["resolverTrace", "VFX_RETAIL_RESOLVER_TRACE_REQUIRED"],
      ["runtimeTickDump", "VFX_RETAIL_RUNTIME_DUMP_REQUIRED"],
      ["renderContractSnapshot", "VFX_RETAIL_RENDER_CONTRACT_SNAPSHOT_REQUIRED"]
    ] as const;

    const missingDeclarations = manifest.fixtures.flatMap((fixture) => {
      const result = validateAuroraVfxRetailParityFixture(fixture);
      return requiredDiagnostics
        .filter(([key, code]) =>
          result.missingEvidence.includes(key) && !fixture.expectedDiagnostics.includes(code)
        )
        .map(([, code]) => `${fixture.fixtureId}:${code}`);
    });

    expect(missingDeclarations).toEqual([]);
  });

  it("declares expected source blockers for fixtures missing source row identity", () => {
    const manifest = readManifest();

    const missingDeclarations = manifest.fixtures
      .filter((fixture) =>
        validateAuroraVfxRetailParityFixture(fixture).missingEvidence.includes("source")
      )
      .filter((fixture) =>
        !fixture.expectedDiagnostics.includes("VFX_RETAIL_SOURCE_EVIDENCE_REQUIRED")
      )
      .map((fixture) => `${fixture.fixtureId}:VFX_RETAIL_SOURCE_EVIDENCE_REQUIRED`);

    expect(missingDeclarations).toEqual([]);
  });

  it("rejects manifest policy that allows screenshots as parity proof", () => {
    const manifest = {
      ...readManifest(),
      policy: {
        ...readManifest().policy,
        screenshotAloneIsParityProof: true as false
      }
    } satisfies AuroraVfxRetailParityManifest;

    const result = validateAuroraVfxRetailParityManifest(manifest);

    expect(result.canonicalAllowedFixtureCount).toBe(0);
    expect(result.diagnostics.map((entry) => entry.code)).toContain(
      "VFX_RETAIL_SCREENSHOT_ALONE_POLICY_FORBIDDEN"
    );
  });

  it("rejects unknown retail parity manifest versions at runtime", () => {
    const manifest = {
      ...readManifest(),
      version: "aurora-vfx-retail-parity-manifest/v2"
    } as unknown as AuroraVfxRetailParityManifest;

    const result = validateAuroraVfxRetailParityManifest(manifest);

    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "VFX_RETAIL_MANIFEST_VERSION_INVALID",
          severity: "error",
          message: "Retail parity manifest has invalid version 'aurora-vfx-retail-parity-manifest/v2'."
        })
      ])
    );
  });

  it("rejects retail parity manifests whose fixtures list is not an array", () => {
    const manifest = {
      ...readManifest(),
      fixtures: "not-a-fixture-list"
    } as unknown as AuroraVfxRetailParityManifest;

    const result = validateAuroraVfxRetailParityManifest(manifest);

    expect(result.fixtureCount).toBe(0);
    expect(result.canonicalAllowedFixtureCount).toBe(0);
    expect(result.blockedFixtureCount).toBe(0);
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "VFX_RETAIL_MANIFEST_FIXTURES_LIST_INVALID",
          severity: "error",
          message: "Retail parity manifest fixtures must be an array."
        })
      ])
    );
    expect(result.diagnostics.map((entry) => entry.code)).toContain(
      "VFX_RETAIL_REQUIRED_CASE_MISSING"
    );
  });

  it("rejects retail parity manifests whose policy is not an object", () => {
    const manifest = {
      ...readManifest(),
      policy: "not-a-policy"
    } as unknown as AuroraVfxRetailParityManifest;

    const result = validateAuroraVfxRetailParityManifest(manifest);
    const diagnosticCodes = result.diagnostics.map((entry) => entry.code);

    expect(result.fixtureCount).toBe(getAuroraVfxRetailParityRequiredCases().length);
    expect(result.canonicalAllowedFixtureCount).toBe(0);
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "VFX_RETAIL_MANIFEST_POLICY_INVALID",
          severity: "error",
          message: "Retail parity manifest policy must be an object."
        })
      ])
    );
    expect(diagnosticCodes).toContain("VFX_RETAIL_SCREENSHOT_ALONE_POLICY_FORBIDDEN");
    expect(diagnosticCodes).toContain("VFX_RETAIL_CANONICAL_POLICY_EVIDENCE_LIST_INVALID");
    expect(diagnosticCodes).toContain("VFX_RETAIL_CANONICAL_POLICY_EVIDENCE_REQUIRED");
  });

  it("rejects retail parity manifests with non-object fixture entries", () => {
    const manifest = readManifest();
    const result = validateAuroraVfxRetailParityManifest({
      ...manifest,
      fixtures: ["not-a-fixture", ...manifest.fixtures.slice(1)]
    } as unknown as AuroraVfxRetailParityManifest);

    expect(result.fixtureCount).toBe(manifest.fixtures.length);
    expect(result.fixtures).toHaveLength(manifest.fixtures.length - 1);
    expect(result.canonicalAllowedFixtureCount).toBe(0);
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "VFX_RETAIL_FIXTURE_ENTRY_INVALID",
          severity: "error",
          message: "Retail parity manifest fixture at index 0 must be an object."
        })
      ])
    );
    expect(result.diagnostics.map((entry) => entry.code)).toContain(
      "VFX_RETAIL_REQUIRED_CASE_MISSING"
    );
  });

  it("keeps the canonical policy evidence chain aligned with required evidence keys", () => {
    const manifest = readManifest();
    const result = validateAuroraVfxRetailParityManifest(manifest);

    expect([...manifest.policy.canonicalRequires].sort()).toEqual(
      [...getAuroraVfxRetailParityEvidenceKeys()].sort()
    );
    expect(result.diagnostics.map((entry) => entry.code)).not.toContain(
      "VFX_RETAIL_CANONICAL_POLICY_EVIDENCE_REQUIRED"
    );
  });

  it("rejects canonical policy that omits required evidence keys", () => {
    const manifest = readManifest();
    const result = validateAuroraVfxRetailParityManifest({
      ...manifest,
      policy: {
        ...manifest.policy,
        canonicalRequires: manifest.policy.canonicalRequires.filter(
          (evidenceKey) => evidenceKey !== "runtimeTickDump"
        )
      }
    });

    expect(result.canonicalAllowedFixtureCount).toBe(0);
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "VFX_RETAIL_CANONICAL_POLICY_EVIDENCE_REQUIRED",
          severity: "error",
          message: "Retail parity policy canonicalRequires is missing 'runtimeTickDump'."
        })
      ])
    );
  });

  it("rejects canonical policy evidence list when it is not an array", () => {
    const manifest = {
      ...readManifest(),
      policy: {
        ...readManifest().policy,
        canonicalRequires: "retailBuild"
      }
    } as unknown as AuroraVfxRetailParityManifest;

    const result = validateAuroraVfxRetailParityManifest(manifest);

    expect(result.canonicalAllowedFixtureCount).toBe(0);
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "VFX_RETAIL_CANONICAL_POLICY_EVIDENCE_LIST_INVALID",
          severity: "error",
          message: "Retail parity policy canonicalRequires must be an array of evidence keys."
        })
      ])
    );
  });

  it("rejects canonical policy with unknown evidence keys", () => {
    const manifest = readManifest();
    const result = validateAuroraVfxRetailParityManifest({
      ...manifest,
      policy: {
        ...manifest.policy,
        canonicalRequires: [...manifest.policy.canonicalRequires, "screenshotOnly"]
      }
    });

    expect(result.canonicalAllowedFixtureCount).toBe(0);
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "VFX_RETAIL_CANONICAL_POLICY_EVIDENCE_UNKNOWN",
          severity: "error",
          message: "Retail parity policy canonicalRequires contains unknown evidence key 'screenshotOnly'."
        })
      ])
    );
  });

  it("rejects canonical policy with duplicate evidence keys", () => {
    const manifest = readManifest();
    const result = validateAuroraVfxRetailParityManifest({
      ...manifest,
      policy: {
        ...manifest.policy,
        canonicalRequires: [...manifest.policy.canonicalRequires, "runtimeTickDump"]
      }
    });

    expect(result.canonicalAllowedFixtureCount).toBe(0);
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "VFX_RETAIL_CANONICAL_POLICY_EVIDENCE_DUPLICATE",
          severity: "error",
          message: "Retail parity policy canonicalRequires contains duplicate evidence key 'runtimeTickDump'."
        })
      ])
    );
  });

  it("summarizes admitted source evidence only for fixtures with complete row identity", () => {
    const manifest = readManifest();
    const result = validateAuroraVfxRetailParityManifest(manifest);

    const admittedSourceFixtureIds = result.fixtures
      .filter((fixture) => !fixture.missingEvidence.includes("source"))
      .map((fixture) => fixture.fixtureId)
      .sort();

    expect(admittedSourceFixtureIds).toEqual([
      "vfx-retail-dm-visualeffect-row-68-duration-0",
      "vfx-retail-explosion-detonate-fireball",
      "vfx-retail-scripted-effectbeam-row-210-body-chest",
      "vfx-retail-scripted-effectvisualeffect-row-50"
    ].sort());
    expect(result.missingEvidenceSummary.source).toBe(6);
    expect(result.fixtures.find(
      (fixture) => fixture.fixtureId === "vfx-retail-fountain-atlas-cot-fx01"
    )?.missingEvidence).toContain("source");
    expect(result.fixtures.find(
      (fixture) => fixture.fixtureId === "vfx-retail-chunk-particles-progfx-type9"
    )?.missingEvidence).toContain("source");
  });

  it("keeps the dm_visualeffect row 68 fixture diagnostic until retail artifacts are attached", () => {
    const manifest = readManifest();
    const fixture = manifest.fixtures.find(
      (entry) => entry.fixtureId === "vfx-retail-dm-visualeffect-row-68-duration-0"
    );

    expect(fixture).toBeDefined();

    const result = validateAuroraVfxRetailParityFixture(fixture!);

    expect(fixture!.status).toBe("missing");
    expect(fixture!.behaviorClaim).toBe("diagnostic");
    expect(result.canonicalAllowed).toBe(false);
    expect(result.evidence).toEqual({
      hasRetailBuild: false,
      hasSource: true,
      hasParserSnapshot: false,
      hasResolverTrace: false,
      hasRuntimeTickDump: false,
      hasRenderContractSnapshot: false,
      hasCaptureReference: false,
      hasComparison: false
    });
    expect(result.missingEvidence).toEqual([
      "retailBuild",
      "parserSnapshot",
      "resolverTrace",
      "runtimeTickDump",
      "renderContractSnapshot",
      "captureReference",
      "comparison"
    ]);
    expect(result.diagnostics.map((entry) => entry.code)).toEqual(
      expect.arrayContaining([
        "VFX_RETAIL_BUILD_PROFILE_REQUIRED",
        "VFX_RETAIL_PARSER_SNAPSHOT_REQUIRED",
        "VFX_RETAIL_RESOLVER_TRACE_REQUIRED",
        "VFX_RETAIL_RUNTIME_DUMP_REQUIRED",
        "VFX_RETAIL_RENDER_CONTRACT_SNAPSHOT_REQUIRED",
        "VFX_RETAIL_CAPTURE_REFERENCE_REQUIRED",
        "VFX_RETAIL_COMPARISON_EVIDENCE_REQUIRED"
      ])
    );
  });

  it("keeps row 68 next actions aligned with missing evidence order", () => {
    const manifest = readManifest();
    const fixture = manifest.fixtures.find(
      (entry) => entry.fixtureId === "vfx-retail-dm-visualeffect-row-68-duration-0"
    );

    expect(fixture).toBeDefined();

    const result = validateAuroraVfxRetailParityFixture(fixture!);

    expect(result.missingEvidence).toEqual([
      "retailBuild",
      "parserSnapshot",
      "resolverTrace",
      "runtimeTickDump",
      "renderContractSnapshot",
      "captureReference",
      "comparison"
    ]);
    expect(result.nextActions).toEqual([
      "Record retail build/profile/client metadata for vfx-retail-dm-visualeffect-row-68-duration-0.",
      "Generate parser snapshot JSON for vfx-retail-dm-visualeffect-row-68-duration-0.",
      "Capture resolver trace with source-policy/resource provenance for vfx-retail-dm-visualeffect-row-68-duration-0.",
      "Capture deterministic runtime tick dump for vfx-retail-dm-visualeffect-row-68-duration-0.",
      "Store renderer-agnostic render contract snapshot for vfx-retail-dm-visualeffect-row-68-duration-0.",
      "Attach screenshot/video/capture metadata reference for vfx-retail-dm-visualeffect-row-68-duration-0.",
      "Run and store comparison JSON for vfx-retail-dm-visualeffect-row-68-duration-0."
    ]);
  });

  it("keeps scripted EffectVisualEffect row 50 diagnostic until retail execution evidence exists", () => {
    const manifest = readManifest();
    const fixture = manifest.fixtures.find(
      (entry) => entry.fixtureId === "vfx-retail-scripted-effectvisualeffect-row-50"
    );

    expect(fixture).toBeDefined();

    const result = validateAuroraVfxRetailParityFixture(fixture!);

    expect(fixture!.status).toBe("missing");
    expect(fixture!.behaviorClaim).toBe("diagnostic");
    expect(fixture!.source.rowId).toBe(50);
    expect(fixture!.source.label).toBe("VFX_IMP_DEATH");
    expect(fixture!.effectContext.constructorKind).toBe("EffectVisualEffect");
    expect(fixture!.effectContext.rawInvocation).toBe(
      "ApplyEffectToObject(DURATION_TYPE_INSTANT, EffectVisualEffect(VFX_IMP_DEATH), oTarget);"
    );
    expect(fixture!.effectContext.evidenceRef).toBeNull();
    expect(result.evidence.hasSource).toBe(true);
    expect(result.evidence.hasRuntimeTickDump).toBe(false);
    expect(result.evidence.hasCaptureReference).toBe(false);
    expect(result.missingEvidence).toEqual(
      expect.arrayContaining(["runtimeTickDump", "captureReference", "comparison"])
    );
    expect(result.canonicalAllowed).toBe(false);
  });

  it("keeps scripted EffectBeam row 210 diagnostic until beam execution evidence exists", () => {
    const manifest = readManifest();
    const fixture = manifest.fixtures.find(
      (entry) => entry.fixtureId === "vfx-retail-scripted-effectbeam-row-210-body-chest"
    );

    expect(fixture).toBeDefined();

    const result = validateAuroraVfxRetailParityFixture(fixture!);

    expect(fixture!.status).toBe("missing");
    expect(fixture!.behaviorClaim).toBe("diagnostic");
    expect(fixture!.source.rowId).toBe(210);
    expect(fixture!.source.label).toBe("VFX_BEAM_FIRE");
    expect(fixture!.effectContext.constructorKind).toBe("EffectBeam");
    expect(fixture!.effectContext.applicationMode).toBe("object");
    expect(fixture!.effectContext.durationType).toBe("temporary");
    expect(fixture!.effectContext.durationSeconds).toBe(3);
    expect(fixture!.effectContext.effectorRef).toBe("retail-beam-source");
    expect(fixture!.effectContext.targetRef).toBe("retail-beam-target");
    expect(fixture!.effectContext.bodyNode).toBe("BODY_NODE_CHEST");
    expect(fixture!.effectContext.rawInvocation).toBe(
      "ApplyEffectToObject(DURATION_TYPE_TEMPORARY, EffectBeam(VFX_BEAM_FIRE, oSource, BODY_NODE_CHEST), oTarget, 3.0);"
    );
    expect(fixture!.effectContext.evidenceRef).toBeNull();
    expect(fixture!.captureReference.captureReference).toBeNull();
    expect(fixture!.comparison.result).toBeNull();
    expect(result.evidence.hasSource).toBe(true);
    expect(result.evidence.hasRuntimeTickDump).toBe(false);
    expect(result.evidence.hasRenderContractSnapshot).toBe(false);
    expect(result.evidence.hasCaptureReference).toBe(false);
    expect(result.missingEvidence).toEqual(
      expect.arrayContaining([
        "runtimeTickDump",
        "renderContractSnapshot",
        "captureReference",
        "comparison"
      ])
    );
    expect(result.canonicalAllowed).toBe(false);
  });

  it("keeps explosion detonate fireball diagnostic until detonate timing evidence exists", () => {
    const manifest = readManifest();
    const fixture = manifest.fixtures.find(
      (entry) => entry.fixtureId === "vfx-retail-explosion-detonate-fireball"
    );

    expect(fixture).toBeDefined();

    const result = validateAuroraVfxRetailParityFixture(fixture!);

    expect(fixture!.status).toBe("missing");
    expect(fixture!.behaviorClaim).toBe("diagnostic");
    expect(fixture!.source.rowId).toBe(22);
    expect(fixture!.source.label).toBe("VFX_FNF_FIREBALL");
    expect(fixture!.source.sourceAuthority).toBe("selectedSource2da-candidate");
    expect(fixture!.effectContext.constructorKind).toBe("EffectVisualEffect");
    expect(fixture!.effectContext.applicationMode).toBe("location");
    expect(fixture!.effectContext.durationType).toBe("instant");
    expect(fixture!.effectContext.durationSeconds).toBe(0);
    expect(fixture!.effectContext.targetRef).toBe("retail-fireball-location");
    expect(fixture!.effectContext.rawInvocation).toBe(
      "EffectVisualEffect(VFX_FNF_FIREBALL) plus MDL animation event detonate"
    );
    expect(fixture!.effectContext.evidenceRef).toBeNull();
    expect(fixture!.runtimeTickDump.path).toBeNull();
    expect(fixture!.renderContractSnapshot.path).toBeNull();
    expect(fixture!.captureReference.captureReference).toBeNull();
    expect(fixture!.comparison.result).toBeNull();
    expect(fixture!.expectedDiagnostics).toEqual(
      expect.arrayContaining(["VFX_EXPLOSION_DETONATE_EVENT_REQUIRED"])
    );
    expect(result.evidence.hasSource).toBe(true);
    expect(result.evidence.hasRuntimeTickDump).toBe(false);
    expect(result.evidence.hasRenderContractSnapshot).toBe(false);
    expect(result.evidence.hasCaptureReference).toBe(false);
    expect(result.evidence.hasComparison).toBe(false);
    expect(result.missingEvidence).toEqual(
      expect.arrayContaining([
        "runtimeTickDump",
        "renderContractSnapshot",
        "captureReference",
        "comparison"
      ])
    );
    expect(result.canonicalAllowed).toBe(false);
  });

  it("does not treat local placeholder evidence files as attached retail evidence", () => {
    const manifest = readManifest();
    const fixture = manifest.fixtures.find(
      (entry) => entry.fixtureId === "vfx-retail-explosion-detonate-fireball"
    );

    expect(fixture).toBeDefined();

    const fixtureDir = join(process.cwd(), "test", "fixtures", "vfx-retail", fixture!.fixtureId);
    for (const filename of [
      "parser-snapshot.json",
      "resolver-trace.json",
      "runtime-tick-dump.json",
      "render-contract-snapshot.json",
      "capture.json",
      "comparison.json"
    ]) {
      expect(existsSync(join(fixtureDir, filename))).toBe(true);
    }

    const result = validateAuroraVfxRetailParityFixture(fixture!);

    expect(fixture!.parserSnapshot.path).toBeNull();
    expect(fixture!.resolverTrace.path).toBeNull();
    expect(fixture!.runtimeTickDump.path).toBeNull();
    expect(fixture!.renderContractSnapshot.path).toBeNull();
    expect(fixture!.captureReference.captureReference).toBeNull();
    expect(fixture!.comparison.path).toBeNull();
    expect(result.evidence.hasParserSnapshot).toBe(false);
    expect(result.evidence.hasResolverTrace).toBe(false);
    expect(result.evidence.hasRuntimeTickDump).toBe(false);
    expect(result.evidence.hasRenderContractSnapshot).toBe(false);
    expect(result.evidence.hasCaptureReference).toBe(false);
    expect(result.evidence.hasComparison).toBe(false);
    expect(result.missingEvidence).toEqual(
      expect.arrayContaining([
        "parserSnapshot",
        "resolverTrace",
        "runtimeTickDump",
        "renderContractSnapshot",
        "captureReference",
        "comparison"
      ])
    );
    expect(result.canonicalAllowed).toBe(false);
  });

  it("keeps the local cot_fx01 Fountain candidate out of admitted source evidence", () => {
    const manifest = readManifest();
    const fixture = manifest.fixtures.find(
      (entry) => entry.fixtureId === "vfx-retail-fountain-atlas-cot-fx01"
    );

    expect(fixture).toBeDefined();

    const result = validateAuroraVfxRetailParityFixture(fixture!);

    expect(fixture!.status).toBe("unknown");
    expect(fixture!.behaviorClaim).toBe("diagnostic");
    expect(fixture!.source.sourceAuthority).toBe("localUntrackedMdlCandidate");
    expect(fixture!.effectContext.constructorKind).toBe("MDL_EMITTER");
    expect(fixture!.effectContext.applicationMode).toBe("source_only");
    expect(result.evidence.hasSource).toBe(false);
    expect(result.missingEvidence).toContain("source");
    expect(result.nextActions).toContain(
      "Attach source table/profile/hash plus row id/label for vfx-retail-fountain-atlas-cot-fx01."
    );
    expect(result.canonicalAllowed).toBe(false);
    expect(result.diagnostics.map((entry) => entry.code)).toContain(
      "VFX_RETAIL_SOURCE_EVIDENCE_REQUIRED"
    );
  });

  it("does not treat progfx Type 9 distribution evidence as chunk source admission", () => {
    const manifest = readManifest();
    const fixture = manifest.fixtures.find(
      (entry) => entry.fixtureId === "vfx-retail-chunk-particles-progfx-type9"
    );

    expect(fixture).toBeDefined();

    const result = validateAuroraVfxRetailParityFixture(fixture!);

    expect(fixture!.status).toBe("unknown");
    expect(fixture!.behaviorClaim).toBe("diagnostic");
    expect(fixture!.source.tableName).toBe("progfx.2da");
    expect(fixture!.source.profile).toBe("nwn-ee-8193.34-selected-source");
    expect(fixture!.source.sourceAuthority).toBe("selectedSource2da-type-distribution");
    expect(fixture!.source.rowId).toBeNull();
    expect(fixture!.source.label).toBeNull();
    expect(fixture!.expectedDiagnostics).toEqual(
      expect.arrayContaining([
        "VFX_CHUNK_MODEL_RESOURCE_CLASS_REQUIRED",
        "VFX_RETAIL_SOURCE_EVIDENCE_REQUIRED"
      ])
    );
    expect(result.evidence.hasSource).toBe(false);
    expect(result.missingEvidence).toContain("source");
    expect(result.nextActions).toContain(
      "Attach source table/profile/hash plus row id/label for vfx-retail-chunk-particles-progfx-type9."
    );
    expect(result.canonicalAllowed).toBe(false);
  });

  it("keeps P2P target labels diagnostic until runtime pointer evidence exists", () => {
    const manifest = readManifest();
    const fixture = manifest.fixtures.find(
      (entry) => entry.fixtureId === "vfx-retail-p2p-gravity-reference-node"
    );

    expect(fixture).toBeDefined();

    const result = validateAuroraVfxRetailParityFixture(fixture!);

    expect(fixture!.status).toBe("unknown");
    expect(fixture!.behaviorClaim).toBe("diagnostic");
    expect(fixture!.effectContext.constructorKind).toBe("MDL_EMITTER");
    expect(fixture!.effectContext.applicationMode).toBe("object");
    expect(fixture!.effectContext.targetRef).toBe("retail-p2p-target");
    expect(fixture!.effectContext.effectorRef).toBe("retail-p2p-source");
    expect(fixture!.runtimeTickDump.path).toBeNull();
    expect(fixture!.expectedDiagnostics).toEqual(
      expect.arrayContaining([
        "VFX_P2P_TARGET_RUNTIME_POINTER_REQUIRED",
        "VFX_RETAIL_RUNTIME_DUMP_REQUIRED"
      ])
    );
    expect(result.evidence.hasSource).toBe(false);
    expect(result.evidence.hasRuntimeTickDump).toBe(false);
    expect(result.missingEvidence).toEqual(
      expect.arrayContaining(["source", "runtimeTickDump"])
    );
    expect(result.canonicalAllowed).toBe(false);
  });

  it("keeps linked-chain render behavior blocked until render contract and capture evidence exist", () => {
    const manifest = readManifest();
    const fixture = manifest.fixtures.find(
      (entry) => entry.fixtureId === "vfx-retail-linked-chain"
    );

    expect(fixture).toBeDefined();

    const result = validateAuroraVfxRetailParityFixture(fixture!);

    expect(fixture!.status).toBe("unknown");
    expect(fixture!.behaviorClaim).toBe("diagnostic");
    expect(fixture!.effectContext.constructorKind).toBe("MDL_EMITTER");
    expect(fixture!.effectContext.applicationMode).toBe("source_only");
    expect(fixture!.effectContext.rawInvocation).toBe("Linked render mode fixture required");
    expect(fixture!.renderContractSnapshot.path).toBeNull();
    expect(fixture!.captureReference.captureReference).toBeNull();
    expect(fixture!.expectedDiagnostics).toEqual(
      expect.arrayContaining([
        "VFX_RETAIL_RENDER_CONTRACT_SNAPSHOT_REQUIRED",
        "VFX_RETAIL_CAPTURE_REFERENCE_REQUIRED"
      ])
    );
    expect(result.evidence.hasSource).toBe(false);
    expect(result.evidence.hasRenderContractSnapshot).toBe(false);
    expect(result.evidence.hasCaptureReference).toBe(false);
    expect(result.missingEvidence).toEqual(
      expect.arrayContaining(["source", "renderContractSnapshot", "captureReference"])
    );
    expect(result.canonicalAllowed).toBe(false);
  });

  it("keeps punch-through and raw mode 2 blend behavior capture-gated", () => {
    const manifest = readManifest();
    const fixture = manifest.fixtures.find(
      (entry) => entry.fixtureId === "vfx-retail-punch-through-mode2-lighten"
    );

    expect(fixture).toBeDefined();

    const result = validateAuroraVfxRetailParityFixture(fixture!);

    expect(fixture!.status).toBe("unknown");
    expect(fixture!.behaviorClaim).toBe("diagnostic");
    expect(fixture!.effectContext.constructorKind).toBe("MDL_EMITTER");
    expect(fixture!.effectContext.applicationMode).toBe("source_only");
    expect(fixture!.effectContext.rawInvocation).toBe(
      "Emitter blend Punch-Through and raw mode 2 comparison fixture required"
    );
    expect(fixture!.renderContractSnapshot.path).toBeNull();
    expect(fixture!.captureReference.captureReference).toBeNull();
    expect(fixture!.comparison.result).toBeNull();
    expect(fixture!.expectedDiagnostics).toEqual(
      expect.arrayContaining([
        "VFX_BLEND_FUNC_FACTORS_CAPTURE_REQUIRED",
        "VFX_PUNCH_THROUGH_DEPTHWRITE_LANE_REQUIRED"
      ])
    );
    expect(result.evidence.hasRenderContractSnapshot).toBe(false);
    expect(result.evidence.hasCaptureReference).toBe(false);
    expect(result.evidence.hasComparison).toBe(false);
    expect(result.missingEvidence).toEqual(
      expect.arrayContaining(["renderContractSnapshot", "captureReference", "comparison"])
    );
    expect(result.canonicalAllowed).toBe(false);
  });

  it("keeps PLT layer colors gated on source profile and retail capture evidence", () => {
    const manifest = readManifest();
    const fixture = manifest.fixtures.find(
      (entry) => entry.fixtureId === "vfx-retail-plt-known-layer-colors"
    );

    expect(fixture).toBeDefined();

    const result = validateAuroraVfxRetailParityFixture(fixture!);

    expect(fixture!.status).toBe("unknown");
    expect(fixture!.behaviorClaim).toBe("diagnostic");
    expect(fixture!.source.profile).toBeNull();
    expect(fixture!.source.sourceAuthority).toBeNull();
    expect(fixture!.effectContext.constructorKind).toBe("MDL_EMITTER");
    expect(fixture!.effectContext.applicationMode).toBe("object");
    expect(fixture!.effectContext.targetRef).toBe("retail-plt-colored-target");
    expect(fixture!.captureReference.captureReference).toBeNull();
    expect(fixture!.comparison.result).toBeNull();
    expect(fixture!.expectedDiagnostics).toEqual(
      expect.arrayContaining([
        "VFX_PLT_PROFILE_GATED",
        "VFX_RETAIL_CAPTURE_REFERENCE_REQUIRED"
      ])
    );
    expect(result.evidence.hasSource).toBe(false);
    expect(result.evidence.hasCaptureReference).toBe(false);
    expect(result.evidence.hasComparison).toBe(false);
    expect(result.missingEvidence).toEqual(
      expect.arrayContaining(["source", "captureReference", "comparison"])
    );
    expect(result.canonicalAllowed).toBe(false);
  });

  it("does not treat expected diagnostics as attached evidence", () => {
    const manifest = readManifest();
    const fixture = manifest.fixtures.find(
      (entry) => entry.fixtureId === "vfx-retail-plt-known-layer-colors"
    );

    expect(fixture).toBeDefined();
    expect(fixture!.expectedDiagnostics).toEqual(
      expect.arrayContaining([
        "VFX_RETAIL_BUILD_PROFILE_REQUIRED",
        "VFX_RETAIL_SOURCE_EVIDENCE_REQUIRED",
        "VFX_RETAIL_PARSER_SNAPSHOT_REQUIRED",
        "VFX_RETAIL_RESOLVER_TRACE_REQUIRED",
        "VFX_RETAIL_RUNTIME_DUMP_REQUIRED",
        "VFX_RETAIL_RENDER_CONTRACT_SNAPSHOT_REQUIRED",
        "VFX_RETAIL_CAPTURE_REFERENCE_REQUIRED",
        "VFX_RETAIL_COMPARISON_EVIDENCE_REQUIRED"
      ])
    );

    const result = validateAuroraVfxRetailParityFixture(fixture!);

    expect(result.evidence).toEqual({
      hasRetailBuild: false,
      hasSource: false,
      hasParserSnapshot: false,
      hasResolverTrace: false,
      hasRuntimeTickDump: false,
      hasRenderContractSnapshot: false,
      hasCaptureReference: false,
      hasComparison: false
    });
    expect(result.missingEvidence).toEqual([
      "retailBuild",
      "source",
      "parserSnapshot",
      "resolverTrace",
      "runtimeTickDump",
      "renderContractSnapshot",
      "captureReference",
      "comparison"
    ]);
    expect(result.canonicalAllowed).toBe(false);
  });

  it("blocks a passed fixture when parser, resolver, runtime, and retail build evidence are missing", () => {
    const fixture = {
      ...buildCompleteFixture(),
      status: "passed",
      behaviorClaim: "canonical",
      retailBuild: {
        buildId: null,
        buildProfile: null,
        client: "NWN:EE retail",
        captureMachine: null,
        evidenceRef: null
      },
      parserSnapshot: emptyEvidenceRef(),
      resolverTrace: emptyEvidenceRef(),
      runtimeTickDump: emptyEvidenceRef()
    } satisfies AuroraVfxRetailParityFixture;

    const result = validateAuroraVfxRetailParityFixture(fixture);

    expect(result.canonicalAllowed).toBe(false);
    expect(result.missingEvidence).toEqual(
      expect.arrayContaining(["retailBuild", "parserSnapshot", "resolverTrace", "runtimeTickDump"])
    );
    expect(result.nextActions).toEqual(
      expect.arrayContaining([
        "Record retail build/profile/client metadata for complete-retail-fixture.",
        "Generate parser snapshot JSON for complete-retail-fixture.",
        "Capture resolver trace with source-policy/resource provenance for complete-retail-fixture.",
        "Capture deterministic runtime tick dump for complete-retail-fixture."
      ])
    );
    expect(result.diagnostics.map((entry) => entry.code)).toEqual(
      expect.arrayContaining([
        "VFX_RETAIL_BUILD_PROFILE_REQUIRED",
        "VFX_RETAIL_PARSER_SNAPSHOT_REQUIRED",
        "VFX_RETAIL_RESOLVER_TRACE_REQUIRED",
        "VFX_RETAIL_RUNTIME_DUMP_REQUIRED",
        "VFX_CANONICAL_RETAIL_EVIDENCE_REQUIRED"
      ])
    );
  });

  it("rejects parser snapshot evidence refs that are not objects", () => {
    const fixture = {
      ...buildCompleteFixture(),
      parserSnapshot: null
    } as unknown as AuroraVfxRetailParityFixture;

    const result = validateAuroraVfxRetailParityFixture(fixture);

    expect(result.evidence.hasParserSnapshot).toBe(false);
    expect(result.missingEvidence).toEqual(["parserSnapshot"]);
    expect(result.canonicalAllowed).toBe(false);
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "VFX_RETAIL_PARSER_SNAPSHOT_REF_INVALID",
          fixtureId: "complete-retail-fixture",
          severity: "error",
          message: "Parser snapshot evidence reference must be an object."
        }),
        expect.objectContaining({
          code: "VFX_RETAIL_PARSER_SNAPSHOT_REQUIRED",
          fixtureId: "complete-retail-fixture",
          severity: "warn"
        }),
        expect.objectContaining({
          code: "VFX_CANONICAL_RETAIL_EVIDENCE_REQUIRED",
          fixtureId: "complete-retail-fixture",
          severity: "error"
        })
      ])
    );
  });

  it("allows canonical only when source, resolver, runtime, render, capture, comparison, and retail evidence are present", () => {
    const fixture = buildCompleteFixture();
    const result = validateAuroraVfxRetailParityFixture(fixture);

    expect(canAuroraVfxFixtureBeCanonical(fixture)).toBe(true);
    expect(result.canonicalAllowed).toBe(true);
    expect(result.missingEvidence).toEqual([]);
    expect(result.nextActions).toEqual([]);
    expect(result.diagnostics).toEqual([]);
  });

  it("keeps complete evidence non-canonical when comparison result is not passed", () => {
    for (const comparisonResult of ["failed", "unknown"] as const) {
      const fixture = {
        ...buildCompleteFixture(),
        comparison: {
          ...buildCompleteFixture().comparison,
          result: comparisonResult
        }
      } satisfies AuroraVfxRetailParityFixture;

      const result = validateAuroraVfxRetailParityFixture(fixture);

      expect(result.evidence.hasComparison).toBe(true);
      expect(result.missingEvidence).toEqual([]);
      expect(result.canonicalAllowed).toBe(false);
      expect(result.diagnostics.map((entry) => entry.code)).toContain(
        "VFX_CANONICAL_RETAIL_EVIDENCE_REQUIRED"
      );
    }
  });

  it("requires comparison evidence for compared, passed, and failed statuses", () => {
    for (const status of ["compared", "passed", "failed"] as const) {
      const fixture = {
        ...buildCompleteFixture(),
        status,
        behaviorClaim: "diagnostic",
        comparison: {
          path: null,
          hash: null,
          result: null,
          comparedAt: null
        }
      } satisfies AuroraVfxRetailParityFixture;

      const result = validateAuroraVfxRetailParityFixture(fixture);

      expect(result.evidence.hasComparison).toBe(false);
      expect(result.missingEvidence).toEqual(["comparison"]);
      expect(result.canonicalAllowed).toBe(false);
      expect(result.diagnostics).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: "VFX_RETAIL_COMPARISON_EVIDENCE_REQUIRED",
            severity: "error"
          })
        ])
      );
    }
  });

  it("recognizes only declared fixture statuses", () => {
    const statuses: readonly AuroraVfxRetailParityStatus[] = getAuroraVfxRetailParityStatuses();

    for (const status of statuses) {
      expect(isAuroraVfxRetailParityStatus(status)).toBe(true);
    }
    expect(isAuroraVfxRetailParityStatus("retail-ish")).toBe(false);
  });

  it("recognizes only safe retail fixture ids", () => {
    expect(isAuroraVfxRetailFixtureId("vfx-retail-safe_01.test")).toBe(true);
    expect(isAuroraVfxRetailFixtureId("../escape")).toBe(false);
    expect(isAuroraVfxRetailFixtureId("_template")).toBe(false);
    expect(isAuroraVfxRetailFixtureId("VFX-Retail")).toBe(false);
    expect(isAuroraVfxRetailFixtureId("vfx retail")).toBe(false);
  });

  it("recognizes only declared required cases", () => {
    for (const requiredCase of getAuroraVfxRetailParityRequiredCases()) {
      expect(isAuroraVfxRetailRequiredCase(requiredCase)).toBe(true);
    }
    expect(isAuroraVfxRetailRequiredCase("retail-ish")).toBe(false);
  });

  it("rejects duplicate required cases in the manifest", () => {
    const manifest = readManifest();
    const duplicateFixture = {
      ...manifest.fixtures[0],
      fixtureId: `${manifest.fixtures[0].fixtureId}-duplicate`
    } satisfies AuroraVfxRetailParityFixture;

    const result = validateAuroraVfxRetailParityManifest({
      ...manifest,
      fixtures: [...manifest.fixtures, duplicateFixture]
    });

    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "VFX_RETAIL_REQUIRED_CASE_DUPLICATE",
          fixtureId: duplicateFixture.fixtureId,
          severity: "error"
        })
      ])
    );
    expect(result.diagnostics.map((entry) => entry.code)).not.toContain(
      "VFX_RETAIL_REQUIRED_CASE_MISSING"
    );
  });

  it("rejects duplicate fixture ids in the manifest", () => {
    const manifest = readManifest();
    const duplicateIdFixture = {
      ...manifest.fixtures[1],
      fixtureId: manifest.fixtures[0].fixtureId
    } satisfies AuroraVfxRetailParityFixture;

    const result = validateAuroraVfxRetailParityManifest({
      ...manifest,
      fixtures: [manifest.fixtures[0], duplicateIdFixture, ...manifest.fixtures.slice(2)]
    });

    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "VFX_RETAIL_FIXTURE_ID_DUPLICATE",
          fixtureId: duplicateIdFixture.fixtureId,
          severity: "error"
        })
      ])
    );
    expect(result.diagnostics.map((entry) => entry.code)).not.toContain(
      "VFX_RETAIL_REQUIRED_CASE_MISSING"
    );
    expect(result.diagnostics.map((entry) => entry.code)).not.toContain(
      "VFX_RETAIL_REQUIRED_CASE_DUPLICATE"
    );
  });

  it("rejects unsafe fixture ids in the manifest", () => {
    const manifest = readManifest();
    const unsafeFixture = {
      ...manifest.fixtures[0],
      fixtureId: "../escape"
    } satisfies AuroraVfxRetailParityFixture;

    const result = validateAuroraVfxRetailParityManifest({
      ...manifest,
      fixtures: [unsafeFixture, ...manifest.fixtures.slice(1)]
    });

    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "VFX_RETAIL_FIXTURE_ID_INVALID",
          fixtureId: unsafeFixture.fixtureId,
          severity: "error"
        })
      ])
    );
    expect(result.diagnostics.map((entry) => entry.code)).not.toContain(
      "VFX_RETAIL_REQUIRED_CASE_MISSING"
    );
    expect(result.diagnostics.map((entry) => entry.code)).not.toContain(
      "VFX_RETAIL_REQUIRED_CASE_DUPLICATE"
    );
  });

  it("rejects invalid required case labels at runtime", () => {
    const fixture = {
      ...buildCompleteFixture(),
      requiredCase: "retail-ish"
    } as unknown as AuroraVfxRetailParityFixture;

    const result = validateAuroraVfxRetailParityFixture(fixture);

    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "VFX_RETAIL_REQUIRED_CASE_INVALID",
          severity: "error"
        })
      ])
    );
  });

  it("recognizes only declared behavior claim labels", () => {
    for (const behaviorClaim of getAuroraVfxRetailBehaviorClaims()) {
      expect(isAuroraVfxRetailBehaviorClaim(behaviorClaim)).toBe(true);
    }
    expect(isAuroraVfxRetailBehaviorClaim("retail-ish")).toBe(false);
  });

  it("rejects invalid behavior claim labels at runtime", () => {
    const fixture = {
      ...buildCompleteFixture(),
      behaviorClaim: "retail-ish"
    } as unknown as AuroraVfxRetailParityFixture;

    const result = validateAuroraVfxRetailParityFixture(fixture);

    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "VFX_RETAIL_BEHAVIOR_CLAIM_INVALID",
          severity: "error"
        })
      ])
    );
  });

  it("does not treat screenshot/video reference alone as parity proof", () => {
    const fixture = {
      ...buildCompleteFixture(),
      status: "captured",
      behaviorClaim: "canonical",
      parserSnapshot: emptyEvidenceRef(),
      resolverTrace: emptyEvidenceRef(),
      runtimeTickDump: emptyEvidenceRef(),
      renderContractSnapshot: emptyEvidenceRef(),
      comparison: {
        path: null,
        hash: null,
        result: null,
        comparedAt: null
      }
    } satisfies AuroraVfxRetailParityFixture;

    const result = validateAuroraVfxRetailParityFixture(fixture);

    expect(result.evidence.hasCaptureReference).toBe(true);
    expect(result.canonicalAllowed).toBe(false);
    expect(result.missingEvidence).toEqual(
      expect.arrayContaining([
        "parserSnapshot",
        "resolverTrace",
        "runtimeTickDump",
        "renderContractSnapshot",
        "comparison"
      ])
    );
    expect(result.diagnostics.map((entry) => entry.code)).toContain(
      "VFX_RETAIL_SCREENSHOT_ALONE_NOT_PARITY_PROOF"
    );
  });

  it("keeps fixtures without retail build/profile out of canonical even when comparison says passed", () => {
    const fixture = {
      ...buildCompleteFixture(),
      retailBuild: {
        buildId: null,
        buildProfile: null,
        client: "NWN:EE retail",
        captureMachine: "capture-host",
        evidenceRef: null
      }
    } satisfies AuroraVfxRetailParityFixture;

    const result = validateAuroraVfxRetailParityFixture(fixture);

    expect(result.canonicalAllowed).toBe(false);
    expect(result.missingEvidence).toContain("retailBuild");
    expect(result.diagnostics.map((entry) => entry.code)).toContain(
      "VFX_RETAIL_BUILD_PROFILE_REQUIRED"
    );
  });
});

function readManifest(): AuroraVfxRetailParityManifest {
  const manifestPath = join(
    process.cwd(),
    "docs",
    "aurora-reverse",
    "vfx-retail-parity-fixtures.json"
  );
  return JSON.parse(readFileSync(manifestPath, "utf-8")) as AuroraVfxRetailParityManifest;
}

function buildCompleteFixture(): AuroraVfxRetailParityFixture {
  return {
    fixtureId: "complete-retail-fixture",
    requiredCase: "dm_visualeffect_row_duration",
    title: "Complete synthetic evidence fixture",
    status: "passed",
    behaviorClaim: "canonical",
    retailBuild: {
      buildId: "8193.37-17",
      buildProfile: "nwn-ee-retail-win64",
      client: "NWN:EE retail",
      captureMachine: "capture-host",
      evidenceRef: "captures/vfx/complete-retail-fixture/build.json"
    },
    source: {
      tableName: "visualeffects.2da",
      profile: "nwn-ee-8193.37-retail",
      tableHash: "source-table-hash",
      rowId: 68,
      label: "VFX_IMP_HEALING_M",
      sourceAuthority: "retailCapture"
    },
    effectContext: {
      constructorKind: "dm_visualeffect",
      applicationMode: "object",
      durationType: "instant",
      durationSeconds: 0,
      sourceRowId: 68,
      targetRef: "target",
      effectorRef: null,
      bodyNode: null,
      rawInvocation: "dm_visualeffect 68 0",
      evidenceRef: "captures/vfx/complete-retail-fixture/effect-context.json"
    },
    parserSnapshot: evidenceRef("parser-snapshot.json"),
    resolverTrace: evidenceRef("resolver-trace.json"),
    runtimeTickDump: evidenceRef("runtime-tick-dump.json"),
    renderContractSnapshot: evidenceRef("render-contract-snapshot.json"),
    captureReference: {
      screenshotPath: "captures/vfx/complete-retail-fixture/frame-0001.png",
      videoPath: null,
      captureReference: "captures/vfx/complete-retail-fixture/capture.json",
      notes: null
    },
    comparison: {
      path: "captures/vfx/complete-retail-fixture/comparison.json",
      hash: "comparison-hash",
      result: "passed",
      comparedAt: "2026-06-10T00:00:00.000Z"
    },
    expectedDiagnostics: [],
    notCanonicalReason: null,
    notes: []
  };
}

function evidenceRef(fileName: string) {
  return {
    path: `captures/vfx/complete-retail-fixture/${fileName}`,
    hash: `${fileName}-hash`,
    capturedAt: "2026-06-10T00:00:00.000Z"
  };
}

function emptyEvidenceRef() {
  return {
    path: null,
    hash: null,
    capturedAt: null
  };
}
