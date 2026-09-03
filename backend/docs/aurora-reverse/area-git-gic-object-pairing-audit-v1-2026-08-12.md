# Area GIT/GIC object pairing audit v1

Date: 2026-08-12  
Status: source-backed for paired list traversal; native-fixture-backed for list
labels, cardinality, object struct types, and observed GIC entry fields  
Scope: existing Area object deletion and preserve-first mutation prerequisites

## Decision

Aurora Web must treat an Area's GIT and GIC as one paired object resource.
Changing the membership or order of a top-level GIT object list without making
the identical membership/order change in the corresponding GIC list is not an
admitted write. Generated GIT and GIC files must contain all nine canonical
root list fields, their per-family cardinalities must match, and every retained
entry must keep its original relative order and GFF struct type.

This audit supersedes the GIT-loader address gap recorded in
`reverse-findings-area-object-contracts-r78.md` for the paired top-level list
traversal. It does not close construction semantics for a new instance of every
object family.

## Evidence identities

### Decompiled Aurora Toolset source

- source: `C:/Projects/New Folder/export/decompiled_all.c`
- SHA-256:
  `36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572`
- `FUN_00567dcc` at source line 221307 opens two GFF resources, obtains the
  top-level structs, and resolves the same nine list labels from both resource
  handles before dispatching family-specific callbacks;
- the paired labels are `Creature List`, `Door List`, `Encounter List`,
  `List`, `Placeable List`, `SoundList`, `StoreList`, `TriggerList`, and
  `WaypointList`;
- `FUN_005685fc` at source line 221499 performs the corresponding paired writer
  traversal: every family is emitted once against the first GFF handle and
  once against the second GFF handle before its family callback is invoked;
- the item lane is the five-character label stored in `DAT_00c16e7c` /
  `DAT_00c16e81`; the native fixture below identifies that label as `List`;
- `FUN_00524ff4` at source line 184476 independently enumerates the same nine
  family labels in Toolset processing order.

The decompilation proves that Toolset object processing is paired at the list
boundary. It does not, by itself, prove every field default used when a new
object is placed from a palette template.

### Native packed module fixture

- source:
  `C:/Users/enonw/Documents/Neverwinter Nights/modules/codex_npc_item_live_20260713.mod`
- SHA-256:
  `2dc1f12cc27d74853e4697d7c35673fcf6e2db168f2b07b793e394556ba56ec2`
- inspected resource pair: `demo.git` / `demo.gic` from the packed MOD archive;
- the pair contains at least one instance of every object family;
- inspection was read-only and used the repository's strict ERF/GFF parser in
  `backend/scripts/lib/aurora-model-proof-120s-erf-gff-readback.mjs`.

Observed native profile:

| Family | Canonical list label | GIT/GIC struct type | Observed GIC fields |
| --- | --- | ---: | --- |
| creature | `Creature List` | 4 | `Comment` (`CExoString`) |
| door | `Door List` | 8 | `Comment` (`CExoString`) |
| encounter | `Encounter List` | 7 | no fields in the observed entry |
| item | `List` | 0 | `Comment` (`CExoString`) |
| placeable | `Placeable List` | 9 | `Comment` (`CExoString`) |
| sound | `SoundList` | 6 | `PlayInToolset` (`Byte`), `Comment` (`CExoString`) |
| store | `StoreList` | 11 | `Comment` (`CExoString`) |
| trigger | `TriggerList` | 1 | `Comment` (`CExoString`) |
| waypoint | `WaypointList` | 5 | `Comment` (`CExoString`) |

For `demo`, the GIT/GIC counts were respectively and identically
`6/1/1/3/3/1/1/1/1` in the table order above. Separate `area` and `area001`
resource pairs confirmed the same struct types for door, waypoint, and
placeable entries.

## Implementation contract derived from the evidence

1. Parse both complete files before admitting a mutation. Malformed, missing,
   duplicate, wrongly typed, or count-mismatched family lists fail closed.
2. Resolve mutations against the immutable source ordinal inside one family;
   never identify an instance by tag alone.
3. Deleting an existing object removes the same ordinal from both paired
   lists. Surviving entries retain their relative order.
4. Rebuild from root-reachable structs only. Unknown root fields, unknown
   fields in surviving structs, localized strings, nested lists, field types,
   and struct type IDs remain preserved.
5. Independently parse the candidates and require all nine list labels,
   matching GIT/GIC counts, expected family struct types, and the exact intended
   count delta before publication.
6. Publication remains inside the existing Area Update journal, fencing lease,
   immutable successor snapshot, compare-and-set, readback, compensation, and
   quarantine boundary.

## Explicitly unresolved semantics

The following are not inferred by this audit and remain fail-closed until a
family-specific construction/property contract is verified:

- constructing a new GIT instance from UTC/UTD/UTE/UTI/UTM/UTP/UTS/UTT/UTW;
- choosing a new GIC `Comment` value from a blueprint versus an editor value;
- the new-sound default for `PlayInToolset` outside an exact admitted profile;
- trigger and encounter polygon construction or movement;
- door hook placement and generic door movement;
- family-specific property and script field promotion.

Existing-entry deletion does not require inventing any of those values because
both original structs are removed as a pair and all survivors are preserved.
No xoreos source or other GPL implementation was used for this decision.
