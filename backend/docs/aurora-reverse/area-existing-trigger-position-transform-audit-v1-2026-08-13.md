# Existing Area trigger position transform audit v1

Date: 2026-08-13  
Status: verified implementation authority for the bounded persistence slice below  
Scope: change only the origin position of an existing Area trigger while
preserving its local polygon geometry, orientation, every other GIT field, and
the paired GIC entry

## Decision

Aurora Web may materialize an existing `TriggerList` entry position by its
immutable source ordinal. The admitted mutation replaces exactly these three
native GIT float fields:

- `XPosition`;
- `YPosition`;
- `ZPosition`.

The complete `Geometry` list and `XOrientation`, `YOrientation`, and
`ZOrientation` fields remain exact. A scene bearing delta fails closed because
the retained native trigger has a zero orientation vector and no evidence
admits inventing a nonzero yaw representation. An explicit `Bearing` field is
also ambiguous and fails closed. Missing, duplicate, or wrongly typed position
fields fail closed.

This audit does not admit polygon vertex construction/editing, rotation,
trigger identity, localized name, transition/link behavior, trap state,
scripts, variables, comment, or any other property mutation.

## Immutable Aurora evidence

The primary decompilation source is
`C:/Projects/New Folder/export/decompiled_all.c`, SHA-256
`36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572`.

The exact paired-list and trigger-instance lineage is explicit in that source:

- `FUN_0056a38c` at lines 222551-222622 resolves the paired GIT/GIC
  `TriggerList` lanes, constructs each instance with `FUN_006577b8`, invokes
  reader slot `+0x40`, creates GIT and GIC structs with native type ID `1`, and
  invokes writer slot `+0x3c`;
- `FUN_006577b8` at lines 346150-346164 installs vtable `0x00c5c76c`;
- `FUN_00657a88` at lines 346276-346432 reads `XPosition`, `YPosition`,
  `ZPosition`, all three orientation floats, and every `Geometry` entry as
  type-`3` `PointX`/`PointY`/`PointZ` floats. It reads the paired GIC `Comment`
  separately;
- `FUN_00657de0` at lines 346620-346651 writes the same six origin/orientation
  floats and serializes the retained local geometry into type-`3` structs. It
  writes paired `Comment` separately.

A read-only PE inspection independently bound those stripped functions to the
instance vtable. The inspected executable was
`C:/Program Files (x86)/Steam/steamapps/common/Neverwinter Nights/bin/win32/nwtoolset.exe`,
SHA-256
`4c156de898817518e8a97f5d989592894d3c8f48b71d27e2a8b89500cd230f24`,
size `12,201,984` bytes, PE32 image base `0x00400000`. Vtable
`0x00c5c76c` slot `+0x3c` contains writer VA `0x00657de0`, while slot
`+0x40` contains reader VA `0x00657a88`.

No Toolset or NWN process was started. The read-only process check returned
zero `nwtoolset`/`nwmain` processes. The `aurora-toolset-operate` and
`aurora-toolset-prove` offline audit boundaries were applied; the executable,
decompilation, module, and retained proof artifacts were not mutated.

## Native packed record

The read-only packed fixture was
`C:/Users/enonw/Documents/Neverwinter Nights/modules/codex_npc_item_live_20260713.mod`,
SHA-256
`2dc1f12cc27d74853e4697d7c35673fcf6e2db168f2b07b793e394556ba56ec2`.
Its exact `demo.git` SHA-256 is
`a17dda86ad6fb173c54c5857ded055789d3f99773279a41173716f32bf390613`;
its exact `demo.gic` SHA-256 is
`535d1ab4a0c1c22795b867e225437506dd20a905ede1f98e85aa1efcdc61c26d`.

The single native `TriggerList` entry and its paired GIC entry both use struct
type ID `1`. The GIT origin and orientation fields are exactly:

```text
XPosition    = 35.47599411010742 (0x420de76b)
YPosition    = 44.91108703613281 (0x4233a4f4)
ZPosition    = 0                 (0x00000000)
XOrientation = 0                 (0x00000000)
YOrientation = 0                 (0x00000000)
ZOrientation = 0                 (0x00000000)
```

There is no `Bearing` field. `Geometry` contains four type-`3` entries with
exact float32 `PointX`/`PointY`/`PointZ` values. Their local coordinate ranges
are `X=-0.2990303039550781..4.8592987060546875`,
`Y=-4.833713531494141..0.324615478515625`, and
`Z=0.02500000037252903..3.125`. The paired GIC entry contains only an empty
`Comment`.

The independent origin and local polygon records disprove a geometry rewrite
for a pure origin move. The writer must preserve the four geometry structs and
all orientation values while replacing only the three origin floats.

## Retained live placement evidence

The accepted Toolset placement proof is retained under
`backend/docs/aurora-reverse/evidence/polygon-placement-live-standard-2026-07-14/`:

- `README.md`, SHA-256
  `1592a823c1057eac3521e6bf05258f68854f97cda268e982405fe6466e0eaab1`;
- `summary.json`, SHA-256
  `571afe866cabf0789f1ac04e15a466d1f743227097b61410fceec7a6358f81e8`;
- `validator-result.json`, SHA-256
  `53526e1fbf4cf1532a13fc1f5678d251d6a48d244607081852f4ae93d564787d`;
- final `raw.git.summary.json`, SHA-256
  `f27ee9978d54b5486b5cb2bd10042df6c35a1cdf218975fa4ad66034da2a0468`;
- final `objects.csv`, SHA-256
  `0b55ce6aadddc732621af46e61b067ceff5b43aa4ad1bdbc369a5f1863b60869`.

That run drew and saved `New Generic` / `newgeneric`, changed triggers from
zero to one without changing another family in that transaction, and read back
the origin, four finite geometry points, nonzero polygon area, and implicit
closure. It proves native trigger construction and polygon persistence for the
retained fixture. It does not admit construction or vertex editing in the
application update slice.

## Frozen position mapping

For scene tile-space values `(x, y, z)`, write:

```text
XPosition = float32(x * 10)
YPosition = float32(y * 10)
ZPosition = float32(z * 10)
```

This is the inverse of the existing query projection from native Area units to
scene tile space. `Geometry`, all orientation fields, and every other field are
preserved. A retained scene bearing must equal the source bearing projection;
otherwise planning fails with `AREA_UPDATE_OBJECT_MUTATION_INVALID`.

## Preservation and transaction boundary

The writer resolves `kind=trigger` plus immutable source ordinal, rejects
duplicate transforms and transform/deletion collisions, retains list order and
struct type ID, and preserves every non-position GIT field. A transform target
must contain exactly one `Geometry` list with at least three type-`3` entries;
each entry must contain exactly one float `PointX`, `PointY`, and `PointZ`.
GIC remains byte-exact for transform-only publication.

Independent candidate readback verifies the three exact float32 values, the
preserved geometry and orientation payload, nine-family cardinalities, hashes,
and mutation counts. Publication remains in the existing atomic
ARE/GIT/GIC/IFO Area Update transaction.

The complexity budget is one new position-only discriminated-union member, one
dedicated native field profile, and focused planner/writer/compiler/atomic
tests. Polygon editing and rotation are deliberately separate audited slices.
Existing bounded diagnostics retain object kind, immutable ordinal, field,
candidate ordinal, and exact expected/actual value without exposing bytes or
host paths through the API.

## Implementation quality evidence

The focused planner, paired-writer, candidate-compiler, and atomic-publication
suites pass `130/130` tests, and the backend production build passes. The final
focused mutation profile instrumented the planner and paired writer with `910`
mutants and finished at `87.14%`: `793` killed, `89` survived, `28` uncovered,
and zero timeout/error. The planner score is `95.27%`; the paired-writer score
is `85.29%`. The JSON report is
`backend/reports/mutation/area-object-transform.json`, SHA-256
`c5e9e0281b5124b24a3fca5ad3b29a6b400a77d017fc692c7a94bcf415493549`.

Machine classification of the exact trigger slice gives:

- all `14/14` mutants in the trigger planner branch are killed;
- all `15/15` mutants in the trigger float32 mapping branch are killed;
- `75/78` preservation-profile validation mutants are killed. The three
  survivors only remove optional chaining after an exact cardinality check;
  the access target is therefore already present on every path that evaluates
  it, so they are behavior-equivalent for the admitted profile;
- the independent trigger readback block has `23` killed, `9` surviving, and
  `4` uncovered mutants. Its surviving or uncovered mismatch branches are
  defense-in-depth paths that require corrupting the candidate between the
  deterministic writer and immediate parser. They remain visible in the
  report and are not used to claim native completion.

The negative corpus covers missing, duplicate, wrongly typed, non-finite, and
undersized orientation/geometry/point profiles, plus ambiguous `Bearing` and
the exact three-point polygon boundary. No xoreos source or other GPL runtime
implementation was used.

## Exit criteria and remaining proof

Unit, round-trip, determinism, compiler, atomic-publication, persisted-readback,
and regression tests are required. Mutation testing is optional and requires
an explicit user request. Product-level completion still
requires a fresh exact trigger move through Toolset Save/Build/reopen and NWN
for the application-produced candidate. Trigger construction, polygon vertex
editing, rotation, properties, scripts, links, and runtime activation require
separate Aurora-first audits.
