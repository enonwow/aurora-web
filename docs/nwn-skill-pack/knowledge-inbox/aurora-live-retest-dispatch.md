# Aurora Live Retest Dispatch

Generated: 2026-06-19T09:43:28+00:00

## Purpose

Turn reviewed `hold-for-retest` outcomes into a small operator handoff for the next Aurora Toolset/NWN evidence pass. Each request asks for the smallest missing atom instead of broad retesting.

This dispatch is maintainer handoff material. It is not installed skill content, not skill knowledge, not docs/RAG source material, not runtime proof, not privacy proof, and not release readiness.

## Summary

- Status: `no-retest-requests`
- Review outcome directory: `knowledge-inbox/aurora-live-review-outcomes/records`
- Review outcome records: `0`
- Valid review outcome records: `0`
- Invalid review outcome records: `0`
- Held review outcomes: `0`

## Retest Dispatch Items

- No active retest requests. Wait for a real `hold-for-retest` review outcome record.
## Invalid Review Outcome Records

- none

## Maintainer Commands

```powershell
python docs\nwn-skill-pack\tools\aurora_live_review_outcome_record.py validate docs\nwn-skill-pack\knowledge-inbox\aurora-live-review-outcomes\records --root docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\generate_aurora_live_review_queue.py docs\nwn-skill-pack --out docs\nwn-skill-pack\knowledge-inbox\aurora-live-review-queue.md
python docs\nwn-skill-pack\tools\check_aurora_live_review_queue.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\generate_aurora_live_retest_dispatch.py docs\nwn-skill-pack --out docs\nwn-skill-pack\knowledge-inbox\aurora-live-retest-dispatch.md
python docs\nwn-skill-pack\tools\check_aurora_live_retest_dispatch.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_aurora_live_retest_result_template.py docs\nwn-skill-pack
```

## Intake After Return

When the operator returns the retest, ask for `knowledge-inbox/aurora-live-retest-result-template.md` to be completed, then record the evidence as a new Aurora live record or update the relevant returned bundle. Run review outcome intake again. Do not edit the skill references directly from this dispatch. Promotion still requires validated live records, evidence manifests, redaction review, maintainer review outcome records, and release evidence index refresh.

## Still Hypothesis

- The operator can complete the requested atom without additional context.
- The returned screenshot/log paths will be complete and redacted.
- The held atom will become acceptable for a future promotion proposal.
- The resulting evidence will improve future NWN server gamedev skill answers.
