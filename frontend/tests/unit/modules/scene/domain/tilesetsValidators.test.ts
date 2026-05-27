import { describe, expect, it } from "vitest";
import { createTilesetDomainModel } from "../../../../../src/modules/scene/domain/tilesets";
import {
  validateTilesetDimensions,
  validateTilesetDomainModel,
  validateTilesetGroups
} from "../../../../../src/modules/scene/domain/tilesetsValidators";

describe("tilesetsValidators", () => {
  it("accepts width*height consistent with tileCount", () => {
    const issues = validateTilesetDimensions({ width: 3, height: 2, tileCount: 6 });
    expect(issues).toEqual([]);
  });

  it("reports tile count mismatch when width*height does not match tileCount", () => {
    const issues = validateTilesetDimensions({ width: 3, height: 2, tileCount: 5 });
    expect(issues.some((issue) => issue.code === "tile_count_mismatch")).toBe(true);
  });

  it("reports integer and non-negative constraints", () => {
    const issues = validateTilesetDimensions({ width: 2.5, height: -1, tileCount: -3 });
    expect(issues.some((issue) => issue.code === "dimensions_not_integer")).toBe(true);
    expect(issues.some((issue) => issue.code === "dimensions_negative")).toBe(true);
  });

  it("accepts deterministic group membership", () => {
    const groups = [
      {
        id: "grp_01",
        members: [{ tileIndex: 0 }, { tileIndex: 2 }, { tileIndex: 3 }]
      },
      {
        id: "grp_02",
        members: [{ tileIndex: 1 }]
      }
    ] as const;
    const issues = validateTilesetGroups(groups, 4);
    expect(issues).toEqual([]);
  });

  it("reports duplicate and empty group ids", () => {
    const issues = validateTilesetGroups(
      [
        { id: " ", members: [{ tileIndex: 0 }] },
        { id: "grp", members: [{ tileIndex: 1 }] },
        { id: "grp", members: [{ tileIndex: 2 }] }
      ],
      3
    );
    expect(issues.some((issue) => issue.code === "group_id_empty")).toBe(true);
    expect(issues.some((issue) => issue.code === "group_id_duplicate")).toBe(true);
  });

  it("reports empty groups, out-of-bounds and non-integer tile indexes", () => {
    const issues = validateTilesetGroups(
      [
        { id: "grp_empty", members: [] },
        { id: "grp_idx", members: [{ tileIndex: -1 }, { tileIndex: 4 }, { tileIndex: 1.2 }] }
      ],
      4
    );
    expect(issues.some((issue) => issue.code === "group_members_empty")).toBe(true);
    expect(issues.some((issue) => issue.code === "group_member_index_out_of_bounds")).toBe(
      true
    );
    expect(issues.some((issue) => issue.code === "group_member_index_not_integer")).toBe(true);
  });

  it("reports duplicate member indexes and non-deterministic order inside a group", () => {
    const issues = validateTilesetGroups(
      [
        {
          id: "grp_order",
          members: [{ tileIndex: 2 }, { tileIndex: 1 }, { tileIndex: 1 }]
        }
      ],
      3
    );
    expect(issues.some((issue) => issue.code === "group_member_index_order")).toBe(true);
    expect(issues.some((issue) => issue.code === "group_member_index_duplicate")).toBe(true);
  });

  it("aggregates dimensions and group issues in domain-level validator", () => {
    const model = createTilesetDomainModel({
      tilesetId: "BAD01",
      dimensions: { width: 2, height: 2, tileCount: 3 },
      groups: [
        {
          id: "",
          members: [{ tileIndex: 0 }, { tileIndex: 4 }]
        }
      ]
    });
    const result = validateTilesetDomainModel(model);

    expect(result.isValid).toBe(false);
    expect(result.issues.some((issue) => issue.code === "tile_count_mismatch")).toBe(true);
    expect(result.issues.some((issue) => issue.code === "group_id_empty")).toBe(true);
    expect(result.issues.some((issue) => issue.code === "group_member_index_out_of_bounds")).toBe(
      true
    );
  });

  it("returns valid result for consistent model", () => {
    const model = createTilesetDomainModel({
      tilesetId: "GOOD01",
      dimensions: { width: 2, height: 2, tileCount: 4 },
      groups: [
        { id: "grp_a", members: [{ tileIndex: 0 }, { tileIndex: 1 }] },
        { id: "grp_b", members: [{ tileIndex: 2 }, { tileIndex: 3 }] }
      ]
    });
    const result = validateTilesetDomainModel(model);

    expect(result.isValid).toBe(true);
    expect(result.issues).toEqual([]);
  });
});

