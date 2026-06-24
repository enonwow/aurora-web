# External Contributor Trial Tester Message EXT-001

## Copy This Message

Hi,

I am sending `ext-001.zip` for a no-coaching usability trial of the NWN server gamedev skill-pack feedback intake.

Please use only the files inside the ZIP. Start with `START-HERE.md`, then follow `knowledge-inbox/external-contributor-trial-packet.md`.

Package details:

- package: `nwn-server-gamedev-pack`
- version: `0.1.0`
- package state: `repo artifact`
- trial id: `EXT-001`
- ZIP file: `ext-001.zip`
- SHA-256: `15460d0ee4c9fd378f6833b67dc60fda391af648d4d2e74728f6519e67e55fd1`

Please do this without maintainer coaching:

1. Extract the ZIP.
2. Use one real or synthetic NWN server lesson from areas, items, creatures, 2DA/HAK/TLK, NWScript, NUI, quests, economy, persistence, deployment, testing, or ops.
3. Try the command path first: `new`, `validate`, `bundle`, then `verify-bundle`.
4. If commands cannot run, use the form path in `knowledge-inbox/templates/user-feedback-form.md`.
5. Return the created bundle or completed form, command transcript, friction list, and private-data confirmation.

Please do not include credentials, tokens, IP addresses, account names, private player data, private module files, or private server logs unless they are explicitly approved and redacted.

Reply with:

- result: `pass`, `partial`, or `fail`
- path used: command, form, or mixed
- returned artifact path or archive name
- command transcript or command failure notes
- friction list
- private-data confirmation
- whether any instruction made you think the official skill updates itself automatically

Boundary:

- this trial does not self-update an installed skill,
- this trial is not NWN runtime proof,
- this trial is not release-candidate evidence by itself,
- returned feedback remains untrusted until maintainer review.

## Maintainer Notes

- Source ZIP: `.codex-tmp/external-trial-public-packet/ext-001.zip`
- Attach or send the ZIP and this message from `.codex-tmp/external-trial-dispatch/ext-001/` after running `tools/build_external_trial_dispatch_bundle.py`.
- Run `tools/check_external_trial_cleanroom.py`, `tools/check_external_trial_dispatch_bundle.py`, and `tools/check_external_trial_received_dispatch.py` before sending, then record `--cleanroom-check` when creating the trial record.
- Add `--independent-tester` only for a real outside tester or accepted clean-clone run; never for local smoke alone.
- Do not send reviewer-only scoring notes, expected references, release blockers, or prior trial records.

