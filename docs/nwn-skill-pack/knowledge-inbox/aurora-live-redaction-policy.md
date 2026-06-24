# Aurora Live Evidence Redaction Policy

## Purpose

Prevent Aurora Toolset live records, screenshots, logs, and promotion proposals from leaking private data, raw decompilation, or local reverse-engineering material into the `nwn-server-gamedev` skill package.

This policy is maintainer handoff material. It is not installed skill content, not docs/RAG source material, and not proof by itself.

## Applies To

- `knowledge-inbox/aurora-live-records/*.json`
- `knowledge-inbox/aurora-live-evidence-manifests/*.json`
- `knowledge-inbox/templates/aurora-live-evidence-manifest-template.json`
- `knowledge-inbox/aurora-live-visual-redaction-checklist.md`
- `knowledge-inbox/aurora-live-visual-redaction-records/aggregate.md`
- `knowledge-inbox/aurora-live-review-queue.md`
- `knowledge-inbox/aurora-live-record-review-checklist.md`
- `knowledge-inbox/reference-promotion-proposals/aurora-*.md`
- screenshots, build logs, client/server logs, saved module notes, and external evidence bundles referenced by Aurora live records

## Must Redact

Remove or replace before review:

- credentials, passwords, bearer tokens, API keys, session ids, cookies, and license keys,
- IP addresses, hostnames, account names, player names, Discord/forum handles, and private email addresses,
- private module file names unless the user explicitly approved sharing the name,
- absolute user paths such as `C:\Users\<name>\...`, `/home/<name>/...`, or private cloud-sync folders,
- private server logs unless reduced to a short relevant excerpt,
- raw decompilation text, raw symbol dumps, and raw export-file rows,
- private player data, character names, CD keys, public keys, account ids, or database rows.

Use stable placeholders such as `<redacted-ip>`, `<redacted-user>`, `<module-copy-id>`, `<redacted-token>`, or `<private-log-excerpt-redacted>`.

## Allowed Summary Shape

Allowed in a live record:

- relative paths under `docs/nwn-skill-pack/.codex-tmp/aurora-live-evidence/...`,
- short artifact descriptions such as `screenshots/area-wizard-step-01.png`,
- a disposable module copy id instead of the original module name,
- concise Toolset observations written by the operator,
- exact non-private error messages when needed to reproduce a blocker,
- evidence labels: `local-reverse-lead`, `toolset-observed`, `static-checked`, `compiled`, `runtime-tested`, `rejected`.

Avoid copying source material. Summarize the observed behavior and point to redacted artifacts.

## Checker Boundary

Run:

```powershell
python docs\nwn-skill-pack\tools\check_aurora_live_redaction_policy.py docs\nwn-skill-pack
```

The checker verifies this policy and scans submitted Aurora live records for obvious private-data and raw-reverse markers. It passes when no records exist, but it does not prove that images or external logs are visually redacted. Maintainers must still inspect referenced screenshots/logs before proposal generation.

Run the artifact-manifest checker as the companion text gate:

```powershell
python docs\nwn-skill-pack\tools\check_aurora_live_evidence_manifest.py docs\nwn-skill-pack
```

That checker validates manifest rows for atom, evidence label, artifact kind, and redaction status. It still does not prove that referenced images or logs are visually redacted.

Run the visual-redaction checklist checker as the human review gate:

```powershell
python docs\nwn-skill-pack\tools\check_aurora_live_visual_redaction_checklist.py docs\nwn-skill-pack
```

That checker verifies checklist routing only. It does not OCR screenshots or inspect images automatically.

Record the human visual-review decision before promotion proposal work:

```powershell
python docs\nwn-skill-pack\tools\aurora_live_visual_redaction_record.py aggregate docs\nwn-skill-pack\knowledge-inbox\aurora-live-visual-redaction-records\records --out docs\nwn-skill-pack\knowledge-inbox\aurora-live-visual-redaction-records\aggregate.md
python docs\nwn-skill-pack\tools\check_aurora_live_visual_redaction_records.py docs\nwn-skill-pack
```

These records document reviewer, result, artifact list, and non-proof boundaries. They do not prove the reviewer made a correct privacy decision.

## Promotion Boundary

Before generating an Aurora promotion proposal:

1. Validate the live record.
2. Run `tools/check_aurora_live_redaction_policy.py`.
3. Run `tools/check_aurora_live_visual_redaction_checklist.py` and visually inspect screenshots/logs.
4. Record and check the human visual redaction review result.
5. Run `tools/check_aurora_live_evidence_manifest.py` when an evidence bundle or manifest exists.
6. Run `tools/check_aurora_live_intake_consistency.py` when records and manifests exist.
7. Regenerate `knowledge-inbox/aurora-live-review-queue.md`.
8. Review rows with `knowledge-inbox/aurora-live-record-review-checklist.md`.
9. Generate a proposal only from reviewed `promotion_ready=true` atoms.

Reject or hold a proposal when private data, raw decompilation, or unredacted artifacts are present.

## Still Hypothesis

- The first real returned Aurora live record may reveal additional private-data patterns that should be added to the checker.
- The checker can catch obvious text leaks, but it cannot OCR screenshots or inspect every external artifact.
- The visual redaction record captures the decision path, but it cannot prove redaction quality without real human inspection.
