---
name: aurora-toolset-author
description: Create and edit Neverwinter Nights module content through verified Aurora Toolset workflows. Use for modules, Areas, tiles, palette placement, creatures/NPCs, items, placeables, doors, triggers, encounters, merchants, sounds, waypoints, properties, inventory/equipment drag-and-drop, HAK attachment, Appearance/model selection, scripts, Save, Build Module, or Test Module. Always pair live work with aurora-toolset-operate and use aurora-toolset-prove when completion or evidence is requested.
---

# Author Aurora Content

Extend the canonical Aurora workflow. Do not create a competing project-local
adapter or simplified runbook.

Skill suite contract: `1.0.15`.

## Load the applicable contracts

1. Use `$aurora-toolset-operate` and follow its session/safety workflow.
2. Resolve the standard root from `AURORA_STANDARD_ROOT`; otherwise use
   `C:\Projects\aurora-web`.
3. Read [references/function-routing.md](references/function-routing.md).
4. Map the request to one or more `AUR-SNN-NN` function IDs.
5. Read only the mapped roadmap section, current function standard, manifest,
   latest accepted evidence, and
   validator for every mapped ID before mutation.

Do not treat a roadmap status as permission to skip the current proof contract.

## Build the execution contract

Before live work, record:

`function ID | working module + hash | Area | target identity | verified
precedent | native action | expected isolated delta | save/readback | rollback |
capture | validator | deadline`.

Use a working copy. Keep the source module read-only. Reject an existing
destination rather than overwriting it.

## Reuse before extending

1. Find the newest verified proof using the same native action, dialog, or
   control, even if it used another object type.
2. Reproduce its complete path on the current safe target.
3. Reuse the central verified atom selected by the canonical function map.
4. If the central transport cannot express the required action, record the
   exact missing atom or contract gap and stop that live lane. Do not build a
   project-local adapter, validator, CLI, or session framework.

For each requested object change, execute one mapped canonical transaction.
Do not create a second transport or recovery branch because a field did not
read back after one native action. Preserve the state packet, return to the
mapped function standard, and create a central change only under the operate
skill's recovery-route budget and delegated-change filter.

Treat `aurora-web` product code, assets, fixtures, and product validation as
reference-only where project policy requires it. That boundary does not apply
to the shared Aurora operating skill, its canonical runner, or its verified
native atoms: use that central tooling for Toolset work. Do not create or
qualify a project-local Toolset runner or UI adapter as a substitute.

## Execute one transactional mutation

1. Capture baseline parser/native state.
2. Identify the exact object/control by stable text and native identity, never
   by remembered list index or screen coordinate alone.
3. Perform one native action without global input.
4. Read the mutated control state immediately.
5. Save.
6. Parse the saved module and require the expected isolated delta.
7. Capture the visual state when the function requires it.
8. Roll back through the documented native path.
9. Save and prove equality with baseline.
10. Run the function validator.

If either the visible effect or parser delta is missing, mark the function
`failed`; one cannot substitute for the other.

When an authorized close asks whether to save this working module, select
`Yes`/`Tak`, wait for native save/build settlement, and retain the final
save/readback in the function evidence. Closing is not proof by itself.

## Apply fragile operation rules

### Model-iteration admission

Before creating or copying a model, texture, 2DA row, HAK, module, fixture, or
new `rNN` target for the same candidate, record the exact current artifact
lineage and two separate axes for Toolset and NWN:
`modelVisibility = visible | not_visible | not_tested` and
`proofCompleteness = verified | failed | missing`.

- Admit a new iteration only after a fresh candidate-bound
  `modelVisibility=not_visible` result in Toolset or NWN, with the failing
  artifact, diagnosed cause, and minimal intended delta recorded.
- `missing` proof, HAK/build/save state, a hash lock, placement, camera/focus,
  geometry, profile, capture, timeout, or transport failure does not admit a
  new iteration. Resume the same candidate through the canonical route.
- Never use `missing` as a model-visibility verdict. It belongs only to
  `proofCompleteness`; an unrun runtime test is `modelVisibility=not_tested`.
- If Toolset shows the model, keep the exact MOD/HAK/model lineage unchanged
  and proceed to NWN. Do not create a new proof module first.
- A byte-identical HAK under another name and a new module containing the same
  candidate are still new iterations and require the same admission gate.
- If the exact container is unrecoverable for a non-model reason, stop that
  lane and record the blocker. Do not silently replace it with another target.

### Inventory and equipment

- Treat adding, equipping, transferring, and trash rollback as native
  drag-and-drop.
- Resolve the exact palette node and destination control from the current
  process. Invoke the verified VCL handler on the GUI thread.
- Do not use click/double-click as evidence of inventory insertion.
- On the feat/level warning, click only `OK`, leave `Never warn again`
  unchecked, and prefer a neutral low-level amulet for a transport proof.
- Require saved GIT readback and rollback readback.

### HAK and Appearance/model

- Select the HAK and Appearance by exact visible native text, never stored
  indexes.
- After a HAK rebuild or properties commit, refresh all HWNDs.
- Reject a rainbow placeholder or missing model as visual failure even when
  fields saved successfully.
- A selected Appearance label, `Appearance_Type`, or Creature Properties
  mini-preview proves only a field selection. Before changing model geometry
  or placement, prove the ordered HAK list, exact 2DA row, and model resource
  identity; then obtain the required fresh Area viewport capture.

Treat HAK attachment as this strict state machine:
`unselected -> selected -> selection_notified -> added -> rebuild_pending ->
rebuild_running -> rebuild_settled -> saved_verified`.

Read back each transition before taking the next one. While native
`TdlgVerifyModule` / `Build Module` is present, classify its actual controls
and result text before calling it running or settled. During a proven running
state, perform read-only observation only: do not reselect, notify, Add,
confirm, save, patch central tooling, or open another recovery. After a proven
settlement, read the ordered HAK list and saved module/hash before any creature
placement, Appearance change, visual capture, or runtime work. If the declared
observation bound expires, preserve the PID and record only the rebuild lane as
`failed`/`missing`; do not restart it.

#### HAK fast path

Use this normal path for a fresh verified Module Properties dialog; historical
per-failure continuations are not the normal route:

`exact HAK text -> CB_SETCURSEL -> CBN_SELCHANGE -> Add enabled -> Add/list
readback -> OK -> semantic warning -> rebuild_started -> semantic observer ->
Done -> ordered-list inspection -> one native Save -> hash/readback`.

- `CB_SETCURSEL` alone is insufficient. Require the validated native
  `CBN_SELCHANGE` notification to the combo's actual parent, then require the
  same exact item, an unchanged empty HAK list, and enabled `Add`.
- Accept `Hak Paks` and `Hak Files` only with the evidenced current-module
  list-change question and exactly one enabled localized affirmative/negative
  pair (`Yes`/`Tak`, `No`/`Nie`).
- `No errors found` with disabled `Build` and enabled `Done` is
  `rebuild_settled`, even while `TdlgVerifyModule` remains visible. Post only
  `Done`; do not keep polling it as `rebuild_running`.
- Record `rebuild_started` after the affirmative action, then use the
  idempotent read-only observer. Do not put arbitrary multi-minute waiting or a
  later mutation behind the observer.
- Reuse an approved byte-identical HAK/resref when payload hash and 2DA mapping
  are unchanged. Allocate a new immutable HAK only for a payload or resolver
  mapping change admitted by the model-iteration gate; a retry is not a reason
  to copy a HAK.

### Scripts

- Keep exactly one `void main()` entry point in an NWScript script.
- Compile the exact source, verify binding and produced NCS/readback, and keep
  script editors from accumulating.
- Treat compile warnings, stale NCS, or runtime non-execution as incomplete.

### Area resizing

- Respect the verified negative result: expanding an Area can create empty tile
  cells and Access Violations.
- Require `Tile_List.length == Width * Height`. Prefer creating the correct
  larger Area in the wizard over native expansion.

## Claim completion

Use `$aurora-toolset-prove`. A function becomes `TAK` only when one run contains
the approved hash, exact target, native action, visual evidence, saved readback,
isolated delta, rollback, and passing validator. Close a stage only through the
canonical stage-completion validator.
