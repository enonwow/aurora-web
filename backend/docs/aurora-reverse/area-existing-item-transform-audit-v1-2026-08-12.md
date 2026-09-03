# Existing Area item transform audit v1

Date: 2026-08-12  
Status: verified implementation authority for the bounded persistence slice below  
Scope: change only the position and yaw of an existing ground item while
preserving every other GIT field and the paired GIC entry

## Decision

Aurora Web may materialize an existing ground-item `List` entry transform by
its immutable source ordinal. The admitted mutation replaces exactly these
five native GIT float fields:

- `XPosition`;
- `YPosition`;
- `ZPosition`;
- `XOrientation`;
- `YOrientation`.

The Area ground-item list label is `List`, not the inventory label `ItemList`.
This audit does not admit inventory/equipment movement, item construction,
identity, stack, cost, plot, identified, stolen, cursed, property-list, comment,
or any other item mutation. Entries with an explicit `Bearing` field, a missing
required field, a duplicate required field, or a required field with a
non-float type fail closed.

## Immutable Aurora evidence

The primary decompilation source is
`C:/Projects/New Folder/export/decompiled_all.c`, SHA-256
`36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572`.

The Area-list and instance lineage is explicit in that source:

- `FUN_00569cd4` at lines 222215-222297 resolves the five-character ground-item
  list label, constructs each item instance with `FUN_0060636c`, and uses GFF
  struct type ID `0`;
- `FUN_0056a958` at lines 222821-222846 emits the retained item collection with
  GFF struct type ID `0` through the instance writer slot;
- `FUN_0060636c` at lines 300609-300635 installs instance vtable
  `0x00c48e5c`;
- `FUN_006077a8` at lines 301397-301597 reads `XPosition`, `YPosition`,
  `ZPosition`, `XOrientation`, and `YOrientation` into the item instance;
- `FUN_00607ccc` at lines 301621-301658 writes the same five fields. Its
  orientation path is structurally identical to the verified creature writer
  `FUN_0053ae80` at lines 197558-197596.

A read-only PE inspection bound the stripped vtable slots to those functions.
The inspected executable was
`C:/Program Files (x86)/Steam/steamapps/common/Neverwinter Nights/bin/win32/nwtoolset.exe`,
SHA-256
`4c156de898817518e8a97f5d989592894d3c8f48b71d27e2a8b89500cd230f24`,
size `12,201,984` bytes, PE32 image base `0x00400000`. Vtable
`0x00c48e5c` slot `+0x3c` contains writer VA `0x00607ccc`, and slot `+0x40`
contains reader VA `0x006077a8`.

No Toolset or NWN process was started for that inspection. The
`aurora-toolset-operate` and `aurora-toolset-prove` offline safety boundaries
were applied; the binary and retained artifacts were read only.

## Native packed record and retained live evidence

The read-only packed fixture was
`C:/Users/enonw/Documents/Neverwinter Nights/modules/codex_npc_item_live_20260713.mod`,
SHA-256
`2dc1f12cc27d74853e4697d7c35673fcf6e2db168f2b07b793e394556ba56ec2`.
Its exact `demo.git` SHA-256 was
`a17dda86ad6fb173c54c5857ded055789d3f99773279a41173716f32bf390613`.
The native root contains the ground-item label `List`; all three entries have
struct type ID `0`, exactly one float field for each admitted label, and no
`Bearing` field. The `nw_cloth022` entry at source ordinal `0` contains:

```text
XPosition    = 53.228458404541016  (0x4254e9f1)
YPosition    = 27.184123992919922  (0x41d97916)
ZPosition    = 0.009999673813581467 (0x3c23d5ac)
XOrientation = 0                   (0x00000000)
YOrientation = 1                   (0x3f800000)
```

The retained structural Toolset placement evidence is under
`backend/docs/aurora-reverse/evidence/item-ground-placement-live-standard-2026-07-14/`:

- `README.md`, SHA-256
  `0de3175d8fbc8707fb7dfbbe83640224c4e4fb6dcefae749623acb5f63c930ad`;
- `summary.json`, SHA-256
  `fec73e5f7ecd510bb6f12185d785df6b25be2b4acb545330a0bb61d0089e262d`;
- after-save `raw.git.summary.json`, SHA-256
  `19ad4f585b0e7141e4234937b531ad649550f369c858fea83201271189209190`;
- after-save `objects.csv`, SHA-256
  `192af73761048d1be5f159e7a9728a954faee963b910ddaa80dbdf357388e18c`;
- `05-object-crop.png`, SHA-256
  `2c2827245e866d50c4f48757ed168e12d34837a8c2483605ddec5dc6548a90b2`.

That evidence proves the isolated native `item` count delta and saved ground
record at `(53.2285, 27.1841, 0.01)` with normalized bearing `270` degrees. Its
overall standard verdict remains `partial` because the historical cleanup
action did not prove that Selection Mode returned to Select Objects. The
structural placement/readback facts remain valid, but this audit does not
promote the historical proof to a fully verified live function packet.

## Frozen transform mapping

For scene tile-space values `(x, y, z, bearing)` where bearing is radians, the
writer stores:

```text
XPosition    = float32(x * 10)
YPosition    = float32(y * 10)
ZPosition    = float32(z * 10)
XOrientation = float32(cos(bearing))
YOrientation = float32(-sin(bearing))
```

This is the inverse of the existing parser mapping
`bearing = atan2(-YOrientation, XOrientation)` followed by degree
normalization, and of the frontend scene mapper's degree-to-radian conversion.
The native `(0, 1)` record therefore round-trips to `270` degrees.

## Preservation and transaction boundary

The writer must resolve the ground item by `kind=item` plus immutable source
ordinal, reject duplicate transforms and transform/deletion collisions, retain
list order and struct type ID, and preserve every non-transform GIT field. GIC
must remain byte-exact for transform-only publication. A combined deletion is
applied against source ordinals before both paired lists are filtered.

Independent candidate readback verifies all five exact float32 fields, the
nine-family cardinalities, hashes, and mutation counts. Publication remains in
the existing atomic ARE/GIT/GIC/IFO Area Update transaction.

## Exit criteria and remaining proof

Unit, round-trip, determinism, compiler, atomic-publication, persisted-readback,
and regression tests are required. Mutation testing is optional and requires
an explicit user request. Product-level completion still
requires a fresh exact item transform through Toolset Save/Build/reopen and NWN
proof for the application-produced candidate. Item construction and inventory
semantics require separate Aurora-first audits.
