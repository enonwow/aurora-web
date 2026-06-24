# Minimum RC Proof Packet

Generated from package metadata last updated: 2026-06-19T04:09:42Z

## Purpose

This is the one-page human execution packet for the minimum evidence still needed before release-candidate. It is not proof by itself.

## Current Gate Snapshot

- `release-candidate`: `BLOCKED`, 11 blocker(s).
- `install-candidate`: `BLOCKED`, 12 blocker(s).
- Package state: `repo artifact`
- Manifest RC allowed: `false`

## Minimum Prompt-Forward Evidence

Run these in fresh/no-leak contexts, one prompt per context, and capture the raw answer before opening reviewer-only scoring material:

Preferred clean-session prompt path after refreshing the received pack:

```powershell
python docs\nwn-skill-pack\tools\build_forward_test_clean_session_prompts.py docs\nwn-skill-pack --force
python docs\nwn-skill-pack\tools\check_forward_test_clean_session_received_pack.py docs\nwn-skill-pack
```

- `FT-002` `Custom Item Plus 2DA/HAK/TLK Impact`: `.codex-tmp/forward-test-clean-session-received/rc-minimum/inbox/prompts/ft-002-clean-session.md` from source `forward-tests/prompts/ft-002-custom-spear-2da-hak-tlk.txt`
- `FT-003` `NUI Crafting Panel`: `.codex-tmp/forward-test-clean-session-received/rc-minimum/inbox/prompts/ft-003-clean-session.md` from source `forward-tests/prompts/ft-003-nui-crafting-panel.txt`
- `FT-008` `Feedback Contribution`: `.codex-tmp/forward-test-clean-session-received/rc-minimum/inbox/prompts/ft-008-clean-session.md` from source `forward-tests/prompts/ft-008-feedback-contribution.txt`

## Recommended Full-Slice Probe

`FT-010` is not part of the minimum RC trio, but it is the best next prompt-forward test after the trio when maintainers want to verify that the skill handles a full NWN server vertical slice instead of only one domain.

Build a separate clean-session pack for it:

```powershell
python docs\nwn-skill-pack\tools\build_forward_test_clean_session_prompts.py docs\nwn-skill-pack --test-id FT-010 --out docs\nwn-skill-pack\.codex-tmp\forward-test-clean-session-prompts\full-slice-ft010 --force
python docs\nwn-skill-pack\tools\check_forward_test_clean_session_prompts.py docs\nwn-skill-pack --pack .codex-tmp\forward-test-clean-session-prompts\full-slice-ft010 --test-id FT-010 --pack-id CUSTOM-CLEAN-SESSION-PROMPTS
```

- `FT-010` `Full Feature Server Slice`: `.codex-tmp/forward-test-clean-session-prompts/full-slice-ft010/prompts/ft-010-clean-session.md` from source `forward-tests/prompts/ft-010-full-feature-server-slice.txt`
- Record it as extra prompt-forward evidence only after a fresh session returns a filled capture sheet and reviewer scoring is complete.


Use these artifacts in order:

- `forward-tests/answer-capture-template.md`
- `forward-tests/reviewer-packet.md`
- `forward-tests/record-command-templates.md`
- `.codex-tmp/forward-test-clean-session-received/rc-minimum/RECEIVED-CLEAN-SESSION-SUMMARY.json`

Every reviewed answer must name a First Implementable Slice with files/assets touched, expected proof, rollback, and evidence limits. Accepted pass/partial records must include `reviewer_assertions.first_implementable_slice=true`, normally through `--first-implementable-slice`.

Then refresh and check evidence:

```powershell
python docs\nwn-skill-pack\tools\forward_test_record.py validate docs\nwn-skill-pack\forward-tests\records
python docs\nwn-skill-pack\tools\forward_test_record.py aggregate docs\nwn-skill-pack\forward-tests\records --out docs\nwn-skill-pack\forward-tests\aggregate.md
python docs\nwn-skill-pack\tools\check_forward_test_evidence_policy.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_release_gate.py docs\nwn-skill-pack --target release-candidate
```

## Minimum Install-Smoke Evidence

After prompt evidence and/or when testing installability, build the repo-local sandbox and run a real install or registration check in a selected Codex environment:

```powershell
python docs\nwn-skill-pack\tools\build_plugin_install_candidate.py docs\nwn-skill-pack --force
python docs\nwn-skill-pack\tools\build_local_marketplace_candidate.py docs\nwn-skill-pack --force
python docs\nwn-skill-pack\tools\check_install_candidate.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_isolated_install_layout.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\generate_install_smoke_packet.py docs\nwn-skill-pack --out docs\nwn-skill-pack\forward-tests\install-smoke-packet.md
python docs\nwn-skill-pack\tools\check_install_smoke_packet.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_install_smoke_playbook.py docs\nwn-skill-pack
```

Record `INSTALL-001` only after the actual environment check. A `pass` requires `install_verification` with registered or installed source, fresh context, skill visibility or invocation, expected reference routing, runtime-boundary preservation, and `preparation_only=false`.

```powershell
python docs\nwn-skill-pack\tools\check_install_smoke_records.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_release_gate.py docs\nwn-skill-pack --target install-candidate
```

## External Feedback Is Not A Substitute

- `EXT-001` and contribution bundles can improve future versions but do not count as prompt-forward, install-smoke, or NWN runtime proof.
- Use the external trial dispatch path when asking another builder for feedback: `docs/nwn-skill-pack/.codex-tmp/external-trial-dispatch/ext-001/`.
- Keep this separate from release proof and verify the received path with `tools/check_external_trial_received_dispatch.py` and `tools/external_trial_record.py`.

## Aurora Live Intake Is Optional Runtime Evidence

- If a maintainer is collecting Aurora Toolset evidence, start from `knowledge-inbox/aurora-live-first-session-command-sheet.md`.
- Run `tools/check_prepare_aurora_live_session.py` and `tools/check_aurora_live_status.py` before opening Toolset to prove the prepared-only route writes scaffold files without marking atoms observed.
- Local Aurora reverse/thread leads from `local-aurora-reverse-ingestion.md`, `local-thread-019ed62e-aurora-ui-gallery-intake.md`, and `local-aurora-live-gap-queue.md` are live-session planning inputs only, not RC proof or NWN runtime proof.
- Do not count the prepared-only smoke test as RC proof, install-smoke proof, or NWN runtime proof.
- Count Aurora live intake only after a real returned record, evidence manifest, redacted artifacts, visual review, maintainer review outcome, and accepted reference-promotion decision exist.

## Runtime Evidence Is Separate

- No current NWN runtime evidence exists for this package.
- Static checks, prompt tests, install smoke, prepared-only Aurora scaffolds, and external feedback do not prove module behavior.
- Runtime evidence must include Toolset/client/server/logs/module proof for the relevant NWN behavior.

## Stop Conditions

- Do not mark RC if there are fewer than 3 accepted prompt-forward tests.
- Do not mark install-candidate or public release if there is no accepted install-smoke pass with `install_verification`.
- Do not treat `EXT-001` or isolated layout smoke as install-smoke pass evidence.
- Do not treat prepared-only Aurora session scaffolds as live Toolset evidence.
- Do not treat any item in this packet as NWN runtime evidence.

## Verified

- This packet is generated from `version-manifest.json`, `forward-tests/reviewer-matrix.json`, and `tools/check_release_gate.py`.
- The current repo artifact can pass local preflight while release-candidate and install-candidate gates remain blocked.

## Still Hypothesis

- The FT-002/FT-003/FT-008 trio is a minimal execution plan, not evidence.
- Install-smoke commands prepare the package surface, but only a real selected Codex environment run can create install-smoke evidence.
- Prepared-only Aurora smoke checks prove route mechanics, not Toolset truth.
- Runtime proof still requires an NWN Toolset, client, server, logs, or module-level verification step.
