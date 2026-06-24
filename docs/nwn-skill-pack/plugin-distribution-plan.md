# Plugin Distribution Plan

## Decision

Use the skill folder as the authoring unit, but ship the NWN server gamedev package as a Codex plugin once it is ready for another person.

This matches the verified Codex model:

- a skill is the compact instruction/resource unit Codex can trigger;
- a plugin is the installable distribution unit for reusable skills, apps, and MCP configuration;
- MCP is reserved for live tools, central feedback submission, hosted search, or project-specific automation.

## Current Draft Plugin

Path:

`docs/nwn-skill-pack/draft-plugins/nwn-server-gamedev-pack`

Included skill:

`docs/nwn-skill-pack/draft-plugins/nwn-server-gamedev-pack/skills/nwn-server-gamedev`

Manifest:

`docs/nwn-skill-pack/draft-plugins/nwn-server-gamedev-pack/.codex-plugin/plugin.json`

Version manifest:

`docs/nwn-skill-pack/version-manifest.json`

Validation performed:

- `quick_validate.py` passed for the copied `nwn-server-gamedev` skill inside the plugin.
- `validate_plugin.py` passed for the plugin root.
- `check_plugin_package.py` passed with a warning that forward tests are still pending.
- `check_version_manifest.py` passed and confirms plugin version/name plus skill names match `version-manifest.json`.
- `check_package_boundaries.py` defines the current install boundary as `.codex-plugin/plugin.json` plus `skills/nwn-server-gamedev/`.
- `build_plugin_install_candidate.py` can copy that boundary into `.codex-tmp/install-candidate/nwn-server-gamedev-pack/` for local install-smoke preparation.
- `build_local_marketplace_candidate.py` can create `.codex-tmp/marketplace-candidate/marketplace.json` plus `plugins/nwn-server-gamedev-pack/` without changing the user's personal marketplace.
- `check_install_smoke_packet.py` verifies the generated INSTALL-001 tester packet against `version-manifest.json` and the current repo-local marketplace sandbox.
- `generate_forward_test_record_templates.py` creates reviewer-only recording command scaffolds from the matrix.
- `check_forward_test_prompts.py` verifies the no-answer-leak prompt packet, reviewer-only matrix, and record templates before independent prompt testing.
- `PyYAML` was supplied from the local validation dependency folder `.codex-tmp/pydeps`.

This plugin was not installed into the personal Codex marketplace. It is a repo artifact for review and later publishing.

## Suggested Release Shape

Release `0.1.0` as a Git repository containing:

- `skills/nwn-server-gamedev/`
- `.codex-plugin/plugin.json`
- contribution templates outside the skill folder
- feedback aggregation tooling
- human feedback release workflow
- reviewed source registry
- release notes and version tags

The skill folder itself should stay lean. Do not put process documentation, changelogs, or broad research notes inside the final skill folder unless Codex must read them during task execution.

The installable plugin is narrower than the full handoff bundle. The plugin install boundary contains only `draft-plugins/nwn-server-gamedev-pack/`; repo-level release docs, feedback inboxes, forward-test evidence, and helper tools remain outside the plugin unless a later plugin feature explicitly needs them.

The local marketplace sandbox is narrower than a real install. It prepares the repo/team marketplace shape and relative `./plugins/nwn-server-gamedev-pack` source path, but does not register that marketplace with Codex.

## Release Candidate Boundary

Use `plugin-release-candidate-checklist.md` as the gate before giving the package to another person for testing.
Use `release-handoff-template.md` as the reusable process template.
Use the concrete handoff path in `version-manifest.json` for the actual notes given to a reviewer, tester, or maintainer.
Use `package-boundaries.md` to distinguish the installed plugin from the larger maintainer handoff bundle.

Treat the states separately:

- `repo artifact`: validated files exist in this repository, but no install handoff is promised.
- `release candidate`: package passes validation, source/copy sync, feedback smoke tests, and required forward tests.
- `local install candidate`: release candidate has a verified local marketplace/install flow.
- `public release`: tagged release with release notes, contribution path, and explicit known gaps.

Current state: `repo artifact`.

Machine-readable state lives in `version-manifest.json`. Markdown release notes should not contradict it.

Not yet true:

- at least three independent forward tests have not been run;
- no marketplace entry has been created;
- no install/reinstall smoke test has been recorded;
- public third-party distribution path remains a release-time hypothesis.
- concrete handoff notes exist for repo-artifact review only, not for release-candidate or install handoff.

## Versioning

Use SemVer at the plugin level:

- patch: typo fixes, clearer wording, source links, small reference corrections;
- minor: new NWN domain references, new scripts, new QA workflows, new feedback fields;
- major: breaking folder layout, renamed skill, incompatible feedback schema, changed trigger behavior.

The skill can share the plugin version in release notes even though the required `SKILL.md` frontmatter only uses `name` and `description`.
Use `tools/check_version_manifest.py` before release to confirm the plugin manifest, authoring skill, plugin skill, package state, and release blockers are consistent.

## Human Feedback Flow

Keep human contributions outside the installed skill until reviewed:

1. Contributors submit JSON records into `knowledge-inbox/incoming`.
2. Maintainers validate and aggregate records with `nwn_skill_feedback.py`.
3. Maintainers mark every claim with evidence status.
4. Only promoted records change the official skill references.
5. `human-feedback-release-workflow.md` decides whether the change is patch, minor, or major.
6. A release tag packages the promoted state.

For later community scale, add either:

- a GitHub issue form that maps into the feedback JSON schema;
- a lightweight MCP server for central submission and retrieval;
- a docs/RAG index over reviewed and versioned records only.

Use `architecture-escalation-roadmap.md` before adding these layers. The current package should not grow MCP, RAG, or repo-template machinery until a real release/test bottleneck proves the need.

## What Is Verified

- The local draft skill is structurally valid.
- The local draft plugin is structurally valid.
- The plugin contains the draft skill and can be reviewed as a single package directory.
- The current feedback CLI can create, validate, and aggregate records.

## What Remains Hypothesis

- The exact public marketplace route for a third-party NWN plugin still needs release-time verification.
- The best community feedback intake may be GitHub issues first, MCP later.
- The draft skill still needs forward tests on realistic NWN server tasks before it should be given to other people as useful rather than merely valid.
- NWN-specific domain references still need more source-backed detail before a first release.

## Next Distribution Step

Before promoting this plugin from draft to release candidate:

1. Run `plugin-release-candidate-checklist.md`.
2. Run at least three forward tests from `forward-test-plan.md`.
3. Convert any failed or partial forward test into feedback records.
4. Re-run skill and plugin validation.
5. Build a clean local plugin install candidate with `tools/build_plugin_install_candidate.py`.
6. Build a repo-local marketplace sandbox with `tools/build_local_marketplace_candidate.py`.
7. Regenerate and check the INSTALL-001 tester packet with `tools/generate_install_smoke_packet.py` and `tools/check_install_smoke_packet.py`.
8. Create release notes outside the skill folder.
9. Only then decide whether to register a marketplace path for install testing.
10. Fill a concrete file under `release-handoffs/` for the exact recipient and package state, then point `version-manifest.json` `release_handoff` at it.
