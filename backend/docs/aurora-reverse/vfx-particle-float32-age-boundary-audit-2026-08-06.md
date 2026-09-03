# VFX particle float32 age-boundary audit

Date: 2026-08-06

Status: primary Aurora defect confirmed; implementation authorized for the
shared particle-age, lifetime, normalized-age, and interpolation storage
boundaries.

## Scope and source policy

This audit covers particle age storage and the lifetime comparison shared by
canonical Fountain/Explosion/P2P/Chunk particles, plus the corresponding
Single and Lightning age writes.

- Primary source: the admitted Aurora Toolset decompilation at
  `C:/Projects/New Folder/export/decompiled_all.c`.
- Admitted binary identity: MD5 `20e2ab3ea77805a8d07d9ff751314cfd`, SHA-256
  `4c156de898817518e8a97f5d989592894d3c8f48b71d27e2a8b89500cd230f24`.
- xoreos was not consulted.
- No retail VFX was started or retriggered.

## Primary findings

1. The ordinary active-particle path `FUN_00a2d9c4` compares the evaluated
   lifetime with particle age at `particle +0x6c`, then writes
   `age = delta + age` back through a `float *`:
   `decompiled_all.c:855146-855177` (write at `855171`).
2. The Single path writes the same field through `float *` before applying its
   lifetime/loop rule: `decompiled_all.c:857346-857357`.
3. The Lightning-compatible path also writes `particle +0x6c` through
   `float *`: `decompiled_all.c:857666-857670`.
4. Textured-particle rendering reads that stored float age, multiplies it by
   the float inverse lifetime into local float `local_3c`, and uses the result for
   source-backed color, alpha, and X/Y size interpolation:
   `decompiled_all.c:856240-856317`.

The storage type is behaviorally observable. Repeated `0.1`-second updates
produce a float32 age greater than `1.0` after ten writes, while JavaScript
double accumulation remains just below `1.0`. Because Aurora tests lifetime
before the next age write, the double path retains and renders the particle for
one extra update.

## Pre-fix Web defect

`aurora-vfx-runtime-state.ts` reproduces float32 storage for Fountain spawn
cadence, but particle age still uses JavaScript double addition in the shared,
Single, and Lightning paths. This can extend visible tails by one capture frame
and shifts the normalized age used by color, alpha, size, and atlas state.

## Authorized correction

1. Add one shared helper that stores `age + delta` as float32.
2. Use it for every confirmed `particle +0x6c` age-write path: shared active
   particles, Single, and Lightning.
3. Store the evaluated per-particle lifetime as float32 and compute the render
   age fraction through the recovered float inverse-lifetime boundary.
4. Store the resulting linear color, alpha, and X/Y size samples as float32;
   preserve the recovered start/end expression and do not enable unproven
   midpoint fields.
5. Keep the recovered lifetime-check order unchanged.
6. Do not change source `lifeExp`, capture duration, emitter birthrate, atlas
   ranges, proof timing, or the saved NWN oracle.
7. Add a regression where ten `0.1`-second writes followed by the next native
   pre-update lifetime check must recycle the particle instead of rendering one
   additional frame.

## Evidence boundary

This correction establishes the native float32 age storage boundary. It does
not prove exact retail camera, RNG, scene lighting, framebuffer exposure, or
pixel parity. A fresh Web playback may be compared with the already saved NWN
recording only after the runtime and proof gates pass.

## Implemented correction

`backend/src/modules/vfx/domain/aurora-vfx-runtime-state.ts` now:

- stores shared, Single, and Lightning age updates through `Math.fround`;
- stores evaluated per-particle lifetime as float32;
- computes normalized age from float32 age and float32 inverse lifetime;
- stores final linear color, alpha, X-size, and Y-size samples as float32;
- preserves the recovered pre-update lifetime-check order and all authored
  timing fields.

No per-effect row-50 override or visual tuning was added. The correction is on
the shared runtime path used by the confirmed emitter families.

## Test-first verification

The new regression first failed with JavaScript double accumulation:

- expected age after ten `0.1` writes: `1.0000001192092896`;
- pre-fix result: `0.9999999999999999`;
- consequence: one additional rendered lifetime frame.

After the shared correction:

- `aurora-vfx-runtime-state.spec.ts`: `94/94` passed;
- runtime state, render contract, and VFX application suites: `166/166`
  passed;
- focused frontend runtime-observability and canonical-renderer suites:
  `73/73` passed;
- backend and frontend production builds passed;
- `test-vfx-capture-proof-gate.mjs` passed all rejection self-tests.

## Fresh guarded proof

The saved approved NWN recording was reused without starting NWN or Toolset:

- NWN MP4 SHA-256:
  `a1a9df16a51579f01ac1399435ceb0c770b4887e684b7e4364198cabbeb84bd8`.

The static row-50 preflight passed before playback with runtime identity,
canonical host graph, settled assets, draw ledger, particle shader ledger, and
proof gate all accepted. Aurora Web was then played exactly once:

- Web MP4:
  `evidence/vfx-nwn-broad-proof-2026-07-16/row50/aurora-web/aurora-web-row50-one-trigger-float32-age-v14-20260806.mp4`;
- Web MP4 SHA-256:
  `390f46a53c724414348b84e88dd35714b6bba506967ac2469cf2b718667ebce9`;
- summary SHA-256:
  `855950415f5293394131a17ac6e9cf42dfd31d8bd97d187bb1fdec74ea856309`;
- deterministic plan: `315` MP4 frames at `30 fps`, `triggerCount=1`,
  `loop=false`, `overlapCount=0`;
- final state: completed, post-duration hidden, `phase=post`, zero draws, empty
  blocker manifest, overlay disabled, proof gate `PASS`.

The onset-aligned comparison reuses the prior validated NWN onset and the
deterministic Web pre-roll origin; it does not retrigger either runtime:

- comparison MP4 SHA-256:
  `ef9e2b0884c38845db46ce0da4f846574290eb47607612f028ce92a6d191ab75`;
- contact-sheet SHA-256:
  `74d073d4b769a16d5acd8dd7e3d72b78f1cd29d9371cc22f2cbab221fe93d4bb`;
- comparison manifest:
  `evidence/vfx-nwn-broad-proof-2026-07-16/comparisons/row50-float32-age-onset-aligned-v14-20260806.json`.

## Visual verdict

Status remains `matched-with-gaps`. The native age boundary is closed by the
decompilation-backed runtime regression, and the fresh proof establishes that
the corrected shared path renders and terminates cleanly. It does not isolate
the one-frame age change as a framebuffer-only claim because the saved NWN and
Web captures have different source frame rates and unmatched scenes.

The comparison still shows an oversized, overexposed Web onset, a broader
horizontal glow, a weaker vertical column, and a compact peak relative to NWN.
Those differences require the next Aurora-first shape/material audit; they are
not authorized for visual tuning from the MP4 alone.
