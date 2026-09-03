# Aurora Toolset Module Wizard transition audit — 2026-07-19

## Scope and classification

This is a Toolset native-UI state-machine question, not an NWN runtime or file
format semantic. The central vertical-slice route must therefore bind its
transition to native control readback and documented Toolset wizard behavior.
No xoreos material was used.

## Live evidence

The public central continuation `bootstrap-reconcile-module-finish-create`
selected and read back the single preserved Area `m2a_vs_m0a` in the live
Module Wizard (Toolset PID `13584`). The list readback was `itemCount=1`,
`selectedIndex=0`; after that mutation the native controls were:

- `Area Wizard`, `Back`, `Next`, and `Cancel`: enabled;
- `Finish`: disabled;
- no Area Wizard or progress modal;
- destination MOD: absent.

The bounded, read-only enable wait ended without posting `Finish`. This proves
that selection is not the completion predicate and that no module was saved by
the failed continuation.

## Authoritative workflow precedent

The contemporary Aurora Toolset manual describes the same two consecutive
Module Wizard pages. On the page containing the created Area in `Current
areas`, the required action is `Next`; the following final page supplies
`Finish` to close the wizard and enter the Toolset. See the *NWN Toolset User
Manual*, pages 18–19, steps 7–8, archived at:

<https://neverwintervault.org/sites/neverwintervault.org/files/project/690/files/toolset_manual_v1.06.pdf>

A second Toolset manual independently records the same sequence: after the
Area appears in the `Create Areas` list, click `Next`, then use `Finish` on the
following page. See pages 10–11:

<https://neverwintervault.org/sites/neverwintervault.org/files/project/3589/files/dezmodian1084583690156manual.pdf>

The two sources match the live native control state. They establish the
transition without inferring it from the label alone.

## Canonical correction

`create-aurora-toolset-module-and-area-no-global-input.mjs` now treats the
post-Area `TdlgModuleWizard` list page as a separate state:

1. require the exact `TListBox` plus enabled `Next`;
2. post only Module Wizard `Next`;
3. freshly read the final page and require an enabled `Finish`;
4. post `Finish` only after that readback.

The narrowly authorized public continuation
`bootstrap-reconcile-module-next-create` is only available after the durable
native timeout from the prior continuation, and only from the exact selected
single-Area state above. It cannot reopen Area Wizard, rewrite a name, replay
an earlier page, or use a project-local runner.

## Acceptance and diagnostics

The central route records the selected list item, the posted `Next`, the fresh
enabled-`Finish` readback, and the final Module Wizard close/frame readback.
Any modal, selection drift, disabled `Next`, absent MOD, or missing final
`Finish` is a durable failed lane with no automatic replay.

## Regression finding and v6 repair

The first v5 implementation introduced an executable ordering defect: the
`after-module-area-list` resume branch skipped the `Next` post and immediately
waited for `Finish`. A live run captured no `click:TdlgModuleWizard:&Next >`
event before the timeout, so this was a central control-flow failure rather
than an Aurora behavior failure.

The corrected atom performs the exact list-page `Next` post unconditionally
after a fresh enabled-`Next` readback, including that resume page. The source
contract asserts that this event occurs before the first `Finish` wait.
`bootstrap-reconcile-module-next-post-create` is a distinct one-use public
continuation for the already durable v5 timeout: it requires the full previous
chain, exactly one prior Module-Next continuation, the selected exact Area,
enabled `Next`, disabled `Finish`, one responsive PID, and an absent MOD.

## First-save boundary

The corrected `Next` then `Finish` transition closed Module Wizard in the live
lane, but it did not create the declared MOD: the only frame was the generic
dirty Toolset title. This is a subsequent native Save As state, not evidence
against the wizard transition and not permission to repeat it. The v7 route
therefore binds persistence to the separate `TdlgModuleSelect` transaction
documented in `aurora-toolset-first-save-as-transition-audit-2026-07-19.md`.
