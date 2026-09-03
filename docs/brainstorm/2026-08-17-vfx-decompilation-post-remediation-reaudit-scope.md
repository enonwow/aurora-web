# VFX and decompilation post-remediation re-audit scope

Date: 2026-08-17

## Scope

Re-audit the effective Aurora Web working tree after the first VFX and Aurora
decompilation remediation pass. Compare the current state with the findings in
`backend/docs/aurora-reverse/vfx-and-aurora-decompilation-audit-2026-08-17.md`.

Covered lanes:

- backend and frontend VFX contracts and focused tests;
- local VFX diagnostic aggregate;
- retail evidence packs and strict parity validation;
- structured prerequisite blockers and their recovery graph;
- decompilation lineage contract, generator, tests, and legacy inventory;
- build, unit, e2e, and regression baseline;
- documentation status and xoreos quarantine;
- architecture size drift;
- accepted live proof availability.

## Aurora-first classification

The audit touches Aurora runtime VFX parity and decompilation authority.
Unknown retail semantics are not implemented or inferred. Repository-local
contracts are evaluated independently from retail proof. Toolset/NWN proof is
reported as `missing` because no ingestible retail evidence set and no exact
versioned proof profile were available for this effective snapshot.

## Mutation boundary

The audit does not change product implementation. It may refresh existing
diagnostic and blocker reports through their canonical commands and adds only
the durable audit and scope artifacts.

## Deliverable

`backend/docs/aurora-reverse/vfx-and-aurora-decompilation-post-remediation-reaudit-2026-08-17.md`
