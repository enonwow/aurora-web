# Existing Area ground-Item `Tag` audit v1

Date: 2026-08-29  
Status: Aurora source closed; exact offline implementation verified; live certification pending  
Scope: exact presence-sensitive `Tag : CExoString` readback and compare-and-swap
replacement for one retained type-`0` ground Item in the Area GIT root `List`

## Decision

Aurora Web may replace one exact existing ground-Item `Tag : CExoString`. The
admitted target is a JavaScript string of at most 32 UTF-16 code units without
U+0000. Empty and whitespace-containing values remain exact values and are not
trimmed, normalized, case-folded, or synthesized. Missing, duplicate, aliased,
wrong-case, wrongly typed, over-budget, or otherwise ambiguous storage is
`PRESERVE_ONLY` and does not authorize adding a native field.

This slice does not activate `TemplateResRef`, localized name, descriptions,
BaseItem, PaletteID, model/armor/color members, PropertiesList, scripts,
variables, inventory/equipment, or arbitrary template construction. It may be
combined atomically with the independently admitted Item instance-state and
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
   reads one CExoString through `FUN_00aef090` into the Item member at byte
   offset `0x34` at line `300044`.
2. Direct read-only PE mapping resolves that call's label virtual address
   `0x00c47aba` to file offset `0x00846aba` and bytes
   `54 61 67 00`, proving the exact case-sensitive label `Tag`.
3. Symmetric common Item writer `FUN_00605b0c`, beginning at line `300282`,
   writes the same member through `FUN_00af0084` at line `300315`.
4. Direct PE mapping resolves its label virtual address `0x00c47d98` to file
   offset `0x00846d98` and the same bytes `54 61 67 00`.
5. Retained ground-Item writer `FUN_00607ccc` writes placement and optional
   paired GIC Comment, then delegates the Item GIT payload to
   `FUN_00605b0c` at line `301653`. This binds `Tag` to GIT, not GIC.
6. Installed-retail readback for `nw_cloth022` records exact
   `Tag : CExoString = "NW_CLOTH022"` in both its source UTI and native type-`0`
   GIT instance under
   `backend/docs/aurora-reverse/evidence/area-item-construction-2026-08-13/`.

The immutable RCDATA report
`C:/Projects/nwn-last-city/Aurora/reverse/runs/NWTOOLSET_RCDATA_REFRESH_2026-05-20.json`,
SHA-256
`3d9c5d29709bcf4aa037554781d229a2094f3d85370c44a6a5df9a222f8d87fa`,
binds Item property form `TDLGITEMEDIT` at RVA `0x00B5F870`, size `18,562`.
The form contains Basic/Advanced Item `eTag : TEdit`, the `eTagChange` handler,
and serialized `MaxLength` at relative offset `0x1934` with Delphi integer
value `0x20`. This establishes the Toolset's 32-character edit boundary for
Item Tag independently of Creature or Placeable dialogs.

## Additive contract v1

Area detail may expose exact presence-sensitive provenance:

```json
{
  "itemTag": {
    "present": true,
    "value": "NW_CLOTH022"
  }
}
```

Absence is `{ "present": false }`; it remains distinct from one physically
present empty string. The frontend detaches this object under immutable
`source.itemTag`. Broad `itemMetadata.tag`, scene display labels, object IDs,
and template identity are never mutation authority.

A changed retained Item may add this member to its existing property mutation:

```json
{
  "kind": "item",
  "sourceObjectId": "item:0:nw_cloth022:source",
  "sourceIndex": 0,
  "tag": {
    "expectedValue": "NW_CLOTH022",
    "value": "  CHEST_LOOT  "
  }
}
```

Both values must satisfy the exact Item Tag boundary, must differ byte-for-code
unit, and admit no unknown keys. At least one of `tag`, `instanceState`, or
`editorComment` is required. Valid members may coexist on the same immutable
ordinal and compile into one candidate transaction.

## Mutation and preservation rules

Planning reparses one canonical type-`0` Item struct, requires exactly one
`Tag : CExoString`, compares the complete expected value, and rejects stale or
ambiguous storage. The writer replaces only the existing field value in place,
preserving its label, type, physical position, every unrelated GIT field, and
all GIC bytes unless the independently admitted paired Comment also changes.
Complete candidate readback must reproduce the exact target before the existing
revision-fenced ARE/GIT/GIC/IFO transaction may publish it.

Unknown keys, invalid/no-op pairs, wrong family or ordinal, duplicate target,
mutation plus deletion, stale source, writer drift, or readback mismatch fail
closed with `422 AREA_UPDATE_OBJECT_MUTATION_INVALID`. Existing authorization,
permission, approved-token, optimistic concurrency, idempotency, fencing,
journaling, rollback/recovery, persisted-readback, and receipt guarantees remain
unchanged.

## Payload, diagnostics, and proof

The additive storage and mutation members are each below one KiB. No endpoint,
binary body, streaming, chunking, or contract-major change is introduced.
Diagnostics expose only contract revision, Item family, bounded stage, outcome,
stable reason, changed-field count, and duration. Tag contents, object IDs,
ordinals, hashes, paths, source/storage keys, raw fields/bytes, credentials, and
host paths are prohibited from metric labels.

Required offline evidence is strict domain and parser validation, exact source
presence, projector/planner CAS, writer preservation, combined Item mutation,
candidate readback, deterministic output, frontend HTTP/scene/workspace/clone
validation, guarded reducer/materializer behavior, visible
`ACTIVE_NOW`/`PRESERVE_ONLY`, and Apply/Cancel/reopen/OK/local-Save regression.
Fresh guarded browser proof, exact-candidate Toolset Save/Build/reopen, and NWN
runtime Tag behavior remain separate release gates.

## Offline verification

Sequential verification passes the six focused backend domain/parser/
projector/planner/writer/candidate suites at `1,959/1,959`, the capability
catalog at `13/13`, and the eight focused frontend boundary/domain/mapper/
workspace/provenance/clone/dialog/regression files at `747/747`. Backend and
frontend production builds also pass. The workspace regression proves exact
whitespace preservation through Apply, Cancel, reopen, OK, and local Save.

Capability revision `2026-08-29.100` binds this audit and test matrix while
keeping ground-Item authoring `partial`/`blocked`. The aggregate
`ground_item_tag_instance_state_and_editor_comment_live_proof_pending` blocker
truthfully retains fresh browser, Toolset Save/Build/reopen, and NWN proof as
missing.

## Resource-safety decision

This offline lane uses no Docker command, container, service, watcher, browser,
Chrome, capture, live Toolset/NWN process, mutation testing, sub-agent, xoreos,
or other GPL source. Tests remain sequential through repository scripts under
the one-GiB Node heap ceiling. The normal full-diagnostics Jest preset was
discarded after it reached that per-process ceiling; accepted backend evidence
uses the repository's single-worker `test:unit:bounded` preset, with complete
TypeScript checking retained by the production build.
