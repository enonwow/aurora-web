import {
  buildAuroraObjectDurationVisualOwnerContract,
  resolveAuroraObjectDurationVisualOwnerUpdateSchedule,
  sampleAuroraObjectDurationVisualOwner
} from "../../src/modules/vfx/domain/aurora-vfx-object-duration-owner-runtime";

describe("Aurora object-duration visual owner", () => {
  const contract = buildAuroraObjectDurationVisualOwnerContract({
    effectDurationMilliseconds: 20_000,
    impactMilliseconds: 300,
    durationAnimationMilliseconds: 1_666.67,
    cessationMilliseconds: 633.333,
    postRemovalMilliseconds: 3_000,
    sourceRowId: 1,
    sourceModelResRef: "vdr_darkness"
  });

  it("preserves the recovered Aurora owner timing contract", () => {
    expect(contract).toEqual({
      version: "aurora-object-duration-visual-owner/v2",
      sourceRowId: 1,
      sourceModelResRef: "vdr_darkness",
      effectDurationMilliseconds: 20_000,
      animationDurations: {
        impactMilliseconds: 300,
        durationMilliseconds: 1_666.67,
        cessationMilliseconds: 633.333
      },
      ownerTimers: {
        impactMilliseconds: 300,
        cessationMilliseconds: 633,
        postRemovalMilliseconds: 3_633
      },
      postRemovalDelayMilliseconds: 3_000,
      updateSemantics: "integer-delta-no-overshoot-carry",
      removalPacketOrder: "before-object-update",
      evidenceClass: "primary-aurora-runtime-audit"
    });
  });

  it("truncates source animation lengths to Aurora's integer owner timers", () => {
    const fractional = buildAuroraObjectDurationVisualOwnerContract({
      effectDurationMilliseconds: 20_000,
      impactMilliseconds: 300.999,
      durationAnimationMilliseconds: 1_666.67,
      cessationMilliseconds: 633.999,
      sourceRowId: 1,
      sourceModelResRef: "vdr_darkness"
    });

    expect(fractional.ownerTimers).toEqual({
      impactMilliseconds: 300,
      cessationMilliseconds: 633,
      postRemovalMilliseconds: 3_633
    });
  });

  it("derives exact quantized lifecycle boundaries for proof generation", () => {
    expect(
      resolveAuroraObjectDurationVisualOwnerUpdateSchedule(contract, {
        updateStepMilliseconds: 100
      })
    ).toEqual({
      updateStepMilliseconds: 100,
      impactTransitionAtMilliseconds: 300,
      removalProcessedAtMilliseconds: 20_000,
      ownerDoneAtMilliseconds: 20_600,
      releaseCompleteAtMilliseconds: 23_600
    });

    expect(
      resolveAuroraObjectDurationVisualOwnerUpdateSchedule(contract, {
        updateStepMilliseconds: 125
      })
    ).toEqual({
      updateStepMilliseconds: 125,
      impactTransitionAtMilliseconds: 375,
      removalProcessedAtMilliseconds: 20_000,
      ownerDoneAtMilliseconds: 20_625,
      releaseCompleteAtMilliseconds: 23_625
    });
  });

  it("switches on integer update boundaries and does not carry timer overshoot", () => {
    const sample = (time: number) =>
      sampleAuroraObjectDurationVisualOwner(contract, time, {
        updateStepMilliseconds: 100
      });

    expect(sample(100)).toMatchObject({
      phase: "impact",
      active: true,
      phaseElapsedMilliseconds: 100,
      animationTimeMilliseconds: 100,
      ownerTimerRemainingMilliseconds: 200,
      animationLoop: false
    });

    expect(sample(299)).toMatchObject({
      phase: "impact",
      ownerTimerRemainingMilliseconds: 100
    });

    expect(sample(300)).toMatchObject({
      phase: "duration",
      active: true,
      phaseElapsedMilliseconds: 100,
      animationTimeMilliseconds: 100,
      ownerTimerRemainingMilliseconds: 0,
      animationLoop: true
    });

    expect(sample(2_000)).toMatchObject({
      phase: "duration",
      phaseElapsedMilliseconds: 1_800,
      animationTimeMilliseconds: 133.33,
      animationLoop: true
    });
  });

  it("processes removal before the same frame's owner update", () => {
    const sample = (time: number) =>
      sampleAuroraObjectDurationVisualOwner(contract, time, {
        updateStepMilliseconds: 100
      });

    expect(sample(19_999)).toMatchObject({
      phase: "duration",
      active: true,
      effectRemovalStarted: false
    });

    expect(sample(20_000)).toMatchObject({
      phase: "cessation",
      active: true,
      phaseElapsedMilliseconds: 100,
      animationTimeMilliseconds: 100,
      ownerTimerRemainingMilliseconds: 533,
      postRemovalTimerRemainingMilliseconds: 3_533,
      removalProcessedAtMilliseconds: 20_000,
      animationLoop: false
    });

    expect(sample(20_500)).toMatchObject({
      phase: "cessation",
      active: true,
      phaseElapsedMilliseconds: 600,
      animationTimeMilliseconds: 600,
      ownerTimerRemainingMilliseconds: 33
    });

    expect(sample(20_599)).toMatchObject({
      phase: "cessation",
      active: true,
      ownerTimerRemainingMilliseconds: 33
    });

    expect(sample(20_600)).toMatchObject({
      phase: "released",
      active: false,
      phaseElapsedMilliseconds: 0,
      animationTimeMilliseconds: 0,
      animationLoop: false
    });
  });

  it("quantizes the post-removal lifetime without reactivating the model", () => {
    const sample = (time: number) =>
      sampleAuroraObjectDurationVisualOwner(contract, time, {
        updateStepMilliseconds: 100
      });

    expect(sample(23_599)).toMatchObject({
      phase: "released",
      active: false,
      releaseComplete: false,
      postRemovalTimerRemainingMilliseconds: 33
    });
    expect(sample(23_600)).toMatchObject({
      phase: "released",
      active: false,
      releaseComplete: true,
      postRemovalTimerRemainingMilliseconds: 0
    });
  });

  it("fails closed when the runtime update step is absent or invalid", () => {
    expect(() =>
      sampleAuroraObjectDurationVisualOwner(contract, 100, {
        updateStepMilliseconds: 0
      })
    ).toThrow("updateStepMilliseconds must be a finite positive number.");
  });
});
