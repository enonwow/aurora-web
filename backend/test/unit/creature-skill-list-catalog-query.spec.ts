import {
  parseCreatureFeatRowsQuery,
  parseCreatureSkillRowsQuery,
  parseCreatureSpecialAbilityRowsQuery,
} from
  "../../src/modules/catalog/adapters/inbound/http/catalog.schemas";

describe("Creature skills catalog query", () => {
  it("accepts one digest-bound bounded physical-row query", () => {
    expect(parseCreatureSkillRowsQuery({
      tableSha256: "a".repeat(64),
      rowIndex: "0",
      limit: "1",
      offset: "0",
    })).toEqual({ tableSha256: "a".repeat(64), rowIndex: 0, limit: 1, offset: 0 });
  });

  it("rejects query plus row and out-of-budget pagination", () => {
    expect(() => parseCreatureSkillRowsQuery({
      tableSha256: "a".repeat(64), rowIndex: "0", query: "animal",
    })).toThrow();
    expect(() => parseCreatureSkillRowsQuery({
      tableSha256: "a".repeat(64), limit: "129",
    })).toThrow();
  });
});

describe("Creature feats catalog query", () => {
  it("accepts one digest-bound bounded physical-row query", () => {
    expect(parseCreatureFeatRowsQuery({
      tableSha256: "b".repeat(64),
      rowIndex: "40",
      limit: "1",
      offset: "0",
    })).toEqual({ tableSha256: "b".repeat(64), rowIndex: 40, limit: 1, offset: 0 });
  });

  it("rejects query plus row and out-of-budget pagination", () => {
    expect(() => parseCreatureFeatRowsQuery({
      tableSha256: "b".repeat(64), rowIndex: "40", query: "toughness",
    })).toThrow();
    expect(() => parseCreatureFeatRowsQuery({
      tableSha256: "b".repeat(64), limit: "129",
    })).toThrow();
  });
});

describe("Creature special-ability catalog query", () => {
  it("accepts one digest-bound bounded physical-row query", () => {
    expect(parseCreatureSpecialAbilityRowsQuery({
      tableSha256: "c".repeat(64),
      rowIndex: "65535",
      limit: "1",
      offset: "0",
    })).toEqual({ tableSha256: "c".repeat(64), rowIndex: 65_535, limit: 1, offset: 0 });
  });

  it("rejects query plus row and pagination beyond the endpoint budget", () => {
    expect(() => parseCreatureSpecialAbilityRowsQuery({
      tableSha256: "c".repeat(64), rowIndex: "2", query: "acid",
    })).toThrow();
    expect(() => parseCreatureSpecialAbilityRowsQuery({
      tableSha256: "c".repeat(64), limit: "257",
    })).toThrow();
  });
});
