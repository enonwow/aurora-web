# Existing Area encounter position transform audit v1

Date: 2026-08-13  
Status: verified implementation authority for the bounded persistence slice below  
Scope: change only the origin position of an existing Area encounter whose
native spawn-point list is empty, while preserving its local polygon geometry,
every other GIT field, and the paired GIC entry

## Decision

Aurora Web may materialize the position of one retained `Encounter List`
entry by immutable source ordinal. The admitted mutation replaces exactly
these native GIT float fields:

- `XPosition`;
- `YPosition`;
- `ZPosition`.

The complete local `Geometry` list remains exact. The target must also contain
exactly one empty `SpawnPointList`. A populated spawn-point list fails closed
because current evidence does not establish whether a Toolset origin move also
rewrites those independently serialized positions. A scene bearing delta and
native `Bearing`, `Facing`, `Orientation`, `XOrientation`, `YOrientation`, or
`ZOrientation` aliases fail closed; the native encounter instance has no
top-level orientation field and no rotation mapping is admitted.

This audit does not admit encounter construction, polygon vertex editing,
rotation, spawn-point editing or movement, identity, creatures, difficulty,
activation, scripts, variables, comment, runtime spawning, or any other
property mutation.

## Immutable Aurora evidence

The primary decompilation source is
`C:/Projects/New Folder/export/decompiled_all.c`, SHA-256
`36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572`.
The exact paired-list and instance lineage is explicit in that source:

- `FUN_00569b30` at lines 222134-222211 resolves both `Encounter List`
  lanes, constructs an instance with `FUN_0055df48`, invokes reader slot
  `+0x40`, creates GIT and GIC structs with native type ID `7`, and invokes
  writer slot `+0x3c`;
- `FUN_0055df48` at lines 215484-215500 installs vtable `0x00c15634`;
- `FUN_0055e1f8` at lines 215585-215786 reads `XPosition`, `YPosition`, and
  `ZPosition`; reads `Geometry` as type-`1` structs with float `X`, `Y`, and
  `Z`; reads `SpawnPointList` positions and `Orientation`; and reads paired
  GIC `Comment` separately;
- `FUN_0055e71c` at lines 215809-215876 writes the same origin triple, emits
  `Geometry` entries with type ID `1`, emits `SpawnPointList` entries with
  type ID `2` and position/orientation fields, and writes paired `Comment`
  separately.

A read-only PE inspection independently bound those functions to the instance
vtable. The executable was
`C:/Program Files (x86)/Steam/steamapps/common/Neverwinter Nights/bin/win32/nwtoolset.exe`,
SHA-256
`4c156de898817518e8a97f5d989592894d3c8f48b71d27e2a8b89500cd230f24`,
size `12,201,984` bytes, PE32 image base `0x00400000`. Vtable
`0x00c15634` is at file offset `0x00814634`; slot `+0x3c` contains writer VA
`0x0055e71c`, while slot `+0x40` contains reader VA `0x0055e1f8`.

No Toolset or NWN process was started. The read-only process check returned
zero `nwtoolset`/`nwmain` processes. The `aurora-toolset-operate` and
`aurora-toolset-prove` offline audit boundaries were applied; the executable,
decompilation, module, and retained proof artifacts were not mutated.

## Native packed record

The read-only packed fixture was
`C:/Users/enonw/Documents/Neverwinter Nights/modules/codex_npc_item_live_20260713.mod`,
size `192,847` bytes, SHA-256
`2dc1f12cc27d74853e4697d7c35673fcf6e2db168f2b07b793e394556ba56ec2`.
Its exact `demo.git` SHA-256 is
`a17dda86ad6fb173c54c5857ded055789d3f99773279a41173716f32bf390613`;
its exact `demo.gic` SHA-256 is
`535d1ab4a0c1c22795b867e225437506dd20a905ede1f98e85aa1efcdc61c26d`.

The single GIT and GIC encounter entries use struct type ID `7`. The GIT
identity is `x2_gnoll001` / `X2_GNOLL001`; the GIC entry has no fields. The
origin is exactly:

```text
XPosition = 22.412015914916992 (0x41b34bcf)
YPosition = 45.1970329284668   (0x4234c9c3)
ZPosition = 0                  (0x00000000)
```

There is no top-level orientation or bearing field. `Geometry` contains four
type-`1` entries with exact float32 `X`/`Y`/`Z` values:

```text
(-0.13086700439453125, -6.151325225830078,  0.0250005591660738)
( 6.059123992919922,   -6.1513214111328125, 0.025000499561429024)
( 6.059125900268555,    0.038669586181640625, 0.025000059977173805)
( 0,                    0,                    0.02500000037252903)
```

`SpawnPointList` exists and is empty. The independent origin, local polygon,
and spawn-point records disprove rewriting polygon vertices for a pure origin
move and require the unsupported populated-spawn profile to stay fail-closed.

## Retained live placement evidence

The accepted Toolset proof is retained under
`backend/docs/aurora-reverse/evidence/polygon-placement-live-standard-2026-07-14/`:

- `README.md`, SHA-256
  `1592a823c1057eac3521e6bf05258f68854f97cda268e982405fe6466e0eaab1`;
- `summary.json`, SHA-256
  `571afe866cabf0789f1ac04e15a466d1f743227097b61410fceec7a6358f81e8`;
- `validator-result.json`, SHA-256
  `53526e1fbf4cf1532a13fc1f5678d251d6a48d244607081852f4ae93d564787d`;
- `01-encounter-action.json`, SHA-256
  `548cff5ec65e86d4d3a55211547e1e79839a36cb3b154501fe0e8143d19019b8`;
- `02-encounter-polygon.png`, SHA-256
  `bc6c52fb22d65d99c69fa08b4d26d9460888c1ffdf0332a65506deb591e784db`;
- `probe-encounter.json`, SHA-256
  `397d168753c454a22940625df629fad2a27cca0683b9464ffc036815326cee2f`;
- after-encounter `raw.git.summary.json`, SHA-256
  `372695ad7bf25d2fa0f6ba38e36399d1456d2cef553527f36770b8b38d8f809c`;
- after-encounter `objects.csv`, SHA-256
  `50a0c6c1c08e18e8ac4f46d1a7b8e5e6f227556034a18805ff9358a57e22284f`.

That single-session run drew and saved `Gnoll Encounter`, changed encounters
from zero to one without changing another family in that transaction, and
read back the origin, four finite geometry points, nonzero polygon area, and
implicit closure. It proves native construction and polygon persistence for
the retained fixture. It does not admit construction or vertex editing in the
application update slice.

## Local corpus boundary check

A read-only scan used the repository ERF index/extractor and raw GFF parser.
It inspected `176` local packed modules and `4,529` GIT resources without an
extraction or parse error. No encounter had a non-empty `SpawnPointList`.
This observation supports the bounded empty-list profile but is not Aurora
runtime authority and does not prove populated spawn-point movement semantics.

## Frozen position mapping

For scene tile-space values `(x, y, z)`, write:

```text
XPosition = float32(x * 10)
YPosition = float32(y * 10)
ZPosition = float32(z * 10)
```

This is the inverse of the existing query projection from native Area units to
scene tile space. `Geometry`, the empty `SpawnPointList`, and every other field
are preserved. A retained scene bearing must equal the source projection;
otherwise planning fails with `AREA_UPDATE_OBJECT_MUTATION_INVALID`.

## Preservation and transaction boundary

The writer resolves `kind=encounter` plus immutable source ordinal, rejects
duplicate transforms and transform/deletion collisions, retains list order and
struct type ID, and preserves every non-position GIT field. A transform target
must contain exactly one `Geometry` list with at least three type-`1` entries;
each entry must contain exactly one finite float `X`, `Y`, and `Z`. It must
contain exactly one empty `SpawnPointList`. GIC remains byte-exact for
transform-only publication.

Independent candidate readback verifies the three exact float32 values,
preserved geometry and empty spawn-point list, nine-family cardinalities,
hashes, and mutation counts. Publication remains in the existing atomic
ARE/GIT/GIC/IFO Area Update transaction.

The complexity budget is one new position-only discriminated-union member, one
dedicated encounter preservation profile, and focused
planner/writer/compiler/atomic tests. Populated spawn points, vertex editing,
and rotation remain separate audited slices. Bounded diagnostics retain object
kind, immutable ordinal, field, candidate ordinal, and expected/actual state
without exposing bytes or host paths through the API.

## Implementation quality evidence

The four focused planner, paired-writer, candidate-compiler, and atomic
publication suites pass `155/155` tests, including the exact three-point
polygon boundary. The backend production build passes.

The focused mutation profile in
`backend/stryker.area-object-transform.config.json` passes its unchanged hard
`80%` break threshold at `87.03%` over `1,010` mutants: `879` killed, `103`
survived, `28` lacked coverage, and none timed out or errored. The planner is
`95.63%` (`175` killed, `8` survived); the paired writer is `85.13%` (`704`
killed, `95` survived, `28` uncovered). The retained JSON report is
`backend/reports/mutation/area-object-transform.json`, SHA-256
`9700a9a1ea0d8fca7e9195b305c55fb5ac0c0617ce362fd5168c9b672010da46`.

All `14/14` exact encounter-planner mutants and all `48/48` mutants in the
current transform-value mapping region are killed. Spawn-list validation kills
`31/32`, and the shared polygon validator kills `56/58`; the three survivors
remove optional chaining only after exact cardinality guards have established
that the selected value exists, so they are behavior-equivalent. Independent
readback defense branches retain visible surviving mutants because the
deterministic writer cannot corrupt its candidate between write and parse;
this does not replace the still-required native candidate proof below.

## Exit criteria and remaining proof

Unit, round-trip, determinism, compiler, atomic-publication,
persisted-readback, and regression tests are required. Mutation testing is
optional and requires an explicit user request. Product-level
completion still requires a fresh exact encounter move through Toolset
Save/Build/reopen and NWN for the application-produced candidate. Encounter
construction, polygon editing, populated spawn points, rotation, properties,
scripts, and runtime spawning require separate Aurora-first audits.
