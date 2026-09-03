# VFX and decompilation remediation implementation-plan scope

Date: 2026-08-17

## Decision

Create one ordered implementation plan from the second VFX/decompilation audit
and define independent completion gates for repository health, local VFX,
control-plane readiness, decompilation authority, retail evidence, live parity,
and release readiness.

## Aurora-first boundary

The plan does not authorize implementation of unknown Aurora runtime semantics.
Repository/control-plane and lineage hardening may proceed from confirmed local
defects. Retail behavior work starts only from an authoritative decompilation
packet or exact retail/Toolset/NWN evidence.

## Proof boundary

No live Toolset or NWN execution is part of planning. The live phase remains
blocked until a versioned profile binds the exact module, ordered HAK/resource
hashes, fixture identities, capture targets, artifact destination, and
validator route.

## Deliverable

`backend/docs/aurora-reverse/vfx-decompilation-remediation-implementation-plan-v1-2026-08-17.md`
