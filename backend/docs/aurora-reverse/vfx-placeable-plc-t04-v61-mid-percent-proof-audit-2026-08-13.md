# `plc_t04` post-change placeable proof audit v61

Date: 2026-08-13

Status: `matched-with-gaps`; canonical visual parity is not claimed.

## Source policy

- Aurora-first: yes. This packet validates the current shared renderer after
  the particle midpoint/percent correction documented in
  `vfx-particle-mid-percent-renderer-semantics-audit-2026-08-13.md`.
- xoreos used: no.
- NWN or Toolset launched: no. The approved immutable NWN MP4 was reused.
- Playback policy: one deterministic Aurora Web capture only. The three
  playback triggers are one trigger for each of the three persistent source
  placeable roots; there is no retrigger, loop, or overlap.

## Scope

- Area: `area_enon_bakery`.
- Placeable resref/model: `tm_pl_lightred` / `plc_t04`.
- Source composition: three persistent placeables, each with static nodes
  `Plane25` and `Rectangle121`, flame emitter `OmenEmitter240`, and smoke
  emitter `fire!02`.
- Source textures: `fxpa_flame00` and `fxpa_smoke01`.
- Source light nodes: none. No point light was fabricated in Aurora Web.
- Lifecycle: persistent 10-second observation window at 8 fps, not a
  fire-and-forget effect.

The `plc_t04` source payload contains no particle midpoint or percent fields.
This is therefore a representative post-change placeable regression packet,
not a direct visual witness for the midpoint/percent renderer semantic. That
semantic is covered by divergent-value frontend and backend regressions; a
matched visual fixture that actually contains those fields remains open.

## Proof gate

The first preflight against the stale backend failed closed and wrote a blocker
manifest. It produced no accepted playback. The accepted preflight and capture
used a backend that successfully processed the exact area and reported complete
runtime identity.

Accepted capture facts:

- capture accepted: `true`;
- proof gate: `pass`, empty blocker manifest;
- host graph: `pass`, three composition roots;
- asset settlement: `settled`;
- draw ledger and particle shader ledger: `pass`;
- static frame at `t=5`: six visible emitter draw meshes and 66 particles;
- playback guard: three expected roots, three triggers, one trigger per root,
  `loop=false`, `overlapCount=0`;
- deterministic media: 10.00 seconds, 80 frames, 8 fps;
- `canonicalParityPromoted=false`.

Build identity:

- frontend commit:
  `348e8ff0e27677b7c611c56afa4d706685b393f0-dirty-v18`;
- frontend image digest:
  `sha256:21d0029e2fc37e11ffb155f5754408f82697c2c62d7bc9bddf187b8b5100ae10`;
- backend commit:
  `348e8ff0e27677b7c611c56afa4d706685b393f0-dirty-188f5400b19c6394`;
- backend image digest:
  `sha256:188f5400b19c63941fd85c4443e11e0bd1ac2f4d391a8b3e0265b9cfeebad7d4`.

## Artifacts

- Reused NWN oracle:
  `artifacts/source-mdl-emitter-oracle/retail-source-mdl-emitter-plc-t04-ovens-removed.mp4`
  - SHA-256:
    `1599BD2D42A4F9DFD1A3806332B5939EF4CEDB6CB5700572298D254BF65F27C8`.
- Fresh Aurora Web MP4:
  `evidence/vfx-placeable-post-debt-2026-07-14/post-debt-enon-bakery-plc-t04-v61-mid-percent-start-end-10s-8fps-proof-20260813.mp4`
  - SHA-256:
    `DCE4518415077B0A51D89DCD39C6D68835313E6B733149FAB09B9BB45545E359`.
- Fresh Aurora Web frame JSON:
  `evidence/vfx-placeable-post-debt-2026-07-14/post-debt-enon-bakery-plc-t04-v61-mid-percent-start-end-10s-8fps-proof-20260813.frame.json`
  - SHA-256:
    `B91AD9707902024E2F2DB49ED499C8AB6F61ED813D1F2DD18B433CAEBF6C47F5`.
- Fresh Aurora Web `t=5` PNG:
  `evidence/vfx-placeable-post-debt-2026-07-14/post-debt-enon-bakery-plc-t04-v61-mid-percent-start-end-10s-8fps-proof-20260813.png`
  - SHA-256:
    `E0503A93BA1D728910B9E733914194D3CC3FC79F480866DC25FC9B8D13E0BE3A`.
- Side-by-side MP4, NWN left and Aurora Web right:
  `evidence/vfx-nwn-broad-proof-2026-07-16/comparisons/nwn-left-vs-aurora-web-right-plc_t04-v61-mid-percent-start-end-20260813.mp4`
  - SHA-256:
    `6A11F3AA9AE884823BB0D78A005DA4B88BF5D282AEA94A93D293F5649FB7F5B3`.
- Side-by-side contact sheet:
  `evidence/vfx-nwn-broad-proof-2026-07-16/comparisons/nwn-left-vs-aurora-web-right-plc_t04-v61-mid-percent-start-end-20260813-contact-sheet.png`
  - SHA-256:
    `A0FF7955FE273037692AC6356D5DA7CFE224F165E550EF6E19CB1C478D861A81`.

## Visual verdict

Confirmed:

- the current packet renders the actual full placeable, not an emitter-only
  proxy;
- all three source transforms and both emitter textures are present;
- the current shared source-MDL runtime remains functional after the global
  midpoint/percent correction;
- the accepted packet contains no repeated playback.

Visible gaps:

- Aurora Web's flame is narrower, paler, and has weaker surrounding bloom or
  framebuffer spill than the saved NWN result;
- the NWN and Web cameras and visible scene contents are not normalized: NWN
  shows two placeables and a player character, while Web shows all three source
  instances from a more top-down view;
- the unmatched camera/context prevents pixel correlation and prevents
  attributing the whole luminance difference to particle rendering alone.

No per-effect size, alpha, color, or bloom tuning is justified by this packet.
The remaining material/bloom/composite behavior must be recovered from primary
Aurora evidence and implemented globally before a replacement proof is made.
