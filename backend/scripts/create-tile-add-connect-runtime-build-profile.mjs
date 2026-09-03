#!/usr/bin/env node
import { createHash, randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  MATRIX_RUNTIME_BUILD_PROFILE_SCHEMA,
  validateMatrixRuntimeBuildProfile
} from "./lib/tile-add-connect-runtime-build-profile.mjs";
import {
  computeTileAddConnectRuntimeSourceIdentity
} from "./lib/tile-add-connect-runtime-source-identity.mjs";

function parseArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith("--") || value === undefined) {
      throw new Error(`Invalid argument pair at ${key ?? "<end>"}.`);
    }
    result[key.slice(2)] = value;
  }
  return result;
}

function resolveOutput(value, name) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`--${name} is required.`);
  }
  const resolved = path.resolve(process.cwd(), value);
  if (fs.existsSync(resolved)) {
    throw new Error(`Immutable output already exists: ${resolved}`);
  }
  return resolved;
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function writeJsonAtomic(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temporaryPath = path.join(
    path.dirname(filePath),
    `.${path.basename(filePath)}.${process.pid}.${randomBytes(8).toString("hex")}.tmp`
  );
  const bytes = Buffer.from(`${JSON.stringify(value, null, 2)}\n`, "utf8");
  let descriptor = null;
  try {
    descriptor = fs.openSync(temporaryPath, "wx");
    fs.writeFileSync(descriptor, bytes);
    fs.fsyncSync(descriptor);
    fs.closeSync(descriptor);
    descriptor = null;
    fs.renameSync(temporaryPath, filePath);
  } finally {
    if (descriptor !== null) fs.closeSync(descriptor);
    if (fs.existsSync(temporaryPath)) fs.rmSync(temporaryPath, { force: true });
  }
  return { bytes: bytes.byteLength, sha256: sha256(bytes) };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const outputPath = resolveOutput(args.output, "output");
  const sourceManifestPath = resolveOutput(
    args["source-manifest"],
    "source-manifest"
  );
  if (path.resolve(outputPath) === path.resolve(sourceManifestPath)) {
    throw new Error("Profile and source-manifest outputs must differ.");
  }
  const profileId = String(args["profile-id"] ?? "").trim();
  if (!/^[a-z0-9][a-z0-9._-]{0,127}$/u.test(profileId)) {
    throw new Error("--profile-id is invalid.");
  }
  const builtAt = String(args["built-at"] ?? "").trim();
  const builtAtMs = Date.parse(builtAt);
  if (!Number.isFinite(builtAtMs) || new Date(builtAtMs).toISOString() !== builtAt) {
    throw new Error("--built-at must be a canonical UTC ISO-8601 timestamp.");
  }
  const frontendBaseUrl = args["frontend-base-url"] ?? "http://127.0.0.1:5173";
  const backendBaseUrl = args["backend-base-url"] ?? "http://127.0.0.1:3000";
  const sourceIdentity = computeTileAddConnectRuntimeSourceIdentity();
  const records = sourceIdentity.records;
  const digest = sourceIdentity.runtimeDigest;
  const commit = `worktree-sha256-${digest}`;
  const sourceManifest = {
    schema: sourceIdentity.schema,
    generatedAt: builtAt,
    algorithm: sourceIdentity.algorithm,
    sourceRoots: sourceIdentity.sourceRoots,
    sourceFiles: sourceIdentity.sourceFiles,
    fileCount: sourceIdentity.fileCount,
    totalBytes: sourceIdentity.totalBytes,
    runtimeDigest: digest,
    vfxRuntimeRevision: sourceIdentity.vfxRuntimeRevision,
    records
  };
  const profile = {
    schema: MATRIX_RUNTIME_BUILD_PROFILE_SCHEMA,
    profileId,
    createdAt: builtAt,
    frontend: {
      commit,
      imageDigest: `sha256:${digest}`,
      builtAt,
      baseUrl: frontendBaseUrl
    },
    backend: {
      commit,
      imageDigest: `sha256:${digest}`,
      builtAt,
      baseUrl: backendBaseUrl,
      contractVersion: "1.0.0",
      vfxRuntimeRevision: sourceIdentity.vfxRuntimeRevision
    }
  };
  const profileErrors = validateMatrixRuntimeBuildProfile(profile);
  if (profileErrors.length > 0) {
    throw new Error(`Generated runtime-build profile is invalid: ${profileErrors.join(", ")}.`);
  }
  const sourceManifestArtifact = writeJsonAtomic(
    sourceManifestPath,
    sourceManifest
  );
  const profileArtifact = writeJsonAtomic(outputPath, profile);
  process.stdout.write(`${JSON.stringify({
    schema: "aurora-tile-add-connect-runtime-build-profile-result/v1",
    profileId,
    runtimeDigest: digest,
    runtimeCommit: commit,
    sourceManifest: {
      path: sourceManifestPath,
      ...sourceManifestArtifact,
      fileCount: sourceManifest.fileCount,
      totalBytes: sourceManifest.totalBytes
    },
    profile: { path: outputPath, ...profileArtifact },
    environment: {
      VITE_RUNTIME_BUILD_COMMIT: commit,
      VITE_RUNTIME_BUILD_IMAGE_DIGEST: `sha256:${digest}`,
      VITE_RUNTIME_BUILD_BUILT_AT: builtAt,
      RUNTIME_BUILD_COMMIT: commit,
      RUNTIME_BUILD_IMAGE_DIGEST: `sha256:${digest}`,
      RUNTIME_BUILD_BUILT_AT: builtAt
    }
  }, null, 2)}\n`);
}

try {
  main();
} catch (error) {
  process.stderr.write(`${JSON.stringify({
    error: {
      code: "TILE_RUNTIME_BUILD_PROFILE_FAILED",
      message: String(error?.message ?? error)
    }
  })}\n`);
  process.exitCode = 1;
}
