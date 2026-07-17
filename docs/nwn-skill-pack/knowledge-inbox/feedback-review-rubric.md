# Feedback Review Rubric

## Purpose

Give maintainers a repeatable way to review human, model, runtime, and tester feedback before it can strengthen `nwn-server-gamedev`.

This rubric is not automatic learning. It turns feedback into a maintainer decision. A skill version improves only after accepted review, a reference promotion proposal, a checked reference patch, a reference promotion record, SemVer decision, regenerated release evidence, and a new release.

## Inputs

Review only records that already pass:

```powershell
python docs\nwn-skill-pack\tools\nwn_skill_feedback.py validate docs\nwn-skill-pack\knowledge-inbox\incoming
python docs\nwn-skill-pack\tools\check_feedback_intake_docs.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\generate_feedback_intake_status.py docs\nwn-skill-pack --out docs\nwn-skill-pack\feedback-intake-status.md
python docs\nwn-skill-pack\tools\check_feedback_intake_status.py docs\nwn-skill-pack
```

Use `knowledge-inbox/model-import-policy.md` for model-originated claims from Claude, Opus, Codex, or other models. Model agreement is not verification.

## Decision Ladder

Apply the first matching decision:

| Condition | `review.decision` | `review.promotion_ready` | Next action |
| --- | --- | --- | --- |
| The record contains credentials, tokens, IP addresses, account names, private player data, or private module content. | `reject` or `needs-more-evidence` after quarantine | `false` | Do not promote. Record privacy reason and set status to `rejected` if closed. |
| The record is broad, duplicated, unclear, or cannot become one focused reusable lesson. | `reject` or `supersede` | `false` | Keep audit trail or link replacement and set status to `rejected` or `superseded`. |
| The claim is plausible but lacks documentation, runtime evidence, or exact project evidence. | `needs-more-evidence` | `false` | Ask for sources, logs, screenshots, Toolset steps, or minimal reproduction. |
| The claim is only model output without independent docs or runtime evidence. | `needs-more-evidence` | `false` | Convert to a lead through `model-import-policy.md`. |
| The claim is valid only for one private module, server, ruleset, or house style. | `project-specific-only`, or `accept-for-promotion` only if useful and labeled | maybe `true` | Preserve `project-specific` in the reference patch. |
| The claim is source-backed, reusable, privacy-clean, and has a clear reference target. | `accept-for-promotion` | `true` | Generate a reference promotion proposal. |

Never set `review.promotion_ready=true` for `unverified` model-originated claims, private data, broad essays, or records without a target reference and verification plan.

## Evidence Minimums

| Evidence label | Minimum before promotion | Reference requirement |
| --- | --- | --- |
| `unverified` | Captured but not trusted. | Do not promote as guidance. |
| `docs-verified` | Source lane is named, current enough for the claim, and reusable outside one project. | Link or cite the source lane and keep the claim narrow. |
| `runtime-tested` | Redacted Toolset, client, server, logs, screenshots, or reproducible steps exist. | Include the runtime verification step or failure mode. |
| `project-specific` | The contributor names the project constraint without exposing private data. | Preserve the `project-specific` label and avoid globalizing the claim. |
| `superseded` | A newer record or reference already replaces it. | Link the replacement; no new patch unless replacement is promoted. |

## Promotion-Ready Checklist

Before setting `review.decision=accept-for-promotion` and `review.promotion_ready=true`, verify:

- one focused reusable lesson exists,
- the NWN domain is correct,
- private data has been removed,
- evidence label is `docs-verified`, `runtime-tested`, or explicitly `project-specific`,
- target reference path is under `draft-skills/nwn-server-gamedev/references/`,
- matching plugin reference path exists under `draft-plugins/nwn-server-gamedev-pack/skills/nwn-server-gamedev/references/`,
- the proposed patch does not remove existing source-status labels,
- SemVer impact is `PATCH`, `MINOR`, or `MAJOR` and matches `versioning-policy.md`,
- verification commands are listed,
- expected release effect is compatible with `version-bump-plan.md`,
- the record can be turned into `knowledge-inbox/reference-promotion-proposal-template.md`.

## Review Commands

Use the review command to write a reviewed copy instead of editing incoming records in place:

```powershell
python docs\nwn-skill-pack\tools\nwn_skill_feedback.py review docs\nwn-skill-pack\knowledge-inbox\incoming\<record>.json --decision needs-more-evidence --status unverified --reviewer <name> --notes "missing runtime evidence"
python docs\nwn-skill-pack\tools\nwn_skill_feedback.py review docs\nwn-skill-pack\knowledge-inbox\incoming\<record>.json --decision accept-for-promotion --status docs-verified --promotion-ready --target-reference draft-skills/nwn-server-gamedev/references/nui-player-ui.md --reviewer <name> --notes "docs-verified reusable NUI guardrail with target reference"
python docs\nwn-skill-pack\tools\generate_feedback_promotion_backlog.py docs\nwn-skill-pack --out docs\nwn-skill-pack\knowledge-inbox\promotion-backlog.md
python docs\nwn-skill-pack\tools\generate_reference_promotion_proposal.py docs\nwn-skill-pack\knowledge-inbox\reviewed\<record>.json --out docs\nwn-skill-pack\knowledge-inbox\reference-promotion-proposals\<record>.md
python docs\nwn-skill-pack\tools\generate_feedback_intake_status.py docs\nwn-skill-pack --out docs\nwn-skill-pack\feedback-intake-status.md
```

## Stop Conditions

Stop before reference editing when:

- privacy review is incomplete,
- `review.decision` is missing,
- `review.promotion_ready=true` lacks sufficient evidence,
- `promotion_ready=false` is being treated as accepted,
- target reference is unclear,
- model output is being treated as verified because another model agreed,
- the reference patch would contradict `source-registry.md`,
- no verification command can be named,
- SemVer impact is unclear.

## Does Not Prove

This rubric proves only that maintainers have a consistent review procedure. It does not prove a submitted NWN claim is true, that a contributor used a clean environment, that private data was absent unless actually reviewed, that a reference patch is correct, that a new package version was released, that Codex answers improved, or that any NWN runtime behavior works.
