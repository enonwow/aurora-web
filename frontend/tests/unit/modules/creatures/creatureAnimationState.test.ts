import { describe, expect, it } from "vitest";
import { resolveCreatureAnimationStateClip } from "../../../../src/modules/creatures/domain/creatureAnimationState";

describe("resolveCreatureAnimationStateClip", () => {
  it("selects a retail pause alias without changing the model clip casing", () => {
    expect(resolveCreatureAnimationStateClip(0, ["idle", "CPause1"])).toEqual({
      state: 0,
      label: "looping pause",
      loopMode: "loop",
      candidateClipNames: ["cpause1", "pause1"],
      matchedClipName: "CPause1"
    });
  });

  it("maps standard and custom nwscript animation states to clip aliases", () => {
    expect(resolveCreatureAnimationStateClip(2, ["listen"])).toMatchObject({
      label: "looping listen",
      loopMode: "loop",
      matchedClipName: "listen"
    });
    expect(resolveCreatureAnimationStateClip(21, ["custom1lp"])).toMatchObject({
      label: "looping custom 1",
      loopMode: "loop",
      matchedClipName: "custom1lp"
    });
  });

  it("keeps every retail nwscript creature state mapped with its declared loop policy", () => {
    const loopingStates = Array.from({ length: 93 }, (_, state) => state);
    const fireAndForgetStates = Array.from({ length: 17 }, (_, index) => 100 + index);

    loopingStates.forEach((state) => {
      const resolution = resolveCreatureAnimationStateClip(state, []);
      expect(resolution.candidateClipNames.length).toBeGreaterThan(0);
      expect(resolution.loopMode).toBe("loop");
    });
    fireAndForgetStates.forEach((state) => {
      const resolution = resolveCreatureAnimationStateClip(state, []);
      expect(resolution.candidateClipNames.length).toBeGreaterThan(0);
      expect(resolution.loopMode).toBe("once");
    });
  });

  it("keeps unknown states unmapped and known-but-absent clips explicit", () => {
    expect(resolveCreatureAnimationStateClip(999, ["cpause1"])).toEqual({
      state: 999,
      candidateClipNames: []
    });
    expect(resolveCreatureAnimationStateClip(8, ["cpause1"])).toEqual({
      state: 8,
      label: "looping talk normal",
      loopMode: "loop",
      candidateClipNames: ["ctlknorm", "tlknorm"]
    });
  });

  it("keeps nwscript fire-and-forget states one-shot even when the clip name is generic", () => {
    expect(resolveCreatureAnimationStateClip(104, ["salute"])).toMatchObject({
      label: "salute",
      loopMode: "once",
      matchedClipName: "salute"
    });
  });

  it("maps retail pause poisoned and victory clip aliases for the remaining nwscript states", () => {
    expect(resolveCreatureAnimationStateClip(15, ["pausepsn"])).toMatchObject({
      label: "looping pause drunk",
      loopMode: "loop",
      matchedClipName: "pausepsn"
    });
    expect(resolveCreatureAnimationStateClip(109, ["victorymg"])).toMatchObject({
      label: "victory 1",
      loopMode: "once",
      matchedClipName: "victorymg"
    });
    expect(resolveCreatureAnimationStateClip(110, ["victoryth"])).toMatchObject({
      label: "victory 2",
      loopMode: "once",
      matchedClipName: "victoryth"
    });
    expect(resolveCreatureAnimationStateClip(111, ["victoryfr"])).toMatchObject({
      label: "victory 3",
      loopMode: "once",
      matchedClipName: "victoryfr"
    });
  });
});
