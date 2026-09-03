# Aurora decompilation lineage contract v2

Date: 2026-08-17

## Authority model

`aurora-decompilation-lineage/v2` separates two artifacts:

1. a raw producer packet created from one completed/interrupted Ghidra export
   session; and
2. an independent validator result that recomputes identities, counts, graph
   references, and output hashes.

The raw producer packet always contains
`authoritativeDecompilationClaim=false`. Only a v2 validator result may contain
`authoritativeDecompilationClaim=true`. A v1 packet is legacy/untrusted input
and can never be promoted by the v2 validator.

`lineageComplete` and `decompilationCoverageComplete` are independent:

- lineage is complete when every required identity and cross-reference is
  internally consistent and reproducible;
- coverage is complete only when every discovered function has one successful
  decompile record and the failure ledger is empty.

A lineage-complete session with declared failures may be authoritative lineage
while `authoritativeCompleteDecompilationClaim` remains false.

## Portable packet root

Every admitted file must be a regular file below one explicit packet root.
Records store a normalized root-relative `portablePath`, byte length, and
SHA-256. Absolute paths may appear only as `hostPathDiagnostic`; they are
excluded from portable digests and authority decisions.

Relocating an otherwise identical packet root must preserve the producer and
validator portable record digests.

## Required producer inputs

The producer inventories:

- exact input PE binary;
- exact Ghidra distribution/build file;
- exact project/database snapshot;
- analyzer configuration;
- Ghidra-created session attestation;
- exact headless invocation log;
- one or more exporter scripts;
- function-record JSONL;
- failure-ledger JSON;
- call-graph JSONL;
- complete export output directory.

The producer derives all coverage totals from function records. It accepts no
function-count, success-count, failure-count, graph-count, or authority CLI
arguments.

## Session attestation

The attestation schema is
`aurora-ghidra-decompilation-session-attestation/v1`. It binds one `sessionId`
to:

- input binary SHA-256 and derived PE identity;
- Ghidra name, version, build, and distribution SHA-256;
- project id and snapshot SHA-256;
- loader, language, image base, relocation policy, and analyzer config hash;
- invocation log hash and sorted exporter-script hashes;
- function-record, failure-ledger, call-graph hashes, and sorted export-output
  path/hash inventory;
- `completionMarker`, either `ghidra-export-complete` or `interrupted`.

An interrupted session is resumable but cannot produce complete lineage.

The canonical Ghidra-side implementation is
`backend/scripts/ghidra/ExportAuroraDecompilationLineageV2.java`. It runs as a
post-script after analysis, derives function/failure/graph records from the
loaded program, writes the session attestation last, and verifies that the
executing script bytes match the exporter copy admitted to the packet. Its
headless preparation and invocation contract is documented in
`backend/scripts/ghidra/README.md`.

For resource-bounded research, the same exporter accepts an optional canonical
comma-separated `--target-addresses` set. Targeting does not narrow lineage:
the exporter still inventories every discovered function and the complete
in-program call graph. It decompiles only the selected addresses, records every
other discovered function as `decompiler_not_targeted`, and binds the sorted
selection into the session attestation. The independent validator rejects an
unknown target, a selected function mislabeled as not targeted, or any
non-target function represented as a successful/ordinary failure record.
Consequently a valid targeted session may establish authoritative lineage while
remaining explicitly incomplete in decompilation coverage. Concrete addresses
select proof scope only; they do not select Aurora Web runtime behavior.

## Function, failure, graph, and output records

Each non-empty function JSONL line has the same `sessionId`, a unique
`functionId`, canonical hexadecimal address, non-empty name, and exactly one
status:

- `success`: requires an export-root-relative output path and matching output
  SHA-256;
- `failure`: requires a stable failure reason code and no successful output.

In a targeted session, `decompiler_not_targeted` is the only permitted record
for a non-selected function. A selected function must carry its actual
decompilation success or failure result.

The failure ledger contains exactly the failed function identities from the
same session, once each. Call-graph edges use the same session and may only
reference discovered function identities. Duplicate functions or edges are
invalid. Every success output must be present in the export inventory and must
match after validation.

## PE and analysis identity

The validator derives DOS/PE signature, machine, timestamp, optional-header
magic, image base, and PE32/PE32+ class directly from binary bytes. Text or an
arbitrary regular file is not an input binary. The attested image base and
Ghidra language width must agree with derived PE identity; the loader must
identify Portable Executable input.

## Validator failure rules

Validation fails closed for:

- v1 or unknown schema input;
- missing/non-regular/out-of-root files;
- malformed JSON/JSONL;
- input, tool, project, analyzer, invocation, exporter, or output hash drift;
- cross-session records;
- duplicate/missing function identities;
- failure-ledger mismatch;
- unknown graph nodes or duplicate graph edges;
- record totals differing from derived records;
- output tampering;
- incomplete producer marker;
- producer packets that already assert authority.

The validator emits stable diagnostics and blocker/resume information without
raw filesystem or parser stacks.

## Digest rules

Both packet types carry a SHA-256 over canonical JSON with object keys sorted.
The digest excludes:

- `generatedAt`;
- `hostPathDiagnostic`;
- the digest field itself;
- validator output path.

Arrays whose order is not semantic are sorted before digesting. Identical
session bytes and records therefore produce identical digests across time and
packet-root relocation.

## Migration from v1

`audit-legacy` v1 remains a useful hash inventory. `bind-session` v1 is now
explicitly legacy/untrusted and must set
`authoritativeDecompilationClaim=false`. Existing v1 files that contain `true`
are historical self-attestations, not validator authority.
