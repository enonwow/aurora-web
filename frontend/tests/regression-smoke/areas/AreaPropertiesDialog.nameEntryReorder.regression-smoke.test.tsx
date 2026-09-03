import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";

import type { AreaPropertiesDraft } from "../../../src/modules/areas/application/areaPropertiesFacade";
import { AreaPropertiesDialog } from "../../../src/modules/layout/components/properties/AreaPropertiesDialog";

it("keeps exact existing Area Name entry order connected to the committed draft", () => {
  const onCommit = vi.fn();
  const draft: AreaPropertiesDraft = {
    comments: "",
    commentsState: "preserve_only",
    maxCommentsCodeUnits: 4096,
    basicIdentity: {
      name: {
        value: "Default Name",
        state: "editable",
        profile: "multi_entry_inline_ascii",
        entries: [
          { languageId: 3, text: "Nom" },
          { languageId: 0, text: "Default Name" },
          { languageId: 8, text: "Nome" },
        ],
      },
      tag: { value: "AREA_TAG", state: "editable" },
    },
  };

  render(<AreaPropertiesDialog draft={draft} onCommit={onCommit} onCancel={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "Move Area Name entry 8 up" }));
  fireEvent.click(screen.getByRole("button", { name: "Move Area Name entry 8 up" }));
  fireEvent.click(screen.getByRole("button", { name: "Apply" }));

  expect(onCommit).toHaveBeenCalledWith(expect.objectContaining({
    basicIdentity: expect.objectContaining({
      name: expect.objectContaining({
        entries: [
          { languageId: 8, text: "Nome" },
          { languageId: 3, text: "Nom" },
          { languageId: 0, text: "Default Name" },
        ],
      }),
    }),
  }), false);
});
