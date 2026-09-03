# Area Create durable control-store contract v1

Status: implementation contract; no Aurora runtime semantic is asserted here.

## Purpose

The Area Create control store coordinates writers independently of blob
storage. It owns module-scoped fencing leases, durable transaction journals,
immutable idempotency results, and the recovery admission rule. Resource bytes
remain in the staging/blob adapter; the database stores only bounded manifests,
hashes, keys, states, and diagnostics.

## Tables

### `area_create_module_locks`

One row per `module_id`:

- nullable `lease_id` and `owner_transaction_id`;
- monotonic `fencing_token` incremented on every successful acquisition or
  recovery takeover;
- `lease_expires_at` and `updated_at` in UTC with millisecond precision.

Every journal and blob mutation carries `(module_id, lease_id, fencing_token)`.
Adapters reject a stale tuple even when its process is still running.

### `area_create_transactions`

One immutable-identity row per `transaction_id` with module, actor,
idempotency key, command/profile/SET/draft hashes, expected revision, lease and
fencing identity, current journal state, bounded candidate manifest, timestamps,
bounded diagnostic JSON, and a nullable immutable verified-readback receipt.
Candidate resource bytes are prohibited. The receipt and the transition from
`ifo_committed` to `readback_verified` are one atomic write; an ordinary state
transition cannot create `readback_verified` without its receipt.

Terminal states are `complete`, `compensated`, and `quarantine_required`.
Every other state is recoverable and blocks a normal writer after lease expiry.

### `area_create_idempotency`

Primary key `(module_id, idempotency_key)` stores the lowercase command hash,
immutable JSON receipt, creation time, and expiry. Retention is at least 24
hours. Expiry cleanup never deletes a row whose transaction is not terminal.

## Acquisition and fencing

Acquisition is a single database transaction with a `SELECT ... FOR UPDATE` on
the module lock row.

1. A missing or released row grants a new lease and increments/initializes the
   fencing token.
2. An unexpired lease denies every competing acquisition.
3. An expired lease with no unresolved journal may be replaced by a normal
   writer, incrementing the fencing token.
4. An expired lease whose owner has a non-terminal journal denies normal
   writers.
5. Recovery may take over only when it names that exact owner transaction ID;
   takeover increments the fencing token.
6. Release succeeds only for the exact lease ID and fencing token. A stale
   release is a no-op and cannot clear a newer lease.

The initial lease duration is 30 seconds. Any future renewal API must preserve
the same fencing identity and may update only an unexpired currently-owned
lease.

## Journal invariants

- `begin` inserts exactly one transaction row and requires a currently owned,
  unexpired matching lease.
- transitions follow the allowed state graph and use compare-and-set on the
  current state and fencing identity;
- repeated transition to the same state is idempotent;
- backward, skipped publication, or cross-transaction transitions fail closed;
- diagnostics are bounded to 100 entries and 1,024 UTF-8 characters per entry;
- the candidate manifest lists only extension, resource type, object/staging
  keys, byte size, and SHA-256.

## Atomic finalization

`finalize` runs in one MySQL transaction and locks both the journal and module
lease rows. It verifies the current lease/fencing tuple and
`readback_verified` state, inserts the immutable idempotency result, changes the
journal to `complete`, and commits. A duplicate key with a different command
hash or receipt rolls back. The idempotency row and `complete` state can never
become visible independently.

## Crash recovery

Recovery lists non-terminal journals whose lease is expired, oldest first. It
must acquire the module lock with `recoveryOfTransactionId` equal to the exact
journal owner before inspecting staging/blob state. Normal creates remain
blocked until recovery reaches `compensated`, `complete`, or
`quarantine_required`. `quarantine_required` remains write-blocking until an
explicit audited administrator recovery changes the module state.

## Diagnostics and tests

Required tests cover concurrent acquisition, expired clean takeover,
unresolved-journal denial, exact recovery takeover, stale release, monotonic
fencing, invalid journal transitions, byte-free bounded manifests, atomic
finalize success/rollback/idempotent replay/conflict, and recovery ordering.
Control-store logs use the Area Create observability contract and never place
module, transaction, actor, key, or hash values in metric labels.
