import assert from "node:assert/strict";
import { MODEL_PROOF_VERSION } from "./aurora-model-proof-120s-contract.mjs";

export const MULTI_FIXTURE_DIAGNOSTIC_PROFILE_VERSION =
  "aurora-model-proof-120s-multi-fixture-diagnostic-profile/v1";
export const MULTI_FIXTURE_DIAGNOSTIC_MIN_RUNTIME_WIDTH = 640;
export const MULTI_FIXTURE_DIAGNOSTIC_MIN_RUNTIME_HEIGHT = 480;
export const MULTI_FIXTURE_DIAGNOSTIC_MIN_ROI_PIXEL_AREA = 4_096;

const SHA256 = /^[a-f0-9]{64}$/u;
const RESREF = /^[a-z0-9_]{1,16}$/u;
const FIXTURE_ID = /^[a-z0-9][a-z0-9_-]{1,63}$/u;
const REQUIRED_POLICIES = [
  "singleImmutableRuntimePng",
  "failClosedUnreadableRoi",
  "diagnosticOnly",
  "noAutomaticResolverClaim",
  "noAutomaticRendererClaim",
];

export function validateMultiFixtureDiagnosticProfile(input) {
  assert.equal(
    input?.version,
    MULTI_FIXTURE_DIAGNOSTIC_PROFILE_VERSION,
    "multi_fixture_diagnostic_profile_version_invalid",
  );
  assert.match(input?.id ?? "", /^[a-z0-9][a-z0-9-]{2,127}$/u, "multi_fixture_diagnostic_profile_id_invalid");
  assert.equal(input?.hardLimitMs, 120_000, "multi_fixture_diagnostic_hard_limit_invalid");
  assert.equal(input?.proofProfile?.version, MODEL_PROOF_VERSION, "multi_fixture_diagnostic_base_version_invalid");
  requireArtifact(input?.proofProfile, "multi_fixture_diagnostic_base_profile", true);
  requireArtifact(input?.diagnosticBinaryProfile, "multi_fixture_diagnostic_binary_profile", true);
  assert.match(input?.publishedAcceptanceTrustRootId ?? "", /^[a-z0-9][a-z0-9-]{2,127}$/u, "multi_fixture_diagnostic_published_trust_root_invalid");
  assert.match(input?.diagnosticContractTrustRootId ?? "", /^[a-z0-9][a-z0-9-]{2,127}$/u, "multi_fixture_diagnostic_contract_trust_root_invalid");
  for (const key of ["baseAppearance", "r31Appearance", "r31Mdl", "r31Tga", "h1Appearance", "h1Mdl", "h1Tga"]) {
    requireArtifact(input?.projectWitnesses?.[key], `multi_fixture_diagnostic_project_witness:${key}`, true);
  }
  assert.ok(
    input?.baseBinding
      && ["installedModule", "orderedHakList", "resources", "area", "runtime"].every((key) => input.baseBinding[key] != null),
    "multi_fixture_diagnostic_base_binding_invalid",
  );
  assert.ok(
    input?.acceptedBaseRun
      && ["clock", "finalPacket", "acceptance"].every((key) => input.acceptedBaseRun[key] != null),
    "multi_fixture_diagnostic_accepted_run_invalid",
  );
  for (const key of ["clock", "finalPacket", "acceptance"]) {
    requireArtifact(input.acceptedBaseRun[key], `multi_fixture_diagnostic_accepted_run:${key}`, true);
  }
  assert.match(input?.toolsetTargetFixtureId ?? "", FIXTURE_ID, "toolset_target_fixture_id_invalid");
  assert.ok(Array.isArray(input?.fixtures) && input.fixtures.length === 3, "multi_fixture_diagnostic_fixtures_invalid");

  const fixtureIds = new Set();
  const selectionKeys = new Set();
  for (const [index, fixture] of input.fixtures.entries()) {
    assert.match(fixture?.id ?? "", FIXTURE_ID, `fixture_id_invalid:${index}`);
    assert.ok(!fixtureIds.has(fixture.id), `fixture_id_duplicate:${fixture.id}`);
    fixtureIds.add(fixture.id);
    assert.match(fixture?.templateResRef ?? "", RESREF, `fixture_template_resref_invalid:${fixture.id}`);
    assert.ok(String(fixture?.treeObjectText ?? "").trim(), `fixture_tree_object_text_invalid:${fixture.id}`);
    assert.ok(Number.isInteger(fixture?.occurrence) && fixture.occurrence >= 0, `fixture_occurrence_invalid:${fixture.id}`);
    const selectionKey = `${String(fixture.treeObjectText).trim()}\u0000${fixture.occurrence}`;
    assert.ok(!selectionKeys.has(selectionKey), `fixture_selection_identity_duplicate:${fixture.id}`);
    selectionKeys.add(selectionKey);
    assert.ok(Number.isInteger(fixture?.appearanceRow) && fixture.appearanceRow >= 0, `fixture_appearance_row_invalid:${fixture.id}`);
    assert.match(fixture?.modelResref ?? "", RESREF, `fixture_model_resref_invalid:${fixture.id}`);
    requireVector(fixture?.position, `fixture_position_invalid:${fixture.id}`);
    requireNormalizedRoi(fixture?.runtimeRoi, fixture.id);
  }
  assert.ok(fixtureIds.has(input.toolsetTargetFixtureId), "toolset_target_fixture_not_found");
  requireNonOverlappingRois(input.fixtures);
  requireRuntimeRoiPositionOrder(input.fixtures);

  for (const key of REQUIRED_POLICIES) {
    assert.equal(input?.policy?.[key], true, `multi_fixture_diagnostic_policy_invalid:${key}`);
  }
  return structuredClone(input);
}

function requireRuntimeRoiPositionOrder(fixtures) {
  const byWorldX = [...fixtures].sort((left, right) => left.position[0] - right.position[0]).map((fixture) => fixture.id);
  const byRoiX = [...fixtures].sort((left, right) => (
    left.runtimeRoi.x + left.runtimeRoi.width / 2
  ) - (
    right.runtimeRoi.x + right.runtimeRoi.width / 2
  )).map((fixture) => fixture.id);
  assert.deepEqual(byRoiX, byWorldX, "fixture_runtime_roi_position_order_mismatch");
}

function requireArtifact(value, name, requireLength = false) {
  assert.ok(isAbsoluteWindowsPath(value?.path), `${name}_path_invalid`);
  assert.match(value?.sha256 ?? "", SHA256, `${name}_hash_invalid`);
  if (requireLength) assert.ok(Number.isInteger(value?.byteLength) && value.byteLength >= 0, `${name}_length_invalid`);
}

function requireVector(value, error) {
  assert.ok(Array.isArray(value) && value.length === 3 && value.every(Number.isFinite), error);
}

function requireNormalizedRoi(value, fixtureId) {
  assert.ok(value && !Array.isArray(value), `fixture_runtime_roi_invalid:${fixtureId}`);
  const { x, y, width, height } = value;
  assert.ok([x, y, width, height].every(Number.isFinite), `fixture_runtime_roi_invalid:${fixtureId}`);
  assert.ok(x >= 0 && y >= 0 && width > 0 && height > 0, `fixture_runtime_roi_invalid:${fixtureId}`);
  assert.ok(x + width <= 1 && y + height <= 1, `fixture_runtime_roi_invalid:${fixtureId}`);
  const minimumSize = normalizedRoiToPixels(
    value,
    MULTI_FIXTURE_DIAGNOSTIC_MIN_RUNTIME_WIDTH,
    MULTI_FIXTURE_DIAGNOSTIC_MIN_RUNTIME_HEIGHT,
  );
  assert.ok(
    minimumSize.area >= MULTI_FIXTURE_DIAGNOSTIC_MIN_ROI_PIXEL_AREA,
    `fixture_runtime_roi_minimum_pixel_area_invalid:${fixtureId}`,
  );
}

function requireNonOverlappingRois(fixtures) {
  for (let leftIndex = 0; leftIndex < fixtures.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < fixtures.length; rightIndex += 1) {
      const left = fixtures[leftIndex];
      const right = fixtures[rightIndex];
      const overlaps = left.runtimeRoi.x < right.runtimeRoi.x + right.runtimeRoi.width
        && right.runtimeRoi.x < left.runtimeRoi.x + left.runtimeRoi.width
        && left.runtimeRoi.y < right.runtimeRoi.y + right.runtimeRoi.height
        && right.runtimeRoi.y < left.runtimeRoi.y + left.runtimeRoi.height;
      assert.ok(!overlaps, `fixture_runtime_roi_overlap:${left.id}:${right.id}`);
    }
  }
}

function isAbsoluteWindowsPath(value) {
  return /^[a-zA-Z]:\\/u.test(String(value ?? ""));
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
