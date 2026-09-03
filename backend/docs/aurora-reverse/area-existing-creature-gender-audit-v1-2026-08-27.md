# Existing Area Creature `Gender` audit v1

Date: 2026-08-27  
Status: offline implemented and build-verified; browser and native release gates pending

## Decision

Aurora Web may expose the exact existing `Gender : Byte` field of one retained
type-`4` Area GIT Creature as a catalog-bound compare-and-swap mutation. The
stored byte is the physical row ordinal of the one effective `gender.2da`.
It is not an English enum, a localized label, the `GENDER` column token, or a
renderer-only hint.

The selector must therefore use the effective complete resource selected by
module, ordered-HAK, then vanilla first-hit precedence, preserve physical row
indices, resolve the `NAME` StringRef through the effective talk table for
presentation, and bind every write to the immutable table digest and row
count. Weaker tables are never row-merged into the winner. Missing, duplicate,
wrong-case, wrong-type, out-of-byte-range, unadmitted-row, stale-table, or
stale-source state is `PRESERVE_ONLY`.

The current frontend constant
`CREATURE_GENDER_OPTIONS = ["None", "Male", "Female", "Both"]` is not native
authority. It has the wrong order for the inspected retail table, omits
`Other`, and stores a display string rather than the native row identity. It
must not authorize Area persistence.

## Immutable primary authority

The admitted read-only sources are:

- `C:/Projects/New Folder/export/decompiled_all.c`, SHA-256
  `36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572`;
- `C:/Projects/New Folder/export/functions.tsv`, SHA-256
  `394096fe106e5767ee6eceb31c8b085091359060351b1d10195e96f666bc69fe`;
- retail
  `C:/Program Files (x86)/Steam/steamapps/common/Neverwinter Nights/bin/win32/nwtoolset.exe`,
  SHA-256
  `4c156de898817518e8a97f5d989592894d3c8f48b71d27e2a8b89500cd230f24`;
- `C:/Projects/nwn-last-city/Aurora/reverse/runs/NWTOOLSET_RCDATA_REFRESH_2026-05-20.json`,
  SHA-256
  `3d9c5d29709bcf4aa037554781d229a2094f3d85370c44a6a5df9a222f8d87fa`;
- retail `gender.2da` extracted through the repository KEY/BIF reader from
  `nwn_base.key`, 250 bytes, SHA-256
  `14643ac6f03cda0197d0ac7e4062718d30060cbf330608a0451fe4e59c5cdf04`;
- English retail `dialog.tlk`, SHA-256
  `1d6da70e0659e411012b44f956a093cc8fb61aed3b9355198ba42eb17e0649c9`;
- Polish retail `dialog.tlk`, SHA-256
  `57ad772de605f0f13aebe63c6491ca65d76cce206b139eaa018350a9a5aea764`.

Only immutable decompilation artifacts and read-only retail bytes were
inspected. The `aurora-toolset-operate` workflow was applied to keep the
installed Toolset binary read-only and avoid process/window interaction. No
Toolset or NWN process was controlled, no browser, service, watcher, capture,
Docker command, or mutation test was started, and no xoreos or other GPL source
was inspected or used.

## Native GFF storage closure

The common Creature reader `FUN_00532174`, beginning at
`decompiled_all.c:193907`, reads exact label `Gender` through
`FUN_00aeed68` at lines `194120-194121` and stores the returned byte at common
Creature offset `+0x6e`.

`FUN_00aeed68`, beginning at line `967892`, accepts only GFF native type id
`0` at lines `967902-967910` and returns the low byte of the field payload.
This is exact native `Byte` storage; missing or wrongly typed storage takes the
supplied default path and is not an editable source field.

The common Creature writer `FUN_0053521c`, beginning at line `195081`, writes
the byte at offset `+0x6e` under exact label `Gender` through `FUN_00aefd1c` at
line `195147`. `FUN_00aefd1c` calls the generic scalar writer with native type
id `0`, establishing the symmetric `Byte` write.

The placed-Creature reader `FUN_0053ab24` calls the common reader at line
`197530`; the placed-Creature writer `FUN_0053ae80` calls the common writer at
line `197590`. This closes the exact type-`4` Area GIT lineage. The paired GIC
record does not own this field and must remain byte-identical for a
Gender-only mutation.

## Toolset selector and table identity closure

The immutable `TDLGCREATUREEDIT` form contains the Basic-tab label `Gender`,
ComboBox `cbGenders`, and `cbGendersChange` event. Dialog load copies common
Creature offset `+0x6e` into cached byte `+0x2be` and selects that numeric index
in the ComboBox at decompiled lines `69584-69585`. Dialog save reads the
ComboBox index at `+0x3e0` and writes it back to Creature offset `+0x6e` at
lines `70761-70762`. The ComboBox position is therefore the persisted byte.

Creature editor initialization `FUN_0044fea4` calls `FUN_0045bc88` at lines
`71829-71836`. `FUN_0045bc88`, beginning at line `78507`, clears the Gender
ComboBox, takes global 2DA slot `DAT_00d3efcc + 0x20` (slot `8`), iterates all
physical rows in order, reads the column named by `DAT_00bb2270`, resolves the
result through TLK, appends each display string, and initializes item index
`0`.

The global table loader `FUN_0065a3c4` loads exact resource token `GENDER` into
slot `8` at decompiled lines `348110-348116`. A read-only PE virtual-address
probe of the installed `nwtoolset.exe` at `0x00bb225c` recovered the adjacent
ASCII column sequence `MODELTYPE\0...NAME\0PlayerRace...`, proving that
`DAT_00bb2270` names exact column `NAME`. The Toolset change path also queries
the current physical row's `GENDER` column through
`FUN_00af3568(DAT_00d3efcc[8], comboIndex, "GENDER", ...)`; that downstream
token affects native model behavior but is not the stored identity.

Consequently the selector contract is table-driven:

1. select one whole effective `gender.2da` by native resource precedence;
2. preserve each physical row ordinal as the Byte value;
3. require a valid positive `NAME` StringRef and a nonblank bounded `GENDER`
   token for an admitted web row;
4. resolve `NAME` through the effective talk table for display, using bounded
   `StringRef N` fallback when text is unavailable;
5. reject physical rows above `255`, because they cannot round-trip through
   the native Byte.

The inspected retail table is `2DA V2.0` with columns
`NAME GENDER GRAPHIC CONSTANT` and these physical rows:

| Byte | NAME StringRef | GENDER | CONSTANT | English display |
| ---: | ---: | :---: | --- | --- |
| 0 | 156 | M | `GENDER_MALE` | Male |
| 1 | 157 | F | `GENDER_FEMALE` | Female |
| 2 | 4771 | B | `GENDER_BOTH` | Both |
| 3 | 201 | O | `GENDER_OTHER` | Other |
| 4 | 202 | N | `GENDER_NONE` | None |

These rows describe the inspected retail resource only. A module or ordered
HAK may replace the complete table, so neither this order nor these English
labels may be hardcoded as current module authority.

## Frozen additive cross-boundary contract

Area detail may add exact presence-sensitive storage:

```ts
type CreatureGenderStorage =
  | { present: false }
  | {
      present: true;
      nativeType: "byte";
      value: number;
      table: {
        resourceName: "gender.2da";
        sourceObjectKey: string;
        sourceLayer: "module" | "hak" | "vanilla";
        sha256: string;
        sizeBytes: number;
        rowCount: number;
        rowIndex: number;
      };
    };
```

The frontend retains a detached immutable copy of the complete
presence-sensitive storage as `source.creatureGender`. Mutation provenance is
derived from that storage without weakening its native field or table binding:

```ts
{
  present: true;
  nativeType: "byte";
  value: number;
  table: {
    resourceName: "gender.2da";
    sourceObjectKey: string;
    sourceLayer: "module" | "hak" | "vanilla";
    sha256: string;
    sizeBytes: number;
    rowCount: number;
    rowIndex: number;
  };
}
```

The editable scene target is numeric `genderId`. A legacy display string may
remain temporarily for presentation compatibility, but it is never mutation
identity and never authorizes a write. Exact `aurora_git`,
`sourceKind=creature`, a non-negative immutable family ordinal, admitted
present storage, and a matching current catalog are all required for
`ACTIVE_NOW`; every other state is visibly `PRESERVE_ONLY`.

A changed target projects exactly:

```json
{
  "kind": "creature",
  "sourceObjectId": "creature:0:nw_chicken:...",
  "sourceIndex": 0,
  "gender": {
    "expectedValue": 4,
    "value": 0,
    "tableSha256": "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    "rowCount": 5
  }
}
```

The authenticated additive catalog endpoint is
`GET /api/v1/catalog/creatures/genders`. It accepts the exact effective-table
digest plus bounded paging and either a bounded text query or exact Byte-range
`rowIndex`; text and exact-row lookup are mutually exclusive. The response
contains only Toolset-admitted rows, physical row indices, bounded display
data, and the immutable descriptor. It never exposes table bytes, credentials,
host paths, or an unbounded payload.

## Writer, transaction, and diagnosability requirements

Projection, exact-ordinal planning, candidate compilation, writing, and
whole-candidate readback fail closed independently. Planning reparses exactly
one case-sensitive `Gender : Byte` on the retained Creature ordinal and
compares the complete expected value. Candidate compilation freshly resolves
the effective `gender.2da`, requires the same descriptor digest and row count,
and proves that the target physical row remains admitted.

The writer replaces only that existing byte, preserves all sibling GIT fields
and the paired GIC bytes, verifies the complete candidate, and uses the
existing revision-fenced, idempotent, journaled ARE/GIT/GIC/IFO atomic
publication. The mutation may coexist with independently admitted Creature
property members on the same ordinal, but never with deletion of that ordinal.

Missing, duplicate, aliased, wrong-case, wrong-type, out-of-range,
unadmitted-row, stale-table, stale-source, unchanged, deletion-colliding,
preservation-drifting, or readback-drifting state fails with
`422 AREA_UPDATE_OBJECT_MUTATION_INVALID`.

No binary payload, chunking, streaming, permission, authentication,
idempotency, fencing, journal, recovery, or transaction budget changes.
Routine diagnostics may expose only contract revision, Creature family,
bounded ordinal, approved field token, counts, stage, duration, and stable
result code. Labels, TLK text, selected values, object IDs, hashes, raw bytes,
source/storage keys, credentials, and host paths are prohibited metric labels.

## Offline implementation closure

The 2026-08-27 implementation now closes the bounded source-to-candidate and
source-to-dialog paths:

1. backend domain parsing admits only exact presence-sensitive `Gender : Byte`
   state and a matching physical `gender.2da` row;
2. the template catalog resolves one whole effective module, ordered-HAK, or
   vanilla table, exposes only Toolset-admitted rows, and never row-merges a
   weaker source;
3. Area snapshot mapping attaches the immutable table descriptor and native
   row to the retained type-`4` Creature;
4. draft projection, exact-ordinal planning, fresh candidate catalog
   admission, Byte-only paired writer, and whole-candidate validation are
   wired into the existing atomic Area Update compiler and transaction;
5. the authenticated Creature catalog endpoint and frontend HTTP port/facade
   validate digest, row count, paging, exact lookup, and bounded row data;
6. frontend Area mapping, immutable scene provenance, workspace validation,
   history cloning, dialog loading/search, reducer, materialization, and
   `ACTIVE_NOW`/`PRESERVE_ONLY` presentation use numeric physical row identity;
7. scene normalization explicitly preserves only integer `genderId` values in
   the native unsigned-Byte range and remains idempotent, so local Save/reopen
   cannot silently discard or admit a malformed mutation target;
8. the former hardcoded English four-value selector no longer authorizes the
   existing-Area mutation path.

Bounded verification completed on the same working tree, without Docker,
services, watchers, browsers, Toolset/NWN processes, or mutation testing:

- backend production build: passed;
- backend focused bounded Jest: 48 passed across domain, effective-table,
  catalog admission, and capability-catalog coverage;
- complete bounded Area Update atomic-publication integration file: 53 passed,
  including exact `Gender : Byte` `4 -> 0`, whole-candidate readback, changed
  GIT, and byte-identical GIC/IFO;
- frontend production build: passed;
- frontend focused Vitest: 445 passed across catalog facade/provenance, Area
  mapping/workspace validation, and the Creature Properties dialog; the full
  scene-normalization file passed 37/37; the full Creature-properties
  regression file passed 12/12, including Apply/OK/reopen/Ctrl+S with immutable
  source provenance.

The counts above describe the explicitly recorded commands for this slice;
they are not a claim that the repository-wide unit, integration, regression,
browser, Toolset, or NWN gates were rerun.

## Completion boundary

Offline closure requires test-first domain parsing and selector admission,
module/ordered-HAK/vanilla first-hit resolution, immutable descriptor and
bounded catalog transport, Area storage parsing and snapshot identity,
frontend HTTP validation/facade/provenance/scene mapping/clone/history/dialog
flows, projector, independent planner, fresh compiler revalidation,
Byte-only paired writer, whole-candidate readback, combined mutation, atomic
publication, capability-catalog, regression, and build coverage.

The Vitest Workspace regression is a deterministic jsdom application-flow
gate, not accepted browser proof. Fresh guarded Aurora Web browser Save/reopen
and renderer proof, exact-candidate
Toolset Save/Build/reopen with packed GFF readback, and NWN runtime inspection
remain independent release gates. This source closure alone does not complete
Creature authoring, Area CRUD, renderer/connectivity proof, or the 99-tileset
program.
