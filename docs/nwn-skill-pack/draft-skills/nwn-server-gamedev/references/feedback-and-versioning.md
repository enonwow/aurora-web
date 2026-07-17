# Feedback And Versioning

## Contribution Flow

Capture reusable lessons as feedback records. Do not edit official references directly during ordinary task work.

```text
task -> lesson -> feedback record -> review -> promoted reference update -> version bump
```

## Feedback Statuses

- `unverified`
- `runtime-verified`
- `docs-verified`
- `project-specific`
- `promoted`
- `rejected`
- `superseded`

## Versioning

Use semantic versioning:

- `MAJOR`: breaking skill structure or schema changes.
- `MINOR`: new domains, new references, new helper scripts.
- `PATCH`: corrections, clarifications, small validator fixes.

## Promotion Rules

Promote a record only when it is concise, evidence-backed, not private, and placed in the correct reference file.

Aurora Toolset live records, screenshots, local reverse-engineering notes, and decompilation-derived leads are intake material until reviewed. Do not patch installed skill references from them directly; first create or review a feedback/reference-promotion record that names the evidence label, redaction state, target reference, and maintainer decision.

## Review Command

Use `scripts/nwn_skill_feedback.py review` to write a reviewed copy with maintainer decision metadata. Do not treat `incoming` records as official guidance.

Decision values:

- `accept-for-promotion`
- `needs-more-evidence`
- `reject`
- `project-specific-only`
- `supersede`

Use `--promotion-ready` only after human review confirms evidence, redaction, target reference, and reuse value.
