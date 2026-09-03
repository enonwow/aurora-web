# Existing Area creature transform audit v1

Date: 2026-08-12  
Status: verified implementation authority for the bounded persistence slice below  
Scope: change only the position and yaw of one or more existing creature
instances while preserving every other GIT field and the paired GIC entries

## Decision

Aurora Web may materialize an existing `Creature List` entry transform by its
immutable source ordinal. The admitted mutation replaces exactly these five
native GIT float fields:

- `XPosition`;
- `YPosition`;
- `ZPosition`;
- `XOrientation`;
- `YOrientation`.

No other existing-object transform or property mutation is admitted by this
audit. Door, encounter, item, placeable, sound, store, trigger, and waypoint
transforms remain fail-closed. Creature entries containing an ambiguous
explicit `Bearing` field, a missing field, a duplicate field, or a non-float
field are rejected rather than normalized.

## Immutable evidence

The primary decompilation source is
`C:/Projects/New Folder/export/decompiled_all.c`, SHA-256
`36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572`.

Relevant Aurora functions and line anchors in that source are:

- `FUN_00567dcc` at line 221302 opens `Creature List`, obtains its length, and
  invokes the configured creature-list callback;
- `FUN_0056ace0` at line 223049 assigns the case-2 creature read/write callback
  slots;
- `FUN_0056729c` at line 220688 iterates the creature list with native struct
  type ID `4` and invokes each instance reader;
- `FUN_0056a7d8` at line 222734 iterates the stored creature instances, creates
  native struct type ID `4`, and invokes each instance writer;
- `FUN_0053ab24` at lines 197397-197534 reads `XPosition`, `YPosition`,
  `ZPosition`, `XOrientation`, and `YOrientation` into the instance transform;
- `FUN_0053ae80` at lines 197558-197596 writes those same five fields and
  derives the two orientation components from the instance rotation.

The independent live Toolset proof is retained under
`backend/docs/aurora-reverse/evidence/object-selection-adjust-location-live-standard-2026-07-14/`:

- `README.md`, SHA-256
  `b89afeb1629d5ebd22367feffe6f740c98dbdf32a5f58a964e8dc3dcf3c550c8`;
- `summary.json`, SHA-256
  `c4deca52b259d8d78f42165b648f93eea7ca289bc139fa5b8276723b155ae3f7`;
- baseline `objects.csv`, SHA-256
  `192af73761048d1be5f159e7a9728a954faee963b910ddaa80dbdf357388e18c`;
- mutated `objects.csv`, SHA-256
  `acd7f188b98b386eb86f11447127fe9ee48160aab39bed546adf04965097b64c`;
- baseline raw GIT summary, SHA-256
  `585ae5ff15a5703a1726ea1a23d7df872c9e3e94ebdb73e5f4cbac03bfc33104`;
- mutated raw GIT summary, SHA-256
  `a55c235180e144db16d29c0ba9036712a16800f9db93b4b2540ac93aaa45b48e`.

That run selected the native creature `Dwarf Mercenary`, used the Toolset
`Adjust Location` command, and proved the persisted GIT change from
`(60.9686, 27.1816, 0)` to `(61.47, 27.18, 0.25)`. The exact GIT SHA-256
changed from
`5bd618c11b06437754f2edd3bdef8096015594604e9bf9e9531800661a79a40d`
to
`375be6db1f7a08a559978e3aa6ad38a1334dc575e626859861b49a5d88c1db2a`.
Native Undo restored the baseline object rows and exact GIT payload hash.

## Frozen transform mapping

The retained frontend/backend scene contract uses tile-space coordinates and
radians. Native GIT positions use metres where one scene tile-space unit is
ten native units. For scene values `(x, y, z, bearing)` the writer stores:

```text
XPosition    = float32(x * 10)
YPosition    = float32(y * 10)
ZPosition    = float32(z * 10)
XOrientation = float32(cos(bearing))
YOrientation = float32(-sin(bearing))
```

This is the inverse of the existing independently tested parser mapping
`bearing = atan2(-YOrientation, XOrientation)`. Candidate verification compares
the exact decoded float32 field values produced by this mapping. It does not
compare decimal UI text and does not invent a higher-precision representation.

## Preservation and transaction boundary

The writer must:

1. resolve each transform by `kind=creature` plus the immutable source ordinal;
2. reject duplicate transforms and a transform/deletion collision;
3. preserve creature list order, struct type ID, and every non-transform GIT
   field exactly at the parsed-value level;
4. preserve all GIC bytes exactly when there is no deletion;
5. when deletion and transform are combined, apply the transform to the source
   ordinal before filtering matching GIT/GIC ordinals;
6. independently parse the candidate and verify all five exact float32 values,
   nine-family cardinality, and the admitted mutation counts;
7. stage GIT and GIC with ARE and unchanged IFO in the existing atomic Area
   Update transaction.

The bounded receipt exposes only hashes and per-family deletion/transformation
counts. It does not expose tags, scripts, raw fields, object bytes, or host
paths.

## Exit criteria

This slice is implemented only when unit, round-trip, determinism, compiler,
atomic publication, persisted readback, mutation, and regression tests pass.
Product-level completion still requires a fresh Toolset Save/Build/reopen and
NWN runtime proof for the exact committed candidate; the retained 2026-07-14
proof is implementation authority, not final release certification.
