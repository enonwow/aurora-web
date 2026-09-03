# Existing Area Placeable animation-state audit v1

Date: 2026-08-17  
Status: source-closed contract; current offline implementation verified; live browser and native recertification pending

## Scope and authority

This audit covers only the native `AnimationState` byte exposed by the placed
Placeable Toolset dialog as `Open State`. It does not admit changing the
read-only Template ResRef, resolving or changing Portrait, mapping module
factions, authoring variables, or claiming a visual/runtime animation result.

Primary decompilation authority is
`C:/Projects/New Folder/export/decompiled_all.c`, SHA-256
`36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572`.
The corresponding Toolset binary is
`C:/Program Files (x86)/Steam/steamapps/common/Neverwinter Nights/bin/win32/nwtoolset.exe`,
SHA-256
`4c156de898817518e8a97f5d989592894d3c8f48b71d27e2a8b89500cd230f24`.
No xoreos or other GPL source was inspected or used.

## Recovered native storage lineage

The common situated-object reader `FUN_0063ae68` reads `AnimationState`
through the native byte reader into object offset `0x94`. The symmetric writer
`FUN_0063b8a0` writes that same member as the `AnimationState` byte. A placed
Placeable reaches this common lineage through `FUN_0063d0d8` and
`FUN_0063d3d8`.

The admitted immutable `plc_watertrough.UTP` construction profile, SHA-256
`a1b00834837b3c516d823f63e00054b2331044bdbccca1d49f1bc121f854c531`,
produces exactly one `AnimationState : Byte = 0` in the retained type-`9` GIT
Placeable. The existing construction readback and writer fixture therefore
close the exact field name, native type, and value presence for the admitted
profile.

## Recovered Toolset control semantics

Read-only PE resource inspection did not start a Toolset process. The
`TFRASITUATEDADVANCED` RCDATA resource is 2,651 bytes at RVA `0x00BD4E68`,
SHA-256
`6caa889d899b40d7a41aa4cd0beda2e41fc3ccc1e0109ac788ead3f6c0d04b28`.
It contains the `Open State` label and a sorted, list-only `cbOpenState`
control. It also proves that `eTemplate` and `ePortrait` are read-only and
limited to 16 characters; those fields are not admitted by this mutation.

For a placed object, `FUN_006f2168` populates the combo with three explicit
underlying byte values:

```text
0 -> TLK 0x0f92e
1 -> TLK 0x106bf
2 -> TLK 0x106c0
```

The installed English retail `dialog.tlk`, SHA-256
`1d6da70e0659e411012b44f956a093cc8fb61aed3b9355198ba42eb17e0649c9`,
resolves those entries to `Closed`, `Opened 1`, and `Opened 2` respectively.
`FUN_006f1b70` loads object offset `0x94` into the combo by underlying value;
`FUN_006f242c` writes the selected underlying value back to the same byte.
This closes the editor mapping without inferring animation playback behavior.

## Frozen cross-boundary contract

Area detail metadata exposes exact, presence-sensitive numeric
`animationState`. The frontend retains it as immutable
`source.placeableAnimationState` provenance and presents exactly these tokens:

```text
Closed   -> 0
Opened 1 -> 1
Opened 2 -> 2
```

The existing Placeable mutation gains one optional complete
`animationState: { expectedValue, value }` pair. Both values are integers in
the closed set `{0, 1, 2}` and must differ. Only a source-backed Placeable
with exact provenance may enable the control. An absent native field remains
preserve-only and must not be materialized.

The backend resolves one immutable source ordinal, verifies exact parsed
provenance and exactly one native `AnimationState` byte, changes only that
field, preserves the complete remaining GIT struct, and preserves GIC
byte-for-byte. Missing, partial, duplicate, wrongly typed, stale, unchanged,
out-of-set, cross-family, or deletion-colliding mutations fail closed. Exact
whole-struct candidate readback is mandatory.

## Completion boundary

Offline completion requires parser/mapper presence tests, UI and Apply guards,
projector/planner/writer negative and combined round-trip tests, compiler
receipt coverage, Area Update integration, and production builds. Dedicated
mutation analysis is optional and requires explicit opt-in. Fresh
exact-candidate Toolset Save/Build/reopen remains mandatory. NWN visual/runtime
behavior is not certified by this storage mutation.

## Current Area CRUD closure — 2026-08-26

The retained-Placeable lane is now closed through the current saved-workspace
and atomic Area Update boundaries. Saved drafts require exact `aurora_git`
Placeable family identity, a zero-based native source ordinal, one immutable
`placeableAnimationState` in `{0,1,2}`, and one independently editable target
token in `{Closed, Opened 1, Opened 2}`. Wrong-family, missing-ordinal,
malformed-source, missing-target, invalid-token, and unproven retained-target
states fail closed.

The atomic-publication integration changes only the retained
`AnimationState : Byte`, verifies the complete candidate and receipt, and proves paired GIC
and IFO byte identity. The dedicated frontend regression proves all three
frozen options plus Apply followed by OK, a separate Cancel, another OK,
reopen, and local Save while immutable expected-value provenance remains
unchanged.

The current bounded verification is seven backend unit suites with `1801/1801`
assertions, the Area Update integration suite with `38/38` assertions, and
eight frontend unit/regression suites with `430/430` assertions. Backend and
frontend production builds pass; the frontend build retains only its existing
large-chunk advisory. Capability catalog revision `2026-08-26.60` records the
audit and consolidated browser/Toolset/NWN Placeable-property blockers.
Mutation testing was not run because it is optional and was not explicitly
requested.

No Docker engine, container, managed service, watcher, browser, capture,
Chrome, Toolset, or NWN process was started for this closure. Fresh admitted
browser readback, exact-candidate Toolset Save/Build/reopen, packed readback,
and NWN animation behavior remain open proof gates and are not claimed by the
offline results.
