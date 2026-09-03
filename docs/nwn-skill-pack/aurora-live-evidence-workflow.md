# Aurora Live Evidence To Skill Workflow

## Purpose

Define how local Aurora Toolset observations become reviewed, versioned guidance in `nwn-server-gamedev`.

This workflow is for maintainers and live operators. It is not installed skill content, not automatic learning, and not proof by itself.

## Source Boundary

Accepted inputs:

- local reverse lead index: `local-aurora-symbol-index.md`,
- gap analysis: `local-aurora-skill-reference-gap-analysis.md`,
- live checklist: `local-aurora-small-location-live-operator-checklist.md`,
- operator execution packet: `aurora-live-operator-execution-packet.md`,
- live return packet: `knowledge-inbox/aurora-live-return-packet.md`,
- live review queue: `knowledge-inbox/aurora-live-review-queue.md`,
- redaction policy: `knowledge-inbox/aurora-live-redaction-policy.md`,
- visual redaction checklist: `knowledge-inbox/aurora-live-visual-redaction-checklist.md`,
- visual redaction review records and aggregate: `knowledge-inbox/aurora-live-visual-redaction-records/`,
- evidence manifest template and returned manifests: `knowledge-inbox/templates/aurora-live-evidence-manifest-template.json` and `knowledge-inbox/aurora-live-evidence-manifests/*.json`,
- live-record review checklist: `knowledge-inbox/aurora-live-record-review-checklist.md`,
- filled live record matching `knowledge-inbox/schema/aurora-toolset-live-record.schema.json`,
- screenshots, logs, saved module notes, and redacted runtime/client evidence.

Reject or hold:

- raw decompilation copied into skill references,
- private module files or player data,
- unredacted server logs,
- Toolset screenshot used as runtime proof,
- `local-reverse-lead` promoted as if it were `runtime-tested`,
- atom guidance without observations and artifacts.

## Maintainer Path

1. Review `local-aurora-symbol-index.md` and `local-aurora-skill-reference-gap-analysis.md` only as `local-reverse-lead`.
2. Use `aurora-live-operator-execution-packet.md` and `tools/prepare_aurora_live_session.py` to prepare the disposable module, capture folders, dated record path, and evidence manifest path; use `tools/init_aurora_live_record.py` and `tools/init_aurora_live_evidence_manifest.py` only as lower-level fallbacks.
3. Run `local-aurora-small-location-live-operator-checklist.md` on that disposable module.
3a. For iterative local Aurora Web UI debugging, use `$playwright-interactive`
    when its persistent-browser prerequisites are available. Reuse one session
    across renderer changes, but retain the guarded capture and manifest steps
    below: interactive inspection is not accepted runtime proof by itself.
4. Copy `knowledge-inbox/templates/aurora-toolset-live-record-template.json` to a dated record path.
5. Fill every atom row with status, evidence label, observations, artifacts, blockers, and `promotion_ready`.
6. Fill the initialized evidence manifest for returned screenshots, logs, saved module notes, and external evidence bundles.
7. Package the returned record, evidence manifest, screenshots, logs, saved module notes, and blockers using `knowledge-inbox/aurora-live-return-packet.md`.
8. Validate the filled record:
   `python docs\nwn-skill-pack\tools\aurora_toolset_live_record.py validate path\to\aurora-live-record.json`
9. Check the submitted live-record directory:
   `python docs\nwn-skill-pack\tools\check_aurora_live_records.py docs\nwn-skill-pack`
10. Check redaction policy before review:
   `python docs\nwn-skill-pack\tools\check_aurora_live_redaction_policy.py docs\nwn-skill-pack`
11. Check the visual redaction checklist before review, then manually inspect screenshots/logs:
   `python docs\nwn-skill-pack\tools\check_aurora_live_visual_redaction_checklist.py docs\nwn-skill-pack`
12. Record the human visual redaction result and refresh the aggregate:
   `python docs\nwn-skill-pack\tools\aurora_live_visual_redaction_record.py aggregate docs\nwn-skill-pack\knowledge-inbox\aurora-live-visual-redaction-records\records --out docs\nwn-skill-pack\knowledge-inbox\aurora-live-visual-redaction-records\aggregate.md`
   For redacted-copy or external-bundle rows, include `source_artifact_ref`, `source_artifact_sha256`, and `reviewed_artifact_sha256`; `source_artifact_sha256` must match the source row `sha256` in the evidence manifest. If `redaction_status=redacted`, `reviewed_artifact_sha256` must differ from `source_artifact_sha256`; use `redaction_status=not-private` for unchanged reviewed artifacts. For external reviewed artifacts, include `external_provenance_note` with explicit immutable-storage, access, and SHA-256 hash-check notes plus `external_storage_provider` and ISO-8601 `external_access_checked_at`.
13. Check visual redaction review records:
   `python docs\nwn-skill-pack\tools\check_aurora_live_visual_redaction_records.py docs\nwn-skill-pack`
14. Check the evidence manifest before review:
   `python docs\nwn-skill-pack\tools\check_aurora_live_evidence_manifest.py docs\nwn-skill-pack`
15. Check live-record and evidence-manifest consistency:
   `python docs\nwn-skill-pack\tools\check_aurora_live_intake_consistency.py docs\nwn-skill-pack`
16. Check the return packet route:
   `python docs\nwn-skill-pack\tools\check_aurora_live_return_packet.py docs\nwn-skill-pack`
17. Smoke-test the return path on synthetic temporary data when return tooling changes:
   `python docs\nwn-skill-pack\tools\check_aurora_live_return_roundtrip.py docs\nwn-skill-pack`
18. Generate and check the review queue:
   `python docs\nwn-skill-pack\tools\generate_aurora_live_review_queue.py docs\nwn-skill-pack --out docs\nwn-skill-pack\knowledge-inbox\aurora-live-review-queue.md`
19. Review the returned record with `knowledge-inbox/aurora-live-record-review-checklist.md`; downgrade or hold any `promotion_ready=true` atom whose label, artifacts, privacy, or candidate reference routing is overstated.
20. Aggregate filled records:
   `python docs\nwn-skill-pack\tools\aurora_toolset_live_record.py aggregate path\to\records --out docs\nwn-skill-pack\knowledge-inbox\aurora-live-aggregate.md`
21. Generate a proposal only if at least one reviewed atom is still `promotion_ready=true` and a matching `pass` visual redaction review record covers every promotion-ready artifact, including source and reviewed hashes for redacted-copy or external-bundle coverage:
   `python docs\nwn-skill-pack\tools\generate_aurora_toolset_promotion_proposal.py docs\nwn-skill-pack path\to\aurora-live-record.json --out docs\nwn-skill-pack\knowledge-inbox\reference-promotion-proposals\aurora-live-record.md --maintainer <name>`
22. Review the proposal before editing references.
23. Patch both authoring and plugin-packaged reference copies, or stop.
24. Record the promotion result with `tools/reference_promotion_record.py`.
25. Regenerate promotion aggregate, version bump plan, release readiness, package inventory, and handoff artifacts before claiming a stronger version.

## Evidence Labels

Use:

- `local-reverse-lead`: symbol/screen/gap analysis only.
- `toolset-observed`: Toolset UI or saved module behavior observed, but not run in client/server.
- `static-checked`: file/module/config/state inspected without runtime proof.
- `compiled`: relevant compile/build path succeeded.
- `runtime-tested`: client/server/log/module behavior proves the atom.
- `rejected`: the atom should not be promoted.

Do not collapse these labels. A good skill can say "this is Toolset-observed" without pretending it is runtime-tested.

## Required Checks

Run after changing the Aurora live evidence workflow or its tools:

```powershell
python docs\nwn-skill-pack\tools\aurora_toolset_live_record.py validate docs\nwn-skill-pack\knowledge-inbox\templates\aurora-toolset-live-record-template.json
python docs\nwn-skill-pack\tools\aurora_toolset_live_record.py aggregate docs\nwn-skill-pack\knowledge-inbox\templates\aurora-toolset-live-record-template.json
python docs\nwn-skill-pack\tools\check_prepare_aurora_live_session.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_aurora_live_return_packet.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_aurora_live_return_roundtrip.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_init_aurora_live_evidence_manifest.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_aurora_live_visual_redaction_checklist.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_aurora_live_visual_redaction_records.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_aurora_live_evidence_manifest.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_aurora_live_intake_consistency.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_aurora_live_records.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_record_contracts.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_aurora_toolset_promotion_proposal_tool.py docs\nwn-skill-pack
```

Run after patching references from accepted Aurora evidence:

```powershell
python docs\nwn-skill-pack\tools\check_skill_routes.py docs\nwn-skill-pack\draft-skills\nwn-server-gamedev
python docs\nwn-skill-pack\tools\check_skill_routes.py docs\nwn-skill-pack\draft-plugins\nwn-server-gamedev-pack\skills\nwn-server-gamedev
python docs\nwn-skill-pack\tools\check_domain_reference_status.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\reference_promotion_record.py aggregate docs\nwn-skill-pack\knowledge-inbox\reference-promotions\records --out docs\nwn-skill-pack\knowledge-inbox\reference-promotions\aggregate.md
python docs\nwn-skill-pack\tools\check_reference_promotion_records.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\generate_version_bump_plan.py docs\nwn-skill-pack --out docs\nwn-skill-pack\version-bump-plan.md
python docs\nwn-skill-pack\tools\check_release_gate.py docs\nwn-skill-pack --target repo-artifact
```

## Skill Promotion Rules

Promote only compact guidance:

- good: "For small location work, separate area wizard creation from area property editing; label this `toolset-observed` unless client traversal was tested."
- bad: raw symbol dumps, raw decompiled strings, or screenshots described as proof of runtime behavior.

Patch target guidance:

- locations/areas: area wizard, area properties, palette/source/family, placeables, doors, transitions, triggers, sounds, client traversal proof.
- items/loot: item palette category, inventory insertion, inventory-bearing object checks.
- creatures: creature blueprint vs placed instance split.
- quests/dialogues: conversation editor/test/search when confirmed.
- scripts: Toolset script edit/search/compile path when confirmed.
- feature template: module entry point and module event slots when confirmed.

## Versioning Effect

Usually use:

- `PATCH` for wording-only clarification of evidence boundaries.
- `MINOR` for a new reusable Toolset atom workflow, record schema/tool, or QA step.
- `MAJOR` only if installed skill routing, schema compatibility, or public guidance breaks.

## Still Hypothesis

- The workflow has not yet been run against a real disposable module.
- The return packet has not yet been used with a real returned Aurora evidence bundle.
- The return roundtrip check uses synthetic temporary data only; it proves route mechanics, not Aurora truth.
- The intake consistency checker can compare returned JSON metadata but cannot visually confirm screenshot or log redaction quality.
- The visual redaction checklist has not yet reviewed a real screenshot/log bundle.
- The visual redaction record contract has not yet captured a real maintainer review decision.
- The Aurora proposal generator now enforces visual redaction record presence for promotion-ready atoms, but it still cannot prove the human decision was correct.
- The atom sequence may change after live Toolset evidence.
- Fresh Codex answer quality still needs prompt-forward tests after reference promotion.
- Plugin install behavior still needs INSTALL-001 evidence before install-candidate claims.
