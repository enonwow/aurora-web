# ADR-0001: Skill And Plugin First

## Status

Accepted for `0.1.0` repo artifact.

## Context

The NWN server gamedev pack must help a builder design locations, items, creatures, 2DA/HAK/TLK changes, NWScript systems, NUI panels, persistence, deployment, economy, quests, and runtime QA.

The pack also needs versioning and a human feedback path. An installed skill does not self-update, and user sessions do not mutate the official skill pack. Improvements must move through records, maintainer review, promoted reference changes, SemVer, regenerated evidence, and a new release.

Verified locally:

- `skill-creator` defines a skill as `SKILL.md` plus optional `agents/`, `scripts/`, `references/`, and `assets/`.
- `plugin-creator` defines the plugin package boundary through `.codex-plugin/plugin.json`.
- `docs/nwn-skill-pack/tools/run_repo_artifact_preflight.py` validates the current repo-artifact generation and checks.
- `docs/nwn-skill-pack/architecture-escalation-scorecard.md` records the current defer/use-now recommendation for skill, plugin, Git repo, local workflow tooling, repo-template, MCP, docs/RAG, hosted workflow tooling, and GitHub issue automation.
- `docs/nwn-skill-pack/tools/check_release_gate.py` blocks release-candidate status until forward tests, install smoke, coverage, manifest, and handoff evidence exist.

Still hypothesis:

- Whether another builder can install and trigger the plugin without local setup issues.
- Whether prompt forward tests prove the skill generalizes across fresh contexts.
- Whether community volume will justify MCP, docs/RAG, GitHub issue automation, or a repo template.

## Decision

Use this order for the current package:

1. Maintain the source of truth in Git under `docs/nwn-skill-pack/`.
2. Keep the compact Codex behavior in `draft-skills/nwn-server-gamedev/`.
3. Package the installable distribution as `draft-plugins/nwn-server-gamedev-pack/`.
4. Keep human feedback in validated records and reviewed promotion workflows, not in automatic skill mutation.
5. Defer repo-template, MCP, docs/RAG, and hosted workflow tooling until the escalation gates in `architecture-escalation-roadmap.md` are met.

## Options Considered

| Option | Current Decision | Why |
| --- | --- | --- |
| Codex skill | Use now | Best fit for progressive-disclosure NWN workflows and compact domain references. |
| Plugin | Use as package wrapper | Best fit for giving another Codex user an installable bundle later. |
| Git repo | Use now | Best fit for review, versioning, artifacts, records, and release evidence. |
| Repo template | Defer | Useful once real server folder conventions and feature slices stabilize. |
| MCP | Defer | Useful only when live shared submission/search/validation beats static files. |
| Docs/RAG | Defer | Useful only when reviewed knowledge becomes too large for static references. |
| Workflow tooling | Use locally only | Current scripts are enough for checks, records, inventory, and preflight. |

## Promotion Gates

Move from repo artifact to release candidate only when:

- at least three independent prompt forward tests are recorded,
- NUI, 2DA/HAK/TLK or packaging, runtime QA, economy/progression, and human feedback contribution coverage exist,
- no forward test is failing,
- install or reinstall smoke evidence exists before install-candidate sharing,
- `version-manifest.json` allows the claimed state,
- the concrete handoff is filled for the claimed state.

Consider a repo template only after two or three real NWN server feature slices reuse the same folder layout, script conventions, HAK/TLK/NWSync layout, and validation commands.

Consider MCP only after contributors need a shared live queue, hosted validators, server-specific tools, or one current source across multiple users.

Consider docs/RAG only after reviewed records and references become too large or noisy for static skill references, and retrieval can exclude unreviewed material.

## Consequences

Positive:

- The first artifact stays inspectable, versioned, and cheap to maintain.
- The installed skill remains compact and avoids process-document clutter.
- Human feedback strengthens later versions through review instead of untrusted self-modification.
- Static checks can prove packaging hygiene before real install and prompt tests exist.

Negative:

- Another user cannot benefit from their feedback until a maintainer releases a new version.
- Static files can become noisy if references grow without pruning.
- MCP/RAG automation is delayed until the bottleneck is real.
- A repo template is not available until conventions are proven by real slices.

## Validation

Required local commands:

```powershell
python docs\nwn-skill-pack\tools\check_architecture_decisions.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_architecture_scorecard.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\run_repo_artifact_preflight.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_release_gate.py docs\nwn-skill-pack --target repo-artifact
```

Expected current release-candidate result:

```powershell
python docs\nwn-skill-pack\tools\check_release_gate.py docs\nwn-skill-pack --target release-candidate
```

This should remain blocked until the evidence above exists.
