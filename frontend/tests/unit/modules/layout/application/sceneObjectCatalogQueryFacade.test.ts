import { describe, expect, it } from "vitest";
import { createSceneObjectCatalogQueryFacade } from "../../../../../src/modules/layout/application/sceneObjectCatalogQueryFacade";
import { createSeedAreaScene } from "../../../../../src/modules/scene/domain/sceneFactory";

describe("sceneObjectCatalogQueryFacade", () => {
  const objects = createSeedAreaScene().objects;

  it("groups objects by catalog type and produces scope ids", () => {
    const facade = createSceneObjectCatalogQueryFacade();
    const result = facade.query({
      objects,
      activeType: "doors",
      searchQuery: ""
    });

    expect(result.totalCount).toBe(12);
    expect(result.groupedRows.all.length).toBe(12);
    expect(result.groupedRows.placeables.length).toBe(4);
    expect(result.groupedRows.creatures.length).toBe(2);
    expect(result.groupedRows.doors.length).toBe(2);
    expect(result.allowedObjectIds).toEqual(["dr_nw_01", "dr_nw_02"]);
    expect(result.activeDefinition).toMatchObject({
      key: "doors",
      label: "Doors",
      tier: "mvp"
    });
  });

  it("filters active rows by tag and resref with normalized query", () => {
    const facade = createSceneObjectCatalogQueryFacade();
    const byTag = facade.query({
      objects,
      activeType: "sounds",
      searchQuery: " caves "
    });
    const byResRef = facade.query({
      objects,
      activeType: "creatures",
      searchQuery: "NW_BATTDEVOUR"
    });

    expect(byTag.filteredRows).toHaveLength(1);
    expect(byTag.filteredRows[0]?.id).toBe("snd_amb_02");
    expect(byResRef.filteredRows).toHaveLength(1);
    expect(byResRef.filteredRows[0]?.id).toBe("crt_devo_01");
  });

  it("returns empty rows for post-mvp categories without scene objects", () => {
    const facade = createSceneObjectCatalogQueryFacade();
    const result = facade.query({
      objects,
      activeType: "vfx",
      searchQuery: ""
    });

    expect(result.filteredRows).toEqual([]);
    expect(result.allowedObjectIds).toEqual([]);
    expect(result.activeDefinition.label).toBe("VFX");
    expect(result.mvpTypes.length).toBeGreaterThan(0);
    expect(result.postMvpTypes.some((entry) => entry.key === "vfx")).toBe(true);
  });
});
