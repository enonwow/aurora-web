# VFX placeable emitter reflected-orientation audit

Date: 2026-08-13

Status: shared preview adapter corrected test-first.

## Scope and evidence

- Aurora-first: yes.
- Primary semantic evidence: the admitted Aurora particle/model transform
  decompilation recorded in `vfx-coordinate-system-decomp-audit-2026-07-14.md`
  and `vfx-particle-spread-render-orientation-audit-2026-07-19.md`.
- Primary source witness: exact binary `vim_negdeath.mdl`; `Smoke01` has axis
  `[-1,0,0]` and angle `1.5707999514` radians.
- xoreos used: no.

The established Aurora-to-Three vector map is `C=(x,z,y)`. Its determinant is
`-1`, so it is a reflection. An axis-angle orientation must be transformed by
matrix conjugation:

```text
R_three = C * R_aurora * inverse(C)
axis_three = -C * axis_aurora
angle_three = angle_aurora
```

Mapping the axis as an ordinary vector, `C*axis`, reverses the rotation.

## Defect classification

The canonical runtime renderer already uses `-C*axis` for particle and model
graph orientation. The separate source-MDL preview path in
`workspacePlaceableModelPresentation.ts` used `C*axis` in
`resolveAuroraEmitterTransformQuaternion`. That path is shared by catalog VFX,
Area/placeable emitter previews, and static or animated source-MDL emitter
nodes.

Consequences included inverted local motion for any non-zero emitter
orientation. For the row-50 `Smoke01` witness, the old preview transform sends
the vertical emitter plane in the opposite direction. This explains a real
placeable/preview defect, but it does not retroactively invalidate row-50 proof
v16 because that proof uses the already-correct canonical renderer.

## Implementation

The preview adapter now uses one `mapAuroraRotationAxisToThree` helper which:

1. applies the shared `(x,z,y)` vector map;
2. negates the mapped axis exactly once;
3. serves static emitter orientation and every sampled orientation timeline;
4. leaves positions, velocities, scales, P2P targets, and the canonical
   renderer unchanged.

No model, emitter name, row, VFX category, or placeable-specific condition was
added.

## Test-first verification

The focused regression changed the expected mapped axis for source
`axis=[1,0,0], angle=pi/2` from `[1,0,0]` to `[-1,0,0]` and required local
Fountain travel to reverse accordingly. Before implementation it failed with:

```text
expected [1,0,0] to deeply equal [-1,-0,-0]
```

After the shared correction:

- focused reflected-orientation regression: passed;
- complete `workspaceObjectMeshLayer.vfxRenderMode.test.ts`: `124/124`
  passed;
- static and animated orientation timelines use the same helper.

A fresh placeable visual proof should exercise a source-MDL emitter with a
non-zero orientation and compare it against its saved NWN/Aurora oracle. Tests
alone prove the transform contract, not final visual parity.
