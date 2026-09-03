# VFX runtime observability preflight

Date: 2026-07-19  
Scope: development-only diagnostics for the catalog VFX preview and canonical VFX runtime.

## Classification

- Aurora-first: no Aurora format, scheduling, or rendering semantic is introduced. The implementation observes existing payload, renderer, and loader state.
- Contract-first: runtime build provenance crosses the frontend/backend boundary, so `GET /health.runtimeBuild` is additive and versioned. Existing VFX cache provenance is retained from the current placeable render payload.
- Diagnosability-first: the report is a bounded local diagnostic artifact, not generic telemetry. High-cardinality resource and draw data remains local.

## Design decision

The implementation records runtime build identity, canonical host graph, asset settlement, canonical draw ledger, single-playback state, proof gate blockers, and a development-only overlay. Missing backend or frontend build provenance remains explicit; the code must not infer a commit or image from timestamps.

## Test plan

- unit: pure report/settlement/proof-gate cases and health contract parsing;
- integration: catalog preview route serializes the report and disables the overlay for final profile;
- regression: pending/failed assets and duplicate playback create a blocker manifest rather than a proof pass;
- visual: an exact CDP capture is still required before claiming a visual proof.

## Explicit non-goals

- no new Aurora parity claim;
- no production debug endpoint or high-cardinality backend metric;
- no synthetic success when the source model, texture, or build identity is unresolved.

## Post-duration reconciliation (2026-07-19)

- Evidence inspected: `backend/docs/aurora-reverse/evidence/vfx-nwn-broad-proof-2026-07-16/row210/aurora-web/aurora-web-row210-one-trigger-native-lightning-radius-observability-v1-20260719.frame.json`.
- Observed fact: its final comparison sample was `phase=post`, `elapsedSeconds=22.966666...`, zero visible frames and zero draw particles, while the report recorded `completed=true` and `postDurationHidden=false`.
- Cause: the comparison runner pre-clamped the logical effect time to the 20-second duration before asking the renderer to seek. The renderer therefore recorded the terminal frame rather than the strictly post-duration state; the runner separately hid the parent group.
- Decision: this is a local playback-observability consistency issue, not a new Aurora runtime-semantic claim. The runner now passes raw logical effect time to the renderer, and a final `post` report fail-closes unless the completed playback reports `postDurationHidden=true`.
- No NWN, Toolset, or VFX capture was launched. The saved artifact is retained unchanged and must be treated as rejected by the revised post-duration gate until a separately authorized fresh Web capture is made.
