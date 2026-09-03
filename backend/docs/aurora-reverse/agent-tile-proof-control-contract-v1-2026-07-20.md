# Agent Tile Proof Control Contract v1

## Purpose

`aurora-tile-agent-control` is a development-only, file-backed control plane
for Codex agents working on runtime tile contracts and proof capture. It has
no HTTP endpoint and no UI. Its job is to make the next safe action and every
proof rejection machine-readable without treating a contract sweep as visual
proof.

## Scope and non-goals

- It reads the existing runtime contract sweep artifacts and runtime capture
  frame artifacts.
- It may run one bounded, existing contract-sweep window only when invoked as
  `contract-next --execute`.
- It never starts Aurora Toolset/NWN, changes NWN settings, or changes an Area
  merely to improve a capture.
- It does not infer Aurora rendering semantics and does not promote contract
  readiness to visual parity.
- It is development-only and emits local JSON artifacts under
  `output/proof/agent-tile-proof-control` by default.

## Commands

Every command writes a stable JSON envelope to stdout. Secrets and access
tokens are never included.

| Command | Side effect | Result |
| --- | --- | --- |
| `status` | none | Current checkpoint, heartbeat freshness, grouped blockers, proof-gate counts, and one recommended action. |
| `gate --frame <frame.json>` | writes one gate artifact | Validates an existing runtime frame against the proof safety contract. |
| `contract-next` | none | Prints the bounded command plan for one contract-sweep window. |
| `contract-next --execute` | advances only accepted contract-sweep batches | Executes the existing sweep with a bounded batch budget, then emits updated status. |

## `aurora-agent-proof-gate/v1`

The gate accepts a frame only when every applicable check is true:

1. `status` is `captured`.
2. `strictVisualMode.status` is `passed`.
3. The requested runtime is fresh (`areaLoadEvidence.runtimeFreshnessOk`).
4. Both mutation settlement records, when present, are `ready`.
5. `areaPresentedFrameFence.status` is `ready`.
6. Terrain model status is `ready`, with zero pending, failed, and bridge
   tiles.
7. The exact runtime canvas PNG is present on disk.
8. A mutating scenario, when present, has `ok: true`.
9. Camera framing does not carry an unreviewed
   `runtime_bounds_outlier` decision.

Missing or unknown state rejects the gate. The gate writes a list of stable
rejection codes and never rewrites the original frame artifact.

`TERRAIN_FRAME_OUTLIER_REVIEW_REQUIRED` is emitted when complete settled
runtime terrain bounds exceeded the logical Area proof-profile limit and the
runtime retained the logical camera. This rejection does not claim the source
model is invalid. It prevents a raw automated frame from replacing the
independent visual review required by
`tile-add-connect-matrix-visual-review-and-framing-recovery-contract-v1-2026-07-29.md`.

## `aurora-agent-proof-status/v1`

The status response is bounded: blocker samples are grouped by code and
capped at 20 groups. A heartbeat is stale only when it is in an active phase
(`in_flight` or `responses_received`) and its timestamp exceeds the supplied
staleness budget. A stale completed/checkpointed heartbeat is historical, not
a worker failure.

Recommended actions are deliberately narrow:

- `resume_contract_sweep` for an incomplete or stale active sweep;
- `investigate_blockers` when source/contract blockers remain after completion;
- `capture_visual_proof` when contract coverage is complete but visual proof
  coverage is absent;
- `inspect_proof_rejections` when a captured frame fails a gate;
- `goal_complete_candidate` only when every contract and visual gate is
  accepted. This is still not a retail parity claim.

## Compatibility and provenance

The contract version is additive and local. It references existing artifact
schemas by path and records the source paths, timestamps, and generated gate
path. The command must be rerunnable: existing gate artifacts are replaced
atomically for the same frame path.
