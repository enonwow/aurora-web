export interface AuroraAreaVfxVector3 {
  x: number;
  y: number;
  z: number;
}

export interface AuroraAreaVfxCollisionDiagnostic {
  code: string;
  severity: "info" | "warn" | "error";
  message: string;
  modelResRef?: string;
  tileInstanceId?: string;
}

export interface AuroraAreaVfxWalkmeshFace {
  vertexIndices: [number, number, number];
  rawTokens: number[];
  sourceLineNumber: number;
}

export interface AuroraAreaVfxWalkmeshNode {
  nodeName: string;
  position?: AuroraAreaVfxVector3;
  orientationRaw?: [number, number, number, number];
  vertices: AuroraAreaVfxVector3[];
  faces: AuroraAreaVfxWalkmeshFace[];
  aabbRecords: Array<{
    rawTokens: number[];
    sourceLineNumber: number;
    boundsMin?: AuroraAreaVfxVector3;
    boundsMax?: AuroraAreaVfxVector3;
    faceIndex?: number;
    planeMask?: number;
    planeMaskSource?:
      | "source-token"
      | "aurora-derived-child-bounds"
      | "aurora-default-zero";
    childRecordIndices?: [number, number];
  }>;
}

export interface AuroraAreaVfxWalkmesh {
  version: "aurora-wok-walkmesh/v1";
  sourceFormat: "aurora-wok-ascii";
  resourceName?: string;
  nodes: AuroraAreaVfxWalkmeshNode[];
  diagnostics: Array<{
    code: string;
    severity: "info" | "warn" | "error";
    message: string;
  }>;
}

export interface AuroraAreaVfxCollisionResource {
  resourceId: string;
  modelResRef: string;
  sourceObjectKey: string;
  sourceLayer: "module" | "hak" | "vanilla";
  sourceHash: string;
  walkmesh: AuroraAreaVfxWalkmesh;
}

export interface AuroraAreaVfxCollisionInstance {
  instanceId: string;
  resourceId: string;
  translation: AuroraAreaVfxVector3;
  orientationQuarterTurns: number;
}

export interface AuroraAreaVfxCollisionContract {
  version: "aurora-area-vfx-collision/v1";
  coordinateSpace: "aurora-area-z-up";
  unitsPerTile: 10;
  status: "ready" | "partial" | "unavailable";
  fingerprint: string;
  resources: AuroraAreaVfxCollisionResource[];
  instances: AuroraAreaVfxCollisionInstance[];
  diagnostics: AuroraAreaVfxCollisionDiagnostic[];
}

export interface AuroraAreaVfxObjectTransform {
  translation: AuroraAreaVfxVector3;
  bearingRadians: number;
  visualTransform: {
    scaleX: number;
    scaleY: number;
    scaleZ: number;
    offsetX: number;
    offsetY: number;
    offsetZ: number;
    pitch: number;
    roll: number;
    yaw: number;
  };
}

export interface AuroraAreaVfxSceneCollisionInput {
  version: "aurora-area-vfx-scene-collision/v1";
  area: AuroraAreaVfxCollisionContract;
  objectTransform: AuroraAreaVfxObjectTransform;
}
