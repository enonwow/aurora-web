# ProgFX Type10 orientation-mode audit - 2026-08-17

## Decision

Retail Type10 `Param3` is copied into `CNWCProjectile+0x239`. Path style 4
reads that byte on every update. A missing table value defaults to zero, and
mode zero performs no dynamic orientation update. This admits the current Web
identity owner transform for mode zero while preserving the source model's own
node orientation.

Modes one and two select dynamic direction vectors, but the complete target
pointer identity and exact direction-to-orientation conversion have not yet
been recovered. Aurora Web must therefore reject modes one and two with a
structured diagnostic instead of carrying `orientationMode` while silently
using identity orientation.

## Source classification

- `sourceClass`: `retail-binary-disassembly`
- binary:
  `C:\Program Files (x86)\Steam\steamapps\common\Neverwinter Nights\bin\win32\nwmain.exe`
- bytes: `21071872`
- SHA-256:
  `3B7CB1252E0EDB2CE22D7971F333AADE027039AE30A45B4BC64732C3E6BEC73A`
- PE image base: `0x140000000`
- disassembler: Python `3.12`, Capstone `5.0.7`
- function bounds: retail `.pdata`
- xoreos: not consulted

The audit imported the repository's existing read-only `PeImage` and
Capstone helpers from `backend/scripts/audit-retail-light-function-disasm.py`.
It did not patch, launch, or instrument NWN.

## Recovered Type10 handler data flow

Function: `0x14096a9a0..0x14096aff0`.

| Address | Operation | Recovered meaning |
| --- | --- | --- |
| `0x14096aa1a` | `mov dword ptr [rbp+0x77], 0` | initialize `Param3` destination to retail default zero |
| `0x14096abb4..0x14096abc1` | pass `&[rbp+0x77]` to the integer table reader | parse `Param3` when present; missing value retains zero |
| `0x14096accc` | `movzx eax, byte ptr [rbp+0x77]` | narrow the parsed/default value to one byte |
| `0x14096acd0` | `mov byte ptr [rdi+0x239], al` | store orientation mode in the projectile |
| `0x14096afb0..0x14096afb6` | pass parsed `Param4` to `0x140987770` | select projectile path style independently of orientation mode |

The prior Type10 timing audit remains authoritative for `Param5=log` and the
integer-millisecond duration. This audit changes no timing formula.

## Recovered path-4 orientation branches

Function and continuation:
`0x1409845c0..0x1409848cb`.

The path update first calculates the current path-4 position. It then reads
the orientation byte:

```text
0x1409847a0  movzx eax, byte ptr [rcx+0x239]
0x1409847a7  cmp al, 1
...
0x1409847f2  cmp al, 2
...
0x140984823  test al, al
0x140984825  je 0x140984885
```

Observed branches:

- **mode 0:** jumps directly to the position setter at `0x140984885`; it does
  not enter the dynamic orientation conversion/setter lane;
- **mode 1:** builds a vector from the current projectile position toward the
  three floats reached through the object pointer at `projectile+0x228`;
- **mode 2:** builds a vector from the path start at
  `projectile+0x38..0x40` to the current projectile position;
- **other non-zero modes:** retain the precomputed path direction before the
  common magnitude and orientation-setter lane.

For a sufficiently non-zero vector, the common lane calls `0x140230920`, then
passes its result through projectile vtable slot `+0x120`. The precise
mathematical representation returned by `0x140230920`, the coordinate-system
mapping needed by the Web axis-angle contract, and the exact identity/lifetime
of the pointer at `+0x228` remain unbound. Modes one, two, and other non-zero
values are therefore not implementation-ready.

## Short-distance timing boundary

The proven log branch calculates:

```text
speed = 1.5 + 3 * logf(distance)
durationMilliseconds = trunc((distance / speed) * 1000)
```

The existing Web implementation converted a non-positive or non-finite speed
to a zero-duration trajectory. That guard is not present in the recovered
handler. For positive distances at or below `exp(-0.5)` (approximately
`0.60653066` metres), the denominator is zero or negative. The downstream
setter/lifecycle behavior for the resulting exceptional or negative integer
duration has not been audited.

Aurora Web must not invent zero-duration semantics for this region. It remains
fail-closed with `VFX_PROGFX_TYPE10_DISTANCE_TIMING_UNPROVEN` until the setter
and update lifecycle are recovered or a controlled retail oracle closes the
boundary.

## Admitted implementation boundary

The following correction is source-admitted:

1. add a structured Type10 trajectory-resolution result;
2. preserve `buildAuroraProgFxType10ProjectileTrajectory` as a compatibility
   wrapper returning the trajectory only for a ready result;
3. default absent `orientationMode` to retail mode zero;
4. admit only mode zero for the current path-4/log runtime;
5. reject missing runtime context, unsupported path/timing, non-finite
   positions, unproven orientation modes, and the unproven short-distance
   timing region with stable error diagnostics;
6. merge those diagnostics into the VFX package so renderer eligibility and
   render-contract status become `diagnostic_only` rather than silently
   presenting a stationary or misoriented effect;
7. keep the proven three-metre row181 result at `625 ms` unchanged;
8. do not change exact-end lifecycle semantics in this slice.

## Remaining proof gaps

- exact mode-one target-pointer ownership;
- exact `0x140230920` return representation and Web axis conversion;
- modes two and other non-zero values under matched retail fixtures;
- exceptional/negative duration behavior below the log-speed boundary;
- exact owner-active state at the integer-duration endpoint;
- matched orientation-visible Toolset/NWN and Web comparison.

These points remain `missing`; they are not inferred from the passing local
row181 fixture.

## Implementation result

The admitted boundary is implemented in:

- `backend/src/modules/vfx/domain/aurora-vfx-progfx-type10-projectile.ts`;
- `backend/src/modules/vfx/application/vfx.application.service.ts`;
- `backend/test/unit/aurora-vfx-progfx-type10-projectile.spec.ts`;
- `backend/test/unit/vfx.application.service.spec.ts`.

The compatibility builder still returns `undefined` for a blocked trajectory,
but the application now consumes the structured resolution and merges its
error diagnostic into the package. A blocked Type10 package reports both
runtime and render-contract status as `diagnostic_only`.

Verification:

- focused Type10/application tests: `50/50` passed;
- complete backend focused VFX suite: `21` suites / `359` tests passed;
- backend production build: passed;
- targeted mutation gate: `135` mutants instrumented, `66` killed, `1`
  timed out, `68` compile errors, zero survived, zero no-coverage, reported
  mutation score `100.00%`;
- local VFX diagnostic aggregate: `7/7` commands, `11/11` runtime cases,
  `3/3` capture-analyzer cases, `189/189` semantic checks, zero promotion
  attempts;
- strict retail parity gate: expected non-zero, `0/10` canonical fixtures and
  `10/10` blocked; this local correction does not claim retail parity.

The dedicated mutation configuration is
`backend/stryker.vfx-type10.config.json` with
`backend/jest.mutation.vfx-type10.config.js`.
