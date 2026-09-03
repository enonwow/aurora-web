import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AreaPropertiesDialog } from "../../src/modules/layout/components/properties/AreaPropertiesDialog";

describe("Area event-script catalog regression smoke", () => {
  it("keeps NSS selection connected to exact Area event ResRef commit", async () => {
    const onCommit = vi.fn();
    const catalog = {
      schemaVersion: "area-event-script-catalog.v1" as const,
      moduleId: "module-current",
      moduleRevision: "a".repeat(64),
      coverage: "committed_module_only" as const,
      items: [{
        resRef: "area_enter",
        artifactStatus: "source_and_bytecode" as const,
        freshness: "unverified" as const,
        source: {
          logicalKey: "area_enter.nss",
          resourceType: 2009 as const,
          size: 10,
          sha256: "b".repeat(64),
        },
        bytecode: {
          logicalKey: "area_enter.ncs",
          resourceType: 2010 as const,
          size: 11,
          sha256: "c".repeat(64),
        },
      }],
      total: 1,
      limit: 200,
      offset: 0,
      summary: {
        admittedCatalogCount: 1,
        sourceAndBytecode: 1,
        sourceOnly: 0,
        bytecodeOnly: 0,
        rejectedDescriptors: 0,
      },
      diagnostics: [
        "external_runtime_layers_not_resolved" as const,
        "paired_freshness_unverified" as const,
      ],
    };
    const facade = { load: vi.fn().mockResolvedValue({ ok: true, value: catalog }) };

    render(
      <AreaPropertiesDialog
        draft={{
          comments: "",
          commentsState: "preserve_only",
          maxCommentsCodeUnits: 4096,
          eventScripts: {
            onEnter: { value: "retained_hak", state: "editable" },
            onExit: { value: "", state: "preserve_only" },
            onHeartbeat: { value: "", state: "preserve_only" },
            onUserDefined: { value: "", state: "preserve_only" },
          },
        }}
        eventScriptCatalogFacade={facade}
        eventScriptCatalogAccessToken="token"
        onCommit={onCommit}
        onCancel={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Events" }));
    const selector = await screen.findByLabelText("Area On Enter catalog selection");
    expect(selector).toHaveValue("retained_hak");
    fireEvent.change(selector, { target: { value: "area_enter" } });
    fireEvent.click(screen.getByRole("button", { name: "OK" }));

    expect(onCommit).toHaveBeenCalledWith(
      expect.objectContaining({
        eventScripts: expect.objectContaining({
          onEnter: { value: "area_enter", state: "editable" },
        }),
      }),
      true,
    );
    expect(screen.getByRole("note", { name: "Area event-script catalog status" }))
      .toHaveTextContent(/freshness is unverified/iu);
  });
});
