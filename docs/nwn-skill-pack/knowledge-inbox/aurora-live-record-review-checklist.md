# Aurora Live Record Review Checklist

## Purpose

Review a returned Aurora Toolset live record before it can produce a reference-promotion proposal for `nwn-server-gamedev`.

This checklist is maintainer handoff material. It is not installed skill content, not docs/RAG source material, and not proof by itself.

## Inputs

- `aurora-live-evidence-workflow.md`
- `aurora-live-operator-execution-packet.md`
- `knowledge-inbox/aurora-live-first-review-command-sheet.md`
- `knowledge-inbox/aurora-live-return-packet.md`
- `local-aurora-small-location-live-operator-checklist.md`
- `knowledge-inbox/aurora-live-review-queue.md`
- `knowledge-inbox/aurora-live-redaction-policy.md`
- `knowledge-inbox/aurora-live-visual-redaction-checklist.md`
- `knowledge-inbox/aurora-live-visual-redaction-records/aggregate.md`
- `knowledge-inbox/templates/aurora-live-review-outcome-record-template.json`
- `knowledge-inbox/schema/aurora-live-review-outcome-record.schema.json`
- `knowledge-inbox/aurora-live-review-outcomes/aggregate.md`
- `knowledge-inbox/templates/aurora-toolset-live-record-template.json`
- `knowledge-inbox/templates/aurora-live-evidence-manifest-template.json`
- `knowledge-inbox/aurora-live-records/*.json`
- `knowledge-inbox/aurora-live-evidence-manifests/*.json`
- screenshots, build logs, client/server logs, saved module notes, and redacted runtime evidence named by the record

## Review Order

1. Validate the record shape:
   `python docs\nwn-skill-pack\tools\aurora_toolset_live_record.py validate path\to\aurora-live-record.json`
2. Check the submitted records directory:
   `python docs\nwn-skill-pack\tools\check_aurora_live_records.py docs\nwn-skill-pack`
3. Refresh and check live status:
   `python docs\nwn-skill-pack\tools\check_aurora_live_status.py docs\nwn-skill-pack`
4. Run the redaction policy checker:
   `python docs\nwn-skill-pack\tools\check_aurora_live_redaction_policy.py docs\nwn-skill-pack`
5. Run the visual redaction checklist checker and visually inspect every referenced screenshot/log:
   `python docs\nwn-skill-pack\tools\check_aurora_live_visual_redaction_checklist.py docs\nwn-skill-pack`
6. Record and check the human visual redaction decision:
   `python docs\nwn-skill-pack\tools\aurora_live_visual_redaction_record.py aggregate docs\nwn-skill-pack\knowledge-inbox\aurora-live-visual-redaction-records\records --out docs\nwn-skill-pack\knowledge-inbox\aurora-live-visual-redaction-records\aggregate.md`
   `python docs\nwn-skill-pack\tools\check_aurora_live_visual_redaction_records.py docs\nwn-skill-pack`
7. Check submitted evidence manifests:
   `python docs\nwn-skill-pack\tools\check_aurora_live_evidence_manifest.py docs\nwn-skill-pack`
8. Check record-manifest consistency:
   `python docs\nwn-skill-pack\tools\check_aurora_live_intake_consistency.py docs\nwn-skill-pack`
9. Generate and check the review queue:
   `python docs\nwn-skill-pack\tools\generate_aurora_live_review_queue.py docs\nwn-skill-pack --out docs\nwn-skill-pack\knowledge-inbox\aurora-live-review-queue.md`
10. Confirm every claimed artifact path exists or has a clear redacted external storage note.
11. Confirm every `promotion_ready=true` atom has status, evidence label, observations, artifacts, and candidate reference routing.
12. Confirm any redacted-copy or external-bundle visual review row has `source_artifact_ref`, `source_artifact_sha256`, and `reviewed_artifact_sha256` before proposal generation, confirm `source_artifact_sha256` must match the source row `sha256` in the evidence manifest, and confirm `redaction_status=redacted` rows have a `reviewed_artifact_sha256` that differs from `source_artifact_sha256`.
13. Confirm any external visual review row has `external_provenance_note` with explicit immutable-storage, access, and SHA-256 hash-check notes plus `external_storage_provider` and ISO-8601 `external_access_checked_at`.
14. Confirm `screen-backed` and `symbol-only` leads were not promoted directly from the crosswalks.
15. Record the maintainer review outcome before or immediately after proposal generation:
   `python docs\nwn-skill-pack\tools\aurora_live_review_outcome_record.py from-live-record path\to\aurora-live-record.json --reviewer <name> --outcome accept-for-proposal --reference-promotion-allowed --accepted-standard-checks --dry-run`
   `python docs\nwn-skill-pack\tools\aurora_live_review_outcome_record.py from-live-record path\to\aurora-live-record.json --reviewer <name> --outcome accept-for-proposal --reference-promotion-allowed --accepted-standard-checks`
   `python docs\nwn-skill-pack\tools\aurora_live_review_outcome_record.py new --live-record-id <id> --live-record-path <path> --evidence-manifest-path <path> --reviewer <name> --outcome accept-for-proposal --decision-summary <summary> --promotion-proposal-path <path> --reference-promotion-allowed --accepted-atom <atom> --visual-redaction-record-id <id> --check-run <check> --check-passed <check>`
   `python docs\nwn-skill-pack\tools\aurora_live_review_outcome_record.py validate docs\nwn-skill-pack\knowledge-inbox\aurora-live-review-outcomes\records`
   `python docs\nwn-skill-pack\tools\aurora_live_review_outcome_record.py aggregate docs\nwn-skill-pack\knowledge-inbox\aurora-live-review-outcomes\records --out docs\nwn-skill-pack\knowledge-inbox\aurora-live-review-outcomes\aggregate.md`
   `python docs\nwn-skill-pack\tools\check_aurora_live_review_outcome_records.py docs\nwn-skill-pack`
16. Generate a proposal only after the review passes, the matching `pass` visual redaction review record covers every promotion-ready artifact, and a review outcome record uses `accept-for-proposal`. Use `hold-for-retest` when the route is useful but evidence is incomplete:
   `python docs\nwn-skill-pack\tools\generate_aurora_toolset_promotion_proposal.py docs\nwn-skill-pack path\to\aurora-live-record.json --out docs\nwn-skill-pack\knowledge-inbox\reference-promotion-proposals\aurora-live-record.md --maintainer <name>`

## Minimum First Live Pass Review Gate

For the first returned small-location bundle, review the returned atoms against
`local-aurora-small-location-live-operator-checklist.md` section
`Minimum First Live Pass` before reviewing optional Track A or Track B evidence.

Confirm one of these is true for every required row:

- the row has a matching live-record atom, observation, artifact, evidence-manifest row, and compatible evidence label;
- the row has an exact blocker that explains why the smallest failed atom should be retried or held;
- the row was explicitly out of scope and the review outcome is `hold-for-retest`, not `accept-for-proposal`.

Required minimum rows:

- `area.createWithWizard`
- `palette.switchBlueprintSource`
- `palette.selectObjectFamilyByIcon`
- `area.paintTerrainOrTile` or `area.inspectMainViewport`
- `placeable.createOrEditContainer`
- `inventory.insertItem`
- `creature.placeFromPalette`
- `creature.editScriptEvents` when the route is visible
- `area.placeStartLocation` or `door.linkAreaTransition`
- `toolset.buildAndClientRun`

Do not accept optional store, encounter, faction, resource picker, sound, or
schema-expansion evidence as a substitute for the minimum pass. A partial
minimum pass may still be useful, but it should produce `hold-for-retest` or a
blocked lesson, not compact skill guidance.

## Evidence Label Review

Use the label as the claim boundary:

- `local-reverse-lead`: hold. This can guide a future test, but it cannot patch skill references.
- `toolset-observed`: can support Toolset-operation wording only. It cannot claim client/server behavior.
- `static-checked`: can support file/config/module inspection wording only.
- `compiled`: can support build or script compile wording only.
- `runtime-tested`: can support behavior wording only when the artifacts include client/server/log evidence.
- `rejected`: keep as a negative lesson or blocker; do not promote.

Reject or downgrade a row when the label overstates the proof.

## Promotion-Ready Gate

Approve `promotion_ready=true` only when all are true:

- status is positive and compatible with the evidence label,
- observations are specific enough to become compact skill guidance,
- at least one artifact is listed and redacted,
- screenshots/logs have passed `knowledge-inbox/aurora-live-visual-redaction-checklist.md`,
- a `pass` visual redaction review record exists for the returned bundle or the atom is held,
- runtime claims have runtime-tested evidence,
- `promotion.candidate_references` names the intended reference file,
- the atom improves a realistic NWN server builder workflow,
- no raw decompilation, private module data, account data, IPs, tokens, or player data are copied into the future skill.

If any condition fails, set or request `promotion_ready=false` and record a blocker or re-test request.

## Schema Expansion Gate

Do not add new live-record atoms, statuses, evidence labels, or required fields because a local symbol or passive screen implies they may exist. A schema expansion is allowed only when review finds all of these:

- at least one returned live record contains a recurring sub-atom or field that cannot be represented by existing core atoms without losing important workflow evidence,
- the relevant evidence label is `toolset-observed`, `static-checked`, `compiled`, or `runtime-tested`, not `local-reverse-lead`,
- observations and artifacts are specific enough to name the missing atom or field compactly,
- the reviewer can explain why using multiple existing core atoms would hide a real NWN server-builder workflow,
- privacy, redaction, and record-manifest consistency checks already pass for the source evidence.

Keep schema-expansion candidates in review notes, blockers, or a reference-promotion proposal. Do not invent a temporary JSON status such as `schema-expansion-candidate`.

When expansion is accepted, update these as one change set:

- `knowledge-inbox/templates/aurora-toolset-live-record-template.json`
- `knowledge-inbox/schema/aurora-toolset-live-record.schema.json`
- `tools/aurora_toolset_live_record.py`
- live-record, review, and operator packet checks
- `aurora-live-operator-execution-packet.md`
- `local-aurora-small-location-live-operator-checklist.md`
- `maintainer-decision-index.md`
- release evidence, package inventory, and version-bump artifacts

Existing valid records must remain valid. If that is impossible, add an explicit migration note and treat the change as a breaking package change until the SemVer decision says otherwise.

## Proposal Boundary

A generated proposal is still not an accepted skill update. After proposal generation:

1. Review the proposal text for evidence-label honesty.
2. Patch both authoring and plugin-packaged reference copies, or reject the proposal.
3. Run route checks, domain-reference checks, and repo-artifact preflight.
4. Record the accepted or rejected result with `tools/reference_promotion_record.py`.
5. Regenerate the reference-promotion aggregate, version bump plan, release readiness, package inventory, and handoff artifacts.

## Stop Conditions

Stop review and request clarification when:

- artifact paths are missing or unverifiable,
- evidence includes private or unredacted data,
- Toolset UI evidence is used as runtime proof,
- `screen-backed` or `symbol-only` crosswalk status is treated as a final evidence label,
- the record contains raw decompilation text,
- the atom is useful only for the local reverse-engineering project and not for a realistic NWN server builder.

## Still Hypothesis

- This review checklist has not yet processed a real returned Aurora Toolset record.
- The first live run may reveal missing fields in the record schema or checklist.
- Schema expansion remains hypothesis until a reviewed live record proves the current core-atom model loses important evidence.
- The proposal generator enforces visual redaction record coverage, but that still depends on a real human inspection being performed correctly.
- Fresh Codex answer improvement still needs prompt-forward tests after any accepted reference patch.
