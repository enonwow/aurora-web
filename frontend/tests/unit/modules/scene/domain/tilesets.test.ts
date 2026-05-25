import { describe, expect, it } from "vitest";
import { createTilesetDomainModel } from "../../../../../src/modules/scene/domain/tilesets";

describe("tilesets domain scaffolding", () => {
  it("creates preserve-first model with defaults", () => {
    const model = createTilesetDomainModel({
      tilesetId: "TNO01",
      dimensions: { width: 2, height: 3, tileCount: 6 }
    });

    expect(model.tilesetId).toBe("TNO01");
    expect(model.dimensions).toEqual({ width: 2, height: 3, tileCount: 6 });
    expect(model.tiles).toEqual([]);
    expect(model.groups).toEqual([]);
    expect(model.metadata).toBeUndefined();
  });

  it("clones nested metadata and members to avoid external mutation", () => {
    const source = createTilesetDomainModel({
      tilesetId: "TNO02",
      dimensions: { width: 1, height: 1, tileCount: 1 },
      tiles: [
        {
          tileId: 7,
          metadata: {
            model: "tno02_a01",
            tags: ["stone", "interior"]
          }
        }
      ],
      groups: [
        {
          id: "grp_01",
          members: [
            {
              tileIndex: 0,
              metadata: {
                role: "anchor"
              }
            }
          ],
          metadata: {
            note: "preserve"
          }
        }
      ],
      metadata: {
        version: 51
      }
    });

    expect(source.tiles[0].metadata?.model).toBe("tno02_a01");
    expect(source.tiles[0].metadata?.tags).toEqual(["stone", "interior"]);
    expect(source.groups[0].members[0].metadata?.role).toBe("anchor");
    expect(source.metadata?.version).toBe(51);
  });

  it("freezes top-level and nested collections for deterministic snapshots", () => {
    const model = createTilesetDomainModel({
      tilesetId: "TNO03",
      dimensions: { width: 2, height: 2, tileCount: 4 },
      tiles: [{ tileId: 0 }],
      groups: [
        {
          id: "grp",
          members: [{ tileIndex: 0 }]
        }
      ]
    });

    expect(Object.isFrozen(model)).toBe(true);
    expect(Object.isFrozen(model.dimensions)).toBe(true);
    expect(Object.isFrozen(model.tiles)).toBe(true);
    expect(Object.isFrozen(model.groups)).toBe(true);
    expect(Object.isFrozen(model.groups[0].members)).toBe(true);
  });
});

