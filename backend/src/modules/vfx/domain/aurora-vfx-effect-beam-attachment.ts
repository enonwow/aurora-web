import type {
  AuroraMdlModelGraph,
  AuroraMdlOrientation,
  AuroraMdlOrientationKeyframe,
  AuroraMdlNumberKeyframe,
  AuroraMdlTransform,
  AuroraMdlVector3Keyframe
} from "./aurora-mdl-vfx-source.parser";
import type { AuroraEffectBeamAttachmentResolver } from "./aurora-vfx-runtime-state";

export interface AuroraVfxAttachmentVector3 {
  x: number;
  y: number;
  z: number;
}

export interface AuroraVfxAttachmentObjectTransform {
  position: AuroraVfxAttachmentVector3;
  orientation?: AuroraMdlOrientation;
  scale?: number;
}

export interface AuroraVfxAttachmentAnimationState {
  animationName: string;
  startTimeSeconds?: number;
  timeScale?: number;
  loop?: boolean;
  lengthSeconds?: number;
  blendWeight?: number;
}

export interface AuroraVfxEffectBeamHostRuntimeInput {
  ref?: string;
  bodyNode: number;
  modelGraph: AuroraMdlModelGraph;
  objectTransform: AuroraVfxAttachmentObjectTransform;
  animation?: AuroraVfxAttachmentAnimationState;
}

export interface AuroraVfxEffectBeamAttachmentRuntimeProfile {
  version: "aurora-effect-beam-host-runtime/v1";
  runtimeProfileId: string;
  source: AuroraVfxEffectBeamHostRuntimeInput;
  target: AuroraVfxEffectBeamHostRuntimeInput;
}

export interface AuroraVfxResolvedModelAttachment {
  nodeName: string;
  nodePath: string[];
  modelPosition: AuroraVfxAttachmentVector3;
  worldPosition: AuroraVfxAttachmentVector3;
  worldOrientation: AuroraMdlOrientation;
  worldScale: number;
  modelSourceHash: string;
}

export interface AuroraVfxResolvedEffectBeamAttachment {
  sourceRef?: string;
  sourcePosition: AuroraVfxAttachmentVector3;
  sourceOrientation: AuroraMdlOrientation;
  sourceNodeName: string;
  sourceNodePath: string[];
  sourceModelHash: string;
  targetRef?: string;
  targetPosition: AuroraVfxAttachmentVector3;
  targetForward?: AuroraVfxAttachmentVector3;
  targetNodeName: string;
  targetNodePath: string[];
  targetModelHash: string;
}

interface EvaluatedTransform {
  position: [number, number, number];
  orientation: AuroraMdlOrientation;
  scale: number;
}

interface EvaluatedTransformChannels {
  position?: [number, number, number];
  orientation?: AuroraMdlOrientation;
  scale?: number;
}

type Quaternion = [number, number, number, number];

const IDENTITY_ORIENTATION: AuroraMdlOrientation = {
  axis: [0, 0, 1],
  angleRadians: 0
};

export function resolveAuroraEffectBeamSourceNodeName(bodyNode: number): string {
  if (bodyNode === 0) return "handconjure";
  if (bodyNode === 1) return "impact";
  return "ground";
}

export function resolveAuroraEffectBeamTargetNodeName(bodyNode: number): string {
  return bodyNode <= 1 ? "impact" : "ground";
}

export function resolveAuroraVfxModelAttachment(input: {
  modelGraph: AuroraMdlModelGraph;
  requestedNodeName: string;
  objectTransform: AuroraVfxAttachmentObjectTransform;
  sourceTimeSeconds?: number;
  animation?: AuroraVfxAttachmentAnimationState;
}): AuroraVfxResolvedModelAttachment {
  const resolved = resolveModelNodeTransform(
    input.modelGraph,
    input.requestedNodeName,
    input.sourceTimeSeconds ?? 0,
    input.animation
  );
  if (!resolved) {
    throw new Error(
      `Aurora attachment node '${input.requestedNodeName}' is missing from ${input.modelGraph.sourceModelFileName ?? input.modelGraph.sourceModelHash}.`
    );
  }

  const objectWorld: EvaluatedTransform = {
    position: vectorToTuple(input.objectTransform.position),
    orientation: input.objectTransform.orientation ?? IDENTITY_ORIENTATION,
    scale: finiteScale(input.objectTransform.scale)
  };
  const world = composeTransforms(objectWorld, resolved.transform);
  return {
    nodeName: resolved.nodeName,
    nodePath: resolved.nodePath,
    modelPosition: tupleToVector(resolved.transform.position),
    worldPosition: tupleToVector(world.position),
    worldOrientation: world.orientation,
    worldScale: world.scale,
    modelSourceHash: input.modelGraph.sourceModelHash
  };
}

export function buildAuroraEffectBeamAttachment(input: {
  sourceRef?: string;
  sourceModelGraph: AuroraMdlModelGraph;
  sourceObjectTransform: AuroraVfxAttachmentObjectTransform;
  sourceBodyNode: number;
  sourceAnimation?: AuroraVfxAttachmentAnimationState;
  targetRef?: string;
  targetModelGraph: AuroraMdlModelGraph;
  targetObjectTransform: AuroraVfxAttachmentObjectTransform;
  targetBodyNode: number;
  targetAnimation?: AuroraVfxAttachmentAnimationState;
  sourceTimeSeconds?: number;
}): AuroraVfxResolvedEffectBeamAttachment {
  const source = resolveAuroraVfxModelAttachment({
    modelGraph: input.sourceModelGraph,
    requestedNodeName: resolveAuroraEffectBeamSourceNodeName(input.sourceBodyNode),
    objectTransform: input.sourceObjectTransform,
    sourceTimeSeconds: input.sourceTimeSeconds,
    animation: input.sourceAnimation
  });
  const target = resolveAuroraVfxModelAttachment({
    modelGraph: input.targetModelGraph,
    requestedNodeName: resolveAuroraEffectBeamTargetNodeName(input.targetBodyNode),
    objectTransform: input.targetObjectTransform,
    sourceTimeSeconds: input.sourceTimeSeconds,
    animation: input.targetAnimation
  });
  return {
    ...(input.sourceRef ? { sourceRef: input.sourceRef } : {}),
    sourcePosition: source.worldPosition,
    sourceOrientation: source.worldOrientation,
    sourceNodeName: source.nodeName,
    sourceNodePath: source.nodePath,
    sourceModelHash: source.modelSourceHash,
    ...(input.targetRef ? { targetRef: input.targetRef } : {}),
    targetPosition: target.worldPosition,
    targetForward: tupleToVector(
      rotateTupleByQuaternion([0, 1, 0], orientationToQuaternion(target.worldOrientation))
    ),
    targetNodeName: target.nodeName,
    targetNodePath: target.nodePath,
    targetModelHash: target.modelSourceHash
  };
}

export function createAuroraEffectBeamAttachmentResolver(
  profile: AuroraVfxEffectBeamAttachmentRuntimeProfile
): AuroraEffectBeamAttachmentResolver {
  return {
    runtimeProfileId: profile.runtimeProfileId,
    serviceEvidence: "profile-gated-adapter",
    resolve: (timeSeconds) =>
      buildAuroraEffectBeamAttachment({
        sourceRef: profile.source.ref,
        sourceModelGraph: profile.source.modelGraph,
        sourceObjectTransform: profile.source.objectTransform,
        sourceBodyNode: profile.source.bodyNode,
        sourceAnimation: profile.source.animation,
        targetRef: profile.target.ref,
        targetModelGraph: profile.target.modelGraph,
        targetObjectTransform: profile.target.objectTransform,
        targetBodyNode: profile.target.bodyNode,
        targetAnimation: profile.target.animation,
        sourceTimeSeconds: Math.max(0, finiteNumber(timeSeconds, 0))
      })
  };
}

export function auroraObjectOrientationFromForward(
  forward: AuroraVfxAttachmentVector3
): AuroraMdlOrientation {
  const length = Math.hypot(forward.x, forward.y);
  if (!(length > 1e-12)) return IDENTITY_ORIENTATION;
  return {
    axis: [0, 0, 1],
    angleRadians: Math.atan2(-forward.x / length, forward.y / length)
  };
}

function resolveModelNodeTransform(
  modelGraph: AuroraMdlModelGraph,
  requestedNodeName: string,
  sourceTimeSeconds: number,
  animation: AuroraVfxAttachmentAnimationState | undefined
): { nodeName: string; nodePath: string[]; transform: EvaluatedTransform } | undefined {
  const lookupName = normalizeNodeName(requestedNodeName);
  if (!lookupName) return undefined;
  const nodes = modelGraph.nodes;
  const visited = new Set<number>();
  const roots = nodes
    .map((node, index) => ({ node, index }))
    .filter(({ node }) => {
      const parentName = normalizeNodeName(node.parentNodeName ?? "");
      return !parentName || parentName === "null";
    });

  const visit = (
    node: AuroraMdlModelGraph["nodes"][number],
    nodeIndex: number,
    parentTransform: EvaluatedTransform,
    parentPath: string[]
  ): { nodeName: string; nodePath: string[]; transform: EvaluatedTransform } | undefined => {
    if (visited.has(nodeIndex)) return undefined;
    visited.add(nodeIndex);
    const transform = composeTransforms(
      parentTransform,
      transformFromMdl(
        node.transform,
        "animationTracks" in node ? node.animationTracks : undefined,
        sourceTimeSeconds,
        animation
      )
    );
    const nodePath = [...parentPath, node.nodeName];
    if (normalizeNodeName(node.nodeName) === lookupName) {
      return { nodeName: node.nodeName, nodePath, transform };
    }
    const childParentName = normalizeNodeName(node.nodeName);
    for (let index = 0; index < nodes.length; index += 1) {
      const child = nodes[index]!;
      if (normalizeNodeName(child.parentNodeName ?? "") !== childParentName) continue;
      const resolved = visit(child, index, transform, nodePath);
      if (resolved) return resolved;
    }
    return undefined;
  };

  const identity: EvaluatedTransform = {
    position: [0, 0, 0],
    orientation: IDENTITY_ORIENTATION,
    scale: 1
  };
  for (const root of roots) {
    const resolved = visit(root.node, root.index, identity, []);
    if (resolved) return resolved;
  }
  return undefined;
}

function transformFromMdl(
  transform: AuroraMdlTransform | undefined,
  animationTracks: Extract<
    AuroraMdlModelGraph["nodes"][number],
    { nodeKind: "transform" }
  >["animationTracks"],
  sourceTimeSeconds: number,
  animation: AuroraVfxAttachmentAnimationState | undefined
): EvaluatedTransform {
  const base = evaluateTransformChannels(transform, sourceTimeSeconds);
  const animationTrack = animationTracks?.find(
    (track) => normalizeNodeName(track.animationName) === normalizeNodeName(animation?.animationName ?? "")
  );
  const animated = animationTrack && animation
    ? evaluateTransformChannels(
        animationTrack.transform,
        resolveAnimationTime(animation, animationTrack.lengthSeconds, sourceTimeSeconds)
      )
    : undefined;
  const blendWeight = clamp01(animation?.blendWeight ?? 1);
  return {
    position: animated?.position
      ? blendVector3(base.position, animated.position, blendWeight)
      : base.position ?? [0, 0, 0],
    orientation: animated?.orientation
      ? blendOrientation(base.orientation, animated.orientation, blendWeight)
      : base.orientation ?? IDENTITY_ORIENTATION,
    scale: animated?.scale !== undefined
      ? blendNumber(base.scale, animated.scale, blendWeight)
      : finiteScale(base.scale)
  };
}

function evaluateTransformChannels(
  transform: AuroraMdlTransform | undefined,
  timeSeconds: number
): EvaluatedTransformChannels {
  if (!transform) return {};
  const position = sampleVector3Keyframes(transform.positionTimeline, timeSeconds);
  const orientation = sampleOrientationKeyframes(transform.orientationTimeline, timeSeconds);
  const scale = sampleNumberKeyframes(transform.scaleTimeline, timeSeconds);
  return {
    ...(position ?? transform.position ? { position: position ?? transform.position } : {}),
    ...(orientation ?? transform.orientation
      ? { orientation: orientation ?? transform.orientation }
      : {}),
    ...(scale !== undefined || transform.scale !== undefined
      ? { scale: scale ?? transform.scale }
      : {})
  };
}

function resolveAnimationTime(
  animation: AuroraVfxAttachmentAnimationState,
  trackLengthSeconds: number | undefined,
  sourceTimeSeconds: number
): number {
  const start = Math.max(0, finiteNumber(animation.startTimeSeconds, 0));
  const scale = finiteNumber(animation.timeScale, 1);
  const raw = Math.max(0, start + Math.max(0, sourceTimeSeconds) * scale);
  const length = finitePositiveNumber(animation.lengthSeconds)
    ?? finitePositiveNumber(trackLengthSeconds);
  if (animation.loop === true && length !== undefined) {
    return ((raw % length) + length) % length;
  }
  return length === undefined ? raw : Math.min(raw, length);
}

function sampleNumberKeyframes(
  frames: ReadonlyArray<AuroraMdlNumberKeyframe> | undefined,
  timeSeconds: number
): number | undefined {
  if (!frames?.length) return undefined;
  const nextIndex = frames.findIndex((frame) => timeSeconds <= frame.time);
  if (nextIndex <= 0) return frames[0]?.value;
  if (nextIndex < 0) return frames.at(-1)?.value;
  const previous = frames[nextIndex - 1]!;
  const next = frames[nextIndex]!;
  const span = next.time - previous.time;
  if (!(span > 0)) return next.value;
  const t = (timeSeconds - previous.time) / span;
  if (previous.interpolation === "bezier" || next.interpolation === "bezier") {
    if (
      previous.bezierOutgoingTangent === undefined ||
      next.bezierIncomingTangent === undefined
    ) {
      return undefined;
    }
    return evaluateCubicBezier(
      previous.value,
      previous.value + previous.bezierOutgoingTangent,
      next.value + next.bezierIncomingTangent,
      next.value,
      t
    );
  }
  return previous.value * (1 - t) + next.value * t;
}

function sampleVector3Keyframes(
  frames: ReadonlyArray<AuroraMdlVector3Keyframe> | undefined,
  timeSeconds: number
): [number, number, number] | undefined {
  if (!frames?.length) return undefined;
  const nextIndex = frames.findIndex((frame) => timeSeconds <= frame.time);
  if (nextIndex <= 0) return frames[0]?.value;
  if (nextIndex < 0) return frames.at(-1)?.value;
  const previous = frames[nextIndex - 1]!;
  const next = frames[nextIndex]!;
  const span = next.time - previous.time;
  if (!(span > 0)) return next.value;
  const t = (timeSeconds - previous.time) / span;
  if (previous.interpolation === "bezier" || next.interpolation === "bezier") {
    const outgoing = previous.bezierOutgoingTangent;
    const incoming = next.bezierIncomingTangent;
    if (!outgoing || !incoming) return undefined;
    return [0, 1, 2].map((index) =>
      evaluateCubicBezier(
        previous.value[index]!,
        previous.value[index]! + outgoing[index]!,
        next.value[index]! + incoming[index]!,
        next.value[index]!,
        t
      )
    ) as [number, number, number];
  }
  return [
    previous.value[0] * (1 - t) + next.value[0] * t,
    previous.value[1] * (1 - t) + next.value[1] * t,
    previous.value[2] * (1 - t) + next.value[2] * t
  ];
}

function sampleOrientationKeyframes(
  frames: ReadonlyArray<AuroraMdlOrientationKeyframe> | undefined,
  timeSeconds: number
): AuroraMdlOrientation | undefined {
  if (!frames?.length || frames.some((frame) => frame.interpolation === "bezier")) {
    return undefined;
  }
  const nextIndex = frames.findIndex((frame) => timeSeconds <= frame.time);
  if (nextIndex <= 0) return frames[0]?.value;
  if (nextIndex < 0) return frames.at(-1)?.value;
  const previous = frames[nextIndex - 1]!;
  const next = frames[nextIndex]!;
  const span = next.time - previous.time;
  if (!(span > 0)) return next.value;
  return blendOrientation(
    previous.value,
    next.value,
    (timeSeconds - previous.time) / span
  );
}

function blendNumber(base: number | undefined, evaluated: number, weight: number): number {
  return base === undefined ? evaluated : evaluated * weight + base * (1 - weight);
}

function blendVector3(
  base: [number, number, number] | undefined,
  evaluated: [number, number, number],
  weight: number
): [number, number, number] {
  return base
    ? [
        evaluated[0] * weight + base[0] * (1 - weight),
        evaluated[1] * weight + base[1] * (1 - weight),
        evaluated[2] * weight + base[2] * (1 - weight)
      ]
    : evaluated;
}

function blendOrientation(
  base: AuroraMdlOrientation | undefined,
  evaluated: AuroraMdlOrientation,
  weight: number
): AuroraMdlOrientation {
  return base
    ? quaternionToOrientation(
        slerpQuaternions(
          orientationToQuaternion(base),
          orientationToQuaternion(evaluated),
          weight
        )
      )
    : evaluated;
}

function slerpQuaternions(source: Quaternion, target: Quaternion, weight: number): Quaternion {
  let [tx, ty, tz, tw] = target;
  let dot = source[0] * tx + source[1] * ty + source[2] * tz + source[3] * tw;
  if (dot < 0) {
    dot = -dot;
    tx = -tx;
    ty = -ty;
    tz = -tz;
    tw = -tw;
  }
  if (dot > 0.9995) {
    return normalizeQuaternion([
      source[0] + (tx - source[0]) * weight,
      source[1] + (ty - source[1]) * weight,
      source[2] + (tz - source[2]) * weight,
      source[3] + (tw - source[3]) * weight
    ]);
  }
  const theta = Math.acos(Math.max(-1, Math.min(1, dot)));
  const sine = Math.sin(theta);
  return normalizeQuaternion([
    source[0] * (Math.sin((1 - weight) * theta) / sine) + tx * (Math.sin(weight * theta) / sine),
    source[1] * (Math.sin((1 - weight) * theta) / sine) + ty * (Math.sin(weight * theta) / sine),
    source[2] * (Math.sin((1 - weight) * theta) / sine) + tz * (Math.sin(weight * theta) / sine),
    source[3] * (Math.sin((1 - weight) * theta) / sine) + tw * (Math.sin(weight * theta) / sine)
  ]);
}

function evaluateCubicBezier(
  start: number,
  startControl: number,
  endControl: number,
  end: number,
  t: number
): number {
  const inverse = 1 - t;
  return (
    inverse * inverse * inverse * start +
    3 * inverse * inverse * t * startControl +
    3 * inverse * t * t * endControl +
    t * t * t * end
  );
}

function composeTransforms(parent: EvaluatedTransform, local: EvaluatedTransform): EvaluatedTransform {
  const parentQuaternion = orientationToQuaternion(parent.orientation);
  const localQuaternion = orientationToQuaternion(local.orientation);
  const localPosition: [number, number, number] = [
    local.position[0] * parent.scale,
    local.position[1] * parent.scale,
    local.position[2] * parent.scale
  ];
  const rotated = rotateTupleByQuaternion(localPosition, parentQuaternion);
  return {
    position: [
      parent.position[0] + rotated[0],
      parent.position[1] + rotated[1],
      parent.position[2] + rotated[2]
    ],
    orientation: quaternionToOrientation(
      multiplyQuaternions(parentQuaternion, localQuaternion)
    ),
    scale: parent.scale * local.scale
  };
}

function orientationToQuaternion(orientation: AuroraMdlOrientation): Quaternion {
  const [rawX, rawY, rawZ] = orientation.axis;
  const axisLength = Math.hypot(rawX, rawY, rawZ);
  if (!(axisLength > 1e-12) || !Number.isFinite(orientation.angleRadians)) {
    return [0, 0, 0, 1];
  }
  const sine = Math.sin(orientation.angleRadians * 0.5) / axisLength;
  return normalizeQuaternion([
    rawX * sine,
    rawY * sine,
    rawZ * sine,
    Math.cos(orientation.angleRadians * 0.5)
  ]);
}

function quaternionToOrientation([x, y, z, w]: Quaternion): AuroraMdlOrientation {
  const clampedW = Math.max(-1, Math.min(1, w));
  const angleRadians = 2 * Math.acos(clampedW);
  const sine = Math.sqrt(Math.max(0, 1 - clampedW * clampedW));
  if (!(sine > 1e-12) || !(angleRadians > 1e-12)) return IDENTITY_ORIENTATION;
  return { axis: [x / sine, y / sine, z / sine], angleRadians };
}

function multiplyQuaternions(
  [ax, ay, az, aw]: Quaternion,
  [bx, by, bz, bw]: Quaternion
): Quaternion {
  return normalizeQuaternion([
    aw * bx + ax * bw + ay * bz - az * by,
    aw * by - ax * bz + ay * bw + az * bx,
    aw * bz + ax * by - ay * bx + az * bw,
    aw * bw - ax * bx - ay * by - az * bz
  ]);
}

function rotateTupleByQuaternion(
  [x, y, z]: [number, number, number],
  [qx, qy, qz, qw]: Quaternion
): [number, number, number] {
  const ix = qw * x + qy * z - qz * y;
  const iy = qw * y + qz * x - qx * z;
  const iz = qw * z + qx * y - qy * x;
  const iw = -qx * x - qy * y - qz * z;
  return [
    ix * qw + iw * -qx + iy * -qz - iz * -qy,
    iy * qw + iw * -qy + iz * -qx - ix * -qz,
    iz * qw + iw * -qz + ix * -qy - iy * -qx
  ];
}

function normalizeQuaternion(value: Quaternion): Quaternion {
  const length = Math.hypot(value[0], value[1], value[2], value[3]);
  return length > 1e-12
    ? [value[0] / length, value[1] / length, value[2] / length, value[3] / length]
    : [0, 0, 0, 1];
}

function finiteScale(value: number | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 1;
}

function finiteNumber(value: number | undefined, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function finitePositiveNumber(value: number | undefined): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : undefined;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, finiteNumber(value, 1)));
}

function vectorToTuple(value: AuroraVfxAttachmentVector3): [number, number, number] {
  return [value.x, value.y, value.z];
}

function tupleToVector(value: [number, number, number]): AuroraVfxAttachmentVector3 {
  return { x: value[0], y: value[1], z: value[2] };
}

function normalizeNodeName(value: string): string {
  return value.trim().toLowerCase();
}
