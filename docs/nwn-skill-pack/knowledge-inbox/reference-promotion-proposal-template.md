# Reference Promotion Proposal Template

## Purpose

Use this template when a maintainer wants to turn one accepted human feedback record into a reviewed reference patch for `nwn-server-gamedev`.

This is not automatic learning. It does not self-update an installed skill, does not prove an NWN claim by itself, and does not replace a versioned release.

For a prefilled draft from one accepted reviewed record, use:

```powershell
python docs\nwn-skill-pack\tools\generate_reference_promotion_proposal.py `
  docs\nwn-skill-pack `
  docs\nwn-skill-pack\knowledge-inbox\reviewed\<record-id>.json `
  --out docs\nwn-skill-pack\knowledge-inbox\reference-promotion-proposals\<record-id>.md `
  --maintainer <name> `
  --semver MINOR
```

## Source Feedback Record

- Proposal id:
- Source record path:
- Source record id:
- Source bundle id, if any:
- Required review state: `review.decision=accept-for-promotion`
- Required promotion flag: `review.promotion_ready=true`
- Maintainer:
- Date:

Stop if the source record has not passed:

```powershell
python docs\nwn-skill-pack\tools\nwn_skill_feedback.py validate docs\nwn-skill-pack\knowledge-inbox\incoming
python docs\nwn-skill-pack\tools\nwn_skill_feedback.py validate docs\nwn-skill-pack\knowledge-inbox\reviewed
python docs\nwn-skill-pack\tools\generate_feedback_promotion_backlog.py docs\nwn-skill-pack --out docs\nwn-skill-pack\knowledge-inbox\promotion-backlog.md
```

## Claim To Promote

- One-sentence claim:
- Why it is useful for NWN server gamedev:
- Domain:
- Source type:
- Existing reference section affected:
- New wording or patch summary:

## Evidence Label

Choose exactly one label for the reference text:

- `docs-verified`: verified against a trusted documentation/source lane.
- `runtime-tested`: verified in Toolset, client, server, logs, or module behavior.
- `project-specific`: true only for a named server/module/context.

Evidence summary:

- Source registry lane:
- Runtime/Toolset/client/server/logs/module evidence:
- Known uncertainty:

## Target Reference Patch

Patch both copies or stop:

- Authoring reference target: `draft-skills/nwn-server-gamedev/references/`
- Plugin-packaged reference target: `draft-plugins/nwn-server-gamedev-pack/skills/nwn-server-gamedev/references/`
- `SKILL.md` routing change needed: yes/no
- `source-of-truth-map.md` update needed: yes/no
- `external-nwn-source-registry.md` update needed: yes/no
- `version-manifest.json` update needed: yes/no

Proposed patch notes:

```text
Replace this placeholder with the exact section, heading, or insertion point.
```

## Privacy And Scope

Confirm the proposal excludes:

- credentials,
- tokens,
- IP addresses,
- account names,
- private player data,
- private module names or files without permission,
- private server logs unless redacted.

Scope decision:

- Global reusable guidance:
- Project-specific guidance:
- Rejected or held because:

## SemVer Decision

Choose one:

- `PATCH`: wording, source link, small correction, or non-breaking helper fix.
- `MINOR`: new reference guidance, new reusable workflow, new QA step, or backward-compatible schema/tooling addition.
- `MAJOR`: skill rename, layout/trigger break, incompatible record schema, or removed public guidance.

Version files to update:

- `version-manifest.json`
- `draft-plugins/nwn-server-gamedev-pack/.codex-plugin/plugin.json`
- release handoff under `release-handoffs/`

## Verification Commands

Run after patching:

```powershell
python docs\nwn-skill-pack\tools\check_skill_routes.py docs\nwn-skill-pack\draft-skills\nwn-server-gamedev
python docs\nwn-skill-pack\tools\check_skill_routes.py docs\nwn-skill-pack\draft-plugins\nwn-server-gamedev-pack\skills\nwn-server-gamedev
python docs\nwn-skill-pack\tools\check_domain_reference_status.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_versioning_policy.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_plugin_package.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_release_gate.py docs\nwn-skill-pack --target repo-artifact
python docs\nwn-skill-pack\tools\run_repo_artifact_preflight.py docs\nwn-skill-pack
```

## Promotion Result

- Accepted into reference files:
- Moved or copied to `knowledge-inbox/promoted/`:
- Reference promotion record written under `knowledge-inbox/reference-promotions/records/`:
- Release handoff updated:
- Follow-up forward test needed:
- Follow-up runtime test needed:

After patching and promotion, validate the decision record and refresh the aggregate:

```powershell
python docs\nwn-skill-pack\tools\reference_promotion_record.py validate docs\nwn-skill-pack\knowledge-inbox\reference-promotions\records
python docs\nwn-skill-pack\tools\reference_promotion_record.py aggregate docs\nwn-skill-pack\knowledge-inbox\reference-promotions\records --out docs\nwn-skill-pack\knowledge-inbox\reference-promotions\aggregate.md
python docs\nwn-skill-pack\tools\check_reference_promotion_records.py docs\nwn-skill-pack
```

## Does Not Prove

This proposal does not prove fresh Codex behavior, plugin installation, public marketplace behavior, NWN runtime behavior, balance, fun, security, privacy safety beyond maintainer review, or future automatic skill improvement.
