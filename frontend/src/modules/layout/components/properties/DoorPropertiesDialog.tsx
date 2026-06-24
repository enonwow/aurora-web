import type { PointerEventHandler, Ref } from "react";
import type { SceneObject } from "../../contracts";
import {
  SharedAdvancedSettingsSection,
  SharedDialogActionsFooter,
  SharedLongTextPropertySection,
  SharedPropertyDialogChrome,
  SharedPropertyTabsNav,
  SharedScriptSlotSection
} from "./SharedPropertyDialogSections";
import {
  SharedLockPropertySection,
  SharedTrapPropertySection
} from "./LockTrapPropertySections";
import {
  DOOR_APPEARANCE_TYPE_OPTIONS,
  DOOR_GENERIC_APPEARANCE_OPTIONS,
  DOOR_INITIAL_STATE_OPTIONS,
  DOOR_PROPERTIES_TAB_OPTIONS,
  DOOR_SCRIPT_SLOT_KEYS,
  DOOR_SCRIPT_SLOT_LABELS,
  PLACEABLE_FACTION_OPTIONS,
  PLACEABLE_TRAP_TYPE_OPTIONS,
  type DoorPropertiesDialogState,
  type DoorPropertiesDraft,
  type DoorPropertiesTab,
  type DoorScriptSlotKey
} from "../../application/workspaceObjectPropertyDrafts";
import {
  resolvePlaceableRenderContractState,
  type PlaceableRenderContractState
} from "../../application/workspacePlaceableRenderContracts";
import type { PlaceableViewportRenderPayload } from "../../../placeables/application/placeableRenderPayloadResolver";

type DoorPropertiesEditableField =
  | "name"
  | "tag"
  | "resRef"
  | "appearanceType"
  | "genericAppearance"
  | "plot"
  | "hardness"
  | "hitPoints"
  | "fortitudeSave"
  | "reflexSave"
  | "willSave"
  | "description"
  | "comments";

type DoorTransitionDraftField =
  | "destinationTag"
  | "destinationType"
  | "linkedTarget"
  | "linkedModule"
  | "linkedWaypoint"
  | "loadScreen";

interface DoorPropertiesDialogProps {
  doorPropertiesDialog: DoorPropertiesDialogState;
  doorRenderPayload?: PlaceableViewportRenderPayload | null;
  doorPropertiesDialogRef?: Ref<HTMLElement>;
  toggleDoorPropertiesDialogCollapsed: () => void;
  cancelDoorPropertiesDialog: () => void;
  setDoorPropertiesActiveTab: (nextTab: DoorPropertiesTab) => void;
  updateDoorPropertiesDraftField: (
    field: DoorPropertiesEditableField,
    value: string | boolean | number
  ) => void;
  updateDoorLockDraftField: (
    field: keyof DoorPropertiesDraft["lockSettings"],
    value: string | boolean | number
  ) => void;
  updateDoorTrapDraftField: (
    field: keyof DoorPropertiesDraft["trapSettings"],
    value: string | boolean | number
  ) => void;
  updateDoorScriptSlotDraftField: (field: DoorScriptSlotKey, value: string) => void;
  updateDoorAdvancedDraftField: (
    field: keyof DoorPropertiesDraft["advancedSettings"],
    value: string | boolean
  ) => void;
  updateDoorTransitionDraftField: (field: DoorTransitionDraftField, value: string) => void;
  applyDoorPropertiesDraft: (closeAfterApply: boolean) => void;
  startDoorPropertiesDialogDrag?: PointerEventHandler<HTMLElement>;
  moveDoorPropertiesDialogDrag?: PointerEventHandler<HTMLElement>;
  endDoorPropertiesDialogDrag?: PointerEventHandler<HTMLElement>;
  cancelDoorPropertiesDialogDrag?: PointerEventHandler<HTMLElement>;
}

function formatObjectNumber(value: number, fractionDigits: number): string {
  if (!Number.isFinite(value)) {
    return "0";
  }
  return value.toFixed(fractionDigits);
}

function resolveSourceStatusLabel(object: SceneObject): string {
  return object.source?.type === "aurora_git" ? "source-backed GIT" : "fallback/local";
}

function resolveSourceIdLabel(object: SceneObject): string {
  return object.source?.sourceObjectId ?? object.id;
}

function resolveTemplateIdLabel(object: SceneObject): string {
  return object.source?.templateId ?? object.resRef;
}

function resolvePlacementLabel(object: SceneObject): string {
  return [
    `x ${formatObjectNumber(object.x, 2)}`,
    `y ${formatObjectNumber(object.y, 2)}`,
    `z ${formatObjectNumber(object.z, 2)}`,
    `bearing ${formatObjectNumber(object.bearing, 0)} deg`
  ].join(" / ");
}

function resolveDoorTransitionStatus(object: SceneObject): string {
  const transition = object.doorTransition;
  if (!transition) {
    return "missing source transition payload";
  }
  const hasTarget =
    transition.linkedTarget.trim().length > 0 ||
    transition.linkedTag.trim().length > 0 ||
    transition.linkedModule.trim().length > 0 ||
    transition.linkedWaypoint.trim().length > 0;
  const hasMetadata =
    transition.loadScreen.trim().length > 0 ||
    Object.keys(transition.flags).length > 0 ||
    Object.keys(transition.extra ?? {}).length > 0;
  if (hasTarget) {
    return "source transition/link payload preserved";
  }
  return hasMetadata
    ? "source transition metadata preserved; no linked target"
    : "transition payload has no link metadata";
}

function resolveDoorTransitionSourceStatus(object: SceneObject): string {
  if (object.kind !== "doors") {
    return "not-applicable";
  }
  return object.doorTransition ? "source-backed-transition-payload" : "missing-git-transition-payload";
}

function formatDoorTransitionValue(value: string): string {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : "empty";
}

function formatDoorTransitionExtra(
  extra: NonNullable<SceneObject["doorTransition"]>["extra"]
): string {
  const entries = Object.entries(extra ?? {});
  if (entries.length === 0) {
    return "none";
  }
  return entries
    .map(([key, value]) => `${key}=${value === null ? "null" : String(value)}`)
    .join(", ");
}

function readDoorTransitionExtraValue(
  transition: NonNullable<SceneObject["doorTransition"]>,
  key: string
): string {
  const value = transition.extra?.[key];
  if (value === undefined) {
    return "missing";
  }
  return value === null ? "null" : String(value);
}

function resolveDoorTransitionEvidenceLabel(object: SceneObject): string {
  const transition = object.doorTransition;
  if (!transition) {
    return "missing: Area GIT/API scene payload has no LinkedTo, TransitionDestin, LinkedToModule, or LoadScreenID for this door";
  }
  return [
    `LinkedTo ${formatDoorTransitionValue(transition.linkedTarget)}`,
    `TransitionDestination ${formatDoorTransitionValue(transition.linkedTag)}`,
    `LinkedToModule ${formatDoorTransitionValue(transition.linkedModule)}`,
    `LinkedWaypoint ${formatDoorTransitionValue(transition.linkedWaypoint)}`,
    `LoadScreenID ${formatDoorTransitionValue(transition.loadScreen)}`,
    `LinkedToFlags ${readDoorTransitionExtraValue(transition, "linkedToFlags")}`,
    `extra ${formatDoorTransitionExtra(transition.extra)}`
  ].join("; ");
}

function resolveDoorTransitionRuntimeLabel(object: SceneObject): string {
  return object.doorTransition
    ? "blocked: preserve-only payload; runtime transition execution is not wired"
    : "blocked: no source transition payload to execute";
}

function resolveDoorTransitionBlockerLabel(object: SceneObject): string {
  const transition = object.doorTransition;
  const blockers: string[] = [];
  if (!transition) {
    blockers.push("GIT transition/link payload missing from scene contract");
  } else if (
    transition.linkedTarget.trim().length === 0 &&
    transition.linkedTag.trim().length === 0 &&
    transition.linkedModule.trim().length === 0 &&
    transition.linkedWaypoint.trim().length === 0
  ) {
    blockers.push("source transition payload has no linked target/module/destination");
  }
  blockers.push("runtime transition execution not implemented");
  blockers.push("DWK/WOK walkmesh behavior not implemented");
  blockers.push("browser-selected transition proof not captured");
  return blockers.join("; ");
}

function resolveDoorAppearanceContractLabel(object: SceneObject): string {
  const sourceAppearanceType = object.source?.appearanceType;
  if (typeof sourceAppearanceType === "number" && Number.isFinite(sourceAppearanceType)) {
    return `GIT Appearance ${sourceAppearanceType}`;
  }
  return "missing: Area door payload does not carry source Appearance";
}

function resolveDoorGenericTypeContractLabel(object: SceneObject, draft: DoorPropertiesDraft): string {
  const sourceGenericType = object.source?.genericType;
  if (typeof sourceGenericType === "number" && Number.isFinite(sourceGenericType)) {
    return `GIT GenericType ${sourceGenericType}`;
  }
  return `editor draft ${draft.genericAppearance}; no source-backed generic type in Area payload`;
}

function readDoorPayloadMetadataValue(
  payload: PlaceableViewportRenderPayload | null | undefined,
  keys: string[]
): string | null {
  const metadata = payload?.placeable.metadata;
  if (!metadata) {
    return null;
  }
  for (const key of keys) {
    const value = metadata[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
    if (typeof value === "boolean") {
      return value ? "true" : "false";
    }
  }
  return null;
}

function resolveDoorTwoDaLookupStatus(
  object: SceneObject,
  payload: PlaceableViewportRenderPayload | null | undefined
): "ready" | "partial" | "blocked" {
  if (!payload) {
    return "blocked";
  }
  const hasSourceAppearance =
    typeof object.source?.appearanceType === "number" &&
    Number.isFinite(object.source.appearanceType);
  const hasSourceGenericType =
    typeof object.source?.genericType === "number" && Number.isFinite(object.source.genericType);
  const hasDoorModel =
    readDoorPayloadMetadataValue(payload, [
      "doorLookupModelResRef",
      "genericdoors2daModelResRef",
      "doortypes2daModelResRef"
    ]) !== null;
  const hasDoorRow =
    readDoorPayloadMetadataValue(payload, ["doortypes2daRow", "genericdoors2daRow"]) !== null;
  const hasDoorSource =
    readDoorPayloadMetadataValue(payload, [
      "doortypes2daSourceKey",
      "genericdoors2daSourceKey",
      "doortypes2daAvailable",
      "genericdoors2daAvailable"
    ]) !== null;
  if (hasSourceAppearance && hasSourceGenericType && hasDoorModel) {
    return "ready";
  }
  if (hasDoorRow || hasDoorSource || hasSourceAppearance || hasSourceGenericType) {
    return "partial";
  }
  return "blocked";
}

function formatDoorTwoDaRowEvidence(
  tableLabel: string,
  row: string | null,
  label: string | null,
  model: string | null,
  source: string | null,
  available: string | null,
  missingRowReason: string
): string {
  if (row) {
    return [
      `${tableLabel} row ${row}`,
      label ? `label ${label}` : "label missing",
      model ? `model ${model}` : "model missing",
      source ? `source ${source}` : "source key missing"
    ].join(" / ");
  }
  if (available === "true") {
    return `${tableLabel} source indexed; ${missingRowReason}`;
  }
  if (source) {
    return `${tableLabel} source ${source}; ${missingRowReason}`;
  }
  return `${tableLabel} source missing`;
}

function resolveDoorTwoDaContractLabel(
  object: SceneObject,
  payload: PlaceableViewportRenderPayload | null | undefined
): string {
  if (!payload) {
    return "blocked: UTD/template payload not loaded, so doortypes/genericdoors lookup metadata is unavailable";
  }
  const path =
    readDoorPayloadMetadataValue(payload, ["doorLookupPath"]) ??
    "templateAppearanceGenericType>doortypes2da>genericdoors2da>modelAsset";
  const appearance =
    readDoorPayloadMetadataValue(payload, ["doorLookupAppearanceId", "appearanceId"]) ??
    (typeof object.source?.appearanceType === "number"
      ? String(object.source.appearanceType)
      : null);
  const genericType =
    readDoorPayloadMetadataValue(payload, ["doorLookupGenericType", "genericType"]) ??
    (typeof object.source?.genericType === "number" ? String(object.source.genericType) : null);
  const model = readDoorPayloadMetadataValue(payload, [
    "doorLookupModelResRef",
    "genericdoors2daModelResRef",
    "doortypes2daModelResRef"
  ]);
  return [
    path,
    appearance ? `Appearance ${appearance}` : "missing Appearance",
    genericType ? `GenericType ${genericType}` : "missing GenericType",
    model ? `model ${model}` : "model unresolved"
  ].join("; ");
}

function resolveDoorTemplateResolverLabel(
  object: SceneObject,
  payload: PlaceableViewportRenderPayload | null | undefined
): string {
  const sourceKey = readDoorPayloadMetadataValue(payload, ["sourceObjectKey"]);
  const templateResRef = readDoorPayloadMetadataValue(payload, [
    "templateResRef",
    "lookupTemplateResRef"
  ]);
  if (payload) {
    return [
      `UTD payload ${templateResRef ?? payload.placeable.resref}`,
      sourceKey ? `source ${sourceKey}` : "source key missing"
    ].join("; ");
  }
  const templateId = object.source?.templateId ?? object.resRef;
  return templateId
    ? `${templateId}; UTD/template payload not loaded`
    : "blocked: source template id missing";
}

function resolveDoorUtdAppearanceLabel(
  payload: PlaceableViewportRenderPayload | null | undefined
): string {
  const metadataAppearance = readDoorPayloadMetadataValue(payload, ["appearanceId"]);
  const runtimeAppearance = payload?.placeable.placeableRuntime?.state?.appearanceType;
  if (metadataAppearance) {
    return `UTD Appearance ${metadataAppearance}`;
  }
  if (typeof runtimeAppearance === "number" && Number.isFinite(runtimeAppearance)) {
    return `runtime Appearance ${runtimeAppearance}`;
  }
  return payload
    ? "missing: parsed UTD payload has no Appearance metadata"
    : "blocked: UTD payload not loaded";
}

function resolveDoorUtdModelLabel(
  payload: PlaceableViewportRenderPayload | null | undefined
): string {
  return (
    readDoorPayloadMetadataValue(payload, [
      "doorLookupModelResRef",
      "genericdoors2daModelResRef",
      "doortypes2daModelResRef",
      "lookupModelResRef",
      "modelResRef",
      "modelName"
    ]) ??
    (payload ? "missing: UTD/model metadata not exposed" : "blocked: UTD payload not loaded")
  );
}

function resolveDoorTwoDaResolverInventoryLabel(
  object: SceneObject,
  payload: PlaceableViewportRenderPayload | null | undefined
): string {
  const hasAppearance =
    typeof object.source?.appearanceType === "number" &&
    Number.isFinite(object.source.appearanceType);
  const hasGenericType =
    typeof object.source?.genericType === "number" && Number.isFinite(object.source.genericType);
  const hasUtdAppearance = readDoorPayloadMetadataValue(payload, ["appearanceId"]) !== null;
  const utdGenericType = readDoorPayloadMetadataValue(payload, [
    "doorLookupGenericType",
    "genericType"
  ]);
  const doortypesAvailable = readDoorPayloadMetadataValue(payload, ["doortypes2daAvailable"]);
  const genericdoorsAvailable = readDoorPayloadMetadataValue(payload, ["genericdoors2daAvailable"]);
  const doortypesEvidence = formatDoorTwoDaRowEvidence(
    "doortypes.2da",
    readDoorPayloadMetadataValue(payload, ["doortypes2daRow"]),
    readDoorPayloadMetadataValue(payload, ["doortypes2daLabel"]),
    readDoorPayloadMetadataValue(payload, ["doortypes2daModelResRef"]),
    readDoorPayloadMetadataValue(payload, ["doortypes2daSourceKey"]),
    doortypesAvailable,
    "no row matched UTD Appearance"
  );
  const genericdoorsEvidence = formatDoorTwoDaRowEvidence(
    "genericdoors.2da",
    readDoorPayloadMetadataValue(payload, ["genericdoors2daRow"]),
    readDoorPayloadMetadataValue(payload, ["genericdoors2daLabel"]),
    readDoorPayloadMetadataValue(payload, ["genericdoors2daModelResRef"]),
    readDoorPayloadMetadataValue(payload, ["genericdoors2daSourceKey"]),
    genericdoorsAvailable,
    "no row matched UTD GenericType"
  );
  const sourceFields = [
    hasAppearance ? "Appearance" : "missing Appearance",
    hasGenericType ? "GenericType" : "missing GenericType",
    hasUtdAppearance ? "UTD Appearance" : "missing UTD Appearance",
    utdGenericType ? "UTD GenericType" : "missing UTD GenericType"
  ].join(", ");
  return `${sourceFields}; ${doortypesEvidence}; ${genericdoorsEvidence}`;
}

function resolveDoorModelAssetContractLabel(
  renderState: PlaceableRenderContractState | null,
  payload: PlaceableViewportRenderPayload | null | undefined
): string {
  if (renderState?.modelUrl) {
    return `model asset URL ready / ${renderState.modelStatus ?? "status unknown"}`;
  }
  if (renderState?.hasModelContract) {
    return "model contract present; delivery URL missing";
  }
  return payload
    ? "blocked: UTD payload loaded but no door model asset handoff"
    : "blocked: no source-backed door model asset handoff";
}

function resolveDoorModelBlocker(
  object: SceneObject,
  payload: PlaceableViewportRenderPayload | null | undefined,
  renderState: PlaceableRenderContractState | null
): string {
  const blockers: string[] = [];
  const sourceAppearanceType = object.source?.appearanceType;
  const sourceGenericType = object.source?.genericType;
  const utdAppearance = readDoorPayloadMetadataValue(payload, ["appearanceId"]);
  const utdModel = readDoorPayloadMetadataValue(payload, [
    "doorLookupModelResRef",
    "genericdoors2daModelResRef",
    "doortypes2daModelResRef",
    "lookupModelResRef",
    "modelResRef",
    "modelName"
  ]);
  const doortypesAvailable = readDoorPayloadMetadataValue(payload, ["doortypes2daAvailable"]);
  const genericdoorsAvailable = readDoorPayloadMetadataValue(payload, ["genericdoors2daAvailable"]);
  const doortypesRow = readDoorPayloadMetadataValue(payload, ["doortypes2daRow"]);
  const genericdoorsRow = readDoorPayloadMetadataValue(payload, ["genericdoors2daRow"]);
  const doortypesModel = readDoorPayloadMetadataValue(payload, ["doortypes2daModelResRef"]);
  const genericdoorsModel = readDoorPayloadMetadataValue(payload, ["genericdoors2daModelResRef"]);
  if (typeof sourceAppearanceType !== "number" || !Number.isFinite(sourceAppearanceType)) {
    blockers.push("Area door Appearance is not preserved");
  }
  if (typeof sourceGenericType !== "number" || !Number.isFinite(sourceGenericType)) {
    blockers.push("Area door GenericType is not preserved");
  }
  if (!payload) {
    blockers.push("UTD/template render payload is not loaded");
  }
  if (payload && !utdAppearance) {
    blockers.push("UTD Appearance metadata is missing");
  }
  if (payload && doortypesAvailable !== "true") {
    blockers.push("doortypes.2da source is not indexed");
  }
  if (payload && doortypesAvailable === "true" && !doortypesRow) {
    blockers.push("doortypes.2da row for UTD Appearance is missing");
  }
  if (payload && doortypesRow && !doortypesModel) {
    blockers.push("doortypes.2da row has no model resref");
  }
  if (payload && genericdoorsAvailable !== "true") {
    blockers.push("genericdoors.2da source is not indexed");
  }
  if (payload && genericdoorsAvailable === "true" && !genericdoorsRow) {
    blockers.push("genericdoors.2da row for UTD GenericType is missing");
  }
  if (payload && genericdoorsRow && !genericdoorsModel) {
    blockers.push("genericdoors.2da row has no model resref");
  }
  if (payload && !utdModel) {
    blockers.push("door doortypes/genericdoors model resref is missing");
  }
  if (payload && !renderState?.modelUrl) {
    blockers.push("door model asset delivery URL is not ready");
  }
  blockers.push(
    "real door MDL animation, transition runtime, DWK/WOK walkmesh behavior, browser proof, and retail parity are not implemented"
  );
  return blockers.join("; ");
}

export function DoorPropertiesDialog({
  doorPropertiesDialog,
  doorRenderPayload = null,
  doorPropertiesDialogRef,
  toggleDoorPropertiesDialogCollapsed,
  cancelDoorPropertiesDialog,
  setDoorPropertiesActiveTab,
  updateDoorPropertiesDraftField,
  updateDoorLockDraftField,
  updateDoorTrapDraftField,
  updateDoorScriptSlotDraftField,
  updateDoorAdvancedDraftField,
  updateDoorTransitionDraftField,
  applyDoorPropertiesDraft,
  startDoorPropertiesDialogDrag,
  moveDoorPropertiesDialogDrag,
  endDoorPropertiesDialogDrag,
  cancelDoorPropertiesDialogDrag
}: DoorPropertiesDialogProps) {
  const sourceObject = doorPropertiesDialog.snapshotObject;
  const doorRenderState = doorRenderPayload
    ? resolvePlaceableRenderContractState(doorRenderPayload)
    : null;
  const doorModelBlocker = resolveDoorModelBlocker(
    sourceObject,
    doorRenderPayload,
    doorRenderState
  );
  const doorTransitionStatus = resolveDoorTransitionSourceStatus(sourceObject);
  const doorTransitionEvidence = resolveDoorTransitionEvidenceLabel(sourceObject);
  const doorTransitionRuntime = resolveDoorTransitionRuntimeLabel(sourceObject);
  const doorTransitionBlocker = resolveDoorTransitionBlockerLabel(sourceObject);
  const doorTwoDaLookupStatus = resolveDoorTwoDaLookupStatus(sourceObject, doorRenderPayload);
  const doorTwoDaLookupEvidence = resolveDoorTwoDaResolverInventoryLabel(
    sourceObject,
    doorRenderPayload
  );

  return (
    <SharedPropertyDialogChrome
      articleRef={doorPropertiesDialogRef}
      articleClassName="canvas-door-properties-dialog"
      ariaLabel="Door properties"
      windowX={doorPropertiesDialog.windowX}
      windowY={doorPropertiesDialog.windowY}
      headerClassName="canvas-door-properties-header"
      headerCopyClassName="canvas-door-properties-header-copy"
      headerActionsClassName="canvas-door-properties-header-actions"
      title="Door Properties"
      subtitle={doorPropertiesDialog.draft.tag || doorPropertiesDialog.objectId}
      collapsed={doorPropertiesDialog.collapsed}
      collapseLabel="Collapse door properties dialog"
      expandLabel="Expand door properties dialog"
      closeLabel="Close door properties dialog"
      onToggleCollapsed={toggleDoorPropertiesDialogCollapsed}
      onClose={cancelDoorPropertiesDialog}
      onArticleMouseDown={(event) => event.stopPropagation()}
      onArticleContextMenu={(event) => event.preventDefault()}
      onHeaderPointerDown={startDoorPropertiesDialogDrag}
      onHeaderPointerMove={moveDoorPropertiesDialogDrag}
      onHeaderPointerUp={endDoorPropertiesDialogDrag}
      onHeaderPointerCancel={cancelDoorPropertiesDialogDrag}
    >
      <>
          <SharedPropertyTabsNav
            className="canvas-door-properties-tabs"
            ariaLabel="door properties tabs"
            tabs={DOOR_PROPERTIES_TAB_OPTIONS}
            activeTab={doorPropertiesDialog.activeTab}
            onSelectTab={setDoorPropertiesActiveTab}
          />

          <section
            className="canvas-area-object-evidence-panel"
            aria-label="Aurora door source and render handoff"
            data-source-status={sourceObject.source?.type === "aurora_git" ? "source-backed" : "fallback"}
            data-model-handoff-status={doorRenderState?.modelUrl ? "door-model-url-ready" : "door-model-blocked"}
            data-template-resolver-status={doorRenderPayload ? "utd-payload-loaded" : "utd-payload-missing"}
            data-door-2da-lookup-status={doorTwoDaLookupStatus}
            data-door-2da-lookup-evidence={doorTwoDaLookupEvidence}
            data-transition-source-status={doorTransitionStatus}
            data-transition-evidence={doorTransitionEvidence}
            data-transition-runtime-status="blocked-preserve-only"
            data-transition-blocker={doorTransitionBlocker}
            data-poc-model-path="template-appearance-generic-type-doortypes-genericdoors-model-asset"
            data-poc-model-blocker={doorModelBlocker}
          >
            <div className="canvas-area-object-evidence-header">
              <h3>Aurora Source / Door Handoff</h3>
              <span className="canvas-area-object-evidence-chip is-blocked">
                door model blocked
              </span>
            </div>
            <dl className="canvas-area-object-evidence-grid">
              <div>
                <dt>Source</dt>
                <dd>{resolveSourceStatusLabel(sourceObject)}</dd>
              </div>
              <div>
                <dt>Source ID</dt>
                <dd>{resolveSourceIdLabel(sourceObject)}</dd>
              </div>
              <div>
                <dt>Template</dt>
                <dd>{resolveTemplateIdLabel(sourceObject)}</dd>
              </div>
              <div>
                <dt>Placement</dt>
                <dd>{resolvePlacementLabel(sourceObject)}</dd>
              </div>
              <div>
                <dt>POC Model Path</dt>
                <dd>template/appearance/generic type -&gt; doortypes/genericdoors -&gt; model asset</dd>
              </div>
              <div>
                <dt>Appearance</dt>
                <dd>{resolveDoorAppearanceContractLabel(sourceObject)}</dd>
              </div>
              <div>
                <dt>Generic Type</dt>
                <dd>
                  {resolveDoorGenericTypeContractLabel(sourceObject, doorPropertiesDialog.draft)}
                </dd>
              </div>
              <div>
                <dt>2DA Lookup</dt>
                <dd>{resolveDoorTwoDaContractLabel(sourceObject, doorRenderPayload)}</dd>
              </div>
              <div>
                <dt>Template Resolver</dt>
                <dd>{resolveDoorTemplateResolverLabel(sourceObject, doorRenderPayload)}</dd>
              </div>
              <div>
                <dt>UTD Appearance</dt>
                <dd>{resolveDoorUtdAppearanceLabel(doorRenderPayload)}</dd>
              </div>
              <div>
                <dt>UTD Model</dt>
                <dd>{resolveDoorUtdModelLabel(doorRenderPayload)}</dd>
              </div>
              <div>
                <dt>Resolver Inputs</dt>
                <dd>{doorTwoDaLookupEvidence}</dd>
              </div>
              <div>
                <dt>Model Asset</dt>
                <dd>{resolveDoorModelAssetContractLabel(doorRenderState, doorRenderPayload)}</dd>
              </div>
              <div>
                <dt>Render Path</dt>
                <dd>
                  {doorRenderState?.modelUrl
                    ? "source-backed door model handoff when delivery completes"
                    : "upright source marker; no source-backed door model handoff yet"}
                </dd>
              </div>
              <div>
                <dt>Transition</dt>
                <dd>{resolveDoorTransitionStatus(sourceObject)}</dd>
              </div>
              <div>
                <dt>Transition Source</dt>
                <dd>{doorTransitionEvidence}</dd>
              </div>
              <div>
                <dt>Runtime Transition</dt>
                <dd>{doorTransitionRuntime}</dd>
              </div>
              <div>
                <dt>Transition Blocker</dt>
                <dd>{doorTransitionBlocker}</dd>
              </div>
              <div>
                <dt>Walkmesh</dt>
                <dd>DWK/WOK not implemented</dd>
              </div>
              <div>
                <dt>Blocker</dt>
                <dd>{doorModelBlocker}</dd>
              </div>
            </dl>
          </section>

          {doorPropertiesDialog.activeTab === "basic" ? (
            <section className="canvas-door-properties-shell">
              <fieldset className="canvas-door-properties-group">
                <legend>Basic</legend>
                <label>
                  Name
                  <input
                    type="text"
                    value={doorPropertiesDialog.draft.name}
                    onChange={(event) =>
                      updateDoorPropertiesDraftField("name", event.target.value)
                    }
                  />
                </label>
                <label>
                  Tag
                  <input
                    type="text"
                    value={doorPropertiesDialog.draft.tag}
                    onChange={(event) =>
                      updateDoorPropertiesDraftField("tag", event.target.value)
                    }
                  />
                </label>
                <label>
                  Appearance Type
                  <select
                    value={doorPropertiesDialog.draft.appearanceType}
                    onChange={(event) =>
                      updateDoorPropertiesDraftField("appearanceType", event.target.value)
                    }
                  >
                    {DOOR_APPEARANCE_TYPE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Generic Appearance
                  <select
                    value={doorPropertiesDialog.draft.genericAppearance}
                    onChange={(event) =>
                      updateDoorPropertiesDraftField("genericAppearance", event.target.value)
                    }
                  >
                    {DOOR_GENERIC_APPEARANCE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="canvas-placeable-properties-toggle">
                  <input
                    type="checkbox"
                    checked={doorPropertiesDialog.draft.plot}
                    onChange={(event) =>
                      updateDoorPropertiesDraftField("plot", event.target.checked)
                    }
                  />
                  Plot
                </label>
                <label>
                  Hardness
                  <input
                    type="number"
                    step="1"
                    value={doorPropertiesDialog.draft.hardness}
                    onChange={(event) =>
                      updateDoorPropertiesDraftField(
                        "hardness",
                        Math.max(0, Number.parseFloat(event.target.value) || 0)
                      )
                    }
                  />
                </label>
                <label>
                  Hit Points
                  <input
                    type="number"
                    step="1"
                    value={doorPropertiesDialog.draft.hitPoints}
                    onChange={(event) =>
                      updateDoorPropertiesDraftField(
                        "hitPoints",
                        Math.max(0, Number.parseFloat(event.target.value) || 0)
                      )
                    }
                  />
                </label>
                <label>
                  Fortitude Save
                  <input
                    type="number"
                    step="1"
                    value={doorPropertiesDialog.draft.fortitudeSave}
                    onChange={(event) =>
                      updateDoorPropertiesDraftField(
                        "fortitudeSave",
                        Number.parseFloat(event.target.value) || 0
                      )
                    }
                  />
                </label>
                <label>
                  Reflex Save
                  <input
                    type="number"
                    step="1"
                    value={doorPropertiesDialog.draft.reflexSave}
                    onChange={(event) =>
                      updateDoorPropertiesDraftField(
                        "reflexSave",
                        Number.parseFloat(event.target.value) || 0
                      )
                    }
                  />
                </label>
                <label>
                  Will Save
                  <input
                    type="number"
                    step="1"
                    value={doorPropertiesDialog.draft.willSave}
                    onChange={(event) =>
                      updateDoorPropertiesDraftField(
                        "willSave",
                        Number.parseFloat(event.target.value) || 0
                      )
                    }
                  />
                </label>
              </fieldset>
            </section>
          ) : null}

          {doorPropertiesDialog.activeTab === "lock" ? (
            <section className="canvas-door-properties-shell">
              <SharedLockPropertySection
                value={doorPropertiesDialog.draft.lockSettings}
                onChange={updateDoorLockDraftField}
                legend="Lock"
                classNames={{
                  root: "canvas-door-properties-group",
                  toggle: "canvas-placeable-properties-toggle"
                }}
              />
            </section>
          ) : null}

          {doorPropertiesDialog.activeTab === "trap" ? (
            <section className="canvas-door-properties-shell">
              <SharedTrapPropertySection
                value={doorPropertiesDialog.draft.trapSettings}
                onChange={updateDoorTrapDraftField}
                trapTypeOptions={PLACEABLE_TRAP_TYPE_OPTIONS}
                legend="Trap"
                classNames={{
                  root: "canvas-door-properties-group",
                  nested: "canvas-door-properties-group",
                  toggle: "canvas-placeable-properties-toggle"
                }}
              />
            </section>
          ) : null}

          {doorPropertiesDialog.activeTab === "areaTransition" ? (
            <section className="canvas-door-properties-shell">
              <fieldset className="canvas-door-properties-group">
                <legend>Area Transition</legend>
                <label>
                  Destination Tag
                  <input
                    type="text"
                    value={doorPropertiesDialog.draft.destinationTag}
                    onChange={(event) =>
                      updateDoorTransitionDraftField("destinationTag", event.target.value)
                    }
                  />
                </label>
                <fieldset className="canvas-door-properties-group">
                  <legend>Destination Type</legend>
                  <label className="canvas-placeable-properties-toggle">
                    <input
                      type="radio"
                      name={`door-destination-type-${doorPropertiesDialog.objectId}`}
                      checked={doorPropertiesDialog.draft.destinationType === "none"}
                      onChange={() => updateDoorTransitionDraftField("destinationType", "none")}
                    />
                    None
                  </label>
                  <label className="canvas-placeable-properties-toggle">
                    <input
                      type="radio"
                      name={`door-destination-type-${doorPropertiesDialog.objectId}`}
                      checked={doorPropertiesDialog.draft.destinationType === "door"}
                      onChange={() => updateDoorTransitionDraftField("destinationType", "door")}
                    />
                    Door
                  </label>
                  <label className="canvas-placeable-properties-toggle">
                    <input
                      type="radio"
                      name={`door-destination-type-${doorPropertiesDialog.objectId}`}
                      checked={doorPropertiesDialog.draft.destinationType === "waypoint"}
                      onChange={() =>
                        updateDoorTransitionDraftField("destinationType", "waypoint")
                      }
                    />
                    Waypoint
                  </label>
                </fieldset>
                <label>
                  Linked Target
                  <input
                    type="text"
                    value={doorPropertiesDialog.draft.linkedTarget}
                    onChange={(event) =>
                      updateDoorTransitionDraftField("linkedTarget", event.target.value)
                    }
                  />
                </label>
                <label>
                  Linked Module
                  <input
                    type="text"
                    value={doorPropertiesDialog.draft.linkedModule}
                    onChange={(event) =>
                      updateDoorTransitionDraftField("linkedModule", event.target.value)
                    }
                  />
                </label>
                <label>
                  Linked Waypoint
                  <input
                    type="text"
                    value={doorPropertiesDialog.draft.linkedWaypoint}
                    onChange={(event) =>
                      updateDoorTransitionDraftField("linkedWaypoint", event.target.value)
                    }
                  />
                </label>
                <label>
                  Loading Screen
                  <select
                    value={
                      doorPropertiesDialog.draft.loadScreen.trim().length > 0
                        ? doorPropertiesDialog.draft.loadScreen
                        : "Default"
                    }
                    onChange={(event) =>
                      updateDoorTransitionDraftField(
                        "loadScreen",
                        event.target.value === "Default" ? "" : event.target.value
                      )
                    }
                  >
                    <option value="Default">Default</option>
                    {doorPropertiesDialog.draft.loadScreen.trim().length > 0 ? (
                      <option value={doorPropertiesDialog.draft.loadScreen}>
                        {doorPropertiesDialog.draft.loadScreen}
                      </option>
                    ) : null}
                  </select>
                </label>
                <button type="button">Setup Area Transition</button>
                <label>
                  Flags
                  <input type="text" value={doorPropertiesDialog.draft.flagsSummary} readOnly />
                </label>
              </fieldset>
            </section>
          ) : null}

          {doorPropertiesDialog.activeTab === "scripts" ? (
            <section className="canvas-door-properties-shell">
              <SharedScriptSlotSection
                className="canvas-door-properties-group"
                slots={DOOR_SCRIPT_SLOT_KEYS}
                labels={DOOR_SCRIPT_SLOT_LABELS}
                values={doorPropertiesDialog.draft.scriptSlots}
                onChange={updateDoorScriptSlotDraftField}
                inputIdPrefix="door-script"
                legend="Scripts"
                showSaveLoadActions
                saveLoadActionsClassName="canvas-placeable-properties-script-actions"
                saveDisabled
                loadDisabled
              />
            </section>
          ) : null}

          {doorPropertiesDialog.activeTab === "advanced" ? (
            <section className="canvas-door-properties-shell">
              <SharedAdvancedSettingsSection
                sectionClassName="canvas-door-properties-group"
                toggleClassName="canvas-placeable-properties-toggle"
                variablesRowClassName="canvas-placeable-properties-variables-row"
                blueprintResRef={doorPropertiesDialog.draft.advancedSettings.blueprintResRef}
                onBlueprintResRefChange={(nextValue) =>
                  updateDoorAdvancedDraftField("blueprintResRef", nextValue)
                }
                belongsToFaction={doorPropertiesDialog.draft.advancedSettings.belongsToFaction}
                factionOptions={PLACEABLE_FACTION_OPTIONS}
                onBelongsToFactionChange={(nextValue) =>
                  updateDoorAdvancedDraftField("belongsToFaction", nextValue)
                }
                conversation={doorPropertiesDialog.draft.advancedSettings.conversation}
                onConversationChange={(nextValue) =>
                  updateDoorAdvancedDraftField("conversation", nextValue)
                }
                noInterrupt={doorPropertiesDialog.draft.advancedSettings.noInterrupt}
                onNoInterruptChange={(checked) =>
                  updateDoorAdvancedDraftField("noInterrupt", checked)
                }
                portraitResRef={doorPropertiesDialog.draft.advancedSettings.portraitResRef}
                showPortraitPreview={false}
                onPortraitResRefChange={(nextValue) =>
                  updateDoorAdvancedDraftField("portraitResRef", nextValue)
                }
                initialState={doorPropertiesDialog.draft.advancedSettings.initialState}
                initialStateOptions={DOOR_INITIAL_STATE_OPTIONS}
                onInitialStateChange={(nextValue) =>
                  updateDoorAdvancedDraftField("initialState", nextValue)
                }
              />
            </section>
          ) : null}

          {doorPropertiesDialog.activeTab === "description" ? (
            <section className="canvas-door-properties-shell">
              <SharedLongTextPropertySection
                sectionClassName="canvas-door-properties-group"
                legend="Description"
                label="Description"
                value={doorPropertiesDialog.draft.description}
                onChange={(nextValue) =>
                  updateDoorPropertiesDraftField("description", nextValue)
                }
                rows={9}
              />
            </section>
          ) : null}

          {doorPropertiesDialog.activeTab === "comments" ? (
            <section className="canvas-door-properties-shell">
              <SharedLongTextPropertySection
                sectionClassName="canvas-door-properties-group"
                legend="Comments"
                label="Comments"
                value={doorPropertiesDialog.draft.comments}
                onChange={(nextValue) => updateDoorPropertiesDraftField("comments", nextValue)}
                rows={9}
              />
            </section>
          ) : null}

          <SharedDialogActionsFooter
            className="canvas-door-properties-actions"
            onApply={() => applyDoorPropertiesDraft(false)}
            onOk={() => applyDoorPropertiesDraft(true)}
            onCancel={() => cancelDoorPropertiesDialog()}
          />
      </>
    </SharedPropertyDialogChrome>
  );
}
