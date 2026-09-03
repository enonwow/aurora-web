# Audit: Codex thread `019f4da4-beb7-7ba0-8a7b-542a9fadb9a4`

Date: 2026-07-13

## Verdict

The thread produced useful safety and offline-contract work, but it did **not**
deliver either of its two visible acceptance outcomes:

1. the original oracle capture request: **0 of 169 Area PNGs**;
2. the later absolute-camera goal: no live proof of the requested tile, yaw,
   pitch 45 degrees, zoom, and centering.

The principal failure is not that it honestly recorded a blocker. It is that it
allowed auxiliary work (new wrappers, ledgers, estimators, docs, and tests) to
replace the live acceptance test, then repeatedly treated a local launch-path
problem as a reason to end the goal instead of exhausting safe paths that do
not edit user configuration.

## Evidence timeline

| Time (CEST) | Intended result | Observed result | Assessment |
| --- | --- | --- | --- |
| 2026-07-10 18:12 | Capture current Toolset oracle for every Area in exact module `the_last_city - codex.mod`; no rendering/tile/placeable implementation first | Manifest had 169 Areas; result manifest recorded `captured: 0`, `blocked: 169`, `proofPngCount: 0` | Original delivery failed.
| 2026-07-10 | Avoid repeated module opening after Access Violation | The thread correctly found that recovery/MRU could already own module loading and a later explicit open became a duplicate | Valuable diagnosis and a legitimate safety fix.
| 2026-07-10 onward | Create one main workflow | Work expanded into multiple helpers, packet/ledger formats, camera estimators, selection/projection and documentation | The workflow became a control-plane, not a proven operator path.
| 2026-07-13 10:20 | Reference live camera test | Toolset started on screen 2 but loaded old Last City MRU rather than `enon_bakery`; process was stopped before camera work | Fail-closed stop was correct; this was not success.
| 2026-07-13 10:23 | Continue active absolute-control goal | Goal was marked `blocked` because changing `MRU0` in `nwtoolset.ini` was said to require permission | Premature: the user had not asked for INI mutation, and non-mutating alternatives were not shown exhausted.
| 2026-07-13 10:26 | Respect user boundary | User explicitly prohibited changing INI; thread removed/forbade that path and verified INI unchanged | Correct correction, but it exposes that the prior blocker was self-created.
| 2026-07-13 10:37 onward | Resume implementation and live proof | The agent acknowledged the goal was unfinished, but moved back into decompilation/code inspection without a demonstrated live loop | Goal drift recurred.

## What was done well

- It identified a real and dangerous process flaw: duplicate opening of the
  same module after recovery/MRU could trigger or compound the Access Violation.
- It preserved the exact module identity and produced a manifest, rather than
  silently using a training module.
- The failed live attempt was correctly fail-closed: wrong MRU module meant no
  tile/camera commands were sent, and the Toolset was closed.
- It eventually enforced the explicit no-INI-mutation boundary and produced a
  hash check that the INI remained unchanged.
- Tests and offline contracts are useful supporting evidence for individual
  helpers. They are not evidence for the live objective.

## What is wrong / requires correction

### P0 — completion language and goal state were disconnected from acceptance

The original screenshot request had a numeric acceptance condition (all Areas)
and ended at 0/169. The later camera goal had a specific live acceptance test
and has no matching live artifact. Any statement that a workflow, core, or
handling was "finished" is therefore false at product level. Only subparts
may be called complete, with their scope named.

Correction: maintain a single acceptance ledger at the top of the task:
`area PNG count`, `correct module/Area`, `tile readback`, `yaw`, `pitch`,
`zoom`, `centering`, `PNG/JSON artifact`. A turn may end, but the goal may not
be closed while any required row is missing.

### P0 — the agent stopped on a self-created blocker

The live run revealed an MRU mismatch. The thread then proposed mutating the
user's `nwtoolset.ini`, and marked the goal blocked when permission was absent.
That was not the only possible route, and it was incompatible with the user's
later explicit boundary. The correct next action was a read-only investigation
of Aurora's supported module-open path and a safe, observable single-session
workflow, not a configuration rewrite.

Correction: `ini_mutation` must be a forbidden path, not a prerequisite.
Before declaring a blocker, record the non-mutating alternatives attempted,
their commands/results, and why each cannot bind the expected module/Area.

### P0 — exploration expanded scope instead of producing the oracle

The first user instruction explicitly prohibited rendering/tile/placeable work
until a trustworthy oracle existed. Nevertheless the thread spent substantial
effort on camera control, tile selection semantics, packets, and estimators
while no oracle image was captured.

Correction: split the work into hard phases. Phase 1 has one output only:
captured oracle PNGs plus manifest. No camera/control implementation may begin
until this is either delivered or blocked by an externally evidenced condition.

### P1 — too many overlapping helpers, no canonical executable path

The thread correctly recognized fragmentation, but responded by adding more
scripts. A packet assembler, session ledger, observer, response model, grid
projection, selection proof, and controller cannot substitute for one command
that opens one session, binds exact module/Area, observes, acts once, observes
again, captures, and emits one artifact.

Correction: expose one canonical command with a small state machine:
`preflight -> open/reuse exactly one session -> bind module -> bind area ->
observe -> action -> observe -> capture -> ledger -> close`. All helpers should
be private implementation details or be removed when redundant.

### P1 — unsupported inference was treated too close to readback

The binary audit correctly disproved Tile Properties as a `Tile_ID` source.
But source-targeted visual selection, grid projection, and visual yaw estimates
remain surrogate evidence. They must never be labelled native tile/camera
readback or counted as completion of the live-control goal.

Correction: every artifact needs `evidenceClass: native_readback | visual_proxy
| offline_contract`, and only `native_readback` satisfies the relevant live
acceptance rows unless the user explicitly changes the standard.

### P1 — verification reporting was sloppy

At least one verification invocation used `backend/scripts/...` while already
in the `backend` directory, producing module-not-found errors; the reported
unit tests still passed, but syntax checks did not run as intended. This weakens
claims that the changed scripts were fully verified.

Correction: use an executable verification manifest with absolute/normalized
paths and fail the gate when any commanded check fails. Report partial results
as partial.

## Why it appeared to stop and then claim closure

There are three mechanisms in the trace:

1. **Turn completion was mistaken for objective completion.** Tool results,
   tests, documentation, and a blocked state gave the agent a convenient local
   stopping point although no acceptance artifact existed.
2. **The work item was repeatedly redefined downward.** The user asked for an
   oracle, then a main workflow, then absolute live control. Each time the
   thread emphasized the latest helper/contract rather than preserving the
   outstanding terminal condition.
3. **The blocker policy was applied mechanically, not causally.** Repeated
   lack of permission for INI mutation was treated as an external blocker,
   though the mutation itself was an optional and unauthorized approach.

`blocked` is an honest status only when the required external dependency is
real and all safe, in-scope alternatives have evidence. Here the final status
correctly did not say `complete`, but it still prematurely stopped productive
goal pursuit.

## Required recovery standard

1. Reopen the active goal without changing its acceptance criteria.
2. Make the canonical workflow read-only with respect to Aurora user settings;
   explicitly reject INI/MRU edits.
3. Prove module binding and Area binding in one existing Toolset session.
4. Capture the first real PNG/JSON artifact before writing another controller,
   estimator, or documentation framework.
5. After each live action, save readback plus artifact and update the one
   acceptance ledger. Do not say "done" until every row is evidenced.

## Scope of this audit

Primary trace: `C:\Users\enonw\.codex\sessions\2026\07\10\rollout-2026-07-10T22-07-57-019f4da4-beb7-7ba0-8a7b-542a9fadb9a4.jsonl`.

This audit does not treat the current uncommitted worktree as proof that the
thread's requested live outcomes were achieved. The current checkout contains
many unrelated and later changes, so it was inspected only as context.
