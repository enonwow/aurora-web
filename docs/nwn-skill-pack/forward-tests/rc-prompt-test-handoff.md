# RC Prompt-Test Handoff

## Purpose

Use this handoff when asking another person or clean model session to run the minimal prompt-forward-test trio for the current RC blocker set.

This file is safe tester handoff material. It must not be pasted to the agent under test; give the agent only one prompt file.

## Current Package

- Package: `nwn-server-gamedev-pack`
- Version: `0.1.0`
- State: `repo artifact`
- Skill path for prompts: `draft-skills/nwn-server-gamedev`

## Tester Instructions

0. Maintainer refreshes the prompt pack and received inbox before handoff:

   ```powershell
   python docs\nwn-skill-pack\tools\build_forward_test_clean_session_prompts.py docs\nwn-skill-pack --force
   python docs\nwn-skill-pack\tools\check_forward_test_clean_session_received_pack.py docs\nwn-skill-pack
   ```

1. Open a fresh Codex thread or clean model session.
2. Choose exactly one clean-session prompt from the received inbox list below.
3. Paste only that clean-session prompt file into the clean session.
4. Initialize a capture sheet with `tools/init_forward_test_capture.py`, then save the raw answer immediately with `forward-tests/answer-capture-template.md`.
5. Return the captured answer to the maintainer.
6. Start a new clean session for the next prompt.

Do not send prior test results, suspected failures, reviewer notes, expected references, scoring guidance, or this handoff to the agent under test.

## Blank Capture Guard

Initialized capture sheets are placeholders until the raw answer and session facts are pasted into them.

Before reviewer scoring, the maintainer must run:

```powershell
python docs\nwn-skill-pack\tools\check_forward_test_return_captures.py docs\nwn-skill-pack --captures docs\nwn-skill-pack\.codex-tmp\forward-test-return-captures
```

Blank initialized sheets must fail this gate. Treat that failure as the expected blocker until the tester returns filled capture sheets.

## Minimal RC Trio

| Test | Title | Clean-session prompt | Source prompt | Capture requirement |
| --- | --- | --- | --- | --- |
| `FT-002` | Custom Item Plus 2DA/HAK/TLK Impact | `.codex-tmp/forward-test-clean-session-received/rc-minimum/inbox/prompts/ft-002-clean-session.md` | `forward-tests/prompts/ft-002-custom-spear-2da-hak-tlk.txt` | Use `forward-tests/answer-capture-template.md` before scoring. |
| `FT-003` | NUI Crafting Panel | `.codex-tmp/forward-test-clean-session-received/rc-minimum/inbox/prompts/ft-003-clean-session.md` | `forward-tests/prompts/ft-003-nui-crafting-panel.txt` | Use `forward-tests/answer-capture-template.md` before scoring. |
| `FT-008` | Feedback Contribution | `.codex-tmp/forward-test-clean-session-received/rc-minimum/inbox/prompts/ft-008-clean-session.md` | `forward-tests/prompts/ft-008-feedback-contribution.txt` | Use `forward-tests/answer-capture-template.md` before scoring. |

## Return To Maintainer

For each run, return:

- test id
- prompt file
- model or session label
- fresh-context confirmation
- raw answer path or transcript
- any contamination or deviation
- filled capture sheet path, preferably under `.codex-tmp/forward-test-return-captures/`
- received prompt-pack summary path: `.codex-tmp/forward-test-clean-session-received/rc-minimum/RECEIVED-CLEAN-SESSION-SUMMARY.json`

## Verification Boundary

This handoff proves only the intended no-answer-leak execution procedure. It does not prove a test was run, a prompt passed, a plugin installed, or any NWN runtime behavior.
