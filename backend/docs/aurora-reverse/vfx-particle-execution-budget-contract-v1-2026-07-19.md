# VFX Particle Execution Budget Contract v1

Date: 2026-07-19
Status: additive contract approved for implementation

## Endpoint

`POST /vfx/process`

The endpoint remains JSON and backward-compatible within its current major
version.

## Request

`runtime` gains:

```json
{
  "executionParticleBudget": 4096
}
```

Rules:

- integer;
- minimum `1`;
- maximum `65536`;
- default `4096`;
- applies per emitter runtime;
- protects server memory and work only;
- must not participate in Aurora family count equations.

The legacy request field `particleLimit` remains accepted. It is deprecated and
is not runtime evidence. During migration:

- `executionParticleBudget` wins when both fields are present;
- a legacy value below the default is raised to the default so historical
  `particleLimit: 64` replay packets no longer truncate canonical output;
- a legacy value above the default is retained as the execution budget;
- the runtime emits `VFX_LEGACY_PARTICLE_LIMIT_EXECUTION_BUDGET_ONLY`.

## Response

`aurora-vfx-emitter-runtime-state/v1` and
`aurora-vfx-emitter-runtime-snapshot/v1` gain additive fields:

```json
{
  "executionParticleBudget": 4096,
  "activeCapacity": 128,
  "freeCapacity": 16,
  "capacityGrowth": []
}
```

`capacityGrowth` entries contain:

- `list`: `active` or `free`;
- `previousCapacity`;
- `nextCapacity`;
- `requiredCount`;
- `changedAtClockSeconds`.

The deprecated response field `particleLimit` is retained as a compatibility
alias for the effective execution budget. It must never be labelled as an
Aurora particle limit.

When allocation reaches the execution budget, the state remains valid and
emits:

- `VFX_EXECUTION_PARTICLE_BUDGET_EXHAUSTED`.

The diagnostic must include the emitter identity and effective budget through
the surrounding runtime state and observability envelope.

## Cache key

The normalized cache key includes:

- effective `executionParticleBudget`;
- legacy `particleLimit` input when supplied, because it adds a migration
  diagnostic;
- runtime seed, step, tick count, animation, wind manager, source hashes, and
  existing dependency provenance.

This prevents a packet created under the old silent `64` cap from being reused
for the dynamic-capacity runtime.

## Payload and streaming

- no new binary payload;
- no new streaming lane;
- capacity-growth records are bounded by logarithmic list growth;
- maximum records per list are at most `13` for the allowed budget
  (`0 -> 16 -> ... -> 65536`);
- runtime frame payload budgets and existing endpoint request limits remain
  unchanged.

## Compatibility

- no field is removed;
- old clients may continue to send `particleLimit`;
- new clients should send only `executionParticleBudget`;
- response additions are optional to old clients;
- breaking removal of `particleLimit` requires a future major contract version.

## Security and diagnosability

- the server validates the maximum budget;
- budget exhaustion is fail-visible, not a silent spawn drop;
- the budget is deterministic and part of the cache key;
- no client value can create a claim about Aurora's canonical maximum particle
  count.

