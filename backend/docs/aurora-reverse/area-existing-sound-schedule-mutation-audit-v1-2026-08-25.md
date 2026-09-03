# Existing Area sound schedule storage mutation audit v1

Date: 2026-08-25  
Status: verified implementation authority for the bounded storage-CAS slice below  
Scope: mutate exact native `Hours` and `Times` fields of one retained
`SoundList` entry while preserving every unrelated GIT field and paired GIC
entry

## Decision

Aurora Web may expose one exact existing-Sound schedule storage tuple only
when the retained native struct contains exactly one case-sensitive
`Hours:DWORD` and one `Times:BYTE`:

```text
hoursMask  integer 0..0x00ffffff
timesByte  integer 0..3
```

`Times` has the exact Toolset presentation mapping:

```text
0 = Specific Hours
1 = Day
2 = Night
3 = Always
```

`Hours` bit `0` maps to 12 AM, bits `1..11` to 1 AM through 11 AM, bit `12`
to 12 PM, and bits `13..23` to 1 PM through 11 PM. The tuple is one complete
source-bound compare-and-swap pair. The two members have no inferred
cross-field constraint: the Toolset retains the 24 check states even while a
non-specific `Times` mode disables their controls.

Missing, duplicate, wrong-case, wrong-type, stale, `Times > 3`, or any high
`Hours` bit remains preserve-only. This audit proves storage and Toolset
presentation. It does not prove NWN clock boundaries, scheduling latency,
savegame interaction, audio playback, or runtime interpretation.

## Immutable evidence set

Primary source:

- `C:/Projects/New Folder/export/decompiled_all.c`, SHA-256
  `36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572`;
- `C:/Projects/New Folder/export/functions.tsv`, SHA-256
  `394096fe106e5767ee6eceb31c8b085091359060351b1d10195e96f666bc69fe`;
- retail
  `C:/Program Files (x86)/Steam/steamapps/common/Neverwinter Nights/bin/win32/nwtoolset.exe`,
  SHA-256
  `4c156de898817518e8a97f5d989592894d3c8f48b71d27e2a8b89500cd230f24`,
  size `12,201,984` bytes, PE32 image base `0x00400000`;
- `C:/Projects/nwn-last-city/Aurora/reverse/reverse/nwtoolset_rcdata_report.json`,
  SHA-256
  `3d9c5d29709bcf4aa037554781d229a2094f3d85370c44a6a5df9a222f8d87fa`.

No external or GPL source was consulted. No Toolset, NWN, service, browser, or
capture process was started. The binary, decompilation, and RCDATA artifacts
were inspected read-only.

## Native storage authority

`FUN_0063db18` reads `Hours` through the DWORD reader into native offset
`0x78` and reads `Times` through the BYTE reader into offset `0x7c`
(`decompiled_all.c:331125-331128`). `FUN_0063e414` writes the same exact
labels and types (`decompiled_all.c:331315-331316`).

The Sound Properties load path checks `Times` and selects controls at offsets
`0x4bc`, `0x464`, `0x460`, and `0x45c` for values `0`, `1`, `2`, and `3`
respectively (`decompiled_all.c:441580-441595`). Values outside `0..3` select
the offset-`0x45c` fallback, so they are not admitted for mutation. The save
path reverses those exact checks into bytes `0..3`
(`decompiled_all.c:442109-442130`).

The retail Delphi published-field table was parsed read-only from the exact
binary. Class short-string `TdlgSoundEdit` is at VA `0x00c92e47`, VMT at
`0x00c91e0c`, and its 158-entry published-field table is at `0x00c91f7c`.
It binds:

```text
0x45c rbTimeAlways
0x460 rbTimeNight
0x464 rbTimeDay
0x4bc rbTimeSpecific
```

This independently closes the value-to-caption mapping above. RCDATA
`TDLGSOUNDEDIT`, RVA `0x00ba7128`, size `34,166`, contains the captions
`Always`, `Night`, `Day`, and `Specific Hours` plus the 24 named hour
checkboxes (`nwtoolset_rcdata_report.json:13682-13719`).

At form initialization the Toolset copies published fields `xb12AM` through
`xb11PM` in chronological order into the array at `0x6d8..0x734`
(`decompiled_all.c:441141-441164`). Load tests successive mask bits against
that array (`decompiled_all.c:441596-441610`); save reconstructs the DWORD
with 24 successive bits (`decompiled_all.c:442131-442145`).
`FUN_006fd7c0` enables that exact 24-control array only for `Times == 0` and
does not clear its state (`decompiled_all.c:440986-441020,441611`). Therefore
only the low 24 bits are form-editable and high-bit source values remain
preserve-only.

## Mutation, preservation, and diagnostics contract

The backend independently resolves `kind=sound` plus immutable native ordinal,
reparses both unique exact fields, compares the complete expected tuple, and
replaces only those two fields. The mutation may coexist with the same Sound
position, interval/variation, and base-volume mutations, but not deletion.
Candidate reconstruction verifies the complete Sound struct and requires
paired GIC byte identity before publication.

Routine diagnostics may expose contract revision, Sound family, bounded
source ordinal, changed-field count, stage, duration, and stable result code.
They must not expose masks, mode values, ResRefs, object IDs, raw bytes,
hashes, content keys, or host paths.

Required offline gates are domain, parser, projection, planner, round-trip
writer, candidate, transaction receipt, frontend port/scene/draft/UI,
capability catalog, and production builds. Browser Save/reopen,
exact-candidate Toolset Save/Build/reopen, and NWN scheduling behavior remain
separate release gates.

## Implementation closure — 2026-08-25

The admitted contract is implemented end to end. The backend now parses and
detaches exact schedule storage, projects a complete source-bound mutation,
independently replans against the source GIT, writes only the exact `Hours`
and `Times` fields, reconstructs the complete candidate Sound struct, verifies
unchanged GIC bytes, and transfers per-family plus total counts through
validation and Update receipts. The frontend now validates and detaches the
same tuple through HTTP, scene, persisted draft, clone, presentation, property
draft, and Sound Properties boundaries. Schedule controls activate only when
both exact source and current storage are admitted.

Accepted offline gates are eight bounded backend unit suites with 1,764
assertions, the dedicated atomic-publication integration suite with 30
assertions, seven focused frontend files with 260 tests, 12/12 immutable
capability-catalog assertions at revision `2026-08-25.43`, and passing backend
and frontend production builds. The frontend build emits only the pre-existing
chunk-size advisory.

No managed service, browser, capture, Toolset, or NWN process was started or
stopped for this implementation closure. Browser Save/reopen, exact-candidate
Toolset Save/Build/reopen, NWN scheduling behavior, the remaining Sound
playback/priority/list/positioning slices, and the full 99-tileset rendering
and connectivity program remain open.
