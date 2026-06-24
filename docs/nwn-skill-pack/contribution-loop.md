# NWN Skill Pack Contribution Loop

## Problem

People using the skill pack will learn things while building real NWN servers. That knowledge should strengthen future versions of the skill, but it should not be blindly written into official reference files.

The model can write files in a workspace when allowed, but it cannot safely self-train or globally update every user's installed skills. We need a reviewed contribution path.

## Recommended Flow

```text
User task
  -> Codex uses nwn-server-gamedev
  -> New lesson appears
  -> Codex writes feedback record to knowledge-inbox/incoming
  -> Maintainer reviews and verifies
  -> Record moves to reviewed or rejected
  -> Verified pattern is promoted into references
  -> Version bump and release notes
```

For human-facing intake, use:

```text
docs/nwn-skill-pack/contributor-feedback-packet.md
docs/nwn-skill-pack/knowledge-inbox/templates/user-feedback-form.md
docs/nwn-skill-pack/knowledge-inbox/templates/github-issue-body.md
docs/nwn-skill-pack/human-feedback-release-workflow.md
```

These files help contributors describe evidence. They do not replace validated feedback records or maintainer review.
The release workflow explains when reviewed feedback becomes a reference change, SemVer bump, and new package version.

## Inbox Folders

```text
knowledge-inbox/
  incoming/   unreviewed records from users or model-assisted sessions
  reviewed/   records that passed human review but are not yet merged
  promoted/   records already incorporated into skill references
  rejected/   records reviewed and intentionally not used
```

Lifecycle policy:

```text
docs/nwn-skill-pack/knowledge-inbox/lifecycle-policy.md
```

## Feedback Record Fields

Machine-readable schema:

```text
knowledge-inbox/schema/feedback-record.schema.json
```

Required:

- `schema_version`
- `id`
- `created_at`
- `domain`
- `title`
- `summary`
- `source_type`
- `status`
- `evidence`
- `proposed_skill_update`

Recommended:

- `nwn_version`
- `server_context`
- `files_or_scripts`
- `runtime_steps`
- `failure_mode`
- `verified_by`
- `notes`

## Status Values

- `unverified`: captured but not trusted.
- `runtime-verified`: tested in game, Toolset, local server, or client.
- `docs-verified`: checked against documentation or source material.
- `project-specific`: valid for one project only.
- `promoted`: merged into the official skill pack.
- `rejected`: reviewed and intentionally not used.
- `superseded`: replaced by a better record.

## Human Review Rules

Before promotion, check:

- Is this generally true for NWN/NWN:EE, or only one project?
- Was it tested in runtime, Toolset, server logs, or docs?
- Does it belong in an existing reference file?
- Is it concise enough to help future Codex sessions?
- Does it include a failure mode or validation step?
- Does it conflict with existing guidance?

## Maintainer Review Command

Create feedback records with `nwn_skill_feedback.py new`, then validate the incoming queue:

```powershell
python docs\nwn-skill-pack\tools\nwn_skill_feedback.py validate docs\nwn-skill-pack\knowledge-inbox\incoming
```

Generate the maintainer promotion backlog:

```powershell
python docs\nwn-skill-pack\tools\generate_feedback_promotion_backlog.py docs\nwn-skill-pack --out docs\nwn-skill-pack\knowledge-inbox\promotion-backlog.md
```

Write a reviewed copy with a maintainer decision:

```powershell
python docs\nwn-skill-pack\tools\nwn_skill_feedback.py review `
  docs\nwn-skill-pack\knowledge-inbox\incoming\<record>.json `
  --out docs\nwn-skill-pack\knowledge-inbox\reviewed `
  --reviewer "<name-or-role>" `
  --decision needs-more-evidence `
  --status project-specific `
  --target-reference references\nui-player-ui.md `
  --required-action "Attach relog runtime steps before promotion." `
  --notes "Keep project-specific until reproduced or docs-backed."
```

Use `--out docs\nwn-skill-pack\knowledge-inbox\rejected` and `--decision reject --status rejected` for records that should not be used. Use `--promotion-ready` only when the record is concise, evidence-backed, redacted, and ready to become a reference change.

The review command writes a reviewed/rejected copy. If the original record remains in `incoming/`, the promotion backlog treats it as source history once a same-id reviewed/rejected/promoted copy exists.

## Release Versioning

Use semantic versioning:

- `MAJOR`: breaking restructuring, renamed skills, incompatible feedback schema.
- `MINOR`: new domains, new references, new scripts, substantial workflow additions.
- `PATCH`: corrections, clarified examples, small script fixes.

Examples:

- `0.1.0`: first public skeleton.
- `0.2.0`: adds NUI and persistence references.
- `0.2.1`: fixes feedback validator bug.
- `1.0.0`: stable public release after real server usage.

## Contribution Policy

Incoming user knowledge is accepted as evidence, not truth. Promote only after review.

Use attribution categories instead of private personal data:

- `user-runtime-test`
- `maintainer-review`
- `docs-research`
- `model-suggestion`
- `claude-opus-import`
- `codex-session`
- `project-postmortem`

Records from model outputs should default to `unverified` unless paired with runtime or documentation evidence.

## Better System Later

If the community grows, move from local inbox files to:

- GitHub issues or pull requests,
- a small web form that emits feedback JSON,
- a hosted validation service,
- an MCP server that lets Codex search verified records,
- a RAG corpus with citations.

Start local and file-based. It is easier to audit.
