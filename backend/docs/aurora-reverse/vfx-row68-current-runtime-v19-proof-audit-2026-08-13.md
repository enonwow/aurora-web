# Row 68 current-runtime proof audit v19

Date: 2026-08-13

Status: `valid-single-playback-matched-with-open-context-gaps`; canonical
visual parity is not claimed.

## Source policy

- Aurora-first: yes. The source row, admitted `vim_heal04` model, source
  animation, emitter families, source light, and existing runtime semantics
  were preserved. No image-derived parameter was introduced.
- xoreos used: no.
- NWN or Toolset launched: no. The approved immutable one-trigger NWN MP4 was
  reused without rerun.
- Aurora Web playback: exactly one fire-and-forget playback, with no retry,
  loop, or overlap.

## Scope

- `visualeffects.2da` row: `68`, `VFX_IMP_HEALING_M`.
- Source model: `vim_heal04`, SHA-256
  `6dc087ce635ed0dc697968e5411ff7faabcf0b564be539f5f470c57d451c3be1`.
- Source animation: `impact`, `2.6333301067352295` seconds.
- Emitters: `sunbeam`, `Sparkles`, `Explosion01`, and `Explosion`.
- Source light: `flash`, radius `5`, multiplier `1.6`.
- Runtime seed: `680068`.
- Runtime particle maxima in source update order: `66`, `16`, `64`, and `45`.

The maxima remain consistent with the Aurora-first dynamic-capacity work in
`vfx-dynamic-particle-capacity-audit-2026-07-19.md`. The old fabricated
64-particle capacity is not present.

## Proof gate

The accepted static preflight was performed before playback and reports:

- complete frontend/backend runtime identity;
- canonical host graph `pass`;
- asset settlement `settled`;
- draw and particle-shader ledgers `pass`;
- proof gate `pass` with an empty blocker manifest;
- playback hooks absent during preflight;
- frame `30/112` at `t=1`, with `150` active particles and one source light.

Build identity:

- commit:
  `348e8ff0e27677b7c611c56afa4d706685b393f0-dirty-188f5400b19c6394`;
- image digest:
  `sha256:188f5400b19c63941fd85c4443e11e0bd1ac2f4d391a8b3e0265b9cfeebad7d4`.

The preflight also reports the important proof-context gap explicitly: no
recovered exact target, source scene, or classified NWN camera. This is an
open comparison-context gap, not a runtime blocker.

## Playback validation

The fresh Aurora Web MP4 is `8.5` seconds, `255` frames, and `30 fps`. The
validated one-playback ledger confirms:

- one playback, `loop=false`, and no overlapping effects;
- capture armed before playback;
- effect onset at encoded video time `2.3` seconds;
- all four emitters end with zero active particles;
- clean post-roll;
- source-light illumination is measured on the receiver;
- the receiver returns to baseline after the final black source-light key.

Using the same encoded-pixel visibility metric, the Web visible span is
`1.533` seconds and the saved NWN span is `1.417` seconds, a descriptive
delta of `+0.117` seconds. This does not authorize a lifecycle correction:
the previous source-backed dynamic-capacity packet already measured a similar
positive delta, the encoders run at different frame rates, and the camera,
receiver geometry, screen scale, room lighting, and baseline differ.

## Artifacts

- Reused NWN MP4:
  `evidence/vfx-nwn-web-row68/nwn/nwn-row68-one-trigger.mp4`
  - SHA-256:
    `672b1d798c35df688770683a42071ba6e4a79829d162f276d345246dc88ec01c`.
- Accepted static preflight screenshot:
  `evidence/vfx-nwn-broad-proof-2026-07-16/row68/aurora-web/preflight/vfx-nwn-web-row68-time-1-v19-current-runtime-20260813.png`.
- Fresh Aurora Web MP4:
  `evidence/vfx-nwn-web-row68/web/web-row68-one-trigger-v19-current-runtime-20260813.mp4`
  - SHA-256:
    `443177f6bc73069ebf1b136a1942e137dec8900c3512157e0d9881d0dd8609d5`.
- Validated Aurora Web summary:
  `evidence/vfx-nwn-web-row68/web/validated-summary-v19-current-runtime-20260813.json`.
- Onset-aligned side-by-side MP4, NWN left and Aurora Web right:
  `evidence/vfx-nwn-web-row68/nwn-vs-aurora-web-row68-comparison-v19-current-runtime-20260813.mp4`
  - SHA-256:
    `8d47f3e64a7c1b39cae4a31c031a5b84d17fbfef45f01cb2d8d20d42905f04de`.
- Side-by-side contact sheet:
  `evidence/vfx-nwn-web-row68/nwn-vs-aurora-web-row68-comparison-v19-current-runtime-20260813-contact-sheet.png`
  - SHA-256:
    `61bc3713942cbb31af63dacb7707c22de443ca0b23dc9add5834571d3cd1e04d`.
- Machine-readable comparison manifest:
  `evidence/vfx-nwn-web-row68/nwn-vs-aurora-web-row68-comparison-v19-current-runtime-20260813.json`.

The comparison MP4 is onset-aligned by encoded frames. It is not a claim that
the source runtimes share a recovered absolute clock.

## Visual verdict

Confirmed:

- the four source emitter families and source light execute in one complete
  lifecycle;
- both recordings show the yellow-white impact core, cool secondary core,
  and ascending spark/ray structure;
- source-backed bloom is active;
- there is no repeated or overlapping VFX playback;
- the particle-capacity correction remains functional on the current runtime.

Open gaps:

- NWN renders on the player character in a lit room, while the Web fixture
  renders on a dark neutral capsule;
- the exact NWN camera matrix, target mesh, screen scale, static lighting, and
  scene receiver geometry are not recovered in the current fixture;
- the saved NWN result has stronger environmental spill, while the Web result
  isolates the source-light response on a diagnostic receiver;
- residual size, shape, luminance, and encoded-tail differences cannot be
  assigned solely to particle geometry or lifecycle under this context.

No per-row size, alpha, color, lifetime, bloom, or light tuning is justified
by this packet. The next valid parity step is to recover and admit the retail
target/scene/camera context, then make one replacement Web playback against
the same saved NWN oracle.
