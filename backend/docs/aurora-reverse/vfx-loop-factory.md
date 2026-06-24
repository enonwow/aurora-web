# Aurora VFX Loop Factory

Status: active autonomous loop.

Purpose: improve `aurora-web` VFX behavior toward Aurora runtime parity through small, falsifiable, evidence-graded iterations. This file is the operating protocol; `vfx-context-pack.md` is the compact working memory; `vfx-loop-state.json` is the machine-readable resume point; `vfx-claim-registry.json` tracks claims; `vfx-failed-assumptions.md` records disproven ideas; `vfx-run-log.jsonl` records each completed iteration.

## Evidence Order

1. `canonical`: requires retail/parity evidence and a passing parity gate for the exact fixture.
2. `retail-captured`: real retail build/profile, source, parser snapshot, resolver trace, runtime dump, render contract snapshot, capture reference, and comparison artifact exist, but the final gate has not promoted it.
3. `fixture-passed`: repo-side parser/gate/unit fixture passes and is scoped to its explicit claim.
4. `decomp-evidence`: Aurora decompilation export supports a fact or anchor, but not retail parity by itself.
5. `selected-source-evidence`: selected source table/profile or constants evidence supports row identity or schema facts, but not runtime behavior by itself.
6. `hypothesis`: falsifiable claim selected for the next narrow experiment.
7. `failed`: disproven by evidence or gate output.
8. `blocked`: cannot advance without retail capture, human review, or an architecture decision.

## Non-Negotiable Rules

- Never promote to `canonical` without full retail/parity evidence and a passing parity gate.
- Decompilation supports `decomp-evidence`, not `canonical`.
- GLB preview, Three.js sprites/materials, `emitter_proxy`, renderer preset `vfx-emitter`, catalog `vfxPreset`, and screenshots alone are not runtime proof.
- Do not copy decompiled Aurora code into the project. Record only facts, anchors, hypotheses, diagnostics, and evidence references.
- Missing retail capture blocks canonical parity; it does not block source/decomp/fixture/test work.
- Every failed theory goes into `vfx-failed-assumptions.md`.
- Every recurring mistake should become a fixture, diagnostic, or gate.

## Iteration Protocol

1. Rebuild context from repository docs, tests, manifests, fixtures, and Aurora export evidence.
2. Select one highest-priority narrow claim or gap.
3. Classify the claim.
4. Define what would disprove it.
5. Add the smallest useful fixture, test, diagnostic, parser snapshot, runtime dump, render contract, or implementation slice.
6. Run required backend gates:
   - `cd backend && npm run build`
   - `cd backend && npm run test:unit`
   - `cd backend && npx ts-node --transpile-only scripts/validate-vfx-retail-parity.ts`
7. Run frontend gates only if frontend files are touched:
   - `cd frontend && npm run test:unit`
   - `cd frontend && npm run test:regression`
8. Compare actual output against evidence and update all loop artifacts.
9. Continue automatically while the next step is safe.

## Current Loop State

Last completed claim: `vfx-retail-parser-snapshot-ref-object-shape` (iteration 40).

Current resume target: iteration 41, selecting another retail-capture handoff invariant or a source/decomp-only VFX claim that does not require retail access in this workspace.

Pilot status: the original row-68 pilot remains diagnostic and non-canonical. The loop now has guardrails for row-68 missing evidence, next-action ordering, comparison result semantics, status/comparison consistency, expected-diagnostic coverage, the rule that expected diagnostics are blocker metadata rather than attached evidence, retail capture handoff alignment with both the manifest fixture queue and required-case codes, capture-doc alignment with the helper's required JSON artifact list, capture-doc alignment with the gate status lifecycle, capture-doc/summary alignment with the gate evidence-key chain, runtime validation/doc coverage for behavior-claim labels, runtime validation for required-case labels, manifest-level duplicate required-case rejection, manifest-level duplicate fixture-ID rejection, manifest-level fixture-ID format validation, manifest-policy canonical evidence-chain validation, manifest-version validation, manifest-policy unknown evidence-key rejection, manifest-policy duplicate evidence-key rejection, manifest-policy canonicalRequires array-shape validation, manifest fixtures-list runtime shape validation, manifest policy-object runtime shape validation, manifest fixture-entry runtime shape validation, and parser snapshot evidence-ref runtime shape validation.

Canonical blocker: retail capture is unavailable in this workspace. The loop can continue with source, decomp, fixture, diagnostic, and gate work, but any VFX parity promotion is blocked until retail build/profile, parser snapshot, resolver trace, runtime tick dump, render contract snapshot, capture reference, comparison artifact, and a passing parity gate are supplied for the exact fixture.
