# VFX row 216 authored-angle asymmetry audit (2026-08-12)

## Status

- Aurora-first audit: complete.
- User observation: confirmed. The retail lash is visibly asymmetric and its
  exact source model authors different emitter angles.
- Shared runtime changes: live host animation and the corrected Type 7 root-arc
  lifetime are implemented; fresh visual proof is pending.
- Type 7 now receives inherited `pause1` host animation through the existing
  per-frame attachment resolver; no row-specific angle constant was added.
- xoreos: not consulted.

## Scope and immutable inputs

The audited effect is `visualeffects.2da#216`, `VFX_BEAM_FIRE_LASH`, backed by
ProgFX Type 7 model `vim_lashfire` and animation `cast01`.

Immutable evidence:

- source model `evidence/vfx-nwn-broad-proof-2026-07-16/row216/sources/vim_lashfire.mdl`,
  SHA-256 `89561022afa322832b3c034b21c9b5a69d2c6e9e8caec762a76c21092f4b27bc`;
- saved one-trigger NWN recording
  `evidence/vfx-nwn-broad-proof-2026-07-16/row216/nwn/nwn-row216-one-trigger.mp4`,
  SHA-256 `0b0d5e91d176710c5b38cd9b4c7c2b885c3c08ab3c10142d8242e96495484f67`;
- saved NWN steady still `row216/nwn/validated-steady.png`, SHA-256
  `93fd93d248b124fcc050852d5aca7b68b0bc4a7d4cdaed62805ac8008436ae0e`;
- current Web preflight still
  `row216/aurora-web/preflight/vfx-broad-row216-time-2-current-global-runtime-20260812.png`,
  SHA-256 `4e2ea0aa315de8dc85b418721da7ad95f35d87620ee0c03e2366a6f23b6819cf`;
- current generated Web payload SHA-256
  `fec4b8040bd65edb5822fedfd2e73878e931a34e997bfe6f08a26a644bf8f61d`.

No NWN or Toolset process was launched. The approved NWN oracle was reused;
no effect playback was repeated.

## Exact authored asymmetry

The parsed binary MDL graph proves that the two linked core emitters are not
copies of one symmetric transform:

| Node | Parent | Local orientation axis | Angle (rad) | Reference position |
| --- | --- | --- | ---: | --- |
| `Fire01` | `Dummy02`, identity | `[-0.3574070, 0.3574070, -0.8628560]` | `1.717769959` | `OmenRef02 [-4, -0.0541066, -0.0541058]` |
| `Fire02` | `Dummy01`, +90 degrees around Z | `[0, -0.3826829, -0.9238797]` | `3.141590118` | `OmenRef03 [-3.9988799, +0.0536949, -0.0536946]` |

`Fire03aa01` follows the `Fire01` transform family and `Fire03aa` follows the
`Fire02` family. `cast01` animates alpha and velocity for these emitters; it
does not contain position or orientation tracks that replace the static local
hierarchy. Both linked cores use `spread=0`, `randvel=0`, `velocity=4`, P2P
gravity `20`, drag about `0.1`, and inheritance enabled. Random spread cannot
explain the retail angle difference in this case.

## Primary Aurora runtime evidence

Primary source: `C:\Projects\New Folder\export\decompiled_all.c` plus the
symbolic retail client evidence already indexed by
`vfx-full-decomp-implementation-audit-2026-07-16.md`.

- `FUN_00a2625c` at decompilation line `852744+` copies the emitter-owner world
  quaternion into a new particle and derives its launch direction from that
  orientation.
- `FUN_00a264c0` at line `852921+` applies source spread rotations. For these
  two emitters the authored spread is zero, so no random angular divergence is
  introduced by that branch.
- `CNWCVisualEffectOnObject::LoadBeam 0x8137f0`, `AttachBeam 0x815a70`, and
  `ApplyBeam 0x815b60` establish the Type 7 source/target attachment path.
- `Gob::ReattachReference 0x43fc50` computes the target arc and writes
  `qArc * qRoot` once during attachment.
- `CAurBehaviorAttach::UpdateGobPosition 0x49f470`, through the control path at
  `0x4a2810`, fetches the attached source and target part position and
  orientation every frame. The control write replaces the root orientation;
  it does not reapply the arc.

Therefore Aurora semantics require both the authored local emitter angle and
the live host-part transform. Flattening the two local orientations would be
wrong; freezing animated host parts is also not full retail behavior.

## Current Web runtime measurement

The current payload preserves different composed world orientations at
`t=2.0 s`:

| Emitter | World orientation axis | Angle (rad) | Rotated local-Z direction | Azimuth | Elevation |
| --- | --- | ---: | --- | ---: | ---: |
| `Fire01` | `[-0.676773, -0.262482, -0.687809]` | `2.560958` | `[+0.710709, +0.702734, +0.032518]` | `+45.323 deg` | `+1.864 deg` |
| `Fire02` | `[-0.341284, -0.857947, -0.383996]` | `1.697452` | `[-0.703469, +0.709613, +0.039761]` | `-44.751 deg` | `+2.279 deg` |

This table describes the superseded continuous-root-arc Web result. The parser,
full parent composition and Fountain launch path did not collapse the source
emitters to one orientation, but the incorrectly persistent Type 7 root arc
made the static-host result nearly mirrored. Pairing the 46 Linked draw records by
particle id around source plane `x=-0.002014984` gives mirror RMS residual
`0.02792145 m` and maximum residual `0.03727776 m` over curves spanning about
`3.50 m` along Y.

This is the exact reason the Web proof can look much more symmetric even while
the source angle survives.

## Screen-space diagnostic

The reproducible diagnostic uses the same inclusive bright-core threshold
`RGB >= [245,225,100]` on the saved stills and principal-component axes. It is
not a parity gate because the NWN image includes actors, actor occlusion, the
retail room and a different camera.

| Image | Left absolute tilt | Right absolute tilt | Magnitude difference |
| --- | ---: | ---: | ---: |
| NWN saved oracle | `8.601 deg` | `4.625 deg` | `3.975 deg` |
| Aurora Web current preflight | `5.235 deg` | `4.688 deg` | `0.547 deg` |

The measurement supports the user's visible observation: retail presents a
substantially stronger angular imbalance. It does not prove that a particle
angle coefficient is missing, because screen-space actor occlusion and camera
projection are not controlled between these two images.

Artifacts:

- annotated image:
  `evidence/vfx-nwn-broad-proof-2026-07-16/row216/comparison/asymmetry-audit-20260812/row216-asymmetry-diagnostic.png`;
  SHA-256 `a54eab95b69d56adf6ebde3f8e7e3a81dc380246593b9287613ca9fb9f77886e`;
- machine metrics:
  `evidence/vfx-nwn-broad-proof-2026-07-16/row216/comparison/asymmetry-audit-20260812/row216-asymmetry-metrics.json`;
  SHA-256 `feafd524c9e2cc36ce01fad0a2530315befa9110bbea465296660d9fe6dfa917`;
- generator: `backend/scripts/create-vfx-row216-asymmetry-audit.py`.

## Gap classification

### Proven correct

- Fire01 and Fire02 retain their distinct binary-MDL local transforms.
- Parent hierarchy composition retains the `Dummy01` rotation.
- Type 7 applies the recovered `RotationArc` quaternion order at attach time
  and lets the live attach behavior overwrite it afterward.
- Fountain launch uses the composed emitter orientation.
- Zero source spread and zero random velocity are preserved.

### Proven incomplete in this proof fixture

- The fixture resolves exact base-model `Impact` nodes once and freezes them.
- The retail client refreshes the attached part position and orientation every
  frame.
- The Web proof omits the retail source and target actors, so it also omits
  their animation, geometry and occlusion.
- The Web camera is calibrated but is not the exact retail camera/projection.

The existing runtime already supports a per-time
`effectBeamAttachmentRuntime` resolver. The concrete implementation gap is
fixture and production host integration: provide exact source/target actor
animation states and feed their live `Impact` transforms to that shared
resolver.

The current evidence does not isolate how much of the remaining screen-space
delta comes from the live host transforms, actor occlusion, or the unmatched
camera. A matched host trace and proof scene are required to apportion those
effects.

## Decision

This audit does not authorize a row216 angle constant, a random spread, a
second playback, or a hand-tuned particle offset. Those changes would override
exact source facts while leaving the proven live-host gap unresolved.

The next implementation slice is shared Type 7 host integration:

1. Recover or capture the exact source and target animation states at effect
   onset and steady playback.
2. Emit a per-frame trace of source `Impact`, target `Impact`, `qArc*qRoot`, and
   final Fire01/Fire02 world orientation.
3. Drive the existing attachment resolver with those source-backed actor
   states and include the exact actors in the proof scene.
4. Repeat only the Aurora Web proof and compare it with the already saved NWN
   MP4. Change particle math only if the matched trace still diverges.

## Implementation closure (2026-08-12)

The proven static-host integration gap is now closed in the shared path:

- `aurora-mdl-inherited-animation-graph.ts` composes source-backed inherited
  transform tracks onto the existing base-model hierarchy by Aurora node name;
- the composition covers transform and static-geometry parts because Aurora
  animation controllers address named model parts, not only dummy nodes;
- existing tracks with the same animation name are replaced deterministically,
  so repeated fixture generation cannot duplicate `pause1` channels;
- `prepare-vfx-web-broad-proof-fixtures.ts` verifies the exact retail model and
  supermodel chain `pfh0 -> a_fa` and `c_yinnkeep -> a_ba`, including immutable
  hashes, then supplies one serialized
  `aurora-effect-beam-host-runtime/v1` profile to the shared resolver;
- source `a_fa/pause1` binds to 50 base-graph parts and target
  `a_ba/pause1` binds to 20. Both exact `Impact` ancestry paths now change over
  runtime time instead of remaining in the base pose;
- the fixture manifest records `phasePolicy: effect-onset-normalized` and
  `retailPhaseMatchEstablished: false`. The implementation does not pretend
  that the saved retail actor's exact idle phase was recovered.

Exact retail inputs:

| Input | SHA-256 |
| --- | --- |
| `pfh0.mdl` | `1da54afc5ff270c8c7decc61829df0595c6568d70cdef75026f63d8e94362f51` |
| `a_fa.mdl` | `1f8b1ac2e4ab31e1b2172c7ca208160267cdbf861cd36e544775f391b5b6978d` |
| `c_yinnkeep.mdl` | `0402354c945682c4cda5d91e61c6b34a6cd95a658c68d9a8ead83b52b3c8a679` |
| `a_ba.mdl` | `a38c9f0de00a7e401419d1e668ad1b9d825cfc9635712cdb9ae63e840104ee2b` |

Verification:

- domain and attachment tests: `6/6` passed;
- application service and HTTP schema tests: `53/53` passed;
- row216 host-animation fixture gate: PASS, source matches `50`, target
  matches `20`;
- broad resource-resolution gate: PASS, unchanged `98` edges, `67` resolved,
  `9` unresolved allowed sound/ProgFX edges, and `22` source-only edges;
- backend and frontend production builds: PASS.

Proof handling preserved the one-playback rule. The first and only Web
playback produced all `192` frames but the recorder rejected build identity
because the backend health process and Vite commit identity were not running.
Those frames were retained; the effect was not replayed. After starting both
processes with commit `348e8ff0e27677b7c611c56afa4d706685b393f0`, a no-playback static timeline
capture passed identity, host graph, asset settlement, draw ledger, shader,
single-playback contract and post-roll gates with zero blockers. Its encoded
MP4 is byte-identical to the retained one-playback MP4:

- Web one-playback MP4 SHA-256
  `66dd5c84219ed7a7a0bced78ce20f3b156bfc85a12c2e3fd5e6b77c6d9f27ace`;
- no-playback telemetry MP4: the same SHA-256;
- recovery/equivalence record:
  `row216/aurora-web/aurora-web-row216-one-trigger-host-animation-pause1-20260812-recovery-summary.json`;
- onset-aligned NWN/Web comparison MP4 SHA-256
  `ef7afbc793fb7f97c584770a5e4500f13a8f54cf73f9d415b125ccd9ec341285`;
- comparison contact sheet SHA-256
  `c95f3d486e79b21febf79caa6b4ab3ab4c68608ac5cce08f97bd1739e3535c66`.

The approved NWN MP4 SHA-256
`0b0d5e91d176710c5b38cd9b4c7c2b885c3c08ab3c10142d8242e96495484f67`
was reused without launching NWN or repeating the retail effect.

Current status is
`live-host-runtime-implemented-open-retail-phase-camera-scene-actors`, not
pixel parity. A matched actor/camera proof remains necessary before assigning
the residual screen-space shape difference to particle math.

## Handedness re-audit (2026-08-12)

The post-host-animation Web result can look horizontally reversed at the top
crossing, so the complete signed transform chain was audited again before any
further renderer change. No xoreos source was used and the saved NWN recording
was not replayed.

The active proof chain is:

```text
canonical Aurora-to-Three C: (x,y,z) -> (x,z,y), det(C)=-1
complete proof/Area frame F: (x,y,z) -> (-x,y,z), det(F)=-1
effective map P=F*C:         (x,y,z) -> (-x,z,y), det(P)=+1
```

`P` is a proper rotation, not a reflection. The row216 camera looks toward
positive Three Z, so its world-right vector is negative Three X. Consequently
the negative Three X produced by Aurora `+X` projects to the right side of the
image. At source test point `(0,1.5,1.35)` and the checked-in row216 camera:

| Aurora point | Effective Three point | Projected pixel |
| --- | --- | --- |
| center `(0,1.5,1.35)` | `(0,1.35,1.5)` | `(480.000,204.564)` |
| `+X` `(1,1.5,1.35)` | `(-1,1.35,1.5)` | `(607.813,204.564)` |
| `-X` `(-1,1.5,1.35)` | `(1,1.35,1.5)` | `(352.187,204.564)` |

The animated attachment resolver was also sampled over a complete two-second
`pause1` loop. Source `Impact.x` remains positive (`0.1194450...`) and target
`Impact.x` remains negative (`-0.0560...` to `-0.0587...`); neither crosses or
negates its signed side. Backend composition remains `qParent*qLocal`, matching
the production Three hierarchy. The renderer's reflected-basis orientation
conversion remains `C*R*C^-1`, represented by axis `-C*a` at the same angle;
the complete frame then yields the same effective `P` transform for geometry.

Two regression gates now preserve these facts:

- the row216 proof-frame/camera test asserts `det(P)=+1`, Aurora `+X` on screen
  right and Aurora `-X` on screen left;
- the animated attachment test asserts that a positive 90-degree parent turn
  moves local `+X` to Aurora `+Y` and retains a positive rotation axis.

A fresh no-playback static runtime capture at `t=2 s` also passed build
identity, canonical host graph, asset settlement, draw ledger, particle shader
ledger and proof gate with an empty blocker manifest. Its guard reports one
trigger, no loop and zero overlap; both playback hooks were absent:

- PNG:
  `evidence/vfx-nwn-broad-proof-2026-07-16/row216/aurora-web/preflight/vfx-broad-row216-time-2-handedness-audit-20260812.png`,
  SHA-256 `164ac9b09d562b0454e793b55df74d57fb54df6d6286056822bb4fabf0823a4c`;
- capture record:
  `evidence/vfx-nwn-broad-proof-2026-07-16/row216/aurora-web/preflight/vfx-broad-row216-preflight-handedness-audit-20260812.json`,
  SHA-256 `0bd433112920c7e25e4c2aab8e2d65db77666b71699cac9af738d79d51c3dcc6`.

Decision: do not add another X flip and do not negate animation quaternions.
Either change would introduce a real mirror. The subsequent root-arc lifetime
audit identified the top-order inversion as a shared Type 7 lifecycle defect,
not a matrix reflection.

## Root-arc lifetime correction (2026-08-12)

The dedicated audit
`vfx-type7-root-arc-lifetime-audit-2026-08-12.md` supersedes the earlier
assumption that `qArc * qRoot` remains active throughout playback.
`CAurBehaviorAttach::Control` overwrites the attach-time arc with the live
source-part orientation on the first control tick. Aurora Web now models that
lifetime globally for ProgFX Type 7. The next acceptance step is a fresh static
row216 capture proving the left strand is above the right before recording one
new Web playback.
