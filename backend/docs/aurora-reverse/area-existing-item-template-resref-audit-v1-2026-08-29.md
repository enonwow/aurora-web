# Existing Area ground-Item `TemplateResRef` audit v1

Date: 2026-08-29  
Status: Offline implementation verified; live certification pending  
Scope: exact presence-sensitive `TemplateResRef : ResRef` readback and
compare-and-swap replacement for one retained type-`0` ground Item in the Area
GIT root `List`

## Decision

Aurora Web may replace one exact existing ground-Item
`TemplateResRef : ResRef` within the product's canonical non-empty lowercase
ResRef subset `[a-z0-9_]{1,16}`. Missing, empty, duplicate, aliased,
wrong-case, wrongly typed, noncanonical, or otherwise ambiguous storage is
`PRESERVE_ONLY` and does not authorize adding a native field.

This slice does not resolve, load, or replace a UTI resource and does not claim
that the target blueprint exists. It changes the retained instance reference
only. It does not activate localized names or descriptions, BaseItem,
PaletteID, model/armor/color members, PropertiesList, scripts, variables,
inventory/equipment, or arbitrary template construction. It may be combined
atomically with the independently admitted Item Tag, instance-state, and
paired GIC editor-Comment mutations for the same immutable Item ordinal.

## Primary Aurora authority

The frozen Toolset decompilation is
`C:/Projects/New Folder/export/decompiled_all.c`, SHA-256
`36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572`.
The installed binary is
`C:/Program Files (x86)/Steam/steamapps/common/Neverwinter Nights/bin/win32/nwtoolset.exe`,
size `12,201,984` bytes, SHA-256
`4c156de898817518e8a97f5d989592894d3c8f48b71d27e2a8b89500cd230f24`.
No xoreos or other GPL source was inspected or used.

The recovered storage lineage is:

1. Common Item reader `FUN_00604db8`, beginning at decompiled line `299920`,
   reads `TemplateResRef` through the native ResRef reader `FUN_00aeef98` at
   lines `299979-299981` into the Item member at byte offset `0x1c`.
2. Direct read-only PE mapping resolves that reader label virtual address
   `0x00c47a82` to file offset `0x00846a82` and exact bytes
   `54 65 6d 70 6c 61 74 65 52 65 73 52 65 66 00`.
3. Symmetric common Item writer `FUN_00605b0c`, beginning at line `300282`,
   writes the same member through the native ResRef writer `FUN_00aeffa4` at
   line `300300`.
4. Direct PE mapping resolves its independent label virtual address
   `0x00c47d57` to file offset `0x00846d57` and the same exact bytes.
5. Retained ground-Item writer `FUN_00607ccc` delegates the Item GIT payload to
   `FUN_00605b0c`, binding `TemplateResRef` to GIT rather than GIC.
6. Installed-retail and independent packed-module readback for `nw_cloth022`
   records exact `TemplateResRef : ResRef = "nw_cloth022"` in the source UTI
   and native type-`0` GIT instance under
   `backend/docs/aurora-reverse/evidence/area-item-construction-2026-08-13/`.

The 16-code-unit target limit and lowercase ASCII subset are an explicit
Aurora Web canonical ResRef admission policy already used by retained
Placeable and Creature TemplateResRef contracts. They intentionally narrow the
native storage domain; noncanonical existing values remain byte-preserved and
non-writable rather than being normalized.

## Additive contract v1

Area detail may expose exact presence-sensitive provenance:

```json
{
  "itemTemplateResRef": {
    "present": true,
    "nativeType": "resref",
    "value": "nw_cloth022"
  }
}
```

Absence is `{ "present": false }`. The frontend detaches this object under
immutable `source.itemTemplateResRef`. Broad `itemMetadata`, scene display
labels, object IDs, and construction-profile identity are never mutation
authority.

A changed retained Item may add this member to its existing property mutation:

```json
{
  "kind": "item",
  "sourceObjectId": "item:0:nw_cloth022:source",
  "sourceIndex": 0,
  "templateResRef": {
    "expectedResRef": "nw_cloth022",
    "resRef": "custom_cloth022"
  }
}
```

Both values must be distinct exact canonical ResRefs and admit no unknown
keys. At least one of `templateResRef`, `tag`, `instanceState`, or
`editorComment` is required. Valid members may coexist on the same immutable
ordinal and compile into one candidate transaction.

## Mutation and preservation rules

Planning reparses one canonical type-`0` Item struct, requires exactly one
`TemplateResRef : ResRef`, compares the complete expected value, and rejects
stale or ambiguous storage. The writer replaces only the existing field value
in place, preserving its label, type, physical position, every unrelated GIT
field, and all GIC bytes unless the independently admitted paired Comment also
changes. Complete candidate readback must reproduce the exact target before
the existing revision-fenced ARE/GIT/GIC/IFO transaction may publish it.

Unknown keys, invalid/no-op pairs, wrong family or ordinal, duplicate target,
mutation plus deletion, stale source, writer drift, or readback mismatch fail
closed with `422 AREA_UPDATE_OBJECT_MUTATION_INVALID`. Existing authorization,
permission, approved-token, optimistic concurrency, idempotency, fencing,
journaling, rollback/recovery, persisted-readback, and receipt guarantees
remain unchanged.

## Payload, diagnostics, and proof

The additive storage and mutation members are each below one KiB. No endpoint,
binary body, streaming, chunking, or contract-major change is introduced.
Diagnostics expose only contract revision, Item family, bounded stage, outcome,
stable reason, changed-field count, and duration. ResRef values, object IDs,
ordinals, hashes, paths, source/storage keys, raw fields/bytes, credentials,
and host paths are prohibited from metric labels.

Required offline evidence is strict domain and parser validation, exact source
presence, projector/planner CAS, writer preservation, combined Item mutation,
candidate readback, deterministic output, frontend HTTP/scene/workspace/clone
validation, guarded reducer/materializer behavior, visible
`ACTIVE_NOW`/`PRESERVE_ONLY`, and Apply/Cancel/reopen/OK/local-Save regression.
Fresh guarded browser proof, exact-candidate Toolset Save/Build/reopen, and NWN
runtime behavior remain separate release gates.

## Offline implementation verification

The backend now carries exact presence-sensitive provenance from parser and
snapshot repository through projection, planning, pair writing, complete
candidate readback, and the existing revision-fenced transaction. The writer
supports one atomic Item mutation containing `templateResRef`, `tag`,
`instanceState`, and paired-GIC `editorComment`, while retaining complete
expected-value CAS and unrelated-field preservation.

The frontend now validates and clones the additive HTTP member, maps a present
exact value as the retained Item's scene ResRef authority, keeps both present
and absent storage detached under immutable `source.itemTemplateResRef`, and
rejects malformed owner, ordinal, storage, or target state when reopening a
workspace draft. The Item Properties ResRef control is visibly `ACTIVE_NOW`
only for canonical present retained provenance and otherwise
`PRESERVE_ONLY`. Invalid input is rejected by the reducer, and final
materialization cannot bypass that guard.

Sequential bounded verification on 2026-08-29 passed:

1. `2,258/2,258` backend assertions across domain, parser, snapshot
   repository, projector, planner, pair writer, candidate compiler, and
   capability catalog;
2. `772/772` focused frontend assertions across the HTTP boundary, domain,
   Area mapper, workspace validation, provenance reducer/materializer, history
   clone, Item dialog, the new full-flow regression, and adjacent Item Tag
   regression;
3. `13/13` capability-catalog assertions; and
4. complete backend and frontend production builds under a one-GiB Node heap
   ceiling and one worker.

Capability revision `2026-08-29.101` records this audit while intentionally
keeping `objects_item_authoring` `partial`/`blocked`. The aggregate
`ground_item_template_resref_tag_instance_state_and_editor_comment_live_proof_pending`
blocker remains until fresh guarded browser, exact-candidate Toolset
Save/Build/reopen, and applicable NWN evidence exist.

## Resource-safety decision

This offline lane uses no Docker command, container, service, watcher, browser,
Chrome launch, capture, live Toolset/NWN process, mutation testing, sub-agent,
xoreos, or other GPL source. Tests remain sequential through repository
scripts under the one-GiB Node heap ceiling.
