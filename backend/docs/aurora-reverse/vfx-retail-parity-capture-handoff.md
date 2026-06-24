# VFX Retail Parity Capture Handoff

Status: `Blocked` until real retail captures are produced and wired into
`backend/docs/aurora-reverse/vfx-retail-parity-fixtures.json`.

This handoff is the minimum evidence contract for unblocking `VFX-P12`. Do not
mark any VFX behavior as `canonical` from screenshots, GLB preview, frontend
smoke tests, Three.js material settings, selected-source 2DA rows, or parser
fixtures alone.

Repo-side capture setup lives in
`backend/docs/aurora-reverse/vfx-retail-capture-setup.md`. Use it for the
fixture template, helper command, SHA-256 procedure, and final
`retail-build.json` format.

## Unblock Rule

A fixture can be promoted to `behaviorClaim: "canonical"` only when the gate
allows it:

- `status` is `passed`.
- Retail build/profile/client evidence is present.
- Source table/profile/hash and source row id/label are present.
- Parser snapshot JSON is present.
- Resolver trace JSON is present.
- Runtime tick dump JSON is present.
- Renderer-agnostic render contract snapshot JSON is present.
- Screenshot/video/capture metadata is present.
- Comparison JSON is present and has `result: "passed"`.

If any item is missing, keep the fixture `diagnostic` or `preview_only`.

## Artifact Layout

Use one directory per fixture. Recommended path:

```text
backend/test/fixtures/vfx-retail/<fixtureId>/
  README.md
  retail-build.json
  source-table.snapshot.json
  effect-context.json
  parser-snapshot.json
  resolver-trace.json
  runtime-tick-dump.json
  render-contract-snapshot.json
  capture.json
  frame-0001.png
  capture.mp4
  comparison.json
```

After capture, update the manifest paths and SHA-256 hashes for every artifact
that exists. Hashes in the manifest must describe the exact committed files.

## Required Artifact Content

`retail-build.json`:

- Retail client name.
- Build id/version.
- Platform/profile.
- Module/profile used for capture.
- Capture machine/environment.
- Date/time.

`source-table.snapshot.json`:

- Source table name.
- Source profile.
- Source table hash.
- Source object key/path.
- Source row id and label.
- Raw row cells used by the fixture.

`effect-context.json`:

- Constructor kind: `dm_visualeffect`, `EffectVisualEffect`, `EffectBeam`, or
  explicit source-only MDL emitter fixture.
- Raw command or NWScript invocation.
- Application mode: object/location/source-only.
- Duration type and duration seconds.
- Target, effector, creator, body node, miss flag, and transform tuple when
  applicable.

`parser-snapshot.json`:

- Output from the source-preserving parser for the selected table/row.
- Diagnostics emitted by the parser.
- Source hash/profile/layer provenance.

`resolver-trace.json`:

- Selected source policy.
- Runtime-settings revision.
- HAK-list hash.
- Selected source layer.
- Selected candidate.
- Lower-precedence candidates.
- Selected resource hashes.

`runtime-tick-dump.json`:

- Effect instance and selected source row.
- Phase schedule.
- Emitter/runtime family.
- Tick inputs.
- Runtime state before/after ticks.
- Active/free particle lists.
- Runtime diagnostics.

`render-contract-snapshot.json`:

- Renderer-agnostic draw records.
- Atlas frame/UV state.
- Blend/render lanes.
- Chunk lane diagnostics where applicable.
- Render contract diagnostics.

`capture.json`:

- Screenshot/video paths.
- Camera/object setup.
- Retail command/script used.
- Frame/time range.
- Any manual notes needed to reproduce the capture.

`comparison.json`:

- Comparison method.
- Compared artifacts.
- Deterministic values checked.
- Visual/capture checks used.
- `result`: `passed`, `failed`, or `unknown`.
- Diagnostics explaining unresolved differences.

## Required Fixture Cases

The manifest must continue to cover exactly these case families:

- `dm_visualeffect <row> <duration>`
- Scripted `EffectVisualEffect`
- Scripted `EffectBeam`
- Explosion plus detonate
- Fountain plus atlas playback
- Chunk particles
- P2P gravity
- Linked chain
- Punch-Through versus mode `2`/Lighten candidate
- PLT visual with known layer colors

## Capture Steps

1. Pick and document the final retail build/profile.
2. For each fixture, capture or author the source table/profile and effect
   invocation first.
3. Run the same fixture through the backend VFX source policy/parser/runtime
   pipeline and save parser, resolver, runtime, and render-contract snapshots.
4. Run the fixture in retail and save screenshot/video/capture metadata.
5. Compare the backend/domain artifacts and retail capture. Keep exact visual
   semantics `unknown` if the comparison cannot prove them.
6. Update `vfx-retail-parity-fixtures.json` paths, hashes, `status`, and
   `comparison.result`.
7. Run:

```powershell
npm run test:unit -- --runTestsByPath test/unit/aurora-vfx-retail-parity-gate.spec.ts
npm run build
```

8. Only after the gate allows canonical for a specific fixture may that specific
   behavior be labelled canonical.

## Non-Evidence

These are useful diagnostics or smoke checks, but never parity proof by
themselves:

- Screenshot/video without parser snapshot, resolver trace, runtime dump, render
  contract snapshot, and comparison JSON.
- GLB `emitter_proxy`.
- glTF `extras`.
- Placeable VFX preview payloads.
- Frontend canonical renderer smoke tests.
- Three.js `transparent`, `depthWrite`, `blending`, `SpriteMaterial`, or
  `ShaderMaterial` behavior.
- Selected-source 2DA tables without retail execution/capture.
