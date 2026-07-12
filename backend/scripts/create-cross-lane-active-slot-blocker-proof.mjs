#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const defaultRepoRoot = resolve(scriptDir, "..", "..");
const DEFAULT_ARTIFACT_DIR =
  "backend/docs/aurora-reverse/artifacts/light-shadow-2026-07-03-shadowvol-preview";
const DEFAULT_OUTPUT = `${DEFAULT_ARTIFACT_DIR}/cross-lane-active-slot-blocker-proof.json`;
const REQUIRED_ABLATION_MAX_LIGHTS = [1, 2, 3, 4, 5, 6, 8, 32];
const REQUIRED_ABLATION_DIAGNOSTICS = [
  {
    lane: "item-property-light",
    ablationLabel: "no-item",
    file: "cross-lane-retail-maxlight-roi-diagnostics.json",
  },
  {
    lane: "progfx-type4-light-or-vision",
    ablationLabel: "no-progfx",
    file: "cross-lane-retail-maxlight-roi-diagnostics-no-progfx.json",
  },
  {
    lane: "placeables-2da-light",
    ablationLabel: "no-placeable",
    file: "cross-lane-retail-maxlight-roi-diagnostics-no-placeable.json",
  },
  {
    lane: "mdl-source-light-node",
    ablationLabel: "no-mdl",
    file: "cross-lane-retail-maxlight-roi-diagnostics-no-mdl.json",
  },
  {
    lane: "terrain-tile-main-light",
    ablationLabel: "no-tile-main",
    file: "cross-lane-retail-maxlight-roi-diagnostics-no-tile-main.json",
  },
  {
    lane: "terrain-tile-source-light",
    ablationLabel: "no-tile-source",
    file: "cross-lane-retail-maxlight-roi-diagnostics-no-tile-source.json",
  },
];

function parseArgs(argv) {
  const options = {
    repoRoot: defaultRepoRoot,
    artifactDir: DEFAULT_ARTIFACT_DIR,
    out: DEFAULT_OUTPUT,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--repoRoot") {
      index += 1;
      options.repoRoot = resolve(requireValue(arg, argv[index]));
    } else if (arg === "--artifactDir") {
      index += 1;
      options.artifactDir = requireValue(arg, argv[index]);
    } else if (arg === "--out" || arg === "--output") {
      index += 1;
      options.out = requireValue(arg, argv[index]);
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return options;
}

function printHelp() {
  console.log(`Usage: node scripts/create-cross-lane-active-slot-blocker-proof.mjs [options]

Options:
  --repoRoot <path>       Repository root. Defaults to aurora-web root.
  --artifactDir <path>    Artifact directory. Defaults to ${DEFAULT_ARTIFACT_DIR}
  --out <path>            Proof JSON output. Defaults to ${DEFAULT_OUTPUT}
`);
}

function requireValue(flag, value) {
  if (!value || value.startsWith("--")) {
    throw new Error(`${flag} requires a value.`);
  }
  return value;
}

function toAbsolute(repoRoot, inputPath) {
  return isAbsolute(inputPath) ? inputPath : resolve(repoRoot, inputPath);
}

function toRepoRelative(repoRoot, inputPath) {
  return relative(repoRoot, inputPath).replaceAll("\\", "/");
}

function sha256(input) {
  return createHash("sha256").update(input).digest("hex");
}

function describeFile(repoRoot, path) {
  const stats = statSync(path);
  return {
    path: toRepoRelative(repoRoot, path),
    bytes: stats.size,
    sha256: sha256(readFileSync(path)),
    modifiedAt: stats.mtime.toISOString(),
  };
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8").replace(/^\uFEFF/u, ""));
}

function readArtifact(repoRoot, artifactDir, name) {
  const path = resolve(artifactDir, name);
  if (!existsSync(path)) {
    return {
      present: false,
      file: { path: toRepoRelative(repoRoot, path), missing: true },
      json: null,
    };
  }
  return {
    present: true,
    file: describeFile(repoRoot, path),
    json: readJson(path),
  };
}

function summarizeAblationMetric(metric) {
  if (!metric) {
    return null;
  }
  return {
    changedSampleRatioGt5: metric.changedSampleRatioGt5 ?? null,
    meanAbsRgbDelta: metric.meanAbsRgbDelta ?? null,
    maxRgbDelta: metric.maxRgbDelta ?? null,
    changedBoundsGt5: metric.changedBoundsGt5 ?? null,
    weightedCentroidGt5: metric.weightedCentroidGt5 ?? null,
  };
}

function summarizeAblationLane(repoRoot, artifactDir, spec) {
  const artifact = readArtifact(repoRoot, artifactDir, spec.file);
  const ablation = artifact.json?.ablationComparison ?? null;
  const summary = ablation?.summary ?? {};
  const cases = Array.isArray(ablation?.cases) ? ablation.cases : [];
  const allVsAfterByMaxLight = REQUIRED_ABLATION_MAX_LIGHTS.map((maxLights) => {
    const caseId = `maxlights-${maxLights}-all-vs-${spec.ablationLabel}-after-budget`;
    const entry = cases.find((candidate) => candidate.caseId === caseId);
    return {
      maxLights,
      caseId,
      present: Boolean(entry),
      status: entry?.status ?? null,
      metric: summarizeAblationMetric(entry?.metric),
    };
  });
  const missingMaxLights = allVsAfterByMaxLight
    .filter((entry) => !entry.present)
    .map((entry) => entry.maxLights);
  const provesPixelEffect = summary.provesAblationPixelEffect === true;
  return {
    lane: spec.lane,
    ablationLabel: spec.ablationLabel,
    diagnostic: {
      present: artifact.present,
      name: spec.file,
      ...artifact.file,
    },
    status: ablation?.status ?? artifact.json?.status ?? "missing",
    maxLightCoverage: {
      required: REQUIRED_ABLATION_MAX_LIGHTS,
      present: allVsAfterByMaxLight
        .filter((entry) => entry.present)
        .map((entry) => entry.maxLights),
      missing: missingMaxLights,
      complete: missingMaxLights.length === 0,
    },
    allVsAfterByMaxLight,
    summary: {
      caseCount: summary.caseCount ?? null,
      generatedCaseCount: summary.generatedCaseCount ?? null,
      missingInputCaseCount: summary.missingInputCaseCount ?? null,
      heatmapCount: summary.heatmapCount ?? null,
      allVsAblationAfterBudgetCaseCount:
        summary.allVsAblationAfterBudgetCaseCount ?? null,
      allVsAblationAfterBudgetSensitiveCaseCount:
        summary.allVsAblationAfterBudgetSensitiveCaseCount ?? null,
      ablationOwnBudgetSensitiveCaseCount:
        summary.ablationOwnBudgetSensitiveCaseCount ?? null,
      provesAblationPixelEffect: provesPixelEffect,
      provesAcceptedDroppedOwnerMapping:
        summary.provesAcceptedDroppedOwnerMapping === true,
      provesDirectRendererSlotOrder: summary.provesDirectRendererSlotOrder === true,
      provesCanonicalParity: summary.provesCanonicalParity === true,
    },
    provesLanePixelEffectAcrossRequiredMaxLights:
      artifact.present && missingMaxLights.length === 0 && provesPixelEffect,
  };
}

function buildAblationLaneEffectMatrix(repoRoot, artifactDir) {
  const lanes = REQUIRED_ABLATION_DIAGNOSTICS.map((spec) =>
    summarizeAblationLane(repoRoot, artifactDir, spec),
  );
  const missingDiagnostics = lanes
    .filter((lane) => !lane.diagnostic.present)
    .map((lane) => lane.diagnostic.name);
  const incompleteMaxLightCoverage = lanes
    .filter((lane) => lane.maxLightCoverage.missing.length > 0)
    .map((lane) => ({
      lane: lane.lane,
      ablationLabel: lane.ablationLabel,
      missingMaxLights: lane.maxLightCoverage.missing,
    }));
  const lanesWithoutPixelEffect = lanes
    .filter((lane) => !lane.provesLanePixelEffectAcrossRequiredMaxLights)
    .map((lane) => lane.lane);
  const allRequiredLanePixelEffectsProven =
    missingDiagnostics.length === 0 &&
    incompleteMaxLightCoverage.length === 0 &&
    lanesWithoutPixelEffect.length === 0;
  return {
    version: "aurora-cross-lane-ablation-lane-effect-matrix/v1",
    status: allRequiredLanePixelEffectsProven
      ? "retail-ablation-lane-effect-matrix-complete-parity-still-blocked"
      : "blocked-retail-ablation-lane-effect-matrix-incomplete",
    requiredMaxLights: REQUIRED_ABLATION_MAX_LIGHTS,
    requiredLaneCount: REQUIRED_ABLATION_DIAGNOSTICS.length,
    presentDiagnosticCount: lanes.filter((lane) => lane.diagnostic.present).length,
    lanesWithPixelEffectCount: lanes.filter(
      (lane) => lane.provesLanePixelEffectAcrossRequiredMaxLights,
    ).length,
    missingDiagnostics,
    incompleteMaxLightCoverage,
    lanesWithoutPixelEffect,
    lanes,
    provesAllRequiredLanePixelEffects: allRequiredLanePixelEffectsProven,
    provesAcceptedDroppedOwnerMapping: false,
    provesDirectRendererSlotOrder: false,
    provesCanonicalParity: false,
    blocker:
      "Ablation lane effects prove that required lanes can change retail pixels, but they are not a direct renderer slot dump and do not prove accepted/dropped slot order.",
  };
}

function splitList(value) {
  return String(value ?? "")
    .split("|")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function parseSample(sample) {
  const fields = {};
  for (const part of String(sample).split(";")) {
    const index = part.indexOf("=");
    if (index < 0) {
      continue;
    }
    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    fields[key] = value;
  }
  return fields;
}

function parseLocalOrderSamples(domStatus) {
  return splitList(domStatus.fixtureScenePointLightRetailOrderingRuntimeProbeLocalOrderSamples).map(
    (sample) => {
      const parsed = parseSample(sample);
      return {
        lane: parsed.lane ?? null,
        kind: parsed.kind ?? null,
        name: parsed.name ?? null,
        localOrderKey: numberOrNull(parsed.localOrderKey),
        traversalIndex: numberOrNull(parsed.traversalIndex),
        budgetRank: numberOrNull(parsed.budgetRank),
        budgetAccepted: parsed.budgetAccepted === "true",
        retailScore: numberOrNull(parsed.retailScore),
        priority: numberOrNull(parsed.priority),
        proof: parsed.proof ?? null,
        retailOrdering: parsed.retailOrdering ?? null,
      };
    },
  );
}

function buildLanePromotionMatrix(callgraphJson, localOrderSamples) {
  const requiredLaneOwners = Array.isArray(callgraphJson?.requiredLaneOwners)
    ? callgraphJson.requiredLaneOwners
    : [];
  const sourceFamilyEvidence = Array.isArray(callgraphJson?.sourceFamilyEvidence)
    ? callgraphJson.sourceFamilyEvidence
    : [];
  const sourceFamilyByLane = new Map(
    sourceFamilyEvidence.map((entry) => [entry.lane, entry]),
  );
  const localSamplesByLane = new Map();
  for (const sample of localOrderSamples) {
    if (!sample.lane) {
      continue;
    }
    const bucket = localSamplesByLane.get(sample.lane) ?? [];
    bucket.push(sample);
    localSamplesByLane.set(sample.lane, bucket);
  }
  return requiredLaneOwners.map((owner) => {
    const sourceFamily = sourceFamilyByLane.get(owner.lane) ?? {};
    const localLaneAliases = resolveLocalLaneAliases(owner.lane);
    const localSamples = localLaneAliases.flatMap(
      (lane) => localSamplesByLane.get(lane) ?? [],
    );
    const ownerPathRecovered =
      typeof owner.lightManagerOwnerPath === "string" &&
      owner.lightManagerOwnerPath.length > 0 &&
      owner.lightManagerOwnerPath !== "not-recovered";
    const familyStatus = String(owner.sourceFamilyStatus ?? sourceFamily.status ?? "");
    const familyProofStatus = String(
      owner.sourceFamilyProofStatus ?? sourceFamily.proofStatus ?? "",
    );
    const sourceFamilyBacked =
      isBackedFamilyStatus(familyStatus) || isBackedFamilyStatus(familyProofStatus);
    return {
      lane: owner.lane,
      localLaneAliases,
      localObserved: localSamples.length > 0,
      localSampleCount: localSamples.length,
      sourceAnchorStatus: owner.sourceAnchorStatus ?? null,
      sourceFamilyStatus: owner.sourceFamilyStatus ?? sourceFamily.status ?? null,
      sourceFamilyProofStatus:
        owner.sourceFamilyProofStatus ?? sourceFamily.proofStatus ?? null,
      sourceFamilyBacked,
      lightManagerOwnerPath: owner.lightManagerOwnerPath ?? null,
      ownerPathRecovered,
      promotionStatus: ownerPathRecovered
        ? "owner-path-recovered-needs-direct-slot-or-accepted-dropped-map"
        : "blocked-owner-path-not-recovered",
      acceptedSourceBackedFacts: sourceFamily.acceptedSourceBackedFacts ?? [],
      acceptedRetailResourceBackedFacts:
        sourceFamily.acceptedRetailResourceBackedFacts ?? [],
      acceptedRetailBinaryBackedFacts:
        sourceFamily.acceptedRetailBinaryBackedFacts ?? [],
      blockedSemantics: [
        ...(Array.isArray(sourceFamily.blockedSemantics)
          ? sourceFamily.blockedSemantics
          : []),
        ...(ownerPathRecovered
          ? []
          : ["direct LightManager owner path for this lane is not recovered"]),
      ],
    };
  });
}

function isBackedFamilyStatus(value) {
  return (
    value.startsWith("source-") ||
    value.startsWith("retail-binary-") ||
    value.startsWith("retail-table-")
  );
}

function resolveLocalLaneAliases(lane) {
  if (lane === "terrain-tile-source-light") {
    return [lane, "terrain-tile-light"];
  }
  if (lane === "mdl-source-light-node") {
    return [lane, "source-mdl-light-node"];
  }
  if (lane === "progfx-type4-light-or-vision") {
    return [lane, "progfx-type4-light-request"];
  }
  return [lane];
}

function buildRetailOrderingPromotionGate({
  directDumpAvailable,
  directRendererSlotOrderObserved,
  localLaneCoveragePassed,
  sourceAlgorithmBacked,
  roiDiagnostics,
  lanePromotionMatrix,
}) {
  const acceptedDroppedOwnerMappingProven =
    roiDiagnostics.json?.summary?.provesAcceptedDroppedOwnerMapping === true;
  const allRequiredLaneOwnerPathsRecovered =
    lanePromotionMatrix.length > 0 &&
    lanePromotionMatrix.every((lane) => lane.ownerPathRecovered);
  const promotionAllowed =
    sourceAlgorithmBacked &&
    localLaneCoveragePassed &&
    (directRendererSlotOrderObserved || acceptedDroppedOwnerMappingProven);
  const checks = [
    {
      key: "sourceBackedActiveSlotAlgorithm",
      passed: sourceAlgorithmBacked,
      requiredFor: "score/cap/sort/radius rule baseline",
    },
    {
      key: "localRequiredLaneCoverage",
      passed: localLaneCoveragePassed,
      requiredFor: "Aurora Web probe coverage only",
    },
    {
      key: "directRetailActiveSlotDump",
      passed: directDumpAvailable,
      requiredFor: "direct retail accepted/dropped slot evidence",
    },
    {
      key: "directRendererSlotOrder",
      passed: directRendererSlotOrderObserved,
      requiredFor: "retail ordering promotion path",
    },
    {
      key: "acceptedDroppedOwnerMapping",
      passed: acceptedDroppedOwnerMappingProven,
      requiredFor: "classifier/oracle promotion path",
    },
    {
      key: "allRequiredLaneOwnerPathsRecovered",
      passed: allRequiredLaneOwnerPathsRecovered,
      requiredFor: "data-flow promotion path",
    },
  ];
  return {
    status: promotionAllowed
      ? "retail-ordering-promotion-allowed"
      : "blocked-direct-slot-order-and-accepted-dropped-owner-map-missing",
    promotionAllowed,
    acceptedDroppedOwnerMappingProven,
    allRequiredLaneOwnerPathsRecovered,
    checks,
    rule:
      "Do not promote Aurora Web local budget order as retail cross-lane owner precedence unless directRendererSlotOrder is observed or a complete accepted/dropped owner mapping is proven.",
  };
}

function numberOrNull(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildProof(options) {
  const repoRoot = resolve(options.repoRoot);
  const artifactDir = toAbsolute(repoRoot, options.artifactDir);
  const retailSlots = readArtifact(repoRoot, artifactDir, "retail-cross-lane-active-slots.json");
  const compare = readArtifact(repoRoot, artifactDir, "cross-lane-precedence-compare.json");
  const localFrame = readArtifact(repoRoot, artifactDir, "aurora-web-cross-lane-all-lanes.frame.json");
  const callgraph = readArtifact(repoRoot, artifactDir, "lightmanager-lane-owner-callgraph.json");
  const roiDiagnostics = readArtifact(
    repoRoot,
    artifactDir,
    "cross-lane-retail-maxlight-roi-diagnostics.json",
  );
  const domStatus = localFrame.json?.domStatus ?? {};
  const localOrderSamples = parseLocalOrderSamples(domStatus);
  const acceptedLanes = splitList(
    domStatus.fixtureScenePointLightRetailOrderingRuntimeProbeBudgetAcceptedLanes,
  );
  const droppedLanes = splitList(
    domStatus.fixtureScenePointLightRetailOrderingRuntimeProbeBudgetDroppedLanes,
  );
  const unknownLanes = splitList(
    domStatus.fixtureScenePointLightRetailOrderingRuntimeProbeBudgetUnknownLanes,
  );
  const directDumpAvailable = retailSlots.json?.directRetailSlotDumpAvailable === true;
  const directRendererSlotOrderObserved = retailSlots.json?.directRendererSlotOrderObserved === true;
  const sourceAlgorithmBacked = String(
    callgraph.json?.activeSlotAlgorithmEvidence?.proofStatus ?? "",
  ).startsWith("source-backed-");
  const localLaneCoveragePassed =
    compare.json?.localSourceFamilyCoveragePassed === true &&
    compare.json?.runtimeLaneCoveragePassed === true &&
    compare.json?.sourceFamilyCoveragePassed === true;
  const blocked = !directDumpAvailable || !directRendererSlotOrderObserved;
  const lanePromotionMatrix = buildLanePromotionMatrix(callgraph.json, localOrderSamples);
  const ablationLaneEffectMatrix = buildAblationLaneEffectMatrix(repoRoot, artifactDir);
  const retailOrderingPromotionGate = buildRetailOrderingPromotionGate({
    directDumpAvailable,
    directRendererSlotOrderObserved,
    localLaneCoveragePassed,
    sourceAlgorithmBacked,
    roiDiagnostics,
    lanePromotionMatrix,
  });

  return {
    version: "aurora-cross-lane-active-slot-blocker-proof/v1",
    generatedAt: new Date().toISOString(),
    status: blocked
      ? "blocked-direct-retail-active-slot-order-missing-local-source-model-present"
      : "direct-retail-active-slot-order-present",
    passed: false,
    canonicalParityPromoted: false,
    inputs: {
      retailSlots: retailSlots.file,
      compare: compare.file,
      localFrame: localFrame.file,
      lightmanagerCallgraph: callgraph.file,
      retailMaxLightRoiDiagnostics: roiDiagnostics.file,
      retailAblationLaneEffectDiagnostics: ablationLaneEffectMatrix.lanes.map((lane) => ({
        lane: lane.lane,
        ablationLabel: lane.ablationLabel,
        diagnostic: lane.diagnostic,
      })),
    },
    retailSlotOracle: {
      present: retailSlots.present,
      status: retailSlots.json?.status ?? null,
      directRetailSlotDumpAvailable: directDumpAvailable,
      directRendererSlotOrderObserved,
      acceptedSlotsCount: Array.isArray(retailSlots.json?.acceptedSlots)
        ? retailSlots.json.acceptedSlots.length
        : null,
      droppedSlotsCount: Array.isArray(retailSlots.json?.droppedSlots)
        ? retailSlots.json.droppedSlots.length
        : null,
      slotOrderingProofStatus: retailSlots.json?.slotOrderingProofStatus ?? null,
    },
    localRuntimeModel: {
      present: localFrame.present,
      localOnlyNotRetailEvidence: localFrame.json?.localOnlyNotRetailEvidence ?? null,
      status: domStatus.fixtureScenePointLightRetailOrderingRuntimeProbeStatus ?? null,
      requiredLaneCoverageCount: numberOrNull(
        domStatus.fixtureScenePointLightRetailOrderingRuntimeProbeRequiredLaneCoverageCount,
      ),
      pointLightSampleCount: numberOrNull(
        domStatus.fixtureScenePointLightRetailOrderingRuntimeProbePointLightSampleCount,
      ),
      nonPointRequestSampleCount: numberOrNull(
        domStatus.fixtureScenePointLightRetailOrderingRuntimeProbeNonPointRequestSampleCount,
      ),
      acceptedLanes,
      droppedLanes,
      unknownLanes,
      localOrderSource:
        domStatus.fixtureScenePointLightRetailOrderingRuntimeProbeLocalOrderSource ?? null,
      localOrderSamples,
    },
    sourceAlgorithm: {
      present: callgraph.present,
      proofStatus: callgraph.json?.activeSlotAlgorithmEvidence?.proofStatus ?? null,
      sourceBacked: sourceAlgorithmBacked,
      maxActiveLights: callgraph.json?.activeSlotAlgorithmEvidence?.maxActiveLights ?? null,
      activeListSemantics:
        callgraph.json?.activeSlotAlgorithmEvidence?.activeListSemantics ?? [],
      blockedSemantics:
        callgraph.json?.activeSlotAlgorithmEvidence?.blockedSemantics ??
        callgraph.json?.conclusion?.blockedSemantics ??
        [],
      activeSelectionRadiusRule:
        "FUN_00a42728 accepts a sorted candidate only when light+0x80 <= (light+0x60 when positive, otherwise light+0x58)",
      activeSelectionRadiusSource:
        "C:/Projects/New Folder/export/decompiled_all.c:866625-866678",
    },
    lanePromotionMatrix,
    retailAblationLaneEffectMatrix: ablationLaneEffectMatrix,
    retailOrderingPromotionGate,
    compareState: {
      present: compare.present,
      status: compare.json?.status ?? null,
      localSourceFamilyCoveragePassed: compare.json?.localSourceFamilyCoveragePassed ?? null,
      runtimeLaneCoveragePassed: compare.json?.runtimeLaneCoveragePassed ?? null,
      sourceFamilyCoveragePassed: compare.json?.sourceFamilyCoveragePassed ?? null,
      ownerPathsStillBlocked: compare.json?.ownerPathsStillBlocked ?? null,
      retailMaxLightVariantClassifierStatus:
        compare.json?.retailMaxLightVariantClassifier?.status ?? null,
      missingIsolatedReferenceArtifacts:
        compare.json?.retailMaxLightVariantClassifier?.missingIsolatedReferenceArtifacts ?? [],
    },
    retailMaxLightRoiDiagnostics: {
      present: roiDiagnostics.present,
      status: roiDiagnostics.json?.status ?? null,
      heatmapCount: roiDiagnostics.json?.summary?.heatmapCount ?? null,
      budgetSensitiveCaseCount: roiDiagnostics.json?.summary?.budgetSensitiveCaseCount ?? null,
      provesBudgetSensitiveRetailPixels:
        roiDiagnostics.json?.summary?.provesBudgetSensitiveRetailPixels ?? null,
      ownerClassifierStatus: roiDiagnostics.json?.summary?.ownerClassifierStatus ?? null,
      ownerClassifierEvaluated:
        roiDiagnostics.json?.summary?.ownerClassifierEvaluated ?? null,
      ownerClassifierStrongCandidateCaseCount:
        roiDiagnostics.json?.summary?.ownerClassifierStrongCandidateCaseCount ?? null,
      ablationComparisonStatus:
        roiDiagnostics.json?.summary?.ablationComparisonStatus ?? null,
      ablationComparisonCaseCount:
        roiDiagnostics.json?.summary?.ablationComparisonCaseCount ?? null,
      ablationComparisonGeneratedCaseCount:
        roiDiagnostics.json?.summary?.ablationComparisonGeneratedCaseCount ?? null,
      ablationProvesPixelEffect:
        roiDiagnostics.json?.summary?.ablationProvesPixelEffect ?? null,
      provesPartialOwnerCandidates:
        roiDiagnostics.json?.summary?.provesPartialOwnerCandidates ?? null,
      provesAcceptedDroppedOwnerMapping:
        roiDiagnostics.json?.summary?.provesAcceptedDroppedOwnerMapping ?? null,
      provesDirectRendererSlotOrder:
        roiDiagnostics.json?.summary?.provesDirectRendererSlotOrder ?? null,
      provesCanonicalParity: roiDiagnostics.json?.summary?.provesCanonicalParity ?? null,
      ownerClassifier: roiDiagnostics.json?.ownerClassifier
        ? {
            status: roiDiagnostics.json.ownerClassifier.status ?? null,
            evaluated: roiDiagnostics.json.ownerClassifier.evaluated ?? null,
            summary: roiDiagnostics.json.ownerClassifier.summary ?? null,
            baseline: roiDiagnostics.json.ownerClassifier.baseline ?? null,
            missingReferenceArtifacts:
              roiDiagnostics.json.ownerClassifier.missingReferenceArtifacts ?? [],
            topLaneCandidates: Array.isArray(roiDiagnostics.json.ownerClassifier.cases)
              ? roiDiagnostics.json.ownerClassifier.cases.map((entry) => ({
                  caseId: entry.caseId,
                  status: entry.status,
                  strongCandidate: entry.strongCandidate,
                  topLaneCandidate: entry.topLaneCandidate ?? null,
                  topScore: entry.topScore ?? null,
                  scoreMargin: entry.scoreMargin ?? null,
                }))
              : [],
          }
        : null,
      ablationComparison: roiDiagnostics.json?.ablationComparison
        ? {
            status: roiDiagnostics.json.ablationComparison.status ?? null,
            label: roiDiagnostics.json.ablationComparison.label ?? null,
            summary: roiDiagnostics.json.ablationComparison.summary ?? null,
            canonicalParityPromoted:
              roiDiagnostics.json.ablationComparison.canonicalParityPromoted ?? null,
          }
        : null,
      topHotCellsByCase: Array.isArray(roiDiagnostics.json?.cases)
        ? roiDiagnostics.json.cases.map((entry) => ({
            caseId: entry.caseId,
            changedSampleRatioGt5: entry.metric?.changedSampleRatioGt5 ?? null,
            changedBoundsGt5: entry.metric?.changedBoundsGt5 ?? null,
            weightedCentroidGt5: entry.metric?.weightedCentroidGt5 ?? null,
            topHotCells: entry.metric?.grid?.topHotCells ?? [],
          }))
        : [],
    },
    proofScope: {
      provesLocalRequiredLaneCoverage: localLaneCoveragePassed,
      provesSourceBackedActiveSlotAlgorithm: sourceAlgorithmBacked,
      provesRetailBeforeAfterPixelsPresent: compare.present,
      provesRetailBudgetSensitiveRoiPixels:
        roiDiagnostics.json?.summary?.provesBudgetSensitiveRetailPixels === true,
      provesRetailOwnerClassifierEvaluated:
        roiDiagnostics.json?.summary?.ownerClassifierEvaluated === true,
      provesRetailPartialOwnerCandidates:
        roiDiagnostics.json?.summary?.provesPartialOwnerCandidates === true,
      provesRetailAblationPixelEffect:
        roiDiagnostics.json?.summary?.ablationProvesPixelEffect === true,
      provesRetailAblationLaneEffectMatrix:
        ablationLaneEffectMatrix.provesAllRequiredLanePixelEffects,
      provesDirectRetailActiveSlotDump: directDumpAvailable,
      provesDirectRendererSlotOrder: directRendererSlotOrderObserved,
      provesAcceptedDroppedOwnerMapping:
        retailOrderingPromotionGate.acceptedDroppedOwnerMappingProven,
      provesAllRequiredLaneOwnerPathsRecovered:
        retailOrderingPromotionGate.allRequiredLaneOwnerPathsRecovered,
      permitsRetailOrderingPromotion:
        retailOrderingPromotionGate.promotionAllowed,
      provesRetailCrossLaneOwnerPrecedence: false,
      provesCanonicalParity: false,
    },
    blockedParityFacts: [
      "Local Aurora Web lane coverage and recovered LightManager scoring/upload semantics are source-backed.",
      "The local budget order is explicitly local-only and cannot be promoted as retail owner precedence.",
      "retail-cross-lane-active-slots.json intentionally has empty accepted/dropped slots because no direct renderer slot dump exists.",
      ablationLaneEffectMatrix.provesAllRequiredLanePixelEffects
        ? "All required cross-lane ablation families have complete max-light pixel-effect coverage, but ablation effects do not prove accepted/dropped slot order."
        : `Ablation lane-effect matrix is incomplete: missingDiagnostics=${ablationLaneEffectMatrix.missingDiagnostics.length}, incompleteMaxLightCoverage=${ablationLaneEffectMatrix.incompleteMaxLightCoverage.length}, lanesWithoutPixelEffect=${ablationLaneEffectMatrix.lanesWithoutPixelEffect.length}.`,
      roiDiagnostics.json?.summary?.ownerClassifierEvaluated === true
        ? "cross-lane-retail-maxlight-roi-diagnostics.json now evaluates an offline owner classifier and optional ablation comparisons, but it still cannot promote direct renderer slot order or canonical parity."
        : "cross-lane-retail-maxlight-roi-diagnostics.json localizes retail budget-sensitive pixels but still cannot map those pixels back to accepted/dropped owners.",
      "A direct retail slot dump or classifier-grade isolated lane reference captures are still required before accepted/dropped owner order can pass.",
    ],
  };
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const repoRoot = resolve(options.repoRoot);
  const outputPath = toAbsolute(repoRoot, options.out);
  const proof = buildProof(options);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(proof, null, 2)}\n`, "utf8");
  console.log(
    JSON.stringify(
      {
        status: proof.status,
        output: toRepoRelative(repoRoot, outputPath),
        localSampleCount: proof.localRuntimeModel.localOrderSamples.length,
        directRetailSlotDumpAvailable: proof.retailSlotOracle.directRetailSlotDumpAvailable,
        canonicalParityPromoted: proof.canonicalParityPromoted,
      },
      null,
      2,
    ),
  );
}

main();
