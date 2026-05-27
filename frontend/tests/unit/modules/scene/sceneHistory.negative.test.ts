import { describe, expect, it } from "vitest";
import { createSeedAreaScene } from "../../../../src/modules/scene/domain/sceneFactory";
import {
  commitSceneHistory,
  createSceneHistory,
  redoSceneHistory,
  undoSceneHistory
} from "../../../../src/modules/scene/domain/sceneHistory";

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

  it("normalizes non-integer history limit with floor and keeps only most recent entries", () => {
    const seed = createSeedAreaScene();
    const h0 = createSceneHistory(seed);
    const h1 = commitSceneHistory(h0, { ...seed, areaName: "A" }, 1.9);
    const h2 = commitSceneHistory(h1, { ...seed, areaName: "B" }, 1.9);

    expect(h2.past).toHaveLength(1);
    expect(h2.past[0]?.areaName).toBe("A");
  });

  it("returns deep-cloned snapshots so later mutation does not leak into history", () => {
    const seed = createSeedAreaScene();
    const h0 = createSceneHistory(seed);
    const committed = commitSceneHistory(h0, {
      ...h0.present,
      areaName: "Edited"
    });

    committed.past[0]!.areaName = "MUTATED_PAST";
    committed.present.areaName = "MUTATED_PRESENT";

    const undone = undoSceneHistory(committed);
    expect(undone.present.areaName).toBe("MUTATED_PAST");
    expect(undone.future[0]?.areaName).toBe("MUTATED_PRESENT");

    const redone = redoSceneHistory(undone);
    expect(redone.present.areaName).toBe("MUTATED_PRESENT");
  });

  it("treats commit with unchanged scene reference as no-op and preserves redo stack", () => {
    const seed = createSeedAreaScene();
    const h0 = createSceneHistory(seed);
    const h1 = commitSceneHistory(h0, { ...seed, areaName: "A" });
    const h2 = commitSceneHistory(h1, { ...seed, areaName: "B" });
    const undone = undoSceneHistory(h2);
    expect(undone.future).toHaveLength(1);

    const noopCommit = commitSceneHistory(undone, undone.present);
    expect(noopCommit).toBe(undone);
    expect(noopCommit.past).toHaveLength(1);
    expect(noopCommit.future).toHaveLength(1);

    const redone = redoSceneHistory(noopCommit);
    expect(redone.present.areaName).toBe("B");
  });
});

