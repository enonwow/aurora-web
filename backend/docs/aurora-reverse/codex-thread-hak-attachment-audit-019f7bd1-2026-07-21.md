# HAK Attachment Audit: Codex Task `019f7bd1-f1fe-7ef3-ada7-cb955a27b439`

## Scope and method

This is a read-only audit of the task transcript, its durable bootstrap state,
the current shared HAK atom, its executable parse contracts, and the canonical
vertical-slice standard.  It performs no Toolset/NWN action and makes no claim
that a HAK is already persisted.

The analysed target is the fresh module/HAK pair declared on 2026-07-21:

- module: `m2a_m0r21.mod`;
- HAK: `m2a_m0r21.hak`;
- HAK package hash reported by the task: `25b753…c1d6`;
- current live state reported by the task: `hak_rebuild_in_progress`, one
  responsive Toolset PID `44924`, visible native `TdlgVerifyModule`.

The active build is not a timeout, a proof of persistence, or a reason to send
another HAK command.  Its only allowed work is read-only observation until the
Toolset exposes a verified settled result.

### Follow-up: observer misclassification found and corrected

A later screenshot showed the exact settled Build Module state for the same
module: one `No errors found` result, disabled `Build`, and enabled `Done`.
The previous observer nevertheless returned `building` solely because
`TdlgVerifyModule` was visible.  This was a central observer defect, not an
active Aurora build.  The observer now reads the Build/Done controls and, for a
settled candidate, independently requires the exact one-item result before
returning `settled`.  It remains read-only.

The audited task then used the existing `Done -> ordered HAK inspection -> one
native Save -> hash readback` sequence and reported `saved_verified` for the
single HAK `m2a_m0r21`.  That later result does not alter the root-cause
findings below; it confirms why semantic state classification matters.

## What was done correctly

1. The task kept the current native build untouched after sending the verified
   affirmative button.  It did not repeat selection, `Add`, `OK`, or Save.
2. It correctly distinguished the owner-drawn selection state from the actual
   attach state: a selected HAK with a disabled `Add` button was not treated as
   attached.
3. It used the locale-aware warning continuation only after `Add` and `OK` had
   already been recorded, rather than replaying those mutations.
4. It did not change `nwtoolset.ini`, MRU, or start another Toolset process.

These behaviours match the shared state machine and should be preserved.

## Where time was lost

### 1. The normal shared atom deterministically omits `CBN_SELCHANGE`

The base atom
`backend/scripts/attach-aurora-toolset-module-hak-no-global-input.mjs` selects
the exact owner-drawn combo entry with `CB_SETCURSEL`, then immediately requires
the native `Add` button to be enabled.  It does not emit `CBN_SELCHANGE` to the
verified parent/control pair.

On this Aurora build, `CB_SETCURSEL` changes the selected index but does not run
the VCL selection handler.  The result is the exact failure seen in the task:
the right HAK is selected, the HAK list is still empty, and `Add` remains
disabled.  This costs an entire failed bootstrap/continuation boundary for every
new HAK attach, even though the required native transition is known.

**Correction:** make `selection_notified` part of the *normal* atom immediately
after exact `CB_GETCURSEL`/`CB_GETLBTEXT` validation, then require that the list
is unchanged and `Add` has become enabled.  Keep the current resume route only
for an interrupted pre-existing Module Properties modal, not for normal work.

**Required tests:** an executable rendered-PowerShell contract for the
notification, a negative test for a wrong parent/control ID, and a state test
that refuses `Add` unless the exact selection and empty list were read back.

### 2. The normal warning predicate excludes the observed Aurora wording

The same atom accepts only the English fragments `Hak Paks` or `Hak Pak list`.
The task's real Toolset displayed the otherwise semantically equivalent
localized `Hak Files` warning.  The standard has a special continuation for
this known wording, but the initial path still rejects it first.

This creates a second predictable failure and a needless recovery transition.

**Correction:** use one normal warning predicate that requires all semantic
parts together: current-module HAK-list change, rebuild/build consequence, an
explicit question, and exactly one enabled affirmative (`Yes`/`Tak`) plus one
enabled negative (`No`/`Nie`) button.  It may accept the evidenced `Hak Paks`
and `Hak Files` labels, but must reject any unrelated confirmation.

**Required tests:** positive fixtures for both labels/locales and a negative
fixture with matching buttons but unrelated warning text.

### 3. Build settlement was coupled to the mutating command

The base atom posts the affirmative rebuild response and then waits for the
whole native build inside the same command.  A HAK rebuild can legitimately
outlive a generic command deadline.  Earlier work therefore accumulated
timeouts, one-use observers, and uncertainty about whether the confirmation
had already been processed.

**Correction:** split the normal transaction at a durable
`rebuild_started` event.  The mutating atom ends after fresh proof that the
correct warning accepted the affirmative action and the native build is active.
An idempotent public observer then samples only the verified PID/build dialog
until it reports either `rebuild_running`, a semantic settled result, or an
evidenced failure.  The settled result must be determined by controls and text
(for example `No errors found`, disabled `Build`, enabled `Done`), not merely by
the class name `TdlgVerifyModule`.

### 4. Recovery-route proliferation replaced a finite normal path

The vertical-slice standard records a long sequence of historical HAK-only
continuations: combo discovery, signed `CB_ERR`, owner-drawn item readback,
clearing a temporary selection, notifying selection, rendering a broken
PowerShell template, locale-warning acceptance, build observation, result
dismissal, and persisted-list/hash reconciliation.

Most of these are useful forensic records, but they are not an efficient normal
workflow.  A new task should not need to discover each historical defect by
failing it once.  This is the largest *process* cost: each branch has its own
dry-run, manifest authorization, state readback, and user-facing explanation.

**Correction:** retain narrow recovery only for genuinely interrupted live
states.  Move all now-evidenced primitives into one tested normal route:

`open exact properties -> identify HAK combo by topology -> exact native item
text -> selection -> selection notification -> Add enabled -> Add list readback
-> OK -> semantic warning -> rebuild_started -> observe settled -> Done ->
ordered list readback -> native Save -> module identity/hash readback`.

Each arrow is a ledger event with a fresh HWND/control readback.  No recovery
is selected merely because the normal atom previously lacked that primitive.

### 5. Duplicate, byte-identical HAK/module creation increased setup work

The task created `m2a_m0r21.hak` as a byte-identical copy of the current M0
package to avoid overwriting an existing file.  Non-overwrite is correct, but a
new resref and new module force another wizard, palette rebuild, combo lookup,
and HAK build without changing resource resolution when the bytes are truly
identical.

**Correction:** define two explicit policies before live work:

- use the existing immutable HAK/resref when the approved payload hash and
  appearance mapping are unchanged;
- allocate a new immutable HAK/resref only when the payload, `appearance.2da`
  mapping, or resource identity changes, and record why it is required.

This retains reproducibility without treating every retry as a new HAK
installation.

### 6. Work unrelated to HAK attachment delayed the live gate

Before the current HAK attach, the task spent a substantial portion of the turn
adding runtime-fixture and resolver-contract code.  Those checks can be useful
for later NWN proof, but they do not unblock the strict HAK state machine.

**Correction:** run offline asset/hash validation before the session, but freeze
runtime and visual work once the HAK transaction begins.  Do not create runtime
contracts, alter fixture coordinates, or investigate model semantics between
`selected` and `saved_verified` unless the HAK lane itself supplies evidence
that they are required.

### 7. The top-level ledger is not concise enough for fast recovery

The current manifest was reported as `hak_rebuild_in_progress`, while key
identity fields were not conveniently present at its top level.  Operators need
one small current-state record, rather than reconstructing the state from deep
stage history.

**Correction:** write an append-only `hakState` packet at every transition:
`module path/hash/title`, HAK resref/hash, PID, dialog HWND/class/title, combo
and list readbacks, warning semantic result, build start time, observer result,
ordered saved HAK list, and save/hash status.  It should be sufficient to resume
or audit without replaying the historical command chain.

## Time attribution

The audit does not attribute the native build duration to agent error: the
current Toolset may legitimately require time to rebuild palettes/modules.
The avoidable time is the repeated control-flow and recovery overhead before
that build:

| Avoidable boundary | Direct cause | Effect |
| --- | --- | --- |
| First HAK bootstrap stop | no normal `CBN_SELCHANGE` | failed transaction plus state-recovery work |
| Warning stop | normal predicate lacks `Hak Files` | second continuation and modal re-validation |
| Build deadline ambiguity | mutation and long rebuild in one command | timeout/reconciliation/observer branch |
| Historical route chain | defects kept as normal prerequisites | repeated dry-runs, manifest checks, and explanations |
| New identical HAK/module | no reuse policy | repeats the full attach/build pipeline |
| Runtime work during attach | scope crosses HAK gate | delays the shortest path to `saved_verified` |

## Required next action for the audited task

The present state is **not proof-ready**.  While the verified build remains
active, do only the canonical read-only observer.  Once it is semantically
settled, the remaining sequence is exactly:

1. dismiss `Done` only after validating the settled result;
2. read the exact ordered HAK list in a fresh inspection dialog;
3. perform one native Save;
4. verify clean module identity and saved hash (or record
   `unknown_os_locked` without inventing a hash);
5. mark the HAK gate `saved_verified` only then.

Only after step 5 may creature placement, Appearance work, viewport capture, or
NWN runtime proof resume.

## Proposed shared-standard backlog

1. Correct the normal HAK atom to emit and validate `CBN_SELCHANGE`.
2. Correct its normal locale-aware semantic warning gate.
3. Split `rebuild_started` mutation from idempotent build settlement
   observation.
4. Consolidate the normal HAK state machine; deprecate historical
   per-defect continuations from the standard's primary route.
5. Add HAK reuse/immutable-version policy and the compact `hakState` ledger.

These are central-tooling changes, not project-local adapters.  They must be
implemented only after the currently active native build is settled; no shared
tooling patch is authorized while that build is live.
