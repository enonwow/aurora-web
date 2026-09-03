import { AppException } from "../../src/common/http/app-exception";
import {
  parseCatalogListQuery,
  parseCreatureAppearanceRowsQuery,
  parseCreatureGenderRowsQuery,
  parseCreaturePerceptionRangeRowsQuery,
  parseCreatureSoundSetRowsQuery,
  parseCreatureStartingPackageRowsQuery,
  parseCreatureWalkRateRowsQuery,
  parsePlaceableAppearanceRowsQuery,
  parseWaypointAppearanceRowsQuery,
} from "../../src/modules/catalog/adapters/inbound/http/catalog.schemas";

describe("parseCatalogListQuery", () => {
  it("maps subtype aliases to vfx", () => {
    const parsed = parseCatalogListQuery({
      subtype: "vvx",
      limit: 10,
      offset: 0
    });
    const parsedVvxy = parseCatalogListQuery({
      subtype: "vvxy",
      limit: 10,
      offset: 0
    });

    expect(parsed.subtype).toBe("vfx");
    expect(parsedVvxy.subtype).toBe("vfx");
  });

  it("rejects corpse as a non-Aurora subtype filter", () => {
    expect(() =>
      parseCatalogListQuery({
      subtype: "corpse",
      limit: 10,
      offset: 0
      })
    ).toThrow(AppException);
  });

  it("parses benchmark flag", () => {
    const parsed = parseCatalogListQuery({
      benchmark: "true"
    });

    expect(parsed.benchmark).toBe(true);
  });

  it("accepts large catalog pages for frontend list caching", () => {
    const parsed = parseCatalogListQuery({
      limit: "1000",
      offset: "0"
    });

    expect(parsed.limit).toBe(1000);
  });

  it("rejects catalog pages above the frontend cache limit", () => {
    expect(() => parseCatalogListQuery({ limit: "1001" })).toThrow(AppException);
  });

  it("throws validation error for unsupported benchmark value", () => {
    expect(() => parseCatalogListQuery({ benchmark: "yes" })).toThrow(AppException);
  });

  it("parses a digest-bound bounded appearance row query", () => {
    expect(parsePlaceableAppearanceRowsQuery({
      tableSha256: "a".repeat(64),
      query: "  water trough  ",
      limit: "256",
      offset: "999999",
    })).toEqual({
      tableSha256: "a".repeat(64),
      query: "water trough",
      limit: 256,
      offset: 999999,
    });
  });

  it.each([
    {},
    { tableSha256: "A".repeat(64) },
    { tableSha256: "a".repeat(63) },
    { tableSha256: `${"a".repeat(64)}0` },
    { tableSha256: `0${"a".repeat(64)}` },
    { tableSha256: "a".repeat(64), query: "" },
    { tableSha256: "a".repeat(64), query: "x".repeat(129) },
    { tableSha256: "a".repeat(64), limit: "257" },
    { tableSha256: "a".repeat(64), offset: "1000000" },
    { tableSha256: "a".repeat(64), extra: "rejected" },
  ])("rejects an invalid appearance row query %#", (query) => {
    expect(() => parsePlaceableAppearanceRowsQuery(query)).toThrow(AppException);
  });

  it("reports exact validation issue paths for an invalid appearance row query", () => {
    try {
      parsePlaceableAppearanceRowsQuery({
        tableSha256: "invalid",
        limit: 0,
        extra: true,
      });
      throw new Error("expected validation failure");
    } catch (error) {
      expect(error).toMatchObject({
        code: "VALIDATION_FAILED",
        details: expect.arrayContaining([
          expect.objectContaining({ path: "tableSha256", reason: expect.any(String) }),
          expect.objectContaining({ path: "limit", reason: expect.any(String) }),
          expect.objectContaining({ path: "", reason: expect.any(String) }),
        ]),
      });
    }
  });

  it("parses a strict digest-bound Waypoint Appearance row query", () => {
    expect(parseWaypointAppearanceRowsQuery({
      tableSha256: "f".repeat(64),
      query: "  yellow  ",
      limit: "256",
      offset: "4",
    })).toEqual({
      tableSha256: "f".repeat(64),
      query: "yellow",
      limit: 256,
      offset: 4,
    });
    expect(() => parseWaypointAppearanceRowsQuery({
      tableSha256: "F".repeat(64),
      extra: true,
    })).toThrow(AppException);
  });

  it("parses Creature Appearance rows through the same strict bounded wire shape", () => {
    expect(parseCreatureAppearanceRowsQuery({
      tableSha256: "b".repeat(64),
      query: "  dwarf male  ",
      limit: "256",
      offset: "999999",
    })).toEqual({
      tableSha256: "b".repeat(64),
      query: "dwarf male",
      limit: 256,
      offset: 999999,
    });
    expect(parseCreatureAppearanceRowsQuery({
      tableSha256: "b".repeat(64),
      rowIndex: "249",
      limit: "1",
    })).toEqual({
      tableSha256: "b".repeat(64),
      rowIndex: 249,
      limit: 1,
      offset: 0,
    });
    expect(() => parseCreatureAppearanceRowsQuery({
      tableSha256: "b".repeat(64),
      rowIndex: "249",
      query: "dwarf",
    })).toThrow(AppException);
    expect(() => parseCreatureAppearanceRowsQuery({
      tableSha256: "B".repeat(64),
      rowIndex: "65536",
      extra: true,
    })).toThrow(AppException);
  });

  it("parses Creature Gender pages and exact Byte-row lookups", () => {
    expect(parseCreatureGenderRowsQuery({
      tableSha256: "c".repeat(64),
      query: "  other  ",
      limit: "256",
      offset: "999999",
    })).toEqual({
      tableSha256: "c".repeat(64),
      query: "other",
      limit: 256,
      offset: 999999,
    });
    expect(parseCreatureGenderRowsQuery({
      tableSha256: "c".repeat(64),
      rowIndex: "255",
      limit: "1",
    })).toEqual({
      tableSha256: "c".repeat(64),
      rowIndex: 255,
      limit: 1,
      offset: 0,
    });
    expect(() => parseCreatureGenderRowsQuery({
      tableSha256: "c".repeat(64),
      rowIndex: "0",
      query: "male",
    })).toThrow(AppException);
    expect(() => parseCreatureGenderRowsQuery({
      tableSha256: "c".repeat(64),
      rowIndex: "256",
    })).toThrow(AppException);
  });

  it("parses only the four native Toolset PerceptionRange rows", () => {
    expect(parseCreaturePerceptionRangeRowsQuery({
      tableSha256: "e".repeat(64),
      query: "  medium  ",
    })).toEqual({
      tableSha256: "e".repeat(64),
      query: "medium",
      limit: 16,
      offset: 0,
    });
    expect(parseCreaturePerceptionRangeRowsQuery({
      tableSha256: "e".repeat(64),
      rowIndex: "11",
      limit: "1",
    })).toEqual({
      tableSha256: "e".repeat(64),
      rowIndex: 11,
      limit: 1,
      offset: 0,
    });
    for (const rowIndex of ["0", "7", "12", "255"]) {
      expect(() => parseCreaturePerceptionRangeRowsQuery({
        tableSha256: "e".repeat(64),
        rowIndex,
      })).toThrow(AppException);
    }
    expect(() => parseCreaturePerceptionRangeRowsQuery({
      tableSha256: "e".repeat(64),
      rowIndex: "11",
      query: "default",
    })).toThrow(AppException);
  });

  it("parses only positive Toolset WalkRate row lookups", () => {
    expect(parseCreatureWalkRateRowsQuery({
      tableSha256: "d".repeat(64),
      query: "  normal  ",
    })).toEqual({
      tableSha256: "d".repeat(64),
      query: "normal",
      limit: 100,
      offset: 0,
    });
    expect(parseCreatureWalkRateRowsQuery({
      tableSha256: "d".repeat(64),
      rowIndex: "4",
      limit: "1",
    })).toEqual({
      tableSha256: "d".repeat(64),
      rowIndex: 4,
      limit: 1,
      offset: 0,
    });
    for (const rowIndex of ["0", "1000000", "-1", "1.5"]) {
      expect(() => parseCreatureWalkRateRowsQuery({
        tableSha256: "d".repeat(64),
        rowIndex,
      })).toThrow(AppException);
    }
    expect(() => parseCreatureWalkRateRowsQuery({
      tableSha256: "d".repeat(64),
      rowIndex: "4",
      query: "normal",
    })).toThrow(AppException);
  });

  it("parses sparse Word-bound Toolset SoundSetFile row lookups including row zero", () => {
    expect(parseCreatureSoundSetRowsQuery({
      tableSha256: "a".repeat(64),
      query: "  aasimar  ",
    })).toEqual({
      tableSha256: "a".repeat(64),
      query: "aasimar",
      limit: 100,
      offset: 0,
    });
    expect(parseCreatureSoundSetRowsQuery({
      tableSha256: "a".repeat(64),
      rowIndex: "0",
      limit: "1",
    })).toEqual({
      tableSha256: "a".repeat(64),
      rowIndex: 0,
      limit: 1,
      offset: 0,
    });
    expect(parseCreatureSoundSetRowsQuery({
      tableSha256: "a".repeat(64),
      rowIndex: "65535",
    })).toMatchObject({ rowIndex: 65535 });
    for (const rowIndex of ["-1", "65536", "1.5"]) {
      expect(() => parseCreatureSoundSetRowsQuery({
        tableSha256: "a".repeat(64),
        rowIndex,
      })).toThrow(AppException);
    }
    expect(() => parseCreatureSoundSetRowsQuery({
      tableSha256: "a".repeat(64),
      rowIndex: "0",
      query: "aasimar",
    })).toThrow(AppException);
  });

  it("parses class-filtered Byte-bound StartingPackage row lookups including row zero", () => {
    expect(parseCreatureStartingPackageRowsQuery({
      tableSha256: "b".repeat(64),
      classIds: "4,2",
      query: "  fighter  ",
    })).toEqual({
      tableSha256: "b".repeat(64),
      classIds: [4, 2],
      query: "fighter",
      limit: 100,
      offset: 0,
    });
    expect(parseCreatureStartingPackageRowsQuery({
      tableSha256: "b".repeat(64),
      classIds: "4",
      rowIndex: "0",
      limit: "1",
    })).toEqual({
      tableSha256: "b".repeat(64),
      classIds: [4],
      rowIndex: 0,
      limit: 1,
      offset: 0,
    });
    for (const classIds of ["", "-1", "4,", "4,2,3,4,5,6,7,8,9"]) {
      expect(() => parseCreatureStartingPackageRowsQuery({
        tableSha256: "b".repeat(64),
        classIds,
      })).toThrow(AppException);
    }
    expect(() => parseCreatureStartingPackageRowsQuery({
      tableSha256: "b".repeat(64),
      classIds: "4",
      rowIndex: "0",
      query: "fighter",
    })).toThrow(AppException);
  });
});
