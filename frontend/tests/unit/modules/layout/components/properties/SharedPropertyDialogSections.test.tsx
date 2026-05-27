import { fireEvent, render, screen } from "@testing-library/react";
import {
  SharedDialogActionsFooter,
  SharedPropertyDialogChrome
} from "../../../../../../src/modules/layout/components/properties/SharedPropertyDialogSections";

describe("SharedPropertyDialogChrome", () => {
  it("renders dialog header and calls close/collapse handlers", () => {
    const onToggleCollapsed = vi.fn();
    const onClose = vi.fn();

    render(
      <SharedPropertyDialogChrome
        articleClassName="test-dialog"
        ariaLabel="Test dialog"
        windowX={120}
        windowY={80}
        headerClassName="test-header"
        headerCopyClassName="test-header-copy"
        headerActionsClassName="test-header-actions"
        title="Test Properties"
        subtitle="TEST_OBJECT"
        collapsed={false}
        collapseLabel="Collapse test dialog"
        expandLabel="Expand test dialog"
        closeLabel="Close test dialog"
        onToggleCollapsed={onToggleCollapsed}
        onClose={onClose}
      >
        <div>Body content</div>
      </SharedPropertyDialogChrome>
    );

    expect(screen.getByRole("dialog", { name: /test dialog/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /test properties/i })).toBeInTheDocument();
    expect(screen.getByText("TEST_OBJECT")).toBeInTheDocument();
    expect(screen.getByText(/body content/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /collapse test dialog/i }));
    expect(onToggleCollapsed).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: /close test dialog/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("hides children when collapsed", () => {
    render(
      <SharedPropertyDialogChrome
        articleClassName="test-dialog"
        ariaLabel="Test dialog"
        windowX={10}
        windowY={20}
        headerClassName="test-header"
        headerCopyClassName="test-header-copy"
        headerActionsClassName="test-header-actions"
        title="Test Properties"
        subtitle="TEST_OBJECT"
        collapsed
        collapseLabel="Collapse test dialog"
        expandLabel="Expand test dialog"
        closeLabel="Close test dialog"
        onToggleCollapsed={() => undefined}
        onClose={() => undefined}
      >
        <div>Collapsed body</div>
      </SharedPropertyDialogChrome>
    );

    expect(screen.queryByText(/collapsed body/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /expand test dialog/i })).toBeInTheDocument();
  });

  it("forwards pointer handlers for dialog drag header", () => {
    const onHeaderPointerDown = vi.fn();
    const onHeaderPointerMove = vi.fn();
    const onHeaderPointerUp = vi.fn();
    const onHeaderPointerCancel = vi.fn();

    render(
      <SharedPropertyDialogChrome
        articleClassName="test-dialog"
        ariaLabel="Drag dialog"
        windowX={0}
        windowY={0}
        headerClassName="test-header"
        headerCopyClassName="test-header-copy"
        headerActionsClassName="test-header-actions"
        title="Drag Header"
        collapsed={false}
        collapseLabel="Collapse drag dialog"
        expandLabel="Expand drag dialog"
        closeLabel="Close drag dialog"
        onToggleCollapsed={() => undefined}
        onClose={() => undefined}
        onHeaderPointerDown={onHeaderPointerDown}
        onHeaderPointerMove={onHeaderPointerMove}
        onHeaderPointerUp={onHeaderPointerUp}
        onHeaderPointerCancel={onHeaderPointerCancel}
      >
        <div>Body</div>
      </SharedPropertyDialogChrome>
    );

    const header = screen.getByRole("heading", { name: /drag header/i }).closest("header");
    expect(header).not.toBeNull();
    fireEvent.pointerDown(header!);
    fireEvent.pointerMove(header!);
    fireEvent.pointerUp(header!);
    fireEvent.pointerCancel(header!);

    expect(onHeaderPointerDown).toHaveBeenCalledTimes(1);
    expect(onHeaderPointerMove).toHaveBeenCalledTimes(1);
    expect(onHeaderPointerUp).toHaveBeenCalledTimes(1);
    expect(onHeaderPointerCancel).toHaveBeenCalledTimes(1);
  });
});

describe("SharedDialogActionsFooter", () => {
  it("invokes actions in footer", () => {
    const onApply = vi.fn();
    const onOk = vi.fn();
    const onCancel = vi.fn();

    render(
      <SharedDialogActionsFooter onApply={onApply} onOk={onOk} onCancel={onCancel} />
    );

    fireEvent.click(screen.getByRole("button", { name: /^apply$/i }));
    fireEvent.click(screen.getByRole("button", { name: /^ok$/i }));
    fireEvent.click(screen.getByRole("button", { name: /^cancel$/i }));

    expect(onApply).toHaveBeenCalledTimes(1);
    expect(onOk).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
