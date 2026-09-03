# Aurora proof routing

Skill suite contract: `1.0.15`. Runner versions are independent; use the
runner's contract tests, not a version-string comparison, for compatibility.

Resolve `AURORA_STANDARD_ROOT`, falling back to `C:\Projects\aurora-web`.

## Core contracts

Read from `backend/docs/aurora-reverse`:

- `aurora-toolset-operating-standard.md`
- `proof-capture-safety-contract-2026-07-10.md`
- `aurora-eye-live-proof-runbook.md`
- `audit-artifact-policy.md`

## Toolset session proof

- Workflow: `aurora-toolset-session-workflow.md`
- Runner: `backend/scripts/aurora-toolset-session.mjs`
- Viewport proof: `backend/scripts/aurora-toolset-viewport-proof.mjs`
- Packet assembly: `backend/scripts/assemble-aurora-toolset-proof-packet.mjs`

## Exact model proof in Toolset and NWN (120-second proof-ready SLO)

- Skill: `skills/aurora-model-proof-120s/SKILL.md`
- Standard:
  `skills/aurora-model-proof-120s/references/model-proof-120s-standard.md`
- Public coordinator: `backend/scripts/aurora-model-proof-120s.mjs`
- Contract tests:
  `backend/scripts/test-aurora-model-proof-120s-contract.mjs`,
  `backend/scripts/test-aurora-toolset-test-module-nonblocking-contract.mjs`,
  `backend/scripts/test-capture-nwmain-proof-window-contract.mjs`

Use this route for a materialized, installed, immutable candidate when one
exact clean Toolset module and Area are proof-ready before the measured clock.
Preparation is reported separately. The coordinator performs one no-Save
Toolset capture and, after an accepted visible verdict, immediately performs
one same-lineage NWN runtime capture. It never requires Focus, Properties,
framing, camera changes, Save, Build, repack, retry, or a second Toolset.

## Fast module proof

- Standard: `aurora-toolset-fast-module-proof-runner-standard.md`
- Runner: `backend/scripts/run-aurora-toolset-module-proof.mjs`
- Offline tests:
  `test-aurora-toolset-module-proof-runner-contract.mjs`,
  `test-run-aurora-toolset-module-proof-dry-run.mjs`

This route is M6-only. Its frame capture is observational and cannot substitute
for an exact `TScrollBox` proof. Do not use CLI parameters to infer M0, ordered
multi-HAK, multiple-fixture, exact-existing-module, or runtime authorization.

## Function and stage proof

- Function manifests: `backend/docs/aurora-reverse/function-manifests`
- Roadmap:
  `aurora-toolset-usage-standards-roadmap-2026-07-14.md`
- Validators: locate the exact
  `backend/scripts/validate-aurora-toolset-*.mjs` matching the function.
- Final stage gate:
  `backend/scripts/validate-aurora-toolset-stage-completion.mjs --stage N`

## AUR-S07 runtime execution

- Standard: `aur-s07-runtime-execution-standard.md`
- Central atom: `backend/scripts/aur-s07-runtime-execution.mjs`
- Timed physical MP4 adapter:
  `backend/scripts/capture-nwmain-proof-video-no-global-input.mjs`
- Contract test: `backend/scripts/test-aur-s07-runtime-execution-contract.mjs`
  and `backend/scripts/test-capture-nwmain-proof-video-contract.mjs`

The atom arms and observes a user-owned Test Module action; it does not create
or permit a project-local NWN launcher/adapter. A runtime packet must pass its
fresh process, module/Area/entry, geometry, visible-model, capture, and engine
log gates.

The timed MP4 adapter does not start NWN. After the armed user-owned action it
records physical pixels from the exact owned `nwmain` client bounds while the
same PID, StartTime, HWND, visible-window set, sole non-primary monitor, and a
3x3 WindowFromPoint ownership grid remain stable. It sends no input, activation,
z-order, or geometry action and deletes a partial MP4 on any identity, modal,
geometry, monitor, or occlusion drift. The resulting H.264 MP4 remains an
AUR-S07 `runtime-capture` artifact rather than a new runtime route or packet.

## New module vertical slice

- Standard: `aurora-toolset-vertical-slice-standard.md`
- Central route: `backend/scripts/aurora-toolset-vertical-slice.mjs`
- Contract test: `backend/scripts/test-aurora-toolset-vertical-slice-contract.mjs`

Use `bootstrap-dry-run`, `bootstrap-create`, and `bootstrap-finalize` from the
central route to move from an absent caller-owned MOD destination to an
immutable profile. It composes central wizard/HAK/creature/geometry/runtime
atoms, rejects the M6 fast runner, and never accepts a local project adapter.
`bootstrap-create` does not claim proof; finalization requires a native
save/readback geometry gate before the central AUR-S07 runtime route.

## Offline binary module bootstrap

- Standard: `aurora-toolset-binary-module-bootstrap-standard.md`
- Central structural validator:
  `backend/scripts/validate-aurora-toolset-binary-module-bootstrap.mjs`
- Central native-geometry route:
  `backend/scripts/aurora-toolset-binary-module-native-geometry.mjs`
- Contract test:
  `backend/scripts/test-aurora-toolset-binary-module-native-geometry-contract.mjs`
  and `backend/scripts/test-toolset-explicit-open-startup-admission-integration.mjs`

This route consumes a caller-owned immutable ERF/GFF MOD profile and verifies
its serialized module/Area/HAK/entry/fixture bindings before the named central
native-geometry lane. That lane rejects a pre-existing/stalled Toolset PID,
opens at most one new session, and owns the requested module only from the
clean Welcome dialog: select `Open an existing Module`, then choose the exact
visible module-list entry through the verified native controls. It must start
`nwtoolset.exe` without a module argument. Its
`aurora-toolset-explicit-open-startup-admission/v3` first observes startup and
then permits exactly one selection only from an unowned Welcome/blank frame. A
conflicting MRU is not a reason to edit INI or accept the wrong module: if
automatic loading wins before that explicit ownership is read back, the route
fails closed and never sends `File > Open` afterwards. On Welcome, it binds the
verified `BM_SETCHECK → synchronous BM_CLICK → readback → posted OK` sequence
before accepting the module-list dialog. Only after exact
module ownership is verified may it bind the native Area display name and
resref, require accepted native Save plus entry/fixture surface evidence, and
emit the immutable geometry profile for TScrollBox/AUR-S07 input. It is not a
local Toolset adapter and does not authorize reuse of a stalled Wizard or
Build Module session.

For a cold model-proof preparation that finds `modules\temp0`, the same route
may alternatively own the requested module as
`verified_temp0_recovery`. This requires an
`aurora-toolset-verified-temp0-recovery-admission/v1` proving a complete,
one-to-one, byte-identical MOD-resource-to-cache-file set with no extra,
missing, non-file, duplicate-mapped, or reparse entries. The route revalidates
that admission immediately before sending one targeted non-destructive
`Yes`/`Tak` `BM_CLICK` to the exact known recovery prompt, then requires the
exact clean requested module frame. It does not archive or mutate the cache,
use global input, edit INI/MRU state, or fall through to `File > Open`. Contract
coverage is
`test-aurora-toolset-verified-temp0-recovery-contract.mjs`.

For the narrowly recognized v1 Welcome/MRU race, preserve the failed packet
with `restart-failed-startup-admission-dry-run` followed by
`restart-failed-startup-admission` on the same profile and artifact directory.
That archive-only transition is hash-bound, requires zero Toolset/NWN PIDs,
and is the only route from that failed packet to a fresh v2 `preflight`; it
does not claim Toolset, visual, or runtime proof.

If the v2 packet also records `unexpected_module_window_loaded`, preserve it
only through `restart-failed-v2-startup-admission-dry-run` followed by
`restart-failed-v2-startup-admission`. That route requires the bound v1
archive record and admits one v3 preflight without deleting either packet.
The v3 Welcome contract reads both `Open an existing Module` and `Start
normally`; an anonymous `TdlgProgress` immediately after the owned Welcome
transition is recorded as non-module startup work rather than an external
module owner.

## M0 static rigid profile

- Standard: `aurora-toolset-m0-proof-profile-standard.md`
- Profile and preflight: `proof-profiles/m0-static-rigid-v5.json` and
  `backend/scripts/validate-aurora-m0-proof-profile.mjs --mode preflight`
- Central Toolset route: `backend/scripts/aurora-toolset-session.mjs` with
  `--profile m0-static-rigid-v5`; inspect it first via `m0-dry-run` and run
  only its named `preflight`, `open`, and `run-queue` stages with a caller-owned
  `--outDir`.
- Historical capture-failure reconciliation (no new capture):
  `m0-reconcile-capture-failure --profile m0-static-rigid-v5 --outDir <dir>
  --captureError <recorded-error> [--captureEvidence <existing-path>]`
- Queue and Toolset packet validator:
  `proof-profiles/m0-static-rigid-v5-toolset-queue.json` and
  `backend/scripts/validate-aurora-m0-toolset-packet.mjs`
- Native Area geometry gate: `backend/scripts/validate-aurora-m0-geometry-gate.mjs`.
  A pinned MOD/HAK hash and syntactic GIT/Tile_List readback are insufficient;
  require accepted native save, entry-surface, and fixture-surface evidence
  before any viewport or runtime proof.
- Runtime ingestion: `backend/scripts/validate-aurora-runtime-capture-ingestion.mjs`
- Contract tests: `backend/scripts/test-aurora-m0-proof-profile-contract.mjs`
  and `backend/scripts/test-aurora-m0-toolset-route-contract.mjs`

## Browser renderer proof

Use persistent Playwright only for iterative debugging. Accepted proof must
still use the exact capture path required by
`proof-capture-safety-contract-2026-07-10.md` and record freshness plus all
renderer/model/texture readiness gates.

Never accept fallback canvas capture, partial evidence, a stale screenshot, or
a frame containing unexpected blank, failed, bridge, or placeholder tiles.

The shared Aurora operating skills, canonical proof runner, and verified proof
atoms are central operator tooling. Product-level `reference-only` rules do
not restrict their execution and do not permit a project-local proof runner or
UI adapter as a replacement.
