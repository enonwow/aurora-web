# Versioning Policy

## Purpose

Define how the NWN server gamedev skill pack moves from local research to a package another builder can use, and how human feedback becomes a new version.

This policy applies to:

- `version-manifest.json`,
- `draft-skills/nwn-server-gamedev/`,
- `draft-plugins/nwn-server-gamedev-pack/`,
- feedback records under `knowledge-inbox/`,
- reference promotion records under `knowledge-inbox/reference-promotions/`,
- forward-test and install-smoke records under `forward-tests/records/`,
- release handoffs under `release-handoffs/`.

## Package States

Use exactly one package state in `version-manifest.json`:

| State | Meaning | Required Evidence |
| --- | --- | --- |
| `repo artifact` | Maintainer workspace is internally consistent and can be reviewed. | Repo-artifact preflight passes. |
| `release candidate` | Package is ready for targeted reviewer testing, but not general install handoff. | Forward tests, coverage, manifest, and RC handoff gates pass. |
| `local install candidate` | Package is ready for another builder to install from a local or team marketplace. | RC gate plus install-smoke evidence pass. |
| `public release` | Package is ready for broad distribution. | Install gate plus public handoff, known gaps, and contribution path are complete. |

Do not call a package a release candidate when `check_release_gate.py --target release-candidate` blocks.

## SemVer Rules

Use strict semantic versioning in both `version-manifest.json` and `.codex-plugin/plugin.json`.

Use `PATCH` for:

- typo fixes,
- clarified wording,
- source link corrections,
- small reference corrections that do not change guidance,
- small helper-script bug fixes,
- release or handoff wording that does not change behavior.

Use `MINOR` for:

- new NWN domain references,
- new helper scripts,
- new QA workflows,
- new reviewed patterns,
- new forward-test or install-smoke workflows,
- backward-compatible feedback schema additions,
- backward-compatible reference promotion record schema additions,
- promoted human feedback that changes how future server design tasks should be answered.

Use `MAJOR` for:

- renamed skill,
- changed trigger behavior,
- breaking folder layout,
- incompatible feedback or forward-test record schema,
- removed public guidance,
- package state model changes that break older handoffs.

## Human Feedback Release Path

Human feedback does not update installed skills by itself.

The required path is:

1. Capture one finding in `knowledge-inbox/incoming/` with `nwn_skill_feedback.py new`, or convert a form or issue into that record.
2. Validate records with `nwn_skill_feedback.py validate`.
3. Review with `nwn_skill_feedback.py review`.
4. Regenerate `knowledge-inbox/promotion-backlog.md`.
5. Promote only reusable, redacted, evidence-labeled lessons.
6. Generate or fill a reference promotion proposal before editing references.
7. Patch both authoring and plugin-packaged skill references when the installed skill should change.
8. Preserve evidence labels such as `unverified`, `project-specific`, `docs-verified`, `runtime-verified`, and reference-facing `runtime-tested`.
9. Record the accepted, held, or rejected promotion result with `reference_promotion_record.py` and refresh `knowledge-inbox/reference-promotions/aggregate.md`.
10. Generate `version-bump-plan.md` with `generate_version_bump_plan.py`.
11. Choose `PATCH`, `MINOR`, or `MAJOR` from the plan unless the maintainer documents an override.
12. Update `version-manifest.json` and `.codex-plugin/plugin.json` together.
13. Regenerate release readiness, evidence index, package inventory, install packet, and local sandbox artifacts.
14. Fill the concrete handoff for the claimed package state.
15. Publish or hand off the new version.

## Compatibility Rules

- Existing feedback and forward-test records remain audit evidence and should not be rewritten for cosmetic changes.
- Schema additions must be backward-compatible unless the version is major.
- `knowledge-inbox/incoming/` records are source history and must not become trusted guidance without review.
- `draft-skills/` is authoring source; `draft-plugins/` is the installable plugin boundary.
- Do not ship private module data, credentials, tokens, IP addresses, account names, private player data, or unredacted server logs.

## Release Checklist

Before any version handoff, run:

```powershell
python docs\nwn-skill-pack\tools\check_versioning_policy.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\generate_version_bump_plan.py docs\nwn-skill-pack --out docs\nwn-skill-pack\version-bump-plan.md
python docs\nwn-skill-pack\tools\check_version_bump_plan.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_version_manifest.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\run_repo_artifact_preflight.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_release_gate.py docs\nwn-skill-pack --target repo-artifact
```

Before RC:

```powershell
python docs\nwn-skill-pack\tools\check_release_gate.py docs\nwn-skill-pack --target release-candidate
```

Before local install handoff:

```powershell
python docs\nwn-skill-pack\tools\check_release_gate.py docs\nwn-skill-pack --target install-candidate
```

## Current Status

Current version: `0.1.0`.

Current state: `repo artifact`.

Current release-candidate status: blocked until independent prompt forward tests, install-smoke evidence, target coverage, manifest permission, and a release-candidate handoff exist.

## Verified Boundary

Verified locally:

- The manifest records version `0.1.0`, state `repo artifact`, release blockers, and SemVer policy.
- `check_version_manifest.py` checks manifest and plugin version alignment.
- `check_release_gate.py` blocks overstated package states.
- `run_repo_artifact_preflight.py` regenerates and checks the current repo artifact.

Still hypothesis until tested:

- Another builder can install the plugin and trigger the skill without local setup issues.
- Prompt forward tests prove the skill generalizes in fresh contexts.
- Human feedback from other builders improves answers after promotion and release.
