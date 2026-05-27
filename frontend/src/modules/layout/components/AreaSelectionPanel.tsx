import { useCallback, useEffect, useMemo, useState } from "react";
import type { AreaScene } from "../../scene/contracts";
import type { TelemetryPayload } from "../../telemetry/domain/telemetryEvent";
import type { AreaApiListItem } from "../../areas/contracts";
import type { AreaApiPort } from "../../areas/ports/areaApiPort";
import { mapBackendAreaToScene } from "../../areas/application/areaSceneMapper";

interface AreaSelectionPanelProps {
  userId: string;
  backendAccessToken: string | null;
  areaApiPort: AreaApiPort;
  trackTelemetryEvent: (name: string, payload?: TelemetryPayload) => void;
  onAreaSceneSelected: (scene: AreaScene, area: AreaApiListItem) => void;
}

type AreaPanelStatus = "idle" | "loading" | "ready" | "error";

function formatAreaMeta(area: AreaApiListItem): string {
  return `${area.biome} - ${area.width}x${area.height}`;
}

export function AreaSelectionPanel({
  userId,
  backendAccessToken,
  areaApiPort,
  trackTelemetryEvent,
  onAreaSceneSelected
}: AreaSelectionPanelProps) {
  const [status, setStatus] = useState<AreaPanelStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [areas, setAreas] = useState<AreaApiListItem[]>([]);
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
  const [isOpeningArea, setIsOpeningArea] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const loadAreas = useCallback(async () => {
    if (!backendAccessToken) {
      setStatus("idle");
      setAreas([]);
      setSelectedAreaId(null);
      setErrorMessage(null);
      return;
    }

    setStatus("loading");
    setErrorMessage(null);

    try {
      const response = await areaApiPort.listAreas(backendAccessToken, {
        limit: 100,
        offset: 0
      });
      setAreas(response.items);
      setSelectedAreaId((current) => current ?? response.items[0]?.areaId ?? null);
      setStatus("ready");
      trackTelemetryEvent("ui.workspace.areas.loaded", {
        userId,
        total: response.total
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load areas.";
      setAreas([]);
      setSelectedAreaId(null);
      setStatus("error");
      setErrorMessage(message);
      trackTelemetryEvent("ui.workspace.areas.load_failed", {
        userId,
        message
      });
    }
  }, [areaApiPort, backendAccessToken, trackTelemetryEvent, userId]);

  useEffect(() => {
    void loadAreas();
  }, [loadAreas]);

  const visibleAreas = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (!normalizedQuery) {
      return areas;
    }
    return areas.filter((area) => {
      const tags = area.tags.join(" ").toLowerCase();
      return (
        area.name.toLowerCase().includes(normalizedQuery) ||
        area.areaId.toLowerCase().includes(normalizedQuery) ||
        area.biome.toLowerCase().includes(normalizedQuery) ||
        tags.includes(normalizedQuery)
      );
    });
  }, [areas, searchQuery]);

  const selectedArea = useMemo(
    () => visibleAreas.find((area) => area.areaId === selectedAreaId) ?? null,
    [selectedAreaId, visibleAreas]
  );

  const openSelectedArea = useCallback(async () => {
    if (!backendAccessToken || !selectedArea) {
      return;
    }

    setIsOpeningArea(true);
    try {
      const detail = await areaApiPort.getAreaById(backendAccessToken, selectedArea.areaId);
      const scene = mapBackendAreaToScene(detail);
      onAreaSceneSelected(scene, selectedArea);
      trackTelemetryEvent("ui.workspace.areas.opened", {
        userId,
        areaId: selectedArea.areaId,
        objectCount: detail.objects.length
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to open area.";
      setErrorMessage(message);
      setStatus("error");
      trackTelemetryEvent("ui.workspace.areas.open_failed", {
        userId,
        areaId: selectedArea.areaId,
        message
      });
    } finally {
      setIsOpeningArea(false);
    }
  }, [
    areaApiPort,
    backendAccessToken,
    onAreaSceneSelected,
    selectedArea,
    trackTelemetryEvent,
    userId
  ]);

  return (
    <article className="sidebar-section scene-objects-section" aria-label="area selection section">
      <header className="scene-objects-header">
        <h2>Areas</h2>
        <span className="scene-objects-total">{areas.length}</span>
      </header>

      <label className="scene-objects-search">
        <input
          type="search"
          aria-label="Filter areas"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Filter by id / name / tag"
          disabled={!backendAccessToken || status === "loading"}
        />
      </label>

      {!backendAccessToken ? (
        <p className="scene-objects-empty">Backend session required to list areas.</p>
      ) : null}

      {backendAccessToken && status === "loading" ? (
        <p className="scene-objects-empty">Loading areas...</p>
      ) : null}

      {backendAccessToken && status === "error" && errorMessage ? (
        <p className="scene-objects-empty">{errorMessage}</p>
      ) : null}

      {backendAccessToken && status !== "loading" && visibleAreas.length > 0 ? (
        <ul className="scene-object-list" aria-label="area list">
          {visibleAreas.map((area) => {
            const isSelected = area.areaId === selectedAreaId;
            return (
              <li key={area.areaId}>
                <button
                  type="button"
                  className={`scene-object-row ${isSelected ? "is-selected" : ""}`}
                  aria-selected={isSelected}
                  onClick={() => {
                    setSelectedAreaId(area.areaId);
                    trackTelemetryEvent("ui.workspace.areas.selected", {
                      userId,
                      areaId: area.areaId
                    });
                  }}
                >
                  <span className="scene-object-row-meta">
                    <strong>{area.name}</strong>
                    <small>{formatAreaMeta(area)}</small>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      <button
        type="button"
        className="primary-btn"
        onClick={() => void openSelectedArea()}
        disabled={!backendAccessToken || !selectedArea || isOpeningArea}
      >
        {isOpeningArea ? "Opening..." : "Open Selected Area"}
      </button>

      <button
        type="button"
        className="topbar-btn"
        onClick={() => void loadAreas()}
        disabled={!backendAccessToken || status === "loading"}
      >
        Refresh Areas
      </button>
    </article>
  );
}
