# Binary entry reopen: owner admission audit

Date: 2026-09-06. Request: TLC07B. Stage: offline audit, reproduction and pure admission validation.

The candidate is the same immutable r8 post-save MOD/ordered-HAK/Area/entry.
Closing its old Toolset session does not invalidate the saved geometry source,
but a newly opened Toolset process cannot inherit the old process identity.
This audit does not enumerate processes, inspect windows, open Toolset/NWN,
capture, or modify consumer files. It uses the existing pure modules and
synthetic file fixtures, never imports an executable runner.

Rules: canonical aurora-web rules, AGENTS and backend RULES were reread;
aurora-toolset-operate and aurora-toolset-prove apply. This is an evidence and
session-ownership boundary, not a new Aurora runtime semantic. No xoreos was
consulted. Changes are isolated to `C:/Projects/aurora-native-entry-07b`, branch
`codex/native-entry-reopen-20260906`; deployed 07 stays unchanged.

## Existing boundary

Line references in this section describe the inherited 07 baseline before the
07B wrapper integration. The old-owner behavior remains the default when no
validated reopen admission is supplied.

- `backend/scripts/lib/aurora-binary-entry-surface-contract.mjs` derives owner
  exclusively from `manifest.open.process` and `nativeSave.save`. Its returned
  owner explicitly has `livenessVerified:false`.
- `backend/scripts/lib/aurora-binary-entry-surface-workflow.mjs:34-39` copies
  that historical owner into `captureBinding`. `checkRequest` later recomputes
  the same owner from the immutable source snapshot and rejects a substituted
  owner. These checks are correct for the original session, but no public
  admission currently connects a completed reopen to a different owner.
- The capture producer compares expected PID/start/frame to actual measured
  identity. A correct new owner is therefore rejected under an old binding.
  Editing the source manifest or binding is not a valid workaround.

## Existing central preparation precedent

`backend/scripts/prepare-aurora-model-proof-120s.mjs:199-276` writes
`state-before.json` and `plan.json`, delegates cold preflight/open to the
existing binary producer, requires final `adopt`, and writes `state-ready.json`
and `prep-result.json` with `status:proof_ready`, profile identity, prepOutDir,
target and steps. `decidePrepRoute` rejects NWN presence, multiple Toolsets,
dirty/unresponsive/modal state, and ambiguous canonical viewport.

For this new explicit reopen admission, the initial route must be **cold**.
The broader preparer's ability to adopt or switch a pre-existing clean session
is not authorization to use that session for this transition. The producer
must retain zero Toolset/NWN observations before its owned launch, complete
the same request's preparation, and observe exactly one matching ready owner
afterwards. Failed or incomplete prep is not a receipt.

## Implemented pure admission boundary

The composition uses a separate `aurora-entry-reopen-receipt/v1` receipt and an
`aurora-entry-reopen-request/v1` request. Preserve the
historical source object, including its old owner, unchanged. The receipt binds:

1. Exact source manifest/profile/post-save-profile identities and actual saved
   MOD/ordered-HAK/Area/entry/GIT identity before and after reopen; no Save or
   resource mutation is admitted during reopen.
2. A new reopen request identity, created time, expected source identity and
   exclusive prep directory; newly generated prep profile/plan hashes belong
   to that request, not another session's ready packet.
3. Fresh before state with Toolset and NWN arrays empty; old or foreign
   processes cause rejection rather than closure, adoption or switching.
4. Complete `prepare` result with initial `cold`, final `adopt`, matching
   request profile/path/hash/target/prepOutDir and immutable step/state files.
5. Ready/current state with exactly one responsive Toolset, no NWN/modals/dirty
   title, exact MOD and Area, one canonical owned viewport, DISPLAY1 nonprimary,
   and matching PID/start/frame/viewer/viewport across every ready observation.
6. A new owner identity. Windows may reuse a PID: compare PID **and** process
   start time, not PID alone. Reject the same old PID/start tuple. New owner
   comparison preserves full UTC precision through 100 ns ticks; a one-tick
   difference within the same millisecond is a mismatch. Equivalent trailing
   fractional zeros are accepted, while the returned timestamp remains raw.
   Only comparison against the historical source's already truncated StartTime
   uses epoch-ms precision to exclude the old tuple.

The pure validator receives parsed evidence from the composition layer and
returns `{owner,target}`. It has no process/native/filesystem ports. It reuses
the existing pure canonical viewport classifier, not an executable runner.
The public composition owns
fresh observations and file hashing. The receipt proves preparation/ownership,
not accessibility or model/runtime visibility. Entry arm may use the admitted
current owner while retaining its unchanged source and old owner in history.
Capture must still measure and match the actual current owner when it runs.

The profile is preparation-only (`aurora-entry-reopen-prep-profile/v1`), not
a fabricated model-proof or runtime geometry profile. Request `prepProfile`
and `binaryProfile` are immutable file identities. The pure validator checks
shape and plan/result bindings; the disk coordinator must recompute actual
file hashes, verify generated profile content, freeze producer identities and
bind evidence paths to the request directory. Parsed JSON alone does not
authenticate a process or establish provenance.

`backend/scripts/lib/aurora-binary-entry-reopen-contract.mjs` exports:

- `validateReopenPreparation({source,request,plan,result,before,ready,fresh,now})`:
  30-minute request window, causal observations, before state empty, completed
  cold-to-adopt preparation, exact source/target/profile and ready/current owner;
  step references must be `cold-preflight`, `cold-open`, optional `load-area`,
  in that order and under the request's prep directory. The coordinator hashes
  and snapshots the actual child records and checks their completion evidence.
- `validateReopenArmState({owner,target,state,notBefore,now})`: current state
  after `notBefore`, less than 30 seconds old, same full owner, clean exact
  MOD/Area and canonical viewport, no NWN presence.

Both return independent copies of `{owner,target}` and throw coded `REOPEN_*`
errors. Neither accepts a caller accessibility flag nor produces an entry,
model-visibility or runtime success claim.

## Desired negative matrix

Reject old owner tuple; arbitrary owner without complete evidence; foreign MOD
path/hash, reordered or changed HAK, Area/entry/GIT/source drift; any old/foreign
Toolset or NWN before reopen; more than one or different owner afterwards;
failed/incomplete/missing preparation; initial adopt/switch; another request's
profile/plan/prep directory; missing or mismatched file hashes; nonmonotonic
observation times; dirty frame, modal, wrong monitor, wrong/ambiguous viewport;
and a current-state identity differing from prep-ready. Include positive PID
reuse with a genuinely later start time and an unchanged source control.

The existing-owner reproduction is a pure-helper/fixture boundary test, not a
live or full executable CLI reproduction. Its expected rejection confirms the
missing admission path; it is not an unsafe-acceptance finding.

## Results

The existing-owner reproduction passed all 3 tests. It demonstrates the
historical owner freeze with synthetic files and capture metadata, without
native observation or full CLI execution. A new owner fails the old capture
binding; editing the binding fails immutable-source reconstruction.

The desired contract was tested first: its initial run failed because the new
module did not yet exist. The implemented isolated suite covers admission,
100 ns owner drift, PID reuse, source/target/profile drift, incomplete or
foreign preparation, modal/monitor/viewport rejection, timestamp boundaries
and output non-mutation. No live reopen has been performed or qualified by
this audit.

Focused command, run from this worktree:

```powershell
node --max-old-space-size=1024 --test --test-concurrency=1 backend/test/unit/aurora-binary-entry-reopen-contract.test.mjs backend/test/unit/aurora-entry-reopen-owner-reproduction.test.mjs
```

Result: **14/14 passed** (11 new contract tests, 3 historical-owner reproduction
tests), exit 0, 391.7933 ms. All process/window observations in these tests are
synthetic. No live native process or process-enumeration port ran.
