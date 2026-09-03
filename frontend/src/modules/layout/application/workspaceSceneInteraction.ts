import type { SelectionScope, WorkspaceToolbarState } from "./workspaceChromeFacade";
import type { AreaScene, SceneObject, SceneObjectKind, SceneTile } from "../contracts";
import { normalizeBearingDegrees } from "../../scene/domain/bearing";
import { isVisualTransformEditableForObject } from "../visualTransformGizmoRules";

export interface AdjustLocationDraft {
  x: number;
  y: number;
  z: number;
  bearingDeg: number;
  scale: number;
  scaleX: number;
  scaleY: number;
  scaleZ: number;
  xRotationDeg: number;
  yRotationDeg: number;
  zRotationDeg: number;
  xTranslation: number;
  yTranslation: number;
  zTranslation: number;
}

export interface AdjustLocationVisualTransformInput {
  scale: number;
  scaleX: number;
  scaleY: number;
  scaleZ: number;
  offsetX: number;
  offsetY: number;
  offsetZ: number;
  pitch: number;
  yaw: number;
  roll: number;
}

export type DebugState = WorkspaceToolbarState["canvasDebug"];
export type ObjectRenderStatus = "ok" | "warning" | "error" | "non_render";

export interface SceneGridVisibility {
  renderAreaGeometry: boolean;
  renderGridLayer: boolean;
  renderTileOverlayLayer: boolean;
}

export interface ObjectAddPayloadKeyInput {
  kind: SceneObjectKind;
  resRef: string;
  tag: string;
}

export const OBJECT_KIND_BY_SCOPE: Partial<Record<SelectionScope, SceneObjectKind>> = {
  creatures: "creatures",
  doors: "doors",
  encounters: "encounters",
  items: "items",
  placeables: "placeables",
  sounds: "sounds",
  stores: "stores",
  triggers: "triggers",
  waypoints: "waypoints"
};

export const MOVE_ALLOWED_KINDS = new Set<SceneObjectKind>([
  "placeables",
  "creatures",
  "encounters",
  "items",
  "sounds",
  "stores",
  "triggers",
  "waypoints"
]);

export const DEGREES_PER_RADIAN = 180 / Math.PI;
export const RADIANS_PER_DEGREE = Math.PI / 180;

const SCENE_COORDINATE_MIN = 0;
const SCENE_COORDINATE_EPSILON = 1e-4;
const VISUAL_SCALE_MIN = 0.01;
const OBJECT_ADD_PLACEMENT_CACHE_MAX_AGE_MS = 2000;

export function toDegrees(radians: number): number {
  return normalizeBearingDegrees(radians * DEGREES_PER_RADIAN);
}

export function toRadians(degrees: number): number {
  return normalizeBearingDegrees(degrees) * RADIANS_PER_DEGREE;
}

// Visual-transform pitch/yaw/roll are free tilt angles, not compass bearings.
// They must NOT be wrapped into [0, 360): a pitch of -30° is a distinct edit
// from 330° and wrapping breaks round-tripping and sign in the dialog inputs.
export function toVisualRotationDegrees(radians: number): number {
  return Number.isFinite(radians) ? radians * DEGREES_PER_RADIAN : 0;
}

export function toVisualRotationRadians(degrees: number): number {
  return Number.isFinite(degrees) ? degrees * RADIANS_PER_DEGREE : 0;
}

export function normalizeBearingDegreesForInput(value: number): number {
  const normalized = normalizeBearingDegrees(value);
  if (value > 0 && normalized === 0) {
    return 360;
  }
  return normalized;
}

export function resolveSceneCoordinateMax(size: number): number {
  if (!Number.isFinite(size)) {
    return SCENE_COORDINATE_MIN;
  }
  return Math.max(SCENE_COORDINATE_MIN, size - SCENE_COORDINATE_EPSILON);
}

export function toAdjustLocationCoordinate(
  worldCoordinate: number,
  sceneSize: number,
  unitsPerTile: number
): number {
  void sceneSize;
  return Math.max(0, worldCoordinate * unitsPerTile);
}

export function fromAdjustLocationCoordinate(
  adjustCoordinate: number,
  sceneSize: number,
  unitsPerTile: number
): number {
  const sceneMax = resolveSceneCoordinateMax(sceneSize);
  const nextWorld = adjustCoordinate / unitsPerTile;
  return Math.min(sceneMax, Math.max(SCENE_COORDINATE_MIN, nextWorld));
}

export function toAdjustLocationHeight(worldHeight: number, unitsPerTile: number): number {
  return worldHeight * unitsPerTile;
}

export function fromAdjustLocationHeight(adjustHeight: number, unitsPerTile: number): number {
  return adjustHeight / unitsPerTile;
}

export function toAdjustLocationVisualTranslation(
  worldOffset: number,
  unitsPerTile: number
): number {
  return toAdjustLocationHeight(worldOffset, unitsPerTile);
}

export function fromAdjustLocationVisualTranslation(
  adjustOffset: number,
  unitsPerTile: number
): number {
  return fromAdjustLocationHeight(adjustOffset, unitsPerTile);
}

export function normalizeAdjustLocationVisualScale(value: number, fallback = 1): number {
  const resolved = Number.isFinite(value) ? value : fallback;
  return Math.max(VISUAL_SCALE_MIN, resolved);
}

export function resolveAdjustLocationUniformVisualScale(
  scaleX: number,
  scaleY: number,
  scaleZ: number
): number {
  return normalizeAdjustLocationVisualScale((scaleX + scaleY + scaleZ) / 3);
}

export function resolveNextAdjustLocationDraftField(
  draft: AdjustLocationDraft,
  field: keyof AdjustLocationDraft,
  rawValue: string
): AdjustLocationDraft | null {
  const nextValue = Number(rawValue);
  if (!Number.isFinite(nextValue)) {
    return null;
  }
  const sanitizedValue =
    field === "bearingDeg"
      ? normalizeBearingDegreesForInput(nextValue)
      : field === "scale" || field === "scaleX" || field === "scaleY" || field === "scaleZ"
        ? normalizeAdjustLocationVisualScale(nextValue)
        : nextValue;

  if (field === "scale") {
    return {
      ...draft,
      scale: sanitizedValue,
      scaleX: sanitizedValue,
      scaleY: sanitizedValue,
      scaleZ: sanitizedValue
    };
  }

  if (field === "scaleX" || field === "scaleY" || field === "scaleZ") {
    const nextDraft = {
      ...draft,
      [field]: sanitizedValue
    };
    return {
      ...nextDraft,
      scale: resolveAdjustLocationUniformVisualScale(
        nextDraft.scaleX,
        nextDraft.scaleY,
        nextDraft.scaleZ
      )
    };
  }

  return {
    ...draft,
    [field]: sanitizedValue
  };
}

export function buildAdjustLocationDraft(
  source: SceneObject,
  unitsPerTile: number,
  sceneWidth: number,
  sceneHeight: number
): AdjustLocationDraft {
  const scaleX = normalizeAdjustLocationVisualScale(
    source.visualTransform.scaleX ?? source.visualTransform.scale
  );
  const scaleY = normalizeAdjustLocationVisualScale(
    source.visualTransform.scaleY ?? source.visualTransform.scale
  );
  const scaleZ = normalizeAdjustLocationVisualScale(
    source.visualTransform.scaleZ ?? source.visualTransform.scale
  );
  const zInAdjustUnits = toAdjustLocationHeight(source.z, unitsPerTile);
  const xTranslationInAdjustUnits = toAdjustLocationVisualTranslation(
    source.visualTransform.offsetX,
    unitsPerTile
  );
  const yTranslationInAdjustUnits = toAdjustLocationVisualTranslation(
    source.visualTransform.offsetY,
    unitsPerTile
  );
  const zTranslationInAdjustUnits = toAdjustLocationHeight(
    source.visualTransform.offsetZ,
    unitsPerTile
  );
  return {
    x: toAdjustLocationCoordinate(source.x, sceneWidth, unitsPerTile),
    y: toAdjustLocationCoordinate(source.y, sceneHeight, unitsPerTile),
    z: zInAdjustUnits,
    bearingDeg: toDegrees(source.bearing),
    scale: resolveAdjustLocationUniformVisualScale(scaleX, scaleY, scaleZ),
    scaleX,
    scaleY,
    scaleZ,
    xRotationDeg: toVisualRotationDegrees(source.visualTransform.pitch),
    yRotationDeg: toVisualRotationDegrees(source.visualTransform.yaw),
    zRotationDeg: toVisualRotationDegrees(source.visualTransform.roll),
    xTranslation: xTranslationInAdjustUnits,
    yTranslation: yTranslationInAdjustUnits,
    zTranslation: zTranslationInAdjustUnits
  };
}

export function areAdjustLocationDraftsEqual(
  left: AdjustLocationDraft,
  right: AdjustLocationDraft
): boolean {
  return (
    left.x === right.x &&
    left.y === right.y &&
    left.z === right.z &&
    left.bearingDeg === right.bearingDeg &&
    left.scale === right.scale &&
    left.scaleX === right.scaleX &&
    left.scaleY === right.scaleY &&
    left.scaleZ === right.scaleZ &&
    left.xRotationDeg === right.xRotationDeg &&
    left.yRotationDeg === right.yRotationDeg &&
    left.zRotationDeg === right.zRotationDeg &&
    left.xTranslation === right.xTranslation &&
    left.yTranslation === right.yTranslation &&
    left.zTranslation === right.zTranslation
  );
}

export function buildAdjustLocationVisualTransformInput(
  draft: AdjustLocationDraft,
  unitsPerTile: number
): AdjustLocationVisualTransformInput {
  const scaleX = normalizeAdjustLocationVisualScale(draft.scaleX);
  const scaleY = normalizeAdjustLocationVisualScale(draft.scaleY);
  const scaleZ = normalizeAdjustLocationVisualScale(draft.scaleZ);
  return {
    scale: resolveAdjustLocationUniformVisualScale(scaleX, scaleY, scaleZ),
    scaleX,
    scaleY,
    scaleZ,
    offsetX: fromAdjustLocationVisualTranslation(draft.xTranslation, unitsPerTile),
    offsetY: fromAdjustLocationVisualTranslation(draft.yTranslation, unitsPerTile),
    offsetZ: fromAdjustLocationVisualTranslation(draft.zTranslation, unitsPerTile),
    pitch: toVisualRotationRadians(draft.xRotationDeg),
    yaw: toVisualRotationRadians(draft.yRotationDeg),
    roll: toVisualRotationRadians(draft.zRotationDeg)
  };
}

export function areObjectPlacementsEqual(
  leftScene: AreaScene,
  rightScene: AreaScene,
  objectIds: string[],
  includeVisualTransforms: boolean
): boolean {
  return objectIds.every((id) => {
    const leftObject = leftScene.objects.find((object) => object.id === id);
    const rightObject = rightScene.objects.find((object) => object.id === id);
    if (!leftObject || !rightObject) {
      return false;
    }
    if (
      leftObject.x !== rightObject.x ||
      leftObject.y !== rightObject.y ||
      leftObject.z !== rightObject.z ||
      leftObject.bearing !== rightObject.bearing
    ) {
      return false;
    }
    if (!includeVisualTransforms) {
      return true;
    }
    return (
      leftObject.visualTransform.scale === rightObject.visualTransform.scale &&
      (leftObject.visualTransform.scaleX ?? leftObject.visualTransform.scale) ===
        (rightObject.visualTransform.scaleX ?? rightObject.visualTransform.scale) &&
      (leftObject.visualTransform.scaleY ?? leftObject.visualTransform.scale) ===
        (rightObject.visualTransform.scaleY ?? rightObject.visualTransform.scale) &&
      (leftObject.visualTransform.scaleZ ?? leftObject.visualTransform.scale) ===
        (rightObject.visualTransform.scaleZ ?? rightObject.visualTransform.scale) &&
      leftObject.visualTransform.offsetX === rightObject.visualTransform.offsetX &&
      leftObject.visualTransform.offsetY === rightObject.visualTransform.offsetY &&
      leftObject.visualTransform.offsetZ === rightObject.visualTransform.offsetZ &&
      leftObject.visualTransform.pitch === rightObject.visualTransform.pitch &&
      leftObject.visualTransform.yaw === rightObject.visualTransform.yaw &&
      leftObject.visualTransform.roll === rightObject.visualTransform.roll
    );
  });
}

export function resolveSceneObjectName(object: SceneObject): string {
  if (typeof object.name === "string" && object.name.trim().length > 0) {
    return object.name;
  }
  return object.tag;
}

export function resolveAdjustLocationVisualTransformMeta(targets: SceneObject[]): {
  showVisualTransforms: boolean;
  mixedStaticPlaceables: boolean;
} {
  const showVisualTransforms = targets.every((object) =>
    isVisualTransformEditableForObject(object)
  );
  if (!showVisualTransforms) {
    return {
      showVisualTransforms: false,
      mixedStaticPlaceables: false
    };
  }

  const placeables = targets.filter((object) => object.kind === "placeables");
  const hasStaticPlaceable = placeables.some((object) => object.isStatic ?? true);
  const hasNonStaticPlaceable = placeables.some((object) => !(object.isStatic ?? true));

  return {
    showVisualTransforms: true,
    mixedStaticPlaceables: hasStaticPlaceable && hasNonStaticPlaceable
  };
}

export function isObjectVisible(object: SceneObject, toolbarState: WorkspaceToolbarState): boolean {
  return Boolean(toolbarState.visibility[object.kind]);
}

export interface ObjectRenderFilterState {
  visibility: WorkspaceToolbarState["visibility"];
  isolateKind: DebugState["isolateKind"];
}

export function resolveRenderObjectIdsSet(
  renderObjectIds?: readonly string[] | null
): Set<string> | null {
  if (!Array.isArray(renderObjectIds) || renderObjectIds.length === 0) {
    return null;
  }

  const normalizedIds = renderObjectIds
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
  if (normalizedIds.length === 0) {
    return null;
  }

  return new Set(normalizedIds);
}

export function filterObjectsByRenderObjectIds<T extends { id: string }>(
  objects: readonly T[],
  renderObjectIds?: readonly string[] | null
): T[] {
  const renderObjectIdsSet = resolveRenderObjectIdsSet(renderObjectIds);
  if (renderObjectIdsSet === null) {
    return [...objects];
  }
  return objects.filter((object) => renderObjectIdsSet.has(object.id));
}

export function shouldRenderAreaGeometry(
  renderObjectIds?: readonly string[] | null
): boolean {
  return resolveRenderObjectIdsSet(renderObjectIds) === null;
}

export function resolveSceneGridVisibility(input: {
  renderObjectIds?: readonly string[] | null;
  gridEnabled: boolean;
  tileOverlayEnabled: boolean;
}): SceneGridVisibility {
  return {
    renderAreaGeometry: shouldRenderAreaGeometry(input.renderObjectIds),
    renderGridLayer: input.gridEnabled,
    renderTileOverlayLayer: input.tileOverlayEnabled
  };
}

export function resolveSceneObjectRenderScale(
  sceneScale: number,
  renderAreaGeometry: boolean
): number {
  if (renderAreaGeometry) {
    return sceneScale;
  }
  return 1;
}

export function isKindVisibleWithIsolation(
  debugState: DebugState,
  kind: SceneObjectKind
): boolean {
  return debugState.isolateKind === "none" || debugState.isolateKind === kind;
}

export function isObjectVisibleWithRenderFilter(
  object: SceneObject,
  toolbarState: WorkspaceToolbarState,
  renderObjectIdsSet: ReadonlySet<string> | null
): boolean {
  return isObjectVisibleWithRenderFilterState(
    object,
    {
      visibility: toolbarState.visibility,
      isolateKind: toolbarState.canvasDebug.isolateKind
    },
    renderObjectIdsSet
  );
}

export function isObjectVisibleWithRenderFilterState(
  object: SceneObject,
  filterState: ObjectRenderFilterState,
  renderObjectIdsSet: ReadonlySet<string> | null
): boolean {
  return (
    (renderObjectIdsSet === null || renderObjectIdsSet.has(object.id)) &&
    Boolean(filterState.visibility[object.kind]) &&
    (filterState.isolateKind === "none" || filterState.isolateKind === object.kind)
  );
}

export function isObjectSelectableByScope(
  object: SceneObject,
  selectionScope: SelectionScope
): boolean {
  if (selectionScope === "all") {
    return true;
  }
  return OBJECT_KIND_BY_SCOPE[selectionScope] === object.kind;
}

export function isObjectSelectableByCatalogScope(
  object: SceneObject,
  catalogScope: { sourceType: string; allowedObjectIds: string[] } | null | undefined,
  allowedIdsSet: Set<string>
): boolean {
  if (!catalogScope || catalogScope.sourceType === "all") {
    return true;
  }

  return allowedIdsSet.has(object.id);
}

export function filterSelectedObjectIdsForVisibleSelectableObjects(input: {
  selectedObjectIds: readonly string[];
  objectById: ReadonlyMap<string, SceneObject>;
  visibleObjectIdsSet: ReadonlySet<string>;
  isSelectableByActiveFilters: (object: SceneObject) => boolean;
}): string[] {
  return input.selectedObjectIds.filter((selectedId) => {
    if (!input.visibleObjectIdsSet.has(selectedId)) {
      return false;
    }
    const object = input.objectById.get(selectedId);
    if (!object) {
      return false;
    }
    return input.isSelectableByActiveFilters(object);
  });
}

export function resolveVisibleObjectForPropertiesSignal(input: {
  objects: readonly SceneObject[];
  objectId: string;
  objectKind: SceneObjectKind;
  toolbarState: WorkspaceToolbarState;
  renderObjectIdsSet: ReadonlySet<string> | null;
}): SceneObject | null {
  const identityMatch =
    input.objects.find((candidate) => candidate.id === input.objectId) ?? null;
  if (!identityMatch || identityMatch.kind !== input.objectKind) {
    return null;
  }
  // Trigger, Encounter, and Waypoint property dialogs edit logical Area
  // records. Their sidebar action must remain usable while the corresponding
  // canvas overlay is hidden; each dialog opener performs its stricter draft
  // or exact-provenance gate.
  if (
    identityMatch.kind === "triggers" ||
    identityMatch.kind === "encounters" ||
    identityMatch.kind === "waypoints"
  ) {
    return identityMatch;
  }
  const object = resolveVisibleObjectForSidebarSignal({
    objects: input.objects,
    objectId: input.objectId,
    toolbarState: input.toolbarState,
    renderObjectIdsSet: input.renderObjectIdsSet
  });
  if (!object || object.kind !== input.objectKind) {
    return null;
  }
  return object;
}

export function resolveVisibleObjectForSidebarSignal(input: {
  objects: readonly SceneObject[];
  objectId: string;
  toolbarState: WorkspaceToolbarState;
  renderObjectIdsSet: ReadonlySet<string> | null;
}): SceneObject | null {
  const object = input.objects.find((candidate) => candidate.id === input.objectId) ?? null;
  if (!object) {
    return null;
  }
  // Retained Stores are logical Area authoring objects and intentionally have
  // no canvas mesh. Their sidebar selection/context/properties flow therefore
  // cannot depend on canvas visibility or render membership.
  if (object.kind === "stores") {
    return object;
  }
  return isObjectVisibleWithRenderFilter(
    object,
    input.toolbarState,
    input.renderObjectIdsSet
  )
    ? object
    : null;
}

export function resolveSidebarSelectionIds(input: {
  currentSelectedObjectIds: readonly string[];
  selectedObject: SceneObject;
  additive: boolean;
  allowedObjectIds: readonly string[];
  objects: readonly SceneObject[];
  toolbarState: WorkspaceToolbarState;
  renderObjectIdsSet: ReadonlySet<string> | null;
}): string[] {
  if (!input.additive) {
    return [input.selectedObject.id];
  }

  const allowedSet = new Set(input.allowedObjectIds);
  const visibleAllowedIds = new Set(
    input.objects
      .filter(
        (object) =>
          allowedSet.has(object.id) &&
          isObjectVisibleWithRenderFilter(object, input.toolbarState, input.renderObjectIdsSet)
      )
      .map((object) => object.id)
  );
  const scopedCurrent = input.currentSelectedObjectIds.filter((id) => visibleAllowedIds.has(id));
  if (!visibleAllowedIds.has(input.selectedObject.id)) {
    return scopedCurrent;
  }
  if (scopedCurrent.includes(input.selectedObject.id)) {
    return scopedCurrent.filter((id) => id !== input.selectedObject.id);
  }

  return [...scopedCurrent, input.selectedObject.id];
}

export function filterVisibleSelectableCommandObjects(input: {
  visibleObjects: readonly SceneObject[];
  toolbarState: WorkspaceToolbarState;
  isSelectableByActiveFilters: (object: SceneObject) => boolean;
}): SceneObject[] {
  return input.visibleObjects.filter(
    (object) =>
      input.isSelectableByActiveFilters(object) &&
      !isKindLocked(input.toolbarState.canvasDebug, object.kind)
  );
}

export function resolveSelectSameResRefObjectIds(input: {
  selectedObjectIds: readonly string[];
  selectableObjects: readonly SceneObject[];
}): string[] {
  const anchor =
    input.selectableObjects.find((object) => input.selectedObjectIds.includes(object.id)) ?? null;
  if (!anchor) {
    return [];
  }

  return input.selectableObjects
    .filter((object) => object.resRef === anchor.resRef)
    .map((object) => object.id);
}

export function resolveInvertSelectionObjectIds(input: {
  selectedObjectIds: readonly string[];
  selectableObjects: readonly SceneObject[];
}): string[] {
  const selectedSet = new Set(input.selectedObjectIds);
  return input.selectableObjects
    .filter((object) => !selectedSet.has(object.id))
    .map((object) => object.id);
}

export function resolveRadiusSelectionObjectIds(input: {
  selectedObjectIds: readonly string[];
  selectableObjects: readonly SceneObject[];
  radius: number;
}): string[] {
  const selectedObjects = input.selectableObjects.filter((object) =>
    input.selectedObjectIds.includes(object.id)
  );
  if (selectedObjects.length === 0) {
    return [];
  }

  const centerX =
    selectedObjects.reduce((sum, object) => sum + object.x, 0) / selectedObjects.length;
  const centerY =
    selectedObjects.reduce((sum, object) => sum + object.y, 0) / selectedObjects.length;

  return input.selectableObjects
    .filter((object) => {
      const dx = object.x - centerX;
      const dy = object.y - centerY;
      return dx * dx + dy * dy <= input.radius * input.radius;
    })
    .map((object) => object.id);
}

export function filterUnlockedVisibleSelectedObjects(input: {
  selectedObjectIds: readonly string[];
  objects: readonly SceneObject[];
  toolbarState: WorkspaceToolbarState;
}): SceneObject[] {
  return input.objects.filter(
    (object) =>
      input.selectedObjectIds.includes(object.id) &&
      !isKindLocked(input.toolbarState.canvasDebug, object.kind)
  );
}

export function resolveVisibleSelectedObjects(input: {
  selectedObjectIds: readonly string[];
  objects: readonly SceneObject[];
}): SceneObject[] {
  const visibleObjectById = new Map(input.objects.map((object) => [object.id, object]));
  return input.selectedObjectIds
    .map((id) => visibleObjectById.get(id))
    .filter((object): object is SceneObject => Boolean(object));
}

export function resolveCreatedObjectSelectionIds(input: {
  objectId: string;
  renderObjectIdsSet: ReadonlySet<string> | null;
}): string[] {
  if (input.renderObjectIdsSet !== null && !input.renderObjectIdsSet.has(input.objectId)) {
    return [];
  }
  return [input.objectId];
}

export function resolveMovableVisibleSelection(input: {
  selectedObjectIds: readonly string[];
  objects: readonly SceneObject[];
  toolbarState: WorkspaceToolbarState;
}): { ids: string[]; reason?: string } {
  const selectedObjects = input.objects.filter((object) =>
    input.selectedObjectIds.includes(object.id)
  );
  if (selectedObjects.length === 0) {
    return { ids: [], reason: "selection_empty" };
  }

  if (selectedObjects.some((object) => object.kind === "doors")) {
    return { ids: [], reason: "selection_contains_doors" };
  }

  // Static placeables ARE movable in the Aurora Toolset and per docs 4.1
  // (placeables expose position/bearing/visual transform with no Static
  // exclusion). The Static flag only gates VT rendering channels, not world
  // move/rotate/height — matching resolveGenericTransformTargets/
  // resolveMovableTargets, which never drop static placeables. Excluding them
  // here made World Move silently no-op on static-heavy Areas (e.g. bakery
  // props), so the gizmo appeared to "do nothing".
  const unlockedMovableIds = selectedObjects
    .filter((object) => MOVE_ALLOWED_KINDS.has(object.kind))
    .filter((object) => !isKindLocked(input.toolbarState.canvasDebug, object.kind))
    .map((object) => object.id);

  if (unlockedMovableIds.length === 0) {
    return { ids: [], reason: "selection_locked_or_immovable" };
  }

  return { ids: unlockedMovableIds };
}

export function findTileAtWorld(
  scene: AreaScene,
  worldX: number,
  worldY: number
): SceneTile | null {
  const col = Math.floor(worldX);
  const row = Math.floor(worldY);

  if (col < 0 || col >= scene.width || row < 0 || row >= scene.height) {
    return null;
  }

  return scene.tiles.find((tile) => tile.col === col && tile.row === row) ?? null;
}

export function resolveObjectRenderStatus(object: SceneObject): ObjectRenderStatus {
  if (!object.resRef.trim()) {
    return "error";
  }

  if (object.kind === "sounds") {
    return "non_render";
  }

  if (object.kind === "doors" && object.tag.endsWith("02")) {
    return "warning";
  }

  return "ok";
}

export function usesStatusMapForKind(
  statusMap: DebugState["statusMap"],
  kind: SceneObjectKind
): boolean {
  return statusMap === "all" || statusMap === kind;
}

export function isKindLocked(debugState: DebugState, kind: SceneObjectKind): boolean {
  return debugState.lockedKinds[kind];
}

export function snapAngleRadians(value: number, stepDeg: number): number {
  const step = Math.max(1, stepDeg) * RADIANS_PER_DEGREE;
  return Math.round(value / step) * step;
}

export function snapHeightValue(value: number, step: number): number {
  const normalizedStep = Math.max(0.05, step);
  return Math.round(value / normalizedStep) * normalizedStep;
}

export function snapGridValue(value: number, step: number): number {
  const normalizedStep = Math.max(0.1, step);
  return Math.round(value / normalizedStep) * normalizedStep;
}

export function clampPlacementToSceneBounds(
  scene: AreaScene,
  placementX: number,
  placementY: number
): { x: number; y: number } {
  const maxX = resolveSceneCoordinateMax(scene.width);
  const maxY = resolveSceneCoordinateMax(scene.height);
  return {
    x: Math.min(maxX, Math.max(SCENE_COORDINATE_MIN, placementX)),
    y: Math.min(maxY, Math.max(SCENE_COORDINATE_MIN, placementY))
  };
}

export function resolveObjectPlacementFromWorldPoint(
  scene: AreaScene,
  rawX: number,
  rawY: number,
  snapGrid: boolean,
  snapGridStep: number
): { x: number; y: number } {
  const snappedX = snapGrid ? snapGridValue(rawX, snapGridStep) : rawX;
  const snappedY = snapGrid ? snapGridValue(rawY, snapGridStep) : rawY;
  return clampPlacementToSceneBounds(scene, snappedX, snappedY);
}

export function resolveObjectAddPayloadKey(payload: ObjectAddPayloadKeyInput): string {
  return `${payload.kind}::${payload.resRef.trim().toLowerCase()}::${payload.tag.trim().toLowerCase()}`;
}

export function resolveObjectAddDropPlacement(args: {
  payload: ObjectAddPayloadKeyInput;
  scene: AreaScene;
  preview:
    | { payload: ObjectAddPayloadKeyInput; placementX: number; placementY: number }
    | null
    | undefined;
  cachedPlacement:
    | {
        payloadKey: string;
        placementX: number;
        placementY: number;
        tileId: string | null;
        updatedAtUnixMs: number;
      }
    | null
    | undefined;
  dropPlacement: { x: number; y: number; tileId: string | null } | null;
  nowUnixMs: number;
}): { x: number; y: number; tileId: string | null } | null {
  const payloadKey = resolveObjectAddPayloadKey(args.payload);
  const previewPlacement =
    args.preview && resolveObjectAddPayloadKey(args.preview.payload) === payloadKey
      ? {
          x: args.preview.placementX,
          y: args.preview.placementY,
          tileId:
            findTileAtWorld(args.scene, args.preview.placementX, args.preview.placementY)?.id ??
            null
        }
      : null;
  const cachedPlacement =
    args.cachedPlacement &&
    args.cachedPlacement.payloadKey === payloadKey &&
    args.nowUnixMs - args.cachedPlacement.updatedAtUnixMs <= OBJECT_ADD_PLACEMENT_CACHE_MAX_AGE_MS
      ? {
          x: args.cachedPlacement.placementX,
          y: args.cachedPlacement.placementY,
          tileId: args.cachedPlacement.tileId
        }
      : null;
  return previewPlacement ?? cachedPlacement ?? args.dropPlacement;
}

export function clampDeltaToBounds(delta: number, minDelta: number, maxDelta: number): number {
  if (delta > 0) {
    if (maxDelta <= 0) {
      return 0;
    }
    return Math.min(delta, maxDelta);
  }
  if (delta < 0) {
    if (minDelta >= 0) {
      return 0;
    }
    return Math.max(delta, minDelta);
  }
  return 0;
}

export function clampTranslationDeltaToSceneBounds(
  scene: AreaScene,
  objects: SceneObject[],
  delta: { x: number; y: number }
): { x: number; y: number } {
  if (objects.length === 0) {
    return { x: 0, y: 0 };
  }

  const maxX = resolveSceneCoordinateMax(scene.width);
  const maxY = resolveSceneCoordinateMax(scene.height);
  let minDeltaX = Number.NEGATIVE_INFINITY;
  let maxDeltaX = Number.POSITIVE_INFINITY;
  let minDeltaY = Number.NEGATIVE_INFINITY;
  let maxDeltaY = Number.POSITIVE_INFINITY;

  objects.forEach((object) => {
    minDeltaX = Math.max(minDeltaX, SCENE_COORDINATE_MIN - object.x);
    maxDeltaX = Math.min(maxDeltaX, maxX - object.x);
    minDeltaY = Math.max(minDeltaY, SCENE_COORDINATE_MIN - object.y);
    maxDeltaY = Math.min(maxDeltaY, maxY - object.y);
  });

  return {
    x: clampDeltaToBounds(delta.x, minDeltaX, maxDeltaX),
    y: clampDeltaToBounds(delta.y, minDeltaY, maxDeltaY)
  };
}

export function clampHeightDeltaToSurface(objects: SceneObject[], deltaZ: number): number {
  void objects;
  return Number.isFinite(deltaZ) ? deltaZ : 0;
}
