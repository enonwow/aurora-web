# VFX tile source-light slot-count Aurora-first audit (2026-08-07)

## Decision

A non-zero ARE `Tile_SrcLight1` or `Tile_SrcLight2` value does not by itself
create a runtime light. Aurora first queries the exact tile model's source-slot
count. It creates `fx_flame01` at `sourcelight1` only when the count is greater
than zero, and at `sourcelight2` only when the count is greater than one.

Aurora Web must therefore render a source light only from a typed, resolved
source-precedence MDL slot. A non-zero ARE reference whose slot is absent is a
source-backed omission, not an unresolved parity gap. There is no tile-center
or loaded-GLB-node fallback.

No xoreos source was used.

## Primary Aurora Evidence

Admitted Toolset binary:

- `nwtoolset.exe` SHA-256
  `4c156de898817518e8a97f5d989592894d3c8f48b71d27e2a8b89500cd230f24`;
- source class: `primary-aurora-decompilation`.

`FUN_007125ec` in
`C:/Projects/New Folder/export/decompiled_all.c:453500-453602` proves the two
independent gates:

1. the source-1 byte at tile offset `+0x42` is checked;
2. model-instance virtual slot `+0x74` returns the available source-slot count;
3. `fx_flame01` named `sourcelight1` is created only when `count > 0`;
4. the source-2 byte at tile offset `+0x43` is checked;
5. the same slot count is queried again;
6. `fx_flame01` named `sourcelight2` is created only when `count > 1`.

The separately admitted `fx_flame01.mdl` and the existing source-light color
audit establish that the ARE source row selects a numeric animation on
`AuroraLight01`. Retail `PartLight::PartLight` independently establishes the
missing multiplier default as `1.0`.

## Exact Row-22 Classification

The regenerated fixture parses the exact source-precedence tile MDLs before
conversion:

| Tile instance | Model | Non-zero source refs | MDL source slots | Result |
| --- | --- | ---: | ---: | --- |
| `tile-0` | `tin01_h01_02` | 2 | 1 | source 1 resolved, source 2 absent |
| `tile-1` | `tin01_h01_03` | 0 | 0 | no source lane |
| `tile-2` | `gin01_h01_08` | 2 | 0 | both absent |
| `tile-3` | `gin01_h01_08` | 2 | 0 | both absent |

The aggregate is therefore:

- resolved source slots: `1`;
- source-backed absent references: `5`;
- unresolved source references: `0`;
- resolved native main lights: `6`.

The former wording "five unresolved source-carrier lights" was incorrect. The
five references have no matching Aurora slots and must not produce carriers.

## Implementation Contract

1. Parse the exact source-precedence tile MDL before GLB conversion.
2. Count direct dummy `sl1/sl2` nodes owned by the tile model root.
3. Carry a discriminated `sourceNode` contract across backend, HTTP, scene,
   renderer, fixture, and proof boundaries.
4. `source-node-resolved` carries slot index/count, exact Aurora-local
   transform, model key/hash, and proof status.
5. `source-node-absent-by-aurora-slot-count` carries the same provenance but no
   position and creates no `PointLight`.
6. A missing/unreadable source model remains genuinely unresolved and fails
   parity readiness; it is not converted to an absent-by-count claim.
7. Production rendering never anchors a source light at tile center and never
   infers the slot from a loaded GLB node.
8. Telemetry reports resolved, absent-by-count, and unresolved counts
   separately. Only unresolved entries are proof blockers.

## Verification

- Regenerated row-22 fixture status:
  `resolved-source-1:absent-source-5:unresolved-source-0:resolved-main-6:unresolved-main-0`.
- Frontend renderer, HTTP, and proof-runner focused tests pass; the unrelated
  creature `classId` expectation in `areaSceneMapper.test.ts` remains outside
  this change.
- Backend repository, cache, and lighting-evidence focused tests pass.
- A fresh single-playback Web proof must use the saved NWN MP4. The historical
  v71 pixels already rendered one source light, but its telemetry classified
  the other five references before this audit and is superseded semantically.

## Superseded Documents

This audit supersedes the source-slot interpretation in
`vfx-row22-local-tile-lighting-audit-2026-07-20.md`. It does not supersede the
separate `fx_flame01` animation-color, radius, falloff, or multiplier findings.
