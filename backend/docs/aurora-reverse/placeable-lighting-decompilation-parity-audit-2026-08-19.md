# Placeable lighting decompilation parity audit

Date: 2026-08-19

Status: source-backed fixes are implemented and the retail lineage gate is
wired statically. Runtime validation is intentionally paused after the local
Node/Chrome workload exhausted workstation memory. No NWN-to-Web parity proof
is accepted yet.

## Scope and oracle

The admitted candidate is the retail placeable `plc_campfr` / model `plc_i06`.
The current isolated Web diagnostic uses the exact vanilla retail
`plc_i06.mdl`, source emitter records, `fxpa_flame00`, `fxpa_smoke01`,
`placeables.2da` light row, and `lightcolor.2da` row 6. Its runtime settings
must now isolate the Area receiver as well as the placeable; reusing the normal
committed module snapshot is not admissible because that snapshot contains
configured HAK tile sources unrelated to the oracle module. The admitted
retail placeable source is the 96,556-byte file at
`output/placeable-lighting-audit-20260819/blob-mirror-vanilla-proof/proof/placeable-lighting-vanilla-20260819/__aurora/sources/vanilla/models/plc_i06.mdl`,
SHA-256
`144d84a94f1039e1031ea6949098c0106ac81f96794df308853a28dd757d1db4`.
The proof must verify both that byte-derived digest and the normalized
`/__aurora/sources/vanilla/models/plc_i06.mdl` object-key suffix. This is
required because the native proof module currently serializes no `HakList`;
an earlier Web capture therefore admitted a different HAK lineage and was not
eligible for comparison.

A historical NWN frame is useful only for identifying the missing bright
flame/core and receiver glow. It is not a matched camera, receiver, time, or
lineage oracle. Completion still requires a fresh controlled NWN capture and a
fresh accepted Web capture of the same scene state.

## Primary Aurora evidence

- `C:/Projects/New Folder/export/decompiled_all.c:883051-883080` maps light
  radius to controller `0x58`.
- `C:/Projects/New Folder/export/decompiled_all.c:883088-883117` maps shadow
  radius to controller `0x60`.
- `C:/Projects/New Folder/export/decompiled_all.c:883124-883157` maps
  `verticaldisplacement` to controller `0x64`.
- `C:/Projects/New Folder/export/decompiled_all.c:913930-913955` consumes
  controller `0x64` in the shadow-volume light vector. It is not added to the
  diffuse-light position.
- `C:/Projects/New Folder/export/decompiled_all.c:866528-866563` computes the
  local diffuse contribution from the light node world position, radius,
  multiplier, and linear distance factor. This rejects the proposed Web-only
  `+3` position adjustment.
- `C:/Projects/New Folder/export/decompiled_all.c:856187-856233` halves the
  evaluated particle X/Y sizes and
  `C:/Projects/New Folder/export/decompiled_all.c:856616-856629` applies those
  half extents to the billboard basis. The current Web quad geometry therefore
  must not be enlarged ad hoc.
- The active retail particle shader and runtime scalar are documented in
  `vfx-particle-soft-depth-fog-audit-2026-07-19.md`: soft alpha uses
  `square(clamp((sceneDepth + fragmentViewZ) * particleSoftness, 0, 1))`, and
  the runtime scalar is `1 / min(maxHalfExtent * 0.2, 0.2)`.
- Active retail `inc_lighting.shd`, SHA-256
  `8548ea59d662829521e0618edb1511fc2a88a3ecf7108ead86829b8f3d200bf8`,
  multiplies ordinary `DiffuseLight` directly by `materialFrontDiffuse`; the
  `1 / PI` normalization is confined to `LIGHT_FORCE_INDIRECTIONAL == 1`.
  Three r184 instead defines `BRDF_Lambert` as
  `RECIPROCAL_PI * diffuseColor` for the Web material path.
- `nwmain.exe` stores the generated standard-shader header format at
  `0x140d8c220`; it injects `GAMMA_CORRECTION`, `FRAGMENT_LIGHTING`, and
  `SHADER_QUALITY_MODE`. The format is referenced from function
  `0x1400b4339..0x1400b44c4`, with those runtime values loaded at
  `0x1400b43d8`, `0x1400b43d1`, and `0x1400b43cb` respectively.
- The native client profile used by this oracle has
  `graphics.lighting.enhanced = true` and
  `graphics.general.shader-quality = "Performance"` in the user's current
  `settings.tml`. Beamdog's 8193.15 primary patch notes define enhanced
  lighting as the PBR/per-pixel path with gamma correction, roughness,
  specular reflection, and Fresnel. Therefore the earlier experimental Web
  `GAMMA_CORRECTION == 0` material-order patch is not eligible for this oracle
  and has been removed.
- For Performance quality with no explicit roughness/specular texture or MTR
  override, active retail `inc_material.shd` selects
  `fSpecularityMin = 0.04`, `fGeneratedRoughnessMax = 0.65`, and zero generated
  metallicness. Three's dielectric baseline is also 0.04, but the converted
  vanilla campfire material previously retained roughness `0.9921875` from a
  generic legacy-shininess heuristic.
- Direct `nwmain.exe` inspection found the `fx_placeable01` / `auroralight01`
  light-construction path at `0x1407d8ed0..0x1407d9599`. The three
  `placeables.2da` LightOffset components are added to a local vector at
  `0x1407d9477..0x1407d9499`; the result is then passed through the model
  transform vtable at `0x1407d94b3..0x1407d94c9`. The equivalent second path
  is at `0x140870cc0..0x140871432`, with vector adds at
  `0x140871371..0x1408713b8`. This confirms that the Web model's uniform
  `0.1` transform must also scale LightOffset; adding an extra Web-only offset
  or bypassing that scale would be incorrect.

- `nwmain.exe` `GetLightAdjustedColor` at
  `0x14007f380..0x14007f470` normalizes a localized light's RGB by the
  maximum channel when that maximum is greater than `1`. The Web adapter must
  not preserve that maximum a second time as `PointLight.intensity`.
- `nwmain.exe` `GetLightAdjustedRadius` at
  `0x14007f480..0x14007f501` leaves distant radii (`>= 1000`) alone. For a
  localized light it multiplies radius by the source multiplier, then by
  `max(R,G,B)` when it is above `1`, and finally by the configured cutoff
  range multiplier. `SetLightGL` at `0x140080c10..0x140080ef2` squares this
  adjusted radius and stores its sign in `lightColor.a` for the
  diffuse-versus-ambient lane.
- The active uniform upload at `0x1400b8ced..0x1400b8df4` uses exponent
  `-2.2` and the active Enhanced/Performance settings
  `cutoff = 2`, `intensityAtRange = 0.2`, and `maxIntensity = 1.5`:

  ```text
  lightMaxIntensityInv = maxIntensity^-2.2
  lightFalloffFactor = cutoff^2 *
    (intensityAtRange^-2.2 - maxIntensity^-2.2)
  ```

  Active retail `inc_lighting.shd` then evaluates, for
  `x = distance^2 / adjustedRadius^2`, `(1-x) /
  (lightMaxIntensityInv + lightFalloffFactor*x)` and returns zero for
  `x >= 1`.

## Exact source inputs

The processed `plc_i06` package contains:

- `LightOffset = (0.240711, 0.011001, 0.194654)`;
- `LightColor = (1.9, 1.9, 1.0)` from `lightcolor.2da` row 6;
- `ShadowSize = 1`;
- flame emitter `OmenEmitter250`, additive `GL_SRC_ALPHA / GL_ONE`, sizes
  `0.5 -> 1.0`, and the retail `fxpa_flame00` 4x4 atlas.

The current Area host applies the uniform Aurora-model-to-Web scale `0.1` to
the canonical emitter group. At deterministic capture time `t = 2`, the fixed
runtime records flame `maxHalfExtent = 0.0478515625` and
`particleSoftness = 104.48979591836735`; smoke records
`maxHalfExtent = 0.0411458343` and `particleSoftness = 121.519...` in the same
scaled view-space units as the depth texture.

## Fixed source-backed Web defects

### 1. Soft-depth world-scale mismatch

Previously, `particleSoftness` was evaluated before the canonical emitter host
received its uniform `0.1` Area scale. The fragment shader then compared that
unscaled scalar with depth differences measured in scaled Three view space.
The runtime now evaluates and records source half extent, effective world
scale, scaled half extent, and scaled softness in one unit system.

For the accepted flame sample:

```text
current:  maxHalfExtent = 0.416015625
          particleSoftness = 1 / (0.416015625 * 0.2) = 12.018779...

required in Web view space after scale 0.1:
          maxHalfExtent = 0.0416015625
          particleSoftness = 1 / (0.0416015625 * 0.2) = 120.187793...
```

Because Aurora squares the soft fade, the old unit mismatch could suppress the
near-receiver flame alpha by roughly two orders of magnitude in the
unsaturated part of the fade. The current deterministic frame retains visible
flame geometry with settled depth and the retail postprocess lane enabled.

### 2. Lambert normalization mismatch

The source-backed MDL material adapter now expands the exact Three `common`
chunk for admitted `aurora-mdl-material` provenance and removes Three's
unconditional `1 / PI` diffuse normalization. It fails closed when the expected
shader shape is not present and carries the retail shader hash in diagnostics.

### 3. Enhanced-Performance material profile mismatch

The source adapter no longer applies the rejected gamma-zero transform. For
admitted `MeshStandardMaterial` instances with exact zero source MDL specular
and no authored specular/roughness texture or MTR override, it now selects the
confirmed Performance baseline `roughness = 0.65`, `metalness = 0`. Explicit
material inputs and nonzero legacy MDL specular are preserved and reported,
not guessed. The adapter records the profile
`nwn-ee-enhanced-performance` and uses a distinct shader cache key.

### 4. Wrong point-light profile, range, and HDR projection

The prior Web path used the inactive `GAMMA_CORRECTION == 0` quadratic
surface approximation, stored the maximum source RGB in Three intensity, and
stopped at the unadjusted source radius. For `plc_campfr` in Area scale this
produced `intensity = 1.9`, `distance = 1`, and `decay = 1`.

The Enhanced/Performance adapter now follows the recovered native sequence:

```text
source RGB          = (1.9, 1.9, 1.0)
adjusted RGB        = (1.0, 1.0, 1.0 / 1.9)
source radius world = 10 * 0.1 = 1
effective range     = 1 * multiplier(1) * maxRGB(1.9) * cutoff(2) = 3.8
Three intensity     = 1
Three decay marker  = 1.25 (selects the exact Enhanced shader branch)
```

The `1.25` decay value is only an internal branch discriminator; it is not an
Aurora physical exponent. The patched Three shader evaluates the recovered
retail formula above. The legacy `decay = +/-1` path remains available for
source-MDL light lanes that have not yet been admitted to this exact active
profile, preventing this fix from silently promoting unproven semantics.

## Remaining semantic boundary

Three `MeshStandardMaterial` still computes its own PBR `totalSpecular` after
the corrected diffuse path. The baseline F0/roughness/metalness inputs now
match this Performance oracle, but retail `inc_lighting.shd` uses its own
`SPECULAR_LIGHT`, roughness, specularity, Fresnel, environment, and
transparency equations. This audit does not authorize a visual tuning constant
or a blanket `totalSpecular = 0`.

The apparent flame size in the historical native frame also cannot be used as
a scale measurement because its camera, receiver, and animation timestamp are
not matched to the current Web diagnostic.

## Rejected captures and corrected proof admission

The following artifacts remain useful diagnostics, but none is an accepted
NWN parity proof:

- `aurora-web-vanilla-gamma0-material-gate-pass-t2.png` uses the rejected
  gamma-zero material branch and is not eligible for the active native
  Enhanced/Performance oracle.
- `aurora-web-vanilla-enhanced-performance-gate-pass-t2.png` shows that the
  isolated vanilla input can render a bright flame and a broad receiver
  response. It has no matched native camera/time packet and predates the
  byte-lineage admission gate, so it cannot close parity.
- `aurora-web-vanilla-enhanced-native-point-t2-v5.frame.json` and
  `aurora-web-vanilla-enhanced-native-point-t2-close-v6.frame.json` recorded
  `accepted: true`, but also recorded `canonicalParityPromoted: false`,
  `localOnlyNotRetailEvidence: true`, `placeableLightingProof.status =
  blocked`, and `retailParityStatus = blocked_pending_matched_nwn_oracle`.
  Their resolved package was the `lc_hd_plcbls` HAK variant despite the
  misleading `vanilla` filename. They are rejected.

Static package inspection also explains why the rejected HAK frames visually
lost the flame: that override has four taller HD static-geometry nodes while
the admitted retail model has eight retail static-geometry nodes, yet the
source emitter remains at the same low local transform. Geometry occlusion is
therefore the evidence-backed explanation for those HAK frames. It is an
inference, not authority for moving or scaling the emitter; Aurora evidence
above rejects an arbitrary Web-only emitter offset or size multiplier.

The capture contract now separates two facts:

- `captureIntegrityAccepted` says that the Web frame was technically settled;
- `retailParityAccepted` says that a matched NWN oracle has admitted it.

For Area placeable-lighting captures, legacy top-level `accepted` follows
`retailParityAccepted`, not capture readiness. A technically valid local frame
can therefore no longer report `accepted: true` while retail parity is still
blocked. The capture is classified from the Area proof route itself; a missing
proof snapshot cannot downgrade the request to a generic capture and bypass
these checks. The requested `oracleFixture` is also read from the immutable
capture URL and must match the DOM echo, so omitting the dataset attribute
cannot suppress the retail-lineage gate.

The OFF/ON diagnostic consumer now admits each input through
`captureIntegrityAccepted`, not legacy top-level `accepted`. This preserves a
valid functional-ablation lane while top-level acceptance correctly remains
false until an NWN comparison exists; the ablation report still hard-codes
`canonicalParityPromoted = false`.

The oracle gate also no longer treats the existence of any Three `PointLight`
as sufficient. For an enabled `als-oracle-campfire-v1` light it requires one
`placeables-2da-point-light` with the source-backed row-6 RGB, radius `10`,
Area scale `0.1`, world radius `1`, exact `LightOffset` and mapped offset,
adjusted RGB `(1, 1, 0.526316)`, range `3.8`, intensity `1`, decay discriminator
`1.25`, Enhanced/Performance proof status, and an installed shader patch. A
regression to the old `intensity=1.9`, `distance=1`, `decay=1` profile now
emits `area-placeable-light-projection-invalid` and cannot produce an admitted
capture. The disabled-light half of an OFF/ON pair is intentionally exempt
from this positive-light gate and remains subject to the isolated ablation
pair validator.

## Byte-lineage contract implementation

The catalog parser already computed SHA-256 from the exact source MDL bytes,
but the catalog service replaced that digest with the storage ETag and then
dropped the value from the public placeable package. That made a HAK model and
the retail model impossible to distinguish reliably at capture time.

The additive contract now:

1. propagates the parser's byte-derived lowercase SHA-256 through emitter,
   light, static-geometry, model-graph node, and animation-event records;
2. validates the digest shape at the frontend HTTP boundary while retaining
   optionality only for legacy cached packages;
3. requires the exact retail object-key suffix and full SHA-256 for the
   immutable `als-oracle-campfire-v1` fixture;
4. emits `area-placeable-source-lineage-not-retail` and fails closed for a
   missing, ambiguous, malformed, HAK, or wrong-hash lineage;
5. sets `bypassCache = true` only for that oracle fixture so a legacy cached
   package without the new digest cannot prevent a fresh proof request. Normal
   Area rendering retains its existing cache policy.

This is a provenance correction, not a new Aurora rendering-semantic guess.

## Area receiver lineage defect and correction

The exact packed oracle module
`C:/Users/enonw/Documents/Neverwinter Nights/modules/als_oracle.mod` has
SHA-256
`29e158317794d6519e2a807cec5ce4bfd4b025be33886694b1340515d9c94604`
and intentionally serializes no `Mod_HakList`. The fixture verifier records
`sourceRuntimeFieldsPresent: []`, `sourceHakListStripped: true`, and
`sourceCustomTlkStripped: true` in
`artifacts/light-shadow-retail-oracle-drivers/oracle-module-fixture-no-input-proof.json`.
An authoritative empty HAK list means Aurora resolves `tin01` from vanilla; it
does not authorize a configured project-wide tile HAK profile.

The source-proof-pack resolver previously collapsed two different states:

1. `module.ifo` is unavailable, so a configured fallback may be needed for a
   diagnostic source pack;
2. `module.ifo` is present and its HAK list is authoritatively empty.

It consequently selected the global `lc_tiles` profile and recorded the CEP3
`tin01.set` in the earlier source pack. That is the concrete reason the
historical Web comparison showed a stone receiver while NWN showed a wooden
floor. The frame was not a comparison of the same scene assets, so no lighting
conclusion may be drawn from it.

The resolver now preserves the distinction. With authoritative IFO evidence,
it uses exactly the ordered module HAK list, including an empty list, and then
falls through to vanilla KEY/BIF resources. Configured priority/profile HAKs
are considered only when IFO evidence is genuinely unavailable. The generated
summary records `moduleIfoHakListAuthoritative`, the exact list, selected HAK
source, and resolution policy; the oracle policy must be
`module-ifo-hak-list-then-vanilla` with `selectedHakNames: []`.

The immutable vanilla receiver closure is:

- `tin01.set`: 139,772 bytes, SHA-256
  `e45bfba6f61442e7618b7477f0967943b6ff74a2c02593da6c031c641b3e6ac4`;
- `tin01_d11_01.mdl`: 5,224 bytes, SHA-256
  `08c7810e8faf1ba4d4730cf14c8fb2737cf5f695e02e3d4f38d0e51f086da44d`;
- v18 derived `tin01_d11_01.glb`: 5,836 bytes, SHA-256
  `0c8a58aa3f6643f09dfe888ce82cf82da25cfb2a184b31ad534b0e7425161cd1`;
- preferred vanilla `tin01_shpflr1.dds`: 174,796 bytes, SHA-256
  `dae40e6294f63ac13ced7de4e138b32c57ef99357a291f2664178ed8a8ed7eb7`.

The additive tile contract now carries byte-derived SHA-256 for the source
MDL, derived GLB, and material texture. The immutable ALS fixture bypasses the
tile process cache and fails closed unless the sole receiver entry has the
exact vanilla object-key suffixes and all three hashes above. The central CDP
capture reports `area-placeable-terrain-source-lineage-not-retail` when that
gate is not `pass`. This prevents another technically settled but asset-wrong
stone-floor frame from entering the NWN comparison.

The exact additive boundary, compatibility policy, and payload budget are
frozen in
`placeable-lighting-terrain-lineage-contract-v1-2026-08-19.md`.

These resolver and contract tests are authored but remain unexecuted under the
resource-safety pause.

## AUR-S07 profile readiness

The central native profile inputs that are already source-proven are frozen as:

- module path:
  `C:/Users/enonw/Documents/Neverwinter Nights/modules/als_oracle.mod`;
- module SHA-256:
  `29e158317794d6519e2a807cec5ce4bfd4b025be33886694b1340515d9c94604`;
- Area: `als_light_lab`;
- entry point: `[65, 55, 0]` with direction `[0, 1]`;
- ordered HAK list: `[]`;
- fixture: retail `plc_campfr` / appearance 58 / model `plc_i06` on the
  vanilla `tin01_d11_01` receiver.

A valid `aur-s07-runtime-profile/v1` is not written yet because the central
contract requires a fresh `geometryGate.status = verified` artifact and its
SHA-256. The existing fixture-preparation record explicitly proves no retail
pixels and cannot be relabeled as native geometry evidence. After the resource
pause is lifted, the first native action is to capture and validate that exact
geometry gate; only then may the profile be materialized and armed. This is an
intentional no-guessing blocker, not an implementation shortcut.

## Matched-oracle parity admission implementation

The previous capture contract correctly prevented an Area Web frame from
self-promoting: `captureIntegrityAccepted` can be true while
`retailParityAccepted` remains false. It did not, however, provide a lawful
later transition after a real NWN comparison. A capture therefore could never
be promoted even after the missing proof was produced.

The additive post-capture validator is now implemented at
`backend/scripts/validate-placeable-lighting-matched-retail-parity.mjs`, with
its contract at
`placeable-lighting-matched-retail-parity-admission-contract-v1-2026-08-19.md`
and focused tests at
`backend/test/unit/validate-placeable-lighting-matched-retail-parity.spec.ts`.

It is deliberately a validator, not another Toolset/NWN or browser runner. Its
`compare` command re-hashes the exact AUR-S07 profile/packet/validation output,
runtime observation/capture/log, Web frame/screenshot, source lineages,
camera/time alignment, and a pre-tuning tolerance policy based on at least two
distinct NWN capture hashes frozen before the next parity-guided Web change. It
writes NWN-left/Web-right and heatmap artifacts
plus feature metrics, but always leaves retail parity false. Its independent
`admit` command can emit a candidate-specific parity admission only after a
separate visual review is hash-bound to that comparison and accepts flame core,
additive glow, receiver footprint, hue, scale, and background exposure while
rejecting every placeholder/debug/procedural/stale artifact.

Static source review corrected two identities before execution:

- module entry remains `[65,55,0]`, but `als_shcamp.nss` creates the campfire at
  `[65,65,0]`;
- its capture cue is delayed by `1.0` second and `AlsCamera()` calls
  `SetCameraFacing(0.0, 10.0, 45.0)`.

The matched profile and validator bind those separate facts. They do not reuse
the earlier unmatched Web `t=2` frame. The new tests are authored but remain
unexecuted under the resource-safety pause, and no parity admission exists yet.

## Resource-safety pause

A full runtime-settings rebuild previously exhausted roughly 45 GB and failed.
Later parallel Node/Chrome work caused a user-reported roughly 15 GB memory
load and a workstation lockup. Runtime proof is therefore paused: no Node,
Chrome, Vite, Nest, test runner, capture, NWN, or Toolset process may be
started by this task until the user explicitly revokes the pause. After that,
the repository-wide ceiling is one backend family, one frontend family, and
one capture family at a time.

## Historical deterministic Web evidence

The earlier isolated Web diagnostic at `t = 2` has:

- an isolated mirror containing the exact vanilla `plc_i06.mdl` bytes and the
  full SHA-256 listed above;
- render/proof gate `pass`, settled model, textures, terrain, depth, VFX,
  bloom, and postprocess;
- 2 visible placeable meshes, 43 particles, and one source point light with
  intensity `1.9`, distance `1`, decay `1` plus Aurora falloff patch;
- raw-gamma maximum approximately `(2.309, 2.119, 1.571)` and 273 pixels above
  the bloom threshold;
- a bright-flame Enhanced/Performance diagnostic at
  `output/placeable-lighting-audit-20260819/aurora-web-vanilla-enhanced-performance-gate-pass-t2.png`.

The gamma-zero artifact is rejected for its material profile. The
Enhanced/Performance artifact is also not accepted proof because it is not a
fresh lineage-gated capture paired with a matched NWN frame; its recorded
`intensity = 1.9`, `distance = 1`, `decay = 1` also predates the corrected
native point-light profile. A new capture is required after the resource pause
is explicitly lifted.

The projection and capture-contract tests for the changes above have been
authored but intentionally not executed while the resource-safety pause is in
force.

## Required implementation and proof gates

1. Re-capture the campfire at deterministic Web `t = 1.0`, matching the
   `als_shcamp.nss` capture cue, with the confirmed
   Enhanced/Performance profile, exact retail object key and SHA-256, and
   settled depth, textures, point light, VFX, bloom, and postprocess.
2. Capture the same candidate, Area receiver, camera pose, time/animation
   state, resolution, and vanilla lineage in NWN and Aurora Web.
3. Save a side-by-side artifact and quantitative ROI report. The proof must
   include the flame core, additive glow, receiver footprint, hue, apparent
   scale, and background exposure.
4. Require `captureIntegrityAccepted = true` and a separate matched-oracle
   admission that sets `retailParityAccepted = true`.
5. Do not close parity until those features are at least visibly similar and
   all proof freshness, provenance, asset-settlement, and render gates pass.
