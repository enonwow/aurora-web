# Aurora decompilation lineage manifest contract v1

Date: 2026-08-17

## Purpose

This contract separates an integrity inventory from an authoritative,
reproducible decompilation lineage. Matching export hashes alone never bind an
export to a candidate executable or to a particular decompiler session.

## Modes

### `audit-legacy`

This mode hashes an existing export directory and, optionally, a candidate
input binary. It always emits:

- `status=blocked_unbound_legacy_export`;
- `lineageBound=false`;
- `authoritativeDecompilationClaim=false`;
- a complete `missingLineageFields` list;
- `candidate_only_not_proven_generator_input` on the candidate binary;
- deterministic per-output SHA-256 and byte counts.

The command exits non-zero because the resulting packet is an explicit blocker,
not a lineage promotion.

### `bind-session` (legacy/untrusted after v2)

This mode records a completed decompiler session. It requires the exact input
binary, session id, tool/version, project/database snapshot, loader, language,
image base, relocation policy, analyzer configuration, exact invocation log,
failure ledger, call graph, export script set, and complete function/decompile
coverage counts. Every file is hashed while the manifest is built.

The sum of successful and failed decompilations must equal the discovered
function count. Missing or inconsistent metadata fails closed without a raw
filesystem stack trace.

## Output contract

The schema id is `aurora-decompilation-lineage/v1`. A newly generated bound
packet has `status=bound_complete_legacy_untrusted`, `lineageBound=true`, and
`authoritativeDecompilationClaim=false`. Historical v1 packets containing
`true` are self-attestations and are not authority after the v2 migration. A
bound v1 inventory includes:

- immutable input identity;
- decompiler and project identity;
- import/analysis profile;
- generation evidence and script hashes;
- coverage counts and call-graph hash;
- sorted per-output hashes;
- a deterministic record digest.

`generatedAt` is an explicit input in reproducible/CI workflows. The manifest
does not run Ghidra and cannot retroactively prove how a legacy export was
created; it only validates and records evidence supplied by the export session.

Only an independent `aurora-decompilation-lineage-validation/v2` result may
assert decompilation lineage authority.
