# Research Run Summary

Source: `research-run-log.jsonl`

## Counts

- Entries: 314
- Legacy summary entries: 72
- Structured audit entries: 242
- Distinct event names: 314
- Preflight audit entries: 32
- Earliest entry: `2026-06-18T07:55:40Z` `heartbeat_created`
- Latest entry: `2026-06-19T09:41:47Z` `blocked_local_aurora_leads_from_release_notes_claims`

## Event Families

| Family | Entries |
| --- | ---: |
| `added` | 126 |
| `aligned` | 7 |
| `architecture` | 3 |
| `blocked` | 7 |
| `built` | 1 |
| `checked` | 1 |
| `classified` | 2 |
| `codex` | 1 |
| `concrete` | 1 |
| `connected` | 3 |
| `contributor` | 2 |
| `created` | 1 |
| `creatures` | 1 |
| `deployment` | 1 |
| `documented` | 2 |
| `domain` | 1 |
| `draft` | 1 |
| `economy` | 1 |
| `example` | 1 |
| `exercised` | 1 |
| `expanded` | 3 |
| `external` | 2 |
| `feature` | 1 |
| `feedback` | 4 |
| `first` | 1 |
| `fixed` | 2 |
| `forward` | 8 |
| `generated` | 3 |
| `hardened` | 5 |
| `heartbeat` | 1 |
| `human` | 1 |
| `indexed` | 1 |
| `ingested` | 8 |
| `install` | 6 |
| `items` | 1 |
| `local` | 2 |
| `locations` | 1 |
| `made` | 3 |
| `maintainer` | 1 |
| `manifest` | 1 |
| `mapped` | 3 |
| `model` | 1 |
| `normalized` | 1 |
| `nui` | 1 |
| `nwscript` | 1 |
| `package` | 3 |
| `persistence` | 1 |
| `plugin` | 2 |
| `post` | 1 |
| `preflight_checked` | 32 |
| `quests` | 1 |
| `ran` | 1 |
| `rc` | 2 |
| `rebuilt` | 1 |
| `rechecked` | 1 |
| `record` | 2 |
| `recovered` | 1 |
| `refreshed` | 2 |
| `rejected` | 1 |
| `release` | 7 |
| `repo` | 1 |
| `routed` | 1 |
| `self` | 1 |
| `server` | 1 |
| `static` | 1 |
| `strengthened` | 4 |
| `surfaced` | 5 |
| `testing` | 1 |
| `two` | 1 |
| `updated` | 3 |
| `validated` | 2 |
| `validation` | 1 |
| `version` | 1 |
| `versioned` | 2 |
| `versioning` | 1 |
| `wired` | 4 |

## Recent Entries

| Time | Event | Format | Note |
| --- | --- | --- | --- |
| `2026-06-19T09:07:17Z` | `aligned_first_pass_operator_references_with_creature_atom` | structured | read skill-creator SKILL.md before task actions |
| `2026-06-19T09:10:17Z` | `created_local_aurora_live_gap_queue` | structured | read skill-creator SKILL.md before task actions |
| `2026-06-19T09:13:17Z` | `made_local_aurora_gap_queue_structurally_checked` | structured | read skill-creator SKILL.md before task actions |
| `2026-06-19T09:15:47Z` | `versioned_local_aurora_live_gap_queue` | structured | read skill-creator SKILL.md before task actions |
| `2026-06-19T09:19:47Z` | `manifest_anchored_local_aurora_intake_chain` | structured | read skill-creator SKILL.md before task actions |
| `2026-06-19T09:22:47Z` | `mapped_manifest_anchored_local_aurora_chain_to_truth_policy` | structured | read skill-creator SKILL.md before task actions |
| `2026-06-19T09:26:17Z` | `added_local_aurora_lead_decision_route` | structured | read skill-creator SKILL.md before task actions |
| `2026-06-19T09:29:17Z` | `routed_local_aurora_leads_from_release_next_actions` | structured | read skill-creator SKILL.md before task actions |
| `2026-06-19T09:33:47Z` | `classified_local_aurora_leads_in_release_evidence_index` | structured | read skill-creator SKILL.md before task actions |
| `2026-06-19T09:36:47Z` | `blocked_local_aurora_leads_from_candidate_readiness` | structured | read skill-creator SKILL.md before task actions |
| `2026-06-19T09:39:17Z` | `blocked_local_aurora_leads_from_version_bump_plan` | structured | read skill-creator SKILL.md before task actions |
| `2026-06-19T09:41:47Z` | `blocked_local_aurora_leads_from_release_notes_claims` | structured | read skill-creator SKILL.md before task actions |

## Latest Structured Next Items

### `manifest_anchored_local_aurora_intake_chain`

- Run py_compile for check_version_manifest.py.
- Run check_version_manifest.py, check_package_boundaries.py, check_research_run_log.py, and the full repo-artifact preflight.
- Collect line references for the new manifest fields, checker token requirements, boundary text, audit entry, package inventory, pycache check, and git status before reporting.

### `mapped_manifest_anchored_local_aurora_chain_to_truth_policy`

- Run py_compile for check_knowledge_index_policy.py.
- Run check_knowledge_index_policy.py, check_research_run_log.py, and full repo-artifact preflight.
- Collect line references for the source-of-truth local chain, knowledge-index policy chain, checker required tokens, audit entry, package inventory, pycache check, and git status before reporting.

### `added_local_aurora_lead_decision_route`

- Run py_compile for check_maintainer_decision_index.py.
- Run check_maintainer_decision_index.py, check_research_run_log.py, and full repo-artifact preflight.
- Collect line references for the new decision row, checker tokens, audit entry, package inventory, pycache check, and git status before reporting.

### `routed_local_aurora_leads_from_release_next_actions`

- Run py_compile for generate_release_next_actions.py and check_release_next_actions.py.
- Regenerate release-next-actions.md with generate_release_next_actions.py.
- Run check_release_next_actions.py, check_research_run_log.py, and full repo-artifact preflight.
- Collect line references for the generator action, generated dashboard, checker tokens, audit entry, package inventory, pycache check, and git status before reporting.

### `classified_local_aurora_leads_in_release_evidence_index`

- Run py_compile for generate_release_evidence_index.py and check_release_evidence_index.py.
- Regenerate release-evidence-index.md with generate_release_evidence_index.py.
- Run check_release_evidence_index.py, check_research_run_log.py, and full repo-artifact preflight.
- Collect line references for the new Evidence Meaning line, generator, checker tokens, audit entry, package inventory, pycache check, and git status before reporting.

### `blocked_local_aurora_leads_from_candidate_readiness`

- Run py_compile for generate_release_readiness.py and check_release_readiness.py.
- Regenerate release-readiness.md with generate_release_readiness.py.
- Run check_release_readiness.py, check_research_run_log.py, and full repo-artifact preflight.
- Collect line references for the new readiness handoff line, generator, checker tokens, audit entry, package inventory, pycache check, and git status before reporting.

### `blocked_local_aurora_leads_from_version_bump_plan`

- Run py_compile for generate_version_bump_plan.py and check_version_bump_plan.py.
- Regenerate version-bump-plan.md with generate_version_bump_plan.py.
- Run check_version_bump_plan.py, check_research_run_log.py, and full repo-artifact preflight.
- Collect line references for the new version-plan boundary, generator, checker tokens, audit entry, package inventory, pycache check, and git status before reporting.

### `blocked_local_aurora_leads_from_release_notes_claims`

- Run py_compile for generate_release_notes_draft.py and check_release_notes_draft.py.
- Regenerate release-notes-draft.md with generate_release_notes_draft.py.
- Run check_release_notes_draft.py, check_research_run_log.py, and full repo-artifact preflight.
- Collect line references for the new release-note boundary, generator, checker tokens, audit entry, package inventory, pycache check, and git status before reporting.

## Does Not Prove

This summary proves only that the research log was parsed and summarized. It does not prove the truth of historical claims, run missing forward tests, install the plugin, promote human feedback, or prove NWN runtime behavior.
