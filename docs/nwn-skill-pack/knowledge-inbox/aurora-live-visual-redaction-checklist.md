# Aurora Live Visual Redaction Checklist

## Purpose

Require a human visual review of Aurora Toolset screenshots, logs, saved module notes, and external evidence bundles before any returned atom can stay `promotion_ready=true`.

This checklist is maintainer handoff material. It is not installed skill content, not docs/RAG source material, not proof by itself, and it does not inspect images automatically.

## Inputs

- `knowledge-inbox/aurora-live-records/*.json`
- `knowledge-inbox/aurora-live-evidence-manifests/*.json`
- `knowledge-inbox/aurora-live-redaction-policy.md`
- `knowledge-inbox/aurora-live-record-review-checklist.md`
- `knowledge-inbox/aurora-live-return-packet.md`
- `knowledge-inbox/schema/aurora-live-visual-redaction-record.schema.json`
- `knowledge-inbox/aurora-live-visual-redaction-records/aggregate.md`
- screenshots under `.codex-tmp/aurora-live-evidence/.../screenshots`
- logs under `.codex-tmp/aurora-live-evidence/.../logs`
- saved module notes or external evidence bundles named by the evidence manifest

## Visual Review Steps

1. Open every screenshot, log, saved module note, and external evidence bundle named by the evidence manifest.
2. Confirm that no account names, player names, private module names, IP addresses, hostnames, tokens, credentials, absolute user paths, raw decompilation, raw symbol dumps, private server logs, character data, or database rows are visible.
3. Confirm that redaction is visible and irreversible enough for handoff. Cropping, blur, or replacement text is acceptable only when the private content is no longer readable.
4. Confirm that every artifact marked `redaction_status=redacted` or `redaction_status=not-private` has actually been reviewed.
5. When the reviewed artifact is a redacted copy or external handoff bundle, set `path_or_external_ref` to that reviewed safe artifact and set `source_artifact_ref` to the original live-record artifact path or external reference it covers.
6. For redacted-copy or external-bundle coverage, record `source_artifact_sha256` from the original manifest artifact and `reviewed_artifact_sha256` from the reviewed safe artifact before proposal generation; `source_artifact_sha256` must match the source row `sha256` in the evidence manifest. If `redaction_status=redacted`, `reviewed_artifact_sha256` must differ from `source_artifact_sha256`; use `redaction_status=not-private` for unchanged reviewed artifacts.
7. For an external reviewed artifact, record `external_provenance_note` with explicit immutable-storage, access, and SHA-256 hash-check notes plus `external_storage_provider` and ISO-8601 `external_access_checked_at`.
8. Keep `redaction_reviewed=false` while any artifact is pending, unreadable, externally missing, or only described by metadata.
9. Set `promotion_ready=false` on any atom whose artifact cannot be visually reviewed.
10. Record reviewer, date, artifact list, result, and non-proof boundaries with `tools/aurora_live_visual_redaction_record.py`.
11. Regenerate `knowledge-inbox/aurora-live-visual-redaction-records/aggregate.md` before a maintainer accepts a reference patch.

## Promotion Blockers

Block proposal generation when:

- any promotion-ready artifact has `redaction_status=pending-redaction`,
- any promotion-ready artifact is missing a hash or clear external storage note,
- any screenshot/log contains private data,
- any artifact depends on raw reverse-engineering dumps,
- any runtime claim lacks `runtime-tested` evidence,
- any reviewer cannot open the referenced file.

## Required Commands

Run these before proposal generation:

```powershell
python docs\nwn-skill-pack\tools\check_aurora_live_redaction_policy.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_aurora_live_evidence_manifest.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_aurora_live_intake_consistency.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_aurora_live_visual_redaction_checklist.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\aurora_live_visual_redaction_record.py aggregate docs\nwn-skill-pack\knowledge-inbox\aurora-live-visual-redaction-records\records --out docs\nwn-skill-pack\knowledge-inbox\aurora-live-visual-redaction-records\aggregate.md
python docs\nwn-skill-pack\tools\check_aurora_live_visual_redaction_records.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_aurora_live_record_review_checklist.py docs\nwn-skill-pack
```

## Still Hypothesis

- This checklist has not yet reviewed a real returned Aurora evidence bundle.
- The checker verifies checklist routing only; it does not OCR screenshots, inspect images automatically, inspect external logs, or prove redaction quality.
- Visual redaction records capture a human review decision, but they still do not prove artifact authenticity, Aurora Toolset behavior, or NWN runtime behavior.
- The first real bundle may reveal additional private-data patterns or artifact types.
