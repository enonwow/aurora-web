# Existing Area Placeable `BodyBag` and effective `bodybag.2da` audit v1

Date: 2026-08-19  
Status: source-closed; offline implementation verified; browser, Toolset, and NWN recertification pending

## Scope and authority

This audit covers mutation of one retained type-`9` Area GIT Placeable
`BodyBag : Byte`, exposed by the Aurora Placeable properties dialog as
`Treasure Model`, and its binding to one physical row of the effective
`bodybag.2da`. It does not define creature death-remains behavior, render the
selected remains model in the Area viewport, change Placeable appearance, or
certify Toolset/NWN Save/Build/reopen behavior.

Primary decompilation authority is
`C:/Projects/New Folder/export/decompiled_all.c`, SHA-256
`36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572`.
The corresponding Toolset binary
`C:/Program Files (x86)/Steam/steamapps/common/Neverwinter Nights/bin/win32/nwtoolset.exe`
has SHA-256
`4c156de898817518e8a97f5d989592894d3c8f48b71d27e2a8b89500cd230f24`.
The independently extracted retail
`nwn_base.key/bodybag.2da` has SHA-256
`63388b9bb80b41b7d45161c0d025b6483e9ee1cff7654d6c0391320d64d6cce6`,
is 502 bytes, and has seven physical rows. No xoreos or other GPL source was
inspected or used.

## Recovered native lineage

`FUN_0063bf04` initializes the situated Placeable byte at offset `0x19b` to
zero. `FUN_0063bf74` reads exact label `BodyBag` through the native Byte reader
`FUN_00aeed68`, with default zero, into that same offset. The symmetric writer
`FUN_0063c0a8` writes the byte under exact label `BodyBag` through
`FUN_00aefd1c`. Copy and equality functions also retain and compare this exact
byte, so absence/default, storage, serialization, and object identity all
converge on one native Byte field.

The Placeable property-dialog initializer `FUN_00690c5c` opens `bodybag.2da`,
iterates table ordinals `1..rowCount-1`, reads column `Name`, resolves that
StrRef for display, and stores the loop ordinal as the combo-box item value.
It then handles physical row zero explicitly, reading the same `Name` column
and inserting it as value zero. Binary string recovery confirms the exact
tokens `bodybag` and `Name` at virtual addresses `0x00c67fe8`, `0x00c67ff0`,
and `0x00c67ff5`.

`FUN_0068ead4` maps the native byte at Placeable offset `0x19b` back through
the combo item-data lookup when the dialog opens, falling back to row zero only
when no item matches. `FUN_0068f234` reads the selected combo item data and
writes it back to offset `0x19b`. `FUN_006909f0` performs the same direct
native-byte selection when the selected Placeable changes. This closes the
identity: `BodyBag` is the physical `bodybag.2da` row ordinal selected by the
Toolset, not a string enum.

## Retail and current effective-table evidence

The installed retail table is `2DA V2.0` with columns `LABEL`, `Name`, and
`Appearance`. Its complete physical sequence is:

| Row | LABEL | Name StrRef | English retail display | Appearance token |
|---:|---|---:|---|---|
| 0 | default | 6671 | Default | `****` |
| 1 | Potion | 66483 | Potion | `194` |
| 2 | Scroll | 66484 | Scroll | `195` |
| 3 | Treasure | 66490 | Treasure | `196` |
| 4 | Body | 66492 | Body | `198` |
| 5 | Bones | 66493 | Bones | `199` |
| 6 | Pouch | 66494 | Pouch | `200` |

The configured `lc_models` HAK profile and the current unpacked module contain
no `bodybag.2da`, so the current effective source falls back to the retail
`nwn_base.key` resource above. This environment observation is not hard-coded:
module or ordered-HAK winners must replace retail as one complete effective
resource under the ordinary resource-precedence contract.

The existing frontend list `Default`, `None`, `Container`, `Random` is not the
retail physical table and cannot safely author `BodyBag`. It must not be
extended by guesses; exact catalog rows replace it for admitted existing
Placeables.

## Effective-table rule

Every editable source and target is bound to one immutable descriptor:

```text
resourceName = bodybag.2da
sourceObjectKey
sourceLayer = module | hak | vanilla
sha256
sizeBytes
rowCount
```

No weaker table is row-merged into the winner. A supported selector table is
exactly `2DA V2.0`, has exactly one `Name` column, contains 1..256 physical
rows, and supplies a decimal unsigned 32-bit StrRef in every row. `LABEL` is a
bounded display fallback only. The `Appearance` column is retained as source
evidence but is not made a mutation field by this slice; runtime destruction
and remains-model rendering require separate NWN proof. Missing, malformed,
over-budget, duplicate-authority, or stale table data keeps Treasure Model
preserve-only.

## Frozen cross-boundary contract

Area detail carries one bounded digest-bound `placeableBodyBagCatalog` for the
whole Area, not one copy per Placeable. It contains the exact descriptor and
all ordered physical rows. Each row has exact `rowIndex`, `displayName`,
`displaySource`, and `nameStrRef`, with optional bounded `label`. Display is
resolved from the active talk table and falls back to `label`, then `Row N`;
display text never becomes native identity.

One retained exact `aurora_git` Placeable exposes optional immutable
`placeableBodyBag` provenance only when exactly one canonical `BodyBag : Byte`
is present and its value identifies a retained physical row. The frontend
materializes the explicit numeric target
`placeableProperties.advancedSettings.treasureModelRow`. The older guessed
string `treasureModel` is not authoritative and cannot project this mutation.

The optional changed pair is exactly:

```json
{
  "bodyBag": {
    "expectedValue": 0,
    "value": 3,
    "tableSha256": "<64 lowercase hex>",
    "tableRowCount": 7
  }
}
```

Projection admits only a changed pair bound to exact family/ordinal
provenance. Planning reparses the native GIT byte and rejects absent,
duplicate, wrong-case, wrong-type, stale, unchanged, invalid-row,
cross-family, reordered, unknown-key, and deletion-colliding states.
Compilation re-resolves the effective descriptor and requested row and rejects
digest, row-count, or row-availability drift.

The pair writer changes only the existing `BodyBag : Byte`, preserves every
other GIT field and every GIC byte, and requires exact whole-struct and receipt
readback. Existing Area draft versioning, authorization, optimistic locking,
idempotency, atomic publication, recovery, and request budgets remain
unchanged. The Area-level catalog is capped at 256 rows and carries no binary
content, so it adds no endpoint, pagination, streaming, or chunking.

## Tests, diagnostics, and completion boundary

TDD must cover strict table parsing, descriptor hashing, precedence, the
bounded Area-detail and HTTP contract, exact parser provenance, projector,
planner, compiler, writer and parse-write-parse behavior, all seven retail
rows, stale table rejection, frontend mapping/materialization, disabled
unsupported profiles, Apply/OK/Cancel, clone/snapshot/undo, complete GIT/GIC
readback, builds, and regression smoke. Mutation testing remains optional and
requires explicit current-task user opt-in.

Fail-closed diagnostics must identify the Placeable object ID, immutable
family ordinal, native field, expected/actual digest, expected/actual row
count, and requested physical row. Raw paths and high-cardinality values must
not be metric labels.

Offline implementation does not replace a fresh exact-candidate Toolset
Save/Build/reopen, packed readback, or NWN certification. Those remain a
separate completion gate, as does runtime proof of the selected destroyed
Placeable/remains model.

## Offline implementation checkpoint

The 2026-08-19 implementation covers the complete bounded route:

- one precedence-correct effective `bodybag.2da` resolver with retail
  KEY/BIF fallback and exact table hashing;
- exact presence-sensitive GIT `BodyBag : Byte` parsing and immutable Area
  catalog/provenance transport;
- projector, native reparse planner, effective-table compiler revalidation,
  exact pair writer, whole-document readback, and GIC byte preservation;
- strict frontend HTTP/domain validation, numeric `treasureModelRow` scene
  target, digest-bound physical-row selector, Apply admission, defensive
  normalization, and clone/history preservation.

The final focused backend gate is 11 suites and 1,711/1,711 tests. The focused
frontend gate is 7 files and 164/164 tests; the complete frontend unit gate is
260 files and 2,766/2,766 tests. Backend and frontend production builds pass.
Mutation testing was not run because the active project rule requires explicit
current-task user opt-in.

A local browser pass on `_winds_study` confirmed that an older already-running
backend omits the new catalog and the freshly built frontend therefore keeps
Treasure Model disabled, as required by the fail-closed contract. The dialog
fit the 1280x720 viewport without horizontal overflow. The environment blocked
programmatic replacement of that backend process, so this pass does not claim
the admitted live selector. A normal backend restart plus fresh Area reopen is
still required before browser evidence, and exact-candidate Toolset/NWN proof
remains open as stated above.

The 2026-08-26 closure adds strict saved-workspace validation, an independent
atomic-publication integration, and a complete dialog regression. The
workspace rejects malformed or missing catalogs, wrong family or missing
ordinal, stale digest/count, absent or unknown numeric targets, and an
unproven retained target. The transaction changes only canonical
`BodyBag : Byte`, performs complete readback, and preserves paired GIC and IFO
bytes. The UI regression proves exact physical-row selection through Apply
followed by OK, a separate Cancel, another OK, reopen, and local Save while
immutable expected-value provenance remains unchanged.

The accepted current focused gate is nine backend unit suites with
`1833/1833` assertions, the Area Update integration suite with `36/36`
assertions, and eight frontend unit/regression suites with `411/411`
assertions. Backend and frontend production builds pass; the frontend retains
only its existing large-chunk advisory. Capability catalog revision
`2026-08-26.58` records the exact coverage and remaining live-proof blockers.
Mutation testing remains optional and was not run.

No Docker engine, container, managed service, watcher, browser, capture,
Toolset, NWN, or mutation-test process was started for this closure. The older
stale-backend browser observation above remains diagnostic context, not proof.
