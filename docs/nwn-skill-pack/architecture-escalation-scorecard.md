# Architecture Escalation Scorecard

## Purpose

Give maintainers a quick, checked scorecard for deciding whether `nwn-server-gamedev-pack` should stay as a skill/plugin repo artifact or escalate to repo-template, MCP, docs/RAG, hosted workflow tooling, or GitHub issue automation.

This scorecard summarizes the current package state. It does not replace `architecture-escalation-roadmap.md` or `architecture-decisions/adr-0001-skill-plugin-first.md`.

## Current Recommendation

Current package state: `repo artifact`.

Recommended now:

1. Keep the source of truth in Git under `docs/nwn-skill-pack/`.
2. Keep `draft-skills/nwn-server-gamedev/` as the compact Codex behavior layer.
3. Keep `draft-plugins/nwn-server-gamedev-pack/` as the future installable distribution.
4. Use local workflow tooling for validation, feedback records, inventories, release gates, and handoff packets.
5. Defer repo-template, MCP, docs/RAG, hosted workflow tooling, and public knowledge search until evidence gates below are met.

## Scorecard

| Option | Current fit | Enter when | Blocked by | Current decision |
| --- | --- | --- | --- | --- |
| Codex skill | High | The task needs procedural NWN server gamedev guidance, progressive disclosure, references, and helper scripts. | References become too large, stale, or need live shared state. | Use now. |
| Plugin | High as wrapper | Another Codex user needs an installable bundle with skill metadata and future MCP/app room. | No install-smoke pass, no completed handoff for claimed state, or package audit errors. | Keep as draft package. |
| Git repo | High | Maintainers need versioning, review, traceable feedback, release evidence, and SemVer. | None for current phase. | Use now. |
| Local workflow tooling | High | Deterministic checks, generators, schemas, and release gates can run from the repo. | Hosted shared state or live services become necessary. | Use now. |
| Repo template | Medium later | Two or three real server feature slices reuse stable folders, HAK/TLK/NWSync conventions, script includes, CI, and examples. | No repeated real feature slices yet. | Defer. |
| GitHub issues/PRs | Medium later | Feedback volume exceeds the local inbox or contributors need normal web submission/review. | Local contribution bundle and external trial have not been proven by an outside builder. | Defer. |
| MCP | Low now, high later | Codex needs a shared live queue, hosted validators, project-specific tools, or one current source across multiple users. | Static scripts still work; no shared-state bottleneck is proven. | Defer. |
| Docs/RAG | Low now, useful later | Reviewed references and promotion records become too large or noisy for static skill references. | Corpus is still small and unreviewed material must not be indexed. | Defer. |
| Hosted workflow tooling | Low now | Multiple maintainers need scheduled hosted checks, queue dashboards, or shared release automation. | Local preflight is enough and no maintainer throughput bottleneck is proven. | Defer. |

## Hard Gates Before Escalation

Do not escalate beyond skill/plugin/Git/local tooling unless:

- `tools/run_repo_artifact_preflight.py` passes,
- `tools/check_release_gate.py docs\nwn-skill-pack --target release-candidate` passes for RC claims,
- at least three accepted prompt-forward records exist with fresh/no-leak context and answer-capture artifacts,
- `INSTALL-001` or equivalent install-smoke evidence has a passed record before install-candidate claims,
- external contribution intake has at least one usable no-coaching result before replacing local inbox flows,
- promoted feedback records have reference promotion records and a SemVer plan,
- unreviewed incoming records and model-only claims are excluded from docs/RAG retrieval,
- a new ADR records the changed architecture decision.

## Signals To Revisit

Revisit this scorecard when one of these becomes true:

- maintainers repeatedly copy the same server skeleton by hand,
- multiple contributors submit feedback and local bundle handling becomes slow,
- reference files regularly exceed the useful context budget,
- static scripts need live project state or hosted validators,
- another Codex user cannot install or trigger the plugin after clean install-smoke testing,
- a real server feature slice proves stable conventions that should become a template.

## Verified

- `skill-creator` supports a compact skill with `SKILL.md`, optional `references/`, optional `scripts/`, and progressive disclosure.
- The current package has a draft skill, draft plugin, Git-managed maintainer workflow, local generators, local checkers, feedback records, and release gates.
- The accepted ADR is still skill/plugin first for `0.1.0` repo artifact.
- Release-candidate and install-candidate gates remain blocked until forward-test and install-smoke evidence exists.

## Still Hypothesis

- A repo template will help only after real server feature slices prove stable conventions.
- MCP will help only after live shared queue/search/validator needs become a real bottleneck.
- Docs/RAG will help only after reviewed knowledge outgrows static references and retrieval can exclude unreviewed/model-only material.
- Hosted workflow tooling will help only after local preflight becomes too slow or coordination-heavy for maintainers.

## Does Not Prove

This scorecard proves only the current architecture recommendation and escalation guardrails. It does not prove plugin installation, public marketplace behavior, fresh-thread answer quality, contributor independence, accepted feedback promotion, repo-template usefulness, MCP value, docs/RAG answer quality, or NWN runtime behavior.
