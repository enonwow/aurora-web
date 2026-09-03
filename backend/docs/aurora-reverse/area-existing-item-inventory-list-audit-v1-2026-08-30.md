# Existing Area ground-item `ItemList` audit v1

Date: 2026-08-30  
Status: offline implementation complete; guarded browser and native live proof pending  
Scope: exact retained-subset mutation of the ordered nested `ItemList` owned by
one retained type-`0` Area ground Item

## Decision

Aurora Web may expose the exact nested `ItemList` of one retained ground Item
and may reorder, remove, or change the repository coordinates of its retained
entries. Each retained entry keeps its immutable native ordinal and complete
embedded Item struct. This first bounded slice does not create a new nested
Item, change a nested Item identity or property, author `Equip_ItemList`, or
admit inventory-mode flags.

Exact absence is an editable empty source list, but this retained-only slice
cannot add the first entry. A physically present empty `ItemList` is
noncanonical because the native writer omits an empty primary list. A present list is admitted
only when it is one canonical `ItemList : List`, contains at most 1024 child
structs, and every child has:

- the canonical sequential struct type matching its zero-based list ordinal;
- exactly one canonical non-empty `TemplateResRef : ResRef` matching
  `[A-Za-z0-9_]{1,16}`;
- exactly one canonical `Repos_PosX : Word` and `Repos_Posy : Word`;
- no `Dropable`, `Droppable`, `Pickpocketable`, or `Infinite` member.

Every other nested Item member remains opaque and byte-semantically preserved
through the parsed GFF structure. An ambiguous, aliased, wrongly cased, wrongly
typed, over-budget, non-sequential, or mode-flag-bearing list does not grant
mutation authority.

## Primary Aurora authority

The primary source is the frozen Aurora Toolset decompilation
`C:/Projects/New Folder/export/decompiled_all.c`, SHA-256
`36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572`.
No xoreos or other GPL source was inspected or used.

The recovered lineage is:

1. The Item constructor `FUN_0060636c`, beginning at line `300606`, calls
   `FUN_0052bdc8(param_1 + 0x33, '\x01', 1)` at line `300619`. Ground Items
   therefore own inventory mode exactly `1` with full embedded Item objects.
2. The inventory initializer `FUN_0052bdc8`, beginning at line `189802`,
   allocates only the primary Item list for mode `1` at lines `189820..189825`.
   It does not allocate the equipment array used by mode `0`; consequently an
   Item cannot publish an `Equip_ItemList` through this native path.
3. The retained ground-Item reader `FUN_006077a8`, beginning at line `301397`,
   delegates to the common inventory reader as
   `FUN_0052a668(param_1 + 0x33, ...)` at line `301592`.
4. `FUN_0052a668`, beginning at line `188786`, opens `ItemList`, constructs a
   complete Item, invokes its full reader, and then reads `Repos_PosX` and
   `Repos_Posy` as Words at lines `188823..188826`. `Dropable` and
   `Pickpocketable` are consulted only when the inventory mode byte is `0`,
   while `Infinite` is consulted only in mode `3`; none applies to mode `1`.
5. The retained ground-Item writer `FUN_00607ccc`, beginning at line `301621`,
   calls `FUN_0052b55c(param_1 + 0xcc, ...)` only when the primary list is
   non-empty at lines `301654..301655`.
6. `FUN_0052b55c`, beginning at line `189445`, sorts the primary inventory,
   creates `ItemList`, emits child struct types from the target ordinal, calls
   the complete embedded Item writer, and appends `Repos_PosX` and
   `Repos_Posy` Words at lines `189459..189468`. Mode-`0` flags and mode-`3`
   `Infinite` are emitted only in their respective modes. Its separate
   `Equip_ItemList` branch requires a non-null equipment array, which mode `1`
   does not allocate.
7. The adjacent helpers `FUN_0050fc18` and `FUN_0050f528` read and write
   `VisTransformList`; they are independent of nested inventory and do not
   enlarge this slice.

## Additive contract v1

Area detail may add `itemInventoryItems` to a type-`0` Item placement. The
complete immutable source value is an ordered list of exact entries:

```text
[{ sourceIndex, resRef, x, y }]
```

`sourceIndex` is the physical zero-based child ordinal, `resRef` is the exact
nested `TemplateResRef`, and `x`/`y` are unsigned Word values. The frontend
detaches this list under immutable `source.itemInventoryItems` and authors a
separate `itemProperties.inventoryItems` target containing only retained
entries. A source ordinal may be selected at most once; its `resRef` is
immutable; target order is significant.

A changed retained Item projects one optional member on the existing Item
property mutation:

```text
inventory: {
  expectedEntries: [{ sourceIndex, resRef, x, y }],
  entries: [{ sourceIndex, resRef, x, y }]
}
```

At least one independently admitted Item property member is still required.
The complete expected list is an optimistic compare-and-swap value in addition
to the outer source GIT digest and immutable Item ordinal. An unchanged list is
not projected.

## Mutation and preservation rules

Planning reparses the exact source Item struct and requires its complete native
list to equal `expectedEntries`. A retained target child is cloned from its
source ordinal, receives its new sequential child struct type, replaces only
the two repository Words, and retains every other nested field. Target entries
may be reordered or removed. An empty target removes `ItemList`; a non-empty
target replaces the canonical list in its original parent-field position.

The candidate is independently reparsed and must reproduce the exact target.
Every other ground-Item field and all paired GIC bytes are preserved unless an
independently admitted Item mutation changes them. The existing authorization,
approved-token, optimistic-concurrency, idempotency, fencing, journal,
rollback/recovery, atomic ARE/GIT/GIC/IFO publication, persisted readback, and
receipt contracts remain unchanged.

Unknown members, a new entry without immutable source provenance, identity
change, duplicate source selection, invalid Word, invalid or stale expected
storage, noncanonical native shape, no-op mutation, deletion collision,
preservation drift, or candidate readback mismatch fails closed with stable
`422 AREA_UPDATE_OBJECT_MUTATION_INVALID` diagnostics.

## Budgets, diagnosability, and proof

Both lists are capped at 1024 entries and remain below 256 KiB in the JSON
mutation envelope. No endpoint, binary body, streaming, chunking, or contract
major version changes. Diagnostics expose only contract revision, Item family,
bounded stage, outcome, stable reason, entry counts, changed-coordinate count,
and duration. ResRefs, object identities, ordinals, hashes, paths, source keys,
raw fields/bytes, credentials, and host paths are prohibited from metric
labels.

Required offline evidence is exact parser admission/rejection, domain and HTTP
validation, projector compare-and-swap generation, writer clone/reorder/remove/
coordinate replacement, unrelated-field and GIC preservation, candidate
readback, deterministic output, frontend mapping and detached provenance,
workspace validation, draft/reducer/materializer coverage, visible
`ACTIVE_NOW`/`PRESERVE_ONLY` UI states, and Save/reopen regression coverage.

Fresh guarded browser evidence and exact-candidate Toolset Save/Build/reopen
remain separate completion gates. Any claim about gameplay-visible nested
container behavior additionally requires fresh NWN runtime evidence. This
offline lane uses no Docker command, service, watcher, browser, capture,
Chrome, Toolset/NWN process, mutation test, sub-agent, xoreos source, or other
GPL source.

## Implemented offline slice

The retained-only contract is now implemented end to end:

- the backend domain admits exact source, target, and compare-and-swap values;
- the GIT parser publishes the detached source list only for canonical native
  mode-`1` storage;
- the update projector emits the complete expected list and suppresses no-op
  mutations;
- planning reparses the exact source and the pair writer clones each retained
  embedded Item, rewrites only its target list ordinal and repository Words,
  omits an empty target list, preserves opaque child fields and GIC bytes, and
  independently reads the candidate back;
- the frontend HTTP adapter, scene mapper, workspace draft, cloning, draft
  materialization, and provenance helpers keep immutable source and editable
  target lists detached;
- the Item properties dialog exposes retained ResRefs as read-only and supports
  bounded Word coordinate changes, reorder, and removal without an Add path;
- the local Save/reopen regression proves that source compare-and-swap
  provenance remains unchanged while the target persists.

Accepted bounded offline evidence comprises 36 focused backend functional
assertions for the domain, parser, projector, planner, writer, and repository;
13 capability-catalog assertions; 860 focused frontend unit assertions across
the ItemList domain, provenance, adapters, mapping, workspace, materializer,
dialog, and cloning scopes; and one end-to-end JSDOM Save/reopen regression.
Both backend and frontend production builds complete under a 1 GiB Node heap.
Capability catalog revision `2026-08-30.107` records this implementation and
keeps `ground_item_inventory_list_live_proof_pending` explicit. These offline
results do not satisfy the remaining guarded browser, Toolset, or NWN gates.
