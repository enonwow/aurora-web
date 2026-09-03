# VFX WOK AABB runtime traversal audit (2026-08-07)

## Scope

This audit closes the Aurora-first runtime-consumer and traversal-order gap for
the source AABB tree carried by an ASCII WOK `node aabb`. The result applies to
the shared static-WOK collision path used by every VFX family, including VFX
hosted by placeables. It does not claim that Aurora Web serializes or rebuilds
Aurora's separate world-scene plane BSP.

## Sources

- Primary decompilation: `C:\Projects\New Folder\export\decompiled_all.c`
- Decompilation SHA-256:
  `36BB8B1031AFE2ABF23F0E18180A5AD649401D9EA5E078E5170A31A96167C572`
- Admitted executable:
  `C:\Program Files (x86)\Steam\steamapps\common\Neverwinter Nights\bin\win32\nwtoolset.exe`
- Executable SHA-256:
  `4C156DE898817518E8A97F5D989592894D3C8F48B71D27E2A8B89500CD230F24`
- Secondary GPL references: none.

## Recovered call path

1. `PartEmitter` collision update calls the active scene virtual slot `+0x2c`
   at `nwtoolset.exe:0x00a2d465` after resetting the shared query helper.
2. Scene vtable `0x00d03978` resolves that slot to `FUN_00a7b8bc`. It first
   traverses Aurora's world-scene plane BSP through `FUN_00b2e294`, with
   `FUN_00a8fa78` testing candidate scene parts.
3. The `PartAABB` scene-part vtable at `0x00cc633c` uses common hierarchy
   collision method `FUN_00a51ef8` in slot `+0x1c` and AABB-specific method
   `FUN_00a51e10` in slot `+0x20`.
4. `FUN_00a51e10` transforms the segment into model-local coordinates, builds
   one direction bit for every axis, obtains the model AABB root from model
   field `+0x274`, and calls `FUN_00a51950`.
5. The runtime tree loaded by `FUN_00a3d188` has float32 bounds at `+0x00` to
   `+0x14`, child pointers at `+0x18/+0x1c`, signed face index at `+0x20`, and
   plane mask at `+0x24`. `FUN_00a3ec10` preserves the serialized child order.

## Exact source-tree behavior

- `FUN_00a51e10` sets direction bits `1/8`, `2/16`, and `4/32` for positive or
  non-positive X, Y, and Z segment direction respectively. Equal coordinates
  select the negative-direction bit.
- `FUN_00a51950` first applies Aurora's conservative segment/AABB broad test.
- A face index of `-1` selects an internal node. In the VFX path the admitted
  binary's zero-initialized `DAT_00cc3e54` branch is active; no write from the
  recovered VFX call path precedes the traversal.
- When `(planeMask & directionMask) == 0`, the second child is visited before
  the first. Otherwise the first child is visited before the second.
- Both children are visited. A successful leaf shortens the shared endpoint to
  the contact before the next child is tested. A later equal-distance contact
  can therefore replace the earlier contact.
- A leaf tests only its referenced face. It does not fall back to scanning all
  faces in the model.

## Authorized implementation boundary

Aurora Web may now traverse a valid parsed WOK AABB root with the recovered
direction mask, child ordering, conservative bounds test, and shared endpoint
shortening. The existing flat triangle scan remains an explicit compatibility
fallback only for source nodes that do not carry an AABB tree. Cross-instance
selection remains closest-contact based because the native world-scene BSP is
not part of the current area collision contract.

This evidence does not authorize inventing a world BSP builder, changing face
material masks, or applying effect-specific collision exceptions.

## Implementation

- `aurora-wok-walkmesh.ts` maps each world-space query into WOK node-local
  coordinates before applying the parsed source tree.
- Complete decoded AABB trees use the recovered direction mask, child order,
  conservative bounds test, leaf-only face selection, and shared shortened
  endpoint. Older additive v1 payloads without decoded AABB fields retain the
  explicit flat compatibility route.
- The final hit position and normal are mapped through node axis-angle, node
  position, ARE `4 - Tile_Orientation`, and area translation. Cross-instance
  selection remains closest-contact based.
- The change contains no row, model, emitter-name, Fireball, or host-kind
  condition. Placeable-hosted VFX enter the same area collision service.

## Regression

- A WOK tree containing only a leaf for face zero does not collide with a
  segment that reaches only unreferenced face one.
- A positive-Z segment with a positive-Z plane mask visits first child then
  second child; two equal contacts leave the second face as the final result,
  proving shared endpoint mutation instead of a flat first-hit tie rule.
- Existing node orientation, area quarter-turn, object VisualTransform, static
  miss, and malformed-source diagnostics remain covered.

## Verification

- WOK parser/runtime tests: `13/13` passed.
- VFX HTTP schema tests: `11/11` passed.
- Shared VFX runtime tests: `95/95` passed.
- Backend TypeScript check: passed.
- Backend production build: passed.

This slice changes collision selection only when a runtime query reaches a WOK
tree.

## Fresh row-22 proof

- The row-22 source scene was regenerated before capture. Its public payload
  SHA-256 changed from
  `669dd46d6b1a3e99f2128307351053b39c74777c51c42aa445040e99b58b8f9c`
  to
  `4d197b28e4ddea93a3bb65ddc7d6a5b77a271e1544e62faa30b7e6abff32b4b5`.
- Static preflight passed without playback hooks. Runtime observability
  reported matching build identity, a canonical host graph, settled assets,
  complete draw and particle-shader ledgers, one-playback guard readiness,
  an empty blocker manifest, and proof-gate `pass`.
- Fresh Web v78 records exactly one deterministic playback, no loop or
  overlap, a clean post-roll, and zero final particles for all six emitters.
  The MP4 is
  `evidence/vfx-nwn-web-row22/web/web-row22-one-trigger-v78-wok-aabb-runtime-20260807.mp4`
  with SHA-256
  `eece02bebf60f24ed62859efe2682a92186862fd517136b229478db0a0fb7a34`.
- The collision ledger records `1208` queries, `83` applied hits, `1125`
  source-backed static misses, and landed Chunk particle ids `2,3,4,8`.
- The approved one-trigger NWN MP4 was reused without rerun. Its SHA-256
  remains
  `f6414e0d184131ce74836c208e6334bb62cf023c502725223758185dd41f0983`.
- The onset-aligned comparison MP4 is
  `evidence/vfx-nwn-web-row22/comparisons/nwn-vs-aurora-web-row22-v78-wok-aabb-runtime-20260807-source-scene-onset-aligned.mp4`
  with SHA-256
  `f6fd88eba3b69d606fb012c3a6ece251acbcc183dedb2019fde84afeba3faa1c`.
  The comparison PNG SHA-256 is
  `c948f0a08d7f1e6a6f921dbe6357e31dfb9fa31d9be6b24c7efd3a34e12a722a`.

The packet status is
`diagnostic-only-single-playback-open-context-gaps`, not parity. The exact
retail camera pose, owner/target scene objects, full room, and one runtime
timestamp per saved NWN frame remain unavailable. The Web peak is still more
broadly overexposed and its red/smoke/Chunk progression remains visibly
different; those deltas do not authorize effect-specific timing or color
tuning.
