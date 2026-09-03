import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";

import type { AreaPropertiesDraft } from "../../../src/modules/areas/application/areaPropertiesFacade";
import { AreaPropertiesDialog } from "../../../src/modules/layout/components/properties/AreaPropertiesDialog";

it("keeps a bounded added Area Name entry connected to the committed draft", () => {
  const onCommit = vi.fn();
  const draft: AreaPropertiesDraft = {
    comments: "",
    commentsState: "preserve_only",
    maxCommentsCodeUnits: 4096,
    basicIdentity: {
      name: {
        value: "Default Name",
        state: "editable",
        profile: "simple_inline_ascii",
        entries: [{ languageId: 0, text: "Default Name" }],
      },
      tag: { value: "AREA_TAG", state: "editable" },
    },
  };

  render(<AreaPropertiesDialog draft={draft} onCommit={onCommit} onCancel={vi.fn()} />);
  fireEvent.change(screen.getByLabelText("Area Name entry to add"), {
    target: { value: "11" },
  });
  fireEvent.change(screen.getByLabelText("New Area Name entry text"), {
    target: { value: "Krypta" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Add Area Name entry" }));
  fireEvent.click(screen.getByRole("button", { name: "Apply" }));

  expect(onCommit).toHaveBeenCalledWith(expect.objectContaining({
    basicIdentity: expect.objectContaining({
      name: expect.objectContaining({
        profile: "multi_entry_inline_ascii",
        entries: [
          { languageId: 0, text: "Default Name" },
          { languageId: 11, text: "Krypta" },
        ],
      }),
    }),
  }), false);
});
