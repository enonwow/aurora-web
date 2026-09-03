# Effective placeables.2da provenance evidence — 2026-08-17

This packet records the additive, read-only binding between a retained
type-`9` Area GIT Placeable's canonical `Appearance : DWord` and the exact
effective whole `placeables.2da` resource selected by the catalog.

The descriptor carries the authoritative source object key and layer, SHA-256
of the complete selected bytes, byte size, complete physical row count, and
the selected physical row ordinal. The catalog uses its existing
module/ordered-HAK/vanilla precedence and never merges rows across table
sources. The Area repository resolves the descriptor once per snapshot and
omits it for absent or legacy-Byte Appearance, malformed or over-budget table
bytes, invalid physical rows, wrong source layers, or an ordinal outside the
selected table.

The frontend strict HTTP boundary, domain validation, mapper, and clone path
preserve the same exact nested value. It remains immutable provenance: there
is no row-list payload, editable Appearance control, projector/planner pair,
writer, or native proof in this checkpoint.

Focused verification passed 90/90 backend tests and 109/109 frontend tests.
Both production builds passed. Dedicated mutation gates reached 100% with
177/177 killed backend mutants and 181/181 killed frontend mutants, with no
survivors, timeouts, errors, or no-coverage mutants. Exact report sizes and
hashes are recorded in `offline-verification-summary.json`.

This packet does not claim Basic Identity CRUD or Toolset/NWN completion.

