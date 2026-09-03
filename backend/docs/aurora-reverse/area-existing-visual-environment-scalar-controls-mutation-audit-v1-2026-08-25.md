# Existing Area visual-environment scalar-controls mutation audit v1

Date: 2026-08-25  
Status: Aurora semantics and offline implementation verified; runtime proof pending

## Decision

Aurora Web may expose one additive, transactional compare-and-swap mutation
for the two native scalar controls below when the retained ARE contains exactly
one case-sensitive field with the exact native GFF type and an admitted value:

```text
FogClipDist : Float   integer-valued 30..9999 metres
WindPower   : Int     integer 0..2
```

The web contract names the complete pair `visualEnvironmentScalarControls`
and its members `fogClipDistance` and `windPower`. Both the expected and target
objects contain exactly both members. At least one member must change. A
fractional, non-finite, missing, duplicate, wrong-case, wrong-type, or
out-of-domain source value is preserve-only. The writer never synthesizes a
missing field and never converts an unadmitted retained float.

`LightingScheme` and `SkyBox` remain preserve-only in this checkpoint. They
are physical row ordinals selected from the effective `environment.2da` and
`skyboxes.2da` tables respectively, so admitting arbitrary byte values would
not reproduce the native Toolset semantics.

## Primary Aurora evidence

Primary artifacts:

- `C:/Projects/New Folder/export/decompiled_all.c`, SHA-256
  `36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572`;
- `C:/Projects/New Folder/export/functions.tsv`, SHA-256
  `394096fe106e5767ee6eceb31c8b085091359060351b1d10195e96f666bc69fe`;
- retail `nwtoolset.exe`, SHA-256
  `4c156de898817518e8a97f5d989592894d3c8f48b71d27e2a8b89500cd230f24`;
- `C:/Projects/nwn-last-city/Aurora/reverse/reverse/nwtoolset_rcdata_report.json`,
  SHA-256
  `3d9c5d29709bcf4aa037554781d229a2094f3d85370c44a6a5df9a222f8d87fa`.

No GPL source is implementation authority or evidence for this decision.

### Native ARE storage

The ARE reader in `decompiled_all.c:255194-255233` reads `WindPower` through
the native `Int` getter and stores its low byte, reads `FogClipDist` through
the native `Float` getter, and reads `SkyBox` and `LightingScheme` through the
native `Byte` getter.

The ARE writer in `decompiled_all.c:255903-255912` writes
`LightingScheme : Byte`, `FogClipDist : Float`, `SkyBox : Byte`, and
`WindPower : Int`. This closes the exact case-sensitive labels and physical
types used by the retained-field writer.

### Fog Clip Distance domain

RCDATA form `TDLGENVIRONMENT` has RVA `0x00AFAD84`, size `9248`, and exposes
`eFogClipDistance` with `udFogClipDistance`. In `FUN_0053f4c8`:

- `decompiled_all.c:199649` sets the control minimum to `30`;
- `decompiled_all.c:199656` sets the maximum to `9999`;
- `decompiled_all.c:199663` sets its initial position to `45`.

`FUN_00551a3c` at `208708-208709` converts the retained float to the integer
up/down position. `FUN_005524b4` at `209022-209024` reads that integer position
and explicitly casts it back to `float`. The native authoring surface is
therefore integer-valued even though ARE storage is `Float`; retaining a
fractional source is intentionally not admitted by this web mutation.

### Wind Power domain

The same RCDATA form serializes `tbWindPower` as a `TTrackBar`. In the exact
retail binary, form file offset `0x009F4384` plus relative offset `0x18B0`
contains the property sequence:

```text
03 4D 61 78 02 02
```

This is the short-string property name `Max`, Delphi `vaInt8`, and value `2`.
No nonzero `Min` is serialized, and the control is initialized at position
`0`. `FUN_00551a3c` at `208720` loads the retained byte into the trackbar;
`FUN_005524b4` at `209053-209054` copies the trackbar position back to the
dialog byte. Together with the native `Int` ARE reader/writer, this closes the
editable domain to the three integer positions `0`, `1`, and `2`.

### Catalog-backed fields remain blocked

`FUN_00557a40` at `211481-211604` opens effective `environment.2da`, creates
one lighting-scheme list item per physical row, resolves `STRREF`, and stores
the physical row ordinal as item data. `FUN_00557e24` at `211637-211655`
stores the selected ordinal in the `LightingScheme` byte and applies the
entire selected environment row.

`FUN_0053f7d0` at `199699-199902` opens effective `skyboxes.2da`, iterates its
physical rows, resolves `STRING_REF` with `LABEL` fallback, and populates the
Sky Box combo in row order. `FUN_005524b4` at `209025-209038` stores the
selected item payload in the `SkyBox` byte. These are catalog selections, not
free numeric controls. Their effective-table provenance and row application
contract must be implemented before they can be admitted.

## Additive contract and safety invariants

Area detail additively exposes the scalar profile only when both exact source
fields are admitted. Area Update accepts one full-pair CAS:

```json
{
  "visualEnvironmentScalarControls": {
    "expectedValue": { "fogClipDistance": 45, "windPower": 0 },
    "value": { "fogClipDistance": 120, "windPower": 2 }
  }
}
```

The backend reparses the retained ARE independently, compares the complete
expected pair, and replaces exactly `FogClipDist` and `WindPower`. Candidate
and persisted readback compare the complete target pair. The source ARE
SHA-256 and exact candidate hash remain transaction fences. A scalar-only
mutation leaves the existing 16-field visual core, `LightingScheme`, `SkyBox`,
every unrelated ARE field, and GIT/GIC/IFO companions byte-equivalent.

The existing bounded Area Update JSON body, authorization, idempotency,
journal, atomic publication, recovery, and error envelope remain unchanged.
The fixed pair adds no endpoint, binary body, pagination, streaming, or
chunking. Routine diagnostics may expose only schema version, changed-field
count, stage, duration, and a stable result code; environment values, ResRefs,
content keys, raw bytes, and host paths remain excluded.

## Required TDD and completion gates

Tests must cover exact-key validation, all four numeric boundaries, fractional
and non-finite rejection, missing/duplicate/wrong-case/wrong-type source
fields, parser dependency identity, full-pair CAS, stale and unchanged
rejection, unrelated-field preservation, candidate and persisted readback,
HTTP validation, projector/compiler/storage wiring, frontend transport/scene/
draft/facade/UI behavior, round-trip atomic publication with byte-identical
GIT/GIC/IFO companions, Save/reopen regression, and production builds.

Browser proof must show an incremental fog-distance update and Save/reopen.
Toolset Save/Build/reopen and NWN fog-end and wind behavior remain separate
release gates. This audit admits implementation; it does not claim runtime or
native certification.

## Offline implementation checkpoint

Capability catalog revision `2026-08-25.38` implements the admitted pair end
to end. Backend domain validation, exact ARE parsing, dependency identity,
strict full-pair HTTP CAS, preserve-first retained-field writing, immutable
draft projection, candidate validation, transaction storage, persisted
semantic readback, and cache identity all carry the exact pair. The Area
Update integration case independently reparses the published ARE and verifies
the target while GIT, GIC, and module IFO remain byte-identical.

Frontend HTTP, scene mapping, persisted workspace validation, application
facade, Visual dialog, direct Verify/Export, and local Save/reopen flows carry
detached source and target pairs. Apply replaces only `FogClipDist` and
`WindPower` in renderer lighting; the 16-field visual core,
`LightingScheme`, `SkyBox`, and unrelated fields remain present.

Accepted offline evidence on 2026-08-25 is 77/77 focused backend unit
assertions, 30/30 Area Update integration assertions, 154/154 impacted
frontend unit/component assertions, 1/1 dedicated frontend regression-smoke
assertion, 12/12 immutable capability-catalog assertions, and passing backend
and frontend production builds. No managed service, browser capture, Toolset,
or NWN process was started or stopped because the coordinated VFX task retained
the shared runtime lane.
