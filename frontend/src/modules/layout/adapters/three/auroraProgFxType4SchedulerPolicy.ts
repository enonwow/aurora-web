export const AURORA_PROGFX_TYPE4_SCHEDULER_STATUS =
  "docs-backed-progfx-type4-policy-diagnostic-retail-scheduler-dataflow-blocked";
export const AURORA_PROGFX_TYPE4_SCHEDULER_PROOF_SOURCE =
  "nwn.wiki progfx.2da Type 4 docs updated 2026-02-18 document Param4 priority lower value wins and 0 always applies, Param5 proximity suppression near another light source, Param6 Beamdog Attach to scene removal of scene lights while active, and vision/light Type 4 requests using fx_light_clr Param1 animations; this diagnostic evaluates existing ProgFX Type 4 scene requests without mutating THREE.PointLight lanes";
export const AURORA_PROGFX_TYPE4_SCHEDULER_BLOCKER =
  "Retail ProgFX Type 4 scheduler data-flow is still not recovered, so exact owner grouping, priority tie behavior, proximity distance threshold, scene-light restore timing, and pixel/runtime vision mutation parity remain blocked";
export const AURORA_PROGFX_TYPE4_SCHEDULER_NOT_OBSERVED_STATUS =
  "not-observed-no-progfx-type4-requests";
export const AURORA_PROGFX_TYPE4_PRIORITY_TIE_POLICY_STATUS =
  "retail-oracle-progfx-type4-equal-priority-tie-candidate-observed-general-policy-blocked";
export const AURORA_PROGFX_TYPE4_PRIORITY_ZERO_POLICY_STATUS =
  "docs-backed-progfx-type4-param4-zero-always-applies-retail-dataflow-blocked";
export const AURORA_PROGFX_TYPE4_PRIORITY_ZERO_RUNTIME_CAPTURE_STATUS =
  "runtime-oracle-custom-param4-zero-capture-present-not-stock-retail-parity";
export const AURORA_PROGFX_TYPE4_CANONICAL_PARITY_STATUS =
  "blocked-retail-priority-tie-proximity-attach-and-local-vs-retail-parity-incomplete";
export const AURORA_PROGFX_TYPE4_PRIORITY_EVALUATION_ORDER_SOURCE =
  "local diagnostics sort ProgFX Type 4 requests by docs-backed Param4 priority ascending; equal-priority order is diagnostic only and is not promoted as retail scheduler data-flow";

const AURORA_PROGFX_TYPE4_SCHEDULER_SAMPLE_LIMIT = 12;

export interface AuroraProgFxType4SchedulerRequest {
  readonly lane: string;
  readonly rowId: number | null;
  readonly label: string;
  readonly worldPosition: readonly number[];
  readonly animation: string;
  readonly visionMode: string;
  readonly priorityRaw: string;
  readonly priority: number | null;
  readonly priorityParameterStatus: string;
  readonly proximitySuppression: boolean | null;
  readonly attachToScene: boolean | null;
}

export interface AuroraProgFxType4SchedulerPointLight {
  readonly lane: string;
  readonly name: string;
  readonly worldPosition: readonly number[];
}

export interface AuroraProgFxType4SchedulerPolicyInput {
  readonly requests: readonly AuroraProgFxType4SchedulerRequest[];
  readonly pointLightCount: number;
  readonly pointLights: readonly AuroraProgFxType4SchedulerPointLight[];
}

export interface AuroraProgFxType4SchedulerDiagnostics {
  readonly status: string;
  readonly proofSource: string;
  readonly blocker: string;
  readonly priorityWinner: string;
  readonly priorityEvaluationOrderSource: string;
  readonly priorityEvaluationOrder: readonly string[];
  readonly priorityTiePolicyStatus: string;
  readonly priorityTopTieBlocked: boolean;
  readonly priorityTopTieCandidateCount: number;
  readonly priorityZeroPolicyStatus: string;
  readonly priorityZeroRuntimeCaptureStatus: string;
  readonly canonicalParityStatus: string;
  readonly priorityTieGroupCount: number;
  readonly priorityZeroAlwaysAppliesRequestCount: number;
  readonly sceneAttachmentRequestCount: number;
  readonly proximitySuppressionCandidateCount: number;
  readonly visionRequestCount: number;
  readonly lightRequestCount: number;
  readonly wouldSuppressScenePointLights: boolean;
  readonly samples: readonly string[];
}

function roundNumber(value: number): number {
  return Number(value.toFixed(4));
}

function formatSchedulerValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map(formatSchedulerValue).join(",");
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(roundNumber(value));
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }
  return "unknown";
}

function distanceBetweenPositions(
  left: readonly number[],
  right: readonly number[]
): number | null {
  if (left.length < 3 || right.length < 3) {
    return null;
  }
  const dx = left[0] - right[0];
  const dy = left[1] - right[1];
  const dz = left[2] - right[2];
  return roundNumber(Math.sqrt(dx * dx + dy * dy + dz * dz));
}

function compareProgFxType4SchedulerPriority(
  left: { readonly request: AuroraProgFxType4SchedulerRequest; readonly order: number },
  right: { readonly request: AuroraProgFxType4SchedulerRequest; readonly order: number }
): number {
  const leftPriority = left.request.priority ?? Number.MAX_SAFE_INTEGER;
  const rightPriority = right.request.priority ?? Number.MAX_SAFE_INTEGER;
  if (leftPriority !== rightPriority) {
    return leftPriority - rightPriority;
  }
  // Equal-priority traversal order is diagnostic only. It must not be promoted
  // as a retail scheduler winner while the tie policy remains blocked.
  return right.order - left.order;
}

function formatProgFxType4SchedulerWinner(
  request: AuroraProgFxType4SchedulerRequest
): string {
  return [
    `row=${formatSchedulerValue(request.rowId)}`,
    `label=${formatSchedulerValue(request.label)}`,
    `lane=${formatSchedulerValue(request.lane)}`,
    `worldPosition=${formatSchedulerValue(request.worldPosition)}`,
    `priority=${formatSchedulerValue(request.priority)}`,
    `param4Status=${formatSchedulerValue(request.priorityParameterStatus)}`,
    `animation=${formatSchedulerValue(request.animation)}`,
    `vision=${formatSchedulerValue(request.visionMode)}`,
    `attachToScene=${formatSchedulerValue(request.attachToScene)}`,
    `proximity=${formatSchedulerValue(request.proximitySuppression)}`
  ].join(";");
}

function formatProgFxType4SchedulerTieBlockedWinner(
  priority: number | null,
  candidates: readonly AuroraProgFxType4SchedulerRequest[]
): string {
  return [
    "blocked=equal-priority-top-tie-retail-scheduler-policy-unproven",
    `priority=${formatSchedulerValue(priority)}`,
    `candidateCount=${formatSchedulerValue(candidates.length)}`,
    `policy=${AURORA_PROGFX_TYPE4_PRIORITY_TIE_POLICY_STATUS}`,
    `candidates=${candidates
      .map((request) =>
        [
          `row=${formatSchedulerValue(request.rowId)}`,
          `label=${formatSchedulerValue(request.label)}`,
          `lane=${formatSchedulerValue(request.lane)}`
        ].join(",")
      )
      .join("/")}`
  ].join(";");
}

function formatProgFxType4SchedulerEvaluationOrderEntry(
  entry: { readonly request: AuroraProgFxType4SchedulerRequest; readonly order: number },
  rank: number
): string {
  const request = entry.request;
  return [
    `rank=${formatSchedulerValue(rank + 1)}`,
    `inputOrder=${formatSchedulerValue(entry.order)}`,
    `row=${formatSchedulerValue(request.rowId)}`,
    `label=${formatSchedulerValue(request.label)}`,
    `lane=${formatSchedulerValue(request.lane)}`,
    `priority=${formatSchedulerValue(request.priority)}`,
    `priorityRaw=${formatSchedulerValue(request.priorityRaw)}`,
    `priorityZero=${formatSchedulerValue(request.priority === 0)}`,
    `tiePolicy=${AURORA_PROGFX_TYPE4_PRIORITY_TIE_POLICY_STATUS}`,
    `animation=${formatSchedulerValue(request.animation)}`,
    `vision=${formatSchedulerValue(request.visionMode)}`,
    `attachToScene=${formatSchedulerValue(request.attachToScene)}`,
    `proximity=${formatSchedulerValue(request.proximitySuppression)}`,
    `retailDataFlow=blocked`
  ].join(";");
}

function buildProgFxType4ProximityObservationSample(
  request: AuroraProgFxType4SchedulerRequest,
  requestIndex: number,
  requests: readonly AuroraProgFxType4SchedulerRequest[],
  pointLights: readonly AuroraProgFxType4SchedulerPointLight[]
): string {
  const candidates = [
    ...pointLights.map((pointLight) => ({
      kind: "point-light",
      lane: pointLight.lane,
      name: pointLight.name,
      position: pointLight.worldPosition,
      distance: distanceBetweenPositions(request.worldPosition, pointLight.worldPosition)
    })),
    ...requests
      .filter((_, index) => index !== requestIndex)
      .map((other) => ({
        kind: "progfx-type4-request",
        lane: other.lane,
        name: other.label,
        position: other.worldPosition,
        distance: distanceBetweenPositions(request.worldPosition, other.worldPosition)
      }))
  ]
    .filter((candidate) => candidate.distance !== null)
    .sort((left, right) => (left.distance ?? 0) - (right.distance ?? 0));

  const nearest = candidates[0] ?? null;
  return [
    `proximityCandidate=row=${formatSchedulerValue(request.rowId)}`,
    `label=${formatSchedulerValue(request.label)}`,
    `requestPosition=${formatSchedulerValue(request.worldPosition)}`,
    `nearestKind=${formatSchedulerValue(nearest?.kind ?? "")}`,
    `nearestLane=${formatSchedulerValue(nearest?.lane ?? "")}`,
    `nearestName=${formatSchedulerValue(nearest?.name ?? "")}`,
    `nearestPosition=${formatSchedulerValue(nearest?.position ?? [])}`,
    `nearestDistance=${formatSchedulerValue(nearest?.distance ?? null)}`,
    `threshold=unknown-retail-distance-blocked`,
    `policy=docs-backed-progfx-type4-param5-proximity-suppression-near-other-light`
  ].join(";");
}

export function resolveAuroraProgFxType4SchedulerPolicy(
  input: AuroraProgFxType4SchedulerPolicyInput
): AuroraProgFxType4SchedulerDiagnostics {
  const { requests, pointLightCount, pointLights } = input;
  if (requests.length === 0) {
    return {
      status: AURORA_PROGFX_TYPE4_SCHEDULER_NOT_OBSERVED_STATUS,
      proofSource: "",
      blocker: "",
      priorityWinner: "",
      priorityEvaluationOrderSource: "",
      priorityEvaluationOrder: [],
      priorityTiePolicyStatus: "",
      priorityTopTieBlocked: false,
      priorityTopTieCandidateCount: 0,
      priorityZeroPolicyStatus: "",
      priorityZeroRuntimeCaptureStatus: "",
      canonicalParityStatus: "",
      priorityTieGroupCount: 0,
      priorityZeroAlwaysAppliesRequestCount: 0,
      sceneAttachmentRequestCount: 0,
      proximitySuppressionCandidateCount: 0,
      visionRequestCount: 0,
      lightRequestCount: 0,
      wouldSuppressScenePointLights: false,
      samples: []
    };
  }

  const schedulerInputs = requests.map((request, order) => ({ request, order }));
  const sortedByPriority = [...schedulerInputs].sort(
    compareProgFxType4SchedulerPriority
  );
  const priorityWinner = sortedByPriority[0]?.request ?? null;
  const topPriority = priorityWinner?.priority ?? null;
  const topPriorityTieCandidates =
    topPriority === null
      ? []
      : requests.filter((request) => request.priority === topPriority);
  const priorityTopTieBlocked = topPriorityTieCandidates.length > 1;
  const priorityWinnerText =
    priorityWinner && priorityTopTieBlocked
      ? formatProgFxType4SchedulerTieBlockedWinner(
          topPriority,
          topPriorityTieCandidates
        )
      : priorityWinner
        ? formatProgFxType4SchedulerWinner(priorityWinner)
        : "";
  const priorityEvaluationOrder = sortedByPriority.map((entry, rank) =>
    formatProgFxType4SchedulerEvaluationOrderEntry(entry, rank)
  );
  const priorityBuckets = new Map<number, number>();
  for (const request of requests) {
    if (request.priority === null) {
      continue;
    }
    priorityBuckets.set(request.priority, (priorityBuckets.get(request.priority) ?? 0) + 1);
  }
  const priorityTieGroupCount = Array.from(priorityBuckets.values()).filter(
    (count) => count > 1
  ).length;
  const priorityZeroAlwaysAppliesRequestCount = requests.filter(
    (request) => request.priority === 0
  ).length;
  const sceneAttachmentRequests = requests.filter(
    (request) => request.attachToScene === true
  );
  const proximitySuppressionRequests = requests.filter(
    (request) => request.proximitySuppression === true
  );
  const visionRequests = requests.filter(
    (request) => request.lane === "progfx-type4-vision-request"
  );
  const lightRequests = requests.filter(
    (request) => request.lane === "progfx-type4-light-request"
  );
  const wouldSuppressScenePointLights =
    sceneAttachmentRequests.length > 0 && pointLightCount > 0;
  const sceneAttachmentSuppressedPointLightCount =
    sceneAttachmentRequests.length > 0 ? pointLightCount : 0;
  const proximityObservationSamples = proximitySuppressionRequests
    .map((request) =>
      buildProgFxType4ProximityObservationSample(
        request,
        requests.indexOf(request),
        requests,
        pointLights
      )
    )
    .slice(0, AURORA_PROGFX_TYPE4_SCHEDULER_SAMPLE_LIMIT);
  const schedulerSamples = [
    priorityWinner ? `priorityWinner=${priorityWinnerText}` : "",
    `priorityEvaluationOrderSource=${AURORA_PROGFX_TYPE4_PRIORITY_EVALUATION_ORDER_SOURCE}`,
    ...priorityEvaluationOrder.map((entry) => `priorityEvaluationOrder=${entry}`),
    `priorityPolicy=docs-backed-progfx-type4-param4-priority-lower-value-wins`,
    `priorityTiePolicy=${AURORA_PROGFX_TYPE4_PRIORITY_TIE_POLICY_STATUS}`,
    `priorityTieGroups=${formatSchedulerValue(priorityTieGroupCount)}`,
    `priorityZeroPolicy=${AURORA_PROGFX_TYPE4_PRIORITY_ZERO_POLICY_STATUS}`,
    `priorityZeroRuntimeCapture=${AURORA_PROGFX_TYPE4_PRIORITY_ZERO_RUNTIME_CAPTURE_STATUS}`,
    `priorityZeroAlwaysApplies=${formatSchedulerValue(
      priorityZeroAlwaysAppliesRequestCount
    )}`,
    `sceneAttachmentRequests=${formatSchedulerValue(sceneAttachmentRequests.length)}`,
    `sceneAttachmentWouldSuppressPointLights=${formatSchedulerValue(
      wouldSuppressScenePointLights
    )}`,
    `sceneAttachmentSuppressedPointLights=${formatSchedulerValue(
      sceneAttachmentSuppressedPointLightCount
    )}`,
    `sceneAttachmentPolicy=docs-backed-progfx-type4-param6-attach-to-scene-removes-scene-lights`,
    `proximitySuppressionCandidates=${formatSchedulerValue(
      proximitySuppressionRequests.length
    )}`,
    `proximityPolicy=docs-backed-progfx-type4-param5-proximity-suppression-near-other-light`,
    ...proximityObservationSamples,
    `visionRequests=${formatSchedulerValue(visionRequests.length)}`,
    `lightRequests=${formatSchedulerValue(lightRequests.length)}`,
    `canonicalParity=${AURORA_PROGFX_TYPE4_CANONICAL_PARITY_STATUS}`,
    `retailBlocker=${formatSchedulerValue(AURORA_PROGFX_TYPE4_SCHEDULER_BLOCKER)}`
  ].filter((entry) => entry.length > 0);

  return {
    status: AURORA_PROGFX_TYPE4_SCHEDULER_STATUS,
    proofSource: AURORA_PROGFX_TYPE4_SCHEDULER_PROOF_SOURCE,
    blocker: AURORA_PROGFX_TYPE4_SCHEDULER_BLOCKER,
    priorityWinner: priorityWinnerText,
    priorityEvaluationOrderSource: AURORA_PROGFX_TYPE4_PRIORITY_EVALUATION_ORDER_SOURCE,
    priorityEvaluationOrder,
    priorityTiePolicyStatus: AURORA_PROGFX_TYPE4_PRIORITY_TIE_POLICY_STATUS,
    priorityTopTieBlocked,
    priorityTopTieCandidateCount: topPriorityTieCandidates.length,
    priorityZeroPolicyStatus: AURORA_PROGFX_TYPE4_PRIORITY_ZERO_POLICY_STATUS,
    priorityZeroRuntimeCaptureStatus:
      AURORA_PROGFX_TYPE4_PRIORITY_ZERO_RUNTIME_CAPTURE_STATUS,
    canonicalParityStatus: AURORA_PROGFX_TYPE4_CANONICAL_PARITY_STATUS,
    priorityTieGroupCount,
    priorityZeroAlwaysAppliesRequestCount,
    sceneAttachmentRequestCount: sceneAttachmentRequests.length,
    proximitySuppressionCandidateCount: proximitySuppressionRequests.length,
    visionRequestCount: visionRequests.length,
    lightRequestCount: lightRequests.length,
    wouldSuppressScenePointLights,
    samples: schedulerSamples
  };
}
