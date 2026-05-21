# Player Model Animation Pipeline Warning

## Purpose
Record a critical implementation warning for future player-model work so we do not confuse runtime fallback behavior with full NWN player-model parity.

## Analysis Timestamp
- 2026-05-21 (Europe/Warsaw)

## Warning Summary
1. Two layers were mixed in practical implementation:
- movement/control stability layer;
- full player-model reconstruction layer (parts assembly + skeleton animations).
2. Current state is stable movement + runtime-driven fallback behavior.
3. Current state is **not** full reconstruction of original NWN player animation clips/pipeline.
4. The open problem is not documentation absence; the open problem is unfinished integration of animation sources into a true game-like character pipeline.

## Practical Risk
1. Team may incorrectly treat "moving avatar works" as "player model parity achieved".
2. This can create hidden technical debt before architecture freeze.

## MVP Interpretation
1. MVP keeps controllable avatar for runtime-feel validation.
2. Full NWN player animation parity remains post-MVP unless architecture stage explicitly expands scope.
3. Any architecture document for avatar pipeline must explicitly separate:
- control/input loop;
- model parts assembly;
- skeleton/clip integration;
- fallback path behavior.

## Required Design Guardrails
1. Define explicit parity level labels in docs (`fallback`, `partial`, `full-parity`).
2. Add tests that detect when fallback path is active versus full animation path.
3. Keep this warning linked from player-avatar MVP document.
