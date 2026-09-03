# VFX post-axis-change regression audit - 2026-07-16

## Rules

- Aurora-first source and decompilation contracts remain authoritative.
- Saved NWN recordings were reused; NWN was not launched or rerun.
- Every new Web recording contains one playback with looping disabled and no overlap.
- Structural tests are not classified as visual parity proof.

## Visual fixtures

### Row 68 - VFX_IMP_HEALING_M

Status: `valid-comparison-source-backed-bloom-timing-aligned-with-open-spatial-gap`.

- Fresh Web capture: `evidence/vfx-nwn-web-row68/web/web-row68-one-trigger-v12-current-regression.mp4`.
- Fresh NWN/Web composite: `evidence/vfx-nwn-web-row68/nwn-vs-aurora-web-row68-comparison-v7-current-regression.png`.
- NWN visible span: `1.417 s`.
- Web visible span: `1.451 s`.
- Delta: `+0.034 s`, within one `0.083 s` NWN frame.
- All emitters finish with zero particles; source light and retail bloom checks pass.
- The known camera and target geometry normalization gap remains open.

### Row 44 - VFX_IMP_ACID_S

Status: `diagnostic-only-current-web-visible-nwn-effect-frame-missing`.

This fixture has no visual comparison proof. The Web-only recording and the
old-Web/current-Web image are diagnostics and must not be presented as an
NWN/Aurora comparison.

- The old proof camera at `[0, 0, 3]` was coplanar with the corrected Three X/Z
  image of Aurora X/Y mode-2 quads, so the current effect was viewed edge-on.
- The row-44 proof profile now uses an oblique camera at `[0, 1.4, 2.2]`.
- Fresh Web capture: `evidence/vfx-nwn-web-row44/aurora-web/web-row44-one-trigger-v3-oblique-current.mp4`.
- Old-Web/current-Web diagnostic: `evidence/vfx-nwn-web-row44/row44-old-web-vs-current-oblique-diagnostic.png`.
- The current image is flatter and ground-oriented, as required by the recovered
  Aurora X/Y to Three X/Z mapping.
- The current Web MP4 is above the black-frame threshold for about `0.594 s` and
  is substantially dimmer than the old Web diagnostic. Luminance and visible
  duration therefore remain open gaps rather than accepted corrections.
- The saved NWN recording acquired gameplay after the effect lifetime ended, so
  it cannot establish visual parity for the corrected spatial result.

### plc_t04 placeable flame and smoke

Status: `structurally-revalidated-fresh-visual-capture-not-produced`.

- The saved payload has two `Normal` emitters (`OmenEmitter240` and `fire!02`).
- It has no Chunk lane and does not use the corrected horizontal
  `Billboard_to_World_Z` lane.
- Canonical camera-facing front-face, source-MDL trimesh composition, and owning
  placeable area-model scale checks pass.
- A fresh area capture did not reach a canvas because
  `POST /areas/area_enon_bakery/process` did not complete. This run is not proof
  and no visual result is claimed.
- The previous v43 visual packet remains historical evidence only until a fresh
  capture succeeds.

## Other audited contracts

- Canonical renderer, MTR custom shader/twosided, render queue, and WorldTimer:
  `60/60` focused frontend tests passed.
- Single, Lightning, and WorldTimer runtime contracts: `22/22` focused backend
  tests passed.
- These results establish no new visual parity. Single/Lightning, flowmap time,
  overlapping render-order parity, and MTR framebuffer parity retain their
  existing visual-proof gaps.

## Result

- No new regression was found in row 68 or the source-backed nonvisual contracts.
- Row 44 exposed an obsolete proof-camera assumption; the proof profile was fixed,
  while luminance and visible-duration parity remain unresolved.
- plc_t04 remains structurally compatible with the changes, but a fresh visual
  proof is still required.
