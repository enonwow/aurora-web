# Build an existing owned module

Public route: `backend/scripts/aurora-toolset-rebuild.mjs`.
Function scope: AUR-S07-02 execution; this does not close the universal stage.
Commands `open`, `build`, `observe`, `finish` each require `--profile`,
`--ownerManifest`, `--dfm` and `--outDir`. The owner is an existing successful
binary-bootstrap session; no process is launched, closed, focused or replaced.

Primary Aurora evidence is the fully parsed TFRMFRAME/TDLGVERIFYMODULE DFM tree
from the running executable, bound by SHA-256. `mmFrame/Build1/miVerifyModule`
references `actVerifyModule`, caption `Build &Module`. Hidden DFM menu entries
are omitted before matching native menu counts. The enabled command ID comes
from fresh central native menu readback, never from a remembered integer.

`open` uses the existing preflight, menu probe and targeted menu-command atoms,
then inspects the exact Build Module dialog. `build` rechecks enabled Build and
Done and posts Build once. `observe` is read-only and distinguishes running
(both disabled) from settled (Build disabled, Done enabled); it reads the
actual result list. The manually opened dialog may retain enabled Build after
completion (SERCE-A native evidence 2026-09-07): after a recorded Build submission,
enabled Done plus the populated result list also proves settlement. Both enabled
buttons with an empty list remain ready, not completed. The regression covers
this distinction; the HAK auto-rebuild-only disabled-Build convention is not
generalized to manual Build. `finish` posts Done only for a proven settled result, saves
when dirty through the existing native Save atom and records file hash/readback.
Errors remain errors; successful dispatch alone is not a successful build.

`open --ensureNonPrimary true` additionally owns the existing
`restore-aurora-toolset-frame-noactivate.mjs --ensureNonPrimary true` preparation
step before the monitor preflight. This corrects clean startup frames which
inherit primary-monitor placement. Admission requires the original PID and
StartTime, unchanged source MOD, status `created`, one visible clean exact
frame and no visible modal. It records the submission before acting, refuses
a second placement submission and verifies the same HWND on non-primary
DISPLAY1 afterward. It uses no activation, z-order change, settings edit or
new native transport. The prior failed preflight remains in the event history.
This is placement preparation, never permission to repeat a submitted Build.

The route owns these already shared atoms: preflight-aurora-toolset-no-modal,
probe-aurora-toolset-main-menu, invoke-aurora-toolset-main-menu-command,
probe-aurora-toolset-dialog-controls, click-aurora-toolset-dialog-button,
read-aurora-toolset-dialog-list-items, save-aurora-toolset-module and
inspect-aurora-toolset-visible-windows (their `-no-global-input.mjs` files).
It changes no HAK list, camera or NWN session. Build and runtime proof are
separate; a consuming task preserves and checks the resulting resource deltas.

`close` is the optional post-save terminal phase with the same four arguments
and a nonempty `--closeAuthorization` recording explicit or standing user
authorization. It requires `saved_verified`, unchanged saved MOD hash, the
original exact PID/StartTime/executable and clean frame HWND/title with no modal.
It owns the existing `close-aurora-toolset-window-no-global-input.mjs` atom,
passing the exact identity to its graceful-first bounded force fallback.
It neither controls nor requires absence of NWN. Failed close evidence remains
in state; no blind repeat is admitted. This phase is for an owned completed
Build, not arbitrary sessions or incomplete proof cleanup.

For that close phase only, the shared read-only window inspector receives
`--includeHiddenFrameHwnd` with the prior saved frame HWND. It enumerates visible
windows plus that one exact TfrmFrame even when hidden. All identity, clean title
and modal gates remain; it does not restore or focus the window. The previously
observed visibility-only rejection remains evidence; no close was submitted by
that rejection, so the still-saved state can use this qualified readback.

`close` also admits `created` (no Build submitted) with explicit
`--closeExpectedFrameHwnd`, `--closeExpectedFrameTitle` and
`--closeAuthorization`. This terminal cleanup binds the original process and
StartTime, unchanged candidate bytes, one visible clean saved module frame and
no modal. It may close an externally switched, still-clean module only when
the caller explicitly authorizes that exact current frame. It never saves or
claims a Build; status becomes `closed_before_build`. The same graceful-first
closer is used, with no new native transport. Dirty or active Build sessions
remain ineligible. Preserve the closed session packet before a new session.

`close --closeAllowHiddenOriginalFrame true` is an optional extension for the
original clean hidden **unbuilt** frame only. It still requires the explicit
`--closeExpectedFrameHwnd`, `--closeExpectedFrameTitle` and `--closeAuthorization`.
The successful owner manifest's `open.result.moduleOpen` supplies the original
HWND/title; its module resref/hash and PID/StartTime must match the created state.
The inspector includes only that exact original HWND through its existing
`--includeHiddenFrameHwnd` option. A switched module, changed bytes, missing
owner binding, nonresponsive process, dirty title, duplicate frame or visible
modal is rejected. `startedAt` or a recorded native Build-button submission
also rejects a purported `created` state, including failed Build dispatch.
The default visible unbuilt close and saved-build close retain their routes.
The same exact graceful-first closer receives PID/StartTime/HWND/title; no
restore, focus, Save, Build, wider hidden enumeration, NWN condition or process
launch is added. Terminal status remains `closed_before_build`, never a Build
receipt. Read-only inspector attempts remain durable events even when later
admission fails; rejection submits no close and promotes no status.

`close-abandoned-dialog-dry-run` then `close-abandoned-dialog` covers an externally
dismissed, unsubmitted ready Build dialog. Both require the usual four inputs,
`--currentModuleSha256` from the freshly audited saved file and
`--closeAuthorization`. The original `dialog_open` state must retain the
missing-dialog probe failure, no Build start, ready controls, and the original
placement frame. Fresh inspection requires zero NWN, the exact original clean
frame (possibly hidden), one responsive owned Toolset and no visible modal.
The module hash is rechecked; changed saved bytes remain recorded explicitly,
never substituted for a successful build. The existing exact graceful-first
closer is the only mutation. The terminal state is
`closed_abandoned_dialog_before_build`, not `saved_verified`. This generic
cleanup adds no Aurora semantic, transport, save, dialog retry or build claim.
Its positive and negative parse/admission cases are in
`test-aurora-toolset-rebuild-contract.mjs`. The prior failure is never erased.

`adopt-unbuilt-container-resave --sourceModule <immutable original MOD>` is an
offline-equivalence/read-only-native admission before any Build (`created`).
It verifies the source against the original profile hash, parses both ERF key
and resource tables with bounds/identity checks, and requires exact resource
names/types/bytes and localized description. Only container ordering/padding
may differ. The same responsive owned Toolset must show one clean visible
module frame and no modal. It records both hashes and the exact frame before
updating the unbuilt state's source hash. Subsequent `open` checks that hash;
the original profile/owner are immutable. This does not claim Build or Save
execution. A changed resource, description, dirty frame, modal or second
adoption is rejected; the previous failed hash check remains evidence.
