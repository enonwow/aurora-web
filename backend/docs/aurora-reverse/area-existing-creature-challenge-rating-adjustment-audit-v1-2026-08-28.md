# Existing Area Creature `CRAdjust` audit v1

Date: 2026-08-28  
Status: `OFFLINE_SOURCE_BLOCKED`; independent retained-field mutation is not admitted

## Decision

Aurora Web must keep existing Creature `CRAdjust` visibly
`PRESERVE_ONLY`. Its exact storage type and native input bound are now closed,
but changing this value through the Toolset is not an independent field write.
The Toolset invokes the complete Creature challenge-rating calculator and then
overwrites both `CRAdjust` and `ChallengeRating`. A web mutation that replaced
only `CRAdjust` would create a state the native editor does not produce.

Implementation may begin only after the full calculator inputs and output
rounding/fractional-CR behavior are recovered, represented by an immutable
contract, and verified against at least one exact native differential. This
audit does not authorize a guessed `stored ChallengeRating + adjustment`
formula.

## Immutable authority

| Source | SHA-256 |
| --- | --- |
| `C:/Projects/New Folder/export/decompiled_all.c` | `36BB8B1031AFE2ABF23F0E18180A5AD649401D9EA5E078E5170A31A96167C572` |
| `C:/Projects/New Folder/export/functions.tsv` | `394096FE106E5767EE6ECEB31C8B085091359060351B1D10195E96F666BC69FE` |
| installed retail `nwtoolset.exe` | `4C156DE898817518E8A97F5D989592894D3C8F48B71D27E2A8B89500CD230F24` |
| retail `TDLGCREATUREEDIT` RCDATA | `75E2DCFD5B0886DBB13BFB7CB32290CCCE842CADA84CFB806510ABDE52E7820E` |
| frozen RCDATA report | `3D9C5D29709BCF4AA037554781D229A2094F3D85370C44A6A5DF9A222F8D87FA` |
| `backend/test/support/area-creature-construction-fixture.ts` | `6D3061F65E9FC89825B884E838E241505F731B9EA3C542BB3919ACC94E81A214` |

The RCDATA is the 52,662-byte `TPF0` resource `TDLGCREATUREEDIT` at RVA
`0x00AE4698`. No xoreos or other GPL source was consulted.

## Storage findings

The common Creature reader `FUN_00532174` reads exact case-sensitive
`CRAdjust` through `FUN_00aeeed8` at decompiled lines `194723-194724` and
stores the result at Creature offset `0x104`. `FUN_00aeeed8` admits only GFF
type id `5`, the repository's native `INT`, and preserves all four value bytes.

The reciprocal writer `FUN_0053521c` writes the same offset and label through
`FUN_00aefecc` at line `195238`. That helper creates or updates GFF type id
`5` and copies the complete 32-bit payload. This closes storage identity, but
does not by itself prove that a UI edit is independent.

## Native input and coupling findings

The Delphi method table maps the form's handlers as follows:

| Handler | Code address |
| --- | --- |
| `eCRAdjustmentExit` | `0x00460B8C` |
| `eCRAdjustmentKeyDown` | `0x00460BB0` |
| `udCRAdjustmentClick` | `0x00460BE4` |

Both the exit path and Enter-key path call `FUN_005f3eb8` with inclusive
bounds `-0x7D..0x7D`, or `-125..125`, and immediately call
`FUN_00457a4c`. The generic clamp helper delegates to `FUN_005f4130`, whose
branches return the lower bound, original integer, or upper bound. This closes
the Toolset text-input domain without relying on the `TUpDown` defaults.

`FUN_00457a4c` materializes the current Creature and calls the full
`FUN_0052ede0` challenge-rating calculator. At decompiled lines
`193274-193282`, that calculator adds the signed value at Creature offset
`0x104` to a score derived earlier from the Creature's broader statistics,
applies the fractional/rounding branch, and writes the resulting Float back to
Creature offset `0x100`, the serialized `ChallengeRating` field. Therefore a
native adjustment edit has a coupled two-field result and depends on the full
calculator state.

## Product consequence

The current frontend read-only `Calculated Challenge Rating` expression is
presentation-only. It cannot authorize `CRAdjust` persistence and must not be
described as the native calculator. Exact `ChallengeRating` Float CAS remains
valid because that contract edits the stored Float directly and deliberately
does not claim Toolset recalculation parity.

The future mutation contract must either:

1. implement and verify the complete source-derived calculator and atomically
   CAS/write both fields; or
2. prove a distinct native workflow that changes `CRAdjust` without invoking
   the calculator.

Until one route is verified, missing, present, positive, negative, and zero
`CRAdjust` values are all preserve-only. Fresh browser, Toolset Save/Build,
packed two-field readback, and NWN behavior proof remain missing.

## Resource/process statement

This audit used read-only decompilation, PE section/resource inspection, and
bounded static x86 disassembly. The installed Toolset executable was never
started. No Docker command, service, watcher, browser, capture, Toolset/NWN
process, mutation test, or external GPL source was used.
