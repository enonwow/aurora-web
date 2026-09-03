#!/usr/bin/env node

import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const REPO_ROOT = path.resolve(import.meta.dirname, "../..");

function parseArguments(values) {
  const result = new Map();
  for (let index = 0; index < values.length; index += 2) {
    const key = values[index];
    const value = values[index + 1];
    if (!key?.startsWith("--") || value === undefined) {
      throw new Error(`Invalid argument pair at ${key ?? "<end>"}`);
    }
    result.set(key.slice(2), value);
  }
  return result;
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

function readJson(input) {
  return JSON.parse(fs.readFileSync(resolveInput(input), "utf8"));
}

const args = parseArguments(process.argv.slice(2));
for (const key of ["profile", "validation", "comparison", "output"]) {
  if (!args.get(key)) throw new Error(`Missing --${key}`);
}
const outputPath = resolveInput(args.get("output"));
if (fs.existsSync(outputPath)) throw new Error(`Immutable proof manifest exists: ${outputPath}`);

const profile = readJson(args.get("profile"));
const validation = readJson(args.get("validation"));
const comparison = readJson(args.get("comparison"));
if (
  profile.fixtureId !== validation.fixtureId ||
  profile.fixtureId !== comparison.fixtureId ||
  validation.status !== "pass-very-close-native-visual-and-timing-profile" ||
  comparison.verdict?.parity !== "very-close-profile-calibrated"
) {
  throw new Error("Proof subject binding or accepted status mismatch");
}
if (
  validation.runtimeProof?.triggerCount !== 1 ||
  validation.runtimeProof?.overlapCount !== 0 ||
  validation.runtimeProof?.completed !== true ||
  validation.runtimeProof?.postDurationHidden !== true ||
  validation.runtimeProof?.proofGateStatus !== "pass" ||
  validation.runtimeProof?.unexpectedFailedAssetCount !== 0
) {
  throw new Error("Runtime proof acceptance contract failed");
}

const webArtifacts = [
  ...profile.singlePlayback.expectedOutputs.map(fileRecord),
  fileRecord(args.get("validation")),
  ...Object.values(validation.stills).map((record) => fileRecord(record.path))
];
const manifest = {
  version: "aurora-vfx-proof-manifest/v6",
  generatedAt: new Date().toISOString(),
  status: "verified-very-close-native-visual-and-timing-profile",
  fixtureId: profile.fixtureId,
  sourceIdentity: profile.sourceIdentity,
  verdict: {
    classification: "close",
    calibratedParity: comparison.verdict.parity,
    exactPixelIdentityClaimed: false,
    nativeComparison: validation.nativeComparison,
    limitations: comparison.verdict.limitations
  },
  runtimeAcceptance: validation.runtimeProof,
  identityNeutrality: profile.identityNeutrality,
  runtimeBuildIdentity: profile.runtimeBuildIdentity,
  inputs: {
    proofProfile: fileRecord(args.get("profile")),
    immutableNativeOracle: profile.immutableNativeOracle.map((record) => fileRecord(record.path)),
    presentationProfile: fileRecord(
      `frontend/public/dev-fixtures/${profile.fixtureId}/presentation-profile.json`
    )
  },
  outputs: {
    webArtifacts,
    visualValidation: fileRecord(args.get("validation")),
    comparisonManifest: fileRecord(args.get("comparison")),
    comparisonVideo: fileRecord(comparison.outputs.video.path),
    frameComparison: fileRecord(comparison.outputs.contactSheet.path)
  },
  safety: {
    nativeOracleReusedWithoutRelaunch: true,
    toolsetStarted: false,
    nwnStarted: false,
    captureCount: 1,
    automaticRetry: false,
    captureLockReleased: true,
    resourcePolicy: profile.resourceSafety
  },
  generator: fileRecord("backend/scripts/create-vfx-proof-manifest.mjs")
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, { flag: "wx" });
console.log(JSON.stringify({ status: manifest.status, manifest: fileRecord(outputPath) }, null, 2));
