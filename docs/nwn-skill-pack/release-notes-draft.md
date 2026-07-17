# nwn-server-gamedev-pack 0.1.0 Release Notes Draft

Generated: 2026-06-19T09:43:30+00:00

## Release State

- Package: nwn-server-gamedev-pack
- Version: 0.1.0
- State: repo artifact
- Skill: nwn-server-gamedev
- Current version: 0.1.0
- Proposed SemVer class: NONE
- Proposed next version: 0.1.0
- Accepted promotion records counted: 0
- Release candidate: not a release candidate
- Install candidate: not an install candidate

## What This Helps With

- Locations, areas, tilesets, and encounter-space planning.
- Items, equipment, loot tables, merchants, and reward loops.
- Creatures, encounters, AI, faction behavior, and balance notes.
- 2DA, HAK, TLK, custom content packaging, and compatibility review.
- NWScript events, server systems, quests, dialogue, and journal logic.
- NUI player interfaces, server/client UI state, and interaction flows.
- Economy, crafting, progression, persistence, database, and NWNX design.
- Deployment, NWSync, operational checks, and runtime QA planning.

## Verified Locally

- Repo artifact preflight is the canonical local verification route.
- Version manifest, version bump plan, release readiness, release evidence index, package inventory, package boundaries, and plugin package audit are checked by tooling.
- Package inventory roles: authoring-skill=21, feedback-process=27, feedback-rejected=1, feedback-reviewed=1, feedback-schema=7, feedback-source-incoming=1, feedback-template=6, forward-test-evidence=32, plugin-package=22, release-doc=45, release-tooling=140.
- Prompt forward tests recorded: 0.
- Install smoke tests recorded: 0.
- Accepted install smoke tests recorded: 0.

## Known Gaps

- This is not a release candidate.
- There are zero prompt forward tests accepted for release-candidate proof.
- There are zero install smoke tests accepted for install-candidate proof.
- There are no accepted reference promotion records, so the version bump plan stays at NONE.
- Local Aurora reverse/thread leads are release-routing material only; they are not a release-note claim of strengthened skill behavior.
- Public marketplace behavior has not been proven.
- NWN Toolset, dedicated server, client, module, log, or runtime behavior has not been proven.
- Model answer quality on fresh external tasks remains unproven until forward-test records exist.

Active manifest blockers:
- At least three accepted independent prompt forward tests with fresh/no-leak context and answer-capture artifacts have not been run.
- No local marketplace install or reinstall smoke test has been recorded.
- Concrete release handoff is filled only for repo-artifact review, not release-candidate or install handoff.

## Feedback Path

- Use the contributor intake quickstart to collect structured human feedback.
- Use the feedback CLI and contribution bundle format to keep incoming reports reviewable.
- Convert accepted human knowledge into a reference promotion proposal.
- Promote only reviewed claims through a reference promotion record.
- Regenerate the reference promotion aggregate and version bump plan before changing package version.

## Maintainer Commands

```powershell
python docs\nwn-skill-pack\tools\run_repo_artifact_preflight.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_plugin_package.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_release_gate.py docs\nwn-skill-pack --target release-candidate
python docs\nwn-skill-pack\tools\check_release_gate.py docs\nwn-skill-pack --target install-candidate
```

## Does Not Prove

This draft does not update the plugin, does not install the plugin, does not prove Codex UI discovery, does not prove public marketplace availability, does not prove fresh-thread answer quality, does not promote local Aurora reverse/thread leads into installed skill guidance, and does not prove NWN runtime behavior.
