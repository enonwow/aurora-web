# Existing Area visual-environment catalog-selection mutation audit v1

Date: 2026-08-25  
Status: Aurora semantics, additive contract, and offline implementation verified;
browser and native runtime proof pending

## Decision

Aurora Web may admit bounded `LightingScheme : Byte` and `SkyBox : Byte`
mutation only as one catalog-bound compare-and-swap operation. The request
binds both effective-table SHA-256 values, the complete retained selection and
environment state, the target physical row ordinals, and any complete final
manual overrides. The write boundary re-resolves the effective catalogs and
rejects a stale hash or absent physical row.

The mutation is not a pair of arbitrary byte writes. When the lighting-scheme
ordinal changes, the backend first derives the complete native environment-row
target and then applies optional complete manual overrides that are reachable
through the same Toolset dialog. The explicit target Sky Box is applied last,
matching a user selecting a Lighting Scheme and then choosing a Sky Box. A
Sky-Box-only mutation changes exactly `SkyBox` and admits no environment
override.

## Primary Aurora evidence

Primary artifacts are:

- `C:/Projects/New Folder/export/decompiled_all.c`, SHA-256
  `36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572`;
- `C:/Projects/New Folder/export/functions.tsv`, SHA-256
  `394096fe106e5767ee6eceb31c8b085091359060351b1d10195e96f666bc69fe`;
- retail `nwtoolset.exe`, SHA-256
  `4c156de898817518e8a97f5d989592894d3c8f48b71d27e2a8b89500cd230f24`;
- `C:/Projects/nwn-last-city/Aurora/reverse/reverse/nwtoolset_rcdata_report.json`,
  SHA-256
  `3d9c5d29709bcf4aa037554781d229a2094f3d85370c44a6a5df9a222f8d87fa`.

No GPL source is authority or implementation input.

`FUN_00557a40` loads effective `environment.2da`, associates each Toolset item
with its zero-based physical row ordinal, and resolves its `STRREF` for display.
`FUN_00557e24` stores the selected ordinal in `LightingScheme` and calls
`FUN_00554638`. That function applies `DAYNIGHT`, all light/dark ambient,
diffuse, and fog colors, both fog amounts and shadow flags, `FOG_CLIP_DIST`,
`SHADOW_ALPHA`, rain, snow, lightning, wind, and `SKYBOX` from the selected
row. Missing `FOG_CLIP_DIST` and `SKYBOX` use native defaults `45` and `0`.

`FUN_0053f7d0` similarly binds effective `skyboxes.2da` items to physical row
ordinals, with `STRING_REF` and `LABEL` display resolution. `FUN_005524b4`
writes the selected item payload to `SkyBox`. The same function reads every
other dialog control into the Area object before Apply, so a complete final
override after scheme selection is a native-reachable state.

## Additive mutation contract

Area Update and direct Verify/Export may add:

```json
{
  "visualEnvironmentCatalogSelection": {
    "catalogIdentity": {
      "environmentSha256": "<64 lowercase hex>",
      "skyBoxesSha256": "<64 lowercase hex>"
    },
    "expectedValue": {
      "lightingSchemeRowIndex": 0,
      "skyBoxRowIndex": 0,
      "visualEnvironment": "<complete existing 16-field tuple>",
      "visualEnvironmentScalarControls": {
        "fogClipDistance": 45,
        "windPower": 0
      }
    },
    "value": {
      "lightingSchemeRowIndex": 1,
      "skyBoxRowIndex": 2,
      "visualEnvironmentOverride": "<optional complete tuple>",
      "visualEnvironmentScalarControlsOverride": "<optional complete pair>"
    }
  }
}
```

All objects use exact keys. Both ordinals are bytes and at least one selection
must change. The expected complete state is reparsed from the retained ARE.
The SHA-256 pair must equal the freshly server-resolved effective
`environment.2da` and `skyboxes.2da` descriptors. Both target physical rows
must exist.

If `lightingSchemeRowIndex` changes, the selected environment row is the base
for the complete 16-field visual tuple, scalar-control pair, and row-derived
Sky Box. Optional overrides are exact complete admitted objects and must differ
from their row base; the explicit `skyBoxRowIndex` is the final selection. If
only `skyBoxRowIndex` changes, both override members are forbidden and the
retained visual/scalar tuples remain byte-equivalent.

The catalog mutation is mutually exclusive with the existing separate
`visualEnvironment` and `visualEnvironmentScalarControls` mutations when the
lighting ordinal changes. This prevents two authorities from targeting the
same retained fields. Sky-Box-only selection may coexist with those separate
CAS operations because its writer target is disjoint.

## Safety, diagnostics, and completion gates

Candidate and persisted readback must compare the final selection pair and,
for a lighting-scheme change, the complete derived-or-overridden visual and
scalar targets. A selection-only mutation preserves every unrelated ARE field
and keeps GIT, GIC, and IFO byte-identical. The source ARE SHA-256, candidate
hash, module revision, idempotency key, journal, atomic publication, and
recovery fences remain unchanged.

The existing bounded JSON endpoint and API major version remain unchanged.
The request adds no binary body, pagination, streaming, or chunking. Routine
diagnostics may expose only contract version, whether the lighting and/or Sky
Box ordinal changed, bounded row counts, stage, duration, and a stable result
code. Hashes, source keys, display strings, Area values, raw bytes, ResRefs,
and host paths are excluded from routine log fields and metric labels.

Required offline gates cover exact-key/domain validation, stale catalog
identity, missing target rows, retained-state CAS, row application, optional
override application, Sky-Box-only preservation, writer duplicate/type/case
failure, candidate validation, persisted readback, atomic publication with
byte-identical GIT/GIC/IFO, HTTP/projector/compiler/storage wiring, frontend
transport/scene/draft/facade/dialog behavior, and production builds. Browser
Save/reopen, Toolset Save/Build/reopen, and NWN day/night, fog, weather, wind,
color, shadow, and Sky Box behavior remain separate release gates.

## Offline implementation closure

The additive slice is implemented across the HTTP schema, fresh catalog
resolution, draft projection, retained-ARE writer, candidate compiler,
independent validation readback, persisted readback, atomic publication,
frontend port/serializer, application facade, Visual dialog, and direct
Verify/Export composition. A Lighting Scheme change suppresses the separate
visual and scalar CAS members; a Sky-Box-only change retains those disjoint
members. The dialog applies the complete selected environment row and allows
complete native-reachable manual overrides before commit.

The focused bounded backend gate passed 9 suites and 132 tests, including an
independent validation-service reparse of selection, visual, and scalar fields
from candidate ARE bytes. The focused frontend gate passed 5 suites and 63
tests, the dedicated regression smoke passed, and both backend and frontend
production builds passed. These offline results do not replace the still-open
browser Save/reopen, Toolset Save/Build/reopen, or NWN runtime gates.
