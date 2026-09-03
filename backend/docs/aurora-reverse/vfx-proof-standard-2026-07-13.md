# VFX Proof Standard

## Purpose

This document defines the minimum evidence required to claim that an Aurora Web VFX implementation reproduces a selected NWN runtime fixture. It applies to pure visual effects, duration effects, and placeables that host static geometry, emitters, and lights.

A video that merely shows an effect is diagnostic material. A proof packet compares one declared fixture across NWN and Aurora Web under the same declared context and timing.

The current cross-category implementation and proof queue is recorded in
`vfx-broad-proof-matrix-2026-07-16.md`.

## Skill security and reference-only use

Skills are workflow aids, not VFX authorities or proof artifacts. Because the
security of third-party skill packages cannot be guaranteed completely, an
external or unapproved skill is classified as `reference-only` and must not be
installed for this project. Reading a skill as a reference does not authorize
its installation or execution.

The two classifications are:

- `installed-approved`: a bundled or locally installed skill whose exact
  contents and provenance have been verified. It may be used within its normal
  authorization boundary, but it still cannot override this standard.
- `reference-only`: untrusted external material that may be read to discover a
  technique, checklist, or diagnostic idea. It must not be installed, copied
  into an active Codex skill or plugin directory, registered, auto-triggered, or
  treated as executable instructions.

For `reference-only` material:

- inspect text and documentation read-only, preferably from the pinned source
  over HTTPS;
- do not run its scripts, binaries, commands, hooks, package managers,
  dependency installers, MCP/plugin setup, or generated automation;
- do not persist a package, repository checkout, executable, or dependencies
  merely to inspect it. Reading over HTTPS necessarily transfers transient
  bytes; `reference-only` means no local installation, execution, or retained
  runnable copy;
- use it only to identify potentially better approaches to diagnostics,
  handling, browser capture, screenshots, MP4 capture, frame extraction,
  timeline analysis, and visual comparison;
- independently reimplement any adopted idea in the repository's existing
  tooling and verify it against primary documentation, current project code,
  tests, and a clean proof packet;
- record the source URL, exact commit/SHA, idea adopted, local implementation,
  and the primary source or Aurora decompilation anchor that validated it;
- discard the idea when it conflicts with Aurora decompilation, observed
  NWN/Aurora behavior, repository standards, or an official primary source.

The authority order is:

1. Aurora decompilation and observed NWN/Aurora oracle behavior.
2. The current Aurora Web implementation, tests, and recorded evidence.
3. Official vendor documentation and already installed, provenance-verified
   OpenAI skills.
4. External `reference-only` skills, which are leads only.

No skill may weaken Aurora-first semantics or the proof protocol. In
particular, a skill cannot justify replaying an existing NWN fixture, triggering
a fire-and-forget VFX more than once, accepting overlapping effects, changing a
declared duration, presenting Aurora Web-only evidence as parity proof, or
computing pixel similarity from unaligned cameras, scenes, or timelines.

When an installed skill is used, the work log records its name, the bounded
task it performed, and whether it produced a proof artifact or only a
diagnostic. Product usage charts and delayed skill telemetry are not VFX
evidence and do not replace that record. Direct CLI use prescribed by an
installed skill's `SKILL.md` still counts as skill use, but the resulting
browser, screenshot, or video must independently satisfy this standard.

The currently verified installed helpers are the official OpenAI
`playwright`, `playwright-interactive`, and `screenshot` skills at OpenAI skills
commit `49f948faa9258a0c61caceaf225e179651397431`. Their locally verified
`SKILL.md` SHA-256 values are:

| Skill | SHA-256 |
| --- | --- |
| `playwright` | `0FFAABCC8E0990627C4725F18BF1C7955534A796C1C199E872909DE2013CE6A8` |
| `playwright-interactive` | `F6C1155D923E6AE3CCC12ABFEF2266F119F8E9546DF2DDEEE1F5EB369845A0A1` |
| `screenshot` | `081935A6A163277537D46365F49D6B4A3CB40B4748347E7E88759C5927FA8CF5` |

The following audited candidates remain `REFERENCE-ONLY / DO NOT INSTALL`:

| Reference | Pinned commit | Potential reference value |
| --- | --- | --- |
| `binary-analysis-patterns` | `b6af3711058190e4b5c5274b9758498fe626ec5a` | decompilation audit structure and evidence checklists |
| `threejs-shaders` | `b1c623076c661fc9b03dac19292e825a5d106823` | shader diagnostics and renderer inspection ideas |
| companion Three.js references: `threejs-fundamentals`, `threejs-geometry`, `threejs-materials`, `threejs-lighting`, `threejs-textures`, `threejs-animation`, `threejs-postprocessing` | `b1c623076c661fc9b03dac19292e825a5d106823` | transforms, geometry, materials, lights, textures, animation, and pass-graph diagnostics |
| `ui-animation` | `9f5065ad61fed1e9acded5616bf097dceab37b4b` | capture and animation review ideas only |
| `particles-lifecycle` | `e0f230fed5aa7a6953a6bca566e9cd70b7c9eaa9` | particle lifetime and cleanup checklists |
| `particles-physics` | `e0f230fed5aa7a6953a6bca566e9cd70b7c9eaa9` | particle motion and force inspection ideas |
| external `ffmpeg` skill | `9826feb491cffe18367e85f6f759bffcfb93d3da` | MP4 inspection, frame extraction, and comparison ideas |

The detailed applicability, risk, and current-work mapping for these references
is recorded in `vfx-skill-reference-audit-2026-07-18.md`.

The `ui-animation` reference contains operational proof hazards, including
overwriting output through FFmpeg `-y`, retaining stale `frame_*.png` files, and
using unpinned Python dependencies. Its commands must never be run unchanged.
Changing any `reference-only` classification requires a separate documented
security review and explicit user approval; this document grants neither.

## Reference-required comparison rule

- A visual comparison without a usable NWN or Aurora reference result has no parity value. It must not be called a comparison proof, parity proof, matched result, or successful reproduction.
- Merely having an NWN/Aurora MP4 is insufficient. The reference recording must contain the declared effect's visible interval at usable timestamps. A late, blank, occluded, or otherwise missing effect interval means that no visual comparison exists.
- An Aurora Web-only recording is a renderer diagnostic. Comparing old Aurora Web output with new Aurora Web output is a regression diagnostic. Neither can establish similarity to NWN/Aurora.
- Source files and decompilation can prove an implementation contract, but they do not replace the missing visual reference when the claim concerns visual appearance.
- When no usable NWN/Aurora result exists, record the limitation explicitly and keep the fixture `diagnostic-only`. Do not present a Web image, Web MP4, test result, or source audit as a substitute comparison.

## Fixture contract

Every proof packet must declare, before either runtime is launched:

- `fixtureId` and effect family;
- source `visualeffects.2da` row or placeable resref;
- source/profile/resource hashes;
- owner, target, position, orientation, and camera;
- expected lifecycle type: `fire-and-forget`, `duration`, or `placeable`;
- capture cadence and timing origin;
- the exact NWN and Aurora Web inputs.

The fixture must use one clean, dedicated module or scene. It must not inherit an unknown `OnEnter`, heartbeat, replay, area, module, or conversation trigger.

## Trigger ledger

Each NWN capture has exactly one intentional trigger. The trigger must write a durable ledger record containing:

- `fixtureId`;
- run id;
- trigger timestamp;
- script/event identity;
- source row or placeable resref;
- owner and target identifiers;
- requested duration when applicable.

The corresponding Aurora Web run records the same fields plus its simulation start time. Missing trigger provenance makes the packet diagnostic-only.

## One NWN capture rule

- The NWN proof may be recorded directly as an MP4. The saved video is a first-class oracle artifact, not merely preparation for screenshots or a requirement to keep NWN running during comparison.
- Run NWN at most once for a declared fixture. That one run records one raw MP4 and one trigger ledger.
- Treat the raw MP4 as the reusable proof source. Extract baseline/effect/post frames, timestamps, crops, measurements, and revised analysis from that same file without launching NWN again.
- The MP4 playback clock must preserve wall-clock time. A recorder must not label a lower observed capture cadence as a higher FPS, because that silently shortens fire-and-forget tails and declared durations. Record both requested and observed cadence.
- A fixed container FPS is not runtime time when frame acquisition is irregular. Accepted timing proof requires either a wall-clock-preserving recorder or one monotonic runtime timestamp for every encoded frame.
- Sparse capture fields such as first-gameplay, midpoint, selected-best-frame, or process-end elapsed time cannot reconstruct a missing per-frame timeline. They must not be converted into a global speed factor or used to publish onset-relative duration deltas.
- When per-frame timestamps are missing, the saved MP4 may still support a `diagnostic-only` comparison of morphology and phase order. Label samples by encoded frame progression, never by shared runtime seconds, and set runtime-duration parity to unavailable.
- Offline, frame-preserving FPS retiming is allowed when it uses the captured wall-clock start/end metadata, records source FPS, corrected FPS, frame count, and hashes, and does not add, drop, interpolate, or reorder frames. This post-processing is not a second VFX trigger.
- A deterministic Aurora Web capture must render every declared simulation
  frame exactly once. A real-time `setInterval` loop is not accepted because a
  loaded renderer may skip scheduled callbacks while still advancing the
  requested frame index.
- When Aurora Web records one manually requested canvas frame per deterministic
  `renderAt(frameIndex / simulationFps)` step, container FPS is presentation
  metadata rather than simulation time. Preserve the accepted raw MP4, then
  create a separately hashed comparison derivative by assigning the captured
  frames their declared simulation timestamps. The derivative must preserve
  frame count and order and must not interpolate, add, or drop runtime frames.
- A deterministic capture that jumps from an incomplete effect frame directly
  to the terminal post frame is rejected for lifecycle comparison even when the
  final proof gate passes. The summary must record the expected and completed
  deterministic frame counts.
- A failed frame extraction, late analysis, ledger parser bug, missing crop, or inconvenient selected frame is never a reason to replay the VFX.
- Preserve an imperfect recording and record its limitation. Do not silently replace it with a later run.
- A second NWN capture for the same fixture requires explicit user approval given after the first MP4 exists. A fresh process or copied module does not waive this rule.
- Capture tooling must refuse an automatic retry and must not contain a retry loop around NWN launch or VFX execution.

For a small proof, client startup and module loading happen once. Capture begins as soon as the stable gameplay scene is visible, records the single effect, and stops after return to baseline. Post-processing happens offline from the saved MP4.

## Lifecycle rules

### Fire-and-forget

- Capture a stable baseline before the trigger.
- Execute the declared trigger exactly once.
- Capture the entire visible effect and its return to baseline.
- Keep source-animation playback time separate from particle-lifetime tail time. The source animation reaches its declared end without being stretched; already emitted particles continue ticking until they expire.
- The Aurora Web packet must end with zero active particles for every emitter, zero rendered particles, and a clean post-roll. Freezing the last runtime frame with live particles invalidates the packet.
- A second invocation, an overlapping automatic invocation, or an unidentified event invalidates the packet. It is not an opportunity to select a better frame.

### Duration

- Treat duration as an explicit shared input, for example `20.0` seconds.
- NWN and Aurora Web must both receive that exact duration.
- Validate duration against the wall-clock-corrected MP4 timeline, not an unverified container FPS value.
- Record lifecycle markers: requested start, observed start, steady state, requested end, observed end, and return to baseline.
- Compare the two runtimes at matched timestamps from the declared timing origin.

### Placeable VFX

- The fixture identifies the actual placeable model/resref, not a substitute proxy.
- Capture static geometry, child emitters, source-MDL lights, local transforms, and any animated state under the same placeable root.
- When source inspection proves that the model contains no light node, record that source-backed absence in the manifest and prove that Aurora Web also creates zero VFX lights. Do not fabricate a light merely because the retail scene appears illuminated.
- The NWN and Aurora Web scene must use the same camera, object transform, owner/target context, and declared time sample.
- A placeable proof is incomplete when it proves only particles while static geometry or source lights are omitted.

## Required artifacts

Each valid fixture packet contains:

- immutable source/context manifest with hashes;
- trigger ledger;
- NWN MP4 and timestamped frames;
- Aurora Web MP4 and timestamped frames;
- `timeline.json` for each runtime;
- runtime snapshots/render contracts where applicable;
- before/during/after comparison images at matched timestamps;
- comparison result identifying matches, measured differences, and unresolved implementation gaps.
- a fresh `aurora-vfx-runtime-observability/v1` report, or a blocker manifest when the capture was rejected.

When source Area/tile/placeable models are used as VFX receivers, the report
must also inventory every visible unique material. A lit receiver passes only
when the shared source-MDL adapter is installed from converter-backed
`format=aurora-mdl-material` metadata. Unsupported material classes, missing
source channels, unverified provenance, and a nonzero ambient channel paired
with zero diffuse must fail the proof gate with explicit counts. A textured
scene that rendered without this material ledger is diagnostic-only.

The NWN/Aurora MP4 and extracted frames must show the declared effect. Artifact presence without visible reference content does not satisfy this list.

Capture begins only after the scene is stable. It must include pre-trigger baseline and continue until the declared terminal lifecycle state is reached.

Before opening the runtime or entering the playback hook, automated capture
tooling must validate that the requested recording duration covers the entire
declared window: pre-roll plus runtime duration plus post-roll. A too-short
request must fail before playback starts. A baseline-only file created because
the capture ended before the effect phase is invalid and must never be promoted
to proof.

When lifecycle timing is compared from pixels, both recordings use the same declared metric and threshold. Different scene backgrounds and cameras remain named comparison limitations even when the pixel metric is shared.

## Comparison rules

Compare the same fixture, not broadly similar effects. The comparison covers:

- lifecycle timing;
- geometry and transforms;
- emitter spawn, motion, size, color, alpha, texture/atlas, and disappearance;
- render/blend modes and linked/chunk lanes;
- source-MDL and runtime light presence, placement, color, and lifecycle;
- placeable static mesh, child nodes, emitter, and light composition.

Tail and decay frames must be paired at identical timestamps relative to the
first visible onset in each recording. Independently selected peak,
last-visible, or tail frames may be included as descriptive evidence, but must
not be presented as synchronized frame pairs. The comparison manifest records
every onset-relative extraction offset.

One favorable screenshot cannot replace lifecycle comparison. Differences are recorded as named implementation gaps; they are not silently accepted as parity.

Proof-only geometry is not part of a visual parity frame. Scale capsules,
receiver planes, grids, axes, collision planes, labels, and calibration meshes
must be disabled in the Web MP4 used for visual comparison. If one is needed to
measure light, collision, or scale, record it as a separate diagnostic artifact
and reference that artifact from the clean comparison packet.

The diagnostic report may use development overlay geometry for a separate inspection artifact. The clean Aurora Web comparison PNG/MP4 uses `debugProfile=final`; origins, axes, parent-child lines, bounds, and RGB/RGBA swatches are disabled before capture.

After a renderer, parser, or runtime correction, keep the saved NWN MP4 and recapture only Aurora Web. The new Web packet must have its own capture timestamp, frame state, timeline, and comparison manifest. A byte-identical deterministic Web MP4 is allowed when the correction does not affect that fixture, but the packet must record both hashes and explain the unchanged output.

## Evidence status

| Status | Meaning |
| --- | --- |
| `diagnostic-only` | Useful local observation, but fixture contract, trigger ledger, lifecycle, or comparison is incomplete. |
| `comparison-ready` | Both runtime packets are complete and can be reviewed. |
| `matched-with-gaps` | Comparison is complete and records concrete remaining differences. |
| `canonical-allowed` | All required evidence is complete and no unrecorded material divergence remains. |

No fixture is promoted from `diagnostic-only` because local tests pass, because an effect appeared once, or because a second/overlapping trigger produced a more convenient recording.

## Invalid capture handling

An invalid or ambiguous run is preserved with its failure reason, but is never reused as proof. Common invalidators are:

- more than one trigger;
- unknown pre-existing event hook;
- overlapping effects;
- capture beginning during loading or after the effect began;
- NWN/Aurora reference recording that does not contain the declared visible effect interval;
- missing requested duration;
- an MP4 playback clock that materially speeds up or slows down the captured lifecycle;
- missing source/context hashes;
- different camera, target, or transform between NWN and Aurora Web.

The invalid run must not be repeatedly retried in the same fixture state. Prepare a clean fixture and make one planned capture pass.

A recorder preparation failure is not a VFX trigger only when durable diagnostics prove all of the following: `started=false`, the playback/render hook was never entered, simulation time never advanced beyond the baseline, and no video artifact was created. Preserve that diagnostic record. Once playback starts or any effect frame is rendered, the attempt counts as the fixture's one planned run even if recording later fails.

When an MP4 already exists, "prepare a clean fixture and make one planned capture pass" does not authorize an automatic second NWN run. Keep the existing MP4 and request explicit user approval before any recapture.
