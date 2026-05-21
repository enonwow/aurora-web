# Project Rules

## Purpose
This document defines mandatory project rules for `aurora-web`.

## Rule Priority
1. Rules-first workflow: before implementation decisions, confirm applicable rules.
2. If a new constraint is discovered during brainstorming, add or update the rule here first.
3. Execution work (architecture, code, tests, delivery) must follow the active rules.

## Initial Rules
1. Documentation language is English only.
2. Major project decisions must be written in repository documentation, not only in chat.
3. Scope verification updates must be recorded in `docs/brainstorm/`.

## Core Rules
1. Aurora-first knowledge rule:
- Aurora reverse-engineering is the primary source of truth.
- If required knowledge is missing, implementation is blocked until reverse/decompile research is completed and documented.
- Implementation starts only after the missing knowledge gap is closed.

2. No-guessing collaboration rule:
- Do not guess, invent, or fake implementation details when knowledge is missing.
- If implementation is blocked or uncertain, report it immediately and explicitly.
- Avoid blind iterative retries; after reasonable attempts, stop and escalate with clear context.
- Share what is known, what is missing, and what decision/input is needed to proceed.

3. Three-layer testing rule for each feature:
- Unit tests are required for every feature and should maintain high coverage.
- Regression smoke tests are required to ensure new changes do not break existing behavior.
- Performance benchmarks are required for larger or performance-sensitive features where measurable runtime behavior matters.

4. Client-first execution rule for multi-user web runtime:
- Rendering and heavy visual computation should run on the client whenever feasible.
- The server should be responsible primarily for data delivery, auth/session control, persistence, and orchestration.
- New features must avoid server-side GPU rendering as a default path.
- If server-side heavy processing is unavoidable, it must be explicitly justified and protected by strict resource limits.

5. Contract-first delivery rule:
- No feature implementation starts before backend/frontend contract v1 is defined for that feature scope.
- Every contract must define payload budgets, chunking/streaming behavior, and versioning strategy.
- Contract changes must be backward-compatible within the same major contract version, or include explicit migration steps.

6. Scout Rule (clean-as-you-go):
- Leave touched code cleaner than it was before the change.
- If obvious code quality issues are found in the touched area, fix them in the same change when safe.
- Dead code in the touched area should be removed unless there is a documented reason to keep it.
- If a cleanup is too large for the current scope, create a follow-up task and record it in project documentation.

7. Branch-first delivery rule:
- Every new feature, fix, or refactor must be developed on a dedicated branch (not directly on `main`).
- Merge/push to `main` is allowed only after required tests pass and the change is production-ready.
- `main` should always stay in a releasable state.

8. Client cache control rule:
- Client-side cache is allowed and should reduce repeated downloads/render setup cost.
- The client cache must have a hard size cap of `2 GB`.
- The user must be able to clear local cache at any time from the application UI.
- Scene runtime cache should be released when leaving a location, while immutable asset cache may remain within the configured cap.

9. Diagnosability-first implementation rule:
- For each new feature scope, define tests and required debug/telemetry instrumentation before implementation starts.
- Feature work order is: `tests` -> `debug and telemetry hooks` -> `implementation`.
- A change is not complete unless issues can be diagnosed with concrete object context (area, object identity, transform, and asset references).

10. Dev-only debug exposure rule:
- Interactive debug tooling is available in development builds only.
- Production builds and production containers must have debug endpoints/UI disabled by default.
- Debug instrumentation must not be required for normal production runtime behavior.

11. SOLID and extensibility rule:
- Architecture and module boundaries must follow SOLID principles.
- New features should be added through extension points, not by breaking existing flows.
- UI/UX structure must anticipate future feature growth (additional tools, panels, and screens) without major rewrites.

12. Incremental scene update rule:
- Object add/remove/edit operations must update only affected scene subsets.
- Full-area rerender/reload is not allowed as a default reaction to single-object edits.
- Preview and inspection workflows must preserve current area context and avoid forcing a full scene rebuild.

13. Server-enforced authorization rule:
- Authentication and authorization are mandatory for all non-public project actions.
- Role permissions must be enforced on the server side (UI visibility is not sufficient security).
- Access is deny-by-default and granted only by explicit role permissions.
- Privileged actions (settings changes, server project access, destructive actions) must be restricted to authorized roles only.

14. Unified render pipeline rule:
- Shared render behavior for placeables, VFX, doors, creatures, and tiles must be implemented in common modules.
- Do not re-implement the same render/build stages separately per object type.
- Object-type-specific logic must be limited to adapters/mappers feeding the shared pipeline.
- When one shared render rule changes (for example transform/material/cache handling), all object types must inherit that change through the same core path.

15. UX coherence and panel ergonomics rule:
- Side panels and major tools must follow one consistent interaction pattern (layout, controls, states, naming).
- New controls must be added through defined panel sections, not ad-hoc button placement.
- Core workspace panels must support collapse/expand behavior for focused viewport work.
- UX changes must preserve editing continuity and must not trigger full scene reload/rerender by default.

16. AI generation draft-safety rule:
- AI-generated locations are draft suggestions and require human review before acceptance.
- AI generation must follow project allowlists/constraints (tilesets, object classes, mapping policy).
- No direct production overwrite/publish path is allowed for AI output in MVP.
- AI generation inputs/outputs must be versioned and auditable for reproducibility.

17. Local-draft save safety rule:
- MVP editor `Save` writes to local drafts by default (not direct production publish).
- Production catalog visibility is role-gated and enforced on backend endpoints.
- Unauthorized users must never receive production area list data from backend.

18. Stage branch rule:
- Repository stage branches are `dev` and `prod`.
- Day-to-day implementation work targets `dev`.
- `prod` is reserved for stabilized release-ready state.
- `main` remains baseline/history branch unless explicitly redefined later.

## Test Applicability Policy

### Baseline (required for every feature)
1. Unit tests.
2. Regression smoke tests.

### Conditional tests (required only when applicable)
1. Performance benchmarks:
- Required for large or performance-sensitive features, hot paths, or algorithmic changes.

2. Integration tests:
- Required when a change spans multiple modules or crosses parser/resolver/transform/output boundaries.

3. Round-trip tests (`parse -> serialize -> parse`):
- Required when parser or writer logic is added or changed.

4. Golden corpus tests:
- Required when format behavior or output mapping is changed and stable reference files exist.

5. Differential parity tests vs Aurora:
- Required for Aurora behavior parity features or when behavior is uncertain and must be validated against source truth.

6. Visual regression tests:
- Required for rendering, map imagery, or UI-output changes.

7. Determinism tests:
- Required for generators, seeded logic, or any workflow that must produce repeatable output.

8. Compatibility matrix tests:
- Required for profile/build-specific behavior (for example EE vs legacy differences).

9. Fuzz/property-based parser tests:
- Required for new parsers, major parser refactors, or robustness fixes for malformed inputs.

### Completion rule
1. A feature is done only when all baseline tests pass and all applicable conditional tests pass.

## Test Location Policy
1. All automated tests are created under the repository root `tests/` directory.
2. Canonical test directories are:
- `tests/unit`
- `tests/regression-smoke`
- `tests/performance-benchmarks`
- `tests/integration`
- `tests/round-trip`
- `tests/golden-corpus`
- `tests/differential-parity`
- `tests/visual-regression`
- `tests/determinism`
- `tests/compatibility-matrix`
- `tests/fuzz`
- `tests/property-based`
3. New test files must be placed in the matching directory for their test type.
