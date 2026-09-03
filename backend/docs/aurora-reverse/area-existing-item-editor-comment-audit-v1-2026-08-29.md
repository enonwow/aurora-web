# Existing Area ground-item editor Comment audit v1

Date: 2026-08-29  
Status: offline implementation verified; live certification pending  
Scope: exact retained ground-item `Comment : CExoString` read and compare-and-swap mutation in the ordinal-paired GIC `List`

## Decision

Aurora Web may expose and mutate an existing ground item's editor comment only
when the source Area contains one exact ordinal-paired GIT/GIC item record:

- root list label `List` in both resources;
- item struct type `0` in both resources;
- identical GIT and GIC item-list cardinality;
- exactly one GIC `Comment : CExoString` on the matching immutable ordinal;
- a string containing at most 4,096 UTF-16 code units and no NUL code unit.

The value is preserved exactly. Whitespace is significant and is never
trimmed, normalized, or synthesized. A missing, duplicated, mistyped,
over-budget, NUL-bearing, unpaired, or wrong-family field remains
`PRESERVE_ONLY`; it must not create editable provenance.

## Primary Aurora authority

The primary source is the frozen Aurora Toolset decompilation
`C:/Projects/New Folder/export/decompiled_all.c`, SHA-256
`36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572`.

The retained ground-item reader `FUN_006077a8`:

- admits the paired GIC path only when both GIC arguments are present at
  lines 301542-301543;
- requests label `Comment` through `FUN_00aef090` at lines 301544-301545;
- stores the resulting `CExoString` in the ground-item object member rooted at
  `param_1 + 0x26` (byte offset `0x98`).

The retained ground-item writer `FUN_00607ccc`:

- writes the five GIT placement floats at lines 301632-301649;
- admits the paired GIC path only when both paired arguments exist at line
  301650;
- writes `param_1 + 0x98` under label `Comment` through `FUN_00af0084` at line
  301651;
- resumes the common item GIT writer at line 301653.

The Area family audit independently binds ground items to the five-character
root label `List` and GIT/GIC struct type `0`. The construction audit is
`area-item-construction-audit-v1-2026-08-13.md`. No xoreos or other GPL source
was consulted.

## Additive contract v1

Area-detail readback may add `itemMetadata.editorComment` only for an admitted
exact source field. The frontend detaches it into immutable scene provenance
`source.itemEditorComment`; editable `itemProperties.comments` must equal that
source value before a retained edit is enabled.

A changed retained item projects one existing-object property mutation:

```text
{
  kind: "item",
  sourceIndex: <immutable item ordinal>,
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

The mutation replaces only the matching GIC `Comment` value. GIT, ARE, and IFO
must remain byte-identical for a comment-only update. Existing API-v1
authorization, permission, approved-token, request/object/property budgets,
optimistic concurrency, idempotency, fencing, journal, rollback, recovery,
atomic ARE/GIT/GIC/IFO publication, persisted readback, and receipt contracts
remain unchanged.

## Diagnosability and proof

Routine diagnostics use only bounded family, ordinal, stage, result-code, and
mutation-count labels. They must not record comment contents. Candidate and
persisted readback must verify the exact target string and unchanged sibling
resources before success is reported.

Required automated evidence is parser admission/rejection, projector and
planner compare-and-swap tests, paired-writer mutation/readback/determinism
tests, frontend mapping/provenance/draft/UI regression coverage, and both
compiler gates. Fresh guarded browser Save/reopen plus Toolset Save/Build/reopen
and NWN runtime evidence remain separate product-certification gates; they are
not implied by this offline audit.

## Offline implementation evidence

The bounded implementation is present across the Area parser, immutable draft
projection, existing-object planner, paired GIT/GIC writer, HTTP adapter,
scene mapper, workspace draft validation, detached provenance helper, Item
property dialog, Apply/Cancel reconciliation, and local Save/reopen regression.

Sequential verification under the repository's unchanged 1 GiB Node ceiling
passes:

- `2,044/2,044` focused backend parser/projector/planner/writer/domain tests;
- `703/703` focused frontend boundary/domain/dialog/workspace/regression tests;
- `13/13` capability-catalog assertions;
- backend application build; and
- frontend application typecheck.

The Item regression specifically proves that exact multiline whitespace and
code units survive `Apply -> Cancel -> reopen -> Save`, while immutable source
provenance remains the original exact value. The reconciliation fix advances
the dialog's cancel snapshot only after the live Item reaches the applied
draft, so a later unapplied edit is discarded without undoing the prior Apply.

## Resource-safety note

This source-closure pass used no Docker command, service, watcher, browser,
capture, Toolset/NWN control, mutation testing, or GPL source. Live proof is
intentionally deferred to an isolated repository-wide capture window.
