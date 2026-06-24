# Release Handoff Template

## Purpose

Use this file when preparing a handoff for another builder, tester, or maintainer. Keep it outside the installed skill folder because it is release process documentation, not runtime guidance the skill should load for normal NWN work.

## Handoff State

Choose exactly one:

- `repo artifact`: files are reviewable in Git, but no install promise is made.
- `release candidate`: RC gate passed, but marketplace/install test may still be pending.
- `local install candidate`: local marketplace/install flow has been tested.
- `public release`: tagged package with public notes and contribution path.

Current draft package state: `repo artifact`.

Generated release notes draft:

```text
docs/nwn-skill-pack/release-notes-draft.md
```

Generated next-action dashboard:

```text
docs/nwn-skill-pack/release-next-actions.md
```

Regenerate and check it with:

```powershell
python docs\nwn-skill-pack\tools\generate_release_notes_draft.py docs\nwn-skill-pack --out docs\nwn-skill-pack\release-notes-draft.md
python docs\nwn-skill-pack\tools\check_release_notes_draft.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\generate_release_next_actions.py docs\nwn-skill-pack --out docs\nwn-skill-pack\release-next-actions.md
python docs\nwn-skill-pack\tools\check_release_next_actions.py docs\nwn-skill-pack
```

## Release Notes Template

```markdown
# nwn-server-gamedev-pack <version>

## State

- Package state:
- Release date:
- Commit/tag:
- Version manifest:
- Package boundaries:
- Package inventory:
- Package inventory freshness check:
- Local plugin install candidate build:
- Local marketplace sandbox build:
- Install smoke tester packet:
- Plugin path:
- Skill path:

## What This Helps With

- Locations, areas, tilesets, transitions.
- Items, equipment, loot, shops.
- Creatures, encounters, spawns, AI.
- 2DA, HAK, TLK, NWSync packaging.
- NWScript events and systems.
- NUI player/DM interfaces.
- Quests, dialogue, journal state.
- Economy, crafting, progression, balance.
- Persistence, database, NWNX.
- Deployment, backups, runtime QA, live ops.

## Verified In This Release

- Skill validation:
- Plugin validation:
- Version manifest:
- Package boundaries:
- Package inventory:
- Package inventory freshness:
- Local plugin install candidate build:
- Local marketplace sandbox build:
- Install smoke tester packet:
- Route integrity:
- Feedback CLI smoke test:
- Feedback schema:
- Forward-test schema:
- Forward tests:
- Install smoke test:

## Known Gaps

- Domains still skeletal:
- Domains docs-verified but not runtime-tested:
- Forward tests not yet run:
- Marketplace/public distribution status:

## Breaking Changes

- Skill name changes:
- Reference path changes:
- Feedback schema changes:
- Plugin manifest changes:

## Upgrade Notes

- From previous version:
- Cachebuster/reinstall needed:
- New thread required after reinstall:

## Feedback Path

Use feedback records or issues. Do not edit official references directly unless you are maintaining a reviewed release branch.

Contributor-facing intake packet:

```text
docs/nwn-skill-pack/contributor-feedback-packet.md
```
```

## Receiver Instructions

For repo-artifact review:

1. Review `plugin-release-candidate-checklist.md`.
2. Review `source-of-truth-map.md`.
3. Run route and validation checks.
4. Use example prompts by path, for example:

```text
Use $nwn-server-gamedev at docs/nwn-skill-pack/draft-skills/nwn-server-gamedev to review this proposed release note: "We added custom races, a crafting NUI, and new forest encounters." Ask what evidence is missing before this can be called release-ready.
```

For a local install candidate:

1. Confirm the marketplace path and marketplace name.
2. Confirm the marketplace entry points to the plugin source being tested.
3. Run `validate_plugin.py <plugin-path>`.
4. Install with:

```powershell
codex plugin add nwn-server-gamedev-pack@<marketplace-name>
```

5. Start a new Codex thread.
6. Run one small smoke prompt from `references/example-prompts.md`.
7. Record the result in `forward-test-results.md`.

For updating an already-installed local plugin:

1. Run `update_plugin_cachebuster.py <plugin-path>`.
2. Read the marketplace name with `read_marketplace_name.py`.
3. Reinstall with `codex plugin add nwn-server-gamedev-pack@<marketplace-name>`.
4. Start a new Codex thread before testing.

## Feedback Record Command Template

Use this when a tester finds reusable NWN knowledge:

Record schema:

```text
docs/nwn-skill-pack/knowledge-inbox/schema/feedback-record.schema.json
```

```powershell
python docs\nwn-skill-pack\tools\nwn_skill_feedback.py new `
  --out docs\nwn-skill-pack\knowledge-inbox\incoming `
  --domain nui `
  --title "Short reusable finding" `
  --summary "What happened and why it matters." `
  --source-type user-runtime-test `
  --status project-specific `
  --nwn-version "NWN:EE <version>" `
  --server-context "Server/module context, redact private details." `
  --evidence "Logs, screenshots, script names, or exact reproduction notes." `
  --runtime-steps "Steps that reproduced or verified it." `
  --failure-mode "What failed, if applicable." `
  --proposed-file "references/nui-player-ui.md" `
  --proposed-summary "Concise proposed update." `
  --notes "Review questions or constraints."
```

Then validate:

```powershell
python docs\nwn-skill-pack\tools\nwn_skill_feedback.py validate docs\nwn-skill-pack\knowledge-inbox\incoming
```

Write a maintainer-reviewed copy:

```powershell
python docs\nwn-skill-pack\tools\nwn_skill_feedback.py review `
  docs\nwn-skill-pack\knowledge-inbox\incoming\<record>.json `
  --out docs\nwn-skill-pack\knowledge-inbox\reviewed `
  --reviewer "<maintainer>" `
  --decision needs-more-evidence `
  --status project-specific `
  --target-reference "references/nui-player-ui.md" `
  --required-action "Attach runtime evidence before promotion." `
  --notes "Do not promote from incoming directly."
```

Aggregate for review:

```powershell
python docs\nwn-skill-pack\tools\nwn_skill_feedback.py aggregate docs\nwn-skill-pack\knowledge-inbox\incoming --out docs\nwn-skill-pack\knowledge-inbox\reviewed\aggregate.md
python docs\nwn-skill-pack\tools\generate_feedback_promotion_backlog.py docs\nwn-skill-pack --out docs\nwn-skill-pack\knowledge-inbox\promotion-backlog.md
```

If the contributor cannot run the CLI, ask them to fill one of:

```text
docs/nwn-skill-pack/knowledge-inbox/templates/user-feedback-form.md
docs/nwn-skill-pack/knowledge-inbox/templates/github-issue-body.md
```

## Reviewer Acceptance

Accept a tester report only when:

- the domain is clear,
- source type is clear,
- evidence is attached or explicitly missing,
- status is not overstated,
- project-specific facts are labeled,
- private server/player data is redacted,
- the target reference file is plausible,
- the proposed update is concise and reusable.

## Stop Conditions

Do not hand off as installable when:

- marketplace details are unknown,
- plugin validation fails,
- route integrity fails,
- plugin source differs from the reviewed package,
- release notes imply forward tests that have not run,
- generated release notes draft is missing, stale, or omits known gaps,
- generated next-action dashboard is missing, stale, or implies listed proof work already happened,
- feedback instructions allow unreviewed records to overwrite official references,
- private logs/modules/secrets are included.
