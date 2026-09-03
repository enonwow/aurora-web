import {
  canEditExistingEncounterReset,
  encounterResetPresentationFromStorage,
  encounterResetStorageFromPresentation,
  readEncounterResetStorage,
} from "../../../../../src/modules/scene/domain/encounterReset";

const exactSource = {
  type: "aurora_git" as const,
  sourceKind: "encounter" as const,
  sourceIndex: 0,
  encounterResetStorage: { resetByte: 1 as const },
};

describe("retained Encounter Reset domain", () => {
  it.each([0, 1])("admits exact canonical byte %i", (resetByte) => {
    const result = readEncounterResetStorage({ resetByte });
    expect(result).toEqual({ resetByte });
    expect(Object.isFrozen(result)).toBe(true);
  });

  it.each([
    {},
    { resetByte: -1 },
    { resetByte: 2 },
    { resetByte: true },
    { resetByte: 1, extra: true },
  ])("rejects malformed storage %#", (candidate) => {
    expect(readEncounterResetStorage(candidate)).toBeNull();
  });

  it("maps the exact byte to and from checkbox presentation", () => {
    expect(encounterResetPresentationFromStorage({ resetByte: 1 }))
      .toEqual({ reset: true });
    expect(encounterResetPresentationFromStorage({ resetByte: 0 }))
      .toEqual({ reset: false });
    expect(encounterResetStorageFromPresentation({ reset: true }))
      .toEqual({ resetByte: 1 });
    expect(encounterResetStorageFromPresentation({ reset: false }))
      .toEqual({ resetByte: 0 });
  });

  it("activates only for exact retained Encounter provenance", () => {
    expect(canEditExistingEncounterReset(exactSource)).toBe(true);
    expect(canEditExistingEncounterReset({ ...exactSource, sourceKind: "trigger" }))
      .toBe(false);
    expect(canEditExistingEncounterReset({ ...exactSource, sourceIndex: undefined }))
      .toBe(false);
    expect(canEditExistingEncounterReset({
      ...exactSource,
      encounterResetStorage: { resetByte: 2 },
    })).toBe(false);
  });
});
