# Aurora Areas Loop Factory

Status: active bootstrap.

Purpose: drive `aurora-web` Areas toward Aurora-first visible behavior through coordinated, minute-heartbeat contexts. This factory is product-visible first: the user should see an area resemble the same area opened in Aurora, with real area tiles, placeables, doors, and other GIT objects ordered and rendered from source data.

This file is the operating protocol. `areas-context-pack.md` is the compact working memory, `areas-loop-state.json` is the machine-readable resume point, `areas-claim-registry.json` tracks visible claims, `areas-failed-assumptions.md` records disproven ideas, and `areas-run-log.jsonl` records completed iterations.

## Heartbeat Contexts

All contexts run on a one-minute heartbeat and must resume from the durable files above instead of restarting.

## No-Wait Dispatch Rule

The coordinator must keep both implementation workers busy at all times. Every coordinator heartbeat must leave exactly one active concrete visible assignment for Worker Alpha and exactly one active concrete visible assignment for Worker Beta, unless a worker is explicitly hard-blocked. When a worker completes a slice, the coordinator must immediately assign the next visible slice in the same heartbeat that accepts completion.

Coordinator assignments must be implementation-ready, not exploratory placeholders. Each assignment needs:

- a visible user-facing target;
- a source-backed Aurora data path to read;
- the exact frontend/backend files to start from;
- the blocker that must stay explicit if the full Aurora path cannot be completed;
- a clear prohibition against waiting for the other worker.

Workers must not wait for coordinator prose if their active assignment is still valid. They should continue implementing the next smallest visible Aurora-first slice and checkpoint it.

1. `Aurora Areas Coordinator`
   - Owns direction and assignments.
   - Publishes the latest worker directives in `guard-reports/areas-domain-coordinator-latest.md` and `.json`.
   - Prioritizes visible Aurora-first outcomes over new tests.
   - Reads the independent audit stream as advisory evidence, not as a scheduler.
   - Maintains no-wait parallel dispatch for both workers.

2. `Aurora Areas Worker Alpha`
   - Implements the coordinator's current terrain/tile directive.
   - Starts with ARE TileList plus SET model metadata and the visible terrain renderer path.
   - Checkpoints progress in the Areas loop artifacts.

3. `Aurora Areas Worker Beta`
   - Implements the coordinator's current object directive.
   - Starts with GIT placeables, doors, creatures, items, sounds, ordering, labels, selection, and visible scene composition.
   - Checkpoints progress in the Areas loop artifacts.

4. `Aurora Areas Independent Audit`
   - Runs independently from the coordinator.
   - Finds visible gaps, broken Aurora-first assumptions, stale blockers, and low-risk corrective opportunities.
   - Writes `guard-reports/areas-audit-latest.md` and `.json`.
   - May implement tiny obvious visible fixes, but must not hijack coordinator-owned work.

## Aurora-First Evidence Order

1. `aurora-retail-observed`: real Aurora client behavior for the exact area/resource.
2. `aurora-source-backed`: NWN module/source data from ARE, GIT, SET, WOK/DWK, UTI/UTC/UTP/UTD, MDL, 2DA, TLK, HAK, or packed module snapshot.
3. `decomp-evidence`: Aurora decompilation/export facts that identify behavior or data flow; never copied as implementation.
4. `repo-visible-evidence`: local app screenshot/frame/runtime dataset that shows source-backed behavior.
5. `hypothesis`: a narrow, falsifiable implementation guess.
6. `blocked`: cannot advance without missing source, asset conversion, architecture, or human retail evidence.
7. `failed`: disproven by source, runtime, or visible output.

## Non-Negotiable Rules

- Aurora First: prefer source-backed ARE/GIT/SET/WOK/MDL behavior over invented editor approximations.
- Visible changes first: this phase should improve what the user can see in Areas.
- Do not add new tests in this phase. Existing tests/build/type checks may be run only as lightweight verification after visible changes.
- Every implementation checkpoint must pass `npm.cmd run areas:contract-gate` from `backend/`. This is a loop gate, not a new feature test: it rejects prompt-only progress and verifies that Areas use backend Aurora render contracts while reusing the Placeables renderer path.
- Do not claim canonical parity without retail-observed evidence for the exact area/resource.
- Do not fake screenshots, retail behavior, geometry, doors, walkmesh, or object placement.
- Do not copy decompiled Aurora code into the project. Extract facts, labels, hypotheses, and evidence only.
- Do not transplant code from any POC. POCs may be observational evidence only.
- If real backend/source data is expected, fix or extend the actual data path before adding UI-only fallbacks.
- Frontend Areas code must not implement a separate placeable renderer. It may only request the backend render contract and place the returned Placeables-mode presentation at the GIT transform.
- Every recurring wrong assumption goes into `areas-failed-assumptions.md`.
- Every completed heartbeat should update the durable loop state or the role-specific latest report.

## POC Observational Reference

`C:\Projects\nwn-last-city\Areas Generator 3d` is allowed only as observational evidence. Do not transplant code from it.

The important finding from the POC is architectural: visible Aurora-like Areas came from a backend/exporter scene package pipeline, not from a frontend-only placeholder. The observed POC path is:

`ARE + GIT + SET + 2DA + MDL + texture lookup -> composed scene.json -> Three.js viewer`

Factory consequence:

- Worker Alpha must aim tile work and opened-area runtime proof toward a real area scene package or equivalent derived render contract: selected-area `ARE TileList -> SET model -> MDL/GLB/texture readiness`, exact per-area loader blockers, and real geometry preference when available.
- Worker Beta must aim object work toward first-class placeable/door model contracts: GIT order and source ids, `Appearance -> placeables.2da ModelName`, `template/appearance/generic type -> door model`, and selected-object capture datasets.
- Independent Audit must check whether runtime Areas expose coherent tile/placeable/door metadata and keep helper geometry hidden unless explicitly debug-enabled.
- Current source-backed bridges stay useful and visible, but they are not the final Aurora path and must not be promoted to retail parity.

## Current Visible Priorities

P0 is the user seeing a real Aurora-like area, not a prettier placeholder.

1. Terrain and tiles
   - ARE TileList must determine grid dimensions, tile ids, orientation, height, and tile order.
   - SET metadata must resolve tile model resrefs wherever available.
   - The frontend must stop treating complete tile model metadata as a terminal visual blocker. It should use the best available source-backed visible path while clearly marking non-retail/local limitations.
   - Tile rotation and placement must preserve Aurora row/column semantics.

2. Placeables and doors
   - GIT objects must appear in their source positions with bearing, z/elevation, and stable object ids.
   - Placeables and doors should be visually distinct and ordered in a way that makes the area readable.
   - Door presentation should be treated as a first-class visible lane, not a generic marker if source-backed door data exists.

3. Area composition and controls
   - Area selection should make visible what source data is loaded: tile count, tileset, model resolution count, object counts, and blockers.
   - The viewport should expose enough runtime dataset/debug values for screenshot verification: terrain status, tile count, model resolved count, object count by kind, and selected area id.
   - UI text must describe real source status, not imply parity that is not proven.

4. Walkmesh and transitions
   - WOK/DWK and walkmesh overlays are a later P0/P1 lane once terrain and doors are visible.
   - If walkmesh data is missing, mark the exact blocker and keep moving on visible source-backed terrain/objects.

## Iteration Protocol

1. Rebuild context from the durable Areas files and current repo.
2. Coordinator updates assignments if the current directive is stale, completed, or blocked.
3. Workers implement one narrow visible slice from the current directive.
4. Independent audit inspects the app/source path and reports the next visible gaps.
5. Prefer source-backed implementation over new tests.
6. When running checks, keep them lightweight and tied to touched files or app visibility.
7. Update `areas-loop-state.json`, `areas-context-pack.md`, `areas-claim-registry.json`, `areas-run-log.jsonl`, and any relevant latest report.
8. Continue automatically while the next step is safe.

## Safe-To-Continue Statuses

- `checkpointed`
- `needs_visible_slice`
- `visible_fix_in_progress`
- `blocked_but_alternative_visible_lane_available`
- `context_compacted`

## Hard Stop Statuses

- `dirty_diff_too_large_for_role`
- `needs_human_architecture_decision`
- `same_blocker_repeated_three_times`
- `canonical_promotion_pending`
- `done`

## Required End-Of-Iteration Fields

Each completed worker or audit iteration must record:

- `activeClaim`
- `claimStatus`
- `visibleChange`
- `auroraSourceUsed`
- `hypothesisTested`
- `disproofResult`
- `commandsRun`
- `filesChanged`
- `blockers`
- `nextStep`
- `resumeInstruction`
