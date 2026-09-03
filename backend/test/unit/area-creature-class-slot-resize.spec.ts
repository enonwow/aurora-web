import {
  readExistingAreaCreatureClassSlotResizeMutation,
} from "../../src/modules/areas/domain/area-creature-class-slot-resize";

describe("Existing Area Creature tail-only class-slot resize", () => {
  const base = {
    expectedClassIds: [1, 9],
    expectedLevels: [3, 2],
    classListGraphSha256: "a".repeat(64),
    expectedStartingPackage: 4,
    startingPackage: 7,
    classesTableSha256: "b".repeat(64),
    classesRowCount: 12,
    packagesTableSha256: "c".repeat(64),
    packagesRowCount: 20,
  } as const;

  it("accepts a canonical admitted tail append", () => {
    const mutation = {
      ...base,
      classIds: [1, 9, 2],
      levels: [3, 2, 1],
      resizeMode: "append_tail",
      destructiveRemovedSlotsConfirmed: false,
    } as const;
    expect(readExistingAreaCreatureClassSlotResizeMutation(mutation)).toEqual(mutation);
  });

  it("accepts an explicitly confirmed exact tail truncation", () => {
    const mutation = {
      ...base,
      classIds: [1],
      levels: [3],
      resizeMode: "truncate_tail",
      destructiveRemovedSlotsConfirmed: true,
    } as const;
    expect(readExistingAreaCreatureClassSlotResizeMutation(mutation)).toEqual(mutation);
  });

  it.each([
    { classIds: [], levels: [], resizeMode: "truncate_tail", destructiveRemovedSlotsConfirmed: true },
    { classIds: [9], levels: [2], resizeMode: "truncate_tail", destructiveRemovedSlotsConfirmed: true },
    { classIds: [1, 2], levels: [3, 1], resizeMode: "append_tail", destructiveRemovedSlotsConfirmed: false },
    { classIds: [1, 9, 2], levels: [3, 4, 1], resizeMode: "append_tail", destructiveRemovedSlotsConfirmed: false },
    { classIds: [1, 9, 2], levels: [3, 2, 1], resizeMode: "truncate_tail", destructiveRemovedSlotsConfirmed: true },
    { classIds: [1], levels: [3], resizeMode: "truncate_tail", destructiveRemovedSlotsConfirmed: false },
    { classIds: [1, 9, 2], levels: [3, 2, 1], resizeMode: "append_tail", destructiveRemovedSlotsConfirmed: true },
    { classIds: [1, 9, 1], levels: [3, 2, 1], resizeMode: "append_tail", destructiveRemovedSlotsConfirmed: false },
  ])("rejects a non-tail or unsafe resize %#", (candidate) => {
    expect(readExistingAreaCreatureClassSlotResizeMutation({ ...base, ...candidate })).toBeNull();
  });
});
