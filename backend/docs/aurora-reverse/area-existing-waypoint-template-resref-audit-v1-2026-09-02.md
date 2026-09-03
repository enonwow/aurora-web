# Existing Area Waypoint `TemplateResRef` audit v1

Date: 2026-09-02  
Status: source-closed and offline implementation verified; fresh browser,
Toolset, and NWN certification pending  
Scope: exact presence-sensitive `TemplateResRef : ResRef` readback and
compare-and-swap replacement for one retained type-`5` Waypoint in the Area
GIT root `WaypointList`

## Decision

Aurora Web may replace one exact existing Waypoint
`TemplateResRef : ResRef` within the deliberately narrow canonical product
profile `[a-z0-9_]{1,16}`. Missing, empty, duplicated, wrong-case,
wrongly-typed, noncanonical, or otherwise ambiguous storage is visible but
`PRESERVE_ONLY`; it does not authorize adding, normalizing, or relocating a
native field.

The mutation addresses the retained instance only by its immutable Waypoint
family ordinal and compares the complete native source value before writing.
It does not resolve or rewrite a UTW, change palette identity, change renderer
or catalog `SceneObject.resRef`, create a Waypoint, mutate `LinkedTo`, or
activate the Toolset's bulk `Update instances in current area` behavior.
`LinkedTo` remains preserve-only under the independent
`target_reference_runtime_pending` blocker.

## Immutable primary authority

The admitted read-only evidence is:

- `C:/Projects/New Folder/export/decompiled_all.c`, SHA-256
  `36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572`;
- `C:/Projects/New Folder/export/functions.tsv`, SHA-256
  `394096fe106e5767ee6eceb31c8b085091359060351b1d10195e96f666bc69fe`;
- retail
  `C:/Program Files (x86)/Steam/steamapps/common/Neverwinter Nights/bin/win32/nwtoolset.exe`,
  SHA-256
  `4c156de898817518e8a97f5d989592894d3c8f48b71d27e2a8b89500cd230f24`;
- `C:/Projects/nwn-last-city/Aurora/reverse/runs/NWTOOLSET_RCDATA_REFRESH_2026-05-20.json`,
  SHA-256
  `3d9c5d29709bcf4aa037554781d229a2094f3d85370c44a6a5df9a222f8d87fa`;
- the frozen 3,368-byte `TDLGWAYPOINTEDIT` resource within that inventory,
  SHA-256
  `8a228ea412ed5763283486b4211d42752fec0a335159dfe1138d3e3dc6959506`.

No xoreos or other GPL source was inspected or used. This audit did not start
Docker, a service, watcher, browser, Chrome, Toolset, NWN, capture, mutation
testing, or a sub-agent.

## Native storage closure

Common Waypoint reader `FUN_00658170` begins at decompiled line `346780` and
calls native ResRef reader `FUN_00aeef98` with exact label `TemplateResRef` at
lines `346832-346833`. The read value is owned by the common Waypoint member
at `param_1 + 7`; adjacent `Tag`, `LocalizedName`, `Description`, `Appearance`,
`LinkedTo`, map-note vector, and `VarTable` members are read independently.

Reciprocal common writer `FUN_00658b4c` begins at line `347158` and calls the
native ResRef writer `FUN_00aeffa4` with that same member and exact label at
line `347172`. `Appearance` and `LinkedTo` are separately emitted at lines
`347170-347171`, and the remaining Waypoint properties follow separately.
This establishes exact type-`5` GIT storage ownership and rules out an alias
with appearance, link target, map note, variables, or paired GIC state.

The generic `FUN_00aeef98` / `FUN_00aeffa4` lineage identifies native GFF type
ID `0x0b` (`ResRef`). Although Aurora's writer can fold ASCII uppercase bytes,
the web mutation does not depend on that behavior: both expected and target
values must already be canonical lowercase ASCII.

## Toolset presentation closure

The frozen `TDLGWAYPOINTEDIT` `TPF0` form contains the Advanced-tab label
`lResRef`, visible caption `Blueprint ResRef`, editor `eResRef`, and handler
`eResRefChange`. It also contains
`bUpdateInstancesInArea` with caption ` Update instances in current area` and
handler `bUpdateInstancesInAreaClick`. This independently establishes that
the retained Waypoint dialog exposes the native property and that the bulk
update action is a distinct behavior. The v1 web contract admits only the
selected retained instance and intentionally excludes bulk propagation.

## Frozen additive cross-boundary contract

Area detail may add this presence-sensitive fact to one type-`5` placement:

```ts
type WaypointTemplateResRefStorage =
  | { present: false }
  | { present: true; nativeType: "resref"; value: string };
```

Only a retained `aurora_git` Waypoint with a non-negative immutable family
ordinal and one admitted present value receives detached immutable frontend
source provenance:

```ts
source.waypointTemplateResRef = { expectedResRef: string };
```

The visible control is Advanced-tab `Blueprint ResRef`; its flat editable
scene transport field is `SceneObject.waypointTemplateResRef`. It is
deliberately independent from `SceneObject.resRef`, dynamic UTW construction
identity, appearance, palette metadata, and `LinkedTo`. A changed admitted
target may project exactly:

```ts
templateResRef: {
  expectedResRef: string;
  resRef: string;
};
```

Both members independently match `[a-z0-9_]{1,16}`, must differ, and admit no
unknown keys. Missing provenance, malformed storage or target, no-op pairs,
wrong family or ordinal, stale source, deletion collision, duplicated native
field, aliasing another identity, or an attempt to add an absent field fails
closed.

## Projection, write, preservation, and diagnostics

HTTP parsing validates the exact storage shape. Scene mapping detaches
provenance only for the complete admitted retained-object state. Saved
workspace validation repeats the source/target/family/ordinal relationship.
The dialog control is `ACTIVE_NOW` only in that state and is otherwise visible
but disabled as `PRESERVE_ONLY`.

Projection emits the optional changed pair. Planning reparses the exact
retained type-`5` ordinal, requires exactly one canonical case-sensitive
`TemplateResRef : ResRef`, and compares its complete value. Writing replaces
only that field, verifies the paired GIT structure and mutation receipt, and
preserves every sibling GIT field plus all GIC bytes except for independently
admitted mutations in the same transaction. Whole-candidate readback must
verify the target. A TemplateResRef-only publication emits the already
prepared candidate ARE, changes the exact GIT member, and preserves GIC and
module IFO byte-for-byte; unrelated resources retain the existing revision-
fenced atomic Area Update guarantees.

Existing authorization, permissions, optimistic concurrency, idempotency,
module fencing, journal, recovery, and payload budgets remain unchanged.
Routine telemetry may expose only contract revision, Waypoint family, bounded
ordinal, approved field token, stage, duration, and stable result code. ResRef
values, object IDs, hashes, paths, source/storage keys, raw fields or bytes,
credentials, and host paths are prohibited from metric labels.

## Test-first exit criteria and proof boundary

Offline closure requires strict domain and presence-sensitive parser tests;
snapshot clone/fingerprint coverage; exact source/target projection; stale,
unchanged, malformed, wrong-family, and deletion-collision rejection;
exact-ordinal planning; field-only writer and complete candidate readback;
combined Waypoint property publication with GIC/ARE/IFO preservation; strict
frontend HTTP, scene, workspace, and history-clone validation; visible
`ACTIVE_NOW`/`PRESERVE_ONLY`; guarded Apply/OK/Cancel/reopen/local-Save; and
renderer `SceneObject.resRef` independence. Focused repository tests and both
bounded production builds must pass sequentially.

Those offline criteria are now met. Backend domain/parser/projector/planner/
writer and candidate-bound tests pass, including the `992/992` whole writer
suite, the dedicated atomic-publication assertion, and the `13/13` capability
catalog gate. Frontend transport/mapper/workspace/clone/domain/provenance/
facade/dialog coverage passes (`773/773` across the focused group and
`345/345` in the HTTP suite), and the real Workspace regression passes the
Cancel/Apply/reopen/OK/local-Save flow while proving that renderer
`SceneObject.resRef` remains unchanged. Both Nest and TypeScript/Vite
production builds pass. The two previously exposed aggregate fixture defects
were then closed: the transform case now selects its intended fixture mode,
and the Waypoint property aggregator includes Description-only provenance.
The whole candidate-compiler suite passes `183/183`, and the combined main,
Description, and TemplateResRef projector suites pass `653/653`.

Capability revision `2026-09-02.162` removes
`remaining_waypoint_property_matrix_incomplete`. It deliberately retains
`target_reference_runtime_pending` for `LinkedTo` and exact browser,
Toolset, and NWN TemplateResRef proof blockers. Runtime source changes are
bound by immutable profile v16, digest
`9cc94415bd619d2c40d18f556da540389291987aa566dc623aa7c4f69afa7d39`,
and replacement matrix plan
`bbfc10446dcdf4bb9719bc6889d1c4241e9f8032a7636939b0a0d11acc99d68d`.
The plan validates as `ready` with verified source identity and remains at
`0/3380`; no runtime capture was claimed.

Fresh guarded browser Save/reopen, exact-candidate Toolset Save/Build/reopen
with packed GFF readback, and NWN verification remain release gates. Until
those artifacts exist, this slice and the aggregate Waypoint/Area program must
remain `partial`/`blocked`; offline tests and builds are not runtime proof.
