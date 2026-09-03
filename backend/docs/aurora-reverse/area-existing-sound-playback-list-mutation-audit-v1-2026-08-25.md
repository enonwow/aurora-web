# Existing Area Sound playback-list mutation audit v1 — 2026-08-25

Status: verified implementation authority for the bounded combined CAS below.
Browser, Toolset Save/Build, and NWN runtime proof remain open release gates.

## Decision

Aurora Web may author the ordered playback list of an existing retained Sound
only through one complete source-bound playback tuple:

```text
sounds                        : ordered ResRef[0..1024]
loopingByte                   : 0 | 1
continuousByte                : 0 | 1
priorityByte                  : 2 | 3 | 19 | 20
positionalByte                : 0 | 1
intervalDword                 : uint32
intervalVariationDword        : uint32
```

Every admitted list member is a canonical lowercase ASCII ResRef matching
`[a-z0-9_]{1,16}`. Order and duplicate members are significant and retained.
The empty list is admitted because the native form clears the complete list,
copies zero or more rows, and then derives Priority; no non-empty precondition
occurs on that save path. The application cap of 1,024 list members is a
resource-safety budget, not a claimed Aurora format limit.

The tuple is intentionally combined. List length participates in the native
Priority derivation, so a list CAS that preserved an independently stale
Priority or raced a separate Play Style CAS would be unsound. A target may
change list order/membership and the canonical Play Style pair together;
`Priority` is always recomputed from the complete target. `Positional`,
`Interval`, and `IntervalVrtn` remain immutable dependencies in this lane.

Legacy `soundPlayStyle` remains additive and backward-compatible for exact
sources whose `Sounds` child structure is not eligible for list authoring.
When complete `soundPlayback` provenance is present, it is authoritative for
both list and Play Style changes and no parallel Play Style mutation is emitted
for the same retained ordinal.

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
  `3d9c5d29709bcf4aa037554781d229a2094f3d85370c44a6a5df9a222f8d87fa`;
- the accepted live placement and packed-module evidence frozen by
  `area-sound-construction-audit-v1-2026-08-13.md`.

No external or GPL source was consulted. No Toolset, NWN, service, browser, or
capture process was started. The artifacts were inspected read-only.

## Native read/write authority

`FUN_0063db18` clears the in-memory Sound list at
`decompiled_all.c:331133`, opens exact `Sounds:LIST` at `331134-331136`,
iterates its ordered child structs at `331143-331146`, reads exact
`Sound:RESREF` at `331147-331149`, and appends each value in encountered order
at `331150`.

`FUN_0063e414` creates exact `Sounds:LIST` at `331319`, obtains the in-memory
count at `331320`, iterates from zero to count minus one, creates every output
child with native struct type `0` at `331324`, fetches the ordered list member
at `331327-331329`, and writes exact `Sound:RESREF` at `331334-331336`.

The Sound Properties load path clears the form list and copies every native
member in order at `441515-441526`. Its save path clears the native list at
`442167-442168`, copies every form row in order at `442169-442180`, and only
then invokes the shared Priority derivation helper at `442182`.

Retail RCDATA for `TDLGSOUNDEDIT` publishes exact `List of Sounds to Play`,
`Play`, `Stop`, `Remove`, `Add Sounds...`, `Move Down`, and `Move Up` controls
at report lines `13514-13545`. This proves the form vocabulary and ordered
list operations, not arbitrary free-text resource creation.

The prior construction audit independently freezes that Toolset converts
blueprint `Sounds` children into GIT children of struct type `0`, each with one
`Sound` ResRef. The exact retained-list lane therefore admits only that
losslessly reproducible GIT child shape. Wrong child type, missing/duplicate/
wrong-case/wrong-type `Sound`, malformed list indices, or noncanonical ResRef
remain preserve-only.

## Complete native Priority dependency

For canonical flag pairs, the proven helper computes:

```text
continuousLike =
  Looping == 1
  OR (
    Looping == 0
    AND Continuous == 1
    AND Sounds.count == 1
    AND Interval == 0
    AND IntervalVrtn == 0
  )

Priority =
  continuousLike && !Positional ? 2  :
  continuousLike &&  Positional ? 3  :
 !continuousLike && !Positional ? 19 : 20
```

The only canonical presentation pairs remain `0/0=Play Once`, `0/1=Repeat`,
and `1/0=Seamlessly looping`. `1/1`, noncanonical bytes, or mismatched source
Priority are preserve-only.

## Contract and materialization

- Area detail may add optional `soundPlayback` with the complete tuple above.
- Retained scene provenance may add a detached immutable
  `soundPlaybackStorage`; current editable state mirrors it as
  `soundPlayback`.
- Area Update may add at most 1,024
  `objectEditing.soundPlaybackMutations[]` members with exact `kind=sound`,
  immutable source identity/ordinal, complete `expectedValue`, and complete
  changed `value`.
- Both complete tuples are validated exactly. The target must preserve the
  three hidden dependencies, use at most 1,024 canonical list members, and
  carry the freshly derived Priority. At least list content/order or the style
  pair must change.
- Duplicate ordinals, deletion conflicts, non-Sound targets, stale source,
  malformed child structure, dependency drift, a simultaneous legacy Play
  Style mutation for the same ordinal, and unknown keys fail closed.
- The writer replaces only exact `Sounds:LIST`, `Continuous:BYTE`,
  `Looping:BYTE`, and `Priority:BYTE`. It emits child type `0` and one exact
  `Sound:RESREF` per ordered member. All unrelated GIT fields, GIC bytes, ARE,
  and IFO remain preserve-first.
- Candidate reconstruction and persisted readback compare the complete target
  list, style flags, derived Priority, dependencies, GIT/GIC pair structure,
  and transaction resource hashes.
- Validation and Update receipts may add
  `soundPlaybackUpdatedCounts` and `totalSoundPlaybackUpdated`.

## Frontend admission and UX

The list UI is active only when both immutable source and current playback
tuples are exact. It may remove, move, and add a canonical ResRef selected from
the existing backend sound catalog. It may not synthesize placeholder names or
accept arbitrary text. The selected catalog entry is appended in order;
duplicates are allowed because the native ordered list permits them.

Play Style uses the same playback tuple whenever available, so one dialog Apply
can atomically change membership/order and style. Loose preserve metadata
remains useful for preview only and never becomes persistence provenance.

## Budgets, diagnostics, and remaining proof

The mutation list and every nested playback list are independently capped at
1,024. Existing JSON body limits, authorization, idempotency, fencing, journal,
recovery, atomic ARE/GIT/GIC/IFO publication, API major version, and no-stream/
no-chunk behavior remain unchanged.

Routine diagnostics may expose only contract revision, object family, bounded
ordinal, source/target list counts, changed-list/style booleans, stage,
duration, and stable result code. ResRefs, list members, object IDs, raw bytes,
hashes, content keys, and host paths remain excluded.

Implementation tests must prove empty/single/multiple/duplicate lists, order,
add/remove/move, the count-sensitive Repeat Priority transition, exact child
shape, stale/conflicting rejection, detached frontend boundaries, candidate
and persisted readback, and receipt totals. Fresh browser Save/reopen, Toolset
Save/Build/reopen, and NWN audio behavior remain mandatory release proof.

## Offline implementation closure — 2026-08-25

The source-closed lane is implemented end to end. Backend domain admission,
GFF parsing, provenance projection, independent replanning, exact child-list
CAS writing, candidate/readback verification, detached snapshot transfer, and
receipt accounting all carry `soundPlayback`. Frontend HTTP admission, scene
mapping, persisted-draft validation, deep cloning, presentation conversion,
catalog-bound Basic-list controls, playback-backed Play Style, and Update
receipt admission use the same tuple. When playback provenance exists, the
legacy count-only Play Style lane cannot race it.

Accepted bounded gates are 6/6 focused backend suites with 1,718/1,718 tests,
8/8 focused frontend files with 293/293 tests, 1/1 Area Update atomic-
publication integration suite with 30/30 tests, 12/12 immutable capability-
catalog assertions at revision `2026-08-25.47`, and successful backend and
frontend production builds. The frontend build emitted only the existing
large-chunk advisory.

No managed service, browser capture, Toolset, or NWN process was started for
this checkpoint. Therefore offline implementation is closed, but release
remains blocked on fresh browser Save/reopen, exact-candidate Toolset
Save/Build/reopen, NWN audible playback behavior, and the still-unclosed Sound
positioning/attenuation semantics.
