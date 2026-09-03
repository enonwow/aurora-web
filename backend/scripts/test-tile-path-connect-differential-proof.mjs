import assert from "node:assert/strict";

import {
  buildPathConnectDifferentialProof,
  validatePathConnectDifferentialPacket,
  validatePathConnectDifferentialProfile,
  validatePathConnectDifferentialProofForRow
} from "./lib/tile-path-connect-differential-proof.mjs";

const hex = (character) => character.repeat(64);

const row = {
  schema: "aurora-tile-add-connect-matrix-row/v1",
  id: "tms01:7",
  tilesetResRef: "tms01",
  tileId: 7,
  definitionFingerprint: hex("d"),
  fixture: {
    kind: "tile",
    chunkId: "tms01-chunk-0001",
    caseIndex: 0,
    width: 4,
    height: 7,
    cells: [
      { role: "source", row: 2, col: 4, tileId: 7 },
      { role: "partner", row: 2, col: 5, tileId: 8 }
    ]
  },
  connect: {
    status: "planned",
    partnerTileId: 8
  },
  pathConnect: {
    status: "blocked",
    sourcePathNode: "A",
    partnerPathNode: "a",
    reference: {
      status: "reference-match",
      source: { orientation: 0 },
      partner: { orientation: 0 },
      sourceEdge: "right",
      partnerEdge: "left",
      matchingLanes: [0]
    },
    negativeControl: {
      referenceStatus: "reference-mismatch",
      source: { tileId: 7, pathNode: "A", orientation: 0, edge: "right", row: 2, col: 4 },
      partner: { tileId: 9, pathNode: "L", orientation: 0, edge: "left", row: 2, col: 5 },
      sourceLanes: [0],
      partnerLanes: [-4, 0, 4],
      matchingLanes: [],
      sourceOnlyLanes: [0],
      partnerOnlyLanes: [-4, 0, 4],
      sourceRegionsByLane: [{ lane: 0, regions: [0] }],
      partnerRegionsByLane: [{ lane: -4, regions: [2] }, { lane: 0, regions: [1] }, { lane: 4, regions: [0] }],
      reason: "path-node-reference-mismatch"
    }
  }
};

const profile = {
  schema: "aurora-tile-path-connect-profile/v2",
  id: "tms01-7-right-8-path-connect-v1",
  approved: true,
  moduleSha256: hex("a"),
  positiveAreaResRef: "pc_tms01_pos",
  negativeAreaResRef: "pc_tms01_neg",
  areaWidth: 4,
  areaHeight: 7,
  tilesetResRef: "tms01",
  definitionFingerprint: hex("d"),
  rowId: "tms01:7",
  source: { tileId: 7, pathNode: "A", orientation: 0, edge: "right", row: 2, col: 4 },
  partner: { tileId: 8, pathNode: "a", orientation: 0, edge: "left", row: 2, col: 5 },
  matchingLanes: [0],
  negativeControl: structuredClone(row.pathConnect.negativeControl)
};

const profileSha256 = hex("b");
const packet = {
  schema: "aurora-tile-path-connect-differential-packet/v2",
  profileId: profile.id,
  profileSha256,
  moduleSha256: profile.moduleSha256,
  positiveAreaResRef: profile.positiveAreaResRef,
  negativeAreaResRef: profile.negativeAreaResRef,
  rowId: profile.rowId,
  toolsetReadback: {
    verified: true,
    tilesetResRef: profile.tilesetResRef,
    definitionFingerprint: profile.definitionFingerprint,
    dimensions: { width: profile.areaWidth, height: profile.areaHeight },
    positive: { areaResRef: profile.positiveAreaResRef, source: profile.source, partner: profile.partner },
    negative: { areaResRef: profile.negativeAreaResRef, control: profile.negativeControl }
  },
  runtime: {
    verified: true,
    engine: "nwmain",
    positive: { crossedSharedEdge: true, reachedTarget: true, timedOut: false },
    negative: { crossedSharedEdge: false, reachedTarget: false, timedOut: false },
    failures: []
  },
  artifacts: {
    toolsetReadback: { path: "C:\\proof\\toolset.json", sha256: hex("1") },
    positiveRuntime: { path: "C:\\proof\\positive.json", sha256: hex("2") },
    negativeRuntime: { path: "C:\\proof\\negative.json", sha256: hex("3") },
    engineLog: { path: "C:\\proof\\engine.log", sha256: hex("4") }
  }
};

assert.deepEqual(validatePathConnectDifferentialProfile(profile, row), []);
assert.deepEqual(validatePathConnectDifferentialPacket(packet, profile, profileSha256), []);

const proof = buildPathConnectDifferentialProof({
  profile,
  profilePath: "C:\\proof\\profile.json",
  profileSha256,
  packet,
  packetPath: "C:\\proof\\packet.json",
  packetSha256: hex("c")
});
assert.equal(proof.schema, "aurora-tile-path-connect-differential-proof/v2");
assert.deepEqual(validatePathConnectDifferentialProofForRow(proof, row), []);

function expectProfileError(mutator, code) {
  const candidate = structuredClone(profile);
  mutator(candidate);
  assert.ok(validatePathConnectDifferentialProfile(candidate, row).includes(code), code);
}

expectProfileError((candidate) => { candidate.extra = true; }, "PATH_CONNECT_PROFILE_UNEXPECTED_KEY:extra");
expectProfileError((candidate) => { candidate.approved = false; }, "PATH_CONNECT_PROFILE_NOT_APPROVED");
expectProfileError((candidate) => { candidate.rowId = "tms01:8"; }, "PATH_CONNECT_PROFILE_ROW_MISMATCH");
expectProfileError((candidate) => { candidate.source.orientation = 4; }, "PATH_CONNECT_PROFILE_SOURCE_ORIENTATION_INVALID");
expectProfileError((candidate) => { candidate.partner.edge = "right"; }, "PATH_CONNECT_PROFILE_PARTNER_EDGE_MISMATCH");
expectProfileError((candidate) => { candidate.matchingLanes = []; }, "PATH_CONNECT_PROFILE_MATCHING_LANES_INVALID");
expectProfileError((candidate) => { candidate.matchingLanes = [0, 0]; }, "PATH_CONNECT_PROFILE_MATCHING_LANES_INVALID");
expectProfileError((candidate) => { candidate.source.col = 3; }, "PATH_CONNECT_PROFILE_SOURCE_CELL_MISMATCH");
expectProfileError((candidate) => { candidate.moduleSha256 = "A".repeat(64); }, "PATH_CONNECT_PROFILE_MODULE_SHA256_INVALID");
expectProfileError((candidate) => { candidate.negativeAreaResRef = candidate.positiveAreaResRef; }, "PATH_CONNECT_PROFILE_AREA_RESREF_INVALID");
expectProfileError((candidate) => { candidate.areaHeight = 6; }, "PATH_CONNECT_PROFILE_AREA_DIMENSIONS_MISMATCH");
expectProfileError((candidate) => { candidate.negativeControl.referenceStatus = "reference-match"; }, "PATH_CONNECT_PROFILE_NEGATIVE_CONTROL_INVALID");
expectProfileError((candidate) => { candidate.negativeControl.partner.pathNode = "a"; }, "PATH_CONNECT_PROFILE_NEGATIVE_CONTROL_MISMATCH");
expectProfileError((candidate) => { candidate.negativeControl.partner.row = 3; }, "PATH_CONNECT_PROFILE_NEGATIVE_CONTROL_MISMATCH");
expectProfileError((candidate) => { candidate.negativeControl.sourceLanes = [0, 0]; }, "PATH_CONNECT_PROFILE_NEGATIVE_CONTROL_INVALID");
expectProfileError((candidate) => { candidate.negativeControl.partnerRegionsByLane[0].regions = []; }, "PATH_CONNECT_PROFILE_NEGATIVE_CONTROL_INVALID");
expectProfileError((candidate) => { candidate.negativeControl.extra = true; }, "PATH_CONNECT_PROFILE_NEGATIVE_CONTROL_INVALID");

function expectPacketError(mutator, code) {
  const candidate = structuredClone(packet);
  mutator(candidate);
  assert.ok(validatePathConnectDifferentialPacket(candidate, profile, profileSha256).includes(code), code);
}

expectPacketError((candidate) => { candidate.extra = true; }, "PATH_CONNECT_PACKET_UNEXPECTED_KEY:extra");
expectPacketError((candidate) => { candidate.profileSha256 = hex("e"); }, "PATH_CONNECT_PACKET_PROFILE_SHA256_MISMATCH");
expectPacketError((candidate) => { candidate.toolsetReadback.positive.source.tileId = 9; }, "PATH_CONNECT_PACKET_POSITIVE_READBACK_MISMATCH");
expectPacketError((candidate) => { candidate.runtime.engine = "toolset"; }, "PATH_CONNECT_PACKET_RUNTIME_ENGINE_INVALID");
expectPacketError((candidate) => { candidate.runtime.positive.reachedTarget = false; }, "PATH_CONNECT_PACKET_POSITIVE_OUTCOME_INVALID");
expectPacketError((candidate) => { candidate.runtime.negative.crossedSharedEdge = true; }, "PATH_CONNECT_PACKET_NEGATIVE_OUTCOME_INVALID");
expectPacketError((candidate) => { candidate.runtime.failures = ["script_error"]; }, "PATH_CONNECT_PACKET_RUNTIME_FAILURES_PRESENT");
expectPacketError((candidate) => { candidate.artifacts.engineLog.sha256 = "nope"; }, "PATH_CONNECT_PACKET_ARTIFACT_INVALID:engineLog");

const staleProof = structuredClone(proof);
staleProof.binding.definitionFingerprint = hex("e");
assert.ok(validatePathConnectDifferentialProofForRow(staleProof, row).includes("PATH_CONNECT_PROOF_DEFINITION_FINGERPRINT_MISMATCH"));

const unboundNegativeProof = structuredClone(proof);
unboundNegativeProof.binding.negativeControl = undefined;
assert.ok(validatePathConnectDifferentialProofForRow(unboundNegativeProof, row).includes("PATH_CONNECT_PROOF_NEGATIVE_CONTROL_MISMATCH"));

const weakLegacyProof = {
  schema: "aurora-tile-path-connect-differential-proof/v2",
  immutableToolsetNwnProfile: { approved: true, profileSha256 },
  crossEdgeDifferential: { verified: true, artifactSha256: hex("c") }
};
assert.notDeepEqual(validatePathConnectDifferentialProofForRow(weakLegacyProof, row), []);

process.stdout.write("tile PathConnect differential proof contract: PASS\n");
