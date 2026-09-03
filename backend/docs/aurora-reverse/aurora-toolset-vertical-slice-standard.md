# Aurora Toolset vertical-slice standard

Version: `aurora-toolset-vertical-slice/v23`

Entrypoint: `backend/scripts/aurora-toolset-vertical-slice.mjs`

This is the central route from an empty, caller-owned module destination to a
fresh immutable Toolset and runtime proof profile. It is independent of the
M6 fast runner; `fastRunner=m6` is rejected. M0 v5 is
`area_geometry_invalid` and must not be reused.

## Iteration-admission precondition

This route creates a new module and therefore cannot be used as a retry merely
because proof, placement, focus, geometry, HAK persistence, capture, timeout,
or runtime evidence is `missing`. Before `bootstrap-dry-run`, the caller must
retain the previous exact candidate lineage and one of these conditions must
hold:

1. this is the first candidate for the declared model; or
2. the previous candidate has a fresh Toolset or NWN
   `modelVisibility=not_visible` result, bound to its hashes, plus a diagnosis
   and minimal intended artifact delta;
   or
3. the owner explicitly authorized a new disposable container after a
   documented non-model blocker. This is container recovery, not evidence that
   the model failed.

`proofCompleteness=missing` never satisfies this precondition and must not be
reported as model visibility. An untested environment has
`modelVisibility=not_tested`. A model visible in Toolset must proceed to NWN
using the same exact MOD/HAK/model lineage. A new `rNN` module, byte-identical
HAK copy, or renamed resource is a new iteration even when no payload bytes
changed.

## Bootstrap contract

The route removes the profile-before-module circularity with three public,
versioned phases:

1. `bootstrap-dry-run --declaration <bootstrap.json>` validates a
   `aurora-toolset-vertical-slice-bootstrap-declaration/v1`: bounded resrefs,
   an absent caller-owned MOD destination, readable ordered HAK sources,
   ordered creature fixture identities (including palette/appearance), and a
   an `entryArea` plus fixture identity intent. Entry coordinates and fixture positions are forbidden at
   this phase because a fresh Area has no published stable screen-to-world
   transform. Creature IDs must exactly match the
   ordered geometry fixture IDs, so a control creature and a Meshy creature are
   both explicit rather than inferred. It starts no process, controls no UI,
   and writes no artifact.
2. `bootstrap-create --declaration <bootstrap.json> --outDir <new-dir>` is the
   only authorized live composition. It invokes the native Module and Area
   Wizard atom, performs the separate native first-save transaction, attaches the exact ordered HAK list, places the declared
   creature fixtures, sets and reads back each declared appearance, and saves using the
   targeted save atom. It permits exactly the one Toolset process owned by the
   central workflow, writes `bootstrap-manifest.json`, and never claims
   geometry, Toolset visual proof, or NWN runtime proof. A failure is durable
   in that manifest; an invalid-location or inaccessible-object save failure
   is classified `area_geometry_invalid`.
3. `bootstrap-recover-create --declaration <bootstrap.json> --outDir <dir>` is
   a single-use recovery route for one narrowly identified transport failure:
   a durable failed manifest with `blockerCode=bootstrap_create_failed` and an
   `failureCode=module_name_edit_readback_blank:<declared-module-resref>`, or
   a legacy durable error containing the exact
   `edit_readback_mismatch::<declared-module-resref>` signature, before the
   destination MOD exists. New manifests persist `failureCode` separately from
   the human-readable nested process error; legacy manifests remain compatible
   when the canonical atom wraps that signature in a `Command failed` error.
   It reuses exactly one responsive Toolset process already positioned at the
   Module Wizard name page. Before it mutates, the reused atom requires one
   exact `TdlgModuleWizard` / `Module Wizard`, one visible `TEdit` ordinal 0,
   and an exact blank readback. It neither launches Toolset nor opens a module.
   The corrected field atom first uses bounded `WM_SETTEXT` and, only if its
   immediate readback is blank or otherwise mismatched, uses `SetWindowText`
   followed by `EN_CHANGE` and an exact final readback. Any other page, nonblank
   field, missing/extra process, existing MOD, or a second recovery attempt is
   rejected. `--dryRun true` validates only the durable authorization packet
   and starts no process.
4. `bootstrap-reconcile-recover-create --declaration <bootstrap.json> --outDir
   <dir>` is the only continuation after the first recovery reaches the
   otherwise unchanged name page but fails before writing the edit because a
   Windows empty environment value was elided. It requires exactly one prior
   recovery attempt, the current nested `edit_expected_before_mismatch::`
   signature, no earlier reconciliation attempt, and an absent MOD. Its live
   preflight uses the canonical read-only dialog probe to record one responsive
   Toolset process, one exact Module Wizard, and exactly one visible blank
   `TEdit` before it writes the continuation ledger entry. It preserves the
   original recovery attempt; it does not reset a ledger or call an atom
   directly. The expected-empty value is transported by the nonempty
   `__AURORA_EXPECT_EMPTY_EDIT_V1__` token and decoded inside the validated
   edit atom. `--dryRun true` validates the durable authorization only.
5. `bootstrap-reconcile-progress-create --declaration <bootstrap.json> --outDir
   <dir>` resumes only the deterministic post-name state after the former
   synchronous `&Next >` transport timed out while Aurora processed its
   `Loading Custom Palettes...` modal. It requires exactly one recovery and one
   expected-before reconciliation, an embedded `button_send_timeout_failed`,
   no earlier progress reconciliation, and an absent MOD. The live route first
   waits read-only for the progress window to disappear, then requires exactly
   one Module Wizard state: enabled `Area Wizard`, disabled `&Next >`, and no
   visible `TEdit`. It records that observation and resumes after the name page;
   it never emits the old name-page click. All modal-capable Module/Area wizard
   actions now use asynchronous `PostMessage` followed by a fresh modal/page
   readback. `--dryRun true` validates only its durable authorization.
6. `bootstrap-reconcile-area-list-create --declaration <bootstrap.json> --outDir
   <dir>` is the one-use continuation for the historical PowerShell parser
   failure in the central Area tileset-list atom. It requires the nested
   `InvalidVariableReferenceWithDrive` failure naming that atom, exactly one
   recovery, expected-before reconciliation, and progress resume, no prior
   area-list continuation, and an absent MOD. Live preflight is read-only and
   requires one responsive process, no progress modal, the Area Wizard with the
   exact preserved Area resref in one `TEdit`, one enabled `TListBox`, disabled
   Back/Next/Finish, and enabled Cancel. It resumes after the Area name and
   never rewrites that name or reopens/clicks an earlier wizard page. The list
   atom has a compile-only PowerShell contract test, so generated PowerShell
   must parse before a live list action is permitted.
7. Native Module Wizard completion has two explicit native pages. After the
   Area Wizard posts `Finish` and closes, the `Current areas` page exposes the
   Area list and enabled Module Wizard `Next`; canonical Aurora manual evidence
   and live readback establish that `Next` is required to reach the separate
   final page where `Finish` becomes enabled. The central atom requires the
   list/`Next` state, posts `Next`, then freshly reads the final page and
   requires enabled `Finish` before posting only `Finish`. It never treats
   selection of an Area or the mere presence of `Finish` as a completion
   predicate. The evidence is recorded in
   `aurora-toolset-module-wizard-transition-audit-2026-07-19.md`.
   `bootstrap-reconcile-module-finish-create --declaration
   <bootstrap.json> --outDir <dir>` is the one-use continuation for the
   historical premature `module_wizard_finish_not_enabled` failure. Its durable
   authorization requires that exact nested atom error, exactly one prior
   recovery, expected-before reconciliation, progress reconciliation, and
   Area-list reconciliation, no prior Module-Finish reconciliation, and an
   absent destination MOD. Its live preflight is read-only: exactly one
   responsive Toolset PID, no Area/progress modal, the post-Area Module Wizard
   control state, and one unselected list entry exactly equal to the declared
   Area resref. It may select only that exact existing entry and must then
   require enabled `Next`; it does not post `Finish`. If the legacy route has
   already selected the exact entry but timed out waiting for a disabled
   `Finish`, `bootstrap-reconcile-module-next-create --declaration
   <bootstrap.json> --outDir <dir>` is the one-use continuation. It requires
   that exact nested timeout, one complete earlier recovery chain, one selected
   exact Area, enabled `Next`, disabled `Finish`, one responsive PID, and an
   absent MOD. It posts only `Next`, reads the next page, and posts `Finish`
   only after its enabled readback. The v5 implementation contained a resume
   ordering defect that skipped this `Next` post; the v6 atom has an explicit
   source contract requiring the recorded `Next` post before any `Finish`
   wait. `bootstrap-reconcile-module-next-post-create --declaration
   <bootstrap.json> --outDir <dir>` is the one-use continuation only for that
   durable v5 timeout after one prior Module-Next continuation, from the exact
   selected list page and enabled `Next` state. Neither continuation reopens Area Wizard,
   rewrites a name, or retries an earlier page. `--dryRun true` validates only
   durable authorization.
8. Module Wizard `Finish` is not a native persistence predicate. The current
   retail Toolset can close the wizard and expose the exact unsaved frame
   `BioWare Aurora Neverwinter Nights Toolset v89.8193.37-17*` while no MOD
   exists. The normal bootstrap therefore requires the verified
   `persist-aurora-toolset-unsaved-module-save-as-no-global-input.mjs` atom
   immediately after that exact frame readback. It validates the live File
   menu identity, asynchronously opens the native `TdlgModuleSelect` / `Save
   As` dialog, validates one blank filename edit, one list, and exact `Save`/
   `Cancel` controls, then requires both a physical nonempty caller-owned MOD
   and the clean exact frame title ending ` - <module>.mod`. A common `#32770`
   dialog is not accepted. The atom returns only after its `Save As` dialog
   has closed; a generic or dirty frame, missing MOD, changed destination, or
   unexpected modal is a failed lane.

   `bootstrap-reconcile-post-finish-save-as-create --declaration
   <bootstrap.json> --outDir <dir>` is the one-use public continuation for
   the already-recorded legacy case where the old creator posted `Finish` and
   then failed with `module_frame_not_settled`. It requires that exact nested
   failure, the complete preceding recovery chain through one
   Module-Next-post continuation, no previous post-Finish-save continuation,
   an absent destination MOD, one responsive Toolset PID, no modal, and the
   exact unsaved frame above. It never repeats a wizard page or opens a
   module. Its dry run performs only durable authorization; its live path
   first records this read-only state, then runs the first-save transaction.
   If that v7 transaction opened the exact dialog but failed only because the
   dialog was not on `DISPLAY1`,
   `bootstrap-reconcile-save-as-monitor-create --declaration <bootstrap.json>
   --outDir <dir>` is the sole next continuation. It requires the complete
   earlier chain, exactly one prior post-Finish Save As attempt, its exact
   durable monitor-policy failure, an absent MOD, and the unchanged verified
   unsaved frame. The v8 first-save atom keeps the frame on `DISPLAY1` but
   accepts `TdlgModuleSelect` on another monitor only after proving the exact
   class/title, same Toolset PID, and shared nonzero native owner with the
   frame. It records HWND, monitor, bounds, and owner handles and never moves,
   focuses, or changes z-order of either window.
9. `bootstrap-finalize --declaration <bootstrap.json> --outDir <dir>
   --geometryGate <gate.json>` accepts only a durable `saved` manifest and an
   `aurora-vertical-slice-native-geometry-gate/v1` packet bound to the newly
   saved MOD hash, Area, ordered HAK hashes, entry point, and fixtures. The
   gate must record native `Area was saved`, no invalid-locations dialog, no
   inaccessible-objects dialog, and positive accessible-surface observations
   for entry and fixtures. Only then does it emit immutable vertical-slice and
   AUR-S07 runtime profiles.

10. A saved module is not an authorization to replay first-save or Module
    Wizard work. The former owner-drawn `Alt+E`/`m` route is withdrawn after it
    exposed an unexpected `Resize Area` modal. RCDATA for the exact installed
    retail binary binds `TFRMFRAME.miViewProperties`, caption `Module
    &Properties`, and `miViewPropertiesClick` to direct Edit child position
    `12`. Fresh native readback for the same build binds that child to enabled
    command ID `68`. The v3 HAK atom validates both bindings and posts only
    targeted `WM_COMMAND(68)`; it never emits `WM_SYSKEY*`, `WM_CHAR`, `SC_KEYMENU`, or
    popup mnemonics. See
    `aurora-toolset-module-properties-owner-drawn-menu-audit-2026-07-19.md`.

11. An unexpected `TfrmAreaResize` / `Resize Area` modal is a hard stop for
    the HAK lane, even if it appeared after a failed menu transport and no HAK
    action is known to have run. The only central recovery is
    `bootstrap-reconcile-unexpected-area-resize-cancel --declaration
    <bootstrap.json> --outDir <dir>`. It is one-use and authorizes only the
    exact saved-but-unattached history ending in
    `module_properties_edit_popup_missing`, before any popup-observation
    retry. Its read-only preflight requires the exact loaded module frame, one
    responsive PID, no other modal, two blank resize edits, and the unselected
    native `Tiny/Small/Medium/Large` preset list. It posts only a targeted
    asynchronous `Cancel`, requires the dialog to disappear, then reads the
    persisted ARE and GIT. The route accepts recovery only if the saved area is
    still the complete Tiny `2 x 2`/four-tile state and contains no fixture
    before HAK attachment and placement. The `TFRMAREARESIZE` DFM establishes
    `Cancel` as `ModalResult=2`, while resize loops run only for
    `ShowModal=1`; see
    `aurora-toolset-unexpected-area-resize-cancel-audit-2026-07-19.md`.
    A failed post-cancel readback is fail-closed and never reauthorizes HAK
    work.

    If the exact cancellation has already completed but the old central GIT
    reader fails with the durable `objects.filter is not a function` schema
    error, the only continuation is
    `bootstrap-reconcile-unexpected-area-resize-postcheck --declaration
    <bootstrap.json> --outDir <dir>`. It requires the no-modal clean loaded
    frame and performs only the repaired ARE/GIT readback. It does not post a
    dialog action, reopen Resize Area, replay a menu transport, or authorize
    HAK work. Its reader accepts the documented
    `ParsedAreaObjectBlueprint.creatures` schema and a legacy placement-array
    representation; any other shape is rejected.

    Once that postcheck is durable, the separately authorized continuation is
    `bootstrap-reconcile-post-area-resize-hak-command --declaration
    <bootstrap.json> --outDir <dir>`. It requires the exact no-delta failure
    code, the complete saved-HAK/menu/cancel/postcheck history, one responsive
    exact loaded module frame, no modal, and a fresh Tiny `2x2`/four-tile plus
    zero-fixture readback. It uses only the v3 direct command binding, attaches
    the declared ordered HAK list, and performs a native Save. It explicitly
    does not place a creature, alter Area geometry, or claim Toolset/runtime
    proof.

12. A failed child-window readback after the corrected ID `68` command does
    not authorize reopening Module Properties or replaying a menu command. The
    current PowerShell host reserves `r` as an `Invoke-History` alias; the old
    helper function `R` therefore attempted to resolve a child HWND as a
    history ID. `bootstrap-reconcile-open-module-properties-hak` is the sole
    continuation for the exact durable `Cannot locate the history for Id`
    failure: it requires the saved no-delta history, exactly two earlier HAK
    command attempts, one responsive Toolset PID, and precisely one existing
    `TfrmIFOProp` / `Module Properties` modal. The repaired atom uses
    `Get-WindowBounds`, resumes that same dialog, attaches the ordered HAKs,
    and saves. It must not issue `WM_COMMAND(68)` again. The prior failure
    occurs before tab selection, combo selection, Add, or OK, so no HAK UI
    mutation is claimed before this narrow reconciliation.

13. The Custom Content tab can contain more than one visible enabled
    `TComboBox`; generic class/count selection is forbidden. The HAK picker is
    identified only as the unique enabled combo immediately below a same-width
    enabled HAK `TListBox` and horizontally adjacent to the `Add` button. The
    atom requires that topology before it enumerates HAK options, selects exact
    HAK text, or posts Add. `bootstrap-reconcile-open-module-properties-hak-
    combo` is the one-use continuation for the exact durable
    `expected_one_hak_combo:2` failure. It reuses the existing `TfrmIFOProp`
    modal, does not reopen Module Properties or replay `WM_COMMAND(68)`, and
    requires fresh no-delta Area/GIT readback before continuing.

14. `CB_GETCURSEL` is a signed 32-bit API result even when returned through a
    pointer-sized message result. The documented `CB_ERR` value is `-1`; on
    this host it is observed as unsigned `0xFFFFFFFF` / `4294967295`. The atom
    must decode the low 32 bits with `BitConverter.ToInt32` and accept only
    `-1` or a non-negative selected index. Direct `Int32` conversion of the
    positive pointer value is forbidden. The one-use
    `bootstrap-reconcile-open-module-properties-hak-combo-sentinel` route
    resumes the same existing modal only after this exact pre-selection
    conversion failure, with no menu replay or HAK UI mutation claimed.

15. Owner-drawn combo item identity must be read with the validated
    `CB_GETLBTEXTLEN` / `CB_GETLBTEXT` primitive; `GetWindowText` after a
    temporary `CB_SETCURSEL` is not an item-text oracle. Enumeration must not
    change the current combo selection. If a legacy enumeration already left a
    non-negative temporary selection while the HAK ListBox remains empty and
    Add disabled, the only repair is
    `bootstrap-reconcile-open-module-properties-hak-combo-clear-selection`.
    It validates exactly one declared HAK item by native text, then issues only
    `CB_SETCURSEL(-1)` and proves selection `-1`, empty HAK ListBox, and
    disabled Add. It does not attach HAKs, press OK, save, or replay the menu.

16. After the cleanup ledger proves selection `-1`, empty HAK ListBox, disabled
    Add, and exact declared source HAK items, the only HAK mutation route is
    `bootstrap-reconcile-open-module-properties-hak-add`. It reuses the same
    `TfrmIFOProp` modal and performs the ordinary exact HAK select, Add, OK,
    rebuild response, and native Save/readback sequence. It cannot reopen the
    menu, wizard, module, or Area; it does not place a creature or claim proof.

17. The post-selection confirmation is also owner-drawn: it must require both
    exact signed `CB_GETCURSEL == targetIndex` and exact
    `CB_GETLBTEXT(targetIndex) == declared HAK`. `GetWindowText` is forbidden
    at this gate. If the legacy route already selected the exact native item
    but failed only on that text readback, the one-use
    `bootstrap-reconcile-open-module-properties-hak-add-selected` route
    reuses the current selected control without sending another selection or
    menu command, then continues only with HAK Add/OK/rebuild/native Save.

18. `CB_SETCURSEL` changes a combo's current index but does not emit the native
    `CBN_SELCHANGE` notification. Therefore an exact HAK item can be selected
    by `CB_GETCURSEL`/`CB_GETLBTEXT` while the VCL-owned `Add` button remains
    disabled. The single recovery for the durable
    `hak_add_button_not_enabled_after_exact_combo_selection` failure is
    `bootstrap-reconcile-open-module-properties-hak-selection-change`. It
    reuses only the current `TfrmIFOProp` modal, requires the exact selected
    declared HAK, empty HAK ListBox, disabled Add, and either the complete
    preceding reconciliation history or a fresh bootstrap whose first and only
    HAK failure is that exact durable failure. It reads the exact combo control ID and its actual
    same-PID parent, then sends only bounded `WM_COMMAND` with
    `CBN_SELCHANGE` to that parent. It requires the selection to remain exact,
    the ListBox to remain empty, and Add to become enabled. This route does not
    Add a HAK, press OK, save, reopen a menu, or touch an Area. Actual HAK
    addition requires a separate later authorization. The rationale and
    Win32/retail evidence are in
    `aurora-toolset-module-properties-hak-combo-selection-change-audit-2026-07-19.md`.
    If that route fails before PowerShell starts with the exact durable Node
    template-render error `ReferenceError: index is not defined`, the sole
    continuation is
    `bootstrap-reconcile-open-module-properties-hak-selection-change-render`.
    It requires exactly one prior selection-change attempt and the unchanged
    modal/selected-item/empty-list/disabled-Add state. The fixed atom's
    executable rendering-and-PowerShell-compile contract must pass before this
    continuation is published; it still sends no Add, OK, Save, menu, wizard,
    or Area action.
    After the read-only post-notification gate proves exact selected HAK,
    empty ListBox, and `Add enabled`, the separately authorized command is
    `bootstrap-reconcile-open-module-properties-hak-add-notified`. It requires
    the durable no-mutation selection-change result and the same authorized
    history mode (complete preceding history, or the verified direct-initial
    Add-disabled lineage). It reuses the open dialog and selection, then performs only
    Add/OK/rebuild/native Save with immediate readbacks. It must not replay the
    menu, combo selection, CBN notification, wizard, or Area transition.
    If Add and Module Properties OK have already posted but the pending native
    rebuild warning was rejected solely because an older text gate recognized
    only Hak Paks, the only continuation is
    bootstrap-reconcile-open-module-properties-hak-rebuild-warning. It
    accepts either Hak Paks or Hak Files only together with the exact same
    warning semantics: list change for the current module, full build, and an
    explicit confirmation question. It requires one enabled affirmative
    Yes/Tak button and one enabled negative No/Nie button. It posts only the
    verified affirmative button and records a bounded build-start transition;
    it does not synchronously wait for the full native build and does not save
    while the build is active. Settlement and persistence are separate gates.
    After the bounded build-start result, or if the legacy v1 helper was killed
    by the manager's 60-second process deadline after that one affirmative post,
    the only immediate route is
    `bootstrap-observe-open-module-properties-hak-rebuild-timeout`. It is a
    read-only one-PID observer that classifies only `TdlgVerifyModule / Build
    Module` as `building`, or the exact dirty module frame with no other modal
    as `settled`. It never posts Yes/Tak, Add, OK, Save, menu, combo, wizard,
    or Area actions and never claims HAK persistence. A later persistence
    reconciliation requires a fresh settled observation; build progress is not
    a failure and must not be retried. The observer itself is idempotent: a
    durable `hak_rebuild_in_progress` observation authorizes another
    read-only sample against the same PID until it reports `settled`; it never
    grants a mutation or a persistence claim merely by being sampled again.
    A visible `Build Module` dialog is not necessarily active work: the exact
    combination of one `No errors found` list item, disabled `Build`, and
    enabled `Done` is a settled results screen. Only
    `bootstrap-reconcile-open-module-properties-hak-rebuild-done` may close
    that screen. It requires the durable prior build observation, reads the
    exact result first, posts only targeted `Done`, requires the modal to
    disappear, and does not replay HAK selection/Add/OK or save. Ordered HAK
    readback and a separate native save remain required before persistence is
    claimed. For a single-HAK declaration,
    `bootstrap-reconcile-open-module-properties-hak-rebuild-persist` is the
    sole continuation: it reopens Module Properties using the already verified
    direct command only to read the ordered list, posts `Cancel` to that new
    inspection dialog, then performs one targeted native Save and requires the
    clean title plus saved SHA-256. It neither repeats HAK Add/OK nor opens a
    wizard, Area, creature, or runtime lane.
    If that exact native Save has a clean title and changed file identity but
    the Toolset retains an exclusive lock so SHA-256 cannot be read, the only
    reconciliation is
    `bootstrap-reconcile-open-module-properties-hak-rebuild-persist-lock`.
    It does not repeat Save: it re-reads the ordered HAK list from a fresh
    inspection dialog, requires the clean frame, and records the module hash
    specifically as `unknown_os_locked`. This preserves the live session and
    does not license creature, Appearance, or runtime work until a later hash
    readback is available. If that first read-only record itself observes that
    the lock has released and a SHA-256 is available, its one bounded
    hash-availability follow-up accepts the stronger evidence; it still does
    not repeat Save, Add, or OK.
    After `hak_attached_saved_pending_creature` has an ordered HAK readback and
    a saved module SHA-256, the sole continuation into content is
    `bootstrap-reconcile-hak-attached-place-creature`. It verifies a clean
    single-module/no-modal state and a zero-creature saved GIT, places only the
    declared fixture, changes only its declared Appearance, saves once, and
    requires native GIT/IFO readback. It never reopens HAK operations.

`bootstrap-geometry-observe --declaration <bootstrap.json> --outDir <dir>` is
the central producer-side observation command. It reuses one owned responsive
Toolset session, never opens or retries a module, reads the saved native GIT,
and binds the exact serialized IFO entry location and post-placement GIT world
coordinates to the declared Area/fixture IDs. A declaration cannot supply
coordinates, and finalization rejects values that differ from these saved
readbacks. Failed observations write a
durable blocker, never a positive gate. The current command deliberately
blocks if native entry-surface evidence is unavailable; it must not manufacture
`entryPointAccessible=true`. `bootstrap-entry-surface-arm` and
`bootstrap-entry-surface-ingest` provide the fallback user-owned evidence
handoff: a nonce-bound request and a hashed fresh Toolset capture are validated
against the current IFO entry readback; the consuming project never provides an
accessibility boolean. Therefore live authoring remains unapproved until a
verified native observer or a validated user-owned observation is present.

## Existing saved-candidate Focus Object proof

An admitted candidate that is already `saved_verified` must not be copied into
a new module merely because its exact-object focus packet is incomplete. The
public continuation is:

1. `bootstrap-focus-dry-run --declaration <bootstrap.json> --sourceOutDir
   <saved-bootstrap-dir>` performs read-only validation of the declaration,
   saved manifest, current MOD/HAK hashes, native ordered HAK readback, saved
   GIT fixture, IFO entry, and ARE identity. It starts no process and writes
   no artifact.
2. `bootstrap-focus-capture --declaration <bootstrap.json> --sourceOutDir
   <saved-bootstrap-dir> --outDir <new-proof-dir>` requires zero Toolset/NWN
   processes and an absent proof destination. It starts exactly one Toolset
   session, selects the exact visible module entry, opens the declared Area,
   selects the one exact declared object in the Area tree, validates the native
   `&Focus on Object` item at ID `2`/position `0`, invokes it once, requires the
   popup to disappear, and requires a stable exact `TfrmViewerArea` plus
   `TScrollBox` before the fresh capture.
   When the exact saved candidate is already open in one responding Toolset
   PID with no modal, `--reuseExactOpenSession true` skips only process start
   and module open. It requires the exact clean r21 frame by native readback,
   starts no second process, and continues with the same Area/object/focus/
   capture gates.
3. A conflicting MRU is observation context, not permission to edit INI and
   not an automatic blocker. The route never writes MRU or `nwtoolset.ini`.
   If the wrong MRU module actually begins loading before exact explicit
   selection wins, the route fails closed and preserves the process.
   Startup must enter the bounded surface-observation loop immediately after
   `Start-Process`; a fixed blind post-launch delay (including the former
   three-second delay) is forbidden because it can let Welcome auto-load the
   conflicting MRU before the exact explicit selection is submitted.
   After a verified `Open an existing Module` choice, the transient
   `Loading Custom Palettes...` `TdlgProgress` is startup work, not a
   module-load ownership signal. The route must keep observing for its owned
   `Open` dialog; treating that progress as `external` and closing the dialog
   can incorrectly fall through to MRU.
4. The capture manifest initially records
   `modelVisibility=not_tested` and `proofCompleteness=missing` with status
   `captured_pending_visual_inspection`. `missing` is never a visibility
   result. After independent visual inspection,
   `bootstrap-focus-record-visibility --outDir <proof-dir>
   --modelVisibility <visible|not_visible> --inspection <description>` binds
   the verdict to the unchanged PNG hash and records
   `proofCompleteness=verified`.

This continuation changes no MOD, HAK, MDL, texture, 2DA row, fixture, Area,
camera transport, INI, or MRU. It is proof completion for the same candidate,
not a new model iteration.

The geometry packet is semantic evidence, not a GIT/ARE syntax check. A valid
tile count or coordinate equation cannot replace native save/readback.

Each declared creature fixture must pin both its expected native
`templateResRef` and integer `appearanceType` (for example the Meshy M0 row is
`15109`), in addition to the human-visible palette and appearance labels. The
saved GIT readback must contain exactly one ordered matching fixture per
declaration. A different template or appearance row is a hard failure.

The geometry gate includes a per-fixture observation containing the saved GIT
template, appearance row, and world position together with
`nativeSaveAccepted`, `savedGitReadback`, and `accessibleSurface`. The aggregate
`fixturesAccessible` is true only when every declared fixture has that exact
observation. Finalization rejects a missing fixture observation even if a loose
aggregate boolean says true.

## Composition and ownership

The bootstrap manager uses these named, verified atoms internally:

- `create-aurora-toolset-module-and-area-no-global-input.mjs`
- `persist-aurora-toolset-unsaved-module-save-as-no-global-input.mjs`
- `attach-aurora-toolset-module-hak-no-global-input.mjs`
- palette/context/Creature Properties atoms for exact creature and appearance
- `save-aurora-toolset-module-no-global-input.mjs`
- the native geometry gate, followed by `aur-s07-runtime-execution.mjs`

They are **not** a public normal-work route. A consuming project must call the
central bootstrap manager and must not make direct/legacy atom calls, create a
local Toolset/NWN runner, or write a substitute adapter. The manager performs
no global cursor, mouse, or keyboard input. `bootstrap-create` is authoring;
all other phases are offline validation/assembly.

`bootstrap-finalize` does not launch NWN. The emitted runtime profile is passed
to the central AUR-S07 route, whose user-owned Test Module handoff and
read-only observation contract remain mandatory.
