# ProgFX Type 10 projectile audit - 2026-07-18

> **Timing correction (2026-08-13):** the original audit misidentified
> `0x140c946b0` as an RNG helper and read the additive constant as `2.0f`.
> Direct re-disassembly proves deterministic
> `distance / (1.5 + 3 * logf(distance))`, converted to integer milliseconds.
> The authoritative correction is
> `vfx-progfx-type10-log-timing-correction-audit-2026-08-13.md`.

## Verdict

The `VFX_IMP_MIRV` ProgFX row does not create four projectile owners.
`Param4=4` selects projectile path style 4. Retail creates one
`CNWCProjectile`; the several bright points visible in NWN are particles left
behind by the moving model.

Aurora Web now implements the recovered Type 10 path-4 owner lane:

- one owner only;
- `Param1..Param5` are typed from `progfx.2da`;
- the retail `log` timing formula is preserved;
- path style 4 moves the owner linearly toward the destination;
- emitters are evaluated at the moving owner before each runtime tick, so old
  particles remain in world space;
- the owner model, particles, and source-MDL light are released after arrival;
- the proof runner no longer translates the whole VFX group.
- `ambientOnly` source lights remain positional and radius-limited instead of
  becoming global Three.js ambient lights.

This closes the former trajectory-ownership defect. The matched proof remains
`matched-with-open-material-lighting-gaps`, not pixel parity.

## Retail contract

Audited binary:

`C:\Program Files (x86)\Steam\steamapps\common\Neverwinter Nights\bin\win32\nwmain.exe`

Recovered dispatch:

- `CNWCVisualEffectOnObject::ApplyChunk`: `0x14096a110..0x14096a539`
- Type 10 jump target: `0x14096a391`
- Type 10 handler: `0x14096a9a0..0x14096aff0`
- projectile path selector: `0x140987770`
- path-4 update: `0x1409845c0`

Type 10 parameters:

| Column | Row 900 value | Retail use |
| --- | --- | --- |
| `Param1` | `vpr_magmisl` | owner model |
| `Param2` | `340` | projectile row/config |
| `Param3` | `0` | raw orientation mode |
| `Param4` | `4` | path style, not owner count |
| `Param5` | `log` | deterministic logarithmic distance timing branch |

The Type 10 handler allocates one `0x240`-byte `CNWCProjectile`, loads
`vpr_magmisl`, writes path style 4, and computes the `log` travel time from:

```text
speed = 1.5 + 3.0 * logf(distance)
durationMilliseconds = trunc((distance / speed) * 1000.0)
durationSeconds = durationMilliseconds / 1000.0
```

The float32 `logf`, `3.0f`, `1.5f`, `1000.0f`, and truncating conversion are
all present in the retail handler. This branch has no RNG input.

For path style 4, `0x1409845c0` resolves constant velocity toward the target
when acceleration is zero and clamps the final step at the destination.

## Capture geometry

The approved module source audit records:

- source: `(9.5, 3.799999952316284, 0)`
- target `effect_test`: `(9.5, 6.8, 0)`
- object-origin distance: `3.0`

Durable source-scene evidence:

- `evidence/vfx-nwn-broad-proof-2026-07-16/row181/comparison-type10-path4-20260718/source-scene/module-ifo-area-entry.json`
- `evidence/vfx-nwn-broad-proof-2026-07-16/row181/comparison-type10-path4-20260718/source-scene/objects.csv`

The current Web fixture preserves the exact source-centered 3 m Aurora axis as
`(0,0,0) -> (0,3,0)`. The recovered float32 formula yields `625.5425 ms` and
Aurora truncates it to a `625 ms` owner path. There is no proof-fixture timing
calibration and no unavailable retail RNG seed in this branch.

## Implementation

- `backend/src/modules/vfx/domain/aurora-vfx-progfx-type10-projectile.ts`
  owns the formula, path-4 trajectory, and owner lifecycle snapshot.
- `backend/src/modules/vfx/domain/aurora-vfx-source.parser.ts` types the five
  Type 10 parameters.
- `backend/src/modules/vfx/application/vfx.application.service.ts` composes the
  owner with each source emitter before runtime simulation.
- `backend/src/modules/vfx/domain/aurora-vfx-runtime-state.ts` releases all
  owner particles when the projectile reaches its destination.
- `frontend/src/modules/layout/adapters/three/auroraVfxCanonicalRenderer.ts`
  applies the owner transform only to source-MDL lights. It never translates
  historical particle frames. It maps `ambientOnly` to the shared localized
  ambient irradiance adapter while retaining the light as a positional
  `THREE.PointLight`.
- `frontend/src/modules/layout/adapters/three/auroraThreeLightFalloff.ts`
  patches the shared Three point-light shader before built-in lit materials
  compile. A negative `decay` is an internal channel marker only; attenuation
  uses its absolute value, while the marked light bypasses `RE_Direct` and
  contributes to radius-attenuated indirect diffuse irradiance without
  normal-facing or specular response.
- The same channel adapter is used by source-MDL lights on placeables and
  creatures. The former creature-only global `THREE.AmbientLight` fallback and
  its invented `0.25` multiplier are removed.
- `backend/scripts/prepare-vfx-web-broad-proof-fixtures.ts` removes the old
  proof-only `groupMotion` from row 181.
- `backend/scripts/capture-vfx-nwn-web-row68-once.mjs` now refuses to open
  Chrome when the requested recording does not cover the fixture's complete
  `2 s` pre-roll, runtime duration, and `2 s` post-roll.

Focused verification:

- backend: `54/54`
- shader adapter plus canonical renderer: `51/51`
- placeable localized-ambient regression: passed
- creature localized-ambient regression: passed
- backend build: passed
- frontend build: passed

## Source-MDL light channel follow-up

`vpr_magmisl/AuroraLight02` declares:

- color `(0.419608, 0.705882, 0.925491)`;
- radius `5`;
- multiplier `1.5`;
- `ambientOnly 1`.

The approved Toolset decompilation parses `ambientonly` into the model-light
field at `+0xb4` in `FUN_00a5872c`
(`decompiled_all.c:883198-883204`). `FUN_00a4cd58` copies that exact field to
active-light channel selector `+0x68`
(`decompiled_all.c:874699-874721`). The native upload in `FUN_00a40b60`
therefore writes the light color either to the local ambient slot or to the
local diffuse slot, while both branches keep the same position and
radius-based attenuation (`decompiled_all.c:865365-865408`). The audited path
does not turn `ambientonly` into a scene-global light.

Aurora Web previously mapped `ambientOnly=true` to `THREE.AmbientLight`,
discarding position and radius. It now keeps the authored position, radius,
color, multiplier, animation, and light-budget identity. The shared shader
adapter sends marked lights to localized irradiance and omits Three's direct
diffuse/specular path. This closes the channel-selection implementation defect
for canonical VFX, placeable source-MDL lights, and creature source-MDL
lights. Exact NWN material calibration, receiver geometry, bloom, and pixel
response remain open and are not claimed as parity.

Real-browser validation used the installed, provenance-verified OpenAI
`playwright` skill and the repository's fixed-time diagnostic route. It did
not start an NWN process and did not invoke the row-181 playback trigger. At
effect time `0.25 s`, WebGL reported:

- one active `AuroraLight02`;
- `ambientOnly=true`;
- internal channel marker `decay=-1`;
- radius `5`, intensity `1.5`;
- two compiled renderer programs with empty program, vertex, and fragment
  logs;
- diagnostic framebuffer `changedPixelCount=413962`, `error=0`.

The neutral receiver exists only under `diagnostics=1`; the clean comparison
route remains receiver-free. Supplemental diagnostic:

- `evidence/vfx-nwn-broad-proof-2026-07-16/row181/aurora-web/aurora-web-row181-localized-ambient-diagnostic-20260718.png`
- SHA-256:
  `0938A1BB59105F9061822C64E2989F60E65D9F2F8D019E007228DE4D86FF6044`

## Proof packet

No new NWN run was launched. The comparison reuses the approved one-trigger
oracle:

- NWN MP4 SHA-256:
  `B6106159AD902A281FA245331BF92A366B1199A650C2D2A71909F569E71ED7C6`
- fresh Web MP4 SHA-256:
  `7C881386D00C1BC07D91E8550EA201356956D55C2D057BC3ABF9EC1037A45905`
- fresh Web summary SHA-256:
  `3B9C18933B6A25599E1116C2E55E9DFD2189AEAE5D95FB27431342D2C0195F88`
- side-by-side MP4 SHA-256:
  `1E75457EFCF56D911D66810DF2B7DDE1012C787A51B397A0DDAB50DE1AC8DD85`

The fresh Web summary proves one trigger, no loop, owner motion through six
visible runtime frames, and zero particles from the following frame onward.
While the owner is active, it also records one localized source light with
color `#addbf6`, radius `5`, and intensity `1.5`; the light count returns to
zero with owner destruction.

The new Web MP4 is byte-identical to the preceding lifecycle capture. This is
expected: the clean comparison runner intentionally contains no proof-only
receiver geometry, so correcting a light's global-versus-local mapping does not
change its black-background pixels. The new timestamp, summary timeline,
renderer regression, and comparison manifest prove the implementation
revision without fabricating scene geometry. The separate fixed-time
diagnostic screenshot exercises the new receiver-lighting channel but is not a
replacement for the NWN comparison.

Open visual differences:

- NWN has a whiter/yellower core and stronger blue illumination on scene
  geometry and characters.
- Web has a more saturated blue star and a different bloom footprint.
- Exact particle cadence, matched receiver geometry, material calibration, and
  final light/bloom response remain open.

These are implementation/proof follow-ups, not blockers and not grounds for a
parity claim.

## Dynamic-contrast local-light follow-up

The retail `inc_postpr_dyn_c.shd` vertex path includes every admitted local
light in the dynamic midpoint. Under gamma correction it:

- starts from factor `0.15`;
- applies projected-screen attenuation only when `lightColor[n].a > 0`;
- squares the factor;
- derives falloff as `inversesqrt(abs(lightColor[n].a))`;
- attenuates by view-space `z`, with the source `100x` penalty behind the
  camera;
- adds `factor * lightColor[n]` before `RevertColorSpace`, fog mixing and luma.

The Toolset `FUN_00a40b60` upload writes the sign of active-light `+0x68`
`ambientOnly` into alpha and stores the squared effective range. The recovered
`FUN_00a40904` path applies source radius, MDL `multiplier`, overbright-color
normalization/range expansion and the capture profile's
`graphics.lighting.cutoff-range-multiplier=2.0`.

`auroraRetailBloomPass.ts` now evaluates that contract per frame for the three
proven source-MDL adapters: canonical VFX, placeable source-MDL and creature
source-MDL. Generic workspace fill, `placeables.2da`, item-property and tile
lights are counted but excluded until their exact native upload mapping is
recovered. A source-MDL local light can activate dynamic contrast without
inventing area lights.

The first live Web capture exposed a second source mismatch: Aurora's fragment
shader clamps the HDR brightness term with
`max(0.0, 1.0 - brightness * brightness)`, while the Web port lacked `max`.
That produced visible black holes inside the saturated row-181 core. The
capture was preserved and marked rejected, the exact clamp was restored, and
a fixed-time Playwright check showed a clean core before one final playback
was recorded.

Final proof packet:

- reused NWN MP4 SHA-256:
  `B6106159AD902A281FA245331BF92A366B1199A650C2D2A71909F569E71ED7C6`;
- final Web MP4 SHA-256:
  `20CC45EA8868EAD2F2EEA0291307AE0CD835B30B05E73DF5D8CD513A38D67B73`;
- side-by-side MP4 SHA-256:
  `5082D166F41BC86C8B5CA0473D762EBEC90BE9CAD3E90D973980714A11923352`;
- manifest:
  `evidence/vfx-nwn-broad-proof-2026-07-16/row181/comparison-dynamic-contrast-20260718/comparison-manifest.json`.

The final Web summary proves one trigger, no loop, no diagnostic harness and a
clean zero-particle/zero-light post-roll. The status remains
`matched-with-open-material-lighting-gaps`: Web is still more blue-violet with
a narrower core and longer visible trail, while NWN has broader white
saturation and scene-integrated illumination.
