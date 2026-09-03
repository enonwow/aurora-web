import * as THREE from "three";
import type { AuroraVfxPayload, AuroraVfxJsonValue } from "../../scene/contracts";

type AuroraVfxObjectAttachmentPhase = "impact" | "cessation";
export type AuroraVfxObjectAttachmentTargetKind =
  | "creature"
  | "placeable"
  | "door";
type AuroraVfxObjectAttachmentNamespace = "ground" | "impact" | "head";
type AuroraVfxObjectAttachmentOrientationPolicy =
  | "aurora-attach-no-orientation"
  | "aurora-full-attachment-world-transform";

export interface AuroraVfxObjectAttachmentResult {
  status:
    | "attached"
    | "not-object-application"
    | "phase-missing"
    | "attachment-slot-ambiguous"
    | "target-missing"
    | "target-kind-missing"
    | "target-special-node-prefix-missing"
    | "anchor-missing";
  phase: AuroraVfxObjectAttachmentPhase;
  sourceColumn: string;
  requestedNodeName: string;
  resolvedNodeName: string;
  targetKind: AuroraVfxObjectAttachmentTargetKind | "";
  targetSpecialNodePrefix: string;
  worldPosition: [number, number, number] | null;
  worldQuaternion: [number, number, number, number] | null;
  orientWithGroundRaw: string;
  orientationSourceStatus:
    | "source-zero"
    | "source-nonzero"
    | "source-missing-or-invalid";
  orientationPolicy: AuroraVfxObjectAttachmentOrientationPolicy;
}

const ATTACHMENT_NAMESPACE_BY_COLUMN: Record<
  string,
  AuroraVfxObjectAttachmentNamespace
> = {
  Imp_HeadCon_Node: "head",
  Imp_Impact_Node: "impact",
  Imp_Root_S_Node: "ground",
  Imp_Root_M_Node: "ground",
  Imp_Root_L_Node: "ground",
  Imp_Root_H_Node: "ground",
  Ces_HeadCon_Node: "head",
  Ces_Impact_Node: "impact",
  Ces_Root_S_Node: "ground",
  Ces_Root_M_Node: "ground",
  Ces_Root_L_Node: "ground",
  Ces_Root_H_Node: "ground"
};

export function applyAuroraVfxObjectAttachmentPosition(input: {
  payload: AuroraVfxPayload;
  phase: AuroraVfxObjectAttachmentPhase;
  targetKind: AuroraVfxObjectAttachmentTargetKind;
  targetSpecialNodePrefix?: string;
  targetRoots: THREE.Object3D[];
  effectGroup: THREE.Object3D;
}): AuroraVfxObjectAttachmentResult {
  const schedule = asRecord(input.payload.contracts.phaseSchedule);
  const effectInstance = asRecord(schedule?.effectInstance);
  if (effectInstance?.applicationMode !== "object") {
    return result("not-object-application", input.phase, undefined, input);
  }

  const phase = asArray(schedule?.phases)
    .map(asRecord)
    .find((entry) => entry?.phase === input.phase);
  const modelNodeRefs = asRecord(phase?.modelNodeRefs);
  const requestedAttachments = Object.entries(modelNodeRefs ?? {}).flatMap(
    ([column, modelRef]) =>
      typeof modelRef === "string" &&
      modelRef.trim() &&
      ATTACHMENT_NAMESPACE_BY_COLUMN[column]
        ? [
            {
              sourceColumn: column,
              attachmentNamespace: ATTACHMENT_NAMESPACE_BY_COLUMN[column]
            }
          ]
        : []
  );
  if (requestedAttachments.length === 0) {
    return result("phase-missing", input.phase, undefined, input);
  }
  if (requestedAttachments.length !== 1) {
    return result("attachment-slot-ambiguous", input.phase, undefined, input);
  }
  if (input.targetRoots.length !== 1) {
    return result(
      "target-missing",
      input.phase,
      requestedAttachments[0],
      input
    );
  }

  const targetSpecialNodePrefix = input.targetSpecialNodePrefix?.trim() ?? "";
  if (!input.targetKind) {
    return result(
      "target-kind-missing",
      input.phase,
      requestedAttachments[0],
      input
    );
  }
  if (input.targetKind !== "creature" && !targetSpecialNodePrefix) {
    return result(
      "target-special-node-prefix-missing",
      input.phase,
      requestedAttachments[0],
      input
    );
  }
  const request = {
    ...requestedAttachments[0],
    requestedNodeName: resolveAttachmentNodeName(
      input.targetKind,
      requestedAttachments[0].attachmentNamespace,
      targetSpecialNodePrefix
    )
  };
  const anchor = findNodeCaseInsensitive(
    input.targetRoots[0],
    request.requestedNodeName
  );
  if (!anchor) {
    return result("anchor-missing", input.phase, request, input);
  }

  anchor.updateWorldMatrix(true, false);
  const worldPosition = anchor.getWorldPosition(new THREE.Vector3());
  const orientation = resolveOrientationPolicy(input.payload, schedule);
  const anchorWorldQuaternion = anchor.getWorldQuaternion(
    new THREE.Quaternion()
  );
  let localPosition = worldPosition;
  if (input.effectGroup.parent) {
    input.effectGroup.parent.updateWorldMatrix(true, false);
    localPosition = input.effectGroup.parent.worldToLocal(worldPosition.clone());
  }
  input.effectGroup.position.copy(localPosition);
  if (orientation.inheritAnchorOrientation) {
    let localQuaternion = anchorWorldQuaternion;
    if (input.effectGroup.parent) {
      const parentWorldQuaternion = input.effectGroup.parent.getWorldQuaternion(
        new THREE.Quaternion()
      );
      localQuaternion = parentWorldQuaternion
        .invert()
        .multiply(anchorWorldQuaternion.clone());
    }
    input.effectGroup.quaternion.copy(localQuaternion);
  }
  input.effectGroup.updateWorldMatrix(false, true);
  const appliedWorldQuaternion = input.effectGroup.getWorldQuaternion(
    new THREE.Quaternion()
  );
  input.effectGroup.userData = {
    ...input.effectGroup.userData,
    auroraVfxObjectAttachmentStatus: "attached",
    auroraVfxObjectAttachmentPhase: input.phase,
    auroraVfxObjectAttachmentSourceColumn: request.sourceColumn,
    auroraVfxObjectAttachmentRequestedNodeName: request.requestedNodeName,
    auroraVfxObjectAttachmentResolvedNodeName: anchor.name,
    auroraVfxObjectAttachmentTargetKind: input.targetKind,
    auroraVfxObjectAttachmentTargetSpecialNodePrefix: targetSpecialNodePrefix,
    auroraVfxObjectAttachmentWorldPosition: worldPosition.toArray(),
    auroraVfxObjectAttachmentWorldQuaternion: appliedWorldQuaternion.toArray(),
    auroraVfxObjectAttachmentOrientWithGroundRaw: orientation.raw,
    auroraVfxObjectAttachmentOrientationSourceStatus: orientation.sourceStatus,
    auroraVfxObjectAttachmentOrientationPolicy: orientation.policy
  };
  return {
    status: "attached",
    phase: input.phase,
    sourceColumn: request.sourceColumn,
    requestedNodeName: request.requestedNodeName,
    resolvedNodeName: anchor.name,
    targetKind: input.targetKind,
    targetSpecialNodePrefix,
    worldPosition: worldPosition.toArray(),
    worldQuaternion: appliedWorldQuaternion.toArray(),
    orientWithGroundRaw: orientation.raw,
    orientationSourceStatus: orientation.sourceStatus,
    orientationPolicy: orientation.policy
  };
}

function findNodeCaseInsensitive(
  root: THREE.Object3D,
  requestedNodeName: string
): THREE.Object3D | null {
  const normalized = requestedNodeName.trim().toLowerCase();
  if (!normalized) {
    return root;
  }
  let resolved: THREE.Object3D | null = null;
  root.traverse((node) => {
    if (!resolved && node.name.trim().toLowerCase() === normalized) {
      resolved = node;
    }
  });
  return resolved;
}

function result(
  status: AuroraVfxObjectAttachmentResult["status"],
  phase: AuroraVfxObjectAttachmentPhase,
  request?: {
    sourceColumn: string;
    attachmentNamespace: AuroraVfxObjectAttachmentNamespace;
    requestedNodeName?: string;
  },
  input?: {
    targetKind?: AuroraVfxObjectAttachmentTargetKind;
    targetSpecialNodePrefix?: string;
  }
): AuroraVfxObjectAttachmentResult {
  return {
    status,
    phase,
    sourceColumn: request?.sourceColumn ?? "",
    requestedNodeName: request?.requestedNodeName ?? "",
    resolvedNodeName: "",
    targetKind: input?.targetKind ?? "",
    targetSpecialNodePrefix: input?.targetSpecialNodePrefix?.trim() ?? "",
    worldPosition: null,
    worldQuaternion: null,
    orientWithGroundRaw: "",
    orientationSourceStatus: "source-missing-or-invalid",
    orientationPolicy: "aurora-attach-no-orientation"
  };
}

function resolveAttachmentNodeName(
  targetKind: AuroraVfxObjectAttachmentTargetKind,
  namespace: AuroraVfxObjectAttachmentNamespace,
  targetSpecialNodePrefix: string
): string {
  if (targetKind === "creature") {
    if (namespace === "ground") return "";
    return namespace;
  }
  if (targetKind === "placeable") {
    if (namespace === "ground") return `${targetSpecialNodePrefix}_ground`;
    if (namespace === "impact") return `${targetSpecialNodePrefix}_impact`;
    return `${targetSpecialNodePrefix}_head_hit`;
  }
  if (namespace === "ground") return `${targetSpecialNodePrefix}grnd`;
  if (namespace === "impact") return `${targetSpecialNodePrefix}impc`;
  return `${targetSpecialNodePrefix}hhit`;
}

function resolveOrientationPolicy(
  payload: AuroraVfxPayload,
  schedule: Record<string, AuroraVfxJsonValue> | null
): {
  raw: string;
  sourceStatus: AuroraVfxObjectAttachmentResult["orientationSourceStatus"];
  policy: AuroraVfxObjectAttachmentOrientationPolicy;
  inheritAnchorOrientation: boolean;
} {
  const sourceRowId =
    typeof schedule?.sourceRowId === "number" ? schedule.sourceRowId : null;
  const sourceRow = asArray(payload.contracts.sourceRows)
    .map(asRecord)
    .find(
      (entry) =>
        sourceRowId === null || entry?.rowId === sourceRowId
    );
  const visualFacts = asRecord(sourceRow?.visualFacts);
  const rawCells = asRecord(sourceRow?.rawCells);
  const rawValue =
    visualFacts?.orientWithGroundRaw ?? rawCells?.OrientWithGround;
  const raw =
    typeof rawValue === "string" || typeof rawValue === "number"
      ? String(rawValue).trim()
      : "";
  const numeric = raw ? Number(raw) : Number.NaN;
  if (!Number.isFinite(numeric)) {
    return {
      raw,
      sourceStatus: "source-missing-or-invalid",
      policy: "aurora-attach-no-orientation",
      inheritAnchorOrientation: false
    };
  }
  const inheritAnchorOrientation = numeric !== 0;
  return {
    raw,
    sourceStatus: inheritAnchorOrientation ? "source-nonzero" : "source-zero",
    policy: inheritAnchorOrientation
      ? "aurora-full-attachment-world-transform"
      : "aurora-attach-no-orientation",
    inheritAnchorOrientation
  };
}

function asRecord(
  value: AuroraVfxJsonValue | undefined
): Record<string, AuroraVfxJsonValue> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : null;
}

function asArray(value: AuroraVfxJsonValue | undefined): AuroraVfxJsonValue[] {
  return Array.isArray(value) ? value : [];
}
