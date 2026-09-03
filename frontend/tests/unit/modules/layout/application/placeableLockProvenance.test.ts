import { describe, expect, it } from "vitest";

import {
  canEditExistingPlaceableLockField,
  materializeExistingPlaceableLockSettings
} from "../../../../../src/modules/layout/application/placeableLockProvenance";

describe("existing Placeable lock provenance", () => {
  const source = {
    type: "aurora_git" as const,
    sourceKind: "placeable" as const,
    placeableLockSettings: {
      locked: false,
      canRelock: false,
      autoRemoveKeyAfterUse: false,
      keyRequiredToUnlockOrLock: false,
      openLockDc: 18,
      closeLockDc: 0,
      keyTag: ""
    }
  };

  it.each([
    "locked",
    "canRelock",
    "autoRemoveKeyAfterUse",
    "keyRequiredToUnlockOrLock",
    "openLockDc",
    "closeLockDc",
    "keyTag"
  ] as const)("admits exact %s provenance", (field) => {
    expect(canEditExistingPlaceableLockField(source, field)).toBe(true);
  });

  it("rejects absent fields, wrong families, invalid DCs, and invalid KeyName provenance", () => {
    expect(canEditExistingPlaceableLockField({
      type: "aurora_git",
      sourceKind: "placeable",
      placeableLockSettings: {}
    }, "locked")).toBe(false);
    expect(canEditExistingPlaceableLockField({ ...source, type: "seed" }, "locked")).toBe(false);
    expect(canEditExistingPlaceableLockField({ ...source, sourceKind: "creature" }, "locked"))
      .toBe(false);
    expect(canEditExistingPlaceableLockField({
      ...source,
      placeableLockSettings: { openLockDc: 256 }
    }, "openLockDc")).toBe(false);
    expect(canEditExistingPlaceableLockField({
      ...source,
      placeableLockSettings: { openLockDc: -1 }
    }, "openLockDc")).toBe(false);
    expect(canEditExistingPlaceableLockField({
      ...source,
      placeableLockSettings: { openLockDc: 255 }
    }, "openLockDc")).toBe(true);
    expect(canEditExistingPlaceableLockField({
      ...source,
      placeableLockSettings: { keyTag: "K".repeat(32) }
    }, "keyTag")).toBe(true);
    expect(canEditExistingPlaceableLockField({
      ...source,
      placeableLockSettings: { keyTag: "K".repeat(33) }
    }, "keyTag")).toBe(false);
    expect(canEditExistingPlaceableLockField({
      ...source,
      placeableLockSettings: { keyTag: "bad\0key" }
    }, "keyTag")).toBe(false);
  });

  it("materializes only proven changes and preserves unproven lock values", () => {
    const current = {
      locked: false,
      canRelock: false,
      autoRemoveKeyAfterUse: false,
      keyRequiredToUnlockOrLock: false,
      openLockDc: 18,
      closeLockDc: 0,
      keyTag: "preserve_me"
    };
    expect(materializeExistingPlaceableLockSettings(source, current, {
      locked: true,
      canRelock: true,
      autoRemoveKeyAfterUse: true,
      keyRequiredToUnlockOrLock: true,
      openLockDc: 24,
      closeLockDc: 12,
      keyTag: "new_key"
    })).toEqual({
      locked: true,
      canRelock: true,
      autoRemoveKeyAfterUse: true,
      keyRequiredToUnlockOrLock: true,
      openLockDc: 24,
      closeLockDc: 12,
      keyTag: "new_key"
    });
  });

  it("does not materialize without current exact lock state", () => {
    expect(materializeExistingPlaceableLockSettings(source, undefined, {
      locked: true,
      canRelock: true,
      autoRemoveKeyAfterUse: true,
      keyRequiredToUnlockOrLock: true,
      openLockDc: 24,
      closeLockDc: 12,
      keyTag: "ignored"
    })).toBeUndefined();
  });

  it("preserves every unproven field while materializing one proven field", () => {
    const current = {
      locked: false,
      canRelock: false,
      autoRemoveKeyAfterUse: false,
      keyRequiredToUnlockOrLock: false,
      openLockDc: 18,
      closeLockDc: 0,
      keyTag: "preserve_me"
    };
    expect(materializeExistingPlaceableLockSettings({
      ...source,
      placeableLockSettings: { locked: false }
    }, current, {
      locked: true,
      canRelock: true,
      autoRemoveKeyAfterUse: true,
      keyRequiredToUnlockOrLock: true,
      openLockDc: 24,
      closeLockDc: 12,
      keyTag: "must_not_apply"
    })).toEqual({ ...current, locked: true });
  });
});
