# VFX Placeable Canonical Host Convergence Audit

Date: 2026-07-19
Status: routing, emitter-shell, observability, and guarded Web proof complete;
matched NWN placeable oracle remains unavailable

## Scope

This audit covers the frontend routing defect where a placeable with a
backend-canonical source-MDL VFX payload can still be rejected because its
catalog subtype is `generic` or `light_source`.

It does not authorize new particle, light, animation, transform, or placeable
runtime semantics.

## Pre-flight classification

- Rules-first: applied.
- Aurora-first: no new unknown Aurora semantic is introduced by this slice.
- Contract-first: the existing additive `aurora-vfx-payload/v1` contract is
  retained.
- Test-first: generic-placeable canonical routing and shared host composition
  regressions are required before implementation.
- Diagnosability-first: the selected canonical/preview route and shared host
  composition remain exposed in root user data.
- External GPL review: xoreos was not used.

## Existing primary evidence

The source-MDL placeable architecture audit records that Aurora attaches
trimesh, emitter, and light nodes to one model graph. The runtime behavior is
selected from the nodes carried by that graph, not from an Aurora Web catalog
subtype invented for editor presentation:

- `vfx-placeable-emitter-architecture-audit-2026-07-12.md`;
- admitted Aurora decompilation and retail evidence cited by that audit;
- current backend source-MDL parser and catalog VFX packaging path.

This slice relies only on those already admitted primary sources. It does not
use secondary GPL evidence.

## Confirmed contract path

The backend catalog path:

1. parses source-MDL emitter nodes;
2. packages them through `VfxApplicationService`;
3. emits `aurora-vfx-payload/v1`;
4. marks the payload `backendCanonical: true` and
   `canonicalStatus: "canonical"`;
5. may do so for a placeable whose catalog subtype is not `vfx`.

The frontend currently has two subtype gates:

- `buildVfxPayloadFromRenderPayload` returns before reading the backend payload
  when the placeable subtype/render type is not `vfx`;
- `workspaceObjectMeshLayer` derives its VFX route from the same presentation
  subtype before selecting the canonical renderer.

The result is a contract contradiction: a valid backend-canonical payload is
present but cannot reach the canonical renderer.

## Authorized correction

1. Read and validate the backend Aurora VFX payload before applying the
   presentation subtype fallback.
2. Treat a valid backend-canonical payload as sufficient to select the
   canonical VFX route.
3. Retain subtype detection for legacy preview-only payloads and missing
   canonical payloads.
4. Keep source-MDL static geometry, canonical emitters, and canonical lights
   under one owning placeable root.
5. Apply the owning area-model scale exactly once to the canonical source-MDL
   child.
6. Do not attach the legacy particle preview when a canonical payload is
   accepted.

## Excluded work

- inferring VFX from arbitrary model/file names;
- promoting preview-only payloads to canonical;
- changing emitter or light values based on appearance;
- implementing deferred runtime hydration;
- resolving unknown production actor-animation attachment;
- tuning `plc_t04` plume width or luminance without a new matched oracle.

## Acceptance criteria

- a `generic` placeable carrying a valid backend-canonical payload uses the
  canonical renderer;
- source-MDL static geometry, emitter, and light remain in one composition;
- area-model scale is applied once;
- the legacy preview overlay is absent;
- existing preview-only subtype routing remains unchanged;
- focused renderer tests and production frontend build pass;
- a fresh placeable proof is captured before completion is claimed.

## Runtime emitter-shell correction

Live `plc_i06` processing exposed 45 packaged runtime emitter descriptors even
though the source model has five unique particle-bearing emitter nodes. The
additional 40 descriptors repeated those five node names and carried animation
passes without a texture or chunk resource.

The correction follows the existing primary-source parser contract:

- parse each base emitter node once;
- attach animation passes to the matching base emitter;
- select particle-bearing base emitters for canonical runtime packaging;
- deduplicate by source model and case-insensitive emitter node name;
- retain all emitters only when the source contains no explicit particle
  resource at all.

No xoreos source was used. The focused regression proves that animation-only
duplicates do not become separate runtime emitters.

Live contract verification after backend restart:

- backend revision:
  `vfx-placeable-canonical-host-light-source-v2-emitter-shell-filter`;
- placeable subtype: `light_source`;
- source graph: 36 static geometry nodes, 87 total nodes;
- legacy emitter descriptors: 5;
- canonical runtime emitters: 5;
- response size: 32,618,259 bytes, down from approximately 118.7 MB before the
  correction.

## Texture reference audit

The two `ChunkyWood` emitter nodes request `fxpa_cloud02`, but the canonical
dependency graph has no selected candidate for that reference. The resource is
absent from:

- `nwn_base.key`;
- `nwn_retail.key`;
- all 118 installed user HAK files;
- the current Aurora Web module asset snapshot.

The available source describes those nodes as `Explosion` emitters, and the
current runtime frames contain no draw records without a detonate event. This
audit does not authorize substituting another texture or inventing fallback
runtime behavior. A future detonate-path proof requires the actual resource or
a separately admitted primary source.

## Fresh capture result

The first post-correction capture is retained as a rejected diagnostic:

- PNG:
  `backend/docs/aurora-reverse/evidence/vfx-placeable-post-debt-2026-07-14/post-debt-plc-i06-canonical-host-v50-emitter-shell-filter.png`;
- MP4:
  `backend/docs/aurora-reverse/evidence/vfx-placeable-post-debt-2026-07-14/post-debt-plc-i06-canonical-host-v50-emitter-shell-filter.mp4`;
- manifest:
  `backend/docs/aurora-reverse/evidence/vfx-placeable-post-debt-2026-07-14/post-debt-plc-i06-canonical-host-v50-emitter-shell-filter.frame.json`.

It is not accepted proof. The capture gate observed the owning model's 2/2
texture status while canonical particle textures were still loading. The MP4
therefore recorded zero visible particle draws, and the final PNG contains the
complete placeable host without its active fire.

Persistent Playwright debugging after asset loading confirmed that deterministic
`t=1s` contains two visible draw meshes, 21 visible particles, and mapped
`fxpa_flame00` plus `fxpa_smoke01` textures. That interactive observation is a
debug result only: it was made after an additional manual playback start and is
not accepted as proof.

## Runtime observability correction

The dev-only `aurora-vfx-runtime-observability/v1` report is now an acceptance
gate for the catalog VFX route. The integration correction:

- classifies source-MDL static branches by exact canonical graph node name when
  the delivered GLB does not carry an Aurora Web branch marker;
- ignores copied playback markers that have no runtime frame children;
- registers only renderer delivery dependencies selected through the same
  model, texture, and chunk-model resolvers used by the runtime;
- treats decoded cached assets and material-bound assets as terminal settlement
  states while retaining the distinction in the ledger;
- marks an attached loaded placeable model as bound;
- reads the report dynamically instead of returning a readiness-time snapshot.

The guarded CDP harness now requires the report version and a passing proof
gate, begins deterministic playback once, re-reads the report before artifact
acceptance, and rejects a PNG/MP4 packet when no sampled frame contains a
visible canonical VFX draw.

Focused frontend verification:

- VFX observability and catalog runner tests: 31/31 passed;
- observability, catalog runner, and backend identity facade tests: 36/36
  passed;
- production frontend build: passed.

## Accepted Web proof

The accepted post-correction Web packet is:

- PNG:
  `backend/docs/aurora-reverse/evidence/vfx-placeable-post-debt-2026-07-14/post-debt-plc-i06-canonical-host-v51-observability-gated.png`;
- MP4:
  `backend/docs/aurora-reverse/evidence/vfx-placeable-post-debt-2026-07-14/post-debt-plc-i06-canonical-host-v51-observability-gated.mp4`;
- manifest:
  `backend/docs/aurora-reverse/evidence/vfx-placeable-post-debt-2026-07-14/post-debt-plc-i06-canonical-host-v51-observability-gated.frame.json`.

Acceptance facts:

- exact dirty-source identity:
  `02b4a79693a6-dirty-4e326b118d929307`;
- frontend and backend image/source digest:
  `sha256:4e326b118d92930727acff02c2312e49a76e706f87a6e2a4bef57bac649297e4`;
- host graph: four expected static nodes and five expected emitter nodes
  attached, zero mismatches;
- asset settlement: 12/12 terminal, including 7 cached and 5 bound;
- network: 12/12 model/texture requests completed with HTTP 200, zero pending
  and zero failed requests;
- draw ledger: 4,186 records;
- playback guard: one trigger, no loop, zero overlap;
- MP4: 50 deterministic frames at 10 fps; five of six sampled checkpoints
  contain visible canonical VFX;
- static `t=1s`: two visible draw meshes and 21 visible particles;
- debug overlay: disabled.

## Retail comparison boundary

The existing retail artifact
`backend/docs/aurora-reverse/artifacts/light-shadow-2026-07-03-shadowvol-preview/retail-or-toolset-shadowvol-campfire.png`
shows the same `plc_i06` campfire in NWN, but it is not a matched oracle: camera,
distance, scene lighting, exposure, and temporal sampling differ. It supports
only a morphology check for a complete campfire host, central flame, and warm
light. It cannot close plume density, opacity, size, timing, or fade parity.

No saved NWN MP4 for `plc_i06` meets the current matched-oracle standard.
Accordingly, v51 is accepted as guarded Aurora Web runtime proof, not as a
matched NWN-versus-Web parity proof. Existing matched row 22 and row 68 proof
lanes remain the current temporal VFX comparison authority.
