# Aurora Web UI/UX Slice Contract - 2026-06-23

Scope: make the Aurora Web workspace feel and work closer to the original Aurora Toolset, using the `019ed62e-3e0f-7253-91ff-f529be54abfe` screenshot/gallery intake as screen-supported evidence and local browser checks as implementation proof.

Rule: a slice is complete only when the UI change is implemented, covered by a focused test or deterministic check, and verified in the local browser or build gate. Passive screenshots guide the UX, but they do not count as live proof by themselves.

## Evidence Anchors

- Thread intake: `docs/nwn-skill-pack/local-thread-019ed62e-aurora-ui-gallery-intake.md`.
- Worker 5 gallery analysis: `docs/aurora-toolset-worker5-gallery-analysis-2026-06-18-2026.md`.
- Gallery root: `.codex-tmp/original-aurora-reference-screens/gallery`.
- Strongest current visual anchor: batch82 palette screenshots, especially Toolset palette family icons plus `Standard` / `Custom` tabs and Item palette first-level categories.

## Loop State

| Slice | Status | Evidence Anchor | Acceptance Gate |
| --- | --- | --- | --- |
| UX-A0 Toolset classic chrome baseline | Done | General Toolset shell screenshots, status panels, classic grey controls | Fresh sessions use `Aurora Toolset Classic`; workspace has a bottom status strip; focused layout/theme tests and build pass |
| UX-A1 Palette family icon rail | Done | Batch82 `Toolset_palette.jpg` | Add Objects panel exposes compact object-family icon buttons with accessible names, selected state, counts, and telemetry |
| UX-A2 Standard/Custom source tabs and Item categories | Done | Batch82 `Item_palette.jpg` | Add Objects panel has `Standard` / `Custom` source tabs and item category buttons for Armor, Creature Items, Miscellaneous, Plot Item, Tutorial, Weapons |
| UX-A3 Browser proof packet | Done | Local app route, not passive screenshots | Browser check confirms classic theme, palette rail, source tabs, item categories, search, first item row, and status strip within the desktop viewport |
| UX-B1 Classic property dialog chrome | Done | Thread batches 48, 58, 62, 68, 69-71 for Placeable/Creature/Sound/Door properties | Property dialogs use a compact classic window surface, titlebar, small titlebar buttons, and square panel edges under `Aurora Toolset Classic` |
| UX-B2 Classic property tabs and form controls | Done | Original properties dialogs with tabbed Basic/Advanced/Scripts/Lock/Trap style | Property dialog tabs, fieldsets, labels, inputs, textareas, selects, and action buttons inherit classic toolset styling without dark-card remnants |
| UX-B3 Property dialog browser proof | Done | Local app route, not passive screenshots | Browser check opens a properties dialog and verifies classic chrome, active tab, form controls, and viewport bounds |

## UX-A0 Toolset Classic Chrome Baseline

Status: Done.

Implemented:

- `Aurora Toolset Classic` is the default layout theme.
- Classic palette, panel, input, row, and status colors are applied through CSS variables and theme overrides.
- Workspace has a bottom status strip with mode, object count, selection count, dock state, and activity.

Proof:

- `npx.cmd vitest run tests/unit/modules/layout/themeSettings.test.ts tests/unit/modules/layout/WorkspaceMockLayout.viewportWiring.test.tsx`
- `npm.cmd run build`
- Browser DOM/CSS verification on local test-mode frontend.

## UX-A1 Palette Family Icon Rail

Status: Done.

User-facing target:

- The Add Objects panel should look more like Aurora's right-side palette dock: small family buttons first, then source/category controls, then the blueprint list.
- Family selection must be faster than a select dropdown and remain accessible by keyboard and screen reader.

Acceptance:

- Add Objects shows icon-like buttons for every available object family.
- Buttons expose labels and counts.
- Selecting a family updates the visible blueprint list and preserves existing drag/create behavior.
- Existing select fallback is no longer the primary visible control when the family rail is shown.

Files:

- `frontend/src/modules/layout/components/SceneObjectAddPanel.tsx`
- `frontend/src/styles.css`
- `frontend/tests/unit/modules/layout/SceneObjectAddPanel.test.tsx`

Proof:

- `npx.cmd vitest run tests/unit/modules/layout/SceneObjectAddPanel.test.tsx tests/unit/modules/layout/themeSettings.test.ts tests/unit/modules/layout/WorkspaceMockLayout.viewportWiring.test.tsx`
- Browser check on `http://localhost:5174/app`: 11 family buttons, selected `Items (2)`, `Standard2` / `Custom0`, and visible item rows.

## UX-A2 Standard/Custom Source Tabs And Item Categories

Status: Done.

User-facing target:

- The Add Objects panel should expose the Aurora-like `Standard` / `Custom` source split.
- When Items are active, it should show the first-level categories seen in the original Item Palette: Armor, Creature Items, Miscellaneous, Plot Item, Tutorial, Weapons.

Acceptance:

- Source tabs are visible and selectable.
- `Standard` is the default tab and preserves all current rows unless later data provides a stronger source distinction.
- `Custom` is represented as an empty supported source when no custom templates exist, not as a broken control.
- Item category buttons filter item templates by category heuristics and show counts.
- Search still works within the selected source/category.

Files:

- `frontend/src/modules/layout/components/SceneObjectAddPanel.tsx`
- `frontend/src/styles.css`
- `frontend/tests/unit/modules/layout/SceneObjectAddPanel.test.tsx`

Proof:

- Unit test verifies `Weapons` filters to `ITEM_SWORD_02`, `Miscellaneous` filters to `ITEM_CHEST_01`, and `Custom` produces a supported empty state.
- Browser check confirmed category buttons: `All2`, `Armor0`, `Creature Items0`, `Miscellaneous1`, `Plot Item0`, `Tutorial0`, `Weapons1`.

## UX-A3 Browser Proof Packet

Status: Done.

Acceptance:

- Local test-mode frontend opens `/app`.
- The root theme is `aurora-toolset-classic`.
- The palette rail, source tabs, and Item categories are present in DOM and visible.
- The status strip remains docked between sidebars.
- No obvious desktop overlap in measured bounding boxes.

Proof:

- Browser check at 1280x720 confirmed:
  - root theme: `aurora-toolset-classic`,
  - selected family: `Items (2)`,
  - source tabs: `Standard2`, `Custom0`,
  - visible first rows: `ITEM_CHEST_01`, `ITEM_SWORD_02`,
  - family rail, source tabs, item categories, search, first row, and status strip all within viewport.
- `npx.cmd tsc -b --clean; npm.cmd run build` passed after removing two stale unused declarations in `WorkspaceMockLayout.tsx`.

## UX-B1 Classic Property Dialog Chrome

Status: Done.

User-facing target:

- Property dialogs should read as Aurora-style tool windows, not dark web cards.
- Titlebar buttons should be compact window controls and keep existing collapse/close behavior.

Acceptance:

- Placeable, Door, Creature, Sound, and Adjust Location dialog shells use classic grey/paper surfaces under `Aurora Toolset Classic`.
- Dialog headers have a compact titlebar, visible border, and square control buttons.
- The style is theme-scoped, so non-classic themes keep their current look.

Files:

- `frontend/src/styles.css`
- `frontend/tests/unit/modules/layout/components/properties/SharedPropertyDialogSections.test.tsx`

Proof:

- Shared dialog chrome now exposes `canvas-property-dialog-chrome`, `canvas-property-dialog-titlebar`, and `data-collapsed` for consistent styling and regression checks.
- `npx.cmd vitest run tests/unit/modules/layout/components/properties/SharedPropertyDialogSections.test.tsx`
- Browser check opened `Placeable Object Properties` for `PLC_BARREL_01` and confirmed classic titlebar, dialog surface, active `Basic` tab, and white input surface.

## UX-B2 Classic Property Tabs And Form Controls

Status: Done.

User-facing target:

- Property tabs should visually resemble classic Toolset tab strips.
- Form controls should read as desktop controls: square-ish inputs, thin borders, white fields, grey grouped panels, dense spacing.

Acceptance:

- Placeable/Door/Creature/Sound tab strips use shared classic active/inactive states.
- Fieldsets, legends, labels, inputs, selects, textareas, and action buttons in property dialogs have classic-theme overrides.
- Text remains readable and controls do not overlap in desktop browser verification.

Files:

- `frontend/src/styles.css`

Proof:

- Browser check confirmed `dialogBg=rgb(212, 208, 200)`, `activeTabText=Basic`, `inputBg=rgb(255, 255, 255)`.
- Action footer is sticky inside the property dialog and remains visible in the 1280x720 viewport.

## UX-B3 Property Dialog Browser Proof

Status: Done.

Acceptance:

- Local test-mode frontend opens `/app`.
- A properties dialog opens from a scene object row.
- Dialog titlebar, tabs, first form fields, and footer/actions are visible in viewport.
- Root theme remains `aurora-toolset-classic`.

Proof:

- Browser check at 1280x720 confirmed the dialog is within viewport, footer is visible and within dialog, active tab exists, first input exists, and root theme remains `aurora-toolset-classic`.
