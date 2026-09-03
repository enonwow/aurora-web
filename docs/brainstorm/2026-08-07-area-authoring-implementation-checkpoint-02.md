# Area authoring implementation checkpoint 02

Date: 2026-08-07
Status: implementation in progress; not a release or native-parity claim

## Outcome

This checkpoint freezes and implements the mutation-free Area Create command
boundary that must precede the transaction coordinator. It does not enable the
legacy persistence endpoint and does not claim that the incomplete new-ARE
profile is production-safe.

Implemented:

1. Additive Area Creation section in the canonical FE-BE contract v1:
   profile query, dry validation, create, strict `area-create-command.v1`,
   mandatory strong `If-Match`, mandatory `Idempotency-Key`, explicit
   `area.create`, stable errors, and ordered transaction/readback semantics.
2. Strict command parsing at every object boundary. Unknown fields and an
   unsupported schema version are rejected.
3. Independent `Name`, normalized lowercase `ResRef`, and independent `Tag`.
4. Complete dense row-major tile validation with exact cardinality and all ten
   typed Aurora tile fields.
5. Structural group-instance validation: deterministic normalization, unique
   identities, unique/in-bounds/non-overlapping cells, and stable sort order.
6. Canonical recursively key-sorted JSON and lowercase SHA-256 command hash.
   Equivalent object/group ordering produces the same hash; material changes
   produce a different hash.
7. Strong ETag precondition checking with separate results for missing or
   malformed headers, body/header mismatch, and a stale locked-current module
   revision.
8. Bounded, non-trimmed idempotency keys and immutable retained results scoped
   to `(moduleId, key)`. Same hash replays; a different hash conflicts; a
   repository scope mismatch fails closed.
9. Area Create transaction observability contract with ordered stages,
   low-cardinality metric labels, correlation fields, compensation, and
   quarantine requirements.

## Verification

- New contract tests: 25/25 passed.
- Focused backend Area verification: 8 suites, 77/77 tests passed.
- Backend production build: PASS.
- Focused mutation run across command validation, revision preconditions, and
  idempotency: 352 mutants instrumented; 198 killed, 7 survived, 147 checker or
  runtime errors; covered mutation score 96.59%.
  - command validation: 96.15%;
  - idempotency: 97.14%;
  - revision preconditions: 100.00%.
- The seven survivors are limited to equivalent defensive branches for
  primitive/null handling inside canonicalization/deep-freeze helpers. No
  payload-admission, dense-grid, group, ETag, scope, or hash-comparison
  condition survived.
- `git diff --check` for the checkpoint paths: PASS.

## Safety boundary

The new types and pure functions are not yet wired to a mutation endpoint.
That is intentional. The next slice must add ports and a coordinator for:

1. immutable idempotency lookup/storage;
2. module-scoped lock acquisition;
3. locked revision recheck;
4. collision inventory;
5. in-memory compile plus independent candidate validation;
6. stage/journal/commit ordering that never publishes IFO first;
7. independent committed readback;
8. exact compensation and module quarantine;
9. `area.create` authorization and HTTP mapping.

The current app-generated six-root-field ARE remains rejected by
`AREA_CREATE_CANDIDATE_INVALID` before storage mutation. No Toolset, NWN,
matrix capture, or live proof was run in this checkpoint.

## Remaining release blockers

- complete immutable native creation profile and evidence closure;
- decoded/certified GIC profile and strict parser closure for enabled scope;
- transaction coordinator, durable storage adapters, failure injection, and
  process-death recovery;
- explicit `area.create` permission mapping and authorization matrix;
- v1 HTTP validation/create endpoints and frontend adapter/facade wiring;
- clean full backend/frontend/regression baselines;
- full tile matrix, PathConnect/WOK, Toolset Save/Build, and NWN runtime proof
  on one immutable candidate.
