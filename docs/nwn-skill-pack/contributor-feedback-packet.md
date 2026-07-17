# Contributor Feedback Packet

## Purpose

Help builders, testers, and other model sessions submit NWN knowledge that can improve `nwn-server-gamedev` without letting unreviewed claims overwrite official references.

This packet is for humans. The machine-readable source of truth is still a feedback record validated by:

```text
docs/nwn-skill-pack/knowledge-inbox/schema/feedback-record.schema.json
```

```powershell
python docs\nwn-skill-pack\tools\nwn_skill_feedback.py validate docs\nwn-skill-pack\knowledge-inbox\incoming
```

Maintain this packet with:

```powershell
python docs\nwn-skill-pack\tools\check_feedback_intake_docs.py docs\nwn-skill-pack
```

## What To Submit

Submit one focused finding per record:

- a runtime bug or verified behavior,
- a Toolset or module packaging lesson,
- a NUI bind/event failure mode,
- a NWScript event/context caveat,
- a 2DA/HAK/TLK/NWSync packaging observation,
- a source-backed docs correction,
- a project-specific pattern that may or may not generalize.

Do not submit broad essays, private module files, credentials, private player data, or unsourced model output as fact.

## Evidence Levels

Use the weakest honest status:

- `unverified`: model suggestion, memory, forum note, or report without proof.
- `project-specific`: true for one named server/module context only.
- `docs-verified`: checked against a documentation or source-code lane.
- `runtime-verified`: reproduced in Toolset, client, server runtime, logs, or a controlled test module.

Model output from Codex, Claude, Opus, or any other model should usually be `unverified` until a human attaches docs or runtime evidence.

For imported model output, follow:

```text
docs/nwn-skill-pack/knowledge-inbox/model-import-policy.md
```

## Safe Submission Checklist

Before sending:

- remove account names, IPs, credentials, tokens, private Discord/forum quotes, and private player data,
- replace private module names with a short neutral context unless the maintainer needs the exact name,
- include NWN/NWN:EE version when known,
- include whether NWNX is used,
- include exact reproduction steps when the claim is runtime-related,
- include expected and actual behavior,
- propose the target reference file,
- state what evidence is missing.

## Maintainer Intake Flow

1. Convert the report into a feedback JSON with `nwn_skill_feedback.py new`.
2. Validate the incoming queue.
3. Review into `reviewed/`, `rejected/`, or `promoted/` using `nwn_skill_feedback.py review`.
4. Promote only concise, reusable, evidence-labeled lessons into skill references.
5. Bump version and regenerate release readiness when promoted guidance changes a release.

## Contributor Command Shape

Use this command when the contributor can run project tooling:

```powershell
python docs\nwn-skill-pack\tools\nwn_skill_feedback.py new `
  --out docs\nwn-skill-pack\knowledge-inbox\incoming `
  --domain nui `
  --title "Crafting NUI bind did not refresh after relog" `
  --summary "A watched bind appeared stale after relog until the window was reopened." `
  --source-type user-runtime-test `
  --status project-specific `
  --nwn-version "NWN:EE <version>" `
  --server-context "Persistent server test module; NWNX status: <yes/no/unknown>." `
  --evidence "Redacted log/screenshot/reproduction note." `
  --runtime-steps "Open panel, mutate crafting state, relog, reopen or observe stale bind." `
  --failure-mode "Panel displayed stale state until manual reopen." `
  --proposed-file "references/nui-player-ui.md" `
  --proposed-summary "Mention relog and reopen tests for watched-bind refresh behavior." `
  --notes "Keep project-specific until reproduced or docs-backed."
```

## If The Contributor Cannot Run The Tool

Use:

```text
docs/nwn-skill-pack/knowledge-inbox/templates/user-feedback-form.md
```

For GitHub issue intake, use:

```text
docs/nwn-skill-pack/knowledge-inbox/templates/github-issue-body.md
```

The maintainer then converts the form into a validated feedback record.

For multiple validated records, build a contribution bundle:

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

The maintainer verifies a received bundle before review:

```powershell
python docs\nwn-skill-pack\tools\nwn_skill_feedback.py verify-bundle docs\nwn-skill-pack\.codex-tmp\contribution-bundle
```

## Acceptance Boundary

Accepted feedback strengthens future skill versions only after review and a new release. Installing the skill does not let user sessions automatically mutate the official skill pack.

Maintainers should follow the release workflow after accepting a record:

```text
docs/nwn-skill-pack/human-feedback-release-workflow.md
```
