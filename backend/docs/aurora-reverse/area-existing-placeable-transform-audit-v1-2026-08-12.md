# Existing Area placeable transform audit v1

Date: 2026-08-12  
Status: verified implementation authority for the bounded persistence slice below  
Scope: change only native position and placement bearing for an existing
placeable; do not create or alter the separate `VisualTransform` payload

## Decision

Aurora Web may materialize an existing `Placeable List` entry transform by its
immutable source ordinal. The admitted mutation replaces exactly four native
GIT float fields: `X`, `Y`, `Z`, and `Bearing`.

This audit does not admit placeable construction, scale, visual rotation,
visual translation, properties, scripts, inventory, or any other object-family
transform. A target with missing, duplicate, wrong-type, or ambiguous
`XPosition/YPosition/ZPosition/XOrientation/YOrientation` aliases is rejected.

## Immutable evidence

The primary decompilation source is
`C:/Projects/New Folder/export/decompiled_all.c`, SHA-256
`36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572`.

The placeable instance lineage is explicit in the source:

- the native error string `TNWPlaceableInstance::CreateModel` occurs directly
  before the placeable instance reader;
- `FUN_0063d0d8` at lines 330504-330601 reads native `X`, `Y`, `Z`, and
  `Bearing`; it converts bearing radians to the internal degree transform;
- `FUN_0063d3d8` at lines 330630-330658 writes `X`, `Y`, `Z`, and converts the
  internal rotation back to a native radian `Bearing` float.

The retained Toolset proof is
`backend/docs/aurora-reverse/evidence/stage2-completion-live-2026-07-14/`:

- `README.md`, SHA-256
  `3279ba10d0a67d2d8491f16c2d03a7cd8df8da3710d1e3277c9e705b6ca55d09`;
- `s02-05-transform-summary.json`, SHA-256
  `24e19d3a1135c774cf37ec0d26707e1ad00681417f393394f2441b5c60a0a81a`;
- `s02-05-transform-validator.json`, SHA-256
  `3b245c2119366a6233e62d40dc70565b51aaf1376e455164ad7d0757d15b191b`;
- the retained parser baseline `objects.csv`, SHA-256
  `bd25047fce90665658d40a17db6f74bfe80bb8c964b67dcfb0e0b0058ca7c491`.

That accepted run targeted `FloorLever1` / `plc_flrlever1`, changed position,
bearing, scale, visual rotation, and visual translation through native
`Adjust Location`, saved, independently read the persisted result, and restored
the exact baseline object rows. The broader proof establishes native placement
mutation; this implementation intentionally selects only the independently
decompiled four-field placement subset.

A read-only extraction on 2026-08-12 additionally inspected packed module
`codex_npc_item_live_20260713.mod`, SHA-256
`2dc1f12cc27d74853e4697d7c35673fcf6e2db168f2b07b793e394556ba56ec2`.
Its exact `demo.git` SHA-256 was
`a17dda86ad6fb173c54c5857ded055789d3f99773279a41173716f32bf390613`.
The first native `Placeable List` struct had type ID `9` and exact float labels
`X`, `Y`, `Z`, and `Bearing`, independently confirming the field profile used
by this writer.

## Frozen mapping

For scene tile-space position and radian bearing `(x, y, z, bearing)`, write:

```text
X       = float32(x * 10)
Y       = float32(y * 10)
Z       = float32(z * 10)
Bearing = float32(bearing)
```

The existing parser interprets native `Bearing` as radians, normalizes it to
degrees in the backend placement DTO, and the frontend scene mapper converts it
back to radians. Therefore this mapping is the exact inverse of the retained
scene contract. Toolset UI bearing is a different representation and is not
written directly.

## Preservation and exit gates

The ordinal, list order, struct type ID, every non-transform GIT field, and all
GIC bytes must remain exact for a transform-only publication. A combined
deletion applies the transform to the immutable source ordinal before paired
GIT/GIC filtering. Independent readback verifies the four float32 values,
family cardinality, hashes, and mutation counts.

Unit, round-trip, determinism, compiler, atomic publication, persisted
readback, and regression tests are required. Mutation testing is optional and
requires an explicit user request. Final product
certification still requires a fresh Toolset Save/Build/reopen and NWN proof of
the exact committed candidate.
