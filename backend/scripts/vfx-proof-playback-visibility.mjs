function finiteNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function hasVisibleCanonicalVfxPlayback(playbackState) {
  if (!playbackState || typeof playbackState !== "object") return false;

  const canonicalDrawVisible =
    finiteNumber(playbackState.visibleDrawMeshCount) > 0 &&
    (finiteNumber(playbackState.visibleDrawParticleCount) > 0 ||
      finiteNumber(playbackState.visibleMappedMaterialCount) > 0 ||
      finiteNumber(playbackState.visibleAlphaMappedMaterialCount) > 0);
  const comparisonDrawVisible =
    finiteNumber(playbackState.visibleFrameCount) > 0 &&
    (finiteNumber(playbackState.drawParticles) > 0 ||
      finiteNumber(playbackState.renderedChunkModels) > 0 ||
      finiteNumber(playbackState.sourceLightCount) > 0);

  return canonicalDrawVisible || comparisonDrawVisible;
}
