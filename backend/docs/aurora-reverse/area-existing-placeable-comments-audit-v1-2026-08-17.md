# Existing Area Placeable editor-comments audit v1

Date: 2026-08-17  
Status: source-closed implementation contract; runtime recertification pending

## Scope and authority

This audit covers only the editor `Comments` text attached to one retained
type-`9` Area Placeable. The value is stored in the ordinal-paired GIC
`Placeable List` entry, not in the gameplay GIT Placeable struct. It does not
admit changing the localized gameplay `Description`, variables, scripts, or
any runtime-visible behavior.

Primary decompilation authority is
`C:/Projects/New Folder/export/decompiled_all.c`, SHA-256
`36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572`.
The corresponding Toolset binary SHA-256 is
`4c156de898817518e8a97f5d989592894d3c8f48b71d27e2a8b89500cd230f24`.
No xoreos or other GPL source was inspected or used.

## Recovered native pair lineage

The placed-Placeable reader `FUN_0063d0d8` first reads the type-`9` GIT entry
and, when the paired GIC entry is present, reads exactly one `Comment`
`CExoString` into the editor-only object member at offset `0x98`. The symmetric
writer `FUN_0063d3d8` writes that member as `Comment` to the paired GIC entry.
The GIT member writer `FUN_0063c0a8` does not write this value.

The immutable `plc_watertrough` construction evidence binds the type-`9` GIT
and GIC entries by family ordinal and contains exactly
`Comment : CExoString = "Water Trough"` in GIC. This closes the pair identity,
native type, field name, and preservation boundary.

## Recovered Toolset surface

Read-only PE resource inspection did not start a Toolset process. The
`TFRASITUATEDCOMMENTS` RCDATA form is 282 bytes at RVA `0x00BD6348`, SHA-256
`87edb506aea1092cffd3633ef326c6b77e7a90ad1e834bd5a074bd5e2250c600`.
It contains one client-aligned `TMemo mComments` and no explicit native
`MaxLength` property. Consequently this audit makes no claim about the maximum
Toolset or `CExoString` capacity.

## Frozen cross-boundary contract

Area detail must pair GIT and GIC `Placeable List` entries by exact ordinal and
expose a present exact string as `placeableMetadata.editorComment`. Empty
string is valid provenance and remains distinct from an absent field. The
frontend retains it as immutable `source.placeableEditorComment` and maps it
to `placeableProperties.comments`.

The admitted product value is a string of `0..4096` ECMAScript code units with
no NUL (`U+0000`). It is not trimmed, normalized, case-folded, or silently
truncated. The 4096-unit boundary is an explicit Area Update v1 payload and UI
budget, not an inferred native storage limit.

The existing Placeable property mutation gains one optional complete pair:

```json
{
  "kind": "placeable",
  "sourceObjectId": "plc:0:plc_watertrough:...",
  "editorComment": {
    "expectedValue": "Water Trough",
    "value": "Water trough beside the west wall."
  }
}
```

Only a changed complete pair is emitted. The backend resolves the immutable
Placeable ordinal, requires exactly one ordinal-paired GIC Placeable struct,
verifies exactly one native `Comment` `CExoString` and the expected value,
changes only that field, and preserves every GIT byte and the rest of the GIC
document. Exact whole-document and paired-struct candidate readback is
mandatory.

Missing, partial, non-string, over-budget, NUL-containing, duplicate,
wrong-type, stale, unchanged, unpaired, cross-family, deletion-colliding, or
readback-drifting mutations fail closed. Pair count/type/order drift also
fails closed; a missing comment is not materialized in v1.

## Completion boundary

Offline completion requires paired parser/repository provenance, frontend UI
and Apply guards, projector/planner/writer negative and combined round-trip
tests, compiler receipt coverage, Area Update integration, regression smoke,
and production builds. Mutation testing is optional, requires explicit user
opt-in, and is not an offline completion or pre-merge gate. Fresh Toolset
Save/Build/reopen remains mandatory. The editor comment has no NWN runtime
behavior claim.

## Aurora Web closure checkpoint — 2026-08-27

The source-closed editor-comment lane is implemented and verified offline.
The persisted workspace boundary now admits a proven Comment only for an exact
retained `aurora_git` Placeable family and zero-based native ordinal. It
requires both the immutable source value and explicit
`placeableProperties.comments` target to satisfy the exact `0..4096`
code-unit, no-NUL contract. Presentation-only comments remain loadable when
native provenance is absent, but cannot become writable provenance.

The Area Update integration changes only the existing ordinal-paired GIC
`Comment : CExoString`, verifies the published candidate and receipt, and
proves GIT and IFO byte identity. The regression covers an exact empty source,
multiline and decomposed-Unicode target text without normalization, Apply,
OK, a separate Cancel, another OK, reopen, and local Save while immutable
source provenance remains empty.

The accepted bounded gates are seven backend unit suites with `1801/1801`
assertions, the Area Update integration suite with `44/44` assertions, six
frontend unit/regression files with `497/497` assertions, and passing backend
and frontend production builds. Capability catalog revision
`2026-08-27.65` binds this audit. No Docker engine, container, managed
service, watcher, browser, capture, Chrome, Toolset, NWN, or mutation-test
process was started for this checkpoint. Fresh browser readback and exact-
candidate Toolset Save/Build/reopen remain open; no NWN behavior claim is
introduced.
