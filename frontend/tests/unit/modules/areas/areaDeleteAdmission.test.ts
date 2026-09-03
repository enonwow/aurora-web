import { describe, expect, it } from "vitest";

import {
  resolveAreaDeleteAdmission,
  resolveAreaResRefFromAreaId
} from "../../../../src/modules/areas/application/areaDeleteAdmission";
import type { AreaDeletePreview } from "../../../../src/modules/areas/areaDeleteContracts";

const preview = {
  moduleId: "module-01",
  areaResRef: "crypt01",
  moduleRevision: "a".repeat(64),
  membershipCount: 1,
  entryAreaResRef: "start01",
  blockerCount: 0,
  expiresAt: "2026-08-18T20:05:00.000Z"
} as AreaDeletePreview;

describe("Area Delete admission", () => {
  it("resolves only the exact source-backed Area ID convention", () => {
    expect(resolveAreaResRefFromAreaId("area_crypt01")).toBe("crypt01");
    expect(resolveAreaResRefFromAreaId("area_area_test")).toBe("area_test");
    expect(resolveAreaResRefFromAreaId("crypt01")).toBeNull();
    expect(resolveAreaResRefFromAreaId("area_TOO_UPPER")).toBeNull();
    expect(resolveAreaResRefFromAreaId("area_name_that_is_too_long")).toBeNull();
  });

  it("admits only an unexpired, unblocked, exact one-membership non-entry preview", () => {
    expect(resolveAreaDeleteAdmission({
      moduleId: "module-01",
      areaResRef: "crypt01",
      moduleRevision: "a".repeat(64),
      preview,
      nowUnixMs: Date.parse("2026-08-18T20:00:00.000Z")
    })).toEqual({ allowed: true });
  });

  it.each([
    ["module identity", { ...preview, moduleId: "module-other" }, "identity_mismatch"],
    ["identity", { ...preview, areaResRef: "other" }, "identity_mismatch"],
    ["revision", { ...preview, moduleRevision: "b".repeat(64) }, "identity_mismatch"],
    ["blockers", { ...preview, blockerCount: 1 }, "references_blocked"],
    ["membership", { ...preview, membershipCount: 2 }, "membership_invalid"],
    ["entry Area", { ...preview, entryAreaResRef: "crypt01" }, "entry_area_blocked"],
    ["expiry", preview, "preview_expired"]
  ] as const)("rejects %s", (_label, candidate, reason) => {
    expect(resolveAreaDeleteAdmission({
      moduleId: "module-01",
      areaResRef: "crypt01",
      moduleRevision: "a".repeat(64),
      preview: candidate,
      nowUnixMs: reason === "preview_expired"
        ? Date.parse("2026-08-18T20:05:00.000Z")
        : Date.parse("2026-08-18T20:00:00.000Z")
    })).toEqual({ allowed: false, reason });
  });
});
