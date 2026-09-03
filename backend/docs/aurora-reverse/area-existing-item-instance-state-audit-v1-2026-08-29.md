# Existing Area ground-item instance-state audit v1

Date: 2026-08-29  
Status: Aurora source closed; offline implementation verified; live certification pending  
Scope: exact retained ground-item `Charges`, `Cost`, `Stolen`, `StackSize`,
`Plot`, `AddCost`, `Identified`, and `Cursed` readback and compare-and-swap
mutation in the GIT `List`

## Decision

Aurora Web may expose this eight-member Item instance state as editable only
for one exact type-`0` ground-item struct in the GIT root `List`. The admitted
native members, physical types, read defaults, and target ranges are:

| Contract key | Native label | GFF type | Aurora read default | Admitted target |
| --- | --- | --- | ---: | --- |
| `charges` | `Charges` | Byte | 50 | integer `0..255` |
| `cost` | `Cost` | DWord | 0 | integer `0..4294967295` |
| `stolen` | `Stolen` | Byte | 0 | boolean / exact Byte `0` or `1` |
| `stackSize` | `StackSize` | Word | 1 | integer `0..65535` |
| `plot` | `Plot` | Byte | 0 | boolean / exact Byte `0` or `1` |
| `addCost` | `AddCost` | DWord | 0 | integer `0..4294967295` |
| `identified` | `Identified` | Byte | 0 | boolean / exact Byte `0` or `1` |
| `cursed` | `Cursed` | Byte | 0 | boolean / exact Byte `0` or `1` |

Exact provenance is one immutable object containing the complete resolved
value vector and the canonical ordered set of fields physically present in the
source. A missing canonical member contributes its Aurora read default but is
not confused with a physically present member containing that value. A
duplicate, wrong-case, aliased, wrongly typed, non-integral, out-of-range, or
non-boolean Byte member invalidates the complete typed state and leaves all
eight controls `PRESERVE_ONLY`.

The physical Word range is the only proven `StackSize` storage constraint.
This audit does not infer an additional gameplay minimum. Likewise it does not
activate the adjacent `CostTable`, `CostValue`, `Dropable`, item-property list,
model-part, armor-part, color, script, description, identity, or inventory
controls.

## Primary Aurora authority

The primary source is the frozen Aurora Toolset decompilation
`C:/Projects/New Folder/export/decompiled_all.c`, SHA-256
`36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572`.

The common Item reader `FUN_00604db8` reads:

- `Charges` through the Byte reader with default `0x32` at lines 300094-300095;
- `Cost` through the DWord reader with default `0` at lines 300096-300097;
- `AddCost` through the DWord reader with default `0` at lines 300098-300099;
- `Stolen` through the Byte reader with default `0` at lines 300100-300101;
- `StackSize` through the Word reader with default `1` at lines 300102-300103;
- `Plot` through the Byte reader with default `0` at lines 300104-300105;
- `Identified` through the Byte reader with default `0` at lines 300106-300107;
- `Cursed` through the Byte reader with default `0` at lines 300108-300109.

The symmetric common Item writer `FUN_00605b0c` writes canonical members in
this order:

1. `Charges : Byte` at line 300316;
2. `Cost : DWord` at line 300317;
3. `Stolen : Byte` at line 300318;
4. `StackSize : Word` at line 300319;
5. `Plot : Byte` at line 300320;
6. `AddCost : DWord` at line 300321;
7. `Identified : Byte` at line 300322;
8. `Cursed : Byte` at line 300323.

The retained ground-item writer `FUN_00607ccc` writes placement coordinates at
lines 301632-301649, the paired GIC editor comment at lines 301650-301651, and
then delegates the ground item's GIT payload to `FUN_00605b0c` at line 301653.
This binds the eight-member state to the Area GIT Item record rather than the
paired GIC record.

The installed-retail `nw_cloth022` source readback in
`evidence/area-item-construction-2026-08-13/base-uti-source-readback.json`
corroborates the same eight labels and physical stored values. Its values are
fixture data, not substitutes for the reader defaults above. No xoreos or
other GPL source was consulted.

## Additive contract v1

Area-detail readback may add `itemInstanceState` only for the complete admitted
state:

```text
{
  presentFields: [<unique contract keys in native writer order>],
  values: {
    charges, cost, stolen, stackSize, plot, addCost, identified, cursed
  }
}
```

The frontend detaches the exact object into immutable
`source.itemInstanceState`. Its editable Item values are derived from
`values`; the broad compatibility `itemMetadata` map is never mutation
authority.

A changed retained Item projects one optional member on the existing Item
property mutation:

```text
{
  kind: "item",
  sourceIndex: <immutable Item ordinal>,
  instanceState: {
    expectedValue: <exact complete source storage>,
    value: <complete distinct target value vector>
  },
  editorComment?: <independently admitted exact GIC Comment CAS>
}
```

At least one of `instanceState` or `editorComment` is required. Both may be
combined on the same retained ordinal and are compiled into one candidate
transaction. Unknown members, incomplete vectors, noncanonical presence order,
duplicate presence keys, invalid values, a no-op full vector, stale expected
storage, duplicate or out-of-range ordinals, or mutation plus deletion fail
closed with `422 AREA_UPDATE_OBJECT_MUTATION_INVALID`.

## Mutation and preservation rules

Planning reparses the exact source GIT struct and compares both the complete
resolved vector and physical-presence vector. For each changed member:

- a present canonical member is replaced in place without changing its label,
  physical type, or sibling order;
- an absent member is inserted once, with its canonical label and proven type,
  at the deterministic position implied by the native writer order;
- an unchanged absent member remains absent;
- an unchanged present member and every unrelated field remain unchanged.

The writer must not clamp, coerce, alias, normalize, remove, or silently
materialize any other field. Candidate readback must reproduce the target
resolved vector, preserve the expected presence of unchanged members, and add
exactly those formerly absent members whose values changed. An
instance-state-only update keeps GIC, ARE, and IFO byte-identical. A combined
state/comment update changes only the admitted GIT state members and the exact
paired GIC `Comment`. The existing authorization, permission, approved-token,
optimistic-concurrency, idempotency, fencing, journaling, rollback/recovery,
atomic ARE/GIT/GIC/IFO publication, persisted-readback, and receipt contracts
remain unchanged.

## Payload, diagnosability, and proof

The complete storage and mutation members are each below two KiB. No endpoint,
binary body, streaming, chunking, or contract-major change is introduced.

Stable diagnostics distinguish `invalid_shape`, `ambiguous_field`,
`wrong_case`, `wrong_type`, `invalid_boolean`, `out_of_range`, `stale_storage`,
`unchanged`, `deleted_target`, and `candidate_readback_mismatch`. Telemetry may
expose only contract revision, object family, bounded stage, outcome, stable
result code, changed-field count, present-field count, and duration. Values,
object IDs, ordinals, hashes, paths, source/storage keys, raw fields or bytes,
credentials, and host paths are excluded from metric labels.

Required automated evidence is exact parser admission/rejection and defaults,
projector/planner full-state CAS, writer replacement/insertion/preservation,
combined GIT/GIC mutation, candidate readback and determinism, frontend HTTP
validation, mapping, detached provenance, draft validation, reducer and
materializer coverage, visible `ACTIVE_NOW`/`PRESERVE_ONLY` UI states, and a
Save/reopen regression. Fresh guarded browser proof and exact-candidate Toolset
Save/Build/reopen remain separate completion gates. Gameplay-visible NWN proof
is required before claiming behavioral parity for fields with runtime effects.

## Offline implementation result

The bounded slice is implemented end to end. Backend parsing retains the exact
physical-presence vector and resolved values only for one native type-`0` Item
struct. Projection and replanning bind a complete expected/value CAS to the
immutable Item ordinal. The pair writer replaces present members in place,
inserts newly materialized members in native writer order, preserves every
unrelated field and the paired GIC unless the independently admitted editor
comment also changes, and requires complete candidate readback before the
existing revision-fenced ARE/GIT/GIC/IFO transaction publishes the successor.
The legacy new-Item serializer now emits the same canonical physical types and
order, including `Charges : Byte` and `StackSize : Word`.

Frontend HTTP validation rejects incomplete, cross-family, wrongly ordered, or
out-of-range storage. Scene mapping makes the exact state authoritative over
loose compatibility metadata and detaches it into immutable source provenance.
Workspace validation, history cloning, the reducer, and final materializer keep
the source tuple unchanged while authoring a complete target tuple. The Item
property dialog exposes only these eight controls as `ACTIVE_NOW`, uses the
native numeric ranges, and keeps adjacent `CostTable` and `CostValue` plus all
unproven controls `PRESERVE_ONLY`.

Sequential one-worker verification under the repository's one-GiB Node heap
ceiling passes `108/108` targeted backend domain/parser/repository/projector/
planner/writer/candidate assertions, `721/721` focused frontend boundary/
domain/mapper/workspace/provenance/clone/dialog assertions, and the `1/1`
Apply/Cancel/reopen/OK/local-Save regression. Backend and frontend production
builds also pass. Capability revision `2026-08-29.99` records the audit and
tests while retaining `objects_item_authoring` as `partial`/`blocked`.

Fresh guarded browser proof, exact-candidate Toolset Save/Build/reopen, NWN
runtime behavior, arbitrary Item templates, and the remaining Item property,
identity, armor/color, inventory/equipment, script, item-property-list, and
variable matrix remain open. This offline result is not a full Area or Item
authoring completion claim.

## Resource-safety decision

The source-closure and offline implementation lane must use no Docker command,
service, watcher, browser, capture, Chrome, live Toolset/NWN process, mutation
testing, sub-agent, xoreos source, or other GPL source. Tests run sequentially
through repository scripts under the one-GiB Node heap ceiling. Live proof is
deferred to a separately coordinated repository-wide capture window.
