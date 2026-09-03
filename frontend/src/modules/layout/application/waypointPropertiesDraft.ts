import type {
  SceneObject,
  SceneObjectWaypointVariableTargetEntry,
} from "../../scene/contracts";
import { canEditExistingWaypointTag } from "./waypointTagProvenance";
import { materializeExistingWaypointTag } from "./waypointTagProvenance";
import {
  canEditExistingWaypointTemplateResRef,
  materializeExistingWaypointTemplateResRef,
} from "./waypointTemplateResRefProvenance";
import { readWaypointTemplateResRefStorage } from
  "../../scene/domain/waypointTemplateResRef";
import {
  canEditExistingWaypointLocalizedName,
  materializeExistingWaypointLocalizedName,
  readExistingWaypointLocalizedName,
} from "./waypointLocalizedNameProvenance";
import {
  canEditExistingWaypointDescription,
  materializeExistingWaypointDescription,
  readExistingWaypointDescription,
} from "./waypointDescriptionProvenance";
import {
  canEditExistingWaypointEditorComment,
  materializeExistingWaypointEditorComment,
} from "./waypointEditorCommentProvenance";
import {
  canEditExistingWaypointMapNote,
  materializeExistingWaypointMapNote,
  readExistingWaypointMapNote,
} from "./waypointMapNoteProvenance";
import {
  canEditExistingWaypointVariables,
  materializeExistingWaypointVariables,
  readExistingWaypointVariables,
} from "./waypointVariableProvenance";
import { waypointVariableTargetEntriesEqual } from
  "../../scene/domain/waypointVariableTable";
import { cloneSceneObject } from "./workspaceSceneObjectClone";
import {
  canEditExistingWaypointAppearance,
  materializeExistingWaypointAppearance,
  readExistingWaypointAppearanceProvenance,
  type ExistingWaypointAppearanceCatalog,
} from "./waypointAppearanceProvenance";

export interface WaypointPropertiesDraft {
  readonly tagControlState: "ACTIVE_NOW" | "PRESERVE_ONLY";
  readonly tag: string;
  readonly templateResRefControlState: "ACTIVE_NOW" | "PRESERVE_ONLY";
  readonly templateResRef: string;
  readonly localizedNameControlState: "ACTIVE_NOW" | "PRESERVE_ONLY";
  readonly localizedName: string;
  readonly descriptionControlState: "ACTIVE_NOW" | "PRESERVE_ONLY";
  readonly description: string;
  readonly mapNoteControlState: "ACTIVE_NOW" | "PRESERVE_ONLY";
  readonly hasMapNote: boolean;
  readonly mapNoteText: string;
  readonly mapNoteEnabled: boolean;
  readonly appearanceControlState: "ACTIVE_NOW" | "PRESERVE_ONLY";
  readonly appearance: number;
  readonly variablesControlState: "ACTIVE_NOW" | "PRESERVE_ONLY";
  readonly variables: readonly SceneObjectWaypointVariableTargetEntry[];
  readonly commentsControlState: "ACTIVE_NOW" | "PRESERVE_ONLY";
  readonly comments: string;
}

export interface WaypointPropertiesDialogState {
  readonly objectId: string;
  readonly snapshotObject: SceneObject;
  readonly draft: WaypointPropertiesDraft;
  readonly windowX: number;
  readonly windowY: number;
  readonly anchorOffsetX: number;
  readonly anchorOffsetY: number;
  readonly collapsed: boolean;
}

export function buildWaypointPropertiesDraft(source: SceneObject): WaypointPropertiesDraft {
  const mapNote = source.waypointMapNote ?? readExistingWaypointMapNote(source.source);
  const templateResRefStorage = readWaypointTemplateResRefStorage(
    source.source?.waypointTemplateResRef,
  );
  return {
    tagControlState: source.kind === "waypoints" && canEditExistingWaypointTag(source.source)
      ? "ACTIVE_NOW"
      : "PRESERVE_ONLY",
    tag: source.tag,
    templateResRefControlState:
      source.kind === "waypoints" &&
      canEditExistingWaypointTemplateResRef(source.source)
        ? "ACTIVE_NOW"
        : "PRESERVE_ONLY",
    templateResRef:
      source.waypointTemplateResRef ??
      (templateResRefStorage?.present ? templateResRefStorage.value : ""),
    localizedNameControlState:
      source.kind === "waypoints" &&
      canEditExistingWaypointLocalizedName(source.source)
        ? "ACTIVE_NOW"
        : "PRESERVE_ONLY",
    localizedName:
      source.waypointLocalizedName ??
      readExistingWaypointLocalizedName(source.source) ??
      source.name ??
      "",
    descriptionControlState:
      source.kind === "waypoints" &&
      canEditExistingWaypointDescription(source.source)
        ? "ACTIVE_NOW"
        : "PRESERVE_ONLY",
    description:
      source.waypointDescription ??
      readExistingWaypointDescription(source.source) ??
      "",
    mapNoteControlState:
      source.kind === "waypoints" && canEditExistingWaypointMapNote(source.source)
        ? "ACTIVE_NOW"
        : "PRESERVE_ONLY",
    hasMapNote: mapNote?.hasMapNote ?? false,
    mapNoteText: mapNote?.mapNoteText ?? "",
    mapNoteEnabled: mapNote?.mapNoteEnabled ?? true,
    appearanceControlState:
      source.kind === "waypoints" && canEditExistingWaypointAppearance(source.source)
        ? "ACTIVE_NOW"
        : "PRESERVE_ONLY",
    appearance:
      source.waypointAppearance ??
      readExistingWaypointAppearanceProvenance(source.source)?.sourceRowIndex ??
      0,
    variablesControlState:
      source.kind === "waypoints" && canEditExistingWaypointVariables(source.source)
        ? "ACTIVE_NOW"
        : "PRESERVE_ONLY",
    variables:
      source.waypointVariables?.map((entry) => ({ ...entry })) ??
      readExistingWaypointVariables(source.source)?.map((entry) => ({ ...entry })) ??
      [],
    commentsControlState:
      source.kind === "waypoints" &&
      canEditExistingWaypointEditorComment(source.source)
        ? "ACTIVE_NOW"
        : "PRESERVE_ONLY",
    comments: source.waypointEditorComment ?? "",
  };
}

export function areWaypointPropertiesDraftsEqual(
  left: Readonly<WaypointPropertiesDraft>,
  right: Readonly<WaypointPropertiesDraft>,
): boolean {
  return left.tagControlState === right.tagControlState &&
    left.tag === right.tag &&
    left.templateResRefControlState === right.templateResRefControlState &&
    left.templateResRef === right.templateResRef &&
    left.localizedNameControlState === right.localizedNameControlState &&
    left.localizedName === right.localizedName &&
    left.descriptionControlState === right.descriptionControlState &&
    left.description === right.description &&
    left.mapNoteControlState === right.mapNoteControlState &&
    left.hasMapNote === right.hasMapNote &&
    left.mapNoteText === right.mapNoteText &&
    left.mapNoteEnabled === right.mapNoteEnabled &&
    left.appearanceControlState === right.appearanceControlState &&
    left.appearance === right.appearance &&
    left.variablesControlState === right.variablesControlState &&
    waypointVariableTargetEntriesEqual(left.variables, right.variables) &&
    left.commentsControlState === right.commentsControlState &&
    left.comments === right.comments;
}

export function materializeWaypointPropertiesDraft(
  source: SceneObject,
  draft: Readonly<WaypointPropertiesDraft>,
  appearanceCatalog?: ExistingWaypointAppearanceCatalog | null,
): SceneObject {
  const next = cloneSceneObject(source);
  if (source.kind !== "waypoints") return next;
  const waypointLocalizedName = materializeExistingWaypointLocalizedName(
    source.source,
    source.waypointLocalizedName,
    draft.localizedName,
  );
  const waypointDescription = materializeExistingWaypointDescription(
    source.source,
    source.waypointDescription,
    draft.description,
  );
  const waypointEditorComment = materializeExistingWaypointEditorComment(
    source.source,
    source.waypointEditorComment,
    draft.comments,
  );
  const waypointMapNote = materializeExistingWaypointMapNote(
    source.source,
    source.waypointMapNote,
    {
      hasMapNote: draft.hasMapNote,
      mapNoteText: draft.mapNoteText,
      mapNoteEnabled: draft.mapNoteEnabled,
    },
  );
  const waypointVariables = materializeExistingWaypointVariables(
    source.source,
    source.waypointVariables,
    draft.variables,
  );
  const waypointAppearance = materializeExistingWaypointAppearance(
    source.source,
    source.waypointAppearance,
    draft.appearance,
    appearanceCatalog,
  );
  const waypointTemplateResRef = materializeExistingWaypointTemplateResRef(
    source.source,
    source.waypointTemplateResRef ?? "",
    draft.templateResRef,
  );
  return {
    ...next,
    tag: materializeExistingWaypointTag(source.source, source.tag, draft.tag),
    ...(waypointTemplateResRef
      ? { waypointTemplateResRef }
      : {}),
    ...(waypointLocalizedName !== undefined
      ? {
          name: waypointLocalizedName,
          waypointLocalizedName,
        }
      : {}),
    ...(waypointDescription !== undefined
      ? { waypointDescription }
      : {}),
    ...(waypointMapNote !== undefined
      ? { waypointMapNote }
      : {}),
    ...(waypointAppearance !== undefined
      ? { waypointAppearance }
      : {}),
    ...(waypointVariables !== undefined
      ? { waypointVariables }
      : {}),
    ...(waypointEditorComment !== undefined
      ? { waypointEditorComment }
      : {}),
  };
}
