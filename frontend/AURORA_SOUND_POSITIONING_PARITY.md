# Aurora Sound Positioning Parity Notes

Date: 2026-05-25
Source: Aurora UI screenshots (Basic/Positioning/Advanced) + in-editor visual captures.

## Purpose
Lock one shared interpretation of Aurora sound positioning visuals so mock/runtime behavior does not drift.

## Current Implementation Status (aurora-web)
Status: `PARTIAL` (Sound Properties shell + mode gating), `NOT_IMPLEMENTED` for runtime guides/extended payload.

Implemented now:
1. `sounds` exist as scene objects in the same selection/move pipeline as other movable objects.
2. Sounds are visible in catalog/filter/layer tooling and can be transformed via generic object controls.
3. Sound Properties dialog shell is active (`Basic`, `Positioning`, `Advanced`) with `Apply/OK/Cancel`.
4. Deterministic mode gating is active for:
   - `Plays everywhere in area`,
   - `Plays from random position each play`,
   - `Plays from specific position`.
5. Existing `soundPositioning` payload fields are bound in UI without adding speculative runtime semantics.

Not implemented yet:
1. Attenuation/random-range viewport guides tied to sound properties.
2. Extended payload surface (schedule/variation semantics) beyond current baseline fields.

Interpretation rule:
1. This file documents Aurora-first shell/state gating now implemented in frontend.
2. It does not claim retail runtime semantics beyond currently wired data and tests.

## Gate Tests
Current:
1. `frontend/tests/regression-smoke/workspace/Workspace.sound-properties.regression-smoke.test.tsx`
2. `frontend/tests/regression-smoke/workspace/Workspace.sound-properties.mode-parity.regression-smoke.test.tsx`
3. `frontend/tests/unit/modules/scene/domain/sceneFactory.soundPositioning.test.ts`
4. `frontend/tests/unit/modules/scene/application/sceneCanvasFacade.test.ts`

Pending:
1. Viewport-guide parity tests (editor-only glyph/anchor/range overlays).
2. Import/export roundtrip tests for extended payload fields (when fields are added).

## Positioning Modes

### 1. Plays everywhere in area
1. Sound is treated as area-wide (non-localized for placement workflow).
2. Positioning controls are disabled in the dialog.
3. In viewport, object marker can still be selectable as an editor object, but spatial random box/range editing is not active.

### 2. Plays from a random position each time it is played
1. Sound has an anchor marker object in the area.
2. Playback spawn point is randomized inside configured `West-East` / `North-South` range.
3. `Random Range` defines the planar randomization box.
4. Volume visualization is still based on `Max Volume Distance` + `Cutoff Distance`.

### 3. Plays from a specific position
1. Sound is fixed to one anchor position (no randomization per play).
2. Marker representation is the sound glyph ("note") with a base/anchor indicator ("cube" / anchor marker below).
3. `Random Range` controls are disabled and must not affect runtime.
4. Volume visualization remains spherical around the anchor (camera may show ellipses in perspective):
   - inner range: max-volume region,
   - outer range: cutoff/falloff limit.
5. Selection wireframes are editor-only affordances and are not separate runtime audio entities.

## Visual Legend in Viewport
1. Sound glyph (note): identifies the sound object.
2. Anchor marker (cube/base indicator): world-space source anchor.
3. Ring/sphere guides: audio attenuation visualization.
4. Green wire box: selection bounds/handles, editor-only.

## Guardrail
When reproducing Aurora behavior, do not reinterpret `specific position` as random-box behavior. The anchor is fixed unless user explicitly chooses the random-position mode.

## Backlog Hooks
Code now:
1. Extend payload with schedule/variation fields using preserve-first strategy (no runtime guessing).
2. Add editor-only sound guides (glyph/anchor/range/box) that never serialize as runtime entities.
3. Expand tests from shell/gating into viewport-guide coverage.

Retail-hard-confirm later:
1. Confirm runtime edge semantics for attenuation and scheduling.
2. Confirm any Aurora-specific randomization constraints not visible in screenshot-only evidence.
