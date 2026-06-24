# NWN Knowledge Delivery Architecture Options

## Decision Summary

Start with a skill pack stored in a normal Git repository. This matches the verified Codex model: skills are the authoring format for reusable workflows, while plugins are the installable distribution unit for reusable skills and apps.

Add a repository template for project scaffolding when the NWN server starter layout becomes stable. Add MCP or RAG only after the knowledge corpus becomes large enough that static reference files stop scaling.

For concrete escalation gates, use `architecture-escalation-roadmap.md`.
For a concise current-state comparison of skill, plugin, Git repo, local tooling, repo-template, MCP, docs/RAG, hosted workflow tooling, and GitHub issues/PRs, use `architecture-escalation-scorecard.md`.
For the current accepted decision, use `architecture-decisions/adr-0001-skill-plugin-first.md`.

## Option Matrix

| Option | Best For | Weakness | Recommended Role |
| --- | --- | --- | --- |
| Codex skill | Portable procedural knowledge, routing, checklists, helper scripts | Static files do not self-update across users | Primary v0.1 delivery format |
| Git repository | Versioning, review, issues, pull requests, releases | Not automatically used by Codex unless installed or referenced | Source of truth and contribution hub |
| Repo template | Starter module/server layout, CI, folder conventions, example scripts | Bad fit for pure knowledge or evolving docs | Add after skill usage patterns stabilize |
| Plugin | Bundled skills plus MCP tools/apps, distribution as a richer package | More maintenance and install complexity | Preferred distribution format once stable |
| MCP server | Live querying, central feedback submission, validators, external services | Requires hosting/runtime and API design | Later phase for centralized contribution flow and verified knowledge search |
| Docs/RAG | Large corpus with retrieval and citations | Requires indexing, quality control, and freshness policy | Later phase for large community knowledge base |
| Plain documentation | Human reading, public reference, onboarding | Codex may not load the right parts automatically | Supporting material, not primary agent interface |

## Recommended Phases

### Phase 0: Local Research Pack

Goal: prove the structure.

Artifacts:

- `docs/nwn-skill-pack/`
- draft `nwn-server-gamedev` skill
- draft `nwn-server-gamedev-pack` plugin package
- plugin release-candidate checklist
- local feedback script
- inbox/review/promote workflow

Exit criteria:

- draft skill validates,
- draft plugin validates without installing into a personal marketplace,
- plugin release-candidate checklist identifies current package state and remaining install/public-release gaps,
- feedback record creation works,
- at least three realistic prompts are forward-tested,
- references show the main NWN game-dev domains.

### Phase 1: Public Skill Pack Repository

Goal: make it usable by other builders.

Artifacts:

- `skills/nwn-server-gamedev/`
- `knowledge-inbox/schema/feedback-record.schema.json`
- `tools/nwn_skill_feedback.py`
- contribution instructions
- release tags such as `v0.1.0`

Exit criteria:

- installation path is documented,
- release archive can be copied into a Codex skills folder,
- sample prompts exercise locations, 2DA/NWScript, and NUI,
- contribution records can be reviewed without editing skill files directly.

### Phase 2: Starter Server Template

Goal: give builders a project skeleton, not only advice.

Artifacts:

- module/source folder conventions,
- script include conventions,
- HAK/TLK/NWSync layout conventions,
- local validation scripts,
- example feature slices.

Exit criteria:

- a new builder can start a server repo,
- skill references point at matching folder conventions,
- CI or local checks can validate feedback records and skill structure.

### Phase 3: Plugin Or MCP

Goal: centralize queries and contributions if community usage grows.

Use MCP when Codex should access live tools or context:

- submit feedback records to a central queue,
- search a verified NWN knowledge base,
- run validators against uploaded records,
- fetch latest reference snippets with citations.

Use a plugin when distribution should bundle:

- skills,
- MCP configuration,
- helper tools,
- UI metadata,
- curated workflows.

Current draft packaging lives at `draft-plugins/nwn-server-gamedev-pack/`. See `plugin-distribution-plan.md` for the validation state and release boundary.
Use `plugin-release-candidate-checklist.md` before moving the package from repo artifact to release candidate or install candidate.
Use `architecture-escalation-roadmap.md` before adding repo-template, MCP, or RAG infrastructure.
Use `architecture-escalation-scorecard.md` before changing a deferred option into active work.
Update `architecture-decisions/adr-0001-skill-plugin-first.md` before changing the package state or escalating beyond skill/plugin.

## Why Skills First

Skills are the fastest useful unit because they are:

- portable,
- inspectable,
- versionable in Git,
- compatible with local scripts and references,
- enough to change Codex behavior for NWN-specific tasks.

They do not solve centralized knowledge growth by themselves. That is why the first release must include a contribution loop.

## Verified Codex Basis

See `source-of-truth-map.md` for the current source map. The short version:

- skill facts come from the local `skill-creator` and Codex manual Agent Skills section,
- plugin distribution guidance comes from the Codex manual Agent Skills and Build Plugins sections,
- MCP guidance comes from the Codex manual Model Context Protocol section,
- automation guidance comes from the Codex manual Automations section.

## Contribution Boundary

Do not let ordinary task runs directly mutate official skill references. They may create feedback records. Maintainers or trusted review agents promote records after verification.

This keeps the skill pack from drifting into a pile of unverified model claims.
