# Existing Area Placeable Appearance evidence — 2026-08-18

This packet records the offline-verified, end-to-end mutation lane for one
retained type-`9` Area GIT Placeable `Appearance : DWord`.

The frontend admits editing only from exact immutable `aurora_git` Placeable
provenance with a canonical DWord and an effective `placeables.2da` descriptor.
The selector loads only physical rows from the exact digest-bound catalog,
retains the currently selected ordinal across filtering, rejects stale or
foreign catalogs, and never treats a ResRef, label, StrRef, display name, or
model name as the native value. Apply, cancel, clone, undo, and redo preserve
the immutable source descriptor.

The backend projects the exact changed pair
`{ expectedValue, value, tableSha256, rowCount }`, revalidates the source
ordinal and native field during planning, and re-resolves the authoritative
whole table during compilation. The target row must exist in the same digest
and row count. The writer replaces exactly one canonical existing DWord,
performs whole-struct and receipt readback, preserves every other GIT field,
and preserves all GIC bytes. Missing, legacy-Byte, malformed, stale,
unchanged, cross-family, deletion-colliding, or nonexistent-row inputs fail
closed.

Final focused verification passed 1314/1314 backend tests and 122/122 frontend
tests. Both production builds passed; the frontend retained only its existing
chunk-size warning. Dedicated mutation gates reached 100%: backend 441 killed
plus 2 detected timeouts, frontend 386 killed, and zero survivors, uncovered
mutants, or errors in either report. Exact report sizes and hashes are in
`offline-verification-summary.json`.

The mutation profiles use narrow line ranges. Backend exclusions are limited
to predicates that are equivalent or unreachable after the same strict
validator: exact-key iteration after complete field validation, the DWord
maximum implied by `value < rowCount <= 1000000`, digest type implied by the
lowercase-hex regex, the redundant lower row-count guard, target rechecks and
the defensive missing-mutation branch after prior admission. The unrelated
Interruptable writer lane is outside the profile. Frontend exclusions are
limited to equivalent downstream-normalized branches: DWord type implied by
the admitted table descriptor, own-`undefined` removed by scene normalization,
digest type implied by regex, candidate revalidation after exact catalog
membership, exact-key iteration after complete field validation, source kind
implied by exact Placeable provenance, finite-number type implied by
`Number.isFinite`, identity normalization after the presence guard, and the
invalid native-select branch made unreachable by the controlled option list.

This is offline implementation evidence. Fresh exact-candidate Toolset
Save/Build/reopen, packed readback, and NWN runtime behavior are not claimed.
