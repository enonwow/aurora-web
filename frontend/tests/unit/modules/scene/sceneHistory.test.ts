import { describe, expect, it } from "vitest";
import { createSeedAreaScene } from "../../../../src/modules/scene/domain/sceneFactory";
import {
  commitSceneHistory,
  createSceneHistory,
  redoSceneHistory,
  undoSceneHistory
} from "../../../../src/modules/scene/domain/sceneHistory";

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

  it("trims past history to limit and keeps most recent entries", () => {
    const seed = createSeedAreaScene();
    const h0 = createSceneHistory(seed);
    const h1 = commitSceneHistory(h0, { ...seed, areaName: "A" }, 2);
    const h2 = commitSceneHistory(h1, { ...seed, areaName: "B" }, 2);
    const h3 = commitSceneHistory(h2, { ...seed, areaName: "C" }, 2);

    expect(h3.past).toHaveLength(2);
    expect(h3.past[0]?.areaName).toBe("A");
    expect(h3.past[1]?.areaName).toBe("B");
  });

  it("clears future stack on new commit after undo", () => {
    const seed = createSeedAreaScene();
    const h0 = createSceneHistory(seed);
    const h1 = commitSceneHistory(h0, { ...seed, areaName: "A" });
    const h2 = commitSceneHistory(h1, { ...seed, areaName: "B" });
    const undone = undoSceneHistory(h2);
    expect(undone.future).toHaveLength(1);

    const recommit = commitSceneHistory(undone, { ...seed, areaName: "C" });
    expect(recommit.future).toHaveLength(0);
    expect(recommit.present.areaName).toBe("C");
  });
});
