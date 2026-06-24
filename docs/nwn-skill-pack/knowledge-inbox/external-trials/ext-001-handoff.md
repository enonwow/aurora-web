# External Contributor Trial Handoff EXT-001

## Purpose

Run `EXT-001` as a no-coaching usability check for the NWN contributor intake path in `nwn-server-gamedev-pack` version `0.1.0`.

This handoff proves only whether an outside tester can use the public intake packet and return reviewable material. It is not NWN runtime proof, not release-candidate evidence, not privacy proof, and not automatic skill improvement.

## Source State

- package state: `repo artifact`
- manifest last updated: `2026-06-19T04:09:42Z`
- source manifest: `version-manifest.json`
- trial packet: `knowledge-inbox/external-contributor-trial-packet.md`
- result template: `knowledge-inbox/external-contributor-trial-result-template.md`
- record tool: `tools/external_trial_record.py`
- aggregate: `knowledge-inbox/external-trials/aggregate.md`
- public packet builder: `tools/build_external_trial_public_packet.py`
- public packet checker: `tools/check_external_trial_public_packet.py`
- cleanroom checker: `tools/check_external_trial_cleanroom.py`
- tester message: `knowledge-inbox/external-trials/ext-001-tester-message.md`
- tester message generator: `tools/generate_external_trial_tester_message.py`
- tester message checker: `tools/check_external_trial_tester_message.py`
- dispatch bundle builder: `tools/build_external_trial_dispatch_bundle.py`
- dispatch bundle checker: `tools/check_external_trial_dispatch_bundle.py`
- received dispatch checker: `tools/check_external_trial_received_dispatch.py`

## Public Packet For Tester

Build the public-only tester packet before sending anything:

```powershell
python docs\nwn-skill-pack\tools\build_external_trial_public_packet.py docs\nwn-skill-pack --trial-id EXT-001 --force
python docs\nwn-skill-pack\tools\check_external_trial_public_packet.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_external_trial_cleanroom.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\generate_external_trial_tester_message.py docs\nwn-skill-pack --trial-id EXT-001
python docs\nwn-skill-pack\tools\check_external_trial_tester_message.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\build_external_trial_dispatch_bundle.py docs\nwn-skill-pack --trial-id EXT-001 --force
python docs\nwn-skill-pack\tools\check_external_trial_dispatch_bundle.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_external_trial_received_dispatch.py docs\nwn-skill-pack
```

Default generated packet:

- `docs/nwn-skill-pack/.codex-tmp/external-trial-public-packet/ext-001/`
- `docs/nwn-skill-pack/.codex-tmp/external-trial-public-packet/ext-001.zip`
- `docs/nwn-skill-pack/.codex-tmp/external-trial-dispatch/ext-001/`
- `docs/nwn-skill-pack/.codex-tmp/external-trial-received-dispatch/ext-001/`
- `docs/nwn-skill-pack/.codex-tmp/external-trial-received-dispatch/ext-001/RECEIVED-DISPATCH-SUMMARY.json`

Send either the directory or the ZIP archive. The checker verifies that the ZIP contains the same file set and bytes as the generated public packet directory, extracts it to scratch storage, and runs the copied feedback CLI smoke path from the extracted files.

Send the ZIP and tester message from `.codex-tmp/external-trial-dispatch/ext-001/`. Keep `SHA256SUMS.txt` and `DISPATCH-MANIFEST.json` as maintainer-side verification evidence. The tester message includes the current ZIP SHA-256 and no-coaching boundaries.

The packet should contain only these public-facing files plus generated `START-HERE.md` and `PUBLIC-PACKET-MANIFEST.json`:

- `knowledge-inbox/external-contributor-trial-packet.md`
- `knowledge-inbox/contributor-intake-quickstart.md`
- `knowledge-inbox/contribution-bundle-format.md`
- `tools/nwn_skill_feedback.py`
- `knowledge-inbox/templates/user-feedback-form.md` only when commands cannot be run

Do not send reviewer-only scoring notes, expected references, previous trial results, release blockers, or maintainer interpretations. Keep the trial no-coaching unless the goal is explicitly changed and recorded as `partial` or `fail`.

## Tester Task

Ask the tester to use one real or synthetic NWN server lesson from areas, items, creatures, 2DA/HAK/TLK, NWScript, NUI, quests, economy, persistence, deployment, testing, or ops.

They should return one of these:

- command path: a verified contribution bundle, `manifest.json`, `SUMMARY.md`, copied feedback records, command transcript, friction list, and private-data confirmation,
- form path: completed `user-feedback-form.md`, command failure notes, friction list, and private-data confirmation.

## Maintainer Static Checks Before Recording

```powershell
python docs\nwn-skill-pack\tools\check_external_contributor_trial_packet.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_external_contributor_trial_result_template.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_external_trial_handoff.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_external_trial_tester_message.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_external_trial_public_packet.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_external_trial_cleanroom.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_external_trial_dispatch_bundle.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_external_trial_received_dispatch.py docs\nwn-skill-pack
```

For command-path submissions, also run:

```powershell
python docs\nwn-skill-pack\tools\nwn_skill_feedback.py verify-bundle <received-bundle>
python docs\nwn-skill-pack\tools\nwn_skill_feedback.py validate <received-bundle>\feedback-records
```

## Record The Outcome

Use `pass` only when the tester completed the command path without maintainer coaching, `--independent-tester` is true, the bundle verified, records validated, no private data was reported, and no quarantine was needed.

Use `partial` when the tester returned useful material but needed help, used the form path because commands failed, skipped bundle verification, found unclear labels or privacy rules, or the run was local smoke rather than an independent tester.

Use `fail` when the tester could not return a valid record/form, returned private data, could not build or verify a bundle after reasonable setup, or believed the official skill self-updates from their submission.

```powershell
python docs\nwn-skill-pack\tools\external_trial_record.py new `
  --trial-id EXT-001 `
  --title "Outside contributor feedback bundle trial" `
  --result partial `
  --path-used command `
  --tester-role "outside NWN builder" `
  --tester-environment "redacted environment summary" `
  --public-input "knowledge-inbox/external-contributor-trial-packet.md" `
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

Then validate and regenerate aggregate:

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

## Verified Boundary

This handoff is generated from local repo metadata and command paths. It verifies only that the handoff is current, no-coaching oriented, and aligned with local static tooling. The cleanroom checker proves only that the generated ZIP can be copied into a scratch inbox, extracted, and the copied feedback CLI can run a synthetic command path from scratch storage. The dispatch bundle proves only that the current public ZIP and tester message were copied into one send-ready scratch directory with hashes. The received-dispatch checker proves only that the send-ready folder can be copied into a scratch inbox and used from received files without reading repo sources.

Still hypothesis until the trial is actually run:

- an outside tester can complete the packet without maintainer help,
- a future `pass` result will require `--independent-tester`,
- the returned command transcript is complete,
- the private-data confirmation is accurate,
- the feedback claim is true or useful for future skill versions.

