# Placeable lighting proof-harness implementation record (2026-08-18)

## Status and decision

Status: `m0-implementation-functional-formal-closure-blocked`.

The dev Area runner now separates the receiver, point-light, procedural halo,
VFX, shadow, and postprocess lanes and emits
`aurora-placeable-lighting-proof-snapshot/v2`. The gate rejects unlit Area
receivers, debug receivers, non-isolated lanes, missing lights, unsettled
assets, and unknown receiver materials.

This implementation does not make the production Area receiver light-reactive
and does not establish retail parity. The production receiver change remains
blocked by `PL-R07`; source-light energy and falloff remain blocked by
`PL-R08`; full campfire/parity work remains blocked by `PL-R09` and a fresh
matched NWN oracle.

No Toolset or NWN process was opened or controlled for this implementation
slice. No xoreos material was used.

## Implemented boundaries

- `frontend/src/modules/layout/application/auroraPlaceableLightingProof.ts`
  owns the pure profile and fail-closed proof policy.
- `frontend/src/modules/layout/adapters/three/auroraPlaceableLightingProofAdapter.ts`
  classifies actual terrain receiver materials and applies reversible lane
  ablations.
- `frontend/src/modules/areas/dev/AreaLightShadowPreviewRunner.tsx` exposes the
  six query-controlled lanes and the bounded snapshot hook used by capture.
- `frontend/src/modules/layout/adapters/three/workspaceThreeRuntime.ts` exposes
  a raw render entry point so postprocess can be disabled without changing the
  default render path.
- `backend/scripts/capture-vfx-app-route-cdp.mjs` records the snapshot and
  rejects an invalid retail-parity promotion. A point-light-only route may
  disable visible VFX, but required assets must still settle.
- The debug receiver uses a reactive Three.js material only to discriminate
  light-node operation from Area-receiver operation. It carries
  `auroraPlaceableLightingProofDebugOnly=true` and
  `blocked_debug_receiver_not_area_surface`; the proof policy always rejects
  it as Area evidence.

The default route profile retains the previous combined lane state. The new
ablation logic stores and restores original node visibility and point-light
`castShadow` values instead of overwriting scene state permanently.

## Runtime diagnosis

Guarded CDP artifact:

`backend/docs/aurora-reverse/artifacts/placeable-lighting-proof-harness-2026-08-18/campfire-point-light-only-unlit-receiver-diagnostic-v2-2026-08-18.frame.json`

SHA-256:
`0995295cf978ba7af4f8f7182fdf17fee5894f7011862a4bb08cd98a4436c62d`.

The isolated profile was `receiver=area`, `pointLight=true`, and
`halo=vfx=shadow=postprocess=false`. The manifest recorded:

| Fact | Observed value |
| --- | --- |
| Point lights | 1 |
| Area receiver meshes | 4 |
| Debug receiver meshes | 0 |
| Reactive receiver materials | 0 |
| Unlit receiver materials | 4 |
| Unknown receiver materials | 0 |
| Receiver family | `MeshBasicMaterial` |
| Asset settlement | `failed` |
| Proof status | `blocked` |
| Retail parity | `blocked_pending_matched_nwn_oracle` |
| Blockers | `APL-PROOF-AREA-RECEIVER-UNLIT`, `APL-PROOF-ASSETS-NOT-SETTLED` |

This is direct runtime evidence that the current point light exists but the
actual Area surface cannot receive it. The host-local catalog asset requests
also returned 404, so the proof-safety contract correctly prevented an
accepted PNG from being written.

## Debug-only OFF/ON discrimination

Playwright produced two local diagnostic screenshots with the same debug
receiver and camera:

- point light ON:
  `output/playwright/placeable-lighting-debug-receiver-2026-08-18.png`,
  SHA-256
  `53004a486b0b31fcc997ce5335112af1fcb1f19802ed411aba2d6b84159c1393`;
- point light OFF:
  `output/playwright/placeable-lighting-debug-receiver-off-2026-08-18.png`,
  SHA-256
  `c1386ca5b5f9944b932f7186c6cb3f02590527a07703a162ba03bbdc073dd649`.

The ON image has a small warm center contribution; the OFF image is uniform.
These screenshots demonstrate only that the point-light lane can affect a
known reactive debug material. They are not accepted Area proof and are not
NWN comparison evidence.

## Verification results

Passed:

- focused frontend unit tests: 23/23;
- focused backend capture-contract test: 1/1;
- focused mutation gate: 261/261 mutants killed, 100.00%; report SHA-256
  `cbb0b3136dba941d834301351de60d7a09136fd80938e2dfbbaedb2773ae3038`;
- frontend production build;
- capture script syntax check.

Blocked/failed:

- full frontend regression smoke: 9/10 files failed, 58/78 tests failed. The
  failures consistently rendered an empty scene/object list (`All (0)`) and
  could not find unrelated door/placeable rows. This broad dirty-worktree
  baseline failure is outside the proof slice, but it prevents formal M0
  closure;
- accepted visual proof: blocked by unlit actual receivers and failed asset
  settlement;
- pixel-identical pre/post extraction baseline: not produced;
- M1 production receiver: `PL-R07` is not confirmed;
- M2 retail parity: required retail gates and matched NWN capture are open.

## Resume condition

1. Restore a settled exact Area/placeable asset route and a green regression
   baseline.
2. Confirm `PL-R07` from the selected retail shader/material profile and a
   static flat/wood receiver oracle.
3. Implement that confirmed receiver path in the shared surface adapter; do
   not substitute `MeshLambertMaterial` or `MeshStandardMaterial` by visual
   guess.
4. Capture fixed-camera Area OFF/ON frames with all other lanes disabled and
   require an accepted receiver-local delta.
5. Confirm `PL-R08` before changing energy/radius/falloff, then complete the
   remaining retail gates and matched NWN comparison before any parity claim.
