# Aurora Live Return Packet

## Purpose

Tell an Aurora Toolset operator exactly what to return after a live session so the maintainer can validate evidence without guessing.

This packet is maintainer handoff material. It is not installed skill content, not docs/RAG source material, not a release-candidate proof, and not an automatic skill update.

## Return Set

Return these paths or a redacted archive containing them:

- filled live record: `knowledge-inbox/aurora-live-records/aurora-live-YYYYMMDD-small-location-first-pass.json`
- filled evidence manifest: `knowledge-inbox/aurora-live-evidence-manifests/aurora-live-evidence-manifest-YYYYMMDD-small-location-first-pass.json`
- redacted screenshot folder from `.codex-tmp/aurora-live-evidence/aurora-live-YYYYMMDD-small-location-first-pass/screenshots`
- redacted log folder from `.codex-tmp/aurora-live-evidence/aurora-live-YYYYMMDD-small-location-first-pass/logs`
- saved module notes, not private module source files, when the notes are needed to explain the observation
- exact blockers when the session stopped early

If `tools/prepare_aurora_live_session.py` was used, keep the generated ids and paths. Do not rename the record or manifest after capture unless the manifest `live_record_id` and `live_record_path` are updated too.

## Required Operator Notes

Include a short note with:

- operator name or handle
- Toolset version
- NWN:EE version
- module copy id or disposable module path
- HAK/TLK list if relevant
- whether the module saved and reopened
- whether any script or build path was compiled
- whether any client/server runtime test was run
- what is still not proven

## Record Rules

Before returning the record:

- replace `not-run` atom rows with `observed`, `blocked`, or `rejected` only when that is true
- leave untested atoms as `not-run`
- keep `promotion_ready=false` unless the atom has a positive status, a non-overstated evidence label, specific observations, at least one artifact, and a candidate reference
- use `promotion.candidate_references` for target reference files
- do not use `screen-backed` or `symbol-only` as final evidence labels

Use evidence labels exactly:

- `local-reverse-lead`
- `toolset-observed`
- `static-checked`
- `compiled`
- `runtime-tested`
- `rejected`

Toolset UI evidence is not runtime proof.

## Manifest Rules

Before returning the evidence manifest:

- replace the placeholder artifact row
- add one row per screenshot, log, saved module note, or external evidence bundle
- keep `artifact_id` stable and human-readable
- link every artifact row to an atom where possible
- set `redaction_reviewed=true` only after privacy review
- set artifact `redaction_status` to `redacted` only after the artifact is scrubbed
- include `sha256` when available
- when returning a redacted copy or external evidence bundle instead of the original artifact, keep the original manifest row hash and later record `source_artifact_ref`, matching `source_artifact_sha256`, and `reviewed_artifact_sha256` in the visual redaction review record
- for external evidence bundles, include enough immutable-storage, access, and SHA-256 hash-check notes to become `external_provenance_note`, then record `external_storage_provider` and ISO-8601 `external_access_checked_at`

If a referenced artifact cannot be returned, keep the row and explain the missing path or external storage note in `notes`.

## Privacy Gate

Do not return:

- raw decompilation text
- private module files
- private player data
- account names
- IP addresses
- tokens
- credentials
- unredacted private server logs

If privacy is uncertain, return a blocker and keep the artifact out of the bundle.

## Maintainer Intake Commands

Validate the returned record:

```powershell
python docs\nwn-skill-pack\tools\aurora_toolset_live_record.py validate docs\nwn-skill-pack\knowledge-inbox\aurora-live-records\aurora-live-YYYYMMDD-small-location-first-pass.json
```

Check all submitted records:

```powershell
python docs\nwn-skill-pack\tools\check_aurora_live_records.py docs\nwn-skill-pack
```

Check privacy and manifest state:

```powershell
python docs\nwn-skill-pack\tools\check_aurora_live_redaction_policy.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_aurora_live_visual_redaction_checklist.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\aurora_live_visual_redaction_record.py aggregate docs\nwn-skill-pack\knowledge-inbox\aurora-live-visual-redaction-records\records --out docs\nwn-skill-pack\knowledge-inbox\aurora-live-visual-redaction-records\aggregate.md
python docs\nwn-skill-pack\tools\check_aurora_live_visual_redaction_records.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_aurora_live_evidence_manifest.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_aurora_live_intake_consistency.py docs\nwn-skill-pack
```

Smoke-test the return path on synthetic temporary data:

```powershell
python docs\nwn-skill-pack\tools\check_aurora_live_return_roundtrip.py docs\nwn-skill-pack
```

Refresh the queue and status:

```powershell
python docs\nwn-skill-pack\tools\generate_aurora_live_review_queue.py docs\nwn-skill-pack --out docs\nwn-skill-pack\knowledge-inbox\aurora-live-review-queue.md
python docs\nwn-skill-pack\tools\check_aurora_live_review_queue.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_aurora_live_status.py docs\nwn-skill-pack
```

Review with `knowledge-inbox/aurora-live-record-review-checklist.md` before proposal:

```powershell
python docs\nwn-skill-pack\tools\check_aurora_live_record_review_checklist.py docs\nwn-skill-pack
```

Record the maintainer review outcome before any proposal is treated as release evidence. Preview first:

```powershell
python docs\nwn-skill-pack\tools\aurora_live_review_outcome_record.py from-live-record docs\nwn-skill-pack\knowledge-inbox\aurora-live-records\aurora-live-YYYYMMDD-small-location-first-pass.json --reviewer <name> --outcome accept-for-proposal --reference-promotion-allowed --accepted-standard-checks --dry-run
```

Write the outcome only after the maintainer decision is real:

```powershell
python docs\nwn-skill-pack\tools\aurora_live_review_outcome_record.py from-live-record docs\nwn-skill-pack\knowledge-inbox\aurora-live-records\aurora-live-YYYYMMDD-small-location-first-pass.json --reviewer <name> --outcome hold-for-retest --decision-summary "Hold; returned evidence is incomplete." --blocked-atom "<smallest blocked atom and reason>" --next-action "<specific retest request>"
python docs\nwn-skill-pack\tools\aurora_live_review_outcome_record.py from-live-record docs\nwn-skill-pack\knowledge-inbox\aurora-live-records\aurora-live-YYYYMMDD-small-location-first-pass.json --reviewer <name> --outcome reject --decision-summary "Reject; returned evidence cannot be used." --rejected-atom "<atom and reason>"
python docs\nwn-skill-pack\tools\aurora_live_review_outcome_record.py validate docs\nwn-skill-pack\knowledge-inbox\aurora-live-review-outcomes\records --root docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\aurora_live_review_outcome_record.py aggregate docs\nwn-skill-pack\knowledge-inbox\aurora-live-review-outcomes\records --out docs\nwn-skill-pack\knowledge-inbox\aurora-live-review-outcomes\aggregate.md --root docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_aurora_live_review_outcome_records.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\generate_release_evidence_index.py docs\nwn-skill-pack --out docs\nwn-skill-pack\release-evidence-index.md
python docs\nwn-skill-pack\tools\check_release_evidence_index.py docs\nwn-skill-pack
```

Use `aurora_live_review_outcome_record.py new` only when the live record path is unavailable and the maintainer manually supplies every field. Do not copy sample or self-test records into `knowledge-inbox/aurora-live-review-outcomes/records`; synthetic fixtures stay under `.codex-tmp`.

Generate a proposal only after the review says at least one atom remains promotion-ready and a matching `pass` visual redaction review record covers every promotion-ready artifact:

```powershell
python docs\nwn-skill-pack\tools\generate_aurora_toolset_promotion_proposal.py docs\nwn-skill-pack docs\nwn-skill-pack\knowledge-inbox\aurora-live-records\aurora-live-YYYYMMDD-small-location-first-pass.json --out docs\nwn-skill-pack\knowledge-inbox\reference-promotion-proposals\aurora-live-YYYYMMDD-small-location-first-pass.md --maintainer <name>
```

## Accept, Hold, Reject

Accept for proposal only when:

- validation passes
- redaction is reviewed
- visual redaction checklist has been applied to screenshots/logs
- a visual redaction review record is present or intentionally held for every promotion-ready returned bundle
- redacted-copy or external-bundle visual review rows include `source_artifact_ref`, `source_artifact_sha256`, and `reviewed_artifact_sha256`, `source_artifact_sha256` matches the evidence manifest `sha256`, and `redaction_status=redacted` rows have a `reviewed_artifact_sha256` that differs from `source_artifact_sha256`
- external visual review rows include `external_provenance_note`, `external_storage_provider`, and ISO-8601 `external_access_checked_at`
- evidence manifest rows match the record artifacts
- evidence labels match the actual proof
- `promotion_ready=true` rows improve realistic NWN server-building work

Hold when:

- artifact paths are missing
- privacy is unclear
- evidence labels overstate proof
- runtime claims have no runtime-tested evidence
- the Toolset route is useful but needs another pass

Reject when:

- the returned material contains raw decompilation or private data
- the claim depends only on model output
- the atom is not reusable for NWN server gamedev
- the record attempts to self-update the skill without maintainer review

## Still Hypothesis

- This return packet has not yet been used with a real returned Aurora Toolset bundle.
- The synthetic return roundtrip checker proves only route mechanics on temporary data, not Aurora Toolset behavior or evidence truth.
- The intake consistency checker verifies JSON links between records and manifests, not visual screenshot/log redaction quality.
- The visual redaction checklist is a human gate and has not yet processed a real returned bundle.
- The visual redaction record aggregate proves only that a maintainer recorded the human gate result, not that images were machine-inspected.
- The first live return may reveal missing fields in the record or manifest.
- This packet proves return-shape hygiene only; it does not prove NWN runtime behavior, fresh Codex answer quality, plugin installation, or release-candidate readiness.
- The proposal generator blocks promotion-ready Aurora proposals when the matching `pass` visual redaction review record is missing or does not cover the artifacts.
