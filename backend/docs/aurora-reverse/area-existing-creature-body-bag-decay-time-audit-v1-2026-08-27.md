# Existing Area Creature BodyBag and DecayTime audit v1

Date: 2026-08-27  
Status: source-closed; offline implementation verified; live release proof pending

## Decision

Aurora Web may author the retained death-remains settings of one exact type-`4`
Area GIT Creature only through two independently presence-sensitive native
fields:

| Web target | Native field | Native type | Toolset presentation |
| --- | --- | --- | --- |
| `advancedSettings.treasureModelRow` | `BodyBag` | `Byte` | `Treasure Model` (`cbTreasurePile`) |
| `advancedSettings.corpseDecayTimeSeconds` | `DecayTime` | `DWord` | `Corpse Decay Time (s)` (`eDecayTime`/`udDecayTime`) |

`BodyBag` is not a boolean. It is the zero-based physical row ordinal selected
from the one effective `bodybag.2da`. The existing Creature `bodyBag` checkbox
is guessed presentation state and must not create or mutate native `BodyBag`.

The Toolset edits `DecayTime` as whole seconds in the inclusive range
`5..32767` and stores `seconds * 1000` as the native unsigned DWord. Aurora Web
therefore admits editing only when the retained DWord is an exact multiple of
`1000` whose quotient is within that range. A present noncanonical DWord is
retained without normalization and remains `PRESERVE_ONLY`; absence never
authorizes field creation.

The already source-closed `Lootable : Byte` controls whether the two Toolset
controls are enabled. Aurora Web mirrors that interaction: the Treasure Model
and decay controls are editable only when their own provenance is valid and
the current proven `leavesLootableCorpse` draft value is `true`. Changing
`Lootable` does not itself synthesize, clear, clamp, or rewrite either field.

## Immutable primary authority

The admitted read-only reverse inputs are:

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
- the independently extracted retail `nwn_base.key/bodybag.2da`, SHA-256
  `63388b9bb80b41b7d45161c0d025b6483e9ee1cff7654d6c0391320d64d6cce6`,
  size `502` bytes, seven physical rows.

No xoreos or other GPL source was consulted or used. No Toolset, NWN, Docker,
service, watcher, browser, Chrome, capture, or mutation-test process was
started for this audit.

## Native storage closure

The common Creature reader `FUN_00532174` starts at
`decompiled_all.c:193907`. It reads `BodyBag` through the native Byte reader
`FUN_00aeed68`, defaulting the in-memory record byte to zero, at lines
`194492-194493` and offset `+0xC2`. It then reads `DecayTime` through
`FUN_00aeee7c`, defaulting the in-memory record DWord to zero, at lines
`194494-194495` and offset `+0xC4`.

`FUN_00aeee7c` at lines `967969-967990` accepts only native GFF field type ID
`4` and returns the raw 32-bit payload. The symmetric common writer
`FUN_0053521c`, starting at line `195081`, writes exact `BodyBag` through the
Byte writer `FUN_00aefd1c` at line `195172`, and exact `DecayTime` through
`FUN_00aefe60` at line `195174`. `FUN_00aefe60` at lines `968787-968815`
creates or addresses field type ID `4` and stores the unchanged 32-bit value.

The established placed-Creature lineage
`FUN_0053ab24 -> FUN_00532174` and
`FUN_0053ae80 -> FUN_0053521c` carries the common record through the type-`4`
Area GIT list. Reader defaults describe native in-memory behavior only. The web
contract distinguishes an absent field from an exact present field and never
uses a default to authorize synthesis.

## Toolset selector and unit closure

The Creature properties class is `TdlgCreatureEdit`, VMT `0x00BBBEE4`, with
the 378-entry published field table at `0x00BBC054`. The RCDATA/control map
binds `lTreasurePile`, `cbTreasurePile`, `lDecayTime`, `eDecayTime`,
`eDecayTimeExit`, `udDecayTime`, `xbLootable`, and `xbLootableClick`. Its
labels resolve to `Treasure Model`, `Corpse Decay Time (s)`, and
`Leaves Lootable Corpse`.

The Creature combo initializer `FUN_0046fd38` starts at line `89139`. It opens
the exact `bodybag` table, iterates physical rows `1..rowCount-1`, reads the
`Name` column, resolves display text, and inserts each item with its physical
ordinal as item data at lines `89177-89237`. It then inserts physical row zero
explicitly at lines `89238-89289`. This is the same effective-table identity
already source-closed for retained Placeable `BodyBag`; no second catalog or
row-merging rule is required.

The dialog load function `FUN_0044b110` maps the retained byte at `+0xC2`
through the combo item-data lookup at lines `69764-69767`. It displays the
unsigned DWord at `+0xC4` as integer `value / 1000` seconds at line `69768`.
The save function `FUN_0044d360` stores the selected combo item data back to
`+0xC2` at lines `70871-70874`, reads the whole-second control, and stores
`seconds * 1000` at lines `70877-70878`.

The numeric control is initialized to `5`, given lower bound `5`, and upper
bound `0x7FFF` at lines `67697`, `67718`, and `67739`. The recovered
`FUN_0091d260`/`FUN_0091d2a0` control helpers set the lower/upper range and
`FUN_0091d33c` sets the current value. The exact Toolset authoring domain is
therefore whole seconds `5..32767`, corresponding to native DWords
`5000..32767000` divisible by `1000`.

The load path reads `Lootable` and gates both controls at lines
`69769-69775`. The `xbLootableClick` method `FUN_0047559c` repeats the same
enable/disable operation at lines `92088-92096`. This is UI gating, not a
storage coupling rule: each native field remains independently serialized.

## Effective bodybag.2da rule

Aurora Web reuses the existing Area-wide `placeableBodyBagCatalog` wire member
as the one effective `bodybag.2da` catalog for both Placeable and Creature
selectors. The legacy member name is retained for additive v1 compatibility;
its documented semantics are widened rather than duplicating the same table in
the response.

The winner remains one complete `2DA V2.0` resource selected by module,
ordered-HAK, then vanilla precedence. It must contain exactly one `Name`
column, `1..256` dense physical rows, and one unsigned decimal Name StrRef per
row. Its descriptor carries the exact source identity, lowercase SHA-256,
size, and row count. Display text is not mutation identity. Missing,
malformed, stale, over-budget, or non-dense tables leave Creature Treasure
Model preserve-only.

## Frozen additive cross-boundary contract

Area detail may add the following exact storage to a type-`4` placement:

```ts
type CreatureBodyBagStorage =
  | { present: false }
  | { present: true; nativeType: "byte"; value: number };

type CreatureDecayTimeStorage =
  | { present: false }
  | { present: true; nativeType: "dword"; valueMilliseconds: number };
```

The frontend materializes detached immutable source provenance only for an
exact `aurora_git` Creature with a non-negative family ordinal. A catalog-bound
present body-bag byte becomes
`source.creatureBodyBag = { expectedValue, tableSha256, tableRowCount }` and
the numeric `advancedSettings.treasureModelRow`. A canonical present DWord
becomes `source.creatureDecayTime = { expectedMilliseconds }` and the exact
whole-second `advancedSettings.corpseDecayTimeSeconds`.

One changed Creature property mutation may add either or both members:

```ts
bodyBag: {
  expectedValue: number;
  value: number;
  tableSha256: string;
  tableRowCount: number;
};

decayTime: {
  expectedMilliseconds: number;
  valueMilliseconds: number;
};
```

Both pairs must be changed, exact, source-bound, and independently valid. The
body-bag pair uses physical byte-range rows in the retained effective table.
The decay pair uses exact canonical DWords corresponding to whole seconds
`5..32767`. The mutation may coexist with other independently admitted
Creature property mutations on the same ordinal, including `Lootable`, but
never with deletion of that ordinal.

Projection, planning, compilation, writing, and readback each fail closed.
Planning reparses exactly one case-sensitive `BodyBag:Byte` and/or
`DecayTime:DWord`, compares the retained expected values, and rejects absence,
duplicates, aliases, wrong case/type, noncanonical decay, unknown keys,
unchanged pairs, stale ordinals, family mismatch, or deletion collision.
Compilation freshly re-resolves the effective `bodybag.2da` for a BodyBag
change and rejects digest, row-count, or target-row drift. The paired writer
replaces only requested existing fields, verifies the complete candidate, and
preserves all unrelated GIT plus paired GIC/IFO bytes through the existing
revision-fenced, idempotent, journaled ARE/GIT/GIC/IFO publication.

No endpoint, binary payload, pagination, chunking, or streaming change is
introduced. The existing Area-wide catalog is reused, and existing request,
object/property, transaction, authorization, permission, idempotency, fencing,
journal, recovery, and atomic-publication budgets remain unchanged.

Routine telemetry may expose only contract revision, object family, bounded
ordinal, approved field tokens, changed-member count, stage, duration, and a
stable result code. It must exclude values, object IDs, resource names,
catalog hashes, source/storage keys, raw fields or bytes, and host paths.
Bounded request diagnostics may name the approved native field and ordinal but
must not become metric labels.

## Test-first exit criteria and proof boundary

Offline implementation requires strict domain validation, exact parser
presence/malformed cases, catalog binding, projection, native reparse planner,
fresh catalog compiler validation, exact paired writer, parse-write-parse and
whole-candidate preservation/readback, GIC/IFO identity, combined BodyBag plus
DecayTime plus Lootable mutation, HTTP/mapper/detached-source validation,
per-control provenance, Lootable gating, Apply/OK/Cancel/reopen/local-Save,
clone/history, focused integration, and bounded production builds.

The fake Creature Body Bag checkbox must cease to be an authoring control; the
catalog-bound Treasure Model selector replaces it. The numeric control must use
`min=5`, `max=32767`, and `step=1`, without coercing unsupported retained raw
values.

## Offline implementation verification

The retained type-`4` Creature lane now carries the exact presence-sensitive
`BodyBag : Byte` and `DecayTime : DWord` storage through strict Area detail
validation, detached frontend provenance, saved-draft validation, clone and
history flows, final projection, native ordinal replanning, effective
`bodybag.2da` revalidation, paired GIT/GIC writing, candidate compilation, and
the revision-fenced ARE/GIT/GIC/IFO publication path. The dialog uses the
numeric catalog row and bounded whole-second decay input. The older guessed
Creature Body Bag checkbox and textual Treasure Model value do not authorize
native mutation.

Accepted bounded evidence on 2026-08-27 includes:

- focused domain/parser verification: `191/191` backend assertions;
- negative projector, planner, writer, and compiler verification:
  `483/483`, `353/353`, `837/837`, and `112/112` assertions respectively;
- the complete bounded Area Update integration profile: `49/49`, including
  one combined `Lootable 0 -> 1`, `BodyBag 0 -> 3`, and
  `DecayTime 5000 -> 12000` mutation with byte-identical GIC/IFO and
  `readbackStatus="verified"`;
- the capability-catalog gate: `13/13` at revision `2026-08-27.70`;
- the focused frontend implementation bundle: `522/522` assertions, the
  Creature Workspace regression: `8/8`, and the final mapper/factory/dialog
  cross-check: `136/136`;
- passing backend Nest and frontend TypeScript/Vite production builds.

All accepted commands were one-shot, sequential, capped at one worker and a
1 GiB Node heap where applicable. No Docker engine or container command,
managed service, watcher, browser, Chrome, capture, Toolset, NWN, or mutation
test was started for this offline slice.

Fresh browser Save/reopen, exact-candidate Toolset Save/Build/reopen and packed
readback, and NWN death/remains timing and model behavior remain separate
release gates. Until validator-accepted artifacts exist, live proof is
`missing` and this slice cannot close those overall program gates.
