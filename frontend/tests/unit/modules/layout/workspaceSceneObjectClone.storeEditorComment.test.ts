import { describe, expect, it } from "vitest";
import { cloneSceneObject } from
  "../../../../src/modules/layout/application/workspaceSceneObjectClone";
import { createNewSceneObject } from "../../../../src/modules/scene/domain/sceneFactory";

describe("cloneSceneObject Store editor Comments", () => {
  it("preserves immutable GIC provenance and an independent target snapshot", () => {
    const source = createNewSceneObject("stores", 1, 2, 3);
    source.source = {
      type: "aurora_git",
      sourceKind: "store",
      sourceObjectId: "sto:0:x2_merc_dye:source",
      sourceIndex: 0,
      storeEditorComment: "  Aurora source note\r\n  ",
    };
    source.storeProperties = { comments: "  Aurora target note\r\n  " };

    const cloned = cloneSceneObject(source);

    expect(cloned.source?.storeEditorComment).toBe("  Aurora source note\r\n  ");
    expect(cloned.source).not.toBe(source.source);
    expect(cloned.storeProperties).not.toBe(source.storeProperties);
    expect(cloned.storeProperties?.comments).toBe("  Aurora target note\r\n  ");
  });

  it("detaches Store commerce source provenance and target state", () => {
    const source = createNewSceneObject("stores", 1, 2, 3);
    const commerce = {
      markUp: 100,
      markDown: 65,
      blackMarket: false,
      blackMarketMarkDown: 25,
      identifyPrice: 100,
      maxBuyPrice: -1,
      storeGold: -1,
    };
    source.source = {
      type: "aurora_git",
      sourceKind: "store",
      sourceObjectId: "sto:0:x2_merc_dye:source",
      sourceIndex: 0,
      storeCommerce: commerce,
    };
    source.storeProperties = { comments: "", commerce: { ...commerce, markUp: 125 } };

    const cloned = cloneSceneObject(source);

    expect(cloned.source?.storeCommerce).toStrictEqual(commerce);
    expect(cloned.storeProperties?.commerce).toStrictEqual({ ...commerce, markUp: 125 });
    expect(cloned.source?.storeCommerce).not.toBe(source.source.storeCommerce);
    expect(cloned.storeProperties?.commerce).not.toBe(source.storeProperties.commerce);
  });

  it("detaches Store script-ResRef source provenance and target state", () => {
    const source = createNewSceneObject("stores", 1, 2, 3);
    const scriptResRefs = {
      onOpenStore: "store_open",
      onStoreClosed: "store_closed",
    };
    source.source = {
      type: "aurora_git",
      sourceKind: "store",
      sourceObjectId: "sto:0:x2_merc_dye:source",
      sourceIndex: 0,
      storeScriptResRefs: scriptResRefs,
    };
    source.storeProperties = {
      comments: "",
      scriptResRefs: { onOpenStore: "nw_store_open", onStoreClosed: "nw_store_close" },
    };

    const cloned = cloneSceneObject(source);

    expect(cloned.source?.storeScriptResRefs).toStrictEqual(scriptResRefs);
    expect(cloned.storeProperties?.scriptResRefs).toStrictEqual({
      onOpenStore: "nw_store_open",
      onStoreClosed: "nw_store_close",
    });
    expect(cloned.source?.storeScriptResRefs).not.toBe(source.source.storeScriptResRefs);
    expect(cloned.storeProperties?.scriptResRefs).not.toBe(source.storeProperties.scriptResRefs);
  });

  it("detaches Store VarTable provenance and editable target entries", () => {
    const source = createNewSceneObject("stores", 1, 2, 3);
    source.source = {
      type: "aurora_git",
      sourceKind: "store",
      sourceObjectId: "sto:0:x2_merc_dye:source",
      sourceIndex: 0,
      storeVariables: { expectedEntries: [
        { sourceIndex: 0, name: "Counter", type: "int", value: 1 },
      ] },
    };
    source.storeProperties = {
      comments: "",
      variables: [{ name: "Counter", type: "int", value: 2 }],
    };

    const cloned = cloneSceneObject(source);

    expect(cloned.source?.storeVariables).toEqual(source.source.storeVariables);
    expect(cloned.source?.storeVariables).not.toBe(source.source.storeVariables);
    expect(cloned.source?.storeVariables?.expectedEntries)
      .not.toBe(source.source.storeVariables.expectedEntries);
    expect(cloned.storeProperties?.variables).toEqual(source.storeProperties.variables);
    expect(cloned.storeProperties?.variables).not.toBe(source.storeProperties.variables);
    expect(cloned.storeProperties?.variables?.[0]).not.toBe(source.storeProperties.variables?.[0]);
  });

  it("deeply detaches Store restriction provenance and ordered target lists", () => {
    const source = createNewSceneObject("stores", 1, 2, 3);
    source.source = {
      type: "aurora_git",
      sourceKind: "store",
      sourceObjectId: "sto:0:x2_merc_dye:source",
      sourceIndex: 0,
      storeRestrictions: {
        expectedValue: {
          willNotBuy: { present: true, baseItemIds: [2, 1, 2] },
          willOnlyBuy: { present: false, baseItemIds: [] },
        },
        tableSha256: "e".repeat(64),
        tableRowCount: 4,
      },
    };
    source.storeProperties = {
      comments: "",
      restrictions: { willNotBuy: [1, 2, 1], willOnlyBuy: [0] },
    };

    const cloned = cloneSceneObject(source);

    expect(cloned.source?.storeRestrictions).toStrictEqual(source.source.storeRestrictions);
    expect(cloned.source?.storeRestrictions).not.toBe(source.source.storeRestrictions);
    expect(cloned.source?.storeRestrictions?.expectedValue.willNotBuy.baseItemIds)
      .not.toBe(source.source.storeRestrictions.expectedValue.willNotBuy.baseItemIds);
    expect(cloned.storeProperties?.restrictions).toStrictEqual(
      source.storeProperties.restrictions,
    );
    expect(cloned.storeProperties?.restrictions).not.toBe(
      source.storeProperties.restrictions,
    );
    expect(cloned.storeProperties?.restrictions?.willNotBuy).not.toBe(
      source.storeProperties.restrictions.willNotBuy,
    );
  });
});
