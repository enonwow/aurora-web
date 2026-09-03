# VFX row216 ordered-HAK host resource precedence audit (2026-08-13)

## Scope and source policy

- Purpose: identify the source and target host-model lineage used by the saved
  NWN row216 proof before changing Aurora Web rendering.
- Primary evidence: the exact capture BIC, the module ordered HAK resources,
  `nwn_base.key`, and Aurora MDL inspection through project-owned parsers.
- Saved NWN proof was not replayed. No xoreos source was consulted.
- This audit covers host resource precedence and animation attachment inputs. It
  does not establish exact camera, room, lighting, or PLT shader parity.

## Immutable capture identity

- BIC: `C:\Users\enonw\Documents\Neverwinter Nights\localvault\avriemail461.bic`
- BIC SHA-256: `5edc2ce0232dad09db9649401db55ccb9956ecfe98ff172e152a11ac5c1d7cc0`
- Source actor: female, appearance `6`, phenotype `0`, model `pfh0`.
- Target actor: appearance model `c_yinnkeep`.
- Runtime animation sampled for both hosts: `pause1`, two-second loop.

## Ordered-resource result

| Role | Resource | Winning source | SHA-256 | Supermodel source |
| --- | --- | --- | --- | --- |
| Source PC | `pfh0.mdl` | `cep3_armor.hak` | `4ca6e5662fc6296f7240ec2457262f3c460680ba74f9947478dec413c523cfab` | `lc_addanimations.hak/a_fa.mdl` |
| Target | `c_yinnkeep.mdl` | `cep3_core0.hak` | `de10fa9c782f6203038a5a79c6f23a14e95141205ef4862224fef3ff2810f878` | `nwn_base.key/a_ba.mdl` |

The source supermodel `a_fa.mdl` SHA-256 is
`9c32a90423ab369b36195191589cfb96bd3cbb01fbaa8bcead9c3d210d003107`.
The target supermodel `a_ba.mdl` SHA-256 is
`a38c9f0de00a7e401419d1e668ad1b9d825cfc9635712cdb9ae63e840104ee2b`.

## Aurora-first finding

The previous fixture resolved host attachment transforms from base-game
versions of `pfh0.mdl`, `a_fa.mdl`, and `c_yinnkeep.mdl`. That lineage did not
match the ordered HAK set used by the captured module. Because effect beam
endpoints inherit the host `Impact` transform, the mismatch could change the
beam direction and the relative height of its strands. Visual tuning against
that fixture would therefore have encoded a false correction.

The winning source `pfh0.mdl` exposes `Impact` under `torso_g` at
`[0.0009432070, 0.0870238990, 0.1077879965]`. The winning target
`c_yinnkeep.mdl` exposes `Impact` under `torso_g` at
`[-0.0125054, 0.0184151, 0.25276]`. Their inherited `pause1` tracks are now
composed from the winning supermodels.

## Implementation contract

- The row216 fixture generator reads the source and target MDL files from the
  winning HAKs and pins all four model/supermodel hashes.
- The exact BIC-derived modular PC and target are separate source-backed actor
  runtimes.
- Object-attached VFX resolves only the actor marked `target_creature`; the
  source actor is never counted as a second attachment target.
- The fixture regression fails on a source path, hash, animation, or required
  `Impact` node mismatch.

## Proof status

Implementation evidence is source-backed. The fresh static preflight passed
runtime identity, host graph, asset settlement, draw, shader, playback, and
proof gates with an empty blocker manifest. One deterministic Web playback was
then recorded at 8 fps with a two-second pre-roll, 20-second effect, and
two-second post-roll. Its guard reports one trigger, no loop, no overlap, and a
hidden post-duration state.

The saved NWN MP4 was reused without replay. The onset-aligned comparison is
indexed by
`row216/comparison/nwn-vs-aurora-web-row216-exact-hak-two-actor-onset-aligned-20260813.json`.
The Web MP4 SHA-256 is
`9695caacfa2f1c67d02f5bb6c3c9c29247f88060c9322874514df9f80bcaef05`;
the reused NWN MP4 SHA-256 remains
`0b0d5e91d176710c5b38cd9b4c7c2b885c3c08ab3c10142d8242e96495484f67`.

The comparison closes ordered-resource lineage and two-actor proof-scene
coverage. It also shows that Web camera projection and source-target screen
scale remain visibly different. Status is therefore
`diagnostic-only-single-playback-open-camera-scene-owner-target`, not visual
parity, and this result does not authorize particle tuning against the
unmatched frame.
