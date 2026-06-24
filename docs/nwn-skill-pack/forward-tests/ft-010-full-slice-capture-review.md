# FT-010 Full-Slice Capture Review Bridge

## Purpose

Use this bridge only after the raw `FT-010` answer has been pasted into a capture sheet and `tools/check_forward_test_return_captures.py` has passed for `--test-id FT-010`.

This bridge turns one captured answer into reviewer evidence for the full NWN server slice. It is reviewer-only material. Do not give it to the agent under test.

Optional helper: initialize a reviewer worksheet from the filled capture sheet:

```powershell
python docs\nwn-skill-pack\tools\init_ft010_full_slice_review.py docs\nwn-skill-pack --capture .codex-tmp\forward-test-return-captures\full-slice-ft010\ft-010-capture.md --out .codex-tmp\forward-test-reviews\full-slice-ft010\ft-010-review.md
```

## Required Inputs

- Filled capture sheet: `.codex-tmp/forward-test-return-captures/full-slice-ft010/ft-010-capture.md`
- Return-capture check:

```powershell
python docs\nwn-skill-pack\tools\check_forward_test_return_captures.py docs\nwn-skill-pack --captures docs\nwn-skill-pack\.codex-tmp\forward-test-return-captures\full-slice-ft010 --test-id FT-010
```

- Raw answer transcript path named in the capture sheet.
- Optional reviewer worksheet initialized by `tools/init_ft010_full_slice_review.py`.
- Reviewer-only materials opened only after the return-capture check passes: `forward-tests/reviewer-packet.md`, `forward-tests/reviewer-matrix.json`, and `forward-tests/record-command-templates.md`.

## Pre-Review Gates

Stop and mark the run as contaminated or unusable if any of these are true:

- the capture sheet is blank or missing the raw answer transcript path,
- the agent received more than one prompt,
- the agent saw reviewer-only material before answering,
- the answer was edited before capture,
- the fresh-context confirmation is missing or false,
- the returned-capture check fails.

If the answer lacks a First Implementable Slice, continue reviewing only to classify the miss; do not count the run as strong full-slice evidence.

## Full-Slice Coverage Table

For each domain, write `covered / weak / missing / out-of-scope`, quote or cite the captured answer location, and note the proof or blocker named by the answer.

| Domain | Status | Captured-answer evidence | Proof, rollback, or blocker named |
| --- | --- | --- | --- |
| Locations, areas, tilesets |  |  |  |
| Items, equipment, loot |  |  |  |
| Creatures, encounters, AI |  |  |  |
| 2DA, HAK, TLK pipeline |  |  |  |
| NWScript events and systems |  |  |  |
| NUI player UI |  |  |  |
| Quests, dialogue, journal |  |  |  |
| Economy, crafting, progression |  |  |  |
| Persistence, database, NWNX |  |  |  |
| Deployment, NWSync, operations |  |  |  |
| Testing, runtime QA |  |  |  |

## Review Rules

- A domain is `covered` only when the answer gives concrete work, expected proof, and either rollback or evidence limits.
- A domain is `weak` when the answer names it but gives only generic advice.
- A domain is `missing` when the answer silently omits it.
- A domain is `out-of-scope` only when the answer gives an explicit reason and the First Implementable Slice still makes sense.
- A single-domain answer cannot pass FT-010, even if that domain is detailed.
- A script, NUI mockup, content table, or checklist cannot stand in for the whole server slice.

## Feedback And Versioning

Promote reusable learning only through reviewed feedback or reference-promotion flow.

- If the answer exposes a skill gap, create a feedback candidate with `tools/nwn_skill_feedback.py` and attach the filled capture sheet.
- If the gap changes canonical skill references, use the reference-promotion process before editing installed skill references.
- Keep project-specific facts separate from general NWN skill knowledge.
- Treat accepted FT-010 results as extra prompt-forward evidence, not automatic RC proof.

Use this reviewer-only command template for a cross-domain FT-010 skill gap:

```powershell
python docs\nwn-skill-pack\tools\nwn_skill_feedback.py new `
  --domain concept `
  --title "FT-010 full-slice gap: [short gap]" `
  --summary "[what the captured answer missed across the full server slice]" `
  --source-type maintainer-review `
  --status unverified `
  --evidence "capture: docs\nwn-skill-pack\.codex-tmp\forward-test-return-captures\full-slice-ft010\ft-010-capture.md" `
  --evidence "review: docs\nwn-skill-pack\.codex-tmp\forward-test-reviews\full-slice-ft010\ft-010-review.md" `
  --files-or-scripts "docs\nwn-skill-pack\forward-tests\ft-010-full-slice-capture-review.md" `
  --failure-mode "[single-domain answer, missing domain, weak proof, or unsafe scope claim]" `
  --proposed-file "draft-skills/nwn-server-gamedev/references/server-gamedev-capability-map.md" `
  --proposed-summary "[proposed reusable skill/reference improvement]" `
  --notes "FT-010 reviewer-only feedback candidate; does not update installed skill until reviewed and promoted."
```

Validate and review the generated record before any promotion:

```powershell
python docs\nwn-skill-pack\tools\nwn_skill_feedback.py validate docs\nwn-skill-pack\knowledge-inbox\incoming
python docs\nwn-skill-pack\tools\nwn_skill_feedback.py review <record> --reviewer "[reviewer]" --decision needs-more-evidence --status project-specific --required-action "[required proof or reference patch]" --notes "[review notes]"
```

## Verification Boundary

This bridge proves only that a reviewer has a structured way to inspect one captured `FT-010` answer. It does not prove the model passed FT-010, NWN runtime behavior, external tester independence, plugin installation, or release-candidate readiness.
