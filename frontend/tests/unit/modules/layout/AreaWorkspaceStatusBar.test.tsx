import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { createAreaWorkspaceStatusSnapshot } from "../../../../src/modules/areas/application/areaWorkspaceStatus";
import { AreaWorkspaceStatusBar } from "../../../../src/modules/layout/components/AreaWorkspaceStatusBar";

describe("AreaWorkspaceStatusBar", () => {
  it("always exposes four separately labelled workspace state lanes", () => {
    render(<AreaWorkspaceStatusBar snapshot={createAreaWorkspaceStatusSnapshot("area_keep", 10, 100)} />);

    const status = screen.getByRole("status", { name: "Area workspace status" });
    expect(status).toHaveAttribute("data-area-workspace-draft-state", "dirty");
    expect(status).toHaveAttribute("data-area-workspace-verification-state", "not_run");
    expect(status).toHaveAttribute("data-area-workspace-materialization-state", "not_requested");
    expect(status).toHaveAttribute("data-area-workspace-certification-state", "unavailable");
    expect(screen.getByText("Draft")).toBeInTheDocument();
    expect(screen.getByText("Verification")).toBeInTheDocument();
    expect(screen.getByText("Materialization")).toBeInTheDocument();
    expect(screen.getByText("Certification")).toBeInTheDocument();
  });
});
