import { describe, expect, it } from "vitest";
import {
  readAreaCapabilityCatalog,
  resolveAreaCapabilityAvailability,
} from "../../../../src/modules/areas/domain/areaCapabilityCatalog";
import { capabilityFixture } from "./areaCapabilityFixture";

describe("readAreaCapabilityCatalog", () => {
  it("returns a defensive immutable exact area-capabilities.v1 document", () => {
    const source = capabilityFixture();
    const parsed = readAreaCapabilityCatalog(source);
    expect(parsed).toEqual(source);
    expect(parsed).not.toBe(source);
    expect(Object.isFrozen(parsed)).toBe(true);
    expect(Object.isFrozen(parsed?.items)).toBe(true);
    expect(Object.isFrozen(parsed?.items[0])).toBe(true);
  });

  it.each([
    ["unknown key", (value: any) => { value.items[0].extra = true; }],
    ["duplicate id", (value: any) => { value.items[1].id = value.items[0].id; }],
    ["unsorted rows", (value: any) => { value.items.reverse(); }],
    ["wrong total", (value: any) => { value.summary.total = 3; }],
    ["wrong state count", (value: any) => { value.summary.release.blocked = 1; }],
    ["available partial", (value: any) => { value.items[0].implementation = "partial"; }],
    ["available missing evidence", (value: any) => { value.items[0].auroraEvidence = "missing"; }],
    ["verified without link", (value: any) => { value.items[0].auroraEvidence = "verified"; }],
    ["over budget", (value: any) => {
      value.items[0].blockers = Array.from({ length: 65 }, (_, index) => `blocker_${index}`);
    }],
  ])("rejects %s", (_label, mutate) => {
    const value = structuredClone(capabilityFixture()) as any;
    mutate(value);
    expect(readAreaCapabilityCatalog(value)).toBeNull();
  });
});

describe("resolveAreaCapabilityAvailability", () => {
  it("admits only an exact available catalog row", () => {
    const catalog = readAreaCapabilityCatalog(capabilityFixture());
    expect(catalog).not.toBeNull();
    expect(resolveAreaCapabilityAvailability(catalog!, "lifecycle_create_local_draft"))
      .toEqual({ available: true, reason: "available" });
  });

  it("fails closed for blocked, hidden, and absent capabilities", () => {
    const source = structuredClone(capabilityFixture()) as any;
    source.items[1].release = "blocked";
    source.summary.release.blocked = 1;
    source.summary.release.hidden = 0;
    const catalog = readAreaCapabilityCatalog(source);
    expect(catalog).not.toBeNull();
    expect(resolveAreaCapabilityAvailability(catalog!, "topology_select_connected_region"))
      .toEqual({ available: false, reason: "blocked" });

    const hiddenCatalog = readAreaCapabilityCatalog(capabilityFixture());
    expect(resolveAreaCapabilityAvailability(hiddenCatalog!, "topology_select_connected_region"))
      .toEqual({ available: false, reason: "hidden" });
    expect(resolveAreaCapabilityAvailability(hiddenCatalog!, "objects_unknown_capability"))
      .toEqual({ available: false, reason: "absent" });
  });
});
