import type {
  AuroraMdlModelGraph,
  AuroraMdlTransform,
  AuroraMdlTransformAnimation
} from "./aurora-mdl-vfx-source.parser";

export interface AuroraMdlInheritedAnimationVectorKey {
  time: number;
  value: [number, number, number];
}

export interface AuroraMdlInheritedAnimationOrientationKey {
  time: number;
  axisAngle: [number, number, number, number];
}

export interface AuroraMdlInheritedAnimationScalarKey {
  time: number;
  value: number;
}

export interface AuroraMdlInheritedTransformAnimationNode {
  nodeName: string;
  positionKeys?: AuroraMdlInheritedAnimationVectorKey[];
  orientationKeys?: AuroraMdlInheritedAnimationOrientationKey[];
  scaleKeys?: AuroraMdlInheritedAnimationScalarKey[];
}

export interface AuroraMdlInheritedTransformAnimation {
  animationName: string;
  lengthSeconds: number;
  transitionSeconds?: number;
  nodes: AuroraMdlInheritedTransformAnimationNode[];
}

export interface AuroraMdlInheritedAnimationCompositionEvidence {
  animationName: string;
  lengthSeconds: number;
  transitionSeconds?: number;
  sourceAnimationNodeCount: number;
  matchedTransformNodeNames: string[];
  missingTransformNodeNames: string[];
}

export function composeAuroraMdlInheritedTransformAnimation(
  modelGraph: AuroraMdlModelGraph,
  animation: AuroraMdlInheritedTransformAnimation
): {
  modelGraph: AuroraMdlModelGraph;
  evidence: AuroraMdlInheritedAnimationCompositionEvidence;
} {
  const animationName = animation.animationName.trim();
  if (!animationName || !(animation.lengthSeconds > 0)) {
    throw new Error("Inherited MDL animation requires a name and positive length.");
  }

  const animationNodes = new Map<
    string,
    { source: AuroraMdlInheritedTransformAnimationNode; track: AuroraMdlTransformAnimation }
  >();
  for (const source of animation.nodes) {
    const key = normalizeNodeName(source.nodeName);
    const track = buildTransformAnimation(animationName, animation, source);
    if (!key || !track) continue;
    if (animationNodes.has(key)) {
      throw new Error(
        `Inherited MDL animation '${animationName}' contains duplicate transform node '${source.nodeName}'.`
      );
    }
    animationNodes.set(key, { source, track });
  }

  const matchedKeys = new Set<string>();
  const matchedTransformNodeNames: string[] = [];
  const nodes = modelGraph.nodes.map((node) => {
    if (node.nodeKind !== "transform" && node.nodeKind !== "static-geometry") return node;
    const key = normalizeNodeName(node.nodeName);
    const inherited = animationNodes.get(key);
    if (!inherited) return node;
    matchedKeys.add(key);
    matchedTransformNodeNames.push(node.nodeName);
    return {
      ...node,
      animationTracks: [
        ...(node.animationTracks ?? []).filter(
          (track) => normalizeNodeName(track.animationName) !== normalizeNodeName(animationName)
        ),
        inherited.track
      ]
    };
  });

  return {
    modelGraph: { ...modelGraph, nodes },
    evidence: {
      animationName,
      lengthSeconds: animation.lengthSeconds,
      ...(animation.transitionSeconds !== undefined
        ? { transitionSeconds: animation.transitionSeconds }
        : {}),
      sourceAnimationNodeCount: animation.nodes.length,
      matchedTransformNodeNames,
      missingTransformNodeNames: [...animationNodes.entries()]
        .filter(([key]) => !matchedKeys.has(key))
        .map(([, value]) => value.source.nodeName)
    }
  };
}

function buildTransformAnimation(
  animationName: string,
  animation: AuroraMdlInheritedTransformAnimation,
  source: AuroraMdlInheritedTransformAnimationNode
): AuroraMdlTransformAnimation | undefined {
  const transform: AuroraMdlTransform = {
    ...(source.positionKeys?.length
      ? {
          positionTimeline: source.positionKeys.map((key) => ({
            time: key.time,
            value: [...key.value] as [number, number, number]
          }))
        }
      : {}),
    ...(source.orientationKeys?.length
      ? {
          orientationTimeline: source.orientationKeys.map((key) => ({
            time: key.time,
            value: {
              axis: key.axisAngle.slice(0, 3) as [number, number, number],
              angleRadians: key.axisAngle[3]
            }
          }))
        }
      : {}),
    ...(source.scaleKeys?.length
      ? {
          scaleTimeline: source.scaleKeys.map((key) => ({
            time: key.time,
            value: key.value
          }))
        }
      : {})
  };
  if (
    !transform.positionTimeline?.length &&
    !transform.orientationTimeline?.length &&
    !transform.scaleTimeline?.length
  ) {
    return undefined;
  }
  return {
    animationName,
    lengthSeconds: animation.lengthSeconds,
    ...(animation.transitionSeconds !== undefined
      ? { transitionSeconds: animation.transitionSeconds }
      : {}),
    transform
  };
}

function normalizeNodeName(value: string): string {
  return value.trim().toLowerCase();
}
