import type { AuroraMdlModelGraph } from "../../src/modules/vfx/domain/aurora-mdl-vfx-source.parser";
import { composeAuroraMdlInheritedTransformAnimation } from "../../src/modules/vfx/domain/aurora-mdl-inherited-animation-graph";
import { resolveAuroraVfxModelAttachment } from "../../src/modules/vfx/domain/aurora-vfx-effect-beam-attachment";

function graph(): AuroraMdlModelGraph {
  return {
    version: "aurora-mdl-model-graph/v1",
    sourceFormat: "aurora-mdl-binary",
    sourceModelFileName: "pfh0.mdl",
    sourceModelHash: "pfh0-sha256",
    nodes: [
      {
        nodeKind: "transform",
        sourceNodeKind: "dummy",
        nodeName: "pfh0",
        provenance: { sourceFormat: "aurora-mdl-binary" }
      },
      {
        nodeKind: "static-geometry",
        sourceNodeKind: "trimesh",
        nodeName: "RootDummy",
        parentNodeName: "pfh0",
        provenance: { sourceFormat: "aurora-mdl-binary", parentNodeName: "pfh0" }
      },
      {
        nodeKind: "transform",
        sourceNodeKind: "dummy",
        nodeName: "torso_g",
        parentNodeName: "RootDummy",
        provenance: { sourceFormat: "aurora-mdl-binary", parentNodeName: "RootDummy" }
      },
      {
        nodeKind: "transform",
        sourceNodeKind: "dummy",
        nodeName: "Impact",
        parentNodeName: "torso_g",
        transform: { position: [0, 0, 1.5] },
        provenance: { sourceFormat: "aurora-mdl-binary", parentNodeName: "torso_g" }
      }
    ],
    animationEvents: [],
    propagationEvents: []
  };
}

describe("Aurora inherited MDL transform animation graph", () => {
  it("binds supermodel tracks by node name and drives a live Impact attachment", () => {
    const composed = composeAuroraMdlInheritedTransformAnimation(graph(), {
      animationName: "pause1",
      lengthSeconds: 2,
      transitionSeconds: 1,
      nodes: [
        {
          nodeName: "rootdummy",
          positionKeys: [
            { time: 0, value: [0, 0, 0] },
            { time: 1, value: [0.2, 0, 0] }
          ]
        },
        {
          nodeName: "TORSO_G",
          orientationKeys: [
            { time: 0, axisAngle: [0, 0, 1, 0] },
            { time: 1, axisAngle: [0, 0, 1, Math.PI / 8] }
          ]
        },
        {
          nodeName: "impact",
          orientationKeys: [
            { time: 0, axisAngle: [1, 0, 0, 0] },
            { time: 1, axisAngle: [1, 0, 0, Math.PI / 12] }
          ]
        },
        {
          nodeName: "not_in_base_model",
          positionKeys: [{ time: 0, value: [1, 2, 3] }]
        }
      ]
    });

    expect(composed.modelGraph.sourceModelHash).toBe("pfh0-sha256");
    expect(composed.modelGraph.nodes.map((node) => node.nodeName)).toEqual([
      "pfh0",
      "RootDummy",
      "torso_g",
      "Impact"
    ]);
    expect(composed.evidence).toEqual({
      animationName: "pause1",
      lengthSeconds: 2,
      transitionSeconds: 1,
      sourceAnimationNodeCount: 4,
      matchedTransformNodeNames: ["RootDummy", "torso_g", "Impact"],
      missingTransformNodeNames: ["not_in_base_model"]
    });

    const atStart = resolveAuroraVfxModelAttachment({
      modelGraph: composed.modelGraph,
      requestedNodeName: "Impact",
      objectTransform: { position: { x: 0, y: 0, z: 0 } },
      sourceTimeSeconds: 0,
      animation: { animationName: "pause1", loop: true, lengthSeconds: 2 }
    });
    const atOneSecond = resolveAuroraVfxModelAttachment({
      modelGraph: composed.modelGraph,
      requestedNodeName: "Impact",
      objectTransform: { position: { x: 0, y: 0, z: 0 } },
      sourceTimeSeconds: 1,
      animation: { animationName: "pause1", loop: true, lengthSeconds: 2 }
    });

    expect(atOneSecond.worldPosition.x).not.toBeCloseTo(atStart.worldPosition.x, 6);
    expect(atOneSecond.worldOrientation.angleRadians).not.toBeCloseTo(
      atStart.worldOrientation.angleRadians,
      6
    );

    const recomposed = composeAuroraMdlInheritedTransformAnimation(
      composed.modelGraph,
      {
        animationName: "pause1",
        lengthSeconds: 2,
        nodes: [{ nodeName: "impact", scaleKeys: [{ time: 0, value: 1 }] }]
      }
    );
    const impact = recomposed.modelGraph.nodes.find((node) => node.nodeName === "Impact");
    expect(impact && "animationTracks" in impact ? impact.animationTracks : []).toHaveLength(1);
  });
});
