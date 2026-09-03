# Area Placeable cache admission evidence — 2026-08-18

This packet closes the host-local ghost-cache failure that previously made the
Area renderer publish immutable Placeable asset URLs for values that the
bounded memory cache had silently refused to retain.

The memory cache now reports whether a write was retained. Placeable
processing first attempts the complete value, then admits a delivery-safe
compact value with deferred VFX simulation frames. If neither value can be
retained, processing fails closed with `PLACEABLE_CACHE_ADMISSION_FAILED`
instead of returning a cache key whose contract and binary URLs will return
404. The same admission path is used by initial processing, legacy migration,
and later manifest refreshes.

Focused verification passed 177/177 backend tests. The frontend cache recovery
and Area wiring tests passed 106/106, the additional payload-revalidation suite
passed 7/7, and both production builds passed. The dedicated backend mutation
gate killed 22/22 active mutants with no survivors, uncovered mutants,
timeouts, or errors.

Two independent live observations used the exact `_winds_study` Area. The
Playwright network trace contains 21/21 successful Placeable cache GETs and no
active Area-run 4xx/5xx. The final guarded CDP capture contains 19/19 successful
binary asset responses, zero failed or in-flight Placeable requests, a ready
4/4 shared object renderer, four loaded textured tiles, and zero failed or
bridge tiles. It also proves that the formerly missing
`af2b22a9cebd2cd7215c8d6350d606516cb4a67c6c537edf0f85e4f75ef5f3c4`
entry was admitted through the `vfx-frames-deferred` path.

The proof harness was hardened during this run. A successful frame now waits
for every classified Area, tile, Placeable payload, single contract, and binary
asset request to finish, and fails on any active failed request. This removed a
false-green condition exposed by the first capture, which still had one binary
asset request in flight.

## Independent visual verdict

The transport/cache acceptance point and the browser visual point are
`verified`. Independent inspection initially treated the large opaque black
surface over the lower-right portion of the Area as suspicious. Runtime
isolation disproved the initial `other_fog` attribution: hiding only
`other_fog` removed the faint fog streaks but left the black surface unchanged.
Hiding only `obj_plc_q_floor_20` removed the black surface and revealed the
already-rendered tile below it.

The exact source-backed identity of that object is Placeable appearance `5700`,
template `plc_q_314`, model `zlc_flr_black_x1`, texture `pdag_black`, source
label `[Q] Czarny 1x1`. The model is one flat textured quad, is classified by
the existing renderer as a terrain overlay, and has a ready mapped opaque
texture contract. The black square is therefore authored Area content, not a
blank, failed, bridge, or occluded tile and not a VFX shader failure.

The durable verdicts are:

- cache admission and binary delivery: `verified`;
- required request settlement and active HTTP failure gate: `verified`;
- tile model/material delivery for this exact Area: `verified`;
- browser visual renderer proof: `verified`, including source-backed black
  floor attribution;
- Toolset Save/Build/reopen and NWN runtime: `missing` and not claimed.

The capture was made through the canonical guarded CDP path. Proof inspection
followed `aurora-toolset-prove` skill-suite contract `1.0.15`; no Toolset or NWN
process was opened.
