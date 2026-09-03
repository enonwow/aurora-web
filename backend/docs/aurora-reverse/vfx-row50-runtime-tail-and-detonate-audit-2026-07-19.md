# VFX row-50 runtime tail and detonate audit

Date: 2026-07-19

Status: implementation corrected; fresh one-playback Web proof required

## Scope

This Aurora-first audit investigates the row-50 `VFX_IMP_DEATH` differences
visible after exact `texUnit0` RGBA binding:

- the Web initial flash was too large and saturated;
- the Web `souldust` Motion_Blur lane produced too many overlapping vertical
  streaks;
- the late Web tail remained stronger than the saved NWN oracle.

The saved approved NWN MP4 was reused. NWN and Toolset were not launched.
xoreos was not used.

## Primary Aurora evidence

The admitted Aurora decompilation is
`C:\Projects\New Folder\export\decompiled_all.c`.

### Evaluated mass is live per tick

`FUN_00a2c36c` reads the emitter runtime mass slot on every active-particle
update:

- `decompiled_all.c:854992` applies
  `emitterMass * -9.81 * delta` to the particle vertical velocity.

The old Web runtime evaluated mass at particle spawn and stored a fixed
acceleration on that particle. Animated mass changes therefore did not affect
already active particles as Aurora requires.

Aurora Web now refreshes each active particle's acceleration from the current
evaluated emitter simulation before the family update. The same rule is used
for Fountain, Explosion, P2P-compatible, and Single active-particle paths.

### Explosion uses a prior-tick one-shot guard

`FUN_00a31ca4` at `decompiled_all.c:857152-857272` proves this transaction:

1. the model-animation callback sets the Explosion detonate latch at runtime
   `+0xe4`;
2. particle creation requires a non-zero requested count, a set latch, and the
   previous one-shot guard at `+0x198` to be below `1.0`;
3. after the update, `+0x198` receives `1.0` when the latch was set and `0.0`
   otherwise;
4. the detonate latch is cleared.

The row-50 binary animation header contains detonate callbacks at `0` and
`0.0333333` seconds. At the former 8 Hz fixture step they landed in one tick
and happened to produce one burst. At a sufficiently small step they crossed
separate ticks, exposing that the Web runtime had no `+0x198` equivalent and
created a second burst.

Aurora Web now preserves the prior-tick guard explicitly. An adjacent-tick
detonate callback is consumed and traced but cannot create a second burst.
One empty tick clears the guard, matching the recovered writeback rule.

## Proof integration profile

Aurora accepts the current frame delta; the decompilation does not define an
8 Hz particle simulation. The old row-50 fixture coupled its serialized proof
rate to `dt=0.125 s`, causing coarse integration and synchronized particle
cohorts.

The deterministic row-50 proof fixture now uses:

- simulation delta: `1/60 s`;
- serialized output stride: `2`;
- serialized state step: `1/30 s`;
- capture output remains 30 fps.

This is a deterministic proof precision profile, not a claim that Aurora has
a fixed 60 Hz runtime. It avoids using the old 8 fps recording cadence as
particle-runtime semantics.

## Measured effect on row 50

After regeneration from the exact source model:

| Metric | Old 8 Hz fixture | Corrected 60 Hz simulation |
| --- | ---: | ---: |
| `sparks` maximum active particles | 25 at the old coalesced callback path; 50 when 60 Hz exposed the missing guard | 25 |
| `Smoke` maximum active particles | 6 at the old coalesced callback path; 12 when 60 Hz exposed the missing guard | 6 |
| `WIND_Dummy` maximum active particles | 1 | 0 |
| `souldust` maximum active particles | 78 | 46 |
| `souldust` maximum previous/current segment | 7.522 | 5.099 |
| `souldust` maximum source Z | 11.426 | 8.277 |

The regenerated row-50 payload is 7,310,535 bytes and contains 186 serialized
frames per emitter over 6.15 seconds. Every emitter reaches zero active
particles at the terminal state.

## Tests

Test-first failures established both defects:

- an already active particle retained spawn-time mass instead of using the
  current evaluated mass;
- a distinct detonate callback in the immediately adjacent tick produced a
  second Explosion burst.

Post-correction verification:

- `aurora-vfx-runtime-state.spec.ts`: 90/90 passed;
- runtime state, application service, and render contract: 160/160 passed;
- row-50 source-scene fixture contract passed with `dt=1/60`, stride `2`,
  and serialized step `1/30`;
- canonical renderer tests: 71/71 passed;
- VFX runtime observability tests: 8/8 passed;
- backend and frontend production builds passed.

## Proof requirement

This audit does not promote visual parity. The next accepted artifact must:

- use exactly one fire-and-forget Web playback;
- report `aurora-vfx-runtime-observability/v1` PASS with an empty blocker
  manifest;
- keep loop disabled and overlap count zero;
- reuse the saved approved NWN MP4 without an NWN rerun;
- publish a fresh onset-aligned comparison and contact sheet.

The remaining material, bloom, postprocess, camera, scene, and retail-RNG gaps
must stay explicit even if the initial flash and Motion_Blur tail improve.

## Accepted post-correction proof v6

The fresh Aurora Web capture used exactly one accepted playback and the saved
approved NWN MP4 was reused without rerunning retail:

- Aurora Web MP4 SHA-256:
  `5aa50ca4113a21037a79084b16d00cec5c6ca600ee19bb6f482fc0fd9424028e`;
- Aurora Web frame manifest SHA-256:
  `0b25f4ff45f163757215fe2ba34c75501cfe8f1602668758b4c54ada3c44b616`;
- onset-aligned comparison MP4 SHA-256:
  `f354a3b354dccf8a211407e7b1dd8dd2f6050cdaa59372310b48c19419f1d96d`;
- comparison contact sheet SHA-256:
  `f8f2065aa17cefc550e9eeb6c8034c9c7ae673bce6d910983eafe6002a650ece`;
- comparison manifest SHA-256:
  `4cf3f822be2e057ad441547fd6c88a197399c4093e06045039b17751f7221a21`.

The `aurora-vfx-runtime-observability/v1` report records matching frontend and
backend working-tree identity
`working-tree-42ac595bc3ac2ae93a32bd3159a8d2412fa58b4724038121fc16b6ffaaa98d8d`,
host-graph PASS, settled assets, draw-ledger PASS, exactly one trigger, loop
disabled, zero overlap, completed `6.15 s` playback, a stable `Impact`
attachment, an empty blocker manifest, and zero final draws/visible frames.

The proof confirms the runtime corrections but does not establish visual
parity. The comparison remains `matched-with-gaps`: Web still forms a compact
saturated white core instead of the taller retail full-body column, its
vertical streaks are sharper, and a stronger low/vertical residue remains
after retail has reduced to a faint torso-local glow. These deltas require a
separate Aurora-first shape/material audit.

Later binary-animation source-field audit found that v6 still allowed the
`impact` animation node's fixed `spawntype=0` default to overwrite the base
`souldust` trail value `1`. v6 is therefore historical pre-source-field
evidence. See
`vfx-binary-animation-source-field-audit-2026-07-19.md`.
