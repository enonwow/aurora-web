# Source Of Truth Map

## Purpose

Separate verified Codex skill-pack facts from NWN project assumptions and future hypotheses. This prevents the NWN skill pack from treating model-generated plans as official Codex behavior.

## Verified Codex Sources

### Local `skill-creator`

Source files:

- `C:\Users\enonw\.codex\skills\.system\skill-creator\SKILL.md`
- `C:\Users\enonw\.codex\skills\.system\skill-creator\references\openai_yaml.md`
- `C:\Users\enonw\.codex\skills\.system\skill-creator\scripts\init_skill.py`
- `C:\Users\enonw\.codex\skills\.system\skill-creator\scripts\quick_validate.py`

Verified facts used:

- A skill requires `SKILL.md`.
- `SKILL.md` requires YAML frontmatter with `name` and `description`.
- `description` controls trigger matching and must include when to use the skill.
- Optional resource folders are `scripts/`, `references/`, and `assets/`.
- `references/` supports progressive disclosure for detailed documentation.
- `scripts/` is appropriate for deterministic helpers and validation.
- `agents/openai.yaml` is UI/product metadata.
- `init_skill.py` should be used for new skills when available.
- `quick_validate.py` validates basic skill structure.

### Codex Manual

Fetched with:

```powershell
node C:\Users\enonw\.codex\skills\.system\openai-docs\scripts\fetch-codex-manual.mjs
```

Fetched files:

- `C:\Users\enonw\AppData\Local\Temp\openai-docs-cache\codex-manual.md`
- `C:\Users\enonw\AppData\Local\Temp\openai-docs-cache\codex-manual.outline.md`

Relevant manual sections:

- Agent Skills: lines `6626-6773`
- Automations: lines `3762-3897`
- Model Context Protocol: lines `7207-7380`
- Build plugins: lines `9943-10154`

Verified facts used:

- Skills extend Codex with task-specific capabilities by packaging instructions, resources, and optional scripts.
- Skills are the authoring format for reusable workflows.
- Plugins are the installable distribution unit for reusable skills and apps in Codex.
- Skills use progressive disclosure: Codex starts with name, description, and path, then loads full `SKILL.md` when selected.
- Skills can be explicitly invoked or implicitly selected by matching `description`.
- For broad distribution, bundling multiple skills, app integrations, MCP config, or stable package publication, use plugins.
- MCP connects Codex to tools and context.
- Automations can use skills and should have durable prompts.

### Local `plugin-creator`

Source files:

- `C:\Users\enonw\.codex\skills\.system\plugin-creator\SKILL.md`
- `C:\Users\enonw\.codex\skills\.system\plugin-creator\references\plugin-json-spec.md`
- `C:\Users\enonw\.codex\skills\.system\plugin-creator\references\installing-and-updating.md`
- `C:\Users\enonw\.codex\skills\.system\plugin-creator\scripts\validate_plugin.py`

Verified facts used:

- Plugin manifests live at `.codex-plugin/plugin.json`.
- Plugin manifests require real metadata and strict semver for `version`.
- `skills` can point to a relative skill folder path such as `./skills/`.
- Plugin manifests should not declare apps, MCP servers, icons, logos, or screenshots unless companion files exist.
- `validate_plugin.py` is the local preflight validator for plugin roots.
- Marketplace entries should include installation policy, authentication policy, and category.
- Default local personal marketplace flow uses `~/.agents/plugins/marketplace.json`.
- Non-default marketplace paths need explicit configuration before install instructions are safe.
- Updating an already-installed local plugin should use a cachebuster/reinstall flow rather than hand-editing marketplace config.
- A new thread should be used after reinstall so Codex picks up updated plugin capabilities.
- Feedback CLI handoff commands must match the current local `nwn_skill_feedback.py` schema.

## Verified Local Artifacts

- `docs/nwn-skill-pack/draft-skills/nwn-server-gamedev/SKILL.md` was scaffolded with `init_skill.py`.
- The draft skill passed `quick_validate.py` after `PyYAML` was installed locally under `.codex-tmp/pydeps`.
- `docs/nwn-skill-pack/draft-plugins/nwn-server-gamedev-pack/` was scaffolded with `plugin-creator`.
- `docs/nwn-skill-pack/draft-plugins/nwn-server-gamedev-pack/.codex-plugin/plugin.json` passed `validate_plugin.py`.
- `docs/nwn-skill-pack/version-manifest.json` records current package version `0.1.0`, state `repo artifact`, artifact paths, SemVer policy, and active RC blockers.
- `docs/nwn-skill-pack/tools/check_version_manifest.py` verifies the version manifest against the plugin manifest and both skill copies.
- `docs/nwn-skill-pack/tools/check_release_handoff.py` verifies release handoff template structure and the concrete handoff path from `version-manifest.json`; `--require-filled` blocks placeholder or empty-field handoffs before RC/install/public release gates.
- `docs/nwn-skill-pack/tools/generate_release_readiness.py` generated `docs/nwn-skill-pack/release-readiness.md` from the version manifest, forward-test records, and feedback records.
- `docs/nwn-skill-pack/tools/check_release_readiness.py` verifies that `release-readiness.md` still matches the current generated report, ignoring only the timestamp.
- `docs/nwn-skill-pack/tools/generate_release_notes_draft.py` generated `docs/nwn-skill-pack/release-notes-draft.md` from `version-manifest.json`, `version-bump-plan.md`, `release-readiness.md`, and `package-inventory.json`.
- `docs/nwn-skill-pack/tools/check_release_notes_draft.py` verifies that `release-notes-draft.md` is fresh and still says the package is a repo artifact with zero prompt forward tests, zero install smoke tests, no accepted reference promotions, and no NWN runtime proof.
- `docs/nwn-skill-pack/tools/generate_release_next_actions.py` generated `docs/nwn-skill-pack/release-next-actions.md` from release gates, readiness counts, and current proof-lane paths.
- `docs/nwn-skill-pack/tools/check_release_next_actions.py` verifies that `release-next-actions.md` is fresh and still names blocked RC/install gates, FT-002/FT-003/FT-008, INSTALL-001, EXT-001, refresh commands, and not-proven boundaries.
- `docs/nwn-skill-pack/tools/generate_release_evidence_index.py` generated `docs/nwn-skill-pack/release-evidence-index.md` from the version manifest, forward-test records, and release gate snapshots.
- `docs/nwn-skill-pack/tools/check_release_evidence_index.py` verifies that `release-evidence-index.md` still matches current records and gates, ignoring only the timestamp.
- `docs/nwn-skill-pack/tools/generate_rc_blocker_burndown.py` generated `docs/nwn-skill-pack/rc-blocker-burndown.md` from `version-manifest.json`, `forward-tests/reviewer-matrix.json`, and the current `check_release_gate.py` result.
- `docs/nwn-skill-pack/tools/check_rc_blocker_burndown.py` verifies that `rc-blocker-burndown.md` stays fresh and names the recommended FT-002, FT-003, FT-008 forward-test trio.
- `docs/nwn-skill-pack/tools/generate_rc_prompt_test_handoff.py` generates `docs/nwn-skill-pack/forward-tests/rc-prompt-test-handoff.md` as a sanitized external-tester handoff for FT-002, FT-003, and FT-008.
- `docs/nwn-skill-pack/tools/check_rc_prompt_test_handoff.py` verifies that the RC prompt-test handoff matches the generator, names only the minimal prompt paths, routes testers to answer capture, and avoids reviewer-only expected-reference names.
- `docs/nwn-skill-pack/tools/generate_minimum_rc_proof_packet.py` generates `docs/nwn-skill-pack/forward-tests/minimum-rc-proof-packet.md` as a maintainer-facing one-page execution packet for the minimum RC evidence path.
- `docs/nwn-skill-pack/tools/check_minimum_rc_proof_packet.py` verifies that the minimum RC proof packet matches current manifest metadata, release gate snapshots, prompt-test paths, install-smoke record checks, external-feedback boundary, runtime-proof boundary, and no reviewer-only reference leakage.
- `docs/nwn-skill-pack/forward-tests/evidence-acceptance-policy.md` defines which prompt-forward-test records can count toward RC.
- `docs/nwn-skill-pack/tools/check_forward_test_evidence_policy.py` verifies that the evidence policy, release gate, and generated record command templates all require fresh/no-leak context plus answer-capture artifacts.
- `docs/nwn-skill-pack/forward-tests/rc-unblock-playbook.md` documents the no-answer-leak maintainer path for running FT-002, FT-003, and FT-008 in fresh contexts, then recording and aggregating results.
- `docs/nwn-skill-pack/tools/check_rc_unblock_playbook.py` verifies that the RC unblock playbook still mentions the manifest-scoped forward-test artifacts, reviewer-only exclusions, release gate commands, and the current minimal FT-002/FT-003/FT-008 prompt trio.
- `docs/nwn-skill-pack/forward-tests/answer-capture-template.md` gives testers a no-answer-leak capture sheet for raw model output before reviewer-only scoring begins.
- `docs/nwn-skill-pack/tools/check_forward_test_capture_template.py` verifies that the answer capture template is routed from tester and RC handoff docs and avoids reviewer-only scoring tokens.
- `docs/nwn-skill-pack/tools/build_forward_test_dispatch_bundle.py` builds `docs/nwn-skill-pack/.codex-tmp/forward-test-dispatch/rc-minimum/` with the FT-002, FT-003, and FT-008 prompt files, blank capture sheets, tester instructions, hashes, and `DISPATCH-MANIFEST.json`.
- `docs/nwn-skill-pack/tools/check_forward_test_dispatch_bundle.py` verifies the prompt-forward dispatch folder file set, hash coverage, no-leak boundary, expected-reference exclusion, and manifest not-proven statements.
- `docs/nwn-skill-pack/tools/build_forward_test_clean_session_prompts.py` builds `docs/nwn-skill-pack/.codex-tmp/forward-test-clean-session-prompts/rc-minimum/` with one self-contained prompt file per fresh Codex thread, hashes, and `CLEAN-SESSION-MANIFEST.json`.
- `docs/nwn-skill-pack/tools/check_forward_test_clean_session_prompts.py` verifies the clean-session prompt file set, hash coverage, no-leak boundary, expected-reference exclusion, capture instructions, and manifest not-proven statements.
- `docs/nwn-skill-pack/tools/check_forward_test_clean_session_received_pack.py` copies the clean-session prompt pack into `docs/nwn-skill-pack/.codex-tmp/forward-test-clean-session-received/rc-minimum/inbox/`, verifies copied hashes against the source, reruns the no-leak checker on the copy, and writes `RECEIVED-CLEAN-SESSION-SUMMARY.json`.
- `docs/nwn-skill-pack/tools/check_forward_test_return_captures.py` verifies returned FT-002, FT-003, and FT-008 capture sheets are structurally filled and avoid reviewer-only leakage before scoring, with `--self-test` using a synthetic fixture.
- `docs/nwn-skill-pack/tools/generate_package_inventory.py` generated `docs/nwn-skill-pack/package-inventory.json` and `docs/nwn-skill-pack/package-inventory.md` with file roles, sizes, and SHA-256 checksums.
- `docs/nwn-skill-pack/tools/check_package_inventory.py` verifies that `package-inventory.json` still matches the current file set and checksums, ignoring only regeneration timestamps.
- `docs/nwn-skill-pack/package-boundaries.md` documents the difference between the compact skill, installed plugin, and repo/handoff bundle.
- `docs/nwn-skill-pack/tools/check_package_boundaries.py` verifies the current skill/plugin/repo boundaries and package-inventory `plugin_install_include` flags.
- `docs/nwn-skill-pack/tools/build_plugin_install_candidate.py` builds a clean local plugin root from `plugin_install_include=true` inventory entries.
- `docs/nwn-skill-pack/tools/build_local_marketplace_candidate.py` builds a repo-local marketplace sandbox with `marketplace.json` and `plugins/nwn-server-gamedev-pack/` without registering it in Codex.
- `docs/nwn-skill-pack/tools/check_install_candidate.py` verifies that the repo-local install candidate and marketplace candidate plugin files match the current `plugin_install_include` inventory hashes and marketplace contract.
- `docs/nwn-skill-pack/tools/check_isolated_install_layout.py` copies the current install candidate and marketplace sandbox into `docs/nwn-skill-pack/.codex-tmp/isolated-install-layout/INSTALL-001/CODEX_HOME/`, verifies plugin/skill/marketplace layout, and writes `ISOLATED-INSTALL-LAYOUT-SUMMARY.json`.
- `docs/nwn-skill-pack/tools/generate_install_smoke_packet.py` generates `docs/nwn-skill-pack/forward-tests/install-smoke-packet.md` from the current marketplace sandbox and version manifest.
- `docs/nwn-skill-pack/tools/check_install_smoke_packet.py` verifies the INSTALL-001 tester packet against `version-manifest.json` and the current repo-local marketplace sandbox.
- `docs/nwn-skill-pack/forward-tests/install-smoke-execution-playbook.md` documents the maintainer/tester path for refreshing the sandbox, registering or installing the local plugin, starting a fresh Codex context, running the smoke prompt, and recording INSTALL-001.
- `docs/nwn-skill-pack/tools/check_install_smoke_playbook.py` verifies that the install-smoke execution playbook still mentions the manifest-scoped install packet, static checker, record CLI, expected reference routing, and install-candidate gate checks.
- `docs/nwn-skill-pack/tools/forward_test_record.py` now requires `install_verification` for `install-smoke-test` `pass` records, so preparation-only records cannot satisfy the install-smoke evidence gate.
- `docs/nwn-skill-pack/tools/check_install_smoke_records.py` verifies the install-smoke record contract with synthetic negative/positive checks and audits existing `INSTALL-*` records under `forward-tests/records/`.
- `docs/nwn-skill-pack/release-readiness.md` currently marks the package as blocked for RC because no prompt forward tests have run, no install smoke test has passed, and `version-manifest.json` keeps `rc_allowed=false`.
- `docs/nwn-skill-pack/tools/check_release_gate.py` can pass the current repo-artifact gate while blocking release-candidate and install-candidate states until required records, coverage, handoff, and manifest gates exist.
- The copied skill inside the draft plugin passed `quick_validate.py`.
- `docs/nwn-skill-pack/tools/check_skill_routes.py` passed for both the authoring skill folder and the plugin-packaged skill copy.
- `docs/nwn-skill-pack/tools/check_plugin_package.py` passed with no errors and expected warnings that forward tests and install smoke evidence are still pending.
- `docs/nwn-skill-pack/tools/nwn_skill_feedback.py` can create, validate, aggregate, bundle, verify bundles, and privacy-scan feedback records.
- `docs/nwn-skill-pack/tools/nwn_skill_feedback.py` can write reviewed copies with maintainer decision metadata through the `review` command, and can validate directories of feedback records.
- `docs/nwn-skill-pack/knowledge-inbox/schema/feedback-record.schema.json` captures the current feedback-record contract for contributors and future issue/MCP/RAG intake.
- `docs/nwn-skill-pack/contributor-feedback-packet.md` and `docs/nwn-skill-pack/knowledge-inbox/templates/` provide human-facing intake forms that must be converted into validated feedback records before promotion.
- `docs/nwn-skill-pack/human-feedback-release-workflow.md` defines the maintainer path from accepted feedback record to reviewed reference update, SemVer decision, regenerated package evidence, and release handoff.
- `docs/nwn-skill-pack/tools/check_feedback_intake_docs.py` verifies that contributor feedback docs and templates still mention the current feedback CLI domains, source types, intake statuses, and privacy guardrails.
- `docs/nwn-skill-pack/knowledge-inbox/feedback-review-rubric.md` defines the maintainer decision ladder for setting `review.decision`, `review.promotion_ready`, evidence label, target reference, privacy review, SemVer impact, and verification commands before a record can become promotion-ready.
- `docs/nwn-skill-pack/tools/check_feedback_review_rubric.py` verifies that the feedback review rubric preserves model-import, privacy, no-direct-promotion, SemVer, and not-proof boundaries.
- `docs/nwn-skill-pack/tools/generate_feedback_intake_status.py` generated `docs/nwn-skill-pack/feedback-intake-status.md` from feedback record states, reference promotion records, and `version-bump-plan.md`.
- `docs/nwn-skill-pack/tools/check_feedback_intake_status.py` verifies that `feedback-intake-status.md` is fresh and still reports zero promotion-ready reviewed records, zero accepted reference promotion records, and Proposed SemVer class `NONE`.
- `docs/nwn-skill-pack/tools/check_feedback_lifecycle.py` verifies current feedback lifecycle invariants across `incoming/`, `reviewed/`, `rejected/`, and `promoted/`, including same-id source-history handling and promotion-ready review metadata for promoted records.
- `docs/nwn-skill-pack/knowledge-inbox/reference-promotion-proposal-template.md` defines the maintainer bridge from `review.decision=accept-for-promotion` and `review.promotion_ready=true` to an explicit target-reference patch plan.
- `docs/nwn-skill-pack/tools/check_reference_promotion_proposal_template.py` verifies that the promotion proposal template preserves feedback-review, target-reference, evidence-label, privacy, SemVer, verification-command, and no-self-update boundaries.
- `docs/nwn-skill-pack/tools/generate_reference_promotion_proposal.py` creates a prefilled reference promotion proposal from one accepted reviewed feedback record without modifying skill references.
- `docs/nwn-skill-pack/tools/check_reference_promotion_proposal_tool.py` smoke-tests the generator with synthetic promotion-ready and unready feedback records under `.codex-tmp/reference-promotion-proposal/`.
- `docs/nwn-skill-pack/knowledge-inbox/contribution-bundle-format.md` defines a sendable bundle format for validated feedback records, including `manifest.json`, `SUMMARY.md`, copied record hashes, bundle verification, and the rule that bundles are intake material only.
- `docs/nwn-skill-pack/tools/check_contribution_bundle_format.py` verifies that the contribution bundle format and `nwn_skill_feedback.py bundle` / `verify-bundle` commands stay aligned.
- `docs/nwn-skill-pack/tools/check_contribution_bundle_roundtrip.py` smoke-tests contribution bundle creation and verification on a synthetic `.codex-tmp` fixture, then tampers with a copied record and confirms `verify-bundle` rejects the SHA-256 mismatch.
- `docs/nwn-skill-pack/knowledge-inbox/contributor-intake-quickstart.md` gives external contributors the short path for one-record submission, privacy scrub, validation, review, and the no-self-update release boundary.
- `docs/nwn-skill-pack/tools/check_contributor_intake_quickstart.py` verifies that the contributor quickstart stays aligned with feedback CLI domains, statuses, source types, command shapes, privacy guardrails, and release boundaries.
- `docs/nwn-skill-pack/knowledge-inbox/external-contributor-trial-packet.md` defines a no-coaching usability trial for outside NWN builders using the contributor quickstart, contribution bundle format, feedback CLI, command transcript, privacy confirmation, and `pass`/`partial`/`fail` result labels.
- `docs/nwn-skill-pack/tools/check_external_contributor_trial_packet.py` verifies that the external contributor trial packet stays aligned with the intake/bundle commands, required return artifacts, privacy guardrails, and no-self-update boundary.
- `docs/nwn-skill-pack/knowledge-inbox/external-contributor-trial-result-template.md` records completed external-contributor trial metadata, returned artifacts, maintainer verification commands, result decision, friction notes, privacy/quarantine status, and the verification boundary.
- `docs/nwn-skill-pack/tools/check_external_contributor_trial_result_template.py` verifies that the trial result template keeps the required result fields, privacy guardrails, maintainer verification commands, and no-self-update boundary.
- `docs/nwn-skill-pack/tools/generate_external_trial_handoff.py` generated `docs/nwn-skill-pack/knowledge-inbox/external-trials/ext-001-handoff.md` from current manifest metadata as the start packet for `EXT-001`.
- `docs/nwn-skill-pack/tools/check_external_trial_handoff.py` verifies that the `EXT-001` handoff matches the generator, points to `version-manifest.json`, and preserves no-coaching plus no-runtime-proof boundaries.
- `docs/nwn-skill-pack/tools/generate_external_trial_tester_message.py` generates `docs/nwn-skill-pack/knowledge-inbox/external-trials/ext-001-tester-message.md` from current manifest metadata and the public packet ZIP hash.
- `docs/nwn-skill-pack/tools/check_external_trial_tester_message.py` verifies the tester message matches the generator, includes the current ZIP SHA-256, avoids reviewer-only tokens, and preserves no-coaching/trust boundaries.
- `docs/nwn-skill-pack/tools/build_external_trial_public_packet.py` builds `docs/nwn-skill-pack/.codex-tmp/external-trial-public-packet/ext-001/` and `docs/nwn-skill-pack/.codex-tmp/external-trial-public-packet/ext-001.zip` from the approved public tester files.
- `docs/nwn-skill-pack/tools/check_external_trial_public_packet.py` verifies that the generated public packet and ZIP archive contain only the expected tester-facing files plus manifest/start instructions, with copied hashes matching the source files, no reviewer-only file tokens, copied `nwn_skill_feedback.py` help commands that run, ZIP extraction into `.codex-tmp`, and a synthetic `new -> validate -> bundle -> verify-bundle` path from both the packet directory and extracted ZIP.
- `docs/nwn-skill-pack/tools/check_external_trial_cleanroom.py` copies the generated `EXT-001` ZIP into `.codex-tmp/external-trial-cleanroom/ext-001/inbox/`, treats that copy as a received archive, extracts it under `received/`, runs copied feedback CLI help plus synthetic `new -> validate -> bundle -> verify-bundle`, and writes `CLEANROOM-SUMMARY.json`.
- `docs/nwn-skill-pack/tools/build_external_trial_dispatch_bundle.py` builds `docs/nwn-skill-pack/.codex-tmp/external-trial-dispatch/ext-001/` with the current `ext-001.zip`, generated tester message, `SHA256SUMS.txt`, and `DISPATCH-MANIFEST.json`.
- `docs/nwn-skill-pack/tools/check_external_trial_dispatch_bundle.py` verifies the dispatch folder file set, hashes against source artifacts, SHA256SUMS coverage, tester-message boundaries, public packet smoke, cleanroom smoke, and manifest not-proven boundaries.
- `docs/nwn-skill-pack/tools/check_external_trial_received_dispatch.py` copies the send-ready dispatch folder into `docs/nwn-skill-pack/.codex-tmp/external-trial-received-dispatch/ext-001/inbox/`, verifies received ZIP and message hashes, extracts the ZIP, runs copied feedback CLI help plus synthetic `new -> validate -> bundle -> verify-bundle`, and writes `RECEIVED-DISPATCH-SUMMARY.json`.
- `docs/nwn-skill-pack/tools/external_trial_record.py` can create, validate, and aggregate external contributor trial records.
- External contributor trial records now require `maintainer_verification.cleanroom_check` so future `EXT-*` results preserve whether the public ZIP passed cleanroom smoke before handoff.
- External contributor trial `pass` records now require `maintainer_verification.independent_tester=true`, which prevents local smoke-only evidence from being recorded as an outside tester success.
- `docs/nwn-skill-pack/knowledge-inbox/schema/external-contributor-trial-record.schema.json` captures the current external contributor trial record contract.
- `docs/nwn-skill-pack/knowledge-inbox/external-trials/aggregate.md` is generated from current trial records and currently records no completed external contributor trials.
- `docs/nwn-skill-pack/tools/check_external_trial_records.py` verifies external trial record schema shape, CLI command presence, aggregate boundary text, and any existing trial records.
- `docs/nwn-skill-pack/knowledge-inbox/model-import-policy.md` defines how Claude, Opus, Codex, and other model outputs enter the system only as feedback-record leads, not verified NWN guidance.
- `docs/nwn-skill-pack/tools/check_model_import_policy.py` verifies that the model-import policy still matches local feedback CLI source types, statuses, privacy guardrails, and the rule that model agreement is not verification.
- `docs/nwn-skill-pack/architecture-escalation-scorecard.md` records the current architecture recommendation: use skill, plugin wrapper, Git repo, and local workflow tooling now; defer repo-template, GitHub issues/PRs, MCP, docs/RAG, and hosted workflow tooling until explicit gates are met.
- `docs/nwn-skill-pack/tools/check_architecture_scorecard.py` verifies that the scorecard matches current repo-artifact state and blocked release-candidate gate.
- `docs/nwn-skill-pack/architecture-decisions/adr-0001-skill-plugin-first.md` records the accepted `0.1.0` repo-artifact decision to use skill plus plugin first and defer repo-template, MCP, docs/RAG, and hosted workflow tooling until gates are met.
- `docs/nwn-skill-pack/tools/check_architecture_decisions.py` verifies that the architecture ADR still matches the current `version-manifest.json` repo-artifact state and blocked release-candidate gate.
- `docs/nwn-skill-pack/maintainer-decision-index.md` routes common maintainer situations to the correct repo artifact, checker, evidence boundary, and escalation option.
- `docs/nwn-skill-pack/tools/check_maintainer_decision_index.py` verifies that the maintainer decision index still names existing manifest artifacts, checker routes, evidence boundaries, and skill/plugin/MCP/repo-template/docs-RAG choices.
- `docs/nwn-skill-pack/versioning-policy.md` defines package states, SemVer decisions, human feedback release path, compatibility boundaries, and current blocked release-candidate status.
- `docs/nwn-skill-pack/tools/check_versioning_policy.py` verifies that the versioning policy still matches `version-manifest.json`, plugin version metadata, SemVer policy presence, and blocked RC gate state.
- `docs/nwn-skill-pack/tools/check_external_source_registry.py` verifies trust tiers, key source lanes, compact source-registry synchronization, and the rule that external docs do not replace target runtime tests.
- `docs/nwn-skill-pack/tools/check_domain_reference_status.py` verifies that main NWN domain references in both the authoring skill and plugin-packaged skill keep source-status sections, `docs-verified` labels, `runtime-tested` labels, source-backed fact sections, runtime-verification sections, and source sections.
- `docs/nwn-skill-pack/draft-skills/nwn-server-gamedev/references/server-gamedev-capability-map.md` routes multi-domain NWN server tasks to references, expected artifacts, evidence labels, and escalation choices.
- `docs/nwn-skill-pack/tools/check_capability_map.py` verifies that the capability map is routed from both skill copies, synchronized, and still names the expected domains plus skill/plugin/workflow/repo-template/MCP/docs-RAG/runtime escalation options.
- `docs/nwn-skill-pack/draft-skills/nwn-server-gamedev/references/feature-design-output-template.md` and the plugin-packaged copy define the full output contract for multi-domain NWN server feature designs.
- `docs/nwn-skill-pack/tools/check_feature_design_template.py` verifies that the feature design output template is routed from both skill copies, synchronized, and still names required sections, domains, evidence labels, runtime QA, blockers, and feedback capture.
- `docs/nwn-skill-pack/tools/run_repo_artifact_preflight.py` runs the repo-artifact generation and validation sequence in the correct order, including derived docs, inventory, local install sandbox, marketplace sandbox, and final checks.
- `docs/nwn-skill-pack/tools/check_local_aurora_reverse_scope.py` verifies that local Aurora reverse/thread intake docs remain `local-reverse-lead` maintainer material, include boundary language for `C:\Projects\New Folder` and thread `019ed62e-3e0f-7253-91ff-f529be54abfe`, and stay out of plugin install contents.
- Manifest-anchored local Aurora chain:
  - `local-aurora-reverse-ingestion.md` records local thread and `C:\Projects\New Folder` intake boundaries.
  - `local-thread-019ed62e-aurora-ui-gallery-intake.md` records the stopped-thread freshness boundary and batch82 as passive UI intake only.
  - `local-aurora-symbol-index.md` is generated from local reverse/export text and remains `local-reverse-lead`.
  - `local-aurora-small-location-live-operator-checklist.md` turns those leads into a `small-location-first-pass` live-capture route.
  - `local-aurora-live-gap-queue.md` keeps targeted second-pass gaps as maintainer-only work until reviewed live records exist.
- This local Aurora chain is not official NWN documentation, not installed skill content, and not answerable guidance until a reviewed Aurora live record and accepted promotion record exist.
- `docs/nwn-skill-pack/tools/generate_feedback_promotion_backlog.py` generated `docs/nwn-skill-pack/knowledge-inbox/promotion-backlog.md` as the maintainer triage view across incoming, reviewed, promoted, and rejected records.
- `docs/nwn-skill-pack/knowledge-inbox/lifecycle-policy.md` defines same-id `incoming` plus reviewed/rejected/promoted copies as audit history rather than active review work.
- `docs/nwn-skill-pack/knowledge-inbox/rejected/20260618T075533Z-nui-feedback-record-smoke-test.json` is a rejected reviewed copy proving the review path without promoting smoke-test knowledge.
- `docs/nwn-skill-pack/tools/reference_promotion_record.py`, `docs/nwn-skill-pack/knowledge-inbox/schema/reference-promotion-record.schema.json`, `docs/nwn-skill-pack/tools/check_reference_promotion_records.py`, and `docs/nwn-skill-pack/knowledge-inbox/reference-promotions/aggregate.md` define and check the maintainer decision record for accepted, held, or rejected reference-promotion outcomes.
- `docs/nwn-skill-pack/tools/generate_version_bump_plan.py`, `docs/nwn-skill-pack/tools/check_version_bump_plan.py`, and `docs/nwn-skill-pack/version-bump-plan.md` derive the next-version recommendation from accepted reference promotion records and current `version-manifest.json`.
- `docs/nwn-skill-pack/tools/forward_test_record.py` can create, validate, and aggregate forward-test records.
- `docs/nwn-skill-pack/forward-tests/schema/forward-test-record.schema.json` captures the current forward-test record contract.
- `docs/nwn-skill-pack/tools/check_record_contracts.py` verifies that JSON Schema enums, required fields, and patterns match the local feedback and forward-test CLIs.
- `docs/nwn-skill-pack/forward-tests/reviewer-matrix.json` is the reviewer-only expected-reference and scoring-focus matrix for FT-001 through FT-008.
- `docs/nwn-skill-pack/tools/generate_forward_test_execution_queue.py` generates no-answer-leak `forward-tests/execution-queue.md` from the reviewer matrix and current prompt-forward-test records.
- `docs/nwn-skill-pack/tools/generate_forward_test_reviewer_packet.py` generates reviewer-only `forward-tests/reviewer-packet.md` from `reviewer-matrix.json`.
- `docs/nwn-skill-pack/tools/generate_forward_test_record_templates.py` generates reviewer-only `forward-tests/record-command-templates.md` from `reviewer-matrix.json`.
- `docs/nwn-skill-pack/tools/check_forward_test_prompts.py` verifies that FT-001 through FT-008 prompt files are present, self-contained, invoke the skill by path, do not contain obvious expected-answer leakage, match the reviewer-only matrix, and have fresh generated reviewer packet plus record command templates.
- `docs/nwn-skill-pack/forward-tests/records/pkg-000-static-plugin-package-audit.json` is a valid static-check record for the plugin package audit.
- `docs/nwn-skill-pack/forward-tests/aggregate.md` was generated from forward-test records.
- `docs/nwn-skill-pack/forward-tests/tester-packet.md` and `docs/nwn-skill-pack/forward-tests/prompts/` provide prepared forward-test handoff artifacts; they are not executed test evidence by themselves.
- `docs/nwn-skill-pack/forward-tests/evidence-acceptance-policy.md` is the local acceptance rule for counting future prompt-forward-test records toward RC; it is not prompt evidence by itself.
- `docs/nwn-skill-pack/forward-tests/answer-capture-template.md` provides prepared raw-answer capture scaffolding; it is not evidence until a tester fills it from a fresh context.
- `docs/nwn-skill-pack/forward-tests/rc-prompt-test-handoff.md` provides prepared external-tester handoff scaffolding; it is not prompt-forward-test evidence by itself.
- `docs/nwn-skill-pack/forward-tests/install-smoke-checklist.md` defines how to record local plugin install or marketplace smoke evidence without treating it as NWN runtime proof.
- The feedback script was smoke-tested with `knowledge-inbox/incoming/20260618T075533Z-nui-feedback-record-smoke-test.json`.
- `docs/nwn-skill-pack/plugin-release-candidate-checklist.md` captures the current plugin RC gate from local `plugin-creator` rules and current draft plugin state.
- `docs/nwn-skill-pack/release-handoff-template.md` captures the reusable handoff/release-notes template and feedback command shape from local plugin and feedback-tool behavior.
- `docs/nwn-skill-pack/release-handoffs/nwn-server-gamedev-pack-0.1.0-repo-artifact.md` is the concrete 0.1.0 repo-artifact review handoff; it is filled but intentionally does not claim RC, install, or public release status.
- `docs/nwn-skill-pack/architecture-escalation-roadmap.md` captures project policy for staying with skill/plugin first and escalating to repo-template, MCP, or RAG only after explicit gates.

## Hypotheses

These are design decisions for the NWN project, not verified Codex product facts:

- `nwn-server-gamedev` should be an umbrella skill with domain references.
- A Git repository should be the source of truth for review, versioning, and releases.
- A local feedback inbox plus contribution bundle is the safest first contribution mechanism.
- Human feedback should strengthen later package versions through maintainer review and releases, not by mutating an installed skill during another user's session.
- MCP or RAG should wait until the knowledge base outgrows static references.
- A plugin should become the distribution format once the skill pack is stable enough for other users.
- `nwn-server-gamedev-pack` should first move through repo artifact -> release candidate -> local install candidate -> public release, but that staged boundary is a project release policy rather than Codex product behavior.
- The release handoff template and concrete handoff files are project release artifacts; they are not part of the installed skill and should not be treated as Codex product documentation.
- The escalation roadmap is project policy, not Codex product behavior. It should be revised after real forward tests, install tests, or contribution volume change the bottleneck.
- Record schemas are local project contracts. They are verified against local CLIs, but they do not prove that contributed facts are correct.
- The forward-test reviewer matrix is an evaluation aid, not an answer source for the agent under test.
- The forward-test execution queue, reviewer packet, and record command templates are reviewer scaffolds. They do not prove that any test has run or that expected references were observed.
- The evidence acceptance policy and release-gate enforcement prove only local counting rules. They do not prove that future records are honest or uncontaminated.
- The answer capture template is tester scaffolding. It does not prove that a raw answer was captured, that no leak occurred, or that the answer should pass.
- The RC prompt-test handoff is external-tester scaffolding. It does not prove that anyone ran the prompts or that the captured answers are independent.
- The `.codex-tmp` forward-test dispatch bundle is prompt-test transport scaffolding. It proves the minimum RC prompt files and blank capture sheets were assembled without reviewer-only expected-reference leakage, not that any fresh context ran, answered, or passed.
- The forward-test return capture checker is a structural intake guard. It can reject blank or reviewer-contaminated capture sheets, but it does not prove answer truth, tester honesty, model quality, or NWN runtime behavior.
- The RC unblock playbook is maintainer process scaffolding. It proves the intended no-answer-leak test procedure, not that any fresh context ran or passed.
- The `EXT-001` external trial handoff is start scaffolding for an outside-builder intake trial. It does not prove that anyone received the packet, followed it, returned complete artifacts, or supplied true NWN knowledge.
- The `EXT-001` tester message is send-message scaffolding. It proves the message can be generated with the current ZIP SHA-256 and boundaries, not that it was delivered, read, understood, or followed.
- The `.codex-tmp` external trial public packet and ZIP archive are transport scaffolding. The checker proves local ZIP/file-set, ZIP-extraction, CLI help, and synthetic command-path behavior only, not delivery, tester independence, real contributor completion, privacy safety, feedback truth, or NWN runtime behavior.
- The `.codex-tmp` external trial cleanroom is received-archive scaffolding. It proves local ZIP copy, extraction, and copied CLI behavior from scratch storage only, not outside-human usability, private-data safety, feedback truth, or NWN runtime behavior.
- The `.codex-tmp` external trial dispatch bundle is send-assembly scaffolding. It proves the current ZIP and tester message were copied together with hashes, not that they were delivered, read, understood, completed, or safe to promote.
- The `.codex-tmp` external trial received-dispatch smoke is recipient-side local scaffolding. It proves only that a copied dispatch folder can be used from scratch inbox files without repo-source reads, not that a real outside tester succeeded.
- `maintainer_verification.cleanroom_check` in an external trial record records local handoff mechanics only. It does not turn a tester response into accepted NWN knowledge.
- `maintainer_verification.independent_tester` in an external trial record is a maintainer assertion about tester independence or clean-clone status. It is required for `pass`, but still does not prove feedback truth, privacy safety, or NWN runtime behavior by itself.
- The install-smoke execution playbook is maintainer process scaffolding. It proves the intended INSTALL-001 procedure and evidence boundary, not that any plugin registration, install, or fresh-context invocation has happened.
- `install_verification` in an install-smoke record is a tester/maintainer assertion that required install-smoke observations happened. It blocks preparation-only pass records, but it is still not NWN runtime proof or public marketplace proof.
- The install-smoke record checker proves only local record-policy enforcement and current record validity. It does not prove any `INSTALL-*` test happened when no accepted install-smoke record exists.
- The forward-test prompt checker proves only prompt-packet, reviewer-matrix, execution-queue, reviewer-packet, and record-template hygiene. It does not prove that any fresh model session has passed the prompts or that the skill is useful for a real NWN server task.
- Human feedback forms are intake aids, not trusted knowledge. Maintainers must still convert them to feedback records, validate them, and review them before promotion.
- The feedback lifecycle checker proves local inbox consistency only. It does not prove privacy safety, claim truth, reference correctness, future model answer quality, or NWN runtime behavior.
- The reference promotion proposal template and generator are patch planning, not proof. They do not prove the accepted claim, the patch, a future release, or a future answer improvement.
- Reference promotion records prove maintainer process only. They can show that a proposal was accepted, held, or rejected and that local checks were recorded, but they do not prove underlying NWN truth, fresh Codex answer quality, plugin installation, public marketplace behavior, or NWN runtime behavior.
- The version bump plan is advisory release bookkeeping. It does not edit manifests, create a release, prove RC/install readiness, or prove that promoted knowledge improves future Codex answers.
- The contributor intake quickstart is handoff guidance, not trusted NWN knowledge. It proves the intended human contribution path, not the truth of any future submission.
- The model-import policy is an intake guardrail. It does not make any Claude, Opus, Codex, or other model output trustworthy without documentation or runtime evidence.
- The architecture ADR is a local project decision, not Codex product behavior. It should change when forward tests, install tests, contribution volume, or real server feature slices change the bottleneck.
- The maintainer decision index is local routing policy. It does not prove that a future project should choose skill, plugin, MCP, repo-template, workflow tooling, or docs/RAG without fresh evidence.
- The versioning policy is a local release contract. It should be revised when package states, compatibility rules, or public distribution rules change.
- The external source registry checker is static; it confirms local registry structure, not live URL availability or truth of every external page.
- The domain reference status checker is static; it confirms source-status hygiene and authoring/plugin sync for selected domain files, not truth of every NWN claim or runtime readiness.
- The server gamedev capability map is package guidance for routing and escalation. It is not proof that a future project should choose skill, plugin, MCP, docs/RAG, workflow tooling, or repo-template without fresh context.
- The capability map checker proves only map shape, route presence, and sync. It does not prove the quality of downstream answers.
- The feature design output template is installed skill guidance, not runtime evidence. Its checker proves output-shape and sync only.
- The feedback-intake doc checker proves form/CLI vocabulary alignment, not truth of submitted feedback.
- The contributor intake quickstart checker proves only vocabulary, command-shape, privacy, and release-boundary alignment. It does not prove contributor environment setup, installation, or feedback truth.
- The model-import policy checker proves only local CLI vocabulary and trust-boundary alignment. It does not prove imported model claims.
- The local Aurora reverse scope checker proves only local boundary hygiene, not correctness of decompiled-symbol interpretation, exact Toolset UI behavior, public redistributability, or NWN runtime behavior.
- The architecture decision checker proves only current ADR/manifest/gate alignment. It does not prove the selected architecture is permanently best.
- The versioning policy checker proves only local policy/manifest/plugin-version alignment. It does not prove that any release has been tested by another user.
- The promotion backlog is a triage report over records on disk. It does not prove that any listed NWN claim is true or ready to merge.
- The lifecycle policy is local repository policy. Other teams may choose to move or delete source records after review, but that should be explicit.
- The version manifest is local release metadata, not Codex product metadata. The installed skill still uses only required `SKILL.md` frontmatter.
- The release-readiness report is generated local release metadata. It summarizes records and blockers, but does not prove NWN runtime correctness.
- The release-readiness checker proves report freshness against local manifests and records. It does not prove that the blockers are complete policy or that the package is useful in practice.
- The release evidence index is generated local evidence bookkeeping. It separates static checks, install-smoke evidence, prompt-forward evidence, and runtime evidence, but it does not turn any missing evidence into proof.
- The release evidence index checker proves only freshness against local records and gate snapshots. It does not prove that record contents are true or that the package is ready for RC.
- The RC blocker burn-down is generated local planning metadata. It names current blockers and a minimal recommended forward-test trio, but it does not prove any test has run or passed.
- The RC blocker burn-down checker proves only freshness against the current gate and reviewer matrix. It does not prove that the recommended trio is sufficient in practice.
- The repo-artifact preflight runner proves only local generation/check ordering for the current repo artifact. It does not prove RC readiness, install in a fresh Codex thread, public distribution, or NWN runtime correctness.
- The package inventory proves file identity for the local artifact at generation time. It does not prove installability, marketplace state, or NWN runtime behavior.
- The package inventory checker proves local inventory freshness against files on disk. It does not prove that the selected package contents are sufficient, installable, or semantically correct.
- The package boundary checker proves local package hygiene between skill, plugin, and handoff layers. It does not prove that the plugin can be installed in another Codex environment or that the skill answers NWN tasks well.
- The install candidate builder proves that the current plugin boundary can be copied into a clean local plugin root. It does not prove marketplace installation, trigger behavior, or runtime usefulness.
- The local marketplace candidate builder proves only local marketplace file shape and relative source path generation. It does not run `codex plugin marketplace add`, install the plugin, or prove Codex UI discovery.
- The install candidate checker proves only local sandbox freshness against package inventory hashes and marketplace file shape. It does not install the plugin, start a fresh Codex thread, or prove trigger behavior.
- The isolated install layout checker proves only that the current plugin and marketplace sandbox can be copied into a fake `CODEX_HOME` layout and keep their expected file shape. It does not register a marketplace, install the plugin, prove fresh-thread skill visibility, or create install-smoke-test pass evidence.
- The install smoke packet proves only that a tester handoff can be generated from current local paths. It does not prove that a tester has run the command, started a new thread, or observed the skill.
- The install smoke packet checker proves only that the handoff text matches the local manifest and marketplace sandbox. It does not prove that Codex registered the marketplace or loaded the skill in a new thread.
- The release gate checker is local project policy. It verifies that required evidence records exist for a claimed package state, but it does not prove that those records contain true NWN runtime facts.
- An install smoke test proves only package visibility/invocation in a Codex context. It does not prove NWN domain correctness, module behavior, or runtime readiness.

## Open Research

- Confirm the best public distribution path for third-party Codex plugins outside a single workspace.
- Decide when the draft plugin should move from repo artifact to installable marketplace-backed package.
- Decide whether a hosted MCP server is worth building for community feedback ingestion.
- Gather NWN-specific authoritative sources for NUI, NWScript, 2DA, HAK/TLK, NWSync, and NWNX rather than relying on model memory.
- Forward-test the draft skill with realistic server-building prompts.

## NWN Source Discovery Status

Initial external source registry created at `external-nwn-source-registry.md`.

Current source quality:

- NWNX has a strong project-owned documentation source.
- Testing/runtime QA now has a primary compile-tool source through `neverwinter.nim`, strong community vanilla instrumentation sources through NWN Lexicon, and primary NWNX-only logging/console lanes through NWNX:EE docs.
- Area/tileset structure has useful community documentation through NWNWiki/Fandom, while runtime area/transition scripting has strong community documentation through NWN Lexicon.
- Creature/encounter structure has useful community documentation through NWNWiki/Fandom, while creature/encounter event behavior has strong community documentation through NWN Lexicon.
- Item/equipment/loot structure has useful community documentation through NWNWiki/Fandom, while item creation, property, inventory-fit, and item-event behavior has strong community documentation through NWN Lexicon.
- Economy/crafting/progression has strong community documentation through NWN Lexicon money, store, experience, and item-creation pages; default Toolset crafting behavior is covered by NWNWiki/Fandom craft pages; NWNX Store and SkillRanks are primary NWNX-only extension lanes.
- Quest/dialogue/journal scripting has strong community documentation through NWN Lexicon conversation and journal pages, while simple Toolset quest helpers are community examples only.
- Campaign DB and built-in EE SQLite have strong community documentation through NWN Lexicon.
- NWScript and NUI functions have strong community documentation through NWN Lexicon.
- NUI non-scripting/assets have useful community documentation through nwn.wiki.
- 2DA/TLK/HAK have useful community structural docs, but release-safe guidance still needs runtime/current-file verification.
- NWSync tooling now has a primary/current source lane through `neverwinter.nim`, with legacy `Beamdog/nwsync` confirming the migration.
- Server/client config has a useful `settings.tml` source lane, but exact server settings still require target-installation and runtime verification.

## Promoted Domain Notes

### Testing, Runtime QA, Antipatterns

Updated `draft-skills/nwn-server-gamedev/references/testing-runtime-qa.md`, `draft-skills/nwn-server-gamedev/references/common-antipatterns.md`, and the plugin-packaged copies with `docs-verified` guidance from:

- `neverwinter.nim` README.
- `neverwinter.nim` `nwn_script_comp.nim` source help text.
- Beamdog NWN:EE docs/changelog lane.
- NWN Lexicon Debug Functions category index.
- NWN Lexicon `PrintString`.
- NWN Lexicon `WriteTimestampedLogEntry`.
- NWN Lexicon `SendMessageToPC`.
- NWN Lexicon `GetIsObjectValid`.
- NWN Lexicon `OBJECT_SELF`.
- NWN Lexicon Preprocessors.
- NWN Lexicon `GetScriptBacktrace`.
- NWN Lexicon NWN:EE Script Editing Tutorial.
- NWNX:EE Core/plugin management docs.
- NWNX:EE Util docs.

Verified into the skill:

- `neverwinter.nim` includes the official NWN:EE script compiler source and CLI utility.
- `nwn_script_comp` compiles one or many scripts and has source/output options.
- Compile success is a distinct evidence level and does not prove event ownership, runtime behavior, multiplayer behavior, persistence, packaging, or live safety.
- Lexicon Debug functions are the vanilla source-discovery lane for debug/test helpers.
- `PrintString` and `WriteTimestampedLogEntry` are log-output lanes.
- `SendMessageToPC` is useful for visible debug feedback, but message flooding can drop messages.
- `GetIsObjectValid` is the safer check for object references that may be stale, destroyed, stored, or returned from lookup functions.
- `OBJECT_SELF` is valid for the current script, but delayed scripts against destroyed caller objects can fail to invoke.
- EE preprocessor macros can add traceable file/function/line data when the target compiler version supports them.
- `GetScriptBacktrace` can generate VM debug views but depends on debug information for symbols and can be slow.
- NWNX Core docs expose log level, log formatting, log file path, console `runscript`, `eval`, and plugin loading/log-level environment variables.
- NWNX Util docs expose NWNX-only server console command registration and user-directory helper lanes.
- A release-proof bundle should distinguish design, static checks, compile, instrumentation, runtime observation, regression paths, packaging, rollback, and live monitoring.

Still hypothesis until project/runtime-tested:

- Any specific feature's correctness, balance, persistence, performance, or live safety.
- Any claim that a compile result proves event accessors or `OBJECT_SELF` ownership.
- Any claim that a local test proves multiplayer, restart, clean-client, rollback, or live behavior.
- Any NWNX console/logging/utility workflow unless the target server loads the relevant NWNX plugin/config.
- Any general antipattern severity without checking the target module's actual house rules and risk profile.

### NUI

Updated `draft-skills/nwn-server-gamedev/references/nui-player-ui.md` and the plugin-packaged copy with `docs-verified` guidance from:

- NWN Lexicon NUI function category.
- NWN Lexicon `NuiCreate`.
- NWN Lexicon `NuiSetBind`.
- NWN Lexicon `NuiSetBindWatch`.
- NWN Lexicon `OnNuiEvent`.
- nwn.wiki NUI page.

Verified into the skill:

- NUI is an NWN:EE custom UI window system exposed to builders through JSON and helper functions.
- `NuiCreate` creates a per-player window and returns a token on success.
- Window ids should be short/alphanumeric and per-client duplicate creation closes the old window.
- `OnNuiEvent` handles interaction with widgets that have `NuiId`.
- Missing `NuiId` is a known/common cause of missing widget events.
- `NuiSetBind` syncs compatible JSON values and no auto-conversion should be assumed.
- Watched binds can invoke handlers immediately and recursive watched-bind mutation is a stack-overflow risk.
- Hardcoded NUI skin overrides have different client-delivery constraints from ordinary panel images.

Still hypothesis until runtime-tested:

- Any specific panel design, bind schema, or asset packaging plan for a real server.
- Any claim that NUI visual assets render correctly on a target client.
- Any claim that event routing, watched binds, or refresh behavior is release-ready.

### 2DA, HAK, TLK

Updated `draft-skills/nwn-server-gamedev/references/two-da-hak-tlk-pipeline.md` and the plugin-packaged copy with `docs-verified` structural guidance from:

- NWNWiki/Fandom `.2da`.
- NWNWiki/Fandom `.tlk`.
- NWNWiki/Fandom `Hak pak`.
- Beamdog NWN:EE docs/changelog as the version-change check lane.

Verified into the skill:

- `.2da` files are plain-text two-dimensional tables used by the game/tools for rules and engine data.
- `.2da` files are whitespace-sensitive and spaces split columns unless values are quoted.
- Scripts can read `.2da` column data with `Get2DAString`.
- `.tlk` files store player-facing text by StringRef.
- A custom module can use an additional custom `.tlk`, placed in the game's `tlk` directory.
- HAK files package custom content for modules.
- Players need required HAK content client-side unless another distribution mechanism supplies it.
- Module HAK order matters when duplicate resources exist.
- HAK resources can override module resources, so edits saved into the module can be ignored when a HAK-owned resource has precedence.

Still hypothesis until project/runtime-tested:

- Specific row ranges, StringRef ranges, HAK layer ownership, and package order for a target server.
- Whether a historical or extracted 2DA snapshot matches the target NWN:EE install.
- Whether NWSync/manual install/launcher distribution delivers all required client files.
- Whether rollback restores old behavior for a real module and clean client.

### NWScript

Updated `draft-skills/nwn-server-gamedev/references/nwscript-events-systems.md` and the plugin-packaged copy with `docs-verified` guidance from:

- NWNWiki/Fandom NWScript.
- NWNWiki/Fandom `OBJECT_SELF`.
- NWN Lexicon Events.
- NWN Lexicon Module Events.
- NWN Lexicon `OnModuleLoad`.
- NWN Lexicon `ExecuteScript`.
- NWN Lexicon `DelayCommand`.
- NWN Lexicon `AssignCommand`.

Verified into the skill:

- NWScript controls NWN objects, items, NPCs, modules, and other behavior.
- NWScript is C-like but does not have arrays or the standard C library.
- NWN object behavior is driven through event scripts attached to object/event categories.
- Module events include persistent-world hooks such as client enter/leave, heartbeat, module load, NUI, player events, item acquire/lost, and user-defined events.
- `OnModuleLoad` can run in new-game and save-game contexts, so initialization should be idempotent.
- `OBJECT_SELF` is the object running the current script; event handlers use the object whose event is handled, while spell scripts run by the caster.
- `ExecuteScript` runs a compiled script on a target object and initializes `OBJECT_SELF` to that target.
- `ExecuteScript` is immediate/inline unless deliberately delayed.
- `DelayCommand` is caller-context-bound and can fail when the caller is destroyed.
- `AssignCommand` changes execution/action context; using it with `OBJECT_SELF` usually means object ownership must be reviewed.

Still hypothesis until project/runtime-tested:

- Any script implementation for a real module.
- Any event accessor choice unless verified in the exact event.
- Any delayed/assigned/executed call chain unless compiled and tested with logs.
- Any claim that persistence/state ownership is correct for a target server.

### Deployment, NWSync, Ops

Updated `draft-skills/nwn-server-gamedev/references/deployment-nwsync-ops.md` and the plugin-packaged copy with `docs-verified` guidance from:

- `neverwinter.nim` README.
- `neverwinter.nim` `nwn_nwsync_write` source help text.
- `neverwinter.nim` `nwn_nwsync_print` source help text.
- `neverwinter.nim` `nwn_nwsync_prune` source help text.
- Legacy `Beamdog/nwsync` repository migration notice.
- NWNWiki/Fandom `settings.tml`.

Verified into the skill:

- `settings.tml` replaced most previous client/server `.ini` settings and is TOML with an embedded schema.
- `settings.tml` contains deployment-relevant sections such as `net`, `nwsync`, `nwscript`, and `server`.
- `neverwinter.nim` contains NWN:EE data-file CLI tools and the official open-source script compiler CLI.
- `neverwinter.nim` includes NWSync tools described as the official way to maintain a server-side NWSync repository.
- The legacy `Beamdog/nwsync` repository points newer releases and development to `neverwinter.nim`.
- `nwn_nwsync_write` creates a server-side manifest and updates the repository `latest` pointer by default.
- `nwn_nwsync_write` supports module, ERF/HAK, TLK/single-file, and directory inputs, and warns not to use `--with-module` for persistent worlds.
- `nwn_nwsync_print --verify` verifies manifest file presence and checksums.
- `nwn_nwsync_prune` performs repository housekeeping, including `latest` pointer checks and unreferenced-data pruning.

Still hypothesis until project/runtime-tested:

- Any claim that a generated NWSync repo is reachable by the real server and client.
- Any exact `settings.tml` value for a real deployment.
- Any HTTP hosting, cache, clean-client download, HAK/TLK delivery, rollback, or live migration plan.
- Any prune operation unless current and rollback manifests are known and backed up.

### Persistence, Database, NWNX

Updated `draft-skills/nwn-server-gamedev/references/persistence-database-nwnx.md` and the plugin-packaged copy with `docs-verified` guidance from:

- NWN Lexicon Campaign Database function category.
- NWN Lexicon SQL function category.
- NWN Lexicon `sqlquery`.
- NWN Lexicon `SqlStep`.
- NWN Lexicon `GetCampaignString`.
- NWN Lexicon `SetCampaignString`.
- NWNX:EE main docs.
- NWNX:EE core/plugin management docs.
- NWNX:EE SQL plugin docs.
- NWNX:EE SQL migration guide.
- NWNX:EE NWSQLiteExtensions docs.

Verified into the skill:

- Campaign DB functions store typed values under campaign/variable names and optional player association.
- Documented campaign DB functions treat campaign names as case-sensitive and strip spaces in campaign names.
- Documented campaign DB notes warn about variable-name limits, savegame independence, and player-associated data caveats.
- Built-in EE SQLite exposes SQL functions including prepare, bind, step, get, reset, and destroy helpers.
- `sqlquery` is the prepared-query type returned by object/campaign prepare functions.
- `SqlStep` both executes and fetches, and false can mean no row rather than an execution failure.
- NWNX:EE is a framework for extending NWN:EE with new script commands, external tools/databases, and hardcoded-rule changes.
- NWNX:EE is natively Linux-focused, with Windows use through Docker or WSL/WSL2.
- NWNX:EE module integration requires importing release `NWScript.zip` scripts and rebuilding scripts after NWNX updates.
- NWNX plugin loading/config uses environment variables before server start.
- NWNX SQL supports MySQL, PostgreSQL, and SQLite through `NWNX_SQL_TYPE`.
- NWNX SQL migration guidance favors prepared statements with bound data over raw SQL string assembly.
- NWNX NWSQLiteExtensions can extend the built-in SQLite DB and expose read-only 2DA virtual tables when enabled.

Still hypothesis until project/runtime-tested:

- Any concrete schema, key naming, account/character ownership model, or migration for a real server.
- Any claim that state survives relog, restart, crash, or rollback.
- Any claim that a NWNX plugin is loaded/configured on a target runtime.
- Any claim that object serialization, cleanup, or database bloat behavior is acceptable.

### Locations, Areas, Tilesets

Updated `draft-skills/nwn-server-gamedev/references/locations-areas-tilesets.md` and the plugin-packaged copy with `docs-verified` guidance from:

- NWNWiki/Fandom Area.
- NWNWiki/Fandom Tileset.
- NWNWiki/Fandom Create area transition.
- NWN Lexicon Trigger Events.
- NWN Lexicon `CreateArea`.
- NWN Lexicon `CopyArea`.
- NWN Lexicon `SetTransitionTarget`.
- NWN Lexicon `GetTransitionTarget`.
- NWN Lexicon `GetArea`.
- NWNX:EE Area docs.

Verified into the skill:

- An area is a single module setting where a player can move and act without taking a transition.
- NWN areas have documented tile-size limits and can be non-square.
- Each area uses one tileset.
- Tilesets are themed tile collections with interaction rules.
- Toolset area transitions are trigger polygons with destination configuration.
- Trigger scripts use the trigger as `OBJECT_SELF`.
- `CreateArea` instances an area from a source resref and can assign tag/name.
- `CopyArea` copies a live area and runtime changes except players.
- Generated/copied areas require transition adjustment or players may go to the wrong destination.
- Door/trigger transition targets can be inspected or rebound with transition target functions.
- Transition target caching/tag lookup makes tag-only transition mutation unsafe.
- `GetArea` can return invalid results, including transition-limbo caveats.
- NWNX Area functions are NWNX-only and include area property, transition, tile, and path helpers.

Still hypothesis until project/runtime-tested:

- Any concrete map layout, tileset choice, HAK dependency, encounter placement, or transition graph.
- Any claim that an area is walkable, readable, connected, or balanced.
- Any claim that generated/copied area cleanup and transition rebinding is correct.
- Any NWNX path/direct-line result unless confirmed with actual in-game movement and clients.

### Creatures, Encounters, AI

Updated `draft-skills/nwn-server-gamedev/references/creatures-encounters-ai.md` and the plugin-packaged copy with `docs-verified` guidance from:

- NWNWiki/Fandom Creature.
- NWNWiki/Fandom Encounter.
- NWNWiki/Fandom Challenge Rating.
- NWNWiki/Fandom Faction.
- NWN Lexicon Creature Events.
- NWN Lexicon Encounter Events.
- NWN Lexicon `OnSpawn`.
- NWN Lexicon `OnDeath`.
- NWN Lexicon `OnPerception`.
- NWN Lexicon `CreateObject`.
- NWN Lexicon `SetSpawnInCondition`.
- NWN Lexicon `DetermineCombatRound`.
- NWNX:EE Creature docs.

Verified into the skill:

- A creature is a mobile object with a creature-specific event set.
- Creature faction and personal reputation affect friendly/hostile/neutral reactions.
- Challenge Rating is a rough enemy-power indicator, not a complete balance proof.
- Encounter objects spawn creatures when a PC enters a specified area region.
- Encounters can reduce overhead before creatures are needed and can support repeatable spawns.
- Encounter spawn points affect where creatures appear; without spawn points creatures spawn around the triggering character.
- Creature and encounter event categories are explicitly documented.
- OnSpawn runs when a creature is created and is the usual default-behavior setup hook.
- SetSpawnInCondition writes creature-local AI spawn flags.
- OnPerception fires on heard/seen state changes and can involve non-PC edge cases.
- DetermineCombatRound is the generic include master function for NPC combat decisions.
- OnDeath can drive treasure, respawn, and follow-up spawns, while `DestroyObject` does not fire OnDeath.
- CreateObject can spawn creatures from a palette resref but has DelayCommand and OnSpawn-ordering caveats.
- Area OnEnter scripted spawning needs entering-object checks to avoid recursive creation loops.
- NWNX:EE Creature functions are NWNX-only and expose extra creature properties/mutation.

Still hypothesis until project/runtime-tested:

- Any creature blueprint stats, scripts, equipment, faction setup, CR value, or reward design for a real server.
- Any encounter scaling, spawn point, reset, exhausted, or respawn behavior.
- Any AI/perception/combat behavior beyond documented event semantics.
- Any loot/XP/economy/persistence side effect unless tested in game with representative party cases.

### Items, Equipment, Loot

Updated `draft-skills/nwn-server-gamedev/references/items-equipment-loot.md` and the plugin-packaged copy with `docs-verified` guidance from:

- NWNWiki/Fandom Item.
- NWNWiki/Fandom Item property.
- NWNWiki/Fandom Activate item.
- NWNWiki/Fandom Tag-based scripting.
- NWN Lexicon Module Events.
- NWN Lexicon `OnAcquireItem`.
- NWN Lexicon `OnPlayerEquipItem`.
- NWN Lexicon `OnUnAcquireItem`.
- NWN Lexicon `CreateItemOnObject`.
- NWN Lexicon `GetBaseItemFitsInInventory`.
- NWN Lexicon `AddItemProperty`.
- NWN Lexicon `GetFirstItemProperty`.
- NWN Lexicon Item Properties Functions.
- NWNX:EE Item docs.
- NWNX:EE ItemProperty docs.

Verified into the skill:

- Items are module objects that can be carried by characters or contained in inventories.
- The Toolset defines items in the item palette and some items can be equipped in inventory slots.
- Item properties can be magical or nonmagical, temporary or permanent, and appear in identified Special Properties.
- NWScript `itemproperty` values are constructed and then applied to items.
- `AddItemProperty` applies temporary or permanent item properties and script-added properties need duplicate/similar-property review.
- `GetFirstItemProperty`, `GetNextItemProperty`, and `GetIsItemPropertyValid` can iterate item properties.
- `CreateItemOnObject` creates items from blueprint resrefs, can override tags, caps stack size, and has stack-merge and inventory-failure caveats.
- `GetBaseItemFitsInInventory` can be used before important item grants.
- Activate Item / Unique Power triggers module `OnActivateItem` and can route through tag-based scripting.
- Tag-based scripting can use `MODULE_VAR_TAGBASED_SCRIPT_PREFIX` to reduce naming abuse/conflicts.
- Module item events include acquire, activate, equip, unequip, and unacquire hooks.
- `OnAcquireItem` has stack-change, gold, magical-bag, login-order, and object-reference caveats.
- `OnPlayerEquipItem` fires after successful equip, while `OnUnAcquireItem` fires when an item leaves PC or NPC inventory.
- NWNX:EE Item and ItemProperty functions are NWNX-only and expose extra inspection/mutation controls.

Still hypothesis until project/runtime-tested:

- Any item blueprint, property set, loot table, shop inventory, crafting recipe, or economy policy for a real server.
- Any claim that an item is balanced, equippable, usable, stack-safe, persistent, rollback-safe, or exploit-safe.
- Any event script ownership, tag-based route, inventory-fit branch, stack merge/split rule, or active item property behavior.
- Any NWNX item mutation unless the plugin is loaded and the behavior is verified in the target runtime.

### Economy, Crafting, Progression

Updated `draft-skills/nwn-server-gamedev/references/economy-crafting-progression.md` and the plugin-packaged copy with `docs-verified` guidance from:

- NWN Lexicon Money Functions.
- NWN Lexicon `GetGold`.
- NWN Lexicon `HasGold`.
- NWN Lexicon `GiveGoldToCreature`.
- NWN Lexicon `TakeGoldFromCreature`.
- NWN Lexicon `GetGoldPieceValue`.
- NWN Lexicon Stores Functions.
- NWN Lexicon `GetStoreGold`.
- NWN Lexicon `SetStoreGold`.
- NWN Lexicon `GetStoreMaxBuyPrice`.
- NWN Lexicon `SetStoreMaxBuyPrice`.
- NWN Lexicon `SetInfiniteFlag`.
- NWN Lexicon Experience Functions.
- NWN Lexicon `GiveXPToCreature`.
- NWN Lexicon `GetXP`.
- NWN Lexicon `SetXP`.
- NWN Lexicon `GetJournalQuestExperience`.
- NWN Lexicon Item Creation Functions.
- NWN Lexicon `CIUseCraftItemSkill`.
- NWN Lexicon `CICraftCheckBrewPotion`.
- NWN Lexicon `CICraftCheckScribeScroll`.
- NWN Lexicon `CraftBrewPotion`.
- NWN Lexicon Base Item constants.
- NWN Lexicon Feat constants.
- NWNWiki/Fandom Craft Armor.
- NWNWiki/Fandom Craft Weapon.
- NWNWiki/Fandom Craft Trap.
- NWNX:EE Store docs.
- NWNX:EE SkillRanks docs.

Also recorded as `community-example` lanes:

- NWNWiki/Fandom XP training system.

Verified into the skill:

- Economy design should map XP, gold, items, crafting outputs, vendor access, and progression gates as source/sink flows.
- Lexicon money functions cover creature gold reads/checks and giving/taking gold.
- `GiveGoldToCreature` is a currency faucet because it creates gold on the target creature rather than transferring it from another owner.
- `TakeGoldFromCreature` is a sink and has context/caller caveats that must be runtime-tested.
- `HasGold` checks affordability without removing gold; purchase/crafting flows still need an atomic re-check before removal.
- `GetGoldPieceValue` has item valuation edge cases such as unidentified, plot, and stack cases.
- Store functions expose store gold, max buy price, identify cost, inventory, infinite-stock, and open-store lanes.
- Stores do not automatically behave as balanced economic actors; finite gold, max buy price, and infinite-stock flags require explicit policy and transaction tests.
- `SetStoreGold` can configure finite or unlimited/no-store-gold behavior.
- `SetStoreMaxBuyPrice` can cap vendor purchases.
- `SetInfiniteFlag` affects whether a store item remains after purchase.
- Experience functions expose XP reads, direct total XP setting, XP awards, and journal quest XP lookups.
- `GiveXPToCreature` is an XP faucet with documented adjustment behavior.
- `SetXP` can reduce or directly set total XP and is therefore an admin/migration/loss tool, not an ordinary reward helper.
- `GetJournalQuestExperience` reads Journal Editor XP; journal entry changes should not be assumed to award XP automatically.
- Item creation functions and craft helpers can create items and perform some recipe/cost checks, but direct helper calls differ in prerequisite and cost behavior.
- `CIUseCraftItemSkill`, `CICraftCheckBrewPotion`, and `CICraftCheckScribeScroll` belong to scripted crafting/check lanes that need include and spellhook context review.
- `CraftBrewPotion` directly creates a potion and should not be exposed as a player craft path without prerequisite/cost wrappers.
- Default Craft Armor and Craft Weapon behavior is mostly nonmagical, includes appearance modification/material behavior, and requires HotU-era skill behavior context.
- Craft Trap creates trap kits from components through a radial/menu workflow and can lose components on failure.
- NWNX:EE Store and SkillRanks docs are NWNX-only extension lanes for deeper vendor and progression customization.

Still hypothesis until project/runtime-tested:

- Any concrete economy curve, gold faucet/sink value, XP table, level pace, shop markup, drop rate, crafting recipe, or anti-farm policy for a real server.
- Any claim that a shop/crafting/vendor system is exploit-safe, duplicate-safe, restart-safe, balanced, or fun.
- Any runtime behavior involving party rewards, multiclass XP adjustments, store transaction order, identify fees, infinite-stock flags, stolen items, full inventories, relog/restart, or rollback.
- Any NWNX Store/SkillRanks behavior unless the NWNX plugin is loaded and the behavior is verified in the target runtime.
- Any community XP training system pattern unless adopted, reviewed, and tested against the target server design.

### Quests, Dialogue, Journal

Updated `draft-skills/nwn-server-gamedev/references/quests-dialogues-journal.md` and the plugin-packaged copy with `docs-verified` guidance from:

- NWN Lexicon Conversation Functions.
- NWN Lexicon Journal Functions.
- NWN Lexicon `ActionStartConversation`.
- NWN Lexicon `BeginConversation`.
- NWN Lexicon Conversation Conditional Script.
- NWN Lexicon Conversation Action Script.
- NWN Lexicon Conversation End Script.
- NWN Lexicon Conversation Abort Script.
- NWN Lexicon `GetPCSpeaker`.
- NWN Lexicon `GetScriptParam`.
- NWN Lexicon `SetCustomToken`.
- NWN Lexicon `ActionPauseConversation`.
- NWN Lexicon `ActionResumeConversation`.
- NWN Lexicon `AddJournalQuestEntry`.
- NWN Lexicon `RemoveJournalQuestEntry`.
- NWNWiki/Fandom Start a conversation.

Also recorded as `community-example` lanes:

- NWNWiki/Fandom Add multiple journal entries.
- NWNWiki/Fandom Include questing.

Verified into the skill:

- `ActionStartConversation` queues an NPC action to start a conversation and can use an explicit dialogue resref or default conversation.
- `ActionStartConversation` supports conversations with NPCs, placeables, triggers, and doors, but not direct item conversations.
- `BeginConversation` attempts to start a conversation immediately and is normally used at the logical end of an `OnConversation` script.
- Conversation conditional scripts decide node/response visibility and action scripts fire when a node is selected.
- `GetPCSpeaker` is valid only in scripts called as part of a conversation.
- Conversation conditional/action scripts can use `GetScriptParam`; the function is an NWN:EE addition and supports reusable parameterized scripts.
- Conversation script `OBJECT_SELF` remains the original conversation object even when Speaker Tag makes another NPC speak.
- Reward-critical conversation action scripts should re-check prerequisites because the player can change inventory/state after a conditional branch is displayed.
- End scripts and abort scripts are different paths; abort causes include escape, combat, new conversation, range, familiar possession, and disconnect.
- `ActionPauseConversation` and `ActionResumeConversation` have action-queue, cancellation, and range caveats.
- `SetCustomToken` values are global, can be used in conversations and journal entries, and custom tokens `0-9` are reserved.
- `AddJournalQuestEntry` updates Quests or Completed Quests for a PC, party, or all PCs using journal category tag and entry ID.
- Journal category tags are case-sensitive and entry IDs normally advance upward unless override is allowed.
- The Completed tab comes from the Journal Editor completed flag.
- `RemoveJournalQuestEntry` removes a quest category and clears its local journal-entry integer.

Still hypothesis until project/runtime-tested:

- Any concrete quest state machine, dialogue branch, journal category, or reward path for a real server.
- Any claim that quest state survives relog, restart, crash, rollback, or migration.
- Any claim that multiplayer dialogue interruption, party sharing, and disconnect behavior is safe.
- Any claim that custom tokens, journal replay, and localized text are correct for simultaneous players.
- Any community include/helper pattern unless adopted, reviewed, and tested in the target module.
