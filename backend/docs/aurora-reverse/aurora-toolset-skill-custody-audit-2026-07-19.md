# Aurora Toolset skill custody audit — 2026-07-19

Status: `CORRECTED / NON-LIVE`

## Scope

Reviewed the shared `aurora-toolset-operate`, `aurora-toolset-author`, and
`aurora-toolset-prove` sources, their installed junctions, routing references,
and the canonical session workflow. No Toolset or NWN action was performed.

## Evidence

- The installed directories under `C:\Users\enonw\.codex\skills` are junctions
  to `C:\Projects\aurora-web\skills`; there is no divergent per-project copy.
- The working tree reported the complete `skills/` directory as untracked.
  Therefore prior skill edits had no Git provenance or review boundary. This is
  a custody defect, not evidence that a consuming project owns a local skill.
- The shared skills consistently prohibit a project-local Toolset/proof/UI
  adapter. No such permission was found.

## Findings and corrections

1. The session workflow described `all` as automatically closing Toolset,
   while the operating skill correctly required explicit user authorization for
   every close. The workflow now marks `all` unavailable for ordinary live
   work until that command carries the same authorization contract. Agents use
   individually authorized phases and leave the process open by default.
2. A binary-bootstrap routing entry described the native route as ready while a
   conflicting-MRU regression proved it could accept a wrong module. The route
   is now constrained in the proof skill: start without a module argument;
   while the clean Welcome dialog is unowned, select `Open an existing Module`
   and exact-match the visible module-list item. If an MRU auto-load wins, fail
   closed; do not edit INI, accept the MRU module, or retry through a local
   adapter.
3. The suite contract is now `1.0.6`. Runner versions remain independent and
   must be validated through their own contract tests.
4. An explicitly authorized module close now treats Aurora's exact
   save-changes confirmation as a save operation: select `Yes`/`Tak`, wait for
   native Save/Build settlement, then require a clean title and file/readback.
5. The HAK authoring state is now explicit. `Build Module` is an
   observation-only state; a single live failure cannot create a new shared
   recovery route without a diagnosed generic cause and regression test.

## Required follow-up

Track the shared `skills/` source directory in version control before treating
future skill changes as published standards. A junction shares updates with
all local projects; it is not a review or rollback mechanism.

## Validation

- Static contract validation passed: required frontmatter, installed junction
  presence, current `1.0.4` routing references, and absence of the retired
  approved-local-adapter wording.
- The bundled `quick_validate.py` could not run because the available Python
  environments lack its `yaml` dependency. This is recorded as a validation
  environment defect; it is not reported as a passing skill validation.

## Non-goals

This audit does not claim that the binary module route, a Toolset module open,
geometry, viewport proof, or runtime proof is verified. The currently open
Toolset processes were not touched.
