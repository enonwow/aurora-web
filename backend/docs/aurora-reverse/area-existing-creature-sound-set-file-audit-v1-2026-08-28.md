# Existing Area Creature `SoundSetFile` audit v1

Date: 2026-08-28  
Status: offline source-closed, implemented, and bounded-backend verified; live
release proof pending

## Decision

Aurora Web may expose the exact existing `SoundSetFile : Word` of one retained
type-`4` Area GIT Creature as a catalog-bound compare-and-swap mutation. The
persistence identity is a lossless physical row ordinal of the one effective
`soundset.2da`. Localized text, `LABEL`, `RESREF`, `GENDER`, `TYPE`, current
frontend labels, and response order are not persistence authority.

Missing exact storage remains distinct from the native reader default `0` and
does not authorize field creation. Physical row `0` is a valid selector value.
Sparse invalid rows are omitted without renumbering later physical rows.

## Immutable primary authority

| Source | SHA-256 |
| --- | --- |
| `C:/Projects/New Folder/export/decompiled_all.c` | `36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572` |
| `C:/Projects/New Folder/export/functions.tsv` | `394096fe106e5767ee6eceb31c8b085091359060351b1d10195e96f666bc69fe` |
| installed retail `nwtoolset.exe` | `4c156de898817518e8a97f5d989592894d3c8f48b71d27e2a8b89500cd230f24` |
| frozen Toolset RCDATA report | `3d9c5d29709bcf4aa037554781d229a2094f3d85370c44a6a5df9a222f8d87fa` |
| retail `TDLGCREATUREEDIT` RCDATA payload | `75e2dcfd5b0886dbb13bfb7cb32290ccce842cada84cfb806510abde52e7820e` |
| retail `soundset.2da` from `nwn_base.key` | `6198cd79095f19b6cc39b60f7af009394806ee95c6a02d74053690fcb157c3e1` |

The retail table is a 336,678-byte `2DA V2.0` resource with 5,100 physical
rows and exact header `LABEL RESREF STRREF GENDER TYPE`. `nwn_retail.key` does
not contain a second `soundset` resource. No xoreos or other GPL source was
inspected or used.

## Native GFF closure

The common Creature reader `FUN_00532174` reads exact case-sensitive
`SoundSetFile` through `FUN_00aeedc4` at decompiled line `194480`. That helper
is the native type-id-`2` Word reader. It uses default `0` when the field is
absent and stores the result at Creature offset `+0xBC`.

The reciprocal common writer `FUN_0053521c` writes the same offset and label
through `FUN_00aefd88` at line `195166`. That helper emits type-id `2` and the
complete unsigned 16-bit value. The placed type-`4` Creature path uses these
common routines; paired GIC does not own this field.

## Toolset selector closure

The shared Toolset voice-set list loader `FUN_0073f6d4` iterates every
physical row in the current global `soundset.2da`. It reads `STRREF` first. A
positive StringRef is localized for display and still requires a readable
`RESREF`; a missing/non-positive StringRef instead requires both a readable
`LABEL` and `RESREF` and uses the label as display text. It also retains the
row's `GENDER` and `TYPE` metadata. The original physical loop index is stored
as item data; invalid rows are omitted, never compressed into new identities.

With an empty filter, `FUN_00740aac` admits every successfully materialized
row. Creature dialog load `FUN_0044b110` calls `FUN_00740c60` with the exact
Word at offset `+0xBC`, searches item data, and displays the matching row text
at form control offset `+0x7D4` (decompiled lines `70188-70215`). Dialog save
`FUN_0044d360` rebuilds the same list, maps the displayed text back through
`FUN_00740aec`, and stores the returned physical row ordinal at Creature
offset `+0xBC` as Word (lines `71283-71331`).

The native text round-trip may choose the first of duplicate display strings.
Aurora Web must not copy that ambiguity. Its selector carries the physical row
ordinal directly and requires the target row to be independently admitted by
the current exact table.

The inspected retail row `0` is valid (`Aasimar`, `c_aasimar`, StringRef
`8291`, Gender `0`, Type `4`). Physical row `3` has `RESREF=****` and
`STRREF=****` and is omitted; later rows retain their original ordinals. This
proves both valid zero and sparse-row behavior.

## Frozen implementation contract

Area detail preserves exact storage:

```ts
type CreatureSoundSetFileStorage =
  | { present: false }
  | {
      present: true;
      nativeType: "word";
      value: number;
      table?: {
        resourceName: "soundset.2da";
        sourceObjectKey: string;
        sourceLayer: "module" | "hak" | "vanilla";
        sha256: string;
        sizeBytes: number;
        rowCount: number;
        rowIndex: number;
        resRef: string;
      };
    };
```

Only an exact stored Word whose physical row has a usable `RESREF` and either
a positive `STRREF` or usable `LABEL` receives a table binding. Physical row
identity is restricted to `0..65535`, the lossless Word domain. Missing,
duplicate, aliased, wrong-case, wrong-type, out-of-range, unavailable-table,
or unadmitted-row state is preserved but not editable.

Effective resolution is complete-resource first hit in module, ordered HAK,
then vanilla order. Rows are never merged. A stronger present but malformed
resource blocks weaker fallback. Resource input is bounded to 64 MiB and at
most 1,000,000 physical rows.

The authenticated additive catalog endpoint is
`GET /api/v1/catalog/creatures/sound-sets`. It is digest-bound, paginated, and
supports either bounded text search or one exact admitted physical row. The
frontend target is numeric
`creatureProperties.advancedSettings.soundSetFile`; `soundSet` text remains
derived presentation. A changed target projects:

```json
{
  "kind": "creature",
  "sourceIndex": 0,
  "soundSetFile": {
    "expectedValue": 21,
    "value": 42,
    "tableSha256": "<exact soundset.2da sha256>",
    "rowCount": 5100
  }
}
```

Projection, planning, compilation, writing, and complete-candidate readback
must fail closed independently. Planning reparses one exact canonical Word;
compilation freshly resolves the strongest complete table and revalidates its
descriptor plus target row; writing replaces only the existing Word while
preserving every sibling GIT field and byte-identical GIC, ARE, and IFO.

## Bounded backend verification closure

The exact domain/table/admission, projection, immutable-ordinal planning,
Word-only writing/readback, and compiler-routing cases now pass through the
repository `test:unit:bounded` runner as part of the combined `117/117`
Creature catalog-property gate. The runner retained one worker, transpile-only
isolated modules, and the 1 GiB heap ceiling. Capability revision
`2026-08-28.94` removes the backend SoundSetFile Jest blocker; browser,
Toolset, and NWN proof remain independent release gates.

## Explicit exclusions and completion boundary

This slice does not author soundset audio resources, voice playback behavior,
`soundsettype.2da`, localized text, Gender/Type filtering, arbitrary Creature
template creation, or missing-field creation/removal. The existing enrichment
metadata derived from loosely parsed catalog rows remains presentation-only
and cannot authorize a write.

Fresh guarded browser Apply/Save/reopen, exact-candidate Toolset
Save/Build/reopen with packed `SoundSetFile:Word` readback, and NWN voice
playback remain release gates. No live proof is claimed.

## Resource/process statement

This audit used read-only decompilation and one bounded read-only KEY/BIF table
parse through the repository's existing reader. The installed Toolset and NWN
were not started. No Docker command, container, service, watcher, browser,
capture, mutation test, xoreos source, or other GPL source was used.
