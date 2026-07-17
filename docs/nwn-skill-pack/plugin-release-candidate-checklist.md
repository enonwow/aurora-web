# Plugin Release Candidate Checklist

## Purpose

Define the gate between a reviewed repo artifact and a plugin package that another person can install and test.

This checklist applies to:

- authoring skill: `docs/nwn-skill-pack/draft-skills/nwn-server-gamedev`
- packaged plugin: `docs/nwn-skill-pack/draft-plugins/nwn-server-gamedev-pack`

## Verified Codex Packaging Rules

Source: local `plugin-creator` skill and its `plugin-json-spec.md` / `installing-and-updating.md` references.

- Plugin manifests live at `.codex-plugin/plugin.json`.
- The plugin folder name and manifest `name` should match.
- Manifest `version` must use strict semantic versioning.
- Manifest must include real values for `name`, `version`, `description`, `author.name`, and required `interface` fields.
- `skills` should point to a relative skill folder path such as `./skills/`.
- Do not declare `apps` or `mcpServers` unless `.app.json` or `.mcp.json` actually exists.
- Do not declare assets such as icons, logos, or screenshots unless the files exist inside the plugin package.
- `validate_plugin.py <plugin-path>` is the preflight validation before handoff.
- Marketplace entries require `policy.installation`, `policy.authentication`, and `category`.
- Default personal marketplace flow uses `~/.agents/plugins/marketplace.json`.
- Non-default marketplace paths need explicit marketplace installation before giving install commands.
- During local update loops, prefer `update_plugin_cachebuster.py`; do not hand-edit marketplace config.
- After reinstalling an updated plugin, use a new Codex thread so the plugin's skills/tools are picked up.

## Current Package Status

Current draft plugin:

`docs/nwn-skill-pack/draft-plugins/nwn-server-gamedev-pack`

Current manifest:

`docs/nwn-skill-pack/draft-plugins/nwn-server-gamedev-pack/.codex-plugin/plugin.json`

Current state:

- `name`: `nwn-server-gamedev-pack`
- `version`: `0.1.0`
- `skills`: `./skills/`
- no MCP config declared
- no app manifest declared
- no icon/logo/screenshot assets declared
- plugin has passed `validate_plugin.py`
- plugin is not installed into a marketplace
- plugin is still a repo artifact, not a release candidate

## RC Gate

A release candidate can be declared only after all items pass:

1. Authoring skill `quick_validate.py` passes.
2. Plugin-packaged skill `quick_validate.py` passes.
3. Plugin root `validate_plugin.py` passes.
4. `tools/check_skill_routes.py` passes for the authoring skill.
5. `tools/check_skill_routes.py` passes for the plugin-packaged skill.
6. `tools/check_plugin_package.py` passes with no errors.
7. `version-manifest.json` exists, is current, and `tools/check_version_manifest.py` passes.
8. `tools/generate_release_readiness.py` regenerates `release-readiness.md`.
9. `tools/generate_package_inventory.py` regenerates `package-inventory.json` and `package-inventory.md`.
10. `tools/check_package_inventory.py` passes after inventory regeneration.
11. `package-boundaries.md` is current.
12. `tools/check_package_boundaries.py` passes, proving skill/plugin/repo handoff boundaries are still separate.
13. `tools/build_plugin_install_candidate.py docs/nwn-skill-pack --force` builds a clean local plugin root.
14. `tools/build_local_marketplace_candidate.py docs/nwn-skill-pack --force` builds a repo-local marketplace sandbox.
15. `tools/generate_install_smoke_packet.py docs/nwn-skill-pack --out docs/nwn-skill-pack/forward-tests/install-smoke-packet.md` refreshes the tester handoff packet.
16. `tools/check_install_smoke_packet.py docs/nwn-skill-pack` passes, proving the tester handoff matches the current manifest and marketplace sandbox.
17. Authoring skill and plugin copy are synchronized for all `SKILL.md`, `agents/`, `references/`, and `scripts/` files.
18. `scripts/nwn_skill_feedback.py --help` works in the skill copy.
19. Feedback record `new`, `validate`, and `aggregate` commands have a current smoke test.
20. `knowledge-inbox/schema/feedback-record.schema.json` parses and matches the feedback CLI contract.
21. `forward-test-plan.md` is current.
22. `tools/check_forward_test_prompts.py` passes, proving the no-answer-leak prompt packet is complete and self-contained.
23. `forward-tests/answer-capture-template.md` exists and `tools/check_forward_test_capture_template.py` passes, so raw answers are captured before reviewer-only scoring.
24. `forward-tests/evidence-acceptance-policy.md` exists and `tools/check_forward_test_evidence_policy.py` passes, so prompt-forward-test records count toward RC only with fresh/no-leak context and answer-capture artifacts.
25. `tools/forward_test_record.py` can create, validate, and aggregate forward-test records.
26. `forward-tests/schema/forward-test-record.schema.json` parses and matches the forward-test CLI contract.
27. `tools/check_record_contracts.py` passes, proving schemas and CLI constants match.
28. `tools/check_release_gate.py docs/nwn-skill-pack --target release-candidate` passes before the package is called an RC.
29. `tools/check_release_gate.py docs/nwn-skill-pack --target install-candidate` passes before the package is shared as an install candidate.
30. At least three realistic forward tests are run in fresh context and accepted by the evidence policy.
31. Every executed forward test has a valid record under `forward-tests/records/`.
32. `forward-tests/aggregate.md` is current.
33. `forward-tests/install-smoke-checklist.md` exists and is used for local install or marketplace smoke tests.
34. At least one install smoke test passes before the package is shared as an install candidate.
35. The install-smoke packet includes a decision table and does not allow `pass` from preparation commands alone.
36. Forward tests include NUI, 2DA/HAK/TLK or packaging, runtime QA, economy/progression, and feedback contribution coverage.
37. No forward test is `fail`.
38. Every `partial` forward test creates a feedback record or improvement issue.
39. `source-of-truth-map.md` lists verified Codex packaging facts and remaining hypotheses.
40. Release notes outside the skill folder identify skeletal domains, verified domains, forward-test results, and known gaps.
41. `release-handoff-template.md` is filled for the target handoff state.
42. No reference file promotes model/forum/user claims without evidence labels.
43. The plugin manifest does not claim apps, MCP servers, icons, screenshots, websites, privacy policy, or terms unless those entries are real and valid.
44. The package contains no local temp dependencies such as `.codex-tmp/pydeps`.
45. `knowledge-inbox/contributor-intake-quickstart.md` exists and `tools/check_contributor_intake_quickstart.py` passes.
46. `architecture-decisions/adr-0001-skill-plugin-first.md` exists and `tools/check_architecture_decisions.py` passes.
47. `versioning-policy.md` exists and `tools/check_versioning_policy.py` passes.
48. `knowledge-inbox/model-import-policy.md` exists and `tools/check_model_import_policy.py` passes.
49. `rc-blocker-burndown.md` exists and `tools/check_rc_blocker_burndown.py` passes.
50. `forward-tests/rc-prompt-test-handoff.md` exists and `tools/check_rc_prompt_test_handoff.py` passes.
51. `forward-tests/rc-unblock-playbook.md` exists and `tools/check_rc_unblock_playbook.py` passes.
52. `forward-tests/install-smoke-execution-playbook.md` exists and `tools/check_install_smoke_playbook.py` passes.
53. `maintainer-decision-index.md` exists and `tools/check_maintainer_decision_index.py` passes.
54. `feature-design-output-template.md` exists in both skill copies and `tools/check_feature_design_template.py` passes.

## Handoff Package Contents

For a repo-local RC, package or tag:

- `draft-plugins/nwn-server-gamedev-pack/.codex-plugin/plugin.json`
- `draft-plugins/nwn-server-gamedev-pack/skills/nwn-server-gamedev/`
- `version-manifest.json`
- `package-boundaries.md`
- `package-inventory.json`
- `package-inventory.md`
- `tools/nwn_skill_feedback.py`
- `tools/check_skill_routes.py`
- `tools/check_plugin_package.py`
- `tools/forward_test_record.py`
- `tools/check_record_contracts.py`
- `tools/check_version_manifest.py`
- `tools/check_release_handoff.py`
- `tools/generate_release_evidence_index.py`
- `tools/check_release_evidence_index.py`
- `tools/generate_rc_blocker_burndown.py`
- `tools/check_rc_blocker_burndown.py`
- `tools/check_rc_unblock_playbook.py`
- `tools/generate_release_readiness.py`
- `tools/generate_package_inventory.py`
- `tools/check_package_inventory.py`
- `tools/check_package_boundaries.py`
- `tools/build_plugin_install_candidate.py`
- `tools/build_local_marketplace_candidate.py`
- `tools/check_install_candidate.py`
- `tools/generate_install_smoke_packet.py`
- `tools/check_install_smoke_packet.py`
- `tools/check_install_smoke_playbook.py`
- `tools/generate_forward_test_execution_queue.py`
- `tools/generate_forward_test_reviewer_packet.py`
- `tools/generate_forward_test_record_templates.py`
- `tools/check_forward_test_prompts.py`
- `tools/check_release_gate.py`
- `tools/run_repo_artifact_preflight.py`
- `release-readiness.md`
- `release-evidence-index.md`
- `rc-blocker-burndown.md`
- `forward-tests/rc-prompt-test-handoff.md`
- `forward-tests/rc-unblock-playbook.md`
- `knowledge-inbox/schema/feedback-record.schema.json`
- `forward-tests/schema/forward-test-record.schema.json`
- `forward-tests/evidence-acceptance-policy.md`
- `forward-tests/reviewer-matrix.json`
- `forward-tests/execution-queue.md`
- `forward-tests/answer-capture-template.md`
- `forward-tests/reviewer-packet.md`
- `forward-tests/record-command-templates.md`
- `forward-tests/install-smoke-checklist.md`
- `forward-tests/install-smoke-packet.md`
- `forward-tests/install-smoke-execution-playbook.md`
- `forward-test-plan.md`
- `forward-test-results.md`
- `forward-tests/records/`
- `forward-tests/aggregate.md`
- `release-and-review-checklists.md`
- `source-of-truth-map.md`
- `external-nwn-source-registry.md`
- `tools/check_external_source_registry.py`
- `tools/check_domain_reference_status.py`
- `tools/check_capability_map.py`
- `tools/check_feature_design_template.py`
- `knowledge-inbox/contributor-intake-quickstart.md`
- `tools/check_contributor_intake_quickstart.py`
- `knowledge-inbox/model-import-policy.md`
- `tools/check_model_import_policy.py`
- `architecture-decisions/adr-0001-skill-plugin-first.md`
- `tools/check_architecture_decisions.py`
- `maintainer-decision-index.md`
- `tools/check_maintainer_decision_index.py`
- `versioning-policy.md`
- `tools/check_versioning_policy.py`
- `plugin-release-candidate-checklist.md`
- `release-handoff-template.md`
- `human-feedback-release-workflow.md`

Do not include:

- `.codex-tmp/`
- unreviewed `knowledge-inbox/incoming` records unless the release intentionally includes examples
- private project/module files
- private server logs
- credentials, account identifiers, or private Discord/forum transcripts

## Local Install Candidate Flow

Use only after the RC gate passes.

1. Copy or move the plugin to the chosen local plugin source directory.
2. If using a personal marketplace, create/update the marketplace entry through the plugin scaffold flow, not by hand.
3. Ensure the marketplace entry has:
   - `name: nwn-server-gamedev-pack`
   - `source.source: local`
   - `source.path: ./plugins/nwn-server-gamedev-pack`
   - `policy.installation: AVAILABLE`
   - `policy.authentication: ON_INSTALL`
   - `category: Development`
4. Run `validate_plugin.py <plugin-path>`.
5. Install with `codex plugin add nwn-server-gamedev-pack@<marketplace-name>`.
6. Start a new Codex thread and verify the `$nwn-server-gamedev` skill appears.
7. Run one small smoke prompt from `references/example-prompts.md`.
8. Record the install result in `forward-test-results.md`.
9. Fill `release-handoff-template.md` with exact install state and known gaps before sharing.

## Local Update Flow

Use when an already-installed local plugin needs another iteration.

1. Run `update_plugin_cachebuster.py <plugin-path>`.
2. Read the marketplace name with `read_marketplace_name.py`, or pass `--marketplace-path` for a non-default marketplace.
3. Reinstall with `codex plugin add nwn-server-gamedev-pack@<marketplace-name>`.
4. Start a new Codex thread for testing.
5. Record the cachebuster, install command shape, and smoke-test result in release notes.

## Public Release Flow

Still a hypothesis until release-time verification.

Preferred first public path:

1. Publish a Git tag such as `v0.1.0-rc.1`.
2. Attach or document the plugin folder as the release artifact.
3. Include the feedback schema and contribution instructions.
4. Require users to submit feedback records or issues rather than editing official references directly.
5. Do not promise automatic skill improvement from user installs; contributions become improvements only after review and a new release.

Potential later paths:

- curated public plugin marketplace if available and appropriate,
- repo/team marketplace for a closed builder group,
- MCP-backed feedback submission if community scale justifies hosting,
- docs/RAG index over reviewed versioned records.

## Stop Conditions

Do not hand the package to another person as an RC if:

- validation fails,
- package audit fails,
- version manifest check fails,
- release evidence index check fails,
- RC prompt-test handoff check fails,
- RC unblock playbook check fails,
- forward-test answer capture template check fails,
- forward-test evidence acceptance policy check fails,
- repo-artifact preflight runner fails,
- domain reference status check fails,
- capability map check fails,
- feature design template check fails,
- maintainer decision index check fails,
- install candidate check fails or the local sandbox is stale,
- install-smoke execution playbook check fails,
- the plugin copy differs from the authoring skill,
- fewer than three forward tests have been run,
- feedback tooling is broken,
- release notes do not list known gaps,
- handoff notes do not state whether this is a repo artifact, release candidate, local install candidate, or public release,
- install instructions require a marketplace that has not been configured,
- the package contains private project data,
- the package claims live NWN behavior without runtime evidence.
