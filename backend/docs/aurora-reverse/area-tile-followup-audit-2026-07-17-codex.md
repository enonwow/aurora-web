# Area / tile follow-up audit — 2026-07-17

## Scope

Continuation of task `019f6a87-6584-7a70-a815-4b0ab316b4a7`: Area loading, `.SET` resolution, tile authoring, and the texture-quality question.

## Verified fixes

### Sounds no longer block the initial Areas workflow

Areas Mode used to load the complete paginated backend sound catalog just because the mode allowed the `sounds` family. It now requests that catalog only after the user selects **Sounds** in the Areas add-object panel. Sounds Mode retains its normal catalog loading.

Verification:

- Focused frontend test: `WorkspaceLayout.viewportWiring.test.tsx -t "defers the Areas Mode sound catalog"` — passed.
- `frontend npm run build` — passed.

### Real `.SET` lookup for Tile_ID 607 resolves through HAK layers

`area_wnd_warehouse_04` contains four real instances of `Tile_ID=607`. Each resolves to:

- `tilesetResRef: tni01`
- `modelResRef: gni01_l01_10`
- `modelSource: set-tile-section`
- `imageMap2D: mi_gni01_l01_10`

The model process contract is ready: MDL source, GLB geometry, material binding, renderer handoff, and seven material texture assets have no blocker.

### Real Area renderer is ready and uses the mapped materials

The final runtime capture is the real module Area `area_claude_pr_01` — `Ostatnie Miasto - Slumsy, Klitka Mokrego Kostka`, tileset `tni01`, 2x2. It reports:

- 4 tiles / 4 contracts / 4 loaded / 0 failed / 0 bridge;
- 4 material contracts applied / 0 material failures;
- 11 visible meshes;
- ready GLB, MDL and material stages for both candidate models.

Artifacts:

- `.codex-tmp/area-goal-20260717/tni01-claude-terrain-warm.canvas.png`
- `.codex-tmp/area-goal-20260717/tni01-claude-terrain-warm.frame.json`

## Tile authoring: prior proof reclassified

The local Crystal replacement proof remains useful (`173 -> 118`, exact undo/redo), but it is a transient `localBlank: true` Area and is not used as the real-Area acceptance evidence.

Two isolated browser captures exercised the real module Area `area_claude_pr_01`; neither persists a module-file change:

- **Edit:** `tile-properties` selected cell `(0,0)` and changed `mainLight1` from `5` to `6`. It proved an exact one-command history delta, unchanged structural tile fields and all other cells, then exact undo and redo.
- **Placement:** `drag-terrain` performed a trusted browser drag over valid terrain cells. It changed three cells (`94, 94, 94` to `713, 713, 710`), produced exactly one history command, and proved exact undo and redo.

They completed with 4/4 tile models loaded, 0 model failures, 4/4 material bindings applied, and 0 material failures. **They are not accepted as real-Area authoring proof anymore.** Their scenario runner forced `terrain-only`, so the 63 GIT objects were hidden and its post-action camera could fall back to perspective orbit. Tile settlement alone is not Area settlement.

Artifacts:

- `.codex-tmp/area-goal-20260717/tni01-real-tile-properties-scheduled.canvas.png`
- `.codex-tmp/area-goal-20260717/tni01-real-tile-properties-scheduled.frame.json`
- `.codex-tmp/area-goal-20260717/tni01-real-tile-placement-scheduled.canvas.png`
- `.codex-tmp/area-goal-20260717/tni01-real-tile-placement-scheduled.frame.json`

## Texture-quality assessment

The visible grain in the Crystal proof is not a missing texture or a browser filtering fallback. The HAK source asset `atj01_grass02` is a native Aurora TPC texture: 128x128 DXT1, 10,956 bytes including mip data. The renderer uses sRGB, linear filtering, trilinear mipmaps, and anisotropy.

The real `tni01` materials are different source assets: 512x512 compressed Aurora maps (about 174.8 KB each). The runtime contract confirms the expected bindings, including `tni01_lwalls` and `tno01_wood05`; it has no failed texture binding. Therefore smoothing or upscaling the Crystal tile would reduce source fidelity and is not justified.

## Direct Aurora comparison â€” partial result, then named Web blocker

The old Toolset access-violation gate was recovered without touching `nwtoolset.ini` or moving any module data destructively. The stale Toolset `temp0` directory was archived to `backend/docs/aurora-reverse/artifacts/last-city-apartment-area/toolset-temp0-2026-07-17T11-48-36-635Z-tni01-toolset-compare-preflight`; the canonical Toolset session then opened the approved module and captured the exact Area:

- Toolset capture: `.codex-tmp/area-goal-20260717/toolset-kiltka-session/captures/007-claude_pr_01.png`
- Toolset manifest: `.codex-tmp/area-goal-20260717/toolset-kiltka-session/manifest.json`
- Status: `captured`; expected module and `claude_pr_01` both matched; no AV.

The native Toolset image shows the complete furnished 2x2 room. The earlier Web tile captures are deliberately `terrain-only`: that mode suppresses all 63 GIT objects, so it is valid proof for tile add/edit but cannot be called full-room visual parity.

I then ran a normal Web capture (objects enabled and ceilings requested). It opened the same Area and started a `placeableRenderPayloadBatch` request for 44 unique payload lookups, but after 115,913 ms it was still in flight with zero response. The tile contracts had completed (4/4), while the Area runtime snapshot never settled and no full Web screenshot was emitted. This is the exact blocker, not a texture conclusion:

- Failure proof: `.codex-tmp/area-goal-20260717/tni01-claude-full-toolset-compare.failure.frame.json`
- Blocker: `areas_runtime_snapshot_stale_or_missing`
- Network evidence: one `placeableRenderPayloadBatch`, 44 items, zero responses, one request still in flight after 115,913 ms.

Therefore the current evidence supports two conclusions:

1. The source texture grain is authentic Aurora compression; no smoothing/upscale fix is warranted.
2. Full Toolset-vs-Web room parity is **not passed**. The immediate functional gap is the stalled Area placeable-payload batch. The terrain-only view must not be used to hide it or to claim parity.

The Toolset session remains open for the subsequent fixed-Web capture.

## Corrected authoring acceptance gate

The runner now fails closed for a real Area authoring scenario:

- it forces full object visibility rather than `terrain-only`;
- it waits for the shared object renderer as well as tile models before the mutation;
- after the mutation it reapplies the requested top-down camera and rejects the proof unless the final runtime reports `top_down_oracle`.

The first rerun after this change did **not** run a tile mutation: it stopped with `areas_runtime_snapshot_stale_or_missing` while the canvas still exposed `blank_builder_v1`, rather than the selected `claude_pr_01`. This is the intended fail-closed result; it is not reported as an edit/add success.

- Gate proof: `.codex-tmp/area-goal-20260717/tni01-real-authoring-gate-after-fix.failure.frame.json`

## Remaining gates / named blockers

1. **Area load before authoring:** full Area readiness is not established. One full capture left 44 unique placeable payload lookups in flight beyond 115 seconds; the next gated authoring attempt never reached `claude_pr_01` on the canvas. No add/edit scenario may be accepted until the scene id, 63 object payloads/models, and camera all settle.
2. **Area-list performance:** a fresh Areas session exposed only the first 100 of 169 rows after 30 seconds. Identity-based opening avoids premature filtering, but the paging latency remains a workflow-performance issue.

## Next acceptance proof

Keep the existing Toolset session open, repair the stalled payload batch, then capture `claude_pr_01` again with all object layers enabled and equivalent top-down framing. Only then rerun tile edit and placement; neither is currently complete as a real-Area acceptance gate.

## 2026-07-17 continuation: full Area payload repair proof

The stalled payloads were not a camera-only or texture-only symptom. The catalog loader read only the first `placeables.2da` source, so a partial stronger layer hid appearance rows supplied by later configured HAK layers. It now reads the complete ordered source stack and keeps the first definition for each appearance id (the strongest layer still wins).

One remaining source object, GIT door `obj_dr_drzwi` (`drzwi001`), exposed a second real contract gap. Its GIT and UTD omit `GenericType`. The Aurora decompilation establishes that a door object initializes that value to `0` and only overwrites it when `GenericType_New` or `GenericType` is present (`C:\Projects\New Folder\export\decompiled_all.c`, `FUN_0055a0b8` and `FUN_0055aba0`). The Area parser now preserves that authoritative default. Retail `genericdoors.2da` row 0 resolves to `T_DOOR01`; no arbitrary model fallback was introduced.

Isolated backend proof (patched build, port 3002):

- `obj_dr_drzwi` is returned with `appearanceType: 0`, `genericType: 0`;
- its payload is `ready`, resolves `t_door01`, and has eight source asset contracts;
- the complete real object batch for `area_claude_pr_01` returns **63/63** `ready` payloads with a renderable asset and no non-ready entries.

The cold full batch took **146,844 ms**. This removes the model-resolution blocker, but establishes a separate performance constraint: browser proof must use a timeout that exceeds that real full-Area preparation cost. No CUD proof is promoted by this backend result alone; it still requires the patched backend to be the active Web target, a full browser screenshot with `top_down_oracle`, and then mutation plus exact undo/redo proof.
