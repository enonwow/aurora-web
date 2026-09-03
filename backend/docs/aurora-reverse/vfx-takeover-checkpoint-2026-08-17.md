# VFX implementation and proof takeover checkpoint - 2026-08-17

Status: active continuation checkpoint  
Predecessor Codex thread: `019f5818-4b01-7f31-a7cc-ce273f90f352`  
Current audit: `codex-thread-vfx-full-audit-019f5818-2026-08-17.md`  
Branch: `codex/vfx-row216-aurora-first-20260812`  
HEAD: `348e8ff0e27677b7c611c56afa4d706685b393f0`

## Ownership statement

The current task has taken over the unfinished VFX implementation and proof
objective recovered from the predecessor thread. The objective remains active:
one source-backed graph/resolver/runtime/renderer for pure and
placeable-hosted VFX, followed by ten complete retail comparison packs that
pass the strict retail parity gate.

This checkpoint does not claim completion or parity. It binds the starting
state for the continuation and names the next safe slice.

## Rules and skill preflight

The continuation re-read and applied:

- the canonical project rules and repository/backend/frontend rules;
- `aurora-toolset-operate` contract `1.0.15`;
- `aurora-toolset-prove` contract `1.0.15`;
- the canonical Toolset operating standard and session workflow;
- the no-global-input runbook;
- the proof capture safety contract;
- the VFX proof standard;
- the Type10 primary reverse-audit records.

The canonical operating standard names a `powershell-command-runner` skill,
but that skill is not available in the current session's installed skill
catalog. Read-only PowerShell inspection therefore uses the smallest native
workflow. This limitation does not relax any Toolset, process-ownership,
capture, or proof gate.

## Effective filesystem checkpoint

The branch is dedicated to the VFX work, but the effective filesystem is not a
clean revision. At takeover:

- tracked/staged status entries: `282`;
- all status entries with untracked files: `52957`;
- untracked paths: `52677`;
- tracked binary-diff SHA-256:
  `38B9BB0693EF4D201A21CBA5171C29A564E25E0B2477E14E380A18ADB1B7F359`;
- untracked path-inventory SHA-256:
  `D268F6B8AF043D4A89EEAF0E15AE2C6D50CEEE87CDAA36ADBB76B7BC3731CD11`.

The untracked path digest binds names, not file contents. The snapshot is
therefore an operator checkpoint, not a reproducible source release. Product
and proof claims must continue to identify the effective filesystem and exact
artifact hashes until the work is separated into a controlled revision.

Critical starting-file identities:

| Path | SHA-256 |
| --- | --- |
| `backend/src/modules/vfx/domain/aurora-vfx-progfx-type10-projectile.ts` | `D9573908665751BE86C99D62FBC578E7DD4C2ACB9FE0606B6090B5B2337E8D0E` |
| `backend/src/modules/vfx/application/vfx.application.service.ts` | `473623E42655120834CF0A668E723D6B2EFEFAB47FF8686FBE5C1CA45FA4828D` |
| `backend/test/unit/aurora-vfx-progfx-type10-projectile.spec.ts` | `15A8EC17536514DE05D1C3BC4F86A23B1DD7AD0F65EE4936DA71FE960C35C09F` |
| `backend/test/unit/vfx.application.service.spec.ts` | `FAC95EA22C64B7E93ED475B9060BB54C88D881777A5A3D9668B4F8934660258E` |
| `frontend/src/modules/layout/adapters/three/auroraVfxCanonicalRenderer.ts` | `6C0EF0745A7EC472F850DAF65BE8E2B6535ED2807B6BB3C5387F541FFE7FA25D` |
| `frontend/src/modules/layout/adapters/three/workspaceObjectMeshLayer.ts` | `9CFAF3F5D02706D1AE8CC5BCA5D574CA657463FCC4B2626FCB0D2E3898ED4DD4` |
| `frontend/src/modules/layout/adapters/three/workspacePlaceableModelPresentation.ts` | `787B79D51A3D3935E192A63FEEA6F1424FF3D9FFE6E7A7BC24242C9F312FC893` |

## Toolset and NWN state

The canonical session `status` command and an independent process inventory
both found:

- `nwtoolset.exe`: zero processes;
- `nwmain.exe`: zero processes;
- persistent Toolset session state: absent;
- active module-load owner: absent.

Current proof classification:

- offline takeover preparation: `verified`;
- live Toolset mutation: `missing`;
- saved parser/native readback for a new retail run: `missing`;
- fresh visual proof for this effective snapshot: `missing`;
- rollback: `missing` because no live mutation was started;
- process closure: not applicable and not user-authorized;
- `modelVisibility=not_tested`;
- `proofCompleteness=missing`.

No live process may be started until a versioned VFX proof profile binds the
exact module hash, ordered HAK/resource identities, fixture, owner/target,
camera, one-trigger ledger, capture destination, and validator.

## Verification baseline inherited and rechecked by the takeover audit

- backend focused VFX: `21` suites / `353` tests passed;
- frontend focused VFX: `13` files / `343` tests passed;
- backend build: passed;
- frontend build: passed with large-chunk warnings;
- local diagnostic aggregate: passed, local-only and no promotion attempted;
- strict retail gate: expected block, `0/10` allowed and `10/10` blocked.

## Aurora-first classification of the next slice

The nearest bounded correctness gap is Type10 diagnosability. Existing primary
evidence proves one path-4 owner and the deterministic float32
`distance / (1.5 + 3 * logf(distance))` duration lane. It does **not** prove
the semantics of non-zero `orientationMode`, other path styles, or other
timing profiles.

The safe implementation boundary is therefore:

1. preserve the proven path-4/log/three-metre behavior;
2. reject non-finite positions before calculation;
3. expose structured diagnostics for absent runtime context and unsupported or
   unproven parameter combinations;
4. keep unproven orientation/path/timing behavior fail-closed;
5. add tests before implementation;
6. do not tune the trajectory from row181 visibility thresholds;
7. do not launch NWN or consume another one-trigger allowance for this local
   contract slice.

After that slice passes focused and aggregate local gates, the next proof step
is preparation of one versioned retail fixture profile. Existing saved NWN
MP4s remain immutable and reusable; a second NWN trigger is not authorized by
this checkpoint.

## Continuation update: Type10 diagnosability slice

The first takeover slice is complete. A fresh retail-binary audit recovered
the `Param3 -> CNWCProjectile+0x239 -> path-4 update` data flow and established
that missing `Param3` defaults to zero while mode zero performs no dynamic
orientation update. Non-zero orientation modes remain fail-closed because the
exact retail direction-to-orientation conversion is not yet bound.

The runtime now emits structured error diagnostics for missing Type10 context,
unsupported path/timing, unproven orientation modes, non-finite positions, and
the unproven non-positive log-speed distance region. Focused tests, the backend
VFX suite, backend build, targeted mutation gate, and local VFX aggregate all
pass. The strict retail result correctly remains `0/10`.

Durable source and verification record:
`vfx-progfx-type10-orientation-mode-audit-2026-08-17.md`.

Next safe step: bind one exact required retail fixture to a versioned proof
profile. No Toolset or NWN process has been started and no additional NWN
trigger has been authorized or consumed.

## Continuation update: row-68 strict proof preflight

The first strict retail fixture is now bound to
`proof-profiles/vfx-row68-retail-dm-proof-blocked-2026-08-17.json`. The profile
records the exact row/table/model hashes, immutable module identity, the
59-entry ordered-HAK identity, requested DM invocation, owned capture-pack
destination, validators, saved NWN oracle, Web v22 packet, and explicit proof
blockers. All eight referenced artifact hashes pass readback verification.

The preflight found a constructor boundary that must not be hidden:

- the canonical required fixture invokes `dm_visualeffect 68 0`;
- the saved single-trigger NWN MP4 invokes scripted
  `EffectVisualEffect(VFX_IMP_HEALING_M)` on the first PC;
- both use row 68, but they are not the same exact runtime input;
- the saved MP4 remains a valid scripted row-68 diagnostic oracle and is not
  promoted to the DM capture lane.

The retail manifest now points at the latest Web v22 creature-native head
attachment evidence rather than the older v7 playback. The dedicated retail
parity unit gate passes `47/47`. The strict validator returns the required
controlled block: `0/10` canonical, `10/10` blocked, with row 68 missing the
retail build, exact parser/resolver/runtime/render packet, exact capture, and
comparison. The evidence-pack dry run likewise reports zero ingestible packs
and zero canonical-promotion attempts.

No Toolset or NWN process was started. The next safe proof action is an exact
DM retail evidence ingestion/capture packet through the approved guarded or
user-provided workflow; Web-only evidence cannot close that lane.
