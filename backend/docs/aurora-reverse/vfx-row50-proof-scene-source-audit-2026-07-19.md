# VFX row 50 proof-scene source audit

Date: 2026-07-19

Scope: source scene, target actor, scripted orientation, and comparison-camera
evidence for `visualeffects.2da#50` (`VFX_IMP_DEATH`).

Status: implemented source-backed row-50 comparison checkpoint with accepted
Aurora Web proof v3. The comparison is `matched-with-gaps`; the exact retail
camera transform and remaining material/postprocess behavior must not be
claimed as parity.

2026-08-13 supersession: the historical two-tile scene and v3 proof below are
retained as chronology, but they are no longer current. Exact packed-module
HAK precedence resolves all four tiles and source-backed tile lights. Current
camera/proof/comparison evidence is in
`vfx-proof-scene-hak-precedence-closure-audit-2026-08-13.md` and
`vfx-row50-proof-camera-source-audit-2026-08-13.md`.

## Source policy

- Aurora-first: yes.
- Primary evidence: saved approved NWN proof packet, packed row-50 module,
  Aurora ARE/GIT resources, NWScript capture harness, KEY/BIF tileset
  resources, and the existing separately admitted creature render package.
- xoreos used: no.
- NWN or Toolset launched for this audit: no.

## Saved retail invocation

`row50/nwn/scripts/vb50shot.nss` applies exactly one instant
`EffectVisualEffect(VFX_IMP_DEATH)` to the creature tagged `effect_test`.
Immediately before application it executes:

- source: `SetFacingPoint(GetPosition(oTarget))`;
- target: `SetFacingPoint(GetPosition(oSource))`.

The saved module positions are source `(9.5, 3.8, 0)` and target
`(9.5, 6.8, 0)`. Therefore the target's scripted Aurora XY forward vector is
`(0, -1)`. The effect origin is the target object, not an arbitrary empty
location.

## Packed module identity

The approved NWN proof summary identifies:

- module:
  `C:\Users\enonw\Documents\Neverwinter Nights\modules\codex_vb_row50.mod`;
- module SHA-256:
  `f7602d85db6768af7940f7de19aa54799ab1e9398aa224451bd6bf9d94b24fb1`;
- area resref: `enon_test_effect`.

The source pack is:

`evidence/vfx-nwn-broad-proof-2026-07-16/row50/nwn/source-scene/enon-test-effect-row50-source-pack-20260719`

It records:

- raw ARE SHA-256:
  `3bd24a1014ac5052a34e77c200fda9dc05b908bdc4f696f9b485ea76d9eb6f3c`;
- raw GIT SHA-256:
  `bd3637343c89bb7c719a260cd61d07f5774be21a9b840107451abe9c046df8e6`;
- four source tile instances;
- historical base-key-only resolution found `tin01_h01_02` and
  `tin01_h01_03` but missed packed-module HAK precedence;
- current exact-module resolution also maps both tile-id-364 instances to
  `gin01_h01_08` through `q_tilesets.hak`, for 4/4 admitted tiles;
- one creature: tag `effect_test`, template `nw_innkeeper`, appearance `233`,
  position `(9.5, 6.8, 0)`.

The row-50 GIT hash exactly matches the independently extracted row-44 GIT.
The row-50 and row-44 parsed ARE contracts are field-for-field identical,
although their raw ARE resource hashes differ. The row-50 fixture must retain
the row-50 raw source hash rather than substituting the row-44 hash.

## Target actor

The admitted target render package remains:

- template `nw_innkeeper`;
- appearance `233`, `Human: Innkeeper`;
- direct model `c_yinnkeep`;
- supermodel `a_ba`;
- animation `pause1`;
- source forward Aurora XY `(0, -1)`.

This actor is required because the retail effect is object-applied and visibly
occludes and illuminates the target body. The player/source actor remains
omitted because its exact BIC appearance-part and PLT assembly is not yet
reconstructed.

## Camera classification

`vb50entry.nss` requests camera distance `5.8`, pitch `55`, height `1.1`, and a
facing value of `90`. The saved retail MP4 is the visual framing oracle.
However, the internal Aurora camera transform and projection constants are not
recovered by this audit.

The Web proof may therefore use a capture-calibrated perspective camera whose
status is explicitly
`retail-capture-calibrated-camera-transform-not-exact`. It must cite both the
script and the approved saved MP4. It must not present the transform as exact
Aurora runtime semantics.

## Implementation contract

1. Build row-50 proof-scene metadata from the exact row-50 module/source-pack
   hashes.
2. Resolve the ordered HAK list from the exact packed module and admit all four
   source tile instances; tile indexes `2` and `3` resolve to `gin01_h01_08`.
3. Center the scene and effect on the target position.
4. Load the source-backed target actor in `pause1` and orient it from the
   scripted forward vector.
5. Keep the player/source actor explicitly omitted.
6. Record exactly one fresh Web playback only after identity, host graph,
   assets, draw ledger, playback guard, and proof gate pass.
7. Reuse the approved NWN MP4. Do not rerun NWN.
8. Publish the synchronized comparison as `matched-with-gaps` unless all
   remaining camera, scene, material, light, bloom, postprocess, and actor gaps
   are independently closed.

## Impact attachment audit

The row-50 source phase schedule names only
`Imp_Impact_Node=vim_negdeath`. It does not name a head or root attachment.
Live inspection of the separately admitted `c_yinnkeep` actor hierarchy found
the case-insensitive `Impact` node at world position
`(0.0247812236, 1.4320385553, -0.0977130138)` in the proof-scene coordinate
system. The previous VFX group remained at actor-root/floor position
`(0, 0, 0)`, which contradicted both that source contract and the saved retail
capture centered around the target torso.

Aurora Web now resolves the canonical phase schedule through the reusable
object-attachment adapter. `Imp_Impact_Node` maps to the actor `Impact` node;
ambiguous slots, a missing target, or a missing node fail closed. The adapter
composes the resolved world position into the VFX group's parent coordinate
system while preserving world orientation. Preserving orientation is required
for row 50 because the audited source has `OrientWithGround=0` and
`OrientWithObject=0`.

The proof runner records the attachment status, slot, node, and world position
in its runtime diagnostics and `aurora-vfx-runtime-observability/v1` samples.
Focused unit coverage verifies position attachment without inherited rotation,
ambiguous-slot rejection, missing-node behavior, stationary base-anchor
preservation, and proof-motion composition.

## Rejected capture

The first post-adapter capture attempt, v2, is rejected. The proof-only motion
helper reset the attached group to `(0, 0, 0)` when no motion was authored, so
its MP4 was byte-identical to the pre-fix v1 file:

- rejected v2 sidecar:
  `evidence/vfx-nwn-broad-proof-2026-07-16/row50/aurora-web/aurora-web-row50-impact-anchor-v2-rejection-20260719.json`;
- rejected/old MP4 SHA-256:
  `a0e45706f48d8206c50f6c935a1e70f032405211425de15c04cb0a40e1b538ae`;
- accepted playback count: `0`.

This capture must never be used as parity or implementation evidence.

## Accepted Web proof v3

The corrected runner preserves the base attachment position and composes any
optional proof motion relative to it. The accepted deterministic Web capture
is:

- MP4:
  `evidence/vfx-nwn-broad-proof-2026-07-16/row50/aurora-web/aurora-web-row50-one-trigger-impact-anchor-preserved-exact-base-scene-target-actor-observability-v3-20260719.mp4`;
- MP4 SHA-256:
  `56b1ac352f5defe55e1b848cf107c2df4ead599add929df54838d77ea3bcd7b2`;
- frame manifest SHA-256:
  `1bfe4cdd1963fcfc5e0c1290c5b16572b976daeb2a3d142ad2339a7d789fb514`;
- 315 frames at 30 fps over 10.5 seconds;
- exactly one fire-and-forget trigger, no loop, and overlap count `0`;
- final phase `post`, zero draws, zero visible frames, and
  `postDurationHidden=true`;
- ready runtime identity, passing canonical host graph, settled assets,
  passing draw/playback/proof gates, empty blocker manifest, and final overlay
  disabled;
- every recorded playback sample reports attachment status `attached`, node
  `Impact`, and the stable audited world position above.

The saved approved NWN MP4 was reused without launching NWN. Its SHA-256 is
`a1a9df16a51579f01ac1399435ceb0c770b4887e684b7e4364198cabbeb84bd8`.

## Comparison result

The onset-aligned comparison reuses the saved NWN recording and accepted Web
v3:

- comparison MP4:
  `evidence/vfx-nwn-broad-proof-2026-07-16/comparisons/nwn-vs-aurora-web-row50-impact-anchor-preserved-exact-base-scene-target-actor-onset-aligned-v3-20260719.mp4`;
- comparison MP4 SHA-256:
  `95b8e5920e5f20d58627d772435f4766dd7473f0f147701c0de7d128609cb90d`;
- contact sheet SHA-256:
  `ec5c8874f02f05f112e884c0cd7c5177a8eaa921138ac170f8929af37cf5ad98`;
- comparison manifest SHA-256:
  `4dcb64e73f9c0d7c7f8638dfb120d31ebea1f357a7d31e8742878e473ea6f6b8`;
- alignment: retail bright onset `14.8157218073 s` to Web bright onset
  `2.1333333333 s`.

The impact position is now source-backed and visibly better aligned. Remaining
visual gaps are still material:

- the Web initial flash is larger, nearly pure white, and clips above the
  actor while retail remains more bounded;
- the Web early expansion lacks the retail translucent cyan/white full-body
  column;
- near retail peak, Web forms a compact saturated orb instead of the taller
  retail column;
- Web shows sharp vertical motion-blur/souldust spikes after the retail effect
  has already reduced to a faint torso residue;
- Web keeps a stronger late souldust tail;
- exact player appearance, exact native camera transform, retail RNG, and
  material/alpha/light/bloom/postprocess parity remain open. Tile-id-364 and
  source tile-light presence are closed by the 2026-08-13 HAK audit.

Therefore the checkpoint status is `matched-with-gaps`, not visual parity.

## Exact particle texture binding follow-up

The post-v3 audit found that the canonical Web renderer inferred a resource
named `${emitterTexture}a` and bound it as a second alpha map. That is not
present in the exact retail `fsparticle` contract, which samples one RGBA
`texUnit0`.

This matters directly to row 50: `Smoke` explicitly uses `fxpa_smoke01`, whose
RGBA alpha is meaningful, while the separate `Smoke01` emitter explicitly uses
the opaque grayscale `fxpa_smoke01a`. The old Web path multiplied the former by
the latter and could suppress the weak smoke-wave and translucent-column
structure visible in retail.

The shared canonical renderer now binds the exact emitter texture only. Static
and focused unit verification is complete; the v3 proof remains a valid record
of the pre-correction state and must not be presented as post-correction visual
evidence. A fresh one-trigger Web proof and saved-NWN comparison are required.
The detailed Aurora-first record is
`vfx-particle-texture-alpha-binding-audit-2026-07-19.md`.

## Accepted exact-RGBA Web proof v5

The post-correction capture passed the development observability gate and used
exactly one accepted Web playback:

- Web MP4:
  `evidence/vfx-nwn-broad-proof-2026-07-16/row50/aurora-web/aurora-web-row50-one-trigger-exact-texunit0-rgba-impact-anchor-preserved-observability-v5-20260719.mp4`;
- Web MP4 SHA-256:
  `d7eb0f065dc6a7c6598020eba27481a938976c27b12375883d640e0692d92d8d`;
- frame manifest SHA-256:
  `a1448cdaba87a51b9c1919ea8b2fb4eb7d78b5a52f014e9f99481970fdc10521`;
- comparison MP4 SHA-256:
  `1228fb257e6843304a15616e6b40869cff1bc7635ac66479bdb083de358dff2c`;
- contact sheet SHA-256:
  `9c0799e7cb955c7789462c3d01fcf72e383211b06727bb745520f2502c842c0a`;
- comparison manifest SHA-256:
  `ef4f93f6f1e7732f4ceb937087c1a7366e539163289938867fb206d6727e90fe`.

The saved approved NWN MP4 was reused without rerun. Runtime identity, host
graph, asset settlement, draw ledger, single-playback guard, proof gate, and
final hidden state all passed. The result remained `matched-with-gaps`: exact
RGBA binding restored weaker smoke structure, but the initial flash was still
too large and the `souldust` Motion_Blur tail remained too strong.

## Runtime-tail follow-up

The v5 telemetry and source comparison exposed two additional global runtime
defects plus a proof integration artifact:

- active particles retained spawn-time mass instead of the current evaluated
  emitter mass;
- Explosion lacked Aurora's prior-tick one-shot guard at runtime `+0x198`;
- the row-50 proof fixture simulated particles at 8 Hz.

These are corrected and documented in
`vfx-row50-runtime-tail-and-detonate-audit-2026-07-19.md`. The regenerated
fixture uses 60 Hz simulation and serializes every second tick. Its source
counts are lower and terminal state remains clean. The accepted v5 capture is
therefore historical pre-runtime-tail evidence and must not be presented as
post-correction proof.

## Accepted runtime-tail Web proof v6

Fresh post-correction capture v6 passed
`aurora-vfx-runtime-observability/v1` with matching frontend/backend identity,
the exact canonical host graph, settled assets, draw-ledger PASS, exactly one
trigger, no loop or overlap, stable `Impact` attachment, empty blocker
manifest, and a clean final state:

- Web MP4 SHA-256:
  `5aa50ca4113a21037a79084b16d00cec5c6ca600ee19bb6f482fc0fd9424028e`;
- frame manifest SHA-256:
  `0b25f4ff45f163757215fe2ba34c75501cfe8f1602668758b4c54ada3c44b616`;
- comparison MP4 SHA-256:
  `f354a3b354dccf8a211407e7b1dd8dd2f6050cdaa59372310b48c19419f1d96d`;
- contact sheet SHA-256:
  `f8f2065aa17cefc550e9eeb6c8034c9c7ae673bce6d910983eafe6002a650ece`;
- comparison manifest SHA-256:
  `4cf3f822be2e057ad441547fd6c88a197399c4093e06045039b17751f7221a21`.

The approved NWN MP4 SHA-256
`a1a9df16a51579f01ac1399435ceb0c770b4887e684b7e4364198cabbeb84bd8`
was reused without rerun. The comparison remains `matched-with-gaps`: the Web
core is too compact and saturated, the vertical streaks remain too sharp, and
the late residue is stronger and differently distributed than retail.

## Binary source-field and trail proof v8

The binary animation parser now limits animation simulation overrides to
controller-backed properties. This preserves the base source
`souldust spawntype=1` instead of replacing it with a fixed-layout animation
default. The shared trail runtime also consumes resolved previous/current host
positions.

Accepted Web v8:

- Web MP4:
  `evidence/vfx-nwn-broad-proof-2026-07-16/row50/aurora-web/aurora-web-row50-one-trigger-binary-animation-source-fields-trail-observability-v8-20260719.mp4`;
- Web MP4 SHA-256:
  `13b75eda099b7773ad8312afceaf5654543bb752e989cff4b481f20c75e998bf`;
- comparison MP4 SHA-256:
  `f7b73096dccff3061d73eaeac92f200372d59b5df2a4f3e077b9f2b917783a7b`;
- contact sheet SHA-256:
  `ff1d1994d5f324b5506fd18750fd18efa1e2abac1d2700ed42a4849bf6b96580`;
- comparison manifest SHA-256:
  `9ff45044b9612df7614fffffab61de6f56f303fba14d26ee1cc36833ee0a0948`.

The capture has one trigger, no loop or overlap, stable `Impact` attachment,
passing `aurora-vfx-runtime-observability/v1`, an empty blocker manifest, and
zero terminal draws. The saved approved NWN recording was reused without
rerun.

The comparison supersedes the stale v3/v5/v6 claim about a strong late
`souldust` tail: the erroneous vertical spikes are gone. The remaining
source-visible gaps are the oversized clipped initial flash, missing taller
translucent cyan/white column, compact saturated peak, unmatched proof
scene/camera, and open material, alpha, light, bloom, postprocess and retail
RNG context. Status remains `matched-with-gaps`.

## Normal Fountain cadence follow-up

The next Aurora-first audit found a shared precision defect in the normal
Fountain scheduler. Aurora stores the interval and accumulator in float
fields; the JavaScript double accumulator delayed the row-50 birthrate-10
boundary from six 60 Hz ticks to seven.

The shared scheduler now reproduces the float32 storage boundaries. The
regenerated source fixture changes `Smoke01` from 9 to 11 particles while
keeping `sparks=25`, `Smoke=6`, `souldust=0`, `WIND_Dummy=0`, and zero terminal
particles. Detailed evidence is in
`vfx-fountain-float32-cadence-and-source-motion-audit-2026-07-19.md`.

Web v8 is historical for this cadence correction.

## Accepted float32-cadence Web proof v9

Fresh Web v9 records the regenerated float32-cadence fixture:

- Web MP4 SHA-256:
  `f2c01ea95319fe198e1dad181213ea9cb4c33284986c4cda2816ebb4c1abfde2`;
- frame manifest SHA-256:
  `91cfd6628ea18d9b4bc6c7a437bea1f14373725fd859765127ff0d7e3a3722aa`;
- comparison MP4 SHA-256:
  `74cbc359ae811b91759b7e847539862e5e3b3cd922569882fab55d49af1f9ccb`;
- comparison contact-sheet SHA-256:
  `deb942fe3733bff7a7a33049574eb3681603dfc520d27632c73bf12c2d2a168a`;
- comparison manifest SHA-256:
  `3b9abfbfa3026bcc48cbef67666d26a8dd549164aa67bce4ae51966f1cb7c335`.

The proof has 315 frames over 10.5 seconds at 30 fps, exactly one trigger, no
loop or overlap, stable `Impact` attachment, matching frontend/backend build
identity, passing `aurora-vfx-runtime-observability/v1`, no blockers, and zero
terminal draws or visible frames. The approved NWN MP4 was reused without
rerun.

The comparison remains `matched-with-gaps`. The corrected `Smoke01` cadence
adds the two source-required particles and strengthens the Web column, but it
does not reproduce the retail composition. Web still shows an oversized
clipped first flash, a shorter and less translucent cyan/white layer, and a
compact saturated peak instead of the taller retail body column. Camera,
scene-light, material, alpha, bloom, postprocess, and retail RNG parity remain
open global rendering tasks.
