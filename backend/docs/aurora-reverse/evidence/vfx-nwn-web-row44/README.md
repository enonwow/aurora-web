# NWN / Aurora Web VFX row 44 comparison packet

## Status

`diagnostic-only`; this packet is not a valid parity proof.

The NWN trigger ledger records exactly one intentional `EffectVisualEffect(VFX_IMP_ACID_S)` invocation at `2026-07-14 10:28:30` local time. The NWN recorder did not acquire its first gameplay frame until about `5.1 s` after that trigger. The longest particle lifetime in the declared source model is `0.92 s`, so the NWN MP4 cannot contain an effect frame.

The NWN run was not repeated. The saved MP4 remains the immutable source for the contact sheet, extracted frames, and timeline.

## Implemented web side

- Backend-generated package from the declared `vim_explacid.mdl` source.
- Four ordered emitter runtimes: Fountain, Single, and two Explosion emitters.
- Twenty-five synchronized frames per emitter at 12 FPS over 2 seconds.
- One non-looping frontend playback root with exactly one visible frame at a time.
- Shared Explosion/wind-manager state and deterministic seed `440044`.
- Web MP4 contains baseline, one playback, and post-roll.

## Primary artifacts

- `fixture-manifest.json`: source/resource hashes and runtime contract.
- `nwn/preflight.json`: declared NWN fixture before launch.
- `nwn/trigger-ledger.json`: observed single trigger.
- `nwn/nwn-row44-one-trigger.mp4`: the only NWN recording.
- `nwn/nwn-all-frames-contact-sheet.png`: every NWN frame from that MP4.
- `aurora-web/aurora-web-one-trigger.mp4`: web lifecycle recording.
- `nwn/timeline.json` and `aurora-web/timeline.json`: frame timelines.
- `comparison-diagnostic-only.png`: honest side-by-side diagnostic.
- `comparison-result.json`: machine-readable invalidation reason and next allowed action.

## Next allowed action

Do not automatically rerun this fixture. A second NWN capture requires explicit user approval given after the existing MP4, and the trigger must be scheduled only after the recorder confirms stable gameplay.
