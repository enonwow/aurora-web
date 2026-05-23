import { describe, expect, it } from "vitest";
import { createSceneHistoryFacade } from "../../../../../src/modules/scene/application/sceneHistoryFacade";
import { createSeedAreaScene } from "../../../../../src/modules/scene/sceneFactory";
import { createSceneHistory } from "../../../../../src/modules/scene/sceneHistory";

describe("sceneHistoryFacade", () => {
  it("commits scene snapshots to history", () => {
    const facade = createSceneHistoryFacade();
    const seed = createSeedAreaScene();
    const history = createSceneHistory(seed);
    const nextScene = {
      ...seed,
      areaName: "Edited"
    };

    const committed = facade.commit(history, nextScene);

    expect(committed.past).toHaveLength(1);
    expect(committed.present.areaName).toBe("Edited");
  });

  it("undoes and redoes through facade API", () => {
    const facade = createSceneHistoryFacade();
    const seed = createSeedAreaScene();
    const history = createSceneHistory(seed);
    const edited = {
      ...seed,
      areaName: "Edited"
    };

    const committed = facade.commit(history, edited);
    const undone = facade.undo(committed);
    const redone = facade.redo(undone);

    expect(undone.present.areaName).toBe(seed.areaName);
    expect(redone.present.areaName).toBe("Edited");
  });
});

