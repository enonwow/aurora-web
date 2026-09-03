# Area authoring implementation checkpoint 04

Date: 2026-08-07
Status: durable control store and crash recovery implemented; transactional snapshot storage and product wiring missing

## Outcome

This checkpoint closes the durable control-plane slice for Area Create. It does
not enable the legacy mutation endpoint or claim production-safe blob
publication.

Implemented:

1. A documented MySQL schema and contract for module-scoped fencing leases,
   Area Create transaction journals, durable verified-readback receipts, and
   immutable idempotency results.
2. A database transaction boundary with explicit begin, commit, rollback, and
   connection release behavior, including rollback-failure aggregation.
3. A MySQL control-store adapter using row locks, exact recovery takeover,
   monotonic fencing tokens, compare-and-set journal transitions, atomic
   readback receipt retention, and atomic idempotency/final-state publication.
4. A behaviorally equivalent memory control-store adapter for deterministic
   unit, failure-injection, and recovery testing.
5. A byte-free candidate manifest. ARE/GIT/GIC/IFO payload bytes never enter
   the control database.
6. A complete journal policy with explicit blocking, recoverable, terminal,
   and absorbing-state semantics.
7. A recovery coordinator that scans expired recoverable transactions oldest
   first, takes over only the exact transaction, reverifies durable readback,
   finalizes verified success, compensates earlier/interrupted states, and
   quarantines an unprovable baseline.
8. Fail-closed handling for missing/corrupted journals, inconsistent receipt
   state, stale or mismatched fencing identity, unavailable recovery leases,
   failed verification, failed compensation, and failed quarantine recording.
9. Cross-realm JSON snapshot support for durable receipts while continuing to
   reject Date, class instances, spoofed plain objects, non-finite numbers,
   `undefined`, and other non-JSON values.
10. Exact diagnostics for every lease mismatch (`lock_missing`,
    `lease_id_mismatch`, `owner_transaction_mismatch`,
    `fencing_token_mismatch`, and `lease_expired`).

## Verification

Current-source gates:

- focused command/coordinator/recovery/control-store/database suite: 6 suites,
  131/131 tests passed;
- backend production build: PASS;
- recovery coordinator mutation: 77/77 mutants detected, 100%, zero survivors,
  zero no-coverage;
- idempotency and journal-policy mutation: 181/181 mutants detected, 100%,
  zero survivors, zero no-coverage;
- memory control-store mutation split into stable ranges:
  - range A: 80/80 detected, 100%;
  - range B: 122/122 detected, 100%;
  - range C: 128/128 detected, 100%;
  - combined: 330/330 detected, zero survivors, zero no-coverage.

Across this checkpoint's newly measured control-plane logic, 588/588 mutants
were detected. Six mutants timed out and therefore fail the mutation gate; no
mutant survived. The MySQL adapter has focused SQL/transaction unit tests but
has not yet received a separate mutation run or a live MySQL integration gate.

## Boundary and next work

The control plane cannot make ordinary mutable object-store writes atomic. A
production storage adapter must therefore publish an immutable revisioned
snapshot (or an equivalently strong manifest-pointer transaction) rather than
sequentially exposing ARE/GIT/GIC/IFO under live keys. The next slice must:

1. freeze the revisioned snapshot/staging/current-pointer contract;
2. prove the pointer compare-and-set and fencing relationship;
3. stage and hash every candidate resource plus the IFO baseline/candidate;
4. publish resources and IFO as one logical snapshot visibility change;
5. perform independent byte, manifest, and semantic readback;
6. compensate or quarantine every injected failure and process-death point;
7. adapt all Area readers to resolve only the committed snapshot revision;
8. only then wire compiler, validator, authorization, versioned HTTP, and the
   frontend facade.

The old `/areas/editing/persist/new-area` implementation still writes live
objects sequentially and IFO first. It remains non-production and must not be
used as evidence for atomic Area Create. No Toolset, NWN, renderer, connection
matrix, browser, or native proof was run in this checkpoint.
