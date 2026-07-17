import { describe, expect, it } from "vitest";
import {
  buildAuroraItemCommandBlueprintPayload,
  executeAuroraItemCommandBatch,
  executeAuroraItemCommand,
  type AuroraItemCommand
} from "../../../../src/modules/items/application/itemCommandLayer";
import type { SceneObject } from "../../../../src/modules/scene/contracts";

function buildItem(overrides: Partial<SceneObject> = {}): SceneObject {
  return {
    id: "itm_template_item_nw_it_mpotion001",
    kind: "items",
    name: "Potion of Cure Light Wounds",
    resRef: "nw_it_mpotion001",
    tag: "NW_IT_MPOTION001",
    previewImageUrl: "",
    x: 1,
    y: 2,
    z: 0,
    bearing: 90,
    visualTransform: {
      scale: 1,
      offsetX: 0,
      offsetY: 0,
      offsetZ: 0,
      pitch: 0,
      roll: 0,
      yaw: 0
    },
    source: {
      type: "aurora_git",
      sourceKind: "item",
      sourceObjectId: "item_nw_it_mpotion001",
      templateId: "item_nw_it_mpotion001"
    },
    itemProperties: {
      baseItem: 49,
      baseItemLabel: "Potion",
      charges: 1,
      stackSize: 1,
      identified: true,
      stolen: false,
      cursed: false,
      baseItemMaxProps: 2,
      propertyList: [
        {
          propertyName: 15,
          subtype: 66,
          costTable: 3,
          costValue: 1
        }
      ]
    },
    ...overrides
  };
}

function execute(objects: SceneObject[], command: AuroraItemCommand) {
  return executeAuroraItemCommand(objects, command);
}

describe("itemCommandLayer", () => {
  it("creates an item from a template with Aurora-safe identity fields", () => {
    const template = buildItem();
    const result = execute([], {
      type: "create",
      template,
      sequence: 17,
      resRef: "Custom Potion Copy",
      tag: "Custom Potion Copy",
      name: "Custom Potion",
      x: 3,
      y: 4
    });

    expect(result.issues).toEqual([]);
    expect(result.objects).toHaveLength(1);
    expect(result.changedObject).toMatchObject({
      id: "itm_cmd_custom_potion_co_17",
      kind: "items",
      name: "Custom Potion",
      resRef: "custom_potion_co",
      tag: "CUSTOM_POTION_COPY",
      x: 3,
      y: 4,
      bearing: 90,
      itemProperties: expect.objectContaining({
        baseItem: 49,
        propertyList: [
          expect.objectContaining({
            propertyName: 15,
            subtype: 66
          })
        ]
      })
    });
  });

  it("copies an existing item and keeps source item unchanged", () => {
    const source = buildItem();
    const result = execute([source], {
      type: "copy",
      sourceId: source.id,
      sequence: 18,
      resRef: "copied_potion",
      name: "Copied Potion"
    });

    expect(result.issues).toEqual([]);
    expect(result.objects).toHaveLength(2);
    expect(result.objects[0]).toBe(source);
    expect(result.changedObject).toMatchObject({
      id: "itm_cmd_copied_potion_18",
      resRef: "copied_potion",
      name: "Copied Potion",
      itemProperties: expect.objectContaining({
        charges: 1,
        stackSize: 1
      })
    });
  });

  it("sets charges, stack size and item flags through discrete commands", () => {
    const source = buildItem();
    const charged = execute([source], {
      type: "set-charges",
      targetId: source.id,
      charges: 12
    }).objects;
    const stacked = execute(charged, {
      type: "set-stack-size",
      targetId: source.id,
      stackSize: 7
    }).objects;
    const flagged = execute(stacked, {
      type: "set-flags",
      targetId: source.id,
      identified: false,
      stolen: true,
      cursed: true,
      plot: true
    });

    expect(flagged.changedObject?.itemProperties).toMatchObject({
      charges: 12,
      stackSize: 7,
      identified: false,
      stolen: true,
      cursed: true,
      plot: true
    });
  });

  it("runs script-style item command batches and materializes a backend UTI payload", () => {
    const source = buildItem();
    const copied = execute([source], {
      type: "copy",
      sourceId: source.id,
      sequence: 19,
      resRef: "scripted_potion"
    }).changedObject!;

    const result = executeAuroraItemCommandBatch([source, copied], [
      {
        type: "set-identity",
        targetId: copied.id,
        resRef: "Scripted Potion",
        tag: "Scripted Potion +1",
        name: "Scripted Potion +1"
      },
      {
        type: "set-charges",
        targetId: copied.id,
        charges: 5
      },
      {
        type: "set-stack-size",
        targetId: copied.id,
        stackSize: 3
      },
      {
        type: "set-flags",
        targetId: copied.id,
        identified: false,
        stolen: true
      },
      {
        type: "update-property",
        targetId: copied.id,
        propertyIndex: 0,
        property: {
          subtype: 184,
          costValue: 2
        }
      }
    ]);

    expect(result.issues).toEqual([]);
    expect(result.changedObjects).toHaveLength(5);
    const changed = result.changedObjects.at(-1)!;
    const payload = buildAuroraItemCommandBlueprintPayload(changed, { overwrite: true });

    expect(changed).toMatchObject({
      resRef: "scripted_potion",
      tag: "SCRIPTED_POTION_1",
      name: "Scripted Potion +1",
      itemProperties: expect.objectContaining({
        charges: 5,
        stackSize: 3,
        identified: false,
        stolen: true,
        propertyList: [
          expect.objectContaining({
            propertyName: 15,
            subtype: 184,
            costValue: 2
          })
        ]
      })
    });
    expect(payload).toMatchObject({
      templateResRef: "scripted_potion",
      name: "Scripted Potion +1",
      tag: "SCRIPTED_POTION_1",
      baseItem: 49,
      charges: 5,
      stackSize: 3,
      identified: false,
      stolen: true,
      overwrite: true,
      propertyList: [
        expect.objectContaining({
          propertyName: 15,
          subtype: 184,
          costValue: 2
        })
      ]
    });
  });

  it("adds and removes item properties while respecting MaxProps", () => {
    const source = buildItem();
    const withSecondProperty = execute([source], {
      type: "add-property",
      targetId: source.id,
      property: {
        propertyName: 16,
        costTable: 2,
        costValue: 3
      }
    });

    expect(withSecondProperty.issues).toEqual([]);
    expect(withSecondProperty.changedObject?.itemProperties?.propertyList).toHaveLength(2);

    const overLimit = execute(withSecondProperty.objects, {
      type: "add-property",
      targetId: source.id,
      property: {
        propertyName: 17
      }
    });

    expect(overLimit.issues).toEqual([
      expect.objectContaining({
        code: "ITEM_COMMAND_PROPERTY_LIMIT_REACHED",
        severity: "error"
      })
    ]);
    expect(overLimit.changedObject?.itemProperties?.propertyList).toHaveLength(2);

    const removedFirst = execute(withSecondProperty.objects, {
      type: "remove-property",
      targetId: source.id,
      propertyIndex: 0
    });

    expect(removedFirst.issues).toEqual([]);
    expect(removedFirst.changedObject?.itemProperties?.propertyList).toEqual([
      expect.objectContaining({
        propertyName: 16
      })
    ]);
  });

  it("reports missing command targets instead of mutating the scene", () => {
    const source = buildItem();
    const result = execute([source], {
      type: "set-stack-size",
      targetId: "missing",
      stackSize: 2
    });

    expect(result.objects).toEqual([source]);
    expect(result.changedObject).toBeNull();
    expect(result.issues).toEqual([
      expect.objectContaining({
        code: "ITEM_COMMAND_TARGET_NOT_FOUND",
        severity: "error"
      })
    ]);
  });
});
