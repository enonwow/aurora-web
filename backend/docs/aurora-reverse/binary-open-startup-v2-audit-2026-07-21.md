# Binary explicit-open v2 audit

Status: corrected central classification defect; no Toolset, MOD, HAK, INI, or MRU mutation performed by this audit.

## Evidence examined

The preserved `m2a_now01` v2 packet at
`C:\Projects\meshy2aurora\proof-output\current-static-20260721-now01\binary-native-geometry-manifest.json`
records all of the following before the wrong `m2a_m0r25.mod` frame:

- `BM_SETCHECK(Open)=1`, followed by synchronous `BM_CLICK(Open)` and a
  second `BM_GETCHECK(Open)=1`;
- one posted `OK`, `openModuleDialogRequested=true`, and no module-list
  selection;
- a `TdlgProgress` with empty title and children; and then
  `unexpected_module_window_loaded`.

The existing canonical vertical-slice and session-workflow standards already
establish that `Loading Custom Palettes...` after a verified Welcome choice is
startup work, not a module-load owner. The live packet shows the same native
surface with no readable progress text. The old classifier treated only text
matching `Loading Custom Palettes` as the exception and therefore classified
the blank post-Welcome progress as `external` before its owned Open dialog
could be observed.

## Decision

`aurora-toolset-explicit-open-startup-admission/v3` permits the anonymous
progress exception only under all of these conditions:

1. the runner has just completed its own exact Welcome transition;
2. it has requested but not handled the Open dialog;
3. it has not submitted a module-list selection and has no load owner; and
4. the `TdlgProgress` has no text.

The runner records that state as
`post_welcome_open_transition_anonymous_progress` and continues waiting for
the owned exact module list. Any non-qualifying progress remains a sticky
module-load signal.

The v3 transport also reads `Start normally` before/after the Open radio
transition. It fails before `OK` if `Open=checked` and `Start normally=checked`
at either post-transition readback. This is diagnostic and fail-closed; the
audit does not assume an unproven VCL handler, send a parent `WM_COMMAND`,
activate a window, or alter focus.

## Rejected changes

- Do not add a guessed parent `WM_COMMAND/BN_CLICKED` path. The current Aurora
  evidence does not identify an exact `TdlgWelcome` command ID or handler.
- Do not use the documented activation workaround for `BM_CLICK`; global focus
  and foreground-window manipulation are forbidden by the shared contract.
- Do not accept the wrong MRU frame, invoke `File > Open`, or replay the v1
  restart transition.

## Continuity

The public `restart-failed-v2-startup-admission` route archives only an exact
v2 pre-module failure and requires the hash-bound v1 archive record. It
preserves both live packets before a fresh v3 preflight. It is not a generic
reset or retry mechanism.
