# FT-010 Full-Slice Clean-Session Handoff

## Purpose

Run `FT-010` in its own fresh Codex context to test whether `nwn-server-gamedev` can design a full NWN server vertical slice rather than overfocusing on one domain such as scripts, NUI, or content tables.

This is additional full-slice coverage. It does not replace the minimum release-candidate prompt trio `FT-002`, `FT-003`, and `FT-008`.

## Build The Prompt Pack

```powershell
python docs\nwn-skill-pack\tools\build_forward_test_clean_session_prompts.py docs\nwn-skill-pack --test-id FT-010 --out docs\nwn-skill-pack\.codex-tmp\forward-test-clean-session-prompts\full-slice-ft010 --force
python docs\nwn-skill-pack\tools\check_forward_test_clean_session_prompts.py docs\nwn-skill-pack --pack .codex-tmp\forward-test-clean-session-prompts\full-slice-ft010 --test-id FT-010 --pack-id CUSTOM-CLEAN-SESSION-PROMPTS
python docs\nwn-skill-pack\tools\check_forward_test_clean_session_received_pack.py docs\nwn-skill-pack --pack .codex-tmp\forward-test-clean-session-prompts\full-slice-ft010 --received .codex-tmp\forward-test-clean-session-received\full-slice-ft010 --test-id FT-010
```

## Prompt To Paste

Use only this generated file in a fresh thread:

```text
docs/nwn-skill-pack/.codex-tmp/forward-test-clean-session-prompts/full-slice-ft010/prompts/ft-010-clean-session.md
```

If testing the copied received inbox, use:

```text
docs/nwn-skill-pack/.codex-tmp/forward-test-clean-session-received/full-slice-ft010/inbox/prompts/ft-010-clean-session.md
```

Do not open `forward-tests/reviewer-matrix.json`, `forward-tests/reviewer-packet.md`, or `forward-tests/record-command-templates.md` before the raw answer is captured.

## Capture And Score

Create the raw capture sheet before reviewer scoring:

```powershell
python docs\nwn-skill-pack\tools\init_forward_test_capture.py docs\nwn-skill-pack --test-id FT-010 --out docs\nwn-skill-pack\.codex-tmp\forward-test-return-captures\full-slice-ft010\ft-010-capture.md
```

After the raw answer is pasted into that capture sheet, validate the returned capture before opening reviewer-only scoring material:

```powershell
python docs\nwn-skill-pack\tools\check_forward_test_return_captures.py docs\nwn-skill-pack --captures docs\nwn-skill-pack\.codex-tmp\forward-test-return-captures\full-slice-ft010 --test-id FT-010
```

After capture, score with reviewer-only material only after using `forward-tests/ft-010-full-slice-capture-review.md` as the post-capture reviewer bridge, then record the result through `tools/forward_test_record.py`.

## Expected Boundary

The answer should:

- use the capability map or equivalent routing before narrowing into domain details,
- cover the full feature slice: locations, items, creatures, 2DA/HAK/TLK, NWScript, NUI, quests, economy, persistence, deployment, and testing,
- mark any skipped domain as `out-of-scope` with an explicit reason,
- avoid treating a script, NUI mockup, or content table as the whole server slice,
- name a First Implementable Slice.

## Verification Boundary

The clean-session pack proves only that the prompt handoff has no expected-reference leakage and can be copied into a fresh thread. It does not prove the model answer, tester independence, NWN runtime behavior, full-slice competence, or release-candidate readiness.
