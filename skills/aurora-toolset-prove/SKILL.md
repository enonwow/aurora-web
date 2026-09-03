---
name: aurora-toolset-prove
description: Capture, validate, audit, and report live proof for Aurora Toolset, NWN runtime, module/Area changes, renderer parity, and Aurora standard stage completion. Use whenever the user asks for evidence, screenshots/video, validation, proof packets, completion status, rollback confirmation, stage closure, Toolset-to-NWN testing, or investigation of failed/blank/placeholder tiles or models. Pair Toolset control with aurora-toolset-operate.
---

# Prove Aurora Work

Treat proof as an independent acceptance test, not an illustration of a command
that already appears successful.

Skill suite contract: `1.0.15`.

## Load proof policy

1. Use `$aurora-toolset-operate` for any Toolset/NWN process or window action.
2. Resolve the standard root from `AURORA_STANDARD_ROOT`; otherwise use
   `C:\Projects\aurora-web`.
3. Read completely:
   - `backend/docs/aurora-reverse/aurora-toolset-operating-standard.md`
   - `backend/docs/aurora-reverse/proof-capture-safety-contract-2026-07-10.md`
4. Read [references/proof-routing.md](references/proof-routing.md).
5. Read the applicable runner standard, function standard, schema, manifest,
   and validator before capture.
6. Bind the run to a versioned proof profile. The profile must declare the
   module policy and hash, ordered HAK hashes and resource identities, fixture
   rows/positions, exact capture target, and owned artifact destination. CLI
   option support is not authorization for a new profile or parameter set.
   Without this profile, mark the proof point `missing` and do not start live
   mutation.

## Separate execution from observation

- Let the controller reach and read back the requested state.
- Let the Aurora Eye or exact capture hook observe it independently.
- Do not let screenshot success replace native state readback.
- Do not let parser success replace visual inspection.
- Do not move, hide, delete, or replace scene objects to improve framing.
- Do not infer a fallback, a loaded custom model, or a renderer result from a
  selected dropdown, dialog mini-preview, user screenshot annotation, or an
  agent's description. Treat those only as leads for a read-only check.
- For a Toolset model verdict, select and independently read back the exact
  Area object, then capture the fresh validated `TScrollBox`. `Focus on
  Object`, Properties, framing, and camera changes are optional diagnostics;
  they are never proof or acceptance prerequisites. Without exact object
  identity and selection readback, retain the image as observational evidence
  and finish the same candidate's proof; do not create another iteration.

For a proof depending on HAK content, require the authoring ledger to show
`saved_verified`: exact ordered HAK list, native rebuild settled, saved module
identity/hash, and no build/error modal. `selected`, `added`, or
`rebuild_running` are execution states, never proof-ready states.

## Capture accepted evidence

1. Record the requested module/hash, Area/object identity, source context,
   expected state, runtime freshness, and skill source/version.
2. Confirm exactly one responding owned process and the proof monitor.
3. Confirm the requested state is fully settled.
4. Confirm zero unexpected recovery, Access Violation, focus, loading, or error
   modals.
5. Confirm model, texture, renderer, and tile contracts are ready. Pending,
   partial, unknown, fallback, placeholder, or failed resources block proof.
   For an Appearance/HAK model, retain the resource-resolution chain: ordered
   HAK hashes -> exact 2DA row -> model resource identity -> saved creature
   field -> fresh `TScrollBox` observation. A break in that chain is `missing`
   or `failed`, never a geometry-edit request.
6. Capture through the exact Toolset hook, validated target control, or direct
   CDP `Page.captureScreenshot` required by the canonical contract. An Area
   proof requires the validated `TScrollBox`; a full-frame image produced by
   z-order manipulation is observational only and cannot close a proof point.
7. Save the exact PNG/MP4 path and accompanying JSON/manifest in the
   profile-owned artifact destination; do not rely on a runner default.
8. Inspect the artifact visually.
9. Run the canonical validator.

### Close proof processes after durable evidence

When the user or consuming-project rules authorize post-proof cleanup, close
the proof-owned Toolset/NWN processes through the model proof coordinator's
public `cleanup` command once the last required live screenshot, capture JSON,
log slice, and packet are durably written and identity-bound. It attempts the
graceful close first and uses `aurora-toolset-operate`'s exact PID plus
StartTime force fallback only after a bounded failure. Require zero-process
readback. Offline visual verdict, validation, and packet assembly may finish
after live capture, but cleanup remains outside the proof SLO. Do not close
Toolset after its capture while that session is still needed to start or bind
the NWN runtime observation.

Always run the public `cleanup-dry-run` first. After Test Module, it may admit
the exact accepted post-runtime state where NWN is already closed and the
proof-owned Toolset retains its hidden non-dirty `TfrmFrame` under the ready
PID/StartTime while one iconic `TApplication` remains visible. The admission
must rehash the accepted proof, bind the exact frame HWND/title/module/Area,
and reject any dirty window, modal, Access Violation, second process, or
identity drift. Cleanup then closes that exact session without restore, focus,
global input, or changes to the accepted proof.

An arbitrary desktop screenshot, visible canvas fallback, Playwright debugging
frame, or successful process exit is not accepted proof.

## Use the right proof path

- For one exact immutable model lineage that must proceed from Toolset to NWN
  under a measured two-minute proof-ready SLO, use
  `$aurora-model-proof-120s`. Its coordinator owns selection, capture,
  nonblocking Test Module, runtime observation, log binding, verdicts, and the
  final packet. Do not reproduce that sequence from leaf atoms.
- Select the current proof entrypoint, capture hook, and validator from
  [references/proof-routing.md](references/proof-routing.md) and the mapped
  function standard. Treat each route's declared deadline as a hard failure
  boundary, not a discovery budget; the exact model-proof route uses the
  120,000-millisecond monotonic deadline defined by its own standard.
- The central fast module runner is authorized only for its declared M6 profile.
  It does not authorize M0, an ordered multi-HAK list, multiple fixtures, an
  exact existing module, or runtime proof unless a dedicated central profile
  and atom declare those requirements.
- For browser renderer iteration, use the persistent browser only as a
  debugging aid. Produce the exact fresh capture artifact required by the proof
  safety contract before acceptance.
- For NWN runtime behavior, require the task-appropriate runtime state,
  log/video/readback, and exact module/Area identity. A Toolset save alone is
  not runtime proof.

Treat a consuming project's `reference-only` boundary as applying to product
code, assets, fixtures, product validators, and runtime dependencies. It does
not prohibit the shared Aurora operating skill, canonical proof runner, or
verified native proof atoms. Use that central tooling directly, record the
central runner/atom in the proof manifest, and do not create or require a
project-local Toolset runner, proof runner, or UI adapter.

## Evaluate the result

Use only:

- `verified`: every required artifact exists, is fresh, visually correct, and
  passes its validator;
- `failed`: evidence proves the wrong result, unexpected delta, placeholder,
  blank tile/model, modal failure, or validator rejection;
- `missing`: a required artifact or observation does not exist.

These three states describe `proofCompleteness`, not whether the model is
visible. Record a separate candidate-bound field:

- `modelVisibility=visible` when the bound visual observation shows it;
- `modelVisibility=not_visible` when the bound observation shows its absence;
- `modelVisibility=not_tested` when that environment was not observed.

Never use `missing` as a model-visibility result. The two axes are monotonic:
an incomplete later packet cannot erase an earlier bound `visible` result. A
new model/HAK/module iteration is admitted only by fresh Toolset or NWN
`modelVisibility=not_visible` plus a diagnosis and intended artifact delta.

Write a blocker manifest instead of a proof artifact when capture safety gates
do not pass. Include the exact failed gate, current evidence, and resume
condition.

Runtime proof remains `missing` until a central AUR-S07 execution atom or the
validated user-provided runtime-capture ingestion schema explicitly accepts the
required module, hashes, Area, fixtures, engine-load log, and capture evidence.

Do not call an Area complete because contracts loaded. Require visual coverage,
freshness, zero unexpected failed/bridge tiles, saved exact capture, and the
stage/function validator.
