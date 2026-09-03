# Existing Area Creature `Appearance_Type` audit v1

Date: 2026-08-27  
Status: source-closed; implementation and Aurora Web live certification pending

## Scope and decision

Aurora Web may replace the exact existing `Appearance_Type : Word` of one
retained type-`4` Area GIT Creature. The value is a zero-based physical row
ordinal in the one effective `appearance.2da` resource. It is not a display
name, ResRef, model name, merged row identifier, or free-form integer.

Editing is presence-sensitive. A missing, duplicated, case-aliased, or
wrongly typed native field remains preserve-only. A changed target must be an
exact Toolset-admitted physical row in the same immutable effective table,
must fit the native Word range `0..65535`, and must survive a fresh table-
digest and row-count comparison immediately before candidate compilation.

This slice does not edit body parts, phenotype, race, gender, portrait,
appearance colors, wings, tail, equipment, creature size, or any other
Creature property. Those fields may affect the rendered model but require
their own independent native contracts.

## Primary Aurora authority

The primary decompilation source is
`C:/Projects/New Folder/export/decompiled_all.c`, size `30,366,020` bytes,
SHA-256
`36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572`.
Its symbol/string report
`C:/Projects/New Folder/export/strings.tsv` has SHA-256
`864ae0139451d5333307cb2bbccce725bbd2d2c6056ac2d5f80f9b5ea50f190f`.

The corresponding Toolset binary is
`C:/Program Files (x86)/Steam/steamapps/common/Neverwinter Nights/bin/win32/nwtoolset.exe`,
size `12,201,984` bytes, SHA-256
`4c156de898817518e8a97f5d989592894d3c8f48b71d27e2a8b89500cd230f24`.
The immutable RCDATA report is
`C:/Projects/nwn-last-city/Aurora/reverse/runs/NWTOOLSET_RCDATA_REFRESH_2026-05-20.json`,
SHA-256
`3d9c5d29709bcf4aa037554781d229a2094f3d85370c44a6a5df9a222f8d87fa`.

Only these primary artifacts, installed retail resources, repository fixtures,
and the accepted prior live evidence packet were inspected. No Toolset, NWN,
browser, server, Docker process, or capture was started. No xoreos or other
GPL source was inspected or used.

## Recovered native storage and model lineage

The placed-Creature reader `FUN_0053ab24`, beginning at decompiled line
`197397`, calls the complete Creature property reader `FUN_00532174` at line
`197530`. The complete reader begins at line `193907`, reads exact label
`Appearance_Type` through `FUN_00aeedc4` at line `194114`, and passes the
result to `FUN_00512810`.

The symmetric placed-Creature writer `FUN_0053ae80`, beginning at line
`197558`, calls complete Creature writer `FUN_0053521c` at line `197590`. The
complete writer begins at line `195081` and writes exact label
`Appearance_Type` through `FUN_00aefd88` at line `195146` from the Creature
member at offset `0x70`.

`FUN_00aeedc4`, beginning at line `967918`, returns an unsigned 16-bit value
and accepts only native GFF type id `2` (`Word`). Missing or wrongly typed
storage follows the supplied default path. `FUN_00aefd88`, beginning at line
`968723`, creates/uses the same type id and writes the supplied `ushort`.

`FUN_00512810`, beginning at line `174570`, stores the Word at Creature offset
`0x70`, invalidates cached model state, and queries the `MODELTYPE` column of
the table referenced by `DAT_00d3efcc`. Initializer `FUN_0065a3c4` loads that
table from resource name `Appearance`. Table lookup `FUN_00af3568`, beginning
at line `971207`, bounds-checks the requested number against the physical row
count and indexes the row vector directly as `rowArray[number]`. Therefore the
stored value is the physical ordinal of the effective `appearance.2da`; the
setter also proves that changing it invalidates and rebuilds Creature model
state.

Aurora resource lookup is whole-resource, precedence ordered, first-hit-wins.
The effective table is consequently one strongest parseable module/HAK/base
resource and must never be synthesized by row-merging weaker tables.

## Recovered native selector admission

Creature-editor initialization `FUN_0044fea4` calls `FUN_0045921c` at
decompiled line `71834`. `FUN_0045921c`, beginning at line `76895`, clears the
Appearance ComboBox and iterates the effective Appearance table from physical
row `0` to `rowCount - 1` at lines `76944..76958`.

For every physical row it performs the following exact admission path:

1. It reads `STRING_REF` through the numeric 2DA helper at lines
   `76962..76990`.
2. When that read succeeds, only values other than `0` and `0xffffffff`
   (`-1`) continue; the Toolset resolves the TLK display value and adds the
   ComboBox item at lines `77049..77063`.
3. When the numeric read fails, it reads `LABEL` through the string helper at
   lines `76996..77030`; only a successful label lookup adds an item at lines
   `77034..77047`.
4. Both add paths store `local_90`, the physical row ordinal, as ComboBox
   item-data at lines `77044` and `77061`.

Later Basic-dialog initialization selects an item by looking up the current
Appearance Word as item-data and applies the row through `FUN_00512810` at
lines `98633..98636`. The web catalog must reproduce the same admission
decision and retain the physical ordinal. Rows above `65535` are additionally
excluded because they cannot round-trip through the native Word even if a
malformed oversized table caused the native ComboBox to list them.

No generic `Row N` fallback is permitted in this Creature selector. A row with
an explicit numeric `STRING_REF` of `0` or `0xffffffff` is not rescued by
`LABEL`; LABEL is consulted only when numeric STRING_REF lookup fails.

## Existing accepted Toolset evidence

The verified manifest
`function-manifests/AUR-S03-08-appearance.json` and evidence packet
`evidence/npc-stage3-live-2026-07-15` prove the native Basic-tab Appearance
ComboBox, visible model replacement, Toolset Save readback, isolated change,
and exact rollback. The changed candidate used physical row `52`
(`Elemental, Air`); rollback restored row `249` (`Dwarf, Male`). The raw GIT
summaries isolate the target at coordinates `60.9686,54.5207` while two other
same-template/tag Creatures remain at row `249`.

That packet proves the native UI/Save/render path for those two rows. It does
not prove the Aurora Web browser path, generic correctness for every admitted
row, or NWN runtime behavior for the edited candidate.

## Frozen additive contract

Area detail may add exact presence-sensitive storage:

```json
{
  "creatureAppearance": {
    "present": true,
    "nativeType": "word",
    "value": 249,
    "table": {
      "resourceName": "appearance.2da",
      "sourceObjectKey": "runtime-source/vanilla/data\\xp2patch.key/appearance.2da",
      "sourceLayer": "vanilla",
      "sha256": "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      "sizeBytes": 123456,
      "rowCount": 1000,
      "rowIndex": 249
    }
  }
}
```

Absence is `{ "present": false }`; it never authorizes materializing a new
native field. The frontend retains a detached immutable copy as
`source.creatureAppearance`. Exact `aurora_git`, `sourceKind=creature`, and
zero-based `sourceIndex` provenance plus current catalog identity are required
for `ACTIVE_NOW`; every other case is `PRESERVE_ONLY`.

A changed admitted target projects exactly:

```json
{
  "kind": "creature",
  "sourceObjectId": "creature:0:nw_chicken:...",
  "sourceIndex": 0,
  "appearance": {
    "expectedValue": 249,
    "value": 52,
    "tableSha256": "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    "rowCount": 1000
  }
}
```

The authenticated catalog query is additive and bounded. It accepts the exact
effective-table digest plus paging and either a bounded text query or an exact
Word-range `rowIndex`. Text and exact-row filters are mutually exclusive; the
exact form returns zero or one Toolset-admitted row and lets the frontend bind
the retained/selected ordinal without paging guesses. It returns only
Toolset-admitted rows, their physical row indices, bounded display data, and
the same immutable table descriptor. It never returns table bytes, storage
credentials, host paths, or an unbounded result set.

## Writer, transaction, and diagnosability requirements

Planning resolves the immutable Creature ordinal, requires exactly one
case-sensitive `Appearance_Type : Word`, and compares the exact source value.
Candidate compilation independently reloads the effective table, requires the
same resource descriptor, digest and row count, and verifies that the target
physical row remains Toolset-admitted. The writer replaces only that Word,
then whole-candidate readback must recover the exact target and unchanged
unrelated fields before the existing revision-fenced, idempotent, journaled
ARE/GIT/GIC/IFO publication.

The mutation may coexist with independently valid Creature Tag, name,
Conversation, `ItemList`, and `Equip_ItemList` changes on the same ordinal.
Missing, duplicate, aliased, wrong-case, wrongly typed, out-of-Word-range,
unlisted-row, stale-table, stale-source, unchanged, deletion-colliding,
preservation-drifting, or readback-drifting state fails closed with
`422 AREA_UPDATE_OBJECT_MUTATION_INVALID`.

Diagnostics expose only bounded family, ordinal, field token, counts, stage,
duration, and stable reason code. Appearance labels, TLK text, raw fields,
bytes, hashes, resource keys, storage keys, and host paths remain redacted.

## Completion boundary

Offline completion requires exact domain/storage parsing, one-resource
precedence, immutable descriptor and selector row catalog, authenticated
bounded catalog transport, repository clone/fingerprint, frontend mapping and
immutable clone, saved-workspace validation, control-state derivation,
selector/reducer/materializer, projector, independent planner, fresh
candidate compiler validation, writer, whole-candidate readback, combined
mutation, round-trip, integration, regression, capability-catalog, and build
coverage.

Fresh Aurora Web browser Save/reopen and renderer proof against the exact
effective table remain release gates. Exact-candidate Toolset Save/Build/reopen
and NWN runtime inspection also remain separate release gates. The prior native
rows `52`/`249` packet may support, but cannot replace, those fresh proofs.

## Offline implementation checkpoint (2026-08-27)

The offline contract is implemented end to end: exact Area parser/binding and
fingerprint, authenticated digest-bound admitted-row catalog with exact
`rowIndex` lookup, frontend HTTP schema/application facade/provenance/catalog
reducer, draft and clone boundaries, Creature dialog selector, exact renderer
process override, projector, independent planner, compiler revalidation,
Word-only writer, whole-pair readback, and atomic publication coverage.

Focused unit and integration checks cover native `249 -> 52`, rollback,
malformed/absent/unbound/wrong-family/wrong-case/wrong-type/duplicate/stale
storage, stale catalog identity, non-admitted targets, detached frontend
copies, saved-draft validation, selector admission, renderer override, and
unchanged GIC/IFO bytes during atomic publication. TypeScript compilation also
passes under the repository 1 GiB resource limit.

The final App-level regression exposed and closed one stale-closure defect in
the viewport callback: the selector rendered the admitted digest-bound rows,
but the change reducer still observed the catalog state captured before the
request completed and therefore retained `249`. The callback now depends on
the current catalog state. The regression proves `249 -> 52`, Apply, OK,
reopen, local Save, retained immutable source value `249`, and retained table
identity. Catalog failures also carry a bounded error message into a disabled
preserve-only control and emit the existing object-bound telemetry event
without exposing the digest or resource key.

The final bounded verification ran one process at a time with one worker and a
1 GiB heap: the complete Creature properties component suite passed `16/16`,
the complete Creature properties App regression passed `6/6`, frontend
TypeScript compilation passed, and the backend Nest build passed. Earlier in
this same checkpoint, the focused backend Appearance domain, catalog,
repository, controller, service, projector, planner, writer, compiler, and
capability-catalog selections passed `145/145`; the exact atomic publication
selection passed `1/1`. Capability catalog revision `2026-08-27.67` retains the
Appearance evidence and explicit live-proof blockers.

This checkpoint is not a release-complete claim. The fresh browser
Save/reopen/renderer capture, exact-candidate Toolset Save/Build/reopen, and NWN
runtime proof listed above remain pending and must run in a separately
coordinated, single-capture window.
