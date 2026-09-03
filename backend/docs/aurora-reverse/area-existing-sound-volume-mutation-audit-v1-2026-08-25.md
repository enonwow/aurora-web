# Existing Area sound base-volume mutation audit v1

Date: 2026-08-25  
Status: verified implementation authority for the bounded storage-CAS slice below  
Scope: mutate the exact base `Volume` byte of one retained native `SoundList`
entry while preserving every other GIT field and the paired GIC entry

## Decision

Aurora Web may expose an independent exact base-volume storage value for an
existing Area sound only when one case-sensitive native `Volume` field exists
with exact GFF type `BYTE`. The admitted storage representation is:

```text
volumeByte integer 0..127
```

The mutation is one source-bound compare-and-swap pair. It may coexist with
the same Sound position mutation and the separately contracted interval/
variation tuple, but not with deletion. Missing, duplicate, wrong-case,
wrong-type, out-of-domain, or stale source state remains preserve-only.

This audit proves exact storage and Toolset edit bounds. It does not prove NWN
loudness curves, attenuation, mixing, priority interaction, or runtime audio
behavior. `VolumeVrtn`, scheduling, playback flags, sound-list membership,
positioning, and comments remain separate contracts.

## Immutable evidence set

Primary source:

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
capture process was started. All evidence was inspected read-only.

## Native read/write and form authority

`FUN_0063db18` reads `Volume` through the byte reader and stores it at native
sound-record offset `0x7d` (`decompiled_all.c:331129-331130`).
`FUN_0063e414` writes that same byte through the GFF byte writer under exact
label `Volume` (`decompiled_all.c:331317`).

The Sound Properties load path assigns the byte at `0x7d` directly to
`tbVolume` (`decompiled_all.c:441637`). The save path passes the trackbar
position to `FUN_0063e754` (`decompiled_all.c:442164`). That setter stores the
input byte unchanged when it is `0..127` and clamps every larger byte to `127`
(`decompiled_all.c:331370-331378`). The retail Sound form and its initialization
also program the base-volume and volume-variation trackbars to `0..127`; the
form evidence and initialization range are frozen in
`area-existing-sound-interval-variation-mutation-audit-v1-2026-08-25.md`.

The frontend therefore presents the raw byte on a `0..127`, step-`1` slider.
Its normalized scene-guide value is only a view conversion `volumeByte / 127`;
the exact integer remains the mutation authority.

## Preservation, diagnostics, and exit criteria

The backend independently resolves `kind=sound` plus immutable native ordinal,
reparses one exact `Volume:BYTE`, compares the expected byte, replaces only
that field, reconstructs the candidate Sound struct, and preserves paired GIC
bytes. Persisted publication re-reads and byte/hash-compares the exact verified
candidate before structural pair validation.

Routine diagnostics may expose contract revision, Sound family, bounded source
ordinal, changed-field count, stage, duration, and stable result code. They
must not expose the volume value, ResRef, object ID, raw bytes, hashes, content
keys, or host paths.

Required offline gates are domain, parser, projection, planner, round-trip
writer, candidate, transaction, frontend port/scene/draft/UI, capability
catalog, and production builds. Browser Save/reopen, exact-candidate Toolset
Save/Build/reopen, and NWN audible behavior remain separate release gates.

## Implemented offline closure

Capability catalog revision `2026-08-25.42` implements the admitted slice
without widening its authority. Backend parsing and detached projection carry
the exact byte; draft projection emits one changed complete CAS pair;
independent replanning resolves the retained native Sound ordinal and rejects
stale or ambiguous source state. The preserve-first writer changes only the
unique `Volume:BYTE` field, independently reconstructs the candidate Sound
struct, requires paired GIC identity, and reports per-family plus total receipt
counts. The same Sound may carry a disjoint position or interval/variation
mutation in the same transaction.

Frontend HTTP, scene mapping, workspace cloning, persisted-draft validation,
property-draft conversion, and the Basic Sound Properties slider share the
same exact provenance. The slider exposes raw `0..127`, step `1`; missing or
malformed exact source/current storage disables the control and cannot invent
a native value.

Accepted bounded gates are 9/9 backend suites with 1,766/1,766 assertions and
8/8 frontend files with 254/254 tests. The immutable capability-catalog gate
and both production builds are required at the checkpoint handoff. No managed
service, browser, capture, Toolset, or NWN process was started for this slice.
Runtime proof remains open exactly as stated above.
