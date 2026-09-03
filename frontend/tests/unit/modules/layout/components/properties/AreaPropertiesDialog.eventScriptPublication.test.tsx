import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AreaPropertiesDialog } from "../../../../../../src/modules/layout/components/properties/AreaPropertiesDialog";
import { areaEventScriptCatalogFixture } from "../../../areas/areaEventScriptCatalogFixture";

const MODULE_ID = "module-current";
const REVISION = "c".repeat(64);
const NEXT_REVISION = "d".repeat(64);
const SOURCE = "void main() {}\n";

describe("AreaPropertiesDialog Area event-script source editor", () => {
  it("loads, validates, invalidates stale proof, and publishes through facades", async () => {
    const catalogFacade = {
      load: vi.fn().mockResolvedValue({ ok: true, value: areaEventScriptCatalogFixture() }),
    };
    const publicationFacade = {
      readSource: vi.fn().mockResolvedValue({ ok: true, value: sourceSnapshot() }),
      validate: vi.fn().mockResolvedValue({ ok: true, value: validationResult() }),
      publish: vi.fn().mockResolvedValue({ ok: true, value: publicationResult() }),
    };
    render(
      <AreaPropertiesDialog
        draft={draft()}
        eventScriptCatalogFacade={catalogFacade}
        eventScriptPublicationFacade={publicationFacade}
        eventScriptCatalogAccessToken="token"
        onCommit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Events" }));
    await screen.findByRole("note", { name: "Area event-script catalog status" });
    expect(screen.getByLabelText("Area script editor target")).toHaveValue("alpha");

    fireEvent.click(screen.getByRole("button", { name: "Load committed source" }));
    expect(await screen.findByLabelText("Area script source")).toHaveValue(SOURCE);
    expect(publicationFacade.readSource).toHaveBeenCalledWith("token", {
      moduleId: MODULE_ID,
      targetResRef: "alpha",
      expectedModuleRevision: REVISION,
    });

    fireEvent.click(screen.getByRole("button", { name: "Validate script source" }));
    expect(await screen.findByRole("status", { name: "Area script validation status" }))
      .toHaveTextContent("Compiled");
    expect(screen.getByText(/NCS: 128 bytes/iu)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Publish script" })).toBeEnabled();

    fireEvent.change(screen.getByLabelText("Area script source"), {
      target: { value: "void main() { SpeakString(\"changed\"); }\n" },
    });
    expect(screen.queryByRole("status", { name: "Area script validation status" }))
      .not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Publish script" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Validate script source" }));
    await waitFor(() => expect(publicationFacade.validate).toHaveBeenCalledTimes(2));
    fireEvent.click(screen.getByRole("button", { name: "Publish script" }));
    expect(await screen.findByRole("status", { name: "Area script publication status" }))
      .toHaveTextContent(`Published revision ${NEXT_REVISION}`);
    expect(publicationFacade.publish).toHaveBeenCalledTimes(1);
  });

  it("supports a deliberate blank editor for a missing committed source", async () => {
    const publicationFacade = {
      readSource: vi.fn().mockResolvedValue({
        ok: false,
        error: {
          code: "AREA_EVENT_SCRIPT_SOURCE_NOT_FOUND",
          status: 404,
          retryable: false,
          message: "The committed script source was not found.",
        },
      }),
      validate: vi.fn(),
      publish: vi.fn(),
    };
    render(
      <AreaPropertiesDialog
        draft={draft()}
        eventScriptCatalogFacade={{
          load: vi.fn().mockResolvedValue({ ok: true, value: areaEventScriptCatalogFixture() }),
        }}
        eventScriptPublicationFacade={publicationFacade}
        eventScriptCatalogAccessToken="token"
        onCommit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Events" }));
    await screen.findByRole("note", { name: "Area event-script catalog status" });
    fireEvent.change(screen.getByLabelText("Area script editor target"), {
      target: { value: "new_script" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Load committed source" }));
    expect(await screen.findByRole("alert", { name: "Area script source status" }))
      .toHaveTextContent("not found");
    fireEvent.click(screen.getByRole("button", { name: "Start new script" }));
    expect(screen.getByLabelText("Area script source")).toHaveValue("");
  });
});

function draft() {
  return {
    comments: "",
    commentsState: "preserve_only" as const,
    maxCommentsCodeUnits: 4096 as const,
    eventScripts: {
      onEnter: { value: "alpha", state: "editable" as const },
      onExit: { value: "", state: "preserve_only" as const },
      onHeartbeat: { value: "", state: "preserve_only" as const },
      onUserDefined: { value: "", state: "preserve_only" as const },
    },
    basicIdentity: {
      name: { value: "", state: "preserve_only" as const },
      tag: { value: "", state: "preserve_only" as const },
    },
    advancedFlags: {
      terrainType: {
        value: { interior: false, natural: false, subterranean: false },
        state: "preserve_only" as const,
      },
      playerVsPlayer: { value: 0 as const, state: "preserve_only" as const },
      noRest: { value: false, state: "preserve_only" as const },
      listenCheckModifier: { value: 0, state: "preserve_only" as const },
      spotCheckModifier: { value: 0, state: "preserve_only" as const },
      loadingScreenId: { value: 0, state: "preserve_only" as const },
    },
    moduleStartLocation: {
      value: { areaResRef: "", x: 0, y: 0, z: 0, directionX: 0, directionY: 0 },
      state: "preserve_only" as const,
    },
  };
}

function sourceSnapshot() {
  return {
    schemaVersion: "area-event-script-source-snapshot.v1" as const,
    moduleId: MODULE_ID,
    moduleRevision: REVISION,
    targetResRef: "alpha",
    sourceEncoding: "utf-8" as const,
    sourceText: SOURCE,
    sourceSize: 15,
    sourceSha256: "1".repeat(64),
  };
}

function validationResult() {
  return {
    schemaVersion: "area-event-script-validation-result.v1" as const,
    status: "compiled" as const,
    moduleId: MODULE_ID,
    moduleRevision: REVISION,
    targetResRef: "alpha",
    sourceSha256: "1".repeat(64),
    includeSetSha256: "2".repeat(64),
    executionProfileSha256: "3".repeat(64),
    provider: provider(),
    diagnostics: [],
    artifacts: {
      ncs: { size: 128, sha256: "4".repeat(64) },
      ndb: { size: 96, sha256: "5".repeat(64) },
    },
    compilerReceiptSha256: "6".repeat(64),
  };
}

function publicationResult() {
  return {
    idempotency: "created" as const,
    receipt: {
      schemaVersion: "area-event-script-publication-receipt.v1" as const,
      transactionId: "script-tx-1",
      moduleId: MODULE_ID,
      targetResRef: "alpha",
      previousModuleRevision: REVISION,
      newModuleRevision: NEXT_REVISION,
      commandHash: "7".repeat(64),
      sourceSha256: "1".repeat(64),
      includeSetSha256: "2".repeat(64),
      executionProfileSha256: "3".repeat(64),
      provider: provider(),
      compilerReceiptSha256: "6".repeat(64),
      resources: [
        { extension: "ncs" as const, logicalKey: "alpha.ncs", resourceType: 2010, size: 128, sha256: "4".repeat(64) },
        { extension: "ndb" as const, logicalKey: "alpha.ndb", resourceType: 2064, size: 96, sha256: "5".repeat(64) },
        { extension: "nss" as const, logicalKey: "alpha.nss", resourceType: 2009, size: 15, sha256: "1".repeat(64) },
      ],
      readbackStatus: "verified" as const,
      warnings: [],
      publishedAt: "2026-08-26T12:00:00.000Z",
    },
  };
}

function provider() {
  return {
    providerId: "neverwinter-nim-official-script-compiler" as const,
    executableSha256: "a".repeat(64),
    versionMarker: "neverwinter 2.1.2",
    versionOutputSha256: "b".repeat(64),
    languageSpecSha256: "c".repeat(64),
    runtimeLibrarySetSha256: "d".repeat(64),
    launcherFileSetSha256: "e".repeat(64),
  };
}
