import { describe, expect, it } from "vitest";
import { createSeedAreaScene } from "../../../../src/modules/scene/sceneFactory";
import {
  commitSceneHistory,
  createSceneHistory,
  redoSceneHistory,
  undoSceneHistory
} from "../../../../src/modules/scene/sceneHistory";

describe("sceneHistory - negative cases", () => {
  it("keeps past stack empty when historyLimit is zero or negative", () => {
    const seed = createSeedAreaScene();
    const history = createSceneHistory(seed);

    const withZeroLimit = commitSceneHistory(
      history,
      { ...seed, areaName: "Zero" },
      0
    );
    expect(withZeroLimit.past).toHaveLength(0);

    const withNegativeLimit = commitSceneHistory(
      history,
      { ...seed, areaName: "Negative" },
      -5
    );
    expect(withNegativeLimit.past).toHaveLength(0);
  });

  it("does not mutate original history object on undo/redo no-op", () => {
    const seed = createSeedAreaScene();
    const history = createSceneHistory(seed);
    const historySnapshot = JSON.stringify(history);

    const undone = undoSceneHistory(history);
    const redone = redoSceneHistory(history);

    expect(undone).toBe(history);
    expect(redone).toBe(history);
    expect(JSON.stringify(history)).toBe(historySnapshot);
  });
});

