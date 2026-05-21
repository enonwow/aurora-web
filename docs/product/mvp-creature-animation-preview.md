# MVP Creature Animation Preview

## Goal
Allow users to inspect creature animations in preview mode to validate skeleton/animation data quality before runtime usage.

## Core MVP Requirements
1. In creature preview/inspection mode, show available animation clips for selected creature model.
2. User can play selected animation clip in preview viewport.
3. Provide basic playback controls:
- `Play/Pause`
- `Loop` on/off
- playback speed selector (at least normal + slower + faster presets)
4. Switching animations must not trigger full-area rerender/reload.

## Data Assumptions
1. Creature model contains skeleton/rig information when available.
2. Animation clip metadata should be discoverable and presented by clip name/id.
3. If animations are missing, UI must show explicit no-animation state (not silent failure).

## UX Requirements
1. Animation controls are shown only for applicable object types (creatures/rigged models).
2. Opening creature animation preview must preserve current area editing context.
3. Exiting preview returns user immediately to active area state.

## Diagnostics Requirements
1. Debug snapshot for creature preview should include:
- creature template id/resref;
- model id/reference;
- available animation clip list;
- currently active clip;
- playback state and speed.
2. Animation-load or playback failures should emit categorized diagnostics (missing skeleton, missing clip, invalid bind, playback runtime error).

## Performance Requirements
1. Reopening the same creature preview should reuse loaded rig/animation resources when valid.
2. Preview playback should avoid reloading unchanged mesh/material data.
3. Animation preview must remain client-side and should not require backend render work.

## Test Requirements
1. Unit tests:
- animation clip list parsing/mapping;
- playback state transitions.
2. Integration tests:
- open creature preview -> play clip -> switch clip -> close preview without area reload.
3. Regression smoke:
- no-animation creature fallback;
- animated creature playback path.

## Out Of Scope For This MVP Slice
1. Full animation graph editor/state machine authoring.
2. Keyframe editing tools.
3. Cross-fade authoring UI beyond minimal playback behavior.
