import type { AuroraMdlModelGraph } from "../../src/modules/vfx/domain/aurora-mdl-vfx-source.parser";
import {
  auroraObjectOrientationFromForward,
  buildAuroraEffectBeamAttachment,
  createAuroraEffectBeamAttachmentResolver,
  resolveAuroraEffectBeamSourceNodeName,
  resolveAuroraEffectBeamTargetNodeName,
  resolveAuroraVfxModelAttachment
} from "../../src/modules/vfx/domain/aurora-vfx-effect-beam-attachment";

function graph(nodes: AuroraMdlModelGraph["nodes"]): AuroraMdlModelGraph {
  return {
    version: "aurora-mdl-model-graph/v1",
    sourceFormat: "aurora-mdl-binary",
    sourceModelFileName: "fixture.mdl",
    sourceModelHash: "fixture-sha256",
    nodes,
    animationEvents: [],
    propagationEvents: []
  };
}

describe("Aurora EffectBeam attachment resolver", () => {
  it("maps retail body selectors to the LoadVisualEffect node suffixes", () => {
    expect(resolveAuroraEffectBeamSourceNodeName(0)).toBe("handconjure");
    expect(resolveAuroraEffectBeamSourceNodeName(1)).toBe("impact");
    expect(resolveAuroraEffectBeamSourceNodeName(2)).toBe("ground");
    expect(resolveAuroraEffectBeamTargetNodeName(0)).toBe("impact");
    expect(resolveAuroraEffectBeamTargetNodeName(1)).toBe("impact");
    expect(resolveAuroraEffectBeamTargetNodeName(2)).toBe("ground");
  });

  it("composes the complete model hierarchy and object transform", () => {
    const result = resolveAuroraVfxModelAttachment({
      modelGraph: graph([
        { nodeKind: "transform", sourceNodeKind: "dummy", nodeName: "root", transform: { position: [0, 0, 1] }, provenance: { sourceFormat: "aurora-mdl-binary" } },
        { nodeKind: "transform", sourceNodeKind: "dummy", nodeName: "torso", parentNodeName: "root", transform: { position: [0, 1, 0] }, provenance: { sourceFormat: "aurora-mdl-binary", parentNodeName: "root" } },
        { nodeKind: "transform", sourceNodeKind: "dummy", nodeName: "Impact", parentNodeName: "torso", transform: { position: [1, 0, 0.5] }, provenance: { sourceFormat: "aurora-mdl-binary", parentNodeName: "torso" } }
      ]),
      requestedNodeName: "impact",
      objectTransform: {
        position: { x: 10, y: 20, z: 0 },
        orientation: { axis: [0, 0, 1], angleRadians: Math.PI }
      }
    });

    expect(result.nodePath).toEqual(["root", "torso", "Impact"]);
    expect(result.modelPosition).toEqual({ x: 1, y: 1, z: 1.5 });
    expect(result.worldPosition.x).toBeCloseTo(9, 10);
    expect(result.worldPosition.y).toBeCloseTo(19, 10);
    expect(result.worldPosition.z).toBeCloseTo(1.5, 10);
  });

  it("matches native FindPart pre-order DFS when duplicate node names exist", () => {
    const result = resolveAuroraVfxModelAttachment({
      modelGraph: graph([
        { nodeKind: "transform", sourceNodeKind: "dummy", nodeName: "root", provenance: { sourceFormat: "aurora-mdl-binary" } },
        { nodeKind: "transform", sourceNodeKind: "dummy", nodeName: "first_branch", parentNodeName: "root", transform: { position: [1, 0, 0] }, provenance: { sourceFormat: "aurora-mdl-binary", parentNodeName: "root" } },
        { nodeKind: "transform", sourceNodeKind: "dummy", nodeName: "second_branch", parentNodeName: "root", transform: { position: [9, 0, 0] }, provenance: { sourceFormat: "aurora-mdl-binary", parentNodeName: "root" } },
        { nodeKind: "transform", sourceNodeKind: "dummy", nodeName: "Impact", parentNodeName: "second_branch", transform: { position: [0, 2, 0] }, provenance: { sourceFormat: "aurora-mdl-binary", parentNodeName: "second_branch" } },
        { nodeKind: "transform", sourceNodeKind: "dummy", nodeName: "Impact", parentNodeName: "first_branch", transform: { position: [0, 3, 0] }, provenance: { sourceFormat: "aurora-mdl-binary", parentNodeName: "first_branch" } }
      ]),
      requestedNodeName: "impact",
      objectTransform: { position: { x: 0, y: 0, z: 0 } }
    });

    expect(result.nodePath).toEqual(["root", "first_branch", "Impact"]);
    expect(result.modelPosition).toEqual({ x: 1, y: 3, z: 0 });
  });

  it("builds source and target Impact attachments instead of object origins", () => {
    const sourceGraph = graph([
      { nodeKind: "transform", sourceNodeKind: "dummy", nodeName: "pmh0", provenance: { sourceFormat: "aurora-mdl-binary" } },
      { nodeKind: "transform", sourceNodeKind: "dummy", nodeName: "Impact", parentNodeName: "pmh0", transform: { position: [0, 0.1, 1.47] }, provenance: { sourceFormat: "aurora-mdl-binary", parentNodeName: "pmh0" } }
    ]);
    const targetGraph = { ...sourceGraph, sourceModelHash: "target-sha256" };
    const attachment = buildAuroraEffectBeamAttachment({
      sourceRef: "source",
      sourceModelGraph: sourceGraph,
      sourceObjectTransform: {
        position: { x: 0, y: 0, z: 0 },
        orientation: auroraObjectOrientationFromForward({ x: 0, y: 1, z: 0 })
      },
      sourceBodyNode: 1,
      targetRef: "target",
      targetModelGraph: targetGraph,
      targetObjectTransform: {
        position: { x: 0, y: 3, z: 0 },
        orientation: auroraObjectOrientationFromForward({ x: 0, y: -1, z: 0 })
      },
      targetBodyNode: 0
    });

    expect(attachment.sourceNodeName).toBe("Impact");
    expect(attachment.targetNodeName).toBe("Impact");
    expect(attachment.sourcePosition.z).toBeCloseTo(1.47, 10);
    expect(attachment.targetPosition.y).toBeCloseTo(2.9, 10);
    expect(attachment.targetPosition.z).toBeCloseTo(1.47, 10);
    expect(attachment.targetForward?.y).toBeCloseTo(-1, 10);
    expect(attachment.sourceModelHash).toBe("fixture-sha256");
    expect(attachment.targetModelHash).toBe("target-sha256");
  });

  it("samples looping host animation tracks at every attachment time", () => {
    const animatedGraph = graph([
      { nodeKind: "transform", sourceNodeKind: "dummy", nodeName: "root", provenance: { sourceFormat: "aurora-mdl-binary" } },
      {
        nodeKind: "transform",
        sourceNodeKind: "dummy",
        nodeName: "Impact",
        parentNodeName: "root",
        transform: { position: [0, 0, 1] },
        animationTracks: [
          {
            animationName: "combatidle",
            lengthSeconds: 2,
            transform: {
              positionTimeline: [
                { time: 0, value: [0, 0, 1] },
                { time: 2, value: [0, 2, 1] }
              ]
            }
          }
        ],
        provenance: { sourceFormat: "aurora-mdl-binary", parentNodeName: "root" }
      }
    ]);
    const resolver = createAuroraEffectBeamAttachmentResolver({
      version: "aurora-effect-beam-host-runtime/v1",
      runtimeProfileId: "animated-host-regression",
      source: {
        ref: "source",
        bodyNode: 1,
        modelGraph: animatedGraph,
        objectTransform: { position: { x: 0, y: 0, z: 0 } },
        animation: { animationName: "combatidle", loop: true, lengthSeconds: 2 }
      },
      target: {
        ref: "target",
        bodyNode: 1,
        modelGraph: { ...animatedGraph, sourceModelHash: "target-sha256" },
        objectTransform: { position: { x: 10, y: 0, z: 0 } },
        animation: { animationName: "combatidle", loop: true, lengthSeconds: 2 }
      }
    });

    const first = resolver.resolve(1);
    const wrapped = resolver.resolve(2.5);
    expect(first.sourcePosition).toEqual({ x: 0, y: 1, z: 1 });
    expect(first.targetPosition).toEqual({ x: 10, y: 1, z: 1 });
    expect(wrapped.sourcePosition).toEqual({ x: 0, y: 0.5, z: 1 });
    expect(wrapped.targetPosition).toEqual({ x: 10, y: 0.5, z: 1 });
  });

  it("keeps the signed parent rotation when composing an animated host attachment", () => {
    const animatedGraph = graph([
      {
        nodeKind: "transform",
        sourceNodeKind: "dummy",
        nodeName: "root",
        animationTracks: [
          {
            animationName: "turn",
            lengthSeconds: 1,
            transform: {
              orientationTimeline: [
                {
                  time: 0,
                  value: { axis: [0, 0, 1], angleRadians: 0 }
                },
                {
                  time: 1,
                  value: { axis: [0, 0, 1], angleRadians: Math.PI / 2 }
                }
              ]
            }
          }
        ],
        provenance: { sourceFormat: "aurora-mdl-binary" }
      },
      {
        nodeKind: "transform",
        sourceNodeKind: "dummy",
        nodeName: "Impact",
        parentNodeName: "root",
        transform: { position: [1, 0, 0] },
        provenance: {
          sourceFormat: "aurora-mdl-binary",
          parentNodeName: "root"
        }
      }
    ]);

    const result = resolveAuroraVfxModelAttachment({
      modelGraph: animatedGraph,
      requestedNodeName: "Impact",
      objectTransform: { position: { x: 0, y: 0, z: 0 } },
      sourceTimeSeconds: 1,
      animation: { animationName: "turn", lengthSeconds: 1 }
    });

    expect(result.worldPosition.x).toBeCloseTo(0, 10);
    expect(result.worldPosition.y).toBeCloseTo(1, 10);
    expect(result.worldPosition.z).toBeCloseTo(0, 10);
    expect(result.worldOrientation.axis[2]).toBeGreaterThan(0);
    expect(result.worldOrientation.angleRadians).toBeCloseTo(Math.PI / 2, 10);
  });
});
