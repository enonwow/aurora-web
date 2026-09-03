# Area Placeable same-browser backend-restart evidence — 2026-08-19

This packet closes the direct-observation gap left by the earlier isolated-CDP
restart smoke. One Chrome document opened exact Area `_winds_study`, emitted a
challenge-bound `ready` packet, remained alive while the host-local backend
process changed from PID `110060` to PID `120448`, adopted a new authenticated
session through the normal storage synchronization path without navigation,
and reopened the same Area.

The document marker, `performance.timeOrigin`, and URL are identical before
and after the restart. The active post-restart network window contains 14
classified requests, all HTTP 200: two authoritative Placeable render-payload
batches, two Placeable single-payload reads, nine binary Placeable asset
deliveries, and one tile batch. No classified request failed or remained in
flight. The Placeable renderer settled 4/4 ready with four applied textures
and zero primitive fallback. Terrain settled 4/4 loaded with zero pending,
failed, or bridge tiles.

The first same-browser attempt is retained as a rejected blocker artifact. It
proved that resetting host-local memory invalidates the old server session;
the UI consequently performed no authoritative Area reopen. The implemented
storage-event synchronization now accepts only a valid, changed persisted
session, lets the existing authorization effect revalidate it, and preserves
the open document. The focused mutation gate killed all 17 scored mutants.

Exact paths, hashes, process identities, request counts, renderer settlement,
and the rejected precursor are frozen in `runtime-verification-summary.json`.
No Toolset or NWN parity claim is made here.
