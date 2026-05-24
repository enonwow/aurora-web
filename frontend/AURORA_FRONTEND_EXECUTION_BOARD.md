# Aurora Frontend Execution Board

Date snapshot: 2026-05-24  
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
| `AFEB-03` | Wymusic static-placeable move policy (blokada generic move dla `isStatic=true`) | Now | InProgress | Worker A | `AFEB-01` | Amber/Medium | `frontend/tests/regression-smoke/workspace/Workspace.regression-smoke.test.tsx`, nowe testy static-block |
| `AFEB-04` | Dodac testy regresji dla static move policy (keyboard/gizmo/context flow) | Now | ToDo | Worker A | `AFEB-03` | Amber/Medium | nowe testy smoke + `frontend/tests/unit/modules/scene/application/sceneMutationsFacade.test.ts` |
| `AFEB-05` | Rozszerzyc schema placeable o preserve-only: `Plot/Useable/HasInventory` | Now | InProgress | Worker B | `AFEB-01` | Amber/Medium | `frontend/tests/unit/modules/scene/application/sceneMutationsFacade.test.ts` |
| `AFEB-06` | Dodac preserve-only schema script slots placeable | Now | ToDo | Worker B | `AFEB-05` | Amber/Medium | nowe testy unit `sceneMutationsFacade` + snapshot contract tests |
| `AFEB-07` | Aktywacja tabow Placeable Properties faza 1 (read/write tylko bez retail guesses) | Now | ToDo | Worker B | `AFEB-05`, `AFEB-06` | Amber/Medium | nowe UI tests + `frontend/tests/unit/app/App.workspacePanels.test.tsx` |
| `AFEB-08` | Dodac sound positioning payload do `SceneObject` (mode/range/attenuation/schedule) | Now | InProgress | Worker C | `AFEB-01` | Amber/Medium | nowe unit tests dla kontraktu + `sceneMutationsFacade` |
| `AFEB-09` | Zaimplementowac Sound Properties dialog shell (`Basic/Positioning/Advanced`) | Now | ToDo | Worker C | `AFEB-08` | Amber/Medium | nowe regression smoke testy dialogu |
| `AFEB-10` | Wymusic mode gating dla dzwieku (`everywhere/random/specific`) | Now | ToDo | Worker C | `AFEB-09` | Amber/Medium | nowe testy mode-gating + payload roundtrip |
| `AFEB-11` | Dodac editor-only sound guides (glyph/anchor/range/box) bez serializacji runtime | Now | ToDo | Worker C | `AFEB-09`, `AFEB-10` | Amber/Medium | nowe viewport tests + non-serialization assertions |
| `AFEB-12` | Dodac VFX preserve-only skeleton (katalog + schema) bez runtime semantics | Now | ToDo | Worker C | `AFEB-01` | Green/Low | `frontend/tests/unit/modules/layout/SceneObjectListPanel.test.tsx` + nowe schema tests |
| `AFEB-13` | Dodac tileset/groups domain scaffolding (porty + preserve-first contracts) | Now | ToDo | Worker D | `AFEB-01` | Amber/Medium | nowe unit tests domeny tileset |
| `AFEB-14` | Wdrozyc structural validators tiles (`width*height`, group consistency) | Now | ToDo | Worker D | `AFEB-13` | Amber/Medium | nowe unit tests walidatorow + fixture tests |
| `AFEB-15` | Dodac preserve-only schema door transitions (`LinkedTo*`, `LoadScreenID`, dest/module) | Now | InProgress | Worker D | `AFEB-01` | Amber/Medium | nowe contract tests parse/write |
| `AFEB-16` | Dodac Door Properties shell dla transition fields (read-only/preserve-first) | Now | ToDo | Worker D | `AFEB-15` | Amber/Medium | nowe UI tests + smoke test context/menu flow |
| `AFEB-17` | Dodac coordinate parity fixtures (znane expected input/output) | Now | ToDo | Worker A | `AFEB-01` | Green/Low | `frontend/tests/unit/modules/scene/application/sceneMutationsFacade.test.ts` (rozszerzenie fixture suite) |
| `AFEB-18` | Dodac walkmesh payload contract stub + zastapic UI-only toggle kontraktem | Now | ToDo | Worker A | `AFEB-17` | Amber/Medium | nowe tests kontraktu + wiring tests |
| `AFEB-19` | Retail hard confirm: bearing dial math + numeric clamp/precision matrix | RetailConfirm | ToDo | Worker E | `AFEB-03`, `AFEB-17` | Red/High | retail parity report + targeted regression tests (bearing/full-turn/snap) |
| `AFEB-20` | Retail hard confirm: ARE/GIT write semantics (door transitions, sound modes, tileset precedence, world origin) | RetailConfirm | ToDo | Worker E | `AFEB-06`, `AFEB-10`, `AFEB-14`, `AFEB-15`, `AFEB-18` | Red/High | retail parity report + preserve-only roundtrip tests |

## Priority Queue (Execution Order)
1. `AFEB-03`, `AFEB-05`, `AFEB-08`, `AFEB-15`
2. `AFEB-04`, `AFEB-06`, `AFEB-09`, `AFEB-13`
3. `AFEB-10`, `AFEB-11`, `AFEB-14`, `AFEB-16`, `AFEB-17`, `AFEB-18`
4. `AFEB-19`, `AFEB-20`

## Update Rules
1. Status zmieniamy tylko po aktualizacji `Dependencies`, `Risk` i `Gate tests`.
2. Zadanie oznaczamy `Done` dopiero gdy gate tests sa zielone lub maja udokumentowany waiver.
3. `RetailConfirm` nie moze zamknac semantyki runtime bez hard evidence.
