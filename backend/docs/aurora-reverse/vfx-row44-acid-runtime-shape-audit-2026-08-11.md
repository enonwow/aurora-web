# VFX row 44 acid runtime and shape audit

Date: 2026-08-11

Status: Aurora-first runtime/renderer audit complete; shared Explosion burst
count repaired; fresh one-playback Web comparison accepted

## Scope and source policy

This audit checks the current `VFX_IMP_ACID_S` (`visualeffects.2da#44`,
`vim_explacid`) result before any implementation change. The approved saved
NWN recording is reused and NWN is not launched. Primary evidence is the
retail binary model, the exact KEY/BIF textures and TXI sidecars, the saved NWN
recording, and admitted Aurora decompilation. xoreos was not used.

## Source effect

The exact binary model SHA-256 is
`64c610ac4ebce0f7c0b79af2432e430943fe5280db5948df8300a2360cb7c6d3`.
It contains three emitters:

- `sparks`: Explosion, Motion_Blur, 30 particles, `lifeExp=0.1`,
  `velocity=10`, `randvel=1`, `size=0.12 -> 0`, `blurLength=0.8`;
- `acid`: Explosion, Aligned_to_Particle_Dir, 50 particles, `lifeExp=0.1`,
  `velocity=2`, `size=0 -> 2`;
- `cloud`: Fountain, Normal, two particles in the audited impact timeline,
  `lifeExp=2`, `mass=-0.1`, `randvel=0.3`, `size=0.5 -> 3`.

All three use source Lighten blending. The exact resources are
`fxpa_strk_b`, `fxpa_flstrk`, and the 4x4 `fxpa_smoke01a` atlas. Their TXI
sidecars only set `downsamplemax 0` and `downsamplemin 0`; they do not set
`mipmap`, `filter`, or `clamp`. The first two textures are intentionally
opaque grayscale streak masks. The cloud atlas is intentionally opaque
grayscale; particle alpha supplies its temporal fade.

## Recovered Aurora contracts

Primary decompilation:
`C:\Projects\New Folder\export\decompiled_all.c`.

- Fountain and Explosion update particles active at tick entry before
  allocating current-tick particles (`FUN_00a31288`, lines 856959-857128;
  `FUN_00a31ca4`, lines 857180-857263). Web uses the same order.
- Motion Blur mode is runtime value 6. Its history update lerps the stored
  previous position toward the current position by
  `min(delta, blurLength) / blurLength` before kinematics
  (`FUN_00a31288`, lines 856961-856998; `FUN_00a31ca4`, lines
  857182-857225). Web uses the same float32 path.
- Motion Blur drawing uses the full 3D current/previous segment, projects it
  through both camera-plane axes, normalizes by full segment length, doubles
  the normal half-width, halves the longitudinal half-size, and fades the
  trailing cap by `min(width / segmentLength, 1)` (`FUN_00a2e250`, lines
  856337-856417 and 856701-856765). The canonical renderer matches these
  operations.
- Aligned_to_Particle_Dir uses the particle orientation slot (mode 5,
  `FUN_00a2e250`, lines 856495-856520). The shared spread-composed
  orientation is already used for both initial velocity and rendering.
- Lighten is source alpha against destination one. Exact RGBA texture binding,
  packed vertex color, raw-gamma particle composition, and the retail particle
  shader path are already active globally.

## Deterministic Web state

At 60 Hz the two Explosion lanes are visible at `t=0.0666667 s` and have
expired by `t=0.1333333 s`, consistent with `lifeExp=0.1` and native
birth-tick ordering. The cloud particles are born at `t=0.15 s` and
`t=0.25 s`; they then expand and fade for two seconds. This explains why a
late static cloud is broader than the early static cloud. It is not evidence
of a delayed trigger or a duration bug.

The current static preflight frames are saved under
`evidence/vfx-nwn-broad-proof-2026-07-16/row44/aurora-web/preflight` at
`t=0.067`, `0.773`, `1.288`, and `1.8` seconds. No playback was invoked to
produce those frames.

## Visual comparison boundary

The saved NWN oracle is
`row44/nwn/nwn-row44-one-trigger-approved-recapture.mp4`, SHA-256
`6db297444b59edaee29c3b9e4b465cb6bee29013a693d9cec22ad0302ee5c95d`.
It contains one trigger and runs at approximately 7.764 fps. The retail first
burst is therefore undersampled relative to the 0.1-second Explosion
lifetime, and its individual particle distribution cannot identify an exact
retail RNG stream.

The current Web proof scene is still not an exact comparison context: two of
four source tiles and the source/player actor are absent, local tile lighting
is incomplete, and the retail camera transform is unknown. The source-backed
target actor is active, but its projected screen height is materially smaller
than in the saved NWN frame. Those differences affect apparent footprint,
luminance, bloom, and receiver spill.

The early Web streaks are visibly sharper than the low-frame-rate NWN onset,
and the Web cloud is more compact at some compared frames. The recovered
runtime, geometry, texture, alpha, and blend contracts do not justify changing
particle parameters to hide those differences. Status remains
`matched-with-gaps`, with camera/scene/postprocess/retail-RNG boundaries
explicit.

## Accepted proof

One fresh Web fire-and-forget playback was recorded after the audit. The
accepted MP4 is
`row44/aurora-web/aurora-web-row44-one-trigger-animation-origin-60fps-exact-base-scene-target-actor-observability-v6-20260811.mp4`,
SHA-256
`792d2f37cfada348fc0d053b6c31aa7bfe83fdec3e4fd8554d799e0081cf1c42`.
Its `aurora-vfx-runtime-observability/v1` report passes with one trigger,
`loop=false`, zero overlaps, settled assets, draw-ledger PASS, an empty blocker
manifest, completed playback, and the effect hidden after its duration.

The proof reuses the approved NWN MP4 without relaunching or retriggering NWN.
The onset-aligned comparison is
`comparisons/nwn-vs-aurora-web-row44-current-global-runtime-onset-aligned-v6-20260811.mp4`,
SHA-256
`4a43e3cbbe179d3a9717ed8295819e457a9a7ad2b2f1d6172ee64ef894453b0b`.
The contact sheet is the matching `-contact-sheet.png`, SHA-256
`0f6ea9d4a61e20b52d270a6e673aa2c4301bd45620325095a75e94771ac0a64f`.
The immutable comparison manifest is
`comparisons/row44-current-global-runtime-onset-aligned-v6-20260811.json`.

The outcome is `matched-with-gaps`. No row-specific particle or renderer
tuning is justified by the recovered Aurora contracts. Visual parity is not
promoted while the camera, incomplete source scene, local lighting, and retail
RNG boundaries remain open.

## 2026-08-13 shared-path closure and current proof

The canonical comparison renderer already consumed backend runtime frames with
the native row-44 Explosion peaks of `30` and `50`. A separate shared frontend
source-MDL/placeable path still computed `round(birthrate * lifeExp)` and capped
the result at 48. Primary decompilation of `FUN_00a31ca4` confirms that Aurora
uses the truncate-toward-zero result of evaluated `birthrate` directly as the
one-shot burst count. The shared path now uses that contract globally; details
are recorded in
`vfx-explosion-burst-count-frontend-parity-audit-2026-08-13.md`.

The focused regression and the complete VFX renderer test file pass (`124/124`)
with the canonical test backend origin. The production frontend build also
passes.

The current accepted Web proof is
`row44/aurora-web/aurora-web-row44-one-trigger-explosion-count-shared-v1-20260813.mp4`,
SHA-256
`66e9bb7c7c23de2b889d63516321a09d87d4128bee9896bb0e9b83c239bb7b5b`.
It records one deterministic fire-and-forget trigger, `loop=false`, zero
overlaps, 72 encoded frames over nine seconds, completed playback, hidden
post-duration state, and PASS for runtime identity, host graph, assets, draw
ledger, particle shaders, playback guard, and proof gate. The blocker manifest
is empty.

NWN was not relaunched. The comparison reuses
`row44/nwn/nwn-row44-one-trigger-approved-recapture.mp4` and is saved as
`comparisons/nwn-vs-aurora-web-row44-explosion-count-shared-v1-onset-aligned-20260813.mp4`,
SHA-256
`df4e836ea80f066c5950ab390dbdb6b5dc5112275385f4a209f4e1705f0fbca7`.
Its contact sheet SHA-256 is
`b2cd3b4b76038f09a1f87e7eddde1a68641c887b52b25e5907c1ee66c49ce3a2`;
the immutable comparison manifest is
`comparisons/row44-explosion-count-shared-v1-onset-aligned-20260813.json`.

The current outcome remains `matched-with-gaps`: burst-count semantics are now
closed in both renderer paths, while camera, source-scene completeness, local
lighting, retail RNG alignment, and postprocess remain explicit proof-context
boundaries rather than grounds for row-specific tuning.

## 2026-08-13 exact BIC source-actor context update

The former source-scene completeness statement is superseded. The row-44 Web
fixture now contains all four exact HAK-backed tile instances, fourteen source
textures, source-backed Area/tile lighting, the exact BIC-derived `pfh0/a_fa`
source creature, and the exact `c_yinnkeep/a_ba` target. The source/target
separation and facing come from `vb44shot.nss`.

Fresh v23 current-runtime playback remains valid one-trigger VFX evidence but
predates the source-actor injection. Fresh v29 static proof validates the new
two-actor scene without a second playback. Camera projection and scene
material/lighting response remain open; early Explosion pixels remain
undersampled by the `7.764 FPS` NWN oracle. Detailed audit:
`vfx-row44-exact-bic-source-actor-proof-scene-audit-2026-08-13.md`.
