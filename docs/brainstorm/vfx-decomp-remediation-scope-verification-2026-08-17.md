# VFX and decompilation remediation scope verification

Date: 2026-08-17

## Verification boundary

This record verifies the repository-local remediation implemented from the
2026-08-17 VFX and Aurora decompilation re-audit. It does not convert local
renderer behavior into an Aurora retail-parity claim and does not treat source
contract tests as a real decompilation session.

## In scope

- immutable preservation of the effective starting tree;
- one versioned VFX artifact producer registry and dependency graph;
- registry validator, dry-run/execution bootstrap, and consumer migration;
- precise external-ingestion blocker propagation for all four current gates;
- versioned decompilation lineage v2 producer/validator boundary;
- legacy v1 authority revocation;
- Ghidra-side exporter source and source-contract tests;
- backend catalog VFX packaging boundary;
- frontend VFX claim-state normalization boundary;
- stable backend and frontend VFX unit commands;
- scoped build, unit, diagnostic, and control-gate verification.

## Deliberately unchanged

- Aurora retail emitter semantics, tolerances, and fixture truth;
- any Toolset module, Area, HAK ordering, model, or NWN runtime state;
- unrelated scene startup, coordinate, URL-origin, lock provenance, workspace,
  and runtime-settings behavior implicated by the existing full-suite failures;
- existing user changes outside the scoped files;
- quarantined GPL-secondary observations.

No Toolset/NWN operation was performed. Therefore no Toolset operating,
authoring, screenshot, capture, or live-proof artifact belongs to this change.

## Structural measurement

The immutable preimplementation snapshot and current source have these line
counts:

| File | Snapshot | Current | Delta |
| --- | ---: | ---: | ---: |
| catalog application service | 19,420 | 19,136 | -284 |
| canonical VFX renderer | 6,000 | 5,992 | -8 |
| new catalog VFX packaging boundary | 0 | 334 | +334 |
| new VFX claim-state boundary | 0 | 44 | +44 |

The touched monoliths shrink by 292 lines, but this is only two of seven
planned boundaries and does not meet the plan's 20% combined reduction gate.
The new modules intentionally add explicit interfaces, validation, and tests;
raw total-line reduction is not claimed.

## Evidence and acceptance

Accepted for this scope:

- both production builds pass;
- stable backend VFX aggregate passes 353/353 tests;
- stable frontend VFX aggregate passes 343/343 tests;
- local VFX diagnostics and registry validation pass;
- current retail gates stop as `blocked_external_ingestion` with all promotion
  fields false;
- v2 lineage tamper, cross-session, derived-count, graph, failure-ledger,
  relocation, legacy, and interrupted-session cases pass.

Not accepted as complete:

- full release baseline;
- a real Ghidra lineage packet;
- complete decompilation of any Aurora binary;
- ten retail evidence packs;
- mutation, performance, bundle, browser, or visual-regression closure for all
  seven refactors;
- live Toolset/NWN/Web retail parity.

## Scope conclusion

The implemented code closes the repository control-plane and self-attestation
design defects without guessing missing Aurora semantics. The remaining stops
are visible and semantic instead of path/parser failures. Release,
decompilation authority, and retail parity remain fail-closed until their
separate completion criteria are satisfied.
