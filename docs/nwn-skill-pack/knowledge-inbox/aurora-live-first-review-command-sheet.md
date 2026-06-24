# Aurora Live First Review Command Sheet

## Purpose

Review the first returned Aurora Toolset live-session bundle before any reference-promotion proposal is generated.

This sheet is maintainer handoff material. It is not installed skill content, not docs/RAG source material, not runtime proof, and not an automatic skill update.

## Expected Return Bundle

Confirm the operator returned:

- filled live record JSON,
- filled evidence manifest JSON,
- redacted screenshots,
- redacted logs,
- saved-module notes when needed,
- exact blockers for incomplete or unclear steps.

Hold review if the bundle includes raw decompilation text, private module files, private player data, account names, IP addresses, tokens, credentials, or unredacted private logs.

## Intake Commands

Set `DATE` to the operator session date stamp.

Validate the record:

```powershell
python docs\nwn-skill-pack\tools\aurora_toolset_live_record.py validate docs\nwn-skill-pack\knowledge-inbox\aurora-live-records\aurora-live-<DATE>-small-location-first-pass.json
```

Check submitted records and evidence manifests:

```powershell
python docs\nwn-skill-pack\tools\check_aurora_live_records.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_aurora_live_evidence_manifest.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_aurora_live_intake_consistency.py docs\nwn-skill-pack
```

Check redaction policy and visual review scaffolding:

```powershell
python docs\nwn-skill-pack\tools\check_aurora_live_redaction_policy.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_aurora_live_visual_redaction_checklist.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_aurora_live_visual_redaction_records.py docs\nwn-skill-pack
```

Refresh queue and status:

```powershell
python docs\nwn-skill-pack\tools\generate_aurora_live_review_queue.py docs\nwn-skill-pack --out docs\nwn-skill-pack\knowledge-inbox\aurora-live-review-queue.md
python docs\nwn-skill-pack\tools\check_aurora_live_review_queue.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_aurora_live_status.py docs\nwn-skill-pack
```

Check the review rules:

```powershell
python docs\nwn-skill-pack\tools\check_aurora_live_record_review_checklist.py docs\nwn-skill-pack
```

Check the review-outcome record contract:

```powershell
python docs\nwn-skill-pack\tools\check_aurora_live_review_outcome_records.py docs\nwn-skill-pack
```

## Manual Review

## Minimum First Live Pass Review Gate

Before accepting or generating any proposal, confirm the returned bundle covers
the `Minimum First Live Pass` from
`local-aurora-small-location-live-operator-checklist.md`, or gives an exact
blocker for the smallest failed atom.

Required minimum-pass review points:

- `area.createWithWizard`: Toolset route, area opened, save/reopen note, and evidence manifest row.
- `palette.switchBlueprintSource` and `palette.selectObjectFamilyByIcon`: source/family evidence or exact blocker.
- `area.paintTerrainOrTile` or `area.inspectMainViewport`: visible edit/viewport evidence or exact blocker.
- `placeable.createOrEditContainer` plus `inventory.insertItem`: container/inventory/item evidence, client access, or exact blocker.
- `creature.placeFromPalette` and `creature.editScriptEvents` when visible: placement/scripts evidence or exact blocker.
- `area.placeStartLocation` or `door.linkAreaTransition`: start/transition fields plus client login/traversal proof or exact blocker.
- `toolset.buildAndClientRun`: build output, client/server route, clean logs, or exact blocker.

If this minimum pass is incomplete, choose `hold-for-retest` unless the returned
blocker itself is the reusable lesson being reviewed. Do not expand symbol-led
gaps, create new JSON atoms, or generate a promotion proposal from a partial
minimum pass.

For each `promotion_ready=true` atom, verify:

- status and evidence label match the actual proof,
- observations are specific enough for compact skill guidance,
- every artifact path exists or has an explicit external storage note,
- screenshots/logs are visually reviewed and redacted,
- runtime claims have `runtime-tested` client/server/log evidence,
- `promotion.candidate_references` names intended reference files,
- no `screen-backed` or `symbol-only` crosswalk status was promoted directly.

Hold or downgrade when Toolset UI evidence is used as runtime proof.

## Proposal Command

Generate a proposal only when validation passes, privacy/redaction review passes, record-manifest consistency passes, and at least one atom remains honestly promotion-ready:

```powershell
python docs\nwn-skill-pack\tools\generate_aurora_toolset_promotion_proposal.py docs\nwn-skill-pack docs\nwn-skill-pack\knowledge-inbox\aurora-live-records\aurora-live-<DATE>-small-location-first-pass.json --out docs\nwn-skill-pack\knowledge-inbox\reference-promotion-proposals\aurora-live-<DATE>-small-location-first-pass.md --maintainer <MAINTAINER>
```

A proposal is still not a skill update. Patch references only after maintainer review, then record the accepted or rejected result with `tools/reference_promotion_record.py`.

## Record Review Outcome

Before or immediately after proposal generation, create a review outcome record under:

`knowledge-inbox/aurora-live-review-outcomes/records/`

Preview the derived record first when using a live record path:

```powershell
python docs\nwn-skill-pack\tools\aurora_live_review_outcome_record.py from-live-record docs\nwn-skill-pack\knowledge-inbox\aurora-live-records\aurora-live-<DATE>-small-location-first-pass.json --reviewer <MAINTAINER> --outcome accept-for-proposal --reference-promotion-allowed --accepted-standard-checks --next-action "Generate and review the promotion proposal." --dry-run
```

For an accepted bundle:

```powershell
python docs\nwn-skill-pack\tools\aurora_live_review_outcome_record.py from-live-record docs\nwn-skill-pack\knowledge-inbox\aurora-live-records\aurora-live-<DATE>-small-location-first-pass.json --reviewer <MAINTAINER> --outcome accept-for-proposal --reference-promotion-allowed --accepted-standard-checks --next-action "Generate and review the promotion proposal."
```

For a held bundle:

```powershell
python docs\nwn-skill-pack\tools\aurora_live_review_outcome_record.py from-live-record docs\nwn-skill-pack\knowledge-inbox\aurora-live-records\aurora-live-<DATE>-small-location-first-pass.json --reviewer <MAINTAINER> --outcome hold-for-retest --decision-summary "Review held; evidence is incomplete." --blocked-atom "Missing accepted visual redaction review." --next-action "Return a redacted screenshot bundle and rerun visual review."
```

Use `aurora_live_review_outcome_record.py new` only when the live record path is unavailable or the maintainer must override all fields manually.

Validate and refresh the aggregate:

```powershell
python docs\nwn-skill-pack\tools\aurora_live_review_outcome_record.py validate docs\nwn-skill-pack\knowledge-inbox\aurora-live-review-outcomes\records
python docs\nwn-skill-pack\tools\aurora_live_review_outcome_record.py aggregate docs\nwn-skill-pack\knowledge-inbox\aurora-live-review-outcomes\records --out docs\nwn-skill-pack\knowledge-inbox\aurora-live-review-outcomes\aggregate.md
python docs\nwn-skill-pack\tools\check_aurora_live_review_outcome_records.py docs\nwn-skill-pack
```

Use `accept-for-proposal` only when the outcome record names accepted atoms, passed checks, the matching visual redaction record ids, and the proposal path. Use `hold-for-retest` or `reject` when the returned bundle should not generate or support a proposal.

## Schema Expansion Triage

Do not add new JSON atoms, statuses, evidence labels, or required fields during first intake. If the returned record shows that the current core atom model loses important workflow evidence, record a schema-expansion candidate in review notes and apply `knowledge-inbox/aurora-live-record-review-checklist.md` section `Schema Expansion Gate`.

## Outcome

Choose one:

- `accept-for-proposal`: checks pass, redaction passes, at least one atom remains promotion-ready.
- `hold-for-retest`: the Toolset route is useful but evidence, runtime proof, redaction, or artifact links are incomplete.
- `reject`: returned material contains private/raw/model-only evidence or is not reusable for realistic NWN server gamedev.

## Still Not Proven

- This command sheet has not yet reviewed a real returned Aurora Toolset bundle.
- Passing intake commands proves JSON shape and route hygiene, not evidence truth.
- Promotion proposal generation does not prove fresh Codex answer improvement.
- Runtime behavior remains unproven without runtime-tested client/server/log evidence.
