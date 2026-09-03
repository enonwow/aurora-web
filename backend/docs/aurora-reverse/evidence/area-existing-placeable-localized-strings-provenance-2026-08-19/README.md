# Existing Placeable localized-string storage provenance — offline evidence

Date: 2026-08-19

Status: `OFFLINE_READ_ONLY_PROVENANCE_VERIFIED`

This packet closes the lossless read path for native type-`9` GIT Placeable
`LocName` and `Description`. The backend retains exact absent versus present
storage, unsigned `strRef`, ordered unsigned language identifiers, duplicate
and empty entries, and opaque text bytes encoded as canonical base64. The
frontend validates the exact shape, deep-clones it into immutable source
metadata, and does not materialize an editable target.

The implementation additionally prevents a `CExoLocString` payload from
crossing the native GFF `fieldData` section boundary. Existing process-cache
keys for objects without this new provenance remain unchanged.

Dedicated mutation gates passed at 100%: backend 82 killed and frontend 147
killed, with zero survivors, uncovered mutants, timeouts, or errors. Full
backend unit (3741/3741), frontend unit (2705/2705), frontend regression
(78/78), both production builds, and both static Area proof-safety contracts
passed. Backend e2e remains 111/113 because two unrelated Runtime Settings
texture-index tests receive HTTP 422 instead of their expected 200.

This is not text-editing completion. `Name` and localized `Description` remain
disabled/preserve-only until native code-page/TLK/language semantics are
source-closed and an exact writer/readback lane exists. No Toolset or NWN
runtime claim is made by this packet.

Machine-readable counts, report hashes, and blockers are in
`offline-verification-summary.json`.
