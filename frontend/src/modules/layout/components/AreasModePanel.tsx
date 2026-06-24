import { useCallback, useRef } from "react";
import type { AreaScene, SceneObject } from "../contracts";
import type { SceneObjectCatalogQueryFacade } from "../application/sceneObjectCatalogQueryFacade";
import type { WorkspaceModeDefinition } from "../workspaceModes";
import type { TelemetryPayload } from "../../telemetry/domain/telemetryEvent";
import type { AreaApiPort } from "../../areas/ports/areaApiPort";
import type { AreaTileProcessContractReadiness } from "../../tiles/application/areaTileProcessContractReadiness";
import type { TileApiPort } from "../../tiles/ports/tileApiPort";
import type { PlaceableViewportRenderPayload } from "../../placeables/application/placeableRenderPayloadResolver";
import { AreaSelectionPanel, type AreaListClientCacheEntry } from "./AreaSelectionPanel";
import { SceneObjectAddPanel } from "./SceneObjectAddPanel";
import type { WorkspaceAreaCanvasLoadingState } from "./WorkspaceCanvasViewport";

interface AreasModePanelProps {
  userId: string;
  objects: SceneObject[];
  activeMode: WorkspaceModeDefinition;
  backendAccessToken: string | null;
  areaApiPort: AreaApiPort;
  tileApiPort?: TileApiPort;
  areaListClientCacheRef: { current: AreaListClientCacheEntry | null };
  sceneObjectCatalogQueryFacade: SceneObjectCatalogQueryFacade;
  placeableRenderPayloadByTemplateId?: Record<string, PlaceableViewportRenderPayload> | null;
  placeableAssetAccessToken?: string | null;
  trackTelemetryEvent: (name: string, payload?: TelemetryPayload) => void;
  onAreaCanvasLoadingChange: (loading: WorkspaceAreaCanvasLoadingState | null) => void;
  onAreaSceneSelected: (scene: AreaScene) => void;
  onObjectCreate: (object: SceneObject) => void;
  activeCreateObjectId?: string | null;
  onTileProcessReadinessChange: (readiness: AreaTileProcessContractReadiness | null) => void;
}

export function AreasModePanel({
  userId,
  objects,
  activeMode,
  backendAccessToken,
  areaApiPort,
  tileApiPort,
  areaListClientCacheRef,
  sceneObjectCatalogQueryFacade,
  placeableRenderPayloadByTemplateId,
  placeableAssetAccessToken,
  trackTelemetryEvent,
  onAreaCanvasLoadingChange,
  onAreaSceneSelected,
  onObjectCreate,
  activeCreateObjectId,
  onTileProcessReadinessChange
}: AreasModePanelProps) {
  const workflowRef = useRef<HTMLDivElement | null>(null);

  const handleAddObjectsJump = useCallback(() => {
    const addPanel = workflowRef.current?.querySelector<HTMLElement>(".scene-object-add-panel");
    addPanel?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    const focusTarget = addPanel?.querySelector<HTMLElement>('[aria-label="Filter objects"]');
    window.setTimeout(() => focusTarget?.focus(), 0);
    trackTelemetryEvent("ui.workspace.areas.add_objects_jump", { userId });
  }, [trackTelemetryEvent, userId]);

  return (
    <div
      ref={workflowRef}
      className="workspace-mode-panel areas-mode-sidebar-workflow areas-mode-panel"
      role="group"
      aria-label="areas mode workflow"
    >
      <nav className="areas-mode-quick-actions" aria-label="areas workflow shortcuts">
        <button
          type="button"
          className="areas-mode-jump-button"
          onClick={handleAddObjectsJump}
        >
          Add Objects
        </button>
      </nav>
      {activeMode.showAreaSelectionPanel ? (
        <AreaSelectionPanel
          userId={userId}
          backendAccessToken={backendAccessToken}
          areaApiPort={areaApiPort}
          tileApiPort={tileApiPort}
          areaListClientCacheRef={areaListClientCacheRef}
          trackTelemetryEvent={trackTelemetryEvent}
          onAreaCanvasLoadingChange={onAreaCanvasLoadingChange}
          onTileProcessReadinessChange={onTileProcessReadinessChange}
          onAreaSceneSelected={(scene) => onAreaSceneSelected(scene)}
        />
      ) : null}
      <SceneObjectAddPanel
        key={`scene-object-add-panel-${activeMode.id}`}
        userId={userId}
        objects={objects}
        sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
        trackTelemetryEvent={trackTelemetryEvent}
        allowedCatalogTypes={[...activeMode.allowedCatalogTypes]}
        defaultActiveType={activeMode.defaultAddType}
        hideUnsupportedCatalogTypes
        placeableRenderPayloadByTemplateId={placeableRenderPayloadByTemplateId}
        placeableAssetAccessToken={placeableAssetAccessToken}
        onObjectCreate={onObjectCreate}
        activeCreateObjectId={activeCreateObjectId}
      />
    </div>
  );
}
