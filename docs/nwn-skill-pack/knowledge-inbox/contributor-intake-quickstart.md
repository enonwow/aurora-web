# Contributor Intake Quickstart

## Purpose

Give another NWN builder a short path for sending reusable server gamedev lessons back to the maintainers without editing official skill references directly.

This is a contribution workflow, not automatic learning. An installed skill does not self-update, and user sessions do not mutate the official skill pack. A contribution improves future users only after maintainer review, promotion, versioning, and a new release.

## One-Minute Rule

Submit one focused finding per record:

- one NWN domain such as `locations`, `items`, `creatures`, `2da-hak-tlk`, `nwscript`, `nui`, `quests`, `economy`, `persistence`, `deployment`, `testing`, `ops`, `concept`, or `other`,
- one source type such as `user-runtime-test`, `docs-research`, `model-suggestion`, `claude-opus-import`, `codex-session`, `project-postmortem`, `maintainer-review`, or `other`,
- one honest evidence status: `unverified`, `project-specific`, `docs-verified`, or `runtime-verified`.

Use `promoted`, `rejected`, and `superseded` only during maintainer review, not during first submission.

When a record becomes a skill reference update, preserve the evidence label in the reference text. Domain references may use `runtime-tested` as the readable label for behavior confirmed in Toolset, server runtime, client behavior, logs, or a controlled test module.

## Privacy Scrub

Before submitting, remove:

- credentials,
- tokens,
- IP addresses,
- account names,
- private player data,
- private module files or names unless explicitly approved,
- private server logs unless redacted,
- private Discord/forum transcripts unless the source permits sharing.

Keep enough context to reproduce the issue: NWN or NWN:EE version, NWNX status, module/server context, steps, expected behavior, actual behavior, and evidence path or summary.

## If The Contributor Can Run Commands

Create one record:

```powershell
python docs\nwn-skill-pack\tools\nwn_skill_feedback.py new `
  --out docs\nwn-skill-pack\knowledge-inbox\incoming `
  --domain nui `
  --title "Crafting panel bind refresh needs relog test" `
  --summary "A watched NUI bind stayed stale after relog until the window was reopened." `
  --source-type user-runtime-test `
  --status project-specific `
  --nwn-version "NWN:EE <version>" `
  --server-context "Persistent server test module; NWNX status: <yes/no/unknown>." `
  --evidence "Redacted log, screenshot, or reproduction note." `
  --runtime-steps "Open panel, change crafting state, relog, observe bind state." `
  --failure-mode "Panel displayed stale state until manual reopen." `
  --proposed-file "references/nui-player-ui.md" `
  --proposed-summary "Add relog and reopen checks for watched-bind refresh behavior." `
  --notes "Keep project-specific until reproduced or docs-backed."
```

Validate the queue:

```powershell
python docs\nwn-skill-pack\tools\nwn_skill_feedback.py validate docs\nwn-skill-pack\knowledge-inbox\incoming
```

Regenerate the maintainer triage view:

```powershell
python docs\nwn-skill-pack\tools\nwn_skill_feedback.py aggregate docs\nwn-skill-pack\knowledge-inbox\incoming --out docs\nwn-skill-pack\knowledge-inbox\reviewed\aggregate.md
python docs\nwn-skill-pack\tools\generate_feedback_promotion_backlog.py docs\nwn-skill-pack --out docs\nwn-skill-pack\knowledge-inbox\promotion-backlog.md
```

Build a sendable contribution bundle when multiple records should be handed to a maintainer:

```powershell
python docs\nwn-skill-pack\tools\nwn_skill_feedback.py bundle `
  docs\nwn-skill-pack\knowledge-inbox\incoming `
  --out docs\nwn-skill-pack\.codex-tmp\contribution-bundle `
  --force
```

Bundle format:

```text
docs/nwn-skill-pack/knowledge-inbox/contribution-bundle-format.md
```

If this is the first time an outside NWN builder is using the process, run the no-coaching trial packet:

```text
docs/nwn-skill-pack/knowledge-inbox/external-contributor-trial-packet.md
docs/nwn-skill-pack/knowledge-inbox/external-contributor-trial-result-template.md
```

Maintainers can verify a received bundle before review:

```powershell
python docs\nwn-skill-pack\tools\nwn_skill_feedback.py verify-bundle docs\nwn-skill-pack\.codex-tmp\contribution-bundle
```

## If The Contributor Cannot Run Commands

Use one of these forms:

```text
docs/nwn-skill-pack/knowledge-inbox/templates/user-feedback-form.md
docs/nwn-skill-pack/knowledge-inbox/templates/github-issue-body.md
```

The maintainer converts the form into a validated JSON record before it can affect the skill.

## Maintainer Review

Review the record into `reviewed/`, `rejected/`, or `promoted/`:

```powershell
python docs\nwn-skill-pack\tools\nwn_skill_feedback.py review `
  docs\nwn-skill-pack\knowledge-inbox\incoming\<record-id>.json `
  --out docs\nwn-skill-pack\knowledge-inbox\reviewed `
  --reviewer "<maintainer>" `
  --decision accept-for-promotion `
  --status project-specific `
  --promotion-ready `
  --target-reference "references/nui-player-ui.md" `
  --required-action "Keep project-specific until reproduced on another module." `
  --notes "Evidence redacted and reusable."
```

Then follow:

```text
docs/nwn-skill-pack/human-feedback-release-workflow.md
docs/nwn-skill-pack/knowledge-inbox/lifecycle-policy.md
docs/nwn-skill-pack/contributor-feedback-packet.md
docs/nwn-skill-pack/knowledge-inbox/schema/feedback-record.schema.json
```

## Promotion Boundary

Do not paste raw records into the installed skill. Promote only the reusable lesson, keep the evidence label, update both skill copies, run preflight, choose the SemVer bump, and publish a new package version.

Useful checks:

```powershell
python docs\nwn-skill-pack\tools\check_feedback_intake_docs.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_contribution_bundle_format.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_external_contributor_trial_packet.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_external_contributor_trial_result_template.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_external_trial_records.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_contributor_intake_quickstart.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\run_repo_artifact_preflight.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_release_gate.py docs\nwn-skill-pack --target repo-artifact
```

Use release-candidate or install-candidate gates only when evidence records and `version-manifest.json` honestly support that package state.
