import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { SystemMaintenanceScreen } from "../../../../src/modules/runtime-settings/SystemMaintenanceScreen";
import type { SystemMaintenanceStatus } from "../../../../src/modules/runtime-settings/systemMaintenanceApi";

const failedStatus: SystemMaintenanceStatus = {
  state: "failed",
  maintenance: true,
  loginAvailable: true,
  phase: "failed",
  operationId: "operation-1",
  updatedAt: "2026-07-17T12:00:00.000Z",
  message: "Server maintenance requires administrator recovery."
};

describe("SystemMaintenanceScreen", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("offers an administrator sign-in without exposing recovery actions anonymously", () => {
    const onAdminSignIn = vi.fn();
    render(
      <SystemMaintenanceScreen
        status={failedStatus}
        onRetryStatus={vi.fn()}
        onAdminSignIn={onAdminSignIn}
      />
    );

    fireEvent.click(
      screen.getByRole("button", { name: /administrator sign in/i })
    );
    expect(onAdminSignIn).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByRole("button", { name: /retry rebuild/i })
    ).not.toBeInTheDocument();
  });

  it("confirms and runs an authenticated admin retry", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const onRetryRebuild = vi.fn().mockResolvedValue(undefined);
    render(
      <SystemMaintenanceScreen
        status={failedStatus}
        accessToken="admin-token"
        onRetryStatus={vi.fn()}
        onRetryRebuild={onRetryRebuild}
        onRollback={vi.fn().mockResolvedValue(undefined)}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /retry rebuild/i }));
    await waitFor(() => expect(onRetryRebuild).toHaveBeenCalledTimes(1));
    expect(window.confirm).toHaveBeenCalledWith(
      expect.stringMatching(/sign out every active user/i)
    );
  });

  it("shows a recovery error returned by the backend", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(
      <SystemMaintenanceScreen
        status={failedStatus}
        accessToken="admin-token"
        onRetryStatus={vi.fn()}
        onRetryRebuild={vi.fn().mockRejectedValue(new Error("Retry was fenced."))}
        onRollback={vi.fn().mockResolvedValue(undefined)}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /retry rebuild/i }));
    expect(await screen.findByText("Retry was fenced.")).toBeInTheDocument();
  });

  it("shows safe backend failure details and participant state to an admin", () => {
    render(
      <SystemMaintenanceScreen
        status={failedStatus}
        accessToken="admin-token"
        onRetryStatus={vi.fn()}
        onRetryRebuild={vi.fn().mockResolvedValue(undefined)}
        onRollback={vi.fn().mockResolvedValue(undefined)}
        details={{
          operationId: "operation-1",
          state: "failed",
          phase: "failed",
          updatedAt: "2026-07-17T12:02:00.000Z",
          participants: [
            { name: "module-snapshot", status: "failed" },
            { name: "publish", status: "pending" }
          ],
          auditTrail: [
            {
              at: "2026-07-17T12:02:00.000Z",
              state: "failed",
              phase: "failed",
              errorCode: "CACHE_GENERATION_INTEGRITY_FAILED"
            }
          ],
          error: {
            code: "CACHE_GENERATION_INTEGRITY_FAILED",
            message: "Staging generation is incomplete."
          }
        }}
      />
    );

    expect(
      screen.getByText("CACHE_GENERATION_INTEGRITY_FAILED")
    ).toBeInTheDocument();
    expect(screen.getByText(/module-snapshot:/i)).toBeInTheDocument();
    expect(
      screen.getByText(/staging generation is incomplete/i)
    ).toBeInTheDocument();
  });
});
