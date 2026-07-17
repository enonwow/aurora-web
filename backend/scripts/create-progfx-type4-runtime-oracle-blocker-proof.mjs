#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const defaultRepoRoot = resolve(scriptDir, "..", "..");
const DEFAULT_ARTIFACT_DIR =
  "backend/docs/aurora-reverse/artifacts/light-shadow-2026-07-03-shadowvol-preview";
const DEFAULT_OUTPUT = `${DEFAULT_ARTIFACT_DIR}/progfx-type4-runtime-oracle-blocker-proof.json`;

const INPUTS = {
  priority: "retail-progfx-priority-policy.json",
  proximity: "retail-progfx-proximity-distance-sweep.json",
  attach: "retail-progfx-attach-scene-restore.json",
  blindvision: "retail-progfx-blindvision-pixel-compare.json",
};

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
  console.log(`Usage: node scripts/create-progfx-type4-runtime-oracle-blocker-proof.mjs [options]

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

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8").replace(/^\uFEFF/u, ""));
}

function readInput(repoRoot, artifactDir, name) {
  const path = resolve(artifactDir, name);
  if (!existsSync(path)) {
    return {
      present: false,
      file: { path: toRepoRelative(repoRoot, path), missing: true },
      json: null,
    };
  }
  const buffer = readFileSync(path);
  const stats = statSync(path);
  return {
    present: true,
    file: {
      path: toRepoRelative(repoRoot, path),
      bytes: stats.size,
      sha256: sha256(buffer),
      modifiedAt: stats.mtime.toISOString(),
    },
    json: readJson(path),
  };
}

function buildSchedulerPolicyMatrix({
  prioritySignal,
  priorityTieCandidateObserved,
  customPriorityZeroRuntimeCaptured,
  proximityBracket,
  proximityBracketAuroraUnits,
  attachRemovalObserved,
  blindvisionMutationObserved,
  blindvisionRetailMutationTolerancePassed,
  blindvisionLocalVsRetailTolerancePassed,
}) {
  return [
    {
      rule: "param4-priority-visible-type4-signal",
      status: prioritySignal
        ? "retail-runtime-pixels-classified-visible-signal"
        : "blocked-visible-type4-signal-missing",
      evidencePassed: prioritySignal,
      promotedAsSchedulerPolicy: false,
      blockedBy: [
        "visible pixel signal does not prove winner ordering for multiple requests",
      ],
    },
    {
      rule: "param4-equal-priority-tie",
      status: priorityTieCandidateObserved
        ? "retail-runtime-tie-candidate-observed-general-policy-blocked"
        : "blocked-equal-priority-tie-oracle-missing",
      evidencePassed: priorityTieCandidateObserved,
      promotedAsSchedulerPolicy: false,
      blockedBy: [
        "direct scheduler data-flow is missing",
        "isolated equal-priority tie oracle is not promoted as a general policy",
      ],
    },
    {
      rule: "param4-zero",
      status: customPriorityZeroRuntimeCaptured
        ? "custom-param4-zero-runtime-captured-not-stock-retail-parity"
        : "stock-retail-param4-zero-row-absent-runtime-policy-blocked",
      evidencePassed: customPriorityZeroRuntimeCaptured,
      promotedAsSchedulerPolicy: false,
      blockedBy: [
        "stock retail table has no normal Type 4 Param4=0 row",
        "custom override evidence cannot become stock retail parity",
      ],
    },
    {
      rule: "param5-proximity-suppression-threshold",
      status: proximityBracket
        ? "retail-runtime-proximity-bracket-observed-threshold-blocked"
        : "blocked-proximity-bracket-missing",
      evidencePassed: Boolean(proximityBracket),
      promotedAsSchedulerPolicy: false,
      thresholdBracketAuroraUnits: proximityBracketAuroraUnits ?? null,
      blockedBy: [
        "exact distance threshold is not recovered",
        "participating source lane is not isolated",
      ],
    },
    {
      rule: "param6-attach-to-scene-restore",
      status: attachRemovalObserved
        ? "retail-runtime-removal-observed-restore-timing-still-needs-policy"
        : "blocked-no-scene-light-removal-observed",
      evidencePassed: attachRemovalObserved,
      promotedAsSchedulerPolicy: false,
      blockedBy: [
        "selected ROI did not show scene-light removal",
        "restore timing data-flow is not recovered",
      ],
    },
    {
      rule: "vision-blindvision-pixel-mutation",
      status:
        blindvisionMutationObserved && blindvisionRetailMutationTolerancePassed
          ? "retail-mutation-observed-local-vs-retail-parity-blocked"
          : "blocked-retail-mutation-or-tolerance-missing",
      evidencePassed:
        blindvisionMutationObserved && blindvisionRetailMutationTolerancePassed,
      promotedAsSchedulerPolicy: false,
      localVsRetailParityPassed: blindvisionLocalVsRetailTolerancePassed,
      blockedBy: blindvisionLocalVsRetailTolerancePassed
        ? []
        : ["local-vs-retail viewport/tolerance check failed"],
    },
  ];
}

function buildSchedulerPromotionGate(policyMatrix) {
  const checks = [
    {
      key: "priorityTiePolicyProven",
      passed:
        policyMatrix.find((entry) => entry.rule === "param4-equal-priority-tie")
          ?.promotedAsSchedulerPolicy === true,
    },
    {
      key: "stockPriorityZeroPolicyProven",
      passed:
        policyMatrix.find((entry) => entry.rule === "param4-zero")
          ?.promotedAsSchedulerPolicy === true,
    },
    {
      key: "exactProximityThresholdProven",
      passed:
        policyMatrix.find(
          (entry) => entry.rule === "param5-proximity-suppression-threshold",
        )?.promotedAsSchedulerPolicy === true,
    },
    {
      key: "attachToSceneRestorePolicyProven",
      passed:
        policyMatrix.find((entry) => entry.rule === "param6-attach-to-scene-restore")
          ?.promotedAsSchedulerPolicy === true,
    },
    {
      key: "blindvisionLocalVsRetailParity",
      passed:
        policyMatrix.find((entry) => entry.rule === "vision-blindvision-pixel-mutation")
          ?.localVsRetailParityPassed === true,
    },
  ];
  const promotionAllowed = checks.every((check) => check.passed);
  return {
    status: promotionAllowed
      ? "progfx-type4-scheduler-promotion-allowed"
      : "blocked-progfx-type4-scheduler-policy-parity-incomplete",
    promotionAllowed,
    checks,
    rule:
      "Do not promote multi-request ProgFX Type 4 scheduler parity until tie policy, stock zero behavior, exact proximity threshold, attach/restore timing, and BlindVision local-vs-retail parity are all proven.",
  };
}

function buildProof(options) {
  const repoRoot = resolve(options.repoRoot);
  const artifactDir = toAbsolute(repoRoot, options.artifactDir);
  const inputs = Object.fromEntries(
    Object.entries(INPUTS).map(([key, name]) => [key, readInput(repoRoot, artifactDir, name)]),
  );
  const priority = inputs.priority.json ?? {};
  const proximity = inputs.proximity.json ?? {};
  const attach = inputs.attach.json ?? {};
  const blindvision = inputs.blindvision.json ?? {};
  const allPresent = Object.values(inputs).every((input) => input.present);
  const prioritySignal =
    priority.runtimeObservation?.pixelClassification?.visibleType4VfxAppears === true;
  const priorityTieCandidate =
    priority.runtimeObservation?.equalPriorityTieCandidate ?? null;
  const priorityTieCandidateObserved =
    priorityTieCandidate?.candidateObserved === true;
  const priorityZeroPolicy = priority.runtimeObservation?.priorityZeroPolicy ?? null;
  const customPriorityZeroRuntimeCaptured =
    priorityZeroPolicy === "custom-param4-zero-runtime-captured" ||
    priorityZeroPolicy ===
      "custom-param4-zero-override-runtime-capture-present-not-stock-retail-parity";
  const proximityBracket =
    proximity.sweep?.pixelClassification?.thresholdBracket ??
    proximity.sweep?.thresholdBracket ??
    null;
  const proximityBracketAuroraUnits =
    proximity.sweep?.pixelClassification?.thresholdBracketAuroraUnits ??
    proximity.sweep?.thresholdBracketAuroraUnits ??
    null;
  const attachRemovalObserved =
    attach.restoreObservation?.sceneLightsRemovedWhileActive === true ||
    attach.restoreObservation?.pixelClassification?.sceneLightRemovalObserved === true;
  const blindvisionMutationObserved = blindvision.retailMutationObserved === true;
  const blindvisionRetailMutationTolerancePassed =
    blindvision.retailMutationTolerance?.passed === true;
  const blindvisionLocalVsRetailTolerancePassed =
    blindvision.localVsRetailTolerance?.passed === true;
  const schedulerPolicyMatrix = buildSchedulerPolicyMatrix({
    prioritySignal,
    priorityTieCandidateObserved,
    customPriorityZeroRuntimeCaptured,
    proximityBracket,
    proximityBracketAuroraUnits,
    attachRemovalObserved,
    blindvisionMutationObserved,
    blindvisionRetailMutationTolerancePassed,
    blindvisionLocalVsRetailTolerancePassed,
  });
  const schedulerPromotionGate =
    buildSchedulerPromotionGate(schedulerPolicyMatrix);

  return {
    version: "aurora-progfx-type4-runtime-oracle-blocker-proof/v1",
    generatedAt: new Date().toISOString(),
    status: allPresent
      ? "blocked-progfx-type4-runtime-oracles-present-policy-parity-incomplete"
      : "blocked-progfx-type4-runtime-oracles-missing",
    passed: false,
    canonicalParityPromoted: false,
    inputs: Object.fromEntries(
      Object.entries(inputs).map(([key, value]) => [key, value.file]),
    ),
    observations: {
      priority: {
        present: inputs.priority.present,
        status: priority.status ?? null,
        runtimeObservationStatus: priority.runtimeObservation?.status ?? null,
        visibleType4VfxAppears: prioritySignal,
        dominantCapturedSignal:
          priority.runtimeObservation?.pixelClassification?.dominantCapturedSignal ?? null,
        beforeType4LightSignal:
          priority.runtimeObservation?.pixelClassification?.beforeType4LightSignal ?? null,
        afterType4LightSignal:
          priority.runtimeObservation?.pixelClassification?.afterType4LightSignal ?? null,
        beforeBlueVfxSignal:
          priority.runtimeObservation?.pixelClassification?.beforeBlueVfxSignal ?? null,
        afterBlueVfxSignal:
          priority.runtimeObservation?.pixelClassification?.afterBlueVfxSignal ?? null,
        tiePolicy: priority.runtimeObservation?.tiePolicy ?? null,
        equalPriorityTieCandidate: priorityTieCandidate
          ? {
              status: priorityTieCandidate.status ?? null,
              candidateObserved: priorityTieCandidate.candidateObserved ?? null,
              sameTimestampBlueYellowRequests:
                priorityTieCandidate.sameTimestampBlueYellowRequests ?? null,
              blueBeforeYellowInScript:
                priorityTieCandidate.blueBeforeYellowInScript ?? null,
              priority20HasTie: priorityTieCandidate.priority20HasTie ?? null,
              dominantCapturedSignal: priorityTieCandidate.dominantCapturedSignal ?? null,
              afterWarmSignalCount: priorityTieCandidate.afterWarmSignalCount ?? null,
              afterBlueSignalCount: priorityTieCandidate.afterBlueSignalCount ?? null,
              candidateInterpretation:
                priorityTieCandidate.candidateInterpretation ?? null,
            }
          : null,
        priorityZeroPolicy,
        customProgFxZeroOverridePrepared:
          priority.runtimeObservation?.customProgFxZeroOverride?.prepared ?? null,
      },
      proximity: {
        present: inputs.proximity.present,
        status: proximity.status ?? null,
        sweepStatus: proximity.sweep?.status ?? null,
        pixelClassificationStatus: proximity.sweep?.pixelClassification?.status ?? null,
        thresholdBracket: proximityBracket,
        thresholdBracketAuroraUnits: proximityBracketAuroraUnits,
        sampleLocations: proximity.sweep?.sampleLocations ?? null,
        driverEvidence: proximity.sweep?.driverEvidence ?? null,
        measuredThresholdMeters: proximity.sweep?.measuredThresholdMeters ?? null,
        measuredThresholdAuroraUnits: proximity.sweep?.measuredThresholdAuroraUnits ?? null,
        candidateSet: proximity.sweep?.candidateSet ?? null,
        restoreBehavior: proximity.sweep?.restoreBehavior ?? null,
      },
      attach: {
        present: inputs.attach.present,
        status: attach.status ?? null,
        restoreObservationStatus: attach.restoreObservation?.status ?? null,
        sceneLightsRemovedWhileActive: attachRemovalObserved,
        sceneLightRestoreTiming: attach.restoreObservation?.sceneLightRestoreTiming ?? null,
      },
      blindvision: {
        present: inputs.blindvision.present,
        status: blindvision.status ?? null,
        retailMutationObserved: blindvisionMutationObserved,
        retailMutationToleranceStatus: blindvision.retailMutationTolerance?.status ?? null,
        retailMutationTolerancePassed: blindvisionRetailMutationTolerancePassed,
        localVsRetailToleranceStatus: blindvision.localVsRetailTolerance?.status ?? null,
        localVsRetailTolerancePassed: blindvisionLocalVsRetailTolerancePassed,
        localVsRetailMetric: blindvision.localVsRetailMetric
          ? {
              left: blindvision.localVsRetailMetric.left ?? null,
              right: blindvision.localVsRetailMetric.right ?? null,
              meanAbsRgbDelta: blindvision.localVsRetailMetric.meanAbsRgbDelta ?? null,
              changedSampleRatioGt5: blindvision.localVsRetailMetric.changedSampleRatioGt5 ?? null,
              rmsRgbDelta: blindvision.localVsRetailMetric.rmsRgbDelta ?? null,
            }
          : null,
        meanAbsRgbDelta: blindvision.retailMutationMetric?.meanAbsRgbDelta ?? null,
        changedSampleRatioGt5: blindvision.retailMutationMetric?.changedSampleRatioGt5 ?? null,
        pixelDiffPresent: blindvision.pixelDiffArtifact?.present ?? null,
      },
    },
    schedulerPolicyMatrix,
    schedulerPromotionGate,
    proofScope: {
      provesPriorityVisibleType4PixelSignal: prioritySignal,
      provesProximitySuppressionBracket: Boolean(proximityBracket),
      provesAttachSceneRemovalAndRestore: attachRemovalObserved === true,
      provesBlindvisionRetailPixelMutation: blindvisionMutationObserved,
      provesBlindvisionRetailMutationTolerance: blindvisionRetailMutationTolerancePassed,
      provesPriorityTiePolicy: false,
      provesPriorityTieCandidate: priorityTieCandidateObserved,
      provesPriorityZeroRuntimePolicy: customPriorityZeroRuntimeCaptured,
      provesExactProximityThreshold: false,
      provesAttachSchedulerDataflow: false,
      provesLocalVsRetailBlindvisionParity: blindvisionLocalVsRetailTolerancePassed,
      permitsProgFxType4SchedulerPromotion:
        schedulerPromotionGate.promotionAllowed,
      provesCanonicalParity: false,
    },
    blockedParityFacts: [
      priorityTieCandidateObserved
        ? "Priority captures, source table values, and the same-timestamp Blue/Yellow driver now show an equal-priority yellow-over-blue tie candidate, but direct scheduler data-flow or a deliberately isolated tie oracle is still missing."
        : "Priority captures show a visible Type 4 VFX signal, but equal-priority tie behavior remains unisolated.",
      customPriorityZeroRuntimeCaptured
        ? "Stock retail has no Type 4 Param4=0 row; the custom zero override runtime capture is present but remains non-stock retail parity."
        : "Stock retail has no Type 4 Param4=0 row; the custom zero override pack is prepared but runtime capture is missing.",
      proximityBracketAuroraUnits
        ? "Proximity captures bracket suppression behavior and now carry the scripted/fixture sample coordinates, but exact threshold and participating source lane remain blocked."
        : "Proximity captures bracket suppression behavior, but exact threshold and participating source lane remain blocked.",
      "Attach-to-scene captures do not show scene-light removal in the selected ROIs, so Param6 restore semantics cannot pass.",
      blindvision.localVsRetailTolerance
        ? "Blindvision before/active retail pixels mutate, but local-vs-retail viewport tolerance is evaluated and currently fails."
        : "Blindvision before/active retail pixels mutate, but local-vs-retail viewport tolerance is still missing.",
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
        prioritySignal: proof.proofScope.provesPriorityVisibleType4PixelSignal,
        proximityBracket: proof.proofScope.provesProximitySuppressionBracket,
        blindvisionMutation: proof.proofScope.provesBlindvisionRetailPixelMutation,
        canonicalParityPromoted: proof.canonicalParityPromoted,
      },
      null,
      2,
    ),
  );
}

main();
