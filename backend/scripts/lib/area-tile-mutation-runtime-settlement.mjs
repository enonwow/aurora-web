const RUNTIME_SETTLEMENT_VERSION =
  "aurora-area-tile-mutation-runtime-settlement/v1";

function asFiniteNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function pushMismatch(blockers, actual, expected, blocker) {
  if (!isNonEmptyString(actual) || actual !== expected) {
    blockers.push(blocker);
  }
}

function resolveErrorClasses(blockers) {
  const classes = new Set();
  for (const blocker of blockers) {
    if (blocker.startsWith("contract_")) {
      classes.add("contract");
    } else if (
      blocker.startsWith("terrain_material_") ||
      blocker.startsWith("presented_frame_material_")
    ) {
      classes.add("renderer_material");
    } else if (
      blocker.startsWith("terrain_") ||
      blocker.startsWith("presented_frame_terrain_")
    ) {
      classes.add("renderer_model");
    } else if (
      blocker.startsWith("camera_") ||
      blocker.startsWith("presented_frame_camera_")
    ) {
      classes.add("camera");
    } else {
      classes.add("visual_proof");
    }
  }
  return [...classes];
}

export function buildLocalBlankRuntimeFreshness({
  expectedAreaId,
  actualSceneId
}) {
  const checks = [
    {
      id: "local_blank_scene_id",
      expected: expectedAreaId ?? null,
      actual: actualSceneId ?? null,
      ok:
        isNonEmptyString(expectedAreaId) &&
        isNonEmptyString(actualSceneId) &&
        actualSceneId === expectedAreaId
    }
  ];
  const failed = checks.filter((check) => check.ok !== true);
  return {
    ok: failed.length === 0,
    localBlank: true,
    expectedAreaId: expectedAreaId ?? null,
    checks,
    failed
  };
}

export function evaluateAreaPresentedFrameFence({
  capturedFrame,
  observedAfterCapture
}) {
  const blockers = [];
  const capturedToken = capturedFrame?.settlementToken ?? null;
  const observedToken = observedAfterCapture?.settlementToken ?? null;
  if (!isNonEmptyString(capturedToken)) {
    blockers.push("captured_presented_frame_settlement_token_missing");
  }
  if (!isNonEmptyString(observedToken)) {
    blockers.push("post_capture_presented_frame_settlement_token_missing");
  }
  if (
    isNonEmptyString(capturedToken) &&
    isNonEmptyString(observedToken) &&
    capturedToken !== observedToken
  ) {
    blockers.push(
      "presented_frame_settlement_token_changed_during_capture"
    );
  }
  return {
    version: "aurora-area-presented-frame-fence/v1",
    status: blockers.length === 0 ? "ready" : "blocked",
    capturedSettlementToken: capturedToken,
    observedSettlementToken: observedToken,
    blockers
  };
}

export function evaluateAreaTileMutationRuntimeSettlement({
  trace,
  contractSettlement,
  terrainSnapshot,
  cameraFrame,
  presentedFrame,
  expectedCameraMode = "top_down_oracle",
  requirePresentedFrame = true
}) {
  const settlementVersion = requirePresentedFrame
    ? RUNTIME_SETTLEMENT_VERSION
    : "aurora-area-tile-mutation-render-settlement/v1";
  if (!trace) {
    return {
      version: settlementVersion,
      operationId: null,
      revision: null,
      status: "idle",
      tileStateDigest: null,
      terrainBuildId: null,
      presentedFrameSettlementToken: null,
      blockers: ["mutation_trace_missing"],
      errorClasses: []
    };
  }

  const blockers = [];
  const expectedDigest = trace.tileStateDigestAfter;
  const expectedOperationId = trace.operationId;
  const expectedRevision = asFiniteNumber(trace.revision);

  if (!contractSettlement) {
    blockers.push("contract_settlement_missing");
  } else {
    if (contractSettlement.status !== "ready") {
      blockers.push("contract_settlement_not_ready");
    }
    if (contractSettlement.operationId !== expectedOperationId) {
      blockers.push("contract_operation_id_mismatch");
    }
    if (asFiniteNumber(contractSettlement.revision) !== expectedRevision) {
      blockers.push("contract_revision_mismatch");
    }
    if (contractSettlement.tileStateDigest !== expectedDigest) {
      blockers.push("contract_tile_state_digest_mismatch");
    }
    if (
      Array.isArray(contractSettlement.blockers) &&
      contractSettlement.blockers.length > 0
    ) {
      blockers.push("contract_reported_blockers");
    }
  }

  if (!terrainSnapshot) {
    blockers.push("terrain_snapshot_missing");
  } else {
    if (
      terrainSnapshot.version !==
      "aurora-areas-terrain-tile-model-runtime/v1"
    ) {
      blockers.push("terrain_snapshot_version_mismatch");
    }
    if (terrainSnapshot.status !== "ready") {
      blockers.push("terrain_status_not_ready");
    }
    if (terrainSnapshot.modelStatus !== "ready") {
      blockers.push("terrain_model_status_not_ready");
    }
    if (!isNonEmptyString(terrainSnapshot.terrainBuildId)) {
      blockers.push("terrain_build_id_missing");
    }
    if (terrainSnapshot.tileStateDigest !== expectedDigest) {
      blockers.push("terrain_tile_state_digest_mismatch");
    }

    const tileCount = asFiniteNumber(terrainSnapshot.tileCount);
    const contractTileCount = asFiniteNumber(terrainSnapshot.contractTileCount);
    const loadedTileCount = asFiniteNumber(terrainSnapshot.loadedTileCount);
    if (tileCount === null || tileCount < 1) {
      blockers.push("terrain_tile_count_invalid");
    }
    if (contractTileCount === null || contractTileCount !== tileCount) {
      blockers.push("terrain_contract_tile_count_mismatch");
    }
    if (loadedTileCount === null || loadedTileCount !== tileCount) {
      blockers.push("terrain_loaded_tile_count_mismatch");
    }
    if (asFiniteNumber(terrainSnapshot.pendingTileCount) !== 0) {
      blockers.push("terrain_pending_tile_count_nonzero");
    }
    if (asFiniteNumber(terrainSnapshot.failedTileCount) !== 0) {
      blockers.push("terrain_failed_tile_count_nonzero");
    }
    if (asFiniteNumber(terrainSnapshot.bridgeTileCount) !== 0) {
      blockers.push("terrain_bridge_tile_count_nonzero");
    }
    const visibleMeshCount = asFiniteNumber(
      terrainSnapshot.visibleMeshCount
    );
    if (visibleMeshCount === null || visibleMeshCount < 1) {
      blockers.push("terrain_visible_mesh_count_zero");
    }

    const textureContractCount = asFiniteNumber(
      terrainSnapshot.materialTextureContractTileCount
    );
    const textureAppliedCount = asFiniteNumber(
      terrainSnapshot.materialTextureAppliedTileCount
    );
    if (textureContractCount === null || textureContractCount < 0) {
      blockers.push("terrain_material_contract_count_invalid");
    }
    if (
      textureAppliedCount === null ||
      textureAppliedCount !== textureContractCount
    ) {
      blockers.push("terrain_material_applied_count_mismatch");
    }
    if (
      asFiniteNumber(terrainSnapshot.materialTexturePendingTileCount) !== 0
    ) {
      blockers.push("terrain_material_pending_count_nonzero");
    }
    if (
      asFiniteNumber(terrainSnapshot.materialTextureFailedTileCount) !== 0
    ) {
      blockers.push("terrain_material_failed_count_nonzero");
    }
  }

  const terrainBuildId = terrainSnapshot?.terrainBuildId ?? null;
  if (!cameraFrame) {
    blockers.push("camera_frame_missing");
  } else {
    if (cameraFrame.mode !== expectedCameraMode) {
      blockers.push("camera_mode_mismatch");
    }
    pushMismatch(
      blockers,
      cameraFrame.terrainBuildId,
      terrainBuildId,
      "camera_terrain_build_id_mismatch"
    );
    pushMismatch(
      blockers,
      cameraFrame.tileStateDigest,
      expectedDigest,
      "camera_tile_state_digest_mismatch"
    );
    if (cameraFrame.coverageStatus !== "pass") {
      blockers.push("camera_frame_coverage_failed");
    }
    if (asFiniteNumber(cameraFrame.clippedCornerCount) !== 0) {
      blockers.push("camera_frame_corners_clipped");
    }
  }

  if (requirePresentedFrame && !presentedFrame) {
    blockers.push("presented_frame_missing");
  } else if (requirePresentedFrame) {
    if (
      asFiniteNumber(presentedFrame.sequence) === null ||
      asFiniteNumber(presentedFrame.sequence) < 1
    ) {
      blockers.push("presented_frame_sequence_invalid");
    }
    pushMismatch(
      blockers,
      presentedFrame.terrainBuildId,
      terrainBuildId,
      "presented_frame_terrain_build_id_mismatch"
    );
    pushMismatch(
      blockers,
      presentedFrame.tileStateDigest,
      expectedDigest,
      "presented_frame_terrain_tile_state_digest_mismatch"
    );
    pushMismatch(
      blockers,
      presentedFrame.cameraTerrainBuildId,
      terrainBuildId,
      "presented_frame_camera_terrain_build_id_mismatch"
    );
    pushMismatch(
      blockers,
      presentedFrame.cameraTileStateDigest,
      expectedDigest,
      "presented_frame_camera_tile_state_digest_mismatch"
    );
    if (presentedFrame.cameraCoverageStatus !== "pass") {
      blockers.push("presented_frame_camera_coverage_failed");
    }
    if (!isNonEmptyString(presentedFrame.settlementToken)) {
      blockers.push("presented_frame_settlement_token_missing");
    }
    const mutationStartedAt = Date.parse(trace.startedAt);
    const presentedAt = Date.parse(presentedFrame.presentedAt);
    if (!Number.isFinite(presentedAt)) {
      blockers.push("presented_frame_timestamp_invalid");
    } else if (
      !Number.isFinite(mutationStartedAt) ||
      presentedAt < mutationStartedAt
    ) {
      blockers.push("presented_frame_predates_mutation");
    }
  }

  return {
    version: settlementVersion,
    operationId: expectedOperationId ?? null,
    revision: expectedRevision,
    status: blockers.length === 0 ? "ready" : "blocked",
    tileStateDigest: expectedDigest ?? null,
    terrainBuildId,
    presentedFrameSettlementToken:
      presentedFrame?.settlementToken ?? null,
    blockers,
    errorClasses: resolveErrorClasses(blockers)
  };
}

export function evaluateAreaTileMutationRenderSettlement(input) {
  return evaluateAreaTileMutationRuntimeSettlement({
    ...input,
    requirePresentedFrame: false
  });
}
