# ProgFX Type 7 root-arc lifetime audit (2026-08-12)

## Status

- Aurora-first semantic audit: complete.
- Shared Type 7 correction: implemented.
- Row 216 static and live visual proof: pending regeneration after this change.
- xoreos: not consulted.

## Question

The saved NWN row 216 proof places the left Fire Lash strand above the right
strand. Aurora Web placed the right strand above the left even though the
binary MDL emitter transforms, parent composition and proof-frame handedness
were preserved. The remaining unknown was whether the root rotation written by
`Gob::ReattachReference` persists for the full beam lifetime.

## Primary Aurora evidence

Audited executable:
`C:\Program Files (x86)\Steam\steamapps\common\Neverwinter Nights\bin\linux-x86\nwmain-linux`.

The recovered call and state sequence is:

1. `CNWCVisualEffectOnObject::AttachBeam` at `0x815a70` attaches the beam Gob
   to the source part and reattaches its reference children to the target.
2. `Gob::AttachToPart` at `0x43e2a0` immediately copies the source part world
   position and orientation into the beam Gob. Mode zero creates a
   `CAurBehaviorAttach` behavior.
3. `Gob::ReattachReference` at `0x43fc50` computes
   `RotationArc(currentRootZ, target-source)` and writes `qArc * qRoot` to the
   beam Gob. This is a one-time attach operation.
4. The `CAurBehaviorAttach` constructor at `0x4a2d50` also copies the attached
   source part world position and orientation into the Gob.
5. `CAurBehaviorAttach::Control` at `0x4a2810` obtains the attached part world
   transform on every control tick and writes its position and orientation
   directly to the Gob. It does not reapply `ReattachReference` or
   `RotationArc`.
6. `CAurBehaviorAttach::UpdateGobPosition` at `0x49f470` performs the same live
   source-part copy for dependency updates.

Therefore `qArc * qRoot` is an attach-time transient. From the first behavior
control onward, the beam root follows the live source-part orientation. The
target still comes from the reattached external reference; this correction
does not restore the saved local `OmenRef` as the P2P target.

## Aurora Web mismatch

Aurora Web recomputed `qArc * qSource` for every sampled runtime time. For row
216 that continuously rotated both authored emitter families toward the
target, reversing their small forward-component difference: the right strand
overshot above the left. Camera variants did not change this ordering, so a
screen-space X flip was not justified.

## Correction

`resolveEffectBeamType7RootTransform` now receives runtime time explicitly:

- at `t <= 0`, it produces the attach-time `qArc * qSource` transform;
- at `t > 0`, it uses the live source attachment position and orientation
  directly, matching `CAurBehaviorAttach::Control`.

This is shared ProgFX Type 7 behavior. It contains no row 216 angle, side,
camera or emitter-name special case.

## Regression contract

The application test uses an identity source orientation and a target on
Aurora `+X`, making the attach arc non-identity. It asserts that:

- runtime frame zero contains the composed attach arc;
- after live ticks, the root arc is gone while the animated source attachment
  position remains current;
- Type 7 external-target and model-node attachment diagnostics still pass.

The test failed against the former continuous-arc implementation and passes
after the shared correction.

## Proof policy

The saved one-trigger NWN MP4 remains the immutable retail oracle and must not
be replayed. A static Aurora Web candidate is inspected first. Only an accepted
candidate may receive one fresh 20-second Web playback and an onset-aligned
comparison against the saved NWN MP4.
