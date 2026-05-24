# Frontend Architecture (Aurora Hexagonal)

## Goal
Frontend follows a modular monolith with hexagonal boundaries to keep:
1. Aurora First consistency with backend architecture style.
2. Facade-first integration for UI and mocks.
3. Safe growth without cross-module coupling.

## Layer Model per Context
For each context in `src/modules/<context>` use:
1. `domain/` for pure rules and domain types (no React, no browser APIs).
2. `application/` for use-cases and facades used by UI.
3. `ports/` for interfaces that application depends on.
4. `adapters/` for concrete implementations of ports (localStorage, HTTP, mock, telemetry, etc.).
5. `ui/` or `components/` for React views that call facades only.

## Dependency Rules
1. `ui -> application -> ports`.
2. `adapters -> ports` and may use infra/browser libs.
3. `domain` must not depend on UI, adapters, or browser APIs.
4. Components must not import adapters directly.
5. Cross-context calls should go through explicit public contracts/facades, not direct internal files.
6. Facade/adapter construction belongs to composition roots (`App.tsx` or `composition/*`), not leaf UI components.

## Current Migration Status
1. `scene` started migration:
   - `domain/sceneFactory.ts`
   - `domain/sceneHistory.ts`
   - `domain/copyPlacement.ts`
   - `application/sceneCanvasFacade.ts`
   - `application/sceneHistoryFacade.ts`
   - `application/sceneMutationsFacade.ts`
   - `application/sceneAuthoringFacade.ts`
   - `application/sceneFacadeBundle.ts`
   - `ports/sceneDraftPort.ts`
   - `adapters/localDraftStore.ts`
   - `adapters/localStorageSceneDraftPort.ts`
   - `composition/createBrowserSceneFacadeBundle.ts`
2. `WorkspaceCanvasViewport` now consumes composed scene facades (canvas/history/mutations/authoring) and no longer imports scene domain internals directly.
3. `layout` migrated to facade-first composition:
   - `application/layoutPreferencesFacade.ts`
   - `application/workspaceChromeFacade.ts`
   - `application/viewportFacade.ts`
   - `application/workspaceTopbarActionStateFacade.ts`
   - `application/sceneObjectCatalogQueryFacade.ts`
   - `application/layoutFacadeBundle.ts`
   - `contracts.ts` (explicit layout boundary contract)
   - `ports/layoutPreferencesPort.ts`
   - `adapters/browserLayoutPreferencesPort.ts`
   - `composition/createBrowserLayoutFacadeBundle.ts`
4. UI entrypoints consume injected facades/ports instead of local singleton construction:
   - `App.tsx`
   - `WorkspaceTopbar.tsx`
   - `WorkspaceMockLayout.tsx`
   - `WorkspaceCanvasViewport.tsx`
5. Layout now centralizes scene/auth boundary typing via `layout/contracts.ts`, so components and layout application no longer reach directly into other contexts' internal files.

## Delivery Rules for New Changes
1. Every new UI flow should start with/update a facade in `application/`.
2. Every external dependency needed by application must be represented as a port.
3. Adapter selection belongs to composition/root level, not domain logic.
4. Tests:
   - unit tests for application facades and domain logic,
   - targeted tests for adapters,
   - regression-smoke unchanged baseline must stay green.

## Aurora Reverse-Engineering Constraints (Object Transforms)
These constraints are part of `Aurora First` parity and are not optional UI preferences.

1. `doors` are anchor-bound objects. They cannot be freely translated with generic object move flows.
2. `doors` must not accept generic `visualTransform` editing (`offset*`, `pitch/roll/yaw`) in editor transform flows.
3. Multi-selection transform is blocked when selection contains at least one `door`.
4. Bulk move/transform operations apply only to movable kinds (`placeables`, `creatures`, `items`, `sounds`) and still respect layer locks.
5. If future work requires moving a door, it must go through a dedicated door-anchor workflow (not shared transform tools).
6. `door` context actions should not expose generic `Adjust Location` in parity mode.

## Aurora Reverse-Engineering Notes (Sound Positioning)
1. Sound positioning parity rules are tracked in:
   - `frontend/AURORA_SOUND_POSITIONING_PARITY.md`

## Aurora Reverse-Engineering Notes (Adjust Location)
1. Static-object `Adjust Location` and `Static` semantics are tracked in:
   - `frontend/AURORA_ADJUST_LOCATION_PARITY.md`

## Aurora Reverse-Engineering Notes (Window Shells)
1. Property-window parity and phased activation policy are tracked in:
   - `frontend/AURORA_WINDOW_SHELLS_POLICY.md`
2. Placeable property-window parity scope is tracked in:
   - `frontend/AURORA_PLACEABLE_PROPERTIES_PARITY.md`

## Aurora Reverse-Engineering Notes (Decompilation Evidence)
1. Ghidra-based evidence index for Aurora First implementation is tracked in:
   - `frontend/AURORA_DECOMPILATION_KNOWLEDGE.md`
2. Cross-domain implementation readiness matrix (`CONFIRMED/PARTIAL/UNKNOWN`) is tracked in:
   - `frontend/AURORA_FIRST_IMPLEMENTATION_MATRIX.md`
