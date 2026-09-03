# Codex thread audit: 019f5022-7eae-7430-a2a8-347a45b2b0ab

Thread: `codex://threads/019f5022-7eae-7430-a2a8-347a45b2b0ab`
Title observed by Codex: `Emitery Placeabli`
Audit date: 2026-07-12
Workspace: `C:\Projects\aurora-web`

## Scope

This audit reviews the Codex thread outcome, not the full correctness of every
changed source file. It focuses on whether the thread followed the Aurora-first
boundary, what was actually proven, what was only locally demonstrated, and what
remains open.

Reference boundary:

- `C:\Projects\New Folder` is the read-only Aurora/decompiled reference.
- `C:\Projects\aurora-web` is the editable implementation repo.

## Verdict

Outcome: partial success.

The thread correctly identified the architectural debt: Aurora has one MDL node
hierarchy where `emitter`, `light`, `trimesh`, `animmesh`, `danglymesh`, and
`reference` are siblings/children in one model tree, while Aurora Web had split
pure VFX and placeable emitter rendering into two paths.

The thread then implemented and locally proved the first P0 slice: source-MDL
placeable composition can carry and render static MDL geometry plus emitters
together for `plc_t04`.

It did not finish the whole architecture remediation. It also did not produce an
accepted same-camera Aurora Toolset/retail pixel-parity proof. Later turns in the
thread explicitly corrected the earlier boundary: the final web proof is local
runtime proof, not Aurora visual parity.

## Strong outcomes

- The thread did not keep treating `plc_t04` as a one-off visual exception.
  It traced the problem to a general wrong split: source-MDL emitter preview was
  replacing the placeable model instead of composing with it.
- The audit phase found concrete P0 risks: two runtime sources of truth,
  VFX subtype suppressing required placeable geometry, emitter payload
  suppressing source-MDL light collection, and canonical-route regression.
- A durable architecture audit was added:
  `backend/docs/aurora-reverse/vfx-placeable-emitter-architecture-audit-2026-07-12.md`.
- The implementation carried static geometry provenance through the source MDL
  parser, backend/frontend contracts, and the VFX preview route.
- The local proof packet exists for the implemented P0 composition slice:
  - `backend/docs/aurora-reverse/artifacts/placeable-vfx-emitters-2026-07-12/web-tm_pl_lightred-plc_t04-static-emitter-smoke-proof-v6-current.png`
  - `backend/docs/aurora-reverse/artifacts/placeable-vfx-emitters-2026-07-12/web-tm_pl_lightred-plc_t04-static-emitter-smoke-proof-v6-current.mp4`
  - `backend/docs/aurora-reverse/artifacts/placeable-vfx-emitters-2026-07-12/web-tm_pl_lightred-plc_t04-static-emitter-smoke-proof-v6-current.frame.json`

## Evidence observed during this audit

Final local frame metrics from the proof packet:

- `canvasNonblank=true`
- `devObjectPixels=7713`
- `devDrawParticles=3`
- `devRenderedVertices=136`
- `devDrawLanes=source-mdl|Lighten|Normal`
- `devSourceMdlStaticGeometryNodeCount=2`
- `devSourceMdlStaticGeometryNodes=Rectangle121, Plane25`
- `devEmitterCount=2`
- `devPreviewVisibleMeshCount=3`
- `sourceMdlPayloadReady=true`
- `canonicalParityPromoted=false`
- `localOnlyNotRetailEvidence=true`

The final PNG is present and is 1440x760, 32738 bytes.

The comparison artifact
`plc_t04-aurora-retail-vs-web-close-comparison.json` exists, but it explicitly
marks the oracle and web views as not camera/background comparable. Its
assessment keeps `canonicalParityPromoted=false` and names a remaining
same-camera crop blocker. Therefore it is useful diagnostic evidence, not an
acceptance proof.

## Open risks

- Single runtime convergence remains open. The thread implemented a composition
  slice, but did not remove the duplicate placeable-preview simulator or make one
  `AuroraEmitterRuntime` authoritative for pure VFX and placeables.
- Multi-emitter runtime packaging remains open. Placeable payloads can carry
  emitter arrays, but pure VFX runtime packaging is still centered around one
  source emitter.
- Canonical render-mode geometry remains open. The audit document still says the
  canonical frontend renderer records render mode but does not fully drive
  billboard/world/local/linked/motion geometry from it.
- Retail parity remains open. The thread's own final correction says the work
  was compared to MDL/decompilation and local web proof, not to an accepted
  Aurora Toolset visual pair.
- The worktree remains dirty with implementation edits and new docs/artifacts.
  This audit did not review each diff hunk for code quality or regressions.

## Changed files observed

Modified source/test/script files:

- `backend/scripts/capture-vfx-app-route-cdp.mjs`
- `backend/src/modules/catalog/application/catalog.application.service.ts`
- `backend/src/modules/catalog/domain/template.types.ts`
- `backend/src/modules/vfx/domain/aurora-mdl-vfx-source.parser.ts`
- `backend/test/unit/catalog.application.service.spec.ts`
- `frontend/src/modules/layout/adapters/three/workspaceObjectMeshLayer.ts`
- `frontend/src/modules/layout/adapters/three/workspacePlaceableModelPresentation.ts`
- `frontend/src/modules/placeables/adapters/httpPlaceableApiPort.ts`
- `frontend/src/modules/placeables/contracts.ts`
- `frontend/src/modules/vfx/dev/CatalogVfxPreviewRunner.tsx`
- `frontend/tests/unit/modules/layout/workspaceObjectMeshLayer.vfxRenderMode.test.ts`
- `frontend/tests/unit/modules/vfx/dev/CatalogVfxPreviewRunner.test.ts`

New docs observed:

- `backend/docs/aurora-reverse/audit-artifact-policy.md`
- `backend/docs/aurora-reverse/vfx-placeable-emitter-architecture-audit-2026-07-12.md`
- `backend/docs/aurora-reverse/codex-thread-audit-019f5022-2026-07-12.md`

## Acceptance status

Accepted as complete:

- Thread-level diagnosis of the architectural split.
- Documentation of the P0/P1/P2 remediation plan.
- Local proof that `plc_t04` can render static source-MDL geometry with flame
  and smoke in the web route.

Not accepted as complete:

- Aurora Toolset/retail visual parity.
- Single runtime convergence.
- Removal of duplicate placeable emitter simulation.
- Full canonical renderer parity for render modes and non-Fountain families.
- General proof across more than the `plc_t04` representative slice.

## Next audit gate

Before claiming this work as done, require a paired proof packet:

1. Same fixture, time, camera, and comparable background for Aurora Toolset or
   retail oracle and Aurora Web.
2. Side-by-side PNG plus raw frame/state JSON.
3. Explicit statement of whether differences are confirmed parity, accepted
   local-only behavior, or unresolved blockers.
4. Runtime contract check showing pure VFX and placeable hosts consume the same
   ordered emitter draw contract.
