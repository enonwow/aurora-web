# Aurora Toolset performance plan - 2026-07-11

## Proven baseline

The successful live run is recorded in
`backend/docs/aurora-reverse/artifacts/toolset-session-20260711/three-area-live-result.json`.

- exact module: `the_last_city - codex.mod` with pinned SHA-256;
- one Toolset process on the proof monitor at `X=-1920`;
- load owner `mru`, `explicitOpenCount=0`, no second module action;
- three verified Area viewers in sequence: `enon_test_mount`, `enon_test_ah`, `enon_test_chest`;
- no Access Violation or `List index out of bounds` modal;
- targeted close ended with zero Toolset processes and windows.

## Where the time currently goes

### Module open

`ensureModuleLoaded` reported `elapsedMs=33274`. The complete manager command took
about 53.8 seconds because `waitForToolsetUnsafeModalAfterSettle()` adds a fixed
15-second post-load delay. Startup also contains fixed 3-second and 4-second
sleeps around process creation and welcome handling.

The 33.3-second Toolset load is not all removable, but the fixed post-load 15
seconds and most of the 3/4-second control delays are automation overhead.

### Area open

The two directly measured small Area opens took about 16.5 and 16.3 seconds.
Each call currently:

1. enumerates all Toolset child windows again;
2. scores 21 TreeViews again;
3. scans 52-66 Area tree items again;
4. sends the targeted double-click;
5. waits a fixed 8 seconds instead of detecting `TfrmViewerArea` readiness.

The fixed eight seconds and repeated discovery dominate small-Area navigation.

## Target workflow

### Module phase

1. Run the exact-path and SHA-256 preflight once.
2. Start one process on `X=-1920`.
3. Poll the welcome/progress/module state at short intervals; do not use a fixed startup pause.
4. Select only an exact module-list text match when Toolset requires explicit selection.
5. The first module title or `TdlgProgress` claims the load owner permanently.
6. Mark ready when the exact module frame exists, no progress dialog exists, and no critical modal exists.

Replace the fixed 15-second post-load sleep with state polling. Two consecutive
clean observations are sufficient to reject transient dialog disappearance
without delaying every successful run by 15 seconds.

### Area phase

Create one persistent Area navigator after the module becomes ready:

1. Discover the module contents TreeView once.
2. Expand `Areas` once.
3. Build and retain a map of `area name/resref -> HTREEITEM` once.
4. For each request, select the cached handle directly.
5. Wait until a visible `TfrmViewerArea` title contains the requested resref.
6. If the viewer already exists, activate it instead of double-clicking again.
7. Optionally close the previous viewer after the next viewer is ready, keeping one Area viewport alive during long queues.

Screenshot/capture is a separate optional proof stage. A capture-policy blocker
must not convert a successfully opened Area into a navigation failure.

## Acceptance targets

- zero fixed waits in the successful module/Area path;
- module selection dispatched within 2 seconds after a usable welcome/dialog state appears;
- no automation delay after the exact module becomes ready;
- cached Area selection dispatched in under 500 ms;
- small Area viewer detected as soon as `TfrmViewerArea` appears, normally within a few seconds;
- one Toolset process, one module owner, zero second module actions;
- wrong module, recovery, AV, or ambiguous Open dialog remains fail-closed;
- a 100-Area navigation run does not accumulate 100 open viewers.

## Implementation order

1. Replace the fixed 15-second module safety settle with state polling.
2. Replace the fixed 8-second Area delay with `TfrmViewerArea` readiness polling.
3. Cache the TreeView and Area-handle map for the session.
4. Split navigation result from optional screenshot result.
5. Add per-stage timings to `session-state.json` and enforce the acceptance targets.

## Optimized repeat run

The repeat run after the first two timing changes passed. Durable result:
`backend/docs/aurora-reverse/artifacts/toolset-session-20260711/three-area-repeat-optimized-result.json`.

- module manager command: 45.1 s, down from 53.8 s;
- Toolset's own module-ready path was slower in this sample (38.732 s versus 33.274 s), so the manager improvement is larger than the raw total suggests;
- three-Area navigation queue: completed, `opened=3`, no capture dependency;
- viewer readiness after the targeted double-click: 25 ms, 11 ms, 10 ms instead of a fixed 8 seconds per Area;
- exact module and all three viewer titles verified; no critical modal.

The next bottleneck is before the double-click. Total adapter times were 18.088 s,
8.438 s, and 2.765 s because every call still repeats process/window discovery,
TreeView scoring, and Area-child scanning. The persistent TreeView/Area-handle
cache is therefore the next implementation priority.
