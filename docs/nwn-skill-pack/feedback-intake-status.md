# NWN Skill Pack Feedback Intake Status

Generated: 2026-06-19T09:43:28+00:00

## Summary

- Feedback records scanned: 2
- Incoming records needing maintainer review: 0
- Incoming records with reviewed/rejected/promoted copies: 1
- Promotion-ready reviewed records: 0
- Reference promotion records: 0
- Accepted reference promotion records: 0
- Proposed SemVer class: `NONE`
- Proposed next version: `0.1.0`

## Counts

State counts:

- `incoming`: 1
- `rejected`: 1

Status counts:

- `rejected`: 1
- `unverified`: 1

Domain counts:

- `nui`: 2

Source type counts:

- `codex-session`: 2

## Promotion Ready

- none

## Incoming Needing Review

- none

## Incoming With Existing Review Copy

- `20260618T075533Z-nui-feedback-record-smoke-test` states: incoming, rejected
  - incoming: `knowledge-inbox/incoming/20260618T075533Z-nui-feedback-record-smoke-test.json`

## Maintainer Next Actions

1. Do not patch skill references from `incoming` records.
2. Validate returned records with `tools/nwn_skill_feedback.py validate`.
3. Review records with `tools/nwn_skill_feedback.py review` and set `promotion_ready=true` only when evidence is strong enough.
4. For promotion-ready records, run `tools/generate_reference_promotion_proposal.py` before editing authoring and plugin-packaged references.
5. After patching references, write a `tools/reference_promotion_record.py` record and regenerate `knowledge-inbox/reference-promotions/aggregate.md`.
6. Regenerate `version-bump-plan.md`; do not bump while Proposed SemVer class remains `NONE`.
7. Treat `model-suggestion`, `claude-opus-import`, and `codex-session` records as untrusted until reviewed against docs or runtime evidence.

## Required Commands

```powershell
python docs\nwn-skill-pack\tools\nwn_skill_feedback.py validate docs\nwn-skill-pack\knowledge-inbox\incoming docs\nwn-skill-pack\knowledge-inbox\reviewed docs\nwn-skill-pack\knowledge-inbox\rejected
python docs\nwn-skill-pack\tools\generate_feedback_promotion_backlog.py docs\nwn-skill-pack --out docs\nwn-skill-pack\knowledge-inbox\promotion-backlog.md
python docs\nwn-skill-pack\tools\reference_promotion_record.py aggregate docs\nwn-skill-pack\knowledge-inbox\reference-promotions\records --out docs\nwn-skill-pack\knowledge-inbox\reference-promotions\aggregate.md
python docs\nwn-skill-pack\tools\generate_version_bump_plan.py docs\nwn-skill-pack --out docs\nwn-skill-pack\version-bump-plan.md
python docs\nwn-skill-pack\tools\generate_feedback_intake_status.py docs\nwn-skill-pack --out docs\nwn-skill-pack\feedback-intake-status.md
python docs\nwn-skill-pack\tools\check_feedback_intake_status.py docs\nwn-skill-pack
```

## Does Not Prove

This status report does not prove any submitted NWN claim, privacy safety, reference correctness, install behavior, fresh Codex answer quality, or NWN runtime behavior. It only summarizes current intake and promotion state.
