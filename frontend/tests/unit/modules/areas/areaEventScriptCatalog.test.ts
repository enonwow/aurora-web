import { describe, expect, it } from "vitest";
import {
  readAreaEventScriptCatalog,
} from "../../../../src/modules/areas/domain/areaEventScriptCatalog";
import { areaEventScriptCatalogFixture } from "./areaEventScriptCatalogFixture";

describe("readAreaEventScriptCatalog", () => {
  it("accepts and deeply freezes one exact revision-bound catalog", () => {
    const catalog = readAreaEventScriptCatalog(areaEventScriptCatalogFixture());

    expect(catalog).toEqual(areaEventScriptCatalogFixture());
    expect(Object.isFrozen(catalog)).toBe(true);
    expect(Object.isFrozen(catalog?.items)).toBe(true);
    expect(Object.isFrozen(catalog?.items[0].source)).toBe(true);
  });

  it.each([
    ["fake compiled label", (value: any) => { value.items[0].artifactStatus = "compiled"; }],
    ["paired freshness claim", (value: any) => { value.items[0].freshness = "current"; }],
    ["wrong NSS resource type", (value: any) => { value.items[0].source.resourceType = 2010; }],
    ["wrong source key", (value: any) => { value.items[0].source.logicalKey = "other.nss"; }],
    ["bytecode-only source", (value: any) => { value.items[2].source = value.items[0].source; }],
    ["unsorted rows", (value: any) => { value.items.reverse(); }],
    ["inconsistent summary", (value: any) => { value.summary.sourceOnly = 2; }],
    ["missing external-layer diagnostic", (value: any) => { value.diagnostics.shift(); }],
    ["storage key leak", (value: any) => { value.items[0].source.contentKey = "__aurora/cas"; }],
  ])("rejects %s", (_label, mutate) => {
    const value = structuredClone(areaEventScriptCatalogFixture());
    mutate(value);
    expect(readAreaEventScriptCatalog(value)).toBeNull();
  });
});
