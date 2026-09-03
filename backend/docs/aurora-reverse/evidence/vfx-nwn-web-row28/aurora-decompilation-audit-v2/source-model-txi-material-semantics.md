# Source-model TXI material semantics audit

Date: 2026-08-21

## Scope

This audit closes the material-state gap exposed by the fresh row-28 Web v9
proof. The source-model bind-space repair made the converted meshes visible,
but ordinary Three.js blending rendered the flame geometry as opaque black and
orange tubes.

## Exact source evidence

The selected retail texture sidecar is
`backend/docs/aurora-reverse/evidence/vfx-nwn-web-row28/sources/fxpa_flame02.txi`.
Its SHA-256 is
`8c4f5619625c4181559767eb4fe2531716037f48525287d85ab87fd258037dd6` and it
contains these behavior fields:

```text
proceduretype cycle
numx 4
numy 4
fps 32
blending additive
decal 1
```

The binary MDL mesh fields do not provide an alternative material selector for
this case. Every inspected Rock and Cylinder node has `render=1`,
`transparencyHint=0`, and `renderHint=0`. The material behavior therefore must
not be inferred from a mesh name, VFX identity, or a guessed render hint.

## Aurora decompilation anchors

In `C:/Projects/New Folder/export/decompiled_all.c`, `FUN_00a46b68` at
approximately lines 869929-870017 parses the material/TXI `blending` token.
The exact `additive` token writes material fields `+0x48 = 0` and `+0x4c = 2`;
`punchthrough` writes `+0x48 = 2` and `+0x4c = 3`. The same parser reads
`decal` into material field `+0x50`.

`FUN_00a471d0` at approximately lines 870224-870237 tests the additive field
pair `(0, 2)` and selects the no-depth-write state. The source-model render path
`FUN_00a5f73c` at approximately lines 887890-887968 applies that material state
before binding textures and drawing the mesh. Existing particle-render evidence
in `vfx-full-decomp-gap-audit-2026-07-14.md` independently records the recovered
additive blend factors as `GL_SRC_ALPHA, GL_ONE`.

The same `FUN_00a5f73c` render path distinguishes material field `+0x50`
directly. When the field is nonzero, it submits white `(1, 1, 1)` plus the
evaluated mesh alpha instead of submitting the lit ambient/diffuse/specular
material colors. This makes `decal 1` an unlit-white textured color lane. The
branch does not write the face-culling state. Therefore `decal` must not be
translated to `THREE.DoubleSide`; source mesh/material culling must be retained
unless a separately recovered source render-state field changes it.

## Confirmed implementation defect

The row-28 proof-fixture TXI parser preserved only sampler/downsample fields.
It dropped `blending`, `decal`, and the cycle atlas fields before the manifest
reached the canonical renderer. The converted GLB consequently retained a
normal, depth-writing `MeshStandardMaterial`, even though the exact sidecar
selected Aurora's additive material lane.

The first transport repair exposed two further generic renderer defects in the
fresh Web v10 proof: the shared texture adapter forced every mapped material to
`THREE.DoubleSide`, and the TXI decal path repeated that override while still
installing source-MDL lighting. Both choices contradicted the render branch
above and produced oversized bright tubes/arcs rather than source-facing,
unlit-white textured flame surfaces.

## Asset-neutral repair contract

The repair must:

1. parse the supported TXI fields for every texture through one generic parser;
2. carry those fields in a typed texture-state contract;
3. apply the existing shared Aurora model-material adapter to source-model and
   Chunk-model geometry;
4. select additive/decal/cycle behavior only from the parsed TXI values;
5. translate `decal 1` to the generic unlit-white color lane without replacing
   source face-culling state;
6. skip source-MDL lighting for that decal lane; and
7. expose the applied state in material and proof diagnostics.

No VFX constant, row, resref, filename, fixture ID, model name, or node name may
select material behavior or numeric parameters.

## Proof status

This audit authorizes implementation. It does not claim visual parity. A fresh
Aurora Web MP4, trigger-aligned NWN-vs-Web MP4, contact sheet, automated gates,
and visual classification remain required after implementation.
