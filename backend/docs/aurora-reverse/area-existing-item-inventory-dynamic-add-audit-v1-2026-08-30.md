# Existing Area ground-Item dynamic `ItemList` add audit v1

Date: 2026-08-30  
Status: offline implementation verified; live proof and repository-wide gates pending

## Scope and decision

This additive extension permits one retained type-`0` Area ground Item to add
new ordinary `ItemList` children from exact current effective UTI provenance.
Retained children still use immutable source ordinals. A target may interleave
retained and new children, reorder or remove retained children, and set the
repository Word coordinates of either form. It does not authorize nested
identity/property editing, ground-Item `Equip_ItemList`, inventory-mode flags,
or a loose ResRef-only insertion.

## Aurora authority and closed prerequisite

Primary authority is the frozen Aurora Toolset decompilation
`C:/Projects/New Folder/export/decompiled_all.c`, SHA-256
`36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572`.
No xoreos or other GPL source was read or used.

The exact mode-`1` ground-Item reader/writer lineage, full embedded Item
construction, sequential child struct types, repository Words, absence of
equipment storage, and omission of mode-`0`/`3` flags are frozen in
`area-existing-item-inventory-list-audit-v1-2026-08-30.md`. Exact effective UTI
resolution, common Item conversion, recursive `ItemList`/`Equip_ItemList`
expansion, dependency budgets, cycle rejection, BaseItem admission, and
embedded sentinel transform values are frozen in
`area-item-dynamic-nested-inventory-construction-audit-v1-2026-08-30.md`.
This extension composes those proven contracts and introduces no new Aurora
semantic assumption.

## Additive target contract

`inventory.entries[]` becomes an exact union:

- retained entry: `{sourceIndex,resRef,x,y}`;
- effective-blueprint entry:
  `{resRef,itemTemplateId,itemResRef,itemSourceProfileId,itemSourceObjectKey,
  itemSourceSizeBytes,itemSourceFingerprint,itemTag,x,y}`.

The blueprint entry must use profile `effective-catalog-uti-item-copy-v1`.
Both ResRefs are the same canonical lowercase `[a-z0-9_]{1,16}` value.
Template ID is bounded to the existing catalog identifier grammar. Object key
is non-empty, NUL-free, and at most 2048 UTF-16 code units. Size is `1..1 MiB`.
Fingerprint is lowercase SHA-256. Tag is non-empty, NUL-free, and at most 256
UTF-16 code units. Coordinates are Words. Unknown, missing, aliased, mixed, or
partially retained/blueprint shapes fail closed.

The complete expected source list remains retained-only and is compared before
mutation. Retained source ordinals remain unique in the target. Blueprint
entries do not receive a source ordinal. Target cardinality remains at most
1024 and the existing request/body budget remains authoritative.

## Resolution, writing, and readback

Before writing, the candidate compiler re-resolves every distinct blueprint
against the exact current effective UTI winner and verifies template ID,
object key, byte size, digest, UTI identity, native ResRef, Tag, effective
BaseItem/ModelType, and the complete digest-bound dependency closure. Missing,
stale, malformed, cyclic, over-budget, or identity-mismatched closure fails
before transaction publication.

The writer independently consumes the verified bytes and closure through the
same generic dynamic Item converter used for new ground Items. Wrapper-only
`PaletteID` and UTI `Comment` do not enter the embedded child. X/Y/Z become
`-1/-1/-1`, X/Y orientation becomes `0/1`, the target repository Words are
appended, and the child struct type becomes its target ordinal. Retained
children are cloned exactly as before. Physical source absence plus a non-empty
target appends one canonical `ItemList`; empty target omits it; replacement
preserves its source field position. Every unrelated parent GIT field and all
paired GIC bytes remain unchanged.

Whole-candidate readback must reproduce the ordered target identities,
coordinates, and target cardinality. Existing authorization, approved-token,
optimistic concurrency, idempotency, fencing, journal, rollback/recovery,
atomic ARE/GIT/GIC/IFO publication, persisted readback, and receipt contracts
remain unchanged.

## Diagnostics and completion gates

Dynamic blueprint resolution and conversion use the existing best-effort
`area_dynamic_item_blueprint_copy.v1` stage telemetry with bounded counts and
stable result codes. ResRefs, template IDs, object keys, digests, Tags,
ordinals, paths, raw fields/bytes, credentials, and host paths remain
prohibited from telemetry labels. Telemetry failure must not alter validation,
writing, rollback, recovery, or publication.

Offline completion requires domain and HTTP union validation, projector CAS,
effective-catalog resolution, dependency enrichment, absent/present native
writer cases, retained/new interleaving, recursive embedded readback,
preservation and determinism checks, frontend catalog-provenance selection,
draft/clone/save persistence, property-window authoring, regression smoke, and
bounded production builds. Final completion additionally requires fresh
guarded browser add/Save/reopen, packed GIT/GIC readback, Toolset
Save/Build/reopen, and applicable NWN runtime proof. No live proof is claimed.

## Offline implementation record

The backend domain now admits the exact retained/effective-blueprint union and
rejects mixed, partial, aliased, over-budget, stale, or identity-mismatched
targets. The projector preserves the complete retained-only expected source
for compare-and-swap. The candidate compiler resolves each distinct current
effective UTI winner, enriches the immutable recursive dependency closure, and
passes only verified bytes and BaseItem/ModelType bindings to the paired
writer. The writer covers absent, empty, and present source storage; clones
retained children; expands new children through the generic dynamic Item
converter; preserves unrelated GIT and paired GIC data; and verifies the whole
ordered candidate on readback.

The frontend domain and HTTP boundary use the same exact union. The retained
Item property window lists only exact current effective-catalog UTI options,
revalidates their immutable provenance before addition, exposes no loose
ResRef insertion, keeps retained identities read-only, and permits coordinate
edit, reorder, and removal for either entry form. Viewport wiring, detached
cloning, local-draft round-trip, Apply/Cancel/reopen, and local Save preserve
the exact blueprint provenance while the immutable source remains
retained-only.

Accepted sequential resource-safe evidence is five backend suites with
`1658/1658` assertions, eight focused frontend files with `91/91` assertions,
`13/13` capability-catalog assertions, and the complete frontend
regression-smoke gate with `40/40` files and `130/130` assertions. Both bounded
production builds pass with the one-GiB Node heap ceiling; the frontend reports
only its existing large-chunk advisory. Capability revision `2026-08-30.112`
records the slice and keeps Item authoring `partial`/`blocked` with
`ground_item_inventory_dynamic_add_live_proof_pending`.

The broad frontend rerun followed focused repair of three stale regression
fixtures: retained Item instance state no longer expects blueprint-only Cost
Table on Basic, and Sound mutation tests now carry exact native source/target
storage instead of relying on unauthorised seed metadata or derived
MinDistance. The broad gate has no failed assertions. Existing React
`act(...)` warnings remain non-failing test-harness debt and are not presented
as proof quality.

No Docker command, container, service, watcher, browser, Chrome capture,
Toolset/NWN action, mutation test, sub-agent, xoreos source, or other GPL source
was used for this offline implementation. Fresh guarded browser add/Save/reopen,
packed GIT/GIC inspection, Toolset Save/Build/reopen, and applicable NWN runtime
proof remain mandatory before this slice can be promoted beyond offline
verification.
