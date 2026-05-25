# Aurora First Implementation Matrix

Date snapshot: 2026-05-25  
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
7. Static placeable generic move/rotate is blocked in world-transform flows (keyboard/gizmo/context-driven path entry), while `Adjust Location` remains explicit.

Evidence in repo:
1. `frontend/src/modules/layout/components/WorkspaceCanvasViewport.tsx`
2. `frontend/src/modules/scene/application/sceneMutationsFacade.ts`
3. `frontend/tests/regression-smoke/workspace/Workspace.regression-smoke.test.tsx`
4. `frontend/tests/unit/modules/scene/application/sceneMutationsFacade.test.ts`

Known implementation gaps (coding backlog, not retail-blocked):
1. Numeric clamps/step precision in dialog are still generic MVP, not Aurora-precise per field.
2. No explicit test for repeated `Apply` history granularity beyond current smoke coverage.

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
4. Preserve-first placeable payload includes `plot/useable/hasInventory` with script-slot and disabled-flag schema normalization.

Implemented with explicit Post-MVP placeholders:
1. `Plot`, `Useable`, `Has Inventory` UI controls remain disabled placeholders.
2. Script slots are stored/normalized as preserve-first payload, but not editable in UI yet.

Evidence in repo:
1. `frontend/src/modules/layout/components/WorkspaceCanvasViewport.tsx`
2. `frontend/src/modules/scene/application/sceneMutationsFacade.ts`
3. `frontend/tests/unit/modules/scene/sceneFactory.test.ts`
4. `frontend/tests/unit/modules/scene/domain/sceneFactory.test.ts`
5. `frontend/tests/unit/modules/scene/application/sceneMutationsFacade.placeableProperties.test.ts`

Coding backlog (now):
1. Add per-tab activation rollout with tests for each promoted control.
2. Add UI editing flows for script slots without changing preserve-first contract policy.

Retail-hard-confirm gaps:
1. Final canonical keys/polarity for unresolved fields (`Reflex Save` key spelling, `No Interrupt`, `Treasure Model`, `OnFailToOpen` visibility).

---

## 3) VFX + Sound

Status: `PARTIAL` (sound shell + mode gating), `NOT_STARTED` (VFX runtime)

Implemented now:
1. `sounds` exist as scene objects and can be selected/moved through generic object pipeline.
2. Sound objects appear in catalog and visibility/lock/isolation tooling.
3. Sound properties shell is implemented with tabs (`Basic`, `Positioning`, `Advanced`) and `Apply/OK/Cancel`.
4. Deterministic mode gating is implemented for `everywhere/random/specific`.
5. Sound positioning payload fields are wired in frontend object model and normalized on load/factory paths.

Not implemented yet:
1. Sound attenuation/random-box viewport guides parity.
2. Extended sound payload beyond current baseline (scheduling/variation fields).
3. VFX object/runtime contracts (catalog has only post-MVP placeholder type).

Evidence in repo:
1. `frontend/src/modules/scene/contracts.ts`
2. `frontend/src/modules/layout/components/WorkspaceCanvasViewport.tsx`
3. `frontend/src/modules/layout/application/sceneObjectCatalogQueryFacade.ts`
4. `frontend/tests/regression-smoke/workspace/Workspace.sound-properties.regression-smoke.test.tsx`
5. `frontend/tests/unit/modules/scene/sceneFactory.test.ts`
6. `frontend/tests/unit/modules/scene/application/sceneCanvasFacade.test.ts`

Coding backlog (now):
1. Add viewport overlays as editor-only primitives, never serialized as runtime entities.
2. Extend sound payload for scheduling/variation fields using preserve-first strategy.
3. Add VFX preserve-only catalog/model skeleton to avoid ad-hoc later schema.

Retail-hard-confirm gaps:
1. Exact runtime semantics for sound playback/attenuation edge-cases.
2. VFX runtime math: blend/sort/overflow/collision behavior.

---

## 4) Tiles + Tilesets + Groups

Status: `PARTIAL`

Implemented now:
1. Tile grid with basic fields (`terrain`, `orientation`, `rotateTexture`, `plot`).
2. Terrain mutation path (`updateTileTerrain`) and viewport rendering basics.
3. Tileset/groups preserve-first domain scaffolding is implemented.
4. Structural validators are implemented (`width*height == tile_count`, group consistency checks).

Not implemented yet:
1. Tileset parser/resolver (`Tile_ID -> model`), group contracts, master-cell rules.
2. Deterministic tileset cache and strict area/tileset validation pipeline.

Evidence in repo:
1. `frontend/src/modules/scene/contracts.ts`
2. `frontend/src/modules/scene/domain/sceneFactory.ts`
3. `frontend/src/modules/scene/application/sceneMutationsFacade.ts`
4. `frontend/src/modules/scene/domain/tilesets.ts`
5. `frontend/src/modules/scene/domain/tilesetsValidators.ts`
6. `frontend/tests/unit/modules/scene/domain/tilesets.test.ts`
7. `frontend/tests/unit/modules/scene/domain/tilesetsValidators.test.ts`

Coding backlog (now):
1. Add adapter boundary for tileset I/O and preserve-only import/export contracts.
2. Add orientation parity tests on transform axis path.
3. Wire tileset model resolution path (`Tile_ID -> model`) without retail-semantic guessing.

Retail-hard-confirm gaps:
1. 2x2 master-cell semantics and neighborhood material precedence from retail.

---

## 5) Doors + Transitions + Links

Status: `PARTIAL`

Implemented now:
1. Door anchor guardrails are active across context menu, keyboard move, transform controls, and mutation facade.
2. Adjust Location action is hidden for doors.
3. Preserve-first `doorTransition` payload schema is implemented with defensive normalization.
4. Door Properties shell exists with read-only transition payload tab (`Basic/Transition/Comments`).

Not implemented yet:
1. Editable door transition write flow (currently read-only shell).
2. Alias-specific import/export compatibility roundtrip at area I/O boundary.

Evidence in repo:
1. `frontend/src/modules/layout/components/WorkspaceCanvasViewport.tsx`
2. `frontend/src/modules/scene/application/sceneMutationsFacade.ts`
3. `frontend/src/modules/scene/domain/sceneFactory.ts`
4. `frontend/tests/regression-smoke/workspace/Workspace.regression-smoke.test.tsx`
5. `frontend/tests/regression-smoke/workspace/Workspace.door-properties.regression-smoke.test.tsx`
6. `frontend/tests/unit/modules/scene/domain/sceneFactory.doorTransitions.test.ts`
7. `frontend/tests/unit/modules/scene/application/sceneMutationsFacade.test.ts`

Coding backlog (now):
1. Add alias-safe parse/write tests in frontend contract layer.
2. Add editable workflow only where retail semantics are hard-confirmed.

Retail-hard-confirm gaps:
1. Real semantics of `LinkedToFlags`, `LoadScreenID`, and write-path normalization policy.

---

## 6) Area pipeline + Coordinates + Walkmesh

Status: `PARTIAL`

Implemented now:
1. Coordinate operations are deterministic in frontend (`x/y` clamp, `bearing` normalization, `offsetZ` floor).
2. History + local draft persistence pipeline is in place.
3. Walkmesh overlay toggle exists in tooling as debug UI switch.
4. Dedicated coordinate parity fixtures are implemented in unit + regression-smoke suites.
5. Preserve-first walkmesh payload contract stub exists in domain (`frontend/src/modules/scene/domain/walkmesh.ts`) with normalization/validation tests.

Not implemented yet:
1. Walkmesh runtime query engine/pathing semantics in frontend.
2. ARE/GIT/IFO integration and retail parity fixtures.

Evidence in repo:
1. `frontend/src/modules/scene/application/sceneMutationsFacade.ts`
2. `frontend/src/modules/scene/adapters/localDraftStore.ts`
3. `frontend/src/modules/layout/roleTopbarPolicy.ts`
4. `frontend/tests/unit/modules/scene/application/sceneMutationsFacade.coordinateParity.test.ts`
5. `frontend/tests/regression-smoke/workspace/Workspace.coordinate-parity.regression-smoke.test.tsx`

Coding backlog (now):
1. Wire walkmesh payload contract stub into import/export boundaries and replace UI-only assumptions.
2. Add area import/export boundary contracts (ARE/GIT preserve-only first).
3. Expand coordinate parity fixture set for edge-case snapshots (multi-selection bounds, mixed-kind clamps).

Retail-hard-confirm gaps:
1. Global origin, axis sign conventions, and cross-area pathing parity against retail.

---

## Aurora First Backlog (Execution Split)

### Track A: code now (no retail blocker)
1. `AF-NOW-01` Enforce static-placeable move policy in generic gizmo/keyboard paths. (`Done`)
2. `AF-NOW-02` Expand placeable properties payload (preserve-only flags + script slots schema). (`Done`)
3. `AF-NOW-03` Add sound positioning domain + dialog shell with strict mode gating. (`Done` for shell + mode gating baseline)
4. `AF-NOW-04` Add tileset/groups domain scaffolding with deterministic validators. (`Done` for scaffolding + validators)
5. `AF-NOW-05` Add door transition preserve-only schema and shell UI. (`Done` for preserve-only schema + read-only shell)
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
