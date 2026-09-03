# Existing Area visual-environment core mutation audit v1

Date: 2026-08-25  
Status: offline implementation verified; browser, Toolset, and NWN proof pending

## Decision

Aurora Web may expose a transactional edit of an existing Area's admitted
visual-environment core when the retained ARE contains exactly one
case-sensitive field of the native GFF type for every member below:

```text
DayNightCycle : Byte       IsNight          : Byte
ShadowOpacity : Byte       ChanceRain       : Int
ChanceSnow    : Int        ChanceLightning  : Int
SunAmbientColor  : DWord   SunDiffuseColor  : DWord
SunFogColor      : DWord   SunFogAmount     : Byte
SunShadows       : Byte    MoonAmbientColor : DWord
MoonDiffuseColor : DWord   MoonFogColor     : DWord
MoonFogAmount    : Byte    MoonShadows      : Byte
```

The admitted domain is one complete immutable tuple:

- `dayNightMode`: `cycle | always_day | always_night`;
- `shadowOpacity`, `chanceRain`, `chanceSnow`, and `chanceLightning`: integers
  `0..100`;
- sun and moon `ambientColor`, `diffuseColor`, and `fogColor`: packed RGB
  integers `0x000000..0xffffff`;
- sun and moon `fogAmount`: integers `0..15`;
- sun and moon `shadows`: booleans.

The day/night modes map exactly to the two native bytes:

```text
cycle        -> DayNightCycle=1, IsNight=0
always_day   -> DayNightCycle=0, IsNight=0
always_night -> DayNightCycle=0, IsNight=1
```

Any other byte pair, missing field, duplicate case-insensitive label, wrong
case, wrong type, or out-of-domain value makes the complete profile
preserve-only. The writer never synthesizes a missing field and never admits a
partial visual-environment tuple.

`LightingScheme`, `SkyBox`, `WindPower`, and `FogClipDist` remain
preserve-only in this checkpoint. Their native storage types are known, but
their editable catalog/range semantics are not yet source-closed. They and
every unrelated ARE field must remain byte-equivalent after the mutation.

## Primary Aurora evidence

Primary artifacts:

- `C:/Projects/New Folder/export/decompiled_all.c`, SHA-256
  `36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572`;
- `C:/Projects/New Folder/export/functions.tsv`, SHA-256
  `394096fe106e5767ee6eceb31c8b085091359060351b1d10195e96f666bc69fe`;
- `C:/Projects/nwn-last-city/Aurora/reverse/reverse/nwtoolset_rcdata_report.json`,
  SHA-256
  `3d9c5d29709bcf4aa037554781d229a2094f3d85370c44a6a5df9a222f8d87fa`;
- `C:/Projects/nwn-last-city/Aurora/reverse/runs/LC_AURORA_RE_ARTIFACT_2026-05-18_0903_toolset_area_environment_surface_matrix.json`,
  SHA-256
  `56c05c7fc2e2095679003cfada1fc06a4b9aadb3ad88bd988fceb13bdab998e3`.

No xoreos or other GPL source was inspected or used.

### Native ARE reader and writer

At `decompiled_all.c:255188-255233`, the ARE reader loads the three weather
chances as `Int` and casts them into byte members. It loads sun/moon colors as
`DWord`, fog amount and shadows as `Byte`, `ShadowOpacity` as `Byte` with
default `50`, `IsNight` as `Byte`, and `DayNightCycle` as `Byte` with default
`1`.

At `decompiled_all.c:255888-255912`, the ARE writer emits the same exact native
types: `FUN_00aefe60` for the color `DWord` fields, `FUN_00aefd1c` for the byte
fields, and `FUN_00aefecc` for the three weather `Int` fields sourced from the
retained byte members.

### Area Properties transfer and Toolset surface

`FUN_00553710` at `decompiled_all.c:209753-209782` copies the complete
environment state from the Area object into the Area Properties dialog.
`FUN_00553f70` and `FUN_0055404c` at `209814-209939` copy the same members back
to the Area object. The native dialog therefore mutates Area state before the
ordinary ARE writer serializes it.

RCDATA form `TDLGENVIRONMENT` has RVA `0x00AFAD84`, size `9248`, and exposes
Moon/Sun ambient, diffuse and fog colors, fog amounts and shadows; weather
`% Snow`, `% Rain`, and `% Lightning`; `Shadow Opacity`; and the three
day/night choices `Cycle Day and Night`, `Always Day`, and `Always Night`.
The form also exposes Sky Box, Wind Power and Fog Clip Distance, but those
controls do not by themselves close their catalogs or editable ranges.

At `decompiled_all.c:256634-256684`, Toolset token `cycle` writes `(1,0)`,
token `light` writes `(0,0)`, and the remaining dark branch writes `(0,1)` to
`(DayNightCycle, IsNight)`. This closes the three-mode mapping above.

### Renderer value semantics

At `decompiled_all.c:368987-369024`, the runtime chooses sun or moon fields by
`IsNight`, unpacks packed color bytes in low-byte red, then green, then blue
order, normalizes them by `255`, and computes fog start as:

```text
25 - FogAmount * 25 / 15
```

This closes the packed 24-bit RGB interpretation and the `0..15` fog scale.
At `decompiled_all.c:256306`, `ShadowOpacity` is normalized by division by
`100`, closing the percent scale. The Toolset RCDATA `%` weather labels close
the admitted UI-safe `0..100` chance scale.

## Frozen additive contract and safety invariants

Area detail and scene contracts add `visualEnvironment` only when the entire
profile is admitted. Area Update additively accepts one full-tuple CAS pair:

```json
{
  "visualEnvironment": {
    "expectedValue": { "dayNightMode": "cycle", "shadowOpacity": 50 },
    "value": { "dayNightMode": "always_night", "shadowOpacity": 65 }
  }
}
```

The abbreviated example omits the required sun, moon, and weather members for
readability; the real payload requires the exact complete key set. Unknown
keys, malformed tuples, an unchanged pair, missing source provenance, or stale
`expectedValue` fail the complete update.

Candidate compilation reparses the retained ARE and replaces exactly the 16
mapped fields. Candidate and persisted readback compare the full target tuple.
For a visual-environment-only update, GIT, GIC, and IFO resources remain
byte-identical. The existing source ARE SHA-256 remains the transaction fence,
and publication retains the exact candidate resource hash.

The request uses the existing bounded Area Update JSON body: no endpoint,
binary body, pagination, chunking, or streaming is added. The fixed tuple is
well below one KiB. Routine logs and metric labels may expose only schema
version, changed-field count, stage, duration, and stable result code. Colors,
environment values, ResRefs, content keys, raw bytes, and host paths are not
logged.

## Required TDD and completion gates

Tests must cover exact domain validation/equality, every boundary, illegal
day/night pair rejection, missing/duplicate/wrong-case/wrong-type fields,
parser dependency identity, full-tuple CAS, stale/unchanged rejection,
unrelated-field preservation, candidate and persisted readback, HTTP schema,
projector/compiler/storage wiring, frontend transport/scene/draft/facade/UI,
round-trip integration with byte-identical GIT/GIC/IFO companions, regression
Save/reopen flow, and production builds.

Browser proof must demonstrate an incremental renderer update and Save/reopen.
Toolset Save/Build/reopen and NWN day/night, fog, color, weather, and shadow
behavior remain separate release gates. This audit admits implementation; it
does not claim runtime/native certification.

## Offline implementation checkpoint

The admitted profile is implemented end to end in the offline application
path. Backend domain validation, exact ARE parsing, dependency identity,
strict HTTP CAS validation, retained-field writer replacement, source-bound
draft projection, independent candidate validation, processing/cache mapping,
transaction storage, and persisted semantic readback all carry the complete
tuple. A visual-only atomic publication independently reparses the target ARE
and proves byte-identical GIT, GIC, and module IFO companions.

The frontend validates and detaches Area detail input, maps the exact tuple to
`areaVisualEnvironment`, rejects malformed persisted drafts, builds source-
bound full-tuple CAS, and exposes the admitted controls in the Aurora-shaped
Visual tab. Applying a valid target updates only the scene tuple, mutation
identity, and the 16 corresponding `lighting.fields`; unrelated
`LightingScheme`, `SkyBox`, `WindPower`, and `FogClipDist` presentation fields
are retained. Direct Verify/Export serializes the same nested CAS through the
existing application port. The four excluded controls remain visible and
disabled as preserve-only.

Follow-on checkpoint: `FogClipDist` and `WindPower` are now separately
source-closed and implemented through the additive exact-pair contract in
`area-existing-visual-environment-scalar-controls-mutation-audit-v1-2026-08-25.md`.
Only `LightingScheme` and `SkyBox` remain disabled catalog-backed controls;
the core tuple contract and evidence counts below remain historical evidence
for that bounded checkpoint.

Accepted bounded evidence on 2026-08-25 is:

- 76/76 focused backend unit assertions across nine visual-environment,
  storage, and processing suites;
- 28/28 Area Update atomic-publication integration assertions, including the
  visual-only byte-preservation case;
- 241/241 impacted frontend domain, boundary, mapper, facade, dialog, and
  export assertions;
- 1/1 dedicated frontend local Save/reopen regression-smoke assertion;
- 12/12 immutable capability-catalog assertions at revision
  `2026-08-25.35`;
- successful backend and frontend production builds.

No managed service, browser, capture, Toolset, or NWN process was started or
stopped for this checkpoint because the coordinated VFX task retained the
shared runtime lane. The browser incremental-render/Save/reopen proof, exact-
candidate Toolset Save/Build/reopen, and NWN behavior proof remain mandatory.
