#!/usr/bin/env node
import assert from "node:assert/strict";

import {
  buildSameBrowserRestartProofStatus,
  createSameBrowserRestartReadyPacket,
  validateSameBrowserRestartResumePacket
} from "./lib/area-same-browser-restart-proof.mjs";

const challenge = "restart-proof-challenge-001";
const readyAt = "2026-08-19T10:00:00.000Z";
const session = {
  marker: "browser-document-001",
  performanceTimeOrigin: 1787120000000,
  href: "http://127.0.0.1:5173/app?mode=areas_mode"
};
const area = {
  areaId: "area__winds_study",
  name: "_winds_study"
};

const readyPacket = createSameBrowserRestartReadyPacket({
  challenge,
  readyAt,
  session,
  area,
  previousBackendProcessId: 101
});

assert.deepEqual(readyPacket, {
  version: "aurora-areas-same-browser-restart-ready/v1",
  status: "ready_for_backend_restart",
  challenge,
  readyAt,
  previousBackendProcessId: 101,
  session,
  area
});

const resumePacket = {
  version: "aurora-areas-same-browser-restart-resume/v1",
  status: "backend_restarted",
  challenge,
  restartedAt: "2026-08-19T10:00:05.000Z",
  previousBackendProcessId: 101,
  currentBackendProcessId: 202,
  backendHealthStatus: 200
};

assert.deepEqual(
  validateSameBrowserRestartResumePacket(resumePacket, {
    challenge,
    readyAt,
    previousBackendProcessId: 101
  }),
  resumePacket
);

assert.throws(
  () =>
    validateSameBrowserRestartResumePacket(
      { ...resumePacket, challenge: "stale-challenge" },
      { challenge, readyAt, previousBackendProcessId: 101 }
    ),
  /restart_resume_challenge_mismatch/
);
assert.throws(
  () =>
    validateSameBrowserRestartResumePacket(
      { ...resumePacket, currentBackendProcessId: 101 },
      { challenge, readyAt, previousBackendProcessId: 101 }
    ),
  /restart_backend_process_identity_unchanged/
);
assert.throws(
  () =>
    validateSameBrowserRestartResumePacket(
      { ...resumePacket, backendHealthStatus: 503 },
      { challenge, readyAt, previousBackendProcessId: 101 }
    ),
  /restart_backend_health_not_ready/
);

const settledNetwork = {
  firstErrorReason: null,
  groups: {
    placeableRenderPayloadBatch: {
      requestCount: 1,
      responseCount: 1,
      failedRequestCount: 0,
      inFlightRequestCount: 0
    },
    placeableRenderPayloadSingle: {
      requestCount: 1,
      failedRequestCount: 0,
      inFlightRequestCount: 0
    },
    placeableAssetContractsSingle: {
      requestCount: 1,
      failedRequestCount: 0,
      inFlightRequestCount: 0
    },
    placeableAssetDelivery: {
      requestCount: 4,
      failedRequestCount: 0,
      inFlightRequestCount: 0
    }
  }
};

const verified = buildSameBrowserRestartProofStatus({
  readyPacket,
  resumePacket,
  beforeSession: session,
  afterSession: session,
  expectedArea: area,
  reopenedArea: area,
  runtimeFreshness: { ok: true },
  expectedPlaceableCount: 4,
  postRestartNetworkSummary: settledNetwork
});
assert.equal(verified.status, "verified");
assert.deepEqual(verified.blockers, []);
assert.equal(verified.sameDocument, true);
assert.equal(verified.backendProcessChanged, true);
assert.equal(verified.activePlaceableRequestFailureCount, 0);
assert.equal(verified.authoritativeRevalidationResponseCount, 1);

const changedDocument = buildSameBrowserRestartProofStatus({
  readyPacket,
  resumePacket,
  beforeSession: session,
  afterSession: { ...session, marker: "browser-document-002" },
  expectedArea: area,
  reopenedArea: area,
  runtimeFreshness: { ok: true },
  expectedPlaceableCount: 4,
  postRestartNetworkSummary: settledNetwork
});
assert.equal(changedDocument.status, "blocked");
assert.ok(changedDocument.blockers.includes("browser_document_marker_changed"));

const staleRequestFailure = buildSameBrowserRestartProofStatus({
  readyPacket,
  resumePacket,
  beforeSession: session,
  afterSession: session,
  expectedArea: area,
  reopenedArea: area,
  runtimeFreshness: { ok: true },
  expectedPlaceableCount: 4,
  postRestartNetworkSummary: {
    ...settledNetwork,
    firstErrorReason: { code: "http_404" },
    groups: {
      ...settledNetwork.groups,
      placeableAssetDelivery: {
        requestCount: 4,
        failedRequestCount: 1,
        inFlightRequestCount: 0
      }
    }
  }
});
assert.equal(staleRequestFailure.status, "blocked");
assert.ok(staleRequestFailure.blockers.includes("post_restart_placeable_request_failed"));

const missingRevalidation = buildSameBrowserRestartProofStatus({
  readyPacket,
  resumePacket,
  beforeSession: session,
  afterSession: session,
  expectedArea: area,
  reopenedArea: area,
  runtimeFreshness: { ok: true },
  expectedPlaceableCount: 4,
  postRestartNetworkSummary: {
    ...settledNetwork,
    groups: {
      ...settledNetwork.groups,
      placeableRenderPayloadBatch: {
        requestCount: 0,
        responseCount: 0,
        failedRequestCount: 0,
        inFlightRequestCount: 0
      }
    }
  }
});
assert.equal(missingRevalidation.status, "blocked");
assert.ok(
  missingRevalidation.blockers.includes("post_restart_authoritative_revalidation_missing")
);

console.log("area same-browser restart proof contract: PASS");
