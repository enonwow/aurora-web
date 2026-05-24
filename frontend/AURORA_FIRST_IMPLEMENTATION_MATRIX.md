# Aurora First Implementation Matrix

Date snapshot: 2026-05-24  
Scope: `frontend/` implementation status (code + tests), not only reverse notes.
Operational board: `frontend/AURORA_FRONTEND_EXECUTION_BOARD.md`
Retail hard-confirm test plan: `frontend/AURORA_RETAIL_HARDCONFIRM_TEST_PLAN.md`

Status legend:
- `IMPLEMENTED`: shipped in current codebase and covered by tests.
- `SHELL`: visible UI/contract shell exists, but behavior is intentionally limited.
- `NOT_STARTED`: no runtime data model/flow yet in frontend.
- `RETAIL_CONFIRM`: blocked on hard retail confirmation before semantic finalization.

## Scope lanes
1. Placeables + Adjust Location + Visual Transform
2. Placeable Properties + Scripts tabs
3. VFX + Sound
4. Tiles + Tilesets + Groups
5. Doors + Transitions + Links
6. Area pipeline + Coordinates + Walkmesh

---

## 1) Placeables + Adjust Location + Visual Transform

Status: `IMPLEMENTED` (MVP lane)

Implemented now:
1. `Adjust Location` dialog with `Position (X/Y/Z)`, `Orientation (Bearing)`, bearing dial, `Apply/OK/Cancel`.
2. Multi-selection edit path with one commit step per apply.
3. `Cancel` restores dialog-open snapshots.
4. Visual transform fields in the same dialog, shown only for `placeables/creatures/items`.
5. `Static` placeables store visual-transform values, renderer ignores them while `isStatic=true`.
6. Door guardrails are active: no generic move/rotate/adjust location for doors.

Evidence in repo:
1. `frontend/src/modules/layout/components/WorkspaceCanvasViewport.tsx`
2. `frontend/src/modules/scene/application/sceneMutationsFacade.ts`
3. `frontend/tests/regression-smoke/workspace/Workspace.regression-smoke.test.tsx`
4. `frontend/tests/unit/modules/scene/application/sceneMutationsFacade.test.ts`

Known implementation gaps (coding backlog, not retail-blocked):
1. Static-object generic gizmo movement is still allowed for placeables (only visual-transform rendering is gated by `isStatic`).
2. Numeric clamps/step precision in dialog are still generic MVP, not Aurora-precise per field.
3. No explicit test for repeated `Apply` history granularity beyond current smoke coverage.

Retail-hard-confirm gaps:
1. Exact Aurora orientation dial math/snapping/wrap behavior.
2. Canonical ARE/GIT serialization mapping for visual transform payload.

---

## 2) Placeable Properties + Scripts tabs

Status: `SHELL`

Implemented now:
1. `Placeable Object Properties` window shell with tabs: `Basic`, `Scripts`, `Advanced`, `Description`, `Comments`.
2. Active writable fields: `Name`, `Tag`, `Appearance Type (resRef)`, `Static`.
3. `Apply/OK/Cancel` semantics wired through mutations facade.

Implemented with explicit Post-MVP placeholders:
1. `Plot`, `Useable`, `Has Inventory`, saves/resists fields and tab internals are disabled placeholders.
2. Script slots are not editable yet.

Evidence in repo:
1. `frontend/src/modules/layout/components/WorkspaceCanvasViewport.tsx`
2. `frontend/src/modules/scene/application/sceneMutationsFacade.ts`
3. `frontend/tests/unit/modules/scene/application/sceneMutationsFacade.test.ts`

Coding backlog (now):
1. Promote disabled Basic flags to preserve-only payload fields.
2. Add script-slot data shape in scene contract + mutation facade (preserve-only first).
3. Add per-tab activation rollout with tests for each promoted control.

Retail-hard-confirm gaps:
1. Final canonical keys/polarity for unresolved fields (`Reflex Save` key spelling, `No Interrupt`, `Treasure Model`, `OnFailToOpen` visibility).

---

## 3) VFX + Sound

Status: `SHELL` (sound object only), `NOT_STARTED` (VFX runtime)

Implemented now:
1. `sounds` exist as scene objects and can be selected/moved through generic object pipeline.
2. Sound objects appear in catalog and visibility/lock/isolation tooling.
3. No dedicated sound positioning dialog or mode-specific data model.

Not implemented yet:
1. Sound mode triad (`everywhere` / `random each play` / `specific position`) and its parameter set.
2. Sound attenuation/random-box visualization parity.
3. VFX object/runtime contracts (catalog has only post-MVP placeholder type).

Evidence in repo:
1. `frontend/src/modules/scene/contracts.ts`
2. `frontend/src/modules/layout/components/WorkspaceCanvasViewport.tsx`
3. `frontend/src/modules/layout/application/sceneObjectCatalogQueryFacade.ts`

Coding backlog (now):
1. Extend `SceneObject` model for sound positioning payload (mode + ranges + attenuation + scheduling).
2. Add Sound Properties dialog shell with deterministic mode-gating.
3. Add viewport overlays as editor-only primitives, never serialized as runtime entities.
4. Add VFX preserve-only catalog/model skeleton to avoid ad-hoc later schema.

Retail-hard-confirm gaps:
1. Exact runtime semantics for sound playback/attenuation edge-cases.
2. VFX runtime math: blend/sort/overflow/collision behavior.

---

## 4) Tiles + Tilesets + Groups

Status: `SHELL`

Implemented now:
1. Tile grid with basic fields (`terrain`, `orientation`, `rotateTexture`, `plot`).
2. Terrain mutation path (`updateTileTerrain`) and viewport rendering basics.

Not implemented yet:
1. Tileset parser/resolver (`Tile_ID -> model`), group contracts, master-cell rules.
2. Deterministic tileset cache and strict area/tileset validation pipeline.

Evidence in repo:
1. `frontend/src/modules/scene/contracts.ts`
2. `frontend/src/modules/scene/domain/sceneFactory.ts`
3. `frontend/src/modules/scene/application/sceneMutationsFacade.ts`

Coding backlog (now):
1. Add tileset domain model + adapter boundary (preserve-only first for unresolved semantics).
2. Implement structural validators (`width*height == tile_count`, group consistency).
3. Add orientation parity tests on transform axis path.

Retail-hard-confirm gaps:
1. 2x2 master-cell semantics and neighborhood material precedence from retail.

---

## 5) Doors + Transitions + Links

Status: `PARTIAL`

Implemented now:
1. Door anchor guardrails are active across context menu, keyboard move, transform controls, and mutation facade.
2. Adjust Location action is hidden for doors.

Not implemented yet:
1. Door transition/link payload in scene model (`LinkedTo*`, destination/module, `LoadScreenID`).
2. Preserve-only roundtrip for transition aliases.

Evidence in repo:
1. `frontend/src/modules/layout/components/WorkspaceCanvasViewport.tsx`
2. `frontend/src/modules/scene/application/sceneMutationsFacade.ts`
3. `frontend/tests/regression-smoke/workspace/Workspace.regression-smoke.test.tsx`
4. `frontend/tests/unit/modules/scene/application/sceneMutationsFacade.test.ts`

Coding backlog (now):
1. Extend scene schema with preserve-only door transition block.
2. Add Door Properties shell for transition fields (read-only/preserve-first).
3. Add alias-safe parse/write tests in frontend contract layer.

Retail-hard-confirm gaps:
1. Real semantics of `LinkedToFlags`, `LoadScreenID`, and write-path normalization policy.

---

## 6) Area pipeline + Coordinates + Walkmesh

Status: `PARTIAL`

Implemented now:
1. Coordinate operations are deterministic in frontend (`x/y` clamp, `bearing` normalization, `offsetZ` floor).
2. History + local draft persistence pipeline is in place.
3. Walkmesh overlay toggle exists in tooling as debug UI switch.

Not implemented yet:
1. Walkmesh data model/query engine/pathing semantics in frontend.
2. ARE/GIT/IFO integration and retail parity fixtures.

Evidence in repo:
1. `frontend/src/modules/scene/application/sceneMutationsFacade.ts`
2. `frontend/src/modules/scene/adapters/localDraftStore.ts`
3. `frontend/src/modules/layout/roleTopbarPolicy.ts`

Coding backlog (now):
1. Introduce explicit coordinate parity fixture set (known expected input/output).
2. Wire walkmesh payload contract (even stubbed) to replace UI-only toggle.
3. Add area import/export boundary contracts (ARE/GIT preserve-only first).

Retail-hard-confirm gaps:
1. Global origin, axis sign conventions, and cross-area pathing parity against retail.

---

## Aurora First Backlog (Execution Split)

### Track A: code now (no retail blocker)
1. `AF-NOW-01` Enforce static-placeable move policy in generic gizmo/keyboard paths.
2. `AF-NOW-02` Expand placeable properties payload (preserve-only flags + script slots schema).
3. `AF-NOW-03` Add sound positioning domain + dialog shell with strict mode gating.
4. `AF-NOW-04` Add tileset/groups domain scaffolding with deterministic validators.
5. `AF-NOW-05` Add door transition preserve-only schema and shell UI.
6. `AF-NOW-06` Add focused regression suite for adjust-location multi-selection and history semantics.

### Track B: retail-hard-confirm later
1. `AF-RHC-01` Confirm orientation/bearing dial math and snapping rules.
2. `AF-RHC-02` Confirm canonical ARE/GIT key mapping for visual transforms and door transitions.
3. `AF-RHC-03` Confirm sound runtime behavior edge-cases (mode semantics, attenuation, scheduling).
4. `AF-RHC-04` Confirm VFX runtime semantics (blend/sort/collision/limits).
5. `AF-RHC-05` Confirm tileset master-cell and neighborhood precedence rules.
6. `AF-RHC-06` Confirm world-origin and axis-sign parity across area/module pipelines.

## Decision policy
1. `Track A` can be implemented immediately with preserve-only strategy where needed.
2. `Track B` items must not be guessed into canonical semantics before hard confirmation.
