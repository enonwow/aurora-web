# ProgFX Type 10 `log` timing correction audit (2026-08-13)

## Decision

The earlier Type 10 timing interpretation was incorrect. The retail client
does not sample RNG for the `log` branch. It computes a deterministic travel
duration from the source-to-target distance:

```text
speed = 1.5 + 3.0 * logf(distance)
durationMilliseconds = trunc((distance / speed) * 1000.0)
durationSeconds = durationMilliseconds / 1000.0
```

This correction applies to the shared ProgFX Type 10 path-4 owner. It is not
a row-181 calibration or a proof-fixture override.

## Source classification

- `sourceClass`: `retail-binary-decompilation`
- binary: `C:\Program Files (x86)\Steam\steamapps\common\Neverwinter Nights\bin\win32\nwmain.exe`
- SHA-256: `3b7cb1252e0edb2ce22d7971f333aade027039ae30a45b4bc64732c3e6bec73a`
- disassembler: local Python Capstone over the PE image
- xoreos: not consulted

## Recovered data flow

The Type 10 handler at `0x14096a9a0..0x14096aff0` first calculates the
source-to-target vector magnitude. The `Param5 == "log"` branch then executes:

| Address | Operation | Recovered meaning |
| --- | --- | --- |
| `0x14096af28` | call `0x1402303d0` | vector magnitude; the exported function is `magnitude(Vector const&)` |
| `0x14096af2d` | `movaps xmm6, xmm0` | preserve `distance` |
| `0x14096af30` | call `0x140c946b0` | single-precision natural logarithm helper (`logf`) |
| `0x14096af35` | multiply by `3.0f` | first speed term |
| `0x14096af3d` | add `1.5f` | complete deterministic speed |
| `0x14096af45` | divide distance by speed | duration in seconds before integer conversion |
| `0x14096af49` | multiply by `1000.0f` | seconds to milliseconds |
| `0x14096af51` | `cvttss2si` | truncate to an integer millisecond count |
| `0x14096afa8` | call `0x1409873c0` | store duration at projectile offsets `+0x194` and `+0x21c` |

The constants were read directly from the referenced retail image addresses:

- `0x140d83b88`: `3.0f`
- `0x140d82164`: `1.5f`
- `0x140d83ba4`: `1000.0f`

The callee at `0x140c946b0` is a scalar natural-log implementation. It accepts
the incoming distance in `xmm0`, performs exponent/mantissa reduction and a
logarithm polynomial, and returns the scalar result in `xmm0`. It does not read
or mutate an Aurora RNG state.

## Path-4 confirmation

The selector at `0x140987770` dispatches `Param4 == 4` through jump-table entry
`0x140987995`. That entry creates one path segment marked `0x400`, copies the
projectile target and integer duration, and then initializes the current
segment.

The path update at `0x1409845c0` reads duration from `CNWCProjectile+0x194` and
elapsed time from `CNWCProjectile+0x58`. Both integer millisecond values are
divided by `1000.0f` before the path position is evaluated. This confirms that
the Type 10 handler's integer result is a millisecond duration, not a movement
speed, tick count, or random seed.

## Three-metre oracle

For the exact row-181 source scene, the object-origin distance is `3.0` Aurora
metres. Float32 evaluation recovers:

```text
logf(3.0) = 1.0986123085021973
speed = 4.795836925506592
duration before truncation = 625.5425415039062 ms
retail duration = 625 ms
```

The current Web proof's `625 ms` owner duration is therefore numerically right
for this one distance, but only because its former proof calibration happened
to produce almost the same speed. The underlying random-speed contract is
wrong and diverges for other source-to-target distances.

The saved NWN validation reports four above-threshold frames at only
`8.308 fps`. Its `14.805..15.166 s` threshold window is a coarse visual
visibility interval, not evidence that the native owner duration is `361 ms`.
The disassembly-backed `625 ms` duration remains authoritative.

## Required implementation correction

1. Remove `randomUnit` and RNG provenance from the shared Type 10 runtime
   context.
2. Compute the deterministic float32 logarithmic speed from distance.
3. Preserve Aurora's integer-millisecond truncation before exposing seconds.
4. Keep one owner and path style 4; do not add row-specific timing factors.
5. Regenerate row-181 fixture evidence and compare it with the existing saved
   NWN MP4 without rerunning NWN.

