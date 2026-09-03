import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, lstatSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { isDeepStrictEqual } from "node:util";
import {
  MODEL_PROOF_VERSION,
  validateModelProofProfile,
} from "./aurora-model-proof-120s-contract.mjs";
import {
  MULTI_FIXTURE_DIAGNOSTIC_MIN_ROI_PIXEL_AREA,
  MULTI_FIXTURE_DIAGNOSTIC_MIN_RUNTIME_HEIGHT,
  MULTI_FIXTURE_DIAGNOSTIC_MIN_RUNTIME_WIDTH,
  validateMultiFixtureDiagnosticProfile,
} from "./aurora-model-proof-120s-multi-fixture-diagnostic-contract.mjs";
import {
  cropDiagnosticRuntimePng,
  decodeDiagnosticRuntimePng,
} from "./aurora-model-proof-120s-multi-fixture-diagnostic-png.mjs";
import { inspectTriControlModuleBytes } from "./aurora-model-proof-120s-erf-gff-readback.mjs";
import {
  loadCanonicalPublishedAcceptanceV1,
  loadOrderedHakResourceIdentity,
  readOrderedHakResourceBytes,
} from "./aurora-model-proof-120s-published-acceptance.mjs";

const SHA256 = /^[a-f0-9]{64}$/u;
const FIXTURE_ID = /^[a-z0-9][a-z0-9_-]{1,63}$/u;
const READABILITY = new Set(["readable", "unreadable"]);
const VISIBILITY = new Set(["visible", "not_visible"]);
const DIAGNOSTIC_CONTRACT_TRUST_ROOTS = Object.freeze({
  "meshy2aurora-tri-control-project-witnesses-v1": Object.freeze({
    baseAppearance: Object.freeze({ byteLength: 6_901_169, sha256: "815c0b3bce0895e9f17d4b92cb02a6d34366267b5a4b9081dece0f4eee7d7a1a" }),
    r31Appearance: Object.freeze({ byteLength: 6_901_360, sha256: "48d313b75761809e2231c99ad51e17d67632c1ce10e70b87fa8b1ccdfbc474a6" }),
    r31Mdl: Object.freeze({ byteLength: 151_328, sha256: "fcfbe7e329d51aef6ccb3ae87b4bfe7db7c5395cd5e8adf24159e73e556b5ab6" }),
    r31Tga: Object.freeze({ byteLength: 12_582_956, sha256: "079bfedbb952ae3f3bbdd43f1bb244eb6247ca92a25d0acad2f3273f9aace59b" }),
    h1Appearance: Object.freeze({ byteLength: 6_901_354, sha256: "e50e2f8c5fc42771f5c433dd3984b0f8e740938d6f722adf838942f1f6342f8e" }),
    h1Mdl: Object.freeze({ byteLength: 557_268, sha256: "6e34e7f7a57ac5ea33897cf64e1f37798e47f9fd632e48827037bb328d193fbd" }),
    h1Tga: Object.freeze({ byteLength: 12_582_956, sha256: "ab8f11c7f448801d905594802a223a1ed5969bc5d09ce06e6588cbe83b6a86b4" }),
  }),
});
export const MULTI_FIXTURE_DIAGNOSTIC_BOUND_VERDICT_VERSION =
  "aurora-model-proof-120s-multi-fixture-diagnostic-bound-verdict/v2";
export const MULTI_FIXTURE_DIAGNOSTIC_CROPS_VERSION =
  "aurora-model-proof-120s-multi-fixture-diagnostic-crops/v1";
export const MULTI_FIXTURE_DIAGNOSTIC_INSPECTION_INPUT_VERSION =
  "aurora-model-proof-120s-multi-fixture-diagnostic-inspection-input/v1";
export const MULTI_FIXTURE_DIAGNOSTIC_RECORDED_INSPECTIONS_VERSION =
  "aurora-model-proof-120s-multi-fixture-diagnostic-recorded-inspections/v1";

export function loadMultiFixtureDiagnosticContext(profilePath) {
  return loadMultiFixtureDiagnosticContextWithDependencies(profilePath, {
    loadPublishedAcceptance: loadCanonicalPublishedAcceptanceV1,
  });
}

function loadMultiFixtureDiagnosticContextWithDependencies(profilePath, dependencies) {
  const resolvedProfilePath = resolve(profilePath);
  const profileBytes = readRequiredFile(resolvedProfilePath, "diagnostic_profile");
  const profile = validateMultiFixtureDiagnosticProfile(parseJson(profileBytes, "diagnostic_profile_json_invalid"));
  requireBaseBindingShape(profile.baseBinding);
  requireArtifactDeclaration(profile.acceptedBaseRun?.clock, "accepted_base_run_clock");
  requireArtifactDeclaration(profile.acceptedBaseRun?.finalPacket, "accepted_base_run_final_packet");
  requireArtifactDeclaration(profile.acceptedBaseRun?.acceptance, "accepted_base_run_acceptance");
  requireArtifactDeclaration(profile.diagnosticBinaryProfile, "diagnostic_binary_profile");

  const baseProfileBytes = readDeclaredArtifact(profile.proofProfile, "base_proof_profile");
  const baseProofProfile = validateModelProofProfile(parseJson(baseProfileBytes, "base_proof_profile_json_invalid"));
  assert.equal(baseProofProfile.version, MODEL_PROOF_VERSION, "multi_fixture_diagnostic_base_version_invalid");
  validateBaseProfileBinding(profile, baseProofProfile);
  const diagnosticBinaryProfileBytes = readDeclaredArtifact(profile.diagnosticBinaryProfile, "diagnostic_binary_profile");
  const diagnosticBinaryProfile = parseJson(diagnosticBinaryProfileBytes, "diagnostic_binary_profile_json_invalid");
  const projectWitnesses = loadProjectWitnesses(profile);
  const diagnosticMaterialization = validateDiagnosticBinaryProfile(profile, baseProofProfile, diagnosticBinaryProfile, projectWitnesses);
  const acceptedBaseRun = loadAcceptedBaseRun(profile, baseProofProfile, dependencies.loadPublishedAcceptance);

  return {
    version: "aurora-model-proof-120s-multi-fixture-diagnostic-context/v1",
    profilePath: resolvedProfilePath,
    profileSha256: sha256(profileBytes),
    profileByteLength: profileBytes.length,
    profile,
    baseProofProfile,
    diagnosticBinaryProfile,
    projectWitnesses: Object.fromEntries(Object.entries(projectWitnesses).map(([key, value]) => [key, artifactIdentityOnly(value)])),
    diagnosticMaterialization,
    acceptedBaseRun,
  };
}

export function buildMultiFixtureDiagnosticCrops({ context, runtimePngPath, cropDir }) {
  return buildMultiFixtureDiagnosticCropsWithDependencies({ context, runtimePngPath, cropDir }, {
    loadPublishedAcceptance: loadCanonicalPublishedAcceptanceV1,
  });
}

function buildMultiFixtureDiagnosticCropsWithDependencies({ context, runtimePngPath, cropDir }, dependencies) {
  const fresh = reloadContext(context, dependencies);
  const runtime = loadBoundRuntimePng(fresh, runtimePngPath);
  const resolvedCropDir = resolve(cropDir);
  assert.equal(pathOccupied(resolvedCropDir), false, `diagnostic_crop_dir_exists:${resolvedCropDir}`);
  const cropParent = dirname(resolvedCropDir);
  assert.ok(pathOccupied(cropParent) && lstatSync(cropParent).isDirectory(), `diagnostic_crop_parent_missing:${cropParent}`);
  assert.equal(lstatSync(cropParent).isSymbolicLink(), false, `diagnostic_crop_parent_reparse_point:${cropParent}`);
  dependencies.beforeCreateCropDir?.(resolvedCropDir);
  try {
    mkdirSync(resolvedCropDir, { recursive: false });
  } catch (error) {
    if (error?.code === "EEXIST") throw new Error(`diagnostic_crop_dir_race:${resolvedCropDir}`);
    throw error;
  }
  const materializedById = new Map(fresh.diagnosticMaterialization.fixtures.map((fixture) => [fixture.fixtureId, fixture]));
  const fixtures = fresh.profile.fixtures.map((fixture, index) => {
    const role = materializedById.get(fixture.id)?.role;
    assert.ok(String(role ?? "").trim(), `diagnostic_crop_fixture_role_missing:${fixture.id}`);
    const pixelCoordinates = normalizedRoiToPixels(fixture.runtimeRoi, runtime.decoded.width, runtime.decoded.height);
    assert.ok(pixelCoordinates.area >= MULTI_FIXTURE_DIAGNOSTIC_MIN_ROI_PIXEL_AREA, `fixture_runtime_roi_pixel_area_too_small:${fixture.id}`);
    const cropBytes = cropDiagnosticRuntimePng(runtime.decoded, pixelCoordinates);
    const cropPath = join(resolvedCropDir, `${String(index + 1).padStart(2, "0")}-${fixture.id}.png`);
    writeFileSync(cropPath, cropBytes, { flag: "wx" });
    return {
      fixtureId: fixture.id,
      role,
      position: structuredClone(fixture.position),
      runtimeRoi: structuredClone(fixture.runtimeRoi),
      pixelCoordinates,
      sourcePngSha256: runtime.sha256,
      crop: {
        path: cropPath,
        sha256: sha256(cropBytes),
        byteLength: cropBytes.length,
        width: pixelCoordinates.width,
        height: pixelCoordinates.height,
      },
    };
  });
  requireNonOverlappingPixelRois(fixtures.map((fixture) => ({ fixtureId: fixture.fixtureId, runtimeRoiPixels: fixture.pixelCoordinates })));
  const manifest = {
    version: MULTI_FIXTURE_DIAGNOSTIC_CROPS_VERSION,
    status: "deterministic_lossless_crops_built",
    admissibility: { status: "awaiting_bound_visual_inspections", admissible: false },
    profile: { id: fresh.profile.id, path: fresh.profilePath, sha256: fresh.profileSha256 },
    runtimeCapture: {
      path: runtime.path,
      sha256: runtime.sha256,
      byteLength: runtime.bytes.length,
      width: runtime.decoded.width,
      height: runtime.decoded.height,
    },
    cropDirectory: resolvedCropDir,
    fixtures,
  };
  const manifestPath = join(resolvedCropDir, "crops.json");
  const manifestBytes = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  writeFileSync(manifestPath, manifestBytes, { flag: "wx" });
  return { manifest, manifestPath, manifestSha256: sha256(manifestBytes), manifestByteLength: manifestBytes.length };
}

export function recordBoundMultiFixtureDiagnosticInspections({ context, runtimePngPath, cropsManifestPath, inspectionInputPath }) {
  return recordBoundMultiFixtureDiagnosticInspectionsWithDependencies({ context, runtimePngPath, cropsManifestPath, inspectionInputPath }, {
    loadPublishedAcceptance: loadCanonicalPublishedAcceptanceV1,
  });
}

function recordBoundMultiFixtureDiagnosticInspectionsWithDependencies({ context, runtimePngPath, cropsManifestPath, inspectionInputPath }, dependencies) {
  const fresh = reloadContext(context, dependencies);
  const crops = loadAndValidateCropManifest({ fresh, runtimePngPath, cropsManifestPath });
  const inputPath = resolve(inspectionInputPath);
  const inputBytes = readRequiredFile(inputPath, "fixture_inspection_input");
  const input = parseJson(inputBytes, "fixture_inspection_input_json_invalid");
  assert.ok(input && !Array.isArray(input), "axes_only_fixture_verdicts_non_admissible");
  assert.equal(input.version, MULTI_FIXTURE_DIAGNOSTIC_INSPECTION_INPUT_VERSION, "fixture_inspection_input_version_invalid");
  assert.deepEqual(
    Object.keys(input).sort(),
    ["cropsManifestSha256", "fixtures", "runtimeCaptureSha256", "version"],
    "fixture_inspection_input_fields_invalid",
  );
  assert.equal(input.runtimeCaptureSha256, crops.manifest.runtimeCapture.sha256, "fixture_inspection_runtime_hash_mismatch");
  assert.equal(input.cropsManifestSha256, crops.sha256, "fixture_inspection_crops_manifest_hash_mismatch");
  assert.ok(Array.isArray(input.fixtures), "fixture_inspection_entries_invalid");
  assert.equal(input.fixtures.length, crops.manifest.fixtures.length, "fixture_inspection_count_invalid");
  const inputById = new Map();
  for (const entry of input.fixtures) {
    assert.match(entry?.fixtureId ?? "", FIXTURE_ID, "fixture_inspection_id_invalid");
    assert.ok(!inputById.has(entry.fixtureId), `fixture_inspection_duplicate:${entry.fixtureId}`);
    const exactKeys = ["cropSha256", "fixtureId", "modelVisibility", "roiReadability", "visualInspection"];
    assert.deepEqual(Object.keys(entry).sort(), exactKeys, `fixture_inspection_fields_invalid:${entry.fixtureId}`);
    assert.match(entry.cropSha256 ?? "", SHA256, `fixture_inspection_crop_hash_invalid:${entry.fixtureId}`);
    assert.ok(READABILITY.has(entry.roiReadability), `fixture_roi_readability_invalid:${entry.fixtureId}`);
    assert.ok(String(entry.visualInspection ?? "").trim(), `fixture_visual_inspection_required:${entry.fixtureId}`);
    if (entry.roiReadability === "readable") {
      assert.ok(VISIBILITY.has(entry.modelVisibility), `readable_roi_requires_visual_verdict:${entry.fixtureId}`);
    } else {
      assert.equal(entry.modelVisibility, "not_tested", `unreadable_roi_requires_not_tested:${entry.fixtureId}`);
    }
    inputById.set(entry.fixtureId, entry);
  }
  const fixtures = crops.manifest.fixtures.map((crop) => {
    const entry = inputById.get(crop.fixtureId);
    assert.ok(entry, `fixture_inspection_missing:${crop.fixtureId}`);
    assert.equal(entry.cropSha256, crop.crop.sha256, `fixture_inspection_crop_hash_mismatch:${crop.fixtureId}`);
    return {
      fixtureId: crop.fixtureId,
      role: crop.role,
      position: structuredClone(crop.position),
      pixelCoordinates: structuredClone(crop.pixelCoordinates),
      sourcePngSha256: crop.sourcePngSha256,
      crop: structuredClone(crop.crop),
      roiReadability: entry.roiReadability,
      modelVisibility: entry.roiReadability === "readable" ? entry.modelVisibility : "not_tested",
      proofCompleteness: entry.roiReadability === "readable" ? "verified" : "missing",
      visualInspection: String(entry.visualInspection).trim(),
    };
  });
  assert.equal(inputById.size, fixtures.length, "fixture_inspection_count_invalid");
  return {
    version: MULTI_FIXTURE_DIAGNOSTIC_RECORDED_INSPECTIONS_VERSION,
    status: "crop_bound_visual_inspections_recorded",
    admissibility: { status: "bound_to_exact_crop_hashes", admissible: true, automaticClassification: false },
    profile: { id: fresh.profile.id, path: fresh.profilePath, sha256: fresh.profileSha256 },
    runtimeCaptureSha256: crops.manifest.runtimeCapture.sha256,
    cropsManifest: { path: crops.path, sha256: crops.sha256, byteLength: crops.bytes.length },
    inspectionInput: { path: inputPath, sha256: sha256(inputBytes), byteLength: inputBytes.length },
    fixtures,
  };
}

export function buildBoundMultiFixtureDiagnosticVerdict({ context, runtimePngPath, cropsManifestPath, fixtureInspectionsPath }) {
  return buildBoundMultiFixtureDiagnosticVerdictWithDependencies({ context, runtimePngPath, cropsManifestPath, fixtureInspectionsPath }, {
    loadPublishedAcceptance: loadCanonicalPublishedAcceptanceV1,
  });
}

function buildBoundMultiFixtureDiagnosticVerdictWithDependencies({ context, runtimePngPath, cropsManifestPath, fixtureInspectionsPath }, dependencies) {
  const fresh = reloadContext(context, dependencies);
  const crops = loadAndValidateCropManifest({ fresh, runtimePngPath, cropsManifestPath });
  const inspections = loadAndValidateRecordedInspections({
    fresh,
    runtimePngPath,
    cropsManifestPath,
    fixtureInspectionsPath,
  }, dependencies);
  const verdict = buildAdmissibleBoundVerdict({
    profile: fresh.profile,
    runtime: crops.runtime,
    crops,
    inspections,
  });
  requireNonOverlappingPixelRois(verdict.fixtureVerdicts);

  return {
    ...verdict,
    profile: {
      version: fresh.profile.version,
      id: fresh.profile.id,
      path: fresh.profilePath,
      sha256: fresh.profileSha256,
      byteLength: fresh.profileByteLength,
      baseProofProfile: {
        version: fresh.baseProofProfile.version,
        id: fresh.baseProofProfile.id,
        path: resolve(fresh.profile.proofProfile.path),
        sha256: fresh.profile.proofProfile.sha256,
        byteLength: fresh.profile.proofProfile.byteLength,
      },
      diagnosticBinaryProfile: {
        path: resolve(fresh.profile.diagnosticBinaryProfile.path),
        sha256: fresh.profile.diagnosticBinaryProfile.sha256,
        byteLength: fresh.profile.diagnosticBinaryProfile.byteLength,
      },
    },
    diagnosticMaterialization: structuredClone(fresh.diagnosticMaterialization),
    acceptedBaseRun: acceptedRunPacketBinding(fresh.acceptedBaseRun),
    runtimeCapture: {
      ...verdict.runtimeCapture,
      bitDepth: crops.runtime.decoded.bitDepth,
      colorType: crops.runtime.decoded.colorType,
      bytesPerPixel: crops.runtime.decoded.bytesPerPixel,
      decodedByteLength: crops.runtime.decoded.decodedByteLength,
    },
    cropsManifest: { path: crops.path, sha256: crops.sha256, byteLength: crops.bytes.length },
    fixtureInspectionsSource: { path: inspections.path, sha256: inspections.sha256, byteLength: inspections.bytes.length },
  };
}

export function validateBoundMultiFixtureDiagnosticVerdict({ context, runtimePngPath, cropsManifestPath, fixtureInspectionsPath, packetPath }) {
  return validateBoundMultiFixtureDiagnosticVerdictWithDependencies({ context, runtimePngPath, cropsManifestPath, fixtureInspectionsPath, packetPath }, {
    loadPublishedAcceptance: loadCanonicalPublishedAcceptanceV1,
  });
}

function validateBoundMultiFixtureDiagnosticVerdictWithDependencies({ context, runtimePngPath, cropsManifestPath, fixtureInspectionsPath, packetPath }, dependencies) {
  const fresh = reloadContext(context, dependencies);
  const resolvedPacketPath = resolve(packetPath);
  const packetBytes = readRequiredFile(resolvedPacketPath, "diagnostic_verdict_packet");
  const packet = parseJson(packetBytes, "diagnostic_verdict_packet_json_invalid");
  assert.equal(packet?.profile?.sha256, fresh.profileSha256, "diagnostic_profile_hash_mismatch");
  assert.equal(packet?.profile?.baseProofProfile?.sha256, fresh.profile.proofProfile.sha256, "base_proof_profile_hash_mismatch");

  const runtimePngBytes = readRequiredFile(resolve(runtimePngPath), "runtime_png");
  assert.equal(packet?.runtimeCapture?.sha256, sha256(runtimePngBytes), "runtime_png_source_hash_mismatch");
  const cropsManifestBytes = readRequiredFile(resolve(cropsManifestPath), "diagnostic_crops_manifest");
  assert.equal(packet?.cropsManifest?.sha256, sha256(cropsManifestBytes), "diagnostic_crops_manifest_source_hash_mismatch");
  const fixtureInspectionsBytes = readRequiredFile(resolve(fixtureInspectionsPath), "fixture_inspections");
  assert.equal(packet?.fixtureInspectionsSource?.sha256, sha256(fixtureInspectionsBytes), "fixture_inspections_source_hash_mismatch");
  const expected = buildBoundMultiFixtureDiagnosticVerdictWithDependencies({
    context: fresh,
    runtimePngPath,
    cropsManifestPath,
    fixtureInspectionsPath,
  }, dependencies);
  assert.ok(isDeepStrictEqual(packet, expected), "diagnostic_verdict_packet_drift");
  return {
    packet,
    packetPath: resolvedPacketPath,
    packetSha256: sha256(packetBytes),
    packetByteLength: packetBytes.length,
    profileSha256: fresh.profileSha256,
    runtimePngSha256: sha256(runtimePngBytes),
    cropsManifestSha256: sha256(cropsManifestBytes),
    fixtureInspectionsSha256: sha256(fixtureInspectionsBytes),
  };
}

function loadBoundRuntimePng(fresh, runtimePngPath) {
  const resolvedRuntimePngPath = resolve(runtimePngPath);
  assert.equal(
    normalizedPath(resolvedRuntimePngPath),
    normalizedPath(fresh.acceptedBaseRun.runtime.capture.path),
    "runtime_png_not_accepted_runtime_capture",
  );
  const runtimePngBytes = readRequiredFile(resolvedRuntimePngPath, "runtime_png");
  const runtimePngSha256 = sha256(runtimePngBytes);
  assert.equal(runtimePngSha256, fresh.acceptedBaseRun.runtime.capture.sha256, "runtime_png_not_accepted_runtime_capture_hash");
  assert.equal(runtimePngBytes.length, fresh.acceptedBaseRun.runtime.capture.byteLength, "runtime_png_not_accepted_runtime_capture_length");
  const decodedPng = decodeDiagnosticRuntimePng(runtimePngBytes);
  assert.ok(
    decodedPng.width >= MULTI_FIXTURE_DIAGNOSTIC_MIN_RUNTIME_WIDTH
      && decodedPng.height >= MULTI_FIXTURE_DIAGNOSTIC_MIN_RUNTIME_HEIGHT,
    `runtime_png_dimensions_too_small:${decodedPng.width}x${decodedPng.height}`,
  );
  return { path: resolvedRuntimePngPath, bytes: runtimePngBytes, sha256: runtimePngSha256, decoded: decodedPng };
}

function loadAndValidateCropManifest({ fresh, runtimePngPath, cropsManifestPath }) {
  const runtime = loadBoundRuntimePng(fresh, runtimePngPath);
  const manifestPath = resolve(cropsManifestPath);
  assert.equal(basename(manifestPath), "crops.json", "diagnostic_crops_manifest_filename_invalid");
  const manifestBytes = readRequiredFile(manifestPath, "diagnostic_crops_manifest");
  const manifest = parseJson(manifestBytes, "diagnostic_crops_manifest_json_invalid");
  const cropDirectory = dirname(manifestPath);
  const materializedById = new Map(fresh.diagnosticMaterialization.fixtures.map((fixture) => [fixture.fixtureId, fixture]));
  const fixtures = fresh.profile.fixtures.map((fixture, index) => {
    const role = materializedById.get(fixture.id)?.role;
    assert.ok(String(role ?? "").trim(), `diagnostic_crop_fixture_role_missing:${fixture.id}`);
    const pixelCoordinates = normalizedRoiToPixels(fixture.runtimeRoi, runtime.decoded.width, runtime.decoded.height);
    assert.ok(pixelCoordinates.area >= MULTI_FIXTURE_DIAGNOSTIC_MIN_ROI_PIXEL_AREA, `fixture_runtime_roi_pixel_area_too_small:${fixture.id}`);
    const cropPath = join(cropDirectory, `${String(index + 1).padStart(2, "0")}-${fixture.id}.png`);
    const cropBytes = readRequiredFile(cropPath, `diagnostic_crop:${fixture.id}`);
    assert.equal(lstatSync(cropPath).isSymbolicLink(), false, `diagnostic_crop_reparse_point:${fixture.id}`);
    const expectedCropBytes = cropDiagnosticRuntimePng(runtime.decoded, pixelCoordinates);
    assert.ok(cropBytes.equals(expectedCropBytes), `diagnostic_crop_pixels_mismatch:${fixture.id}`);
    const decodedCrop = decodeDiagnosticRuntimePng(cropBytes);
    assert.equal(decodedCrop.width, pixelCoordinates.width, `diagnostic_crop_width_mismatch:${fixture.id}`);
    assert.equal(decodedCrop.height, pixelCoordinates.height, `diagnostic_crop_height_mismatch:${fixture.id}`);
    return {
      fixtureId: fixture.id,
      role,
      position: structuredClone(fixture.position),
      runtimeRoi: structuredClone(fixture.runtimeRoi),
      pixelCoordinates,
      sourcePngSha256: runtime.sha256,
      crop: {
        path: cropPath,
        sha256: sha256(cropBytes),
        byteLength: cropBytes.length,
        width: decodedCrop.width,
        height: decodedCrop.height,
      },
    };
  });
  requireNonOverlappingPixelRois(fixtures.map((fixture) => ({ fixtureId: fixture.fixtureId, runtimeRoiPixels: fixture.pixelCoordinates })));
  const expectedManifest = {
    version: MULTI_FIXTURE_DIAGNOSTIC_CROPS_VERSION,
    status: "deterministic_lossless_crops_built",
    admissibility: { status: "awaiting_bound_visual_inspections", admissible: false },
    profile: { id: fresh.profile.id, path: fresh.profilePath, sha256: fresh.profileSha256 },
    runtimeCapture: {
      path: runtime.path,
      sha256: runtime.sha256,
      byteLength: runtime.bytes.length,
      width: runtime.decoded.width,
      height: runtime.decoded.height,
    },
    cropDirectory,
    fixtures,
  };
  requireEqual(manifest, expectedManifest, "diagnostic_crops_manifest_drift");
  return { manifest, path: manifestPath, bytes: manifestBytes, sha256: sha256(manifestBytes), runtime };
}

function loadAndValidateRecordedInspections({ fresh, runtimePngPath, cropsManifestPath, fixtureInspectionsPath }, dependencies) {
  const inspectionPath = resolve(fixtureInspectionsPath);
  const inspectionBytes = readRequiredFile(inspectionPath, "fixture_inspections");
  const value = parseJson(inspectionBytes, "fixture_inspections_json_invalid");
  assert.ok(value && !Array.isArray(value), "axes_only_fixture_verdicts_non_admissible");
  assert.equal(value.version, MULTI_FIXTURE_DIAGNOSTIC_RECORDED_INSPECTIONS_VERSION, "fixture_inspections_version_invalid");
  assert.ok(typeof value.inspectionInput?.path === "string", "fixture_inspections_input_path_invalid");
  const expected = recordBoundMultiFixtureDiagnosticInspectionsWithDependencies({
    context: fresh,
    runtimePngPath,
    cropsManifestPath,
    inspectionInputPath: value.inspectionInput.path,
  }, dependencies);
  assert.ok(isDeepStrictEqual(value, expected), "fixture_inspections_drift");
  return { value, path: inspectionPath, bytes: inspectionBytes, sha256: sha256(inspectionBytes) };
}

function reloadContext(context, dependencies) {
  assert.equal(context?.version, "aurora-model-proof-120s-multi-fixture-diagnostic-context/v1", "diagnostic_context_invalid");
  const fresh = loadMultiFixtureDiagnosticContextWithDependencies(context.profilePath, dependencies);
  assert.equal(fresh.profileSha256, context.profileSha256, "diagnostic_context_profile_drift");
  return fresh;
}

function validateBaseProfileBinding(profile, baseProofProfile) {
  requireEqual(profile.baseBinding.installedModule, baseProofProfile.installedModule, "diagnostic_base_module_mismatch");
  requireEqual(profile.baseBinding.orderedHakList, baseProofProfile.orderedHakList, "diagnostic_base_ordered_haks_mismatch");
  requireEqual(profile.baseBinding.area, baseProofProfile.area, "diagnostic_base_area_mismatch");
  requireEqual(profile.baseBinding.resources, baseProofProfile.resources, "diagnostic_base_resources_mismatch");
  requireEqual(profile.baseBinding.runtime, baseProofProfile.runtime, "diagnostic_base_runtime_mismatch");

  const target = profile.fixtures.find((fixture) => fixture.id === profile.toolsetTargetFixtureId);
  const targetBinding = {
    id: target.id,
    templateResRef: target.templateResRef,
    treeObjectText: target.treeObjectText,
    occurrence: target.occurrence,
    appearanceRow: target.appearanceRow,
    position: target.position,
    modelResref: target.modelResref,
  };
  const expected = {
    ...baseProofProfile.fixture,
    modelResref: baseProofProfile.resources.mdl.resref,
  };
  requireEqual(targetBinding, expected, "diagnostic_target_base_fixture_mismatch");
}

function loadAcceptedBaseRun(profile, baseProofProfile, loadPublishedAcceptance) {
  assert.equal(typeof loadPublishedAcceptance, "function", "diagnostic_published_acceptance_loader_invalid");
  const accepted = loadPublishedAcceptance({
    profilePath: resolve(profile.proofProfile.path),
    trustRootId: profile.publishedAcceptanceTrustRootId,
  });
  assert.equal(accepted.profile.id, baseProofProfile.id, "accepted_base_run_profile_id_mismatch");
  for (const [key, actual] of [
    ["clock", accepted.clock],
    ["finalPacket", accepted.finalPacket],
    ["acceptance", accepted.acceptance],
  ]) {
    requireEqual(
      artifactIdentityOnly(profile.acceptedBaseRun[key]),
      artifactIdentityOnly(actual),
      `accepted_base_run_${key}_declaration_mismatch`,
    );
  }
  return accepted;
}

export function __createMultiFixtureDiagnosticBindingForTests(loadPublishedAcceptance, hooks = {}) {
  assert.equal(typeof loadPublishedAcceptance, "function", "diagnostic_test_acceptance_loader_invalid");
  assert.ok(hooks && typeof hooks === "object" && !Array.isArray(hooks), "diagnostic_test_hooks_invalid");
  assert.ok(hooks.beforeCreateCropDir == null || typeof hooks.beforeCreateCropDir === "function", "diagnostic_test_crop_hook_invalid");
  const dependencies = Object.freeze({ loadPublishedAcceptance, beforeCreateCropDir: hooks.beforeCreateCropDir });
  return Object.freeze({
    loadMultiFixtureDiagnosticContext: (profilePath) => loadMultiFixtureDiagnosticContextWithDependencies(profilePath, dependencies),
    buildMultiFixtureDiagnosticCrops: (options) => buildMultiFixtureDiagnosticCropsWithDependencies(options, dependencies),
    recordBoundMultiFixtureDiagnosticInspections: (options) => recordBoundMultiFixtureDiagnosticInspectionsWithDependencies(options, dependencies),
    buildBoundMultiFixtureDiagnosticVerdict: (options) => buildBoundMultiFixtureDiagnosticVerdictWithDependencies(options, dependencies),
    validateBoundMultiFixtureDiagnosticVerdict: (options) => validateBoundMultiFixtureDiagnosticVerdictWithDependencies(options, dependencies),
  });
}

function acceptedRunPacketBinding(accepted) {
  return {
    clock: artifactIdentityOnly(accepted.clock),
    state: artifactIdentityOnly(accepted.state),
    ready: artifactIdentityOnly(accepted.ready),
    finalPacket: artifactIdentityOnly(accepted.finalPacket),
    acceptance: artifactIdentityOnly(accepted.acceptance),
    runtimePacket: artifactIdentityOnly(accepted.runtime.packet),
    publishCounter: accepted.publishCounter,
    elapsedMs: accepted.elapsed.elapsedMs,
    remainingMs: accepted.elapsed.remainingMs,
    deadlineCounter: accepted.clock.value.deadlineCounter,
    hardLimitMs: accepted.clock.value.hardLimitMs,
    expired: accepted.elapsed.expired,
  };
}

// Intentionally private: only buildBoundMultiFixtureDiagnosticVerdict can emit
// this admissible packet version after reloading every immutable binding.
function buildAdmissibleBoundVerdict({ profile, runtime, crops, inspections }) {
  const validatedProfile = validateMultiFixtureDiagnosticProfile(profile);
  assert.ok(runtime && Buffer.isBuffer(runtime.bytes), "single_runtime_png_required");
  assert.equal(runtime.sha256, sha256(runtime.bytes), "runtime_png_hash_mismatch");
  assert.equal(crops.manifest.runtimeCapture.sha256, runtime.sha256, "diagnostic_crops_runtime_hash_mismatch");
  assert.equal(inspections.value.runtimeCaptureSha256, runtime.sha256, "fixture_inspections_runtime_hash_mismatch");
  assert.equal(inspections.value.cropsManifest.sha256, crops.sha256, "fixture_inspections_crops_manifest_hash_mismatch");
  const fixturesById = new Map(validatedProfile.fixtures.map((fixture) => [fixture.id, fixture]));
  const cropsById = new Map(crops.manifest.fixtures.map((fixture) => [fixture.fixtureId, fixture]));
  const inspectionsById = new Map(inspections.value.fixtures.map((fixture) => [fixture.fixtureId, fixture]));
  const normalizedVerdicts = validatedProfile.fixtures.map((fixture) => {
    const crop = cropsById.get(fixture.id);
    const inspection = inspectionsById.get(fixture.id);
    assert.ok(crop, `diagnostic_crop_fixture_missing:${fixture.id}`);
    assert.ok(inspection, `fixture_inspection_missing:${fixture.id}`);
    return {
      fixtureId: fixture.id,
      role: crop.role,
      templateResRef: fixture.templateResRef,
      treeObjectText: String(fixture.treeObjectText).trim(),
      occurrence: fixture.occurrence,
      appearanceRow: fixture.appearanceRow,
      modelResref: fixture.modelResref,
      position: structuredClone(fixture.position),
      runtimeRoi: structuredClone(fixture.runtimeRoi),
      runtimeRoiPixels: structuredClone(crop.pixelCoordinates),
      crop: structuredClone(crop.crop),
      roiReadability: inspection.roiReadability,
      modelVisibility: inspection.modelVisibility,
      proofCompleteness: inspection.proofCompleteness,
      visualInspection: inspection.visualInspection,
      captureSha256: runtime.sha256,
    };
  });
  const toolsetFixture = fixturesById.get(validatedProfile.toolsetTargetFixtureId);
  return {
    version: MULTI_FIXTURE_DIAGNOSTIC_BOUND_VERDICT_VERSION,
    profile: { version: validatedProfile.version, id: validatedProfile.id },
    hardLimitMs: 120_000,
    admissibility: {
      status: "bound_to_canonical_published_acceptance_and_recorded_crop_inspections",
      unboundBuilderAvailable: false,
      automaticClassification: false,
    },
    toolsetTarget: fixtureIdentity(toolsetFixture),
    runtimeCapture: {
      count: 1,
      format: "png",
      immutable: true,
      path: runtime.path,
      sha256: runtime.sha256,
      byteLength: runtime.bytes.length,
      width: runtime.decoded.width,
      height: runtime.decoded.height,
    },
    fixtureVerdicts: normalizedVerdicts,
    diagnosticOutcomeMatrix: {
      classification: "diagnostic_observation_only",
      completeness: normalizedVerdicts.every((verdict) => verdict.proofCompleteness === "verified") ? "verified" : "missing",
      automaticResolverClaim: false,
      automaticRendererClaim: false,
      resolverConclusion: "not_established",
      rendererConclusion: "not_established",
      rows: normalizedVerdicts.map(({ fixtureId, roiReadability, modelVisibility, proofCompleteness }) => ({ fixtureId, roiReadability, modelVisibility, proofCompleteness })),
    },
  };
}

function loadProjectWitnesses(profile) {
  const trustRoot = DIAGNOSTIC_CONTRACT_TRUST_ROOTS[profile.diagnosticContractTrustRootId];
  assert.ok(trustRoot, `diagnostic_contract_trust_root_unknown:${profile.diagnosticContractTrustRootId}`);
  return Object.fromEntries(Object.entries(trustRoot).map(([key, expected]) => {
    const declaration = profile.projectWitnesses?.[key];
    requireEqual(
      { sha256: declaration?.sha256, byteLength: declaration?.byteLength },
      expected,
      `diagnostic_project_witness_trust_root_mismatch:${key}`,
    );
    const bytes = readDeclaredArtifact(declaration, `diagnostic_project_witness:${key}`);
    return [key, { ...artifactIdentityOnly(declaration), bytes }];
  }));
}

function validateDiagnosticBinaryProfile(outer, base, binary, projectWitnesses) {
  assert.equal(binary?.schemaVersion, 1, "diagnostic_binary_schema_version_invalid");
  assert.equal(binary?.profile, "M2A_PROJECT_DIRECT_CREATURE_TRI_CONTROL_DIAGNOSTIC_V1", "diagnostic_binary_profile_kind_invalid");
  for (const [key, expected] of [["diagnosticOnly", true], ["runtimeAdmissible", false], ["resolverVerified", false], ["rendererVerified", false]]) {
    assert.equal(binary?.[key], expected, `diagnostic_binary_profile_policy_invalid:${key}`);
  }
  assert.equal(binary?.moduleIdentity?.moduleResref, base.runtime.loadingModuleResref, "diagnostic_binary_module_resref_mismatch");
  assert.equal(binary?.moduleIdentity?.areaResref, base.area.resref, "diagnostic_binary_area_resref_mismatch");
  assert.equal(base.orderedHakList.length, 1, "diagnostic_binary_requires_single_hak");
  assert.equal(binary?.moduleIdentity?.hakResref, base.orderedHakList[0].resref, "diagnostic_binary_hak_resref_mismatch");
  requireByteIdentity(binary?.module, base.installedModule, "diagnostic_binary_module_identity_mismatch");
  const parsedModuleReadback = inspectTriControlModuleBytes(readRequiredFile(resolve(base.installedModule.path), "diagnostic_installed_module"));
  requireEqual(parsedModuleReadback, binary?.moduleReadback, "diagnostic_binary_claimed_module_readback_mismatch");
  assert.equal(binary?.moduleReadback?.moduleResref, base.runtime.loadingModuleResref, "diagnostic_binary_readback_module_mismatch");
  assert.equal(binary?.moduleReadback?.schemaVersion, 1, "diagnostic_binary_readback_schema_version_invalid");
  assert.equal(binary?.moduleReadback?.areaResref, base.area.resref, "diagnostic_binary_readback_area_mismatch");
  requireEqual(binary?.moduleReadback?.orderedHakResrefs, base.orderedHakList.map((hak) => hak.resref), "diagnostic_binary_readback_haks_mismatch");
  requireVectorOrObjectEqual(binary?.moduleReadback?.entryPosition, base.area.entryPoint, "diagnostic_binary_entry_position_mismatch");

  const hak = binary?.hakContract;
  assert.equal(hak?.schemaVersion, 1, "diagnostic_hak_schema_version_invalid");
  assert.equal(hak?.profile, "M2A_PROJECT_TRI_CONTROL_HAK_DIAGNOSTIC_V1", "diagnostic_hak_profile_kind_invalid");
  for (const [key, expected] of [["diagnosticOnly", true], ["runtimeAdmissible", false], ["resolverVerified", false], ["rendererVerified", false]]) {
    assert.equal(hak?.[key], expected, `diagnostic_hak_policy_invalid:${key}`);
  }
  requireByteIdentity(hak?.hak, base.orderedHakList[0], "diagnostic_hak_identity_mismatch");
  assert.ok(Array.isArray(hak?.resources), "diagnostic_hak_resources_invalid");
  const resourceKeys = hak.resources.map((resource) => `${resource.resref}:${resource.resourceType}`);
  const expectedResourceKeys = ["appearance:2017", "m2a_m0p01:2002", "m2a_m0t01:3", "m2a_m6p01:2002", "m2a_m6t01:3"];
  requireEqual(resourceKeys, expectedResourceKeys, "diagnostic_hak_resource_order_mismatch");
  requireEqual(
    hak?.resourceOrder?.map((resource) => `${resource.resref}:${resource.resourceType}`),
    expectedResourceKeys,
    "diagnostic_hak_declared_resource_order_mismatch",
  );
  for (const [name, identity] of [["base", hak?.baseAppearance], ["h1_source", hak?.h1SourceAppearance], ["materialized", hak?.appearance]]) {
    assert.match(identity?.sha256 ?? "", SHA256, `diagnostic_${name}_appearance_hash_invalid`);
    assert.ok(Number.isInteger(identity?.byteLength) && identity.byteLength > 0, `diagnostic_${name}_appearance_length_invalid`);
  }
  for (const [index, resource] of hak.resources.entries()) {
    assert.match(resource?.sha256 ?? "", SHA256, `diagnostic_hak_resource_hash_invalid:${index}`);
    assert.ok(Number.isInteger(resource?.byteLength) && resource.byteLength > 0, `diagnostic_hak_resource_length_invalid:${index}`);
    const actual = loadOrderedHakResourceIdentity(base.orderedHakList, resource.resref, resource.resourceType);
    requireEqual(
      { byteLength: actual.byteLength, sha256: actual.sha256 },
      { byteLength: resource.byteLength, sha256: resource.sha256 },
      `diagnostic_hak_resource_bytes_mismatch:${resource.resref}:${resource.resourceType}`,
    );
  }
  const resources = new Map(hak.resources.map((resource) => [`${resource.resref}:${resource.resourceType}`, resource]));
  requireByteIdentity(hak.appearance, resources.get("appearance:2017"), "diagnostic_materialized_appearance_identity_mismatch");
  assert.equal(resources.get("appearance:2017").sha256, base.resources.appearance2da.sha256, "diagnostic_appearance_resource_hash_mismatch");
  assert.equal(resources.get("m2a_m0p01:2002").sha256, base.resources.mdl.sha256, "diagnostic_m0_mdl_hash_mismatch");
  assert.equal(resources.get("m2a_m0t01:3").sha256, base.resources.tga.sha256, "diagnostic_m0_tga_hash_mismatch");
  requireByteIdentity(resources.get("m2a_m0p01:2002"), projectWitnesses.r31Mdl, "diagnostic_r31_mdl_witness_mismatch");
  requireByteIdentity(resources.get("m2a_m0t01:3"), projectWitnesses.r31Tga, "diagnostic_r31_tga_witness_mismatch");
  requireByteIdentity(resources.get("m2a_m6p01:2002"), projectWitnesses.h1Mdl, "diagnostic_h1_mdl_witness_mismatch");
  requireByteIdentity(resources.get("m2a_m6t01:3"), projectWitnesses.h1Tga, "diagnostic_h1_tga_witness_mismatch");
  requireByteIdentity(hak.baseAppearance, projectWitnesses.baseAppearance, "diagnostic_base_appearance_witness_mismatch");
  requireByteIdentity(hak.h1SourceAppearance, projectWitnesses.h1Appearance, "diagnostic_h1_appearance_witness_mismatch");
  const materializedAppearanceBytes = readOrderedHakResourceBytes(base.orderedHakList, "appearance", 2017);
  validateMaterializedAppearanceDerivation(materializedAppearanceBytes, projectWitnesses.r31Appearance.bytes, projectWitnesses.h1Appearance.bytes);
  validateAppearanceRows(
    materializedAppearanceBytes,
    [hak.baseControl, hak.r31Control, hak.h1Control],
  );

  const materializedFixtures = binary?.moduleReadback?.fixtures;
  assert.ok(Array.isArray(binary?.fixtures) && Array.isArray(materializedFixtures), "diagnostic_binary_fixtures_invalid");
  assert.equal(binary.fixtures.length, 3, "diagnostic_binary_fixture_count_invalid");
  assert.equal(materializedFixtures.length, 3, "diagnostic_binary_readback_fixture_count_invalid");
  const exactFixtures = [
    { role: "stock_renderer_control", id: "stock_control", templateResRef: "m2a_d_stock", displayName: "Stock c_horror control", appearanceRow: 102, modelResref: "c_horror", position: [5, 18, 0], orientation: { x: 1, y: 0 } },
    { role: "exact_r31_candidate", id: "candidate_m0", templateResRef: "m2a_d_m0", displayName: "Exact r31 M0 candidate", appearanceRow: 15_100, modelResref: "m2a_m0p01", position: [10, 14.5, 0], orientation: { x: 1, y: 0 } },
    { role: "project_owned_positive_control", id: "custom_control_h1", templateResRef: "m2a_d_h1", displayName: "Project-owned H1 v20 control", appearanceRow: 15_101, modelResref: "m2a_m6p01", position: [15, 18, 0], orientation: { x: 1, y: 0 } },
  ];
  for (const [index, expected] of exactFixtures.entries()) {
    const fixture = binary.fixtures[index];
    assert.equal(fixture?.role, expected.role, `diagnostic_binary_exact_role_mismatch:${index}`);
    assert.equal(fixture?.id, expected.id, `diagnostic_binary_exact_id_mismatch:${index}`);
    assert.equal(fixture?.templateResRef, expected.templateResRef, `diagnostic_binary_exact_template_mismatch:${index}`);
    assert.equal(fixture?.displayName, expected.displayName, `diagnostic_binary_exact_name_mismatch:${index}`);
    assert.equal(fixture?.appearanceRow, expected.appearanceRow, `diagnostic_binary_exact_row_mismatch:${index}`);
    assert.equal(fixture?.modelResref, expected.modelResref, `diagnostic_binary_exact_model_mismatch:${index}`);
    requireVectorOrObjectEqual(fixture?.position, expected.position, `diagnostic_binary_exact_position_mismatch:${index}`);
    requireEqual(fixture?.orientation, expected.orientation, `diagnostic_binary_exact_orientation_mismatch:${index}`);
    requireEqual(materializedFixtures[index], {
      id: expected.id,
      templateResRef: expected.templateResRef,
      displayName: expected.displayName,
      appearanceRow: expected.appearanceRow,
      position: { x: expected.position[0], y: expected.position[1], z: expected.position[2] },
      orientation: expected.orientation,
    }, `diagnostic_binary_exact_readback_fixture_mismatch:${index}`);
  }
  const expectedRoles = new Map(exactFixtures.map((fixture) => [fixture.id, fixture.role]));
  const binaryById = new Map(binary.fixtures.map((fixture) => [fixture.id, fixture]));
  const readbackById = new Map(materializedFixtures.map((fixture) => [fixture.id, fixture]));
  for (const outerFixture of outer.fixtures) {
    const fixture = binaryById.get(outerFixture.id);
    const readback = readbackById.get(outerFixture.id);
    assert.ok(fixture && readback, `diagnostic_binary_fixture_missing:${outerFixture.id}`);
    assert.equal(fixture.role, expectedRoles.get(outerFixture.id), `diagnostic_binary_fixture_role_mismatch:${outerFixture.id}`);
    assert.equal(fixture.templateResRef, outerFixture.templateResRef, `diagnostic_binary_fixture_template_mismatch:${outerFixture.id}`);
    assert.equal(fixture.displayName, outerFixture.treeObjectText, `diagnostic_binary_fixture_name_mismatch:${outerFixture.id}`);
    assert.equal(fixture.appearanceRow, outerFixture.appearanceRow, `diagnostic_binary_fixture_row_mismatch:${outerFixture.id}`);
    assert.equal(fixture.modelResref, outerFixture.modelResref, `diagnostic_binary_fixture_model_mismatch:${outerFixture.id}`);
    requireVectorOrObjectEqual(fixture.position, outerFixture.position, `diagnostic_binary_fixture_position_mismatch:${outerFixture.id}`);
    requireDirection(fixture.orientation, `diagnostic_binary_fixture_orientation_invalid:${outerFixture.id}`);
    assert.equal(readback.templateResRef, fixture.templateResRef, `diagnostic_binary_readback_template_mismatch:${outerFixture.id}`);
    assert.equal(readback.displayName, fixture.displayName, `diagnostic_binary_readback_name_mismatch:${outerFixture.id}`);
    assert.equal(readback.appearanceRow, fixture.appearanceRow, `diagnostic_binary_readback_row_mismatch:${outerFixture.id}`);
    requireVectorOrObjectEqual(readback.position, outerFixture.position, `diagnostic_binary_readback_position_mismatch:${outerFixture.id}`);
    requireEqual(readback.orientation, fixture.orientation, `diagnostic_binary_readback_orientation_mismatch:${outerFixture.id}`);
  }
  assert.equal(hak?.baseControl?.physicalRow, 102, "diagnostic_stock_control_row_mismatch");
  assert.equal(hak?.baseControl?.modelType, "S", "diagnostic_stock_control_model_type_mismatch");
  assert.equal(hak?.baseControl?.race, "c_horror", "diagnostic_stock_control_model_mismatch");
  assert.equal(hak?.r31Control?.physicalRow, 15_100, "diagnostic_m0_control_row_mismatch");
  assert.equal(hak?.r31Control?.label, "M2A_M0_MESHY_RIGID", "diagnostic_m0_control_label_mismatch");
  assert.equal(hak?.r31Control?.modelType, "S", "diagnostic_m0_control_model_type_mismatch");
  assert.equal(hak?.r31Control?.race, "m2a_m0p01", "diagnostic_m0_control_model_mismatch");
  assert.equal(hak?.h1Control?.physicalRow, 15_101, "diagnostic_h1_control_row_mismatch");
  assert.equal(hak?.h1Control?.label, "M2A_M6_PROOF", "diagnostic_h1_control_label_mismatch");
  assert.equal(hak?.h1Control?.modelType, "S", "diagnostic_h1_control_model_type_mismatch");
  assert.equal(hak?.h1Control?.race, "m2a_m6p01", "diagnostic_h1_control_model_mismatch");
  return {
    module: { path: base.installedModule.path, sha256: binary.module.sha256, byteLength: binary.module.byteLength },
    orderedHakList: [{ resref: base.orderedHakList[0].resref, path: base.orderedHakList[0].path, sha256: hak.hak.sha256, byteLength: hak.hak.byteLength }],
    resources: hak.resources.map((resource) => structuredClone(resource)),
    moduleReadback: parsedModuleReadback,
    fixtures: outer.fixtures.map((fixture) => ({
      role: binaryById.get(fixture.id).role,
      ...fixtureIdentity(fixture),
    })),
  };
}

function requireNonOverlappingPixelRois(verdicts) {
  for (let leftIndex = 0; leftIndex < verdicts.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < verdicts.length; rightIndex += 1) {
      const left = verdicts[leftIndex];
      const right = verdicts[rightIndex];
      const a = left.runtimeRoiPixels;
      const b = right.runtimeRoiPixels;
      const overlaps = a.left < b.left + b.width
        && b.left < a.left + a.width
        && a.top < b.top + b.height
        && b.top < a.top + a.height;
      assert.ok(!overlaps, `fixture_runtime_pixel_roi_overlap:${left.fixtureId}:${right.fixtureId}`);
    }
  }
}

function requireBaseBindingShape(value) {
  assert.ok(value && !Array.isArray(value), "diagnostic_base_binding_missing");
  for (const key of ["installedModule", "orderedHakList", "resources", "area", "runtime"]) {
    assert.ok(value[key] != null, `diagnostic_base_binding_missing:${key}`);
  }
}

function requireArtifactDeclaration(value, name) {
  assert.ok(value && typeof value.path === "string" && value.path.length > 0, `${name}_path_invalid`);
  assert.match(value?.sha256 ?? "", SHA256, `${name}_hash_invalid`);
  assert.ok(Number.isInteger(value?.byteLength) && value.byteLength >= 0, `${name}_length_invalid`);
}

function readDeclaredArtifact(declaration, name) {
  requireArtifactDeclaration(declaration, name);
  const bytes = readRequiredFile(resolve(declaration.path), name);
  assert.equal(sha256(bytes), declaration.sha256, `${name}_hash_mismatch`);
  assert.equal(bytes.length, declaration.byteLength, `${name}_length_mismatch`);
  return bytes;
}

function readRequiredFile(path, name) {
  assert.ok(existsSync(path), `${name}_missing:${path}`);
  assert.ok(statSync(path).isFile(), `${name}_not_file:${path}`);
  return readFileSync(path);
}

function artifactIdentityOnly(value) {
  return { path: resolve(value.path), sha256: value.sha256, byteLength: value.byteLength };
}

function requireByteIdentity(actual, expected, error) {
  requireEqual(
    { sha256: actual?.sha256, byteLength: actual?.byteLength },
    { sha256: expected?.sha256, byteLength: expected?.byteLength },
    error,
  );
}

function requireVectorOrObjectEqual(actual, expected, error) {
  const vector = Array.isArray(actual) ? actual : [actual?.x, actual?.y, actual?.z];
  requireEqual(vector, expected, error);
}

function requireDirection(value, error) {
  assert.ok(value && Number.isFinite(value.x) && Number.isFinite(value.y), error);
  assert.ok(Math.hypot(value.x, value.y) > 0, error);
}

function validateAppearanceRows(bytes, controls) {
  const { rows } = parseTwoDaTable(bytes);
  for (const control of controls) {
    const row = rows.get(control?.physicalRow);
    assert.ok(row, `diagnostic_appearance_row_missing:${control?.physicalRow}`);
    requireEqual(
      { physicalRow: control.physicalRow, label: row.LABEL, modelType: row.MODELTYPE, race: row.RACE },
      { physicalRow: control.physicalRow, label: control.label, modelType: control.modelType, race: control.race },
      `diagnostic_appearance_row_binding_mismatch:${control.physicalRow}`,
    );
  }
}

function validateMaterializedAppearanceDerivation(materialized, r31Appearance, h1Appearance) {
  assert.ok(Buffer.from(materialized).subarray(0, r31Appearance.length).equals(Buffer.from(r31Appearance)), "diagnostic_materialized_appearance_r31_prefix_mismatch");
  const materializedTable = parseTwoDaTable(materialized);
  const r31Table = parseTwoDaTable(r31Appearance);
  const h1Table = parseTwoDaTable(h1Appearance);
  assert.equal(r31Table.rows.has(15_101), false, "diagnostic_r31_witness_already_has_h1_row");
  assert.equal(materializedTable.rows.size, r31Table.rows.size + 1, "diagnostic_materialized_appearance_row_count_invalid");
  const h1SourceRow = h1Table.rows.get(15_100);
  const appendedRow = materializedTable.rows.get(15_101);
  assert.ok(h1SourceRow && appendedRow, "diagnostic_materialized_appearance_h1_row_missing");
  requireEqual(appendedRow, h1SourceRow, "diagnostic_materialized_appearance_h1_clone_mismatch");
}

function parseTwoDaTable(bytes) {
  const lines = Buffer.from(bytes).toString("utf8").replace(/^\uFEFF/u, "").split(/\r?\n/u);
  assert.equal(lines[0]?.trim(), "2DA V2.0", "diagnostic_appearance_header_invalid");
  const headerIndex = lines.findIndex((line, index) => index > 0 && line.trim().length > 0);
  assert.ok(headerIndex > 0, "diagnostic_appearance_columns_missing");
  const columns = tokenizeTwoDaLine(lines[headerIndex]);
  for (const name of ["LABEL", "MODELTYPE", "RACE"]) assert.ok(columns.includes(name), `diagnostic_appearance_column_missing:${name}`);
  const rows = new Map();
  for (const line of lines.slice(headerIndex + 1)) {
    const tokens = tokenizeTwoDaLine(line);
    if (tokens.length === 0 || !/^\d+$/u.test(tokens[0])) continue;
    rows.set(Number(tokens[0]), Object.fromEntries(columns.map((column, index) => [column, tokens[index + 1]])));
  }
  return { columns, rows };
}

function tokenizeTwoDaLine(line) {
  return (String(line).match(/"(?:[^"]|"")*"|\S+/gu) ?? []).map((token) => (
    token.startsWith('"') && token.endsWith('"') ? token.slice(1, -1).replace(/""/gu, '"') : token
  ));
}

function fixtureIdentity(fixture) {
  return {
    fixtureId: fixture.id,
    templateResRef: fixture.templateResRef,
    treeObjectText: String(fixture.treeObjectText).trim(),
    occurrence: fixture.occurrence,
    appearanceRow: fixture.appearanceRow,
    modelResref: fixture.modelResref,
    position: structuredClone(fixture.position),
  };
}

function normalizedRoiToPixels(roi, imageWidth, imageHeight) {
  const left = Math.floor(roi.x * imageWidth);
  const top = Math.floor(roi.y * imageHeight);
  const right = Math.min(imageWidth, Math.ceil((roi.x + roi.width) * imageWidth));
  const bottom = Math.min(imageHeight, Math.ceil((roi.y + roi.height) * imageHeight));
  const width = Math.max(0, right - left);
  const height = Math.max(0, bottom - top);
  return { left, top, width, height, area: width * height };
}

function requireEqual(actual, expected, error) {
  assert.ok(isDeepStrictEqual(actual, expected), error);
}

function parseJson(bytes, error) {
  try {
    return JSON.parse(bytes.toString("utf8"));
  } catch {
    throw new Error(error);
  }
}

function normalizedPath(path) {
  return resolve(String(path ?? "")).toLowerCase();
}

function pathOccupied(path) {
  try {
    lstatSync(path);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}
