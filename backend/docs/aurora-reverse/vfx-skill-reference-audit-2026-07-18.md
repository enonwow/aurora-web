# Aurora Web VFX Skill Reference Audit - 2026-07-18

## Scope and verdict

This is an Aurora-first, read-only audit of locally available skills and pinned
external skill sources that may help implement, diagnose, or prove VFX behavior.
No external skill, package, dependency, script, or plugin was installed or
executed during this audit.

The useful skills fall into four groups:

1. Three.js renderer references: useful for API patterns, diagnostics, and
   adapter implementation.
2. Particle references: useful as lifecycle and physics checklists, but unsafe
   as Aurora behavior specifications.
3. Reverse-engineering references: useful for structuring binary inspection,
   but weaker than the repository's Aurora-specific Ghidra standards.
4. Capture and comparison helpers: useful for producing and reviewing proof
   artifacts, but unable to establish VFX semantics or parity by themselves.

The highest-value references for current implementation work are
`threejs-shaders`, `threejs-textures`, `threejs-postprocessing`,
`threejs-fundamentals`, and `threejs-geometry`. The highest-value installed
helpers for proof work are `playwright` and `playwright-interactive`.

None of the external skills should be installed. Their code examples must not
be copied as Aurora implementations.

## Current project boundary

- Aurora Web uses Three.js `0.184.0`.
- The audited CloudAI-X Three.js source says it was checked against Three.js
  `r160+`, so every API detail must be rechecked against the installed `r184`
  types and official current documentation.
- The CloudAI-X repository README tells users to clone
  `pinkforest/threejs-playground`, not the repository being audited. This
  provenance mismatch is an additional reason to keep the source
  `reference-only`.
- `ffmpeg` and `ffprobe` are not available through the current `PATH`.
  Existing repository capture scripts resolve an explicit pre-existing FFmpeg
  7.1 binary path. This audit does not authorize installing another binary or
  changing that provenance boundary.
- Aurora Web already has dedicated runtime, render-contract, CDP capture,
  onset alignment, contact-sheet, pixel-analysis, and proof-validation scripts.
  Generic skill workflows must be compared with those scripts before any idea
  is adopted.

Relevant implementation surfaces include:

- `backend/src/modules/vfx/domain/aurora-vfx-runtime-state.ts`;
- `backend/src/modules/vfx/domain/aurora-vfx-render-contract.ts`;
- `backend/src/modules/vfx/domain/aurora-shader-source-graph.ts`;
- `frontend/src/modules/layout/adapters/three/auroraVfxCanonicalRenderer.ts`;
- `frontend/src/modules/layout/adapters/three/auroraRetailBloomPass.ts`;
- `frontend/src/modules/placeables/adapters/three/auroraMtrCustomShaderProgram.ts`;
- `backend/scripts/capture-vfx-app-route-cdp.mjs`;
- `backend/scripts/create-vfx-broad-comparisons.py`;
- `backend/scripts/analyze-vfx-capture.mjs`.

## Audited source registry

| Source | Pinned version | Classification | Main value |
| --- | --- | --- | --- |
| Official local `playwright` | OpenAI skills commit `49f948faa9258a0c61caceaf225e179651397431` | `installed-approved` | deterministic browser setup, screenshots, traces, state inspection |
| Official local `playwright-interactive` | same commit | `installed-approved` | persistent WebGL inspection, raw screenshot review, console and DOM probes |
| Official local `screenshot` | same commit | `installed-approved` | OS-level fallback capture only |
| [`binary-analysis-patterns`](https://github.com/wshobson/agents/blob/b6af3711058190e4b5c5274b9758498fe626ec5a/plugins/reverse-engineering/skills/binary-analysis-patterns/SKILL.md) | `b6af3711058190e4b5c5274b9758498fe626ec5a` | `REFERENCE-ONLY / DO NOT INSTALL` | general disassembly and decompilation pattern checklist |
| [`threejs-shaders`](https://github.com/CloudAI-X/threejs-skills/blob/b1c623076c661fc9b03dac19292e825a5d106823/skills/threejs-shaders/SKILL.md) | `b1c623076c661fc9b03dac19292e825a5d106823` | `REFERENCE-ONLY / DO NOT INSTALL` | ShaderMaterial, RawShaderMaterial, uniforms, varyings, debug output |
| [`threejs-postprocessing`](https://github.com/CloudAI-X/threejs-skills/blob/b1c623076c661fc9b03dac19292e825a5d106823/skills/threejs-postprocessing/SKILL.md) | same commit | `REFERENCE-ONLY / DO NOT INSTALL` | render targets, pass ordering, resize, per-pass performance |
| [`threejs-textures`](https://github.com/CloudAI-X/threejs-skills/blob/b1c623076c661fc9b03dac19292e825a5d106823/skills/threejs-textures/SKILL.md) | same commit | `REFERENCE-ONLY / DO NOT INSTALL` | color space, UVs, atlases, samplers, render/depth targets |
| [`threejs-fundamentals`](https://github.com/CloudAI-X/threejs-skills/blob/b1c623076c661fc9b03dac19292e825a5d106823/skills/threejs-fundamentals/SKILL.md) | same commit | `REFERENCE-ONLY / DO NOT INSTALL` | Object3D hierarchy, matrices, local/world transforms |
| [`threejs-geometry`](https://github.com/CloudAI-X/threejs-skills/blob/b1c623076c661fc9b03dac19292e825a5d106823/skills/threejs-geometry/SKILL.md) | same commit | `REFERENCE-ONLY / DO NOT INSTALL` | BufferGeometry, attributes, non-indexed and instanced geometry |
| [`threejs-animation`](https://github.com/CloudAI-X/threejs-skills/blob/b1c623076c661fc9b03dac19292e825a5d106823/skills/threejs-animation/SKILL.md) | same commit | `REFERENCE-ONLY / DO NOT INSTALL` | keyframe and host animation adapter concepts |
| [`threejs-materials`](https://github.com/CloudAI-X/threejs-skills/blob/b1c623076c661fc9b03dac19292e825a5d106823/skills/threejs-materials/SKILL.md) | same commit | `REFERENCE-ONLY / DO NOT INSTALL` | blend, depth, cull, alpha, and material-state API checklist |
| [`threejs-lighting`](https://github.com/CloudAI-X/threejs-skills/blob/b1c623076c661fc9b03dac19292e825a5d106823/skills/threejs-lighting/SKILL.md) | same commit | `REFERENCE-ONLY / DO NOT INSTALL` | Three light APIs, light helpers, shadow diagnostics |
| [`particles-lifecycle`](https://github.com/Bbeierle12/Skill-MCP-Claude/blob/e0f230fed5aa7a6953a6bca566e9cd70b7c9eaa9/skills/particles-lifecycle/SKILL.md) | `e0f230fed5aa7a6953a6bca566e9cd70b7c9eaa9` | `REFERENCE-ONLY / DO NOT INSTALL` | spawn/retire/pool invariants, tails, size/color/alpha over life |
| [`particles-physics`](https://github.com/Bbeierle12/Skill-MCP-Claude/blob/e0f230fed5aa7a6953a6bca566e9cd70b7c9eaa9/skills/particles-physics/SKILL.md) | same commit | `REFERENCE-ONLY / DO NOT INSTALL` | force, integration, collision, and trajectory checklist |
| [`ui-animation`](https://github.com/mblode/agent-skills/blob/9f5065ad61fed1e9acded5616bf097dceab37b4b/skills/ui-animation/SKILL.md) | `9f5065ad61fed1e9acded5616bf097dceab37b4b` | `REFERENCE-ONLY / DO NOT INSTALL` | source-FPS checks, contact sheets, ROI tracking concepts |
| [external `ffmpeg` skill](https://github.com/digitalsamba/claude-code-video-toolkit/blob/9826feb491cffe18367e85f6f759bffcfb93d3da/.claude/skills/ffmpeg/SKILL.md) | `9826feb491cffe18367e85f6f759bffcfb93d3da` | `REFERENCE-ONLY / DO NOT INSTALL` | media metadata, extraction, composition, validation ideas |

The exact local hashes for the three `installed-approved` skills remain recorded
in `vfx-proof-standard-2026-07-13.md`.

## What can help implementation

### 1. Shader and MTR diagnostics - high value

Use `threejs-shaders` as a reference for:

- explicit uniform and attribute manifests;
- compile/link error collection;
- temporary UV, normal, local-position, world-position, alpha, and lane-output
  debug shaders;
- ShaderMaterial versus RawShaderMaterial responsibility;
- inspecting final shader sources and active uniforms;
- reducing accidental coordinate-space mixing.

This directly supports the custom SHD graph, MTR slots, signed render-mode
coefficients, texture sampling, and lane 5/6 diagnostics.

Do not adopt its Fresnel, noise, dissolve, rim-light, or displacement examples
as Aurora VFX. They are generic visual recipes, not recovered Aurora behavior.

### 2. Framebuffer and postprocess inspection - high value

Use `threejs-postprocessing` as a reference for:

- explicit render-target ownership and resize handling;
- per-pass enable/disable diagnostics;
- rendering intermediate targets for review;
- recording pass order and input/output texture identity;
- measuring the cost of full-screen passes.

This can improve inspection of `auroraRetailBloomPass.ts`, framebuffer lanes
5/6, bloom downscale/upscale stages, and the future sharpen/dynamic
contrast/vibrance chain.

Do not replace the recovered retail chain with `EffectComposer`,
`UnrealBloomPass`, generic gamma correction, or visually selected constants.
The skill's postprocess recipes are architecture references only.

### 3. Texture, atlas, PLT, and sampler work - high value

Use `threejs-textures` as a reference for:

- explicit sRGB versus data-texture treatment;
- UV and atlas diagnostics;
- wrap, minification, magnification, mipmap, and anisotropy state readback;
- render targets and depth textures;
- texture lifetime and disposal checks.

This maps directly to MTR slots `0..15`, PLT generated targets, atlas
progression, framebuffer inputs, and texture cache partitioning.

Do not apply generic atlas orientation, wrapping, filtering, or color-space
defaults when Aurora source data or recovered GL state specifies another value.

### 4. Transforms, axes, and placeable composition - high value

Use `threejs-fundamentals` as a reference for:

- local and world matrix snapshots;
- parent/child transform composition;
- quaternion and matrix conversion diagnostics;
- world-position/world-quaternion probes;
- diagnostic-only axes and cardinal-direction fixtures.

This supports Type 7 host attachment, placeable geometry/emitter/light
composition, Chunk transforms, and the remaining cardinal-axis proof.

The skill assumes Three.js right-handed `+Y`-up coordinates. Aurora Web must
continue using its recovered shared conversion `C=(x,z,y)` and reflected
axis-angle mapping. Generic Three axes must never become the Aurora semantic
source.

### 5. Particle and segment geometry - high value

Use `threejs-geometry` as a reference for:

- BufferGeometry and typed attribute validation;
- non-indexed triangle and per-particle attribute diagnostics;
- bounding volume refresh after dynamic changes;
- controlled geometry disposal;
- instanced attributes when, and only when, they preserve the recovered draw
  contract.

This can help the six-vertices-per-particle route, Linked segment geometry,
Motion Blur attributes, Chunk instances, and beam width inspection.

Do not replace recovered particle topology with Points, built-in lines, tubes,
or arbitrary instancing merely because those APIs are convenient.

### 6. Live host animation attachment - medium value

Use `threejs-animation` only for Three-side adapter concepts:

- sampling a host node at a declared time;
- propagating animated local transforms through the hierarchy;
- inspecting quaternion interpolation and animation-root ownership;
- binding production actor animation state to the Type 7 live resolver.

Aurora MDL controllers, event ownership, animation selection, transition
weighting, and scheduler timing remain custom source-backed behavior.
`AnimationMixer` must not replace them.

### 7. Material and source-light state - medium value

Use `threejs-materials` and `threejs-lighting` for API and diagnostic checklists:

- blend/depth/cull/alpha state inspection;
- material and texture disposal;
- source-light position, color, range, visibility, and parent-transform probes;
- diagnostic light helpers outside clean parity frames.

Do not adopt PBR defaults, physically correct decay, generic ambient fill,
three-point lighting, fake contact shadows, or extra lights. Placeable proof
must render only source-backed geometry, emitters, lights, and declared scene
lighting.

### 8. Particle lifecycle invariants - medium value

Use `particles-lifecycle` as a checklist for:

- one spawn decision per scheduler tick;
- active/free slot accounting;
- birth, active, retirement, and terminal-zero state;
- source animation end versus surviving particle tail;
- per-particle age, color, alpha, size, atlas, and sub-emitter transition logs;
- pool exhaustion and duplicate-retirement assertions.

Do not copy its continuous emitter, burst, fade, gradient, size curve, trail,
state-machine, or `Math.random()` examples. Aurora's RNG order, family
schedulers, curves, looping, and pooling rules are already source-specific.

### 9. Forces, trajectories, collision, and integration - medium value

Use `particles-physics` to make audits ask the right questions:

- which force is applied, in which coordinate space, and in which tick order;
- whether position or velocity is updated first;
- how drag, wind, target attraction, and collision affect the state;
- which state is inherited by newly spawned particles;
- which values require per-tick trace output.

This can improve audits for MIRV trajectories, P2P, Explosion wind, bounce, WOK
collision, persistent AOE motion, and the placeable flame plume.

Do not copy generic Euler, Verlet, RK4, gravity, wind, turbulence, attractor, or
plane/sphere collision implementations. Aurora's equations, RNG, WOK response,
and update ordering must come from decompilation or runtime evidence.

### 10. Binary-analysis workflow - targeted value

Use `binary-analysis-patterns` for general reminders about:

- jump tables and switch recovery;
- array and structure offset patterns;
- signed versus unsigned branches;
- compiler helpers, inlining, and optimizer artifacts;
- checking decompiler output against assembly and control flow.

Its examples primarily describe x86-64 and System V conventions. Aurora's
Win32 binaries and repository-specific calling-convention, GL-wrapper, class,
and decompilation anchors require the existing Ghidra standards instead.
Therefore this skill is an occasional checklist, not the main audit procedure.

## What can help proof and comparison

### Installed `playwright`

Useful for fixed viewport setup, navigation, fixture selection, DOM/readback
collection, screenshots, traces, and detecting console/WebGL failures.

Do not use Playwright's generic recorded video as a canonical replacement for
the current CDP frame-sequence pipeline. Playwright video may be scaled to fit
its configured recording size and is finalized only after context closure.

### Installed `playwright-interactive`

Useful for persistent WebGL inspection during implementation, raw screenshot
review, canvas bounds, GPU/DOM state comparison, and iterative validation
without rebuilding the entire browser session.

For VFX pixel inspection, use its raw-pixel exception. CSS-normalized
screenshots are useful for UI interaction coordinates, not fidelity-sensitive
VFX comparison.

### Installed `screenshot`

Useful only when browser-native or Toolset-native capture is unavailable. An
OS screenshot is secondary diagnostic evidence and does not replace an NWN MP4,
Aurora Web MP4, timeline, trigger ledger, or matched comparison.

### `ui-animation` reference

Potentially useful ideas:

- probe source FPS before extraction;
- never sample above source FPS;
- split distinct time windows instead of fitting one reversed motion;
- create contact sheets before inspecting individual frames;
- use ROI tracking only for rigid anchors such as a beam endpoint or placeable
  node.

The repository already creates VFX contact sheets and onset-aligned comparison
videos, so this source has limited incremental value. Particle fields are not
single rigid UI transforms, and CSS spring/Bezier fitting is generally
inapplicable.

Its `extract_frames.py` uses FFmpeg `-y`, does not clear stale
`frame_*.png` files, and its advanced path asks for unpinned
`opencv-python`, `numpy`, and `scipy` installation. Its scripts must not run.

### External `ffmpeg` reference

Potentially useful ideas:

- inspect stream metadata before processing;
- validate output readability and dimensions;
- build side-by-side or difference views from already saved MP4s;
- generate review copies while preserving immutable raw sources.

Most of the skill targets conversion, compression, speed changes, and platform
delivery. Re-encoding, `setpts`, FPS conversion, cropping, or lossy compression
can invalidate lifecycle or pixel comparison. The current project-specific
comparison scripts and the official FFmpeg filter documentation take
precedence.

## Mapping to the current implementation queue

| Open work | Most useful references | Allowed use |
| --- | --- | --- |
| Type 7 live production actor attachment | `threejs-fundamentals`, `threejs-animation` | matrix/quaternion sampling and adapter diagnostics |
| Native WOK AABB/BSP traversal | `binary-analysis-patterns` | jump-table, structure, and traversal checklist only |
| Geometry-shader and skinned-program policy | `threejs-shaders`, official WebGL specification | capability audit, explicit refusal or source-backed fallback |
| PLT generated target and sampler semantics | `threejs-textures`, `threejs-shaders` | target, UV, sampler, color-space, and uniform diagnostics |
| Remaining render-mode coefficients | `binary-analysis-patterns`, `threejs-materials`, `threejs-shaders` | recover native constants, then inspect exact Three render state |
| Retail postprocess chain | `threejs-postprocessing`, `threejs-shaders`, `threejs-textures` | pass graph, target ownership, intermediate readbacks |
| Type 10 MIRV trajectories | `particles-physics` | trace schema and equation checklist; no generic trajectory |
| Duration volume and persistent AOE | `particles-lifecycle`, `particles-physics` | ownership, cessation, density, phase, and terminal-state checks |
| Beam width, glow, and phase | `threejs-geometry`, `threejs-shaders`, `threejs-postprocessing` | exact geometry, shader, and recovered bloom diagnostics |
| Scale, footprint, bloom, decay gaps | lifecycle, geometry, textures, postprocess references | matched-timestamp measurements against saved NWN MP4s |
| Placeable flame plume width/luminance | lifecycle, physics, textures, lighting references | source-backed parameter tracing and clean comparison |
| Browser proof packets | installed Playwright skills, `ui-animation`, external FFmpeg reference | deterministic capture orchestration and offline review only |

## Techniques worth adopting into project-owned tooling

These ideas can be implemented locally after checking official documentation:

1. Add an opt-in shader diagnostic manifest containing final vertex/fragment
   source hashes, compile/link status, active uniforms, attributes, texture
   slots, and render-state values.
2. Add diagnostic-only readbacks for base color/depth, lane 5 color/depth, lane
   6 color/depth, bloom threshold, each downscale/upscale stage, and final
   postprocess output.
3. Add a transform trace for declared nodes containing local/world
   position/quaternion/scale/matrix at matched timestamps.
4. Extend the runtime tick packet with explicit spawn, update, collision,
   retirement, active-count, free-slot, RNG-consumption, and terminal-zero
   ledgers.
5. Add a safe offline MP4 inspector that probes timing first, uses a unique
   empty output directory, refuses overwrite, preserves frame count and
   timestamps, hashes every artifact, and never triggers NWN.
6. Add ROI tracking only for rigid declared anchors. Do not fit a single motion
   curve to a non-rigid particle field.

All six are diagnostics or proof infrastructure. They do not alter Aurora
semantics and cannot promote parity without the required NWN/Aurora comparison.

## Patterns explicitly rejected

- `Math.random()` or another generic RNG in canonical VFX runtime.
- Generic `+Y` gravity or unconverted Three.js axes.
- Generic continuous/burst schedulers, pooling, fade, color, or size curves.
- Generic Euler, Verlet, RK4, wind, attractor, turbulence, or collision code.
- Built-in Points, Line, Tube, or InstancedMesh replacing recovered topology.
- PBR material defaults, generic ambient light, physically correct decay, or
  fabricated source lights.
- `EffectComposer` or `UnrealBloomPass` replacing the recovered retail chain.
- CSS spring/Bezier fitting as a particle-motion oracle.
- FFmpeg speed change, frame interpolation, FPS relabeling, or lossy transform
  of the immutable oracle MP4.
- Playwright-only, screenshot-only, Web-only, or skill-generated parity claims.

## Primary references

- [Three.js current WebGLRenderer documentation](https://threejs.org/docs/pages/WebGLRenderer.html)
- [Khronos WebGL specifications and extension registry](https://registry.khronos.org/webgl/)
- [FFmpeg filters documentation](https://ffmpeg.org/ffmpeg-filters.html)
- [Playwright video documentation](https://playwright.dev/docs/videos)
- [Playwright tracing documentation](https://playwright.dev/docs/api/class-tracing)
- `vfx-proof-standard-2026-07-13.md`
- `vfx-full-decomp-implementation-audit-2026-07-16.md`
- `vfx-broad-proof-matrix-2026-07-16.md`
- `ghidra-common-pitfalls-r72.md`
- `ghidra-noise-reduction-r71.md`

