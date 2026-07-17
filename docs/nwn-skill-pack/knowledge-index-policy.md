# Knowledge Index Policy

## Purpose

Define what may become reviewed knowledge for future docs/RAG, search, or retrieval tooling around the NWN server gamedev skill pack.
This file, `knowledge-index-policy.md`, is the checked source for those boundaries.

This policy protects the skill from treating raw notes, model output, or private project material as verified guidance. It is a repo and handoff policy only. It is not packaged as runtime logic inside the installed skill, and it does not create a live docs/RAG system.

## Scope

This policy applies to:

- future docs/RAG experiments,
- static reviewed knowledge indexes,
- maintainer handoff bundles,
- public contributor packet returns,
- release review summaries.

It does not apply to:

- real game-server runtime data ingestion,
- automatic publication of user submissions,
- external URL freshness checks,
- personal Codex marketplace installation.

## Index Lanes

Only these lanes may become answerable reviewed knowledge:

1. Skill references under `draft-skills/nwn-server-gamedev/references/` after route checks pass.
2. Plugin-packaged skill references under `draft-plugins/nwn-server-gamedev-pack/skills/nwn-server-gamedev/references/` after sync checks prove they match the authoring skill.
3. `external-nwn-source-registry.md` and compact `source-registry.md` as source-discovery metadata, not final proof.
4. Reviewed reference promotion proposals created from `reference-promotion-proposal-template.md`.
5. Accepted reference promotion records generated with `reference_promotion_record.py`.
6. Forward-test accepted records as evidence metadata, not canonical NWN facts.
7. Aurora Toolset live records generated against `aurora-toolset-live-record.schema.json`, but only after filled records validate, `promotion_ready` atoms are reviewed, and a reference promotion record is accepted.
8. Release docs, package inventories, and handoffs as package-state evidence, not general NWN guidance.

## Excluded By Default

Do not index these as answerable knowledge:

- `knowledge-inbox/incoming/` raw feedback records,
- `unverified` records,
- model-only material with source type `claude-opus-import`, `model-suggestion`, or `codex-session`,
- raw private transcripts,
- private module files,
- credentials,
- tokens,
- IP addresses,
- account names,
- private player data,
- `.codex-tmp/` scratch material,
- generated sandbox bundles,
- untrusted public-packet return material before review,
- stale generated docs when their checker fails,
- raw local reverse-engineering leads from `local-aurora-symbol-index.md`,
- unfilled or `not-run` Aurora Toolset live records,
- Aurora Toolset atoms with `promotion_ready=false`,
- `local-reverse-lead` atoms unless they are used only for maintainer triage.

Model output may be stored as a lead under `model-import-policy.md`. Model agreement is not verification.

## Evidence Labels

Every indexed claim must preserve one of these evidence labels:

- `docs-verified`: checked against an accepted source lane.
- `runtime-tested`: checked in Toolset, client, server runtime, logs, or a controlled test module.
- `project-specific`: useful only inside a named project or module context.
- `local-reverse-lead`: decompilation or export-string lead for maintainer triage only; not answerable guidance.
- `toolset-observed`: observed in the Aurora Toolset UI or saved module state; not client or server runtime proof.
- `static-checked`: checked in files, config, schemas, or module data without runtime behavior proof.
- `compiled`: build or script compilation succeeded; not client or server behavior proof unless paired with runtime evidence.
- `rejected`: reviewed and rejected; audit/history only, not answerable guidance.

Records marked `unverified` can be searched for maintainer triage, but they must not be indexed as answerable guidance.

When source records use the feedback schema status `runtime-verified`, the knowledge index may present it as `runtime-tested` only if the runtime proof remains linked.

## Lifecycle

Use this promotion lifecycle:

1. Record source discovery in a feedback record or source registry lane.
2. Review the record with `knowledge-inbox/feedback-review-rubric.md`.
3. Create a reference patch proposal with `reference-promotion-proposal-template.md`.
4. Patch both the authoring skill references and plugin-packaged skill references.
5. Create an accepted promotion record with `reference_promotion_record.py`.
6. Update the version bump plan, release notes, release handoff, and maintainer decision index.
7. Run preflight and only then index the result as reviewed knowledge.

For Aurora Toolset atoms, use `aurora-live-evidence-workflow.md`,
`aurora_toolset_live_record.py` validate or aggregate, and
`generate_aurora_toolset_promotion_proposal.py` before reference patching. The
operator should start from `local-aurora-small-location-live-operator-checklist.md`
when converting local reverse leads into filled Toolset observations.

## Docs/RAG Readiness Gates

Do not enable docs/RAG retrieval until all gates pass:

- `run_repo_artifact_preflight.py` passes.
- `check_domain_reference_status.py` passes.
- `check_external_source_registry.py` passes.
- `check_model_import_policy.py` passes.
- `check_local_aurora_reverse_scope.py` passes.
- `check_feedback_review_rubric.py` passes.
- `check_reference_promotion_records.py` passes with accepted records for indexed claims.
- `check_record_contracts.py` passes, including the Aurora Toolset live record schema.
- `check_aurora_toolset_promotion_proposal_tool.py` passes.
- `check_architecture_scorecard.py` still allows the escalation or a new ADR changes the decision.
- A privacy review confirms retrieval excludes credentials, tokens, IP addresses, account names, private player data, and private module material.
- Retrieval excludes raw incoming records and model-only material unless a reviewed promotion record exists.
- Retrieval excludes Aurora live records unless `promotion_ready` atoms have a reviewed proposal and accepted promotion record.
- A new ADR records the docs/RAG architecture decision before implementation.

## Required Commands

```powershell
python docs\nwn-skill-pack\tools\check_knowledge_index_policy.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_domain_reference_status.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_external_source_registry.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_model_import_policy.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_local_aurora_reverse_scope.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_feedback_review_rubric.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_reference_promotion_records.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_record_contracts.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_aurora_toolset_promotion_proposal_tool.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\aurora_toolset_live_record.py validate docs\nwn-skill-pack\knowledge-inbox\templates\aurora-toolset-live-record-template.json
python docs\nwn-skill-pack\tools\check_architecture_scorecard.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\run_repo_artifact_preflight.py docs\nwn-skill-pack
```

## Verified

Verified locally:

- The package has a static source registry at `external-nwn-source-registry.md`.
- The skill has a compact source registry at `draft-skills/nwn-server-gamedev/references/source-registry.md`.
- The plugin copy has references under `draft-plugins/nwn-server-gamedev-pack/skills/nwn-server-gamedev/references/`.
- `model-import-policy.md` defines how `claude-opus-import`, `model-suggestion`, and `codex-session` records stay untrusted until review.
- `check_local_aurora_reverse_scope.py` verifies local Aurora reverse/thread intake boundaries before any docs/RAG or release handoff treats them as reviewed knowledge.
- `version-manifest.json` anchors the local Aurora intake chain: `local-aurora-reverse-ingestion.md`, `local-thread-019ed62e-aurora-ui-gallery-intake.md`, `local-aurora-symbol-index.md`, `local-aurora-small-location-live-operator-checklist.md`, and `local-aurora-live-gap-queue.md`.
- The anchored local Aurora chain remains maintainer triage only until reviewed Aurora live records and accepted reference-promotion records exist.
- `feedback-review-rubric.md` defines maintainer review before promotion.
- `reference_promotion_record.py` records accepted promotion evidence.
- `aurora-live-evidence-workflow.md` defines how local Aurora reverse leads become Toolset live observations before promotion.
- `aurora_toolset_live_record.py` validates and aggregates Aurora Toolset live records against `aurora-toolset-live-record.schema.json`.
- `generate_aurora_toolset_promotion_proposal.py` creates reviewed proposal drafts from promotion-ready Aurora Toolset atoms.
- `check_record_contracts.py` and `check_aurora_toolset_promotion_proposal_tool.py` check the live-record and proposal tooling contracts.
- `run_repo_artifact_preflight.py` is the current local gate before package-state claims.

## Still Hypothesis

- A future docs/RAG layer will make the package easier to use only after static references become too large or noisy.
- A retrieval system can preserve source trust labels well enough to be safer than direct reference loading.
- Public contributors will submit enough reviewed knowledge to justify indexing.

## Does Not Prove

This policy does not prove retrieval quality, source freshness, privacy safety of future submissions, contributor independence, plugin installability, fresh-thread answer quality, accepted feedback promotion, Toolset atom correctness, fresh Codex answer improvement, or NWN runtime behavior.
