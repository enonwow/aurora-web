# Effective placeables.2da physical-row catalog evidence — 2026-08-18

This packet records the read-only, digest-bound physical-row catalog used as
the selection source for a future Existing Area Placeable `Appearance` edit.
It does not activate an Appearance mutation.

The backend selects the same single authoritative whole `placeables.2da`
resource represented by Area provenance, preserves zero-based physical row
ordinals, and exposes bounded filtering and pagination through
`GET /api/v1/catalog/placeables/appearances`. The request must carry the exact
current lowercase table SHA-256. Missing tables return `404`; stale digests
return `409`.

Display resolution is bounded and deterministic: TLK text, then decoded
Label, then `Row <n>`. StrRef and Label are metadata and never replace or
renumber the physical ordinal. An unreadable stronger source is skipped in
favor of the next exact table. An exact table containing only reserved rows is
still admitted.

Focused verification passed 251/251 backend tests and 21/21 frontend tests.
Both production builds passed; the frontend retained only the existing chunk
size warning. Dedicated mutation gates reached 100%: backend 107 killed and
frontend 57 killed, with zero survivors, timeouts, errors, or uncovered
mutants. Exact report sizes and hashes are in
`offline-verification-summary.json`.

The backend mutation profile excludes the generic snapshot `sourceSize`,
`updatedAt`, and `sourceEtag` fallback mechanics because they predate and do
not participate in the row-catalog contract. It also excludes the vanilla
empty-source admission branch: replacing that branch with unconditional
admission yields an object with empty render rows, null descriptor, and empty
appearance rows, which is observationally identical in every downstream
catalog projection to no source. The shared admission decision itself is
fully mutation-tested by a four-case truth table, and its observable snapshot
caller is covered by the stronger-invalid/next-exact regression test.

Open after this packet: the frontend table-backed editing control,
projector/planner expected-target pair, exact DWord writer and receipt
readback, and fresh Toolset Save/Build/reopen proof.
