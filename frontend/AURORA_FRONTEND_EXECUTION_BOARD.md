# Aurora Frontend Execution Board

Date snapshot: 2026-05-25  
Scope: operacyjna tablica realizacji Aurora First dla frontendu (`docs-only board`).
Retail hard-confirm test plan: `frontend/AURORA_RETAIL_HARDCONFIRM_TEST_PLAN.md`

## Legend
- `Status`: `ToDo` | `InProgress` | `Done`
- `Risk`: `Green/Low`, `Amber/Medium`, `Red/High`
- `Gate tests`: testy wymagane przed zamknieciem zadania (istniejace lub do dodania)

## Board (20 Tasks)
| ID | Task | Lane | Status | Owner | Dependencies | Risk | Gate tests |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `AFEB-01` | Zsynchronizowac matrix z realnym stanem implementacji + statusy lane | Now | Done | Worker E | - | Green/Low | Manual docs review (`AURORA_FIRST_IMPLEMENTATION_MATRIX.md`) |
| `AFEB-02` | Utworzyc execution board i podpiac linki w docs nadrzednych | Now | Done | Worker E | `AFEB-01` | Green/Low | Manual docs review (`ARCHITECTURE.md`, `AURORA_FIRST_IMPLEMENTATION_MATRIX.md`) |
| `AFEB-03` | Wymusic static-placeable move policy (blokada generic move dla `isStatic=true`) | Now | Done | Worker A | `AFEB-01` | Green/Low | `frontend/tests/unit/modules/scene/application/sceneMutationsFacade.test.ts` (`blocks generic transform flows for static placeables`), `frontend/tests/regression-smoke/workspace/Workspace.static-placeable.regression-smoke.test.tsx` |
| `AFEB-04` | Dodac testy regresji dla static move policy (keyboard/gizmo/context flow) | Now | Done | Worker A | `AFEB-03` | Green/Low | `frontend/tests/regression-smoke/workspace/Workspace.static-placeable.regression-smoke.test.tsx`, `frontend/tests/unit/modules/layout/visualTransformGizmoRules.test.ts` |
| `AFEB-05` | Rozszerzyc schema placeable o preserve-only: `Plot/Useable/HasInventory` | Now | Done | Worker B | `AFEB-01` | Green/Low | `frontend/tests/unit/modules/scene/sceneFactory.test.ts`, `frontend/tests/unit/modules/scene/application/sceneMutationsFacade.placeableProperties.test.ts` |
| `AFEB-06` | Dodac preserve-only schema script slots placeable | Now | Done | Worker B | `AFEB-05` | Green/Low | `frontend/tests/unit/modules/scene/domain/sceneFactory.test.ts`, `frontend/tests/unit/modules/scene/application/sceneMutationsFacade.placeableProperties.test.ts` |
| `AFEB-07` | Aktywacja tabow Placeable Properties faza 1 (read/write tylko bez retail guesses) | Now | Done | Worker B | `AFEB-05`, `AFEB-06` | Green/Low | `frontend/tests/regression-smoke/workspace/Workspace.door-properties.regression-smoke.test.tsx`, `frontend/tests/unit/app/App.workspacePanels.test.tsx` |
| `AFEB-08` | Dodac sound positioning payload do `SceneObject` (mode/range/attenuation/schedule) | Now | Done | Worker C | `AFEB-01` | Green/Low | `frontend/tests/unit/modules/scene/domain/sceneFactory.soundPositioning.test.ts`, `frontend/tests/unit/modules/scene/application/sceneCanvasFacade.test.ts` |
| `AFEB-09` | Zaimplementowac Sound Properties dialog shell (`Basic/Positioning/Advanced`) | Now | Done | Worker C | `AFEB-08` | Green/Low | `frontend/tests/regression-smoke/workspace/Workspace.sound-properties.regression-smoke.test.tsx` |
| `AFEB-10` | Wymusic mode gating dla dzwieku (`everywhere/random/specific`) | Now | Done | Worker C | `AFEB-09` | Green/Low | `frontend/tests/regression-smoke/workspace/Workspace.sound-properties.regression-smoke.test.tsx`, `frontend/tests/unit/modules/scene/sceneFactory.test.ts`, `frontend/tests/unit/modules/scene/application/sceneCanvasFacade.test.ts` |
| `AFEB-11` | Dodac editor-only sound guides (glyph/anchor/range/box) bez serializacji runtime | Now | ToDo | Worker C | `AFEB-09`, `AFEB-10` | Amber/Medium | nowe viewport tests + non-serialization assertions |
| `AFEB-12` | Dodac VFX preserve-only skeleton (katalog + schema) bez runtime semantics | Now | ToDo | Worker C | `AFEB-01` | Green/Low | `frontend/tests/unit/modules/layout/SceneObjectListPanel.test.tsx` + nowe schema tests |
| `AFEB-13` | Dodac tileset/groups domain scaffolding (porty + preserve-first contracts) | Now | Done | Worker D | `AFEB-01` | Green/Low | `frontend/tests/unit/modules/scene/domain/tilesets.test.ts` |
| `AFEB-14` | Wdrozyc structural validators tiles (`width*height`, group consistency) | Now | Done | Worker D | `AFEB-13` | Green/Low | `frontend/tests/unit/modules/scene/domain/tilesetsValidators.test.ts` |
| `AFEB-15` | Dodac preserve-only schema door transitions (`LinkedTo*`, `LoadScreenID`, dest/module) | Now | Done | Worker D | `AFEB-01` | Green/Low | `frontend/tests/unit/modules/scene/domain/sceneFactory.doorTransitions.test.ts` |
| `AFEB-16` | Dodac Door Properties shell dla transition fields (read-only/preserve-first) | Now | Done | Worker D | `AFEB-15` | Green/Low | `frontend/tests/regression-smoke/workspace/Workspace.door-properties.regression-smoke.test.tsx` |
| `AFEB-17` | Dodac coordinate parity fixtures (znane expected input/output) | Now | Done | Worker A | `AFEB-01` | Green/Low | `frontend/tests/unit/modules/scene/application/sceneMutationsFacade.coordinateParity.test.ts`, `frontend/tests/regression-smoke/workspace/Workspace.coordinate-parity.regression-smoke.test.tsx` |
| `AFEB-18` | Dodac walkmesh payload contract stub + zastapic UI-only toggle kontraktem | Now | InProgress | Worker A | `AFEB-17` | Amber/Medium | `frontend/tests/unit/modules/scene/domain/walkmesh.test.ts`, `frontend/tests/unit/modules/scene/application/sceneCanvasFacade.test.ts` |
| `AFEB-19` | Retail hard confirm: bearing dial math + numeric clamp/precision matrix | RetailConfirm | ToDo | Worker E | `AFEB-03`, `AFEB-17` | Red/High | retail parity report + targeted regression tests (bearing/full-turn/snap) |
| `AFEB-20` | Retail hard confirm: ARE/GIT write semantics (door transitions, sound modes, tileset precedence, world origin) | RetailConfirm | ToDo | Worker E | `AFEB-06`, `AFEB-10`, `AFEB-14`, `AFEB-15`, `AFEB-18` | Red/High | retail parity report + preserve-only roundtrip tests |

## Priority Queue (Execution Order)
1. `AFEB-11`, `AFEB-12`
2. `AFEB-18`
3. `AFEB-19`, `AFEB-20`

## Update Rules
1. Status zmieniamy tylko po aktualizacji `Dependencies`, `Risk` i `Gate tests`.
2. Zadanie oznaczamy `Done` dopiero gdy gate tests sa zielone lub maja udokumentowany waiver.
3. `RetailConfirm` nie moze zamknac semantyki runtime bez hard evidence.
