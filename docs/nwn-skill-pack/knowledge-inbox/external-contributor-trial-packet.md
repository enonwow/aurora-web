# External Contributor Trial Packet

## Purpose

Run one no-coaching trial with an external NWN builder before treating the feedback intake path as usable by people outside the maintainer circle.

This packet tests contribution usability only. It does not self-update an installed skill, it is not RC evidence, and it is not NWN runtime proof. A successful trial proves that the contributor could follow the intake/bundle instructions and return a reviewable package; it does not prove that the submitted claim is true, globally reusable, private-data-safe, or ready for promotion.

## Give The Tester

Send these repo paths or their rendered contents:

- `knowledge-inbox/contributor-intake-quickstart.md`
- `knowledge-inbox/contribution-bundle-format.md`
- `tools/nwn_skill_feedback.py`
- `knowledge-inbox/templates/user-feedback-form.md` only when the tester cannot run commands

Do not send maintainer-only scoring notes, reviewer packets, release blockers, or expected answers. The trial should measure whether the contributor can use the public-facing intake path from the packet alone.

## Trial Task

Ask the tester to use one real or synthetic NWN server lesson from a domain such as NUI, 2DA/HAK/TLK, NWScript, areas, items, creatures, quests, economy, persistence, deployment, testing, or ops.

Command path:

1. Create one feedback record with `nwn_skill_feedback.py new`.
2. Run `nwn_skill_feedback.py validate` on the feedback directory.
3. Build a sendable bundle with `nwn_skill_feedback.py bundle`.
4. Run `nwn_skill_feedback.py verify-bundle` on the created bundle.
5. Return the bundle path or archive plus the required return notes below.

Form path:

1. Fill `user-feedback-form.md`.
2. State that commands could not be run.
3. Return the completed form plus the required return notes below.

## Required Return

The tester returns:

- bundle path or archive, or a completed `user-feedback-form.md`,
- `manifest.json` when a bundle was built,
- `SUMMARY.md` when a bundle was built,
- command transcript for every command attempted,
- usability result: `pass`, `partial`, or `fail`,
- private-data confirmation,
- friction list,
- whether the commands worked without maintainer help,
- any ambiguity in status labels, domains, source types, or privacy scrub rules.

Maintainers should record the result with `external-contributor-trial-result-template.md` instead of treating an informal message as release evidence.

## Result Rules

Use `pass` when the record validates, the bundle verifies, the tester reports no private data, and the contributor could complete the path from the packet without maintainer coaching.

Use `partial` when the returned records or form are usable but the tester needed maintainer help, skipped bundle verification, hit unclear documentation, or could not confidently apply evidence/status labels.

Use `fail` when the tester cannot produce a valid record/form, cannot build or verify a bundle after reasonable setup, returns private data that should have been scrubbed, or believes the docs imply that a contribution can modify the official skill directly.

## Privacy Confirmation

The tester must confirm that the returned material does not include:

- credentials,
- tokens,
- IP addresses,
- account names,
- private player data,
- private module files or names unless sharing is approved,
- private server logs unless redacted.

If the tester cannot make this confirmation, mark the trial `fail` or quarantine the bundle before review.

## Maintainer Follow-Up

For command-path submissions, run:

```powershell
python docs\nwn-skill-pack\tools\check_external_trial_cleanroom.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\nwn_skill_feedback.py verify-bundle <received-bundle>
python docs\nwn-skill-pack\tools\nwn_skill_feedback.py validate <received-bundle>\feedback-records
```

Then review accepted records with `nwn_skill_feedback.py review`, regenerate `knowledge-inbox/promotion-backlog.md` with `generate_feedback_promotion_backlog.py`, and follow `human-feedback-release-workflow.md` before any reference update or version bump.

For form-path submissions, convert the form into a validated JSON record before review.

## Verified Boundary

Verified locally:

- `contributor-intake-quickstart.md` names the one-record path, privacy scrub, bundle command, verification command, and no-self-update release boundary.
- `contribution-bundle-format.md` defines `manifest.json`, `SUMMARY.md`, copied feedback records, SHA-256 hashes, and maintainer verification.
- `nwn_skill_feedback.py new`, `nwn_skill_feedback.py validate`, `nwn_skill_feedback.py bundle`, and `nwn_skill_feedback.py verify-bundle` exist in the repo tool.
- `check_contribution_bundle_roundtrip.py` verifies the local bundle path on a synthetic fixture.
- `check_external_trial_cleanroom.py` verifies that the generated public ZIP extracts and the copied feedback CLI can run a synthetic command path from scratch storage.

Still hypothesis until tested with a person outside the maintainer workflow:

- An external contributor can complete the packet without maintainer coaching.
- The quickstart explains privacy risks clearly enough for real NWN server material.
- The bundle format is easier for multi-record feedback than a GitHub issue or plain form.
- The returned friction list will be specific enough to improve the next skill-pack version.
