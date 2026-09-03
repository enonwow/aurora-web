---
name: aurora-model-proof-120s
description: Prove one exact immutable MOD, ordered-HAK, and model lineage in Aurora Toolset and, when visible there, immediately in NWN within a monotonic 120-second live budget. Use for candidate-bound Toolset/NWN model visibility proof; do not use for authoring, Save, Build, repack, camera work, or model iteration.
---

# Prove an Aurora/NWN model in 120 seconds

SLO status: `verified` on 2026-07-22 by complete 65,743 ms cold-prep and
76,474 ms clean-switch integrations, each published before the 120,000 ms QPC
deadline with zero retry.

Use `aurora-toolset-operate`, `aurora-toolset-author`, and
`aurora-toolset-prove`. Read
[references/model-proof-120s-standard.md](references/model-proof-120s-standard.md)
completely before execution.

Call only these two public entrypoints:

```powershell
node backend/scripts/prepare-aurora-model-proof-120s.mjs <command>
node backend/scripts/aurora-model-proof-120s.mjs <command>
```

Never invoke its native child atoms directly.

## Admit READY

Run the separate preparation wrapper outside the SLO:

```powershell
node backend/scripts/prepare-aurora-model-proof-120s.mjs prepare --profile <profile> --prepOutDir <owned-prep-dir>
```

It must choose exactly one route from live readback: `cold` when no Toolset
exists; `switch` when one clean Toolset has another module and the exact target
must be selected from `File > Open`; `load-area` when the exact module is open
but the exact Area/`TScrollBox` is absent (including a gray viewport); or
`adopt` when the exact module and Area are already ready. Every mutating prep
route must end with the same-PID exact module + Area + `TScrollBox` readback.

For a cold route with an existing `modules\temp0`, `prepare` must not ask the
user to clear or open the module manually. It may continue only when the public
binary-bootstrap route issues and revalidates an exact
`aurora-toolset-verified-temp0-recovery-admission/v1`, handles the exact known
prompt once with targeted non-destructive `Yes`/`Tak`, and proves the clean
requested frame under `moduleLoadOwner=verified_temp0_recovery`. Any cache or
prompt mismatch keeps preparation not ready for the same candidate.
When the handler itself fails before action submission while preserving the
exact responsive PID and modal, use the same prep directory with
`continue-verified-temp0-recovery-dry-run`, then
`continue-verified-temp0-recovery`. This is the only admitted same-PID
continuation; it must not allocate a new prep candidate or start another
Toolset process.

If — and only if — that continuation records
`toolset_verified_temp0_recovery_prompt_did_not_close` after one acknowledged
`PostMessage(BM_CLICK)`, use its separate one-use fallback:

```powershell
node backend/scripts/prepare-aurora-model-proof-120s.mjs continue-verified-temp0-recovery-client-click-dry-run --profile <profile> --prepOutDir <same-prep-dir>
node backend/scripts/prepare-aurora-model-proof-120s.mjs continue-verified-temp0-recovery-client-click --profile <profile> --prepOutDir <same-prep-dir>
```

It binds the same PID/start time, blank frame, recovery-modal and affirmative
button HWNDs, revalidates the exact `temp0` admission, and sends one local
client `WM_LBUTTONDOWN/UP` pair to that exact affirmative button. It requires
the modal to disappear before the original public opener resumes with the
action already submitted. It is not a retry loop: any unchanged modal after
this fallback is `failed`, with no third click, transport change, user handoff,
or second Toolset.

If the public fallback itself stops at
`BINARY_NATIVE_VERIFIED_TEMP0_RECOVERY_FAILURE_PACKET_MISMATCH` before its
client-click atom is invoked, preserve its v1 plan and blocker and rerun the
same dry-run and live commands above. The public preparation route admits this
only when the immutable failure manifest still has no
`verifiedTemp0RecoveryClientClickFallback` record, binds the same PID/start
time/frame/modal, and emits separate v2 continuation evidence. This is still
the first local click. Any recorded fallback result, different blocker, drift,
or existing v2 evidence remains fail-closed.

If cold preparation instead records `unexpected_module_window_loaded` after
the installed, hash-verified target was passed to the public opener, preserve
the same prep directory and responsive wrong-MRU Toolset PID. Use exactly once:

```powershell
node backend/scripts/prepare-aurora-model-proof-120s.mjs continue-unexpected-module-window-dry-run --profile <same-profile> --prepOutDir <same-prep-dir>
node backend/scripts/prepare-aurora-model-proof-120s.mjs continue-unexpected-module-window --profile <same-profile> --prepOutDir <same-prep-dir>
```

The dry-run requires the original zero-process cold plan, the exact failure
packet, and both the child and its untouched session guard to bind the
profile's installed MOD path. It also requires one unchanged responsive,
clean wrong-module frame on the recorded PID + StartTime, with no NWN process
and no module-open action recorded in the guard. The current state is normally
modal-free. One residual Welcome is admitted only for the `explicit_open`
variant when its exact HWND, class and title bind the handled Welcome in the
immutable child packet. The immutable
child failure must either be the legacy `moduleLoadOwner=external` state before
the dialog was handled, or `moduleLoadOwner=explicit_open` with a handled
dialog whose exact-selection readback names the target resref, uses
`expected_module_exact_text`, and binds the selected index to the module-list
index. The target must never have become a frame. For the bound residue, the
live continuation uses the central exact-dialog atom to click the sole visible
`Cancel` on that PID + StartTime + HWND, requires the Welcome to disappear,
re-resolves the unchanged clean wrong frame, and only then uses the existing
public clean-switch and exact-Area producers. It admits the same PID only after
exact module + Area + `TScrollBox` readback. Any source-path, selection or
Welcome substitution, process/window drift, additional modal, recorded guard
action, or existing continuation evidence remains fail-closed.

If that live continuation created `continuation-plan.json` but stopped at
`PREP_ATOM_JSON_INVALID` because the central exact-Welcome atom's generated
PowerShell failed with `ParserError` /
`InvalidVariableReferenceWithDrive`, do not repeat the original live command.
Preserve its v1 plan and blocker and use exactly once:

```powershell
node backend/scripts/prepare-aurora-model-proof-120s.mjs continue-unexpected-module-window-pre-action-resume-dry-run --profile <same-profile> --prepOutDir <same-prep-dir>
node backend/scripts/prepare-aurora-model-proof-120s.mjs continue-unexpected-module-window-pre-action-resume --profile <same-profile> --prepOutDir <same-prep-dir>
```

This resume admits only the exact v1 plan/blocker, profile, candidate,
failure packet, PID + StartTime + frame + Welcome identity, and exact atom
parser signature. It requires every dismissal, post-dismissal, switch, result
and READY artifact to remain absent, proving that parsing failed before the
targeted click. It emits separate v2 plan/result/blocker evidence and has no
further resume. Any other blocker, message, evidence, host drift, or action
artifact remains terminal.

If cold preparation instead records
`BINARY_NATIVE_EXPLICIT_OPEN_OWNERSHIP_UNVERIFIED`, preserve the same prep
directory and Toolset PID. When the immutable packet and fresh host readback
prove that MRU loaded the exact installed, hash-verified candidate before any
explicit-open or recovery action, use exactly once:

```powershell
node backend/scripts/prepare-aurora-model-proof-120s.mjs continue-exact-installed-mru-load-dry-run --profile <same-profile> --prepOutDir <same-prep-dir>
node backend/scripts/prepare-aurora-model-proof-120s.mjs continue-exact-installed-mru-load --profile <same-profile> --prepOutDir <same-prep-dir>
```

The dry-run binds the original zero-process cold start, exact profile,
source/installed MOD and ordered HAKs, `moduleLoadOwner=mru`, installed MRU
path, unchanged PID + StartTime + clean frame HWND/title, zero
explicit/recovery action, zero modal/Area/NWN, and an absent timed output root.
The live continuation uses the existing public Area producer, then adopts the
same PID only after exact module + Area + `TScrollBox` readback. It never
submits `File > Open`, starts a second Toolset, or changes INI, MRU, MOD, HAK,
or the proof candidate.

If cold preparation instead terminates with the exact pre-proof blocker
`toolset_module_loaded_but_modal_open`, the timed proof output is still absent,
and it leaves one responsive proof-owned blank Toolset frame, do not retry
`prepare`, call a close leaf, or ask the user to close it. Use the one-use
public failed-prep close transition:

```powershell
node backend/scripts/prepare-aurora-model-proof-120s.mjs close-failed-prep-module-loaded-modal-dry-run --profile <same-profile> --prepOutDir <same-prep-dir>
node backend/scripts/prepare-aurora-model-proof-120s.mjs close-failed-prep-module-loaded-modal --profile <same-profile> --prepOutDir <same-prep-dir>
```

The dry-run must bind the immutable failure packet, candidate, PID, StartTime,
clean frame HWND/title and recorded progress modal while requiring that the
modal is now absent, no Area exists, and no NWN or second Toolset exists. The
live transition attempts the exact frame's graceful close first, permits a
force fallback only after re-reading the same PID+StartTime and unchanged
modal-free frame, requires zero Toolset/NWN processes, and writes immutable
`failed-prep-close-plan.json` plus either `failed-prep-close.json` or one
blocker. It never creates proof evidence or changes MOD, HAK, INI, or MRU.
Every new proof attempt starts from the verified zero-process result.

One historical packet may record
`toolset_close_start_mismatch` solely because Windows JSON rounded the bound
StartTime to milliseconds while the process API retained sub-millisecond
ticks. When the first close plan/blocker proves that this happened before
`WM_CLOSE` and both timestamps identify the same millisecond, use exactly once:

```powershell
node backend/scripts/prepare-aurora-model-proof-120s.mjs continue-failed-prep-close-starttime-precision-dry-run --profile <same-profile> --prepOutDir <same-prep-dir>
node backend/scripts/prepare-aurora-model-proof-120s.mjs continue-failed-prep-close-starttime-precision --profile <same-profile> --prepOutDir <same-prep-dir>
```

It preserves the first plan/blocker, re-runs the full host admission, compares
StartTime at the packet's authoritative millisecond precision, and emits a
separate continuation plan. A different error or millisecond is terminal.

Then run coordinator `preflight`, followed by `ready`, before starting the live clock. Require one
versioned exact-candidate profile, byte-identical source/installed MOD and
ordered HAKs, one exact clean proof-ready Toolset session and Area, exact
fixture bindings, a prepared runtime binding, an absent owned output root, and
compatible public child routes.

An immutable profile whose pinned route manifest has been superseded must not
be copied or edited. The coordinator and preparation wrapper may continue only
when the current manifest carries a versioned
`aurora-model-proof-120s-route-manifest-supersession/v1` or current
`aurora-model-proof-120s-route-manifest-supersession/v2` chain. That chain must
reconstruct the exact profile-pinned manifest hash, bind every intermediate
manifest, admit only the declared cleanup/compatibility route delta, rehash
every current route, and preserve the historical timed-coordinator semantic
digest. Lock v2 normalizes only named post-proof cleanup functions, probes,
validators, and their imports; a profile pinned to any declared historical
snapshot replays the exact remaining suffix to current. The public preflight
reports both the profile-expected and resolved
manifest hashes plus the complete admission. Any unknown hash, route addition,
removal, content drift, or timed semantic change remains
`route_manifest_hash_mismatch`; never repin the candidate profile to bypass it.
The coordinator's exact preflight identity set must include every declared
preparation compatibility producer, including the central bound-Welcome
dialog closer; preparation-only identities remain outside timed semantics.

If any producer for open/adopt, Area, selection, `TScrollBox`, Test Module,
runtime capture, log window, verdict, or packet is unavailable, keep
`READY=false` with `MODEL_PROOF_120S_NOT_READY`. Do not improvise with a leaf.

## Execute once

1. Run `toolset`; this starts the monotonic clock from the already proof-ready
   Toolset state and performs selection, independent readback, and one fresh
   `TScrollBox` capture.
2. Inspect that image once and run `record-toolset-visibility`.
3. If Toolset is `visible`, run `runtime` immediately. It owns arm,
   nonblocking Test Module, one new request-bound `nwmain`, one NWN capture, and
   one fresh engine-log window.
4. Inspect that image once and run `record-runtime-visibility`.
5. Run `finalize`.

Do not perform Focus on Object, Properties, camera movement, framing, zoom,
recapture, Save, Build, repack, `geometry-observe`, a new model iteration, or a
second Toolset process.

## Stop at the deadline

At 120,000 monotonic milliseconds, stop dispatching live actions and write one
blocker packet. Preserve every earlier accepted image and verdict.

Record independently for Toolset and NWN:

- `modelVisibility=visible|not_visible|not_tested`;
- `proofCompleteness=verified|failed|missing`.

A timeout, capture, automation, or infrastructure failure is never
`not_visible`. A later missing result never erases an earlier accepted image.
Do not dispatch cleanup during the timed live sequence; cleanup is not part of
proof acceptance.

## Recover the exact pre-capture terminal lane

When the immutable root has exactly `state.status=ready`, empty dispatches and
artifacts, no verdict or capture/runtime packet, the exact three Toolset
selection readbacks, and a `MODEL_PROOF_120S_LANE_FAILURE` blocker from the
repeated public `toolset` command, use only:

```powershell
node backend/scripts/aurora-model-proof-120s.mjs recover-failed-lane-dry-run --profile <failed-profile> --nextAttemptProfile <new-profile> --nextPrepOutDir <new-absent-prep-dir>
node backend/scripts/aurora-model-proof-120s.mjs recover-failed-lane --profile <failed-profile> --nextAttemptProfile <new-profile> --nextPrepOutDir <new-absent-prep-dir>
```

The dry-run binds the failed root, candidate hashes, ready PID, StartTime,
frame, clean module/Area, zero NWN, and a different immutable profile whose
candidate hashes are identical and whose output/preparation paths are absent.
The live transition writes an immutable plan, delegates graceful-first close
to the existing exact Toolset closer, requires `nwtoolset=0` and `nwmain=0`,
preserves every existing failed-root byte, then writes the immutable recovery
result. Any drift or close failure writes a terminal recovery blocker. Only the
successful zero-process result admits the named next attempt; it never changes
the candidate or reuses the failed output root.

## Cleanup after evidence

Post-proof cleanup is outside the 120,000 ms acceptance budget. After the last
required runtime PNG, capture JSON, log window, and packet are durably
identity-bound, or after an accepted Toolset-only final packet, run:

```powershell
node backend/scripts/aurora-model-proof-120s.mjs cleanup-dry-run --profile <profile>
node backend/scripts/aurora-model-proof-120s.mjs cleanup --profile <profile>
```

The dry-run is mandatory and read-only. It rehashes the accepted proof and
candidate evidence, then admits either the exact proof-ready frame or the
post-runtime hidden-frame cleanup state. NWN may already be closed, or exactly
one live `nwmain` may remain only when the accepted proof, runtime packet,
capture, engine-log window, and current host snapshot bind the same PID,
StartTime, main HWND, title, profile, and candidate. A foreign, drifted,
multiple, or modal NWN state fails closed. The Toolset side still requires
exactly one responsive process with the ready PID and StartTime, the same
hidden non-dirty `TfrmFrame` HWND/title/module/Area, zero visible modal or
Access Violation window, and only one visible iconic `TApplication`. This is
the normal post-Test Module minimized state; it is not identity drift and does
not require restore, focus, or global input.

The live command attempts the graceful public close first. For NWN it uses
`close-or-terminate` (`WM_CLOSE`, optional unchanged-window `SC_CLOSE`, bounded
wait, then exact PID+StartTime force fallback) after rechecking the proof-bound
main HWND and title. It then applies the same
graceful-first policy to the exact clean proof-owned Toolset, requires
`nwmain=0` and `nwtoolset=0`, and writes immutable `cleanup.json`. It never
enters `LIVE_COMMANDS`, consumes SLO time, kills by broad process name, or
touches an unrelated session. If a prior cleanup already closed NWN, the same
public `cleanup` resumes idempotently from that partial result; it does not
rewrite the accepted proof.
