import {
  normalizeCreatureChallengeRating,
  readCreatureChallengeRatingStorage,
} from "../../../../../src/modules/scene/domain/creatureChallengeRating";

describe("Creature ChallengeRating Float storage", () => {
  it("normalizes admitted decimal values once to binary32", () => {
    expect(normalizeCreatureChallengeRating(0)).toBe(0);
    expect(normalizeCreatureChallengeRating(0.1)).toBe(Math.fround(0.1));
    expect(normalizeCreatureChallengeRating(1_000)).toBe(1_000);
  });

  it.each([
    null,
    "1",
    Number.NaN,
    Number.POSITIVE_INFINITY,
    -1,
    -0,
    1_000.01,
  ])("rejects out-of-profile value %#", (value) => {
    expect(normalizeCreatureChallengeRating(value)).toBeNull();
  });

  it("reads exact immutable presence-sensitive storage", () => {
    expect(readCreatureChallengeRatingStorage({ present: false }))
      .toEqual({ present: false });
    const storage = readCreatureChallengeRatingStorage({
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
    undefined,
    {},
    { present: false, value: 1 },
    { present: true, nativeType: "dword", value: 1 },
    { present: true, nativeType: "float", value: -1 },
    { present: true, nativeType: "float", value: 1, extra: true },
  ])("rejects malformed storage %#", (value) => {
    expect(readCreatureChallengeRatingStorage(value)).toBeNull();
  });
});
