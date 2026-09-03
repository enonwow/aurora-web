#!/usr/bin/env node
/**
 * Development-only planner/control plane for the tile add/connect matrix.
 * It reads the existing authenticated tileset endpoint and writes only
 * caller-owned proof artifacts. Browser capture is deliberately a separate
 * future write command; plan/status/next never mutate Areas or module data.
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { writeJsonAtomic } from "./runtime-tile-sweep-io.mjs";
import {
  buildMatrixManifest,
  MATRIX_CONTRACT,
  MATRIX_CONTRACT_REVISION,
  MATRIX_MANIFEST_SCHEMA,
  tilesetDefinitionFingerprint,
  tilesetRuntimeDefinitionFingerprint,
  validateMatrixChunk,
  validateMatrixManifest
} from "./lib/tile-add-connect-matrix.mjs";
import {
  PATH_CONNECT_DIFFERENTIAL_ARTIFACT_KINDS,
  buildPathConnectDifferentialProof,
  validatePathConnectDifferentialPacket,
  validatePathConnectDifferentialProfile,
  validatePathConnectDifferentialProofForRow
} from "./lib/tile-path-connect-differential-proof.mjs";
import {
  MATRIX_RUNTIME_BUILD_PROFILE_MAX_BYTES,
  buildMatrixRuntimeBuildBinding,
  validateMatrixRuntimeBuildBinding,
  validateMatrixRuntimeBuildObservations
} from "./lib/tile-add-connect-runtime-build-profile.mjs";
import {
  computeTileAddConnectRuntimeSourceIdentity,
  summarizeTileAddConnectRuntimeSourceIdentity,
  validateTileAddConnectRuntimeSourceIdentity
} from "./lib/tile-add-connect-runtime-source-identity.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDirectory, "..", "..");
const DEFAULT_BASE_URL = "http://127.0.0.1:5173/_aurora/v1";
const DEFAULT_CASE_LIMIT = 16;
const DEFAULT_REQUEST_CONCURRENCY = 6;
const DEFAULT_GROUP_CHUNK_AREA_CELL_LIMIT = 16;
const MATRIX_CAPTURE_CHILD_GRACE_MS = 90_000;
const MATRIX_CHECKPOINT_SCHEMA = "aurora-tile-add-connect-matrix-checkpoint/v2";
const MATRIX_SUMMARY_SCHEMA = "aurora-tile-add-connect-matrix-summary/v2";
const MATRIX_STATUS_SCHEMA = "aurora-tile-add-connect-matrix-status/v2";
const MATRIX_LAST_CHUNK_RECOVERY_SCHEMA =
  "aurora-tile-add-connect-matrix-last-chunk-recovery/v1";
const MATRIX_LAST_CHUNK_RECOVERY_RECORD_SCHEMA =
  "aurora-tile-add-connect-matrix-last-chunk-recovery-record/v1";
const MATRIX_VISUAL_BLOCKER_SCHEMA =
  "aurora-tile-add-connect-matrix-visual-blocker/v1";
const MATRIX_PENDING_CAPTURE_SCHEMA =
  "aurora-tile-add-connect-matrix-pending-capture/v1";
const MATRIX_VISUAL_REVIEW_SCHEMA =
  "aurora-tile-add-connect-matrix-visual-review/v1";
const AURORA_TOOLSET_PROVE_CONTRACT_VERSION = "1.0.15";
const SHA256_PATTERN = /^[a-f0-9]{64}$/u;

function parseArgs(args) {
  const parsed = { _: [] };
  for (let index = 0; index < args.length; index += 1) {
    const value = args[index];
    if (!value.startsWith("--")) {
      parsed._.push(value);
      continue;
    }
    const key = value.slice(2);
    const next = args[index + 1];
    if (!next || next.startsWith("--")) {
      parsed[key] = true;
      continue;
    }
    parsed[key] = next;
    index += 1;
  }
  return parsed;
}

function positiveInteger(value, name, fallback, maximum = Number.MAX_SAFE_INTEGER) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed)) return fallback;
  if (parsed < 1 || parsed > maximum) {
    throw new Error(`${name} must be an integer in 1..${maximum}.`);
  }
  return parsed;
}

function resolvePath(value, fallback) {
  return typeof value === "string" && value.trim()
    ? path.resolve(process.cwd(), value)
    : fallback;
}

function readJsonIfPresent(filePath) {
  return fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, "utf8")) : null;
}

function fileSha256(filePath) {
  return createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function loadRequiredMatrixRuntimeBuildBinding(args) {
  const profilePath = resolvePath(args["runtime-build-profile"], null);
  const profileSha256 = typeof args["runtime-build-profile-sha256"] === "string"
    ? args["runtime-build-profile-sha256"].trim().toLowerCase()
    : "";
  if (!profilePath) {
    throw new Error("MATRIX_RUNTIME_BUILD_PROFILE_PATH_REQUIRED");
  }
  if (!SHA256_PATTERN.test(profileSha256)) {
    throw new Error("MATRIX_RUNTIME_BUILD_PROFILE_SHA256_REQUIRED");
  }
  if (!fs.existsSync(profilePath) || !fs.statSync(profilePath).isFile()) {
    throw new Error("MATRIX_RUNTIME_BUILD_PROFILE_MISSING");
  }
  const bytes = fs.statSync(profilePath).size;
  if (bytes < 2 || bytes > MATRIX_RUNTIME_BUILD_PROFILE_MAX_BYTES) {
    throw new Error("MATRIX_RUNTIME_BUILD_PROFILE_BUDGET_EXCEEDED");
  }
  assertFileSha256(
    profilePath,
    profileSha256,
    "Matrix runtime-build profile"
  );
  const profileArtifact = readPlanArtifact(
    profilePath,
    "MATRIX_RUNTIME_BUILD_PROFILE_INVALID_JSON"
  );
  if (profileArtifact.error || !profileArtifact.value) {
    throw new Error(
      profileArtifact.error ?? "MATRIX_RUNTIME_BUILD_PROFILE_INVALID_JSON"
    );
  }
  return buildMatrixRuntimeBuildBinding({
    profile: profileArtifact.value,
    profilePath,
    profileSha256
  });
}

function validatePersistedMatrixRuntimeBuildBinding(binding) {
  const errors = new Set(validateMatrixRuntimeBuildBinding(binding));
  const profilePath = typeof binding?.profile?.path === "string"
    ? path.resolve(binding.profile.path)
    : "";
  if (!profilePath || !path.isAbsolute(profilePath) || profilePath.includes("\0")) {
    errors.add("MATRIX_RUNTIME_BUILD_PROFILE_PATH_INVALID");
    return [...errors].sort((left, right) => left.localeCompare(right));
  }
  if (!fs.existsSync(profilePath) || !fs.statSync(profilePath).isFile()) {
    errors.add("MATRIX_RUNTIME_BUILD_PROFILE_MISSING");
    return [...errors].sort((left, right) => left.localeCompare(right));
  }
  const bytes = fs.statSync(profilePath).size;
  if (bytes < 2 || bytes > MATRIX_RUNTIME_BUILD_PROFILE_MAX_BYTES) {
    errors.add("MATRIX_RUNTIME_BUILD_PROFILE_BUDGET_EXCEEDED");
    return [...errors].sort((left, right) => left.localeCompare(right));
  }
  if (fileSha256(profilePath) !== binding?.profile?.sha256) {
    errors.add("MATRIX_RUNTIME_BUILD_PROFILE_SHA256_MISMATCH");
    return [...errors].sort((left, right) => left.localeCompare(right));
  }
  const artifact = readPlanArtifact(
    profilePath,
    "MATRIX_RUNTIME_BUILD_PROFILE_INVALID_JSON"
  );
  if (artifact.error || !artifact.value) {
    errors.add("MATRIX_RUNTIME_BUILD_PROFILE_INVALID_JSON");
    return [...errors].sort((left, right) => left.localeCompare(right));
  }
  try {
    const rebuilt = buildMatrixRuntimeBuildBinding({
      profile: artifact.value,
      profilePath,
      profileSha256: binding.profile.sha256
    });
    if (!sameJson(rebuilt, binding)) {
      errors.add("MATRIX_RUNTIME_BUILD_PROFILE_BINDING_MISMATCH");
    }
  } catch {
    errors.add("MATRIX_RUNTIME_BUILD_PROFILE_INVALID");
  }
  return [...errors].sort((left, right) => left.localeCompare(right));
}

function canonicalJson(value) {
  if (Array.isArray(value)) return value.map(canonicalJson);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalJson(value[key])]));
}

function sameJson(left, right) {
  return JSON.stringify(canonicalJson(left)) === JSON.stringify(canonicalJson(right));
}

function requireStringArg(args, name) {
  const value = args[name];
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`recover-last-rejected requires --${name} <value>.`);
  }
  return value.trim();
}

function requireSha256Arg(args, name) {
  const value = requireStringArg(args, name).toLowerCase();
  if (!SHA256_PATTERN.test(value)) {
    throw new Error(`--${name} must be an exact lowercase SHA-256.`);
  }
  return value;
}

function assertFileSha256(filePath, expectedSha256, label) {
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    throw new Error(`${label} is missing or is not a regular file: ${filePath}`);
  }
  const actualSha256 = fileSha256(filePath);
  if (actualSha256 !== expectedSha256) {
    throw new Error(
      `${label} SHA-256 mismatch: expected ${expectedSha256}, observed ${actualSha256}.`
    );
  }
}

function isFreshArtifact(filePath, startedAtMs) {
  try {
    return fs.statSync(filePath).mtimeMs >= startedAtMs;
  } catch {
    return false;
  }
}

function print(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function outputPaths(outDirectory) {
  return {
    manifest: path.join(outDirectory, "manifest.json"),
    checkpoint: path.join(outDirectory, "checkpoint.json"),
    heartbeat: path.join(outDirectory, "heartbeat.json"),
    summary: path.join(outDirectory, "summary.json"),
    chunksDirectory: path.join(outDirectory, "chunks"),
    capturesDirectory: path.join(outDirectory, "captures")
  };
}

function chunkPath(outDirectory, chunkId) {
  return path.join(outputPaths(outDirectory).chunksDirectory, `${chunkId}.json`);
}

function runtimeConfig(args) {
  const username = String(args.username ?? process.env.AURORA_MATRIX_USERNAME ?? "builder.user");
  const password = String(args.password ?? process.env.AURORA_MATRIX_PASSWORD ?? "builder123");
  const baseUrl = String(args["base-url"] ?? DEFAULT_BASE_URL).replace(/\/+$/u, "");
  if (!username || !password) throw new Error("Matrix authentication is missing; set AURORA_MATRIX_USERNAME and AURORA_MATRIX_PASSWORD.");
  return { baseUrl, username, password };
}

async function requestJson(url, init = {}) {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(120_000) });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`${init.method ?? "GET"} ${url} failed with ${response.status}.`);
  }
  return payload;
}

async function authenticate(config) {
  const payload = await requestJson(`${config.baseUrl}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username: config.username, password: config.password })
  });
  const accessToken = payload.data?.session?.accessToken;
  if (!accessToken) throw new Error("Authenticated tileset read did not return an access token.");
  return { authorization: `Bearer ${accessToken}` };
}

async function fetchTilesetInventory(config, requestConcurrency) {
  const headers = await authenticate(config);
  const listPayload = await requestJson(`${config.baseUrl}/areas/editing/tilesets`, { headers });
  const catalog = Array.isArray(listPayload.data) ? listPayload.data : [];
  const sourceTilesets = catalog
    .filter((item) => typeof item?.tilesetResRef === "string")
    .sort((left, right) => left.tilesetResRef.localeCompare(right.tilesetResRef));
  const definitions = new Array(sourceTilesets.length);
  let nextIndex = 0;

  await Promise.all(Array.from({ length: requestConcurrency }, async () => {
    while (nextIndex < sourceTilesets.length) {
      const index = nextIndex;
      nextIndex += 1;
      const source = sourceTilesets[index];
      const response = await requestJson(
        `${config.baseUrl}/areas/editing/tilesets/${encodeURIComponent(source.tilesetResRef)}`,
        { headers }
      );
      definitions[index] = {
        tilesetResRef: source.tilesetResRef,
        sourceKey: source.sourceKey ?? null,
        etag: source.etag ?? null,
        definition: response.data ?? response
      };
    }
  }));
  return definitions;
}

async function fetchTilesetDefinition(config, tilesetResRef) {
  const headers = await authenticate(config);
  const response = await requestJson(
    `${config.baseUrl}/areas/editing/tilesets/${encodeURIComponent(tilesetResRef)}`,
    { headers }
  );
  return response.data ?? response;
}

function manifestHash(manifest) {
  return createHash("sha256").update(JSON.stringify(manifest)).digest("hex");
}

function quoteCliArgument(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function boundCommand(command, outDirectory, planId, extraArguments = []) {
  return [
    command,
    "--out-directory",
    quoteCliArgument(outDirectory),
    ...(planId ? ["--plan-id", quoteCliArgument(planId)] : []),
    ...extraArguments
  ].join(" ");
}

function replacementPlanDirectory(outDirectory) {
  const suffix = MATRIX_CONTRACT_REVISION.replace(/[^a-z0-9_-]+/giu, "-").toLowerCase();
  return outDirectory.toLowerCase().endsWith(`-${suffix}`)
    ? `${outDirectory}-replan`
    : `${outDirectory}-${suffix}`;
}

function sameResolvedPath(left, right) {
  if (typeof left !== "string" || typeof right !== "string") return false;
  const normalizedLeft = path.resolve(left);
  const normalizedRight = path.resolve(right);
  return process.platform === "win32"
    ? normalizedLeft.toLowerCase() === normalizedRight.toLowerCase()
    : normalizedLeft === normalizedRight;
}

function isPathInside(parentDirectory, candidatePath) {
  const parent = path.resolve(parentDirectory);
  const candidate = path.resolve(candidatePath);
  const relative = path.relative(parent, candidate);
  return (
    relative.length > 0 &&
    relative !== ".." &&
    !relative.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relative)
  );
}

function readPlanArtifact(filePath, invalidCode) {
  if (!fs.existsSync(filePath)) return { value: null, error: null };
  try {
    return { value: JSON.parse(fs.readFileSync(filePath, "utf8")), error: null };
  } catch {
    return { value: null, error: invalidCode };
  }
}

function matrixCaseRowIds(chunk) {
  if (!Array.isArray(chunk?.cases)) return [];
  return chunk.kind === "group"
    ? chunk.cases.flatMap((matrixCase) =>
        Array.isArray(matrixCase?.memberCells)
          ? matrixCase.memberCells.map((cell) => cell?.rowId).filter(Boolean)
          : []
      )
    : chunk.cases.map((matrixCase) => matrixCase?.rowId).filter(Boolean);
}

function buildCoverage(manifest, checkpoint) {
  const rows = Array.isArray(manifest?.rows) ? manifest.rows : [];
  const chunks = Array.isArray(manifest?.chunks) ? manifest.chunks : [];
  const capturedChunkIds = new Set(
    Array.isArray(checkpoint?.capturedChunkIds) ? checkpoint.capturedChunkIds : []
  );
  const capturedRowIds = new Set(
    chunks
      .filter((chunk) => capturedChunkIds.has(chunk.id))
      .flatMap(matrixCaseRowIds)
  );
  const addPlannedRows = rows.filter((row) => row?.add?.status === "planned");
  const addBlockedRows = rows.filter((row) => row?.add?.status === "blocked");
  const groupPlannedRows = addPlannedRows.filter((row) => row.add?.fixtureKind === "group");
  const capturedAddRows = addPlannedRows.filter((row) => capturedRowIds.has(row.id)).length;
  const capturedGroupRows = groupPlannedRows.filter((row) => capturedRowIds.has(row.id)).length;
  const connectPlannedRows = rows.filter((row) => row?.connect?.status === "planned").length;
  const pathReferenceMatchRows = Number(manifest?.summary?.pathReferenceMatchRows ?? 0);
  const pathReferenceMismatchRows = Number(manifest?.summary?.pathReferenceMismatchRows ?? 0);
  const pathReferenceUnknownRows = Number(manifest?.summary?.pathReferenceUnknownRows ?? 0);
  const pathReferenceEvaluatedRows =
    pathReferenceMatchRows + pathReferenceMismatchRows + pathReferenceUnknownRows;
  const pathConnectAcceptedRows = rows.filter((row) => row?.pathConnect?.status === "accepted").length;

  return {
    addRenderCoverage: {
      totalRows: rows.length,
      requiredCaptureRows: addPlannedRows.length,
      capturedRows: capturedAddRows,
      namedBlockedRows: addBlockedRows.length,
      complete:
        rows.length > 0 &&
        capturedAddRows === addPlannedRows.length &&
        capturedAddRows + addBlockedRows.length === rows.length
    },
    groupCoverage: {
      requiredRows: groupPlannedRows.length,
      capturedRows: capturedGroupRows,
      complete: capturedGroupRows === groupPlannedRows.length
    },
    pathReferenceCoverage: {
      applicableRows: connectPlannedRows,
      evaluatedRows: pathReferenceEvaluatedRows,
      matchRows: pathReferenceMatchRows,
      mismatchRows: pathReferenceMismatchRows,
      unknownRows: pathReferenceUnknownRows,
      complete: connectPlannedRows > 0 && pathReferenceEvaluatedRows === connectPlannedRows
    },
    pathConnectDifferentialCoverage: {
      requiredRows: connectPlannedRows,
      acceptedRows: pathConnectAcceptedRows,
      blockedRows: Math.max(0, connectPlannedRows - pathConnectAcceptedRows),
      complete: connectPlannedRows > 0 && pathConnectAcceptedRows === connectPlannedRows
    }
  };
}

function inspectCurrentRuntimeSourceIdentity(runtimeBuildBinding) {
  const expected = {
    profileId: runtimeBuildBinding?.profile?.profileId ?? null,
    profileSha256: runtimeBuildBinding?.profile?.sha256 ?? null,
    bindingSha256: runtimeBuildBinding?.bindingSha256 ?? null,
    runtimeDigest:
      typeof runtimeBuildBinding?.frontend?.imageDigest === "string" &&
      runtimeBuildBinding.frontend.imageDigest.startsWith("sha256:")
        ? runtimeBuildBinding.frontend.imageDigest.slice("sha256:".length)
        : null,
    vfxRuntimeRevision:
      runtimeBuildBinding?.backend?.vfxRuntimeRevision ?? null
  };
  try {
    const observed = summarizeTileAddConnectRuntimeSourceIdentity(
      computeTileAddConnectRuntimeSourceIdentity({ repoRoot })
    );
    const errors = validateTileAddConnectRuntimeSourceIdentity(
      runtimeBuildBinding,
      observed
    );
    return {
      status: errors.length === 0 ? "verified" : "mismatch",
      expected,
      observed,
      errors
    };
  } catch (error) {
    return {
      status: "missing",
      expected,
      observed: null,
      errors: ["MATRIX_RUNTIME_SOURCE_IDENTITY_CHECK_FAILED"],
      message: error instanceof Error ? error.message : String(error)
    };
  }
}

function validatePersistedPathConnectSources(row) {
  const proof = row?.pathConnect?.proof;
  const errors = new Set();
  const add = (code) => errors.add(`${code}:${row?.id ?? "unknown"}`);
  const profilePath = typeof proof?.immutableToolsetNwnProfile?.profilePath === "string"
    ? path.resolve(proof.immutableToolsetNwnProfile.profilePath)
    : "";
  const packetPath = typeof proof?.crossEdgeDifferential?.artifactPath === "string"
    ? path.resolve(proof.crossEdgeDifferential.artifactPath)
    : "";
  if (!profilePath || !fs.existsSync(profilePath) || !fs.statSync(profilePath).isFile()) {
    add("PATH_CONNECT_PROFILE_ARTIFACT_MISSING");
    return [...errors];
  }
  if (fileSha256(profilePath) !== proof.immutableToolsetNwnProfile.profileSha256) {
    add("PATH_CONNECT_PROFILE_ARTIFACT_HASH_MISMATCH");
    return [...errors];
  }
  if (!packetPath || !fs.existsSync(packetPath) || !fs.statSync(packetPath).isFile()) {
    add("PATH_CONNECT_PACKET_ARTIFACT_MISSING");
    return [...errors];
  }
  if (fileSha256(packetPath) !== proof.crossEdgeDifferential.artifactSha256) {
    add("PATH_CONNECT_PACKET_ARTIFACT_HASH_MISMATCH");
    return [...errors];
  }
  const profileArtifact = readPlanArtifact(profilePath, "PATH_CONNECT_PROFILE_ARTIFACT_INVALID_JSON");
  const packetArtifact = readPlanArtifact(packetPath, "PATH_CONNECT_PACKET_ARTIFACT_INVALID_JSON");
  if (profileArtifact.error || !profileArtifact.value) {
    add("PATH_CONNECT_PROFILE_ARTIFACT_INVALID_JSON");
    return [...errors];
  }
  if (packetArtifact.error || !packetArtifact.value) {
    add("PATH_CONNECT_PACKET_ARTIFACT_INVALID_JSON");
    return [...errors];
  }
  validatePathConnectDifferentialProfile(profileArtifact.value, row)
    .forEach((error) => add(error));
  validatePathConnectDifferentialPacket(
    packetArtifact.value,
    profileArtifact.value,
    proof.immutableToolsetNwnProfile.profileSha256
  ).forEach((error) => add(error));
  const normalizedPacket = structuredClone(packetArtifact.value);
  for (const kind of PATH_CONNECT_DIFFERENTIAL_ARTIFACT_KINDS) {
    const declared = packetArtifact.value.artifacts?.[kind];
    if (typeof declared?.path !== "string" || typeof declared?.sha256 !== "string") continue;
    const artifactPath = path.isAbsolute(declared.path)
      ? path.resolve(declared.path)
      : path.resolve(path.dirname(packetPath), declared.path);
    normalizedPacket.artifacts[kind].path = artifactPath;
    if (!fs.existsSync(artifactPath) || !fs.statSync(artifactPath).isFile()) {
      add(`PATH_CONNECT_RUNTIME_ARTIFACT_MISSING:${kind}`);
      continue;
    }
    if (fileSha256(artifactPath) !== declared.sha256) {
      add(`PATH_CONNECT_RUNTIME_ARTIFACT_HASH_MISMATCH:${kind}`);
    }
    if (!sameJson(proof.artifacts?.[kind], normalizedPacket.artifacts[kind])) {
      add(`PATH_CONNECT_RUNTIME_ARTIFACT_BINDING_MISMATCH:${kind}`);
    }
  }
  if (errors.size === 0) {
    try {
      const rebuilt = buildPathConnectDifferentialProof({
        profile: profileArtifact.value,
        profilePath,
        profileSha256: proof.immutableToolsetNwnProfile.profileSha256,
        packet: normalizedPacket,
        packetPath,
        packetSha256: proof.crossEdgeDifferential.artifactSha256
      });
      if (!sameJson(rebuilt, proof)) add("PATH_CONNECT_PROOF_REBUILD_MISMATCH");
    } catch {
      add("PATH_CONNECT_PROOF_REBUILD_FAILED");
    }
  }
  return [...errors];
}

function inspectPersistedPlan(outDirectory, args = {}) {
  const paths = outputPaths(outDirectory);
  const manifestArtifact = readPlanArtifact(paths.manifest, "MATRIX_MANIFEST_INVALID_JSON");
  const checkpointArtifact = readPlanArtifact(paths.checkpoint, "MATRIX_CHECKPOINT_INVALID_JSON");
  const summaryArtifact = readPlanArtifact(paths.summary, "MATRIX_SUMMARY_INVALID_JSON");
  const heartbeatArtifact = readPlanArtifact(paths.heartbeat, "MATRIX_HEARTBEAT_INVALID_JSON");
  const manifest = manifestArtifact.value;
  const checkpoint = checkpointArtifact.value;
  const summary = summaryArtifact.value;
  const heartbeat = heartbeatArtifact.value;
  const artifactErrors = [
    manifestArtifact.error,
    checkpointArtifact.error,
    summaryArtifact.error,
    heartbeatArtifact.error
  ].filter(Boolean);

  if (!manifest && !checkpoint && !summary) {
    return {
      paths,
      manifest: null,
      checkpoint: null,
      summary: null,
      heartbeat,
      planId: null,
      validation: { status: "unplanned", errors: artifactErrors }
    };
  }

  const errors = new Set(artifactErrors);
  if (!manifest) {
    errors.add("MATRIX_MANIFEST_MISSING");
  } else {
    validateMatrixManifest(manifest).forEach((error) => errors.add(error));
    validatePersistedMatrixRuntimeBuildBinding(manifest.runtimeBuildBinding)
      .forEach((error) => errors.add(error));
    manifest.rows
      .filter((row) => row?.pathConnect?.status === "accepted")
      .flatMap(validatePersistedPathConnectSources)
      .forEach((error) => errors.add(error));
  }
  const planId = manifest ? manifestHash(manifest) : null;
  if (!checkpoint) {
    errors.add("MATRIX_CHECKPOINT_MISSING");
  } else {
    if (checkpoint.schema !== MATRIX_CHECKPOINT_SCHEMA) {
      errors.add("MATRIX_CHECKPOINT_SCHEMA_UNSUPPORTED");
    }
    if (checkpoint.planId !== planId || checkpoint.manifestSha256 !== planId) {
      errors.add("MATRIX_CHECKPOINT_PLAN_ID_MISMATCH");
    }
    if (!sameResolvedPath(checkpoint.planDirectory, outDirectory)) {
      errors.add("MATRIX_CHECKPOINT_PLAN_DIRECTORY_MISMATCH");
    }
    if (checkpoint.manifestSchema !== manifest?.schema) {
      errors.add("MATRIX_CHECKPOINT_MANIFEST_SCHEMA_MISMATCH");
    }
    if (checkpoint.contractRevision !== manifest?.contract?.revision) {
      errors.add("MATRIX_CHECKPOINT_CONTRACT_REVISION_MISMATCH");
    }
    if (checkpoint.contractFingerprint !== manifest?.contract?.fingerprint) {
      errors.add("MATRIX_CHECKPOINT_CONTRACT_FINGERPRINT_MISMATCH");
    }
    if (!sameJson(checkpoint.runtimeBuildBinding, manifest?.runtimeBuildBinding)) {
      errors.add("MATRIX_CHECKPOINT_RUNTIME_BUILD_BINDING_MISMATCH");
    }
    const chunks = Array.isArray(manifest?.chunks) ? manifest.chunks : [];
    const nextChunkIndex = Number(checkpoint.nextChunkIndex);
    if (!Number.isInteger(nextChunkIndex) || nextChunkIndex < 0 || nextChunkIndex > chunks.length) {
      errors.add("MATRIX_CHECKPOINT_CURSOR_INVALID");
    }
    const knownChunkIds = new Set(chunks.map((chunk) => chunk.id));
    if (
      !Array.isArray(checkpoint.capturedChunkIds) ||
      checkpoint.capturedChunkIds.some((chunkId) => !knownChunkIds.has(chunkId))
    ) {
      errors.add("MATRIX_CHECKPOINT_CAPTURED_CHUNKS_INVALID");
    }
    if (!Array.isArray(checkpoint.acceptedVisualReviews)) {
      errors.add("MATRIX_CHECKPOINT_ACCEPTED_VISUAL_REVIEWS_INVALID");
    }
    if (!Array.isArray(checkpoint.rejectedVisualReviews)) {
      errors.add("MATRIX_CHECKPOINT_REJECTED_VISUAL_REVIEWS_INVALID");
    }
    if (
      Number.isInteger(nextChunkIndex) &&
      Array.isArray(checkpoint.capturedChunkIds) &&
      checkpoint.capturedChunkIds.length !== nextChunkIndex
    ) {
      errors.add("MATRIX_CHECKPOINT_PROGRESS_MISMATCH");
    }
    if (
      Number.isInteger(nextChunkIndex) &&
      checkpoint.complete !== (nextChunkIndex === chunks.length)
    ) {
      errors.add("MATRIX_CHECKPOINT_COMPLETION_MISMATCH");
    }
    if (
      checkpoint.pendingCapture != null &&
      (
        !sameJson(
          checkpoint.pendingCapture.runtimeBuildBinding,
          manifest?.runtimeBuildBinding
        ) ||
        !sameJson(
          checkpoint.pendingCapture.planBinding?.runtimeBuildBinding,
          manifest?.runtimeBuildBinding
        )
      )
    ) {
      errors.add("MATRIX_PENDING_CAPTURE_RUNTIME_BUILD_BINDING_MISMATCH");
    }
    for (const accepted of Array.isArray(checkpoint.acceptedVisualReviews)
      ? checkpoint.acceptedVisualReviews
      : []) {
      if (!sameJson(accepted?.runtimeBuildBinding, manifest?.runtimeBuildBinding)) {
        errors.add("MATRIX_ACCEPTED_REVIEW_RUNTIME_BUILD_BINDING_MISMATCH");
      }
    }
    for (const rejected of Array.isArray(checkpoint.rejectedVisualReviews)
      ? checkpoint.rejectedVisualReviews
      : []) {
      if (!sameJson(rejected?.runtimeBuildBinding, manifest?.runtimeBuildBinding)) {
        errors.add("MATRIX_REJECTED_REVIEW_RUNTIME_BUILD_BINDING_MISMATCH");
      }
    }
  }
  if (!summary) {
    errors.add("MATRIX_SUMMARY_MISSING");
  } else {
    if (summary.schema !== MATRIX_SUMMARY_SCHEMA) {
      errors.add("MATRIX_SUMMARY_SCHEMA_UNSUPPORTED");
    }
    if (summary.planBinding?.planId !== planId) {
      errors.add("MATRIX_SUMMARY_PLAN_ID_MISMATCH");
    }
    if (!sameResolvedPath(summary.planBinding?.outDirectory, outDirectory)) {
      errors.add("MATRIX_SUMMARY_PLAN_DIRECTORY_MISMATCH");
    }
    if (summary.planBinding?.manifestSchema !== manifest?.schema) {
      errors.add("MATRIX_SUMMARY_MANIFEST_SCHEMA_MISMATCH");
    }
    if (summary.planBinding?.contractRevision !== manifest?.contract?.revision) {
      errors.add("MATRIX_SUMMARY_CONTRACT_REVISION_MISMATCH");
    }
    if (summary.planBinding?.contractFingerprint !== manifest?.contract?.fingerprint) {
      errors.add("MATRIX_SUMMARY_CONTRACT_FINGERPRINT_MISMATCH");
    }
    if (!sameJson(summary.planBinding?.runtimeBuildBinding, manifest?.runtimeBuildBinding)) {
      errors.add("MATRIX_SUMMARY_RUNTIME_BUILD_BINDING_MISMATCH");
    }
  }
  if (
    heartbeat &&
    !sameJson(
      heartbeat.planBinding?.runtimeBuildBinding,
      manifest?.runtimeBuildBinding
    )
  ) {
    errors.add("MATRIX_HEARTBEAT_RUNTIME_BUILD_BINDING_MISMATCH");
  }

  const requestedPlanId = typeof args["plan-id"] === "string" ? args["plan-id"].trim() : "";
  const validationStatus = requestedPlanId && requestedPlanId !== planId
    ? "plan_id_mismatch"
    : errors.size > 0
      ? "replan_required"
      : "ready";
  return {
    paths,
    manifest,
    checkpoint,
    summary,
    heartbeat,
    planId,
    validation: {
      status: validationStatus,
      errors: [...errors].sort((left, right) => left.localeCompare(right)),
      ...(requestedPlanId && requestedPlanId !== planId
        ? { requestedPlanId, actualPlanId: planId }
        : {})
    }
  };
}

function makeStatus(outDirectory, args = {}) {
  const plan = inspectPersistedPlan(outDirectory, args);
  const { manifest, checkpoint, summary, heartbeat, planId, validation } = plan;
  const chunks = Array.isArray(manifest?.chunks) ? manifest.chunks : [];
  const cursor = Number(checkpoint?.nextChunkIndex ?? 0);
  const safeCursor = Number.isInteger(cursor) && cursor >= 0 ? cursor : 0;
  const nextChunk = chunks[safeCursor] ?? null;
  const coverage = manifest ? buildCoverage(manifest, checkpoint) : null;
  const planBinding = manifest
    ? {
        planId,
        outDirectory,
        manifestSchema: manifest.schema ?? null,
        contractRevision: manifest.contract?.revision ?? null,
        contractFingerprint: manifest.contract?.fingerprint ?? null,
        runtimeBuildBinding: manifest.runtimeBuildBinding ?? null
      }
    : null;
  const verifyRuntimeSource = args["verify-runtime-source"] === true;
  const runtimeSourceIdentity =
    verifyRuntimeSource && manifest && validation.status === "ready"
      ? inspectCurrentRuntimeSourceIdentity(manifest.runtimeBuildBinding)
      : null;
  const runtimeSourceArguments = verifyRuntimeSource
    ? ["--verify-runtime-source"]
    : [];
  let nextAction;
  if (validation.status === "unplanned") {
    nextAction = {
      kind: "plan_matrix",
      safeCommand: boundCommand("plan", outDirectory, null)
    };
  } else if (validation.status === "replan_required") {
    const replacementDirectory = replacementPlanDirectory(outDirectory);
    nextAction = {
      kind: "replan_required",
      safeCommand: boundCommand(
        "plan",
        replacementDirectory,
        null,
        planId ? ["--replaces-plan-id", quoteCliArgument(planId)] : []
      )
    };
  } else if (validation.status === "plan_id_mismatch") {
    nextAction = {
      kind: "plan_id_mismatch",
      safeCommand: boundCommand("status", outDirectory, planId)
    };
  } else if (checkpoint?.pendingCapture != null) {
    nextAction = {
      kind: "independent_visual_review_required",
      chunkId: checkpoint.pendingCapture?.chunk?.id ?? null,
      attemptId: checkpoint.pendingCapture?.attempt?.id ?? null,
      reason:
        "The exact staged capture must be accepted with a hash-bound independent visual review before the checkpoint can advance."
    };
  } else if (nextChunk && runtimeSourceIdentity?.status !== undefined &&
      runtimeSourceIdentity.status !== "verified") {
    nextAction = {
      kind: runtimeSourceIdentity.status === "mismatch"
        ? "runtime_build_reprofile_required"
        : "runtime_source_identity_check_failed",
      reason: runtimeSourceIdentity.status === "mismatch"
        ? "CURRENT_RUNTIME_SOURCES_DO_NOT_MATCH_IMMUTABLE_BUILD_PROFILE"
        : "CURRENT_RUNTIME_SOURCE_IDENTITY_COULD_NOT_BE_COMPUTED",
      errors: runtimeSourceIdentity.errors
    };
  } else if (nextChunk) {
    nextAction = {
      kind: "capture_next_chunk",
      chunkId: nextChunk.id,
      tilesetResRef: nextChunk.tilesetResRef,
      safeCommand: boundCommand(
        "next",
        outDirectory,
        planId,
        runtimeSourceArguments
      )
    };
  } else if (coverage?.pathConnectDifferentialCoverage.complete !== true) {
    nextAction = {
      kind: "path_connect_differential_required",
      reason: "ADD_RENDER_COVERAGE_COMPLETE_PATH_CONNECT_UNPROVEN",
      safeCommand: boundCommand("status", outDirectory, planId)
    };
  } else {
    nextAction = {
      kind: "goal_complete_candidate",
      safeCommand: boundCommand("status", outDirectory, planId)
    };
  }

  return {
    schema: MATRIX_STATUS_SCHEMA,
    generatedAt: new Date().toISOString(),
    outDirectory,
    planned: Boolean(manifest),
    planBinding,
    validation,
    runtimeSourceIdentity,
    summary: summary?.matrix ?? manifest?.summary ?? null,
    checkpoint: checkpoint
      ? {
          nextChunkIndex: safeCursor,
          capturedChunkCount: Array.isArray(checkpoint.capturedChunkIds) ? checkpoint.capturedChunkIds.length : 0,
          totalChunks: chunks.length,
          complete: checkpoint.complete === true
        }
      : null,
    heartbeat: heartbeat
      ? { phase: heartbeat.phase ?? null, updatedAt: heartbeat.updatedAt ?? null }
      : null,
    coverage,
    nextAction
  };
}

async function doctor(args) {
  const config = runtimeConfig(args);
  const health = await requestJson(`${config.baseUrl}/health`);
  const headers = await authenticate(config);
  const list = await requestJson(`${config.baseUrl}/areas/editing/tilesets`, { headers });
  print({
    schema: "aurora-tile-add-connect-matrix-doctor/v1",
    ok: true,
    baseUrl: config.baseUrl,
    auth: { available: true, source: args.username || args.password ? "flag" : "default_or_env" },
    health: health.status ?? "ok",
    tilesetCatalogCount: Array.isArray(list.data) ? list.data.length : null
  });
}

async function plan(args, outDirectory) {
  const target = preparePlanTarget(args, outDirectory);
  if (target.reused) {
    print({
      schema: "aurora-tile-add-connect-matrix-plan/v2",
      reused: true,
      status: makeStatus(outDirectory, args)
    });
    return;
  }
  const config = runtimeConfig(args);
  const requestConcurrency = positiveInteger(
    args["request-concurrency"],
    "--request-concurrency",
    DEFAULT_REQUEST_CONCURRENCY,
    16
  );
  const startedAt = new Date().toISOString();
  const tilesets = await fetchTilesetInventory(config, requestConcurrency);
  return persistMatrixPlan({
    args,
    outDirectory,
    paths: target.paths,
    replacesPlanId: target.replacesPlanId,
    tilesets,
    startedAt,
    source: { baseUrl: config.baseUrl, tilesetCount: tilesets.length }
  });
}

function preparePlanTarget(args, outDirectory) {
  const paths = outputPaths(outDirectory);
  const existingManifest = readJsonIfPresent(paths.manifest);
  const existingCheckpoint = readJsonIfPresent(paths.checkpoint);
  const existingPlanId = existingManifest ? manifestHash(existingManifest) : null;
  const replacesPlanId =
    typeof args["replaces-plan-id"] === "string" && args["replaces-plan-id"].trim()
      ? args["replaces-plan-id"].trim()
      : null;
  if (replacesPlanId && !SHA256_PATTERN.test(replacesPlanId)) {
    throw new Error("--replaces-plan-id must be an exact lowercase SHA-256.");
  }
  if ((existingManifest || existingCheckpoint) && args["replace-plan"] !== true) {
    return { reused: true, paths, replacesPlanId };
  }
  if (args["replace-plan"] === true && existingPlanId !== replacesPlanId) {
    throw new Error(
      "Replacing a matrix plan requires --replaces-plan-id with the exact existing manifest SHA-256."
    );
  }
  return { reused: false, paths, replacesPlanId };
}

function exactObjectKeys(value, expectedKeys) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const actual = Object.keys(value).sort();
  const expected = [...expectedKeys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

function loadOfflineInventoryTileset(args) {
  const inventoryPath = resolvePath(args.inventory, null);
  const inventorySha256 = typeof args["inventory-sha256"] === "string"
    ? args["inventory-sha256"].trim().toLowerCase()
    : "";
  const tilesetResRef = typeof args["tileset-resref"] === "string"
    ? args["tileset-resref"].trim().toLowerCase()
    : "";
  const sourceKey = typeof args["source-key"] === "string" ? args["source-key"].trim() : "";
  const sourceSha256 = typeof args["source-sha256"] === "string"
    ? args["source-sha256"].trim().toLowerCase()
    : "";
  if (!inventoryPath) throw new Error("plan-inventory requires --inventory.");
  if (!SHA256_PATTERN.test(inventorySha256)) {
    throw new Error("plan-inventory requires --inventory-sha256 with the exact lowercase inventory SHA-256.");
  }
  if (!/^[a-z0-9_]{1,16}$/u.test(tilesetResRef)) {
    throw new Error("plan-inventory requires --tileset-resref with one exact Aurora ResRef.");
  }
  if (!sourceKey || sourceKey.length > 512 || sourceKey.startsWith("/") || sourceKey.startsWith("\\") ||
    !sourceKey.toLowerCase().endsWith(`/${tilesetResRef}.set`)) {
    throw new Error("plan-inventory requires --source-key ending in the exact tileset SET name.");
  }
  if (!SHA256_PATTERN.test(sourceSha256)) {
    throw new Error("plan-inventory requires --source-sha256 with the exact lowercase SET SHA-256.");
  }
  assertFileSha256(inventoryPath, inventorySha256, "Offline tileset inventory");
  const inventoryArtifact = readPlanArtifact(inventoryPath, "TILESET_INVENTORY_INVALID_JSON");
  const inventory = inventoryArtifact.value;
  if (inventoryArtifact.error || !inventory ||
    !exactObjectKeys(inventory, ["schemaVersion", "generatedAt", "sourceRoot", "definitions"]) ||
    inventory.schemaVersion !== 1 || typeof inventory.generatedAt !== "string" ||
    typeof inventory.sourceRoot !== "string" || !Array.isArray(inventory.definitions)) {
    throw new Error(inventoryArtifact.error ?? "TILESET_INVENTORY_INVALID");
  }
  const matches = inventory.definitions.filter((entry) => entry?.tilesetResRef === tilesetResRef);
  if (matches.length !== 1 || !exactObjectKeys(matches[0], ["tilesetResRef", "source", "definition"])) {
    throw new Error("Offline tileset inventory must contain exactly one exact requested definition.");
  }
  const selected = matches[0];
  if (typeof selected.source !== "string" || !selected.source.trim() ||
    !selected.definition || typeof selected.definition !== "object" || Array.isArray(selected.definition)) {
    throw new Error("Offline tileset inventory entry is invalid.");
  }
  const sourcePath = path.isAbsolute(selected.source)
    ? path.resolve(selected.source)
    : path.resolve(repoRoot, selected.source);
  assertFileSha256(sourcePath, sourceSha256, "Offline tileset SET source");
  if (selected.definition.tilesetResRef !== tilesetResRef || selected.definition.fingerprint !== sourceSha256) {
    throw new Error("Offline tileset definition does not bind the exact ResRef and SET SHA-256.");
  }
  return {
    tileset: {
      tilesetResRef,
      sourceKey,
      etag: sourceSha256,
      definition: selected.definition
    },
    source: {
      mode: "hash-bound-offline-inventory",
      inventoryPath,
      inventorySha256,
      sourcePath,
      sourceKey,
      sourceSha256,
      tilesetCount: 1
    }
  };
}

function planInventory(args, outDirectory) {
  const target = preparePlanTarget(args, outDirectory);
  if (target.reused) {
    print({
      schema: "aurora-tile-add-connect-matrix-plan/v2",
      reused: true,
      status: makeStatus(outDirectory, args)
    });
    return;
  }
  const loaded = loadOfflineInventoryTileset(args);
  return persistMatrixPlan({
    args,
    outDirectory,
    paths: target.paths,
    replacesPlanId: target.replacesPlanId,
    tilesets: [loaded.tileset],
    startedAt: new Date().toISOString(),
    source: loaded.source
  });
}

function loadOfflineDefinitionCatalog(args) {
  const catalogPath = resolvePath(args.catalog, null);
  const catalogSha256 = typeof args["catalog-sha256"] === "string"
    ? args["catalog-sha256"].trim().toLowerCase()
    : "";
  if (!catalogPath) throw new Error("plan-catalog requires --catalog.");
  if (!SHA256_PATTERN.test(catalogSha256)) {
    throw new Error("plan-catalog requires --catalog-sha256 with the exact lowercase catalog SHA-256.");
  }
  assertFileSha256(catalogPath, catalogSha256, "Offline tileset definition catalog");
  const catalogArtifact = readPlanArtifact(catalogPath, "TILESET_DEFINITION_CATALOG_INVALID_JSON");
  const catalog = catalogArtifact.value;
  if (
    catalogArtifact.error ||
    !exactObjectKeys(catalog, [
      "schema",
      "generatedAt",
      "sourceInventory",
      "modelSourceInventory",
      "sourceRoot",
      "summary",
      "entries"
    ]) ||
    catalog.schema !== "aurora-tileset-definition-catalog/v2" ||
    typeof catalog.generatedAt !== "string" ||
    typeof catalog.sourceRoot !== "string" ||
    !Array.isArray(catalog.entries) ||
    catalog.entries.length === 0
  ) {
    throw new Error(catalogArtifact.error ?? "TILESET_DEFINITION_CATALOG_INVALID");
  }
  if (
    !exactObjectKeys(catalog.sourceInventory, ["path", "sha256", "schemaVersion", "generatedAt"]) ||
    typeof catalog.sourceInventory.path !== "string" ||
    !SHA256_PATTERN.test(catalog.sourceInventory.sha256 ?? "") ||
    catalog.sourceInventory.schemaVersion !== 1 ||
    typeof catalog.sourceInventory.generatedAt !== "string"
  ) {
    throw new Error("TILESET_DEFINITION_CATALOG_SOURCE_INVENTORY_INVALID");
  }
  if (
    !exactObjectKeys(catalog.modelSourceInventory, ["path", "sha256", "format", "rowCount"]) ||
    typeof catalog.modelSourceInventory.path !== "string" ||
    !catalog.modelSourceInventory.path.trim() ||
    !SHA256_PATTERN.test(catalog.modelSourceInventory.sha256 ?? "") ||
    catalog.modelSourceInventory.format !== "aurora-all-area-tiles/tiles-json-array-v1" ||
    !Number.isInteger(catalog.modelSourceInventory.rowCount) ||
    catalog.modelSourceInventory.rowCount <= 0
  ) {
    throw new Error("TILESET_DEFINITION_CATALOG_MODEL_SOURCE_INVENTORY_INVALID");
  }
  if (
    !exactObjectKeys(catalog.summary, [
      "tilesetCount",
      "totalTileCount",
      "totalGroupCount",
      "totalDiagnosticCount",
      "sourceResolvedTileCount",
      "sourceMissingTileCount",
      "intentionalPlaceholderTileCount",
      "invalidMissingModelFieldTileCount"
    ]) ||
    catalog.summary.tilesetCount !== catalog.entries.length ||
    ![
      catalog.summary.sourceResolvedTileCount,
      catalog.summary.sourceMissingTileCount,
      catalog.summary.intentionalPlaceholderTileCount,
      catalog.summary.invalidMissingModelFieldTileCount
    ].every((count) => Number.isInteger(count) && count >= 0) ||
    catalog.summary.sourceResolvedTileCount +
      catalog.summary.sourceMissingTileCount +
      catalog.summary.intentionalPlaceholderTileCount +
      catalog.summary.invalidMissingModelFieldTileCount !==
      catalog.summary.totalTileCount ||
    catalog.modelSourceInventory.rowCount !== catalog.summary.totalTileCount
  ) {
    throw new Error("TILESET_DEFINITION_CATALOG_SUMMARY_INVALID");
  }

  const sourceInventoryPath = path.isAbsolute(catalog.sourceInventory.path)
    ? path.resolve(catalog.sourceInventory.path)
    : path.resolve(repoRoot, catalog.sourceInventory.path);
  assertFileSha256(
    sourceInventoryPath,
    catalog.sourceInventory.sha256,
    "Catalog-bound source inventory"
  );
  const modelSourceInventoryPath = path.isAbsolute(catalog.modelSourceInventory.path)
    ? path.resolve(catalog.modelSourceInventory.path)
    : path.resolve(repoRoot, catalog.modelSourceInventory.path);
  assertFileSha256(
    modelSourceInventoryPath,
    catalog.modelSourceInventory.sha256,
    "Catalog-bound model source inventory"
  );

  const catalogDirectory = path.dirname(catalogPath);
  const seenResRefs = new Set();
  const seenSourceKeys = new Set();
  const validatedEntries = [];
  let previousResRef = null;
  let totalTileCount = 0;
  let totalGroupCount = 0;
  let totalDiagnosticCount = 0;
  const modelSourceStatusCounts = {
    source_resolved: 0,
    source_missing: 0,
    intentional_placeholder: 0,
    invalid_missing_model_field: 0
  };
  for (const entry of catalog.entries) {
    if (!exactObjectKeys(entry, [
      "tilesetResRef",
      "sourcePath",
      "sourceKey",
      "sourceSha256",
      "definitionPath",
      "definitionSha256",
      "tileCount",
      "groupCount",
      "diagnosticCount"
    ])) {
      throw new Error("TILESET_DEFINITION_CATALOG_ENTRY_SHAPE_INVALID");
    }
    const tilesetResRef = typeof entry.tilesetResRef === "string"
      ? entry.tilesetResRef.trim().toLowerCase()
      : "";
    if (
      !/^[a-z0-9_]{1,16}$/u.test(tilesetResRef) ||
      seenResRefs.has(tilesetResRef) ||
      (previousResRef !== null && previousResRef.localeCompare(tilesetResRef) >= 0)
    ) {
      throw new Error("TILESET_DEFINITION_CATALOG_MEMBERSHIP_INVALID");
    }
    if (
      typeof entry.sourcePath !== "string" ||
      !entry.sourcePath.trim() ||
      path.isAbsolute(entry.sourcePath) ||
      typeof entry.sourceKey !== "string" ||
      !entry.sourceKey.toLowerCase().endsWith(`/${tilesetResRef}.set`) ||
      entry.sourceKey.startsWith("/") ||
      entry.sourceKey.startsWith("\\") ||
      seenSourceKeys.has(entry.sourceKey.toLowerCase()) ||
      !SHA256_PATTERN.test(entry.sourceSha256 ?? "") ||
      typeof entry.definitionPath !== "string" ||
      !entry.definitionPath.trim() ||
      path.isAbsolute(entry.definitionPath) ||
      !SHA256_PATTERN.test(entry.definitionSha256 ?? "") ||
      !Number.isInteger(entry.tileCount) ||
      entry.tileCount < 0 ||
      !Number.isInteger(entry.groupCount) ||
      entry.groupCount < 0 ||
      !Number.isInteger(entry.diagnosticCount) ||
      entry.diagnosticCount < 0
    ) {
      throw new Error(`TILESET_DEFINITION_CATALOG_ENTRY_INVALID:${tilesetResRef || "missing"}`);
    }
    const sourcePath = path.resolve(repoRoot, entry.sourcePath);
    if (
      !isPathInside(repoRoot, sourcePath) ||
      path.basename(sourcePath).toLowerCase() !== `${tilesetResRef}.set`
    ) {
      throw new Error(`TILESET_DEFINITION_CATALOG_SOURCE_PATH_INVALID:${tilesetResRef}`);
    }
    const definitionPath = path.resolve(catalogDirectory, entry.definitionPath);
    if (!isPathInside(catalogDirectory, definitionPath)) {
      throw new Error(`TILESET_DEFINITION_CATALOG_DEFINITION_PATH_INVALID:${tilesetResRef}`);
    }
    assertFileSha256(sourcePath, entry.sourceSha256, `Catalog SET source ${tilesetResRef}`);
    assertFileSha256(definitionPath, entry.definitionSha256, `Catalog definition ${tilesetResRef}`);
    const definitionArtifact = readPlanArtifact(
      definitionPath,
      `TILESET_DEFINITION_CATALOG_DEFINITION_INVALID_JSON:${tilesetResRef}`
    );
    const definition = definitionArtifact.value;
    if (
      definitionArtifact.error ||
      !definition ||
      typeof definition !== "object" ||
      Array.isArray(definition) ||
      definition.schemaVersion !== 1 ||
      definition.tilesetResRef !== tilesetResRef ||
      definition.fingerprint !== entry.sourceSha256 ||
      !Array.isArray(definition.tiles) ||
      definition.tiles.length !== entry.tileCount ||
      definition.tiles.some((tile) =>
        !Object.hasOwn(modelSourceStatusCounts, tile?.modelSourceStatus)
      ) ||
      !Array.isArray(definition.groups) ||
      definition.groups.length !== entry.groupCount ||
      !Array.isArray(definition.diagnostics) ||
      definition.diagnostics.length !== entry.diagnosticCount
    ) {
      throw new Error(definitionArtifact.error ?? `TILESET_DEFINITION_CATALOG_DEFINITION_INVALID:${tilesetResRef}`);
    }
    // Exercise the active planner fingerprint contract during admission so a
    // malformed definition fails before any plan directory is created.
    tilesetDefinitionFingerprint(definition);
    for (const tile of definition.tiles) {
      modelSourceStatusCounts[tile.modelSourceStatus] += 1;
    }
    validatedEntries.push({
      tilesetResRef,
      sourcePath,
      sourceKey: entry.sourceKey,
      sourceSha256: entry.sourceSha256,
      definitionPath,
      tileCount: entry.tileCount,
      groupCount: entry.groupCount,
      diagnosticCount: entry.diagnosticCount
    });
    seenResRefs.add(tilesetResRef);
    seenSourceKeys.add(entry.sourceKey.toLowerCase());
    previousResRef = tilesetResRef;
    totalTileCount += entry.tileCount;
    totalGroupCount += entry.groupCount;
    totalDiagnosticCount += entry.diagnosticCount;
  }
  if (
    catalog.summary.totalTileCount !== totalTileCount ||
    catalog.summary.totalGroupCount !== totalGroupCount ||
    catalog.summary.totalDiagnosticCount !== totalDiagnosticCount ||
    catalog.summary.sourceResolvedTileCount !== modelSourceStatusCounts.source_resolved ||
    catalog.summary.sourceMissingTileCount !== modelSourceStatusCounts.source_missing ||
    catalog.summary.intentionalPlaceholderTileCount !== modelSourceStatusCounts.intentional_placeholder ||
    catalog.summary.invalidMissingModelFieldTileCount !== modelSourceStatusCounts.invalid_missing_model_field
  ) {
    throw new Error("TILESET_DEFINITION_CATALOG_SUMMARY_MEMBERSHIP_MISMATCH");
  }
  return {
    catalogPath,
    catalogSha256,
    catalog,
    sourceInventoryPath,
    modelSourceInventoryPath,
    entries: validatedEntries
  };
}

function writeAll(fd, bytes) {
  let offset = 0;
  while (offset < bytes.length) {
    offset += fs.writeSync(fd, bytes, offset, bytes.length - offset);
  }
}

function writeHashedText(fd, hash, value) {
  const bytes = Buffer.from(value, "utf8");
  hash.update(bytes);
  writeAll(fd, bytes);
}

function appendJsonArrayPayload(fd, hash, filePath) {
  const input = fs.openSync(filePath, "r");
  try {
    const size = fs.fstatSync(input).size;
    if (size < 2) throw new Error(`Matrix fragment is truncated: ${filePath}.`);
    const boundary = Buffer.alloc(1);
    fs.readSync(input, boundary, 0, 1, 0);
    if (boundary[0] !== 0x5b) throw new Error(`Matrix fragment is not a JSON array: ${filePath}.`);
    fs.readSync(input, boundary, 0, 1, size - 1);
    if (boundary[0] !== 0x5d) throw new Error(`Matrix fragment is not a JSON array: ${filePath}.`);
    const buffer = Buffer.allocUnsafe(Math.min(1024 * 1024, Math.max(1, size - 2)));
    let position = 1;
    const end = size - 1;
    while (position < end) {
      const length = Math.min(buffer.length, end - position);
      const bytesRead = fs.readSync(input, buffer, 0, length, position);
      if (bytesRead <= 0) throw new Error(`Matrix fragment ended early: ${filePath}.`);
      const payload = buffer.subarray(0, bytesRead);
      hash.update(payload);
      writeAll(fd, payload);
      position += bytesRead;
    }
  } finally {
    fs.closeSync(input);
  }
}

function writeStreamingManifest(
  filePath,
  generatedAt,
  summary,
  fragments,
  runtimeBuildBinding
) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.tmp-${process.pid}`;
  const fd = fs.openSync(temporaryPath, "wx");
  const hash = createHash("sha256");
  try {
    writeHashedText(
      fd,
      hash,
      `{"schema":${JSON.stringify(MATRIX_MANIFEST_SCHEMA)},"contract":${JSON.stringify(MATRIX_CONTRACT)},"runtimeBuildBinding":${JSON.stringify(runtimeBuildBinding)},"generatedAt":${JSON.stringify(generatedAt)},"summary":${JSON.stringify(summary)},"rows":[`
    );
    let wroteValue = false;
    for (const fragment of fragments) {
      if (fragment.rowCount === 0) continue;
      if (wroteValue) writeHashedText(fd, hash, ",");
      appendJsonArrayPayload(fd, hash, fragment.rowsPath);
      wroteValue = true;
    }
    writeHashedText(fd, hash, `],"chunks":[`);
    wroteValue = false;
    for (const kind of ["group", "direct"]) {
      for (const fragment of fragments) {
        const count = kind === "group" ? fragment.groupChunkCount : fragment.directChunkCount;
        if (count === 0) continue;
        if (wroteValue) writeHashedText(fd, hash, ",");
        appendJsonArrayPayload(
          fd,
          hash,
          kind === "group" ? fragment.groupChunksPath : fragment.directChunksPath
        );
        wroteValue = true;
      }
    }
    writeHashedText(fd, hash, "]}");
  } finally {
    fs.closeSync(fd);
  }
  fs.renameSync(temporaryPath, filePath);
  return hash.digest("hex");
}

function emptyMatrixSummary(caseLimit, groupChunkAreaCellLimit) {
  return {
    tilesetCount: 0,
    totalRows: 0,
    addPlannedRows: 0,
    connectPlannedRows: 0,
    pathConnectAcceptedRows: 0,
    pathConnectBlockedRows: 0,
    pathReferenceMatchRows: 0,
    pathReferenceMismatchRows: 0,
    pathReferenceUnknownRows: 0,
    pathReferenceNotEvaluatedRows: 0,
    blockedRows: 0,
    chunkCount: 0,
    directChunkCount: 0,
    groupChunkCount: 0,
    groupFixtureCount: 0,
    groupPlannedRows: 0,
    caseLimit,
    groupChunkAreaCellLimit
  };
}

function addMatrixSummary(target, source) {
  for (const key of [
    "tilesetCount",
    "totalRows",
    "addPlannedRows",
    "connectPlannedRows",
    "pathConnectAcceptedRows",
    "pathConnectBlockedRows",
    "pathReferenceMatchRows",
    "pathReferenceMismatchRows",
    "pathReferenceUnknownRows",
    "pathReferenceNotEvaluatedRows",
    "blockedRows",
    "chunkCount",
    "directChunkCount",
    "groupChunkCount",
    "groupFixtureCount",
    "groupPlannedRows"
  ]) {
    target[key] += source[key];
  }
}

function persistCatalogMatrixPlan({ args, outDirectory, replacesPlanId, loaded }) {
  const caseLimit = positiveInteger(args["case-limit"], "--case-limit", DEFAULT_CASE_LIMIT, 512);
  const groupChunkAreaCellLimit = positiveInteger(
    args["group-chunk-area-cell-limit"],
    "--group-chunk-area-cell-limit",
    DEFAULT_GROUP_CHUNK_AREA_CELL_LIMIT,
    1024
  );
  const runtimeBuildBinding = loadRequiredMatrixRuntimeBuildBinding(args);
  if (fs.existsSync(outDirectory)) {
    throw new Error(`Catalog plan output already exists; use a new immutable directory: ${outDirectory}.`);
  }
  const stagingDirectory = `${outDirectory}.tmp-${process.pid}`;
  if (fs.existsSync(stagingDirectory)) {
    throw new Error(`Catalog plan staging directory already exists: ${stagingDirectory}.`);
  }
  fs.mkdirSync(path.dirname(outDirectory), { recursive: true });
  fs.mkdirSync(stagingDirectory, { recursive: false });
  const fragmentsDirectory = path.join(stagingDirectory, ".fragments");
  const generatedAt = new Date().toISOString();
  const startedAt = generatedAt;
  const summary = emptyMatrixSummary(caseLimit, groupChunkAreaCellLimit);
  const fragments = [];
  const knownRowIds = new Set();
  const knownChunkIds = new Set();
  let firstGroupChunk = null;
  let firstDirectChunk = null;

  try {
    fs.mkdirSync(fragmentsDirectory, { recursive: false });
    for (const entry of loaded.entries) {
      const definition = JSON.parse(fs.readFileSync(entry.definitionPath, "utf8"));
      const fragmentManifest = buildMatrixManifest({
        tilesets: [{
          tilesetResRef: entry.tilesetResRef,
          sourceKey: entry.sourceKey,
          etag: entry.sourceSha256,
          definition
        }],
        runtimeBuildBinding,
        caseLimit,
        groupChunkAreaCellLimit,
        generatedAt
      });
      const validationErrors = validateMatrixManifest(fragmentManifest);
      if (validationErrors.length > 0) {
        throw new Error(
          `Generated matrix fragment ${entry.tilesetResRef} is invalid: ${validationErrors.join(", ")}.`
        );
      }
      if (
        fragmentManifest.summary.tilesetCount !== 1 ||
        fragmentManifest.summary.totalRows !== entry.tileCount ||
        fragmentManifest.summary.caseLimit !== caseLimit ||
        fragmentManifest.summary.groupChunkAreaCellLimit !== groupChunkAreaCellLimit
      ) {
        throw new Error(`Generated matrix fragment ${entry.tilesetResRef} has an invalid exact summary.`);
      }
      for (const row of fragmentManifest.rows) {
        if (!row.id.startsWith(`${entry.tilesetResRef}:`) || knownRowIds.has(row.id)) {
          throw new Error(`Generated matrix row membership is invalid: ${row.id}.`);
        }
        knownRowIds.add(row.id);
      }
      for (const chunk of fragmentManifest.chunks) {
        if (chunk.tilesetResRef !== entry.tilesetResRef || knownChunkIds.has(chunk.id)) {
          throw new Error(`Generated matrix chunk membership is invalid: ${chunk.id}.`);
        }
        knownChunkIds.add(chunk.id);
        writeJsonAtomic(chunkPath(stagingDirectory, chunk.id), {
          schema: "aurora-tile-add-connect-matrix-chunk/v1",
          plannedAt: generatedAt,
          ...chunk
        });
      }
      const groupChunks = fragmentManifest.chunks.filter((chunk) => chunk.kind === "group");
      const directChunks = fragmentManifest.chunks.filter((chunk) => chunk.kind !== "group");
      firstGroupChunk ??= groupChunks[0] ?? null;
      firstDirectChunk ??= directChunks[0] ?? null;
      const rowsPath = path.join(fragmentsDirectory, `${entry.tilesetResRef}.rows.json`);
      const groupChunksPath = path.join(fragmentsDirectory, `${entry.tilesetResRef}.group-chunks.json`);
      const directChunksPath = path.join(fragmentsDirectory, `${entry.tilesetResRef}.direct-chunks.json`);
      fs.writeFileSync(rowsPath, JSON.stringify(fragmentManifest.rows), "utf8");
      fs.writeFileSync(groupChunksPath, JSON.stringify(groupChunks), "utf8");
      fs.writeFileSync(directChunksPath, JSON.stringify(directChunks), "utf8");
      fragments.push({
        rowsPath,
        groupChunksPath,
        directChunksPath,
        rowCount: fragmentManifest.rows.length,
        groupChunkCount: groupChunks.length,
        directChunkCount: directChunks.length
      });
      addMatrixSummary(summary, fragmentManifest.summary);
    }
    if (
      summary.tilesetCount !== loaded.entries.length ||
      summary.totalRows !== loaded.catalog.summary.totalTileCount ||
      summary.chunkCount !== knownChunkIds.size ||
      summary.totalRows !== knownRowIds.size
    ) {
      throw new Error("STREAMING_MATRIX_COMPOSITION_SUMMARY_MISMATCH");
    }

    const stagingPaths = outputPaths(stagingDirectory);
    const hash = writeStreamingManifest(
      stagingPaths.manifest,
      generatedAt,
      summary,
      fragments,
      runtimeBuildBinding
    );
    assertFileSha256(stagingPaths.manifest, hash, "Streaming matrix manifest");
    const planBinding = {
      planId: hash,
      outDirectory,
      manifestSchema: MATRIX_MANIFEST_SCHEMA,
      contractRevision: MATRIX_CONTRACT.revision,
      contractFingerprint: MATRIX_CONTRACT.fingerprint,
      runtimeBuildBinding,
      ...(replacesPlanId ? { replacesPlanId } : {})
    };
    const checkpoint = {
      schema: MATRIX_CHECKPOINT_SCHEMA,
      planId: hash,
      planDirectory: outDirectory,
      manifestSha256: hash,
      manifestSchema: MATRIX_MANIFEST_SCHEMA,
      contractRevision: MATRIX_CONTRACT.revision,
      contractFingerprint: MATRIX_CONTRACT.fingerprint,
      runtimeBuildBinding,
      ...(replacesPlanId ? { replacesPlanId } : {}),
      nextChunkIndex: 0,
      capturedChunkIds: [],
      acceptedVisualReviews: [],
      rejectedVisualReviews: [],
      complete: false,
      updatedAt: new Date().toISOString()
    };
    const source = {
      mode: "hash-bound-offline-definition-catalog",
      catalogPath: loaded.catalogPath,
      catalogSha256: loaded.catalogSha256,
      sourceInventoryPath: loaded.sourceInventoryPath,
      sourceInventorySha256: loaded.catalog.sourceInventory.sha256,
      modelSourceInventoryPath: loaded.modelSourceInventoryPath,
      modelSourceInventorySha256: loaded.catalog.modelSourceInventory.sha256,
      modelSourceInventoryFormat: loaded.catalog.modelSourceInventory.format,
      modelSourceInventoryRowCount: loaded.catalog.modelSourceInventory.rowCount,
      tilesetCount: loaded.entries.length
    };
    writeJsonAtomic(stagingPaths.checkpoint, checkpoint);
    writeJsonAtomic(stagingPaths.summary, {
      schema: MATRIX_SUMMARY_SCHEMA,
      generatedAt: new Date().toISOString(),
      planBinding,
      source,
      matrix: summary,
      validationErrors: []
    });
    writeJsonAtomic(stagingPaths.heartbeat, {
      schema: "aurora-tile-add-connect-matrix-heartbeat/v2",
      phase: "planned",
      startedAt,
      updatedAt: new Date().toISOString(),
      planBinding,
      manifestSha256: hash,
      checkpoint: { nextChunkIndex: 0, totalChunks: summary.chunkCount }
    });
    fs.rmSync(fragmentsDirectory, { recursive: true, force: true });
    fs.renameSync(stagingDirectory, outDirectory);
    const nextChunk = firstGroupChunk ?? firstDirectChunk;
    print({
      schema: "aurora-tile-add-connect-matrix-plan/v2",
      reused: false,
      outDirectory,
      planBinding,
      manifestPath: outputPaths(outDirectory).manifest,
      summary,
      nextChunk: nextChunk ? {
        id: nextChunk.id,
        tilesetResRef: nextChunk.tilesetResRef,
        caseCount: nextChunk.caseCount,
        width: nextChunk.width,
        height: nextChunk.height
      } : null
    });
  } catch (error) {
    if (fs.existsSync(stagingDirectory) && isPathInside(path.dirname(stagingDirectory), stagingDirectory)) {
      fs.rmSync(stagingDirectory, { recursive: true, force: true });
    }
    throw error;
  }
}

function planCatalog(args, outDirectory) {
  const target = preparePlanTarget(args, outDirectory);
  if (target.reused) {
    print({
      schema: "aurora-tile-add-connect-matrix-plan/v2",
      reused: true,
      status: makeStatus(outDirectory, args)
    });
    return;
  }
  const loaded = loadOfflineDefinitionCatalog(args);
  return persistCatalogMatrixPlan({
    args,
    outDirectory,
    replacesPlanId: target.replacesPlanId,
    loaded
  });
}

function persistMatrixPlan({ args, outDirectory, paths, replacesPlanId, tilesets, startedAt, source }) {
  const caseLimit = positiveInteger(args["case-limit"], "--case-limit", DEFAULT_CASE_LIMIT, 512);
  const groupChunkAreaCellLimit = positiveInteger(
    args["group-chunk-area-cell-limit"],
    "--group-chunk-area-cell-limit",
    DEFAULT_GROUP_CHUNK_AREA_CELL_LIMIT,
    1024
  );
  const runtimeBuildBinding = loadRequiredMatrixRuntimeBuildBinding(args);
  const manifest = buildMatrixManifest({
    tilesets,
    runtimeBuildBinding,
    caseLimit,
    groupChunkAreaCellLimit
  });
  const validationErrors = validateMatrixManifest(manifest);
  if (validationErrors.length > 0) {
    throw new Error(`Generated matrix manifest is invalid: ${validationErrors.join(", ")}.`);
  }
  const hash = manifestHash(manifest);
  const planBinding = {
    planId: hash,
    outDirectory,
    manifestSchema: manifest.schema,
    contractRevision: manifest.contract.revision,
    contractFingerprint: manifest.contract.fingerprint,
    runtimeBuildBinding: manifest.runtimeBuildBinding,
    ...(replacesPlanId ? { replacesPlanId } : {})
  };
  const checkpoint = {
    schema: MATRIX_CHECKPOINT_SCHEMA,
    planId: hash,
    planDirectory: outDirectory,
    manifestSha256: hash,
    manifestSchema: manifest.schema,
    contractRevision: manifest.contract.revision,
    contractFingerprint: manifest.contract.fingerprint,
    runtimeBuildBinding: manifest.runtimeBuildBinding,
    ...(replacesPlanId ? { replacesPlanId } : {}),
    nextChunkIndex: 0,
    capturedChunkIds: [],
    acceptedVisualReviews: [],
    rejectedVisualReviews: [],
    complete: false,
    updatedAt: new Date().toISOString()
  };
  const summary = {
    schema: MATRIX_SUMMARY_SCHEMA,
    generatedAt: new Date().toISOString(),
    planBinding,
    source,
    matrix: manifest.summary,
    validationErrors
  };
  const heartbeat = {
    schema: "aurora-tile-add-connect-matrix-heartbeat/v2",
    phase: "planned",
    startedAt,
    updatedAt: new Date().toISOString(),
    planBinding,
    manifestSha256: hash,
    checkpoint: { nextChunkIndex: 0, totalChunks: manifest.chunks.length }
  };
  writeJsonAtomic(paths.manifest, manifest);
  for (const chunk of manifest.chunks) {
    const chunkValidationErrors = validateMatrixChunk(chunk);
    if (chunkValidationErrors.length > 0) {
      throw new Error(`Generated matrix chunk ${chunk.id} is invalid: ${chunkValidationErrors.join(", ")}.`);
    }
    writeJsonAtomic(chunkPath(outDirectory, chunk.id), {
      schema: "aurora-tile-add-connect-matrix-chunk/v1",
      plannedAt: manifest.generatedAt,
      ...chunk
    });
  }
  writeJsonAtomic(paths.checkpoint, checkpoint);
  writeJsonAtomic(paths.summary, summary);
  writeJsonAtomic(paths.heartbeat, heartbeat);
  print({
    schema: "aurora-tile-add-connect-matrix-plan/v2",
    reused: false,
    outDirectory,
    planBinding,
    manifestPath: paths.manifest,
    summary: manifest.summary,
    nextChunk: manifest.chunks[0] ? {
      id: manifest.chunks[0].id,
      tilesetResRef: manifest.chunks[0].tilesetResRef,
      caseCount: manifest.chunks[0].caseCount,
      width: manifest.chunks[0].width,
      height: manifest.chunks[0].height
    } : null
  });
}

function summarizeChunk(chunk) {
  if (!chunk) return null;
  const isGroupChunk = chunk.kind === "group";
  const rowIds = Array.isArray(chunk.cases)
    ? isGroupChunk
      ? chunk.cases.flatMap((matrixCase) => matrixCase.memberCells?.map((cell) => cell.rowId) ?? [])
      : chunk.cases.map((matrixCase) => matrixCase.rowId)
    : [];
  return {
    id: chunk.id,
    kind: chunk.kind ?? "tile",
    tilesetResRef: chunk.tilesetResRef,
    definitionFingerprint: chunk.definitionFingerprint,
    runtimeDefinitionFingerprint: chunk.runtimeDefinitionFingerprint,
    width: chunk.width,
    height: chunk.height,
    caseCount: chunk.caseCount,
    memberTileCount: isGroupChunk ? chunk.memberTileCount : null,
    firstRowId: rowIds.at(0) ?? null,
    lastRowId: rowIds.at(-1) ?? null
  };
}

function next(args, outDirectory) {
  const status = makeStatus(outDirectory, args);
  if (
    status.validation.status !== "ready" ||
    status.nextAction?.kind === "independent_visual_review_required" ||
    status.nextAction?.kind === "runtime_build_reprofile_required" ||
    status.nextAction?.kind === "runtime_source_identity_check_failed"
  ) {
    print({
      schema: "aurora-tile-add-connect-matrix-next/v2",
      status,
      chunk: null,
      captureIntegration: null
    });
    return;
  }
  const state = currentMatrixChunk(outDirectory, args);
  const chunk = state.chunk;
  print({
    schema: "aurora-tile-add-connect-matrix-next/v2",
    status,
    chunk: args["include-cases"] === true ? chunk : summarizeChunk(chunk),
    captureIntegration: chunk
      ? {
          status: "ready_for_guarded_add_render_capture",
          chunkPath: chunkPath(outDirectory, chunk.id),
          proofScope: "add_render",
          safeCommand: boundCommand(
            "capture",
            outDirectory,
            state.planId,
            [
              "--chunk-id",
              quoteCliArgument(chunk.id),
              ...(args["verify-runtime-source"] === true
                ? ["--verify-runtime-source"]
                : [])
            ]
          ),
          reason: "Capture is permitted only through the local-draft browser scenario with exact chunk and renderer settlement validation."
        }
      : null
  });
}

function currentMatrixChunk(outDirectory, args) {
  const plan = inspectPersistedPlan(outDirectory, args);
  const { paths, manifest, checkpoint, planId, validation } = plan;
  if (validation.status !== "ready") {
    return { ...plan, chunk: null, nextIndex: null };
  }
  if (checkpoint?.pendingCapture != null) {
    throw new Error(
      `Chunk ${checkpoint.pendingCapture?.chunk?.id ?? "<unknown>"} is already awaiting independent visual review.`
    );
  }
  const chunks = Array.isArray(manifest.chunks) ? manifest.chunks : [];
  const nextIndex = Number(checkpoint.nextChunkIndex ?? 0);
  if (!Number.isInteger(nextIndex) || nextIndex < 0 || nextIndex > chunks.length) {
    throw new Error("Matrix checkpoint has an invalid nextChunkIndex.");
  }
  if (nextIndex >= chunks.length) {
    return { paths, manifest, checkpoint, planId, validation, chunk: null, nextIndex };
  }
  const expected = chunks[nextIndex];
  if (args["chunk-id"] && args["chunk-id"] !== expected.id) {
    throw new Error(`Only the next matrix chunk may be captured: expected ${expected.id}.`);
  }
  const errors = validateMatrixChunk(expected);
  if (errors.length > 0) throw new Error(`Matrix chunk ${expected.id} is invalid: ${errors.join(", ")}.`);
  return { paths, manifest, checkpoint, planId, validation, chunk: expected, nextIndex };
}

export function matrixFrameVerification(
  frame,
  state,
  chunk,
  runtimeBuildBinding
) {
  const errors = [];
  const terrain = frame?.terrainTileModelSnapshot ?? {};
  const expectedTileCount = chunk.width * chunk.height;
  const isGroupChunk = chunk.kind === "group";
  const require = (condition, code) => { if (!condition) errors.push(code); };
  require(frame?.status === "captured", "FRAME_NOT_CAPTURED");
  require(
    frame?.areaEditingScenario?.ok === true &&
      frame?.areaEditingScenario?.scenario === "tile-add-connect-matrix-local",
    "SCENARIO_MISMATCH"
  );
  require(frame?.runtimeCanvasScreenshot?.ok === true, "CANVAS_SCREENSHOT_MISSING");
  require(frame?.pageScreenshot?.ok === true, "PAGE_SCREENSHOT_MISSING");
  require(
    frame?.runtimeBuildProof?.status === "verified",
    "MATRIX_RUNTIME_BUILD_PROOF_NOT_VERIFIED"
  );
  require(
    sameJson(frame?.runtimeBuildProof?.binding, runtimeBuildBinding),
    "MATRIX_RUNTIME_BUILD_BINDING_MISMATCH"
  );
  validateMatrixRuntimeBuildObservations(
    runtimeBuildBinding,
    frame?.runtimeBuildProof?.observations
  ).forEach((error) => errors.push(error));
  validateMatrixRuntimeBuildObservations(
    runtimeBuildBinding,
    frame?.runtimeBuildProof?.preflightObservations
  ).forEach((error) => errors.push(`PREFLIGHT_${error}`));
  require(
    frame?.runtimeBuildProof?.preflightObservations?.backendDirect
      ?.processStartedAt ===
      frame?.runtimeBuildProof?.observations?.backendDirect?.processStartedAt &&
      frame?.runtimeBuildProof?.preflightObservations?.backendProxy
        ?.processStartedAt ===
        frame?.runtimeBuildProof?.observations?.backendProxy?.processStartedAt,
    "MATRIX_BACKEND_RUNTIME_BUILD_PROCESS_RESTARTED_DURING_CAPTURE"
  );
  const sourceIdentity = frame?.runtimeBuildProof?.sourceIdentity;
  validateTileAddConnectRuntimeSourceIdentity(
    runtimeBuildBinding,
    sourceIdentity?.preflight
  ).forEach((error) => errors.push(`PREFLIGHT_${error}`));
  validateTileAddConnectRuntimeSourceIdentity(
    runtimeBuildBinding,
    sourceIdentity?.postCapture
  ).forEach((error) => errors.push(`POST_CAPTURE_${error}`));
  require(
    sameJson(sourceIdentity?.preflight, sourceIdentity?.postCapture),
    "MATRIX_RUNTIME_SOURCE_IDENTITY_CHANGED_DURING_CAPTURE"
  );
  require(frame?.domStatus?.runtimeFreshness?.ok === true, "RUNTIME_FRESHNESS_FALSE");
  require(frame?.areaTileMutationRuntimeSettlement?.status === "ready", "MUTATION_SETTLEMENT_NOT_READY");
  require(frame?.postCaptureAreaTileMutationRuntimeSettlement?.status === "ready", "POST_SETTLEMENT_NOT_READY");
  require(frame?.areaPresentedFrameFence?.status === "ready", "PRESENTED_FRAME_FENCE_NOT_READY");
  require(Number(terrain.tileCount) === expectedTileCount, "TERRAIN_TILE_COUNT_MISMATCH");
  require(Number(terrain.loadedTileCount) === expectedTileCount, "TERRAIN_LOADED_TILE_COUNT_MISMATCH");
  require(Number(terrain.pendingTileCount ?? 0) === 0, "TERRAIN_PENDING_TILES");
  require(Number(terrain.failedTileCount ?? 0) === 0, "TERRAIN_FAILED_TILES");
  require(Number(terrain.bridgeTileCount ?? 0) === 0, "TERRAIN_BRIDGE_TILES");
  require(state?.scenario === "tile-add-connect-matrix-local", "STATE_SCENARIO_MISMATCH");
  require(state?.action?.chunkId === chunk.id, "STATE_CHUNK_ID_MISMATCH");
  require(state?.assertions?.exactFixtureTileIds === true, "FIXTURE_TILE_IDS_NOT_EXACT");
  require(
    isGroupChunk
      ? state?.assertions?.declaredGroupLayout === true
      : state?.assertions?.sourceAndPartnerAdjacency === true,
    isGroupChunk ? "GROUP_FIXTURE_LAYOUT_FALSE" : "FIXTURE_ADJACENCY_FALSE"
  );
  const tileByCell = new Map(
    (state?.commit?.state?.tiles ?? []).map((tile) => [`${tile.row}:${tile.col}`, tile])
  );
  if (isGroupChunk) {
    const groupInstances = Array.isArray(state?.commit?.state?.groupInstances)
      ? state.commit.state.groupInstances
      : [];
    for (const matrixCase of chunk.cases) {
      const expectedCells = matrixCase.memberCells
        .map((cell) => `${cell.row}:${cell.col}`)
        .sort((left, right) => left.localeCompare(right));
      const groupObserved = groupInstances.some((instance) =>
        instance.groupId === matrixCase.groupId &&
        instance.anchorRow === matrixCase.anchor.row &&
        instance.anchorCol === matrixCase.anchor.col &&
        instance.orientation === 0 &&
        Array.isArray(instance.cells) &&
        instance.cells.map((cell) => `${cell.row}:${cell.col}`).sort((left, right) => left.localeCompare(right)).join("|") === expectedCells.join("|")
      );
      if (!groupObserved) errors.push(`GROUP_FIXTURE_INSTANCE_MISMATCH:${matrixCase.id}`);
      for (const cell of matrixCase.memberCells) {
        const observed = tileByCell.get(`${cell.row}:${cell.col}`);
        if (observed?.tileId !== cell.tileId) errors.push(`FIXTURE_TILE_ID_MISMATCH:${cell.rowId}`);
        if (observed?.orientation !== cell.orientation) errors.push(`FIXTURE_ORIENTATION_MISMATCH:${cell.rowId}`);
        if (observed?.groupId !== matrixCase.groupId) errors.push(`GROUP_MEMBER_OWNERSHIP_MISMATCH:${cell.rowId}`);
      }
    }
  } else {
    for (const matrixCase of chunk.cases) {
      for (const cell of matrixCase.cells) {
        const observed = tileByCell.get(`${cell.row}:${cell.col}`);
        if (observed?.tileId !== cell.tileId) errors.push(`FIXTURE_TILE_ID_MISMATCH:${matrixCase.rowId}`);
        if (observed?.orientation !== 0) errors.push(`FIXTURE_ORIENTATION_MISMATCH:${matrixCase.rowId}`);
      }
    }
  }
  return {
    ok: errors.length === 0,
    errors: [...new Set(errors)].sort(),
    expectedTileCount,
    runtimeBuildBinding
  };
}

function captureAppBaseUrl(matrixApiBaseUrl) {
  return matrixApiBaseUrl.replace(/\/_aurora\/v1$/u, "");
}

export function buildPendingMatrixCapture({
  outDirectory,
  manifest,
  checkpoint,
  planId,
  chunk,
  nextIndex,
  attemptId,
  artifactPaths,
  verification,
  stagedAt = new Date().toISOString()
}) {
  if (verification?.ok !== true) {
    throw new Error("Only a strictly verified matrix frame may be staged.");
  }
  if (
    !sameJson(verification?.runtimeBuildBinding, manifest?.runtimeBuildBinding) ||
    !sameJson(checkpoint?.runtimeBuildBinding, manifest?.runtimeBuildBinding)
  ) {
    throw new Error(
      "Capture staging runtime-build binding differs from the exact plan."
    );
  }
  if (checkpoint?.pendingCapture != null) {
    throw new Error(
      "A matrix capture is already awaiting independent visual review."
    );
  }
  if (
    checkpoint?.planId !== planId ||
    checkpoint?.manifestSha256 !== planId ||
    Number(checkpoint?.nextChunkIndex) !== nextIndex ||
    manifest?.chunks?.[nextIndex]?.id !== chunk?.id
  ) {
    throw new Error(
      "The capture staging request is not bound to the exact current plan cursor."
    );
  }
  const expectedCapturedPrefix = manifest.chunks
    .slice(0, nextIndex)
    .map((candidate) => candidate.id);
  if (
    !Array.isArray(checkpoint.capturedChunkIds) ||
    checkpoint.capturedChunkIds.length !== expectedCapturedPrefix.length ||
    !checkpoint.capturedChunkIds.every(
      (chunkId, index) => chunkId === expectedCapturedPrefix[index]
    )
  ) {
    throw new Error(
      "The capture staging checkpoint is not the immutable manifest prefix."
    );
  }
  if (typeof attemptId !== "string" || !attemptId.trim()) {
    throw new Error("Capture staging requires an immutable attempt ID.");
  }
  const capturesDirectory = outputPaths(outDirectory).capturesDirectory;
  const requiredArtifactKinds = [
    "frame",
    "state",
    "canvas",
    "page",
    "lifecycle"
  ];
  const artifacts = {};
  for (const kind of requiredArtifactKinds) {
    const artifactPath =
      typeof artifactPaths?.[kind] === "string"
        ? path.resolve(artifactPaths[kind])
        : "";
    if (
      !artifactPath ||
      !isPathInside(capturesDirectory, artifactPath) ||
      !fs.existsSync(artifactPath) ||
      !fs.statSync(artifactPath).isFile()
    ) {
      throw new Error(
        `Capture staging artifact ${kind} is missing or outside the plan captures directory.`
      );
    }
    artifacts[kind] = {
      path: artifactPath,
      sha256: fileSha256(artifactPath),
      bytes: fs.statSync(artifactPath).size
    };
  }
  const pendingCapture = {
    schema: MATRIX_PENDING_CAPTURE_SCHEMA,
    stagedAt,
    planBinding: {
      planId,
      manifestSchema: manifest.schema,
      contractRevision: manifest.contract?.revision ?? null,
      contractFingerprint: manifest.contract?.fingerprint ?? null,
      runtimeBuildBinding: manifest.runtimeBuildBinding
    },
    runtimeBuildBinding: manifest.runtimeBuildBinding,
    chunk: {
      id: chunk.id,
      kind: chunk.kind ?? "tile",
      tilesetResRef: chunk.tilesetResRef,
      definitionFingerprint: chunk.definitionFingerprint,
      definitionPath: chunkPath(outDirectory, chunk.id),
      nextChunkIndex: nextIndex
    },
    attempt: {
      id: attemptId
    },
    artifacts,
    verification
  };
  return {
    pendingCapture,
    nextCheckpoint: {
      ...checkpoint,
      pendingCapture,
      complete: false,
      updatedAt: stagedAt
    }
  };
}

function nextCaptureAttemptId(capturesDirectory, chunkId) {
  if (!fs.existsSync(capturesDirectory)) {
    return chunkId;
  }
  const entries = fs.readdirSync(capturesDirectory, {
    withFileTypes: true
  });
  const hasHistoricAttempt = entries.some(
    (entry) =>
      entry.isFile() &&
      entry.name.startsWith(`${chunkId}.`) &&
      !entry.name.startsWith(`${chunkId}.attempt-`)
  );
  const attemptPattern = new RegExp(
    `^${chunkId.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")}\\.attempt-(\\d{4})\\.`,
    "u"
  );
  const existingAttemptNumbers = entries
    .filter((entry) => entry.isFile())
    .map((entry) => attemptPattern.exec(entry.name)?.[1] ?? null)
    .filter(Boolean)
    .map(Number);
  if (!hasHistoricAttempt && existingAttemptNumbers.length === 0) {
    return chunkId;
  }
  const nextAttemptNumber = Math.max(
    hasHistoricAttempt ? 1 : 0,
    ...existingAttemptNumbers
  ) + 1;
  return `${chunkId}.attempt-${String(nextAttemptNumber).padStart(4, "0")}`;
}

async function capture(args, outDirectory) {
  const status = makeStatus(outDirectory, args);
  if (status.validation.status !== "ready") {
    print({
      schema: "aurora-tile-add-connect-matrix-capture/v2",
      accepted: false,
      status: status.validation.status,
      planBinding: status.planBinding,
      validation: status.validation,
      nextAction: status.nextAction
    });
    return;
  }
  if (
    status.nextAction?.kind === "runtime_build_reprofile_required" ||
    status.nextAction?.kind === "runtime_source_identity_check_failed"
  ) {
    print({
      schema: "aurora-tile-add-connect-matrix-capture/v2",
      accepted: false,
      status: status.nextAction.kind,
      planBinding: status.planBinding,
      validation: status.validation,
      runtimeSourceIdentity: status.runtimeSourceIdentity,
      nextAction: status.nextAction
    });
    return;
  }
  const { paths, manifest, checkpoint, planId, chunk, nextIndex } =
    currentMatrixChunk(outDirectory, args);
  if (!chunk) {
    print({
      schema: "aurora-tile-add-connect-matrix-capture/v2",
      accepted: false,
      status: "add_render_complete",
      proofScope: "add_render",
      planBinding: status.planBinding,
      nextAction: status.nextAction
    });
    return;
  }
  const chunkFile = chunkPath(outDirectory, chunk.id);
  const persistedChunk = readJsonIfPresent(chunkFile);
  const persistedErrors = validateMatrixChunk(persistedChunk);
  if (
    persistedErrors.length > 0 ||
    persistedChunk?.definitionFingerprint !== chunk.definitionFingerprint ||
    persistedChunk?.runtimeDefinitionFingerprint !== chunk.runtimeDefinitionFingerprint
  ) {
    throw new Error(`Persisted chunk ${chunk.id} is missing, invalid, or no longer matches its manifest.`);
  }
  const config = runtimeConfig(args);
  const currentDefinition = await fetchTilesetDefinition(config, chunk.tilesetResRef);
  const currentFingerprint = tilesetRuntimeDefinitionFingerprint(currentDefinition);
  if (currentFingerprint !== chunk.runtimeDefinitionFingerprint) {
    throw new Error(`Tileset ${chunk.tilesetResRef} changed since plan; re-plan before capture.`);
  }
  const frameStem = nextCaptureAttemptId(
    paths.capturesDirectory,
    chunk.id
  );
  const framePath = path.join(paths.capturesDirectory, `${frameStem}.frame.json`);
  const statePath = path.join(paths.capturesDirectory, `${frameStem}.state.json`);
  const lifecycleTracePath = path.join(paths.capturesDirectory, `${frameStem}.lifecycle.jsonl`);
  const appBaseUrl = captureAppBaseUrl(config.baseUrl);
  const runtimeWaitMs = positiveInteger(args["runtime-wait-ms"], "--runtime-wait-ms", 180_000, 600_000);
  const childTimeoutMs = runtimeWaitMs + MATRIX_CAPTURE_CHILD_GRACE_MS;
  const planBinding = {
    planId,
    outDirectory,
    manifestSchema: manifest.schema,
    contractRevision: manifest.contract.revision,
    contractFingerprint: manifest.contract.fingerprint,
    runtimeBuildBinding: manifest.runtimeBuildBinding
  };
  const command = [
    path.join(scriptDirectory, "capture-areas-runtime-cdp.mjs"),
    "--areaEditingScenario", "tile-add-connect-matrix-local",
    "--areaEditingMatrixChunk", chunkFile,
    "--areaEditingNewAreaTileset", chunk.tilesetResRef,
    "--areaEditingNewAreaResRef", `matrix_${chunk.tilesetResRef}`,
    "--areaEditingNewAreaWidth", String(chunk.width),
    "--areaEditingNewAreaHeight", String(chunk.height),
    "--view", "top-down",
    "--tileOverlay", "true",
    "--runtimeWaitMs", String(runtimeWaitMs),
    "--chromeCdpTimeoutMs", String(runtimeWaitMs),
    "--httpTimeoutMs", "60000",
    "--overallTimeoutMs", String(runtimeWaitMs + 300_000),
    "--requireScreenshot", "true",
    "--baseUrl", appBaseUrl,
    "--runtimeBuildProfile", manifest.runtimeBuildBinding.profile.path,
    "--runtimeBuildProfileSha256", manifest.runtimeBuildBinding.profile.sha256,
    "--outDir", paths.capturesDirectory,
    "--lifecycleTracePath", lifecycleTracePath,
    "--exitAfterCleanup", "true",
    "--name", frameStem
  ];
  writeJsonAtomic(paths.heartbeat, {
    schema: "aurora-tile-add-connect-matrix-heartbeat/v2",
    phase: "capturing",
    updatedAt: new Date().toISOString(),
    planBinding,
    manifestSha256: checkpoint.manifestSha256,
    chunk: summarizeChunk(chunk),
    proofScope: "add_render",
    checkpoint: { nextChunkIndex: nextIndex, totalChunks: manifest.chunks.length }
  });
  const captureStartedAtMs = Date.now();
  const child = spawnSync(process.execPath, command, {
    cwd: path.join(repoRoot, "backend"),
    encoding: "utf8",
    timeout: childTimeoutMs,
    maxBuffer: 16 * 1024 * 1024
  });
  const frame = readJsonIfPresent(framePath);
  const state = readJsonIfPresent(statePath);
  const verification = matrixFrameVerification(
    frame,
    state,
    chunk,
    manifest.runtimeBuildBinding
  );
  const childTimedOutAfterFreshVerifiedArtifacts =
    child.error?.code === "ETIMEDOUT" &&
    isFreshArtifact(framePath, captureStartedAtMs) &&
    isFreshArtifact(statePath, captureStartedAtMs) &&
    verification.ok;
  if ((child.error || child.status !== 0) && !childTimedOutAfterFreshVerifiedArtifacts) {
    writeJsonAtomic(paths.heartbeat, {
      schema: "aurora-tile-add-connect-matrix-heartbeat/v2",
      phase: "blocked",
      updatedAt: new Date().toISOString(),
      planBinding,
      manifestSha256: checkpoint.manifestSha256,
      chunk: summarizeChunk(chunk),
      proofScope: "add_render",
      failure: {
        status: child.status,
        signal: child.signal,
        message: child.error?.message ?? null,
        timeoutMs: childTimeoutMs,
        freshArtifactsPresent:
          isFreshArtifact(framePath, captureStartedAtMs) && isFreshArtifact(statePath, captureStartedAtMs),
        verification,
        stdoutTail: String(child.stdout ?? "").slice(-4000),
        stderrTail: String(child.stderr ?? "").slice(-4000)
      }
    });
    throw new Error(`Local matrix capture ${chunk.id} failed; checkpoint was not advanced.`);
  }
  if (!verification.ok) {
    writeJsonAtomic(paths.heartbeat, {
      schema: "aurora-tile-add-connect-matrix-heartbeat/v2",
      phase: "blocked",
      updatedAt: new Date().toISOString(),
      planBinding,
      manifestSha256: checkpoint.manifestSha256,
      chunk: summarizeChunk(chunk),
      proofScope: "add_render",
      verification
    });
    throw new Error(`Local matrix capture ${chunk.id} did not pass its strict verification: ${verification.errors.join(", ")}.`);
  }
  const pagePath =
    frame?.pageScreenshot?.path ??
    frame?.screenshotPath ??
    path.join(paths.capturesDirectory, `${frameStem}.png`);
  const canvasPath = frame?.runtimeCanvasScreenshot?.path;
  const stagedAt = new Date().toISOString();
  const stagedCapture = buildPendingMatrixCapture({
    outDirectory,
    manifest,
    checkpoint,
    planId,
    chunk,
    nextIndex,
    attemptId: frameStem,
    artifactPaths: {
      frame: framePath,
      state: statePath,
      canvas: canvasPath,
      page: pagePath,
      lifecycle: lifecycleTracePath
    },
    verification,
    stagedAt
  });
  writeJsonAtomic(paths.checkpoint, stagedCapture.nextCheckpoint);
  writeJsonAtomic(paths.heartbeat, {
    schema: "aurora-tile-add-connect-matrix-heartbeat/v2",
    phase: "awaiting_independent_visual_review",
    updatedAt: stagedAt,
    planBinding,
    manifestSha256: checkpoint.manifestSha256,
    chunk: summarizeChunk(chunk),
    proofScope: "add_render",
    pendingCapture: stagedCapture.pendingCapture,
    verification,
    checkpoint: {
      nextChunkIndex: nextIndex,
      totalChunks: manifest.chunks.length
    }
  });
  print({
    schema: "aurora-tile-add-connect-matrix-capture/v2",
    accepted: false,
    staged: true,
    status: "awaiting_independent_visual_review",
    proofScope: "add_render",
    pathConnectAccepted: false,
    planBinding,
    chunk: summarizeChunk(chunk),
    pendingCapture: stagedCapture.pendingCapture,
    ...(childTimedOutAfterFreshVerifiedArtifacts
      ? {
          childTermination:
            "ETIMEDOUT_AFTER_FRESH_VERIFIED_ARTIFACTS"
        }
      : {}),
    verification,
    checkpoint: {
      nextChunkIndex: nextIndex,
      capturedChunkCount: checkpoint.capturedChunkIds.length,
      complete: false
    }
  });
}

function acceptCapture(args, outDirectory) {
  const requestedPlanId = requireSha256Arg(args, "plan-id");
  const requestedChunkId = requireStringArg(args, "chunk-id");
  const visualReviewPath = resolvePath(
    requireStringArg(args, "visual-review"),
    path.join(outDirectory, "__missing_visual_review__")
  );
  const paths = outputPaths(outDirectory);
  if (!isPathInside(paths.capturesDirectory, visualReviewPath)) {
    throw new Error(
      "The independent visual review must be a regular file inside the plan captures directory."
    );
  }
  if (
    !fs.existsSync(visualReviewPath) ||
    !fs.statSync(visualReviewPath).isFile()
  ) {
    throw new Error(
      `Independent visual review is missing: ${visualReviewPath}`
    );
  }
  const review = readJsonIfPresent(visualReviewPath);
  if (!review) {
    throw new Error("Independent visual review is not valid JSON.");
  }
  const plan = inspectPersistedPlan(outDirectory, {
    ...args,
    "plan-id": requestedPlanId
  });
  if (plan.validation.status !== "ready") {
    throw new Error(
      `Capture acceptance requires an exact ready plan: ${plan.validation.errors.join(", ")}.`
    );
  }
  const { manifest, checkpoint, heartbeat, planId } = plan;
  const pendingCapture = checkpoint?.pendingCapture;
  if (!pendingCapture) {
    throw new Error(
      "No staged capture is awaiting independent visual review."
    );
  }
  const nextIndex = Number(checkpoint.nextChunkIndex);
  const chunk = manifest?.chunks?.[nextIndex];
  if (
    planId !== requestedPlanId ||
    !chunk ||
    chunk.id !== requestedChunkId ||
    pendingCapture.schema !== MATRIX_PENDING_CAPTURE_SCHEMA ||
    pendingCapture.planBinding?.planId !== planId ||
    pendingCapture.planBinding?.manifestSchema !== manifest.schema ||
    pendingCapture.planBinding?.contractRevision !==
      manifest.contract?.revision ||
    pendingCapture.planBinding?.contractFingerprint !==
      manifest.contract?.fingerprint ||
    !sameJson(
      pendingCapture.planBinding?.runtimeBuildBinding,
      manifest.runtimeBuildBinding
    ) ||
    !sameJson(
      pendingCapture.runtimeBuildBinding,
      manifest.runtimeBuildBinding
    ) ||
    pendingCapture.chunk?.id !== requestedChunkId ||
    pendingCapture.chunk?.nextChunkIndex !== nextIndex ||
    pendingCapture.chunk?.definitionFingerprint !==
      chunk.definitionFingerprint
  ) {
    throw new Error(
      "The pending capture is not bound to the exact current plan chunk."
    );
  }

  const requiredArtifactKinds = [
    "frame",
    "state",
    "canvas",
    "page",
    "lifecycle"
  ];
  for (const kind of requiredArtifactKinds) {
    const artifact = pendingCapture.artifacts?.[kind];
    const artifactPath =
      typeof artifact?.path === "string"
        ? path.resolve(artifact.path)
        : "";
    const sha256 = String(artifact?.sha256 ?? "").toLowerCase();
    if (
      !artifactPath ||
      !isPathInside(paths.capturesDirectory, artifactPath) ||
      !SHA256_PATTERN.test(sha256)
    ) {
      throw new Error(
        `Pending capture artifact ${kind} is not hash-bound inside the plan.`
      );
    }
    assertFileSha256(
      artifactPath,
      sha256,
      `Pending capture ${kind} artifact`
    );
    if (
      Number.isInteger(artifact.bytes) &&
      fs.statSync(artifactPath).size !== artifact.bytes
    ) {
      throw new Error(
        `Pending capture ${kind} artifact byte count changed before review.`
      );
    }
  }

  const reviewErrors = [];
  const requireReview = (condition, code) => {
    if (!condition) reviewErrors.push(code);
  };
  requireReview(
    review.schema === MATRIX_VISUAL_REVIEW_SCHEMA,
    "VISUAL_REVIEW_SCHEMA_MISMATCH"
  );
  requireReview(
    review.verdict === "verified",
    "VISUAL_REVIEW_VERDICT_NOT_VERIFIED"
  );
  requireReview(
    typeof review.reviewerIdentity === "string" &&
      review.reviewerIdentity.trim().length > 0,
    "VISUAL_REVIEWER_IDENTITY_MISSING"
  );
  requireReview(
    typeof review.reviewedAt === "string" &&
      Number.isFinite(Date.parse(review.reviewedAt)),
    "VISUAL_REVIEW_TIMESTAMP_INVALID"
  );
  requireReview(
    review.auroraToolsetProveContractVersion ===
      AURORA_TOOLSET_PROVE_CONTRACT_VERSION,
    "VISUAL_REVIEW_SKILL_CONTRACT_MISMATCH"
  );
  requireReview(
    review.planBinding?.planId === planId &&
      review.planBinding?.manifestSchema === manifest.schema &&
      review.planBinding?.contractRevision ===
        manifest.contract?.revision &&
      review.planBinding?.contractFingerprint ===
        manifest.contract?.fingerprint &&
      sameJson(
        review.planBinding?.runtimeBuildBinding,
        manifest.runtimeBuildBinding
      ) &&
      sameJson(review.runtimeBuildBinding, manifest.runtimeBuildBinding),
    "VISUAL_REVIEW_PLAN_BINDING_MISMATCH"
  );
  requireReview(
    review.chunk?.id === requestedChunkId &&
      review.chunk?.definitionFingerprint ===
        chunk.definitionFingerprint,
    "VISUAL_REVIEW_CHUNK_BINDING_MISMATCH"
  );
  requireReview(
    review.pendingCapture?.attemptId === pendingCapture.attempt?.id,
    "VISUAL_REVIEW_ATTEMPT_BINDING_MISMATCH"
  );
  for (const kind of requiredArtifactKinds) {
    requireReview(
      review.pendingCapture?.artifacts?.[kind] ===
        pendingCapture.artifacts[kind].sha256,
      `VISUAL_REVIEW_${kind.toUpperCase()}_HASH_MISMATCH`
    );
  }
  for (const check of [
    "requestedAreaLegible",
    "declaredFixtureLayoutVisible",
    "noUnexpectedBlankFailedBridgeOrPlaceholderTiles",
    "cameraFramingAccepted"
  ]) {
    requireReview(
      review.checks?.[check] === true,
      `VISUAL_REVIEW_${check.replace(/([A-Z])/gu, "_$1").toUpperCase()}_FALSE`
    );
  }
  if (reviewErrors.length > 0) {
    throw new Error(
      `Independent visual review is not acceptable: ${reviewErrors.join(", ")}.`
    );
  }

  const expectedCapturedPrefix = manifest.chunks
    .slice(0, nextIndex)
    .map((candidate) => candidate.id);
  if (
    !Array.isArray(checkpoint.capturedChunkIds) ||
    checkpoint.capturedChunkIds.length !== expectedCapturedPrefix.length ||
    !checkpoint.capturedChunkIds.every(
      (chunkId, index) => chunkId === expectedCapturedPrefix[index]
    )
  ) {
    throw new Error(
      "Checkpoint changed while the staged capture awaited review."
    );
  }
  const visualReviewSha256 = fileSha256(visualReviewPath);
  const acceptedAt = new Date().toISOString();
  const nextChunkIndex = nextIndex + 1;
  const {
    pendingCapture: ignoredPendingCapture,
    ...checkpointWithoutPendingCapture
  } = checkpoint;
  void ignoredPendingCapture;
  const nextCheckpoint = {
    ...checkpointWithoutPendingCapture,
    nextChunkIndex,
    capturedChunkIds: [...expectedCapturedPrefix, requestedChunkId],
    complete: nextChunkIndex >= manifest.chunks.length,
    acceptedVisualReviews: [
      ...(Array.isArray(checkpoint.acceptedVisualReviews)
        ? checkpoint.acceptedVisualReviews
        : []),
      {
        chunkId: requestedChunkId,
        attemptId: pendingCapture.attempt.id,
        visualReviewPath,
        visualReviewSha256,
        reviewerIdentity: review.reviewerIdentity.trim(),
        reviewedAt: review.reviewedAt,
        acceptedAt,
        runtimeBuildBinding: manifest.runtimeBuildBinding,
        artifactSha256: Object.fromEntries(
          requiredArtifactKinds.map((kind) => [
            kind,
            pendingCapture.artifacts[kind].sha256
          ])
        )
      }
    ],
    updatedAt: acceptedAt
  };
  writeJsonAtomic(paths.checkpoint, nextCheckpoint);
  writeJsonAtomic(paths.heartbeat, {
    schema: "aurora-tile-add-connect-matrix-heartbeat/v2",
    phase: nextCheckpoint.complete ? "add_render_complete" : "captured",
    updatedAt: acceptedAt,
    planBinding: {
      planId,
      outDirectory,
      manifestSchema: manifest.schema,
      contractRevision: manifest.contract?.revision ?? null,
      contractFingerprint: manifest.contract?.fingerprint ?? null,
      runtimeBuildBinding: manifest.runtimeBuildBinding
    },
    manifestSha256: planId,
    chunk: summarizeChunk(chunk),
    proofScope: "add_render",
    artifact: pendingCapture.artifacts,
    independentVisualReview: {
      path: visualReviewPath,
      sha256: visualReviewSha256,
      reviewerIdentity: review.reviewerIdentity.trim(),
      reviewedAt: review.reviewedAt,
      auroraToolsetProveContractVersion:
        review.auroraToolsetProveContractVersion
    },
    checkpoint: {
      nextChunkIndex,
      totalChunks: manifest.chunks.length
    },
    previousHeartbeatPhase: heartbeat?.phase ?? null
  });
  return print({
    schema: "aurora-tile-add-connect-matrix-capture-acceptance/v1",
    accepted: true,
    status: nextCheckpoint.complete ? "add_render_complete" : "captured",
    proofScope: "add_render",
    pathConnectAccepted: false,
    planBinding: {
      planId,
      outDirectory,
      manifestSchema: manifest.schema,
      contractRevision: manifest.contract?.revision ?? null,
      contractFingerprint: manifest.contract?.fingerprint ?? null,
      runtimeBuildBinding: manifest.runtimeBuildBinding
    },
    chunk: summarizeChunk(chunk),
    attemptId: pendingCapture.attempt.id,
    visualReview: {
      path: visualReviewPath,
      sha256: visualReviewSha256
    },
    checkpoint: {
      nextChunkIndex,
      capturedChunkCount: nextCheckpoint.capturedChunkIds.length,
      complete: nextCheckpoint.complete
    }
  });
}

function rejectCapture(args, outDirectory) {
  const requestedPlanId = requireSha256Arg(args, "plan-id");
  const requestedChunkId = requireStringArg(args, "chunk-id");
  const visualReviewPath = resolvePath(
    requireStringArg(args, "visual-review"),
    path.join(outDirectory, "__missing_visual_review__")
  );
  const paths = outputPaths(outDirectory);
  if (!isPathInside(paths.capturesDirectory, visualReviewPath)) {
    throw new Error(
      "The independent visual review must be a regular file inside the plan captures directory."
    );
  }
  if (
    !fs.existsSync(visualReviewPath) ||
    !fs.statSync(visualReviewPath).isFile()
  ) {
    throw new Error(
      `Independent visual review is missing: ${visualReviewPath}`
    );
  }
  const review = readJsonIfPresent(visualReviewPath);
  if (!review) {
    throw new Error("Independent visual review is not valid JSON.");
  }

  const plan = inspectPersistedPlan(outDirectory, {
    ...args,
    "plan-id": requestedPlanId
  });
  if (plan.validation.status !== "ready") {
    throw new Error(
      `Capture rejection requires an exact ready plan: ${plan.validation.errors.join(", ")}.`
    );
  }
  const { manifest, checkpoint, heartbeat, planId } = plan;
  const pendingCapture = checkpoint?.pendingCapture;
  if (!pendingCapture) {
    throw new Error(
      "No staged capture is awaiting independent visual review."
    );
  }
  const nextIndex = Number(checkpoint.nextChunkIndex);
  const chunk = manifest?.chunks?.[nextIndex];
  if (
    planId !== requestedPlanId ||
    !chunk ||
    chunk.id !== requestedChunkId ||
    pendingCapture.schema !== MATRIX_PENDING_CAPTURE_SCHEMA ||
    pendingCapture.planBinding?.planId !== planId ||
    pendingCapture.planBinding?.manifestSchema !== manifest.schema ||
    pendingCapture.planBinding?.contractRevision !==
      manifest.contract?.revision ||
    pendingCapture.planBinding?.contractFingerprint !==
      manifest.contract?.fingerprint ||
    !sameJson(
      pendingCapture.planBinding?.runtimeBuildBinding,
      manifest.runtimeBuildBinding
    ) ||
    !sameJson(
      pendingCapture.runtimeBuildBinding,
      manifest.runtimeBuildBinding
    ) ||
    pendingCapture.chunk?.id !== requestedChunkId ||
    pendingCapture.chunk?.nextChunkIndex !== nextIndex ||
    pendingCapture.chunk?.definitionFingerprint !==
      chunk.definitionFingerprint
  ) {
    throw new Error(
      "The pending capture is not bound to the exact current plan chunk."
    );
  }

  const requiredArtifactKinds = [
    "frame",
    "state",
    "canvas",
    "page",
    "lifecycle"
  ];
  for (const kind of requiredArtifactKinds) {
    const artifact = pendingCapture.artifacts?.[kind];
    const artifactPath =
      typeof artifact?.path === "string"
        ? path.resolve(artifact.path)
        : "";
    const sha256 = String(artifact?.sha256 ?? "").toLowerCase();
    if (
      !artifactPath ||
      !isPathInside(paths.capturesDirectory, artifactPath) ||
      !SHA256_PATTERN.test(sha256)
    ) {
      throw new Error(
        `Pending capture artifact ${kind} is not hash-bound inside the plan.`
      );
    }
    assertFileSha256(
      artifactPath,
      sha256,
      `Pending capture ${kind} artifact`
    );
    if (
      Number.isInteger(artifact.bytes) &&
      fs.statSync(artifactPath).size !== artifact.bytes
    ) {
      throw new Error(
        `Pending capture ${kind} artifact byte count changed before review.`
      );
    }
  }

  const reviewErrors = [];
  const requireReview = (condition, code) => {
    if (!condition) reviewErrors.push(code);
  };
  requireReview(
    review.schema === MATRIX_VISUAL_REVIEW_SCHEMA,
    "VISUAL_REVIEW_SCHEMA_MISMATCH"
  );
  requireReview(
    review.verdict === "rejected",
    "VISUAL_REVIEW_VERDICT_NOT_REJECTED"
  );
  requireReview(
    typeof review.reviewerIdentity === "string" &&
      review.reviewerIdentity.trim().length > 0,
    "VISUAL_REVIEWER_IDENTITY_MISSING"
  );
  requireReview(
    typeof review.reviewedAt === "string" &&
      Number.isFinite(Date.parse(review.reviewedAt)),
    "VISUAL_REVIEW_TIMESTAMP_INVALID"
  );
  requireReview(
    review.auroraToolsetProveContractVersion ===
      AURORA_TOOLSET_PROVE_CONTRACT_VERSION,
    "VISUAL_REVIEW_SKILL_CONTRACT_MISMATCH"
  );
  requireReview(
    review.planBinding?.planId === planId &&
      review.planBinding?.manifestSchema === manifest.schema &&
      review.planBinding?.contractRevision ===
        manifest.contract?.revision &&
      review.planBinding?.contractFingerprint ===
        manifest.contract?.fingerprint &&
      sameJson(
        review.planBinding?.runtimeBuildBinding,
        manifest.runtimeBuildBinding
      ) &&
      sameJson(review.runtimeBuildBinding, manifest.runtimeBuildBinding),
    "VISUAL_REVIEW_PLAN_BINDING_MISMATCH"
  );
  requireReview(
    review.chunk?.id === requestedChunkId &&
      review.chunk?.definitionFingerprint ===
        chunk.definitionFingerprint,
    "VISUAL_REVIEW_CHUNK_BINDING_MISMATCH"
  );
  requireReview(
    review.pendingCapture?.attemptId === pendingCapture.attempt?.id,
    "VISUAL_REVIEW_ATTEMPT_BINDING_MISMATCH"
  );
  for (const kind of requiredArtifactKinds) {
    requireReview(
      review.pendingCapture?.artifacts?.[kind] ===
        pendingCapture.artifacts[kind].sha256,
      `VISUAL_REVIEW_${kind.toUpperCase()}_HASH_MISMATCH`
    );
  }
  requireReview(
    Array.isArray(review.rejectionCodes) &&
      review.rejectionCodes.length > 0 &&
      review.rejectionCodes.every(
        (code) => typeof code === "string" && code.trim().length > 0
      ),
    "VISUAL_REVIEW_REJECTION_CODES_MISSING"
  );
  requireReview(
    [
      "requestedAreaLegible",
      "declaredFixtureLayoutVisible",
      "noUnexpectedBlankFailedBridgeOrPlaceholderTiles",
      "cameraFramingAccepted"
    ].some((check) => review.checks?.[check] === false),
    "VISUAL_REVIEW_REJECTED_CHECK_MISSING"
  );
  if (reviewErrors.length > 0) {
    throw new Error(
      `Independent visual rejection is not acceptable: ${reviewErrors.join(", ")}.`
    );
  }

  const expectedCapturedPrefix = manifest.chunks
    .slice(0, nextIndex)
    .map((candidate) => candidate.id);
  if (
    !Array.isArray(checkpoint.capturedChunkIds) ||
    checkpoint.capturedChunkIds.length !== expectedCapturedPrefix.length ||
    !checkpoint.capturedChunkIds.every(
      (chunkId, index) => chunkId === expectedCapturedPrefix[index]
    )
  ) {
    throw new Error(
      "Checkpoint changed while the staged capture awaited review."
    );
  }

  const visualReviewSha256 = fileSha256(visualReviewPath);
  const rejectedAt = new Date().toISOString();
  const {
    pendingCapture: ignoredPendingCapture,
    ...checkpointWithoutPendingCapture
  } = checkpoint;
  void ignoredPendingCapture;
  const nextCheckpoint = {
    ...checkpointWithoutPendingCapture,
    nextChunkIndex: nextIndex,
    capturedChunkIds: expectedCapturedPrefix,
    complete: false,
    rejectedVisualReviews: [
      ...(Array.isArray(checkpoint.rejectedVisualReviews)
        ? checkpoint.rejectedVisualReviews
        : []),
      {
        chunkId: requestedChunkId,
        attemptId: pendingCapture.attempt.id,
        visualReviewPath,
        visualReviewSha256,
        reviewerIdentity: review.reviewerIdentity.trim(),
        reviewedAt: review.reviewedAt,
        rejectedAt,
        runtimeBuildBinding: manifest.runtimeBuildBinding,
        rejectionCodes: review.rejectionCodes.map((code) => code.trim()),
        artifactSha256: Object.fromEntries(
          requiredArtifactKinds.map((kind) => [
            kind,
            pendingCapture.artifacts[kind].sha256
          ])
        )
      }
    ],
    updatedAt: rejectedAt
  };
  writeJsonAtomic(paths.checkpoint, nextCheckpoint);
  writeJsonAtomic(paths.heartbeat, {
    schema: "aurora-tile-add-connect-matrix-heartbeat/v2",
    phase: "capture_rejected",
    updatedAt: rejectedAt,
    planBinding: {
      planId,
      outDirectory,
      manifestSchema: manifest.schema,
      contractRevision: manifest.contract?.revision ?? null,
      contractFingerprint: manifest.contract?.fingerprint ?? null,
      runtimeBuildBinding: manifest.runtimeBuildBinding
    },
    manifestSha256: planId,
    chunk: summarizeChunk(chunk),
    proofScope: "add_render",
    rejectedAttempt: {
      id: pendingCapture.attempt.id,
      visualReviewPath,
      visualReviewSha256,
      rejectionCodes: review.rejectionCodes.map((code) => code.trim()),
      artifacts: pendingCapture.artifacts
    },
    checkpoint: {
      nextChunkIndex: nextIndex,
      totalChunks: manifest.chunks.length
    },
    previousHeartbeatPhase: heartbeat?.phase ?? null,
    pathConnectAccepted: false
  });
  return print({
    schema: "aurora-tile-add-connect-matrix-capture-rejection/v1",
    accepted: false,
    status: "capture_rejected",
    proofScope: "add_render",
    pathConnectAccepted: false,
    planBinding: {
      planId,
      outDirectory,
      manifestSchema: manifest.schema,
      contractRevision: manifest.contract?.revision ?? null,
      contractFingerprint: manifest.contract?.fingerprint ?? null,
      runtimeBuildBinding: manifest.runtimeBuildBinding
    },
    chunk: summarizeChunk(chunk),
    attemptId: pendingCapture.attempt.id,
    visualReview: {
      path: visualReviewPath,
      sha256: visualReviewSha256,
      rejectionCodes: review.rejectionCodes.map((code) => code.trim())
    },
    checkpoint: {
      nextChunkIndex: nextCheckpoint.nextChunkIndex,
      capturedChunkCount: nextCheckpoint.capturedChunkIds.length,
      complete: false
    }
  });
}

function recoverLastRejected(args, outDirectory) {
  const requestedPlanId = requireSha256Arg(args, "plan-id");
  const requestedChunkId = requireStringArg(args, "chunk-id");
  const expectedCheckpointSha256 = requireSha256Arg(
    args,
    "checkpoint-sha256"
  );
  const expectedHeartbeatSha256 = requireSha256Arg(args, "heartbeat-sha256");
  const expectedChunkSha256 = requireSha256Arg(args, "chunk-sha256");
  const blockerPath = resolvePath(
    requireStringArg(args, "blocker"),
    path.join(outDirectory, "__missing_blocker__")
  );
  const expectedBlockerSha256 = requireSha256Arg(args, "blocker-sha256");
  const paths = outputPaths(outDirectory);

  if (!isPathInside(paths.capturesDirectory, blockerPath)) {
    throw new Error(
      "The visual blocker must be a regular file inside the plan captures directory."
    );
  }
  assertFileSha256(
    blockerPath,
    expectedBlockerSha256,
    "Visual blocker"
  );
  const blocker = readJsonIfPresent(blockerPath);
  if (!blocker) {
    throw new Error("The visual blocker is not valid JSON.");
  }

  const recoveryBinding = {
    planId: requestedPlanId,
    chunkId: requestedChunkId,
    checkpointSha256: expectedCheckpointSha256,
    heartbeatSha256: expectedHeartbeatSha256,
    chunkSha256: expectedChunkSha256,
    blockerSha256: expectedBlockerSha256
  };
  const recoveryId = createHash("sha256")
    .update(JSON.stringify(recoveryBinding))
    .digest("hex");
  const archiveDirectory = path.join(
    paths.capturesDirectory,
    "rejected",
    requestedChunkId,
    recoveryId
  );
  const recoveryRecordPath = path.join(
    archiveDirectory,
    "recovery-record.json"
  );

  const plan = inspectPersistedPlan(outDirectory, {
    ...args,
    "plan-id": requestedPlanId
  });
  if (plan.validation.status !== "ready") {
    throw new Error(
      `Recovery requires an exact ready plan: ${plan.validation.errors.join(", ")}.`
    );
  }
  const { manifest, checkpoint, heartbeat, planId } = plan;
  if (planId !== requestedPlanId) {
    throw new Error("Recovery plan ID does not match the immutable manifest.");
  }
  const chunks = Array.isArray(manifest?.chunks) ? manifest.chunks : [];
  const requestedChunkIndex = chunks.findIndex(
    (chunk) => chunk?.id === requestedChunkId
  );
  if (requestedChunkIndex < 0) {
    throw new Error("Recovery chunk is not present in the immutable manifest.");
  }
  const requestedChunk = chunks[requestedChunkIndex];
  const requestedChunkPath = chunkPath(outDirectory, requestedChunkId);
  assertFileSha256(
    requestedChunkPath,
    expectedChunkSha256,
    "Persisted chunk definition"
  );

  const existingRecoveryRecord = readJsonIfPresent(recoveryRecordPath);
  if (existingRecoveryRecord) {
    const bindingMatches =
      existingRecoveryRecord.schema ===
        MATRIX_LAST_CHUNK_RECOVERY_RECORD_SCHEMA &&
      existingRecoveryRecord.recoveryId === recoveryId &&
      JSON.stringify(existingRecoveryRecord.binding) ===
        JSON.stringify(recoveryBinding);
    const historyEntry = Array.isArray(checkpoint?.recoveryHistory)
      ? checkpoint.recoveryHistory.find(
          (entry) => entry?.recoveryId === recoveryId
        )
      : null;
    const recoveredStateMatches =
      Number(checkpoint?.nextChunkIndex) === requestedChunkIndex &&
      Array.isArray(checkpoint?.capturedChunkIds) &&
      checkpoint.capturedChunkIds.length === requestedChunkIndex &&
      checkpoint.capturedChunkIds.every(
        (chunkId, index) => chunkId === chunks[index]?.id
      ) &&
      historyEntry &&
      sameResolvedPath(historyEntry.recoveryRecordPath, recoveryRecordPath);
    if (!bindingMatches || !recoveredStateMatches) {
      throw new Error(
        "A recovery record exists, but it does not bind the current recovered checkpoint."
      );
    }
    assertFileSha256(
      path.join(archiveDirectory, "checkpoint.before.json"),
      expectedCheckpointSha256,
      "Archived pre-recovery checkpoint"
    );
    assertFileSha256(
      path.join(archiveDirectory, "heartbeat.before.json"),
      expectedHeartbeatSha256,
      "Archived pre-recovery heartbeat"
    );
    return print({
      schema: MATRIX_LAST_CHUNK_RECOVERY_SCHEMA,
      status: "already_recovered",
      applied: false,
      recoveryId,
      planId,
      chunkId: requestedChunkId,
      archiveDirectory,
      recoveryRecordPath,
      checkpoint: {
        nextChunkIndex: checkpoint.nextChunkIndex,
        capturedChunkCount: checkpoint.capturedChunkIds.length,
        complete: checkpoint.complete === true
      },
      pathConnectAccepted: false
    });
  }

  assertFileSha256(
    paths.checkpoint,
    expectedCheckpointSha256,
    "Checkpoint"
  );
  assertFileSha256(paths.heartbeat, expectedHeartbeatSha256, "Heartbeat");
  if (checkpoint?.pendingCapture != null) {
    throw new Error(
      "Recovery is forbidden while checkpoint.pendingCapture is present."
    );
  }
  const rawNextChunkIndex = Number(checkpoint?.nextChunkIndex);
  if (
    !Number.isInteger(rawNextChunkIndex) ||
    rawNextChunkIndex < 1 ||
    rawNextChunkIndex - 1 !== requestedChunkIndex
  ) {
    throw new Error(
      "The rejected chunk must be exactly the final raw-controller checkpoint chunk."
    );
  }
  const expectedCapturedPrefix = chunks
    .slice(0, rawNextChunkIndex)
    .map((chunk) => chunk.id);
  if (
    !Array.isArray(checkpoint?.capturedChunkIds) ||
    checkpoint.capturedChunkIds.length !== expectedCapturedPrefix.length ||
    !checkpoint.capturedChunkIds.every(
      (chunkId, index) => chunkId === expectedCapturedPrefix[index]
    ) ||
    checkpoint.capturedChunkIds.at(-1) !== requestedChunkId
  ) {
    throw new Error(
      "The checkpoint captured chunk list is not the exact immutable manifest prefix."
    );
  }

  const expectedRowIds = matrixCaseRowIds(requestedChunk)
    .map(String)
    .sort((left, right) => left.localeCompare(right));
  const blockerRowIds = Array.isArray(blocker?.chunk?.rejectedRowIds)
    ? blocker.chunk.rejectedRowIds
        .map(String)
        .sort((left, right) => left.localeCompare(right))
    : [];
  const effectiveCheckpoint =
    blocker?.checkpointDisposition?.effectiveAcceptedProofCheckpoint;
  const rawControllerCheckpoint =
    blocker?.checkpointDisposition?.rawControllerCheckpoint;
  const expectedLastAcceptedChunkId =
    requestedChunkIndex > 0 ? chunks[requestedChunkIndex - 1]?.id ?? null : null;
  const blockerErrors = [];
  const requireBlocker = (condition, code) => {
    if (!condition) blockerErrors.push(code);
  };
  requireBlocker(
    blocker.schema === MATRIX_VISUAL_BLOCKER_SCHEMA,
    "BLOCKER_SCHEMA_MISMATCH"
  );
  requireBlocker(blocker.status === "rejected", "BLOCKER_STATUS_NOT_REJECTED");
  requireBlocker(
    blocker.proofCompleteness === "failed",
    "BLOCKER_PROOF_COMPLETENESS_NOT_FAILED"
  );
  requireBlocker(
    Array.isArray(blocker.rejectionCodes) &&
      blocker.rejectionCodes.includes(
        "INDEPENDENT_VISUAL_FRAMING_REJECTED"
      ),
    "BLOCKER_VISUAL_REJECTION_CODE_MISSING"
  );
  requireBlocker(
    blocker.planBinding?.planId === planId &&
      blocker.planBinding?.manifestSha256 === planId &&
      blocker.planBinding?.manifestSchema === manifest.schema &&
      blocker.planBinding?.contractRevision ===
        manifest.contract?.revision &&
      blocker.planBinding?.contractFingerprint ===
        manifest.contract?.fingerprint &&
      sameResolvedPath(blocker.planBinding?.planDirectory, outDirectory),
    "BLOCKER_PLAN_BINDING_MISMATCH"
  );
  requireBlocker(
    blocker.chunk?.id === requestedChunkId &&
      blocker.chunk?.kind === requestedChunk.kind &&
      blocker.chunk?.tilesetResRef === requestedChunk.tilesetResRef &&
      blocker.chunk?.definitionFingerprint ===
        requestedChunk.definitionFingerprint &&
      sameResolvedPath(
        blocker.chunk?.definitionPath,
        requestedChunkPath
      ),
    "BLOCKER_CHUNK_BINDING_MISMATCH"
  );
  requireBlocker(
    blockerRowIds.length === expectedRowIds.length &&
      blockerRowIds.every(
        (rowId, index) => rowId === expectedRowIds[index]
      ),
    "BLOCKER_ROW_BINDING_MISMATCH"
  );
  requireBlocker(
    Number(rawControllerCheckpoint?.nextChunkIndex) === rawNextChunkIndex &&
      Number(rawControllerCheckpoint?.capturedChunkCount) ===
        rawNextChunkIndex,
    "BLOCKER_RAW_CHECKPOINT_MISMATCH"
  );
  requireBlocker(
    Number(effectiveCheckpoint?.nextChunkIndex) === requestedChunkIndex &&
      Number(effectiveCheckpoint?.acceptedChunkCount) ===
        requestedChunkIndex &&
      (effectiveCheckpoint?.lastAcceptedChunkId ?? null) ===
        expectedLastAcceptedChunkId,
    "BLOCKER_EFFECTIVE_CHECKPOINT_MISMATCH"
  );
  requireBlocker(
    Number(blocker.pathConnect?.accepted) === 0 &&
      blocker.pathConnect?.status === "missing",
    "BLOCKER_PATH_CONNECT_STATE_MISMATCH"
  );
  if (blockerErrors.length > 0) {
    throw new Error(
      `Visual blocker is not recovery-safe: ${blockerErrors.join(", ")}.`
    );
  }

  if (
    heartbeat?.phase !== "captured" ||
    heartbeat?.planBinding?.planId !== planId ||
    heartbeat?.manifestSha256 !== planId ||
    heartbeat?.chunk?.id !== requestedChunkId ||
    Number(heartbeat?.checkpoint?.nextChunkIndex) !== rawNextChunkIndex
  ) {
    throw new Error(
      "Heartbeat is not the exact captured state for the rejected final chunk."
    );
  }

  const requiredArtifactKinds = [
    "frame",
    "state",
    "canvas",
    "page",
    "lifecycle"
  ];
  const artifacts = {};
  for (const kind of requiredArtifactKinds) {
    const artifact = blocker.artifacts?.[kind];
    const artifactPath =
      typeof artifact?.path === "string"
        ? path.resolve(artifact.path)
        : "";
    const artifactSha256 = String(artifact?.sha256 ?? "").toLowerCase();
    if (
      !artifactPath ||
      !isPathInside(paths.capturesDirectory, artifactPath) ||
      !SHA256_PATTERN.test(artifactSha256)
    ) {
      throw new Error(
        `Visual blocker artifact ${kind} is missing an in-plan path or exact SHA-256.`
      );
    }
    assertFileSha256(
      artifactPath,
      artifactSha256,
      `Rejected ${kind} artifact`
    );
    if (
      Number.isInteger(artifact.bytes) &&
      fs.statSync(artifactPath).size !== artifact.bytes
    ) {
      throw new Error(
        `Rejected ${kind} artifact byte count no longer matches the blocker.`
      );
    }
    artifacts[kind] = {
      path: artifactPath,
      sha256: artifactSha256,
      bytes: fs.statSync(artifactPath).size
    };
  }

  const preview = {
    schema: MATRIX_LAST_CHUNK_RECOVERY_SCHEMA,
    status: "ready",
    applied: false,
    recoveryId,
    planId,
    chunkId: requestedChunkId,
    archiveDirectory,
    recoveryRecordPath,
    transition: {
      fromNextChunkIndex: rawNextChunkIndex,
      toNextChunkIndex: requestedChunkIndex,
      fromCapturedChunkCount: rawNextChunkIndex,
      toCapturedChunkCount: requestedChunkIndex
    },
    pathConnectAccepted: false
  };
  if (args.execute !== true) {
    return print(preview);
  }

  fs.mkdirSync(archiveDirectory, { recursive: true });
  const archivedArtifacts = {};
  for (const [kind, artifact] of Object.entries(artifacts)) {
    const archivedPath = path.join(
      archiveDirectory,
      path.basename(artifact.path)
    );
    fs.copyFileSync(artifact.path, archivedPath);
    assertFileSha256(
      archivedPath,
      artifact.sha256,
      `Archived rejected ${kind} artifact`
    );
    archivedArtifacts[kind] = {
      ...artifact,
      archivedPath
    };
  }
  const archivedBlockerPath = path.join(
    archiveDirectory,
    path.basename(blockerPath)
  );
  const archivedChunkPath = path.join(
    archiveDirectory,
    path.basename(requestedChunkPath)
  );
  const archivedCheckpointPath = path.join(
    archiveDirectory,
    "checkpoint.before.json"
  );
  const archivedHeartbeatPath = path.join(
    archiveDirectory,
    "heartbeat.before.json"
  );
  for (const [sourcePath, archivedPath, sha256, label] of [
    [
      blockerPath,
      archivedBlockerPath,
      expectedBlockerSha256,
      "Archived visual blocker"
    ],
    [
      requestedChunkPath,
      archivedChunkPath,
      expectedChunkSha256,
      "Archived chunk definition"
    ],
    [
      paths.checkpoint,
      archivedCheckpointPath,
      expectedCheckpointSha256,
      "Archived pre-recovery checkpoint"
    ],
    [
      paths.heartbeat,
      archivedHeartbeatPath,
      expectedHeartbeatSha256,
      "Archived pre-recovery heartbeat"
    ]
  ]) {
    fs.copyFileSync(sourcePath, archivedPath);
    assertFileSha256(archivedPath, sha256, label);
  }

  const recoveredAt = new Date().toISOString();
  const recoveryRecord = {
    schema: MATRIX_LAST_CHUNK_RECOVERY_RECORD_SCHEMA,
    recoveryId,
    recoveredAt,
    binding: recoveryBinding,
    planBinding: {
      planId,
      planDirectory: outDirectory,
      manifestSchema: manifest.schema,
      contractRevision: manifest.contract?.revision ?? null,
      contractFingerprint: manifest.contract?.fingerprint ?? null,
      runtimeBuildBinding: manifest.runtimeBuildBinding
    },
    chunk: summarizeChunk(requestedChunk),
    preState: {
      checkpointSha256: expectedCheckpointSha256,
      heartbeatSha256: expectedHeartbeatSha256,
      nextChunkIndex: rawNextChunkIndex,
      capturedChunkIds: [...checkpoint.capturedChunkIds]
    },
    postState: {
      nextChunkIndex: requestedChunkIndex,
      capturedChunkIds: expectedCapturedPrefix.slice(
        0,
        requestedChunkIndex
      ),
      complete: false
    },
    archive: {
      directory: archiveDirectory,
      blockerPath: archivedBlockerPath,
      chunkPath: archivedChunkPath,
      checkpointPath: archivedCheckpointPath,
      heartbeatPath: archivedHeartbeatPath,
      artifacts: archivedArtifacts
    },
    pathConnect: {
      accepted: false,
      unchanged: true
    }
  };
  writeJsonAtomic(recoveryRecordPath, recoveryRecord);

  const nextCheckpoint = {
    ...checkpoint,
    nextChunkIndex: requestedChunkIndex,
    capturedChunkIds: expectedCapturedPrefix.slice(
      0,
      requestedChunkIndex
    ),
    complete: false,
    recoveryHistory: [
      ...(Array.isArray(checkpoint.recoveryHistory)
        ? checkpoint.recoveryHistory
        : []),
      {
        recoveryId,
        recoveryRecordPath,
        chunkId: requestedChunkId,
        recoveredAt,
        fromNextChunkIndex: rawNextChunkIndex,
        toNextChunkIndex: requestedChunkIndex
      }
    ],
    updatedAt: recoveredAt
  };
  writeJsonAtomic(paths.checkpoint, nextCheckpoint);
  writeJsonAtomic(paths.heartbeat, {
    schema: "aurora-tile-add-connect-matrix-heartbeat/v2",
    phase: "recovered_last_rejected",
    updatedAt: recoveredAt,
    planBinding: {
      planId,
      outDirectory,
      manifestSchema: manifest.schema,
      contractRevision: manifest.contract?.revision ?? null,
      contractFingerprint: manifest.contract?.fingerprint ?? null,
      runtimeBuildBinding: manifest.runtimeBuildBinding
    },
    manifestSha256: planId,
    chunk: summarizeChunk(requestedChunk),
    proofScope: "add_render",
    recovery: {
      recoveryId,
      recoveryRecordPath,
      rejectedChunkId: requestedChunkId
    },
    checkpoint: {
      nextChunkIndex: requestedChunkIndex,
      totalChunks: chunks.length
    }
  });
  return print({
    ...preview,
    status: "recovered",
    applied: true,
    checkpoint: {
      nextChunkIndex: nextCheckpoint.nextChunkIndex,
      capturedChunkCount: nextCheckpoint.capturedChunkIds.length,
      complete: nextCheckpoint.complete
    }
  });
}

function acceptPathConnect(args, outDirectory) {
  const requestedPlanId = typeof args["plan-id"] === "string" ? args["plan-id"].trim() : "";
  const rowId = typeof args["row-id"] === "string" ? args["row-id"].trim() : "";
  const proofPath = resolvePath(args.proof, null);
  const expectedProofSha256 = typeof args["proof-sha256"] === "string"
    ? args["proof-sha256"].trim().toLowerCase()
    : "";
  const replacementDirectory = resolvePath(args["replacement-directory"], null);
  if (!requestedPlanId || !SHA256_PATTERN.test(requestedPlanId)) {
    throw new Error("accept-path-connect requires --plan-id with the exact lowercase manifest SHA-256.");
  }
  if (!rowId) throw new Error("accept-path-connect requires --row-id.");
  if (!proofPath) throw new Error("accept-path-connect requires --proof.");
  if (!SHA256_PATTERN.test(expectedProofSha256)) {
    throw new Error("accept-path-connect requires --proof-sha256 with the exact lowercase proof SHA-256.");
  }
  if (!replacementDirectory) throw new Error("accept-path-connect requires --replacement-directory.");
  if (sameResolvedPath(outDirectory, replacementDirectory)) {
    throw new Error("PathConnect acceptance must create a distinct replacement plan directory.");
  }
  if (
    isPathInside(outDirectory, replacementDirectory) ||
    isPathInside(replacementDirectory, outDirectory)
  ) {
    throw new Error(
      "PathConnect source and replacement plan directories must not contain one another."
    );
  }
  if (fs.existsSync(replacementDirectory)) {
    throw new Error(`Replacement plan directory already exists: ${replacementDirectory}`);
  }

  const source = inspectPersistedPlan(outDirectory, args);
  if (source.validation.status !== "ready") {
    throw new Error(`Source matrix plan is not ready: ${source.validation.status}.`);
  }
  assertFileSha256(proofPath, expectedProofSha256, "PathConnect proof");
  const proof = readPlanArtifact(proofPath, "PATH_CONNECT_PROOF_INVALID_JSON");
  if (proof.error || !proof.value) throw new Error(proof.error ?? "PATH_CONNECT_PROOF_MISSING");
  const sourceRow = source.manifest.rows.find((row) => row?.id === rowId) ?? null;
  if (!sourceRow) throw new Error(`Matrix row does not exist: ${rowId}`);
  if (sourceRow.connect?.status !== "planned") throw new Error(`Matrix row is not connect-planned: ${rowId}`);
  if (sourceRow.pathConnect?.status !== "blocked") throw new Error(`Matrix row is not PathConnect-blocked: ${rowId}`);
  const proofErrors = validatePathConnectDifferentialProofForRow(proof.value, sourceRow);
  if (proofErrors.length > 0) throw new Error(`PathConnect proof is invalid: ${proofErrors.join(", ")}.`);

  const profilePath = path.resolve(proof.value.immutableToolsetNwnProfile.profilePath);
  const packetPath = path.resolve(proof.value.crossEdgeDifferential.artifactPath);
  assertFileSha256(
    profilePath,
    proof.value.immutableToolsetNwnProfile.profileSha256,
    "PathConnect immutable profile"
  );
  assertFileSha256(
    packetPath,
    proof.value.crossEdgeDifferential.artifactSha256,
    "PathConnect differential packet"
  );
  const profileArtifact = readPlanArtifact(profilePath, "PATH_CONNECT_PROFILE_INVALID_JSON");
  const packetArtifact = readPlanArtifact(packetPath, "PATH_CONNECT_PACKET_INVALID_JSON");
  if (profileArtifact.error || !profileArtifact.value) throw new Error(profileArtifact.error ?? "PATH_CONNECT_PROFILE_MISSING");
  if (packetArtifact.error || !packetArtifact.value) throw new Error(packetArtifact.error ?? "PATH_CONNECT_PACKET_MISSING");
  const profileErrors = validatePathConnectDifferentialProfile(profileArtifact.value, sourceRow);
  const packetErrors = validatePathConnectDifferentialPacket(
    packetArtifact.value,
    profileArtifact.value,
    proof.value.immutableToolsetNwnProfile.profileSha256
  );
  if (profileErrors.length > 0 || packetErrors.length > 0) {
    throw new Error(`PathConnect source artifacts are invalid: ${[...profileErrors, ...packetErrors].join(", ")}.`);
  }
  const normalizedPacket = structuredClone(packetArtifact.value);
  for (const kind of PATH_CONNECT_DIFFERENTIAL_ARTIFACT_KINDS) {
    const declared = packetArtifact.value.artifacts[kind];
    const artifactPath = path.isAbsolute(declared.path)
      ? path.resolve(declared.path)
      : path.resolve(path.dirname(packetPath), declared.path);
    normalizedPacket.artifacts[kind].path = artifactPath;
    assertFileSha256(artifactPath, declared.sha256, `PathConnect ${kind} artifact`);
    if (!sameJson(proof.value.artifacts[kind], normalizedPacket.artifacts[kind])) {
      throw new Error(`PathConnect proof artifact binding mismatch: ${kind}.`);
    }
  }
  const rebuiltProof = buildPathConnectDifferentialProof({
    profile: profileArtifact.value,
    profilePath,
    profileSha256: proof.value.immutableToolsetNwnProfile.profileSha256,
    packet: normalizedPacket,
    packetPath,
    packetSha256: proof.value.crossEdgeDifferential.artifactSha256
  });
  if (!sameJson(rebuiltProof, proof.value)) {
    throw new Error("PathConnect proof is not the exact central-validator envelope.");
  }

  const manifest = structuredClone(source.manifest);
  const acceptedRow = manifest.rows.find((row) => row?.id === rowId);
  acceptedRow.pathConnect = {
    ...acceptedRow.pathConnect,
    status: "accepted",
    proof: proof.value
  };
  manifest.summary.pathConnectAcceptedRows = manifest.rows.filter((row) => row.pathConnect?.status === "accepted").length;
  manifest.summary.pathConnectBlockedRows = manifest.rows.filter((row) => row.pathConnect?.status === "blocked").length;
  const manifestErrors = validateMatrixManifest(manifest);
  if (manifestErrors.length > 0) {
    throw new Error(`Accepted matrix manifest is invalid: ${manifestErrors.join(", ")}.`);
  }
  const nextPlanId = manifestHash(manifest);
  const acceptedAt = new Date().toISOString();
  const checkpoint = {
    ...structuredClone(source.checkpoint),
    planId: nextPlanId,
    planDirectory: replacementDirectory,
    manifestSha256: nextPlanId,
    updatedAt: acceptedAt
  };
  const summary = {
    ...structuredClone(source.summary),
    generatedAt: acceptedAt,
    planBinding: {
      planId: nextPlanId,
      outDirectory: replacementDirectory,
      manifestSchema: manifest.schema,
      contractRevision: manifest.contract?.revision ?? null,
      contractFingerprint: manifest.contract?.fingerprint ?? null,
      runtimeBuildBinding: manifest.runtimeBuildBinding
    },
    matrix: manifest.summary,
    validationErrors: []
  };
  const parentDirectory = path.dirname(replacementDirectory);
  fs.mkdirSync(parentDirectory, { recursive: true });
  const temporaryDirectory = path.join(
    parentDirectory,
    `.${path.basename(replacementDirectory)}.tmp-${process.pid}-${Date.now()}`
  );
  if (fs.existsSync(temporaryDirectory)) throw new Error(`Temporary replacement directory already exists: ${temporaryDirectory}`);
  fs.mkdirSync(temporaryDirectory, { recursive: false });
  try {
    writeJsonAtomic(path.join(temporaryDirectory, "manifest.json"), manifest);
    writeJsonAtomic(path.join(temporaryDirectory, "checkpoint.json"), checkpoint);
    writeJsonAtomic(path.join(temporaryDirectory, "summary.json"), summary);
    if (fs.existsSync(source.paths.chunksDirectory)) {
      fs.cpSync(source.paths.chunksDirectory, path.join(temporaryDirectory, "chunks"), { recursive: true, errorOnExist: true });
    }
    if (fs.existsSync(source.paths.capturesDirectory)) {
      fs.cpSync(source.paths.capturesDirectory, path.join(temporaryDirectory, "captures"), { recursive: true, errorOnExist: true });
    }
    writeJsonAtomic(path.join(temporaryDirectory, "path-connect-acceptance.json"), {
      schema: "aurora-tile-path-connect-matrix-acceptance/v1",
      acceptedAt,
      sourcePlanId: source.planId,
      planId: nextPlanId,
      rowId,
      runtimeBuildBinding: manifest.runtimeBuildBinding,
      proof: { path: proofPath, sha256: expectedProofSha256 },
      immutableProfile: { path: profilePath, sha256: proof.value.immutableToolsetNwnProfile.profileSha256 },
      differentialPacket: { path: packetPath, sha256: proof.value.crossEdgeDifferential.artifactSha256 }
    });
    fs.renameSync(temporaryDirectory, replacementDirectory);
  } catch (error) {
    if (fs.existsSync(temporaryDirectory)) fs.rmSync(temporaryDirectory, { recursive: true, force: true });
    throw error;
  }
  const persisted = inspectPersistedPlan(replacementDirectory, { "plan-id": nextPlanId });
  if (persisted.validation.status !== "ready") {
    throw new Error(`Persisted replacement plan failed validation: ${persisted.validation.errors.join(", ")}.`);
  }
  print({
    schema: "aurora-tile-path-connect-matrix-acceptance/v1",
    status: "accepted",
    sourcePlanId: source.planId,
    planId: nextPlanId,
    rowId,
    proof: { path: proofPath, sha256: expectedProofSha256 },
    replacementDirectory,
    pathConnectAcceptedRows: manifest.summary.pathConnectAcceptedRows,
    pathConnectBlockedRows: manifest.summary.pathConnectBlockedRows,
    nextAction: boundCommand("status", replacementDirectory, nextPlanId)
  });
}

function help() {
  process.stdout.write(
    "Usage: node backend/scripts/aurora-tile-add-connect-matrix.mjs <doctor|plan|plan-inventory|plan-catalog|status|next|capture|accept-capture|reject-capture|recover-last-rejected|accept-path-connect> [options]\n\n" +
    "All commands emit JSON. capture stages evidence without advancing; accept-capture and reject-capture require an exact independent visual review. recover-last-rejected is a hash-bound dry-run unless --execute is present.\n" +
    "Options: --base-url <url> --out-directory <path> --plan-id <sha256> --replaces-plan-id <sha256> --replace-plan --runtime-build-profile <path> --runtime-build-profile-sha256 <sha256> --verify-runtime-source --case-limit <1..512> --group-chunk-area-cell-limit <4..1024> --request-concurrency <1..16> --inventory <path> --inventory-sha256 <sha256> --catalog <path> --catalog-sha256 <sha256> --tileset-resref <resref> --source-key <logical-key> --source-sha256 <sha256> --include-cases --chunk-id <next-id> --runtime-wait-ms <1..600000> --visual-review <path> --checkpoint-sha256 <sha256> --heartbeat-sha256 <sha256> --chunk-sha256 <sha256> --blocker <path> --blocker-sha256 <sha256> --row-id <matrix-row-id> --proof <path> --proof-sha256 <sha256> --replacement-directory <path> --execute\n"
  );
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0] ?? "status";
  if (command === "help" || args.help === true) {
    help();
    return;
  }
  const outDirectory = resolvePath(args["out-directory"], null);
  if (!outDirectory) throw new Error("MATRIX_OUT_DIRECTORY_REQUIRED");
  if (command === "doctor") return doctor(args);
  if (command === "plan") return plan(args, outDirectory);
  if (command === "plan-inventory") return planInventory(args, outDirectory);
  if (command === "plan-catalog") return planCatalog(args, outDirectory);
  if (command === "status") return print(makeStatus(outDirectory, args));
  if (command === "next") return next(args, outDirectory);
  if (command === "capture") return capture(args, outDirectory);
  if (command === "accept-capture") {
    return acceptCapture(args, outDirectory);
  }
  if (command === "reject-capture") {
    return rejectCapture(args, outDirectory);
  }
  if (command === "recover-last-rejected") {
    return recoverLastRejected(args, outDirectory);
  }
  if (command === "accept-path-connect") {
    return acceptPathConnect(args, outDirectory);
  }
  throw new Error(`Unsupported command: ${command}.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    print({
      schema: "aurora-tile-add-connect-matrix-error/v1",
      error: { code: "TILE_ADD_CONNECT_MATRIX_FAILED", message: error instanceof Error ? error.message : String(error) }
    });
    process.exitCode = 1;
  });
}
