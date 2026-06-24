# Contribution Bundle Format

## Purpose

Give external NWN builders a small sendable package for feedback records without implying that an installed skill can modify itself.

A contribution bundle is intake material only. It does not update the official skill, does not prove that a claim is globally reusable, and does not replace maintainer review, promotion, SemVer, or a new release.

## Builder Command

Create or collect validated feedback records first:

```powershell
python docs\nwn-skill-pack\tools\nwn_skill_feedback.py validate docs\nwn-skill-pack\knowledge-inbox\incoming
```

Then build a bundle:

```powershell
python docs\nwn-skill-pack\tools\nwn_skill_feedback.py bundle `
  docs\nwn-skill-pack\knowledge-inbox\incoming `
  --out docs\nwn-skill-pack\.codex-tmp\contribution-bundle `
  --force
```

Use `--fail-on-risky` when the contributor wants the simple privacy scan to block records that contain obvious private-data terms.

## Bundle Shape

```text
contribution-bundle/
  manifest.json
  SUMMARY.md
  feedback-records/
    <record-id>.json
```

`manifest.json` fields:

- `schema_version`: currently `1`.
- `bundle_id`: contributor-selected or generated bundle identifier.
- `created_at`: UTC timestamp.
- `record_count`: number of copied feedback records.
- `contains_official_skill_update`: always `false`.
- `review_required_before_promotion`: always `true`.
- `privacy_scan_terms`: the simple scanner vocabulary.
- `records`: copied record metadata, bundle path, source path, status, source type, domain, SHA-256, and privacy scan hits.

`SUMMARY.md` is a human-readable index for maintainers. It is not evidence by itself.

## Privacy Rule

Before sharing the bundle, remove:

- credentials,
- tokens,
- IP addresses,
- account names,
- private player data,
- private module names or files unless sharing is approved,
- private server logs unless redacted.

The privacy scan is intentionally simple. A clean scan does not prove that the bundle is safe to publish.

## Maintainer Intake

1. Inspect `SUMMARY.md` and `manifest.json`.
2. Verify the received bundle manifest, record hashes, record fields, and current privacy scan:

```powershell
python docs\nwn-skill-pack\tools\nwn_skill_feedback.py verify-bundle `
  docs\nwn-skill-pack\.codex-tmp\contribution-bundle
```

3. Use the roundtrip checker when changing the bundle CLI or release tooling:

```powershell
python docs\nwn-skill-pack\tools\check_contribution_bundle_roundtrip.py docs\nwn-skill-pack
```

4. Validate copied records with `nwn_skill_feedback.py validate`.
5. Review records with `nwn_skill_feedback.py review`.
6. Regenerate `knowledge-inbox/promotion-backlog.md`.
7. Promote only reusable lessons with evidence labels.
8. Run `human-feedback-release-workflow.md` before any new version.

## Verified Boundary

Verified locally:

- `nwn_skill_feedback.py bundle` validates records before copying them.
- `nwn_skill_feedback.py verify-bundle` checks bundle manifest flags, safe relative paths, SHA-256 hashes, feedback-record validation, and current privacy scan terms.
- `check_contribution_bundle_roundtrip.py` creates a temporary fixture record, builds a bundle, verifies it, tampers with the copied record, and confirms `verify-bundle` rejects the SHA-256 mismatch.
- The bundle manifest includes SHA-256 hashes for copied records.
- The bundle keeps records outside the installed skill and plugin install boundary.

Still hypothesis until tested with external contributors:

- The bundle format is understandable without maintainer coaching.
- The simple privacy scanner catches enough obvious private-data mistakes.
- Maintainers will prefer bundle intake over GitHub issues or forms for multi-record submissions.
- `verify-bundle` catches enough accidental bundle corruption to be useful for real contributor handoff.

Use `knowledge-inbox/external-contributor-trial-packet.md` and `knowledge-inbox/external-contributor-trial-result-template.md` to convert these usability hypotheses into an explicit no-coaching trial result before relying on bundles for broad community contribution.
