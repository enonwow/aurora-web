# VFX retail RNG seed recoverability audit (2026-08-25)

## Scope and authorities

This audit asks whether the exact stochastic placement in the immutable native
row-28 MP4 can be reproduced from recorded process timestamps. It does not
authorize selecting a seed by visual similarity and does not select behavior by
VFX row, label, resref, file name, node name, fixture, tile, creature, or
placeable.

- Installed NWN:EE client:
  `C:/Program Files (x86)/Steam/steamapps/common/Neverwinter Nights/bin/win32/nwmain.exe`,
  SHA-256
  `3b7cb1252e0edb2ce22d7971f333aade027039ae30a45b4bc64732c3e6bec73a`.
- Immutable native MP4 SHA-256:
  `bdddeb001cf59bb2d6476909adc3b1d022674b06b59749f39fc11fc290dc31de`.
- Native process start:
  `2026-08-19T12:53:43.436049Z`.
- Windows Kernel-General event 12 records the proof workstation boot at
  `2026-08-19T10:28:01.5000000Z`.
- xoreos was not used.

## Static client findings

The retail random function at `0x140c7ed00` advances the MSVC-compatible
15-bit stream with `state = state * 0x343fd + 0x269ec3` and returns
`(state >> 16) & 0x7fff`. The seed entry is `0x140c7ed2c`.

A fresh `E8 rel32` scan found five direct seed-entry callers:

| Call site | Owning function | Seed source |
| --- | --- | --- |
| `0x14006cb11` | `0x14006c930..0x14006cb71`, adjacent to/export-owned by `CAurTriangleBin::BuildGrassPolys` | imported `KERNEL32!GetTickCount` |
| `0x14006cd38` | `0x14006cd0c..0x14006cd62`, tail inside the `CAurTriangleList::BuildGrassPolys` family | imported `KERNEL32!GetTickCount` |
| `0x14006cdd7` | `0x14006cda8..0x14006cf2e`, `CAurTriangleList::CreateTriangleGrass` | integer converted from source triangle/vector data |
| `0x14010872f` | `CMstNetLayer::CMstNetLayer`, `0x140108560..0x1401087e3` | product of values returned by internal runtime helpers |
| `0x1406e43c5` | client construction/bootstrap function `0x1406e3c80..0x1406e4aa6` | imported `KERNEL32!GetTickCount` |

All three indirect calls at `0x14006cb09`, `0x14006cd30`, and
`0x1406e43bd` resolve through IAT slot `0x140d7c950`, which PE import metadata
identifies as `KERNEL32.dll!GetTickCount`.

The grass builder therefore does not merely consume the process-start stream.
It reseeds the same CRT-compatible stream while an Area is being built and
then reseeds it again from the live system tick counter. Any subsequent VFX
particle draws depend on that later Area-build time plus every intervening
consumer of the shared thread-local stream.

## Historical timing boundary

The boot and process timestamps bound the bootstrap tick counter near
`8,741,936 ms` before constructor execution overhead. They do not recover the
later tick count at the final grass-builder reseed. The saved native packet
contains:

- the process start timestamp;
- the capture file creation interval;
- an inferred visual trigger frame;
- the single-trigger script and engine-log marker.

It does not contain:

- the return value of the final `GetTickCount` seed call;
- the RNG state after Area grass construction;
- the number or order of shared-stream draws before the VFX trigger;
- a memory snapshot of the retail RNG state.

Consequently the exact retail RNG state at the row-28 trigger is not
recoverable from the immutable evidence. Searching candidate seeds and choosing
the one whose pixels resemble the MP4 would be image fitting, not a recovered
Aurora semantic.

## Proof and implementation consequence

The fixture seed `523795` is a deterministic presentation seed. It is not a
recovered native seed and must not be described as an
`immutable-native-oracle-calibration-seed`.

Renderer parity may still be proved for deterministic, identity-neutral
semantics such as emitter topology, source event order, particle morphology,
material/blend behavior, model visibility, source-clock rate, and clean
post-roll. Exact per-impact world positions, aggregate peak centroid, and the
visibility endpoint of one stochastic replay cannot be required to equal the
immutable native replay unless both sides are bound to the same observed RNG
state.

This result does not permit weakening a visual verdict. A global side-by-side
may remain `BAD` when its stochastic layouts differ materially; it only
prevents diagnosing that difference as a renderer transform defect or hiding
it behind a fitted seed.

