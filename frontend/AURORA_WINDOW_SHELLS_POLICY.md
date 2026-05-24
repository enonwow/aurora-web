# Aurora Window Shells Policy

Date: 2026-05-24
Status: Active project policy

## Purpose
Keep `Aurora First` parity for editor property windows while enabling incremental delivery.

## Core Decision
1. Property windows should visually mirror Aurora structure (tabs, field groups, labels, action layout) as closely as possible.
2. Functional behavior is delivered in phases.
3. Unsupported controls are visible but explicitly marked as `Post-MVP` (or disabled with equivalent annotation).

## Control Activation States
Every control in an Aurora-mirrored window must be assigned one state:
1. `ACTIVE_NOW`
   - fully interactive,
   - validated,
   - persisted through facade/domain flow,
   - covered by tests.
2. `PRESERVE_ONLY`
   - value is loaded and roundtripped without loss,
   - UI edit is disabled or guarded,
   - no destructive rewrite on save.
3. `POST_MVP_DISABLED`
   - intentionally not active in current phase,
   - visible for parity orientation,
   - must not mutate payload.

## Required Engineering Rules
1. No hidden silent drops:
   - unknown or preserve-only fields must survive read/save roundtrip.
2. No fake parity:
   - never claim runtime parity for controls/features without evidence.
3. No UI->adapter shortcuts:
   - window actions route through application facades and ports.
4. No destructive fallback behavior:
   - disabled controls are no-op from persistence perspective.
5. Dialog cancel semantics:
   - `Cancel` restores the dialog-open snapshot for the edited object(s).
6. History semantics for property-style edits:
   - `Undo/Redo` is step-based for committed edit steps (not a single grouped drag transaction).
7. Multi-selection policy:
   - batch property/location edits are allowed when feature-scope permits,
   - mixed eligibility selections must hide unsupported sections instead of partially applying hidden side effects.

## Initial Window Scope (Current)
1. `Placeable Properties`
2. `Creature Properties`
3. `Door Properties`
4. `Sound Properties`
5. `Adjust Location`

Detailed parity notes:
1. `frontend/AURORA_SOUND_POSITIONING_PARITY.md`
2. `frontend/AURORA_ADJUST_LOCATION_PARITY.md`

## Test Expectations Per Activated Increment
For each control promoted to `ACTIVE_NOW`:
1. unit tests for normalization/validation logic,
2. facade tests for command flow and side effects,
3. regression test covering visible UX path,
4. preserve-roundtrip tests for neighboring `PRESERVE_ONLY` fields.

## Delivery Pattern
1. Ship shell first (Aurora-like layout).
2. Activate highest-value controls first (MVP-critical).
3. Promote additional controls from `POST_MVP_DISABLED`/`PRESERVE_ONLY` to `ACTIVE_NOW` over time.
4. Each promotion must include tests and documentation update.
