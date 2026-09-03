import { describe, expect, it } from "vitest";

import {
  canEditExistingCreatureScriptResRef,
  materializeExistingCreatureScriptResRefs,
  reduceExistingCreatureScriptResRef,
} from "../../../../../src/modules/layout/application/creatureScriptResRefsProvenance";
import type {
  SceneObjectCreatureScriptSlots,
  SceneObjectSourceMetadata,
} from "../../../../../src/modules/scene/contracts";

const exactSource: SceneObjectSourceMetadata = {
  type: "aurora_git",
  sourceKind: "creature",
  sourceIndex: 0,
  sourceObjectId: "obj_cre_guard",
  creatureScriptResRefs: {
    onHeartbeat: { expectedResRef: "NW_C2_DEFAULT1" },
    onSpawn: { expectedResRef: "nw_c2_default9" },
  },
};

const current: SceneObjectCreatureScriptSlots = {
  onBlocked: "blocked_presentation",
  onCombatRoundEnd: "",
  onConversation: "",
  onDamaged: "",
  onDeath: "",
  onDisturbed: "",
  onHeartbeat: "NW_C2_DEFAULT1",
  onPerception: "",
  onPhysicalAttacked: "",
  onRested: "",
  onSpawn: "nw_c2_default9",
  onSpellCastAt: "",
  onUserDefined: "",
};

describe("existing Creature script ResRef provenance", () => {
  it("authorizes each slot only through its own exact ordinal-bound provenance", () => {
    expect(canEditExistingCreatureScriptResRef(exactSource, "onHeartbeat")).toBe(true);
    expect(canEditExistingCreatureScriptResRef(exactSource, "onSpawn")).toBe(true);
    expect(canEditExistingCreatureScriptResRef(exactSource, "onBlocked")).toBe(false);
    expect(canEditExistingCreatureScriptResRef({ ...exactSource, sourceIndex: undefined }, "onSpawn"))
      .toBe(false);
    expect(canEditExistingCreatureScriptResRef({ ...exactSource, sourceKind: "placeable" }, "onSpawn"))
      .toBe(false);
  });

  it("reduces only canonical targets or an unchanged exact source value", () => {
    expect(reduceExistingCreatureScriptResRef(
      exactSource, "onHeartbeat", "NW_C2_DEFAULT1", "NW_C2_DEFAULT1",
    )).toBe("NW_C2_DEFAULT1");
    expect(reduceExistingCreatureScriptResRef(
      exactSource, "onHeartbeat", "NW_C2_DEFAULT1", "main",
    )).toBe("main");
    expect(reduceExistingCreatureScriptResRef(
      exactSource, "onHeartbeat", "NW_C2_DEFAULT1", "MAIN",
    )).toBe("NW_C2_DEFAULT1");
    expect(reduceExistingCreatureScriptResRef(
      exactSource, "onBlocked", "blocked_presentation", "main",
    )).toBe("blocked_presentation");
  });

  it("materializes only authorized members and preserves unrelated slots", () => {
    expect(materializeExistingCreatureScriptResRefs(exactSource, current, {
      ...current,
      onHeartbeat: "main",
      onSpawn: "spawn_probe",
      onBlocked: "must_be_ignored",
    })).toEqual({
      ...current,
      onHeartbeat: "main",
      onSpawn: "spawn_probe",
    });
    expect(materializeExistingCreatureScriptResRefs(exactSource, undefined, current))
      .toBeUndefined();
  });
});
