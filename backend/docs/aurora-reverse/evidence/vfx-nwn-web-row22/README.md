# VFX row 22 NWN vs aurora-web diagnostic comparison

Status: `diagnostic-only-single-playback-open-context-gaps`.

- NWN retail: one `EffectVisualEffect(VFX_FNF_FIREBALL)` trigger; saved MP4 reused.
- aurora-web: one deterministic 12 fps playback, no loop, no overlap, clean baseline and post-roll, no diagnostic capsule or receiver.
- Retail source: row 22, `vff_explfire.mdl`, impact animation `4.966670` seconds.
- Timing status: `unavailable-capture-frame-timestamps-missing`; encoded NWN PTS is not accepted as runtime time.
- Still alignment: onset plus 0, 3, and 9 captured frames; this compares sequence morphology, not equal runtime seconds.
- Source-backed static WOK collision: 83 hits applied; chunk particles 2, 3, 4, 8 landed.
- Source-backed Web scene: exact floor/rug receivers, 14 source textures, and global moon ambient/diffuse from the saved ARE.
- Global renderer fix: chunk-model texture clones use glTF `flipY=false`; particle billboard texture orientation is unchanged.
- Source-backed tile lighting: all six native main lights and the one available source slot are resolved; five non-zero ARE source references have no corresponding tile slots and correctly create no Aurora carriers.
- Open gaps: exact NWN camera pose, owner/target creatures, and retail wall/ceiling fade are not reconstructed.
- VFX helper profile: static misses resolve as no-hit; shared dynamic traversal is not selected when helper arg0 is `1`.
- Capture limitation: missing NWN per-frame timestamps plus scene and camera gaps prevent timing and pixel-parity claims.
