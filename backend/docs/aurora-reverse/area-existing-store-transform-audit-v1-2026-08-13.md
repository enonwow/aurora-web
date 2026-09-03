# Existing Area store transform audit v1

Date: 2026-08-13  
Status: verified implementation authority for the bounded persistence slice below  
Scope: change only the position and yaw of an existing Area store while
preserving every other GIT field and the paired GIC entry

## Decision

Aurora Web may materialize an existing `StoreList` entry transform by its
immutable source ordinal. The admitted mutation replaces exactly these five
native GIT float fields:

- `XPosition`;
- `YPosition`;
- `ZPosition`;
- `XOrientation`;
- `YOrientation`.

An explicit `Bearing` field is ambiguous and fails closed. Missing, duplicate,
or wrongly typed required fields also fail closed. This audit does not admit
store construction, identity, localized name, pricing, black-market settings,
gold, scripts, buy restrictions, inventory buckets/items, comment, or any
other store property mutation.

## Immutable Aurora evidence

The primary decompilation source is
`C:/Projects/New Folder/export/decompiled_all.c`, SHA-256
`36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572`.

The exact paired-list and store-instance lineage is explicit in that source:

- `FUN_0056a1d4` at lines 222464-222546 resolves the paired GIT/GIC
  `StoreList` lanes, constructs each instance with `FUN_00641498`, invokes
  reader slot `+0x40`, creates GIT and GIC structs with native type ID `11`,
  and invokes writer slot `+0x3c`;
- `FUN_00641498` at lines 333139-333155 installs vtable
  `0x00c561b8`;
- `FUN_0064188c` at lines 333264-333369 reads `XPosition`, `YPosition`,
  `ZPosition`, `XOrientation`, and `YOrientation`. It reads the paired GIC
  `Comment` separately and delegates non-transform store state without
  changing the transform profile;
- `FUN_00641ee0` at lines 333527-333561 writes the same five transform fields,
  writes paired `Comment` separately, and delegates the preserved store
  properties and inventory lists.

A read-only PE inspection independently bound those stripped functions to the
instance vtable. The inspected executable was
`C:/Program Files (x86)/Steam/steamapps/common/Neverwinter Nights/bin/win32/nwtoolset.exe`,
SHA-256
`4c156de898817518e8a97f5d989592894d3c8f48b71d27e2a8b89500cd230f24`,
size `12,201,984` bytes, PE32 image base `0x00400000`. Vtable
`0x00c561b8` slot `+0x3c` contains writer VA `0x00641ee0`, while slot
`+0x40` contains reader VA `0x0064188c`.

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

The single native `StoreList` entry and its paired GIC entry both use struct
type ID `11`. The GIT transform fields are exactly:

```text
XPosition    = 42.91445541381836       (0x422ba867)
YPosition    = 50.39402770996094       (0x4249937c)
ZPosition    = 0.0000004999999987376214 (0x350637bd)
XOrientation = 0                       (0x00000000)
YOrientation = 1                       (0x3f800000)
```

There is no `Bearing` field. The remaining GIT record contains store identity,
name, pricing, scripts, restrictions, and inventory state that this transform
must preserve. The paired GIC entry contains only `Comment`; transform-only
publication must keep its bytes exact.

## Retained live placement evidence

The accepted Toolset placement proof is retained under
`backend/docs/aurora-reverse/evidence/palette-placement-corrected-live-2026-07-14/`:

- `README.md`, SHA-256
  `4a98aac6351f09fa27afff43cba26e6afa9cf0b29eb4c93e21b2b846ed1d5e45`;
- `summary.json`, SHA-256
  `2eb400ab5437e88859c37354046da2a54277757e27e49c9f06e155f1eca02248`;
- `validator-result.json`, SHA-256
  `149aeaea0080a1b352dd166ea92fd8cf1eb2aa59555373f129f0a953ed64d895`;
- after-merchant `raw.git.summary.json`, SHA-256
  `4892fc7a38573ba2979cf27448531b0883feeae859f2d8d3be04e815f9295049`;
- after-merchant `objects.csv`, SHA-256
  `6a03dc14c6c258c3bff5e3b1e2a075189a255e16dc80542247842410c1faf694`.

That run placed and saved `Dye Store` / `x2_merc_dye`, changed stores from
zero to one without changing another family in that transaction, and read
back native position `(42.9145, 50.394, 0)` plus normalized bearing `270`
degrees. The native vector `(0, 1)` independently maps to the same bearing
through the existing parser contract.

The live artifact proves native construction and persistence for the retained
fixture. It does not promote store construction into the application update
slice and does not prove store inventory or commerce behavior.

## Frozen transform mapping

For scene tile-space values `(x, y, z, bearing)`, where bearing is radians,
write:

```text
XPosition    = float32(x * 10)
YPosition    = float32(y * 10)
ZPosition    = float32(z * 10)
XOrientation = float32(cos(bearing))
YOrientation = float32(-sin(bearing))
```

This is the inverse of the retained parser mapping
`bearing = atan2(-YOrientation, XOrientation)` followed by normalized
degree-to-radian scene projection. The writer must not invent a `Bearing`
field or rewrite any store property while applying this mapping.

## Preservation and transaction boundary

The writer resolves `kind=store` plus immutable source ordinal, rejects
duplicate transforms and transform/deletion collisions, retains list order and
struct type ID, and preserves every non-transform GIT field. GIC remains
byte-exact for transform-only publication. Combined deletion and transform
commands are resolved against immutable source ordinals before both paired
lists are filtered.

Independent candidate readback verifies all five exact float32 values, the
nine-family cardinalities, hashes, and mutation counts. Publication remains in
the existing atomic ARE/GIT/GIC/IFO Area Update transaction.

## Exit criteria and remaining proof

Unit, round-trip, determinism, compiler, atomic-publication, persisted-readback,
and regression tests are required. Mutation testing is optional and requires
an explicit user request. Product-level completion still
requires a fresh exact store move through Toolset Save/Build/reopen and NWN for
the application-produced candidate. Store construction, properties, inventory,
scripts, and runtime commerce behavior require separate Aurora-first audits.

## Implementation quality evidence - 2026-08-13

The four focused planner, paired-writer, compiler, and atomic-publication
suites pass `110/110` tests. The backend production build also passes. The
writer regression preserves concrete commerce state (`MarkUp`,
`OnOpenStore`, and a nested inventory bucket) in addition to the exact GIC
bytes and all transform fields.

The focused Stryker profile instrumented `730` mutants and passed its hard
`80%` threshold at `86.30%`: `630` killed, `76` survived, `24` uncovered, and
zero timeout/error. The planner score is `94.84%`; the paired-writer score is
`84.00%`. The cumulative JSON report is
`backend/reports/mutation/area-object-transform.json`, SHA-256
`f1bdf98556f31c28f4ade87a68dea7cef02f2023ed59bffcc707bb5be50a5e75`.

Machine classification confirms all `32/32` mutants whose report payload
contains the explicit `store` contract are killed. This includes all three
planner admission mutants, all writer family-admission mutants, all five
`Store` display-name mutants, and the store-specific ambiguous-`Bearing`
path. The shared position/orientation arithmetic mutants remain killed by the
existing exact float32 regressions. No newly introduced store mutant survived
or lacked coverage.

This closes the offline implementation-quality gate for the bounded existing
store transform. Native application-candidate Toolset and NWN proof and every
excluded store construction/property/runtime capability remain `missing`.
