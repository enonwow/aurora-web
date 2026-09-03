# Placeable lighting agent audit — 2026-08-17

## Scope and provenance

- Target task/agent: `019f5818-4b01-7f31-a7cc-ce273f90f352`.
- Scope: placeable lighting only. VFX emitters are included only where the
  canonical source-MDL composition can change a placeable light result.
- Audited state: current repository snapshot on branch
  `codex/vfx-row216-aurora-first-20260812`, plus the preserved target rollout
  history available to the parent audit task.
- Provenance limitation: the target task itself was not directly readable from
  the current task API. Findings about implementation are therefore grounded in
  the current files and durable artifacts, not in an assumption that every dirty
  file belongs to the target agent.
- Worktree warning: the shared worktree had 1,318 status entries at the final
  observation and continued changing during the audit. This audit added only
  this Markdown file.
- No Toolset or NWN process was started. No live capture was attempted.
- No xoreos code or behavior was used as authority.

## Verdict

**NO-GO for Aurora/retail lighting parity; GO only as a source-backed local
preview/diagnostic implementation.**

The agent's work is materially useful: placeables.2da `LightColor`,
`LightOffset`, `ShadowSize`, UTP `LightState`, source-MDL light nodes, animated
position/color/radius/multiplier, a shared preview light budget, diagnostics,
and inspector surfaces all exist and are covered by focused tests. The code
also keeps important parity labels explicitly blocked.

The implementation is not complete lighting support. The canonical source-MDL
renderer drops modeled light behavior while suppressing the richer legacy
renderer, placed-instance/runtime illumination is not transported through the
process contract, fast-shadow pixels fail the stored comparison, and exact
cross-lane owner ordering is still unknown. Under the current proof safety
contract, runtime proof completeness is `missing`.

## Implementation follow-up — 2026-08-17

The canonical feature-loss finding now has an M1 fail-closed implementation:
backend packaging emits a bounded source-presence manifest while retaining the
complete light records, and the frontend suppresses the richer light host only
for `canonical_supported`. Unsupported fields select the existing light-only
fallback; malformed, truncated, unknown, and contradictory manifests are
`blocked` and also retain the fallback with explicit diagnostics. This closes
silent canonical field loss; it does not promote retail parity.

Placed-instance `LightState`, native illumination/recompute behavior, and the
exact `Use Area Lighting` scope remain blocked with
`proofCompleteness=missing`. Exact resume conditions are in
`placeable-lighting-research-ledger-2026-08-17.md`.

## Lighting lanes found

1. **placeables.2da point-light lane** — `LightColor` selects lightcolor.2da
   RGB; `LightOffsetX/Y/Z` positions the source carrier; missing `LightState`
   defaults to ON; `LightState=0` disables this lane.
2. **placeables.2da fast-shadow lane** — `ShadowSize` selects the S/M/L shadow
   asset family. Aurora Web renders a proxy/stencil/overlay approximation and
   labels pixel parity blocked.
3. **source-MDL light-node lane** — parsed MDL light nodes can carry color,
   radius, multiplier, ambient/diffuse channel, shadow controls, flares,
   priority/dynamic flags, and animation tracks.
4. **shared LightManager preview lane** — tile, placeable, MDL, item-property,
   and ProgFX light owners compete under a local score/cap adapter. Retail
   accepted/dropped owner precedence has not been recovered.
5. **runtime illumination API lane** — retail NWScript exposes
   `SetPlaceableIllumination`, `GetPlaceableIllumination`, and
   `RecomputeStaticLighting`; Aurora Web currently preserves this only as
   diagnostic/evidence text, not as executable behavior.

## Findings

### P1 — Canonical source-MDL composition loses light features and suppresses the richer fallback

**Confirmed current-code fact.** The backend contract and packaging preserve a
rich source-MDL light object, including `shadowRadius`,
`verticalDisplacement`, `dynamicType`, `affectDynamic`, `shadow`,
`lightPriority`, flare arrays, `lensFlares`, `fadingLight`, and their animation
tracks. `catalog-vfx-runtime-packaging.ts` passes the complete light objects as
`sourceMdlLights`.

The canonical renderer's `appendCanonicalSourceMdlLights` reads only base and
animated position, color, radius, multiplier, plus `ambientOnly`. It creates a
`THREE.PointLight` without applying the source shadow flag or creating flare
children and explicitly records `auroraVfxCanonicalSourceMdlLightRetailProof=false`.

The legacy placeable light preview does apply `light.shadow` to
`PointLight.castShadow`, samples shadow-radius and vertical-displacement
timelines, updates shadow projection fields, creates flare sprites, and uses
light priority in the preview score. However,
`workspaceObjectMeshLayer.ts` detects canonical `sourceMdlLights` and then
suppresses that legacy light group.

**Impact.** Any canonical source-backed hybrid placeable that uses those fields
can render with missing shadows, flares, shadow/vertical animation, or owner
selection metadata even though the backend delivered them. The focused tests
verify the implemented canonical subset, but no canonical test asserts parity
for the dropped fields.

**Required fix.** Define one canonical light materialization contract and make
it feature-complete before suppressing the fallback. At minimum add explicit
supported/blocked handling and tests for `shadow`, shadow-radius and
vertical-displacement animation, flare payload, priority, dynamic flags,
fading, and lens-flare policy. Fail closed for unsupported fields instead of
silently degrading them.

### P1 — Placed-instance and runtime `LightState` behavior is not implemented

**Confirmed current-code fact.** UTP parsing and blueprint catalog metadata do
carry `LightState`, and `buildPlaceableRuntimeProjection` defaults a missing
field to `1` using a retail `nwserver.exe` binary xref. However, the backend
`PlaceableProcessQuery`, its HTTP schema, and the frontend process payload carry
appearance/generic instance overrides but no `lightState`. The area-instance
metadata merge therefore uses the template/blueprint value, not a transported
GIT/runtime illumination value.

The renderer label that calls this value "parsed from placed instance" is thus
misleading for the current request path. Repository searches find
`SetPlaceableIllumination`, `GetPlaceableIllumination`, and
`RecomputeStaticLighting` only in evidence/diagnostic constants, not in an
executable mutation path. The Placeable Properties matrix remains `SHELL` and
lists only Name, Tag, Appearance Type, and Static as writable.

**Impact.** Aurora Web can preview blueprint `LightState` and the default-ON
rule, but cannot faithfully load, edit, toggle, query, persist, or recompute
placed-instance illumination. Dynamic/scripted placeable lighting is absent.

**Required fix.** Extend the FE/BE contract with the proven instance field and
source provenance, include it in cache/fingerprint semantics, add a scene
mutation/readback path, and implement explicit recomputation semantics only
after Aurora-first research closes the retail behavior.

### P1 — Retail/runtime proof is not acceptable under the current proof contract

**Confirmed artifact fact.** The stored retail oracle gate is `blocked` with
`oracleCasesPassed=0`, `oracleCasesBlocked=8`, and 11 failed required JSON
artifacts. The campfire comparison is explicitly failed, with mean absolute RGB
delta `56.172...` and more than 99.9% of sampled pixels changed above the
threshold. Cross-lane precedence is blocked because no direct retail slot dump
or direct renderer slot order exists; accepted and dropped slot arrays are
empty.

The July capture set is useful historical/local evidence, but the current
`proof-capture-safety-contract-2026-07-10.md` explicitly retires the old
`capture-area-lighting-retail-*` helpers. The current proof skill requires a
central AUR-S07 atom or validated ingestion with exact module/hash/Area/fixture,
load-log, and capture evidence.

**Proof completeness:** `missing` for a current accepted runtime proof. Some old
comparisons are additionally `failed`; neither class permits a parity claim.

**Required fix.** Build a guarded current proof packet for fixed placeable
fixtures (LightState off/on, LightColor/offset, ShadowSize S/M/L, MDL shadow and
flare, hybrid static+emitter+light, constrained cross-lane budget). Accept only
fresh, same-state, exact-view comparisons through AUR-S07 or validated
user-provided ingestion.

### P1 — Exact LightManager cross-lane precedence remains unknown

**Confirmed artifact fact.** The ablation matrix shows measurable retail pixel
contribution for the placeables.2da and source-MDL placeable lanes. It does not
identify which exact lane owner occupies or loses each active slot. The current
Aurora Web score/cap policy is a preview adapter, not recovered retail ordering.

**Impact.** Under a constrained light budget Aurora Web may retain/drop a
different placeable light than retail, so an otherwise correct isolated light
can be wrong in a populated Area.

**Required fix.** Recover a direct slot order or complete accepted/dropped owner
map, then replace the preview ranking with the proven policy and add saturation
tests across every lane.

### P2 — Fast-shadow rendering is an explicit approximation and currently fails pixel parity

**Confirmed current-code and artifact fact.** `ShadowSize` selection itself is
source-backed, and the real `fxpa_dot01` texture is delivered when present. The
render path is still labeled as a proxy/stencil/overlay opacity adapter with
pixel parity blocked. The stored campfire compare fails even after its
calibrated ROI attempt.

**Impact.** Shadow asset selection can be correct while projected footprint,
receiver alignment, opacity, inherited state, and final pixels remain wrong.

**Required fix.** Separate asset-selection acceptance from renderer-pixel
acceptance. Calibrate one same-camera/same-viewport fixture and require both
state-order and pixel tolerance before promotion.

### P2 — `Use Area Lighting` gates only the placeables.2da group; total object-light semantics are unproven

**Confirmed current-code fact; Aurora semantic inference remains open.**
`debugState.useAreaLighting` gates `createPlaceableTwoDaLightPreviewGroup`, but
canonical and legacy source-MDL light groups are created and attached earlier
without that gate. Existing evidence confirms the Toolset option exists, but
this audit did not find a recovered rule proving whether the option should
disable only the placeables.2da lane or all placeable/model object lights.

**Impact.** The UI label can imply a broader toggle than the implementation.

**Required fix.** Recover exact Toolset semantics, rename the local toggle if
its intended scope is only 2DA, or consistently gate all proven affected lanes.

### P2 — Lighting ownership is concentrated in oversized renderer modules

**Confirmed current-code fact.** At audit time
`workspacePlaceableModelPresentation.ts` had approximately 16.5k lines and
`workspaceObjectMeshLayer.ts` 22.5k lines. Light parsing adapters, diagnostics,
budget scoring, source-MDL preview, 2DA light, shadow proxy, canonical
composition, and Area attachment decisions are spread across these large
modules and partly duplicated with `auroraVfxCanonicalRenderer.ts`.

**Impact.** The canonical/fallback feature drift in P1 is exactly the kind of
regression this shape encourages; review and mutation coverage are difficult to
scope.

**Required fix.** Extract a typed, pure light-materialization layer shared by
canonical and non-canonical hosts, with separate policy, Three.js construction,
and proof metadata modules.

## What is solid

- UTP `LightState` is parsed and preserved; missing state defaults to ON with
  explicit provenance rather than an unlabelled guess.
- placeables.2da `LightColor`, lightcolor.2da RGB, offsets, and `ShadowSize`
  selection are wired into the local preview.
- Source-MDL light nodes and core animation tracks survive backend packaging.
- Ambient-only light channel and linear-radius falloff are explicitly adapted
  and marked non-retail-proof.
- Inspector/debug metadata is unusually rich and generally distinguishes
  source-backed facts from preview adapters and blocked parity.
- Focused automated tests passed on the audited snapshot:
  - backend: 8 suites, 313 tests;
  - frontend: 6 files, 226 tests;
  - combined: 539 passing tests.

Passing tests prove current contract consistency, not Aurora pixel parity.

## Primary evidence map

- Rich backend light contract:
  `backend/src/modules/catalog/domain/template.types.ts:382-408`.
- Canonical VFX packaging:
  `backend/src/modules/catalog/application/catalog-vfx-runtime-packaging.ts:217`.
- Canonical light subset and explicit non-retail-proof marker:
  `frontend/src/modules/layout/adapters/three/auroraVfxCanonicalRenderer.ts:3132-3294`.
- Legacy shadow, animated shadow/vertical fields, flares, and priority handling:
  `frontend/src/modules/layout/adapters/three/workspacePlaceableModelPresentation.ts:5830-5980`,
  `:8022-8494`.
- Canonical-light detection and legacy suppression:
  `frontend/src/modules/layout/adapters/three/workspaceObjectMeshLayer.ts:17442-17476`.
- `Use Area Lighting` scope in the current renderer:
  `frontend/src/modules/layout/adapters/three/workspaceObjectMeshLayer.ts:21508-21562`.
- Blueprint `LightState` parser/catalog/projection:
  `backend/src/modules/catalog/adapters/outbound/blob/aurora-gff-template-parser.ts:914,1258`,
  `backend/src/modules/catalog/adapters/outbound/blob/module-snapshot-template-catalog.repository.ts:4460`,
  `backend/src/modules/catalog/application/catalog-processing.helpers.ts:1294-1355`.
- Missing instance `LightState` process input:
  `backend/src/modules/catalog/domain/template.types.ts:586-598`,
  `backend/src/modules/catalog/adapters/inbound/http/placeables.schemas.ts:4-27`,
  `frontend/src/modules/placeables/contracts.ts:699-713`.
- Inspector label and LightState lane behavior:
  `frontend/src/modules/layout/adapters/three/workspacePlaceableModelPresentation.ts:6813-6832,7903-7933`.
- Placeable authoring status:
  `frontend/AURORA_FIRST_IMPLEMENTATION_MATRIX.md:63-91`.
- Current proof-safety rejection of retired capture helpers:
  `backend/docs/aurora-reverse/proof-capture-safety-contract-2026-07-10.md:9-17`.
- Stored retail gate and failed shadow/cross-lane artifacts:
  `backend/docs/aurora-reverse/artifacts/light-shadow-2026-07-03-shadowvol-preview/area-lighting-retail-oracle-artifact-gate.json`,
  `shadowvol-campfire-pixel-compare.json`,
  `cross-lane-precedence-compare.json`, and
  `retail-cross-lane-active-slots.json` in the same directory.
- Consolidated remaining-light audit:
  `backend/docs/aurora-reverse/light-shadow-decompilation-remaining-audit-2026-07-07.md:1151-1362`.

## Verification commands run

```text
cd backend
npm.cmd run test:unit -- --runInBand test/unit/catalog-processing.helpers.spec.ts test/unit/aurora-gff-template-parser.spec.ts test/unit/catalog-vfx-runtime-packaging.spec.ts test/unit/area-lighting-evidence.spec.ts test/unit/create-cross-lane-active-slot-blocker-proof.spec.ts test/unit/check-area-lighting-retail-oracle-artifacts.spec.ts
# 6 suites, 114 tests passed

npm.cmd run test:unit -- --runInBand test/unit/catalog.application.service.spec.ts test/unit/module-snapshot-template-catalog.repository.spec.ts
# 2 suites, 199 tests passed

cd ../frontend
npx.cmd vitest run tests/unit/modules/layout/auroraVfxCanonicalRenderer.test.ts tests/unit/modules/layout/workspaceObjectMeshLayer.canonicalVfxRenderer.test.ts tests/unit/modules/layout/workspaceObjectMeshLayer.vfxRenderMode.test.ts tests/unit/modules/layout/auroraLightManagerPreview.test.ts tests/unit/modules/layout/workspaceSceneLightDiagnostics.test.ts tests/unit/modules/layout/PlaceablesModeRightPanel.test.tsx
# 6 files, 226 tests passed
```

The gate generators were not rerun because they write repository artifacts and
the worktree is shared and heavily dirty. Their current durable JSON outputs
were inspected read-only.

## Ordered remediation

1. Stop canonical fallback suppression until canonical light materialization is
   feature-complete or explicitly fail-closed.
2. Add placed-instance `LightState` to the contract and remove the misleading
   instance provenance label until a real instance value is transported.
3. Implement editor/runtime illumination mutation and recomputation only behind
   a recovered Aurora contract.
4. Recover and implement cross-lane LightManager owner precedence.
5. Replace/calibrate fast-shadow proxy behavior against a fixed same-camera
   retail fixture.
6. Prove exact `Use Area Lighting` scope.
7. Run the guarded current AUR-S07/ingestion proof matrix and promote only the
   cases that pass.
8. Extract shared light materialization/policy modules and add focused mutation
   coverage for supported-vs-blocked fields.

## Ready-to-send continuation prompt for the target task

```text
Continue task 019f5818-4b01-7f31-a7cc-ce273f90f352 on placeable lighting only.
Read backend/docs/aurora-reverse/placeable-lighting-agent-audit-2026-08-17.md.
First fix the P1 canonical source-MDL light feature-loss/fallback-suppression
gap with tests; preserve all current dirty work, make no retail-parity claim,
and do not launch Toolset/NWN unless the guarded proof workflow is explicitly
authorized and fully preflighted.
```
