import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { StorePropertiesDialog } from
  "../../../../../../src/modules/layout/components/properties/StorePropertiesDialog";

describe("StorePropertiesDialog", () => {
  const itemBaseItemCatalog = {
    descriptor: {
      resourceName: "baseitems.2da" as const,
      sourceObjectKey: "modules/current/baseitems.2da",
      sourceLayer: "module" as const,
      sha256: "e".repeat(64),
      sizeBytes: 4096,
      rowCount: 4,
    },
    rows: Array.from({ length: 4 }, (_, rowIndex) => ({
      rowIndex,
      modelType: 0 as const,
      displayName: `Base item ${rowIndex}`,
      invSlotWidth: 1,
      invSlotHeight: 1,
    })),
  };

  it("exposes verified Store Comment, commerce, script, VarTable, and restriction subsets", () => {
    const onCommentsChange = vi.fn();
    const onCommerceChange = vi.fn();
    const onScriptResRefsChange = vi.fn();
    const onVariablesChange = vi.fn();
    const onRestrictionsChange = vi.fn();
    const onInventoryChange = vi.fn();
    const onApply = vi.fn();
    const onClose = vi.fn();
    render(
      <StorePropertiesDialog
        dialog={{
          objectId: "area:store:0",
          draft: {
            commentControlState: "ACTIVE_NOW",
            commerceControlState: "ACTIVE_NOW",
            scriptControlState: "ACTIVE_NOW",
            variableControlState: "ACTIVE_NOW",
            restrictionControlState: "ACTIVE_NOW",
            inventoryControlState: "ACTIVE_NOW",
            comments: "  source note  ",
            commerce: {
              markUp: 100,
              markDown: 65,
              blackMarket: false,
              blackMarketMarkDown: 25,
              identifyPrice: 100,
              maxBuyPrice: -1,
              storeGold: -1,
            },
            scriptResRefs: {
              onOpenStore: "store_open",
              onStoreClosed: "store_closed",
            },
            variables: [{ name: "Counter", type: "int", value: 1 }],
            restrictions: { willNotBuy: [2, 1, 2], willOnlyBuy: [] },
            inventoryBuckets: [
              {
                bucketTypeId: 0,
                entries: [
                  { sourceIndex: 0, resRef: "itm_a", baseItemId: 0, infinite: true },
                  { sourceIndex: 1, resRef: "itm_b", baseItemId: 1, infinite: false },
                ],
              },
              { bucketTypeId: 4, entries: [] },
              { bucketTypeId: 2, entries: [] },
              { bucketTypeId: 3, entries: [] },
              { bucketTypeId: 1, entries: [] },
            ],
          },
          windowX: 12,
          windowY: 18,
          collapsed: false,
        }}
        onToggleCollapsed={vi.fn()}
        onClose={onClose}
        onCommentsChange={onCommentsChange}
        onCommerceChange={onCommerceChange}
        onScriptResRefsChange={onScriptResRefsChange}
        onVariablesChange={onVariablesChange}
        itemBaseItemCatalog={itemBaseItemCatalog}
        onRestrictionsChange={onRestrictionsChange}
        onInventoryChange={onInventoryChange}
        onApply={onApply}
      />,
    );

    expect(screen.getByRole("dialog", { name: "Store properties" })).toBeInTheDocument();
    expect(screen.getAllByText("ACTIVE_NOW").length).toBeGreaterThanOrEqual(6);
    expect(screen.getByText(/retained entries in all five native Store repositories/i))
      .toBeInTheDocument();
    const comments = screen.getByLabelText("Store Comments");
    expect(comments).toHaveValue("  source note  ");
    expect(comments).toHaveAttribute("maxlength", "4096");
    expect(screen.getByLabelText("Mark Up")).toHaveValue(100);
    expect(screen.getByLabelText("Mark Down")).toHaveValue(65);
    expect(screen.getByLabelText("Black Market")).not.toBeChecked();
    expect(screen.getByLabelText("Black Market Mark Down")).toHaveValue(25);
    expect(screen.getByLabelText("Identify Price")).toHaveValue(100);
    expect(screen.getByLabelText("Maximum Buy Price")).toHaveValue(-1);
    expect(screen.getByLabelText("Store Gold")).toHaveValue(-1);
    expect(screen.getByLabelText("On Open Store Script")).toHaveValue("store_open");
    expect(screen.getByLabelText("On Open Store Script")).toHaveAttribute("maxlength", "16");
    expect(screen.getByLabelText("On Store Closed Script")).toHaveValue("store_closed");
    expect(screen.getByLabelText("Store variable 1 name")).toHaveValue("Counter");
    expect(screen.getByLabelText("Store variable 1 value")).toHaveValue(1);
    expect(screen.getByLabelText("Will Not Buy entry 1 Base Item")).toHaveValue("2");
    expect(screen.getByLabelText("Will Not Buy entry 2 Base Item")).toHaveValue("1");
    expect(screen.getByLabelText("Will Not Buy entry 3 Base Item")).toHaveValue("2");
    expect(screen.getByText("itm_a")).toBeInTheDocument();
    expect(screen.getByText(/BaseItem 1: Base item 1/)).toBeInTheDocument();

    fireEvent.change(comments, { target: { value: "  changed note  " } });
    fireEvent.change(screen.getByLabelText("Mark Up"), { target: { value: "125" } });
    fireEvent.click(screen.getByLabelText("Black Market"));
    fireEvent.change(screen.getByLabelText("On Open Store Script"), {
      target: { value: "nw_store_open" },
    });
    fireEvent.change(screen.getByLabelText("Store variable 1 value"), {
      target: { value: "2" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add Store variable" }));
    fireEvent.change(screen.getByLabelText("Will Not Buy entry 1 Base Item"), {
      target: { value: "3" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add Will Only Buy restriction" }));
    fireEvent.click(screen.getByLabelText("Repository 1 item 1 Infinite"));
    fireEvent.click(screen.getByRole("button", { name: "Move repository 1 item 1 down" }));
    fireEvent.click(screen.getByRole("button", { name: "Remove repository 1 item 2" }));
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    fireEvent.click(screen.getByRole("button", { name: "OK" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onCommentsChange).toHaveBeenCalledWith("  changed note  ");
    expect(onCommerceChange).toHaveBeenNthCalledWith(1, expect.objectContaining({ markUp: 125 }));
    expect(onCommerceChange).toHaveBeenNthCalledWith(2, expect.objectContaining({ blackMarket: true }));
    expect(onScriptResRefsChange).toHaveBeenCalledWith({
      onOpenStore: "nw_store_open",
      onStoreClosed: "store_closed",
    });
    expect(onVariablesChange).toHaveBeenNthCalledWith(1, [
      { name: "Counter", type: "int", value: 2 },
    ]);
    expect(onVariablesChange).toHaveBeenNthCalledWith(2, [
      { name: "Counter", type: "int", value: 1 },
      { name: "", type: "int", value: 0 },
    ]);
    expect(onRestrictionsChange).toHaveBeenNthCalledWith(1, {
      willNotBuy: [3, 1, 2],
      willOnlyBuy: [],
    });
    expect(onRestrictionsChange).toHaveBeenNthCalledWith(2, {
      willNotBuy: [2, 1, 2],
      willOnlyBuy: [0],
    });
    expect(onInventoryChange).toHaveBeenNthCalledWith(1, expect.arrayContaining([
      expect.objectContaining({
        bucketTypeId: 0,
        entries: [
          { sourceIndex: 0, resRef: "itm_a", baseItemId: 0, infinite: false },
          { sourceIndex: 1, resRef: "itm_b", baseItemId: 1, infinite: false },
        ],
      }),
    ]));
    expect(onInventoryChange).toHaveBeenNthCalledWith(2, expect.arrayContaining([
      expect.objectContaining({
        bucketTypeId: 0,
        entries: [
          { sourceIndex: 1, resRef: "itm_b", baseItemId: 1, infinite: false },
          { sourceIndex: 0, resRef: "itm_a", baseItemId: 0, infinite: true },
        ],
      }),
    ]));
    expect(onInventoryChange).toHaveBeenNthCalledWith(3, expect.arrayContaining([
      expect.objectContaining({
        bucketTypeId: 0,
        entries: [
          { sourceIndex: 0, resRef: "itm_a", baseItemId: 0, infinite: true },
        ],
      }),
    ]));
    expect(onApply).toHaveBeenNthCalledWith(1, false);
    expect(onApply).toHaveBeenNthCalledWith(2, true);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("shows preserve-only state without enabling destructive controls", () => {
    render(
      <StorePropertiesDialog
        dialog={{
          objectId: "area:store:1",
          draft: {
            commentControlState: "PRESERVE_ONLY",
            commerceControlState: "PRESERVE_ONLY",
            scriptControlState: "PRESERVE_ONLY",
            variableControlState: "PRESERVE_ONLY",
            restrictionControlState: "PRESERVE_ONLY",
            inventoryControlState: "PRESERVE_ONLY",
            comments: "",
            commerce: null,
            scriptResRefs: null,
            variables: null,
            restrictions: null,
            inventoryBuckets: null,
          },
          windowX: 0,
          windowY: 0,
          collapsed: false,
        }}
        onToggleCollapsed={vi.fn()}
        onClose={vi.fn()}
        onCommentsChange={vi.fn()}
        onCommerceChange={vi.fn()}
        onScriptResRefsChange={vi.fn()}
        onVariablesChange={vi.fn()}
        itemBaseItemCatalog={itemBaseItemCatalog}
        onRestrictionsChange={vi.fn()}
        onInventoryChange={vi.fn()}
        onApply={vi.fn()}
      />,
    );

    expect(screen.getAllByText("PRESERVE_ONLY").length).toBeGreaterThanOrEqual(5);
    expect(screen.getByLabelText("Store Comments")).toBeDisabled();
    expect(screen.getByLabelText("Mark Up")).toBeDisabled();
    expect(screen.getByLabelText("Black Market")).toBeDisabled();
    expect(screen.getByLabelText("On Open Store Script")).toBeDisabled();
    expect(screen.getByLabelText("On Store Closed Script")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Add Store variable" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Add Will Not Buy restriction" }))
      .toBeDisabled();
    expect(screen.getByRole("button", { name: "Add Will Only Buy restriction" }))
      .toBeDisabled();
    expect(screen.getByRole("button", { name: "Apply" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "OK" })).toBeDisabled();
  });
});
