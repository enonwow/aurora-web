#!/usr/bin/env node

import assert from "node:assert/strict";
import { MODEL_PROOF_VERSION } from "./lib/aurora-model-proof-120s-contract.mjs";
import {
  MULTI_FIXTURE_DIAGNOSTIC_PROFILE_VERSION,
  validateMultiFixtureDiagnosticProfile,
} from "./lib/aurora-model-proof-120s-multi-fixture-diagnostic-contract.mjs";
import * as diagnosticContract from "./lib/aurora-model-proof-120s-multi-fixture-diagnostic-contract.mjs";

const hex = (value) => value.repeat(64).slice(0, 64);
const profile = {
  version: MULTI_FIXTURE_DIAGNOSTIC_PROFILE_VERSION,
  id: "stock-h1-m0-diagnostic",
  hardLimitMs: 120_000,
  proofProfile: {
    version: MODEL_PROOF_VERSION,
    path: "C:\\proof\\model-proof-120s.json",
    sha256: hex("a"),
    byteLength: 1,
  },
  diagnosticBinaryProfile: {
    path: "C:\\proof\\diagnostic-binary.json",
    sha256: hex("0"),
    byteLength: 1,
  },
  publishedAcceptanceTrustRootId: "central-tri-control-erf-gff-contract-fixture-v1",
  diagnosticContractTrustRootId: "meshy2aurora-tri-control-project-witnesses-v1",
  projectWitnesses: Object.fromEntries(["baseAppearance", "r31Appearance", "r31Mdl", "r31Tga", "h1Appearance", "h1Mdl", "h1Tga"].map((key, index) => [key, {
    path: `C:\\proof\\${key}.bin`, sha256: hex(String(index + 1)), byteLength: index + 1,
  }])),
  baseBinding: {
    installedModule: { path: "C:\\proof\\candidate.mod", sha256: hex("b"), byteLength: 2 },
    orderedHakList: [{ resref: "candidate_hak", path: "C:\\proof\\candidate.hak", sha256: hex("c"), byteLength: 3 }],
    resources: {
      mdl: { resref: "m2a_m0p01", sha256: hex("d") },
      tga: { resref: "m2a_m0t01", sha256: hex("e") },
      appearance2da: { resref: "appearance", row: 15100, sha256: hex("f") },
    },
    area: { resref: "candidate_area", displayName: "Candidate Area", entryPoint: [10, 10, 0] },
    runtime: { loadingModuleResref: "candidate", engineLogPath: "C:\\proof\\nwclientLog1.txt" },
  },
  acceptedBaseRun: {
    clock: { path: "C:\\proof\\run-clock.json", sha256: hex("1"), byteLength: 4 },
    finalPacket: { path: "C:\\proof\\final-model-proof.json", sha256: hex("2"), byteLength: 5 },
    acceptance: { path: "C:\\proof\\final-model-proof.accepted-at-1.json", sha256: hex("3"), byteLength: 6 },
  },
  toolsetTargetFixtureId: "candidate_m0",
  fixtures: [
    {
      id: "stock_control",
      templateResRef: "nw_dwarfmerc001",
      treeObjectText: "Stock control",
      occurrence: 0,
      appearanceRow: 102,
      modelResref: "c_horror",
      position: [8, 14.5, 0],
      runtimeRoi: { x: 0.05, y: 0.2, width: 0.25, height: 0.65 },
    },
    {
      id: "custom_control_h1",
      templateResRef: "nw_dwarfmerc001",
      treeObjectText: "Custom H1 control",
      occurrence: 0,
      appearanceRow: 15101,
      modelResref: "m2a_m6p01",
      position: [10, 14.5, 0],
      runtimeRoi: { x: 0.375, y: 0.2, width: 0.25, height: 0.65 },
    },
    {
      id: "candidate_m0",
      templateResRef: "nw_dwarfmerc001",
      treeObjectText: "Candidate M0",
      occurrence: 0,
      appearanceRow: 15100,
      modelResref: "m2a_m0p01",
      position: [12, 14.5, 0],
      runtimeRoi: { x: 0.7, y: 0.2, width: 0.25, height: 0.65 },
    },
  ],
  policy: {
    singleImmutableRuntimePng: true,
    failClosedUnreadableRoi: true,
    diagnosticOnly: true,
    noAutomaticResolverClaim: true,
    noAutomaticRendererClaim: true,
  },
};

assert.equal(Object.hasOwn(diagnosticContract, "buildMultiFixtureDiagnosticRuntimeVerdict"), false, "unbound_admissible_builder_must_not_be_exported");

const validated = validateMultiFixtureDiagnosticProfile(profile);
assert.equal(validated.id, profile.id);
assert.equal(validated.proofProfile.version, MODEL_PROOF_VERSION);
assert.equal(validated.toolsetTargetFixtureId, "candidate_m0");
assert.equal(validated.fixtures.length, 3);
validated.fixtures[0].position[0] = 999;
assert.equal(profile.fixtures[0].position[0], 8, "validator_must_return_a_clone");

for (const [expected, mutation] of [
  [/multi_fixture_diagnostic_profile_version_invalid/, (value) => { value.version = MODEL_PROOF_VERSION; }],
  [/multi_fixture_diagnostic_hard_limit_invalid/, (value) => { value.hardLimitMs = 120_001; }],
  [/multi_fixture_diagnostic_base_version_invalid/, (value) => { value.proofProfile.version = "other"; }],
  [/multi_fixture_diagnostic_binary_profile_hash_invalid/, (value) => { value.diagnosticBinaryProfile.sha256 = "bad"; }],
  [/multi_fixture_diagnostic_published_trust_root_invalid/, (value) => { value.publishedAcceptanceTrustRootId = ""; }],
  [/multi_fixture_diagnostic_base_binding_invalid/, (value) => { delete value.baseBinding.resources; }],
  [/multi_fixture_diagnostic_accepted_run_invalid/, (value) => { delete value.acceptedBaseRun.acceptance; }],
  [/toolset_target_fixture_not_found/, (value) => { value.toolsetTargetFixtureId = "missing"; }],
  [/fixture_id_duplicate/, (value) => { value.fixtures[1].id = value.fixtures[0].id; }],
  [/fixture_model_resref_invalid/, (value) => { value.fixtures[0].modelResref = "TOO-LONG-AND-UPPER"; }],
  [/fixture_appearance_row_invalid/, (value) => { value.fixtures[0].appearanceRow = -1; }],
  [/fixture_position_invalid/, (value) => { value.fixtures[0].position = [1, 2]; }],
  [/fixture_runtime_roi_invalid/, (value) => { value.fixtures[0].runtimeRoi.width = 2; }],
  [/fixture_runtime_roi_minimum_pixel_area_invalid/, (value) => { value.fixtures[0].runtimeRoi = { x: 0, y: 0, width: 0.01, height: 0.01 }; }],
  [/fixture_runtime_roi_overlap/, (value) => { value.fixtures[1].runtimeRoi.x = 0.2; }],
  [/fixture_runtime_roi_position_order_mismatch/, (value) => {
    const middle = value.fixtures[1].runtimeRoi;
    value.fixtures[1].runtimeRoi = value.fixtures[2].runtimeRoi;
    value.fixtures[2].runtimeRoi = middle;
  }],
  [/multi_fixture_diagnostic_policy_invalid/, (value) => { value.policy.diagnosticOnly = false; }],
]) {
  const changed = structuredClone(profile);
  mutation(changed);
  assert.throws(() => validateMultiFixtureDiagnosticProfile(changed), expected);
}

console.log(JSON.stringify({ ok: true, status: "aurora_model_proof_120s_multi_fixture_diagnostic_contract_valid" }));
