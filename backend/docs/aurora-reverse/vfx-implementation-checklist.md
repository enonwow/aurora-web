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
| `VFX-P7` | Runtime state machine | Done | Codex | Aurora-backed Fountain/Single/Explosion/P2P/Lightning paths, chunk resource lifecycle, source-selected static WOK collision, and focused runtime diagnostics; retail family proofs remain under P12 |
| `VFX-P8` | Runtime render contract | Done | Codex | Renderer-agnostic particle draw contract + rotation/atlas/blend/chunk lane tests |
| `VFX-P9` | Frontend payload bridge | Done | Codex | Versioned frontend AuroraVfxPayload bridge + diagnostic inspector tests |
| `VFX-P10` | Frontend canonical renderer | Done | Codex | Separate Three canonical adapter for renderer-agnostic draw records, rotation, and routing tests |
| `VFX-P11` | API, jobs, cache, benchmark | Done | Codex | Backend `vfx` module with process/cache/benchmark API, VFX job task, cache-key invalidation inputs, observability, and focused tests |
| `VFX-P12` | Retail/parity gate | InProgress | Codex | Fixture manifest and canonical-evidence gate are in place; row-22/row-68 diagnostic NWN/Web refs now carry SHA-256 and implementation revision without satisfying canonical lanes; family proof packets remain open |

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
- [x] Implement Single max-one-active behavior through the shared Aurora reset path.
- [x] Implement Explosion detonate latch/burst behavior through the shared Aurora reset path.
- [x] Apply P2P target motion to the source update family before new Fountain emission.
- [x] Implement Lightning point-count reconciliation and missing-target active clear.
- [x] Track per-particle chunk model ownership, transform, and release without synthetic chunk particles.
- [x] Keep family-specific spawn gates separate.
- [x] Preserve detonate latch behavior for Explosion.
- [x] Preserve duplicate detonate callbacks in a separate trace while consuming one byte latch.
- [x] Expose ordered source/evaluation/event/update/render stages in `AuroraVfxTickTrace`.
- [x] Preserve zero/non-positive `lifeExp` draw gate without preview clamp.
- [x] Create collision queries only under the parsed `bounce` source bit; `splat` is not a second query family.
- [x] Keep one persistent per-emitter query-helper identity/init record and reset generation before every particle query.
- [x] Query pre-existing active particles after velocity/wind/P2P/mass motion and before new family emission.
- [x] Preserve typed current/predicted/test positions, velocity, delta, evaluated `bounce_co`, source flags, profile, requested classes, texture/chunk lane, model entry, and chunk extent.
- [x] Apply Aurora contact response only for a mapped `aurora-runtime-service`, beginning from the post-motion predicted particle position rather than an adapter hit point: normal reflection scaled by `bounce_co`, `0.005` normal nudge, `< 0.5` squared-speed landed decision, and additional `0.02` settled nudge.
- [x] Preserve the chunk endpoint/normal extent lane separately from textured particles.
- [x] Reset landed/contact state on particle activation and carry landed contact normal into the render contract.
- [x] Apply `splat` only when both source `splat` and particle landed state are true, using end-size and the contact-normal render plane rather than a decal.
- [x] Refuse profile-gated/preview collision adapters as canonical runtime mutation.
- [x] Preserve the exact catalog source-MDL replay command so scene instances can
  rerun the backend runtime without reconstructing emitter semantics in Three.
- [x] Select source-precedence module/HAK/vanilla ASCII WOK resources for area
  tile models and deduplicate geometry across tile instances.
- [x] Place WOK instances at Aurora tile centers with ARE height and
  `4 - Tile_Orientation` handling: `(col+0.5,row+0.5,height)*10`.
- [x] Transform object-local collision queries through GIT placement, bearing,
  VisualTransform offset/rotation/non-uniform scale, and map contacts back.
- [x] Replay only source `bounce=true` emitters through the backend area WOK
  service; deduplicate identical scene requests and replace canonical frames.
- [x] Build persistent-AOE visual owners from `NUMACT01..03` rather than
  looping one model at the AOE origin.
- [x] Preserve per-group persistent-AOE initial delays, duration timers,
  edge-weight placement, and `impact -> duration -> cessation -> reposition`
  lifecycle.
- [x] Carry persistent-AOE owner identity, group, position, cycle, and phase
  through the backend/frontend contract and expose deduplicated owner telemetry.
- [x] Stop persistent-AOE births after release and drive existing owners through
  cessation before post-removal.

Tests to add or update:

- [x] Deterministic tick advances particle age.
- [x] Expired particles are removed/recycled.
- [x] Fountain positive birthrate gate.
- [x] Fountain zero/non-positive `lifeExp` emits draw-gate/no-preview-clamp diagnostics.
- [x] Fountain zero/non-positive `birthrate` emits gate diagnostics and does not spawn.
- [x] Fountain normal bursts use native x87 truncate-toward-zero count and modulo semantics before resetting the accumulator.
- [x] Fountain Trail uses native truncated distance count, empty-list segment-start placement, spacing, and residual carry.
- [x] Single does not share Fountain accumulation and does not allocate duplicate active particles.
- [x] Explosion requires detonate event.
- [x] Explosion without detonate emits no fallback burst.
- [x] P2P missing target pointer diagnostic.
- [x] Lightning missing target clears/blocks active particles.
- [x] Bounce requires collision context only for pre-existing active particles; `splat` alone creates no query.
- [x] Bounce query helper reset and stale-result prevention.
- [x] Settled and non-settled reflection/nudge thresholds.
- [x] Texture/chunk collision lane split and chunk extent nudge.
- [x] Profile-gated collision adapter cannot mutate canonical particle state.
- [x] Landed `splat` uses end-size and contact-normal renderer basis.
- [x] Persistent-AOE row 0 builds `5 + 10 + 5 = 20` visual owners with the
  recovered initial-delay formulas.
- [x] Persistent-AOE owner phases and stop behavior are deterministic and
  renderer-independent.
- [x] Canonical lazy frame materialization preserves all 20 owner identities
  and materializes only the selected runtime frame.

Acceptance:

- [x] Runtime can produce state snapshots without frontend renderer.
- [x] Runtime tests do not depend on GLB, Three.js, or screenshots.

Evidence:

- `backend/src/modules/vfx/domain/aurora-vfx-runtime-state.ts:124` defines `AuroraEmitterRuntimeState`; `:225` and `:233` expose deterministic tick APIs; `:295` builds renderer-free snapshots.
- `backend/src/modules/vfx/domain/aurora-vfx-runtime-state.ts` implements the four Aurora constructor families, applies P2P as source particle motion rather than a synthetic update family, and refuses standalone Chunk placeholder emission.
- `backend/src/modules/vfx/domain/aurora-vfx-runtime-state.ts` implements the typed collision request/result, persistent helper reset generation, post-motion query order, mapped-service gate, Aurora reflection/nudge/settled math, texture/chunk split, landed state, and splat end-size gate from `decompiled_all.c:852744-852803`, `853379-853483`, and `854870-855135`.
- `backend/src/modules/vfx/domain/aurora-vfx-render-contract.ts` and `frontend/src/modules/layout/adapters/three/auroraVfxCanonicalRenderer.ts` carry landed/contact-normal/splat state and build the landed contact plane before ordinary render-mode billboard selection.
- 2026-07-16 scene-runtime update: `module-snapshot-area.repository.ts` emits
  `aurora-area-vfx-collision/v1`; `aurora-vfx-area-collision.ts` maps full object
  transforms around the existing Aurora static WOK service; catalog payloads
  preserve `runtimeReplayCommand`; and `auroraVfxSceneRuntime.ts` performs one
  deduplicated backend replay per area/object/source command. Focused backend
  verification passed `195/195`, focused frontend scene-runtime/payload tests
  passed `157/157`, and both production builds passed. This is implementation and
  source-contract evidence, not matched NWN visual parity proof.
- 2026-06-17 implementation update: `backend/src/modules/vfx/domain/aurora-vfx-runtime-state.ts` now uses the Aurora rand15 sequence from the decompiled `FUN_00b90fe8` (`seed * 0x15a4e35 + 1`, `(seed >> 16) & 0x7fff`), normal Fountain spawn thresholds reset on the `1 / birthrate` period, and `spawnType: 1` Fountain trail emission carries source-position residual distance between ticks.
- 2026-06-17 particleRot update: `backend/src/modules/vfx/domain/aurora-vfx-runtime-state.ts` now stores per-particle `rotationRadians`, starts spawned particles at `0`, advances active particles from parsed `particleRot` after converting it to radians/sec, and wraps at Aurora's `+-2pi` boundary matching the decompiled active-particle loop that updates particle offset `0x14` from emitter offset `0xa0`.
- `backend/test/unit/aurora-vfx-runtime-state.spec.ts:10`, `:54`, `:90`, `:103`, `:119`, `:135`, `:149`, `:177`, `:189`, `:237`, and `:261` cover deterministic ticks, recycling, Fountain gates, diagnostic placeholders, collision context, and backend-only boundaries.
- `npm.cmd run test:unit -- --runTestsByPath test/unit/aurora-vfx-runtime-state.spec.ts` passed, 13 tests.
- 2026-06-17 verification: `npm run test:unit -- aurora-vfx-runtime-state.spec.ts` passed 23 tests; `npm run test:unit -- aurora-vfx` passed 129 tests; `npm run build` passed.
- 2026-06-17 particleRot verification: `npm run test:unit -- aurora-vfx-runtime-state.spec.ts aurora-vfx-render-contract.spec.ts` passed 38 tests; `npm run build` passed.
- 2026-07-14 Aurora-first update: shared lifetime expiry now checks evaluated `lifeExp` before adding the current delta; negative lifetime is not clamped or expired; supported source tokens select an explicit family while an unrecognized token remains `Unknown` and cannot fall back to Lightning; `chunkName` remains a particle render/resource lane independent of update family.
- 2026-07-14 verification: focused runtime/render-contract tests passed `85/85`; runtime tick diagnostics passed `11/11`; chunk render-contract diagnostics passed `1/1`; backend build passed. Diagnostics are implementation evidence, not visual parity proof.
- 2026-07-14 tick-order update: runtime state now preserves duplicate model-event callbacks in `detonateCallbackTrace` while `processedDetonateEventKeys` remains the unique latch guard. Every sequential tick also emits `AuroraVfxTickTrace` with source snapshot, evaluated snapshot, event scan, callback writes, family update, post-update state, and render input in the recovered Aurora order.
- 2026-07-14 tick-order verification: focused application/schema/runtime/render-contract tests passed `118/118`; backend TypeScript passed. Canonical workspace routing passed `11/11` and legacy non-canonical preview routing passed `123/123` without adding a preview overlay to canonical payloads.
- 2026-07-14 collision correction: removed the synthetic separate `splat` query, moved bounce after complete pre-emission motion, implemented the persistent query-helper trace and source-backed post-hit math, preserved chunk extent/model state, and added landed-splat end-size/contact-normal rendering. No Three.js raycast is promoted as Aurora parity.
- 2026-07-15 collision position correction: the runtime no longer teleports a particle to an optional collision-adapter `hitPosition`. The mapped native branch at `decompiled_all.c:855047-855135` keeps the predicted post-motion position and applies the `0.005`, optional settled `0.02`, and Chunk extent normal nudges from there; runtime results expose `postNudgeBasePositionSource: "predicted_position"`.
- 2026-07-15 WOK reconstruction: `backend/src/modules/vfx/domain/aurora-wok-walkmesh.ts` preserves retail ASCII WOK nodes, positions, orientations, vertices, faces, and AABB rows. The area adapter applies node axis-angle, node translation, ARE `4 - Tile_Orientation`, and area translation in that order. `node aabb` reuses the common node/orientation parser at `decompiled_all.c:885132-885145` and `882890-882898`; only a non-zero angle with a zero-length axis remains unsupported. The flat triangle contact route is implementation-complete for the row-22 retail area profile; exact native AABB/BSP acceleration and a rotated-node retail contact oracle remain general parity items, not execution blockers.
- 2026-07-15 VFX helper selection: emitter setup `FUN_00a28a9c` at `decompiled_all.c:853475-853486` constructs the query helper with first argument `1`. Shared area query `FUN_00a7b8bc` at `906871-906915` enters dynamic traversal only when that stored field is `0`. Therefore a static miss for this VFX profile is native `noHit`; it is not an unresolved dynamic fallback. Row 22 records `1200` queries, `123` applied hits, `1077` static no-hits, and landed Chunk particle ids `2,3,4,5,7,8`.
- 2026-07-15 verification: after general node-orientation support, focused WOK/runtime/application tests passed `111/111`; backend build passed. Row22 was not recaptured because its selected WOK node orientation is zero and the implementation change does not affect that fixture.
- 2026-07-15/16 Fountain scheduler correction: direct disassembly of the exact `nwtoolset.exe` binary closes the C-export FPU ambiguity. Helper `0x00b908cc` temporarily selects x87 truncate-toward-zero, so normal spawn count is `TRUNC(accumulator * birthrate) % (TRUNC(birthrate) + 1)` and Trail count is `TRUNC(distance * birthrate)`. The first particle on an empty Trail list is placed at the segment start and later particles use spacing steps. The integer row-68 rates retain v10 maxima `68/24/64/45`; fractional boundary tests now enforce truncation.
- 2026-07-15 Fountain verification: runtime tests passed `73/73`, backend build passed, focused frontend proof/renderer tests passed `53/53`, and `validated-summary-v10.json` reports a valid one-playback Web proof with all emitters ending at zero. This is implementation and comparison evidence, not a canonical parity promotion.
- 2026-07-16 Chunk scheduler correction: `FUN_00a28a38` and exact Toolset disassembly prove that each live Chunk model starts animation `impact` once at particle activation with rate `1.0` and raw trailing arguments `1,0`. The render contract transports those values; the canonical renderer attaches only a matching `impact` child payload and seeks it from particle age. A generic child payload is rejected. Focused verification passed backend `31/31` and frontend `44/44`.
- 2026-07-16 Single/Lightning source correction: `Single` uses the same truncate helper for its active gate, destroys an inactive particle without returning it to the emitter pool, and does not apply ordinary velocity after its selected P2P updater. `Lightning` preserves fixed point identities across lifetime, increments its delay timer before branch selection, uses rotation-only cache transforms, and writes the current cache only in the delay branch. Rebuild uses normalized `(first-last)`, perpendicular `(-y,z,-x)`, its cross product, recursive radius modulus `TRUNC(radius*100)`, and scale-pass modulus `TRUNC((length/count*0.5)*100)`. `lightningScale` no longer overwrites particle size/color. Focused VFX verification passed `262/262`; backend build passed. Evidence: `evidence/vfx-single-lightning-2026-07-16/aurora-single-lightning-source-contract.json`.
- 2026-07-18 atlas checkpoint correction: the runtime follows `decompiled_all.c:856638-856685` by advancing at most one atlas frame after a checkpoint threshold and writing the current particle age as the new checkpoint, dropping overshoot. Ascending and descending ranges are regression-tested. Row-22 MainExplode now reaches frame 15 and expires without a terminal frame-0 wrap.
- 2026-07-18 Chunk child correction: `smoke04` remains the original parsed child emitter from `fx_rockchunksml.mdl`. For children without `inherit`, `inheritLocal`, or `inheritPart`, the renderer reconstructs particle birth-world transforms from per-playback Chunk history; historical smoke no longer follows the current Chunk position. Standard non-custom packed-gamma particle colors now enter the linear Three scene lane, while raw additive source values remain unchanged.
- 2026-07-19 persistent-AOE correction: static retail client/server
  decompilation in `vfx-persistent-aoe-runtime-audit-2026-07-19.md` proves that
  `vfx_persistent.2da#0` owns 20 independently scheduled visual models, not one
  looping model at the origin. `aurora-vfx-aoe-visual-runtime.ts` implements
  the recovered group counts, initial delays, edge/interior placement,
  impact/duration/cessation lifecycle, repositioning, and stop contract.
  Backend packaging expands the two `vps_fogacid` source emitters into 40
  owner-scoped runtime emitters; the canonical renderer exposes 20 deduplicated
  owners and uses lazy selected-frame materialization for the 81-frame proof.
  Focused backend tests passed `58/58`, frontend tests passed `62/62`, and both
  production builds passed.
- 2026-07-19 persistent-AOE proof: one fresh, non-looping Web playback is saved
  as
  `evidence/vfx-nwn-broad-proof-2026-07-16/aoe0/web/aurora-web-aoe0-one-trigger-native-20-owner-v4-20260719.mp4`.
  It is compared with the preserved, validated one-trigger NWN oracle without
  relaunching NWN. The machine-readable verdict is
  `aoe0/comparisons/native-20-owner-comparison-validation-20260719.json`:
  `matched-with-open-scene-material-gaps`. Ownership and broad footprint are
  closed; exact retail RNG, walkmesh grounding, sound, scene/occlusion and
  material response remain explicit non-parity items. No xoreos material was
  used.
- 2026-08-07 persistent-AOE proof-scene correction, superseded for tile
  coverage on 2026-08-13: `vfx-broad-aoe0` reads the exact immutable
  proof-module ARE/GIT source pack and now follows the packed module HAK list,
  admitting all four tiles and source-backed tile lights while still omitting
  unavailable source/target actors. The proof camera is fitted from seven
  saved-retail origin/table correspondences at `6.499439491 px` RMS. Static
  preflight passes with 20 owners and 40 owner-scoped emitter instances. The
  non-playback deterministic v87 timeline and its onset-aligned preserved-NWN
  comparison are recorded under `aoe0/aurora-web` and `aoe0/comparisons`.
  Source `Normal` blending and complementary `Ring01`/`Ring02` alpha lanes do
  not support an RGBA override. Exact RNG, floor grounding, full scene, actors,
  sound, retail camera, and lighting remain explicit parity gaps. No xoreos
  source was used.
- 2026-08-13 exact proof-scene HAK precedence closure: row 44, row 50, and
  AOE0 now resolve the exact modules' 59-entry ordered HAK lists. Selected
  `q_tilesets.hak` SHA-256 is
  `9ba5addfc0999d5c6788869f4da4b30505b7b6679570ced634c3e5abd9e745bd`;
  its exact `tin01.set` maps tile 364 to `gin01_h01_08`. All three fixtures
  report 4/4 source tiles and zero unresolved tile indexes; source-scene and
  comparison-context regressions pass. Detailed audit:
  `vfx-proof-scene-hak-precedence-closure-audit-2026-08-13.md`.
- 2026-08-13 row-50 current context/proof v16: row 50 now uses the exact 4/4
  HAK-backed scene and the shared saved-script longitudinal camera fit at
  approximately `2.289 px` RMS. One fresh Web playback records one trigger,
  no loop/overlap, a clean post state, and every observability gate PASS; MP4
  SHA-256 is
  `8d5b5ac98b2ae71555073d4591fc3be314d1a31c0fae89f24e6b1a1e796bc981`.
  The saved NWN MP4 was reused without rerun. Comparison SHA-256 is
  `63f34618efb6c1c4234d36ca31d2a0083b8b0fc322b876cc2916fb137b839c26`.
  Retail still has a taller translucent body column; Web remains wider,
  lower, and more compact/saturated. Status is `matched-with-gaps`.
  Detailed audit: `vfx-row50-proof-camera-source-audit-2026-08-13.md`.
- 2026-08-13 shared source-MDL emitter orientation correction: the canonical
  renderer already applied the reflected orientation contract, but the
  placeable/catalog preview path mapped axis-angle as `C*axis`. Because
  `C=(x,z,y)` is a reflection, the correct axis is `-C*axis`. One shared
  helper now serves static and animated emitter transforms with no row/model
  conditions. The red regression observed `[1,0,0]` instead of `[-1,0,0]`;
  the complete VFX render-mode file now passes `124/124`. Detailed audit:
  `vfx-placeable-emitter-reflected-orientation-audit-2026-08-13.md`.

Blocked by:

- None. `VFX-P4` and `VFX-P6` are already `Done` with evidence in this checklist.

Notes:

- Real runtime update implemented in this slice: Fountain normal period spawning, Fountain trail distance/residual spawning, Aurora rand15 jitter source, and source-backed `particleRot` angle advancement.
- Single, Explosion, P2P motion, the complete source-backed Lightning point scheduler, and chunk resource lifecycle are implemented from Aurora anchors. Retail visual parity remains open under P12 and is not inferred from focused tests.
- No standalone Chunk update exists in Aurora. A `chunkName` particle follows its source update family and carries an independent model resource lifecycle.
- The legacy placeable preview remains only as the explicitly non-canonical UX adapter permitted by the source-readiness contract. Canonical payload routing is mutually exclusive and does not run that particle simulator.

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
- [x] Apply `default_cull_lane` as front-face culling and disable culling only for emitter `twosidedtex`.
- [x] Track shader variant lane.
- [x] Track renderorder comparison.
- [x] Track per-particle atlas UV.
- [x] Track atlas row-major mapping.
- [x] Track atlas random reset path.
- [x] Track linked-particle draw count as active minus one, preserve active-list order, and carry the next active particle position as the segment endpoint on every draw record.
- [x] Preserve exact non-punch GL blend factors from the admitted `nwtoolset.exe` disassembly; Punch-Through records that the blend wrapper is not invoked.
- [x] Preserve PLT texture identity and require target palette rows/profile/provenance before exposing a ready PLT render context.

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
- [x] Linked particles active-minus-one draw count, active-list ordering, and one six-vertex segment per endpoint-bearing draw record.
- [x] Two overlapping emitters with different `renderorder`.
- [x] Final Three draw queues consume camera depth before `renderorder` and use
  the signed short only for the same non-empty scene-instance context.
- [x] Canonical textured and Chunk meshes carry a versioned Aurora draw-queue
  record; `Object3D.renderOrder` is no longer the emitter-short source truth.
- [x] Chunk particles do not use canonical textured quad lane.
- [x] PLT without target context remains diagnostic and never receives guessed palette rows.
- [x] Tests do not depend on Three.js, GLB, screenshots, or frontend code.

Acceptance:

- [x] Render contract is renderer-agnostic.
- [x] Three.js material settings remain adapter details, not source truth.

Evidence:

- `backend/src/modules/vfx/domain/aurora-vfx-render-contract.ts:89` defines `AuroraParticleDrawRecord`; `:135` defines the versioned renderer-agnostic runtime render contract.
- `backend/src/modules/vfx/domain/aurora-vfx-render-contract.ts:183` builds draw contracts from `AuroraEmitterRuntimeState`; `:328` builds per-particle records; `:359` maps atlas frame state to per-particle UVs.
- 2026-06-17 particleRot update: draw records now carry runtime `rotationRadians` from `AuroraParticleRuntimeRecord` so adapters consume the runtime angle instead of recomputing a frontend-only preview angle.
- `backend/src/modules/vfx/domain/aurora-vfx-render-contract.ts` preserves chunk-model lane diagnostics and records `renderorder` as a signed 16-bit value. `FUN_00a7fb8c` confirms lower `renderorder` first only when depth and referenced-object keys tie. `frontend/src/modules/layout/adapters/three/auroraVfxRenderQueue.ts` now installs opaque and transparent comparators with Three camera depth as the primary key, scene-instance identity as the contextual key, and the signed source short only as the final tie-break. Canonical meshes keep `Object3D.renderOrder=0`.
- Render-queue verification on 2026-07-16: focused canonical/queue/placeable/dev suites pass `191/191`; frontend production build passes. `auroraVfxRenderQueue.test.ts` separately proves depth precedence, signed-short ordering, no cross-context relation, cross-lane fallback, and both renderer-list installations. This is source/contract proof, not matched visual parity.
- 2026-07-14 Linked correction: the render contract now resolves particles in `activeParticleIds` order and carries `linkedNextParticleId` plus `linkedNextPosition`. The canonical adapter emits one six-vertex segment for each draw record, matching Aurora's `activeCount - 1` loop and next-active-particle read at `decompiled_all.c:856418-856494`; it no longer subtracts one a second time.
- Linked correction verification: focused backend VFX suites `118/118`, focused frontend canonical/routing/dev-fixture suites `175/175`, and backend build passed. Frontend typecheck still reports only the existing area, creature-wizard, and `workspaceObjectMeshLayer` errors, with no error in the changed canonical renderer or fixture payload.
- `backend/src/modules/vfx/domain/aurora-vfx-render-contract.ts` maps draw-wrapper argument `3` through the recovered `DAT_00cc996c` table to `GL_TRIANGLES` (`0x0004`) and preserves the non-indexed `glDrawArrays(0, activeCount * 6)` route. It also carries the recovered blend-table indices and GL enums for buckets `0` and `2` from `source-mdl-placeable-emitter-blend-parity-2026-07-11.md`.
- `backend/test/unit/aurora-vfx-render-contract.spec.ts:14`, `:45`, `:66`, `:87`, `:115`, `:136`, `:163`, `:184`, `:203`, `:227`, `:245`, and `:277` cover counts, non-indexed route, atlas mapping, random reset, invalid ranges, blend/render lanes, renderorder, chunk, and backend-only boundaries.
- 2026-07-14 verification: `npm run test:unit -- --runInBand test/unit/aurora-vfx-render-contract.spec.ts` passed `22/22`; canonical renderer passed `26/26`; runtime render-contract diagnostics passed `1/1` with `canonicalPromotionAttemptCount: 0`; backend build passed.
- 2026-07-15 PLT contract update: the MDL parser preserves `textureRaw` including `.plt`; dependency selection also recognizes a selected `.plt` candidate when the authored token is extensionless. `AuroraVfxPltRenderContext` carries target palette rows, EE profile, provenance, and the recovered `vs_pltgen`/`fs_pltgen` plus `PLTscheme[%d]` 15-slot lane. Missing target context emits `VFX_PLT_TARGET_CONTEXT_REQUIRED` instead of substituting colors. Focused parser/dependency/render-contract verification passed `58/58`; backend build passed.

### VFX-P8.1: Emitter and MTR material boundary

Status: `In progress`

- [x] Keep emitter `twosidedtex` on the native state-3 cull lane.
- [x] Stop canonical particle materials from defaulting to `DoubleSide`.
- [x] Parse MTR `sample_framebuffer` and `volumetric` into material-owned state.
- [x] Carry MTR framebuffer/volumetric state through backend and frontend contracts and execute source-ordered WebGL runtime lanes 5/6 only for a complete SHD graph.
- [x] Require explicit `AuroraVfxMaterialSourceState { source: "aurora-mtr" }` before material transparency, sidedness, framebuffer, or volumetric fields affect the VFX render contract.
- [x] Diagnose material-only fields found on `node emitter` with `VFX_MTR_FIELDS_ON_EMITTER_SOURCE_IGNORED`.
- [x] Resolve the selected emitter material/MTR dependency by exact basename and feed that parsed state into every `buildAuroraVfxRuntimeRenderContract` frame without arbitrary fallback.
- [x] Preserve the native mode-2 front face while applying reflective `C=(x,z,y)` by reversing only the mapped source X/Y quad winding.
- [x] Recover the lane-5/6 `mainscene` framebuffer pass: active source slot, destination slots 1/6, attachment mask 3, and color/depth texture units 11/12.
- [x] Resolve and transport custom MTR shader roots plus their recursive reachable SHD `#include` graph without substituting a generic Three shader.
- [x] Refuse generic material substitution for lane-5/6 or a custom MTR program; execute only when the exact source graph and required sampler inputs are available.
- [x] Implement the custom material-program adapter from the recovered renderer profile, complete SHD graph, native attribute semantics, named uniform lookup, authored-parameter order, and material-program rebind callsite; keep retail parity false until browser compile/render and matched visual proof pass.
- [x] Implement the ordered browser framebuffer pass: base `mainscene`, lane 5 snapshot, lane 6 snapshot, then bloom, using separate color/depth targets and one stable source frame across repeated scene draws.
- [x] Parse and transport MTR `bumpmaptexture`, `bumpyshinytexture`, `envmaptexture`, and `bumpreplacementtexture` through placeable and VFX material state.
- [x] Bind confirmed `bumpmaptexture`/`envmaptexture` inputs before custom-program installation; preserve `bumpyshinytexture`/`bumpreplacementtexture` without guessing their runtime role.
- [x] Refuse an `ENVIRONMENT_MAP 1` program when no source environment sampler is resolved; keep 2D and cube sampler bindings type-separated.
- [x] Keep Punch-Through canonical geometry disabled until its runtime `fAlphaDiscardValue` write/value is recovered.
- [x] Recover `fAlphaDiscardValue` as `0.2` for renderer state bit 1, carry the exact lane/value in the backend contract, and render Punch-Through only when that complete source-backed contract is present.

Evidence:

- Emitter `twosidedtex`: `decompiled_all.c:856018-856023`.
- MTR parser ownership: `decompiled_all.c:868848-868873`.
- MTR runtime lane classification: `decompiled_all.c:908278-908329`, `908377-908441`.
- Toolset framebuffer pass: `nwtoolset.exe:0x00a21ba4-0x00a21cdf`, `0x00a82947-0x00a82985`, and `0x00a82b12-0x00a82b60` in the admitted SHA-256 `4c156de898817518e8a97f5d989592894d3c8f48b71d27e2a8b89500cd230f24` binary.
- `backend/scripts/audit-retail-material-framebuffer.ts` reproduces the PE/KEY/BIF audit. Its JSON artifact records seven retail MTRs, six shader roots, twelve reachable SHD resources, `73419` source bytes, and zero unresolved includes.
- The catalog resolver loads SHD type `2069` on demand, recursively follows reachable includes, and transports `aurora-shader-program-source/v1`; the VFX contract reports graph readiness separately from `VFX_MTR_CUSTOM_SHADER_PROGRAM_EXECUTION_REQUIRED`.
- `FUN_00a707a8` binds native attribute slots `vPos=0`, `vTcIn=1`, `vColor=2`, `vCustomColor=3`, `vTangent=4`, `fHandedness=5`, `vStaticLightDir=6`, `vNormal=7`, `vIndex=8`, `vWeight=9`, `fProjectionFrontal=10`, and `vTcIn1..3=11..13`; uniforms are resolved by name after link. `FUN_00a45a0c` uploads authored parameters after `FUN_00a45b3c` rebinds the selected program variant.
- `frontend/src/modules/placeables/adapters/three/auroraMtrCustomShaderProgram.ts` installs complete SHD programs with the recovered Toolset profile, Punch/non-Punch `NO_DISCARD` selection, same-named geometry inputs/uniforms, matrix/camera/fog/light/texture state, MTR parameters in source order, and explicit texture slots `0..15`. Framebuffer programs are tagged for lane 5/6 and receive color/depth snapshots on units 11/12. It still refuses incomplete graphs, geometry shaders, unsupported skinned binding, and required environment samplers without a source texture. Three resolves numeric WebGL locations by active attribute name, so native slot numbers remain audit provenance rather than a false binary-location claim.
- Native environment bindings are separate: `texUnitEnvCube`/`texEnvCubeBound` and `texUnitEnv`/`texEnvBound` are initialized at `decompiled_all.c:899896-899901` and refreshed from bound texture-slot state from `901956`. Production code supplies no generated fallback sampler.
- The canonical renderer emits `VFX_CANONICAL_MTR_CUSTOM_PROGRAM_EXECUTED` only for this complete installed path; otherwise it retains an explicit refusal. The old filename heuristic that forced `tti01_iceclear`/`fslit_sm` to opacity zero has been removed.
- Verification on 2026-07-16: focused custom-program/framebuffer/canonical/material suites pass `93/93`; focused backend render/parser/parity/WOK suites pass `104/104`; the visual-correlation runner self-test passes; backend build and frontend `tsc --noEmit` pass.
- 2026-07-16 `worldtimerTimeOfDay` closure: the approved Toolset binary reads `DAT_00ccc068` at `0x00a736e5` but has no writer beyond zero initialization, so Toolset preview time is static. Audited retail `nwmain.exe` SHA-256 `3B7CB1252E0EDB2CE22D7971F333AADE027039AE30A45B4BC64732C3E6BEC73A` calls `CWorldTimer` at `0x1400bbff6`, stores the returned time-of-day at `0x1400bbfff`, and uploads it at `0x1400b88c2-0x1400b88d2`. `0x140597180-0x140597223` proves millisecond units; `0x140597850-0x140597872` proves `dayLengthMs = Mod_MinPerHour * 1,440,000` and clamps zero minutes to one. Production Area contracts now hash `module.ifo`, seed from `Mod_StartHour`, advance by scene animation delta, wrap at the native period, and upload the integer tick without using absolute `performance.now()` as source truth. Focused backend verification passed `198/198`, focused frontend verification passed `160/160`, and both production builds passed. Matched flowmap visual proof remains open.
- Real-browser probe v2 executes the retail `oldf_head` SHD graph through `RawShaderMaterial`: one linked program, zero compile messages, `glError=0`, and `292990` changed pixels. Its environment sampler is generated diagnostics (`diagnostic-data-texture-not-retail-oracle`), and `webgl-oldf-head-retail-source-compile-probe-v2.json` keeps `retailVisualParity: false`. This closes compile/render execution only, not matched NWN/Aurora visual proof.
- Row-68 Web v11 was recorded once after the cull/winding repair and validated without rerun: one playback, no loop/overlap, all emitters finish at zero. The retained NWN MP4 was reused. `nwn-vs-aurora-web-row68-comparison-v6.json` reports Web `1.450636` seconds versus NWN `1.416667`, delta `+0.033969` seconds, timing aligned within one NWN frame, with camera/target spatial normalization still open.

Blocked by:

- None. Remaining P7 proof work does not prevent source-backed P8 contract corrections.

Notes:

- Render contract is backend/domain-level and does not import frontend, Three.js, GLB preview, `SpriteMaterial`, or `ShaderMaterial`.
- `Normal`, `Punch-Through`, and raw/mode `2` buckets are preserved. Bucket `0` records `GL_SRC_ALPHA/GL_ONE_MINUS_SRC_ALPHA`; bucket `2` records `GL_SRC_ALPHA/GL_ONE`; Punch-Through records the separate no-blend-wrapper branch. Raw bucket-2 tokens are preserved and are not all renamed to `Lighten`.
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
- [x] Route ready PLT contracts through target-palette-specific decoding/cache keys and keep incomplete/conflicting contexts on a diagnostic placeholder.
- [x] Apply the recovered Punch-Through `fAlphaDiscardValue=0.2` contract with opaque cutout/depth-write semantics; continue refusing stale or incomplete Punch payloads and never restore the legacy guessed `0.5` cutoff.

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
- [x] Ready, missing, and conflicting PLT target-context tests.
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
- 2026-07-15 native Motion-Blur update: mode 6 now follows `FUN_00a2e250` at `decompiled_all.c:856331-856417` and `856701-856765`: the segment is projected into camera right/up, total width is `2 * sizeX`, endpoint cap extension is `sizeY / 4`, and previous-end vertices receive the recovered length-dependent alpha. Previous-position interpolation was retained because it already matches `FUN_00a31288:856961-856981`. Focused canonical-renderer verification passed `36/36`.
- 2026-07-15 PLT adapter update: `auroraVfxCanonicalRenderer.ts` validates the backend PLT shader/context record and refuses missing or conflicting target palettes. `workspaceObjectMeshLayer.ts` passes ready rows into `ensurePlaceableTexture`; `placeableThreeAssetLoader.ts` isolates decoded PLT textures by a deterministic `plt-rows` cache suffix. Missing context does not decode or bind a grayscale/default texture. Focused renderer/workspace/texture-loader verification passed `91/91`. `auroraVfxCanonicalPltRetailParityProof` remains `false`.
- 2026-07-15 Punch-Through implementation update: static PE disassembly maps uniform name `fAlphaDiscardValue` to program field `+0xb64` at `nwtoolset.exe:0x00a70f76`, then maps renderer state bit 1 to scalar upload `0.2f` enabled / `-1.0f` disabled at `0x00a744b1-0x00a744d8` with literals at `0x00a74fc4`. Punch mode 1 selects the active-discard shader variant; non-punch selects the compiled-out variant. Backend contracts now carry lane `punch_through_runtime_uniform_0_2`, value `0.2`, and binary provenance. The canonical renderer applies `transparent=false`, `depthWrite=true`, and `alphaTest=0.2` only for that exact contract; incomplete payloads retain the refusal diagnostic. Verification: backend `170/170`, frontend `222/222`, canonical renderer `41/41`, backend build passed. Matched Punch retail/Web visual proof remains open under P12.
- 2026-07-16 Chunk model material correction: renderer initialization `FUN_00a72894`, ordinary mesh draw `FUN_00a5e54c`, and depth-mask branch `FUN_00a471d0` close the default lit/cull/depth lane. `fxpa_dirt.txi` has no overriding directive. MDL-to-GLB converter v14 removes the false `KHR_materials_unlit` and unconditional `doubleSided=true` defaults; the exact row-22 `fx_rockchunksml.glb` fixture was regenerated as lit and single-sided. Converter verification passed `26/26`. Broader custom model material branches and matched visual proof remain under P12.
- 2026-07-19 exact particle-texture binding correction: active retail `fsparticle` SHA-256 `acdea921e80243549205d86ffde2119af97a697443f27dcf6ee5e8798deb2816` samples one RGBA `texUnit0`. Row 50 explicitly assigns `fxpa_smoke01` and `fxpa_smoke01a` to different emitters; the former has meaningful embedded alpha while the latter is an opaque grayscale texture. The canonical renderer no longer infers `${texture}a` as `alphaMap`, and it exposes exact-binding provenance in mesh/material telemetry. The earlier `080d...` base-shader hash is superseded by the active `nwn_retail.key` override audit. See `vfx-particle-texture-alpha-binding-audit-2026-07-19.md`; fresh row50 proofs v12 and v13 are recorded below.

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

Status: `InProgress`

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
- [x] Capture a browser-only custom-MTR compile/render probe with diagnostic sampler and explicit non-parity classification.
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
- The 2026-07-15 PLT implementation closes resource-identity, target-context, decoder, and palette-specific cache plumbing only. The `Test PLT visual with known layer colors` item remains unchecked because there is no matched NWN/Web framebuffer capture or comparison for this lane.
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
- 2026-07-16 validation remains intentionally non-zero: `10` fixtures, `0` canonical-allowed, `10` blocked. Missing lanes are retail build `10`, source `6`, parser snapshot `10`, resolver trace `10`, runtime tick dump `10`, render contract snapshot `10`, capture reference `10`, and comparison `10`.
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

Remaining evidence (not blockers):

- 2026-08-13 row-216 ordered-HAK host correction: the exact capture BIC and
  ordered module resources prove that the source PC uses
  `cep3_armor.hak/pfh0.mdl` with `lc_addanimations.hak/a_fa.mdl`, while the
  target uses `cep3_core0.hak/c_yinnkeep.mdl` with `nwn_base.key/a_ba.mdl`.
  The broad fixture previously used base-game host models for its attachment
  graph; it now pins the winning sources and hashes, renders the exact
  BIC-derived modular source plus GIT-derived target in separate runtimes, and
  selects only `target_creature` for object attachment. The fixture gate and
  35 focused frontend tests pass; the frontend production build passes. Fresh
  static preflight and one 24-second Web capture pass identity, host, asset,
  draw, shader, single-playback, and proof gates with one trigger, no loop or
  overlap, and clean post-duration hiding. Web MP4 SHA-256 is
  `9695caacfa2f1c67d02f5bb6c3c9c29247f88060c9322874514df9f80bcaef05`;
  saved NWN SHA-256
  `0b0d5e91d176710c5b38cd9b4c7c2b885c3c08ab3c10142d8242e96495484f67`
  was reused without rerun. The onset-aligned comparison MP4 SHA-256 is
  `0c79a033f33735e6ced2f2c9737c7989782922e9f47e4241d53ec214588a892b`.
  Thread asymmetry/ordering is no longer derived from the wrong base models;
  camera projection, scene registration, owner-target screen scale, exact PLT
  shading, and pixel parity remain open. Detailed audit:
  `vfx-row216-ordered-hak-host-resource-precedence-audit-2026-08-13.md`.
  Status is `diagnostic-only-single-playback-open-camera-scene-owner-target`,
  not parity.
- The row-68 `VFX_IMP_HEALING_M` packet reuses one validated NWN MP4 trigger and contains exactly one post-cull/winding-repair Aurora Web v11 playback, with no NWN rerun, loop, or overlap, a clean baseline/post-roll, and zero final particles for all four emitters. The durable comparison is `backend/docs/aurora-reverse/evidence/vfx-nwn-web-row68/nwn-vs-aurora-web-row68-comparison-v6.json`; its status is `valid-comparison-source-backed-bloom-timing-aligned-with-open-spatial-gap`, not canonical parity. Aurora Web's visible span is `1.450636` seconds versus NWN's `1.416667`, a `+0.033969` second delta within one NWN frame. Native Fountain density and mode-2 front-face/culling are corrected; exact spatial attribution remains open because the Web capsule and NWN player do not have matched screen scale or geometry.
- The current row-22 packet is v7. It reuses the one-trigger NWN MP4 without rerun and records exactly one 12 fps Web playback with no loop, overlap, diagnostic capsule, or receiver plane. `validated-summary-v7.json` passes every lifecycle/runtime/collision check; all six emitters finish at zero active particles. The durable comparison is `backend/docs/aurora-reverse/evidence/vfx-nwn-web-row22/nwn-vs-aurora-web-row22-comparison-v7.json`; its status is `valid-comparison-with-open-parity-gaps`, not canonical parity. NWN's saturated visible span is `0.583333` seconds versus Web's `0.166667`, a `-0.416667` second gap. The camera/environment gap, stronger NWN overexposure, visible Web Ring, and material/light differences remain open.
- Row-22 source preparation recovered the binary animation event table at animation metadata `+0xB8`: each row is a float time followed by a 32-byte name and has no emitter-owner field. Retail `vff_explfire.mdl` preserves authored `detonate` rows at `0`, `0.0333333`, duplicate `0.0333333`, and `0.1333330` seconds on the model animation header. Duplicate callbacks remain traceable while the runtime latch creates only one Explosion burst per tick; model-header rows are routed only to Explosion family instances. The mixed-lane render contract keeps ordinary textured emitters separate from Chunk particles.
- MTR `twosided` culling is source-closed from the admitted Toolset binary: non-volumetric material `twosided` enqueues wrapper argument `1`, argument `1` disables state slot `3` (`GL_CULL_FACE`), argument `0` uses enabled `GL_BACK`, and this wrapper does not modify `glFrontFace`. Textured emitter `twosidedtex` is live-read later and remains the final particle-quad cull owner. Backend render-contract tests pass `31/31`, the canonical renderer passes `43/43`, the full VFX object-render file passes `123/123`, and both production builds pass. This is implementation evidence, not visual parity.
- Row-68 source-backed scheduling separates the retail binary `impact` animation (`2.633330` seconds over 79 ticks) from a 32-tick particle-lifetime tail. Binary controller decoding now reads the key-time pool offset at metadata `+6` separately from the component-value pool offset at `+8`, evaluates actual authored times, and clamps beyond the last key to the last value. The runtime ends all four emitters at zero active particles; the source `flash` light measurably illuminates a neutral receiver and holds its final black color key through the tail. Focused backend verification passed `136/136`, focused frontend verification passed `28/28`, and backend TypeScript/build passed.
- Fresh post-debt placeable proof v43 reuses the saved NWN oracle MP4 without launching NWN again and recaptures Aurora Web after the binary-controller correction. It shows three full static `plc_t04` bases, six emitter meshes, 48 particles at `t=5`, both source textures, synchronized 10-second Web runtime frames, and zero lights as required by source-backed absence of light nodes. The packet is `matched-with-gaps`, not canonical parity. Its deterministic MP4 is byte-identical to v42 because this correction does not alter the persistent `plc_t04` fixture; the fresh timestamp, frame state, network trace, timeline, and v43 comparison manifest prove the new capture. v42 and earlier are historical only.
- 2026-08-13 ProgFX Type 10 row-181 timing correction: retail `nwmain.exe` still proves one `CNWCProjectile` and `Param4=4` path style 4, but direct re-disassembly corrects the former random-speed interpretation. `0x140c946b0` is `logf`; the handler evaluates `1.5 + 3*logf(distance)`, divides distance by that speed, multiplies by `1000.0f`, and truncates to integer milliseconds before `0x1409873c0` stores the duration. The shared runtime contract is now `aurora-progfx-type10-projectile-trajectory/v2`, has no `randomUnit`, preserves float32 boundaries, and reports both `durationMilliseconds` and seconds. The exact 3 m row-181 scene yields `625 ms`; the saved NWN four-frame visibility window at `8.308 fps` is not used as a substitute duration oracle. Focused domain/application verification passes `45/45`, and the exact HAK-backed row-181 fixture gate passes. Full proof refresh remains required before parity status changes. Detailed audit: `vfx-progfx-type10-log-timing-correction-audit-2026-08-13.md`.
- 2026-08-13 row-181 comparison correction: the current Web packet has matching runtime build identity, an exact four-tile HAK-backed source scene, one trigger, loop disabled, zero overlap, settled assets, passing technical host/draw/proof gates, and a clean hidden post state. Saved NWN SHA-256 `b6106159ad902a281fa245331bf92a366b1199a650c2d2a71909f569e71ed7c6` was reused without rerun. Web MP4 SHA-256 is `cb580ffc541df6c3fd6ce2f3a79badd18e5c59c335e7dca077755785ccdf33af`. The attempted endpoint-aligned v3 is rejected because `lastVisibleVideoSeconds` is produced by a global pixel threshold and does not identify the projectile endpoint. Current diagnostic v4 MP4 SHA-256 is `8866fb8a3595360e31feac012841b0a8e747b6313999dc3c8363fa30c3dc1a87`; contact-sheet SHA-256 is `33a797f6d90546ac87383ba28999bed34e942fb04c889ccdad469436a9e11e61`; manifest SHA-256 is `ad726e0ee98312004705980651f59ff4bb5170144c30c3054cc6cbc2588daacc`. V4 binds the complete NWN run/module/script/ledger chain, preserves source-frame uncertainty, and carries Web's own camera, scene, and owner-target blockers. The source-backed formula and `625 ms` three-metre Web fixture result remain accepted implementation facts, but temporal, endpoint, and pixel parity are `not-proven`. Detailed audit: `vfx-row181-owner-endpoint-proof-audit-2026-08-13.md`.
- 2026-07-18 dynamic-contrast local-light correction: `inc_postpr_dyn_c` local-light midpoint evaluation is live for canonical, placeable and creature source-MDL lights. The resolver preserves signed range-squared alpha, ambient-only projection bypass, diffuse projected-position attenuation, view-Z falloff and capture-profile cutoff multiplier `2.0`; generic, `placeables.2da`, item and tile lights stay excluded until their upload contracts are recovered. Enabling the path exposed a missing fragment-shader `max(0, 1-brightness^2)` HDR clamp, visible as black holes in the row-181 core. That capture is rejected; the exact clamp is restored and regression-tested. Final verification passed the 14-test postprocess contract suite, five targeted source-MDL category tests, frontend build and installed Playwright fixed-time WebGL validation. The accepted final Web MP4 has one trigger, no loop and clean post-roll, reuses the saved NWN MP4 without rerun, and is indexed by `row181/comparison-dynamic-contrast-20260718/comparison-manifest.json`. Status remains `matched-with-open-material-lighting-gaps`, not parity.
- 2026-07-18 render-mode geometry correction: `vfx-render-mode-geometry-audit-2026-07-18.md` closes the textured-particle vertex-builder coefficients for render IDs `0..6`. Modes `3`/`6` now use reciprocal full 3D segment length, mode `6` trailing alpha uses `min(sizeX/fullLength,1)`, mode `1` uses emitter-local Aurora `X/Y`, mode `4` signs world Z from the camera-up hemisphere, and source-derived modes `1`/`2`/`5` preserve front-face winding after `C=(x,z,y)`. Focused renderer verification passes `51/51`. No NWN process was started. Row `216` has one fresh `2+20+2` Web playback with one trigger, no loop, diagnostics off and zero final particles; its comparison reuses the saved NWN MP4 and is indexed by `row216/comparison-render-modes-full3d-20260718/comparison-manifest.json`. Web now shows a thick closed lash loop, but missing scene/actors, unmatched anchors and saturation differences keep status non-parity.
- 2026-08-12 row-216 P2P gravity re-audit and current-runtime proof: primary Aurora decompilation confirms the active-particle update order `position -> wind -> target/threshold -> pow(drag,dt) -> target gravity -> direction/segment -> inherited velocity -> mass`, followed by Fountain spawning. The current shared runtime already matches that order, so no speculative row-specific tuning was applied. Static no-playback preflight passed with the exact five-emitter host graph, settled assets, Linked plus ordinary textured draw lanes, packed RGBA texture evidence, and exact `SRC_ALPHA/ONE` blending. Focused verification passed backend `95/95`, frontend `132/132`, and the broad resource gate. One fresh deterministic Web proof records `2+20+2` seconds at 30 fps with one trigger, no loop/overlap, clean post state, matching build identity, and an empty proof blocker manifest. Saved NWN SHA-256 `0b0d5e91d176710c5b38cd9b4c7c2b885c3c08ab3c10142d8242e96495484f67` was reused without rerun. Web MP4 SHA-256 is `fed5123aa1f809edc8600662faebde4d0b6e10e13d58266602b11c5ac4504382`; onset-aligned comparison SHA-256 is `d584d46168dddfc09819de1675348e196110ffa007994846fbdd4f9e1ae92342`; contact-sheet SHA-256 is `da2b22990e17d75c17fb616ef71dad8182a8ef338063b469a3f460750d92d1f5`. The current proof preserves the two smooth lash strands and additive envelope without the obsolete segmented zig-zag shape. Exact camera, scene actors, screen scale, occlusion, and environmental spill remain open, so status is `matched-with-open-camera-scene-gaps`, not parity. Detailed audit: `vfx-row216-p2p-gravity-runtime-audit-2026-08-12.md`.
- 2026-08-12 row-216 authored-angle asymmetry audit: the exact binary `vim_lashfire` graph proves different static Fire01/Fire02 orientation hierarchies and asymmetric reference offsets; `cast01` does not replace them with transform tracks. Primary Aurora decompilation proves that particle launch inherits the emitter-owner world quaternion, while Type 7 refreshes attached source/target part position and orientation every frame. Current Web telemetry preserves distinct composed Fire01/Fire02 orientations, but its static-host curves are almost mirrored (`0.02792145 m` mirror RMS over about `3.50 m`). A diagnostic-only bright-core measurement records about `3.975 deg` left/right tilt-magnitude difference in the saved NWN still versus `0.547 deg` in Web; actors, occlusion and camera remain unmatched, so this is not a transform oracle. No row-specific angle tuning is authorized. The next shared slice is exact live `Impact` actor-animation integration through the existing Type 7 attachment resolver, followed by one fresh Web proof compared against the saved NWN MP4. Detailed audit: `vfx-row216-authored-angle-asymmetry-audit-2026-08-12.md`.
- 2026-08-12 shared inherited host-animation integration closes the proven static-host Type 7 gap without row-specific tuning. A reusable graph composer binds supermodel transform channels to named base-model transform or static-geometry parts and replaces same-name tracks deterministically. Row216 now verifies the exact `pfh0 -> a_fa` and `c_yinnkeep -> a_ba` retail chains and hashes, supplies looping 2-second `pause1` states through `aurora-effect-beam-host-runtime/v1`, and resolves both `Impact` paths on every runtime frame. Source binding matches 50 graph parts and target binding matches 20; exact retail onset phase remains explicitly unmatched. Domain/attachment tests pass `6/6`, service/schema tests `53/53`, the row216 fixture gate and broad resource gate pass, and both production builds pass. The only Web playback was retained after an identity-only proof rejection; a no-playback telemetry capture with matching frontend/backend commit passes every proof gate and encodes to the exact same MP4 SHA-256 `66dd5c84219ed7a7a0bced78ce20f3b156bfc85a12c2e3fd5e6b77c6d9f27ace`, proving media equivalence without retrigger. Saved NWN was reused without rerun. The onset-aligned comparison SHA-256 is `ef7afbc793fb7f97c584770a5e4500f13a8f54cf73f9d415b125ccd9ec341285`; exact actor/camera/scene and retail idle phase remain open, so status is implementation proof, not pixel parity. Detailed closure: `vfx-row216-authored-angle-asymmetry-audit-2026-08-12.md`.
- 2026-07-18 row-22 Fireball follow-up: the exact saved NWN MP4 was reused and fresh Web proof `v61` records one deterministic 12 fps playback with no loop/overlap, runtime frame `300/300`, zero final particles, and clean post-roll. The proof scene uses four exact floor/rug receivers, 14 source textures, and global moon ambient/diffuse values from the saved ARE; exact camera, creatures, tile-local lights, and wall/ceiling fade remain open context gaps. Global fixes preserve the original `fx_rockchunksml/smoke04` child emitter while rebasing no-inherit child particles to birth-world history, route standard packed-gamma particle color into the linear Three scene lane, and follow the native one-step atlas checkpoint so MainExplode reaches frame 15 without a late frame-0 wrap. Row 22 records 1200 WOK queries, 185 applied hits, 1015 no-hits, and eight landed Chunk ids. The onset-aligned MP4 is `evidence/vfx-nwn-web-row22/comparisons/nwn-vs-aurora-web-row22-v61-source-scene-onset-aligned.mp4`; its still pairs use the same `t+0.00`, `t+0.25`, and `t+0.75` onset-relative offsets. Saturated span improved from v60 `1.167 s` to v61 `1.000 s`, but remains `+0.417 s` beyond saved NWN `0.583 s`. The open delta does not justify deleting the distinct `0.133333` detonate callback, changing `lifeExp`, shortening Chunk source life 5, or changing the source atlas range; status remains diagnostic/open-context, not parity.
- 2026-07-19 row-1 object-duration checkpoint: static retail client disassembly proves `impact -> duration -> cessation -> release` ownership on the same `vdr_darkness` model. Aurora Web now preserves the requested 20-second lifetime independently of the `1.666670 s` duration loop, appends the source `0.633333 s` cessation animation, and removes both draw and source light after release. The fresh Web MP4 has one deterministic playback, no loop/overlap, source-backed floor receivers, and `aurora-vfx-runtime-observability/v1` PASS with identified frontend/backend builds, 20 settled assets, matching `DARK_Spot`/`Negitive_Light` host graph, and one logical draw record. The saved NWN MP4 was reused without rerun. Comparison packet: `evidence/vfx-nwn-broad-proof-2026-07-16/row1/comparisons/object-duration-owner-comparison-v2-20260719.json`. Exact camera, creature receivers, local tile lights, separation of the large textured footprint from negative-light reach, material/postprocess response, and removal tick quantization remain open; status is matched-with-gaps, not parity.
- 2026-07-19 row-44 replacement proof: the approved saved NWN recapture is reused without rerun. Accepted Web v5 contains one fire-and-forget playback, no loop/overlap, all three source emitters, both authored `t=0` Explosion events, and the source-backed target actor with scripted facing. The frame-preserving 60 fps timeline comparison is `evidence/vfx-nwn-broad-proof-2026-07-16/comparisons/row44-exact-base-scene-target-actor-visible-onset-aligned-v5-20260719.json`; status is `matched-with-gaps`, not parity. The older late-start NWN capture remains historical and must not replace the approved recapture.
- 2026-07-19 row-210 replacement proof: accepted Web v2 records one deterministic 690-frame playback at 30 fps, no loop/overlap, exact 20-second duration, passing runtime identity/host/asset/draw/playback gates, and terminal `postDurationHidden=true` with zero draws and visible frames. It is onset-aligned with the saved NWN oracle without rerun in `evidence/vfx-nwn-broad-proof-2026-07-16/comparisons/row210-lightning-radius-post-duration-onset-aligned-v2-20260719.json`. Lifecycle contracts match; flare shape/saturation, broad-layer thickness, scene/camera, material, bloom, postprocess, and retail RNG remain open, so status is `matched-with-gaps`.
- 2026-07-19 row-50 impact-attachment checkpoint: the approved saved NWN MP4 is reused without rerun. Source `Imp_Impact_Node=vim_negdeath` and the admitted `c_yinnkeep` hierarchy independently establish the actor `Impact` node as the position anchor; `OrientWithObject=0` keeps world orientation independent. The reusable object-attachment adapter now resolves the canonical phase schedule, fails closed on ambiguous/missing anchors, composes proof motion relative to the base anchor, and reports attachment telemetry. Capture v2 is rejected because the old proof-motion helper erased the anchor and produced a bit-identical pre-fix MP4. Accepted Web v3 records 315 deterministic frames at 30 fps, one trigger, no loop/overlap, stable `Impact` attachment, passing identity/host/assets/draw/playback/proof gates, and a clean post state. The onset-aligned saved-NWN/Web-v3 comparison is `evidence/vfx-nwn-broad-proof-2026-07-16/comparisons/row50-impact-anchor-preserved-exact-base-scene-target-actor-onset-aligned-v3-20260719.json`. Position attachment is closed; initial-flash scale/clipping, missing early full-body column, compact-orb peak shape, sharp vertical spikes, late souldust tail, scene/camera, material, alpha, light, bloom, postprocess, and retail RNG remain open. Status is `matched-with-gaps`, not parity.
- 2026-07-19 row-50 exact-RGBA and runtime-tail correction: accepted Web v5 proved the exact-emitter `texUnit0` RGBA path with one playback and a passing `aurora-vfx-runtime-observability/v1` gate while reusing the saved NWN MP4. Its comparison still showed an oversized initial flash and strong Motion_Blur tail. The follow-up Aurora audit found that active particles retained spawn-time mass instead of the current evaluated emitter mass and that Explosion omitted the prior-tick one-shot guard at runtime `+0x198`. Both are corrected with test-first coverage. The row-50 fixture no longer treats an 8 fps proof cadence as particle-runtime delta: it simulates at 60 Hz and serializes every second tick. Regenerated maxima are `sparks=25`, `Smoke=6`, `Smoke01=9`, `souldust=46`, and `WIND_Dummy=0`; all lanes finish at zero. Focused backend verification passes 160/160, canonical renderer 71/71, observability 8/8, the row-50 fixture contract, and both builds. v5 is historical pre-runtime-tail evidence; one fresh Web playback and saved-NWN comparison are required before assessing the visual delta. Detailed audit: `vfx-row50-runtime-tail-and-detonate-audit-2026-07-19.md`.
- 2026-07-19 row-50 post-runtime-tail proof v6: fresh Web MP4 SHA-256 `5aa50ca4113a21037a79084b16d00cec5c6ca600ee19bb6f482fc0fd9424028e` passed `aurora-vfx-runtime-observability/v1` with matching build identity, exact host graph, settled assets, draw-ledger PASS, exactly one trigger, loop disabled, zero overlap, stable `Impact` attachment, empty blocker manifest, and zero terminal draws. The saved approved NWN MP4 was reused without rerun. Onset-aligned comparison SHA-256 `f354a3b354dccf8a211407e7b1dd8dd2f6050cdaa59372310b48c19419f1d96d` remains `matched-with-gaps`: Web has a compact saturated core, sharper vertical streaks, and stronger/differently distributed late residue. Runtime-tail correctness is proved; row-50 visual parity remains open for an Aurora-first shape/material audit.
- 2026-07-19 binary-animation source-field correction: exact retail `vim_negdeath.mdl` keeps `souldust spawntype=1` on the base source emitter, and `FUN_00a31288` selects normal/trail scheduling from source emitter `+0x84`. The binary `impact` animation contains controller records for `birthrate`, `mass`, and `grav`; its fixed-layout `spawntype=0` default is not an animation controller. Binary animation passes now carry only controller-backed simulation properties, preventing source fields/flags from overwriting the base emitter. Regenerated row 50 keeps `sparks=25`, `Smoke=6`, `Smoke01=9`, `WIND_Dummy=0`, and corrects `souldust` from 46 to 0 for the static proof host. Parser tests pass 21/21, application/runtime tests 129/129, the fixture gate and both builds pass. v6 is historical pre-source-field evidence; fresh one-playback Web proof and saved-NWN comparison remain required. Detailed audit: `vfx-binary-animation-source-field-audit-2026-07-19.md`.
- 2026-07-19 binary source-field/trail proof v8: accepted Web MP4 SHA-256 `13b75eda099b7773ad8312afceaf5654543bb752e989cff4b481f20c75e998bf` contains one deterministic playback, no loop/overlap, stable `Impact` attachment, passing identity/host/assets/draw/playback/proof gates, an empty blocker manifest, and zero terminal draws. The approved NWN MP4 was reused without rerun. Comparison MP4 SHA-256 `f7b73096dccff3061d73eaeac92f200372d59b5df2a4f3e077b9f2b917783a7b` proves that the erroneous late `souldust` spikes are gone. Oversized initial flash, missing taller translucent column, compact saturated peak, scene/camera, material, alpha, light, bloom, postprocess and retail RNG remain open; status is `matched-with-gaps`.
- 2026-07-19 Fountain source-motion and float32-cadence correction: `FUN_00a31288` consumes runtime previous/current source positions plus a residual vector for trails and stores the normal-Fountain interval/accumulator in float fields. The shared runtime now accepts a per-emitter, per-boundary host-motion resolver. The exact `c_yinnkeep pause1` row-50 host moves `Impact` only `0.01107995 m` during the active `souldust` window, below its `0.02 m` spacing, so `souldust=0` is expected. A red/green regression also proves the old JavaScript double accumulator missed the exact six-tick boundary for birthrate 10. The shared scheduler now reproduces float32 storage, changing regenerated row-50 `Smoke01` from 9 to 11 while preserving `sparks=25`, `Smoke=6`, `souldust=0`, `WIND_Dummy=0`, and zero terminal particles. Runtime/application tests pass 132/132 and the fixture gate passes. Payload SHA-256 is `fb86d11e0d0d8e5788e7fe85f7f149798164ef199c9b6acbf10409073765d76d`; manifest SHA-256 is `ae1659bb0aad56c39594ddf889073564a4f3767018d5950514fb7c771a57ea0c`. Web v8 is historical for this cadence correction; accepted proof v9 below replaces it for the current fixture. Detailed audit: `vfx-fountain-float32-cadence-and-source-motion-audit-2026-07-19.md`.
- 2026-07-19 float32-cadence proof v9: accepted Web MP4 SHA-256 `f2c01ea95319fe198e1dad181213ea9cb4c33284986c4cda2816ebb4c1abfde2` contains one deterministic 315-frame playback, no loop or overlap, stable `Impact` attachment, matching frontend/backend identity, passing identity/host/assets/draw/playback/proof gates, an empty blocker manifest, disabled overlay, and zero terminal draws. The approved NWN MP4 was reused without rerun. Comparison MP4 SHA-256 is `74cbc359ae811b91759b7e847539862e5e3b3cd922569882fab55d49af1f9ccb`; contact-sheet SHA-256 is `deb942fe3733bff7a7a33049574eb3681603dfc520d27632c73bf12c2d2a168a`; manifest SHA-256 is `3b9abfbfa3026bcc48cbef67666d26a8dd549164aa67bce4ae51966f1cb7c335`. Float32 cadence strengthens the source-required `Smoke01` column, but the first flash remains oversized/clipped, the cyan/white layer remains shorter and less translucent, and the peak remains too compact and saturated. Scene/camera, material, alpha, light, bloom, postprocess, and retail RNG remain open; status is `matched-with-gaps`.
- 2026-07-19 particle spread render-orientation correction and proof v10: primary Aurora decompilation proves that ordinary Fountain reset composes random local-X tilt and local-Z azimuth into the particle quaternion before both velocity derivation and mode-5 rendering. Aurora Web previously applied those samples only to velocity and kept the emitter-only render orientation. The shared runtime now stores the same composed orientation without changing RNG ordering, cadence, particle count, or lifetime; a deterministic red/green regression proves both rotated local-Z direction and local-X azimuth. Backend verification passes 185/185, frontend verification 81/81, both builds and the row-50 fixture gate pass. The first guarded capture attempt failed closed before playback because build identity was absent; after matching frontend/backend commit identity, accepted Web v10 records one 315-frame playback with no loop/overlap, settled assets, exact host names, draw/playback/proof PASS, empty blockers, disabled final overlay, and clean post state. Web MP4 SHA-256 is `0a4874c25378976646b8e9970b992251fad8fa152748fd76eca734a436f4b693`. The approved NWN MP4 was reused without rerun. Comparison MP4 SHA-256 is `134e458d17ac56d020378ac26abd33ea88b5acf4e58e46996210b5ecaca77911`; contact-sheet SHA-256 is `98e907cf55e42eecb283cd97520225bb63e5c6ecab34bb9371c51e0f7fc753df`; comparison manifest SHA-256 is `f6b05116bbd67c027832cc758893d4c6298cba73bffd663c1b32614b267de114`. The onset is visibly rounder and no longer has the prior shared-plane star asymmetry, but it remains too white/overexposed; the early Web body is a low horizontal mist instead of the tall translucent retail column, and the peak remains a compact saturated knot. Gamma-domain normal blending, alpha/depth state, missing scene lights/tiles, exact camera, bloom/postprocess, and retail RNG remain open. Detailed audit: `vfx-particle-spread-render-orientation-audit-2026-07-19.md`. Status is `matched-with-gaps`, not parity.
- 2026-07-19 particle Normal/additive gamma-composite correction and proof v11: primary retail particle shaders bypass the standard material color-space conversions, Normal maps to `SRC_ALPHA/ONE_MINUS_SRC_ALPHA`, additive maps to `SRC_ALPHA/ONE`, and retail bloom consumes their shared composed framebuffer. Aurora Web now preserves packed gamma RGB and exact `NoColorSpace` texture sampling for both non-custom lanes, converts the linear scene once, composites both particle classes in one depth-sharing transparent render list, and feeds the result to retail bloom/postprocessing. Focused frontend tests pass `69/69`, the frontend build passes, and a real WebGL probe reports the new gamma stage with `glError=0`. Accepted Web v11 records exactly one trigger with no loop/overlap, matching build identity, settled assets, exact host graph, draw/proof PASS, and a clean post state. The saved NWN MP4 was reused without rerun. Deterministic Web CFR30 MP4 SHA-256 is `7d2076a1e01262bcef507ae9dc04b5f4896e4e5b3ce345a0bae149eabe0fa181`; onset-aligned comparison SHA-256 is `a0268916785b3951b0a565a188dc21e5b66a1961257546ffe261b4bbf28c17fd`; contact-sheet SHA-256 is `71fc9cdc19800068d4f63dc802cd8d022f9cf3a0a10af3f70e5d8b3a6b132217`. The wrong linear Normal blend path is closed globally, but row 50 still has an oversized clipped onset, an over-broad early Normal layer, and a compact saturated peak instead of the taller translucent retail column. Missing source tiles/local lights, exact camera, soft-particle depth/fog, bloom/postprocess, and retail RNG remain open. Detailed audit: `vfx-particle-normal-blend-gamma-domain-audit-2026-07-19.md`. Status is `matched-with-gaps`, not parity.
- 2026-07-19 particle soft-depth/fog correction and proof v12: active retail particle source proves the size-gated soft-particle depth path plus separate Normal RGB fog and Additive alpha attenuation. Aurora Web now binds settled scene depth, exact softness, projection data, and source fog at the shared canonical particle boundary. Real WebGL reports zero errors. Web MP4 SHA-256 is `163cd403eb4eae0c196e5be4658c4400bf715fbf5b4da9e6e28cdb4d67554363`; saved-NWN comparison SHA-256 is `74a5043969a043f68e7747ec88df06f4112e34ae3ee511128c38d2980130159d`. The runtime path is closed for the admitted Normal/Additive lanes, while perspective-camera proof and dedicated Punch-Through/custom-MTR paths remain open.
- 2026-07-19 active retail postprocess correction and proof v13: direct `nwn_retail.key` precedence proves `inc_config` selects `COLOR_CORRECTION_TYPE 4`; the former Web type-`1` brightness-sum branch came from the wrong base-first source selection and affected every bright VFX. The shared postprocess now preserves HDR overflow channel relationships with the active type-`4` formula and reports both active source hashes. Focused tests pass `94/94`, both builds pass, and real WebGL reports type `4`, empty program logs, and `glError=0`. Accepted Web MP4 SHA-256 is `55b987a617fe21295c2a4e3a08d69fdc055e8ce2f439f187e3c6e2c465a5ad34`; comparison SHA-256 is `25e9919c8fc794c9cbaf37c08e58bc035d1e3677e17e35baf331bfa6728034cd`; contact-sheet SHA-256 is `202e2c5a7ca1d6ae8a06666a6d49fe0ab73dc4c0cc12c4e087cbf1698deba20c`. v13 contains exactly one trigger, no loop/overlap, retained representative particle-shader coverage, empty proof blockers, and a clean post state. The source-selection and color-correction defects are closed globally; initial scale, early-column height/translucency, peak shape, late residue, unresolved source tiles/local lights, exact camera, SSAO, and retail RNG remain open. Detailed audit: `vfx-active-retail-postprocess-color-correction-audit-2026-07-19.md`. Status is `matched-with-gaps`, not parity.
- 2026-08-06 shared particle float32 age-boundary correction and proof v14: admitted Aurora Toolset decompilation proves that shared, Single, and Lightning particle age writes use float storage, while normalized age and final linear color/alpha/X/Y size samples also cross float boundaries. The shared runtime now reproduces those boundaries without changing source timing or adding per-effect tuning. The red regression exposed the former `0.9999999999999999` JavaScript age after ten `0.1` writes versus Aurora-like `1.0000001192092896`; after correction runtime tests pass `94/94`, related backend suites `166/166`, focused frontend suites `73/73`, both builds, and the proof-gate self-test pass. Fresh Web v14 SHA-256 is `390f46a53c724414348b84e88dd35714b6bba506967ac2469cf2b718667ebce9`; it contains one 315-frame playback at 30 fps, no loop/overlap, complete identity/host/assets/draw/shader/playback gates, empty blockers, and a clean post state. The approved NWN MP4 was reused without rerun. Comparison SHA-256 is `ef9e2b0884c38845db46ce0da4f846574290eb47607612f028ce92a6d191ab75`; contact-sheet SHA-256 is `74d073d4b769a16d5acd8dd7e3d72b78f1cd29d9371cc22f2cbab221fe93d4bb`. The native age/interpolation storage defect is closed globally, but the onset remains too large and overexposed, the Web glow is too horizontal, and its vertical column and peak shape still differ. Detailed audit: `vfx-particle-float32-age-boundary-audit-2026-08-06.md`. Status remains `matched-with-gaps`, not parity.
- 2026-08-06 packed particle RGBA vertex-boundary correction and proof v15: admitted Toolset decompilation `FUN_00a2e250` multiplies evaluated RGB/alpha by `255.99f`, packs the converted low bytes into every particle vertex, and independently converts Motion_Blur trailing alpha. Matching `nwtoolset.exe` machine code at `FUN_00b908cc` sets x87 rounding-control bits `0x0c00` before integer store, proving truncate-toward-zero rather than `Math.round`. The canonical textured-quad builder now applies `trunc(channel * float32(255.99)) & 0xff`, normalizes the byte by `255`, and exposes the boundary in mesh/geometry telemetry without changing runtime values or per-effect parameters. The new test failed before implementation with Web `0.25` versus Aurora `63/255`; renderer coverage passes `67/67`, the related frontend set passes `134/134`, and the frontend build passes. Static preflight passed without playback hooks; the accepted Web MP4 has exactly one trigger, no loop/overlap, complete identity/host/assets/draw/shader gates, and SHA-256 `d77c21c1203219793c54e51a14f4978916ab1685e8bb65d545348051bac5adf1`. The approved NWN MP4 was reused without rerun. Comparison SHA-256 is `7ae34c26db36f391f68ec10135d55abed84cd73f38053e19eb3f6bda4a0be662`; impact contact-sheet SHA-256 is `06bd7960169c80dc249529f988abc5b6af68730c74dca9ae212b76a286f40f06`. The packed-channel defect is closed globally, while scene/camera/light, peak-shape, SSAO, and retail-RNG gaps remain. Detailed audit: `vfx-particle-packed-rgba-vertex-quantization-audit-2026-08-06.md`. Status remains `matched-with-gaps`, not parity.
- 2026-08-06 terrain source-light animation correction and row-22 proof v66: primary Toolset decompilation proves that `Tile_SrcLight1/2` selects numeric animations on `fx_flame01`, while the admitted retail `fx_flame01.mdl` supplies fifteen `AuroraLight01` RGB timelines. Retail `PartLight::PartLight` independently proves the absent multiplier default is `1.0`. The old shared path incorrectly used `tilecolor.2da`; row 3 was `[0.49,0.29,0.07]` instead of `[1.9,1.9,1.0]`. Backend Area loading, frontend terrain rendering, and frozen proof scenes now share the corrected resolver and metadata contract. Related frontend verification passes `85/85`; the focused backend repository regression and both builds pass. Fresh Web v66 SHA-256 is `684a1a4a3f04c2d8938795f8231dafc48d2b6dcc10189dabc75ffed9ab0b0dea`; it records exactly one playback, no loop/overlap, complete identity/host/assets/draw/playback gates, empty blockers, and zero terminal particles. Saved NWN SHA-256 `f6414e0d184131ce74836c208e6334bb62cf023c502725223758185dd41f0983` was reused without rerun. Comparison SHA-256 is `7fabb4f63b2f9c6263f43959e06eb69951208f6bf54d663512ef6349d315f1af`; impact-sheet SHA-256 is `d28c0c35e5901856e55ce9c992a07cb5c106d29b173dbedb1c6d8a6221360127`. The color-selection defect is closed globally, but exact camera/actors, five unresolved tile source-node transforms, six main-light lanes, wall/ceiling fade, peak shape, SSAO, and retail RNG remain open. Detailed audit: `vfx-tile-source-light-animation-selection-audit-2026-08-06.md`. Status remains `diagnostic-only-single-playback-open-context-gaps`, not parity.
- 2026-08-07 standalone proof render-frame correction and row-22 proof v68: production Area content already owns one X mirror, while the standalone NWN comparison runner omitted that parent frame and horizontally reversed the source correspondence. The runner now parents source Area models, source lights, actors, canonical VFX roots, and Chunk children under one `scale=(-1,1,1)` proof frame; the canonical Aurora-space converter and production Area path are unchanged. Focused comparison-runner tests pass `25/25`; related frontend suites pass `182/182`, the canonical renderer passes `67/67`, and both builds pass. Fresh Web MP4 SHA-256 is `9b251eb51632d6272b5aa1b9087c78a49d864a01d9362e4230150a0ddb5e48ac`; it contains one 187-frame playback at 12 fps, no loop/overlap, matching build identity, settled assets, host/draw/playback/proof PASS, empty blockers, and clean post state. Saved NWN SHA-256 `f6414e0d184131ce74836c208e6334bb62cf023c502725223758185dd41f0983` was reused without rerun. Comparison SHA-256 is `09afb69c0500d13749ebbb470a1f38d12f7bc5ab1b89a6d2bfea67aa35b67c59`; contact-sheet SHA-256 is `1879d8b277f8afadb27aad2efa439bb823bc3c47238d8561a9b655799a177a0f`. Horizontal source placement is closed, but peak clipping, orange-red decay, smoke/Chunk residue, exact camera/actors, five tile source-light transforms, six main-light lanes, wall/ceiling fade, SSAO, and retail RNG remain open. The saved NWN MP4 lacks per-frame runtime timestamps, so encoded-span differences are descriptive and do not authorize source-lifecycle tuning. Detailed audit: `vfx-row22-v68-proof-comparison-audit-2026-08-07.md`. Status remains `diagnostic-only-single-playback-open-context-gaps`, not parity.
- 2026-08-07 tile source-slot count closure: primary Toolset decompilation of `FUN_007125ec` proves `sourcelight1` is created only when exact tile model slot count is greater than zero and `sourcelight2` only when it is greater than one. Production Area loading now carries typed source-precedence MDL slot contracts through HTTP and scene mapping; the renderer has no tile-center or loaded-GLB fallback. The regenerated row-22 fixture reports `resolved-source-1:absent-source-5:unresolved-source-0:resolved-main-6:unresolved-main-0`. The five formerly labelled unresolved source references are source-backed absent and are not parity gaps. Focused renderer, HTTP, proof-runner, repository, cache, and lighting-evidence tests pass; a fresh one-shot Web capture against the saved NWN MP4 remains required. Detailed audit: `vfx-tile-source-light-slot-count-audit-2026-08-07.md`.
- Family packets for `dm_visualeffect`, scripted `EffectVisualEffect`, `EffectBeam`, Explosion, Fountain/atlas, chunk particles, P2P, Linked, blend mode, and PLT still need valid saved retail capture plus parser/resolver/runtime/render/comparison artifacts.
- These are incomplete proof tasks, not execution blockers. Implementation and Web-side preparation continue without reserving or reopening Aurora/NWN.

Notes:

- This is the only track allowed to close exact visual/runtime semantics that require retail confirmation.
- `VFX-P10` and `VFX-P11` are `Done` with evidence, so the P12 harness could be prepared. P12 remains `InProgress`; the canonical gate keeps unproven fixture claims closed while implementation and valid proof collection continue.
- `VFX-P12-A` repo-side capture setup is complete, but the canonical gate still requires real retail artifacts before any fixture may move to `passed` or `behaviorClaim: "canonical"`.
- `VFX-P12-B` created the first fixture pack skeleton for row 68; it intentionally does not provide SHA-256 manifest evidence refs because placeholder JSON files are not retail capture artifacts.
- `VFX-P12-C` created the scripted `EffectVisualEffect` fixture pack skeleton for row 50 and the operator NWScript harness; it intentionally does not provide SHA-256 manifest evidence refs because placeholder JSON files and an unexecuted script are not retail capture artifacts.
- `VFX-P12-D` created the scripted `EffectBeam` fixture pack skeleton for row 210 and the operator NWScript harness; it intentionally does not provide SHA-256 manifest evidence refs because placeholder JSON files and an unexecuted beam script are not retail capture artifacts.
- `VFX-P12-E` created the Explosion plus detonate fixture pack skeleton for row 22 and the operator NWScript harness; it intentionally does not provide SHA-256 manifest evidence refs because placeholder JSON files and an unexecuted fireball script are not retail capture artifacts.
- `VFX-P12-F` created the Fountain plus atlas fixture pack skeleton for the local `cot_fx01/fire!03` MDL candidate; it intentionally keeps the fixture `MDL_EMITTER`/`source_only` because no retail row/context was found, and the local MDL hash is provenance only, not retail capture evidence.
- A screenshot/video path in the manifest is treated as useful capture metadata only; without parser snapshot, resolver trace, runtime dump, render snapshot, and comparison evidence it cannot pass the gate.
- `VFX-P12-G` indexes the saved row-22 and row-68 NWN/Web artifacts as `diagnosticEvidenceRefs` with SHA-256 and source-audited `implementationRevision` records. The parity validator explicitly proves those refs cannot satisfy `captureReference`, `comparison`, or canonical promotion.
- Unknown cases remain diagnostic/preview-only and cannot be promoted by frontend renderer smoke tests, GLB preview, or Three.js material behavior.
- 2026-08-07 shared source-MDL material-lighting correction and row-22 proof v73: active retail `inc_lighting.shd` and admitted Toolset decompilation establish separate ambient and diffuse material lanes. One provenance-gated adapter now restores source MDL diffuse and applies the source ambient/diffuse separation across canonical VFX Chunk models, the placeable/model loader, and standalone comparison receivers; there are no row-22 or Fireball conditions. Unsupported unlit/custom materials, missing source channels, unverified metadata, and nonzero ambient paired with zero diffuse fail closed. The proof runner inventories visible unique receiver materials and feeds any failure into `aurora-vfx-runtime-observability/v1`. Focused frontend verification passes 162/162, the frontend build passes, and the project mutation command stops before mutation on the unrelated stale `WorkspaceLayout` creature-metadata expectation. A necessary Nest module-wiring correction passes 4/4 and the backend build. Accepted Web v73 SHA-256 is `862d48cac88573b97bd93646d6ca97f72b732339ed5ddd03d964125e68d1787f`; it contains one trigger, no loop/overlap, clean post-roll, empty proof blockers, and a 12/12 installed material ledger. Saved NWN SHA-256 `f6414e0d184131ce74836c208e6334bb62cf023c502725223758185dd41f0983` was reused without rerun. Comparison MP4 SHA-256 is `1fb03c7b2c9d91fbb872617debf14900583800e4a113ad8e03df0a344e13b6d5`. Baseline mean RGB changed from v72 `39.977` to v73 `39.176`; exact camera/actors/full room, core shape, static lighting, SSAO, postprocess, and retail RNG remain open. Detailed audit: `vfx-shared-mdl-material-lighting-audit-2026-08-07.md`. Status remains `diagnostic-only-single-playback-open-context-gaps`, not parity.
- 2026-08-07 global dependency-resolution correction v74: primary Aurora evidence keeps emitter `texture`, `texture NULL`, and non-empty `chunkName` as distinct source/runtime states. The shared graph no longer creates false `NULL` or `NULL.txi` resource edges and records the explicit no-texture/chunk-separation diagnostic on the preserved emitter source edge. A manifest-driven proof adapter now supplies exact model, texture, TXI, and chunk resolver traces before broad package processing, with vanilla-layer provenance, immutable hashes, relative proof object keys, and no invented candidates. Across seven regenerated broad payloads unresolved edges dropped from 78 to 9, false missing-texture diagnostics from 22 to 0, and false NULL edges from 2 to 0. The remaining six sound and three ProgFX-row edges are genuinely absent from the current manifests and remain unresolved. Focused unit verification passes 14/14; the broad resource-resolution, comparison-context, row-44 animation/source-scene, row-50 source-scene, and row-210 Lightning contracts pass. No Toolset, NWN, or Web playback was started because this is a non-pixel provenance correction. Detailed audit: `vfx-global-resource-resolution-audit-2026-08-07.md`.
- 2026-08-07 shared particle float32 kinematics correction v75: admitted Aurora Toolset decompilation stores particle position, previous position, velocity, rotation, direction/orientation-related state, and collision results through float fields and float temporaries. The family-neutral runtime now preserves those boundaries across ordinary Fountain/Explosion/Single particles, P2P, Lightning, inherited emitter motion, Motion Blur, collision, and Chunk transforms; there are no row/model/emitter-name or Fireball conditions. Runtime tests pass 95/95, related backend suites pass 107/107, all seven broad fixtures regenerate offline, the comparison-context, row-44 animation/source-scene, row-50 source-scene, row-210 Lightning, and global resolver gates pass, and the backend build passes. Exact retail RNG seed remains explicitly open and was not image-tuned. Fresh row-22 Web proof records one playback, no loop or overlap, proof-gate PASS, a clean post-roll, and zero final particles across all six emitters; Web MP4 SHA-256 is `c9a96bf544241685d11f3d278d39cbc560a907bf0f8f0c921711daf8b673f20b`. The saved one-trigger NWN MP4 was reused without rerun. Comparison MP4 SHA-256 is `846dce3e6c304a20d347f5528df891a0a3195b45ccc77c4b5fc239b7d303d36c`. Visual review still finds a compact low Web onset, a broader saturated peak, and a stronger red/smoke/Chunk encoded tail; missing NWN per-frame runtime timestamps forbid image-tuned lifecycle changes. Detailed audit: `vfx-particle-float32-kinematics-audit-2026-08-07.md`. Status remains `diagnostic-only-single-playback-open-context-gaps`, not parity.
- 2026-08-13 row-1 integer owner v2 correction: retail `nwmain-linux` disassembly proves truncated integer impact/cessation timers, network removal before the same frame's object update, and no overshoot carry. The shared owner runtime and fixture generator now derive one update-step-specific schedule; at `125 ms`, row 1 transitions impact at `0.375 s`, processes removal at `20.000 s`, releases the model owner at `20.625 s`, and completes the post-removal timer at `23.625 s`. Focused backend tests pass `49/49`, canonical-renderer tests pass `69/69`, both broad fixture gates and the backend build pass. Fresh Web MP4 SHA-256 is `d67cf6c092c330b7b73dc8b589599e181f8400ad371a77dba5ed13782ed011d8`; it records one trigger, no loop/overlap, passing observability ledgers and proof gate, and a clean post state. Saved NWN SHA-256 `9cdc57cf5f559f58f019994e9680266d64b2b2e527b6fea395710b2b4fdb78c7` was reused without rerun. The onset-aligned comparison MP4 SHA-256 is `cec97e5577b4bd5f7d8bb4a2c0ff6cfaf9ae5d7064ec99643d56aabd933354f2`; camera, scene, owner target, local lights, signed-ambient material response, and exact pixel parity remain open. Detailed audit: `vfx-object-duration-owner-integer-tick-audit-2026-08-13.md`. Status is `diagnostic-only-open-camera-scene-owner-target`, not parity.
- 2026-08-07 shared emitter rand15 stream correction v76: primary Toolset decompilation proves that particle construction and Fountain/Explosion/Lightning helpers consume the same thread-runtime `rand15` state and do not reseed it per emitter. The package runtime now hands one deterministic stream through emitters in source update order and across substeps/ticks; the former emitter-index/node-name hash was removed. The change is shared by every emitter family and host category, including placeables, with no row/model/Fireball condition. Exact retail initial state and unrelated prior RNG consumers remain open and were not guessed or image-tuned. Focused and related suites pass 170/170; seven broad fixtures regenerate and their comparison/resource/row-44/row-50/row-210 gates pass. The updated VFX module was emitted, while full `nest build` remains nonzero on the unrelated existing Area proof-script type error. Static preflight passed without playback hooks. Fresh Web v76 contains exactly one playback, no retry, loop or overlap, empty proof blockers, clean post-roll, and zero final particles across all six emitters; Web SHA-256 is `9300ae50f8a8ca5afb619dc4bba3fd8122cced555438b7bcf0068cdc2141b585`. Saved NWN SHA-256 `f6414e0d184131ce74836c208e6334bb62cf023c502725223758185dd41f0983` was reused without rerun. Comparison MP4 SHA-256 is `d5c223fd6980f4d344e01c0704a71d84091e99122fd7ca333beface7b46fa766`; comparison PNG SHA-256 is `6215636a4dc88f244ad6d09c2dbe1741028059166a11ddbc0e5435080b1526e4`. The unsupported per-emitter random-pattern divergence is closed globally, while the oversized overexposed Web core, broad red tail, exact camera/actors/scene, per-frame retail timing, and exact retail RNG state remain open. Detailed audit: `vfx-shared-rand15-stream-audit-2026-08-07.md`. Status remains `diagnostic-only-single-playback-open-context-gaps`, not parity.
- 2026-08-07 shared WOK AABB parser correction v77: admitted Toolset decompilation plus exact `nwtoolset.exe` disassembly proves the ASCII record's six float32 bounds, leaf face index, optional plane-direction mask, preorder two-child topology, and Aurora-derived dominant-axis mask bits. The common parser now accepts seven or eight fields, reconstructs children, preserves source masks, derives omitted masks with native strict comparison/tie behavior, and emits diagnostics for truncated/trailing trees and invalid leaf face indices. The HTTP collision contract retains the new fields additively while accepting older v1 packets. The change is shared by all collision-enabled VFX and hosts, including placeables, with no effect-specific conditions. Focused WOK tests pass `11/11` and schema tests pass `11/11`. Native source-AABB traversal remains unproven and was not guessed; the flat triangle route remains profile-gated. This slice changes metadata and diagnostics only, so no Web playback or NWN rerun was performed. Detailed audit: `vfx-wok-aabb-tree-parser-audit-2026-08-07.md`.
- 2026-08-07 shared WOK AABB runtime correction v78: the admitted Toolset call path resolves `PartEmitter -> scene slot +0x2c -> FUN_00a7b8bc -> PartAABB -> FUN_00a51e10 -> FUN_00a51950`. The common area collision resolver now maps the query into node-local space, traverses only decoded AABB leaves, applies Aurora's six direction bits and plane-mask child order, and shortens one shared endpoint so later equal contacts replace earlier contacts exactly as the source route does. Packets without a complete decoded tree retain the explicit flat compatibility path; Aurora's separate world-scene plane BSP is not invented. The change is shared across VFX families and placeable hosts with no row/model/Fireball conditions. WOK tests pass `13/13`, schema tests `11/11`, shared runtime tests `95/95`, TypeScript passes, and the backend production build passes. The source scene was regenerated and fresh Web v78 records one playback, no loop/overlap, proof-gate PASS, clean post-roll, zero final particles, and `1208` collision queries with `83` applied hits and landed Chunk ids `2,3,4,8`; Web MP4 SHA-256 is `eece02bebf60f24ed62859efe2682a92186862fd517136b229478db0a0fb7a34`. The approved NWN MP4 was reused without rerun. Comparison MP4 SHA-256 is `f6fd88eba3b69d606fb012c3a6ece251acbcc183dedb2019fde84afeba3faa1c`; comparison PNG SHA-256 is `c948f0a08d7f1e6a6f921dbe6357e31dfb9fa31d9be6b24c7efd3a34e12a722a`. Exact camera/actors/full room and saved-NWN per-frame runtime timestamps remain open, and the peak/tail still differ visibly, so status is `diagnostic-only-single-playback-open-context-gaps`, not parity. Detailed audit: `vfx-wok-aabb-runtime-traversal-audit-2026-08-07.md`.
- 2026-08-07 shared PLT RGBA/generated-target correction v79: admitted Toolset decompilation proves uniform row reversal for all seven retail palettes, including `pal_armor01`; active `fs_pltgen` writes the full sampled RGBA value; and the generated target uses ordinary `GL_RGBA` with repeat, linear magnification, trilinear minification, mipmaps, and anisotropy. A deterministic KEY/BIF generator now verifies the active `nwn_base.key` and all seven TGA hashes, builds all ten native-row-reversed RGBA tables, and records retail provenance. The shared decoder, placeable/VFX texture loader, creature bridge, item decoder, and creature-wizard swatches now use one RGBA source; palette alpha is preserved and generated PLT textures use `THREE.NoColorSpace`. There are no row, model, host, or Fireball conditions. The generated module SHA-256 is `0AF1F3256C88DFC2D080064651404548DD19F9487D5FF793BCB30643F54FF9BA` and is byte-identical across consecutive runs. Focused decoder/loader tests pass `52/52`, focused creature PLT tests pass `2/2`, TypeScript passes on both sides, and both production builds pass. The active-retail `pal_armor01` versus generated layer-2 RGBA proof has zero mismatched channels and zero maximum delta; PNG SHA-256 is `E68C84CDC72A98B6A720B81F7AE472B8D3C6CE4DB82197D36265611794288453`. No NWN process or VFX playback was started; visual parity remains open until an exact saved retail PLT oracle exists. Detailed audit: `vfx-plt-palette-generated-target-audit-2026-08-07.md`.
- 2026-08-07 shared Chunk material routing v80: admitted Toolset decompilation confirms that a `chunkName` particle renders an ordinary MDL model and retains the model's own material inputs. The canonical Chunk renderer previously rebound only one diffuse `textureReference`; every cloned Chunk instance now uses the same shared Aurora model-material adapter as placeables, creatures, items, tiles, and ordinary model previews. Inline diffuse/normal/specular/roughness/height/emissive slots, alpha metadata, self-illumination, and source-material lighting therefore follow one path. Canonical Chunk binding disables guessed single-texture fallback and emits sorted resolved/unresolved references with a distinct partial-binding status. The TDD regression began red with an undefined normal map and is now green; the canonical renderer passes `68/68`, shared texture mapping passes `43/43`, frontend TypeScript passes, and the frontend production build passes. Fresh Web v80 records exactly one playback, no loop/overlap, proof-gate PASS, zero terminal particles, and clean post-roll; Web MP4 SHA-256 is `159495202e1c073ebeef74763aef0e471738a722ef679694466cc057618ca47b`. Saved NWN SHA-256 `f6414e0d184131ce74836c208e6334bb62cf023c502725223758185dd41f0983` was reused without rerun. Comparison MP4 SHA-256 is `357b2faa251d6d342d330fe450f19d4cedd331c5741b559a0951752db332c501`. Per-resource MTR/SHD/TXI sidecar transport, exact camera/actors/full room, per-frame NWN runtime timestamps, and matched visual parity remain open. Detailed audit: `vfx-chunk-shared-material-routing-audit-2026-08-07.md`.
- 2026-08-07 shared Chunk MTR/SHD/TXI transport v81: the catalog package already preserves parsed MTR state, reachable SHD source graphs, TXI bindings, and GLB source-material resrefs, but canonical Chunk creation passed only texture objects. Every cloned Chunk material now receives the same `auroraMaterial` and `textureBindings` package as ordinary placeable/model rendering through the shared adapter. Initial rendering, deferred Chunk loading, deferred texture refresh, area-collision refresh, and nested Chunk runtimes preserve it; there are no row, model, emitter, host, or Fireball conditions. The regression began red with no `auroraMaterialContractSource` and is now green. Canonical rendering passes `69/69`, workspace integration `16/16`, shared texture mapping `43/43`, and frontend TypeScript passes. The full build is nonzero on the unrelated `useWorkspaceCommandSignal.ts` `productionSource` type error; mutation stops in its initial dry run on the unrelated viewer authentication test. No Web/NWN playback was made because the saved row-22 Fireball has no Chunk MTR/SHD/TXI sidecar and would not exercise this change. Matched sidecar-material proof remains open. Detailed audit: `vfx-chunk-mtr-shd-txi-transport-audit-2026-08-07.md`.
- 2026-08-07 shared TXI cycle frame clock v82: admitted Toolset decompilation proves that `proceduretype cycle` advances on the strict `1/fps < accumulator` threshold, resets the accumulator instead of carrying residual time, wraps over `numx * numy`, and accepts at most one update per global renderer frame. Aurora Web now stores cycle state by shared `THREE.Texture` identity and drives placeables, doors, items, creatures, and canonical VFX Chunk instances from one workspace frame serial. Dev telemetry exposes frame, accumulator, serial, advance count, object ids, and texture references. TDD began with three failures and now passes the shared/canonical set `130/130`, creature/ordinary-model checks `2/2`, and asynchronous ordinary-placeable integration `1/1`; TypeScript and the frontend production build pass. No Web/NWN playback was made because row 22 does not exercise a multi-frame TXI cycle. Detailed audit: `vfx-txi-cycle-global-frame-clock-audit-2026-08-07.md`.
- 2026-08-07 shared retail SSAO scene pass v83: admitted Toolset decompilation, exact disassembly, active retail shaders, and the saved SSAO-enabled settings profile recover the three-pass SSAO route, eight-by-six probe schedule, source constants, two diagonal blurs, and final `GL_ZERO`/`GL_SRC_ALPHA` receiver multiplication. `AuroraRetailBloomPass` now applies the shared perspective scene stage before raw-gamma VFX, bloom, postprocess, and output gamma; unsupported orthographic cameras skip explicitly. Proof telemetry exposes active status, intensity, quality, pass count, blend, order, and source hashes. Focused tests pass `47/47`, broader shared regression `207/207`, TypeScript and production build pass, and a real perspective WebGL preflight reaches proof-gate PASS. Fresh Web v83 contains exactly one playback, no loop/overlap, clean post-roll, and zero terminal particles; MP4 SHA-256 is `42660b0e09ce299e438d0dc286aa760a2a388900c935dc1720bb5e75e8c2680d`. The saved NWN oracle was reused without rerun. Comparison MP4 SHA-256 is `2744aecaa5d3feb6b3385ecc457a6664ffa4887644041c4a2d42332a6e256c18`. Exact camera, actors, owner/target, full room, per-frame NWN runtime timestamps, and Fireball image composition remain open, so this is implementation evidence rather than parity. Detailed audit: `vfx-retail-ssao-runtime-contract-audit-2026-08-07.md`.
- 2026-08-13 shared particle deadspace camera-orientation correction v17: primary Toolset decompilation proves that Fountain reset composes spread first, consumes no additional RNG for `deadspace`, left-multiplies a camera-relative correction quaternion, and derives velocity from the corrected local-Z axis. The backend runtime now carries explicit Aurora-space camera context through schema, application service, cache identity, and the shared emitter state machine; missing context preserves deterministic output and emits one unresolved-camera diagnostic per tick. There is no row, model, emitter-name, or host-category condition, so canonical placeable emitters use the same runtime rule. Focused backend verification passes `153/153`, focused frontend proof/renderer verification passes `106/106`, the regenerated row-50 source-scene gate passes, and both production builds pass. Static no-playback preflight passed every observability ledger. Fresh Web MP4 SHA-256 is `9a09cbf72291d10b406d5557388aadbb3b9fdcb9f06ff6ea99f3644e1c4016e7`; it records one trigger, no loop/overlap, completed playback, clean post-roll, zero terminal draws, and an empty proof blocker manifest. Saved NWN SHA-256 `a1a9df16a51579f01ac1399435ceb0c770b4887e684b7e4364198cabbeb84bd8` was reused without rerun. Onset-aligned comparison SHA-256 is `9749fa6f9b0fa95d74506385af2848c88230a278e3ca042b79a46070ab1e3461`; contact-sheet SHA-256 is `8ea000b6b8f2850ec0b09955391887228d407c736ac5249128ff609e5485739c`. The deadspace semantic is closed globally, while the tall-column lifetime, lower-body tail concentration, luminance/environmental spill, exact camera, and retail RNG state remain open. Detailed audit: `vfx-particle-deadspace-camera-orientation-audit-2026-08-13.md`. Status is `matched-with-gaps`, not parity.
- 2026-08-13 shared particle midpoint/percent renderer correction v18: primary Toolset decompilation proves that the textured-particle draw path preserves midpoint and percent controller families but evaluates particle-age RGB, alpha, X size, and Y size only as clamped linear `start -> end` lanes. The frontend source-MDL path no longer applies its former invented piecewise midpoint sampler to final pixels; source fields, timelines, transport, provenance, and explicit ignored-by-renderer telemetry remain preserved. The correction is shared by canonical VFX and placeable hosts, with no effect-, row-, model-, or host-specific branch. The frontend VFX renderer suite passes `124/124`, the backend runtime suite passes `100/100`, and the frontend production build passes. No playback was started for this source-level correction; a fresh Web capture paired with its saved NWN MP4 remains required before visual status changes. Detailed audit: `vfx-particle-mid-percent-renderer-semantics-audit-2026-08-13.md`. Status is `implementation-verified-proof-open`, not parity.
- 2026-08-13 `plc_t04` post-change placeable proof v61: fresh Aurora Web evidence records one deterministic 10-second, 80-frame playback at 8 fps for exactly three persistent source roots, one trigger per root, no loop or overlap, settled assets, exact host composition, passing draw/shader/proof gates, and an empty blocker manifest. The approved NWN MP4 was reused without rerun. Web SHA-256 is `DCE4518415077B0A51D89DCD39C6D68835313E6B733149FAB09B9BB45545E359`; side-by-side SHA-256 is `6A11F3AA9AE884823BB0D78A005DA4B88BF5D282AEA94A93D293F5649FB7F5B3`; contact-sheet SHA-256 is `A0FF7955FE273037692AC6356D5DA7CFE224F165E550EF6E19CB1C478D861A81`. The current placeable path remains functional, but the Web flame is visibly narrower, paler, and has weaker surrounding spill; camera and visible scene contents are unmatched. `plc_t04` contains no midpoint/percent fields, so this is a representative post-change placeable regression and not the still-open direct visual midpoint witness. Detailed audit: `vfx-placeable-plc-t04-v61-mid-percent-proof-audit-2026-08-13.md`. Status is `matched-with-gaps`, not parity.
- 2026-08-13 custom SHD platform-policy closure v19: the shared MTR adapter already refused geometry-shader graphs and custom programs on `THREE.SkinnedMesh` before replacing the source material. The full implementation audit now records those existing fail-closed lanes instead of listing them as open work. A dedicated skinned regression verifies `skinned-mesh-binding-unavailable` and proves the original material remains installed; the adjacent geometry regression retains `geometry-shader-unsupported`. This is a platform-policy and diagnosability closure, not a pixel change, so no Web or NWN playback was started.
- 2026-08-13 row-68 current-runtime proof v19: the static preflight passed runtime identity, canonical host graph, asset settlement, draw, particle-shader, and proof gates before playback, with no playback hooks and an empty blocker manifest. Fresh Aurora Web SHA-256 is `443177f6bc73069ebf1b136a1942e137dec8900c3512157e0d9881d0dd8609d5`; it records exactly one fire-and-forget playback, no loop or overlap, source-light receiver response, clean post-roll, and zero terminal particles for source maxima `66/16/64/45`. Saved NWN SHA-256 `672b1d798c35df688770683a42071ba6e4a79829d162f276d345246dc88ec01c` was reused without rerun. The onset-aligned comparison SHA-256 is `8d47f3e64a7c1b39cae4a31c031a5b84d17fbfef45f01cb2d8d20d42905f04de`; contact-sheet SHA-256 is `61bc3713942cbb31af63dacb7707c22de443ca0b23dc9add5834571d3cd1e04d`. The `+0.117 s` encoded-pixel visible-span delta is descriptive only because the exact NWN target, camera, screen scale, scene lighting, and receiver geometry are not recovered. No image-derived tuning was made. Detailed audit: `vfx-row68-current-runtime-v19-proof-audit-2026-08-13.md`. Status is `valid-single-playback-matched-with-open-context-gaps`, not parity.
- 2026-08-13 row-68 exact source-scene/BIC-target proof v20: the fixture now admits the exact source module and Area, all four tiles, fourteen textures, the exact first-PC BIC target, and the source GIT innkeeper. Static preflight passed identity, host, settlement, draw, shader, camera-calibration, and proof gates before playback. Exactly one new Web playback was recorded; Web SHA-256 is `b18168bd9f61218b6b733434b98e7651ffbc28de60331155e2d1b1e4cd52b5a1`. The saved NWN SHA-256 `672b1d798c35df688770683a42071ba6e4a79829d162f276d345246dc88ec01c` was reused without rerun. Side-by-side SHA-256 is `79bd9aa2bed0e2cdf0a29c4c51f96caa4804bea812eda7cc5e01d53a3fde86fc`; contact-sheet SHA-256 is `58dd612833006c41aa45f2e8444c80a8da51fb257eb82ed2589cd1e960c987f0`. Scene composition and target identity are closed, while exact retail camera matrix, room material/lighting response, vertical effect placement, and encoded timing remain open. Detailed audit: `vfx-row68-source-scene-bic-target-proof-audit-2026-08-13.md`. Status is `matched-with-gaps`, not parity.
- 2026-08-13 object-attachment orientation and native target-node namespace closure v22: primary retail-client disassembly proves that source zero selects `CAurBehaviorAttachNoOrientation` through Gob attach mode 3, while nonzero selects full `CAurBehaviorAttach` through mode 0. It also proves distinct namespaces: creature root/`impact`/`head`, placeable exact-prefix `_ground`/`_impact`/`_head_hit`, and door exact-prefix `grnd`/`impc`/`hhit`. The shared resolver now selects the target category explicitly, requires exact placeable/door prefixes, preserves scale, updates the anchor after actor-animation sampling, and reports full attachment telemetry. Row 68 v20 is historical because it used `headconjure`; current v22 uses native creature `head`. Focused object-attachment plus comparison-runner regressions pass `43/43`; TypeScript passes. Static preflight passes all ledgers. Fresh Web MP4 has one playback, no retry/loop/overlap, clean post-roll, zero terminal particles, and SHA-256 `19B4385CB564BF193428D84A60E9697B160B446B457DBE9351534590070A19FE`. Saved NWN SHA-256 `672B1D798C35DF688770683A42071BA6E4A79829D162F276D345246DC88EC01C` was reused without rerun. Comparison MP4 SHA-256 is `CA5B07137F035480BF8838A71BB1360A7098FCD9B705666EBD048FEA333E8648`; contact-sheet SHA-256 is `BCF07E78A2240A09593AFCD22A17D4E3EC9AE4EA591C5B50384B97C23CFE3142`. Attachment height is corrected; exact camera, emitter-space composition, room material/lighting response, `+0.250 s` encoded timing delta, matched nonzero-orientation, exact-prefix placeable, and exact-prefix door proof remain open. Detailed audit: `vfx-object-attachment-orient-with-ground-audit-2026-08-13.md`. Status remains `matched-with-gaps`, not parity.
- 2026-08-13 row-44 exact BIC source-actor proof-scene closure: the approved NWN summary identifies the exact `avriemail461.bic` SHA-256 `5EDC2CE0232DAD09DB9649401DB55CCB9956ECFE98FF172E152A11AC5C1D7CC0`, and `vb44shot.nss` proves the source/target facing and three-metre separation. The broad fixture now reuses the shared BIC parser/part-based `pfh0/a_fa` actor, retains the exact `c_yinnkeep/a_ba` target, all four HAK-backed tiles, fourteen textures, and source-backed Area/tile lighting. The owner/target comparison blocker is removed; camera and scene material response remain open. The contract test began red and passes after generation. V23 Web SHA-256 `BA08D6867DC7622CDC51DAAD505B93C76707E28ACC26103FA32989DDF0D76395` is one valid current-runtime playback but predates actor injection. V29 static PNG SHA-256 `1797A968CB8763B148FE22789BE40552AD8C6F233328E4CF673FFA1DF4AC1CFC` validates both actors with no playback hooks and a passing proof gate. No second row-44 playback was made. The saved NWN oracle is only `7.764 FPS` while Explosion lifetime is `0.1 s`, so early-burst pixel tuning remains forbidden. Detailed audit: `vfx-row44-exact-bic-source-actor-proof-scene-audit-2026-08-13.md`. Status remains `matched-with-gaps`, not parity.
- 2026-08-13 exact-prefix placeable impact proof: reverse ordered-HAK resolution selects `witcher2/placeables.2da#779`, `q_placeables/plc_lancrak1.mdl`, and native node `lancrak1_impact`. The accepted NWN oracle records one trigger and one target with no retry/loop; SHA-256 is `F12B6DC289554E3AC30D9A9F873B9A075FD255ED35062E756BA376A6402E628F` and is reused without rerun. Final Web static preflight calls no playback hook and passes every observability gate. Fresh Web v3 records one trigger, no loop/overlap, clean post-roll, zero terminal draws, and SHA-256 `CF7D377CBFD51C29B006D964D9ACFF104ADE55062F1683503BF0805CAF4E7D37`. The onset-aligned comparison SHA-256 is `CA50DD6AEEA4AE1A2EB59951813819DEC7FFD05241B87B44D86490AFFE5C5395`; contact-sheet SHA-256 is `5D3BE407BEF66EF2DFF218F79A44552672141E97F45CC7E2DA3F42B600E6F59B`. Exact-prefix placeable `Impact` attachment is established. Offline frame-delta review attributes the stronger Web late phase to source-backed `Smoke01`, not repeated playback or the now-zero `souldust` lane; reversing alpha or shortening source lifetime remains forbidden without new primary Aurora evidence. Exact camera, scene/material response, late-phase luminance, exact retail RNG, and pixel parity remain open. Detailed audit: `vfx-placeable-object-attachment-proof-audit-2026-08-13.md`. Status is `matched-with-gaps`, not parity.
- The handoff file should be updated together with the manifest if the eventual capture layout differs from the recommended `backend/test/fixtures/vfx-retail/<fixtureId>/` structure.

## Runtime observability acceptance (2026-07-19)

- [x] Development-only VFX report defines runtime identity, host graph, asset settlement, draw, playback, proof, and overlay sections.
- [x] `GET /health.runtimeBuild` has an additive provenance contract; unset release values remain null and block proof acceptance.
- [x] The catalog preview exposes the report and a final-profile gate for the visual overlay.
- [x] Capture an exact fresh PNG/MP4 only after the report is settled with zero blockers; attached as `backend/docs/aurora-reverse/evidence/vfx-placeable-post-debt-2026-07-14/post-debt-plc-i06-canonical-host-v51-observability-gated.frame.json` plus its PNG/MP4. This is an accepted guarded Web proof, not a matched retail parity claim.

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
