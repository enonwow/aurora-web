# Aurora Web UI/UX Loop - 2026-06-24

Scope: iterative frontend UX/UI cleanup for the whole workspace surface: left and right sidebars, area object placement, mode switching ergonomics, action target sizing, and component separation.

Rule used in this loop: every iteration must identify a user-facing friction point, ship a scoped code change, and record proof.

## Iteration 1 - Area Object Placement Flow

Problem:

- Add Objects was still unpleasant for area building because the click-to-place flow ended after one object.
- Bulk placement forced the user back to the left panel after every single object.

Changed:

- `Place` now arms a persistent placement tool.
- Clicking an area tile adds the object and keeps the same template armed for the next tile.
- Right-click or `Esc` exits placement mode.
- The canvas prompt now describes the active placement tool state.

Files:

- `frontend/src/modules/layout/components/useWorkspaceObjectAddDragDrop.ts`
- `frontend/src/modules/layout/components/WorkspaceCanvasViewport.tsx`
- `frontend/tests/unit/modules/layout/useWorkspaceObjectAddDragDrop.test.tsx`

Proof:

- `npm.cmd test -- useWorkspaceObjectAddDragDrop.test.tsx`

## Iteration 2 - Add Objects Payload And Row Separation

Problem:

- `SceneObjectAddPanel` and the canvas placement hook built object-add payloads independently.
- The Add Objects list mixed filtering, row rendering, drag payload creation, preview, and create actions in one component body.
- Users had to target the small `Place` button even when the row itself was already the object affordance.

Changed:

- Added `createObjectAddPayloadFromSceneObject()` in `application/objectAddDragPayload.ts`.
- Drag/drop and click-to-place now share the same payload contract.
- Extracted `SceneObjectAddRow` inside `SceneObjectAddPanel` so the panel owns filters while the row owns preview/drag/place behavior.
- Added row double-click as a faster way to arm placement.
- Updated the panel note from drag-only wording to placement-oriented wording.

Files:

- `frontend/src/modules/layout/application/objectAddDragPayload.ts`
- `frontend/src/modules/layout/components/SceneObjectAddPanel.tsx`
- `frontend/tests/unit/modules/layout/objectAddDragPayload.test.ts`
- `frontend/tests/unit/modules/layout/SceneObjectAddPanel.test.tsx`

Proof:

- `npm.cmd test -- SceneObjectAddPanel.test.tsx objectAddDragPayload.test.ts useWorkspaceObjectAddDragDrop.test.tsx`

## Iteration 3 - Areas Mode State Across Mode Switches

Problem:

- Workspace modes had focused scene seeds, but the latest area object snapshot was not captured when leaving Areas Mode.
- A user could add objects in Areas Mode, switch to a focused mode, and risk returning to an older area seed.

Changed:

- `WorkspaceMockLayout` now captures the latest area object snapshot when leaving Areas Mode.
- The capture happens on mode switch, not on every object change, so it does not reset the live viewport after each placement.
- Added a regression test that simulates a viewport object snapshot, switches to Placeables, returns to Areas, and verifies the added object is still in the area seed.

Files:

- `frontend/src/modules/layout/components/WorkspaceMockLayout.tsx`
- `frontend/tests/unit/modules/layout/WorkspaceLayout.viewportWiring.test.tsx`

Proof:

- `npm.cmd test -- WorkspaceMockLayout.viewportWiring.test.tsx SceneObjectAddPanel.test.tsx objectAddDragPayload.test.ts useWorkspaceObjectAddDragDrop.test.tsx`

## Iteration 4 - General Sidebar Action Targets

Problem:

- The loop was initially too focused on Add Objects behavior.
- A broader browser geometry audit showed `Place` row actions in the left panel resolving to about `14px` height, which is too small and unpleasant to click.
- The issue came from generic action-button styling being reused in a layout where the action button is a sibling of the row instead of a child inside it.

Changed:

- Add-list items now use a stable two-column grid when they contain row actions.
- Add-list action buttons now have a stable `48px` visual/click target.
- Generic row action buttons now have a minimum target height so similar compact actions do not collapse.

Files:

- `frontend/src/styles.css`

Proof:

- Browser proof after reload confirmed first `Place` action target at `54x53px`.

## Iteration 5 - Workspace Mode Scroll Reset

Problem:

- The sidebar could keep scroll positions from the previous workspace mode.
- This made mode switching feel stale: a new mode could appear midway through its panel instead of from its top controls.

Changed:

- `SidebarColumn` now owns a sidebar ref and resets scroll on the sidebar plus nested scroll containers when `workspaceModeId` changes.
- The reset is scoped to UI scroll containers and does not reset the canvas camera or scene state.

Files:

- `frontend/src/modules/layout/components/WorkspaceMockLayout.tsx`

Proof:

- `npm.cmd test -- WorkspaceMockLayout.viewportWiring.test.tsx ...`
- Browser proof after scroll plus mode switch confirmed `sidebarScrollAfterSwitch=0`, `contentScrollAfterSwitch=0`, and `modePanelScrollAfterSwitch=0`.

## Iteration 6 - Workspace Mode Switch Component Boundary

Problem:

- The workspace mode switch was implemented inline inside `WorkspaceMockLayout.tsx`, contributing to the monolithic UI file.
- This made mode UI harder to reason about separately from backend catalog and viewport state.

Changed:

- Extracted `WorkspaceModeSwitch` into its own component file.
- Added a focused unit test for accessible mode buttons and mode selection callback.

Files:

- `frontend/src/modules/layout/components/WorkspaceModeSwitch.tsx`
- `frontend/src/modules/layout/components/WorkspaceMockLayout.tsx`
- `frontend/tests/unit/modules/layout/WorkspaceModeSwitch.test.tsx`

Proof:

- `npm.cmd test -- WorkspaceModeSwitch.test.tsx`

## Iteration 7 - Ten Workspace-Wide UI/UX Corrections

Problem:

- The previous loop improved the area-building path, but the workspace still had repeated UI friction across the left panel, mode switch, topbar, status strip, and mode-specific lists.
- Area row actions were still discoverable mainly through right-click.
- Filters had no local clear affordance.
- Loading, alert, and empty messages looked too similar.
- Sound playback rows changed width when `Stop` appeared.

Changed:

1. Area rows now include a visible `Area actions` button that opens the same context menu as right-click.
2. Area row context menu telemetry records whether the menu came from right-click or the visible row action.
3. Area filters now have a local clear button.
4. Placeables filters now have a local clear button.
5. Sounds filters now have a local clear button.
6. The workspace status strip now renders compact labelled cells instead of one visually merged text run.
7. The active workspace mode button now exposes `aria-current="page"` in addition to `aria-pressed`.
8. The legacy Magic Mouth demo entry was still present as a separate affordance; this was later removed in Iteration 12.
9. Topbar Debug is visually compact while preserving full accessible labels and pressed state.
10. Focus-visible, loading, alert, and Sounds row action styling now have clearer, more stable affordances.

Files:

- `frontend/src/modules/layout/components/AreaSelectionPanel.tsx`
- `frontend/src/modules/layout/components/WorkspaceMockLayout.tsx`
- `frontend/src/modules/layout/components/WorkspaceModeSwitch.tsx`
- `frontend/src/modules/layout/components/WorkspaceTopbar.tsx`
- `frontend/src/styles.css`
- `frontend/tests/unit/modules/layout/WorkspaceModeSwitch.test.tsx`
- `frontend/tests/unit/modules/layout/WorkspaceLayout.viewportWiring.test.tsx`

Proof:

- `npm.cmd test -- WorkspaceModeSwitch.test.tsx WorkspaceMockLayout.viewportWiring.test.tsx WorkspaceTopbar.facades.test.tsx`
- `npx.cmd tsc -b --clean; npm.cmd run build`
- Browser proof on `http://127.0.0.1:5176/app` confirmed:
  - `aurora-toolset-classic` theme was active.
  - Workspace mode buttons expose active `aria-current="page"`.
  - Legacy note superseded by Iteration 12: the `Magic Mouth Demo` entry is no longer rendered.
  - Status strip renders 6 labelled cells: `Mode`, `Objects`, `Selection`, `Left`, `Right`, and `Activity`.
  - Typing in the Areas filter shows `Clear area filter` with a `24x24` target.
  - Switching to Sounds Mode marks `Sounds Mode` as active and renders the backend failure as a role `alert`.
- Browser data note: this local browser session returned `Session is invalid or expired.` for Areas and `Failed to load sounds from backend.` for Sounds, so row-level Areas/Sounds data proof was covered by unit tests rather than live backend rows.

## Iteration 8 - Filter Reset And Result Feedback

Problem:

- Areas showed only the total area count even after filtering, so the user could not tell how many rows matched.
- Empty filtered Areas lists looked like a missing panel instead of a valid zero-result state.
- Placeables and Sounds could be narrowed with multiple controls but had no single way back to the full catalog.
- Area GIT render payload loading had drifted away from the progressive status contract used by the workspace status strip.

Changed:

1. Areas now show `visible/total` counts while a search filter is active.
2. Areas now render an explicit `No areas match the current filter.` status when the filter returns zero rows.
3. Placeables now track loaded catalog total separately from the filtered visible rows.
4. Placeables now show `visible/loaded` counts whenever type or search filters are active.
5. Placeables now have a one-click `Reset filters` action that clears search, subtype, preview selection, preview errors, and stale catalog cache.
6. Sounds now show `visible/loaded` counts whenever search, category, or source filters are active.
7. Sounds now have a one-click `Reset filters` action that clears search, category, source, selected sound, playback state, and stale catalog cache.
8. The reset action has classic-theme styling, hover state, and focus-visible affordance.
9. Area GIT placeable payload progress now uses `96` item batches with `2` concurrent batches again, keeping the status strip and queue snapshot progressive instead of firing the full queue at once.

Files:

- `frontend/src/modules/layout/components/AreaSelectionPanel.tsx`
- `frontend/src/modules/layout/components/WorkspaceMockLayout.tsx`
- `frontend/src/styles.css`
- `frontend/tests/unit/modules/layout/WorkspaceMockLayout.viewportWiring.test.tsx`

Proof:

- `npm.cmd test -- WorkspaceMockLayout.viewportWiring.test.tsx -t "switches builder workspace mode to sounds"`
- `npm.cmd test -- WorkspaceMockLayout.viewportWiring.test.tsx -t "Area GIT placeable render payload"`
- `npm.cmd test -- WorkspaceMockLayout.viewportWiring.test.tsx WorkspaceModeSwitch.test.tsx WorkspaceTopbar.facades.test.tsx`
- `npx.cmd tsc -b --clean; npm.cmd run build`
- Browser proof on `http://127.0.0.1:5176/app` confirmed:
  - Sounds filter shows `Reset filters` with `aria-label="Reset sounds filters"` and a `263x30` target after typing `market`.
  - Clicking the Sounds reset clears the search value, hides the reset button, and returns the counter to `0`.
  - Placeables filter shows `Reset filters` with `aria-label="Reset placeables filters"` and a `263x30` target after typing `plc_table`.
  - Clicking the Placeables reset clears the search value, hides the reset button, and returns the counter to `0`.
  - Browser data note: this local browser session still returned `Failed to load sounds from backend.` and `Failed to load placeables from backend.`, so row-populated `visible/total` proof is covered by unit tests.

## Iteration 9 - Add Objects Filter Feedback

Problem:

- Add Objects still had a search field without a local quick-clear control.
- The panel did not show how many templates remain visible after search/source/category filters.
- Filtered empty states looked the same as a truly empty object family.
- Reset behavior needed to preserve the selected family while clearing only the narrower filters.

Changed:

1. Add Objects now shows a visible/active-family count when templates are narrowed.
2. Add Objects search now has a local `Clear add objects filter` action.
3. Add Objects now has a `Reset filters` action for search, Blueprint Source, and Item category.
4. Reset keeps the selected object family, so a user editing Items or Placeables is not thrown back to another family.
5. Empty states now distinguish active-filter zero results from unavailable templates.
6. The reset button is shown only when user-controlled filters are active; result counts can still show narrowing caused by source totals.
7. Broader verification caught Area GIT render payload batching drift; the progressive `2` worker / `96` item batch contract is restored.

Files:

- `frontend/src/modules/layout/components/SceneObjectAddPanel.tsx`
- `frontend/src/modules/layout/components/WorkspaceMockLayout.tsx`
- `frontend/tests/unit/modules/layout/SceneObjectAddPanel.test.tsx`

Proof:

- `npm.cmd test -- SceneObjectAddPanel.test.tsx`
- `npm.cmd test -- SceneObjectAddPanel.test.tsx WorkspaceMockLayout.viewportWiring.test.tsx -t "Add Objects|add-object|builder left panel|keyboard|placeable render payloads in progressive"`
- `npx.cmd tsc -b --clean; npm.cmd run build`
- Browser proof on `http://127.0.0.1:5176/app` confirmed:
  - The first Add Objects row shows a `Standard` source badge.
  - The focused row exposes `aria-keyshortcuts="Enter Space Control+Enter Shift+Enter"`.
  - The row title advertises `Ctrl+Enter` placement.
  - The visible workspace mode switch contains only `Areas`, `Placeables`, and `Sounds`; old Magic Mouth text is still absent.
- `npm.cmd test -- WorkspaceMockLayout.viewportWiring.test.tsx -t "loads Area GIT placeable render payloads in progressive 96 item batches"`
- `npm.cmd test -- SceneObjectAddPanel.test.tsx objectAddDragPayload.test.ts useWorkspaceObjectAddDragDrop.test.tsx WorkspaceMockLayout.viewportWiring.test.tsx WorkspaceModeSwitch.test.tsx`
- `npx.cmd tsc -b --clean; npm.cmd run build`
- Browser proof on `http://127.0.0.1:5176/app` confirmed:
  - Areas Mode Add Objects initially shows `Add Objects4` with 4 placeable templates.
  - Filtering by `table` shows `Add Objects1/4`, only `PLC_TABLE_02`, a `24x24` `Clear add objects filter` action, and a `246x30` `Reset filters` action.
  - Clicking clear restores the empty search value, hides clear/reset, and returns 4 placeable rows.
  - Switching to Items, Custom, and search `sword` shows `Add Objects0/2` plus `No items match the current filters.`
  - Clicking `Reset filters` keeps `Items family, 2 templates` selected, returns to `Standard2`, clears search, hides reset, and shows both item rows.

## Iteration 10 - Active Add Family Context

Problem:

- The Add Objects family rail used compact abbreviations (`PLC`, `ITM`, `SND`) to fit the narrow sidebar.
- That made the current family harder to confirm at a glance, especially after filtering or switching between Items and Placeables.
- The hidden native selector kept accessibility intact but did not help visible scanning.

Changed:

1. Add Objects now shows a compact active-family summary below the family rail.
2. The summary displays the full family label and active-family template count.
3. The summary updates when the family rail changes and remains separate from search/source/category result counts.
4. Classic Toolset theme styling keeps the status readable without increasing the row action footprint.

Files:

- `frontend/src/modules/layout/components/SceneObjectAddPanel.tsx`
- `frontend/src/styles.css`
- `frontend/tests/unit/modules/layout/SceneObjectAddPanel.test.tsx`

Proof:

- `npm.cmd test -- SceneObjectAddPanel.test.tsx`
- `npm.cmd test -- SceneObjectAddPanel.test.tsx WorkspaceMockLayout.viewportWiring.test.tsx`
- `npx.cmd tsc -b --clean; npm.cmd run build`
- Browser proof on `http://127.0.0.1:5176/app` confirmed:
  - Active family summary renders as a `group` with `aria-label="Active add object family"`.
  - Initial summary shows `Placeables 4 templates` with a `246x26` footprint.
  - Switching to Items updates the summary to `Items 2 templates`, keeps `Add Objects2`, and changes the list label to `Items add list`.

## Iteration 11 - Keyboard Preview For Add Rows

Problem:

- Add Objects rows are rendered as buttons, but `Enter` and space were intercepted without triggering the row preview action.
- Keyboard users could tab to a template row and get no useful result from the standard activation keys.

Changed:

1. Add Objects row `Enter` and space now trigger the same preview/select callback as a mouse click.
2. Space still prevents page/sidebar scroll while activating the row.
3. The behavior is covered with a focused unit test.

Files:

- `frontend/src/modules/layout/components/SceneObjectAddPanel.tsx`
- `frontend/tests/unit/modules/layout/SceneObjectAddPanel.test.tsx`

Proof:

- `npm.cmd test -- SceneObjectAddPanel.test.tsx`
- `npm.cmd test -- SceneObjectAddPanel.test.tsx WorkspaceMockLayout.viewportWiring.test.tsx`
- `npx.cmd tsc -b --clean; npm.cmd run build`

## Iteration 12 - Remove Legacy Demo Entry

Problem:

- The old Magic Mouth demo still appeared in the left workspace mode panel after login.
- `?demo=plc_zlc_o45_magic_mouth` could still force the workspace into the old demo path.
- This made the live app look like it booted into a special showcase instead of the real workspace.

Changed:

1. Removed the Magic Mouth demo button from `WorkspaceModeSwitch`.
2. Removed the Magic Mouth demo callback and route constants from `WorkspaceMockLayout`.
3. Removed `demo` handling from placeables-mode initialization while keeping explicit `placeable`, `templateId`, and `resref` deep links.
4. Login now strips `demo` from the target `/app` search string before choosing the initial workspace mode.
5. Tests now assert that the demo button is absent and legacy demo URLs are ignored.

Files:

- `frontend/src/App.tsx`
- `frontend/src/modules/layout/components/WorkspaceModeSwitch.tsx`
- `frontend/src/modules/layout/components/WorkspaceMockLayout.tsx`
- `frontend/src/styles.css`
- `frontend/tests/unit/app/App.auth.test.tsx`
- `frontend/tests/unit/modules/layout/WorkspaceModeSwitch.test.tsx`
- `frontend/tests/unit/modules/layout/WorkspaceMockLayout.viewportWiring.test.tsx`

Proof:

- `npm.cmd test -- WorkspaceModeSwitch.test.tsx App.auth.test.tsx WorkspaceMockLayout.viewportWiring.test.tsx -t "Magic Mouth|demo|URL-selected|workspace modes"`
- `npx.cmd tsc -b --clean; npm.cmd run build`
- Browser proof on `http://127.0.0.1:5176/app?demo=plc_zlc_o45_magic_mouth` confirmed:
  - The URL is sanitized back to `/app`.
  - Active workspace mode remains `Areas Mode`.
  - Only `Areas`, `Placeables`, and `Sounds` mode buttons render.
  - `Magic Mouth Demo`, `workspace demo selector`, and visible `Magic Mouth` text are absent.

## Iteration 13 - Add Row Source And Keyboard Place

Problem:

- Add Objects rows showed tag/resref but did not show whether the template came from the Standard or Custom source bucket.
- Double-click and the `Place` button could arm placement, but the focused row itself still had no keyboard placement shortcut.
- This made fast keyboard-driven area building less direct than mouse-driven placement.

Changed:

1. Add Objects rows now show a compact `Standard` / `Custom` source badge under the resref.
2. Source badges have dark and classic theme styling and fit inside the existing narrow row layout.
3. `Enter` and space still preview/select the row.
4. `Ctrl+Enter`, `Meta+Enter`, or `Shift+Enter` on a focused Add Objects row now arms placement through the same create path as double-click and `Place`.
5. Row telemetry distinguishes keyboard placement with `source: "row_keyboard"`.

Files:

- `frontend/src/modules/layout/components/SceneObjectAddPanel.tsx`
- `frontend/src/styles.css`
- `frontend/tests/unit/modules/layout/SceneObjectAddPanel.test.tsx`

Proof:

- `npm.cmd test -- SceneObjectAddPanel.test.tsx`
- `npm.cmd test -- SceneObjectAddPanel.test.tsx WorkspaceMockLayout.viewportWiring.test.tsx -t "Add Objects|add-object|builder left panel|keyboard|placeable render payloads in progressive"`
- `npx.cmd tsc -b --clean; npm.cmd run build`
- Browser proof on `http://127.0.0.1:5176/app` confirmed:
  - The first Add Objects row shows a `Standard` source badge.
  - The focused row exposes `aria-keyshortcuts="Enter Space Control+Enter Shift+Enter"`.
  - The row title advertises `Ctrl+Enter` placement.
  - The visible workspace mode switch contains only `Areas`, `Placeables`, and `Sounds`; old Magic Mouth text is still absent.

## Iteration 14 - Areas Split Keeps Add Objects Reachable

Problem:

- Areas Mode still let the area list dominate the left sidebar.
- Add Objects could fall below the first viewport, so area building still required scrolling before placing a template.
- The CSS had conflicting rules: an earlier split layout limited Areas, while a later `.areas-mode-panel` override removed those limits with `max-height: none` and `overflow: visible`.

Changed:

1. Areas Mode now behaves as a split workflow instead of one long scroller.
2. The area selector keeps a bounded scroll region: `clamp(220px, 32vh, 320px)`.
3. The area list inside that selector is capped separately so controls stay anchored.
4. Add Objects receives the remaining sidebar height and scrolls internally.
5. The later `.areas-mode-panel` override no longer cancels the split layout.

Files:

- `frontend/src/styles.css`

Proof:

- `npm.cmd test -- WorkspaceMockLayout.viewportWiring.test.tsx -t "builder left panel|switches builder workspace mode|resets viewport seed"`
- `npx.cmd tsc -b --clean; npm.cmd run build`
- Browser proof on `http://127.0.0.1:5176/app` confirmed:
  - Areas panel measured `height=167` in a `720px` viewport after layout split.
  - Add Objects measured `y=366 height=348 bottom=714`.
  - First Add Objects row measured `y=609 bottom=665`, fully inside the viewport.
  - First Add Objects row still showed `PLC_BARREL_01`, `plc_a01`, and `Standard`.

## Iteration 15 - Compact Areas Add Controls

Problem:

- In a `1280x600` viewport, the split layout kept Add Objects visible but the first template row still clipped below the bottom edge.
- The Add Objects control stack had enough vertical padding and helper copy to push the first usable placement target out of view on short screens.

Changed:

1. Added a compact Areas-only layout for viewports below `680px` height.
2. The area selector and area list use tighter height caps in that mode.
3. The Add Objects note is hidden only in the compact Areas mode.
4. Add Objects palette buttons, source tabs, active-family summary, and search input use tighter vertical spacing in that compact mode.
5. Placeables Mode and Sounds Mode keep their existing spacing.

Files:

- `frontend/src/styles.css`

Proof:

- `npm.cmd test -- SceneObjectAddPanel.test.tsx WorkspaceMockLayout.viewportWiring.test.tsx -t "builder left panel|Add Objects|add-object|keyboard"`
- `npx.cmd tsc -b --clean; npm.cmd run build`
- Browser proof at `1280x600` on `http://127.0.0.1:5176/app` confirmed:
  - Before this compact pass, first Add Objects row measured `y=569 bottom=625`, outside a `600px` viewport.
  - After this pass, first Add Objects row measured `y=516 bottom=572`, fully inside the viewport.
  - Compact mode hides `.scene-object-add-panel-note` with `display: none`.
  - First family button measured `height=28`, confirming the compact palette variant was active.

## Iteration 16 - Extract Areas Mode Panel

Problem:

- `WorkspaceMockLayout.tsx` still owned the Areas workflow component inline.
- That made continued Areas/Add Objects UX work harder to reason about because the layout, mode switching, backend catalog state, and viewport wiring lived in one very large file.

Changed:

1. Added `frontend/src/modules/layout/components/AreasModePanel.tsx`.
2. Moved the Areas workflow render contract into that component without changing behavior.
3. Kept the same child composition: `AreaSelectionPanel` above `SceneObjectAddPanel`.
4. Kept `WorkspaceMockLayout.tsx` responsible for orchestration and state, but removed the inline `AreasModePanel` function.
5. Left Placeables/Sounds extraction for a separate pass because those components own more preview-specific state and side effects.

Files:

- `frontend/src/modules/layout/components/AreasModePanel.tsx`
- `frontend/src/modules/layout/components/WorkspaceMockLayout.tsx`

Proof:

- `npm.cmd test -- WorkspaceMockLayout.viewportWiring.test.tsx -t "builder left panel|loads backend sound templates into the Areas Mode add-object panel|wires backend sound template create action"`
- `npx.cmd tsc -b --clean; npm.cmd run build`
- Browser proof on `http://127.0.0.1:5176/app` confirmed:
  - `.areas-mode-panel` still renders.
  - `.area-selection-panel` still renders with heading `Areas`.
  - `.scene-object-add-panel` still renders with heading `Add Objects`.

## Iteration 17 - Extract Placeables Mode Panel

Problem:

- `PlaceablesModePanel` was still inline in `WorkspaceMockLayout.tsx`.
- Its subtype filters, search box, list rendering, and thumbnail fallback logic were mixed into the same file that also owns workspace state, viewport wiring, backend loading, and inspector behavior.
- This made placeables UX changes harder to isolate from the broader workspace orchestration.

Changed:

1. Added `frontend/src/modules/layout/components/PlaceablesModePanel.tsx`.
2. Moved the left Placeables panel render contract into that component.
3. Moved `PlaceablesSubtypeFilter`, subtype filter options, thumbnail fallback label trimming, and `SceneObjectThumbnail` usage into the new panel file.
4. `WorkspaceMockLayout.tsx` now imports `PlaceablesModePanel` and keeps orchestration/state ownership.
5. Left the Placeables right inspector in `WorkspaceMockLayout.tsx` for a separate pass because it is coupled to render payload/VFX diagnostic summaries.

Files:

- `frontend/src/modules/layout/components/PlaceablesModePanel.tsx`
- `frontend/src/modules/layout/components/WorkspaceMockLayout.tsx`

Proof:

- `npm.cmd test -- WorkspaceMockLayout.viewportWiring.test.tsx -t "switches builder workspace mode to placeables|resets viewport seed and sidebar sizing|renders builder left panel"`
- `npx.cmd tsc -b --clean; npm.cmd run build`
- Browser proof on `http://127.0.0.1:5176/app` confirmed:
  - Switching to Placeables renders `.placeables-mode-panel`.
  - The panel heading is `Placeables`.
  - The type filter group is present.
  - The area heading is removed after switching modes.
  - The live backend returned `Failed to load placeables from backend.` during this proof, so row population remains a separate live-data check.

## Iteration 18 - Diagnostic Placeables Load Error

Problem:

- Placeables Mode live proof showed a generic `Failed to load placeables from backend.` message.
- That message hid the useful failure reason, making the UI feel dead-ended when the catalog failed.
- Direct backend and dev-proxy checks succeeded with a freshly generated token, so the live UI needed to expose the actual request failure to continue safely.

Changed:

1. Added `resolvePlaceablesCatalogErrorMessage`.
2. HTTP-style placeables errors now show status and backend code, for example `401 INVALID_SESSION`.
3. Zod contract failures now show a contract-specific message instead of the generic backend failure.
4. Catalog-load-failed telemetry now includes `errorName`, `status`, and `code`.
5. Added a regression test for surfacing `401 INVALID_SESSION` in the Placeables panel.

Files:

- `frontend/src/modules/layout/components/WorkspaceMockLayout.tsx`
- `frontend/tests/unit/modules/layout/WorkspaceMockLayout.viewportWiring.test.tsx`

Proof:

- `npm.cmd test -- WorkspaceMockLayout.viewportWiring.test.tsx -t "surfaces backend status|loads placeables catalog|switches builder workspace mode to placeables"`
- `npx.cmd tsc -b --clean; npm.cmd run build`
- Direct backend proof:
  - `POST http://127.0.0.1:3000/api/v1/auth/login` returned a session token.
  - `GET http://127.0.0.1:3000/api/v1/catalog/placeables?limit=5&offset=0` returned `200`.
  - `GET http://127.0.0.1:5176/_aurora/v1/catalog/placeables?limit=5&offset=0` returned `200` through Vite proxy.
- Browser proof on `http://127.0.0.1:5176/app` after switching to Placeables now shows:
  - `Failed to load placeables from backend (401 INVALID_SESSION).`

## Iteration 19 - Extract Sounds Mode Panel

Problem:

- `SoundsModePanel` was still inline in `WorkspaceMockLayout.tsx`.
- Its filters, playback-row status, play/stop controls, and panel formatting were mixed with workspace orchestration and audio playback side effects.
- After Areas and Placeables were separated, Sounds was the remaining major left-panel mode still embedded inline.

Changed:

1. Added `frontend/src/modules/layout/components/SoundsModePanel.tsx`.
2. Moved the left Sounds panel render contract into that component.
3. Moved Sounds filter types/options, playback panel state types, byte/duration formatting, playback status labels, and row stop/play UI helpers into the new panel file.
4. Kept `WorkspaceMockLayout.tsx` responsible for audio processing, audio blob loading, and delivery evidence creation.
5. Kept `SoundsModeRightPanel` in `WorkspaceMockLayout.tsx` for a separate right-inspector extraction pass.

Files:

- `frontend/src/modules/layout/components/SoundsModePanel.tsx`
- `frontend/src/modules/layout/components/WorkspaceMockLayout.tsx`

Proof:

- `npm.cmd test -- WorkspaceMockLayout.viewportWiring.test.tsx -t "sounds mode|sound"`
- `npx.cmd tsc -b --clean; npm.cmd run build`
- Browser proof on `http://127.0.0.1:5176/app` confirmed:
  - Switching to Sounds renders `.sounds-mode-panel`.
  - The panel heading is `Sounds`.
  - The category filter group is present.
  - The source filter group is present.
  - The Sounds right inspector still renders with heading `Sounds Mode`.
  - The live catalog returned `Failed to load sounds from backend.` during this proof, likely related to the same session/auth issue seen in Placeables.

## Iteration 20 - Diagnostic Sounds Load Error

Problem:

- Sounds Mode had the same dead-ended error UX as Placeables: `Failed to load sounds from backend.`
- Live browser proof needed to distinguish an auth/session issue from a missing catalog or payload-contract issue.

Changed:

1. Added `resolveSoundsCatalogErrorMessage`.
2. Sounds catalog errors now show HTTP status and backend code when available.
3. Sounds Zod contract failures now show a contract-specific message.
4. Sounds catalog failure telemetry now includes `errorName`, `status`, and `code`.
5. Added a regression test for surfacing `401 INVALID_SESSION` in the Sounds panel.

Files:

- `frontend/src/modules/layout/components/WorkspaceMockLayout.tsx`
- `frontend/tests/unit/modules/layout/WorkspaceMockLayout.viewportWiring.test.tsx`

Proof:

- `npm.cmd test -- WorkspaceMockLayout.viewportWiring.test.tsx -t "surfaces backend status|sounds mode|sound"`
- `npx.cmd tsc -b --clean; npm.cmd run build`
- Browser proof on `http://127.0.0.1:5176/app` after switching to Sounds now shows:
  - `Failed to load sounds from backend (401 INVALID_SESSION).`

## Iteration 21 - Catalog Session Re-Auth Path

Problem:

- Placeables and Sounds now exposed `401 INVALID_SESSION`, but still left the user inside a broken workspace mode.
- From a UX perspective, an expired backend session is not a catalog problem the user can fix from the panel.
- The app needed to clear stale auth state and move the user to the one place where the problem is actionable: the login screen.

Changed:

1. Added `onBackendSessionInvalidated` to `WorkspaceMockLayout`.
2. Added a shared `isBackendInvalidSessionError` guard for catalog failures.
3. Placeables catalog failures now call the invalid-session callback for `401 INVALID_SESSION`.
4. Sounds catalog failures now call the invalid-session callback for `401 INVALID_SESSION`.
5. `App.tsx` now clears stale auth, resets the workspace mode to default, records telemetry, and navigates to `/login` with `Session expired. Please sign in again.`
6. Added regression coverage for both Placeables and Sounds invalid-session callbacks.

Files:

- `frontend/src/App.tsx`
- `frontend/src/modules/layout/components/WorkspaceMockLayout.tsx`
- `frontend/tests/unit/modules/layout/WorkspaceMockLayout.viewportWiring.test.tsx`

Proof:

- `npm.cmd test -- WorkspaceMockLayout.viewportWiring.test.tsx -t "surfaces backend status"`
- `npm.cmd test -- SceneObjectAddPanel.test.tsx WorkspaceMockLayout.viewportWiring.test.tsx -t "Add Objects|add-object|keyboard|builder left panel|switches builder workspace mode|resets viewport seed|sounds mode|sound|placeables catalog|surfaces backend status"`
- `npx.cmd tsc -b --clean; npm.cmd run build`
- Browser proof on `http://127.0.0.1:5176/login`:
  - Direct backend health and Vite proxy health both returned `ok`.
  - Submitting the builder login flow reached the invalid-session path and returned to `/login`.
  - The login screen displayed `Session expired. Please sign in again.` instead of leaving the user in a broken catalog mode.

## Iteration 22 - Real Auth In Browser Test Mode

Problem:

- Browser proof showed `Backend: available (test)` and a fresh builder login immediately returned to `/login` with `Session expired. Please sign in again.`
- The frontend server was running with Vite `MODE=test`, which made `createBrowserAppDependencies` use mock auth in a real browser.
- Placeables/Sounds still used real backend catalog ports, so the mock auth token was invalid for catalog requests.
- This made the login UX look broken even while direct backend and proxy requests were healthy.

Changed:

1. Added `isVitestRuntime()` so mock auth is selected only inside Vitest.
2. `createBrowserAppDependencies` now uses HTTP backend auth in browser sessions, even if Vite was launched with `--mode test`.
3. `App.tsx` uses the same Vitest-only guard for the backend health shortcut, so the browser health label now reflects the real backend service.
4. Kept the Iteration 21 invalid-session callback token-scoped, so stale catalog failures cannot clear a newer session.

Files:

- `frontend/src/modules/auth/application/authRuntimeEnvironment.ts`
- `frontend/src/modules/auth/composition/createBrowserAppDependencies.ts`
- `frontend/src/App.tsx`
- `frontend/src/modules/layout/components/WorkspaceMockLayout.tsx`
- `frontend/tests/unit/modules/layout/WorkspaceMockLayout.viewportWiring.test.tsx`

Proof:

- `npm.cmd test -- App.auth.test.tsx -t "redirects to workspace after sign in|restores authenticated workspace|drops legacy demo query"`
- `npm.cmd test -- App.auth.test.tsx WorkspaceMockLayout.viewportWiring.test.tsx -t "login|sign in|session|surfaces backend status"`
- `npx.cmd tsc -b --clean; npm.cmd run build`
- Browser proof on `http://127.0.0.1:5176/login?codexReset=22d`:
  - `Check backend` displayed `Backend: available (aurora-backend)`.
  - Signing in as `builder.user` / `builder123` navigated to `/app?codexReset=22d`.
  - The workspace rendered `Sign out` and `Areas`.
  - `Session expired` was not present.

## Iteration 23 - Areas Add Objects Jump

Problem:

- In Areas Mode the `Add Objects` panel can be below the area list, especially on short viewports.
- Even after the split layout improvements, users still needed to visually hunt for where object placement starts.
- The workflow needed a small shortcut near the top of Areas Mode without duplicating the actual Add Objects UI.

Changed:

1. Added an Areas Mode quick-action button labeled `Add Objects`.
2. The button scrolls the existing Add Objects panel into view.
3. The button focuses the Add Objects filter input so the next action can be typing a tag/resref immediately.
4. Added telemetry `ui.workspace.areas.add_objects_jump`.
5. Styled the shortcut as a compact toolbar action instead of another large section.

Files:

- `frontend/src/modules/layout/components/AreasModePanel.tsx`
- `frontend/src/styles.css`
- `frontend/tests/unit/modules/layout/WorkspaceMockLayout.viewportWiring.test.tsx`

Proof:

- `npm.cmd test -- WorkspaceMockLayout.viewportWiring.test.tsx -t "builder left panel|area actions context menu"`
- `npm.cmd test -- SceneObjectAddPanel.test.tsx WorkspaceMockLayout.viewportWiring.test.tsx -t "Add Objects|add-object|keyboard|builder left panel|switches builder workspace mode|resets viewport seed|sounds mode|sound|placeables catalog|surfaces backend status|area actions context menu"`
- `npx.cmd tsc -b --clean; npm.cmd run build`
- Browser proof on `http://127.0.0.1:5176/app`:
  - `Add Objects` shortcut was present.
  - Clicking it focused the Add Objects search input.
  - Active element after the click had `aria-label="Filter objects"` and placeholder `Filter by tag / resref`.

## Iteration 24 - Quiet Panel Smoke Tests

Problem:

- The focused panel smoke test set passed but printed React `act(...)` warnings during Placeables mode switches.
- That warning noise made it harder to spot real UI/UX regressions in future loop passes.
- The two noisy tests were synchronous while the mode switch starts async catalog effects.

Changed:

1. Converted the Placeables mode-switch smoke test to `async`.
2. Wrapped mode-switch clicks in `act`.
3. Replaced an unstable transient `loading render payload` assertion with a stable catalog-row assertion.
4. Converted the focused mode reset test to `async` and wrapped its mode-switch clicks in `act`.

Files:

- `frontend/tests/unit/modules/layout/WorkspaceMockLayout.viewportWiring.test.tsx`

Proof:

- `npm.cmd test -- WorkspaceMockLayout.viewportWiring.test.tsx -t "switches builder workspace mode to placeables|resets viewport seed"`
- `npm.cmd test -- SceneObjectAddPanel.test.tsx WorkspaceMockLayout.viewportWiring.test.tsx -t "Add Objects|add-object|keyboard|builder left panel|switches builder workspace mode|resets viewport seed|sounds mode|sound|placeables catalog|surfaces backend status|area actions context menu"`
- `npx.cmd tsc -b --clean; npm.cmd run build`
- The broader panel smoke test now runs without the previous React `act(...)` warning output.

## Iteration 25 - Extract Placeables Right Inspector

Problem:

- `PlaceablesModeRightPanel` was still inline in `WorkspaceMockLayout.tsx`.
- The right inspector contains VFX diagnostics, render-package status, model URL fallback details, and preview-only labels.
- Keeping that UI inside the layout shell made the main file harder to reason about and slowed mode-specific UX work.

Changed:

1. Added `frontend/src/modules/layout/components/PlaceablesModeRightPanel.tsx`.
2. Moved Placeables right-inspector rendering into the new component.
3. Kept pending VFX preview diagnostics and completed render-payload diagnostics behavior intact.
4. Removed the inline right-inspector component and its now-unneeded imports from `WorkspaceMockLayout.tsx`.
5. Added a quiet wait to the isolated Placeables preview toolbar test so it no longer emits async React warnings.

Files:

- `frontend/src/modules/layout/components/PlaceablesModeRightPanel.tsx`
- `frontend/src/modules/layout/components/WorkspaceMockLayout.tsx`
- `frontend/tests/unit/modules/layout/WorkspaceMockLayout.viewportWiring.test.tsx`

Proof:

- `npm.cmd test -- WorkspaceMockLayout.viewportWiring.test.tsx -t "switches builder workspace mode to placeables|passes isolated preview toolbar|loads placeables catalog|marks VFX|shows canonical Aurora VFX|resolves the pentagram|keeps catalog VFX|restores persisted VFX|requests process"`
- `npx.cmd tsc -b --pretty false`
- `npx.cmd tsc -b --clean; npm.cmd run build`
- Browser proof after switching to Placeables:
  - `.placeables-mode-panel` rendered.
  - `[aria-label="placeables mode inspector"]` rendered.
  - Inspector text began with `Placeables Mode`.

## Iteration 26 - Extract Sounds Right Inspector

Problem:

- `SoundsModeRightPanel` was still inline in `WorkspaceMockLayout.tsx`.
- The right inspector contains catalog metadata, Aurora usage, playback state, delivery evidence, and preview duration.
- After extracting the left Sounds panel and the Placeables right inspector, this was the remaining focused-mode inspector still embedded in the layout shell.

Changed:

1. Added `frontend/src/modules/layout/components/SoundsModeRightPanel.tsx`.
2. Moved Sounds right-inspector rendering into the new component.
3. Reused existing Sounds formatting helpers from `SoundsModePanel`.
4. Removed the inline Sounds right-inspector component and unused helper imports from `WorkspaceMockLayout.tsx`.

Files:

- `frontend/src/modules/layout/components/SoundsModeRightPanel.tsx`
- `frontend/src/modules/layout/components/WorkspaceMockLayout.tsx`

Proof:

- `npm.cmd test -- WorkspaceMockLayout.viewportWiring.test.tsx -t "sounds mode|sound|playback|duration|preview|keyboard-selected sound"`
- `npx.cmd tsc -b --pretty false`
- `npx.cmd tsc -b --clean; npm.cmd run build`
- Browser proof after switching to Sounds:
  - `.sounds-mode-panel` rendered.
  - `[aria-label="sounds mode inspector"]` rendered.
  - Inspector text began with `Sounds Mode` and included a real backend sound id/resref/duration.

## Iteration 27 - Area Selection Quick Actions

Problem:

- Area rows had a right-click context menu, but users without a right-click habit still had to scroll to the bottom action stack.
- The main row click only selected an area, so opening a commonly used area required a second distant action.
- The new menu affordance needed to avoid colliding with the existing `Open Selected Area` accessible name.

Changed:

1. Added a sticky selected-area quick action strip directly under the Areas search field.
2. Added compact `Open` and `...` controls for the currently selected area.
3. Added double-click-to-open behavior on area rows.
4. Added `Ctrl/Meta/Shift+Enter` row keyboard opening for keyboard-heavy users.
5. Renamed the quick action menu aria label to `Selected area actions menu` so it does not collide with `Open Selected Area`.

Files:

- `frontend/src/modules/layout/components/AreaSelectionPanel.tsx`
- `frontend/src/styles.css`
- `frontend/tests/unit/modules/layout/WorkspaceMockLayout.viewportWiring.test.tsx`

Proof:

- `npm.cmd test -- WorkspaceMockLayout.viewportWiring.test.tsx -t "area actions|area rows directly|area list preview"`

## Iteration 28 - Area Context Menu Focus

Problem:

- The area context menu rendered visually, but keyboard focus stayed on the row or action button that opened it.
- This made the menu slower for keyboard users and made the affordance feel less modal than it looked.
- The preview-image fallback smoke test also read an async `onError` state update too early.

Changed:

1. Added a ref-backed focus handoff for the area context menu.
2. The first enabled menu item now receives focus immediately after the menu opens.
3. Added a focused menu assertion to the right-click menu smoke test.
4. Stabilized the area preview fallback assertion with `waitFor`.

Files:

- `frontend/src/modules/layout/components/AreaSelectionPanel.tsx`
- `frontend/tests/unit/modules/layout/WorkspaceMockLayout.viewportWiring.test.tsx`

Proof:

- `npm.cmd test -- WorkspaceMockLayout.viewportWiring.test.tsx -t "area actions|area rows directly|area list preview"`

## Iteration 29 - Armed Add Object Row State

Problem:

- The Areas Add Objects panel could start repeated placement, but the source row did not visibly show which template was armed.
- Users had to remember the last clicked `Place` row while moving attention to the canvas.
- A purely local row state would become stale after Esc/cancel, so the state needed to come back from the viewport placement mode.

Changed:

1. Added an object-add placement mode callback from `WorkspaceCanvasViewport`.
2. Stored the active armed template id in `WorkspaceMockLayout`.
3. Passed the active template id through `AreasModePanel` into `SceneObjectAddPanel`.
4. Added an `Armed` row badge, `is-armed` styling, and `aria-current` on the active template row.
5. Kept immediate feedback by setting the armed template id as soon as a palette create action is fired.

Files:

- `frontend/src/modules/layout/components/WorkspaceCanvasViewport.tsx`
- `frontend/src/modules/layout/components/WorkspaceMockLayout.tsx`
- `frontend/src/modules/layout/components/AreasModePanel.tsx`
- `frontend/src/modules/layout/components/SceneObjectAddPanel.tsx`
- `frontend/src/styles.css`
- `frontend/tests/unit/modules/layout/SceneObjectAddPanel.test.tsx`

Proof:

- `npm.cmd test -- SceneObjectAddPanel.test.tsx -t "armed|placement|keyboard|add-object rows"`
- `npm.cmd test -- WorkspaceMockLayout.viewportWiring.test.tsx -t "wires backend sound template create action|builder left panel|area actions|area rows directly"`

## Iteration 30 - Clean Placement Feedback Text

Problem:

- Several object-placement feedback messages had broken mojibake text.
- These messages appear exactly when the user is trying to add objects to the canvas, so unclear text made an already-sensitive workflow feel rough.
- The copy also mixed Polish text into an otherwise English workspace UI.

Changed:

1. Replaced corrupted outside-canvas feedback with clear ASCII text.
2. Replaced locked-layer feedback with clear ASCII text.
3. Replaced click-outside-tile feedback with clear ASCII text.
4. Added a hook-level regression test that checks the miss-tile message remains ASCII.

Files:

- `frontend/src/modules/layout/components/useWorkspaceObjectAddDragDrop.ts`
- `frontend/tests/unit/modules/layout/useWorkspaceObjectAddDragDrop.test.tsx`

Proof:

- `npm.cmd test -- useWorkspaceObjectAddDragDrop.test.tsx -t "feedback|armed panel template|sound template"`
- `npm.cmd test -- SceneObjectAddPanel.test.tsx -t "armed|placement|keyboard|add-object rows"`
- `npx.cmd tsc -b --pretty false`

## Iteration 31 - Extract Area Context Menu

Problem:

- `AreaSelectionPanel` still owned the full context-menu markup inline.
- That made area-row UX work harder to review because selection, loading, readiness checks, quick actions, and menu rendering were all in one file.
- The menu already had a stable contract after the right-click and focus passes.

Changed:

1. Added `frontend/src/modules/layout/components/AreaContextMenu.tsx`.
2. Moved the area context-menu JSX and action type into the new component.
3. Kept the existing aria labels, roles, disabled states, and visual classes intact.
4. Replaced the inline `AreaSelectionPanel` menu markup with `AreaContextMenu`.

Files:

- `frontend/src/modules/layout/components/AreaContextMenu.tsx`
- `frontend/src/modules/layout/components/AreaSelectionPanel.tsx`

Proof:

- `npm.cmd test -- WorkspaceMockLayout.viewportWiring.test.tsx -t "area actions|area rows directly|area list preview"`
- `npx.cmd tsc -b --pretty false`

## Iteration 32 - Area Row Pressed State

Problem:

- Area rows are rendered as buttons, but their selected state was exposed only through `aria-selected`.
- `aria-selected` is less natural for plain buttons than a pressed/current state.
- The row needed to keep the existing visual selected state while improving screen-reader semantics.

Changed:

1. Added `aria-pressed` to selected area row buttons.
2. Kept the existing `aria-selected` and visual `is-selected` class for compatibility.
3. Added a smoke assertion after selecting an area row.

Files:

- `frontend/src/modules/layout/components/AreaSelectionPanel.tsx`
- `frontend/tests/unit/modules/layout/WorkspaceMockLayout.viewportWiring.test.tsx`

Proof:

- `npm.cmd test -- WorkspaceMockLayout.viewportWiring.test.tsx -t "area actions|area rows directly|area list preview"`
- `npx.cmd tsc -b --pretty false`

## Iteration 33 - Blank Startup Instead Of Legacy Demo

Problem:

- The authenticated workspace still used the old seed scene as the default startup state.
- That made the previous demo objects appear after login even when the legacy `?demo=` query was removed.
- Tests also depended on hidden seed data, which made it easy to accidentally reintroduce demo behavior.

Changed:

1. Added `createBlankAreaScene()` for the real app startup fallback.
2. Switched `createInitialHistory()` to start from the blank 2x2 area with no objects.
3. Dropped persisted startup seed drafts with the old seed scene id instead of reopening them.
4. Kept explicit `local_draft` migration for real saved legacy drafts.
5. Marked saved drafts as `local_draft` so future user edits are not mistaken for startup seed data.
6. Updated App panel tests to seed object fixtures explicitly only when the test is about object-list behavior.

Files:

- `frontend/src/modules/scene/domain/sceneFactory.ts`
- `frontend/src/modules/scene/application/sceneCanvasFacade.ts`
- `frontend/tests/unit/modules/scene/domain/sceneFactory.test.ts`
- `frontend/tests/unit/modules/scene/application/sceneCanvasFacade.test.ts`
- `frontend/tests/unit/app/App.auth.test.tsx`
- `frontend/tests/unit/app/App.workspacePanels.test.tsx`

Proof:

- `npm.cmd test -- sceneCanvasFacade.test.ts sceneFactory.test.ts`
- `npm.cmd test -- App.auth.test.tsx -t "legacy demo|signs in builder"`
- `npm.cmd test -- App.workspacePanels.test.tsx`
- `npx.cmd tsc -b --pretty false`

## Iteration 34 - Non-static Placeable Keyboard Nudge

Problem:

- A placeable could be made non-static in Properties, but the workspace movement filter still excluded all placeables.
- That made object placement and correction awkward: after creating a placeable, the user had to use heavier property/location flows instead of quick keyboard nudging.

Changed:

1. Added `placeables` to the workspace movement-allowed kind set.
2. Kept static placeables locked from keyboard movement.
3. Allowed non-static placeables to move through the same keyboard nudge flow as creatures, items, and sounds.
4. Updated the movement contract test to cover static vs non-static placeables.
5. Revalidated the App-level placeable movement flow after toggling `Static` off.

Files:

- `frontend/src/modules/layout/application/workspaceSceneInteraction.ts`
- `frontend/tests/unit/modules/layout/application/workspaceSceneInteraction.moveAllowedKinds.test.ts`
- `frontend/tests/unit/app/App.workspacePanels.test.tsx`

Proof:

- `npm.cmd test -- App.workspacePanels.test.tsx workspaceSceneInteraction.moveAllowedKinds.test.ts`
- `npx.cmd tsc -b --pretty false`

## Iteration 35 - Clean Empty Inspector State

Problem:

- The blank startup browser proof exposed awkward empty-state copy in the right inspector: `No all objects in current area.`
- This message appears on the new clean post-login state, so it needed to feel intentional rather than like a string-template leak.

Changed:

1. Added a dedicated empty message for the `All` object filter: `No objects in current area.`
2. Kept type-specific messages such as `No vfx objects in current area.`
3. Added a component test so `No all objects...` cannot regress.

Files:

- `frontend/src/modules/layout/components/SceneObjectListPanel.tsx`
- `frontend/tests/unit/modules/layout/SceneObjectListPanel.test.tsx`

Proof:

- `npm.cmd test -- SceneObjectListPanel.test.tsx`
- `npx.cmd tsc -b --pretty false`
- Browser proof on `http://localhost:5176/app`: `sceneId=blank_builder_v1`, `sceneObjectCount=0`, right inspector total `0`, empty text `No objects in current area.`, no `Magic Mouth`, no `plc_barrel_01`.

## Iteration 36 - Visible Stop For Placement Mode

Problem:

- The Add Objects placement flow relied on hidden exits: right-click or `Esc`.
- That is easy to miss while working in the canvas, especially after the user arms a template from the left panel and focuses on tiles.
- The placement HUD already existed, so the fix should expose the existing cancel action in-place instead of adding another panel-only control.

Changed:

1. Added a visible `Stop placing` button to the canvas placement HUD.
2. Wired the button to the existing `cancelObjectAddPlacement("manual")` path.
3. Kept repeated tile placement behavior unchanged after each successful placement.
4. Added compact HUD button styling that fits inside the existing bottom-left canvas feedback.
5. Added a hook regression test for manual placement cancellation, ghost cleanup, and telemetry reason.

Files:

- `frontend/src/modules/layout/components/WorkspaceCanvasViewport.tsx`
- `frontend/src/styles.css`
- `frontend/tests/unit/modules/layout/useWorkspaceObjectAddDragDrop.test.tsx`

Proof:

- `npm.cmd test -- useWorkspaceObjectAddDragDrop.test.tsx`
- `npx.cmd tsc -b --pretty false`
- Browser partial proof on `http://localhost:5176/app`: after reload the app still opens on blank `Untitled Area` with `0` scene objects, no old demo objects, and Add Objects exposes the backend sound catalog with `SND 16` plus visible `Place` actions. Attempting to complete the live `Place -> placement HUD` proof in this session did not arm the HUD, which points to a separate Add Objects live-click/proof issue for the next loop rather than a TypeScript or hook regression.

## Iteration 37 - Disable Empty Blueprint Source Tabs

Problem:

- The live Add Objects proof exposed an easy footgun: a user could click `Custom 0` while `Standard 16` had usable templates.
- That switched the list into an empty state (`No sounds match the current filters.`), making the panel look broken even though templates were available.
- Switching object families also kept the previous source filter, so stale source state could leak between families.

Changed:

1. Reset the blueprint source filter back to `Standard` when the user switches object families from the palette rail or type selector.
2. Disabled non-active blueprint source tabs when their visible count is `0`.
3. Added `aria-disabled`, native `disabled`, and explanatory titles for empty source tabs.
4. Added disabled visual styling for empty source tabs.
5. Updated panel tests so empty `Custom 0` cannot be selected while real custom sources can still be reset through `Reset filters`.

Files:

- `frontend/src/modules/layout/components/SceneObjectAddPanel.tsx`
- `frontend/src/styles.css`
- `frontend/tests/unit/modules/layout/SceneObjectAddPanel.test.tsx`

Proof:

- `npm.cmd test -- SceneObjectAddPanel.test.tsx`
- `npx.cmd tsc -b --pretty false`
- Browser proof on `http://localhost:5176/app`: after opening Add Objects and selecting `SND 16`, source tabs show `Standard16` active and `Custom0` disabled with `aria-disabled="true"`, sound rows remain visible, and the panel no longer falls into `No sounds match`.

## Iteration 38 - Split Areas Workflow From Add Placeables

Problem:

- Areas Mode showed area selection and the Add Objects catalog in one vertical stack.
- On the real left panel this compressed the area list into a tiny strip while the placeable catalog dominated the panel.
- The old `Add Objects` jump button looked like another section header but only scrolled inside the same cramped layout.
- Users need a clear mental split: first choose/open an area, then add placeables/templates to the current area.

Changed:

1. Replaced the `Add Objects` jump strip with two workflow tabs: `Select Area` and `Add Placeables`.
2. Rendered only the active workflow section, so the area list and template catalog no longer fight for the same height.
3. Switched to `Add Placeables` automatically after opening an area.
4. Focused the Add Placeables filter when that workflow tab is selected.
5. Allowed `SceneObjectAddPanel` to receive a contextual heading and used `Add Placeables` inside Areas Mode.
6. Removed the small fixed-height Areas Mode constraints so the active area list can use the full available panel height.
7. Disabled zero-count family rail buttons such as `CRT 0` or `VFX 0` when they are not active, preventing accidental dead-end views.

Files:

- `frontend/src/modules/layout/components/AreasModePanel.tsx`
- `frontend/src/modules/layout/components/SceneObjectAddPanel.tsx`
- `frontend/src/styles.css`
- `frontend/tests/unit/modules/layout/WorkspaceMockLayout.viewportWiring.test.tsx`
- `frontend/tests/unit/modules/layout/SceneObjectAddPanel.test.tsx`

Proof:

- `npm.cmd test -- WorkspaceMockLayout.viewportWiring.test.tsx -t "separates area selection"`
- `npm.cmd test -- SceneObjectAddPanel.test.tsx`
- `npm.cmd test -- App.workspacePanels.test.tsx`
- `npx.cmd tsc -b --pretty false`
- Browser visual proof still needs a fresh browser handle after the interrupted turn; the previous in-app browser handle was lost.

## Iteration 39 - Compact Area Selection Actions

Problem:

- The new Select Area view still spent too much vertical space on duplicate actions.
- `Open Selected Area` appeared both as a selected-area quick action and as a full-width button at the bottom.
- Readiness checks looked like primary workflow steps even though they are diagnostics.
- Switching to Add Placeables after opening an area unmounted the Select Area panel, so local status/search/selection state could be lost when returning.

Changed:

1. Kept the selected-area quick row as the single place to open the current area.
2. Removed the duplicate full-width `Open Selected Area` button from the bottom of the panel.
3. Compressed terrain, texture, direct-delivery, and refresh actions into a four-button diagnostics row.
4. Preserved accessible labels for the diagnostic actions while shortening visible text to fit the narrow sidebar.
5. Added hidden-mode support to `AreaSelectionPanel` and `SceneObjectAddPanel`.
6. Kept Select Area and Add Placeables mounted while switching tabs, so workflow state survives moving between them.
7. Updated viewport wiring tests to assert the compact diagnostics area and persisted readiness status after opening an area and returning to Select Area.

Files:

- `frontend/src/modules/layout/components/AreaSelectionPanel.tsx`
- `frontend/src/modules/layout/components/AreasModePanel.tsx`
- `frontend/src/modules/layout/components/SceneObjectAddPanel.tsx`
- `frontend/src/styles.css`
- `frontend/tests/unit/modules/layout/WorkspaceMockLayout.viewportWiring.test.tsx`

Proof:

- `npm.cmd test -- WorkspaceMockLayout.viewportWiring.test.tsx -t "area actions|selected area quick|texture readiness|Open Selected Area|area selection"`
- `npm.cmd test -- App.workspacePanels.test.tsx`
- `npm.cmd test -- SceneObjectAddPanel.test.tsx`
- `npx.cmd tsc -b --pretty false`
- Browser visual proof still needs a fresh browser handle.

## Iteration 40 - Slim Area Row Menus

Problem:

- Each area row still had a full-height `...` action cell.
- That made the row look like two competing cards and reduced the useful width for long area names.
- The menu is a secondary action because right-click is already available on the row.

Changed:

1. Changed area list items from a two-column row layout to a single row with an overlaid action button.
2. Kept the row itself as the primary click target.
3. Kept the explicit `...` menu available for users who do not discover right-click.
4. Reserved right-side padding in the row so the overlaid menu does not cover text.
5. Reduced the menu button to a compact square control instead of a tall secondary card.

Files:

- `frontend/src/styles.css`

Proof:

- Covered by the same panel regression set in Iteration 39.
- Browser visual proof still needs a fresh browser handle.

## Iteration 41 - Remove Bottom Status Strip Overlay

Problem:

- The bottom workspace status strip covered canvas-adjacent controls and made the viewport feel clipped.
- It repeated information already available elsewhere: mode in the left panel, object count in the inspector, selection in selection/inspector surfaces, and activity in runtime/loading overlays.
- A visual CDP proof also caught that `hidden` panels were hidden semantically in tests but could still be painted by the browser because author CSS overrode the user-agent `hidden` display rule.

Changed:

1. Removed `WorkspaceStatusStrip` from the workspace layout.
2. Deleted the `.workspace-status-*` CSS rules and classic-theme status-strip shadow binding.
3. Updated the viewport wiring regression test to assert the redundant status strip is absent.
4. Added a global `[hidden] { display: none !important; }` rule so hidden workflow panels are actually hidden visually, not only from Testing Library accessibility queries.
5. Verified the Add Placeables workflow shows without the Areas panel and without the old bottom overlay.

Files:

- `frontend/src/modules/layout/components/WorkspaceMockLayout.tsx`
- `frontend/src/styles.css`
- `frontend/tests/unit/modules/layout/WorkspaceMockLayout.viewportWiring.test.tsx`

Proof:

- `npm.cmd test -- WorkspaceMockLayout.viewportWiring.test.tsx -t "status strip|area actions|selected area quick|area selection"`
- `npm.cmd test -- App.workspacePanels.test.tsx`
- `npx.cmd tsc -b --pretty false`
- CDP visual proof screenshot: `.codex-tmp/aurora-ui-proof/status-strip-removed-add-placeables.png`
- CDP DOM proof: `statusStrip=false`, `areasVisible=false`, `addPlaceablesVisible=true`, `activeTab="Add Placeables"`.

## Iteration 42 - Clarify Areas Workflow Tabs And Lock Add-List Scroll

Problem:

- The Areas Mode workflow tabs visually repeated the main `Areas / Placeables / Sounds` mode switch.
- `Select Area / Add Placeables` looked like a second primary navigation row instead of a local two-step workflow.
- In Add Placeables, the panel itself scrolled while the controls were sticky, allowing the first template row to visually slip under the panel header/controls in a narrow left sidebar.

Changed:

1. Kept the workflow split but shortened visible tab labels to `Area` and `Objects`.
2. Preserved accessible tab names as `Select Area` and `Add Placeables`.
3. Moved Areas Mode Add Placeables scrolling from the whole panel to the template list.
4. Kept the Add Placeables header/filter rail stable while only rows scroll.
5. Left Placeables Mode and Sounds Mode list scrolling behavior intact.

Files:

- `frontend/src/modules/layout/components/AreasModePanel.tsx`
- `frontend/src/styles.css`

Proof:

- `npm.cmd test -- WorkspaceMockLayout.viewportWiring.test.tsx -t "separates area selection|status strip|area actions|selected area quick|area selection"`
- `npm.cmd test -- App.workspacePanels.test.tsx`
- `npx.cmd tsc -b --pretty false`
- Additional CDP screenshot attempt for this iteration was blocked by a Windows `PermissionDenied` process error before Chrome launched; no orphan process or profile remained.

## Iteration 43 - Make Area Rows Select-Only And Show Open Area

Problem:

- A left-panel area row could still be opened by double-click, so normal list interaction was too easy to confuse with loading a new viewport scene.
- The left sidebar did not clearly distinguish the selected area row from the area currently opened in the canvas.
- Tests were clearing the wrong persisted store for opened areas: the app restores Areas Mode scene state from `sessionStorage`, not `localStorage`.

Changed:

1. Removed double-click-to-open from area rows.
2. Kept row click as selection only; loading is now through the explicit `Open` action or the area context menu.
3. Added a compact `Opened Area` status block above the `Area / Objects` workflow tabs.
4. Wired the status block to the real `areaSceneSeed`, showing the opened area name, dimensions, and object count.
5. Updated regression tests to verify row click/double-click do not call the area processing API, and the opened-area label changes only after `Open`.
6. Fixed test cleanup to clear `AREAS_MODE_SELECTED_SCENE_STORAGE_KEY` from `sessionStorage`.

Files:

- `frontend/src/modules/layout/components/AreaSelectionPanel.tsx`
- `frontend/src/modules/layout/components/AreasModePanel.tsx`
- `frontend/src/modules/layout/components/WorkspaceMockLayout.tsx`
- `frontend/src/styles.css`
- `frontend/tests/unit/modules/layout/WorkspaceMockLayout.viewportWiring.test.tsx`

Proof:

- `npm.cmd test -- WorkspaceLayout.viewportWiring.test.tsx -t "area actions context menu|selected area quick actions|separates area selection"`
- `npm.cmd test -- App.workspacePanels.test.tsx`
- `npx.cmd tsc -b --pretty false`
- Runtime capture attempt: `npm.cmd run areas:runtime-capture -- --area "_winds_houses" --outDir ".codex-tmp/aurora-ui-proof" --name "area-row-select-open-status" --requireScreenshot --httpTimeoutMs 10000 --chromeCdpTimeoutMs 30000`
- Runtime frame confirmed `_winds_houses` was selected and opened via explicit `buttonText: "Open"`, with `externalSceneSeedDataset.sceneId = "area__winds_houses"`.
- Screenshot proof did not complete because the existing Area PLC/DOR render-payload pipeline stayed blocked (`payload_responses_not_bound_to_scene_objects`) before the capture script emitted a PNG.

## Iteration 44 - Keep Area Readiness Diagnostics From Reflowing Area List

Problem:

- `Terrain Readiness` and `Texture Readiness` rendered as full detail panels inside the same vertical flow as the Areas list.
- Long readiness payloads pushed the list and made the left panel feel like the selected area list was collapsing or jumping.
- The readiness report is useful diagnostic data, but it should not compete with the primary area selection workflow.

Changed:

1. Added an `area-readiness-detail-panel` variant for area diagnostics.
2. Added an `area-readiness-property-list` inner scroller so long readiness fields scroll inside the compact report.
3. Capped readiness panel height in the left panel to keep the Areas list stable.
4. Kept existing readiness data attributes and headings for tests/runtime diagnostics.
5. Added regression coverage for compact terrain readiness and texture readiness panels.

Files:

- `frontend/src/modules/layout/components/AreaSelectionPanel.tsx`
- `frontend/src/styles.css`
- `frontend/tests/unit/modules/layout/WorkspaceLayout.viewportWiring.test.tsx`

Proof:

- `npm.cmd test -- WorkspaceLayout.viewportWiring.test.tsx -t "terrain readiness diagnostics|area texture readiness metadata|selected area quick actions|separates area selection"`
- `npx.cmd tsc -b --pretty false`
- Local smoke: `http://localhost:5173/app` returned `200`, and `http://localhost:5173/_aurora/v1/health` returned `200`.

## Iteration 45 - Viewport Full View Focus Mode

Problem:

- The viewport could not be opened without the left tools panel, right inspector, and topbar consuming screen space.
- Large Areas scenes need a focused inspection mode because the panels make navigation and placement feel cramped.
- Any fullscreen affordance must preserve predictable exit controls instead of trapping the user inside the canvas.

Changed:

1. Added a topbar `Full View` toggle that is independent from canvas command state.
2. Added a `viewportFullscreen` layout mode that expands the workspace to the full browser window.
3. Hid both sidebars in full-view mode and passed zero left/right panel widths to the viewport so canvas overlays re-center.
4. Added a floating `Exit Fullscreen` viewport button plus `Esc` handling.
5. Added focused unit coverage for the topbar toggle, layout class/data state, zeroed viewport offsets, and exit actions.

Files:

- `frontend/src/App.tsx`
- `frontend/src/modules/layout/components/WorkspaceTopbar.tsx`
- `frontend/src/modules/layout/components/WorkspaceLayout.tsx`
- `frontend/src/styles.css`
- `frontend/tests/unit/modules/layout/WorkspaceTopbar.facades.test.tsx`
- `frontend/tests/unit/modules/layout/WorkspaceLayout.viewportWiring.test.tsx`

Proof:

- `npm.cmd test -- WorkspaceTopbar.facades.test.tsx -t "viewport fullscreen"`
- `npm.cmd test -- WorkspaceLayout.viewportWiring.test.tsx -t "viewport over both side panels"`
- `npx.cmd tsc -b --pretty false`

## Iteration 46 - Do Not Dead-Block Canvas Wheel At Zoom Limits

Problem:

- The render canvas React `onWheel` always called `preventDefault()` and `stopPropagation()`.
- Three.js `OrbitControls` also prevents default wheel behavior whenever controls are enabled.
- That meant wheel input could be swallowed even while assets were loading, controls were disabled, or the camera was already at its min/max zoom distance.

Changed:

1. Added `shouldConsumeCanvasWheelForCamera()` as the single wheel-intent rule.
2. Consume wheel only when canvas controls are active and the current zoom direction can still change camera distance.
3. Let wheel pass through while assets are loading, controls/zoom are disabled, delta is zero, or the camera is already at the relevant zoom boundary.
4. Added a native capture listener on the canvas host so no-op wheel events are stopped before `OrbitControls` can call `preventDefault()`.
5. Kept normal in-range wheel zoom behavior intact.

Files:

- `frontend/src/modules/layout/components/WorkspaceCanvasViewport.tsx`
- `frontend/tests/unit/modules/layout/WorkspaceCanvasViewport.renderFilter.test.ts`

Reference:

- `C:\Projects\New Folder\export\functions.tsv` exposes Aurora `TSEdit.WMMouseWheel`.
- `C:\Projects\New Folder\export\strings.tsv` exposes Aurora camera/zoom strings including `zoomSpeed` and `PreventZoomIn`.
- The decompiled `TSEdit.WMMouseWheel` is text-edit scrolling rather than camera code, so the implemented rule follows the verified Aurora-like input model: wheel is a camera action only while it can produce camera movement.

Proof:

- `npm.cmd test -- WorkspaceCanvasViewport.renderFilter.test.ts -t "wheel camera intent"`
- `npx.cmd tsc -b --pretty false`

## Iteration 47 - Keep Area Camera Zoom Range Usable After Panning

Problem:

- Iteration 46 correctly avoided dead-blocking wheel at zoom boundaries, but exposed that the Area camera `maxDistance` itself was too tight.
- Aurora Area top-down framing used `span * 8` as the maximum zoom range.
- After moving/panning the camera across X/Y, the lateral offset could consume that range and make OrbitControls believe the camera was already at max zoom.

Changed:

1. Extracted `resolveSceneFrameMaxDistance()` from `centerCameraForScene()`.
2. Gave Aurora Area top-down views a much wider max-distance budget: at least `512`, `span * 32`, or `frameDistance * 12`.
3. Kept placeable/object preview zoom ranges tighter so preview controls do not become wildly loose.
4. Added camera-framing coverage that simulates a panned Area camera and verifies the max-distance range still permits zoom.
5. Added wheel-intent coverage for a laterally displaced camera within the valid zoom range.

Files:

- `frontend/src/modules/layout/adapters/three/workspaceThreeRuntime.ts`
- `frontend/tests/unit/modules/layout/workspaceThreeRuntime.cameraFraming.test.ts`
- `frontend/tests/unit/modules/layout/WorkspaceCanvasViewport.renderFilter.test.ts`

Proof:

- `npm.cmd test -- workspaceThreeRuntime.cameraFraming.test.ts WorkspaceCanvasViewport.renderFilter.test.ts -t "zoom range|lateral camera movement"`
- `npx.cmd tsc -b --pretty false`

## Iteration 48 - Stabilize Area Viewport Navigation

Problem:

- Area top-down navigation still used OrbitControls rotation on middle mouse drag.
- With the top-down camera using a horizontal screen-up vector, orbit rotation could feel like the world was rolling/tilting during navigation.
- Area zoom-in was also capped too far from the floor on larger scenes because `minDistance` scaled with the area span.

Changed:

1. Added an Area top-down navigation mode for OrbitControls.
2. Disabled rotate for Area top-down views.
3. Remapped middle mouse from rotate to pan while viewing Area geometry.
4. Kept object/VFX preview controls in perspective-orbit mode with middle mouse rotation.
5. Lowered Area top-down minimum zoom distance to `0.28`.
6. Updated the viewport controls hint so Area mode says `MMB pan`, not `MMB rotate`.

Files:

- `frontend/src/modules/layout/adapters/three/workspaceThreeRuntime.ts`
- `frontend/src/modules/layout/components/WorkspaceCanvasViewport.tsx`
- `frontend/tests/unit/modules/layout/workspaceThreeRuntime.cameraFraming.test.ts`

Proof:

- `npm.cmd test -- workspaceThreeRuntime.cameraFraming.test.ts -t "frames Aurora area|VFX object"`
- `npx.cmd tsc -b --pretty false`

## Iteration 49 - Restore Baseline Area Viewport Navigation

Problem:

- The wheel/top-down navigation experiments in Iterations 46-48 regressed normal Area viewport movement.
- Special-casing Area controls made movement feel unpredictable and uncomfortable.
- Fixing zoom limits must not happen by changing basic navigation semantics.

Changed:

1. Removed the custom wheel-intent helper and native wheel capture listener.
2. Restored the previous canvas `onWheel` path so Three.js OrbitControls owns zoom behavior again.
3. Removed the Area-specific top-down navigation mode.
4. Restored middle mouse to standard OrbitControls rotation for Area views.
5. Restored the previous Area min/max distance formulas.
6. Updated tests to assert the restored baseline instead of the experimental behavior.

Files:

- `frontend/src/modules/layout/adapters/three/workspaceThreeRuntime.ts`
- `frontend/src/modules/layout/components/WorkspaceCanvasViewport.tsx`
- `frontend/tests/unit/modules/layout/workspaceThreeRuntime.cameraFraming.test.ts`
- `frontend/tests/unit/modules/layout/WorkspaceCanvasViewport.renderFilter.test.ts`

Proof:

- `npm.cmd test -- workspaceThreeRuntime.cameraFraming.test.ts WorkspaceCanvasViewport.renderFilter.test.ts -t "frames Aurora area|VFX object|runtime evidence datasets"`
- `npx.cmd tsc -b --pretty false`

## Iteration 50 - Restore Placeables-Style Area Camera Controls

Problem:

- The Area-specific middle-mouse guard made Area camera controls diverge from Placeables controls.
- Area viewport movement must behave like Placeables: `MMB rotate`, wheel zoom, and `Ctrl+RMB` pan.
- The fix should remove the special Area binding instead of stacking another exception onto camera input.

Changed:

1. Removed the Area top-down middle-mouse guard.
2. Restored shared OrbitControls bindings so Area and Placeables both use `MMB rotate`.
3. Left wheel zoom on the normal OrbitControls path.
4. Left `Ctrl+RMB` pan on the normal shared binding path.
5. Restored the Area controls hint to include `MMB rotate`.
6. Updated camera-framing regression coverage so Area asserts the same middle-mouse binding as Placeables, including after `Ctrl+RMB` pan toggles.

Files:

- `frontend/src/modules/layout/adapters/three/workspaceThreeRuntime.ts`
- `frontend/src/modules/layout/components/WorkspaceCanvasViewport.tsx`
- `frontend/tests/unit/modules/layout/workspaceThreeRuntime.cameraFraming.test.ts`

Proof:

- `npm.cmd test -- workspaceThreeRuntime.cameraFraming.test.ts -t "frames Aurora area|VFX object"`
- `npx.cmd tsc -b --pretty false`

## Remaining UX Notes

- The left panel is much closer to a usable area-building flow after the explicit Area/Objects split and select-only area rows.
- Next loop should isolate why the live `Place object on canvas` action did not arm `canvasCreateObjectSignal` during browser proof even though the panel rendered 16 sound templates and unit coverage verifies the hook path.
- Continue reducing `WorkspaceMockLayout.tsx` by moving shared mode orchestration helpers into smaller application-layer modules.

## Final Verification

Commands:

- `npm.cmd test -- WorkspaceModeSwitch.test.tsx WorkspaceMockLayout.viewportWiring.test.tsx SceneObjectAddPanel.test.tsx objectAddDragPayload.test.ts useWorkspaceObjectAddDragDrop.test.tsx`
- `npm.cmd test -- WorkspaceMockLayout.viewportWiring.test.tsx SceneObjectAddPanel.test.tsx objectAddDragPayload.test.ts useWorkspaceObjectAddDragDrop.test.tsx`
- `npx.cmd tsc -b --clean; npm.cmd run build`

Browser proof:

- Started a separate test-mode frontend on `http://127.0.0.1:5176/login`.
- Signed in as the local mock builder user.
- Verified `aurora-toolset-classic` theme on `/app`.
- Verified Add Objects note: `Place templates onto area tiles.`
- Verified the first add-row action is `Place`.
- After pressing `Place`, verified the placement prompt text: `Placing PLC_BARREL_01: click tiles to add more. Right-click or Esc exits.`
- Measured prompt bounds inside a `1280x720` viewport: `x=335 y=633 width=399 height=32`, fully within viewport.
- After the broader UI pass, measured the first `Place` target at `54x53px`.
- After scrolling the Areas panel and switching to Placeables, verified the new mode starts at top with sidebar/content/mode-panel scroll positions all reset to `0`.
