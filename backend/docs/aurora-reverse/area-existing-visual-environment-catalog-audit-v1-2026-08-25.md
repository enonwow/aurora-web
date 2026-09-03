# Existing Area visual-environment effective-catalog audit v1

Date: 2026-08-25  
Status: Aurora semantics and offline read contract verified; mutation and runtime proof pending

## Decision

Aurora Web may expose one bounded, all-or-nothing effective catalog bundle for
the native Area `Lighting Scheme` and `Sky Box` selectors. The bundle is
resolved with module, ordered-HAK, and configured retail-vanilla precedence and
contains the physical rows of exact `environment.2da` and `skyboxes.2da`
sources. Every source descriptor carries the resource name, source layer,
source object key, SHA-256, byte size, and physical row count.

This checkpoint does not admit arbitrary `LightingScheme : Byte` or
`SkyBox : Byte` mutation. A future write contract must bind the requested
physical row ordinals to the server-resolved source hashes. Selecting a
lighting scheme must apply the complete native environment-row target rather
than changing only the retained byte.

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

No GPL source is used as authority or implementation input.

### Physical-row identity

`FUN_00557a40` opens effective `environment.2da`, walks its physical rows in
order, resolves each `STRREF`, and stores the physical ordinal as list-item
data. `FUN_00557e24` copies the selected ordinal into `LightingScheme` and
calls `FUN_00554638` to apply the complete row.

`FUN_0053f7d0` opens effective `skyboxes.2da`, walks physical rows in order,
resolves `STRING_REF` with `LABEL` fallback, and associates each item with the
physical ordinal. `FUN_005524b4` writes the selected item payload to `SkyBox`.
Textual 2DA row labels are therefore not the stored byte identity.

### Environment-row application

The exact column reads in `FUN_00554638` cover:

- `DAYNIGHT`;
- light and dark ambient, diffuse, and fog RGB triplets;
- `LIGHT_FOG`, `DARK_FOG`, `LIGHT_SHADOWS`, and `DARK_SHADOWS`;
- `FOG_CLIP_DIST`, `SHADOW_ALPHA`, `RAIN`, `SNOW`, `LIGHTNING`, `WIND`, and
  `SKYBOX`.

The admitted `DAYNIGHT` tokens are exactly `cycle`, `light`, and `dark`, mapped
to Aurora Web `cycle`, `always_day`, and `always_night`. RGB channels are
packed with red in the low byte (`red | green << 8 | blue << 16`). Missing
`FOG_CLIP_DIST` and `SKYBOX` columns take the native defaults `45` and `0`.
Malformed rows, unknown tokens, non-integral derived percentages, invalid
domains, duplicate admitted columns, or more than 256 physical rows fail the
entire effective bundle closed.

## Additive read contract

Area detail may add `visualEnvironmentCatalogs` with schema version
`area-visual-environment-catalogs.v1`. It contains exact `lightingSchemes` and
`skyBoxes` catalogs. Lighting rows expose their physical ordinal, display
provenance, complete native-applied 16-field visual target, scalar-control
target, and derived Sky Box ordinal. Sky Box rows expose their physical
ordinal and display provenance. Mutable boundaries deep-clone descriptors,
rows, nested sun/moon values, and scalar controls.

Area detail independently exposes `visualEnvironmentCatalogSelection` only
when the retained ARE contains exactly one case-sensitive
`LightingScheme : Byte` and one `SkyBox : Byte`. The exact pair contains
`lightingSchemeRowIndex` and `skyBoxRowIndex`, each `0..255`. Missing,
duplicate, wrong-case, wrong-type, partial, or out-of-domain storage omits the
pair and keeps the selectors preserve-only. The pair participates in parser
dependency identity and Area processing-cache identity.

The complete bundle is capped at 2 MiB, each effective 2DA source at 16 MiB,
and each table at 256 physical rows. It is detail-only, participates in Area
processing-cache identity, and adds no endpoint, binary body, pagination,
streaming, authorization, or publication behavior. Failure to resolve either
table omits the complete bundle and keeps both selectors preserve-only.

Routine diagnostics may expose only resource class, source layer, bounded row
count, stage, duration, and a stable result code. Source object keys, table
contents, display text, raw bytes, Area values, and host paths must not appear
in routine logs or metric labels.

## Required completion gates

The read slice requires exact retained-selection parsing, exact-bundle,
precedence, TLK/label fallback,
deep-clone, lazy-detail hydration, cache-identity, frontend boundary, persisted
draft, and production-build tests. Mutation additionally requires a hash-bound
selection CAS, retained-field parser/writer tests, catalog re-resolution at
write time, complete candidate and persisted readback, atomic publication,
frontend selection/application behavior, and Save/reopen coverage.

Browser incremental-render and Save/reopen proof, Toolset Save/Build/reopen,
and NWN day/night, fog, weather, wind, color, shadow, and sky behavior remain
separate release gates.
