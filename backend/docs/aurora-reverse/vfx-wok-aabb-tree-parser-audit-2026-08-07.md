# VFX WOK AABB tree parser audit (2026-08-07)

## Scope

This audit closes the shared ASCII WOK AABB record and tree-topology parsing gap. It
applies to every VFX collision package, including effects hosted by placeables. It does
not claim the still-unrecovered native runtime traversal order or replace the currently
profiled flat-triangle contact route.

## Sources

- Primary decompilation: `C:\Projects\New Folder\export\decompiled_all.c`
- Decompilation SHA-256:
  `36BB8B1031AFE2ABF23F0E18180A5AD649401D9EA5E078E5170A31A96167C572`
- Admitted binary: `C:\Program Files (x86)\Steam\steamapps\common\Neverwinter Nights\bin\win32\nwtoolset.exe`
- Binary SHA-256:
  `4C156DE898817518E8A97F5D989592894D3C8F48B71D27E2A8B89500CD230F24`
- No xoreos or other GPL secondary source was used.

## Primary observations

1. `FUN_00a57420` at decompilation lines 882194-882312 parses
   `%f %f %f %f %f %f %d %d` into a newly allocated `0x28`-byte record.
   Exact binary instructions at `0x00a57528-0x00a57560` establish the layout:
   six float bounds at `+0x00..+0x14`, first-child and second-child pointers at
   `+0x18/+0x1c`, face index at `+0x20`, and plane-direction mask at `+0x24`.
2. The constructor initializes face index to `-1` and plane mask to `0`. A record whose
   face index is not `-1` returns immediately and is a leaf. A record with face index
   `-1` recursively consumes the next two source lines into its child pointers at
   `0x00a57697-0x00a576c0`. The ASCII representation is therefore preorder.
3. Seven successful conversions mean no explicit plane-mask token. For an internal
   node, `0x00a576cd-0x00a57904` computes each child center as `min + max`, subtracts the
   first-child center from the second-child center, and selects the dominant absolute
   axis. X wins only when strictly greater than Y and Z; otherwise Y wins only when
   strictly greater than Z; otherwise Z wins. Positive-axis bits are `1/2/4`; zero or
   negative-axis bits are `8/16/32`.
4. Eight successful conversions preserve the eighth integer directly at `+0x24`
   (`0x00a57909-0x00a5790e`).
5. `FUN_00a3f21c`, lines 864644-864655, copies all six bounds plus face index and plane
   mask. `FUN_00a3ec10`, lines 864449-864495, reconstructs both child pointers
   recursively. `FUN_00a486d4`, lines 871287-871334, breadth-first counts the tree and
   adds exactly `0x28` bytes per record to serialized size.

The C export lost some variadic `sscanf` assignments and obscures several x87 branches.
The exact admitted-binary instructions above are authoritative for field layout, strict
comparison behavior, and bit selection.

## Previous Web gap

The parser accepted only seven numeric fields, retained every row as opaque tokens, did
not identify leaves or internal nodes, did not reconstruct preorder child links, and did
not preserve or derive Aurora's plane mask. Truncated and trailing trees were silent.

## Implementation

- `aurora-wok-walkmesh.ts` now accepts seven- and eight-field AABB records and exposes
  decoded float32 bounds, face index, plane mask, mask provenance, and child indices.
- Seven-field leaves retain Aurora's default zero mask. Seven-field internal nodes derive
  the exact source-confirmed dominant-axis bit from their two children. Eight-field masks
  remain source-owned.
- Preorder topology is reconstructed once after the complete node is parsed. Missing
  children, trailing records, and out-of-range leaf face indices emit explicit
  diagnostics.
- The serialized `aurora-area-vfx-collision/v1` input accepts these fields additively, so
  existing v1 packets without them remain valid while enriched packets are not stripped.
- There are no effect-row, model, emitter-name, Fireball, or host-category conditions.

## Regression

- Explicit eight-field source mask and complete child topology.
- Seven-field derived positive-X mask.
- Negative-Y bit selection.
- Equal X/Y/Z magnitudes falling through to positive Z.
- Truncated internal tree diagnostic.
- Enriched AABB records crossing the HTTP schema boundary.

Focused verification passed `11/11` WOK tests and `11/11` VFX schema tests.

## Runtime follow-up

The native source-tree consumer and traversal order were subsequently recovered and
implemented in v78. `FUN_00a51e10` obtains the model root and delegates to
`FUN_00a51950`, which applies the source plane mask, direction-dependent child order,
and a shared shortened endpoint. Aurora's separate scene plane-BSP traversal in
`FUN_00b2e294` remains distinct and is not reconstructed from the ASCII WOK tree.

Detailed evidence and verification:
`vfx-wok-aabb-runtime-traversal-audit-2026-08-07.md`.
