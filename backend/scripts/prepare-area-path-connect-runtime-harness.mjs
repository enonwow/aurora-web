#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  PATH_CONNECT_RUNTIME_SCRIPT_RESREF,
  buildPathConnectRuntimeHarnessSource,
} from "./lib/area-path-connect-runtime-harness.mjs";
import { validatePathConnectDifferentialProfile } from "./lib/tile-path-connect-differential-proof.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const backendRoot = resolve(here, "..");
const projectRoot = resolve(backendRoot, "..");
const proofRoot = resolve(projectRoot, "output", "proof", "tile-path-connect-native-2026-08-19");
const userProfile = process.env.USERPROFILE ?? "";
const options = parseOptions(process.argv.slice(2));

await main(options);

async function main(config) {
  for (const [path, label] of [[config.modulePath, "module"], [config.profilePath, "profile"]]) {
    if (!existsSync(path)) throw new Error(`path_connect_runtime_${label}_missing:${path}`);
  }
  const sourcePath = resolve(config.outputDir, `${PATH_CONNECT_RUNTIME_SCRIPT_RESREF}.nss`);
  const preflightPath = resolve(config.outputDir, "runtime-harness-preflight.json");
  for (const path of [sourcePath, preflightPath]) {
    if (existsSync(path)) throw new Error(`path_connect_runtime_output_exists:${path}`);
  }

  const profileBytes = await readFile(config.profilePath);
  const profile = JSON.parse(profileBytes.toString("utf8"));
  const profileErrors = validatePathConnectDifferentialProfile(profile);
  if (profileErrors.length > 0) throw new Error(`path_connect_runtime_profile_invalid:${profileErrors.join(",")}`);
  const moduleBytes = await readFile(config.modulePath);
  const moduleSha256 = sha256(moduleBytes);
  const positiveReadback = readArea(config.modulePath, profile.positiveAreaResRef);
  const negativeReadback = readArea(config.modulePath, profile.negativeAreaResRef);
  assertAreaReadback(positiveReadback, profile.positiveAreaResRef, "AW_PC_TMS01_POS", profile, moduleSha256);
  assertAreaReadback(negativeReadback, profile.negativeAreaResRef, "AW_PC_TMS01_NEG", profile, moduleSha256);

  const binding = {
    profileId: profile.id,
    rowId: profile.rowId,
    positiveAreaTag: positiveReadback.tag,
    negativeAreaTag: negativeReadback.tag,
    sharedEdgeX: 10,
    source: { x: 7.5, y: 5, z: 0 },
    target: { x: 12.5, y: 5, z: 0 },
    settleSeconds: 0.5,
    trialSeconds: 2.5,
    reachedDistance: 1,
  };
  const source = buildPathConnectRuntimeHarnessSource(binding);
  await mkdir(config.outputDir, { recursive: true });
  await writeFile(sourcePath, source, { encoding: "ascii", flag: "wx" });
  const persistedSource = await readFile(sourcePath);
  const preflight = {
    schema: "aurora-area-path-connect-runtime-harness-preflight/v1",
    generatedAt: new Date().toISOString(),
    status: "source-prepared-awaiting-native-toolset-compile-bind-save-and-user-owned-test-module",
    module: { path: config.modulePath, resref: basename(config.modulePath, ".mod"), sha256: moduleSha256, bytes: moduleBytes.length },
    sourceProfile: { path: config.profilePath, sha256: sha256(profileBytes), declaredPreNativeSaveModuleSha256: profile.moduleSha256 },
    script: { resref: PATH_CONNECT_RUNTIME_SCRIPT_RESREF, path: sourcePath, sha256: sha256(persistedSource), bytes: persistedSource.length, exactlyOneMain: (source.match(/\bvoid\s+main\s*\(/gu) ?? []).length === 1 },
    binding,
    areaReadbacks: { positive: positiveReadback, negative: negativeReadback },
    requiredNext: [
      "compile exact source in the current Toolset Script Editor and require zero errors",
      "bind exact script resref to demo Area OnEnter through the native Area Properties event control",
      "native Save and packed NCS/ARE event readback",
      "create a final immutable profile bound to the post-binding module hash",
      "arm central AUR-S07 and wait for the user-owned Test Module action",
    ],
    claimBoundary: { startsToolset: false, startsNwn: false, mutatesModule: false, runtimeProofClaimed: false },
  };
  await writeFile(preflightPath, `${JSON.stringify(preflight, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
  process.stdout.write(`${JSON.stringify({ ok: true, sourcePath, preflightPath, moduleSha256, scriptSha256: preflight.script.sha256, binding }, null, 2)}\n`);
}

function readArea(modulePath, area) {
  return JSON.parse(execFileSync(process.execPath, [
    resolve(here, "read-aurora-toolset-bootstrap-area-readback.mjs"),
    "--module", modulePath,
    "--area", area,
  ], { encoding: "utf8", windowsHide: true, timeout: 60_000 }).trim());
}

function assertAreaReadback(readback, area, tag, profile, moduleSha256) {
  if (readback?.version !== "aurora-toolset-bootstrap-area-readback/v1" ||
    readback.moduleSha256 !== moduleSha256 || readback.area !== area || readback.tag !== tag ||
    readback.tileSet !== profile.tilesetResRef || readback.width !== profile.areaWidth ||
    readback.height !== profile.areaHeight || readback.completeTileList !== true) {
    throw new Error(`path_connect_runtime_area_readback_invalid:${area}`);
  }
}

function parseOptions(args) {
  const values = new Map();
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index];
    const value = args[index + 1];
    if (!key?.startsWith("--") || value === undefined || value.startsWith("--")) throw new Error(`invalid_argument:${key ?? "end"}`);
    values.set(key.slice(2), value);
  }
  return {
    modulePath: resolve(values.get("module") ?? resolve(userProfile, "Documents", "Neverwinter Nights", "modules", "aw_path_connect_proof_01.mod")),
    profilePath: resolve(values.get("profile") ?? resolve(proofRoot, "path-connect-profile.json")),
    outputDir: resolve(values.get("output") ?? resolve(proofRoot, "runtime-harness")),
  };
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}
