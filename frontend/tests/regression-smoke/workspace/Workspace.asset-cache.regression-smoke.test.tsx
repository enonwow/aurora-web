import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ClientAssetCacheControl } from "../../../src/modules/layout/components/ClientAssetCacheControl";
import type { ClientAssetCachePort } from "../../../src/modules/shared/application/clientAssetCachePort";

describe("Workspace immutable asset cache regression smoke", () => {
  it("keeps the measured 2 GiB cache clear flow explicit and separate from drafts and sign-in", async () => {
    const inspect = vi.fn()
      .mockResolvedValueOnce({
        status: "ready" as const,
        budgetBytes: 2 * 1024 * 1024 * 1024,
        usedBytes: 4096,
        entryCount: 3,
        overBudget: false,
      })
      .mockResolvedValueOnce({
        status: "ready" as const,
        budgetBytes: 2 * 1024 * 1024 * 1024,
        usedBytes: 0,
        entryCount: 0,
        overBudget: false,
      });
    const clear = vi.fn(async () => ({ clearedEntries: 3, clearedBytes: 4096 }));
    const port = { inspect, clear } as unknown as ClientAssetCachePort;

    render(<ClientAssetCacheControl port={port} />);

    expect(await screen.findByText("4 KiB / 2 GiB")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Clear immutable asset cache" }));

    await waitFor(() => expect(clear).toHaveBeenCalledOnce());
    expect(await screen.findByText("0 B / 2 GiB")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Cleared 3 entries (4 KiB). Draft recovery and sign-in were preserved."
    );
  });
});
