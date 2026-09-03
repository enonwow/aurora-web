# VFX row 22 proof-scene parity readiness audit (2026-07-20)

## Scope

This Aurora-first audit separates capture integrity from visual parity for the
row 22 Fireball comparison. It classifies shared proof-scene gaps that affect
the apparent result of every VFX rendered in the same harness.

No xoreos source was used.

## Primary evidence

- Saved single-trigger retail video:
  `backend/docs/aurora-reverse/evidence/vfx-nwn-web-row22/nwn/nwn-row22-one-trigger.mp4`.
- Saved retail ARE and exact tile resources under:
  `backend/docs/aurora-reverse/evidence/vfx-nwn-web-row22/sources/`.
- Current row 22 fixture manifest:
  `frontend/public/dev-fixtures/vfx-nwn-web-row22/manifest.json`.
- Aurora mesh parser:
  `C:/Projects/New Folder/export/decompiled_all.c:885301-885528`.
- Aurora tile-light construction:
  `C:/Projects/New Folder/export/decompiled_all.c:453281-453602`.
- Local tile-light audit:
  `backend/docs/aurora-reverse/vfx-row22-local-tile-lighting-audit-2026-07-20.md`.

## Confirmed comparison-context gaps

1. The exact retail camera pose was not persisted by the saved NWN capture.
   The Web camera is an inferred oblique pose, not a recovered camera matrix.
2. The Web proof scene intentionally applies
   `meshFilter=horizontal-floor-receivers`. It renders source-backed floor and
   rug receivers but omits the remaining tile geometry.
3. Aurora mesh `tilefade` is preserved source metadata. The current
   decompilation evidence does not prove a complete camera-relative runtime
   fade formula. Removing the floor-only filter and inventing a Web fade would
   violate Aurora-first.
4. Owner/target scene parity is not established for the saved retail frame.
5. Local tile lighting is partial: one source-node carrier is reconstructed,
   five source references remain unresolved, and six static main-light lanes
   remain metadata-only.
6. The saved NWN video has no accepted per-frame runtime timestamps. It can
   support qualitative morphology and phase-order comparison, but not duration
   or synchronized-tail claims.

These are shared context defects. They can alter brightness, occlusion,
contrast, apparent direction, scale, and silhouette for every tested VFX even
when that effect's own source lifecycle is correct.

## No-guessing boundary

- Do not synthesize point lights for static main-light lanes.
- Do not place unresolved source lights at tile centers.
- Do not remove the floor-only filter until retail wall/ceiling visibility and
  fade semantics are recovered.
- Do not tune emitter alpha, lifetime, spread, or atlas behavior to compensate
  for an unmatched camera or scene.
- Do not promote the technical runtime proof gate to a visual-parity result.

## Implemented diagnosability

`NwnVfxComparisonRunner` now exposes a separate visual-parity readiness lane.
It is independent of `aurora-vfx-runtime-observability/v1`, whose proof gate
validates build identity, host graph, assets, draws, single playback, and final
overlay state.

The visual-parity lane fails closed to `diagnostic-only` when any of these are
unproven:

- camera match;
- scene match;
- owner/target match;
- full scene geometry without the floor-only filter;
- resolved tile source lights;
- reconstructed static tile main-light lanes.

For the current row 22 manifest the blocker manifest is:

```text
camera-match-unproven
scene-match-unproven
owner-target-match-unproven
proof-scene-floor-receiver-filter-active
tile-source-lights-unresolved:5
tile-main-lanes-unreconstructed:6
```

## Verdict

Current row 22 artifacts remain valid single-playback diagnostic proof. They
are not visual-parity proof. The remaining broad mismatch cannot be attributed
to Fireball alone until the shared camera, scene, actor, and tile-light context
lanes are closed with primary Aurora or retail evidence.
