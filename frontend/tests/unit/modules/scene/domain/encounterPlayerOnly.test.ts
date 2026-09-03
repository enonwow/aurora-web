import {
  canEditExistingEncounterPlayerOnly,
  encounterPlayerOnlyPresentationFromStorage,
  encounterPlayerOnlyStorageFromPresentation,
  readEncounterPlayerOnlyStorage,
} from "../../../../../src/modules/scene/domain/encounterPlayerOnly";

const exactSource = {
  type: "aurora_git" as const,
  sourceKind: "encounter" as const,
  sourceIndex: 0,
  encounterPlayerOnlyStorage: { playerOnlyByte: 1 as const },
};

describe("retained Encounter PlayerOnly domain", () => {
  it.each([0, 1])("admits exact canonical byte %i", (playerOnlyByte) => {
    const result = readEncounterPlayerOnlyStorage({ playerOnlyByte });
    expect(result).toEqual({ playerOnlyByte });
    expect(Object.isFrozen(result)).toBe(true);
  });

  it.each([
    {},
    { playerOnlyByte: -1 },
    { playerOnlyByte: 2 },
    { playerOnlyByte: true },
    { playerOnlyByte: 1, extra: true },
  ])("rejects malformed storage %#", (candidate) => {
    expect(readEncounterPlayerOnlyStorage(candidate)).toBeNull();
  });

  it("maps the exact byte to and from checkbox presentation", () => {
    expect(encounterPlayerOnlyPresentationFromStorage({ playerOnlyByte: 1 }))
      .toEqual({ playerOnly: true });
    expect(encounterPlayerOnlyPresentationFromStorage({ playerOnlyByte: 0 }))
      .toEqual({ playerOnly: false });
    expect(encounterPlayerOnlyStorageFromPresentation({ playerOnly: true }))
      .toEqual({ playerOnlyByte: 1 });
    expect(encounterPlayerOnlyStorageFromPresentation({ playerOnly: false }))
      .toEqual({ playerOnlyByte: 0 });
  });

  it("activates only for exact retained Encounter provenance", () => {
    expect(canEditExistingEncounterPlayerOnly(exactSource)).toBe(true);
    expect(canEditExistingEncounterPlayerOnly({ ...exactSource, sourceKind: "trigger" }))
      .toBe(false);
    expect(canEditExistingEncounterPlayerOnly({ ...exactSource, sourceIndex: undefined }))
      .toBe(false);
    expect(canEditExistingEncounterPlayerOnly({
      ...exactSource,
      encounterPlayerOnlyStorage: { playerOnlyByte: 2 },
    })).toBe(false);
  });
});
