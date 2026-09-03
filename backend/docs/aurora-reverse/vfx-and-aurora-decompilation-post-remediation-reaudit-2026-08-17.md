# VFX and Aurora decompilation post-remediation re-audit - 2026-08-17

## Executive verdict

This re-audit confirms that the repository-local VFX remediation is effective:
the complete VFX-named frontend unit set passes `12/12` files and `339/339`
tests, the backend VFX set passes `19/19` suites and `335/335` tests, and the
seven-command local diagnostic aggregate passes all eleven runtime cases.

The release and authority verdicts remain separate:

- **local source-backed VFX:** PASS for the current repository contracts;
- **Aurora/NWN retail VFX parity:** NO-GO, proof completeness `missing`;
- **authoritative reproducible Aurora decompilation:** NO-GO;
- **whole repository release baseline:** NO-GO.

No Toolset, NWN, or browser parity capture was run. There is no versioned live
proof profile backed by ingestible retail fixture packs for this snapshot, so a
live run could not produce accepted proof under the proof-capture safety
contract. For both Toolset and NWN, `modelVisibility=not_tested` and
`proofCompleteness=missing`.

## Snapshot and evidence boundary

- Repository: `C:\Projects\aurora-web`
- Branch: `codex/vfx-row216-aurora-first-20260812`
- HEAD: `348e8ff0e27677b7c611c56afa4d706685b393f0`
- Effective working tree: dirty, 1,219 porcelain entries at audit start
- Previous audit checkpoint: same HEAD, 1,174 porcelain entries
- Audit date: 2026-08-17

The 45-entry increase without a revision change means results describe the
effective local filesystem, not a reproducible committed revision. Findings
cannot be attributed to HEAD versus uncommitted work without a clean,
hash-bound snapshot.

Evidence classes:

- **confirmed repository:** inspected source, tests, contracts, or freshly
  generated repository gate output;
- **local-only:** present on this workstation but not reproducible from HEAD;
- **inference:** a conclusion from inspected control flow without a retail or
  native observation;
- **missing:** a required artifact, binding, or live observation does not
  exist.

## Change against the first audit

| First-audit finding | Re-audit state | Verdict |
| --- | --- | --- |
| Standalone VFX renderer tests red | Full VFX-named frontend set is `339/339` | Closed locally |
| P2P local diagnostic red | Aggregate is 7/7 commands and 11/11 runtime cases | Closed locally |
| Four gates crash on raw `ENOENT` | All four emit structured prerequisite blockers | Crash defect closed |
| Renderer eligibility overloaded with retail parity | Independent v1 fields are emitted, normalized, rendered, displayed, and tested | Closed locally |
| Matrix says VFX `NOT_STARTED` | Matrix now says `PARTIAL_SOURCE_BACKED_RETAIL_BLOCKED` | Closed |
| No decompilation lineage mechanism | Contract, generator, tests, and legacy inventory exist | Infrastructure added; authority still missing |
| Legacy xoreos records violate current policy | Records are explicitly quarantined and unadmitted | Mitigated, not re-admitted |
| Ten retail packs absent/placeholder | Still five missing and five placeholder | Open P0 |
| No accepted fresh Toolset/NWN proof | Still absent | Open P0 |
| Oversized coupled modules | Every measured core file grew | Regressed |

## Confirmed strengths

1. The backend emits `rendererEligibility=source_backed` independently from
   `retailParityStatus=blocked`; the frontend no longer infers retail proof
   from the legacy `canonicalStatus` label.
2. Local preview payloads remain `preview_only` and retail-blocked.
3. Retail validation remains fail-closed: no fixture is promoted and no
   missing evidence is synthesized.
4. The local diagnostic aggregate is deterministic and freshly green.
5. The legacy decompilation inventory is reproducible: a fresh
   `audit-legacy` run produced the tracked record digest
   `8ce7917e85b44f42eeef74138957a94d022aa1334a946d0811d746e263b11d3a`
   and the same six output hashes.
6. The current legacy manifest correctly says
   `blocked_unbound_legacy_export`, `lineageBound=false`, and
   `authoritativeDecompilationClaim=false`.
7. Backend compilation and all backend unit tests pass in an isolated serial
   run.

## Findings

### P0-1 - Retail evidence and accepted live proof are still missing

Fresh evidence-pack inspection reports:

- manifest fixtures: 10;
- existing pack directories: 5;
- missing pack directories: 5;
- placeholder packs: 5;
- ingestible packs: 0;
- blocked fixtures: 10;
- canonical promotion attempts: 0.

The strict parity validator independently reports `0/10` canonical allowed and
`10/10` blocked. Every fixture is missing retail build, parser snapshot,
resolver trace, runtime tick dump, render-contract snapshot, capture reference,
and comparison evidence.

Local diagnostic images and semantic checks are useful regression evidence,
but they are explicitly local-only. They cannot replace the exact fresh
Toolset/NWN and Web capture pair required by the proof-capture safety contract.

**Closure gate:** ingest all ten exact candidate-bound retail packs, settle the
`aurora-vfx-runtime-observability/v1` contracts, capture through the approved
exact hook, visually inspect the artifacts, and pass the retail validator with
no placeholders or unexpected failed/fallback lanes.

### P0-2 - The current Aurora decompiler export remains unbound

The six local export files are byte-stable, but the tracked lineage manifest
has no candidate input and still lists eighteen missing lineage fields. No
fresh Ghidra session binds the export to an exact `nwtoolset.exe`, project
database, analysis configuration, scripts, logs, failure ledger, or call
graph.

The stable hashes prove current output identity only. They do not prove that
the files were generated from the installed executable or that the operation
is reproducible.

**Closure gate:** perform a fresh decompilation from a hash-locked input through
an authoritative producer, retain the project snapshot and exact invocation,
then validate the complete session packet before using any output as binary
authority.

### P1-1 - `bind-session` can self-certify semantically unrelated files

`create-aurora-decompilation-lineage-manifest.mjs` requires regular files and
hashes them, but it does not parse or cross-check the analyzer configuration,
invocation log, failure ledger, call graph, project snapshot, or export script.
It accepts caller-supplied coverage integers and sets all of the following
solely from argument presence and one arithmetic equality:

- `status=bound_complete`;
- `lineageBound=true`;
- `authoritativeDecompilationClaim=true`;
- `coverage.complete=true`.

The current unit test demonstrates the weakness by passing arbitrary text as a
project snapshot, analyzer configuration, invocation log, call graph, failure
ledger, and Java export script. No assertion binds failure-ledger entries to
`decompileFailure`, call-graph nodes to discovered functions, or invocation
content to the input/tool/session identity.

The current legacy packet is safe because it uses `audit-legacy`; the risk is a
future false promotion through `bind-session`.

**Closure gate:** make the Ghidra-side exporter produce a schema-versioned,
session-bound attestation; validate each evidence schema and cross-reference,
derive coverage from exported records rather than CLI counts, and reserve
`authoritativeDecompilationClaim=true` for a validator-accepted producer packet.

### P1-2 - Structured retail blockers are not yet bootstrappable

The raw `ENOENT` defect is fixed, but the advertised recovery graph does not
reliably create the exact files consumed by downstream gates:

1. blocker freshness requires
   `artifacts/vfx-iteration-215/vfx-retail-evidence-pack-dry-run.json`, while
   `npm run test:vfx:retail-evidence-packs` writes iteration `90` by default;
2. runtime crosscheck requires
   `artifacts/vfx-iteration-223/vfx-worker-directive-completion-alignment-current.json`,
   while `npm run test:vfx:worker-directive-alignment` writes iteration `216`
   without the `-current` suffix;
3. coordinator and director prerequisites have no executable producer command;
4. the reported `generationOrder` is array order, not a validated dependency
   topology; and
5. prerequisite admission checks existence only. A directory or malformed
   JSON can pass the precheck and fail later in raw `readFileSync`/`JSON.parse`.

Fresh gate results are correctly non-zero but remain blocked:

| Gate | Missing prerequisites |
| --- | ---: |
| Retail capture setup | 2 |
| Retail blocker freshness | 5 |
| Runtime-health retail crosscheck | 10 |
| Worker-directive alignment | 1 |

**Closure gate:** define one canonical producer registry with exact output
paths and schemas, topologically validate the generation plan, run each
producer with explicit `--out`, and add negative tests for directories,
malformed JSON/JSONL, schema mismatch, stale hashes, and producer-output path
drift.

### P1-3 - The effective repository snapshot is not release-green

Fresh results:

- backend build: pass;
- backend unit: `212/212` suites and `2835/2835` tests pass;
- backend e2e: `9/10` suites and `111/113` tests pass; two runtime-settings
  texture-index/rebuild requests return `422` instead of `200`;
- frontend build: fail because `PLACEABLE_TRAP_TYPE_OPTIONS` is imported but
  unused at `WorkspaceCanvasViewport.tsx:158`;
- frontend unit: `203/209` files and `2085/2139` tests pass; 54 failures remain
  in six non-VFX files;
- frontend regression smoke: `1/10` files and `20/78` tests pass; 58 failures
  remain.

All twelve VFX-named frontend unit files are green, so these failures do not
invalidate the local VFX subset. They do prevent a release-quality or
repository-complete claim.

### P2-1 - The audit snapshot is still not revision-bound

The branch and HEAD are unchanged from the first audit while porcelain entries
increased from 1,174 to 1,219. Generated reports, implementation changes, and
unrelated work coexist in one dirty tree. A later audit cannot reproduce this
exact state from Git.

**Closure gate:** create a dedicated branch/commit or immutable tree bundle,
record the tree hash, and regenerate all reports against it.

### P2-2 - Core VFX and catalog surfaces continued to grow

| File | First audit | Re-audit | Delta |
| --- | ---: | ---: | ---: |
| `workspaceObjectMeshLayer.ts` | 21,712 | 22,488 | +776 |
| `catalog.application.service.ts` | 18,051 | 19,420 | +1,369 |
| `auroraVfxCanonicalRenderer.ts` | 5,757 | 6,000 | +243 |
| `aurora-mdl-vfx-source.parser.ts` | 5,219 | 5,477 | +258 |
| `aurora-vfx-runtime-state.ts` | 3,293 | 3,473 | +180 |
| `vfx.application.service.ts` | 2,907 | 3,015 | +108 |

This increases regression isolation cost and conflicts with the repository's
bounded-responsibility and shared-logic rules.

**Closure gate:** extract payload packaging, eligibility/parity normalization,
runtime family state, render-lane assembly, and control-gate schema validation
behind narrow contracts, preserving the current green focused tests.

### P3-1 - xoreos legacy observations are quarantined, not repaired

The global quarantine prevents retained mutable/local xoreos references from
being used as authority. This is safe for current implementation work, but the
individual observations still lack immutable commit records and independent
confirmation.

**Closure gate:** either remove each legacy observation or create a compliant
immutable secondary-source record before re-admission. Quarantine must remain
active until then.

## Verification record

| Check | Fresh result |
| --- | --- |
| Frontend VFX-named unit set | PASS, 12 files / 339 tests |
| Backend VFX-named unit set | PASS, 19 suites / 335 tests |
| Local VFX diagnostic aggregate | PASS, 7 commands / 11 runtime cases |
| Retail evidence-pack inspection | BLOCKED safely, 0/10 ingestible |
| Strict retail parity validator | Expected non-zero, 0/10 allowed |
| Four control gates | Expected non-zero structured blockers, no raw `ENOENT` |
| Decompilation lineage unit | PASS, 3/3 |
| Fresh legacy export inventory | Expected non-zero blocker; digest and six hashes match |
| Backend build | PASS |
| Backend unit | PASS, 212 suites / 2,835 tests |
| Backend e2e | FAIL, 1 suite / 2 tests |
| Frontend build | FAIL, unused import |
| Frontend unit | FAIL, 6 files / 54 tests |
| Frontend regression smoke | FAIL, 9 files / 58 tests |
| Accepted Toolset/NWN/Web parity capture | MISSING / not run |

Fresh generated evidence used by this audit:

- `backend/docs/aurora-reverse/artifacts/vfx-iteration-89/vfx-local-diagnostic-gate-report.json`;
- `backend/docs/aurora-reverse/artifacts/vfx-iteration-90/vfx-retail-evidence-pack-dry-run.json`;
- `backend/docs/aurora-reverse/artifacts/vfx-iteration-217/vfx-retail-capture-setup-validation-packet.json`;
- `backend/docs/aurora-reverse/artifacts/vfx-iteration-215/vfx-retail-blocker-packet-freshness-check.json`;
- `backend/docs/aurora-reverse/artifacts/vfx-iteration-224/vfx-runtime-health-retail-blocker-crosscheck.json`;
- `backend/docs/aurora-reverse/artifacts/vfx-iteration-216/vfx-worker-directive-completion-alignment.json`;
- `backend/docs/aurora-reverse/evidence/decompilation-lineage/legacy-toolset-export-audit-2026-08-17.json`.

## Ordered remediation

The executable phase plan and milestone-specific completion criteria are
defined in
`vfx-decompilation-remediation-implementation-plan-v1-2026-08-17.md`.

1. Freeze an immutable tree-bound snapshot and make the ordinary build/test
   baseline green.
2. Repair the prerequisite producer registry, exact output paths, and schema
   validation; prove a fresh checkout can advance each control gate to its
   semantic blocker.
3. Harden `bind-session` with producer-side attestation and cross-schema
   validation before permitting an authoritative claim.
4. Perform and bind a real decompilation session from the exact input binary.
5. Produce all ten non-placeholder retail evidence packs.
6. Run exact fresh Toolset/NWN and Web capture/inspection/validation under the
   approved proof profile.
7. Refactor the growing monoliths without changing the now-green local VFX
   behavior.

## Final comparison statement

Aurora Web now has a green, source-backed local VFX implementation with a
meaningful separation between renderer eligibility and retail parity. It does
not yet have retail VFX parity, accepted live visual proof, or an authoritative
reproducible Aurora decompilation. The newly added fail-closed infrastructure
is directionally correct, but its producer-path graph and decompilation
authority admission require another hardening pass before they can support a
promotion claim.
