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
5. Cross-context calls should go through public facades, not direct internal files.

## Current Migration Status
1. `scene` started migration:
   - `application/sceneCanvasFacade.ts`
   - `ports/sceneDraftPort.ts`
   - `adapters/localStorageSceneDraftPort.ts`
2. `WorkspaceCanvasViewport` now uses scene facade for draft load/save flow.

## Delivery Rules for New Changes
1. Every new UI flow should start with/update a facade in `application/`.
2. Every external dependency needed by application must be represented as a port.
3. Adapter selection belongs to composition/root level, not domain logic.
4. Tests:
   - unit tests for application facades and domain logic,
   - targeted tests for adapters,
   - regression-smoke unchanged baseline must stay green.

