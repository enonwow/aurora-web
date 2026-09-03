import { fireEvent, render, screen } from "@testing-library/react";

import { WaypointPropertiesDialog } from
  "../../../../../../src/modules/layout/components/properties/WaypointPropertiesDialog";

const appearanceCatalog = {
  tableSha256: "a".repeat(64),
  rowCount: 5,
  items: [
    {
      rowIndex: 1,
      modelResRef: "wpt_blue",
      strRef: 123,
      label: "blue",
      displayName: "Blue Waypoint",
      displaySource: "strref" as const,
    },
    {
      rowIndex: 4,
      modelResRef: "wpt_yellow",
      strRef: 126,
      label: "yellow",
      displayName: "Yellow Waypoint",
      displaySource: "strref" as const,
    },
  ],
};

describe("WaypointPropertiesDialog", () => {
  it("edits the exact active Tag and routes Apply, OK, and Cancel", () => {
    const onTagChange = vi.fn();
    const onTemplateResRefChange = vi.fn();
    const onApply = vi.fn();
    const onClose = vi.fn();
    const onHasMapNoteChange = vi.fn();
    const onMapNoteTextChange = vi.fn();
    const onMapNoteEnabledChange = vi.fn();
    const onAppearanceChange = vi.fn();
    const onVariablesChange = vi.fn();
    render(<WaypointPropertiesDialog
      dialog={{
        objectId: "area:waypoint:0",
        draft: {
          tagControlState: "ACTIVE_NOW",
          tag: "NW_WAYPOINT001",
          templateResRefControlState: "ACTIVE_NOW",
          templateResRef: "nw_waypoint001",
          localizedNameControlState: "ACTIVE_NOW",
          localizedName: "Patrol Point",
          descriptionControlState: "ACTIVE_NOW",
          description: "Patrol route",
          mapNoteControlState: "ACTIVE_NOW",
          hasMapNote: true,
          mapNoteText: "Old marker",
          mapNoteEnabled: true,
          appearanceControlState: "ACTIVE_NOW",
          appearance: 1,
          variablesControlState: "ACTIVE_NOW",
          variables: [{ name: "counter", type: "int", value: 1 }],
          commentsControlState: "ACTIVE_NOW",
          comments: "source note",
        },
        windowX: 10,
        windowY: 20,
        collapsed: false,
      }}
      onToggleCollapsed={vi.fn()}
      onClose={onClose}
      onTagChange={onTagChange}
      onTemplateResRefChange={onTemplateResRefChange}
      onLocalizedNameChange={vi.fn()}
      onDescriptionChange={vi.fn()}
      onHasMapNoteChange={onHasMapNoteChange}
      onMapNoteTextChange={onMapNoteTextChange}
      onMapNoteEnabledChange={onMapNoteEnabledChange}
      appearanceCatalog={appearanceCatalog}
      appearanceCatalogStatus="ready"
      onAppearanceChange={onAppearanceChange}
      onVariablesChange={onVariablesChange}
      onCommentsChange={vi.fn()}
      onApply={onApply}
    />);

    const input = screen.getByLabelText("Waypoint Tag");
    expect(input).toHaveAttribute("maxlength", "32");
    expect(screen.getByLabelText("Waypoint Name")).toHaveAttribute("maxlength", "256");
    fireEvent.change(screen.getByLabelText("Waypoint Appearance"), {
      target: { value: "4" },
    });
    fireEvent.change(input, { target: { value: "  DEST  " } });
    fireEvent.click(screen.getByRole("tab", { name: "Description" }));
    expect(screen.getByLabelText("Waypoint Description"))
      .toHaveAttribute("maxlength", "4096");
    fireEvent.click(screen.getByRole("tab", { name: "Advanced" }));
    const templateResRef = screen.getByLabelText("Waypoint Blueprint ResRef");
    expect(templateResRef).toHaveAttribute("maxlength", "16");
    fireEvent.change(templateResRef, { target: { value: "custom_waypoint" } });
    const hasMapNote = screen.getByLabelText("Waypoint Contains a Map Note");
    const mapNoteText = screen.getByLabelText("Waypoint Map Note Text");
    const mapNoteEnabled = screen.getByLabelText("Waypoint Map Note Enabled");
    expect(mapNoteText).toHaveAttribute("maxlength", "4096");
    fireEvent.click(hasMapNote);
    fireEvent.change(mapNoteText, { target: { value: " Northern gate " } });
    fireEvent.click(mapNoteEnabled);
    fireEvent.click(screen.getByRole("button", { name: "Variables... (1)" }));
    fireEvent.click(screen.getByRole("button", { name: "Add Waypoint variable" }));
    fireEvent.click(screen.getByRole("tab", { name: "Comments" }));
    expect(screen.getByLabelText("Waypoint Comments"))
      .toHaveAttribute("maxlength", "4096");
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    fireEvent.click(screen.getByRole("button", { name: "OK" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onTagChange).toHaveBeenCalledWith("  DEST  ");
    expect(onTemplateResRefChange).toHaveBeenCalledWith("custom_waypoint");
    expect(onHasMapNoteChange).toHaveBeenCalledWith(false);
    expect(onMapNoteTextChange).toHaveBeenCalledWith(" Northern gate ");
    expect(onMapNoteEnabledChange).toHaveBeenCalledWith(false);
    expect(onAppearanceChange).toHaveBeenCalledWith(4);
    expect(onVariablesChange).toHaveBeenCalledWith([
      { name: "counter", type: "int", value: 1 },
      { name: "", type: "int", value: 0 },
    ]);
    expect(onApply).toHaveBeenNthCalledWith(1, false);
    expect(onApply).toHaveBeenNthCalledWith(2, true);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("disables mutation controls for preserve-only provenance", () => {
    render(<WaypointPropertiesDialog
      dialog={{
        objectId: "area:waypoint:0",
        draft: {
          tagControlState: "PRESERVE_ONLY",
          tag: "DISPLAY",
          templateResRefControlState: "PRESERVE_ONLY",
          templateResRef: "",
          localizedNameControlState: "PRESERVE_ONLY",
          localizedName: "Resolved TLK Name",
          descriptionControlState: "PRESERVE_ONLY",
          description: "Resolved TLK Description",
          mapNoteControlState: "PRESERVE_ONLY",
          hasMapNote: true,
          mapNoteText: "Resolved TLK Map Note",
          mapNoteEnabled: true,
          appearanceControlState: "PRESERVE_ONLY",
          appearance: 1,
          variablesControlState: "PRESERVE_ONLY",
          variables: [],
          commentsControlState: "PRESERVE_ONLY",
          comments: "preserved note",
        },
        windowX: 0,
        windowY: 0,
        collapsed: false,
      }}
      onToggleCollapsed={vi.fn()}
      onClose={vi.fn()}
      onTagChange={vi.fn()}
      onTemplateResRefChange={vi.fn()}
      onLocalizedNameChange={vi.fn()}
      onDescriptionChange={vi.fn()}
      onHasMapNoteChange={vi.fn()}
      onMapNoteTextChange={vi.fn()}
      onMapNoteEnabledChange={vi.fn()}
      appearanceCatalog={appearanceCatalog}
      appearanceCatalogStatus="ready"
      onAppearanceChange={vi.fn()}
      onVariablesChange={vi.fn()}
      onCommentsChange={vi.fn()}
      onApply={vi.fn()}
    />);
    expect(screen.getByLabelText("Waypoint Tag")).toBeDisabled();
    expect(screen.getByLabelText("Waypoint Name")).toBeDisabled();
    expect(screen.getByLabelText("Waypoint Appearance")).toBeDisabled();
    fireEvent.click(screen.getByRole("tab", { name: "Description" }));
    expect(screen.getByLabelText("Waypoint Description")).toBeDisabled();
    fireEvent.click(screen.getByRole("tab", { name: "Advanced" }));
    expect(screen.getByLabelText("Waypoint Blueprint ResRef")).toBeDisabled();
    expect(screen.getByLabelText("Waypoint Contains a Map Note")).toBeDisabled();
    expect(screen.getByLabelText("Waypoint Map Note Text")).toBeDisabled();
    expect(screen.getByLabelText("Waypoint Map Note Enabled")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Variables... (0)" })).toBeDisabled();
    fireEvent.click(screen.getByRole("tab", { name: "Comments" }));
    expect(screen.getByLabelText("Waypoint Comments")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Apply" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "OK" })).toBeDisabled();
    expect(screen.getByText(/PRESERVE_ONLY/)).toBeInTheDocument();
  });
});
