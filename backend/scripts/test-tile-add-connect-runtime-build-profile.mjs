import assert from "node:assert/strict";

import {
  MATRIX_RUNTIME_BUILD_BINDING_SCHEMA,
  MATRIX_RUNTIME_BUILD_PROFILE_SCHEMA,
  buildMatrixRuntimeBuildBinding,
  validateMatrixRuntimeBuildBinding,
  validateMatrixRuntimeBuildObservations,
  validateMatrixRuntimeBuildProfile
} from "./lib/tile-add-connect-runtime-build-profile.mjs";
import { matrixFrameVerification } from "./aurora-tile-add-connect-matrix.mjs";

const runtimeSourceDigest = "a".repeat(64);

const profile = {
  schema: MATRIX_RUNTIME_BUILD_PROFILE_SCHEMA,
  profileId: "area-tiles-99-source-bound-v8-test-build",
  createdAt: "2026-08-21T16:00:00.000Z",
  frontend: {
    commit: `worktree-sha256-${runtimeSourceDigest}`,
    imageDigest: `sha256:${runtimeSourceDigest}`,
    builtAt: "2026-08-21T15:59:00.000Z",
    baseUrl: "http://127.0.0.1:5173"
  },
  backend: {
    commit: `worktree-sha256-${runtimeSourceDigest}`,
    imageDigest: `sha256:${runtimeSourceDigest}`,
    builtAt: "2026-08-21T15:59:00.000Z",
    baseUrl: "http://127.0.0.1:3000",
    contractVersion: "1.0.0",
    vfxRuntimeRevision: "runtime-test-revision"
  }
};

assert.deepEqual(validateMatrixRuntimeBuildProfile(profile), []);

const binding = buildMatrixRuntimeBuildBinding({
  profile,
  profilePath: "C:\\proof-profiles\\area-tiles-v8.json",
  profileSha256: "c".repeat(64)
});
assert.equal(binding.schema, MATRIX_RUNTIME_BUILD_BINDING_SCHEMA);
assert.equal(binding.profile.sha256, "c".repeat(64));
assert.match(binding.bindingSha256, /^[a-f0-9]{64}$/u);
assert.deepEqual(validateMatrixRuntimeBuildBinding(binding), []);

const observations = {
  frontend: structuredClone(profile.frontend),
  backendProxy: {
    ...structuredClone(profile.backend),
    processStartedAt: "2026-08-21T16:01:00.000Z"
  },
  backendDirect: {
    ...structuredClone(profile.backend),
    processStartedAt: "2026-08-21T16:01:00.000Z"
  }
};
const sourceIdentity = {
  schema: "aurora-tile-add-connect-runtime-source-identity/v1",
  algorithm: "sha256-canonical-sorted-path-size-file-sha256-v1",
  runtimeDigest: runtimeSourceDigest,
  fileCount: 100,
  totalBytes: 1000,
  vfxRuntimeRevision: profile.backend.vfxRuntimeRevision
};
assert.deepEqual(
  validateMatrixRuntimeBuildObservations(binding, observations),
  []
);

const missingFrontend = structuredClone(observations);
missingFrontend.frontend.commit = null;
assert.ok(
  validateMatrixRuntimeBuildObservations(binding, missingFrontend).includes(
    "MATRIX_FRONTEND_RUNTIME_BUILD_COMMIT_MISSING"
  )
);

const backendDrift = structuredClone(observations);
backendDrift.backendDirect.imageDigest = `sha256:${"d".repeat(64)}`;
assert.ok(
  validateMatrixRuntimeBuildObservations(binding, backendDrift).includes(
    "MATRIX_BACKEND_RUNTIME_BUILD_DIRECT_IMAGE_DIGEST_MISMATCH"
  )
);

const proxyDrift = structuredClone(observations);
proxyDrift.backendProxy.commit = "different-build";
assert.ok(
  validateMatrixRuntimeBuildObservations(binding, proxyDrift).includes(
    "MATRIX_BACKEND_RUNTIME_BUILD_PROXY_COMMIT_MISMATCH"
  )
);
assert.ok(
  validateMatrixRuntimeBuildObservations(binding, proxyDrift).includes(
    "MATRIX_BACKEND_RUNTIME_BUILD_PROXY_DIRECT_MISMATCH"
  )
);

const missingProcessStart = structuredClone(observations);
missingProcessStart.backendDirect.processStartedAt = null;
assert.ok(
  validateMatrixRuntimeBuildObservations(binding, missingProcessStart).includes(
    "MATRIX_BACKEND_RUNTIME_BUILD_DIRECT_PROCESS_STARTED_AT_MISSING"
  )
);

const staleBackendProcess = structuredClone(observations);
staleBackendProcess.backendProxy.processStartedAt =
  "2026-08-21T15:58:59.999Z";
staleBackendProcess.backendDirect.processStartedAt =
  "2026-08-21T15:58:59.999Z";
assert.ok(
  validateMatrixRuntimeBuildObservations(binding, staleBackendProcess).includes(
    "MATRIX_BACKEND_RUNTIME_BUILD_PROXY_PROCESS_STARTED_BEFORE_BUILD"
  )
);
assert.ok(
  validateMatrixRuntimeBuildObservations(binding, staleBackendProcess).includes(
    "MATRIX_BACKEND_RUNTIME_BUILD_DIRECT_PROCESS_STARTED_BEFORE_BUILD"
  )
);

const malformedProfile = structuredClone(profile);
malformedProfile.frontend.imageDigest = "not-a-digest";
malformedProfile.backend.builtAt = null;
assert.ok(
  validateMatrixRuntimeBuildProfile(malformedProfile).includes(
    "MATRIX_RUNTIME_BUILD_PROFILE_FRONTEND_IMAGE_DIGEST_INVALID"
  )
);
assert.ok(
  validateMatrixRuntimeBuildProfile(malformedProfile).includes(
    "MATRIX_RUNTIME_BUILD_PROFILE_BACKEND_BUILT_AT_INVALID"
  )
);

const driftedBinding = structuredClone(binding);
driftedBinding.frontend.commit = "drifted-after-hash";
assert.ok(
  validateMatrixRuntimeBuildBinding(driftedBinding).includes(
    "MATRIX_RUNTIME_BUILD_BINDING_SHA256_MISMATCH"
  )
);

const chunk = {
  id: "test01-chunk-0001",
  kind: "tile",
  width: 2,
  height: 1,
  cases: [{
    id: "test01:0:0",
    rowId: "test01:0",
    cells: [
      { role: "source", row: 0, col: 0, tileId: 0 },
      { role: "partner", row: 0, col: 1, tileId: 1 }
    ]
  }]
};
const frame = {
  status: "captured",
  areaEditingScenario: {
    ok: true,
    scenario: "tile-add-connect-matrix-local"
  },
  runtimeCanvasScreenshot: { ok: true },
  pageScreenshot: { ok: true },
  runtimeBuildProof: {
    status: "verified",
    binding,
    preflightObservations: structuredClone(observations),
    observations,
    sourceIdentity: {
      preflight: sourceIdentity,
      postCapture: structuredClone(sourceIdentity)
    }
  },
  domStatus: { runtimeFreshness: { ok: true } },
  areaTileMutationRuntimeSettlement: { status: "ready" },
  postCaptureAreaTileMutationRuntimeSettlement: { status: "ready" },
  areaPresentedFrameFence: { status: "ready" },
  terrainTileModelSnapshot: {
    tileCount: 2,
    loadedTileCount: 2,
    pendingTileCount: 0,
    failedTileCount: 0,
    bridgeTileCount: 0
  }
};
const state = {
  scenario: "tile-add-connect-matrix-local",
  action: { chunkId: chunk.id },
  assertions: {
    exactFixtureTileIds: true,
    sourceAndPartnerAdjacency: true
  },
  commit: {
    state: {
      tiles: [
        { row: 0, col: 0, tileId: 0, orientation: 0 },
        { row: 0, col: 1, tileId: 1, orientation: 0 }
      ]
    }
  }
};
assert.equal(matrixFrameVerification(frame, state, chunk, binding).ok, true);
const driftedFrame = structuredClone(frame);
driftedFrame.runtimeBuildProof.observations.frontend.commit = "other-build";
const driftedFrameVerification = matrixFrameVerification(
  driftedFrame,
  state,
  chunk,
  binding
);
assert.equal(driftedFrameVerification.ok, false);
assert.ok(
  driftedFrameVerification.errors.includes(
    "MATRIX_FRONTEND_RUNTIME_BUILD_COMMIT_MISMATCH"
  )
);
const restartedBackendFrame = structuredClone(frame);
restartedBackendFrame.runtimeBuildProof.observations.backendProxy.processStartedAt =
  "2026-08-21T16:02:00.000Z";
restartedBackendFrame.runtimeBuildProof.observations.backendDirect.processStartedAt =
  "2026-08-21T16:02:00.000Z";
const restartedBackendVerification = matrixFrameVerification(
  restartedBackendFrame,
  state,
  chunk,
  binding
);
assert.equal(restartedBackendVerification.ok, false);
assert.ok(
  restartedBackendVerification.errors.includes(
    "MATRIX_BACKEND_RUNTIME_BUILD_PROCESS_RESTARTED_DURING_CAPTURE"
  )
);
const driftedSourceFrame = structuredClone(frame);
driftedSourceFrame.runtimeBuildProof.sourceIdentity.postCapture.runtimeDigest =
  "d".repeat(64);
const driftedSourceVerification = matrixFrameVerification(
  driftedSourceFrame,
  state,
  chunk,
  binding
);
assert.equal(driftedSourceVerification.ok, false);
assert.ok(
  driftedSourceVerification.errors.includes(
    "MATRIX_RUNTIME_SOURCE_IDENTITY_CHANGED_DURING_CAPTURE"
  )
);

process.stdout.write("tile add/connect runtime-build profile: PASS\n");
