import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("WorkspaceCanvasViewport Creature ItemList source immutability", () => {
  it("materializes through the application boundary without rewriting source metadata", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/modules/layout/components/WorkspaceCanvasViewport.tsx"),
      "utf8"
    );

    expect(source).toContain("materializeExistingCreatureInventory(sourceObject, draft)");
    expect(source).toContain("source: sourceObject.source");
    expect(source).not.toContain(
      "inventoryItemListCount: nextCreatureProperties.inventoryItems.length"
    );
    expect(source).not.toContain(
      "inventoryItemListEntries: JSON.stringify(nextCreatureProperties.inventoryItems)"
    );
    expect(source).not.toContain(
      "equipItemListEntries: JSON.stringify(nextCreatureProperties.equippedItems)"
    );
  });

  it("materializes retained Equip_ItemList through its application boundary without rewriting source metadata", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/modules/layout/components/WorkspaceCanvasViewport.tsx"),
      "utf8"
    );

    expect(source).toContain("materializeExistingCreatureEquipment(sourceObject, draft)");
    expect(source).toContain("source: sourceObject.source");
    expect(source).not.toContain(
      "equipItemListMutationEntries: JSON.stringify(nextCreatureProperties.equippedItems)"
    );
    expect(source).not.toContain(
      "creatureEquippedItems: nextCreatureProperties.equippedItems"
    );
  });

  it("materializes retained Creature Tag through its application boundary without rewriting source metadata", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/modules/layout/components/WorkspaceCanvasViewport.tsx"),
      "utf8"
    );

    expect(source).toContain("materializeExistingCreatureTag(");
    expect(source).toContain("sourceObject.source,");
    expect(source).toContain("sourceObject.tag,");
    expect(source).toContain("draft.tag");
    expect(source).toContain("source: sourceObject.source");
    expect(source).not.toContain("creatureTag: { present:");
  });

  it("materializes retained Creature Conversation exactly and preserves unsupported No Interrupt", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/modules/layout/components/WorkspaceCanvasViewport.tsx"),
      "utf8"
    );

    expect(source).toContain("reduceExistingCreatureConversation(");
    expect(source).toContain("materializeExistingCreatureConversation(");
    expect(source).toContain("sourceObject.creatureProperties?.conversation ?? \"\"");
    expect(source).toContain("conversation: nextConversation");
    expect(source).toContain("noInterrupt: nextNoInterrupt");
    expect(source).toContain("source: sourceObject.source");
    expect(source).not.toContain("conversation: draft.conversation.trim()");
    expect(source).not.toContain("noInterrupt: draft.noInterrupt");
    expect(source).not.toContain("creatureConversation: { present:");
  });
});
