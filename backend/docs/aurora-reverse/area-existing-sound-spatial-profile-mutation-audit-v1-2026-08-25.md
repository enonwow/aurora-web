# Existing Area Sound spatial-profile mutation audit v1 — 2026-08-25

## Decision

Aurora Web may author the positioning and attenuation controls of an existing
retained native Sound only through one complete exact `soundProfile` tuple:

```text
sounds                    : ordered canonical ResRef[0..1024]
loopingByte               : 0 | 1
continuousByte            : 0 | 1
priorityByte              : 2 | 3 | 19 | 20
positionalByte            : 0 | 1
randomPositionByte        : 0 | 1
elevationFloat32          : exact finite binary32, -10..10
maxDistanceFloat32        : exact finite binary32, 0.2..320
minDistanceFloat32        : exact finite binary32, 0..maxDistance
randomRangeXFloat32       : exact finite binary32, 0..320
randomRangeYFloat32       : exact finite binary32, 0..320
intervalDword             : uint32
intervalVariationDword    : uint32
```

The `0..320` random-range ceiling is an application authoring budget aligned
with the proven outer-radius ceiling, not a claim that the GFF float format has
that limit. A source outside the admitted lossless profile remains
preserve-only.

The profile deliberately includes ordered playback and all native Priority
dependencies. Changing `Positional` without deriving Priority, or racing a
positioning mutation against list/style authoring, would be unsound. Where the
complete profile exists it is authoritative; the earlier `soundPlayback` and
count-only `soundPlayStyle` lanes remain backward-compatible fallbacks and may
not mutate the same ordinal concurrently.

## Immutable inputs

- `C:/Projects/New Folder/export/decompiled_all.c`, SHA-256
  `36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572`;
- `C:/Projects/New Folder/export/functions.tsv`, SHA-256
  `394096fe106e5767ee6eceb31c8b085091359060351b1d10195e96f666bc69fe`;
- retail `nwtoolset.exe`, SHA-256
  `4c156de898817518e8a97f5d989592894d3c8f48b71d27e2a8b89500cd230f24`;
- `C:/Projects/nwn-last-city/Aurora/reverse/reverse/nwtoolset_rcdata_report.json`,
  SHA-256
  `3d9c5d29709bcf4aa037554781d229a2094f3d85370c44a6a5df9a222f8d87fa`;
- `backend/docs/aurora-reverse/area-sound-construction-audit-v1-2026-08-13.md`;
- `backend/docs/aurora-reverse/area-existing-sound-playback-list-mutation-audit-v1-2026-08-25.md`.

No xoreos, GPL, or other external implementation source was inspected or
used.

## Exact native storage and form mapping

`FUN_0063db18` reads case-sensitive `Positional:BYTE`,
`RandomPosition:BYTE`, `Elevation:FLOAT`, `MaxDistance:FLOAT`,
`MinDistance:FLOAT`, `RandomRangeX:FLOAT`, and `RandomRangeY:FLOAT` at
`decompiled_all.c:331109-331130`. `FUN_0063e414` writes the same labels/types at
`331282-331293`. The existing construction audit independently freezes Sound
GIT/GIC struct type `6` and exact base-UTS values.

`FUN_006fe814` maps storage flags to the three Positioning radios at
`441495-441510`:

```text
Positional == 0                         -> Plays everywhere in area
Positional != 0 && RandomPosition == 0 -> Plays from specific position
Positional != 0 && RandomPosition != 0 -> Plays from a random position
```

`FUN_006ff2f4` saves the reverse mapping at `442078-442096`. It reads the
visible Max Distance, Elevation, Random Range X, and Random Range Y values at
`442091-442159`, and persists Min Distance through the nonnegative setter
`FUN_0063e728`.

The outer-radius exit handler `FUN_00700b0c` clamps Max Distance to the retail
globals at `442815-442822`. Read-only PE/RVA mapping of the pinned executable
proves runtime initialization `DAT_00c901dc = DAT_00c901c8 = float32(0.2)` and
`DAT_00c901e0 = float32(320)`; file offsets are `8974792`, `8974812`, and
`8974816`. The inner-radius exit path `FUN_00700ce4` clamps Min Distance to
`0..MaxDistance` at `442861-442869`. Loading initializes the visible inner
radius to ten percent of Max Distance, while the same exit path permits an
explicit bounded edit.

Retail `TDLGSOUNDEDIT` RCDATA exposes exact Positioning labels: `Plays
everywhere in area`, `Plays from a random position each time it is played`,
`Plays from specific position`, `Outer Radius / Cutoff Distance (m)`, `Inner
Radius / Max Volume Distance (m)`, `West-East Random Range (m)`, `North-South
Random Range (m)`, and `Height (m)`. Its height scale publishes `-10.0` and
`10.0` endpoints. The direct form save reads floats; the application therefore
admits only exact finite binary32 values inside the bounded authoring profile.

## Priority and aggregate authority

The proven Priority helper reads Looping, Continuous, exact Sounds count,
Interval, IntervalVrtn, and Positional. The four-output formula remains the
one frozen by the playback-list audit. `soundProfile` consequently owns list,
style, Positional, and Priority atomically while preserving both interval
DWORDs. RandomPosition, elevation, distances, and ranges do not enter the
helper but share the same CAS to prevent split-view races.

## Contract and persistence

- Area detail may add optional `soundProfile`; retained scene source/current
  state carries detached `soundProfileStorage`/`soundProfile` copies.
- Area Update may add at most 1,024 `soundProfileMutations`, each with exact
  Sound identity/ordinal and complete expected/target tuples.
- The target may change ordered list, style, mode, elevation, both distances,
  and both ranges; it preserves interval DWORDs and carries freshly derived
  Priority.
- A profile mutation conflicts with deletion and with legacy playback or Play
  Style mutation for the same ordinal. Duplicate ordinals, malformed native
  field/list shape, stale source, hidden-dependency drift, non-binary32 values,
  and unknown keys fail closed.
- The writer replaces only exact `Sounds`, `Continuous`, `Looping`, `Priority`,
  `Positional`, `RandomPosition`, `Elevation`, `MaxDistance`, `MinDistance`,
  `RandomRangeX`, and `RandomRangeY` fields. It preserves all unrelated GIT,
  paired GIC, ARE, and IFO structure and requires candidate plus persisted
  readback.
- Receipts may add `soundProfileUpdatedCounts` and
  `totalSoundProfileUpdated`.

Frontend Positioning, list, and Play Style controls are enabled only with
complete exact source/current profile provenance. The renderer may consume the
derived presentation, but loose guide metadata is not persistence authority.

## Proof boundary

Implementation requires domain, parser, projector, planner, writer, candidate,
transaction, HTTP, scene/draft/clone, dialog, and receipt tests plus production
builds. Fresh browser Save/reopen, Toolset Save/Build/reopen, and NWN audible
positioning/attenuation behavior remain release gates and are not claimed by
this offline audit.

## Offline implementation closure

Checkpoint 96 implements the frozen aggregate without broadening its source
claim. Backend admission rejects unknown keys, invalid flag pairs, stale or
duplicate ordinals, dependency drift, non-binary32 numbers, out-of-domain
distances/ranges, malformed native field/list shapes, deletion conflicts, and
coexisting legacy playback/Play Style writes. Exact parsing, draft projection,
independent source-GIT replanning, eleven-field/list CAS reconstruction, paired
GIC preservation, candidate readback, persisted transaction readback, and
receipt accounting are connected end to end.

Frontend HTTP, scene mapping, immutable provenance/current cloning, saved-draft
validation, Sound Properties materialization, list/catalog editing, Play Style,
Positioning, and Update receipt parsing share the same aggregate. The exact
profile overrides loose guide positioning for presentation, preserves signed
Height, exposes native MinDistance instead of the former ten-percent display
approximation, and leaves legacy playback/Play Style targets unchanged while
the aggregate is authoritative.

Accepted offline gates are eight bounded backend unit suites with 1,747/1,747
tests, nine focused frontend files with 305/305 tests, the Area Update atomic-
publication integration suite with 30/30 tests, the immutable capability
catalog with 12/12 tests, and passing backend/frontend production builds. The
frontend build emits only the pre-existing chunk-size advisory.

No managed service, browser capture, Toolset, or NWN process was started or
stopped. Fresh browser Save/reopen, exact-candidate Toolset Save/Build/reopen,
and NWN audible positioning/attenuation behavior remain release blockers.

## Offline viewport-guide closure

Capability-catalog revision `2026-08-25.49` connects the source-closed profile
to one shared editor/runtime world-geometry projection. The projection keeps
signed Elevation, maps MinDistance and MaxDistance to the inner and outer
radii, and maps RandomRangeX/Y to the complete west-east/north-south spans.
The renderer consumes the resulting half extents for its centered random box;
the runtime audio preview consumes the same projection for its randomized
source position and distance attenuation. This is an application preview
contract and does not claim the still-unproven NWN audio edge behavior.

The renderer records the immutable geometry revision, mode, input elevation,
signed world offset, both world radii, and both random half extents on the
Sound marker. Focused tests inspect the actual Three.js line geometry for the
two attenuation rings, the random rectangle, and a downward Height line. They
also prove deterministic invalid-scale handling and preserve the existing
hidden/locked editor-only guide gates. No guide state is serialized into the
Area mutation.

Accepted additional offline gates are 30/30 Sound guide/viewport assertions,
71/71 Area scene and Sound-properties assertions, 12/12 immutable capability-
catalog assertions, and a passing frontend production build with only the
known chunk-size advisory. Fresh browser visual capture remains required by
the proof safety contract before visual parity is release-complete.
