import assert from "node:assert/strict";

import {
  createDeterministicCapturePlan,
  resolveDeterministicCaptureTimeSeconds
} from "./vfx-deterministic-capture-plan.mjs";

const row44Plan = createDeterministicCapturePlan(8650, 60);
assert.deepEqual(row44Plan, {
  durationSeconds: 8.65,
  fps: 60,
  finalFrameIndex: 519,
  frameCount: 520
});
assert.equal(resolveDeterministicCaptureTimeSeconds(0, row44Plan), 0);
assert.equal(resolveDeterministicCaptureTimeSeconds(1, row44Plan), 1 / 60);
assert.equal(resolveDeterministicCaptureTimeSeconds(518, row44Plan), 518 / 60);
assert.equal(resolveDeterministicCaptureTimeSeconds(519, row44Plan), 8.65);

const fractionalPlan = createDeterministicCapturePlan(8633, 60);
assert.equal(fractionalPlan.finalFrameIndex, 518);
assert.equal(fractionalPlan.frameCount, 519);
assert.equal(resolveDeterministicCaptureTimeSeconds(518, fractionalPlan), 8.633);

assert.throws(() => createDeterministicCapturePlan(0, 60), /duration/i);
assert.throws(() => createDeterministicCapturePlan(1000, 0), /FPS/i);
assert.throws(
  () => resolveDeterministicCaptureTimeSeconds(520, row44Plan),
  /outside the plan/i
);

console.log(
  JSON.stringify({
    status: "ok",
    row44FrameCount: row44Plan.frameCount,
    row44FinalFrameIndex: row44Plan.finalFrameIndex
  })
);
