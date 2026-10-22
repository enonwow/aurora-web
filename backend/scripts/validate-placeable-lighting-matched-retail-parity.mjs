#!/usr/bin/env node

import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import { deflateSync, inflateSync } from "node:zlib";

const PROFILE_VERSION = "aurora-placeable-lighting-matched-retail-parity-profile/v1";
const POLICY_VERSION = "aurora-placeable-lighting-visual-similarity-policy/v1";
const ALIGNMENT_VERSION = "aurora-placeable-lighting-camera-time-alignment/v1";
const COMPARISON_VERSION = "aurora-placeable-lighting-matched-comparison/v1";
const COMPARISON_BLOCKER_VERSION =
  "aurora-placeable-lighting-matched-comparison-blocker/v1";
const REVIEW_VERSION = "aurora-placeable-lighting-human-visual-review/v1";
const ADMISSION_VERSION =
  "aurora-placeable-lighting-matched-retail-parity-admission/v1";

const JSON_SIZE_LIMIT = 256 * 1024;
const PNG_SIZE_LIMIT = 32 * 1024 * 1024;
const LOG_SIZE_LIMIT = 4 * 1024 * 1024;
const PNG_DIMENSION_LIMIT = 4096;
const SHA256_PATTERN = /^[a-f0-9]{64}$/u;

const EXACT_FIXTURE = Object.freeze({
  id: "als-oracle-campfire-v1",
  moduleSha256: "29e158317794d6519e2a807cec5ce4bfd4b025be33886694b1340515d9c94604",
  area: "als_light_lab",
  entryPoint: [65, 55, 0],
  position: [65, 65, 0],
  captureTimeSeconds: 1,
  cameraFacing: {
    directionDegrees: 0,
    distance: 10,
    pitchDegrees: 45,
  },
  placeable: {
    resref: "plc_campfr",
    appearance: 58,
    modelResref: "plc_i06",
    sourceMdlSha256:
      "144d84a94f1039e1031ea6949098c0106ac81f96794df308853a28dd757d1db4",
  },
  receiver: {
    sourceMdlSha256:
      "08c7810e8faf1ba4d4730cf14c8fb2737cf5f695e02e3d4f38d0e51f086da44d",
    modelAssetSha256:
      "0c8a58aa3f6643f09dfe888ce82cf82da25cfb2a184b31ad534b0e7425161cd1",
    textureSha256:
      "dae40e6294f63ac13ced7de4e138b32c57ef99357a291f2664178ed8a8ed7eb7",
  },
});

const REQUIRED_FEATURES = Object.freeze([
  "flameCore",
  "additiveGlow",
  "receiverFootprint",
  "backgroundExposure",
]);

const REQUIRED_TOLERANCES = Object.freeze({
  flameCore: [
    "maxMeanLumaRelativeError",
    "maxP95LumaRelativeError",
    "maxPeakLumaRelativeError",
    "maxMeanRgbDistance",
    "maxWarmChromaDelta",
    "maxBrightPixelRatioDelta",
    "maxBrightBoundsWidthRelativeError",
    "maxBrightBoundsHeightRelativeError",
  ],
  additiveGlow: [
    "maxMeanLumaRelativeError",
    "maxP95LumaRelativeError",
    "maxMeanRgbDistance",
    "maxWarmChromaDelta",
    "maxBrightPixelRatioDelta",
  ],
  receiverFootprint: [
    "maxMeanLumaRelativeError",
    "maxP95LumaRelativeError",
    "maxMeanRgbDistance",
    "maxWarmChromaDelta",
    "maxBrightPixelRatioDelta",
  ],
  backgroundExposure: ["maxMeanLumaRelativeError", "maxMeanRgbDistance"],
});

const TOLERANCE_TO_METRIC = Object.freeze({
  maxMeanLumaRelativeError: "meanLumaRelativeError",
  maxP95LumaRelativeError: "p95LumaRelativeError",
  maxPeakLumaRelativeError: "peakLumaRelativeError",
  maxMeanRgbDistance: "meanRgbDistance",
  maxWarmChromaDelta: "warmChromaDelta",
  maxBrightPixelRatioDelta: "brightPixelRatioDelta",
  maxBrightBoundsWidthRelativeError: "brightBoundsWidthRelativeError",
  maxBrightBoundsHeightRelativeError: "brightBoundsHeightRelativeError",
});

const REQUIRED_REVIEW_FEATURES = Object.freeze([
  "flameCore",
  "additiveGlow",
  "receiverFootprint",
  "hue",
  "apparentScale",
  "backgroundExposure",
]);

const FORBIDDEN_REVIEW_ARTIFACTS = Object.freeze([
  "placeholder",
  "selectionOverlay",
  "debugReceiver",
  "proceduralHaloOrSubstitute",
  "blankTile",
  "failedTile",
  "bridgeTile",
  "staleArtifact",
]);

const [command, ...rawArgs] = process.argv.slice(2);
const options = parseArgs(rawArgs);

function runCompare() {
  const profilePath = requiredPath(options.profile, "--profile");
  const outDir = requiredPath(options.outDir, "--outDir");
  if (existsSync(outDir)) {
    failUsage("comparison-output-directory-already-exists");
  }
  mkdirSync(outDir, { recursive: false });
  try {
    const prepared = prepareComparison(profilePath);
    const sideBySidePath = resolve(outDir, "nwn-vs-aurora-web-side-by-side.png");
    const heatmapPath = resolve(outDir, "nwn-vs-aurora-web-heatmap.png");
    const reportPath = resolve(outDir, "matched-comparison.json");
    const sideBySideBytes = encodePngRgba(
      prepared.images.nwn.width * 2,
      prepared.images.nwn.height,
      buildSideBySideRgba(prepared.images.nwn, prepared.images.web),
    );
    const heatmapBytes = encodePngRgba(
      prepared.images.nwn.width,
      prepared.images.nwn.height,
      prepared.globalDiff.rgba,
    );
    writeNewFile(sideBySidePath, sideBySideBytes);
    writeNewFile(heatmapPath, heatmapBytes);
    const metricsWithinFrozenTolerance = prepared.blockerCodes.length === 0;
    const report = {
      version: COMPARISON_VERSION,
      generatedAt: new Date().toISOString(),
      status: metricsWithinFrozenTolerance
        ? "metrics-within-frozen-tolerance-awaiting-visual-review"
        : "metrics-outside-frozen-tolerance",
      captureIntegrityAccepted: true,
      metricsWithinFrozenTolerance,
      retailParityAccepted: false,
      canonicalParityPromoted: false,
      fixture: exactFixtureSummary(),
      profile: describeFile(profilePath),
      policy: prepared.policyDescriptor,
      cameraTimeAlignment: prepared.alignmentDescriptor,
      inputs: prepared.inputDescriptors,
      comparisonOrder: ["nwn-retail", "aurora-web"],
      viewport: prepared.viewport,
      rendererProfile: prepared.profile.comparison.rendererProfile,
      features: prepared.features,
      globalMetric: prepared.globalDiff.metric,
      outputs: {
        sideBySide: {
          ...describeFile(sideBySidePath),
          width: prepared.images.nwn.width * 2,
          height: prepared.images.nwn.height,
          order: ["nwn-retail", "aurora-web"],
        },
        heatmap: {
          ...describeFile(heatmapPath),
          width: prepared.images.nwn.width,
          height: prepared.images.nwn.height,
        },
      },
      blockerCodes: prepared.blockerCodes,
      nonEvidenceNotice:
        "Objective metrics do not self-promote retail parity; a separate hash-bound passing human visual review is mandatory.",
    };
    writeNewJson(reportPath, report);
    print({
      status: report.status,
      output: reportPath,
      captureIntegrityAccepted: true,
      retailParityAccepted: false,
      blockerCodes: report.blockerCodes,
    });
    if (!metricsWithinFrozenTolerance) {
      process.exitCode = 1;
    }
  } catch (error) {
    const blockerCodes = blockerCodesFromError(error);
    const blockerPath = resolve(outDir, "matched-comparison.blocker.json");
    const blocker = {
      version: COMPARISON_BLOCKER_VERSION,
      generatedAt: new Date().toISOString(),
      status: "blocked",
      captureIntegrityAccepted: false,
      retailParityAccepted: false,
      canonicalParityPromoted: false,
      profilePath,
      blockerCodes,
      resumeCondition:
        "Correct the exact failed provenance/comparability gate, preserve the immutable source evidence, and run compare into a new absent output directory.",
    };
    writeNewJson(blockerPath, blocker);
    process.stderr.write(`${JSON.stringify(blocker, null, 2)}\n`);
    process.exitCode = 1;
  }
}

function admit() {
  const profilePath = requiredPath(options.profile, "--profile");
  const comparisonPath = requiredPath(options.comparison, "--comparison");
  const reviewPath = requiredPath(options.visualReview, "--visualReview");
  const outputPath = requiredPath(options.out, "--out");
  if (existsSync(outputPath)) {
    failUsage("admission-output-already-exists");
  }

  const blockerCodes = [];
  let prepared = null;
  let comparison = null;
  let review = null;
  try {
    prepared = prepareComparison(profilePath);
  } catch (error) {
    blockerCodes.push(...blockerCodesFromError(error));
  }
  try {
    comparison = readJsonLimited(comparisonPath, "comparison-json-invalid");
  } catch (error) {
    blockerCodes.push(...blockerCodesFromError(error));
  }
  try {
    review = readJsonLimited(reviewPath, "human-visual-review-json-invalid");
  } catch (error) {
    blockerCodes.push(...blockerCodesFromError(error));
  }

  if (prepared && comparison) {
    validateComparisonForAdmission(prepared, profilePath, comparisonPath, comparison, blockerCodes);
  }
  if (comparison && review) {
    validateVisualReview(comparisonPath, comparison, reviewPath, review, blockerCodes);
  }
  const uniqueBlockers = unique(blockerCodes);
  const accepted = uniqueBlockers.length === 0;
  const admission = {
    version: ADMISSION_VERSION,
    evaluatedAt: new Date().toISOString(),
    status: accepted ? "verified" : "failed",
    accepted,
    proofCompleteness: accepted ? "verified" : "failed",
    modelVisibility: prepared?.modelVisibility ?? "not_tested",
    captureIntegrityAccepted: prepared?.captureIntegrityAccepted === true,
    retailParityAccepted: accepted,
    canonicalParityPromoted: accepted,
    fixture: exactFixtureSummary(),
    profile: existsSync(profilePath) ? describeFile(profilePath) : { path: profilePath },
    comparison: existsSync(comparisonPath)
      ? describeFile(comparisonPath)
      : { path: comparisonPath },
    visualReview: existsSync(reviewPath) ? describeFile(reviewPath) : { path: reviewPath },
    blockerCodes: uniqueBlockers,
    resumeCondition: accepted
      ? null
      : "Produce a fresh exact matched comparison and a hash-bound passing visual review after correcting every listed blocker; never edit or relabel the failed artifacts.",
  };
  writeNewJson(outputPath, admission);
  print({
    status: admission.status,
    output: outputPath,
    accepted,
    retailParityAccepted: admission.retailParityAccepted,
    blockerCodes: uniqueBlockers,
  });
  if (!accepted) {
    process.exitCode = 1;
  }
}

function prepareComparison(profilePath) {
  const profile = readJsonLimited(profilePath, "matched-profile-json-invalid");
  const blockers = [];
  validateExactProfile(profile, blockers);

  const aurS07ProfileRef = readBoundJsonRef(
    profilePath,
    profile?.aurS07?.profile,
    "aur-s07-profile",
    blockers,
  );
  const aurS07PacketRef = readBoundJsonRef(
    profilePath,
    profile?.aurS07?.packet,
    "aur-s07-packet",
    blockers,
  );
  const aurS07ValidationRef = readBoundJsonRef(
    profilePath,
    profile?.aurS07?.validation,
    "aur-s07-validation",
    blockers,
  );
  const webFrameRef = readBoundJsonRef(
    profilePath,
    profile?.web?.frame,
    "web-frame",
    blockers,
  );
  const webScreenshotRef = readBoundBinaryRef(
    profilePath,
    profile?.web?.screenshot,
    "web-screenshot",
    PNG_SIZE_LIMIT,
    blockers,
  );
  const alignmentRef = readBoundJsonRef(
    profilePath,
    profile?.comparison?.cameraTimeAlignment,
    "camera-time-alignment",
    blockers,
  );
  const policyRef = readBoundJsonRef(
    profilePath,
    profile?.comparison?.policy,
    "visual-similarity-policy",
    blockers,
  );

  const aur = validateAurS07(
    aurS07ProfileRef,
    aurS07PacketRef,
    aurS07ValidationRef,
    blockers,
  );
  validateWebFrame(
    webFrameRef,
    webScreenshotRef,
    profile?.comparison?.viewport,
    alignmentRef?.json,
    blockers,
  );
  validateAlignment(
    alignmentRef?.json,
    profile?.comparison?.viewport,
    aur.observedAt,
    webFrameRef?.json?.capturedAt,
    blockers,
  );

  const nwnCapture = aur.runtimeCapture;
  const images = {
    nwn: nwnCapture?.path
      ? readPngRgbaLimited(nwnCapture.path, "nwn-runtime-capture-png-invalid")
      : null,
    web: webScreenshotRef?.path
      ? readPngRgbaLimited(webScreenshotRef.path, "web-screenshot-png-invalid")
      : null,
  };
  if (!images.nwn || !images.web) {
    blockers.push("comparison-png-input-missing");
  }
  if (
    images.nwn &&
    images.web &&
    (images.nwn.width !== images.web.width || images.nwn.height !== images.web.height)
  ) {
    blockers.push("comparison-png-dimensions-mismatch");
  }
  const viewport = profile?.comparison?.viewport;
  if (
    images.nwn &&
    (!sameNumber(images.nwn.width, viewport?.width) ||
      !sameNumber(images.nwn.height, viewport?.height))
  ) {
    blockers.push("nwn-png-viewport-mismatch");
  }
  if (
    images.web &&
    (!sameNumber(images.web.width, viewport?.width) ||
      !sameNumber(images.web.height, viewport?.height))
  ) {
    blockers.push("web-png-viewport-mismatch");
  }

  const policy = validatePolicy(
    policyRef,
    nwnCapture?.descriptor?.sha256 ?? null,
    aur.observedAt,
    webFrameRef?.json?.capturedAt,
    images.nwn,
    blockers,
  );
  if (blockers.length > 0) {
    throw new GateFailure(blockers);
  }

  const features = {};
  const metricBlockers = [];
  for (const feature of REQUIRED_FEATURES) {
    const region = policy.regions[feature];
    const nwn = summarizeRegion(images.nwn, region);
    const web = summarizeRegion(images.web, region);
    const metrics = compareRegionSummaries(nwn, web);
    const tolerance = policy.tolerances[feature];
    const checks = evaluateTolerance(feature, metrics, tolerance);
    metricBlockers.push(
      ...checks.filter((check) => !check.passed).map((check) => check.blockerCode),
    );
    features[feature] = { region, nwn, web, metrics, tolerance, checks };
  }
  const globalDiff = buildGlobalDiff(images.nwn, images.web);
  return {
    profile,
    viewport,
    images,
    features,
    globalDiff,
    blockerCodes: unique(metricBlockers),
    captureIntegrityAccepted: true,
    modelVisibility: "visible",
    policyDescriptor: policyRef.descriptor,
    alignmentDescriptor: alignmentRef.descriptor,
    inputDescriptors: {
      aurS07Profile: aurS07ProfileRef.descriptor,
      aurS07Packet: aurS07PacketRef.descriptor,
      aurS07Validation: aurS07ValidationRef.descriptor,
      nwnRuntimeObservation: aur.runtimeObservation.descriptor,
      nwnRuntimeCapture: nwnCapture.descriptor,
      nwnEngineLoadLog: aur.engineLoadLog.descriptor,
      webFrame: webFrameRef.descriptor,
      webScreenshot: webScreenshotRef.descriptor,
    },
  };
}

function validateExactProfile(profile, blockers) {
  if (profile?.version !== PROFILE_VERSION || !nonEmptyString(profile?.profileId)) {
    blockers.push("matched-profile-identity-invalid");
  }
  const fixture = profile?.fixture;
  if (
    fixture?.id !== EXACT_FIXTURE.id ||
    fixture?.moduleSha256 !== EXACT_FIXTURE.moduleSha256 ||
    fixture?.area !== EXACT_FIXTURE.area ||
    !sameJson(fixture?.entryPoint, EXACT_FIXTURE.entryPoint) ||
    !sameJson(fixture?.position, EXACT_FIXTURE.position) ||
    !sameJson(fixture?.orderedHakList, [])
  ) {
    blockers.push("matched-profile-fixture-target-mismatch");
  }
  if (!sameJson(fixture?.placeable, EXACT_FIXTURE.placeable)) {
    blockers.push("matched-profile-placeable-lineage-mismatch");
  }
  if (!sameJson(fixture?.receiver, EXACT_FIXTURE.receiver)) {
    blockers.push("matched-profile-receiver-lineage-mismatch");
  }
  const viewport = profile?.comparison?.viewport;
  if (
    !positiveInteger(viewport?.width) ||
    !positiveInteger(viewport?.height) ||
    viewport.width > PNG_DIMENSION_LIMIT ||
    viewport.height > PNG_DIMENSION_LIMIT ||
    viewport?.deviceScaleFactor !== 1
  ) {
    blockers.push("matched-profile-viewport-invalid");
  }
  if (profile?.comparison?.rendererProfile !== "enhanced-performance") {
    blockers.push("matched-profile-renderer-profile-invalid");
  }
}

function validateAurS07(profileRef, packetRef, validationRef, blockers) {
  const runtimeArtifacts = new Map();
  if (!profileRef || !packetRef || !validationRef) {
    blockers.push("aur-s07-bound-evidence-missing");
    return emptyAurS07Result();
  }
  const profile = profileRef.json;
  const packet = packetRef.json;
  const validation = validationRef.json;
  if (
    profile?.version !== "aur-s07-runtime-profile/v1" ||
    !nonEmptyString(profile?.id) ||
    profile?.module?.sha256 !== EXACT_FIXTURE.moduleSha256 ||
    profile?.module?.area !== EXACT_FIXTURE.area ||
    !sameJson(profile?.module?.entryPoint, EXACT_FIXTURE.entryPoint) ||
    !sameJson(profile?.orderedHakList, [])
  ) {
    blockers.push("aur-s07-profile-target-mismatch");
  }
  if (!validExactAurs07Fixtures(profile?.fixtures)) {
    blockers.push("aur-s07-profile-fixture-mismatch");
  }
  if (profile?.geometryGate?.status !== "verified") {
    blockers.push("aur-s07-geometry-gate-not-verified");
  } else {
    validateRawPathHash(
      profileRef.path,
      profile.geometryGate.artifact,
      profile.geometryGate.sha256,
      "aur-s07-geometry-gate",
      JSON_SIZE_LIMIT,
      blockers,
    );
  }
  if (
    validation?.ok !== true ||
    validation?.status !== "verified" ||
    validation?.profileId !== profile?.id
  ) {
    blockers.push("aur-s07-central-validation-not-verified");
  }
  if (
    packet?.version !== "aur-s07-runtime-packet/v1" ||
    packet?.profileId !== profile?.id ||
    packet?.moduleSha256 !== EXACT_FIXTURE.moduleSha256 ||
    packet?.area !== EXACT_FIXTURE.area ||
    !sameJson(packet?.entryPoint, EXACT_FIXTURE.entryPoint) ||
    !sameJson(packet?.fixtures, profile?.fixtures)
  ) {
    blockers.push("aur-s07-packet-target-mismatch");
  }
  if (
    packet?.modelVisibility?.status !== "visible" ||
    packet?.modelVisibility?.blank !== false ||
    packet?.modelVisibility?.placeholder !== false
  ) {
    blockers.push("aur-s07-model-not-visible-or-placeholder");
  }
  if (!Array.isArray(packet?.artifacts)) {
    blockers.push("aur-s07-packet-artifacts-invalid");
  } else {
    for (const artifact of packet.artifacts) {
      const kind = artifact?.kind;
      if (!nonEmptyString(kind) || runtimeArtifacts.has(kind)) {
        blockers.push("aur-s07-packet-artifact-kind-invalid-or-duplicate");
        continue;
      }
      const validated = validateRawPathHash(
        packetRef.path,
        artifact?.path,
        artifact?.sha256,
        `aur-s07-${kind}`,
        kind === "runtime-capture"
          ? PNG_SIZE_LIMIT
          : kind === "engine-load-log"
            ? LOG_SIZE_LIMIT
            : JSON_SIZE_LIMIT,
        blockers,
      );
      runtimeArtifacts.set(kind, validated);
    }
  }
  for (const kind of ["runtime-observation", "runtime-capture", "engine-load-log"]) {
    if (!runtimeArtifacts.get(kind)) {
      blockers.push(`aur-s07-required-artifact-missing:${kind}`);
    }
  }
  const runtimeObservation = runtimeArtifacts.get("runtime-observation") ?? emptyDescriptor();
  let observedAt = null;
  if (runtimeObservation.path) {
    try {
      const observation = readJsonLimited(
        runtimeObservation.path,
        "aur-s07-runtime-observation-json-invalid",
      );
      if (
        observation?.version !== "aur-s07-runtime-observation/v1" ||
        observation?.profileId !== profile?.id ||
        observation?.process?.name?.toLowerCase() !== "nwmain" ||
        observation?.moduleSha256 !== EXACT_FIXTURE.moduleSha256 ||
        observation?.area !== EXACT_FIXTURE.area ||
        !sameJson(observation?.entryPoint, EXACT_FIXTURE.entryPoint) ||
        !validIsoDate(observation?.observedAt)
      ) {
        blockers.push("aur-s07-runtime-observation-binding-invalid");
      } else {
        observedAt = observation.observedAt;
      }
    } catch (error) {
      blockers.push(...blockerCodesFromError(error));
    }
  }
  const runtimeCapture = runtimeArtifacts.get("runtime-capture") ?? emptyDescriptor();
  if (runtimeCapture.path && !runtimeCapture.path.toLowerCase().endsWith(".png")) {
    blockers.push("aur-s07-runtime-capture-must-be-png");
  }
  const engineLoadLog = runtimeArtifacts.get("engine-load-log") ?? emptyDescriptor();
  if (engineLoadLog.path && statSync(engineLoadLog.path).size === 0) {
    blockers.push("aur-s07-engine-load-log-empty");
  }
  return { runtimeObservation, runtimeCapture, engineLoadLog, observedAt };
}

function validateWebFrame(frameRef, screenshotRef, viewport, alignment, blockers) {
  if (!frameRef || !screenshotRef) {
    blockers.push("web-bound-evidence-missing");
    return;
  }
  const frame = frameRef.json;
  const area = frame?.domStatus?.areaPreview;
  const runtime = frame?.domStatus?.runtimeObservability;
  if (
    frame?.version !== "aurora-vfx-app-route-cdp-capture/v1" ||
    frame?.captureIntegrityAccepted !== true ||
    frame?.retailParityAccepted !== false ||
    frame?.accepted !== false ||
    !validIsoDate(frame?.capturedAt)
  ) {
    blockers.push("web-capture-integrity-contract-invalid");
  }
  if (!samePath(frameRef.path, frame?.screenshotPath, screenshotRef.path)) {
    blockers.push("web-screenshot-frame-binding-mismatch");
  }
  if (
    !sameViewport(frame?.requestedViewport, viewport) ||
    frame?.domStatus?.routePath !== "/dev/area-light-shadow-preview"
  ) {
    blockers.push("web-route-or-viewport-mismatch");
  }
  if (!routeHasExactOracle(frame?.requestedRoute) || !routeHasExactOracle(frame?.finalRoute)) {
    blockers.push("web-oracle-route-binding-invalid");
  }
  if (
    runtime?.version !== "aurora-vfx-runtime-observability/v1" ||
    runtime?.assetSettlement?.status !== "settled" ||
    runtime?.proofGate?.status !== "pass" ||
    (Array.isArray(runtime?.proofGate?.blockerManifest) &&
      runtime.proofGate.blockerManifest.length > 0)
  ) {
    blockers.push("web-runtime-observability-not-settled");
  }
  if (
    area?.oracleFixture !== EXACT_FIXTURE.id ||
    area?.renderStatus !== "ready" ||
    area?.placeableModelStatus !== "loaded" ||
    area?.placeableModelTextureSettled !== true
  ) {
    blockers.push("web-area-or-placeable-not-settled");
  }
  if (area?.placeableSourceLineageStatus !== "pass") {
    blockers.push("web-placeable-source-lineage-not-retail");
  }
  if (area?.placeableLightProjectionStatus !== "pass") {
    blockers.push("web-placeable-light-projection-invalid");
  }
  if (area?.terrainSourceLineageStatus !== "pass") {
    blockers.push("web-terrain-source-lineage-not-retail");
  }
  requireSingleLineage(
    area?.placeableSourceModelObjectKeys,
    area?.placeableSourceModelHashes,
    "/__aurora/sources/vanilla/models/plc_i06.mdl",
    EXACT_FIXTURE.placeable.sourceMdlSha256,
    "web-placeable-source-lineage-mismatch",
    blockers,
  );
  requireSingleLineage(
    area?.terrainSourceModelObjectKeys,
    area?.terrainSourceModelHashes,
    "/__aurora/sources/vanilla/models/tin01_d11_01.mdl",
    EXACT_FIXTURE.receiver.sourceMdlSha256,
    "web-terrain-source-mdl-lineage-mismatch",
    blockers,
  );
  requireSingleLineage(
    area?.terrainModelAssetObjectKeys,
    area?.terrainModelAssetHashes,
    "/__aurora/derived/models/aurora-mdl-to-glb_v18-source-proven-texture-aliases/tin01_d11_01.glb",
    EXACT_FIXTURE.receiver.modelAssetSha256,
    "web-terrain-glb-lineage-mismatch",
    blockers,
  );
  requireSingleLineage(
    area?.terrainTextureObjectKeys,
    area?.terrainTextureHashes,
    "/__aurora/sources/vanilla/textures/tin01_shpflr1.dds",
    EXACT_FIXTURE.receiver.textureSha256,
    "web-terrain-texture-lineage-mismatch",
    blockers,
  );
  const proof = area?.placeableLightingProof;
  if (
    proof?.version !== "aurora-placeable-lighting-proof-snapshot/v2" ||
    proof?.retailParityStatus !== "blocked_pending_matched_nwn_oracle"
  ) {
    blockers.push("web-placeable-lighting-proof-boundary-invalid");
  }
  if (
    proof?.profile?.version !== "aurora-placeable-lighting-proof-profile/v1" ||
    proof?.profile?.receiver !== "area" ||
    proof?.profile?.pointLight !== true ||
    proof?.profile?.halo !== false ||
    proof?.profile?.vfx !== true ||
    proof?.profile?.postprocess !== true
  ) {
    blockers.push("web-placeable-lighting-proof-profile-invalid");
  }
  if (
    !Number.isInteger(proof?.facts?.areaReceiverMeshCount) ||
    proof.facts.areaReceiverMeshCount <= 0 ||
    proof?.facts?.debugReceiverMeshCount !== 0 ||
    !Number.isInteger(proof?.facts?.reactiveReceiverMaterialCount) ||
    proof.facts.reactiveReceiverMaterialCount <= 0 ||
    proof?.facts?.unlitReceiverMaterialCount !== 0 ||
    proof?.facts?.unknownReceiverMaterialCount !== 0 ||
    proof?.facts?.pointLightCount !== 1 ||
    proof?.facts?.assetSettlementStatus !== "settled"
  ) {
    blockers.push("web-placeable-lighting-receiver-facts-invalid");
  }
  const disallowedProofBlockers = (Array.isArray(proof?.blockerCodes)
    ? proof.blockerCodes
    : ["missing-blocker-list"]
  ).filter(
    (code) =>
      ![
        "APL-PROOF-VFX-ENABLED",
        "APL-PROOF-SHADOW-ENABLED",
        "APL-PROOF-POSTPROCESS-ENABLED",
      ].includes(code),
  );
  if (disallowedProofBlockers.length > 0) {
    blockers.push("web-placeable-lighting-proof-has-disallowed-blocker");
  }
  if (
    !Number.isFinite(frame?.staticCaptureTimeSeconds) ||
    frame.staticCaptureTimeSeconds !== alignment?.timeline?.webSeconds
  ) {
    blockers.push("web-capture-time-alignment-mismatch");
  }
}

function validateAlignment(alignment, viewport, nwnObservedAt, webCapturedAt, blockers) {
  const maxCaptureSkewMs = alignment?.freshness?.maxCaptureSkewMs;
  const captureSkewMs =
    validIsoDate(nwnObservedAt) && validIsoDate(webCapturedAt)
      ? Math.abs(Date.parse(nwnObservedAt) - Date.parse(webCapturedAt))
      : Number.POSITIVE_INFINITY;
  if (
    alignment?.version !== ALIGNMENT_VERSION ||
    alignment?.status !== "matched" ||
    alignment?.fixtureId !== EXACT_FIXTURE.id ||
    alignment?.moduleSha256 !== EXACT_FIXTURE.moduleSha256 ||
    alignment?.area !== EXACT_FIXTURE.area ||
    !sameJson(alignment?.viewport, viewport) ||
    alignment?.camera?.status !== "matched" ||
    !nonEmptyString(alignment?.camera?.method) ||
    !sameJson(alignment?.camera?.nwn, EXACT_FIXTURE.cameraFacing) ||
    !Array.isArray(alignment?.camera?.web?.position) ||
    alignment.camera.web.position.length !== 3 ||
    !alignment.camera.web.position.every(Number.isFinite) ||
    !Array.isArray(alignment?.camera?.web?.target) ||
    alignment.camera.web.target.length !== 3 ||
    !alignment.camera.web.target.every(Number.isFinite) ||
    !nonEmptyString(alignment?.camera?.web?.projection) ||
    alignment?.timeline?.status !== "matched" ||
    !Number.isFinite(alignment?.timeline?.nwnSeconds) ||
    !Number.isFinite(alignment?.timeline?.webSeconds) ||
    alignment.timeline.nwnSeconds !== alignment.timeline.webSeconds ||
    alignment.timeline.nwnSeconds !== EXACT_FIXTURE.captureTimeSeconds ||
    alignment?.freshness?.status !== "fresh" ||
    !Number.isInteger(maxCaptureSkewMs) ||
    maxCaptureSkewMs <= 0 ||
    maxCaptureSkewMs > 86_400_000 ||
    captureSkewMs > maxCaptureSkewMs
  ) {
    blockers.push("camera-time-alignment-not-matched");
  }
}

function validatePolicy(
  policyRef,
  nwnCaptureSha256,
  nwnObservedAt,
  webCapturedAt,
  image,
  blockers,
) {
  if (!policyRef) {
    blockers.push("visual-similarity-policy-missing");
    return { regions: {}, tolerances: {} };
  }
  const policy = policyRef.json;
  if (
    policy?.version !== POLICY_VERSION ||
    !nonEmptyString(policy?.policyId) ||
    policy?.status !== "frozen-before-parity-tuning" ||
    !validIsoDate(policy?.frozenAt)
  ) {
    blockers.push("visual-similarity-policy-identity-invalid");
  }
  if (
    validIsoDate(policy?.frozenAt) &&
    ((validIsoDate(webCapturedAt) && Date.parse(policy.frozenAt) >= Date.parse(webCapturedAt)) ||
      (validIsoDate(nwnObservedAt) && Date.parse(policy.frozenAt) >= Date.parse(nwnObservedAt)))
  ) {
    blockers.push("visual-similarity-policy-not-frozen-before-web-capture");
  }
  if (!sameSet(policy?.requiredFeatures, REQUIRED_FEATURES)) {
    blockers.push("visual-similarity-required-features-invalid");
  }
  const retailCaptureHashes = [];
  if (!Array.isArray(policy?.retailOracleCaptures) || policy.retailOracleCaptures.length < 2) {
    blockers.push("visual-similarity-policy-retail-repeats-missing");
  } else {
    for (const ref of policy.retailOracleCaptures) {
      const capture = readBoundBinaryRef(
        policyRef.path,
        ref,
        "visual-similarity-policy-retail-capture",
        PNG_SIZE_LIMIT,
        blockers,
      );
      if (capture) {
        retailCaptureHashes.push(capture.descriptor.sha256);
        try {
          const retailImage = readPngRgbaLimited(
            capture.path,
            "visual-similarity-policy-retail-capture-png-invalid",
          );
          if (
            image &&
            (retailImage.width !== image.width || retailImage.height !== image.height)
          ) {
            blockers.push("visual-similarity-policy-retail-capture-viewport-mismatch");
          }
        } catch (error) {
          blockers.push(...blockerCodesFromError(error));
        }
      }
    }
  }
  if (new Set(retailCaptureHashes).size < 2) {
    blockers.push("visual-similarity-policy-retail-repeats-not-distinct");
  }
  if (!retailCaptureHashes.includes(nwnCaptureSha256)) {
    blockers.push("visual-similarity-policy-current-nwn-capture-unbound");
  }
  for (const feature of REQUIRED_FEATURES) {
    const region = policy?.regions?.[feature];
    if (!validRegion(region, image)) {
      blockers.push(`visual-similarity-region-invalid:${feature}`);
    }
    const tolerance = policy?.tolerances?.[feature];
    for (const key of REQUIRED_TOLERANCES[feature]) {
      const value = tolerance?.[key];
      const maxAllowed = key === "maxWarmChromaDelta" ? 2 : 1;
      if (!Number.isFinite(value) || value < 0 || value > maxAllowed) {
        blockers.push(`visual-similarity-tolerance-invalid:${feature}:${key}`);
      }
    }
    if (
      tolerance &&
      Object.keys(tolerance).some(
        (key) => !Object.prototype.hasOwnProperty.call(TOLERANCE_TO_METRIC, key),
      )
    ) {
      blockers.push(`visual-similarity-tolerance-key-unknown:${feature}`);
    }
  }
  return policy;
}

function validateComparisonForAdmission(
  prepared,
  profilePath,
  comparisonPath,
  comparison,
  blockers,
) {
  if (
    comparison?.version !== COMPARISON_VERSION ||
    comparison?.status !== "metrics-within-frozen-tolerance-awaiting-visual-review" ||
    comparison?.captureIntegrityAccepted !== true ||
    comparison?.metricsWithinFrozenTolerance !== true ||
    comparison?.retailParityAccepted !== false ||
    comparison?.canonicalParityPromoted !== false ||
    !Array.isArray(comparison?.blockerCodes) ||
    comparison.blockerCodes.length !== 0
  ) {
    blockers.push("comparison-not-metric-passing-unpromoted");
  }
  if (comparison?.profile?.sha256 !== describeFile(profilePath).sha256) {
    blockers.push("comparison-profile-hash-mismatch");
  }
  if (!sameJson(comparison?.fixture, exactFixtureSummary())) {
    blockers.push("comparison-fixture-binding-mismatch");
  }
  if (!sameJson(comparison?.viewport, prepared.viewport)) {
    blockers.push("comparison-viewport-binding-mismatch");
  }
  if (!sameJson(comparison?.features, prepared.features)) {
    blockers.push("comparison-feature-metrics-not-reproducible");
  }
  if (!sameJson(comparison?.globalMetric, prepared.globalDiff.metric)) {
    blockers.push("comparison-global-metric-not-reproducible");
  }
  const expectedSideBySide = encodePngRgba(
    prepared.images.nwn.width * 2,
    prepared.images.nwn.height,
    buildSideBySideRgba(prepared.images.nwn, prepared.images.web),
  );
  const expectedHeatmap = encodePngRgba(
    prepared.images.nwn.width,
    prepared.images.nwn.height,
    prepared.globalDiff.rgba,
  );
  validateDerivedOutput(
    comparisonPath,
    comparison?.outputs?.sideBySide,
    sha256(expectedSideBySide),
    "comparison-side-by-side",
    blockers,
  );
  validateDerivedOutput(
    comparisonPath,
    comparison?.outputs?.heatmap,
    sha256(expectedHeatmap),
    "comparison-heatmap",
    blockers,
  );
}

function validateVisualReview(comparisonPath, comparison, reviewPath, review, blockers) {
  if (
    review?.version !== REVIEW_VERSION ||
    !validIsoDate(review?.reviewedAt) ||
    !nonEmptyString(review?.reviewer)
  ) {
    blockers.push("human-visual-review-identity-invalid");
  }
  const comparisonDescriptor = describeFile(comparisonPath);
  const boundComparisonPath = resolveOwnedPath(reviewPath, review?.comparison?.path);
  if (
    boundComparisonPath !== comparisonPath ||
    review?.comparison?.sha256 !== comparisonDescriptor.sha256
  ) {
    blockers.push("human-visual-review-comparison-binding-mismatch");
  }
  if (review?.sideBySideSha256 !== comparison?.outputs?.sideBySide?.sha256) {
    blockers.push("human-visual-review-side-by-side-binding-mismatch");
  }
  if (
    review?.verdict !== "passed" ||
    review?.targetReadable !== true ||
    review?.effectReadable !== true
  ) {
    blockers.push("human-visual-review-not-passed");
  }
  for (const feature of REQUIRED_REVIEW_FEATURES) {
    if (review?.features?.[feature] !== "similar") {
      blockers.push(`human-visual-review-feature-not-similar:${feature}`);
    }
  }
  for (const artifact of FORBIDDEN_REVIEW_ARTIFACTS) {
    if (review?.forbiddenArtifacts?.[artifact] !== false) {
      blockers.push(`human-visual-review-forbidden-artifact:${artifact}`);
    }
  }
  if (!Array.isArray(review?.notes) || review.notes.length === 0) {
    blockers.push("human-visual-review-notes-missing");
  }
}

function summarizeRegion(image, region) {
  const luma = [];
  let sumR = 0;
  let sumG = 0;
  let sumB = 0;
  let brightCount = 0;
  let minX = region.width;
  let minY = region.height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < region.height; y += 1) {
    for (let x = 0; x < region.width; x += 1) {
      const pixel = pixelAt(image, region.x + x, region.y + y);
      const normalized = [pixel[0] / 255, pixel[1] / 255, pixel[2] / 255];
      const value = luminance(normalized);
      luma.push(value);
      sumR += normalized[0];
      sumG += normalized[1];
      sumB += normalized[2];
      if (value >= region.brightLumaThreshold) {
        brightCount += 1;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }
  luma.sort((left, right) => left - right);
  const count = luma.length;
  const meanRgb = [sumR / count, sumG / count, sumB / count];
  return {
    pixelCount: count,
    meanLuma: mean(luma),
    p95Luma: percentile(luma, 0.95),
    peakLuma: luma.at(-1),
    meanRgb,
    warmChroma: meanRgb[0] - meanRgb[2],
    brightPixelRatio: brightCount / count,
    brightBounds:
      brightCount > 0
        ? {
            x: minX,
            y: minY,
            width: maxX - minX + 1,
            height: maxY - minY + 1,
          }
        : null,
  };
}

function compareRegionSummaries(nwn, web) {
  return {
    meanLumaRelativeError: relativeError(nwn.meanLuma, web.meanLuma),
    p95LumaRelativeError: relativeError(nwn.p95Luma, web.p95Luma),
    peakLumaRelativeError: relativeError(nwn.peakLuma, web.peakLuma),
    meanRgbDistance:
      Math.sqrt(
        nwn.meanRgb.reduce(
          (total, value, index) => total + (value - web.meanRgb[index]) ** 2,
          0,
        ),
      ) / Math.sqrt(3),
    warmChromaDelta: Math.abs(nwn.warmChroma - web.warmChroma),
    brightPixelRatioDelta: Math.abs(nwn.brightPixelRatio - web.brightPixelRatio),
    brightBoundsWidthRelativeError: relativeNullableBounds(
      nwn.brightBounds?.width,
      web.brightBounds?.width,
    ),
    brightBoundsHeightRelativeError: relativeNullableBounds(
      nwn.brightBounds?.height,
      web.brightBounds?.height,
    ),
  };
}

function evaluateTolerance(feature, metrics, tolerance) {
  return REQUIRED_TOLERANCES[feature].map((toleranceKey) => {
    const metricKey = TOLERANCE_TO_METRIC[toleranceKey];
    const actual = metrics[metricKey];
    const maximum = tolerance[toleranceKey];
    const passed = Number.isFinite(actual) && actual <= maximum;
    return {
      metric: metricKey,
      actual,
      maximum,
      passed,
      blockerCode: passed
        ? null
        : `metric-outside-frozen-tolerance:${feature}:${metricKey}`,
    };
  });
}

function buildGlobalDiff(nwn, web) {
  const rgba = Buffer.alloc(nwn.width * nwn.height * 4);
  let sumRgb = 0;
  let sumLuma = 0;
  let sumSquared = 0;
  let maxRgb = 0;
  let changed = 0;
  const count = nwn.width * nwn.height;
  for (let index = 0; index < count; index += 1) {
    const offset = index * 4;
    const dr = Math.abs(nwn.rgba[offset] - web.rgba[offset]);
    const dg = Math.abs(nwn.rgba[offset + 1] - web.rgba[offset + 1]);
    const db = Math.abs(nwn.rgba[offset + 2] - web.rgba[offset + 2]);
    const rgb = (dr + dg + db) / 3;
    const leftLuma = luminance([
      nwn.rgba[offset] / 255,
      nwn.rgba[offset + 1] / 255,
      nwn.rgba[offset + 2] / 255,
    ]);
    const rightLuma = luminance([
      web.rgba[offset] / 255,
      web.rgba[offset + 1] / 255,
      web.rgba[offset + 2] / 255,
    ]);
    sumRgb += rgb;
    sumLuma += Math.abs(leftLuma - rightLuma);
    sumSquared += (dr * dr + dg * dg + db * db) / 3;
    maxRgb = Math.max(maxRgb, rgb);
    if (rgb > 5) changed += 1;
    const heat = heatPixel(rgb);
    rgba[offset] = heat[0];
    rgba[offset + 1] = heat[1];
    rgba[offset + 2] = heat[2];
    rgba[offset + 3] = 255;
  }
  return {
    rgba,
    metric: {
      width: nwn.width,
      height: nwn.height,
      pixelCount: count,
      meanAbsRgbDelta8Bit: sumRgb / count,
      meanAbsLumaDeltaNormalized: sumLuma / count,
      rmsRgbDelta8Bit: Math.sqrt(sumSquared / count),
      maxRgbDelta8Bit: maxRgb,
      changedPixelRatioGt5: changed / count,
    },
  };
}

function buildSideBySideRgba(left, right) {
  const width = left.width * 2;
  const rgba = Buffer.alloc(width * left.height * 4);
  const sourceRowBytes = left.width * 4;
  const outputRowBytes = width * 4;
  for (let y = 0; y < left.height; y += 1) {
    const sourceOffset = y * sourceRowBytes;
    const outputOffset = y * outputRowBytes;
    left.rgba.copy(rgba, outputOffset, sourceOffset, sourceOffset + sourceRowBytes);
    right.rgba.copy(
      rgba,
      outputOffset + sourceRowBytes,
      sourceOffset,
      sourceOffset + sourceRowBytes,
    );
  }
  return rgba;
}

function readPngRgbaLimited(path, code) {
  const stats = statSync(path);
  if (stats.size <= 0 || stats.size > PNG_SIZE_LIMIT) {
    throw new GateFailure([`${code}:size-invalid`]);
  }
  const buffer = readFileSync(path);
  if (buffer.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") {
    throw new GateFailure([`${code}:signature-invalid`]);
  }
  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idat = [];
  while (offset + 12 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    if (offset + 12 + length > buffer.length) {
      throw new GateFailure([`${code}:chunk-truncated`]);
    }
    const type = buffer.subarray(offset + 4, offset + 8).toString("ascii");
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data.readUInt8(8);
      colorType = data.readUInt8(9);
    } else if (type === "IDAT") {
      idat.push(data);
    } else if (type === "IEND") {
      break;
    }
    offset += length + 12;
  }
  if (
    !positiveInteger(width) ||
    !positiveInteger(height) ||
    width > PNG_DIMENSION_LIMIT ||
    height > PNG_DIMENSION_LIMIT ||
    bitDepth !== 8 ||
    ![0, 2, 6].includes(colorType) ||
    idat.length === 0
  ) {
    throw new GateFailure([`${code}:format-unsupported`]);
  }
  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : 1;
  const scanlineLength = width * channels;
  const inflated = inflateSync(Buffer.concat(idat));
  const expectedInflated = (scanlineLength + 1) * height;
  if (inflated.length !== expectedInflated) {
    throw new GateFailure([`${code}:inflated-size-invalid`]);
  }
  const raw = Buffer.alloc(width * height * channels);
  let inputOffset = 0;
  let outputOffset = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = inflated[inputOffset++];
    for (let x = 0; x < scanlineLength; x += 1) {
      const rawValue = inflated[inputOffset + x];
      const left = x >= channels ? raw[outputOffset + x - channels] : 0;
      const up = y > 0 ? raw[outputOffset + x - scanlineLength] : 0;
      const upLeft =
        y > 0 && x >= channels ? raw[outputOffset + x - scanlineLength - channels] : 0;
      let value;
      if (filter === 0) value = rawValue;
      else if (filter === 1) value = rawValue + left;
      else if (filter === 2) value = rawValue + up;
      else if (filter === 3) value = rawValue + Math.floor((left + up) / 2);
      else if (filter === 4) value = rawValue + paethPredictor(left, up, upLeft);
      else throw new GateFailure([`${code}:filter-unsupported:${filter}`]);
      raw[outputOffset + x] = value & 0xff;
    }
    inputOffset += scanlineLength;
    outputOffset += scanlineLength;
  }
  const rgba = Buffer.alloc(width * height * 4);
  for (let index = 0; index < width * height; index += 1) {
    if (colorType === 6) {
      raw.copy(rgba, index * 4, index * 4, index * 4 + 4);
    } else if (colorType === 2) {
      raw.copy(rgba, index * 4, index * 3, index * 3 + 3);
      rgba[index * 4 + 3] = 255;
    } else {
      rgba[index * 4] = raw[index];
      rgba[index * 4 + 1] = raw[index];
      rgba[index * 4 + 2] = raw[index];
      rgba[index * 4 + 3] = 255;
    }
  }
  return { width, height, rgba };
}

function encodePngRgba(width, height, rgba) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const rowOffset = y * (width * 4 + 1);
    raw[rowOffset] = 0;
    rgba.copy(raw, rowOffset + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([
    Buffer.from("89504e470d0a1a0a", "hex"),
    pngChunk(
      "IHDR",
      Buffer.from([
        (width >>> 24) & 0xff,
        (width >>> 16) & 0xff,
        (width >>> 8) & 0xff,
        width & 0xff,
        (height >>> 24) & 0xff,
        (height >>> 16) & 0xff,
        (height >>> 8) & 0xff,
        height & 0xff,
        8,
        6,
        0,
        0,
        0,
      ]),
    ),
    pngChunk("IDAT", deflateSync(raw)),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

function readBoundJsonRef(ownerPath, ref, label, blockers) {
  const bound = readBoundBinaryRef(ownerPath, ref, label, JSON_SIZE_LIMIT, blockers);
  if (!bound) return null;
  try {
    return { ...bound, json: JSON.parse(bound.bytes.toString("utf8")) };
  } catch {
    blockers.push(`${label}-json-invalid`);
    return null;
  }
}

function readBoundBinaryRef(ownerPath, ref, label, sizeLimit, blockers) {
  if (!isObject(ref) || !nonEmptyString(ref.path) || !validSha256(ref.sha256)) {
    blockers.push(`${label}-reference-invalid`);
    return null;
  }
  const path = resolveOwnedPath(ownerPath, ref.path);
  if (!existsSync(path)) {
    blockers.push(`${label}-file-missing`);
    return null;
  }
  const stats = statSync(path);
  if (!stats.isFile() || stats.size <= 0 || stats.size > sizeLimit) {
    blockers.push(`${label}-file-size-invalid`);
    return null;
  }
  const bytes = readFileSync(path);
  const actualHash = sha256(bytes);
  if (actualHash !== ref.sha256) {
    blockers.push(`${label}-hash-mismatch`);
    return null;
  }
  return { path, bytes, descriptor: describeBytes(path, bytes) };
}

function validateRawPathHash(ownerPath, rawPath, expectedHash, label, sizeLimit, blockers) {
  if (!nonEmptyString(rawPath) || !validSha256(expectedHash)) {
    blockers.push(`${label}-reference-invalid`);
    return null;
  }
  const path = resolveOwnedPath(ownerPath, rawPath);
  if (!existsSync(path)) {
    blockers.push(`${label}-file-missing`);
    return null;
  }
  const stats = statSync(path);
  if (!stats.isFile() || stats.size <= 0 || stats.size > sizeLimit) {
    blockers.push(`${label}-file-size-invalid`);
    return null;
  }
  const bytes = readFileSync(path);
  if (sha256(bytes) !== expectedHash) {
    blockers.push(`${label}-hash-mismatch`);
    return null;
  }
  return { path, descriptor: describeBytes(path, bytes) };
}

function validateDerivedOutput(ownerPath, ref, expectedHash, label, blockers) {
  if (!isObject(ref) || !nonEmptyString(ref.path) || !validSha256(ref.sha256)) {
    blockers.push(`${label}-reference-invalid`);
    return;
  }
  const path = resolveOwnedPath(ownerPath, ref.path);
  if (!existsSync(path)) {
    blockers.push(`${label}-file-missing`);
    return;
  }
  const actual = describeFile(path).sha256;
  if (actual !== ref.sha256 || actual !== expectedHash) {
    blockers.push(`${label}-hash-or-reproduction-mismatch`);
  }
}

function readJsonLimited(path, code) {
  if (!existsSync(path)) throw new GateFailure([`${code}:file-missing`]);
  const stats = statSync(path);
  if (!stats.isFile() || stats.size <= 0 || stats.size > JSON_SIZE_LIMIT) {
    throw new GateFailure([`${code}:size-invalid`]);
  }
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    throw new GateFailure([code]);
  }
}

function validateRawExactFixtureRow(row) {
  return (
    row?.id === EXACT_FIXTURE.id &&
    row?.resref === EXACT_FIXTURE.placeable.resref &&
    row?.appearance === EXACT_FIXTURE.placeable.appearance &&
    row?.model === EXACT_FIXTURE.placeable.modelResref &&
    sameJson(row?.position, EXACT_FIXTURE.position)
  );
}

function validExactAurs07Fixtures(fixtures) {
  return Array.isArray(fixtures) && fixtures.length === 1 && validateRawExactFixtureRow(fixtures[0]);
}

function requireSingleLineage(keys, hashes, suffix, expectedHash, code, blockers) {
  if (
    !Array.isArray(keys) ||
    keys.length !== 1 ||
    !String(keys[0]).replaceAll("\\", "/").toLowerCase().endsWith(suffix.toLowerCase()) ||
    !Array.isArray(hashes) ||
    hashes.length !== 1 ||
    hashes[0] !== expectedHash
  ) {
    blockers.push(code);
  }
}

function validRegion(region, image) {
  return Boolean(
    image &&
      nonNegativeInteger(region?.x) &&
      nonNegativeInteger(region?.y) &&
      positiveInteger(region?.width) &&
      positiveInteger(region?.height) &&
      region.x + region.width <= image.width &&
      region.y + region.height <= image.height &&
      Number.isFinite(region?.brightLumaThreshold) &&
      region.brightLumaThreshold >= 0 &&
      region.brightLumaThreshold <= 1,
  );
}

function samePath(ownerPath, rawPath, expectedPath) {
  return nonEmptyString(rawPath) && resolveOwnedPath(ownerPath, rawPath) === expectedPath;
}

function routeHasExactOracle(value) {
  try {
    const route = new URL(value);
    return (
      route.pathname === "/dev/area-light-shadow-preview" &&
      route.searchParams.get("oracleFixture") === EXACT_FIXTURE.id
    );
  } catch {
    return false;
  }
}

function exactFixtureSummary() {
  return {
    id: EXACT_FIXTURE.id,
    moduleSha256: EXACT_FIXTURE.moduleSha256,
    area: EXACT_FIXTURE.area,
    entryPoint: [...EXACT_FIXTURE.entryPoint],
    position: [...EXACT_FIXTURE.position],
    captureTimeSeconds: EXACT_FIXTURE.captureTimeSeconds,
    cameraFacing: { ...EXACT_FIXTURE.cameraFacing },
    orderedHakList: [],
    placeable: { ...EXACT_FIXTURE.placeable },
    receiver: { ...EXACT_FIXTURE.receiver },
  };
}

function describeFile(path) {
  const bytes = readFileSync(path);
  return describeBytes(path, bytes);
}

function describeBytes(path, bytes) {
  return { path: resolve(path), bytes: bytes.length, sha256: sha256(bytes) };
}

function writeNewJson(path, value) {
  writeNewFile(path, Buffer.from(`${JSON.stringify(value, null, 2)}\n`, "utf8"));
}

function writeNewFile(path, bytes) {
  if (existsSync(path)) throw new GateFailure(["output-target-already-exists"]);
  const parent = dirname(path);
  if (!existsSync(parent)) mkdirSync(parent, { recursive: true });
  writeFileSync(path, bytes, { flag: "wx" });
}

function resolveOwnedPath(ownerPath, childPath) {
  if (!nonEmptyString(childPath)) return null;
  return resolve(isAbsolute(childPath) ? childPath : resolve(dirname(ownerPath), childPath));
}

function parseArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith("--") || value === undefined || value.startsWith("--")) {
      failUsage(`Invalid argument: ${key ?? "end"}`);
    }
    result[key.slice(2)] = value;
    index += 1;
  }
  return result;
}

function requiredPath(value, name) {
  if (!nonEmptyString(value)) failUsage(`${name} is required.`);
  return resolve(value);
}

function failUsage(message) {
  process.stderr.write(`${message}\n`);
  process.exit(2);
}

function print(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function sameJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function sameSet(value, expected) {
  return (
    Array.isArray(value) &&
    value.length === expected.length &&
    expected.every((entry) => value.includes(entry)) &&
    new Set(value).size === value.length
  );
}

function validSha256(value) {
  return typeof value === "string" && SHA256_PATTERN.test(value);
}

function validIsoDate(value) {
  return nonEmptyString(value) && Number.isFinite(Date.parse(value));
}

function nonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function positiveInteger(value) {
  return Number.isInteger(value) && value > 0;
}

function nonNegativeInteger(value) {
  return Number.isInteger(value) && value >= 0;
}

function sameNumber(left, right) {
  return Number.isFinite(left) && Number.isFinite(right) && left === right;
}

function sameViewport(left, right) {
  return (
    sameNumber(left?.width, right?.width) &&
    sameNumber(left?.height, right?.height) &&
    sameNumber(left?.deviceScaleFactor, right?.deviceScaleFactor)
  );
}

function unique(values) {
  return [...new Set(values.filter(nonEmptyString))];
}

function mean(values) {
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function percentile(sorted, fraction) {
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1)];
}

function relativeError(left, right) {
  const denominator = Math.max(Math.abs(left), 1e-9);
  return Math.abs(left - right) / denominator;
}

function relativeNullableBounds(left, right) {
  if (!Number.isFinite(left) || !Number.isFinite(right)) return null;
  return relativeError(left, right);
}

function pixelAt(image, x, y) {
  const offset = (y * image.width + x) * 4;
  return [image.rgba[offset], image.rgba[offset + 1], image.rgba[offset + 2], image.rgba[offset + 3]];
}

function luminance(rgb) {
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}

function heatPixel(delta) {
  const hot = Math.max(0, Math.min(255, Math.round(delta * 5)));
  const mid = Math.max(0, Math.min(255, Math.round(delta * 2)));
  if (delta <= 5) {
    const base = Math.max(16, Math.round(delta * 8));
    return [base, base, base];
  }
  return [hot, mid, Math.max(0, 80 - mid)];
}

function paethPredictor(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  return pb <= pc ? b : c;
}

function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function blockerCodesFromError(error) {
  if (error instanceof GateFailure) return unique(error.blockerCodes);
  return [`validator-unexpected-error:${error instanceof Error ? error.message : String(error)}`];
}

function emptyDescriptor() {
  return { path: null, descriptor: null };
}

function emptyAurS07Result() {
  return {
    runtimeObservation: emptyDescriptor(),
    runtimeCapture: emptyDescriptor(),
    engineLoadLog: emptyDescriptor(),
    observedAt: null,
  };
}

class GateFailure extends Error {
  constructor(blockerCodes) {
    super(unique(blockerCodes).join("|"));
    this.name = "GateFailure";
    this.blockerCodes = unique(blockerCodes);
  }
}

if (command === "compare") {
  runCompare();
} else if (command === "admit") {
  admit();
} else {
  failUsage("Use compare or admit.");
}
