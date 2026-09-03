# Aurora Web VFX full decompilation gap audit - 2026-07-14

## Verdict

Aurora Web has a serious VFX implementation foundation: source-preserving 2DA
and MDL parsing, four runtime emitter families, animation evaluation, render
contracts, a dedicated Three adapter, source provenance, diagnostics, and
saved NWN/Web proof packets. It is **not yet full Aurora VFX parity**.

The architecture is farther along than a preview renderer, but several
source-critical behaviors are still simplified, unbound, or only represented
as metadata. The most important confirmed defects are event ownership,
coordinate/orientation conversion, native render-mode separation, Chunk asset
and collision semantics, material/shader fidelity, and proof-camera/evidence
lineage.

## Follow-up implementation status - 2026-07-14

The following source-contract repairs were applied after this audit, with no
claim of visual parity:

* MDL animation-header events are now returned as `animationEvents` on the
  model and model graph. They are no longer copied into every emitter or
  emitter animation pass.
* The runtime accepts model events separately, labels them in the tick trace,
  and routes `detonate` only to `Explosion` family instances. Duplicate rows
  remain duplicate callbacks; the native one-byte latch decides whether they
  produce an additional burst in that update.
* Unknown emitter tokens resolve to `Unknown`, emit the existing unsupported
  family diagnostic, and cannot silently execute the Lightning path. `Chunk`
  and `P2P` remain explicit tokens; `chunkName` and a `p2p` simulation flag do
  not incorrectly select a different family.
* The existing `aurora-z-up` map `C=(x,z,y)` is now applied consistently to
  model-node positions, source lights, Chunk positions, and axis-angle
  orientations. Because `C` is a reflection, orientations use `-C*axis` at
  the same angle, which represents `C*R*inverse(C)`.
* Native render mode `Normal` is explicit mode 0 rather than `unknown`, and
   `Billboard_to_Local_Z` receives the evaluated emitter orientation from the
   backend draw record. Modes 3 and 6 rebuild their width from the live camera
   basis; mode 5 receives the particle's copied emitter orientation rather than
   substituting velocity. Mode 4 now preserves its camera-derived first vector
   while locking only its second vector to global Z; retail visual oracles remain
   open.
* Native mode 2 (`Billboard_to_World_Z`) now starts from the recovered Aurora
  X/Y quad and maps it through `C=(x,z,y)` onto Three X/Z. The pre-fix adapter
  incorrectly retained Three X/Y for `aurora-z-up`. The new unit oracle covers
  the resulting Three-Y normal; this is a coordinate repair, not a camera or
  visual-parity promotion.
* Row 22's four particle sprites are now copied as their exact retail TGA
  files, with their `nwn_base.key` SHA-256 values in the fixture manifest. The
  runner no longer introduces a PNG conversion between source and Web.
* PLT texture identity is no longer erased by MDL normalization. A selected
  `.plt` dependency now carries a target-object palette contract through the
  backend render record into the canonical texture loader. Missing or
  conflicting target context remains diagnostic and cannot bind a guessed or
  grayscale PLT as canonical output.

## Follow-up Fountain scheduler audit - 2026-07-15

The row-68 density gap was traced to the exact `nwtoolset.exe` instruction
stream matching the Ghidra project hashes (MD5
`20e2ab3ea77805a8d07d9ff751314cfd`, SHA-256
`4c156de898817518e8a97f5d989592894d3c8f48b71d27e2a8b89500cd230f24`).
The C export loses the x87 stack operands in this block, so the binary was
disassembled directly instead of guessing a count from the proof image.

* `FUN_00a31288` accumulates normal Fountain time at runtime emitter `+0x16c`
  and gates it against `1 / birthrate` (`decompiled_all.c:857002-857005`,
  native addresses `0x00a31acd-0x00a31aee`).
* The emitted count is exactly
  `TRUNC(accumulator * birthrate) % (TRUNC(birthrate) + 1)`. Calls at
  `0x00a31c0b-0x00a31c2c` enter helper `0x00b908cc`, which saves the x87
  control word, ORs in `0x0c01`, converts with `fistp`, and restores the
  control word. This is truncate toward zero, not round-to-nearest-even. The
  whole accumulator is then reset; no fractional remainder is carried.
* The old Web loop emitted at most one particle per runtime tick and discarded
  the rest. At the row-68 `1/30 s` step that reduced `133/s` to one particle
  instead of four and `100/s` to one instead of three.
* Trail uses `TRUNC(distance * birthrate)`, and the first particle
  emitted into an empty active list is placed at the segment start before later
  particles use spacing steps (`decompiled_all.c:857060-857127`). The Web
  residual and first-particle placement now follow that branch.

After the repair, row-68 maximum active counts changed from v9
`23/8/16/15` to v10 `68/24/64/45` for
`sunbeam/Sparkles/Explosion01/Explosion`. The shared bright-pixel peak changed
from `793` to `2118`. The saved NWN MP4 was reused without rerun. Aurora Web v10
was recorded exactly once, with `triggerCount=1`, `loop=false`, clean baseline
and post-roll, and all four emitters ending at zero particles. Its MP4 SHA-256
is `59da6ea9a79a04ca62356997c9c54b972b83c2c0ef1ddcf42ac9cba2537d9f3f`.

The v10 visible span is `1.549907 s` versus NWN `1.416667 s`, a `+0.133240 s`
delta. The current proof camera and target geometry are not matched: the Web
capsule is materially smaller on screen than the partially cropped NWN player.
Therefore the remaining spatial difference cannot yet be attributed solely to
particle geometry. This packet proves the scheduler correction and a valid
single-playback comparison; it does not prove retail visual parity.

Verification: `aurora-vfx-runtime-state.spec.ts` passes `73/73`, backend build
passes, the focused frontend comparison/canonical-renderer set passes `53/53`,
and `validated-summary-v10.json` passes all lifecycle, light, bloom, and
single-playback checks. The full frontend build still has unrelated pre-existing
Areas/Creatures/Placeable type errors.

## Follow-up emitter/material boundary audit - 2026-07-15

The decompilation confirms that `twosidedtex` and MTR sidedness/framebuffer
fields are different owners and must not share one source-state bucket:

* The textured-particle draw live-reads emitter source offset `+0x138` and
  enables state 3 when zero or disables state 3 when non-zero
  (`decompiled_all.c:856018-856023`). The canonical Three adapter now maps the
  default lane to `FrontSide` and only
  `two_sided_texture_cull_disabled` to `DoubleSide`; it no longer creates every
  particle material as double-sided.
* `twosided`, `sample_framebuffer`, and `volumetric` are parsed by the MTR
  parser into material offsets `+0x181`, `+0x184`, and `+0x188`
  (`decompiled_all.c:868848-868873`). They are not emitter parser tokens.
* The native scene classification consumes those MTR offsets through the
  material object: `sample_framebuffer == 2` selects runtime lane 6,
  `sample_framebuffer == 1` selects lane 5, and `volumetric` also selects lane 5
  (`decompiled_all.c:908278-908329`, `908377-908441`). MTR `twosided` supplies a
  separate render-wrapper argument and does not replace emitter
  `twosidedtex`.

The wrapper argument is now closed to exact GL state. Toolset disassembly at
`0x00a7df69-0x00a7dfeb` selects argument `1` only for non-volumetric MTR
`twosided`. `FUN_00a7d4a8` at `0x00a7d509-0x00a7d586` maps argument `1` to
state-slot-3 disable (`GL_CULL_FACE`) and restores the normal lane to enabled
`GL_BACK`; this branch never calls `glFrontFace`. Textured-particle draw
`FUN_00a2e250` then live-reads emitter `twosidedtex` at
`0x00a2ec5a-0x00a2ec7a`, so the emitter state is the later and final cull owner
for particle quads. Aurora Web records both states and keeps the same override
order rather than combining the flags.

The backend MTR parser now preserves `sampleFramebuffer` and `volumetric` on
`PlaceableRenderPackageAuroraMaterialState`, and the HTTP/frontend material
contract carries them without applying an invented WebGL effect. The VFX render
contract accepts material-only fields only through explicit
`AuroraVfxMaterialSourceState { source: "aurora-mtr" }`. Legacy MTR-like fields
found on `node emitter` are ignored by canonical render state and emit
`VFX_MTR_FIELDS_ON_EMITTER_SOURCE_IGNORED`; they can no longer silently change
transparency, depth-write, material sidedness, or framebuffer lanes.

The catalog path now resolves an emitter MTR only by exact texture/material
basename, carries it as `sourceEmitterMaterials`, includes that input in the VFX
cache key, and supplies the parsed material state to every runtime-frame render
contract. There is no arbitrary or only-MTR fallback. Custom shader roots are
resolved recursively as SHD resources through their reachable `#include` graph
and transported as `aurora-shader-program-source/v1`; incomplete graphs remain
explicitly incomplete. For complete non-framebuffer graphs, the canonical
frontend now installs the recovered profile, full expanded SHD sources,
same-named geometry inputs and uniforms, and authored MTR parameters in source
order. Incomplete graphs, geometry shaders, framebuffer lanes, and unsupported
skinned binding remain refused instead of falling back to a generic material.

Enabling the recovered cull lane exposed a second coordinate defect: mapping
Aurora's mode-2 X/Y quad through reflective `C=(x,z,y)` retained the original
triangle order and changed its front normal from native `+Z` to Three `-Y`.
Mode 2 now reverses only that mapped quad's winding, so the front normal is
Three `+Y`; camera-derived and contact-plane routes are unchanged.

This closes the confirmed owner, binding, cull-state, mode-2 front-face,
framebuffer-pass transport, SHD source graph, and non-framebuffer custom-program
adapter defects, but not framebuffer or custom-material visual parity. The
lane-5/6 `mainscene` capture slots, attachment mask, and texture units are
recovered from the admitted Toolset binary. `FUN_00a707a8` recovers the native
attribute slots and named-uniform lookup; `FUN_00a45a0c` plus
`FUN_00a45b3c` recover authored-parameter upload after selected-program rebind.
The Web adapter preserves those semantic names while Three owns numeric WebGL
locations. The Punch-Through cutoff was separately recovered as `0.2` and
implemented. The real-browser compile/render gate is now closed for the retail
`oldf_head.mtr` -> `vslit_sm`/`fslit_sm` source graph, while matched retail
visual proof remains a P12 gate and the adapter explicitly records retail parity
as false.

The retail roots define `ENVIRONMENT_MAP 1`. Native material-program state keeps
separate `texUnitEnvCube`/`texEnvCubeBound` and `texUnitEnv`/`texEnvBound`
bindings (`decompiled_all.c:899896-899901`, runtime bound-flag upload from
`901956`). Aurora Web therefore refuses this program when its environment input
is absent; it does not create a white/default replacement. The MTR parser and
HTTP/VFX contracts now preserve `bumpmaptexture`, `bumpyshinytexture`,
`envmaptexture`, and `bumpreplacementtexture`. Confirmed `bumpmaptexture` and
`envmaptexture` references are resolved before custom-program installation;
the other two remain source-preserved with binding-unverified diagnostics.
2D and cube environment samplers are assigned separately so WebGL never uploads
one 2D texture to both sampler types.

Verification: focused custom-program/canonical/material/transport frontend
suites pass `100/100`, including custom profile/include expansion, Punch
`NO_DISCARD=0`, attribute/parameter installation, matrix update ordering,
environment-input refusal, named MTR texture binding, canonical integration,
and the placeable loader. Targeted backend MTR parser and placeable-to-VFX
projection scenarios pass `2/2`; the backend build passes. The full frontend
build still reports only unrelated existing
Areas, Creatures, and `workspaceObjectMeshLayer` type errors; no changed VFX or
material file remains in that error set. The WebGL v2 probe reports one linked
program, zero compile messages, `glError=0`, and `292990` pixels changed from the
actual corner color. Its generated 2D environment texture is explicitly marked
`diagnostic-data-texture-not-retail-oracle`, so the saved JPEG/JSON pair under
`evidence/vfx-mtr-custom-shader/` is execution evidence, not parity. Row-68 Web
v11 remains a valid
single-playback proof with culling active: all four emitters finish at zero,
visible span is `1.450636` seconds versus NWN `1.416667`, and the `+0.033969`
second delta fits one NWN frame.

### Retail particle shader audit

`backend/scripts/audit-retail-particle-shaders.ts` now reads the exact retail
shader resources (`resource type 2069`) from `nwn_base.key ->
base_shaders.bif`. Its reproducible result is
`backend/docs/aurora-reverse/artifacts/vfx-particle-shaders-2026-07-14/retail-particle-shader-audit.json`:

* `fsparticle` SHA-256 `080d350c84ec51ae487f3494f2ae755ca3198696f8dea17430ad254375673ecd`
  multiplies vertex color and `texUnit0`, then calls `AlphaDiscard` on the
  resulting alpha.
* `inc_common` SHA-256 `3a6f965d2eec5411b2075919e5dc0316d2ddbc783958de6c53730e94c75bfcab`
  defines that discard from a runtime uniform: it rejects alpha less than or
  equal to non-negative `fAlphaDiscardValue`. It does not supply a literal
  cutoff of `0.5`.
* `vsparticle` SHA-256 `9a3621050f680fe75043dfa38e6d7215b84cd8165e23feb08ea58c47a5bee65a`
  and `fsparticle` also contain the optional depth-based soft-particle path.
* The native renderer maps `Punch-Through` to mode 1
  (`decompiled_all.c:853993-854017`) and selects a distinct compiled shader
  variant before drawing (`856771-856807`).
* Static PE disassembly closes the previously missing xref. The uniform query at
  `nwtoolset.exe:0x00a70f76-0x00a70f8c` maps the string
  `fAlphaDiscardValue` (`0x00cca6dd`, `strings.tsv:16513`) to shader-program
  field `+0xb64`.
* The upload branch at `0x00a744b1-0x00a744d8` reads renderer state bit `1`.
  It uploads `0.2f` when enabled and `-1.0f` when disabled through scalar
  uniform wrapper `0x00a6bfc4`; the literals are stored at
  `0x00a74fc4-0x00a74fcb`.
* State bit `1` is enabled during renderer initialization
  (`decompiled_all.c:901075-901081`). Punch mode `1` selects the shader variant
  that keeps alpha discard active, while non-punch modes select the compiled-out
  variant (`856771-856807`). Therefore the exact native Punch cutoff is `0.2`,
  not the old browser guess `0.5`.

The backend now emits
`alphaDiscardLane: "punch_through_runtime_uniform_0_2"` with
`alphaDiscardValue: 0.2` and disassembly provenance. The canonical Three
adapter accepts Punch geometry only with that exact pair, then applies
`transparent=false`, `depthWrite=true`, and `alphaTest=0.2`. A stale or
incomplete payload still produces `VFX_CANONICAL_PUNCH_THROUGH_ALPHA_DISCARD_REQUIRED`
and no draw geometry. This implements the recovered source contract without
weakening the no-guess guard.

The reproducible shader audit now verifies the admitted Toolset binary hash,
the PE instruction signatures, the uniform-field mapping, and both float
constants before writing status
`retail-source-and-alpha-discard-runtime-mapping-recovered`. This is
source-backed implementation evidence, not matched NWN/Web visual parity.

Verification for this follow-up: the focused backend VFX set passes `170/170`,
the focused frontend canonical/material/transport set passes `222/222`, the
canonical renderer itself passes `41/41`, and `npm run build` in `backend`
passes. The saved NWN MP4s were not rerun and no existing proof fixture uses
Punch-Through, so no new Web recording was made or promoted as parity evidence.
Depth texture, softening, fog, color correction, and framebuffer material lanes
remain independent work.

## Follow-up Chunk runtime and material audit - 2026-07-14

The row-22 Chunk path was traced one level deeper from the source MDL, without
inventing a texture or a collision fallback:

* `fx_rockchunksml.mdl` parses to one real child emitter, `smoke04`, parented
  to static node `Rocksml`. It is a `Fountain` emitter using `fxpa_Smoke01`,
  `Normal` render mode, and the source transform/orientation from the child
  model. It is no longer treated as GLB metadata only.
* The canonical Three adapter can now receive a source-MDL runtime payload per
  resolved Chunk resource and creates one child runtime per live Chunk
  particle. `FUN_00a28a38` plus the approved Toolset disassembly prove that the
  model starts animation `impact` once at particle activation with playback
  rate `1.0`; the adapter therefore accepts only an `impact` child payload and
  seeks it to that Chunk particle's age. A resource-stack guard rejects a
  cyclic nested-model dependency instead of recursively rendering it.
* The row-22 fixture now carries `fx_rockchunksml.runtime.json`, produced
  through the same backend runtime service from the parsed child source model.
  `fxpa_Smoke01` is an exact source dependency. The generated GLB exposes
  `fxpa_dirt` as a material reference; the exact `fxpa_dirt.tga` and `.txi`
  were recovered from the installed retail `data/nwn_base.key`, recorded with
  SHA-256 in the fixture manifest, and bound only by that source reference.
  The GLB does not embed a substitute texture. The native default model path
  starts with state 5 enabled, `GL_CULL_FACE` and `GL_DEPTH_TEST` enabled, and
  depth writes enabled. `fxpa_dirt.txi` contains no two-sided, decal, blend, or
  depth override. Converter v14 therefore emits this source model as lit,
  single-sided and depth-writing instead of the former false
  `KHR_materials_unlit` plus `doubleSided=true` preview. Broader custom model
  material/shader branches remain open.
* Native anchors establish the lifecycle boundary: `FUN_00a2d9c4`
  (`855146-855177`) retains a live particle/model reference, and
  `FUN_00a31070` (`856838-856881`) invokes the model render path before the
  optional particle orientation draw. `FUN_00a28a38` (`853365-853375`) closes
  the child animation start contract. The selected collision service is closed
  for the row-22 static-query profile; general model-material variants and
  native WOK AABB/BSP traversal remain open.
* The collision response now follows the observed post-query order in
  `decompiled_all.c:855047-855135`: the response begins from the already
  predicted particle position, not from an optional contact-point payload. It
  reflects velocity, then adds normal `0.005`, adds another `0.02` only when
  the reflected speed squared is below `0.5`, and finally adds the Chunk
  extent when applicable. A returned hit position remains diagnostic evidence;
  it cannot teleport a particle away from the native predicted-position path.

Current v7 comparison, using the unchanged single-run NWN MP4 and exactly one
new 12 fps Web playback:

| Oracle | Artifact | Finding |
| --- | --- | --- |
| NWN | `evidence/vfx-nwn-web-row22/nwn/nwn-row22-one-trigger.mp4` | Saved one-trigger oracle; peak is strongly overexposed and later frames expose dark/brown Chunk fragments. |
| Aurora Web | `evidence/vfx-nwn-web-row22/web/web-row22-one-trigger-v7.mp4` | No proof geometry; child smoke, dirt material, native mode-6 geometry, exact area WOK selection, and Chunk contacts are live. The top view is not a recovered NWN camera. |

This is not a parity proof. The NWN capture was not rerun. Open work is broader
Aurora model material/shader variants, a matched camera/environment, dedicated
render-mode oracles, and visual trajectory/contact/count acceptance.

Verification refreshed 2026-07-16: backend render-contract and converter tests
pass `57/57`, frontend canonical renderer tests pass `44/44`, the row-22
fixture generator completes, and both backend and frontend production builds
pass. This remains implementation evidence, not matched visual parity.

## Scope and evidence boundary

* Read-only native reference: `C:\Projects\New Folder\export\decompiled_all.c`.
* Editable implementation: `C:\Projects\aurora-web`.
* This audit reads existing source, implementation, payloads, saved artifacts,
  and the current v7 Web proof. It does not rerun NWN.
* Existing VFX comparison artifacts are evidence of the described gap unless
  they explicitly pass the retail gate. They are not promoted to canonical by
  this report.

The native export contains four named emitter classes:

* `FountainEmitter`
* `ExplosionEmitter`
* `SingleEmitter`
* `LightningEmitter`

It also contains `Particle`, `ChunkyParticle`, and a `WindManager`. Aurora is
therefore not one generic sprite loop; it is a family runtime with distinct
spawn, update, model, and draw paths.

## Native decompilation anchors

| Anchor | Recovered responsibility | Why it matters |
| --- | --- | --- |
| `FUN_00a25c9c`, `decompiled_all.c:852370-852375` | Detonate callback writes a one-byte latch. | Multiple callbacks in the same update are not automatically multiple bursts. |
| `FUN_00a264c0`, `852921+` | Particle orientation/spread construction from all source-vector components. | Spawn direction and rotation are three-dimensional source behavior. |
| `FUN_00a294ec`, `853807-854022` | Authored render-token routing and blend bucket selection. | Render tokens are native semantic branches, not cosmetic labels. |
| `FUN_00a2e250`, `855370+` | Particle vertex construction and render-mode-specific bases. | Normal, local/world Z, linked, aligned, and motion-blur routes differ. |
| `FUN_00a28a38`, `853365-853375`; `nwtoolset.exe:0x00a28a38-0x00a28a9a` | Each live Chunk model starts animation `impact` once at activation with rate `1.0` and raw trailing arguments `1,0`. | Child runtime attachment is gated to the exact animation and evaluated from particle age. |
| `FUN_00a31070`, `856838-856881` | `ChunkyParticle` model update and orientation render path. | Chunks are model particles, not sprite substitutes. |
| `FUN_00a72894`, `900982+`; `FUN_00a5e54c`, `887101+`; `FUN_00a471d0`, `870224+` | Default model rendering enables state 5, culling, depth test and depth writes; the mesh path disables state 5 only for its material override and additive material disables depth writes. | Converter v14 no longer invents unlit/double-sided defaults for ordinary model meshes. |
| `FUN_00a31ca4`, `857152-857272` | Explosion update, particle allocation, detonate latch consumption, and reset. | Burst count and event timing must follow the native latch semantics. |
| `decompiled_all.c:853987-854022` plus Toolset GL table trace | `Normal`, `Punch-Through`, and bucket-2 blend routing. | `Normal` and bucket 2 have recovered GL factors; Punch-Through remains a separate lane. |

## Native VFX contract versus the current implementation

| Layer | Native finding | Aurora Web state | Audit status |
| --- | --- | --- | --- |
| Effect entry and 2DA rows | VFX is selected through source rows, phase nodes, and effect context. | Source-preserving 2DA rows, effect-instance contract, phase schedule, dependency graph, and `ProgFX` metadata exist. | Implemented architecture; family coverage is incomplete. |
| Binary/ASCII MDL parsing | Emitter nodes carry transform, type, render/blend, resource refs, controllers, animation passes, and events. | Parser preserves substantial emitter, timeline, color, source-state, reference, and binary-controller data. | Strong structural coverage; not proof of every semantic mapping. |
| Runtime families | Four explicit emitter classes exist. | Runtime resolves explicit supported tokens and returns `Unknown` for unrecognized values. | No silent fallback; remaining source-token coverage is still incomplete. |
| Detonate events | Callback sets one native latch; update consumes and clears it. | Animation-header rows are model-scoped and dispatch only to Explosion family emitters. | Structural repair complete; exact native callback registration still needs a visual/capture oracle. |
| Particle motion | Native path uses emitter state, random values, spread, inheritance, P2P, wind, collision, and per-family update order. | Fountain, Single, Explosion, Lightning, P2P, wind input, gravity/drag, and collision contracts exist. | Partial: many equations lack a retail family oracle. |
| Model hierarchy | Node transforms and orientations are source-space values. | Shared `C=(x,z,y)` vector and conjugated axis-angle conversion now cover particles, model groups, lights, and Chunks. | Structural repair complete; signed cardinal-axis visual oracle remains missing. |
| Render modes | Tokens map to native modes 0 through 6 with distinct branches. | Modes 0-5 have separate bases. Mode 6 now uses the recovered camera-plane projection, `2 * sizeX` width, `sizeY / 4` endpoint caps, and previous-end alpha. | Implementation separated; retail visual oracles remain open for every route. |
| Chunk particles | A live model instance is updated/oriented per particle and starts `impact` once at activation. | Chunk model lane, exact child scheduler, source child-runtime attachment, lit/single-sided default dirt material, model resolution, transported orientation, and row-22 static WOK collision are live. | Row-22 default integration implemented; broader material/shader variants and general collision-tree parity remain open. |
| Blend/material state | Normal and bucket 2 call known GL blend factors; Punch-Through is a distinct `fAlphaDiscardValue` route. Emitter `twosidedtex` is separate from MTR `twosided`/`sample_framebuffer`/`volumetric`. | Normal and bucket-2 factors, exact Punch `0.2`, canonical emitter culling, reflective mode-2 winding, and exact-basename MTR binding are live. Lane-5/6 capture slots/mask/units and the recursive SHD source graph are transported; generic custom-program rendering is refused. | Partial: source contracts are closed through framebuffer transport; browser material-program execution, renderer-profile binding, and matched visual proof remain open. |
| Lights and post effects | Source nodes and effect context can affect scene lighting/camera. | Light/progFX data and receiver probes exist. | Partial: scene light, post-process, and camera parity are not complete. |
| Retail proof | Exact runtime claims require a source, parser, resolver, runtime, render, retail capture, and comparison packet. | Saved NWN/Web packets exist for rows 22 and 68; the 10-case strict manifest remains diagnostic-only. | No family has passed the canonical retail gate. |

## Confirmed implementation defects

### VFX-D01: Model animation event scope (structurally repaired; visual owner proof open)

`attachEventsToEmitters()` in
`backend/src/modules/vfx/domain/aurora-mdl-vfx-source.parser.ts:3635-3679`
copies every model-animation event into every parsed emitter. The application
then consumes `emitter.events` for each emitter in
`vfx.application.service.ts:1683-1710`.

This is not source-proven ownership. The row-22 fireball payload demonstrates
the practical failure: Ring and Chunkssml receive the `0.033333` and `0.133333`
detonate events, producing repeated waves/bursts. Native `FUN_00a31ca4` proves
the one-byte latch only coalesces same-update callbacks; it does not justify
broadcasting a global animation event to every emitter.

**Follow-up status:** the parser now preserves these rows at model scope and
the runtime routes them only to Explosion family instances. Exact native
callback registration remains a visual/capture acceptance item; this repair is
not a parity promotion.

### VFX-D02: Unknown emitter type fallback (repaired)

`resolveAuroraEmitterRuntimeFamily()` in
`aurora-vfx-runtime-state.ts:569-583` maps known tokens to Fountain, Single,
and Explosion, then defaults every other token to Lightning. There is no
explicit `unsupported` family or source diagnostic at this decision point.

This can turn a parser or source-coverage gap into a visually plausible but
wrong effect. It violates the no-speculation rule.

**Follow-up status:** unrecognized tokens now resolve to `Unknown`, take no
supported-family update path, and emit `VFX_RUNTIME_FAMILY_NOT_IMPLEMENTED`.

### VFX-D03: Aurora-to-Three conversion (structurally repaired; signed oracle open)

Runtime particle positions use `(x, z, y)` for `aurora-z-up`, but
`applyCanonicalModelGraphTransform()` in
`auroraVfxCanonicalRenderer.ts:1275-1328` writes model-node position and
axis-angle orientation directly into Three coordinates. The renderer does not
accept source-coordinate-space input at that boundary.

The current `(x, z, y)` map is a reflection, not a proven proper rotation.
Changing a sign without an Aurora cardinal-axis oracle would also be
speculation. It would need matching orientation, normal, velocity, linked-end,
and light transforms.

**Follow-up status:** `C=(x,z,y)` now has one implementation across particles,
model nodes, source lights, and Chunks; reflected axis-angle conversion is
tested. A cardinal-axis Aurora capture is still required to establish the
sign/camera interpretation visually.

### VFX-D04: Native render modes are only partly separated

`FUN_00a294ec` maps:

| Token | Native mode |
| --- | ---: |
| `Normal` | 0 |
| `Billboard_to_Local_Z` | 1 |
| `Billboard_to_World_Z` | 2 |
| `Linked` | 3 |
| `Aligned_to_World_Z` | 4 |
| `Aligned_to_Particle_Dir` | 5 |
| `Motion_Blur` | 6 |

The Web adapter has a real linked-segment path using `linkedNextPosition`, a
previous/current-position path for Motion_Blur, and source-separated basis
paths. The decompilation confirms the following current implementation facts:

* Aligned-to-World-Z now preserves the camera-derived first vector and locks
  only the second vector to global Z, matching the assignment at
  `FUN_00a2e250:856598-856602`; it participates in the live camera refresh.
* Mode 3 (`Linked`) uses the live camera basis. Mode 6 (`Motion_Blur`) projects
  current-to-previous displacement into camera right/up, constructs its side
  vector in that plane, uses total width `2 * sizeX`, extends both endpoints by
  `sizeY / 4`, and applies the recovered length-dependent alpha to previous-end
  vertices. These are the distinct native assignments at
  `FUN_00a2e250:856331-856417` and `856701-856765`.
* Mode 5 (`Aligned_to_Particle_Dir`) receives the orientation copied into the
  particle at spawn, matching the native `FUN_00a2625c` copy from emitter
  state `+0x1a0` to particle state `+0x2c`; it no longer substitutes a velocity
  vector.
* World-Z is now routed separately, but its exact native coefficients and
  signed coordinate mapping remain unproven.

**Follow-up status:** the seven mode branches are structurally separate and
Mode 6 geometry is source-mapped. Each route still requires its own retail
visual oracle. Do not group them merely because they all produce six vertices.

### VFX-D05: Chunk scheduler and default material are implemented but are not Aurora Chunk parity

Native `FUN_00a31070` drives a per-particle model pointer, model update, and
axis-angle orientation. The current renderer correctly keeps a separate
`chunk_model` lane and transports a rotation axis. That narrow axis repair is
real.

The remaining defects are material and behavior defects:

* `fx_rockchunksml.glb` remains a local cloned geometry preview, explicitly
  marked `applied-local-model-preview-retail-unverified`.
* The row-22 generated GLB has no embedded image object for `fxpa_dirt`, but
  preserves that source material reference. The exact retail TGA/TXI was
  extracted from `data/nwn_base.key` and bound by that reference. Converter
  v14 applies the recovered ordinary-model defaults: lit, front-sided,
  depth-tested and depth-writing. Custom material/shader variants remain open.
* Its nested `smoke04` emitter is now a live parsed child runtime per active
  Chunk particle. Only a payload selecting `impact` is attached, and it is
  sought to particle age under the exact once-on-activation rate-1 contract.
* Row 22 now resolves its exact module area, tile ids/orientations, HAK
  precedence, and four retail WOK instances. Its deterministic runtime records
  `1200` queries, `123` applied static hits, `1077` native no-hits, and six
  landed Chunk particle ids.
* Event rows are model-scoped and routed to Explosion instances. The Web lane
  resolves all eight `fx_rockchunksml` models, binds `fxpa_dirt`, and runs their
  parsed `smoke04` child runtime. Matched material/shader visual parity is still
  open.

**Remaining acceptance:** compare motion, material, contact silhouette, and
count under a matched camera/environment. Row-22 resource and collision wiring
is implemented; the comparison is not yet a visual parity pass.

**2026-07-15 WOK static-query reconstruction:** retail base data contains
13,118 WOK resources. The sampled retail `amp01_a01_01.wok` is 1,103 bytes
(`SHA-256 96e3952152fe2d64489279eb20947e0cf1e5dc23357c5b49b11cb979f79ed2c6`)
and is an ASCII `#NWmax WALKMESH ASCII` payload with `node aabb`, transform,
vertex, and face rows. `backend/src/modules/vfx/domain/aurora-wok-walkmesh.ts`
now preserves those records, including raw face tails and the full AABB
continuation block whose material/tree semantics are not yet recovered. Its
focused retail read parsed that resource as one node, four vertices, two faces,
and three AABB records with no diagnostics. A 2026-07-15 full installed-retail
read then parsed all `13,118/13,118` WOK resources without a missing resource or
parser diagnostic, preserving `12,469` nodes, `861,405` faces, and `1,710,341`
AABB records. This validates the retained ASCII record grammar only; it does
not establish native tree or contact semantics.

The decompilation proves the native query order is not a generic browser
raycast. `FUN_00a7b8bc` at `decompiled_all.c:906871-906915` invokes static tree
traversal first. The shared service calls `FUN_00a7b5dc` after a static miss
only when the query helper's first stored field is zero. Emitter setup
`FUN_00a28a9c` at `853475-853486` constructs the VFX helper with that first
argument set to `1`, so VFX static misses resolve as native `noHit` and do not
select dynamic traversal. `FUN_00a8fa78` at `918770-918842` evaluates static
parts, while `FUN_00b2e294` at `1019225-1019308` recursively orders the native
AABB/BSP segment traversal.

The row-22 area adapter flat-scans the selected preserved static triangles and
is admitted as `aurora-runtime-service` only for that exact source-backed
module/WOK profile. It applies preserved node positions, ARE tile translations,
and the source-backed `4 - Tile_Orientation` quarter turn. A follow-up audit
confirmed that `node aabb` uses the common node parser
(`decompiled_all.c:885132-885145`), whose `orientation` route stores the same
20-byte orientation channel as other MDL nodes (`882890-882898`). The collision
adapter now applies that shared axis-angle contract in source space before node
position, tile rotation, and area translation. A non-zero angle with a
zero-length axis remains explicitly unsupported as
`VFX_WOK_NODE_ORIENTATION_AXIS_INVALID`. This structurally covers the full-scan
set of 314 rotated nodes, including the 200 that are also translated.

**Still open generally:** exact WOK AABB/BSP acceleration fields, a retail
contact oracle for rotated nodes, and broader static-part inclusion profiles. Dynamic
object filtering is not part of the recovered VFX helper path because helper
arg0 is `1`. Row 22 has an exact scene-to-WOK selection and applied contact
trace, but its Web video remains comparison evidence rather than collision or
visual parity.

### VFX-D06: Punch-Through and non-framebuffer custom MTR execution are repaired; matched visual proof is gated

The recovered blend evidence is solid for:

* `Normal`: `GL_SRC_ALPHA`, `GL_ONE_MINUS_SRC_ALPHA`.
* bucket 2, including `Lighten`: `GL_SRC_ALPHA`, `GL_ONE`.

`FUN_00a2e250` at `decompiled_all.c:856771-856808` proves that Punch is not
merely a Three material flag: Aurora selects a separate particle-shader variant.
Static PE disassembly maps `fAlphaDiscardValue` to program field `+0xb64` at
`nwtoolset.exe:0x00a70f76-0x00a70f8c`, then maps renderer state bit 1 to scalar
upload `0.2f` enabled and `-1.0f` disabled at `0x00a744b1-0x00a744d8`.
The backend carries that exact lane/value/provenance and the canonical adapter
uses opaque cutout/depth-write semantics with `alphaTest=0.2`. Incomplete or
stale Punch payloads are still refused with
`VFX_CANONICAL_PUNCH_THROUGH_ALPHA_DISCARD_REQUIRED`; the old guessed `0.5`
path no longer exists.

The separate particle scalar slot written before draw remains compatible with
`particleSoftness`, but its exact name binding is still unresolved. It is not
used as substitute evidence for Punch or for MTR framebuffer behavior.

**2026-07-15 PLT source and execution repair:** the native loader formats
`%s.plt` at `decompiled_all.c:861739-861755`. The material path iterates 15
`PLTscheme[%d]` locations at `899924-899929`; the PLT generation lane binds
`vs_pltgen` and `fs_pltgen` at `929120-929124`, normalizes each integer
layer/index input as `(value + 0.5) / DAT_00d05adc`, uploads the array at
`929125-929133`, and generates/draws the texture at `929134-929150`.

The backend now preserves the authored `.plt` token separately from its
normalized resref and also recognizes `.plt` from the selected dependency
candidate. Its render contract exposes target ref, palette rows, profile,
provenance, the two shader names, and the 15-slot uniform pattern. The
canonical Web path accepts only complete, mutually consistent target rows,
passes them into the existing PLT palette decoder, and uses palette-specific
cache keys. A missing or conflicting context leaves the diagnostic texture
placeholder in place; it does not decode a grayscale/default substitute.

This repairs the local PLT resource/context/decoder path. It does **not** prove
the exact retail palette source, generated framebuffer, sampler state, or
visual parity. A known-target NWN/Web PLT packet is still required under P12.

**Remaining repair/proof:** implement the recovered lane-5/6 framebuffer pass in
the browser and capture matched Punch, custom-MTR, framebuffer-MTR, and
known-target PLT visual packets. The non-framebuffer adapter now executes only a
complete SHD graph with all required source inputs. Missing shader stages,
includes, environment samplers, skinned bindings, geometry shaders, or
framebuffer lanes remain explicit refusals and must not claim visual fidelity.

### VFX-D07: Proof harness scene differs from the NWN oracle

The row-22 comparison runner creates the grey `CapsuleGeometry` target named
`vfx_proof_target_scale_reference` and a receiver plane only with
`diagnostics=1`. They are not Aurora assets and are disabled in the default
proof route. The current Web diagnostic uses a source-coordinate top view to
inspect the repaired World-Z plane, while the NWN capture remains top/oblique;
camera parity remains open because no retail camera pose was captured.

The current v7 artifact is one 12 fps playback with the calibration overlay
disabled. It reuses the saved NWN MP4, contains no repeated NWN trigger, and is
valid lifecycle/integration evidence. Camera and environment parity are still
open, so v7 is not a passing visual comparison.

### VFX-D08: Diagnostic evidence lineage is now explicit

`vfx-retail-parity-fixtures.json` now indexes the saved row-22 and row-68
NWN/Web artifacts through `diagnosticEvidenceRefs`, each with a file SHA-256,
capture status, and an explicit reason it is not parity. The associated
`implementationRevision` records source-audit paths, changed implementation
paths, and verification references instead of implying a Git revision from a
dirty worktree.

The parity gate validates these fields but does not count them as retail build,
capture, or comparison evidence. The focused gate test proves that even a
synthetic `behaviorClaim: canonical` remains rejected when it has only those
diagnostic refs. `VFX-P12` remains in progress: the strict retail packet still
requires every canonical evidence lane.

## What is genuinely implemented but not yet parity-proved

The following work should be preserved and built on, rather than discarded:

* source-preserving VFX 2DA and dependency contracts;
* binary/ASCII MDL emitter parsing with controller/timeline preservation;
* deterministic state snapshots, tick traces, cache inputs, and diagnostics;
* Fountain, Single, Explosion, Lightning, P2P, wind, gravity, drag, inheritance,
  motion history, and collision-contract infrastructure;
* texture atlas, color, alpha, size, render-order, and blend contract plumbing;
* target-gated PLT identity, palette context, decoder, and cache plumbing;
* distinct render-contract lanes for textured quads, linked segments, and
  chunk models;
* source-light and ProgFX data routes;
* strict canonical gate logic that refuses screenshot-only promotion;
* saved one-trigger NWN packets and reusable Web capture infrastructure.

These are implementation assets. They must not be relabelled as retail parity
until each relevant family is closed with source and visual evidence.

## Full debt register and repair order

| Priority | Debt | Blocking consequence | Required acceptance |
| --- | --- | --- | --- |
| P0 | Event ownership and unknown-family fallback | Closed structurally; visual chronology remains under P12. | Model-scoped events, Explosion-only dispatch, unknown-family rejection, focused tests, and v7 Web run are present. |
| P0 | Evidence/status lineage | A valid diagnostic packet can be confused with parity, or real evidence can be invisible to the registry. | Closed: the generated fixture registry carries row-22/row-68 diagnostic refs and implementation revisions while the canonical gate excludes them. |
| P1 | Cardinal coordinate contract | Position, model, lights, normals, and orientations can disagree. | Aurora cardinal-axis MP4 plus shared signed transform tests. |
| P1 | Native render-mode bases | World/local/linked/aligned/motion effects can face or stretch incorrectly. | One source-backed fixture and basis proof for every mode 0-6. |
| P1 | Chunk material and general collision parity | Row-22 wiring and general WOK node axis-angle transforms are live, but broader materials and native AABB/BSP traversal can differ. | Native material route, rotated-node retail contact oracle, and matched-camera NWN/Web acceptance. |
| P1 | Material/shader/PLT branches | Owner, exact MTR binding, named replacement-texture transport, culling, mode-2 reflected winding, Punch `0.2`, lane-5/6 capture transport, recursive SHD source resolution, and non-framebuffer browser custom-program execution are closed. Framebuffer visual behavior and matched custom-material/retail-palette proof remain open. | Implement the browser lane-5/6 pass and add matched proof for Punch, custom MTR, framebuffer MTR, and known-target PLT. Row-68 v11 remains the retained mode-2 culling proof. |
| P2 | Family-specific timing/randomness | Similar-looking output can still have wrong lifetime/spawn/trajectory. | Retail packet for Fountain/atlas, Explosion, P2P, Linked, Lightning/beam, and Single. |
| P2 | Placeable-hosted VFX model hierarchy | Hosted emitter/light transforms can diverge even when standalone fixture works. | Post-fix placeable packet with source hierarchy, no preview-only claims, and visual comparison. |

## Proof sequence after implementation

1. Repair data/event behavior first. Do not capture a video before the payload
   shows the correct per-emitter event owner and particle count.
2. Capture one new Aurora cardinal-axis oracle fixture if a coordinate repair is
   made. This is separate from, and does not replace, existing row-22 NWN
   evidence.
3. Implement the shared transform and render-mode-specific path with focused
   contract tests.
4. Repair Chunk resource and collision behavior before judging the fireball
   debris visually.
5. Record exactly one fresh Aurora Web MP4 for the changed fixture. Reuse the
   existing NWN MP4, produce onset/peak/late comparison frames, and write the
   remaining visual deltas.
6. Promote a fixture only when the strict manifest has source identity, parser
   snapshot, resolver trace, runtime dump, render snapshot, retail build/profile,
   capture, and comparison evidence. Otherwise leave it diagnostic.
