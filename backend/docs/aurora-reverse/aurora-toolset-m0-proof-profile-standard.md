# M0 static rigid proof profile standard

Status: `AREA_GEOMETRY_INVALID / M0 v5 PROOF BLOCKED`

Profile: `proof-profiles/m0-static-rigid-v5.json`

## Accepted identity

The route binds the existing exact module `m2a_m0_proof.mod`, Area resref
`m2a_m0proof_area`, and the ordered HAK list `znd_tortoise` then
`m2a_m0_proof`. Its exact native **Areas tree display text** is
`Meshy2Aurora M0 static runtime proof area`; that visible native identity is
separate from the resref and both are immutable queue requirements. It requires
the tortoise control at `(12,10)` with appearance row `15108` and Meshy M0 at
`(16,10)` with appearance row `15109`.

Run the central read-only preflight before any live lane:

```powershell
node backend/scripts/validate-aurora-m0-proof-profile.mjs --mode preflight
```

The profile validator checks the exact installed MOD and both HAK SHA-256
values. Identity is necessary but insufficient: the current exact M0 v5 input
is marked `area_geometry_invalid` from native Toolset evidence. A mismatch is
`failed`; no parameter substitution or disposable module is accepted for this
profile.

## Toolset and runtime gates

The Toolset proof uses the registered central session profile and captures the
validated Area `TScrollBox`. It is an immutable route: module, Area, queue,
and capture mode cannot be overridden. Artifacts must be written to a
caller-supplied destination; the profile never accepts a default temporary
directory as proof ownership.

First inspect the full central route without starting Toolset or reading a
module:

```powershell
node backend/scripts/aurora-toolset-session.mjs m0-dry-run --profile m0-static-rigid-v5 --outDir <caller-artifact-dir>
```

The central route rejects this exact v5 profile as `AREA_GEOMETRY_INVALID`
before Area capture or runtime proof, even if a caller tries to bypass the
normal `preflight` stage. It never asks a consuming project to provide a runner
or adapter.

## Native geometry gate

Every future M0 profile must supply a fresh
`aurora-m0-native-geometry-gate/v1` packet accepted by
`validate-aurora-m0-geometry-gate.mjs`. The gate requires native Toolset
evidence that the Area was saved, no `invalid locations` dialog, no
`Inaccessable Objects` dialog, the exact entry Area and entry coordinate on an
accessible surface, and a positive accessible-surface result for every named
fixture. GIT coordinate equality and an `8x8`/64-entry Tile_List are recorded
as diagnostic inputs only; they cannot close this gate.

The current v5 module cannot be renewed by running capture again. Correct the
generator/Area geometry, materialize a new immutable module hash and versioned
M0 profile, then run the native geometry gate before `TScrollBox` or runtime
work.

## Native Area-name incident — 2026-07-19

The first central live M0 run reached the exact module in one responsive
Toolset process, then stopped before Area selection because the queue had used
the resref as the native tree text. Direct Toolset readback established the
current native text as `Meshy2Aurora M0 static runtime proof area` while the
resref remains `m2a_m0proof_area`. The route now pins and separately validates
both values. The failed lane must not be repeated unchanged; resume only from
the open verified session with the corrected canonical queue.

## Capture-failure continuity — 2026-07-19

Native Area opening and visual capture are separate proof lanes. If the exact
`TScrollBox` capture reports uniform pixels, the Toolset visual proof is
`failed`; no `allow-uniform` override is permitted. The session manager first
persists `area_ready` and the native queue manifest, then writes
`m0-toolset-capture-blocker.json` and records the `m0_tscrollbox_capture` lane
failure before returning the capture error. The healthy Toolset process remains
open; the unchanged capture must not be retried.

For a capture that failed before this continuity behavior existed, do not
invoke capture again. Use the public, non-mutating reconciliation command with
the same immutable profile and caller artifact directory:

```powershell
node backend/scripts/aurora-toolset-session.mjs m0-reconcile-capture-failure `
  --profile m0-static-rigid-v5 `
  --outDir <caller-artifact-dir> `
  --captureError <verbatim-recorded-error> `
  [--captureEvidence <existing-evidence-path>]
```

It verifies the existing completed queue manifest (including resref and native
display name), the exact module state, and one responsive Toolset process. It
then records `area_ready` and the failed `m0_tscrollbox_capture` lane without
opening an Area, calling capture, or writing an accepted proof packet.

For AUR-S07, use only a user-provided capture packet validated by:

```powershell
node backend/scripts/validate-aurora-runtime-capture-ingestion.mjs --packet <packet.json>
```

The packet must bind the profile ID, exact module hash, Area, both fixtures,
runtime capture artifact, and engine-load log through SHA-256 hashes. The
validator ingests evidence only; it never launches NWN, changes settings, or
controls a desktop window.
