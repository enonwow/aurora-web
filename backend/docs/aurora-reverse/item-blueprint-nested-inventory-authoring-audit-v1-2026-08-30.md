# Item blueprint nested inventory authoring audit v1

Date: 2026-08-30  
Status: offline implementation verified; live proof and repository-wide gates pending

## Scope and authority

This audit extends UTI create/update and the Items-mode wizard with canonical
reference-form `ItemList` and `Equip_ItemList` authoring. It does not change
retained Area-Item compare-and-swap behavior and does not embed binary Item
instances in an UTI.

The primary source is the frozen Aurora Toolset decompilation
`C:\Projects\New Folder\export\decompiled_all.c`, SHA-256
`36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572`.
The exact evidence and function mapping are recorded in
`area-item-dynamic-nested-inventory-construction-audit-v1-2026-08-30.md`:
UTI construction uses inventory mode `1`; `FUN_0052b920` writes references and
`FUN_0052ad40` reads them. No xoreos or other GPL source was used.

## Additive API-v1 contract

Item blueprint create/update may add:

- `inventoryItemListEntries`: ordered exact entries
  `{resRef, x, y}`;
- `equipItemListEntries`: ordered exact entries `{resRef, slotMask}`.

ResRefs use `[a-z0-9_]{1,16}`. Repository coordinates are unsigned Words.
Ordinary inventory contains at most 1024 entries. Equipment contains at most
18 entries and uses unique one-hot masks `0x1..0x20000` in ascending native
slot order. The combined reference count is at most 1024. Unknown keys,
non-integers, aliases, duplicate slots, unordered slots, self-references, and
out-of-budget input fail closed without normalization.

Every distinct referenced ResRef must resolve to an exact current effective
UTI winner before publication. Its immutable closure must be resolvable, and
an update is rejected if a referenced closure already contains the UTI being
written. This prevents orphan references and update-created cycles. The later
Area placement path still independently re-resolves and verifies the complete
closure.

Omitted or empty lists emit no field. A non-empty ordinary list emits
sequential child type IDs and exactly `InventoryRes:ResRef`,
`Repos_PosX:Word`, `Repos_Posy:Word`. A non-empty equipment list emits the
slot mask as child type ID and exactly `EquippedRes:ResRef`. Mode-0/3 flags are
forbidden. Exact parser readback is mandatory before object publication.

Catalog metadata exposes the ordered lists as JSON plus bounded counts. The
Items-mode wizard owns detached editable targets: add, edit ResRef/coordinates
or slot, reorder ordinary inventory, move equipment by selecting an unused
slot, and remove. Retained Area Items keep their separately proven mutation
profile; wizard authority never grants retained-object authority.

## Offline implementation record

The backend request schema and UTI writer now validate and serialize both
reference lists without aliases or normalization. Item blueprint create/update
performs a pre-publication effective-catalog closure check for every unique
reference, verifies immutable object key, size, SHA-256, UTI identity and exact
native ResRef, validates every returned dependency byte/digest pair, and
rejects update-created cycles before storage publication. Successful catalog
projection publishes both ordered lists, their bounded counts, and the exact
`sourceSha256` required by later dynamic Area-Item construction.

The frontend API contract, catalog mapper, Items-mode wizard payload builder,
workspace drafts, scene cloning, local-draft persistence, and Item property
window carry detached exact list values. The shared domain boundary rejects
unknown keys, noncanonical ResRefs, invalid Words, non-one-hot or duplicate
equipment slots, unordered equipment, self-reference, and combined-budget
overflow. The window exposes separate `ItemList` and `Equip_ItemList`
`ACTIVE_NOW` sections for wizard-owned targets only; invalid or unfinished
references disable Apply and OK. Retained Area Items remain on their separate
source-provenance path.

Capability catalog revision `2026-08-30.111` records the implementation while
keeping `objects_item_authoring` `partial`/`blocked` and adds
`item_blueprint_nested_inventory_live_proof_pending`. The additive diagnostic
event is `itemBlueprintNestedReferenceValidation` at contract
`item-blueprint-nested-inventory/v1`, stage `pre-publication`, with accepted or
rejected outcome, stable reason, bounded list counts, unique-reference count,
and duration only.

## Accepted resource-safe verification

Sequential one-worker verification on 2026-08-30 passed:

- 39/39 backend schema and UTI writer/readback assertions;
- 2/2 backend catalog lifecycle assertions for exact references, missing
  references, and update-created cycles;
- 13/13 Area capability-catalog assertions;
- the backend production build;
- 87/87 focused frontend domain, mapping, draft, clone, persistence, and UI
  assertions;
- 2/2 focused regression-smoke assertions;
- the frontend production build, with only the existing large-chunk advisory.

No Docker command, service, watcher, browser, capture, Toolset/NWN action,
mutation test, sub-agent, xoreos source, or other GPL source was used for this
offline gate.

## Compatibility, diagnostics, and proof

The existing authenticated and authorized item blueprint endpoints, overwrite
policy, body cap, storage adapter, and response envelope remain unchanged.
Requests are small JSON; no binary body, chunking, streaming, or API-major
change is introduced.

Validation and publication diagnostics may expose only contract revision,
stage, outcome, stable reason, ordinary/equipment/unique-reference counts, and
duration. ResRefs, object keys, digests, paths, raw fields/bytes, credentials,
and host paths are prohibited from telemetry labels.

Offline completion requires strict schema, writer/parser round-trip,
application create/update/readback, frontend mapper/wizard/editor, regression,
and bounded build gates; those focused gates are now green. Repository-wide
unit/regression gates remain part of final program closure. Final completion
additionally requires fresh guarded browser create/update/reopen, exact catalog
readback, packed Area placement readback, and Toolset Save/Build/reopen proof;
any applicable NWN runtime claim remains independent. No live proof is claimed
yet.
