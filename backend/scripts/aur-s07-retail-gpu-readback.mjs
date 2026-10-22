#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import {
  assessRetailGpuReadbackAdmission,
  buildRetailGpuReadbackContextDiscoveryPlan,
} from "./lib/aur-s07-retail-gpu-readback-admission.mjs";

try {
  const [command, ...rawArgs] = process.argv.slice(2);
  const options = parseArgs(rawArgs);
  const profilePath = requiredPath(options.profile, "--profile");
  const outPath = requiredPath(options.out, "--out");
  if (profilePath === outPath) throw new Error("retail_gpu_readback_output_overlaps_profile");

  const profileBytes = readFileSync(profilePath);
  const profileSha256 = createHash("sha256").update(profileBytes).digest("hex");
  const profile = JSON.parse(profileBytes.toString("utf8"));
  if (command === "doctor") {
    const admission = assessRetailGpuReadbackAdmission(profile);
    const manifest = {
      version: "aur-s07-retail-gpu-readback-handoff/v1",
      createdAtUtc: new Date().toISOString(),
      profilePath,
      profileSha256,
      profileId: profile.id,
      admission,
      nextAction: admission.status === "offline-admitted"
        ? "live-tool-and-context-qualification-required"
        : "resolve-offline-admission-blockers",
      publicContextDiscoveryOperation: "plan-context-discovery",
      safety: noExecutionSafety(),
    };
    writeNewJson(outPath, manifest);
    process.stdout.write(`${JSON.stringify({
      ok: true,
      command,
      status: admission.status,
      blockers: admission.blockers,
      profileId: profile.id,
      profileSha256,
      handoffPath: outPath,
      nextOperation: "plan-context-discovery",
      startsOrAttaches: false,
    })}\n`);
    if (admission.status === "blocked") process.exitCode = 2;
  } else if (command === "plan-context-discovery") {
    const runtimeIdentityPath = requiredPath(options["runtime-identity"], "--runtime-identity");
    if (runtimeIdentityPath === outPath) throw new Error("retail_gpu_readback_output_overlaps_runtime_identity");
    const runtimeIdentityBytes = readFileSync(runtimeIdentityPath);
    const runtimeIdentitySha256 = createHash("sha256").update(runtimeIdentityBytes).digest("hex");
    const executablePlan = buildRetailGpuReadbackContextDiscoveryPlan(
      profile,
      JSON.parse(runtimeIdentityBytes.toString("utf8")),
    );
    const manifest = {
      version: "aur-s07-retail-gpu-readback-context-discovery-handoff/v1",
      createdAtUtc: new Date().toISOString(),
      profilePath,
      profileSha256,
      runtimeIdentityPath,
      runtimeIdentitySha256,
      executablePlan,
      executionGate: "future live lane must revalidate PID + StartTime + HWND + executable/module/resource hashes immediately before attach",
      safety: {
        ...noExecutionSafety(),
        executed: false,
      },
    };
    writeNewJson(outPath, manifest);
    process.stdout.write(`${JSON.stringify({
      ok: true,
      command,
      profileId: profile.id,
      profileSha256,
      runtimeIdentitySha256,
      planPath: outPath,
      startsOrAttaches: false,
    })}\n`);
  } else {
    throw new Error("retail_gpu_readback_command_invalid");
  }
} catch (error) {
  process.stderr.write(`${JSON.stringify({ ok: false, error: String(error?.message ?? error) })}\n`);
  process.exitCode = 1;
}

function parseArgs(args) {
  const options = {};
  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (!token.startsWith("--")) throw new Error(`retail_gpu_readback_argument_invalid:${token}`);
    const value = args[index + 1];
    if (value === undefined || value.startsWith("--")) throw new Error(`retail_gpu_readback_argument_value_missing:${token}`);
    options[token.slice(2)] = value;
    index += 1;
  }
  return options;
}

function requiredPath(value, option) {
  if (typeof value !== "string" || value.trim().length === 0) throw new Error(`retail_gpu_readback_required:${option}`);
  return resolve(value);
}

function writeNewJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, { flag: "wx" });
}

function noExecutionSafety() {
  return {
    launchesProcess: false,
    attachesToProcess: false,
    injectsLibrary: false,
    capturesFrame: false,
    mutatesModuleOrHak: false,
    closesSession: false,
  };
}
