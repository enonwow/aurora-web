const READY_VERSION = "aurora-areas-same-browser-restart-ready/v1";
const RESUME_VERSION = "aurora-areas-same-browser-restart-resume/v1";
const STATUS_VERSION = "aurora-areas-same-browser-restart-proof/v1";

const ACTIVE_PLACEABLE_NETWORK_GROUPS = [
  "placeableRenderPayloadBatch",
  "placeableRenderPayloadSingle",
  "placeableProcessBatch",
  "placeableAssetContractsBatch",
  "placeableAssetContractsSingle",
  "placeableAssetDelivery"
];

export function createSameBrowserRestartReadyPacket({
  challenge,
  readyAt,
  session,
  area,
  previousBackendProcessId
}) {
  requireNonEmptyString(challenge, "restart_ready_challenge_missing");
  requireIsoTimestamp(readyAt, "restart_ready_timestamp_invalid");
  requireSessionIdentity(session, "restart_ready_session_invalid");
  requireAreaIdentity(area, "restart_ready_area_invalid");
  requirePositiveInteger(
    previousBackendProcessId,
    "restart_previous_backend_process_id_invalid"
  );
  return {
    version: READY_VERSION,
    status: "ready_for_backend_restart",
    challenge,
    readyAt,
    previousBackendProcessId,
    session,
    area
  };
}

export function validateSameBrowserRestartResumePacket(
  packet,
  { challenge, readyAt, previousBackendProcessId }
) {
  if (!packet || typeof packet !== "object" || Array.isArray(packet)) {
    fail("restart_resume_packet_invalid");
  }
  if (packet.version !== RESUME_VERSION) {
    fail("restart_resume_version_invalid");
  }
  if (packet.status !== "backend_restarted") {
    fail("restart_resume_status_invalid");
  }
  if (packet.challenge !== challenge) {
    fail("restart_resume_challenge_mismatch");
  }
  requireIsoTimestamp(packet.restartedAt, "restart_resume_timestamp_invalid");
  requirePositiveInteger(
    packet.previousBackendProcessId,
    "restart_resume_previous_backend_process_id_invalid"
  );
  requirePositiveInteger(
    packet.currentBackendProcessId,
    "restart_resume_current_backend_process_id_invalid"
  );
  if (packet.previousBackendProcessId !== previousBackendProcessId) {
    fail("restart_resume_previous_backend_process_id_mismatch");
  }
  if (packet.currentBackendProcessId === previousBackendProcessId) {
    fail("restart_backend_process_identity_unchanged");
  }
  if (packet.backendHealthStatus !== 200) {
    fail("restart_backend_health_not_ready");
  }
  if (Date.parse(packet.restartedAt) < Date.parse(readyAt)) {
    fail("restart_resume_predates_ready_packet");
  }
  return packet;
}

export function buildSameBrowserRestartProofStatus({
  readyPacket,
  resumePacket,
  beforeSession,
  afterSession,
  expectedArea,
  reopenedArea,
  runtimeFreshness,
  expectedPlaceableCount,
  postRestartNetworkSummary
}) {
  const blockers = [];
  const sameMarker =
    nonEmptyString(beforeSession?.marker) &&
    beforeSession.marker === afterSession?.marker;
  const sameTimeOrigin =
    Number.isFinite(beforeSession?.performanceTimeOrigin) &&
    beforeSession.performanceTimeOrigin === afterSession?.performanceTimeOrigin;
  const sameHref =
    nonEmptyString(beforeSession?.href) && beforeSession.href === afterSession?.href;
  if (!sameMarker) blockers.push("browser_document_marker_changed");
  if (!sameTimeOrigin) blockers.push("browser_document_time_origin_changed");
  if (!sameHref) blockers.push("browser_document_route_changed");

  const expectedAreaIdentity = normalizeAreaIdentity(expectedArea);
  const reopenedAreaIdentity = normalizeAreaIdentity(reopenedArea);
  const sameArea =
    nonEmptyString(expectedAreaIdentity.areaId) &&
    expectedAreaIdentity.areaId === reopenedAreaIdentity.areaId;
  if (!sameArea) blockers.push("reopened_area_identity_mismatch");
  if (runtimeFreshness?.ok !== true) {
    blockers.push("post_restart_runtime_not_fresh");
  }

  const groups = postRestartNetworkSummary?.groups ?? {};
  let activePlaceableRequestFailureCount = 0;
  let activePlaceableRequestInFlightCount = 0;
  for (const groupName of ACTIVE_PLACEABLE_NETWORK_GROUPS) {
    const group = groups[groupName] ?? {};
    activePlaceableRequestFailureCount += Number(group.failedRequestCount ?? 0);
    activePlaceableRequestInFlightCount += Number(group.inFlightRequestCount ?? 0);
  }
  if (activePlaceableRequestFailureCount > 0) {
    blockers.push("post_restart_placeable_request_failed");
  }
  if (activePlaceableRequestInFlightCount > 0) {
    blockers.push("post_restart_placeable_request_in_flight");
  }

  const authoritativeRevalidationResponseCount = Number(
    groups.placeableRenderPayloadBatch?.responseCount ?? 0
  );
  if (
    Number(expectedPlaceableCount ?? 0) > 0 &&
    authoritativeRevalidationResponseCount < 1
  ) {
    blockers.push("post_restart_authoritative_revalidation_missing");
  }

  const backendProcessChanged =
    Number.isInteger(readyPacket?.previousBackendProcessId) &&
    Number.isInteger(resumePacket?.currentBackendProcessId) &&
    readyPacket.previousBackendProcessId !== resumePacket.currentBackendProcessId &&
    readyPacket.previousBackendProcessId === resumePacket.previousBackendProcessId;
  if (!backendProcessChanged) {
    blockers.push("backend_process_restart_not_proven");
  }
  if (readyPacket?.challenge !== resumePacket?.challenge) {
    blockers.push("restart_handoff_challenge_mismatch");
  }

  return {
    version: STATUS_VERSION,
    status: blockers.length === 0 ? "verified" : "blocked",
    blockers,
    sameDocument: sameMarker && sameTimeOrigin && sameHref,
    sameArea,
    backendProcessChanged,
    activePlaceableRequestFailureCount,
    activePlaceableRequestInFlightCount,
    authoritativeRevalidationResponseCount,
    expectedPlaceableCount: Number(expectedPlaceableCount ?? 0)
  };
}

function normalizeAreaIdentity(area) {
  const areaId = firstNonEmptyString(
    area?.areaId,
    area?.expectedArea?.areaId,
    area?.areaExpectation?.areaId,
    area?.rowInfo?.title
  );
  const name = firstNonEmptyString(
    area?.name,
    area?.expectedArea?.name,
    area?.areaExpectation?.name,
    area?.rowInfo?.title
  );
  return {
    areaId: normalizeIdentity(areaId || name),
    name: normalizeIdentity(name || areaId)
  };
}

function requireAreaIdentity(area, code) {
  const normalized = normalizeAreaIdentity(area);
  if (!normalized.areaId) fail(code);
}

function requireSessionIdentity(session, code) {
  if (
    !nonEmptyString(session?.marker) ||
    !Number.isFinite(session?.performanceTimeOrigin) ||
    !nonEmptyString(session?.href)
  ) {
    fail(code);
  }
}

function requireNonEmptyString(value, code) {
  if (!nonEmptyString(value)) fail(code);
}

function requirePositiveInteger(value, code) {
  if (!Number.isInteger(value) || value <= 0) fail(code);
}

function requireIsoTimestamp(value, code) {
  if (!nonEmptyString(value) || !Number.isFinite(Date.parse(value))) fail(code);
}

function firstNonEmptyString(...values) {
  return values.find(nonEmptyString) ?? "";
}

function nonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizeIdentity(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/^area_+/u, "")
    .replace(/[^a-z0-9]+/gu, "");
}

function fail(code) {
  throw new Error(code);
}
