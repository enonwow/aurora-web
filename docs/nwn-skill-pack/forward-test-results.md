# Forward Test Results

## FT-000: Static Route Integrity

Date: 2026-06-18

Purpose: verify that `SKILL.md` routes to every bundled reference/script and does not point to missing files.

Command:

```powershell
python docs\nwn-skill-pack\tools\check_skill_routes.py docs\nwn-skill-pack\draft-skills\nwn-server-gamedev
python docs\nwn-skill-pack\tools\check_skill_routes.py docs\nwn-skill-pack\draft-plugins\nwn-server-gamedev-pack\skills\nwn-server-gamedev
```

Result:

- `pass` for the authoring skill folder.
- `pass` for the plugin-packaged copy.
- 17 declared routes.
- 17 bundled files.
- 0 errors.
- 0 warnings.

Verified:

- Every `references/*.md` file bundled with the skill is reachable from `SKILL.md`.
- `scripts/nwn_skill_feedback.py` is mentioned from `SKILL.md`.
- The plugin-packaged copy has the same routing integrity as the authoring folder.

Not verified:

- This does not prove that a future Codex run will produce good NWN designs.
- This does not verify NWN factual correctness.
- This does not replace independent forward tests on realistic prompts.

## PKG-000: Static Plugin Package Audit

Date: 2026-06-18

Purpose: verify that the draft plugin package has a valid manifest shape, synchronized skill copy, required release/handoff docs, and no forbidden temp/private package paths.

Command:

```powershell
python docs\nwn-skill-pack\tools\check_plugin_package.py docs\nwn-skill-pack
```

Result:

- `pass` with 2 warnings.
- 0 errors.
- Authoring skill and plugin-packaged skill are synchronized.
- Plugin manifest name matches folder.
- Plugin version is strict semver.
- Plugin uses `skills: ./skills/`.
- Plugin does not declare missing app, MCP, icon, logo, or screenshot assets.
- Required release/handoff docs exist.
- No forbidden plugin package path segment was found.
- Forward-test record created at `forward-tests/records/pkg-000-static-plugin-package-audit.json`.
- Forward-test aggregate created at `forward-tests/aggregate.md`.

Warning:

- Forward tests are still marked pending, so the package is not a release candidate yet.
- No install-smoke-test record exists, so the install candidate gate remains blocked.
- INSTALL-001 handoff text is now machine-checkable with `tools/check_install_smoke_packet.py`, but that check is still static package evidence rather than a completed install smoke.

Verified:

- The current repo artifact is mechanically packageable for review.
- The current plugin copy has not drifted from the authoring skill.

Not verified:

- This does not prove the skill produces good NWN server designs.
- This does not prove a marketplace install or public distribution path.
- This does not replace independent forward tests.

Record validation:

```powershell
python docs\nwn-skill-pack\tools\forward_test_record.py validate docs\nwn-skill-pack\forward-tests\records\pkg-000-static-plugin-package-audit.json
python docs\nwn-skill-pack\tools\forward_test_record.py aggregate docs\nwn-skill-pack\forward-tests\records --out docs\nwn-skill-pack\forward-tests\aggregate.md
```

Result:

- `pass` for record validation.
- Aggregate generated successfully.

## PKG-001: Local Plugin Install Candidate Build

Date: 2026-06-18

Purpose: verify that the repository artifact can produce a clean local plugin root containing only `plugin_install_include=true` files from `package-inventory.json`.

Command:

```powershell
python docs\nwn-skill-pack\tools\build_plugin_install_candidate.py docs\nwn-skill-pack --force
```

Result:

- `pass`.
- Builder copied 20 plugin-boundary files into `.codex-tmp/install-candidate/nwn-server-gamedev-pack/`.
- Build manifest written to `.codex-tmp/install-candidate/build-manifest.json`.
- Built candidate passed `plugin-creator` `validate_plugin.py` after setting `PYTHONPATH` to the local PyYAML dependency folder.
- Packaged skill inside the built candidate passed `skill-creator` `quick_validate.py`.
- Forward-test record created at `forward-tests/records/pkg-001-local-plugin-install-candidate-build.json`.

Verified:

- The plugin install boundary can be copied cleanly from inventory.
- The built candidate has a valid plugin shape.
- The built candidate's bundled skill has valid skill shape.

Not verified:

- This does not prove personal marketplace installation.
- This does not prove Codex skill trigger behavior in another environment.
- This does not prove NWN runtime correctness or task quality.

Record validation:

```powershell
python docs\nwn-skill-pack\tools\forward_test_record.py validate docs\nwn-skill-pack\forward-tests\records\pkg-001-local-plugin-install-candidate-build.json
python docs\nwn-skill-pack\tools\forward_test_record.py aggregate docs\nwn-skill-pack\forward-tests\records --out docs\nwn-skill-pack\forward-tests\aggregate.md
```

Result:

- `pass` for record validation.
- Aggregate generated successfully.

## PKG-002: Local Marketplace Sandbox Build

Date: 2026-06-18

Purpose: verify that the local plugin candidate can be placed under a repo-local marketplace layout with a valid `marketplace.json` and relative `./plugins/nwn-server-gamedev-pack` source path.

Command:

```powershell
python docs\nwn-skill-pack\tools\build_local_marketplace_candidate.py docs\nwn-skill-pack --force
python docs\nwn-skill-pack\tools\generate_install_smoke_packet.py docs\nwn-skill-pack --out docs\nwn-skill-pack\forward-tests\install-smoke-packet.md
python docs\nwn-skill-pack\tools\check_install_smoke_packet.py docs\nwn-skill-pack
```

Result:

- `pass`.
- Marketplace sandbox written to `.codex-tmp/marketplace-candidate/`.
- `marketplace.json` contains one local plugin entry for `nwn-server-gamedev-pack`.
- Plugin source path is `./plugins/nwn-server-gamedev-pack`.
- Policy is `AVAILABLE` and `ON_INSTALL`.
- Sandbox plugin passed `plugin-creator` `validate_plugin.py` after setting `PYTHONPATH` to the local PyYAML dependency folder.
- Packaged skill inside the sandbox plugin passed `skill-creator` `quick_validate.py`.
- Forward-test record created at `forward-tests/records/pkg-002-local-marketplace-sandbox-build.json`.

Verified:

- A repo-local marketplace shape can be generated from the current package.
- The marketplace sandbox has the expected plugin source path and policy fields.
- The sandbox plugin and skill remain structurally valid after copying.

Not verified:

- This does not run `codex plugin marketplace add`.
- This does not prove Codex UI discovery, installation, or trigger behavior.
- This does not prove NWN runtime correctness or task quality.

Record validation:

```powershell
python docs\nwn-skill-pack\tools\forward_test_record.py validate docs\nwn-skill-pack\forward-tests\records\pkg-002-local-marketplace-sandbox-build.json
python docs\nwn-skill-pack\tools\forward_test_record.py aggregate docs\nwn-skill-pack\forward-tests\records --out docs\nwn-skill-pack\forward-tests\aggregate.md
```

Result:

- `pass` for record validation.
- Aggregate generated successfully.

## Pending Forward Tests

Independent prompt tests from `forward-test-plan.md` still need to run before release candidate status. The prompt contract and expected-output checks were expanded on 2026-06-18, but these are still prepared tests, not executed independent validations.

- FT-001: Low-level forest area.
- FT-002: Custom item plus 2DA/HAK/TLK impact.
- FT-003: NUI crafting panel.
- FT-004: Persistence and restart safety.
- FT-005: Release review.
- FT-006: Economy and progression.
- FT-007: Quest, dialogue, journal.
- FT-008: Feedback contribution.

In this environment, sub-agent forward testing should be run only after an explicit user request for delegation or parallel agent work. Until then, maintain local deterministic checks and prepare prompts/results for later independent runs.

Prepared but not executed:

- `forward-tests/tester-packet.md` now gives human testers a no-answer-leak workflow, scoring rubric, record command shape, and promotion boundary.
- `forward-tests/prompts/` now contains standalone prompt files for FT-001 through FT-008.
- `forward-tests/reviewer-matrix.json` now gives reviewers the expected references and review focus without putting that material in the agent-facing prompts.
- `forward-tests/record-command-templates.md` now gives reviewers generated `forward_test_record.py new` command scaffolds after a fresh-context answer exists.
- `tools/check_forward_test_prompts.py` now verifies the prompt file set, standard skill invocation, NWN context, reviewer matrix, record command templates, and absence of obvious expected-answer leakage.
- `references/example-prompts.md` now includes expected answer contracts for location/encounter, item/custom-content, NUI, persistence, economy/progression, quest/dialogue/journal, NWScript review, deployment/NWSync, feedback contribution, and release review tasks.
- `forward-test-plan.md` now includes universal failure triggers for false completion, compile/runtime confusion, unlabeled NWNX-only behavior, unlabeled source claims, and missing rollback/packaging in release tasks.
