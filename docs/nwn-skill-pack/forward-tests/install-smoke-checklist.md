# Install Smoke Checklist

## Purpose

Verify that another person can install or locally register the NWN skill plugin and see the packaged skill in a new Codex context. This is package-distribution evidence, not NWN runtime evidence.

## Scope

Use this checklist only after the package remains a valid repo artifact:

```powershell
python docs\nwn-skill-pack\tools\check_plugin_package.py docs\nwn-skill-pack
```

Do not mark the package as release-ready from this check alone. Prompt forward tests and a filled handoff are separate gates.

Use `forward-tests/install-smoke-packet.md` as the exact tester handoff for the current sandbox paths and record command. Regenerate it before handoff:

```powershell
python docs\nwn-skill-pack\tools\generate_install_smoke_packet.py docs\nwn-skill-pack --out docs\nwn-skill-pack\forward-tests\install-smoke-packet.md
python docs\nwn-skill-pack\tools\check_install_smoke_packet.py docs\nwn-skill-pack
```

## Preconditions

- `docs/nwn-skill-pack/draft-plugins/nwn-server-gamedev-pack` is the package under test.
- `validate_plugin.py` passes for the plugin root.
- `tools/build_plugin_install_candidate.py docs/nwn-skill-pack --force` has produced `.codex-tmp/install-candidate/nwn-server-gamedev-pack`.
- `tools/build_local_marketplace_candidate.py docs/nwn-skill-pack --force` has produced `.codex-tmp/marketplace-candidate/marketplace.json` and `.codex-tmp/marketplace-candidate/plugins/nwn-server-gamedev-pack`.
- `tools/generate_install_smoke_packet.py docs/nwn-skill-pack --out docs/nwn-skill-pack/forward-tests/install-smoke-packet.md` has refreshed the tester handoff packet.
- `tools/check_install_smoke_packet.py docs/nwn-skill-pack` has confirmed the handoff packet still matches `version-manifest.json` and `.codex-tmp/marketplace-candidate/marketplace.json`.
- The tester knows which marketplace or local plugin source is being used.
- No private module files, server logs, credentials, or private community transcripts are copied into the package.

## Test Steps

1. Record the exact package path, marketplace path if any, Codex channel/build if known, and tester identity.
2. Build or refresh the local marketplace sandbox.
3. Validate the plugin root with the local `plugin-creator` validator.
4. Register or install the plugin using the selected local marketplace or plugin source.
5. Start a new Codex thread after install or reinstall.
6. Confirm the `$nwn-server-gamedev` skill appears or can be explicitly invoked.
7. Run one small smoke prompt that only checks routing, for example:

```text
Use $nwn-server-gamedev to list which references you would read before designing a small NWN:EE crafting NUI, and label what would still need runtime evidence.
```

8. Confirm the answer routes to `nui-player-ui.md`, `nwscript-events-systems.md`, and `testing-runtime-qa.md`, and does not claim runtime completion.
9. Use the result decision table in `forward-tests/install-smoke-packet.md` to choose `pass`, `partial`, `fail`, or `not-run`.
10. Record the result with `tools/forward_test_record.py`.

## Passing Evidence

A passing install-smoke record needs:

- exact install/register command shape or marketplace path,
- whether the package came from `.codex-tmp/marketplace-candidate/marketplace.json`,
- new-thread confirmation,
- evidence that the skill was visible or invokable,
- the smoke prompt or command,
- observed reference routing,
- no false claim that the smoke prompt proves NWN runtime behavior.
- no `pass` result recorded from preparation commands alone.
- `install_verification` fields showing registered/installed source, fresh context, visible or invokable skill, expected reference routing, runtime-boundary preservation, and `preparation_only=false`.

## Record Command Shape

```powershell
python docs\nwn-skill-pack\tools\forward_test_record.py new `
  --record-type install-smoke-test `
  --test-id INSTALL-001 `
  --title "Local plugin install smoke" `
  --result pass `
  --tester "<tester>" `
  --context "<Codex build/channel, marketplace path or local source, new thread>" `
  --prompt-or-command "<exact install/register command and smoke prompt>" `
  --skill-path "docs/nwn-skill-pack/draft-plugins/nwn-server-gamedev-pack/skills/nwn-server-gamedev" `
  --expected-reference nui-player-ui.md `
  --expected-reference nwscript-events-systems.md `
  --expected-reference testing-runtime-qa.md `
  --observed-reference nui-player-ui.md `
  --observed-reference nwscript-events-systems.md `
  --observed-reference testing-runtime-qa.md `
  --evidence-label install-smoke `
  --evidence "<skill visible/invokable in new thread>" `
  --evidence "<routing smoke prompt kept runtime claims unverified>" `
  --install-registered-or-installed `
  --install-fresh-context `
  --install-skill-visible `
  --install-expected-references-routed `
  --install-runtime-boundary-preserved `
  --missing-evidence "No NWN module/runtime evidence; install smoke only."
```

Then regenerate aggregates and readiness:

```powershell
python docs\nwn-skill-pack\tools\forward_test_record.py validate docs\nwn-skill-pack\forward-tests\records\<record>.json
python docs\nwn-skill-pack\tools\check_install_smoke_records.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\forward_test_record.py aggregate docs\nwn-skill-pack\forward-tests\records --out docs\nwn-skill-pack\forward-tests\aggregate.md
python docs\nwn-skill-pack\tools\generate_release_readiness.py docs\nwn-skill-pack --out docs\nwn-skill-pack\release-readiness.md
```

## Failure Handling

Use `partial` or `fail` when the plugin installs but the skill is not visible, the old cached skill is used, the package requires undeclared assets/apps/MCP servers, or the smoke answer skips evidence labels. `partial` and `fail` records must include an improvement action.
