# Asset-identity-neutral VFX calibration scope

Date: 2026-08-21

## Decision

Aurora Web runtime, renderer, preview, proof, loader, authoring, and export
behavior must not be selected by a concrete asset identity. This includes VFX
constants and rows, 2DA rows, resrefs, filenames, fixture IDs, catalog IDs,
template identities, and module object identities. The rule applies equally to
VFX, tiles, creatures, placeables, doors, items, sounds, Areas, and future
asset classes.

Exact identity checks remain valid for validation, provenance, cache isolation,
authorization, proof-target binding, and test assertions. They must not choose
rendering, timing, transforms, materials, lighting, animation, parsing,
serialization, or fallback behavior.

Behavioral variation must be supplied through source data or a typed,
versioned, evidence-bound profile consumed by generic code. Missing semantics
remain explicit missing or blocked state; they do not admit a per-asset
workaround.

The canonical rule is recorded as Core Rule 35 in
`C:\Projects\ai-documentations\aurora-web\rules\README.md`.

## Current refactor

The row-28 comparison path previously selected additive radiance and bloom by
comparing `fixtureId` with `vfx-nwn-web-row28`. The comparison runner now reads
both values from the manifest's `nativeOracleCalibration` record. It also reads
the runtime-frame materialization policy from `renderProfile` instead of
selecting the policy by fixture identity.

The row-28 camera and viewport profile was also removed from the runner's
fixture-ID branch and moved into the fixture manifest. The runner validates and
consumes the manifest profile generically. The remaining row-28 string in the
runner belongs only to the route allowlist, which is target validation rather
than behavior selection and is explicitly permitted by Core Rule 35.

The generic resolvers require valid finite values and evidence provenance.
Missing or invalid calibration data falls back to neutral behavior: no additive
radiance override, the default retail bloom multiplier, and eager frame
materialization.

The unit contract uses two arbitrary evidence-bound calibration records with
different values. This proves that values, rather than asset names, drive the
same code path.

## Aurora-first classification

This refactor introduces no new Aurora runtime semantic and does not alter the
accepted row-28 calibration values. It changes only how those already measured
values enter the generic renderer path. No xoreos source or semantics were
used.

## Proof boundary

The accepted v5d row-28 packet remains immutable historical evidence for its
recorded source hashes. Because this refactor changes the comparison-runner
source identity, that packet must not be presented as fresh proof of the new
source state. A later runtime comparison requires a new versioned proof profile
and fresh guarded capture; this refactor makes no new live-proof claim.

## Verification

- TDD red state: the focused runner test failed on the previous fixture-ID
  radiance and bloom selection.
- Focused comparison-runner unit contract: 53 passed.
- Focused VFX/layout unit gate: 367 passed.
- Frontend regression smoke gate: 78 passed. Existing React `act(...)`
  warnings remain warnings and did not fail the gate.
- Frontend production build: passed. The existing large-chunk warning remains.
- JSON parsing: the row-28 and broad-AOE fixture manifests parse successfully.
- Source inspection: `vfx-nwn-web-row28` remains in the comparison runner only
  as an allowed route identity; it is absent from behavior-selection
  conditionals.
