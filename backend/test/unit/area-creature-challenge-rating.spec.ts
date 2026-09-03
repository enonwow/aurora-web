import {
  AREA_CREATURE_CHALLENGE_RATING_MAX,
  normalizeAreaCreatureChallengeRating,
  readAreaCreatureChallengeRatingStorage,
  readExistingAreaCreatureChallengeRatingMutation,
} from "../../src/modules/areas/domain/area-creature-challenge-rating";

describe("Existing Area Creature ChallengeRating mutation", () => {
  it("normalizes admitted decimal targets exactly once to binary32", () => {
    expect(normalizeAreaCreatureChallengeRating(0)).toBe(0);
    expect(normalizeAreaCreatureChallengeRating(0.5)).toBe(0.5);
    expect(normalizeAreaCreatureChallengeRating(11)).toBe(11);
    expect(normalizeAreaCreatureChallengeRating(0.1)).toBe(Math.fround(0.1));
    expect(normalizeAreaCreatureChallengeRating(AREA_CREATURE_CHALLENGE_RATING_MAX))
      .toBe(AREA_CREATURE_CHALLENGE_RATING_MAX);
  });

  it.each([
    null,
    "0.5",
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    -1,
    -0,
    1000.01,
  ])("rejects out-of-profile target %#", (value) => {
    expect(normalizeAreaCreatureChallengeRating(value)).toBeNull();
  });

  it("reads exact presence-sensitive Float storage as an immutable binary32 value", () => {
    expect(readAreaCreatureChallengeRatingStorage({ present: false }))
      .toEqual({ present: false });
    const storage = readAreaCreatureChallengeRatingStorage({
      present: true,
      nativeType: "float",
      value: 0.1,
    });
    expect(storage).toEqual({
      present: true,
      nativeType: "float",
      value: Math.fround(0.1),
    });
    expect(Object.isFrozen(storage)).toBe(true);
  });

  it.each([
    null,
    [],
    { present: false, value: 0 },
    { present: true, nativeType: "dword", value: 1 },
    { present: true, nativeType: "float", value: -1 },
    { present: true, nativeType: "float", value: -0 },
    { present: true, nativeType: "float", value: Number.NaN },
    { present: true, nativeType: "float", value: 1001 },
    { present: true, nativeType: "float", value: 1, extra: true },
  ])("rejects malformed exact storage %#", (value) => {
    expect(readAreaCreatureChallengeRatingStorage(value)).toBeNull();
  });

  it("reads one changed immutable CAS pair and normalizes both members", () => {
    const mutation = readExistingAreaCreatureChallengeRatingMutation({
      expectedValue: 0.1,
      value: 1.1,
    });
    expect(mutation).toEqual({
      expectedValue: Math.fround(0.1),
      value: Math.fround(1.1),
    });
    expect(Object.isFrozen(mutation)).toBe(true);
  });

  it.each([
    null,
    [],
    { expectedValue: 0.5 },
    { expectedValue: 0.5, value: 1, extra: true },
    { expectedValue: -1, value: 1 },
    { expectedValue: 0.5, value: -0 },
    { expectedValue: 0.5, value: 1001 },
    { expectedValue: 0.5, value: 0.5 },
    { expectedValue: 0.1, value: Math.fround(0.1) },
  ])("rejects malformed or unchanged mutation %#", (value) => {
    expect(readExistingAreaCreatureChallengeRatingMutation(value)).toBeNull();
  });
});
