# 07B patch 1: bind the public cold-open owner

Date: 2026-09-06. This narrow correction supersedes the owner-handoff acceptance
of the initial 07B delivery. The original deployment manifest, backups and test
logs remain immutable. No native action or process/window probe was performed.

## Reproduction

The initial workflow hashed child step records but checked only their paths,
names, result success and timestamps. It did not bind `cold-open.result.process`
to the owner observed by ready/fresh state. The existing generic preparer chooses
its summary owner from a later snapshot. Consequently, public open could return
process A, A could disappear, and another process B showing the same MOD/Area
could pass admission. This is a process-lineage defect, independently of JSON
authentication or artifact hashes.

Offline tests with a contract-shaped public open payload reproduced both
A-to-B substitution and a different 100 ns StartTime on the same PID. Before
the fix both tests failed with `Missing expected exception`. The red log is
`C:/Projects/aurora-native-entry-07b/output/native-entry-07b/cold-open-owner-reproduction-red.txt`.

The actual saved r8 `open.process.StartTime` is
`/Date(1788652146824)/`: Windows PowerShell's legacy JSON DateTime serialization
has millisecond precision. It cannot establish a full-precision owner.

## Correction

The existing binary producer's `toolsetProcesses()` measurement adds
`StartTimeUtc` using `StartTime.ToUniversalTime().ToString('o')` in the same
`Select-Object` call. Legacy `StartTime` stays unchanged for existing
continuation comparisons. No new inspector, launcher or native route is added.

The reopen contract now requires the hash-bound public cold-open payload to
have `ok:true`, `command:open`, status `binary_native_geometry_module_ready`,
and the exact `prepOutDir/cold-open/binary-native-geometry-manifest.json` path.
Its process must be responding and match the admitted PID and full UTC
StartTime to 100 ns. The full field is required; there is no fallback to legacy
milliseconds. StartTime must precede cold-open completion, which must precede
the ready observation. Existing step-name/path/hash checks remain mandatory.

These checks run before creating a reopen receipt and whenever the complete
receipt bundle is validated for ARM or from an embedded entry/v2 snapshot.
The same admitted owner is already matched against ready, fresh and ARM state;
therefore another process cannot replace the public cold-open owner merely by
showing the same target. Frame/viewer/viewport HWNDs remain actual ready/fresh
measurements; the open result does not fabricate them.

Positive simulation now reproduces the real public open result structure,
including legacy StartTime and the additive full UTC field. Negative coverage
includes A/B owner replacement, 100 ns drift, missing full precision, wrong
command/status/manifest, nonresponding owner, and changed embedded child
payloads with internally consistent replacement hashes. The existing full
reopen-to-geometry/v2 simulation and preservation-on-failure tests still pass.
An additional test extracts the actual producer projection and runs it on a
literal in-memory DateTime object in Windows PowerShell. It verifies both
legacy milliseconds and full UTC serialization, with all `Get-Process`/native
commands excluded from the executed test script.

## Delivery and limits

Four existing files change: the binary producer's one measurement line, the
reopen contract, reopen workflow, and workflow tests. The new projection test
and this note complete six patch files. Full before/after SHA-256 and parent deployment identity are in
`C:/Projects/aurora-web/output/native-entry-07b/cold-open-owner-patch-deployment.json`.
The initial deployment manifest and `post-deployment-verification.json` describe
the previous revision and are intentionally not rewritten.

The public commands and same-r8 paths from
`binary-entry-reopen-public-resume-2026-09-06.md` are unchanged. No live reopen
receipt existed when this correction was requested. Old incomplete receipts
or producer hashes fail closed; do not backfill StartTimeUtc or rewrite them.
Reopen remains ownership evidence only; real human Paint/Save and response,
bound capture, entry ingest/finalize and NWN acceptance are still required.
