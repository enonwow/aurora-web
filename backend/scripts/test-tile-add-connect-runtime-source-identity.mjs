import assert from "node:assert/strict";

import {
  MATRIX_RUNTIME_BUILD_PROFILE_SCHEMA,
  buildMatrixRuntimeBuildBinding
} from "./lib/tile-add-connect-runtime-build-profile.mjs";
import {
  computeTileAddConnectRuntimeSourceIdentity,
  summarizeTileAddConnectRuntimeSourceIdentity,
  validateTileAddConnectRuntimeSourceIdentity
} from "./lib/tile-add-connect-runtime-source-identity.mjs";

const identity = computeTileAddConnectRuntimeSourceIdentity();
const builtAt = "2026-08-21T16:30:00.000Z";
const commit = `worktree-sha256-${identity.runtimeDigest}`;
const imageDigest = `sha256:${identity.runtimeDigest}`;
const profile = {
  schema: MATRIX_RUNTIME_BUILD_PROFILE_SCHEMA,
  profileId: "runtime-source-identity-test-v8",
  createdAt: builtAt,
  frontend: {
    commit,
    imageDigest,
    builtAt,
    baseUrl: "http://127.0.0.1:5173"
  },
  backend: {
    commit,
    imageDigest,
    builtAt,
    baseUrl: "http://127.0.0.1:3000",
    contractVersion: "1.0.0",
    vfxRuntimeRevision: identity.vfxRuntimeRevision
  }
};
const binding = buildMatrixRuntimeBuildBinding({
  profile,
  profilePath: "C:\\immutable\\runtime-build-profile.json",
  profileSha256: "a".repeat(64)
});
const summary = summarizeTileAddConnectRuntimeSourceIdentity(identity);

assert.equal(identity.records.length, identity.fileCount);
assert.equal(
  identity.records.some((record) => record.path.includes("/__pycache__/")),
  false
);
assert.deepEqual(validateTileAddConnectRuntimeSourceIdentity(binding, summary), []);
assert.deepEqual(
  validateTileAddConnectRuntimeSourceIdentity(binding, {
    ...summary,
    runtimeDigest: "b".repeat(64)
  }),
  [
    "MATRIX_RUNTIME_SOURCE_BACKEND_COMMIT_MISMATCH",
    "MATRIX_RUNTIME_SOURCE_BACKEND_IMAGE_DIGEST_MISMATCH",
    "MATRIX_RUNTIME_SOURCE_FRONTEND_COMMIT_MISMATCH",
    "MATRIX_RUNTIME_SOURCE_FRONTEND_IMAGE_DIGEST_MISMATCH"
  ]
);
assert.deepEqual(
  validateTileAddConnectRuntimeSourceIdentity(binding, {
    ...summary,
    vfxRuntimeRevision: "drifted-runtime"
  }),
  ["MATRIX_RUNTIME_SOURCE_VFX_REVISION_MISMATCH"]
);

process.stdout.write("tile add/connect runtime source identity: PASS\n");
