# Aurora Toolset skill consistency audit — 2026-07-19

Status: `VERIFIED / NON-LIVE`

## Scope

This audit reviewed the shared `aurora-toolset-operate`,
`aurora-toolset-author`, and `aurora-toolset-prove` skills, their routing
references, and the canonical operating standard. No Toolset or NWN action was
performed.

## Findings corrected

1. The proof skill and routing references still directed consuming projects to
   a project-local approved adapter when `aurora-web` was `reference-only`.
   That contradicted the shared operating contract and made agents stop at a
   fictional adapter gate.
2. The canonical standard retained the same obsolete project-local-adapter
   wording beside the newer shared-tooling rule.
3. The suite references declared `1.0.1` after the shared contract had changed.

## Current contract

- Product `reference-only` boundaries cover product code, assets, fixtures,
  product validators, and runtime dependencies only.
- Shared Aurora skills, canonical runners, and verified native atoms are
  central operator tooling and are used directly.
- Agents must not create, qualify, require, or substitute a project-local
  Toolset, proof, or UI adapter.
- The skill-suite contract is `1.0.3`; runner versions are independent and are
  validated through their declared contract tests.

## Validation

- `quick_validate.py` passed for all three shared skills.
- The installed skill junction contents match the canonical sources.
- Static checks found no retired `approved project-owned adapter` policy in the
  skill suite or operating standard.
- `node --test backend/scripts/test-aurora-toolset-module-proof-runner-contract.mjs backend/scripts/test-run-aurora-toolset-module-proof-dry-run.mjs`
  passed: 2 tests, 0 failures.

## Remaining boundary

This audit validates operating-policy consistency only. It does not claim a
Toolset viewport proof, a module mutation, or an NWN runtime proof.

## Follow-up scope correction

The skill bodies were narrowed after review. Repository commands belong in
routing references, not in Aurora operation instructions. The authoring skill
no longer permits creating a narrow local adapter or requires generic CLI
design; a missing central atom is a precise live-lane gap. The skills retain
only Aurora behavior, safety, proof, and continuity policy in their executable
workflow.

## M0 profile and runtime audit

The central fast module runner is a fixed M6 profile: one HAK and one creature.
Its configurable CLI fields do not authorize the Meshy M0 route. No central M0
profile currently declares all of the following:

- the accepted module policy (`m2a_m0_proof.mod` versus a disposable module)
  and approved module hash;
- ordered `znd_tortoise`, `m2a_m0_proof` HAK identities and hashes;
- `c_tortoise` positive-control and M0 fixture rows, positions, and appearance
  identities;
- target `TScrollBox` capture, artifact ownership, and validator;
- a central AUR-S07 Test Module/runtime atom or a validated user-provided
  runtime-capture ingestion schema.

The central `m0-static-rigid-v5` profile is now registered in the canonical
session manager. Its immutable M0 route has an exact one-Area queue, mandatory
caller-owned artifact destination, exact `TScrollBox` capture, Toolset packet
validator, profile preflight, and dry-run/negative contract tests. The runtime
ingestion validator remains user-provided evidence ingestion only. M0 Toolset
and runtime evidence remain `missing` until fresh artifacts pass those
contracts. A consuming project must not implement a local substitute.

The fast runner's visual stage now calls the existing target-viewport capture
atom instead of the retired full-frame helper that changed window z-order. This
change passed syntax, contract, and dry-run tests only; it is not live proof.
