# Existing placeable `Static` / `Useable` offline verification — 2026-08-17

This packet closes automated offline verification for the bounded
existing-instance `Static` and `Useable` mutation. The machine-readable source
of truth is `offline-verification-summary.json`.

The focused backend gate passes 634/634 tests, the focused frontend gate passes
28/28 tests, Area Update integration passes 20/20 tests, both production builds
pass, and both focused mutation reports kill 100% of active mutants.

The implementation keeps the two byte values independent and writes only
explicit, changed, provenance-bound pairs. It preserves GIC bytes and the
complete remaining placeable struct. `Plot`, `HasInventory`, and `ItemList`
remain outside this lane and are disabled/preserved in the frontend.

This is not live certification. Accepted prior native packets prove field
identity and the common native profiles, but a fresh Aurora Web generated
candidate still requires exact Toolset Save/Build/reopen and applicable NWN
runtime proof. The previously recorded global dirty-worktree regression also
remains open.
