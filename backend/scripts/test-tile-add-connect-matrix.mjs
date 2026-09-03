import assert from "node:assert/strict";

import {
  buildMatrixManifest,
  buildGroupChunkBackgroundFixture,
  planTilesetAddConnect,
  tilesetDefinitionFingerprint,
  tilesetRuntimeDefinitionFingerprint,
  validateMatrixChunk,
  validateMatrixManifest
} from "./lib/tile-add-connect-matrix.mjs";
import { buildMatrixRuntimeBuildBinding } from "./lib/tile-add-connect-runtime-build-profile.mjs";

const runtimeBuildProfile = {
  schema: "aurora-tile-add-connect-runtime-build-profile/v1",
  profileId: "area-tiles-matrix-unit-v8",
  createdAt: "2026-08-21T16:00:00.000Z",
  frontend: {
    commit: "matrix-unit-build",
    imageDigest: `sha256:${"a".repeat(64)}`,
    builtAt: "2026-08-21T15:59:00.000Z",
    baseUrl: "http://127.0.0.1:5173"
  },
  backend: {
    commit: "matrix-unit-build",
    imageDigest: `sha256:${"b".repeat(64)}`,
    builtAt: "2026-08-21T15:59:00.000Z",
    baseUrl: "http://127.0.0.1:3000",
    contractVersion: "1.0.0",
    vfxRuntimeRevision: "matrix-unit-runtime"
  }
};
const runtimeBuildBinding = buildMatrixRuntimeBuildBinding({
  profile: runtimeBuildProfile,
  profilePath: "C:\\proof-profiles\\area-tiles-matrix-unit-v8.json",
  profileSha256: "c".repeat(64)
});

const tileset = {
  tilesetResRef: "demo01",
  sourceKey: "modules/current/demo01.set",
  etag: "demo-etag",
  definition: {
    tiles: [
      {
        tileId: 0,
        modelResRef: "demo_a",
        pathNode: "A",
        terrain: { topRight: "grass", bottomRight: "grass" },
        crossers: { right: "road" }
      },
      {
        tileId: 1,
        modelResRef: "demo_b",
        pathNode: "a",
        terrain: { topLeft: "grass", bottomLeft: "grass" },
        crossers: { left: "road" }
      },
      {
        tileId: 2,
        terrain: { topRight: "grass", bottomRight: "grass" },
        crossers: { right: "road" }
      },
      {
        tileId: 3,
        modelResRef: "demo_no_descriptor",
        terrain: {},
        crossers: {}
      },
      {
        tileId: 4,
        modelResRef: "demo_no_partner",
        terrain: { topRight: "lava", bottomRight: "lava" },
        crossers: { right: "wall" }
      },
      {
        tileId: 5,
        modelResRef: "demo_path_mismatch",
        pathNode: "L",
        terrain: {
          topLeft: "grass",
          bottomLeft: "grass",
          topRight: "grass",
          bottomRight: "grass"
        },
        crossers: { left: "road", right: "road" }
      },
      {
        tileId: 6,
        modelResRef: "demo_path_unknown",
        pathNode: "y",
        terrain: { topRight: "grass", bottomRight: "grass" },
        crossers: { right: "road" }
      }
    ]
  }
};

const plan = planTilesetAddConnect(tileset);
assert.equal(plan.rows.length, 7);

const connected = plan.rows.find((row) => row.tileId === 0);
assert.equal(connected.add.status, "planned");
assert.equal(connected.connect.status, "planned");
assert.equal(connected.connect.partnerTileId, 1);
assert.equal(connected.connect.match.kind, "render_descriptor_exact_right_left");
assert.equal(connected.pathConnect.status, "blocked");
assert.equal(connected.pathConnect.sourcePathNode, "A");
assert.equal(connected.pathConnect.partnerPathNode, "a");
assert.equal(connected.pathConnect.reference.status, "reference-match");
assert.equal(connected.pathConnect.blocker.code, "PATH_NODE_AURORA_DIFFERENTIAL_PROOF_REQUIRED");

const pathNodeChangedDefinition = structuredClone(tileset.definition);
pathNodeChangedDefinition.tiles[0].pathNode = "a";
assert.notEqual(
  tilesetDefinitionFingerprint(tileset.definition),
  tilesetDefinitionFingerprint(pathNodeChangedDefinition),
  "PathNode case is raw source data and must invalidate a matrix fingerprint."
);

const sourceEligibilityDefinition = {
  tiles: [
    {
      tileId: 0,
      modelResRef: "source_ready",
      modelSourceStatus: "source_resolved",
      terrain: {},
      crossers: {}
    },
    {
      tileId: 1,
      modelResRef: "source_missing",
      modelSourceStatus: "source_missing",
      terrain: {},
      crossers: {}
    },
    {
      tileId: 2,
      modelResRef: "source_placeholder",
      modelSourceStatus: "intentional_placeholder",
      terrain: {},
      crossers: {}
    }
  ],
  groups: [{ id: "group_source_blocked", rows: 1, columns: 2, tileIds: [0, 1] }]
};
const sourceEligibilityPlan = planTilesetAddConnect({
  tilesetResRef: "source01",
  definition: sourceEligibilityDefinition
});
assert.equal(sourceEligibilityPlan.groupFixtures.length, 0);
assert.equal(
  sourceEligibilityPlan.rows.find((row) => row.tileId === 0).add.blocker.code,
  "MULTI_CELL_GROUP_MODEL_SOURCE_UNAVAILABLE"
);
assert.equal(
  sourceEligibilityPlan.rows.find((row) => row.tileId === 1).add.blocker.code,
  "TILE_MODEL_SOURCE_MISSING"
);
assert.equal(
  sourceEligibilityPlan.rows.find((row) => row.tileId === 2).add.blocker.code,
  "TILE_MODEL_INTENTIONAL_PLACEHOLDER"
);
const changedSourceEligibilityDefinition = structuredClone(sourceEligibilityDefinition);
changedSourceEligibilityDefinition.tiles[1].modelSourceStatus = "source_resolved";
assert.notEqual(
  tilesetDefinitionFingerprint(sourceEligibilityDefinition),
  tilesetDefinitionFingerprint(changedSourceEligibilityDefinition),
  "Model source eligibility is immutable planner input and must invalidate the definition fingerprint."
);
assert.equal(
  tilesetRuntimeDefinitionFingerprint(sourceEligibilityDefinition),
  tilesetRuntimeDefinitionFingerprint(changedSourceEligibilityDefinition),
  "Runtime drift binds renderer SET semantics independently of planner-only source eligibility."
);

const noModel = plan.rows.find((row) => row.tileId === 2);
assert.equal(noModel.add.status, "blocked");
assert.equal(noModel.add.blocker.code, "TILE_MODEL_UNDECLARED");
assert.equal(noModel.connect.status, "blocked");

const noDescriptor = plan.rows.find((row) => row.tileId === 3);
assert.equal(noDescriptor.add.status, "planned");
assert.equal(noDescriptor.connect.blocker.code, "NO_DECLARED_RIGHT_DESCRIPTOR");

const noPartner = plan.rows.find((row) => row.tileId === 4);
assert.equal(noPartner.connect.blocker.code, "NO_DECLARED_RIGHT_LEFT_PARTNER");

const pathMismatch = plan.rows.find((row) => row.tileId === 5);
assert.equal(pathMismatch.pathConnect.reference.status, "reference-mismatch");
assert.equal(pathMismatch.pathConnect.blocker.code, "PATH_NODE_REFERENCE_MISMATCH");

const pathUnknown = plan.rows.find((row) => row.tileId === 6);
assert.equal(pathUnknown.pathConnect.reference.status, "reference-unavailable");
assert.equal(pathUnknown.pathConnect.blocker.code, "PATH_NODE_REFERENCE_UNKNOWN");

const manifest = buildMatrixManifest({
  tilesets: [tileset],
  runtimeBuildBinding,
  caseLimit: 1,
  generatedAt: "2026-07-20T00:00:00.000Z"
});
assert.equal(manifest.contract.revision, "path-node-aware-v8");
assert.equal(
  manifest.contract.runtimeBuildIdentity.sourceIdentitySchema,
  "aurora-tile-add-connect-runtime-source-identity/v1"
);
assert.equal(
  manifest.contract.runtimeBuildIdentity.sourceIdentityAlgorithm,
  "sha256-canonical-sorted-path-size-file-sha256-v1"
);
assert.deepEqual(manifest.runtimeBuildBinding, runtimeBuildBinding);
assert.equal(
  manifest.chunks[0].runtimeDefinitionFingerprint,
  tilesetRuntimeDefinitionFingerprint(tileset.definition)
);

assert.equal(manifest.summary.totalRows, 7);
assert.equal(manifest.summary.addPlannedRows, 6);
assert.equal(manifest.summary.connectPlannedRows, 3);
assert.equal(manifest.summary.pathConnectAcceptedRows, 0);
assert.equal("pathConnectPlannedRows" in manifest.summary, false);
assert.equal(manifest.summary.pathConnectBlockedRows, 7);
assert.equal(manifest.summary.pathReferenceMatchRows, 1);
assert.equal(manifest.summary.pathReferenceMismatchRows, 1);
assert.equal(manifest.summary.pathReferenceUnknownRows, 1);
assert.equal(manifest.summary.pathReferenceNotEvaluatedRows, 4);
assert.equal(manifest.summary.blockedRows, 4);
assert.equal(manifest.chunks.length, 6);
assert.equal(manifest.chunks.every((chunk) => chunk.width >= 2 && chunk.width <= 32), true);
assert.equal(manifest.chunks.every((chunk) => chunk.height >= 2 && chunk.height <= 32), true);

const capturedRow = manifest.rows.find((row) => row.tileId === 0);
assert.deepEqual(capturedRow.fixture.cells, [
  { role: "source", row: 0, col: 0, tileId: 0 },
  { role: "partner", row: 0, col: 1, tileId: 1 }
]);
assert.deepEqual(capturedRow.pathConnect.negativeControl, {
  referenceStatus: "reference-mismatch",
  source: {
    tileId: 0,
    pathNode: "A",
    orientation: 0,
    edge: "right",
    row: 0,
    col: 0
  },
  partner: {
    tileId: 5,
    pathNode: "L",
    orientation: 0,
    edge: "left",
    row: 0,
    col: 1
  },
  sourceLanes: [0],
  partnerLanes: [],
  matchingLanes: [],
  sourceOnlyLanes: [0],
  partnerOnlyLanes: [],
  sourceRegionsByLane: [{ lane: 0, regions: [0] }],
  partnerRegionsByLane: [],
  reason: "path-node-reference-mismatch"
});

assert.deepEqual(validateMatrixManifest(manifest), []);
assert.deepEqual(validateMatrixChunk(manifest.chunks[0]), []);
const missingRuntimeBuildBinding = structuredClone(manifest);
delete missingRuntimeBuildBinding.runtimeBuildBinding;
assert.ok(
  validateMatrixManifest(missingRuntimeBuildBinding).includes(
    "MATRIX_RUNTIME_BUILD_BINDING_MISSING"
  )
);

const compactDirectTileset = {
  tilesetResRef: "compact01",
  definition: {
    tiles: Array.from({ length: 16 }, (_, tileId) => ({
      tileId,
      modelResRef: `compact_${tileId}`,
      terrain: {
        topLeft: "grass",
        bottomLeft: "grass",
        topRight: "grass",
        bottomRight: "grass"
      },
      crossers: { left: "road", right: "road" }
    }))
  }
};
const compactDirectManifest = buildMatrixManifest({
  tilesets: [compactDirectTileset],
  runtimeBuildBinding,
  caseLimit: 16,
  generatedAt: "2026-07-20T00:00:00.000Z"
});
const compactDirectChunk = compactDirectManifest.chunks.find((chunk) => chunk.kind === "tile");
assert.ok(compactDirectChunk);
assert.equal(compactDirectChunk.width, 8);
assert.equal(compactDirectChunk.height, 4);
assert.equal(compactDirectChunk.width * compactDirectChunk.height, 32);
assert.deepEqual(
  compactDirectChunk.cases.at(-1).cells.map(({ role, row, col }) => ({ role, row, col })),
  [
    { role: "source", row: 3, col: 6 },
    { role: "partner", row: 3, col: 7 }
  ]
);
assert.deepEqual(validateMatrixManifest(compactDirectManifest), []);

const defaultCaseLimitManifest = buildMatrixManifest({
  tilesets: [compactDirectTileset],
  runtimeBuildBinding,
  generatedAt: "2026-07-20T00:00:00.000Z"
});
assert.equal(defaultCaseLimitManifest.summary.caseLimit, 16);

const invalid = structuredClone(manifest);
invalid.chunks[0].width = 33;
assert.deepEqual(validateMatrixManifest(invalid), ["CHUNK_DIMENSION_OUT_OF_RANGE"]);

const missingPathConnect = structuredClone(manifest);
delete missingPathConnect.rows[0].pathConnect;
assert.ok(validateMatrixManifest(missingPathConnect).includes("PATH_CONNECT_STATUS_MISSING"));

const invalidChunk = structuredClone(manifest.chunks[0]);
invalidChunk.cases[0].cells = [{ role: "partner", row: 0, col: 0, tileId: 0 }];
assert.ok(validateMatrixChunk(invalidChunk).includes("MATRIX_CASE_SOURCE_CELL_MISSING"));

const groupedTileset = {
  tilesetResRef: "group01",
  definition: {
    tiles: [
      { tileId: 0, modelResRef: "group_a", terrain: { topRight: "grass", bottomRight: "grass" } },
      { tileId: 1, modelResRef: "group_b", terrain: { topLeft: "grass", bottomLeft: "grass" } },
      { tileId: 2, modelResRef: "group_c", terrain: {}, crossers: {} }
    ],
    groups: [
      { id: "group0", rows: 2, columns: 1, tileIds: [0, 1] },
      { id: "group_hole", rows: 1, columns: 2, tileIds: [2, null] }
    ]
  }
};
const groupedPlan = planTilesetAddConnect(groupedTileset);
assert.equal(groupedPlan.rows.find((row) => row.tileId === 0).add.status, "planned");
assert.equal(groupedPlan.rows.find((row) => row.tileId === 1).connect.match.kind, "declared_set_group_layout");
assert.equal(groupedPlan.rows.find((row) => row.tileId === 1).pathConnect.blocker.code, "PATH_NODE_COMPATIBILITY_UNPROVEN");
assert.equal(groupedPlan.rows.find((row) => row.tileId === 2).add.status, "planned");
assert.equal(groupedPlan.rows.find((row) => row.tileId === 2).add.fixtureKind, "tile");

const groupedManifest = buildMatrixManifest({
  tilesets: [groupedTileset],
  runtimeBuildBinding,
  caseLimit: 1,
  generatedAt: "2026-07-20T00:00:00.000Z"
});
const groupChunk = groupedManifest.chunks.find((chunk) => chunk.kind === "group");
assert.ok(groupChunk);
assert.equal(groupChunk.caseCount, 1);
assert.ok(groupChunk.width * groupChunk.height <= 16);
assert.equal(groupChunk.backgroundTileId, 2);
assert.deepEqual(buildGroupChunkBackgroundFixture(groupChunk), [
  { row: 0, col: 0, tileId: 2 },
  { row: 0, col: 1, tileId: 2 },
  { row: 1, col: 0, tileId: 2 },
  { row: 1, col: 1, tileId: 2 }
]);
assert.deepEqual(groupChunk.cases[0].memberCells.map((cell) => cell.tileId), [0, 1]);
assert.deepEqual(validateMatrixManifest(groupedManifest), []);
assert.deepEqual(validateMatrixChunk(groupChunk), []);

const compactGroupTileset = {
  tilesetResRef: "group02",
  definition: {
    tiles: Array.from({ length: 6 }, (_, tileId) => ({ tileId, modelResRef: `group_${tileId}`, terrain: {}, crossers: {} })),
    groups: [
      { id: "group0", rows: 1, columns: 2, tileIds: [0, 1] },
      { id: "group1", rows: 1, columns: 2, tileIds: [2, 3] },
      { id: "group2", rows: 1, columns: 2, tileIds: [4, 5] }
    ]
  }
};
const compactGroupManifest = buildMatrixManifest({
  tilesets: [compactGroupTileset],
  runtimeBuildBinding,
  caseLimit: 32,
  groupChunkAreaCellLimit: 4,
  generatedAt: "2026-07-20T00:00:00.000Z"
});
const compactGroupChunks = compactGroupManifest.chunks.filter((chunk) => chunk.kind === "group");
assert.equal(compactGroupChunks.length, 3);
assert.equal(compactGroupChunks.every((chunk) => chunk.width * chunk.height <= 4), true);

process.stdout.write("tile add/connect matrix planner: PASS\n");
