# Aurora Live Record Review Queue

Generated: 2026-06-19T09:43:28+00:00

## Summary

- Status: `no-records`
- Records directory: `knowledge-inbox/aurora-live-records`
- Submitted JSON records: `0`
- Valid records: `0`
- Invalid records: `0`
- Review outcome directory: `knowledge-inbox/aurora-live-review-outcomes/records`
- Review outcome records: `0`
- Valid review outcome records: `0`
- Invalid review outcome records: `0`
- Held review outcomes: `0`
- Initialized-only records: `0`
- Promotion-ready atom rows: `0`
- Blocked atom rows: `0`
- Label-risk rows: `0`

This queue is maintainer triage. It is not installed skill content, not skill knowledge, not docs/RAG source material, and not proof by itself.

## Required Review Gate

- Use `knowledge-inbox/aurora-live-record-review-checklist.md` before generating a proposal.
- Keep `screen-backed` and `symbol-only` crosswalk leads separate from evidence labels.
- Do not turn `toolset-observed` into runtime guidance.
- Require `runtime-tested` client/server/log evidence before runtime behavior claims.
- Reject raw decompilation, private module data, player data, account data, tokens, and IPs.

## Atom Status Counts

- none

## Evidence Label Counts

- none

## Review Outcome Counts

- none

## Retest Requests

- No held review outcomes are waiting for retest dispatch.

## Promotion Review Queue

- No promotion-ready atom rows are waiting for review.

## Label Risks

- No label-risk rows found.

## Blockers

- No blocked atom rows found.

## Rejections

- No rejected atom rows found.

## Invalid Records


## Invalid Review Outcome Records

- none

## Commands

```powershell
python docs\nwn-skill-pack\tools\aurora_toolset_live_record.py validate docs\nwn-skill-pack\knowledge-inbox\aurora-live-records
python docs\nwn-skill-pack\tools\check_aurora_live_records.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\aurora_live_review_outcome_record.py validate docs\nwn-skill-pack\knowledge-inbox\aurora-live-review-outcomes\records --root docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\aurora_live_review_outcome_record.py aggregate docs\nwn-skill-pack\knowledge-inbox\aurora-live-review-outcomes\records --out docs\nwn-skill-pack\knowledge-inbox\aurora-live-review-outcomes\aggregate.md --root docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_aurora_live_review_outcome_records.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\generate_aurora_live_review_queue.py docs\nwn-skill-pack --out docs\nwn-skill-pack\knowledge-inbox\aurora-live-review-queue.md
python docs\nwn-skill-pack\tools\check_aurora_live_review_queue.py docs\nwn-skill-pack
```

## Next Action

If status is `no-records`, run the one-session live operator path first. If status is `prepared-only-no-review`, wait for returned observations, artifacts, and redaction review before queueing promotion. If status is `retest-request-needed`, send the Retest Requests section to the operator and ask only for the smallest missing atom from the `hold-for-retest` outcome; do not promote references yet. If status is `promotion-review-needed`, review the rows with `aurora-live-record-review-checklist.md` before generating a promotion proposal.
