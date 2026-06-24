# Package Boundaries

## Purpose

Keep three package layers separate:

1. The installed skill is the compact agent workflow and domain reference layer.
2. The installed plugin is the distribution wrapper around the skill.
3. The repository or handoff bundle is the maintainer workspace with docs, feedback records, tests, and release tooling.

This avoids turning `SKILL.md` into a project wiki and avoids shipping review-only material as if it were trusted NWN guidance.

## Verified Locally

- `skill-creator` says a skill consists of required `SKILL.md` plus optional `agents/`, `scripts/`, `references/`, and `assets/`.
- `skill-creator` says broad process docs such as README, installation guides, quick references, and changelogs should not be put inside the skill folder.
- `plugin-creator` says a plugin root has required `.codex-plugin/plugin.json` and optional plugin-owned folders or companion files such as `skills/`, `scripts/`, `assets/`, `.mcp.json`, and `.app.json`.
- The current draft plugin has no apps or MCP servers, so the install boundary is only `.codex-plugin/plugin.json` plus `skills/nwn-server-gamedev/`.

## Boundaries

### Skill Boundary

Path:

`docs/nwn-skill-pack/draft-skills/nwn-server-gamedev/`

Allowed top-level entries:

- `SKILL.md`
- `agents/`
- `references/`
- `scripts/`
- `assets/` if later needed

Do not put these inside the skill:

- release notes,
- changelogs,
- repo-level README files,
- package inventories,
- forward-test records,
- raw human feedback inboxes,
- broad research logs.

### Plugin Install Boundary

Path:

`docs/nwn-skill-pack/draft-plugins/nwn-server-gamedev-pack/`

Current install contents:

- `.codex-plugin/plugin.json`
- `skills/nwn-server-gamedev/`

This is the only boundary that should be copied into a local plugin install location or marketplace source path.

### Handoff Bundle Boundary

Path:

`docs/nwn-skill-pack/`

The handoff bundle includes the plugin plus maintainer materials:

- source-of-truth and external source registries,
- human feedback release workflow,
- feedback review rubric for maintainer decisions before a record becomes promotion-ready,
- generated feedback intake status report for showing current review, promotion, and version-readiness without treating raw feedback as a skill update,
- feedback lifecycle checker for enforcing that `incoming/` source-history copies, reviewed records, rejected records, and promoted records keep distinct meanings,
- reference promotion proposal template for turning accepted feedback into an explicit target-reference patch plan,
- reference promotion proposal generator/checker for drafting that patch plan from one accepted reviewed feedback record,
- reference promotion record schema, validator, checker, and aggregate for recording accepted, held, or rejected promotion outcomes after maintainer review,
- version bump plan generator/checker for turning accepted promotion records into a maintainer SemVer recommendation without editing manifests,
- generated release notes draft plus generator/checker for human handoff text that preserves repo-artifact state, known gaps, feedback path, and not-proven boundaries,
- generated release next-actions dashboard plus generator/checker for ordering missing prompt-forward, install-smoke, external-feedback, and regeneration work,
- feedback schemas, templates, and contributor intake quickstart,
- contribution bundle format for sending validated feedback records to maintainers,
- external contributor trial packet for no-coaching usability checks of the intake/bundle path,
- external contributor trial result template for recording pass, partial, fail, friction, and maintainer verification without promoting raw feedback,
- external contributor trial record schema, CLI, and aggregate for machine-checkable no-coaching trial outcomes,
- generated `EXT-001` external trial handoff for starting the first outside-builder intake trial from current manifest state,
- generated `EXT-001` public tester message for sending the ZIP with SHA-256, no-coaching rules, return fields, and trust boundaries,
- repo-local `.codex-tmp` public-only external trial packet builder/checker for sending only tester-facing intake material,
- repo-local `.codex-tmp` cleanroom checker for copying the public ZIP into a scratch inbox, extracting it, and running the copied feedback CLI from scratch storage,
- repo-local `.codex-tmp` dispatch bundle builder/checker for collecting the current public ZIP, tester message, `SHA256SUMS.txt`, and `DISPATCH-MANIFEST.json` into one send-ready folder,
- repo-local `.codex-tmp` received-dispatch checker for copying the send-ready folder into a scratch inbox and proving the ZIP plus tester message can be used without reading repo sources,
- repo-local `.codex-tmp` isolated install layout checker for copying the plugin candidate and marketplace sandbox into a fake `CODEX_HOME` tree without changing any real Codex configuration,
- model-import policy for Claude, Opus, Codex, and other AI outputs,
- manifest-anchored local Aurora intake docs, symbol index, first-pass checklist, and live gap queue for keeping `C:\Projects\New Folder` and thread `019ed62e-3e0f-7253-91ff-f529be54abfe` material as maintainer-only `local-reverse-lead` evidence outside the plugin install boundary,
- Aurora live return packet for collecting filled Toolset records, evidence manifests, redacted artifacts, and blockers without treating returned material as an automatic skill update,
- Aurora live return roundtrip smoke test for exercising the return path on synthetic temporary data without creating evidence claims,
- Aurora live intake consistency checker for comparing returned live-record artifact paths, evidence labels, manifest rows, redaction flags, and hashes before review,
- Aurora live visual redaction checklist for the human inspection step that machine JSON checks cannot perform,
- Aurora live visual redaction record schema, CLI, checker, and aggregate for recording the human visual-review decision without pretending it is OCR or runtime proof,
- reviewed/rejected feedback records,
- forward-test prompts and records,
- forward-test evidence acceptance policy for deciding which prompt-forward-test records count toward RC,
- forward-test answer capture template for preserving raw test answers before reviewer-only scoring,
- repo-local `.codex-tmp` forward-test dispatch bundle builder/checker for collecting the minimum FT-002/FT-003/FT-008 prompts and blank capture sheets into one no-leak scratch folder,
- repo-local `.codex-tmp` clean-session prompt pack builder/checker for creating one self-contained FT-002/FT-003/FT-008 prompt file per fresh Codex thread without expected-reference leakage,
- repo-local `.codex-tmp` clean-session received-pack checker for copying that prompt pack into a scratch inbox and verifying the copied files still pass hash and no-leak checks,
- forward-test return capture checker for rejecting blank or reviewer-contaminated capture sheets before reviewer scoring,
- RC prompt-test handoff for external testers who only need prompt paths and capture instructions,
- minimum RC proof packet for maintainers who need the shortest remaining proof path without reviewer-only leakage,
- RC unblock playbook for no-answer-leak prompt test execution,
- install-smoke execution playbook for controlled plugin registration or install testing,
- architecture escalation scorecard for deciding whether to stay with skill/plugin/Git/local tooling or defer repo-template, MCP, docs/RAG, hosted workflow tooling, and GitHub issue automation,
- architecture decision records,
- maintainer decision index,
- versioning policy,
- release-candidate blocker burn-down,
- release readiness reports,
- package inventory and boundary checks,
- release and handoff checklists.

Unreviewed incoming feedback records are source history, not trusted guidance. Keep them out of install candidates unless a maintainer explicitly chooses otherwise.

## Machine Checks

- `tools/check_package_boundaries.py` verifies skill/plugin/repo boundaries.
- `tools/check_package_inventory.py` verifies inventory freshness.
- `tools/check_release_handoff.py` verifies handoff template structure plus the concrete `version-manifest.json` release handoff path, and can require a filled handoff before RC.
- `tools/check_release_readiness.py` verifies that the generated readiness report is fresh against current manifest and record inputs.
- `tools/generate_release_notes_draft.py` generates `release-notes-draft.md` from manifest, version bump plan, release readiness, and package inventory.
- `tools/check_release_notes_draft.py` verifies that the generated release notes draft is fresh and still names repo-artifact state, known gaps, feedback path, and not-proven boundaries.
- `tools/generate_release_next_actions.py` generates `release-next-actions.md` from release gates, readiness counts, and planned proof lanes.
- `tools/check_release_next_actions.py` verifies that the generated next-actions dashboard is fresh and still names blocked RC/install gates, FT-002/FT-003/FT-008, INSTALL-001, EXT-001, refresh commands, and not-proven boundaries.
- `tools/check_release_evidence_index.py` verifies that `release-evidence-index.md` is fresh against current evidence records and release gate snapshots.
- `tools/check_feedback_intake_docs.py` verifies the contributor packet, templates, and human feedback release workflow against CLI vocabulary and privacy guardrails.
- `tools/check_feedback_review_rubric.py` verifies the maintainer feedback review rubric for decision, promotion-ready, evidence-label, privacy, model-import, SemVer, and not-proof guardrails.
- `tools/generate_feedback_intake_status.py` generates `feedback-intake-status.md` from feedback record states, accepted reference promotion records, and the version bump plan.
- `tools/check_feedback_intake_status.py` verifies that the generated status report is fresh and preserves the no-direct-promotion boundary.
- `tools/check_feedback_lifecycle.py` verifies that same-id incoming records with reviewed/rejected/promoted copies are source history, terminal records stay in matching folders, and promoted records require promotion-ready maintainer review metadata.
- `tools/check_reference_promotion_proposal_template.py` verifies that `knowledge-inbox/reference-promotion-proposal-template.md` preserves review-decision, promotion-ready, target-reference, evidence-label, privacy, SemVer, verification-command, and no-self-update boundaries.
- `tools/generate_reference_promotion_proposal.py` creates a prefilled markdown proposal from one accepted reviewed feedback record without patching references.
- `tools/check_reference_promotion_proposal_tool.py` smoke-tests the generator with synthetic promotion-ready and unready feedback records under `.codex-tmp/reference-promotion-proposal/`.
- `tools/check_contribution_bundle_format.py` verifies that the contribution bundle format and `nwn_skill_feedback.py bundle` / `verify-bundle` commands stay aligned.
- `tools/check_contribution_bundle_roundtrip.py` verifies that the contribution bundle CLI can create and verify a fixture bundle, and that hash tampering is rejected.
- `tools/check_contributor_intake_quickstart.py` verifies the contributor intake quickstart against feedback CLI vocabulary, privacy guardrails, command shapes, and the no-self-update release boundary.
- `tools/check_external_contributor_trial_packet.py` verifies the external contributor trial packet against the intake/bundle commands, required return artifacts, privacy confirmation, result labels, and no-self-update boundary.
- `tools/check_external_contributor_trial_result_template.py` verifies that the external contributor trial result template captures metadata, returned artifacts, maintainer verification commands, result labels, friction notes, privacy/quarantine guidance, and the no-self-update boundary.
- `tools/external_trial_record.py` creates, validates, and aggregates external contributor trial records under `knowledge-inbox/external-trials/`.
- `tools/check_external_trial_records.py` verifies the external contributor trial record schema, CLI commands, aggregate boundary text, and any existing trial records.
- `tools/generate_external_trial_handoff.py` generates `knowledge-inbox/external-trials/ext-001-handoff.md` from `version-manifest.json`.
- `tools/check_external_trial_handoff.py` verifies that the generated external trial handoff is current, no-coaching oriented, and aligned with local static tooling.
- `tools/generate_external_trial_tester_message.py` generates `knowledge-inbox/external-trials/ext-001-tester-message.md` from the current manifest and public packet ZIP.
- `tools/check_external_trial_tester_message.py` verifies the tester message is current, includes the current ZIP SHA-256, avoids reviewer-only tokens, and preserves no-coaching/trust boundaries.
- `tools/build_external_trial_public_packet.py` builds `.codex-tmp/external-trial-public-packet/ext-001/` and `.codex-tmp/external-trial-public-packet/ext-001.zip` from the approved tester-facing intake files.
- `tools/check_external_trial_public_packet.py` verifies the generated public packet manifest, ZIP archive, ZIP extraction, copied-file hashes, exact file set, absence of reviewer-only file tokens, copied feedback CLI help behavior, and a synthetic `new -> validate -> bundle -> verify-bundle` command path from both the packet directory and extracted ZIP in `.codex-tmp`.
- `tools/check_external_trial_cleanroom.py` copies the generated `EXT-001` ZIP into `.codex-tmp/external-trial-cleanroom/ext-001/inbox/`, extracts it into `.codex-tmp/external-trial-cleanroom/ext-001/received/`, runs copied feedback CLI help and synthetic `new -> validate -> bundle -> verify-bundle` commands from the received files, and writes `CLEANROOM-SUMMARY.json`.
- `tools/build_external_trial_dispatch_bundle.py` builds `.codex-tmp/external-trial-dispatch/ext-001/` from the current public ZIP and tester message, then writes `SHA256SUMS.txt` and `DISPATCH-MANIFEST.json`.
- `tools/check_external_trial_dispatch_bundle.py` verifies the dispatch folder file set, source/copy hashes, SHA256SUMS coverage, tester-message boundary tokens, public packet smoke, cleanroom smoke, and the manifest's not-proven boundary.
- `tools/check_external_trial_received_dispatch.py` copies `.codex-tmp/external-trial-dispatch/ext-001/` into `.codex-tmp/external-trial-received-dispatch/ext-001/inbox/`, verifies the received hashes and tester-message ZIP hash, extracts the received ZIP, runs copied feedback CLI help plus synthetic `new -> validate -> bundle -> verify-bundle` commands from the extracted files, and writes `RECEIVED-DISPATCH-SUMMARY.json`.
- `tools/external_trial_record.py` records `maintainer_verification.cleanroom_check` so completed external trial records preserve whether the public ZIP passed cleanroom smoke before handoff.
- `tools/external_trial_record.py` also records `maintainer_verification.independent_tester`; `pass` records require it to be `true` so local smoke scaffolding cannot be counted as an outside tester success.
- `tools/check_model_import_policy.py` verifies that model-originated claims use feedback-record source types and remain untrusted until docs or runtime evidence exists.
- `tools/check_local_aurora_reverse_scope.py` verifies that local Aurora reverse and UI-thread intake docs preserve `local-reverse-lead` boundaries, keep the live gap queue maintainer-only, report a substantial generated symbol corpus, and stay out of the plugin install boundary.
- `tools/check_aurora_live_return_packet.py` verifies that `knowledge-inbox/aurora-live-return-packet.md` preserves record, evidence-manifest, privacy, evidence-label, return-bundle, and proposal-boundary guidance.
- `tools/check_aurora_live_return_roundtrip.py` verifies that the Aurora return path can prepare a temporary session, synthesize a clearly marked non-evidence bundle, validate records/manifests/redaction, generate a promotion-review queue, and keep all generated data in a temporary copy.
- `tools/check_aurora_live_intake_consistency.py` verifies that submitted Aurora live records and evidence manifests agree on record ids, artifact paths, atoms, evidence labels, promotion-ready redaction status, and hashes.
- `tools/check_aurora_live_visual_redaction_checklist.py` verifies that `knowledge-inbox/aurora-live-visual-redaction-checklist.md` preserves the human review gate for screenshots, logs, saved module notes, and external evidence bundles.
- `tools/aurora_live_visual_redaction_record.py` creates, validates, and aggregates human visual redaction review records under `knowledge-inbox/aurora-live-visual-redaction-records/`.
- `tools/check_aurora_live_visual_redaction_records.py` verifies the visual redaction record schema, CLI, aggregate boundary text, and any existing visual-review records.
- `tools/check_architecture_scorecard.py` verifies the architecture escalation scorecard against current repo-artifact state and blocked release-candidate gate.
- `tools/check_architecture_decisions.py` verifies the accepted skill/plugin-first ADR against the current version manifest and release-gate state.
- `tools/check_maintainer_decision_index.py` verifies that the maintainer decision index routes to existing manifest artifacts, checkers, evidence boundaries, and escalation options.
- `tools/check_versioning_policy.py` verifies package states, SemVer rules, human feedback release path, and current version/state alignment against `version-manifest.json` plus the plugin manifest.
- `tools/check_external_source_registry.py` verifies trust-tier and runtime-test guardrails for external and compact source registries.
- `tools/check_domain_reference_status.py` verifies that main NWN domain references in both skill copies preserve `docs-verified` versus `runtime-tested` source-status labeling.
- `tools/check_capability_map.py` verifies that the installed skill's multi-domain capability map is routed, synchronized, and still distinguishes skill, plugin, workflow tooling, repo-template, MCP, docs/RAG, and runtime work.
- `tools/check_feature_design_template.py` verifies that the installed skill's full feature design output template is routed, synchronized, and still covers expected domains, evidence labels, QA ladder, blockers, and feedback capture.
- `tools/generate_forward_test_execution_queue.py` generates the no-answer-leak execution queue from the forward-test matrix and current records.
- `tools/generate_forward_test_reviewer_packet.py` generates the reviewer-only scoring packet from the forward-test matrix.
- `tools/generate_forward_test_record_templates.py` generates reviewer-only record command templates from the forward-test matrix.
- `tools/check_forward_test_prompts.py` verifies the repo-level no-answer-leak forward-test prompt packet, reviewer-only matrix, generated execution queue, generated reviewer packet, and generated record command templates.
- `tools/check_forward_test_evidence_policy.py` verifies that `forward-tests/evidence-acceptance-policy.md`, `tools/check_release_gate.py`, and generated record command templates agree on fresh/no-leak context plus answer-capture artifacts.
- `tools/build_plugin_install_candidate.py` copies only `plugin_install_include=true` files into a clean local plugin root under `.codex-tmp/install-candidate/`.
- `tools/build_local_marketplace_candidate.py` creates a repo-local marketplace sandbox under `.codex-tmp/marketplace-candidate/` without modifying the personal Codex marketplace.
- `tools/check_install_candidate.py` verifies that `.codex-tmp/install-candidate/` and `.codex-tmp/marketplace-candidate/` match the current `plugin_install_include` inventory hashes.
- `tools/check_isolated_install_layout.py` copies the current install candidate and marketplace sandbox into `.codex-tmp/isolated-install-layout/INSTALL-001/CODEX_HOME/`, verifies plugin/skill/marketplace layout, and writes `ISOLATED-INSTALL-LAYOUT-SUMMARY.json`.
- `tools/generate_install_smoke_packet.py` generates the current INSTALL-001 tester handoff from the marketplace sandbox.
- `tools/check_install_smoke_packet.py` checks that the INSTALL-001 handoff still matches `version-manifest.json` and the sandbox `marketplace.json`.
- `tools/check_install_smoke_playbook.py` verifies that `forward-tests/install-smoke-execution-playbook.md` stays aligned with `version-manifest.json`, INSTALL-001 packet paths, result rules, and install-candidate gate checks.
- `tools/forward_test_record.py` records `install_verification`; `install-smoke-test` `pass` records require registered/installed source, fresh context, skill visibility or invocation, expected reference routing, runtime-boundary preservation, and `preparation_only=false`.
- `tools/check_install_smoke_records.py` verifies the install-smoke record policy, including synthetic negative/positive contract checks and any existing `INSTALL-*` records under `forward-tests/records/`.
- `tools/check_rc_prompt_test_handoff.py` verifies that `forward-tests/rc-prompt-test-handoff.md` is generated from the current matrix, names only the minimal FT-002/FT-003/FT-008 prompt paths, and avoids reviewer-only expected-reference names.
- `tools/generate_minimum_rc_proof_packet.py` and `tools/check_minimum_rc_proof_packet.py` keep `forward-tests/minimum-rc-proof-packet.md` current against the manifest, reviewer matrix, release gates, install-smoke record policy, external-feedback boundary, and runtime-proof boundary.
- `tools/check_rc_unblock_playbook.py` verifies that `forward-tests/rc-unblock-playbook.md` stays aligned with `version-manifest.json`, the reviewer matrix, and the no-answer-leak FT-002/FT-003/FT-008 execution path.
- `tools/check_forward_test_capture_template.py` verifies that `forward-tests/answer-capture-template.md` exists, is routed from tester/RC handoff docs, and does not contain reviewer-only scoring tokens.
- `tools/build_forward_test_dispatch_bundle.py` builds `.codex-tmp/forward-test-dispatch/rc-minimum/` with FT-002, FT-003, and FT-008 prompt files, blank capture sheets, tester instructions, hashes, and `DISPATCH-MANIFEST.json`.
- `tools/check_forward_test_dispatch_bundle.py` verifies the dispatch folder file set, hash coverage, no-leak boundary, and manifest not-proven statements.
- `tools/build_forward_test_clean_session_prompts.py` builds `.codex-tmp/forward-test-clean-session-prompts/rc-minimum/` with one self-contained prompt file per fresh Codex thread, hashes, and `CLEAN-SESSION-MANIFEST.json`.
- `tools/check_forward_test_clean_session_prompts.py` verifies the clean-session prompt file set, hashes, no-leak boundary, expected-reference exclusion, capture instructions, and manifest not-proven statements.
- `tools/check_forward_test_clean_session_received_pack.py` copies the clean-session prompt pack into `.codex-tmp/forward-test-clean-session-received/rc-minimum/inbox/`, verifies copied hashes against the source, reruns the clean-session no-leak checker on the copy, and writes `RECEIVED-CLEAN-SESSION-SUMMARY.json`.
- `tools/check_forward_test_return_captures.py --captures <returned-captures-dir>` verifies returned FT-002, FT-003, and FT-008 capture sheets are filled before reviewer scoring, while `--self-test` checks the checker with a synthetic fixture under `.codex-tmp`.
- `tools/check_plugin_package.py` runs both checks as part of the package audit.
- `tools/run_repo_artifact_preflight.py` runs the repo-artifact generator/checker sequence in the safe order: derived docs, inventory, local install sandbox, marketplace sandbox, and final checks.

The boundary checker proves only local package hygiene. It does not prove plugin installation, Codex marketplace behavior, NWN runtime behavior, or correctness of any game-design claim.
The release evidence index proves only release bookkeeping freshness. It does not prove that static checks are enough for RC, install, prompt behavior, or NWN runtime correctness.
The RC blocker burn-down proves only current blocker bookkeeping and recommended next test ordering. It does not prove that any forward test or install-smoke test has run.
The RC prompt-test handoff proves only that sanitized tester instructions are current. It does not prove that an external tester ran the prompts or captured uncontaminated answers.
The minimum RC proof packet proves only that the maintainer execution path is current and keeps prompt-forward, install-smoke, external feedback, and runtime evidence separate. It does not prove that any of those evidence lanes has been executed.
The RC unblock playbook proves only that the human execution procedure is current and avoids obvious answer leakage. It does not prove that fresh contexts have run or passed.
The forward-test evidence acceptance policy proves only local release-gate hygiene. It does not prove that future record contents are truthful or that a future tester really used a clean context.
The answer capture template proves only that the intended raw-answer capture procedure is current. It does not prove a tester used it or that captured answers are uncontaminated.
The forward-test dispatch bundle proves only that the minimum RC prompt files and blank capture sheets were assembled into a no-leak scratch folder with hashes. It does not prove that any clean context ran, answered, or passed.
The forward-test clean-session prompt pack proves only that one self-contained prompt file per fresh Codex thread was generated without expected-reference leakage. It does not prove that any fresh thread was opened, any answer was captured, any tester was independent, or any response was accepted.
The forward-test clean-session received-pack checker proves only that the generated prompt pack survives a local scratch-inbox copy and still passes hash/no-leak checks. It does not prove outside delivery, fresh-thread execution, raw answer capture, tester independence, answer quality, install behavior, or NWN runtime behavior.
The forward-test return capture checker proves only that returned capture sheets are structurally filled and avoid reviewer-only tokens. It does not prove the captured answers are true, uncontaminated, high quality, or runtime-tested.
The repo-artifact preflight runner proves only that the local repo artifact can be regenerated and validated in order. It does not prove RC readiness, plugin installation in a fresh Codex context, or NWN runtime behavior.
The release notes draft proves only that human handoff text is generated from current local release metadata. It does not prove installability, public marketplace behavior, fresh-thread answer quality, accepted feedback promotion, or NWN runtime behavior.
The release next-actions dashboard proves only that current local blockers have been summarized into an ordered maintainer queue. It does not prove any prompt-forward, install-smoke, external-trial, feedback-promotion, or NWN runtime evidence has been produced.
The install-candidate builder proves only that the plugin boundary can be copied cleanly from the repository artifact. It does not prove that another Codex environment can discover, install, or trigger the plugin.
The marketplace-candidate builder proves only that the marketplace file shape and relative plugin source path can be generated locally. It does not run `codex plugin marketplace add`, install the plugin, or prove Codex UI discovery.
The install-candidate checker proves only that the repo-local sandbox content matches the current inventory and marketplace file shape. It does not register a marketplace, install the plugin, or prove trigger behavior in a new Codex thread.
The isolated install layout checker proves only that the built plugin and marketplace sandbox survive copying into a fake `CODEX_HOME` layout. It does not register a marketplace, install the plugin, prove a fresh Codex thread can see the skill, or create install-smoke-test evidence.
The install-smoke packet checker proves only static handoff consistency. It does not prove that Codex registered the marketplace, loaded the plugin, or invoked the skill in a new thread.
The install-smoke execution playbook proves only that the human procedure is current and separates preparation from evidence. It does not prove any install, registration, or fresh-context invocation happened.
The install-smoke `install_verification` fields are maintainer/tester assertions captured in a record. They prevent preparation-only records from counting as `pass`, but they still do not prove NWN runtime correctness, public marketplace readiness, or long-term Codex product behavior.
The install-smoke record checker proves only local record-policy enforcement. It does not prove an install-smoke test was run when no accepted `INSTALL-*` record exists.
The domain-reference status checker proves only reference-labeling hygiene and authoring/plugin copy sync for selected domain files. It does not prove that any NWN claim is true in a target module or server runtime.
The capability map checker proves only routing and release-policy coverage for multi-domain guidance. It does not prove that the selected architecture is best for a future server or community.
The feature design template checker proves only output-shape and routing hygiene. It does not prove any generated server feature is correct, fun, balanced, compiled, or runtime-tested.
The contributor intake quickstart checker proves only vocabulary, command, privacy, and release-boundary alignment. It does not prove submitted feedback is true or that a contributor can run the commands in another environment.
The reference promotion proposal template checker and generator checker prove only that the maintainer patch-planning surface preserves review, evidence, privacy, SemVer, and verification boundaries. They do not prove the promoted claim is true, the patch is correct, or a future skill version improves answers.
The external contributor trial packet checker proves only that a no-coaching trial procedure is documented and aligned with local commands. It does not prove that any external contributor has completed the trial, that the feedback is true, or that the submitted material is private-data-safe.
The external contributor trial result template checker proves only that completed trial results have a consistent recording shape. It does not prove that a trial was actually run, that a tester used a clean context, or that a submitted NWN claim is true.
The external trial record checker proves only local record contract hygiene and aggregate shape. It does not prove a tester's environment, honesty, private-data safety, or any NWN runtime behavior.
The external trial handoff checker proves only that the generated `EXT-001` start packet matches current local metadata and no-coaching boundaries. It does not prove that an outside tester received, used, or completed the handoff.
The external trial tester message proves only that the sendable message is aligned to the current ZIP hash and public trial boundaries. It does not prove that the message was sent, read, understood, or followed.
The external trial public packet checker proves only that the repo-local `.codex-tmp` tester packet and ZIP archive were built from the approved public files and that copied CLI help plus a synthetic command path run locally from both the packet directory and extracted ZIP. It does not prove delivery, tester independence, real contributor completion, privacy safety, feedback truth, or NWN runtime behavior.
The external trial cleanroom checker proves only that the generated ZIP can be copied into a scratch inbox, treated as a received archive, and that copied CLI commands work there on synthetic data. It does not prove an outside tester received, understood, completed, or returned a private-data-safe contribution.
The external trial dispatch bundle proves only that the current ZIP and tester message were copied into one send-ready scratch directory with hashes. It does not prove the bundle was sent, received, read, understood, completed, or safe to promote.
The external trial received-dispatch checker proves only that a local copy of the send-ready folder can be treated as a received inbox and used without repo-source reads. It does not prove outside delivery, human comprehension, completion, privacy safety, feedback truth, or NWN runtime behavior.
The external trial record `cleanroom_check` field records that this local cleanroom check was run. It is a prerequisite for trusting the handoff mechanics, not evidence that the outside tester succeeded.
The external trial record `independent_tester` field is the explicit maintainer confirmation that the result came from a real outside tester or an accepted clean-clone run. It is required for `pass` and must not be set for local smoke alone.
The contribution bundle checker proves only local transport-format hygiene. The `verify-bundle` command proves only manifest/hash/record consistency at intake time. The contribution bundle roundtrip checker proves only local CLI behavior on a synthetic fixture. None of these prove privacy safety, record truth, maintainer acceptance, or future skill improvement.
The feedback review rubric checker proves only that maintainers have a consistent decision procedure before marking a record promotion-ready. It does not prove the reviewed claim is true, that the reviewer made the correct decision, that a reference patch is correct, or that a later skill version improves answers.
The feedback intake status report proves only that current local feedback states, promotion readiness, accepted promotion counts, and version recommendation were summarized. It does not prove any submitted NWN claim, privacy safety, reference correctness, install behavior, fresh Codex answer quality, or NWN runtime behavior.
The model-import policy checker proves only source-type vocabulary and trust-boundary alignment. It does not prove any imported model claim is true.
The Aurora live return packet checker proves only that returned Toolset evidence has a documented intake shape and privacy boundary. It does not prove any returned observation is true, redacted, complete, promotion-ready, or runtime-tested.
The local Aurora reverse scope checker proves only local boundary hygiene for maintainer artifacts. It does not prove the reverse-engineering interpretation, exact Toolset UI behavior, legal/public redistributability, or NWN runtime behavior.
The Aurora live return roundtrip checker proves only that the return-path mechanics work on synthetic temporary data. It does not prove Aurora Toolset behavior, artifact truth, screenshot quality, redaction quality, runtime behavior, or reference correctness.
The Aurora live intake consistency checker proves only JSON metadata consistency between returned records and manifests. It does not visually inspect screenshots or logs, prove redaction quality, prove artifact authenticity, or prove runtime behavior.
The Aurora live visual redaction checklist checker proves only that the human visual-review procedure is documented and routed. It does not OCR screenshots, inspect images automatically, inspect external logs, or prove redaction quality.
The Aurora live visual redaction record checker proves only local record-contract and aggregate hygiene. It does not prove a human actually made a correct privacy decision, prove artifact authenticity, inspect pixels, or prove NWN runtime behavior.
The architecture scorecard checker proves only that the current use-now/defer recommendation is locally consistent with manifest state and release gates. It does not prove repo-template usefulness, MCP value, docs/RAG quality, hosted workflow need, installability, or NWN runtime behavior.
The architecture decision checker proves only that the current ADR still matches the declared repo-artifact state and blocked RC gate. It does not prove that skill/plugin-first is optimal forever.
The maintainer decision index checker proves only local routing hygiene for common maintainer choices. It does not prove the selected path is optimal for a future project.
The versioning policy checker proves only that local policy text, manifest state, and plugin version metadata agree. It does not prove that a version is useful, installable, or correctly tested.
