import { useCallback, useEffect, useMemo, useState } from "react";

import type { AreaLifecycleFacade } from "../../areas/application/areaLifecycleFacade";
import { resolveAreaWorkspaceDraft } from "../../areas/application/areaWorkspaceDraft";
import type { AreaWorkspaceDraftDocument } from "../../areas/areaWorkspaceDraftContracts";
import type {
  AreaDraftSessionRegistry,
  AreaDraftSummary
} from "../../areas/ports/areaLifecyclePort";
import type { TelemetryPayload } from "../../telemetry/domain/telemetryEvent";
import type { AreaScene } from "../contracts";

interface AreaDraftPanelProps {
  userId: string;
  facade: AreaLifecycleFacade<AreaWorkspaceDraftDocument>;
  draftSessionRegistry: AreaDraftSessionRegistry;
  hidden?: boolean;
  refreshRevision?: number;
  createIdempotencyKey?: () => string;
  onAreaSceneSelected: (scene: AreaScene) => void;
  trackTelemetryEvent: (name: string, payload?: TelemetryPayload) => void;
}

type PanelStatus = "loading" | "ready" | "opening" | "deleting" | "error";

export function AreaDraftPanel({
  userId,
  facade,
  draftSessionRegistry,
  hidden = false,
  refreshRevision = 0,
  createIdempotencyKey = defaultDeleteIdempotencyKey,
  onAreaSceneSelected,
  trackTelemetryEvent
}: AreaDraftPanelProps) {
  const [status, setStatus] = useState<PanelStatus>("loading");
  const [drafts, setDrafts] = useState<AreaDraftSummary[]>([]);
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);
  const [deleteConfirmationId, setDeleteConfirmationId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadDrafts = useCallback(async () => {
    setStatus("loading");
    setErrorMessage(null);
    const collected: AreaDraftSummary[] = [];
    const seenDraftIds = new Set<string>();
    const seenCursors = new Set<string>();
    let cursor: string | undefined;

    for (;;) {
      const result = await facade.queries.listLocalDrafts({ pageSize: 100, ...(cursor ? { cursor } : {}) });
      if (!result.ok) {
        setStatus("error");
        setErrorMessage(result.error.message);
        trackTelemetryEvent("ui.workspace.area_drafts.load_failed", {
          userId,
          code: result.error.code,
          recovery: result.error.recovery
        });
        return;
      }
      result.value.items.forEach((draft) => {
        if (!seenDraftIds.has(draft.draftId)) {
          seenDraftIds.add(draft.draftId);
          collected.push(draft);
        }
      });
      if (!result.value.nextCursor) break;
      if (seenCursors.has(result.value.nextCursor)) {
        setStatus("error");
        setErrorMessage("The local draft list returned a repeated pagination cursor.");
        return;
      }
      seenCursors.add(result.value.nextCursor);
      cursor = result.value.nextCursor;
    }

    setDrafts(collected);
    setSelectedDraftId((current) =>
      current && seenDraftIds.has(current) ? current : (collected[0]?.draftId ?? null)
    );
    setDeleteConfirmationId(null);
    setStatus("ready");
    trackTelemetryEvent("ui.workspace.area_drafts.loaded", {
      userId,
      count: collected.length
    });
  }, [facade, trackTelemetryEvent, userId]);

  useEffect(() => {
    void loadDrafts();
  }, [loadDrafts, refreshRevision]);

  const selectedDraft = useMemo(
    () => drafts.find((draft) => draft.draftId === selectedDraftId) ?? null,
    [drafts, selectedDraftId]
  );

  const openSelectedDraft = useCallback(async () => {
    if (!selectedDraft) return;
    setStatus("opening");
    setErrorMessage(null);
    const result = await facade.queries.openLocalDraft({
      draftId: selectedDraft.draftId,
      revision: selectedDraft.revision
    });
    if (!result.ok) {
      setStatus("error");
      setErrorMessage(result.error.message);
      trackTelemetryEvent("ui.workspace.area_drafts.open_failed", {
        userId,
        draftId: selectedDraft.draftId,
        revision: selectedDraft.revision,
        code: result.error.code,
        recovery: result.error.recovery
      });
      return;
    }
    const resolvedDraft = resolveAreaWorkspaceDraft(result.value.draft.payload);
    if (!resolvedDraft) {
      setStatus("error");
      setErrorMessage("The local draft contains an invalid Area scene payload.");
      trackTelemetryEvent("ui.workspace.area_drafts.open_payload_invalid", {
        userId,
        draftId: selectedDraft.draftId,
        revision: selectedDraft.revision
      });
      return;
    }
    const scene = resolvedDraft.scene;
    draftSessionRegistry.current[scene.sceneId] = {
      draftId: selectedDraft.draftId,
      revision: result.value.revision,
      normalizedSha256: result.value.normalizedSha256,
      persistedSceneUpdatedAtUnixMs: scene.updatedAtUnixMs,
      ...(resolvedDraft.productionSource
        ? { productionSource: resolvedDraft.productionSource }
        : {})
    };
    onAreaSceneSelected(scene);
    setStatus("ready");
    trackTelemetryEvent("ui.workspace.area_drafts.opened", {
      userId,
      draftId: selectedDraft.draftId,
      revision: result.value.revision,
      tileCount: scene.tiles.length,
      objectCount: scene.objects.length
    });
  }, [draftSessionRegistry, facade, onAreaSceneSelected, selectedDraft, trackTelemetryEvent, userId]);

  const requestDelete = useCallback(() => {
    if (!selectedDraft) return;
    setDeleteConfirmationId(selectedDraft.draftId);
    setErrorMessage(null);
  }, [selectedDraft]);

  const confirmDelete = useCallback(async () => {
    if (!selectedDraft || deleteConfirmationId !== selectedDraft.draftId) return;
    setStatus("deleting");
    setErrorMessage(null);
    const result = await facade.commands.deleteLocalDraft({
      draftId: selectedDraft.draftId,
      expectedRevision: selectedDraft.revision,
      idempotencyKey: createIdempotencyKey()
    });
    if (!result.ok) {
      setStatus("error");
      setErrorMessage(result.error.message);
      setDeleteConfirmationId(null);
      trackTelemetryEvent("ui.workspace.area_drafts.delete_failed", {
        userId,
        draftId: selectedDraft.draftId,
        revision: selectedDraft.revision,
        code: result.error.code,
        recovery: result.error.recovery,
        expectedRevision: result.error.expectedRevision,
        actualRevision: result.error.actualRevision
      });
      return;
    }

    for (const [sceneId, session] of Object.entries(draftSessionRegistry.current)) {
      if (session.draftId === selectedDraft.draftId) delete draftSessionRegistry.current[sceneId];
    }
    setDrafts((current) => {
      const next = current.filter((draft) => draft.draftId !== selectedDraft.draftId);
      setSelectedDraftId(next[0]?.draftId ?? null);
      return next;
    });
    setDeleteConfirmationId(null);
    setStatus("ready");
    trackTelemetryEvent("ui.workspace.area_drafts.deleted", {
      userId,
      draftId: result.value.draftId,
      revision: result.value.deletedRevision,
      idempotencyStatus: result.metadata.idempotencyStatus
    });
  }, [createIdempotencyKey, deleteConfirmationId, draftSessionRegistry, facade, selectedDraft, trackTelemetryEvent, userId]);

  return (
    <section
      className="area-draft-panel sidebar-section"
      aria-label="My local drafts"
      hidden={hidden}
      data-status={status}
    >
      <header className="area-draft-panel-header">
        <div>
          <span>Drafts</span>
          <strong>My local drafts</strong>
        </div>
        <button
          type="button"
          className="topbar-btn"
          aria-label="Refresh local drafts"
          disabled={status === "loading" || status === "opening" || status === "deleting"}
          onClick={() => void loadDrafts()}
        >
          Refresh
        </button>
      </header>

      {errorMessage ? <p role="alert">{errorMessage}</p> : null}
      {status === "loading" ? <p>Loading local drafts...</p> : null}
      {status !== "loading" && drafts.length === 0 ? <p>No local drafts yet.</p> : null}

      {drafts.length > 0 ? (
        <ul className="area-draft-list" aria-label="Local Area drafts">
          {drafts.map((draft) => {
            const selected = draft.draftId === selectedDraftId;
            return (
              <li key={draft.draftId}>
                <button
                  type="button"
                  className={selected ? "is-selected" : undefined}
                  aria-label={`Select ${draft.title}`}
                  aria-pressed={selected}
                  onClick={() => {
                    setSelectedDraftId(draft.draftId);
                    setDeleteConfirmationId(null);
                  }}
                >
                  <strong>{draft.title}</strong>
                  <span>r{draft.revision}</span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      <div className="area-draft-actions">
        <button
          type="button"
          className="topbar-btn"
          aria-label="Open selected local draft"
          disabled={!selectedDraft || status === "opening" || status === "deleting"}
          onClick={() => void openSelectedDraft()}
        >
          {status === "opening" ? "Opening..." : "Open Draft"}
        </button>
        <button
          type="button"
          className="topbar-btn"
          aria-label="Delete selected local draft"
          disabled={!selectedDraft || status === "opening" || status === "deleting"}
          onClick={requestDelete}
        >
          Delete Draft
        </button>
      </div>

      {selectedDraft && deleteConfirmationId === selectedDraft.draftId ? (
        <div className="area-draft-delete-confirmation" role="group" aria-label="Confirm local draft deletion">
          <span>Delete revision {selectedDraft.revision}? This cannot be undone.</span>
          <button
            type="button"
            className="topbar-btn"
            aria-label={`Confirm delete ${selectedDraft.title}`}
            onClick={() => void confirmDelete()}
          >
            Confirm Delete
          </button>
          <button
            type="button"
            className="topbar-btn"
            aria-label="Cancel local draft deletion"
            onClick={() => setDeleteConfirmationId(null)}
          >
            Cancel
          </button>
        </div>
      ) : null}
    </section>
  );
}

export function parseAreaDraftScene(value: unknown): AreaScene | null {
  return resolveAreaWorkspaceDraft(value)?.scene ?? null;
}
function defaultDeleteIdempotencyKey(): string {
  const randomId = globalThis.crypto?.randomUUID?.();
  return randomId ? `area-draft-delete:${randomId}` : `area-draft-delete:${Date.now()}`;
}
