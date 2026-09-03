#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(scriptDirectory, "..");
const repoRoot = path.resolve(backendRoot, "..");
const matrixScriptPath = path.join(
  scriptDirectory,
  "aurora-tile-add-connect-matrix.mjs",
);
const activeBindingPath = path.join(
  backendRoot,
  "docs",
  "aurora-reverse",
  "proof-profiles",
  "tile-add-connect-active-plan.json",
);
const ACTIVE_BINDING_SCHEMA = "aurora-tile-add-connect-active-plan-binding/v1";
const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const ALLOWED_COMMANDS = new Set(["status", "next", "capture"]);

function isPathInside(parent, candidate) {
  const relative = path.relative(path.resolve(parent), path.resolve(candidate));
  return relative.length > 0 && !relative.startsWith("..") && !path.isAbsolute(relative);
}

function readJson(filePath, code) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    throw new Error(code);
  }
}

function sha256File(filePath) {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    const stream = fs.createReadStream(filePath);
    stream.once("error", reject);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.once("end", () => resolve(hash.digest("hex")));
  });
}

function assertRegularFile(filePath, code) {
  let stats;
  try {
    stats = fs.statSync(filePath);
  } catch {
    throw new Error(code);
  }
  if (!stats.isFile()) throw new Error(code);
}

export async function loadAndValidateActivePlanBinding() {
  const binding = readJson(activeBindingPath, "ACTIVE_MATRIX_BINDING_INVALID_JSON");
  if (binding.schema !== ACTIVE_BINDING_SCHEMA) {
    throw new Error("ACTIVE_MATRIX_BINDING_SCHEMA_UNSUPPORTED");
  }
  if (!SHA256_PATTERN.test(String(binding.planId ?? ""))) {
    throw new Error("ACTIVE_MATRIX_PLAN_ID_INVALID");
  }
  if (
    typeof binding.planDirectory !== "string" ||
    path.isAbsolute(binding.planDirectory)
  ) {
    throw new Error("ACTIVE_MATRIX_PLAN_DIRECTORY_INVALID");
  }
  const proofRoot = path.join(repoRoot, "output", "proof");
  const planDirectory = path.resolve(repoRoot, binding.planDirectory);
  if (!isPathInside(proofRoot, planDirectory)) {
    throw new Error("ACTIVE_MATRIX_PLAN_DIRECTORY_OUTSIDE_PROOF_ROOT");
  }
  const manifestPath = path.join(planDirectory, "manifest.json");
  const checkpointPath = path.join(planDirectory, "checkpoint.json");
  assertRegularFile(manifestPath, "ACTIVE_MATRIX_MANIFEST_MISSING");
  assertRegularFile(checkpointPath, "ACTIVE_MATRIX_CHECKPOINT_MISSING");
  if ((await sha256File(manifestPath)) !== binding.planId) {
    throw new Error("ACTIVE_MATRIX_MANIFEST_SHA256_MISMATCH");
  }

  const checkpoint = readJson(
    checkpointPath,
    "ACTIVE_MATRIX_CHECKPOINT_INVALID_JSON",
  );
  if (
    checkpoint.planId !== binding.planId ||
    checkpoint.manifestSha256 !== binding.planId
  ) {
    throw new Error("ACTIVE_MATRIX_CHECKPOINT_PLAN_BINDING_MISMATCH");
  }
  if (path.resolve(checkpoint.planDirectory ?? "") !== planDirectory) {
    throw new Error("ACTIVE_MATRIX_CHECKPOINT_DIRECTORY_MISMATCH");
  }

  const declaredProfile = binding.runtimeBuildProfile;
  if (
    typeof declaredProfile?.path !== "string" ||
    path.isAbsolute(declaredProfile.path) ||
    !SHA256_PATTERN.test(String(declaredProfile.sha256 ?? "")) ||
    typeof declaredProfile.profileId !== "string" ||
    declaredProfile.profileId.length === 0
  ) {
    throw new Error("ACTIVE_MATRIX_RUNTIME_BUILD_PROFILE_BINDING_INVALID");
  }
  const profilePath = path.resolve(repoRoot, declaredProfile.path);
  if (!isPathInside(backendRoot, profilePath)) {
    throw new Error("ACTIVE_MATRIX_RUNTIME_BUILD_PROFILE_OUTSIDE_BACKEND");
  }
  assertRegularFile(profilePath, "ACTIVE_MATRIX_RUNTIME_BUILD_PROFILE_MISSING");
  if ((await sha256File(profilePath)) !== declaredProfile.sha256) {
    throw new Error("ACTIVE_MATRIX_RUNTIME_BUILD_PROFILE_SHA256_MISMATCH");
  }
  const profile = readJson(
    profilePath,
    "ACTIVE_MATRIX_RUNTIME_BUILD_PROFILE_INVALID_JSON",
  );
  const checkpointProfile = checkpoint.runtimeBuildBinding?.profile;
  if (
    profile.profileId !== declaredProfile.profileId ||
    checkpointProfile?.profileId !== declaredProfile.profileId ||
    checkpointProfile?.sha256 !== declaredProfile.sha256 ||
    path.resolve(checkpointProfile?.path ?? "") !== profilePath
  ) {
    throw new Error("ACTIVE_MATRIX_RUNTIME_BUILD_PROFILE_IDENTITY_MISMATCH");
  }

  return {
    bindingPath: activeBindingPath,
    planDirectory,
    planId: binding.planId,
    checkpoint: {
      nextChunkIndex: checkpoint.nextChunkIndex,
      capturedChunkCount: checkpoint.capturedChunkIds?.length ?? null,
    },
  };
}

export function buildActiveMatrixChildArguments(
  command,
  active,
  forwardedArguments = [],
) {
  return [
    matrixScriptPath,
    command,
    "--out-directory",
    active.planDirectory,
    "--plan-id",
    active.planId,
    ...forwardedArguments,
    "--verify-runtime-source",
  ];
}

async function main(argv = process.argv.slice(2)) {
  const [command, ...forwardedArguments] = argv;
  if (!ALLOWED_COMMANDS.has(command)) {
    throw new Error("ACTIVE_MATRIX_COMMAND_UNSUPPORTED");
  }
  if (
    forwardedArguments.some(
      (argument) =>
        argument === "--out-directory" ||
        argument.startsWith("--out-directory=") ||
        argument === "--plan-id" ||
        argument.startsWith("--plan-id="),
    )
  ) {
    throw new Error("ACTIVE_MATRIX_CALLER_BINDING_OVERRIDE_FORBIDDEN");
  }

  const active = await loadAndValidateActivePlanBinding();
  const child = spawnSync(
    process.execPath,
    buildActiveMatrixChildArguments(command, active, forwardedArguments),
    {
      cwd: process.cwd(),
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
      windowsHide: true,
    },
  );
  if (child.stdout) process.stdout.write(child.stdout);
  if (child.stderr) process.stderr.write(child.stderr);
  if (child.error) throw child.error;
  process.exitCode = child.status ?? 1;
}

if (
  process.argv[1] &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
) {
  main().catch((error) => {
    process.stderr.write(
      `${JSON.stringify({
        schema: "aurora-tile-add-connect-active-plan-error/v1",
        status: "blocked",
        code: String(error?.message ?? error),
      })}\n`,
    );
    process.exitCode = 1;
  });
}
