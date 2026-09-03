# Existing Area Placeable conversation/interruptable audit v1

Date: 2026-08-17  
Status: source-closed contract; current offline implementation verified; live browser and native recertification pending

## Scope and authority

This audit covers the `Conversation` ResRef and `Interruptable` byte on one
retained type-`9` Area GIT Placeable. It does not admit dialog-resource
creation, conversation graph authoring, portrait conversion, faction mapping,
animation state, or a runtime interruption-behaviour claim.

Primary decompilation authority is
`C:/Projects/New Folder/export/decompiled_all.c`, SHA-256
`36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572`.
The corresponding Toolset binary SHA-256 is
`4c156de898817518e8a97f5d989592894d3c8f48b71d27e2a8b89500cd230f24`.
No xoreos or other GPL source was inspected or used.

## Recovered native lineage

The placed-Placeable reader `FUN_0063d0d8` delegates to `FUN_0063bf74`, which
delegates common situated-object state to `FUN_0063ae68`. The common reader
loads `Conversation` through the native ResRef reader and `Interruptable`
through the native `Byte` reader. The symmetric writer lineage
`FUN_0063d3d8` -> `FUN_0063c0a8` -> `FUN_0063b8a0` writes the same ResRef and
byte fields.

The installed retail `plc_watertrough.UTP` profile, immutable source SHA-256
`a1b00834837b3c516d823f63e00054b2331044bdbccca1d49f1bc121f854c531`,
contains `Conversation : ResRef = ""` and `Interruptable : Byte = 1`. The
accepted Toolset-created Placeable construction path preserves both in the
type-`9` GIT instance. These facts close the storage mapping but do not certify
the new web mutation path or runtime conversation behaviour.

## Frozen mutation contract

Area detail metadata exposes exact, presence-sensitive `conversation` and
`interruptable` values. The frontend retains both as immutable source
provenance. The current Aurora-shell UI exposes `conversation` directly and a
`noInterrupt` checkbox, so its target relation is exactly:

```text
target Conversation   = advancedSettings.conversation
target Interruptable  = advancedSettings.noInterrupt ? 0 : 1
```

Conversation is either empty or an Aurora ResRef of 1..16 ASCII letters,
digits, or underscore. `Interruptable` is exactly `0` or `1`; the frontend
surface uses a boolean and performs only the documented inversion.

Each mutation carries the exact source and target pair. The source GIT
SHA-256, immutable Placeable ordinal, and source object identity remain the
outer optimistic lock. The writer requires exactly one native field of the
correct type, verifies the current value, changes only that field, preserves
the complete remaining GIT struct, and preserves GIC byte-for-byte. Missing,
duplicate, wrongly typed, stale, unchanged, invalid, cross-family, or
deletion-colliding mutations fail closed. Whole-struct candidate readback is
mandatory.

An empty Conversation ResRef is valid and distinct from an absent field.
Absence does not authorize materializing either field in this v1 extension.

## Completion boundary

Source closure requires focused backend and frontend tests, exact GIT/GIC
readback, builds, and a program checkpoint. Dedicated mutation analysis for
validation and inversion is optional and requires explicit opt-in. Fresh
Toolset Save/Build/reopen and NWN proof remain part of the parent Area
completion gate.

## Current Area CRUD closure — 2026-08-26

The retained-Placeable lane is now closed through the current saved-workspace
and atomic Area Update boundaries. `Conversation` and `Interruptable` remain
independently presence-sensitive: each editable target requires its own exact
immutable source field, while an empty Conversation ResRef remains distinct
from absence. Saved drafts also require exact `aurora_git` Placeable family
identity and a zero-based native ordinal. Wrong-family, missing-ordinal,
malformed-source, missing-target, invalid-target, and unproven retained-target
states fail closed independently for both fields.

The atomic-publication integration changes only `Conversation : ResRef` and
`Interruptable : Byte`, verifies the complete candidate and receipt, and
proves paired GIC and IFO byte identity. The dedicated frontend regression
proves the empty ResRef, 16-character input budget, inverse `noInterrupt`
mapping, Apply followed by OK, a separate Cancel, another OK, reopen, and
local Save while both immutable expected values remain unchanged.

The current bounded verification is eight backend unit suites with `1816/1816`
assertions, the Area Update integration suite with `39/39` assertions, and
eight frontend unit/regression suites with `453/453` assertions. Backend and
frontend production builds pass; the frontend build retains only its existing
large-chunk advisory. Capability catalog revision `2026-08-26.61` records the
audit and consolidated browser/Toolset/NWN Placeable-property blockers.
Mutation testing was not run because it is optional and was not explicitly
requested.

No Docker engine, container, managed service, watcher, browser, capture,
Chrome, Toolset, or NWN process was started for this closure. Fresh admitted
browser readback, exact-candidate Toolset Save/Build/reopen, packed readback,
and NWN conversation/interruption behavior remain open proof gates.
