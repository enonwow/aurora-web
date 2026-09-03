# Existing Area Placeable Tag evidence — 2026-08-18

This packet records the offline-verified end-to-end mutation lane for the
canonical `Tag : CExoString` field on one retained type-`9` Area GIT
Placeable.

The source object is located by the immutable zero-based ordinal pair
`(sourceKind, sourceIndex)`. `sourceObjectId` remains diagnostic metadata and
a compatibility fallback for older non-Tag drafts; it is not accepted as the
authoritative locator for a Tag mutation. This removes the former circular
dependency in which changing Tag could also change the identity used to find
the native object.

The frontend admits Tag only for an exact existing `aurora_git` Placeable
carrying a safe non-negative source ordinal and present valid Tag provenance.
The product boundary is an exact string of `0..32` ECMAScript code units with
no U+0000. Empty is valid and distinct from absent. No trimming, Unicode
normalization, case folding, substitution, or truncation is performed.

The backend emits one exact `{ expectedValue, value }` pair only for a changed
Tag. Planning reparses the immutable ordinal and exact native value, rejects
stale or conflicting identity, and allows only that explicit delta through the
retained-object guard. The pair writer replaces exactly one canonical
`Tag : CExoString`, performs complete GIT struct and receipt readback, and
preserves every GIC byte in the isolated mutation case.

Final focused verification passed 1,382/1,382 backend tests and 143/143
frontend tests. Both production builds passed, with only the existing frontend
chunk-size warning. Dedicated mutation gates reached 100%: 241 backend and 78
frontend active mutants were killed, with zero timeouts, survivors, uncovered
mutants, or errors. Exact report sizes and hashes are in
`offline-verification-summary.json`.

Backend mutation exclusions are limited to mechanically equivalent or
unreachable branches after the same exact invariants: the domain exact-key
condition after required key reads, mapping a non-Tag property entry to
`undefined` before the same lookup, the projector's repeated target
prevalidation/null guard, and legacy diagnostic fallback paths outside an
authorized Tag mutation. Frontend ignored instrumentation is outside the
exact Tag domain/application boundary or delegates directly to those mutated
guards and reducers.

This is offline implementation evidence. Fresh exact-candidate Toolset
Save/Build/reopen, packed module readback, and NWN runtime behaviour are not
claimed. `Name : CExoLocString` remains preserve-only and is not covered by
this packet.

## Browser observation

A headed Playwright session against the host-local backend opened the real
`_winds_study` Area and its first retained Placeable (`GIT #001`, diagnostic
source ID `obj_plc_inne_4`). The dialog showed the exact source Tag `inne_4`
as enabled and labelled `ACTIVE_NOW`, while Name and Template ResRef remained
disabled `PRESERVE_ONLY`. Applying `inne_4_tag_probe` updated both the dialog
and scene-object list; a second Apply restored `inne_4`. No module Save or
backend mutation endpoint was invoked.

The browser run is an interaction observation, not accepted runtime proof.
During the active run the renderer repeatedly requested the stale cache key
`af2b22a9cebd2cd7215c8d6350d606516cb4a67c6c537edf0f85e4f75ef5f3c4`
and received HTTP 404 for the cache record, GLB, and TGA assets. This violates
the zero-active-failure rule in the proof-capture safety contract. The exact
artifacts are:

- `output/playwright/area-existing-placeable-tag-local-apply-2026-08-18.png`,
  SHA-256
  `50a5c5a688a672807df1efff2754fde2d7b4fd4ccd1628ea9d99163bca95ea46`;
- `output/playwright/area-existing-placeable-tag-local-apply-2026-08-18.trace`,
  SHA-256
  `e4a125d555b6c6369da202b71ff9c16ea41457e1c93fb69852555ee965a04c5d`;
- `output/playwright/area-existing-placeable-tag-local-apply-2026-08-18.network`,
  SHA-256
  `a453862ef496f7cb0301be154e9453d0b341d172b025e526d333c25089ae8851`.
