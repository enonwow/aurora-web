# Placeable lighting — Aurora Web runtime proof — 2026-08-17

Status: **Aurora Web runtime `verified`; Toolset/NWN retail parity `missing`.**

This packet proves that the current local Aurora Web build renders the two
separate placeable-light lanes for the current catalog candidate
`plc_bhp_arcn1a` (`bhp_arcn1a`) and applies the `LightState=0` switch only to
the resolved `placeables.2da` lane. It does not prove pixel parity with retail
Aurora Toolset or NWN.

## Accepted captures

Both captures were produced by
`backend/scripts/capture-vfx-app-route-cdp.mjs` through Chrome DevTools
Protocol `Page.captureScreenshot`. The script accepted a frame only after
runtime build identity, canonical host graph, asset settlement, draw ledger,
texture settlement, canvas, and composition gates all passed.

| Capture | Result | 2DA light | 2DA PointLights | Fast shadows | MDL light node |
|---|---|---:|---:|---:|---|
| ON | `accepted=true`, `proofGate=pass` | `active` | 1 | 1 | `auroralight01` |
| OFF (`lightState=0`) | `accepted=true`, `proofGate=pass` | `disabled` | 0 | 0 | `auroralight01` |

The OFF result deliberately retains `auroralight01`: a UTP/placeable
illumination switch controls the resolved `placeables.2da` light, not an
independent light node embedded in the source MDL. The runtime host graph is
`pass` in both captures with composition mode
`source-mdl-static-emitter-light`.

## Current contract evidence

The cached payload is backend canonical and `rendererEligibility=source_backed`.
It carries `aurora-source-mdl-light-feature-manifest/v1` for one node,
`auroralight01`, without truncation or diagnostics. The manifest preserves
position, orientation, color, radius, multiplier, ambient/shadow/dynamic
flags, priority, flare/fading flags, and animation-track presence.

Runtime identity is the same on both sides:

- commit label: `dirty-placeable-lighting-cf4a1c12c2a94b4c`;
- source digest: `sha256:cf4a1c12c2a94b4cef6551fe87f729be6bcd96f91b987ee5ca86ab1b35fa293c`;
- build time: `2026-08-17T14:19:52.5922781Z`;
- contract: `1.0.0`;
- runtime revision:
  `vfx-placeable-canonical-host-light-source-v2-emitter-shell-filter`.

## Artifacts

- ON screenshot:
  `artifacts/placeable-lighting-proof-2026-08-17/placeable-candle-light-on-accepted-2026-08-17.png`
  (`sha256:132cdb38c53c6db9e3b2d15ee8bfc51de67e807a7d9a69990098e1dc6f1e7a63`)
- ON frame:
  `artifacts/placeable-lighting-proof-2026-08-17/placeable-candle-light-on-accepted-2026-08-17.frame.json`
  (`sha256:18bff413d431e7b3dba128dfdbbc5b415066d1b9083f7ab751f7034406097c04`)
- OFF screenshot:
  `artifacts/placeable-lighting-proof-2026-08-17/placeable-candle-light-off-accepted-2026-08-17.png`
  (`sha256:75d638bf9a3cef605768e14908bbc3d4ddbc8b6b923a91fe49f5520063a87add`)
- OFF frame:
  `artifacts/placeable-lighting-proof-2026-08-17/placeable-candle-light-off-accepted-2026-08-17.frame.json`
  (`sha256:4a08b0e9c2627ce998d8577f8b1c3bf1fef7cf20f54c37da4509597d83703f01`)
- machine-readable summary:
  `artifacts/placeable-lighting-proof-2026-08-17/placeable-lighting-proof-summary-2026-08-17.json`.

## Boundary of the claim

This closes the local Aurora Web visual/runtime gate for this candidate. The
payload still truthfully reports `retailParityStatus=blocked`,
`localOnlyNotRetailEvidence=true`, and `canonicalParityPromoted=false`.
There is no valid versioned AUR-S07 placeable-lighting Toolset/NWN proof
profile in the repository, so no Toolset/NWN session was started and retail
parity remains `missing`.
