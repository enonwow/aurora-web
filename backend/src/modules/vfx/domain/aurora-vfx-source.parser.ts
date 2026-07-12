import {
  BLANK_CELL,
  parseAuroraTwoDaTable,
  type AuroraTwoDaCell as SharedAuroraTwoDaCell,
  type AuroraTwoDaDiagnostic as SharedAuroraTwoDaDiagnostic,
  type AuroraTwoDaDiagnosticSeverity as SharedAuroraTwoDaDiagnosticSeverity,
  type AuroraTwoDaParseOptions as SharedAuroraTwoDaParseOptions,
  type AuroraTwoDaRow as SharedAuroraTwoDaRow,
  type AuroraTwoDaSourceLayer,
  type AuroraTwoDaTable as SharedAuroraTwoDaTable
} from "../../../common/aurora/two-da/aurora-two-da-table";

export { BLANK_CELL, parseAuroraTwoDaTable };
export type AuroraVfxDiagnosticSeverity = SharedAuroraTwoDaDiagnosticSeverity;
export type AuroraVfxDiagnostic = SharedAuroraTwoDaDiagnostic;
export type AuroraTwoDaCell = SharedAuroraTwoDaCell;
export type AuroraTwoDaRow = SharedAuroraTwoDaRow;
export type AuroraTwoDaTable = SharedAuroraTwoDaTable;
export type AuroraTwoDaParseOptions = SharedAuroraTwoDaParseOptions;

export type AuroraVfxSourceParseOptions = Omit<SharedAuroraTwoDaParseOptions, "tableName">;
export type AuroraVfxTypeFd = "F" | "D" | "B" | "P" | string;
export type AuroraVfxPhaseKind = "impact" | "duration" | "cessation";
export type AuroraVfxProfileMismatchKind = "sef" | "duration_node" | "delay_duration_fx";

export interface AuroraVfxProfileMismatchSourceField {
  column: string;
  raw: string;
  value: string;
  reason: AuroraVfxProfileMismatchKind;
}

export interface AuroraVfxSourceRowBase<TSourceTable extends string> {
  sourceTable: TSourceTable;
  profile: string;
  sourceHash?: string;
  sourceLayer?: AuroraTwoDaSourceLayer;
  sourceObjectKey?: string;
  rowId: number;
  physicalLineNumber: number;
  label: string;
  rawCells: Record<string, string>;
  extraCells: string[];
  missingColumns: string[];
  profileMismatches: AuroraVfxProfileMismatchSourceField[];
  diagnostics: AuroraVfxDiagnostic[];
}

export interface AuroraVfxPhaseSourceRefs {
  phase: AuroraVfxPhaseKind;
  progFxRowId?: number;
  progFxRaw?: string;
  soundRef?: string;
  soundRaw?: string;
  modelNodeRefs: Record<string, string>;
  rawCells: Record<string, string>;
}

export interface AuroraVfxClientEventSource {
  eventKind: "shake_or_bump";
  rawCells: {
    ShakeType?: string;
    ShakeDelay?: string;
    ShakeDuration?: string;
  };
  shakeType?: number;
  shakeKind: "screen_bump" | "screen_shake" | "unknown";
  delaySeconds?: number;
  durationSeconds?: number;
  diagnostics: AuroraVfxDiagnostic[];
}

export interface AuroraVisualEffectSourceFacts {
  orientWithGroundRaw?: string;
  orientWithObjectRaw?: string;
  lowViolenceRaw?: string;
  lowQualityRaw?: string;
}

export interface AuroraVisualEffectSourceRow
  extends AuroraVfxSourceRowBase<"visualeffects.2da"> {
  typeFd?: AuroraVfxTypeFd;
  visualFacts: AuroraVisualEffectSourceFacts;
  phases: AuroraVfxPhaseSourceRefs[];
  clientEvents: AuroraVfxClientEventSource[];
}

export interface AuroraProgFxSourceRow extends AuroraVfxSourceRowBase<"progfx.2da"> {
  type?: number;
  typeRaw?: string;
  type4Light?: AuroraProgFxType4LightSource;
  params: Array<{
    column: string;
    raw: string;
    value?: string;
  }>;
}

export interface AuroraProgFxType4LightSource {
  proofStatus: "profile-gated-source-preserved-no-runtime-scheduling";
  animationRaw?: string;
  animation?: string;
  animationParameterStatus?: string;
  animationKind?: "light" | "vision";
  animationSymbolicColor?: string;
  animationTokenRadiusMeters?: number;
  animationTokenRadiusProofStatus?: "source-backed-progfx-param1-animation-token-radius";
  sourceMdlNodeName?: "AuroraLight01" | "AuroraLight02";
  sourceMdlAnimation?: string;
  sourceMdlColor?: { r: number; g: number; b: number };
  sourceMdlRadiusMeters?: number;
  sourceMdlRadiusFrames?: [number, number];
  sourceMdlColorSource?: string;
  sourceMdlColorProofStatus?: "source-family-backed-fx_light_clr-mdl-animation-rgb";
  sourceMdlRadiusSource?: string;
  sourceMdlRadiusProofStatus?: "source-family-backed-fx_light_clr-mdl-animation-radius";
  visionMode?: string;
  animationSemanticSource?: string;
  animationSpeedRaw?: string;
  animationSpeed?: number;
  animationSpeedParameterStatus?: string;
  castShadowsRaw?: string;
  castShadows?: boolean;
  castShadowParameterStatus?: string;
  priorityRaw?: string;
  priority?: number;
  priorityParameterStatus?: string;
  proximitySuppressionRaw?: string;
  proximitySuppression?: boolean;
  proximitySuppressionParameterStatus?: string;
  attachToSceneRaw?: string;
  attachToScene?: boolean;
  sceneAttachmentParameterStatus?: string;
  modelRaw?: string;
  modelRef?: string;
  modelParameterStatus?: string;
  unusedParam8Raw?: string;
  visionParameterStatus?: string;
  parameterSource: string;
  parameterPreservationProofSource: string;
  parameterPreservationProofStatus: string;
}

export interface AuroraProgFxType4TableSummary {
  sourceTable: "progfx.2da";
  proofStatus: "source-backed-progfx-type4-table-parameter-distribution-runtime-scheduler-blocked";
  rowCount: number;
  type4RowCount: number;
  itemLightNormalRowCount: number;
  itemLightFadeRowCount: number;
  nonItemType4RowCount: number;
  animationKindCounts: {
    light: number;
    vision: number;
    unknown: number;
  };
  castShadowsBooleanCounts: {
    true: number;
    false: number;
    unknown: number;
  };
  proximitySuppressionBooleanCounts: {
    true: number;
    false: number;
    unknown: number;
  };
  attachToSceneBooleanCounts: {
    true: number;
    false: number;
    unknown: number;
  };
  castShadowsRawCounts: Record<string, number>;
  priorityRawCounts: Record<string, number>;
  proximitySuppressionRawCounts: Record<string, number>;
  attachToSceneRawCounts: Record<string, number>;
  modelCounts: Record<string, number>;
  lightTokenRadiusCounts: Record<string, number>;
  sampleRows: AuroraProgFxType4SummaryRow[];
  nonItemRows: AuroraProgFxType4SummaryRow[];
  nonItemCastShadowRows: AuroraProgFxType4SummaryRow[];
  proximitySuppressionRows: AuroraProgFxType4SummaryRow[];
  attachToSceneRows: AuroraProgFxType4SummaryRow[];
  visionRows: AuroraProgFxType4SummaryRow[];
  remainingBlockedSemantics: string[];
}

export interface AuroraProgFxType4SummaryRow {
  rowId: number;
  label: string;
  animation?: string;
  animationKind?: "light" | "vision";
  castShadowsRaw?: string;
  priorityRaw?: string;
  proximitySuppressionRaw?: string;
  attachToSceneRaw?: string;
  modelRef?: string;
}

export type AuroraProgFxType4OwnerKind = "item-light" | "non-item";

export interface AuroraProgFxType4VisualEffectOwnerRow {
  visualEffectRowId: number;
  visualEffectLabel: string;
  typeFd?: AuroraVfxTypeFd;
  phase: AuroraVfxPhaseKind;
  progFxRowId: number;
  progFxLabel: string;
  ownerKind: AuroraProgFxType4OwnerKind;
  animation?: string;
  animationKind?: "light" | "vision";
  castShadowsRaw?: string;
  priorityRaw?: string;
  proximitySuppressionRaw?: string;
  attachToSceneRaw?: string;
  modelRef?: string;
}

export interface AuroraProgFxType4VisualEffectOwnerSummary {
  sourceTable: "visualeffects.2da";
  linkedProgFxTable: "progfx.2da";
  proofStatus: "source-backed-visualeffects-progfx-type4-owner-phase-map-runtime-scheduler-blocked";
  visualEffectRowCount: number;
  type4OwnerPhaseCount: number;
  itemLightOwnerPhaseCount: number;
  nonItemOwnerPhaseCount: number;
  nonItemVisionOwnerPhaseCount: number;
  nonItemCastShadowOwnerPhaseCount: number;
  nonItemAttachToSceneOwnerPhaseCount: number;
  nonItemProximitySuppressionOwnerPhaseCount: number;
  missingProgFxReferenceCount: number;
  nonType4ProgFxReferenceCount: number;
  ownerPhaseCounts: Record<AuroraVfxPhaseKind, number>;
  nonItemOwnerRows: AuroraProgFxType4VisualEffectOwnerRow[];
  itemLightOwnerRows: AuroraProgFxType4VisualEffectOwnerRow[];
  remainingBlockedSemantics: string[];
}

const PROGFX_TYPE4_PARAMETER_SOURCE =
  "retail progfx.2da Type 4 Param1 animation, Param2 speed, Param3 cast shadows, Param4 priority, Param5 proximity suppression, Param6 attach to scene, Param7 model";
const PROGFX_TYPE4_PARAMETER_PRESERVATION_PROOF_SOURCE =
  "nwn_base.key progfx.2da selected rows 300..333 and 350..377 preserve Type 4 Param1..Param7; backend parser keeps raw Param1..Param8 cells before runtime scheduling";
const PROGFX_TYPE4_PARAMETER_PRESERVATION_PROOF_STATUS =
  "source-backed-progfx-type4-param1-param8-raw-preserved";
const PROGFX_TYPE4_PARAM1_ANIMATION_STATUS =
  "source-backed-progfx-type4-param1-animation-token-preserved";
const PROGFX_TYPE4_PARAM2_SPEED_STATUS =
  "source-backed-progfx-type4-param2-animation-speed-preserved-runtime-playback-blocked";
const PROGFX_TYPE4_PARAM3_CAST_SHADOW_STATUS =
  "source-backed-progfx-type4-param3-cast-shadows-preserved-item-toggle-known-non-item-vanilla-cast-shadow-absent";
const PROGFX_TYPE4_PARAM4_PRIORITY_STATUS =
  "docs-backed-progfx-type4-param4-priority-lower-value-wins";
const PROGFX_TYPE4_PARAM5_PROXIMITY_STATUS =
  "docs-backed-progfx-type4-param5-proximity-suppression-near-other-light";
const PROGFX_TYPE4_PARAM6_ATTACH_STATUS =
  "docs-backed-progfx-type4-param6-attach-to-scene-removes-scene-lights";
const PROGFX_TYPE4_PARAM7_MODEL_STATUS =
  "source-backed-progfx-type4-param7-model-ref-preserved-client-loader-path-source-backed";
const PROGFX_TYPE4_PARAM1_VISION_STATUS =
  "docs-backed-progfx-type4-param1-vision-token-param4-priority";

const PROGFX_TYPE4_FX_LIGHT_CLR_COLOR_SOURCE =
  "nwn_base.key fx_light_clr.mdl AuroraLight01 animation light-color controller type 76";
const PROGFX_TYPE4_FX_LIGHT_CLR_RADIUS_SOURCE =
  "nwn_base.key fx_light_clr.mdl AuroraLight01 animation radius controller type 88 frames 0 -> 13.3";
const PROGFX_TYPE4_FX_LIGHT_CLR_VISION_COLOR_SOURCE =
  "nwn_base.key fx_light_clr.mdl AuroraLight02 vision animation light-color controller type 76";
const PROGFX_TYPE4_FX_LIGHT_CLR_VISION_RADIUS_SOURCE =
  "nwn_base.key fx_light_clr.mdl AuroraLight02 vision animation radius controller type 88";
const PROGFX_TYPE4_FX_LIGHT_CLR_RADIUS_METERS = 13.3;
const PROGFX_TYPE4_FX_LIGHT_CLR_RADIUS_FRAMES: [number, number] = [
  0,
  PROGFX_TYPE4_FX_LIGHT_CLR_RADIUS_METERS
];

interface ProgFxType4FxLightClrFacts {
  readonly symbolicColor: string;
  readonly sourceMdlAnimation: string;
  readonly color: { r: number; g: number; b: number };
}

const PROGFX_TYPE4_FX_LIGHT_CLR_FACTS: Readonly<Record<string, ProgFxType4FxLightClrFacts>> = {
  blue_5m: { symbolicColor: "Blue", sourceMdlAnimation: "Blue_5m", color: { r: 0.5, g: 0.5, b: 1 } },
  blue_10m: { symbolicColor: "Blue", sourceMdlAnimation: "Blue_10m", color: { r: 0.75, g: 0.75, b: 1.25 } },
  blue_15m: { symbolicColor: "Blue", sourceMdlAnimation: "Blue_15m", color: { r: 1, g: 1, b: 1.5 } },
  blue_20m: { symbolicColor: "Blue", sourceMdlAnimation: "Blue_20m", color: { r: 1.25, g: 1.25, b: 1.75 } },
  yello_5m: { symbolicColor: "Yellow", sourceMdlAnimation: "Yello_5m", color: { r: 1, g: 0.75, b: 0.25 } },
  yello_10m: { symbolicColor: "Yellow", sourceMdlAnimation: "Yello_10m", color: { r: 1.25, g: 1, b: 0.5 } },
  yello_15m: { symbolicColor: "Yellow", sourceMdlAnimation: "Yello_15m", color: { r: 1.5, g: 1.25, b: 0.75 } },
  yello_20m: { symbolicColor: "Yellow", sourceMdlAnimation: "Yello_20m", color: { r: 1.75, g: 1.5, b: 1 } },
  yellow_5m: { symbolicColor: "Yellow", sourceMdlAnimation: "Yello_5m", color: { r: 1, g: 0.75, b: 0.25 } },
  yellow_10m: { symbolicColor: "Yellow", sourceMdlAnimation: "Yello_10m", color: { r: 1.25, g: 1, b: 0.5 } },
  yellow_15m: { symbolicColor: "Yellow", sourceMdlAnimation: "Yello_15m", color: { r: 1.5, g: 1.25, b: 0.75 } },
  yellow_20m: { symbolicColor: "Yellow", sourceMdlAnimation: "Yello_20m", color: { r: 1.75, g: 1.5, b: 1 } },
  purp_5m: { symbolicColor: "Purple", sourceMdlAnimation: "Purp_5m", color: { r: 1, g: 0.5, b: 1 } },
  purp_10m: { symbolicColor: "Purple", sourceMdlAnimation: "Purp_10m", color: { r: 1.25, g: 0.75, b: 1.25 } },
  purp_15m: { symbolicColor: "Purple", sourceMdlAnimation: "Purp_15m", color: { r: 1.5, g: 1, b: 1.5 } },
  purp_20m: { symbolicColor: "Purple", sourceMdlAnimation: "Purp_20m", color: { r: 1.75, g: 1.25, b: 1.75 } },
  purple_5m: { symbolicColor: "Purple", sourceMdlAnimation: "Purp_5m", color: { r: 1, g: 0.5, b: 1 } },
  purple_10m: { symbolicColor: "Purple", sourceMdlAnimation: "Purp_10m", color: { r: 1.25, g: 0.75, b: 1.25 } },
  purple_15m: { symbolicColor: "Purple", sourceMdlAnimation: "Purp_15m", color: { r: 1.5, g: 1, b: 1.5 } },
  purple_20m: { symbolicColor: "Purple", sourceMdlAnimation: "Purp_20m", color: { r: 1.75, g: 1.25, b: 1.75 } },
  red_5m: { symbolicColor: "Red", sourceMdlAnimation: "Red_5m", color: { r: 1, g: 0.35, b: 0.2 } },
  red_10m: { symbolicColor: "Red", sourceMdlAnimation: "Red_10m", color: { r: 1.25, g: 0.5, b: 0.3 } },
  red_15m: { symbolicColor: "Red", sourceMdlAnimation: "Red_15m", color: { r: 1.5, g: 0.66, b: 0.4 } },
  red_20m: { symbolicColor: "Red", sourceMdlAnimation: "Red_20m", color: { r: 1.75, g: 0.75, b: 0.5 } },
  gren_5m: { symbolicColor: "Green", sourceMdlAnimation: "Gren_5m", color: { r: 0.5, g: 1, b: 0.25 } },
  gren_10m: { symbolicColor: "Green", sourceMdlAnimation: "Gren_10m", color: { r: 0.75, g: 1.25, b: 0.5 } },
  gren_15m: { symbolicColor: "Green", sourceMdlAnimation: "Gren_15m", color: { r: 1, g: 1.5, b: 0.75 } },
  gren_20m: { symbolicColor: "Green", sourceMdlAnimation: "Gren_20m", color: { r: 1.25, g: 1.75, b: 1 } },
  green_5m: { symbolicColor: "Green", sourceMdlAnimation: "Gren_5m", color: { r: 0.5, g: 1, b: 0.25 } },
  green_10m: { symbolicColor: "Green", sourceMdlAnimation: "Gren_10m", color: { r: 0.75, g: 1.25, b: 0.5 } },
  green_15m: { symbolicColor: "Green", sourceMdlAnimation: "Gren_15m", color: { r: 1, g: 1.5, b: 0.75 } },
  green_20m: { symbolicColor: "Green", sourceMdlAnimation: "Gren_20m", color: { r: 1.25, g: 1.75, b: 1 } },
  orng_5m: { symbolicColor: "Orange", sourceMdlAnimation: "Orng_5m", color: { r: 1, g: 0.55, b: 0.225 } },
  orng_10m: { symbolicColor: "Orange", sourceMdlAnimation: "Orng_10m", color: { r: 1.25, g: 0.75, b: 0.4 } },
  orng_15m: { symbolicColor: "Orange", sourceMdlAnimation: "Orng_15m", color: { r: 1.5, g: 0.9, b: 0.55 } },
  orng_20m: { symbolicColor: "Orange", sourceMdlAnimation: "Orng_20m", color: { r: 1.75, g: 1.15, b: 0.75 } },
  orange_5m: { symbolicColor: "Orange", sourceMdlAnimation: "Orng_5m", color: { r: 1, g: 0.55, b: 0.225 } },
  orange_10m: { symbolicColor: "Orange", sourceMdlAnimation: "Orng_10m", color: { r: 1.25, g: 0.75, b: 0.4 } },
  orange_15m: { symbolicColor: "Orange", sourceMdlAnimation: "Orng_15m", color: { r: 1.5, g: 0.9, b: 0.55 } },
  orange_20m: { symbolicColor: "Orange", sourceMdlAnimation: "Orng_20m", color: { r: 1.75, g: 1.15, b: 0.75 } },
  white_5m: { symbolicColor: "White", sourceMdlAnimation: "white_5m", color: { r: 1, g: 1, b: 1 } },
  white_10m: { symbolicColor: "White", sourceMdlAnimation: "white_10m", color: { r: 1.25, g: 1.25, b: 1.25 } },
  white_15m: { symbolicColor: "White", sourceMdlAnimation: "white_15m", color: { r: 1.5, g: 1.5, b: 1.5 } },
  white_20m: { symbolicColor: "White", sourceMdlAnimation: "white_20m", color: { r: 1.75, g: 1.75, b: 1.75 } }
};

const PROGFX_TYPE4_FX_LIGHT_CLR_VISION_FACTS: Readonly<Record<string, ProgFxType4FxLightClrFacts & { radius: number }>> = {
  blind_vision: {
    symbolicColor: "",
    sourceMdlAnimation: "Blind_Vision",
    color: { r: 0.3, g: 0.3, b: 0.3 },
    radius: 7
  },
  low_light_vision: {
    symbolicColor: "",
    sourceMdlAnimation: "Low_Light_Vision",
    color: { r: 0.3, g: 0.3, b: 0.4 },
    radius: 11
  },
  dark_vision: {
    symbolicColor: "",
    sourceMdlAnimation: "Dark_Vision",
    color: { r: 0.3, g: 0.3, b: 0.4 },
    radius: 15
  },
  ultra_vision: {
    symbolicColor: "",
    sourceMdlAnimation: "Ultra_Vision",
    color: { r: 0.7, g: 0.5, b: 1 },
    radius: 15
  }
};

export interface AuroraAoeSourceRow extends AuroraVfxSourceRowBase<"vfx_persistent.2da"> {
  shapeRaw?: string;
  radiusRaw?: string;
  widthRaw?: string;
  lengthRaw?: string;
  visualFxRaw?: string;
  durationVfxRaw?: string;
  eventScripts: {
    onEnterRaw?: string;
    onExitRaw?: string;
    heartbeatRaw?: string;
  };
  modelFootprintRefs: Record<string, string>;
  soundFootprintRefs: Record<string, string>;
}

export interface AuroraItemPropertyVisualSourceRow
  extends AuroraVfxSourceRowBase<"iprp_visualfx.2da"> {
  nameRaw?: string;
  modelSuffixRaw?: string;
  subtypeProfileRaw?: string;
  profileData: Record<string, string>;
}

export interface AuroraSpellVisualSourceRow extends AuroraVfxSourceRowBase<"spells.2da"> {
  visualSlots: Record<string, string>;
  projectileSlots: Record<string, string>;
  scriptSlots: Record<string, string>;
  soundSlots: Record<string, string>;
}

export interface AuroraDamageHitVisualSourceRow
  extends AuroraVfxSourceRowBase<"damagehitvisual.2da"> {
  visualEffectIdRaw?: string;
  rangedEffectIdRaw?: string;
}

export interface AuroraCatalogVfxPreviewSourceBoundaryInput {
  vfxPreset?: string;
  placeableSubtype?: string;
  rendererPreset?: string;
}

export type AuroraVfxEffectConstructorKind = "EffectVisualEffect" | "EffectBeam";
export type AuroraVfxApplicationMode = "object" | "location";
export type AuroraVfxDurationType = "instant" | "temporary" | "permanent";

export interface AuroraVfxVector3 {
  x: number;
  y: number;
  z: number;
}

export interface AuroraVfxEeTransformTuple {
  scale?: number;
  translate?: AuroraVfxVector3;
  rotate?: AuroraVfxVector3;
}

export type AuroraVfxGetEffectValue =
  | string
  | number
  | boolean
  | AuroraVfxVector3
  | null;

export interface AuroraVfxGetEffectObservation {
  accessor:
    | "GetEffectInteger"
    | "GetEffectFloat"
    | "GetEffectVector"
    | "GetEffectObject"
    | "GetEffectCreator"
    | "GetEffectType"
    | string;
  index?: number;
  valueType?: "integer" | "float" | "vector" | "object" | "string" | "boolean" | "unknown";
  value?: AuroraVfxGetEffectValue;
  profile?: string;
  provenance?: string;
  diagnostics?: AuroraVfxDiagnostic[];
}

export interface AuroraVfxEffectInstance {
  constructorKind: AuroraVfxEffectConstructorKind;
  sourceRowId: number;
  applicationMode: AuroraVfxApplicationMode;
  durationType?: AuroraVfxDurationType;
  durationSeconds?: number;
  missFlag?: boolean;
  eeTransform?: AuroraVfxEeTransformTuple;
  targetRef?: string;
  effectorRef?: string;
  creatorRef?: string;
  bodyNode?: string;
  getEffectObservations?: AuroraVfxGetEffectObservation[];
  diagnostics?: AuroraVfxDiagnostic[];
}

export type AuroraVfxEffectInstanceContext = AuroraVfxEffectInstance;

export interface AuroraVfxPhaseScheduleLanes {
  modelNodeRefs: Partial<Record<AuroraVfxPhaseKind, Record<string, string>>>;
  progFxRefs: Partial<Record<AuroraVfxPhaseKind, string>>;
  soundRefs: Partial<Record<AuroraVfxPhaseKind, string>>;
  clientEvents: AuroraVfxClientEventSource[];
}

export interface AuroraVfxPhaseSchedule {
  sourceRowId: number;
  sourceLabel: string;
  status: "source_only" | "ready";
  effectInstance?: AuroraVfxEffectInstance;
  context?: AuroraVfxEffectInstanceContext;
  phases: AuroraVfxPhaseSourceRefs[];
  lanes: AuroraVfxPhaseScheduleLanes;
  clientEvents: AuroraVfxClientEventSource[];
  diagnostics: AuroraVfxDiagnostic[];
}

export interface AuroraVfxEffectInstanceBuildResult {
  effectInstance?: AuroraVfxEffectInstance;
  diagnostics: AuroraVfxDiagnostic[];
}

const VISUALEFFECTS_REQUIRED_COLUMNS = ["Label", "Type_FD"];
const PROGFX_REQUIRED_COLUMNS = ["Label", "Type"];
const VFX_PERSISTENT_REQUIRED_COLUMNS = ["LABEL", "SHAPE"];
const IPRP_VISUALFX_REQUIRED_COLUMNS = ["Label", "ModelSuffix"];
const SPELLS_REQUIRED_COLUMNS = ["Label"];
const DAMAGEHITVISUAL_REQUIRED_COLUMNS = ["Label", "VisualEffectID", "RangedEffectID"];

const VISUALEFFECT_SOURCE_FACT_COLUMNS = [
  "OrientWithGround",
  "OrientWithObject",
  "LowViolence",
  "LowQuality"
] as const;

const IMPACT_MODEL_COLUMNS = [
  "Imp_HeadCon_Node",
  "Imp_Impact_Node",
  "Imp_Root_S_Node",
  "Imp_Root_M_Node",
  "Imp_Root_L_Node",
  "Imp_Root_H_Node"
];

const CESSATION_MODEL_COLUMNS = [
  "Ces_HeadCon_Node",
  "Ces_Impact_Node",
  "Ces_Root_S_Node",
  "Ces_Root_M_Node",
  "Ces_Root_L_Node",
  "Ces_Root_H_Node"
];

const AOE_MODEL_FOOTPRINT_COLUMNS = [
  "MODEL01",
  "MODEL02",
  "MODEL03",
  "MODELMIN01",
  "MODELMIN02",
  "MODELMIN03"
];

const AOE_SOUND_FOOTPRINT_COLUMNS = [
  "SoundImpact",
  "SoundDuration",
  "SoundCessation",
  "SoundOneShot",
  "SoundOneShotPercentage"
];

function diagnostic(
  code: string,
  severity: AuroraVfxDiagnosticSeverity,
  message: string
): AuroraVfxDiagnostic {
  return { code, severity, message };
}

function isBlankCell(value: string | undefined): boolean {
  return !value || value === BLANK_CELL;
}

function resolveParseOptions(
  tableName: string,
  profileOrOptions: string | AuroraVfxSourceParseOptions = "unknown"
): SharedAuroraTwoDaParseOptions & { profile: string } {
  if (typeof profileOrOptions === "string") {
    return { tableName, profile: profileOrOptions };
  }
  return {
    ...profileOrOptions,
    tableName,
    profile: profileOrOptions.profile ?? "unknown"
  };
}

function toRawCellMap(row: AuroraTwoDaRow): Record<string, string> {
  return Object.fromEntries(row.cells.map((cell) => [cell.column, cell.raw]));
}

function parseNumberCell(value: string | undefined): number | undefined {
  if (isBlankCell(value)) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseIntCell(value: string | undefined): number | undefined {
  const parsed = parseNumberCell(value);
  if (typeof parsed !== "number" || !Number.isInteger(parsed)) {
    return undefined;
  }
  return parsed;
}

function getRaw(row: AuroraTwoDaRow, column: string): string | undefined {
  return row.cellsByColumn[column]?.raw;
}

function getCell(row: AuroraTwoDaRow, column: string): AuroraTwoDaCell | undefined {
  return row.cellsByColumn[column];
}

function getValue(row: AuroraTwoDaRow, column: string): string | undefined {
  return row.cellsByColumn[column]?.value;
}

function getNonBlankRaw(row: AuroraTwoDaRow, column: string): string | undefined {
  const cell = getCell(row, column);
  return cell && !cell.blank ? cell.raw : undefined;
}

function getNonBlankRawFromAny(
  row: AuroraTwoDaRow,
  columns: readonly string[]
): string | undefined {
  for (const column of columns) {
    const raw = getNonBlankRaw(row, column);
    if (raw) {
      return raw;
    }
  }
  return undefined;
}

function getLabel(row: AuroraTwoDaRow, columns: readonly string[] = ["Label"]): string {
  for (const column of columns) {
    const cell = getCell(row, column);
    if (cell && !cell.blank) {
      return cell.value;
    }
  }
  return BLANK_CELL;
}

function sourceRowBase<TSourceTable extends string>(
  sourceTable: TSourceTable,
  profile: string,
  row: AuroraTwoDaRow,
  label: string,
  diagnostics: AuroraVfxDiagnostic[]
): AuroraVfxSourceRowBase<TSourceTable> {
  const source = row.source;
  const profileMismatches = collectProfileMismatches(row);
  const mismatchDiagnostics = profileMismatches.map((field) =>
    diagnostic(
      "VFX_SOURCE_PROFILE_MISMATCH_FIELD_PRESERVED",
      "warn",
      `${sourceTable} column ${field.column} was preserved as profile-specific source data and was not promoted to Aurora/NWN1 runtime semantics.`
    )
  );

  return {
    sourceTable,
    profile,
    ...(source?.hash ? { sourceHash: source.hash } : {}),
    ...(source?.layer ? { sourceLayer: source.layer } : {}),
    ...(source?.objectKey ? { sourceObjectKey: source.objectKey } : {}),
    rowId: row.rowId,
    physicalLineNumber: row.physicalLineNumber,
    label,
    rawCells: toRawCellMap(row),
    extraCells: row.extraCells,
    missingColumns: row.missingColumns,
    profileMismatches,
    diagnostics: [...diagnostics, ...mismatchDiagnostics]
  };
}

function collectProfileMismatches(row: AuroraTwoDaRow): AuroraVfxProfileMismatchSourceField[] {
  const fields: AuroraVfxProfileMismatchSourceField[] = [];
  for (const cell of row.cells) {
    if (cell.blank) {
      continue;
    }
    const reason = resolveProfileMismatchReason(cell);
    if (!reason) {
      continue;
    }
    fields.push({
      column: cell.column,
      raw: cell.raw,
      value: cell.value,
      reason
    });
  }
  return fields;
}

function resolveProfileMismatchReason(
  cell: AuroraTwoDaCell
): AuroraVfxProfileMismatchKind | undefined {
  if (/^Dur_.*_Node$/iu.test(cell.column)) {
    return "duration_node";
  }
  if (/^DelayDurationFX$/iu.test(cell.column)) {
    return "delay_duration_fx";
  }
  if (/sef/iu.test(cell.column) || /\.sef$/iu.test(cell.value)) {
    return "sef";
  }
  return undefined;
}

function nonBlankCellsByColumn(
  row: AuroraTwoDaRow,
  columns: readonly string[]
): Record<string, string> {
  const output: Record<string, string> = {};
  for (const column of columns) {
    const raw = getNonBlankRaw(row, column);
    if (raw) {
      output[column] = raw;
    }
  }
  return output;
}

function nonBlankCellsMatching(
  row: AuroraTwoDaRow,
  predicate: (column: string) => boolean
): Record<string, string> {
  const output: Record<string, string> = {};
  for (const cell of row.cells) {
    if (!cell.blank && predicate(cell.column)) {
      output[cell.column] = cell.raw;
    }
  }
  return output;
}

function assertRequiredColumns(
  table: AuroraTwoDaTable,
  requiredColumns: string[],
  code: string
): AuroraVfxDiagnostic[] {
  const header = new Set(table.header);
  const missing = requiredColumns.filter((column) => !header.has(column));
  if (missing.length === 0) {
    return [];
  }
  return [
    diagnostic(
      code,
      "error",
      `Table ${table.tableName} is missing required column(s): ${missing.join(", ")}.`
    )
  ];
}

function buildPhase(
  row: AuroraTwoDaRow,
  phase: AuroraVfxPhaseKind,
  columns: {
    progFx?: string;
    sound?: string;
    modelColumns: string[];
  }
): AuroraVfxPhaseSourceRefs {
  const rawCells: Record<string, string> = {};
  const modelNodeRefs: Record<string, string> = {};

  columns.modelColumns.forEach((column) => {
    const raw = getRaw(row, column);
    if (raw !== undefined) {
      rawCells[column] = raw;
    }
    const modelRef = getNonBlankRaw(row, column);
    if (modelRef) {
      modelNodeRefs[column] = modelRef;
    }
  });

  const progFxRaw = columns.progFx ? getRaw(row, columns.progFx) : undefined;
  if (columns.progFx && progFxRaw !== undefined) {
    rawCells[columns.progFx] = progFxRaw;
  }
  const soundRaw = columns.sound ? getRaw(row, columns.sound) : undefined;
  if (columns.sound && soundRaw !== undefined) {
    rawCells[columns.sound] = soundRaw;
  }

  return {
    phase,
    progFxRowId: parseIntCell(progFxRaw),
    progFxRaw: isBlankCell(progFxRaw) ? undefined : progFxRaw,
    soundRef: isBlankCell(soundRaw) ? undefined : soundRaw,
    soundRaw: isBlankCell(soundRaw) ? undefined : soundRaw,
    modelNodeRefs,
    rawCells
  };
}

function hasPhasePayload(phase: AuroraVfxPhaseSourceRefs): boolean {
  return (
    typeof phase.progFxRowId === "number" ||
    Boolean(phase.progFxRaw) ||
    Boolean(phase.soundRef) ||
    Object.keys(phase.modelNodeRefs).length > 0
  );
}

function buildClientEvents(row: AuroraTwoDaRow): AuroraVfxClientEventSource[] {
  const shakeTypeRaw = getRaw(row, "ShakeType");
  const shakeDelayRaw = getRaw(row, "ShakeDelay");
  const shakeDurationRaw = getRaw(row, "ShakeDuration");
  if (
    isBlankCell(shakeTypeRaw) &&
    isBlankCell(shakeDelayRaw) &&
    isBlankCell(shakeDurationRaw)
  ) {
    return [];
  }

  const shakeType = parseIntCell(shakeTypeRaw);
  const delaySeconds = parseNumberCell(shakeDelayRaw);
  const durationSeconds = parseNumberCell(shakeDurationRaw);
  const shakeKind =
    shakeType === 1 ? "screen_bump" : shakeType === 2 ? "screen_shake" : "unknown";
  const diagnostics = [
    diagnostic(
      "VFX_2DA_SHAKE_CLIENT_EVENT_UNMAPPED",
      "warn",
      "Shake/bump cells were preserved as a client-event source; runtime camera path is not mapped."
    )
  ];

  if (shakeKind === "unknown") {
    diagnostics.push(
      diagnostic(
        "VFX_2DA_SHAKE_TYPE_ENUM_PROFILE_REQUIRED",
        "warn",
        "ShakeType is outside the selected 0/1/2 profile map."
      )
    );
  }

  return [
    {
      eventKind: "shake_or_bump",
      rawCells: {
        ...(shakeTypeRaw !== undefined ? { ShakeType: shakeTypeRaw } : {}),
        ...(shakeDelayRaw !== undefined ? { ShakeDelay: shakeDelayRaw } : {}),
        ...(shakeDurationRaw !== undefined ? { ShakeDuration: shakeDurationRaw } : {})
      },
      shakeType,
      shakeKind,
      delaySeconds,
      durationSeconds,
      diagnostics
    }
  ];
}

export function parseAuroraVisualEffectsTwoDa(
  input: Buffer | string,
  profileOrOptions: string | AuroraVfxSourceParseOptions = "unknown"
): {
  table: AuroraTwoDaTable;
  rows: AuroraVisualEffectSourceRow[];
  diagnostics: AuroraVfxDiagnostic[];
} {
  const parseOptions = resolveParseOptions("visualeffects.2da", profileOrOptions);
  const table = parseAuroraTwoDaTable(input, parseOptions);
  const profile = parseOptions.profile;
  const diagnostics = [
    ...table.diagnostics,
    ...assertRequiredColumns(
      table,
      VISUALEFFECTS_REQUIRED_COLUMNS,
      "VFX_2DA_VISUALEFFECTS_HEADER_REQUIRED"
    )
  ];

  const rows = table.rows.map((row): AuroraVisualEffectSourceRow => {
    const rowDiagnostics: AuroraVfxDiagnostic[] = [];
    const label = getLabel(row);
    const typeFdRaw = getNonBlankRaw(row, "Type_FD");
    const phases = [
      buildPhase(row, "impact", {
        progFx: "ProgFX_Impact",
        sound: "SoundImpact",
        modelColumns: IMPACT_MODEL_COLUMNS
      }),
      buildPhase(row, "duration", {
        progFx: "ProgFX_Duration",
        sound: "SoundDuration",
        modelColumns: []
      }),
      buildPhase(row, "cessation", {
        progFx: "ProgFX_Cessation",
        sound: "SoundCessastion",
        modelColumns: CESSATION_MODEL_COLUMNS
      })
    ];
    const clientEvents = buildClientEvents(row);
    const soundImpact = getNonBlankRaw(row, "SoundImpact");

    if (/screenshake|screenbump/iu.test(soundImpact ?? "") && clientEvents.length === 0) {
      rowDiagnostics.push(
        diagnostic(
          "VFX_2DA_SCREENBUMP_SOUND_NOT_SHAKETYPE",
          "warn",
          "Screen-ish SoundImpact is not enough to create a shake/bump client event."
        )
      );
    }

    if (!typeFdRaw && label !== BLANK_CELL) {
      rowDiagnostics.push(
        diagnostic(
          "VFX_2DA_TYPE_FD_MISSING_FOR_LABELLED_ROW",
          "warn",
          "Labelled visualeffects.2da row has no Type_FD; preserve as source-only data."
        )
      );
    }

    return {
      ...sourceRowBase("visualeffects.2da", profile, row, label, rowDiagnostics),
      typeFd: typeFdRaw,
      visualFacts: {
        orientWithGroundRaw: getNonBlankRaw(row, VISUALEFFECT_SOURCE_FACT_COLUMNS[0]),
        orientWithObjectRaw: getNonBlankRaw(row, VISUALEFFECT_SOURCE_FACT_COLUMNS[1]),
        lowViolenceRaw: getNonBlankRaw(row, VISUALEFFECT_SOURCE_FACT_COLUMNS[2]),
        lowQualityRaw: getNonBlankRaw(row, VISUALEFFECT_SOURCE_FACT_COLUMNS[3])
      },
      phases: phases.filter(hasPhasePayload),
      clientEvents
    };
  });

  return { table, rows, diagnostics };
}

export function parseAuroraProgFxTwoDa(
  input: Buffer | string,
  profileOrOptions: string | AuroraVfxSourceParseOptions = "unknown"
): {
  table: AuroraTwoDaTable;
  rows: AuroraProgFxSourceRow[];
  diagnostics: AuroraVfxDiagnostic[];
} {
  const parseOptions = resolveParseOptions("progfx.2da", profileOrOptions);
  const table = parseAuroraTwoDaTable(input, parseOptions);
  const profile = parseOptions.profile;
  const diagnostics = [
    ...table.diagnostics,
    ...assertRequiredColumns(table, PROGFX_REQUIRED_COLUMNS, "VFX_2DA_PROGFX_HEADER_REQUIRED")
  ];

  const rows = table.rows.map((row): AuroraProgFxSourceRow => {
    const typeRaw = getRaw(row, "Type");
    const type = parseIntCell(typeRaw);
    const params = table.header
      .filter((column) => /^Param\d+$/u.test(column))
      .map((column) => {
        const raw = getRaw(row, column) ?? BLANK_CELL;
        return {
          column,
          raw,
          ...(isBlankCell(raw) ? {} : { value: getValue(row, column) ?? raw })
        };
      });

    return {
      ...sourceRowBase(
        "progfx.2da",
        profile,
        row,
        getLabel(row),
        buildProgFxRowDiagnostics(type)
      ),
      type,
      typeRaw: isBlankCell(typeRaw) ? undefined : typeRaw,
      ...(type === 4 ? { type4Light: buildProgFxType4LightSource(row) } : {}),
      params
    };
  });

  return { table, rows, diagnostics };
}

export function summarizeAuroraProgFxType4Rows(
  rows: readonly AuroraProgFxSourceRow[],
  sampleLimit = 16
): AuroraProgFxType4TableSummary {
  const type4Rows = rows.filter((row) => row.type === 4);
  const animationKindCounts = { light: 0, vision: 0, unknown: 0 };
  const castShadowsBooleanCounts = { true: 0, false: 0, unknown: 0 };
  const proximitySuppressionBooleanCounts = { true: 0, false: 0, unknown: 0 };
  const attachToSceneBooleanCounts = { true: 0, false: 0, unknown: 0 };
  const castShadowsRawCounts: Record<string, number> = {};
  const priorityRawCounts: Record<string, number> = {};
  const proximitySuppressionRawCounts: Record<string, number> = {};
  const attachToSceneRawCounts: Record<string, number> = {};
  const modelCounts: Record<string, number> = {};
  const lightTokenRadiusCounts: Record<string, number> = {};
  let itemLightNormalRowCount = 0;
  let itemLightFadeRowCount = 0;
  const nonItemRows: AuroraProgFxSourceRow[] = [];
  const nonItemCastShadowRows: AuroraProgFxSourceRow[] = [];
  const proximitySuppressionRows: AuroraProgFxSourceRow[] = [];
  const attachToSceneRows: AuroraProgFxSourceRow[] = [];
  const visionRows: AuroraProgFxSourceRow[] = [];

  for (const row of type4Rows) {
    const type4 = row.type4Light;
    const animationKind = type4?.animationKind;
    if (animationKind === "light") {
      animationKindCounts.light += 1;
    } else if (animationKind === "vision") {
      animationKindCounts.vision += 1;
    } else {
      animationKindCounts.unknown += 1;
    }

    incrementBooleanCount(castShadowsBooleanCounts, type4?.castShadows);
    incrementBooleanCount(proximitySuppressionBooleanCounts, type4?.proximitySuppression);
    incrementBooleanCount(attachToSceneBooleanCounts, type4?.attachToScene);
    incrementCount(castShadowsRawCounts, type4?.castShadowsRaw);
    incrementCount(priorityRawCounts, type4?.priorityRaw);
    incrementCount(proximitySuppressionRawCounts, type4?.proximitySuppressionRaw);
    incrementCount(attachToSceneRawCounts, type4?.attachToSceneRaw);
    incrementCount(modelCounts, type4?.modelRef ?? type4?.modelRaw);
    incrementCount(lightTokenRadiusCounts, type4?.animationTokenRadiusMeters?.toString());

    const isItemLightNormalRow = row.rowId >= 300 && row.rowId <= 327;
    const isItemLightFadeRow = row.rowId >= 350 && row.rowId <= 377;
    if (isItemLightNormalRow) {
      itemLightNormalRowCount += 1;
    } else if (isItemLightFadeRow) {
      itemLightFadeRowCount += 1;
    } else {
      nonItemRows.push(row);
      if (type4?.castShadows === true) {
        nonItemCastShadowRows.push(row);
      }
    }
    if (type4?.proximitySuppression === true) {
      proximitySuppressionRows.push(row);
    }
    if (type4?.attachToScene === true) {
      attachToSceneRows.push(row);
    }
    if (type4?.animationKind === "vision") {
      visionRows.push(row);
    }
  }

  return {
    sourceTable: "progfx.2da",
    proofStatus: "source-backed-progfx-type4-table-parameter-distribution-runtime-scheduler-blocked",
    rowCount: rows.length,
    type4RowCount: type4Rows.length,
    itemLightNormalRowCount,
    itemLightFadeRowCount,
    nonItemType4RowCount: type4Rows.length - itemLightNormalRowCount - itemLightFadeRowCount,
    animationKindCounts,
    castShadowsBooleanCounts,
    proximitySuppressionBooleanCounts,
    attachToSceneBooleanCounts,
    castShadowsRawCounts: sortCountRecord(castShadowsRawCounts),
    priorityRawCounts: sortCountRecord(priorityRawCounts),
    proximitySuppressionRawCounts: sortCountRecord(proximitySuppressionRawCounts),
    attachToSceneRawCounts: sortCountRecord(attachToSceneRawCounts),
    modelCounts: sortCountRecord(modelCounts),
    lightTokenRadiusCounts: sortCountRecord(lightTokenRadiusCounts),
    sampleRows: type4Rows.slice(0, sampleLimit).map(toAuroraProgFxType4SummaryRow),
    nonItemRows: nonItemRows.slice(0, sampleLimit).map(toAuroraProgFxType4SummaryRow),
    nonItemCastShadowRows: nonItemCastShadowRows
      .slice(0, sampleLimit)
      .map(toAuroraProgFxType4SummaryRow),
    proximitySuppressionRows: proximitySuppressionRows
      .slice(0, sampleLimit)
      .map(toAuroraProgFxType4SummaryRow),
    attachToSceneRows: attachToSceneRows.slice(0, sampleLimit).map(toAuroraProgFxType4SummaryRow),
    visionRows: visionRows.slice(0, sampleLimit).map(toAuroraProgFxType4SummaryRow),
    remainingBlockedSemantics: [
      "Param3/Param4/Param5/Param6 table distribution is source-backed",
      "retail table/owner-phase audit proves nonItemCastShadowRows=[] and nonItemCastShadowOwnerPhaseCount=0 for vanilla resources",
      "table distribution does not prove runtime scheduler order, vtable dispatch, proximity suppression, scene attachment, vision mutation, or cross-lane insertion behavior"
    ]
  };
}

export function summarizeAuroraProgFxType4VisualEffectOwners(
  visualEffectRows: readonly AuroraVisualEffectSourceRow[],
  progFxRows: readonly AuroraProgFxSourceRow[],
  sampleLimit = 64
): AuroraProgFxType4VisualEffectOwnerSummary {
  const progFxByRowId = new Map(progFxRows.map((row) => [row.rowId, row]));
  const ownerPhaseCounts: Record<AuroraVfxPhaseKind, number> = {
    impact: 0,
    duration: 0,
    cessation: 0
  };
  const nonItemOwnerRows: AuroraProgFxType4VisualEffectOwnerRow[] = [];
  const itemLightOwnerRows: AuroraProgFxType4VisualEffectOwnerRow[] = [];
  let type4OwnerPhaseCount = 0;
  let itemLightOwnerPhaseCount = 0;
  let nonItemOwnerPhaseCount = 0;
  let nonItemVisionOwnerPhaseCount = 0;
  let nonItemCastShadowOwnerPhaseCount = 0;
  let nonItemAttachToSceneOwnerPhaseCount = 0;
  let nonItemProximitySuppressionOwnerPhaseCount = 0;
  let missingProgFxReferenceCount = 0;
  let nonType4ProgFxReferenceCount = 0;

  for (const visualEffectRow of visualEffectRows) {
    for (const phase of visualEffectRow.phases) {
      if (typeof phase.progFxRowId !== "number") {
        continue;
      }

      const progFxRow = progFxByRowId.get(phase.progFxRowId);
      if (!progFxRow) {
        missingProgFxReferenceCount += 1;
        continue;
      }
      if (progFxRow.type !== 4) {
        nonType4ProgFxReferenceCount += 1;
        continue;
      }

      const ownerKind = isAuroraProgFxType4ItemLightRow(progFxRow.rowId)
        ? "item-light"
        : "non-item";
      const ownerRow = toAuroraProgFxType4VisualEffectOwnerRow(
        visualEffectRow,
        phase,
        progFxRow,
        ownerKind
      );

      type4OwnerPhaseCount += 1;
      ownerPhaseCounts[phase.phase] += 1;
      if (ownerKind === "item-light") {
        itemLightOwnerPhaseCount += 1;
        itemLightOwnerRows.push(ownerRow);
        continue;
      }

      nonItemOwnerPhaseCount += 1;
      nonItemOwnerRows.push(ownerRow);
      if (progFxRow.type4Light?.animationKind === "vision") {
        nonItemVisionOwnerPhaseCount += 1;
      }
      if (progFxRow.type4Light?.castShadows === true) {
        nonItemCastShadowOwnerPhaseCount += 1;
      }
      if (progFxRow.type4Light?.attachToScene === true) {
        nonItemAttachToSceneOwnerPhaseCount += 1;
      }
      if (progFxRow.type4Light?.proximitySuppression === true) {
        nonItemProximitySuppressionOwnerPhaseCount += 1;
      }
    }
  }

  return {
    sourceTable: "visualeffects.2da",
    linkedProgFxTable: "progfx.2da",
    proofStatus: "source-backed-visualeffects-progfx-type4-owner-phase-map-runtime-scheduler-blocked",
    visualEffectRowCount: visualEffectRows.length,
    type4OwnerPhaseCount,
    itemLightOwnerPhaseCount,
    nonItemOwnerPhaseCount,
    nonItemVisionOwnerPhaseCount,
    nonItemCastShadowOwnerPhaseCount,
    nonItemAttachToSceneOwnerPhaseCount,
    nonItemProximitySuppressionOwnerPhaseCount,
    missingProgFxReferenceCount,
    nonType4ProgFxReferenceCount,
    ownerPhaseCounts,
    nonItemOwnerRows: nonItemOwnerRows
      .slice(0, sampleLimit)
      .map(sortStableOwnerRowFields),
    itemLightOwnerRows: itemLightOwnerRows
      .slice(0, sampleLimit)
      .map(sortStableOwnerRowFields),
    remainingBlockedSemantics: [
      "visualeffects.2da owner phase references for ProgFX Type 4 are source-backed",
      "owner phase mapping does not prove client runtime scheduler priority, proximity suppression, scene attachment, vision mutation, or shadow projection behavior",
      "retail cross-lane ordering still requires scheduler data-flow or a retail oracle scene"
    ]
  };
}

function isAuroraProgFxType4ItemLightRow(rowId: number): boolean {
  return (rowId >= 300 && rowId <= 327) || (rowId >= 350 && rowId <= 377);
}

function toAuroraProgFxType4SummaryRow(
  row: AuroraProgFxSourceRow
): AuroraProgFxType4SummaryRow {
  return {
    rowId: row.rowId,
    label: row.label,
    ...(row.type4Light?.animation ? { animation: row.type4Light.animation } : {}),
    ...(row.type4Light?.animationKind
      ? { animationKind: row.type4Light.animationKind }
      : {}),
    ...(row.type4Light?.castShadowsRaw
      ? { castShadowsRaw: row.type4Light.castShadowsRaw }
      : {}),
    ...(row.type4Light?.priorityRaw ? { priorityRaw: row.type4Light.priorityRaw } : {}),
    ...(row.type4Light?.proximitySuppressionRaw
      ? { proximitySuppressionRaw: row.type4Light.proximitySuppressionRaw }
      : {}),
    ...(row.type4Light?.attachToSceneRaw
      ? { attachToSceneRaw: row.type4Light.attachToSceneRaw }
      : {}),
    ...(row.type4Light?.modelRef ? { modelRef: row.type4Light.modelRef } : {})
  };
}

function toAuroraProgFxType4VisualEffectOwnerRow(
  visualEffectRow: AuroraVisualEffectSourceRow,
  phase: AuroraVfxPhaseSourceRefs,
  progFxRow: AuroraProgFxSourceRow,
  ownerKind: AuroraProgFxType4OwnerKind
): AuroraProgFxType4VisualEffectOwnerRow {
  return {
    visualEffectRowId: visualEffectRow.rowId,
    visualEffectLabel: visualEffectRow.label,
    ...(visualEffectRow.typeFd ? { typeFd: visualEffectRow.typeFd } : {}),
    phase: phase.phase,
    progFxRowId: progFxRow.rowId,
    progFxLabel: progFxRow.label,
    ownerKind,
    ...(progFxRow.type4Light?.animation ? { animation: progFxRow.type4Light.animation } : {}),
    ...(progFxRow.type4Light?.animationKind
      ? { animationKind: progFxRow.type4Light.animationKind }
      : {}),
    ...(progFxRow.type4Light?.castShadowsRaw
      ? { castShadowsRaw: progFxRow.type4Light.castShadowsRaw }
      : {}),
    ...(progFxRow.type4Light?.priorityRaw
      ? { priorityRaw: progFxRow.type4Light.priorityRaw }
      : {}),
    ...(progFxRow.type4Light?.proximitySuppressionRaw
      ? { proximitySuppressionRaw: progFxRow.type4Light.proximitySuppressionRaw }
      : {}),
    ...(progFxRow.type4Light?.attachToSceneRaw
      ? { attachToSceneRaw: progFxRow.type4Light.attachToSceneRaw }
      : {}),
    ...(progFxRow.type4Light?.modelRef ? { modelRef: progFxRow.type4Light.modelRef } : {})
  };
}

function sortStableOwnerRowFields(
  row: AuroraProgFxType4VisualEffectOwnerRow
): AuroraProgFxType4VisualEffectOwnerRow {
  return row;
}

function incrementCount(counts: Record<string, number>, rawValue: string | undefined): void {
  const key = rawValue && rawValue.trim().length > 0 ? rawValue.trim() : BLANK_CELL;
  counts[key] = (counts[key] ?? 0) + 1;
}

function incrementBooleanCount(
  counts: { true: number; false: number; unknown: number },
  value: boolean | undefined
): void {
  if (value === true) {
    counts.true += 1;
    return;
  }
  if (value === false) {
    counts.false += 1;
    return;
  }
  counts.unknown += 1;
}

function sortCountRecord(counts: Record<string, number>): Record<string, number> {
  return Object.fromEntries(
    Object.entries(counts).sort(([left], [right]) => left.localeCompare(right))
  );
}

function buildProgFxType4LightSource(row: AuroraTwoDaRow): AuroraProgFxType4LightSource {
  const animationRaw = getRaw(row, "Param1");
  const animation = isBlankCell(animationRaw) ? undefined : getValue(row, "Param1");
  const animationSpeedRaw = getRaw(row, "Param2");
  const castShadowsRaw = getRaw(row, "Param3");
  const priorityRaw = getRaw(row, "Param4");
  const proximitySuppressionRaw = getRaw(row, "Param5");
  const attachToSceneRaw = getRaw(row, "Param6");
  const modelRaw = getRaw(row, "Param7");
  const modelRef = isBlankCell(modelRaw) ? undefined : getValue(row, "Param7");
  const unusedParam8Raw = getRaw(row, "Param8");
    return {
      proofStatus: "profile-gated-source-preserved-no-runtime-scheduling",
      ...(isBlankCell(animationRaw)
        ? {}
        : {
            animationRaw,
            animation,
            animationParameterStatus: PROGFX_TYPE4_PARAM1_ANIMATION_STATUS
          }),
      ...buildProgFxType4AnimationFacts(animation, modelRef),
      ...(isBlankCell(animationSpeedRaw)
        ? {}
        : {
            animationSpeedRaw,
            ...(typeof parseNumberCell(animationSpeedRaw) === "number"
              ? { animationSpeed: parseNumberCell(animationSpeedRaw) }
              : {}),
            animationSpeedParameterStatus: PROGFX_TYPE4_PARAM2_SPEED_STATUS
          }),
      ...(isBlankCell(castShadowsRaw)
        ? {}
        : {
            castShadowsRaw,
            ...(typeof parseBooleanIntCell(castShadowsRaw) === "boolean"
              ? { castShadows: parseBooleanIntCell(castShadowsRaw) }
              : {}),
            castShadowParameterStatus: PROGFX_TYPE4_PARAM3_CAST_SHADOW_STATUS
          }),
      ...(isBlankCell(priorityRaw)
        ? {}
        : {
            priorityRaw,
            ...(typeof parseIntCell(priorityRaw) === "number"
              ? { priority: parseIntCell(priorityRaw) }
              : {}),
            priorityParameterStatus: PROGFX_TYPE4_PARAM4_PRIORITY_STATUS
          }),
      ...(isBlankCell(proximitySuppressionRaw)
        ? {}
        : {
            proximitySuppressionRaw,
            ...(typeof parseBooleanIntCell(proximitySuppressionRaw) === "boolean"
              ? { proximitySuppression: parseBooleanIntCell(proximitySuppressionRaw) }
              : {}),
            proximitySuppressionParameterStatus: PROGFX_TYPE4_PARAM5_PROXIMITY_STATUS
          }),
      ...(isBlankCell(attachToSceneRaw)
        ? {}
        : {
            attachToSceneRaw,
            ...(typeof parseBooleanIntCell(attachToSceneRaw) === "boolean"
              ? { attachToScene: parseBooleanIntCell(attachToSceneRaw) }
              : {}),
            sceneAttachmentParameterStatus: PROGFX_TYPE4_PARAM6_ATTACH_STATUS
          }),
      ...(isBlankCell(modelRaw)
        ? {}
        : {
            modelRaw,
            modelRef,
            modelParameterStatus: PROGFX_TYPE4_PARAM7_MODEL_STATUS
          }),
      ...(isBlankCell(unusedParam8Raw) ? {} : { unusedParam8Raw }),
      parameterSource: PROGFX_TYPE4_PARAMETER_SOURCE,
      parameterPreservationProofSource: PROGFX_TYPE4_PARAMETER_PRESERVATION_PROOF_SOURCE,
      parameterPreservationProofStatus: PROGFX_TYPE4_PARAMETER_PRESERVATION_PROOF_STATUS
    };
  }

function buildProgFxType4AnimationFacts(
  animation: string | undefined,
  modelRef: string | undefined
): Partial<AuroraProgFxType4LightSource> {
  const normalized = animation?.trim();
  if (!normalized) {
    return {};
  }
  const hasFxLightClrModel = modelRef?.trim().toLowerCase() === "fx_light_clr";

  const lightMatch =
    /^(Blue|Yello|Yellow|Purp|Purple|Red|Orng|Orange|Gren|Green|White|white)_(5|10|15|20)m$/u.exec(
      normalized
    );
  if (lightMatch) {
    const tokenRadiusMeters = Number.parseInt(lightMatch[2] ?? "", 10);
    const sourceMdlFacts = hasFxLightClrModel
      ? PROGFX_TYPE4_FX_LIGHT_CLR_FACTS[normalized.toLowerCase()]
      : undefined;
    if (!Number.isFinite(tokenRadiusMeters)) {
      return {};
    }
    return {
      animationKind: "light",
      animationSymbolicColor: sourceMdlFacts?.symbolicColor ?? lightMatch[1],
      animationTokenRadiusMeters: tokenRadiusMeters,
      animationTokenRadiusProofStatus: "source-backed-progfx-param1-animation-token-radius",
      ...(sourceMdlFacts
        ? {
            sourceMdlNodeName: "AuroraLight01" as const,
            sourceMdlAnimation: sourceMdlFacts.sourceMdlAnimation,
            sourceMdlColor: sourceMdlFacts.color,
            sourceMdlRadiusMeters: PROGFX_TYPE4_FX_LIGHT_CLR_RADIUS_METERS,
            sourceMdlRadiusFrames: [...PROGFX_TYPE4_FX_LIGHT_CLR_RADIUS_FRAMES] as [
              number,
              number
            ],
            sourceMdlColorSource: PROGFX_TYPE4_FX_LIGHT_CLR_COLOR_SOURCE,
            sourceMdlColorProofStatus:
              "source-family-backed-fx_light_clr-mdl-animation-rgb" as const,
            sourceMdlRadiusSource: PROGFX_TYPE4_FX_LIGHT_CLR_RADIUS_SOURCE,
            sourceMdlRadiusProofStatus:
              "source-family-backed-fx_light_clr-mdl-animation-radius" as const
          }
        : {}),
      animationSemanticSource:
        "progfx.2da Type 4 Param1 names the fx_light_clr.mdl animation; 5m/10m/15m/20m is preserved as a token, while source MDL controller type 88 supplies radius"
    };
  }

  if (/vision/iu.test(normalized)) {
    const sourceMdlFacts = hasFxLightClrModel
      ? PROGFX_TYPE4_FX_LIGHT_CLR_VISION_FACTS[normalized.toLowerCase()]
      : undefined;
    return {
      animationKind: "vision",
      visionMode: normalized,
      visionParameterStatus: PROGFX_TYPE4_PARAM1_VISION_STATUS,
      ...(sourceMdlFacts
        ? {
            sourceMdlNodeName: "AuroraLight02" as const,
            sourceMdlAnimation: sourceMdlFacts.sourceMdlAnimation,
            sourceMdlColor: sourceMdlFacts.color,
            sourceMdlRadiusMeters: sourceMdlFacts.radius,
            sourceMdlRadiusFrames: [0, sourceMdlFacts.radius] as [number, number],
            sourceMdlColorSource: PROGFX_TYPE4_FX_LIGHT_CLR_VISION_COLOR_SOURCE,
            sourceMdlColorProofStatus: "source-family-backed-fx_light_clr-mdl-animation-rgb" as const,
            sourceMdlRadiusSource: PROGFX_TYPE4_FX_LIGHT_CLR_VISION_RADIUS_SOURCE,
            sourceMdlRadiusProofStatus:
              "source-family-backed-fx_light_clr-mdl-animation-radius" as const
          }
        : {}),
      animationSemanticSource:
        "progfx.2da Type 4 Param1 animation token contains a vision-mode request"
    };
  }

  return {};
}

function parseBooleanIntCell(value: string | undefined): boolean | undefined {
  const parsed = parseIntCell(value);
  if (parsed === 0) {
    return false;
  }
  if (parsed === 1) {
    return true;
  }
  return undefined;
}

function buildProgFxRowDiagnostics(type: number | undefined): AuroraVfxDiagnostic[] {
  if (type !== 4) {
    return [];
  }

  return [
    diagnostic(
      "VFX_PROGFX_TYPE4_REQUEST_CONTEXT_REQUIRED",
      "warn",
      "progfx.2da Type 4 is a phase-owned client light/vision request and requires owning visualeffects.2da phase plus effect-instance context before preview or runtime scheduling."
    ),
    diagnostic(
      "VFX_PROGFX_TYPE4_NOT_MDL_LIGHT_NODE",
      "warn",
      "progfx.2da Type 4 is not an MDL node light and must not be merged with source MDL light-node payloads."
    ),
    diagnostic(
      "VFX_CLIENT_LIGHT_NOT_GENERIC_POINT_LIGHT",
      "warn",
      "progfx.2da Type 4 client light/vision semantics must not become a generic renderer PointLight without selected-profile and retail/runtime validation."
    )
  ];
}

export function parseAuroraAoeTwoDa(
  input: Buffer | string,
  profileOrOptions: string | AuroraVfxSourceParseOptions = "unknown"
): {
  table: AuroraTwoDaTable;
  rows: AuroraAoeSourceRow[];
  diagnostics: AuroraVfxDiagnostic[];
} {
  const parseOptions = resolveParseOptions("vfx_persistent.2da", profileOrOptions);
  const table = parseAuroraTwoDaTable(input, parseOptions);
  const profile = parseOptions.profile;
  const diagnostics = [
    ...table.diagnostics,
    ...assertRequiredColumns(
      table,
      VFX_PERSISTENT_REQUIRED_COLUMNS,
      "VFX_2DA_VFX_PERSISTENT_HEADER_REQUIRED"
    )
  ];

  const rows = table.rows.map((row): AuroraAoeSourceRow => {
    const rowDiagnostics = [
      diagnostic(
        "VFX_AOE_ROW_NOT_VISUALEFFECTS_ROW",
        "warn",
        "vfx_persistent.2da rows are AOE footprint/source facts, not visualeffects.2da rows."
      )
    ];
    return {
      ...sourceRowBase("vfx_persistent.2da", profile, row, getLabel(row, ["LABEL", "Label"]), rowDiagnostics),
      shapeRaw: getNonBlankRawFromAny(row, ["SHAPE", "Shape"]),
      radiusRaw: getNonBlankRawFromAny(row, ["RADIUS", "Radius"]),
      widthRaw: getNonBlankRawFromAny(row, ["WIDTH", "Width"]),
      lengthRaw: getNonBlankRawFromAny(row, ["LENGTH", "Length"]),
      visualFxRaw: getNonBlankRawFromAny(row, ["VisualFX", "VISUALFX"]),
      durationVfxRaw: getNonBlankRawFromAny(row, ["DurationVFX", "DURATIONVFX"]),
      eventScripts: {
        onEnterRaw: getNonBlankRawFromAny(row, ["ONENTER", "OnEnter"]),
        onExitRaw: getNonBlankRawFromAny(row, ["ONEXIT", "OnExit"]),
        heartbeatRaw: getNonBlankRawFromAny(row, ["HEARTBEAT", "Heartbeat"])
      },
      modelFootprintRefs: nonBlankCellsByColumn(row, AOE_MODEL_FOOTPRINT_COLUMNS),
      soundFootprintRefs: nonBlankCellsByColumn(row, AOE_SOUND_FOOTPRINT_COLUMNS)
    };
  });

  return { table, rows, diagnostics };
}

export function parseAuroraItemPropertyVisualFxTwoDa(
  input: Buffer | string,
  profileOrOptions: string | AuroraVfxSourceParseOptions = "unknown"
): {
  table: AuroraTwoDaTable;
  rows: AuroraItemPropertyVisualSourceRow[];
  diagnostics: AuroraVfxDiagnostic[];
} {
  const parseOptions = resolveParseOptions("iprp_visualfx.2da", profileOrOptions);
  const table = parseAuroraTwoDaTable(input, parseOptions);
  const profile = parseOptions.profile;
  const diagnostics = [
    ...table.diagnostics,
    ...assertRequiredColumns(
      table,
      IPRP_VISUALFX_REQUIRED_COLUMNS,
      "VFX_2DA_IPRP_VISUALFX_HEADER_REQUIRED"
    )
  ];

  const rows = table.rows.map((row): AuroraItemPropertyVisualSourceRow => {
    const rowDiagnostics = [
      diagnostic(
        "VFX_IPRP_VISUALFX_MODELSUFFIX_NOT_VISUALEFFECTS_ROW",
        "warn",
        "iprp_visualfx.2da ModelSuffix is item-property source data and is not a visualeffects.2da phase row."
      )
    ];
    return {
      ...sourceRowBase("iprp_visualfx.2da", profile, row, getLabel(row), rowDiagnostics),
      nameRaw: getNonBlankRaw(row, "Name"),
      modelSuffixRaw: getNonBlankRaw(row, "ModelSuffix"),
      subtypeProfileRaw: getNonBlankRawFromAny(row, ["SubType", "Subtype", "Profile"]),
      profileData: nonBlankCellsMatching(
        row,
        (column) => !["Label", "Name", "ModelSuffix"].includes(column)
      )
    };
  });

  return { table, rows, diagnostics };
}

export function parseAuroraSpellsTwoDa(
  input: Buffer | string,
  profileOrOptions: string | AuroraVfxSourceParseOptions = "unknown"
): {
  table: AuroraTwoDaTable;
  rows: AuroraSpellVisualSourceRow[];
  diagnostics: AuroraVfxDiagnostic[];
} {
  const parseOptions = resolveParseOptions("spells.2da", profileOrOptions);
  const table = parseAuroraTwoDaTable(input, parseOptions);
  const profile = parseOptions.profile;
  const diagnostics = [
    ...table.diagnostics,
    ...assertRequiredColumns(table, SPELLS_REQUIRED_COLUMNS, "VFX_2DA_SPELLS_HEADER_REQUIRED")
  ];

  const rows = table.rows.map((row): AuroraSpellVisualSourceRow => {
    const rowDiagnostics = [
      diagnostic(
        "VFX_SPELLS_SOURCE_FACTS_NOT_VISUALEFFECTS_ROW",
        "warn",
        "spells.2da visual/projectile/script/sound slots remain spell-source facts until an owning effect/application path resolves them."
      )
    ];
    return {
      ...sourceRowBase("spells.2da", profile, row, getLabel(row), rowDiagnostics),
      visualSlots: nonBlankCellsMatching(row, (column) => /visual/iu.test(column)),
      projectileSlots: nonBlankCellsMatching(row, (column) => /projectile|^proj/iu.test(column)),
      scriptSlots: nonBlankCellsMatching(row, (column) => /script$/iu.test(column)),
      soundSlots: nonBlankCellsMatching(row, (column) => /sound/iu.test(column))
    };
  });

  return { table, rows, diagnostics };
}

export function parseAuroraDamageHitVisualTwoDa(
  input: Buffer | string,
  profileOrOptions: string | AuroraVfxSourceParseOptions = "unknown"
): {
  table: AuroraTwoDaTable;
  rows: AuroraDamageHitVisualSourceRow[];
  diagnostics: AuroraVfxDiagnostic[];
} {
  const parseOptions = resolveParseOptions("damagehitvisual.2da", profileOrOptions);
  const table = parseAuroraTwoDaTable(input, parseOptions);
  const profile = parseOptions.profile;
  const diagnostics = [
    ...table.diagnostics,
    ...assertRequiredColumns(
      table,
      DAMAGEHITVISUAL_REQUIRED_COLUMNS,
      "VFX_2DA_DAMAGEHITVISUAL_HEADER_REQUIRED"
    )
  ];

  const rows = table.rows.map((row): AuroraDamageHitVisualSourceRow => {
    const rowDiagnostics = [
      diagnostic(
        "VFX_DAMAGEHIT_ROW_NOT_GENERIC_EFFECTVISUALEFFECT",
        "warn",
        "damagehitvisual.2da rows are combat-event source facts and are not generic EffectVisualEffect requests."
      )
    ];
    return {
      ...sourceRowBase("damagehitvisual.2da", profile, row, getLabel(row), rowDiagnostics),
      visualEffectIdRaw: getNonBlankRaw(row, "VisualEffectID"),
      rangedEffectIdRaw: getNonBlankRaw(row, "RangedEffectID")
    };
  });

  return { table, rows, diagnostics };
}

export function diagnoseCatalogVfxPreviewSourceBoundary(
  input: AuroraCatalogVfxPreviewSourceBoundaryInput
): AuroraVfxDiagnostic[] {
  const diagnostics: AuroraVfxDiagnostic[] = [];
  if (input.vfxPreset && input.vfxPreset.trim().length > 0) {
    diagnostics.push(
      diagnostic(
        "VFX_CATALOG_VFXPRESET_METADATA_NOT_PHASE_SOURCE",
        "warn",
        "Catalog vfxPreset metadata is preview/source-list metadata and is not a visualeffects.2da source row."
      )
    );
  }
  if (input.placeableSubtype?.trim().toLowerCase() === "vfx") {
    diagnostics.push(
      diagnostic(
        "VFX_PLACEABLE_KIND_NOT_EFFECTVISUALEFFECT",
        "warn",
        "Placeable subtype vfx is catalog/source-list data and is not an EffectVisualEffect instance."
      )
    );
  }
  if (input.rendererPreset?.trim().toLowerCase() === "vfx-emitter") {
    diagnostics.push(
      diagnostic(
        "VFX_CURRENT_VFX_PRESET_RESOURCE_NODE_PREVIEW_ONLY",
        "warn",
        "vfx-emitter rendererPreset identifies the current preview lane, not canonical VFX runtime source semantics."
      )
    );
  }
  return diagnostics;
}

export function buildAuroraVfxEffectInstanceFromCatalogPreview(
  input: AuroraCatalogVfxPreviewSourceBoundaryInput
): AuroraVfxEffectInstanceBuildResult {
  return {
    diagnostics: [
      ...diagnoseCatalogVfxPreviewSourceBoundary(input),
      diagnostic(
        "VFX_CATALOG_PREVIEW_NOT_EFFECT_INSTANCE",
        "warn",
        "Catalog/placeable VFX preview metadata cannot construct an AuroraVfxEffectInstance."
      )
    ]
  };
}

function buildPhaseScheduleLanes(
  phases: AuroraVfxPhaseSourceRefs[],
  clientEvents: AuroraVfxClientEventSource[]
): AuroraVfxPhaseScheduleLanes {
  const modelNodeRefs: AuroraVfxPhaseScheduleLanes["modelNodeRefs"] = {};
  const progFxRefs: AuroraVfxPhaseScheduleLanes["progFxRefs"] = {};
  const soundRefs: AuroraVfxPhaseScheduleLanes["soundRefs"] = {};

  for (const phase of phases) {
    if (Object.keys(phase.modelNodeRefs).length > 0) {
      modelNodeRefs[phase.phase] = phase.modelNodeRefs;
    }
    if (phase.progFxRaw) {
      progFxRefs[phase.phase] = phase.progFxRaw;
    }
    if (phase.soundRaw) {
      soundRefs[phase.phase] = phase.soundRaw;
    }
  }

  return {
    modelNodeRefs,
    progFxRefs,
    soundRefs,
    clientEvents
  };
}

function validateEffectInstanceForSchedule(
  instance: AuroraVfxEffectInstance | undefined
): AuroraVfxDiagnostic[] {
  if (!instance) {
    return [];
  }

  const diagnostics = [...(instance.diagnostics ?? [])];
  if (instance.constructorKind === "EffectBeam") {
    if (!instance.effectorRef) {
      diagnostics.push(
        diagnostic(
          "VFX_EFFECTBEAM_EFFECTOR_REQUIRED",
          "error",
          "EffectBeam requires an effector/source object before scheduling."
        )
      );
    }
    if (!instance.targetRef) {
      diagnostics.push(
        diagnostic(
          "VFX_EFFECTBEAM_TARGET_REQUIRED",
          "error",
          "EffectBeam requires a target object before scheduling."
        )
      );
    }
    if (!instance.bodyNode) {
      diagnostics.push(
        diagnostic(
          "VFX_EFFECTBEAM_BODY_NODE_REQUIRED",
          "error",
          "EffectBeam requires BODY_NODE context before scheduling."
        )
      );
    }
  }

  return diagnostics;
}

export function buildAuroraVfxPhaseSchedule(
  sourceRow: AuroraVisualEffectSourceRow,
  effectInstance?: AuroraVfxEffectInstance
): AuroraVfxPhaseSchedule {
  const phases = sourceRow.phases;
  const scheduledClientEvents = effectInstance ? sourceRow.clientEvents : [];
  const lanes = buildPhaseScheduleLanes(phases, scheduledClientEvents);
  const instanceDiagnostics = validateEffectInstanceForSchedule(effectInstance);
  const diagnostics: AuroraVfxDiagnostic[] = [...instanceDiagnostics];

  if (!effectInstance) {
    diagnostics.push(
      diagnostic(
        "VFX_EFFECT_INSTANCE_CONTEXT_REQUIRED",
        "warn",
        "visualeffects.2da source rows cannot schedule runtime phases without an effect instance."
      )
    );
  } else if (effectInstance.sourceRowId !== sourceRow.rowId) {
    diagnostics.push(
      diagnostic(
        "VFX_EFFECT_INSTANCE_ROW_MISMATCH",
        "error",
        "Effect instance source row does not match the visualeffects.2da source row."
      )
    );
  }

  if (!effectInstance && sourceRow.clientEvents.length > 0) {
    diagnostics.push(
      diagnostic(
        "VFX_CLIENT_EVENT_EFFECT_INSTANCE_REQUIRED",
        "warn",
        "Shake/bump client events require effect application context before scheduling."
      )
    );
  }

  return {
    sourceRowId: sourceRow.rowId,
    sourceLabel: sourceRow.label,
    status:
      effectInstance && diagnostics.every((entry) => entry.severity !== "error")
        ? "ready"
        : "source_only",
    effectInstance,
    context: effectInstance,
    phases,
    lanes,
    clientEvents: scheduledClientEvents,
    diagnostics: [...sourceRow.diagnostics, ...diagnostics]
  };
}
