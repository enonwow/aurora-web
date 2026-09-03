# VFX and decompilation audit remediation scope

Date: 2026-08-17

## Scope decision

This remediation addresses repository-local correctness and evidence hygiene
found by `vfx-and-aurora-decompilation-audit-2026-08-17.md`:

- repair the standalone VFX renderer test-origin drift;
- make the local P2P diagnostic deterministic without changing Aurora runtime
  product semantics;
- replace missing-file crashes in retail control gates with structured,
  fail-closed prerequisite reports;
- separate renderer eligibility from retail parity in the additive v1 FE-BE
  payload;
- add deterministic bound-session and blocked-legacy decompilation lineage
  manifests;
- update stale status documents and quarantine unadmitted xoreos records.

## Aurora-first classification

The test-origin, prerequisite-reporting, status-contract, lineage-record, and
documentation changes do not introduce a new Aurora runtime semantic. The P2P
diagnostic change controls fixture initial conditions and does not alter the
runtime implementation. Existing Aurora behavior remains governed by the
already documented reverse evidence and retail gates.

## Explicit exclusions

This pass does not fabricate or replace:

- any of the ten retail VFX evidence packs;
- fresh Aurora Toolset or NWN runtime captures;
- a new Ghidra export or its missing historical session metadata;
- exact camera, material, postprocess, RNG, collision, or cross-lane parity;
- a wholesale split of the large renderer and catalog service.

Those items remain follow-up work and parity stays blocked until their own
evidence gates pass.
