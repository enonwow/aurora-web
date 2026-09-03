#!/usr/bin/env node
import assert from "node:assert/strict";

import {
  buildLocalBlankRuntimeFreshness,
  evaluateAreaPresentedFrameFence,
  evaluateAreaTileMutationRenderSettlement,
  evaluateAreaTileMutationRuntimeSettlement
} from "./lib/area-tile-mutation-runtime-settlement.mjs";

const trace = {
  version: "aurora-area-tile-mutation-trace/v1",
  operationId: "area-tile-mutation:test-area:7",
  revision: 7,
  sceneId: "test-area",
  startedAt: "2026-07-19T10:00:00.000Z",
  tileStateDigestAfter: "fnv1a64:0123456789abcdef:100"
};

const contractSettlement = {
  version: "aurora-area-tile-mutation-contract-settlement/v1",
  operationId: trace.operationId,
  revision: trace.revision,
  status: "ready",
  tileStateDigest: trace.tileStateDigestAfter,
  blockers: []
};

const terrainSnapshot = {
  version: "aurora-areas-terrain-tile-model-runtime/v1",
  terrainBuildId: "terrain:test-area:7",
  tileStateDigest: trace.tileStateDigestAfter,
  status: "ready",
  modelStatus: "ready",
  tileCount: 4,
  contractTileCount: 4,
  pendingTileCount: 0,
  loadedTileCount: 4,
  failedTileCount: 0,
  bridgeTileCount: 0,
  visibleMeshCount: 4,
  materialTextureContractTileCount: 4,
  materialTextureAppliedTileCount: 4,
  materialTextureFailedTileCount: 0,
  materialTexturePendingTileCount: 0
};

const cameraFrame = {
  mode: "top_down_oracle",
  terrainBuildId: terrainSnapshot.terrainBuildId,
  tileStateDigest: terrainSnapshot.tileStateDigest,
  coverageStatus: "pass",
  clippedCornerCount: 0
};

const presentedFrame = {
  sequence: 11,
  terrainBuildId: terrainSnapshot.terrainBuildId,
  tileStateDigest: terrainSnapshot.tileStateDigest,
  cameraTerrainBuildId: cameraFrame.terrainBuildId,
  cameraTileStateDigest: cameraFrame.tileStateDigest,
  cameraCoverageStatus: "pass",
  presentedAt: "2026-07-19T10:00:01.000Z",
  settlementToken:
    "area-presented-frame/v1|11|terrain:test-area:7|fnv1a64:0123456789abcdef:100"
};

const ready = evaluateAreaTileMutationRuntimeSettlement({
  trace,
  contractSettlement,
  terrainSnapshot,
  cameraFrame,
  presentedFrame,
  expectedCameraMode: "top_down_oracle"
});
assert.equal(ready.status, "ready");
assert.deepEqual(ready.blockers, []);
assert.equal(ready.operationId, trace.operationId);
assert.equal(ready.revision, trace.revision);
assert.equal(ready.terrainBuildId, terrainSnapshot.terrainBuildId);
assert.equal(ready.presentedFrameSettlementToken, presentedFrame.settlementToken);

const renderReadyBeforePresentedFrame = evaluateAreaTileMutationRenderSettlement({
  trace,
  contractSettlement,
  terrainSnapshot,
  cameraFrame,
  expectedCameraMode: "top_down_oracle"
});
assert.equal(renderReadyBeforePresentedFrame.status, "ready");
assert.deepEqual(renderReadyBeforePresentedFrame.blockers, []);
assert.equal(
  renderReadyBeforePresentedFrame.version,
  "aurora-area-tile-mutation-render-settlement/v1"
);

const fullSettlementWithoutPresentedFrame =
  evaluateAreaTileMutationRuntimeSettlement({
    trace,
    contractSettlement,
    terrainSnapshot,
    cameraFrame,
    presentedFrame: null,
    expectedCameraMode: "top_down_oracle"
  });
assert.equal(fullSettlementWithoutPresentedFrame.status, "blocked");
assert.ok(
  fullSettlementWithoutPresentedFrame.blockers.includes(
    "presented_frame_missing"
  )
);

const staleTerrain = evaluateAreaTileMutationRuntimeSettlement({
  trace,
  contractSettlement,
  terrainSnapshot: {
    ...terrainSnapshot,
    tileStateDigest: "fnv1a64:stale:90"
  },
  cameraFrame,
  presentedFrame,
  expectedCameraMode: "top_down_oracle"
});
assert.equal(staleTerrain.status, "blocked");
assert.ok(staleTerrain.blockers.includes("terrain_tile_state_digest_mismatch"));

const clippedCamera = evaluateAreaTileMutationRuntimeSettlement({
  trace,
  contractSettlement,
  terrainSnapshot,
  cameraFrame: {
    ...cameraFrame,
    coverageStatus: "failed",
    clippedCornerCount: 2
  },
  presentedFrame,
  expectedCameraMode: "top_down_oracle"
});
assert.equal(clippedCamera.status, "blocked");
assert.ok(clippedCamera.blockers.includes("camera_frame_coverage_failed"));
assert.ok(clippedCamera.blockers.includes("camera_frame_corners_clipped"));

const blankTerrain = evaluateAreaTileMutationRuntimeSettlement({
  trace,
  contractSettlement,
  terrainSnapshot: {
    ...terrainSnapshot,
    visibleMeshCount: 0
  },
  cameraFrame,
  presentedFrame,
  expectedCameraMode: "top_down_oracle"
});
assert.equal(blankTerrain.status, "blocked");
assert.ok(blankTerrain.blockers.includes("terrain_visible_mesh_count_zero"));

const stalePresentedFrame = evaluateAreaTileMutationRuntimeSettlement({
  trace,
  contractSettlement,
  terrainSnapshot,
  cameraFrame,
  presentedFrame: {
    ...presentedFrame,
    terrainBuildId: "terrain:test-area:6",
    presentedAt: "2026-07-19T09:59:59.999Z"
  },
  expectedCameraMode: "top_down_oracle"
});
assert.equal(stalePresentedFrame.status, "blocked");
assert.ok(
  stalePresentedFrame.blockers.includes(
    "presented_frame_terrain_build_id_mismatch"
  )
);
assert.ok(
  stalePresentedFrame.blockers.includes("presented_frame_predates_mutation")
);

const missingMutation = evaluateAreaTileMutationRuntimeSettlement({
  trace: null,
  contractSettlement: null,
  terrainSnapshot,
  cameraFrame,
  presentedFrame,
  expectedCameraMode: "top_down_oracle"
});
assert.equal(missingMutation.status, "idle");
assert.deepEqual(missingMutation.blockers, ["mutation_trace_missing"]);

const matchingFreshness = buildLocalBlankRuntimeFreshness({
  expectedAreaId: "local-area",
  actualSceneId: "local-area"
});
assert.equal(matchingFreshness.ok, true);
assert.deepEqual(matchingFreshness.failed, []);

const mismatchedFreshness = buildLocalBlankRuntimeFreshness({
  expectedAreaId: "local-area",
  actualSceneId: "wrong-area"
});
assert.equal(mismatchedFreshness.ok, false);
assert.equal(mismatchedFreshness.failed.length, 1);
assert.equal(mismatchedFreshness.failed[0].id, "local_blank_scene_id");

const stableFrameFence = evaluateAreaPresentedFrameFence({
  capturedFrame: presentedFrame,
  observedAfterCapture: presentedFrame
});
assert.equal(stableFrameFence.status, "ready");
assert.deepEqual(stableFrameFence.blockers, []);

const changedFrameFence = evaluateAreaPresentedFrameFence({
  capturedFrame: presentedFrame,
  observedAfterCapture: {
    ...presentedFrame,
    settlementToken: "area-presented-frame/v1|12|different-build"
  }
});
assert.equal(changedFrameFence.status, "blocked");
assert.ok(
  changedFrameFence.blockers.includes(
    "presented_frame_settlement_token_changed_during_capture"
  )
);

console.log("area tile mutation runtime settlement: PASS");
