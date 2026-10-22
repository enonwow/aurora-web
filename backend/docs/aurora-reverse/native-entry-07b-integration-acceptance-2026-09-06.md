# Native entry 07B: integration acceptance

Date: 2026-09-06. Implementation scope: saved-source reopen and new session
admission to entry/v2. Offline acceptance passed; live consumer acceptance is
pending. No Toolset/NWN process inspection, launch, UI action, capture, Paint,
Save, close or restart was performed by the implementation team.

## Result

The existing central prep wrapper exposes `entry-reopen-dry-run`,
`entry-reopen`, and `entry-reopen-arm`. It reuses the existing native inspector,
cold bootstrap and Area-opening route with a separate prep-only input adapter.
Source history stays immutable and ARM's capture binding uses the newly
admitted owner. Missing or invalid evidence never falls back to an old PID.

Public commands, exact same-r8 inputs and failure disposition are in
`binary-entry-reopen-public-resume-2026-09-06.md`. The offline owner-freeze
reproduction and negative matrix are in
`binary-entry-reopen-owner-admission-audit-2026-09-06.md`.

## Validation

Final isolated suite: **64 tests passed, 0 failed, 0 skipped**, exit 0,
5.598 seconds. Node ran with `--max-old-space-size=1024 --test
--test-concurrency=1`. The suite comprises:

- 11 pure reopen admission tests, including full 100 ns owner comparisons,
  same-PID/new-StartTime reuse, zero-process requirements, profile/source/Area/
  ordered-HAK drift, incomplete/foreign steps, stale state and native schema.
- 8 prep adapter tests preserving authoring data and historical profiles.
- 3 owner-freeze reproductions showing why a new admission is required.
- 4 source-closure tests, including missing and out-of-tree dependencies.
- 2 public CLI tests with native/process/write ports denied.
- 6 workflow tests: full simulated reopen → fresh ARM → simulated human
  Paint/Save → geometry/v2; source and producer drift; incomplete/foreign-session
  receipts; and a thrown preparation preserving the request, partial evidence,
  blocker, original manifest/profile/post-save profile/MOD/HAK bytes.
- 30 existing entry/v2, capture-integrity and S07 binding regression tests.

The real saved r8 source also passed public `entry-reopen-dry-run` using an
explicit **TEST SIMULATION** zero-process fixture with all native and child-file
write ports denied. Output is `output/native-entry-07b/r8-offline-dry-run.json`
in the isolated worktree. It is a source/CLI check, not a fresh host observation
or a live reopen receipt. Actual source SHA/bytes matched the documented r8.

## Change and deployment boundary

Worktree: `C:/Projects/aurora-native-entry-07b`, branch
`codex/native-entry-reopen-20260906`, base
`2a217bdca50660f9b810f4bc1d9dc254e1f84a58`.
Current shared uncommitted 07 and peer changes were snapshotted before editing.
Only two existing production files change: the prep wrapper gains an early
dispatch branch; entry/v2 workflow accepts and snapshots qualified reopen
admission. Four new libraries, six tests and three documents complete 07B.
No S07 runtime implementation or existing capture producer was rewritten.

Deployment is a narrow, hash-preconditioned copy of these 15 source/test/doc
files to `C:/Projects/aurora-web`, with exact before/after SHA-256 and backups
recorded in `output/native-entry-07b/deployment-manifest.json`. No commit, merge,
service activation, Studio install or native acceptance is implied by that copy.
The producer closure pins 209 local source/configuration files at each real
reopen; only changed deliverables are deployed, not the whole dependency tree.

## Remaining live acceptance

The consumer must review this handoff, perform fresh host/file checks and the
published dry-run, then execute the exact same-r8 reopen once. A successful
receipt establishes reopen ownership only. The 15-minute Paint request is armed
only when the actual window and human are ready. Actual human Paint/Save and
response, bound capture, ingest/finalize, S07 and NWN recording remain required.

Local receipts have integrity/provenance checks, not cryptographic producer
authentication. No test fixture may be reported as a live observation. A lower
startup blocker preserves evidence and session for qualified review; it does
not authorize a retry, another module, a new lineage, or forcing a prep-only
profile through a model-proof continuation. Native VFX correctness remains
unverified until the consumer performs and accepts the actual NWN test.
