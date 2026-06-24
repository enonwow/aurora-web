# Human Feedback To Skill Release Workflow

## Purpose

Define how lessons from builders, testers, and other model sessions become a better `nwn-server-gamedev` skill version.

This is a release workflow, not automatic learning. A user's installed skill does not self-update, and user sessions do not mutate the official skill pack unless a maintainer reviews, promotes, versions, and releases the change.

## Source Inputs

Accepted source inputs:

- contributor form or GitHub issue using `knowledge-inbox/templates/`,
- contribution bundle following `knowledge-inbox/contribution-bundle-format.md`,
- validated JSON feedback record in `knowledge-inbox/incoming/`,
- prompt forward-test record under `forward-tests/records/`,
- install-smoke-test record under `forward-tests/records/`,
- Aurora Toolset live-operator record following `aurora-live-evidence-workflow.md`,
- docs-research note backed by a source registry lane,
- model-originated suggestion that follows `knowledge-inbox/model-import-policy.md`,
- runtime or Toolset observation with redacted evidence.

Reject or hold:

- private module files,
- credentials, tokens, IPs, account names, or private player data,
- private Discord/forum transcripts without permission,
- model output treated as truth without docs or runtime evidence,
- broad essays that cannot become one focused skill update.

Before claiming feedback has strengthened a release, refresh the intake status:

```powershell
python docs\nwn-skill-pack\tools\generate_feedback_intake_status.py docs\nwn-skill-pack --out docs\nwn-skill-pack\feedback-intake-status.md
python docs\nwn-skill-pack\tools\check_feedback_intake_status.py docs\nwn-skill-pack
```

Before writing a reviewed copy, apply `knowledge-inbox/feedback-review-rubric.md` so `review.decision`, `review.promotion_ready`, evidence label, target reference, privacy review, SemVer impact, and verification commands are consistent.

## Feedback Source Map

Every lane below is intake only until a maintainer reviews it. No row self-updates the installed skill.

| Source | First record or bridge | Maintainer gate | Can strengthen the skill when |
| --- | --- | --- | --- |
| Direct contributor lesson, form, or GitHub issue | `tools/nwn_skill_feedback.py new` into `knowledge-inbox/incoming/`, or a converted `user-feedback-form.md` | `knowledge-inbox/feedback-review-rubric.md` plus `tools/nwn_skill_feedback.py review` | A reviewed record is accepted for promotion, has a proposal, patched references, a promotion record, SemVer decision, and release. |
| Contribution bundle from another builder | `tools/nwn_skill_feedback.py bundle` and `tools/nwn_skill_feedback.py verify-bundle` | Validate every copied record, review each reusable lesson, and reject or quarantine private data | Accepted records reach `knowledge-inbox/promotion-backlog.md` and then the normal reference-promotion path. |
| Prompt forward-test gap | `forward-tests/records/`; use `forward-tests/ft-010-full-slice-capture-review.md` for full-slice review feedback candidates | Reviewer worksheet, returned capture, and conservative `needs-more-evidence` review until evidence is clear | The gap becomes a reviewed record and then a reference patch or skill-routing/tooling change. |
| Install-smoke `partial` or `fail` | `forward-tests/install-smoke-packet.md` and `forward-tests/install-smoke-execution-playbook.md` feedback candidate bridge | Install-smoke record plus review of cache, visibility, trigger, routing, privacy, and runtime-boundary evidence | A package, trigger, or routing fix is patched, checked, versioned, and released. |
| External contributor trial friction | `knowledge-inbox/external-contributor-trial-result-template.md` and `knowledge-inbox/external-trials/ext-001-handoff.md` friction bridge | External trial record, privacy review, and maintainer review of exact friction | Intake docs, status/source labels, feedback/versioning guidance, or tooling are patched and released. |
| Aurora Toolset or local reverse evidence | `aurora-live-evidence-workflow.md`, live/retest records, promotion bridge, and `aurora-live-promotion-proof-gates.md` | Redaction, visual review, review outcome, proposal, and proof gates | Real reviewed live/retest evidence supports a scoped reference patch with preserved evidence labels. |
| Docs research or model-import suggestion | `external-nwn-source-registry.md`, `model-import-policy.md`, and `knowledge-index-policy.md` | Source registry, privacy/source policy, and feedback review rubric | The claim is docs-verified or project-specific, then promoted through the same proposal/version/release path. |

All lanes converge on `knowledge-inbox/promotion-backlog.md`, `knowledge-inbox/reference-promotions/aggregate.md`, `version-bump-plan.md`, `version-manifest.json`, and a filled release handoff. A raw signal is never a release by itself.

## Promotion Path

1. Convert the human report into a feedback record with `tools/nwn_skill_feedback.py new`.
2. If the contributor sends multiple records, receive them as a contribution bundle with `tools/nwn_skill_feedback.py bundle`, inspect `manifest.json`, and verify it with `tools/nwn_skill_feedback.py verify-bundle`.
3. Validate the incoming queue with `tools/nwn_skill_feedback.py validate`.
4. Review the record with `tools/nwn_skill_feedback.py review` using `knowledge-inbox/feedback-review-rubric.md`.
5. Regenerate `knowledge-inbox/promotion-backlog.md` with `tools/generate_feedback_promotion_backlog.py`.
6. Promote only records with `review.decision=accept-for-promotion`, `review.promotion_ready=true`, and sufficient redacted evidence.
7. For Aurora Toolset live evidence, follow `aurora-live-evidence-workflow.md` and generate a proposal with `tools/generate_aurora_toolset_promotion_proposal.py` when atom records are promotion-ready.
8. For Aurora live retest returns, validate retest result records, regenerate `knowledge-inbox/aurora-live-retest-promotion-bridge.md`, and refresh `aurora-live-promotion-proof-gates.md` before claiming any skill-strengthening effect.
   - Use `tools/aurora_live_retest_promotion_decision.py` only after the maintainer has actually patched the target references, checked privacy, synced authoring/plugin copies, and updated release metadata.
   - Do not patch from a synthetic, blocked, partial, or unreviewed retest result.
9. Generate or fill `knowledge-inbox/reference-promotion-proposal-template.md` so the patch target, evidence label, privacy scope, SemVer impact, and verification commands are explicit before editing references.
   - Use `tools/generate_reference_promotion_proposal.py` for a prefilled draft from one accepted reviewed record.
10. Patch the target skill reference under `draft-skills/nwn-server-gamedev/references/`.
11. Copy the same reference change into `draft-plugins/nwn-server-gamedev-pack/skills/nwn-server-gamedev/references/`.
12. Preserve the evidence label in the reference text: `docs-verified`, `runtime-tested`, `toolset-observed`, `static-checked`, `compiled`, or `project-specific`.
13. Move or copy the reviewed source record to `knowledge-inbox/promoted/`.
14. Record the maintainer's promotion result with `tools/reference_promotion_record.py validate` and regenerate `knowledge-inbox/reference-promotions/aggregate.md`.
15. Generate `version-bump-plan.md` with `tools/generate_version_bump_plan.py`.
16. Re-run route, package, record, feedback, manifest, inventory, and release-gate checks.
17. Bump `version-manifest.json` and plugin manifest version according to SemVer.
18. Regenerate `release-readiness.md`, `package-inventory.json`, and `package-inventory.md`.
19. Fill `release-handoff-template.md` for the target recipient and package state.

Use `versioning-policy.md` for the package state and SemVer decision before changing version metadata.

## Version Decision

Use `PATCH` when:

- the promoted change fixes wording,
- clarifies an existing guardrail,
- corrects a source link,
- fixes a small helper-script bug without changing record schemas.

Use `MINOR` when:

- a new NWN domain reference is added,
- a new reusable workflow, QA step, or helper script is added,
- the feedback schema grows in a backward-compatible way,
- a promoted lesson changes how future server design tasks should be answered.

Use `MAJOR` when:

- the skill name changes,
- folder layout or trigger behavior changes,
- feedback or forward-test records become incompatible,
- a public guidance surface is removed or replaced.

## Required Checks Before Release

```powershell
python docs\nwn-skill-pack\tools\nwn_skill_feedback.py validate docs\nwn-skill-pack\knowledge-inbox\incoming
python docs\nwn-skill-pack\tools\generate_feedback_promotion_backlog.py docs\nwn-skill-pack --out docs\nwn-skill-pack\knowledge-inbox\promotion-backlog.md
python docs\nwn-skill-pack\tools\check_feedback_intake_docs.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_feedback_review_rubric.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\generate_feedback_intake_status.py docs\nwn-skill-pack --out docs\nwn-skill-pack\feedback-intake-status.md
python docs\nwn-skill-pack\tools\check_feedback_intake_status.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_reference_promotion_proposal_template.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_reference_promotion_proposal_tool.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_aurora_toolset_promotion_proposal_tool.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_aurora_live_retest_promotion_bridge.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_aurora_live_retest_promotion_decision.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\generate_aurora_live_promotion_proof_gates.py docs\nwn-skill-pack --out docs\nwn-skill-pack\aurora-live-promotion-proof-gates.md
python docs\nwn-skill-pack\tools\check_aurora_live_promotion_proof_gates.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_record_contracts.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\reference_promotion_record.py aggregate docs\nwn-skill-pack\knowledge-inbox\reference-promotions\records --out docs\nwn-skill-pack\knowledge-inbox\reference-promotions\aggregate.md
python docs\nwn-skill-pack\tools\check_reference_promotion_records.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\generate_version_bump_plan.py docs\nwn-skill-pack --out docs\nwn-skill-pack\version-bump-plan.md
python docs\nwn-skill-pack\tools\check_version_bump_plan.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_contribution_bundle_format.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_versioning_policy.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_skill_routes.py docs\nwn-skill-pack\draft-skills\nwn-server-gamedev
python docs\nwn-skill-pack\tools\check_skill_routes.py docs\nwn-skill-pack\draft-plugins\nwn-server-gamedev-pack\skills\nwn-server-gamedev
python docs\nwn-skill-pack\tools\check_plugin_package.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_release_gate.py docs\nwn-skill-pack --target repo-artifact
```

Use `release-candidate` or `install-candidate` gates only when the manifest state and evidence records honestly support those states.

## Maintainer Decision Table

| Feedback state | Action | Release effect |
| --- | --- | --- |
| `unverified` | Keep in incoming or review as needs-more-evidence. | No skill change. |
| `project-specific` | Promote only if the reference preserves the project-specific label. | Usually patch or minor. |
| `docs-verified` | Promote if source lane is current and reusable. | Patch or minor. |
| `runtime-verified` | Promote if evidence is redacted and reproducible enough. | Usually minor. |
| `rejected` | Keep rejection reason for audit. | No skill change. |
| `superseded` | Link or note the replacement. | No skill change unless replacement is promoted. |

## Verified Boundary

Verified locally:

- `skill-creator` defines skills as local folders with `SKILL.md` plus optional resources.
- The current package uses a Git/repo artifact plus plugin wrapper for distribution.
- Local scripts can create, validate, review, aggregate, and inventory records.
- Aurora Toolset live evidence has a separate record, validator, aggregate path, and proposal generator before it can affect skill references.
- Aurora live retest evidence has a separate bridge, promotion decision helper, and proof-gates dashboard before it can affect skill references.
- Release state is machine-readable in `version-manifest.json`.

Still hypothesis until tested:

- Whether a promoted lesson improves answers in a fresh Codex session.
- Whether another builder can install the plugin and invoke the skill without local setup issues.
- Whether a future MCP, GitHub issue bot, or RAG layer is worth the operational cost.
