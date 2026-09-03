# Area Placeable stale-cache restart runtime evidence — 2026-08-19

The host-local backend was restarted between two fail-closed guarded CDP
captures while the frontend Vite process, Toolset process, and unrelated NWN
process remained untouched. Both captures opened the exact `_winds_study`
Area and passed strict screenshot freshness and renderer settlement.

The post-restart capture recorded 28 classified requests: 19 binary Placeable
asset deliveries, three Placeable batch payload responses, three Placeable
single payload responses, and three tile batch responses. Every response was
HTTP 200; no request was failed or in flight at capture time. The object
renderer was 4/4 ready with zero fallback, blockers, or texture issues. Terrain
was 4/4 loaded with zero pending, failed, or bridge tiles.

The baseline and post-restart page PNGs are byte-identical, as are the two
runtime-canvas PNGs. Exact paths, sizes, hashes, process identities, network
counts, and renderer counts are frozen in
`runtime-verification-summary.json`.

This packet proves a fresh settled artifact after a real memory-cache backend
restart. The guarded harness deliberately creates an isolated CDP profile for
each accepted capture, so it does not claim direct observation of a single
browser tab retaining its in-memory URL cache across the restart. That race is
covered offline by
`frontend/tests/unit/modules/layout/WorkspaceLayout.viewportWiring.test.tsx`,
which proves revalidation-before-publication and one later cache-miss recovery.
The direct same-document observation is now closed by the superseding packet at
`backend/docs/aurora-reverse/evidence/area-stale-cache-same-browser-restart-2026-08-19/`.
No Toolset or NWN parity claim is made here.
