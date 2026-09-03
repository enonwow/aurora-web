# Existing Area Creature hit-point mutation audit v1

Date: 2026-08-28  
Status: `OFFLINE_SOURCE_CLOSED`; implementation and live release proof pending

## Decision

Aurora Web may implement retained type-`4` Area Creature hit-point authoring as
one coupled, provenance-bound operation. The visible writable value is
`Base Hit Points`; the persisted operation owns the canonical GIT Short triplet
`HitPoints`, `CurrentHitPoints`, and `MaxHitPoints`. A change to the retained
base `Con` Byte is part of the same native coupling and must use the same
hit-point provenance even when the requested Base HP value is unchanged.

The operation is not three independent numeric edits. `CurrentHitPoints` and
`MaxHitPoints` are derived outputs. Loose metadata, a guessed
`MaxHitPoints - HitPoints` delta, or a default racial modifier cannot authorize
the operation.

The exact derivation depends on:

1. the retained base `Con` Byte;
2. the selected Race row's `ConAdjust` integer from the one effective
   `racialtypes.2da`;
3. the sum of the retained Creature's first eight class levels;
4. whether exact feat row `40` is present;
5. the retained raw `HitPoints`, `CurrentHitPoints`, and `MaxHitPoints` Shorts
   for compare-and-swap.

Missing, duplicated, aliased, wrong-case, wrong-type, incomplete, stale, or
unbound dependency state is preserve-only. The lane never creates or removes
one of the three native HP fields.

## Immutable primary authority

| Source | Size | SHA-256 |
| --- | ---: | --- |
| `C:/Projects/New Folder/export/decompiled_all.c` | 30,366,020 bytes | `36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572` |
| `C:/Projects/New Folder/export/strings.tsv` | 2,691,636 bytes | `864ae0139451d5333307cb2bbccce725bbd2d2c6056ac2d5f80f9b5ea50f190f` |

No xoreos or other GPL source was inspected or used. No Docker command,
container, service, watcher, browser, capture, Toolset, NWN, or mutation-test
process was started for this source closure.

## Native GFF read/write closure

The common Creature reader `FUN_00532174` starts at
`decompiled_all.c:193907`. It reads exact `HitPoints` through
`FUN_00aeee20` at line `195010`, writes that Short into common Creature offset
`+0xf0`, copies it to `CurrentHitPoints` offset `+0xf2` at line `195012`, and
derives `MaxHitPoints` through `FUN_0053ceb8` into offset `+0xf4` at lines
`195013-195014`.

There is no native read of the serialized `CurrentHitPoints` or
`MaxHitPoints` labels in this path. The only decompiled references to those
exact labels are the writer calls. Therefore opening the placed Creature in
the Toolset initializes the in-memory current value from `HitPoints` and the
in-memory maximum from the native calculator; it does not use the two retained
serialized sibling values as calculation inputs.

The paired common writer `FUN_0053521c` writes, in order:

1. `HitPoints` from `+0xf0` at line `195228`;
2. `CurrentHitPoints` from `+0xf2` at line `195229`;
3. `MaxHitPoints` from `+0xf4` at line `195230`.

All three calls use `FUN_00aefdf4`. That helper writes native GFF type id `3`,
which is the repository's canonical signed `SHORT`. The reader helper
`FUN_00aeee20` likewise accepts only type id `3`.

Placed-Creature reader `FUN_0053ab24` calls the common reader for the type-`4`
GIT object at line `197530`. Its only later shared-object read,
`FUN_0050fc18`, handles `VisTransformList`/`VisualTransform` and has no HP
label or Creature HP-offset access. Placed-Creature writer `FUN_0053ae80`
calls the common writer at line `197590`. The paired GIC record does not own
the HP triplet and must remain byte-identical.

## Native maximum calculation

`FUN_0053ceb8`, at `decompiled_all.c:198692-198766`, builds the effective
Creature class/race state, reads Race `ConAdjust`, and calculates:

```text
levelCount = sum(first eight class levels)
constitutionModifier = abilityModifier(baseCon + racialConAdjust)
ordinaryMaximum = max(baseHitPoints + levelCount * constitutionModifier, levelCount)
loadedMaximum = ordinaryMaximum + (featRow40Present ? levelCount : 0)
```

`FUN_005318ac`, at lines `193296-193305`, is the exact native ability-modifier
helper. For the ordinary non-negative Toolset score interval it is
`floor(score / 2) - 5`. The implementation must preserve the native signed
32-bit behavior rather than replace it with a floating approximation.

`FUN_0053bf04` reads `ConAdjust` from the selected Race row in
`racialtypes.2da` at lines `198532-198565`. The selected physical row is the
stored Race Byte. Consequently `constitutionAdjust = 0` is not a fallback;
the exact effective table, physical row, digest, row count, and parsed
`ConAdjust` are required provenance.

The common reader obtains class levels from canonical `ClassList` entries.
It reads `ClassLevel` as Short at line `194851` and supports the fixed first
eight class slots. It reads canonical `FeatList` Word values at
`194751-194769`. `FUN_0053ceb8` tests feat id `0x28` (decimal `40`) at line
`198760` and adds one hit point per class level when present. The contract uses
the numeric row identity and does not depend on a localized feat name.

## Creature-properties dialog closure

The Creature-properties loader `FUN_0044b110` copies the in-memory
`HitPoints` Short to the Base HP spinner at line `69748`. The dialog setup
configures that spinner with initial `5`, minimum `1`, and maximum `10000` at
`decompiled_all.c:67684`, `67705`, and `67726`.

The recalculation helper `FUN_00457e70`, at lines `76127-76566`, sums the first
eight visible class levels and rejects a total of `181` or more. It reads the
effective Constitution modifier, computes `levelCount * modifier`, includes
one extra `levelCount` when feat row `40` is present, dynamically raises the
Base HP minimum so the ordinary maximum is at least `levelCount`, and renders:

```text
Constitution Bonus = levelCount * constitutionModifier
                     + (featRow40Present ? levelCount : 0)
Total Hit Points = visibleBaseHitPoints + Constitution Bonus
```

The save path `FUN_0044d360` parses the rendered Total HP into
`MaxHitPoints`, reads the Base HP spinner into `HitPoints`, and applies the
current-HP preservation algorithm at lines `71042-71066`.

At dialog load, lines `70183-70186` retain:

```text
baseDamage = loadedHitPoints - loadedCurrentHitPoints
loadedBonus = loadedMaxHitPoints - loadedHitPoints
loadedEffectiveCurrent = loadedCurrentHitPoints + loadedBonus
loadedWasAlive = loadedEffectiveCurrent > 0
```

Because the common reader initialized `loadedCurrentHitPoints` from
`loadedHitPoints`, `baseDamage` is zero for this Toolset path. The save path
then computes the new Short triplet as follows:

```text
targetMax = visible total HP
targetHitPoints = visible base HP
targetCurrent = targetHitPoints - baseDamage
targetBonus = targetMax - targetHitPoints

if loadedWasAlive and targetCurrent + targetBonus > 0:
    targetCurrent = loadedEffectiveCurrent - targetBonus
else if not loadedWasAlive and targetCurrent + targetBonus < 1:
    targetCurrent = 1 - targetBonus
```

For admitted ordinary sources this preserves the loaded effective current HP
while Base HP or Constitution changes. It does not preserve the raw serialized
`CurrentHitPoints` or `MaxHitPoints` as calculation inputs; those raw Shorts
remain mandatory CAS provenance so a concurrent external write cannot be
overwritten.

## Frozen additive FE-BE contract

Area detail may expose one exact retained `creatureHitPointState`:

```ts
type AreaCreatureHitPointState =
  | { present: false }
  | {
      present: true;
      hitPoints: { nativeType: "short"; value: number };
      currentHitPoints: { nativeType: "short"; value: number };
      maxHitPoints: { nativeType: "short"; value: number };
      constitution: { nativeType: "byte"; value: number };
      race: { nativeType: "byte"; value: number };
      classLevels: readonly number[];
      featRow40Present: boolean;
      racialTypes?: {
        resourceName: "racialtypes.2da";
        sourceObjectKey: string;
        sourceLayer: "module" | "hak" | "vanilla";
        sha256: string;
        sizeBytes: number;
        rowCount: number;
        rowIndex: number;
        constitutionAdjust: number;
      };
    };
```

Only a complete state with a matching effective-table binding authorizes
retained editing. The frontend keeps a detached immutable copy under
`source.creatureHitPointState`. The visible writable target is
`creatureProperties.statistics.baseHitPoints`; the coupled target
Constitution remains
`creatureProperties.statistics.abilityScores.constitution`.
`hitPointBonuses`, `currentHitPoints`, and `maxHitPoints` are derived read-only
presentation.

Projection emits one internal coupled mutation whenever Base HP changes or an
admitted base `Con` mutation changes the native HP result. It carries the raw
expected Short triplet, target triplet, expected and target Constitution,
exact class levels, feat-row-40 presence, Race, racial adjustment, and table
digest/count. Base HP or Constitution must differ; the derived triplet may be
byte-identical when a Constitution transition stays in the same modifier
bucket.

Planning reparses the exact retained ordinal, reconstructs every dependency,
performs full compare-and-swap, and independently recomputes all derived target
values. Compilation re-resolves the current strongest
module/ordered-HAK/vanilla `racialtypes.2da`, verifies digest, physical row
count, selected Race row, and `ConAdjust`, then writes the canonical fields in
native order: changed ability Bytes first, followed by `HitPoints`,
`CurrentHitPoints`, and `MaxHitPoints` Shorts.

## Precedence, budgets, and diagnostics

The effective `racialtypes.2da` uses module, ordered HAK, then vanilla
first-hit precedence. Weaker resources are never row-merged. A stronger
present malformed resource blocks weaker fallback. Source input is bounded to
64 MiB and at most 1,000,000 physical rows; only a physical Race row in Byte
range with an exact integer `ConAdjust` is bindable.

This additive v1 extension introduces no endpoint, binary request body,
pagination, chunking, or streaming. Per-Creature provenance and mutation data
remain below two KiB and use the existing Area Update request/object/property,
authorization, permission, idempotency, optimistic concurrency, revision
fencing, journal, recovery, rollback, and atomic ARE/GIT/GIC/IFO publication
budgets.

Routine diagnostics may expose only contract revision, `creature` family,
bounded stage, changed-member count, source layer, and stable reason codes such
as `invalid_triplet`, `dependency_incomplete`, `racial_table_missing`,
`racial_table_stale`, `race_row_missing`, `derived_value_mismatch`, and
`constitution_coupling_missing`. Values, object IDs, ordinals, row numbers,
hashes, paths, source/storage keys, raw fields or bytes, credentials, and host
paths are excluded from metric labels.

## Acceptance boundary

Offline completion requires tests-first coverage for strict native parsing,
effective-table precedence and binding, native arithmetic, current-HP
preservation, Constitution coupling, detached frontend provenance, HTTP and
saved-draft validation, history cloning, dialog gating and live derivation,
projector/planner/compiler CAS, canonical three-Short writing, complete
candidate and persisted readback, atomic publication, byte-identical paired
GIC/IFO, and production builds.

Fresh guarded browser Apply/OK/Save/reopen, exact-candidate Toolset
Save/Build/reopen with packed GIT readback, and NWN inspection remain
independent release gates. This audit closes the implementation semantics; it
does not by itself certify live completion or the full Area program.

## 2026-08-29 offline regression correction

The viewport HP reducer and final Apply materializer previously supplied
presentation-draft class levels unconditionally. That was invalid for a
retained Creature whose exact HP dependency state was present but whose
class-level mutation provenance was absent: the dialog calculated the Aurora
minimum from the retained HP state, while mutation handling recalculated it
from unrelated seed presentation rows.

Both paths now supply target draft levels only when exact class-level
provenance binds the original snapshot roster and the target keeps the same
class identities. Otherwise `deriveExistingCreatureHitPointTarget` uses the
exact class levels retained inside `creatureHitPointState`. The focused two-case
regression passes `2/2`, the complete Creature-properties regression file
passes `20/20`, and the frontend production source typecheck passes under the
1 GiB heap ceiling. No live runtime evidence is added by this correction.
