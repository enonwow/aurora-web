# Row 22 v68 proof comparison audit (2026-08-07)

Status: diagnostic proof verified; visual parity remains open

## Scope

This packet validates the standalone proof render-frame correction and compares
one fresh Aurora Web playback against the previously accepted NWN retail MP4.
It does not rerun NWN and does not fire the Web effect more than once.

The change is global to the standalone proof scene: source Area models, source
lights, actors, VFX roots, and Chunk children share one parent frame with
`scale=(-1,1,1)`. It is not a Fireball-specific position override and it does
not add a second mirror to the production Area renderer.

## Evidence

- Fresh Web MP4:
  `evidence/vfx-nwn-web-row22/web/web-row22-one-trigger-v68-production-frame-mirror-camera-calibrated-20260807.mp4`
- Saved NWN MP4:
  `evidence/vfx-nwn-web-row22/nwn/nwn-row22-one-trigger.mp4`
- Onset-aligned comparison:
  `evidence/vfx-nwn-web-row22/comparisons/nwn-vs-aurora-web-row22-v68-production-frame-mirror-camera-calibrated-20260807-source-scene-onset-aligned.mp4`
- Impact contact sheet:
  `evidence/vfx-nwn-web-row22/comparisons/nwn-vs-aurora-web-row22-v68-production-frame-mirror-camera-calibrated-20260807-impact-contact-sheet.png`
- Web validation summary:
  `evidence/vfx-nwn-web-row22/web/validated-summary-v68-production-frame-mirror-camera-calibrated-20260807.json`
- Comparison manifest:
  `evidence/vfx-nwn-web-row22/comparisons/nwn-vs-aurora-web-row22-v68-production-frame-mirror-camera-calibrated-20260807-source-scene-onset-aligned.json`

Hashes:

- Web MP4: `9b251eb51632d6272b5aa1b9087c78a49d864a01d9362e4230150a0ddb5e48ac`
- saved NWN MP4: `f6414e0d184131ce74836c208e6334bb62cf023c502725223758185dd41f0983`
- comparison MP4: `09afb69c0500d13749ebbb470a1f38d12f7bc5ab1b89a6d2bfea67aa35b67c59`
- contact sheet: `1879d8b277f8afadb27aad2efa439bb823bc3c47238d8561a9b655799a177a0f`

Both MP4 files decode without error. The Web MP4 contains all 187 requested
frames; the comparison contains 57 frames.

## Proof gates

The fresh Web capture records:

- exactly one trigger, loop disabled, and no overlap;
- matching frontend/backend build identity at
  `sha256:597ae4670077f1e15b97a06e22ef5f70f4d51e0e54c799a007f64e288c19b86b`;
- runtime identity ready;
- canonical host graph PASS;
- asset settlement settled;
- draw ledger PASS;
- playback guard PASS;
- proof gate PASS;
- empty proof blocker manifest;
- debug overlay disabled in the final profile;
- clean post state with zero particle draws and zero Chunk model draws.

The capture retains eight landed Chunk particles, 1,200 source WOK queries,
185 applied hits, and 1,015 native no-hits in runtime telemetry.

## Visual differential

The parent-frame defect is closed. The source origin and Fireball impact are no
longer displaced to the right; the Web impact now appears at the lower-centre
source location used by the saved retail scene.

The comparison still rejects parity:

- the Web peak is much larger and more clipped;
- the Web orange-red body spreads more broadly and decays with a different
  silhouette;
- smoke and Chunk residue remain visibly different;
- the Web proof scene omits owner/target creatures, five unresolved tile
  source-light transforms, six unreconstructed main-light lanes, and retail
  wall/ceiling fade;
- exact retail camera, SSAO, and retail RNG remain unrecovered.

The source-backed Web encoded bright-pixel span is 1.0 seconds. The saved NWN
MP4 has an encoded bright span of approximately 0.583 seconds, but the NWN
capture did not persist runtime timestamps for every accepted frame. That
difference is descriptive video morphology only and cannot prove a runtime
lifecycle delta or authorize shortening source `lifeExp`, deleting a detonate
event, or changing the atlas.

## Aurora-first decision

No xoreos source was used.

The next implementation may not tune Fireball by appearance. The remaining
shared lanes must be audited against primary Aurora evidence in this order:

1. complete proof-scene light and fade reconstruction;
2. particle draw eligibility, alpha/depth contribution, and peak clipping;
3. Chunk child-smoke and collision/render chronology;
4. retail RNG state/order where morphology still differs after scene parity.

Until those lanes are closed, status remains
`diagnostic-only-single-playback-open-context-gaps`, not visual parity.
