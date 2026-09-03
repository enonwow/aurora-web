# Existing Area sound transform audit v1

Date: 2026-08-12  
Status: verified implementation authority for the bounded persistence slice below  
Scope: change only the world position of an existing Area sound while
preserving every other GIT field and the paired GIC entry

## Decision

Aurora Web may materialize the position of one existing `SoundList` entry by
its immutable source ordinal. The admitted mutation replaces exactly these
three native GIT float fields:

- `XPosition`;
- `YPosition`;
- `ZPosition`.

The native sound instance profile has no persisted bearing or orientation
vector. A scene bearing change is therefore rejected rather than silently
dropped. A target with a `Bearing`, `XOrientation`, or `YOrientation` field is
ambiguous and fails closed. Missing, duplicate, or wrongly typed position
fields also fail closed.

This audit does not admit sound construction, identity, `Elevation`, distance
or random-position ranges, volume, pitch, priority, schedule, playback flags,
sound resource lists, comment, `PlayInToolset`, or runtime audibility changes.

## Immutable Aurora evidence

The primary decompilation source is
`C:/Projects/New Folder/export/decompiled_all.c`, SHA-256
`36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572`.

The exact Area-list and sound-instance lineage is explicit in that source:

- `FUN_00567dcc` at lines 221302-221490 resolves the GIT and GIC
  `SoundList` lanes and dispatches their registered loader at lines
  221430-221438;
- `FUN_005685fc` at lines 221499 onward creates the output `SoundList` lanes
  and dispatches the registered sound emitter at lines 221788-221795;
- `FUN_0056a030` at lines 222383-222459 resolves `SoundList`, constructs a
  sound with `FUN_0063e77c`, invokes reader slot `+0x40`, creates GIT and GIC
  structures with native type ID `6`, and invokes writer slot `+0x3c`;
- `FUN_0063e77c` at lines 331383-331405 installs vtable `0x00c557b0`;
- `FUN_0063f24c` at lines 331818-331894 reads `XPosition`, `YPosition`, and
  `ZPosition`. It also reads preserved `GeneratedType`, `PlayInToolset`, and
  `Comment`, but reads no bearing or orientation field;
- `FUN_0063f57c` at lines 331948-331962 writes the same three position fields
  plus the preserved non-transform fields. It writes no bearing or
  orientation field.

A read-only PE inspection bound the stripped vtable slots to those functions.
The inspected executable was
`C:/Program Files (x86)/Steam/steamapps/common/Neverwinter Nights/bin/win32/nwtoolset.exe`,
SHA-256
`4c156de898817518e8a97f5d989592894d3c8f48b71d27e2a8b89500cd230f24`,
size `12,201,984` bytes, PE32 image base `0x00400000`. Vtable
`0x00c557b0` slot `+0x3c` contains writer VA `0x0063f57c`, and slot `+0x40`
contains reader VA `0x0063f24c`.

No Toolset or NWN process was started. The `aurora-toolset-operate` and
`aurora-toolset-prove` offline audit boundaries were applied; the executable,
decompilation, module, and evidence artifacts were read only.

## Native packed record

The read-only packed fixture was
`C:/Users/enonw/Documents/Neverwinter Nights/modules/codex_npc_item_live_20260713.mod`,
SHA-256
`2dc1f12cc27d74853e4697d7c35673fcf6e2db168f2b07b793e394556ba56ec2`.
Its exact `demo.git` SHA-256 is
`a17dda86ad6fb173c54c5857ded055789d3f99773279a41173716f32bf390613`.
Its exact `demo.gic` SHA-256 is
`535d1ab4a0c1c22795b867e225437506dd20a905ede1f98e85aa1efcdc61c26d`.

The single native `SoundList` GIT entry and its paired GIC entry both use
struct type ID `6`. The GIT entry has exactly one float field for each admitted
position label and has no `Bearing`, `XOrientation`, or `YOrientation`:

```text
XPosition = 37.75657653808594   (0x421706bc)
YPosition = 49.36048889160156   (0x42457124)
ZPosition = 1.5100003480911255  (0x3fc147b1)
```

The paired GIC entry contains only `PlayInToolset=1` and an empty `Comment`.
Those fields are not transform state and must remain byte-exact.

## Retained live placement evidence

The accepted Toolset placement proof is retained under
`backend/docs/aurora-reverse/evidence/palette-placement-corrected-live-2026-07-14/`:

- `README.md`, SHA-256
  `4a98aac6351f09fa27afff43cba26e6afa9cf0b29eb4c93e21b2b846ed1d5e45`;
- `summary.json`, SHA-256
  `2eb400ab5437e88859c37354046da2a54277757e27e49c9f06e155f1eca02248`;
- `validator-result.json`, SHA-256
  `149aeaea0080a1b352dd166ea92fd8cf1eb2aa59555373f129f0a953ed64d895`;
- after-sound `raw.git.summary.json`, SHA-256
  `39a817844228be878553477e6dc264ee85bd0e367190bfb4aa4029eee6d4c846`;
- after-sound `objects.csv`, SHA-256
  `4134422b3fa07f129a33b36404d35dba820dfa0c5711c52ef5a613a6b2c84007`.

That run placed and saved `animalcriesday` / `AnimalCriesDay`, changed the sound
count from zero to one without changing another family in that transaction,
and independently read back native position `(37.7566, 49.3605, 1.51)`. It
proves structural native creation and persistence, not audibility or an
application-produced existing-sound transform.

## Frozen transform mapping

For scene tile-space position `(x, y, z)`, write:

```text
XPosition = float32(x * 10)
YPosition = float32(y * 10)
ZPosition = float32(z * 10)
```

The position mapping is the inverse of the retained parser/projector scene
contract. `Elevation` remains unchanged; direct GFF materialization replaces
the persisted world `ZPosition`, not the sound template elevation property.

The planner must verify that scene bearing still equals the source sound's
non-oriented projection. A bearing delta is an unsupported mutation and must
not be converted into a position command. The writer command deliberately has
no bearing member.

## Preservation and transaction boundary

The writer resolves `kind=sound` plus immutable source ordinal, rejects
duplicate transforms and transform/deletion collisions, retains list order and
struct type ID, and preserves every non-position GIT field. GIC remains
byte-exact for transform-only publication. A combined deletion uses immutable
source ordinals before both paired lists are filtered.

Independent candidate readback verifies the three exact float32 values, the
nine-family cardinalities, hashes, and mutation counts. Publication remains in
the existing atomic ARE/GIT/GIC/IFO Area Update transaction.

## Exit criteria and remaining proof

Unit, round-trip, determinism, compiler, atomic-publication, persisted-readback,
and regression tests are required. Mutation testing is optional and requires
an explicit user request. Product-level completion still
requires a fresh exact sound move through Toolset Save/Build/reopen and NWN for
the application-produced candidate. Sound properties, construction, and audio
behavior require separate Aurora-first audits and appropriate audio/runtime
proof.

## Implementation quality evidence - 2026-08-13

The retained implementation passes the four focused planner, paired-writer,
compiler, and atomic-publication suites at `105/105` tests. The backend
production build also passes.

The focused Stryker profile instrumented `715` mutants and passed its hard
`80%` threshold at `86.01%`: `615` killed, `76` survived, `24` uncovered, and
zero timeout/error. The planner score is `94.67%`; the paired-writer score is
`83.72%`. The exact JSON report is
`backend/reports/mutation/area-object-transform.json`, SHA-256
`9ed84f6bb2a72875842f3cc9cce855482d0d979f9033a35caa4db0c269ac0ae8`.

Machine classification confirms:

- all `14/14` mutants in the planner's bounded sound branch are killed;
- all `58/58` report mutants whose payload contains the explicit `sound`
  contract are killed;
- the previously surviving sound scene-value object mutant `413`, which could
  suppress `x/y/z` finite/range validation, is killed by the added exact
  component regressions;
- the three survivors at the sound float-map branch (`563`, `565`, `566`) are
  behavior-equivalent for an admitted `SoundList`: falling through produces
  the same three position values, while the additional orientation-map keys
  cannot match any field because native orientation fields are rejected before
  mapping;
- the other survivors adjacent to the classified range affect non-sound
  bearing validation, the placeable ambiguity array, or orientation-vector
  family verification. They do not weaken this bounded sound contract and
  remain visible work for their owning family/general hardening slices.

This closes the offline implementation-quality gate for the bounded existing
sound position transform. Native application-candidate Toolset and NWN proof,
sound construction, properties, and audibility remain explicitly missing.
