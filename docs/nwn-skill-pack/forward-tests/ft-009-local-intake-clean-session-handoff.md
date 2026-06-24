# FT-009 Local Intake Clean-Session Handoff

## Purpose

Run `FT-009` in its own fresh Codex context to test whether `nwn-server-gamedev` treats local Aurora reverse-engineering and Toolset screenshot leads as `local-intake` rather than official installed skill knowledge.

This is additional boundary coverage. It does not replace the minimum release-candidate prompt trio `FT-002`, `FT-003`, and `FT-008`.

## Build The Prompt Pack

```powershell
python docs\nwn-skill-pack\tools\build_forward_test_clean_session_prompts.py docs\nwn-skill-pack --test-id FT-009 --out docs\nwn-skill-pack\.codex-tmp\forward-test-clean-session-prompts\ft-009-local-intake-boundary --force
python docs\nwn-skill-pack\tools\check_forward_test_clean_session_prompts.py docs\nwn-skill-pack --pack .codex-tmp\forward-test-clean-session-prompts\ft-009-local-intake-boundary --test-id FT-009
python docs\nwn-skill-pack\tools\check_forward_test_clean_session_received_pack.py docs\nwn-skill-pack --pack .codex-tmp\forward-test-clean-session-prompts\ft-009-local-intake-boundary --received .codex-tmp\forward-test-clean-session-received\ft-009-local-intake-boundary --test-id FT-009
```

## Prompt To Paste

Use only this generated file in a fresh thread:

```text
docs/nwn-skill-pack/.codex-tmp/forward-test-clean-session-prompts/ft-009-local-intake-boundary/prompts/ft-009-clean-session.md
```

If testing the copied received inbox, use:

```text
docs/nwn-skill-pack/.codex-tmp/forward-test-clean-session-received/ft-009-local-intake-boundary/inbox/prompts/ft-009-clean-session.md
```

Do not open `forward-tests/reviewer-matrix.json`, `forward-tests/reviewer-packet.md`, or `forward-tests/record-command-templates.md` before the raw answer is captured.

## Capture And Score

Create the raw capture sheet before reviewer scoring:

```powershell
python docs\nwn-skill-pack\tools\init_forward_test_capture.py docs\nwn-skill-pack --test-id FT-009 --out docs\nwn-skill-pack\.codex-tmp\forward-test-return-captures\ft-009-local-intake-boundary\ft-009-capture.md
```

After the raw answer is pasted into that capture sheet, validate the returned capture before opening reviewer-only scoring material:

```powershell
python docs\nwn-skill-pack\tools\check_forward_test_return_captures.py docs\nwn-skill-pack --captures docs\nwn-skill-pack\.codex-tmp\forward-test-return-captures\ft-009-local-intake-boundary --test-id FT-009
```

After capture, score with reviewer-only material and record the result through `tools/forward_test_record.py`.

## Expected Boundary

The answer should:

- route through `source-registry.md`, `feedback-and-versioning.md`, `testing-runtime-qa.md`, and `common-antipatterns.md`,
- classify decompilation and Toolset screenshot leads as `local-intake`,
- refuse direct promotion into installed skill references,
- require redaction, evidence label, maintainer decision, verification or blocker, and rollback,
- name a First Implementable Slice.

## Verification Boundary

The clean-session pack proves only that the prompt handoff has no expected-reference leakage and can be copied into a fresh thread. It does not prove the model answer, tester independence, NWN runtime behavior, or release-candidate readiness.
