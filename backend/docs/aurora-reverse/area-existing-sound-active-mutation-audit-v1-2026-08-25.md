# Existing Area Sound `Active` mutation audit v1 — 2026-08-25

Status: verified implementation authority for the admitted `Active:BYTE`
storage slice only. Browser, Toolset Save/Build, and NWN runtime proof remain
open release gates.

## Decision

An existing native Sound may expose an optional exact storage value:

```text
{ activeByte: 0 | 1 }
```

The tuple is editable only when one unique case-sensitive `Active:BYTE` field
exists in native Sound struct type `6`, the decoded value is exactly `0` or
`1`, and immutable Sound family plus source-ordinal provenance is available.
Missing, duplicate, wrong-case, wrong-type, or other byte values remain
preserve-only. The mutation is one field-only source-bound compare-and-swap
operation and may coexist with position, interval/variation, base-volume, and
Hours/Times mutations, but not deletion.

This audit proves storage and Toolset checkbox presentation. It does not prove
NWN activation timing, resource scheduling, audible behavior, savegame
interaction, or runtime state transitions.

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

`FUN_0063db18` reads case-sensitive `Active` through the BYTE reader into
native Sound offset `0x44` (`decompiled_all.c:331095-331096`).
`FUN_0063e414` writes the same exact label and type
(`decompiled_all.c:331299-331301`).

The Sound Properties load path checks offset `0x44 != 0` and assigns that
boolean to the published `xbActive` checkbox control at form offset `0x450`
(`decompiled_all.c:441528-441529`). The save path reads that checkbox and
writes the resulting boolean byte back to offset `0x44`
(`decompiled_all.c:442036-442038`). Retail RCDATA `TDLGSOUNDEDIT`, RVA
`0x00ba7128`, size `34,166`, identifies `xbActive`, caption `Active`, and
handler `xbActiveClick` (`nwtoolset_rcdata_report.json:13678-13681`).

The load path treats every nonzero byte as checked, but save canonicalizes it
to `1`. Therefore only source bytes `0` and `1` are admitted for non-lossy CAS;
all other source bytes remain preserve-only.

## Priority no-guessing blocker discovered in the same pass

`Priority:BYTE` is read and written at native offset `0x6a`
(`decompiled_all.c:331123-331124,331314`). It is not loaded from or saved to a
direct Sound Properties control. Instead both the native writer and the form
save path invoke `FUN_0063e398`, which derives Priority from other Sound flags
and one register-carried input (`decompiled_all.c:331227-331260,331291,
442182`). The exact meaning of every derived branch is not yet closed, so the
frontend priority control must remain preserve-only and no direct Priority CAS
is authorized by this audit.

## Mutation, preservation, and diagnostics contract

The backend independently resolves `kind=sound` plus immutable ordinal,
reparses the unique exact field, compares the expected byte, replaces only
`Active`, reconstructs the complete candidate Sound struct, and requires
paired GIC byte identity before publication. The frontend may enable the
checkbox only when exact source and current storage are both admitted.

Routine diagnostics may expose contract revision, Sound family, bounded
source ordinal, changed-field count, stage, duration, and stable result code.
They must not expose the value, ResRef, object ID, raw bytes, hashes, content
keys, or host paths.

Required offline gates are domain, parser, projection, planner, round-trip
writer, candidate, transaction receipt, frontend port/scene/draft/UI,
capability catalog, and production builds. Browser Save/reopen,
exact-candidate Toolset Save/Build/reopen, and NWN audible/runtime behavior are
separate release gates.

## Implementation closure

Immutable capability catalog revision `2026-08-25.44` connects this exact
storage slice end to end. Backend parsing and detached Area-detail projection,
source-bound draft projection, independent source replanning, field-only CAS
writing, complete candidate Sound reconstruction, unchanged paired GIC
verification, transaction transfer, and receipt accounting carry the same
contract. Frontend HTTP validation, scene mapping, persisted-draft validation,
workspace cloning, property-draft application, and the Basic Sound Properties
checkbox detach and preserve the exact tuple.

Accepted offline gates are 8/8 bounded backend unit suites with 1,769/1,769
assertions, 1/1 atomic-publication integration suite with 30/30 assertions,
7/7 focused frontend files with 260/260 tests, 12/12 immutable capability-
catalog assertions, and passing backend/frontend production builds. The
frontend build emits only the pre-existing chunk-size advisory.

No managed service, browser capture, Toolset, or NWN process was started or
stopped for this closure. Fresh browser Save/reopen, exact-candidate Toolset
Save/Build/reopen, NWN activation/audio behavior, and the remaining Sound
property scopes remain open release gates.
