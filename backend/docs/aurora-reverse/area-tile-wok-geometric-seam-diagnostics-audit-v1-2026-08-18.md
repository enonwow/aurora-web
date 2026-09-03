# Area tile WOK geometric seam diagnostics audit v1 — 2026-08-18

## Decision

Aurora Web may expose source-backed WOK geometry and a project diagnostic for
geometric boundary contact between adjacent Area tiles. It must not label that
result as native `PathConnect`, pathfinding, walkability, or NWN
traversability.

The current Aurora evidence recovers SET path metadata and source WOK geometry,
but it does not recover the Toolset's native `PathConnect` construction or the
runtime transition verdict. The implemented contract therefore carries two
independent results:

- native `PathConnect`: `missing`, with evidence
  `native-path-connect-not-recovered`;
- source WOK boundary geometry: `contact`, `discontinuous`, or `unresolved`.

This is a fail-closed implementation checkpoint, not a native navigation parity
claim.

## Aurora-first evidence boundary

The implementation was checked against the existing repo-local audits before
code was written:

- `area-creation-decompilation-audit-2026-08-06.md`;
- `tile-path-node-compatibility-audit-v1-2026-07-20.md`;
- `vfx-wok-aabb-tree-parser-audit-2026-08-07.md`;
- `vfx-wok-aabb-runtime-traversal-audit-2026-08-07.md`;
- `docs/AUDYT_AREA_TILE_EDITOR_COMPLETE_2026-07-11.md`;
- `docs/brainstorm/2026-08-06-area-authoring-crud-tile-parity-program.md`.

The decompilation corpus contains SET/PathNode-related evidence and WOK-related
data, but no recovered authoritative `PathConnect` algorithm. No xoreos source
was used. No new Toolset or NWN claim was inferred from geometric coincidence.

## Implemented contract

`areaTileConnectivityDiagnostics.ts` now:

1. requires a positive, dense, unique tile grid and reports malformed grids;
2. admits only an exact ready collision contract within fixed resource,
   instance, node, vertex, face, and output budgets;
3. validates WOK JSON fail-closed, including exact version, finite vectors,
   axis-angle orientation, triangle ordinals, and source resource ambiguity;
4. binds every tile to exactly one collision instance by tile id, resource id,
   translation, height, and orientation;
5. applies node axis-angle, node translation, recovered ARE quarter-turn, and
   Area translation transforms in Aurora z-up coordinates;
6. compares only right and bottom internal grid seams, once, in stable row-major
   order;
7. requires positive-length lateral overlap and matching endpoint heights;
8. reports the exact unresolved/discontinuous reason and keeps PathNode
   presence independent of missing PathConnect;
9. computes geometric-contact components, explicitly not navigation
   components;
10. produces bounded source-WOK triangle edges for a renderer debug overlay.

The Area editing panel exposes the independent counts and the explicit warning
that WOK contact is not a traversability claim. The Three renderer replaces the
old green bridge-tile approximation with actual source-WOK `LineSegments`,
using the existing Area mirror and Aurora `(x,y,z)` to Three `(x,z,y)` mapping.
The layer records the evidence boundary
`source-wok-geometry-only-no-path-connect-or-traversability-claim` in scene
metadata and is disposed with the terrain mesh.

## TDD and fault findings

The first test run failed because the new domain module did not exist. The
panel test then failed because the diagnostic surface was absent, and the
renderer test failed because no source-WOK line layer existed.

The expanded mutation pass found and caused fixes for three observable defects:

- invalid or fractional Area dimensions were normalized to `0x0` without a
  grid diagnostic;
- a counted-but-outside tile and duplicate tile identity could masquerade as a
  dense grid;
- invalid admission collapsed resource and transform provenance into one
  unreachable reason branch.

The final contract also covers malformed WOK structures, ambiguous resources,
missing/duplicate instances, all ARE quarter turns, non-unit node axes,
non-zero height, stale transforms on every axis, topologically non-trivial
contact components, non-first-row/column seams, reversed slopes, endpoint-only
height mismatches, and zero-length boundary geometry.

## Verification

Final verification on 2026-08-18:

- domain, panel, and renderer focused tests: 111/111 passed;
- dedicated domain mutation tests: 73/73 passed;
- production frontend build: passed, 311 modules; only the existing chunk-size
  warning remains;
- Stryker: 289 killed, 1 timeout detected, 0 survived, 0 no-coverage, 0 errors;
  total and covered mutation score 100.00%;
- report: `frontend/reports/mutation/area-tile-connectivity.json`;
- report bytes: `264870`;
- report SHA-256:
  `CCBD3ADA2EC5E90A45554F1FCCB4E410DE229921C58A1547095FE3DBDA9090A3`.

Mutation scope intentionally excludes string/object/block formatting mutants,
floating equality-operator substitutions already covered by ordinary epsilon
boundary tests, the exhaustive private WOK parser matrix, very high allocation
budget expansions, truncation loop mechanics, two extra empty grid-loop
iterations, and one parser-invalid marker branch proven observationally
equivalent to the downstream missing-node fail-closed guard. Transform math,
instance provenance, seam classification, interpolation, graph components,
public overlay output, grid admission, summaries, and diagnostics remain in the
scored 100% gate.

## Remaining blockers

This checkpoint does not close tile-navigation parity. Remaining work is:

1. recover or observe the authoritative Aurora `PathConnect` production and
   consumption semantics;
2. implement the recovered native contract without deriving it from PathNode
   names or WOK proximity;
3. produce a fresh disposable Area through Create/Update/Delete and verify
   exact packed resources;
4. perform guarded browser proof with fresh settled contracts and zero failed
   or bridge tiles;
5. perform Toolset Save/Build/reopen and NWN runtime certification under the
   mandatory Toolset operation/proof skills.

