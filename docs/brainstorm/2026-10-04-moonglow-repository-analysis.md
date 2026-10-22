# Moonglow repository analysis scope

- Date: 2026-10-04 (Europe/Warsaw).
- Session: `01a10852-663a-7341-83c9-068da8cb5e39`.
- Request: analyze `https://github.com/jadzziaa/moonglow-toolset`.
- Deliverable: [canonical analysis](../audits/moonglow-toolset-analysis.md).
- Method: read-only GitHub API/source inspection and existing CI log review.
- Aurora-first classification: no unknown Aurora behavior must be implemented
  or accepted. This review examines software architecture, ordinary editing
  state, persistence and evidence quality. Upstream runtime claims are not
  adopted as Aurora Web authority. No native Toolset or NWN process is started.
- Applicable preflight: central rules and GPL reference policy read; no
  backend/frontend contract or implementation test gate is activated.
- Skills: none specifically fits static external Rust repository review.
  Native proof/browser/modeling skills are outside this scope.
- Existing unrelated Aurora Web changes are preserved. No remote writes,
  source integration, local build, installation or deletion are authorized by
  this analysis. Persisting the findings follows the supplied knowledge rules.

## Task file ledger

All paths below are relative to `C:\Projects\aurora-web`; owner is the session
above. No checkout, source cache, screenshots, test outputs or raw CI logs were
created on disk. Fetched source and logs were inspected in tool-session memory.

| Path | Purpose | Status |
| --- | --- | --- |
| `docs/brainstorm/2026-10-04-moonglow-repository-analysis.md` | Scope and file ownership | Required |
| `docs/audits/moonglow-toolset-analysis.md` | Reproducible findings and source references | Required |
| `docs/README.md` | Existing shared knowledge index; add one analysis link | Required; not task-owned |

This is an analysis-only task. No existing data was deleted; reclaimed space
is zero. The active conversation is not a cleanup target inside this session.

## Follow-up: feature gap inventory

The user then asked how many Moonglow capabilities Aurora Web lacks. The same
canonical report now includes an explicit 30-workflow comparison and a
separate AST recount of the current 81-row Area capability catalog. This is
static inspection of the dirty local worktree, including uncommitted code;
it neither implements new behavior nor certifies live native/browser parity.
The file ledger above is unchanged: no new task files or temporary outputs.

## Follow-up: reverse feature comparison

The user also asked which Aurora Web capabilities Moonglow lacks. The same
report now records five bounded differentiators: browser delivery, authenticated
roles, a central backend catalog, owner-scoped server drafts with revision
checks, and remote processing/graph APIs. Product capabilities are separated
from infrastructure and live acceptance. No real-time collaboration, superior
renderer, distributed worker pool or complete publishing workflow is claimed.
Static source inspection and documentation checks only; no services or test
runners started. The same three-file ledger and zero-byte cleanup result apply.

## Follow-up: engine implementation differences

The user's next question specifically excludes platform infrastructure. The
canonical report now separates custom MTR/SHD execution, effect-instance
lifecycle and beam/projectile runtime from the broad "both have VFX" label.
The upstream custom-shader omission is explicit; other absence findings are
bounded to inspected implementation paths and code-search results. Local
implementation is credited without converting source presence or existing
test files into fresh runtime/parity acceptance. No unknown native semantics
were implemented or certified. The file ledger is unchanged; no temporary
artifacts, application tests or processes, and no deletions (0 bytes reclaimed).
