# Existing Area Creature `Race` audit v1

Date: 2026-09-02  
Status: `OFFLINE_SOURCE_BLOCKED`; direct retained-Race mutation is not admitted

## Decision

Aurora Web must keep the existing-Creature `Race` control visibly
`PRESERVE_ONLY`. Native storage is an exact `Race : Byte`, but the frozen
Toolset does not treat a race selection as an isolated byte replacement. Its
`cbRaceChange` handler immediately runs multiple dependent refresh paths,
including the complete Creature challenge-rating calculator.

The web editor must not offer an enabled Race selector until that dependency
graph, its effective-table inputs, its derived outputs, and its atomic write
set have been recovered and differentially verified. This audit closes the UI
safety decision; it does not authorize Race mutation or a guessed subset of
the native recalculation.

## Immutable authority

| Source | SHA-256 |
| --- | --- |
| `C:/Projects/New Folder/export/decompiled_all.c` | `36BB8B1031AFE2ABF23F0E18180A5AD649401D9EA5E078E5170A31A96167C572` |
| `C:/Projects/New Folder/export/functions.tsv` | `394096FE106E5767EE6ECEB31C8B085091359060351B1D10195E96F666BC69FE` |
| installed retail `nwtoolset.exe` | `4C156DE898817518E8A97F5D989592894D3C8F48B71D27E2A8B89500CD230F24` |
| retail `TDLGCREATUREEDIT` RCDATA | `75E2DCFD5B0886DBB13BFB7CB32290CCCE842CADA84CFB806510ABDE52E7820E` |
| frozen RCDATA report | `3D9C5D29709BCF4AA037554781D229A2094F3D85370C44A6A5DF9A222F8D87FA` |

The RCDATA is the 52,662-byte `TPF0` form at RVA `0x00AE4698`. Its published
132-entry Delphi method table begins at `0x00BBDB84` and binds
`cbRaceChange` to code address `0x0045BE64`. No xoreos or other GPL source was
consulted.

## Storage and dialog identity

The common Creature reader `FUN_00532174` reads the field through the native
Byte reader `FUN_00aeed68` at decompiled line `194112`, using the exact
case-sensitive `Race` label represented by `DAT_00bfdf6b`, and stores it at
Creature offset `+0x6C`. The reciprocal common writer `FUN_0053521c` writes
that same byte through `FUN_00aefd1c` at line `195137`, under the
writer-side exact label represented by `DAT_00bfe46a`.

Dialog load `FUN_0044b110` copies Creature `+0x6C` to dialog byte `+0xB00`
and selects the ComboBox item carrying that byte as item data at decompiled
lines `69520-69523`. Dialog save `FUN_0044d360` copies dialog `+0xB00` back to
Creature `+0x6C` at line `70578`. These paths close stored width, dialog
identity, and basic load/save ownership. They do not prove that changing the
selection has only that one consequence.

## Native change coupling

`FUN_0045be64`, the `cbRaceChange` handler, reads the selected ComboBox item
data into dialog byte `+0xB00` and then invokes, in order:

1. `FUN_004574fc`;
2. `FUN_004632d8`;
3. `FUN_00457a4c`.

The same handler then queries the `PlayerRace` column for the selected
physical race row and changes control availability. The first two callees are
additional race-dependent dialog refresh paths and remain part of the
unclosed graph.

`FUN_00457a4c` materializes the current dialog state into a temporary Creature
through `FUN_0044f050` or `FUN_0044effc`, calls the full
`FUN_0052ede0` challenge-rating calculator, and publishes its calculated text
outputs. The calculator begins at decompiled line `192045`, spans broad class,
feat, spell, statistics, table, fractional-CR, and adjustment behavior, and is
already the source blocker recorded by the exact `CRAdjust` audit. A lone Race
CAS would therefore bypass native dependent behavior.

## Product consequence

The retained Race byte remains readable and remains an immutable dependency
for already admitted profiles such as Creature Hit Points and Portrait. It is
not deleted, normalized, or rewritten merely because direct editing is
blocked. The Basic-tab selector is visible, labelled `Race: PRESERVE_ONLY`,
and disabled; Apply, OK, Cancel, Save, and reopen cannot create a silent Race
mutation through that control.

Enabling the selector requires all of the following:

1. source-close `FUN_004574fc`, `FUN_004632d8`, and every state-changing
   dependency reached by the race-change path;
2. implement the complete `FUN_0052ede0` calculator with immutable effective
   table provenance and exact numeric behavior;
3. define one contract for the complete expected/target coupled write set;
4. add unit, regression, round-trip, candidate-readback, and differential
   tests before implementation;
5. capture fresh browser Save/reopen, exact-candidate Toolset Save/Build/reopen,
   packed readback, and NWN runtime proof.

Until those gates pass, the capability blocker remains
`creature_race_cr_derived_calculators_pending`.

## Resource/process statement

This audit used read-only decompilation and previously frozen PE/resource
evidence. The installed Toolset executable was not started. No Docker command,
container, service, watcher, browser, Chrome, capture, Toolset/NWN process,
mutation test, external GPL source, or sub-agent was used.
