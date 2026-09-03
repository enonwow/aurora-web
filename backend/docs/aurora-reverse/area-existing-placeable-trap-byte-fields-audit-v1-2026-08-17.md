# Existing Area Placeable trap `Byte` fields audit v1

Date: 2026-08-17  
Status: source-closed implementation contract; runtime recertification pending

## Scope and authority

This audit covers six independent fields on one retained type-`9` Area GIT
Placeable: `TrapFlag`, `TrapDetectable`, `TrapDisarmable`, `TrapOneShot`,
`TrapDetectDC`, and `DisarmDC`. It does not admit `TrapType`, Toolset trap
palette mapping, trap creation, rogue-set modifiers, or runtime trigger/damage
behaviour. The two trap script ResRefs are covered by their separate audit.

Primary decompilation authority is
`C:/Projects/New Folder/export/decompiled_all.c`, SHA-256
`36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572`.
The corresponding Toolset binary SHA-256 is
`4c156de898817518e8a97f5d989592894d3c8f48b71d27e2a8b89500cd230f24`.
No xoreos or other GPL source was inspected or used.

## Recovered native lineage

The placed-Placeable reader `FUN_0063d0d8` delegates to `FUN_0063bf74`, which
delegates common situated-object state to `FUN_0063ae68`. That common reader
loads all six fields with the native `Byte` reader. The symmetric writer
lineage `FUN_0063d3d8` -> `FUN_0063c0a8` -> `FUN_0063b8a0` writes the same six
fields with the native `Byte` writer.

The installed retail `plc_watertrough.UTP` profile, immutable source SHA-256
`a1b00834837b3c516d823f63e00054b2331044bdbccca1d49f1bc121f854c531`,
independently fixes the exact labels, types, and one valid tuple:

```text
TrapFlag       : Byte = 0
TrapDetectable : Byte = 1
TrapDisarmable : Byte = 1
TrapOneShot    : Byte = 1
TrapDetectDC   : Byte = 0
DisarmDC       : Byte = 15
```

The accepted Toolset-created Placeable construction path preserves these
fields in the type-`9` GIT instance. This closes native storage only; it does
not certify a new web-authored candidate or runtime trap behaviour.

## Frozen mutation contract

Area detail metadata exposes exact, presence-sensitive values. The frontend
retains them as immutable Placeable trap provenance and maps targets to the
existing trap UI fields:

```text
TrapFlag       <-> isTrapped
TrapDetectable <-> detectable
TrapDisarmable <-> disarmable
TrapOneShot    <-> oneShot
TrapDetectDC   <-> detectionDc
DisarmDC       <-> disarmDc
```

The four flags are booleans serialized as exactly `0` or `1`. Both DC fields
are safe integers in `0..255`. A mutation contains only changed pairs in the
fixed native order above. The source GIT SHA-256, immutable Placeable ordinal,
and source object identity remain the outer optimistic lock.

The writer requires exactly one matching native `Byte`, verifies the current
value, changes only that value, preserves the complete remaining GIT struct,
and preserves GIC byte-for-byte. Missing, duplicate, wrong-type, invalid,
stale, unchanged, unsupported, reordered, cross-family, or deletion-colliding
mutations fail closed. Whole-struct candidate readback is mandatory.

`TrapType` and the row-derived `setDc`, `detectDcModWhenSetByRogue`, and
`disarmDcModWhenSetByRogue` remain outside this six-field contract. Their
physical-row mapping is source-closed separately by
`area-existing-placeable-trap-type-audit-v1-2026-08-19.md`; until that
implementation gate closes, they remain preserve-only here and must not
silently enter this mutation payload.

## Completion boundary

Source closure requires focused backend and frontend tests, exact GIT/GIC
readback, mutation testing, builds, and a program checkpoint. Fresh Toolset
Save/Build/reopen and NWN proof remain part of the parent Area completion gate.
