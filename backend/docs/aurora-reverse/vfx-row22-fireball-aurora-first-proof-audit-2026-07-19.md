# VFX Row 22 Fireball Aurora-First Proof Audit

Date: 2026-07-19
Status: diagnostic proof verified; parity remains open

## Scope

This audit checks the reported row 22 fireball concerns:

1. ring-wave visibility and RGB/RGBA handling;
2. the apparent late flame;
3. the apparent chunk lifetime;
4. the validity of the NWN-versus-Aurora Web timing comparison.

It also records the fresh Aurora Web `v62` capture after the source-backed TXI
and chunk-material corrections.

## Rules and source policy

The rules-first, Aurora-first, no-guessing, test-first,
diagnosability-first, visual differential-parity, and proof-capture gates were
applied.

xoreos was not used. This audit contains no
`sourceClass: secondary-gpl-reference` observation.

Primary evidence:

- `sourceClass: primary-retail-resource`: `vff_explfire.mdl`,
  `fx_rockchunksml.mdl`, particle textures, TXI sidecars, and retail particle
  shaders;
- `sourceClass: primary-aurora-reverse`: particle alpha interpolation, atlas
  frame state, lifecycle expiry, chunk rendering, and non-punch render-state
  paths in `C:/Projects/New Folder/export/decompiled_all.c`;
- `sourceClass: primary-retail-capture`: the saved single-trigger NWN MP4,
  trigger ledger, and capture summary;
- `sourceClass: primary-aurora-web-runtime`: the deterministic `v62` Web
  capture, runtime timeline, validator output, and exact saved artifacts.

## Confirmed Aurora behavior

### Ring alpha

`fxpa_ringwave` is a 24-bit RGB texture. Aurora does not require an RGBA source
asset for this emitter. The retail particle path evaluates RGB and alpha
separately and writes packed vertex color/alpha before sampling the texture.
Aurora Web likewise carries particle RGB and a separate per-vertex alpha
attribute.

Changing the texture to RGBA or increasing ring alpha from appearance alone is
not authorized by the current evidence.

### Late red sprite

`Flame01` uses `fxpa_flstrk` with `lifeExp=0.2`. It cannot be the late visible
red sprite.

The late sprite is `MainExplode02`, using `fxpa_explode1`, a 4x4 atlas at
16 fps with `lifeExp=1`. The second source spawn keeps that sprite alive to
approximately effect time 1.133 seconds. In the fresh Web capture it is visible
in `web-row22-v62-last-visible.png` and absent from
`web-row22-v62-tail.png`.

### Chunks

`Chunkssml` produces eight `fx_rockchunksml` chunk particles across the two
source detonate bursts. The source model declares `lifeExp=5`.

The `v62` runtime rendered all eight chunk models, applied 185 source-backed
static WOK collision hits, landed particle IDs 1 through 8, and ended with zero
rendered chunks. Shortening chunk lifetime to match the encoded NWN playback
would contradict the retail source lifecycle.

## NWN capture timing finding

The saved NWN capture was acquired in a wall-clock loop but accepted frames
were written at a fixed 12 fps. The runner did not persist one runtime
timestamp per encoded frame. Its sparse `firstGameplay`, `midElapsed`, and
`bestElapsed` values do not form a frame timeline, and the selected best-frame
image is not a validated row 22 onset anchor.

Therefore:

- NWN encoded PTS is not accepted as runtime time;
- no playback speed factor can be recovered from the saved metadata;
- the former `visibleSpanSeconds` NWN-versus-Web delta is invalid;
- the saved MP4 remains useful only as a qualitative retail morphology and
  phase-order reference.

The comparison tooling now emits:

- `VFX_RETAIL_CAPTURE_FRAME_TIMESTAMPS_MISSING`;
- `VFX_RETAIL_CAPTURE_PTS_NOT_RUNTIME_TIME`;
- `canMapRuntimeTimeToVideoPts: false`;
- `canCompareRuntimeDurations: false`.

## Fresh Web proof

Capture:

- MP4:
  `backend/docs/aurora-reverse/evidence/vfx-nwn-web-row22/web/web-row22-one-trigger-v62.mp4`
- SHA-256:
  `22e1d6c28c1a9c719155e15898e9f17a58faaae81b60f925017c8a35990190f6`
- summary:
  `backend/docs/aurora-reverse/evidence/vfx-nwn-web-row22/web/web-row22-one-trigger-v62-summary.json`
- validator:
  `backend/docs/aurora-reverse/evidence/vfx-nwn-web-row22/web/validated-summary-v62.json`

Validated capture facts:

- exactly one Web playback;
- loop disabled;
- capture armed before playback;
- deterministic monotonic `renderAt` PNG sequence;
- 187 encoded frames at 12 fps;
- all emitters end with zero active particles;
- zero draw particles and zero rendered chunks at completion;
- clean post-roll;
- source flash light reaches its final black key;
- source-backed TXI state reports `fxpa_explode1:mipmap=false`;
- eight source chunk models and materials were rendered.

The validator status is
`diagnostic-only-single-playback-open-context-gaps`, not parity-complete.

## Comparison artifacts

- descriptive still board:
  `backend/docs/aurora-reverse/evidence/vfx-nwn-web-row22/nwn-vs-aurora-web-row22-comparison-v62.png`
- comparison manifest:
  `backend/docs/aurora-reverse/evidence/vfx-nwn-web-row22/nwn-vs-aurora-web-row22-comparison-v62.json`
- side-by-side encoded sequence:
  `backend/docs/aurora-reverse/evidence/vfx-nwn-web-row22/comparisons/nwn-vs-aurora-web-row22-v62-source-scene-onset-aligned.mp4`
- video manifest:
  `backend/docs/aurora-reverse/evidence/vfx-nwn-web-row22/comparisons/nwn-vs-aurora-web-row22-v62-source-scene-onset-aligned.json`

These artifacts are explicitly descriptive. They do not claim shared runtime
time, synchronized tail samples, pixel parity, or duration parity.

## Visual review

The two runtimes show the same broad sequence family:

- yellow-white central explosion;
- orange/red contour and expanding ring;
- smoke and chunk tail after the flash.

Material differences remain visible, but the current packet cannot attribute
them solely to the renderer because:

- the saved NWN onset frame is already its captured peak while Web onset and
  peak are separate frames;
- NWN frame acquisition cadence is irregular and unrecoverable;
- exact camera pose is not recovered;
- owner and target creatures are absent from the Web proof scene;
- the Web scene omits tile-local lights and wall/ceiling fade.

The visible rug/floor rectangles in Web are source-scene receiver geometry,
not VFX particles.

## Verification

- `python -m unittest backend.test.differential-parity.test_vfx_row22_oracle_timing`
  - passed: 4/4;
- `npm.cmd exec vitest run tests/unit/modules/layout/auroraVfxCanonicalRenderer.test.ts`
  - passed: 53/53;
- `npm.cmd run build`
  - passed;
- `python -m py_compile` for the timing helper and both comparison generators
  - passed;
- Web `v62` capture validator
  - capture valid, comparison not ready due explicit context gaps.

## Verdict and remaining work

The three reported observations do not currently justify another particle
runtime change:

- ring alpha is already separate from the RGB texture;
- the late red sprite matches the source `MainExplode02` lifecycle and is gone
  in the next tail sample;
- chunk persistence matches source `lifeExp=5` and terminates cleanly.

This closes the false timing comparison and records a fresh Web diagnostic
proof. It does not close full VFX parity. Exact camera/scene/owner matching,
wall and tile-local lighting, exact blend factors, and a future retail capture
with per-frame wall-clock timestamps remain open evidence lanes.
