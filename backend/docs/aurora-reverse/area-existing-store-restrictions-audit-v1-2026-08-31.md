# Existing Area Store restrictions audit v1

Date: 2026-08-31  
Status: primary Aurora semantics, additive contract, and offline implementation
verified; live certification pending  
Scope: exact retained type-`11` GIT Store `WillNotBuy` and `WillOnlyBuy`
storage, catalog binding, and compare-and-swap mutation

## Decision

Aurora Web may expose the two Store restriction lists only as one complete,
source-provenant pair:

- `WillNotBuy : List` and `WillOnlyBuy : List` are independent and ordered;
- every admitted nonempty list entry uses native struct type `0x00017e4d`;
- every entry contains exactly one `BaseItem : Int` field;
- admitted `BaseItem` values are nonnegative signed int32 values and must name
  a row in the exact current effective `baseitems.2da` table;
- physical order and duplicates are retained, including a value present in
  both lists; no runtime exclusivity rule is inferred;
- absence and a physically present empty list both read as an empty semantic
  vector, but physical presence is retained in immutable source provenance;
- removing the last entry writes the native present-empty list profile, while
  an unchanged absent-empty list remains physically absent;
- malformed labels, aliases, types, struct IDs, fields, negative values,
  opaque siblings, unavailable/stale table identity, or exceeded budgets are
  preserve-only.

The web safety budget is at most 4,096 entries across both lists. No sorting,
deduplication, coercion, aliasing, range clipping, or cross-list normalization
is authorized. This storage slice does not establish merchant runtime behavior,
inventory mutation, arbitrary UTM authoring, or the meaning of a restriction
against an absent/custom runtime base-item row.

## Immutable primary authority

| Source | SHA-256 |
| --- | --- |
| `C:/Projects/New Folder/export/decompiled_all.c` | `36BB8B1031AFE2ABF23F0E18180A5AD649401D9EA5E078E5170A31A96167C572` |
| `backend/docs/aurora-reverse/evidence/area-store-construction-2026-08-13/native-toolset-instance-readback.json` | `18F0B6108CE77B1206743AC74B11B6F647611417AC38E56092F76A418881095E` |
| `backend/docs/aurora-reverse/evidence/area-store-construction-2026-08-13/base-utm-production-adapter-readback.json` | `ED3DFDF2B95FAB58F8CAF1EA311918715C29F242A302A4A298DB874B4B1BF123` |

No xoreos or other GPL source was consulted.

The common Store reader `FUN_00640870` binds the two Store members at offsets
`0x18` and `0x19` to the exact labels `WillNotBuy` and `WillOnlyBuy`. It clears
each in-memory vector, reads the corresponding list in physical order, reads
`BaseItem` through the same signed-Int GFF accessor used for Store commerce,
and appends only a physically present value greater than or equal to zero. It
does not sort, deduplicate, or reject a value occurring in both vectors.

The symmetric writer `FUN_00641058` visits the same two members and labels in
the same order. It creates each list, emits one struct with exact type
`0x00017e4d` per vector element, and writes one `BaseItem` through the native
Int writer. Empty vectors therefore serialize as physically present empty
lists. Both the retained type-`11` GIT reader/writer and UTM reader/writer use
this common Store pair. The previously accepted retail UTM readback retains
both list fields in their native root order; the accepted Toolset placement
proves the same common Store state is materialized inside a type-`11` GIT
instance.

The native reader's permissive skip behavior is not an authoring license. A
web parser that collapsed a malformed entry into a shorter vector could later
delete opaque data, so Area authoring admits only the exact writer-produced
entry profile and otherwise omits editable provenance.

## Additive contract v1

Area detail may add the following only after binding every retained value to
the exact effective `baseitems.2da` table already delivered with the Area:

```text
storeMetadata.restrictions = {
  expectedValue: {
    willNotBuy: { present, baseItemIds: [...] },
    willOnlyBuy: { present, baseItemIds: [...] }
  },
  tableSha256,
  tableRowCount
}
```

The frontend detaches this as immutable `source.storeRestrictions` and
initializes a separately editable target:

```text
storeProperties.restrictions = {
  willNotBuy: [...],
  willOnlyBuy: [...]
}
```

Editing is active only when the source Store family and ordinal, complete
restriction provenance, exact Area `itemBaseItemCatalog` identity, and every
source/target row are admitted. The UI uses the catalog's source-backed display
names but serializes only physical row IDs. Reorder and duplicates remain
observable; a row may remain in both lists because Aurora storage does not
prove a mutual-exclusion invariant.

A changed retained Store projects one complete member beside independently
admitted Comment, commerce, script-ResRef, and VarTable members:

```text
restrictions = {
  expectedValue: <complete physical source pair>,
  value: { willNotBuy: [...], willOnlyBuy: [...] },
  tableSha256,
  tableRowCount
}
```

Planning reparses the exact current Store ordinal, compares physical presence
and both ordered vectors, and re-resolves the effective table identity. The
writer replaces only changed present lists, creates a canonical native list
when a previously absent vector becomes nonempty, and writes a present-empty
list when a nonempty vector is cleared. It preserves an unchanged absent-empty
list and every unrelated GIT field, paired GIC, ARE, and IFO member. Candidate
and persisted readback must match both target vectors and the deterministic
physical-presence policy before the existing revision-fenced atomic
transaction may publish.

Unknown keys, malformed/partial/stale/unchanged pairs, wrong family or ordinal,
catalog drift, out-of-catalog rows, duplicate mutation, deletion collision,
preservation drift, or readback mismatch fails with the existing
`422 AREA_UPDATE_OBJECT_MUTATION_INVALID` envelope. Existing authorization,
request budgets, optimistic concurrency, idempotency, fencing, journal,
rollback/recovery, receipts, endpoint, streaming, chunking, and API-major
contracts do not change.

## Diagnosability

The additive content-free event is `area_store_restrictions_cas.v1` with
`operation=parse_source|bind_catalog|admit_profile|plan|write|readback`,
outcome, stable result code, total target entry count, changed-list count, and
duration. Base-item IDs or names, object identity, ordinal, table hash, paths,
source/storage keys, raw fields or bytes, credentials, and host paths are
prohibited. Telemetry failure cannot affect validation, mutation, publication,
rollback, or recovery.

## Required implementation and evidence

1. [verified offline] Exact backend storage/provenance domain and catalog binding.
2. [verified offline] Exact parser admission/rejection, detached repository clone, and
   dependency fingerprinting.
3. [verified offline] Projector/planner full-pair CAS and current-table validation.
4. [verified offline] Exact GIT mutation, physical-presence policy, typed ordered
   readback, idempotence, coexistence, and companion preservation.
5. [verified offline] Frontend HTTP, mapper, workspace, clone, local draft, catalog-bound
   restriction editor, and Apply/Cancel/OK regression coverage.
6. [verified offline] Content-free telemetry and sink-failure isolation.
7. [pending] Fresh guarded browser Save/reopen proof.
8. [pending] Fresh Toolset Save/Build/reopen and applicable NWN merchant proof.

Proof completeness remains `missing` until both live axes are fresh,
identity-bound, validated, and accepted. Offline tests cannot replace them.

## Offline implementation checkpoint

The backend now retains detached restriction provenance, binds it to the exact
effective `baseitems.2da`, projects and plans one complete-pair CAS, applies the
native physical-presence policy through the paired GIT writer, verifies typed
ordered candidate/persisted readback, and emits the content-free six-operation
telemetry contract with sink-failure isolation. Comment, commerce,
script-ResRef, VarTable, and restriction changes may coexist on one retained
Store without rewriting paired GIC, ARE, IFO, inventory, or unrelated GIT
members.

The frontend now validates and detaches HTTP provenance, maps it only under the
exact current item-base catalog, preserves it through workspace parsing,
cloning, and local drafts, and exposes two ordered catalog-backed lists in
Store Properties. Apply, Cancel, OK, reopen, duplicate retention, cross-list
overlap, reorder, add/remove, and stale-catalog preserve-only behavior are
covered. The Area update boundary already transports the complete validated
`editableScene`; no parallel restriction payload or tile-export contract was
introduced.

Accepted sequential resource-safe verification passes eight backend suites
with `1154/1154` tests and nine frontend files with `920/920` tests. Backend and
frontend production builds pass under the repository one-GiB Node heap ceiling;
the frontend reports only its pre-existing large-chunk advisory. Capability
revision `2026-08-31.116` records this offline closure while retaining
`objects_store_authoring` as `partial`/`blocked` for arbitrary Store-template,
inventory-runtime, browser, Toolset, and applicable NWN proof debt.

## Resource-safety record

This audit and implementation used bounded sequential static inspection,
one-worker test commands, and repository-capped production builds. It started
no Docker command, container, service, watcher, browser, capture, Toolset, NWN,
mutation runner, or subagent.
