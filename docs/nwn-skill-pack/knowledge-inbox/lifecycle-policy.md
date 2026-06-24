# Feedback Lifecycle Policy

## Purpose

Define how feedback records move through `knowledge-inbox/` without pretending that user submissions automatically become skill knowledge.

## States

- `incoming/`: unreviewed source records from humans, model-assisted sessions, docs research, or tests.
- `reviewed/`: maintainer-reviewed records that may still need more evidence or editing.
- `promoted/`: records whose reusable lesson has been merged into skill references.
- `rejected/`: reviewed records that should not affect the skill.

## Copy, Do Not Mutate By Default

The review command writes a reviewed copy. Keeping the original `incoming/` record is allowed for auditability, especially when testing the workflow.

When an `incoming/` record has the same `id` as a record in `reviewed/`, `promoted/`, or `rejected/`, treat the `incoming/` file as source history, not as a fresh review task. The promotion backlog should show it under `Incoming With Existing Review Copy`.

## When To Clean Up

For a polished release branch, maintainers may move source records out of `incoming/` after a reviewed copy exists. Do this only when the repository policy for preserving raw submissions is clear.

Do not delete raw incoming records when they contain audit evidence that explains a review decision. Redact private data instead.

## Promotion Rules

Promote only when:

- a maintainer reviewed the record,
- `review.promotion_ready` is `true`,
- `review.decision` is `accept-for-promotion`,
- the proposed update is concise and reusable,
- evidence level is preserved in the destination reference,
- private data is absent or redacted.

Rejected, superseded, project-specific-only, and needs-more-evidence records can inform future research, but they do not become official skill guidance.

## Backlog Command

Regenerate the maintainer view after every review or promotion:

```powershell
python docs\nwn-skill-pack\tools\generate_feedback_promotion_backlog.py docs\nwn-skill-pack --out docs\nwn-skill-pack\knowledge-inbox\promotion-backlog.md
```

The backlog is triage. It does not prove that any NWN claim is true.

