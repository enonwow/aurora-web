import assert from "node:assert/strict";

import {
  assertVfxCaptureProofBundle,
  assertVfxCaptureProofGate,
  assertVfxStaticPreflightObservability
} from "./vfx-capture-proof-gate.mjs";

function createProofState(playbackOverrides = {}, proofGateOverrides = {}) {
  return {
    runtimeObservability: {
      version: "aurora-vfx-runtime-observability/v1",
      proofGate: {
        status: "pass",
        blockerManifest: [],
        ...proofGateOverrides
      },
      playbackGuard: {
        status: "pass",
        triggerCount: 1,
        loop: false,
        overlapCount: 0,
        completed: true,
        postDurationHidden: true,
        postDurationHiddenRequired: true,
        ...playbackOverrides
      }
    }
  };
}

assert.equal(
  assertVfxCaptureProofGate(createProofState()).proofGate.status,
  "pass"
);
assert.throws(
  () => assertVfxCaptureProofGate(null),
  /observability is missing or unsupported/i
);
assert.throws(
  () =>
    assertVfxCaptureProofGate(
      createProofState({}, { status: "fail", blockerManifest: ["draw-failed"] })
    ),
  /proof gate did not pass/i
);
for (const playbackOverrides of [
  { triggerCount: 2 },
  { loop: true },
  { overlapCount: 1 },
  { completed: false },
  { postDurationHidden: false },
  { postDurationHiddenRequired: false }
]) {
  assert.throws(
    () => assertVfxCaptureProofGate(createProofState(playbackOverrides)),
    /playback guard did not prove one completed hidden playback/i
  );
}

const activeProofState = createProofState({
  completed: false,
  postDurationHidden: false,
  postDurationHiddenRequired: false
});
const finalProofState = createProofState(
  {},
  { status: "fail", blockerManifest: ["canonical-draw-ledger-empty"] }
);
assert.deepEqual(
  assertVfxCaptureProofBundle(activeProofState, finalProofState),
  {
    activeObservability: activeProofState.runtimeObservability,
    finalObservability: finalProofState.runtimeObservability
  }
);
assert.throws(
  () =>
    assertVfxCaptureProofBundle(
      activeProofState,
      createProofState(
        {},
        {
          status: "fail",
          blockerManifest: ["canonical-draw-ledger-empty", "asset-settlement-failed"]
        }
      )
    ),
  /unexpected final proof blocker/i
);
assert.throws(
  () =>
    assertVfxCaptureProofBundle(
      activeProofState,
      createProofState({ completed: false })
    ),
  /final playback guard/i
);

const staticObservability = {
  version: "aurora-vfx-runtime-observability/v1",
  identityStatus: "ready",
  hostGraphStatus: "pass",
  assetSettlementStatus: "settled",
  drawLedgerStatus: "pass",
  particleShaderLedgerStatus: "pass",
  playbackGuard: {
    status: "pass",
    triggerCount: 1,
    loop: false,
    overlapCount: 0
  },
  proofGate: {
    status: "pass",
    blockerManifest: []
  }
};
assert.equal(
  assertVfxStaticPreflightObservability(staticObservability).proofGate.status,
  "pass"
);
for (const invalidObservability of [
  { ...staticObservability, hostGraphStatus: "fail" },
  {
    ...staticObservability,
    playbackGuard: { ...staticObservability.playbackGuard, triggerCount: 2 }
  },
  {
    ...staticObservability,
    proofGate: { status: "fail", blockerManifest: ["draw-failed"] }
  }
]) {
  assert.throws(
    () => assertVfxStaticPreflightObservability(invalidObservability),
    /static preflight observability did not pass/i
  );
}

console.log(
  JSON.stringify({
    status: "ok",
    contract: "vfx-capture-proof-gate",
    rejectedPlaybackVariants: 6,
    rejectedStaticPreflightVariants: 3
  })
);
