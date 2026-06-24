# NWN Skill Pack Release Evidence Index

Generated: 2026-06-19T09:43:29+00:00

## Package

- Package: `nwn-server-gamedev-pack`
- Version: `0.1.0`
- State: `repo artifact`
- Skill: `nwn-server-gamedev`

## Evidence Meaning

- `static-check`: machine check over files in this repository; proves package shape or freshness only.
- `install-smoke-test`: fresh Codex install/invocation evidence; proves discovery or trigger behavior only.
- `prompt-forward-test`: independent task run using the skill; proves behavior for that prompt only.
- `runtime-tested`: NWN Toolset, server, client, logs, or module runtime evidence; not implied by static package checks.
- Aurora live review outcome records become gate evidence only after `check_release_gate.py` runs `aurora_live_review_outcome_record.py` contextual validation; local `live_record_path` records cannot accept the Minimum First Live Pass until every required atom has returned evidence or an exact blocker.
- The `Aurora Live Review Outcomes` table below surfaces `blocked_atoms`, `held_atoms`, and `next_actions` so release blockers can be traced back to the maintainer review record.
- Local Aurora reverse/thread leads from `local-aurora-reverse-ingestion.md`, `local-thread-019ed62e-aurora-ui-gallery-intake.md`, and `local-aurora-live-gap-queue.md` are release-routing evidence only; they must remain `local-reverse-lead` material until a reviewed Aurora live record or exact blocker routes them through `maintainer-decision-index.md`.
- Aurora live promotion proof-gates are control evidence only: they summarize retest, bridge, maintainer decision, reference patch, and release-gate blockers but do not prove runtime behavior or automatic skill improvement.

## Record Counts

- Total records: 4
- Static checks: 4
- Prompt forward tests: 0
- Install smoke tests: 0

Record types:

- `static-check`: 4

Results:

- `pass`: 4

## Gate Snapshot

| Target | Status | Checks | Warnings | Blockers |
| --- | --- | ---: | ---: | ---: |
| `repo-artifact` | PASS | 5 | 1 | 0 |
| `release-candidate` | BLOCKED | 6 | 0 | 11 |
| `install-candidate` | BLOCKED | 6 | 0 | 12 |

## Gate Blocker Details

| Target | Type | Detail |
| --- | --- | --- |
| `repo-artifact` | warning | manifest still lists blockers: 3 |
| `release-candidate` | blocker | accepted prompt forward tests run: 0; required: 3 |
| `release-candidate` | blocker | coverage missing: NUI |
| `release-candidate` | blocker | coverage missing: 2DA/HAK/TLK or packaging |
| `release-candidate` | blocker | coverage missing: runtime QA |
| `release-candidate` | blocker | coverage missing: economy/progression |
| `release-candidate` | blocker | coverage missing: human feedback contribution |
| `release-candidate` | blocker | version manifest does not allow RC |
| `release-candidate` | blocker | manifest blocker: At least three accepted independent prompt forward tests with fresh/no-leak context and answer-capture artifacts have not been run. |
| `release-candidate` | blocker | manifest blocker: No local marketplace install or reinstall smoke test has been recorded. |
| `release-candidate` | blocker | manifest blocker: Concrete release handoff is filled only for repo-artifact review, not release-candidate or install handoff. |
| `release-candidate` | blocker | release handoff is still marked as repo artifact or unfilled |
| `install-candidate` | blocker | accepted prompt forward tests run: 0; required: 3 |
| `install-candidate` | blocker | coverage missing: NUI |
| `install-candidate` | blocker | coverage missing: 2DA/HAK/TLK or packaging |
| `install-candidate` | blocker | coverage missing: runtime QA |
| `install-candidate` | blocker | coverage missing: economy/progression |
| `install-candidate` | blocker | coverage missing: human feedback contribution |
| `install-candidate` | blocker | version manifest does not allow RC |
| `install-candidate` | blocker | manifest blocker: At least three accepted independent prompt forward tests with fresh/no-leak context and answer-capture artifacts have not been run. |
| `install-candidate` | blocker | manifest blocker: No local marketplace install or reinstall smoke test has been recorded. |
| `install-candidate` | blocker | manifest blocker: Concrete release handoff is filled only for repo-artifact review, not release-candidate or install handoff. |
| `install-candidate` | blocker | release handoff is still marked as repo artifact or unfilled |
| `install-candidate` | blocker | no passed install-smoke-test record |

## Aurora Live Promotion Proof Gates

- Dashboard: `aurora-live-promotion-proof-gates.md`
- Dashboard status: `present`
- Valid pass retest records: 0
- Bridge status: `no-promotion-candidates`
- Accepted promotion decision records: 0
- Release-ready accepted promotion records: 0
- Release-candidate blockers: 11

Proof-gates are control evidence, not runtime evidence. Keep skill-strengthening claims blocked until this dashboard shows real pass retest records, bridge candidates, maintainer decisions, reference patch/release sync, and release-candidate gate clearance.

| Gate | Status | Evidence | Next action |
| --- | --- | --- | --- |
| `source-retail-retest-pass-records` | BLOCKED | 0 pass retest record(s) | Run/receive Aurora live retest and validate the result record. |
| `promotion-bridge-candidates` | BLOCKED | status `no-promotion-candidates`, candidates 0 | Regenerate the bridge after accepted pass retest records exist. |
| `maintainer-promotion-decision` | BLOCKED | 0 accepted promotion decision record(s) | Use aurora_live_retest_promotion_decision.py after maintainer review. |
| `reference-patch-and-release-sync` | BLOCKED | 0 release-ready accepted promotion record(s) | Patch authoring/plugin references and update release metadata before accepting. |
| `release-candidate-gate` | BLOCKED | 11 release-candidate blocker(s) | Clear release-candidate blockers without treating proof scaffolding as runtime evidence. |

## Aurora Live Review Outcomes

- Source directory: `knowledge-inbox/aurora-live-review-outcomes/records`
- Records: 0

Outcome counts:

- none

| Record | Outcome | Live Record | Accepted | Held | Blocked | Next Actions | Promotion | Artifact |
| --- | --- | --- | ---: | ---: | ---: | ---: | --- | --- |
| none | none | none | 0 | 0 | 0 | 0 | none | none |

## Aurora Live Review Outcome Details

| Record | Field | Detail |
| --- | --- | --- |
| none | none | no held atoms, blocked atoms, or next actions recorded |

## Evidence Records

| Test | Type | Result | Labels | Proof Scope | Missing Evidence | Artifact |
| --- | --- | --- | --- | --- | --- | --- |
| `PKG-000: Static plugin package audit` | `static-check` | `pass` | `static-checked` | check_plugin_package.py completed with zero errors and one warning about pending forward tests. | Independent prompt forward tests FT-001..FT-008 are still pending. | `forward-tests/records/pkg-000-static-plugin-package-audit.json` |
| `PKG-001: Local plugin install candidate build` | `static-check` | `pass` | `static-checked` | Builder copied 20 plugin boundary files into docs/nwn-skill-pack/.codex-tmp/install-candidate/nwn-server-gamedev-pack. | This record does not prove Codex marketplace installation, trigger behavior, or NWN runtime correctness. | `forward-tests/records/pkg-001-local-plugin-install-candidate-build.json` |
| `PKG-002: Local marketplace sandbox build` | `static-check` | `pass` | `static-checked` | Marketplace sandbox generated docs/nwn-skill-pack/.codex-tmp/marketplace-candidate/marketplace.json with one local plugin entry. | This record does not prove codex plugin marketplace add, Codex UI discovery, new-thread trigger behavior, or NWN runtime correctness. | `forward-tests/records/pkg-002-local-marketplace-sandbox-build.json` |
| `PKG-003: Post-workflow local install and marketplace sandbox refresh` | `static-check` | `pass` | `static-check` | Install candidate builder copied 20 plugin-boundary files; local marketplace sandbox builder produced marketplace.json and plugin root with 20 plugin files. Both builders explicitly state this is not Codex install proof. | none | `forward-tests/records/pkg-003-post-workflow-install-marketplace-refresh.json` |

## Current Gaps

- accepted prompt forward tests run: 0; required: 3
- coverage missing: NUI
- coverage missing: 2DA/HAK/TLK or packaging
- coverage missing: runtime QA
- coverage missing: economy/progression
- coverage missing: human feedback contribution
- version manifest does not allow RC
- manifest blocker: At least three accepted independent prompt forward tests with fresh/no-leak context and answer-capture artifacts have not been run.
- manifest blocker: No local marketplace install or reinstall smoke test has been recorded.
- manifest blocker: Concrete release handoff is filled only for repo-artifact review, not release-candidate or install handoff.
- release handoff is still marked as repo artifact or unfilled

## Interpretation

This index is release evidence bookkeeping. It does not prove NWN runtime correctness, public plugin availability, or quality of future model answers.
