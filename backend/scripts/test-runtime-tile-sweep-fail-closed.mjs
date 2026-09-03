import assert from "node:assert/strict";

import {
  classifyRuntimeProcessFailure,
  windowHasRetryPending
} from "./runtime-tile-sweep-classification.mjs";
import { writeJsonAtomic } from "./runtime-tile-sweep-io.mjs";

assert.deepEqual(
  classifyRuntimeProcessFailure(new Error("fetch failed")),
  {
    status: "retry_pending",
    code: "RUNTIME_PROCESS_REQUEST_FAILED",
    message: "fetch failed"
  }
);
assert.deepEqual(
  classifyRuntimeProcessFailure(new Error("POST /tiles timed out after 900000ms.")),
  {
    status: "retry_pending",
    code: "RUNTIME_PROCESS_REQUEST_TIMEOUT",
    message: "POST /tiles timed out after 900000ms."
  }
);

const retryingResult = new Map([
  ["tile_a", { tileId: "tile_a", status: "blocked", error: {
    code: "RUNTIME_PROCESS_REQUEST_FAILED",
    message: "fetch failed"
  } }]
]);
const contractBlockedResult = new Map([
  ["tile_b", { tileId: "tile_b", status: "blocked", error: {
    code: "MISSING_RENDER_CONTRACT",
    message: "No contract"
  } }]
]);
assert.equal(windowHasRetryPending([["tile_a"]], [retryingResult]), true);
assert.equal(windowHasRetryPending([["tile_b"]], [contractBlockedResult]), false);

let renameAttempts = 0;
let storedJson = null;
const fakeFs = {
  mkdirSync() {},
  writeFileSync(_path, value) {
    storedJson = value;
  },
  renameSync() {
    renameAttempts += 1;
    if (renameAttempts < 3) {
      const error = new Error("temporarily locked");
      error.code = "EPERM";
      throw error;
    }
  }
};
const waits = [];
writeJsonAtomic("C:\\proof\\summary.json", { ok: true }, {
  fsImpl: fakeFs,
  processId: 99,
  maxRenameAttempts: 4,
  wait: (milliseconds) => waits.push(milliseconds)
});
assert.equal(renameAttempts, 3);
assert.deepEqual(waits, [25, 50]);
assert.equal(storedJson, "{\n  \"ok\": true\n}\n");

console.log("runtime tile sweep fail-closed contract: PASS");
