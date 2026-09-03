#!/usr/bin/env node
import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  validateAreaTilePlaceholderDecompilationProfile
} from "./lib/area-tile-placeholder-decompilation-profile.mjs";
import {
  buildAreaTilePlaceholderDecompilationExecutionPlan,
  validateFreshAreaTilePlaceholderPacketRoot
} from "./lib/area-tile-placeholder-decompilation-run.mjs";

const repoRoot = path.resolve(import.meta.dirname, "../..");
let activeChild = null;
let executionPlan = null;
let packetCreated = false;
let interrupted = false;

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => {
    interrupted = true;
    if (activeChild?.pid) terminateOwnedProcessTree(activeChild.pid);
  });
}

try {
  const args = parseArgs(process.argv.slice(2));
  const profilePath = path.resolve(requireArg(args, "profile"));
  const expectedProfileSha256 = requireArg(args, "profile-sha256").toLowerCase();
  const preflightOut = path.resolve(requireArg(args, "preflight-out"));
  if (!/^[a-f0-9]{64}$/u.test(expectedProfileSha256)) throw new Error("profile_sha256_invalid");
  if (!fs.existsSync(profilePath) || !fs.lstatSync(profilePath).isFile()) {
    throw new Error("profile_missing");
  }
  const profileBytes = fs.readFileSync(profilePath);
  const observedProfileSha256 = sha256(profileBytes);
  if (observedProfileSha256 !== expectedProfileSha256) throw new Error("profile_sha256_mismatch");
  const profile = JSON.parse(profileBytes.toString("utf8").replace(/^\uFEFF/u, ""));
  rejectPreflightInsidePacketRoot(preflightOut, profile, repoRoot);
  const memory = readMemorySnapshot();
  const validation = validateAreaTilePlaceholderDecompilationProfile({
    profile,
    memory,
    repoRoot
  });
  const preflight = {
    schema: "aurora-area-tile-placeholder-decompilation-run-preflight/v1",
    checkedAt: new Date().toISOString(),
    profile: {
      path: profilePath,
      sha256: observedProfileSha256
    },
    ...validation
  };
  writeJsonNew(preflightOut, preflight);
  process.stdout.write(`${JSON.stringify(preflight, null, 2)}\n`);
  if (!validation.ok) {
    process.exitCode = 2;
  } else if (!validation.executionReady) {
    process.exitCode = 3;
  } else {
    executionPlan = buildAreaTilePlaceholderDecompilationExecutionPlan({
      profile,
      profilePath,
      profileSha256: observedProfileSha256,
      repoRoot
    });
    validateFreshAreaTilePlaceholderPacketRoot(executionPlan.packetRoot, repoRoot);
    stagePacket(executionPlan);
    packetCreated = true;

    await runStep({
      name: "restore_project",
      command: executionPlan.restore,
      cwd: repoRoot,
      stdoutPath: path.join(executionPlan.paths.runtimeDirectory, "project-restore.stdout.log"),
      stderrPath: path.join(executionPlan.paths.runtimeDirectory, "project-restore.stderr.log"),
      timeoutMs: 5 * 60 * 1000
    });
    await runStep({
      name: "ghidra",
      command: executionPlan.ghidra,
      cwd: executionPlan.ghidra.cwd,
      stdoutPath: path.join(executionPlan.paths.runtimeDirectory, "ghidra.stdout.log"),
      stderrPath: path.join(executionPlan.paths.runtimeDirectory, "ghidra.stderr.log"),
      timeoutMs: Math.max(15 * 60 * 1000, profile.targets.addresses.length * profile.targets.timeoutSeconds * 1000 + 5 * 60 * 1000)
    });

    const producerGeneratedAt = new Date().toISOString();
    await runStep({
      name: "lineage_producer",
      command: withGeneratedAt(executionPlan.producer, producerGeneratedAt),
      cwd: repoRoot,
      stdoutPath: path.join(executionPlan.paths.runtimeDirectory, "lineage-producer.stdout.log"),
      stderrPath: path.join(executionPlan.paths.runtimeDirectory, "lineage-producer.stderr.log"),
      timeoutMs: 2 * 60 * 1000
    });
    const validatorGeneratedAt = new Date().toISOString();
    await runStep({
      name: "lineage_validator",
      command: withGeneratedAt(executionPlan.validator, validatorGeneratedAt),
      cwd: repoRoot,
      stdoutPath: path.join(executionPlan.paths.runtimeDirectory, "lineage-validator.stdout.log"),
      stderrPath: path.join(executionPlan.paths.runtimeDirectory, "lineage-validator.stderr.log"),
      timeoutMs: 2 * 60 * 1000
    });

    const acceptance = inspectAcceptance(executionPlan, profile.targets.addresses);
    const result = {
      schema: "aurora-area-tile-placeholder-decompilation-execution-result/v1",
      completedAt: new Date().toISOString(),
      status: acceptance.ok
        ? "validated_lineage_selected_functions_decompiled_semantic_review_pending"
        : "blocked_lineage_acceptance_failed",
      ok: acceptance.ok,
      profileId: profile.profileId,
      profileSha256: observedProfileSha256,
      sessionId: executionPlan.sessionId,
      lineageValidated: acceptance.lineageValidated,
      selectedFunctionsDecompiled: acceptance.selectedFunctionsDecompiled,
      semanticVerdictPending: true,
      runtimeBehaviorChangesAllowed: false,
      diagnostics: acceptance.diagnostics,
      artifacts: {
        producerPacket: executionPlan.portablePaths.producerPacket,
        validatorResult: executionPlan.portablePaths.validatorResult,
        functionRecords: executionPlan.portablePaths.functionRecords,
        callGraph: executionPlan.portablePaths.callGraph,
        exportDirectory: executionPlan.portablePaths.exportDirectory
      }
    };
    writeJsonNew(executionPlan.paths.executionResult, result);
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    if (!result.ok) process.exitCode = 4;
  }
} catch (error) {
  const code = interrupted ? "execution_interrupted" : stableErrorCode(error);
  if (packetCreated && executionPlan && !fs.existsSync(executionPlan.paths.executionResult)) {
    writeJsonNew(executionPlan.paths.executionResult, {
      schema: "aurora-area-tile-placeholder-decompilation-execution-result/v1",
      completedAt: new Date().toISOString(),
      status: "blocked_execution_failure",
      ok: false,
      profileId: executionPlan.profileId,
      profileSha256: executionPlan.profileSha256,
      sessionId: executionPlan.sessionId,
      lineageValidated: false,
      selectedFunctionsDecompiled: false,
      semanticVerdictPending: true,
      runtimeBehaviorChangesAllowed: false,
      diagnostics: [{ code }]
    });
  }
  process.stderr.write(`${JSON.stringify({ status: "blocked_execution_failure", code }, null, 2)}\n`);
  process.exitCode = interrupted ? 130 : 2;
} finally {
  if (activeChild?.pid) terminateOwnedProcessTree(activeChild.pid);
}

function stagePacket(plan) {
  fs.mkdirSync(plan.packetRoot, { recursive: true });
  for (const directory of [
    plan.paths.generation,
    plan.paths.exportDirectory,
    plan.paths.runtimeDirectory,
    path.dirname(plan.paths.analyzerConfiguration)
  ]) {
    fs.mkdirSync(directory, { recursive: true });
  }
  for (const file of plan.stagedFiles) {
    fs.mkdirSync(path.dirname(file.destination), { recursive: true });
    fs.copyFileSync(file.source, file.destination, fs.constants.COPYFILE_EXCL);
    const stats = fs.lstatSync(file.destination);
    if (!stats.isFile() || stats.isSymbolicLink() || stats.size !== file.expectedBytes ||
        sha256File(file.destination) !== file.expectedSha256) {
      throw new Error(`staged_file_identity_mismatch:${file.role}`);
    }
  }
  writeJsonNew(plan.paths.analyzerConfiguration, plan.analyzerConfiguration);
  writeJsonNew(plan.paths.invocationRecord, plan.invocationRecord);
}

async function runStep({ name, command, cwd, stdoutPath, stderrPath, timeoutMs, shell = false }) {
  if (interrupted) throw new Error("execution_interrupted");
  const stdout = fs.openSync(stdoutPath, "wx");
  const stderr = fs.openSync(stderrPath, "wx");
  try {
    const result = await new Promise((resolve, reject) => {
      const child = spawn(command.executable, command.arguments, {
        cwd,
        env: { ...process.env, ...(command.environment ?? {}) },
        shell,
        windowsHide: true,
        stdio: ["ignore", stdout, stderr]
      });
      activeChild = child;
      let timedOut = false;
      const timer = setTimeout(() => {
        timedOut = true;
        terminateOwnedProcessTree(child.pid);
      }, timeoutMs);
      child.once("error", (error) => {
        clearTimeout(timer);
        reject(error);
      });
      child.once("exit", (status, signal) => {
        clearTimeout(timer);
        resolve({ status, signal, timedOut });
      });
    });
    activeChild = null;
    if (result.timedOut) throw new Error(`${name}_timeout`);
    if (result.status !== 0) throw new Error(`${name}_failed`);
  } finally {
    fs.closeSync(stdout);
    fs.closeSync(stderr);
  }
}

function inspectAcceptance(plan, targetAddresses) {
  const diagnostics = [];
  const validator = readJson(plan.paths.validatorResult, "validator_result_invalid");
  const lineageValidated = validator.lineageComplete === true &&
    validator.authoritativeDecompilationClaim === true &&
    validator.status === "validated_lineage_complete_coverage_incomplete";
  if (!lineageValidated) diagnostics.push({ code: "lineage_not_authoritative" });
  const records = fs.readFileSync(plan.paths.functionRecords, "utf8")
    .split(/\r?\n/u)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
  const recordsByAddress = new Map(records.map((record) => [record.address, record]));
  const failedTargets = targetAddresses.filter((address) =>
    recordsByAddress.get(address)?.decompileStatus !== "success"
  );
  const selectedFunctionsDecompiled = failedTargets.length === 0;
  for (const address of failedTargets) {
    diagnostics.push({ code: "selected_function_not_decompiled", subject: address });
  }
  return {
    ok: lineageValidated && selectedFunctionsDecompiled,
    lineageValidated,
    selectedFunctionsDecompiled,
    diagnostics
  };
}

function withGeneratedAt(command, generatedAt) {
  return {
    ...command,
    arguments: command.arguments.map((value) => value === "__GENERATED_AT__" ? generatedAt : value)
  };
}

function rejectPreflightInsidePacketRoot(preflightOut, profile, root) {
  if (typeof profile?.outputRoot !== "string" || !profile.outputRoot) return;
  const packetRoot = path.isAbsolute(profile.outputRoot)
    ? path.resolve(profile.outputRoot)
    : path.resolve(root, profile.outputRoot);
  const relative = path.relative(packetRoot, preflightOut);
  if (relative === "" || (relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative))) {
    throw new Error("preflight_output_inside_packet_root");
  }
}

function readMemorySnapshot() {
  if (process.platform !== "win32") {
    const free = os.freemem();
    return { freePhysicalBytes: free, freeVirtualBytes: free };
  }
  const command = [
    "$os = Get-CimInstance Win32_OperatingSystem",
    "[ordered]@{ freePhysicalBytes = [int64]$os.FreePhysicalMemory * 1KB; freeVirtualBytes = [int64]$os.FreeVirtualMemory * 1KB } | ConvertTo-Json -Compress"
  ].join("; ");
  const result = spawnSync(
    "powershell.exe",
    ["-NoProfile", "-NonInteractive", "-Command", command],
    { encoding: "utf8", windowsHide: true }
  );
  if (result.status !== 0) throw new Error("memory_snapshot_failed");
  const parsed = JSON.parse(result.stdout);
  return {
    freePhysicalBytes: Number(parsed.freePhysicalBytes),
    freeVirtualBytes: Number(parsed.freeVirtualBytes)
  };
}

function terminateOwnedProcessTree(pid) {
  if (!Number.isInteger(pid) || pid < 1) return;
  if (process.platform === "win32") {
    spawnSync("taskkill.exe", ["/PID", String(pid), "/T", "/F"], {
      windowsHide: true,
      stdio: "ignore"
    });
  } else {
    try {
      process.kill(pid, "SIGKILL");
    } catch {
      // The owned process already exited.
    }
  }
  activeChild = null;
}

function parseArgs(argv) {
  const result = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    const token = argv[index];
    const value = argv[index + 1];
    if (!token?.startsWith("--") || !value || value.startsWith("--") || result.has(token.slice(2))) {
      throw new Error("cli_arguments_invalid");
    }
    result.set(token.slice(2), value);
  }
  if ([...result.keys()].some((key) => !["profile", "profile-sha256", "preflight-out"].includes(key))) {
    throw new Error("cli_argument_unknown");
  }
  return result;
}

function requireArg(args, name) {
  const value = args.get(name)?.trim();
  if (!value) throw new Error(`cli_argument_missing:${name}`);
  return value;
}

function readJson(filePath, code) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/u, ""));
  } catch {
    throw new Error(code);
  }
}

function writeJsonNew(filePath, value) {
  if (fs.existsSync(filePath)) throw new Error("output_already_exists");
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, { flag: "wx" });
}

function stableErrorCode(error) {
  const value = error instanceof Error ? error.message : String(error);
  const code = value.split(":", 1)[0];
  return /^[a-z0-9_]+$/u.test(code) ? code : "execution_failed";
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function sha256File(filePath) {
  const hash = createHash("sha256");
  const buffer = Buffer.allocUnsafe(64 * 1024);
  const descriptor = fs.openSync(filePath, "r");
  try {
    let bytesRead;
    do {
      bytesRead = fs.readSync(descriptor, buffer, 0, buffer.length, null);
      if (bytesRead > 0) hash.update(buffer.subarray(0, bytesRead));
    } while (bytesRead > 0);
  } finally {
    fs.closeSync(descriptor);
  }
  return hash.digest("hex");
}
