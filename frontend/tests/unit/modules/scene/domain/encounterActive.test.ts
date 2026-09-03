import {
  canEditExistingEncounterActive,
  encounterActivePresentationFromStorage,
  encounterActiveStorageFromPresentation,
  readEncounterActiveStorage,
} from "../../../../../src/modules/scene/domain/encounterActive";

const exactSource = {
  type: "aurora_git" as const,
  sourceKind: "encounter" as const,
  sourceIndex: 0,
  encounterActiveStorage: { activeByte: 1 as const },
};

describe("retained Encounter Active domain", () => {
  it.each([0, 1])("admits exact canonical byte %i", (activeByte) => {
    const result = readEncounterActiveStorage({ activeByte });
    expect(result).toEqual({ activeByte });
    expect(Object.isFrozen(result)).toBe(true);
  });

  it.each([
    {},
    { activeByte: -1 },
    { activeByte: 2 },
    { activeByte: true },
    { activeByte: 1, extra: true },
  ])("rejects malformed storage %#", (candidate) => {
    expect(readEncounterActiveStorage(candidate)).toBeNull();
  });

  it("maps the exact byte to and from checkbox presentation", () => {
    expect(encounterActivePresentationFromStorage({ activeByte: 1 }))
      .toEqual({ active: true });
    expect(encounterActivePresentationFromStorage({ activeByte: 0 }))
      .toEqual({ active: false });
    expect(encounterActiveStorageFromPresentation({ active: true }))
      .toEqual({ activeByte: 1 });
    expect(encounterActiveStorageFromPresentation({ active: false }))
      .toEqual({ activeByte: 0 });
  });

  it("activates only for exact retained Encounter provenance", () => {
    expect(canEditExistingEncounterActive(exactSource)).toBe(true);
    expect(canEditExistingEncounterActive({ ...exactSource, sourceKind: "trigger" }))
      .toBe(false);
    expect(canEditExistingEncounterActive({ ...exactSource, sourceIndex: undefined }))
      .toBe(false);
    expect(canEditExistingEncounterActive({
      ...exactSource,
      encounterActiveStorage: { activeByte: 2 },
    })).toBe(false);
  });
});
