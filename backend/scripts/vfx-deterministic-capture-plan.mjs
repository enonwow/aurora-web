export function createDeterministicCapturePlan(durationMs, fps) {
  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    throw new Error(`Capture duration must be positive and finite: ${durationMs}`);
  }
  if (!Number.isFinite(fps) || fps <= 0) {
    throw new Error(`Capture FPS must be positive and finite: ${fps}`);
  }

  const durationSeconds = durationMs / 1000;
  const finalFrameIndex = Math.ceil(durationSeconds * fps);
  return {
    durationSeconds,
    fps,
    finalFrameIndex,
    frameCount: finalFrameIndex + 1
  };
}

export function resolveDeterministicCaptureTimeSeconds(frameIndex, plan) {
  if (!Number.isInteger(frameIndex) || frameIndex < 0 || frameIndex > plan.finalFrameIndex) {
    throw new Error(`Capture frame index is outside the plan: ${frameIndex}`);
  }
  return frameIndex === plan.finalFrameIndex
    ? plan.durationSeconds
    : frameIndex / plan.fps;
}
