# Aurora/NWN execution audit: Codex task `019f7bd1-f1fe-7ef3-ada7-cb955a27b439`

## Scope and method

This is an audit-only review of the local task transcript from 2026-07-21,
approximately 09:00 through its last recorded live Toolset activity at 13:54
UTC. No Toolset, NWN, input, configuration, process, or module action was
performed for this audit.

The goal in scope was to establish the same Meshy M0 candidate as visible in
Aurora and then NWN. The relevant execution contract is the shared Aurora
suite: preserve a candidate after a visible observation, do not create a new
model/HAK/module to escape an automation or geometry failure, and distinguish
`visible`, `failed`, and `missing` evidence precisely.

## Findings

### A-01 — Candidate continuity was broken after a positive Aurora observation

**Severity:** high

The task recorded a positive Toolset observation for candidate `r21`: the M0
fixture was visible in Aurora. Instead of using that same bound module/HAK for
the required NWN lane, it investigated unrelated alpha/animation hypotheses,
changed the generated tileset layout, and created candidates `r22` and `r23`.
At 09:56 the task itself acknowledged that it should have proceeded directly
to runtime after `r21`.

This violates the no-new-iteration rule. A missing runtime proof is
`proofCompleteness=missing`, not a visual failure and not permission to replace
the model, HAK, or module.

**Correct continuation:** retain the r21 identity and run the authorized NWN
preflight/runtime capture against it. A new candidate is admissible only after
a fresh bound Toolset or NWN observation reports `modelVisibility=not_visible`.

### A-02 — A placement/geometry automation failure was handled by creating a new module

**Severity:** high

For `r23`, the placement target was discovered to be approximately ten pixels
outside the valid tile surface. That is an automation/geometry failure, not
evidence that the model was invisible. The task then closed `r23` and created
`r24` to use a different screen target.

Creating `r24` evaded the failed lane instead of preserving its evidence and
using a documented recovery or reporting the bounded placement blocker. It
also added another module/HAK identity that had to be rebuilt and reattached,
which explains much of the elapsed time.

**Correct continuation:** preserve the r23 failed packet, classify it as
`area_geometry_invalid` or `placement_failed`, and either use an existing
same-candidate recovery route or stop that live lane. Do not allocate a new
candidate merely to retry coordinates.

### A-03 — A failed Focus atom was described as successful

**Severity:** high

The context-menu Focus action dismissed the popup but its helper exited with
`focus_object_viewer_not_settled`. The recorded reason was two descendant
`TScrollBox` controls: the large viewport and a 40-pixel lower control. The
task nevertheless asserted that Focus had executed and treated a later
viewport capture as a post-Focus proof.

The message may have reached Aurora before the helper failed, but that is not
the same as a verified Focus postcondition. Exit status `1` is a failed action
under the contract, and no success claim can be derived from the disappearance
of the popup alone.

**Correct continuation:** record Focus as `failed` with its exact window
fingerprint. The generic atom needs an offline regression that selects the
area viewport by the documented geometry predicate, then a public route may
be used. A direct capture can independently prove visual visibility, but must
not be labelled as a successful Focus result.

### A-04 — Optional framing was attempted after visual evidence existed

**Severity:** medium

After a valid large viewport capture showed the fixture, the task initiated an
optional zoom/camera operation to make it larger. It then noted that the
object moved out of frame and had to repeat Focus/capture work. This consumed
time and changed the state immediately before the required runtime gate.

**Correct continuation:** once the required object is visibly identifiable in
a valid viewport capture, preserve that frame and advance to NWN. Framing is
optional and needs a separate purpose, precondition, and rollback; it must
never precede a required proof or runtime gate merely to improve presentation.

### A-05 — Runtime evidence was not completed in the audited interval

**Severity:** high

The transcript reaches a Toolset capture and a plan to start the central
AUR-S07 runtime route, but contains no fresh NWN process identity, exact
module/Area/start binding, engine/load log, runtime capture, or validator
packet in the audited interval. Therefore:

```text
Toolset visibility:     verified only where the independent viewport capture
                         itself is accepted for its bound candidate.
Focus action:            failed (not verified).
NWN visibility:          not_tested.
Runtime proof:           missing.
```

It would be incorrect to call the vertical slice complete or to infer NWN
visibility from the Toolset frame.

### A-06 — Research and route decisions became too speculative

**Severity:** medium

The task spent time on hypotheses about alpha, controller aliases, animation
headers, MRU/startup transport, and xoreos observations while a candidate had
already been observed in Toolset. Some research was useful as offline
diagnosis, but it was allowed to supersede the primary runtime gate. The
shared route was also patched/revised repeatedly from individual live failures.

For example, xoreos was correctly described in the task's own notes as
secondary evidence, but it cannot determine Aurora or Beamdog runtime
semantics. A project-local conclusion from xoreos must not be the reason to
change an export or Toolset route without independent Aurora/native evidence
and a regression.

**Correct continuation:** use the delegated-change and central-change filters:
first verify the user's present authorization, then identify the exact generic
gap, reproduce it offline, add a negative/contract test, and only then change
the shared route. The immediate runtime proof must not be displaced by a
speculative exporter change.

### A-07 — The task confused startup ownership with a clean running-session module switch

**Severity:** high

This was the main reason the task appeared unable to reopen the required MOD
in an already running Toolset.

The binary-bootstrap startup route was designed to defend against a specific
race: Toolset starts at Welcome, asynchronously follows its MRU, and loads an
unexpected module before the route can own the requested explicit-open
selection. In that startup state, accepting or redirecting the wrong module is
unsafe. The route therefore makes that module-load owner sticky and fails
closed.

The task incorrectly generalized that narrow startup rule to every existing
Toolset window. It treated `File > Open` as forbidden merely because a module
was already loaded, even when the concrete state was different:

```text
one responsive Toolset PID
one identified frame
clean current module (no dirty '*')
no Build/Save/progress/recovery modal
no second Toolset or NWN process
explicit user instruction to open through File
```

The transcript subsequently proves that this clean-session path works. In the
same Toolset process (PID `51048`), it validated the native File menu item,
posted the exact documented command `44`, resolved the resulting exact Open
dialog, selected `m2a_now01`, and read back the final frame title
`... - m2a_now01.mod`. No INI/MRU write and no second process was needed.

Thus the failure was not that Aurora cannot reopen a module. It was a policy
and routing error: **a startup-MRU safety rule was misapplied to a clean,
user-authorized module switch in a running session.**

### A-08 — The public contract omitted the successful running-session path

**Severity:** high

The repository already has guarded native building blocks:

- `invoke-aurora-toolset-main-menu-command-no-global-input.mjs` validates the
  exact frame, monitor, menu position, enabled state, and command ID before it
  posts the command;
- `open-aurora-toolset-module-from-dialog-no-global-input.mjs` requires one
  exact Open dialog and clean frame, writes the exact module name, posts only
  its Open button, and verifies the final frame title.

However, for the binary-bootstrap profile these are leaf atoms, not a named
public transition. The startup standard says broadly that `File > Open` is
forbidden once a module-load owner exists. That wording caused the agent to
remain in a dead-end even though the user had directly authorized File/Open
and the live state was clean.

An external audit instruction also reinforced that broad prohibition without
checking the target task's actual user instruction and current clean-session
fingerprint. That was an incorrect application of the delegated-change rule:
the receiving agent should have verified the current task context rather than
treating the quoted prohibition as a higher authority.

## Required standard correction

Do not loosen the startup-MRU guard. Instead split the two state machines.

1. **Startup admission:** retain the existing fail-closed rule. If MRU wins
   before explicit selection, do not accept the wrong module and do not issue
   File/Open in that contaminated startup state.
2. **Clean running-session switch:** publish one versioned public central route
   for `File > Open` only when all of these preconditions are freshly read:
   exactly one owned responsive Toolset PID; declared current module title;
   no dirty marker; no recovery, progress, Build, Properties, or Save modal;
   no NWN process; explicit user authorization; and an exact known File/Open
   menu identity. It must use the existing guarded menu and dialog atoms,
   resolve the dialog after it appears, select the exact target MOD, and bind
   success to the new exact title and module identity.
3. **Negative contracts:** reject a dirty frame, any modal/progress state,
   ambiguous menu identity, an unexpected Open dialog, wrong final title, a
   second process, and a request derived only from another agent's message.
   Include an integration case where an MRU-loaded wrong module is first
   preserved, then the separately authorized clean-session route opens the
   requested module without changing INI/MRU.

Until that public route exists, direct use of its leaf atoms is evidence for
the correct Aurora behavior but not a reusable general procedure.

## Root cause

The main failure pattern was treating every missing proof or failed UI
postcondition as a reason to create another candidate or another central
recovery branch. In the module-opening lane, the task also confused a
startup-MRU ownership failure with a clean running-session switch. This
changed identities, multiplied HAK/build work, and destroyed the shortest path
to the requested answer: whether the already visible candidate runs in NWN.

## Required next task behavior

1. Select one exact candidate with immutable MOD/HAK/Area/fixture identity.
2. Preserve all prior packets; do not manufacture another rNN candidate for a
   capture, geometry, timeout, or control failure.
3. Treat the failed Focus atom as failed; use the valid viewport frame only for
   the narrower Toolset-visibility claim.
4. Run the named central AUR-S07 path only after its module/HAK/save binding is
   fresh and verified. Capture runtime identity, module, Area, start location,
   engine/load log, and a fresh runtime frame.
5. If a generic central defect is found, stop that lane, record its exact
   fingerprint, reproduce it offline, and change shared tooling only with a
   regression. Do not improvise a new route from a delegated request.

## Audit conclusion

The audited task made real Toolset progress, including an Aurora viewport
observation, but it did not close the requested Toolset-to-NWN proof. The
largest time loss was avoidable candidate churn (`r21` -> `r22`/`r23`/`r24`)
and optional/repeated UI actions. The next status is **NWN proof missing**, not
blocked and not complete.
