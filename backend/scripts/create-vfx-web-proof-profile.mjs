#!/usr/bin/env node

import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const REPO_ROOT = path.resolve(import.meta.dirname, "../..");

function parseArguments(values) {
  const args = new Map();
  for (let index = 0; index < values.length; index += 2) {
    const key = values[index];
    const value = values[index + 1];
    if (!key?.startsWith("--") || value === undefined) {
      throw new Error(`Invalid argument pair at ${key ?? "<end>"}`);
    }
    args.set(key.slice(2), value);
  }
  return args;
}

function resolveInput(input) {
  return path.isAbsolute(input) ? input : path.resolve(REPO_ROOT, input);
}

function repositoryPath(filePath) {
  const relative = path.relative(REPO_ROOT, filePath);
  return relative.startsWith("..") ? filePath.replaceAll("\\", "/") : relative.replaceAll("\\", "/");
}

function fileRecord(input) {
  const filePath = resolveInput(input);
  const bytes = fs.readFileSync(filePath);
  return {
    path: repositoryPath(filePath),
    sizeBytes: bytes.byteLength,
    sha256: createHash("sha256").update(bytes).digest("hex")
  };
}

function rebind(records) {
  return records.map((record) => fileRecord(record.path));
}

function appendUnique(records, inputs) {
  const result = [...records];
  const known = new Set(result.map((record) => record.path.toLowerCase()));
  for (const input of inputs) {
    const record = fileRecord(input);
    if (!known.has(record.path.toLowerCase())) {
      result.push(record);
      known.add(record.path.toLowerCase());
    }
  }
  return result;
}

const args = parseArguments(process.argv.slice(2));
const required = [
  "base-profile",
  "output",
  "profile-id",
  "capture-tag",
  "artifact-root",
  "comparison-root",
  "runtime-token",
  "runtime-digest",
  "built-at"
];
for (const key of required) {
  if (!args.get(key)) throw new Error(`Missing --${key}`);
}

const baseProfilePath = resolveInput(args.get("base-profile"));
const outputPath = resolveInput(args.get("output"));
if (fs.existsSync(outputPath)) {
  throw new Error(`Immutable proof profile already exists: ${outputPath}`);
}
const base = JSON.parse(fs.readFileSync(baseProfilePath, "utf8"));
const fixtureId = base.fixtureId;
const fixtureManifest = JSON.parse(
  fs.readFileSync(
    resolveInput(`frontend/public/dev-fixtures/${fixtureId}/manifest.json`),
    "utf8"
  )
);
const nativeOracleCalibration = fixtureManifest.nativeOracleCalibration;
if (
  nativeOracleCalibration?.runtimePlaybackRate !== 1 ||
  nativeOracleCalibration?.runtimePlaybackDelaySeconds !== 0 ||
  nativeOracleCalibration?.sourceDynamicPeakSeconds !== 589 / 432 ||
  nativeOracleCalibration?.runtimeTimingCalibrationMethod !==
    "retail-client-source-animation-rate"
) {
  throw new Error("Fixture manifest is not bound to the retail-client source animation rate");
}
const captureTag = args.get("capture-tag");
const artifactRoot = args.get("artifact-root").replaceAll("\\", "/");
const comparisonRoot = args.get("comparison-root").replaceAll("\\", "/");
const digest = args.get("runtime-digest").toLowerCase();
const builtAt = args.get("built-at");
if (!/^[a-f0-9]{64}$/u.test(digest)) throw new Error("Invalid --runtime-digest");
if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(builtAt)) {
  throw new Error("Invalid --built-at; expected UTC ISO-8601 with millisecond precision");
}
if (!/^[a-z0-9][a-z0-9._-]{0,63}$/u.test(captureTag)) {
  throw new Error("Invalid --capture-tag");
}
const proofSlug = fixtureId.replace(/^vfx-(?:nwn-web|broad)-/u, "");
const stem = `aurora-web-${proofSlug}-one-trigger-${captureTag}`;
const expectedOutputs = ["mp4", "webm", "summary.json", "active.png", "final-post.png"].map(
  (suffix) => {
    const ending = suffix === "mp4" || suffix === "webm" ? `.${suffix}` : `-${suffix}`;
    return `${artifactRoot}/${stem}${ending}`;
  }
);

const profile = {
  ...base,
  version: "aurora-vfx-proof-profile/v9",
  profileId: args.get("profile-id"),
  createdAt: builtAt,
  proofCompleteness: "missing-awaiting-fresh-capture",
  scope:
    "identity-neutral-profile-bound-native-oracle-calibrated-visual-and-timing-proof",
  supersedes: fileRecord(baseProfilePath),
  fixtureInputs: appendUnique(rebind(base.fixtureInputs), [
    `frontend/public/dev-fixtures/${fixtureId}/presentation-profile.json`
  ]),
  runtimeSourceInputs: appendUnique(rebind(base.runtimeSourceInputs), [
    "backend/src/modules/vfx/application/vfx.application.service.ts",
    "backend/src/health/health.controller.ts",
    "backend/src/modules/vfx/domain/aurora-vfx-render-contract.ts",
    "backend/src/modules/vfx/domain/aurora-vfx-runtime-state.ts",
    "backend/src/modules/vfx/domain/aurora-vfx-wind-manager.ts",
    "backend/src/modules/vfx/domain/aurora-vfx-aoe-visual-runtime.ts",
    "backend/src/modules/vfx/domain/aurora-vfx-cache-key.ts",
    "backend/src/modules/vfx/domain/aurora-mdl-vfx-source.parser.ts",
    "backend/src/modules/vfx/domain/aurora-vfx-texture-txi-source.parser.ts",
    "backend/src/modules/vfx/application/vfx-processing.types.ts",
    "backend/test/unit/vfx.application.service.spec.ts",
    "backend/src/modules/catalog/application/catalog-vfx-runtime-packaging.ts",
    "backend/src/modules/catalog/application/catalog.application.service.ts",
    "backend/src/modules/catalog/domain/template.types.ts",
    "frontend/src/modules/vfx/domain/vfxIdentityNeutralProfiles.ts",
    "frontend/src/modules/layout/adapters/three/auroraThreeLightFalloff.ts",
    "frontend/src/modules/layout/adapters/three/workspaceObjectMeshLayer.ts",
    "frontend/src/modules/shared/adapters/three/auroraAreaModelSpace.ts",
    "frontend/src/modules/placeables/adapters/three/placeableThreeAssetLoader.ts",
    "frontend/src/modules/placeables/adapters/httpPlaceableApiPort.ts",
    "frontend/src/modules/placeables/contracts.ts",
    "frontend/src/modules/shared/adapters/three/auroraMdlSourceMaterialLighting.ts",
    "frontend/src/modules/scene/contracts.ts",
    "frontend/src/modules/scene/domain/auroraVfxPayload.ts",
    "frontend/tests/unit/modules/layout/auroraVfxCanonicalRenderer.test.ts",
    "frontend/tests/unit/modules/vfx/dev/NwnVfxComparisonRunner.test.ts"
  ]),
  immutableNativeOracle: rebind(base.immutableNativeOracle),
  calibrationInputs: appendUnique([
    ...rebind(
      base.calibrationInputs.filter(
        (record) =>
          !record.path.includes("/calibration-v5/") &&
          !record.path.includes("/calibration-v6-source-time/") &&
          !record.path.includes("/calibration-v7-retail-profile/") &&
          !record.path.includes("/calibration-v8-native-lifecycle/") &&
          !record.path.includes("/calibration-v10-centered-source-lifecycle/") &&
          !record.path.includes("/calibration-v16-chunk-init-scale-timing/") &&
          !record.path.includes("/calibration-v18-client-animation-rate/")
      )
    ),
    fileRecord(
      "backend/docs/aurora-reverse/evidence/vfx-nwn-web-row28/calibration-v18-client-animation-rate/client-animation-playback-audit.json"
    ),
    fileRecord(
      "backend/docs/aurora-reverse/evidence/vfx-nwn-web-row28/calibration-v18-client-animation-rate/source-aligned-playback-calibration-summary.json"
    )
  ], [
    fixtureManifest.proofScene?.effectOriginAlignment?.sourceEvidence,
    "backend/docs/aurora-reverse/vfx-row28-runtime-camera-context-audit-2026-08-24.md",
    "backend/docs/aurora-reverse/vfx-row28-source-location-and-nested-chunk-scale-audit-2026-08-25.md",
    "backend/docs/aurora-reverse/vfx-chunk-model-instance-shared-scheduler-audit-2026-08-25.md"
  ].filter(Boolean)),
  captureToolchain: appendUnique(rebind(base.captureToolchain), [
    "backend/scripts/audit-retail-vfx-animation-playback.py",
    "backend/scripts/test-audit-retail-vfx-animation-playback-contract.mjs",
    "backend/scripts/check-vfx-asset-identity-neutral-branches.mjs",
    "backend/scripts/lib/asset-identity-branch-gate.mjs",
    "backend/scripts/test-vfx-asset-identity-neutral-branches.mjs",
    "backend/scripts/test-vfx-nwn-web-row28-fixture.mjs"
  ]),
  postCaptureToolchain: [
    fileRecord("backend/scripts/validate-vfx-row28-web-v6.py"),
    fileRecord("backend/scripts/validate-vfx-row28-web-v5.py"),
    fileRecord("backend/scripts/create-vfx-row28-native-comparison-v5.py"),
    fileRecord("backend/scripts/test-vfx-row28-web-v5-evidence-pipeline.mjs"),
    fileRecord("backend/scripts/test-vfx-row28-web-v6-evidence-pipeline.mjs")
  ],
  profileToolchain: [
    fileRecord("backend/scripts/create-vfx-web-proof-profile.mjs"),
    fileRecord("backend/scripts/test-vfx-nwn-web-row28-proof-profile-v9.mjs")
  ],
  validator: fileRecord("backend/scripts/test-vfx-nwn-web-row28-proof-profile-v9.mjs"),
  calibration: {
    visualStatus: "requires-fresh-native-aligned-visual-classification",
    timingStatus: "retail-client-source-rate-and-source-event-aligned-native-trigger",
    effectOriginAlignmentAuroraXyz:
      fixtureManifest.proofScene?.effectOriginAlignment?.offset ?? null,
    effectOriginAlignmentSourceEvidence:
      fixtureManifest.proofScene?.effectOriginAlignment?.sourceEvidence ?? "",
    additiveParticleRadianceScale:
      nativeOracleCalibration.additiveParticleRadianceScale,
    bloomMultiplier: nativeOracleCalibration.bloomMultiplier,
    runtimePlaybackRate: nativeOracleCalibration.runtimePlaybackRate,
    runtimePlaybackDelaySeconds: nativeOracleCalibration.runtimePlaybackDelaySeconds,
    runtimeTimingCalibrationMethod:
      nativeOracleCalibration.runtimeTimingCalibrationMethod,
    nativeTriggerRelativeOnsetSeconds:
      nativeOracleCalibration.nativeTriggerRelativeOnsetSeconds,
    nativeTriggerRelativeLastVisibleSeconds:
      nativeOracleCalibration.nativeTriggerRelativeLastVisibleSeconds,
    sourceOnsetSeconds: nativeOracleCalibration.sourceOnsetSeconds,
    sourceDynamicPeakSeconds: nativeOracleCalibration.sourceDynamicPeakSeconds,
    sourceLastVisibleSeconds: nativeOracleCalibration.sourceLastVisibleSeconds,
    predictedVisibleDurationSeconds:
      nativeOracleCalibration.nativeTriggerRelativeLastVisibleSeconds -
      nativeOracleCalibration.nativeTriggerRelativeOnsetSeconds,
    globalAuroraSourceTimePlaybackClaim: false,
    globalVisualLifecycleClaim: false
  },
  runtimeBuildIdentity: {
    ...base.runtimeBuildIdentity,
    token: args.get("runtime-token"),
    frontendImageDigest: `sha256:${digest}`,
    backendImageDigest: `sha256:${digest}`,
    builtAt
  },
  singlePlayback: {
    ...base.singlePlayback,
    route:
      `http://127.0.0.1:5173/dev/nwn-vfx-comparison?fixture=${fixtureId}` +
      "&capture=armed&diagnostics=0",
    artifactRoot,
    captureTag,
    expectedOutputs
  },
  postCapture: {
    ...base.postCapture,
    validator: "backend/scripts/validate-vfx-row28-web-v6.py",
    comparisonGenerator: "backend/scripts/create-vfx-row28-native-comparison-v5.py",
    comparisonArtifactRoot: comparisonRoot
  },
  identityNeutrality: {
    version: "aurora-asset-identity-neutrality/v1",
    behaviorSource: "versioned-semantic-profiles",
    exactIdentityBranchesAllowed: false,
    proofBindingIdentityChecksAllowed: true,
    staticGate: "backend/scripts/check-vfx-asset-identity-neutral-branches.mjs"
  }
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(profile, null, 2)}\n`, { flag: "wx" });
console.log(JSON.stringify({ status: "created", profile: fileRecord(outputPath) }, null, 2));
