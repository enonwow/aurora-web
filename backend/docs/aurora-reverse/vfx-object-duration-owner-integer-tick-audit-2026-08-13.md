# Object-duration VFX integer tick audit - 2026-08-13

## Verdict

Aurora's `Type_FD=D` visual owner is not a continuous wall-clock schedule.
The client stores impact and cessation animation lengths as truncated integer
millisecond timers, processes a received VFX removal before the object's AI
update in the same client frame, and decrements those timers by that frame's
integer object delta. A timer transition consumes no overshoot in the next
phase.

This is a shared owner rule for object-duration VFX. It is not specific to
`visualeffects.2da#1`.

## Source classification

Primary Aurora runtime evidence only:

- static disassembly of the retail NWN Linux client;
- the existing retail row 1 model and single-trigger proof packet.

No xoreos source, comments, executable behavior, or implementation structure
were used. `sourceClass: secondary-gpl-reference` is not applicable.

## Audited client

- binary: `C:\Program Files (x86)\Steam\steamapps\common\Neverwinter Nights\bin\linux-x86\nwmain-linux`;
- SHA-256: `6D19C39BC646AF5DDBC333FF31797A4ACD9019506BCB45EF1B93B1BD5925E700`;
- ELF build ID: `3f0beeb9434ae21995d4b03c8b20989a3d09d132`.

The audit was static. NWN and Toolset were not started.

## Recovered contract

`CNWCVisualEffectOnObject::StartVisualEffect` at `0x81b4b0` multiplies the
source impact animation length by float `1000` and uses `cvttss2si` before
storing the owner timer (`0x81bb0f..0x81bb24`). The conversion truncates; it
does not preserve fractional milliseconds.

`CNWCVisualEffectOnObject::StopVisualEffect(int)` at `0x81bc80` does the same
for cessation (`0x81bd25..0x81bd48`). It also stores a post-removal timer equal
to the truncated cessation timer plus `3000 ms` (`0x81bd4d..0x81bd52`). When
cessation is absent, the post-removal timer is exactly `3000 ms`
(`0x81bf30..0x81bf44`).

`CNWCVisualEffectOnObject::Update(unsigned int)` at `0x81c0b0` compares each
non-zero owner timer with the current integer delta (`0x81c0ff..0x81c11e`):

- when `timer > delta`, it stores `timer - delta`;
- when `timer <= delta`, it clears the timer and performs the state transition;
- the excess portion of `delta` is not applied to a newly installed timer.

Impact state `1` selects looping duration state `2` at
`0x81c290..0x81c2c8`. Cessation state `3` marks the model owner done at
`0x81c255..0x81c283`.

`CNWCObject::UpdateVisualEffectsList` at `0x7e7d40` passes the object's integer
delta from offset `+0x58` into `Update` (`0x7e7e0e..0x7e7e16`) and removes a
done visual owner immediately after the update (`0x7e7e39..0x7e7dfc`).

## Same-frame packet order

The removal action `D` is handled in
`CNWCMessage::HandleServerToPlayerUpdateVisualEffects` at `0x7a0ea0`, reached
from creature and generic-object update handlers at `0x7a26f5` and
`0x7a69be`. It calls the object's deletion path, which invokes
`StopVisualEffect(1)`.

The retail client frame order is:

1. `CClientExoAppInternal::MainLoop` calls
   `CNetLayer::ProcessReceivedFrames(1)` at `0x658381`;
2. the network callback reaches
   `CClientExoAppInternal::HandleMessage` ->
   `CNWCMessage::HandleServerToPlayerMessage` -> game-object update -> action
   `D`;
3. `MainLoop` later calls `CClientAIMaster::UpdateState` at `0x65876b`;
4. `CClientAIMaster::UpdateState` invokes object `AIUpdate` through vtable slot
   `+0xf0` at `0x991ccf`;
5. creature and placeable `AIUpdate` invoke `UpdateVisualEffectsList` through
   vtable slot `+0x1a0` at `0x730bc9` and `0x7ebffb`;
6. `CClientAIMaster::UpdateState` then calls `CNWCModule::Update` at `0x991d4d`,
   so the newly selected duration or cessation animation participates in the
   scene update of that same frame.

Therefore the first duration/cessation frame is not a zero-time pose. The
current frame's scene delta already advances the newly selected animation.

## Row 1 consequence

For source cessation length about `633.333 ms`, Aurora stores `633 ms`. With a
deterministic `100 ms` replay update step and a removal processed at
`20,000 ms`:

- cessation is already `100 ms` into its animation on that output boundary;
- the timer has `533 ms` remaining;
- it reaches `33 ms` remaining at `20,500 ms`;
- the owner is marked done at the `20,600 ms` update boundary;
- the `3633 ms` post-removal timer completes at `23,600 ms`.

These times describe that deterministic replay step. Retail wall-clock proof
still requires its captured frame cadence and cannot be inferred from the
saved MP4's global pixel-difference threshold.

## Implementation boundary

The implementation may now globally:

- truncate source impact and cessation lengths into integer owner timers;
- process requested removal before the matching owner update boundary;
- consume that update delta immediately in cessation;
- transition only on update boundaries and discard timer overshoot;
- expose remaining owner and post-removal timers in telemetry.

It must not claim exact retail frame alignment unless the proof binds the
actual removal packet and object update cadence. The saved row 1 NWN recording
remains the visual oracle and must not be replayed or retriggered for this
code change.

## Implemented runtime and fresh proof

Aurora Web now exposes
`aurora-object-duration-visual-owner/v2` from the shared VFX domain runtime.
The update-step-specific schedule is derived from the same integer-timer
contract used by runtime sampling; proof fixture generation no longer reads a
continuous, contract-fixed release timestamp.

For the row 1 proof step of `125 ms`, the generated schedule is:

- impact transition: `375 ms`;
- removal processed: `20,000 ms`;
- model owner done: `20,625 ms`;
- post-removal timer complete: `23,625 ms`.

The regenerated fixture contains `190` serialized frames from `t=0` through
`t=23.625 s`. Focused verification passed `49/49` backend tests, `69/69`
canonical-renderer tests, both broad fixture gates, and the backend build.

The guarded Web proof is:

- MP4:
  `evidence/vfx-nwn-broad-proof-2026-07-16/row1/aurora-web/aurora-web-row1-one-trigger-integer-owner-v2-20260813.mp4`;
- SHA-256:
  `d67cf6c092c330b7b73dc8b589599e181f8400ad371a77dba5ed13782ed011d8`;
- one trigger, no loop, zero overlap, settled assets, passing host/draw/shader
  ledgers, clean post state, and proof gate pass with zero blockers.

The saved NWN oracle was reused without starting NWN, SHA-256
`9cdc57cf5f559f58f019994e9680266d64b2b2e527b6fea395710b2b4fdb78c7`.
The onset-aligned diagnostic comparison is
`row1/comparisons/nwn-vs-aurora-web-row1-integer-owner-v2-diagnostic-20260813.mp4`,
SHA-256
`cec97e5577b4bd5f7d8bb4a2c0ff6cfaf9ae5d7064ec99643d56aabd933354f2`.
Its status is `diagnostic-only-open-camera-scene-owner-target`; it validates
the implemented owner lifecycle but does not promote pixel parity.
