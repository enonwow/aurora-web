# VFX post-duration observability audit

Status: local playback-observability correction verified by an accepted fresh
Web proof; no new Aurora runtime-parity claim.

## Evidence reviewed

The existing accepted row-210 Web frame was reviewed without executing a new capture:

`evidence/vfx-nwn-broad-proof-2026-07-16/row210/aurora-web/aurora-web-row210-one-trigger-native-lightning-radius-observability-v1-20260719.frame.json`

Its last deterministic comparison sample records:

- `phase=post` at `elapsedSeconds=22.966666666666665`;
- `drawParticles=0` and `visibleFrameCount=0`;
- one trigger, `loop=false`, zero overlap, and `completed=true`;
- `postDurationHidden=false` while the observability proof gate reported `pass`.

The source fixture has a 20-second temporary duration. The evidence therefore proves a self-consistency defect in the Web report: it does not establish or alter an Aurora-native post-duration rule.

## Cause

`NwnVfxComparisonRunner` derived both a clamped frame time and a raw logical effect time. On capture-armed CDP playback it passed the clamped 20-second value to `seekAuroraVfxCanonicalRuntimePlayback`. The renderer correctly defines `postDurationHidden` as a strictly-after-duration condition, so it retained `false` at the terminal frame. Independently, the runner set the parent group invisible once the raw logical time entered `post`, producing a clean-looking image with a contradictory report.

## Contract correction

The runner now passes raw logical effect time to renderer seek, while retaining the clamped value for frame motion. Therefore a `post` sample reaches the renderer with a value greater than duration and records `postDurationHidden=true`.

The observability contract adds the optional `requirePostDurationHidden` condition. Only final comparison samples in `phase=post` request it. If requested, the single-playback guard is blocked unless both `completed=true` and `postDurationHidden=true`; the proof gate includes explicit blockers:

- `post-duration-playback-not-completed`;
- `post-duration-playback-not-hidden`.

The CDP capture validator repeats the post-duration-hidden check before it writes an accepted frame.

## Reconciliation

The historical v1 frame is retained unchanged. Under the revised gate it is
rejected and must not be used as an accepted Web proof.

The replacement v2 capture is:

`evidence/vfx-nwn-broad-proof-2026-07-16/row210/aurora-web/aurora-web-row210-one-trigger-lightning-radius-post-duration-observability-v2-20260719.frame.json`

It records `accepted=true`, deterministic `690` frames at `30` fps, one
trigger, `loop=false`, zero overlap, `completed=true`,
`postDurationHidden=true`, an empty blocker manifest, and terminal
`phase=post`, `drawParticles=0`, and `visibleFrameCount=0`. Its frame-manifest
SHA-256 is
`5d56fc65254d71567506c0b3b2cd154180ab6d6e387082d91807d16a81352ec7`.

The accepted comparison reuses the saved NWN oracle without an NWN rerun:

`evidence/vfx-nwn-broad-proof-2026-07-16/comparisons/row210-lightning-radius-post-duration-onset-aligned-v2-20260719.json`

This closes the telemetry contradiction only. The comparison remains
`matched-with-gaps`, not visual parity.
