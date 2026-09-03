# VFX Placeable Canonical Host Pre-flight

Date: 2026-07-19

## Decision

Continue the active VFX implementation goal with one bounded contract-routing
slice: accept an already validated backend-canonical VFX payload for a
placeable regardless of its presentation subtype.

## Knowledge boundary

No new Aurora semantic is required. Existing primary Aurora/decompilation and
retail evidence already establishes the shared source-MDL graph ownership used
by this correction. xoreos was not used.

## Complexity budget

- one additive canonical-payload predicate;
- one routing change in the placeable VFX payload mapper;
- one routing change in the workspace object mesh layer;
- focused unit/regression coverage;
- no new renderer or simulator.

## Proof boundary

Implementation tests are not visual proof. The slice remains open until a
fresh Aurora Web placeable playback is compared with the saved NWN reference,
using one continuous playback and no NWN rerun.
