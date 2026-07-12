import { describe, expect, it } from "vitest";
import {
  AURORA_PROGFX_TYPE4_CANONICAL_PARITY_STATUS,
  AURORA_PROGFX_TYPE4_PRIORITY_EVALUATION_ORDER_SOURCE,
  AURORA_PROGFX_TYPE4_PRIORITY_TIE_POLICY_STATUS,
  AURORA_PROGFX_TYPE4_PRIORITY_ZERO_RUNTIME_CAPTURE_STATUS,
  AURORA_PROGFX_TYPE4_PRIORITY_ZERO_POLICY_STATUS,
  AURORA_PROGFX_TYPE4_SCHEDULER_BLOCKER,
  AURORA_PROGFX_TYPE4_SCHEDULER_NOT_OBSERVED_STATUS,
  AURORA_PROGFX_TYPE4_SCHEDULER_STATUS,
  resolveAuroraProgFxType4SchedulerPolicy,
  type AuroraProgFxType4SchedulerRequest
} from "../../../../src/modules/layout/adapters/three/auroraProgFxType4SchedulerPolicy";

function buildRequest(
  request: Partial<AuroraProgFxType4SchedulerRequest>
): AuroraProgFxType4SchedulerRequest {
  return {
    lane: "progfx-type4-light-request",
    rowId: null,
    label: "Unknown",
    worldPosition: [0, 0, 0],
    animation: "",
    visionMode: "",
    priorityRaw: "",
    priority: null,
    priorityParameterStatus:
      "docs-backed-progfx-type4-param4-priority-lower-value-wins",
    proximitySuppression: false,
    attachToScene: false,
    ...request
  };
}

describe("auroraProgFxType4SchedulerPolicy", () => {
  it("keeps the no-request status explicit", () => {
    const diagnostics = resolveAuroraProgFxType4SchedulerPolicy({
      requests: [],
      pointLightCount: 0,
      pointLights: []
    });

    expect(diagnostics.status).toBe(AURORA_PROGFX_TYPE4_SCHEDULER_NOT_OBSERVED_STATUS);
    expect(diagnostics.priorityEvaluationOrder).toEqual([]);
    expect(diagnostics.samples).toEqual([]);
  });

  it("sorts docs-backed Param4 priority while keeping equal-priority ties blocked", () => {
    const diagnostics = resolveAuroraProgFxType4SchedulerPolicy({
      requests: [
        buildRequest({
          lane: "progfx-type4-vision-request",
          rowId: 333,
          label: "LightAreaBlackout",
          worldPosition: [5, 0, 0],
          animation: "Black_Out",
          visionMode: "Blind_Vision",
          priorityRaw: "13",
          priority: 13,
          attachToScene: true
        }),
        buildRequest({
          rowId: 304,
          label: "LightBlue5m",
          worldPosition: [6, 0, 0],
          animation: "Blue_5m",
          priorityRaw: "20",
          priority: 20
        }),
        buildRequest({
          rowId: 308,
          label: "LightRed5m",
          worldPosition: [7, 0, 0],
          animation: "Red_5m",
          priorityRaw: "20",
          priority: 20
        }),
        buildRequest({
          lane: "progfx-type4-vision-request",
          rowId: 328,
          label: "LightDarkvision",
          worldPosition: [0, 0, 0],
          animation: "Dark_Vision",
          visionMode: "Dark_Vision",
          priorityRaw: "51",
          priority: 51,
          proximitySuppression: true
        })
      ],
      pointLightCount: 1,
      pointLights: [
        {
          lane: "placeables-2da-light",
          name: "campfire",
          worldPosition: [1, 0, 0]
        }
      ]
    });

    expect(diagnostics.status).toBe(AURORA_PROGFX_TYPE4_SCHEDULER_STATUS);
    expect(diagnostics.proofSource).toContain("Param4 priority lower value wins");
    expect(diagnostics.blocker).toBe(AURORA_PROGFX_TYPE4_SCHEDULER_BLOCKER);
    expect(diagnostics.priorityWinner).toContain("row=333;label=LightAreaBlackout");
    expect(diagnostics.priorityEvaluationOrderSource).toBe(
      AURORA_PROGFX_TYPE4_PRIORITY_EVALUATION_ORDER_SOURCE
    );
    expect(diagnostics.priorityEvaluationOrder).toEqual([
      expect.stringContaining("rank=1;inputOrder=0;row=333;label=LightAreaBlackout"),
      expect.stringContaining("rank=2;inputOrder=2;row=308;label=LightRed5m"),
      expect.stringContaining("rank=3;inputOrder=1;row=304;label=LightBlue5m"),
      expect.stringContaining("rank=4;inputOrder=3;row=328;label=LightDarkvision")
    ]);
    expect(diagnostics.priorityEvaluationOrder.join("|")).toContain(
      "retailDataFlow=blocked"
    );
    expect(diagnostics.priorityTiePolicyStatus).toBe(
      AURORA_PROGFX_TYPE4_PRIORITY_TIE_POLICY_STATUS
    );
    expect(diagnostics.priorityTopTieBlocked).toBe(false);
    expect(diagnostics.priorityTopTieCandidateCount).toBe(1);
    expect(diagnostics.priorityZeroPolicyStatus).toBe(
      AURORA_PROGFX_TYPE4_PRIORITY_ZERO_POLICY_STATUS
    );
    expect(diagnostics.priorityZeroRuntimeCaptureStatus).toBe(
      AURORA_PROGFX_TYPE4_PRIORITY_ZERO_RUNTIME_CAPTURE_STATUS
    );
    expect(diagnostics.canonicalParityStatus).toBe(
      AURORA_PROGFX_TYPE4_CANONICAL_PARITY_STATUS
    );
    expect(diagnostics.priorityTieGroupCount).toBe(1);
    expect(diagnostics.sceneAttachmentRequestCount).toBe(1);
    expect(diagnostics.proximitySuppressionCandidateCount).toBe(1);
    expect(diagnostics.visionRequestCount).toBe(2);
    expect(diagnostics.lightRequestCount).toBe(2);
    expect(diagnostics.wouldSuppressScenePointLights).toBe(true);
    expect(diagnostics.samples.join("|")).toContain(
      "sceneAttachmentSuppressedPointLights=1"
    );
    expect(diagnostics.samples.join("|")).toContain(
      "proximityCandidate=row=328;label=LightDarkvision;requestPosition=0,0,0;nearestKind=point-light"
    );
    expect(diagnostics.samples.join("|")).toContain(
      "threshold=unknown-retail-distance-blocked"
    );
  });

  it("keeps Param4 zero visible as always-applies priority metadata", () => {
    const diagnostics = resolveAuroraProgFxType4SchedulerPolicy({
      requests: [
        buildRequest({
          rowId: 333,
          label: "PriorityThirteen",
          priorityRaw: "13",
          priority: 13
        }),
        buildRequest({
          rowId: 304,
          label: "PriorityZero",
          priorityRaw: "0",
          priority: 0
        })
      ],
      pointLightCount: 0,
      pointLights: []
    });

    expect(diagnostics.priorityWinner).toContain("row=304;label=PriorityZero");
    expect(diagnostics.priorityTopTieBlocked).toBe(false);
    expect(diagnostics.priorityTopTieCandidateCount).toBe(1);
    expect(diagnostics.priorityZeroAlwaysAppliesRequestCount).toBe(1);
    expect(diagnostics.samples.join("|")).toContain(
      `priorityZeroPolicy=${AURORA_PROGFX_TYPE4_PRIORITY_ZERO_POLICY_STATUS}`
    );
    expect(diagnostics.samples.join("|")).toContain(
      `priorityZeroRuntimeCapture=${AURORA_PROGFX_TYPE4_PRIORITY_ZERO_RUNTIME_CAPTURE_STATUS}`
    );
    expect(diagnostics.samples.join("|")).toContain(
      "priorityZeroAlwaysApplies=1"
    );
    expect(diagnostics.samples.join("|")).toContain(
      `canonicalParity=${AURORA_PROGFX_TYPE4_CANONICAL_PARITY_STATUS}`
    );
  });

  it("does not promote an equal top-priority tie as the retail scheduler winner", () => {
    const diagnostics = resolveAuroraProgFxType4SchedulerPolicy({
      requests: [
        buildRequest({
          rowId: 304,
          label: "LightBlue5m",
          priorityRaw: "20",
          priority: 20
        }),
        buildRequest({
          rowId: 308,
          label: "LightRed5m",
          priorityRaw: "20",
          priority: 20
        })
      ],
      pointLightCount: 0,
      pointLights: []
    });

    expect(diagnostics.priorityTopTieBlocked).toBe(true);
    expect(diagnostics.priorityTopTieCandidateCount).toBe(2);
    expect(diagnostics.priorityWinner).toContain(
      "blocked=equal-priority-top-tie-retail-scheduler-policy-unproven"
    );
    expect(diagnostics.priorityWinner).toContain("candidateCount=2");
    expect(diagnostics.priorityWinner).toContain(
      `policy=${AURORA_PROGFX_TYPE4_PRIORITY_TIE_POLICY_STATUS}`
    );
    expect(diagnostics.priorityEvaluationOrder.join("|")).toContain(
      "retailDataFlow=blocked"
    );
  });
});
