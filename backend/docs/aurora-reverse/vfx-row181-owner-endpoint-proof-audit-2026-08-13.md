# Row 181 Type 10 comparison and rejected endpoint-proof audit

Date: 2026-08-13

## Scope

This audit compares the saved one-trigger NWN retail capture for
`visualeffects.2da` row `181` (`VFX_IMP_MIRV`) with one current Aurora Web
playback. It validates the shared ProgFX Type 10 owner trajectory after the
retail-client timing correction at the implementation/fixture level. The saved
NWN video has no hash-bound trigger-to-video or owner-endpoint timestamp, so
the side-by-side media remains diagnostic and does not prove temporal, endpoint,
or pixel parity.

## Aurora-first basis

- Primary binary: retail `nwmain.exe`, SHA-256
  `3b7cb1252e0edb2ce22d7971f333aade027039ae30a45b4bc64732c3e6bec73a`.
- Type 10 audit: `vfx-progfx-type10-log-timing-correction-audit-2026-08-13.md`.
- Recovered path-4 formula:
  `speed = 1.5 + 3 * logf(distance)` and
  `durationMs = trunc(distance / speed * 1000)`.
- The exact fixture distance is `3.0` Aurora metres, producing a native owner
  duration of `625 ms`.
- xoreos was not used.

## Bound inputs

- Saved NWN MP4 SHA-256:
  `b6106159ad902a281fa245331bf92a366b1199a650c2d2a71909f569e71ed7c6`.
- NWN validated summary SHA-256:
  `cb45bbe2f7418d753c2be5e955c6a910d617f019300c8ac191f9dd176c403bfb`.
- Current Aurora Web MP4 SHA-256:
  `cb580ffc541df6c3fd6ce2f3a79badd18e5c59c335e7dca077755785ccdf33af`.
- Aurora Web summary SHA-256:
  `099098421b1c6247aff2c4bb3ad922cacafd3b90a0edb8c351d9d085240076d5`.
- Fixture manifest SHA-256:
  `8ea495c2753e5a0649574f835c9d054086105336a63c960b593b1ade975a3b1c`.
- Fixture payload SHA-256:
  `40f178a8ee340122a326f86d78c9958fda4b10cd59ba03f37424d6e8b28b3237`.

The Web packet records matching frontend/backend build identity, one trigger,
loop disabled, zero overlap, settled assets, the canonical three-emitter plus
light host graph, a passing draw ledger, an empty proof blocker manifest, and
a clean hidden post state.

## Alignment audit and rejection

The historical v2 comparison aligned the first threshold-visible NWN frame
with the first non-zero Web draw/light sample. That method is rejected for
trajectory timing because visibility depends on capture rate, alpha,
luminance, bloom, and threshold selection.

The attempted v3 correction treated `lastVisibleVideoSeconds` at
`15.166104959 s` as the owner destination. This is invalid: the NWN validator
defines that field only as the final frame above a global pixel-difference
threshold. It has no projectile tracker, target ROI, or owner endpoint event.
V3 is therefore rejected as temporal or endpoint proof by the hash-bound
`nwn-vs-aurora-web-row181-log-distance-owner-endpoint-aligned-v3-20260813-rejection.json`.

V4 returns to threshold-visible alignment solely for visual diagnosis. It
records the NWN frame period of about `120.37 ms`, the Web frame period of
`83.33 ms`, the actual selected comparison-frame PTS, and the dependence on
alpha, luminance, bloom, and threshold choice. Output resampling to `30 fps`
does not add timing evidence.

## Artifacts

- Diagnostic v4 side-by-side MP4 SHA-256:
  `8866fb8a3595360e31feac012841b0a8e747b6313999dc3c8363fa30c3dc1a87`.
- Contact sheet SHA-256:
  `33a797f6d90546ac87383ba28999bed34e942fb04c889ccdad469436a9e11e61`.
- Comparison manifest SHA-256:
  `ad726e0ee98312004705980651f59ff4bb5170144c30c3054cc6cbc2588daacc`.
- Manifest:
  `evidence/vfx-nwn-broad-proof-2026-07-16/comparisons/nwn-vs-aurora-web-row181-visible-window-diagnostic-v4-20260813.json`.

The v4 manifest also binds the NWN preflight, original capture summary,
validated summary, trigger ledger, both scripts, module identity, run ID, video,
Web summary, fixture manifest/payload, generator, ffmpeg, fonts, and library
versions. It carries the Web runtime's own `diagnostic-only` readiness and the
three open blockers: camera match, scene match, and owner-target match.

No NWN process was started. The saved NWN MP4 was reused. Aurora Web was
triggered exactly once for the accepted current-runtime capture; comparison
generation decoded the two saved files and did not retrigger either runtime.

## Verification

- Focused Type 10 backend unit suites: `62/62` passed.
- DI startup regression suite: `10/10` passed.
- Frontend comparison-runner suite: `30/30` passed.
- Frontend canonical renderer suite: `69/69` passed.
- Exact row-181 source-scene fixture gate: four admitted tiles, zero unresolved
  tiles, one actor, and fourteen textures.
- Backend production build: passed.
- Frontend production build: passed; only the pre-existing Vite chunk-size
  advisory was emitted.
- Comparison generator Python syntax gate: passed.

## Verdict

Status:
`diagnostic-only-open-camera-scene-owner-target-and-temporal-alignment`.

The source/target distance, owner path direction, disassembly-backed owner
duration, one-trigger lifecycle, and clean Web post state are source- or
contract-bound implementation facts. The `625 ms` timing correction remains
accepted from retail-client disassembly plus the exact fixture. Destination
time and temporal parity are not matched by this video and must not be inferred
from first- or last-visible pixels.

The comparison still shows material and particle-silhouette differences. The
Web trail is more discretely separated and its core/light presentation differs
from retail. Exact source-player appearance, the internal Aurora camera matrix,
alpha/HDR response, bloom, source-light spill, and particle silhouette remain
open. These gaps require shared renderer evidence or a primary Aurora audit;
they do not authorize row-181 constants.

## Next implementation boundary

1. Keep the Type 10 owner trajectory and `625 ms` fixture result fixed.
2. Audit shared particle alpha/HDR and local-light presentation before changing
   trail appearance.
3. Reuse this saved NWN oracle and generate only one new Web playback after a
   source-backed shared renderer change.
4. Preserve v2 and rejected v3 only as historical diagnostic evidence; v4 is
   the current honest visual diagnostic and is not a parity or timing oracle.
