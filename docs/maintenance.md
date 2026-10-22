# Repository artifact retention

## Mandatory implementation closure

After every successfully verified implementation, complete the cleanup and
knowledge-consolidation gate in [AGENTS.md](../AGENTS.md) and
[canonical rule 36](../../ai-documentations/aurora-web/rules/README.md).
Document the successful reproduction recipe and lessons from failures in the
existing canonical domain document before deleting redundant task artifacts.
Use the [documentation map](README.md) to choose the owner and update its index.

Structure the knowledge update as: **goal and scope; revision/inputs and
prerequisites; successful steps and exact commands; expected result and
verification; failures, causes and fixes; prevention checks; remaining limits;
retained evidence and cleanup result**. Record a reason for each retained
artifact set. Actual cleanup and a verified documentation update are required
before reporting full completion.

## Classification before cleanup

| Category | Treatment |
| --- | --- |
| Tracked files, staged changes and untracked non-ignored work | Preserve; never use reset, checkout or blanket clean for disk cleanup. |
| `backend/src`, `frontend/src`, scripts, tests, fixtures, configuration | Source/data dependencies; preserve. |
| `frontend/public`, module mirrors, runtime data, `.env*` | Preserve unless a specific consumer and recovery path have been verified. |
| `.git` including LFS and worktree metadata | Preserve; use managed worktree lifecycle tools for separately authorized retirement. |
| `backend/node_modules`, `frontend/node_modules` | Keep the installed development environment; lockfiles describe reinstalls but do not prove current offline availability. |
| `backend/dist`, `frontend/dist` and latest proof build | Keep the current artifacts unless replacement/rebuild is part of the task. |
| `.stryker-tmp/sandbox-*` | Disposable generated mutation-test copies only after confirming no runner owns them and no protected path lies below them. Unlink dependency junctions without following them. |
| Older standalone build copies | Remove individually after checking ownership, contents, references and retained current builds. |
| `output`, proof captures, evidence, Ghidra projects, receipts | After consolidating knowledge, remove reviewed redundant artifacts. Retain the minimum originals required by active acceptance, regression, provenance or replay contracts, with a recorded reason; uniqueness alone does not justify permanent retention. |
| Toolchain archives and caches | Inspect provenance/consumers; an archive bundled into a hash-bound research packet may be part of its replay contract. |

## One working set and retirement of historical materializations

Apply global AGENTS.md section 2a: reuse one current source/work/output set and
extract shared resources once per source version. Preserve the last accepted
result and one necessary recovery point. Additional full copies require a
recorded purpose, owner, size and deletion condition. Do not commit repeated
large builds or use hardlinks as independent editable files.

A historical `proof`, `frozen` or `evidence` label does not require keeping
every materialized input forever. Once the owner retires a superseded attempt,
retain its conclusions, failures, exact recipe and irreplaceable observations.
Identical inputs may resolve to one retained, hash-verified copy. A small
lossless archive may preserve exact historical JSON needed for replay while
the redundant expanded plan is removed. Record this as **retired / restore
before replay**, not as a currently complete runnable packet. Keep the active
plan, current data and unresolved diagnostic originals intact.

Before deleting a copy, verify its canonical replacement byte-for-byte and
document rehydration. Do not rewrite an immutable historical manifest to make
it falsely validate against different inputs. Verify archive round trips and
retain a compact recovery map. Rehydrate only the one requested packet, then
retire its temporary materialization again after use.

Some existing lineage-v2 runners explicitly require fresh packet roots and
self-contained staged inputs. That contract prevents blindly replacing paths
with links or reusing a completed packet. Before another full research run,
either use the documented retained workspace for an admitted read-only task,
or implement and test a shared immutable-input contract in the central runner.
Do not start repeated full copies while that prerequisite is unresolved.

## Procedure

1. Read central rules and record scope under `docs/brainstorm`.
2. Capture Git status/index, a no-follow size inventory, free disk space and
   content hashes for protected files. Record unreadable files explicitly.
3. Inspect exact candidate paths and current process ownership. Save the
   removal plan and file manifest before deletion.
4. Resolve every target inside the approved workspace. Reject reparse
   ancestors; do not recurse through dependency junctions or external links.
5. Delete only reviewed candidates, recording successful removals.
6. Verify protected hashes and staged state, retained dependencies/fixtures,
   documentation links, appropriate checks and before/after disk figures.

Build outputs can be regenerated with `npm.cmd run build` in the respective
application folder when a build is requested. Old mutation sandboxes are
temporary runner output; their cleanup never authorizes a mutation test run.
Follow the repository opt-in and resource controls before any future mutation
test. Never regenerate large outputs merely to verify a disk cleanup.

## Executed maintenance

- [2026-09-29 measured audit and removal ledger](audits/disk-cleanup-2026-09-29/README.md).
- [2026-10-02 continuation: historical materializations](audits/disk-cleanup-2026-09-29/retirement-2026-10-02.md).
