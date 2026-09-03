import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { ClientAssetCachePort } from "../../../../src/modules/shared/application/clientAssetCachePort";
import { ClientAssetCacheControl } from "../../../../src/modules/layout/components/ClientAssetCacheControl";

describe("ClientAssetCacheControl", () => {
  it("shows measured usage and clears only through the asset-cache port", async () => {
    const inspect = vi.fn()
      .mockResolvedValueOnce({ status: "ready", budgetBytes: 2_147_483_648, usedBytes: 1024, entryCount: 2, overBudget: false })
      .mockResolvedValueOnce({ status: "ready", budgetBytes: 2_147_483_648, usedBytes: 0, entryCount: 0, overBudget: false });
    const clear = vi.fn().mockResolvedValue({ clearedEntries: 2, clearedBytes: 1024 });
    const port = { inspect, clear } as unknown as ClientAssetCachePort;
    const onDiagnostic = vi.fn();

    render(<ClientAssetCacheControl port={port} onDiagnostic={onDiagnostic} />);

    expect(await screen.findByText("1 KiB / 2 GiB")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Clear immutable asset cache" }));
    await waitFor(() => expect(clear).toHaveBeenCalledOnce());
    expect(await screen.findByText("0 B / 2 GiB")).toBeInTheDocument();
    expect(screen.getByText("Cleared 2 entries (1 KiB). Draft recovery and sign-in were preserved.")).toBeInTheDocument();
    expect(onDiagnostic.mock.calls.map(([event]) => [event.operation, event.outcome])).toEqual([
      ["inspect", "ready"],
      ["clear", "ready"],
    ]);
  });
});
