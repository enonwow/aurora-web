# VFX Retail SSAO Runtime Contract Audit (2026-08-07)

## Scope

This Aurora-first continuation closes the shared scene-pass contract required
to implement active retail SSAO around VFX. SSAO is a receiver/scene effect; it
must run before later VFX draw buckets and cannot be used to tune particle
shape, lifetime, motion, or effect-specific parameters.

## Admitted sources

- Toolset binary:
  `C:/Program Files (x86)/Steam/steamapps/common/Neverwinter Nights/bin/win32/nwtoolset.exe`.
- Toolset SHA-256:
  `4C156DE898817518E8A97F5D989592894D3C8F48B71D27E2A8B89500CD230F24`.
- Decompiled source:
  `C:/Projects/New Folder/export/decompiled_all.c`.
- Decompiled-source SHA-256:
  `36BB8B1031AFE2ABF23F0E18180A5AD649401D9EA5E078E5170A31A96167C572`.
- Active retail shader inventory:
  `artifacts/vfx-postprocessing-2026-07-19/active-retail-postprocessing-shader-audit.json`.
- Active capture settings:
  `C:/Users/enonw/Documents/Neverwinter Nights/settings.tml`.
- xoreos was not consulted. There is no `secondary-gpl-reference`
  observation in this audit.

## Recovered profile

The active settings enable `graphics.fbo.ssao` and select shader quality
`Performance`. The active source hashes are:

- `fsfbssao`:
  `98674A357FEA91FBCEC331A84EB66E0F60B4BFA3BEE4D304560D0116DDB774BF`;
- `inc_postpr_ssao`:
  `944C76F59F7E9BCAAAE1D9F66A1F2B83CB57BED116FAD2EE4EE06910F3F04671`;
- fallback `vsfbssao`:
  `F68BED245A280F4E7C34189693C397942DEA4A45FEA906E5273222CB843A82C1`;
- active `inc_framebuffer`:
  `4779A9FE01A4419A8A1E394FFDDD095D9BBDA743E2476277EBC38ADD23421686`.

The Toolset data section stores the registered defaults at the decompiled
configuration variables:

- `ssao_radius`, `DAT_00cbfca8`: float32 `0.03`;
- `ssao_intensity`, `DAT_00cbfcac`: float32 `0.5`;
- `ssao_color`, `DAT_00cbfcb0`: float32 `1.0`.

The active shader uses `AOIntensity`, fixed angular fidelity `8`, range
fidelity `6`, range `30`, near fade `0.135`, occlusion darkness `0.15`,
exposure highlight `0.075`, and exposure-to-occlusion ratio `4`. The
`Performance` quality branch uses the source checkerboard angle basis rather
than the high-quality random rotation.

## Recovered pass and blend order

`FUN_00a22024(param_2 == 0)` executes three `fsfbssao` subvariants: modifier,
first diagonal blur, and second diagonal blur/application. Disassembly at
`nwtoolset.exe:0x00a22284-0x00a222e9` calls the blend wrapper first with table
indices `(3,0)` and restores `(0,1)` afterward. The admitted blend table at
`0x00cc99f0` maps those to:

- SSAO application: `glBlendFunc(GL_ZERO, GL_SRC_ALPHA)`;
- restored default: `glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA)`.

The final SSAO subvariant writes the blurred modifier in alpha, so the native
application multiplies existing scene color by that factor. The symbolic
retail ordering audit independently places framebuffer effects phase `0`
after the opaque scene and before later draw buckets; bloom/postprocess runs in
phase `1` near the end.

## Implementation contract

Aurora Web must therefore:

1. render the source scene color and depth;
2. reconstruct perspective depth and normals with the active framebuffer
   equations;
3. evaluate the eight-by-six SSAO search with intensity `0.5` and source fog
   attenuation;
4. execute the two diagonal blur directions with weights `4,4,2,2,1,1` over
   divisor `14`;
5. multiply the linear receiver scene by the blurred modifier;
6. draw raw-gamma VFX after SSAO, then run retail bloom and postprocess;
7. expose source hashes, runtime profile, camera admission, pass count, and
   exact stage order in diagnostics.

Orthographic cameras cannot use the recovered perspective-depth contract and
must fail closed or skip SSAO with an explicit diagnostic. No approximation
may be labelled retail SSAO.

## Proof boundary

This source contract authorizes a shared scene-pass implementation and tests.
It does not prove pixel parity. A fresh Web capture is meaningful only when
the matched retail scene has equivalent receiver geometry, camera, depth,
fog, and the saved SSAO-enabled profile. The approved NWN MP4 must be reused;
NWN must not be replayed merely to obtain another copy.

## Implemented shared runtime path

`AuroraRetailBloomPass` now owns the recovered SSAO scene stage. It renders a
perspective depth texture, evaluates the eight angular probes with six
source-ordered range probes each, performs both diagonal blur passes, and
multiplies the linear receiver scene before raw-gamma VFX, bloom, retail
postprocess, and final gamma output. The default active profile is shared by
all scenes using this pass; there is no row, model, emitter, host, or Fireball
condition.

The pass fails closed for non-perspective cameras with
`skipped-unsupported-non-perspective-camera`. The NWN comparison runner now
publishes the configured state, runtime admission, intensity, quality mode,
pass count, blend factors, stage order, and all four admitted source hashes.

## Verification and fresh proof

- Focused SSAO/bloom and comparison-runner tests: `47/47` passed.
- Shared canonical VFX, model-material, workspace camera, SSAO/bloom, and
  comparison-runner regression: `207/207` passed.
- Frontend TypeScript: passed.
- Frontend production build: passed.
- Perspective Chrome/WebGL fixed-time preflight: `ready`,
  `source-backed-retail-ssao-active`, three passes, proof-gate `pass`, no GLSL
  compilation error, and `610757` changed framebuffer pixels.
- Static preflight PNG SHA-256:
  `9161BA754C08E610BCEC8FCDAFFC5942B72C4E0DDB47978910228A391DC7758F`.

Exactly one fresh Web playback was recorded after the visual revision. It has
`187` encoded frames at 12 fps, `triggerCount=1`, `loop=false`, no overlap,
proof-gate `pass`, clean post-roll, and zero final particles. The saved NWN
oracle was reused without rerun.

- Web MP4:
  `evidence/vfx-nwn-web-row22/web/web-row22-one-trigger-v83-retail-ssao-20260807.mp4`;
  SHA-256
  `42660B0E09CE299E438D0DC286AA760A2A388900C935DC1720BB5E75E8C2680D`.
- Saved NWN MP4 SHA-256:
  `F6414E0D184131CE74836C208E6334BB62CF023C502725223758185DD41F0983`.
- Onset-aligned comparison MP4 SHA-256:
  `2744AECAA5D3FEB6B3385ECC457A6664FFA4887644041C4A2D42332A6E256C18`.
- Comparison PNG SHA-256:
  `E911ACF6A5C459ED66B06CA98A990B8FAF982D1EEDBFE6BA6D8A92DA66A781DF`.

The capture is valid implementation evidence and remains
`diagnostic-only-single-playback-open-context-gaps`. Exact camera, actors,
owner/target, full room reconstruction, and per-frame NWN runtime timestamps
remain unavailable. The frame comparison also still shows a different
Fireball flash, contour, and tail composition, so pixel and lifecycle parity
are not claimed.
