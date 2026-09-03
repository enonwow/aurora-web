# AUR-S07 central runtime execution standard

Status: `CENTRAL GUARDED TEST MODULE DISPATCH READY`

Entrypoint: `backend/scripts/aur-s07-runtime-execution.mjs`

This is the only central execution route for a new immutable runtime-proof
profile. A consuming project must not create an NWN launcher, observer, or
proof adapter.

## Profile contract

The profile uses `aur-s07-runtime-profile/v1` and binds an immutable MOD hash,
an ordered HAK list (which may be empty for an exact vanilla module), Area,
entry coordinate, fixtures, and an accepted native geometry gate. The geometry
gate artifact is SHA-256-bound and re-hashed during profile validation. A
profile whose geometry gate is absent, stale, invalid, blank, or placeholder
is rejected before an execution request is armed.

An enhanced evidence profile additionally binds `engineLog.path`, the exact
module-loading resref, task-specific completion tokens, and
`aur-s07-runtime-evidence-policy/v1`. The policy requires the observation,
physical MP4, MP4 metadata, fresh engine-log window, engine-log metadata, and
explicit visual-review artifacts. The one-time arm request includes the exact
profile SHA-256 so later dispatch, observation, log, review, assembly, and
validation cannot silently consume a changed profile.

The M0 v5 profile is not eligible: its native geometry state is
`area_geometry_invalid`. A repaired generator must produce a new MOD hash and
a new profile before this route is armed.

## Execution stages

1. `dry-run` validates the complete contract without starting Toolset or NWN.
2. `arm` writes a one-time `aur-s07-runtime-launch-request.json`; it does not
   start NWN or send desktop input.
3. For `launch.mode=central_guarded_test_module_action`,
   `dispatch-test-module` validates the armed request, re-hashes the exact MOD
   and ordered HAK list, then owns
   `restore-aurora-toolset-frame-noactivate.mjs` followed by
   `aurora-toolset-test-module-nonblocking.mjs`. That atom requires one clean,
   responding Toolset module frame on the sole non-primary monitor, zero NWN
   processes, no Toolset modal, and the enabled exact `Build > Test Module`
   command. A Toolset frame hidden after a preceding Test Module run is restored
   with `SW_SHOWNOACTIVATE`; if Windows remaps that restored frame onto the
   primary monitor, the same exact frame is placed inside the sole non-primary
   working area with `SWP_NOACTIVATE|SWP_NOZORDER` and explicit readback;
   then the route posts the command exactly once to the owned Toolset frame.
   NWN is therefore started by Toolset, never directly by a helper. The route
   writes immutable dispatch and handoff records and does not use global input.
   `user_owned_test_module_action` remains supported for profiles that require
   an explicit user boundary.
4. `baseline-engine-log` records the exact pre-dispatch file identity and hash
   while zero NWN processes exist. `capture-engine-log` later accepts only the
   same profile/request/observation lineage, a log update fresh for that arm,
   exactly one matching `Loading Module` line, and every profile-bound
   completion token. Append, rotation, and truncation are recorded explicitly;
   no historical prefix is promoted into the fresh window.
5. `observe` waits for at most the declared bounded timeout, reads exactly one
   responding `nwmain` process with a non-zero main-window handle, and verifies a supplied
   one-time handoff binding the declared MOD hash, Area, and entry coordinate.
   It uses only read-only process inspection; no global input is used.
6. After independent inspection of the exact MP4,
   `record-visual-review` writes either an accepted visible/nonblank/
   non-placeholder verdict or a rejected verdict. It never performs visual
   inference itself. `assemble-packet` binds that verdict to the exact MP4,
   capture metadata, observation, and engine-log window, then refuses to write
   a packet unless the same validator already accepts all evidence.
7. `validate` accepts a fresh runtime observation, runtime capture, and
   engine/load log only when their SHA-256 hashes, profile binding, fixture
   binding, and `modelVisibility=visible` gates all pass. Enhanced profiles
   additionally require semantic agreement between the observation and MP4
   PID/StartTime, the sole non-primary monitor, stable ownership probes, the
   log-window metadata, and the explicit visual review.

For a timed runtime MP4, the central capture adapter is
`backend/scripts/capture-nwmain-proof-video-no-global-input.mjs`. It runs only
after the armed Test Module boundary and does not start NWN. It
binds the exact `nwmain` PID, StartTime, HWND, client bounds, sole non-primary
monitor, visible-window set, and a 3x3 WindowFromPoint ownership grid. Those
read-only identities are polled throughout `ffmpeg gdigrab`; any process,
window, geometry, monitor, modal, or occlusion drift removes the partial MP4
and fails the capture. The adapter never activates the window, changes z-order
or geometry, or sends global input. Its MP4 and JSON are runtime-capture
artifacts consumed by the unchanged AUR-S07 packet and validator; it is not a
launcher or a second execution route.

The runner fails closed for wrong module/Area/start, more or fewer than one
NWN process, blank or placeholder model, missing geometry gate, stale artifact,
and missing engine/load log.

For the bounded Area PathConnect differential, the central packet is consumed
by `backend/scripts/assemble-area-path-connect-aur-s07-proof.mjs`. That
assembler does not launch, observe, capture, or control NWN. It first requires
the accepted central AUR-S07 packet, parses the exact positive and negative
markers from the fresh log window, revalidates the native geometry readback,
and then invokes the existing differential validator. The single timed MP4 is
intentionally hash-bound as both runtime artifacts because the immutable
NWScript executes the positive and negative trials sequentially in that one
capture.

## AUR-S05-05 mapping

Fresh proof modules/Areas are created only through the central native atom
`backend/scripts/create-aurora-toolset-module-and-area-no-global-input.mjs`
and the verified AUR-S05-05 standard. Its packed ARE/GIT/GIC and IFO readback
are creation evidence, not geometry proof. The new Area still needs the native
geometry gate before it can be used by AUR-S07.

## Process and cleanup policy

One Toolset process and one NWN process may be observed in their respective
lanes. The atom never starts a second process, never automatically retries a
launch/capture, and never closes Toolset or NWN. Any close requires the user's
explicit authorization under the operating standard.
