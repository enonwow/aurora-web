# Placeable lighting matched retail parity admission contract v1

Date: 2026-08-19

Status: implemented statically; execution and live proof remain paused by the
resource-safety gate.

## Decision

An Aurora Web capture cannot promote itself to NWN retail parity. The central
CDP capture remains a Web evidence artifact with
`captureIntegrityAccepted=true`, `retailParityAccepted=false`, and, for the
Area placeable-lighting route, legacy `accepted=false`.

Parity is admitted only by the independent post-capture validator:

`backend/scripts/validate-placeable-lighting-matched-retail-parity.mjs`.

The validator has two non-live commands:

1. `compare` re-hashes and binds the exact AUR-S07 packet, exact Web capture,
   immutable fixture/resource lineage, matched comparison profile, and frozen
   tolerance policy. It writes an exact NWN-left/Web-right image, a heatmap,
   and objective feature metrics. It always keeps
   `retailParityAccepted=false` because machine metrics are not visual
   acceptance.
2. `admit` consumes the immutable comparison report and a separate human visual
   review bound by SHA-256 to both the report and side-by-side image. It may set
   `retailParityAccepted=true` only when every provenance, freshness,
   comparability, metric, forbidden-artifact, and visual-similarity gate passes.

Neither command starts Toolset, NWN, Chrome, a backend, or a frontend. The
validator is not a capture route or a replacement for AUR-S07.

## Exact v1 fixture

Version 1 is intentionally narrow and fail-closed:

- fixture: `als-oracle-campfire-v1`;
- MOD SHA-256:
  `29e158317794d6519e2a807cec5ce4bfd4b025be33886694b1340515d9c94604`;
- Area: `als_light_lab`;
- entry point: `[65, 55, 0]`;
- `als_shcamp.nss` placeable position: `[65, 65, 0]`;
- matched capture time: `1.0` second, from the driver's
  `DelayCommand(1.0, AlsCaptureCue(...))`;
- native camera command: `SetCameraFacing(0.0, 10.0, 45.0)` from
  `AlsCamera()`;
- ordered HAK list: `[]`;
- placeable: `plc_campfr`, appearance `58`, model `plc_i06`;
- vanilla `plc_i06.mdl` SHA-256:
  `144d84a94f1039e1031ea6949098c0106ac81f96794df308853a28dd757d1db4`;
- vanilla receiver source MDL SHA-256:
  `08c7810e8faf1ba4d4730cf14c8fb2737cf5f695e02e3d4f38d0e51f086da44d`;
- derived receiver GLB SHA-256:
  `0c8a58aa3f6643f09dfe888ce82cf82da25cfb2a184b31ad534b0e7425161cd1`;
- vanilla receiver DDS SHA-256:
  `dae40e6294f63ac13ced7de4e138b32c57ef99357a291f2664178ed8a8ed7eb7`.

A different module, HAK order, Area, receiver, placeable model, or source hash
requires a new versioned profile and audit. It must not be accepted by editing
the v1 constants.

## Input contracts

### Matched comparison profile

Version: `aurora-placeable-lighting-matched-retail-parity-profile/v1`.

The profile binds by path and SHA-256:

- an accepted `aur-s07-runtime-profile/v1`;
- an `aur-s07-runtime-packet/v1`;
- saved output of the central AUR-S07 `validate` command with
  `status=verified` and the same profile id;
- the NWN PNG which is the packet's exact `runtime-capture` artifact;
- the fresh Aurora Web CDP frame JSON and its exact screenshot PNG;
- a frozen visual-similarity policy;
- exact viewport, camera/alignment mode, deterministic timeline, and renderer
  profile.

The Web frame must have `captureIntegrityAccepted=true`, the immutable oracle
fixture echoed by the route and DOM, exact source/terrain lineage gates at
`pass`, the v2 placeable-lighting proof snapshot, all required renderer assets
settled, an actual reactive Area receiver, exactly one source light, no debug
receiver, no unlit/unknown receiver material, `halo=false`, `vfx=true`,
`postprocess=true`, and no
placeholder/debug/procedural substitute admitted as evidence. A combined frame
may retain only the snapshot blockers that state VFX, shadow, or postprocess is
enabled; receiver, halo, source-light, or settlement blockers are forbidden.

### Frozen tolerance policy

Version: `aurora-placeable-lighting-visual-similarity-policy/v1`.

The policy must have `status=frozen-before-parity-tuning`: it is frozen from
repeated retail observations before the next Web change is selected from a
comparison failure. This does not retroactively relabel earlier implementation
work as oracle-driven. The policy must bind at least two distinct NWN oracle
PNG SHA-256 values. It defines pixel ROIs and tolerances for exactly these
features:

- `flameCore`;
- `additiveGlow`;
- `receiverFootprint`;
- `backgroundExposure`.

The validator computes mean/p95/peak luminance, normalized mean RGB, warm
chroma, bright-pixel ratio, and bright-component apparent bounds. The policy
selects the applicable deltas per feature and supplies their maximum values.
There are no built-in retail pass thresholds. Missing, malformed, unbounded,
post-failure-loosened, or single-capture policies fail closed.

### Human visual review

Version: `aurora-placeable-lighting-human-visual-review/v1`.

The review binds the comparison report and side-by-side PNG SHA-256. It must
record `verdict=passed`, readable target and effect, and `similar` for flame
core, additive glow, warm receiver footprint, hue, apparent scale, and
background exposure. It must explicitly reject placeholders, selection
overlays, debug receivers, procedural halos/substitutes, blank/failed/bridge
tiles, and stale artifacts.

## Output contracts

`compare` writes into a previously absent owned directory:

- `nwn-vs-aurora-web-side-by-side.png`;
- `nwn-vs-aurora-web-heatmap.png`;
- `matched-comparison.json` with version
  `aurora-placeable-lighting-matched-comparison/v1`.

Even when metrics pass, the comparison report contains:

```json
{
  "captureIntegrityAccepted": true,
  "retailParityAccepted": false,
  "canonicalParityPromoted": false,
  "status": "metrics-within-frozen-tolerance-awaiting-visual-review"
}
```

`admit` writes a previously absent
`aurora-placeable-lighting-matched-retail-parity-admission/v1` JSON. Only a
fully passing result may contain:

```json
{
  "proofCompleteness": "verified",
  "modelVisibility": "visible",
  "captureIntegrityAccepted": true,
  "retailParityAccepted": true,
  "canonicalParityPromoted": true,
  "accepted": true
}
```

Every failure writes the same schema with `accepted=false`, parity fields
false, exact blocker codes, and a resume condition. A failed admission never
modifies the source Web frame, AUR-S07 packet, comparison report, or review.

## Freshness and comparability gates

All gates are mandatory:

1. The AUR-S07 profile, packet, validation result, runtime observation, and
   runtime capture bind the same MOD hash, Area, entry point, fixture, and
   empty ordered HAK list.
2. AUR-S07 reports the model visible, non-blank, and non-placeholder.
3. The Web frame is a fresh exact CDP Area capture with all capture-integrity
   gates passed and exact retail object/receiver lineage.
4. NWN and Web PNGs have identical dimensions and match the profile viewport.
5. Camera/alignment and deterministic timeline are explicitly `matched`; a
   diagnostic auto-fit or unreviewed affine transform cannot pass v1.
6. The alignment artifact marks both captures fresh, defines a bounded capture
   skew no larger than 24 hours, and both bound timestamps fit that budget.
7. The frozen policy predates both captures and Web tuning and is derived from at least two
   distinct retail oracle captures.
8. Every required feature metric is inside its frozen tolerance.
9. The exact derived images and report are hash-bound to the visual review.
10. Human inspection accepts all required similarity features and rejects every
   forbidden artifact.

## Size and execution budget

- profile, policy, review, comparison, and admission JSON: at most 256 KiB each;
- input PNG: at most 32 MiB each and at most 4096 x 4096;
- engine/load log: at most 4 MiB;
- no network, streaming, browser, runtime process, retry, or overwrite;
- one synchronous offline comparison at a time;
- output paths must not exist before their creating command.

These limits are independent from the repository-global live limits. During
the current resource pause the validator and its tests must not be executed.
