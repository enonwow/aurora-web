# Existing Area Creature `PortraitId` audit v1

Date: 2026-08-28  
Status: source-closed; offline implementation and verification complete; live proof pending

## Decision

Aurora Web may expose the exact existing `PortraitId : Word` field of one
retained type-`4` Area GIT Creature as a catalog-bound compare-and-swap
mutation. The persisted value is the physical row ordinal of the one effective
`portraits.2da`. `BaseResRef` is derived presentation and asset identity; it is
not an independently writable Area field.

The legacy `Portrait : ResRef` is a native read fallback only when canonical
`PortraitId` is absent. It does not authorize mutation. The writer always emits
canonical `PortraitId : Word` and never emits or rewrites the legacy field.

The Toolset selector admits only rows whose `Plot` value is zero and whose
`Race` and effective `Sex` match the retained Creature context. Race row `4`
admits portrait rows with Race `6` or `1`. For every Creature Race above `6`,
the Toolset replaces the Sex filter with physical Sex row `4`; otherwise it
uses the retained `Gender` byte. This last rule is mandatory and must not be
approximated as `Sex == Gender` for all races.

The v1 mutation is bound to the unchanged retained `Gender` and `Race` bytes.
A simultaneous Gender and Portrait mutation is rejected. Race mutation is not
currently admitted by the Area Creature mutation surface, so any later Race
authoring slice must define an equivalent conflict rule before it can compose
with this one.

## Immutable primary authority

The admitted read-only sources are:

- `C:/Projects/New Folder/export/decompiled_all.c`, 30,366,020 bytes,
  SHA-256 `36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572`;
- `C:/Projects/New Folder/export/functions.tsv`, SHA-256
  `394096fe106e5767ee6eceb31c8b085091359060351b1d10195e96f666bc69fe`;
- `C:/Projects/New Folder/export/strings.tsv`, SHA-256
  `864ae0139451d5333307cb2bbcce725bbd2d2c6056ac2d5f80f9b5ea50f190f`;
- retail
  `C:/Program Files (x86)/Steam/steamapps/common/Neverwinter Nights/bin/win32/nwtoolset.exe`,
  SHA-256 `4c156de898817518e8a97f5d989592894d3c8f48b71d27e2a8b89500cd230f24`;
- `C:/Projects/nwn-last-city/Aurora/reverse/runs/NWTOOLSET_RCDATA_REFRESH_2026-05-20.json`,
  SHA-256 `3d9c5d29709bcf4aa037554781d229a2094f3d85370c44a6a5df9a222f8d87fa`;
- retail `portraits.2da`, extracted read-only through the repository KEY/BIF
  reader from `nwn_base.key`, 944,115 bytes, 16,001 physical rows, SHA-256
  `b70e643efc226571e9502173781bcecb76de21ecdada0c7641479ee5dc467602`.

The installed Toolset binary fingerprint was re-read for this audit because an
older Placeable portrait document contained a conflicting value. The hash
above is the actual current binary hash and agrees with the newer Creature
audits. No Toolset or NWN process was started.

No xoreos or other GPL source was inspected or used. No Docker command,
container, service, watcher, browser, capture, or mutation test was started for
this source closure.

## Native GFF storage closure

The common Creature reader `FUN_00532174`, beginning at
`decompiled_all.c:193907`, reads exact label `PortraitId` through
`FUN_00aeedc4` at lines `194255-194256` and stores the result at common
Creature offset `+0x74`. The presence result is tested at line `194257`.

When canonical `PortraitId` is absent, and only then, lines `194260-194266`
read legacy `Portrait : ResRef` and map it through `FUN_00515514` to the same
in-memory Word. Canonical presence does not enter that fallback. This is a
reader compatibility path, not a second writable representation.

`FUN_00aeedc4`, at lines `967917-967938`, accepts only native GFF type id `2`
and returns the low Word payload. The paired common writer `FUN_0053521c`,
beginning at line `195081`, writes the member at `+0x74` through
`FUN_00aefd88` under exact label `PortraitId` at line `195152`.
`FUN_00aefd88`, at lines `968723-968750`, creates or updates native type id `2`.
There is no legacy `Portrait` write in this path.

The placed-Creature reader `FUN_0053ab24` calls the common reader at line
`197530`; the placed-Creature writer `FUN_0053ae80` calls the common writer at
line `197590`. This closes the type-`4` Area GIT lineage. The paired GIC record
does not own the field and must remain byte-identical for a Portrait-only
mutation.

## Toolset selector closure

Creature properties load copies common Race offset `+0x6c` to dialog byte
`+0x2c0` at line `69520`, common Gender offset `+0x6e` to dialog byte `+0x2be`
at lines `69584-69585`, and canonical Portrait offset `+0x74` to dialog Word
`+0x2cf` at lines `69730-69744`.

Portrait button handler `FUN_0045fc02` constructs the shared Portrait dialog,
passes the retained physical Portrait row, Gender, and Race at lines
`80940-80943`, and accepts the returned physical row at lines `80944-80959`.

The Portrait dialog initialization `FUN_006c26f8` activates Sex and Race
filters when their passed values are not `-1` at lines `405845-405859`. If Race
is above `6`, it replaces the Sex filter value with `4` at lines
`405860-405862`. It then populates the selector through `FUN_006c08e4` at line
`405886`.

`FUN_006c08e4` iterates every physical `portraits.2da` row. A read-only PE
probe at virtual address `0x00c76dd0` recovered the adjacent exact ASCII column
sequence `Sex\0Race\0Plot\0BaseResRef\0`. The function reads those columns at
lines `404993-405123`, applies:

1. effective Sex equality and `Plot == 0` at lines `405131-405135`;
2. Race equality, except current Race `4` accepts row Race `6` or `1`, again
   requiring `Plot == 0`, at lines `405136-405146`;
3. the normal non-plot view at lines `405147-405154`;
4. exact `BaseResRef` presentation at lines `405155-405190`.

The accepted list item stores the physical source row `local_e0` as item data
at line `405250`. Filtering is therefore by physical row identity; sorting or
compacting the catalog would corrupt persistence.

The immutable RCDATA report identifies:

- `TDLGCREATUREEDIT`, 52,662-byte `TPF0` form at `0x00AE4698`, with the
  Creature-property `Appearance`, `gbPortrait`, `Portrait`, `pPortrait`,
  `imgPortrait`, `bPortrait`, and `ePortrait` controls;
- `TDLGCREATUREWIZARD`, 18,986-byte form at `0x00AF1450`, containing
  `pAppearancePortrait` and `Appearance and Portrait`;
- `TDLGPORTRAIT`, 2,451-byte form at `0x00B8E2D0`, containing `Select Portrait`.

Those form tokens establish the user-facing selector lineage but do not replace
the code evidence for admission or persistence.

## Effective-table and precedence contract

One complete effective `portraits.2da` is selected by module, ordered HAK, then
vanilla first-hit precedence. Weaker resources are never row-merged. The v1
parser requires `2DA V2.0`, exactly one `BaseResRef`, `Sex`, `Race`, and `Plot`
column, no parser errors, `1..65,536` physical rows, and at most 16 MiB.

Catalog rows retain exact physical `rowIndex`, lowercase ASCII
`baseResRef`, numeric byte `sex`, numeric byte `race`, and exact `plot: 0`.
`****`, missing numeric cells, and nonzero Plot rows are not selectable. An
invalid non-placeholder BaseResRef fails the table closed. Module or ordered
HAK replacement remains authoritative; the 16,001-row retail table is evidence,
not a hardcoded product catalog.

## Frozen additive FE-BE contract

Area detail optionally carries one shared immutable Creature portrait catalog
and exact source storage:

```ts
type CreaturePortraitStorage =
  | { present: false }
  | {
      present: true;
      nativeType: "word";
      value: number;
      selectorContext?: { genderValue: number; raceValue: number };
      table?: {
        resourceName: "portraits.2da";
        sourceObjectKey: string;
        sourceLayer: "module" | "hak" | "vanilla";
        sha256: string;
        sizeBytes: number;
        rowCount: number;
        rowIndex: number;
        baseResRef: string;
      };
    };
```

Only a canonical Word with exact selector context and an admitted row in the
same digest-bound table receives a table binding. Other valid source values are
preserved but remain `PRESERVE_ONLY`.

A changed existing-Creature mutation has exactly:

```json
{
  "expectedValue": 10,
  "value": 11,
  "tableSha256": "<exact effective portraits.2da sha256>",
  "rowCount": 16001,
  "genderExpectedValue": 0,
  "raceExpectedValue": 4
}
```

The target row must satisfy the native selector using the immutable expected
Gender and Race. The frontend changes numeric `portraitId` and derived
`portraitResRef` atomically. A changed display ResRef without its exact numeric
row, or a numeric row with a mismatched ResRef, is rejected.

This is an additive contract-v1 extension of Area detail and the existing Area
Update mutation. It adds no endpoint and no contract-major change. The catalog
is bounded by 65,536 rows and 16 MiB source input; v1 uses one bounded response,
with no pagination, streaming, or chunking. Any future budget increase or
streamed representation requires a separately versioned contract addendum.

## Write, transaction, and diagnostics contract

Planning reparses the exact retained Creature ordinal and verifies canonical
Word, Gender, Race, and expected value. Compilation independently re-resolves
the strongest current table, verifies digest and row count, re-applies the
native selector, rejects a simultaneous Gender mutation, and writes exactly
one changed `PortraitId : Word`.

The existing Area Update transaction remains authoritative: candidate ARE/GIT/
GIC/IFO state is compiled and fully read back before revision-fenced atomic
publication. A Portrait-only change must preserve ARE, IFO, every sibling GIT
field, the legacy `Portrait` field if present, and the paired GIC bytes. Retry,
authorization, optimistic-lock, idempotency, rollback, and recovery behavior do
not change.

Diagnostics may include bounded reason codes such as `invalid_pair`,
`missing_canonical_word`, `stale_source`, `stale_table`, `not_selectable`, and
`gender_conflict`. Logs and proof artifacts may bind Area ID, immutable object
ID, source ordinal, table digest, source layer, and validation stage. Paths,
resrefs, object IDs, ordinals, row numbers, hashes, and mutable values must not
be metric-label dimensions.

## Implementation and verification boundary

The current offline implementation covers parser presence, selector context,
effective-table resolution, immutable binding, frontend validation and
materialization, workspace preservation, projector/planner/compiler admission,
canonical one-field writing, readback, cache fingerprinting, and focused tests.
During this audit the backend and frontend selector implementations were
corrected to apply the previously omitted `Race > 6 -> effective Sex 4` rule.

Both production builds passed against this exact worktree with the repository
1 GiB Node limit. Focused backend verification passed 2,256 assertions across
the effective catalog/admission, parser, projector, planner, pair writer,
compiler, snapshot repositories, cache fingerprint, capability catalog, and
the complete 60-test Area Update integration suite. Focused frontend
verification passed 679 assertions across portrait selection/provenance,
properties dialog, scene cloning/mapping, HTTP mapping, local draft validation,
and the complete 17-test Creature-properties Workspace regression suite.

Browser rendering/readback, native Toolset Save/Build/reopen, packed candidate
readback, portrait visual comparison, and NWN runtime proof are still
`missing`. This slice is offline-complete but not live-certified, and the full
Area program remains incomplete until those separate resource-safe proof gates
and the other open capability lanes are closed under the proof-capture safety
contract. No Docker command, container, managed service, watcher, browser,
capture, live Toolset/NWN process, GPL source, or mutation test was used for
this verification.
