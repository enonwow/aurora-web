# Existing Area Loading Screen ID Audit v1

Date: 2026-08-24

## Decision

Aurora Web may edit one already-present Area root
`LoadScreenID : Word` under an exact, preserve-first contract. The admitted
application value is an uninterpreted integer in `0..65535`.

This audit does not create a missing field, infer a `loadscreens.2da` row,
synthesize a label or image ResRef, treat a Door transition loading screen as
the Area loading screen, or claim NWN display behavior. Variables and every
other unsupported Area Advanced-tab control remain separate families.

No xoreos source, code, naming, or semantics were used.

## Primary Aurora evidence

The frozen primary artifact is
`C:\Projects\New Folder\export\decompiled_all.c`, SHA-256
`36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572`.

Area reader `FUN_005a7fc8` requests exact root label `LoadScreenID` through
`FUN_00aeedc4` at decompiled lines `255230-255231` and stores the result in the
Area member at `+0x188`. `FUN_00aeedc4` is the native Word reader.

Area writer `FUN_005a9f30` passes the same `+0x188` member and exact label
`LoadScreenID` to `FUN_00aefd88` at line `255913`. `FUN_00aefd88` is the native
Word writer. The adjacent writer calls serialize the same Area root family,
including weather, lighting, PvP, NoRest, dimensions, scripts, tileset, and
tile list.

The Toolset Area-properties transfer independently preserves the same value:
the Area-to-dialog path copies the unsigned 16-bit member `+0x188` to dialog
member `+0x734` at line `209781`; the symmetric dialog-to-Area path copies
`+0x734` back to `+0x188` at line `209933`.

The installed Toolset also contains a `loadscreens` 2DA loader. Function
`FUN_004e050c` opens the exact table name and attempts `StrRef` followed by
`Label` for display. That query path is supporting evidence for UI labeling,
not authority for this mutation slice. Effective resource precedence, physical
row eligibility, image assets, and runtime display remain unimplemented until
a separate catalog audit closes them.

## Frozen application contract

- Area detail exposes optional `advancedFlags.loadingScreenId` only when the
  root contains exactly one case-insensitively unique, exactly cased
  `LoadScreenID` field of native GFF type Word and its value is an integer in
  `0..65535`.
- The production draft retains the immutable source value separately from the
  editable target. Absence means preserve. A changed target projects one exact
  `{ expectedValue, value }` CAS pair.
- Missing, duplicate, wrong-case, wrong-type, stale, unchanged, negative,
  oversized, non-integer, coerced, partial, or unknown-key mutations fail
  closed. Values are never rounded, clamped, defaulted, or remapped.
- The compiler reparses the retained ARE under the existing source digest and
  module revision fence, verifies the expected Word, replaces only that exact
  field, and independently reads the candidate and persisted value.
- GIT, GIC, IFO, every unrelated ARE field, authorization, optimistic locking,
  idempotency, journaling, atomic publication, recovery, response envelopes,
  and API major version remain unchanged.
- One fixed-size optional integer adds no pagination, streaming, or material
  request-budget cost.

## Diagnosability and proof boundary

Validation diagnostics identify the Area mutation family and exact
`LoadScreenID` field without logging source bytes or host paths. Transaction
receipts continue to carry source/candidate/persisted hashes and independent
readback status.

Offline completion requires parser provenance, transport/cache/draft cloning,
strict API validation, frontend source/target separation, an Advanced-tab raw
Word control, writer and candidate readback, atomic publication coverage,
regression smoke, and both production builds.

Release remains blocked by a provenance-bound effective `loadscreens.2da`
catalog, guarded browser Save/reopen, exact-candidate Toolset
Save/Build/reopen, and NWN loading-screen behavior proof. Storage success alone
must not be reported as visual or runtime proof.

## Offline implementation checkpoint — catalog revision 2026-08-24.24

The frozen storage contract is implemented end to end. Backend Area parsing,
immutable source transport, processing cache identity, strict HTTP schema,
draft projection, exact ARE writer CAS, candidate readback, persisted readback,
and atomic publication now carry `advancedFlags.loadingScreenId`. The writer
requires exactly one retained `LoadScreenID : Word`, rejects stale or invalid
source/target values, replaces only that field, and preserves GIT, GIC, and IFO
byte-for-byte.

Frontend HTTP validation, scene mapping, workspace parsing, properties facade,
Advanced-tab raw Word control, persisted source/target separation, and export
transport carry the same `0..65535` contract. The control is disabled when the
exact native field is missing or ambiguous, and it reports that effective
`loadscreens.2da` label resolution is unavailable instead of inventing a
display name.

Accepted bounded evidence is 610/610 backend unit assertions across seven
suites, 25/25 Area Update atomic-publication assertions, 216/216 frontend unit
assertions across seven suites, 1/1 dedicated frontend regression smoke, 12/12
capability-catalog assertions, and passing backend/frontend production builds.
No runtime service, browser capture, Toolset, or NWN process was started or
stopped by this lane.

`properties_advanced_flags` remains `verified/partial/blocked`. Revision
`2026-08-24.24` removes the obsolete loading-screen preserve-only blocker but
does not change the 79-row totals: 48 implemented, 27 partial, 0 preserve-only,
4 not-started; release remains 38 available, 36 blocked, and 5 hidden. Area
variables, other unverified controls, the effective `loadscreens` catalog,
browser proof, Toolset Save/Build/reopen, and NWN behavior remain explicit
blockers.
