# Release And Review Checklists

## v0.1.0 Release Checklist

- `SKILL.md` frontmatter has valid `name` and `description`.
- `description` includes when to use the skill.
- `SKILL.md` is a router, not a full encyclopedia.
- All referenced files exist under `references/`.
- `tools/check_skill_routes.py` passes for the authoring skill folder.
- If releasing as a plugin, `tools/check_skill_routes.py` passes for the plugin-packaged skill copy.
- If releasing as a plugin, `tools/check_plugin_package.py` passes with no errors.
- `version-manifest.json` records the package version, state, artifact paths, and release blockers.
- `tools/check_version_manifest.py` passes and agrees with the plugin manifest and skill names.
- `versioning-policy.md` explains package states, SemVer decisions, human feedback release path, compatibility rules, and current blocked RC status.
- `tools/check_versioning_policy.py` passes, proving the policy still matches `version-manifest.json` and plugin version metadata.
- `version-bump-plan.md` is regenerated from accepted reference promotion records and records whether the next version should stay unchanged or move by `PATCH`, `MINOR`, or `MAJOR`.
- `tools/check_version_bump_plan.py` passes, proving no-promotion records recommend no bump and mixed promotion records select the highest SemVer class.
- `tools/check_release_handoff.py` passes for template structure and the concrete handoff path; before RC, `tools/check_release_handoff.py --require-filled` passes for the handoff file named in `version-manifest.json`.
- `tools/generate_release_readiness.py` regenerates `release-readiness.md`.
- `tools/check_release_readiness.py` passes so `release-readiness.md` is not stale.
- `tools/generate_release_notes_draft.py` regenerates `release-notes-draft.md` from the manifest, version bump plan, readiness report, and package inventory.
- `tools/check_release_notes_draft.py` passes so `release-notes-draft.md` cannot overstate repo-artifact, RC, install-smoke, feedback, or runtime evidence.
- `tools/generate_release_next_actions.py` regenerates `release-next-actions.md` from current release gates, readiness counts, and minimum RC/install/external-feedback lanes.
- `tools/check_release_next_actions.py` passes so `release-next-actions.md` stays current and does not pretend the listed actions have run.
- `tools/generate_release_evidence_index.py` regenerates `release-evidence-index.md`.
- `tools/check_release_evidence_index.py` passes so the evidence index matches current records and release gates.
- `tools/generate_rc_blocker_burndown.py` regenerates `rc-blocker-burndown.md`.
- `tools/check_rc_blocker_burndown.py` passes so the RC blocker burn-down matches the current release gate and reviewer matrix.
- `forward-tests/rc-prompt-test-handoff.md` gives external testers the minimal FT-002/FT-003/FT-008 handoff without reviewer-only expected references.
- `tools/check_rc_prompt_test_handoff.py` passes so the handoff stays generated, current, and free of reviewer-only reference filenames.
- `tools/build_forward_test_dispatch_bundle.py docs/nwn-skill-pack --force` builds `.codex-tmp/forward-test-dispatch/rc-minimum/` with the minimum prompt files and blank capture sheets.
- `tools/check_forward_test_dispatch_bundle.py` passes so the dispatch bundle stays no-leak, hash-checked, and explicit that it is not prompt evidence.
- `tools/build_forward_test_clean_session_prompts.py docs/nwn-skill-pack --force` builds `.codex-tmp/forward-test-clean-session-prompts/rc-minimum/` with one self-contained prompt file per fresh Codex thread.
- `tools/check_forward_test_clean_session_prompts.py` passes so the prompt files stay hash-checked, no-leak, and explicit that they are not returned-answer evidence.
- `tools/check_forward_test_clean_session_received_pack.py` passes so the clean-session prompt pack survives a local received-inbox copy and still passes no-leak/hash checks.
- `tools/check_forward_test_return_captures.py --captures <returned-captures-dir>` passes before reviewer-only scoring, and the same checker rejects blank dispatch capture sheets.
- `tools/generate_minimum_rc_proof_packet.py` regenerates `forward-tests/minimum-rc-proof-packet.md` as the short human execution packet for the minimum RC, install-smoke, external feedback, and runtime-proof boundaries.
- `tools/check_minimum_rc_proof_packet.py` passes so the packet stays current, names FT-002/FT-003/FT-008 prompt paths, includes install-smoke record checks, and does not leak reviewer-only expected-reference filenames.
- `forward-tests/rc-unblock-playbook.md` explains the no-answer-leak maintainer path from the current RC blocker set to the first three prompt-forward-test records.
- `tools/check_rc_unblock_playbook.py` passes so the playbook still matches the manifest, reviewer matrix, and FT-002/FT-003/FT-008 prompt files.
- `forward-tests/evidence-acceptance-policy.md` defines which prompt-forward-test records count toward RC.
- `tools/check_forward_test_evidence_policy.py` passes, proving the release gate requires fresh/no-leak context and answer-capture artifacts before prompt-forward-test records count.
- `tools/generate_package_inventory.py` regenerates `package-inventory.json` and `package-inventory.md`.
- `tools/check_package_inventory.py` passes after inventory regeneration.
- `package-boundaries.md` documents skill, plugin install, and handoff bundle boundaries.
- `tools/check_package_boundaries.py` passes after inventory regeneration.
- `tools/build_plugin_install_candidate.py docs/nwn-skill-pack --force` builds a clean plugin root under `.codex-tmp/install-candidate/`.
- `tools/build_local_marketplace_candidate.py docs/nwn-skill-pack --force` builds a repo-local marketplace sandbox under `.codex-tmp/marketplace-candidate/`.
- `tools/check_install_candidate.py` passes after rebuilding both local install sandbox layers.
- `tools/check_isolated_install_layout.py` passes after rebuilding both local install sandbox layers and writes `.codex-tmp/isolated-install-layout/INSTALL-001/ISOLATED-INSTALL-LAYOUT-SUMMARY.json`.
- `tools/generate_install_smoke_packet.py` regenerates `forward-tests/install-smoke-packet.md` for the current marketplace sandbox.
- `tools/check_install_smoke_packet.py` passes after the marketplace sandbox and tester packet are regenerated.
- `forward-tests/install-smoke-execution-playbook.md` explains the maintainer/tester path for safely running INSTALL-001 in a selected Codex environment.
- `tools/check_install_smoke_playbook.py` passes so the playbook stays aligned with the install-smoke packet, manifest, record CLI, and gate checks.
- `tools/check_install_smoke_records.py` passes so `INSTALL-*` records cannot count preparation-only evidence as `pass`.
- `forward-tests/install-smoke-packet.md` includes a result decision table for `pass`, `partial`, `fail`, and `not-run`.
- Install-smoke records do not mark `pass` from preparation commands alone.
- Install-smoke `pass` records include `install_verification` proving registered/installed source, fresh context, skill visibility or invocation, expected reference routing, runtime-boundary preservation, and `preparation_only=false`.
- Helper scripts run with `--help`.
- Feedback record creation, validation, and aggregation are smoke-tested.
- `knowledge-inbox/schema/feedback-record.schema.json` exists and matches the current feedback CLI fields.
- Feedback review command is smoke-tested on a non-promoted record.
- `contributor-feedback-packet.md` and feedback templates explain how humans submit evidence without mutating official references.
- `human-feedback-release-workflow.md` explains how accepted feedback becomes a reviewed reference change, SemVer decision, handoff update, and new release.
- `tools/check_feedback_intake_docs.py` passes, proving human-facing feedback forms still match the feedback CLI enums and privacy guardrails.
- `knowledge-inbox/feedback-review-rubric.md` explains how maintainers choose `review.decision`, `review.promotion_ready`, evidence labels, target references, privacy review, SemVer impact, and verification commands before promotion.
- `tools/check_feedback_review_rubric.py` passes, proving the review rubric still rejects direct promotion from raw, private, or model-only feedback.
- `tools/generate_feedback_intake_status.py` regenerates `feedback-intake-status.md` from feedback record states, reference promotion records, and `version-bump-plan.md`.
- `tools/check_feedback_intake_status.py` passes, proving the status report is fresh and does not imply unreviewed feedback has already improved the skill.
- `tools/check_feedback_lifecycle.py` passes, proving feedback files keep lifecycle meanings: raw `incoming/` remains source history, reviewed/rejected/promoted copies require review metadata, and promoted records require promotion-ready acceptance.
- `knowledge-inbox/reference-promotion-proposal-template.md` exists so accepted feedback is converted into an explicit target-reference patch proposal before skill references change.
- `tools/check_reference_promotion_proposal_template.py` passes, proving the proposal template preserves review, evidence-label, privacy, SemVer, reference-copy, and no-self-update boundaries.
- `tools/generate_reference_promotion_proposal.py` can generate a prefilled proposal from one accepted reviewed feedback record without patching skill references.
- `tools/check_reference_promotion_proposal_tool.py` passes, proving promotion-ready records generate proposals and unready records are rejected unless explicitly marked as blocked drafts.
- `tools/reference_promotion_record.py`, `knowledge-inbox/schema/reference-promotion-record.schema.json`, and `knowledge-inbox/reference-promotions/aggregate.md` record whether a reviewed proposal actually became a patched, checked, versioned reference change.
- `tools/check_reference_promotion_records.py` passes, proving accepted promotion records require both authoring and plugin reference targets, evidence labels, successful checks, privacy review, release metadata updates, and explicit not-proof boundaries.
- `knowledge-inbox/contribution-bundle-format.md` explains how contributors package multiple validated records as a sendable bundle without claiming automatic skill updates.
- `tools/check_contribution_bundle_format.py` passes, proving the contribution bundle doc and `nwn_skill_feedback.py bundle` / `verify-bundle` commands stay aligned.
- `tools/check_contribution_bundle_roundtrip.py` passes, proving the contribution bundle CLI can create and verify a fixture bundle and reject hash tampering.
- `knowledge-inbox/contributor-intake-quickstart.md` explains the one-record contribution path, evidence labels, privacy scrub, maintainer review path, and the rule that installed skills do not self-update.
- `tools/check_contributor_intake_quickstart.py` passes, proving the quickstart still matches feedback CLI domains, statuses, source types, command shapes, and release boundaries.
- `knowledge-inbox/external-contributor-trial-packet.md` explains a no-coaching usability trial for external NWN builders using the quickstart, contribution bundle format, feedback CLI, required return notes, privacy confirmation, and `pass`/`partial`/`fail` result labels.
- `tools/check_external_contributor_trial_packet.py` passes, proving the external contributor trial packet still matches the intake/bundle commands, privacy guardrails, required return artifacts, and no-self-update release boundary.
- `knowledge-inbox/external-contributor-trial-result-template.md` records completed external contributor trial metadata, returned artifacts, maintainer verification commands, result decision, friction notes, privacy/quarantine status, and verification boundary.
- `tools/check_external_contributor_trial_result_template.py` passes, proving the trial result template still captures required result fields, privacy guardrails, maintainer verification commands, and no-self-update release boundary.
- `tools/generate_external_trial_handoff.py` regenerates `knowledge-inbox/external-trials/ext-001-handoff.md` from current manifest state.
- `tools/check_external_trial_handoff.py` passes, proving the external trial handoff is generated, current, no-coaching oriented, and aligned with local static tooling.
- `tools/generate_external_trial_tester_message.py` regenerates `knowledge-inbox/external-trials/ext-001-tester-message.md` from the current public packet ZIP.
- `tools/check_external_trial_tester_message.py` passes, proving the tester message contains the current ZIP SHA-256, no-coaching return instructions, and trust boundaries without reviewer-only tokens.
- `tools/build_external_trial_public_packet.py` builds `.codex-tmp/external-trial-public-packet/ext-001/` and `.codex-tmp/external-trial-public-packet/ext-001.zip` from only the approved tester-facing intake files.
- `tools/check_external_trial_public_packet.py` passes, proving the generated tester packet and ZIP archive have the exact public file set, matching hashes, no reviewer-only file tokens, copied feedback CLI help commands that run, and a synthetic `new -> validate -> bundle -> verify-bundle` command path from both the packet directory and extracted ZIP.
- `tools/check_external_trial_cleanroom.py` passes, proving the generated ZIP can be copied into `.codex-tmp/external-trial-cleanroom/ext-001/inbox/`, extracted into `received/`, and the copied feedback CLI can run the synthetic command path from received files.
- `tools/build_external_trial_dispatch_bundle.py` builds `.codex-tmp/external-trial-dispatch/ext-001/` with the current public ZIP, tester message, `SHA256SUMS.txt`, and `DISPATCH-MANIFEST.json`.
- `tools/check_external_trial_dispatch_bundle.py` passes, proving the send-ready scratch folder matches current public packet and tester-message hashes while preserving not-proven boundaries.
- `tools/check_external_trial_received_dispatch.py` passes, proving a copied dispatch inbox can verify ZIP/message hashes, extract the received ZIP, and run the copied feedback CLI command path without reading repo sources.
- `tools/external_trial_record.py` creates, validates, and aggregates machine-checkable external contributor trial records under `knowledge-inbox/external-trials/`.
- External contributor trial records include `maintainer_verification.cleanroom_check` when the generated public ZIP passed cleanroom smoke before handoff.
- External contributor trial `pass` records require `maintainer_verification.independent_tester=true`; local smoke evidence alone must be recorded as `partial`, `fail`, or `not-run`.
- `knowledge-inbox/schema/external-contributor-trial-record.schema.json` exists and matches the external trial record CLI fields.
- `knowledge-inbox/external-trials/aggregate.md` is regenerated from current external trial records.
- `tools/check_external_trial_records.py` passes, proving the external trial record schema, CLI, aggregate, and any existing records are locally valid.
- `knowledge-inbox/model-import-policy.md` explains how Claude, Opus, Codex, and other model outputs enter only as untrusted feedback records until docs or runtime evidence exists.
- `tools/check_model_import_policy.py` passes, proving the model-import policy still matches the feedback CLI model source types and evidence guardrails.
- `tools/check_local_aurora_reverse_scope.py` passes, proving local Aurora reverse/thread intake remains maintainer-only `local-reverse-lead` material, reports the generated symbol corpus, and is not included in the plugin install boundary.
- `tools/check_external_source_registry.py` passes, proving the external and compact source registries still carry trust tiers, key NWN source lanes, and runtime-test guardrails.
- `tools/check_domain_reference_status.py` passes, proving main NWN domain references keep `docs-verified` facts separate from `runtime-tested` claims in both skill copies.
- `tools/check_capability_map.py` passes, proving the multi-domain capability map is routed, synchronized, and still names the expected domains and escalation options.
- `tools/check_feature_design_template.py` passes, proving the full feature design output template is routed, synchronized, and still names required sections, domains, evidence labels, runtime QA, blockers, and feedback capture.
- `tools/run_repo_artifact_preflight.py` passes as the one-command repo-artifact generation and validation path.
- `tools/generate_feedback_promotion_backlog.py` regenerates `knowledge-inbox/promotion-backlog.md`.
- `knowledge-inbox/lifecycle-policy.md` explains whether same-id `incoming` plus reviewed/rejected/promoted copies are audit history or active work.
- `tools/generate_forward_test_execution_queue.py` regenerates `forward-tests/execution-queue.md` from the reviewer matrix and current prompt-forward-test records.
- `tools/generate_rc_prompt_test_handoff.py` regenerates `forward-tests/rc-prompt-test-handoff.md` for the minimal RC trio without expected-reference leakage.
- `tools/generate_forward_test_reviewer_packet.py` regenerates the reviewer-only scoring packet from the forward-test matrix.
- `tools/generate_forward_test_record_templates.py` regenerates reviewer-only record command templates from the forward-test matrix.
- Generated record command templates include raw-answer capture in `--context` and require an answer-capture or transcript path through `--artifact`.
- `forward-tests/answer-capture-template.md` exists so testers preserve the raw model answer before opening reviewer-only scoring material.
- `tools/check_forward_test_capture_template.py` passes, proving the capture template is present, routed, and avoids reviewer-only scoring tokens.
- `tools/check_forward_test_clean_session_prompts.py` passes, proving the minimum RC clean-session prompt pack exists for FT-002, FT-003, and FT-008 without expected-reference leakage.
- `tools/check_forward_test_clean_session_received_pack.py` passes, proving a copied clean-session prompt inbox can be verified before a maintainer treats it as sendable.
- `tools/check_forward_test_prompts.py` passes, proving the prompt packet has FT-001 through FT-008, a reviewer-only expected-reference matrix, generated reviewer packet, generated record templates, and no obvious expected-answer leakage in files sent to the agent under test.
- `tools/check_rc_unblock_playbook.py` passes, proving the maintainer playbook still separates prompt inputs from reviewer-only materials.
- Forward-test record creation, validation, and aggregation are smoke-tested.
- `forward-tests/schema/forward-test-record.schema.json` exists and matches the current forward-test CLI fields.
- `tools/check_record_contracts.py` passes, proving record schemas and CLI constants have not drifted.
- `tools/check_release_gate.py docs/nwn-skill-pack --target repo-artifact` passes for the current repo artifact state.
- Before calling a package an RC, `tools/check_release_gate.py docs/nwn-skill-pack --target release-candidate` passes.
- Official `quick_validate.py` passes.
- If releasing as a plugin, official `validate_plugin.py` passes for the plugin root.
- `plugin-distribution-plan.md` states whether the plugin is only a draft, repo-local release candidate, or installable release.
- `architecture-escalation-roadmap.md` states why the release is staying as skill/plugin or escalating to repo-template, MCP, or RAG.
- `architecture-escalation-scorecard.md` records current use-now/defer decisions for skill, plugin, Git repo, local workflow tooling, repo-template, GitHub issues/PRs, MCP, docs/RAG, and hosted workflow tooling.
- `tools/check_architecture_scorecard.py` passes, proving the scorecard still matches repo-artifact state and blocked release-candidate gate.
- `architecture-decisions/adr-0001-skill-plugin-first.md` records the current accepted skill/plugin-first decision.
- `tools/check_architecture_decisions.py` passes, proving the ADR still matches `version-manifest.json` and release-gate state.
- `maintainer-decision-index.md` routes common maintainer situations to the correct workflow, checker, and evidence boundary.
- `tools/check_maintainer_decision_index.py` passes, proving the index still points to existing manifest artifacts and release/tooling checks.
- If releasing as a plugin, `plugin-release-candidate-checklist.md` is complete and records the current package state.
- A concrete file under `release-handoffs/` is filled with handoff state, install/update instructions, known gaps, and feedback path, and `version-manifest.json` points to it.
- `release-readiness.md` reflects the current manifest, forward-test records, feedback records, and blockers.
- `source-of-truth-map.md` identifies which claims are verified and which remain project hypotheses.
- At least three realistic prompts are forward-tested and accepted by `forward-tests/evidence-acceptance-policy.md`:
  - design a low-level forest area and encounter loop,
  - plan a custom item/2DA/HAK/TLK change,
  - design a NUI crafting or faction panel.
- Outputs mark evidence status.
- Release notes say which domains are skeletal and which are verified.
- `forward-test-plan.md` has current prompts and scoring criteria.
- `forward-tests/execution-queue.md` shows which FT-001 through FT-008 prompt tests are pending, partial, failed, or passed without leaking expected references.
- `forward-tests/rc-unblock-playbook.md` names the minimal no-answer-leak path for FT-002, FT-003, and FT-008.
- `forward-tests/rc-prompt-test-handoff.md` is the sanitized external-tester packet for FT-002, FT-003, and FT-008.
- `forward-tests/minimum-rc-proof-packet.md` is the maintainer-facing minimum proof packet and must not be treated as evidence by itself.
- `forward-tests/tester-packet.md` gives external testers prompt-only instructions that avoid leaking expected answers.
- `.codex-tmp/forward-test-clean-session-prompts/rc-minimum/` gives testers one prompt file per fresh Codex thread, but the generated files are not evidence until returned captures and accepted records exist.
- `forward-tests/answer-capture-template.md` is used before scoring so raw answers are preserved before reviewer-only materials are opened.
- `.codex-tmp/forward-test-dispatch/rc-minimum/` is generated only as no-leak transport scaffolding for FT-002, FT-003, and FT-008; it is not an executed test record.
- `tools/check_forward_test_return_captures.py` is run on returned capture sheets before reviewer scoring so blank sheets cannot become accepted prompt-forward records.
- `forward-tests/reviewer-packet.md` gives reviewers a private scoring handoff generated from `reviewer-matrix.json`.
- `forward-tests/prompts/` contains one standalone prompt file per planned forward test.
- `forward-test-results.md` records static route checks and prompt-test outcomes.
- `forward-tests/records/` contains one valid record per executed test.
- `forward-tests/aggregate.md` is regenerated after adding test records.
- Plugin release notes outside the skill folder identify install path, marketplace status, forward-test coverage, known gaps, and feedback contribution path.
- Handoff notes explicitly say that user feedback becomes skill improvement only after review and a new release.
- Handoff notes point maintainers to `human-feedback-release-workflow.md` for the full promotion path.
- Handoff notes point contributors to `knowledge-inbox/contributor-intake-quickstart.md` for the short feedback path.

## Plugin RC Checklist

Before calling the plugin a release candidate:

- `docs/nwn-skill-pack/plugin-release-candidate-checklist.md` exists and is current.
- The package state is not overstated: repo artifact, release candidate, local install candidate, or public release.
- The authoring skill and plugin-packaged skill are synchronized.
- The package audit passes with no errors; warnings such as pending forward tests are resolved or intentionally documented.
- The plugin manifest has no unsupported or nonexistent app/MCP/asset claims.
- The plugin manifest keeps strict semver and real interface metadata.
- The package excludes local temp dependencies and private project data.
- Local install instructions name whether they use personal marketplace, repo/team marketplace, or no marketplace yet.
- Update/reinstall instructions use the cachebuster flow for an already-installed local plugin.
- A new-thread smoke test is planned after plugin install or reinstall.
- Public release instructions state that user installs do not automatically improve the skill; reviewed contributions and new releases do.
- Feedback command examples use `nwn_skill_feedback.py new`, `validate`, and `aggregate` with the current CLI schema.
- Feedback review examples use `nwn_skill_feedback.py review` and do not imply direct promotion from `incoming`.

## Feedback Record Review Checklist

Before promotion, verify:

- The record has a clear domain.
- The claim is supported by runtime, documentation, or exact project evidence.
- Project-specific assumptions are labeled `project-specific`.
- Model-originated claims remain `unverified` unless separately checked.
- The proposed target reference file is correct.
- The update is concise and reusable.
- The update adds a verification step or failure mode when possible.
- The update does not expose private server data.

## Promotion Checklist

When moving a reviewed record into a reference:

1. Add only the reusable lesson, not the whole record.
2. Preserve evidence level.
3. Mention version or project constraints when relevant.
4. Add a runtime verification step if the lesson affects implementation.
5. Move or copy the original record to `knowledge-inbox/promoted/`.
6. Add an entry to the release notes or changelog outside the skill folder.

## Versioning Rules

Use semantic versioning:

- Patch: typo fixes, clarified wording, small script bug fixes.
- Minor: new reference file, new domain section, new helper script, new reviewed patterns.
- Major: renamed skill, changed feedback schema, changed folder layout, removed or replaced public guidance.

## Trust Labels

Use these labels in references and feedback:

- `unverified`: captured but not trusted.
- `docs-verified`: checked against documentation or source material.
- `runtime-tested`: verified in Toolset, client, server runtime, or logs.
- `project-specific`: valid for a named project/server, not global.
- `superseded`: replaced by newer guidance.

## Stop Conditions For A Release

Do not release a new version if:

- validation fails,
- a reference file named in `SKILL.md` is missing,
- the plugin manifest claims apps, MCP servers, icons, or screenshots that do not exist,
- feedback records are promoted without evidence labels,
- feedback intake status is missing, stale, or implies unreviewed records already improved the skill.
- feedback lifecycle checker fails or terminal records are placed in the wrong inbox state.
- model-generated NWN claims are presented as verified,
- examples imply runtime behavior that has not been tested.
- Codex product behavior is claimed without checking `skill-creator`, the Codex manual, or current-session tool behavior.
- fewer than three forward tests have been run for a release candidate.
- the plugin RC checklist has not been completed for a plugin release.
- package audit fails.
- version manifest check fails.
- versioning policy checker fails.
- version bump plan checker fails.
- human feedback release workflow is missing or implies installed skills self-update from user sessions.
- record contract checker fails.
- feedback intake doc checker fails.
- feedback review rubric checker fails.
- reference promotion proposal template checker fails.
- reference promotion proposal generator checker fails.
- reference promotion record checker fails.
- contribution bundle format checker fails.
- contribution bundle roundtrip checker fails.
- contributor intake quickstart checker fails.
- external contributor trial packet checker fails.
- external contributor trial result template checker fails.
- external trial handoff checker fails.
- external trial tester message checker fails.
- external trial public packet checker fails.
- external trial cleanroom checker fails.
- external trial dispatch bundle checker fails.
- external trial received dispatch checker fails.
- external trial records checker fails.
- model import policy checker fails.
- local Aurora reverse scope checker fails or local reverse material is treated as installed-skill truth.
- architecture scorecard checker fails.
- architecture decision checker fails.
- maintainer decision index checker fails.
- feedback promotion backlog is missing or stale.
- RC prompt-test handoff is missing, stale, or leaks reviewer-only reference names.
- minimum RC proof packet is missing, stale, omits install-smoke record checks, or leaks reviewer-only reference names.
- forward-test evidence acceptance policy is missing, stale, or not enforced by the release gate.
- forward-test record command templates are missing or stale.
- forward-test answer capture template is missing, stale, or leaks reviewer-only scoring material.
- forward-test dispatch bundle checker fails or the dispatch bundle is treated as proof that prompt tests ran.
- forward-test return capture checker fails on returned captures, or it is skipped before reviewer scoring.
- forward-test prompt checker fails.
- domain reference status checker fails.
- capability map checker fails.
- feature design template checker fails.
- package inventory is missing or stale.
- package inventory checker fails.
- package boundary checker fails.
- install candidate builder fails.
- local marketplace candidate builder fails.
- install candidate checker fails or the repo-local sandbox is stale.
- isolated install layout checker fails or its summary is missing.
- install smoke packet is missing or stale.
- install smoke packet checker fails.
- install-smoke execution playbook is missing or stale.
- install-smoke record checker fails.
- install-smoke `pass` evidence is missing `install_verification` or marks preparation-only evidence as a pass.
- release gate checker fails for the claimed package state.
- release handoff checker fails, or `--require-filled` fails for an RC/install/public release.
- release evidence index is missing or stale.
- release notes draft is missing, stale, or implies RC/install/runtime evidence that does not exist.
- release next-actions dashboard is missing, stale, or implies planned evidence has already been produced.
- RC blocker burn-down is missing or stale.
- RC unblock playbook is missing or stale.
- repo-artifact preflight runner fails.
- install/reinstall instructions assume a marketplace entry that does not exist.
- handoff notes omit known gaps or overstate package state.
- escalation to MCP, RAG, or repo-template is proposed without a documented bottleneck and gate.
