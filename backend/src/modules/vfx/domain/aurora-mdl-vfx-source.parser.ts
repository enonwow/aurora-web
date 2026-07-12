import { createHash } from "node:crypto";

export type AuroraMdlVfxSourceFormat = "aurora-mdl-ascii" | "aurora-mdl-binary";

export interface AuroraMdlVfxParseOptions {
  sourceModelObjectKey?: string;
  sourceModelFileName?: string;
  sourceModelHash?: string;
}

export interface AuroraMdlVfxDiagnostic {
  code: string;
  severity: "info" | "warn" | "error";
  message: string;
}

export interface AuroraMdlVfxSourceProvenance {
  sourceFormat: AuroraMdlVfxSourceFormat;
  sourceModelObjectKey?: string;
  sourceModelFileName?: string;
  sourceModelHash?: string;
}

export interface AuroraMdlNodeProvenance extends AuroraMdlVfxSourceProvenance {
  sourceLineNumber?: number;
  sourceNodeOffset?: number;
  parentNodeName?: string;
  childNodeNames?: string[];
}

export interface AuroraMdlOrientation {
  axis: [number, number, number];
  angleRadians: number;
}

export interface AuroraMdlOrientationKeyframe {
  time: number;
  value: AuroraMdlOrientation;
}

export interface AuroraMdlTransform {
  position?: [number, number, number];
  positionTimeline?: AuroraMdlVector3Keyframe[];
  orientation?: AuroraMdlOrientation;
  orientationTimeline?: AuroraMdlOrientationKeyframe[];
  scale?: number;
  scaleTimeline?: AuroraMdlNumberKeyframe[];
}

export interface AuroraMdlControllerRow {
  property: string;
  rawToken: string;
  rowKind: "direct" | "key" | "bezier-key";
  values: number[];
  sourceLineNumber?: number;
  binaryControllerType?: number;
}

export interface AuroraMdlNumberKeyframe {
  time: number;
  value: number;
}

export interface AuroraMdlColorKeyframe {
  time: number;
  value: [number, number, number];
}

export interface AuroraMdlVector3Keyframe {
  time: number;
  value: [number, number, number];
}

export type AuroraMdlEmitterSimulationTimelineKey =
  | "xSize"
  | "ySize"
  | "birthrate"
  | "lifeExp"
  | "mass"
  | "velocity"
  | "randvel"
  | "spread"
  | "particleRot"
  | "bounceCoefficient"
  | "blastRadius"
  | "blastLength"
  | "blurLength"
  | "detonate"
  | "fps"
  | "frameStart"
  | "frameEnd"
  | "lightningScale"
  | "lightningDelay"
  | "lightningRadius"
  | "p2pBezier2"
  | "p2pBezier3"
  | "combineTime"
  | "grav"
  | "drag"
  | "threshold"
  | "sizeStart"
  | "sizeMid"
  | "sizeEnd"
  | "sizeStartY"
  | "sizeMidY"
  | "sizeEndY"
  | "percentStart"
  | "percentMid"
  | "percentEnd"
  | "alphaStart"
  | "alphaMid"
  | "alphaEnd";

export type AuroraMdlEmitterSimulationTimeline = Partial<
  Record<AuroraMdlEmitterSimulationTimelineKey, AuroraMdlNumberKeyframe[]>
>;

export type AuroraMdlEmitterColorTimelineKey = "colorStart" | "colorMid" | "colorEnd";

export type AuroraMdlEmitterColorTimeline = Partial<
  Record<AuroraMdlEmitterColorTimelineKey, AuroraMdlColorKeyframe[]>
>;

export interface AuroraMdlEmitterAtlas {
  xGridRaw?: number;
  yGridRaw?: number;
  effectiveXGrid: number;
  effectiveYGrid: number;
  fps?: number;
  frameStart?: number;
  frameEnd?: number;
  random?: boolean;
}

export interface AuroraMdlEmitterSimulation {
  xSize?: number;
  ySize?: number;
  spawnType?: number;
  birthrate?: number;
  lifeExp?: number;
  mass?: number;
  velocity?: number;
  randvel?: number;
  spread?: number;
  particleRot?: number;
  bounce?: boolean;
  bounceCoefficient?: number;
  blastRadius?: number;
  blastLength?: number;
  blurLength?: number;
  detonate?: number;
  fps?: number;
  frameStart?: number;
  frameEnd?: number;
  lightningScale?: number;
  lightningDelay?: number;
  lightningRadius?: number;
  deadspace?: number;
  p2p?: boolean;
  p2pType?: string;
  p2pBezier2?: number;
  p2pBezier3?: number;
  p2pSource?: number;
  p2pTarget?: number;
  combineTime?: number;
  grav?: number;
  drag?: number;
  threshold?: number;
  inherit?: boolean;
  inheritVel?: boolean;
  inheritLocal?: boolean;
  inheritPart?: boolean;
  affectedByWind?: boolean;
  sizeStart?: number;
  sizeMid?: number;
  sizeEnd?: number;
  sizeStartY?: number;
  sizeMidY?: number;
  sizeEndY?: number;
  alphaStart?: number;
  alphaMid?: number;
  alphaEnd?: number;
  colorStart?: [number, number, number];
  colorMid?: [number, number, number];
  colorEnd?: [number, number, number];
  percentStart?: number;
  percentMid?: number;
  percentEnd?: number;
  timeline?: AuroraMdlEmitterSimulationTimeline;
  colorTimeline?: AuroraMdlEmitterColorTimeline;
}

export interface AuroraMdlEmitterSourceState {
  renderOrder?: number;
  renderHintRaw?: string;
  renderHintMode?: 0 | 1 | 2 | 3;
  customShaderVS?: string;
  customShaderFS?: string;
  customShaderGS?: string;
  transparency?: boolean;
  twoSidedMaterial?: boolean;
  twoSidedTexture?: boolean;
  sampleFramebuffer?: number;
  volumetric?: boolean;
  loop?: boolean;
  isTinted?: boolean;
  splat?: boolean;
  rotateTexture?: boolean;
}

export interface AuroraMdlAnimationEvent {
  time: number;
  type: string;
  animationName?: string;
}

export interface AuroraAnimationEvaluationPass {
  animationName: string;
  lengthSeconds?: number;
  transitionSeconds?: number;
  emitterState?: {
    simulation?: AuroraMdlEmitterSimulation;
    transform?: AuroraMdlTransform;
    directRows?: AuroraMdlControllerRow[];
    keyRows?: AuroraMdlControllerRow[];
    bezierKeyRows?: AuroraMdlControllerRow[];
  };
  lightState?: {
    positionTimeline?: AuroraMdlVector3Keyframe[];
    colorTimeline?: AuroraMdlColorKeyframe[];
    radiusTimeline?: AuroraMdlNumberKeyframe[];
    shadowRadiusTimeline?: AuroraMdlNumberKeyframe[];
    verticalDisplacementTimeline?: AuroraMdlNumberKeyframe[];
    multiplierTimeline?: AuroraMdlNumberKeyframe[];
  };
  events?: AuroraMdlAnimationEvent[];
}

export interface AuroraMdlEmitterAnimation {
  animationName: string;
  lengthSeconds?: number;
  transitionSeconds?: number;
  simulation?: AuroraMdlEmitterSimulation;
  transform?: AuroraMdlTransform;
}

export interface AuroraMdlReferenceNode {
  nodeKind: "reference";
  nodeName: string;
  parentNodeName?: string;
  provenance: AuroraMdlNodeProvenance;
  transform?: AuroraMdlTransform;
  orientation?: AuroraMdlOrientation;
}

export interface AuroraMdlShadowBlobNode {
  nodeKind: "shadowblob";
  nodeName: string;
  sourceNodeKind: "shadowblob";
  parentNodeName?: string;
  provenance: AuroraMdlNodeProvenance;
  transform?: AuroraMdlTransform;
  orientation?: AuroraMdlOrientation;
  proofStatus: "source-only-no-owning-shadow-policy-callsite";
}

export interface AuroraMdlPropagationEvent {
  token:
    | "propagatecolorshift"
    | "propagateillumination"
    | "propagaterender"
    | "propagateviewvolume";
  sourceNodeName?: string;
  sourceNodeKind?: string;
  provenance: AuroraMdlNodeProvenance;
  proofStatus: "source-only-model-graph-propagation-no-render-policy";
}

export interface AuroraMdlEmitterNode {
  nodeKind: "emitter";
  nodeName: string;
  parentNodeName?: string;
  provenance: AuroraMdlNodeProvenance;
  sourceFormat: AuroraMdlVfxSourceFormat;
  sourceModelObjectKey?: string;
  sourceModelFileName?: string;
  sourceModelHash?: string;
  texture?: string;
  chunkName?: string;
  emitterType?: string;
  emitterTypeRaw?: string;
  renderMode?: string;
  renderModeRaw?: string;
  blendMode?: string;
  blendModeRaw?: string;
  atlas?: AuroraMdlEmitterAtlas;
  simulation?: AuroraMdlEmitterSimulation;
  transform?: AuroraMdlTransform;
  orientation?: AuroraMdlOrientation;
  referenceNodes?: AuroraMdlReferenceNode[];
  events?: AuroraMdlAnimationEvent[];
  animations?: AuroraMdlEmitterAnimation[];
  animationPasses?: AuroraAnimationEvaluationPass[];
  sourceState?: AuroraMdlEmitterSourceState;
  directRows: AuroraMdlControllerRow[];
  keyRows: AuroraMdlControllerRow[];
  bezierKeyRows: AuroraMdlControllerRow[];
  colorTimelines: AuroraMdlEmitterColorTimeline;
}

export interface AuroraMdlLightAnimation {
  animationName: string;
  lengthSeconds?: number;
  transitionSeconds?: number;
  positionTimeline?: AuroraMdlVector3Keyframe[];
  colorTimeline?: AuroraMdlColorKeyframe[];
  radiusTimeline?: AuroraMdlNumberKeyframe[];
  shadowRadiusTimeline?: AuroraMdlNumberKeyframe[];
  verticalDisplacementTimeline?: AuroraMdlNumberKeyframe[];
  multiplierTimeline?: AuroraMdlNumberKeyframe[];
}

export interface AuroraMdlLightNode {
  nodeKind: "light";
  nodeName: string;
  sourceNodeKind?: string;
  parentNodeName?: string;
  provenance: AuroraMdlNodeProvenance;
  sourceFormat: AuroraMdlVfxSourceFormat;
  sourceModelObjectKey?: string;
  sourceModelFileName?: string;
  sourceModelHash?: string;
  transform?: AuroraMdlTransform;
  orientation?: AuroraMdlOrientation;
  radius?: number;
  shadowRadius?: number;
  verticalDisplacement?: number;
  multiplier?: number;
  color?: [number, number, number];
  ambientOnly?: boolean;
  dynamicType?: number;
  affectDynamic?: boolean;
  shadow?: boolean;
  lightPriority?: number;
  generateFlare?: boolean;
  textureNames?: string[];
  flareSizes?: number[];
  flarePositions?: number[];
  flareColorShifts?: [number, number, number][];
  flareRadius?: number;
  lensFlares?: boolean;
  fadingLight?: boolean;
  animations?: AuroraMdlLightAnimation[];
}

export interface AuroraMdlVfxSourceParseResult {
  source: AuroraMdlVfxSourceFormat;
  sourceFormat: AuroraMdlVfxSourceFormat;
  sourceModelObjectKey?: string;
  sourceModelFileName?: string;
  sourceModelHash: string;
  emitters: AuroraMdlEmitterNode[];
  lights: AuroraMdlLightNode[];
  referenceNodes: AuroraMdlReferenceNode[];
  shadowBlobNodes: AuroraMdlShadowBlobNode[];
  propagationEvents: AuroraMdlPropagationEvent[];
  diagnostics: AuroraMdlVfxDiagnostic[];
}

export interface AuroraGlbEmitterProxyBoundary {
  canonicalRuntime: false;
  diagnostics: AuroraMdlVfxDiagnostic[];
}

const AURORA_EMITTER_SIMULATION_TIMELINE_KEYS = [
  "xSize",
  "ySize",
  "birthrate",
  "lifeExp",
  "mass",
  "velocity",
  "randvel",
  "spread",
  "particleRot",
  "bounceCoefficient",
  "blastRadius",
  "blastLength",
  "blurLength",
  "detonate",
  "fps",
  "frameStart",
  "frameEnd",
  "lightningScale",
  "lightningDelay",
  "lightningRadius",
  "p2pBezier2",
  "p2pBezier3",
  "combineTime",
  "grav",
  "drag",
  "threshold",
  "sizeStart",
  "sizeMid",
  "sizeEnd",
  "sizeStartY",
  "sizeMidY",
  "sizeEndY",
  "percentStart",
  "percentMid",
  "percentEnd",
  "alphaStart",
  "alphaMid",
  "alphaEnd"
] as const satisfies readonly AuroraMdlEmitterSimulationTimelineKey[];

const AURORA_EMITTER_SIMULATION_TIMELINE_KEY_SET = new Set<string>(
  AURORA_EMITTER_SIMULATION_TIMELINE_KEYS
);

const AURORA_EMITTER_SIMULATION_NON_NEGATIVE_TIMELINE_KEYS = new Set<string>([
  "xSize",
  "ySize",
  "lifeExp",
  "randvel",
  "spread",
  "blastRadius",
  "blastLength",
  "blurLength",
  "detonate",
  "fps",
  "frameStart",
  "frameEnd",
  "lightningScale",
  "lightningDelay",
  "lightningRadius",
  "p2pBezier2",
  "p2pBezier3",
  "combineTime",
  "threshold",
  "sizeStart",
  "sizeMid",
  "sizeEnd",
  "sizeStartY",
  "sizeMidY",
  "sizeEndY",
  "percentStart",
  "percentMid",
  "percentEnd",
  "alphaStart",
  "alphaMid",
  "alphaEnd"
]);

const AURORA_BINARY_MODEL_BASE = 12;
const AURORA_BINARY_MODEL_ANIMATIONS_OFFSET = 120;
const AURORA_BINARY_NODE_HEADER_SIZE = 0x70;
const AURORA_BINARY_NODE_NAME_OFFSET = 32;
const AURORA_BINARY_NODE_CHILDREN_OFFSET = 72;
const AURORA_BINARY_NODE_CONTROLLER_KEYS_OFFSET = 84;
const AURORA_BINARY_NODE_CONTROLLER_DATA_OFFSET = 96;
const AURORA_BINARY_NODE_FLAGS_OFFSET = 108;
const AURORA_BINARY_NODE_FLAG_LIGHT = 0x0002;
const AURORA_BINARY_NODE_FLAG_EMITTER = 0x0004;
const AURORA_BINARY_NODE_FLAG_MESH = 0x0020;
const AURORA_BINARY_CONTROLLER_RECORD_SIZE = 12;
const AURORA_BINARY_CONTROLLER_POSITION = 8;
const AURORA_BINARY_CONTROLLER_ORIENTATION = 20;
const AURORA_BINARY_CONTROLLER_LIGHT_COLOR = 76;
const AURORA_BINARY_CONTROLLER_LIGHT_RADIUS = 88;
const AURORA_BINARY_CONTROLLER_LIGHT_SHADOW_RADIUS = 96;
const AURORA_BINARY_CONTROLLER_LIGHT_VERTICAL_DISPLACEMENT = 100;
const AURORA_BINARY_CONTROLLER_LIGHT_MULTIPLIER = 140;
const AURORA_BINARY_CONTROLLER_EMITTER_ALPHA_END = 80;
const AURORA_BINARY_CONTROLLER_EMITTER_ALPHA_START = 84;
const AURORA_BINARY_CONTROLLER_EMITTER_BIRTHRATE = 88;
const AURORA_BINARY_CONTROLLER_EMITTER_BOUNCE_COEFFICIENT = 92;
const AURORA_BINARY_CONTROLLER_EMITTER_COLOR_END = 96;
const AURORA_BINARY_CONTROLLER_EMITTER_COLOR_START = 108;
const AURORA_BINARY_CONTROLLER_EMITTER_COMBINE_TIME = 120;
const AURORA_BINARY_CONTROLLER_EMITTER_DRAG = 124;
const AURORA_BINARY_CONTROLLER_EMITTER_FPS = 128;
const AURORA_BINARY_CONTROLLER_EMITTER_FRAME_END = 132;
const AURORA_BINARY_CONTROLLER_EMITTER_FRAME_START = 136;
const AURORA_BINARY_CONTROLLER_EMITTER_GRAV = 140;
const AURORA_BINARY_CONTROLLER_EMITTER_LIFE_EXP = 144;
const AURORA_BINARY_CONTROLLER_EMITTER_MASS = 148;
const AURORA_BINARY_CONTROLLER_EMITTER_P2P_BEZIER2 = 152;
const AURORA_BINARY_CONTROLLER_EMITTER_P2P_BEZIER3 = 156;
const AURORA_BINARY_CONTROLLER_EMITTER_PARTICLE_ROT = 160;
const AURORA_BINARY_CONTROLLER_EMITTER_RAND_VEL = 164;
const AURORA_BINARY_CONTROLLER_EMITTER_SIZE_START = 168;
const AURORA_BINARY_CONTROLLER_EMITTER_SIZE_END = 172;
const AURORA_BINARY_CONTROLLER_EMITTER_SIZE_START_Y = 176;
const AURORA_BINARY_CONTROLLER_EMITTER_SIZE_END_Y = 180;
const AURORA_BINARY_CONTROLLER_EMITTER_SPREAD = 184;
const AURORA_BINARY_CONTROLLER_EMITTER_THRESHOLD = 188;
const AURORA_BINARY_CONTROLLER_EMITTER_VELOCITY = 192;
const AURORA_BINARY_CONTROLLER_EMITTER_SIZE_X = 196;
const AURORA_BINARY_CONTROLLER_EMITTER_SIZE_Y = 200;
const AURORA_BINARY_CONTROLLER_EMITTER_BLUR_LENGTH = 204;
// Aurora Toolset decompilation: the `lightningScale` MDL token maps to animation
// controller id 0xD8 (216), alongside fps=0x80, particleRot=0xA0, xsize=0xC4,
// ysize=0xC8. See docs/aurora-reverse/VFX_Lightning_P2P_GapAnalysis_2026-06-17.md.
const AURORA_BINARY_CONTROLLER_EMITTER_LIGHTNING_SCALE = 216;
const AURORA_BINARY_CONTROLLER_EMITTER_DETONATE = 228;
const AURORA_BINARY_CONTROLLER_EMITTER_ALPHA_MID = 468;
const AURORA_BINARY_CONTROLLER_EMITTER_COLOR_MID = 472;
const AURORA_BINARY_CONTROLLER_EMITTER_PERCENT_START = 484;
const AURORA_BINARY_CONTROLLER_EMITTER_PERCENT_MID = 485;
const AURORA_BINARY_CONTROLLER_EMITTER_PERCENT_END = 486;
const AURORA_BINARY_CONTROLLER_EMITTER_SIZE_MID = 488;
const AURORA_BINARY_CONTROLLER_EMITTER_SIZE_MID_Y = 492;
const AURORA_BINARY_LIGHT_FLARE_RADIUS_OFFSET = 0x70;
const AURORA_BINARY_LIGHT_FLARE_SIZES_OFFSET = 0x80;
const AURORA_BINARY_LIGHT_FLARE_POSITIONS_OFFSET = 0x8c;
const AURORA_BINARY_LIGHT_FLARE_COLOR_SHIFTS_OFFSET = 0x98;
const AURORA_BINARY_LIGHT_TEXTURE_NAMES_OFFSET = 0xa4;
const AURORA_BINARY_LIGHT_PRIORITY_OFFSET = 0xb0;
const AURORA_BINARY_LIGHT_AMBIENT_ONLY_OFFSET = 0xb4;
const AURORA_BINARY_LIGHT_DYNAMIC_TYPE_OFFSET = 0xb8;
const AURORA_BINARY_LIGHT_AFFECT_DYNAMIC_OFFSET = 0xbc;
const AURORA_BINARY_LIGHT_SHADOW_OFFSET = 0xc0;
const AURORA_BINARY_LIGHT_GENERATE_FLARE_OFFSET = 0xc4;
const AURORA_BINARY_LIGHT_FADING_LIGHT_OFFSET = 0xc8;
const AURORA_BINARY_ANIMATION_REASONABLE_MAX_SECONDS = 24 * 60 * 60;
const AURORA_BINARY_ANIMATION_REASONABLE_MIN_POSITIVE_SECONDS = 1e-6;
const AURORA_BINARY_EMITTER_DEAD_SPACE_OFFSET = 0x70;
const AURORA_BINARY_EMITTER_XGRID_OFFSET = 0x7c;
const AURORA_BINARY_EMITTER_YGRID_OFFSET = 0x80;
const AURORA_BINARY_EMITTER_SPAWN_TYPE_OFFSET = 0x84;
const AURORA_BINARY_EMITTER_TYPE_OFFSET = 0x88;
const AURORA_BINARY_EMITTER_RENDER_MODE_OFFSET = 0xa8;
const AURORA_BINARY_EMITTER_BLEND_MODE_OFFSET = 0xc8;
const AURORA_BINARY_EMITTER_TEXTURE_OFFSET = 232;
const AURORA_BINARY_EMITTER_CHUNK_NAME_OFFSET = 0x128;
const AURORA_BINARY_EMITTER_CHUNK_NAME_LENGTH = 0x10;
const AURORA_BINARY_EMITTER_TWO_SIDED_TEX_OFFSET = 0x138;
const AURORA_BINARY_EMITTER_LOOP_OFFSET = 0x13c;
const AURORA_BINARY_EMITTER_RENDER_ORDER_OFFSET = 0x140;
const AURORA_BINARY_EMITTER_FLAGS_OFFSET = 0x144;
const AURORA_BINARY_EMITTER_FLAG_P2P = 0x1;
const AURORA_BINARY_EMITTER_FLAG_P2P_BEZIER = 0x2;
const AURORA_BINARY_EMITTER_FLAG_AFFECTED_BY_WIND = 0x4;
const AURORA_BINARY_EMITTER_FLAG_IS_TINTED = 0x8;
const AURORA_BINARY_EMITTER_FLAG_BOUNCE = 0x10;
const AURORA_BINARY_EMITTER_FLAG_RANDOM_ATLAS_FRAME = 0x20;
const AURORA_BINARY_EMITTER_FLAG_INHERIT = 0x40;
const AURORA_BINARY_EMITTER_FLAG_INHERIT_VEL = 0x80;
const AURORA_BINARY_EMITTER_FLAG_INHERIT_LOCAL = 0x100;
const AURORA_BINARY_EMITTER_FLAG_SPLAT = 0x200;
const AURORA_BINARY_EMITTER_FLAG_INHERIT_PART = 0x400;
const AURORA_BINARY_ANIMATION_NAME_OFFSET = 8;
const AURORA_BINARY_ANIMATION_NAME_LENGTH = 64;
const AURORA_BINARY_ANIMATION_ROOT_NODE_OFFSET = 72;
const AURORA_ASCII_LIGHT_NODE_KINDS = new Set([
  "light",
  "sourcelight",
  "placeablelight",
  "fx_light"
]);
const AURORA_ASCII_MODEL_PROPAGATION_TOKENS = new Set([
  "propagatecolorshift",
  "propagateillumination",
  "propagaterender",
  "propagateviewvolume"
]);

interface AuroraBinaryArrayHeader {
  offset: number;
  count: number;
}

interface AuroraBinaryControllerValue {
  type: number;
  rows: number;
  columns: number;
  values: number[];
  keyframes: number[][];
}

interface MutableEmitter extends AuroraMdlEmitterNode {}

interface MutableLight extends AuroraMdlLightNode {
  animationName?: string;
  lengthSeconds?: number;
  transitionSeconds?: number;
  positionTimeline?: AuroraMdlVector3Keyframe[];
  colorTimeline?: AuroraMdlColorKeyframe[];
  radiusTimeline?: AuroraMdlNumberKeyframe[];
  shadowRadiusTimeline?: AuroraMdlNumberKeyframe[];
  verticalDisplacementTimeline?: AuroraMdlNumberKeyframe[];
  multiplierTimeline?: AuroraMdlNumberKeyframe[];
}

export function parseAuroraMdlVfxSource(
  bytes: Buffer,
  options: AuroraMdlVfxParseOptions = {}
): AuroraMdlVfxSourceParseResult {
  const sourceFormat: AuroraMdlVfxSourceFormat = isLikelyAuroraBinaryModel(bytes)
    ? "aurora-mdl-binary"
    : "aurora-mdl-ascii";
  const sourceModelHash =
    options.sourceModelHash ?? createHash("sha256").update(bytes).digest("hex");
  const provenance: AuroraMdlVfxSourceProvenance = {
    sourceFormat,
    ...(options.sourceModelObjectKey ? { sourceModelObjectKey: options.sourceModelObjectKey } : {}),
    ...(options.sourceModelFileName ? { sourceModelFileName: options.sourceModelFileName } : {}),
    sourceModelHash
  };

  if (sourceFormat === "aurora-mdl-binary") {
    const parsed = parseAuroraBinaryMdlVfxSource(bytes, provenance);
    return {
      source: sourceFormat,
      sourceFormat,
      ...(options.sourceModelObjectKey ? { sourceModelObjectKey: options.sourceModelObjectKey } : {}),
      ...(options.sourceModelFileName ? { sourceModelFileName: options.sourceModelFileName } : {}),
      sourceModelHash,
      ...parsed
    };
  }

  const parsed = parseAuroraAsciiMdlVfxSource(bytes, provenance);
  return {
    source: sourceFormat,
    sourceFormat,
    ...(options.sourceModelObjectKey ? { sourceModelObjectKey: options.sourceModelObjectKey } : {}),
    ...(options.sourceModelFileName ? { sourceModelFileName: options.sourceModelFileName } : {}),
    sourceModelHash,
    ...parsed
  };
}

export function classifyAuroraGlbEmitterProxyBoundary(): AuroraGlbEmitterProxyBoundary {
  return {
    canonicalRuntime: false,
    diagnostics: [
      {
        code: "VFX_GLB_EMITTER_PROXY_NON_CANONICAL",
        severity: "warn",
        message:
          "GLB emitter_proxy is preview provenance only; AuroraMdlEmitterNode must come from source MDL parsing."
      }
    ]
  };
}

function parseAuroraAsciiMdlVfxSource(
  bytes: Buffer,
  sourceProvenance: AuroraMdlVfxSourceProvenance
): Pick<
  AuroraMdlVfxSourceParseResult,
  | "emitters"
  | "lights"
  | "referenceNodes"
  | "shadowBlobNodes"
  | "propagationEvents"
  | "diagnostics"
> {
  const emitters: MutableEmitter[] = [];
  const lights: AuroraMdlLightNode[] = [];
  const referenceNodes: AuroraMdlReferenceNode[] = [];
  const shadowBlobNodes: AuroraMdlShadowBlobNode[] = [];
  const propagationEvents: AuroraMdlPropagationEvent[] = [];
  const diagnostics: AuroraMdlVfxDiagnostic[] = [];
  const lightAnimationTracks: Array<{ nodeName: string; animation: AuroraMdlLightAnimation }> = [];
  const animationEvents: AuroraMdlAnimationEvent[] = [];
  const lines = bytes.toString("latin1").split(/\r?\n/u);
  const nodeStack: Array<
    | { kind: "emitter"; emitter: MutableEmitter }
    | { kind: "light"; light: MutableLight }
    | { kind: "reference"; reference: AuroraMdlReferenceNode }
    | { kind: "shadowblob"; shadowBlob: AuroraMdlShadowBlobNode }
    | { kind: "other"; nodeName?: string }
  > = [];
  let currentAnimation:
    | {
        animationName: string;
        lengthSeconds?: number;
        transitionSeconds?: number;
      }
    | undefined;

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const sourceLineNumber = lineIndex + 1;
    const withoutComments = stripAuroraAsciiLineComments(lines[lineIndex] ?? "");
    if (!withoutComments) {
      continue;
    }

    const tokens = withoutComments.split(/\s+/u);
    const key = tokens[0]?.toLowerCase();
    if (!key) {
      continue;
    }
    const rawValue = tokens.slice(1).join(" ");

    if (key === "newanim") {
      const animationName = normalizeAuroraMdlValue(tokens[1] ?? "");
      currentAnimation = animationName ? { animationName } : undefined;
      continue;
    }
    if (key === "doneanim") {
      currentAnimation = undefined;
      continue;
    }
    if (currentAnimation && key === "length") {
      const lengthSeconds = sanitizeNonNegativeNumber(readAuroraNumberValue(rawValue));
      if (lengthSeconds !== undefined) {
        currentAnimation.lengthSeconds = lengthSeconds;
      }
      continue;
    }
    if (currentAnimation && key === "transtime") {
      const transitionSeconds = sanitizeNonNegativeNumber(readAuroraNumberValue(rawValue));
      if (transitionSeconds !== undefined) {
        currentAnimation.transitionSeconds = transitionSeconds;
      }
      continue;
    }
    if (key === "event") {
      const event = buildAuroraAnimationEvent({
        time: readAuroraNumberValue(tokens[1] ?? ""),
        type: normalizeAuroraMdlValue(tokens.slice(2).join(" ")),
        animationName: currentAnimation?.animationName
      });
      if (event) {
        animationEvents.push(event);
      }
      continue;
    }

    if (key === "node") {
      const nodeKind = tokens[1]?.toLowerCase();
      const nodeName = normalizeAuroraMdlValue(tokens.slice(2).join(" "));
      if (nodeKind === "emitter") {
        nodeStack.push({
          kind: "emitter",
          emitter: createEmitterNode({
            nodeName: nodeName ?? `emitter_${emitters.length + 1}`,
            parentNodeName: resolveNearestOpenNodeName(nodeStack),
            sourceLineNumber,
            sourceProvenance
          })
        });
        continue;
      }
      if (isAuroraAsciiLightNodeKind(nodeKind)) {
        nodeStack.push({
          kind: "light",
          light: createLightNode({
            nodeName:
              nodeName ?? `light_${lights.length + lightAnimationTracks.length + 1}`,
            sourceNodeKind: nodeKind,
            parentNodeName: resolveNearestOpenNodeName(nodeStack),
            sourceLineNumber,
            sourceProvenance,
            animation: currentAnimation
          })
        });
        continue;
      }
      if (nodeKind === "reference") {
        nodeStack.push({
          kind: "reference",
          reference: createReferenceNode({
            nodeName: nodeName ?? `reference_${referenceNodes.length + 1}`,
            parentNodeName: resolveNearestOpenEmitterName(nodeStack),
            sourceLineNumber,
            sourceProvenance
          })
        });
        continue;
      }
      if (nodeKind === "shadowblob") {
        nodeStack.push({
          kind: "shadowblob",
          shadowBlob: createShadowBlobNode({
            nodeName: nodeName ?? `shadowblob_${shadowBlobNodes.length + 1}`,
            parentNodeName: resolveNearestOpenNodeName(nodeStack),
            sourceLineNumber,
            sourceProvenance
          })
        });
        continue;
      }
      nodeStack.push({ kind: "other", nodeName });
      continue;
    }

    if (key === "endnode" || (key === "end" && tokens[1]?.toLowerCase() === "node")) {
      const currentNode = nodeStack.pop();
      if (currentNode?.kind === "emitter") {
        emitters.push(finalizeEmitterNode(currentNode.emitter));
      } else if (currentNode?.kind === "light") {
        const animation = buildAuroraLightAnimationTrack(currentNode.light);
        if (animation && currentNode.light.animationName) {
          lightAnimationTracks.push({
            nodeName: currentNode.light.nodeName,
            animation
          });
        } else {
          lights.push(finalizeLightNode(currentNode.light));
        }
      } else if (currentNode?.kind === "reference") {
        referenceNodes.push(finalizeReferenceNode(currentNode.reference));
      } else if (currentNode?.kind === "shadowblob") {
        shadowBlobNodes.push(finalizeShadowBlobNode(currentNode.shadowBlob));
      }
      continue;
    }

    const currentNode = nodeStack[nodeStack.length - 1];
    if (!currentNode) {
      continue;
    }

    if (isAuroraAsciiModelPropagationToken(key)) {
      propagationEvents.push(
        createPropagationEvent({
          token: key,
          nodeName: resolveOpenNodeStackEntryName(currentNode),
          nodeKind: currentNode.kind,
          parentNodeName: resolveNearestOpenNodeName(nodeStack.slice(0, -1)),
          sourceLineNumber,
          sourceProvenance
        })
      );
      continue;
    }

    if (currentNode.kind === "reference") {
      applyAsciiReferenceField(currentNode.reference, key, rawValue);
      continue;
    }
    if (currentNode.kind === "shadowblob") {
      applyAsciiShadowBlobField(currentNode.shadowBlob, key, rawValue);
      continue;
    }
    if (currentNode.kind === "light") {
      const parse = applyAsciiLightField(currentNode.light, key, rawValue, lines, lineIndex);
      lineIndex = parse.endLineIndex;
      continue;
    }
    if (currentNode.kind === "emitter") {
      const parse = applyAsciiEmitterField(
        currentNode.emitter,
        key,
        rawValue,
        lines,
        lineIndex
      );
      lineIndex = parse.endLineIndex;
    }
  }

  while (nodeStack.length > 0) {
    const currentNode = nodeStack.pop();
    if (currentNode?.kind === "emitter") {
      emitters.push(finalizeEmitterNode(currentNode.emitter));
    } else if (currentNode?.kind === "light") {
      const animation = buildAuroraLightAnimationTrack(currentNode.light);
      if (animation && currentNode.light.animationName) {
        lightAnimationTracks.push({
          nodeName: currentNode.light.nodeName,
          animation
        });
      } else {
        lights.push(finalizeLightNode(currentNode.light));
      }
    } else if (currentNode?.kind === "reference") {
      referenceNodes.push(finalizeReferenceNode(currentNode.reference));
    } else if (currentNode?.kind === "shadowblob") {
      shadowBlobNodes.push(finalizeShadowBlobNode(currentNode.shadowBlob));
    }
  }

  if (shadowBlobNodes.length > 0) {
    diagnostics.push({
      code: "VFX_SPELLS_SHADOWBLOB_NOT_SHADOW_POLICY",
      severity: "warn",
      message:
        "MDL shadowblob source nodes are preserved for inspection only; no decompiled owning shadow-policy call-site is mapped to renderer shadows."
    });
  }
  if (propagationEvents.length > 0) {
    diagnostics.push({
      code: "VFX_MODEL_PROPAGATION_SOURCE_ONLY",
      severity: "warn",
      message:
        "MDL propagate* source tokens are preserved as model graph propagation events only; they are not renderer light, tint, shader, or shadow policy."
    });
  }

  return {
    emitters: attachEventsToEmitters(
      attachReferenceNodesToEmitters(emitters, referenceNodes),
      animationEvents
    ),
    lights: attachLightAnimations(lights, lightAnimationTracks),
    referenceNodes,
    shadowBlobNodes,
    propagationEvents,
    diagnostics
  };
}

function parseAuroraBinaryMdlVfxSource(
  bytes: Buffer,
  sourceProvenance: AuroraMdlVfxSourceProvenance
): Pick<
  AuroraMdlVfxSourceParseResult,
  | "emitters"
  | "lights"
  | "referenceNodes"
  | "shadowBlobNodes"
  | "propagationEvents"
  | "diagnostics"
> {
  const rootNodeOffset = readAuroraBinaryUInt32(bytes, AURORA_BINARY_MODEL_BASE + 72);
  if (rootNodeOffset === null) {
    return {
      emitters: [],
      lights: [],
      referenceNodes: [],
      shadowBlobNodes: [],
      propagationEvents: [],
      diagnostics: []
    };
  }
  const emitters = collectAuroraBinaryEmitterNodesFromRoot(bytes, rootNodeOffset, sourceProvenance);
  const lights = collectAuroraBinaryLightNodesFromRoot(bytes, rootNodeOffset, sourceProvenance);
  const animationPasses = collectAuroraBinaryAnimationEmitterPasses(bytes, sourceProvenance);
  const lightAnimationTracks = collectAuroraBinaryAnimationLightTracks(bytes, sourceProvenance);
  const emittersWithAnimations = attachBinaryAnimationPassesToEmitters(emitters, animationPasses);
  const lightsWithAnimations = attachLightAnimations(lights, lightAnimationTracks);
  const referenceNodes = emittersWithAnimations.flatMap((emitter) => emitter.referenceNodes ?? []);
  return {
    emitters: emittersWithAnimations,
    lights: lightsWithAnimations,
    referenceNodes,
    shadowBlobNodes: [],
    propagationEvents: [],
    diagnostics: []
  };
}

function applyAsciiEmitterField(
  emitter: MutableEmitter,
  key: string,
  rawValue: string,
  lines: string[],
  lineIndex: number
): { endLineIndex: number } {
  const rowKind: AuroraMdlControllerRow["rowKind"] = key.toLowerCase().endsWith("bezierkey")
    ? "bezier-key"
    : "key";
  const colorTimelineKey = toAuroraEmitterSimulationColorTimelineKey(key);
  if (colorTimelineKey) {
    const timelineParse = readAuroraAsciiColorTimeline(lines, lineIndex, rawValue);
    if (timelineParse.frames.length > 0) {
      setEmitterSimulationValue(emitter, colorTimelineKey, timelineParse.frames[0]?.value);
      setEmitterSimulationColorTimelineValue(emitter, colorTimelineKey, timelineParse.frames);
      emitter.colorTimelines = {
        ...emitter.colorTimelines,
        [colorTimelineKey]: timelineParse.frames
      };
      emitter[rowKind === "bezier-key" ? "bezierKeyRows" : "keyRows"].push(
        ...timelineParse.rows.map((values) => ({
          property: colorTimelineKey,
          rawToken: key,
          rowKind,
          values,
          sourceLineNumber: lineIndex + 1
        }))
      );
      return { endLineIndex: timelineParse.endLineIndex };
    }
    return { endLineIndex: lineIndex };
  }

  const simulationTimelineKey = toAuroraEmitterSimulationTimelineKey(key);
  if (simulationTimelineKey) {
    const timelineParse = readAuroraAsciiNumberTimeline(lines, lineIndex, rawValue);
    if (timelineParse.frames.length > 0) {
      setEmitterSimulationValue(emitter, simulationTimelineKey, timelineParse.frames[0]?.value);
      setEmitterSimulationTimelineValue(emitter, simulationTimelineKey, timelineParse.frames);
      emitter[rowKind === "bezier-key" ? "bezierKeyRows" : "keyRows"].push(
        ...timelineParse.rows.map((values) => ({
          property: simulationTimelineKey,
          rawToken: key,
          rowKind,
          values,
          sourceLineNumber: lineIndex + 1
        }))
      );
      return { endLineIndex: timelineParse.endLineIndex };
    }
    return { endLineIndex: lineIndex };
  }

  const pushDirectRow = (property: string, values: number[]): void => {
    emitter.directRows.push({
      property,
      rawToken: key,
      rowKind: "direct",
      values,
      sourceLineNumber: lineIndex + 1
    });
  };

  if (key === "parent") {
    const parentNodeName = normalizeAuroraMdlValue(rawValue);
    if (parentNodeName) {
      emitter.parentNodeName = parentNodeName;
      emitter.provenance.parentNodeName = parentNodeName;
    }
    return { endLineIndex: lineIndex };
  }
  if (key === "texture" || key === "bitmap") {
    const texture = normalizeModelTextureReference(rawValue);
    if (texture) {
      emitter.texture = texture;
    }
    return { endLineIndex: lineIndex };
  }
  if (key === "chunkname" || key === "chunk_name") {
    const chunkName = normalizeAuroraModelResourceReference(rawValue);
    if (chunkName) {
      emitter.chunkName = chunkName;
    }
    return { endLineIndex: lineIndex };
  }
  if (key === "position") {
    const position = readAuroraVector3Value(rawValue);
    setEmitterTransformValue(emitter, "position", position);
    if (position) {
      pushDirectRow("position", position);
    }
    return { endLineIndex: lineIndex };
  }
  if (key === "positionkey" || key === "positionbezierkey") {
    const timelineParse = readAuroraAsciiVector3Timeline(lines, lineIndex, rawValue);
    if (timelineParse.frames.length > 0) {
      const firstPosition = timelineParse.frames[0]?.value;
      setEmitterTransformValue(emitter, "positionTimeline", timelineParse.frames);
      if (firstPosition) {
        setEmitterTransformValue(emitter, "position", firstPosition);
      }
      emitter[rowKind === "bezier-key" ? "bezierKeyRows" : "keyRows"].push(
        ...timelineParse.rows.map((values) => ({
          property: "position",
          rawToken: key,
          rowKind,
          values,
          sourceLineNumber: lineIndex + 1
        }))
      );
      return { endLineIndex: timelineParse.endLineIndex };
    }
    return { endLineIndex: lineIndex };
  }
  if (key === "orientation") {
    const orientation = readAuroraOrientationValue(rawValue);
    setEmitterTransformValue(emitter, "orientation", orientation);
    if (orientation) {
      emitter.orientation = orientation;
      pushDirectRow("orientation", [...orientation.axis, orientation.angleRadians]);
    }
    return { endLineIndex: lineIndex };
  }
  if (key === "orientationkey" || key === "orientationbezierkey") {
    const timelineParse = readAuroraAsciiOrientationTimeline(lines, lineIndex, rawValue);
    if (timelineParse.frames.length > 0) {
      const firstOrientation = timelineParse.frames[0]?.value;
      setEmitterTransformValue(emitter, "orientationTimeline", timelineParse.frames);
      if (firstOrientation) {
        setEmitterTransformValue(emitter, "orientation", firstOrientation);
        emitter.orientation = firstOrientation;
      }
      emitter[rowKind === "bezier-key" ? "bezierKeyRows" : "keyRows"].push(
        ...timelineParse.rows.map((values) => ({
          property: "orientation",
          rawToken: key,
          rowKind,
          values,
          sourceLineNumber: lineIndex + 1
        }))
      );
      return { endLineIndex: timelineParse.endLineIndex };
    }
    return { endLineIndex: lineIndex };
  }
  if (key === "scale") {
    const scale = readAuroraNumberValue(rawValue);
    setEmitterTransformValue(emitter, "scale", scale);
    if (typeof scale === "number") {
      pushDirectRow("scale", [scale]);
    }
    return { endLineIndex: lineIndex };
  }
  if (key === "scalekey" || key === "scalebezierkey") {
    const timelineParse = readAuroraAsciiNumberTimeline(lines, lineIndex, rawValue);
    if (timelineParse.frames.length > 0) {
      const firstScale = timelineParse.frames[0]?.value;
      setEmitterTransformValue(emitter, "scaleTimeline", timelineParse.frames);
      if (typeof firstScale === "number") {
        setEmitterTransformValue(emitter, "scale", firstScale);
      }
      emitter[rowKind === "bezier-key" ? "bezierKeyRows" : "keyRows"].push(
        ...timelineParse.rows.map((values) => ({
          property: "scale",
          rawToken: key,
          rowKind,
          values,
          sourceLineNumber: lineIndex + 1
        }))
      );
      return { endLineIndex: timelineParse.endLineIndex };
    }
    return { endLineIndex: lineIndex };
  }
  if (key === "render" || key === "rendermode" || key === "render_mode") {
    const renderMode = normalizeAuroraMdlValue(rawValue);
    if (renderMode) {
      emitter.renderMode = renderMode;
      emitter.renderModeRaw = renderMode;
    }
    return { endLineIndex: lineIndex };
  }
  if (key === "blend" || key === "blendmode" || key === "blend_mode") {
    const blendMode = normalizeAuroraMdlValue(rawValue);
    if (blendMode) {
      emitter.blendMode = blendMode;
      emitter.blendModeRaw = blendMode;
    }
    return { endLineIndex: lineIndex };
  }
  if (key === "type" || key === "emittertype" || key === "emitter_type" || key === "update") {
    const emitterType = normalizeAuroraMdlValue(rawValue);
    if (emitterType) {
      emitter.emitterType = emitterType;
      emitter.emitterTypeRaw = emitterType;
    }
    return { endLineIndex: lineIndex };
  }

  const atlasKey = toEmitterAtlasKey(key);
  if (atlasKey) {
    const value = atlasKey === "random" ? readAuroraBooleanValue(rawValue) : readAuroraNumberValue(rawValue);
    setEmitterAtlasValue(emitter, atlasKey, value);
    if (typeof value === "number") {
      pushDirectRow(atlasKey, [value]);
    }
    return { endLineIndex: lineIndex };
  }

  const sourceStateKey = toEmitterSourceStateKey(key);
  if (sourceStateKey) {
    const value =
      sourceStateKey === "renderOrder"
        ? readAuroraIntegerValue(rawValue)
        : sourceStateKey === "renderHintRaw" ||
            sourceStateKey === "customShaderVS" ||
            sourceStateKey === "customShaderFS" ||
            sourceStateKey === "customShaderGS"
          ? normalizeAuroraMdlValue(rawValue)
        : sourceStateKey === "sampleFramebuffer"
          ? readAuroraSampleFramebufferValue(rawValue)
          : readAuroraBooleanValue(rawValue);
    setEmitterSourceStateValue(emitter, sourceStateKey, value);
    if (sourceStateKey === "renderHintRaw" && typeof value === "string") {
      setEmitterSourceStateValue(emitter, "renderHintMode", resolveAuroraRenderHintMode(value));
    }
    if (typeof value === "number") {
      pushDirectRow(sourceStateKey, [value]);
    }
    return { endLineIndex: lineIndex };
  }

  const booleanKey = toEmitterSimulationBooleanKey(key);
  if (booleanKey) {
    setEmitterSimulationValue(emitter, booleanKey, readAuroraBooleanValue(rawValue));
    return { endLineIndex: lineIndex };
  }
  const stringKey = toEmitterSimulationStringKey(key);
  if (stringKey) {
    setEmitterSimulationValue(emitter, stringKey, normalizeAuroraMdlValue(rawValue));
    return { endLineIndex: lineIndex };
  }
  const numberKey = toEmitterSimulationNumberKey(key);
  if (numberKey) {
    const value = readAuroraNumberValue(rawValue);
    setEmitterSimulationValue(emitter, numberKey, value);
    if (typeof value === "number") {
      pushDirectRow(numberKey, [value]);
    }
    return { endLineIndex: lineIndex };
  }
  const colorKey = toEmitterSimulationColorKey(key);
  if (colorKey) {
    const color = readAuroraVector3Value(rawValue);
    setEmitterSimulationValue(emitter, colorKey, color);
    if (color) {
      pushDirectRow(colorKey, color);
    }
  }
  return { endLineIndex: lineIndex };
}

function applyAsciiLightField(
  light: MutableLight,
  key: string,
  rawValue: string,
  lines: string[],
  lineIndex: number
): { endLineIndex: number } {
  if (key === "parent") {
    const parentNodeName = normalizeAuroraMdlValue(rawValue);
    if (parentNodeName) {
      light.parentNodeName = parentNodeName;
      light.provenance.parentNodeName = parentNodeName;
    }
    return { endLineIndex: lineIndex };
  }
  if (key === "position") {
    setLightTransformValue(light, "position", readAuroraVector3Value(rawValue));
    return { endLineIndex: lineIndex };
  }
  if (key === "orientation") {
    const orientation = readAuroraOrientationValue(rawValue);
    setLightTransformValue(light, "orientation", orientation);
    if (orientation) {
      light.orientation = orientation;
    }
    return { endLineIndex: lineIndex };
  }
  if (key === "scale") {
    setLightTransformValue(light, "scale", readAuroraNumberValue(rawValue));
    return { endLineIndex: lineIndex };
  }
  if (key === "positionkey") {
    const timelineParse = readAuroraAsciiVector3KeyframesUntilEndList(lines, lineIndex, rawValue);
    if (timelineParse.frames.length > 0) {
      light.positionTimeline = timelineParse.frames;
      return { endLineIndex: timelineParse.endLineIndex };
    }
    return { endLineIndex: lineIndex };
  }
  if (key === "colorkey" || key === "colorbezierkey") {
    const timelineParse = readAuroraAsciiColorKeyframesUntilEndList(lines, lineIndex, rawValue);
    if (timelineParse.frames.length > 0) {
      light.colorTimeline = timelineParse.frames;
      light.color = timelineParse.frames[0]?.value ?? light.color;
      return { endLineIndex: timelineParse.endLineIndex };
    }
    return { endLineIndex: lineIndex };
  }
  if (key === "radiuskey" || key === "radiusbezierkey") {
    const timelineParse = readAuroraAsciiNumberKeyframesUntilEndList(lines, lineIndex, rawValue);
    if (timelineParse.frames.length > 0) {
      light.radiusTimeline = timelineParse.frames;
      light.radius = timelineParse.frames[0]?.value ?? light.radius;
      return { endLineIndex: timelineParse.endLineIndex };
    }
    return { endLineIndex: lineIndex };
  }
  if (key === "shadowradiuskey" || key === "shadowradiusbezierkey") {
    const timelineParse = readAuroraAsciiNumberKeyframesUntilEndList(lines, lineIndex, rawValue);
    if (timelineParse.frames.length > 0) {
      light.shadowRadiusTimeline = timelineParse.frames;
      light.shadowRadius = timelineParse.frames[0]?.value ?? light.shadowRadius;
      return { endLineIndex: timelineParse.endLineIndex };
    }
    return { endLineIndex: lineIndex };
  }
  if (key === "verticaldisplacementkey" || key === "verticaldisplacementbezierkey") {
    const timelineParse = readAuroraAsciiNumberKeyframesUntilEndList(lines, lineIndex, rawValue);
    if (timelineParse.frames.length > 0) {
      light.verticalDisplacementTimeline = timelineParse.frames;
      light.verticalDisplacement =
        timelineParse.frames[0]?.value ?? light.verticalDisplacement;
      return { endLineIndex: timelineParse.endLineIndex };
    }
    return { endLineIndex: lineIndex };
  }
  if (key === "multiplierkey" || key === "multiplierbezierkey") {
    const timelineParse = readAuroraAsciiNumberKeyframesUntilEndList(lines, lineIndex, rawValue);
    if (timelineParse.frames.length > 0) {
      light.multiplierTimeline = timelineParse.frames;
      light.multiplier = timelineParse.frames[0]?.value ?? light.multiplier;
      return { endLineIndex: timelineParse.endLineIndex };
    }
    return { endLineIndex: lineIndex };
  }

  if (key === "radius") {
    light.radius = sanitizeFiniteNumber(readAuroraNumberValue(rawValue));
  } else if (key === "shadowradius") {
    light.shadowRadius = sanitizeFiniteNumber(readAuroraNumberValue(rawValue));
  } else if (key === "verticaldisplacement") {
    light.verticalDisplacement = sanitizeFiniteNumber(readAuroraNumberValue(rawValue));
  } else if (key === "multiplier") {
    light.multiplier = sanitizeFiniteNumber(readAuroraNumberValue(rawValue));
  } else if (key === "color") {
    light.color = sanitizeColor(readAuroraVector3Value(rawValue));
  } else if (key === "ambientonly") {
    light.ambientOnly = sanitizeBoolean(readAuroraBooleanValue(rawValue));
  } else if (key === "isdynamic" || key === "ndynamictype" || key === "dynamictype") {
    light.dynamicType = sanitizeNonNegativeInteger(readAuroraIntegerValue(rawValue));
  } else if (key === "affectdynamic") {
    light.affectDynamic = sanitizeBoolean(readAuroraBooleanValue(rawValue));
  } else if (key === "shadow") {
    light.shadow = sanitizeBoolean(readAuroraBooleanValue(rawValue));
  } else if (key === "lightpriority") {
    light.lightPriority = sanitizeNonNegativeInteger(readAuroraIntegerValue(rawValue));
  } else if (key === "generateflare") {
    light.generateFlare = sanitizeBoolean(readAuroraBooleanValue(rawValue));
  } else if (key === "texturenames") {
    const listParse = readAuroraAsciiStringListUntilEndList(lines, lineIndex, rawValue);
    if (listParse.values.length > 0) {
      light.textureNames = listParse.values;
      return { endLineIndex: listParse.endLineIndex };
    }
  } else if (key === "flaresizes") {
    const listParse = readAuroraAsciiNumberListUntilEndList(lines, lineIndex, rawValue);
    if (listParse.values.length > 0) {
      light.flareSizes = listParse.values;
      return { endLineIndex: listParse.endLineIndex };
    }
  } else if (key === "flarepositions") {
    const listParse = readAuroraAsciiNumberListUntilEndList(lines, lineIndex, rawValue);
    if (listParse.values.length > 0) {
      light.flarePositions = listParse.values;
      return { endLineIndex: listParse.endLineIndex };
    }
  } else if (key === "flarecolorshifts") {
    const listParse = readAuroraAsciiVector3ListUntilEndList(lines, lineIndex, rawValue);
    if (listParse.values.length > 0) {
      light.flareColorShifts = listParse.values;
      return { endLineIndex: listParse.endLineIndex };
    }
  } else if (key === "flareradius") {
    light.flareRadius = sanitizeFiniteNumber(readAuroraNumberValue(rawValue));
  } else if (key === "lensflares") {
    light.lensFlares = sanitizeBoolean(readAuroraBooleanValue(rawValue));
  } else if (key === "fadinglight") {
    light.fadingLight = sanitizeBoolean(readAuroraBooleanValue(rawValue));
  }
  return { endLineIndex: lineIndex };
}

function applyAsciiReferenceField(
  reference: AuroraMdlReferenceNode,
  key: string,
  rawValue: string
): void {
  if (key === "parent") {
    const parentNodeName = normalizeAuroraMdlValue(rawValue);
    if (parentNodeName) {
      reference.parentNodeName = parentNodeName;
      reference.provenance.parentNodeName = parentNodeName;
    }
    return;
  }
  if (key === "position") {
    setReferenceTransformValue(reference, "position", readAuroraVector3Value(rawValue));
    return;
  }
  if (key === "orientation") {
    const orientation = readAuroraOrientationValue(rawValue);
    setReferenceTransformValue(reference, "orientation", orientation);
    if (orientation) {
      reference.orientation = orientation;
    }
    return;
  }
  if (key === "scale") {
    setReferenceTransformValue(reference, "scale", readAuroraNumberValue(rawValue));
  }
}

function applyAsciiShadowBlobField(
  shadowBlob: AuroraMdlShadowBlobNode,
  key: string,
  rawValue: string
): void {
  if (key === "parent") {
    const parentNodeName = normalizeAuroraMdlValue(rawValue);
    if (parentNodeName) {
      shadowBlob.parentNodeName = parentNodeName;
      shadowBlob.provenance.parentNodeName = parentNodeName;
    }
    return;
  }
  if (key === "position") {
    setShadowBlobTransformValue(shadowBlob, "position", readAuroraVector3Value(rawValue));
    return;
  }
  if (key === "orientation") {
    const orientation = readAuroraOrientationValue(rawValue);
    setShadowBlobTransformValue(shadowBlob, "orientation", orientation);
    if (orientation) {
      shadowBlob.orientation = orientation;
    }
    return;
  }
  if (key === "scale") {
    setShadowBlobTransformValue(shadowBlob, "scale", readAuroraNumberValue(rawValue));
  }
}

function collectAuroraBinaryEmitterNodesFromRoot(
  bytes: Buffer,
  rootNodeOffset: number,
  sourceProvenance: AuroraMdlVfxSourceProvenance,
  options: { implicitTimelineDurationSeconds?: number } = {}
): AuroraMdlEmitterNode[] {
  const emitters: AuroraMdlEmitterNode[] = [];
  const visitedOffsets = new Set<number>();
  const walkNode = (nodeOffset: number, depth: number, parentNodeName?: string): void => {
    if (depth > 256 || visitedOffsets.has(nodeOffset)) {
      return;
    }
    visitedOffsets.add(nodeOffset);

    const absOffset = AURORA_BINARY_MODEL_BASE + nodeOffset;
    if (absOffset < AURORA_BINARY_MODEL_BASE || absOffset + AURORA_BINARY_NODE_HEADER_SIZE > bytes.length) {
      return;
    }

    const flags = readAuroraBinaryUInt32(bytes, absOffset + AURORA_BINARY_NODE_FLAGS_OFFSET);
    if (flags === null) {
      return;
    }
    const nodeName =
      normalizeAuroraMdlValue(
        readAuroraBinaryCString(bytes, absOffset + AURORA_BINARY_NODE_NAME_OFFSET, 32)
      ) ?? `node_${nodeOffset}`;

    if ((flags & AURORA_BINARY_NODE_FLAG_EMITTER) !== 0) {
      emitters.push(readAuroraBinaryEmitterNode(bytes, absOffset, nodeName, parentNodeName, sourceProvenance, options));
    }

    for (const childOffset of readAuroraBinaryNodeChildren(bytes, absOffset)) {
      if (childOffset !== nodeOffset) {
        walkNode(childOffset, depth + 1, nodeName);
      }
    }
  };

  walkNode(rootNodeOffset, 0);
  return emitters;
}

function collectAuroraBinaryLightNodesFromRoot(
  bytes: Buffer,
  rootNodeOffset: number,
  sourceProvenance: AuroraMdlVfxSourceProvenance,
  options: { implicitTimelineDurationSeconds?: number } = {}
): AuroraMdlLightNode[] {
  return collectAuroraBinaryMutableLightNodesFromRoot(
    bytes,
    rootNodeOffset,
    sourceProvenance,
    options
  ).map((light) => finalizeLightNode(light));
}

function collectAuroraBinaryMutableLightNodesFromRoot(
  bytes: Buffer,
  rootNodeOffset: number,
  sourceProvenance: AuroraMdlVfxSourceProvenance,
  options: {
    implicitTimelineDurationSeconds?: number;
    animation?: { animationName: string; lengthSeconds?: number; transitionSeconds?: number };
  } = {}
): MutableLight[] {
  const lights: MutableLight[] = [];
  const visitedOffsets = new Set<number>();
  const walkNode = (nodeOffset: number, depth: number, parentNodeName?: string): void => {
    if (depth > 256 || visitedOffsets.has(nodeOffset)) {
      return;
    }
    visitedOffsets.add(nodeOffset);

    const absOffset = AURORA_BINARY_MODEL_BASE + nodeOffset;
    if (absOffset < AURORA_BINARY_MODEL_BASE || absOffset + AURORA_BINARY_NODE_HEADER_SIZE > bytes.length) {
      return;
    }

    const flags = readAuroraBinaryUInt32(bytes, absOffset + AURORA_BINARY_NODE_FLAGS_OFFSET);
    if (flags === null) {
      return;
    }
    const nodeName =
      normalizeAuroraMdlValue(
        readAuroraBinaryCString(bytes, absOffset + AURORA_BINARY_NODE_NAME_OFFSET, 32)
      ) ?? `node_${nodeOffset}`;

    if ((flags & AURORA_BINARY_NODE_FLAG_LIGHT) !== 0) {
      lights.push(
        readAuroraBinaryLightNode(bytes, absOffset, nodeName, parentNodeName, sourceProvenance, options)
      );
    }

    for (const childOffset of readAuroraBinaryNodeChildren(bytes, absOffset)) {
      if (childOffset !== nodeOffset) {
        walkNode(childOffset, depth + 1, nodeName);
      }
    }
  };

  walkNode(rootNodeOffset, 0);
  return lights;
}

function readAuroraBinaryEmitterNode(
  bytes: Buffer,
  nodeAbsOffset: number,
  nodeName: string,
  parentNodeName: string | undefined,
  sourceProvenance: AuroraMdlVfxSourceProvenance,
  options: { implicitTimelineDurationSeconds?: number }
): AuroraMdlEmitterNode {
  const emitter = createEmitterNode({
    nodeName,
    parentNodeName,
    sourceNodeOffset: nodeAbsOffset - AURORA_BINARY_MODEL_BASE,
    sourceProvenance
  });
  const texture = normalizeModelTextureReference(
    readAuroraBinaryCString(bytes, nodeAbsOffset + AURORA_BINARY_EMITTER_TEXTURE_OFFSET, 64)
  );
  const chunkName = normalizeAuroraModelResourceReference(
    readAuroraBinaryCString(
      bytes,
      nodeAbsOffset + AURORA_BINARY_EMITTER_CHUNK_NAME_OFFSET,
      AURORA_BINARY_EMITTER_CHUNK_NAME_LENGTH
    )
  );
  const emitterType = normalizeAuroraMdlValue(
    readAuroraBinaryCString(bytes, nodeAbsOffset + AURORA_BINARY_EMITTER_TYPE_OFFSET, 64)
  );
  const renderMode = normalizeAuroraMdlValue(
    readAuroraBinaryCString(bytes, nodeAbsOffset + AURORA_BINARY_EMITTER_RENDER_MODE_OFFSET, 64)
  );
  const blendMode = normalizeAuroraMdlValue(
    readAuroraBinaryCString(bytes, nodeAbsOffset + AURORA_BINARY_EMITTER_BLEND_MODE_OFFSET, 64)
  );
  if (texture) {
    emitter.texture = texture;
  }
  if (chunkName) {
    emitter.chunkName = chunkName;
  }
  if (emitterType) {
    emitter.emitterType = emitterType;
    emitter.emitterTypeRaw = emitterType;
  }
  if (renderMode) {
    emitter.renderMode = renderMode;
    emitter.renderModeRaw = renderMode;
  }
  if (blendMode) {
    emitter.blendMode = blendMode;
    emitter.blendModeRaw = blendMode;
  }
  emitter.atlas = readAuroraBinaryEmitterAtlas(bytes, nodeAbsOffset, emitter);
  const simulation = readAuroraBinaryEmitterSimulation(bytes, nodeAbsOffset, emitter, options);
  if (simulation) {
    emitter.simulation = simulation;
  }
  const emitterFlags = readAuroraBinaryUInt32(bytes, nodeAbsOffset + AURORA_BINARY_EMITTER_FLAGS_OFFSET) ?? 0;
  emitter.sourceState = buildEmitterSourceState({
    twoSidedTexture:
      (readAuroraBinaryUInt32(bytes, nodeAbsOffset + AURORA_BINARY_EMITTER_TWO_SIDED_TEX_OFFSET) ?? 0) !== 0,
    loop:
      (readAuroraBinaryUInt32(bytes, nodeAbsOffset + AURORA_BINARY_EMITTER_LOOP_OFFSET) ?? 0) !== 0,
    renderOrder:
      readAuroraBinaryInt16(bytes, nodeAbsOffset + AURORA_BINARY_EMITTER_RENDER_ORDER_OFFSET) ?? undefined,
    isTinted: (emitterFlags & AURORA_BINARY_EMITTER_FLAG_IS_TINTED) !== 0,
    splat: (emitterFlags & AURORA_BINARY_EMITTER_FLAG_SPLAT) !== 0
  });
  const transform = readAuroraBinaryTransform(bytes, nodeAbsOffset);
  if (transform) {
    emitter.transform = transform;
    emitter.orientation = transform.orientation;
  }
  const referenceNodes = readAuroraBinaryEmitterReferenceNodes(bytes, nodeAbsOffset, emitter.nodeName, sourceProvenance);
  if (referenceNodes.length > 0) {
    emitter.referenceNodes = referenceNodes;
    emitter.provenance.childNodeNames = referenceNodes.map((reference) => reference.nodeName);
  }
  return finalizeEmitterNode(emitter);
}

function readAuroraBinaryLightNode(
  bytes: Buffer,
  nodeAbsOffset: number,
  nodeName: string,
  parentNodeName: string | undefined,
  sourceProvenance: AuroraMdlVfxSourceProvenance,
  options: {
    implicitTimelineDurationSeconds?: number;
    animation?: { animationName: string; lengthSeconds?: number; transitionSeconds?: number };
  } = {}
): MutableLight {
  const light = createLightNode({
    nodeName,
    parentNodeName,
    sourceNodeOffset: nodeAbsOffset - AURORA_BINARY_MODEL_BASE,
    sourceProvenance,
    animation: options.animation
  });

  const transform = readAuroraBinaryTransform(bytes, nodeAbsOffset);
  if (transform) {
    light.transform = transform;
    light.orientation = transform.orientation;
  }

  const readBooleanField = (offset: number): boolean | undefined => {
    const value = readAuroraBinaryUInt32(bytes, nodeAbsOffset + offset);
    return value === null ? undefined : value !== 0;
  };
  const readUInt32Field = (offset: number): number | undefined =>
    readAuroraBinaryUInt32(bytes, nodeAbsOffset + offset) ?? undefined;

  light.lightPriority = sanitizeNonNegativeInteger(
    readUInt32Field(AURORA_BINARY_LIGHT_PRIORITY_OFFSET)
  );
  light.ambientOnly = sanitizeBoolean(readBooleanField(AURORA_BINARY_LIGHT_AMBIENT_ONLY_OFFSET));
  light.dynamicType = sanitizeNonNegativeInteger(
    readUInt32Field(AURORA_BINARY_LIGHT_DYNAMIC_TYPE_OFFSET)
  );
  light.affectDynamic = sanitizeBoolean(readBooleanField(AURORA_BINARY_LIGHT_AFFECT_DYNAMIC_OFFSET));
  light.shadow = sanitizeBoolean(readBooleanField(AURORA_BINARY_LIGHT_SHADOW_OFFSET));
  light.generateFlare = sanitizeBoolean(readBooleanField(AURORA_BINARY_LIGHT_GENERATE_FLARE_OFFSET));
  light.fadingLight = sanitizeBoolean(readBooleanField(AURORA_BINARY_LIGHT_FADING_LIGHT_OFFSET));

  light.textureNames = readAuroraBinaryTextureNameArray(
    bytes,
    nodeAbsOffset + AURORA_BINARY_LIGHT_TEXTURE_NAMES_OFFSET
  );
  light.flareSizes = readAuroraBinaryFloatArray(
    bytes,
    nodeAbsOffset + AURORA_BINARY_LIGHT_FLARE_SIZES_OFFSET
  );
  light.flarePositions = readAuroraBinaryFloatArray(
    bytes,
    nodeAbsOffset + AURORA_BINARY_LIGHT_FLARE_POSITIONS_OFFSET
  );
  light.flareColorShifts = readAuroraBinaryVector3Array(
    bytes,
    nodeAbsOffset + AURORA_BINARY_LIGHT_FLARE_COLOR_SHIFTS_OFFSET
  );
  const flareRadius = sanitizeFiniteNumber(
    readAuroraBinaryFloat32(bytes, nodeAbsOffset + AURORA_BINARY_LIGHT_FLARE_RADIUS_OFFSET)
  );
  if (
    flareRadius !== undefined &&
    (flareRadius !== 0 ||
      light.generateFlare === true ||
      Boolean(light.textureNames?.length) ||
      Boolean(light.flareSizes?.length) ||
      Boolean(light.flarePositions?.length) ||
      Boolean(light.flareColorShifts?.length))
  ) {
    light.flareRadius = flareRadius;
  }

  collectAuroraBinaryControllerValues(bytes, nodeAbsOffset).forEach((controller) => {
    switch (controller.type) {
      case AURORA_BINARY_CONTROLLER_POSITION: {
        const position = resolveAuroraBinaryControllerVector3Value(controller);
        if (position) {
          setLightTransformValue(light, "position", position);
        }
        const positionTimeline = buildAuroraBinaryControllerVector3Timeline(controller, {
          implicitDurationSeconds: options.implicitTimelineDurationSeconds
        });
        if (positionTimeline) {
          light.positionTimeline = positionTimeline;
          setLightTransformValue(light, "positionTimeline", positionTimeline);
        }
        break;
      }
      case AURORA_BINARY_CONTROLLER_ORIENTATION:
        break;
      case AURORA_BINARY_CONTROLLER_LIGHT_COLOR: {
        const color = resolveAuroraBinaryControllerColorValue(controller);
        if (color) {
          light.color = color;
        }
        const colorTimeline = buildAuroraBinaryControllerColorTimeline(controller, {
          implicitDurationSeconds: options.implicitTimelineDurationSeconds
        });
        if (colorTimeline) {
          light.colorTimeline = colorTimeline;
        }
        break;
      }
      case AURORA_BINARY_CONTROLLER_LIGHT_RADIUS:
        applyAuroraBinaryLightNumberController(light, "radius", "radiusTimeline", controller, options);
        break;
      case AURORA_BINARY_CONTROLLER_LIGHT_SHADOW_RADIUS:
        applyAuroraBinaryLightNumberController(
          light,
          "shadowRadius",
          "shadowRadiusTimeline",
          controller,
          options
        );
        break;
      case AURORA_BINARY_CONTROLLER_LIGHT_VERTICAL_DISPLACEMENT:
        applyAuroraBinaryLightNumberController(
          light,
          "verticalDisplacement",
          "verticalDisplacementTimeline",
          controller,
          options
        );
        break;
      case AURORA_BINARY_CONTROLLER_LIGHT_MULTIPLIER:
        applyAuroraBinaryLightNumberController(light, "multiplier", "multiplierTimeline", controller, options);
        break;
      default:
        break;
    }
  });

  return light;
}

function applyAuroraBinaryLightNumberController(
  light: MutableLight,
  scalarKey: "radius" | "shadowRadius" | "verticalDisplacement" | "multiplier",
  timelineKey:
    | "radiusTimeline"
    | "shadowRadiusTimeline"
    | "verticalDisplacementTimeline"
    | "multiplierTimeline",
  controller: AuroraBinaryControllerValue,
  options: { implicitTimelineDurationSeconds?: number } = {}
): void {
  const value = sanitizeFiniteNumber(resolveAuroraBinaryControllerScalarValue(controller));
  if (value !== undefined) {
    light[scalarKey] = value;
  }
  const timeline = buildAuroraBinaryControllerNumberTimeline(controller, {
    implicitDurationSeconds: options.implicitTimelineDurationSeconds
  });
  if (timeline) {
    light[timelineKey] = timeline;
  }
}

function collectAuroraBinaryAnimationEmitterPasses(
  bytes: Buffer,
  sourceProvenance: AuroraMdlVfxSourceProvenance
): Array<{ nodeName: string; pass: AuroraAnimationEvaluationPass }> {
  const animations = readAuroraBinaryArrayHeader(
    bytes,
    AURORA_BINARY_MODEL_BASE + AURORA_BINARY_MODEL_ANIMATIONS_OFFSET
  );
  if (!animations || animations.count < 1) {
    return [];
  }

  const passes: Array<{ nodeName: string; pass: AuroraAnimationEvaluationPass }> = [];
  for (let index = 0; index < animations.count; index += 1) {
    const animationOffset = readAuroraBinaryUInt32(
      bytes,
      AURORA_BINARY_MODEL_BASE + animations.offset + index * 4
    );
    if (animationOffset === null) {
      continue;
    }
    const animationAbsOffset = AURORA_BINARY_MODEL_BASE + animationOffset;
    if (
      animationAbsOffset < AURORA_BINARY_MODEL_BASE ||
      animationAbsOffset + AURORA_BINARY_ANIMATION_ROOT_NODE_OFFSET + 4 > bytes.length
    ) {
      continue;
    }
    const animationName = normalizeAuroraMdlValue(
      readAuroraBinaryCString(
        bytes,
        animationAbsOffset + AURORA_BINARY_ANIMATION_NAME_OFFSET,
        AURORA_BINARY_ANIMATION_NAME_LENGTH
      )
    );
    if (!animationName) {
      continue;
    }
    const lengthSeconds = sanitizeAuroraBinaryAnimationSeconds(
      readAuroraBinaryFloat32(bytes, animationAbsOffset)
    );
    const transitionSeconds = sanitizeAuroraBinaryAnimationSeconds(
      readAuroraBinaryFloat32(bytes, animationAbsOffset + 4)
    );
    const rootNodeOffset = readAuroraBinaryUInt32(
      bytes,
      animationAbsOffset + AURORA_BINARY_ANIMATION_ROOT_NODE_OFFSET
    );
    if (rootNodeOffset === null) {
      continue;
    }
    const animationEmitters = collectAuroraBinaryEmitterNodesFromRoot(bytes, rootNodeOffset, sourceProvenance, {
      implicitTimelineDurationSeconds: lengthSeconds
    });
    animationEmitters.forEach((emitter) => {
      if (!emitter.simulation && !emitter.transform) {
        return;
      }
      passes.push({
        nodeName: emitter.nodeName,
        pass: {
          animationName,
          ...(lengthSeconds !== undefined ? { lengthSeconds } : {}),
          ...(transitionSeconds !== undefined ? { transitionSeconds } : {}),
          emitterState: {
            ...(emitter.simulation ? { simulation: emitter.simulation } : {}),
            ...(emitter.transform ? { transform: emitter.transform } : {}),
            ...(emitter.directRows.length > 0 ? { directRows: emitter.directRows } : {}),
            ...(emitter.keyRows.length > 0 ? { keyRows: emitter.keyRows } : {}),
            ...(emitter.bezierKeyRows.length > 0 ? { bezierKeyRows: emitter.bezierKeyRows } : {})
          }
        }
      });
    });
  }
  return passes;
}

function collectAuroraBinaryAnimationLightTracks(
  bytes: Buffer,
  sourceProvenance: AuroraMdlVfxSourceProvenance
): Array<{ nodeName: string; animation: AuroraMdlLightAnimation }> {
  const animations = readAuroraBinaryArrayHeader(
    bytes,
    AURORA_BINARY_MODEL_BASE + AURORA_BINARY_MODEL_ANIMATIONS_OFFSET
  );
  if (!animations || animations.count < 1) {
    return [];
  }

  const tracks: Array<{ nodeName: string; animation: AuroraMdlLightAnimation }> = [];
  for (let index = 0; index < animations.count; index += 1) {
    const animationOffset = readAuroraBinaryUInt32(
      bytes,
      AURORA_BINARY_MODEL_BASE + animations.offset + index * 4
    );
    if (animationOffset === null) {
      continue;
    }
    const animationAbsOffset = AURORA_BINARY_MODEL_BASE + animationOffset;
    if (
      animationAbsOffset < AURORA_BINARY_MODEL_BASE ||
      animationAbsOffset + AURORA_BINARY_ANIMATION_ROOT_NODE_OFFSET + 4 > bytes.length
    ) {
      continue;
    }
    const animationName = normalizeAuroraMdlValue(
      readAuroraBinaryCString(
        bytes,
        animationAbsOffset + AURORA_BINARY_ANIMATION_NAME_OFFSET,
        AURORA_BINARY_ANIMATION_NAME_LENGTH
      )
    );
    if (!animationName) {
      continue;
    }
    const lengthSeconds = sanitizeAuroraBinaryAnimationSeconds(
      readAuroraBinaryFloat32(bytes, animationAbsOffset)
    );
    const transitionSeconds = sanitizeAuroraBinaryAnimationSeconds(
      readAuroraBinaryFloat32(bytes, animationAbsOffset + 4)
    );
    const rootNodeOffset = readAuroraBinaryUInt32(
      bytes,
      animationAbsOffset + AURORA_BINARY_ANIMATION_ROOT_NODE_OFFSET
    );
    if (rootNodeOffset === null) {
      continue;
    }
    const animationLights = collectAuroraBinaryMutableLightNodesFromRoot(
      bytes,
      rootNodeOffset,
      sourceProvenance,
      {
        implicitTimelineDurationSeconds: lengthSeconds,
        animation: {
          animationName,
          ...(lengthSeconds !== undefined ? { lengthSeconds } : {}),
          ...(transitionSeconds !== undefined ? { transitionSeconds } : {})
        }
      }
    );
    animationLights.forEach((light) => {
      const animation = buildAuroraLightAnimationTrack(light);
      if (!animation) {
        return;
      }
      tracks.push({
        nodeName: light.nodeName,
        animation
      });
    });
  }
  return tracks;
}

function attachBinaryAnimationPassesToEmitters(
  emitters: AuroraMdlEmitterNode[],
  animationPasses: Array<{ nodeName: string; pass: AuroraAnimationEvaluationPass }>
): AuroraMdlEmitterNode[] {
  if (emitters.length === 0 || animationPasses.length === 0) {
    return emitters;
  }
  const emittersByName = new Map(
    emitters
      .map((emitter): [string, AuroraMdlEmitterNode] | null => {
        const key = normalizeNodeLookupName(emitter.nodeName);
        return key ? [key, emitter] : null;
      })
      .filter((entry): entry is [string, AuroraMdlEmitterNode] => Boolean(entry))
  );
  animationPasses.forEach((animationPass) => {
    const key = normalizeNodeLookupName(animationPass.nodeName);
    const target = key ? emittersByName.get(key) : undefined;
    if (!target) {
      return;
    }
    target.animationPasses = [...(target.animationPasses ?? []), animationPass.pass];
    target.animations = toEmitterAnimations(target.animationPasses);
  });
  return emitters;
}

function readAuroraBinaryEmitterAtlas(
  bytes: Buffer,
  nodeAbsOffset: number,
  emitter: MutableEmitter
): AuroraMdlEmitterAtlas | undefined {
  const flags = readAuroraBinaryUInt32(bytes, nodeAbsOffset + AURORA_BINARY_EMITTER_FLAGS_OFFSET) ?? 0;
  const atlasDraft: Partial<AuroraMdlEmitterAtlas> = {
    xGridRaw:
      readAuroraBinaryUInt32(bytes, nodeAbsOffset + AURORA_BINARY_EMITTER_XGRID_OFFSET) ??
      undefined,
    yGridRaw:
      readAuroraBinaryUInt32(bytes, nodeAbsOffset + AURORA_BINARY_EMITTER_YGRID_OFFSET) ??
      undefined,
    random: (flags & AURORA_BINARY_EMITTER_FLAG_RANDOM_ATLAS_FRAME) !== 0
  };
  if (atlasDraft.xGridRaw !== undefined) {
    emitter.directRows.push(binaryControllerRow("xGridRaw", "xgrid", [atlasDraft.xGridRaw]));
  }
  if (atlasDraft.yGridRaw !== undefined) {
    emitter.directRows.push(binaryControllerRow("yGridRaw", "ygrid", [atlasDraft.yGridRaw]));
  }

  collectAuroraBinaryControllerValues(bytes, nodeAbsOffset).forEach((controller) => {
    const value = controller.values[0];
    if (value === undefined) {
      return;
    }
    switch (controller.type) {
      case AURORA_BINARY_CONTROLLER_EMITTER_FPS:
        atlasDraft.fps = value;
        emitter.directRows.push(binaryControllerRow("fps", "fps", controller.values, controller.type));
        break;
      case AURORA_BINARY_CONTROLLER_EMITTER_FRAME_START:
        atlasDraft.frameStart = value;
        emitter.directRows.push(binaryControllerRow("frameStart", "framestart", controller.values, controller.type));
        break;
      case AURORA_BINARY_CONTROLLER_EMITTER_FRAME_END:
        atlasDraft.frameEnd = value;
        emitter.directRows.push(binaryControllerRow("frameEnd", "frameend", controller.values, controller.type));
        break;
      default:
        break;
    }
  });
  return buildEmitterAtlas(atlasDraft);
}

function readAuroraBinaryEmitterSimulation(
  bytes: Buffer,
  nodeAbsOffset: number,
  emitter: MutableEmitter,
  options: { implicitTimelineDurationSeconds?: number } = {}
): AuroraMdlEmitterSimulation | undefined {
  const flags = readAuroraBinaryUInt32(bytes, nodeAbsOffset + AURORA_BINARY_EMITTER_FLAGS_OFFSET) ?? 0;
  const simulationDraft: AuroraMdlEmitterSimulation = {
    spawnType:
      readAuroraBinaryUInt32(bytes, nodeAbsOffset + AURORA_BINARY_EMITTER_SPAWN_TYPE_OFFSET) ??
      undefined,
    deadspace:
      readAuroraBinaryFloat32(bytes, nodeAbsOffset + AURORA_BINARY_EMITTER_DEAD_SPACE_OFFSET) ??
      undefined,
    ...((flags & AURORA_BINARY_EMITTER_FLAG_BOUNCE) !== 0 ? { bounce: true } : {}),
    ...((flags & AURORA_BINARY_EMITTER_FLAG_P2P) !== 0
      ? {
          p2p: true,
          p2pType:
            (flags & AURORA_BINARY_EMITTER_FLAG_P2P_BEZIER) !== 0 ? "bezier" : "gravity"
        }
      : {}),
    ...((flags & AURORA_BINARY_EMITTER_FLAG_INHERIT) !== 0 ? { inherit: true } : {}),
    ...((flags & AURORA_BINARY_EMITTER_FLAG_INHERIT_VEL) !== 0 ? { inheritVel: true } : {}),
    ...((flags & AURORA_BINARY_EMITTER_FLAG_INHERIT_LOCAL) !== 0 ? { inheritLocal: true } : {}),
    ...((flags & AURORA_BINARY_EMITTER_FLAG_INHERIT_PART) !== 0 ? { inheritPart: true } : {}),
    affectedByWind: (flags & AURORA_BINARY_EMITTER_FLAG_AFFECTED_BY_WIND) !== 0
  };
  if (simulationDraft.spawnType !== undefined) {
    emitter.directRows.push(binaryControllerRow("spawnType", "spawntype", [simulationDraft.spawnType]));
  }
  if (simulationDraft.deadspace !== undefined) {
    emitter.directRows.push(binaryControllerRow("deadspace", "deadspace", [simulationDraft.deadspace]));
  }

  collectAuroraBinaryControllerValues(bytes, nodeAbsOffset).forEach((controller) => {
    const value = resolveAuroraBinaryControllerScalarValue(controller);
    const assignNumber = (property: keyof AuroraMdlEmitterSimulation): void => {
      if (value !== undefined) {
        (simulationDraft as Record<string, unknown>)[property] = value;
        emitter.directRows.push(binaryControllerRow(property, property, controller.values, controller.type));
      }
    };
    switch (controller.type) {
      case AURORA_BINARY_CONTROLLER_EMITTER_SIZE_X:
        assignNumber("xSize");
        break;
      case AURORA_BINARY_CONTROLLER_EMITTER_SIZE_Y:
        assignNumber("ySize");
        break;
      case AURORA_BINARY_CONTROLLER_EMITTER_BIRTHRATE:
        assignNumber("birthrate");
        break;
      case AURORA_BINARY_CONTROLLER_EMITTER_LIFE_EXP:
        assignNumber("lifeExp");
        break;
      case AURORA_BINARY_CONTROLLER_EMITTER_MASS:
        assignNumber("mass");
        break;
      case AURORA_BINARY_CONTROLLER_EMITTER_VELOCITY:
        assignNumber("velocity");
        break;
      case AURORA_BINARY_CONTROLLER_EMITTER_RAND_VEL:
        assignNumber("randvel");
        break;
      case AURORA_BINARY_CONTROLLER_EMITTER_SPREAD:
        assignNumber("spread");
        break;
      case AURORA_BINARY_CONTROLLER_EMITTER_PARTICLE_ROT:
        assignNumber("particleRot");
        break;
      case AURORA_BINARY_CONTROLLER_EMITTER_BOUNCE_COEFFICIENT:
        assignNumber("bounceCoefficient");
        break;
      case AURORA_BINARY_CONTROLLER_EMITTER_BLUR_LENGTH:
        assignNumber("blurLength");
        break;
      case AURORA_BINARY_CONTROLLER_EMITTER_DETONATE:
        assignNumber("detonate");
        break;
      case AURORA_BINARY_CONTROLLER_EMITTER_LIGHTNING_SCALE:
        assignNumber("lightningScale");
        break;
      case AURORA_BINARY_CONTROLLER_EMITTER_P2P_BEZIER2:
        assignNumber("p2pBezier2");
        break;
      case AURORA_BINARY_CONTROLLER_EMITTER_P2P_BEZIER3:
        assignNumber("p2pBezier3");
        break;
      case AURORA_BINARY_CONTROLLER_EMITTER_COMBINE_TIME:
        assignNumber("combineTime");
        break;
      case AURORA_BINARY_CONTROLLER_EMITTER_GRAV:
        assignNumber("grav");
        break;
      case AURORA_BINARY_CONTROLLER_EMITTER_DRAG:
        assignNumber("drag");
        break;
      case AURORA_BINARY_CONTROLLER_EMITTER_THRESHOLD:
        assignNumber("threshold");
        break;
      case AURORA_BINARY_CONTROLLER_EMITTER_SIZE_START:
        assignNumber("sizeStart");
        break;
      case AURORA_BINARY_CONTROLLER_EMITTER_SIZE_MID:
        assignNumber("sizeMid");
        break;
      case AURORA_BINARY_CONTROLLER_EMITTER_SIZE_END:
        assignNumber("sizeEnd");
        break;
      case AURORA_BINARY_CONTROLLER_EMITTER_SIZE_START_Y:
        assignNumber("sizeStartY");
        break;
      case AURORA_BINARY_CONTROLLER_EMITTER_SIZE_MID_Y:
        assignNumber("sizeMidY");
        break;
      case AURORA_BINARY_CONTROLLER_EMITTER_SIZE_END_Y:
        assignNumber("sizeEndY");
        break;
      case AURORA_BINARY_CONTROLLER_EMITTER_PERCENT_START:
        assignNumber("percentStart");
        break;
      case AURORA_BINARY_CONTROLLER_EMITTER_PERCENT_MID:
        assignNumber("percentMid");
        break;
      case AURORA_BINARY_CONTROLLER_EMITTER_PERCENT_END:
        assignNumber("percentEnd");
        break;
      case AURORA_BINARY_CONTROLLER_EMITTER_ALPHA_START:
        assignNumber("alphaStart");
        break;
      case AURORA_BINARY_CONTROLLER_EMITTER_ALPHA_MID:
        assignNumber("alphaMid");
        break;
      case AURORA_BINARY_CONTROLLER_EMITTER_ALPHA_END:
        assignNumber("alphaEnd");
        break;
      case AURORA_BINARY_CONTROLLER_EMITTER_COLOR_START:
      case AURORA_BINARY_CONTROLLER_EMITTER_COLOR_MID:
      case AURORA_BINARY_CONTROLLER_EMITTER_COLOR_END:
        applyBinaryColorController(controller, simulationDraft, emitter);
        break;
      default:
        break;
    }

    const timelineKey = resolveAuroraBinaryEmitterSimulationTimelineKey(controller.type);
    if (timelineKey) {
      const timeline = buildAuroraBinaryControllerNumberTimeline(controller, {
        nonNegativeValue: AURORA_EMITTER_SIMULATION_NON_NEGATIVE_TIMELINE_KEYS.has(timelineKey),
        implicitDurationSeconds: options.implicitTimelineDurationSeconds
      });
      if (timeline) {
        simulationDraft.timeline = {
          ...simulationDraft.timeline,
          [timelineKey]: timeline
        };
        emitter.keyRows.push(
          ...controller.keyframes.map((row) =>
            binaryControllerRow(timelineKey, timelineKey, row, controller.type, "key")
          )
        );
      }
    }
  });
  return buildEmitterSimulation(simulationDraft);
}

function applyBinaryColorController(
  controller: AuroraBinaryControllerValue,
  simulationDraft: AuroraMdlEmitterSimulation,
  emitter: MutableEmitter
): void {
  const color = resolveAuroraBinaryControllerColorValue(controller);
  const colorKey =
    controller.type === AURORA_BINARY_CONTROLLER_EMITTER_COLOR_START
      ? "colorStart"
      : controller.type === AURORA_BINARY_CONTROLLER_EMITTER_COLOR_MID
        ? "colorMid"
        : "colorEnd";
  if (color) {
    simulationDraft[colorKey] = color;
    emitter.directRows.push(binaryControllerRow(colorKey, colorKey, color, controller.type));
  }
  const colorTimeline = buildAuroraBinaryControllerColorTimeline(controller);
  if (colorTimeline) {
    simulationDraft.colorTimeline = {
      ...simulationDraft.colorTimeline,
      [colorKey]: colorTimeline
    };
    emitter.colorTimelines = {
      ...emitter.colorTimelines,
      [colorKey]: colorTimeline
    };
    emitter.keyRows.push(
      ...controller.keyframes.map((row) =>
        binaryControllerRow(colorKey, colorKey, row, controller.type, "key")
      )
    );
  }
}

function readAuroraBinaryTransform(bytes: Buffer, nodeAbsOffset: number): AuroraMdlTransform | undefined {
  const transformDraft: AuroraMdlTransform = {};
  collectAuroraBinaryControllerValues(bytes, nodeAbsOffset).forEach((controller) => {
    if (controller.type === AURORA_BINARY_CONTROLLER_POSITION && controller.values.length >= 3) {
      transformDraft.position = [
        controller.values[0]!,
        controller.values[1]!,
        controller.values[2]!
      ];
      return;
    }
    if (controller.type === AURORA_BINARY_CONTROLLER_ORIENTATION && controller.values.length >= 4) {
      transformDraft.orientation = buildAuroraQuaternionOrientation([
        controller.values[0]!,
        controller.values[1]!,
        controller.values[2]!,
        controller.values[3]!
      ]);
    }
  });
  return buildTransform(transformDraft);
}

function readAuroraBinaryEmitterReferenceNodes(
  bytes: Buffer,
  emitterNodeAbsOffset: number,
  emitterNodeName: string,
  sourceProvenance: AuroraMdlVfxSourceProvenance
): AuroraMdlReferenceNode[] {
  const references: AuroraMdlReferenceNode[] = [];
  for (const childOffset of readAuroraBinaryNodeChildren(bytes, emitterNodeAbsOffset)) {
    const childAbsOffset = AURORA_BINARY_MODEL_BASE + childOffset;
    if (
      childAbsOffset < AURORA_BINARY_MODEL_BASE ||
      childAbsOffset + AURORA_BINARY_NODE_HEADER_SIZE > bytes.length
    ) {
      continue;
    }
    const flags = readAuroraBinaryUInt32(bytes, childAbsOffset + AURORA_BINARY_NODE_FLAGS_OFFSET);
    if (
      flags === null ||
      (flags & (AURORA_BINARY_NODE_FLAG_LIGHT | AURORA_BINARY_NODE_FLAG_EMITTER | AURORA_BINARY_NODE_FLAG_MESH)) !== 0
    ) {
      continue;
    }
    const nodeName =
      normalizeAuroraMdlValue(
        readAuroraBinaryCString(bytes, childAbsOffset + AURORA_BINARY_NODE_NAME_OFFSET, 32)
      ) ?? `reference_${references.length + 1}`;
    const transform = readAuroraBinaryTransform(bytes, childAbsOffset);
    const referenceNode = createReferenceNode({
      nodeName,
      parentNodeName: emitterNodeName,
      sourceNodeOffset: childOffset,
      sourceProvenance,
      transform
    });
    references.push(finalizeReferenceNode(referenceNode));
  }
  return references;
}

function collectAuroraBinaryControllerValues(
  bytes: Buffer,
  nodeAbsOffset: number
): AuroraBinaryControllerValue[] {
  const controllerKeys = readAuroraBinaryArrayHeader(
    bytes,
    nodeAbsOffset + AURORA_BINARY_NODE_CONTROLLER_KEYS_OFFSET
  );
  const controllerData = readAuroraBinaryArrayHeader(
    bytes,
    nodeAbsOffset + AURORA_BINARY_NODE_CONTROLLER_DATA_OFFSET
  );
  if (!controllerKeys || !controllerData || controllerKeys.count < 1 || controllerData.count < 1) {
    return [];
  }

  const controllers: AuroraBinaryControllerValue[] = [];
  for (let index = 0; index < controllerKeys.count; index += 1) {
    const keyAbsOffset =
      AURORA_BINARY_MODEL_BASE +
      controllerKeys.offset +
      index * AURORA_BINARY_CONTROLLER_RECORD_SIZE;
    if (keyAbsOffset + AURORA_BINARY_CONTROLLER_RECORD_SIZE > bytes.length) {
      continue;
    }
    const type = readAuroraBinaryUInt32(bytes, keyAbsOffset);
    const rows = readAuroraBinaryUInt16(bytes, keyAbsOffset + 4);
    const dataOffset = readAuroraBinaryUInt16(bytes, keyAbsOffset + 8);
    const columns = readAuroraBinaryUInt8(bytes, keyAbsOffset + 10);
    if (type === null || rows === null || dataOffset === null || columns === null || rows < 1 || columns < 1) {
      continue;
    }
    const totalValues = rows * columns;
    const values: number[] = [];
    for (let valueIndex = 0; valueIndex < totalValues; valueIndex += 1) {
      const value = readAuroraBinaryFloat32(
        bytes,
        AURORA_BINARY_MODEL_BASE + controllerData.offset + (dataOffset + valueIndex) * 4
      );
      if (value === null) {
        break;
      }
      values.push(value);
    }
    if (values.length !== totalValues) {
      continue;
    }
    const keyframes: number[][] = [];
    for (let row = 0; row < rows; row += 1) {
      keyframes.push(values.slice(row * columns, row * columns + columns));
    }
    controllers.push({ type, rows, columns, values, keyframes });
  }
  return controllers;
}

function readAuroraBinaryNodeChildren(bytes: Buffer, nodeAbsOffset: number): number[] {
  const childrenOffset = readAuroraBinaryUInt32(bytes, nodeAbsOffset + AURORA_BINARY_NODE_CHILDREN_OFFSET);
  const childrenCount = readAuroraBinaryUInt32(bytes, nodeAbsOffset + AURORA_BINARY_NODE_CHILDREN_OFFSET + 4);
  if (childrenOffset === null || childrenCount === null || childrenCount === 0) {
    return [];
  }
  const children: number[] = [];
  for (let index = 0; index < childrenCount; index += 1) {
    const childOffset = readAuroraBinaryUInt32(
      bytes,
      AURORA_BINARY_MODEL_BASE + childrenOffset + index * 4
    );
    if (childOffset !== null) {
      children.push(childOffset);
    }
  }
  return children;
}

function readAuroraBinaryFloatArray(bytes: Buffer, headerOffset: number): number[] | undefined {
  const header = readAuroraBinaryArrayHeader(bytes, headerOffset);
  if (!header || header.count > 1024) {
    return undefined;
  }
  const values: number[] = [];
  for (let index = 0; index < header.count; index += 1) {
    const value = readAuroraBinaryFloat32(bytes, AURORA_BINARY_MODEL_BASE + header.offset + index * 4);
    const finite = sanitizeFiniteNumber(value);
    if (finite === undefined) {
      return values.length > 0 ? values : undefined;
    }
    values.push(finite);
  }
  return values.length > 0 ? values : undefined;
}

function readAuroraBinaryVector3Array(
  bytes: Buffer,
  headerOffset: number
): [number, number, number][] | undefined {
  const header = readAuroraBinaryArrayHeader(bytes, headerOffset);
  if (!header || header.count > 1024) {
    return undefined;
  }
  const values: [number, number, number][] = [];
  for (let index = 0; index < header.count; index += 1) {
    const absOffset = AURORA_BINARY_MODEL_BASE + header.offset + index * 12;
    const x = readAuroraBinaryFloat32(bytes, absOffset);
    const y = readAuroraBinaryFloat32(bytes, absOffset + 4);
    const z = readAuroraBinaryFloat32(bytes, absOffset + 8);
    const vector = sanitizeVector3([x, y, z]);
    if (!vector) {
      return values.length > 0 ? values : undefined;
    }
    values.push(vector);
  }
  return values.length > 0 ? values : undefined;
}

function readAuroraBinaryTextureNameArray(bytes: Buffer, headerOffset: number): string[] | undefined {
  const header = readAuroraBinaryArrayHeader(bytes, headerOffset);
  if (!header || header.count > 1024) {
    return undefined;
  }

  const pointerNames: string[] = [];
  for (let index = 0; index < header.count; index += 1) {
    const stringOffset = readAuroraBinaryUInt32(
      bytes,
      AURORA_BINARY_MODEL_BASE + header.offset + index * 4
    );
    if (stringOffset === null) {
      break;
    }
    const name = normalizeModelTextureReference(
      readAuroraBinaryCString(bytes, AURORA_BINARY_MODEL_BASE + stringOffset, 64)
    );
    if (name) {
      pointerNames.push(name);
    }
  }
  if (pointerNames.length > 0) {
    return pointerNames;
  }

  const inlineNames: string[] = [];
  for (let index = 0; index < header.count; index += 1) {
    const name = normalizeModelTextureReference(
      readAuroraBinaryCString(bytes, AURORA_BINARY_MODEL_BASE + header.offset + index * 64, 64)
    );
    if (name) {
      inlineNames.push(name);
    }
  }
  return inlineNames.length > 0 ? inlineNames : undefined;
}

function readAuroraBinaryArrayHeader(
  bytes: Buffer,
  offset: number
): AuroraBinaryArrayHeader | undefined {
  const arrayOffset = readAuroraBinaryUInt32(bytes, offset);
  const count = readAuroraBinaryUInt32(bytes, offset + 4);
  if (arrayOffset === null || count === null || count < 1) {
    return undefined;
  }
  return { offset: arrayOffset, count };
}

function resolveAuroraBinaryControllerScalarValue(
  controller: AuroraBinaryControllerValue
): number | undefined {
  if (controller.rows > 1 && controller.columns >= 2) {
    return controller.keyframes[0]?.[1];
  }
  return controller.values[0];
}

function buildAuroraBinaryControllerNumberTimeline(
  controller: AuroraBinaryControllerValue,
  options: { nonNegativeValue?: boolean; implicitDurationSeconds?: number } = {}
): AuroraMdlNumberKeyframe[] | undefined {
  if (controller.rows >= 2 && controller.columns >= 2) {
    return sanitizeNumberKeyframes(
      controller.keyframes.map((row) => ({ time: row[0], value: row[1] })),
      options
    );
  }

  const duration = sanitizeNonNegativeNumber(options.implicitDurationSeconds);
  if (controller.rows < 2 || controller.columns !== 1 || duration === undefined) {
    return undefined;
  }
  return sanitizeNumberKeyframes(
    controller.keyframes.map((row, index) => ({
      time: controller.rows === 1 ? 0 : (duration * index) / (controller.rows - 1),
      value: row[0]
    })),
    options
  );
}

function buildAuroraBinaryControllerVector3Timeline(
  controller: AuroraBinaryControllerValue,
  options: { implicitDurationSeconds?: number } = {}
): AuroraMdlVector3Keyframe[] | undefined {
  if (controller.rows >= 2 && controller.columns >= 4) {
    return sanitizeVector3Keyframes(
      controller.keyframes
        .filter((row) => row.length >= 4)
        .map((row) => ({ time: row[0]!, value: [row[1]!, row[2]!, row[3]!] }))
    );
  }

  const duration = sanitizeNonNegativeNumber(options.implicitDurationSeconds);
  if (controller.rows < 2 || controller.columns !== 3 || duration === undefined) {
    return undefined;
  }
  return sanitizeVector3Keyframes(
    controller.keyframes.map((row, index) => ({
      time: controller.rows === 1 ? 0 : (duration * index) / (controller.rows - 1),
      value: [row[0], row[1], row[2]]
    }))
  );
}

function buildAuroraBinaryControllerColorTimeline(
  controller: AuroraBinaryControllerValue,
  options: { implicitDurationSeconds?: number } = {}
): AuroraMdlColorKeyframe[] | undefined {
  if (controller.rows >= 2 && controller.columns >= 4) {
    return sanitizeColorKeyframes(
      controller.keyframes
        .filter((row) => row.length >= 4)
        .map((row) => ({ time: row[0]!, value: [row[1]!, row[2]!, row[3]!] }))
    );
  }

  const duration = sanitizeNonNegativeNumber(options.implicitDurationSeconds);
  if (controller.rows < 2 || controller.columns !== 3 || duration === undefined) {
    return undefined;
  }
  return sanitizeColorKeyframes(
    controller.keyframes.map((row, index) => ({
      time: controller.rows === 1 ? 0 : (duration * index) / (controller.rows - 1),
      value: [row[0], row[1], row[2]]
    }))
  );
}

function resolveAuroraBinaryControllerColorValue(
  controller: AuroraBinaryControllerValue
): [number, number, number] | undefined {
  const row = controller.keyframes[0] ?? controller.values;
  if (!row) {
    return undefined;
  }
  const offset = controller.rows > 1 && controller.columns >= 4 ? 1 : 0;
  if (row.length < offset + 3) {
    return undefined;
  }
  return sanitizeColor([row[offset]!, row[offset + 1]!, row[offset + 2]!]);
}

function resolveAuroraBinaryControllerVector3Value(
  controller: AuroraBinaryControllerValue
): [number, number, number] | undefined {
  const row = controller.keyframes[0] ?? controller.values;
  if (!row) {
    return undefined;
  }
  const offset = controller.rows > 1 && controller.columns >= 4 ? 1 : 0;
  if (row.length < offset + 3) {
    return undefined;
  }
  return sanitizeVector3([row[offset]!, row[offset + 1]!, row[offset + 2]!]);
}

function resolveAuroraBinaryEmitterSimulationTimelineKey(
  controllerType: number
): AuroraMdlEmitterSimulationTimelineKey | undefined {
  switch (controllerType) {
    case AURORA_BINARY_CONTROLLER_EMITTER_SIZE_X:
      return "xSize";
    case AURORA_BINARY_CONTROLLER_EMITTER_SIZE_Y:
      return "ySize";
    case AURORA_BINARY_CONTROLLER_EMITTER_BIRTHRATE:
      return "birthrate";
    case AURORA_BINARY_CONTROLLER_EMITTER_LIFE_EXP:
      return "lifeExp";
    case AURORA_BINARY_CONTROLLER_EMITTER_MASS:
      return "mass";
    case AURORA_BINARY_CONTROLLER_EMITTER_VELOCITY:
      return "velocity";
    case AURORA_BINARY_CONTROLLER_EMITTER_RAND_VEL:
      return "randvel";
    case AURORA_BINARY_CONTROLLER_EMITTER_SPREAD:
      return "spread";
    case AURORA_BINARY_CONTROLLER_EMITTER_PARTICLE_ROT:
      return "particleRot";
    case AURORA_BINARY_CONTROLLER_EMITTER_BOUNCE_COEFFICIENT:
      return "bounceCoefficient";
    case AURORA_BINARY_CONTROLLER_EMITTER_BLUR_LENGTH:
      return "blurLength";
    case AURORA_BINARY_CONTROLLER_EMITTER_DETONATE:
      return "detonate";
    case AURORA_BINARY_CONTROLLER_EMITTER_LIGHTNING_SCALE:
      return "lightningScale";
    case AURORA_BINARY_CONTROLLER_EMITTER_P2P_BEZIER2:
      return "p2pBezier2";
    case AURORA_BINARY_CONTROLLER_EMITTER_P2P_BEZIER3:
      return "p2pBezier3";
    case AURORA_BINARY_CONTROLLER_EMITTER_COMBINE_TIME:
      return "combineTime";
    case AURORA_BINARY_CONTROLLER_EMITTER_GRAV:
      return "grav";
    case AURORA_BINARY_CONTROLLER_EMITTER_DRAG:
      return "drag";
    case AURORA_BINARY_CONTROLLER_EMITTER_THRESHOLD:
      return "threshold";
    case AURORA_BINARY_CONTROLLER_EMITTER_SIZE_START:
      return "sizeStart";
    case AURORA_BINARY_CONTROLLER_EMITTER_SIZE_MID:
      return "sizeMid";
    case AURORA_BINARY_CONTROLLER_EMITTER_SIZE_END:
      return "sizeEnd";
    case AURORA_BINARY_CONTROLLER_EMITTER_SIZE_START_Y:
      return "sizeStartY";
    case AURORA_BINARY_CONTROLLER_EMITTER_SIZE_MID_Y:
      return "sizeMidY";
    case AURORA_BINARY_CONTROLLER_EMITTER_SIZE_END_Y:
      return "sizeEndY";
    case AURORA_BINARY_CONTROLLER_EMITTER_PERCENT_START:
      return "percentStart";
    case AURORA_BINARY_CONTROLLER_EMITTER_PERCENT_MID:
      return "percentMid";
    case AURORA_BINARY_CONTROLLER_EMITTER_PERCENT_END:
      return "percentEnd";
    case AURORA_BINARY_CONTROLLER_EMITTER_ALPHA_START:
      return "alphaStart";
    case AURORA_BINARY_CONTROLLER_EMITTER_ALPHA_MID:
      return "alphaMid";
    case AURORA_BINARY_CONTROLLER_EMITTER_ALPHA_END:
      return "alphaEnd";
    default:
      return undefined;
  }
}

function createEmitterNode(input: {
  nodeName: string;
  parentNodeName?: string;
  sourceLineNumber?: number;
  sourceNodeOffset?: number;
  sourceProvenance: AuroraMdlVfxSourceProvenance;
}): MutableEmitter {
  return {
    nodeKind: "emitter",
    nodeName: input.nodeName,
    ...(input.parentNodeName ? { parentNodeName: input.parentNodeName } : {}),
    sourceFormat: input.sourceProvenance.sourceFormat,
    ...(input.sourceProvenance.sourceModelObjectKey
      ? { sourceModelObjectKey: input.sourceProvenance.sourceModelObjectKey }
      : {}),
    ...(input.sourceProvenance.sourceModelFileName
      ? { sourceModelFileName: input.sourceProvenance.sourceModelFileName }
      : {}),
    ...(input.sourceProvenance.sourceModelHash
      ? { sourceModelHash: input.sourceProvenance.sourceModelHash }
      : {}),
    provenance: {
      ...input.sourceProvenance,
      ...(input.parentNodeName ? { parentNodeName: input.parentNodeName } : {}),
      ...(input.sourceLineNumber ? { sourceLineNumber: input.sourceLineNumber } : {}),
      ...(input.sourceNodeOffset !== undefined ? { sourceNodeOffset: input.sourceNodeOffset } : {})
    },
    directRows: [],
    keyRows: [],
    bezierKeyRows: [],
    colorTimelines: {}
  };
}

function createLightNode(input: {
  nodeName: string;
  sourceNodeKind?: string;
  parentNodeName?: string;
  sourceLineNumber?: number;
  sourceNodeOffset?: number;
  sourceProvenance: AuroraMdlVfxSourceProvenance;
  animation?: { animationName: string; lengthSeconds?: number; transitionSeconds?: number };
}): MutableLight {
  return {
    nodeKind: "light",
    nodeName: input.nodeName,
    ...(input.sourceNodeKind ? { sourceNodeKind: input.sourceNodeKind } : {}),
    ...(input.parentNodeName ? { parentNodeName: input.parentNodeName } : {}),
    sourceFormat: input.sourceProvenance.sourceFormat,
    ...(input.sourceProvenance.sourceModelObjectKey
      ? { sourceModelObjectKey: input.sourceProvenance.sourceModelObjectKey }
      : {}),
    ...(input.sourceProvenance.sourceModelFileName
      ? { sourceModelFileName: input.sourceProvenance.sourceModelFileName }
      : {}),
    ...(input.sourceProvenance.sourceModelHash
      ? { sourceModelHash: input.sourceProvenance.sourceModelHash }
      : {}),
    provenance: {
      ...input.sourceProvenance,
      ...(input.parentNodeName ? { parentNodeName: input.parentNodeName } : {}),
      ...(input.sourceLineNumber ? { sourceLineNumber: input.sourceLineNumber } : {}),
      ...(input.sourceNodeOffset !== undefined ? { sourceNodeOffset: input.sourceNodeOffset } : {})
    },
    ...(input.animation?.animationName ? { animationName: input.animation.animationName } : {}),
    ...(input.animation?.lengthSeconds !== undefined
      ? { lengthSeconds: input.animation.lengthSeconds }
      : {}),
    ...(input.animation?.transitionSeconds !== undefined
      ? { transitionSeconds: input.animation.transitionSeconds }
      : {})
  };
}

function isAuroraAsciiLightNodeKind(nodeKind: string | undefined): nodeKind is string {
  return typeof nodeKind === "string" && AURORA_ASCII_LIGHT_NODE_KINDS.has(nodeKind);
}

function isAuroraAsciiModelPropagationToken(
  token: string | undefined
): token is AuroraMdlPropagationEvent["token"] {
  return typeof token === "string" && AURORA_ASCII_MODEL_PROPAGATION_TOKENS.has(token);
}

function resolveOpenNodeStackEntryName(
  node:
    | { kind: "emitter"; emitter: MutableEmitter }
    | { kind: "light"; light: MutableLight }
    | { kind: "reference"; reference: AuroraMdlReferenceNode }
    | { kind: "shadowblob"; shadowBlob: AuroraMdlShadowBlobNode }
    | { kind: "other"; nodeName?: string }
): string | undefined {
  if (node.kind === "emitter") {
    return node.emitter.nodeName;
  }
  if (node.kind === "light") {
    return node.light.nodeName;
  }
  if (node.kind === "reference") {
    return node.reference.nodeName;
  }
  if (node.kind === "shadowblob") {
    return node.shadowBlob.nodeName;
  }
  return node.nodeName;
}

function createPropagationEvent(input: {
  token: AuroraMdlPropagationEvent["token"];
  nodeName?: string;
  nodeKind?: string;
  parentNodeName?: string;
  sourceLineNumber?: number;
  sourceProvenance: AuroraMdlVfxSourceProvenance;
}): AuroraMdlPropagationEvent {
  return {
    token: input.token,
    ...(input.nodeName ? { sourceNodeName: input.nodeName } : {}),
    ...(input.nodeKind ? { sourceNodeKind: input.nodeKind } : {}),
    provenance: {
      ...input.sourceProvenance,
      ...(input.parentNodeName ? { parentNodeName: input.parentNodeName } : {}),
      ...(input.sourceLineNumber ? { sourceLineNumber: input.sourceLineNumber } : {})
    },
    proofStatus: "source-only-model-graph-propagation-no-render-policy"
  };
}

function createReferenceNode(input: {
  nodeName: string;
  parentNodeName?: string;
  sourceLineNumber?: number;
  sourceNodeOffset?: number;
  sourceProvenance: AuroraMdlVfxSourceProvenance;
  transform?: AuroraMdlTransform;
}): AuroraMdlReferenceNode {
  return {
    nodeKind: "reference",
    nodeName: input.nodeName,
    ...(input.parentNodeName ? { parentNodeName: input.parentNodeName } : {}),
    provenance: {
      ...input.sourceProvenance,
      ...(input.parentNodeName ? { parentNodeName: input.parentNodeName } : {}),
      ...(input.sourceLineNumber ? { sourceLineNumber: input.sourceLineNumber } : {}),
      ...(input.sourceNodeOffset !== undefined ? { sourceNodeOffset: input.sourceNodeOffset } : {})
    },
    ...(input.transform ? { transform: input.transform, orientation: input.transform.orientation } : {})
  };
}

function createShadowBlobNode(input: {
  nodeName: string;
  parentNodeName?: string;
  sourceLineNumber?: number;
  sourceNodeOffset?: number;
  sourceProvenance: AuroraMdlVfxSourceProvenance;
  transform?: AuroraMdlTransform;
}): AuroraMdlShadowBlobNode {
  return {
    nodeKind: "shadowblob",
    sourceNodeKind: "shadowblob",
    nodeName: input.nodeName,
    ...(input.parentNodeName ? { parentNodeName: input.parentNodeName } : {}),
    provenance: {
      ...input.sourceProvenance,
      ...(input.parentNodeName ? { parentNodeName: input.parentNodeName } : {}),
      ...(input.sourceLineNumber ? { sourceLineNumber: input.sourceLineNumber } : {}),
      ...(input.sourceNodeOffset !== undefined ? { sourceNodeOffset: input.sourceNodeOffset } : {})
    },
    ...(input.transform ? { transform: input.transform, orientation: input.transform.orientation } : {}),
    proofStatus: "source-only-no-owning-shadow-policy-callsite"
  };
}

function finalizeEmitterNode(emitter: MutableEmitter): AuroraMdlEmitterNode {
  return {
    ...emitter,
    ...(emitter.transform?.orientation ? { orientation: emitter.transform.orientation } : {}),
    ...(emitter.animationPasses ? { animations: toEmitterAnimations(emitter.animationPasses) } : {}),
    colorTimelines: emitter.colorTimelines
  };
}

function finalizeLightNode(light: MutableLight): AuroraMdlLightNode {
  const {
    animationName,
    lengthSeconds,
    transitionSeconds,
    positionTimeline,
    colorTimeline,
    radiusTimeline,
    shadowRadiusTimeline,
    verticalDisplacementTimeline,
    multiplierTimeline,
    ...node
  } = light;
  return {
    ...node,
    ...(node.transform?.orientation ? { orientation: node.transform.orientation } : {})
  };
}

function finalizeReferenceNode(reference: AuroraMdlReferenceNode): AuroraMdlReferenceNode {
  return {
    ...reference,
    ...(reference.transform?.orientation ? { orientation: reference.transform.orientation } : {})
  };
}

function finalizeShadowBlobNode(shadowBlob: AuroraMdlShadowBlobNode): AuroraMdlShadowBlobNode {
  return {
    ...shadowBlob,
    ...(shadowBlob.transform?.orientation ? { orientation: shadowBlob.transform.orientation } : {})
  };
}

function buildAuroraLightAnimationTrack(input: MutableLight): AuroraMdlLightAnimation | undefined {
  const animationName = sanitizeString(input.animationName);
  if (
    !animationName ||
    (!input.positionTimeline &&
      !input.colorTimeline &&
      !input.radiusTimeline &&
      !input.shadowRadiusTimeline &&
      !input.verticalDisplacementTimeline &&
      !input.multiplierTimeline)
  ) {
    return undefined;
  }
  return {
    animationName,
    ...(input.lengthSeconds !== undefined ? { lengthSeconds: input.lengthSeconds } : {}),
    ...(input.transitionSeconds !== undefined ? { transitionSeconds: input.transitionSeconds } : {}),
    ...(input.positionTimeline ? { positionTimeline: input.positionTimeline } : {}),
    ...(input.colorTimeline ? { colorTimeline: input.colorTimeline } : {}),
    ...(input.radiusTimeline ? { radiusTimeline: input.radiusTimeline } : {}),
    ...(input.shadowRadiusTimeline
      ? { shadowRadiusTimeline: input.shadowRadiusTimeline }
      : {}),
    ...(input.verticalDisplacementTimeline
      ? { verticalDisplacementTimeline: input.verticalDisplacementTimeline }
      : {}),
    ...(input.multiplierTimeline ? { multiplierTimeline: input.multiplierTimeline } : {})
  };
}

function attachLightAnimations(
  lights: AuroraMdlLightNode[],
  animationTracks: Array<{ nodeName: string; animation: AuroraMdlLightAnimation }>
): AuroraMdlLightNode[] {
  if (animationTracks.length === 0) {
    return lights;
  }
  const lightsByName = new Map(
    lights
      .map((light): [string, AuroraMdlLightNode] | null => {
        const key = normalizeNodeLookupName(light.nodeName);
        return key ? [key, light] : null;
      })
      .filter((entry): entry is [string, AuroraMdlLightNode] => Boolean(entry))
  );
  animationTracks.forEach((track) => {
    const key = normalizeNodeLookupName(track.nodeName);
    const target = key ? lightsByName.get(key) : undefined;
    if (!target) {
      return;
    }
    target.animations = [...(target.animations ?? []), track.animation];
  });
  return lights;
}

function attachReferenceNodesToEmitters(
  emitters: AuroraMdlEmitterNode[],
  referenceNodes: AuroraMdlReferenceNode[]
): AuroraMdlEmitterNode[] {
  if (referenceNodes.length === 0 || emitters.length === 0) {
    return emitters;
  }
  const emittersByName = new Map(
    emitters
      .map((emitter): [string, AuroraMdlEmitterNode] | null => {
        const key = normalizeNodeLookupName(emitter.nodeName);
        return key ? [key, emitter] : null;
      })
      .filter((entry): entry is [string, AuroraMdlEmitterNode] => Boolean(entry))
  );
  referenceNodes.forEach((referenceNode) => {
    const parentKey = normalizeNodeLookupName(referenceNode.parentNodeName);
    const target =
      (parentKey ? emittersByName.get(parentKey) : undefined) ??
      (emitters.length === 1 ? emitters[0] : undefined);
    if (!target) {
      return;
    }
    target.referenceNodes = [...(target.referenceNodes ?? []), referenceNode];
    target.provenance.childNodeNames = [
      ...(target.provenance.childNodeNames ?? []),
      referenceNode.nodeName
    ];
  });
  return emitters;
}

function attachEventsToEmitters(
  emitters: AuroraMdlEmitterNode[],
  events: AuroraMdlAnimationEvent[]
): AuroraMdlEmitterNode[] {
  if (events.length === 0 || emitters.length === 0) {
    return emitters;
  }
  emitters.forEach((emitter) => {
    emitter.events = sanitizeAnimationEvents([...(emitter.events ?? []), ...events]);
    const eventsByAnimation = new Map<string, AuroraMdlAnimationEvent[]>();
    emitter.events?.forEach((event) => {
      if (!event.animationName) {
        return;
      }
      eventsByAnimation.set(event.animationName, [
        ...(eventsByAnimation.get(event.animationName) ?? []),
        event
      ]);
    });
    if (eventsByAnimation.size > 0) {
      const existingPasses = emitter.animationPasses ?? [];
      const passNames = new Set(existingPasses.map((pass) => pass.animationName));
      const eventPasses = [...eventsByAnimation.entries()]
        .filter(([animationName]) => !passNames.has(animationName))
        .map(([animationName, passEvents]): AuroraAnimationEvaluationPass => ({
          animationName,
          events: passEvents
        }));
      emitter.animationPasses = [...existingPasses, ...eventPasses];
      emitter.animations = toEmitterAnimations(emitter.animationPasses);
    }
  });
  return emitters;
}

function toEmitterAnimations(
  passes: AuroraAnimationEvaluationPass[]
): AuroraMdlEmitterAnimation[] | undefined {
  const animations = passes
    .map((pass): AuroraMdlEmitterAnimation | undefined => {
      if (!pass.emitterState?.simulation && !pass.emitterState?.transform) {
        return undefined;
      }
      return {
        animationName: pass.animationName,
        ...(pass.lengthSeconds !== undefined ? { lengthSeconds: pass.lengthSeconds } : {}),
        ...(pass.transitionSeconds !== undefined
          ? { transitionSeconds: pass.transitionSeconds }
          : {}),
        ...(pass.emitterState.simulation ? { simulation: pass.emitterState.simulation } : {}),
        ...(pass.emitterState.transform ? { transform: pass.emitterState.transform } : {})
      };
    })
    .filter((animation): animation is AuroraMdlEmitterAnimation => Boolean(animation));
  return animations.length > 0 ? animations : undefined;
}

function setEmitterSimulationValue(
  emitter: MutableEmitter,
  key: keyof AuroraMdlEmitterSimulation,
  value: number | boolean | string | [number, number, number] | undefined
): void {
  if (value === undefined) {
    return;
  }
  const simulation = buildEmitterSimulation({
    ...emitter.simulation,
    [key]: value
  });
  if (simulation) {
    emitter.simulation = simulation;
  }
}

function setEmitterSimulationTimelineValue(
  emitter: MutableEmitter,
  key: AuroraMdlEmitterSimulationTimelineKey,
  frames: AuroraMdlNumberKeyframe[]
): void {
  const simulation = buildEmitterSimulation({
    ...emitter.simulation,
    timeline: {
      ...emitter.simulation?.timeline,
      [key]: frames
    }
  });
  if (simulation) {
    emitter.simulation = simulation;
  }
}

function setEmitterSimulationColorTimelineValue(
  emitter: MutableEmitter,
  key: AuroraMdlEmitterColorTimelineKey,
  frames: AuroraMdlColorKeyframe[]
): void {
  const simulation = buildEmitterSimulation({
    ...emitter.simulation,
    colorTimeline: {
      ...emitter.simulation?.colorTimeline,
      [key]: frames
    }
  });
  if (simulation) {
    emitter.simulation = simulation;
  }
}

function buildEmitterSimulation(input: AuroraMdlEmitterSimulation): AuroraMdlEmitterSimulation | undefined {
  const sanitized: AuroraMdlEmitterSimulation = {};
  const setNumber = (key: keyof AuroraMdlEmitterSimulation, value: unknown, nonNegative = false): void => {
    const numberValue = nonNegative ? sanitizeNonNegativeNumber(value) : sanitizeFiniteNumber(value);
    if (numberValue !== undefined) {
      (sanitized as Record<string, unknown>)[key] = numberValue;
    }
  };
  setNumber("xSize", input.xSize, true);
  setNumber("ySize", input.ySize, true);
  const spawnType = sanitizeNonNegativeInteger(input.spawnType);
  if (spawnType !== undefined) {
    sanitized.spawnType = spawnType;
  }
  // Retail placeable models use negative animation-controller birthrates as
  // explicit no-spawn states (for example plc_t04 off/off2on). Preserve the
  // controller value so the renderer can apply its <= 0 spawn gate.
  setNumber("birthrate", input.birthrate);
  setNumber("lifeExp", input.lifeExp, true);
  setNumber("mass", input.mass);
  setNumber("velocity", input.velocity);
  setNumber("randvel", input.randvel, true);
  setNumber("spread", input.spread, true);
  setNumber("particleRot", input.particleRot);
  setNumber("bounceCoefficient", input.bounceCoefficient);
  setNumber("blastRadius", input.blastRadius, true);
  setNumber("blastLength", input.blastLength, true);
  setNumber("blurLength", input.blurLength, true);
  setNumber("detonate", input.detonate, true);
  setNumber("fps", input.fps, true);
  setNumber("frameStart", input.frameStart, true);
  setNumber("frameEnd", input.frameEnd, true);
  setNumber("lightningScale", input.lightningScale, true);
  setNumber("lightningDelay", input.lightningDelay, true);
  setNumber("lightningRadius", input.lightningRadius, true);
  setNumber("deadspace", input.deadspace);
  setNumber("p2pBezier2", input.p2pBezier2, true);
  setNumber("p2pBezier3", input.p2pBezier3, true);
  setNumber("p2pSource", input.p2pSource, true);
  setNumber("p2pTarget", input.p2pTarget, true);
  setNumber("combineTime", input.combineTime, true);
  setNumber("grav", input.grav);
  setNumber("drag", input.drag);
  setNumber("threshold", input.threshold, true);
  setNumber("sizeStart", input.sizeStart, true);
  setNumber("sizeMid", input.sizeMid, true);
  setNumber("sizeEnd", input.sizeEnd, true);
  setNumber("sizeStartY", input.sizeStartY, true);
  setNumber("sizeMidY", input.sizeMidY, true);
  setNumber("sizeEndY", input.sizeEndY, true);
  setNumber("alphaStart", input.alphaStart, true);
  setNumber("alphaMid", input.alphaMid, true);
  setNumber("alphaEnd", input.alphaEnd, true);
  setNumber("percentStart", input.percentStart, true);
  setNumber("percentMid", input.percentMid, true);
  setNumber("percentEnd", input.percentEnd, true);
  const booleanKeys = [
    "bounce",
    "p2p",
    "inherit",
    "inheritVel",
    "inheritLocal",
    "inheritPart",
    "affectedByWind"
  ] as const;
  booleanKeys.forEach((key) => {
    const value = sanitizeBoolean(input[key]);
    if (value !== undefined) {
      sanitized[key] = value;
    }
  });
  const p2pType = sanitizeString(input.p2pType);
  if (p2pType) {
    sanitized.p2pType = p2pType;
  }
  const colorStart = sanitizeColor(input.colorStart);
  const colorMid = sanitizeColor(input.colorMid);
  const colorEnd = sanitizeColor(input.colorEnd);
  if (colorStart) {
    sanitized.colorStart = colorStart;
  }
  if (colorMid) {
    sanitized.colorMid = colorMid;
  }
  if (colorEnd) {
    sanitized.colorEnd = colorEnd;
  }
  const timeline = sanitizeSimulationTimeline(input.timeline);
  const colorTimeline = sanitizeColorTimeline(input.colorTimeline);
  if (timeline) {
    sanitized.timeline = timeline;
  }
  if (colorTimeline) {
    sanitized.colorTimeline = colorTimeline;
  }
  return Object.keys(sanitized).length > 0 ? sanitized : undefined;
}

function setEmitterSourceStateValue(
  emitter: MutableEmitter,
  key: keyof AuroraMdlEmitterSourceState,
  value: number | boolean | string | undefined
): void {
  if (value === undefined) {
    return;
  }
  const sourceState = buildEmitterSourceState({
    ...emitter.sourceState,
    [key]: value
  });
  if (sourceState) {
    emitter.sourceState = sourceState;
  }
}

function buildEmitterSourceState(input: AuroraMdlEmitterSourceState): AuroraMdlEmitterSourceState | undefined {
  const renderOrder =
    typeof input.renderOrder === "number" && Number.isFinite(input.renderOrder)
      ? Math.trunc(input.renderOrder)
      : undefined;
  const renderHintRaw =
    typeof input.renderHintRaw === "string" && input.renderHintRaw.trim()
      ? input.renderHintRaw.trim()
      : undefined;
  const renderHintMode =
    typeof input.renderHintMode === "number" && Number.isFinite(input.renderHintMode)
      ? sanitizeAuroraRenderHintMode(input.renderHintMode)
      : renderHintRaw
        ? resolveAuroraRenderHintMode(renderHintRaw)
        : undefined;
  const customShaderVS = sanitizeString(input.customShaderVS);
  const customShaderFS = sanitizeString(input.customShaderFS);
  const customShaderGS = sanitizeString(input.customShaderGS);
  const transparency = sanitizeBoolean(input.transparency);
  const twoSidedMaterial = sanitizeBoolean(input.twoSidedMaterial);
  const twoSidedTexture = sanitizeBoolean(input.twoSidedTexture);
  const sampleFramebuffer = sanitizeAuroraSampleFramebufferValue(input.sampleFramebuffer);
  const volumetric = sanitizeBoolean(input.volumetric);
  const loop = sanitizeBoolean(input.loop);
  const isTinted = sanitizeBoolean(input.isTinted);
  const splat = sanitizeBoolean(input.splat);
  const rotateTexture = sanitizeBoolean(input.rotateTexture);
  const state: AuroraMdlEmitterSourceState = {
    ...(renderOrder !== undefined ? { renderOrder } : {}),
    ...(renderHintRaw !== undefined ? { renderHintRaw } : {}),
    ...(renderHintMode !== undefined ? { renderHintMode } : {}),
    ...(customShaderVS !== undefined ? { customShaderVS } : {}),
    ...(customShaderFS !== undefined ? { customShaderFS } : {}),
    ...(customShaderGS !== undefined ? { customShaderGS } : {}),
    ...(transparency !== undefined ? { transparency } : {}),
    ...(twoSidedMaterial !== undefined ? { twoSidedMaterial } : {}),
    ...(twoSidedTexture !== undefined ? { twoSidedTexture } : {}),
    ...(sampleFramebuffer !== undefined ? { sampleFramebuffer } : {}),
    ...(volumetric !== undefined ? { volumetric } : {}),
    ...(loop !== undefined ? { loop } : {}),
    ...(isTinted !== undefined ? { isTinted } : {}),
    ...(splat !== undefined ? { splat } : {}),
    ...(rotateTexture !== undefined ? { rotateTexture } : {})
  };
  return Object.keys(state).length > 0 ? state : undefined;
}

function setEmitterTransformValue(
  emitter: MutableEmitter,
  key: keyof AuroraMdlTransform,
  value:
    | [number, number, number]
    | AuroraMdlOrientation
    | number
    | AuroraMdlNumberKeyframe[]
    | AuroraMdlVector3Keyframe[]
    | AuroraMdlOrientationKeyframe[]
    | undefined
): void {
  if (value === undefined) {
    return;
  }
  const transform = buildTransform({
    ...emitter.transform,
    [key]: value
  });
  if (transform) {
    emitter.transform = transform;
  }
}

function setLightTransformValue(
  light: MutableLight,
  key: keyof AuroraMdlTransform,
  value:
    | [number, number, number]
    | AuroraMdlOrientation
    | number
    | AuroraMdlNumberKeyframe[]
    | AuroraMdlVector3Keyframe[]
    | AuroraMdlOrientationKeyframe[]
    | undefined
): void {
  if (value === undefined) {
    return;
  }
  const transform = buildTransform({
    ...light.transform,
    [key]: value
  });
  if (transform) {
    light.transform = transform;
  }
}

function setReferenceTransformValue(
  referenceNode: AuroraMdlReferenceNode,
  key: keyof AuroraMdlTransform,
  value:
    | [number, number, number]
    | AuroraMdlOrientation
    | number
    | AuroraMdlNumberKeyframe[]
    | AuroraMdlVector3Keyframe[]
    | AuroraMdlOrientationKeyframe[]
    | undefined
): void {
  if (value === undefined) {
    return;
  }
  const transform = buildTransform({
    ...referenceNode.transform,
    [key]: value
  });
  if (transform) {
    referenceNode.transform = transform;
  }
}

function setShadowBlobTransformValue(
  shadowBlobNode: AuroraMdlShadowBlobNode,
  key: keyof AuroraMdlTransform,
  value:
    | [number, number, number]
    | AuroraMdlOrientation
    | number
    | AuroraMdlNumberKeyframe[]
    | AuroraMdlVector3Keyframe[]
    | AuroraMdlOrientationKeyframe[]
    | undefined
): void {
  if (value === undefined) {
    return;
  }
  const transform = buildTransform({
    ...shadowBlobNode.transform,
    [key]: value
  });
  if (transform) {
    shadowBlobNode.transform = transform;
  }
}

function buildTransform(input: AuroraMdlTransform): AuroraMdlTransform | undefined {
  const position = sanitizeVector3(input.position);
  const positionTimeline = sanitizeVector3Keyframes(input.positionTimeline);
  const orientation = sanitizeOrientation(input.orientation);
  const orientationTimeline = sanitizeOrientationKeyframes(input.orientationTimeline);
  const scale = sanitizeFiniteNumber(input.scale);
  const scaleTimeline = sanitizeNumberKeyframes(input.scaleTimeline);
  if (
    position === undefined &&
    positionTimeline === undefined &&
    orientation === undefined &&
    orientationTimeline === undefined &&
    scale === undefined &&
    scaleTimeline === undefined
  ) {
    return undefined;
  }
  return {
    ...(position ? { position } : {}),
    ...(positionTimeline ? { positionTimeline } : {}),
    ...(orientation ? { orientation } : {}),
    ...(orientationTimeline ? { orientationTimeline } : {}),
    ...(scale !== undefined ? { scale } : {}),
    ...(scaleTimeline ? { scaleTimeline } : {})
  };
}

function setEmitterAtlasValue(
  emitter: MutableEmitter,
  key: "xGridRaw" | "yGridRaw" | "fps" | "frameStart" | "frameEnd" | "random",
  value: number | boolean | undefined
): void {
  if (value === undefined) {
    return;
  }
  const atlas = buildEmitterAtlas({
    ...emitter.atlas,
    [key]: value
  });
  if (atlas) {
    emitter.atlas = atlas;
  }
}

function buildEmitterAtlas(input: Partial<AuroraMdlEmitterAtlas>): AuroraMdlEmitterAtlas | undefined {
  const xGridRaw = sanitizeAtlasInteger(input.xGridRaw);
  const yGridRaw = sanitizeAtlasInteger(input.yGridRaw);
  const fps = sanitizeAtlasNumber(input.fps);
  const frameStart = sanitizeAtlasInteger(input.frameStart);
  const frameEnd = sanitizeAtlasInteger(input.frameEnd);
  const random = sanitizeBoolean(input.random);
  if (
    xGridRaw === undefined &&
    yGridRaw === undefined &&
    fps === undefined &&
    frameStart === undefined &&
    frameEnd === undefined &&
    random === undefined
  ) {
    return undefined;
  }
  return {
    ...(xGridRaw !== undefined ? { xGridRaw } : {}),
    ...(yGridRaw !== undefined ? { yGridRaw } : {}),
    effectiveXGrid: xGridRaw && xGridRaw > 0 ? xGridRaw : 1,
    effectiveYGrid: yGridRaw && yGridRaw > 0 ? yGridRaw : 1,
    ...(fps !== undefined ? { fps } : {}),
    ...(frameStart !== undefined ? { frameStart } : {}),
    ...(frameEnd !== undefined ? { frameEnd } : {}),
    ...(random !== undefined ? { random } : {})
  };
}

function readAuroraAsciiNumberTimeline(
  lines: string[],
  keyLineIndex: number,
  rawValue: string
): { frames: AuroraMdlNumberKeyframe[]; rows: number[][]; endLineIndex: number } {
  const parsed = readAuroraAsciiKeyframeRows(lines, keyLineIndex, rawValue, 2);
  return {
    frames: parsed.rows
      .map((row): AuroraMdlNumberKeyframe | null => {
        const time = sanitizeNonNegativeNumber(row[0]);
        const value = sanitizeFiniteNumber(row[1]);
        return time !== undefined && value !== undefined ? { time, value } : null;
      })
      .filter((frame): frame is AuroraMdlNumberKeyframe => frame !== null),
    rows: parsed.rows,
    endLineIndex: parsed.endLineIndex
  };
}

function readAuroraAsciiColorTimeline(
  lines: string[],
  keyLineIndex: number,
  rawValue: string
): { frames: AuroraMdlColorKeyframe[]; rows: number[][]; endLineIndex: number } {
  const parsed = readAuroraAsciiKeyframeRows(lines, keyLineIndex, rawValue, 4);
  return {
    frames: parsed.rows
      .map((row): AuroraMdlColorKeyframe | null => {
        const time = sanitizeNonNegativeNumber(row[0]);
        const color = sanitizeColor([row[1], row[2], row[3]]);
        return time !== undefined && color ? { time, value: color } : null;
      })
      .filter((frame): frame is AuroraMdlColorKeyframe => frame !== null),
    rows: parsed.rows,
    endLineIndex: parsed.endLineIndex
  };
}

function readAuroraAsciiVector3Timeline(
  lines: string[],
  keyLineIndex: number,
  rawValue: string
): { frames: AuroraMdlVector3Keyframe[]; rows: number[][]; endLineIndex: number } {
  const parsed = readAuroraAsciiKeyframeRows(lines, keyLineIndex, rawValue, 4);
  return {
    frames: parsed.rows
      .map((row): AuroraMdlVector3Keyframe | null => {
        const time = sanitizeNonNegativeNumber(row[0]);
        const vector = sanitizeVector3([row[1], row[2], row[3]]);
        return time !== undefined && vector ? { time, value: vector } : null;
      })
      .filter((frame): frame is AuroraMdlVector3Keyframe => frame !== null),
    rows: parsed.rows,
    endLineIndex: parsed.endLineIndex
  };
}

function readAuroraAsciiOrientationTimeline(
  lines: string[],
  keyLineIndex: number,
  rawValue: string
): { frames: AuroraMdlOrientationKeyframe[]; rows: number[][]; endLineIndex: number } {
  const parsed = readAuroraAsciiKeyframeRows(lines, keyLineIndex, rawValue, 5);
  return {
    frames: parsed.rows
      .map((row): AuroraMdlOrientationKeyframe | null => {
        const time = sanitizeNonNegativeNumber(row[0]);
        const orientation = sanitizeOrientation({
          axis: [row[1], row[2], row[3]],
          angleRadians: row[4]
        });
        return time !== undefined && orientation ? { time, value: orientation } : null;
      })
      .filter((frame): frame is AuroraMdlOrientationKeyframe => frame !== null),
    rows: parsed.rows,
    endLineIndex: parsed.endLineIndex
  };
}

function readAuroraAsciiKeyframeRows(
  lines: string[],
  keyLineIndex: number,
  rawValue: string,
  valueColumnCount: number
): { rows: number[][]; endLineIndex: number } {
  const headerValues = readAuroraNumberList(rawValue);
  const rowWidth = valueColumnCount;
  const declaredFrameCount =
    headerValues.length > 0 && headerValues.length % rowWidth !== 0
      ? Math.max(0, Math.trunc(headerValues[0] ?? 0))
      : undefined;
  const startIndex = declaredFrameCount === undefined ? 0 : 1;
  const rows: number[][] = [];
  appendNumberRows(rows, headerValues, rowWidth, startIndex);
  let lineIndex = keyLineIndex;
  while (
    lineIndex + 1 < lines.length &&
    (declaredFrameCount === undefined || rows.length < declaredFrameCount)
  ) {
    lineIndex += 1;
    const candidate = stripAuroraAsciiLineComments(lines[lineIndex] ?? "");
    if (!candidate) {
      continue;
    }
    if (/^endlist\b/iu.test(candidate)) {
      break;
    }
    const values = readAuroraNumberList(candidate);
    if (values.length < rowWidth) {
      lineIndex -= 1;
      break;
    }
    appendNumberRows(rows, values, rowWidth);
  }
  return { rows, endLineIndex: lineIndex };
}

function readAuroraAsciiStringListUntilEndList(
  lines: string[],
  keyLineIndex: number,
  rawValue: string
): { values: string[]; endLineIndex: number } {
  const tokens = rawValue
    .trim()
    .split(/\s+/u)
    .filter((token) => token.length > 0);
  const declaredCount =
    tokens.length > 0 && /^\d+$/u.test(tokens[0] ?? "")
      ? Number.parseInt(tokens[0]!, 10)
      : undefined;
  const values: string[] = [];
  const appendTokens = (parts: string[], start = 0): void => {
    for (let index = start; index < parts.length; index += 1) {
      const normalized = normalizeModelTextureReference(parts[index]);
      if (normalized) {
        values.push(normalized);
      }
    }
  };

  appendTokens(tokens, declaredCount === undefined ? 0 : 1);
  if (declaredCount === undefined && rawValue.trim().length > 0) {
    return { values, endLineIndex: keyLineIndex };
  }

  let lineIndex = keyLineIndex;
  while (
    lineIndex + 1 < lines.length &&
    (declaredCount === undefined || values.length < declaredCount)
  ) {
    lineIndex += 1;
    const candidate = stripAuroraAsciiLineComments(lines[lineIndex] ?? "");
    if (!candidate) {
      continue;
    }
    if (/^endlist\b/iu.test(candidate)) {
      break;
    }
    appendTokens(candidate.split(/\s+/u).filter((token) => token.length > 0));
  }

  return { values, endLineIndex: lineIndex };
}

function readAuroraAsciiNumberListUntilEndList(
  lines: string[],
  keyLineIndex: number,
  rawValue: string
): { values: number[]; endLineIndex: number } {
  const headerValues = readAuroraNumberList(rawValue);
  const declaredCount =
    headerValues.length > 0 && Number.isInteger(headerValues[0])
      ? Math.max(0, Math.trunc(headerValues[0]!))
      : undefined;
  const startIndex = declaredCount === undefined ? 0 : 1;
  const values: number[] = [];
  const appendValues = (items: number[], start = 0): void => {
    for (let index = start; index < items.length; index += 1) {
      const value = sanitizeFiniteNumber(items[index]);
      if (value !== undefined) {
        values.push(value);
      }
    }
  };

  appendValues(headerValues, startIndex);
  if (declaredCount === undefined && rawValue.trim().length > 0) {
    return { values, endLineIndex: keyLineIndex };
  }

  let lineIndex = keyLineIndex;
  while (
    lineIndex + 1 < lines.length &&
    (declaredCount === undefined || values.length < declaredCount)
  ) {
    lineIndex += 1;
    const candidate = stripAuroraAsciiLineComments(lines[lineIndex] ?? "");
    if (!candidate) {
      continue;
    }
    if (/^endlist\b/iu.test(candidate)) {
      break;
    }
    appendValues(readAuroraNumberList(candidate));
  }

  return { values, endLineIndex: lineIndex };
}

function readAuroraAsciiVector3ListUntilEndList(
  lines: string[],
  keyLineIndex: number,
  rawValue: string
): { values: [number, number, number][]; endLineIndex: number } {
  const headerValues = readAuroraNumberList(rawValue);
  const declaredCount =
    headerValues.length > 0 &&
    Number.isInteger(headerValues[0]) &&
    (headerValues.length === 1 || (headerValues.length - 1) % 3 === 0)
      ? Math.max(0, Math.trunc(headerValues[0]!))
      : undefined;
  const values: [number, number, number][] = [];
  const appendRows = (items: number[], start = 0): void => {
    for (let index = start; index + 2 < items.length; index += 3) {
      const vector = sanitizeVector3([items[index], items[index + 1], items[index + 2]]);
      if (vector) {
        values.push(vector);
      }
    }
  };

  appendRows(headerValues, declaredCount === undefined ? 0 : 1);
  if (declaredCount === undefined && rawValue.trim().length > 0) {
    return { values, endLineIndex: keyLineIndex };
  }

  let lineIndex = keyLineIndex;
  while (
    lineIndex + 1 < lines.length &&
    (declaredCount === undefined || values.length < declaredCount)
  ) {
    lineIndex += 1;
    const candidate = stripAuroraAsciiLineComments(lines[lineIndex] ?? "");
    if (!candidate) {
      continue;
    }
    if (/^endlist\b/iu.test(candidate)) {
      break;
    }
    appendRows(readAuroraNumberList(candidate));
  }

  return { values, endLineIndex: lineIndex };
}

function readAuroraAsciiNumberKeyframesUntilEndList(
  lines: string[],
  keyLineIndex: number,
  rawValue: string
): { frames: AuroraMdlNumberKeyframe[]; endLineIndex: number } {
  const parsed = readAuroraAsciiKeyframeRows(lines, keyLineIndex, rawValue, 2);
  return {
    frames: parsed.rows
      .map((row): AuroraMdlNumberKeyframe | null => {
        const time = sanitizeNonNegativeNumber(row[0]);
        const value = sanitizeFiniteNumber(row[1]);
        return time !== undefined && value !== undefined ? { time, value } : null;
      })
      .filter((frame): frame is AuroraMdlNumberKeyframe => frame !== null),
    endLineIndex: parsed.endLineIndex
  };
}

function readAuroraAsciiColorKeyframesUntilEndList(
  lines: string[],
  keyLineIndex: number,
  rawValue: string
): { frames: AuroraMdlColorKeyframe[]; endLineIndex: number } {
  const parsed = readAuroraAsciiKeyframeRows(lines, keyLineIndex, rawValue, 4);
  return {
    frames: parsed.rows
      .map((row): AuroraMdlColorKeyframe | null => {
        const time = sanitizeNonNegativeNumber(row[0]);
        const color = sanitizeColor([row[1], row[2], row[3]]);
        return time !== undefined && color ? { time, value: color } : null;
      })
      .filter((frame): frame is AuroraMdlColorKeyframe => frame !== null),
    endLineIndex: parsed.endLineIndex
  };
}

function readAuroraAsciiVector3KeyframesUntilEndList(
  lines: string[],
  keyLineIndex: number,
  rawValue: string
): { frames: AuroraMdlVector3Keyframe[]; endLineIndex: number } {
  const parsed = readAuroraAsciiKeyframeRows(lines, keyLineIndex, rawValue, 4);
  return {
    frames: parsed.rows
      .map((row): AuroraMdlVector3Keyframe | null => {
        const time = sanitizeNonNegativeNumber(row[0]);
        const vector = sanitizeVector3([row[1], row[2], row[3]]);
        return time !== undefined && vector ? { time, value: vector } : null;
      })
      .filter((frame): frame is AuroraMdlVector3Keyframe => frame !== null),
    endLineIndex: parsed.endLineIndex
  };
}

function appendNumberRows(rows: number[][], values: number[], rowWidth: number, start = 0): void {
  for (let index = start; index + rowWidth - 1 < values.length; index += rowWidth) {
    rows.push(values.slice(index, index + rowWidth));
  }
}

function toEmitterSimulationNumberKey(key: string): keyof AuroraMdlEmitterSimulation | undefined {
  switch (key) {
    case "xsize":
    case "x_size":
      return "xSize";
    case "ysize":
    case "y_size":
      return "ySize";
    case "spawntype":
    case "spawn_type":
      return "spawnType";
    case "birthrate":
      return "birthrate";
    case "lifeexp":
    case "life_exp":
      return "lifeExp";
    case "mass":
      return "mass";
    case "velocity":
      return "velocity";
    case "randvel":
    case "rand_vel":
      return "randvel";
    case "spread":
      return "spread";
    case "particlerot":
    case "particle_rot":
      return "particleRot";
    case "bounceco":
    case "bounce_co":
      return "bounceCoefficient";
    case "blastradius":
    case "blast_radius":
      return "blastRadius";
    case "blastlength":
    case "blast_length":
      return "blastLength";
    case "blurlength":
    case "blur_length":
      return "blurLength";
    case "detonate":
      return "detonate";
    case "fps":
      return "fps";
    case "framestart":
    case "frame_start":
      return "frameStart";
    case "frameend":
    case "frame_end":
      return "frameEnd";
    case "lightningscale":
    case "lightning_scale":
      return "lightningScale";
    case "lightningdelay":
    case "lightning_delay":
      return "lightningDelay";
    case "lightningradius":
    case "lightning_radius":
      return "lightningRadius";
    case "deadspace":
    case "dead_space":
      return "deadspace";
    case "p2pbezier2":
    case "p2p_bezier2":
      return "p2pBezier2";
    case "p2pbezier3":
    case "p2p_bezier3":
      return "p2pBezier3";
    case "src":
    case "p2psrc":
    case "p2p_src":
      return "p2pSource";
    case "target":
    case "p2ptarget":
    case "p2p_target":
      return "p2pTarget";
    case "combinetime":
    case "combine_time":
      return "combineTime";
    case "grav":
      return "grav";
    case "drag":
      return "drag";
    case "threshold":
      return "threshold";
    case "sizestart":
    case "size_start":
      return "sizeStart";
    case "sizemid":
    case "size_mid":
      return "sizeMid";
    case "sizeend":
    case "size_end":
      return "sizeEnd";
    case "sizestart_y":
    case "size_start_y":
      return "sizeStartY";
    case "sizemid_y":
    case "size_mid_y":
      return "sizeMidY";
    case "sizeend_y":
    case "size_end_y":
      return "sizeEndY";
    case "percentstart":
    case "percent_start":
      return "percentStart";
    case "percentmid":
    case "percent_mid":
      return "percentMid";
    case "percentend":
    case "percent_end":
      return "percentEnd";
    case "alphastart":
    case "alpha_start":
      return "alphaStart";
    case "alphamid":
    case "alpha_mid":
      return "alphaMid";
    case "alphaend":
    case "alpha_end":
      return "alphaEnd";
    default:
      return undefined;
  }
}

function toAuroraEmitterSimulationTimelineKey(
  key: string
): AuroraMdlEmitterSimulationTimelineKey | undefined {
  const normalized = key.trim().toLowerCase().replace(/[\s-]+/gu, "_");
  const withoutSuffix = normalized.endsWith("bezierkey")
    ? normalized.slice(0, -"bezierkey".length)
    : normalized.endsWith("key")
      ? normalized.slice(0, -"key".length)
      : undefined;
  if (!withoutSuffix) {
    return undefined;
  }
  const simulationKey = toEmitterSimulationNumberKey(withoutSuffix);
  return typeof simulationKey === "string" && AURORA_EMITTER_SIMULATION_TIMELINE_KEY_SET.has(simulationKey)
    ? (simulationKey as AuroraMdlEmitterSimulationTimelineKey)
    : undefined;
}

function toAuroraEmitterSimulationColorTimelineKey(
  key: string
): AuroraMdlEmitterColorTimelineKey | undefined {
  const normalized = key.trim().toLowerCase().replace(/[\s-]+/gu, "_");
  const withoutSuffix = normalized.endsWith("bezierkey")
    ? normalized.slice(0, -"bezierkey".length)
    : normalized.endsWith("key")
      ? normalized.slice(0, -"key".length)
      : undefined;
  if (!withoutSuffix) {
    return undefined;
  }
  return toEmitterSimulationColorKey(withoutSuffix);
}

function toEmitterSimulationBooleanKey(key: string): keyof AuroraMdlEmitterSimulation | undefined {
  switch (key) {
    case "bounce":
      return "bounce";
    case "p2p":
      return "p2p";
    case "inherit":
      return "inherit";
    case "inheritvel":
    case "inherit_vel":
      return "inheritVel";
    case "inheritlocal":
    case "inherit_local":
      return "inheritLocal";
    case "inheritpart":
    case "inherit_part":
      return "inheritPart";
    case "affectedbywind":
    case "affected_by_wind":
      return "affectedByWind";
    default:
      return undefined;
  }
}

function toEmitterSimulationStringKey(key: string): keyof AuroraMdlEmitterSimulation | undefined {
  switch (key) {
    case "p2psel":
    case "p2p_sel":
      return "p2pType";
    default:
      return undefined;
  }
}

function toEmitterSimulationColorKey(key: string): AuroraMdlEmitterColorTimelineKey | undefined {
  switch (key) {
    case "colorstart":
    case "color_start":
      return "colorStart";
    case "colormid":
    case "color_mid":
      return "colorMid";
    case "colorend":
    case "color_end":
      return "colorEnd";
    default:
      return undefined;
  }
}

function toEmitterAtlasKey(
  key: string
): "xGridRaw" | "yGridRaw" | "fps" | "frameStart" | "frameEnd" | "random" | undefined {
  switch (key) {
    case "xgrid":
    case "x_grid":
      return "xGridRaw";
    case "ygrid":
    case "y_grid":
      return "yGridRaw";
    case "fps":
      return "fps";
    case "framestart":
    case "frame_start":
      return "frameStart";
    case "frameend":
    case "frame_end":
      return "frameEnd";
    case "random":
      return "random";
    default:
      return undefined;
  }
}

function toEmitterSourceStateKey(key: string): keyof AuroraMdlEmitterSourceState | undefined {
  switch (key) {
    case "renderorder":
    case "render_order":
      return "renderOrder";
    case "renderhint":
    case "render_hint":
      return "renderHintRaw";
    case "customshadervs":
    case "custom_shader_vs":
      return "customShaderVS";
    case "customshaderfs":
    case "custom_shader_fs":
      return "customShaderFS";
    case "customshadergs":
    case "custom_shader_gs":
      return "customShaderGS";
    case "transparency":
      return "transparency";
    case "twosided":
      return "twoSidedMaterial";
    case "twosidedtex":
    case "two_sided_tex":
      return "twoSidedTexture";
    case "sample_framebuffer":
      return "sampleFramebuffer";
    case "volumetric":
      return "volumetric";
    case "loop":
      return "loop";
    case "m_istinted":
    case "istinted":
    case "is_tinted":
      return "isTinted";
    case "splat":
      return "splat";
    case "rotatetexture":
    case "rotate_texture":
      return "rotateTexture";
    default:
      return undefined;
  }
}

function resolveAuroraRenderHintMode(rawToken: string): 0 | 1 | 2 | 3 {
  const token = rawToken.trim().toLowerCase();
  if (token === "normalandspecmapped") {
    return 2;
  }
  if (token === "normaltangents") {
    return 3;
  }
  return 0;
}

function sanitizeAuroraRenderHintMode(value: number): 0 | 1 | 2 | 3 {
  const mode = Math.trunc(value);
  return mode === 1 || mode === 2 || mode === 3 ? mode : 0;
}

function buildAuroraAnimationEvent(input: {
  time?: number;
  type?: string;
  animationName?: string;
}): AuroraMdlAnimationEvent | undefined {
  const time = sanitizeNonNegativeNumber(input.time);
  const type = sanitizeString(input.type);
  const animationName = sanitizeString(input.animationName);
  if (time === undefined || !type) {
    return undefined;
  }
  return {
    time,
    type,
    ...(animationName ? { animationName } : {})
  };
}

function sanitizeAnimationEvents(value: unknown): AuroraMdlAnimationEvent[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const events = value
    .map((entry): AuroraMdlAnimationEvent | undefined => {
      if (typeof entry !== "object" || entry === null) {
        return undefined;
      }
      const candidate = entry as { time?: unknown; type?: unknown; animationName?: unknown };
      return buildAuroraAnimationEvent({
        time: typeof candidate.time === "number" ? candidate.time : undefined,
        type: typeof candidate.type === "string" ? candidate.type : undefined,
        animationName:
          typeof candidate.animationName === "string" ? candidate.animationName : undefined
      });
    })
    .filter((event): event is AuroraMdlAnimationEvent => Boolean(event))
    .sort((left, right) => left.time - right.time);
  return events.length > 0 ? events : undefined;
}

function stripAuroraAsciiLineComments(line: string): string {
  return line
    .replace(/\/\/.*$/u, "")
    .replace(/;.*$/u, "")
    .trim();
}

function readAuroraNumberList(value: string): number[] {
  return value
    .trim()
    .split(/[\s,]+/u)
    .map((part) => Number.parseFloat(part))
    .filter((part) => Number.isFinite(part));
}

function readAuroraIntegerValue(value: string): number | undefined {
  const parsed = Number.parseInt(value.trim(), 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function readAuroraNumberValue(value: string): number | undefined {
  const parsed = Number.parseFloat(value.trim());
  return Number.isFinite(parsed) ? parsed : undefined;
}

function readAuroraVector3Value(value: string): [number, number, number] | undefined {
  return sanitizeVector3(readAuroraNumberList(value).slice(0, 3));
}

function readAuroraOrientationValue(value: string): AuroraMdlOrientation | undefined {
  const values = readAuroraNumberList(value);
  if (values.length < 4) {
    return undefined;
  }
  return sanitizeOrientation({
    axis: [values[0]!, values[1]!, values[2]!],
    angleRadians: values[3]!
  });
}

function readAuroraBooleanValue(value: string): boolean | undefined {
  const normalized = value.trim().toLowerCase();
  if (normalized === "1" || normalized === "true" || normalized === "yes") {
    return true;
  }
  if (normalized === "0" || normalized === "false" || normalized === "no") {
    return false;
  }
  return undefined;
}

function readAuroraSampleFramebufferValue(value: string): number | undefined {
  const integerValue = readAuroraIntegerValue(value);
  if (integerValue !== undefined) {
    return integerValue;
  }
  const booleanValue = readAuroraBooleanValue(value);
  return booleanValue === undefined ? undefined : booleanValue ? 1 : 0;
}

function normalizeModelTextureReference(value: string | undefined | null): string | undefined {
  const normalized = normalizeAuroraMdlValue(value)
    ?.replace(/\.(dds|tga|plt|txi|png|jpg|jpeg)$/iu, "")
    .trim();
  return normalized && normalized !== "****" ? normalized : undefined;
}

function normalizeAuroraModelResourceReference(value: string | undefined | null): string | undefined {
  const normalized = normalizeAuroraMdlValue(value)
    ?.replace(/\.(mdl|mdb|glb)$/iu, "")
    .trim()
    .toLowerCase();
  return normalized && normalized !== "****" ? normalized : undefined;
}

function normalizeAuroraMdlValue(value: string | undefined | null): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim().replace(/^"+|"+$/gu, "");
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeNodeLookupName(value: string | undefined): string | undefined {
  return normalizeAuroraMdlValue(value)?.toLowerCase();
}

function resolveNearestOpenEmitterName(
  nodeStack: Array<
    | { kind: "emitter"; emitter: MutableEmitter }
    | { kind: "light"; light: MutableLight }
    | { kind: "reference"; reference: AuroraMdlReferenceNode }
    | { kind: "shadowblob"; shadowBlob: AuroraMdlShadowBlobNode }
    | { kind: "other"; nodeName?: string }
  >
): string | undefined {
  for (let index = nodeStack.length - 1; index >= 0; index -= 1) {
    const node = nodeStack[index];
    if (node?.kind === "emitter") {
      return node.emitter.nodeName;
    }
  }
  return undefined;
}

function resolveNearestOpenNodeName(
  nodeStack: Array<
    | { kind: "emitter"; emitter: MutableEmitter }
    | { kind: "light"; light: MutableLight }
    | { kind: "reference"; reference: AuroraMdlReferenceNode }
    | { kind: "shadowblob"; shadowBlob: AuroraMdlShadowBlobNode }
    | { kind: "other"; nodeName?: string }
  >
): string | undefined {
  for (let index = nodeStack.length - 1; index >= 0; index -= 1) {
    const node = nodeStack[index];
    if (node?.kind === "emitter") {
      return node.emitter.nodeName;
    }
    if (node?.kind === "light") {
      return node.light.nodeName;
    }
    if (node?.kind === "reference") {
      return node.reference.nodeName;
    }
    if (node?.kind === "shadowblob") {
      return node.shadowBlob.nodeName;
    }
    if (node?.kind === "other") {
      return node.nodeName;
    }
  }
  return undefined;
}

function sanitizeFiniteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function sanitizeNonNegativeNumber(value: unknown): number | undefined {
  const finite = sanitizeFiniteNumber(value);
  return finite !== undefined && finite >= 0 ? finite : undefined;
}

function sanitizeAuroraBinaryAnimationSeconds(value: unknown): number | undefined {
  const nonNegative = sanitizeNonNegativeNumber(value);
  if (nonNegative === undefined || nonNegative > AURORA_BINARY_ANIMATION_REASONABLE_MAX_SECONDS) {
    return undefined;
  }
  if (
    nonNegative > 0 &&
    nonNegative < AURORA_BINARY_ANIMATION_REASONABLE_MIN_POSITIVE_SECONDS
  ) {
    return undefined;
  }
  return nonNegative;
}

function sanitizeNonNegativeInteger(value: unknown): number | undefined {
  const nonNegative = sanitizeNonNegativeNumber(value);
  return nonNegative !== undefined ? Math.trunc(nonNegative) : undefined;
}

function sanitizeBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function sanitizeString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function sanitizeColor(value: unknown): [number, number, number] | undefined {
  return sanitizeVector3(value);
}

function sanitizeVector3(value: unknown): [number, number, number] | undefined {
  if (!Array.isArray(value) || value.length < 3) {
    return undefined;
  }
  const [x, y, z] = value;
  if (
    typeof x !== "number" ||
    typeof y !== "number" ||
    typeof z !== "number" ||
    !Number.isFinite(x) ||
    !Number.isFinite(y) ||
    !Number.isFinite(z)
  ) {
    return undefined;
  }
  return [x, y, z];
}

function sanitizeAuroraSampleFramebufferValue(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (typeof value === "boolean") {
    return value ? 1 : 0;
  }
  if (typeof value === "string") {
    return readAuroraSampleFramebufferValue(value);
  }
  return undefined;
}

function sanitizeOrientation(value: unknown): AuroraMdlOrientation | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined;
  }
  const candidate = value as { axis?: unknown; angleRadians?: unknown };
  const axis = sanitizeVector3(candidate.axis);
  const angleRadians = candidate.angleRadians;
  if (!axis || typeof angleRadians !== "number" || !Number.isFinite(angleRadians)) {
    return undefined;
  }
  const axisLengthSq = axis[0] * axis[0] + axis[1] * axis[1] + axis[2] * axis[2];
  if (axisLengthSq <= 1e-12) {
    return undefined;
  }
  return { axis, angleRadians };
}

function sanitizeAtlasInteger(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }
  return Math.max(0, Math.trunc(value));
}

function sanitizeAtlasNumber(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }
  return value >= 0 ? value : undefined;
}

function sanitizeNumberKeyframes(
  value: unknown,
  options: { nonNegativeValue?: boolean } = {}
): AuroraMdlNumberKeyframe[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const frames = value
    .map((entry): AuroraMdlNumberKeyframe | null => {
      if (typeof entry !== "object" || entry === null) {
        return null;
      }
      const candidate = entry as { time?: unknown; value?: unknown };
      if (
        typeof candidate.time !== "number" ||
        typeof candidate.value !== "number" ||
        !Number.isFinite(candidate.time) ||
        !Number.isFinite(candidate.value) ||
        candidate.time < 0 ||
        (options.nonNegativeValue === true && candidate.value < 0)
      ) {
        return null;
      }
      return { time: candidate.time, value: candidate.value };
    })
    .filter((frame): frame is AuroraMdlNumberKeyframe => frame !== null)
    .sort((left, right) => left.time - right.time);
  return uniqueNumberKeyframes(frames);
}

function uniqueNumberKeyframes(frames: AuroraMdlNumberKeyframe[]): AuroraMdlNumberKeyframe[] | undefined {
  const uniqueFrames: AuroraMdlNumberKeyframe[] = [];
  frames.forEach((frame) => {
    const previous = uniqueFrames[uniqueFrames.length - 1];
    if (previous && previous.time === frame.time) {
      previous.value = frame.value;
      return;
    }
    uniqueFrames.push({ ...frame });
  });
  return uniqueFrames.length > 1 ? uniqueFrames : undefined;
}

function sanitizeVector3Keyframes(value: unknown): AuroraMdlVector3Keyframe[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const frames = value
    .map((entry): AuroraMdlVector3Keyframe | null => {
      if (typeof entry !== "object" || entry === null) {
        return null;
      }
      const candidate = entry as { time?: unknown; value?: unknown };
      const vector = sanitizeVector3(candidate.value);
      if (
        typeof candidate.time !== "number" ||
        !Number.isFinite(candidate.time) ||
        candidate.time < 0 ||
        !vector
      ) {
        return null;
      }
      return { time: candidate.time, value: vector };
    })
    .filter((frame): frame is AuroraMdlVector3Keyframe => frame !== null)
    .sort((left, right) => left.time - right.time);
  const uniqueFrames: AuroraMdlVector3Keyframe[] = [];
  frames.forEach((frame) => {
    const previous = uniqueFrames[uniqueFrames.length - 1];
    if (previous && previous.time === frame.time) {
      previous.value = frame.value;
      return;
    }
    uniqueFrames.push({ time: frame.time, value: [...frame.value] });
  });
  return uniqueFrames.length > 1 ? uniqueFrames : undefined;
}

function sanitizeOrientationKeyframes(value: unknown): AuroraMdlOrientationKeyframe[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const frames = value
    .map((entry): AuroraMdlOrientationKeyframe | null => {
      if (typeof entry !== "object" || entry === null) {
        return null;
      }
      const candidate = entry as { time?: unknown; value?: unknown };
      const orientation = sanitizeOrientation(candidate.value);
      if (
        typeof candidate.time !== "number" ||
        !Number.isFinite(candidate.time) ||
        candidate.time < 0 ||
        !orientation
      ) {
        return null;
      }
      return { time: candidate.time, value: orientation };
    })
    .filter((frame): frame is AuroraMdlOrientationKeyframe => frame !== null)
    .sort((left, right) => left.time - right.time);
  const uniqueFrames: AuroraMdlOrientationKeyframe[] = [];
  frames.forEach((frame) => {
    const previous = uniqueFrames[uniqueFrames.length - 1];
    if (previous && previous.time === frame.time) {
      previous.value = frame.value;
      return;
    }
    uniqueFrames.push({
      time: frame.time,
      value: {
        axis: [frame.value.axis[0], frame.value.axis[1], frame.value.axis[2]],
        angleRadians: frame.value.angleRadians
      }
    });
  });
  return uniqueFrames.length > 1 ? uniqueFrames : undefined;
}

function sanitizeColorKeyframes(value: unknown): AuroraMdlColorKeyframe[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const frames = value
    .map((entry): AuroraMdlColorKeyframe | null => {
      if (typeof entry !== "object" || entry === null) {
        return null;
      }
      const candidate = entry as { time?: unknown; value?: unknown };
      const color = sanitizeColor(candidate.value);
      if (
        typeof candidate.time !== "number" ||
        !Number.isFinite(candidate.time) ||
        candidate.time < 0 ||
        !color
      ) {
        return null;
      }
      return { time: candidate.time, value: color };
    })
    .filter((frame): frame is AuroraMdlColorKeyframe => frame !== null)
    .sort((left, right) => left.time - right.time);
  const uniqueFrames: AuroraMdlColorKeyframe[] = [];
  frames.forEach((frame) => {
    const previous = uniqueFrames[uniqueFrames.length - 1];
    if (previous && previous.time === frame.time) {
      previous.value = frame.value;
      return;
    }
    uniqueFrames.push({ time: frame.time, value: [...frame.value] });
  });
  return uniqueFrames.length > 1 ? uniqueFrames : undefined;
}

function sanitizeSimulationTimeline(value: unknown): AuroraMdlEmitterSimulationTimeline | undefined {
  if (typeof value !== "object" || value === null) {
    return undefined;
  }
  const source = value as Partial<Record<AuroraMdlEmitterSimulationTimelineKey, unknown>>;
  const timeline: AuroraMdlEmitterSimulationTimeline = {};
  AURORA_EMITTER_SIMULATION_TIMELINE_KEYS.forEach((key) => {
    const frames = sanitizeNumberKeyframes(source[key], {
      nonNegativeValue: AURORA_EMITTER_SIMULATION_NON_NEGATIVE_TIMELINE_KEYS.has(key)
    });
    if (frames) {
      timeline[key] = frames;
    }
  });
  return Object.keys(timeline).length > 0 ? timeline : undefined;
}

function sanitizeColorTimeline(value: unknown): AuroraMdlEmitterColorTimeline | undefined {
  if (typeof value !== "object" || value === null) {
    return undefined;
  }
  const source = value as Partial<Record<AuroraMdlEmitterColorTimelineKey, unknown>>;
  const timeline: AuroraMdlEmitterColorTimeline = {};
  (["colorStart", "colorMid", "colorEnd"] as const).forEach((key) => {
    const frames = sanitizeColorKeyframes(source[key]);
    if (frames) {
      timeline[key] = frames;
    }
  });
  return Object.keys(timeline).length > 0 ? timeline : undefined;
}

function buildAuroraQuaternionOrientation(
  quaternion: [number, number, number, number]
): AuroraMdlOrientation | undefined {
  const [x, y, z, w] = quaternion;
  const length = Math.hypot(w, x, y, z);
  if (!Number.isFinite(length) || length <= 1e-12) {
    return undefined;
  }
  const normalizedW = Math.max(-1, Math.min(1, w / length));
  const angleRadians = 2 * Math.acos(normalizedW);
  const axisScale = Math.sqrt(1 - normalizedW * normalizedW);
  const axis: [number, number, number] =
    axisScale > 1e-6
      ? [
          snapUnitAxisComponent(x / length / axisScale),
          snapUnitAxisComponent(y / length / axisScale),
          snapUnitAxisComponent(z / length / axisScale)
        ]
      : [1, 0, 0];
  return sanitizeOrientation({ axis, angleRadians });
}

function snapUnitAxisComponent(value: number): number {
  if (Math.abs(value) < 1e-12) {
    return 0;
  }
  if (Math.abs(value - 1) < 1e-12) {
    return 1;
  }
  if (Math.abs(value + 1) < 1e-12) {
    return -1;
  }
  return value;
}

function isLikelyAuroraBinaryModel(bytes: Buffer): boolean {
  return bytes.length >= AURORA_BINARY_MODEL_BASE && bytes.readUInt32LE(0) === 0;
}

function readAuroraBinaryUInt8(bytes: Buffer, offset: number): number | null {
  return offset >= 0 && offset + 1 <= bytes.length ? bytes.readUInt8(offset) : null;
}

function readAuroraBinaryUInt16(bytes: Buffer, offset: number): number | null {
  return offset >= 0 && offset + 2 <= bytes.length ? bytes.readUInt16LE(offset) : null;
}

function readAuroraBinaryInt16(bytes: Buffer, offset: number): number | null {
  return offset >= 0 && offset + 2 <= bytes.length ? bytes.readInt16LE(offset) : null;
}

function readAuroraBinaryUInt32(bytes: Buffer, offset: number): number | null {
  return offset >= 0 && offset + 4 <= bytes.length ? bytes.readUInt32LE(offset) : null;
}

function readAuroraBinaryFloat32(bytes: Buffer, offset: number): number | null {
  return offset >= 0 && offset + 4 <= bytes.length ? bytes.readFloatLE(offset) : null;
}

function readAuroraBinaryCString(bytes: Buffer, offset: number, length: number): string {
  if (offset < 0 || length < 1 || offset >= bytes.length) {
    return "";
  }
  const end = Math.min(bytes.length, offset + length);
  const zeroOffset = bytes.indexOf(0, offset);
  const sliceEnd = zeroOffset >= offset && zeroOffset < end ? zeroOffset : end;
  return bytes.toString("latin1", offset, sliceEnd);
}

function binaryControllerRow(
  property: string | number | symbol,
  rawToken: string | number | symbol,
  values: number[],
  binaryControllerType?: number,
  rowKind: "direct" | "key" | "bezier-key" = "direct"
): AuroraMdlControllerRow {
  return {
    property: String(property),
    rawToken: String(rawToken),
    rowKind,
    values,
    ...(binaryControllerType !== undefined ? { binaryControllerType } : {})
  };
}
