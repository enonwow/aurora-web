# Area Create transaction observability contract v1

Status: implementation contract; it does not constitute native Aurora proof.

## Scope

Every Area Create attempt emits low-cardinality lifecycle events while keeping
actor IDs, module IDs, command IDs, hashes, object keys, and transaction IDs in
structured trace fields rather than metric labels. Logs must never include
authorization credentials, full request bodies, resource bytes, or local
filesystem secrets.

## Correlation fields

Every event carries `requestId`, `clientCommandId`, `transactionId` when
allocated, `moduleId`, `actorId`, `idempotencyKeyHash`, `commandHash`,
`expectedModuleRevision`, `profileId`, `profileFingerprint`, `setFingerprint`,
`draftRevision`, `draftHash`, `codeRevision`, `stage`, `outcome`, and
`durationMs` when settled. Sensitive identifiers may be independently hashed
according to the deployment policy.

## Ordered stages

1. `normalize`
2. `idempotency_resolve`
3. `authorize`
4. `lock_acquire`
5. `revision_check`
6. `collision_check`
7. `source_resolve`
8. `compile`
9. `candidate_validate`
10. `stage_resources`
11. `commit_resources`
12. `commit_ifo`
13. `readback`
14. `idempotency_store`
15. `complete`
16. `compensate`
17. `quarantine`

Allowed outcomes are `started`, `succeeded`, `replayed`, `rejected`, `failed`,
`compensated`, and `quarantined`. A stage cannot be reported `succeeded` until
its postcondition is verified. A create cannot emit `complete/succeeded` before
independent committed readback and immutable idempotency-result storage.

## Stable events and metrics

- `area_create_stage_started`
- `area_create_stage_settled`
- `area_create_idempotency_replayed`
- `area_create_idempotency_conflict`
- `area_create_revision_conflict`
- `area_create_candidate_rejected`
- `area_create_compensation_started`
- `area_create_compensation_settled`
- `area_create_module_quarantined`
- `area_create_completed`

Metrics use only `stage`, `outcome`, `errorCode`, `storageKind`, and
`creationProfileClass` as bounded labels. Required counters/histograms are
`area_create_attempts_total`, `area_create_stage_duration_ms`,
`area_create_failures_total`, `area_create_idempotency_replays_total`,
`area_create_revision_conflicts_total`, `area_create_compensations_total`, and
`area_create_quarantines_total`.

## Error mapping

Every rejection/failure event carries one stable public Area Create error code
plus a bounded internal reason code. Raw exception text is diagnostic-only and
must not replace the stable code. Idempotency conflict and revision conflict
events must prove `mutationStarted=false`. Compensation records list the exact
owned objects restored/removed and the result of independent restoration
readback.

## Release gate

Before persistence is enabled, tests must prove ordered emission for success,
replay, payload conflict, stale revision, candidate rejection, each injected
write/readback failure, successful compensation, and quarantine after failed
compensation. High-cardinality trace fields must not appear as metric labels.
