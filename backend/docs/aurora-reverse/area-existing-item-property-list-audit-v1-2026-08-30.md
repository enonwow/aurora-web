# Existing Area ground-Item `PropertiesList` audit v1

Date: 2026-08-30  
Status: source-closed for canonical retained-list CRUD; live proof pending

## Scope

This audit closes the native storage contract required to create, update,
remove, and reorder property entries on one retained type-`0` ground Item in
an Area GIT. It does not activate `BaseItem`, appearance, inventory/equipment,
or compatibility script authoring. It does not claim that arbitrary numeric
tuples are valid gameplay combinations; dictionary-backed UX and server-side
semantic admission remain a separate dependency.

## Primary evidence

Primary source:

- `C:\Projects\New Folder\export\decompiled_all.c`
- SHA-256:
  `36BB8B1031AFE2ABF23F0E18180A5AD649401D9EA5E078E5170A31A96167C572`
- common Item reader: `FUN_00604db8`, beginning at line `299920`
- common Item writer: `FUN_00605b0c`, beginning at line `300282`

Reader evidence at lines `300119..300166`:

1. `PropertiesList` is read as a GFF List.
2. Each entry is opened by ordinal and materialized as one internal
   12-byte property record.
3. Fields are read in this order and native type:
   - `PropertyName : Word`
   - `Subtype : Word`
   - `CostTable : Byte`
   - `CostValue : Word`
   - `Param1 : Byte`
   - `Param1Value : Byte`
   - `ChanceAppear : Byte`
4. Missing-field defaults visible in the reader are `0`, `65535`, an
   unresolved caller-local CostTable byte, `0`, `255`, `0`, and `100`.
5. After parsing, `PropertyName == 0x30` forcibly sets `CostTable = 0x18`.
6. `PropertyName == 0x0f` and `0x2c` increment internal counters. This is an
   in-memory derived side effect, not an additional serialized field.

Writer evidence at lines `300404..300424`:

1. The writer emits `PropertiesList` and iterates the internal records in
   their existing order.
2. Every emitted entry uses struct type `0`.
3. It writes exactly the seven fields above in the same order and with the
   same `Word/Word/Byte/Word/Byte/Byte/Byte` types.

No xoreos source, comment, structure, or other GPL implementation was used.

## Knowledge boundary and no-guessing decision

The decompiler does not recover the initialization source of the reader's
missing-field CostTable default (`local_a9`) strongly enough to make it an
implementation constant. Aurora Web therefore does not invent that default.
Retained mutation is admitted only when the source contains exactly one
case-sensitive `PropertiesList : List` and every entry is the canonical
writer shape:

1. struct type `0`;
2. exactly seven fields;
3. exact labels, order, and native types listed above;
4. values inside their unsigned native ranges;
5. `PropertyName == 48` implies `CostTable == 24`.

An absent list, duplicate or differently cased list field, non-type-`0`
entry, missing/extra/reordered/wrongly typed field, out-of-range value, or
noncanonical property-48 tuple is retained but not editable. This restriction
avoids both the unresolved default and silent destruction of opaque sibling
data. It is a source-admission boundary, not an identity-specific behavior
branch.

## Additive contract v1

The existing Area contract gains one optional Item-only provenance member:

```text
itemPropertyList:
  present: boolean
  expectedEntries:
    - sourceIndex: uint32
      propertyName: uint16
      subtype: uint16
      costTable: uint8
      costValue: uint16
      param1: uint8
      param1Value: uint8
      chanceAppear: uint8
```

`present=false` requires an empty expected list and is diagnostic only; it
does not grant field-creation authority. `present=true` binds one complete
ordered source vector. The editable scene target carries the same seven
numeric values without `sourceIndex`. Display labels are never persistence
authority.

The payload budget is at most `4096` entries. The list is delivered inline in
the existing bounded Area snapshot/update payload; no chunking or streaming is
introduced. The change is additive within contract v1 and older clients may
ignore it.

## Mutation and transaction invariants

1. Mutation is one full-vector compare-and-swap bound to the immutable Item
   family ordinal and source object id.
2. Entry order and duplicate property tuples are exact state.
3. Add, remove, update, and reorder are expressed only as a complete target
   vector; no index-only patch crosses the HTTP boundary.
4. The target contains all seven values for every entry and obeys the native
   ranges plus the property-48 invariant.
5. An unchanged vector is not a mutation.
6. The writer re-reads the candidate's current canonical vector and requires
   equality with `expectedEntries` before replacement.
7. Replacement writes one canonical `PropertiesList` at the original field
   position, including a physically present empty List for an empty target.
8. Unrelated Item fields, other GIT objects, ARE, paired GIC, and IFO remain
   byte-identical unless another independently admitted mutation participates
   in the same transaction.
9. Candidate readback must equal the complete target vector before the
   existing revision-fenced ARE/GIT/GIC/IFO publication may commit.
10. A failure is deterministic and leaves the module snapshot unchanged.

## Diagnosability contract

The additive low-cardinality event family is
`area_item_property_list_cas.v1` with:

- `operation=parse_source|admit_profile|plan|write|readback`
- `outcome=succeeded|failed`
- stable `resultCode`
- `sourceCount`, `targetCount`, `changedEntryCount`
- `changeShape=same_length|expanded|contracted|reordered`
- `durationMs`

Property values, display labels, Item ids, ordinals, hashes, paths, raw GFF
fields/bytes, source or storage keys, credentials, and host paths are
prohibited from telemetry and metric labels. Telemetry failure must not change
validation, write, rollback, or recovery behavior.

## Required TDD and completion gates

Before promotion from `PRESERVE_ONLY` to `ACTIVE_NOW`, tests must prove:

1. strict domain parsing, cloning, budgets, range checks, order, duplicates,
   property-48 normalization rejection, and no-op rejection;
2. exact packed-GFF parser admission and fail-closed malformed variants;
3. additive HTTP schema and frontend adapter validation;
4. scene mapping, history cloning, draft validation, reducer/materialization,
   Cancel, Apply, OK, reopen, and local Save;
5. projection and independent-ordinal CAS planning;
6. add/update/remove/reorder candidate writes, physical field position,
   preservation, transaction rollback, and persisted readback;
7. combined atomic mutation with the already admitted Item fields;
8. regression smoke plus backend/frontend production builds;
9. fresh guarded browser Save/reopen;
10. exact-candidate Toolset Save/Build/reopen with packed GFF readback and,
    where gameplay-visible, NWN inspection.

Offline implementation does not close the two live release gates in items 9
and 10 and does not promote the overall Area program to complete.

## Offline implementation checkpoint — 2026-08-30

The source-closed slice is now implemented through the bounded offline path:

1. backend domain parsing, exact packed-GFF provenance extraction, snapshot
   cloning, deterministic cache hashing, workspace projection, immutable
   ordinal planning, paired GIT/GIC replacement, whole-candidate readback,
   and the revision-fenced compiler all carry the complete ordered vector;
2. the pair writer supports add, update, remove, and reorder while preserving
   the physical field position, unrelated GIT fields, and paired GIC bytes;
3. frontend HTTP validation, Area mapping, scene cloning, local draft
   validation, reducer/materialization, and the Item Properties dialog share
   the same strict seven-field contract;
4. an exact physically present retained list is visibly `ACTIVE_NOW`; absent,
   malformed, wrong-owner, and unresolved-default profiles remain
   `PRESERVE_ONLY`;
5. retained-list Add creates an intentionally incomplete blank entry instead
   of inventing Aurora values. Native numeric bounds are visible on every
   input, display labels remain read-only, and Apply/OK are disabled with
   `INCOMPLETE_TARGET` until every entry is canonical;
6. the lower materialization boundary independently rejects an incomplete or
   invalid vector and preserves the prior list even if UI admission is
   bypassed.

Sequential resource-safe verification passed the relevant backend test files
with `2,313/2,313` assertions, including the capability catalog, and the
relevant frontend boundary/domain/mapper/workspace/provenance/clone/dialog
files with `821/821` assertions. Both backend and frontend production builds
passed with the one-GiB Node heap ceiling; every test runner used one worker.
Capability catalog revision `2026-08-30.104` records this evidence while
retaining `objects_item_authoring` as `partial`/`blocked` and adds
`ground_item_property_list_live_proof_pending`.

No Docker command, container, service, watcher, browser, Chrome launch,
capture, live Toolset/NWN process, mutation test, sub-agent, xoreos source, or
other GPL source was used for this checkpoint. Fresh guarded browser
Save/reopen and exact-candidate Toolset Save/Build/reopen plus packed-GFF
readback remain mandatory release gates.
