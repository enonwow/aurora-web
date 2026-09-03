# Row 44 exact BIC source-actor proof-scene audit

Date: 2026-08-13

Status: `proof-scene-host-context-implemented-static-proof-passed`;
post-change matched playback remains open.

## Source policy

- Aurora-first: yes. The implementation uses the immutable row-44 NWN proof
  manifest, its exact copied module, scripts, source Area, and capture BIC.
- xoreos used: no.
- NWN or Toolset launched: no. The approved NWN MP4 was reused without rerun.
- No second row-44 Web playback was made after adding the source actor.

## Recovered proof context

The approved row-44 NWN summary records:

- copied module `codex_vb_row44.mod`, SHA-256
  `B8E03C0B9E1708467D57FF1B652B4C83DF9C38638B0773D15033DC7448C8C790`;
- exact source BIC
  `C:\Users\enonw\Documents\Neverwinter Nights\localvault\avriemail461.bic`,
  SHA-256
  `5EDC2CE0232DAD09DB9649401DB55CCB9956ECFE98FF172E152A11AC5C1D7CC0`;
- source script `vb44shot.nss`, which turns the first PC toward the target and
  the target toward the first PC before applying the location VFX;
- source position `(9.5, 3.8, 0)` and target position `(9.5, 6.8, 0)`, a
  three-metre separation.

The same BIC is already parsed source-first for the row-216 host fixture. It
resolves a part-based `pfh0` creature with `a_fa`, exact body/equipment parts,
`nw_cloth001`, PLT material colors, and the source HAK precedence chain. Row 44
now reuses that shared BIC parser/result rather than a visual stand-in.

## Implementation

`backend/scripts/prepare-vfx-web-broad-proof-fixtures.ts` now:

- loads and hash-gates the exact capture BIC through one shared helper;
- includes the BIC-derived source creature at normalized position `[0,-3,0]`;
- preserves source forward `[0,1]` from `vb44shot.nss`;
- keeps the exact `c_yinnkeep/a_ba` target at `[0,0,0]`;
- reports both actors, all four source tiles, fourteen textures, and
  source-backed Area/tile lighting;
- marks owner/target context established while leaving camera and scene pixel
  response unproven.

The remaining comparison blockers are therefore exactly:

```text
camera-match-unproven
scene-match-unproven
```

`owner-target-match-unproven` is removed.

## Proof

### Current VFX playback before actor injection

The v23 Web MP4 records one deterministic playback, no loop, retry, or overlap,
completed playback, clean post-roll, and passing identity/host/asset/draw/
shader/proof gates. SHA-256:
`BA08D6867DC7622CDC51DAAD505B93C76707E28ACC26103FA32989DDF0D76395`.

The saved NWN oracle SHA-256
`6DB297444B59EDAEE29C3B9E4B465CB6BEE29013A693D9CEC22AD0302EE5C95D`
was reused without rerun. The onset-aligned comparison MP4 SHA-256 is
`C6A77DEB75FE542BCCBABAC8E49345C5A95E15FA46F9118862DE1142C094569F`;
contact-sheet SHA-256 is
`36261DFD1BED26D511D5F82C70B638AB568656811A934288E26E7E3B4DE667AB`.

This playback is valid current-runtime VFX evidence but is historical for
scene-host comparison because its Web side still contains only the target.

### Static post-change proof

The v29 static preflight invokes no playback hooks and passes runtime identity,
canonical host graph, asset settlement, draw ledger, particle shader ledger,
and proof gate with an empty blocker manifest. It reports:

- source actor `proof_avri461`, `pfh0/a_fa`, status
  `source-backed-bic-part-models-equipment-supermodel-pause1-playing`;
- target actor `nw_innkeeper`, `c_yinnkeep/a_ba`, status
  `source-backed-direct-model-supermodel-pause1-playing`;
- actor count `2`, model count `4`, texture count `14`;
- owner/target context established;
- camera and scene material response still open.

Static PNG SHA-256:
`1797A968CB8763B148FE22789BE40552AD8C6F233328E4CF673FFA1DF4AC1CFC`.

## Timing boundary

The saved NWN oracle runs at approximately `7.764 FPS`, one encoded frame every
`0.129 s`. Row-44 Explosion particles live `0.1 s`. Individual early-burst
shape and random distribution are therefore undersampled by the retail video;
the apparent Web change within the first `0.067 s` cannot authorize particle
count, lifetime, spread, size, color, or RNG tuning.

## Verification

- The row-44 proof-scene contract test was red before implementation and now
  passes with two actors, exact BIC hash, expected part/equipment identity,
  four admitted tiles, fourteen textures, no omitted oracle objects, and the
  corrected comparison-context classification.
- Fixture generation passes for `VFX_BROAD_FIXTURE_SLUG=row44`.
- v29 static observability gate passes.

Current status remains `matched-with-gaps`, not visual parity. A future fresh
row-44 Web playback may be paired with the existing saved NWN MP4 after another
material or camera correction; it must remain exactly one playback for that
accepted packet.
