# VFX particle packed-RGBA vertex quantization audit - 2026-08-06

## Decision

Aurora quantizes the evaluated particle RGB and alpha lanes to packed 8-bit
vertex channels before the particle draw. Before this correction, Aurora Web
uploaded the unquantized JavaScript float values to the vertex `color` and
`auroraAlpha` attributes.

This is a shared renderer defect. It affects Normal, Lighten/additive,
Punch-Through, Motion_Blur, Linked, Single, Lightning-compatible, and ordinary
textured particle draws. It must be corrected at the canonical vertex builder,
not tuned per effect.

## Source policy

- Aurora-first: yes.
- Primary source: admitted Aurora Toolset decompilation and the matching
  `nwtoolset.exe` machine code.
- xoreos used: no.
- NWN and Toolset were not launched. Existing saved NWN recordings remain the
  visual oracle.

Binary identity:

- MD5: `20e2ab3ea77805a8d07d9ff751314cfd`;
- SHA-256:
  `4c156de898817518e8a97f5d989592894d3c8f48b71d27e2a8b89500cd230f24`.

## Primary Aurora evidence

Decompilation source:

`C:\Projects\New Folder\export\decompiled_all.c`

In `FUN_00a2e250`:

- lines `856119-856180` multiply the evaluated start RGB and alpha channels by
  `255.99f` before integer conversion;
- lines `856253-856329` repeat that conversion for interpolated RGB/alpha and
  assemble the packed per-vertex color word;
- lines `856413-856416` independently quantize the Motion_Blur trailing alpha
  after applying its endpoint factor;
- lines `856701-856765` write the packed color word into each of the six
  particle vertices.

The conversion helper is `FUN_00b908cc`, lines `1061298-1061305`. Exact
machine code at VA `0x00b908cc` saves the x87 control word, ORs it with
`0x0c01`, loads that control word, executes integer store, and restores the
original control word. Bits `0x0c00` select round-toward-zero, so the recovered
channel operation is:

```text
byte = trunc(component * 255.99) & 0xff
normalizedVertexChannel = byte / 255
```

For the admitted particle ranges this maps `1.0 -> 255`, `0.5 -> 127`, and
`0.25 -> 63`. It is not JavaScript float passthrough and it is not
`Math.round(component * 255)`.

## Pre-implementation defect

`buildCanonicalTexturedQuadGeometry` in
`frontend/src/modules/layout/adapters/three/auroraVfxCanonicalRenderer.ts`
appended `record.color.r/g/b` and `record.alpha` directly to float buffer
attributes. Motion_Blur also multiplied the unquantized alpha by its trailing
factor and uploaded that float directly.

Consequences:

- every non-integral channel can differ from Aurora by up to one byte step;
- alpha accumulation across many overlapping particles is systematically
  different;
- Motion_Blur trailing alpha has the wrong quantization boundary;
- proof telemetry describes packed-gamma provenance while the actual geometry
  is not yet byte-equivalent.

## Implementation contract

1. Preserve runtime/draw-record RGB and alpha as evaluated source floats.
2. Quantize only while constructing the canonical vertex buffer.
3. For admitted normalized channels, multiply by `float32(255.99)`, truncate
   toward zero, preserve the native low byte, and divide the packed byte by
   `255` for Three's float attribute. Do not invent a clamp for out-of-contract
   values that the admitted native path does not prove.
4. Quantize Motion_Blur trailing alpha after applying the native endpoint
   factor, independently from the current-end alpha.
5. Apply the rule globally to all textured-quad lanes without changing
   particle timing, count, size, orientation, texture sampling, or blend
   factors.

## Acceptance

- A red/green renderer regression proves exact `1.0`, `0.5`, `0.25`, and
  `0.75` packed-channel results.
- Motion_Blur coverage proves independent trailing-alpha quantization.
- Existing canonical renderer, scene host, placeable adapter, observability,
  and proof-gate tests remain green.
- A fresh Web proof is captured exactly once only after static preflight
  passes. The approved saved NWN MP4 is reused without rerun.
- Visual status remains `matched-with-gaps` unless the comparison genuinely
  closes the remaining differences.

## Implemented result

The canonical textured-quad vertex builder now applies the recovered packed
RGBA boundary to every appended vertex. Runtime and draw-record values remain
the evaluated source floats; only the final render attributes are quantized.
Motion_Blur current and trailing endpoint alpha values are packed independently
after the native trailing factor is applied.

Geometry and mesh telemetry now expose:

- `auroraVfxCanonicalPackedRgbaVertexBoundary=true`;
- scale `float32(255.99)`;
- rounding `truncate-toward-zero-low-byte`;
- normalization `packed-byte-divided-by-255`;
- source `nwtoolset.exe FUN_00a2e250 and FUN_00b908cc`.

Test-first evidence:

- before implementation the new regression failed with Web `0.25` versus the
  Aurora result `63/255`;
- after implementation the focused canonical renderer suite passes `67/67`;
- canonical renderer, scene runtime, object host, catalog proof runner, and NWN
  comparison runner suites pass `134/134`;
- the frontend production build passes with only the existing large-chunk
  warning.

## Fresh guarded proof

The static row-50 preflight passed before playback and exposed no playback
hooks. The accepted Aurora Web recording then completed exactly one
deterministic playback:

- `triggerCount=1`, `loop=false`, `overlapCount=0`;
- `315` MP4 frames at `30 fps`, with `316` deterministic requested frames;
- runtime identity `ready`, host graph `pass`, assets `settled`, draw ledger
  `pass`, particle-shader ledger `pass`, and proof gate `pass` with no blockers;
- frontend source digest
  `sha256:42d7d63ad839791cb33a9475e0c15682325ce207dae09372390a2b492105f146`;
- backend dist digest
  `sha256:d25996c4bf746d499542d7188a0ed6129ed9206e79d360f4a8a387a9ab2bc808`;
- Web MP4 SHA-256
  `d77c21c1203219793c54e51a14f4978916ab1685e8bb65d545348051bac5adf1`;
- summary SHA-256
  `d653d7d02d100c6face834c69a4e6ffef225abe9446ce72eda9be77df1edfe10`.

The approved saved NWN MP4 was reused without launching NWN or triggering the
effect again. The onset-aligned comparison SHA-256 is
`7ae34c26db36f391f68ec10135d55abed84cd73f38053e19eb3f6bda4a0be662`.
The full contact sheet SHA-256 is
`98d7388f729014b59ef76ffdbca28a4bf0b86129d8571d468ac7549436ade737`;
the denser impact contact sheet SHA-256 is
`06bd7960169c80dc249529f988abc5b6af68730c74dca9ae212b76a286f40f06`.

Visual status remains `matched-with-gaps`. The native packed-RGBA defect is
closed globally, but the Web proof still has a darker/incomplete proof scene,
a broader ground glow, different vertical peak mass, unresolved tile light
lanes, unproved exact camera, SSAO, and retail RNG. The saved NWN source is
approximately `8.17 fps`, so its onset cannot be sub-frame aligned to the
deterministic `30 fps` Web capture without fabricating intermediate retail
frames.

Comparison manifest:

`evidence/vfx-nwn-broad-proof-2026-07-16/comparisons/row50-packed-rgba-onset-aligned-v15-20260806.json`
