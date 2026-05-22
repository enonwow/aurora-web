import { describe, expect, it } from "vitest";
import { createSeedAreaScene } from "../../../../src/modules/scene/sceneFactory";
import {
  commitSceneHistory,
  createSceneHistory,
  redoSceneHistory,
  undoSceneHistory
} from "../../../../src/modules/scene/sceneHistory";

describe("sceneHistory", () => {
  it("commits scene mutations and supports undo/redo", () => {
    const seed = createSeedAreaScene();
    const history0 = createSceneHistory(seed);

    const history1 = commitSceneHistory(history0, {
      ...history0.present,
      areaName: "Modified Area"
    });
    expect(history1.present.areaName).toBe("Modified Area");
    expect(history1.past).toHaveLength(1);

    const history2 = undoSceneHistory(history1);
    expect(history2.present.areaName).toBe(seed.areaName);
    expect(history2.future).toHaveLength(1);

    const history3 = redoSceneHistory(history2);
    expect(history3.present.areaName).toBe("Modified Area");
    expect(history3.past).toHaveLength(1);
  });

  it("keeps history unchanged on undo/redo when stacks are empty", () => {
    const history = createSceneHistory(createSeedAreaScene());

    expect(undoSceneHistory(history)).toEqual(history);
    expect(redoSceneHistory(history)).toEqual(history);
  });
});
