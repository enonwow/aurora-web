# NWN proof client-capture working-area fix (2026-07-22)

## Scope

This is an offline diagnosis and narrow correction for the existing
`aurora-model-proof-120s` NWN capture route. No Toolset or NWN process was
started and no live proof was retried.

## Recorded failure

The r32 runtime blocker recorded:

- exact `nwmain` PID `36000`, HWND `24120506`;
- prepared window bounds `[-1920, 0]..[0, 1080]`, equal to the whole
  non-primary screen rather than its working area;
- post-lift physical probe owners `50140,50140,20856`;
- failure `nwmain_zorder_lift_not_unobscured` before any capture.

The old preparation route sized the NWN outer window to `Screen.Bounds`. The
old capture route then probed and copied the outer `GetWindowRect`, including
non-client pixels and pixels underneath the secondary-monitor taskbar. The
Explorer-owned bottom-right probe was therefore not a reliable game-client
surface probe.

## Correction

- `prepare-nwmain-proof-window-no-global-input.mjs` now places the exact owned
  NWN outer window inside the sole non-primary `Screen.WorkingArea`.
- `capture-nwmain-proof-window-no-global-input.mjs` derives the capture surface
  from `GetClientRect` plus `ClientToScreen` and performs the three ownership
  probes and the single `CopyFromScreen` over that exact client rectangle.
- The capture packet binds outer-window bounds, client bounds, monitor bounds,
  working-area bounds, and the exact probe coordinates.
- The validator rejects an outer window outside the working area, a client
  rectangle outside the window, or any probe outside or inconsistent with the
  client rectangle.
- The existing scoped `HWND_TOP` lease, exact predecessor restoration, and
  fail-closed foreign-PID ownership checks remain unchanged. A real overlap
  over captured client pixels is still rejected.

## Offline verification

Passed:

- `node backend/scripts/test-prepare-nwmain-proof-window-no-global-input-contract.mjs`
- `node backend/scripts/test-capture-nwmain-proof-window-contract.mjs`
- `node backend/scripts/test-aurora-model-proof-120s-contract.mjs`
- `node backend/scripts/test-aurora-toolset-skill-contract.mjs`
- route-manifest rehash of every listed route identity
- `git diff --check` for the touched files

The published route manifest now has SHA-256
`1dd3170f9bda9080d1093d8952505127f8e43f2e9ce562b783e848fa81030eb6`.
Any consuming candidate profile pinned to the previous manifest must be
republished with this manifest identity before the same public route can be
run again. That is proof-route binding maintenance, not a new model candidate.
