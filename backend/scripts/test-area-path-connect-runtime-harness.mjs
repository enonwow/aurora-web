#!/usr/bin/env node
import assert from "node:assert/strict";

import {
  PATH_CONNECT_RUNTIME_SCRIPT_RESREF,
  buildPathConnectRuntimeHarnessSource,
  parsePathConnectRuntimeLog,
} from "./lib/area-path-connect-runtime-harness.mjs";

const binding = {
  profileId: "tms01-7-right-5-path-connect-v2",
  rowId: "tms01:7",
  positiveAreaTag: "AW_PC_TMS01_POS",
  negativeAreaTag: "AW_PC_TMS01_NEG",
  sharedEdgeX: 10,
  source: { x: 7.5, y: 5, z: 0 },
  target: { x: 12.5, y: 5, z: 0 },
  settleSeconds: 0.5,
  trialSeconds: 2.5,
  reachedDistance: 1,
};

const source = buildPathConnectRuntimeHarnessSource(binding);
assert.equal(PATH_CONNECT_RUNTIME_SCRIPT_RESREF, "pc_tms01_run");
assert.equal((source.match(/\bvoid\s+main\s*\(/gu) ?? []).length, 1);
assert.match(source, /GetObjectByTag\("AW_PC_TMS01_POS", 0\)/u);
assert.match(source, /GetObjectByTag\("AW_PC_TMS01_NEG", 0\)/u);
assert.match(source, /ActionMoveToLocation/u);
assert.match(source, /WriteTimestampedLogEntry/u);
assert.match(source, /AURORA_PATH_CONNECT_POSITIVE/u);
assert.match(source, /AURORA_PATH_CONNECT_NEGATIVE/u);
assert.match(source, /AURORA_PATH_CONNECT_COMPLETE/u);
assert.doesNotMatch(source, /tms01:7[^\n]*moduleSha256/u);

const accepted = parsePathConnectRuntimeLog([
  "[Tue] AURORA_PATH_CONNECT_START profile=tms01-7-right-5-path-connect-v2 row=tms01:7",
  "[Tue] AURORA_PATH_CONNECT_POSITIVE crossedSharedEdge=true reachedTarget=true timedOut=false x=12.5 y=5.0",
  "[Tue] AURORA_PATH_CONNECT_NEGATIVE crossedSharedEdge=false reachedTarget=false timedOut=false x=9.4 y=5.0",
  "[Tue] AURORA_PATH_CONNECT_COMPLETE failures=0",
].join("\n"), binding);
assert.deepEqual(accepted, {
  verified: true,
  engine: "nwmain",
  positive: { crossedSharedEdge: true, reachedTarget: true, timedOut: false },
  negative: { crossedSharedEdge: false, reachedTarget: false, timedOut: false },
  failures: [],
});

for (const [label, text] of [
  ["positive failed", "AURORA_PATH_CONNECT_POSITIVE crossedSharedEdge=false reachedTarget=false timedOut=false\nAURORA_PATH_CONNECT_NEGATIVE crossedSharedEdge=false reachedTarget=false timedOut=false\nAURORA_PATH_CONNECT_COMPLETE failures=1"],
  ["negative crossed", "AURORA_PATH_CONNECT_POSITIVE crossedSharedEdge=true reachedTarget=true timedOut=false\nAURORA_PATH_CONNECT_NEGATIVE crossedSharedEdge=true reachedTarget=true timedOut=false\nAURORA_PATH_CONNECT_COMPLETE failures=1"],
  ["timeout", "AURORA_PATH_CONNECT_POSITIVE crossedSharedEdge=true reachedTarget=true timedOut=true\nAURORA_PATH_CONNECT_NEGATIVE crossedSharedEdge=false reachedTarget=false timedOut=false\nAURORA_PATH_CONNECT_COMPLETE failures=1"],
  ["missing completion", "AURORA_PATH_CONNECT_POSITIVE crossedSharedEdge=true reachedTarget=true timedOut=false\nAURORA_PATH_CONNECT_NEGATIVE crossedSharedEdge=false reachedTarget=false timedOut=false"],
  ["duplicate positive", "AURORA_PATH_CONNECT_POSITIVE crossedSharedEdge=true reachedTarget=true timedOut=false\nAURORA_PATH_CONNECT_POSITIVE crossedSharedEdge=true reachedTarget=true timedOut=false\nAURORA_PATH_CONNECT_NEGATIVE crossedSharedEdge=false reachedTarget=false timedOut=false\nAURORA_PATH_CONNECT_COMPLETE failures=0"],
]) {
  assert.throws(() => parsePathConnectRuntimeLog(text, binding), /path_connect_runtime_log_invalid/u, label);
}

for (const mutate of [
  (candidate) => { candidate.source.x = 10; },
  (candidate) => { candidate.target.x = 10; },
  (candidate) => { candidate.source.y = 4; },
  (candidate) => { candidate.trialSeconds = 0; },
  (candidate) => { candidate.positiveAreaTag = "bad tag"; },
]) {
  const candidate = structuredClone(binding);
  mutate(candidate);
  assert.throws(() => buildPathConnectRuntimeHarnessSource(candidate), /path_connect_runtime_binding_invalid/u);
}

process.stdout.write("Area PathConnect runtime harness contract: PASS\n");
