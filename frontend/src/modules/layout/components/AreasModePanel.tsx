import { useCallback, useEffect, useRef, useState } from "react";
import type { AreaScene, AuroraAreaEditingTool, SceneObject } from "../contracts";
import type { SceneObjectCatalogQueryFacade } from "../application/sceneObjectCatalogQueryFacade";
import type { WorkspaceModeDefinition } from "../workspaceModes";
import type { TelemetryPayload } from "../../telemetry/domain/telemetryEvent";
import type {
  AreaApiLightingEvidenceReport,
  AreaApiProcessedMdlLightNodeEvidence
} from "../../areas/contracts";
import type { ItemApiPaletteTreeResult } from "../../items/contracts";
import type { AreaApiPort } from "../../areas/ports/areaApiPort";
import type { AreaTileProcessContractReadiness } from "../../tiles/application/areaTileProcessContractReadiness";
import type { TileApiPort } from "../../tiles/ports/tileApiPort";
import type { PlaceableViewportRenderPayload } from "../../placeables/application/placeableRenderPayloadResolver";
import { AreaSelectionPanel, type AreaListClientCacheEntry } from "./AreaSelectionPanel";
import { SceneObjectAddPanel } from "./SceneObjectAddPanel";
import { AuroraAreaEditingPanel } from "./AuroraAreaEditingPanel";
import type { WorkspaceAreaCanvasLoadingState } from "./WorkspaceCanvasViewport";

interface AreasModePanelProps {
  userId: string;
  objects: SceneObject[];
  creatureTemplateObjects?: readonly SceneObject[];
  activeMode: WorkspaceModeDefinition;
  backendAccessToken: string | null;
  areaApiPort: AreaApiPort;
  tileApiPort?: TileApiPort;
  areaListClientCacheRef: { current: AreaListClientCacheEntry | null };
  sceneObjectCatalogQueryFacade: SceneObjectCatalogQueryFacade;
  placeableRenderPayloadByTemplateId?: Record<string, PlaceableViewportRenderPayload> | null;
  placeableAssetAccessToken?: string | null;
  itemPaletteTree?: ItemApiPaletteTreeResult | null;
  thumbnailRenderEnabled?: boolean;
  openedAreaScene?: AreaScene | null;
  selectedAreaTileId?: string | null;
  selectedAreaTileIds?: readonly string[];
  areaEditingTool: AuroraAreaEditingTool;
  trackTelemetryEvent: (name: string, payload?: TelemetryPayload) => void;
  onAreaCanvasLoadingChange: (loading: WorkspaceAreaCanvasLoadingState | null) => void;
  onAreaSceneSelected: (scene: AreaScene) => void;
  onAreaSceneMutation: (scene: AreaScene, selectedTileId?: string | null, selectedTileIds?: string[]) => void;
  onAreaEditingToolChange: (tool: AuroraAreaEditingTool) => void;
  onObjectCreate: (object: SceneObject) => void;
  onPlaceablesWorkflowActiveChange?: (active: boolean) => void;
  activeCreateObjectId?: string | null;
  areaTileProcessReadiness?: AreaTileProcessContractReadiness | null;
  onTileProcessReadinessChange?: (readiness: AreaTileProcessContractReadiness | null) => void;
}

type AreaLightingEvidenceStatus = "idle" | "loading" | "ready" | "error";

export function AreasModePanel({
  userId,
  objects,
  creatureTemplateObjects,
  activeMode,
  backendAccessToken,
  areaApiPort,
  tileApiPort,
  areaListClientCacheRef,
  sceneObjectCatalogQueryFacade,
  placeableRenderPayloadByTemplateId,
  placeableAssetAccessToken,
  itemPaletteTree,
  thumbnailRenderEnabled = true,
  openedAreaScene,
  selectedAreaTileId,
  selectedAreaTileIds,
  areaEditingTool,
  trackTelemetryEvent,
  onAreaCanvasLoadingChange,
  onAreaSceneSelected,
  onAreaSceneMutation,
  onAreaEditingToolChange,
  onObjectCreate,
  onPlaceablesWorkflowActiveChange,
  activeCreateObjectId,
  areaTileProcessReadiness,
  onTileProcessReadinessChange
}: AreasModePanelProps) {
  const workflowRef = useRef<HTMLDivElement | null>(null);
  const [activeWorkflowStep, setActiveWorkflowStep] = useState<"areas" | "placeables">(
    activeMode.showAreaSelectionPanel ? "areas" : "placeables"
  );

  useEffect(() => {
    if (!activeMode.showAreaSelectionPanel && activeWorkflowStep !== "placeables") {
      setActiveWorkflowStep("placeables");
    }
  }, [activeMode.showAreaSelectionPanel, activeWorkflowStep]);

  useEffect(() => {
    onPlaceablesWorkflowActiveChange?.(activeWorkflowStep === "placeables");
    return () => onPlaceablesWorkflowActiveChange?.(false);
  }, [activeWorkflowStep, onPlaceablesWorkflowActiveChange]);

  useEffect(() => {
    if (activeWorkflowStep !== "placeables") {
      return;
    }
    const addPanel = workflowRef.current?.querySelector<HTMLElement>(".scene-object-add-panel");
    const focusTarget = addPanel?.querySelector<HTMLElement>('[aria-label="Filter objects"]');
    window.setTimeout(() => focusTarget?.focus(), 0);
  }, [activeWorkflowStep]);

  const handleWorkflowStepSelect = useCallback(
    (step: "areas" | "placeables", source: "tab" | "area_opened") => {
      if (step === "areas" && !activeMode.showAreaSelectionPanel) {
        return;
      }
      setActiveWorkflowStep(step);
      trackTelemetryEvent("ui.workspace.areas.workflow_step_changed", {
        userId,
        step,
        source
      });
    },
    [activeMode.showAreaSelectionPanel, trackTelemetryEvent, userId]
  );

  const handleAreaSceneSelected = useCallback(
    (scene: AreaScene) => {
      onAreaSceneSelected(scene);
      handleWorkflowStepSelect("placeables", "area_opened");
    },
    [handleWorkflowStepSelect, onAreaSceneSelected]
  );

  const openedAreaName =
    openedAreaScene?.areaName?.trim() || openedAreaScene?.sceneId || "No area opened";
  const openedAreaMeta = openedAreaScene
    ? `${openedAreaScene.width}x${openedAreaScene.height} | ${openedAreaScene.objects.length} objects`
    : "Use Open after selecting an area";

  return (
    <div
      ref={workflowRef}
      className="workspace-mode-panel areas-mode-sidebar-workflow areas-mode-panel"
      role="group"
      aria-label="areas mode workflow"
    >
      <div className="areas-mode-open-area" aria-label="Opened area status">
        <span>Opened Area</span>
        <strong title={openedAreaName}>{openedAreaName}</strong>
        <small>{openedAreaMeta}</small>
      </div>
      <AuroraAreaEditingPanel
        accessToken={backendAccessToken}
        scene={openedAreaScene}
        selectedTileId={selectedAreaTileId}
        selectedTileIds={selectedAreaTileIds}
        tileProcessReadiness={areaTileProcessReadiness}
        activeTool={areaEditingTool}
        onActiveToolChange={onAreaEditingToolChange}
        onSceneSelected={onAreaSceneSelected}
        onSceneMutation={onAreaSceneMutation}
      />
      <nav className="areas-mode-step-tabs" role="tablist" aria-label="areas workflow steps">
        <button
          type="button"
          role="tab"
          aria-label="Select Area"
          aria-selected={activeWorkflowStep === "areas"}
          disabled={!activeMode.showAreaSelectionPanel}
          className={`areas-mode-step-tab${activeWorkflowStep === "areas" ? " is-active" : ""}`}
          onClick={() => handleWorkflowStepSelect("areas", "tab")}
        >
          Area
        </button>
        <button
          type="button"
          role="tab"
          aria-label="Add Objects"
          aria-selected={activeWorkflowStep === "placeables"}
          className={`areas-mode-step-tab${
            activeWorkflowStep === "placeables" ? " is-active" : ""
          }`}
          onClick={() => handleWorkflowStepSelect("placeables", "tab")}
        >
          Objects
        </button>
      </nav>
      <AreaLightingEvidencePanel
        userId={userId}
        backendAccessToken={backendAccessToken}
        areaApiPort={areaApiPort}
        trackTelemetryEvent={trackTelemetryEvent}
      />
      {activeMode.showAreaSelectionPanel ? (
        <AreaSelectionPanel
          userId={userId}
          backendAccessToken={backendAccessToken}
          areaApiPort={areaApiPort}
          tileApiPort={tileApiPort}
          areaListClientCacheRef={areaListClientCacheRef}
          hidden={activeWorkflowStep !== "areas"}
          trackTelemetryEvent={trackTelemetryEvent}
          creatureTemplateObjects={creatureTemplateObjects}
          objectTemplateObjects={objects}
          onAreaCanvasLoadingChange={onAreaCanvasLoadingChange}
          onTileProcessReadinessChange={onTileProcessReadinessChange}
          onAreaSceneSelected={handleAreaSceneSelected}
        />
      ) : null}
      <SceneObjectAddPanel
        key={`scene-object-add-panel-${activeMode.id}`}
        userId={userId}
        objects={objects}
        heading="Add Objects"
        hidden={activeWorkflowStep !== "placeables"}
        sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
        trackTelemetryEvent={trackTelemetryEvent}
        allowedCatalogTypes={[...activeMode.allowedCatalogTypes]}
        defaultActiveType={activeMode.defaultAddType}
        hideUnsupportedCatalogTypes
        placeableRenderPayloadByTemplateId={placeableRenderPayloadByTemplateId}
        placeableAssetAccessToken={placeableAssetAccessToken}
        itemPaletteTree={itemPaletteTree}
        thumbnailRenderEnabled={thumbnailRenderEnabled}
        onObjectCreate={onObjectCreate}
        activeCreateObjectId={activeCreateObjectId}
      />
    </div>
  );
}

interface AreaLightingEvidencePanelProps {
  userId: string;
  backendAccessToken: string | null;
  areaApiPort: AreaApiPort;
  trackTelemetryEvent: (name: string, payload?: TelemetryPayload) => void;
}

function AreaLightingEvidencePanel({
  userId,
  backendAccessToken,
  areaApiPort,
  trackTelemetryEvent
}: AreaLightingEvidencePanelProps) {
  const [status, setStatus] = useState<AreaLightingEvidenceStatus>("idle");
  const [report, setReport] = useState<AreaApiLightingEvidenceReport | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadLightingEvidence = useCallback(async () => {
    if (!backendAccessToken) {
      setStatus("idle");
      setReport(null);
      setErrorMessage(null);
      return;
    }

    setStatus("loading");
    setErrorMessage(null);

    try {
      const nextReport = await areaApiPort.getAreaLightingEvidence(backendAccessToken);
      setReport(nextReport);
      setStatus("ready");
      trackTelemetryEvent("ui.workspace.areas.lighting_evidence_loaded", {
        userId,
        tileLightReferences: nextReport.summary.tileLightReferences,
        catalogLightSourceTemplates: nextReport.summary.catalogLightSourceTemplates,
        processedMdlLightNodes: nextReport.summary.processedMdlLightNodes,
        areaGlobalLightingFields: nextReport.summary.areaGlobalLightingFields,
        areaShadowOpacityAreas: nextReport.summary.areaShadowOpacityAreas,
        rendererCandidateLights: nextReport.summary.rendererCandidateLights,
        rendererDroppedLights: nextReport.summary.rendererDroppedLights,
        shadowDiagnosticEntries: nextReport.summary.shadowDiagnosticEntries,
        shadowMdlLightNodes: nextReport.summary.shadowMdlLightNodes,
        auditCoverageBlocked: nextReport.summary.auditCoverageBlocked,
        auditCoverageNotObserved: nextReport.summary.auditCoverageNotObserved,
        auditGaps: nextReport.summary.auditGaps,
        remainingRetailBlockers: nextReport.summary.remainingRetailBlockers
      });
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Lighting evidence failed.");
    }
  }, [areaApiPort, backendAccessToken, trackTelemetryEvent, userId]);

  const summary = report?.summary;
  const topCatalogSources = report?.catalogLightSources.slice(0, 3) ?? [];
  const topMdlSources = report?.processedMdlLightSources.slice(0, 3) ?? [];
  const topGlobalLighting = report?.areaGlobalLighting.slice(0, 3) ?? [];
  const topShadowEntries = report?.shadowDiagnostic.entries.slice(0, 3) ?? [];
  const topAuditGaps = report?.auditGaps.slice(0, 6) ?? [];
  const topRetailBlockers = report?.remainingRetailBlockers.slice(0, 4) ?? [];
  const droppedBudgetCandidates =
    report?.rendererLightBudget.candidates.filter((candidate) => !candidate.accepted).slice(0, 3) ??
    [];
  const mdlNodeCount = summary?.processedMdlLightNodes ?? 0;

  return (
    <section
      className="areas-lighting-evidence-panel"
      aria-label="area lighting evidence"
      data-status={status}
      data-tile-light-references={summary?.tileLightReferences ?? 0}
      data-catalog-light-source-templates={summary?.catalogLightSourceTemplates ?? 0}
      data-mdl-node-count={mdlNodeCount}
      data-area-global-lighting-fields={summary?.areaGlobalLightingFields ?? 0}
      data-area-shadow-opacity-areas={summary?.areaShadowOpacityAreas ?? 0}
      data-renderer-candidate-lights={summary?.rendererCandidateLights ?? 0}
      data-renderer-dropped-lights={summary?.rendererDroppedLights ?? 0}
      data-shadow-diagnostic-entries={summary?.shadowDiagnosticEntries ?? 0}
      data-shadow-mdl-light-nodes={summary?.shadowMdlLightNodes ?? 0}
      data-audit-coverage-source-backed={summary?.auditCoverageSourceBacked ?? 0}
      data-audit-coverage-preview-only={summary?.auditCoveragePreviewOnly ?? 0}
      data-audit-coverage-blocked={summary?.auditCoverageBlocked ?? 0}
      data-audit-coverage-not-observed={summary?.auditCoverageNotObserved ?? 0}
      data-audit-gaps={summary?.auditGaps ?? 0}
      data-remaining-retail-blockers={summary?.remainingRetailBlockers ?? 0}
    >
      <header className="areas-lighting-evidence-header">
        <div>
          <span>Lighting</span>
          <strong>
            {summary
              ? `${formatInteger(summary.processedMdlLightNodes)} MDL nodes`
              : "Evidence"}
          </strong>
        </div>
        <button
          type="button"
          className="topbar-btn areas-lighting-evidence-refresh"
          aria-label="Load Lighting Evidence"
          onClick={() => void loadLightingEvidence()}
          disabled={!backendAccessToken || status === "loading"}
        >
          {status === "loading" ? "Load..." : "Load"}
        </button>
      </header>

      {status === "error" && errorMessage ? (
        <p className="scene-objects-empty" role="alert">
          {errorMessage}
        </p>
      ) : null}

      {summary ? (
        <dl className="areas-lighting-evidence-grid">
          <div>
            <dt>Tiles</dt>
            <dd>{formatInteger(summary.tileLightReferences)}</dd>
          </div>
          <div>
            <dt>Placeables</dt>
            <dd>{formatInteger(summary.catalogLightSourceTemplates)}</dd>
          </div>
          <div>
            <dt>LightColor</dt>
            <dd>{formatInteger(summary.catalogLightColorTemplates)}</dd>
          </div>
          <div>
            <dt>MDL</dt>
            <dd>
              {formatInteger(summary.processedMdlLightSourceTemplates)}/
              {formatInteger(summary.processedMdlLightScanLimit)}
            </dd>
          </div>
          <div>
            <dt>Hints</dt>
            <dd>{formatInteger(summary.placeableNameCandidates)}</dd>
          </div>
          <div>
            <dt>Global</dt>
            <dd>{formatInteger(summary.areaGlobalLightingFields)}</dd>
          </div>
          <div>
            <dt>Shadow</dt>
            <dd>{formatInteger(summary.areaShadowOpacityAreas)}</dd>
          </div>
          <div>
            <dt>ShadowSrc</dt>
            <dd>{formatInteger(summary.shadowDiagnosticEntries)}</dd>
          </div>
          <div>
            <dt>Cap</dt>
            <dd>{summary.auroraActiveLightSlotCap}</dd>
          </div>
          <div>
            <dt>Budget</dt>
            <dd>
              {formatInteger(summary.rendererAcceptedLights)}/
              {formatInteger(summary.rendererCandidateLights)}
            </dd>
          </div>
          <div>
            <dt>Dropped</dt>
            <dd>{formatInteger(summary.rendererDroppedLights)}</dd>
          </div>
          <div>
            <dt>Source</dt>
            <dd>{formatInteger(summary.auditCoverageSourceBacked)}</dd>
          </div>
          <div>
            <dt>Preview</dt>
            <dd>{formatInteger(summary.auditCoveragePreviewOnly)}</dd>
          </div>
          <div>
            <dt>Blocked</dt>
            <dd>{formatInteger(summary.auditCoverageBlocked)}</dd>
          </div>
          <div>
            <dt>Missing</dt>
            <dd>{formatInteger(summary.auditCoverageNotObserved)}</dd>
          </div>
          <div>
            <dt>Gaps</dt>
            <dd>{formatInteger(summary.auditGaps)}</dd>
          </div>
          <div>
            <dt>Retail</dt>
            <dd>{formatInteger(summary.remainingRetailBlockers)}</dd>
          </div>
        </dl>
      ) : null}

      {topCatalogSources.length > 0 ? (
        <ul className="areas-lighting-evidence-list" aria-label="catalog light sources">
          {topCatalogSources.map((source) => (
            <li key={source.templateId}>
              <span title={source.name}>{source.name}</span>
              <strong>{source.source2daLightColorLabel ?? source.source2daLightColorRaw ?? "catalog"}</strong>
            </li>
          ))}
        </ul>
      ) : null}

      {topMdlSources.length > 0 ? (
        <ul className="areas-lighting-evidence-list" aria-label="processed mdl light sources">
          {topMdlSources.map((source) => {
            const firstNode = source.nodes[0];
            return (
              <li key={source.templateId}>
                <span title={source.name}>{source.name}</span>
                <strong>
                  {firstNode ? (
                    <>
                      {firstNode.color ? <MdlLightColorSwatch node={firstNode} /> : null}
                      {source.nodes.length} node{source.nodes.length === 1 ? "" : "s"}
                    </>
                  ) : (
                    "0 nodes"
                  )}
                </strong>
              </li>
            );
          })}
        </ul>
      ) : null}

      {topGlobalLighting.length > 0 ? (
        <ul className="areas-lighting-evidence-list" aria-label="area global lighting fields">
          {topGlobalLighting.map((areaLighting) => {
            const firstField = areaLighting.fields[0];
            return (
              <li key={areaLighting.areaId}>
                <span title={areaLighting.areaName}>{areaLighting.areaName}</span>
                <strong>
                  {firstField
                    ? `${firstField.field}=${formatFloat(firstField.value)}`
                    : "0 fields"}
                </strong>
              </li>
            );
          })}
        </ul>
      ) : null}

      {topShadowEntries.length > 0 ? (
        <ul className="areas-lighting-evidence-list" aria-label="shadow diagnostic entries">
          {topShadowEntries.map((entry) => (
            <li key={entry.entryId}>
              <span title={entry.note}>{entry.label}</span>
              <strong>
                {entry.rendererRank !== undefined
                  ? `${entry.source} #${entry.rendererRank}`
                  : entry.source}
              </strong>
            </li>
          ))}
        </ul>
      ) : null}

      {topAuditGaps.length > 0 ? (
        <ul className="areas-lighting-evidence-list" aria-label="lighting audit gaps">
          {topAuditGaps.map((entry) => (
            <li key={entry.key}>
              <span title={entry.nextStep}>{entry.label}</span>
              <strong>{entry.status}</strong>
            </li>
          ))}
        </ul>
      ) : null}

      {topRetailBlockers.length > 0 ? (
        <ul className="areas-lighting-evidence-list" aria-label="remaining retail blockers">
          {topRetailBlockers.map((entry) => (
            <li key={entry.key}>
              <span title={`${entry.requiredEvidence} ${entry.nextStep}`}>
                {entry.label}
              </span>
              <strong title={entry.oracleCases.map((item) => item.caseId).join(" | ")}>
                {entry.status} / {entry.oracleCases.length} oracle cases
              </strong>
            </li>
          ))}
        </ul>
      ) : null}

      {droppedBudgetCandidates.length > 0 ? (
        <ul className="areas-lighting-evidence-list" aria-label="dropped renderer light candidates">
          {droppedBudgetCandidates.map((candidate) => (
            <li key={candidate.candidateId}>
              <span title={candidate.label}>{candidate.label}</span>
              <strong>{candidate.source}</strong>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function MdlLightColorSwatch({ node }: { node: AreaApiProcessedMdlLightNodeEvidence }) {
  const color = node.color;
  if (!color) {
    return null;
  }
  return (
    <span
      className="areas-lighting-color-swatch"
      title={`rgb ${formatFloat(color.red)}, ${formatFloat(color.green)}, ${formatFloat(color.blue)}`}
      style={{ backgroundColor: formatMdlLightColorCss(color.red, color.green, color.blue) }}
      aria-hidden="true"
    />
  );
}

function formatInteger(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

function formatFloat(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function formatMdlLightColorCss(red: number, green: number, blue: number): string {
  const toRgbChannel = (value: number) => Math.round(Math.max(0, Math.min(1, value)) * 255);
  return `rgb(${toRgbChannel(red)} ${toRgbChannel(green)} ${toRgbChannel(blue)})`;
}
