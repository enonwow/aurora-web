# VFX Failed Assumptions

## 2026-06-17T07:10:56.441Z - vfx-dev-plc-zlc-o45-demo-entrypoint-capture-retry-success

No new product-visible VFX assumption failed in iteration 231. The iteration 230 infrastructure_runtime_health blocker for fresh Magic Mouth Demo entry-point capture was rechecked after /api/v1/health returned 200 OK, and the assigned CDP retry succeeded. The capture clicked the real Workspace Mode Magic Mouth Demo button from /app, landed on /app?demo=plc_zlc_o45_magic_mouth, selected plc_zlc_o45 with VFX subtype, and recorded app-native draw metrics: renderStatus=preview_only_asset_ready, canvasNonblank=true, objectPixels=160, drawParticles=1, vertices=60, drawLanes=source-mdl/Fountain/Lighten/Normal, textureStatus=applied, placeholderOutput=false, fallbackOutput=true disclosed. This clears the previous fresh-entrypoint-capture infrastructure blocker for this retry only; it remains non-canonical local/app evidence. Retail runtime/render/capture/comparison evidence, the plc_zlc_o45 retail oracle, and the chunk Type 9 real resource/source/capture oracle are still missing. canonicalParityPromoted=false.

## 2026-06-17T07:01:30.257Z - vfx-dev-plc-zlc-o45-demo-entrypoint-integration-blocked-by-runtime-health

A product-visible integration assumption was only partially satisfied in iteration 230. The app now has a Workspace Mode Magic Mouth Demo entry point, and focused tests prove it opens the clean /app?demo=plc_zlc_o45_magic_mouth route with plc_zlc_o45 and VFX subtype query state. However, the fresh screenshot/frame capture from clicking that entry point could not be completed because API-dependent auth/bootstrap failed before render: /_aurora/v1/auth/login returned HTTP 500, direct backend auth/health probes reset with ECONNRESET/empty reply, aurora-backend-dev stayed in health: starting, and logs showed EADDRINUSE on 0.0.0.0:3000. This is recorded as infrastructure_runtime_health, not VFX semantic/render debt. Iteration 229 remains the latest fresh Magic Mouth app screenshot/frame evidence: renderStatus=preview_only_asset_ready, objectPixels=150, drawParticles=1, vertices=60, drawLanes=source-mdl/Fountain/Lighten/Normal, textureStatus=applied, placeholderOutput=false, fallbackOutput=true disclosed. Retail runtime/render/capture/comparison evidence, the plc_zlc_o45 retail oracle, and the chunk Type 9 real resource/source/capture oracle are still missing. canonicalParityPromoted=false.

## 2026-06-17T02:20:40.575Z - vfx-dev-plc-zlc-o45-clean-demo-route

No new product-visible rendering assumption failed in iteration 229. A demo-integration assumption was corrected: the direct app Magic Mouth evidence previously required hidden implementation query parameters (mode=placeables_mode&placeable=plc_zlc_o45&subtype=vfx), which was not a clean aurora-like demo route. App workspace mode resolution now maps ?demo=plc_zlc_o45_magic_mouth to Placeables Mode, and WorkspaceMockLayout initializes the plc_zlc_o45 VFX filter from that demo query. The fresh /app?demo=plc_zlc_o45_magic_mouth capture reports finalRoute preserved, appVfxDrawMetricsStatus=ready, drawParticles=1, vertices=60, drawLanes=source-mdl/Fountain/Lighten/Normal, textureStatus=applied, objectPixels=150, placeholderOutput=false, and explicit local visibility fallback disclosure. This remains non-canonical local/app preview evidence; retail runtime/render/capture/comparison evidence, the plc_zlc_o45 retail oracle, and the chunk Type 9 real resource/source/capture oracle are still missing. canonicalParityPromoted=false.

## 2026-06-17T01:44:16.294Z - vfx-dev-plc-zlc-o45-app-direct-draw-metrics

No new product-visible rendering assumption failed in iteration 228. A local evidence omission from iteration 227 was corrected: the app route visibly rendered plc_zlc_o45 but direct app workspace draw-particle/vertex/lane counters were not exposed, so the packet had to link back to the catalog runner for draw metrics. WorkspaceCanvasViewport now reads the actual single-object VFX preview root and publishes app-native draw metrics on the runtime container. The fresh /app?mode=placeables_mode&placeable=plc_zlc_o45&subtype=vfx capture reports appVfxDrawMetricsStatus=ready, drawParticles=1, vertices=60, drawLanes=source-mdl/Fountain/Lighten/Normal, textureStatus=applied, objectPixels=453, placeholderOutput=false, and explicit local visibility fallback disclosure. This remains non-canonical local/app preview evidence; retail runtime/render/capture/comparison evidence, the plc_zlc_o45 retail oracle, and the chunk Type 9 real resource/source/capture oracle are still missing. canonicalParityPromoted=false.

## 2026-06-17T01:17:12.590Z - vfx-dev-plc-zlc-o45-app-placeables-demo-slice

A product-visible app-route assumption failed and was corrected in iteration 227: preserving the plc_zlc_o45 payload-ready inspector state was not enough to make the product/demo Placeables canvas visible. The first direct /app?mode=placeables_mode&placeable=plc_zlc_o45&subtype=vfx capture selected the Magic Mouth VFX row and reported preview_only asset ready with 5 textures, but the screenshot was grid-only with 0 app object pixels because WorkspaceCanvasViewport framed the ordinary placeable anchor instead of the VFX preview root. The smallest Aurora-local fix preserved query-driven app mode/selection through login and framed single-object VFX placeables previews on the actual VFX preview root. The after-fix app route produced a visibly inspectable Magic Mouth plume with 7217 screenshot-derived object pixels while preserving zlc_o45.mdl, source-mdl glow, Fountain, Lighten, fxpa_flare, textureStatus=applied, placeholderOutput=false, and explicit local visibility fallback disclosure. This remains non-canonical local/app preview evidence; retail runtime/render/capture/comparison evidence, the plc_zlc_o45 retail oracle, and the chunk Type 9 real resource/source/capture oracle are still missing. canonicalParityPromoted=false.

## 2026-06-17T00:12:51.713Z - vfx-dev-plc-zlc-o45-catalog-preview-draw-metrics-evidence

No new product/runtime visual assumption failed in iteration 226. The iteration 225 local blocker that CatalogVfxPreviewRunner did not expose draw-particle and vertex counts was corrected by reading the visible emitter scene graph after the Magic Mouth framing fix and publishing local draw metrics in the DOM/frame packet. The live plc_zlc_o45 catalog route now reports renderStatus=ready, canvasNonblank=true, objectPixels=1906, drawParticles=1, vertices=60, drawLanes=source-mdl/Fountain/Lighten/Normal, zlc_o45.mdl source-mdl Fountain/Lighten/fxpa_flare payload ready, textureStatus=applied, placeholderOutput=false, and explicit local visibility fallback disclosure. This remains non-canonical local preview evidence; retail runtime/render/capture/comparison evidence and the plc_zlc_o45 retail oracle are still missing. canonicalParityPromoted=false.

## 2026-06-17T00:02:34.851Z - vfx-dev-plc-zlc-o45-magic-mouth-visible-preview-first-fix

A product-visible local assumption failed and was corrected in iteration 225: DOM/readback evidence from the plc_zlc_o45 catalog route was not enough, because the first fresh screenshot was visually grid-dominant and Magic Mouth was barely visible despite source-mdl payload ready, renderStatus=ready, canvasNonblank=true, and 441 grid-hidden object pixels. The smallest Aurora-local fix frames the catalog preview camera on the actual source-mdl emitter bounds and keeps grid/tile overlays hidden for the final VFX preview capture. The after-fix route produced a visibly inspectable amber Magic Mouth cluster with 2195 object pixels while preserving zlc_o45.mdl, source-mdl glow, Fountain, Lighten, fxpa_flare, textureStatus=applied, placeholderOutput=false, and explicit local visibility fallback disclosure. Remaining blockers are retail runtime/render/capture/comparison evidence for canonical parity plus catalog preview draw-particle and vertex counts not yet exposed in this route. canonicalParityPromoted=false.

## 2026-06-16T23:04:23.880Z - vfx-dev-runtime-health-retail-blocker-crosscheck-guard

No product/runtime visual assumption failed in iteration 224 because no retail capture, backend API probe, or local visual route was rerun. The new runtime-health retail-blocker crosscheck guard passed on the first direct and npm-script executions after a repeatability hardening pass that allows the same guard to validate both pre-checkpoint iteration 223 state and post-checkpoint iteration 224 state. The crosscheck proves iteration 222 dependency classification and iteration 223 anti-rerun alignment remain consistent with the current retail blocker packet, capture setup validation packet, handoff manifest, and visual audit backlog/latest advisory surfaces. Backend/API health remains infrastructure_runtime_health only; it cannot close Type 9, plc_zlc_o45, retail-human-review, retail runtime/render/capture/comparison blockers, and canonicalParityPromoted=false.


## 2026-06-16T22:33:44.933Z - vfx-dev-current-worker-directive-completion-alignment-guard-after-runtime-health

No product/runtime visual assumption failed in iteration 223 because no retail capture, backend API probe, local visual route, or completed classification work was rerun. A guard-maintenance assumption was corrected: the generic worker-directive alignment checker originally expected blocker-preservation booleans from older blocker/handoff packet shapes, while the iteration 222 runtime-health classification claim preserves Type 9, plc_zlc_o45, and retail-human-review blockers through its blockers list and humanReviewNeeded oracle. The checker now accepts those durable blocker surfaces, and final direct plus npm-script alignment artifacts pass with failedCheckCount=0. The still-published Worker v3 iteration 222 coordinator assignment is already satisfied by durable iteration 222 evidence. Backend/API failures remain infrastructure_runtime_health for API-dependent lanes, backend health remains non-canonical, and canonicalParityPromoted=false.

## 2026-06-16T22:23:14.032Z - vfx-dev-runtime-health-dependency-classification-guard

No product/runtime visual assumption failed in iteration 222 because no retail capture, no backend API probe, and no completed local visual semantic route were rerun. A guard-oracle wording assumption did need correction before checkpointing: the first dependency-classification run treated coordinator health-watch status field drift too narrowly and naively flagged the required negative phrase not_vfx_semantic_render_debt as if it were a positive VFX debt classification. The guard now accepts current healthy-watch field variants and only fails when a lane positively classifies backend failure as VFX semantic/render debt. Final direct and npm-script artifacts classify migration-continuity, retail blocker/capture setup/handoff, current local diagnostic gates, and missing retail parity evidence as default-backend independent; catalog/dev-route preview evidence and future API-dependent handoff/checks are conditional backend dependencies. Any backend/API failure there is infrastructure_runtime_health, not VFX semantic/render debt. Backend health remains non-canonical and canonicalParityPromoted=false; Type 9, plc_zlc_o45, retail-human-review, and retail runtime/render/capture/comparison blockers remain unresolved.

## 2026-06-16T22:14:35.256Z - vfx-dev-worker-v3-migration-continuity-guard

No product/runtime visual assumption failed in iteration 221 because no retail capture and no completed local visual semantic route were rerun. The Worker v3 migration-continuity guard confirms this thread is not approval-stuck and can write ordinary local repo updates. Durable iteration 220 is complete across state, registry, run log, context, failed assumptions, and the Worker v2 migration-continuity artifact. The latest coordinator report still points at Worker v2 (019ed25d-4626-7551-ad04-3992a94af4f7), so it is recorded as stale against durable evidence; Worker v3 (019ed27c-a9a7-7283-807a-998fe3787e6e) is the active implementation lane, while Worker v2 and legacy Worker 019ec73b-bac3-70f2-b9f3-159678a7c0ef are history-only. Type 9, plc_zlc_o45, retail-human-review, and retail runtime/render/capture/comparison blockers remain unresolved, and canonicalParityPromoted=false. Retail runtime/render/capture/comparison evidence remains required before canonical parity can be reconsidered.

## 2026-06-16T22:09:14.780Z - vfx-dev-worker-v2-migration-continuity-guard

No product/runtime visual assumption failed in iteration 220 because no retail capture and no completed local visual semantic route were rerun. The refreshed VFX Domain Coordinator assignment vfx-worker-v2-iteration-220-migration-continuity-guard generated 2026-06-16T23:41:10.8768170+02:00 records Worker v2 (019ed25d-4626-7551-ad04-3992a94af4f7) as the active implementation lane and legacy Worker 019ec73b-bac3-70f2-b9f3-159678a7c0ef as approval-stuck/history-only. The migration-continuity guard verifies iteration 219 is durably complete, iteration 218 handoff evidence remains satisfied, no fresh directive targets the legacy worker, Type 9 and plc_zlc_o45 retail-human-review blockers remain unresolved, and canonicalParityPromoted=false. Retail runtime/render/capture/comparison evidence remains required before canonical parity can be reconsidered.


## 2026-06-16T21:14:37.357Z - vfx-dev-current-worker-directive-completion-alignment-guard

No product/runtime visual assumption failed in iteration 219 because no retail capture and no completed local visual semantic route were rerun. The coordinator still publishes vfx-worker-iteration-218-retail-evidence-handoff-manifest, but iteration 218 already durably completed that handoff assignment. The generic alignment guard now parses the current coordinator assignment, finds the matching completed claim/run-log entry, validates state/registry/context/failed-assumptions alignment, checks the supporting handoff artifact, and confirms all semantic checks remain true with canonicalParityPromoted=false. This prevents duplicate handoff reruns while preserving the retail blockers for Type 9, plc_zlc_o45, and all retail-human-review items.

## 2026-06-16T20:57:03.123Z - vfx-dev-retail-evidence-handoff-manifest

No product/runtime visual assumption failed in iteration 218 because no retail capture and no completed local visual semantic route were rerun. The worker followed the refreshed VFX Domain Coordinator assignment vfx-worker-iteration-218-retail-evidence-handoff-manifest generated 2026-06-16T22:54:45.9147826+02:00 and produced a non-canonical retail evidence handoff manifest from iteration 217 setup validation evidence. The manifest maps 11 blocked subjects to missing prerequisite categories/files, pack paths or catalog packet requirements, priority, and next human/operator action. It keeps Type 9 and plc_zlc_o45 as explicit high-priority blockers, reports captureReadyCount=0 and fixedSubjectCount=0, and keeps canonicalParityPromoted=false. Retail runtime/render/capture/comparison evidence remains required before canonical parity can be reconsidered.

## 2026-06-16T20:30:33.683Z - vfx-dev-retail-capture-setup-validation-packet

No product/runtime visual assumption failed in iteration 217 because no retail capture or completed local semantic visual route was rerun. The worker followed the refreshed VFX Domain Coordinator assignment vfx-worker-iteration-217-retail-capture-setup-validation-packet generated 2026-06-16T22:14:10.4547009+02:00 and produced a non-canonical retail capture setup validation packet/checklist. The guard found 11 capture subjects (10 manifest fixtures plus catalog plc_zlc_o45), 11 still blocked, 6 missing-pack subjects, 5 placeholder-pack subjects, and 190 missing prerequisites. This preserves the exact blockers for chunk/progfx Type 9, catalog plc_zlc_o45, and retail-human-review items. Retail runtime/render/capture/comparison evidence remains required for canonical parity; canonicalParityPromoted=false.

## 2026-06-16T20:03:00.000Z - vfx-dev-worker-directive-completion-alignment-guard

No product/runtime visual assumption failed in iteration 216 because no completed visual semantic route was rerun. The checkpoint records a control-plane/loop-memory guard: the current VFX Domain Coordinator report still dispatches iteration-215 blocker freshness work, but durable state, registry, run log, context, failed assumptions, and the iteration-215 freshness artifact prove that assignment is already completed with zero failed checks. The guard prevents accidental reruns of completed local visual/blocker work while preserving the exact retail blockers: chunk/progfx Type 9 remains top priority, catalog plc_zlc_o45 remains retail-human-review blocked, retail-human-review items remain unresolved, and canonical parity remains false until retail runtime/render/capture/comparison evidence exists.


## 2026-06-16T19:24:00.000Z - vfx-dev-retail-evidence-blocker-freshness-guard

No product/runtime visual assumption failed in iteration 215 because no completed local visual semantic work was rerun. A freshness/checker implementation assumption was corrected: the retail blocker packet generator originally treated only dispatcher status=running as domainDispatchVerified, but the refreshed iteration-215 assignment is status=sent. The generator now accepts both sent and running as valid dispatcher-assignment states, after which the regenerated packet and freshness guard passed. The final dry-run still reports 10 blocked retail fixtures, 5 missing packs, 5 placeholder packs, 0 ingestible packs, and 0 canonical promotion attempts. The freshness guard proves blocker priorities remain explicit, chunk/progfx Type 9 remains top priority, catalog plc_zlc_o45 remains second, and no retail-human-review item is marked fixed. Retail runtime/render/capture/comparison evidence remains required for canonical parity.


## 2026-06-16T18:58:30.000Z - vfx-dev-retail-blocker-packet-after-local-guardrails

No new product/runtime visual assumption failed in iteration 214. The worker followed the Domain Coordinator branch for the no-actionable-local-gap case and produced a precise retail blocker packet rather than repeating completed local semantic evidence. The packet generator confirmed the refreshed retail-only backlog remains blocked by missing retail evidence: the dry-run found 10 blocked manifest fixtures, 5 missing packs, 5 placeholder packs, 0 ingestible packs, and 0 canonical promotion attempts. The packet lists 11 prioritized blockers, keeps chunk/progfx Type 9 first, includes catalog plc_zlc_o45, records 18 missing evidence kinds, and preserves humanReviewNeeded/canonical blockers. One npm-script invocation used an incorrect ../backend output path and was rejected by filesystem permissions before writing outside the workspace; the corrected repo-relative invocation passed and produced the npm-script artifact. Retail runtime/render/capture/comparison evidence remains required for canonical parity, including real progfx Type 9 resource/source row and retail chunk capture plus retail zlc_o45 Magic Mouth placement, fxpa_flare appearance, particle timing, Lighten intensity, and framebuffer comparison.


## 2026-06-16T18:31:00.000Z - vfx-dev-catalog-plc-zlc-o45-guardrails-local-diagnostic-gate

No new product/runtime visual assumption failed in iteration 213. A fixture-quality implementation assumption was corrected: catalog plc_zlc_o45 guardrails existed as iteration 211 artifacts and loop-memory prose, but they were not yet enforced by the aggregate local diagnostic gate. The new guard accepts the existing BOM-marked backend snapshot, verifies the deterministic catalog route, zlc_o45.mdl source-mdl Fountain/Lighten payload, fxpa_flare texture provenance, orange-to-yellow alpha fade, visibility floor, material fallback, finite in-view bounds, screenshot/frame/package/threshold consistency, and objectPixelsWithoutGrid=441 above threshold 80. The aggregate local diagnostic gate now surfaces the catalog guard as a seventh command with zero failed checks and zero canonical promotion attempts. Retail runtime/render/capture/comparison evidence remains required for canonical parity, including exact zlc_o45 Magic Mouth placement, original fxpa_flare appearance, particle timing, Lighten intensity, and framebuffer comparison.


## 2026-06-16T17:59:30.000Z - vfx-dev-visual-audit-refresh-after-catalog-plc-zlc-o45

No new product/runtime visual assumption failed in iteration 212. A local audit-refresh implementation assumption did need correction before checkpointing: the first refresh pass treated only status=completed claims as complete and therefore undercounted current local evidence, then the second pass still missed chunk/progfx Type 9 because that historical fixture was present in the durable run log rather than the current registry fixture projection. The refresher was corrected to accept completed-prefixed local diagnostic statuses and merge run-log worker-iteration evidence as a fallback. The final refreshed audit covers 11 items, including catalog plc_zlc_o45 and chunk Type 9, with 11 local render PASS, 11 semantic PASS, 11 humanReviewNeeded retail blockers preserved, and zero canonical promotion attempts. Retail runtime/render/capture/comparison evidence remains required for canonical parity.

## 2026-06-16T17:30:00.000Z - vfx-dev-catalog-plc-zlc-o45-preview-semantic-oracle-visual-runner-correlation

Failed local implementation assumption recorded and corrected in iteration 211: the real plc_zlc_o45 catalog preview backend package and source-mdl Fountain/Lighten metadata were not sufficient to produce user-visible Placeables Mode pixels. Initial deterministic captures for http://127.0.0.1:5173/dev/catalog-vfx-preview?templateId=plc_zlc_o45&time=0.32&seed=211 had renderPackageStatus=ready, sourceMdlPayloadReady=true, modelFileName=zlc_o45.mdl, emitterType=Fountain, emitterBlendMode=Lighten, particleCount=10, and textureStatus=applied, but objectPixelsWithoutGrid=0. A second assumption that an initial source-surface visibility fallback would survive async texture application was also false; diagnostics showed materialFallbackApplied=false. The implementation now reapplies the source-color fallback after texture load and uses a stronger source-surface catalog visibility floor, producing canvasNonblank=true and objectPixelsWithoutGrid=441 in the final deterministic capture. A human-review gap remains for retail runtime/render/capture/comparison evidence for exact zlc_o45 Magic Mouth placement, original fxpa_flare texture appearance, particle timing, Lighten intensity, and framebuffer comparison. Local screenshots, backend package snapshots, semantic thresholds, source/decomp invariants, and passing tests remain non-canonical until full retail evidence exists.

## 2026-06-16T16:05:30.000Z - vfx-dev-contract-visual-evidence-semantic-completeness-gate

No new failed product/runtime assumption was recorded in iteration 210. The aggregate local contract visual evidence gate was hardened so fixture evidence must include explicit visualSemanticOracle, all-true visualSemanticChecks, localOnlyNotCanonical, and a structured humanReviewNeeded gap that blocks canonical parity. The post-rerun aggregate evidence passed across 10 fixtures with 189 visual semantic checks, zero missing oracles, zero failed visual semantic checks, zero missing human-review gaps, and zero canonical promotion attempts. A first deterministic cot_fx01 Fountain route at time=0.65 seed=210 rendered nonblank and passed local thresholds but failed the local Fountain particle-size semantic envelope check, so it was rejected as correct visual output. The same deterministic fixture/time rerun at seed=203 passed render-contract/correlation, local thresholds, and all Fountain visualSemanticChecks. A human-review gap remains for retail cot_fx01 playback timing, random frame seeding, material-level frame offset behavior, and framebuffer comparison, plus the existing chunk Type 9 real resource/source/retail evidence gap. Local screenshots, render contracts, thresholds, source/decomp invariants, aggregate semantic completeness, and passing tests remain non-canonical until full retail runtime/render/capture/comparison evidence exists.


## 2026-06-16T15:52:40.000Z - vfx-dev-plt-layer-semantic-stability-oracle-visual-runner-correlation

No new failed product/runtime assumption was recorded in iteration 209. The local PLT layer semantic stability oracle was strengthened and tested: seed 209 rendered four visible textured_quad PLT layer records with renderedPltLayers=["skin","hair","cloth1","cloth2"], renderedColorR=[1,0.62,0.12,0.82], renderedColorG=[0.66,0.32,0.48,0.12], renderedColorB=[0.42,0.08,1,0.9], renderedAlpha=[0.78,0.6866666666666666,0.5933333333333334,0.5], renderedParticleSizeX=[0.18,0.18,0.18,0.18], renderedParticleSizeY=[0.28,0.28,0.28,0.28], renderedAtlasFrames=[6,9,12,15], UV quarter-grid rectangles, normal/SrcAlphaFactor/OneMinusSrcAlphaFactor/AddEquation material state, local thresholds passed, and the two-frame report comparing seeds 209 and 210 passed every PLT stability check including semantic checks every frame, palette order every frame, color vectors every frame, opacity every frame, particle-size envelope every frame, atlas-frame order every frame, UV-rect grid every frame, spatial order every frame, material/atlas every frame, and framing every frame. An initial comparison against older PLT artifacts was rejected because those older correlations lacked the newly required per-frame semantic check fields; this was treated as expected fixture-quality hardening, not a product/runtime failure. A human-review gap remains for retail PLT palette/profile/layer lookup evidence plus runtime/render/capture/comparison evidence for exact layer colors, material binding, palette-selected texture behavior, and framebuffer comparison. Local screenshots, render contracts, thresholds, source/decomp invariants, stability reports, and passing tests remain non-canonical until full retail runtime/render/capture/comparison evidence exists.

## 2026-06-16T15:40:20.000Z - vfx-dev-fireball-detonate-semantic-stability-oracle-visual-runner-correlation

No new failed product/runtime assumption was recorded in iteration 208. The local Fireball detonate semantic stability oracle was strengthened and tested: seed 208 rendered two visible textured_quad Fireball records with renderedPositionX=[-0.23069661390119606,0.2691755783396772], renderedPositionY=[-0.1818959858166771,0.19398498889472113], renderedVelocityX=[-0.03,0.03], renderedVelocityY=[0.06,0.11], renderedAlpha=[0.78,0.5], renderedParticleSizeX=[0.4206966139011961,0.3791755783396772], renderedParticleSizeY=[0.5499924170667516,0.41009904557308324], renderedColorR=[1,1], renderedColorG=[0.68,0.18], renderedColorB=[0.18,0.1], yellow-orange then red-orange color order, normal/SrcAlphaFactor/OneMinusSrcAlphaFactor/AddEquation material state, local thresholds passed, and the two-frame report comparing seeds 189 and 208 passed every Fireball stability check including semantic checks every frame, draw-mode route every frame, warm color order every frame, alpha fade every frame, outward motion every frame, particle size every frame, atlas/material every frame, particle order every frame, framing every frame, and two visible components every frame. A human-review gap remains for retail visual capture/comparison of exact VFX_FNF_FIREBALL detonate timing, pre/post burst expansion, palette, particle lifetime, and framebuffer comparison. Local screenshots, render contracts, thresholds, source/decomp invariants, stability reports, and passing tests remain non-canonical until full retail runtime/render/capture/comparison evidence exists.

## 2026-06-16T15:31:12.000Z - vfx-dev-mode2-semantic-stability-oracle-visual-runner-correlation

No new failed product/runtime assumption was recorded in iteration 207. The local Mode2/Lighten semantic stability oracle was strengthened and tested: seed 207 rendered four visible textured_quad punch-through records with renderedPositionX=[-0.3,-0.1,0.09999999999999998,0.3], renderedPositionY=[-0.11,0.11,-0.11,0.11], renderedAlpha=[0.78,0.6866666666666666,0.5933333333333334,0.5], renderedParticleSizeX=[0.40994001520418066,0.3847069187452001,0.3521216781574241,0.36308200343788777], renderedParticleSizeY=[0.3781038223781955,0.35037155225250427,0.3689185212520279,0.4047746118501251], cyan/yellow/cyan/yellow color alternation, custom Mode2_Lighten/SrcAlphaFactor/OneFactor/AddEquation material state, local thresholds passed, and the two-frame report comparing seeds 186 and 207 passed every Mode2 stability check including semantic checks every frame, path every frame, color alternation every frame, alpha fade every frame, particle-size envelope every frame, blend/material every frame, particle order every frame, and framing every frame. A human-review gap remains for retail runtime/render/capture/comparison evidence for punch-through versus Mode2_Lighten alpha-test, depth-write/depth-test, blend-factor behavior, exact particle-size/opacity/color grading, and framebuffer comparison. Local screenshots, render contracts, thresholds, source/decomp invariants, stability reports, and passing tests remain non-canonical until full retail runtime/render/capture/comparison evidence exists.

## 2026-06-16T15:21:14.000Z - vfx-dev-effectbeam-semantic-stability-oracle-visual-runner-correlation

No new failed product/runtime assumption was recorded in iteration 206. The local EffectBeam semantic stability oracle was strengthened and tested: seed 206 rendered five visible BODY_NODE_CHEST textured_quad beam records with renderedPositionX=[-0.62,-0.31,0,0.30999999999999994,0.62], renderedPositionY=[-0.08,0.008284271247461894,0.07999999999999999,0.1282842712474619,0.15999999999999998], renderedAlpha=[0.78,0.71,0.64,0.5700000000000001,0.5], renderedParticleSizeY=[0.1356195540189645,0.11123285246552629,0.10054031810747346,0.12024354660814035,0.13956635856412966], orange/yellow/orange/yellow/orange fire color alternation, local thresholds passed, and the two-frame report comparing seeds 193 and 206 passed every EffectBeam stability check including semantic checks every frame, segment spacing every frame, alpha fade every frame, particle-size waist every frame, fire-color alternation every frame, and framing every frame. A human-review gap remains for retail visual capture/comparison of exact VFX_BEAM_FIRE beam volume, source-target path, BODY_NODE_CHEST anchoring, temporary EffectBeam row 210 runtime behavior, exact particle-size/opacity/color grading, and framebuffer comparison. Local screenshots, render contracts, thresholds, source/decomp invariants, stability reports, and passing tests remain non-canonical until full retail runtime/render/capture/comparison evidence exists.

## 2026-06-16T15:14:58.000Z - vfx-dev-linked-chain-semantic-stability-oracle-visual-runner-correlation

No new failed product/runtime assumption was recorded in iteration 205. The local linked-chain semantic stability oracle was strengthened and tested: seed 205 rendered five visible linked_textured_quad records with renderedPositionX=[-0.39,-0.195,0,0.195,0.39], renderedPositionY=[-0.1563853728808725,0.033817379391526924,0.1563853728808725,-0.0338173793915269,-0.1563853728808725], renderedAlpha=[0.78,0.71,0.64,0.5700000000000001,0.5], renderedParticleSizeX=[0.24255500154264284,0.19270725571729508,0.18549041144329165,0.23217708295720768,0.2598433137505387], renderedParticleSizeY=[0.26696559512551526,0.2707578025873759,0.32022593131716565,0.33810142583491176,0.29646300277408477], cyan/yellow/cyan/yellow/cyan color alternation, local thresholds passed, and the two-frame report comparing seeds 195 and 205 passed every linked-chain stability check including semantic checks every frame, color alternation every frame, alpha fade every frame, particle-size envelope every frame, particle order every frame, segment spacing every frame, and framing every frame. A human-review gap remains for retail visual capture/comparison plus source-backed runtime/render-contract evidence for linked-chain contiguous segment-buffer behavior, segment joins, source/target path, runtime tick progression, exact particle-size/opacity/color grading, and framebuffer comparison. Local screenshots, render contracts, thresholds, source/decomp invariants, stability reports, and passing tests remain non-canonical until full retail runtime/render/capture/comparison evidence exists.

## 2026-06-16T15:05:29.994Z - vfx-dev-p2p-semantic-stability-oracle-visual-runner-correlation

No new failed product/runtime assumption was recorded in iteration 204. The local P2P gravity semantic stability oracle was strengthened and tested: seed 204 rendered seven visible textured_quad arc records with renderedPositionX=[-0.48,-0.32,-0.16000000000000003,0,0.15999999999999992,0.32000000000000006,0.48], renderedPositionY=[-0.2,0.05055555555555558,0.1888888888888889,0.21500000000000002,0.12888888888888891,-0.06944444444444448,-0.38], renderedAlpha=[0.78,0.7333333333333334,0.6866666666666666,0.64,0.5933333333333334,0.5466666666666666,0.5], renderedParticleSizeX=[0.21962020930945528,0.18331158686037735,0.14183031002516888,0.1599695784421102,0.20939609744189014,0.212906305386315,0.1650173044123674], renderedParticleSizeY=[0.21450099879296672,0.18013731829811025,0.20803861349068276,0.2546234344369998,0.2471269138529782,0.1972585166309984,0.1829120122825687], local thresholds passed, and the two-frame report comparing seeds 194 and 204 passed every P2P stability check including semantic checks every frame, color alternation every frame, alpha fade every frame, particle-size envelope every frame, particle order every frame, and framing every frame. A human-review gap remains for retail visual capture/comparison plus source-backed runtime evidence for P2P reference-node mapping, source/target anchors, gravity/drag state, tick progression, exact particle-size/opacity/color grading, and final render contract. Local screenshots, render contracts, thresholds, source/decomp invariants, stability reports, and passing tests remain non-canonical until full retail runtime/render/capture/comparison evidence exists.


## 2026-06-16T14:46:24.804Z - vfx-dev-cot-fx01-fountain-semantic-progression-oracle-visual-runner-correlation

No new failed product/runtime assumption was recorded in iteration 203. The local cot_fx01 Fountain semantic progression oracle was strengthened and tested: seed 203 rendered six visible textured_quad Fountain atlas records with renderedAtlasFrames=[4,7,10,13,0,3], renderedAlpha=[0.78,0.724,0.668,0.612,0.556,0.5], renderedParticleSizeX=[0.4579830944141471,0.42455540397592506,0.3590204474391059,0.33875116442447484,0.37041611790270007,0.37956328802075123], renderedParticleSizeY=[0.5156766415969546,0.4371070488128708,0.4255356721247721,0.4677971146454452,0.4666398358537168,0.39263175722832644], UV quarter-grid rectangles, local thresholds passed, and the two-frame report comparing seeds 196 and 203 passed every Fountain progression check including semantic checks every frame, alpha fade every frame, particle-size envelope every frame, UV grid every frame, material/atlas every frame, framing every frame, and atlas frame-index advancement. A human-review gap remains for retail visual capture/comparison or source-backed playback oracle for cot_fx01 random frame start, fps=12 frame advancement, lifetime frame progression, material-level frame offset behavior, exact particle-size/opacity grading, and framebuffer comparison. Local screenshots, render contracts, thresholds, source/decomp invariants, progression reports, and passing tests remain non-canonical until full retail runtime/render/capture/comparison evidence exists.


## 2026-06-16T14:31:09.605Z - vfx-dev-row50-semantic-stability-oracle-visual-runner-correlation

No new failed product/runtime assumption was recorded in iteration 202. The local Row50 semantic stability oracle was strengthened and tested: seed 191 rendered two visible textured_quad death-effect records with purple/pale color placement, renderedAlpha=[0.78,0.5], renderedParticleSizeX=[0.4597779914966829,0.34460532363153423], renderedParticleSizeY=[0.4947393868451146,0.3503324962524409], and the two-frame report comparing iteration 191 and 202 passed every Row50 stability check including semantic checks every frame, alpha fade every frame, and first purple impact particle larger than the second pale follow-up particle every frame. A seed 202 exploratory rerun rendered nonblank and semantic but was not accepted as final evidence because the local threshold profile failed connectedComponentCount and bounds. A human-review gap remains for retail visual capture/comparison of exact VFX_IMP_DEATH palette, timing, shape, particle-size grading, and scripted EffectVisualEffect row 50 runtime behavior. Local screenshots, render contracts, thresholds, source/decomp invariants, stability reports, and passing tests remain non-canonical until full retail runtime/render/capture/comparison evidence exists.

## 2026-06-16T14:24:04.035Z - vfx-dev-row68-semantic-stability-oracle-visual-runner-correlation

No new failed product/runtime assumption was recorded in iteration 201. The local Row68 semantic stability oracle was strengthened and tested: seed 201 rendered two visible textured_quad healing records with warm/turquoise color placement, renderedAlpha=[0.78,0.5], renderedParticleSizeX=[0.45946056687414605,0.35503022259948847], renderedParticleSizeY=[0.5081837932421199,0.35366405943057966], and the two-frame report comparing seeds 192 and 201 passed every Row68 stability check including semantic checks every frame, alpha fade every frame, and first warm impact particle larger than the second turquoise healing particle every frame. A human-review gap remains for retail visual capture/comparison of exact VFX_IMP_HEALING_M palette, timing, shape, particle-size grading, and dm_visualeffect row 68 runtime behavior. Local screenshots, render contracts, thresholds, source/decomp invariants, stability reports, and passing tests remain non-canonical until full retail runtime/render/capture/comparison evidence exists.

## 2026-06-16T14:16:43.320Z - vfx-dev-plt-layer-uv-grid-stability-semantic-oracle-visual-runner-correlation

No new failed product/runtime assumption was recorded in iteration 200. The PLT UV-grid two-frame stability oracle was strengthened and tested: seed 200 rendered atlas frames [13, 0, 3, 6] with UV rectangles U0=[0.25, 0, 0.75, 0.5], V0=[0.75, 0, 0, 0.25], U1=[0.5, 0.25, 1, 0.75], V1=[1, 0.25, 0.25, 0.5], and the two-frame report comparing seeds 199 and 200 passed all PLT layer color/UV-grid stability checks. A human-review gap remains for retail PLT palette/profile/layer lookup evidence plus runtime/render/capture/comparison evidence for exact layer colors, material binding, palette-selected texture behavior, and retail UV/material atlas binding. Local screenshots, render contracts, thresholds, source/decomp invariants, stability reports, and passing tests remain non-canonical until full retail runtime/render/capture/comparison evidence exists.

## 2026-06-16T14:11:00.039Z - vfx-dev-plt-layer-uv-rect-grid-semantic-oracle-visual-runner-correlation

No new failed product/runtime assumption was recorded in iteration 199. The PLT UV-rect-grid semantic oracle was strengthened and tested: rendered atlas frames [12, 15, 2, 5] mapped to UV rectangles U0=[0, 0.75, 0.5, 0.25], V0=[0.75, 0.75, 0, 0.25], U1=[0.25, 1, 0.75, 0.5], V1=[1, 1, 0.25, 0.5]; analyzer/render-contract UV checks, PLT UV-grid semantics, local thresholds, and visual correlation passed. The self-test includes an intentional wrong-UV-cell negative case to ensure UV geometry fails semantic correctness while palette and atlas-frame order remain valid. A human-review gap remains for retail PLT palette/profile/layer lookup evidence plus runtime/render/capture/comparison evidence for exact layer colors, material binding, palette-selected texture behavior, and retail UV/material atlas binding. Local screenshots, render contracts, thresholds, source/decomp invariants, and passing tests remain non-canonical until full retail runtime/render/capture/comparison evidence exists.

## 2026-06-16T13:56:08.823Z - vfx-dev-plt-layer-atlas-frame-order-semantic-oracle-visual-runner-correlation

Failed local oracle calibration recorded and corrected in iteration 198: the first PLT layer atlas-frame-order oracle assumed seed-independent absolute frames [10,13,0,3], but the deterministic route at seed=198 produced renderedAtlasFrames=[11,14,1,4] while remaining nonblank and render-contract-consistent. The oracle was corrected to require four unique frame ids in 0..15 stepping by +3 modulo 16 in skin/hair/cloth1/cloth2 order, with rendered atlas-frame vectors and per-record atlas-frame attribute buckets matching the render contract. The rerun passed PLT shape/palette/color/opacity/particle-size/atlas-frame/spatial/material/diagnostic/framing semantic checks, local thresholds passed, loopStatus=plt_layer_atlas_frame_order_semantic_oracle_visual_runner_correlation_checkpointed_canonical_retail_blocked, and canonical parity remained blocked. A human-review gap remains for retail PLT palette/profile/layer lookup evidence plus runtime/render/capture/comparison evidence for exact layer colors, opacity/fade, atlas frame/material binding, and palette-selected texture behavior.

## 2026-06-16T13:48:53.970Z - vfx-dev-plt-layer-particle-size-semantic-oracle-visual-runner-correlation

No new failed implementation assumption was recorded in iteration 197. The local PLT layer particle-size semantic oracle was strengthened and tested: deterministic output rendered four visible textured_quad PLT layer records, drawParticles=4, renderedVertices=24, renderedParticleSizeX=[0.18,0.18,0.18,0.18], renderedParticleSizeY=[0.28,0.28,0.28,0.28], each local layer preserved x=0.18 and y=0.28 size vectors, palette order/color/opacity/spatial/material/atlas/diagnostic/framing semantic checks passed, local thresholds passed, loopStatus=plt_layer_particle_size_semantic_oracle_visual_runner_correlation_checkpointed_canonical_retail_blocked, and canonical parity remained blocked. A human-review gap remains for retail PLT palette/profile/layer lookup evidence plus runtime/render/capture/comparison evidence for exact layer colors, opacity/fade, particle-size grading, and material binding.

## 2026-06-16T13:36:12.842Z - vfx-dev-cot-fx01-particle-size-semantic-oracle-visual-runner-correlation

Failed local oracle calibration recorded and corrected in iteration 196: the first cot_fx01 Fountain particle-size-envelope check used yMin=0.40, but the deterministic local fixture produced renderedParticleSizeY=[0.5212024338874902,0.4404607990925558,0.4214788673104187,0.462666429600611,0.46844933199969624,0.39855502578563784] with a valid render-contract-matched minimum of 0.398555. The envelope was corrected to x=[0.32,0.47] y=[0.39,0.55] and the same deterministic route was rerun successfully. Final output rendered six visible textured_quad Fountain atlas particles, drawParticles=6, renderedVertices=36, renderedParticleSizeX=[0.4562255759131284,0.42848381135821156,0.36249866091281735,0.3363462610619482,0.36588452459257687,0.3799832929070717], frame playback/trajectory/UV-grid/alpha-fade/particle-size/material/atlas/order/framing semantic checks passed, local thresholds passed, loopStatus=cot_fx01_particle_size_semantic_oracle_visual_runner_correlation_checkpointed_canonical_retail_blocked, and canonical parity remained blocked. A human-review gap remains for retail visual capture/comparison or source-backed playback oracle for cot_fx01 random frame start, fps=12 frame advancement, lifetime frame progression, material-level frame offset behavior, exact particle-size grading, and framebuffer comparison.

## 2026-06-16T13:01:21.892Z - vfx-dev-linked-chain-particle-size-semantic-oracle-visual-runner-correlation

No new failed implementation assumption was recorded in iteration 195. The local linked-chain particle-size-envelope semantic oracle was strengthened and tested: deterministic output rendered five visible linked_textured_quad records, drawParticles=5, renderedVertices=30, renderedParticleSizeX=[0.24781870415474602,0.19804795063795666,0.1825660046338859,0.22555545874246555,0.259867360595053], renderedParticleSizeY=[0.271257701915979,0.26656188508892265,0.314095956545398,0.3396123323999075,0.30325477482846613], all size values stayed inside the local envelope x=[0.18,0.27] y=[0.25,0.35] with visible per-record variation, path/order/spacing, alpha-fade, color alternation, material/atlas/diagnostic/framing semantic checks passed, local thresholds passed, loopStatus=linked_chain_particle_size_semantic_oracle_visual_runner_correlation_checkpointed_canonical_retail_blocked, and canonical parity remained blocked. A human-review gap remains for retail visual capture/comparison plus source-backed runtime/render-contract evidence for linked-chain contiguous segment-buffer behavior, segment joins, exact particle-size grading, source/target path, and runtime tick progression.

## 2026-06-16T12:55:26.960Z - vfx-dev-p2p-particle-size-semantic-oracle-visual-runner-correlation

No new failed implementation assumption was recorded in iteration 194. The local P2P gravity particle-size-envelope semantic oracle was strengthened and tested: deterministic output rendered seven visible textured_quad arc records, drawParticles=7, renderedVertices=42, renderedParticleSizeX=[0.21997940869889562,0.19000791169432144,0.14440419047089048,0.1544006476669482,0.20438295083673108,0.2162794109016618,0.17150791634578907], renderedParticleSizeY=[0.22128330825863046,0.181272210190631,0.20175340185219842,0.2507355357872329,0.25170917388538455,0.2031535064589576,0.18091183663549945], all size values stayed inside the local envelope x/y=[0.14,0.27] with visible per-record variation, source-to-target arc path/spacing/velocity, alpha-fade, color alternation, material/atlas/order/framing semantic checks passed, local thresholds passed, loopStatus=p2p_particle_size_semantic_oracle_visual_runner_correlation_checkpointed_canonical_retail_blocked, and canonical parity remained blocked. A human-review gap remains for retail visual capture/comparison plus source-backed runtime evidence for P2P reference-node mapping, gravity/drag state, exact particle-size grading, source/target anchors, tick progression, and final render contract.

## 2026-06-16T12:45:38.615Z - `vfx-dev-effectbeam-particle-size-semantic-oracle-visual-runner-correlation`

No new failed implementation assumption was recorded in iteration 193. The local EffectBeam particle-size-waist semantic oracle was strengthened and tested: deterministic output rendered five visible BODY_NODE_CHEST VFX_BEAM_FIRE textured_quad records, drawParticles=5, renderedVertices=30, renderedParticleSizeX=[0.34,0.34,0.34,0.34,0.34], renderedParticleSizeY=[0.13797780050574274,0.11538652042669283,0.10000143373961441,0.11585384008671173,0.1381824927668511], constant X beam width, tapered Y-size waist at the center segment, source-to-target order/spacing, alpha-fade, fire color alternation, material/atlas/order/framing semantic checks passed, local thresholds passed, loopStatus=`effectbeam_particle_size_semantic_oracle_visual_runner_correlation_checkpointed_canonical_retail_blocked`, and canonical parity remained blocked. A human-review gap remains for retail visual capture/comparison of exact VFX_BEAM_FIRE beam volume, source-target path, BODY_NODE_CHEST anchoring, particle-size/width grading, and temporary EffectBeam row 210 runtime behavior.

## 2026-06-16T12:36:32.024Z - `vfx-dev-row68-particle-size-semantic-oracle-visual-runner-correlation`

No new failed implementation assumption was recorded in iteration 192. The local Row68 healing particle-size semantic oracle was strengthened and tested: deterministic output rendered two visible textured_quad healing records, drawParticles=2, renderedVertices=12, renderedParticleSizeX=[0.45800180820546466,0.3605040618482127], renderedParticleSizeY=[0.5156056166328766,0.3570686695166596], first warm impact particle larger than the second turquoise healing particle, position/color/alpha/material/atlas/order/framing semantic checks passed, local thresholds passed, loopStatus=`row68_particle_size_semantic_oracle_visual_runner_correlation_checkpointed_canonical_retail_blocked`, and canonical parity remained blocked. A human-review gap remains for retail visual capture/comparison of exact VFX_IMP_HEALING_M shape, timing, palette, particle-size grading, and dm_visualeffect row 68 runtime behavior.

## 2026-06-16T12:27:02.898Z - `vfx-dev-row50-particle-size-semantic-oracle-visual-runner-correlation`

No new failed implementation assumption was recorded in iteration 191. The local Row50 death particle-size semantic oracle was strengthened and tested: deterministic output rendered two visible textured_quad death-effect records, drawParticles=2, renderedVertices=12, renderedParticleSizeX=[0.4597779914966829,0.34460532363153423], renderedParticleSizeY=[0.4947393868451146,0.3503324962524409], first purple impact particle larger than the second pale follow-up particle, position/color/alpha/material/atlas/order/framing semantic checks passed, local thresholds passed, loopStatus=`row50_particle_size_semantic_oracle_visual_runner_correlation_checkpointed_canonical_retail_blocked`, and canonical parity remained blocked. A human-review gap remains for retail visual capture/comparison of exact VFX_IMP_DEATH shape, timing, palette, particle-size grading, and scripted EffectVisualEffect row 50 runtime behavior.

## 2026-06-16T12:05:44.795Z - `vfx-dev-plt-layer-opacity-semantic-oracle-visual-runner-correlation`

Failed local implementation/oracle assumption recorded and corrected in iteration 190: the first PLT layer-opacity oracle assumed all four rendered layer records should be unit alpha. The deterministic fixture disproved that assumption while remaining nonblank and contract-consistent: renderedAlpha=[0.78,0.6866666666666666,0.5933333333333334,0.5], material opacity=1, alphaAttributeMin=0.5, alphaAttributeMax=0.7799999713897705. The oracle was corrected to require unit material opacity plus a strict local layer alpha fade from skin through cloth2, rendered alpha vectors matching draw-record order, and uniform alpha attribute buckets per layer record. The rerun passed PLT shape/palette/color/opacity/spatial/material/atlas/diagnostic/framing semantic checks, local thresholds passed, loopStatus=`plt_layer_opacity_semantic_oracle_visual_runner_correlation_checkpointed_canonical_retail_blocked`, and canonical parity remained blocked. A human-review gap remains for retail PLT palette/profile/layer lookup evidence plus runtime/render/capture/comparison evidence for exact layer colors, opacity/fade, and material binding.

## 2026-06-16T11:43:30.000Z - `vfx-dev-fireball-color-order-semantic-oracle-visual-runner-correlation`

No new failed implementation assumption was recorded in iteration 189. The local Fireball detonate warm color-order semantic oracle was strengthened and tested: deterministic output rendered two visible textured_quad fireball records, drawParticles=2, renderedVertices=12, renderedColorR=[1,1], renderedColorG=[0.68,0.18], renderedColorB=[0.18,0.1], renderedAlpha=[0.78,0.5], first particle yellow-orange, second particle red-orange, outward/upward motion, draw-mode route, alpha-fade/material/atlas/diagnostic/framing semantic checks passed, local thresholds passed, loopStatus=`fireball_color_order_semantic_oracle_visual_runner_correlation_checkpointed_canonical_retail_blocked`, and canonical parity remained blocked. A human-review gap remains for retail visual capture/comparison of exact VFX_FNF_FIREBALL detonate timing, pre/post burst expansion, palette, and particle lifetime.

## 2026-06-16T11:25:19.235Z - `vfx-dev-p2p-color-alternation-semantic-oracle-visual-runner-correlation`

No new failed implementation assumption was recorded in iteration 188. The local P2P gravity color-alternation semantic oracle was strengthened and tested: deterministic output rendered seven visible textured_quad arc records, drawParticles=7, renderedVertices=42, renderedColorR=[0.4,1,0.4,1,0.4,1,0.4], renderedColorG=[0.74,0.7,0.74,0.7,0.74,0.7,0.74], renderedColorB=[1,0.22,1,0.22,1,0.22,1], renderedAlpha=[0.78,0.7333333333333334,0.6866666666666666,0.64,0.5933333333333334,0.5466666666666666,0.5], source-to-target arc path/spacing/velocity, blue/yellow/blue/yellow/blue/yellow/blue color alternation, alpha-fade/material/atlas/diagnostic/framing semantic checks passed, local thresholds passed, loopStatus=`p2p_color_alternation_semantic_oracle_visual_runner_correlation_checkpointed_canonical_retail_blocked`, and canonical parity remained blocked. A human-review gap remains for retail visual capture/comparison plus source-backed runtime evidence for P2P reference-node mapping, source/target anchors, gravity/drag state, tick progression, and final render contract.

## 2026-06-16T11:13:06.809Z - `vfx-dev-effectbeam-color-alternation-semantic-oracle-visual-runner-correlation`

No new failed implementation assumption was recorded in iteration 187. The local EffectBeam fire-color alternation semantic oracle was strengthened and tested: deterministic output rendered five visible BODY_NODE_CHEST VFX_BEAM_FIRE textured_quad records, drawParticles=5, renderedVertices=30, renderedColorR=[1,1,1,1,1], renderedColorG=[0.34,0.88,0.34,0.88,0.34], renderedColorB=[0.08,0.24,0.08,0.24,0.08], renderedAlpha=[0.78,0.71,0.64,0.5700000000000001,0.5], source-to-target path/order/spacing, orange/yellow/orange/yellow/orange color alternation, alpha-fade/material/atlas/diagnostic/framing semantic checks passed, local thresholds passed, loopStatus=`effectbeam_color_alternation_semantic_oracle_visual_runner_correlation_checkpointed_canonical_retail_blocked`, and canonical parity remained blocked. A human-review gap remains for retail visual capture/comparison for exact VFX_BEAM_FIRE beam volume, source-target path, BODY_NODE_CHEST anchoring, and temporary EffectBeam row 210 runtime behavior.

## 2026-06-16T10:58:05.739Z - `vfx-dev-mode2-color-alternation-semantic-oracle-visual-runner-correlation`

No new failed implementation assumption was recorded in iteration 186. A transient Chrome DevTools Protocol startup failure occurred on the first deterministic capture attempt and was not counted as evidence; the same deterministic Mode2/Lighten route was rerun successfully. The recovered local Mode2 color-alternation semantic oracle rendered four visible textured_quad punch-through particles, drawParticles=4, renderedVertices=24, renderedColorR=[0.12,1,0.12,1], renderedColorG=[0.7,0.92,0.7,0.92], renderedColorB=[1,0.18,1,0.18], renderedAlpha=[0.78,0.6866666666666666,0.5933333333333334,0.5], renderedBlendModeRawToken=Mode2_Lighten, path/color-order/alpha/particle-size/blend/material/atlas/order/framing semantic checks passed, local thresholds passed, loopStatus=`mode2_color_alternation_semantic_oracle_visual_runner_correlation_checkpointed_canonical_retail_blocked`, and canonical parity remained blocked. A human-review gap remains for retail runtime/render/capture/comparison evidence for exact punch-through Mode2 color ordering, particle-size grading, and blend/depth behavior.

## 2026-06-16T10:49:34.000Z - `vfx-dev-cot-fx01-alpha-fade-semantic-oracle-visual-runner-correlation`

No new failed implementation assumption was recorded in iteration 185. The local cot_fx01 Fountain alpha-fade semantic oracle was strengthened and tested: deterministic output rendered six visible textured_quad atlas particles, drawParticles=6, renderedVertices=36, renderedAtlasFrames=[2,5,8,11,14,1], renderedAlpha=[0.78,0.724,0.668,0.612,0.556,0.5], rising trajectory, atlas playback, UV-grid, alpha-fade/material/order/framing semantic checks passed, local thresholds passed, loopStatus=`cot_fx01_alpha_fade_semantic_oracle_visual_runner_correlation_checkpointed_canonical_retail_blocked`, and canonical parity remained blocked. A human-review gap remains for retail visual capture/comparison or source-backed playback oracle for cot_fx01 Fountain atlas random frame start, fps=12 frame advancement, lifetime frame progression, material-level frame offset behavior, and exact opacity fade timing.

## 2026-06-16T10:44:34.000Z - `vfx-dev-linked-chain-alpha-fade-semantic-oracle-visual-runner-correlation`

No new failed implementation assumption was recorded in iteration 184. The local linked-chain alpha-fade semantic oracle was strengthened and tested: deterministic output rendered five visible linked_textured_quad records, drawParticles=5, renderedVertices=30, renderedAlpha=[0.78,0.71,0.64,0.5700000000000001,0.5], left-to-right path, cyan/yellow color alternation, alpha-fade/material/atlas/order/framing semantic checks passed, local thresholds passed, loopStatus=`linked_chain_alpha_fade_semantic_oracle_visual_runner_correlation_checkpointed_canonical_retail_blocked`, and canonical parity remained blocked. A human-review gap remains for retail visual capture/comparison plus source-backed runtime/render-contract evidence for linked-chain contiguous segment-buffer behavior, segment joins, source/target path, and runtime tick progression.

## 2026-06-16T10:38:34.000Z - `vfx-dev-fireball-alpha-fade-semantic-oracle-visual-runner-correlation`

No new failed implementation assumption was recorded in iteration 183. The local fireball detonate alpha-fade semantic oracle was strengthened and tested: deterministic output rendered two visible textured_quad fireball records, drawParticles=2, renderedVertices=12, renderedAlpha=[0.78,0.5], warm color pair, outward/upward motion, alpha-fade/material/atlas/order/framing semantic checks passed, local thresholds passed, loopStatus=`fireball_alpha_fade_semantic_oracle_visual_runner_correlation_checkpointed_canonical_retail_blocked`, and canonical parity remained blocked. A human-review gap remains for retail visual capture/comparison of exact VFX_FNF_FIREBALL detonate timing, pre/post burst expansion, palette, and particle lifetime.

## 2026-06-16T10:34:34.000Z - `vfx-dev-row68-alpha-fade-semantic-oracle-visual-runner-correlation`

No new failed implementation assumption was recorded in iteration 182. The local row68 alpha-fade semantic oracle was strengthened and tested: deterministic output rendered two visible textured_quad healing records, drawParticles=2, renderedVertices=12, renderedAlpha=[0.78,0.5], warm/turquoise color placement and alpha-fade/material/atlas/order/framing semantic checks passed, local thresholds passed, loopStatus=`row68_alpha_fade_semantic_oracle_visual_runner_correlation_checkpointed_canonical_retail_blocked`, and canonical parity remained blocked. A human-review gap remains for retail visual capture/comparison of exact VFX_IMP_HEALING_M palette, timing, shape, and dm_visualeffect 68 0 runtime behavior.

## 2026-06-16T10:26:34.000Z - `vfx-dev-row50-alpha-fade-semantic-oracle-visual-runner-correlation`

No new failed implementation assumption was recorded in iteration 181. The local row50 alpha-fade semantic oracle was strengthened and tested: deterministic output rendered two visible textured_quad death-effect records, drawParticles=2, renderedVertices=12, renderedAlpha=[0.78,0.5], purple/pale color placement and alpha-fade/material/atlas/order/framing semantic checks passed, local thresholds passed, loopStatus=`row50_alpha_fade_semantic_oracle_visual_runner_correlation_checkpointed_canonical_retail_blocked`, and canonical parity remained blocked. A human-review gap remains for retail visual capture/comparison of exact VFX_IMP_DEATH shape, timing, palette, and scripted EffectVisualEffect row 50 runtime behavior.

## 2026-06-16T10:18:04.000Z - `vfx-dev-mode2-particle-size-envelope-semantic-oracle-visual-runner-correlation`

Failed local implementation/oracle assumption recorded and corrected in iteration 180: the initial Mode2/Lighten particle-size semantic check assumed all four rendered particle-size vectors should be uniform. The deterministic fixture disproved that assumption while remaining nonblank and contract-consistent: renderedParticleSizeX=[0.4076812087669615,0.39734667188868583,0.35991686551790064,0.353856646612577], renderedParticleSizeY=[0.39156506295702254,0.35552362415743954,0.3577139570723309,0.39471479098255624]. The oracle was corrected to a bounded local punch-through envelope x=[0.34,0.42], y=[0.34,0.41] with exact rendered size vectors still required to match the render contract. The rerun passed Mode2 particle-size envelope/path/color/alpha/blend/material/atlas/order/framing semantic checks, local thresholds passed, loopStatus=`mode2_particle_size_envelope_semantic_oracle_visual_runner_correlation_checkpointed_canonical_retail_blocked`, and canonical parity remained blocked. A human-review gap remains for retail runtime/render/capture/comparison evidence for exact punch-through Mode2 particle-size grading and blend/depth behavior.

## 2026-06-16T10:07:04.000Z - `vfx-dev-cot-fx01-fountain-trajectory-semantic-oracle-visual-runner-correlation`

No new failed implementation assumption was recorded in iteration 179. The local cot_fx01 Fountain trajectory semantic oracle was strengthened and tested: deterministic output rendered six visible textured_quad atlas particles, drawParticles=6, renderedVertices=36, renderedPositionX=[-0.2598892272676867,0.11848319465916834,-0.142338846429319,0.11865701062169129,-0.08442839804252077,0.26865460670203584], renderedPositionY=[-0.15907806756348666,-0.0644146233924433,-0.0008911990303243356,0.0352011121940817,0.07029828485949502,0.1316607800134882], renderedAtlasFrames=[12,15,2,5,8,11], frame playback/trajectory/UV/material/atlas/diagnostic/framing semantic checks passed, local thresholds passed, loopStatus was repaired from stale PLT state to `cot_fx01_fountain_trajectory_semantic_oracle_visual_runner_correlation_checkpointed_canonical_retail_blocked`, and canonical parity remained blocked. A human-review gap remains for retail visual capture/comparison or source-backed playback oracle for cot_fx01 Fountain atlas random frame start, fps=12 frame advancement, lifetime frame progression, and material-level frame offset behavior.

## 2026-06-16T10:02:04.000Z - `vfx-dev-p2p-alpha-fade-semantic-oracle-visual-runner-correlation`

No new failed implementation assumption was recorded in iteration 178. The local P2P alpha-fade semantic oracle was strengthened and tested: deterministic output rendered seven visible textured_quad arc records, drawParticles=7, renderedVertices=42, renderedAlpha=[0.78,0.7333333333333334,0.6866666666666666,0.64,0.5933333333333334,0.5466666666666666,0.5], source-to-target arc path/spacing/velocity/material/atlas/diagnostic/framing semantic checks passed, local thresholds passed, and canonical parity remained blocked. A human-review gap remains for retail visual capture/comparison plus source-backed runtime evidence for P2P reference-node mapping, source/target anchors, gravity/drag state, tick progression, and final render contract.

## 2026-06-16T09:56:34.000Z - `vfx-dev-linked-chain-color-alternation-semantic-oracle-visual-runner-correlation`

No new failed implementation assumption was recorded in iteration 177. The local linked-chain color-alternation semantic oracle was strengthened and tested: deterministic output rendered five visible linked_textured_quad records, drawParticles=5, renderedVertices=30, positionX=[-0.39,-0.195,0,0.195,0.39], color alternation RGB arrays R=[0.22,0.98,0.22,0.98,0.22], G=[0.8,0.92,0.8,0.92,0.8], B=[1,0.36,1,0.36,1], path/order/spacing/material/atlas/diagnostic/framing semantic checks passed, local thresholds passed, and canonical parity remained blocked. A human-review gap remains for retail visual capture/comparison plus source-backed runtime/render-contract evidence for linked-chain contiguous segment-buffer behavior, segment joins, source/target path, and runtime tick progression.

## 2026-06-16T09:48:04.000Z - `vfx-dev-plt-layer-spatial-order-semantic-oracle-visual-runner-correlation`

No new failed implementation assumption was recorded in iteration 176. The local PLT layer spatial-order semantic oracle was strengthened and tested: deterministic output rendered four visible layer swatches, drawParticles=4, renderedVertices=24, layers=[skin,hair,cloth1,cloth2], renderedPositionX=[-0.36,-0.12,0.12,0.36], distinct color vectors and atlas/material/diagnostic/framing semantic checks passed, local thresholds passed, and canonical parity remained blocked. A human-review gap remains for retail PLT palette/profile/layer lookup evidence plus runtime/render/capture/comparison evidence for exact layer colors and material binding.

## 2026-06-16T09:42:04.000Z - `vfx-dev-effectbeam-alpha-fade-semantic-oracle-visual-runner-correlation`

No new failed implementation assumption was recorded in iteration 175. The local EffectBeam alpha-fade semantic oracle was strengthened and tested: deterministic output rendered five visible BODY_NODE_CHEST VFX_BEAM_FIRE segments, drawParticles=5, renderedVertices=30, source-to-target positions/order/spacing passed, alpha faded strictly [0.78,0.71,0.64,0.5700000000000001,0.5], fire color pair/material/atlas/diagnostic/framing semantic checks passed, local thresholds passed, and canonical parity remained blocked. A human-review gap remains for retail visual capture/comparison of exact VFX_BEAM_FIRE beam volume, source-target path, BODY_NODE_CHEST anchoring, and temporary EffectBeam row 210 runtime behavior.

## 2026-06-16T09:34:16.000Z - `vfx-dev-row50-death-placement-semantic-oracle-visual-runner-correlation`

No new failed implementation assumption was recorded in iteration 174. The local Row50 death placement semantic oracle was strengthened and tested: deterministic output rendered visible death particles, drawParticles=2, renderedVertices=12, purple first particle left/lower, pale second particle right/upper, position/color vectors matched the render contract, atlas/material/order/framing semantic checks passed, local thresholds passed, and canonical parity remained blocked. A human-review gap remains for retail visual capture/comparison of exact VFX_IMP_DEATH shape, timing, palette, and scripted EffectVisualEffect row 50 runtime behavior.

## 2026-06-16T09:29:43.000Z - `vfx-dev-row68-healing-placement-semantic-oracle-visual-runner-correlation`

No new failed implementation assumption was recorded in iteration 173. The local Row68 healing placement semantic oracle was strengthened and tested: deterministic output rendered two visible components, drawParticles=2, renderedVertices=12, warm orange first particle left/lower, turquoise second particle right/upper, position/color vectors matched the render contract, atlas/material/order/framing semantic checks passed, local thresholds passed, and canonical parity remained blocked. A human-review gap remains for retail visual capture/comparison of exact row68 healing palette, timing, shape, and dm_visualeffect 68 0 runtime behavior.

## 2026-06-16T09:21:38.597Z - `vfx-dev-fireball-outward-motion-semantic-oracle-visual-runner-correlation`

No new failed implementation assumption was recorded in iteration 172. The local Fireball outward-motion semantic oracle was strengthened and tested: deterministic output rendered two visible warm textured_quad particles, drawParticles=2, renderedVertices=12, first particle left with negative X velocity, second particle right with positive X velocity, both particles rising, positive particle-size vectors, atlas/material/order/diagnostic/framing semantic checks passed, local thresholds passed, and canonical parity remained blocked. A human-review gap remains for retail visual capture/comparison of exact VFX_FNF_FIREBALL detonate timing, pre/post burst expansion, palette, and particle lifetime.

## 2026-06-16T09:14:31.721Z - `vfx-dev-p2p-segment-spacing-semantic-oracle-visual-runner-correlation`

No new failed implementation assumption was recorded in iteration 171. The local P2P segment-spacing semantic oracle was strengthened and tested: deterministic output rendered seven visible textured_quad arc records, drawParticles=7, renderedVertices=42, even source-to-target X spacing, middle-above-endpoints arc path, positive-X/falling-Y velocity path, alternating blue/yellow color pair, atlas/material/order/diagnostic/framing semantic checks passed, local thresholds passed, and canonical parity remained blocked. A human-review gap remains for retail visual capture/comparison plus source-backed runtime evidence for P2P reference-node mapping, source/target anchors, gravity/drag state, tick progression, and final render contract.

## 2026-06-16T09:08:48.979Z - `vfx-dev-linked-chain-segment-spacing-semantic-oracle-visual-runner-correlation`

No new failed implementation assumption was recorded in iteration 170. The local linked-chain segment-spacing semantic oracle was strengthened and tested: deterministic output rendered five visible linked_textured_quad records, drawParticles=5, renderedVertices=30, even source-to-target X spacing, middle-above-endpoint path, cyan/yellow color pair, atlas/material/order/diagnostic/framing semantic checks passed, local thresholds passed, and canonical parity remained blocked. A human-review gap remains for retail visual capture/comparison plus source-backed runtime/render-contract evidence for linked-chain contiguous segment-buffer behavior, segment joins, source/target path, and runtime tick progression.

## 2026-06-16T09:03:17.142Z - `vfx-dev-effectbeam-segment-spacing-semantic-oracle-visual-runner-correlation`

No new failed implementation assumption was recorded in iteration 169. The local EffectBeam segment-spacing semantic oracle was strengthened and tested: deterministic output rendered five visible BODY_NODE_CHEST VFX_BEAM_FIRE textured_quad segments, drawParticles=5, renderedVertices=30, even source-to-target X spacing and non-decreasing Y progression, warm fire color pair, atlas/material/order/diagnostic/framing semantic checks passed, local thresholds passed, and canonical parity remained blocked. A human-review gap remains for retail visual capture/comparison of exact VFX_BEAM_FIRE beam volume, source-target path, BODY_NODE_CHEST anchoring, and temporary EffectBeam row 210 runtime behavior.

## 2026-06-16T08:54:44.972Z - `vfx-dev-fireball-detonate-semantic-oracle-visual-runner-correlation`

No new failed implementation assumption was recorded in iteration 168. The local Fireball detonate semantic oracle was strengthened and tested: deterministic output rendered two visible warm textured_quad particles, drawParticles=2, renderedVertices=12, warm yellow/orange plus red-orange colors, positive particle-size vectors, atlas/material/order/diagnostic/framing semantic checks passed, local thresholds passed, and canonical parity remained blocked. A human-review gap remains for retail visual capture/comparison of exact VFX_FNF_FIREBALL detonate timing, pre/post burst expansion, palette, and particle lifetime.

## 2026-06-16T08:45:03.000Z - `vfx-dev-mode2-lighten-semantic-oracle-visual-runner-correlation`

No new failed implementation assumption was recorded in iteration 167. The local Mode2/Lighten semantic oracle was strengthened and tested: deterministic output rendered four visible textured_quad particles, drawParticles=4, renderedVertices=24, alternating low/high/low/high path, cyan/yellow color vectors, fading alpha vector, custom SrcAlpha/One/Add material state, atlas/material/framing semantic checks passed, local thresholds passed, and canonical parity remained blocked. A human-review gap remains for retail runtime/render/capture/comparison evidence for punch-through versus Mode2_Lighten alpha-test, depth-write/depth-test, and blend-factor behavior.

## 2026-06-16T08:37:03.000Z - `vfx-dev-plt-layer-color-semantic-oracle-visual-runner-correlation`

No new failed implementation assumption was recorded in iteration 166. The local PLT layer-color semantic oracle was tested and not disproven: deterministic output rendered four visible textured_quad layer records, drawParticles=4, renderedVertices=24, skin/hair/cloth1/cloth2 order, dev_known_layer_color_diagnostic source metadata, distinct RGB vectors, atlas/material/framing semantic checks passed, local thresholds passed, and canonical parity remained blocked. A human-review gap remains for retail PLT palette/profile/layer lookup evidence plus runtime/render/capture/comparison evidence for exact layer colors and material binding.

## 2026-06-16T08:30:03.000Z - `vfx-dev-linked-chain-semantic-oracle-visual-runner-correlation`

No new failed implementation assumption was recorded in iteration 165. The local linked-chain semantic oracle was tested and not disproven: deterministic output rendered five visible linked_textured_quad records, drawParticles=5, renderedVertices=30, cyan/yellow color pair, left-to-right chain path, middle-above-endpoints order, draw-record bucket/material/framing semantic checks passed, local thresholds passed, and canonical parity remained blocked. A human-review gap remains for retail visual capture/comparison plus source-backed runtime/render-contract evidence for linked-chain contiguous segment-buffer behavior, segment joins, source/target path, and runtime tick progression.

## 2026-06-16T08:24:03.000Z - `vfx-dev-p2p-gravity-reference-node-semantic-oracle-visual-runner-correlation`

No new failed implementation assumption was recorded in iteration 164. The local P2P gravity reference-node semantic oracle was tested and not disproven: deterministic output rendered seven visible arc particles, drawParticles=7, renderedVertices=42, source-left/target-right positions, middle-above-endpoints arc path, positive X/falling Y velocities, draw-record-order/material/framing semantic checks passed, local thresholds passed, and canonical parity remained blocked. A human-review gap remains for retail visual capture/comparison plus source-backed runtime evidence for P2P reference-node mapping, source/target anchors, gravity/drag state, tick progression, and final render contract.

## 2026-06-16T08:17:03.000Z - `vfx-dev-cot-fx01-atlas-playback-semantic-oracle-visual-runner-correlation`

No new failed implementation assumption was recorded in iteration 163. The local cot_fx01 Fountain atlas playback semantic oracle was tested and not disproven: deterministic output rendered six visible atlas particles, drawParticles=6, renderedVertices=36, frames=[12,15,2,5,8,11], UV quarter-grid/material/order/framing semantic checks passed, local thresholds passed, and canonical parity remained blocked. A human-review gap remains for retail visual capture/comparison or source-backed playback oracle for cot_fx01 random frame start, fps=12 frame advancement, lifetime frame progression, and any material-level frame offset behavior.

## 2026-06-16T08:09:51.888Z - `vfx-dev-effectbeam-body-chest-semantic-oracle-visual-runner-correlation`

No new failed implementation assumption was recorded in iteration 162. The local EffectBeam row 210 BODY_NODE_CHEST semantic oracle was tested and not disproven: deterministic output rendered a visible five-segment beam-like chain, drawParticles=5, renderedVertices=30, warm fire-orange/yellow color vectors matched the local row payload, BODY_NODE_CHEST provenance, segment order, atlas/material/framing semantic checks passed, local thresholds passed, and canonical parity remained blocked. A human-review gap remains for retail visual capture/comparison of exact VFX_BEAM_FIRE beam volume, source-target path, BODY_NODE_CHEST anchoring, and temporary EffectBeam row 210 runtime behavior.

## 2026-06-16T08:01:14.000Z - `vfx-dev-row50-death-semantic-oracle-visual-runner-correlation`

No new failed implementation assumption was recorded in iteration 161. The local row50 VFX_IMP_DEATH semantic oracle was tested and not disproven: deterministic output rendered a visible compact impact component, drawParticles=2, renderedVertices=12, purple plus pale color vectors matched the local row payload, atlas/material/order/framing semantic checks passed, local thresholds passed, and canonical parity remained blocked. A human-review gap remains for retail visual capture/comparison of exact row50 death-effect shape, timing, palette, and scripted EffectVisualEffect row 50 runtime behavior.

## 2026-06-16T07:55:02.000Z - `vfx-dev-row68-healing-semantic-oracle-visual-runner-correlation`

No new failed implementation assumption was recorded in iteration 160. The local row68 VFX_IMP_HEALING_M semantic oracle was tested and not disproven: deterministic output rendered two visible components, drawParticles=2, renderedVertices=12, warm orange plus turquoise color vectors matched the local row payload, atlas/material/order/framing semantic checks passed, local thresholds passed, and canonical parity remained blocked. A human-review gap remains for retail visual capture/comparison of exact row68 healing palette, timing, shape, and dm_visualeffect 68 0 runtime behavior.

## 2026-06-16T07:48:21.004Z - `vfx-dev-chunk-semantic-warning-visual-runner-correlation`

No new failed implementation assumption was recorded in iteration 159. The guard-reported chunk/progfx Type 9 semantic WARN was treated as a local diagnostic/human-review boundary gap, not as proof of real chunk rendering. The deterministic chunk route rendered a nonblank visible diagnostic placeholder, preserved `chunk_model`, kept drawParticles=0 and renderedVertices=0, avoided fake draw records, exposed unresolved-resource diagnostics, verified `placeholderDiagnosticOnly=true`, passed local thresholds, and kept canonical parity blocked. A human-review gap remains for the real progfx Type 9 chunk model resource/source row plus retail runtime/render/capture/comparison evidence.

## 2026-06-16T07:32:55.745Z - `vfx-dev-fireball-draw-mode-route-visual-runner-correlation`

No new failed assumption was recorded in iteration 158. The guard-reported fireball `drawModeRoute` semantic failure was treated as an actionable local diagnostic gap, patched in the visual-correlation semantic oracle, and rerun through the deterministic route. The fresh fireball evidence rendered nonblank output and verified `nonIndexedDrawArrays=true`, `indexedDrawArrays=false`, `drawModeArgument=3`, `drawModeArgumentSource=aurora-draw-wrapper-mode-arg3`, `verticesPerParticle=6`, `visualSemanticChecks.drawModeRoute=true`, local thresholds passed, and canonical parity was not promoted. A human-review gap remains for retail runtime/render/capture/comparison evidence for fireball detonate timing and pre/post burst draw-mode behavior.

## 2026-06-16T07:17:38.227Z - `vfx-dev-rendered-material-depth-test-visual-runner-correlation`

No new failed assumption was recorded in iteration 157. The hypothesis that Mode2/Lighten local output can preserve concrete material `depthTest=true` through the canonical renderer, dev runner, CDP frame capture, analyzer, visual correlation, and per-fixture semantic oracle was tested and not disproven. The deterministic route rendered nonblank output, `renderedMaterial.depthTest=true`, `depthWrite=false`, custom/SrcAlpha/One/Add blending, `fx_canonical_fire` texture binding, draw-record alpha/color/order, local threshold checks, and all `visualSemanticChecks` passed. A human-review gap remains for retail runtime/render/capture/comparison evidence for punch-through versus Mode2_Lighten alpha-test, depth-write/depth-test, and blend-factor behavior; canonical parity was not promoted.

## 2026-06-15T22:11:49.308Z - `vfx-dev-rendered-material-opacity-color-visual-runner-correlation`

No new failed assumption was recorded in iteration 156. The hypothesis that Mode2/Lighten local output can preserve concrete material opacity and neutral material color through the canonical renderer, dev runner, CDP frame capture, analyzer, and visual correlation was tested and not disproven: browser capture reported rendered/nonblank output, renderedMaterial.opacity=1, renderedMaterial.colorHex=#ffffff, analyzer material opacity/color checks passed, Mode2 blend/map/alpha checks remained true, local thresholds passed, and canonical parity remained blocked. These local screenshots, frame artifacts, render-contract snapshots, comparisons, correlations, thresholds, and self-tests are not retail capture/comparison evidence or canonical parity proof.

## 2026-06-15T20:01:19.311Z - Iteration 153 no new failed assumption
- The local cot_fx01 visual runner did not disprove the rendered position bucket hypothesis: the geometry position attribute exposed count 36, itemSize 3, render-contract-matching X/Y/Z ranges, and min/max unique rendered position tuples per draw record of 4/4.
- cot_fx01 local checks also passed: rendered position bucket checks, atlas/UV draw-record order checks, and local thresholds all passed with failedCheckCount=0.
- Canonical parity was not promoted because retail runtime/render/capture/comparison evidence is still missing.

## 2026-06-15T18:58:31.873Z - Iteration 146 no new failed assumption
- The local P2P visual runner did not disprove the rendered draw-record-index attribute hypothesis: the geometry attribute was present in DOM/frame evidence with count 42, itemSize 1, source auroraDrawRecordIndex-buffer-attribute, uniqueCount 7, and range 0..6.
- P2P local checks passed: the rendered attribute covered all seven draw records and matched draw-record order range expectations; local thresholds also passed with failedCheckCount=0.
- Canonical parity was not promoted because retail runtime/render/capture/comparison evidence is still missing.

## 2026-06-15T20:01:30.000+02:00 - Iteration 140 no new failed assumption
- The local Mode2/Lighten visual runner did not disprove the rendered alpha vector hypothesis: alpha arrays were present in DOM/frame evidence and matched local render-contract draw-record alpha values.
- Mode2 local checks also passed: rendered alpha count matched draw records, values stayed in unit range, and order matched the render-contract draw-record order.
- Canonical parity was not promoted because retail runtime/render/capture/comparison evidence is still missing.

## 2026-06-15T19:44:30.000+02:00 - Iteration 139 no new failed assumption
- The local fireball visual runner did not disprove the rendered particle-size vector hypothesis: particle size X/Y arrays were present in DOM/frame evidence and matched local render-contract draw-record vectors.
- Fireball local checks also passed: size X/Y values were positive and vector counts matched the two draw records.
- Canonical parity was not promoted because retail runtime/render/capture/comparison evidence is still missing.

## 2026-06-15T19:35:30.000+02:00 - Iteration 138 no new failed assumption
- The local P2P gravity visual runner did not disprove the rendered velocity vector hypothesis: velocity X/Y/Z arrays were present in DOM/frame evidence and matched local render-contract draw-record vectors.
- P2P local direction checks also passed: X velocity stayed positive and Y velocity descended across the arc.
- Canonical parity was not promoted because retail runtime/render/capture/comparison evidence is still missing.

## 2026-06-15T19:20:30.000+02:00 - Iteration 137 corrected PLT metadata source assumption
- Assumption: rendered PLT layer and layer color-source metadata could be read from top-level render-contract drawRecord fields.
- Disproof: the first iteration 137 PLT visual-correlation capture rendered nonblank and passed broad structural checks, but DOM/frame/comparison showed empty rendered/expected PLT layer arrays because the snapshot stores PLT metadata under drawRecord atlasProvenance.
- Recurrence prevention: canonical renderer and analyzer now read PLT layer metadata from atlasProvenance when top-level fields are absent; the final rerun captured renderedPltLayers [skin,hair,cloth1,cloth2], matching expectedPltLayers, and renderedPltLayerColorSources all dev_known_layer_color_diagnostic.
- Canonical parity was not promoted because retail runtime/render/capture/comparison evidence is still missing.

## 2026-06-15T19:11:30.000+02:00 - Iteration 136 no new failed assumption
- The local PLT known-layer-colors visual runner did not disprove the rendered color range hypothesis: color attribute R/G/B min/max was present in DOM/frame evidence and matched local render-contract draw-record colors.
- Canonical parity was not promoted because retail runtime/render/capture/comparison evidence is still missing.

## 2026-06-15T19:02:30.000+02:00 - Iteration 135 no new failed assumption
- The local cot_fx01 visual runner did not disprove the texture-atlas grid hypothesis: generated atlas metadata was present in DOM/frame evidence and matched the Fountain render-contract grid/dimensions.
- Canonical parity was not promoted because retail runtime/render/capture/comparison evidence is still missing.

## 2026-06-15T18:49:30.000+02:00 - Iteration 134 no new failed assumption

- Claim: `vfx-dev-rendered-record-metadata-visual-runner-correlation`.
- Result: EffectBeam rendered/nonblank at `time=0.66`, `seed=134`; rendered emitterNodeNames, drawRecordLanes, and record verticesPerParticle matched render-contract draw-record order, EffectBeam structural checks passed, and local thresholds passed.
- No new failed assumption was added. Canonical parity remains blocked only by missing retail runtime/render/capture/comparison evidence.

## 2026-06-15T18:42:30.000+02:00 - Iteration 133 no new failed assumption

- Claim: `vfx-dev-rendered-draw-identity-visual-runner-correlation`.
- Result: EffectBeam rendered/nonblank at `time=0.66`, `seed=133`; rendered drawRecordIds, particleIds, and particleIndexes matched render-contract draw-record identity/order, EffectBeam structural checks passed, and local thresholds passed.
- No new failed assumption was added. Canonical parity remains blocked only by missing retail runtime/render/capture/comparison evidence.

## 2026-06-15T18:34:30.000+02:00 - Iteration 132 no new failed assumption

- Claim: `vfx-dev-rendered-bounds-contract-visual-runner-correlation`.
- Result: row68 rendered/nonblank at `time=0.68`, `seed=132`; rendered bounds width/height/depth and center X/Y/Z matched render-contract positions plus quad extents and local thresholds passed.
- No new failed assumption was added. Canonical parity remains blocked only by missing retail runtime/render/capture/comparison evidence.

## 2026-06-15T18:31:30.000+02:00 - Iteration 131 no new failed assumption

- Claim: `vfx-dev-rendered-position-attribute-range-visual-runner-correlation`.
- Result: linked_chain rendered/nonblank at `time=0.74`, `seed=131`; rendered position X/Y/Z ranges matched render-contract positions plus quad extents and local thresholds passed.
- No new failed assumption was added. Canonical parity remains blocked only by missing retail runtime/render/capture/comparison evidence.

## 2026-06-15T18:15:30.000+02:00 - `vfx-dev-rendered-uv-attribute-range-visual-runner-correlation`

No new failed assumption was recorded in iteration 130. The hypothesis that P2P would expose rendered UV U/V ranges through the canonical renderer, local dev runner, CDP frame capture, analyzer, and visual correlation was tested and not disproven. The result remains diagnostic-only and must not be used as retail atlas UV behavior, retail render-contract, capture/comparison, or canonical parity evidence.

## 2026-06-15T17:50:30.000+02:00 - `vfx-dev-rendered-attribute-value-range-visual-runner-correlation`

No new failed assumption was recorded in iteration 129. The hypothesis that row50 would expose rendered color/alpha/particle-size value stats through the canonical renderer, local dev runner, CDP frame capture, analyzer, and visual correlation was tested and not disproven. The result remains diagnostic-only and must not be used as retail renderer attribute values, retail render-contract, capture/comparison, or canonical parity evidence.

## 2026-06-15T17:38:30.000+02:00 - `vfx-dev-rendered-atlas-frame-attribute-visual-runner-correlation`

Assumption: an exploratory cot_fx01 atlas-frame attribute capture at `time=1.72`, `seed=128` would remain within the existing local threshold profile.

Disproof: the first visual-correlation run rendered nonblank and passed render-contract checks, but `backend/docs/aurora-reverse/artifacts/vfx-iteration-128/cot-fx01-time-1.72-seed-128-atlas-frame-attribute.local-threshold-check.json` failed `connectedComponentCount` with 6 components against the existing local oracle.

Recurrence prevention: final iteration 128 evidence uses stable threshold-profile checkpoint `time=0.65&seed=128`, which passed contract checks and local thresholds while still validating the new atlas-frame attribute count/source/unique/range checks. Keep the 1.72 artifacts as exploratory local diagnostic only; do not widen local thresholds from this single frame. This evidence is not retail atlas playback, retail render-contract, capture/comparison, or canonical parity proof.

## 2026-06-15T17:23:30.000+02:00 - `vfx-dev-rendered-mode-raw-token-visual-runner-correlation`

No new failed assumption was recorded in iteration 127. The hypothesis that Mode2/Lighten would expose rendered raw mode metadata through the canonical renderer, local dev runner, CDP frame capture, analyzer, and visual correlation was tested and not disproven. The result remains diagnostic-only and must not be used as retail render mode, blend mode, render-contract, capture/comparison, or canonical parity evidence.

## 2026-06-15T17:12:30.000+02:00 - `vfx-dev-rendered-geometry-attribute-route-visual-runner-correlation`

Assumption: the existing draw-particle mismatch analyzer regression expected-failed-check list would remain complete after adding geometry attribute checks.

Disproof: the first `npm run test:vfx:capture-analyzer` iteration 126 run exited 1 with four unexpected failed checks: `renderedGeometryColorAttributeMatchesVertexCount`, `renderedGeometryAlphaAttributeMatchesVertexCount`, `renderedGeometryParticleSizeAttributeMatchesVertexCount`, and `renderedGeometryUvAttributeMatchesVertexCount`.

Recurrence prevention: the mismatch regression expected-failed-check list now includes the geometry attribute count checks, and the rerun passed 3/3 cases. The final row68 browser correlation also passed all geometry attribute checks. This local diagnostic evidence is not retail geometry, retail render-contract, capture/comparison evidence, or canonical parity proof.

## 2026-06-15T17:05:30.000+02:00 - `vfx-dev-rendered-draw-mode-route-visual-runner-correlation`

No new failed assumption was recorded in iteration 125. The hypothesis that fireball would expose actual rendered draw-mode route metadata through the canonical renderer, local dev runner, CDP frame capture, analyzer, and visual correlation was tested and not disproven. The result remains diagnostic-only and must not be used as retail draw-call route, render-contract, capture, comparison, or canonical parity evidence.

## 2026-06-15T16:57:30.000+02:00 - `vfx-dev-rendered-geometry-route-visual-runner-correlation`

No new failed assumption was recorded in iteration 124. The hypothesis that row50 would expose actual rendered geometry route metadata through the local dev runner, CDP frame capture, analyzer, and visual correlation was tested and not disproven. The result remains diagnostic-only and must not be used as retail renderer draw-route, render-contract, capture, or canonical parity evidence.

## 2026-06-15T16:47:30.000+02:00 - `vfx-dev-rendered-atlas-frame-visual-runner-correlation`

No new failed assumption was recorded in iteration 123. The hypothesis that cot_fx01 would expose actual rendered atlas frame indexes through the local dev runner, CDP frame capture, analyzer, and visual correlation was tested and not disproven. The result remains diagnostic-only and must not be used as retail atlas playback, render-contract, capture, or canonical parity evidence.

## 2026-06-15T16:35:30.000+02:00 - `vfx-dev-rendered-mode-metadata-visual-runner-correlation`

No new failed assumption was recorded in iteration 122. The hypothesis that cot_fx01 would expose actual rendered render mode and blend mode through the local dev runner, CDP frame capture, analyzer, and visual correlation was tested and not disproven. The result remains diagnostic-only and must not be used as retail renderer mode behavior, render-contract, capture, or canonical parity evidence.

## 2026-06-15T16:29:30.000+02:00 - `vfx-dev-rendered-render-order-visual-runner-correlation`

No new failed assumption was recorded in iteration 121. The hypothesis that fireball would expose actual rendered render order through the local dev runner, CDP frame capture, analyzer, and visual correlation was tested and not disproven. The result remains diagnostic-only and must not be used as retail renderer ordering, render-contract, capture, or canonical parity evidence.

## 2026-06-15T16:21:30.000+02:00 - `vfx-dev-rendered-material-state-visual-runner-correlation`

No new failed assumption was recorded in iteration 120. The hypothesis that Mode2/Lighten would expose actual rendered material adapter state through the local dev runner, CDP frame capture, analyzer, and visual correlation was tested and not disproven. The result remains diagnostic-only and must not be used as retail alpha-test/depth-write/blend-factor, render-contract, capture, or canonical parity evidence.

## 2026-06-15T16:12:30.000+02:00 - `vfx-dev-rendered-texture-provenance-visual-runner-correlation`

No new failed assumption was recorded in iteration 119. The hypothesis that PLT layer-colors would expose renderer-applied texture reference/status through the local dev runner, CDP frame capture, analyzer, and visual correlation was tested and not disproven. The result remains diagnostic-only and must not be used as retail PLT texture-loader, render-contract, capture, or canonical parity evidence.

## 2026-06-15T16:03:30.000+02:00 - `vfx-dev-rendered-bounds-center-visual-runner-correlation`

No new failed assumption was recorded in iteration 118. The hypothesis that linked_chain would expose finite rendered bounds center values through the local dev runner, CDP frame capture, and analyzer was tested and not disproven. The result remains diagnostic-only and must not be used as retail linked segment-buffer, render-contract, capture, or canonical parity evidence.

## 2026-06-14T22:35:02.0000000+02:00 - `vfx-dev-render-contract-visual-correlation-p2p-gravity`

No new failed assumption was recorded in iteration 57. The hypothesis that p2p_gravity would preserve source-target arc geometry and maintain matching contract/DOM/component counts was tested and not disproven. The result remains diagnostic-only and must not be used as retail reference-node or gravity solver parity evidence.

## 2026-06-14T22:31:12.0000000+02:00 - `vfx-dev-render-contract-visual-correlation-linked-chain`

No new failed assumption was recorded in iteration 56. The hypothesis that linked_chain would preserve `linked_textured_quad` lane metadata and maintain matching contract/DOM/component counts was tested and not disproven. The result remains diagnostic-only and must not be used as retail linked segment-buffer parity evidence.

## 2026-06-14T22:28:34.0000000+02:00 - `vfx-dev-render-contract-visual-correlation-plt-layer-colors`

Assumption: the Vite SSR snapshot helper could run inside the normal sandbox without needing to write temporary Vite config files under `frontend/node_modules/.vite-temp`.

Disproof: the first snapshot command failed with `EPERM: operation not permitted` while opening `frontend/node_modules/.vite-temp/vite.config.ts.timestamp-*.mjs`.

Recurrence prevention: record `vite_ssr_snapshot_helper_requires_escalated_temp_write` as a local loop blocker and rerun this helper with the approved escalated `node scripts/export-vfx-render-contract-snapshot.mjs` prefix when snapshot artifacts are required. The escalated rerun generated the PLT render-contract snapshot successfully.

## 2026-06-14T22:32:02.0000000+02:00 - `vfx-dev-local-structural-baseline-v2-multi-fixture`

No new failed assumption was recorded in iteration 54. The hypothesis that the five recent local diagnostic fixture families would remain nonblank and structurally visible after the PLT implementation slice was tested and not disproven. The aggregate baseline remains diagnostic-only and must not be used as retail parity evidence.

## 2026-06-14T22:25:38.0000000+02:00 - `vfx-dev-fixture-runner-plt-layer-colors-local-diagnostic`

Assumption: a five-layer PLT local diagnostic would yield five visibly separated connected components in the structural analyzer.

Disproof: the v1-v3 PLT screenshots were nonblank/local-visible, but each comparison found only four connected components for five draw records, meaning the extra layer was visually merged or insufficiently isolated for this diagnostic oracle.

Recurrence prevention: the diagnostic fixture was narrowed to four explicit layers (skin, hair, cloth1, cloth2) with stable spacing and bright local colors. The final v4 capture at `backend/docs/aurora-reverse/artifacts/vfx-iteration-53/plt-layer-colors-time-0.55-seed-61-cdp-v4.comparison.json` reports `drawParticleCountMatchesDom=true` and `connectedComponentCount=4` for four draw records.

## 2026-06-14T22:06:51.9900000+02:00 - `vfx-dev-fixture-runner-punch-mode2-lighten-local-diagnostic`

No new failed assumption was recorded in iteration 52. The hypothesis that punch-through/mode2-lighten could be exercised as a local Mode2/Lighten blend diagnostic was tested and not disproven. The local preview remains diagnostic-only and must not be used as retail alpha-test/depth-write/blend-factor parity evidence.

## 2026-06-14T22:01:52.5670000+02:00 - `vfx-dev-fixture-runner-p2p-gravity-local-diagnostic`

No new failed assumption was recorded in iteration 51. The hypothesis that p2p_gravity could be exercised as a local source-target arc diagnostic was tested and not disproven. The local preview remains diagnostic-only and must not be used as retail reference-node/gravity solver parity evidence.

## 2026-06-14T21:45:24.0000000+02:00 - `vfx-dev-fixture-runner-linked-chain-local-diagnostic`

No new failed assumption was recorded in iteration 50. The hypothesis that linked_chain could be exercised as a local `linked_textured_quad` lane diagnostic was tested and not disproven. The local preview remains diagnostic-only and must not be used as retail linked segment-buffer parity evidence.

## 2026-06-14T21:35:22.0000000+02:00 - `vfx-dev-fixture-runner-chunk-type9-local-diagnostic`

No new failed assumption was recorded in iteration 49. The hypothesis that chunk_particles/progfx Type 9 could be exercised as a local `chunk_model` lane diagnostic without fake textured-quad draws was tested and not disproven. The local placeholder remains diagnostic-only and must not be used as retail parity evidence.

## 2026-06-14T21:25:31.4215119+02:00 - `vfx-dev-local-structural-baseline-multi-fixture`

No new failed assumption was recorded in iteration 48. The hypothesis that the local structural comparison helper could generalize from cot_fx01 to row 68, row 50, and fireball was tested and not disproven. The baseline remains diagnostic-only and must not be used as retail parity evidence.

## 2026-06-14T21:20:37.8195180+02:00 - `vfx-dev-local-structural-comparison-cot-fx01`

No new failed assumption was recorded in iteration 47. The hypothesis that a local CDP screenshot/frame artifact could be converted into structural comparison metrics was tested against cot_fx01 and was not disproven. The comparison is explicitly diagnostic-only and must not be used as retail parity evidence.

## 2026-06-14T21:13:35.2553975+02:00 - `vfx-dev-fixture-runner-cot-fx01-local-diagnostic`

Assumption: after a successful CDP screenshot/frame capture, deleting the transient Chrome profile directory immediately after `chrome.kill("SIGTERM")` would be safe on Windows.

Disproof: the first cot_fx01 CDP capture wrote the PNG and frame JSON successfully, with `canvasNonblank=true`, `drawParticles=6`, and `objectPixels=15657`, but the command exited with `EPERM` while removing `backend/docs/aurora-reverse/artifacts/vfx-iteration-46/cot-fx01-time-1.20-seed-19-cdp.chrome-profile`.

Recurrence prevention: `backend/scripts/capture-vfx-fixture-cdp.mjs` now waits briefly for Chrome exit and treats profile removal as best-effort with retries and a warning. The second cot_fx01 capture, `cot-fx01-time-1.20-seed-19-cdp-v2`, exited 0 and preserved the screenshot/frame evidence.

## 2026-06-14T20:58:39.2616145+02:00 - `vfx-dev-cdp-capture-helper-multi-fixture`

No new failed assumption was recorded in iteration 45. The hypothesis that the CDP capture path could be generalized beyond the fireball fixture was tested against row 68 and row 50 and was not disproven. Keep using this section only for genuinely falsified assumptions in later cycles.

## 2026-06-14T20:52:55.1112543+02:00 - `vfx-dev-fixture-runner-fireball-cdp-capture-soft-atlas-v2`

Assumption: after fixing the atlas layout in v1, the generated fireball texture would no longer leave visible rectangular atlas boundaries in screenshots.

Disproof: the first CDP screenshot at `backend/docs/aurora-reverse/artifacts/vfx-iteration-44/fireball-time-0.35-seed-11-cdp.png` successfully captured the fireball route but still showed faint rectangular atlas bleed around both particles.

Recurrence prevention: the dev texture profile is now `radial-soft-atlas-4x4-v2`; it zeros low-alpha edge pixels and tightens the spark/core falloff. The final CDP capture records `objectPixels=6106`, down from the v1 DOM signal of `18971`, and visually shows two soft particles without the large rectangular fields.

## 2026-06-14T20:29:47.7840000+02:00 - `vfx-dev-fixture-runner-fireball-dom-nonblank-screenshot-blocked`

Assumption: the same Chrome headless screenshot command family would reliably create a PNG artifact for the fireball route once the route rendered nonblank.

Disproof: Chrome headless DOM dump confirmed the fireball route rendered with `data-canvas-nonblank="true"` and `data-object-pixels="18971"`, but screenshot attempts using a relative path, absolute `--screenshot=path`, and `--screenshot path` did not create `backend/docs/aurora-reverse/artifacts/vfx-iteration-43/fireball-time-0.35-seed-11.png`.

Recurrence prevention: iteration 44 must repair or replace the screenshot capture mechanism before treating fireball visual capture as complete. DOM-only nonblank evidence is recorded as `local-visible-dom-only`, not as a completed screenshot artifact.

## 2026-06-14T20:24:03.4904107+02:00 - `vfx-dev-fixture-runner-row50-soft-atlas-local-diagnostic`

Assumption: a single generated radial soft-particle texture would produce soft local diagnostic particles when used by the existing render-contract UVs.

Disproof: the first row-50 capture at `backend/docs/aurora-reverse/artifacts/vfx-iteration-42/row50-time-0.75-seed-7-soft-particle.png` was nonblank but structurally wrong because the renderer sampled atlas UV coordinates from only a sub-quadrant of the single radial texture, leaving square/partial-particle output.

Recurrence prevention: the dev VFX fixture runner now generates a 4x4 radial atlas texture profile, exposes `data-texture-profile="radial-soft-atlas-4x4-v1"`, and the final row-50 capture/frame artifact records the atlas-aware screenshot, DOM status, and pixel check.

## 2026-06-14T17:14:58.6036044+02:00 - `vfx-retail-source-summary-admission`

Assumption: the full backend unit gate would pass after a simple retry when the unrelated runtime-settings decompiled module-cache test hit Jest's default 5 second timeout.

Disproof: during iteration 13, `cd backend && npm run test:unit` failed twice on `RuntimeSettingsApplicationService › rebuilds module cache from decompiled directory when path is configured`, even though the focused VFX parity spec passed and the parity validator reported the expected retail-evidence block.

Recurrence prevention: the decompiled module-cache test now has a scoped 15 second timeout, and both `npm run test:unit -- --runTestsByPath test/unit/runtime-settings.application.service.spec.ts` and the full backend `npm run test:unit` gate passed afterward.

## 2026-06-14T17:51:29.1055265+02:00 - `vfx-retail-capture-handoff-manifest-fixtures`

Assumption: a simple backtick regex for `vfx-retail-*` strings in the handoff document would find only fixture IDs.

Disproof: the focused capture-setup test initially failed because the handoff also references `vfx-retail-parity-fixtures.json`, which matched the broad regex but is not a fixture ID.

Recurrence prevention: the handoff alignment test now filters discovered strings through the authoritative manifest fixture ID set before comparing against the expected 10 capture fixture IDs.

## 2026-06-14T18:12:01.1399222+02:00 - `vfx-retail-behavior-claim-runtime-validation`

Assumption: an invalid `behaviorClaim` test fixture could be cast directly to `AuroraVfxRetailParityFixture`.

Disproof: the first focused VFX spec run failed at TypeScript compile time with `TS2352`, because `"retail-ish"` is intentionally incompatible with the `AuroraVfxRetailBehaviorClaim` union.

Recurrence prevention: invalid runtime-shape tests now cast through `unknown` before `AuroraVfxRetailParityFixture`, making the intent explicit while preserving the runtime validator coverage for `VFX_RETAIL_BEHAVIOR_CLAIM_INVALID`.

## 2026-06-14T19:02:32.5457461+02:00 - `vfx-retail-manifest-policy-object-shape`

Assumption: TypeScript would retain the `Record<string, unknown>` view for the guarded manifest policy object when the fallback branch was `{}`.

Disproof: the first focused parity-gate spec for iteration 38 failed before tests ran with `TS2339` on `manifestPolicy.screenshotAloneIsParityProof` and `manifestPolicy.canonicalRequires`, because the fallback widened the ternary result to `{}`.

Recurrence prevention: the guarded policy view is now explicitly typed as `Record<string, unknown>`, and the focused spec passed afterward with 43 tests while preserving runtime coverage for `VFX_RETAIL_MANIFEST_POLICY_INVALID`.

## 2026-06-14T20:05:10.5350872+02:00 - `vfx-dev-fixture-runner-row68-local-diagnostic`

Assumption: the preferred in-app Browser plugin would be available for the visual-runner screenshot, and the full frontend unit/regression gates would be usable as clean final gates for this VFX slice.

Disproof: Browser plugin setup failed twice in the Windows sandbox with `CreateProcessAsUserW failed: 5`. A Chrome headless fallback produced the screenshot, DOM status, and pixel check. The focused VFX tests and build passed, but the full unit gate still failed in unrelated workspace tests (`App.workspacePanels` plus `workspaceSceneInteraction.moveAllowedKinds` import resolution), and the regression gate failed in unrelated static-placeable/Adjust Location flows.

Recurrence prevention: future VFX loop iterations should still try the Browser plugin first, but if this sandbox error repeats they should immediately use Chrome headless for screenshot/frame artifacts and record `browser_plugin_blocked_windows_sandbox`. Full frontend gate failures outside the VFX runner must be recorded as blockers without returning to documentation-only work.

When a hypothesis is disproven, append an entry with:

- date/time;
- claim ID;
- assumption;
- evidence that disproved it;
- resulting diagnostic, fixture, or gate added to prevent recurrence.

## 2026-06-14T22:37:40.0000000+02:00 - `vfx-dev-render-contract-visual-correlation-mode2-lighten`

No new failed assumption was recorded in iteration 58. The hypothesis that the mode2/lighten render-contract snapshot could be correlated with fresh visual output while preserving local-only blockers was tested and not disproven. Keep using CDP fallback and escalated Vite snapshot execution in this sandbox.

## 2026-06-14T22:42:25.0000000+02:00 - `vfx-dev-render-contract-visual-correlation-chunk-type9`

Assumption: the informal fixture id `vfx-retail-chunk-type9-reference` would resolve to the chunk/progfx Type 9 dev fixture.

Disproof: the snapshot helper correctly fell back to the default row 68 fixture because that id does not exist in `vfxFixturePayloads.ts`, producing a row 68 snapshot under the intended chunk artifact path.

Recurrence prevention: use the admitted fixture id `vfx-retail-chunk-particles-progfx-type9` for chunk/progfx Type 9 visual-loop runs, and treat mismatched `requestedFixtureId`/`fixtureId` in snapshots as a discarded artifact until rerun.

## 2026-06-14T22:50:10.0000000+02:00 - `vfx-dev-reusable-visual-correlation-runner-row50`

Assumption: for non-chunk textured quads, connected component count in the screenshot analyzer should exactly equal render-contract drawParticleCount.

Disproof: the first reusable runner pass on `vfx-retail-scripted-effectvisualeffect-row-50` generated valid nonblank screenshot/frame/comparison artifacts with drawParticleCount=2, but the analyzer returned one connected component because the two soft particles overlapped into a single visible cluster.

Recurrence prevention: `backend/scripts/run-vfx-visual-correlation.mjs` now checks `visibleComponentsWithinDrawParticleBudget` for non-chunk lanes, while still requiring contract/DOM draw-particle equality, nonblank canvas, local structural visibility, and local-only canonical blockers.

## 2026-06-14T23:00:42.0000000+02:00 - `vfx-dev-reusable-visual-correlation-runner-p2p-gravity`

Assumption: generic visibility and draw-count checks in the reusable runner were sufficient for p2p_gravity.

Disproof: the first reusable p2p_gravity pass produced valid nonblank visual artifacts, but it did not preserve the source-target arc invariants previously checked by the manual p2p correlation lane.

Recurrence prevention: `backend/scripts/run-vfx-visual-correlation.mjs` now adds p2p-specific checks for start-left, end-right, and middle-higher-than-endpoints when fixture id is `vfx-retail-p2p-gravity-reference-node`.

## 2026-06-14T23:06:45.0000000+02:00 - `vfx-dev-reusable-visual-correlation-runner-plt-layer-colors`

Assumption: generic visibility and draw-count checks in the reusable runner were sufficient for PLT layer-color diagnostics.

Disproof: the first reusable PLT pass produced valid nonblank visual artifacts, but it did not preserve the layer metadata and distinct-color invariants from the earlier manual PLT diagnostic lane.

Recurrence prevention: `backend/scripts/run-vfx-visual-correlation.mjs` now adds PLT-specific checks for draw-record layer count, required layers `skin`, `hair`, `cloth1`, `cloth2`, and distinct RGB layer colors when fixture id is `vfx-retail-plt-known-layer-colors`.

## 2026-06-14T23:11:10.0000000+02:00 - `vfx-dev-reusable-visual-correlation-runner-mode2-lighten`

No new failed assumption was recorded in iteration 67. The hypothesis that the reusable runner preserves Mode2/Lighten blend metadata was tested and not disproven. The result remains diagnostic-only and must not be used as retail alpha-test, depth-write, blend-factor, or canonical parity evidence.

## 2026-06-14T23:13:05.0000000+02:00 - `vfx-dev-reusable-visual-correlation-runner-chunk-type9`

No new failed assumption was recorded in iteration 68. The hypothesis that the reusable runner preserves chunk/progfx Type 9 `chunk_model` lane semantics and blocks fake particle draw records was tested and not disproven. The result remains diagnostic-only and must not be used as retail chunk resource, source identity, or canonical parity evidence.

## 2026-06-14T23:18:20.0000000+02:00 - `vfx-dev-reusable-visual-correlation-runner-guardrail-self-test`

No new failed assumption was recorded in iteration 69. The hypothesis that reusable runner guardrails can be covered by a pure self-test was tested and not disproven. The self-test is implementation protection only and must not be used as retail capture, visual comparison, or canonical parity evidence.

## 2026-06-14T23:21:15.0000000+02:00 - `vfx-dev-reusable-visual-correlation-runner-npm-guardrail-script`

No new failed assumption was recorded in iteration 70. The hypothesis that the reusable runner guardrail self-test can be exposed through a backend npm script was tested and not disproven. The package script is implementation protection only and must not be used as retail capture, visual comparison, or canonical parity evidence.

## 2026-06-14T23:31:30.0000000+02:00 - `vfx-dev-fixture-runner-effectbeam-row210-local-diagnostic`

No EffectBeam visual hypothesis was disproven in iteration 71: the local row-210 fixture rendered nonblank and passed all EffectBeam context/body-node/source-target ordering checks. Gate blockers remain outside the VFX slice: full frontend unit/regression still fail in unrelated workspace/placeable flows, and the full backend unit suite hit the recurring runtime-settings timeout even though the isolated runtime-settings file passed. Keep recording these as full-gate blockers rather than reverting to docs-only VFX work.

## 2026-06-14T23:35:10.0000000+02:00 - `vfx-dev-fixture-runner-effectbeam-row210-motion-stability`

No new failed assumption was recorded in iteration 72. The second deterministic row-210 EffectBeam pass preserved all local visual/correlation checks and canonical blockers. Remaining blockers are retail evidence and unrelated full-gate failures recorded in iteration 71.

## 2026-06-14T23:39:10.0000000+02:00 - `vfx-dev-effectbeam-two-frame-stability-guardrail`

Assumption: the synthetic EffectBeam self-test frames already carried the same BODY_NODE_CHEST draw-record provenance as the real visual artifacts.

Disproof: the first iteration-73 self-test run failed the new two-frame stability report because the synthetic first beam frame omitted BODY_NODE_CHEST from draw-record atlas provenance.

Recurrence prevention: the synthetic EffectBeam frames now include BODY_NODE_CHEST provenance, createEffectBeamStabilityReport checks body-node stability across frames, and the self-test includes a negative source-anchor drift case. The real iteration 71/72 stability report passed afterward.

## 2026-06-14T23:45:05.0000000+02:00 - `vfx-dev-reusable-visual-correlation-runner-fountain-atlas-cot-fx01`

Assumption: generic reusable runner visibility checks were enough for cot_fx01 Fountain atlas playback.

Disproof: the first cot_fx01 reusable-runner pass rendered nonblank and visible, but correlation only checked generic draw-count/nonblank/local-only invariants and did not preserve Fountain atlas grid, frame range, fps, frame-index, or material-offset semantics.

Recurrence prevention: cot_fx01 now carries explicit fountainAtlas render-contract metadata and draw-record atlas provenance; the runner checks Fountain atlas context, frame range, unresolved retail playback, 4x4 grid provenance, frame-index range, multi-frame usage, and blocked material-level frame offsets. Backend and frontend focused tests cover the new guardrail, including a negative grid-drift case.

## 2026-06-14T23:51:20.0000000+02:00 - `vfx-dev-fountain-atlas-cot-fx01-two-frame-progression`

No new failed assumption was recorded in iteration 75. The hypothesis that cot_fx01 local Fountain atlas frame indexes advance across deterministic visual-runner passes was tested and not disproven: the real two-frame report passed with frame indexes `[3,6,9,12,15,2]` then `[4,7,10,13,0,3]`. This remains local diagnostic evidence only and must not be used as retail Fountain playback, randomization, texture-resource identity, or canonical parity evidence.

## 2026-06-14T23:59:10.0000000+02:00 - `vfx-dev-mode2-lighten-two-frame-stability`

Assumption: the existing synthetic Mode2/Lighten correlation object could be reused as the first frame for the two-frame stability report.

Disproof: the first iteration-76 self-test run failed because that synthetic object had only 2 draw particles / 12 vertices, while the real Mode2/Lighten fixture and stability report require 4 draw particles / 24 vertices.

Recurrence prevention: the self-test now uses a dedicated four-particle synthetic Mode2/Lighten stability frame, keeps the report guardrail at 4 particles / 24 vertices, and includes a negative blend-drift case. The real iteration 67/76 stability report passed afterward.

## 2026-06-15T00:05:05.0000000+02:00 - `vfx-dev-plt-layer-color-two-frame-stability`

Assumption: the existing correlation laneProbe with only first and last draw records was enough to build a four-layer PLT stability report.

Disproof: PLT has four required layers (`skin`, `hair`, `cloth1`, `cloth2`), so first/last-only correlation could not prove required-layer or layer-to-color mapping stability across frames.

Recurrence prevention: `laneProbe.middleDrawRecords` now preserves middle draw records for correlation artifacts; both PLT passes were rerun as v2 artifacts, and the PLT stability report checks all four required layers, distinct colors, and stable layer-to-color mapping.

## 2026-06-15T00:12:20.0000000+02:00 - `vfx-dev-linked-chain-two-frame-stability`

Assumption: a negative linked-chain drift frame would also fail the per-frame visual-correlation checks.

Disproof: the synthetic negative frame changed its draw lane to `textured_quad`, so the per-frame linked-lane check no longer applied; the drift was correctly owned by the two-frame stability report.

Recurrence prevention: the linked-chain stability self-test now expects `linkedChainStabilityLaneStable` to catch lane drift, while per-frame correlation still verifies `linkedLanePreserved` whenever the render contract declares `linked_textured_quad`.

## 2026-06-15T00:19:22.6417368+02:00 - `vfx-dev-chunk-type9-two-frame-stability`

Assumption: the synthetic visual-correlation helper could infer chunk Type 9 `activeParticleCount` from `drawParticleCount`.

Disproof: unresolved chunk particles intentionally preserve `activeParticleCount=2` while keeping `drawParticleCount=0`, `drawVertexCount=0`, and no draw records. The first chunk stability self-test failed because the helper defaulted active particle count to `1`.

Recurrence prevention: the helper now accepts explicit `activeParticleCount`, and the chunk Type 9 stability coverage asserts stable active diagnostic particles separately from zero fake draw particles/records/vertices.

## 2026-06-15T00:26:17.2888023+02:00 - `vfx-dev-p2p-gravity-two-frame-stability`

Assumption: the existing iteration 65 p2p gravity correlation artifact had enough draw-record shape for a full two-frame arc stability report.

Disproof: the older artifact exposed only first and last draw records in `laneProbe`, so it could preserve source/target endpoints but could not prove full middle-arc position stability across frames.

Recurrence prevention: the baseline p2p pass was rerun as iteration 80 v2 after `laneProbe.middleDrawRecords` became available, and the p2p stability report now checks stable source anchor, target anchor, and full arc-position signature.

## 2026-06-15T00:35:36.3325554+02:00 - `vfx-dev-row50-effectvisualeffect-two-frame-stability`

No new failed assumption was recorded in iteration 81. The hypothesis that row 50 local EffectVisualEffect diagnostics preserve stable draw counts, `textured_quad` lane, `normal` blend, radial atlas profile, and visible output across deterministic local passes was tested and not disproven. The one-component merged visual cluster remains expected local diagnostic behavior and must not be used as retail EffectVisualEffect parity evidence.

## 2026-06-15T00:42:55.1095491+02:00 - `vfx-dev-fireball-detonate-two-frame-stability`

No new failed assumption was recorded in iteration 82. The hypothesis that fireball/detonate local diagnostics preserve stable draw counts, `textured_quad` lane, `normal` blend, radial atlas profile, warm draw-record colors, and two visible components across deterministic local passes was tested and not disproven. The result remains local diagnostic evidence only and must not be used as retail detonate event timing, animation event ordering, runtime tick, or canonical parity evidence.

## 2026-06-15T00:53:39.2786201+02:00 - `vfx-dev-row68-dmvisualeffect-two-frame-stability`

No new failed assumption was recorded in iteration 83. The hypothesis that row 68 local `dm_visualeffect` diagnostics preserve stable draw counts, `textured_quad` lane, `normal` blend, radial atlas profile, row68 healing color pair, particle IDs `680/681`, and two visible components across deterministic local passes was tested and not disproven. The result remains local diagnostic evidence only and must not be used as retail `dm_visualeffect 68 0` command execution, runtime tick, or canonical parity evidence.

## 2026-06-15T01:00:40.8935248+02:00 - `vfx-dev-visual-coverage-inventory-retail-blocker`

No new failed assumption was recorded in iteration 84. The hypothesis that the loop could inventory local visual coverage before continuing fixture-specific work was tested and not disproven: all 10 manifest fixture families have local correlations and two-frame diagnostic report/progression coverage. The inventory also confirmed that canonical parity remains blocked for all 10 fixtures because retail runtime, render, capture, and comparison evidence is still missing.

## 2026-06-15T01:22:21.6129885+02:00 - `vfx-dev-local-oracle-threshold-profile`

No new failed assumption was recorded in iteration 85. The hypothesis that local two-frame diagnostic artifacts can be converted into reusable local regression thresholds was tested and not disproven: all 10 manifest fixture families received selected frame pairs and threshold profiles, while canonical parity remained unpromoted. These thresholds are local regression oracles only and must not be used as retail runtime, render, capture, comparison, or canonical parity evidence.

## 2026-06-15T01:38:13.8162797+02:00 - `vfx-dev-local-oracle-threshold-checker`

Assumption: selecting the first correlation artifact matching a report's `timeSeconds` and `seed` was sufficient for threshold-checkable local oracle profiles.

Disproof: the first full threshold checker run failed five fixtures because older same-time/same-seed baseline correlations lacked `renderMode` and `blendMode` laneProbe metadata that newer complete artifacts already carried.

Recurrence prevention: `create-vfx-local-oracle-thresholds.mjs` now ranks matching correlations by artifact and metadata completeness before iteration/path order, so report frame selection prefers complete/latest correlations. The regenerated profile passed the full threshold checker and explicit row68 correlation mode afterward.

## 2026-06-15T01:52:43.4898097+02:00 - `vfx-dev-threshold-checked-visual-correlation-workflow`

No new failed assumption was recorded in iteration 87. The hypothesis that the reusable visual-correlation runner can invoke the local threshold checker for future captures was tested and not disproven: the row68 `time=0.90`, `seed=83` run produced nonblank browser output, correlation/comparison/frame artifacts, and a passing local threshold-check report with 0 failed checks and 0 canonical promotion attempts. This remains local regression evidence only and must not be used as retail runtime, render, capture, comparison, or canonical parity evidence.

## 2026-06-15T02:09:29.9166422+02:00 - `vfx-dev-runtime-tick-diagnostic-snapshots`

Assumption: backend `ts-node --transpile-only` script execution would accept default imports for Node builtins such as `node:path` and `node:fs`.

Disproof: the first runtime-tick diagnostic generator smoke run failed with `TypeError: Cannot read properties of undefined (reading 'resolve')` when `path.resolve(...)` was called from the default import.

Recurrence prevention: `create-vfx-runtime-tick-diagnostics.ts` now uses namespace imports for Node builtins. After that repair, the runtime-tick diagnostic report passed 8/8 local cases with 0 failed checks and 0 canonical promotion attempts. These snapshots remain local diagnostics only and must not be used as retail runtime tick dumps or canonical parity evidence.

## 2026-06-15T02:22:23.2941953+02:00 - `vfx-dev-aggregate-local-diagnostic-gate`

Assumption: the aggregate local diagnostic gate could spawn the runtime tick diagnostics through `npx.cmd ts-node --transpile-only ...` from inside Node on Windows.

Disproof: the first aggregate gate run failed the runtime subcommand with `spawnSync npx.cmd EINVAL`, while the visual-correlation self-test and local threshold checker subcommands passed.

Recurrence prevention: `run-vfx-local-diagnostic-gate.mjs` now runs the TypeScript runtime diagnostics through `node -r ts-node/register/transpile-only ...`, avoiding nested `npx.cmd` process spawning. The final aggregate gate passed 3/3 commands with runtime diagnostics 8/8, threshold checking 10 fixtures / 20 frames, 0 nested failed checks, and 0 canonical promotion attempts.

## 2026-06-15T02:43:05.0000000+02:00 - `vfx-retail-evidence-pack-ingestion-dry-run`

No new failed assumption was recorded in iteration 90. The hypothesis that a dry-run validator can distinguish real retail evidence candidates from placeholder or missing fixture packs was tested and not disproven: the dry-run blocked 10/10 fixtures, found 5 placeholder packs, 5 missing pack directories, 0 ingestible packs, and 0 canonical promotion attempts. This dry-run is an ingestion guard only and must not be used as retail capture, runtime dump, render contract, comparison evidence, or canonical parity proof.

## 2026-06-15T13:08:18.6407704+02:00 - `vfx-dev-explosion-detonate-local-runtime-burst`

Assumption: missing retail capture/evidence means the worker loop should stop after the retail evidence dry-run.

Disproof: retail capture blocks canonical parity promotion only. A safe local implementation gap still existed: the backend Explosion runtime preserved the detonate latch but emitted `VFX_EXPLOSION_RUNTIME_NOT_IMPLEMENTED` and produced no particles even when explicit `detonateEvents` were supplied.

Recurrence prevention: iteration 91 implemented deterministic local Explosion detonate burst diagnostics, preserved the no-detonate no-fallback gate, added duplicate detonate suppression with processed event keys, updated runtime diagnostics, and changed loop memory back to continuous local implementation work while keeping canonical parity blocked until retail evidence exists. The new local runtime diagnostics are not retail runtime dumps or canonical parity proof.

## 2026-06-15T13:14:28.1679242+02:00 - `vfx-dev-p2p-target-position-local-runtime-path`

No new failed assumption was recorded in iteration 92. The hypothesis that P2P can emit a deterministic local source-to-target diagnostic path only after a resolved target position is supplied was tested and not disproven: targetless context still blocks origin fallback, targetRef-only context requires a targetPosition, the resolved target-position case emits seven local diagnostic path particles, and canonical parity remains blocked. These local P2P runtime diagnostics are not retail target mapping, retail runtime tick dumps, or canonical parity proof.

## 2026-06-15T13:19:51.7276165+02:00 - `vfx-dev-lightning-target-position-local-runtime-path`

No new failed assumption was recorded in iteration 93. The hypothesis that Lightning can emit deterministic local source/target active points only after a resolved target position is supplied was tested and not disproven: missing target context still clears active points, targetRef-only context requires a targetPosition and clears stale output, the resolved target-position case emits two local diagnostic active points, and canonical parity remains blocked. These local Lightning runtime diagnostics are not retail target mapping, retail runtime tick dumps, or canonical parity proof.

## 2026-06-15T13:27:45.4355495+02:00 - `vfx-dev-single-local-shot-runtime`

No new failed assumption was recorded in iteration 94. The hypothesis that Single can emit one deterministic local diagnostic particle without sharing Fountain accumulator semantics was tested and not disproven: the first tick emits one `single_shot` particle, later ticks do not duplicate it, the spawn accumulator remains zero, and canonical parity remains blocked. These local Single runtime diagnostics are not retail runtime tick dumps or canonical parity proof.

## 2026-06-15T13:39:23.4628792+02:00 - `vfx-dev-chunk-model-lane-local-runtime-placeholder`

No new failed assumption was recorded in iteration 95. The hypothesis that Chunk can preserve chunk-model lane placeholder runtime records only when `chunkName` is present was tested and not disproven: missing `chunkName` produced no active particles and no textured-quad fallback, chunkName-backed runtime produced two `chunk_model_placeholder` records, and canonical parity remained blocked. These local Chunk runtime diagnostics are not retail chunk resource resolution, render evidence, or canonical parity proof.

## 2026-06-15T13:46:56.8509037+02:00 - `vfx-dev-chunk-runtime-render-contract-local-diagnostic`

No new failed assumption was recorded in iteration 96. The hypothesis that ticked local Chunk runtime placeholders can survive render-contract building without collapsing into textured quads was tested and not disproven: the local runtime-render-contract report kept `drawLane="chunk_model"`, `drawParticleCount=0`, `drawVertexCount=0`, `drawRecords=[]`, preserved the chunkName lane, diagnosed the collapse attempt, and reported 0 canonical promotion attempts. These local runtime-render-contract diagnostics are not retail render-contract snapshots, retail chunk model resources, browser visual evidence, or canonical parity proof.

## 2026-06-15T13:50:19.0872783+02:00 - `vfx-dev-aggregate-local-diagnostic-gate-runtime-render-contract`

No new failed assumption was recorded in iteration 97. The hypothesis that the aggregate local diagnostic gate can include runtime-render-contract diagnostics without being mistaken for retail evidence was tested and not disproven: the gate passed `4/4` commands, counted runtime-render-contract `1/1`, reported `0` nested failed checks and `0` canonical promotion attempts, and kept retail parity expected-blocked. This aggregate gate is a local regression guard only, not retail runtime, retail render-contract, capture, comparison, or canonical parity evidence.

## 2026-06-15T13:59:09.5713870+02:00 - `vfx-dev-contract-aware-visual-comparison-analyzer`

No new failed assumption was recorded in iteration 98. The hypothesis that local visual comparison artifacts can include render-contract-aware structural checks was tested and not disproven: row68 captured a nonblank screenshot/frame, the comparison artifact recorded `contractChecks.result="passed"` with `0` failed checks, draw lane `textured_quad`, draw particles `2`, draw vertices `12`, draw records `2`, DOM drawParticles `2`, connected components `2`, and no canonical promotion. The first capture attempt exposed a dev-server readiness issue (`VFX fixture runner was not present in the browser DOM`), but the rerun against the active Vite server passed. These local screenshot, frame, comparison, correlation, and threshold artifacts are not retail capture/comparison evidence or canonical parity proof.

## 2026-06-15T14:04:54.6341866+02:00 - `vfx-dev-capture-analyzer-contract-checks-regression-gate`

No new failed assumption was recorded in iteration 99. The hypothesis that analyzer `contractChecks` can be protected by deterministic local regression cases was tested and not disproven: the synthetic harness passed matching contract checks, intentionally failed a draw-particle mismatch with `renderContractDrawParticlesMatchesDom`, preserved snapshot-optional analyzer behavior, and aggregate local diagnostics passed `5/5` commands with `0` nested failed checks and `0` canonical promotion attempts. These analyzer self-tests are local regression evidence only, not retail screenshots, retail comparisons, or canonical parity proof.

## 2026-06-15T14:15:31.408+02:00 - `vfx-dev-cdp-capture-render-ready-wait-row50-visual`

Assumption: fixed post-load sleep in the CDP capture helper was enough to observe the dev fixture runner's rendered DOM status before screenshot/frame capture.

Disproof: the first row50 visual-correlation run captured a visible screenshot with 2693 analyzer object pixels, but frame DOM status still reported `renderStatus=pending`, `canvasNonblank=false`, and `drawParticles=0`, producing false local contract-check failures.

Recurrence prevention: `capture-vfx-fixture-cdp.mjs` now polls the runner until rendered/nonblank/drawParticles are present before capture. The rerun passed row50 visual correlation, contract checks, local thresholds, aggregate local diagnostics, build, unit tests, and expected-blocked retail parity validation. These local artifacts remain diagnostic only and are not retail capture/comparison evidence or canonical parity proof.

## 2026-06-15T14:20:01.545+02:00 - `vfx-dev-effectbeam-body-node-contract-aware-visual`

No new failed assumption was recorded in iteration 101. The hypothesis that EffectBeam body-chest can produce nonblank contract-aware local visual evidence was tested and not disproven: browser capture reported rendered/nonblank output, BODY_NODE_CHEST and beam source/target ordering checks were preserved, local threshold checking passed, aggregate diagnostics passed, and canonical parity remained blocked. These local screenshots, frame artifacts, render-contract snapshots, comparisons, correlations, and threshold checks are not retail capture/comparison evidence or canonical parity proof.

## 2026-06-15T14:24:01.544+02:00 - `vfx-dev-fireball-detonate-contract-aware-visual`

No new failed assumption was recorded in iteration 102. The hypothesis that Fireball/Explosion detonate can produce nonblank contract-aware local visual evidence was tested and not disproven: browser capture reported rendered/nonblank output, contract checks and local threshold checking passed, aggregate diagnostics passed, and canonical parity remained blocked. These local screenshots, frame artifacts, render-contract snapshots, comparisons, correlations, and threshold checks are not retail capture/comparison evidence or canonical parity proof.

## 2026-06-15T14:28:17.633+02:00 - `vfx-dev-fountain-atlas-contract-aware-visual`

No new failed assumption was recorded in iteration 103. The hypothesis that Fountain atlas can produce nonblank contract-aware local visual evidence was tested and not disproven: browser capture reported rendered/nonblank output, atlas context/range/grid/frame checks passed, local threshold checking passed, aggregate diagnostics passed, and canonical parity remained blocked. These local screenshots, frame artifacts, render-contract snapshots, comparisons, correlations, and threshold checks are not retail capture/comparison evidence or canonical parity proof.

## 2026-06-15T14:38:58.000+02:00 - `vfx-dev-linked-chain-contract-aware-visual`

No new failed assumption was recorded in iteration 104. The hypothesis that Linked-chain can produce nonblank contract-aware local visual evidence while preserving `linked_textured_quad` lane diagnostics was tested and not disproven: browser capture reported rendered/nonblank output, linked lane preservation passed, local threshold checking passed, aggregate diagnostics passed, and canonical parity remained blocked. These local screenshots, frame artifacts, render-contract snapshots, comparisons, correlations, and threshold checks are not retail capture/comparison evidence or canonical parity proof.

## 2026-06-15T14:42:08.000+02:00 - `vfx-dev-plt-layer-colors-contract-aware-visual`

No new failed assumption was recorded in iteration 105. The hypothesis that PLT layer-colors can produce nonblank contract-aware local visual evidence while preserving required layer metadata and distinct layer colors was tested and not disproven: browser capture reported rendered/nonblank output, PLT layer count/required-layer/distinct-color checks passed, local threshold checking passed, aggregate diagnostics passed, and canonical parity remained blocked. These local screenshots, frame artifacts, render-contract snapshots, comparisons, correlations, and threshold checks are not retail capture/comparison evidence or canonical parity proof.

## 2026-06-15T14:46:14.000+02:00 - `vfx-dev-mode2-lighten-contract-aware-visual`

No new failed assumption was recorded in iteration 106. The hypothesis that Mode2/Lighten can produce nonblank contract-aware local visual evidence while preserving raw blend token, numeric mode 2, and Lighten draw-record usage was tested and not disproven: browser capture reported rendered/nonblank output, Mode2/Lighten blend checks passed, local threshold checking passed, aggregate diagnostics passed, and canonical parity remained blocked. These local screenshots, frame artifacts, render-contract snapshots, comparisons, correlations, and threshold checks are not retail capture/comparison evidence or canonical parity proof.

## 2026-06-15T14:50:28.000+02:00 - `vfx-dev-p2p-gravity-contract-aware-visual`

No new failed assumption was recorded in iteration 107. The hypothesis that P2P gravity can produce nonblank contract-aware local visual evidence while preserving source-target arc diagnostics was tested and not disproven: browser capture reported rendered/nonblank output, source-left/target-right/middle-high arc checks passed, local threshold checking passed, aggregate diagnostics passed, and canonical parity remained blocked. These local screenshots, frame artifacts, render-contract snapshots, comparisons, correlations, and threshold checks are not retail capture/comparison evidence or canonical parity proof.

## 2026-06-15T14:56:36.000+02:00 - `vfx-dev-chunk-type9-contract-aware-diagnostic`

No new failed assumption was recorded in iteration 108. The hypothesis that Chunk/progfx Type 9 can produce a contract-aware local diagnostic while preserving `chunk_model` lane semantics and avoiding fake textured draw records was tested and not disproven: browser capture reported rendered/nonblank output, chunk lane preservation passed, canonical resource remained unresolved, placeholder output was visible without draw particles, local threshold checking passed, aggregate diagnostics passed, and canonical parity remained blocked. These local screenshots, frame artifacts, render-contract snapshots, comparisons, correlations, and threshold checks are not retail chunk resource, retail capture/comparison evidence, or canonical parity proof.

## 2026-06-15T15:01:36.000+02:00 - `vfx-dev-contract-visual-evidence-set-gate`

Assumption: a new Node `.mjs` contract visual evidence checker could use CommonJS `require` imports like some older scripts.

Disproof: the first `npm run test:vfx:contract-visual-evidence` run failed immediately with `ReferenceError: require is not defined in ES module scope`.

Recurrence prevention: the checker now uses ESM imports plus `fileURLToPath(import.meta.url)`; syntax checks passed, the checker passed for all 10 manifest fixture families, and it is integrated into the aggregate local diagnostic gate. This remains local diagnostic evidence only and is not retail capture/comparison evidence or canonical parity proof.

## 2026-06-15T15:10:34.000+02:00 - `vfx-dev-contract-visual-evidence-semantic-gate`

No new failed assumption was recorded in iteration 110. The hypothesis that the local contract visual evidence gate can enforce fixture-specific semantic requirements was tested and not disproven: requirements were applied to all 10 manifest fixture families, 31/31 required semantic checks passed, expected draw lanes/counts matched, aggregate local diagnostics passed, and canonical parity remained blocked. This semantic gate is local regression evidence only and is not retail runtime, retail render-contract, retail capture/comparison evidence, or canonical parity proof.

## 2026-06-15T15:13:52.000+02:00 - `vfx-dev-aggregate-gate-semantic-summary`

No new failed assumption was recorded in iteration 111. The hypothesis that aggregate local diagnostics can surface nested contract-visual semantic counters was tested and not disproven: the aggregate summary now reports 31 semantic requirements, 0 failed semantic requirements, and 10 fixtures with requirements applied, while 6/6 aggregate commands passed and canonical parity remained blocked. These aggregate counters are local regression visibility only and are not retail runtime, retail render-contract, retail capture/comparison evidence, or canonical parity proof.

## 2026-06-15T15:18:22.000+02:00 - `vfx-dev-aggregate-gate-summary-regression`

No new failed assumption was recorded in iteration 112. The hypothesis that aggregate semantic-summary wiring can be protected by a dedicated regression script was tested and not disproven: the new script ran the aggregate local diagnostic gate, compared top-level semantic counters against the nested contract visual evidence report, passed with 31 semantic requirements, 0 failed semantic requirements, and 10 fixtures with requirements applied, and canonical parity remained blocked. This summary regression is local diagnostic infrastructure only and is not retail runtime, retail render-contract, retail capture/comparison evidence, or canonical parity proof.

## 2026-06-15T15:22:55.000+02:00 - `vfx-dev-contract-visual-artifact-chain-gate`

No new failed assumption was recorded in iteration 113. The hypothesis that contract visual evidence should require the actual local visual artifact chain was tested and not disproven: all 10 manifest fixture families had render-contract snapshots, screenshot PNGs, frame JSON files, rendered/nonblank frame DOM, nonzero screenshot bytes, matching fixture ids, and no local canonical promotion attempts. These local artifact chains remain diagnostic evidence only and are not retail runtime, retail render-contract, retail capture/comparison evidence, or canonical parity proof.

## 2026-06-15T15:28:04.000+02:00 - `vfx-dev-contract-visual-artifact-chain-consistency-gate`

No new failed assumption was recorded in iteration 114. The hypothesis that local visual artifact chains can be checked for internal consistency was tested and not disproven: all 10 manifest fixture families passed frame screenshot-path, screenshot-byte, fixture-id, time, seed, DOM fixture-id, DOM draw-particle, object-pixel, and canonical-promotion consistency checks with 0 mismatches. These consistency checks are local diagnostic evidence only and are not retail runtime, retail render-contract, retail capture/comparison evidence, or canonical parity proof.

## 2026-06-15T15:32:45.000+02:00 - `vfx-dev-contract-visual-render-contract-hash-gate`

No new failed assumption was recorded in iteration 115. The hypothesis that local render-contract snapshot provenance can be verified from existing visual evidence artifacts was tested and not disproven: all 10 manifest fixture families matched snapshot/correlation metrics and recomputed renderContractSha256/payloadContractsSha256 values with 0 mismatches. These local hash/provenance checks are diagnostic evidence only and are not retail render-contract snapshots, retail capture/comparison evidence, or canonical parity proof.

## 2026-06-15T15:48:30.000+02:00 - `vfx-dev-rendered-vertices-visual-runner-correlation`

No new failed assumption was recorded in iteration 116. The hypothesis that a fresh local row68 visual capture can expose rendered vertex counts and verify them against render-contract draw vertices was tested and not disproven: browser capture reported rendered/nonblank output, `drawLane=textured_quad`, `drawParticles=2`, `renderedVertices=12`, `drawVertexCount=12`, contract checks passed, local thresholds passed, and canonical parity remained blocked. This local screenshot/frame/render-contract/correlation evidence is diagnostic only and is not retail runtime, retail render-contract, retail capture/comparison evidence, or canonical parity proof.

## 2026-06-15T15:56:30.000+02:00 - `vfx-dev-rendered-bounds-visual-runner-correlation`

No new failed assumption was recorded in iteration 117. The hypothesis that a fresh local draw-geometry visual capture can expose nonzero rendered bounds and verify them against lane expectations was tested and not disproven: P2P gravity browser capture reported rendered/nonblank output, `drawLane=textured_quad`, `drawParticles=7`, `renderedVertices=42`, `renderedBounds=1.16345 x 0.79764 x 0`, `renderedBoundsMatchLane=true`, contract checks passed, local thresholds passed, and canonical parity remained blocked. This local screenshot/frame/render-contract/correlation evidence is diagnostic only and is not retail runtime, retail render-contract, retail capture/comparison evidence, or canonical parity proof.

## 2026-06-15T20:10:30.000+02:00 - `vfx-dev-mode2-blend-factor-visual-runner-correlation`

No new failed assumption was recorded in iteration 141. The hypothesis that Mode2/Lighten can preserve concrete rendered material blend factors and blend equation through local visual runner capture was tested and not disproven: browser capture reported rendered/nonblank output, rendered material state was custom/SrcAlphaFactor/OneFactor/AddEquation, analyzer and visual-correlation blend checks passed, local threshold checking passed, and canonical parity remained blocked. These local screenshots, frame artifacts, render-contract snapshots, comparisons, correlations, and threshold checks are not retail capture/comparison evidence or canonical parity proof.

## 2026-06-15T20:25:30.000+02:00 - `vfx-dev-rendered-color-vector-visual-runner-correlation`

No new failed assumption was recorded in iteration 142. The hypothesis that PLT known-layer local output can preserve rendered color R/G/B vectors through local visual runner capture was tested and not disproven: browser capture reported rendered/nonblank output, rendered color vectors matched render-contract draw records in unit range and draw-record order, PLT distinct-color checks passed, local threshold checking passed, and canonical parity remained blocked. These local screenshots, frame artifacts, render-contract snapshots, comparisons, correlations, and threshold checks are not retail capture/comparison evidence or canonical parity proof.

## 2026-06-15T20:34:30.000+02:00 - `vfx-dev-rendered-position-vector-visual-runner-correlation`

No new failed assumption was recorded in iteration 143. The hypothesis that P2P local output can preserve rendered position X/Y/Z vectors through the canonical renderer, local dev runner, CDP frame capture, analyzer, and visual correlation was tested and not disproven: browser capture reported rendered/nonblank output, rendered position vectors matched render-contract draw records in draw-record order, P2P X-monotonic and middle-Y arc checks passed, local threshold checking passed, and canonical parity remained blocked. A visual-correlation negative-case self-test expectation was updated to include the new P2P rendered-position failed check; this was a test oracle maintenance fix, not a runtime/render failed assumption. These local screenshots, render contracts, thresholds, source/decomp invariants, and passing tests are not retail capture/comparison evidence and must not promote canonical parity.

## 2026-06-15T18:37:37.516Z - `vfx-dev-rendered-atlas-uv-rect-visual-runner-correlation`

No new product/runtime failed assumption was introduced in iteration 144. The rendered atlas UV rectangle propagation hypothesis was tested locally and not disproved: renderer userData, dev runner DOM attributes, CDP capture, analyzer contract checks, visual-correlation checks, and local thresholds all agreed for `vfx-retail-fountain-atlas-cot-fx01` at time=0.65 seed=144. The backend unit timeout and broad frontend unit/regression failures are recorded as gates/blockers, but they do not currently disprove the atlas UV rectangle path. Local screenshots, render contracts, threshold checks, and self-tests remain non-canonical until full retail runtime/render/capture/comparison evidence exists.

## 2026-06-15T18:49:03.881Z - `vfx-dev-rendered-diagnostic-codes-visual-runner-correlation`

Assumption: rendered diagnostic-code correlation could rely on the renderer's local diagnostic codes alone, and analyzer diagnostic matching could use exact equality with metrics diagnostic codes.

Disproof: the first chunk/progfx visual-correlation run failed `analyzerRenderedDiagnosticCodesMatchMetrics` and `chunkRenderedDiagnosticCodesIncludeUnresolvedResource` because the rendered DOM omitted broader payload/source/runtime/retail-block diagnostic codes. After renderer diagnostic merging, exact equality still failed because the renderer legitimately adds `VFX_CANONICAL_CHUNK_LANE_RENDERER_PENDING`, which is not part of metrics diagnosticCodes.

Recurrence prevention: the renderer now merges full payload diagnostics into canonical diagnostic userData, the analyzer treats metrics diagnostic codes as a required subset of rendered codes, and the visual-correlation runner explicitly checks unresolved-resource chunk diagnostics while preserving drawParticles=0. Syntax checks, focused VFX tests, analyzer self-test, visual-correlation self-test, deterministic chunk visual correlation, frontend/backend builds, and backend unit tests passed. Local screenshots, render contracts, threshold checks, diagnostic codes, and self-tests remain non-canonical until full retail runtime/render/capture/comparison evidence exists.

## 2026-06-15T19:11:31.023Z - `vfx-dev-rendered-draw-record-bucket-visual-runner-correlation`

No new failed assumption was recorded in iteration 147. The hypothesis that linked-chain local output can preserve per-record draw-record-index vertex buckets through the canonical renderer, dev runner, CDP frame capture, analyzer, and visual correlation was tested and not disproven: browser capture reported rendered/nonblank output, draw-record-index count/source/unique/range checks passed, min/max vertices per record were both 6 for five linked-chain draw records, linked-chain bucket correlation passed, local thresholds passed, and canonical parity remained blocked. These local screenshots, frame artifacts, render-contract snapshots, comparisons, correlations, thresholds, and self-tests are not retail capture/comparison evidence or canonical parity proof.

## 2026-06-15T19:22:12.366Z - `vfx-dev-rendered-alpha-bucket-visual-runner-correlation`

No new failed assumption was recorded in iteration 148. The hypothesis that Mode2/Lighten local output can preserve each draw record's alpha as a uniform per-record vertex attribute bucket through the canonical renderer, dev runner, CDP frame capture, analyzer, and visual correlation was tested and not disproven: browser capture reported rendered/nonblank output, rendered alpha values matched draw-record order, alpha attribute count/range checks passed, min/max unique alpha values per record were both 1, Mode2 material/blend checks passed, local thresholds passed, and canonical parity remained blocked. These local screenshots, frame artifacts, render-contract snapshots, comparisons, correlations, thresholds, and self-tests are not retail capture/comparison evidence or canonical parity proof.

## 2026-06-15T19:30:49.974Z - `vfx-dev-rendered-color-bucket-visual-runner-correlation`

No new failed assumption was recorded in iteration 149. The hypothesis that PLT known-layer local output can preserve each draw record's RGB color tuple as a uniform per-record vertex attribute bucket through the canonical renderer, dev runner, CDP frame capture, analyzer, and visual correlation was tested and not disproven: browser capture reported rendered/nonblank output, rendered color vectors matched draw-record order, color attribute count/range checks passed, min/max unique RGB tuples per record were both 1, PLT distinct-layer color checks passed, local thresholds passed, and canonical parity remained blocked. These local screenshots, frame artifacts, render-contract snapshots, comparisons, correlations, thresholds, and self-tests are not retail capture/comparison evidence or canonical parity proof.

## 2026-06-15T19:38:26.301Z - `vfx-dev-rendered-particle-size-bucket-visual-runner-correlation`

Assumption: the canonical renderer particle-size vertex array could be referenced as `particleSizes` when adding per-record bucket stats.

Disproof: the first focused frontend VFX unit run failed with `ReferenceError: particleSizes is not defined` in `buildCanonicalTexturedQuadGeometry`.

Recurrence prevention: the implementation now reuses the existing `sizes` vertex array for particle-size tuple bucket stats, and the focused VFX unit tests passed after the repair. The product/runtime hypothesis was then tested and not disproven: fireball browser capture reported rendered/nonblank output, particle-size vectors matched draw-record order, particle-size attribute count/range checks passed, min/max unique particle-size tuples per record were both 1, local thresholds passed, and canonical parity remained blocked. These local screenshots, frame artifacts, render-contract snapshots, comparisons, correlations, thresholds, and self-tests are not retail capture/comparison evidence or canonical parity proof.

## 2026-06-15T19:47:33.745Z - `vfx-dev-rendered-atlas-frame-bucket-visual-runner-correlation`

No new failed assumption was recorded in iteration 151. The hypothesis that cot_fx01 local output can preserve each draw record's atlas-frame index as a uniform per-record vertex attribute bucket through the canonical renderer, dev runner, CDP frame capture, analyzer, and visual correlation was tested and not disproven: browser capture reported rendered/nonblank output, rendered atlas frames matched draw-record order, atlas-frame attribute count/source/range checks passed, min/max unique atlas-frame values per record were both 1, fountain atlas frame/UV/grid checks passed, local thresholds passed, and canonical parity remained blocked. These local screenshots, frame artifacts, render-contract snapshots, comparisons, correlations, thresholds, and self-tests are not retail capture/comparison evidence or canonical parity proof.

## 2026-06-15T19:54:16.220Z - `vfx-dev-rendered-uv-bucket-visual-runner-correlation`

No new failed assumption was recorded in iteration 152. The hypothesis that cot_fx01 local output can preserve each draw record's UV rectangle as four unique per-record rendered UV corner tuples through the canonical renderer, dev runner, CDP frame capture, analyzer, and visual correlation was tested and not disproven: browser capture reported rendered/nonblank output, rendered UV rects matched draw-record order, UV attribute count/range checks passed, min/max unique UV tuples per record were both 4, fountain atlas frame/UV/grid checks passed, local thresholds passed, and canonical parity remained blocked. These local screenshots, frame artifacts, render-contract snapshots, comparisons, correlations, thresholds, and self-tests are not retail capture/comparison evidence or canonical parity proof.

## 2026-06-15T20:09:36.644Z - `vfx-dev-rendered-material-map-visual-runner-correlation`

No new failed assumption was recorded in iteration 154. The hypothesis that Mode2/Lighten local output can preserve concrete material texture-map binding through the canonical renderer, dev runner, CDP frame capture, analyzer, and visual correlation was tested and not disproven: browser capture reported rendered/nonblank output, renderedTextureReference=fx_canonical_fire, renderedMaterial.mapBound=true, renderedMaterial.mapReference=fx_canonical_fire, analyzer material-map checks passed, Mode2 custom blend checks remained true, local thresholds passed, and canonical parity remained blocked. These local screenshots, frame artifacts, render-contract snapshots, comparisons, correlations, thresholds, and self-tests are not retail capture/comparison evidence or canonical parity proof.

## 2026-06-15T20:14:42.986Z - `vfx-dev-rendered-material-flags-visual-runner-correlation`

No new failed assumption was recorded in iteration 155. The hypothesis that row50 local output can preserve concrete material vertex-color and side flags through the canonical renderer, dev runner, CDP frame capture, analyzer, and visual correlation was tested and not disproven: browser capture reported rendered/nonblank output, renderedMaterial.vertexColors=true, renderedMaterial.side=DoubleSide, analyzer material-flag checks passed, local thresholds passed, and canonical parity remained blocked. These local screenshots, frame artifacts, render-contract snapshots, comparisons, correlations, thresholds, and self-tests are not retail capture/comparison evidence or canonical parity proof.

