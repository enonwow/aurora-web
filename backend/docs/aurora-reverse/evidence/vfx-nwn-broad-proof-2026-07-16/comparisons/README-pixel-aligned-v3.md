# NWN retail vs Aurora Web broad VFX proof

Status: `comparison-ready-open-parity-gaps`.

## Contract

- Aurora first: Web fixtures are generated from retail-source manifests and payloads.
- Existing NWN/Aurora MP4 oracles are reused; NWN was not launched for this comparison.
- Fire-and-forget VFX have exactly one Web trigger; duration VFX run for 20 seconds.
- NWN onset is aligned to the first pixel-visible Aurora Web frame in each encoded MP4.
- No diagnostic receiver, capsule, plane, or proof-only geometry is visible.
- Camera/environment mismatch is explicit; these artifacts do not claim pixel parity.

## Artifacts

- Full 10-fixture MP4: `nwn-vs-aurora-web-10-fixture-full-set-pixel-aligned-v3.mp4`.
- Overview MP4: `nwn-vs-aurora-web-10-fixture-overview-pixel-aligned-v3.mp4`.
- Contact sheet: `nwn-vs-aurora-web-10-fixture-contact-sheet-pixel-aligned-v3.png`.
- Machine manifest: `broad-nwn-vs-aurora-web-comparison-manifest-pixel-aligned-v3.json`.

## Fixture findings

### row68 | VFX_IMP_HEALING_M

- Comparison: `nwn-vs-aurora-web-row68-retail-20260716-pixel-aligned-v3.mp4`.
- Window: 7.037 s; NWN starts at source t=5.379 s.
- Open gap: The Web healing column is substantially smaller and narrower in frame than the NWN burst.
- Open gap: Web preserves a white core and rising yellow sparks, but bloom width, density, and tail timing do not match retail.

### row44 | VFX_IMP_ACID_S

- Comparison: `nwn-vs-aurora-web-row44-retail-20260716-pixel-aligned-v3.mp4`.
- Window: 8.875 s; NWN starts at source t=9.467 s.
- Open gap: Web resolves as an isolated compact green cloud; NWN spreads a wider aura around the target and ground.
- Open gap: Acid footprint, spatial scale, particle detail, and luminance do not yet match retail.

### row50 | VFX_IMP_DEATH

- Comparison: `nwn-vs-aurora-web-row50-retail-20260716-pixel-aligned-v3.mp4`.
- Window: 10.375 s; NWN starts at source t=12.691 s.
- Open gap: Web reproduces a white core and vertical wisps, but the NWN effect wraps the target with a taller light column.
- Open gap: Burst scale, silhouette, environmental spill, and decay do not yet match retail.

### row22 | VFX_FNF_FIREBALL

- Comparison: `nwn-vs-aurora-web-row22-retail-20260716-pixel-aligned-v3.mp4`.
- Window: 8.336 s; NWN starts at source t=2.831 s.
- Open gap: The NWN peak is broader, brighter, and saturates the environment more strongly.
- Open gap: The Web flash exposes a shell/lanes silhouette and its late chunks remain too dark.

### row210 | VFX_BEAM_FIRE

- Comparison: `nwn-vs-aurora-web-row210-retail-20260716-pixel-aligned-v3.mp4`.
- Window: 24.000 s; NWN starts at source t=8.372 s.
- Open gap: The source-target axis and linked-segment winding are now coherent, but the Web beam is far thinner than NWN.
- Open gap: Web source/target glow, beam width, phase motion, and luminance do not yet match retail.

### row216 | VFX_BEAM_FIRE_LASH

- Comparison: `nwn-vs-aurora-web-row216-retail-20260716-pixel-aligned-v3.mp4`.
- Window: 24.000 s; NWN starts at source t=8.399 s.
- Open gap: Web is a segmented zig-zag chain, while NWN is a thick smooth looping fire lash around the target.
- Open gap: The retail phase loop is not yet represented by the native runtime owner.

### row181 | VFX_IMP_MIRV

- Comparison: `nwn-vs-aurora-web-row181-retail-20260716-pixel-aligned-v3.mp4`.
- Window: 6.000 s; NWN starts at source t=12.680 s.
- Open gap: Web currently presents one compact blue-violet point instead of proving the retail MIRV split/trajectory behavior.
- Open gap: Native progfx Type10 multiplicity/trajectory ownership is missing; current group motion is manifest-driven.

### row1 | VFX_DUR_DARKNESS

- Comparison: `nwn-vs-aurora-web-row1-retail-20260716-pixel-aligned-v3.mp4`.
- Window: 24.000 s; NWN starts at source t=12.254 s.
- Open gap: Web appears as a flat radial black ellipse on gray, while NWN is a dark scene-integrated ground volume around actors.
- Open gap: Impact/duration/cessation switching, the retail phase loop, volume footprint, and decay are incomplete.

### aoe0 | VFX_PER_FOGACID

- Comparison: `nwn-vs-aurora-web-aoe0-retail-20260716-pixel-aligned-v3.mp4`.
- Window: 24.000 s; NWN starts at source t=8.545 s.
- Open gap: Web is an isolated soft green cloud; NWN fills a much wider ground area with dense acid fog.
- Open gap: Native persistent AOE ownership, phase loop, footprint, vertical spread, density, and motion remain incomplete.

### plc_t04 | plc_t04 / tm_pl_lightred

- Comparison: `nwn-vs-aurora-web-plc_t04-retail-20260716-pixel-aligned-v3.mp4`.
- Window: 10.000 s; NWN starts at source t=0.000 s.
- Open gap: Web shows all three source instances and their dark star-shaped static bases, but flame plumes remain weaker and narrower.
- Open gap: The isolation backdrop/camera differ from the bakery oracle, which visibly contains two of the three instances.
