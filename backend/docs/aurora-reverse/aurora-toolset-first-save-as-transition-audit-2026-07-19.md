# Aurora Toolset first-save transition audit — 2026-07-19

## Scope

This audit covers the native Toolset transition after Module Wizard `Finish`
and before a newly authored module can be treated as persisted. It is a
Toolset UI semantic. No xoreos material was used.

## Live finding

The central vertical-slice live lane posted the verified Module Wizard `Next`
and then `Finish`. The wizard closed, but the sole responsive Toolset frame was
still exactly `BioWare Aurora Neverwinter Nights Toolset v89.8193.37-17*` and
the declared MOD path did not exist. Thus wizard completion is not a save
predicate. The old creator correctly stopped instead of inferring a module
identity from that generic dirty frame.

## Native Save As precedent

Existing accepted Toolset artifacts in `.codex-tmp-s05-saveas-after-click.json`
and `.codex-tmp-s05-saveas-current.json` record the first-save dialog as
`TdlgModuleSelect` with title `Save As`, one editable filename control, a list,
and exact `Save` and `Cancel` buttons. The resulting clean frame in
`.codex-tmp-s05-after-saveas-clean.json` is
`BioWare Aurora Neverwinter Nights Toolset v89.8193.37-17 - s05t0716.mod`.

The stage-5 standard also records that this is not the Windows common file
dialog (`#32770`). Consequently the old common-dialog helper remains forbidden
for this route.

## Central contract

The v7 vertical-slice manager uses one native first-save atom. It accepts only
the exact unsaved frame, validates File-menu command identity before posting it,
waits for the exact `TdlgModuleSelect` dialog, writes and reads back only the
declared basename, asynchronously posts its exact `Save` control, and then
requires dialog disappearance, the clean module-qualified frame title, and a
nonempty physical MOD at the caller-owned destination. It uses no global
cursor, keyboard, mouse, focus, or window-placement mutation.

This atom is required in the normal bootstrap after the wizard and in the
narrow post-Finish reconciliation. A failed first save records a durable
bootstrap lane failure and does not authorize replaying the module or Area
wizard.

## Monitor-policy correction

The first v7 live Save As invocation opened the exact `TdlgModuleSelect` but
was cancelled before any filename or Save mutation because the dialog was not
on `DISPLAY1`. That location rule was rejected as over-broad: the historical
native capture shows the verified Toolset frame and `TdlgModuleSelect` are
separate top-level windows sharing the same nonzero native application owner;
the dialog is not a child of the frame. Dialog placement is therefore not an
identity predicate.

The repaired policy keeps the frame on `DISPLAY1` and permits this one Save As
dialog on another monitor only when it has the exact class and title, belongs
to the one responsive Toolset PID, and has the exact same nonzero native owner
as the verified frame. It records the dialog HWND, monitor, bounds, and both
owner handles. It never moves a window, changes z-order, or steals focus.
Any owner or identity mismatch remains fail-closed.
