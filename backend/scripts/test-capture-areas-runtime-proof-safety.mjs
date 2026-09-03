#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const runtimeCapture = readFileSync(
  resolve(repoRoot, "backend/scripts/capture-areas-runtime-cdp.mjs"),
  "utf8"
);
const workspaceLayout = readFileSync(
  resolve(repoRoot, "frontend/src/modules/layout/components/WorkspaceLayout.tsx"),
  "utf8"
);
const retailLauncher = readFileSync(
  resolve(repoRoot, "backend/scripts/capture-area-lighting-retail-oracle-window.ps1"),
  "utf8"
);
const retailMaxLightsLauncher = readFileSync(
  resolve(repoRoot, "backend/scripts/capture-area-lighting-retail-max-light-variants.mjs"),
  "utf8"
);
const vfxRetailLauncher = readFileSync(
  resolve(repoRoot, "backend/scripts/capture_all_vfx_clips.py"),
  "utf8"
);
const toolsetOpener = readFileSync(
  resolve(repoRoot, "backend/scripts/open-last-city-module-and-area-toolset-no-global-input.mjs"),
  "utf8"
);
const toolsetSession = readFileSync(
  resolve(repoRoot, "backend/scripts/aurora-toolset-session.mjs"),
  "utf8"
);

assert.doesNotMatch(runtimeCapture, /captureVisibleCanvasFallback/);
assert.doesNotMatch(runtimeCapture, /if \(allowPartialEvidence && lastStatus\)/);
assert.match(runtimeCapture, /Unsupported options: \$\{unsupportedProofOptions\.join/);
assert.match(runtimeCapture, /models_or_textures_not_fully_settled/);
assert.match(runtimeCapture, /nonSettledTextureCount/);
assert.match(runtimeCapture, /materialAppliedCount !== materialContractCount/);
assert.doesNotMatch(runtimeCapture, /materialContractCount !== tileCount/);
assert.doesNotMatch(runtimeCapture, /materialAppliedCount !== tileCount/);
assert.match(runtimeCapture, /resolveCaptureViewFocusForOpenedArea\(/);
assert.match(runtimeCapture, /worldX: normalized\.worldX \?\? width \/ 2/);
assert.match(runtimeCapture, /worldZ: normalized\.worldZ \?\? height \/ 2/);
assert.match(runtimeCapture, /attachNewAreaTileModelWaitVisualEvidence\(/);
assert.match(runtimeCapture, /blocked-before-mutation/);
assert.match(runtimeCapture, /attachAreaEditingSettlementVisualEvidence\(/);
assert.match(runtimeCapture, /blocked-after-mutation/);
assert.match(runtimeCapture, /buildLocalBlankRuntimeFreshness\(/);
assert.doesNotMatch(
  runtimeCapture,
  /runtimeFreshness:\s*\{\s*ok:\s*true,\s*localBlank:\s*true/
);
assert.match(runtimeCapture, /evaluateAreaTileMutationRuntimeSettlement\(/);
assert.match(runtimeCapture, /evaluateAreaTileMutationRenderSettlement\(/);
assert.match(runtimeCapture, /waitForAreaTileMutationRuntimeSettlement\(/);
assert.match(runtimeCapture, /area_tile_mutation_runtime_settlement_timeout/);
assert.match(
  runtimeCapture,
  /runtimeFreshness:\s*[\s\S]*exactMutationSettlement\.status\.runtimeFreshness\s*\?\?[\s\S]*domStatus\.runtimeFreshness/
);
assert.match(runtimeCapture, /evaluateAreaPresentedFrameFence\(/);
assert.match(runtimeCapture, /area_tile_mutation_frame_fence_failed/);
assert.match(runtimeCapture, /camera_coverage_not_pass/);
assert.match(runtimeCapture, /camera_terrain_build_id_mismatch/);
assert.match(runtimeCapture, /camera_tile_state_digest_mismatch/);
assert.match(runtimeCapture, /areaCameraFrameBoundsPolicy/);
assert.match(runtimeCapture, /areaCameraFrameObservedTerrainBounds/);
assert.match(runtimeCapture, /areaCameraFrameExcludedMeshCount/);
assert.match(runtimeCapture, /areaCameraFrameRuntimeBoundsPolicyStatus/);
assert.match(runtimeCapture, /runtime_bounds_outlier/);
assert.match(runtimeCapture, /group: "placeableRenderPayloadSingle"/);
assert.match(runtimeCapture, /group: "placeableAssetContractsSingle"/);
assert.match(runtimeCapture, /group: "placeableAssetDelivery"/);
assert.match(runtimeCapture, /groups\.placeableRenderPayloadSingle\.firstErrorReason/);
assert.match(runtimeCapture, /groups\.placeableAssetContractsSingle\.firstErrorReason/);
assert.match(runtimeCapture, /groups\.placeableAssetDelivery\.firstErrorReason/);
assert.match(
  runtimeCapture,
  /await waitForRequiredNetworkSettlement\(networkCapture, networkSettlementTimeoutMs\)/
);
assert.match(runtimeCapture, /assertRequiredNetworkSettlement\(networkCaptureSummary\)/);
assert.match(runtimeCapture, /placeable_render_payload_single_in_flight/);
assert.match(runtimeCapture, /placeable_asset_contracts_single_in_flight/);
assert.match(runtimeCapture, /placeable_asset_delivery_in_flight/);
assert.match(runtimeCapture, /placeable_asset_delivery_failed/);
assert.match(runtimeCapture, /createSameBrowserRestartReadyPacket\(/);
assert.match(runtimeCapture, /validateSameBrowserRestartResumePacket\(/);
assert.match(runtimeCapture, /resetNetworkCapture\(networkCapture\)/);
assert.match(runtimeCapture, /refreshSameBrowserAuthStateWithoutNavigation\(/);
assert.match(runtimeCapture, /buildSameBrowserRestartProofStatus\(/);
assert.match(runtimeCapture, /same_browser_backend_restart_proof_blocked/);
assert.match(
  runtimeCapture,
  /const authenticatedAppWaitMs = Math\.max\(loginWaitMs, DEFAULT_AUTHENTICATED_APP_WAIT_MS\);/
);
assert.match(
  runtimeCapture,
  /waitForAuthenticatedAppOrLogin\(send, authenticatedAppWaitMs\)/
);
assert.match(runtimeCapture, /waitForAuthenticatedApp\(send, authenticatedAppWaitMs,/);
assert.match(
  runtimeCapture,
  /prepareLoginFormFallback\(send, authenticatedAppWaitMs\)/
);
assert.match(
  runtimeCapture,
  /window\.localStorage\.removeItem\("aurora_web\.auth_session\.v1"\)/
);
assert.match(
  runtimeCapture,
  /submitLoginForm\(send, credentials, authenticatedAppWaitMs\)/
);
assert.match(
  runtimeCapture,
  /const submitEventHandled = form\.dispatchEvent\(submitEvent\) === false;/
);
assert.match(
  runtimeCapture,
  /if \(submitted\?\.ok && submitted\.submitEventHandled\)/
);
assert.match(runtimeCapture, /frontend_login_form_handler_not_ready/);
assert.match(runtimeCapture, /tile-replace-local/);
assert.match(runtimeCapture, /loadOptionalMatrixRuntimeBuildBinding\(options\)/);
assert.match(runtimeCapture, /validateMatrixRuntimeBuildObservations\(/);
assert.match(runtimeCapture, /runtime_build_backend_identity_mismatch/);
assert.match(runtimeCapture, /runtime_build_identity_mismatch/);
assert.match(runtimeCapture, /computeTileAddConnectRuntimeSourceIdentity/);
assert.match(runtimeCapture, /validateTileAddConnectRuntimeSourceIdentity/);
assert.match(runtimeCapture, /runtime_source_identity_mismatch/);
assert.match(runtimeCapture, /runtimeSourceIdentityPreflight/);
assert.match(runtimeCapture, /runtimeSourceIdentityPostCapture/);
assert.match(runtimeCapture, /MATRIX_RUNTIME_SOURCE_IDENTITY_CHANGED_DURING_CAPTURE/);
assert.match(runtimeCapture, /runtimeEnvironmentPostCapture/);
assert.match(runtimeCapture, /MATRIX_BACKEND_RUNTIME_BUILD_PROCESS_RESTARTED_DURING_CAPTURE/);
assert.match(runtimeCapture, /frontendRuntimeBuildIdentityRaw/);
assert.match(runtimeCapture, /runtimeBuildProof,/);
assert.match(workspaceLayout, /data-aurora-runtime-build-identity=/);
assert.match(workspaceLayout, /import\.meta\.env\.DEV/);
assert.match(workspaceLayout, /readFrontendRuntimeBuildIdentity\(\)/);
assert.match(runtimeCapture, /inspector-tile-id-replace/);
assert.match(runtimeCapture, /areaEditingTileId/);
assert.match(runtimeCapture, /proofInitializer:\s*"first-compatible"/);
assert.match(runtimeCapture, /Development proof initializer/);
assert.match(runtimeCapture, /new_area_development_proof_initializer_missing/);
assert.match(
  runtimeCapture,
  /requiresTileProcessSceneKeyChange:\s*false,[\s\S]*requiresPostMutationSettlement:\s*true,[\s\S]*kind:\s*"inspector-tile-id-replace"/
);
assert.match(retailLauncher, /This retail proof launcher is retired/);
assert.match(retailMaxLightsLauncher, /This retail max-light proof launcher is retired/);
assert.match(vfxRetailLauncher, /This VFX retail capture launcher is retired/);
assert.match(toolsetOpener, /toolset_primary_display_target_rejected/);
assert.match(toolsetOpener, /toolset_unsafe_override_rejected/);
assert.match(toolsetOpener, /TOOLSET_APPROVED_PROOF_WINDOW_LEFT/);
assert.match(toolsetOpener, /isApprovedToolsetProofWindowLeft/);
assert.match(toolsetOpener, /inspectToolsetIniReadOnly/);
assert.match(toolsetOpener, /windowPositionAction = "observed_read_only"/);
assert.match(toolsetOpener, /iniMutationForbidden: true/);
assert.doesNotMatch(toolsetOpener, /writeFileSync\(iniPath/);
assert.match(toolsetSession, /proofWindowLeft: TOOLSET_APPROVED_PROOF_WINDOW_LEFT/);
assert.doesNotMatch(toolsetSession, /allowRepeatedAccessViolationFamily/);

console.log("area runtime proof safety contract: PASS");
