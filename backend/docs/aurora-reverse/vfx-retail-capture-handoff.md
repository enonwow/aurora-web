# VFX Retail Capture Handoff

`VFX-P12` is still `Blocked`. This document is the operational handoff for the
person who has access to the retail NWN client and can produce the missing
capture evidence.

The repo does not currently contain retail automation scripts for launching the
client or recording captures. Use the retail client/DM console/NWScript harness
available in the capture environment, then commit the artifacts under the paths
below and update `vfx-retail-parity-fixtures.json`.

For the repo-side fixture template, helper command, SHA-256 instructions, final
`retail-build.json` format, and operator checklist, see
`backend/docs/aurora-reverse/vfx-retail-capture-setup.md`.

## Current Gate

Run the gate from `backend`:

```powershell
npx ts-node --transpile-only scripts/validate-vfx-retail-parity.ts
```

The command prints `missingEvidence`, `nextActions`, and
`missingEvidenceSummary`. It exits non-zero while any fixture is blocked.

Focused test:

```powershell
npm run test:unit -- --runTestsByPath test/unit/aurora-vfx-retail-parity-gate.spec.ts
```

Build check:

```powershell
npm run build
```

## Artifact Location

Store one capture pack per fixture:

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

Start from the template or helper:

```powershell
npx ts-node --transpile-only scripts/create-vfx-retail-fixture-pack.ts <fixtureId>
```

The helper refuses to overwrite existing fixture packs and does not update the
manifest automatically.

After creating files, update the fixture manifest fields with relative paths and
SHA-256 hashes:

- `retailBuild.evidenceRef`
- `parserSnapshot.path` / `parserSnapshot.hash`
- `resolverTrace.path` / `resolverTrace.hash`
- `runtimeTickDump.path` / `runtimeTickDump.hash`
- `renderContractSnapshot.path` / `renderContractSnapshot.hash`
- `captureReference.screenshotPath` or `captureReference.videoPath`
- `captureReference.captureReference`
- `comparison.path` / `comparison.hash` / `comparison.result`

## Required Cases

These ten fixture families must remain present in the manifest:

| Required case | Current fixture id | Retail command/script seed |
| --- | --- | --- |
| `dm_visualeffect_row_duration` | `vfx-retail-dm-visualeffect-row-68-duration-0` | DM console: `dm_visualeffect 68 0` |
| `scripted_effect_visual_effect` | `vfx-retail-scripted-effectvisualeffect-row-50` | `ApplyEffectToObject(DURATION_TYPE_INSTANT, EffectVisualEffect(VFX_IMP_DEATH), oTarget);` |
| `scripted_effect_beam` | `vfx-retail-scripted-effectbeam-row-210-body-chest` | `ApplyEffectToObject(DURATION_TYPE_TEMPORARY, EffectBeam(VFX_BEAM_FIRE, oSource, BODY_NODE_CHEST), oTarget, 3.0);` |
| `explosion_plus_detonate` | `vfx-retail-explosion-detonate-fireball` | Use a fireball/explosion fixture with a captured `detonate` animation event. |
| `fountain_plus_atlas_playback` | `vfx-retail-fountain-atlas-cot-fx01` | Use a Fountain emitter with x/y atlas grid, fps, frame range, and `random 1`. |
| `chunk_particles` | `vfx-retail-chunk-particles-progfx-type9` | Use a chunk emitter or `progfx.2da` Type 9 candidate with resolved chunk model. |
| `p2p_gravity` | `vfx-retail-p2p-gravity-reference-node` | Use a P2P emitter with target/reference node, `grav`, `drag`, and `threshold`. |
| `linked_chain` | `vfx-retail-linked-chain` | Use an emitter with `render Linked` and enough active particles to prove `active - 1` draw behavior. |
| `punch_through_vs_mode2_lighten` | `vfx-retail-punch-through-mode2-lighten` | Capture overlapping particles for `Blend Punch-Through` and raw blend mode `2`/Lighten candidate. |
| `plt_visual_known_layer_colors` | `vfx-retail-plt-known-layer-colors` | Use a PLT-backed visual with known layer colors and recorded palette/profile. |

If a different row/model is chosen in retail, update the fixture `source`,
`effectContext`, and title before capture. Do not infer row identity from label
text alone; record the selected source profile/hash.

## Required Evidence Per Case

Each fixture needs all of these before it can pass:

- Retail build/profile/client metadata.
- Source table/profile/hash and row id/label.
- Effect constructor/context, including raw command/script.
- Parser snapshot JSON.
- Resolver trace JSON with source policy, HAK-list hash, selected candidate,
  lower-precedence candidates, and resource hashes.
- Runtime tick dump JSON with effect instance, phase schedule, active/free
  particles, and diagnostics.
- Renderer-agnostic render contract snapshot JSON.
- Screenshot/video/capture metadata reference.
- Comparison JSON with `result: "passed"`, `"failed"`, or `"unknown"`.
- Expected diagnostics.
- Manifest status: `missing`, `captured`, `compared`, `passed`, `failed`, or
  `unknown`.

## Status Rules

- `missing`: no retail capture pack exists.
- `captured`: retail capture exists, but comparison is not complete.
- `compared`: comparison was run but result is not pass/fail conclusive.
- `passed`: all evidence is present and comparison result is `passed`.
- `failed`: evidence is present and comparison result is `failed`.
- `unknown`: family is required but exact row/model/profile is not admitted yet.

`behaviorClaim: "canonical"` is allowed only when the gate returns
`canonicalAllowed: true` for that exact fixture. Otherwise use `diagnostic` or
`preview_only`.

## Non-Evidence

These must not unblock `VFX-P12` by themselves:

- Screenshot/video without parser snapshot, resolver trace, runtime tick dump,
  render contract snapshot, retail build/profile, and comparison JSON.
- GLB `emitter_proxy` output.
- glTF `extras`.
- Placeable VFX preview payloads.
- Frontend renderer smoke tests.
- Three.js material settings.
- Selected-source 2DA rows without retail execution/capture.

## Completion Steps

1. Select the final retail build/profile.
2. Produce capture packs for all ten fixture families.
3. Update `backend/docs/aurora-reverse/vfx-retail-parity-fixtures.json`.
4. Run:

```powershell
npx ts-node --transpile-only scripts/validate-vfx-retail-parity.ts
npm run test:unit -- --runTestsByPath test/unit/aurora-vfx-retail-parity-gate.spec.ts
npm run build
```

5. Only if the gate reports every required fixture as canonical-allowed may
   `VFX-P12` move to `Done`.
