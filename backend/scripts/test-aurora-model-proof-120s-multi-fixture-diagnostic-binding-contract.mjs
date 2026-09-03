#!/usr/bin/env node

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { deflateSync } from "node:zlib";
import { MODEL_PROOF_VERSION, createClock } from "./lib/aurora-model-proof-120s-contract.mjs";
import { MULTI_FIXTURE_DIAGNOSTIC_PROFILE_VERSION } from "./lib/aurora-model-proof-120s-multi-fixture-diagnostic-contract.mjs";
import {
  MULTI_FIXTURE_DIAGNOSTIC_BOUND_VERDICT_VERSION,
  MULTI_FIXTURE_DIAGNOSTIC_INSPECTION_INPUT_VERSION,
} from "./lib/aurora-model-proof-120s-multi-fixture-diagnostic-binding.mjs";
import { inspectCanonicalPublishedAcceptanceV1 } from "./lib/aurora-model-proof-120s-published-acceptance.mjs";
import { decodeDiagnosticRuntimePng } from "./lib/aurora-model-proof-120s-multi-fixture-diagnostic-png.mjs";
import {
  buildErf,
  createTriControlModuleFixture,
} from "./test-support/aurora-model-proof-120s-erf-gff-fixture.mjs";
import {
  createMultiFixtureDiagnosticTestBinding,
  createSyntheticPublishedAcceptanceTrustRootForTests,
} from "./test-support/aurora-model-proof-120s-multi-fixture-diagnostic-test-binding.mjs";

const runtimePngBytes = createTriColorPng(640, 480);
const axes = [
  { fixtureId: "custom_control_h1", roiReadability: "readable", modelVisibility: "visible", proofCompleteness: "verified", inspection: "H1 is readable." },
  { fixtureId: "candidate_m0", roiReadability: "readable", modelVisibility: "not_visible", proofCompleteness: "verified", inspection: "M0 ROI is readable and empty." },
  { fixtureId: "stock_control", roiReadability: "readable", modelVisibility: "visible", proofCompleteness: "verified", inspection: "Stock control is readable." },
];
const fixtureDefinitions = [
  { id: "stock_control", role: "stock_renderer_control", templateResRef: "m2a_d_stock", displayName: "Stock c_horror control", appearanceRow: 102, modelResref: "c_horror", position: { x: 5, y: 18, z: 0 }, orientation: { x: 1, y: 0 } },
  { id: "candidate_m0", role: "exact_r31_candidate", templateResRef: "m2a_d_m0", displayName: "Exact r31 M0 candidate", appearanceRow: 15_100, modelResref: "m2a_m0p01", position: { x: 10, y: 14.5, z: 0 }, orientation: { x: 1, y: 0 } },
  { id: "custom_control_h1", role: "project_owned_positive_control", templateResRef: "m2a_d_h1", displayName: "Project-owned H1 v20 control", appearanceRow: 15_101, modelResref: "m2a_m6p01", position: { x: 15, y: 18, z: 0 }, orientation: { x: 1, y: 0 } },
];
const witnessPaths = {
  baseAppearance: "C:\\Projects\\meshy2aurora\\local-reference-assets\\appearance.2da",
  r31Appearance: "C:\\Projects\\meshy2aurora\\proof-output\\m0-r31-hierarchy-only-20260722\\generated\\appearance.2da",
  r31Mdl: "C:\\Projects\\meshy2aurora\\proof-output\\m0-r31-hierarchy-only-20260722\\generated\\m2a_m0p01.mdl",
  r31Tga: "C:\\Projects\\meshy2aurora\\proof-output\\m0-r31-hierarchy-only-20260722\\generated\\m2a_m0t01.tga",
  h1Appearance: "C:\\Projects\\meshy2aurora\\proof-output\\meshy-h1-nwn-runtime-rigid-isolation-v20\\generated\\appearance.2da",
  h1Mdl: "C:\\Projects\\meshy2aurora\\proof-output\\meshy-h1-nwn-runtime-rigid-isolation-v20\\generated\\m2a_m6p01.mdl",
  h1Tga: "C:\\Projects\\meshy2aurora\\proof-output\\meshy-h1-nwn-runtime-rigid-isolation-v20\\generated\\m2a_m6t01.tga",
};
const exactWitnessBytes = Object.fromEntries(Object.entries(witnessPaths).map(([name, path]) => [name, readFileSync(path)]));

const valid = createWorkspace();
const syntheticTrustRoot = createSyntheticPublishedAcceptanceTrustRootForTests(
  inspectCanonicalPublishedAcceptanceV1(valid.baseProfilePath),
  "central-tri-control-erf-gff-contract-fixture-v1",
);
const {
  buildBoundMultiFixtureDiagnosticVerdict,
  buildMultiFixtureDiagnosticCrops,
  loadMultiFixtureDiagnosticContext,
  recordBoundMultiFixtureDiagnosticInspections,
  validateBoundMultiFixtureDiagnosticVerdict,
} = createMultiFixtureDiagnosticTestBinding({ trustRoot: syntheticTrustRoot });
const context = loadMultiFixtureDiagnosticContext(valid.profilePath);
assert.equal(context.profileSha256, sha256File(valid.profilePath));
assert.equal(context.baseProofProfile.id, "base-candidate-profile");
assert.equal(context.acceptedBaseRun.publishCounter, "100000");
assert.equal(context.acceptedBaseRun.elapsed.elapsedMs, 90_000);
assert.equal(context.acceptedBaseRun.runtime.capture.path, valid.runtimePngPath);
assert.equal(context.diagnosticMaterialization.resources.length, 5);
assert.deepEqual(context.diagnosticMaterialization.fixtures.map((fixture) => fixture.fixtureId), ["stock_control", "candidate_m0", "custom_control_h1"]);

const decodedRuntime = decodeDiagnosticRuntimePng(runtimePngBytes);
const { pixels: decodedRuntimePixels, ...decodedRuntimeMetadata } = decodedRuntime;
assert.deepEqual(decodedRuntimeMetadata, {
  byteLength: runtimePngBytes.length,
  width: 640,
  height: 480,
  bitDepth: 8,
  colorType: 2,
  bytesPerPixel: 3,
  decodedByteLength: 640 * 480 * 3,
});
assert.equal(decodedRuntimePixels.length, 640 * 480 * 3);
assert.throws(() => decodeDiagnosticRuntimePng(createPng(640, 480, { idat: Buffer.alloc(0) })), /diagnostic_png_idat_empty/);
const compressed = deflateSync(Buffer.alloc(480 * (1 + 640 * 3)));
assert.throws(() => decodeDiagnosticRuntimePng(createPng(640, 480, { idat: compressed.subarray(0, compressed.length - 2) })), /diagnostic_png_inflate_invalid/);

assert.throws(() => buildBoundMultiFixtureDiagnosticVerdict({
  context,
  runtimePngPath: valid.runtimePngPath,
  cropsManifestPath: valid.cropsManifestPath,
  fixtureInspectionsPath: valid.recordedInspectionsPath,
}), /diagnostic_crops_manifest_missing/);

const cropsBuilt = buildMultiFixtureDiagnosticCrops({
  context,
  runtimePngPath: valid.runtimePngPath,
  cropDir: valid.cropDir,
});
assert.equal(cropsBuilt.manifestPath, valid.cropsManifestPath);
assert.equal(cropsBuilt.manifest.fixtures.length, 3);
const existingCropManifestBytes = readFileSync(valid.cropsManifestPath);
const existingFirstCropBytes = readFileSync(cropsBuilt.manifest.fixtures[0].crop.path);
assert.throws(() => buildMultiFixtureDiagnosticCrops({
  context,
  runtimePngPath: valid.runtimePngPath,
  cropDir: valid.cropDir,
}), /diagnostic_crop_dir_exists/);
assert.ok(readFileSync(valid.cropsManifestPath).equals(existingCropManifestBytes), "existing crop manifest bytes must be preserved");
assert.ok(readFileSync(cropsBuilt.manifest.fixtures[0].crop.path).equals(existingFirstCropBytes), "existing crop bytes must be preserved");

const cropRaceDir = join(valid.root, "runtime-crops-race");
const cropRaceForeignPath = join(cropRaceDir, "foreign.bin");
const cropRaceForeignBytes = Buffer.from("foreign-race-winner\n", "utf8");
const cropRaceBinding = createMultiFixtureDiagnosticTestBinding({
  trustRoot: syntheticTrustRoot,
  hooks: {
    beforeCreateCropDir: (path) => {
      assert.equal(path, cropRaceDir);
      mkdirSync(path);
      writeFileSync(cropRaceForeignPath, cropRaceForeignBytes);
    },
  },
});
assert.throws(() => cropRaceBinding.buildMultiFixtureDiagnosticCrops({
  context: cropRaceBinding.loadMultiFixtureDiagnosticContext(valid.profilePath),
  runtimePngPath: valid.runtimePngPath,
  cropDir: cropRaceDir,
}), /diagnostic_crop_dir_race/);
assert.ok(readFileSync(cropRaceForeignPath).equals(cropRaceForeignBytes), "concurrent foreign crop-dir bytes must be preserved");
const expectedColors = new Map([
  ["stock_renderer_control", [255, 0, 0]],
  ["exact_r31_candidate", [0, 255, 0]],
  ["project_owned_positive_control", [0, 0, 255]],
]);
for (const fixture of cropsBuilt.manifest.fixtures) {
  const decodedCrop = decodeDiagnosticRuntimePng(readFileSync(fixture.crop.path));
  const expectedColor = expectedColors.get(fixture.role);
  assert.ok(expectedColor, `unexpected_fixture_role:${fixture.role}`);
  for (let offset = 0; offset < decodedCrop.pixels.length; offset += 3) {
    assert.deepEqual([...decodedCrop.pixels.subarray(offset, offset + 3)], expectedColor, `crop_pixel_mismatch:${fixture.fixtureId}:${offset}`);
  }
}

const inspectionInput = {
  version: MULTI_FIXTURE_DIAGNOSTIC_INSPECTION_INPUT_VERSION,
  runtimeCaptureSha256: cropsBuilt.manifest.runtimeCapture.sha256,
  cropsManifestSha256: cropsBuilt.manifestSha256,
  fixtures: cropsBuilt.manifest.fixtures.map((fixture) => ({
    fixtureId: fixture.fixtureId,
    cropSha256: fixture.crop.sha256,
    roiReadability: "readable",
    modelVisibility: fixture.fixtureId === "candidate_m0" ? "not_visible" : "visible",
    visualInspection: `${fixture.fixtureId} exact crop inspected.`,
  })),
};
writeJson(valid.inspectionInputPath, inspectionInput);
const manifestBytes = readFileSync(valid.cropsManifestPath);
const tamperedManifest = JSON.parse(manifestBytes.toString("utf8"));
tamperedManifest.fixtures[1].role = "forged_role";
writeJson(valid.cropsManifestPath, tamperedManifest);
assert.throws(() => recordBoundMultiFixtureDiagnosticInspections({
  context,
  runtimePngPath: valid.runtimePngPath,
  cropsManifestPath: valid.cropsManifestPath,
  inspectionInputPath: valid.inspectionInputPath,
}), /diagnostic_crops_manifest_drift/);
writeFileSync(valid.cropsManifestPath, Buffer.from("{}\n", "utf8"));
assert.throws(() => recordBoundMultiFixtureDiagnosticInspections({
  context,
  runtimePngPath: valid.runtimePngPath,
  cropsManifestPath: valid.cropsManifestPath,
  inspectionInputPath: valid.inspectionInputPath,
}), /diagnostic_crops_manifest_drift/);
writeFileSync(valid.cropsManifestPath, manifestBytes);
assert.throws(() => recordBoundMultiFixtureDiagnosticInspections({
  context,
  runtimePngPath: valid.runtimePngPath,
  cropsManifestPath: valid.cropsManifestPath,
  inspectionInputPath: valid.axesPath,
}), /axes_only_fixture_verdicts_non_admissible/);
const invalidInspectionInputPath = join(valid.root, "inspection-input-with-derived-proof.json");
writeJson(invalidInspectionInputPath, {
  ...inspectionInput,
  fixtures: inspectionInput.fixtures.map((fixture) => ({ ...fixture, proofCompleteness: "verified" })),
});
assert.throws(() => recordBoundMultiFixtureDiagnosticInspections({
  context,
  runtimePngPath: valid.runtimePngPath,
  cropsManifestPath: valid.cropsManifestPath,
  inspectionInputPath: invalidInspectionInputPath,
}), /fixture_inspection_fields_invalid/);

const firstCrop = cropsBuilt.manifest.fixtures[0].crop.path;
const firstCropBytes = readFileSync(firstCrop);
writeFileSync(firstCrop, Buffer.concat([firstCropBytes, Buffer.from([0])]));
assert.throws(() => recordBoundMultiFixtureDiagnosticInspections({
  context,
  runtimePngPath: valid.runtimePngPath,
  cropsManifestPath: valid.cropsManifestPath,
  inspectionInputPath: valid.inspectionInputPath,
}), /diagnostic_crop_pixels_mismatch/);
writeFileSync(firstCrop, firstCropBytes);

const recorded = recordBoundMultiFixtureDiagnosticInspections({
  context,
  runtimePngPath: valid.runtimePngPath,
  cropsManifestPath: valid.cropsManifestPath,
  inspectionInputPath: valid.inspectionInputPath,
});
assert.ok(recorded.fixtures.every((fixture) => fixture.proofCompleteness === "verified"));
assert.deepEqual(recorded.fixtures.map((fixture) => fixture.modelVisibility), ["visible", "not_visible", "visible"]);
writeJson(valid.recordedInspectionsPath, recorded);

const unreadableInputPath = join(valid.root, "unreadable-inspection-input.json");
writeJson(unreadableInputPath, {
  ...inspectionInput,
  fixtures: inspectionInput.fixtures.map((fixture) => fixture.fixtureId === "candidate_m0"
    ? { ...fixture, roiReadability: "unreadable", modelVisibility: "not_tested", visualInspection: "Candidate crop cannot support a visual verdict." }
    : fixture),
});
const unreadable = recordBoundMultiFixtureDiagnosticInspections({
  context,
  runtimePngPath: valid.runtimePngPath,
  cropsManifestPath: valid.cropsManifestPath,
  inspectionInputPath: unreadableInputPath,
});
const unreadableCandidate = unreadable.fixtures.find((fixture) => fixture.fixtureId === "candidate_m0");
assert.equal(unreadableCandidate.modelVisibility, "not_tested");
assert.equal(unreadableCandidate.proofCompleteness, "missing");

const built = buildBoundMultiFixtureDiagnosticVerdict({
  context,
  runtimePngPath: valid.runtimePngPath,
  cropsManifestPath: valid.cropsManifestPath,
  fixtureInspectionsPath: valid.recordedInspectionsPath,
});
assert.equal(built.version, MULTI_FIXTURE_DIAGNOSTIC_BOUND_VERDICT_VERSION);
assert.equal(built.admissibility.status, "bound_to_canonical_published_acceptance_and_recorded_crop_inspections");
assert.equal(built.admissibility.unboundBuilderAvailable, false);
assert.equal(built.admissibility.automaticClassification, false);
assert.equal(built.profile.sha256, sha256File(valid.profilePath));
assert.equal(built.profile.baseProofProfile.sha256, sha256File(valid.baseProfilePath));
assert.equal(built.profile.diagnosticBinaryProfile.sha256, sha256File(valid.diagnosticBinaryProfilePath));
assert.equal(built.acceptedBaseRun.runtimePacket.sha256, sha256File(valid.runtimePacketPath));
assert.equal(built.runtimeCapture.path, valid.runtimePngPath);
assert.equal(built.runtimeCapture.sha256, sha256File(valid.runtimePngPath));
assert.ok(built.fixtureVerdicts.every((value) => value.runtimeRoiPixels.area >= 4_096));
assert.ok(built.fixtureVerdicts.every((value) => value.crop.sha256 === sha256File(value.crop.path)));

const alternatePngPath = join(valid.root, "alternate.png");
writeFileSync(alternatePngPath, runtimePngBytes);
assert.throws(() => buildBoundMultiFixtureDiagnosticVerdict({
  context,
  runtimePngPath: alternatePngPath,
  cropsManifestPath: valid.cropsManifestPath,
  fixtureInspectionsPath: valid.recordedInspectionsPath,
}), /runtime_png_not_accepted_runtime_capture/);

for (const [expected, options] of [
  [/diagnostic_binary_(?:claimed_module_readback|exact_position)_mismatch/, { mutateDiagnostic: (value) => { value.fixtures[2].position.x = 99; value.moduleReadback.fixtures[2].position.x = 99; } }],
  [/diagnostic_hak_resource_bytes_mismatch:m2a_m6p01:2002/, { mutateDiagnostic: (value) => { value.hakContract.resources[3].sha256 = "f".repeat(64); } }],
  [/diagnostic_materialized_appearance_h1_clone_mismatch/, { badAppearanceRow: true }],
  [/published_state_missing/, { omitState: true }],
  [/published_(?:route_|final_ready_)/, { mutateFinal: (value) => { delete value.routes; } }],
  [/published_runtime_packet_missing/, { omitRuntimePacket: true }],
  [/published_runtime_packet_outside_output_root/, { runtimePacketOutsideRoot: true }],
  [/published_runtime_capture_hash_mismatch/, { mutateRuntimePacket: (value) => { value.capture.sha256 = "e".repeat(64); } }],
  [/published_state_dispatch_set_invalid/, { extraDispatch: true }],
  [/published_runtime_request_id_mismatch/, { wrongRequestId: true }],
  [/published_runtime_observation_pid_mismatch/, { wrongPid: true }],
  [/published_runtime_handoff_start_mismatch/, { wrongStart: true }],
  [/published_runtime_capture_hwnd_mismatch/, { wrongCaptureContext: true }],
  [/published_runtime_log_source_mismatch/, { wrongLogContext: true }],
  [/published_trust_root_acceptance_projection_mismatch/, { alternateConsistentRequestId: true }],
]) {
  const workspace = createWorkspace(options);
  assert.throws(() => loadMultiFixtureDiagnosticContext(workspace.profilePath), expected);
}
const swappedRois = createWorkspace({ swapRuntimeRois: true });
assert.throws(() => loadMultiFixtureDiagnosticContext(swappedRois.profilePath), /fixture_runtime_roi_position_order_mismatch/);

const cliPath = resolve("backend/scripts/validate-aurora-model-proof-120s-multi-fixture-diagnostic.mjs");
const validateProfileCli = runCli(["validate-profile", "--profile", valid.profilePath]);
assert.equal(validateProfileCli.status, 1);
assert.match(validateProfileCli.stderr, /published_acceptance_trust_root_unknown:central-tri-control-erf-gff-contract-fixture-v1/);

writeJson(valid.packetPath, built);
const validated = validateBoundMultiFixtureDiagnosticVerdict({
  context,
  runtimePngPath: valid.runtimePngPath,
  cropsManifestPath: valid.cropsManifestPath,
  fixtureInspectionsPath: valid.recordedInspectionsPath,
  packetPath: valid.packetPath,
});
assert.equal(validated.packetSha256, sha256File(valid.packetPath));
const changedPacket = JSON.parse(readFileSync(valid.packetPath, "utf8"));
changedPacket.fixtureVerdicts[1].modelVisibility = "visible";
writeJson(valid.packetPath, changedPacket);
assert.throws(() => validateBoundMultiFixtureDiagnosticVerdict({
  context,
  runtimePngPath: valid.runtimePngPath,
  cropsManifestPath: valid.cropsManifestPath,
  fixtureInspectionsPath: valid.recordedInspectionsPath,
  packetPath: valid.packetPath,
}), /diagnostic_verdict_packet_drift/);

console.log(JSON.stringify({ ok: true, status: "aurora_model_proof_120s_multi_fixture_diagnostic_binding_contract_valid" }));

function createWorkspace({
  badAppearanceRow = false,
  mutateDiagnostic,
  mutateFinal,
  mutateRuntimePacket,
  omitState = false,
  omitRuntimePacket = false,
  runtimePacketOutsideRoot = false,
  extraDispatch = false,
  wrongRequestId = false,
  wrongPid = false,
  wrongStart = false,
  wrongCaptureContext = false,
  wrongLogContext = false,
  alternateConsistentRequestId = false,
  swapRuntimeRois = false,
} = {}) {
  const root = mkdtempSync(join(tmpdir(), "aurora-model-proof-120s-bound-"));
  const outputRoot = join(root, "run");
  const toolsetRoot = join(outputRoot, "toolset");
  const runtimeRoot = join(outputRoot, "runtime");
  mkdirSync(toolsetRoot, { recursive: true });
  mkdirSync(runtimeRoot, { recursive: true });

  const moduleBytes = createTriControlModuleFixture({
    moduleResref: "candidate",
    areaResref: "candidate_area",
    hakResref: "diagnostic",
    fixtures: structuredClone(fixtureDefinitions),
  });
  const sourceModulePath = join(root, "source.mod");
  const installedModulePath = join(root, "installed.mod");
  writeFileSync(sourceModulePath, moduleBytes);
  writeFileSync(installedModulePath, moduleBytes);
  const exactAppearance = buildTriAppearance(exactWitnessBytes.r31Appearance, exactWitnessBytes.h1Appearance);
  const diagnosticAppearance = badAppearanceRow
    ? Buffer.from(exactAppearance.toString("utf8").replace(/(15101\s+M2A_M6_PROOF\s+[^\r\n]*?)m2a_m6p01/u, "$1forged_h1"), "utf8")
    : exactAppearance;
  const resourcePayloads = [
    { resref: "appearance", type: 2017, bytes: diagnosticAppearance },
    { resref: "m2a_m0p01", type: 2002, bytes: exactWitnessBytes.r31Mdl },
    { resref: "m2a_m0t01", type: 3, bytes: exactWitnessBytes.r31Tga },
    { resref: "m2a_m6p01", type: 2002, bytes: exactWitnessBytes.h1Mdl },
    { resref: "m2a_m6t01", type: 3, bytes: exactWitnessBytes.h1Tga },
  ];
  const hakPath = join(root, "diagnostic.hak");
  writeFileSync(hakPath, buildErf("HAK ", resourcePayloads));
  const moduleIdentity = identity(installedModulePath);
  const hakIdentity = { resref: "diagnostic", ...identity(hakPath) };
  const resources = Object.fromEntries(resourcePayloads.map((resource) => [`${resource.resref}:${resource.type}`, { resref: resource.resref, resourceType: resource.type, byteLength: resource.bytes.length, sha256: sha256(resource.bytes) }]));

  const binaryProfilePath = join(root, "binary.json");
  writeJson(binaryProfilePath, {
    version: "aurora-toolset-binary-module-bootstrap-profile/v1",
    module: { resref: "candidate", path: sourceModulePath, sha256: moduleIdentity.sha256 },
    area: { resref: "candidate_area" },
    entryPoint: { position: [10, 10, 0] },
    orderedHakList: [{ resref: hakIdentity.resref, path: hakPath, sha256: hakIdentity.sha256 }],
    fixtures: [{ id: "candidate_m0", templateResRef: "m2a_d_m0", appearanceType: 15_100, position: [10, 14.5, 0] }],
  });
  const toolsetProfilePath = join(root, "toolset.json");
  const runtimeProfilePath = join(root, "runtime.json");
  writeJson(toolsetProfilePath, { version: "synthetic-toolset/v1" });
  const runtimeProfileId = "fixture-runtime-profile";
  writeJson(runtimeProfilePath, {
    version: "aur-s07-runtime-profile/v1",
    id: runtimeProfileId,
    module: { sha256: moduleIdentity.sha256, area: "candidate_area", entryPoint: [10, 10, 0] },
    orderedHakList: [{ resref: hakIdentity.resref, sha256: hakIdentity.sha256 }],
    geometryGate: { status: "verified", evidence: join(root, "fixture-lineage.json") },
    fixtures: [{ id: "candidate_m0", resref: "m2a_m0p01", templateResRef: "m2a_d_m0", appearanceRow: 15_100, position: [10, 14.5, 0] }],
    launch: { mode: "user_owned_test_module_action", processName: "nwmain" },
    noLocalSubstitute: true,
  });
  const routeIdentity = { path: join(root, "route.mjs"), sha256: "a".repeat(64), byteLength: 1 };
  const routeManifestPath = join(root, "route-manifest.json");
  writeJson(routeManifestPath, { version: "aurora-model-proof-120s-route-manifest/v1", routes: [routeIdentity] });

  const baseProfilePath = join(root, "base-profile.json");
  const baseProfile = {
    version: MODEL_PROOF_VERSION,
    id: "base-candidate-profile",
    hardLimitMs: 120_000,
    binaryProfile: declared(binaryProfilePath, false),
    toolsetProfile: declared(toolsetProfilePath, false),
    runtimeProfile: declared(runtimeProfilePath, false),
    routeManifest: declared(routeManifestPath, false),
    installedModule: moduleIdentity,
    orderedHakList: [hakIdentity],
    resources: {
      mdl: { resref: "m2a_m0p01", sha256: resources["m2a_m0p01:2002"].sha256 },
      tga: { resref: "m2a_m0t01", sha256: resources["m2a_m0t01:3"].sha256 },
      appearance2da: { resref: "appearance", row: 15_100, sha256: resources["appearance:2017"].sha256 },
    },
    area: { resref: "candidate_area", displayName: "Candidate Area", entryPoint: [10, 10, 0] },
    fixture: { id: "candidate_m0", templateResRef: "m2a_d_m0", treeObjectText: "Exact r31 M0 candidate", occurrence: 0, appearanceRow: 15_100, position: [10, 14.5, 0] },
    runtime: { loadingModuleResref: "candidate", engineLogPath: join(root, "nwclientLog1.txt") },
    entryMode: "adopt-exact-clean",
    outputRoot,
    policy: { noSave: true, noBuild: true, noRepack: true, noFocus: true, noCamera: true, noRetry: true },
  };
  writeJson(baseProfilePath, baseProfile);
  const baseProfileSha256 = sha256File(baseProfilePath);

  const diagnosticBinaryProfilePath = join(root, "diagnostic-binary.json");
  const diagnosticBinary = {
    schemaVersion: 1,
    profile: "M2A_PROJECT_DIRECT_CREATURE_TRI_CONTROL_DIAGNOSTIC_V1",
    diagnosticOnly: true,
    runtimeAdmissible: false,
    resolverVerified: false,
    rendererVerified: false,
    moduleIdentity: { moduleResref: "candidate", areaResref: "candidate_area", hakResref: "diagnostic" },
    module: { byteLength: moduleIdentity.byteLength, sha256: moduleIdentity.sha256 },
    moduleReadback: {
      schemaVersion: 1,
      moduleResref: "candidate",
      areaResref: "candidate_area",
      orderedHakResrefs: ["diagnostic"],
      entryPosition: { x: 10, y: 10, z: 0 },
      entryDirection: { x: 0, y: 1 },
      tilesetResref: "tms01",
      areaWidth: 2,
      areaHeight: 2,
      tileCount: 4,
      fixtures: structuredClone(fixtureDefinitions).map(({ role: _role, modelResref: _modelResref, ...fixture }) => fixture),
    },
    hakContract: {
      schemaVersion: 1,
      profile: "M2A_PROJECT_TRI_CONTROL_HAK_DIAGNOSTIC_V1",
      diagnosticOnly: true,
      runtimeAdmissible: false,
      resolverVerified: false,
      rendererVerified: false,
      baseAppearance: { byteLength: exactWitnessBytes.baseAppearance.length, sha256: sha256(exactWitnessBytes.baseAppearance) },
      h1SourceAppearance: { byteLength: exactWitnessBytes.h1Appearance.length, sha256: sha256(exactWitnessBytes.h1Appearance) },
      appearance: { byteLength: resources["appearance:2017"].byteLength, sha256: resources["appearance:2017"].sha256 },
      baseControl: { physicalRow: 102, label: "Hook_Horror", modelType: "S", race: "c_horror" },
      r31Control: { physicalRow: 15_100, label: "M2A_M0_MESHY_RIGID", modelType: "S", race: "m2a_m0p01" },
      h1Control: { physicalRow: 15_101, label: "M2A_M6_PROOF", modelType: "S", race: "m2a_m6p01" },
      resourceOrder: resourcePayloads.map(({ resref, type }) => ({ resref, resourceType: type })),
      resources: resourcePayloads.map(({ resref, type }) => resources[`${resref}:${type}`]),
      hak: { byteLength: hakIdentity.byteLength, sha256: hakIdentity.sha256 },
    },
    fixtures: structuredClone(fixtureDefinitions),
  };
  mutateDiagnostic?.(diagnosticBinary);
  writeJson(diagnosticBinaryProfilePath, diagnosticBinary);

  const clockPath = join(outputRoot, "run-clock.json");
  const clock = createClock({ counter: 10_000n, frequency: 1_000n });
  writeJson(clockPath, clock);
  const runtimePngPath = join(runtimeRoot, "capture.png");
  const toolsetPngPath = join(toolsetRoot, "capture.png");
  writeFileSync(runtimePngPath, runtimePngBytes);
  writeFileSync(toolsetPngPath, runtimePngBytes);
  const runtimeCaptureMetaPath = join(runtimeRoot, "capture.json");
  const toolsetCaptureMetaPath = join(toolsetRoot, "capture.json");
  writeJson(toolsetCaptureMetaPath, { ok: true, pngPath: toolsetPngPath });
  const runtimeLogPath = join(runtimeRoot, "engine-log-window.bin");
  const requestId = "fixture-request-1";
  const boundRequestId = alternateConsistentRequestId ? "alternate-consistent-request" : requestId;
  const processStartedAtUtc = "2026-07-22T00:00:01.000Z";
  const process = {
    pid: 4242,
    name: "nwmain",
    startedAtUtc: processStartedAtUtc,
    responding: true,
    mainWindowHandle: 9001,
    title: "Fixture NWN",
  };
  const loadingLine = "[Wed Jul 22 00:00:02] Loading Module: candidate";
  writeFileSync(runtimeLogPath, Buffer.from(`${loadingLine}\r\n`, "utf8"));
  const runtimeLogMetaPath = join(runtimeRoot, "engine-log-window.json");
  const observationPath = join(runtimeRoot, "observation.json");
  const windowPreparationPath = join(runtimeRoot, "window-preparation.json");
  const requestPath = join(runtimeRoot, "request.json");
  const handoffPath = join(runtimeRoot, "handoff.json");
  const request = {
    version: "aur-s07-runtime-launch-request/v1",
    requestId: wrongRequestId ? "forged-request" : boundRequestId,
    createdAt: "2026-07-22T00:00:00.000Z",
    profileId: runtimeProfileId,
    moduleSha256: moduleIdentity.sha256,
    area: "candidate_area",
    entryPoint: [10, 10, 0],
    action: "user_owned_test_module_action",
    startsNwn: false,
    usesGlobalInput: false,
  };
  const handoff = {
    version: "aur-s07-runtime-handoff/v1",
    createdAtUtc: "2026-07-22T00:00:02.000Z",
    requestId: boundRequestId,
    profileId: runtimeProfileId,
    moduleSha256: moduleIdentity.sha256,
    area: "candidate_area",
    entryPoint: [10, 10, 0],
    testModule: {
      toolsetPid: 3131,
      commandId: 121,
      commandCount: 1,
      nwmainPid: process.pid,
      nwmainStartUtc: wrongStart ? "2026-07-22T00:00:09.000Z" : process.startedAtUtc,
      nwmainResponding: true,
      engineLoadLine: loadingLine,
    },
    safety: { usesGlobalInput: false, secondTestModuleInvocation: false },
  };
  const observation = {
    version: "aur-s07-runtime-observation/v1",
    observedAt: "2026-07-22T00:00:02.100Z",
    profileId: runtimeProfileId,
    process: { pid: wrongPid ? process.pid + 1 : process.pid, name: process.name, startedAt: `/Date(${Date.parse(process.startedAtUtc)})/`, responding: true },
    moduleSha256: moduleIdentity.sha256,
    area: "candidate_area",
    entryPoint: [10, 10, 0],
    handoffPath,
    safety: { startsNwn: false, usesGlobalInput: false },
  };
  const preparedBounds = { left: -640, top: 0, right: 0, bottom: 480, width: 640, height: 480 };
  const windowPreparation = {
    ok: true,
    status: "verified",
    process: { pid: process.pid, name: process.name, startedAtUtc: process.startedAtUtc, responding: true },
    window: { hwnd: process.mainWindowHandle, ownerPid: process.pid, before: { left: 0, top: 0, right: 640, bottom: 480, width: 640, height: 480 }, after: preparedBounds },
    monitor: { deviceName: "\\\\.\\DISPLAY2", primary: false, bounds: { left: -640, top: 0, width: 640, height: 480 } },
    safety: { usesGlobalCursor: false, usesGlobalMouse: false, usesGlobalKeyboard: false, changesZOrder: false, activatesWindow: false },
  };
  const runtimeCaptureMetadata = {
    ok: true,
    status: "verified",
    processId: process.pid,
    startedAtUtc: process.startedAtUtc,
    windowHwnd: wrongCaptureContext ? process.mainWindowHandle + 1 : process.mainWindowHandle,
    title: process.title,
    bounds: { left: preparedBounds.left, top: preparedBounds.top, width: preparedBounds.width, height: preparedBounds.height },
    monitor: { deviceName: windowPreparation.monitor.deviceName, primary: false },
    pngPath: runtimePngPath,
    safety: { usesGlobalCursor: false, usesGlobalMouse: false, usesGlobalKeyboard: false, changesZOrder: false, changesWindowGeometry: false, activatesWindow: false },
    pngBytes: runtimePngBytes.length,
    pngSha256: sha256File(runtimePngPath),
    capturedAtUtc: "2026-07-22T00:00:03.000Z",
  };
  const emptySha256 = sha256(Buffer.alloc(0));
  const runtimeLogMetadata = {
    version: "aurora-model-proof-engine-log-window/v1",
    sourcePath: wrongLogContext ? join(root, "wrong-nwclientLog1.txt") : baseProfile.runtime.engineLogPath,
    baseline: { capturedAtUtc: "2026-07-21T23:59:59.000Z", identity: { dev: "1", ino: "2", size: "0", mtimeNs: "1784678399000000000" }, sha256: emptySha256 },
    selectedBaseline: { capturedAtUtc: "2026-07-21T23:59:59.000Z", identity: { dev: "1", ino: "2", size: "0", mtimeNs: "1784678399000000000" }, sha256: emptySha256 },
    observedResets: [],
    after: { dev: "1", ino: "2", size: String(readFileSync(runtimeLogPath).length), mtimeNs: "1784678403000000000" },
    mode: "append_same_identity",
    byteStart: 0,
    byteEnd: readFileSync(runtimeLogPath).length,
    sha256: sha256File(runtimeLogPath),
    line: loadingLine,
    loadingModuleResref: "candidate",
    process,
    requestId: boundRequestId,
  };
  writeJson(requestPath, request);
  writeJson(handoffPath, handoff);
  writeJson(observationPath, observation);
  writeJson(windowPreparationPath, windowPreparation);
  writeJson(runtimeCaptureMetaPath, runtimeCaptureMetadata);
  writeJson(runtimeLogMetaPath, runtimeLogMetadata);

  const toolsetVerdict = verdict("toolset", sha256File(toolsetPngPath), "visible", 20_000);
  const runtimeVerdict = verdict("runtime", sha256File(runtimePngPath), "not_visible", 80_000);
  const toolsetVerdictPath = join(toolsetRoot, "verdict.json");
  const runtimeVerdictPath = join(runtimeRoot, "verdict.json");
  writeJson(toolsetVerdictPath, toolsetVerdict);
  writeJson(runtimeVerdictPath, runtimeVerdict);
  const toolsetPacketPath = join(toolsetRoot, "packet.json");
  writeJson(toolsetPacketPath, {
    version: "aurora-model-proof-120s-toolset-packet/v1",
    profileId: baseProfile.id,
    profileSha256: baseProfileSha256,
    module: baseProfile.installedModule,
    orderedHakList: baseProfile.orderedHakList,
    area: baseProfile.area,
    fixture: baseProfile.fixture,
    capture: { ...identity(toolsetPngPath), width: 640, height: 480, metadataPath: toolsetCaptureMetaPath, metadataSha256: sha256File(toolsetCaptureMetaPath) },
    modelVisibility: "visible",
    proofCompleteness: "verified",
    visualInspection: stripTiming(toolsetVerdict),
  });
  const runtimePacketPath = runtimePacketOutsideRoot ? join(root, "outside-runtime-packet.json") : join(runtimeRoot, "packet.json");
  const runtimePacket = {
    version: "aurora-model-proof-120s-runtime-packet/v1",
    profileId: baseProfile.id,
    profileSha256: baseProfileSha256,
    runtimeProfileId,
    module: baseProfile.installedModule,
    orderedHakList: baseProfile.orderedHakList,
    area: baseProfile.area,
    fixture: baseProfile.fixture,
    request: { path: requestPath, sha256: sha256File(requestPath), requestId: boundRequestId },
    handoff: { path: handoffPath, sha256: sha256File(handoffPath) },
    observation: identity(observationPath),
    windowPreparation: identity(windowPreparationPath),
    process,
    capture: { ...identity(runtimePngPath), metadataPath: runtimeCaptureMetaPath, metadataSha256: sha256File(runtimeCaptureMetaPath) },
    engineLogWindow: { path: runtimeLogPath, sha256: sha256File(runtimeLogPath), metadataPath: runtimeLogMetaPath, metadataSha256: sha256File(runtimeLogMetaPath) },
    modelVisibility: "not_visible",
    proofCompleteness: "verified",
    safety: { usesGlobalInput: false, testModuleCommandCount: 1, changesZOrder: false, changesWindowGeometry: true, saved: false, built: false, repacked: false },
    visualInspection: stripTiming(runtimeVerdict),
  };
  mutateRuntimePacket?.(runtimePacket);
  writeJson(runtimePacketPath, runtimePacket);

  const readyPath = join(outputRoot, "ready.json");
  const ready = {
    ok: true,
    command: "ready",
    status: "MODEL_PROOF_120S_READY",
    profileId: baseProfile.id,
    profileSha256: baseProfileSha256,
    module: { path: moduleIdentity.path, sha256: moduleIdentity.sha256 },
    area: baseProfile.area,
    fixture: baseProfile.fixture,
    resources: [
      { name: "mdl", resref: "m2a_m0p01", type: 2002, hakResref: "diagnostic", hakPath, byteLength: resources["m2a_m0p01:2002"].byteLength, sha256: resources["m2a_m0p01:2002"].sha256 },
      { name: "tga", resref: "m2a_m0t01", type: 3, hakResref: "diagnostic", hakPath, byteLength: resources["m2a_m0t01:3"].byteLength, sha256: resources["m2a_m0t01:3"].sha256 },
      { name: "appearance2da", resref: "appearance", type: 2017, hakResref: "diagnostic", hakPath, byteLength: resources["appearance:2017"].byteLength, sha256: resources["appearance:2017"].sha256 },
    ],
    routeIdentities: [routeIdentity],
    routeManifest: { path: routeManifestPath, sha256: sha256File(routeManifestPath), version: "aurora-model-proof-120s-route-manifest/v1" },
  };
  writeJson(readyPath, ready);

  const statePath = join(outputRoot, "state.json");
  const state = {
    version: "aurora-model-proof-120s-state/v1",
    profileId: baseProfile.id,
    profileSha256: baseProfileSha256,
    status: "finalized",
    dispatches: { "toolset-captured": 1, "record-toolset-visible": 1, "runtime-started": 1, "runtime-captured": 1, "record-runtime-not-visible": 1, finalize: 1 },
    toolsetVerdict: "visible",
    runtimeVerdict: "not_visible",
    artifacts: {
      toolsetCapture: { ...identity(toolsetPngPath), width: 640, height: 480, metadataPath: toolsetCaptureMetaPath, metadataSha256: sha256File(toolsetCaptureMetaPath) },
      toolsetPacket: identity(toolsetPacketPath),
      toolsetVerdict: identity(toolsetVerdictPath),
      runtimeCapture: { ...identity(runtimePngPath), width: 640, height: 480, metadataPath: runtimeCaptureMetaPath, metadataSha256: sha256File(runtimeCaptureMetaPath) },
      runtimeLog: { ...identity(runtimeLogPath), metadataPath: runtimeLogMetaPath, metadataSha256: sha256File(runtimeLogMetaPath) },
      runtimeObservation: identity(observationPath),
      runtimeWindowPreparation: identity(windowPreparationPath),
      runtimePacket: identity(runtimePacketPath),
      runtimeVerdict: identity(runtimeVerdictPath),
    },
    ready: { path: readyPath, sha256: sha256File(readyPath) },
    lastElapsedMs: 89_000,
  };
  if (extraDispatch) state.dispatches["unexpected-extra-dispatch"] = 1;
  if (!omitState) writeJson(statePath, state);

  const finalPacketPath = join(outputRoot, "final-model-proof.json");
  const finalPacket = {
    version: "aurora-model-proof-120s-final/v1",
    status: "pending_qpc_acceptance",
    slo: { hardLimitMs: 120_000, elapsedMs: 89_000, remainingMs: 31_000, expired: false },
    profile: { id: baseProfile.id, path: baseProfilePath, sha256: baseProfileSha256 },
    routes: { manifest: ready.routeManifest, ready: { path: readyPath, sha256: sha256File(readyPath) }, identities: [routeIdentity] },
    candidate: { module: baseProfile.installedModule, orderedHakList: baseProfile.orderedHakList, resources: baseProfile.resources, area: baseProfile.area, fixture: baseProfile.fixture },
    toolset: { verdict: toolsetVerdict, packetPath: toolsetPacketPath, packetSha256: sha256File(toolsetPacketPath) },
    runtime: { verdict: runtimeVerdict, packetPath: runtimePacketPath, packetSha256: sha256File(runtimePacketPath) },
  };
  mutateFinal?.(finalPacket);
  writeJson(finalPacketPath, finalPacket);
  const acceptancePath = join(outputRoot, "final-model-proof.accepted-at-100000.json");
  writeJson(acceptancePath, {
    version: "aurora-model-proof-120s-acceptance/v1",
    status: "verified_if_published_filename_counter_is_within_deadline",
    profileId: baseProfile.id,
    profileSha256: baseProfileSha256,
    finalPacket: identity(finalPacketPath),
    clock: { source: clock.source, frequency: clock.frequency, startCounter: clock.startCounter, deadlineCounter: clock.deadlineCounter, hardLimitMs: clock.hardLimitMs },
  });

  const profilePath = join(root, "diagnostic-profile.json");
  const profile = {
    version: MULTI_FIXTURE_DIAGNOSTIC_PROFILE_VERSION,
    id: "stock-h1-m0-diagnostic",
    hardLimitMs: 120_000,
    proofProfile: { version: MODEL_PROOF_VERSION, ...identity(baseProfilePath) },
    diagnosticBinaryProfile: identity(diagnosticBinaryProfilePath),
    publishedAcceptanceTrustRootId: "central-tri-control-erf-gff-contract-fixture-v1",
    diagnosticContractTrustRootId: "meshy2aurora-tri-control-project-witnesses-v1",
    projectWitnesses: Object.fromEntries(Object.entries(witnessPaths).map(([key, path]) => [key, identity(path)])),
    baseBinding: { installedModule: baseProfile.installedModule, orderedHakList: baseProfile.orderedHakList, resources: baseProfile.resources, area: baseProfile.area, runtime: baseProfile.runtime },
    acceptedBaseRun: { clock: identity(clockPath), finalPacket: identity(finalPacketPath), acceptance: identity(acceptancePath) },
    toolsetTargetFixtureId: "candidate_m0",
    fixtures: [
      { id: "stock_control", templateResRef: "m2a_d_stock", treeObjectText: "Stock c_horror control", occurrence: 0, appearanceRow: 102, modelResref: "c_horror", position: [5, 18, 0], runtimeRoi: { x: 0.05, y: 0.2, width: 0.25, height: 0.65 } },
      { id: "candidate_m0", templateResRef: "m2a_d_m0", treeObjectText: "Exact r31 M0 candidate", occurrence: 0, appearanceRow: 15_100, modelResref: "m2a_m0p01", position: [10, 14.5, 0], runtimeRoi: { x: swapRuntimeRois ? 0.7 : 0.375, y: 0.2, width: 0.25, height: 0.65 } },
      { id: "custom_control_h1", templateResRef: "m2a_d_h1", treeObjectText: "Project-owned H1 v20 control", occurrence: 0, appearanceRow: 15_101, modelResref: "m2a_m6p01", position: [15, 18, 0], runtimeRoi: { x: swapRuntimeRois ? 0.375 : 0.7, y: 0.2, width: 0.25, height: 0.65 } },
    ],
    policy: { singleImmutableRuntimePng: true, failClosedUnreadableRoi: true, diagnosticOnly: true, noAutomaticResolverClaim: true, noAutomaticRendererClaim: true },
  };
  writeJson(profilePath, profile);
  const axesPath = join(root, "fixture-verdicts.json");
  const cropDir = join(root, "runtime-crops");
  const cropsManifestPath = join(cropDir, "crops.json");
  const inspectionInputPath = join(root, "fixture-inspection-input.json");
  const recordedInspectionsPath = join(root, "fixture-inspections.recorded.json");
  const packetPath = join(root, "diagnostic-verdict.json");
  writeJson(axesPath, axes);
  if (omitRuntimePacket) rmSync(runtimePacketPath);
  return {
    root,
    profilePath,
    baseProfilePath,
    diagnosticBinaryProfilePath,
    runtimePngPath,
    runtimePacketPath,
    axesPath,
    cropDir,
    cropsManifestPath,
    inspectionInputPath,
    recordedInspectionsPath,
    packetPath,
  };
}

function buildTriAppearance(r31Appearance, h1Appearance) {
  const h1Text = Buffer.from(h1Appearance).toString("utf8");
  const h1Row = h1Text.split(/\r?\n/u).find((line) => /^15100\s/u.test(line));
  assert.ok(h1Row, "exact_h1_appearance_row_15100_missing");
  const newline = Buffer.from(r31Appearance).includes(Buffer.from("\r\n")) ? "\r\n" : "\n";
  const prefix = Buffer.from(r31Appearance);
  const separator = prefix.toString("utf8").endsWith("\n") ? "" : newline;
  return Buffer.concat([prefix, Buffer.from(`${separator}${h1Row.replace(/^15100/u, "15101")}${newline}`, "utf8")]);
}

function verdict(environment, captureSha256, modelVisibility, elapsedMs) {
  return { environment, captureSha256, modelVisibility, proofCompleteness: "verified", inspection: `${environment} inspection`, recordedAtUtc: "2026-07-22T00:00:00.000Z", elapsed: { elapsedMs, remainingMs: 120_000 - elapsedMs, expired: false } };
}

function stripTiming(value) {
  const { recordedAtUtc: _recordedAtUtc, elapsed: _elapsed, ...rest } = value;
  return rest;
}

function createTriColorPng(width, height) {
  const pixels = Buffer.alloc(width * height * 3);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 3;
      const color = x < width / 3 ? [255, 0, 0] : x < (2 * width) / 3 ? [0, 255, 0] : [0, 0, 255];
      pixels.set(color, offset);
    }
  }
  return createPng(width, height, { pixels });
}

function createPng(width, height, { idat, pixels } = {}) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 2;
  let scanlines = Buffer.alloc(height * (1 + width * 3));
  if (pixels != null) {
    assert.ok(Buffer.isBuffer(pixels));
    assert.equal(pixels.length, width * height * 3);
    for (let row = 0; row < height; row += 1) {
      pixels.copy(scanlines, row * (1 + width * 3) + 1, row * width * 3, (row + 1) * width * 3);
    }
  }
  const compressedBytes = idat ?? deflateSync(scanlines);
  return Buffer.concat([signature, pngChunk("IHDR", header), pngChunk("IDAT", compressedBytes), pngChunk("IEND", Buffer.alloc(0))]);
}

function pngChunk(type, data) {
  const typeBytes = Buffer.from(type, "ascii");
  const result = Buffer.alloc(12 + data.length);
  result.writeUInt32BE(data.length, 0);
  typeBytes.copy(result, 4);
  data.copy(result, 8);
  result.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])), 8 + data.length);
  return result;
}

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function declared(path, withLength = true) {
  const value = identity(path);
  if (!withLength) delete value.byteLength;
  return value;
}

function identity(path) {
  const bytes = readFileSync(path);
  return { path: resolve(path), sha256: sha256(bytes), byteLength: bytes.length };
}

function sha256File(path) {
  return sha256(readFileSync(path));
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function runCli(args) {
  return spawnSync(process.execPath, [cliPath, ...args], { encoding: "utf8" });
}
