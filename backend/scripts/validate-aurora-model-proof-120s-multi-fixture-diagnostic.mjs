#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  buildBoundMultiFixtureDiagnosticVerdict,
  buildMultiFixtureDiagnosticCrops,
  loadMultiFixtureDiagnosticContext,
  recordBoundMultiFixtureDiagnosticInspections,
  validateBoundMultiFixtureDiagnosticVerdict,
} from "./lib/aurora-model-proof-120s-multi-fixture-diagnostic-binding.mjs";

try {
  const command = process.argv[2];
  const options = parseOptions(process.argv.slice(3));
  if (command === "validate-profile") {
    requireOptions(options, ["profile"]);
    const context = loadMultiFixtureDiagnosticContext(options.profile);
    emit({
      ok: true,
      status: "aurora_model_proof_120s_multi_fixture_diagnostic_profile_valid",
      version: context.profile.version,
      profileId: context.profile.id,
      profileSha256: context.profileSha256,
      baseProofProfileSha256: context.profile.proofProfile.sha256,
      hardLimitMs: context.profile.hardLimitMs,
      fixtureCount: context.profile.fixtures.length,
      toolsetTargetFixtureId: context.profile.toolsetTargetFixtureId,
      acceptedBaseRun: {
        acceptanceSha256: context.acceptedBaseRun.acceptance.sha256,
        publishCounter: context.acceptedBaseRun.publishCounter,
        elapsedMs: context.acceptedBaseRun.elapsed.elapsedMs,
        deadlineCounter: context.acceptedBaseRun.clock.value.deadlineCounter,
      },
    });
  } else if (command === "build-crops") {
    requireOptions(options, ["profile", "runtime-png", "crop-dir"]);
    const context = loadMultiFixtureDiagnosticContext(options.profile);
    const built = buildMultiFixtureDiagnosticCrops({
      context,
      runtimePngPath: options["runtime-png"],
      cropDir: options["crop-dir"],
    });
    emit({
      ok: true,
      status: "aurora_model_proof_120s_multi_fixture_diagnostic_crops_built",
      manifestPath: built.manifestPath,
      manifestSha256: built.manifestSha256,
      manifestByteLength: built.manifestByteLength,
      fixtureCount: built.manifest.fixtures.length,
    });
  } else if (command === "record-fixture-verdicts") {
    requireOptions(options, ["profile", "runtime-png", "crops", "inspection-input", "out"]);
    const context = loadMultiFixtureDiagnosticContext(options.profile);
    const recorded = recordBoundMultiFixtureDiagnosticInspections({
      context,
      runtimePngPath: options["runtime-png"],
      cropsManifestPath: options.crops,
      inspectionInputPath: options["inspection-input"],
    });
    const output = writeNewJson(options.out, recorded, "fixture_inspections_output_exists");
    emit({
      ok: true,
      status: "aurora_model_proof_120s_multi_fixture_diagnostic_inspections_recorded",
      fixtureInspectionsPath: output.path,
      fixtureInspectionsSha256: output.sha256,
      fixtureInspectionsByteLength: output.byteLength,
      fixtureCount: recorded.fixtures.length,
    });
  } else if (command === "build-verdict") {
    requireOptions(options, ["profile", "runtime-png", "crops", "fixture-inspections", "out"]);
    const context = loadMultiFixtureDiagnosticContext(options.profile);
    const packet = buildBoundMultiFixtureDiagnosticVerdict({
      context,
      runtimePngPath: options["runtime-png"],
      cropsManifestPath: options.crops,
      fixtureInspectionsPath: options["fixture-inspections"],
    });
    const output = writeNewJson(options.out, packet, "diagnostic_verdict_output_exists");
    emit({
      ok: true,
      status: "aurora_model_proof_120s_multi_fixture_diagnostic_verdict_built",
      packetPath: output.path,
      packetSha256: output.sha256,
      packetByteLength: output.byteLength,
      profileSha256: context.profileSha256,
      runtimePngSha256: packet.runtimeCapture.sha256,
      cropsManifestSha256: packet.cropsManifest.sha256,
      fixtureInspectionsSha256: packet.fixtureInspectionsSource.sha256,
    });
  } else if (command === "validate-verdict") {
    requireOptions(options, ["profile", "runtime-png", "crops", "fixture-inspections", "packet"]);
    const context = loadMultiFixtureDiagnosticContext(options.profile);
    const validated = validateBoundMultiFixtureDiagnosticVerdict({
      context,
      runtimePngPath: options["runtime-png"],
      cropsManifestPath: options.crops,
      fixtureInspectionsPath: options["fixture-inspections"],
      packetPath: options.packet,
    });
    emit({
      ok: true,
      status: "aurora_model_proof_120s_multi_fixture_diagnostic_verdict_valid",
      packetPath: validated.packetPath,
      packetSha256: validated.packetSha256,
      packetByteLength: validated.packetByteLength,
      profileSha256: validated.profileSha256,
      runtimePngSha256: validated.runtimePngSha256,
      cropsManifestSha256: validated.cropsManifestSha256,
      fixtureInspectionsSha256: validated.fixtureInspectionsSha256,
    });
  } else {
    throw new Error("usage: validate-profile --profile <profile.json> | build-crops --profile <profile.json> --runtime-png <capture.png> --crop-dir <absent-dir> | record-fixture-verdicts --profile <profile.json> --runtime-png <capture.png> --crops <crops.json> --inspection-input <input.json> --out <recorded.json> | build-verdict --profile <profile.json> --runtime-png <capture.png> --crops <crops.json> --fixture-inspections <recorded.json> --out <packet.json> | validate-verdict --profile <profile.json> --runtime-png <capture.png> --crops <crops.json> --fixture-inspections <recorded.json> --packet <packet.json>");
  }
} catch (error) {
  process.stderr.write(`${JSON.stringify({
    ok: false,
    status: "aurora_model_proof_120s_multi_fixture_diagnostic_rejected",
    error: error instanceof Error ? error.message : String(error),
  })}\n`);
  process.exitCode = 1;
}

function parseOptions(args) {
  const options = {};
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index];
    const value = args[index + 1];
    if (!/^--[a-z-]+$/u.test(key ?? "") || value == null || value.startsWith("--")) throw new Error("diagnostic_cli_arguments_invalid");
    const name = key.slice(2);
    if (Object.hasOwn(options, name)) throw new Error(`diagnostic_cli_option_duplicate:${name}`);
    options[name] = value;
  }
  return options;
}

function requireOptions(options, expected) {
  const actual = Object.keys(options).sort();
  const required = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(required)) throw new Error(`diagnostic_cli_options_invalid:expected=${required.join(",")}`);
}

function emit(value) {
  process.stdout.write(`${JSON.stringify(value)}\n`);
}

function writeNewJson(path, value, existsError) {
  const outputPath = resolve(path);
  if (existsSync(outputPath)) throw new Error(`${existsError}:${outputPath}`);
  const bytes = Buffer.from(`${JSON.stringify(value, null, 2)}\n`, "utf8");
  writeFileSync(outputPath, bytes, { flag: "wx" });
  return { path: outputPath, sha256: sha256(bytes), byteLength: bytes.length };
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}
