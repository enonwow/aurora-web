import { createHash } from "node:crypto";
import {
  AREA_ENCOUNTER_DIFFICULTY_CATALOG_SCHEMA_VERSION,
  buildEffectiveAreaEncounterDifficultyCatalog,
  isExactEffectiveAreaEncounterDifficultyCatalog,
  parseEffectiveAreaEncounterDifficultyTwoDa,
} from "../../src/modules/catalog/domain/effective-area-encounter-difficulty-two-da";

const source = (body: string) => Buffer.from(`2DA V2.0\n\n${body}`, "utf8");

describe("effective Area Encounter EncDifficulty.2da", () => {
  it("parses exact physical STRREF/VALUE rows and freezes source provenance", () => {
    const bytes = source("STRREF VALUE\n0 100 -5\n1 101 0\n2 102 5\n");
    const table = parseEffectiveAreaEncounterDifficultyTwoDa({
      bytes,
      sourceObjectKey: "runtime-source/vanilla/data/encdifficulty.2da",
      sourceLayer: "vanilla",
    });

    expect(table).toEqual({
      descriptor: {
        resourceName: "encdifficulty.2da",
        sourceObjectKey: "runtime-source/vanilla/data/encdifficulty.2da",
        sourceLayer: "vanilla",
        sha256: createHash("sha256").update(bytes).digest("hex"),
        sizeBytes: bytes.length,
        rowCount: 3,
      },
      rows: [
        { rowIndex: 0, strRef: 100, value: -5 },
        { rowIndex: 1, strRef: 101, value: 0 },
        { rowIndex: 2, strRef: 102, value: 5 },
      ],
    });
    expect(Object.isFrozen(table)).toBe(true);
    expect(Object.isFrozen(table?.descriptor)).toBe(true);
    expect(Object.isFrozen(table?.rows)).toBe(true);
    expect(table?.rows.every(Object.isFrozen)).toBe(true);
  });

  it("builds TLK labels with deterministic physical-row fallback", () => {
    const table = parseEffectiveAreaEncounterDifficultyTwoDa({
      bytes: source("STRREF VALUE\n0 100 -5\n1 101 0\n"),
      sourceObjectKey: "module/encdifficulty.2da",
      sourceLayer: "module",
    });
    expect(table).not.toBeNull();

    const catalog = buildEffectiveAreaEncounterDifficultyCatalog(
      table!,
      (strRef) => strRef === 100 ? "Very easy" : undefined,
    );

    expect(catalog.schemaVersion).toBe(AREA_ENCOUNTER_DIFFICULTY_CATALOG_SCHEMA_VERSION);
    expect(catalog.rows).toEqual([
      {
        rowIndex: 0,
        strRef: 100,
        value: -5,
        displayName: "Very easy",
        displaySource: "strref",
      },
      {
        rowIndex: 1,
        strRef: 101,
        value: 0,
        displayName: "Row 1",
        displaySource: "row_index",
      },
    ]);
    expect(isExactEffectiveAreaEncounterDifficultyCatalog(catalog)).toBe(true);
  });

  it.each([
    ["missing STRREF", "VALUE\n0 -5\n"],
    ["wrong-case column", "StrRef VALUE\n0 100 -5\n"],
    ["missing VALUE", "STRREF\n0 100\n"],
    ["blank STRREF", "STRREF VALUE\n0 **** -5\n"],
    ["blank VALUE", "STRREF VALUE\n0 100 ****\n"],
    ["negative STRREF", "STRREF VALUE\n0 -1 -5\n"],
    ["VALUE below native minimum", "STRREF VALUE\n0 100 -21\n"],
    ["VALUE above native maximum", "STRREF VALUE\n0 100 21\n"],
    ["fractional VALUE", "STRREF VALUE\n0 100 1.5\n"],
    ["empty table", "STRREF VALUE\n"],
  ])("fails closed for %s", (_label, body) => {
    expect(parseEffectiveAreaEncounterDifficultyTwoDa({
      bytes: source(body),
      sourceObjectKey: "hak/encdifficulty.2da",
      sourceLayer: "hak",
    })).toBeNull();
  });

  it("rejects an over-budget source and malformed exact-catalog payloads", () => {
    expect(parseEffectiveAreaEncounterDifficultyTwoDa({
      bytes: Buffer.alloc(16 * 1024 * 1024 + 1, 0x20),
      sourceObjectKey: "hak/encdifficulty.2da",
      sourceLayer: "hak",
    })).toBeNull();

    const table = parseEffectiveAreaEncounterDifficultyTwoDa({
      bytes: source("STRREF VALUE\n0 100 -5\n"),
      sourceObjectKey: "hak/encdifficulty.2da",
      sourceLayer: "hak",
    });
    const catalog = buildEffectiveAreaEncounterDifficultyCatalog(table!, () => "Easy");
    expect(isExactEffectiveAreaEncounterDifficultyCatalog({
      ...catalog,
      rows: [{ ...catalog.rows[0], value: 21 }],
    })).toBe(false);
    expect(isExactEffectiveAreaEncounterDifficultyCatalog({
      ...catalog,
      rows: [{ ...catalog.rows[0], rowIndex: 1 }],
    })).toBe(false);
    expect(isExactEffectiveAreaEncounterDifficultyCatalog({
      ...catalog,
      descriptor: { ...catalog.descriptor, sha256: "A".repeat(64) },
    })).toBe(false);
  });
});
