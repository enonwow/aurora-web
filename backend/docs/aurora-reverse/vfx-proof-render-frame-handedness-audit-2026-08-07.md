# VFX proof render-frame handedness audit (2026-08-07)

## Decision

The standalone NWN/Web comparison runner must place its complete Aurora-space
content under the same X-mirrored render frame used by the production Area
renderer. The missing parent frame is a proof-harness defect. It is not a
reason to move an individual effect, change one emitter, or rewrite the shared
MDL-to-GLB converter.

The admitted proof-frame transform is:

```text
converted MDL/VFX basis: (x, z, y)
Area/proof parent frame: scale (-1, 1, 1)
effective source basis:  (-x, z, y)
```

This is applied once to the complete proof content: source Area models, tile
source lights, actors, canonical VFX roots, and Chunk model children.

## Aurora-first evidence

- Saved NWN baseline:
  `evidence/vfx-nwn-web-row22/nwn/nwn-row22-one-trigger-validated-baseline.png`
  (`880 x 750`, SHA-256
  `F2747820E2FF28D7B3845E17F3F87E1FEBC1800F5ACAD11B4DB180DD6E0E4854`).
- Saved NWN single-trigger MP4:
  `evidence/vfx-nwn-web-row22/nwn/nwn-row22-one-trigger.mp4`
  (SHA-256
  `F6414E0D184131CE74836C208E6334BB62CF023C502725223758185DD41F0983`).
- `vfx22entry.nss` sets camera facing `180`, distance `7`, pitch `62`.
- `vfx22shot.nss` applies `VFX_FNF_FIREBALL` at `GetLocation(GetFirstPC())`.
- The module entry/effect source origin is `(9.5, 3.799999952316284, 0)`.
- Exact ARE tile transforms and SET orientation `0` for tile IDs `107` and
  `147` are source-read from `codex_vfx_row22.mod` and `tin01.set`.
- The production Area frame already mirrors the complete terrain/object layer
  in `workspaceTerrainMesh.ts` and `workspaceObjectMeshLayer.ts` by setting
  `scale.x=-1` and recording `auroraAreaRenderFrameMirror=coordinate-x`.

No xoreos source was used.

## Retail differential

The old standalone runner omitted the production parent mirror. It therefore
assigned positive source X to the left side of the saved retail rug. Fitting
that reversed correspondence reproduced the rug but projected source origin
`(0,0,0)` near pixel `(634,670)`, about 187 pixels right of the first PC.
Moving only Fireball to compensate would hide the frame defect and make models,
lights, actors, and other VFX disagree.

With the production X mirror applied once, the retail correspondences are:

| Effective Three world `x,y,z` | Retail pixel `x,y` |
| --- | --- |
| `2.32, 0.01, 8.86` | `254, 131` |
| `2.11, 0.01, 3.58` | `207, 384` |
| `-3.32, 0.01, 3.54` | `816, 384` |
| `-3.16, 0.01, 9.02` | `696, 131` |
| `0, 0.01, 0` | `447, 730` |

A constrained perspective fit reaches approximately `4.65 px RMS` over all
five points, `5.18 px RMS` over the rug, and `0.69 px` at the source origin.
The same fit was not possible with the omitted frame mirror.

## Scope and status

- Apply the mirror only at the standalone proof render-frame boundary.
- Keep the canonical Aurora-space VFX converter and production Area frame
  ownership separate; production Area VFX must not receive a second mirror.
- Keep source effect origin at local `(0,0,0)`.
- Keep camera, full scene, and owner/target parity explicitly unproven until a
  complete retail scene and exact native camera transform are recovered.
- Reuse the saved NWN MP4. Capture exactly one fresh Web playback after the
  implementation and compare it to that recording.

## Fresh v68 proof result

The one-playback v68 packet validates the render-frame correction. Web MP4
SHA-256 is `9b251eb51632d6272b5aa1b9087c78a49d864a01d9362e4230150a0ddb5e48ac`;
the saved NWN MP4 was reused without rerun. The onset-aligned comparison
SHA-256 is `09afb69c0500d13749ebbb470a1f38d12f7bc5ab1b89a6d2bfea67aa35b67c59`
and the contact-sheet SHA-256 is
`1879d8b277f8afadb27aad2efa439bb823bc3c47238d8561a9b655799a177a0f`.

Identity, host graph, asset settlement, draw ledger, playback guard, and proof
gate pass with an empty blocker manifest. The source impact is no longer
horizontally displaced. Visual parity remains open because peak clipping,
orange-red decay, smoke/Chunk residue, exact camera/actors, five tile
source-light transforms, six main-light lanes, wall/ceiling fade, SSAO, and
retail RNG still differ or remain unproven. Detailed audit:
`vfx-row22-v68-proof-comparison-audit-2026-08-07.md`.
