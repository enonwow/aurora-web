# Aurora Sound Positioning Parity Notes

Date: 2026-05-24
Source: Aurora UI screenshots (Basic/Positioning/Advanced) + in-editor visual captures.

## Purpose
Lock one shared interpretation of Aurora sound positioning visuals so mock/runtime behavior does not drift.

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
