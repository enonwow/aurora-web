# Install-Smoke Execution Playbook

## Purpose

Use this playbook when a maintainer or tester is ready to verify that `nwn-server-gamedev-pack` can be registered or installed in a selected Codex test environment and invoked from a fresh Codex context.

This playbook records the `INSTALL-001` install-smoke lane.

This is package-distribution evidence. It is not NWN runtime evidence and it is not prompt-forward-test evidence.

## Inputs

- Current package metadata: `version-manifest.json`
- Static install sandbox checker: `tools/check_install_candidate.py`
- Isolated fake `CODEX_HOME` layout checker: `tools/check_isolated_install_layout.py`
- Tester handoff packet: `forward-tests/install-smoke-packet.md`
- Tester checklist: `forward-tests/install-smoke-checklist.md`
- Packet checker: `tools/check_install_smoke_packet.py`
- Record CLI: `tools/forward_test_record.py`
- Install-smoke record checker: `tools/check_install_smoke_records.py`
- Release gate checker: `tools/check_release_gate.py`

## Boundary Rule

Do not record `pass` from preparation commands alone.

An install-smoke pass requires:

- selected test environment was allowed to change Codex plugin or marketplace configuration,
- plugin was registered or installed from the intended local source,
- a new Codex context was started after registration or install,
- `$nwn-server-gamedev` was visible or explicitly invokable,
- the smoke answer routed to `nui-player-ui.md`, `nwscript-events-systems.md`, and `testing-runtime-qa.md`,
- the answer kept runtime evidence separate from install evidence.
- the record includes `install_verification` with registered/installed, fresh context, skill visible/invokable, expected references routed, runtime boundary preserved, and `preparation_only=false`.

## Phase 0: Refresh The Sandbox

Run from repository root:

```powershell
python docs\nwn-skill-pack\tools\run_repo_artifact_preflight.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_install_candidate.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_isolated_install_layout.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_install_smoke_packet.py docs\nwn-skill-pack
```

If any command fails, stop and fix the repo artifact before touching Codex plugin configuration.

## Phase 1: Choose The Test Environment

Before running registration or install commands, write down:

- tester name,
- Codex channel or build if known,
- marketplace root,
- plugin root,
- whether this is CLI registration, Codex app UI registration, or another controlled method.

Use the repo-local marketplace sandbox unless there is a deliberate reason to test another marketplace:

`docs/nwn-skill-pack/.codex-tmp/marketplace-candidate/marketplace.json`

Do not mutate a personal marketplace silently. If a personal marketplace is used, record that exact path in the install-smoke record.

## Phase 2: Register Or Install

Use the command shape from `forward-tests/install-smoke-packet.md`.

For the repo-local sandbox, the expected command shape is:

```powershell
codex plugin marketplace add "C:\Projects\aurora-web\docs\nwn-skill-pack\.codex-tmp\marketplace-candidate"
```

If the tester uses the Codex app UI instead of the CLI, record the exact UI path and the same marketplace root. If the tester cannot change plugin configuration, record `not-run`.

## Phase 3: Fresh Context Smoke Prompt

After registration or install, start a fresh Codex context and run the smoke prompt from `forward-tests/install-smoke-packet.md`:

```text
Use $nwn-server-gamedev to list which references you would read before designing a small NWN:EE crafting NUI, and label what would still need runtime evidence.
```

The response should route to:

- `nui-player-ui.md`
- `nwscript-events-systems.md`
- `testing-runtime-qa.md`

It should not claim that a real NWN module, Toolset, server, client, NUI event, or script compile was tested.

## Phase 4: Record The Result

Use `tools/forward_test_record.py` and the record command in `forward-tests/install-smoke-packet.md`.

Then validate and aggregate:

```powershell
python docs\nwn-skill-pack\tools\forward_test_record.py validate docs\nwn-skill-pack\forward-tests\records
python docs\nwn-skill-pack\tools\check_install_smoke_records.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\forward_test_record.py aggregate docs\nwn-skill-pack\forward-tests\records --out docs\nwn-skill-pack\forward-tests\aggregate.md
python docs\nwn-skill-pack\tools\run_repo_artifact_preflight.py docs\nwn-skill-pack
```

Use these result rules:

- `pass`: install or registration worked in the selected test environment, a fresh context could invoke the skill, expected references were routed, runtime evidence was not overstated, and the record command included the required `--install-registered-or-installed`, `--install-fresh-context`, `--install-skill-visible`, `--install-expected-references-routed`, and `--install-runtime-boundary-preserved` flags.
- `partial`: install or registration partly worked but routing, freshness, visibility, cache state, or evidence labeling was incomplete. Include `--improvement-needed` and `--improvement-summary`.
- `fail`: install or registration failed, an old cached skill was used, packaged files were missing, privacy-sensitive data entered the package, or the smoke answer made false runtime claims. Include `--improvement-needed` and `--improvement-summary`.
- `not-run`: tester could not change plugin configuration, could not start a fresh context, or did not run the smoke prompt.

For `partial` or `fail`, create a feedback candidate after the install-smoke record exists:

```powershell
python docs\nwn-skill-pack\tools\nwn_skill_feedback.py new `
  --domain deployment `
  --title "INSTALL-001 install-smoke gap: [short gap]" `
  --summary "[what failed in install/register/fresh context/skill visibility/reference routing/evidence boundary]" `
  --source-type maintainer-review `
  --status unverified `
  --evidence "install-smoke record: docs\nwn-skill-pack\forward-tests\records\install-001-local-plugin-install-smoke.json" `
  --files-or-scripts "docs\nwn-skill-pack\forward-tests\install-smoke-packet.md" `
  --files-or-scripts "docs\nwn-skill-pack\forward-tests\install-smoke-execution-playbook.md" `
  --failure-mode "[registration failed, skill invisible, stale cache, routing miss, false runtime claim, privacy/package leak]" `
  --proposed-file "draft-skills/nwn-server-gamedev/SKILL.md" `
  --proposed-summary "[trigger/routing/package guidance improvement, or write 'plugin packaging fix required outside skill']" `
  --notes "INSTALL-001 feedback candidate; does not update installed skill/plugin until reviewed and promoted."
```

Then validate and review the candidate conservatively:

```powershell
python docs\nwn-skill-pack\tools\nwn_skill_feedback.py validate docs\nwn-skill-pack\knowledge-inbox\incoming
python docs\nwn-skill-pack\tools\nwn_skill_feedback.py review <record> --reviewer "[reviewer]" --decision needs-more-evidence --status project-specific --required-action "[required install proof, package patch, or skill routing patch]" --notes "[review notes]"
```

## Phase 5: Recheck Gates

After a valid install-smoke record exists:

```powershell
python docs\nwn-skill-pack\tools\check_release_gate.py docs\nwn-skill-pack --target release-candidate
python docs\nwn-skill-pack\tools\check_release_gate.py docs\nwn-skill-pack --target install-candidate
```

The install-candidate gate should still block if prompt-forward-test coverage, handoff state, or `version-manifest.json` state is not ready.

## Verified

- The static sandbox, isolated fake `CODEX_HOME` layout, tester packet, and install-smoke record checker can be regenerated locally.
- The playbook is aligned with the current install-smoke packet and forward-test record CLI.
- Install-smoke evidence is separate from NWN runtime evidence.

## Still Hypothesis

- The repo-local marketplace registration command may differ by Codex surface, channel, or future plugin tooling.
- The isolated fake `CODEX_HOME` layout does not prove Codex registered the marketplace or loaded the skill in a fresh thread.
- A pass in one local environment does not prove public marketplace readiness.
- Install-smoke does not prove the skill produces good NWN server designs.
