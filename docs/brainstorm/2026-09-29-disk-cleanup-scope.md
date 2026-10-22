# Disk cleanup and documentation consolidation scope

Date: 2026-09-29. Scope: the existing local checkout, not other projects.

## Preflight

- Rules-first: read the central rules README, repository AGENTS.md, backend
  and frontend rules, and the observability reference.
- Aurora-first: filesystem housekeeping introduces no Aurora runtime semantic.
  No decompilation, Toolset/NWN operation, browser capture or parity claim is
  required. The prove skill's evidence-preservation boundary applies to the
  existing proof archives; live capture acceptance is outside this task.
- No guessing: measure every directory without following junctions; protect
  tracked and untracked non-ignored files; inspect candidate contents and
  process ownership before removal. Ignored does not imply disposable.
- Contract-first: no backend/frontend contract or product feature changes.
- Test-first: record file hashes, Git index/status, file inventory and free
  space before deletion. Verify preservation and documentation links after
  the change; use focused existing tests if fixture documentation is touched.
- Diagnosability-first: keep a per-file removal manifest, before/after sizes,
  retention decisions and verification results under
  `docs/audits/disk-cleanup-2026-09-29/`.
- External GPL sources: none read or used for implementation.

## Boundaries

Preserve all pre-existing staged deletions, modified files, untracked work,
source, dependencies, active data, fixtures, current builds, unique evidence,
Ghidra databases and Git history. No reset, checkout, clean, mutation testing,
server startup or process termination. Work in the existing dedicated branch
without moving the user's dirty checkout to another branch.

Consolidate navigation and ownership without flattening dated evidence into
new conclusions. Preserve self-contained distribution copies when package
validators require them. Central rules remain in the external documentation
project; repository indexes link to them rather than creating a second copy.
