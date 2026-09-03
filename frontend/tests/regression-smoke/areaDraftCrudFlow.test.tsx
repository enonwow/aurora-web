import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { createHttpAreaLifecyclePort } from "../../src/modules/areas/adapters/httpAreaLifecyclePort";
import { createAreaLifecycleFacade } from "../../src/modules/areas/application/areaLifecycleFacade";
import type { AreaDraftDocument } from "../../src/modules/areas/ports/areaLifecyclePort";
import { AreaDraftPanel } from "../../src/modules/layout/components/AreaDraftPanel";
import type { AreaScene } from "../../src/modules/scene/contracts";

describe("Area draft CRUD regression smoke", () => {
  it("lists, opens, and explicitly deletes one owner-scoped draft through the HTTP adapter", async () => {
    const areaScene: AreaScene = {
      sceneId: "scene_from_draft",
      areaName: "Regression draft",
      areaTag: "REGRESSION_DRAFT",
      areaBasicIdentity: {
        name: "Regression draft",
        nameProfile: "multi_entry_inline_ascii",
        nameEntries: [
          { languageId: 0, text: "Regression draft" },
          { languageId: 2, text: "Szkic regresji" },
        ],
        tag: "REGRESSION_DRAFT",
      },
      width: 2,
      height: 2,
      tiles: [],
      objects: [],
      updatedAtUnixMs: 1,
      source: "local_draft"
    };
    const draft: AreaDraftDocument<AreaScene> = {
      schemaVersion: "area-draft.v1",
      title: "Regression draft",
      source: { type: "new" },
      payload: areaScene
    };
    let exists = true;
    const fetchFn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      if (method === "GET" && url.endsWith("/area-drafts?pageSize=100")) {
        return jsonEnvelope({
          items: exists
            ? [{ draftId: "remote_draft_01", title: draft.title, revision: 3, updatedAt: "2026-08-07T10:00:00.000Z", source: draft.source }]
            : [],
          nextCursor: null
        });
      }
      if (method === "GET" && url.endsWith("/area-drafts/remote_draft_01?revision=3")) {
        return jsonEnvelope({
          draftId: "remote_draft_01",
          title: draft.title,
          revision: 3,
          updatedAt: "2026-08-07T10:00:00.000Z",
          normalizedSha256: "a".repeat(64),
          source: draft.source,
          draft
        }, { ETag: '"3"' });
      }
      if (method === "DELETE" && url.endsWith("/area-drafts/remote_draft_01")) {
        exists = false;
        return jsonEnvelope({
          idempotency: "created",
          result: { draftId: "remote_draft_01", deletedRevision: 3, deleted: true }
        }, { ETag: '"3"' });
      }
      return new Response(null, { status: 404 });
    });
    const port = createHttpAreaLifecyclePort<AreaDraftDocument<AreaScene>>(
      fetchFn,
      "/api/v1",
      () => "builder-token"
    );
    const facade = createAreaLifecycleFacade({ queryPort: port, commandPort: port });
    const onAreaSceneSelected = vi.fn();
    const sessions = { current: {} };

    render(
      <AreaDraftPanel
        userId="builder_01"
        facade={facade}
        draftSessionRegistry={sessions}
        createIdempotencyKey={() => "regression-delete-01"}
        onAreaSceneSelected={onAreaSceneSelected}
        trackTelemetryEvent={vi.fn()}
      />
    );

    expect(await screen.findByText("Regression draft")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /open selected local draft/i }));
    await waitFor(() => expect(onAreaSceneSelected).toHaveBeenCalledWith(areaScene));
    expect(sessions.current).toEqual({
      scene_from_draft: {
        draftId: "remote_draft_01",
        revision: 3,
        normalizedSha256: "a".repeat(64),
        persistedSceneUpdatedAtUnixMs: 1
      }
    });

    fireEvent.click(screen.getByRole("button", { name: /delete selected local draft/i }));
    fireEvent.click(screen.getByRole("button", { name: /confirm delete regression draft/i }));
    await waitFor(() => expect(screen.queryByText("Regression draft")).not.toBeInTheDocument());
    expect(fetchFn).toHaveBeenCalledTimes(3);
    expect(new Headers(fetchFn.mock.calls[2]?.[1]?.headers).get("If-Match")).toBe('"3"');
    expect(sessions.current).toEqual({});
  });
});

function jsonEnvelope(
  data: unknown,
  headers: Record<string, string> = {}
): Response {
  return new Response(
    JSON.stringify({ contractVersion: "1.1.0", requestId: "request-regression", data }),
    { status: 200, headers: { "Content-Type": "application/json", ...headers } }
  );
}
