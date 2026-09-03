# Aurora source-model baked bind-space reparenting audit

Date: 2026-08-21

Status: implementation and regression validation complete; fresh NWN-vs-Web
visual proof pending

## Scope and authority

- Primary Aurora semantic authority: the admitted Toolset decompilation and
  controller audit bound in
  `../../../vfx-row28-falling-meteor-aurora-decompilation-audit-2026-08-21.md`.
- Installed Toolset SHA-256:
  `4c156de898817518e8a97f5d989592894d3c8f48b71d27e2a8b89500cd230f24`.
- Local decompiler export SHA-256:
  `36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572`.
- Retail source model: `vff_rainmeteor.mdl`, SHA-256
  `ea57f0346166314602d9d473873cedde791f9911ef90722c114481a0b6ebf29b`.
- Immutable retail runtime oracle: `../nwn-runtime/v1/capture/nwn-row28-meteor-swarm-one-trigger-v8.mp4`,
  SHA-256 `bdddeb001cf59bb2d6476909adc3b1d022674b06b59749f39fc11fc290dc31de`.
- xoreos used: no.
- No Toolset or NWN process was launched for this audit. The admitted immutable
  runtime oracle remains unchanged.

## Aurora constraint

The recovered controller path in `decompiled_all.c:844645-845128` evaluates
node-local controller values and applies them through the shared model-node
hierarchy. The row-28 source model independently supplies the exact parent
edges and direct transforms. Aurora therefore applies one composed
parent-to-child transform to a mesh at render time; a child does not receive
its ancestor transform twice.

This audit does not infer any missing material or transparency behavior. It is
limited to the already recovered model-node transform contract.

## Confirmed Aurora Web representation mismatch

The derived MDL-to-GLB converter intentionally flattens renderable geometry:

- ASCII conversion calls `resolveAsciiWorldMatrix()` and transforms every
  vertex through the full ancestor chain before GLB assembly;
- binary conversion calls `resolveBinaryWorldMatrix()` and performs the same
  world transform;
- `convertAuroraPositionToGltf()` then applies the shared Aurora Z-up to glTF
  Y-up coordinate conversion;
- emitted glTF mesh nodes have no node transform or hierarchy. Their vertices
  already contain the source bind-world transform.

The relevant implementation is in
`backend/src/modules/runtime-settings/adapters/outbound/derived/aurora-mdl-ascii-to-glb.converter.ts`:
the ASCII world bake around lines `505-508`, the binary world bake around
`1311-1322`, hierarchy composition around `2324-2355` and `3682-3730`, and
flat glTF node emission around `3190-3245`.

The canonical renderer then reparents each flat GLB mesh below its live Aurora
graph node. The previous compensation subtracted only that node's local bind
position. It did not remove:

- any ancestor translation;
- the node or ancestor rotation;
- the node or ancestor scale.

For a nested child this produced the invalid transform
`M_live_world * T_local^-1 * p_baked_world`. Since `p_baked_world` already
contained the ancestor chain, the parent was applied again. Row-28 cylinder
flames consequently occupied world bounds tens of units outside the proof
stage even though their source graph and material references were present.

## Asset-neutral correction

For every source-graph mesh, the renderer now constructs the direct bind-world
matrix from arbitrary graph parent edges and direct position, orientation, and
uniform scale. Before reparenting the flat GLB mesh, it applies the generic
compensation:

`p_world(t) = M_live_world(t) * inverse(M_bind_world) * p_baked_world`

At bind pose, `M_live_world = M_bind_world`, so baked geometry remains at its
single source-authored world position. During animation, the live transform
delta is applied exactly once. The compensation also preserves any preexisting
GLB object transform and refuses inversion of a singular bind matrix.

No branch selects behavior by VFX ID, 2DA row, resref, filename, model name,
node name, texture name, tile identity, creature identity, placeable identity,
or asset category.

## Regression evidence

The neutral regression in
`frontend/tests/unit/modules/layout/auroraVfxCanonicalRenderer.test.ts` uses
arbitrary parent, child, emitter, and animation names. It supplies:

- a translated, rotated, and scaled parent;
- a translated, rotated, and scaled child;
- parent and child vertices already baked into their respective bind-world
  spaces;
- an animated parent translation after bind.

Before the correction, the child center was rendered at `x=8.121320343559642`
instead of the source-required `x=6`. After the shared matrix correction, both
the child and independent parent geometry match their expected live-world
centers.

Focused canonical renderer result: `82/82` passing. Frontend TypeScript and
production Vite build also pass.

## Claim boundary

This closes the baked-bind-space double-transform defect. It does not by itself
claim material parity, postprocess parity, camera parity, retail RNG parity, or
overall VFX parity. Acceptance still requires a fresh guarded Aurora Web MP4,
an aligned comparison against the immutable NWN MP4, a frame contact sheet,
all proof gates, and an honest visual classification.
