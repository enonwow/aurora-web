# VFX and Aurora decompilation remediation implementation status

Date: 2026-08-17

## Outcome

The repository-local portion of the remediation is implemented. The VFX
artifact control plane is registry-driven and fail-closed, decompilation
lineage v2 no longer accepts caller-entered authority or coverage counts, a
Ghidra-side exporter exists for producing the required immutable session
records, and two high-value VFX/catalog responsibilities have been extracted
behind explicit boundaries.

This is not a retail-parity or complete-decompilation completion claim. The
highest locally demonstrated milestone is M2, local VFX implementation. M1 is
still blocked by unrelated baseline failures, while M3 through M7 require
external retail inputs, a real Ghidra session, accepted Toolset/NWN/Web proof,
or additional refactoring.

## Immutable starting point

The dirty shared worktree was preserved through an alternate-index snapshot:

- tree: `2aad1a40a0c02f5e4cfaebc83c04876e18d53005`;
- synthetic snapshot commit: `6dac86a7843761dff28a1cbd89b182f9eb79eff7`;
- local snapshot ref:
  `refs/codex/snapshots/vfx-decomp-remediation-20260817`;
- manifest:
  `evidence/implementation-snapshots/vfx-decomp-remediation-preimplementation-2026-08-17.json`.

The Phase-0 clean-worktree criterion is intentionally not claimed. Existing
user work was not reset, checked out, or moved.

## Implemented work

### 1. Registry-driven VFX control plane

Added the versioned registry contract and registry for 20 artifacts and four
current control gates:

- `aurora-vfx-artifact-producer-registry-contract-v1-2026-08-17.md`;
- `vfx-artifact-producer-registry-v1.json`;
- `scripts/lib/vfx-artifact-producer-registry.mjs`;
- `scripts/validate-vfx-artifact-producer-registry.mjs`;
- `scripts/bootstrap-vfx-control-plane.mjs`.

The registry validates stable ids, exact output paths, unique ownership,
dependency references, topological order, cycles, schema/version checks,
regular files, JSON/JSONL parsing, and freshness metadata. Four prerequisite
consumers now resolve their inputs through the registry rather than duplicate
path arrays. Known iteration path drift was corrected from 90 to 215, 214 to
215, and 216 to 223.

Execution mode stops at the first failed producer or semantic blocker. Dry-run
mode still describes the entire graph. External director/coordinator products
are explicit ingestion roots, so their absence is reported as
`blocked_external_ingestion`, not as an infrastructure or guessed-semantics
failure. Promotion remains false.

Stable package commands now include:

```text
npm.cmd run vfx:control-plane:validate
npm.cmd run vfx:control-plane:bootstrap -- --dry-run
npm.cmd run test:vfx:unit
```

### 2. Aurora decompilation lineage v2

Added:

- `aurora-decompilation-lineage-contract-v2-2026-08-17.md`;
- `scripts/lib/aurora-decompilation-lineage-v2.mjs`;
- `scripts/create-aurora-decompilation-lineage-v2-packet.mjs`;
- `scripts/validate-aurora-decompilation-lineage-v2.mjs`.

The repository producer admits an immutable Ghidra export and derives the
packet inventory. The independent validator recomputes hashes, function
coverage, failure-ledger membership, graph membership, session identity, and
portable record identity. Only validator output can set
`authoritativeDecompilationClaim=true`. Lineage completeness and decompilation
coverage completeness are separate states.

Lineage v1 remains readable only as
`bound_complete_legacy_untrusted`; it cannot mint authority.

### 3. Ghidra-side lineage exporter

Added:

- `scripts/ghidra/ExportAuroraDecompilationLineageV2.java`;
- `scripts/ghidra/README.md`;
- `test/unit/aurora-ghidra-lineage-exporter-contract.spec.ts`.

The script verifies the admitted exporter hash, input PE hash and identity,
project/tool/analyzer settings, export-root boundaries, and session arguments.
It enumerates functions from Ghidra, decompiles each function, records stable
failure reasons, exports per-function records and C output, derives call-graph
edges, hashes the output inventory, and writes the completion attestation last.
It never accepts caller-supplied function totals or emits an authority flag.

No Ghidra installation or Ghidra Java classpath was available on this host.
The source contract tests pass and plain `javac` reached only the expected
missing-Ghidra-package errors, but no real Ghidra compilation or execution is
claimed. Phase 5 remains blocked until the script is run in one exact admitted
Ghidra distribution against one exact Aurora binary and the resulting packet
passes the separate v2 validator.

### 4. Explicit VFX/catalog boundaries

Backend packaging and provenance were extracted to:

- `src/modules/catalog/application/catalog-vfx-runtime-packaging.ts`;
- `test/unit/catalog-vfx-runtime-packaging.spec.ts`.

The new `PlaceableVfxRuntimePackagingPort` and facade own emitter material
packaging, source-emitter selection, MDL conversion, payload creation, source
candidates, and resource traces. The catalog application service delegates to
this boundary while retaining the existing compatibility export.

Frontend claim-state normalization was extracted to:

- `frontend/src/modules/scene/domain/auroraVfxClaimState.ts`;
- `frontend/tests/unit/modules/scene/domain/auroraVfxClaimState.test.ts`.

The canonical renderer and Placeables inspector use the same normalized
eligibility/parity state. Source-backed rendering remains independent from
retail-parity promotion.

These are two of the seven required Phase-4 boundaries. The catalog service
shrank from 19,420 to 19,136 lines and the canonical renderer from 6,000 to
5,992 lines. The new boundary modules contain 334 and 44 lines respectively.
The required seven boundaries and 20% combined monolith reduction are not yet
complete.

## Verification result

### Passing scoped gates

- backend production build: pass;
- frontend production build: pass;
- backend stable VFX aggregate: 21 suites, 353 tests, all pass;
- frontend stable VFX aggregate: 13 files, 343 tests, all pass;
- catalog VFX packaging tests: 2 suites, 167 tests, all pass;
- focused registry, prerequisite, lineage, exporter, and packaging contract
  tests: pass;
- local VFX diagnostic aggregate: 7/7 commands, 11/11 runtime cases, 10/10
  threshold records, and 10/10 visual-evidence records pass; zero failed or
  canonical promotions were emitted;
- producer registry validation: 20 artifacts and four gates valid.

All four current control gates reach their intended semantic stop with no
`blocked_missing_prerequisites` result:

| Gate | State | External roots | Promotion |
| --- | --- | ---: | --- |
| retail capture setup | `blocked_external_ingestion` | 1 | false |
| blocker freshness | `blocked_external_ingestion` | 1 | false |
| worker alignment | `blocked_external_ingestion` | 1 | false |
| runtime blocker cross-check | `blocked_external_ingestion` | 4 | false |

### Known non-scoped baseline failures

- frontend full unit gate: 6 failed and 207 passed files; 53 failed and 2,118
  passed tests;
- frontend regression gate: 9 failed and 1 passed files; 58 failed and 20
  passed tests;
- backend e2e gate: 1 failed and 9 passed suites; 2 failed and 111 passed
  tests. Both failures are pre-existing `422` results in
  `runtime-settings-texture-index.e2e-spec.ts` at the assertions on lines 284
  and 384;
- the full backend unit run reached 215/216 suites and 2,963/2,964 tests, with
  only `main.bootstrap.spec.ts` timing out under concurrent build/test load.
  Its isolated rerun passed in 4.522 seconds.

These failures prevent M1 and release completion. They were not altered as
part of the VFX/decompilation remediation because they span unrelated scene,
workspace, runtime-settings, and fixture behavior in the already-dirty shared
worktree.

## Remaining blockers and work

1. Restore the full repository baseline: frontend unit/regression and backend
   e2e must reach zero failures.
2. Complete dependency-hash/sidecar freshness enforcement for older
   registry-managed artifact schemas; the registry declaration alone is not a
   universal freshness proof.
3. Run the Ghidra exporter in an admitted Ghidra installation, preserve the
   real project/session outputs, and obtain validator-accepted lineage v2.
4. Complete the remaining five Phase-4 extraction boundaries, integration
   gates, performance/bundle comparison, browser regression, and the
   20% monolith-reduction criterion.
   Mutation testing is an optional follow-up only when explicitly requested.
5. Ingest the missing external director/coordinator outputs through their
   declared contracts.
6. Produce 10/10 complete retail evidence packs.
7. Freeze an approved proof profile and run fresh, exact Toolset/NWN/Web proof
   with the required operating and proof workflows.
8. Promote parity only from strict validator output for the exact candidate.

No Toolset or NWN process was opened during this implementation. No live or
visual retail-parity proof is claimed.

## Milestone status

| Milestone | Status | Reason |
| --- | --- | --- |
| M1 repository baseline | blocked | full frontend and backend e2e gates are red |
| M2 local VFX implementation | demonstrated | scoped builds, tests, and local diagnostics pass |
| M3 retail control plane | implemented locally, semantically blocked | external ingestion roots are absent |
| M4 decompilation lineage | repository layer implemented, live session blocked | no admitted local Ghidra session or real v2 packet |
| M5 retail evidence | blocked | 10/10 accepted packs do not exist |
| M6 VFX retail parity | blocked | no accepted live Toolset/NWN/Web proof |
| M7 release | blocked | earlier milestones and full release gates are incomplete |
