# Existing Area sound interval and variation mutation audit v1

Date: 2026-08-25  
Status: verified implementation authority for the bounded storage-CAS slice below  
Scope: mutate four exact fields of one retained native `SoundList` entry while
preserving every other GIT field and the paired GIC entry

## Decision

Aurora Web may expose one complete immutable storage tuple for an existing
Area sound when all four source fields are present exactly once with their
case-sensitive native labels and exact GFF types:

```text
Interval          : dword
IntervalVrtn      : dword
PitchVariation    : float
VolumeVrtn        : byte
```

The admitted editable representation is:

```text
intervalMilliseconds          integer 0..60000, multiple of 10
intervalVariationMilliseconds integer 0..60000, multiple of 10
pitchVariationHundredths      integer 0..100
volumeVariationByte           integer 0..127
```

`pitchVariationHundredths=N` materializes as `float32(N / 100)`. The other
three values materialize directly in their stated native integer fields. A
mutation is one complete source-bound compare-and-swap tuple; at least one
member must change. There is no inferred relation between `Interval` and
`IntervalVrtn` because this audit proves storage and Toolset edit bounds, not
runtime scheduling math.

Missing, duplicate, wrong-case, wrong-type, out-of-domain, noncanonical-pitch,
or stale source state remains preserve-only. The slice does not admit base
`Volume`, `Hours`, `Times`, playback flags, priority, positioning, sound-list
membership/order, identity, comment, transform, construction, or browser/NWN
audio behavior.

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
capture process was started. The executable, decompilation, and RCDATA
artifacts were inspected read-only.

## Native object read/write authority

`FUN_0063db18` reads the native sound blueprint/profile:

- `decompiled_all.c:331117-331120` reads `Interval` and `IntervalVrtn` through
  the DWORD reader;
- `decompiled_all.c:331121-331122` reads `PitchVariation` through the float
  reader;
- `decompiled_all.c:331131-331132` reads `VolumeVrtn` through the byte reader.

`FUN_0063e414` writes the same exact labels and types:

- `decompiled_all.c:331311-331312` writes the two DWORDs;
- `decompiled_all.c:331313` writes the float;
- `decompiled_all.c:331318` writes the byte.

The writer first calls `FUN_0063e398` at `decompiled_all.c:331291`, which
derives `Priority` from other sound state. `Priority` is therefore excluded
from this direct mutation tuple. The existing Area paired-object lineage and
type-`6` GIT/GIC preservation authority remains the one frozen in
`area-existing-sound-transform-audit-v1-2026-08-12.md`.

## Native Sound Properties form

The RCDATA resource `TDLGSOUNDEDIT` is a `TPF0` blob at RVA `0x00BA7128`,
file offset `0x00AA0728`, size `34,166`. The report records the exact
`Sound Properties` form, its `Advanced` tab, labels, controls, and handlers at
`nwtoolset_rcdata_report.json:13389-13785`.

The form contains:

- `eInterval` and `eIntervalVariation`, each with `MaxLength=5`;
- `udInterval` and `udIntervalVariation`, each with `Min=0`, `Increment=10`,
  and `Wrap=false` in the serialized form;
- `ePitchVariation` plus `tbPitchVariation`; the trackbar has `Max=100`,
  `Frequency=1`, and default `Position=100`;
- `tbVolumeVariation`; the trackbar has `Max=127`, `Frequency=1`, and default
  `Position=25`.

The retail Delphi published-method table around file offsets
`0x00891B93..0x00891C72` binds the form handler names to the following VAs:

```text
ePitchVariationExit       0x007017cc
eIntervalExit             0x00701830
eIntervalVariationExit    0x00701890
udIntervalClick           0x007018f8
udIntervalVariationClick  0x00701994
tbPitchVariationChange    0x00701af8
tbVolumeVariationChange   0x00701058
```

Direct read-only PE disassembly proves:

- `0x007017cc..0x0070182d` parses pitch with two decimals, clamps it to
  constants `0.0..1.0` at `0x00C901E8/0x00C901EC`, stores the float, and maps
  it to trackbar position `round(value * 100)`;
- `0x00701830..0x0070188d` parses interval with two decimals, clamps it to
  constants `0.0..60.0` at `0x00C901CC/0x00C901D0`, and maps it to the
  matching up/down position scaled by `100`;
- `0x00701890..0x007018f5` exposes a signed `-60.0..60.0` edit bound for
  interval variation;
- `0x006fe298..0x006fe34b` programs both interval up/down controls to the
  `0.0..60.0` range with two-decimal scaling;
- `0x006fe38a..0x006fe43d` programs the pitch trackbar to `0..100`, derived
  from the immutable `0.0..1.0` constants;
- `0x006fe350..0x006fe385` programs the volume and volume-variation trackbars
  to `0..127`;
- `0x00701af8` divides the pitch trackbar position by `100` and updates the
  matching edit/internal value;
- `0x00701058` is an empty volume-variation change handler; the final save
  reads the trackbar position directly.

## Exact form-to-storage conversion

The native form load path at `decompiled_all.c:441637-441660` divides both
DWORD interval fields by `10`, assigns the integer up/down positions, and
formats those positions with two decimals. A raw value of `25000` therefore
displays as `25.00` seconds.

The save path at `decompiled_all.c:442048-442066` parses both edit values,
multiplies each by `10^3`, truncates toward zero through retail helper
`0x00B908CC`, and stores the result in the two DWORD slots. Because the exit
handlers canonicalize to two decimals, newly authored nonnegative values have
`10 ms` granularity.

The pitch save path at `decompiled_all.c:442101-442106` stores the parsed
float. The exit/trackbar handlers canonicalize the editable domain to
hundredths in `0..1`, so the web contract uses an integer hundredths token and
materializes one finite float32.

The volume-variation save path at `decompiled_all.c:442164-442166` copies the
trackbar position directly to the byte at sound-record offset `0x7e`.

## Negative interval-variation exclusion

The native `eIntervalVariationExit` handler visibly accepts negative values,
while the serialized GFF field is written through the DWORD writer. The
decompilation proves the bit-level write but does not close whether NWN runtime
interprets a wrapped high-bit DWORD as a signed delta, rejects it, or applies
another normalization. This audit therefore admits only the nonnegative
intersection `0..60000` and records negative/high-bit source values as
preserve-only. This is a deliberate no-guessing boundary, not a claim that
negative retail values are invalid.

## Preservation, CAS, and diagnostics

The backend must independently resolve `kind=sound` plus immutable native
family ordinal, reparse all four exact fields, compare the complete expected
tuple, and replace only changed tuple members. It preserves list order, struct
type ID, every unrelated GIT field, and the paired GIC bytes. The mutation may
coexist with the same sound's position mutation, but not with deletion.

Candidate reconstruction compares all four exact target storage values,
including float32 pitch equivalence, plus unrelated-field and paired-file
preservation. Persisted publication then re-reads and byte/hash-compares the
exact verified GIT/GIC candidates before its structural pair check. Atomic
ARE/GIT/GIC/IFO publication, source-hash fencing, authorization, idempotency,
journal, and recovery remain unchanged.

Routine diagnostics may expose only contract revision, object family,
bounded source ordinal, changed member names/count, stage, duration, and a
stable result code. They must not expose sound values, ResRefs, object IDs,
raw bytes, content keys, hashes, or host paths.

## Exit criteria and remaining proof

Unit, regression, round-trip, integration, determinism, candidate-readback,
persisted-readback, and production-build gates are required. Mutation testing
is optional and was not requested.

Browser edit/Save/reopen, exact application-candidate Toolset Save/Build/
reopen, and NWN audio scheduling remain separate release gates. Base volume,
negative/high-bit interval variation, `Hours`, `Times`, playback mode/order,
priority, sound-list authoring, positioning/attenuation, and runtime audio
semantics require separate source closure before activation.

## Implemented offline closure

Capability catalog revision `2026-08-25.41` implements this bounded tuple as
one source-bound mutation lane without changing the broader
`objects_sound_authoring=partial/blocked` status.

The backend now:

- parses and projects only a complete, unique, exact-type native tuple;
- binds the immutable Sound family ordinal and expected tuple in the draft;
- independently replans the mutation from the exact source GIT;
- performs complete-tuple CAS, writes only the four admitted fields, and
  preserves the paired GIC bytes;
- independently verifies candidate reconstruction and carries exact mutation
  counts through the transaction receipt.

The frontend now:

- validates and detaches exact current/source storage through the HTTP port,
  scene mapper, draft boundary, and workspace clone;
- converts only between the verified raw storage tuple and its presentation;
- enables Interval and Variation controls only when both immutable source and
  current exact storage are present;
- keeps those controls visibly preserve-only otherwise and never synthesizes
  native provenance from loose presentation values.

Accepted bounded evidence on 2026-08-25:

- backend: 9/9 suites, 1,751/1,751 assertions;
- frontend: 7/7 files, 234/234 tests;
- capability catalog: included in the backend gate above;
- backend and frontend production builds: passing.

No managed service, browser, capture, Toolset, or NWN process was started for
this closure. The release proof and excluded Sound scopes listed above remain
open.
