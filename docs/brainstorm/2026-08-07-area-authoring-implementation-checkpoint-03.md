# Area authoring implementation checkpoint 03

Date: 2026-08-07
Status: transaction foundation implemented; adapters and release proof missing

## Outcome

This checkpoint adds a fail-closed Area Create transaction coordinator behind
hexagonal ports. It is not wired to the legacy persistence route and does not
enable the incomplete native creation profile.

Implemented:

1. Versioned receipt, candidate, readback, journal, resource, module-state, and
   transaction domain contracts.
2. Explicit ports for `area.create` authorization, module-scoped lease/lock,
   idempotency reads, deterministic compilation, independent validation,
   staged storage, compensation/quarantine, and durable journaling.
3. Recomputed canonical command hash at coordinator entry. A caller-provided
   hash mismatch fails before idempotency lookup or authorization.
4. Two idempotency reads: a fast preflight and a second check under the module
   lock, preventing concurrent same-module retries from duplicating writes.
5. Locked module-state and strong `If-Match` revision checks before collision
   inventory or compilation.
6. Independent candidate validation before journal creation or storage writes.
7. Durable operation order:
   `journal begin -> hidden stage -> resource commit -> IFO commit -> independent readback -> atomic finalize`.
   IFO is never committed before ARE/GIT/GIC resources.
8. One atomic finalizer port that both retains the immutable idempotency result
   and marks the journal complete. The port contract forbids exposing only one
   half of finalization.
9. Failure compensation after any stage/write/readback/finalization failure.
   Verified restoration preserves the stable original failure code where
   applicable. Unverified restoration triggers module quarantine and
   `AREA_CREATE_ROLLBACK_FAILED`.
10. Exact diagnostics for journal, compensation, quarantine, scope, collision,
    revision, and readback failures. Error detail arrays and retained receipts
    are deeply immutable.
11. Idempotency result snapshots reject non-JSON values, non-finite numbers,
    and non-plain objects before retention.

## Verification

Current-source gates:

- command/idempotency/precondition plus transaction tests: 48/48 passed;
- focused backend Area suites: 9 suites, 100/100 tests passed;
- backend production build: PASS;
- checkpoint-path `git diff --check`: PASS;
- transaction coordinator mutation run:
  - 207 mutants instrumented;
  - 110 killed;
  - 4 survived;
  - 0 no-coverage;
  - 93 checker/runtime errors;
  - covered mutation score: 96.49%.

The four surviving coordinator mutations are behaviorally equivalent in the
current typed flow: two replace unreachable null fallbacks on a concrete stale
revision result, and two change temporary mutation flags that are necessarily
reclassified by the compensation boundary before escaping. No authorization,
lock, idempotency comparison, collision, commit ordering, readback decision,
compensation decision, quarantine decision, or atomic-finalization condition
survived.

The command/precondition/idempotency slice was previously measured at 96.59%
in checkpoint 02. Its later JSON-snapshot hardening has dedicated regression
coverage, but that combined three-file mutation score was not remeasured in
this checkpoint.

## Boundary and next work

The coordinator is currently an application foundation, not a runnable HTTP
feature. The next implementation slice must provide production adapters and
tests for:

1. distributed module lock with fencing and expiry;
2. durable journal plus atomic idempotency finalizer and crash recovery;
3. storage staging namespace, resources-first publication, exact baseline
   compensation, readback, and quarantine enforcement;
4. compiler adapter that uses only an immutable certified creation profile;
5. independent ARE/GIT/GIC/IFO validator adapter;
6. explicit `area.create` permission mapping and authorization matrix;
7. strict validation/create HTTP endpoints and stable AppException mapping;
8. frontend AreaCreationPort/facade adapter wiring.

The existing `/areas/editing/persist/new-area` path is still unsafe as a final
transaction implementation because it writes IFO before resources. It remains
blocked by the incomplete candidate validator and must not be presented as the
new contract. No Toolset, NWN, tile-matrix capture, or native proof was run in
this checkpoint.
