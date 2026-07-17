# Architecture Escalation Roadmap

## Purpose

Answer the recurring question: should NWN server gamedev knowledge live in a Codex skill, plugin, MCP server, repo template, docs/RAG system, or something else?

Short answer: use a skill plus Git now, package it as a plugin for other people, add a repo template when server project conventions are stable, and only add MCP/RAG when static reviewed files stop scaling.

The current accepted decision is recorded in `architecture-decisions/adr-0001-skill-plugin-first.md` and checked by `tools/check_architecture_decisions.py`.
For quick current-state comparison, use `architecture-escalation-scorecard.md` and verify it with `tools/check_architecture_scorecard.py`.
For day-to-day maintainer routing, use `maintainer-decision-index.md` and verify it with `tools/check_maintainer_decision_index.py`.

## Recommended Stack By Maturity

| Maturity | Primary Form | Why | Exit Gate |
| --- | --- | --- | --- |
| Research | `docs/nwn-skill-pack/` | Easy to audit and revise | Draft skill validates and domain references exist |
| First usable pack | Skill in Git | Best format for Codex behavior and progressive disclosure | 3+ forward tests pass without failure |
| Shareable package | Plugin | Best installable bundle for another Codex user | Plugin validation, handoff notes, install smoke test |
| Starter server work | Repo template | Gives builders folders, scripts, CI, examples | Conventions stable across multiple real features |
| Community knowledge | GitHub issues/PRs | Human review and traceable contribution queue | Feedback volume exceeds local inbox review |
| Live tools/context | MCP | Central submission, validators, search, server-specific tools | Static scripts cannot handle live needs |
| Large corpus | Docs/RAG | Retrieval with citations over many reviewed records | Static references become too large/noisy |

## Decision Rules

Stay with the skill when:

- the task is procedural guidance,
- the knowledge is compact enough for reference files,
- helper scripts can run locally,
- users do not need live central state,
- releases can be versioned through Git.

Ship as a plugin when:

- another person needs an installable package,
- the package contains one or more skills,
- UI metadata, update flow, or future MCP config matters,
- you need a clear release artifact.

Create a repo template when:

- users repeatedly ask for the same server folder layout,
- HAK/TLK/NWSync/script conventions are stable,
- feature examples can be copied into a new project,
- CI/local validation scripts are useful for every new server.

Add MCP when:

- Codex should submit feedback to a shared queue,
- Codex should query a verified knowledge base live,
- validators need hosted services or project-specific state,
- multiple users need one current source without copying files.

Add docs/RAG when:

- reviewed records and docs are too large for static skill references,
- retrieval with citations improves answers,
- the corpus has ownership, freshness, and rejection policies,
- unreviewed material is excluded from retrieval.

## Stop Conditions

Do not move up a level when:

- the current level has not been forward-tested,
- facts are still unverified model output,
- install instructions are hypothetical,
- contribution review is missing,
- the next level adds hosting/maintenance without a real bottleneck.
- the architecture ADR has not been updated for the new claimed state.

## Current Recommendation

Current state: `repo artifact`.

Use this path:

1. Keep authoring in `docs/nwn-skill-pack/draft-skills/nwn-server-gamedev`.
2. Keep Git as the source of truth for review and versions.
3. Keep the draft plugin as the future distribution package.
4. Run independent forward tests before calling it a release candidate.
5. After RC, test local install/update in a clean Codex thread.
6. Add repo-template only after two or three real server feature slices prove stable conventions.
7. Add MCP/RAG only after reviewed feedback volume makes local files painful.

Use the architecture scorecard before changing this recommendation. If the scorecard says `Defer`, create or update an ADR before adding repo-template, MCP, docs/RAG, hosted workflow tooling, or GitHub issue automation.

## What This Means For Human Learning

Using the skill does not automatically improve it.

The improvement path is:

```text
user/server experience
  -> feedback record
  -> maintainer review
  -> promoted reference update
  -> version bump
  -> new plugin/skill release
```

MCP can make submission and retrieval smoother later, but it does not remove the need for human review.
