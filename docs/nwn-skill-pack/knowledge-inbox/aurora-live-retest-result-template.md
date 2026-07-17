# Aurora Live Retest Result Template

## Purpose

Record one operator response to `knowledge-inbox/aurora-live-retest-dispatch.md` without turning the returned material into skill knowledge automatically.

This result is maintainer intake material. It is not installed skill content, not docs/RAG source material, not NWN runtime proof by itself, not privacy proof by itself, not release readiness, and not an automatic skill update.

## Retest Metadata

- Retest ID:
- Date UTC:
- Package version:
- Version manifest path: `version-manifest.json`
- Source dispatch path: `knowledge-inbox/aurora-live-retest-dispatch.md`
- Dispatch manifest path:
- Source review outcome ID:
- Source review outcome path:
- Source live record ID:
- Source live record path:
- Source evidence manifest path:
- Target atom:
- Requested next action:
- Operator:
- Toolset version:
- NWN:EE version:
- Module copy id or disposable module path:
- HAK/TLK list if relevant:
- Retest result: `pass`, `partial`, `fail`, or `blocked`

## Returned Artifacts

Record exact returned paths or archive names:

- completed retest result template:
- updated or new live record:
- updated or new evidence manifest:
- redacted screenshot folder or files:
- redacted client log excerpt:
- redacted server log excerpt:
- build or compile transcript:
- saved module notes:
- command transcript:
- exact blocker text:
- privacy confirmation:

If an artifact cannot be returned, keep the row and explain why. Do not silently drop missing screenshot, log, manifest, or blocker evidence.

## Operator Statement

Write short, factual statements only:

- What was retested:
- What was observed in Aurora Toolset:
- What was compiled or built:
- What was runtime-tested in client/server:
- What failed or stayed blocked:
- What is still not proven:

Do not claim runtime behavior without client log, server log, or runtime-tested evidence. Toolset UI evidence is not runtime proof.

## Maintainer Verification

First check the dispatch and this template:

```powershell
python docs\nwn-skill-pack\tools\check_aurora_live_retest_dispatch.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_aurora_live_retest_dispatch_roundtrip.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_aurora_live_retest_result_template.py docs\nwn-skill-pack
```

Then validate returned live evidence:

```powershell
python docs\nwn-skill-pack\tools\aurora_toolset_live_record.py validate docs\nwn-skill-pack\knowledge-inbox\aurora-live-records\aurora-live-YYYYMMDD-small-location-first-pass.json
python docs\nwn-skill-pack\tools\check_aurora_live_records.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_aurora_live_evidence_manifest.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_aurora_live_intake_consistency.py docs\nwn-skill-pack
```

Record the returned retest result as a machine-checkable maintainer intake record:

```powershell
python docs\nwn-skill-pack\tools\aurora_live_retest_result_record.py new `
  --source-review-outcome-id <alro-id> `
  --source-review-outcome-path docs\nwn-skill-pack\knowledge-inbox\aurora-live-review-outcomes\records\<alro-id>.json `
  --live-record-id <aurora-live-id> `
  --live-record-path docs\nwn-skill-pack\knowledge-inbox\aurora-live-records\<aurora-live-id>.json `
  --evidence-manifest-path docs\nwn-skill-pack\knowledge-inbox\aurora-live-evidence-manifests\<manifest-id>.json `
  --target-atom toolset.buildAndClientRun `
  --requested-next-action "Repeat the smallest missing atom from the retest dispatch." `
  --operator <handle> `
  --toolset-version <version> `
  --nwn-ee-version <version> `
  --environment-summary "redacted environment summary" `
  --result blocked `
  --blocked-atom toolset.buildAndClientRun `
  --decision-summary "Operator could not complete the retest." `
  --next-action "Return exact blocker to maintainer."
python docs\nwn-skill-pack\tools\aurora_live_retest_result_record.py validate docs\nwn-skill-pack\knowledge-inbox\aurora-live-retest-results\records
python docs\nwn-skill-pack\tools\aurora_live_retest_result_record.py aggregate docs\nwn-skill-pack\knowledge-inbox\aurora-live-retest-results\records --out docs\nwn-skill-pack\knowledge-inbox\aurora-live-retest-results\aggregate.md
python docs\nwn-skill-pack\tools\check_aurora_live_retest_result_records.py docs\nwn-skill-pack
```

Run privacy and redaction review before any promotion:

```powershell
python docs\nwn-skill-pack\tools\check_aurora_live_redaction_policy.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_aurora_live_visual_redaction_checklist.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\aurora_live_visual_redaction_record.py aggregate docs\nwn-skill-pack\knowledge-inbox\aurora-live-visual-redaction-records\records --out docs\nwn-skill-pack\knowledge-inbox\aurora-live-visual-redaction-records\aggregate.md
python docs\nwn-skill-pack\tools\check_aurora_live_visual_redaction_records.py docs\nwn-skill-pack
```

Record the maintainer decision after review:

```powershell
python docs\nwn-skill-pack\tools\aurora_live_review_outcome_record.py from-live-record docs\nwn-skill-pack\knowledge-inbox\aurora-live-records\aurora-live-YYYYMMDD-small-location-first-pass.json --reviewer <name> --outcome accept-for-proposal --reference-promotion-allowed --accepted-standard-checks --dry-run
python docs\nwn-skill-pack\tools\aurora_live_review_outcome_record.py from-live-record docs\nwn-skill-pack\knowledge-inbox\aurora-live-records\aurora-live-YYYYMMDD-small-location-first-pass.json --reviewer <name> --outcome hold-for-retest --decision-summary "Hold; retest evidence is still incomplete." --blocked-atom "<atom and reason>" --next-action "<specific next retest>"
python docs\nwn-skill-pack\tools\aurora_live_review_outcome_record.py validate docs\nwn-skill-pack\knowledge-inbox\aurora-live-review-outcomes\records --root docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\aurora_live_review_outcome_record.py aggregate docs\nwn-skill-pack\knowledge-inbox\aurora-live-review-outcomes\records --out docs\nwn-skill-pack\knowledge-inbox\aurora-live-review-outcomes\aggregate.md --root docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_aurora_live_review_outcome_records.py docs\nwn-skill-pack
```

Refresh derived maintainer views:

```powershell
python docs\nwn-skill-pack\tools\generate_aurora_live_review_queue.py docs\nwn-skill-pack --out docs\nwn-skill-pack\knowledge-inbox\aurora-live-review-queue.md
python docs\nwn-skill-pack\tools\generate_aurora_live_retest_dispatch.py docs\nwn-skill-pack --out docs\nwn-skill-pack\knowledge-inbox\aurora-live-retest-dispatch.md
python docs\nwn-skill-pack\tools\generate_aurora_live_status.py docs\nwn-skill-pack --out docs\nwn-skill-pack\knowledge-inbox\aurora-live-status.md
python docs\nwn-skill-pack\tools\generate_release_evidence_index.py docs\nwn-skill-pack --out docs\nwn-skill-pack\release-evidence-index.md
python docs\nwn-skill-pack\tools\check_release_evidence_index.py docs\nwn-skill-pack
```

## Result Decision

Choose exactly one:

- `pass`: target atom has specific observation, matching artifact paths, correct evidence label, privacy scrub, and maintainer can decide whether to create or update a review outcome.
- `partial`: evidence is useful but missing a screenshot, client/server log, manifest link, redaction review, or exact enough observation.
- `fail`: returned material cannot validate, contradicts the requested atom, or includes private data.
- `blocked`: operator could not perform the retest and returned exact blocker text.

Decision:

Rationale:

## Privacy And Quarantine

The maintainer must confirm the returned material does not include:

- raw decompilation text,
- private module files,
- private player data,
- account names,
- IP addresses,
- tokens,
- credentials,
- unredacted private server logs.

If privacy cannot be confirmed, quarantine the bundle and do not generate a promotion proposal.

## Verified Boundary

Verified by this template plus maintainer commands:

- whether the operator responded to a specific retest dispatch,
- whether the response references the source review outcome and target atom,
- whether returned paths are concrete enough for local validation,
- whether the maintainer captured pass, partial, fail, or blocked.

Still not verified by this result:

- truth of screenshots or logs,
- completeness of privacy redaction,
- NWN runtime behavior unless runtime evidence is returned and reviewed,
- skill answer quality,
- plugin installation,
- release-candidate readiness,
- automatic skill improvement.
