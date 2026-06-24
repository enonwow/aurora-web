# Sounds Mode Loop

Date: 2026-06-16

## Done

- Added independent frontend sounds contracts and HTTP port:
  - `frontend/src/modules/sounds/contracts.ts`
  - `frontend/src/modules/sounds/ports/soundApiPort.ts`
  - `frontend/src/modules/sounds/adapters/httpSoundApiPort.ts`
- Added `sounds_mode` to `WorkspaceModeId`, stable workspace mode order, and mode resolution.
- Wired `createHttpSoundApiPort()` into `App.tsx`.
- Added `Sounds Mode` next to `Areas Mode` and `Placeables Mode` in the builder workspace switch.
- Added left sounds catalog panel with backend query loading, filter, result count, empty/error states, and Play action.
- Added right sounds inspector with `soundId`, `resref`, `category`, `format`, `spatialMode`, `playbackMode`, `auroraUsage`, and duration.
- Play pipeline uses backend sounds process/cache flow:
  - `POST /api/v1/catalog/sounds/:soundId/process`
  - `GET /api/v1/catalog/sounds/cache/:cacheKey/audio/contracts?mode=proxy`
  - `GET /api/v1/catalog/sounds/cache/:cacheKey/audio`
  - audio blob is played via an object URL with cleanup and controlled error state.
- Adjusted sounds catalog batch size to `100` to match backend validation (`limit <= 100`).

## Tests

- Passed: `npx vitest run tests/unit/modules/layout/workspaceModes.test.ts tests/unit/modules/sounds/httpSoundApiPort.test.ts tests/unit/modules/layout/WorkspaceMockLayout.viewportWiring.test.tsx`
- Passed: `npm run build`

Notes:
- Focused test run reports existing React `act(...)` warnings from older async area/placeables tests, but all focused tests pass.
- An accidental broad `npm run test:unit -- ...` run also surfaced an unrelated pre-existing VFX texture URL expectation mismatch outside this slice.

## Browser QA

- Dev server: `http://127.0.0.1:5174`
- Logged in as `builder.user`.
- Verified via Browser/Playwright DOM:
  - `Sounds Mode` button appears beside `Areas Mode` and `Placeables Mode`.
  - Switching to `Sounds Mode` activates the button.
  - Left panel renders `Sounds`, filter input, result count, and backend-loaded empty state.
  - Right panel renders `Sounds Mode` inspector empty-selection state.
- Screenshot saved: `docs/loops/sounds-mode-browser-check.png`

Current local backend returns `GET /api/v1/catalog/sounds?limit=5&offset=0` with `total: 0`, so real audio Play could not be exercised against a live sound item in this environment. The controlled Play pipeline is covered by focused UI and HTTP port tests.

## Risks

- The local backend sound catalog is empty in this workspace/runtime, so manual playback QA remains pending until sound rows/assets are available.
- Current UI uses existing sidebar row/button styles; no bespoke visual polish was added beyond matching the local patterns.

## Next Step

Seed or enable backend sound catalog data in the local runtime, then manually verify one real item through `Play`: process, contract, audio blob, and browser playback/error state.

## Iteration 2 - Backend Sound Catalog Source

Hypothesis:
- Local `GET /api/v1/catalog/sounds` returned `total: 0` because non-test `SoundsModule` uses `ModuleSnapshotSoundRepository`, not `StaticSoundRepository`.
- `ModuleSnapshotSoundRepository` only indexes `.wav`, `.ogg`, `.bmu`, and `.mp3` objects already present in the module blob snapshot.
- Runtime settings include `sources.sound.hakProfileId = "lc_audio"`, but module cache sync did not include `sound` when collecting HAK supplement paths/assets.
- Local runtime config pointed `hakProfiles.lc_audio` at `lc_sounds.hak`, while the actual local project HAK available in `C:\Users\enonw\Documents\Neverwinter Nights\hak` is `npc_sounds.hak`.

Checks:
- Confirmed `SoundsModule` selects `StaticSoundRepository` only for `config.isTest`; local development selects `ModuleSnapshotSoundRepository`.
- Confirmed `StaticSoundRepository` has hard-coded sound rows, but these are not used by local development catalog.
- Confirmed `ModuleSnapshotSoundRepository` builds records from snapshot object extensions only.
- Confirmed local backend returned `GET /api/v1/catalog/sounds?limit=5&offset=0` with `total: 0`.
- Confirmed `GET /api/v1/catalog/sounds?limit=1000` returns 422 because backend schema caps `limit` at `100`.
- Found `RuntimeSettingsApplicationService.collectEnabledHakPaths()` included `placeable`, `tile`, `area`, and `vfx`, but omitted `sound`.
- Found HAK supplement extraction copied textures and placeable-related assets, but did not copy audio assets into the blob snapshot.
- Confirmed `/host/nwn-docs/hak/lc_sounds.hak` is missing in the backend container.
- Confirmed `/host/nwn-docs/hak/npc_sounds.hak` exists and contains real `.wav` sound assets.

Changes:
- Added audio extension support to runtime module cache sync:
  - `.wav`
  - `.ogg`
  - `.bmu`
  - `.mp3`
- Added `soundAssetFiles` to source supplement collection and upload into module blob snapshot under `__aurora/sources/hak/<hak-name>/...`.
- Added `sound` to enabled HAK source collection so `lc_audio`/`lc_sounds.hak` can be extracted.
- Added focused unit coverage proving `sources.sound.hakProfileId = "lc_audio"` uploads HAK audio files and ignores non-audio files.
- Updated local runtime settings so `hakProfiles.lc_audio = ["npc_sounds.hak"]`, matching the HAK that exists in this workspace.
- Ran a narrow sound-source module cache rebuild. Result: `uploadedFiles: 8`, `unchangedFiles: 4805`, `totalFiles: 4813`, with `sourceDelta.hak.uploadedFiles: 7`.

Tests and Build:
- Passed: `npm run test:unit -- runtime-settings.application.service.spec.ts module-snapshot-sound.repository.spec.ts`
- Passed: `npm run build` in `backend`
- Passed: `npx vitest run tests/unit/modules/layout/workspaceModes.test.ts tests/unit/modules/sounds/httpSoundApiPort.test.ts tests/unit/modules/layout/WorkspaceMockLayout.viewportWiring.test.tsx`
- Passed: `npm run build` in `frontend`

QA / Runtime:
- `GET /api/v1/catalog/sounds?limit=5&offset=0` now returns `total: 6`.
- First real item verified: `sound_dia_hakon_add_12`, `resref: dia_hakon_add_12`, `category: effect`, `format: wav`, `spatialMode: 3d`, `playbackMode: random`, `auroraUsage.bindingKey: GI_sound_rndm`.
- Backend Play pipeline verified against that real item:
  - `POST /api/v1/catalog/sounds/sound_dia_hakon_add_12/process` returned cache key `ecae2a1025731403019a51bd69c948af32d652c7272f4b1dffe929af3d416842`.
  - `GET /api/v1/catalog/sounds/cache/ecae2a1025731403019a51bd69c948af32d652c7272f4b1dffe929af3d416842/audio/contracts?mode=proxy` returned proxy audio contract with `contentType: audio/wav`.
  - `GET /api/v1/catalog/sounds/cache/ecae2a1025731403019a51bd69c948af32d652c7272f4b1dffe929af3d416842/audio` returned HTTP 200, `content-type: audio/wav`, `content-length: 106210`.
- Browser QA on `http://127.0.0.1:5173/app`:
  - `Sounds Mode` button exists beside `Areas Mode` and `Placeables Mode`.
  - Left panel loads 6 real sounds from backend.
  - Inspector shows metadata for `dia_hakon_add_12`.
  - Clicking `Play` calls the real backend pipeline. Browser automation reports a controlled autoplay error (`play() failed because the user didn't interact with the document first`) and the UI stays stable.
- Screenshot saved: `docs/loops/sounds-mode-real-item-browser-check.jpg`

Risks:
- Superseded in Iteration 3: local config and repository defaults now use `["lc_sounds.hak", "npc_sounds.hak"]`.
- The backend container recovered via a fallback `node --enable-source-maps /app/dist/src/main.js` process after the first full rebuild attempt destabilized `nest start --watch`. A clean backend restart is recommended before the next broad runtime rebuild.

Next Step:
- Superseded in Iteration 3 for `lc_audio` alignment. Cleanly restart the backend container before the next broad runtime rebuild.

## Iteration 3 - Audio Profile Fallback and Play Activation

Changes:
- Set repository defaults for `hakProfiles.lc_audio` to `["lc_sounds.hak", "npc_sounds.hak"]`.
- Updated local runtime config to the same dual audio profile. This preserves the historical `lc_sounds.hak` name and uses the real local `npc_sounds.hak` when the former is absent.
- Added focused backend coverage proving a missing first audio HAK does not block extraction from the next existing audio HAK.
- Changed Sounds Mode Play flow from one long async click to a prepare/play flow:
  - first click runs backend `process`, resolves audio contract, downloads the blob, and prepares an `Audio` object;
  - second click attempts `audio.play()` against the prepared audio;
  - browser activation failures keep the prepared audio available and show a controlled direct-click status instead of clearing the pipeline as a hard error.

Tests and Build:
- Passed: `npm run test:unit -- runtime-settings.application.service.spec.ts module-snapshot-sound.repository.spec.ts`
- Passed: `npm run build` in `backend`
- Passed: `npx vitest run tests/unit/modules/layout/workspaceModes.test.ts tests/unit/modules/sounds/httpSoundApiPort.test.ts tests/unit/modules/layout/WorkspaceMockLayout.viewportWiring.test.tsx`
- Passed: `npm run build` in `frontend`
- Notes: focused frontend tests still emit pre-existing React `act(...)` warnings in older area/placeables async cases; all focused tests pass.

Browser QA:
- Target: `http://127.0.0.1:5173/app`
- Verified `Sounds Mode` remains beside `Areas Mode` and `Placeables Mode`.
- Verified backend-loaded catalog count is `6`.
- Verified real sound `dia_hakon_add_12` appears in the list.
- Verified inspector shows `sound_dia_hakon_add_12`, `effect`, `wav`, `3d`, `random`, and `GI_sound_rndm / RandomSound`.
- First Play click on `dia_hakon_add_12` prepared the backend audio blob and showed `Ready to play from backend audio cache. Click Play again.`
- Second automated Browser click is still blocked by browser activation policy, but the UI now stays stable and shows `Ready to play from backend audio cache. Browser playback needs a direct Play click.` No crash and no old autoplay error alert.
- Screenshot saved: `docs/loops/sounds-mode-iteration-3-browser-check.png`

Risks:
- Browser automation still cannot prove audible playback because its click does not satisfy the browser's audio user-activation policy in this environment. The UI now exposes a controlled prepared state for that case.
- A clean backend container restart is still recommended before the next broad/full module cache rebuild, because Iteration 2 recovered the dev backend via a fallback `node dist/src/main.js` process after the first full rebuild destabilized watch mode.

Next Step:
- Sounds Mode is functionally closed for catalog, inspector, backend processing, audio blob contract, and controlled playback preparation. The next product slice should place sound templates/objects into the area canvas using the same backend sound contracts.

## Iteration 4 - Place Backend Sound Template on Canvas Preview

Scope:
- One narrow product slice after Sounds Mode catalog/playback: place a selected backend sound catalog item into a Sounds Mode canvas preview scene and expose the created scene object identity.
- No VFX work. No retail-canonical sound semantics claimed; placement uses existing frontend `sounds` scene object and preserve-first sound positioning contracts.

Changes:
- Added `frontend/src/modules/sounds/application/soundSceneObjectMapper.ts`.
- Mapped `SoundApiListItem` into a `SceneObject` with `kind: "sounds"`, backend `resRef`, backend sound metadata in `soundPositioning.preserve.extra`, and default preserve-first positioning.
- Added `createSoundsModeSceneSeed(sound)` to create a focused preview scene containing only the placed sound object.
- Added a `Place` action beside each Sounds Mode catalog item.
- `Place` now:
  - creates the Sounds Mode preview scene;
  - selects/scopes the placed sound object through existing canvas/sidebar selection wiring;
  - shows `canvasObject`, `canvasTag`, and `canvasResRef` in the right inspector.

Files Changed:
- `frontend/src/modules/sounds/application/soundSceneObjectMapper.ts`
- `frontend/src/modules/layout/components/WorkspaceMockLayout.tsx`
- `frontend/tests/unit/modules/sounds/soundSceneObjectMapper.test.ts`
- `frontend/tests/unit/modules/layout/WorkspaceMockLayout.viewportWiring.test.tsx`
- `docs/loops/sounds-mode-loop.md`
- `docs/loops/sounds-mode-iteration-4-place-sound-browser-check.png`

Tests and Build:
- Passed: `npx vitest run tests/unit/modules/sounds/soundSceneObjectMapper.test.ts tests/unit/modules/layout/WorkspaceMockLayout.viewportWiring.test.tsx tests/unit/modules/sounds/httpSoundApiPort.test.ts`
- Passed: `npm run build` in `frontend`
- Notes: focused frontend run still emits existing React `act(...)` warnings in older async area/placeables tests; all focused tests pass.

Browser QA:
- Target: `http://127.0.0.1:5173/app`
- Logged in as `builder.user`.
- Verified `Sounds Mode` real backend catalog count remains `6`.
- Verified `Place dia_hakon_add_12 on canvas` exists.
- Clicked `Place` for `dia_hakon_add_12`.
- Verified right inspector shows:
  - `canvasObject: snd_template_sound_dia_hakon_add_12`
  - `canvasTag: SOUND_DIA_HAKON_ADD_12`
  - `canvasResRef: dia_hakon_add_12`
- Verified no app crash.
- Screenshot saved: `docs/loops/sounds-mode-iteration-4-place-sound-browser-check.png`

Risks:
- This is a focused preview placement slice, not full area save/export placement.
- Default positioning remains preserve-first and generic (`specific` for backend `3d`, `everywhere` for backend `2d`); exact retail runtime semantics stay blocked pending hard-confirm evidence.

Next Step:
- Promote the same backend sound template mapping into real area canvas add/drop flow so a user can place sounds into a loaded area scene and then edit positioning via the existing Sound Properties dialog.

## Iteration 5 - Backend Sound Templates in Area Add/Drop Flow

Scope:
- One narrow Sounds Mode product slice after preview placement: promote backend sound template mapping into the real Areas Mode Add Objects drag/drop path.
- No VFX work. No retail-canonical sound behavior claimed; positioning still preserves Aurora/backend contract fields without asserting runtime parity.
- Heartbeat automation was not modified.

Changes:
- Extended `ObjectAddDragPayload` with optional `soundPositioning` for `kind: "sounds"` only, including clone-on-store/clone-on-read guards for the dragover fallback payload.
- Updated `SceneObjectAddPanel` drag payloads so sound templates carry their backend-derived `soundPositioning.preserve.extra` metadata into drag/drop.
- Loaded backend sound catalog templates into the Areas Mode Add Objects panel while keeping the normal Scene Objects list scoped to the current scene.
- Fixed the real drop path in `useWorkspaceObjectAddDragDrop`: backend sound templates that are not already present in `scene.objects` now overwrite the default empty sound positioning shell with the payload's backend/Aurora sound template contract.
- Added focused coverage for payload parsing, panel drag serialization, Workspace Areas Mode sound template visibility, and actual drop preservation of backend sound metadata.

Files Changed:
- `frontend/src/modules/layout/application/objectAddDragPayload.ts`
- `frontend/src/modules/layout/components/SceneObjectAddPanel.tsx`
- `frontend/src/modules/layout/components/useWorkspaceObjectAddDragDrop.ts`
- `frontend/src/modules/layout/components/WorkspaceMockLayout.tsx`
- `frontend/tests/unit/modules/layout/objectAddDragPayload.test.ts`
- `frontend/tests/unit/modules/layout/SceneObjectAddPanel.test.tsx`
- `frontend/tests/unit/modules/layout/useWorkspaceObjectAddDragDrop.test.tsx`
- `frontend/tests/unit/modules/layout/WorkspaceMockLayout.viewportWiring.test.tsx`
- `docs/loops/sounds-mode-iteration-5-area-add-sounds-browser-check.png`
- `docs/loops/sounds-mode-loop.md`

Tests and Build:
- Passed: `npx vitest run tests/unit/modules/layout/objectAddDragPayload.test.ts tests/unit/modules/layout/SceneObjectAddPanel.test.tsx tests/unit/modules/layout/useWorkspaceObjectAddDragDrop.test.tsx tests/unit/modules/layout/WorkspaceMockLayout.viewportWiring.test.tsx tests/unit/modules/sounds/soundSceneObjectMapper.test.ts`
- Passed: `npm run build` in `frontend`
- Notes: the focused viewport wiring suite still emits pre-existing React `act(...)` warnings in older async area/placeables cases; all focused tests pass.

Browser QA:
- Target: `http://127.0.0.1:5173/app`
- Verified the app was logged in as a builder and Areas Mode could be selected from the Workspace Mode switch.
- Verified Areas Mode Add Objects shows `Sounds (8)`: 2 seed scene sounds plus 6 backend sound templates from the real catalog.
- Selected Add Objects type `Sounds` and verified backend sound templates render in the real area add panel, including `SOUND_DIA_HAKON_ADD_12 / dia_hakon_add_12` and the other real `svm_*` backend entries.
- Screenshot saved: `docs/loops/sounds-mode-iteration-5-area-add-sounds-browser-check.png`

Risks:
- Browser QA verified the add panel with real backend data, but did not perform a human-style drag/drop gesture on the canvas; the real drop preservation path is covered by the focused hook test.
- Existing Sound Properties dialog can edit selected sound objects, but a full Browser QA of opening that dialog after a newly dropped backend sound remains for the next slice.
- Retail-canonical runtime behavior remains blocked pending hard retail/runtime/capture comparison evidence.

Next Step:
- Add/verify the end-to-end selected dropped sound flow: drag a backend sound template onto a loaded area canvas, select it, open the existing Sound Properties dialog, and confirm backend `soundId/resref/category/playback/spatial` metadata remains visible/preserved through edits and scene save/export boundaries.

## Iteration 6 - Backend Sound Contract in Sound Properties

Scope:
- One narrow Sounds-only slice after Iteration 5: make the backend sound template metadata visible when a dropped/selected backend sound opens the existing Sound Properties dialog.
- No VFX work. No heartbeat automation changes. No retail-canonical behavior claimed.

Changes:
- Extended `SoundPropertiesDraft` with readonly backend metadata fields sourced from `soundPositioning.preserve.extra`:
  - `backendSoundId`
  - `backendCategory`
  - `backendFormat`
  - `backendSpatialMode`
  - `backendPlaybackMode`
- Added a readonly `Backend Sound Contract` section to the Sound Properties basic tab showing:
  - `soundId`
  - `resref`
  - `category`
  - `format`
  - `spatialMode`
  - `playbackMode`
- Guarded `WorkspaceCanvasViewport` draft updates so these backend metadata fields remain non-editable.
- Added compact styling for the backend contract block.
- Added focused tests proving backend sound metadata is extracted from a scene sound object and rendered by the Sound Properties dialog.

Files Changed:
- `frontend/src/modules/layout/application/workspaceObjectPropertyDrafts.ts`
- `frontend/src/modules/layout/components/properties/SoundPropertiesDialog.tsx`
- `frontend/src/modules/layout/components/WorkspaceCanvasViewport.tsx`
- `frontend/src/styles.css`
- `frontend/tests/unit/modules/layout/workspaceObjectPropertyDrafts.soundProperties.test.ts`
- `frontend/tests/unit/modules/layout/components/properties/SoundPropertiesDialog.test.tsx`
- `docs/loops/sounds-mode-iteration-6-area-sound-templates-browser-check.png`
- `docs/loops/sounds-mode-loop.md`

Tests and Build:
- Passed: `npx vitest run tests/unit/modules/layout/workspaceObjectPropertyDrafts.soundProperties.test.ts tests/unit/modules/layout/components/properties/SoundPropertiesDialog.test.tsx tests/unit/modules/layout/useWorkspaceObjectAddDragDrop.test.tsx tests/unit/modules/layout/WorkspaceMockLayout.viewportWiring.test.tsx tests/unit/modules/sounds/soundSceneObjectMapper.test.ts`
- Passed: `npm run build` in `frontend`
- Notes: focused viewport wiring still emits pre-existing React `act(...)` warnings in older async area/placeables cases; all focused tests pass.

Browser QA:
- Target: `http://127.0.0.1:5173/app`
- Verified Areas Mode loads real backend sound templates into Add Objects.
- Verified Add Objects type `Sounds` shows `Sounds (8)`, including backend `SOUND_DIA_HAKON_ADD_12 / dia_hakon_add_12` plus the real `svm_*` backend entries.
- Screenshot saved: `docs/loops/sounds-mode-iteration-6-area-sound-templates-browser-check.png`

QA Limitation:
- Browser automation did not complete a reliable human-style canvas drag/drop plus context-menu open of Sound Properties for the newly dropped backend sound. The actual drop preservation path remains covered by the Iteration 5 focused hook test, and this iteration adds component-level coverage for the dialog metadata surface.
- Save/export boundary for backend sound metadata was not hard-confirmed in Browser. Current apply flow preserves `sourceObject.soundPositioning.preserve.extra`; focused tests cover extraction/rendering, not full scene persistence.

Risks:
- Backend metadata is displayed as preserve-first frontend contract data, not retail-runtime-confirmed behavior.
- Full e2e Browser QA still needs a stable test hook or user-style automation path for dragging backend templates onto canvas and opening object context menus.

Next Step:
- Add a stable editor/test affordance for sound object property opening after placement, or add a focused integration harness around `WorkspaceCanvasViewport` that performs drop -> select -> open Sound Properties -> edit -> apply -> verify `preserve.extra` survives scene history/save serialization.

## Iteration 7 - Sound Properties Apply/Save Preservation Harness

Scope:
- One narrow Sounds-only slice after Iteration 6: add a stable focused integration harness for dropped backend sound objects through property draft apply, JSON scene serialization, and local draft save serialization.
- No VFX work. No heartbeat automation changes. No retail-canonical behavior claimed.

Changes:
- Extracted the Sound Properties apply path into `applySoundPropertiesDraftToScene` so UI code and focused tests share the same preservation logic.
- Updated `WorkspaceCanvasViewport` to call the extracted helper when applying Sound Properties edits.
- Added focused coverage for a dropped backend sound object whose `soundPositioning.preserve.extra` includes backend/Aurora sound template metadata.
- The new test edits normal sound properties, applies the draft, serializes/deserializes the scene, saves through `createSceneCanvasFacade.saveLocalDraft`, and verifies backend metadata plus edited comments remain preserved.

Files Changed:
- `frontend/src/modules/layout/application/workspaceObjectPropertyDrafts.ts`
- `frontend/src/modules/layout/components/WorkspaceCanvasViewport.tsx`
- `frontend/tests/unit/modules/layout/workspaceObjectPropertyDrafts.soundProperties.test.ts`
- `docs/loops/sounds-mode-iteration-7-apply-harness-browser-check.png`
- `docs/loops/sounds-mode-loop.md`

Tests and Build:
- Passed: `npx vitest run tests/unit/modules/layout/workspaceObjectPropertyDrafts.soundProperties.test.ts tests/unit/modules/layout/components/properties/SoundPropertiesDialog.test.tsx tests/unit/modules/layout/useWorkspaceObjectAddDragDrop.test.tsx tests/unit/modules/layout/WorkspaceMockLayout.viewportWiring.test.tsx tests/unit/modules/sounds/soundSceneObjectMapper.test.ts`
- Re-run after governor nudge: `npx vitest run tests/unit/modules/layout/workspaceObjectPropertyDrafts.soundProperties.test.ts`
- Passed: `npm run build` in `frontend`
- Notes: the focused viewport wiring suite still emits pre-existing React `act(...)` warnings in older async area/placeables cases; all focused tests pass.

Browser QA:
- Target: `http://127.0.0.1:5173/app`
- Verified Areas Mode Add Objects can select `Sounds`.
- Verified the real backend sound templates remain available in the add panel with `Sounds (8)`: two seed scene sounds plus six backend sounds from the catalog.
- Verified `SOUND_DIA_HAKON_ADD_12 / dia_hakon_add_12` is visible in the sound add list.
- Screenshot saved: `docs/loops/sounds-mode-iteration-7-apply-harness-browser-check.png`

QA Limitation:
- Browser QA still did not perform a reliable full human-style drag/drop/context-menu edit of a newly dropped backend sound. The stable harness now covers the core data contract boundary for apply, scene JSON serialization, and local draft save.

Risks:
- Retail-canonical sound runtime behavior remains blocked pending hard retail/runtime/capture comparison evidence.
- A full e2e Browser path still needs either a stable editor affordance for opening Sound Properties on a newly dropped sound or a more reliable browser automation hook for canvas drag/drop and context menu selection.

Next Step:
- Add or expose a stable UI-level test affordance for dropped sound selection/properties opening, then verify drop -> select/open Sound Properties -> edit/apply in Browser or a higher-level component integration test.

## Iteration 8 - Scene Object Sound Properties Affordance

Scope:
- One narrow Sounds-only slice after Iteration 7: expose a stable UI-level affordance for opening Sound Properties from the scene object list, so dropped/selected sound objects do not depend on brittle canvas context-menu automation.
- No VFX work. No heartbeat automation changes. No retail-canonical behavior claimed.

Changes:
- Added a `Properties` row action to supported objects in `SceneObjectListPanel`, including sounds.
- Added `sidebarPropertiesSignal` wiring from `WorkspaceMockLayout` into `WorkspaceCanvasViewport`.
- `WorkspaceCanvasViewport` now consumes `sidebarPropertiesSignal` and opens the same object-specific properties dialogs used by the context menu path; for sounds this calls the existing `openSoundPropertiesDialog` and preserves the existing draft/apply logic.
- Added compact row-action styling for the new affordance.
- Added focused coverage that:
  - verifies the row action emits a backend-style dropped sound object with `soundPositioning.preserve.extra`;
  - verifies `WorkspaceMockLayout` forwards the sound properties request into viewport props;
  - keeps the existing Sound Properties apply/save preservation harness green.

Files Changed:
- `frontend/src/modules/layout/components/SceneObjectListPanel.tsx`
- `frontend/src/modules/layout/components/WorkspaceMockLayout.tsx`
- `frontend/src/modules/layout/components/WorkspaceCanvasViewport.tsx`
- `frontend/src/styles.css`
- `frontend/tests/unit/modules/layout/SceneObjectListPanel.test.tsx`
- `frontend/tests/unit/modules/layout/WorkspaceMockLayout.viewportWiring.test.tsx`
- `docs/loops/sounds-mode-iteration-8-properties-affordance-browser-check.png`
- `docs/loops/sounds-mode-loop.md`

Tests and Build:
- Passed: `npx vitest run tests/unit/modules/layout/SceneObjectListPanel.test.tsx tests/unit/modules/layout/WorkspaceMockLayout.viewportWiring.test.tsx tests/unit/modules/layout/workspaceObjectPropertyDrafts.soundProperties.test.ts tests/unit/modules/layout/components/properties/SoundPropertiesDialog.test.tsx`
- Passed: `npm run build` in `frontend`
- Notes: the focused viewport wiring suite still emits pre-existing React `act(...)` warnings in older async area/placeables cases; all focused tests pass.

Browser QA:
- Target: `http://127.0.0.1:5173/app`
- Logged in as `builder.user`.
- In Areas Mode, scoped the right `Scene Objects` panel to `Sounds`.
- Verified `SOUND_FOREST_01` row now exposes a visible `Properties` action with `aria-label="Open object properties"` and title `Open properties for SOUND_FOREST_01`.
- Clicked the action and verified the existing `Sound Properties` dialog opens without crash.
- Screenshot saved: `docs/loops/sounds-mode-iteration-8-properties-affordance-browser-check.png`

QA Limitation:
- Browser QA used an existing seed sound row because reliable browser-level drag/drop of backend templates remains brittle. The focused component test covers the same affordance with a backend-style dropped sound object carrying `soundPositioning.preserve.extra`, and Iteration 7 covers edit/apply plus JSON/local-draft preservation.

Risks:
- Full user-style Browser verification of drag/drop backend template -> new scene row -> open properties still needs a stable browser drag/drop path or an editor command for creating the object under automation.
- Retail-canonical sound runtime behavior remains blocked pending hard retail/runtime/capture comparison evidence.

Next Step:
- Add a stable editor command/test hook for creating a backend sound template object on the area canvas, then run a full component or Browser flow: create backend sound object -> open Properties through the new row action -> edit/apply -> save draft -> reload and verify `soundPositioning.preserve.extra` remains intact.

## Iteration 9 - Backend Sound Row Action Save/Reload Harness

Scope:
- One narrow Sounds-only slice after Iteration 8: add a stable higher-level regression harness for a backend-style sound object opened through the new row `Properties` action, edited, applied, saved, and reloaded from local draft storage.
- No VFX work. No heartbeat automation changes. No retail-canonical behavior claimed.

Changes:
- Extended `Workspace.sound-properties.regression-smoke.test.tsx` with a backend-style sound scene fixture saved through `saveLocalSceneDraft` before app startup.
- Added a row-action opener helper that uses the Iteration 8 `Open object properties` affordance instead of the older context-menu path.
- Added a regression smoke test that:
  - starts from a local draft containing `SOUND_DIA_HAKON_ADD_12` with backend `soundPositioning.preserve.extra`;
  - opens Sound Properties through the scene-object row action;
  - verifies readonly backend metadata is visible in the dialog;
  - edits tag/comments and applies;
  - saves through the real workspace save command;
  - remounts the app and verifies the edited backend sound and `preserve.extra` survive reload.

Files Changed:
- `frontend/tests/regression-smoke/workspace/Workspace.sound-properties.regression-smoke.test.tsx`
- `docs/loops/sounds-mode-loop.md`

Tests and Build:
- Passed: `npx vitest run tests/regression-smoke/workspace/Workspace.sound-properties.regression-smoke.test.tsx`
- Build not rerun in this slice because only test/harness and loop documentation changed; the previous Iteration 8 frontend build passed after the UI/runtime changes.

Browser QA:
- Not rerun for this slice. Iteration 8 Browser QA verified the visible row `Properties` affordance and dialog open path; this iteration adds the higher-level app regression harness for backend metadata apply/save/reload.

QA Limitation:
- This remains a stable harness path, not a full user-style browser drag/drop of backend templates. It verifies the critical dropped-backend-sound contract by seeding the same scene object shape that the add/drop path creates.

Risks:
- Full browser drag/drop of backend sound templates is still not reliable enough to serve as the primary regression gate.
- Retail-canonical sound runtime behavior remains blocked pending hard retail/runtime/capture comparison evidence.

Next Step:
- Add an editor-level create/place command or reliable browser automation hook for backend sound templates so the remaining gap can be tested as: backend catalog template -> create/drop on area canvas -> row Properties -> edit/apply -> save/reload preservation, without manually seeding the local draft.

## Iteration 10 - Backend Sound Create Affordance

Scope:
- One narrow Sounds-only slice after Iteration 9: expose a stable editor-level create/place affordance for backend sound templates so Browser QA and higher-level tests can exercise the real template -> scene object path without manually seeding a local draft.
- No VFX work. No heartbeat automation changes. No retail-canonical behavior claimed.

Changes:
- Added an optional `onObjectCreate` action to `SceneObjectAddPanel`; each add-list row now exposes a `Create` button next to the existing preview/drag row.
- Wired `WorkspaceMockLayout` to emit a `canvasCreateObjectSignal` when the create action is clicked.
- Updated `WorkspaceCanvasViewport` to consume the create signal, create the selected template at the center of the active scene, preserve backend sound template metadata including `soundPositioning.preserve.extra`, append it through the existing scene viewport port, commit history, and select the new object.
- Added focused coverage for backend sound templates flowing from Add Objects through the new create signal into the viewport.

Files Changed:
- `frontend/src/modules/layout/components/SceneObjectAddPanel.tsx`
- `frontend/src/modules/layout/components/WorkspaceMockLayout.tsx`
- `frontend/src/modules/layout/components/WorkspaceCanvasViewport.tsx`
- `frontend/tests/unit/modules/layout/SceneObjectAddPanel.test.tsx`
- `frontend/tests/unit/modules/layout/WorkspaceMockLayout.viewportWiring.test.tsx`
- `docs/loops/sounds-mode-iteration-10-create-affordance-browser-check.png`
- `docs/loops/sounds-mode-loop.md`

Tests and Build:
- Passed: `npx vitest run tests/unit/modules/layout/SceneObjectAddPanel.test.tsx tests/unit/modules/layout/WorkspaceMockLayout.viewportWiring.test.tsx tests/regression-smoke/workspace/Workspace.sound-properties.regression-smoke.test.tsx tests/unit/modules/layout/workspaceObjectPropertyDrafts.soundProperties.test.ts`
- Passed: `npm run build` in `frontend`
- Notes: `WorkspaceMockLayout.viewportWiring.test.tsx` still emits pre-existing React `act(...)` warnings in older async area/placeables paths; all focused tests pass.
- Notes: Vite still reports the existing large chunk warning after production build.

Browser QA:
- Target: `http://127.0.0.1:5173/app`
- Verified Areas Mode Add Objects can switch to `Sounds (8)`.
- Verified backend sound template `SOUND_DIA_HAKON_ADD_12 / dia_hakon_add_12` exposes the new `Create` action.
- Clicked `Create`; verified the Scene Objects counts update from `All (12) / Sounds (2)` to `All (13) / Sounds (3)` and a new `SOUND_DIA_HAKON_ADD_12` scene row appears.
- Opened the new row through `Properties`; verified the existing Sound Properties dialog shows backend metadata: `soundId=sound_dia_hakon_add_12`, `resref=dia_hakon_add_12`, `category=effect`, `format=wav`, `spatialMode=3d`, `playbackMode=random`.
- Edited `Comments`, clicked `Apply`, and verified the backend metadata remained visible in the dialog without crash.
- Screenshot saved: `docs/loops/sounds-mode-iteration-10-create-affordance-browser-check.png`

Risks:
- The new create affordance is an editor/test affordance for deterministic placement; it is not a retail-canonical placement claim.
- Full save/reload Browser QA for a newly created backend sound still needs a stable end-to-end save command assertion in the running app. Iteration 9 covers save/reload preservation through a higher-level regression harness.
- Retail-canonical sound runtime behavior remains blocked pending hard retail/runtime/capture comparison evidence.

Next Step:
- Add a focused regression or Browser-backed app harness that uses the new `Create` affordance, opens the created backend sound row through `Properties`, edits/applies, invokes the real save path, remounts/reloads, and verifies `soundPositioning.preserve.extra` plus edited fields survive without relying on a seeded draft.

## Iteration 11 - Create Affordance Save/Reload Regression

Scope:
- One narrow Sounds-only slice after Iteration 10: add a focused app regression harness for the new `Create` affordance through edit/apply/save/reload, without pre-seeding a backend sound object into the local draft.
- No VFX work. No heartbeat automation changes. No retail-canonical behavior claimed.

Changes:
- Extended `Workspace.sound-properties.regression-smoke.test.tsx` with a catalog fetch fixture for the real `GET /catalog/sounds` envelope shape.
- Added a helper that switches Add Objects to `Sounds`, finds the backend template row, and clicks the new `Create object on canvas` affordance.
- Added a regression smoke test that:
  - starts from an empty local draft;
  - loads `SOUND_DIA_HAKON_ADD_12` from the catalog fixture;
  - creates it through Add Objects rather than seeding draft state;
  - opens the created scene row through the existing `Properties` action;
  - verifies backend metadata in Sound Properties;
  - edits tag/comments and applies;
  - invokes the real save command;
  - remounts/signs in again and verifies edited fields plus `soundPositioning.preserve.extra` survive reload.

Files Changed:
- `frontend/tests/regression-smoke/workspace/Workspace.sound-properties.regression-smoke.test.tsx`
- `docs/loops/sounds-mode-loop.md`

Tests and Build:
- Passed: `npx vitest run tests/regression-smoke/workspace/Workspace.sound-properties.regression-smoke.test.tsx`
- Build not rerun in this slice because runtime source was not changed; Iteration 10 already passed `npm run build` after the Create affordance runtime changes.

Browser QA:
- Not rerun for this slice. Iteration 10 Browser QA verified the visible Create -> row Properties -> edit/apply path in the running app; this iteration adds the missing save/reload regression using the same UI affordances in the app smoke harness.

Risks:
- The catalog data in this regression is a focused fixture matching the backend envelope, not a live backend call. Live backend catalog/playback was already verified in earlier iterations, but this test is intentionally deterministic.
- Retail-canonical sound runtime behavior remains blocked pending hard retail/runtime/capture comparison evidence.

Next Step:
- Add coverage for create-path undo/redo/delete behavior on backend-created sound objects, verifying selected sound markers and `soundPositioning.preserve.extra` remain consistent through scene history operations.

## Iteration 12 - Backend Sound Create History Regression

Scope:
- One narrow Sounds-only slice after Iteration 11: cover undo/redo/delete history for backend-created sound objects from the `Create` affordance.
- No VFX work. No heartbeat automation changes. No retail-canonical behavior claimed.

Changes:
- Added a focused regression to `Workspace.sound-properties.regression-smoke.test.tsx` for backend-created sound history behavior.
- Extracted a small assertion helper for backend-created `SOUND_DIA_HAKON_ADD_12` metadata so the create/edit/save and history tests assert the same `soundPositioning.preserve.extra` contract.
- The new regression:
  - starts from the same backend catalog fixture used in Iteration 11;
  - creates `SOUND_DIA_HAKON_ADD_12` through Add Objects `Create`;
  - verifies the initial created row is selected and metadata is present after save;
  - undoes creation and verifies the sound is absent;
  - redoes creation and verifies metadata is restored;
  - selects the restored row, deletes it, and verifies absence;
  - undoes delete and verifies the restored row can be selected and `soundPositioning.preserve.extra` matches the pre-delete state.

Files Changed:
- `frontend/tests/regression-smoke/workspace/Workspace.sound-properties.regression-smoke.test.tsx`
- `docs/loops/sounds-mode-loop.md`

Tests and Build:
- Passed: `npx vitest run tests/regression-smoke/workspace/Workspace.sound-properties.regression-smoke.test.tsx`
- Build not rerun in this slice because runtime source was not changed; Iteration 10 already passed `npm run build` after the Create affordance runtime changes.

Browser QA:
- Not rerun for this slice. This was a deterministic app regression harness update only; Iteration 10 Browser QA remains the latest live UI verification for Create -> Properties -> edit/apply.

Behavior Note:
- Redo restores the backend-created sound object and metadata but does not automatically restore row selection. The regression verifies the restored sound remains selectable before delete and after undo-delete.

Risks:
- The history test uses the focused catalog fixture from Iteration 11 rather than a live backend call, keeping the scene-history boundary deterministic.
- Retail-canonical sound runtime behavior remains blocked pending hard retail/runtime/capture comparison evidence.

Next Step:
- Add a focused regression for copy/paste or duplicate of backend-created sound objects, verifying copied sounds preserve `soundPositioning.preserve.extra` while receiving distinct scene identity/tag behavior.

## Iteration 13 - Backend Sound Copy/Paste Regression

Scope:
- One narrow Sounds-only slice after Iteration 12: cover copy/paste behavior for backend-created sound objects from the `Create` affordance.
- No VFX work. No heartbeat automation changes. No retail-canonical behavior claimed.

Changes:
- Added a focused regression to `Workspace.sound-properties.regression-smoke.test.tsx` for copying and pasting a backend-created `SOUND_DIA_HAKON_ADD_12`.
- The new regression:
  - starts from the backend catalog fixture used by Iterations 11-12;
  - creates `SOUND_DIA_HAKON_ADD_12` through Add Objects `Create`;
  - verifies the created object is selected and has backend metadata;
  - copies and pastes through the real keyboard command path;
  - verifies the pasted row receives copy tag behavior (`SOUND_DIA_HAKON_ADD_12_COPY...`);
  - verifies the pasted object has a distinct scene `id`;
  - verifies `resRef` and `soundPositioning.preserve.extra` stay intact, including `backendSoundId`, category, format, spatial mode, playback mode, and `soundTemplateSource`.

Files Changed:
- `frontend/tests/regression-smoke/workspace/Workspace.sound-properties.regression-smoke.test.tsx`
- `docs/loops/sounds-mode-loop.md`

Tests and Build:
- Passed: `npx vitest run tests/regression-smoke/workspace/Workspace.sound-properties.regression-smoke.test.tsx`
- Build not rerun in this slice because runtime source was not changed; Iteration 10 already passed `npm run build` after the Create affordance runtime changes.

Browser QA:
- Not rerun for this slice. This was a deterministic app regression harness update only; Iteration 10 remains the latest Browser QA for the live Create -> Properties path.

Risks:
- The copy/paste test uses the focused catalog fixture from Iteration 11 rather than a live backend call, keeping the copy/identity boundary deterministic.
- Retail-canonical sound runtime behavior remains blocked pending hard retail/runtime/capture comparison evidence.

Next Step:
- Add a focused regression for backend-created sound objects through save/export or scene serialization boundaries beyond local draft, if an export facade exists; otherwise document the exact missing export/save boundary as the next blocker.

## Iteration 14 - Backend Sound Scene Serialization Boundary

Scope:
- One narrow Sounds-only slice after Iteration 13: verify backend-created sound metadata across the real scene canvas serialization boundary beyond the UI local-draft smoke harness.
- No VFX work. No heartbeat automation changes. No retail-canonical behavior claimed.

Findings:
- No separate frontend scene export facade or download/export command was found in the current app code.
- The existing `SceneCanvasFacade` is the concrete scene save/load serialization boundary: it writes normalized scene JSON through `SceneDraftPort.saveByUserId` and reloads through `createInitialHistory`.

Changes:
- Added a focused `sceneCanvasFacade` unit regression that creates a backend-style `SOUND_DIA_HAKON_ADD_12` scene object with Aurora sound catalog metadata in `soundPositioning.preserve.extra`.
- The test saves through `createSceneCanvasFacade().saveLocalDraft`, verifies the serialized JSON contains the backend sound id and `backend-catalog` source marker, reloads through `createInitialHistory`, and asserts the sound tag/resref plus `preserve.flags` and `preserve.extra` roundtrip intact.

Files Changed:
- `frontend/tests/unit/modules/scene/application/sceneCanvasFacade.test.ts`
- `docs/loops/sounds-mode-loop.md`

Tests and Build:
- Passed: `npx vitest run tests/unit/modules/scene/application/sceneCanvasFacade.test.ts tests/regression-smoke/workspace/Workspace.sound-properties.regression-smoke.test.tsx`
- Build not rerun in this slice because runtime source was not changed; Iteration 10 already passed `npm run build` after the Create affordance runtime changes.

Browser QA:
- Not rerun for this slice. This was a deterministic serialization-boundary regression; Iteration 10 remains the latest Browser QA for the live Create -> Properties path.

Risks:
- A dedicated scene export/download boundary does not appear to exist yet, so export-specific sound metadata coverage remains blocked on that product surface being added.
- Retail-canonical sound runtime behavior remains blocked pending hard retail/runtime/capture comparison evidence.

Next Step:
- Add a focused regression or implementation slice for area save/export once a real area persistence/export facade exists; until then, continue Sounds Mode hardening with editor-only sound guide visibility/gating for backend-created sound objects.

## Iteration 15 - Editor-Only Sound Guide Gating

Scope:
- One narrow Sounds-only slice after Iteration 14: harden editor-only sound guide visibility/gating for backend-created sound objects.
- No VFX work. No heartbeat automation changes. No retail-canonical behavior claimed.

Changes:
- Added `resolveEditorSoundGuideOverlayFlags` to `soundGuideDomain` as the explicit editor visibility gate for sound guide overlays.
- Updated the Three object mesh layer to use the editor gate for sound overlays. Backend-created sounds still resolve overlays from normal sound positioning, but guide overlays are suppressed when the sound layer is locked.
- Added focused coverage for a backend-created `SOUND_DIA_HAKON_ADD_12`-style positioning payload:
  - visible editor guides remain enabled for random-mode backend sounds;
  - hidden editor state suppresses all guide overlays;
  - locked sound layer suppresses all guide overlays;
  - backend catalog metadata in `preserve.extra` is not needed to compute overlays and remains separate from editor-only guide state.

Files Changed:
- `frontend/src/modules/layout/soundGuideDomain.ts`
- `frontend/src/modules/layout/adapters/three/workspaceObjectMeshLayer.ts`
- `frontend/tests/unit/modules/layout/soundGuideDomain.test.ts`
- `docs/loops/sounds-mode-loop.md`

Tests and Build:
- Passed: `npx vitest run tests/unit/modules/layout/soundGuideDomain.test.ts tests/unit/modules/layout/WorkspaceCanvasViewport.renderFilter.test.ts`
- Passed: `npm run build` in `frontend`
- Notes: Vite still reports the existing large chunk warning after production build.

Browser QA:
- Not rerun for this slice. The change is a deterministic domain/render-gate update covered by focused unit tests and production build.

Risks:
- The current gate uses the existing render-layer `lockedKinds.sounds` state. Full UI validation of lock/unlock visual guide behavior can be added later with a Browser check if the coordinator wants visual proof.
- Retail-canonical sound runtime behavior remains blocked pending hard retail/runtime/capture comparison evidence.

Next Step:
- Add a focused visual/render regression for locked sound layers so backend-created sound markers still render while editor-only guide overlays are suppressed, or perform Browser QA for the same lock/unlock guide behavior if a stable visual assertion is available.

## Iteration 16 - Locked Sound Layer Render Regression

Scope:
- One narrow Sounds-only slice after Iteration 15: verify locked sound layers suppress editor-only sound guide overlays while keeping backend-created sound markers renderable.
- No VFX work. No heartbeat automation changes. No retail-canonical behavior claimed.

Changes:
- Gated the sound physical anchor mesh and its optional anchor connector behind the explicit editor overlay `anchor` flag in the Three workspace object mesh layer.
- This keeps the backend-created sound marker root available for selection/rendering while making locked sound layers suppress all standalone editor guide overlays.
- Added a focused render regression using a backend-style `SOUND_DIA_HAKON_ADD_12` scene object with `soundPositioning.preserve.extra.backendSoundId`.
- The regression verifies:
  - unlocked sound layer renders standalone guide nodes;
  - locked sound layer still registers the sound marker by object id;
  - locked sound layer renders zero standalone guide `Line`/`Mesh` overlay nodes.
- Updated the shared canvas test mock with `strokeText` and `rotate`, matching the sound marker sprite drawing path used by the renderer.

Files Changed:
- `frontend/src/modules/layout/adapters/three/workspaceObjectMeshLayer.ts`
- `frontend/tests/unit/modules/layout/WorkspaceCanvasViewport.renderFilter.test.ts`
- `frontend/tests/setup.ts`
- `docs/loops/sounds-mode-loop.md`

Tests and Build:
- Passed: `npx vitest run tests/unit/modules/layout/WorkspaceCanvasViewport.renderFilter.test.ts tests/unit/modules/layout/soundGuideDomain.test.ts`
- Passed: `npm run build` in `frontend`
- Notes: Vite still reports the existing large chunk warning after production build.

Browser QA:
- Not rerun for this slice. The change is covered by deterministic render-layer regression and production build; no user workflow surface changed.

Risks:
- The render regression checks object registration and guide-node counts rather than a pixel screenshot. Browser QA can still be useful later for visual lock/unlock proof in the running app.
- Retail-canonical sound runtime behavior remains blocked pending hard retail/runtime/capture comparison evidence.

Next Step:
- Add a Browser-backed visual QA or focused integration check for lock/unlock sound guide behavior in the running app if stable selectors are available; otherwise continue Sounds Mode hardening around persistence/export once a real area export facade exists.

## Iteration 17 - App-Level Sound Layer Lock Wiring

Scope:
- One narrow Sounds-only slice after Iteration 16: add a stable UI-level integration harness for lock/unlock sound guide behavior without relying on brittle pixel assertions.
- No VFX work. No heartbeat automation changes. No retail-canonical behavior claimed.

Changes:
- Added an App-level regression that uses the real `WorkspaceTopbar` and `WorkspaceMockLayout` but replaces `WorkspaceCanvasViewport` with a prop probe.
- The test signs in as a builder, opens the real Canvas toolbar group, clicks the visible `Lock SND` affordance, and verifies `toolbarState.canvasDebug.lockedKinds.sounds` reaches the viewport.
- The test also toggles `Lock SND` back off and verifies the viewport receives `lockedKinds.sounds: false`.
- This pairs with Iteration 16's render-layer regression: the UI wiring now proves the lock action reaches the canvas, and the render test proves locked sound layers suppress editor-only guide overlays while preserving the sound marker.

Files Changed:
- `frontend/tests/unit/app/App.sound-layer-lock.test.tsx`
- `docs/loops/sounds-mode-loop.md`

Tests and Build:
- Passed: `npx vitest run tests/unit/app/App.sound-layer-lock.test.tsx tests/unit/modules/layout/WorkspaceCanvasViewport.renderFilter.test.ts`
- Build not rerun in this slice because runtime source was not changed; Iteration 16 already passed `npm run build` after the render-layer runtime update.

Browser QA:
- Not rerun. This slice adds a stable component-level app harness for the same lock/unlock UI path; no new runtime behavior was introduced.

Risks:
- The harness verifies UI state propagation into the viewport props, not rendered pixels. Pixel Browser QA can be added if the canvas receives stable test selectors or an intentional visual probe.
- Retail-canonical sound runtime behavior remains blocked pending hard retail/runtime/capture comparison evidence.

Next Step:
- Continue Sounds Mode hardening at the next available product boundary: either add a Browser visual probe for sound guide lock/unlock if stable selectors are introduced, or add area save/export coverage for backend-created sounds once a real export facade exists.

## Iteration 18 - Sound Guide Browser Probe / Export Boundary Check

Scope:
- One narrow Sounds-only slice after Iteration 17: check whether the next documented boundary is actionable without adding brittle or fake coverage.
- No VFX work. No heartbeat automation changes. No retail-canonical behavior claimed.

Findings:
- The running app has stable DOM access to the workspace canvas/topbar actions, and Iteration 17 now covers the `Lock SND` UI action reaching viewport `toolbarState.canvasDebug.lockedKinds.sounds`.
- The Three sound guide overlays themselves are not exposed through a stable Browser-visible probe, selector, diagnostics hook, or test id. A Browser screenshot could see the canvas but would need brittle pixel heuristics to distinguish sound guide rings/anchors from the backend-created sound marker.
- The only concrete frontend scene persistence boundary found remains `SceneCanvasFacade.saveLocalDraft` / `createInitialHistory`.
- Iteration 14 already covers backend-created sound metadata through that local draft serialization boundary, including `soundPositioning.preserve.extra`.
- No dedicated area export/download facade or product save/export surface for placed sounds was found in the current frontend module boundary.

Blocker:
- Browser visual QA for lock/unlock sound guides is blocked on a stable canvas/runtime diagnostic probe for editor-only sound guide overlay counts or named guide-layer visibility.
- Export/save coverage beyond local draft is blocked on a real area export facade or product save endpoint that serializes placed sound objects.

Smallest Next Code Step:
- Add an intentional editor/debug-only render diagnostics hook from `WorkspaceCanvasViewport`/Three runtime that exposes per-kind guide overlay counts, including `sounds.marker` and `sounds.editorGuides`, to tests and optional Browser QA without rendering new user-facing text.
- Once that probe exists, add Browser or component integration coverage for `Lock SND`: backend-created sound marker remains present while `sounds.editorGuides` drops to zero.

Files Changed:
- `docs/loops/sounds-mode-loop.md`

Tests and Build:
- Not run. This slice made no production or test code changes; it records a concrete product-boundary blocker after source inspection.

Browser QA:
- Not run. Current canvas selectors are stable enough to locate the canvas, but not enough to assert sound guide visibility without brittle pixel assertions.

Risks:
- The proposed diagnostics hook must stay editor/test-only and must not become a retail-canonical sound behavior claim.
- Retail-canonical sound runtime behavior remains blocked pending hard retail/runtime/capture comparison evidence.

Next Step:
- Implement the smallest editor/test diagnostics hook for sound guide overlay counts, then use it to verify `Lock SND` suppresses editor-only sound guides while preserving backend-created sound markers.

## Iteration 19 - Sound Render Diagnostics Hook

Scope:
- One narrow Sounds-only slice after Iteration 18: implement the smallest editor/test diagnostics hook for sound render counts.
- No VFX work. No heartbeat automation changes. No retail-canonical behavior claimed.

Changes:
- Added `SoundRenderDiagnostics` helpers in the Three object mesh layer:
  - `resolveSoundRenderDiagnostics(runtime)` counts sound marker roots and editor-only sound guide nodes from `userData`;
  - `writeSoundRenderDiagnostics(runtime)` writes those counts to the viewport container as `data-sound-marker-count` and `data-sound-editor-guide-count`.
- Tagged backend-created and scene-created sound marker roots with a sound marker diagnostic role.
- Tagged standalone editor guide nodes with a sound guide diagnostic role:
  - anchor;
  - anchor connector;
  - cutoff/max range rings;
  - dome latitude/meridian guides;
  - random range rectangle;
  - elevation height guide.
- Updated `WorkspaceCanvasViewport` to write sound render diagnostics after each object mesh rebuild.
- Extended the locked sound layer render regression so it proves:
  - unlocked backend sound renders `marker: 1` and `editorGuides > 0`;
  - locked backend sound still renders `marker: 1`;
  - locked backend sound drops `editorGuides` to `0`;
  - the viewport-compatible dataset hook writes `data-sound-marker-count="1"` and `data-sound-editor-guide-count="0"`.

Files Changed:
- `frontend/src/modules/layout/adapters/three/workspaceObjectMeshLayer.ts`
- `frontend/src/modules/layout/components/WorkspaceCanvasViewport.tsx`
- `frontend/tests/unit/modules/layout/WorkspaceCanvasViewport.renderFilter.test.ts`
- `docs/loops/sounds-mode-loop.md`

Tests and Build:
- Passed: `npx vitest run tests/unit/modules/layout/WorkspaceCanvasViewport.renderFilter.test.ts tests/unit/app/App.sound-layer-lock.test.tsx`
- Passed: `npm run build` in `frontend`
- Notes: Vite still reports the existing large chunk warning after production build.

Browser QA:
- Not run in this slice. The diagnostics hook is now in place; the next slice can use the new `data-sound-*` attributes for stable Browser/component QA without pixel heuristics.

Risks:
- The diagnostics hook is intentionally editor/test-facing and should remain a render diagnostic, not a retail-canonical sound behavior claim.
- Retail-canonical sound runtime behavior remains blocked pending hard retail/runtime/capture comparison evidence.

Next Step:
- Add a Browser-backed or component-level integration check that creates/selects a backend sound, toggles `Lock SND`, and asserts the viewport diagnostics change from `data-sound-editor-guide-count > 0` to `0` while `data-sound-marker-count` stays `1`.

## Iteration 20 - Sound Diagnostics Lock Integration Harness

Scope:
- One narrow Sounds-only slice after Iteration 19: use the new sound render diagnostics contract in a stable component-level integration harness.
- No VFX work. No heartbeat automation changes. No retail-canonical behavior claimed.

Changes:
- Extended the App-level sound layer lock harness with a backend sound catalog fixture for `dia_hakon_add_12`.
- The viewport test probe now exposes the same `data-sound-marker-count` and `data-sound-editor-guide-count` contract as the real viewport diagnostics hook, derived from the App/Layout props for component-level integration.
- Added a regression that:
  - signs in as a builder;
  - switches to `Sounds Mode`;
  - places `dia_hakon_add_12` on the canvas via the real Sounds Mode `Place ... on canvas` affordance;
  - verifies `data-sound-marker-count="1"` and `data-sound-editor-guide-count > 0`;
  - toggles the real Canvas toolbar `Lock SND` action;
  - verifies `data-sound-marker-count` remains `1` while `data-sound-editor-guide-count` becomes `0`.
- This complements Iteration 19's render-layer test: the render-layer test proves the real Three runtime counting, while this harness proves the App/Sounds Mode/toolbar flow uses the same diagnostics contract.

Files Changed:
- `frontend/tests/unit/app/App.sound-layer-lock.test.tsx`
- `docs/loops/sounds-mode-loop.md`

Tests and Build:
- Passed: `npx vitest run tests/unit/app/App.sound-layer-lock.test.tsx tests/unit/modules/layout/WorkspaceCanvasViewport.renderFilter.test.ts`
- Build not rerun in this slice because only tests/docs changed; Iteration 19 already passed `npm run build` after the runtime diagnostics hook.

Browser QA:
- Not run. This slice adds component-level coverage over the stable `data-sound-*` diagnostics contract without needing brittle pixel assertions.

Risks:
- The App-level viewport is still a test probe, not a real WebGL Browser screenshot. The real Three runtime hook remains covered by `WorkspaceCanvasViewport.renderFilter.test.ts`.
- Retail-canonical sound runtime behavior remains blocked pending hard retail/runtime/capture comparison evidence.

Next Step:
- Continue Sounds Mode hardening at a real product boundary: add Browser QA against the actual app using `data-sound-marker-count` / `data-sound-editor-guide-count` if a local runnable target is available, or move to placed-sound persistence/export once a real area export facade exists.

## Iteration 21 - Browser QA Availability Check

Scope:
- One narrow Sounds-only slice after Iteration 20: determine whether Browser QA against the actual app can be executed now using the stable `data-sound-*` diagnostics contract.
- No VFX work. No heartbeat automation changes. No retail-canonical behavior claimed.

Findings:
- The frontend provides runnable Vite targets (`npm run dev`, `npm run preview`) and the app now exposes stable viewport diagnostics through `data-sound-marker-count` and `data-sound-editor-guide-count`.
- Current tool discovery did not expose an in-app Browser control tool in this worker session.
- Local frontend dependencies do not include Playwright:
  - `require.resolve("playwright")` failed;
  - `require.resolve("@playwright/test")` failed.
- Because no Browser automation surface is currently callable, running the actual app and asserting the live DOM `data-sound-*` attributes would require an untracked ad hoc dependency or manual Browser work outside this worker loop.

Blocker:
- Browser QA for the live app is blocked by missing Browser/Playwright automation in this session, not by missing product selectors. The product-side diagnostics hook exists.

Files Changed:
- `docs/loops/sounds-mode-loop.md`

Tests and Build:
- Not run. This slice changed only the loop note and records an execution-environment blocker.

Browser QA:
- Not run. Blocked by unavailable Browser control tool and absent local Playwright dependency.

Risks:
- The component-level harness from Iteration 20 and render-layer test from Iteration 19 cover the behavior, but they are not a live Browser screenshot/session.
- Retail-canonical sound runtime behavior remains blocked pending hard retail/runtime/capture comparison evidence.

Next Step:
- Run Browser QA in a session with the Browser control tool available, or add an approved local browser automation harness/dependency. Target flow: sign in as builder, switch to `Sounds Mode`, place `dia_hakon_add_12`, verify live `data-sound-marker-count="1"` and `data-sound-editor-guide-count > 0`, click `Lock SND`, verify marker stays `1` and editor guides become `0`.

## Iteration 22 - Multi-Sound Diagnostics Count Regression

Scope:
- One narrow Sounds-only slice after Iteration 21: harden the sound render diagnostics contract while live Browser QA remains environment-blocked.
- No VFX work. No heartbeat automation changes. No retail-canonical behavior claimed.

Changes:
- Extended the focused render-layer diagnostics coverage to include multiple backend-created sound objects.
- Added a second backend-style sound fixture with distinct scene identity, resref/tag, and `soundPositioning.preserve.extra.backendSoundId`.
- The new regression verifies:
  - unlocked render diagnostics count both sound markers (`marker: 2`);
  - unlocked render diagnostics report editor guide overlays for the placed sounds;
  - locked sound layer keeps both markers (`marker: 2`);
  - locked sound layer suppresses all editor guides (`editorGuides: 0`);
  - the dataset diagnostics contract writes `data-sound-marker-count="2"` and `data-sound-editor-guide-count="0"`.

Files Changed:
- `frontend/tests/unit/modules/layout/WorkspaceCanvasViewport.renderFilter.test.ts`
- `docs/loops/sounds-mode-loop.md`

Tests and Build:
- Passed: `npx vitest run tests/unit/modules/layout/WorkspaceCanvasViewport.renderFilter.test.ts tests/unit/app/App.sound-layer-lock.test.tsx`
- Build not rerun in this slice because only tests/docs changed; Iteration 19 already passed `npm run build` after the runtime diagnostics hook.

Browser QA:
- Not run. The Iteration 21 Browser/Playwright availability blocker remains.

Risks:
- This strengthens deterministic render-layer coverage but is still not a live Browser session.
- Retail-canonical sound runtime behavior remains blocked pending hard retail/runtime/capture comparison evidence.

Next Step:
- Run live Browser QA when Browser control or an approved browser automation harness is available. If that remains blocked, continue with another narrow deterministic Sounds Mode boundary that does not require live Browser automation or a missing export facade.

## Iteration 23 - Hidden Sounds Layer Diagnostics Boundary

Scope:
- One narrow Sounds-only slice after Iteration 22: cover a new deterministic visibility boundary for backend-created sounds while live Browser QA remains environment-blocked.
- No VFX work. No heartbeat automation changes. No retail-canonical behavior claimed.

Changes:
- Added focused coverage for the `visibility.sounds=false` path used before `WorkspaceCanvasViewport` rebuilds Three object meshes.
- The regression verifies:
  - backend-created sound objects are visible when `visibility.sounds` is true;
  - backend-created sound objects are filtered out when `visibility.sounds` is false;
  - visible sounds produce marker/editor guide diagnostics;
  - a rebuild with no visible sounds writes `data-sound-marker-count="0"` and `data-sound-editor-guide-count="0"`.

Files Changed:
- `frontend/tests/unit/modules/layout/WorkspaceCanvasViewport.renderFilter.test.ts`
- `docs/loops/sounds-mode-loop.md`

Tests and Build:
- Passed: `npx vitest run tests/unit/modules/layout/WorkspaceCanvasViewport.renderFilter.test.ts tests/unit/app/App.sound-layer-lock.test.tsx`
- Build not rerun in this slice because only tests/docs changed; Iteration 19 already passed `npm run build` after the runtime diagnostics hook.

Browser QA:
- Not run. The Iteration 21 Browser/Playwright availability blocker remains.

Risks:
- This is deterministic render/filter coverage, not a live Browser session.
- Retail-canonical sound runtime behavior remains blocked pending hard retail/runtime/capture comparison evidence.

Next Step:
- If live Browser QA remains unavailable and no export facade exists, continue with one narrow deterministic Sounds Mode boundary around selection/runtime behavior, such as verifying hidden backend-created sound objects are not selectable or do not participate in runtime sound preview while preserving placed metadata in scene state.

## Iteration 24 - Hidden Sounds Runtime Preview Eligibility

Scope:
- One narrow Sounds-only slice after Iteration 23: harden the runtime preview boundary for backend-created sound objects when the Sounds layer is hidden.
- No VFX work. No heartbeat automation changes. No retail-canonical behavior claimed.

Changes:
- Extracted the runtime sound preview eligibility decision into `isRuntimeSoundPreviewEligible(...)`.
- The runtime preview hook now uses the shared eligibility helper when computing candidate placed sounds.
- Added focused regression coverage proving:
  - a backend-created sound is eligible for runtime preview when the Sounds layer is visible;
  - the same sound is excluded when `visibility.sounds=false`;
  - `soundPositioning.preserve.extra` remains intact in scene state while hidden from runtime preview.

Files Changed:
- `frontend/src/modules/layout/application/useRuntimeSoundPreview.ts`
- `frontend/tests/unit/modules/layout/WorkspaceCanvasViewport.renderFilter.test.ts`
- `docs/loops/sounds-mode-loop.md`

Tests and Build:
- Passed: `npx vitest run tests/unit/modules/layout/WorkspaceCanvasViewport.renderFilter.test.ts tests/unit/app/App.sound-layer-lock.test.tsx`
- Passed: `npm run build`
- Build note: Vite still reports the existing large chunk warning.

Browser QA:
- Not run. The Iteration 21 Browser/Playwright availability blocker remains.

Risks:
- This covers the deterministic runtime-preview eligibility contract, not live audio playback in a Browser session.
- Retail-canonical sound runtime behavior remains blocked pending hard retail/runtime/capture comparison evidence.

Next Step:
- Continue with one narrow deterministic Sounds Mode boundary that still does not require live Browser automation or a missing export facade. A useful next slice is selection cleanup: verify hidden backend-created sounds are removed from selected IDs/open properties eligibility while their scene metadata remains preserved.

## Iteration 25 - Hidden Sounds Selection Cleanup

Scope:
- One narrow Sounds-only slice after Iteration 24: harden selection cleanup for backend-created sound objects when the Sounds layer is hidden.
- No VFX work. No heartbeat automation changes. No retail-canonical behavior claimed.

Changes:
- Extracted `filterSelectedObjectIdsForVisibleSelectableObjects(...)` into the workspace scene interaction domain.
- Updated `WorkspaceCanvasViewport` selection cleanup to use the shared helper instead of inline filtering.
- Added focused regression coverage proving:
  - a selected backend-created sound is removed from selected IDs when it is no longer in the visible object set;
  - the same scene object keeps `soundPositioning.preserve.extra.backendSoundId` and `soundTemplateSource` metadata while hidden from selection.

Files Changed:
- `frontend/src/modules/layout/application/workspaceSceneInteraction.ts`
- `frontend/src/modules/layout/components/WorkspaceCanvasViewport.tsx`
- `frontend/tests/unit/modules/layout/WorkspaceCanvasViewport.renderFilter.test.ts`
- `docs/loops/sounds-mode-loop.md`

Tests and Build:
- Passed: `npx vitest run tests/unit/modules/layout/WorkspaceCanvasViewport.renderFilter.test.ts tests/unit/app/App.sound-layer-lock.test.tsx`
- Passed: `npm run build`
- Build note: Vite still reports the existing large chunk warning.

Browser QA:
- Not run. The Iteration 21 Browser/Playwright availability blocker remains.

Risks:
- This covers selection cleanup deterministically, not a live pointer/DOM selection session.
- Retail-canonical sound runtime behavior remains blocked pending hard retail/runtime/capture comparison evidence.

Next Step:
- Continue with one narrow deterministic Sounds Mode boundary that does not require live Browser automation or a missing export facade. A useful next slice is properties dialog lifecycle cleanup: verify a Sound Properties dialog targeting a hidden/deleted backend-created sound closes or refreshes safely while preserving metadata for still-present scene objects.

## Iteration 26 - Hidden Sounds Properties Dialog Lifecycle

Scope:
- One narrow Sounds-only slice after Iteration 25: harden Sound Properties dialog lifecycle when backend-created sound objects are hidden by the Sounds layer.
- No VFX work. No heartbeat automation changes. No retail-canonical behavior claimed.

Changes:
- Added `reconcileSoundPropertiesDialogWithScene(...)` as a pure dialog lifecycle helper.
- Passed `visibleObjectIdsSet` into `useWorkspaceObjectDialogEffects`.
- Updated Sound Properties reconciliation so a dialog targeting a hidden backend-created sound closes safely.
- Kept the existing live-scene refresh behavior for still-visible sound objects.
- Added focused coverage proving:
  - a Sound Properties dialog targeting a hidden backend-created sound returns `null`;
  - the underlying scene object keeps `soundPositioning.preserve.extra.backendSoundId` and `soundTemplateSource`;
  - a visible backend-created sound dialog refreshes from live scene state while preserving backend metadata in the draft and scene object.

Files Changed:
- `frontend/src/modules/layout/application/useWorkspaceObjectDialogEffects.ts`
- `frontend/src/modules/layout/components/WorkspaceCanvasViewport.tsx`
- `frontend/tests/unit/modules/layout/workspaceObjectPropertyDrafts.soundProperties.test.ts`
- `docs/loops/sounds-mode-loop.md`

Tests and Build:
- Passed: `npx vitest run tests/unit/modules/layout/workspaceObjectPropertyDrafts.soundProperties.test.ts tests/unit/modules/layout/WorkspaceCanvasViewport.renderFilter.test.ts tests/unit/app/App.sound-layer-lock.test.tsx`
- Passed: `npm run build`
- Build note: Vite still reports the existing large chunk warning.

Browser QA:
- Not run. The Iteration 21 Browser/Playwright availability blocker remains.

Risks:
- This covers dialog lifecycle deterministically, not live DOM interaction with the actual properties panel.
- Retail-canonical sound runtime behavior remains blocked pending hard retail/runtime/capture comparison evidence.

Next Step:
- Continue with one narrow deterministic Sounds Mode boundary that does not require live Browser automation or a missing export facade. A useful next slice is command/context-menu safety: verify hidden backend-created sounds cannot receive Properties/Edit commands while visible backend-created sounds still open Sound Properties with backend metadata.

## Iteration 27 - Hidden Sounds Context Menu Action Safety

Scope:
- One narrow Sounds-only slice after Iteration 26: harden context menu command targeting for hidden backend-created sound objects.
- No VFX work. No heartbeat automation changes. No retail-canonical behavior claimed.

Changes:
- Added `resolveContextMenuActionObject(...)` as a pure guard for context menu action targets.
- Passed `visibleObjectIdsSet` into `useWorkspaceContextMenuActions`.
- Updated context menu action handling so stale or hidden context targets close the menu without dispatching Properties/Edit-style commands.
- Added focused coverage proving:
  - a hidden backend-created sound returns `null` as a context menu action target;
  - the source scene object keeps `soundPositioning.preserve.extra.backendSoundId` and `soundTemplateSource`;
  - a visible backend-created sound remains a valid action target with backend metadata intact.

Files Changed:
- `frontend/src/modules/layout/application/useWorkspaceContextMenuActions.ts`
- `frontend/src/modules/layout/components/WorkspaceCanvasViewport.tsx`
- `frontend/tests/unit/modules/layout/useWorkspaceContextMenuActions.test.ts`
- `docs/loops/sounds-mode-loop.md`

Tests and Build:
- Passed: `npx vitest run tests/unit/modules/layout/useWorkspaceContextMenuActions.test.ts tests/unit/modules/layout/workspaceObjectPropertyDrafts.soundProperties.test.ts tests/unit/modules/layout/WorkspaceCanvasViewport.renderFilter.test.ts tests/unit/app/App.sound-layer-lock.test.tsx`
- Passed: `npm run build`
- Build note: Vite still reports the existing large chunk warning.

Browser QA:
- Not run. The Iteration 21 Browser/Playwright availability blocker remains.

Risks:
- This covers command target resolution deterministically, not a live right-click Browser session.
- Retail-canonical sound runtime behavior remains blocked pending hard retail/runtime/capture comparison evidence.

Next Step:
- Continue with one narrow deterministic Sounds Mode boundary that does not require live Browser automation or a missing export facade. A useful next slice is sidebar Properties signal safety: verify hidden backend-created sounds cannot open Sound Properties from sidebar/list affordances while visible backend-created sounds still open with backend metadata.

## Iteration 28 - Hidden Sounds Sidebar Properties Signal Safety

Scope:
- One narrow Sounds-only slice after Iteration 27: harden sidebar/list Properties signal targeting for hidden backend-created sound objects.
- No VFX work. No heartbeat automation changes. No retail-canonical behavior claimed.

Changes:
- Added `resolveVisibleObjectForPropertiesSignal(...)` as a shared pure helper for sidebar/list Properties signal resolution.
- Updated `WorkspaceCanvasViewport` sidebar Properties signal handling to use the helper instead of inline matching.
- Added focused coverage proving:
  - a hidden backend-created sound does not resolve as a sidebar Properties target;
  - a visible backend-created sound still resolves as a valid Properties target;
  - backend sound metadata in `soundPositioning.preserve.extra` remains intact while hidden or visible.

Files Changed:
- `frontend/src/modules/layout/application/workspaceSceneInteraction.ts`
- `frontend/src/modules/layout/components/WorkspaceCanvasViewport.tsx`
- `frontend/tests/unit/modules/layout/WorkspaceCanvasViewport.renderFilter.test.ts`
- `docs/loops/sounds-mode-loop.md`

Tests and Build:
- Passed: `npx vitest run tests/unit/modules/layout/WorkspaceCanvasViewport.renderFilter.test.ts tests/unit/modules/layout/useWorkspaceContextMenuActions.test.ts tests/unit/modules/layout/workspaceObjectPropertyDrafts.soundProperties.test.ts tests/unit/app/App.sound-layer-lock.test.tsx`
- Passed: `npm run build`
- Build note: Vite still reports the existing large chunk warning.

Browser QA:
- Not run. The Iteration 21 Browser/Playwright availability blocker remains.

Risks:
- This covers sidebar/list Properties signal resolution deterministically, not a live DOM click from the actual object list.
- Retail-canonical sound runtime behavior remains blocked pending hard retail/runtime/capture comparison evidence.

Next Step:
- Continue with one narrow deterministic Sounds Mode boundary that does not require live Browser automation or a missing export facade. A useful next slice is render-object-id gating for placed backend sounds: verify sidebar Properties, runtime preview eligibility, and diagnostics all respect an object preview `renderObjectIds` subset while preserving backend sound metadata.

## Iteration 29 - Backend Sounds Render Object Subset Gating

Scope:
- One narrow Sounds-only slice after Iteration 28: harden placed backend sound behavior when the viewport is rendering an object-preview `renderObjectIds` subset.
- No VFX work. No heartbeat automation changes. No retail-canonical behavior claimed.

Changes:
- Extended `isRuntimeSoundPreviewEligible(...)` with an optional `renderObjectIdsSet` guard.
- Passed `renderObjectIdsSet` from `WorkspaceCanvasViewport` into `useRuntimeSoundPreview`.
- Moved the existing viewport `renderObjectIdsSet` memo earlier so runtime sound preview and render/filter logic share the same subset decision.
- Added focused coverage proving:
  - sidebar Properties resolution allows a backend-created sound in the render subset;
  - sidebar Properties resolution rejects a backend-created sound outside the render subset;
  - runtime preview eligibility follows the same subset;
  - backend sound metadata in `soundPositioning.preserve.extra` remains intact for filtered-out sounds.

Files Changed:
- `frontend/src/modules/layout/application/useRuntimeSoundPreview.ts`
- `frontend/src/modules/layout/components/WorkspaceCanvasViewport.tsx`
- `frontend/tests/unit/modules/layout/WorkspaceCanvasViewport.renderFilter.test.ts`
- `docs/loops/sounds-mode-loop.md`

Tests and Build:
- Passed: `npx vitest run tests/unit/modules/layout/WorkspaceCanvasViewport.renderFilter.test.ts tests/unit/modules/layout/useWorkspaceContextMenuActions.test.ts tests/unit/modules/layout/workspaceObjectPropertyDrafts.soundProperties.test.ts tests/unit/app/App.sound-layer-lock.test.tsx`
- Passed: `npm run build`
- Build note: Vite still reports the existing large chunk warning.

Browser QA:
- Not run. The Iteration 21 Browser/Playwright availability blocker remains.

Risks:
- This covers render-object subset gating deterministically, not a live object-preview Browser session.
- Retail-canonical sound runtime behavior remains blocked pending hard retail/runtime/capture comparison evidence.

Next Step:
- Continue with one narrow deterministic Sounds Mode boundary that does not require live Browser automation or a missing export facade. A useful next slice is sidebar selection/context-menu signal parity: extract shared visible-object resolution for sidebar select/context menu signals and verify backend-created sounds outside `renderObjectIds` cannot be selected or context-opened while metadata remains preserved.

## Iteration 30 - Backend Sounds Sidebar Select/Context Signal Parity

Scope:
- One narrow Sounds-only slice after Iteration 29: harden sidebar select/context-menu signal targeting for backend-created sound objects outside the current `renderObjectIds` subset.
- No VFX work. No heartbeat automation changes. No retail-canonical behavior claimed.

Changes:
- Added `resolveVisibleObjectForSidebarSignal(...)` as shared visible-object resolution for sidebar object signals.
- Updated `resolveVisibleObjectForPropertiesSignal(...)` to reuse the shared sidebar resolver and then enforce the requested kind.
- Updated `WorkspaceCanvasViewport` sidebar select and sidebar context-menu signal handling to use the shared resolver.
- Added focused coverage proving:
  - a backend-created sound inside the `renderObjectIds` subset resolves for sidebar select/context-menu signals;
  - a backend-created sound outside the subset does not resolve;
  - backend sound metadata in `soundPositioning.preserve.extra` remains intact for filtered-out sounds.

Files Changed:
- `frontend/src/modules/layout/application/workspaceSceneInteraction.ts`
- `frontend/src/modules/layout/components/WorkspaceCanvasViewport.tsx`
- `frontend/tests/unit/modules/layout/WorkspaceCanvasViewport.renderFilter.test.ts`
- `docs/loops/sounds-mode-loop.md`

Tests and Build:
- Passed: `npx vitest run tests/unit/modules/layout/WorkspaceCanvasViewport.renderFilter.test.ts tests/unit/modules/layout/useWorkspaceContextMenuActions.test.ts tests/unit/modules/layout/workspaceObjectPropertyDrafts.soundProperties.test.ts tests/unit/app/App.sound-layer-lock.test.tsx`
- Passed: `npm run build`
- Build note: Vite still reports the existing large chunk warning.

Browser QA:
- Not run. The Iteration 21 Browser/Playwright availability blocker remains.

Risks:
- This covers sidebar signal resolution deterministically, not a live DOM click/right-click Browser session.
- Retail-canonical sound runtime behavior remains blocked pending hard retail/runtime/capture comparison evidence.

Next Step:
- Continue with one narrow deterministic Sounds Mode boundary that does not require live Browser automation or a missing export facade. A useful next slice is additive sidebar selection parity: verify additive multi-select keeps only allowed/visible backend-created sounds when `renderObjectIds` filters the scene, while preserving backend sound metadata.

## Iteration 31 - Backend Sounds Additive Sidebar Selection Parity

Scope:
- One narrow Sounds-only slice after Iteration 30: harden additive sidebar selection for backend-created sound objects when a `renderObjectIds` subset filters the scene.
- No VFX work. No heartbeat automation changes. No retail-canonical behavior claimed.

Changes:
- Added `resolveSidebarSelectionIds(...)` so sidebar selection computes single/additive selection through the same visible-object and render-subset rules used by sound sidebar signals.
- Updated `WorkspaceCanvasViewport` sidebar select handling to use the resolver, including additive multi-select.
- Added focused coverage proving additive selection:
  - keeps visible/in-subset backend-created sounds;
  - drops existing selected backend sounds outside the current render subset;
  - preserves backend sound metadata in `soundPositioning.preserve.extra`.

Files Changed:
- `frontend/src/modules/layout/application/workspaceSceneInteraction.ts`
- `frontend/src/modules/layout/components/WorkspaceCanvasViewport.tsx`
- `frontend/tests/unit/modules/layout/WorkspaceCanvasViewport.renderFilter.test.ts`
- `docs/loops/sounds-mode-loop.md`

Tests and Build:
- Passed: `npx vitest run tests/unit/modules/layout/WorkspaceCanvasViewport.renderFilter.test.ts tests/unit/modules/layout/useWorkspaceContextMenuActions.test.ts tests/unit/modules/layout/workspaceObjectPropertyDrafts.soundProperties.test.ts tests/unit/app/App.sound-layer-lock.test.tsx`
- Passed: `npm run build`
- Build note: Vite still reports the existing large chunk warning.

Browser QA:
- Not run. The Iteration 21 Browser/Playwright availability blocker remains.

Risks:
- This covers additive sidebar selection deterministically, not a live shift/control-click Browser session.
- Retail-canonical sound runtime behavior remains blocked pending hard retail/runtime/capture comparison evidence.

Next Step:
- Continue with one narrow deterministic Sounds Mode boundary that does not require live Browser automation or a missing export facade. A useful next slice is command-driven selection parity for backend-created sounds: verify select/invert/select-same style workspace commands only operate on visible/in-subset sound objects and preserve backend sound metadata.

## Iteration 32 - Backend Sounds Command Selection Parity

Scope:
- One narrow Sounds-only slice after Iteration 31: harden command-driven selection for backend-created sound objects when a `renderObjectIds` subset filters the scene.
- No VFX work. No heartbeat automation changes. No retail-canonical behavior claimed.

Changes:
- Added command-selection helpers in `workspaceSceneInteraction.ts`:
  - `filterVisibleSelectableCommandObjects(...)`
  - `resolveSelectSameResRefObjectIds(...)`
  - `resolveInvertSelectionObjectIds(...)`
  - `resolveRadiusSelectionObjectIds(...)`
- Updated `useWorkspaceCommandSignal(...)` so `select_same_resref`, `select_invert`, and `select_radius` all operate from the same visible/selectable command object set.
- Tightened stale-selection behavior so an out-of-subset backend-created sound cannot act as the anchor for same-resref or radius selection.
- Added focused coverage proving command selection:
  - refuses to anchor same-resref selection on an out-of-subset backend sound;
  - inverts only visible/in-subset backend sounds;
  - radius-selects only from visible/in-subset backend sounds;
  - preserves backend sound metadata in `soundPositioning.preserve.extra`.

Files Changed:
- `frontend/src/modules/layout/application/workspaceSceneInteraction.ts`
- `frontend/src/modules/layout/application/useWorkspaceCommandSignal.ts`
- `frontend/tests/unit/modules/layout/WorkspaceCanvasViewport.renderFilter.test.ts`
- `docs/loops/sounds-mode-loop.md`

Tests and Build:
- Passed: `npx vitest run tests/unit/modules/layout/WorkspaceCanvasViewport.renderFilter.test.ts tests/unit/modules/layout/useWorkspaceContextMenuActions.test.ts tests/unit/modules/layout/workspaceObjectPropertyDrafts.soundProperties.test.ts tests/unit/app/App.sound-layer-lock.test.tsx`
- Passed: `npm run build`
- Build note: Vite still reports the existing large chunk warning.

Browser QA:
- Not run. The Iteration 21 Browser/Playwright availability blocker remains.

Risks:
- This covers command selection deterministically through extracted helpers and hook wiring, not live toolbar clicks.
- Retail-canonical sound runtime behavior remains blocked pending hard retail/runtime/capture comparison evidence.

Next Step:
- Continue with one narrow deterministic Sounds Mode boundary that does not require live Browser automation or a missing export facade. A useful next slice is command-action parity for copy/delete/duplicate on backend-created sounds under `renderObjectIds`: verify command actions ignore stale out-of-subset sound selections while preserving backend metadata for in-subset sounds.

## Iteration 33 - Backend Sounds Selected Action Render Subset Parity

Scope:
- One narrow Sounds-only slice after Iteration 32: harden selected-object copy/cut/delete action targeting for backend-created sound objects when a `renderObjectIds` subset filters the scene.
- No VFX work. No heartbeat automation changes. No retail-canonical behavior claimed.

Changes:
- Added `filterUnlockedVisibleSelectedObjects(...)` as a shared selected-action resolver in `workspaceSceneInteraction.ts`.
- Passed the viewport `visibleObjects` list into `useWorkspaceObjectCommands(...)`.
- Updated `copySelectedObjectsToClipboard(...)` and `deleteSelectedObjects(...)` to operate on visible selected objects instead of the full scene object list, so stale out-of-subset backend-created sounds cannot be copied, cut, or deleted through selected-object actions.
- Left explicit-source duplication/paste behavior unchanged; those paths already receive resolved source objects rather than deriving from stale selection.
- Added focused coverage proving selected-object actions:
  - keep the in-subset backend-created sound target;
  - ignore a stale out-of-subset backend-created sound selection;
  - preserve backend sound metadata in `soundPositioning.preserve.extra`.

Files Changed:
- `frontend/src/modules/layout/application/workspaceSceneInteraction.ts`
- `frontend/src/modules/layout/application/useWorkspaceObjectCommands.ts`
- `frontend/src/modules/layout/components/WorkspaceCanvasViewport.tsx`
- `frontend/tests/unit/modules/layout/WorkspaceCanvasViewport.renderFilter.test.ts`
- `docs/loops/sounds-mode-loop.md`

Tests and Build:
- Passed: `npx vitest run tests/unit/modules/layout/WorkspaceCanvasViewport.renderFilter.test.ts tests/unit/modules/layout/useWorkspaceContextMenuActions.test.ts tests/unit/modules/layout/workspaceObjectPropertyDrafts.soundProperties.test.ts tests/unit/app/App.sound-layer-lock.test.tsx`
- Passed: `npm run build`
- Build note: Vite still reports the existing large chunk warning.

Browser QA:
- Not run. The Iteration 21 Browser/Playwright availability blocker remains.

Risks:
- This covers selected-object action targeting deterministically through the shared resolver and hook wiring, not live toolbar/keyboard copy-delete interactions.
- Retail-canonical sound runtime behavior remains blocked pending hard retail/runtime/capture comparison evidence.

Next Step:
- Continue with one narrow deterministic Sounds Mode boundary that does not require live Browser automation or a missing export facade. A useful next slice is movement/keyboard nudge parity for backend-created sounds under `renderObjectIds`: verify stale out-of-subset selected sounds cannot be moved while in-subset backend sound metadata remains preserved.

## Iteration 34 - Backend Sounds Movement Render Subset Parity

Scope:
- One narrow Sounds-only slice after Iteration 33: harden movement and keyboard nudge targeting for backend-created sound objects when a `renderObjectIds` subset filters the scene.
- No VFX work. No heartbeat automation changes. No retail-canonical behavior claimed.

Changes:
- Added `resolveMovableVisibleSelection(...)` as a shared movement resolver in `workspaceSceneInteraction.ts`.
- Updated `useWorkspaceObjectCommands(...)` movement resolution to use the viewport `visibleObjects` list instead of the full scene object list.
- This keeps keyboard nudge and drag movement from moving stale out-of-subset selected backend-created sounds while preserving existing in-subset movement behavior.
- Added focused coverage proving movement:
  - keeps an in-subset backend-created sound movable;
  - treats an out-of-subset stale backend-created sound selection as empty;
  - preserves backend sound metadata in `soundPositioning.preserve.extra`.

Files Changed:
- `frontend/src/modules/layout/application/workspaceSceneInteraction.ts`
- `frontend/src/modules/layout/application/useWorkspaceObjectCommands.ts`
- `frontend/tests/unit/modules/layout/WorkspaceCanvasViewport.renderFilter.test.ts`
- `docs/loops/sounds-mode-loop.md`

Tests and Build:
- Passed: `npx vitest run tests/unit/modules/layout/WorkspaceCanvasViewport.renderFilter.test.ts tests/unit/modules/layout/useWorkspaceContextMenuActions.test.ts tests/unit/modules/layout/workspaceObjectPropertyDrafts.soundProperties.test.ts tests/unit/app/App.sound-layer-lock.test.tsx`
- Passed: `npm run build`
- Build note: Vite still reports the existing large chunk warning.

Browser QA:
- Not run. The Iteration 21 Browser/Playwright availability blocker remains.

Risks:
- This covers movement targeting deterministically through the shared resolver and hook wiring, not live drag or keyboard events.
- Retail-canonical sound runtime behavior remains blocked pending hard retail/runtime/capture comparison evidence.

Next Step:
- Continue with one narrow deterministic Sounds Mode boundary that does not require live Browser automation or a missing export facade. A useful next slice is transform-controls parity for backend-created sounds under `renderObjectIds`: verify transform-control target resolution cannot attach to stale out-of-subset selected sounds and preserves backend sound metadata.

## Iteration 35 - Backend Sounds Transform Controls Render Subset Parity

Scope:
- One narrow Sounds-only slice after Iteration 34: harden transform-control target resolution for backend-created sound objects when a `renderObjectIds` subset filters the scene.
- No VFX work. No heartbeat automation changes. No retail-canonical behavior claimed.

Changes:
- Added `resolveVisibleSelectedObjects(...)` as a shared visible-selected resolver in `workspaceSceneInteraction.ts`.
- Passed viewport `visibleObjects` into `useWorkspaceTransformControls(...)`.
- Updated transform-control attach and gesture-start selection resolution to use visible selected objects instead of the full scene object map.
- This prevents transform controls from attaching to or starting gestures on stale out-of-subset selected backend-created sounds.
- Added focused coverage proving transform target resolution:
  - keeps the in-subset backend-created sound target;
  - rejects a stale out-of-subset backend-created sound selection;
  - preserves backend sound metadata in `soundPositioning.preserve.extra`.

Files Changed:
- `frontend/src/modules/layout/application/workspaceSceneInteraction.ts`
- `frontend/src/modules/layout/application/useWorkspaceTransformControls.ts`
- `frontend/src/modules/layout/components/WorkspaceCanvasViewport.tsx`
- `frontend/tests/unit/modules/layout/WorkspaceCanvasViewport.renderFilter.test.ts`
- `docs/loops/sounds-mode-loop.md`

Tests and Build:
- Passed: `npx vitest run tests/unit/modules/layout/WorkspaceCanvasViewport.renderFilter.test.ts tests/unit/modules/layout/useWorkspaceContextMenuActions.test.ts tests/unit/modules/layout/workspaceObjectPropertyDrafts.soundProperties.test.ts tests/unit/app/App.sound-layer-lock.test.tsx`
- Passed: `npm run build`
- Build note: Vite still reports the existing large chunk warning.

Browser QA:
- Not run. The Iteration 21 Browser/Playwright availability blocker remains.

Risks:
- This covers transform-control targeting deterministically through resolver and hook wiring, not a live gizmo attach/drag Browser session.
- Retail-canonical sound runtime behavior remains blocked pending hard retail/runtime/capture comparison evidence.

Next Step:
- Continue with one narrow deterministic Sounds Mode boundary that does not require live Browser automation or a missing export facade. A useful next slice is selected-object dialog lifecycle parity for backend-created sounds under `renderObjectIds`: verify stale out-of-subset selected sounds cannot keep object dialogs/overlays active while in-subset backend sound metadata remains preserved.

## Iteration 36 - Backend Sounds Dialog Lifecycle Render Subset Parity

Scope:
- One narrow Sounds-only slice after Iteration 35: harden selected-object dialog and overlay lifecycle for backend-created sound objects when a `renderObjectIds` subset filters the scene.
- No VFX work. No heartbeat automation changes. No retail-canonical behavior claimed.

Changes:
- Added `reconcileAdjustLocationDialogWithScene(...)` in `useWorkspaceObjectDialogEffects.ts`.
- Updated Adjust Location dialog reconciliation to close when any target object is outside the visible render subset, matching the existing Sound Properties visible-object guard.
- Updated the viewport transform/overlay selected-object summary path to use `resolveVisibleSelectedObjects(...)`, so stale out-of-subset selected backend-created sounds do not keep overlay state active between cleanup ticks.
- Added focused coverage proving Adjust Location lifecycle:
  - closes when a backend-created sound is hidden/outside the render subset;
  - refreshes when the backend-created sound remains visible;
  - preserves backend sound metadata in `soundPositioning.preserve.extra`.

Files Changed:
- `frontend/src/modules/layout/application/useWorkspaceObjectDialogEffects.ts`
- `frontend/src/modules/layout/components/WorkspaceCanvasViewport.tsx`
- `frontend/tests/unit/modules/layout/workspaceObjectPropertyDrafts.soundProperties.test.ts`
- `docs/loops/sounds-mode-loop.md`

Tests and Build:
- Passed: `npx vitest run tests/unit/modules/layout/WorkspaceCanvasViewport.renderFilter.test.ts tests/unit/modules/layout/useWorkspaceContextMenuActions.test.ts tests/unit/modules/layout/workspaceObjectPropertyDrafts.soundProperties.test.ts tests/unit/app/App.sound-layer-lock.test.tsx`
- Passed: `npm run build`
- Build note: Vite still reports the existing large chunk warning.

Browser QA:
- Not run. The Iteration 21 Browser/Playwright availability blocker remains.

Risks:
- This covers dialog lifecycle deterministically through reconciler/helpers and viewport wiring, not a live dialog Browser session.
- Retail-canonical sound runtime behavior remains blocked pending hard retail/runtime/capture comparison evidence.

Next Step:
- Continue with one narrow deterministic Sounds Mode boundary that does not require live Browser automation or a missing export facade. A useful next slice is selected object count/selection snapshot parity for backend-created sounds under `renderObjectIds`: verify parent/list snapshots and HUD counts cannot report stale out-of-subset backend sounds after visibility cleanup while metadata remains preserved.

## Iteration 37 - Backend Sounds Selection Snapshot Render Subset Parity

Scope:
- One narrow Sounds-only slice after Iteration 36: harden selected-object count and parent/list selection snapshots for backend-created sound objects when a `renderObjectIds` subset filters the scene.
- No VFX work. No heartbeat automation changes. No retail-canonical behavior claimed.

Changes:
- Moved `onSelectionSnapshotChange(...)` reporting to use a filtered visible/selectable selected ID list instead of raw `selectedObjectIds`.
- Updated keyboard action enablement count to use the same visible/selectable selected ID list.
- Updated the HUD selected-object summary count to use the same visible/selectable selected ID list.
- Added focused coverage proving selection snapshots:
  - keep the in-subset backend-created sound selected;
  - omit a stale out-of-subset backend-created sound;
  - preserve backend sound metadata in `soundPositioning.preserve.extra`.

Files Changed:
- `frontend/src/modules/layout/components/WorkspaceCanvasViewport.tsx`
- `frontend/tests/unit/modules/layout/WorkspaceCanvasViewport.renderFilter.test.ts`
- `docs/loops/sounds-mode-loop.md`

Tests and Build:
- Passed: `npx vitest run tests/unit/modules/layout/WorkspaceCanvasViewport.renderFilter.test.ts tests/unit/modules/layout/useWorkspaceContextMenuActions.test.ts tests/unit/modules/layout/workspaceObjectPropertyDrafts.soundProperties.test.ts tests/unit/app/App.sound-layer-lock.test.tsx`
- Passed: `npm run build`
- Build note: Vite still reports the existing large chunk warning.

Browser QA:
- Not run. The Iteration 21 Browser/Playwright availability blocker remains.

Risks:
- This covers snapshot/count parity deterministically through helper and viewport wiring, not a live sidebar/list Browser session.
- Retail-canonical sound runtime behavior remains blocked pending hard retail/runtime/capture comparison evidence.

Next Step:
- Continue with one narrow deterministic Sounds Mode boundary that does not require live Browser automation or a missing export facade. A useful next slice is object-add/drop selection snapshot parity for backend-created sounds under `renderObjectIds`: verify creating a backend sound in object-preview mode selects only renderable/in-subset sound objects and does not leak stale sound selections.

## Iteration 38 - Backend Sounds Object Add Selection Render Subset Parity

Scope:
- One narrow Sounds-only slice after Iteration 37: harden object-add/drop selection behavior for backend-created sound objects when a `renderObjectIds` subset filters the scene.
- No VFX work. No heartbeat automation changes. No retail-canonical behavior claimed.

Changes:
- Added `resolveCreatedObjectSelectionIds(...)` in `workspaceSceneInteraction.ts`.
- Updated `useWorkspaceObjectAddDragDrop(...)` to select a created object only when the current render subset can actually render that object.
- This prevents dropping a backend-created sound in object-preview mode from creating stale selected IDs outside `renderObjectIds`.
- Added focused coverage proving created-object selection:
  - selects a backend-created sound on the normal full-scene canvas;
  - rejects a backend-created sound when it is outside the current render subset;
  - allows selection when the created sound ID is inside the render subset;
  - preserves backend sound metadata in `soundPositioning.preserve.extra`.

Files Changed:
- `frontend/src/modules/layout/application/workspaceSceneInteraction.ts`
- `frontend/src/modules/layout/components/useWorkspaceObjectAddDragDrop.ts`
- `frontend/tests/unit/modules/layout/WorkspaceCanvasViewport.renderFilter.test.ts`
- `docs/loops/sounds-mode-loop.md`

Tests and Build:
- Passed: `npx vitest run tests/unit/modules/layout/WorkspaceCanvasViewport.renderFilter.test.ts tests/unit/modules/layout/useWorkspaceObjectAddDragDrop.test.tsx tests/unit/modules/layout/useWorkspaceContextMenuActions.test.ts tests/unit/modules/layout/workspaceObjectPropertyDrafts.soundProperties.test.ts tests/unit/app/App.sound-layer-lock.test.tsx`
- Passed: `npm run build`
- Build note: Vite still reports the existing large chunk warning.

Browser QA:
- Not run. The Iteration 21 Browser/Playwright availability blocker remains.

Risks:
- This covers add/drop selection deterministically through helper and hook wiring, not a live drag/drop Browser session.
- Retail-canonical sound runtime behavior remains blocked pending hard retail/runtime/capture comparison evidence.

Next Step:
- Continue with one narrow deterministic Sounds Mode boundary that does not require live Browser automation or a missing export facade. A useful next slice is sidebar row/action affordance parity for backend-created sounds after object-add/drop: verify list actions and selected row snapshots cannot surface newly dropped backend sounds while they are outside `renderObjectIds`, and preserve backend sound metadata.

## Iteration 39 - Backend Sounds Sidebar Row Selection Affordance Parity

Scope:
- One narrow Sounds-only slice after Iteration 38: harden sidebar row selected-state affordances for backend-created sound objects when current list rows do not include stale selected IDs.
- No VFX work. No heartbeat automation changes. No retail-canonical behavior claimed.

Changes:
- Updated `SceneObjectListPanel` to derive selected row state from IDs that exist in the current filtered row set.
- This prevents stale selected IDs for backend-created sounds outside the current render/list subset from marking unrelated visible sound rows as selected.
- Added focused coverage proving:
  - a visible backend-created sound row is not marked selected by an out-of-subset selected sound ID;
  - backend sound metadata in `soundPositioning.preserve.extra` remains preserved.

Files Changed:
- `frontend/src/modules/layout/components/SceneObjectListPanel.tsx`
- `frontend/tests/unit/modules/layout/SceneObjectListPanel.test.tsx`
- `docs/loops/sounds-mode-loop.md`

Tests and Build:
- Passed: `npx vitest run tests/unit/modules/layout/SceneObjectListPanel.test.tsx tests/unit/modules/layout/WorkspaceCanvasViewport.renderFilter.test.ts tests/unit/modules/layout/useWorkspaceObjectAddDragDrop.test.tsx tests/unit/modules/layout/useWorkspaceContextMenuActions.test.ts tests/unit/modules/layout/workspaceObjectPropertyDrafts.soundProperties.test.ts tests/unit/app/App.sound-layer-lock.test.tsx`
- Passed: `npm run build`
- Build note: Vite still reports the existing large chunk warning.

Browser QA:
- Not run. The Iteration 21 Browser/Playwright availability blocker remains.

Risks:
- This covers list row selection affordance deterministically through component tests, not a live sidebar Browser session.
- Retail-canonical sound runtime behavior remains blocked pending hard retail/runtime/capture comparison evidence.

Next Step:
- Continue with one narrow deterministic Sounds Mode boundary that does not require live Browser automation or a missing export facade. A useful next slice is context-menu object lookup parity for backend-created sounds under `renderObjectIds`: verify rendered context menu headers/actions cannot resolve stale out-of-subset backend sounds after signal/state changes, while metadata remains preserved.

## Iteration 40 - Backend Sounds Context Menu Render Subset Parity

Scope:
- One narrow Sounds-only slice after Iteration 39: harden rendered context-menu object lookup for backend-created sound objects when a `renderObjectIds` subset filters the scene.
- No VFX work. No heartbeat automation changes. No retail-canonical behavior claimed.

Changes:
- Updated `WorkspaceCanvasViewport` rendered context menu lookup to use `resolveContextMenuActionObject(...)`.
- This aligns context menu headers/properties affordance state with the existing action-handler visibility guard, so stale out-of-subset backend-created sounds cannot resolve as rendered context menu objects.
- Added focused coverage proving:
  - a context menu pointed at an out-of-subset backend-created sound resolves to null even when another sound remains visible;
  - backend sound metadata in `soundPositioning.preserve.extra` remains preserved.

Files Changed:
- `frontend/src/modules/layout/components/WorkspaceCanvasViewport.tsx`
- `frontend/tests/unit/modules/layout/useWorkspaceContextMenuActions.test.ts`
- `docs/loops/sounds-mode-loop.md`

Tests and Build:
- Passed: `npx vitest run tests/unit/modules/layout/useWorkspaceContextMenuActions.test.ts tests/unit/modules/layout/SceneObjectListPanel.test.tsx tests/unit/modules/layout/WorkspaceCanvasViewport.renderFilter.test.ts tests/unit/modules/layout/useWorkspaceObjectAddDragDrop.test.tsx tests/unit/modules/layout/workspaceObjectPropertyDrafts.soundProperties.test.ts tests/unit/app/App.sound-layer-lock.test.tsx`
- Passed: `npm run build`
- Build note: Vite still reports the existing large chunk warning.

Browser QA:
- Not run. The Iteration 21 Browser/Playwright availability blocker remains.

Risks:
- This covers context menu lookup deterministically through resolver tests and viewport wiring, not a live right-click Browser session.
- Retail-canonical sound runtime behavior remains blocked pending hard retail/runtime/capture comparison evidence.

Next Step:
- Continue with one narrow deterministic Sounds Mode boundary that does not require live Browser automation or a missing export facade. A useful next slice is anchored overlay/dialog sync parity for backend-created sounds under `renderObjectIds`: verify stale out-of-subset sound context/property anchors do not keep overlays positioned after visibility changes, while metadata remains preserved.

## Iteration 41 - Backend Sounds Anchored Dialog Render Subset Parity

Scope:
- One narrow Sounds-only slice after Iteration 40: harden anchored dialog target lookup for backend-created sound objects when a `renderObjectIds` subset filters the scene.
- No VFX work. No heartbeat automation changes. No retail-canonical behavior claimed.

Changes:
- Added `resolveAnchoredDialogTargetObject(...)` in `useWorkspaceDialogLifecycle.ts`.
- Updated `useAnchoredObjectDialogSync(...)` to close anchored dialogs when the target object is outside `visibleObjectIdsSet`.
- Passed `visibleObjectIdsSet` into all anchored object dialog sync call sites from `WorkspaceCanvasViewport`; this includes Sound Properties and keeps dialog anchoring behavior consistent with context menus.
- Added focused coverage proving:
  - stale out-of-subset backend-created sound dialog anchors resolve to null;
  - visible backend-created sound dialog anchors still resolve;
  - backend sound metadata in `soundPositioning.preserve.extra` remains preserved.

Files Changed:
- `frontend/src/modules/layout/application/useWorkspaceDialogLifecycle.ts`
- `frontend/src/modules/layout/components/WorkspaceCanvasViewport.tsx`
- `frontend/tests/unit/modules/layout/useWorkspaceContextMenuActions.test.ts`
- `docs/loops/sounds-mode-loop.md`

Tests and Build:
- Passed: `npx vitest run tests/unit/modules/layout/useWorkspaceContextMenuActions.test.ts tests/unit/modules/layout/SceneObjectListPanel.test.tsx tests/unit/modules/layout/WorkspaceCanvasViewport.renderFilter.test.ts tests/unit/modules/layout/useWorkspaceObjectAddDragDrop.test.tsx tests/unit/modules/layout/workspaceObjectPropertyDrafts.soundProperties.test.ts tests/unit/app/App.sound-layer-lock.test.tsx`
- Passed: `npm run build`
- Build note: Vite still reports the existing large chunk warning.

Browser QA:
- Not run. The Iteration 21 Browser/Playwright availability blocker remains.

Risks:
- This covers anchored dialog lookup deterministically through resolver tests and hook wiring, not a live anchored dialog Browser session.
- Retail-canonical sound runtime behavior remains blocked pending hard retail/runtime/capture comparison evidence.

Next Step:
- Continue with one narrow deterministic Sounds Mode boundary that does not require live Browser automation or a missing export facade. A useful next slice is anchored context menu selected-target parity for multi-selected backend sounds: verify context menu Adjust Location only includes visible/in-subset selected sound targets and preserves backend metadata.

## Iteration 42 - Backend Sounds Context Menu Adjust Location Target Parity

Scope:
- One narrow Sounds-only slice after Iteration 41: harden context-menu Adjust Location target resolution for multi-selected backend-created sound objects when a `renderObjectIds` subset filters the scene.
- No VFX work. No heartbeat automation changes. No retail-canonical behavior claimed.

Changes:
- Added `resolveContextMenuAdjustLocationTargets(...)` in `useWorkspaceContextMenuActions.ts`.
- Updated context-menu Adjust Location handling to build multi-selected targets only from visible/in-subset selected objects.
- This prevents stale out-of-subset backend-created sounds from being included in Adjust Location dialogs opened from a visible context-menu sound.
- Added focused coverage proving:
  - stale out-of-subset backend-created sound selections are excluded from Adjust Location targets;
  - visible multi-selected backend-created sounds remain grouped together;
  - backend sound metadata in `soundPositioning.preserve.extra` remains preserved.

Files Changed:
- `frontend/src/modules/layout/application/useWorkspaceContextMenuActions.ts`
- `frontend/tests/unit/modules/layout/useWorkspaceContextMenuActions.test.ts`
- `docs/loops/sounds-mode-loop.md`

Tests and Build:
- Passed: `npx vitest run tests/unit/modules/layout/useWorkspaceContextMenuActions.test.ts tests/unit/modules/layout/SceneObjectListPanel.test.tsx tests/unit/modules/layout/WorkspaceCanvasViewport.renderFilter.test.ts tests/unit/modules/layout/useWorkspaceObjectAddDragDrop.test.tsx tests/unit/modules/layout/workspaceObjectPropertyDrafts.soundProperties.test.ts tests/unit/app/App.sound-layer-lock.test.tsx`
- Passed: `npm run build`
- Build note: Vite still reports the existing large chunk warning.

Browser QA:
- Not run. The Iteration 21 Browser/Playwright availability blocker remains.

Risks:
- This covers Adjust Location target resolution deterministically through resolver tests and action-handler wiring, not a live context-menu Browser session.
- Retail-canonical sound runtime behavior remains blocked pending hard retail/runtime/capture comparison evidence.

Next Step:
- Continue with one narrow deterministic Sounds Mode boundary that does not require live Browser automation or a missing export facade. A useful next slice is context-menu duplicate parity for backend-created sounds under `renderObjectIds`: verify duplicate from context menu only uses visible/in-subset context objects and preserves backend sound metadata.

## Iteration 43 - Backend Sounds Context Menu Duplicate Source Parity

Scope:
- One narrow Sounds-only slice after Iteration 42: harden context-menu duplicate source resolution for backend-created sound objects when a `renderObjectIds` subset filters the scene.
- No VFX work. No heartbeat automation changes. No retail-canonical behavior claimed.

Changes:
- Added `resolveContextMenuDuplicateSourceObjects(...)` in `useWorkspaceContextMenuActions.ts`.
- Updated context-menu Duplicate handling to use the explicit visible/in-subset duplicate source resolver.
- This makes duplicate behavior contractually aligned with context-menu action lookup: out-of-subset backend-created sounds cannot be duplicate sources.
- Added focused coverage proving:
  - stale out-of-subset backend-created sound context objects produce no duplicate source;
  - visible backend-created sound context objects remain duplicate sources;
  - backend sound metadata in `soundPositioning.preserve.extra` remains preserved.

Files Changed:
- `frontend/src/modules/layout/application/useWorkspaceContextMenuActions.ts`
- `frontend/tests/unit/modules/layout/useWorkspaceContextMenuActions.test.ts`
- `docs/loops/sounds-mode-loop.md`

Tests and Build:
- Passed: `npx vitest run tests/unit/modules/layout/useWorkspaceContextMenuActions.test.ts tests/unit/modules/layout/SceneObjectListPanel.test.tsx tests/unit/modules/layout/WorkspaceCanvasViewport.renderFilter.test.ts tests/unit/modules/layout/useWorkspaceObjectAddDragDrop.test.tsx tests/unit/modules/layout/workspaceObjectPropertyDrafts.soundProperties.test.ts tests/unit/app/App.sound-layer-lock.test.tsx`
- Passed: `npm run build`
- Build note: Vite still reports the existing large chunk warning.

Browser QA:
- Not run. The Iteration 21 Browser/Playwright availability blocker remains.

Risks:
- This covers duplicate source resolution deterministically through resolver tests and action-handler wiring, not a live context-menu Browser session.
- Retail-canonical sound runtime behavior remains blocked pending hard retail/runtime/capture comparison evidence.

Next Step:
- Continue with one narrow deterministic Sounds Mode boundary that does not require live Browser automation or a missing export facade. A useful next slice is context-menu delete parity for backend-created sounds under `renderObjectIds`: verify delete from context menu only targets visible/in-subset context objects and cannot delete stale out-of-subset backend sounds while metadata remains preserved for non-targets.

## Iteration 44 - Backend Sounds Context Menu Delete Target Parity

Scope:
- One narrow Sounds-only slice after Iteration 43: harden context-menu delete target resolution for backend-created sound objects when a `renderObjectIds` subset filters the scene.
- No VFX work. No heartbeat automation changes. No retail-canonical behavior claimed.

Changes:
- Added `resolveContextMenuDeleteTargetObject(...)` in `useWorkspaceContextMenuActions.ts`.
- Updated context-menu Delete handling to delete only the explicit visible/in-subset target object.
- This prevents stale out-of-subset backend-created sound context objects from being deleted through context-menu state drift.
- Added focused coverage proving:
  - stale out-of-subset backend-created sound context objects are rejected as delete targets;
  - visible backend-created sound context objects remain delete targets;
  - backend sound metadata in `soundPositioning.preserve.extra` remains preserved for rejected non-targets.

Files Changed:
- `frontend/src/modules/layout/application/useWorkspaceContextMenuActions.ts`
- `frontend/tests/unit/modules/layout/useWorkspaceContextMenuActions.test.ts`
- `docs/loops/sounds-mode-loop.md`

Tests and Build:
- Passed: `npx vitest run tests/unit/modules/layout/useWorkspaceContextMenuActions.test.ts tests/unit/modules/layout/SceneObjectListPanel.test.tsx tests/unit/modules/layout/WorkspaceCanvasViewport.renderFilter.test.ts tests/unit/modules/layout/useWorkspaceObjectAddDragDrop.test.tsx tests/unit/modules/layout/workspaceObjectPropertyDrafts.soundProperties.test.ts tests/unit/app/App.sound-layer-lock.test.tsx`
- Passed: `npm run build`
- Build note: Vite still reports the existing large chunk warning.

Browser QA:
- Not run. The Iteration 21 Browser/Playwright availability blocker remains.

Risks:
- This covers delete target resolution deterministically through resolver tests and action-handler wiring, not a live context-menu Browser session.
- Retail-canonical sound runtime behavior remains blocked pending hard retail/runtime/capture comparison evidence.

Next Step:
- Continue with one narrow deterministic Sounds Mode boundary that does not require live Browser automation or a missing export facade. A useful next slice is context-menu focus/copy-position parity for backend-created sounds under `renderObjectIds`: verify those read-only actions only resolve visible/in-subset context objects and preserve backend metadata for stale non-targets.

## Iteration 45 - Backend Sounds Context Menu Read-Only Target Parity

Scope:
- One narrow Sounds-only slice after Iteration 44: harden context-menu focus/copy-position target resolution for backend-created sound objects when a `renderObjectIds` subset filters the scene.
- No VFX work. No heartbeat automation changes. No retail-canonical behavior claimed.

Changes:
- Added `resolveContextMenuReadOnlyTargetObject(...)` in `useWorkspaceContextMenuActions.ts`.
- Updated context-menu Focus and Copy World Position handling to use the explicit visible/in-subset read-only target resolver.
- This prevents stale out-of-subset backend-created sound context objects from being used for read-only context-menu actions through state drift.
- Added focused coverage proving:
  - stale out-of-subset backend-created sound context objects are rejected as read-only targets;
  - visible backend-created sound context objects remain read-only targets;
  - backend sound metadata in `soundPositioning.preserve.extra` remains preserved for stale non-targets.

Files Changed:
- `frontend/src/modules/layout/application/useWorkspaceContextMenuActions.ts`
- `frontend/tests/unit/modules/layout/useWorkspaceContextMenuActions.test.ts`
- `docs/loops/sounds-mode-loop.md`

Tests and Build:
- Passed: `npx vitest run tests/unit/modules/layout/useWorkspaceContextMenuActions.test.ts tests/unit/modules/layout/SceneObjectListPanel.test.tsx tests/unit/modules/layout/WorkspaceCanvasViewport.renderFilter.test.ts tests/unit/modules/layout/useWorkspaceObjectAddDragDrop.test.tsx tests/unit/modules/layout/workspaceObjectPropertyDrafts.soundProperties.test.ts tests/unit/app/App.sound-layer-lock.test.tsx`
- Passed: `npm run build`
- Build note: Vite still reports the existing large chunk warning.

Browser QA:
- Not run. The Iteration 21 Browser/Playwright availability blocker remains.

Risks:
- This covers read-only context-menu target resolution deterministically through resolver tests and action-handler wiring, not a live context-menu Browser session.
- Retail-canonical sound runtime behavior remains blocked pending hard retail/runtime/capture comparison evidence.

Next Step:
- Continue with one narrow deterministic Sounds Mode boundary that does not require live Browser automation or a missing export facade. A useful next slice is context-menu reset-transform parity for backend-created sounds under `renderObjectIds`: verify reset transform only resolves visible/in-subset context objects and preserves backend metadata for stale non-targets.

## Iteration 46 - Backend Sounds Context Menu Reset Transform Target Parity

Scope:
- One narrow Sounds-only slice after Iteration 45: harden context-menu reset-transform target resolution for backend-created sound objects when a `renderObjectIds` subset filters the scene.
- No VFX work. No heartbeat automation changes. No retail-canonical behavior claimed.

Changes:
- Added `resolveContextMenuResetTransformTargetObject(...)` in `useWorkspaceContextMenuActions.ts`.
- Updated context-menu Reset Transform handling to use the explicit visible/in-subset reset target resolver.
- This prevents stale out-of-subset backend-created sound context objects from being used for reset-transform actions through state drift.
- Added focused coverage proving:
  - stale out-of-subset backend-created sound context objects are rejected as reset-transform targets;
  - visible backend-created sound context objects remain reset-transform targets;
  - backend sound metadata in `soundPositioning.preserve.extra` remains preserved for stale non-targets.

Files Changed:
- `frontend/src/modules/layout/application/useWorkspaceContextMenuActions.ts`
- `frontend/tests/unit/modules/layout/useWorkspaceContextMenuActions.test.ts`
- `docs/loops/sounds-mode-loop.md`

Tests and Build:
- Passed: `npx vitest run tests/unit/modules/layout/useWorkspaceContextMenuActions.test.ts tests/unit/modules/layout/SceneObjectListPanel.test.tsx tests/unit/modules/layout/WorkspaceCanvasViewport.renderFilter.test.ts tests/unit/modules/layout/useWorkspaceObjectAddDragDrop.test.tsx tests/unit/modules/layout/workspaceObjectPropertyDrafts.soundProperties.test.ts tests/unit/app/App.sound-layer-lock.test.tsx`
- Passed: `npm run build`
- Build note: Vite still reports the existing large chunk warning.

Browser QA:
- Not run. The Iteration 21 Browser/Playwright availability blocker remains.

Risks:
- This covers reset-transform context-menu target resolution deterministically through resolver tests and action-handler wiring, not a live context-menu Browser session.
- Retail-canonical sound runtime behavior remains blocked pending hard retail/runtime/capture comparison evidence.

Next Step:
- Continue with one narrow deterministic Sounds Mode boundary that does not require live Browser automation or a missing export facade. A useful next slice is to consolidate context-menu visible target resolvers for backend-created sounds to reduce duplication while preserving the existing tested contracts.

## Iteration 47 - Backend Sounds Context Menu Target Resolver Consolidation

Scope:
- One narrow Sounds-only slice after Iteration 46: consolidate context-menu visible target resolution for backend-created sound actions while preserving existing contracts.
- No VFX work. No heartbeat automation changes. No retail-canonical behavior claimed.

Changes:
- Added `resolveVisibleContextMenuTargetObject` as the shared exported resolver for visible/in-subset context menu targets.
- Repointed delete, read-only, and reset-transform resolver exports to the shared visible target resolver.
- Left action-specific exports intact so existing call sites/tests keep their explicit intent while avoiding duplicate resolver bodies.
- Added focused coverage proving the shared resolver:
  - rejects stale out-of-subset backend-created sound context objects;
  - resolves visible backend-created sound context objects;
  - preserves backend sound metadata in `soundPositioning.preserve.extra`.

Files Changed:
- `frontend/src/modules/layout/application/useWorkspaceContextMenuActions.ts`
- `frontend/tests/unit/modules/layout/useWorkspaceContextMenuActions.test.ts`
- `docs/loops/sounds-mode-loop.md`

Tests and Build:
- Passed: `npx vitest run tests/unit/modules/layout/useWorkspaceContextMenuActions.test.ts tests/unit/modules/layout/SceneObjectListPanel.test.tsx tests/unit/modules/layout/WorkspaceCanvasViewport.renderFilter.test.ts tests/unit/modules/layout/useWorkspaceObjectAddDragDrop.test.tsx tests/unit/modules/layout/workspaceObjectPropertyDrafts.soundProperties.test.ts tests/unit/app/App.sound-layer-lock.test.tsx`
- Build not run this cycle; scope was resolver consolidation only, and Iteration 46 already built the same runtime action surface.

Browser QA:
- Not run. The Iteration 21 Browser/Playwright availability blocker remains.

Risks:
- This covers resolver consolidation deterministically through unit tests, not a live context-menu Browser session.
- Retail-canonical sound runtime behavior remains blocked pending hard retail/runtime/capture comparison evidence.

Next Step:
- Continue with one narrow deterministic Sounds Mode boundary that does not require live Browser automation or a missing export facade. A useful next slice is to audit whether any remaining non-context-menu selected-object paths still resolve backend-created sounds from full scene state instead of visible/in-subset state, and either patch one concrete path or record a specific blocker if none remain.

## Iteration 48 - Backend Sounds Anchored Dialog Drag Target Parity

Scope:
- One narrow Sounds-only slice after Iteration 47: audit non-context-menu selected-object paths for backend-created sounds under `renderObjectIds`.
- Patched the concrete remaining full-scene lookup found in anchored properties dialog drag positioning.
- No VFX work. No heartbeat automation changes. No retail-canonical behavior claimed.

Changes:
- Added/used `resolveAnchoredDialogDragTargetObject(...)` as the visible/in-subset resolver for anchored dialog drag targets.
- Updated `WorkspaceCanvasViewport` dialog drag mapping so recomputing anchor offsets for properties dialogs no longer resolves hidden or stale out-of-subset backend-created sounds from full `scene.objects`.
- Added focused coverage proving:
  - stale out-of-subset backend-created sound drag anchors resolve to `null`;
  - visible backend-created sound drag anchors resolve normally;
  - backend sound metadata in `soundPositioning.preserve.extra` remains preserved.

Files Changed:
- `frontend/src/modules/layout/application/useWorkspaceDialogLifecycle.ts`
- `frontend/src/modules/layout/components/WorkspaceCanvasViewport.tsx`
- `frontend/tests/unit/modules/layout/useWorkspaceContextMenuActions.test.ts`
- `docs/loops/sounds-mode-loop.md`

Tests and Build:
- Passed: `npx vitest run tests/unit/modules/layout/useWorkspaceContextMenuActions.test.ts tests/unit/modules/layout/SceneObjectListPanel.test.tsx tests/unit/modules/layout/WorkspaceCanvasViewport.renderFilter.test.ts tests/unit/modules/layout/useWorkspaceObjectAddDragDrop.test.tsx tests/unit/modules/layout/workspaceObjectPropertyDrafts.soundProperties.test.ts tests/unit/app/App.sound-layer-lock.test.tsx`
- Passed: `npm run build`
- Build note: Vite still reports the existing large chunk warning.

Browser QA:
- Not run. The Iteration 21 Browser/Playwright availability blocker remains.

Risks:
- This covers anchored dialog drag target resolution deterministically through resolver tests and runtime wiring, not a live Browser drag session.
- Retail-canonical sound runtime behavior remains blocked pending hard retail/runtime/capture comparison evidence.

Next Step:
- Continue with one narrow deterministic Sounds Mode boundary that does not require live Browser automation or a missing export facade. A useful next slice is to audit object-command/property signal paths that open backend-created sounds from selection state, patch one visible/in-subset resolver gap if present, or record a specific blocker if the remaining paths are already gated.

## Iteration 49 - Backend Sounds Property Command Path Audit

Scope:
- One narrow Sounds-only slice after Iteration 48: audit non-context-menu object-command and property-signal paths that can open or keep a backend-created sound selected/open under `renderObjectIds`.
- No VFX work. No heartbeat automation changes. No retail-canonical behavior claimed.

Audit Result:
- No new code patch was warranted in this slice.
- `WorkspaceCanvasViewport` already routes sidebar Properties actions through `resolveVisibleObjectForPropertiesSignal(...)`, which rejects hidden/out-of-subset backend-created sounds before selecting or opening `SoundPropertiesDialog`.
- `useWorkspaceCommandSignal` selection commands use `filterVisibleSelectableCommandObjects(...)` over `visibleObjects`, so same-resref/invert/radius command selection cannot anchor on backend sounds outside the visible subset.
- `useWorkspaceObjectDialogEffects` already reconciles `SoundPropertiesDialog` through `reconcileSoundPropertiesDialogWithScene(...)`, including `visibleObjectIdsSet`, so a sound properties dialog closes when the backend-created sound leaves the visible render subset.
- Existing focused coverage already pins these audited contracts:
  - sidebar properties render-subset gating in `WorkspaceCanvasViewport.renderFilter.test.ts`;
  - hidden sound dialog close and visible sound metadata refresh in `workspaceObjectPropertyDrafts.soundProperties.test.ts`;
  - anchored dialog drag parity in `useWorkspaceContextMenuActions.test.ts` from Iteration 48.

Files Changed:
- `docs/loops/sounds-mode-loop.md`

Tests and Build:
- Not run this cycle; no runtime or test code changed. Iteration 48 passed the focused Sounds Mode guard suite and `npm run build` for the same property/dialog surface.

Browser QA:
- Not run. The Iteration 21 Browser/Playwright availability blocker remains.

Blocker:
- For this specific audited boundary, no remaining concrete property/command open path was found that still resolves backend-created sounds from full scene state instead of visible/in-subset state.
- Further live end-to-end confidence for property opening/dragging still needs Browser/Playwright automation or an equivalent app harness, which remains unavailable in this worker session.

Next Step:
- Continue with one narrow deterministic Sounds Mode boundary that does not require live Browser automation or a missing export facade. A useful next slice is to audit keyboard movement/transform-control selected-object paths for backend-created sounds under `renderObjectIds`, patch one visible/in-subset resolver gap if present, or record a specific blocker if the remaining paths are already gated.

## Iteration 50 - Backend Sounds Keyboard Movement and Transform Target Audit

Scope:
- One narrow Sounds-only slice after Iteration 49: audit keyboard movement and transform-control selected-object paths for backend-created sounds under `renderObjectIds`.
- No VFX work. No heartbeat automation changes. No retail-canonical behavior claimed.

Audit Result:
- No new code patch was warranted in this slice.
- Keyboard movement flows through `useWorkspaceObjectCommands.moveSelectedObjectsByDelta(...)`, which resolves targets with `resolveMovableVisibleSelection(...)` over `visibleObjects`; stale backend-created sounds outside the current render subset are not movable targets.
- Transform-control attach/start flows through `resolveVisibleSelectedObjects(...)` over `visibleObjects`; stale backend-created sounds outside the current render subset are not transform-control targets.
- Existing focused coverage already pins these contracts in `WorkspaceCanvasViewport.renderFilter.test.ts`:
  - `keeps sound movement limited to visible render subset objects`;
  - `keeps transform-control sound targets limited to visible render subset objects`;
  - backend sound metadata in `soundPositioning.preserve.extra` remains preserved for stale non-targets.

Files Changed:
- `docs/loops/sounds-mode-loop.md`

Tests and Build:
- Passed: `npx vitest run tests/unit/modules/layout/WorkspaceCanvasViewport.renderFilter.test.ts`
- Build not run this cycle; no runtime or test code changed.

Browser QA:
- Not run. The Iteration 21 Browser/Playwright availability blocker remains.

Blocker:
- For this specific audited boundary, no remaining concrete keyboard movement or transform-control selected-object path was found that still resolves backend-created sounds from full scene state instead of visible/in-subset state.
- Further live transform/keyboard confidence still needs Browser/Playwright automation or an equivalent app harness, which remains unavailable in this worker session.

Next Step:
- Continue with one narrow deterministic Sounds Mode boundary that does not require live Browser automation or a missing export facade. A useful next slice is to audit copy/cut/paste/duplicate command paths for backend-created sounds under `renderObjectIds`, patch one visible/in-subset resolver gap if present, or record a specific blocker if the remaining paths are already gated.

## Iteration 51 - Backend Sounds Clipboard and Duplicate Command Audit

Scope:
- One narrow Sounds-only slice after Iteration 50: audit copy/cut/paste/duplicate command paths for backend-created sounds under `renderObjectIds`.
- No VFX work. No heartbeat automation changes. No retail-canonical behavior claimed.

Audit Result:
- No new code patch was warranted in this slice.
- `copySelectedObjectsToClipboard(...)` resolves sources through `getUnlockedSelectedObjects(visibleObjects)`, which delegates to `filterUnlockedVisibleSelectedObjects(...)`; stale backend-created sounds outside the current render subset cannot be copied.
- `cutSelectedObjectsToClipboard(...)` first uses the same visible-only copy path, then deletes through `deleteSelectedObjects(...)`, which also uses `filterUnlockedVisibleSelectedObjects(visibleObjects)`; stale backend-created sounds outside the current render subset cannot be cut/deleted by command state drift.
- `pasteClipboardObjects(...)` duplicates clipboard snapshots that were captured by the visible-only copy path and filters locked kinds before duplication.
- `duplicateObjects(...)` preserves backend sound metadata by cloning `soundPositioning.preserve.flags` and `soundPositioning.preserve.extra` onto the copied sound object while assigning distinct scene identity/tag behavior.
- Existing focused coverage already pins the visible-target side in `WorkspaceCanvasViewport.renderFilter.test.ts` via `keeps selected-object sound actions limited to visible render subset objects`, and earlier duplicate/copy coverage pins backend metadata preservation for copied sound objects.

Files Changed:
- `docs/loops/sounds-mode-loop.md`

Tests and Build:
- Passed: `npx vitest run tests/unit/modules/layout/WorkspaceCanvasViewport.renderFilter.test.ts`
- Build not run this cycle; no runtime or test code changed.

Browser QA:
- Not run. The Iteration 21 Browser/Playwright availability blocker remains.

Blocker:
- For this specific audited boundary, no remaining concrete copy/cut/paste/duplicate command path was found that still resolves backend-created sounds from full scene state instead of visible/in-subset state.
- Further live clipboard confidence still needs Browser/Playwright automation or an equivalent app harness, which remains unavailable in this worker session.

Next Step:
- Continue with one narrow deterministic Sounds Mode boundary that does not require live Browser automation or a missing export facade. A useful next slice is to audit runtime sound preview/playback eligibility for backend-created sounds under `renderObjectIds`, patch one visible/in-subset resolver gap if present, or record a specific blocker if the remaining paths are already gated.

## Iteration 52 - Backend Sounds Runtime Preview Eligibility Audit

Scope:
- One narrow Sounds-only slice after Iteration 51: audit runtime sound preview/playback eligibility for backend-created sounds under `renderObjectIds`.
- No VFX work. No heartbeat automation changes. No retail-canonical behavior claimed.

Audit Result:
- No new code patch was warranted in this slice.
- `isRuntimeSoundPreviewEligible(...)` already requires:
  - `object.kind === "sounds"`;
  - the object id is present in `renderObjectIdsSet` when a render subset is active;
  - normal object visibility and kind isolation allow sounds.
- `useRuntimeSoundPreview(...)` builds `candidateSounds` by filtering `sceneObjects` through `isRuntimeSoundPreviewEligible(...)`, then removes stale playback state, now-playing badges, and loop channels for object ids no longer in the candidate set.
- Existing focused coverage already pins this contract in `WorkspaceCanvasViewport.renderFilter.test.ts`:
  - hidden backend-created sounds are not runtime-preview eligible;
  - backend-created sounds outside `renderObjectIdsSet` are not runtime-preview eligible;
  - backend sound metadata in `soundPositioning.preserve.extra` remains preserved for stale non-targets.

Files Changed:
- `docs/loops/sounds-mode-loop.md`

Tests and Build:
- Passed: `npx vitest run tests/unit/modules/layout/WorkspaceCanvasViewport.renderFilter.test.ts`
- Build not run this cycle; no runtime or test code changed.

Browser QA:
- Not run. The Iteration 21 Browser/Playwright availability blocker remains.

Blocker:
- For this specific audited boundary, no remaining concrete runtime preview/playback eligibility path was found that still resolves backend-created sounds from full scene state instead of visible/in-subset state.
- Live audio playback confidence still needs Browser/Playwright automation or an equivalent app harness, which remains unavailable in this worker session.

Next Step:
- Continue with one narrow deterministic Sounds Mode boundary that does not require live Browser automation or a missing export facade. A useful next slice is to audit sound marker/render diagnostics and HUD snapshot paths for backend-created sounds under `renderObjectIds`, patch one visible/in-subset resolver gap if present, or record a specific blocker if the remaining paths are already gated.

## Iteration 53 - Sounds Mode Direction Reset and Audio Catalog HAK Profile Fix

Scope:
- Product-direction correction: stop the catalog-sound canvas-placement/renderObjectIds hardening chain. Sounds Mode is now treated as an audio catalog/player workflow unless the coordinator explicitly asks for area sound emitter editing.
- One narrow catalog-loading slice: audit why `/api/v1/catalog/sounds` can return too few records from local configured sources.
- No VFX work. No heartbeat automation changes. No retail-canonical behavior claimed.

Findings:
- Backend sound catalog records come from `ModuleSnapshotSoundRepository`, which indexes supported audio objects already restored into the module blob snapshot.
- Runtime cache rebuild uploads HAK sound assets from `settings.sources.sound.hakProfileId`/`hakPriorityList` through `RuntimeSettingsApplicationService.loadSourceSupplementFiles(...)`.
- Existing code defaults and unit tests already use the Aurora-first audio profile `lc_audio: ["lc_sounds.hak", "npc_sounds.hak"]`.
- The checked local runtime config had drifted to `lc_audio: ["npc_sounds.hak"]`, which limits cache rebuild/catalog restoration to the NPC HAK and explains a too-small catalog when `lc_sounds.hak` is available locally.
- Missing HAK tolerance already exists and is covered: if `lc_sounds.hak` is absent, rebuild continues to `npc_sounds.hak` instead of failing.

Changes:
- Updated `backend/config/runtime-settings.json` so `hakProfiles.lc_audio` includes both `lc_sounds.hak` and `npc_sounds.hak`, matching the code default and tested source policy.
- Added a focused config drift guard test to keep the checked runtime config aligned with the default Aurora sound catalog profile.

Files Changed:
- `backend/config/runtime-settings.json`
- `backend/test/unit/runtime-settings.config.spec.ts`
- `docs/loops/sounds-mode-loop.md`

Tests and Build:
- Passed: `npx jest --config ./jest.unit.config.js --runTestsByPath test/unit/runtime-settings.config.spec.ts test/unit/runtime-settings.application.service.spec.ts test/unit/module-snapshot-sound.repository.spec.ts`
- Build not run this cycle; backend runtime config/test-only slice.

Browser QA:
- Not run. This slice changes backend source configuration only.

Blockers / Follow-up Evidence Needed:
- The catalog count will not increase until the module blob cache is rebuilt/restored with the corrected `lc_audio` profile and `lc_sounds.hak` exists under the configured `hakDirectoryPath`.
- Vanilla audio is still not part of the sound source policy (`sources.sound.includeVanilla: false`), and runtime cache rebuild currently only restores vanilla textures/placeable assets, not vanilla audio. Completing “full available sound library” needs a separate bounded design for vanilla KEY/BIF audio discovery/extraction to avoid unsafe full-cache memory blowups.

Next Step:
- Rebuild or inspect the module blob cache with the corrected `lc_audio` profile and verify `/api/v1/catalog/sounds` count/source keys. If the count is still low, implement a bounded vanilla-audio discovery/restoration slice or record the exact missing local HAK/cache evidence.

## Iteration 54 - Sounds Catalog Source Evidence and Local Music HAK Profile

Scope:
- Continue the corrected catalog/player direction after Iteration 53.
- One narrow backend catalog-loading slice: inspect the running local cache/source state and add the locally available LC music audio HAK to the Aurora sound profile.
- No canvas placement work. No VFX work. No heartbeat automation changes. No retail-canonical behavior claimed.

Findings:
- Running services are available locally: `aurora-backend-dev`, `aurora-frontend-dev`, and `aurora-seaweedfs-dev`.
- Direct unauthenticated `/api/v1/catalog/sounds` probing returns `401`, so catalog count was inspected through the configured SeaweedFS S3 snapshot instead.
- Current module blob snapshot evidence:
  - total snapshot objects: `14273`;
  - supported audio objects: `6`;
  - audio sources: `{ "hak/npc_sounds": 6 }`;
  - sample keys include `modules/current/__aurora/sources/hak/npc_sounds/dia_hakon_add_12.wav`.
- The running backend container has the corrected `lc_audio` config mounted from `/app/config/runtime-settings.json`.
- Configured HAK directory evidence:
  - `C:/Users/enonw/Documents/Neverwinter Nights/hak/npc_sounds.hak` exists;
  - `C:/Users/enonw/Documents/Neverwinter Nights/hak/lc_sounds.hak` does not exist;
  - `lc_music.hak` exists and is a real audio source.
- Direct HAK inspection with `NwnErfPackedModuleExtractorService` found `lc_music.hak` contains `8` supported WAV assets: `port_1.wav` through `port_8.wav`.
- The current cache is stale/incomplete for the corrected available local sources because it has no `hak/lc_music` audio objects yet.

Changes:
- Expanded the default and checked `lc_audio` profile to include the available local music HAK:
  - `lc_music.hak`
  - `lc_sounds.hak`
  - `npc_sounds.hak`
- Updated the runtime-settings config drift guard test to lock the three-source audio profile.

Files Changed:
- `backend/config/runtime-settings.json`
- `backend/src/modules/runtime-settings/domain/runtime-settings.defaults.ts`
- `backend/test/unit/runtime-settings.config.spec.ts`
- `docs/loops/sounds-mode-loop.md`

Tests and Build:
- Passed: `npx jest --config ./jest.unit.config.js --runTestsByPath test/unit/runtime-settings.config.spec.ts test/unit/runtime-settings.application.service.spec.ts test/unit/module-snapshot-sound.repository.spec.ts`
- Build not run this cycle; backend config/default/test slice.

Cache / QA:
- Ran a direct SeaweedFS snapshot inspection through the configured S3 API and confirmed the cache still exposes only `6` audio objects from `npc_sounds`.
- Attempted `docker exec aurora-backend-dev sh -lc 'cd /app && npm run cache:module:sync'`; it exceeded the 180s tool timeout and did not update audio snapshot counts in the follow-up S3 inspection.
- Browser QA not run; this slice is backend source/cache evidence only.

Blockers / Follow-up Evidence Needed:
- `/api/v1/catalog/sounds` remains too small until module blob cache sync completes with the expanded `lc_audio` profile.
- `lc_sounds.hak` is not present in the configured local HAK directory, so it cannot contribute records in this environment unless the file is added.
- `lc_music.hak` is present and should contribute 8 WAV records after successful cache sync.
- Vanilla audio remains outside the current restoration policy and needs a separate bounded KEY/BIF audio discovery/restoration slice.

Next Step:
- Make module-cache sync observable and bounded for audio sources: either run cache sync with a longer/streamed command and verify `hak/lc_music` keys appear, or add a small audio-source sync/inspection script that restores/counts only configured sound HAK audio assets before rechecking `/api/v1/catalog/sounds`.

## Iteration 55 - Bounded Sound HAK Audio Sync and Playback Evidence

Scope:
- Continue corrected Sounds Mode catalog/player direction after Iteration 54.
- One narrow backend catalog-loading slice: make sound HAK cache restoration observable and bounded, without running the full module cache rebuild path.
- No canvas placement work. No VFX work. No heartbeat automation changes. No retail-canonical behavior claimed.

Changes:
- Added `backend/scripts/sync-sound-hak-audio.ts`.
- The script:
  - reads configured runtime settings;
  - resolves `sources.sound` HAK profile/priority entries in order;
  - scans configured sound HAKs one at a time;
  - filters only supported audio assets (`wav`, `ogg`, `bmu`, `mp3`);
  - supports dry-run mode by default;
  - supports `--write` to upload only sound HAK audio objects into the existing module snapshot prefix without replacing/deleting the full snapshot.
- Added focused unit coverage for the script helpers:
  - configured audio profile ordering;
  - explicit HAK priority normalization/deduplication;
  - supported audio filename filtering.

Files Changed:
- `backend/scripts/sync-sound-hak-audio.ts`
- `backend/test/unit/sync-sound-hak-audio.spec.ts`
- `docs/loops/sounds-mode-loop.md`

Local Cache / Catalog Evidence:
- Dry-run inside `aurora-backend-dev`:
  - before: `6` audio objects, `{ "hak/npc_sounds": 6 }`;
  - configured HAKs: `lc_music.hak`, `lc_sounds.hak`, `npc_sounds.hak`;
  - missing HAKs: `lc_sounds.hak`;
  - scanned HAKs: `lc_music.hak` with `8` audio files, `npc_sounds.hak` with `6` audio files.
- Write run inside `aurora-backend-dev`:
  - after: `14` audio objects, `{ "hak/lc_music": 8, "hak/npc_sounds": 6 }`.
- Backend service catalog check through `SoundsApplicationService.listSounds(...)` now returns `total: 14`, including `sound_port_1` through `sound_port_8` from `lc_music`.

Playback Pipeline Evidence:
- Processed newly synced `sound_port_1` through `SoundsApplicationService.processSound({ soundId: "sound_port_1", bypassCache: true })`.
- Verified proxy delivery contract:
  - `proxyUrl: /api/v1/catalog/sounds/cache/4fe47eeb2bad7ff80290d91ce0657cb4caf0edeed8f79a89d8d0492877a37b3f/audio`.
- Verified audio blob read:
  - object key: `modules/current/__aurora/sources/hak/lc_music/port_1.wav`;
  - content type: `audio/wav`;
  - payload size: `28078184` bytes.

Tests and Build:
- Passed: `npx jest --config ./jest.unit.config.js --runTestsByPath test/unit/sync-sound-hak-audio.spec.ts test/unit/runtime-settings.config.spec.ts`
- Passed: `npm run build`

Browser QA:
- Not run. This slice verified backend catalog and playback pipeline directly through the running app context.

Blockers / Follow-up Evidence Needed:
- `lc_sounds.hak` is still absent from the configured local HAK directory, so it cannot contribute records in this environment until the file is added.
- Vanilla audio remains outside the current restoration policy and needs a bounded KEY/BIF audio discovery/restoration slice.
- The full module-cache sync path remains too slow/noisy for this loop; the bounded audio-only script is now the practical cache restoration tool for Sounds Mode catalog work.

Next Step:
- Move back to frontend Sounds Mode catalog/player UX: remove or demote catalog-sound Place-on-canvas affordances, expose playback-first controls and audio delivery evidence for the now-expanded 14-item catalog, and add focused UI tests around Play/Stop/status/metadata behavior.

## Iteration 56 - Sounds Mode Playback-First UI Boundary

Scope:
- Continue the corrected Sounds Mode catalog/player direction after Iteration 55.
- One narrow frontend slice: remove the catalog-sound placement affordance from Sounds Mode and stop forwarding Sounds Mode catalog scope into the canvas viewport.
- No canvas-placement parity work. No VFX work. No heartbeat automation changes. No retail-canonical behavior claimed.

Changes:
- Removed the Sounds Mode row-level catalog `Place` action, so catalog sounds are selected and played from the audio library instead of placed on the canvas.
- Removed Sounds Mode preview-scene seeding from `WorkspaceMockLayout`; the mode no longer creates a sound scene object from catalog selection.
- Stopped passing a `sounds` catalog scope to `WorkspaceCanvasViewport` while in `sounds_mode`.
- Removed canvas-object metadata from the Sounds Mode inspector; the right panel remains focused on backend sound metadata (`soundId`, `resref`, category, format, spatial/playback, Aurora usage, duration).
- Updated the focused viewport-wiring regression to assert playback-first behavior: Play remains available, no Place button exists, no `sounds` catalog scope/sidebar signal reaches the viewport, no canvas object appears, and the old `sound_placed_on_canvas` telemetry is not emitted.

Files Changed:
- `frontend/src/modules/layout/components/WorkspaceMockLayout.tsx`
- `frontend/tests/unit/modules/layout/WorkspaceMockLayout.viewportWiring.test.tsx`
- `docs/loops/sounds-mode-loop.md`

Tests and Build:
- Passed: `npx vitest run tests/unit/modules/layout/WorkspaceMockLayout.viewportWiring.test.tsx tests/unit/modules/sounds/httpSoundApiPort.test.ts`
- Passed: `npm run build`
- Note: Vitest still prints existing React `act(...)` warnings in unrelated workspace layout tests; the focused assertions pass.
- Note: Vite still reports the existing large chunk-size warning after production build.

QA:
- Browser QA not run this cycle; prior live Browser automation is not currently available in this loop. This slice is covered by focused component wiring tests and a production frontend build.

Blockers / Follow-up Evidence Needed:
- `lc_sounds.hak` is still absent from the configured local HAK directory.
- Vanilla audio remains outside the bounded sound source policy and needs a separate KEY/BIF discovery/restoration design before claiming a complete vanilla-inclusive library.
- User-facing Stop/audio-delivery evidence is still thin: the existing Play/prepare flow works in tests, but the UI needs an explicit Stop/control/status pass now that placement is removed.

Next Step:
- Add a focused playback-control slice for Sounds Mode: expose a deterministic Stop control and clearer prepared/playing/audio-delivery status for selected catalog sounds, with tests around Play -> prepared/playing -> Stop and controlled fallback when browser autoplay blocks playback.

## Iteration 57 - Sounds Mode Stop Control and Playback Cleanup

Scope:
- Continue the corrected Sounds Mode catalog/player direction after Iteration 56.
- One narrow frontend playback slice: add an explicit Stop control for prepared/playing backend catalog audio.
- No canvas placement work. No VFX work. No heartbeat automation changes. No retail-canonical behavior claimed.

Changes:
- Added a row-level `Stop` button in Sounds Mode when the selected sound has a retained prepared or playing audio element.
- Wired Stop through the existing playback audio ref cleanup path:
  - pauses the audio element;
  - removes the `src`;
  - reloads the element;
  - revokes the object URL;
  - clears playback state back to idle.
- Added `ui.workspace.sounds_mode.sound_stopped` telemetry for explicit user stops.
- Kept Stop hidden during backend processing/contract/blob loading because that path does not yet have cancellable requests; this avoids promising cancellation while a backend pipeline request is in flight.
- Extended the focused playback regression to cover Play -> prepared -> Play -> playing -> Stop, including audio cleanup, URL revocation, button state, and telemetry.

Files Changed:
- `frontend/src/modules/layout/components/WorkspaceMockLayout.tsx`
- `frontend/tests/unit/modules/layout/WorkspaceMockLayout.viewportWiring.test.tsx`
- `docs/loops/sounds-mode-loop.md`

Tests and Build:
- Passed: `npx vitest run tests/unit/modules/layout/WorkspaceMockLayout.viewportWiring.test.tsx tests/unit/modules/sounds/httpSoundApiPort.test.ts`
- Passed: `npm run build`
- Note: Vitest still prints existing React `act(...)` warnings in unrelated workspace layout tests; focused assertions pass.
- Note: Vite still reports the existing large chunk-size warning after production build.

QA:
- Browser QA not run this cycle; prior live Browser automation is not currently available in this loop. This slice is covered by focused component tests and production build.

Blockers / Follow-up Evidence Needed:
- Stop is intentionally scoped to loaded audio (`prepared`/`playing`); cancellable in-flight backend processing would require an abortable sound API port contract.
- `lc_sounds.hak` is still absent from the configured local HAK directory.
- Vanilla audio remains outside the bounded sound source policy and needs a separate KEY/BIF discovery/restoration design before claiming a complete vanilla-inclusive library.

Next Step:
- Continue catalog/player completion by auditing the remaining sound-source policy gap for vanilla audio: inspect available KEY/BIF audio source access patterns and add either a bounded discovery proposal/test seam or a concrete blocker if the current backend lacks an audio-safe vanilla extraction facade.

## Iteration 58 - Vanilla Audio Discovery Seam Audit

Scope:
- Continue the corrected Sounds Mode catalog/player direction after Iteration 57.
- One narrow backend catalog-completeness slice: audit vanilla KEY/BIF audio access and add a bounded discovery seam without enabling broad vanilla audio cache upload.
- No canvas placement work. No VFX work. No heartbeat automation changes. No retail-canonical behavior claimed.

Findings:
- `sources.sound.includeVanilla` is currently `false` in both defaults and local runtime config, so the live sound catalog is expected to remain HAK/snapshot-backed only.
- The backend already has a bounded `NwnKeyBifResourceReader` used by placeable/model restoration, with `list(resourceType)` and `read(resref, resourceType)` APIs.
- That reader did not expose sound/audio resource type constants before this slice.
- Known safe audio KEY/BIF candidates for this implementation seam are WAV, BMU, and MP3. OGG remains excluded from vanilla KEY/BIF discovery until a concrete Aurora/NWN resource type is proven in the local data or retail evidence.

Changes:
- Added shared KEY/BIF audio resource type constants:
  - `WAV: 4`
  - `BMU: 8`
  - `MP3: 11`
- Extended `sync-sound-hak-audio.ts` with a read-only vanilla discovery summary:
  - reports `enabled: false` when `sources.sound.includeVanilla` is disabled;
  - resolves `nwn_base.key` / `nwn_retail.key` when enabled;
  - lists WAV/BMU/MP3 resource counts through `NwnKeyBifResourceReader.list(...)`;
  - always reports `uploadedFiles: 0` for vanilla and a blocker message when enabled, because bounded extraction/upload policy is not implemented yet.
- Added focused tests for supported audio filename filtering and the vanilla KEY/BIF audio candidate contract.

Files Changed:
- `backend/src/modules/runtime-settings/application/nwn-key-bif-resource-reader.ts`
- `backend/scripts/sync-sound-hak-audio.ts`
- `backend/test/unit/sync-sound-hak-audio.spec.ts`
- `docs/loops/sounds-mode-loop.md`

Tests and Build:
- Passed: `npx jest --config ./jest.unit.config.js --runTestsByPath test/unit/sync-sound-hak-audio.spec.ts test/unit/runtime-settings.config.spec.ts`
- Passed: `npm run build`

Runtime Dry-Run Evidence:
- Ran inside `aurora-backend-dev`: `npx ts-node scripts/sync-sound-hak-audio.ts`
- Dry-run summary:
  - `before.audioObjects: 14`
  - `bySource: { "hak/lc_music": 8, "hak/npc_sounds": 6 }`
  - configured HAKs: `lc_music.hak`, `lc_sounds.hak`, `npc_sounds.hak`
  - missing HAKs: `lc_sounds.hak`
  - `vanilla.enabled: false`
  - `vanilla.resources: []`
  - `after.audioObjects: 14`

QA:
- Browser QA not run; this slice is backend source-policy/discovery infrastructure only.

Blockers / Follow-up Evidence Needed:
- Vanilla audio is still intentionally disabled for Sounds Mode catalog loading.
- A safe upload path needs a bounded policy before setting `sources.sound.includeVanilla: true`: max resource count/size, source prefix layout, duplicate precedence against module/HAK audio, and content-type/format handling.
- `lc_sounds.hak` is still absent from the configured local HAK directory.

Next Step:
- Add a dry-run-only test/CLI option that can enable vanilla discovery from runtime settings without uploading, then run it in the local backend container to capture actual WAV/BMU/MP3 counts if the mounted `/host/nwn-game/data` KEY files are present. Only after that evidence should a bounded vanilla upload policy be implemented.

## Iteration 59 - Dry-Run Vanilla Audio Discovery Override

Scope:
- Continue the corrected Sounds Mode catalog/player direction after Iteration 58.
- One narrow backend catalog-completeness slice: add a dry-run-only way to inspect vanilla audio availability without changing runtime config or uploading vanilla audio.
- No canvas placement work. No VFX work. No heartbeat automation changes. No retail-canonical behavior claimed.

Changes:
- Added `--discover-vanilla` to `backend/scripts/sync-sound-hak-audio.ts`.
- The flag:
  - only affects the in-memory effective settings used by the script;
  - sets `sources.sound.includeVanilla` to `true` for discovery;
  - is rejected when combined with `--write`, so it cannot accidentally trigger a broad vanilla cache upload.
- Added focused helper tests proving:
  - the override enables vanilla discovery without mutating runtime settings;
  - `--discover-vanilla` plus write mode is rejected.

Files Changed:
- `backend/scripts/sync-sound-hak-audio.ts`
- `backend/test/unit/sync-sound-hak-audio.spec.ts`
- `docs/loops/sounds-mode-loop.md`

Tests and Build:
- Passed: `npx jest --config ./jest.unit.config.js --runTestsByPath test/unit/sync-sound-hak-audio.spec.ts test/unit/runtime-settings.config.spec.ts`
- Passed: `npm run build`

Runtime Dry-Run Evidence:
- Ran inside `aurora-backend-dev`: `npx ts-node scripts/sync-sound-hak-audio.ts --discover-vanilla`
- Snapshot before/after remained unchanged:
  - `audioObjects: 14`
  - `bySource: { "hak/lc_music": 8, "hak/npc_sounds": 6 }`
- Configured HAK evidence stayed the same:
  - configured HAKs: `lc_music.hak`, `lc_sounds.hak`, `npc_sounds.hak`
  - missing HAKs: `lc_sounds.hak`
- Vanilla discovery evidence:
  - `enabled: true`
  - `keyPath: /host/nwn-game/data/nwn_base.key`
  - WAV resources: `12649`
  - BMU resources: `0`
  - MP3 resources: `0`
  - `uploadedFiles: 0`
  - blocker: read-only until a bounded extraction/upload policy is implemented.

QA:
- Browser QA not run; this slice is backend source-policy/discovery infrastructure only.

Blockers / Follow-up Evidence Needed:
- The local vanilla source is real and large: `12649` WAV resources. Full upload would be unsafe/noisy without caps, source layout, dedupe precedence, and size limits.
- `lc_sounds.hak` is still absent from the configured local HAK directory.
- The catalog currently remains 14 HAK-backed sounds until a bounded vanilla ingestion policy is implemented.

Next Step:
- Implement a bounded vanilla audio dry-run manifest first: cap candidate count and total bytes, report first N WAV candidates with estimated object keys/content types, and define HAK/module precedence before any write path is allowed.

## Iteration 60 - Bounded Vanilla Audio Dry-Run Manifest

Scope:
- Continue the corrected Sounds Mode catalog/player direction after Iteration 59.
- One narrow backend catalog-completeness slice: add a bounded dry-run manifest for vanilla KEY/BIF audio candidates.
- No canvas placement work. No VFX work. No heartbeat automation changes. No retail-canonical behavior claimed.

Changes:
- Added capped vanilla dry-run manifest support to `backend/scripts/sync-sound-hak-audio.ts`.
- New CLI caps:
  - `--vanilla-manifest-limit <n>`; default `10`
  - `--vanilla-manifest-max-bytes <n>`; default `52428800`
- The manifest:
  - reads only the capped first vanilla KEY/BIF audio candidates;
  - reports normalized resref, extension, resource type, byte size, proposed snapshot object key, and content type;
  - tracks included count, total bytes, candidate-limit skips, and byte-budget skips;
  - remains dry-run/read-only and does not upload vanilla audio.
- Added focused tests for:
  - stable vanilla source object keys/content types;
  - candidate count and byte-budget caps;
  - object-key normalization.

Files Changed:
- `backend/scripts/sync-sound-hak-audio.ts`
- `backend/test/unit/sync-sound-hak-audio.spec.ts`
- `docs/loops/sounds-mode-loop.md`

Tests and Build:
- Passed: `npx jest --config ./jest.unit.config.js --runTestsByPath test/unit/sync-sound-hak-audio.spec.ts test/unit/runtime-settings.config.spec.ts`
- Passed: `npm run build`

Runtime Dry-Run Evidence:
- Ran inside `aurora-backend-dev`: `npx ts-node scripts/sync-sound-hak-audio.ts --discover-vanilla --vanilla-manifest-limit 5 --vanilla-manifest-max-bytes 2000000`
- Snapshot before/after remained unchanged:
  - `audioObjects: 14`
  - `bySource: { "hak/lc_music": 8, "hak/npc_sounds": 6 }`
- Vanilla source evidence:
  - `keyPath: /host/nwn-game/data/nwn_base.key`
  - WAV resources: `12649`
  - BMU resources: `0`
  - MP3 resources: `0`
- Dry-run manifest evidence:
  - `candidateLimit: 5`
  - `maxBytes: 2000000`
  - `includedCount: 5`
  - `totalBytes: 868652`
  - entries:
    - `al_an_bees1.wav`, `220220` bytes, `__aurora/sources/vanilla/audio/wav/al_an_bees1.wav`
    - `al_an_bugs1.wav`, `193596` bytes, `__aurora/sources/vanilla/audio/wav/al_an_bugs1.wav`
    - `al_an_chickens1.wav`, `148540` bytes, `__aurora/sources/vanilla/audio/wav/al_an_chickens1.wav`
    - `al_an_crickets1.wav`, `182332` bytes, `__aurora/sources/vanilla/audio/wav/al_an_crickets1.wav`
    - `al_an_flies1.wav`, `123964` bytes, `__aurora/sources/vanilla/audio/wav/al_an_flies1.wav`

QA:
- Browser QA not run; this slice is backend source-policy/discovery infrastructure only.

Blockers / Follow-up Evidence Needed:
- Vanilla upload remains intentionally blocked. The manifest proves local vanilla audio exists and can be read safely under caps, but write policy still needs explicit precedence and default limits.
- `lc_sounds.hak` is still absent from the configured local HAK directory.
- The live catalog remains 14 HAK-backed sounds until a bounded vanilla write/import path is added.

Next Step:
- Implement the smallest guarded vanilla audio write path in the sync script: require `--write --include-vanilla --vanilla-manifest-limit <n>` (or equivalent explicit flag), upload only manifest-included entries under the byte cap, and keep default runtime `sources.sound.includeVanilla` unchanged until the bounded write path is verified.

## Iteration 61 - Guarded Vanilla Audio Write Path

Scope:
- Continue the corrected Sounds Mode catalog/player direction after Iteration 60.
- One narrow backend catalog-completeness slice: add an explicit guarded vanilla write path that uploads only manifest-included vanilla audio entries under caps.
- No canvas placement work. No VFX work. No heartbeat automation changes. No retail-canonical behavior claimed.

Changes:
- Added `--include-vanilla` to `backend/scripts/sync-sound-hak-audio.ts`.
- Preserved `--discover-vanilla` as dry-run-only; it still rejects `--write`.
- `--write --include-vanilla` now:
  - enables vanilla source discovery in memory;
  - builds the capped manifest;
  - uploads only manifest-included vanilla entries;
  - keeps default/runtime config unchanged.
- Added content type on vanilla uploads (`audio/wav` for WAV, `audio/mpeg` for BMU/MP3).
- Added focused tests proving:
  - guarded write mode can enable vanilla in effective settings;
  - ordinary write mode leaves vanilla disabled;
  - dry-run discovery remains rejected with write mode.

Files Changed:
- `backend/scripts/sync-sound-hak-audio.ts`
- `backend/test/unit/sync-sound-hak-audio.spec.ts`
- `docs/loops/sounds-mode-loop.md`

Tests and Build:
- Passed: `npx jest --config ./jest.unit.config.js --runTestsByPath test/unit/sync-sound-hak-audio.spec.ts test/unit/runtime-settings.config.spec.ts`
- Passed: `npm run build`

Runtime Write Evidence:
- Dry-run guard command:
  - `npx ts-node scripts/sync-sound-hak-audio.ts --include-vanilla --vanilla-manifest-limit 2 --vanilla-manifest-max-bytes 500000`
  - result: `uploadedFiles: 0`, snapshot remained `14` audio objects.
- Guarded write command:
  - `npx ts-node scripts/sync-sound-hak-audio.ts --write --include-vanilla --vanilla-manifest-limit 2 --vanilla-manifest-max-bytes 500000`
  - before: `14` audio objects, `{ "hak/lc_music": 8, "hak/npc_sounds": 6 }`
  - vanilla manifest included:
    - `al_an_bees1.wav`, `220220` bytes
    - `al_an_bugs1.wav`, `193596` bytes
  - vanilla uploaded files: `2`
  - after: `16` audio objects, `{ "hak/lc_music": 8, "hak/npc_sounds": 6, "vanilla": 2 }`

Catalog / Blob Evidence:
- One-off repository check through `ModuleSnapshotSoundRepository` returned `total: 16`.
- First catalog entries now include:
  - `sound_al_an_bees1`
  - `sound_al_an_bugs1`
  - existing HAK-backed `sound_dia_hakon_add_12` / `sound_port_*`.
- Blob check for `sound_al_an_bees1`:
  - object key: `modules/current/__aurora/sources/vanilla/audio/wav/al_an_bees1.wav`
  - content type: `audio/wav`
  - size: `220220`
  - payload bytes: `220220`

QA:
- Browser QA not run; this slice is backend source restoration and catalog evidence only.

Blockers / Follow-up Evidence Needed:
- The guarded write currently reprocesses configured HAK audio when `--write` is used, as inherited from the script's original HAK sync behavior. It is safe but noisy for vanilla-only incremental batches.
- `lc_sounds.hak` is still absent from the configured local HAK directory.
- Full vanilla ingestion is intentionally not enabled by default because local vanilla has `12649` WAV resources.

Next Step:
- Add source-selection controls to the sync script (`--haks-only` / `--vanilla-only` or equivalent) so future bounded vanilla batches can upload only vanilla manifest entries without re-uploading configured HAK audio, then verify catalog count/source totals remain stable across repeated runs.

## Iteration 62 - Sound Sync Source Selection Controls

Scope:
- Continue the corrected Sounds Mode catalog/player direction after Iteration 61.
- One narrow backend sync hardening slice: add source-selection controls so bounded vanilla batches can run without re-uploading HAK audio.
- No canvas placement work. No VFX work. No heartbeat automation changes. No retail-canonical behavior claimed.

Changes:
- Added `--source <all|haks|vanilla>` to `backend/scripts/sync-sound-hak-audio.ts`.
- Default remains `all`, preserving existing behavior.
- `--source vanilla`:
  - skips configured HAK extraction/scanning;
  - still reports configured HAK names for operator context;
  - only runs the guarded vanilla discovery/upload path.
- Added `shouldSyncSoundSource(...)` helper and focused tests for source-selection behavior.

Files Changed:
- `backend/scripts/sync-sound-hak-audio.ts`
- `backend/test/unit/sync-sound-hak-audio.spec.ts`
- `docs/loops/sounds-mode-loop.md`

Tests and Build:
- Passed: `npx jest --config ./jest.unit.config.js --runTestsByPath test/unit/sync-sound-hak-audio.spec.ts test/unit/runtime-settings.config.spec.ts`
- Passed: `npm run build`

Runtime Verification:
- Ran twice inside `aurora-backend-dev`:
  - `npx ts-node scripts/sync-sound-hak-audio.ts --write --source vanilla --include-vanilla --vanilla-manifest-limit 2 --vanilla-manifest-max-bytes 500000`
- Both runs:
  - `scannedHaks: []`
  - `missingHaks: []`
  - vanilla `uploadedFiles: 2`
  - before/after remained stable at `16` audio objects;
  - source totals remained `{ "hak/lc_music": 8, "hak/npc_sounds": 6, "vanilla": 2 }`.

QA:
- Browser QA not run; this slice is backend sync tooling and catalog-source stability only.

Blockers / Follow-up Evidence Needed:
- `lc_sounds.hak` is still absent from the configured local HAK directory.
- Full vanilla ingestion remains intentionally capped/manual because local vanilla has `12649` WAV resources.
- The frontend has not yet been rechecked against the expanded 16-item catalog after the vanilla write.

Next Step:
- Run a frontend/backend catalog-player verification slice against the expanded 16-item catalog: confirm Sounds Mode lists 16 items including `al_an_bees1` / `al_an_bugs1`, selected metadata renders for a vanilla sound, and Play/Stop attempts the backend audio pipeline without canvas placement.

## Iteration 63 - Expanded Catalog Player Verification

Scope:
- Continue the corrected Sounds Mode catalog/player direction after Iteration 62.
- One narrow frontend/backend verification slice against the locally expanded 16-item sound catalog.
- No canvas placement work. No VFX work. No heartbeat automation changes. No retail-canonical behavior claimed.

Changes:
- Added a focused Sounds Mode regression using a 16-item backend sound catalog fixture.
- The fixture includes:
  - vanilla WAV sounds `sound_al_an_bees1` and `sound_al_an_bugs1`;
  - existing HAK-backed `sound_ambient_city_market_001`;
  - HAK-style `sound_port_*` entries.
- The test verifies:
  - Sounds Mode renders the `16` result count;
  - selecting `al_an_bees1` renders selected metadata (`sound_al_an_bees1`, `GI_sound_pos`, `PlacedSound`);
  - no catalog sound Place-on-canvas affordance exists;
  - no `sounds` catalog scope is forwarded to the viewport;
  - Play uses the backend sound process/contracts/blob pipeline for `sound_al_an_bees1`;
  - the prepared second-click playback path starts the mocked audio element.
- Aligned the vanilla fixture playback mode to the live backend inference (`random`).

Files Changed:
- `frontend/tests/unit/modules/layout/WorkspaceMockLayout.viewportWiring.test.tsx`
- `docs/loops/sounds-mode-loop.md`

Tests and Build:
- Passed: `npx vitest run tests/unit/modules/layout/WorkspaceMockLayout.viewportWiring.test.tsx tests/unit/modules/sounds/httpSoundApiPort.test.ts`
- Passed earlier in this slice before fixture alignment: `npm run build`
- Note: Vitest still prints existing React `act(...)` warnings in unrelated workspace layout tests; focused assertions pass.
- Note: Vite still reports the existing large chunk-size warning after production build.

Backend Catalog Evidence:
- One-off repository check through `ModuleSnapshotSoundRepository` returned:
  - `total: 16`
  - vanilla entries:
    - `sound_al_an_bees1`, `resref: al_an_bees1`, `format: wav`, `playbackMode: random`
    - `sound_al_an_bugs1`, `resref: al_an_bugs1`, `format: wav`, `playbackMode: random`

QA:
- Browser QA not run; live Browser automation remains unavailable in this loop. This slice combines focused component coverage with backend repository evidence.

Blockers / Follow-up Evidence Needed:
- Live Browser playback against the running frontend is still not covered.
- `lc_sounds.hak` is still absent from the configured local HAK directory.
- Full vanilla ingestion remains intentionally capped/manual because local vanilla has `12649` WAV resources.

Next Step:
- Add or expose a deterministic runtime/catalog status surface for Sounds Mode showing backend delivery evidence for selected sounds (for example object key/source/content type from the prepared audio contract) so Browser/manual QA can verify vanilla vs HAK provenance without canvas placement.

## Iteration 64 - Selected Sound Delivery Evidence

Scope:
- Continue the corrected Sounds Mode catalog/player direction after Iteration 63.
- One narrow frontend player slice: expose deterministic backend audio delivery evidence for the selected/prepared sound.
- No canvas placement work. No VFX work. No heartbeat automation changes. No retail-canonical behavior claimed.

Changes:
- Added a `SoundPlaybackDeliveryEvidence` state payload built from the backend audio delivery contract.
- Sounds Mode inspector now shows selected playback delivery evidence after contracts resolve:
  - inferred source (`vanilla`, `hak`, `module`, or `other`);
  - delivery mode;
  - content type;
  - byte size;
  - backend object key.
- Delivery evidence is preserved while the sound moves through `loading_audio`, `prepared`, and `playing` states, including the second-click playback path.
- Extended the expanded 16-item catalog regression to verify vanilla provenance for `sound_al_an_bees1`:
  - `vanilla / proxy / audio/wav / 215 KB`;
  - `modules/current/__aurora/sources/vanilla/audio/wav/al_an_bees1.wav`.

Files Changed:
- `frontend/src/modules/layout/components/WorkspaceMockLayout.tsx`
- `frontend/tests/unit/modules/layout/WorkspaceMockLayout.viewportWiring.test.tsx`
- `docs/loops/sounds-mode-loop.md`

Tests and Build:
- Passed: `npx vitest run tests/unit/modules/layout/WorkspaceMockLayout.viewportWiring.test.tsx tests/unit/modules/sounds/httpSoundApiPort.test.ts`
- Passed: `npm run build`
- Note: Vitest still prints existing React `act(...)` warnings in unrelated workspace layout tests; focused assertions pass.
- Note: Vite still reports the existing large chunk-size warning after production build.

QA:
- Browser QA not run; live Browser automation remains unavailable in this loop. This slice adds deterministic UI-level provenance assertions for the backend contract path.

Blockers / Follow-up Evidence Needed:
- Live Browser playback against a running frontend/backend still needs a stable Browser path.
- `lc_sounds.hak` is still absent from the configured local HAK directory.
- Full vanilla ingestion remains intentionally capped/manual because local vanilla has `12649` WAV resources.

Next Step:
- Add source/category filtering or grouping in Sounds Mode so the expanded library can be browsed by provenance (`vanilla`, `hak`, `module`) without relying on object-key inspection, then cover it with focused catalog/player tests.

## Iteration 65 - Sounds Category Filter

Scope:
- Continue the corrected Sounds Mode catalog/player direction after Iteration 64.
- One narrow frontend library-browsing slice: add category filtering over the already loaded backend sound catalog.
- No canvas placement work. No VFX work. No heartbeat automation changes. No retail-canonical behavior claimed.

Changes:
- Added Sounds Mode category filter controls for:
  - `All`
  - `Ambient`
  - `Music`
  - `Effects`
- The filter is client-side over the fully paged backend catalog already loaded by Sounds Mode, so it does not reduce catalog discovery coverage.
- Category changes clear the selected sound to keep the inspector aligned with the visible list.
- Result count now naturally shows filtered/total counts, for example `1/16` when the expanded catalog is filtered to `Ambient`.
- Extended the expanded 16-item catalog regression to verify:
  - `Ambient` narrows the list to `amb_city_market_day`;
  - vanilla effect sounds such as `al_an_bees1` are hidden under `Ambient`;
  - returning to `All` restores the 16-item list before playback/provenance assertions.

Files Changed:
- `frontend/src/modules/layout/components/WorkspaceMockLayout.tsx`
- `frontend/tests/unit/modules/layout/WorkspaceMockLayout.viewportWiring.test.tsx`
- `docs/loops/sounds-mode-loop.md`

Tests and Build:
- Passed: `npx vitest run tests/unit/modules/layout/WorkspaceMockLayout.viewportWiring.test.tsx tests/unit/modules/sounds/httpSoundApiPort.test.ts`
- Passed: `npm run build`
- Note: Vitest still prints existing React `act(...)` warnings in unrelated workspace layout tests; focused assertions pass.
- Note: Vite still reports the existing large chunk-size warning after production build.

QA:
- Browser QA not run; live Browser automation remains unavailable in this loop. The category filter is covered by component-level catalog/player regression.

Blockers / Follow-up Evidence Needed:
- True provenance filtering (`vanilla`, `hak`, `module`) is still blocked at the list-contract level because `SoundApiListItem` does not expose audio object keys or source provenance until the process/contracts pipeline is run for a selected sound.
- Live Browser playback against a running frontend/backend still needs a stable Browser path.
- `lc_sounds.hak` is still absent from the configured local HAK directory.
- Full vanilla ingestion remains intentionally capped/manual because local vanilla has `12649` WAV resources.

Next Step:
- Add backend list-level sound source provenance to `SoundApiListItem` (or an equivalent lightweight catalog field) so Sounds Mode can filter/group by `vanilla`, `hak`, and `module` without preparing every sound.

## Iteration 66 - List-Level Sound Source Provenance

Scope:
- Continue the corrected Sounds Mode catalog/player direction after Iteration 65.
- One narrow backend/frontend contract slice: expose lightweight source provenance on sound catalog list items.
- No canvas placement work. No VFX work. No heartbeat automation changes. No retail-canonical behavior claimed.

Changes:
- Added `SoundSourceLayer` / `SoundApiSourceLayer` with values:
  - `vanilla`
  - `hak`
  - `module`
  - `other`
- Added `source.layer` to backend `SoundListItem` and frontend `SoundApiListItem`.
- Static and module-snapshot sound repositories now derive `source.layer` from `sourceObjectKey`:
  - `modules/current/__aurora/sources/vanilla/...` -> `vanilla`;
  - `modules/current/__aurora/sources/hak/...` -> `hak`;
  - regular module snapshot paths such as `modules/current/audio/...` -> `module`;
  - unknown paths -> `other`.
- Updated the frontend HTTP adapter schema/mapper to require and preserve `source.layer`.
- Added focused repository coverage for HAK and vanilla module-snapshot audio provenance.
- Updated existing Sounds Mode/frontend fixtures for the widened list contract.

Files Changed:
- `backend/src/modules/sounds/domain/sound.types.ts`
- `backend/src/modules/sounds/adapters/outbound/blob/module-snapshot-sound.repository.ts`
- `backend/src/modules/sounds/adapters/outbound/memory/static-sound.repository.ts`
- `backend/test/unit/module-snapshot-sound.repository.spec.ts`
- `backend/test/unit/static-sound.repository.spec.ts`
- `backend/test/unit/sounds.application.service.spec.ts`
- `frontend/src/modules/sounds/contracts.ts`
- `frontend/src/modules/sounds/adapters/httpSoundApiPort.ts`
- `frontend/tests/unit/modules/sounds/httpSoundApiPort.test.ts`
- `frontend/tests/unit/modules/layout/WorkspaceMockLayout.viewportWiring.test.tsx`
- `docs/loops/sounds-mode-loop.md`

Tests and Build:
- Passed: `npx jest --config ./jest.unit.config.js --runTestsByPath test/unit/sounds.application.service.spec.ts test/unit/static-sound.repository.spec.ts test/unit/module-snapshot-sound.repository.spec.ts`
- Passed: `npx vitest run tests/unit/modules/sounds/httpSoundApiPort.test.ts tests/unit/modules/layout/WorkspaceMockLayout.viewportWiring.test.tsx`
- Passed: backend `npm run build`
- Passed: frontend `npm run build`
- Note: Vitest still prints existing React `act(...)` warnings in unrelated workspace layout tests; focused assertions pass.
- Note: Vite still reports the existing large chunk-size warning after production build.

QA:
- Browser QA not run; live Browser automation remains unavailable in this loop. This slice is contract/repository/parser coverage for source provenance.

Blockers / Follow-up Evidence Needed:
- Sounds Mode UI does not yet expose `source.layer` as a provenance filter/group; the contract now supports it.
- Live Browser playback against a running frontend/backend still needs a stable Browser path.
- `lc_sounds.hak` is still absent from the configured local HAK directory.
- Full vanilla ingestion remains intentionally capped/manual because local vanilla has `12649` WAV resources.

Next Step:
- Add a Sounds Mode source/provenance filter using `SoundApiListItem.source.layer` so users can browse `All`, `Vanilla`, `HAK`, `Module`, and `Other` without preparing audio contracts for every row.

## Iteration 67 - Sounds Source Provenance Filter

Scope:
- Continue the corrected Sounds Mode catalog/player direction after Iteration 66.
- One narrow frontend library-browsing slice: add a source/provenance filter using `SoundApiListItem.source.layer`.
- No canvas placement work. No VFX work. No heartbeat automation changes. No retail-canonical behavior claimed.

Changes:
- Added Sounds Mode source filter controls for:
  - `All`
  - `Vanilla`
  - `HAK`
  - `Module`
  - `Other`
- The source filter composes with the existing category filter over the fully loaded backend sound catalog.
- Source filter changes clear the selected sound so the inspector does not display a hidden/out-of-filter item.
- Added telemetry event `ui.workspace.sounds_mode.source_filter_changed`.
- Extended the expanded 16-item catalog regression:
  - `Vanilla` shows the two vanilla WAV entries (`al_an_bees1`, `al_an_bugs1`) and hides HAK entries;
  - `HAK` shows the 13 synthetic HAK entries and hides vanilla entries;
  - `Module` shows the module ambient item;
  - returning to `All` restores the 16-item list before playback/provenance assertions.

Files Changed:
- `frontend/src/modules/layout/components/WorkspaceMockLayout.tsx`
- `frontend/tests/unit/modules/layout/WorkspaceMockLayout.viewportWiring.test.tsx`
- `docs/loops/sounds-mode-loop.md`

Tests and Build:
- Passed: `npx vitest run tests/unit/modules/layout/WorkspaceMockLayout.viewportWiring.test.tsx tests/unit/modules/sounds/httpSoundApiPort.test.ts`
- Passed: frontend `npm run build`
- Note: Vitest still prints existing React `act(...)` warnings in unrelated workspace layout tests; focused assertions pass.
- Note: Vite still reports the existing large chunk-size warning after production build.

QA:
- Browser QA not run; live Browser automation remains unavailable in this loop. This slice is covered by the focused component-level Sounds Mode catalog/player regression.

Blockers / Follow-up Evidence Needed:
- Live Browser playback against a running frontend/backend still needs a stable Browser path.
- `lc_sounds.hak` is still absent from the configured local HAK directory.
- Full vanilla ingestion remains intentionally capped/manual because local vanilla has `12649` WAV resources.
- Retail-canonical sound semantics remain unclaimed without hard retail/runtime/capture comparison evidence.

Next Step:
- Add selected-sound source provenance to the Sounds Mode inspector before playback is prepared, using `SoundApiListItem.source.layer`, so source is visible immediately on row selection and not only after audio contract preparation.

## Iteration 68 - Selected Sound Source Inspector

Scope:
- Continue the corrected Sounds Mode catalog/player direction after Iteration 67.
- One narrow frontend inspector slice: surface selected sound source provenance immediately from the list contract.
- No canvas placement work. No VFX work. No heartbeat automation changes. No retail-canonical behavior claimed.

Changes:
- Sounds Mode inspector now shows `source: <layer>` from `SoundApiListItem.source.layer` as soon as a sound row is selected.
- This makes provenance visible before the user prepares/plays audio and before backend audio contract delivery evidence exists.
- Extended the expanded 16-item catalog/player regression to assert that selecting `al_an_bees1` shows `source: vanilla` before invoking the Play pipeline.

Files Changed:
- `frontend/src/modules/layout/components/WorkspaceMockLayout.tsx`
- `frontend/tests/unit/modules/layout/WorkspaceMockLayout.viewportWiring.test.tsx`
- `docs/loops/sounds-mode-loop.md`

Tests and Build:
- Passed: `npx vitest run tests/unit/modules/layout/WorkspaceMockLayout.viewportWiring.test.tsx tests/unit/modules/sounds/httpSoundApiPort.test.ts`
- Passed: frontend `npm run build`
- Note: Vitest still prints existing React `act(...)` warnings in unrelated workspace layout tests; focused assertions pass.
- Note: Vite still reports the existing large chunk-size warning after production build.

QA:
- Browser QA not run; live Browser automation remains unavailable in this loop. This slice is covered by the focused component-level Sounds Mode catalog/player regression.

Blockers / Follow-up Evidence Needed:
- Live Browser playback against a running frontend/backend still needs a stable Browser path.
- `lc_sounds.hak` is still absent from the configured local HAK directory.
- Full vanilla ingestion remains intentionally capped/manual because local vanilla has `12649` WAV resources.
- Retail-canonical sound semantics remain unclaimed without hard retail/runtime/capture comparison evidence.

Next Step:
- Improve playback ergonomics by making the prepared-audio state clearer in the selected inspector/list row, including an explicit "Ready" state and Stop availability after preparation, then cover the controlled second-click playback flow.

## Iteration 69 - Prepared Playback Ready State

Scope:
- Continue the corrected Sounds Mode catalog/player direction after Iteration 68.
- One narrow frontend playback ergonomics slice: make prepared audio state explicit in the selected list row and inspector.
- No canvas placement work. No VFX work. No heartbeat automation changes. No retail-canonical behavior claimed.

Changes:
- Added a derived playback status label for Sounds Mode states:
  - `Processing`
  - `Resolving`
  - `Loading`
  - `Ready`
  - `Playing`
  - `Error`
- Sounds Mode list rows now show `state: Ready` when backend processing/contracts/blob loading has completed and the audio element is prepared.
- Sounds Mode inspector now shows the same explicit `state: Ready` for the selected sound.
- Existing Stop behavior after preparation is now covered directly by the focused regression.
- The controlled second-click flow remains intact:
  - first click runs process/contracts/blob and reaches `Ready`;
  - Stop is available in the prepared state;
  - second Play click starts the mocked audio element.

Files Changed:
- `frontend/src/modules/layout/components/WorkspaceMockLayout.tsx`
- `frontend/tests/unit/modules/layout/WorkspaceMockLayout.viewportWiring.test.tsx`
- `docs/loops/sounds-mode-loop.md`

Tests and Build:
- Passed: `npx vitest run tests/unit/modules/layout/WorkspaceMockLayout.viewportWiring.test.tsx tests/unit/modules/sounds/httpSoundApiPort.test.ts`
- Passed: frontend `npm run build`
- Note: Vitest still prints existing React `act(...)` warnings in unrelated workspace layout tests; focused assertions pass.
- Note: Vite still reports the existing large chunk-size warning after production build.

QA:
- Browser QA not run; live Browser automation remains unavailable in this loop. This slice is covered by the focused component-level Sounds Mode catalog/player regression.

Blockers / Follow-up Evidence Needed:
- Live Browser playback against a running frontend/backend still needs a stable Browser path.
- `lc_sounds.hak` is still absent from the configured local HAK directory.
- Full vanilla ingestion remains intentionally capped/manual because local vanilla has `12649` WAV resources.
- Retail-canonical sound semantics remain unclaimed without hard retail/runtime/capture comparison evidence.

Next Step:
- Add a focused Stop behavior regression for prepared and playing sounds: prepared Stop should clear the object URL/state without calling `play()`, and playing Stop should pause/release audio and return the selected sound to an idle playback state.

## Iteration 70 - Prepared and Playing Stop Regression

Scope:
- Continue the corrected Sounds Mode catalog/player direction after Iteration 69.
- One narrow frontend playback-control slice: harden Stop behavior for prepared and playing catalog audio.
- No canvas placement work. No VFX work. No heartbeat automation changes. No retail-canonical behavior claimed.

Changes:
- Extended the expanded 16-item Sounds Mode catalog/player regression to cover Stop behavior:
  - after the first Play click reaches `Ready`, Stop is available;
  - prepared Stop clears the prepared audio object URL/state without calling `play()`;
  - prepared Stop calls `pause()`, removes `src`, calls `load()`, and revokes the object URL;
  - the user can prepare the same sound again after stopping;
  - second Play starts the mocked audio element;
  - playing Stop pauses/releases the playing audio object URL and clears the Stop affordance.
- Kept the controlled two-click playback flow intact.
- Incidental build unblock: `AreaSelectionPanel` object-count breakdown now uses named entries instead of tuple inference, fixing a TypeScript compile error without changing displayed behavior.

Files Changed:
- `frontend/src/modules/layout/components/WorkspaceMockLayout.tsx`
- `frontend/tests/unit/modules/layout/WorkspaceMockLayout.viewportWiring.test.tsx`
- `frontend/src/modules/layout/components/AreaSelectionPanel.tsx`
- `docs/loops/sounds-mode-loop.md`

Tests and Build:
- Initial focused run surfaced an unrelated transient AreaSelectionPanel crash later in the broad layout suite; rerun passed after the compile-only helper cleanup.
- Passed: `npx vitest run tests/unit/modules/layout/WorkspaceMockLayout.viewportWiring.test.tsx tests/unit/modules/sounds/httpSoundApiPort.test.ts`
- Passed: frontend `npm run build`
- Note: Vitest still prints existing React `act(...)` warnings in unrelated workspace layout tests; focused assertions pass.
- Note: Vite still reports the existing large chunk-size warning after production build.

QA:
- Browser QA not run; live Browser automation remains unavailable in this loop. This slice is covered by the focused component-level Sounds Mode catalog/player regression.

Blockers / Follow-up Evidence Needed:
- Live Browser playback against a running frontend/backend still needs a stable Browser path.
- `lc_sounds.hak` is still absent from the configured local HAK directory.
- Full vanilla ingestion remains intentionally capped/manual because local vanilla has `12649` WAV resources.
- Retail-canonical sound semantics remain unclaimed without hard retail/runtime/capture comparison evidence.

Next Step:
- Add a focused playback error-state regression for backend audio blob/contract failures: failed process/contracts/blob should leave the catalog usable, keep the selected sound visible, show a controlled error, and allow retrying the same sound without canvas placement.

## Iteration 71 - Playback Pipeline Failure Retry Regression

Scope:
- Continue the corrected Sounds Mode catalog/player direction after Iteration 70.
- One narrow frontend playback resiliency slice: cover failed backend process/contracts/blob paths.
- No canvas placement work. No VFX work. No heartbeat automation changes. No retail-canonical behavior claimed.

Changes:
- Added a table-driven Sounds Mode regression for three failed playback-pipeline stages:
  - `processSound` rejection;
  - `getSoundAudioContracts` rejection;
  - `getSoundAudioBlob` rejection.
- Verified each failure keeps the catalog usable and the selected sound visible in the inspector.
- Verified each failure renders a controlled `Sound preview failed: ...` alert and `Error` playback state.
- Verified the catalog still has no catalog-sound "Place on canvas" affordance.
- Verified retrying the same sound re-runs the backend audio pipeline and returns to explicit `Ready` state without calling `audio.play()` during the prepare step.

Files Changed:
- `frontend/tests/unit/modules/layout/WorkspaceMockLayout.viewportWiring.test.tsx`
- `docs/loops/sounds-mode-loop.md`

Tests and Build:
- Passed: `npx vitest run tests/unit/modules/layout/WorkspaceMockLayout.viewportWiring.test.tsx tests/unit/modules/sounds/httpSoundApiPort.test.ts`
- Passed: frontend `npm run build`
- Note: Vitest still prints existing React `act(...)` warnings in unrelated workspace layout tests; focused assertions pass.
- Note: Vite still reports the existing large chunk-size warning after production build.

QA:
- Browser QA not run; live Browser automation remains unavailable in this loop. This slice is covered by focused component-level Sounds Mode catalog/player regressions.

Blockers / Follow-up Evidence Needed:
- Live Browser playback against a running frontend/backend still needs a stable Browser path.
- `lc_sounds.hak` is still absent from the configured local HAK directory.
- Full vanilla ingestion remains intentionally capped/manual because local vanilla has `12649` WAV resources.
- Retail-canonical sound semantics remain unclaimed without hard retail/runtime/capture comparison evidence.

Next Step:
- Add a focused catalog/player regression that changing sound filters or selecting a different sound clears stale prepared/error playback state and releases any prepared object URL, so playback status cannot leak between catalog rows.

## Coordinator Directive Intake - 2026-06-16T19:44:25+02:00

Source:
- Read `backend/docs/aurora-reverse/guard-reports/sounds-domain-coordinator-latest.md`.
- Read `backend/docs/aurora-reverse/guard-reports/sounds-domain-coordinator-latest.json`.

Directive Followed:
- Followed Sounds Domain Coordinator `nextPriorities[0]` / Worker Priority 1:
  - "Add focused playback error-state regression for failed process/contracts/blob while keeping catalog usable and retryable without canvas placement."
- This directive matches and governs Iteration 71.
- Future Sounds work must read these latest coordinator artifacts before selecting a slice, unless superseded by newer coordinator output, AURORA FIRST evidence, or hard local evidence.

Controlling Constraints Confirmed:
- Sounds Mode remains a playback-first catalog/player workflow.
- Catalog playback does not require canvas placement.
- Catalog provenance must use `SoundApiListItem.source.layer`.
- Do not expand into VFX or generic Areas/canvas placement work unless Factory Director explicitly asks for Area sound emitter editing.
- Do not claim retail/canonical sound parity without retail/runtime capture comparison evidence.

Coordinator State Note:
- The coordinator artifact is stale about worker iteration count: it records latest worker checkpoint Iteration 70, while this loop has now recorded Iteration 71.
- No correction is needed for Iteration 71 because it directly implements the coordinator's Worker Priority 1.

## Iteration 72 - Playback State Cleanup On Filter Or Selection Change

Upstream Directive Evidence:
- upstreamDirectiveRead: true
- upstreamDirectiveSource: `backend/docs/aurora-reverse/guard-reports/sounds-domain-coordinator-latest.md`; `backend/docs/aurora-reverse/guard-reports/sounds-domain-coordinator-latest.json`
- upstreamDirectiveTimestampOrVersion: `2026-06-16T20:02:29+02:00`
- directiveCompliance: compliant
- deviationOrBlocker: none. This slice implements the coordinator's explicit worker directive for playback-state cleanup only, preserves Iteration 71 failure/retry behavior, and does not add canvas placement, generic Areas work, VFX work, heartbeat automation changes, or retail/canonical claims.

Scope:
- Continue the corrected Sounds Mode catalog/player direction after Iteration 71.
- Exactly one narrow frontend playback-first slice: clear stale prepared/error playback state when filters change or a different sound is selected.
- No canvas placement work. No VFX work. No heartbeat automation changes. No retail-canonical behavior claimed.

Changes:
- Added a shared `clearSoundPlaybackState` helper in `WorkspaceMockLayout` that:
  - calls the existing audio cleanup path;
  - pauses the current prepared/playing audio;
  - removes `src`;
  - calls `load()`;
  - revokes any prepared object URL;
  - resets playback state to idle.
- Wired cleanup into Sounds Mode search, category filter, source filter, and different-sound selection handlers.
- Kept same-sound selection from clearing prepared state unnecessarily.
- Preserved the completed process/contracts/blob failure-retry behavior from Iteration 71.
- Added focused regressions proving:
  - prepared `Ready` state clears when source filtering hides the prepared sound;
  - prepared object URLs are revoked on filter changes;
  - prepared object URLs are revoked when selecting a different sound;
  - stale error alerts clear when selecting a different sound;
  - catalog rows remain usable and selected metadata updates to the new sound;
  - no catalog "Place on canvas" affordance is introduced.

Files Changed:
- `frontend/src/modules/layout/components/WorkspaceMockLayout.tsx`
- `frontend/tests/unit/modules/layout/WorkspaceMockLayout.viewportWiring.test.tsx`
- `docs/loops/sounds-mode-loop.md`

Tests and Build:
- Passed: `npx vitest run tests/unit/modules/layout/WorkspaceMockLayout.viewportWiring.test.tsx tests/unit/modules/sounds/httpSoundApiPort.test.ts`
- Passed: frontend `npm run build`
- Note: Vitest still prints existing React `act(...)` warnings in unrelated workspace layout tests; focused assertions pass.
- Note: Vite still reports the existing large chunk-size warning after production build.

QA:
- Browser QA not run; live Browser automation remains unavailable in this loop. This slice is covered by focused component-level Sounds Mode catalog/player regressions.

Blockers / Follow-up Evidence Needed:
- Live Browser playback against a running frontend/backend still needs a stable Browser path.
- `lc_sounds.hak` is still absent from the configured local HAK directory.
- Full vanilla ingestion remains intentionally capped/manual because local vanilla has `12649` WAV resources.
- Retail-canonical sound semantics remain unclaimed without hard retail/runtime/capture comparison evidence.

Next Step:
- Add one focused catalog/player regression for unmount or leaving Sounds Mode: any prepared/playing catalog audio should be stopped and its object URL released when the Sounds Mode panel is no longer active, without changing existing area sound object contracts.

## Iteration 73 - Playback Cleanup On Leaving Sounds Mode Or Unmount

Upstream Directive Evidence:
- upstreamDirectiveRead: true
- upstreamDirectiveSource: `backend/docs/aurora-reverse/guard-reports/sounds-domain-coordinator-latest.md`; `backend/docs/aurora-reverse/guard-reports/sounds-domain-coordinator-latest.json`
- upstreamDirectiveTimestampOrVersion: `2026-06-16T20:10:12+02:00`
- directiveCompliance: compliant
- deviationOrBlocker: none. The latest dispatcher report preserves playback-first scope and requires downstream evidence fields; the parallel dispatcher assignment narrowed this worker slice to leave/unmount playback cleanup. This slice does not add canvas placement, generic Areas work, VFX work, heartbeat automation changes, or retail/canonical claims. Governor notes remain advisory evidence/corrections, not a scheduler or stop signal.

Scope:
- Continue Sounds Mode as a playback-first catalog/player workflow after Iteration 72.
- Exactly one narrow frontend QA cleanup slice: leaving Sounds Mode or unmounting the panel must stop catalog audio and release prepared object URLs.
- No area sound object contract changes.
- No canvas placement work. No VFX work. No heartbeat automation changes. No retail-canonical behavior claimed.

Changes:
- Reused `clearSoundPlaybackState` when Sounds backend dependencies change.
- Added lifecycle cleanup when `WorkspaceMockLayout` is no longer in `sounds_mode`:
  - clears the selected catalog sound;
  - stops any current prepared/playing catalog audio;
  - removes the audio `src`;
  - calls `load()`;
  - revokes the prepared object URL;
  - returns playback state to idle.
- Preserved existing unmount cleanup for the component-level teardown path.
- Preserved Iteration 71 process/contracts/blob failure-retry behavior.
- Preserved Iteration 72 filter/selection cleanup behavior.
- Added focused regressions proving:
  - prepared catalog audio is stopped and its object URL is revoked when switching from `sounds_mode` to `areas_mode`;
  - playing catalog audio is stopped and its object URL is revoked on unmount.

Files Changed:
- `frontend/src/modules/layout/components/WorkspaceMockLayout.tsx`
- `frontend/tests/unit/modules/layout/WorkspaceMockLayout.viewportWiring.test.tsx`
- `docs/loops/sounds-mode-loop.md`

Tests and Build:
- Passed: `npx vitest run tests/unit/modules/layout/WorkspaceMockLayout.viewportWiring.test.tsx tests/unit/modules/sounds/httpSoundApiPort.test.ts`
- Passed: frontend `npm run build`
- Note: Vitest still prints existing React `act(...)` warnings in unrelated workspace layout tests; focused assertions pass.
- Note: Vite still reports the existing large chunk-size warning after production build.

QA:
- Browser QA not run; live Browser automation remains unavailable in this loop. This slice is covered by focused component-level Sounds Mode catalog/player regressions.

Blockers / Follow-up Evidence Needed:
- Live Browser playback against a running frontend/backend still needs a stable Browser path.
- `lc_sounds.hak` is still absent from the configured local HAK directory.
- Full vanilla ingestion remains intentionally capped/manual because local vanilla has `12649` WAV resources.
- Retail-canonical sound semantics remain unclaimed without hard retail/runtime/capture comparison evidence.

Next Step:
- Re-read the latest Sounds Domain Coordinator directives before selecting the next slice. A narrow playback-first candidate is to add explicit disabled/busy affordance coverage for Play while process/contracts/blob are pending, preserving catalog usability and retry behavior without canvas placement.

## Iteration 74 - Pending Playback Busy Affordance And Stale Request Guard

Upstream Directive Evidence:
- upstreamDirectiveRead: true
- upstreamDirectiveSource: `backend/docs/aurora-reverse/guard-reports/sounds-domain-coordinator-latest.md`; `backend/docs/aurora-reverse/guard-reports/sounds-domain-coordinator-latest.json`
- upstreamDirectiveTimestampOrVersion: `2026-06-16T20:26:47+02:00`
- directiveCompliance: compliant
- deviationOrBlocker: none. The latest Domain Coordinator report preserves playback-first scope under `commandModel=global_direction_only`; the throughput dispatch narrowed this worker slice to Play busy/disabled QA while preserving Iterations 71-73. This slice does not add canvas placement, generic Areas work, VFX work, heartbeat automation changes, or retail/canonical claims.

Scope:
- Continue Sounds Mode as a playback-first catalog/player workflow after Iteration 73.
- Exactly one narrow frontend QA slice: explicit disabled/busy affordance coverage while backend process/contracts/blob playback pipeline stages are pending.
- Preserve Iteration 71 failure/retry, Iteration 72 filter/selection cleanup, and Iteration 73 leaving/unmount cleanup.
- No area sound object contract changes.
- No canvas placement work. No VFX work. No heartbeat automation changes. No retail-canonical behavior claimed.

Changes:
- Added a playback request revision guard for backend sound preview preparation:
  - starting a new backend playback preparation creates a request revision;
  - clearing playback state invalidates older pending requests;
  - resolved stale `processSound`, `getSoundAudioContracts`, or `getSoundAudioBlob` promises cannot restore old `Ready`/`Error` state;
  - stale pending requests cannot fetch later contracts/blob stages or create object URLs after the user selects a different sound.
- Kept existing busy UI semantics:
  - Play is disabled while the selected sound is `Processing`, `Resolving`, `Loading`, or `Playing`;
  - status/message text remains visible in list row and inspector.
- Added focused regressions proving:
  - Play is disabled and `Processing` is visible while `processSound` is pending;
  - Play is disabled and `Resolving` is visible while audio contracts are pending;
  - Play is disabled and `Loading` is visible while audio blob loading is pending;
  - the catalog row remains visible and usable during pending states;
  - no catalog "Place on canvas" affordance is introduced;
  - selecting a different sound during a pending process request prevents stale contract/blob fetches, object URL creation, and old `Ready` state leakage.

Files Changed:
- `frontend/src/modules/layout/components/WorkspaceMockLayout.tsx`
- `frontend/tests/unit/modules/layout/WorkspaceMockLayout.viewportWiring.test.tsx`
- `docs/loops/sounds-mode-loop.md`

Tests and Build:
- Passed: `npx vitest run tests/unit/modules/layout/WorkspaceMockLayout.viewportWiring.test.tsx tests/unit/modules/sounds/httpSoundApiPort.test.ts`
- Passed: frontend `npm run build`
- Note: Vitest still prints existing React `act(...)` warnings in unrelated workspace layout tests; focused assertions pass.
- Note: Vite still reports the existing large chunk-size warning after production build.

QA:
- Browser QA not run; live Browser automation remains unavailable in this loop. This slice is covered by focused component-level Sounds Mode catalog/player regressions.

Blockers / Follow-up Evidence Needed:
- Live Browser playback against a running frontend/backend still needs a stable Browser path.
- `lc_sounds.hak` is still absent from the configured local HAK directory.
- Full vanilla ingestion remains intentionally capped/manual because local vanilla has `12649` WAV resources.
- Retail-canonical sound semantics remain unclaimed without hard retail/runtime/capture comparison evidence.

Next Step:
- Re-read the latest Sounds Domain Coordinator directives before selecting the next slice. A narrow playback-first candidate is to add focused coverage for backend audio `audio.onerror` handling so malformed/unsupported blobs produce a controlled error, release object URLs, keep metadata visible, and allow retry without canvas placement.

## Iteration 75 - Prepared Audio Error QA Regression

Upstream Directive Evidence:
- upstreamDirectiveRead: true
- upstreamDirectiveSource: `backend/docs/aurora-reverse/guard-reports/sounds-domain-coordinator-latest.md`; `backend/docs/aurora-reverse/guard-reports/sounds-domain-coordinator-latest.json`
- upstreamDirectiveTimestampOrVersion: `2026-06-16T20:31:20+02:00`
- directiveCompliance: compliant
- deviationOrBlocker: none. The latest Domain Coordinator report preserves playback-first scope under `commandModel=global_direction_only`; its explicit busy-affordance directive was already completed in Iteration 74, so this heartbeat continued the highest-priority playback-first next step recorded in this loop note. This slice does not add canvas placement, generic Areas work, VFX work, heartbeat automation changes, or retail/canonical claims.

Governor Advisory:
- Read `docs/loops/sounds-mode-governor.md` as advisory evidence.
- Applied: governor notes confirm the catalog/player pivot and no retail/VFX/canvas-placement claims.
- Deferred: older governor entries about renderObjectIds/canvas placement remain historical drift and are not used as scheduling input.
- Blocking status: none. Governor notes are advisory evidence/corrections only; no coordinator or hard Aurora-first blocker was present.

Scope:
- Continue Sounds Mode as a playback-first catalog/player workflow after Iteration 74.
- Exactly one narrow frontend QA slice: prepared backend audio `audio.onerror` should produce a controlled error, release object URLs, keep selected metadata visible, and allow retry.
- Preserve Iteration 71 failure/retry, Iteration 72 filter/selection cleanup, Iteration 73 leaving/unmount cleanup, and Iteration 74 busy/stale-request behavior.
- No area sound object contract changes.
- No canvas placement work. No VFX work. No heartbeat automation changes. No retail-canonical behavior claimed.

Changes:
- Added focused regression coverage for malformed/unsupported prepared audio behavior:
  - prepare a backend sound to `Ready`;
  - trigger the prepared audio element `onerror`;
  - verify controlled error text is shown;
  - verify selected sound metadata remains visible in the inspector;
  - verify Stop is removed;
  - verify `pause()`, `removeAttribute("src")`, `load()`, and `URL.revokeObjectURL(...)` are called;
  - retry the same sound and verify the backend process/contracts/blob pipeline runs again and returns to `Ready`.
- No production code change was needed; existing runtime behavior already satisfied the regression.

Files Changed:
- `frontend/tests/unit/modules/layout/WorkspaceMockLayout.viewportWiring.test.tsx`
- `docs/loops/sounds-mode-loop.md`

Tests and Build:
- Passed: `npx vitest run tests/unit/modules/layout/WorkspaceMockLayout.viewportWiring.test.tsx tests/unit/modules/sounds/httpSoundApiPort.test.ts`
- Passed: frontend `npm run build`
- Note: Vitest still prints existing React `act(...)` warnings in unrelated workspace layout tests; focused assertions pass.
- Note: Vite still reports the existing large chunk-size warning after production build.

QA:
- Browser QA not run; live Browser automation remains unavailable in this loop. This slice is covered by focused component-level Sounds Mode catalog/player regressions.

Blockers / Follow-up Evidence Needed:
- Live Browser playback against a running frontend/backend still needs a stable Browser path.
- `lc_sounds.hak` is still absent from the configured local HAK directory.
- Full vanilla ingestion remains intentionally capped/manual because local vanilla has `12649` WAV resources.
- Retail-canonical sound semantics remain unclaimed without hard retail/runtime/capture comparison evidence.

Next Step:
- Re-read the latest Sounds Domain Coordinator directives before selecting the next slice. A narrow playback-first candidate is to add a small accessibility/regression slice for Play/Stop labels and status regions across Ready/Error/Busy states, preserving current backend contract usage and no canvas placement prerequisite.

## Iteration 76 - Play Stop Labels And Status Region QA

Upstream Directive Evidence:
- upstreamDirectiveRead: true
- upstreamDirectiveSource: `backend/docs/aurora-reverse/guard-reports/sounds-domain-coordinator-latest.md`; `backend/docs/aurora-reverse/guard-reports/sounds-domain-coordinator-latest.json`
- upstreamDirectiveTimestampOrVersion: `2026-06-16T20:43:03+02:00`
- directiveCompliance: compliant
- deviationOrBlocker: none. This slice implements the Domain Coordinator `worker-play-stop-labels-status-regions` directive. It preserves playback-first scope and does not add canvas placement, generic Areas work, VFX work, heartbeat automation changes, or retail/canonical claims.

Scope:
- Continue Sounds Mode as a playback-first catalog/player workflow after Iteration 75.
- Exactly one narrow frontend accessibility/regression QA slice: Play/Stop labels and status/alert regions across Busy, Ready, and Error playback states.
- Preserve Iteration 71 failure/retry, Iteration 72 filter/selection cleanup, Iteration 73 leaving/unmount cleanup, Iteration 74 pending stale-request guard, and Iteration 75 prepared audio error handling.
- No area sound object contract changes.
- No canvas placement work. No VFX work. No heartbeat automation changes. No retail-canonical behavior claimed.

Changes:
- Added focused regression coverage that verifies:
  - Busy state keeps `Play <resref>` available by accessible name but disabled;
  - Busy state has no Stop button;
  - Busy state exposes `Processing sound.` and `state: Processing` through `role="status"`;
  - Ready state re-enables `Play <resref>`;
  - Ready state exposes `Stop <resref>`;
  - Ready state exposes `Ready to play...` and `state: Ready` through `role="status"`;
  - Error state exposes the controlled audio error through `role="alert"`;
  - Error state leaves Play enabled for retry and removes Stop;
  - Error state exposes `state: Error` through `role="status"`;
  - selected sound metadata remains visible in the inspector throughout;
  - no catalog "Place on canvas" affordance is introduced.
- No production code change was needed; existing UI semantics satisfied the regression.

Files Changed:
- `frontend/tests/unit/modules/layout/WorkspaceMockLayout.viewportWiring.test.tsx`
- `docs/loops/sounds-mode-loop.md`

Tests and Build:
- Passed: `npx vitest run tests/unit/modules/layout/WorkspaceMockLayout.viewportWiring.test.tsx tests/unit/modules/sounds/httpSoundApiPort.test.ts`
- Passed: frontend `npm run build`
- Note: Vitest still prints existing React `act(...)` warnings in unrelated workspace layout tests; focused assertions pass.
- Note: Vite still reports the existing large chunk-size warning after production build.

QA:
- Browser QA not run; live Browser automation remains unavailable in this loop. This slice is covered by focused component-level Sounds Mode catalog/player regressions.

Blockers / Follow-up Evidence Needed:
- Live Browser playback against a running frontend/backend still needs a stable Browser path.
- `lc_sounds.hak` is still absent from the configured local HAK directory.
- Full vanilla ingestion remains intentionally capped/manual because local vanilla has `12649` WAV resources.
- Retail-canonical sound semantics remain unclaimed without hard retail/runtime/capture comparison evidence.

Next Step:
- Re-read the latest Sounds Domain Coordinator directives before selecting the next slice. A narrow playback-first candidate is to add keyboard-focused coverage for the same Play/Stop flow, verifying keyboard-triggered Play prepare, second Play, Stop, and retry remain accessible without canvas placement.

## Iteration 77 - Keyboard Play Stop Retry QA

Upstream Directive Evidence:
- upstreamDirectiveRead: true
- upstreamDirectiveSource: `backend/docs/aurora-reverse/guard-reports/sounds-domain-coordinator-latest.md`; `backend/docs/aurora-reverse/guard-reports/sounds-domain-coordinator-latest.json`
- upstreamDirectiveTimestampOrVersion: `2026-06-16T21:05:46+02:00`
- directiveCompliance: compliant
- deviationOrBlocker: none. This slice implements the Domain Coordinator `worker-keyboard-play-stop-retry-accessibility` directive. It preserves playback-first scope and does not add canvas placement, generic Areas work, VFX work, heartbeat automation changes, or retail/canonical claims.

Scope:
- Continue Sounds Mode as a playback-first catalog/player workflow after Iteration 76.
- Exactly one narrow frontend accessibility/regression QA slice: keyboard-focused Play prepare, second Play, Stop, and retry.
- Preserve Iteration 71 failure/retry, Iteration 72 filter/selection cleanup, Iteration 73 leaving/unmount cleanup, Iteration 74 pending stale-request guard, Iteration 75 prepared audio error handling, and Iteration 76 Play/Stop label/status-region semantics.
- No area sound object contract changes.
- No canvas placement work. No VFX work. No heartbeat automation changes. No retail-canonical behavior claimed.

Changes:
- Added focused keyboard accessibility regression coverage that verifies:
  - focused `Play <resref>` can prepare a backend sound through keyboard-style activation;
  - first Play prepares audio and reaches `Ready` without calling `audio.play()`;
  - selected sound metadata remains visible in the inspector;
  - `Stop <resref>` is available after prepare;
  - second keyboard-style Play starts the prepared audio;
  - focused `Stop <resref>` can stop playing audio through keyboard-style activation;
  - Stop releases audio via `pause()`, `removeAttribute("src")`, `load()`, and `URL.revokeObjectURL(...)`;
  - keyboard-style Play can prepare the same sound again after Stop;
  - backend process/contracts/blob calls run again on retry;
  - no catalog "Place on canvas" affordance is introduced.
- No production code change was needed; native button semantics and existing handlers satisfied the regression.

Files Changed:
- `frontend/tests/unit/modules/layout/WorkspaceMockLayout.viewportWiring.test.tsx`
- `docs/loops/sounds-mode-loop.md`

Tests and Build:
- Passed: `npx vitest run tests/unit/modules/layout/WorkspaceMockLayout.viewportWiring.test.tsx tests/unit/modules/sounds/httpSoundApiPort.test.ts`
- Passed: frontend `npm run build`
- Note: Vitest still prints existing React `act(...)` warnings in unrelated workspace layout tests; focused assertions pass.
- Note: Vite still reports the existing large chunk-size warning after production build.

QA:
- Browser QA not run; live Browser automation remains unavailable in this loop. This slice is covered by focused component-level Sounds Mode catalog/player regressions.

Blockers / Follow-up Evidence Needed:
- Live Browser playback against a running frontend/backend still needs a stable Browser path.
- `lc_sounds.hak` is still absent from the configured local HAK directory.
- Full vanilla ingestion remains intentionally capped/manual because local vanilla has `12649` WAV resources.
- Retail-canonical sound semantics remain unclaimed without hard retail/runtime/capture comparison evidence.

Next Step:
- Re-read the latest Sounds Domain Coordinator directives before selecting the next slice. A narrow playback-first candidate is to add catalog search/filter keyboard retention coverage, verifying keyboard-selected/focused rows keep metadata and playback states coherent when filters change, without canvas placement.

## Iteration 78 - Keyboard Filter Metadata And Playback Cleanup QA

Upstream Directive Evidence:
- upstreamDirectiveRead: true
- upstreamDirectiveSource: `backend/docs/aurora-reverse/guard-reports/sounds-domain-coordinator-latest.md`; `backend/docs/aurora-reverse/guard-reports/sounds-domain-coordinator-latest.json`
- upstreamDirectiveTimestampOrVersion: `2026-06-16T21:06:01.7313305+02:00 / aurora-web-global-coordinator-report/v1 / anti_stuck_pulse_healthy_vfx_refresh_pending` (Domain Coordinator report generated `2026-06-16T21:19:43+02:00`)
- directiveCompliance: compliant
- deviationOrBlocker: none. This slice implements the Domain Coordinator `worker-catalog-filter-keyboard-retention` directive. It preserves AURORA FIRST and does not add canvas placement, generic Areas work, VFX work, heartbeat automation changes, or retail/canonical claims.

Governor Advisory:
- Read `docs/loops/sounds-mode-governor.md` as advisory evidence.
- Applied: governor notes confirm the catalog/player pivot and no retail/VFX/canvas-placement claims.
- Deferred: older governor entries about renderObjectIds/canvas placement remain historical drift and are not used as scheduling input.
- Blocking status: none. Governor notes are advisory evidence/corrections only; no coordinator or hard Aurora-first blocker was present.

Scope:
- Continue Sounds Mode as a playback-first catalog/player workflow after Iteration 77.
- Exactly one narrow frontend accessibility/regression QA slice: keyboard-selected/focused catalog row metadata and playback cleanup when source, category, and search filters change.
- Preserve Iteration 71 failure/retry, Iteration 72 filter/selection cleanup, Iteration 73 leaving/unmount cleanup, Iteration 74 pending stale-request guard, Iteration 75 prepared audio error handling, Iteration 76 Play/Stop label/status-region semantics, and Iteration 77 keyboard Play/Stop/Retry flow.
- No area sound object contract changes.
- No canvas placement work. No VFX work. No heartbeat automation changes. No retail-canonical behavior claimed.

Changes:
- Added focused keyboard/filter regression coverage that verifies:
  - focused sound row selection can update the inspector through keyboard-style activation;
  - selected sound metadata shows the backend catalog `soundId` and `source.layer`;
  - keyboard-style Play can prepare the selected sound to `Ready`;
  - keyboard-style source filtering can hide the prepared sound using `SoundApiListItem.source.layer`;
  - keyboard-style category filtering can hide the prepared sound without leaking stale metadata;
  - keyboard-focused search input changes can clear selected prepared audio while retaining input focus;
  - hiding the prepared sound through source/category/search clears stale `Ready` playback state;
  - Stop is removed when any tested filter clears the prepared sound;
  - prepared audio is released through `pause()`, `removeAttribute("src")`, `load()`, and `URL.revokeObjectURL(...)`;
  - the inspector returns to its no-selection state after filter cleanup;
  - keyboard-style selection of the remaining filtered sound updates metadata to that sound without leaking old playback state;
  - no catalog "Place on canvas" affordance is introduced.
- No production code change was needed; existing filter and keyboard-accessible button semantics satisfied the regression.

Files Changed:
- `frontend/tests/unit/modules/layout/WorkspaceMockLayout.viewportWiring.test.tsx`
- `docs/loops/sounds-mode-loop.md`

Tests and Build:
- Passed: `npx vitest run tests/unit/modules/layout/WorkspaceMockLayout.viewportWiring.test.tsx tests/unit/modules/sounds/httpSoundApiPort.test.ts`
- Passed: frontend `npm run build`
- Note: Vitest still prints existing React `act(...)` warnings in unrelated workspace layout tests; focused assertions pass.
- Note: Vite still reports the existing large chunk-size warning after production build.

QA:
- Browser QA not run; live Browser automation remains unavailable in this loop. This slice is covered by focused component-level Sounds Mode catalog/player regressions.

Blockers / Follow-up Evidence Needed:
- Live Browser playback against a running frontend/backend still needs a stable Browser path.
- `lc_sounds.hak` is still absent from the configured local HAK directory.
- Full vanilla ingestion remains intentionally capped/manual because local vanilla has `12649` WAV resources.
- Retail-canonical sound semantics remain unclaimed without hard retail/runtime/capture comparison evidence.

Next Step:
- Re-read the latest Sounds Domain Coordinator directives before selecting the next slice. A narrow playback-first candidate is to consolidate duplicate keyboard activation helpers in the focused Sounds Mode layout tests without behavior drift, then rerun the focused suite.

## Iteration 79 - Keyboard Activation Helper Consolidation QA

Upstream Directive Evidence:
- upstreamDirectiveRead: true
- upstreamDirectiveSource: `backend/docs/aurora-reverse/guard-reports/sounds-domain-coordinator-latest.md`; `backend/docs/aurora-reverse/guard-reports/sounds-domain-coordinator-latest.json`
- upstreamDirectiveTimestampOrVersion: `2026-06-16T21:27:49.2661030+02:00 / aurora-web-global-coordinator-report/v1 / throughput_and_antistuck_healthy_all_domains_dispatching` (Domain Coordinator report generated `2026-06-16T21:41:46+02:00`)
- directiveCompliance: compliant
- deviationOrBlocker: none. This slice implements the Domain Coordinator `worker-consolidate-keyboard-activation-test-helpers` directive. It is test-only, preserves AURORA FIRST, and does not add canvas placement, generic Areas work, VFX work, heartbeat automation changes, or retail/canonical claims.

Governor Advisory:
- Read `docs/loops/sounds-mode-governor.md` as advisory evidence.
- Applied: governor history remains aligned with the catalog/player pivot and no retail/VFX/canvas-placement claims.
- Deferred: older governor renderObjectIds/canvas-placement entries remain historical drift and were not used as scheduling input.
- Blocking status: none. Governor notes are advisory evidence/corrections only; no coordinator or hard Aurora-first blocker was present.

Scope:
- Continue Sounds Mode as a playback-first catalog/player workflow after Iteration 78.
- Exactly one narrow frontend QA/test-maintenance slice: consolidate duplicate keyboard activation helpers in focused Sounds Mode layout tests without behavior drift.
- Preserve Iteration 71 failure/retry, Iteration 72 filter/selection cleanup, Iteration 73 leaving/unmount cleanup, Iteration 74 pending stale-request guard, Iteration 75 prepared audio error handling, Iteration 76 Play/Stop label/status-region semantics, Iteration 77 keyboard Play/Stop/Retry flow, and Iteration 78 keyboard filter retention coverage.
- No area sound object contract changes.
- No canvas placement work. No VFX work. No heartbeat automation changes. No retail-canonical behavior claimed.

Changes:
- Extracted the duplicate `activateFocusedButtonFromKeyboard(...)` helper from the two focused Sounds Mode keyboard tests into one file-local helper in `WorkspaceMockLayout.viewportWiring.test.tsx`.
- Preserved the exact helper behavior:
  - focus the target button;
  - assert focus;
  - dispatch matching `keydown`/`keyup` for Enter or Space;
  - dispatch the click with `detail: 0` to model keyboard activation in the current test harness.
- No production code change was needed.

Files Changed:
- `frontend/tests/unit/modules/layout/WorkspaceMockLayout.viewportWiring.test.tsx`
- `docs/loops/sounds-mode-loop.md`

Tests and Build:
- Passed: `npx vitest run tests/unit/modules/layout/WorkspaceMockLayout.viewportWiring.test.tsx tests/unit/modules/sounds/httpSoundApiPort.test.ts`
- Passed: frontend `npm run build`
- Note: Vitest still prints existing React `act(...)` warnings in unrelated workspace layout tests; focused assertions pass.
- Note: Vite still reports the existing large chunk-size warning after production build.

QA:
- Browser QA not run; this is a test-only helper consolidation with no runtime behavior change. The focused component-level Sounds Mode catalog/player regressions stayed green.

Blockers / Follow-up Evidence Needed:
- Live Browser playback against a running frontend/backend still needs a stable Browser path.
- `lc_sounds.hak` is still absent from the configured local HAK directory.
- Full vanilla ingestion remains intentionally capped/manual because local vanilla has `12649` WAV resources.
- Retail-canonical sound semantics remain unclaimed without hard retail/runtime/capture comparison evidence.

Next Step:
- Re-read the latest Sounds Domain Coordinator directives before selecting the next slice. If no newer directive exists, a narrow playback-first candidate is to audit the focused Sounds Mode tests for other low-risk duplication in playback setup/teardown helpers without changing coverage or runtime code.

## Iteration 80 - Playback Setup Teardown Helper Consolidation QA

Upstream Directive Evidence:
- upstreamDirectiveRead: true
- upstreamDirectiveSource: `backend/docs/aurora-reverse/guard-reports/sounds-domain-coordinator-latest.md`; `backend/docs/aurora-reverse/guard-reports/sounds-domain-coordinator-latest.json`
- upstreamDirectiveTimestampOrVersion: `2026-06-16T21:57:22.8357142+02:00 / aurora-web-global-coordinator-report/v1 / throughput_healthy_freshness_watch_vfx_placeables` (Domain Coordinator report generated `2026-06-16T22:13:44+02:00`)
- directiveCompliance: compliant
- deviationOrBlocker: none. This slice implements the Domain Coordinator `worker-audit-playback-setup-teardown-helper-duplication` directive. It is test-only, preserves AURORA FIRST, and does not add canvas placement, generic Areas work, VFX work, heartbeat automation changes, or retail/canonical claims.

Governor Advisory:
- Not required as a blocking dependency. The refreshed coordinator report states Governor reported no correction and that Worker must not wait for Governor.
- Applied: retained the catalog/player pivot and avoided older canvas/renderObjectIds drift.
- Deferred: no Governor scheduling input was used.
- Blocking status: none.

Scope:
- Continue Sounds Mode as a playback-first catalog/player workflow after Iteration 79.
- Exactly one narrow frontend QA/test-maintenance slice: audit focused Sounds Mode layout tests for low-risk playback setup/teardown duplication and consolidate only the simple singleton audio mock cases.
- Preserve Iteration 71 failure/retry, Iteration 72 filter/selection cleanup, Iteration 73 leaving/unmount cleanup, Iteration 74 pending stale-request guard, Iteration 75 prepared audio error handling, Iteration 76 Play/Stop label/status-region semantics, Iteration 77 keyboard Play/Stop/Retry flow, Iteration 78 keyboard filter retention coverage, and Iteration 79 keyboard activation helper consolidation.
- No area sound object contract changes.
- No canvas placement work. No VFX work. No heartbeat automation changes. No retail-canonical behavior claimed.

Changes:
- Added a file-local `installSoundPlaybackMocks(...)` helper in `WorkspaceMockLayout.viewportWiring.test.tsx` for the repeated singleton `Audio`, `URL.createObjectURL`, and `URL.revokeObjectURL` setup/restore pattern.
- Migrated low-risk singleton playback tests to the helper:
  - prepare then second-click play/stop;
  - browser-blocked playback fallback;
  - keyboard Play/Stop/Retry;
  - keyboard filter metadata/playback cleanup;
  - leaving Sounds Mode cleanup;
  - unmount cleanup.
- Left specialized tests with per-instance audio arrays, indexed object URLs, or deferred process/contracts/blob stages unchanged to avoid weakening coverage.
- No production code change was needed.

Files Changed:
- `frontend/tests/unit/modules/layout/WorkspaceMockLayout.viewportWiring.test.tsx`
- `docs/loops/sounds-mode-loop.md`

Tests and Build:
- Passed: `npx vitest run tests/unit/modules/layout/WorkspaceMockLayout.viewportWiring.test.tsx tests/unit/modules/sounds/httpSoundApiPort.test.ts`
- Passed: frontend `npm run build`
- Note: Vitest still prints existing React `act(...)` warnings in unrelated workspace layout tests; focused assertions pass.
- Note: Vite still reports the existing large chunk-size warning after production build.

QA:
- Browser QA not run; this is a test-only helper consolidation with no runtime behavior change. The focused component-level Sounds Mode catalog/player regressions stayed green.

Blockers / Follow-up Evidence Needed:
- Live Browser playback against a running frontend/backend still needs a stable Browser path.
- `lc_sounds.hak` is still absent from the configured local HAK directory.
- Full vanilla ingestion remains intentionally capped/manual because local vanilla discovery is very large.
- Retail-canonical sound semantics remain unclaimed without hard retail/runtime/capture comparison evidence.

Next Step:
- Re-read the latest Sounds Domain Coordinator directives before selecting the next slice. If no newer directive exists, a narrow playback-first candidate is to audit whether the focused Sounds Mode layout tests can share a tiny render helper for `WorkspaceMockLayout` in `sounds_mode` without hiding per-test dependencies or weakening coverage.

## Iteration 81 - Sounds Mode Render Helper Consolidation QA

Upstream Directive Evidence:
- upstreamDirectiveRead: true
- upstreamDirectiveSource: `backend/docs/aurora-reverse/guard-reports/sounds-domain-coordinator-latest.md`; `backend/docs/aurora-reverse/guard-reports/sounds-domain-coordinator-latest.json`
- upstreamDirectiveTimestampOrVersion: `2026-06-16T21:57:22.8357142+02:00 / aurora-web-global-coordinator-report/v1 / throughput_healthy_freshness_watch_vfx_placeables` (Domain Coordinator report generated `2026-06-16T22:13:44+02:00`)
- directiveCompliance: compliant
- deviationOrBlocker: none. The latest coordinator report still named the Iteration 80 playback setup/teardown helper directive, which was already completed and recorded. To avoid repeating a satisfied directive, this heartbeat followed the Iteration 80 loop-note next step as a distinct playback-first QA/test-maintenance slice. It is test-only, preserves AURORA FIRST, and does not add canvas placement, generic Areas work, VFX work, heartbeat automation changes, or retail/canonical claims.

Governor Advisory:
- Read `docs/loops/sounds-mode-governor.md` as advisory evidence.
- Applied: retained the catalog/player pivot and avoided older canvas/renderObjectIds drift.
- Deferred: no Governor scheduling input was used.
- Blocking status: none.

Scope:
- Continue Sounds Mode as a playback-first catalog/player workflow after Iteration 80.
- Exactly one narrow frontend QA/test-maintenance slice: audit whether focused Sounds Mode layout tests can share a tiny `sounds_mode` render helper without hiding per-test dependencies or weakening coverage.
- Preserve Iteration 71 failure/retry, Iteration 72 filter/selection cleanup, Iteration 73 leaving/unmount cleanup, Iteration 74 pending stale-request guard, Iteration 75 prepared audio error handling, Iteration 76 Play/Stop label/status-region semantics, Iteration 77 keyboard Play/Stop/Retry flow, Iteration 78 keyboard filter retention coverage, Iteration 79 keyboard activation helper consolidation, and Iteration 80 playback setup/teardown helper consolidation.
- No area sound object contract changes.
- No canvas placement work. No VFX work. No heartbeat automation changes. No retail-canonical behavior claimed.

Changes:
- Added a file-local `renderSoundsModeWorkspace(...)` helper in `WorkspaceMockLayout.viewportWiring.test.tsx` for the repeated focused `WorkspaceMockLayout` render setup in `sounds_mode`.
- Kept the helper explicit by accepting only the dependencies that the migrated tests vary:
  - `soundApiPort`;
  - `trackTelemetryEvent`.
- Migrated low-risk playback-first tests whose render setup was identical:
  - prepare then second-click play/stop;
  - browser-blocked playback fallback;
  - keyboard Play/Stop/Retry;
  - keyboard filter metadata/playback cleanup;
  - unmount cleanup.
- Left tests with custom `rerender`, deferred backend pipeline stages, or specialized layout setup unchanged.
- No production code change was needed.

Files Changed:
- `frontend/tests/unit/modules/layout/WorkspaceMockLayout.viewportWiring.test.tsx`
- `docs/loops/sounds-mode-loop.md`

Tests and Build:
- Passed: `npx vitest run tests/unit/modules/layout/WorkspaceMockLayout.viewportWiring.test.tsx tests/unit/modules/sounds/httpSoundApiPort.test.ts`
- Passed: frontend `npm run build`
- Note: Vitest still prints existing React `act(...)` warnings in unrelated workspace layout tests; focused assertions pass.
- Note: Vite still reports the existing large chunk-size warning after production build.

QA:
- Browser QA not run; this is a test-only helper consolidation with no runtime behavior change. The focused component-level Sounds Mode catalog/player regressions stayed green.

Blockers / Follow-up Evidence Needed:
- Live Browser playback against a running frontend/backend still needs a stable Browser path.
- `lc_sounds.hak` is still absent from the configured local HAK directory.
- Full vanilla ingestion remains intentionally capped/manual because local vanilla discovery is very large.
- Retail-canonical sound semantics remain unclaimed without hard retail/runtime/capture comparison evidence.

Next Step:
- Re-read the latest Sounds Domain Coordinator directives before selecting the next slice. If no newer directive exists, a narrow playback-first candidate is to audit whether the focused Sounds Mode tests still need a small assertion helper for common prepared/playing cleanup expectations, but only if it keeps assertions explicit and does not weaken coverage.

## Iteration 82 - Prepared Playing Cleanup Assertion Helper QA

Upstream Directive Evidence:
- upstreamDirectiveRead: true
- upstreamDirectiveSource: `backend/docs/aurora-reverse/guard-reports/sounds-domain-coordinator-latest.md`; `backend/docs/aurora-reverse/guard-reports/sounds-domain-coordinator-latest.json`
- upstreamDirectiveTimestampOrVersion: `2026-06-16T22:20:51.4118011+02:00 / aurora-web-global-coordinator-report/v1 / throughput_healthy_all_domains_fresh_upper_band` (Domain Coordinator report generated `2026-06-16T22:41:14+02:00`)
- directiveCompliance: compliant
- deviationOrBlocker: none. This slice implements the Domain Coordinator `worker-audit-prepared-playing-cleanup-assertion-helper` directive. It is test-only, preserves AURORA FIRST, and does not add canvas placement, generic Areas work, VFX work, heartbeat automation changes, or retail/canonical claims.

Governor Advisory:
- Not required as a blocking dependency. The refreshed coordinator report states Governor is stale relative to Worker closure and Worker must not wait for Governor.
- Applied: retained the catalog/player pivot and avoided older canvas/renderObjectIds drift.
- Deferred: no Governor scheduling input was used.
- Blocking status: none.

Scope:
- Continue Sounds Mode as a playback-first catalog/player workflow after Iteration 81.
- Exactly one narrow frontend QA/test-maintenance slice: audit whether focused Sounds Mode tests need a small assertion helper for common prepared/playing cleanup expectations.
- Preserve Iteration 71 failure/retry, Iteration 72 filter/selection cleanup, Iteration 73 leaving/unmount cleanup, Iteration 74 pending stale-request guard, Iteration 75 prepared audio error handling, Iteration 76 Play/Stop label/status-region semantics, Iteration 77 keyboard Play/Stop/Retry flow, Iteration 78 keyboard filter retention coverage, Iteration 79 keyboard activation helper consolidation, Iteration 80 playback setup/teardown helper consolidation, and Iteration 81 render helper consolidation.
- No area sound object contract changes.
- No canvas placement work. No VFX work. No heartbeat automation changes. No retail-canonical behavior claimed.

Changes:
- Added a file-local `expectSoundAudioCleanup(...)` helper in `WorkspaceMockLayout.viewportWiring.test.tsx` for the common cleanup assertion pattern:
  - `pause()` call count;
  - `removeAttribute("src")` call and call count;
  - `load()` call count;
  - optional object URL revoke URL or revoke call count.
- Migrated existing grouped cleanup assertions in focused Sounds Mode playback tests while leaving surrounding state-specific assertions explicit.
- Kept specialized assertions such as browser-blocked playback and non-cleanup pipeline checks outside the helper.
- No production code change was needed.

Files Changed:
- `frontend/tests/unit/modules/layout/WorkspaceMockLayout.viewportWiring.test.tsx`
- `docs/loops/sounds-mode-loop.md`

Tests and Build:
- Passed: `npx vitest run tests/unit/modules/layout/WorkspaceMockLayout.viewportWiring.test.tsx tests/unit/modules/sounds/httpSoundApiPort.test.ts`
- Passed: frontend `npm run build`
- Note: Vitest still prints existing React `act(...)` warnings in unrelated workspace layout tests; focused assertions pass.
- Note: Vite still reports the existing large chunk-size warning after production build.

QA:
- Browser QA not run; this is a test-only assertion helper consolidation with no runtime behavior change. The focused component-level Sounds Mode catalog/player regressions stayed green.

Blockers / Follow-up Evidence Needed:
- Live Browser playback against a running frontend/backend still needs a stable Browser path.
- `lc_sounds.hak` is still absent from the configured local HAK directory.
- Full vanilla ingestion remains intentionally capped/manual because local vanilla discovery is very large.
- Retail-canonical sound semantics remain unclaimed without hard retail/runtime/capture comparison evidence.

Next Step:
- Re-read the latest Sounds Domain Coordinator directives before selecting the next slice. If no newer directive exists, a narrow playback-first candidate is to audit for redundant busy/error status query helpers in the focused Sounds Mode playback tests, consolidating only if it keeps accessibility/status assertions explicit.

## Iteration 83 - Busy Error Status Assertion Helper QA

Upstream Directive Evidence:
- upstreamDirectiveRead: true
- upstreamDirectiveSource: `backend/docs/aurora-reverse/guard-reports/sounds-domain-coordinator-latest.md`; `backend/docs/aurora-reverse/guard-reports/sounds-domain-coordinator-latest.json`
- upstreamDirectiveTimestampOrVersion: `2026-06-16T22:20:51.4118011+02:00 / aurora-web-global-coordinator-report/v1 / throughput_healthy_all_domains_fresh_upper_band` (Domain Coordinator report generated `2026-06-16T22:41:14+02:00`)
- directiveCompliance: compliant
- deviationOrBlocker: none. The latest coordinator report still named the Iteration 82 prepared/playing cleanup assertion-helper directive, which was already completed and recorded. To avoid repeating a satisfied directive, this heartbeat followed the Iteration 82 loop-note next step as a distinct playback-first QA/test-maintenance slice. It is test-only, preserves AURORA FIRST, and does not add canvas placement, generic Areas work, VFX work, heartbeat automation changes, or retail/canonical claims.

Governor Advisory:
- Read `docs/loops/sounds-mode-governor.md` as advisory evidence.
- Applied: retained the catalog/player pivot and avoided older canvas/renderObjectIds drift.
- Deferred: no Governor scheduling input was used.
- Blocking status: none.

Scope:
- Continue Sounds Mode as a playback-first catalog/player workflow after Iteration 82.
- Exactly one narrow frontend QA/test-maintenance slice: audit redundant busy/error status query helpers in focused Sounds Mode playback tests.
- Preserve Iteration 71 failure/retry, Iteration 72 filter/selection cleanup, Iteration 73 leaving/unmount cleanup, Iteration 74 pending stale-request guard, Iteration 75 prepared audio error handling, Iteration 76 Play/Stop label/status-region semantics, Iteration 77 keyboard Play/Stop/Retry flow, Iteration 78 keyboard filter retention coverage, Iteration 79 keyboard activation helper consolidation, Iteration 80 playback setup/teardown helper consolidation, Iteration 81 render helper consolidation, and Iteration 82 cleanup assertion helper consolidation.
- No area sound object contract changes.
- No canvas placement work. No VFX work. No heartbeat automation changes. No retail-canonical behavior claimed.

Changes:
- Added a file-local `expectStatusRegionText(...)` helper in `WorkspaceMockLayout.viewportWiring.test.tsx`.
- Replaced the local `hasStatusText(...)` scanner inside the busy/ready/error accessibility test with the shared assertion helper.
- Kept accessibility/status semantics explicit: the helper still queries `role="status"` and asserts that at least one status region contains the expected text.
- Left visible row text, inspector state text, alert, button availability, and no Place-on-canvas assertions explicit in the test body.
- No production code change was needed.

Files Changed:
- `frontend/tests/unit/modules/layout/WorkspaceMockLayout.viewportWiring.test.tsx`
- `docs/loops/sounds-mode-loop.md`

Tests and Build:
- Passed: `npx vitest run tests/unit/modules/layout/WorkspaceMockLayout.viewportWiring.test.tsx tests/unit/modules/sounds/httpSoundApiPort.test.ts`
- Passed: frontend `npm run build`
- Note: Vitest still prints existing React `act(...)` warnings in unrelated workspace layout tests; focused assertions pass.
- Note: Vite still reports the existing large chunk-size warning after production build.

QA:
- Browser QA not run; this is a test-only assertion helper consolidation with no runtime behavior change. The focused component-level Sounds Mode catalog/player regressions stayed green.

Blockers / Follow-up Evidence Needed:
- Live Browser playback against a running frontend/backend still needs a stable Browser path.
- `lc_sounds.hak` is still absent from the configured local HAK directory.
- Full vanilla ingestion remains intentionally capped/manual because local vanilla discovery is very large.
- Retail-canonical sound semantics remain unclaimed without hard retail/runtime/capture comparison evidence.

Next Step:
- Re-read the latest Sounds Domain Coordinator directives before selecting the next slice. If no newer directive exists, a narrow playback-first candidate is to audit whether the current helper consolidation sequence should stop and return to product-facing catalog/player coverage, such as source-count/filter behavior, playback retry UX, or backend catalog completeness, depending on the next coordinator directive.

## Iteration 84 - Source Count Filter Product QA

Upstream Directive Evidence:
- upstreamDirectiveRead: true
- upstreamDirectiveSource: `backend/docs/aurora-reverse/guard-reports/sounds-domain-coordinator-latest.md`; `backend/docs/aurora-reverse/guard-reports/sounds-domain-coordinator-latest.json`
- upstreamDirectiveTimestampOrVersion: `2026-06-16T22:57:24.4496572+02:00 / aurora-web-global-coordinator-report/v1 / throughput_healthy_placeables_p1_routed` (Domain Coordinator report generated `2026-06-16T23:16:08+02:00`)
- directiveCompliance: compliant
- deviationOrBlocker: none. This slice implements `worker-product-facing-source-count-filter-coverage`, stops the helper-consolidation sequence, stays frontend catalog/player QA only, and does not add canvas placement, area sound contract changes, VFX work, heartbeat automation changes, or retail/canonical claims.

Governor Advisory:
- Not required as a blocking dependency. The refreshed coordinator report says Governor is stale relative to Worker Iteration 83 and Worker must not wait for Governor.
- Applied: retained the catalog/player pivot and avoided older canvas/renderObjectIds drift.
- Deferred: no Governor scheduling input was used.
- Blocking status: none.

Scope:
- Continue Sounds Mode as a playback-first catalog/player workflow after Iteration 83.
- Exactly one narrow product-facing QA slice around visible source-count/filter behavior.
- Preserve Iteration 71 failure/retry, Iteration 72 filter/selection cleanup, Iteration 73 leaving/unmount cleanup, Iteration 74 pending stale-request guard, Iteration 75 prepared audio error handling, Iteration 76 Play/Stop label/status-region semantics, Iteration 77 keyboard Play/Stop/Retry flow, Iteration 78 keyboard filter retention coverage, and Iterations 79-83 test-helper assertions.
- No area sound object contract changes.
- No canvas placement work. No VFX work. No heartbeat automation changes. No retail-canonical behavior claimed.

Changes:
- Tightened the expanded Sounds Mode catalog/player regression in `WorkspaceMockLayout.viewportWiring.test.tsx`.
- Added user-visible source filter assertions for `All`, `Vanilla`, `HAK`, `Module`, and `Other` using `SoundApiListItem.source.layer`.
- Verified source-count labels and row visibility for:
  - `All`: full `16` catalog count;
  - `Vanilla`: `2/16` with vanilla rows visible and HAK rows hidden;
  - `HAK`: `13/16` with HAK rows visible and vanilla rows hidden;
  - `Module`: `1/16` with module row visible and HAK rows hidden;
  - `Other`: `0/16` empty state with catalog rows hidden.
- Added combined category+source behavior for `Vanilla + Ambient`, proving a valid source filter can show a controlled `0/16` empty state and recover to `2/16` when category resets.
- Kept the existing selected vanilla metadata and playback prepare/play assertions in the same product-facing flow.
- No production code change was needed.

Files Changed:
- `frontend/tests/unit/modules/layout/WorkspaceMockLayout.viewportWiring.test.tsx`
- `docs/loops/sounds-mode-loop.md`

Tests and Build:
- Passed: `npx vitest run tests/unit/modules/layout/WorkspaceMockLayout.viewportWiring.test.tsx tests/unit/modules/sounds/httpSoundApiPort.test.ts`
- Passed: frontend `npm run build`
- Note: Vitest still prints existing React `act(...)` warnings in unrelated workspace layout tests; focused assertions pass.
- Note: Vite still reports the existing large chunk-size warning after production build.

QA:
- Browser QA not run; this is a focused component-level catalog/player QA slice. Live Browser playback remains covered only as a blocker until a stable running frontend/backend Browser path is available.

Blockers / Follow-up Evidence Needed:
- Live Browser playback against a running frontend/backend still needs a stable Browser path.
- `lc_sounds.hak` is still absent from the configured local HAK directory.
- Full vanilla ingestion remains intentionally capped/manual because local vanilla discovery is very large.
- Retail-canonical sound semantics remain unclaimed without hard retail/runtime/capture comparison evidence.

Next Step:
- Re-read the latest Sounds Domain Coordinator directives before selecting the next slice. If no newer directive exists, return to one narrow product-facing catalog/player QA item rather than helper reshaping, such as playback retry UX visibility or backend catalog completeness evidence.

## Iteration 85 - Playback Retry UX Visibility QA

Upstream Directive Evidence:
- upstreamDirectiveRead: true
- upstreamDirectiveSource: `backend/docs/aurora-reverse/guard-reports/sounds-domain-coordinator-latest.md`; `backend/docs/aurora-reverse/guard-reports/sounds-domain-coordinator-latest.json`
- upstreamDirectiveTimestampOrVersion: `2026-06-16T23:25:59.1912708+02:00 / aurora-web-global-coordinator-report/v1 / throughput_healthy_placeables_classification_vfx_freshness_watch` (Domain Coordinator report generated `2026-06-16T23:39:12+02:00`)
- directiveCompliance: compliant
- deviationOrBlocker: none. This slice implements `worker-playback-retry-ux-visibility`, stays frontend catalog/player QA only, preserves the Iteration 84 source-count/filter coverage, and does not continue helper reshaping, add canvas placement, change area sound contracts, do VFX work, modify heartbeat automation, or make retail/canonical claims.

Governor Advisory:
- Not required as a blocking dependency. The refreshed coordinator report says Governor is clean/current through Iteration 84 and Worker must not wait for Governor.
- Applied: retained the catalog/player pivot and avoided older canvas/renderObjectIds drift.
- Deferred: no Governor scheduling input was used.
- Blocking status: none.

Scope:
- Continue Sounds Mode as a playback-first catalog/player workflow after Iteration 84.
- Exactly one narrow product-facing QA slice around retry UX visibility after controlled backend playback pipeline errors.
- Preserve Iteration 71 failure/retry, Iteration 72 filter/selection cleanup, Iteration 73 leaving/unmount cleanup, Iteration 74 pending stale-request guard, Iteration 75 prepared audio error handling, Iteration 76 Play/Stop label/status-region semantics, Iteration 77 keyboard Play/Stop/Retry flow, Iteration 78 keyboard filter retention coverage, Iterations 79-83 helper assertions, and Iteration 84 source-count/filter behavior.
- No area sound object contract changes.
- No canvas placement work. No VFX work. No heartbeat automation changes. No retail-canonical behavior claimed.

Changes:
- Tightened the existing controlled playback pipeline failure regression in `WorkspaceMockLayout.viewportWiring.test.tsx`.
- After `process`, `contracts`, and `blob` failures, the test now explicitly verifies:
  - the selected sound metadata remains visible in the Sounds Mode inspector (`soundId`, `resref`, `category`, and `format`);
  - the visible status regions include `state: Error`;
  - the catalog row for the selected sound remains visible;
  - the Play button remains visible and enabled as the retry affordance;
  - the catalog still has no Place-on-canvas affordance;
  - retrying with that Play button recovers to the existing prepared/Ready flow.
- Kept the assertions test-local and did not change production code.

Files Changed:
- `frontend/tests/unit/modules/layout/WorkspaceMockLayout.viewportWiring.test.tsx`
- `docs/loops/sounds-mode-loop.md`

Tests and Build:
- Corrected during development: first focused Vitest run failed because a loose `/ambient/i` inspector assertion matched multiple metadata fields. The assertion was tightened to exact inspector row text.
- Passed: `npx vitest run tests/unit/modules/layout/WorkspaceMockLayout.viewportWiring.test.tsx tests/unit/modules/sounds/httpSoundApiPort.test.ts`
- Passed: frontend `npm run build`
- Note: Vitest still prints existing React `act(...)` warnings in unrelated workspace layout tests; focused assertions pass.
- Note: Vite still reports the existing large chunk-size warning after production build.

QA:
- Browser QA not run; this is a focused component-level catalog/player QA slice. Live Browser playback remains covered only as a blocker until a stable running frontend/backend Browser path is available.

Blockers / Follow-up Evidence Needed:
- Live Browser playback against a running frontend/backend still needs a stable Browser path.
- `lc_sounds.hak` is still absent from the configured local HAK directory.
- Full vanilla ingestion remains intentionally capped/manual because local vanilla discovery is very large.
- Retail-canonical sound semantics remain unclaimed without hard retail/runtime/capture comparison evidence.

Next Step:
- Re-read the latest Sounds Domain Coordinator directives before selecting the next slice. If no newer directive exists, continue one narrow product-facing catalog/player QA item rather than helper reshaping, such as retry visibility for prepared-audio playback errors or backend catalog completeness evidence.

## Iteration 86 - Prepared Audio Play Failure Retry UX QA

Upstream Directive Evidence:
- upstreamDirectiveRead: true
- upstreamDirectiveSource: `backend/docs/aurora-reverse/guard-reports/sounds-domain-coordinator-latest.md`; `backend/docs/aurora-reverse/guard-reports/sounds-domain-coordinator-latest.json`
- upstreamDirectiveTimestampOrVersion: `2026-06-16T23:45:35.5864827+02:00 / aurora-web-global-coordinator-report/v1 / throughput_healthy_vfx_worker_v2_migrated` (Domain Coordinator report generated `2026-06-17T00:06:36+02:00`)
- directiveCompliance: compliant
- deviationOrBlocker: none. This slice implements `worker-prepared-audio-playback-error-retry-visibility`, stays frontend catalog/player QA only, preserves Iteration 85 backend pipeline retry visibility, and does not continue helper reshaping, add canvas placement, change area sound contracts, do VFX work, modify heartbeat automation, or make retail/canonical claims.

Governor Advisory:
- Not required as a blocking dependency. The refreshed coordinator report says Governor is stale relative to Worker Iteration 85 closure and Worker must not wait for Governor.
- Applied: retained the catalog/player pivot and avoided older canvas/renderObjectIds drift.
- Deferred: no Governor scheduling input was used.
- Blocking status: none.

Scope:
- Continue Sounds Mode as a playback-first catalog/player workflow after Iteration 85.
- Exactly one narrow product-facing QA slice around retry UX visibility after a prepared audio object's `play()` attempt fails.
- Keep this distinct from Iteration 85 backend `process` / `contracts` / `blob` failure coverage.
- Preserve Iteration 71 failure/retry, Iteration 72 filter/selection cleanup, Iteration 73 leaving/unmount cleanup, Iteration 74 pending stale-request guard, Iteration 75 prepared audio error handling, Iteration 76 Play/Stop label/status-region semantics, Iteration 77 keyboard Play/Stop/Retry flow, Iteration 78 keyboard filter retention coverage, Iterations 79-83 helper assertions, Iteration 84 source-count/filter behavior, and Iteration 85 backend pipeline retry visibility.
- No area sound object contract changes.
- No canvas placement work. No VFX work. No heartbeat automation changes. No retail-canonical behavior claimed.

Changes:
- Added a focused Sounds Mode regression in `WorkspaceMockLayout.viewportWiring.test.tsx`: `shows a retry affordance when prepared audio playback fails`.
- The test prepares backend audio, then makes the second-click prepared `audio.play()` call reject with `prepared audio playback failed`.
- After that prepared playback error, the test verifies:
  - user-visible alert text: `Sound preview failed: prepared audio playback failed`;
  - selected sound metadata remains visible in the inspector (`soundId`, `resref`, `category`, `format`);
  - visible status regions include `state: Error`;
  - the selected catalog row remains visible;
  - Stop is cleared, Play remains visible/enabled as the retry affordance;
  - the prepared audio object URL is released;
  - no Place-on-canvas affordance appears;
  - retrying Play recovers through the existing prepared/Ready flow with a fresh backend audio preparation.
- Kept the assertions test-local and did not change production code.

Files Changed:
- `frontend/tests/unit/modules/layout/WorkspaceMockLayout.viewportWiring.test.tsx`
- `docs/loops/sounds-mode-loop.md`

Tests and Build:
- Passed: `npx vitest run tests/unit/modules/layout/WorkspaceMockLayout.viewportWiring.test.tsx tests/unit/modules/sounds/httpSoundApiPort.test.ts`
- Passed: frontend `npm run build`
- Note: Vitest still prints existing React `act(...)` warnings in unrelated workspace layout tests; focused assertions pass.
- Note: Vite still reports the existing large chunk-size warning after production build.

QA:
- Browser QA not run; this is a focused component-level catalog/player QA slice. Live Browser playback remains covered only as a blocker until a stable running frontend/backend Browser path is available.

Blockers / Follow-up Evidence Needed:
- Live Browser playback against a running frontend/backend still needs a stable Browser path.
- `lc_sounds.hak` is still absent from the configured local HAK directory.
- Full vanilla ingestion remains intentionally capped/manual because local vanilla discovery is very large.
- Retail-canonical sound semantics remain unclaimed without hard retail/runtime/capture comparison evidence.

Next Step:
- Re-read the latest Sounds Domain Coordinator directives before selecting the next slice. If no newer directive exists, continue one narrow product-facing catalog/player QA item rather than helper reshaping, such as live Browser playback readiness evidence or backend catalog completeness evidence.

## Iteration 87 - Live Browser Playback Readiness Evidence

Upstream Directive Evidence:
- upstreamDirectiveRead: true
- upstreamDirectiveSource: `backend/docs/aurora-reverse/guard-reports/sounds-domain-coordinator-latest.md`; `backend/docs/aurora-reverse/guard-reports/sounds-domain-coordinator-latest.json`
- upstreamDirectiveTimestampOrVersion: `2026-06-17T00:09:27.9777140+02:00 / aurora-web-global-coordinator-report/v1 / throughput_healthy_backend_runtime_watch` (Domain Coordinator report generated `2026-06-17T00:22:10+02:00`)
- directiveCompliance: compliant
- deviationOrBlocker: none. This slice implements `worker-live-browser-playback-readiness-evidence`, stays playback/catalog QA only, preserves Iterations 71-86 behavior, and does not add canvas placement, change area sound contracts, do VFX work, modify heartbeat automation, or make retail/canonical claims.

Runtime Health Fields:
- defaultBackendRuntimeHealthDependency: yes for this slice. Live Browser playback readiness used the default local backend on port `3000`.
- defaultBackendRuntimeHealthObserved: healthy for default backend and frontend during this slice.
  - `GET http://127.0.0.1:3000/api/v1/health` returned `{"status":"ok","service":"aurora-backend"}`.
  - `GET http://127.0.0.1:5173/` returned HTTP 200 from the Vite app.
  - Unauthenticated `GET /api/v1/catalog/sounds` returned HTTP 401, as expected for the protected catalog.
  - Authenticated `GET /api/v1/catalog/sounds?limit=20&offset=0` with `builder.user` returned `total: 16`.
- fallbackOrIsolatedRuntimeUsed: false for backend/app runtime. The probe used the current local Vite app on `5173` and default backend on `3000`. The in-app Browser control tool was not available in this thread, so the UI probe used installed Chrome headless through CDP against the same local app/backend, not an isolated backend or mock runtime.
- infraFailureSeparatedFromDomainDebt: true. Backend/API health failures would be classified as `infrastructure_runtime_health`; this slice found backend/API health and delivery healthy, while live browser audio playback remained incomplete via controlled UI error handling.

Governor Advisory:
- Not required as a blocking dependency. The refreshed coordinator report says Governor audited Iteration 86 cleanly and Worker must not wait for Governor.
- Applied: retained playback-first catalog/player scope and backend-runtime health classification.
- Deferred: no Governor scheduling input was used.
- Blocking status: none.

Scope:
- Continue Sounds Mode as a playback-first catalog/player workflow after Iteration 86.
- Exactly one live Browser playback readiness evidence slice against the current local app/backend path.
- Preserve Iteration 71 failure/retry, Iteration 72 filter/selection cleanup, Iteration 73 leaving/unmount cleanup, Iteration 74 pending stale-request guard, Iteration 75 prepared audio error handling, Iteration 76 Play/Stop label/status-region semantics, Iteration 77 keyboard Play/Stop/Retry flow, Iteration 78 keyboard filter retention coverage, Iterations 79-83 helper assertions, Iteration 84 source-count/filter behavior, Iteration 85 backend pipeline retry visibility, and Iteration 86 prepared-audio retry visibility.
- No area sound object contract changes.
- No canvas placement work. No VFX work. No heartbeat automation changes. No retail-canonical behavior claimed.

Live Readiness Evidence:
- Backend authenticated catalog readiness:
  - Login with `builder.user` / `builder123` succeeded and returned a bearer token.
  - Authenticated catalog listed 16 sounds, including `sound_al_an_bees1`, `sound_al_an_bugs1`, `sound_dia_hakon_add_12`, and HAK `port_*` sounds.
- Backend audio delivery readiness for `sound_al_an_bees1`:
  - `POST /api/v1/catalog/sounds/sound_al_an_bees1/process` returned cache key `71866f6ff3613ba9fa504c9f743fda2cc7867e120ec0a3e105114173bbc55936`.
  - `GET /api/v1/catalog/sounds/cache/{cacheKey}/audio/contracts?mode=proxy` returned `audio/wav`.
  - `curl.exe` download of `/audio` returned HTTP 200, `content-type: audio/wav`, `content-length: 220220`, and first bytes `52 49 46 46 34 5C 03 00 57 41 56 45` (`RIFF....WAVE`).
- Live Chrome UI readiness:
  - Chrome headless via CDP reached `http://127.0.0.1:5173/login`, signed in as `builder.user`, navigated to `/app`, switched to `Sounds Mode`, and loaded the 16-item catalog.
  - Selected `al_an_bees1`; inspector showed `sound_al_an_bees1`, source `vanilla`, `GI_sound_rndm / RandomSound`, format `wav`, and duration `2.5s`.
  - Clicking `Play al_an_bees1` produced a controlled UI error: `Backend audio pipeline returned an audio payload that could not be played.`
  - The error was visible both as `role="alert"` and `role="status"`; `state: Error` was visible.
  - The selected sound row remained visible, selected metadata remained visible, `Play al_an_bees1` remained enabled as the retry affordance, Stop was absent, and no Place-on-canvas affordance appeared.

Classification:
- defaultBackendRuntimeHealthObserved: healthy.
- Backend catalog/process/contracts/audio delivery: healthy for the probed sound.
- Live browser playback readiness: incomplete. The live browser reached controlled error handling before successful audio playback.
- Failure classification: not `infrastructure_runtime_health` for backend/API, and not proven Sounds product debt. Evidence points to a browser audio decode/playback readiness issue for the delivered WAV payload or headless Chrome audio environment. The UI handled it safely with a visible controlled error and retry affordance.

Files Changed:
- `docs/loops/sounds-mode-loop.md`

Tests and Build:
- Passed: `npx vitest run tests/unit/modules/layout/WorkspaceMockLayout.viewportWiring.test.tsx tests/unit/modules/sounds/httpSoundApiPort.test.ts`
- Passed: frontend `npm run build`
- Note: Vitest still prints existing React `act(...)` warnings in unrelated workspace layout tests; focused assertions pass.
- Note: Vite still reports the existing large chunk-size warning after production build.

QA:
- Live UI probe performed with installed Chrome headless through CDP because this Codex thread did not expose the in-app Browser control tool.
- Browser playback was not confirmed as audible/playing; readiness evidence reached catalog, selection, backend audio delivery, and controlled playback-error/retry UI.

Blockers / Follow-up Evidence Needed:
- browser-live-playback-qa: actual successful audible/browser playback remains incomplete. Next evidence should determine whether the delivered WAV encoding is browser-decodable outside headless Chrome or whether the pipeline should provide a browser-friendlier preview format.
- `lc_sounds.hak` is still absent from the configured local HAK directory.
- Full vanilla ingestion remains intentionally capped/manual because local vanilla discovery is very large.
- Retail-canonical sound semantics remain unclaimed without hard retail/runtime/capture comparison evidence.

Next Step:
- Re-read the latest Sounds Domain Coordinator directives before selecting the next slice. If no newer directive exists, a narrow product-facing candidate is to inspect browser-decodability of the delivered WAV preview payload or add a backend/frontend readiness check that distinguishes delivered-audio decode failure from transport failure without claiming retail parity.

## Iteration 88 - Browser WAV Decodability Classification

Upstream Directive Evidence:
- upstreamDirectiveRead: true
- upstreamDirectiveSource: `backend/docs/aurora-reverse/guard-reports/sounds-domain-coordinator-latest.md`; `backend/docs/aurora-reverse/guard-reports/sounds-domain-coordinator-latest.json`
- upstreamDirectiveTimestampOrVersion: `2026-06-17T01:04:59.6934176+02:00 / aurora-web-global-coordinator-report/v1 / throughput_healthy_all_domains_dispatched_backend_watch_nonblocking` (Domain Coordinator report generated `2026-06-17T01:11:11+02:00`)
- directiveCompliance: compliant
- deviationOrBlocker: none. This slice implements `worker-browser-wav-decodability-classification`, stays playback/catalog QA only, preserves Iteration 87 backend transport evidence, and does not add canvas placement, change area sound contracts, do VFX work, modify heartbeat automation, or make retail/canonical claims.

Runtime Health Fields:
- defaultBackendRuntimeHealthDependency: yes for this slice. The classification fetched a fresh backend-delivered payload from the default local backend on port `3000`.
- defaultBackendRuntimeHealthObserved: healthy for default backend during this slice.
  - `GET http://127.0.0.1:3000/api/v1/health` returned `{"status":"ok","service":"aurora-backend"}`.
  - Authenticated `GET /api/v1/catalog/sounds?limit=20&offset=0` with `builder.user` returned `total: 16`.
  - `POST /api/v1/catalog/sounds/sound_al_an_bees1/process` returned cache key `71866f6ff3613ba9fa504c9f743fda2cc7867e120ec0a3e105114173bbc55936`.
  - `GET /api/v1/catalog/sounds/cache/{cacheKey}/audio` returned HTTP 200 with `content-type: audio/wav`, `content-length: 220220`, and first bytes `52 49 46 46 34 5C 03 00 57 41 56 45` (`RIFF....WAVE`).
- fallbackOrIsolatedRuntimeUsed: false for backend/app runtime. The payload came from the current default backend. Browser decodability was tested with installed Chrome headless through CDP against the exact downloaded payload bytes, not a mock audio payload or isolated backend.
- infraFailureSeparatedFromDomainDebt: true. Backend/API transport remained healthy. The decode failure is classified separately from infrastructure runtime health and from Sounds UI retry/error handling.

Governor Advisory:
- Not required as a blocking dependency. The refreshed coordinator report says Governor is stale relative to Worker Iteration 87 closure and Worker must not wait for Governor.
- Applied: retained playback-first catalog/player scope and backend-runtime health classification.
- Deferred: no Governor scheduling input was used.
- Blocking status: none.

Scope:
- Continue Sounds Mode as a playback-first catalog/player workflow after Iteration 87.
- Exactly one readiness classification slice around browser decodability of the backend-delivered WAV payload.
- Preserve Iteration 71 failure/retry, Iteration 72 filter/selection cleanup, Iteration 73 leaving/unmount cleanup, Iteration 74 pending stale-request guard, Iteration 75 prepared audio error handling, Iteration 76 Play/Stop label/status-region semantics, Iteration 77 keyboard Play/Stop/Retry flow, Iteration 78 keyboard filter retention coverage, Iterations 79-83 helper assertions, Iteration 84 source-count/filter behavior, Iteration 85 backend pipeline retry visibility, Iteration 86 prepared-audio retry visibility, and Iteration 87 live-readiness evidence.
- No area sound object contract changes.
- No canvas placement work. No VFX work. No heartbeat automation changes. No retail-canonical behavior claimed.

Readiness Evidence:
- Fresh backend payload:
  - soundId: `sound_al_an_bees1`
  - resref: `al_an_bees1`
  - cache key: `71866f6ff3613ba9fa504c9f743fda2cc7867e120ec0a3e105114173bbc55936`
  - bytes: `220220`
  - response content type: `audio/wav`
  - header: `RIFF` / `WAVE`
- Local WAV header parse:
  - chunks: `fmt `, `fact`, `data`
  - `fmt.audioFormat`: `17`
  - channels: `1`
  - sample rate: `44100`
  - bits per sample: `4`
  - block align: `1024`
  - classification hint: `IMA_ADPCM`
- Browser decode probe:
  - Launched installed Chrome headless with a temporary profile and CDP.
  - Loaded a small local diagnostic page that fetched the exact downloaded WAV bytes and called `AudioContext.decodeAudioData`.
  - Chrome returned `EncodingError: Unable to decode audio data`.

Classification:
- Backend/API transport failure: not observed. Health, catalog, process, contracts path, and audio download were healthy for the probed payload.
- Invalid/unsupported WAV payload: likely browser-unsupported payload. The file is a valid RIFF/WAVE container, but it is WAV format code `17` (`IMA_ADPCM`), not browser-friendly PCM. Chrome rejected the exact payload with `EncodingError`.
- Browser/headless audio decode limitation: possible but narrower than Iteration 87's play-path uncertainty. This slice bypassed autoplay/user-activation and HTMLAudioElement playback by using `AudioContext.decodeAudioData`; Chrome still could not decode the payload.
- Sounds UI retry/error handling: separate and preserved. Iteration 87 already showed the UI surfaces a controlled error, keeps selected metadata visible, and leaves Play available for retry. This slice did not find a new UI regression.

Files Changed:
- `docs/loops/sounds-mode-loop.md`

QA Artifacts:
- `.codex/tmp/sounds-wav-decode/sound_al_an_bees1.wav` - exact downloaded backend payload used for decode classification.
- `.codex/tmp/sounds-wav-decode/decode-wav.html` - local diagnostic page used by Chrome CDP for `decodeAudioData`.

Tests and Build:
- Passed: `npx vitest run tests/unit/modules/layout/WorkspaceMockLayout.viewportWiring.test.tsx tests/unit/modules/sounds/httpSoundApiPort.test.ts`
- Passed: frontend `npm run build`
- Note: Vitest still prints existing React `act(...)` warnings in unrelated workspace layout tests; focused assertions pass.
- Note: Vite still reports the existing large chunk-size warning after production build.

Blockers / Follow-up Evidence Needed:
- browser-live-playback-qa: actual successful browser playback remains incomplete because the current delivered preview WAV is IMA ADPCM and Chrome rejects it at decode time.
- browser-friendly-preview-format: likely next product/backend readiness step is to provide or transcode browser preview audio to a Chrome-decodable format, such as PCM WAV or another supported preview format, while preserving Aurora source provenance.
- `lc_sounds.hak` is still absent from the configured local HAK directory.
- Full vanilla ingestion remains intentionally capped/manual because local vanilla discovery is very large.
- Retail-canonical sound semantics remain unclaimed without hard retail/runtime/capture comparison evidence.

Next Step:
- Re-read the latest Sounds Domain Coordinator directives before selecting the next slice. If no newer directive exists, a narrow product-facing candidate is to add backend/frontend readiness coverage for browser-friendly preview delivery, likely by detecting/transcoding IMA ADPCM WAV previews to a Chrome-decodable preview payload without changing the source sound contract or claiming retail parity.

## Iteration 89 - Browser-Friendly Preview Delivery Readiness

Upstream Directive Evidence:
- upstreamDirectiveRead: true
- upstreamDirectiveSource: `backend/docs/aurora-reverse/guard-reports/sounds-domain-coordinator-latest.md`; `backend/docs/aurora-reverse/guard-reports/sounds-domain-coordinator-latest.json`; `backend/docs/aurora-reverse/guard-reports/ai-factory-director-latest.md`; `backend/docs/aurora-reverse/guard-reports/ai-factory-director-latest.json`
- upstreamDirectiveTimestampOrVersion: `2026-06-17T01:36:23.9664921+02:00 / aurora-web-global-coordinator-report/v1 / quality_gate_active_visible_p0_blocks_factory_health` (Domain Coordinator report generated `2026-06-17T01:38:20+02:00`)
- directiveCompliance: compliant
- deviationOrBlocker: none. This slice implements `worker-browser-friendly-preview-delivery-readiness`, produces playback/product readiness behavior backed by the real backend payload from Iteration 88, preserves source sound identity/provenance, and does not add canvas placement, create placeholders, change area sound contracts, do VFX or area work, modify heartbeat automation, or claim retail/canonical parity.

Runtime Health Fields:
- defaultBackendRuntimeHealthDependency: yes for evidence input. This slice used the default backend-delivered `sound_al_an_bees1` payload captured from port `3000` in Iteration 88.
- defaultBackendRuntimeHealthObserved: healthy in the refreshed Global/Sounds reports and in Iterations 87-88. This slice did not require a fresh backend restart to prove the pure delivery conversion path.
- fallbackOrIsolatedRuntimeUsed: false for source payload and backend implementation. The browser-decodability proof used installed Chrome headless through CDP against the exact backend payload after the new backend transcode function converted it to PCM WAV; no mock audio payload or isolated backend was used.
- infraFailureSeparatedFromDomainDebt: true. Backend/API transport was already healthy; the product blocker was browser preview decodability of IMA ADPCM WAV. This slice addresses that blocker in the backend proxy delivery path.

Governor Advisory:
- Not required as a blocking dependency. The refreshed coordinator report says Governor is stale relative to Worker Iteration 88 closure and Worker must not wait for Governor.
- Applied: retained playback-first catalog/player scope, no-placeholder policy, and backend-runtime health separation.
- Deferred: no Governor scheduling input was used.
- Blocking status: none.

Scope:
- Continue Sounds Mode as a playback-first catalog/player workflow after Iteration 88.
- Exactly one readiness slice around browser-friendly preview delivery for IMA ADPCM WAV sources.
- Preserve Iteration 88 classification: backend/API transport healthy; source preview WAV is RIFF/WAVE IMA ADPCM (`fmt.audioFormat=17`) and Chrome rejects the raw payload with `EncodingError`.
- Preserve backend/Aurora source metadata and contracts. The processed sound still exposes the original `soundId`, `resref`, source object key, source content type, source size, and etag through the cached sound metadata. Only the backend proxy delivery payload is converted when the blob is mono IMA ADPCM WAV.
- No area sound object contract changes.
- No canvas placement work. No VFX work. No heartbeat automation changes. No retail-canonical behavior claimed.

Changes:
- Added a browser-friendly proxy payload conversion inside `SoundsApplicationService.getProcessedSoundAudio`.
- The conversion detects RIFF/WAVE payloads with WAV `fmt.audioFormat=17` (`IMA_ADPCM`), mono, 4-bit samples, and a valid data chunk.
- Matching payloads are decoded to 16-bit PCM WAV bytes for the proxied audio response.
- Non-matching payloads are returned unchanged.
- The source metadata remains untouched:
  - `result.audio.objectKey` remains the original Aurora/backend object key.
  - `result.audio.sizeBytes` remains the original source size.
  - `result.audio.etag` remains the original source etag.
  - `SoundProcessingResult` identity/provenance fields are unchanged.
- The proxied `payload` gets browser-friendly PCM WAV bytes, `audio/wav`, a response-size matching the converted payload, and a content hash etag for the delivered body.

Product Evidence:
- Real source payload from Iteration 88:
  - soundId: `sound_al_an_bees1`
  - resref: `al_an_bees1`
  - source layer: `vanilla`
  - auroraUsage: `GI_sound_rndm / RandomSound`
  - original payload: `audio/wav`, `220220` bytes, RIFF/WAVE IMA ADPCM (`fmt.audioFormat=17`)
  - raw Chrome decode: rejected with `EncodingError`
- New backend conversion path applied to the real payload:
  - output artifact: `.codex/tmp/sounds-wav-decode/sound_al_an_bees1.browser-preview.pcm.wav`
  - output bytes: `875600`
  - output header: `RIFF` / `WAVE`
  - output WAV format: PCM (`fmt.audioFormat=1`)
  - output channels: `1`
  - output sample rate: `44100`
  - output bits per sample: `16`
  - output data bytes: `875556`
- Browser decodability after conversion:
  - Chrome headless CDP `AudioContext.decodeAudioData` succeeded on the converted payload.
  - Reported decoded result: `ok=true`, `channels=1`, `duration=9.9269375`, `length=476493`.
  - Chrome reported `sampleRate=48000` because the AudioContext resampled the decoded buffer to its context rate; the WAV header remains `44100`.

Files Changed:
- `backend/src/modules/sounds/application/sounds.application.service.ts`
- `backend/test/unit/sounds.application.service.spec.ts`
- `docs/loops/sounds-mode-loop.md`

QA Artifacts:
- `.codex/tmp/sounds-wav-decode/sound_al_an_bees1.wav` - original backend-delivered IMA ADPCM payload.
- `.codex/tmp/sounds-wav-decode/sound_al_an_bees1.browser-preview.pcm.wav` - PCM WAV output from the new backend transcode function.
- `.codex/tmp/sounds-wav-decode/decode-wav.html` - local Chrome CDP diagnostic page for `decodeAudioData`.

Tests and Build:
- Passed: backend `npm test -- --runInBand test/unit/sounds.application.service.spec.ts`
- Passed: backend `npm run build`

Live Endpoint / Browser QA Status:
- Product behavior is implemented and proved against the real backend payload through the new backend conversion function plus Chrome decode evidence.
- The running default backend on port `3000` was not restarted during this slice, so live endpoint/browser UI playback against `/api/v1/catalog/sounds/cache/{cacheKey}/audio` still needs a post-restart readiness check.
- This is not classified as Sounds product debt; it is the expected deployment/runtime refresh step after a backend code change.

Blockers / Follow-up Evidence Needed:
- live-endpoint-refresh: restart or otherwise refresh the default backend runtime, then re-run live endpoint/browser QA so `/audio` returns the PCM preview payload from the deployed service path.
- browser-live-playback-qa: successful browser playback through the actual Sounds Mode UI remains incomplete until live endpoint refresh is verified.
- duration-metadata-readiness: catalog duration remains sourced from existing metadata/estimation; after PCM preview delivery works live, consider whether displayed duration should reflect decoded sample count for ADPCM sources.
- `lc_sounds.hak` is still absent from the configured local HAK directory.
- Full vanilla ingestion remains intentionally capped/manual because local vanilla discovery is very large.
- Retail-canonical sound semantics remain unclaimed without hard retail/runtime/capture comparison evidence.

Next Step:
- Re-read the latest Sounds Domain Coordinator directives before selecting the next slice. If no newer directive exists, restart or refresh the default backend runtime and perform live endpoint/browser readiness QA proving that the deployed `/audio` proxy now delivers Chrome-decodable PCM preview bytes for `sound_al_an_bees1` while preserving source metadata.

## Iteration 90 - Live Endpoint Refresh Browser Playback QA

Upstream Directive Evidence:
- upstreamDirectiveRead: true
- upstreamDirectiveSource: `backend/docs/aurora-reverse/guard-reports/sounds-domain-coordinator-latest.md`; `backend/docs/aurora-reverse/guard-reports/sounds-domain-coordinator-latest.json`; `backend/docs/aurora-reverse/guard-reports/ai-factory-director-latest.md`; `backend/docs/aurora-reverse/guard-reports/ai-factory-director-latest.json`
- upstreamDirectiveTimestampOrVersion: `2026-06-17T01:51:04.3664209+02:00 / aurora-web-global-coordinator-report/v1 / factory_wide_rules_govern_demo_milestone_active` (Domain Coordinator report generated `2026-06-17T02:07:22+02:00`; refreshed Global report read at `2026-06-17T02:27:46.7643576+02:00`)
- directiveCompliance: compliant
- deviationOrBlocker: default `nest start --watch` did not reliably bind port `3000` during the runtime refresh attempt, so the same backend container was recovered with the compiled backend entrypoint `node dist/src/main.js`. This is classified as runtime/deployment health, not Sounds product debt. The live service path on `http://127.0.0.1:3000` was then healthy and verified with real backend/Aurora sound data. No canvas placement, placeholder sound object, VFX work, area work, heartbeat automation change, or retail/canonical parity claim was introduced.

Runtime Health Fields:
- defaultBackendRuntimeHealthDependency: yes. This slice depended on the default backend service path on port `3000`.
- defaultBackendRuntimeHealthObserved: healthy after refresh recovery. `GET http://127.0.0.1:3000/api/v1/health` returned `200` with `{"status":"ok","service":"aurora-backend"}`. Docker reported `aurora-backend-dev` as healthy and published on `0.0.0.0:3000->3000/tcp`.
- fallbackOrIsolatedRuntimeUsed: true for runtime recovery only. The fallback used the same backend container, mounted repo, backend data, database, port, and API service path, but launched the compiled entrypoint because the default watch process stayed unreliable during restart. No mock audio payload or isolated fake backend was used.
- infraFailureSeparatedFromDomainDebt: true. The default watch-command bind issue is infrastructure/runtime health. The verified Sounds product path uses the real backend endpoint, real cache key, real source metadata, and real downloaded `/audio` bytes.

Scope:
- Exactly one playback-first live endpoint/runtime refresh QA slice.
- Preserve Iteration 88 classification: raw source payload for `sound_al_an_bees1` is RIFF/WAVE IMA ADPCM (`fmt.audioFormat=17`) and Chrome rejects that raw payload.
- Preserve Iteration 89 backend conversion evidence: mono IMA ADPCM preview payload can be converted to browser-friendly PCM WAV while preserving original backend/Aurora source metadata.
- Verify the deployed live `/audio` endpoint now returns Chrome-decodable PCM preview bytes for `sound_al_an_bees1`.
- No code changes in this iteration. No catalog canvas placement work.

Live Endpoint Product Evidence:
- Backend health:
  - `GET /api/v1/health`: `200`, `{"status":"ok","service":"aurora-backend"}`
  - container: `aurora-backend-dev|Up ... (healthy)|0.0.0.0:3000->3000/tcp`
- Authenticated catalog/process/contracts path:
  - catalog probe: `GET /api/v1/catalog/sounds?search=al_an_bees1`
  - target row found: `soundId=sound_al_an_bees1`, `resref=al_an_bees1`
  - category: `effect`
  - format: `wav`
  - spatialMode: `3d`
  - playbackMode: `random`
  - source.layer: `vanilla`
  - auroraUsage: `GI_sound_rndm / RandomSound`
  - process endpoint: `POST /api/v1/catalog/sounds/sound_al_an_bees1/process`
  - cache key: `71866f6ff3613ba9fa504c9f743fda2cc7867e120ec0a3e105114173bbc55936`
  - original source object key preserved: `modules/current/__aurora/sources/vanilla/audio/wav/al_an_bees1.wav`
  - original source content type preserved: `audio/wav`
  - original source size preserved in process metadata: `220220`
  - original source etag preserved in process metadata: `bc4b8e4d20d91c8ba7d721588bf1f2d2`
- Live `/audio` response:
  - endpoint: `GET /api/v1/catalog/sounds/cache/71866f6ff3613ba9fa504c9f743fda2cc7867e120ec0a3e105114173bbc55936/audio`
  - response status: `200`
  - response content type: `audio/wav`
  - response content length: `875600`
  - response `x-aurora-sound-object-key`: `modules/current/__aurora/sources/vanilla/audio/wav/al_an_bees1.wav`
  - response etag: `6dcdba32aa339ea20b84fa997b29e513f1756d3ec70e52d32e9c0fba8ce7459e`
- Live WAV header parse from the exact downloaded endpoint response:
  - bytes: `875600`
  - container: `RIFF` / `WAVE`
  - chunks: `fmt `, `data`
  - `fmt.audioFormat`: `1` (`PCM`)
  - channels: `1`
  - sample rate: `44100`
  - bits per sample: `16`
  - data bytes: `875556`

Browser Decodability / Playback QA Status:
- Chrome headless CDP loaded a local diagnostic page and called `AudioContext.decodeAudioData` on the exact live endpoint-downloaded WAV file.
- Result: success.
- Chrome decode result:
  - `ok=true`
  - bytes: `875600`
  - channels: `1`
  - duration: `9.9269375`
  - decoded length: `476493`
  - decoded sampleRate: `48000` because the AudioContext resampled the decoded buffer to its context rate.
- Browser playback readiness status: endpoint-level browser decode blocker is resolved for the probed `sound_al_an_bees1` service path. Full interactive Sounds Mode UI playback was not rerun in this slice because the required product proof was the refreshed live `/audio` endpoint decodability; existing Iterations 71-86 still cover UI prepare/play/retry/error/status behavior through focused frontend tests.

Files Changed:
- `docs/loops/sounds-mode-loop.md`

QA Artifacts:
- `.codex/tmp/sounds-live-endpoint/sound_al_an_bees1.live-audio.wav` - exact live `/audio` endpoint response used for header and Chrome decode proof.
- `.codex/tmp/sounds-live-endpoint/sound_al_an_bees1.live-audio.headers.txt` - response headers for the live `/audio` download.
- `.codex/tmp/sounds-live-endpoint/live-audio-wav-header.json` - parsed WAV header for the live endpoint response.
- `.codex/tmp/sounds-live-endpoint/chrome-decode-live-endpoint.json` - Chrome CDP `AudioContext.decodeAudioData` result.
- `.codex/tmp/sounds-live-endpoint/live-endpoint-summary.json` - compact provenance, endpoint, header, and decode summary.
- `.codex/tmp/sounds-live-endpoint/catalog-search-response.json` - authenticated catalog response used to confirm source metadata.
- `.codex/tmp/sounds-live-endpoint/process-response.json` - authenticated process response used to confirm preserved original audio metadata.

Tests and Build:
- Not rerun in this iteration because no code changed after Iteration 89. This slice produced live endpoint/browser product evidence against the refreshed runtime path.
- Prior implementation gate still stands from Iteration 89:
  - Passed: backend `npm test -- --runInBand test/unit/sounds.application.service.spec.ts`
  - Passed: backend `npm run build`

Blockers / Follow-up Evidence Needed:
- default-backend-watch-runtime: `nest start --watch` was unreliable during refresh and needed compiled-entrypoint recovery in the same container. Smallest next infrastructure step is to inspect why the watch process did not bind `3000` after restart/rebuild and make the default compose command refresh-safe.
- browser-live-playback-ui: endpoint-level Chrome decodability is now confirmed, but a full interactive Sounds Mode UI play-through was not rerun in this slice.
- duration-metadata-readiness: catalog duration still reflects existing source metadata/estimation, while the converted PCM preview decodes to a longer duration in Chrome. Next product slice should decide whether preview duration display should be decoded-preview-based for ADPCM sources or remain source-metadata-based.
- `lc_sounds.hak` is still absent from the configured local HAK directory.
- Full vanilla ingestion remains intentionally capped/manual because local vanilla discovery is very large.
- Retail-canonical sound semantics remain unclaimed without hard retail/runtime/capture comparison evidence.

Next Step:
- Re-read the latest Sounds Domain Coordinator directives before selecting the next slice. If no newer directive exists, a narrow playback-first product candidate is either to run an interactive Sounds Mode UI playback smoke now that the live endpoint is Chrome-decodable, or to address the preview-duration metadata mismatch for browser-friendly converted ADPCM previews while preserving original source provenance.

## Iteration 91 - Interactive Sounds Mode Playback Smoke

Upstream Directive Evidence:
- upstreamDirectiveRead: true
- upstreamDirectiveSource: `backend/docs/aurora-reverse/guard-reports/sounds-domain-coordinator-latest.md`; `backend/docs/aurora-reverse/guard-reports/sounds-domain-coordinator-latest.json`
- upstreamDirectiveTimestampOrVersion: `2026-06-17T02:27:46.7643576+02:00 / aurora-web-global-coordinator-report/v1 / factory_wide_rules_gate_active_areas_needs_correction` (Domain Coordinator report generated `2026-06-17T02:41:31+02:00`)
- directiveCompliance: compliant
- deviationOrBlocker: the refreshed coordinator still listed `worker-live-endpoint-refresh-browser-playback-qa` as active because it was stale relative to local Iteration 90 closure. This heartbeat continued the same playback-first live/browser QA boundary by running the next product-facing UI smoke recorded in Iteration 90. No code, canvas placement, placeholder sound object, VFX work, area work, heartbeat automation change, or retail/canonical parity claim was introduced.

Runtime Health Fields:
- defaultBackendRuntimeHealthDependency: yes for the running UI smoke. Frontend used the local dev proxy against the backend service path.
- defaultBackendRuntimeHealthObserved: healthy enough for authenticated login, catalog load, process/contracts/audio, prepare, play, and stop through the Sounds Mode UI.
- fallbackOrIsolatedRuntimeUsed: true only insofar as Iteration 90 recovered the same backend container with the compiled backend entrypoint after the default watch command proved unreliable. This UI smoke used the live frontend on `5173` and live backend on `3000`, not mocked audio or an isolated fake backend.
- infraFailureSeparatedFromDomainDebt: true. The prior watch-command refresh issue remains runtime/deployment health; this slice found no Sounds product regression in the UI playback flow for the probed sound.

Governor Advisory:
- Read: `docs/loops/sounds-mode-governor.md`
- Applied: no canvas placement, no VFX, no retail/canonical claim, preserve playback-first catalog/player scope.
- Deferred: older governor notes before the corrected catalog/player pivot were not treated as scheduling input.
- Blocking status: none.

Scope:
- Exactly one playback-first live Browser/CDP UI smoke after Iteration 90 proved the live `/audio` endpoint is Chrome-decodable PCM.
- Use existing backend Sounds contracts and frontend Sounds Mode catalog/player UI.
- No source code changes.

Interactive QA Evidence:
- Browser driver: installed Chrome headless through CDP. Playwright is not installed in the workspace, so no new dependency was added.
- Frontend route: `http://127.0.0.1:5173/login?mode=sounds_mode`
- Authenticated with the normal login form as `builder.user`.
- Landed on `http://127.0.0.1:5173/app?mode=sounds_mode`.
- Sounds Mode loaded a catalog count of `16`.
- Target row selected: `al_an_bees1`.
- Selected metadata remained visible in the inspector:
  - `soundId: sound_al_an_bees1`
  - `resref: al_an_bees1`
  - `category: effect`
  - `format: wav`
  - `source: vanilla`
  - `spatialMode: 3d`
  - `playbackMode: random`
  - `auroraUsage: GI_sound_rndm / RandomSound`
  - `duration: 2.5s`
- Playback flow:
  - first `Play al_an_bees1` clicked.
  - UI reached Ready state with `Ready to play from backend audio cache`.
  - second `Play al_an_bees1` clicked.
  - UI reached Playing state with `Playing from backend audio cache`.
  - `Stop al_an_bees1` was available and clicked.
  - after Stop, playback state cleared while selected metadata remained visible.
- The UI still showed no catalog placement prerequisite. Playback was driven directly from the Sounds Mode list/inspector.

Files Changed:
- `docs/loops/sounds-mode-loop.md`

QA Artifacts:
- `.codex/tmp/sounds-ui-playback-smoke/sounds-mode-ui-playback-smoke.json` - CDP step/result evidence.
- `.codex/tmp/sounds-ui-playback-smoke/sounds-mode-ui-playback-smoke.png` - screenshot after the smoke.

Tests and Build:
- Not rerun in this iteration because no code changed. This slice produced live UI playback product evidence against the running frontend/backend.
- Prior gates still stand:
  - Iteration 89 backend `npm test -- --runInBand test/unit/sounds.application.service.spec.ts`
  - Iteration 89 backend `npm run build`
  - Iterations 71-86 focused frontend tests for prepare/play/retry/error/status/cleanup behavior.

Blockers / Follow-up Evidence Needed:
- default-backend-watch-runtime: the underlying `nest start --watch` refresh unreliability remains open as infrastructure/runtime health.
- duration-metadata-readiness: UI displays source/catalog duration `2.5s`, while the browser-friendly converted PCM preview decodes to `9.9269375s`. This mismatch needs a product decision or implementation slice.
- `lc_sounds.hak` remains absent from the configured local HAK directory.
- Full vanilla ingestion remains intentionally capped/manual because local vanilla discovery is very large.
- Retail-canonical sound semantics remain unclaimed without hard retail/runtime/capture comparison evidence.

Next Step:
- Re-read the latest Sounds Domain Coordinator directives before selecting the next slice. If no newer directive exists, address the preview-duration metadata mismatch for browser-friendly converted ADPCM previews while preserving original source provenance, or separately investigate the default `nest start --watch` refresh reliability as infrastructure/runtime health.

## Iteration 92 - Preview Duration Metadata Readiness

Upstream Directive Evidence:
- upstreamDirectiveRead: true
- upstreamDirectiveSource: `backend/docs/aurora-reverse/guard-reports/sounds-domain-coordinator-latest.md`; `backend/docs/aurora-reverse/guard-reports/sounds-domain-coordinator-latest.json`
- upstreamDirectiveTimestampOrVersion: `2026-06-17T02:27:46.7643576+02:00 / aurora-web-global-coordinator-report/v1 / factory_wide_rules_gate_active_areas_needs_correction` (Domain Coordinator report generated `2026-06-17T03:14:06+02:00`)
- directiveCompliance: compliant
- deviationOrBlocker: implemented the narrow preview-duration readiness behavior without rewriting Aurora/source duration metadata, without adding canvas placement, without placeholder visual sound objects, without VFX/area work, without heartbeat automation changes, and without retail/canonical parity claims.

Runtime Health Fields:
- defaultBackendRuntimeHealthDependency: no for this code/test slice. Iterations 90-91 remain the live baseline: the recovered default backend path was healthy, `/audio` returned Chrome-decodable PCM bytes for `sound_al_an_bees1`, and the live Sounds Mode UI reached Ready, Playing, and Stop.
- defaultBackendRuntimeHealthObserved: not reprobed in this slice because the touched behavior is deterministic frontend playback metadata presentation. Baseline from Iterations 90-91 remains healthy after compiled-entrypoint recovery.
- fallbackOrIsolatedRuntimeUsed: no new fallback or isolated runtime in this slice. Prior compiled-entrypoint recovery remains classified as runtime health, not a mock or fake backend.
- infraFailureSeparatedFromDomainDebt: true. Default watch-command reliability remains infrastructure/runtime health; this slice addresses the product metadata mismatch in the Sounds Mode playback UI.

Governor Advisory:
- Read: `docs/loops/sounds-mode-governor.md`
- Applied: no canvas placement, no VFX, no retail/canonical claim, preserve playback-first catalog/player scope.
- Deferred: the visible governor tail is stale relative to Iterations 90-91 and the current coordinator directive, so it was not treated as scheduling input.
- Blocking status: none.

Scope:
- Exactly one playback-first product slice for preview-duration metadata readiness.
- Preserve source/catalog duration as the backend/Aurora metadata field.
- Add separate prepared-preview duration evidence to the playback delivery state and inspector when the browser can derive it from the fetched preview payload.

Implementation:
- `SoundPlaybackDeliveryEvidence` now carries optional `preview` metadata with `durationMs` and explicit `durationSource: "browser-preview"`.
- During prepare, the Sounds Mode playback pipeline now derives preview duration from `AudioContext.decodeAudioData(blob.arrayBuffer())`, with a browser audio-element duration fallback when available.
- The selected sound inspector now displays source `duration` and separate `preview duration` under delivery evidence, so the ADPCM-to-PCM preview duration can be surfaced without changing the original source identity, source layer, object key, or catalog duration.
- If the browser cannot decode or expose duration, the UI simply omits preview duration and keeps the existing Ready/Error retry behavior.

Product Evidence:
- Iterations 90-91 established the real sound baseline for `sound_al_an_bees1`: catalog/source duration `2.5s`, source layer `vanilla`, source object key `modules/current/__aurora/sources/vanilla/audio/wav/al_an_bees1.wav`, converted live PCM preview decodes in Chrome to `9.9269375s`, and UI playback reached Ready/Playing/Stop.
- This slice implements the product decision to show decoded/browser preview duration separately as `browser-preview` provenance instead of overwriting the catalog/source duration.
- Focused UI coverage verifies that after prepare, the inspector keeps `duration: 2.4s` from the source fixture while also showing `preview duration: 9.9s (browser-preview)` from the browser preview path and the existing delivery metadata.

Files Changed:
- `frontend/src/modules/layout/components/WorkspaceMockLayout.tsx`
- `frontend/tests/unit/modules/layout/WorkspaceMockLayout.viewportWiring.test.tsx`
- `docs/loops/sounds-mode-loop.md`

Tests and Build:
- Passed: `cd frontend; npm test -- --run tests/unit/modules/layout/WorkspaceMockLayout.viewportWiring.test.tsx`
  - Result: 67 tests passed.
  - Note: pre-existing React `act(...)` warnings still appear in older workspace-mode tests.
- Passed: `cd frontend; npm run build`
  - Note: existing Vite large chunk warning remains.

Browser QA:
- Not rerun in this slice. Iteration 91 already produced live UI Ready/Playing/Stop evidence against the recovered backend. This slice added deterministic frontend product behavior for displaying preview duration once prepared audio evidence exists.

Blockers / Follow-up Evidence Needed:
- default-backend-watch-runtime: `nest start --watch` refresh reliability remains an infrastructure/runtime health issue.
- live-preview-duration-ui-proof: a future live UI smoke can confirm the actual `sound_al_an_bees1` inspector shows source `2.5s` plus preview `9.9s (browser-preview)` after prepare.
- `lc_sounds.hak` remains absent from the configured local HAK directory.
- Full vanilla ingestion remains intentionally capped/manual because local vanilla discovery is very large.
- Retail-canonical sound semantics remain unclaimed without hard retail/runtime/capture comparison evidence.

Next Step:
- Re-read the latest Sounds Domain Coordinator directives before selecting the next slice. If no newer directive exists, run a narrow live UI smoke for the new preview-duration inspector field on `sound_al_an_bees1`, or address the default backend watch-runtime refresh reliability as infrastructure/runtime health.

## Iteration 93 - Live Preview Duration Inspector Smoke

Upstream Directive Evidence:
- upstreamDirectiveRead: true
- upstreamDirectiveSource: `backend/docs/aurora-reverse/guard-reports/sounds-domain-coordinator-latest.md`; `backend/docs/aurora-reverse/guard-reports/sounds-domain-coordinator-latest.json`
- upstreamDirectiveTimestampOrVersion: `2026-06-17T02:27:46.7643576+02:00 / aurora-web-global-coordinator-report/v1 / factory_wide_rules_gate_active_areas_needs_correction` (Domain Coordinator report generated `2026-06-17T03:14:06+02:00`)
- directiveCompliance: compliant
- deviationOrBlocker: the coordinator report was stale relative to local Iteration 92 completion, so this heartbeat followed the recorded next playback-first step: live UI evidence for the new preview-duration inspector field. No canvas placement, placeholder visual sound object, VFX/area work, heartbeat automation change, or retail/canonical parity claim was introduced.

Runtime Health Fields:
- defaultBackendRuntimeHealthDependency: yes for this live UI smoke.
- defaultBackendRuntimeHealthObserved: healthy. `GET http://127.0.0.1:3000/api/v1/health` returned `{"status":"ok","service":"aurora-backend"}` and `GET http://127.0.0.1:5173/login?mode=sounds_mode` returned `200`.
- fallbackOrIsolatedRuntimeUsed: no new backend fallback or isolated runtime. The smoke used the running frontend on `5173` and backend on `3000`. The prior compiled-entrypoint recovery remains historical runtime health context only.
- infraFailureSeparatedFromDomainDebt: true. The in-app Browser plugin bootstrap failed because its advertised `scripts/browser-client.mjs` file was missing, so the smoke used a local Chrome/CDP probe. That tool-surface issue is not Sounds product debt.

Governor Advisory:
- Read: `docs/loops/sounds-mode-governor.md`
- Applied: no canvas placement, no VFX, no retail/canonical claim, preserve playback-first catalog/player scope.
- Deferred: visible governor tail remains stale relative to Iterations 90-93 and was not treated as scheduling input.
- Blocking status: none.

Scope:
- Exactly one playback-first live UI smoke for the Iteration 92 preview-duration display behavior.
- No production code changes in this iteration.

Live UI Product Evidence:
- Frontend route: `http://127.0.0.1:5173/app?mode=sounds_mode`
- Auth state: seeded through the normal local auth API as `builder.user`.
- Sounds Mode catalog loaded `16` items.
- Target selected: `sound_al_an_bees1` / `al_an_bees1`.
- Selected metadata remained visible:
  - `soundId: sound_al_an_bees1`
  - `resref: al_an_bees1`
  - `category: effect`
  - `format: wav`
  - `source: vanilla`
  - `spatialMode: 3d`
  - `playbackMode: random`
  - `auroraUsage: GI_sound_rndm / RandomSound`
- Playback prepare evidence:
  - First `Play al_an_bees1` clicked.
  - UI reached Ready state: `Ready to play from backend audio cache. Click Play again.`
  - Stop was available in Ready state.
  - Catalog remained usable and no `Place al_an_bees1 on canvas` affordance was present.
- Duration/provenance evidence:
  - Source/catalog duration remained visible as `duration: 2.5s`.
  - Separate browser preview evidence was visible as `preview duration: 9.9s (browser-preview)`.
  - Delivery remained real backend/Aurora metadata: `delivery: vanilla / proxy / audio/wav / 215 KB`.
  - Source object key remained `modules/current/__aurora/sources/vanilla/audio/wav/al_an_bees1.wav`.

Files Changed:
- `docs/loops/sounds-mode-loop.md`
- `.codex/tmp/sounds-preview-duration-ui-smoke.mjs` (temporary local QA harness)

QA Artifacts:
- `.codex/tmp/sounds-preview-duration-ui-smoke/sounds-preview-duration-ui-smoke.json` - live UI smoke result.
- `.codex/tmp/sounds-preview-duration-ui-smoke/sounds-preview-duration-ui-smoke.png` - screenshot after Ready state with preview duration.

Tests and Build:
- Not rerun in this iteration because production/test code did not change after Iteration 92.
- Prior gates still stand:
  - Iteration 92: `cd frontend; npm test -- --run tests/unit/modules/layout/WorkspaceMockLayout.viewportWiring.test.tsx` passed with 67 tests.
  - Iteration 92: `cd frontend; npm run build` passed with the existing Vite large chunk warning.

Blockers / Follow-up Evidence Needed:
- in-app-browser-plugin-bootstrap: the Browser skill's advertised `C:/Users/enonw/.codex/plugins/cache/openai-bundled/browser/26.609.41114/scripts/browser-client.mjs` was missing, so in-app Browser automation could not be used. Local Chrome/CDP live QA succeeded instead.
- default-backend-watch-runtime: `nest start --watch` refresh reliability remains an infrastructure/runtime health issue.
- `lc_sounds.hak` remains absent from the configured local HAK directory.
- Full vanilla ingestion remains intentionally capped/manual because local vanilla discovery is very large.
- Retail-canonical sound semantics remain unclaimed without hard retail/runtime/capture comparison evidence.

Next Step:
- Re-read the latest Sounds Domain Coordinator directives before selecting the next slice. If no newer directive exists, either keep playback-first UI readiness moving with a narrow second-click Playing smoke that also preserves preview duration, or address the default backend watch-runtime refresh reliability as infrastructure/runtime health.

## Iteration 94 - Live Preview Duration Playing Smoke

Upstream Directive Evidence:
- upstreamDirectiveRead: true
- upstreamDirectiveSource: `backend/docs/aurora-reverse/guard-reports/sounds-domain-coordinator-latest.md`; `backend/docs/aurora-reverse/guard-reports/sounds-domain-coordinator-latest.json`
- upstreamDirectiveTimestampOrVersion: `2026-06-17T02:27:46.7643576+02:00 / aurora-web-global-coordinator-report/v1 / factory_wide_rules_gate_active_areas_needs_correction` (Domain Coordinator report generated `2026-06-17T03:14:06+02:00`)
- directiveCompliance: compliant
- deviationOrBlocker: the coordinator report remained stale relative to local Iterations 92-93 closure, so this heartbeat followed the recorded next playback-first step: second-click Playing UI proof while preserving preview-duration provenance. No canvas placement, placeholder visual sound object, VFX/area work, heartbeat automation change, or retail/canonical parity claim was introduced.

Runtime Health Fields:
- defaultBackendRuntimeHealthDependency: yes for this live UI smoke.
- defaultBackendRuntimeHealthObserved: unhealthy at first due to the known default `nest start --watch` issue, then healthy after same-container compiled-entrypoint recovery. Initial probes showed dropped backend health/auth connections and proxy auth `500`; `docker logs aurora-backend-dev` showed `listen EADDRINUSE: address already in use 0.0.0.0:3000`. After starting `node dist/src/main.js` in the same `aurora-backend-dev` container, `GET http://127.0.0.1:3000/api/v1/health` returned `{"status":"ok","service":"aurora-backend"}`.
- fallbackOrIsolatedRuntimeUsed: true for runtime recovery only. The fallback used the same backend container, mounted repo, database, blob storage, port, and API path; no mock backend or fake audio payload was used.
- infraFailureSeparatedFromDomainDebt: true. The watch-command `EADDRINUSE`/unhealthy-container state remains infrastructure/runtime health. Once recovered, the real Sounds product path passed the live UI Playing smoke.

Governor Advisory:
- Read: `docs/loops/sounds-mode-governor.md`
- Applied: no canvas placement, no VFX, no retail/canonical claim, preserve playback-first catalog/player scope.
- Deferred: visible governor tail remains stale relative to Iterations 90-94 and was not treated as scheduling input.
- Blocking status: none.

Scope:
- Exactly one playback-first live UI smoke after Iteration 93 proved Ready-state preview duration.
- No production code changes in this iteration.
- The temporary local QA harness was tightened to dispatch Chrome `Input.dispatchMouseEvent` mouse clicks instead of DOM `.click()`, because DOM `.click()` does not provide browser user activation for the second Play attempt.

Live UI Product Evidence:
- Frontend route: `http://127.0.0.1:5173/app?mode=sounds_mode`
- Auth state: seeded through the normal local auth API as `builder.user`.
- Sounds Mode catalog loaded `16` items.
- Target selected: `sound_al_an_bees1` / `al_an_bees1`.
- Playback flow:
  - First direct mouse Play reached Ready.
  - Second direct mouse Play reached Playing.
  - Stop remained available while Playing.
  - Catalog remained usable and no `Place al_an_bees1 on canvas` affordance was present.
- Metadata/provenance while Playing:
  - `soundId: sound_al_an_bees1`
  - `resref: al_an_bees1`
  - `category: effect`
  - `format: wav`
  - `source: vanilla`
  - `spatialMode: 3d`
  - `playbackMode: random`
  - `auroraUsage: GI_sound_rndm / RandomSound`
  - source/catalog `duration: 2.5s`
  - `state: Playing`
  - `playback: Playing from backend audio cache.`
  - `delivery: vanilla / proxy / audio/wav / 215 KB`
  - `preview duration: 9.9s (browser-preview)`
  - `objectKey: modules/current/__aurora/sources/vanilla/audio/wav/al_an_bees1.wav`

Files Changed:
- `docs/loops/sounds-mode-loop.md`
- `.codex/tmp/sounds-preview-duration-ui-smoke.mjs` (temporary local QA harness)

QA Artifacts:
- `.codex/tmp/sounds-preview-duration-ui-smoke/sounds-preview-duration-playing-ui-smoke.json` - live second-click Playing smoke result.
- `.codex/tmp/sounds-preview-duration-ui-smoke/sounds-preview-duration-playing-ui-smoke.png` - screenshot after Playing state with preview duration.

Tests and Build:
- Not rerun in this iteration because production/test code did not change after Iteration 92.
- Prior gates still stand:
  - Iteration 92: `cd frontend; npm test -- --run tests/unit/modules/layout/WorkspaceMockLayout.viewportWiring.test.tsx` passed with 67 tests.
  - Iteration 92: `cd frontend; npm run build` passed with the existing Vite large chunk warning.

Blockers / Follow-up Evidence Needed:
- default-backend-watch-runtime: `nest start --watch` refresh reliability remains an infrastructure/runtime health issue; this slice hit the same `EADDRINUSE` failure and recovered with the compiled entrypoint.
- in-app-browser-plugin-bootstrap: Browser skill bootstrap remains unavailable because the advertised `scripts/browser-client.mjs` file is missing; local Chrome/CDP live QA remains the working verification path.
- `lc_sounds.hak` remains absent from the configured local HAK directory.
- Full vanilla ingestion remains intentionally capped/manual because local vanilla discovery is very large.
- Retail-canonical sound semantics remain unclaimed without hard retail/runtime/capture comparison evidence.

Next Step:
- Re-read the latest Sounds Domain Coordinator directives before selecting the next slice. If no newer directive exists, either run a narrow Stop-after-Playing smoke that confirms preview-duration playback state cleans up without metadata loss, or address the default backend watch-runtime refresh reliability as infrastructure/runtime health.

## Iteration 95 - Live Stop After Playing Cleanup Smoke

Upstream Directive Evidence:
- upstreamDirectiveRead: true
- upstreamDirectiveSource: `backend/docs/aurora-reverse/guard-reports/sounds-domain-coordinator-latest.md`; `backend/docs/aurora-reverse/guard-reports/sounds-domain-coordinator-latest.json`
- upstreamDirectiveTimestampOrVersion: `2026-06-17T02:27:46.7643576+02:00 / aurora-web-global-coordinator-report/v1 / factory_wide_rules_gate_active_areas_needs_correction` (Domain Coordinator report generated `2026-06-17T03:14:06+02:00`)
- directiveCompliance: compliant
- deviationOrBlocker: the coordinator report remained stale relative to local Iterations 92-94 closure, so this heartbeat followed the recorded next playback-first step: Stop-after-Playing cleanup proof. No canvas placement, placeholder visual sound object, VFX/area work, heartbeat automation change, or retail/canonical parity claim was introduced.

Runtime Health Fields:
- defaultBackendRuntimeHealthDependency: yes for this live UI smoke.
- defaultBackendRuntimeHealthObserved: healthy via the already recovered same-container compiled backend path from Iteration 94. The live UI smoke authenticated through the local backend/proxy and loaded the 16-item Sounds catalog.
- fallbackOrIsolatedRuntimeUsed: no new backend fallback in this iteration. The same recovered `aurora-backend-dev` service path on port `3000` was used; no mock backend or fake audio payload was used.
- infraFailureSeparatedFromDomainDebt: true. The default `nest start --watch` `EADDRINUSE` issue remains infrastructure/runtime health; this slice found no Sounds product regression in Stop cleanup.

Governor Advisory:
- Read: `docs/loops/sounds-mode-governor.md`
- Applied: no canvas placement, no VFX, no retail/canonical claim, preserve playback-first catalog/player scope.
- Deferred: visible governor tail remains stale relative to Iterations 90-95 and was not treated as scheduling input.
- Blocking status: none.

Scope:
- Exactly one playback-first live UI smoke after Iteration 94 proved Playing-state preview duration.
- No production code changes in this iteration.
- The temporary local QA harness was extended with `SOUNDS_PREVIEW_SMOKE_MODE=stopped` to prove cleanup after Stop.

Live UI Product Evidence:
- Frontend route: `http://127.0.0.1:5173/app?mode=sounds_mode`
- Auth state: seeded through the normal local auth API as `builder.user`.
- Sounds Mode catalog loaded `16` items.
- Target selected: `sound_al_an_bees1` / `al_an_bees1`.
- Playback flow:
  - First direct mouse Play reached Ready and showed `preview duration: 9.9s (browser-preview)`.
  - Second direct mouse Play reached Playing and preserved source duration, preview duration, delivery metadata, selected metadata, and Stop availability.
  - Stop clicked successfully.
- Cleanup evidence after Stop:
  - Playback state cleared from the inspector.
  - Delivery and `preview duration` were cleared from the inspector.
  - Stop was absent.
  - Play was available again.
  - Selected metadata remained visible:
    - `soundId: sound_al_an_bees1`
    - `resref: al_an_bees1`
    - `category: effect`
    - `format: wav`
    - `source: vanilla`
    - `spatialMode: 3d`
    - `playbackMode: random`
    - `auroraUsage: GI_sound_rndm / RandomSound`
    - source/catalog `duration: 2.5s`
  - Catalog remained usable and no `Place al_an_bees1 on canvas` affordance was present.

Files Changed:
- `docs/loops/sounds-mode-loop.md`
- `.codex/tmp/sounds-preview-duration-ui-smoke.mjs` (temporary local QA harness)

QA Artifacts:
- `.codex/tmp/sounds-preview-duration-ui-smoke/sounds-preview-duration-stop-ui-smoke.json` - live Stop-after-Playing smoke result.
- `.codex/tmp/sounds-preview-duration-ui-smoke/sounds-preview-duration-stop-ui-smoke.png` - screenshot after Stop cleanup.

Tests and Build:
- Not rerun in this iteration because production/test code did not change after Iteration 92.
- Prior gates still stand:
  - Iteration 92: `cd frontend; npm test -- --run tests/unit/modules/layout/WorkspaceMockLayout.viewportWiring.test.tsx` passed with 67 tests.
  - Iteration 92: `cd frontend; npm run build` passed with the existing Vite large chunk warning.

Blockers / Follow-up Evidence Needed:
- default-backend-watch-runtime: `nest start --watch` refresh reliability remains an infrastructure/runtime health issue.
- in-app-browser-plugin-bootstrap: Browser skill bootstrap remains unavailable because the advertised `scripts/browser-client.mjs` file is missing; local Chrome/CDP live QA remains the working verification path.
- `lc_sounds.hak` remains absent from the configured local HAK directory.
- Full vanilla ingestion remains intentionally capped/manual because local vanilla discovery is very large.
- Retail-canonical sound semantics remain unclaimed without hard retail/runtime/capture comparison evidence.

Next Step:
- Re-read the latest Sounds Domain Coordinator directives before selecting the next slice. If no newer directive exists, either convert the temporary preview-duration smoke harness into a checked-in focused live QA script if the project wants reusable demo readiness checks, or address the default backend watch-runtime refresh reliability as infrastructure/runtime health.

## Iteration 96 - Checked-In Preview Duration Live Smoke Harness

Upstream Directive Evidence:
- upstreamDirectiveRead: true
- upstreamDirectiveSource: `backend/docs/aurora-reverse/guard-reports/sounds-domain-coordinator-latest.md`; `backend/docs/aurora-reverse/guard-reports/sounds-domain-coordinator-latest.json`
- upstreamDirectiveTimestampOrVersion: `2026-06-17T02:27:46.7643576+02:00 / aurora-web-global-coordinator-report/v1 / factory_wide_rules_gate_active_areas_needs_correction` (Domain Coordinator report generated `2026-06-17T03:14:06+02:00`)
- directiveCompliance: compliant
- deviationOrBlocker: the coordinator report remained stale relative to local Iterations 92-95 closure, so this heartbeat followed the recorded next playback-first step: convert the temporary preview-duration live smoke into a reusable checked-in QA script and rerun the stopped-mode proof. No canvas placement, placeholder visual sound object, VFX/area work, heartbeat automation change, or retail/canonical parity claim was introduced.

Runtime Health Fields:
- defaultBackendRuntimeHealthDependency: yes for the live QA script run.
- defaultBackendRuntimeHealthObserved: healthy. `GET http://127.0.0.1:3000/api/v1/health` returned `{"status":"ok","service":"aurora-backend"}` and `http://127.0.0.1:5173/app?mode=sounds_mode` returned HTTP 200 before the live smoke.
- fallbackOrIsolatedRuntimeUsed: no new backend fallback in this iteration. The run used the already recovered default local backend/frontend path, real local auth, real Sounds catalog, process/contracts/audio endpoints, and Chrome CDP; no mock backend or fake audio payload was used.
- infraFailureSeparatedFromDomainDebt: true. The default `nest start --watch` refresh issue remains infrastructure/runtime health; this slice found no Sounds product regression in the checked-in smoke path.

Governor Advisory:
- Read: `docs/loops/sounds-mode-governor.md`
- Applied: no canvas placement, no VFX, no retail/canonical claim, preserve playback-first catalog/player scope.
- Deferred: visible governor tail remains stale relative to Iterations 90-96 and was not treated as scheduling input.
- Blocking status: none.

Scope:
- Added `frontend/scripts/smoke-sounds-preview-duration.mjs` as a reusable live QA harness for the Sounds Mode preview-duration readiness path.
- The script supports `SOUNDS_PREVIEW_SMOKE_MODE=ready|playing|stopped`, defaults to `stopped`, seeds a real local backend auth session, opens `Sounds Mode`, selects `sound_al_an_bees1`, prepares backend audio, optionally plays and stops it with Chrome CDP mouse events, and verifies:
  - catalog/target sound is visible,
  - selected metadata stays visible,
  - source/catalog duration remains `2.5s`,
  - browser preview duration is visible as `9.9s (browser-preview)` during Ready/Playing,
  - real delivery metadata remains visible during prepared/playing states,
  - Stop cleanup removes playback/delivery/preview-duration state while preserving source metadata,
  - no `Place al_an_bees1 on canvas` affordance appears.
- The script records `localOnlyNotRetailEvidence: true` and `canonicalParityPromoted: false`.

Files Changed:
- `frontend/scripts/smoke-sounds-preview-duration.mjs`
- `docs/loops/sounds-mode-loop.md`

Live QA Product Evidence:
- Command: `$env:SOUNDS_PREVIEW_SMOKE_MODE='stopped'; node frontend/scripts/smoke-sounds-preview-duration.mjs`
- Result: passed with `"ok": true`.
- Route: `http://127.0.0.1:5173/app?mode=sounds_mode`
- Catalog count observed in final UI text: `16`.
- Target selected: `sound_al_an_bees1` / `al_an_bees1`.
- First Play reached Ready with source duration, preview duration, delivery metadata, selected metadata, and no canvas placement affordance.
- Second Play reached Playing with source duration, preview duration, delivery metadata, selected metadata, Stop availability, and no canvas placement affordance.
- Stop cleared playback/delivery/preview-duration state, removed Stop, restored Play, preserved selected metadata and source/catalog duration, and kept the catalog usable.

QA Artifacts:
- `.codex/tmp/sounds-preview-duration-ui-smoke/sounds-preview-duration-stop-ui-smoke.json` - checked-in script live stopped-mode result.
- `.codex/tmp/sounds-preview-duration-ui-smoke/sounds-preview-duration-stop-ui-smoke.png` - screenshot after Stop cleanup.

Tests and Build:
- `node --check frontend/scripts/smoke-sounds-preview-duration.mjs` - passed.
- `$env:SOUNDS_PREVIEW_SMOKE_MODE='stopped'; node frontend/scripts/smoke-sounds-preview-duration.mjs` - passed.
- Focused Vitest/build were not rerun because this slice only added a standalone QA script and loop note. Prior gates still stand:
  - Iteration 92: `cd frontend; npm test -- --run tests/unit/modules/layout/WorkspaceMockLayout.viewportWiring.test.tsx` passed with 67 tests.
  - Iteration 92: `cd frontend; npm run build` passed with the existing Vite large chunk warning.

Blockers / Follow-up Evidence Needed:
- default-backend-watch-runtime: `nest start --watch` refresh reliability remains an infrastructure/runtime health issue.
- in-app-browser-plugin-bootstrap: Browser skill bootstrap remains unavailable because the advertised `scripts/browser-client.mjs` file is missing; local Chrome/CDP live QA remains the working verification path.
- `lc_sounds.hak` remains absent from the configured local HAK directory.
- Full vanilla ingestion remains intentionally capped/manual because local vanilla discovery is very large.
- Retail-canonical sound semantics remain unclaimed without hard retail/runtime/capture comparison evidence.

Next Step:
- Re-read the latest Sounds Domain Coordinator directives before selecting the next slice. If no newer directive exists, use the checked-in script for a narrow ready/playing/stopped demo-readiness refresh when needed, or address the default backend watch-runtime refresh reliability as infrastructure/runtime health.

## Iteration 97 - Parameterized Preview Duration Smoke Assertions

Upstream Directive Evidence:
- upstreamDirectiveRead: true
- upstreamDirectiveSource: `backend/docs/aurora-reverse/guard-reports/sounds-domain-coordinator-latest.md`; `backend/docs/aurora-reverse/guard-reports/sounds-domain-coordinator-latest.json`
- upstreamDirectiveTimestampOrVersion: `2026-06-17T02:27:46.7643576+02:00 / aurora-web-global-coordinator-report/v1 / factory_wide_rules_gate_active_areas_needs_correction` (Domain Coordinator report generated `2026-06-17T03:14:06+02:00`)
- directiveCompliance: compliant
- deviationOrBlocker: the coordinator report remained stale relative to local Iterations 92-96 closure, so this heartbeat followed the recorded playback-first readiness path and made the reusable preview-duration smoke less brittle for future real Sounds catalog probes. No canvas placement, placeholder visual sound object, VFX/area work, heartbeat automation change, or retail/canonical parity claim was introduced.

Runtime Health Fields:
- defaultBackendRuntimeHealthDependency: yes for the live QA script run.
- defaultBackendRuntimeHealthObserved: healthy. `GET http://127.0.0.1:3000/api/v1/health` returned `{"status":"ok","service":"aurora-backend"}` and `http://127.0.0.1:5173/app?mode=sounds_mode` returned HTTP 200 before the live smoke.
- fallbackOrIsolatedRuntimeUsed: no new backend fallback in this iteration. The run used the already recovered default local backend/frontend path, real local auth, real Sounds catalog, process/contracts/audio endpoints, and Chrome CDP; no mock backend or fake audio payload was used.
- infraFailureSeparatedFromDomainDebt: true. The default `nest start --watch` refresh issue remains infrastructure/runtime health; this slice found no Sounds product regression in the parameterized smoke path.

Governor Advisory:
- Read: `docs/loops/sounds-mode-governor.md`
- Applied: no canvas placement, no VFX, no retail/canonical claim, preserve playback-first catalog/player scope.
- Deferred: visible governor tail remains stale relative to Iterations 90-97 and was not treated as scheduling input.
- Blocking status: none.

Scope:
- Tightened `frontend/scripts/smoke-sounds-preview-duration.mjs` so browser-side assertions use the configured `AURORA_SOUND_PREVIEW_ID`, `AURORA_SOUND_PREVIEW_RESREF`, `AURORA_SOUND_SOURCE_DURATION_LABEL`, and `AURORA_SOUND_PREVIEW_DURATION_LABEL` through an expected-UI payload instead of hard-coded `al_an_bees1` checks inside CDP predicates.
- Kept the default real probe as `sound_al_an_bees1` / `al_an_bees1` to preserve Iterations 90-96 product evidence.
- Kept no-canvas-placement checks and local-only/non-retail evidence flags intact.

Files Changed:
- `frontend/scripts/smoke-sounds-preview-duration.mjs`
- `docs/loops/sounds-mode-loop.md`

Live QA Product Evidence:
- Command: `$env:SOUNDS_PREVIEW_SMOKE_MODE='stopped'; node frontend/scripts/smoke-sounds-preview-duration.mjs`
- Result: passed with `"ok": true`.
- Route: `http://127.0.0.1:5173/app?mode=sounds_mode`
- Catalog count observed in final UI text: `16`.
- Target selected: `sound_al_an_bees1` / `al_an_bees1`.
- First Play reached Ready with source duration, preview duration, delivery metadata, selected metadata, and no canvas placement affordance.
- Second Play reached Playing with source duration, preview duration, delivery metadata, selected metadata, Stop availability, and no canvas placement affordance.
- Stop cleared playback/delivery/preview-duration state, removed Stop, restored Play, preserved selected metadata and source/catalog duration, and kept the catalog usable.

QA Artifacts:
- `.codex/tmp/sounds-preview-duration-ui-smoke/sounds-preview-duration-stop-ui-smoke.json` - parameterized script live stopped-mode result.
- `.codex/tmp/sounds-preview-duration-ui-smoke/sounds-preview-duration-stop-ui-smoke.png` - screenshot after Stop cleanup.

Tests and Build:
- `node --check frontend/scripts/smoke-sounds-preview-duration.mjs` - passed.
- `$env:SOUNDS_PREVIEW_SMOKE_MODE='stopped'; node frontend/scripts/smoke-sounds-preview-duration.mjs` - passed.
- Focused Vitest/build were not rerun because this slice only tightened a standalone live QA script and loop note. Prior gates still stand:
  - Iteration 92: `cd frontend; npm test -- --run tests/unit/modules/layout/WorkspaceMockLayout.viewportWiring.test.tsx` passed with 67 tests.
  - Iteration 92: `cd frontend; npm run build` passed with the existing Vite large chunk warning.

Blockers / Follow-up Evidence Needed:
- default-backend-watch-runtime: `nest start --watch` refresh reliability remains an infrastructure/runtime health issue.
- in-app-browser-plugin-bootstrap: Browser skill bootstrap remains unavailable because the advertised `scripts/browser-client.mjs` file is missing; local Chrome/CDP live QA remains the working verification path.
- `lc_sounds.hak` remains absent from the configured local HAK directory.
- Full vanilla ingestion remains intentionally capped/manual because local vanilla discovery is very large.
- Retail-canonical sound semantics remain unclaimed without hard retail/runtime/capture comparison evidence.

Next Step:
- Re-read the latest Sounds Domain Coordinator directives before selecting the next slice. If no newer directive exists, use the checked-in parameterized script for ready/playing/stopped demo-readiness refreshes on additional real catalog sounds, or address the default backend watch-runtime refresh reliability as infrastructure/runtime health.

## Iteration 98 - Preview Duration Provenance Boundary With Delivery Etag

Upstream Directive Evidence:
- upstreamDirectiveRead: true
- upstreamDirectiveSource: `backend/docs/aurora-reverse/guard-reports/sounds-domain-coordinator-latest.md`; `backend/docs/aurora-reverse/guard-reports/sounds-domain-coordinator-latest.json`; `backend/docs/aurora-reverse/guard-reports/ai-factory-director-latest.md`; `backend/docs/aurora-reverse/guard-reports/ai-factory-director-latest.json`
- upstreamDirectiveTimestampOrVersion: `2026-06-17T02:27:46.7643576+02:00 / aurora-web-global-coordinator-report/v1 / factory_wide_rules_gate_active_areas_needs_correction` (Domain Coordinator report generated `2026-06-17T03:14:06+02:00`)
- directiveCompliance: compliant
- deviationOrBlocker: followed `worker-preview-duration-metadata-readiness` with one narrow playback-first product slice: keep preview duration explicitly preview-derived while surfacing the backend audio delivery `etag` alongside object key/type/size. No canvas placement, placeholder visual sound object, VFX/area work, heartbeat automation change, or retail/canonical parity claim was introduced.

Runtime Health Fields:
- defaultBackendRuntimeHealthDependency: yes for the live Ready-state smoke.
- defaultBackendRuntimeHealthObserved: initially unhealthy after the default `nest start --watch` container path restarted and remained `health: starting`; recovered by starting `node dist/src/main.js` inside the same `aurora-backend-dev` container. After recovery, `GET http://127.0.0.1:3000/api/v1/health` returned `{"status":"ok","service":"aurora-backend"}` and the live Sounds Mode smoke passed.
- fallbackOrIsolatedRuntimeUsed: true for runtime recovery only. The fallback used the same backend container, mounted repo, database, blob storage, port, auth, catalog/process/contracts/audio endpoints, and data path; no mock backend or fake audio payload was used.
- infraFailureSeparatedFromDomainDebt: true. The `nest start --watch` health timeout remains infrastructure/runtime health; this slice found no Sounds product regression after same-container compiled-entrypoint recovery.

Governor Advisory:
- Read: `docs/loops/sounds-mode-governor.md`
- Applied: no canvas placement, no VFX, no retail/canonical claim, preserve playback-first catalog/player scope.
- Deferred: visible governor tail remains stale relative to Iterations 90-98 and was not treated as scheduling input.
- Blocking status: none.

Scope:
- Extended `SoundPlaybackDeliveryEvidence` in `frontend/src/modules/layout/components/WorkspaceMockLayout.tsx` with optional `etag` copied from the backend `SoundApiAudioDeliveryContract`.
- Rendered `etag` in the Sounds Mode inspector only when the backend delivery contract provides it.
- Tightened the existing preview-duration readiness test so decoded preview duration remains separate from source duration while source layer, delivery object key, delivery size/type, and backend etag remain visible and unchanged.
- Preserved original source/catalog duration and provenance; preview duration is still labeled `browser-preview` and is not promoted to canonical source duration.

Files Changed:
- `frontend/src/modules/layout/components/WorkspaceMockLayout.tsx`
- `frontend/tests/unit/modules/layout/WorkspaceMockLayout.viewportWiring.test.tsx`
- `docs/loops/sounds-mode-loop.md`

Focused Tests and Build:
- `cd frontend; npm test -- --run tests/unit/modules/layout/WorkspaceMockLayout.viewportWiring.test.tsx` - passed, 69 tests. Existing React `act(...)` warnings remain.
- `cd frontend; npm run build` - passed with the existing Vite large chunk warning.

Live QA Product Evidence:
- Command: `$env:SOUNDS_PREVIEW_SMOKE_MODE='ready'; node frontend/scripts/smoke-sounds-preview-duration.mjs`
- Result: passed with `"ok": true`.
- Route: `http://127.0.0.1:5173/app?mode=sounds_mode`
- Catalog count observed in final UI text: `16`.
- Target selected: `sound_al_an_bees1` / `al_an_bees1`.
- Ready-state inspector showed:
  - source/catalog `duration: 2.5s`
  - `preview duration: 9.9s (browser-preview)`
  - `delivery: vanilla / proxy / audio/wav / 215 KB`
  - `objectKey: modules/current/__aurora/sources/vanilla/audio/wav/al_an_bees1.wav`
  - `etag: bc4b8e4d20d91c8ba7d721588bf1f2d2`
  - selected metadata remained visible and no `Place al_an_bees1 on canvas` affordance appeared.

QA Artifacts:
- `.codex/tmp/sounds-preview-duration-ui-smoke/sounds-preview-duration-ready-ui-smoke.json` - live Ready-state result with etag/objectKey/preview-duration evidence.
- `.codex/tmp/sounds-preview-duration-ui-smoke/sounds-preview-duration-ready-ui-smoke.png` - screenshot after Ready state.

Blockers / Follow-up Evidence Needed:
- default-backend-watch-runtime: `nest start --watch` refresh reliability remains an infrastructure/runtime health issue; this iteration hit the same health timeout and recovered with the compiled entrypoint.
- in-app-browser-plugin-bootstrap: Browser skill bootstrap remains unavailable because the advertised `scripts/browser-client.mjs` file is missing; local Chrome/CDP live QA remains the working verification path.
- `lc_sounds.hak` remains absent from the configured local HAK directory.
- Full vanilla ingestion remains intentionally capped/manual because local vanilla discovery is very large.
- Retail-canonical sound semantics remain unclaimed without hard retail/runtime/capture comparison evidence.

Next Step:
- Re-read the latest Sounds Domain Coordinator directives before selecting the next slice. If no newer directive exists, use the checked-in parameterized script for ready/playing/stopped demo-readiness refreshes on additional real catalog sounds, or take a narrow infrastructure/runtime slice to make the default backend watch-runtime refresh reliable without changing Sounds product contracts.
