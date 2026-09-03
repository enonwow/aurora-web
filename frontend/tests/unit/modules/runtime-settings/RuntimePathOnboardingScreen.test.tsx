import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import { RuntimePathOnboardingScreen } from "../../../../src/modules/runtime-settings/RuntimePathOnboardingScreen";

const originalFetch = globalThis.fetch;

describe("RuntimePathOnboardingScreen", () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("shows the Docker restart procedure when a backend-visible mount is absent", () => {
    render(
      <RuntimePathOnboardingScreen
        accessToken="admin-token"
        readiness={{
          ready: false,
          canConfigure: true,
          issues: [
            {
              field: "nwnUserDir",
              code: "RESTART_REQUIRED",
              message: "Update NWN_USER_DIR_HOST in .env and recreate Docker Compose.",
              envVariable: "NWN_USER_DIR_HOST"
            }
          ],
          values: {
            nwnUserDir: "C:\\Users\\alice\\Documents\\Neverwinter Nights",
            nwnInstallDir: "C:\\Games\\Neverwinter Nights",
            auroraReferenceDir: "D:\\Aurora Reference",
            hakDirectories: [],
            itemGeneratorSourceDirectories: [],
            moduleDecompiledPath:
              "C:\\Users\\alice\\Documents\\Neverwinter Nights\\modules\\decompiled",
            modulePackedPath: ""
          },
          environment: {
            mode: "docker",
            mounts: []
          }
        }}
        onCompleted={() => undefined}
      />
    );

    expect(
      screen.getByRole("heading", { name: /docker mount requires a restart/i })
    ).toBeInTheDocument();
    expect(screen.getByText("NWN_USER_DIR_HOST")).toBeInTheDocument();
    expect(screen.getByText("docker compose up --build")).toBeInTheDocument();
    expect(
      screen.getByText(/cannot create or change docker bind mounts/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/enter real Windows\/Linux host paths/i)
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(/NWN user directory — real host path/i)
    ).toHaveValue("C:\\Users\\alice\\Documents\\Neverwinter Nights");
  });

  it("keeps path values hidden and read-only for a non-admin user", () => {
    render(
      <RuntimePathOnboardingScreen
        accessToken="viewer-token"
        readiness={{
          ready: false,
          canConfigure: false,
          issues: []
        }}
        onCompleted={() => undefined}
      />
    );

    expect(
      screen.getByRole("heading", { name: /paths need an administrator/i })
    ).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("creates the next empty table row after a list path is entered", () => {
    render(
      <RuntimePathOnboardingScreen
        accessToken="admin-token"
        readiness={{
          ready: false,
          canConfigure: true,
          issues: [],
          values: {
            nwnUserDir: "C:\\NWN",
            nwnInstallDir: "C:\\NWN Game",
            auroraReferenceDir: "D:\\Aurora",
            hakDirectories: [],
            itemGeneratorSourceDirectories: [],
            moduleDecompiledPath: "C:\\NWN\\module",
            modulePackedPath: ""
          },
          environment: { mode: "host", mounts: [] }
        }}
        onCompleted={() => undefined}
      />
    );

    const firstRow = screen.getByRole("textbox", {
      name: /HAK directories .* path 1/i
    });
    expect(
      screen.queryByRole("textbox", {
        name: /HAK directories .* path 2/i
      })
    ).not.toBeInTheDocument();

    fireEvent.change(firstRow, { target: { value: "C:\\NWN\\hak" } });

    expect(
      screen.getByRole("textbox", {
        name: /HAK directories .* path 2/i
      })
    ).toHaveValue("");
    expect(screen.getByText("Ready to validate")).toBeInTheDocument();
  });

  it("selects a backend-visible directory through the server path browser", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          scope: "hak-directory",
          selectionKind: "directory",
          currentPath: "C:\\NWN",
          roots: [],
          entries: [
            {
              name: "hak",
              path: "C:\\NWN\\hak",
              kind: "directory",
              selectable: true
            }
          ],
          truncated: false
        }
      })
    } as Response);

    render(
      <RuntimePathOnboardingScreen
        accessToken="admin-token"
        readiness={{
          ready: false,
          canConfigure: true,
          issues: [],
          values: {
            nwnUserDir: "C:\\NWN",
            nwnInstallDir: "C:\\NWN Game",
            auroraReferenceDir: "",
            hakDirectories: [],
            itemGeneratorSourceDirectories: [],
            moduleDecompiledPath: "C:\\NWN\\module",
            modulePackedPath: ""
          },
          environment: { mode: "host", mounts: [] }
        }}
        onCompleted={() => undefined}
      />
    );

    const hakInput = screen.getByRole("textbox", {
      name: /HAK directories .* path 1/i
    });
    fireEvent.click(
      within(hakInput.parentElement!).getByRole("button", { name: "Browse" })
    );

    await waitFor(() =>
      expect(
        screen.getByRole("dialog", { name: /select a directory/i })
      ).toBeInTheDocument()
    );
    fireEvent.click(screen.getByRole("button", { name: "Select" }));

    expect(hakInput).toHaveValue("C:\\NWN\\hak");
    expect(
      screen.getByRole("textbox", {
        name: /HAK directories .* path 2/i
      })
    ).toHaveValue("");
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining(
        "/settings/runtime/path-browser?scope=hak-directory"
      ),
      expect.objectContaining({
        headers: { Authorization: "Bearer admin-token" }
      })
    );
  });
});
