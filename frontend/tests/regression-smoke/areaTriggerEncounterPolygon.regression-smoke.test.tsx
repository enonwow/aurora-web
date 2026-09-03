import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  buildAreaObjectPolygonDraft,
  materializeAreaObjectPolygonDraft,
  materializeAreaObjectPolygonDraftTag,
  updateAreaObjectPolygonDraftTag,
  updateAreaObjectPolygonDraftPoint,
  type AreaObjectPolygonDraft,
} from "../../src/modules/areas/application/areaObjectPolygonAuthoring";
import { parseAreaScene } from "../../src/modules/areas/application/areaWorkspaceDraft";
import { AreaObjectPolygonDialog } from "../../src/modules/layout/components/properties/AreaObjectPolygonDialog";
import { createSceneMutationsFacade } from "../../src/modules/scene/application/sceneMutationsFacade";
import type { AreaScene, SceneObject } from "../../src/modules/scene/contracts";

describe("Area Trigger/Encounter polygon regression smoke", () => {
  it("keeps native-local dialog editing connected to source-preserving scene mutation and draft admission", () => {
    render(<PolygonHarness />);

    fireEvent.change(screen.getByLabelText("Trigger Tag"), {
      target: { value: "  AREA_EXIT  " },
    });
    fireEvent.change(screen.getByLabelText("Point 3 Y"), { target: { value: "3.5" } });
    fireEvent.click(screen.getByRole("button", { name: "OK" }));

    const admitted = parseAreaScene(JSON.parse(screen.getByTestId("scene").textContent ?? "null"));
    expect(admitted?.objects[0]?.source?.polygonGeometry).toEqual(
      polygon([[0, 0, 0], [4, 0, 0], [0, 2, 0]]),
    );
    expect(admitted?.objects[0]?.polygonGeometry).toEqual(
      polygon([[0, 0, 0], [4, 0, 0], [0, 3.5, 0]]),
    );
    expect(admitted?.objects[0]?.tag).toBe("  AREA_EXIT  ");
    expect(admitted?.objects[0]?.source?.triggerTag).toEqual({
      present: true,
      value: "TRIGGER",
    });
    expect(screen.queryByRole("dialog", { name: "Trigger properties" })).toBeNull();
  });
});

function PolygonHarness() {
  const [scene, setScene] = useState<AreaScene>(() => polygonScene());
  const [draft, setDraft] = useState<AreaObjectPolygonDraft | null>(() =>
    buildAreaObjectPolygonDraft(polygonScene().objects[0]!),
  );
  if (!draft) return <output data-testid="scene">{JSON.stringify(scene)}</output>;
  return <>
    <AreaObjectPolygonDialog
      dialog={{
        objectId: draft.objectId,
        objectKind: draft.objectKind,
        draft,
        validationMessage: null,
        windowX: 10,
        windowY: 10,
        collapsed: false,
      }}
      onToggleCollapsed={() => undefined}
      onClose={() => setDraft(null)}
      onTagChange={(value) => setDraft((current) => current
        ? updateAreaObjectPolygonDraftTag(
            current,
            scene.objects[0]?.source,
            value,
          )
        : current)}
      onActiveChange={() => undefined}
      onPlayerOnlyChange={() => undefined}
      onPointChange={(pointIndex, field, value) =>
        setDraft((current) => current
          ? updateAreaObjectPolygonDraftPoint(current, pointIndex, field, value)
          : current)}
      onAddPoint={() => undefined}
      onRemovePoint={() => undefined}
      onResetToSource={() => undefined}
      onApply={(closeAfterApply) => {
        const geometry = materializeAreaObjectPolygonDraft(draft);
        if (!geometry) return;
        const tag = materializeAreaObjectPolygonDraftTag(
          draft,
          scene.objects[0]?.source,
          scene.objects[0]?.tag ?? "",
        );
        setScene((current) => createSceneMutationsFacade()
          .setAreaObjectPolygonGeometryById(current, draft.objectId, geometry, tag));
        if (closeAfterApply) setDraft(null);
      }}
    />
    <output data-testid="scene">{JSON.stringify(scene)}</output>
  </>;
}

function polygonScene(): AreaScene {
  return {
    sceneId: "polygon-regression",
    areaName: "Polygon Regression",
    width: 2,
    height: 2,
    tiles: [],
    objects: [polygonObject()],
    updatedAtUnixMs: 1,
    source: "aurora_area",
  };
}

function polygonObject(): SceneObject {
  const sourceGeometry = polygon([[0, 0, 0], [4, 0, 0], [0, 2, 0]]);
  return {
    id: "trigger-0",
    kind: "triggers",
    resRef: "newgeneric",
    tag: "TRIGGER",
    x: 1,
    y: 2,
    z: 0,
    bearing: 0,
    visualTransform: {
      scale: 1,
      offsetX: 0,
      offsetY: 0,
      offsetZ: 0,
      pitch: 0,
      yaw: 0,
      roll: 0,
    },
    source: {
      type: "aurora_git",
      sourceKind: "trigger",
      sourceIndex: 0,
      sourceObjectId: "trigger:0",
      triggerTag: { present: true, value: "TRIGGER" },
      polygonGeometry: sourceGeometry,
    },
    polygonGeometry: sourceGeometry,
  };
}

function polygon(points: ReadonlyArray<readonly [number, number, number]>) {
  return {
    coordinateSpace: "native_local" as const,
    points: points.map(([x, y, z]) => ({ x: Math.fround(x), y: Math.fround(y), z: Math.fround(z) })),
  };
}
