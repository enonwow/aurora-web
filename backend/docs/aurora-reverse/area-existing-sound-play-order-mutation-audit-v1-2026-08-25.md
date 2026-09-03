# Existing Area Sound play-order mutation audit v1 — 2026-08-25

Status: verified implementation authority for the admitted `Random:BYTE`
storage slice only. Browser, Toolset Save/Build, and NWN runtime proof remain
open release gates.

## Decision

An existing native Sound may expose one optional exact play-order value:

```text
{ randomByte: 0 | 1 }
```

Toolset presentation maps `0` to `Sequential` and `1` to `Random`. The value is
editable only when one unique case-sensitive `Random:BYTE` exists in native
Sound struct type `6`, its value is exactly `0` or `1`, and immutable Sound
family plus source-ordinal provenance is available. Missing, duplicate,
wrong-case, wrong-type, or other byte values remain preserve-only. The
mutation is one field-only source-bound compare-and-swap operation and may
coexist with the already admitted Sound storage mutations, but not deletion.

This slice does not admit `Looping`, `Continuous`, `Priority`, the `Sounds`
list, positioning/attenuation, or NWN playback semantics.

## Immutable evidence set

- `C:/Projects/New Folder/export/decompiled_all.c`, SHA-256
  `36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572`;
- `C:/Projects/New Folder/export/functions.tsv`, SHA-256
  `394096fe106e5767ee6eceb31c8b085091359060351b1d10195e96f666bc69fe`;
- retail
  `C:/Program Files (x86)/Steam/steamapps/common/Neverwinter Nights/bin/win32/nwtoolset.exe`,
  SHA-256
  `4c156de898817518e8a97f5d989592894d3c8f48b71d27e2a8b89500cd230f24`;
- `C:/Projects/nwn-last-city/Aurora/reverse/reverse/nwtoolset_rcdata_report.json`,
  SHA-256
  `3d9c5d29709bcf4aa037554781d229a2094f3d85370c44a6a5df9a222f8d87fa`.

No external or GPL source was consulted. No Toolset, NWN, service, browser, or
capture process was started. The artifacts were inspected read-only.

## Native storage and form authority

`FUN_0063db18` reads case-sensitive `Random` through the BYTE reader into
native Sound offset `0x6b` (`decompiled_all.c:331105-331106`).
`FUN_0063e414` writes the same exact label and type
(`decompiled_all.c:331305`).

The Sound Properties load path treats offset `0x6b != 0` as the selected
`rbRandom` radio state and the complementary state as `rbSequential`
(`decompiled_all.c:441539-441557`). The save path reads `rbRandom` and writes
the resulting boolean byte to offset `0x6b`
(`decompiled_all.c:442075-442077`). Retail RCDATA `TDLGSOUNDEDIT`, RVA
`0x00ba7128`, size `34,166`, publishes the `Play Order`, `rbSequential`,
`Sequential`, `rbRandom`, and `Random` controls
(`nwtoolset_rcdata_report.json:13729-13734`).

Because load accepts every nonzero byte while save canonicalizes the radio to
`1`, only source bytes `0` and `1` are admitted for non-lossy CAS.

## Priority independence and remaining blocker

The native priority derivation helper `FUN_0063e398` reads `Looping` at offset
`0x58`, `Continuous` at `0x45`, `Positional` at `0x68`, Sound-list count, and
zero/nonzero `Interval` plus `IntervalVrtn` state
(`decompiled_all.c:331227-331260`). It does not read `Random` at offset `0x6b`.
Therefore changing only Play Order does not require a derived Priority write.

Play Style cannot use the same field-only rule: `Looping` and `Continuous`
participate in that derivation. They remain preserve-only until one combined
source-closed CAS also validates the derivation inputs and expected/target
Priority. This audit does not authorize an isolated Priority mutation.

## Mutation, preservation, and diagnostics contract

The backend independently resolves `kind=sound` plus immutable ordinal,
reparses the unique exact field, compares the expected byte, replaces only
`Random`, reconstructs the complete candidate Sound struct, and requires
paired GIC byte identity before publication. The frontend may enable Play
Order controls only when exact source and current storage are both admitted.

Routine diagnostics may expose contract revision, Sound family, bounded
source ordinal, changed-field count, stage, duration, and stable result code.
They must not expose the value, ResRef, object ID, raw bytes, hashes, content
keys, or host paths.

Required offline gates are domain, parser, projection, planner, round-trip
writer, candidate, transaction receipt, frontend port/scene/draft/UI,
capability catalog, and production builds. Browser Save/reopen,
exact-candidate Toolset Save/Build/reopen, and NWN playback behavior are
separate release gates.

## Implementation closure

Immutable capability catalog revision `2026-08-25.45` connects this exact
storage slice end to end. Backend parsing and detached Area-detail projection,
source-bound draft projection, independent source replanning, field-only CAS
writing, complete candidate Sound reconstruction, unchanged paired GIC
verification, transaction transfer, and receipt accounting carry the same
contract. Frontend HTTP validation, scene mapping, persisted-draft validation,
workspace cloning, property-draft application, and Advanced Sound Properties
radios detach and preserve the exact tuple.

Accepted offline gates are 8/8 bounded backend unit suites with 1,776/1,776
assertions, 1/1 atomic-publication integration suite with 30/30 assertions,
7/7 focused frontend files with 271/271 tests, 12/12 immutable capability-
catalog assertions, and passing backend/frontend production builds. The
frontend build emits only the pre-existing chunk-size advisory.

No managed service, browser capture, Toolset, or NWN process was started or
stopped for this closure. Fresh browser Save/reopen, exact-candidate Toolset
Save/Build/reopen, NWN playback behavior, Play Style/derived Priority, and the
remaining Sound property scopes remain open release gates.
