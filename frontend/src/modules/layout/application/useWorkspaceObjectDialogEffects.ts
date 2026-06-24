import { useEffect } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { AreaScene, SceneObject } from "../contracts";
import type {
  CreaturePropertiesDialogState,
  DoorPropertiesDialogState,
  PlaceablePropertiesDialogState,
  SoundPropertiesDialogState
} from "./workspaceObjectPropertyDrafts";
import {
  areCreaturePropertiesDraftsEqual,
  areDoorPropertiesDraftsEqual,
  arePlaceablePropertiesDraftsEqual,
  areSoundPropertiesDraftsEqual,
  buildCreaturePropertiesDraft,
  buildDoorPropertiesDraft,
  buildPlaceablePropertiesDraft,
  buildSoundPropertiesDraft
} from "./workspaceObjectPropertyDrafts";
import {
  areAdjustLocationDraftsEqual,
  buildAdjustLocationDraft,
  resolveAdjustLocationVisualTransformMeta,
  type AdjustLocationDraft
} from "./workspaceSceneInteraction";
import {
  useClampedDialogBounds,
  useDialogEscape
} from "./useWorkspaceDialogLifecycle";

export interface AdjustLocationDialogState {
  objectIds: string[];
  snapshotObjects: SceneObject[];
  draft: AdjustLocationDraft;
  showVisualTransforms: boolean;
  mixedStaticPlaceables: boolean;
  windowX: number;
  windowY: number;
  collapsed: boolean;
}

type ClampDialogPosition = (
  x: number,
  y: number,
  panelRect?: DOMRect | null
) => { x: number; y: number };

interface UseWorkspaceObjectDialogEffectsArgs {
  scene: AreaScene;
  visibleObjectIdsSet: ReadonlySet<string>;
  adjustLocationUnitsPerTile: number;
  adjustLocationDialog: AdjustLocationDialogState | null;
  setAdjustLocationDialog: Dispatch<SetStateAction<AdjustLocationDialogState | null>>;
  cancelAdjustLocationDialog: () => void;
  clampAdjustLocationDialogPosition: ClampDialogPosition;
  placeablePropertiesDialog: PlaceablePropertiesDialogState | null;
  setPlaceablePropertiesDialog: Dispatch<SetStateAction<PlaceablePropertiesDialogState | null>>;
  cancelPlaceablePropertiesDialog: () => void;
  clampPlaceablePropertiesDialogPosition: ClampDialogPosition;
  soundPropertiesDialog: SoundPropertiesDialogState | null;
  setSoundPropertiesDialog: Dispatch<SetStateAction<SoundPropertiesDialogState | null>>;
  cancelSoundPropertiesDialog: () => void;
  clampSoundPropertiesDialogPosition: ClampDialogPosition;
  doorPropertiesDialog: DoorPropertiesDialogState | null;
  setDoorPropertiesDialog: Dispatch<SetStateAction<DoorPropertiesDialogState | null>>;
  cancelDoorPropertiesDialog: () => void;
  clampDoorPropertiesDialogPosition: ClampDialogPosition;
  creaturePropertiesDialog: CreaturePropertiesDialogState | null;
  setCreaturePropertiesDialog: Dispatch<SetStateAction<CreaturePropertiesDialogState | null>>;
  cancelCreaturePropertiesDialog: () => void;
  clampCreaturePropertiesDialogPosition: ClampDialogPosition;
}

export function reconcileSoundPropertiesDialogWithScene(input: {
  current: SoundPropertiesDialogState | null;
  sceneObjects: readonly SceneObject[];
  visibleObjectIdsSet: ReadonlySet<string>;
}): SoundPropertiesDialogState | null {
  const { current, sceneObjects, visibleObjectIdsSet } = input;
  if (!current) {
    return current;
  }

  if (!visibleObjectIdsSet.has(current.objectId)) {
    return null;
  }

  const liveObject = sceneObjects.find((object) => object.id === current.objectId);
  if (!liveObject || liveObject.kind !== "sounds") {
    return null;
  }

  const nextDraft = buildSoundPropertiesDraft(liveObject);
  if (areSoundPropertiesDraftsEqual(current.draft, nextDraft)) {
    return current;
  }

  return {
    ...current,
    draft: nextDraft
  };
}

export function reconcileAdjustLocationDialogWithScene(input: {
  current: AdjustLocationDialogState | null;
  scene: AreaScene;
  visibleObjectIdsSet: ReadonlySet<string>;
  adjustLocationUnitsPerTile: number;
}): AdjustLocationDialogState | null {
  const { current, scene, visibleObjectIdsSet, adjustLocationUnitsPerTile } = input;
  if (!current || current.objectIds.length === 0) {
    return current;
  }

  if (current.objectIds.some((id) => !visibleObjectIdsSet.has(id))) {
    return null;
  }

  const liveObjects = current.objectIds
    .map((id) => scene.objects.find((object) => object.id === id) ?? null)
    .filter((object): object is SceneObject => Boolean(object));
  if (liveObjects.length !== current.objectIds.length || liveObjects.length === 0) {
    return null;
  }

  const source = liveObjects[0];
  const nextDraft = buildAdjustLocationDraft(
    source,
    adjustLocationUnitsPerTile,
    scene.width,
    scene.height
  );
  const visualTransformMeta = resolveAdjustLocationVisualTransformMeta(liveObjects);
  if (
    areAdjustLocationDraftsEqual(current.draft, nextDraft) &&
    current.showVisualTransforms === visualTransformMeta.showVisualTransforms &&
    current.mixedStaticPlaceables === visualTransformMeta.mixedStaticPlaceables
  ) {
    return current;
  }

  return {
    ...current,
    draft: nextDraft,
    showVisualTransforms: visualTransformMeta.showVisualTransforms,
    mixedStaticPlaceables: visualTransformMeta.mixedStaticPlaceables
  };
}

export function useWorkspaceObjectDialogEffects({
  scene,
  visibleObjectIdsSet,
  adjustLocationUnitsPerTile,
  adjustLocationDialog,
  setAdjustLocationDialog,
  cancelAdjustLocationDialog,
  clampAdjustLocationDialogPosition,
  placeablePropertiesDialog,
  setPlaceablePropertiesDialog,
  cancelPlaceablePropertiesDialog,
  clampPlaceablePropertiesDialogPosition,
  soundPropertiesDialog,
  setSoundPropertiesDialog,
  cancelSoundPropertiesDialog,
  clampSoundPropertiesDialogPosition,
  doorPropertiesDialog,
  setDoorPropertiesDialog,
  cancelDoorPropertiesDialog,
  clampDoorPropertiesDialogPosition,
  creaturePropertiesDialog,
  setCreaturePropertiesDialog,
  cancelCreaturePropertiesDialog,
  clampCreaturePropertiesDialogPosition
}: UseWorkspaceObjectDialogEffectsArgs) {
  useDialogEscape({
    enabled: adjustLocationDialog !== null,
    onEscape: cancelAdjustLocationDialog
  });

  useDialogEscape({
    enabled: placeablePropertiesDialog !== null,
    onEscape: cancelPlaceablePropertiesDialog
  });

  useDialogEscape({
    enabled: soundPropertiesDialog !== null,
    onEscape: cancelSoundPropertiesDialog
  });

  useDialogEscape({
    enabled: doorPropertiesDialog !== null,
    onEscape: cancelDoorPropertiesDialog
  });

  useDialogEscape({
    enabled: creaturePropertiesDialog !== null,
    onEscape: cancelCreaturePropertiesDialog
  });

  useEffect(() => {
    setAdjustLocationDialog((current) => {
      return reconcileAdjustLocationDialogWithScene({
        current,
        scene,
        visibleObjectIdsSet,
        adjustLocationUnitsPerTile
      });
    });
  }, [
    adjustLocationUnitsPerTile,
    scene,
    setAdjustLocationDialog,
    visibleObjectIdsSet
  ]);

  useEffect(() => {
    setPlaceablePropertiesDialog((current) => {
      if (!current) {
        return current;
      }

      const liveObject = scene.objects.find((object) => object.id === current.objectId);
      if (!liveObject || liveObject.kind !== "placeables") {
        return null;
      }

      const nextDraft = buildPlaceablePropertiesDraft(liveObject);
      if (arePlaceablePropertiesDraftsEqual(current.draft, nextDraft)) {
        return current;
      }

      return {
        ...current,
        draft: nextDraft
      };
    });
  }, [scene.objects, setPlaceablePropertiesDialog]);

  useEffect(() => {
    setSoundPropertiesDialog((current) => {
      return reconcileSoundPropertiesDialogWithScene({
        current,
        sceneObjects: scene.objects,
        visibleObjectIdsSet
      });
    });
  }, [scene.objects, setSoundPropertiesDialog, visibleObjectIdsSet]);

  useEffect(() => {
    setDoorPropertiesDialog((current) => {
      if (!current) {
        return current;
      }

      const liveObject = scene.objects.find((object) => object.id === current.objectId);
      if (!liveObject || liveObject.kind !== "doors") {
        return null;
      }

      const nextDraft = buildDoorPropertiesDraft(liveObject);
      if (areDoorPropertiesDraftsEqual(current.draft, nextDraft)) {
        return current;
      }

      return {
        ...current,
        draft: nextDraft
      };
    });
  }, [scene.objects, setDoorPropertiesDialog]);

  useEffect(() => {
    setCreaturePropertiesDialog((current) => {
      if (!current) {
        return current;
      }

      const liveObject = scene.objects.find((object) => object.id === current.objectId);
      if (!liveObject || liveObject.kind !== "creatures") {
        return null;
      }

      const nextDraft = buildCreaturePropertiesDraft(liveObject);
      if (areCreaturePropertiesDraftsEqual(current.draft, nextDraft)) {
        return current;
      }

      return {
        ...current,
        draft: nextDraft
      };
    });
  }, [scene.objects, setCreaturePropertiesDialog]);

  useClampedDialogBounds({
    dialog: adjustLocationDialog,
    setDialog: setAdjustLocationDialog,
    clampPosition: clampAdjustLocationDialogPosition,
    layoutKey: adjustLocationDialog?.collapsed
  });

  useClampedDialogBounds({
    dialog: placeablePropertiesDialog,
    setDialog: setPlaceablePropertiesDialog,
    clampPosition: clampPlaceablePropertiesDialogPosition,
    layoutKey: placeablePropertiesDialog?.collapsed
  });

  useClampedDialogBounds({
    dialog: soundPropertiesDialog,
    setDialog: setSoundPropertiesDialog,
    clampPosition: clampSoundPropertiesDialogPosition,
    layoutKey: soundPropertiesDialog?.collapsed
  });

  useClampedDialogBounds({
    dialog: doorPropertiesDialog,
    setDialog: setDoorPropertiesDialog,
    clampPosition: clampDoorPropertiesDialogPosition,
    layoutKey: doorPropertiesDialog?.collapsed
  });

  useClampedDialogBounds({
    dialog: creaturePropertiesDialog,
    setDialog: setCreaturePropertiesDialog,
    clampPosition: clampCreaturePropertiesDialogPosition,
    layoutKey: creaturePropertiesDialog?.collapsed
  });
}
