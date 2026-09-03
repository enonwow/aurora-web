import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  buildSweepHeartbeat,
  writeSweepHeartbeat
} from "./runtime-tile-sweep-heartbeat.mjs";

const startedAt = "2026-07-19T10:40:00.000Z";
const heartbeat = buildSweepHeartbeat({
  runId: "sweep-test",
  processId: 1234,
  phase: "in_flight",
  checkpointCursor: 1600,
  totalRuntimeTileIds: 36997,
  windowStartCursor: 1600,
  batches: [
    ["tile_a", "tile_b"],
    ["tile_c"]
  ],
  startedAt,
  updatedAt: "2026-07-19T10:40:15.000Z"
});

assert.equal(heartbeat.version, "aurora-runtime-tile-contract-sweep-heartbeat/v1");
assert.equal(heartbeat.phase, "in_flight");
assert.equal(heartbeat.checkpoint.cursor, 1600);
assert.equal(heartbeat.checkpoint.totalRuntimeTileIds, 36997);
assert.equal(heartbeat.window.startCursor, 1600);
assert.equal(heartbeat.window.endCursorExclusive, 1603);
assert.equal(heartbeat.window.batchCount, 2);
assert.equal(heartbeat.window.requestedTileCount, 3);
assert.deepEqual(heartbeat.window.runtimeTileIds, ["tile_a", "tile_b", "tile_c"]);
assert.equal(heartbeat.timing.startedAt, startedAt);
assert.equal(heartbeat.timing.elapsedMs, 15000);

const directory = fs.mkdtempSync(path.join(os.tmpdir(), "aurora-tile-sweep-heartbeat-"));
const heartbeatPath = path.join(directory, "runtime-heartbeat.json");
writeSweepHeartbeat(heartbeatPath, heartbeat);

const stored = JSON.parse(fs.readFileSync(heartbeatPath, "utf8"));
assert.deepEqual(stored, heartbeat);
assert.equal(fs.existsSync(`${heartbeatPath}.tmp`), false);

console.log("runtime tile sweep heartbeat contract: PASS");
