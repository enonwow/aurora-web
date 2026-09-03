# Aurora model-proof 120-second standard

Status: `ACTIVE CONTRACT / SLO VERIFIED 2026-07-22`

Superseded pre-certification status marker retained for the immutable route
contract: `SLO UNVERIFIED UNTIL LIVE INTEGRATION PASSES`.

## Scope

Use this standard only for an admitted, materialized, installed, immutable
MOD/HAK/model candidate. It performs proof, not authoring or repair.

The public coordinator is:

```powershell
node backend/scripts/aurora-model-proof-120s.mjs <command>
```

It owns the proof-ready Toolset and runtime routes. A consumer never calls
their native child atoms directly. Module/Area preparation is a distinct
`prepare` phase outside the 120-second SLO.

## Profile

Require `aurora-model-proof-120s-profile/v1` with all of these bindings:

- source and installed MOD path, resref, length, and SHA-256;
- ordered source and installed HAK paths, resrefs, lengths, and SHA-256 values;
- MDL, TGA, and 2DA identities;
- Area resref/display name and entry point;
- fixture ID, template resref, native tree text, occurrence, Appearance row,
  and position;
- Toolset capture target `TScrollBox`;
- exact NWN `Loading Module` token and engine-log path;
- an absent, profile-owned output root;
- preparation mode `adopt-exact-clean` or `switch-exact-clean`;
- hashes and contract versions of the coordinator and its owned route set
  through one hash-pinned
  `aurora-model-proof-120s-route-manifest/v1`.

Reject a missing field, optional fallback, unknown version, or self-consistent
profile drift from the caller-owned source profiles.

### Immutable route-manifest supersession

Do not rewrite an immutable candidate profile merely because central operator
maintenance changed the manifest at its existing path. A public continuation
is admissible only through a validated
`aurora-model-proof-120s-route-manifest-supersession/v1` chain or its current
multi-intermediate `aurora-model-proof-120s-route-manifest-supersession/v2`
successor.

The current manifest must embed an exact chain from the profile-pinned SHA-256
through every intermediate manifest. Each historical snapshot must reproduce
its declared bytes and hash. The validator compares complete ordered route
identity sets, forbids removals, and permits changes/additions only on the
explicit cleanup or compatibility allowlists. It rehashes every current route
from disk and requires the normalized timed coordinator to retain its declared
semantic digest. Lock mode v1 excludes only the manifest loader and its
evidence fields. Lock mode v2 additionally excludes only the named post-proof
cleanup commands, hidden-frame cleanup probe, cleanup-only validators, and
their imports, which are outside `LIVE_COMMANDS`. A profile pinned to any
declared historical snapshot replays the exact suffix from that snapshot to
current. Tests bind the certified digest and prove that cleanup-only mutations
preserve it while a timed runtime mutation changes it. Toolset selection/capture, NWN
launch/capture/log, deadline, verdict, candidate, and acceptance routes cannot
change under this mechanism.

`preflight` must report `profileExpectedSha256`, `resolvedSha256`, and the
versioned supersession admission. A different historical hash, missing
intermediate, undeclared route delta, file drift, or coordinator semantic drift
fails closed. Supersession is central operator compatibility evidence; it is
not a model iteration, profile mutation, proof verdict, retry, or permission to
start UI.

The public coordinator's preflight identity set is the exact current manifest
set, including preparation-only compatibility producers such as the
PID/StartTime/HWND-bound Welcome dialog closer. These producers are required
for publication completeness but are not timed proof actions; the semantic
normalizer removes only their named `ROUTE_SELF` declarations and must retain
the certified timed digest.

## READY happens before the clock

`ready` is read-only. Require:

1. Byte identity of source/installed MOD and every ordered HAK.
2. Passing central structural preflight of the real MOD.
3. No Save, Build, repack, `geometry-observe`, Focus, Properties, or camera
   action in the plan.
4. Zero `nwmain` processes.
5. Exactly one responsive clean proof-owned Toolset frame on the exact module
   and Area, with no `*` and no modal. Cold open or clean switch must already
   have completed through `prepare`.
6. Exact fixture tree text/occurrence and prepared runtime binding.
7. Every public phase and the coordinator/contract library present, matching
   the profile-pinned route manifest, and passing its exact-argv dry-run where
   supported plus its contract check.
8. An absent output root.

If any producer is unavailable, return `MODEL_PROOF_120S_NOT_READY`. READY
must not create the clock, output root, or live process.

### Exact cold recovery from `temp0`

Cold preparation may recover an existing native Toolset cache only when the
public binary-bootstrap route proves all of the following before launch and
revalidates it immediately before acting:

1. the installed MOD equals the profile-pinned source hash;
2. every supported ERF resource maps to exactly one expected `temp0` file;
3. every expected file is byte-identical to the MOD resource;
4. there are no missing, extra, non-file, duplicate-mapped, or reparse entries;
5. the visible modal is the exact known recovery prompt with one `Yes`/`Tak`
   and one `No`/`Nie` control.

The only admitted mutation is one targeted `BM_CLICK` on non-destructive
`Yes`/`Tak`. The resulting ownership is
`moduleLoadOwner=verified_temp0_recovery`; the same PID must settle on the exact
clean requested frame before Area work. This transition never archives,
deletes, renames, or rewrites `temp0`, never edits INI/MRU state, never uses
global input or `File > Open`, and never admits a new model iteration. Dirty,
wrong, repeated, unknown, or identity-mismatched state fails closed.

### Unexpected wrong-MRU module continuation

Cold startup may leave one responsive wrong-MRU module frame and terminate
with `unexpected_module_window_loaded` either before the explicit-open dialog
is handled or after the exact target was selected but never became a frame.
This is continuable only when the immutable cold packet and fresh host
readback bind:

- the original start from zero Toolset and zero NWN processes;
- the unchanged profile, source MOD identity, installed MOD identity, ordered
  HAKs, Area, prep directory, and absent timed output root;
- the child opener's `modulePath` and untouched module-open guard
  `modulePath` to the exact installed MOD path passed by the binary-bootstrap
  route, while the manifest's module identity remains bound to the
  byte-identical generated source MOD;
- exact expected module parts, explicit-open eligibility, and no submitted
  module-open action in the session guard;
- either the legacy `moduleLoadOwner=external` state with an unhandled dialog,
  or `moduleLoadOwner=explicit_open` with ownership/handled timestamps and an
  exact-selection readback where `selectedItemText` equals the target resref,
  `matchedBy=expected_module_exact_text`, and the selected index equals the
  recorded module-list index;
- exactly one unchanged PID + StartTime and responsive clean wrong-module
  frame with the recorded HWND, and zero NWN or second Toolset process;
- normally zero modal; alternatively, only for the immutable `explicit_open`
  branch, exactly one current `TdlgWelcome` whose HWND and title reproduce the
  handled `welcomeProbe`, successful posted Welcome action, child top-level
  window, and post-child window.

Preserve the same prep directory and run exactly once:

```powershell
node backend/scripts/prepare-aurora-model-proof-120s.mjs continue-unexpected-module-window-dry-run --profile <same-profile> --prepOutDir <same-prep-dir>
node backend/scripts/prepare-aurora-model-proof-120s.mjs continue-unexpected-module-window --profile <same-profile> --prepOutDir <same-prep-dir>
```

For the bound Welcome residue, the live transition first calls the central
exact-dialog producer with the immutable PID, StartTime, Welcome HWND, class
and title. That producer requires one visible `Cancel`, performs one targeted
`BM_CLICK`, and proves zero matching Welcome windows afterward. The wrapper
then re-resolves host state and requires the unchanged clean wrong-module frame
with zero modal before obtaining a fresh switch decision. It next uses the
existing public clean-switch producer and, when needed, the exact-Area
producer. It admits READY only after same-PID exact module + Area +
`TScrollBox` readback. It never restarts Toolset, edits INI/MRU, saves, builds,
repacks, or changes candidate identity. Source-path, selected-target or
Welcome substitution, process/window drift, an extra modal, a submitted guard
action, or prior continuation evidence is terminal.

#### Pre-action exact-Welcome parser resume

Never repeat the original unexpected-module live command after it writes
`continuation-plan.json`. One historical central-atom defect is resumable only
when the immutable v1 blocker is exactly `PREP_ATOM_JSON_INVALID` and its
message binds `close-aurora-toolset-dialog-no-global-input.mjs`,
`ParserError`, and `InvalidVariableReferenceWithDrive`. This PowerShell parser
failure occurs before any generated statement, so the resume additionally
requires all targeted-dismissal, post-dismissal, switch, result and READY
artifacts to be absent.

Preserve the v1 plan/blocker and run exactly once:

```powershell
node backend/scripts/prepare-aurora-model-proof-120s.mjs continue-unexpected-module-window-pre-action-resume-dry-run --profile <same-profile> --prepOutDir <same-prep-dir>
node backend/scripts/prepare-aurora-model-proof-120s.mjs continue-unexpected-module-window-pre-action-resume --profile <same-profile> --prepOutDir <same-prep-dir>
```

The resume rebinds both v1 evidence hashes, the original failure-to-recovery
identities, profile/candidate, current exact Welcome and clean wrong frame,
then publishes distinct v2 evidence before invoking the repaired central atom.
The atom itself has an offline contract branch that makes PowerShell parse and
execute the complete generated source while exiting before process discovery
or UI action. A different parser error, atom, blocker, artifact, live state,
or prior v2 evidence is terminal; there is no third attempt.

### Exact installed MRU ownership continuation

Cold startup may load the exact installed candidate from MRU while the binary
route compares that installed path with the profile's generated source path
and records `BINARY_NATIVE_EXPLICIT_OPEN_OWNERSHIP_UNVERIFIED`. This is
continuable only when the immutable cold packet and fresh host readback bind:

- the original start from zero Toolset and zero NWN processes;
- the unchanged profile, source and installed MOD identities, ordered HAKs,
  Area, prep directory, and absent timed output root;
- `moduleLoadOwner=mru`, the exact installed MRU path, and no explicit-open,
  recovery, dialog-probe, or pre-action ownership record;
- exactly one same PID + StartTime, responsive clean exact module frame with
  the recorded HWND, and zero modal, Area, NWN, Access Violation, or mutation
  evidence.

There is no explicit Open action in this continuation: the same PID that
loaded the installed MRU target must remain the sole process owner.

Preserve the same prep directory and run exactly once:

```powershell
node backend/scripts/prepare-aurora-model-proof-120s.mjs continue-exact-installed-mru-load-dry-run --profile <same-profile> --prepOutDir <same-prep-dir>
node backend/scripts/prepare-aurora-model-proof-120s.mjs continue-exact-installed-mru-load --profile <same-profile> --prepOutDir <same-prep-dir>
```

The live transition calls the existing public exact-Area producer and then
requires same-PID `adopt` readback of the exact module, Area, and
`TScrollBox`. It never submits `File > Open`, starts a second Toolset, retries
the cold launch, or changes INI, MRU, MOD, HAK, or candidate identity. Any
drift or pre-existing one-use evidence is terminal.

### Failed-prep close

An exact `toolset_module_loaded_but_modal_open` cold-prep failure is not a
model verdict and is not resumed by retrying preparation. When its immutable
packet proves that it started one Toolset from zero processes, the timed output
is absent, and current readback finds the same responsive PID+StartTime and
unchanged clean blank frame with the recorded progress modal gone, use:

```powershell
node backend/scripts/prepare-aurora-model-proof-120s.mjs close-failed-prep-module-loaded-modal-dry-run --profile <same-profile> --prepOutDir <same-prep-dir>
node backend/scripts/prepare-aurora-model-proof-120s.mjs close-failed-prep-module-loaded-modal --profile <same-profile> --prepOutDir <same-prep-dir>
```

The live command writes its plan before action, posts `WM_CLOSE` to the exact
frame, and uses an exact PID+StartTime force fallback only after a fresh
unchanged-frame/no-modal check. Success requires `nwtoolset=0`, `nwmain=0`,
unchanged candidate inputs, absent timed proof output, and immutable close
evidence. It never dismisses an unexpected modal, retries preparation, touches
INI/MRU, or creates a model visibility result.

For the single pre-action compatibility case where the immutable close blocker
is exactly `toolset_close_start_mismatch` and expected/actual StartTime differ
only below the failure packet's millisecond precision, the public
`continue-failed-prep-close-starttime-precision[-dry-run]` transition may
continue once. It preserves both first-attempt files, revalidates every
candidate/process/window condition, and rejects any different millisecond or
blocker before action.

## Monotonic clock

The first Toolset mutation creates `run-clock.json`:

```json
{
  "version": "aurora-model-proof-monotonic-clock/v1",
  "source": "Windows.QueryPerformanceCounter",
  "frequency": 0,
  "startCounter": 0,
  "deadlineCounter": 0,
  "hardLimitMs": 120000
}
```

Every later command reads QPC again and compares it to the same
`deadlineCounter`. UTC and filesystem timestamps are evidence metadata only.

Budget:

- T+0--20 s: Objects mode, tree selection, caret readback, `TScrollBox`, and
  Toolset verdict;
- T+20--25 s: arm and nonblocking Test Module;
- T+25--85 s: new `nwmain`, exact no-activate/no-z-order placement on the proof
  monitor, NWN capture, and a fresh engine-log window. Placement never changes
  z-order. When the capture's physical ownership probes identify an unrelated
  obscurer, the capture atom alone may use the bounded scoped z-order lease
  defined below. The
  window is either bytes appended after an unchanged, hash-verified baseline
  prefix, or bytes appended only after the coordinator first observes a
  post-arm truncation/rotation and establishes a new hash baseline. A token
  already present when the reset is first observed is never accepted;
- T+85--120 s: runtime verdict, validation, and final packet.

A missed checkpoint never starts a retry. At T+120 no new live action may be
dispatched.

## Visual decisions

Accept the first fresh, judgeable, identity-bound image for each environment.

Toolset binding requires exact module/Area, Objects toolbar readback, exact
selected tree occurrence, matching independent caret, parser fixture, and
validated `TScrollBox`. Focus, Properties, framing, and camera state are not
prerequisites.

NWN binding requires exact request, a single new PID/start time/HWND, the exact
module-load line appended after arm, exact candidate/profile identity, and a
real PNG. Bind each verdict to the immutable capture SHA-256.

### Scoped NWN physical-surface lease

The coordinator normally captures without changing z-order. If and only if
`WindowFromPoint` probes over the prepared NWN bounds return a foreign PID, the
owned NWN capture atom may temporarily place the exact verified NWN HWND at
`HWND_TOP` without activation, movement, resizing, owner-z-order propagation,
or window-position notifications. It snapshots the exact immediate
`GW_HWNDPREV` predecessor first, rechecks the exact PID, StartTime, HWND,
single visible owned top window, and absence of a modal, then requires every
physical probe to resolve to NWN before making exactly one `CopyFromScreen`.

The atom restores the NWN HWND relative to the same still-existing predecessor
with the same PID in `finally` and reads back that predecessor plus the unchanged process/window and
modal-free state. The maximum is two z-order mutations (lift and restore), one
physical capture, and zero activation or global input. `HWND_TOPMOST`,
`PrintWindow`, mutation of the obscuring window, a second capture, or acceptance
after a failed restore is forbidden. Any failure removes the PNG and leaves the
runtime proof incomplete.

Toolset `visible` proceeds immediately to NWN. Toolset `not_visible` ends with
a candidate-bound negative Toolset result and does not start NWN.

## Artifacts

```text
<out>/
  ready.json
  run-clock.json
  toolset/
    session.json
    area.json
    selection.json
    capture.png
    capture.json
    verdict.json
    packet.json
  runtime/
    launch-request.json
    dispatch.json
    observation.json
    capture.png
    capture.json
    engine-log-window.bin
    engine-log-window.json
    verdict.json
    packet.json
  final-model-proof.json
  final-model-proof.accepted-at-<QPC>.json | blocker.json
```

`final-model-proof.json` is provisional and never claims acceptance by itself.
The proof is accepted only when exactly one atomically published
`final-model-proof.accepted-at-<QPC>.json` binds its hash and the counter encoded
in the filename is before the stored deadline. A process exit before that
rename leaves no accepted proof.

Together the provisional packet and acceptance record bind all source
profiles, byte identities, artifact hashes, QPC timings, PIDs/start times,
route identities, and both result axes.

## Failure semantics

- One run, one output root, one dispatch per phase, zero retry.
- A lane failure keeps `modelVisibility=not_tested` and records completeness as
  `failed` or `missing`.
- Only a judgeable bound absence records `not_visible`.
- A timeout writes `MODEL_PROOF_120S_DEADLINE` and preserves earlier evidence.
- Never allocate another `rNN` because the proof lane failed.
- Never close a healthy process merely to satisfy proof acceptance.

### Exact pre-capture terminal-lane recovery

The only admitted failed-lane recovery is the exact immutable pre-capture
state: `ready`, no dispatches/artifacts/verdicts, no capture or runtime files,
the three selection readbacks, a valid run clock, and the terminal
`MODEL_PROOF_120S_LANE_FAILURE` blocker from a repeated public `toolset` call.
Use `recover-failed-lane-dry-run`, then `recover-failed-lane`, with the failed
profile, a different immutable next-attempt profile, and a new absent
preparation directory.

Admission requires identical module, ordered HAK, model/texture/2DA, Area, and
fixture identities; a new absent output root; zero NWN; and exactly the
proof-ready clean responsive Toolset PID, StartTime, frame HWND/title, module,
and Area. The live transition writes a plan before action, uses the existing
graceful-first exact Toolset closer, requires both process counts to become
zero, rehashes every pre-existing failed-root file unchanged, and then writes
`failed-lane-recovery.json`. Any failure writes
`failed-lane-recovery-blocker.json` and does not admit the next attempt.

## Post-runtime hidden-frame cleanup

Post-proof cleanup is outside the timed proof and starts with:

```powershell
node backend/scripts/aurora-model-proof-120s.mjs cleanup-dry-run --profile <same-profile>
node backend/scripts/aurora-model-proof-120s.mjs cleanup --profile <same-profile>
```

The mandatory read-only dry-run rehashes the accepted proof, final packet,
state, candidate, route identities, and live evidence before admitting a
close. After Test Module, NWN may already be absent or exactly one live
`nwmain` may be admitted. A live NWN admission requires the accepted proof and
runtime packet to rebind the exact profile, candidate, capture and engine-log
window, and fresh host readback to reproduce the packet's PID, StartTime,
main HWND, and title with exactly one enabled ownerless visible main window
and no modal or second process. The narrow minimized Toolset state still
requires exactly one responsive Toolset matching the ready PID and StartTime,
the same hidden non-dirty `TfrmFrame` matching the ready HWND, title, module,
and Area, the only visible owned top-level window being one iconic
`TApplication`, and no visible modal, Save/Build, dirty marker, Access
Violation, or second Toolset process.

The public cleanup then targets that exact hidden frame without restore,
foreground activation, focus, or global input. It delegates to the existing
graceful-first exact-process closer: `WM_CLOSE` first, bounded wait, and only
then a freshly revalidated exact PID+StartTime force fallback after the
coordinator rechecks the proof-bound main HWND and title. If the earlier cleanup
already closed NWN, that absence is accepted as an idempotent partial result.
Success requires `nwtoolset=0`, `nwmain=0` and a new immutable
`cleanup.json`; the accepted proof packet is never rewritten.

## Acceptance of the 120-second SLO

Offline tests may validate schemas, allowlists, QPC handling, and fail-closed
behavior. They do not prove the SLO.

Call the SLO verified only after two full live integrations starting from an
exact clean proof-ready Toolset/Area produce complete packets in at most
120,000 QPC milliseconds. At least one run must follow cold preparation and
one must follow clean-switch preparation, but preparation time is reported
separately and is not hidden inside the proof SLO.

Historical r29/r30 data does not support a 120-second cold-start promise:
Toolset start to fresh `TScrollBox` took 162.141 s and 362.400 s. Their runtime
processes appeared 14.799 s and 19.047 s after arm; the later delay was manual
handoff/packet construction. The 120-second target therefore optimizes the
proof-ready capture/runtime path and reports preparation separately.

Certification passed with two immutable r31 integrations from READY: 65,743 ms
after cold preparation and 76,474 ms after an exact same-PID clean switch from
r30 to r31. Both published before the 120,000 ms QPC deadline with zero retry,
Toolset `visible/verified`, and NWN `not_visible/verified`. The certification
record is owned by Meshy2Aurora at
`proof-output/m0-r31-hierarchy-only-20260722/model-proof-120s-slo-certification-v1.json`.
