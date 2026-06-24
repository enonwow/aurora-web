# VFX Implementation Checklist

Date snapshot: 2026-06-11
Scope: executable handoff checklist for completing VFX beyond the current preview/preserve lane.

## Purpose

This document is the task board for the next implementation context.

The target is not only to keep catalog VFX previews working, but to implement a full Aurora-first VFX pipeline:

```text
source tables/resources -> source rows -> effect instance -> phase schedule
-> dependency graph -> emitter runtime state -> render contract -> frontend renderer
```

## Update Contract

Every implementation context must update this document before handing off.

Rules:

1. Do not mark a task done unless all required checklist items under that task are checked.
2. Every `Done` task must include at least one evidence line: test, file, PR, commit, or documented waiver.
3. If a task changes scope, update `Notes` and `Blocked by` instead of silently changing the goal.
4. If implementation discovers that a current preview path is being used as canonical runtime evidence, add a diagnostic/guardrail task before continuing.
5. Retail-confirm tasks cannot be marked `Done` without hard evidence: retail capture, parser snapshot, resolver trace, runtime dump, and exact build/profile.

Status values:

- `ToDo`: not started.
- `InProgress`: active work exists.
- `Blocked`: cannot proceed without another task or external evidence.
- `Done`: implementation, tests, evidence, and docs updates are complete.
- `Waived`: intentionally deferred with documented reason and owner.

## Non-Negotiable Guardrails

- [ ] Do not treat `rendererPreset: "vfx-emitter"` as runtime proof.
- [ ] Do not treat catalog `vfxPreset` as a `visualeffects.2da` row.
- [ ] Do not treat placeable VFX source-list entries as `EffectVisualEffect`.
- [ ] Do not use GLB `extras`, `emitter_proxy`, Three.js sprites, or material state as canonical Aurora parity.
- [ ] Do not synthesize missing texture/chunk/model fallbacks as canonical output.
- [ ] Do not collapse `texture`, `texture0`, `materialname`, and `chunkName` into one resource lane.
- [ ] Do not promote a frontend preview smoke test into parser, phase-schedule, particle-lifecycle, or retail-parity evidence.

Evidence references to preserve:

- `backend/src/modules/catalog/application/catalog-processing.helpers.ts` contains canonical VFX subtype and render-contract handling.
- `backend/src/modules/vfx/domain/aurora-vfx-source.parser.ts` contains the current starter parser for `visualeffects.2da` and `progfx.2da`.
- `backend/src/modules/catalog/application/catalog.application.service.ts` contains current MDL emitter/light/chunk preview enrichment.
- `frontend/src/modules/scene/contracts.ts` contains current preserve-only `SceneObjectVfxPreservePayload`.
- `frontend/src/modules/placeables/application/placeableVfxPreservePayload.ts` marks catalog VFX as preview-only/non-canonical.
- `backend/docs/aurora-reverse/vfx-aurora-first-implementation-readiness-r90.md` is the main VFX evidence/readiness base.

## Progress Summary

| ID | Track | Status | Owner | Evidence |
| --- | --- | --- | --- | --- |
| `VFX-P0` | Start audit and guardrails | Done | Codex | Guardrail diagnostics + unit test |
| `VFX-P1` | VFX source policy | Done | Codex | `sources.vfx` + source-policy trace tests |
| `VFX-P2` | Source-preserving 2DA core | Done | Codex | Shared parser in `backend/src/common/aurora/two-da`; VFX parser consumes it. |
| `VFX-P3` | VFX source domain | Done | Codex | Preserve-first source row types/parsers for VFX side tables + guardrail tests |
| `VFX-P4` | Effect instance contract | Done | Codex | `AuroraVfxEffectInstance` + source-only/ready schedule guard tests |
| `VFX-P5` | Dependency graph | Done | Codex | `AuroraVfxDependencyGraph` domain builder + resolver/edge diagnostics tests |
| `VFX-P6` | MDL emitter/light contract | Done | Codex | Domain MDL VFX parser/contract + catalog adapter + focused tests |
| `VFX-P7` | Runtime state machine | Done | Codex | Backend deterministic runtime state with Aurora rand15, particleRot angle ticks, Fountain normal/trail slices, and diagnostic placeholders |
| `VFX-P8` | Runtime render contract | Done | Codex | Renderer-agnostic particle draw contract + rotation/atlas/blend/chunk lane tests |
| `VFX-P9` | Frontend payload bridge | Done | Codex | Versioned frontend AuroraVfxPayload bridge + diagnostic inspector tests |
| `VFX-P10` | Frontend canonical renderer | Done | Codex | Separate Three canonical adapter for renderer-agnostic draw records, rotation, and routing tests |
| `VFX-P11` | API, jobs, cache, benchmark | Done | Codex | Backend `vfx` module with process/cache/benchmark API, VFX job task, cache-key invalidation inputs, observability, and focused tests |
| `VFX-P12` | Retail/parity gate | Blocked | Codex | Fixture manifest and canonical-evidence gate are in place; retail captures are still missing |

## VFX-P0: Start Audit And Guardrails

Status: `Done`

Goal: confirm the implementation boundary before changing code.

Required checklist:

- [x] Read current VFX subtype handling.
- [x] Read current backend VFX preview diagnostics and MDL enrichment path.
- [x] Read current frontend `vfxPayload` and preview-only diagnostics.
- [x] Confirm current Three VFX preview remains non-canonical.
- [x] Add or update diagnostics if any path lacks an explicit preview/non-canonical marker.
- [x] Document current known state in the implementation PR notes.

Acceptance:

- [x] A reviewer can tell which paths are preview-only and which future paths are intended to be canonical.
- [x] No task below starts by reusing GLB/sprite preview as runtime truth.

Evidence:

- `backend/src/modules/catalog/application/catalog-processing.helpers.ts` maps canonical `vfx` handling to preview `rendererPreset: "vfx-emitter"`.
- `backend/src/modules/catalog/application/catalog.application.service.ts:1173` emits `VFX_PLACEABLE_KIND_NOT_EFFECTVISUALEFFECT`; `:1181` keeps derived model delivery out of runtime parity; `:1256`, `:1307`, and `:1424` now emit non-canonical diagnostics when source-MDL emitter/light payloads are attached; `:6559` and `:6595` keep promoted ready packages labelled preview-only.
- `backend/src/modules/vfx/domain/aurora-vfx-source.parser.ts:99` keeps constructed VFX context as `EffectVisualEffect | EffectBeam`; `:655` and `:683` keep source rows `source_only` without effect-instance context.
- `frontend/src/modules/scene/contracts.ts:12` keeps `SceneObjectKind` without `"vfx"`; `:419-432` defines `SceneObjectVfxPreservePayload` as preserve-first with canonical runtime coming from source rows plus effect instances.
- `frontend/src/modules/placeables/application/placeableVfxPreservePayload.ts:147`, `:153`, `:221`, and `:246` mark placeable VFX as not `EffectVisualEffect`, preserve/preview-only, emitter preview non-canonical, and GLB/model delivery not runtime parity.
- `backend/docs/aurora-reverse/vfx-aurora-first-implementation-readiness-r90.md:8701-8711` records the same frontend/source-list and preview/non-canonical guardrails for future work.
- Test: `npm.cmd run test:unit -- --runTestsByPath test/unit/catalog.application.service.spec.ts` passed, 81 tests.

Blocked by:

- None

Notes:

- Current `SceneObjectKind` does not include `"vfx"`; VFX is currently carried as placeable/source-list identity plus `vfxPayload`.
- All roadmap and implementation work uses canonical `vfx` naming.
- Placeable subtype `vfx` remains catalog/source-list identity and is explicitly not an `EffectVisualEffect` instance.
- `rendererPreset: "vfx-emitter"`, ready render packages, GLB/model delivery, source-MDL emitter/light payloads, `emitter_proxy`, Three.js sprites/material state, and chunk/texture preview lanes are preview evidence only, not canonical runtime proof.
- The audit found one ambiguous backend path: source-MDL emitter/light render packages could become `ready` without a dedicated non-canonical diagnostic when no derived GLB was present. Added `VFX_AURORA_MDL_EMITTER_PREVIEW_NON_CANONICAL` and `VFX_AURORA_MDL_LIGHT_PREVIEW_NON_CANONICAL`.
- `vfxPayload` generated from catalog/render payloads is `canonicalStatus: "preview_only"` with diagnostics; the default `"unmapped"` value is a defensive normalization baseline, not a canonical claim.
- Existing tests reviewed in this slice describe alias handling, source-only scheduling, preserve payload normalization, and preview rendering behavior; they do not establish parser/runtime/retail parity.

## VFX-P1: VFX Source Policy

Status: `Done`

Goal: add an explicit source-selection policy for VFX tables and resources.

Required checklist:

- [x] Decide whether to add `sources.vfx` to runtime settings or use a labelled temporary adapter.
- [x] If using a temporary adapter, emit `VFX_INTEGRATION_VFX_SOURCE_POLICY_REQUIRED`.
- [x] Track selected source layer: module, HAK, vanilla, or external selected-profile fixture.
- [x] Track lower-precedence candidates.
- [x] Track selected table hash and selected resource hash.
- [x] Track runtime-settings revision and HAK-list hash.
- [x] Include `lc_vfx.hak` / `cep3_vfx.hak` provenance when they are selected.
- [x] Add cache-key parts for selected source policy.

Tests to add or update:

- [x] Runtime-settings schema test for VFX source policy.
- [x] Resolver trace unit test.
- [x] Cache-key test proving runtime-settings/HAK/source changes invalidate VFX output.
- [x] Negative test for missing VFX policy diagnostic.

Acceptance:

- [x] VFX source selection is explicit and traceable.
- [x] No VFX source row is produced without source provenance.

Evidence:

- `backend/src/modules/runtime-settings/domain/runtime-settings.types.ts:36` adds dedicated `sources.vfx`.
- `backend/src/modules/runtime-settings/domain/runtime-settings.schema.ts:91` requires `sources.vfx`; `:133` validates its `hakProfileId`.
- `backend/src/modules/runtime-settings/domain/runtime-settings.defaults.ts:41` and `:81` add default `lc_vfx` profile and VFX source policy.
- `backend/config/runtime-settings.json:38` and `:141` add live config `lc_vfx` profile and explicit `sources.vfx` HAK policy with `lc_vfx.hak` / `cep3_vfx.hak`.
- `backend/src/modules/runtime-settings/application/runtime-settings.application.service.ts:39`, `:829`, `:1276`, and `:1289` include `vfx` in resolved source settings and enabled HAK/vanilla decisions without borrowing `placeable`.
- `backend/src/modules/vfx/domain/aurora-vfx-source-policy.ts:107` builds the VFX source-policy trace; `:118` emits `VFX_INTEGRATION_VFX_SOURCE_POLICY_REQUIRED` if policy is missing; `:241` builds cache-key contribution.
- `backend/docs/config/runtime-settings.md:69-79` documents `sources.vfx` and VFX source trace fields.
- Tests: `backend/test/unit/runtime-settings.schemas.spec.ts:51`, `backend/test/unit/runtime-settings.application.service.spec.ts:112`, and `backend/test/unit/aurora-vfx-source-policy.spec.ts:9`, `:115`, `:159`.

Tests run:

- `npm.cmd run test:unit -- --runTestsByPath test/unit/runtime-settings.schemas.spec.ts test/unit/runtime-settings.application.service.spec.ts test/unit/aurora-vfx-source-policy.spec.ts` passed, 43 tests.
- `npm.cmd run test:unit -- --runTestsByPath test/unit/catalog.application.service.spec.ts` passed, 81 tests.

Blocked by:

- None

Notes:

- Full `sources.vfx` was added; no temporary adapter is used. The missing-policy diagnostic remains in the VFX source-policy helper for malformed/legacy records.
- Current runtime settings historically exposed `placeable`, `tile`, `area`, and `sound`; VFX now has its own HAK/profile policy and should not borrow `placeable` sources silently.
- This slice adds trace/cache-key policy only. It does not parse `visualeffects.2da`, `progfx.2da`, MDL, TXI, or MTR, and it does not produce VFX source rows.
- `external_fixture` is represented as a traceable source layer for selected-profile fixtures, but no external fixture loader is implemented in this slice.

## VFX-P2: Source-Preserving 2DA Core

Status: `Done`

Goal: create a shared 2DA parser suitable for VFX source tables.

Required checklist:

- [x] Extract or stabilize the current parser into a shared backend utility, for example `backend/src/common/aurora/two-da`.
- [x] Preserve `2DA V2.0` header diagnostics.
- [x] Preserve optional `DEFAULT:` tokens as metadata.
- [x] Preserve physical line number.
- [x] Preserve parsed row id.
- [x] Preserve first-column label.
- [x] Preserve raw cells and decoded values separately.
- [x] Preserve quoted, blank, and missing cell states.
- [x] Preserve extra cells and unknown columns.
- [x] Preserve source object key, source layer, and source hash when provided by resolver.
- [x] Keep parser behavior table-agnostic.
- [x] Add diagnostics for malformed/empty/headerless sources.
- [x] Ensure placeable 2DA helpers cannot satisfy VFX source-parser tests.

Tests to add or update:

- [x] `aurora-two-da-table.spec.ts`
- [x] Header fixture.
- [x] `DEFAULT:` fixture.
- [x] Quoted cell fixture.
- [x] `****` and quoted blank/star fixture.
- [x] Blank physical row fixture.
- [x] Comment fixture.
- [x] Missing trailing cell fixture.
- [x] Extra cell fixture.
- [x] Invalid row id fixture.

Acceptance:

- [x] Parser proves preservation, not runtime semantics.
- [x] No VFX table semantics are hardcoded in the generic parser.

Evidence:

- `backend/src/common/aurora/two-da/aurora-two-da-table.ts:1` defines the shared parser/types and table-level source metadata (`objectKey`, `layer`, `hash`).
- `backend/src/common/aurora/two-da/aurora-two-da-table.ts:172` parses table-agnostic 2DA syntax while preserving header/defaults, physical line numbers, row id/label, raw/decoded cell values, quoted/blank/missing state, extra cells, and diagnostics.
- `backend/src/modules/vfx/domain/aurora-vfx-source.parser.ts:1` imports/re-exports the shared parser and keeps VFX semantics in the VFX-specific layer.
- `backend/src/modules/catalog/adapters/outbound/blob/module-snapshot-template-catalog.repository.ts:59` / `:1129` exposes the existing catalog `placeables.2da` helper only for the negative guardrail test; it still returns simplified lookup rows, not `AuroraTwoDaTable`.
- `backend/test/unit/aurora-two-da-table.spec.ts:1` covers header/defaults, quoted cells, comments, blank/star cells, blank physical rows, missing/extra cells, invalid row ids, source metadata, table-agnostic behavior, and the placeable-helper negative case.
- `backend/test/unit/aurora-vfx-source.parser.spec.ts:1` continues to verify existing VFX parser behavior through the shared parser.

Tests run:

- `npm.cmd run test:unit -- --runTestsByPath test/unit/aurora-two-da-table.spec.ts test/unit/aurora-vfx-source.parser.spec.ts test/unit/module-snapshot-template-catalog.repository.spec.ts` passed, 24 tests.

Blocked by:

- None

Notes:

- `VFX-P1` is `Done`; this parser accepts optional source object key/layer/hash and preserves them on the table and rows, but it does not select sources by itself.
- The generic parser intentionally does not hardcode `visualeffects.2da`, `progfx.2da`, phase, sound, MDL, TXI, MTR, HAK, or runtime effect semantics.
- The catalog `placeables.2da` helper remains a catalog lookup helper and cannot satisfy source-preserving VFX parser tests.

## VFX-P3: VFX Source Domain

Status: `Done`

Goal: model VFX source tables as typed, preserve-first records.

Required checklist:

- [x] Define or extend `AuroraVisualEffectSourceRow`.
- [x] Define or extend `AuroraProgFxSourceRow`.
- [x] Add `AuroraAoeSourceRow` for `vfx_persistent.2da`.
- [x] Add item-property visual source row for `iprp_visualfx.2da`.
- [x] Add spell visual source row for `spells.2da`.
- [x] Add optional damage/combat visual source row for `damagehitvisual.2da`.
- [x] Preserve source table/profile/hash/row id/label/raw cells/diagnostics on every row.
- [x] Parse `visualeffects.2da` phase source refs: impact, duration, cessation.
- [x] Preserve `SoundCessastion` spelling.
- [x] Preserve `ProgFX_Impact`, `ProgFX_Duration`, and `ProgFX_Cessation`.
- [x] Preserve `LowViolence`, `LowQuality`, `OrientWithGround`, and `OrientWithObject`.
- [x] Preserve shake/bump fields as client-event source facts only.
- [x] Preserve profile-mismatch columns such as `.sef`, `Dur_*_Node`, and `DelayDurationFX` with diagnostics.
- [x] Add diagnostics when row-only preview is attempted without effect instance context.

Tests to add or update:

- [x] `aurora-vfx-source.parser.spec.ts` source-domain coverage.
- [x] `visualeffects.2da` fixture with `F`, `D`, `B`, `P`, and blank rows.
- [x] `progfx.2da` fixture with `Type` and raw `Param1..Param8`.
- [x] `vfx_persistent.2da` fixture with shape/model/sound/script cells.
- [x] `iprp_visualfx.2da` fixture proving item-property suffixes are not VFX source rows.
- [x] `spells.2da` fixture preserving visual/projectile/script/sound slots.
- [x] Negative test: catalog `vfxPreset` is not a `visualeffects.2da` row.

Acceptance:

- [x] Source rows are source facts, not runnable effects.
- [x] Unsupported/profile-specific fields are visible as diagnostics and not dropped.

Evidence:

- `backend/src/modules/vfx/domain/aurora-vfx-source.parser.ts:30` defines the preserve-first row base with `sourceTable`, `profile`, source provenance, row identity, `rawCells`, profile mismatches, and diagnostics.
- `backend/src/modules/vfx/domain/aurora-vfx-source.parser.ts:80` extends `AuroraVisualEffectSourceRow`; `:88` extends `AuroraProgFxSourceRow`; `:98`, `:114`, `:122`, and `:129` add AOE, item-property, spell, and damage-hit source rows.
- `backend/src/modules/vfx/domain/aurora-vfx-source.parser.ts:297` centralizes per-row provenance and `VFX_SOURCE_PROFILE_MISMATCH_FIELD_PRESERVED` diagnostics.
- `backend/src/modules/vfx/domain/aurora-vfx-source.parser.ts:516` parses `visualeffects.2da` rows with impact/duration/cessation source refs, `SoundCessastion`, `ProgFX_*`, flags, and shake/bump source facts.
- `backend/src/modules/vfx/domain/aurora-vfx-source.parser.ts:597` preserves `progfx.2da` `Type` and raw `Param1..Param8`.
- `backend/src/modules/vfx/domain/aurora-vfx-source.parser.ts:637`, `:686`, `:729`, and `:765` parse `vfx_persistent.2da`, `iprp_visualfx.2da`, `spells.2da`, and `damagehitvisual.2da` as separate source domains.
- `backend/src/modules/vfx/domain/aurora-vfx-source.parser.ts:803` emits catalog/preview boundary diagnostics for `vfxPreset`, placeable subtype `vfx`, and `vfx-emitter`.
- `backend/test/unit/aurora-vfx-source.parser.spec.ts:87` covers `visualeffects.2da` `F/D/B/P`, blank row, unknown columns, and source provenance.
- `backend/test/unit/aurora-vfx-source.parser.spec.ts:303`, `:355`, `:448`, `:477`, `:526`, and `:595` cover profile mismatch, AOE, item-property, spells, damage-hit, and catalog `vfxPreset` negative guardrails.

Tests run:

- `npm.cmd run test:unit -- --runTestsByPath test/unit/aurora-vfx-source.parser.spec.ts` passed, 11 tests.

Blocked by:

- None

Notes:

- `VFX-P2` is `Done`, so semantic source-domain work was allowed to proceed.
- The checklist's `aurora-vfx-source-reader.spec.ts` coverage was added to the existing focused `backend/test/unit/aurora-vfx-source.parser.spec.ts` rather than a new reader spec, because the current source reader/parser lives in `aurora-vfx-source.parser.ts`.
- Side-table rows stay separate: AOE, item-property, spell, and damage-hit source facts are not interpreted as normal `visualeffects.2da` rows.
- `buildAuroraVfxPhaseSchedule()` remains the only minimal scheduling guard touched in this slice; it still keeps rows `source_only` without effect-instance context.

## VFX-P4: Effect Instance Contract

Status: `Done`

Goal: represent actual constructed effects separately from source rows and catalog VFX anchors.

Required checklist:

- [x] Define `AuroraVfxEffectInstance`.
- [x] Support `constructorKind: EffectVisualEffect`.
- [x] Support `constructorKind: EffectBeam`.
- [x] Preserve source row id.
- [x] Preserve application mode: object/location.
- [x] Preserve duration type and requested duration.
- [x] Preserve miss flag.
- [x] Preserve EE transform tuple: scale, translate, rotate.
- [x] Preserve target, effector, creator, and body-node context.
- [x] Preserve observable `GetEffect*` slots where known.
- [x] Build `AuroraVfxPhaseSchedule` from source row plus instance context.
- [x] Keep source rows `source_only` when instance context is missing.
- [x] Emit row mismatch diagnostic when instance row and source row differ.
- [x] Keep model, progFX, sound, and client-event lanes separate.

Tests to add or update:

- [x] `EffectVisualEffect` instant fixture.
- [x] `EffectVisualEffect` temporary/duration fixture.
- [x] `EffectVisualEffect` permanent fixture.
- [x] `EffectBeam` body-node fixture.
- [x] Missing context keeps schedule `source_only`.
- [x] Mismatched row id emits error.
- [x] Catalog/placeable VFX does not create `AuroraVfxEffectInstance`.

Acceptance:

- [x] No phase schedule is considered runtime-ready without an effect instance.
- [x] Placeable/source-list VFX identity remains separate from effect construction.

Evidence:

- `backend/src/modules/vfx/domain/aurora-vfx-source.parser.ts:151` defines EE transform tuple support and `:164` defines preserve-first `GetEffect*` observation slots.
- `backend/src/modules/vfx/domain/aurora-vfx-source.parser.ts:181` defines `AuroraVfxEffectInstance` with constructor kind, source row, application/duration, miss flag, transform, target/effector/creator/body node, and observation fields.
- `backend/src/modules/vfx/domain/aurora-vfx-source.parser.ts:206` extends `AuroraVfxPhaseSchedule` with `effectInstance`, compatibility `context`, and separate model/progFX/sound/client-event lanes.
- `backend/src/modules/vfx/domain/aurora-vfx-source.parser.ts:898` rejects catalog/placeable preview metadata as an effect-instance source.
- `backend/src/modules/vfx/domain/aurora-vfx-source.parser.ts:913` builds separate schedule lanes; `:941` validates `EffectBeam` source/target/body-node context.
- `backend/src/modules/vfx/domain/aurora-vfx-source.parser.ts:982` keeps rows `source_only` without an effect instance, emits row mismatch diagnostics, and only returns `ready` when instance diagnostics contain no error.
- `backend/test/unit/aurora-vfx-effect-instance.spec.ts:50`, `:111`, `:145`, and `:173` cover `EffectVisualEffect` instant/temporary/permanent and `EffectBeam` with body-node context.
- `backend/test/unit/aurora-vfx-effect-instance.spec.ts:213`, `:237`, `:263`, and `:287` cover missing context, row mismatch, incomplete beam context, and catalog/placeable preview rejection.

Tests run:

- `npm.cmd run test:unit -- --runTestsByPath test/unit/aurora-vfx-effect-instance.spec.ts test/unit/aurora-vfx-source.parser.spec.ts` passed, 19 tests.

Blocked by:

- None

Notes:

- `VFX-P3` is `Done`, so effect-instance work was allowed to proceed.
- The previous `AuroraVfxEffectInstanceContext` name remains as a compatibility alias to `AuroraVfxEffectInstance`; new schedule output exposes `effectInstance` explicitly.
- This slice does not implement particle runtime, renderer work, or `VFX-P5` dependency graph. The schedule only separates existing source-row phase lanes into model/progFX/sound/client-event summaries.
- Catalog/placeable VFX preview metadata remains diagnostic-only and does not construct an `AuroraVfxEffectInstance`.

## VFX-P5: Dependency Graph

Status: `Done`

Goal: model all resources needed by VFX with provenance and diagnostics.

Required checklist:

- [x] Define `AuroraVfxDependencyGraph`.
- [x] Add edge type for phase model.
- [x] Add edge type for MDL/MDB source model.
- [x] Add edge type for emitter node.
- [x] Add edge type for texture.
- [x] Add edge type for TXI sidecar.
- [x] Add edge type for MTR/material.
- [x] Add edge type for shader/custom shader.
- [x] Add edge type for chunk model.
- [x] Add edge type for sound.
- [x] Add edge type for progFX row.
- [x] Add edge type for spell/item/combat owner slot.
- [x] Record owner path for each edge.
- [x] Record requested resource class.
- [x] Record selected candidate and lower-precedence candidates.
- [x] Record unresolved resource diagnostics.
- [x] Record preload intent and cache key contribution.
- [x] Preserve missing texture/chunk/sound/shader as graph edges.
- [x] Ensure `chunkName` selects chunk-model lane.
- [x] Ensure `texture` is preserved when `chunkName` overrides rendering.

Tests to add or update:

- [x] Module vs HAK precedence fixture.
- [x] Ordered HAK conflict fixture.
- [x] Missing texture fixture.
- [x] Missing chunk model fixture.
- [x] TXI sidecar fixture.
- [x] MTR/custom shader fixture.
- [x] PLT profile gate fixture.
- [x] Same token in `texture`, `texture0`, `materialname`, and `chunkName` remains separate lanes.

Acceptance:

- [x] Missing resources never delete source rows, emitter nodes, phase records, or raw tokens.
- [x] Chunk particles do not fall back to textured quads as canonical output.

Evidence:

- `backend/src/modules/vfx/domain/aurora-vfx-dependency-graph.ts:14` defines the dependency edge type union for phase model, source model, emitter node, texture, TXI sidecar, material, shader, chunk model, sound, progFX row, and owner-slot lanes.
- `backend/src/modules/vfx/domain/aurora-vfx-dependency-graph.ts:91` defines the edge contract with `edgeId`, `edgeType`, `ownerPath`, requested resource class/ref, source provenance, selected/lower-precedence candidates, resolve status, diagnostics, cache-key parts, and preload intent.
- `backend/src/modules/vfx/domain/aurora-vfx-dependency-graph.ts:122` defines `AuroraVfxDependencyGraph`; `:175` builds it from source row, phase schedule, source-policy trace, resolver traces, emitter refs, and owner slots.
- `backend/src/modules/vfx/domain/aurora-vfx-dependency-graph.ts:287` builds emitter/source-model/material/shader/chunk edges; `:376` preserves texture/texture0 lanes and TXI sidecars while keeping `chunkName` as the chunk-model lane.
- `backend/src/modules/vfx/domain/aurora-vfx-dependency-graph.ts:467` applies resolver traces and cache-key contributions; `:557` keeps missing texture/chunk/sound/shader resources as unresolved diagnostic edges.
- `backend/test/unit/aurora-vfx-dependency-graph.spec.ts:138` covers module vs HAK precedence and source-policy cache-key parts.
- `backend/test/unit/aurora-vfx-dependency-graph.spec.ts:208`, `:251`, `:280`, `:325`, `:371`, `:395`, `:423`, and `:473` cover ordered HAK conflicts, missing texture, missing chunk model, TXI/MTR/shader, PLT diagnostics, separate same-token lanes, source-model/owner-slot edges, and missing source-policy trace.

Tests run:

- `npm.cmd run test:unit -- --runTestsByPath test/unit/aurora-vfx-dependency-graph.spec.ts` passed, 9 tests.

Blocked by:

- None

Notes:

- `VFX-P1`, `VFX-P3`, and `VFX-P4` are `Done`, so dependency graph work was allowed to proceed.
- Current chunk diagnostics in catalog processing remain preview-useful, but the new graph is a separate VFX-domain builder and does not consume GLB/Three preview binding as canonical runtime proof.
- This slice does not implement `VFX-P6` MDL emitter parsing, particle runtime, or frontend renderer work; `AuroraVfxDependencyEmitterSource` is a minimal placeholder input for already-known emitter refs.
- Missing dependencies remain visible unresolved edges and do not delete source rows, emitters, phase records, or raw tokens.

## VFX-P6: MDL Emitter And Light Contract

Status: `Done`

Goal: move MDL emitter/light parsing into VFX-domain contracts without binding it to GLB preview.

Required checklist:

- [x] Define `AuroraMdlEmitterNode`.
- [x] Define `AuroraMdlLightNode`.
- [x] Define `AuroraMdlReferenceNode`.
- [x] Define `AuroraAnimationEvaluationPass`.
- [x] Preserve node name and parent/child provenance.
- [x] Preserve transform and orientation.
- [x] Preserve source state flags.
- [x] Preserve render mode and blend raw tokens.
- [x] Preserve atlas fields.
- [x] Preserve simulation fields.
- [x] Preserve direct/key/bezier-key rows.
- [x] Preserve color timelines.
- [x] Preserve animation events including `detonate`.
- [x] Preserve reference nodes for P2P/Lightning target context.
- [x] Preserve light radius/color/position timelines.
- [x] Keep GLB converter as preview/asset delivery only.

Tests to add or update:

- [x] ASCII emitter fixture.
- [x] Binary emitter fixture.
- [x] ASCII keyed timeline fixture.
- [x] Binary keyed timeline fixture.
- [x] Animation event/detonate fixture.
- [x] P2P/Lightning reference-node fixture.
- [x] Light-node fixture.
- [x] GLB `emitter_proxy` remains non-canonical boundary test.

Acceptance:

- [x] MDL source facts can feed runtime contracts without requiring derived GLB.
- [x] GLB preview output is never required to prove emitter semantics.

Evidence:

- `backend/src/modules/vfx/domain/aurora-mdl-vfx-source.parser.ts:189` defines `AuroraAnimationEvaluationPass`; `:216`, `:225`, and `:266` define `AuroraMdlReferenceNode`, `AuroraMdlEmitterNode`, and `AuroraMdlLightNode`.
- `backend/src/modules/vfx/domain/aurora-mdl-vfx-source.parser.ts:476` exposes `parseAuroraMdlVfxSource`; `:529` and `:723` parse ASCII and binary MDL source nodes without GLB/Three dependencies.
- `backend/src/modules/vfx/domain/aurora-mdl-vfx-source.parser.ts:515` keeps GLB `emitter_proxy` explicitly non-canonical via `VFX_GLB_EMITTER_PROXY_NON_CANONICAL`.
- `backend/src/modules/catalog/application/catalog.application.service.ts:3400` and `:3411` now route source-model emitter/light collection through the VFX-domain parser while keeping render-package enrichment preview-only.
- `backend/test/unit/aurora-vfx-mdl-nodes.spec.ts:7`, `:163`, `:271`, and `:344` cover ASCII emitter, binary emitter/keyed controllers, light timelines, and GLB boundary fixtures.

Tests run:

- `npm.cmd run test:unit -- --runTestsByPath test/unit/aurora-vfx-mdl-nodes.spec.ts` passed, 4 tests.
- `npm.cmd run test:unit -- --runTestsByPath test/unit/catalog.application.service.spec.ts` passed, 81 tests.

Blocked by:

- None. `VFX-P5` is `Done` with dependency graph evidence.

Notes:

- Active emitter/light collection now uses the VFX-domain parser. The previous private parser/helper block remains in `catalog.application.service.ts` as cleanup debt to avoid a high-risk mechanical deletion in this slice.
- GLB converter, GLB `extras`, and `emitter_proxy` remain preview/asset-delivery provenance only; this slice does not implement particle runtime, runtime ticks, renderer work, or `VFX-P7`.

## VFX-P7: Runtime State Machine

Status: `Done`

Goal: create deterministic VFX particle runtime state independent of Three.js.

Required checklist:

- [x] Define `AuroraEmitterRuntimeState`.
- [x] Define particle active/free list records.
- [x] Define runtime tick input/context.
- [x] Define deterministic RNG/profile hook.
- [x] Track local/source clock.
- [x] Track particle age/lifetime.
- [x] Track position/velocity/acceleration.
- [x] Track color/alpha/size state.
- [x] Track atlas frame/checkpoint state.
- [x] Track reset/death reason.
- [x] Implement Fountain update family.
- [x] Add Single diagnostic placeholder without sharing Fountain spawn.
- [x] Add Explosion diagnostic placeholder with detonate gate.
- [x] Add P2P diagnostic placeholder with target-context gate.
- [x] Add Lightning diagnostic placeholder with missing-target active clear.
- [x] Add chunk particle diagnostic placeholder.
- [x] Keep family-specific spawn gates separate.
- [x] Preserve detonate latch behavior for Explosion.
- [x] Preserve zero/non-positive `lifeExp` draw gate without preview clamp.
- [x] Preserve collision/bounce/splat as explicit query/result contracts, even if unresolved.

Tests to add or update:

- [x] Deterministic tick advances particle age.
- [x] Expired particles are removed/recycled.
- [x] Fountain positive birthrate gate.
- [x] Fountain zero/non-positive `lifeExp` emits draw-gate/no-preview-clamp diagnostics.
- [x] Fountain zero/non-positive `birthrate` emits gate diagnostics and does not spawn.
- [x] Single diagnostic placeholder does not share Fountain spawn path.
- [x] Explosion requires detonate event.
- [x] Explosion without detonate emits no fallback burst.
- [x] P2P missing target pointer diagnostic.
- [x] Lightning missing target clears/blocks active particles.
- [x] Bounce/splat requires collision context.

Acceptance:

- [x] Runtime can produce state snapshots without frontend renderer.
- [x] Runtime tests do not depend on GLB, Three.js, or screenshots.

Evidence:

- `backend/src/modules/vfx/domain/aurora-vfx-runtime-state.ts:124` defines `AuroraEmitterRuntimeState`; `:225` and `:233` expose deterministic tick APIs; `:295` builds renderer-free snapshots.
- `backend/src/modules/vfx/domain/aurora-vfx-runtime-state.ts:368` implements the Fountain update family; `:422`, `:452`, `:475`, and `:499` keep Explosion/P2P/Lightning/Chunk as diagnostic placeholder paths; `:256` keeps Single as a diagnostic placeholder.
- `backend/src/modules/vfx/domain/aurora-vfx-runtime-state.ts:658` keeps bounce/splat as explicit collision query/result contracts and emits `VFX_PARTICLE_COLLISION_CONTEXT_REQUIRED` when unresolved.
- 2026-06-17 implementation update: `backend/src/modules/vfx/domain/aurora-vfx-runtime-state.ts` now uses the Aurora rand15 sequence from the decompiled `FUN_00b90fe8` (`seed * 0x15a4e35 + 1`, `(seed >> 16) & 0x7fff`), normal Fountain spawn thresholds reset on the `1 / birthrate` period, and `spawnType: 1` Fountain trail emission carries source-position residual distance between ticks.
- 2026-06-17 particleRot update: `backend/src/modules/vfx/domain/aurora-vfx-runtime-state.ts` now stores per-particle `rotationRadians`, starts spawned particles at `0`, advances active particles from parsed `particleRot` after converting it to radians/sec, and wraps at Aurora's `+-2pi` boundary matching the decompiled active-particle loop that updates particle offset `0x14` from emitter offset `0xa0`.
- `backend/test/unit/aurora-vfx-runtime-state.spec.ts:10`, `:54`, `:90`, `:103`, `:119`, `:135`, `:149`, `:177`, `:189`, `:237`, and `:261` cover deterministic ticks, recycling, Fountain gates, diagnostic placeholders, collision context, and backend-only boundaries.
- `npm.cmd run test:unit -- --runTestsByPath test/unit/aurora-vfx-runtime-state.spec.ts` passed, 13 tests.
- 2026-06-17 verification: `npm run test:unit -- aurora-vfx-runtime-state.spec.ts` passed 23 tests; `npm run test:unit -- aurora-vfx` passed 129 tests; `npm run build` passed.
- 2026-06-17 particleRot verification: `npm run test:unit -- aurora-vfx-runtime-state.spec.ts aurora-vfx-render-contract.spec.ts` passed 38 tests; `npm run build` passed.

Blocked by:

- None. `VFX-P4` and `VFX-P6` are already `Done` with evidence in this checklist.

Notes:

- Real runtime update implemented in this slice: Fountain normal period spawning, Fountain trail distance/residual spawning, Aurora rand15 jitter source, and source-backed `particleRot` angle advancement.
- Diagnostic placeholders only: Single, Explosion, P2P, Lightning, and Chunk. They do not claim runtime parity and do not synthesize fallback particles.
- This slice does not implement `VFX-P8`, draw records, frontend renderer work, GLB preview semantics, or Three.js heuristics.

## VFX-P8: Runtime Render Contract

Status: `Done`

Goal: convert runtime state into Aurora render records without using frontend material heuristics as source truth.

Required checklist:

- [x] Define `AuroraParticleDrawRecord`.
- [x] Track active particle count.
- [x] Track draw particle count.
- [x] Track vertices per particle as `6` for textured quads.
- [x] Track draw mode argument/provenance diagnostics.
- [x] Track non-indexed draw-array route.
- [x] Track render mode enum/raw token.
- [x] Track blend mode enum/raw token.
- [x] Track Punch-Through depth-write lane.
- [x] Track non-punch transparent lane.
- [x] Track two-sided texture/cull lane.
- [x] Track shader variant lane.
- [x] Track renderorder comparison.
- [x] Track per-particle atlas UV.
- [x] Track atlas row-major mapping.
- [x] Track atlas random reset path.
- [x] Track linked-particle draw count as active minus one.
- [x] Keep exact GL blend factors diagnostic until retail/capture proof.

Tests to add or update:

- [x] Active particle count maps to draw particle count and draw vertex count.
- [x] Non-indexed draw-array provenance.
- [x] Atlas single-cell mapping.
- [x] Atlas row-major mapping.
- [x] Atlas top-down V-row mapping.
- [x] Per-particle frame state.
- [x] `random 1` reset path.
- [x] Descending/invalid frame ranges preserve diagnostics.
- [x] Punch-Through vs non-punch render state.
- [x] Raw mode `2` preservation.
- [x] Linked particles active-minus-one draw count.
- [x] Two overlapping emitters with different `renderorder`.
- [x] Chunk particles do not use canonical textured quad lane.
- [x] Tests do not depend on Three.js, GLB, screenshots, or frontend code.

Acceptance:

- [x] Render contract is renderer-agnostic.
- [x] Three.js material settings remain adapter details, not source truth.

Evidence:

- `backend/src/modules/vfx/domain/aurora-vfx-render-contract.ts:89` defines `AuroraParticleDrawRecord`; `:135` defines the versioned renderer-agnostic runtime render contract.
- `backend/src/modules/vfx/domain/aurora-vfx-render-contract.ts:183` builds draw contracts from `AuroraEmitterRuntimeState`; `:328` builds per-particle records; `:359` maps atlas frame state to per-particle UVs.
- 2026-06-17 particleRot update: draw records now carry runtime `rotationRadians` from `AuroraParticleRuntimeRecord` so adapters consume the runtime angle instead of recomputing a frontend-only preview angle.
- `backend/src/modules/vfx/domain/aurora-vfx-render-contract.ts:205` preserves chunk-model lane diagnostics; `:292` compares preserved `renderorder` values without claiming adapter draw direction.
- `backend/src/modules/vfx/domain/aurora-vfx-render-contract.ts:613` keeps draw mode arg `3` diagnostic until enum-table capture; `:631` keeps exact GL blend factors diagnostic until retail/capture proof.
- `backend/test/unit/aurora-vfx-render-contract.spec.ts:14`, `:45`, `:66`, `:87`, `:115`, `:136`, `:163`, `:184`, `:203`, `:227`, `:245`, and `:277` cover counts, non-indexed route, atlas mapping, random reset, invalid ranges, blend/render lanes, renderorder, chunk, and backend-only boundaries.
- `npm.cmd run test:unit -- --runTestsByPath test/unit/aurora-vfx-render-contract.spec.ts` passed, 12 tests.

Blocked by:

- None. `VFX-P7` is `Done` with evidence in this checklist.

Notes:

- Render contract is backend/domain-level and does not import frontend, Three.js, GLB preview, `SpriteMaterial`, or `ShaderMaterial`.
- `Normal`, `Punch-Through`, and raw/mode `2` buckets are preserved; exact GL blend factors remain diagnostic until retail/capture proof.
- Chunk particles remain on chunk-model lane and explicitly do not use textured six-vertex quad output as canonical.
- This slice does not implement `VFX-P10`, frontend renderer work, or retail parity capture.

## VFX-P9: Frontend Payload Bridge

Status: `Done`

Goal: let the frontend carry canonical VFX payloads while preserving preview-only labels.

Required checklist:

- [x] Add versioned `AuroraVfxPayload` contract.
- [x] Decide whether to add `SceneObjectKind = "vfx"`.
- [x] Keep the existing `SceneObjectKind` model and avoid UI filter/object-command migration in this slice.
- [x] Preserve placeable subtype `vfx` as catalog/source-list identity.
- [x] Add backend payload to scene-object mapper.
- [x] Add source row diagnostics to inspector.
- [x] Add effect instance diagnostics to inspector.
- [x] Add phase schedule diagnostics to inspector.
- [x] Add dependency graph diagnostics to inspector.
- [x] Add runtime/render contract diagnostics to inspector.
- [x] Add canonical/preview status display.
- [x] Preserve load/save roundtrip.
- [x] Preserve copy/clone behavior for VFX payload diagnostics.
- [x] Keep existing preview-only payloads marked `preview_only`.

Tests to add or update:

- [x] Scene factory roundtrip with versioned VFX payload.
- [x] Local draft persistence roundtrip.
- [x] Copy/clone preserves VFX payload.
- [x] Catalog VFX remains preview-only.
- [x] Canonical payload shows canonical status only when backend marks it so.
- [x] Mixed old/new payload normalization.
- [x] Inspector/WorkspaceMockLayout shows source/effect/schedule/dependency/runtime/render diagnostics.
- [x] No preview payload accidentally claims canonical.

Acceptance:

- [x] Frontend can display canonical payload metadata without rendering it yet.
- [x] No preview payload can accidentally claim canonical status.

Evidence:

- `frontend/src/modules/scene/contracts.ts:419` defines the versioned `AuroraVfxPayload`; `:461` defines the payload envelope; `:488` keeps it nested under the backward-compatible `SceneObjectVfxPreservePayload`.
- `frontend/src/modules/scene/domain/auroraVfxPayload.ts:92` normalizes backend/scene payloads; `:126` bridges backend payloads into scene-object VFX payloads; `:175` builds preview-only legacy/catalog payloads; `:215` summarizes grouped diagnostics for the inspector; `:237` deep-clones VFX payloads; `:264` maps backend VFX payloads to existing scene objects.
- `frontend/src/modules/scene/domain/sceneFactory.ts:455` normalizes nested Aurora payloads; `:462` prevents legacy scene payloads from claiming canonical without backend confirmation; `:474` carries grouped diagnostics into the existing scene payload.
- `frontend/src/modules/placeables/application/placeableVfxPreservePayload.ts:163` keeps catalog/placeable preview payloads `preview_only`; `:198` consumes future backend Aurora VFX payloads when present; `:330` keeps render-package fallback payloads preview-only; `:370` detects backend payload candidates defensively.
- `frontend/src/modules/layout/components/WorkspaceMockLayout.tsx:653` and `:716` summarize Aurora VFX diagnostic groups in the placeables inspector without starting a renderer.
- `frontend/src/modules/layout/application/workspaceSceneObjectClone.ts:74` and `frontend/src/modules/layout/application/useWorkspaceObjectCommands.ts:204` deep-clone VFX payload diagnostics/contracts for clone/copy flows.
- `frontend/tests/unit/modules/scene/domain/auroraVfxPayload.test.ts:19`, `:60`, `:74`, `:151`, and `:181` cover versioned scene payloads, backend-only canonical status, mixed old/new normalization, local draft persistence, and deep-copy behavior.
- `frontend/tests/unit/modules/layout/WorkspaceMockLayout.viewportWiring.test.tsx:1819` verifies inspector source/effect/schedule/dependency/runtime/render diagnostic summaries for a canonical backend-marked payload.
- `frontend/tests/unit/modules/placeables/placeablePreviewSceneMapper.test.ts:192` keeps catalog VFX preview objects marked `preview_only`.
- `npm.cmd exec -- vitest run tests/unit/modules/scene/domain/auroraVfxPayload.test.ts tests/unit/modules/scene/domain/sceneFactory.test.ts tests/unit/modules/scene/localDraftStore.test.ts tests/unit/modules/placeables/placeablePreviewSceneMapper.test.ts tests/unit/modules/layout/WorkspaceMockLayout.viewportWiring.test.tsx` passed, 52 tests.

Blocked by:

- None. `VFX-P4`, `VFX-P5`, and `VFX-P8` are already `Done` with evidence in this checklist.

Notes:

- `SceneObjectKind = "vfx"` was not added in this slice. Canonical VFX metadata rides on the existing `SceneObject.vfxPayload` field, mapped as `kind: "placeables"` for compatibility with scene filters, draft persistence, and object commands. A first-class VFX scene kind can be revisited with the canonical renderer work if it needs distinct selection/rendering behavior.
- `SceneObjectVfxPreservePayload` remains backward-compatible and can carry legacy preserve payloads, preview-only catalog payloads, or a nested versioned `AuroraVfxPayload`.
- `canonicalStatus` is accepted as `canonical` only when the nested backend payload explicitly marks itself canonical via `backendCanonical: true`; legacy/top-level canonical claims are downgraded with `VFX_CANONICAL_STATUS_BACKEND_MARK_REQUIRED`.
- Existing catalog VFX/placeable preview paths remain `preview_only`.
- This slice does not implement `VFX-P10`, a canonical frontend renderer, or any Three.js adapter work.

## VFX-P10: Frontend Canonical Renderer

Status: `Done`

Goal: render canonical `AuroraParticleDrawRecord` output separately from current preview scaffolds.

Required checklist:

- [x] Keep current placeable VFX preview adapter explicitly preview-only.
- [x] Add a separate canonical VFX renderer adapter.
- [x] Consume renderer-agnostic draw records.
- [x] Build six-vertex geometry per textured particle where applicable.
- [x] Apply per-particle atlas UV.
- [x] Apply per-particle color/alpha/size from runtime state.
- [x] Apply per-particle rotation from runtime state.
- [x] Keep chunk particles on chunk-model lane.
- [x] Show missing texture diagnostic fallback without procedural fake canonical particles.
- [x] Show debug overlay/userData for particle count, draw count, atlas frame, blend/render state.
- [x] Avoid using `SpriteMaterial` as parity proof.
- [x] Avoid using Three.js `transparent`, `depthWrite`, or `blending` as source truth.

Tests to add or update:

- [x] Nonblank canonical render smoke.
- [x] Draw record to geometry vertex-count test.
- [x] Draw record `rotationRadians` rotates textured quad vertices.
- [x] Missing texture diagnostic test.
- [x] Chunk particle does not use textured quad lane.
- [x] Preview and canonical renderer paths are distinct.
- [x] Canonical payload uses canonical renderer.
- [x] Preview payload still uses preview renderer.
- [x] UserData/debug metadata includes particle count, draw count, atlas, render, and blend state.
- [x] No test claims retail parity.
- [x] Browser/canvas screenshot smoke deferred; contract/adapter tests exist first.

Acceptance:

- [x] Renderer can be visually inspected without weakening source/runtime tests.
- [x] Preview mode remains available and clearly labelled.

Evidence:

- `frontend/src/modules/layout/adapters/three/auroraVfxCanonicalRenderer.ts:105` gates canonical rendering on `canonicalStatus: "canonical"` plus `backendCanonical: true`; `:115` builds the separate canonical Three group from `AuroraVfxPayload`.
- `frontend/src/modules/layout/adapters/three/auroraVfxCanonicalRenderer.ts:190` builds canonical non-indexed six-vertex textured quad geometry from backend draw records; `:337` writes per-particle position, UV, color, alpha, size, and atlas-frame attributes.
- 2026-06-17 particleRot update: `frontend/src/modules/layout/adapters/three/auroraVfxCanonicalRenderer.ts` now reads draw-record `rotationRadians`, exposes it in canonical renderer userData, and rotates textured quad vertices around the particle center from the runtime contract value.
- `frontend/src/modules/layout/adapters/three/auroraVfxCanonicalRenderer.ts:151` and `:469` keep chunk/missing-texture cases as diagnostic placeholders without fake canonical particle draw meshes.
- `frontend/src/modules/layout/adapters/three/auroraVfxCanonicalRenderer.ts:400` applies adapter material state from the render contract while marking Three material settings as adapter details, not source truth.
- `frontend/src/modules/layout/adapters/three/workspaceObjectMeshLayer.ts:316` detects canonical Aurora payloads; `:469` creates the canonical group; `:476` keeps the preview group path guarded away from canonical payloads; `:822` routes canonical groups before preview/pending fallback roots.
- `frontend/src/modules/scene/domain/auroraVfxPayload.ts:363` preserves already-versioned nested `contracts.renderContract`/`contracts.dependencyGraph` payloads so the canonical renderer can consume backend draw records.
- `frontend/tests/unit/modules/layout/auroraVfxCanonicalRenderer.test.ts:240`, `:297`, `:312`, `:327`, and `:346` cover nonblank canonical draw smoke, renderorder metadata, missing texture diagnostic fallback, chunk-lane separation, and preview/unconfirmed payload rejection.
- `frontend/tests/unit/modules/layout/workspaceObjectMeshLayer.canonicalVfxRenderer.test.ts:291` and `:324` verify canonical and preview payloads take distinct mesh-layer routes.
- `frontend/tests/unit/modules/scene/domain/auroraVfxPayload.test.ts:74` covers preservation of already-versioned nested contracts used by the canonical renderer.
- `npm.cmd exec -- vitest run tests/unit/modules/layout/auroraVfxCanonicalRenderer.test.ts tests/unit/modules/layout/workspaceObjectMeshLayer.canonicalVfxRenderer.test.ts tests/unit/modules/layout/workspaceObjectMeshLayer.vfxRenderMode.test.ts tests/unit/modules/scene/domain/auroraVfxPayload.test.ts` passed, 84 tests.
- `npm.cmd exec -- tsc -b --pretty false` passed.
- 2026-06-17 particleRot verification: `npx vitest run tests/unit/modules/layout/auroraVfxCanonicalRenderer.test.ts` passed 6 tests; `npm run build` passed.

Blocked by:

- None. `VFX-P8` and `VFX-P9` are already `Done` with evidence in this checklist.

Notes:

- The canonical adapter is separate from `workspacePlaceableModelPresentation.ts` and does not call `createPlaceableVfxPreviewGroup`.
- The current preview scaffold remains available and is still labelled through `canonicalStatus: "preview_only"` for catalog/placeable VFX.
- The canonical adapter consumes `AuroraVfxPayload.contracts.renderContract` draw records, including runtime `rotationRadians`, and `dependencyGraph` texture edges. It does not infer runtime semantics from GLB, sprite preview, or Three material state.
- Missing texture and chunk-lane cases render diagnostic placeholders only; they do not create procedural fake canonical particles or collapse chunk particles into textured quads.
- Browser screenshot smoke was not run in this slice because the focused adapter/mesh tests verify nonblank geometry and routing without claiming retail parity. Screenshot smoke remains useful later as regression coverage, not parity proof.
- This slice does not implement `VFX-P12` or retail parity.

## VFX-P11: API, Jobs, Cache, Benchmark

Status: `Done`

Goal: make VFX a first-class backend processing pipeline.

Required checklist:

- [x] Add VFX source parse API or processing action.
- [x] Add VFX runtime-package processing action.
- [x] Add processing job support.
- [x] Add cache read for VFX package.
- [x] Add cache invalidation for source policy changes.
- [x] Add cache invalidation for HAK/runtime-settings changes.
- [x] Add benchmark for source parse.
- [x] Add benchmark for dependency graph build.
- [x] Add benchmark for runtime tick.
- [x] Add benchmark for render contract build.
- [x] Add observability event fields for source hash, cache hit/miss, diagnostics count, unresolved dependency count.
- [x] Add security/path validation for VFX source resources.

Tests to add or update:

- [x] API schema tests.
- [x] Processing job lifecycle tests.
- [x] Cache key unit tests.
- [x] Cache read unit/e2e-style service test.
- [x] Benchmark contract tests.
- [x] Security negative-path tests.

Acceptance:

- [x] VFX processing can run independently of placeable preview processing.
- [x] VFX outputs are deterministic and cacheable.

Evidence:

- `backend/src/modules/vfx/vfx.module.ts` registers a first-class `VfxModule` with `VfxController` and `VfxApplicationService`; `backend/src/app.module.ts` imports it.
- `backend/src/modules/vfx/adapters/inbound/http/vfx.controller.ts` exposes `POST /vfx/process`, `GET /vfx/cache/:cacheKey`, and `POST /vfx/benchmark` under `processing.vfx.*` permissions.
- `backend/src/modules/vfx/adapters/inbound/http/vfx.schemas.ts` validates source/runtime package payloads, resolver traces, cache keys, and benchmark requests.
- `backend/src/modules/vfx/application/vfx.application.service.ts` builds VFX source policy traces, parses `visualeffects.2da`, builds phase schedules and dependency graphs, runs the P7 runtime/P8 render-contract slice when an emitter is provided, caches `aurora-vfx-package/v1`, reads cache entries, validates unsafe paths, and emits observability fields (`sourceHash`, `cacheHit`, `diagnosticsCount`, `unresolvedDependencyCount`, `runtimePackageStatus`, `renderContractStatus`).
- `backend/src/modules/vfx/domain/aurora-vfx-cache-key.ts` contributes source policy hash, selected table/resource hashes, runtime-settings revision, HAK-list hash, dependency edge keys, selected resource hashes, and runtime inputs to VFX output cache keys.
- `backend/src/modules/processing-jobs/domain/processing-job.types.ts`, `backend/src/modules/processing-jobs/adapters/inbound/http/processing-jobs.schemas.ts`, `backend/src/modules/processing-jobs/application/processing-jobs.application.service.ts`, and `backend/src/modules/processing-jobs/processing-jobs.module.ts` add `process_vfx_runtime_package` job support routed directly to `VfxApplicationService`, not the catalog/placeable preview service.
- `backend/src/modules/auth/domain/auth.policy.ts` adds explicit `processing.vfx.read` and `processing.vfx.run` permissions for builder/dm/admin.
- `backend/test/unit/vfx.application.service.spec.ts` covers independent processing/cache read, unsafe path rejection, missing VFX source policy diagnostics, cache-key invalidation contributors, and benchmark contract stages.
- `backend/test/unit/vfx.schemas.spec.ts` covers VFX API process/cache/benchmark schemas.
- `backend/test/unit/processing-jobs.application.service.spec.ts` covers VFX job lifecycle and asserts catalog placeable processing is not called.
- `backend/test/unit/processing-jobs.schemas.spec.ts` covers VFX job payload shape and rejects VFX options on non-VFX jobs.
- `backend/test/unit/auth.policy.spec.ts` covers the new VFX processing permissions.
- `npm run test:unit -- --runTestsByPath test/unit/vfx.application.service.spec.ts test/unit/vfx.schemas.spec.ts test/unit/processing-jobs.application.service.spec.ts test/unit/processing-jobs.schemas.spec.ts test/unit/auth.policy.spec.ts` passed, 36 tests.
- `npm run build` passed.

Blocked by:

- None. `VFX-P1`, `VFX-P3`, `VFX-P5`, `VFX-P7`, `VFX-P8`, `VFX-P9`, and `VFX-P10` are already `Done` with evidence in this checklist.

Notes:

- Cache invalidation is key-based: source policy hash, runtime-settings revision, HAK-list hash, selected table/resource hashes, dependency edge keys, selected resource hashes, and runtime options all contribute to the VFX output cache key. No placeable preview cache is reused.
- `process_vfx_runtime_package` requires `options.vfx.sourceTableText`; missing source input returns `VFX_JOB_SOURCE_TABLE_TEXT_REQUIRED` instead of borrowing catalog/placeable processing.
- Missing `sources.vfx` produces `VFX_INTEGRATION_VFX_SOURCE_POLICY_REQUIRED` diagnostics and a diagnostic-only package path; the service does not fall back to `sources.placeable`.
- Runtime/render package creation remains bounded to the P7/P8 contracts. This slice does not implement retail parity or any new frontend renderer behavior.

## VFX-P12: Retail And Parity Gate

Status: `Blocked`

Goal: promote selected behavior from implementation-grade to retail-parity-backed.

Required checklist:

- [x] Define final `retail-build.json` artifact format for capture packs.
- [x] Prepare repo-side capture fixture pack template.
- [x] Document operator steps for retail capture setup.
- [ ] Define final retail build/profile used for capture.
- [ ] Capture parser snapshot JSON for each fixture.
- [ ] Capture resolver trace for each fixture.
- [ ] Capture runtime tick dump for each fixture.
- [ ] Capture screenshot/video for each visual fixture.
- [ ] Capture script/effect context for each scripted fixture.
- [ ] Test `dm_visualeffect <row> <duration>` cases.
- [ ] Test scripted `EffectVisualEffect` cases.
- [ ] Test scripted `EffectBeam` cases.
- [ ] Test Explosion plus detonate.
- [ ] Test Fountain plus atlas playback.
- [ ] Test chunk particles.
- [ ] Test P2P gravity.
- [ ] Test Linked chain.
- [ ] Test Punch-Through versus mode `2`/Lighten candidate.
- [ ] Test PLT visual with known layer colors.
- [x] Document exact pass/fail/unknown result per fixture.

Tests to add or update:

- [x] Retail capture fixture manifest.
- [x] Retail capture template/helper tests.
- [ ] Differential comparison tests where deterministic.
- [ ] Screenshot/video references where visual-only.
- [x] Diagnostics for unresolved parity questions.

Acceptance:

- [x] A behavior is labelled canonical only if its fixture has source, resolver, runtime, and retail evidence.
- [x] Remaining unknowns stay diagnostic/preview-only.

Evidence:

- `backend/docs/aurora-reverse/vfx-retail-parity-fixtures.json` defines the retail parity fixture manifest and required case list for `dm_visualeffect <row> <duration>`, scripted `EffectVisualEffect`, scripted `EffectBeam`, Explosion plus detonate, Fountain plus atlas playback, chunk particles, P2P gravity, Linked chain, Punch-Through versus raw mode `2`/Lighten candidate, and PLT visual with known layer colors.
- Each manifest fixture contains the required evidence slots: retail build/profile, source table/profile/hash and row identity, effect constructor/context, parser snapshot, resolver trace, runtime tick dump, render contract snapshot, screenshot/video/capture reference, expected diagnostics, status, and canonical-blocking reason.
- `backend/src/modules/vfx/domain/aurora-vfx-retail-parity-gate.ts` adds the validation harness for manifest completeness, allowed statuses (`missing`, `captured`, `compared`, `passed`, `failed`, `unknown`), screenshot-alone rejection, and canonical gating.
- The gate result now reports per-fixture `missingEvidence`, per-fixture `nextActions`, and a manifest-level `missingEvidenceSummary`, so the next capture step is explicit instead of inferred from free-form diagnostics.
- The gate allows `canonical` only when a fixture status is `passed` and source, parser snapshot, resolver trace, runtime tick dump, render contract snapshot, retail build/profile, capture reference, and comparison evidence are all present.
- Current manifest cases are intentionally `missing` or `unknown` and `behaviorClaim: "diagnostic"` because no retail capture bundle is present in the repo.
- `backend/test/fixtures/vfx-retail/_template/` adds the repo-side capture pack template with `retail-build.json`, source/effect/parser/resolver/runtime/render/capture/comparison JSON placeholders, and explicit `TODO`/`null`/`missing` values instead of fake evidence.
- `backend/scripts/create-vfx-retail-fixture-pack.ts` copies the `_template` into a new fixture directory, refuses to overwrite existing packs, stamps the neutral `fixtureId`, and intentionally does not modify the manifest.
- `backend/test/fixtures/vfx-retail/vfx-retail-dm-visualeffect-row-68-duration-0/` prepares the first required fixture pack for `dm_visualeffect 68 0 / VFX_IMP_HEALING_M` with all required JSON files and fixture-specific source/effect context, but every retail-only artifact remains `missing`/`null`.
- `backend/docs/aurora-reverse/vfx-retail-parity-fixtures.json` records that `vfx-retail-dm-visualeffect-row-68-duration-0` has a repo-side pack prepared while keeping `status: "missing"`, `behaviorClaim: "diagnostic"`, and all parser/resolver/runtime/render/capture/comparison evidence refs empty.
- `backend/test/fixtures/vfx-retail/vfx-retail-scripted-effectvisualeffect-row-50/` prepares the scripted `EffectVisualEffect(VFX_IMP_DEATH)` fixture pack with all required JSON files and `effect-script.nss` harness instructions for `dm_runscript vfx_p12_row50`, but every retail-only artifact remains `missing`/`null`.
- `backend/docs/aurora-reverse/vfx-retail-parity-fixtures.json` records that `vfx-retail-scripted-effectvisualeffect-row-50` has a repo-side pack and NWScript harness prepared while keeping `status: "missing"`, `behaviorClaim: "diagnostic"`, and all parser/resolver/runtime/render/capture/comparison evidence refs empty.
- `backend/test/fixtures/vfx-retail/vfx-retail-scripted-effectbeam-row-210-body-chest/` prepares the scripted `EffectBeam(VFX_BEAM_FIRE, BODY_NODE_CHEST)` fixture pack with all required JSON files and `effect-beam-script.nss` harness instructions for `dm_runscript vfx_p12_beam210`; `capture.json` records the source/target visibility, endpoint framing, `BODY_NODE_CHEST`, and minimum 3-second capture requirements, but every retail-only artifact remains `missing`/`null`.
- `backend/docs/aurora-reverse/vfx-retail-parity-fixtures.json` records that `vfx-retail-scripted-effectbeam-row-210-body-chest` has a repo-side pack and NWScript harness prepared while keeping `status: "missing"`, `behaviorClaim: "diagnostic"`, and all parser/resolver/runtime/render/capture/comparison evidence refs empty.
- `backend/test/fixtures/vfx-retail/vfx-retail-explosion-detonate-fireball/` prepares the Explosion plus detonate fixture pack for `EffectVisualEffect(VFX_FNF_FIREBALL)` candidate row 22 with all required JSON files and `effect-fireball-script.nss` harness instructions for `dm_runscript vfx_p12_fireball22`; `capture.json` records the effect-start, detonate, explosion timing, particles-after-detonate, and pre/post detonate capture-window requirements, but every retail-only artifact remains `missing`/`null`.
- `backend/docs/aurora-reverse/vfx-retail-parity-fixtures.json` records that `vfx-retail-explosion-detonate-fireball` has a repo-side pack and NWScript harness prepared while keeping `status: "missing"`, `behaviorClaim: "diagnostic"`, and all parser/resolver/runtime/render/capture/comparison evidence refs empty.
- `backend/test/fixtures/vfx-retail/vfx-retail-fountain-atlas-cot-fx01/` prepares the Fountain plus atlas playback fixture pack for local `backend/tmp_cot_fx01.mdl` emitter `fire!03`; the pack records local model SHA-256, `Fountain`, `Billboard_to_World_Z`, texture `fxpa_smoke01`, `birthrate 5`, `lifeExp 5`, atlas `xgrid 4`, `ygrid 4`, `fps 10`, `framestart 0`, `frameend 24`, and `random 1`, but it remains source-only because no admitted retail row/context was found.
- `backend/docs/aurora-reverse/vfx-retail-parity-fixtures.json` records that `vfx-retail-fountain-atlas-cot-fx01` has a repo-side pack prepared while keeping `status: "unknown"`, `behaviorClaim: "diagnostic"`, source authority `localUntrackedMdlCandidate`, and all parser/resolver/runtime/render/capture/comparison evidence refs empty.
- `backend/docs/aurora-reverse/vfx-retail-capture-setup.md` defines the operator setup flow, final `retail-build.json` format, fixture directory naming, SHA-256 procedure, manifest update rules, gate commands, required 10-family checklist, and non-evidence list.
- `backend/docs/aurora-reverse/vfx-retail-parity-capture-handoff.md` defines the capture artifact layout, required artifact content, fixture families, capture steps, gate commands, and non-evidence list for the next retail-capture pass.
- `backend/docs/aurora-reverse/vfx-retail-capture-handoff.md` is the direct capture handoff for the retail operator, including per-case retail command/script seeds, artifact locations, status rules, and completion steps.
- `backend/scripts/validate-vfx-retail-parity.ts` runs the manifest gate outside Jest, prints missing evidence and next actions, and exits non-zero while any required fixture remains blocked.
- Local `C:\Projects` search found no retail/capture/parity artifact directory or files to attach to the manifest; only code/docs/tests/build output for the parity gate were present.
- `backend/test/unit/aurora-vfx-retail-parity-gate.spec.ts` covers manifest required-case completeness, blocked/missing retail captures, concrete missing-evidence/next-action output, canonical rejection without parser/resolver/runtime/retail evidence, fixtures without retail build/profile, allowed status values, and the rule that screenshot/video reference alone is not parity proof.
- `backend/test/unit/aurora-vfx-retail-capture-setup.spec.ts` covers required template files, parseable placeholder JSON, final retail-build metadata fields, helper pack creation, unsafe fixture id rejection, and overwrite refusal.
- `npm run test:unit -- --runTestsByPath test/unit/aurora-vfx-retail-parity-gate.spec.ts test/unit/aurora-vfx-retail-capture-setup.spec.ts` passed, 11 tests.
- `npx ts-node --transpile-only scripts/validate-vfx-retail-parity.ts` reports 10 blocked fixtures, zero canonical-allowed fixtures, and exits non-zero by design until captures are supplied.
- `npm run build` passed.
- P12-B validation: `npx ts-node --transpile-only scripts/validate-vfx-retail-parity.ts` still reports 10 blocked fixtures, zero canonical-allowed fixtures, and `vfx-retail-dm-visualeffect-row-68-duration-0` missing retail build/profile, parser snapshot, resolver trace, runtime dump, render snapshot, capture reference, and comparison evidence.
- P12-B test: `npm run test:unit -- --runTestsByPath test/unit/aurora-vfx-retail-parity-gate.spec.ts` passed, 6 tests.
- P12-B build: `npm run build` passed.
- P12-C validation: `npx ts-node --transpile-only scripts/validate-vfx-retail-parity.ts` still reports 10 blocked fixtures, zero canonical-allowed fixtures, and `vfx-retail-scripted-effectvisualeffect-row-50` missing retail build/profile, parser snapshot, resolver trace, runtime dump, render snapshot, capture reference, and comparison evidence.
- P12-C test: `npm run test:unit -- --runTestsByPath test/unit/aurora-vfx-retail-parity-gate.spec.ts` passed, 6 tests.
- P12-C build: `npm run build` passed.
- P12-D validation: `npx ts-node --transpile-only scripts/validate-vfx-retail-parity.ts` still reports 10 blocked fixtures, zero canonical-allowed fixtures, and `vfx-retail-scripted-effectbeam-row-210-body-chest` missing retail build/profile, parser snapshot, resolver trace, runtime dump, render snapshot, capture reference, and comparison evidence.
- P12-D test: `npm run test:unit -- --runTestsByPath test/unit/aurora-vfx-retail-parity-gate.spec.ts` passed, 6 tests.
- P12-D build: `npm run build` passed.
- P12-E validation: `npx ts-node --transpile-only scripts/validate-vfx-retail-parity.ts` still reports 10 blocked fixtures, zero canonical-allowed fixtures, and `vfx-retail-explosion-detonate-fireball` missing retail build/profile, parser snapshot, resolver trace, runtime dump, render snapshot, capture reference, and comparison evidence.
- P12-E test: `npm run test:unit -- --runTestsByPath test/unit/aurora-vfx-retail-parity-gate.spec.ts` passed, 6 tests.
- P12-E build: `npm run build` passed.
- P12-F validation: `npx ts-node --transpile-only scripts/validate-vfx-retail-parity.ts` still reports 10 blocked fixtures, zero canonical-allowed fixtures, and `vfx-retail-fountain-atlas-cot-fx01` missing retail build/profile, source row/profile/hash admission, parser snapshot, resolver trace, runtime dump, render snapshot, capture reference, and comparison evidence.
- P12-F test: `npm run test:unit -- --runTestsByPath test/unit/aurora-vfx-retail-parity-gate.spec.ts` passed, 6 tests.
- P12-F build: `npm run build` passed.

Blocked by:

- Retail client/capture environment is not available in this repo/session.
- Repo-side capture setup exists, but it is not retail evidence and does not unblock canonical parity.
- `vfx-retail-dm-visualeffect-row-68-duration-0` has fixture JSON scaffolding only; retail execution of `dm_visualeffect 68 0`, screenshot/video, retail build/profile, backend snapshots, hashes, and comparison JSON are still missing.
- `vfx-retail-scripted-effectvisualeffect-row-50` has fixture JSON scaffolding and an NWScript harness only; retail execution of `EffectVisualEffect(VFX_IMP_DEATH)`, screenshot/video, retail build/profile, backend snapshots, hashes, and comparison JSON are still missing.
- `vfx-retail-scripted-effectbeam-row-210-body-chest` has fixture JSON scaffolding and an NWScript harness only; retail execution of `EffectBeam(VFX_BEAM_FIRE, BODY_NODE_CHEST)`, visible source/target capture, BODY_NODE_CHEST anchor observation, screenshot/video, retail build/profile, backend snapshots, hashes, and comparison JSON are still missing.
- `vfx-retail-explosion-detonate-fireball` has fixture JSON scaffolding and an NWScript harness only; retail execution of `EffectVisualEffect(VFX_FNF_FIREBALL)` at location, detonate event timing, particles-after-detonate observation, screenshot/video, retail build/profile, backend snapshots, hashes, and comparison JSON are still missing.
- `vfx-retail-fountain-atlas-cot-fx01` has fixture JSON scaffolding and local `cot_fx01/fire!03` source facts only; an admitted retail row/context, selected retail resource provenance, texture/material/TXI hashes, several-seconds video capture, runtime atlas ticks, render snapshot, hashes, and comparison JSON are still missing.
- No parser snapshot JSON, resolver trace, runtime tick dump, render contract snapshot, screenshot/video capture, or comparison JSON has been captured for the manifest cases.
- Final retail build/profile must be selected before any fixture can move from `missing`/`unknown` to `captured` or `passed`.
- Manifest summary currently reports zero canonical-allowed fixtures; every fixture is missing at least retail build/profile, parser snapshot, resolver trace, runtime dump, render snapshot, capture reference, and comparison evidence, and several source-only family placeholders also need exact source row/profile admission.

Notes:

- This is the only track allowed to close exact visual/runtime semantics that require retail confirmation.
- `VFX-P10` and `VFX-P11` are `Done` with evidence, so the P12 harness could be prepared. P12 remains blocked because the actual retail evidence is absent.
- `VFX-P12-A` repo-side capture setup is complete, but the canonical gate still requires real retail artifacts before any fixture may move to `passed` or `behaviorClaim: "canonical"`.
- `VFX-P12-B` created the first fixture pack skeleton for row 68; it intentionally does not provide SHA-256 manifest evidence refs because placeholder JSON files are not retail capture artifacts.
- `VFX-P12-C` created the scripted `EffectVisualEffect` fixture pack skeleton for row 50 and the operator NWScript harness; it intentionally does not provide SHA-256 manifest evidence refs because placeholder JSON files and an unexecuted script are not retail capture artifacts.
- `VFX-P12-D` created the scripted `EffectBeam` fixture pack skeleton for row 210 and the operator NWScript harness; it intentionally does not provide SHA-256 manifest evidence refs because placeholder JSON files and an unexecuted beam script are not retail capture artifacts.
- `VFX-P12-E` created the Explosion plus detonate fixture pack skeleton for row 22 and the operator NWScript harness; it intentionally does not provide SHA-256 manifest evidence refs because placeholder JSON files and an unexecuted fireball script are not retail capture artifacts.
- `VFX-P12-F` created the Fountain plus atlas fixture pack skeleton for the local `cot_fx01/fire!03` MDL candidate; it intentionally keeps the fixture `MDL_EMITTER`/`source_only` because no retail row/context was found, and the local MDL hash is provenance only, not retail capture evidence.
- A screenshot/video path in the manifest is treated as useful capture metadata only; without parser snapshot, resolver trace, runtime dump, render snapshot, and comparison evidence it cannot pass the gate.
- Unknown cases remain diagnostic/preview-only and cannot be promoted by frontend renderer smoke tests, GLB preview, or Three.js material behavior.
- The handoff file should be updated together with the manifest if the eventual capture layout differs from the recommended `backend/test/fixtures/vfx-retail/<fixtureId>/` structure.

## Suggested PR Sequence

1. `PR-1`: `VFX-P0`, `VFX-P1`, and `VFX-P2` starter slice.
2. `PR-2`: `VFX-P3` for `visualeffects.2da` and `progfx.2da`.
3. `PR-3`: `VFX-P4` effect instance and phase schedule.
4. `PR-4`: `VFX-P5` dependency graph and resolver trace.
5. `PR-5`: `VFX-P9` frontend payload bridge and diagnostics UI.
6. `PR-6`: `VFX-P6` MDL emitter/light extraction.
7. `PR-7`: `VFX-P7` runtime state machine, Fountain first.
8. `PR-8`: `VFX-P8` render contract.
9. `PR-9`: `VFX-P11` API/jobs/cache/benchmark hardening.
10. `PR-10`: `VFX-P10` canonical renderer adapter.
11. `PR-11+`: `VFX-P12` retail-parity fixture gates.

## Per-PR Handoff Template

Copy this block into the PR description or next context handoff.

```md
## VFX Checklist Update

Tasks touched:
- `VFX-P?`

Checkboxes completed:
- [ ] ...

Tests run:
- ...

Evidence:
- ...

Diagnostics added/changed:
- ...

Preview/canonical boundary checked:
- [ ] Yes

Remaining blockers:
- ...

Notes for next context:
- ...
```
