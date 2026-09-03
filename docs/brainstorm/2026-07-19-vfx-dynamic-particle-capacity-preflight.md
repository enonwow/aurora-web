# VFX Dynamic Particle Capacity Pre-flight

Date: 2026-07-19
Status: implementation scope verified

## Activated rules

- rules-first;
- Aurora-first;
- no guessing;
- additive contract-first;
- test-first;
- diagnosability-first;
- visual differential parity after implementation.

## Scope decision

The current global fixed `64` particle cap is an implementation defect. Aurora
uses dynamically growing active/free pointer lists with an initial capacity of
`16` and doubling growth.

The implementation slice is limited to:

- dynamic active/free capacity bookkeeping;
- removal of the implicit `64` clamp from emitter-family math;
- an explicit server execution budget with diagnostics;
- source-backed `previousPosition` initialization;
- shared application to ordinary VFX and source-MDL placeable replay.

## Excluded unknown semantics

The following remain audit-first and are not implemented in this slice:

- persistent AOE ownership and heartbeat scheduling;
- native WOK AABB/BSP traversal;
- universal particle depth-input activation;
- exact `plc_t04` plume width/luminance tuning;
- production animated-host attachment for ProgFX Type 7.

## Source policy

xoreos was not used. No observation is classified as
`sourceClass: secondary-gpl-reference`.

The implementation authority is the primary Aurora reverse evidence recorded
in
`backend/docs/aurora-reverse/vfx-dynamic-particle-capacity-audit-2026-07-19.md`.

