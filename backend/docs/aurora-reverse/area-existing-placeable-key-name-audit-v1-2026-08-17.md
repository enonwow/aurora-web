# Existing Placeable `KeyName` audit v1 — 2026-08-17

## Status and scope

This audit admits bounded storage mutation for the exact native `KeyName`
field on a retained `aurora_git` Placeable. The frontend labels this value
`Key Tag`. It does not admit key inventory consumption, key lookup semantics,
lock/unlock event dispatch, script execution, door lock properties, or any
other situated-object property.

Status: primary Aurora storage lineage, exact native field identity/type, the
Toolset control and input limit, one immutable retail profile, the additive
cross-boundary contract, production mutation, and offline automated
verification are verified. Fresh exact-candidate native proof remains open.

## Primary authority and GPL boundary

The behavioral authority is
`C:/Projects/New Folder/export/decompiled_all.c`, SHA-256
`36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572`.
No xoreos code, structure, or runtime conclusion is used.

The common situated-object reader `FUN_0063ae68` reads `KeyName` through the
native `CExoString` reader at decompiled line 329727. The matching common
writer `FUN_0063b8a0` writes the same member through the native string writer
at line 329888. The placed Placeable instance reaches that common lineage
through `FUN_0063d0d8` / `FUN_0063d3d8`.

## Toolset and retail evidence

The inspected Toolset binary is
`C:/Program Files (x86)/Steam/steamapps/common/Neverwinter Nights/bin/win32/nwtoolset.exe`,
12,201,984 bytes, SHA-256
`4c156de898817518e8a97f5d989592894d3c8f48b71d27e2a8b89500cd230f24`.
Read-only PE resource inspection did not start a Toolset process. The
`TFRASITUATEDLOCK` RCDATA form at RVA `0x00BD66FC` is 1,739 bytes and contains
`TEdit eKeyName`, label `Key Tag`, and the binary property sequence
`MaxLength 02 20`, which decodes to the integer limit `0x20` (`32`). The
derived resource report is 495,547 bytes with SHA-256
`3d9c5d29709bcf4aa037554781d229a2094f3d85370c44a6a5df9a222f8d87fa`.

The immutable base-game `plc_watertrough.UTP` profile has SHA-256
`a1b00834837b3c516d823f63e00054b2331044bdbccca1d49f1bc121f854c531`
and contains exactly one `KeyName` `CExoString` with the explicit empty value.
An empty string is therefore valid provenance and must not be confused with an
absent field.

## Frozen value and mutation contract

Area detail exposes a present exact source value as
`placeableMetadata.keyName`. The frontend retains it under
`source.placeableLockSettings.keyTag` and edits
`placeableProperties.lockSettings.keyTag`.

The admitted application value is a string with ECMAScript length `0..32` and
no NUL (`U+0000`). Values are not trimmed, case-folded, normalized, or silently
truncated. This is a deterministic product admission boundary based on the
verified Toolset control limit; it is not a claim that the native
`CExoString` storage type itself has a 32-byte maximum.

The existing Placeable property mutation gains one optional complete pair:

```json
{
  "kind": "placeable",
  "sourceObjectId": "plc:0:plc_watertrough:...",
  "keyName": { "expectedValue": "", "value": "CHEST_KEY_01" }
}
```

Only a changed pair is emitted. It may combine with the already admitted
Placeable property, script, trap-script, and lock-byte members. The backend
resolves one immutable Placeable ordinal, verifies exact parsed provenance and
one native `KeyName` `CExoString`, writes only that field, preserves every
other GIT field and every GIC byte, and independently verifies the complete
candidate struct.

## Fail-closed and completion boundary

Missing, partial, non-string, over-limit, NUL-containing, stale, or unchanged
values fail closed. Missing, duplicate, or wrongly typed native fields,
unsupported families, duplicate object mutations, deletion collisions, or
readback drift also fail closed with bounded object/field diagnostics.

Offline completion requires parser/mapper presence tests, frontend UI and
Apply guards, projector/planner/writer negative and combined round-trip tests,
Area Update integration, production builds, and focused mutation tests with no
survivors or uncovered mutants. Fresh exact-candidate Toolset
Save/Build/reopen remains mandatory. No NWN key or lock behavior claim is made
by this storage contract.

## Implementation and verification result

The implementation is presence-sensitive from GFF parsing through frontend
provenance and back to exact candidate readback. `KeyName` uses an exact
`CExoString` parser path so an empty value remains distinct from an absent
field and leading/trailing spaces are not normalized. The frontend maps the
value to `keyTag`, caps the Toolset-compatible input at 32 ECMAScript code
units, and restores unproven values at Apply time. The backend projects one
changed pair, resolves one immutable ordinal, validates exact source
provenance, rewrites one native field, preserves GIC bytes, and compares the
complete candidate struct.

Offline verification completed on 2026-08-17:

- backend focused verification: 5/5 suites, 826/826 tests;
- frontend focused verification: 4/4 files, 51/51 tests;
- Area Update atomic integration: 1/1 suite, 20/20 tests;
- backend and frontend production builds passed; frontend emitted the existing
  chunk-size warning;
- backend mutation: 259/259 active mutants killed, zero survived, timed out,
  or uncovered, report SHA-256
  `24b14acd635d910395d5ccd24173ea52acc3933eac30ddbd74fac811523923b0`;
- frontend mutation: 54/54 active mutants killed, zero survived, timed out, or
  uncovered, report SHA-256
  `a34e2b261f7758ae3cff3c3f249d3f8c51c3866ff05df00e1d131d06ca988ad9`.

The repository-wide gates remain truthfully red and are not used to certify
this bounded slice. Backend reported 219/220 suites and 3025/3026 tests; its
single failure is the separate new-Area cold-reopen profile gate, which lists
37 missing required ARE fields. Frontend reported 208/224 files and 2138/2249
tests. Those global failures remain program work. No Toolset process, module,
or NWN runtime was used for this offline checkpoint.
