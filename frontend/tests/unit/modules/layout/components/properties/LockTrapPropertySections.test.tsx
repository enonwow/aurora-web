import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  SharedLockPropertySection,
  SharedTrapPropertySection,
  type SharedLockSettings,
  type SharedTrapSettings
} from "../../../../../../src/modules/layout/components/properties/LockTrapPropertySections";

const lockSettings: SharedLockSettings = {
  locked: true,
  canRelock: true,
  autoRemoveKeyAfterUse: false,
  keyRequiredToUnlockOrLock: false,
  openLockDc: 18,
  closeLockDc: 0,
  keyTag: "chest_key"
};

const settings: SharedTrapSettings = {
  isTrapped: true,
  trapType: "Spike Trap, Minor",
  detectionDc: 10,
  disarmDc: 15,
  oneShot: true,
  detectable: true,
  disarmable: true,
  onDisarmScript: "old_disarm",
  onTrapTriggeredScript: "old_trap",
  setDc: 5,
  detectDcModWhenSetByRogue: 10,
  disarmDcModWhenSetByRogue: 22
};

const fieldLabels = [
  "Trap Type",
  "Detection DC",
  "Disarm DC",
  "One Shot",
  "Detectable",
  "Disarmable",
  "OnDisarm",
  "OnTrapTriggered",
  "Set DC",
  "Detect DC Mod. when set by Rogue",
  "Disarm DC Mod. when set by Rogue"
] as const;

describe("SharedTrapPropertySection field admission", () => {
  it("keeps every field and admitted script action enabled when no field is restricted", () => {
    const onAction = vi.fn();
    render(
      <SharedTrapPropertySection
        value={settings}
        onChange={vi.fn()}
        trapTypeOptions={[settings.trapType]}
        scriptActionButtons={{
          onDisarmScript: [{ label: "Browse Disarm", onClick: onAction }]
        }}
      />
    );

    expect(screen.getByRole("checkbox", { name: "Is Trapped" })).toBeEnabled();
    for (const label of fieldLabels) {
      expect(screen.getByLabelText(label)).toBeEnabled();
    }
    const action = screen.getByRole("button", { name: "Browse Disarm" });
    expect(action).toBeEnabled();
    fireEvent.click(action);
    expect(onAction).toHaveBeenCalledWith("onDisarmScript");
  });

  it("can admit one exact script field while disabling every other trap field", () => {
    render(
      <SharedTrapPropertySection
        value={settings}
        onChange={vi.fn()}
        trapTypeOptions={[settings.trapType]}
        isFieldDisabled={(field) => field !== "onDisarmScript"}
        scriptActionButtons={{
          onDisarmScript: [{ label: "Browse Disarm" }],
          onTrapTriggeredScript: [{ label: "Browse Trigger" }]
        }}
      />
    );

    expect(screen.getByLabelText("OnDisarm")).toBeEnabled();
    expect(screen.getByRole("button", { name: "Browse Disarm" })).toBeEnabled();
    expect(screen.getByLabelText("OnTrapTriggered")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Browse Trigger" })).toBeDisabled();
    expect(screen.getByRole("checkbox", { name: "Is Trapped" })).toBeDisabled();
    for (const label of fieldLabels.filter((label) =>
      label !== "OnDisarm" && label !== "OnTrapTriggered")) {
      expect(screen.getByLabelText(label)).toBeDisabled();
    }
  });
});

describe("SharedLockPropertySection field admission", () => {
  it("keeps every unrestricted lock field enabled and dispatches its exact value", () => {
    const onChange = vi.fn();
    render(<SharedLockPropertySection value={lockSettings} onChange={onChange} />);

    const relock = screen.getByRole("checkbox", { name: "Can be relocked" });
    const autoRemove = screen.getByRole("checkbox", {
      name: "Automatically remove key after use"
    });
    const keyRequired = screen.getByRole("checkbox", {
      name: "Key required to unlock or lock"
    });
    const closeDc = screen.getByLabelText("Close Lock DC");
    const keyTag = screen.getByLabelText("Key Tag");
    expect(keyTag).toHaveAttribute("maxLength", "32");
    for (const control of [relock, autoRemove, keyRequired, closeDc, keyTag]) {
      expect(control).toBeEnabled();
    }

    fireEvent.click(relock);
    fireEvent.click(autoRemove);
    fireEvent.click(keyRequired);
    fireEvent.change(closeDc, { target: { value: "12" } });
    fireEvent.change(keyTag, { target: { value: "new_key" } });
    expect(onChange).toHaveBeenCalledWith("canRelock", false);
    expect(onChange).toHaveBeenCalledWith("autoRemoveKeyAfterUse", true);
    expect(onChange).toHaveBeenCalledWith("keyRequiredToUnlockOrLock", true);
    expect(onChange).toHaveBeenCalledWith("closeLockDc", 12);
    expect(onChange).toHaveBeenCalledWith("keyTag", "new_key");
  });

  it("applies the native lock-state dependency without disabling the root toggles", () => {
    render(
      <SharedLockPropertySection
        value={{ ...lockSettings, locked: false, canRelock: false }}
        onChange={vi.fn()}
        behavior={{
          disableLockDetailsWhenUnlocked: true,
          disableAutoRemoveKeyUnlessLockedAndRelockable: true
        }}
      />
    );

    expect(screen.getByRole("checkbox", { name: "Locked" })).toBeEnabled();
    expect(screen.getByRole("checkbox", { name: "Can be relocked" })).toBeEnabled();
    expect(screen.getByRole("checkbox", {
      name: "Automatically remove key after use"
    })).toBeDisabled();
    expect(screen.getByRole("checkbox", {
      name: "Key required to unlock or lock"
    })).toBeDisabled();
    expect(screen.getByLabelText("Open Lock DC")).toBeDisabled();
    expect(screen.getByLabelText("Close Lock DC")).toBeDisabled();
    expect(screen.getByLabelText("Key Tag")).toBeDisabled();
  });

  it("keeps automatic key removal disabled when either native prerequisite is false", () => {
    const { rerender } = render(
      <SharedLockPropertySection
        value={{ ...lockSettings, locked: true, canRelock: false }}
        onChange={vi.fn()}
        behavior={{ disableAutoRemoveKeyUnlessLockedAndRelockable: true }}
      />
    );
    expect(screen.getByRole("checkbox", {
      name: "Automatically remove key after use"
    })).toBeDisabled();

    rerender(
      <SharedLockPropertySection
        value={{ ...lockSettings, locked: false, canRelock: true }}
        onChange={vi.fn()}
        behavior={{ disableAutoRemoveKeyUnlessLockedAndRelockable: true }}
      />
    );
    expect(screen.getByRole("checkbox", {
      name: "Automatically remove key after use"
    })).toBeDisabled();
  });

  it("combines independent field restrictions with enabled lock details", () => {
    render(
      <SharedLockPropertySection
        value={lockSettings}
        onChange={vi.fn()}
        behavior={{ disableLockDetailsWhenUnlocked: true }}
        isFieldDisabled={(field) =>
          field === "keyRequiredToUnlockOrLock" || field === "closeLockDc" || field === "keyTag"
        }
      />
    );
    expect(screen.getByLabelText("Open Lock DC")).toBeEnabled();
    expect(screen.getByRole("checkbox", {
      name: "Key required to unlock or lock"
    })).toBeDisabled();
    expect(screen.getByLabelText("Close Lock DC")).toBeDisabled();
    expect(screen.getByLabelText("Key Tag")).toBeDisabled();
  });

  it("disables the complete lock section when requested", () => {
    render(<SharedLockPropertySection value={lockSettings} onChange={vi.fn()} disabled />);
    expect(screen.getByRole("checkbox", { name: "Locked" })).toBeDisabled();
    expect(screen.getByRole("checkbox", { name: "Can be relocked" })).toBeDisabled();
    expect(screen.getByLabelText("Open Lock DC")).toBeDisabled();
    expect(screen.getByLabelText("Key Tag")).toBeDisabled();
  });
});
