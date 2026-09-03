import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { createCaptureLifecycleTrace } from "./capture-lifecycle-trace.mjs";

test("writes ordered JSONL diagnostics only when a trace path is configured", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "aurora-capture-trace-"));
  const tracePath = path.join(tempDir, "nested", "capture.lifecycle.jsonl");
  try {
    const trace = createCaptureLifecycleTrace(tracePath, {
      now: () => "2026-07-20T12:00:00.000Z"
    });

    assert.equal(trace.record("chrome-spawned", { pid: 123 }), true);
    assert.equal(trace.record("capture-returned", { elapsedMs: 54_196 }), true);
    assert.deepEqual(
      fs
        .readFileSync(tracePath, "utf8")
        .trim()
        .split("\n")
        .map((line) => JSON.parse(line)),
      [
        { event: "chrome-spawned", at: "2026-07-20T12:00:00.000Z", pid: 123 },
        { event: "capture-returned", at: "2026-07-20T12:00:00.000Z", elapsedMs: 54_196 }
      ]
    );

    const disabled = createCaptureLifecycleTrace(null);
    assert.equal(disabled.record("unused"), false);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
