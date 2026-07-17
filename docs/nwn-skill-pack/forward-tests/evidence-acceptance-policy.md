# Forward-Test Evidence Acceptance Policy

## Purpose

Use this policy when deciding whether a prompt-forward-test record can count toward release-candidate evidence.

This file is repo-level release policy. Do not place it inside the installed skill or plugin package.

## Countable Prompt-Forward Evidence

A `prompt-forward-test` record counts toward RC only when all of these are true:

- `result` is `pass` or `partial`.
- `context` states a fresh context or clean session was used.
- `context` states no expected-answer leakage, no-answer-leak handling, or no expected references were given.
- `artifacts` includes a filled returned capture sheet path under `.codex-tmp/forward-test-return-captures/`.
- the returned capture sheet has passed `tools/check_forward_test_return_captures.py`.
- reviewer score confirms the answer includes a First Implementable Slice with files/assets touched, expected proof, rollback, and evidence limits.
- `reviewer_assertions.first_implementable_slice=true` is present, normally created with `--first-implementable-slice`.
- The record does not describe the run as contaminated.
- `partial` records have `improvement_action.needed=true`.

## Non-Countable Evidence

Do not count a prompt-forward-test record when:

- the result is `fail` or `not-run`;
- the record has no filled returned capture sheet artifact under `.codex-tmp/forward-test-return-captures/`;
- the returned capture sheet has not passed `tools/check_forward_test_return_captures.py`;
- the run saw reviewer-only material before answer capture;
- the record uses a shared context that saw previous test outputs;
- the record only says a command template exists;
- the record is a static-check or install-smoke-test.

## Coverage Rules

Coverage gates such as NUI, 2DA/HAK/TLK, runtime QA, economy/progression, and human feedback contribution must be satisfied by countable prompt-forward evidence.

Static package checks, generated handoffs, install sandbox builds, and reviewer packets do not satisfy prompt-forward coverage.

## Reviewer Workflow

1. Run the prompt in a fresh context.
2. Capture the raw answer with `forward-tests/answer-capture-template.md`.
3. Validate the filled returned capture sheet with `tools/check_forward_test_return_captures.py`.
4. Score the captured answer with reviewer-only materials only after the returned-capture check passes.
5. Record the result with `tools/forward_test_record.py`.
6. Include the filled returned capture sheet path with `--artifact`.

## Verification Boundary

This policy and its checker prove only local release-gate hygiene. They do not prove that future records are truthful, that a tester really used a clean context, or that any NWN feature works at runtime.
