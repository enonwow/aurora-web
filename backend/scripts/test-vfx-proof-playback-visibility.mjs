import assert from "node:assert/strict";

import { hasVisibleCanonicalVfxPlayback } from "./vfx-proof-playback-visibility.mjs";

assert.equal(
  hasVisibleCanonicalVfxPlayback({
    visibleDrawMeshCount: 1,
    visibleDrawParticleCount: 1
  }),
  true
);
assert.equal(
  hasVisibleCanonicalVfxPlayback({
    visibleFrameCount: 1,
    drawParticles: 1,
    objectDurationVisualOwnerPhase: "duration"
  }),
  true
);
assert.equal(
  hasVisibleCanonicalVfxPlayback({
    visibleFrameCount: 1,
    drawParticles: 0,
    sourceLightCount: 0,
    renderedChunkModels: 0,
    objectDurationVisualOwnerPhase: "released"
  }),
  false
);
assert.equal(hasVisibleCanonicalVfxPlayback(null), false);

console.log(
  JSON.stringify({
    status: "passed",
    contract: "aurora-vfx-proof-playback-visibility/v1"
  })
);
