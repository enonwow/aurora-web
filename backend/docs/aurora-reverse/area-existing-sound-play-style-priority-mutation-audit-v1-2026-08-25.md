# Existing Area Sound Play Style and derived Priority mutation audit v1 — 2026-08-25

Status: verified implementation authority for the bounded combined CAS below.
Browser, Toolset Save/Build, and NWN runtime proof remain open release gates.

## Decision

Aurora Web may expose Play Style for an existing native Sound only as one
complete source-bound storage tuple:

```text
loopingByte                  : 0 | 1
continuousByte               : 0 | 1
priorityByte                 : 2 | 3 | 19 | 20
positionalByte               : 0 | 1
soundsCount                  : uint32
intervalDword                : uint32
intervalVariationDword       : uint32
```

Only the three Toolset-canonical flag pairs are admitted:

```text
Play Once           -> Looping=0, Continuous=0
Repeat              -> Looping=0, Continuous=1
Seamlessly looping  -> Looping=1, Continuous=0
```

`Looping=1, Continuous=1`, noncanonical boolean bytes, missing/duplicate/
wrong-case/wrong-type fields, malformed `Sounds:LIST`, or a source `Priority`
that does not match the proven native derivation remain preserve-only.

Changing Play Style copies the four dependency values unchanged and replaces
only `Looping:BYTE`, `Continuous:BYTE`, and the freshly derived
`Priority:BYTE`. This is deliberately not an isolated flag or Priority edit.

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

`FUN_0063db18` reads the exact case-sensitive fields through their matching
GFF readers:

- `Continuous:BYTE` at `decompiled_all.c:331097-331098`;
- `Looping:BYTE` at `331099-331100`;
- `Positional:BYTE` at `331101-331102`;
- `Interval:DWORD` and `IntervalVrtn:DWORD` at `331117-331120`;
- `Priority:BYTE` at `331123-331124`;
- `Sounds:LIST` beginning at `331133-331136`.

`FUN_0063e414` invokes the derivation helper before serialization at line
`331291`, then writes `Continuous`, `Looping`, `Positional`, both DWORD timing
fields, `Priority`, and `Sounds` at `331301-331319`.

The Sound Properties load path reads native `Looping` and `Continuous` at
`decompiled_all.c:441539-441546`. `Looping` selects the looping radio. When it
is false, `Continuous` selects Repeat and its complement selects Play Once.
The save path writes the looping and repeat radio states back to the two bytes
at `442069-442074`, then calls the same derivation helper at `442182`.

Retail RCDATA `TDLGSOUNDEDIT`, RVA `0x00ba7128`, size `34,166`, publishes the
`Play Style` group and exact controls/captions `rbLooping` / `Seamlessly
looping`, `rbContinuous` / `Repeat`, and `rbOnce` / `Play Once` at
`nwtoolset_rcdata_report.json:13720-13728`.

Because a nonzero flag loads as selected while save writes a radio boolean,
only bytes `0` and `1` are admitted. Because the load path gives `Looping`
precedence and does not preserve a simultaneously nonzero `Continuous`, the
pair `1,1` is excluded as lossy/noncanonical.

## Exact Priority derivation

`FUN_0063e398` at `decompiled_all.c:331227-331260` computes an effective
continuous-like state:

```text
continuousLike =
  Looping != 0
  OR (
    Looping == 0
    AND Continuous != 0
    AND Sounds.count == 1
    AND Interval == 0
    AND IntervalVrtn == 0
  )
```

It then writes:

```text
continuousLike && !Positional -> Priority 2
continuousLike &&  Positional -> Priority 3
!continuousLike && !Positional -> Priority 19
!continuousLike &&  Positional -> Priority 20
```

The decompiler displays a register-carried `param_3` assignment in the
exclusive-one-boolean branch. Boolean path analysis proves that the only path
which reaches that assignment has `continuousLike=false` and
`Positional=true`, and the immediately following condition overwrites the
local with `0x14`. The parameter therefore cannot influence any output for
the complete boolean state space. All four reachable outputs are closed by
the explicit branches above.

The target Priority is recomputed from the selected canonical Play Style and
unchanged exact dependencies. The source tuple is admitted only when its
stored Priority already equals the same function over its source flags and
dependencies. This avoids silently normalizing anomalous native records.

## CAS, preservation, budgets, and diagnostics

The Area-detail parser requires one unique exact field for all six named
native labels plus one unique exact `Sounds:LIST`, validates the list body,
and records its exact uint32 count. The frontend detaches the complete tuple as
immutable source provenance and current state. It may change only the
presentation Play Style; the conversion must retain `Positional`, list count,
and both DWORDs exactly and derive Priority locally with the same pure rule.

An Area Update admits at most 1,024 Play Style mutations. The backend
independently resolves `kind=sound` plus immutable family ordinal, reparses the
complete tuple, compares every expected member, rejects dependency changes in
the target, replaces only the two style bytes and Priority, reconstructs the
entire candidate Sound struct, and requires paired GIC identity. The lane may
coexist with already admitted Sound transform/property mutations but not
deletion of the same ordinal.

No chunking or streaming is introduced. Existing request budgets,
authorization, idempotency, source fencing, journal, recovery, and atomic
ARE/GIT/GIC/IFO publication remain unchanged.

Routine diagnostics may expose only contract revision, family, bounded source
ordinal, changed-field count, stage, duration, and stable result code. Values,
list members, ResRefs, object IDs, raw bytes, content keys, hashes, and host
paths are excluded.

## Exit criteria and remaining proof

Required offline gates are domain truth-table and malformed-state tests,
parser cardinality/type tests, projection/planner stale-source tests,
round-trip writer and independent candidate readback, transaction receipt,
frontend port/scene/draft/UI tests, capability-catalog coverage, atomic
publication integration, and both production builds. Mutation testing is
optional and was not requested.

This audit does not admit sound-list membership/order authoring,
positioning/attenuation mutation, random positioning, or NWN playback
semantics. Fresh browser Save/reopen, exact-candidate Toolset Save/Build/reopen,
and NWN runtime audio behavior remain separate release gates.

## Implemented offline closure

Immutable capability catalog revision `2026-08-25.46` connects the complete
tuple end to end while leaving the broad Sound authoring capability partial.
Backend parsing, detached Area-detail projection, source-bound draft
projection, independent GIT/GIC replanning, complete CAS writing, exact
candidate reconstruction, paired-GIC preservation, transaction transfer, and
receipt accounting use the same derivation rule and dependency checks.

Frontend HTTP validation, scene mapping, persisted-draft validation,
workspace cloning, exact presentation conversion, property-draft application,
and the Advanced Play Style radio group detach and preserve the complete
tuple. Direct Priority editing is not exposed.

Accepted offline gates are 9/9 bounded backend unit suites with 1,811/1,811
assertions, 1/1 atomic-publication integration suite with 30/30 assertions,
7/7 focused frontend files with 284/284 tests, passing backend/frontend
production builds, and the dedicated detached clone test recorded in the
final checkpoint gate. The frontend build emits only the pre-existing
chunk-size advisory.

No managed service, browser capture, Toolset, or NWN process was started or
stopped. Fresh browser Save/reopen, exact-candidate Toolset Save/Build/reopen,
NWN audio behavior, list membership, positioning/attenuation, and the full
tileset rendering/connectivity program remain open.
