# External Contributor Trial Result Template

## Purpose

Record one completed run of `external-contributor-trial-packet.md` without confusing intake usability evidence with NWN runtime proof or release-candidate evidence.

A completed trial result can prove only that a tester followed, partially followed, or failed to follow the contributor intake path from the packet. It does not self-update an installed skill, does not make the submitted feedback true, does not make private data safe, is not NWN runtime proof, and is not RC evidence unless a separate release gate explicitly accepts it later.

## Trial Metadata

- Trial ID:
- Date UTC:
- Package version:
- Version manifest path: `version-manifest.json`
- Packet used: `knowledge-inbox/external-contributor-trial-packet.md`
- Packet version or commit:
- Tester role:
- Tester environment:
- Path used: command path or form path
- Maintainer:

## Inputs Given To Tester

Confirm the tester received only public-facing intake material:

- `knowledge-inbox/contributor-intake-quickstart.md`
- `knowledge-inbox/contribution-bundle-format.md`
- `tools/nwn_skill_feedback.py`
- `knowledge-inbox/templates/user-feedback-form.md` if commands could not be run

Do not count the trial if the tester saw reviewer-only packets, expected answers, maintainer scoring notes, or prior trial results before completing the task.

## Returned Artifacts

Record the exact returned paths or archive names:

- bundle path or archive:
- `manifest.json`:
- `SUMMARY.md`:
- feedback-record JSON files:
- completed `user-feedback-form.md` if form path was used:
- command transcript:
- friction list:
- private-data confirmation:

## Maintainer Verification

Run static packet alignment first:

```powershell
python docs\nwn-skill-pack\tools\check_external_contributor_trial_packet.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_external_contributor_trial_result_template.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_external_trial_cleanroom.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_external_trial_dispatch_bundle.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_external_trial_received_dispatch.py docs\nwn-skill-pack
```

For command-path submissions, verify the returned bundle:

```powershell
python docs\nwn-skill-pack\tools\nwn_skill_feedback.py verify-bundle <received-bundle>
python docs\nwn-skill-pack\tools\nwn_skill_feedback.py validate <received-bundle>\feedback-records
```

For form-path submissions, convert the form into a validated feedback record before review.

Then use `nwn_skill_feedback.py review`, regenerate `knowledge-inbox/promotion-backlog.md` with `generate_feedback_promotion_backlog.py`, and follow `human-feedback-release-workflow.md` before any reference update, SemVer bump, or package release.

Record the trial outcome as machine-checkable evidence. Add `--independent-tester` only for a real outside tester or clean-clone run, never for local smoke alone.

```powershell
python docs\nwn-skill-pack\tools\external_trial_record.py new `
  --trial-id EXT-001 `
  --title "First outside contributor feedback bundle trial" `
  --result partial `
  --path-used command `
  --tester-role "outside NWN builder" `
  --tester-environment "redacted environment summary" `
  --public-input "knowledge-inbox/contributor-intake-quickstart.md" `
  --public-input "knowledge-inbox/contribution-bundle-format.md" `
  --returned-artifact "<received-bundle-or-form>" `
  --command-transcript "<transcript-path-or-summary>" `
  --friction "<one exact friction point>" `
  --no-private-data `
  --packet-check `
  --result-template-check `
  --cleanroom-check `
  --verify-bundle `
  --validate-records `
  --privacy-summary "Maintainer scrub found no private data." `
  --verification-notes "Bundle and copied records verified." `
  --improvement-needed `
  --improvement-summary "Clarify one setup step before broad handoff."
```

Then validate and aggregate:

```powershell
python docs\nwn-skill-pack\tools\external_trial_record.py validate docs\nwn-skill-pack\knowledge-inbox\external-trials\records
python docs\nwn-skill-pack\tools\external_trial_record.py aggregate docs\nwn-skill-pack\knowledge-inbox\external-trials\records --out docs\nwn-skill-pack\knowledge-inbox\external-trials\aggregate.md
python docs\nwn-skill-pack\tools\check_external_trial_records.py docs\nwn-skill-pack
```

## Trial Friction Feedback Candidate

For `partial`, `fail`, or any `pass` with reusable friction, create a maintainer-review feedback candidate after the external trial record exists. This captures improvements to the intake docs, command ergonomics, privacy wording, status labels, source-type labels, or feedback/versioning guidance without modifying the official skill automatically.

```powershell
python docs\nwn-skill-pack\tools\nwn_skill_feedback.py new `
  --domain ops `
  --title "EXT-001 intake friction: [short friction]" `
  --summary "[what confused or blocked the outside contributor]" `
  --source-type maintainer-review `
  --status unverified `
  --evidence "external trial record: docs\nwn-skill-pack\knowledge-inbox\external-trials\records\<record-id>.json" `
  --files-or-scripts "docs\nwn-skill-pack\knowledge-inbox\external-contributor-trial-result-template.md" `
  --files-or-scripts "docs\nwn-skill-pack\knowledge-inbox\external-trials\ext-001-handoff.md" `
  --failure-mode "[unclear setup, command failure, privacy ambiguity, label ambiguity, false self-update expectation]" `
  --proposed-file "draft-skills/nwn-server-gamedev/references/feedback-and-versioning.md" `
  --proposed-summary "[reusable intake/feedback/versioning guidance improvement]" `
  --notes "External trial friction candidate; does not update installed skill until reviewed and promoted."
```

Then validate and review the candidate conservatively:

```powershell
python docs\nwn-skill-pack\tools\nwn_skill_feedback.py validate docs\nwn-skill-pack\knowledge-inbox\incoming
python docs\nwn-skill-pack\tools\nwn_skill_feedback.py review <record> --reviewer "[reviewer]" --decision needs-more-evidence --status project-specific --required-action "[required contributor evidence, wording patch, or tooling patch]" --notes "[review notes]"
```

## Result Decision

Choose exactly one:

- `pass`: the record validates, the bundle verifies, no private data was reported, `--independent-tester` is true, and the tester completed the path without maintainer coaching.
- `partial`: the returned material is usable, but the tester needed maintainer help, skipped bundle verification, found unclear docs, used the form path because commands failed, or could not confidently apply evidence/status labels.
- `fail`: the tester could not produce a valid record/form, could not build or verify a bundle after reasonable setup, returned private data, or thought the contribution could modify the official skill directly.

Decision:

Rationale:

## Friction Notes

Capture exact friction before interpreting it:

- setup friction:
- command friction:
- wording friction:
- privacy scrub friction:
- domain/status/source-type ambiguity:
- missing context:
- suggested doc or tool change:

## Privacy And Quarantine

The maintainer must confirm the returned material does not include:

- credentials,
- tokens,
- IP addresses,
- account names,
- private player data,
- private module files or names unless sharing is approved,
- private server logs unless redacted.

If this cannot be confirmed, mark the trial `fail` or quarantine the bundle before any review.

## Verified Boundary

Verified by a completed template plus maintainer commands:

- whether the external contributor could follow the public intake packet,
- whether the returned bundle or form can be checked by local tooling,
- whether the sent ZIP passed cleanroom extraction and copied-CLI smoke before handoff,
- whether the trial result was completed by an independent tester rather than local smoke scaffolding,
- which instructions created friction.

Still not verified by this result:

- NWN runtime behavior,
- truth or global reuse of the feedback claim,
- privacy safety beyond the maintainer's scrub,
- release-candidate readiness,
- install-smoke behavior,
- automatic skill improvement.
