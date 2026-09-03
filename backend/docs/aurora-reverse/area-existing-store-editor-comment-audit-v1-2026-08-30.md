# Existing Area Store editor Comment audit v1

Date: 2026-08-30  
Status: primary-source contract frozen; offline implementation verified; live certification pending  
Scope: exact retained Store `Comment : CExoString` read and compare-and-swap
mutation in the ordinal-paired GIC `StoreList`

## Decision

Aurora Web may expose and mutate an existing Store editor comment only when
the source Area contains one exact ordinal-paired GIT/GIC Store record:

- root list label `StoreList` in both resources;
- Store struct type `11` in both resources;
- identical GIT and GIC Store-list cardinality;
- exactly one GIC `Comment : CExoString` on the matching immutable ordinal;
- a string containing at most 4,096 UTF-16 code units and no NUL code unit.

The value is preserved exactly. Whitespace is significant and is never
trimmed, normalized, or synthesized. A missing, duplicated, mistyped,
over-budget, NUL-bearing, unpaired, or wrong-family field remains
`PRESERVE_ONLY`; it must not create editable provenance.

This slice changes only the Toolset editor comment. It does not grant authority
for Store inventory, commerce, pricing, scripts, variables, identity, or
runtime merchant behavior.

## Primary Aurora authority

The primary source is the frozen Aurora Toolset decompilation
`C:/Projects/New Folder/export/decompiled_all.c`, SHA-256
`36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572`.
The identity was re-read on 2026-08-30 before this decision.

The retained Store reader `FUN_0064188c`:

- reads the five Store placement floats at lines 333300-333309;
- admits the paired GIC path only when both paired arguments are present at
  line 333322;
- requests exact label `Comment` through `FUN_00aef090` at lines
  333323-333325;
- retains the resulting `CExoString` in the Store object member rooted at
  `param_1 + 0x98`.

The retained Store writer `FUN_00641ee0`:

- writes the five GIT placement floats at lines 333538-333555;
- admits the paired GIC path only when both paired arguments are present at
  line 333556;
- writes the same `param_1 + 0x98` value under exact label `Comment` through
  `FUN_00af0084` at line 333557;
- resumes the independent Store-property and inventory writers at lines
  333559-333560.

The paired-family audit independently binds Store instances to root label
`StoreList` and GIT/GIC struct type `11`. No xoreos or other GPL source was
consulted.

## Native packed-record authority

The read-only native module fixture is
`C:/Users/enonw/Documents/Neverwinter Nights/modules/codex_npc_item_live_20260713.mod`,
SHA-256
`2dc1f12cc27d74853e4697d7c35673fcf6e2db168f2b07b793e394556ba56ec2`.
Its identity was re-read on 2026-08-30.

The exact accepted Store readback is retained at
`evidence/area-store-construction-2026-08-13/native-toolset-instance-readback.json`.
For Area `demo`, Store ordinal `0` has:

- GIT `StoreList[0]`, struct type `11`, with native transform, identity,
  commerce, and 55 embedded inventory items;
- GIC `StoreList[0]`, struct type `11`, containing exactly
  `Comment : CExoString = "Sample Dye Store"`.

The native record independently confirms the field family, paired ordinal,
type, and exact preserved value. It does not prove an arbitrary Store
property or runtime commerce mutation.

## Additive contract v1

Area-detail readback may add `storeMetadata.editorComment` only for an
admitted exact source field. The frontend detaches it into immutable scene
provenance `source.storeEditorComment`. An editable Store comment must equal
that source value before a retained edit is enabled.

A changed retained Store projects one existing-object property mutation:

```text
{
  kind: "store",
  sourceIndex: <immutable Store ordinal>,
  editorComment: {
    expectedValue: <exact source string>,
    value: <distinct exact target string>
  }
}
```

Both values obey the 4,096-code-unit and no-NUL limits. Empty strings and
whitespace-only strings are valid. Unknown members, unchanged pairs,
duplicates, out-of-range ordinals, stale expected values, and mutation plus
deletion of the same ordinal fail closed with the existing
`422 AREA_UPDATE_OBJECT_MUTATION_INVALID` envelope.

The mutation replaces only the matching GIC `Comment` value. GIT, ARE, and
IFO must remain byte-identical for a comment-only update. Existing API-v1
authorization, permission, approved-token, request/object/property budgets,
optimistic concurrency, idempotency, fencing, journal, rollback, recovery,
atomic ARE/GIT/GIC/IFO publication, persisted readback, and receipt contracts
remain unchanged. No endpoint, binary body, chunking, streaming, or major
version is added.

## Diagnosability and proof

The additive diagnostic contract is `area_store_editor_comment_cas.v1` with
bounded operations `parse_source|plan|write|readback`, outcome, stable reason,
changed-field count, and duration. Comment contents, object identity,
ordinal, hashes, paths, source/storage keys, raw fields/bytes, credentials,
and host paths are prohibited from event fields and metric labels. A telemetry
sink failure must not affect validation, writing, transaction, rollback,
recovery, or publication.

Required automated evidence is parser admission/rejection, projector and
planner compare-and-swap validation, paired-writer mutation/readback and
preservation tests, frontend contract mapping/provenance/draft/UI regression,
and compiler/atomic-publication coverage. Product certification remains
`missing` until a fresh guarded browser Save/reopen and exact-candidate Toolset
Save/Build/reopen plus NWN runtime packet pass their independent validators.

## Offline implementation verification

The current backend implements the admitted Store Comment slice through the
Area parser, snapshot repository, draft projector, mutation planner, candidate
compiler, paired GIT/GIC writer, persisted readback, and atomic publication.
A comment-only candidate replaces exactly the ordinal-paired GIC `Comment` and
requires GIT, ARE, and IFO preservation. Existing Store commerce, inventory,
script, variable, and identity members are not projected as editable fields.

The current frontend admits `storeMetadata.editorComment` only at the HTTP
boundary, detaches it into immutable source provenance and `storeProperties`,
validates it in local drafts, and exposes one bounded Store Properties window.
That window labels the Comment subset as `ACTIVE_NOW` and all unproven Store
families as preserve-only. Apply, Cancel, OK, reopen, clone, and local-draft
paths preserve the exact admitted source/target contract. A retained Store is
a logical authoring object without a canvas mesh, so its sidebar selection,
context-menu signal, and stable Properties action are intentionally independent
of canvas render membership.

Fresh sequential frontend verification on 2026-08-30 passes `10/10` focused
files and `870/870` assertions with one Vitest worker and the repository one-GiB
heap cap. The production frontend build also passes; Vite reports only the
existing large-chunk advisory. Backend Store parser/repository/projector/
planner/compiler/writer and atomic-publication coverage remains the accepted
offline evidence for the unchanged backend implementation. This evidence does
not satisfy the guarded browser, packed-candidate, Toolset, or NWN gates.

## Resource-safety record

This contract-freezing pass used read-only decompilation and packed-module
inspection only. It started no Docker command, backend/frontend service,
watcher, browser, capture, Toolset, NWN, mutation runner, or subagent. The
installed `aurora-toolset-prove` skill contract `1.0.15` governed the evidence
classification. The operating standard's referenced
`powershell-command-runner` skill is not installed in this session, so the
smallest native PowerShell read-only workflow was used instead.
