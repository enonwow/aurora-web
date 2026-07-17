# nwn-server-gamedev-pack 0.1.0

## Handoff State

Current draft package state: `repo artifact`.

This handoff is for repository review only. It is not an install promise, not a release candidate, and not proof that the skill is useful in a fresh Codex thread.

## State

- Package state: `repo artifact`
- Release date: 2026-06-18
- Commit/tag: not created; `docs/nwn-skill-pack/` is currently untracked in the local Git worktree
- Version manifest: `docs/nwn-skill-pack/version-manifest.json`
- Package boundaries: `docs/nwn-skill-pack/package-boundaries.md`
- Package inventory: `docs/nwn-skill-pack/package-inventory.json`
- Package inventory freshness check: `tools/check_package_inventory.py` passed after this handoff was added
- Local plugin install candidate build: prepared under `docs/nwn-skill-pack/.codex-tmp/install-candidate/nwn-server-gamedev-pack`
- Local marketplace sandbox build: prepared under `docs/nwn-skill-pack/.codex-tmp/marketplace-candidate/marketplace.json`
- Install smoke tester packet: `docs/nwn-skill-pack/forward-tests/install-smoke-packet.md`
- Plugin path: `docs/nwn-skill-pack/draft-plugins/nwn-server-gamedev-pack`
- Skill path: `docs/nwn-skill-pack/draft-plugins/nwn-server-gamedev-pack/skills/nwn-server-gamedev`

## What This Helps With

- Locations, areas, tilesets, transitions.
- Items, equipment, loot, shops.
- Creatures, encounters, spawns, AI.
- 2DA, HAK, TLK, NWSync packaging.
- NWScript events and systems.
- NUI player and DM interfaces.
- Quests, dialogue, journal state.
- Economy, crafting, progression, balance.
- Persistence, database, NWNX.
- Deployment, backups, runtime QA, live ops.

## Verified In This Release

- Skill validation: authoring and plugin-packaged skill copies were previously validated with `quick_validate.py`; no new runtime validation happened in this handoff step
- Plugin validation: draft plugin previously passed `validate_plugin.py`; package audit currently warns that forward and install smoke tests are pending
- Version manifest: `tools/check_version_manifest.py` passed after this handoff was added
- Package boundaries: `tools/check_package_boundaries.py` passed after inventory regeneration
- Package inventory: `tools/generate_package_inventory.py` includes this handoff after regeneration
- Package inventory freshness: `tools/check_package_inventory.py` passed after inventory regeneration
- Local plugin install candidate build: static build record exists as package evidence, not install proof
- Local marketplace sandbox build: static sandbox record exists as package evidence, not install proof
- Install smoke tester packet: static packet exists and is checker-backed
- Route integrity: authoring and plugin-packaged skill routes were previously checked
- Feedback CLI smoke test: feedback create, validate, aggregate, and review paths were smoke-tested
- Feedback schema: `knowledge-inbox/schema/feedback-record.schema.json` exists and is checked against CLI vocabulary
- Forward-test schema: `forward-tests/schema/forward-test-record.schema.json` exists and is checked against the forward-test CLI
- Forward tests: zero prompt forward tests have been executed
- Install smoke test: zero install smoke tests have been executed

## Known Gaps

- Domains still skeletal: none of the main NWN domains are treated as runtime-complete
- Domains docs-verified but not runtime-tested: locations, items, creatures, 2DA/HAK/TLK, NWScript, NUI, quests, economy, persistence, deployment, and runtime QA
- Forward tests not yet run: FT-001 through FT-008 remain pending
- Marketplace/public distribution status: local sandbox only; no personal marketplace registration, public marketplace route, or third-party install proof exists

## Breaking Changes

- Skill name changes: none
- Reference path changes: none in this handoff step
- Feedback schema changes: none in this handoff step
- Plugin manifest changes: none in this handoff step

## Upgrade Notes

- From previous version: no previous tagged release exists
- Cachebuster/reinstall needed: yes after any installed local plugin copy changes, but this repo artifact has not been installed
- New thread required after reinstall: yes for any future install or reinstall smoke test

## Feedback Path

Use feedback records or issues. Do not edit official references directly unless you are maintaining a reviewed release branch.

Contributor-facing intake packet:

```text
docs/nwn-skill-pack/contributor-feedback-packet.md
```

## Receiver Instructions

For repo-artifact review:

1. Review `docs/nwn-skill-pack/plugin-release-candidate-checklist.md`.
2. Review `docs/nwn-skill-pack/source-of-truth-map.md`.
3. Run the required verification commands in `docs/nwn-skill-pack/release-readiness.md`.
4. Treat `docs/nwn-skill-pack/release-handoff-template.md` as the reusable template, and this file as the concrete 0.1.0 repo-artifact handoff.
5. Do not call this package installable until prompt forward tests and INSTALL-001 evidence are recorded.

For a later local install candidate:

1. Regenerate `docs/nwn-skill-pack/forward-tests/install-smoke-packet.md`.
2. Verify `docs/nwn-skill-pack/.codex-tmp/marketplace-candidate/marketplace.json`.
3. Register or configure the marketplace outside this repo-local sandbox only when a maintainer deliberately chooses that install lane.
4. Start a fresh Codex thread before testing skill discovery.
5. Record the result as an `install-smoke-test` forward-test record.

## Feedback Record Command Template

Use this exact command shape when a tester finds reusable NWN knowledge:

```powershell
python docs\nwn-skill-pack\tools\nwn_skill_feedback.py new `
  --out docs\nwn-skill-pack\knowledge-inbox\incoming `
  --domain nui `
  --title "Short reusable finding" `
  --summary "What happened and why it matters." `
  --source-type user-runtime-test `
  --status project-specific `
  --nwn-version "NWN:EE version stated by tester" `
  --server-context "Server or module context with private details redacted." `
  --evidence "Logs, screenshots, script names, or exact reproduction notes." `
  --runtime-steps "Steps that reproduced or verified it." `
  --failure-mode "What failed, if applicable." `
  --proposed-file "references/nui-player-ui.md" `
  --proposed-summary "Concise proposed update." `
  --notes "Review questions or constraints."
```

Then validate the incoming folder:

```powershell
python docs\nwn-skill-pack\tools\nwn_skill_feedback.py validate docs\nwn-skill-pack\knowledge-inbox\incoming
```

## Reviewer Acceptance

Accept this handoff only as a repo artifact when:

- the package state remains visible as `repo artifact`,
- the known gaps are not softened,
- the receiver can reproduce the static validation commands,
- unreviewed feedback remains outside installed skill references,
- the handoff does not claim prompt forward-test or install-smoke evidence.

## Stop Conditions

Do not hand off as installable when:

- marketplace registration has not been performed,
- plugin validation fails,
- route integrity fails,
- plugin source differs from the reviewed package,
- release notes imply forward tests that have not run,
- feedback instructions allow unreviewed records to overwrite official references,
- private logs, modules, secrets, player identifiers, or server credentials are included.
