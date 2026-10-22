import {
  buildGffBuffer,
  type SupportedGffField,
} from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-uti-writer";
import {
  AreaExistingObjectDeletionPlanError,
  planExistingAreaObjectDeletions as planExistingAreaObjectDeletionsFromPair,
} from "../../src/modules/areas/adapters/outbound/blob/area-existing-object-deletion-planner";
import { parseAreaObjectsFromGitGff } from "../../src/modules/areas/adapters/outbound/blob/aurora-gff-area-parser";
import type { ProjectedAreaObjectEditing } from "../../src/modules/areas/domain/area-update-draft-projector";

const ROOT_TYPE = 0xffffffff;
const FAMILIES = [
  ["Creature List", 4], ["Door List", 8], ["Encounter List", 7],
  ["List", 0], ["Placeable List", 9], ["SoundList", 6],
  ["StoreList", 11], ["TriggerList", 1], ["WaypointList", 5],
] as const;

describe("existing Area object deletion planner", () => {
  it("derives exact family ordinals from retained aurora_git identities", () => {
    const plan = planExistingAreaObjectDeletions(sourceGit(), editing([
      retained("obj_cre_nw_guard", "creature", "creatures", "nw_guard", "NW_GUARD", 1, 2),
    ]));

    expect(plan.deletions).toEqual([{ kind: "item", sourceIndex: 0 }]);
    expect(plan.transforms).toEqual([]);
    expect(plan.sourceObjectCount).toBe(2);
    expect(plan.retainedObjectCount).toBe(1);
  });

  it("plans the complete transform of one retained native creature ordinal", () => {
    const moved = {
      ...retained("obj_cre_nw_guard", "creature", "creatures", "nw_guard", "NW_GUARD", 6.147, 2.718),
      z: 0.025,
      bearing: Math.PI * 1.5,
    };

    const plan = planExistingAreaObjectDeletions(sourceGit(), editing([moved]));

    expect(plan.deletions).toEqual([{ kind: "item", sourceIndex: 0 }]);
    expect(plan.transforms).toEqual([{
      kind: "creature",
      sourceIndex: 0,
      x: 6.147,
      y: 2.718,
      z: 0.025,
      bearing: Math.PI * 1.5,
    }]);
  });

  it.each([
    ["unknown identity", [retained("obj_cre_missing", "creature", "creatures", "nw_guard", "NW_GUARD", 1, 2)]],
    ["wrong family", [retained("obj_cre_nw_guard", "item", "items", "nw_guard", "NW_GUARD", 1, 2)]],
    ["retagged survivor", [retained("obj_cre_nw_guard", "creature", "creatures", "nw_guard", "CHANGED", 1, 2)]],
    ["changed resref", [retained("obj_cre_nw_guard", "creature", "creatures", "changed", "NW_GUARD", 1, 2)]],
  ])("fails closed for %s", (_label, retainedObjects) => {
    expect(() => planExistingAreaObjectDeletions(
      sourceGit(),
      editing(retainedObjects as ProjectedAreaObjectEditing["retainedObjects"]),
    )).toThrow(AreaExistingObjectDeletionPlanError);
  });

  it("reports the immutable family ordinal when ordinal-first retained resolution fails", () => {
    const unknownOrdinal = {
      ...retained("diagnostic_only", "placeable", "placeables", "plc_chest", "CHEST", 4, 5),
      sourceIndex: 99,
    };
    expect(planError(sourceGit({ includePlaceable: true }), [unknownOrdinal]).details)
      .toEqual(["diagnostic_only", "ordinal=99"]);
  });

  it("plans the audited ground-item position and orientation-vector transform", () => {
    const movedItem = {
      ...retained(
        "obj_itm_nw_sword",
        "item",
        "items",
        "nw_sword",
        "NW_SWORD",
        3.5,
        4,
      ),
      z: 0.2,
      bearing: Math.PI / 3,
    };

    const plan = planExistingAreaObjectDeletions(sourceGit(), editing([
      retained("obj_cre_nw_guard", "creature", "creatures", "nw_guard", "NW_GUARD", 1, 2),
      movedItem,
    ]));

    expect(plan.transforms).toEqual([{
      kind: "item",
      sourceIndex: 0,
      x: 3.5,
      y: 4,
      z: 0.2,
      bearing: Math.PI / 3,
    }]);
    expect(plan.deletions).toEqual([]);
  });

  it("fails closed when a retained door transform has no admitted movement authority", () => {
    const movedDoor = {
      ...retained(
        "obj_dr_door",
        "door",
        "doors",
        "nw_door",
        "DOOR",
        4.5,
        5,
      ),
      bearing: 0,
    };

    expect(planError(sourceGit({ includeDoor: true }), [movedDoor])).toMatchObject({
      code: "AREA_UPDATE_OBJECT_MUTATION_INVALID",
      message: "Existing object transform is not admitted for this family.",
      details: ["obj_dr_door", "kind=door", "x expected=4 actual=4.5"],
    });
  });

  it("plans the audited position-only transform for one retained sound", () => {
    const movedSound = {
      ...retained(
        "obj_snd_animalcriesday",
        "sound",
        "sounds",
        "animalcriesday",
        "AnimalCriesDay",
        4.5,
        5.5,
      ),
      z: 0.25,
      bearing: 0,
    };

    const plan = planExistingAreaObjectDeletions(
      sourceGit({ includeSound: true }),
      editing([movedSound]),
    );

    expect(plan.transforms).toEqual([{
      kind: "sound",
      sourceIndex: 0,
      x: 4.5,
      y: 5.5,
      z: 0.25,
    }]);
  });

  it("rejects a sound bearing delta that SoundList cannot persist", () => {
    const rotatedSound = {
      ...retained(
        "obj_snd_animalcriesday",
        "sound",
        "sounds",
        "animalcriesday",
        "AnimalCriesDay",
        4,
        5,
      ),
      bearing: Math.PI / 2,
    };

    expect(planError(sourceGit({ includeSound: true }), [rotatedSound])).toMatchObject({
      code: "AREA_UPDATE_OBJECT_MUTATION_INVALID",
      message: "Existing sound bearing cannot be materialized because SoundList has no native orientation fields.",
      details: [
        "obj_snd_animalcriesday",
        `bearing expected=0 actual=${Math.PI / 2}`,
      ],
    });
  });

  it("plans one provenance-bound retained Sound interval/variation mutation", () => {
    const sound = {
      ...retained(
      "obj_snd_animalcriesday",
      "sound",
      "sounds",
      "animalcriesday",
      "AnimalCriesDay",
      4,
      5,
      ),
      bearing: 0,
    };
    const mutation = {
      kind: "sound" as const,
      sourceObjectId: "obj_snd_animalcriesday",
      sourceIndex: 0,
      expectedValue: {
        intervalMilliseconds: 25_000,
        intervalVariationMilliseconds: 5_000,
        pitchVariationHundredths: 20,
        volumeVariationByte: 64,
      },
      value: {
        intervalMilliseconds: 12_340,
        intervalVariationMilliseconds: 1_230,
        pitchVariationHundredths: 35,
        volumeVariationByte: 127,
      },
    };
    const plan = planExistingAreaObjectDeletions(
      sourceGit({ includeSound: true }),
      editing([sound], [], [], [], [mutation]),
    );
    expect(plan.soundIntervalVariationMutations).toEqual([mutation]);
  });

  it("rejects stale retained Sound interval/variation provenance before the writer", () => {
    const sound = {
      ...retained(
      "obj_snd_animalcriesday",
      "sound",
      "sounds",
      "animalcriesday",
      "AnimalCriesDay",
      4,
      5,
      ),
      bearing: 0,
    };
    expect(() => planExistingAreaObjectDeletions(
      sourceGit({ includeSound: true }),
      editing([sound], [], [], [], [{
        kind: "sound",
        sourceObjectId: "obj_snd_animalcriesday",
        sourceIndex: 0,
        expectedValue: {
          intervalMilliseconds: 24_000,
          intervalVariationMilliseconds: 5_000,
          pitchVariationHundredths: 20,
          volumeVariationByte: 64,
        },
        value: {
          intervalMilliseconds: 12_340,
          intervalVariationMilliseconds: 1_230,
          pitchVariationHundredths: 35,
          volumeVariationByte: 127,
        },
      }]),
    )).toThrow(expect.objectContaining({
      message: "Sound interval/variation expected value differs from exact source GIT provenance.",
    }));
  });

  it("plans one provenance-bound retained Sound base-volume mutation", () => {
    const sound = {
      ...retained(
        "obj_snd_animalcriesday", "sound", "sounds", "animalcriesday",
        "AnimalCriesDay", 4, 5,
      ),
      bearing: 0,
    };
    const mutation = {
      kind: "sound" as const,
      sourceObjectId: "obj_snd_animalcriesday",
      sourceIndex: 0,
      expectedValue: { volumeByte: 64 },
      value: { volumeByte: 127 },
    };
    const plan = planExistingAreaObjectDeletions(
      sourceGit({ includeSound: true }),
      editing([sound], [], [], [], [], [mutation]),
    );
    expect(plan.soundVolumeMutations).toEqual([mutation]);
  });

  it("rejects stale retained Sound base-volume provenance before the writer", () => {
    const sound = {
      ...retained(
        "obj_snd_animalcriesday", "sound", "sounds", "animalcriesday",
        "AnimalCriesDay", 4, 5,
      ),
      bearing: 0,
    };
    expect(() => planExistingAreaObjectDeletions(
      sourceGit({ includeSound: true }),
      editing([sound], [], [], [], [], [{
        kind: "sound", sourceObjectId: "obj_snd_animalcriesday", sourceIndex: 0,
        expectedValue: { volumeByte: 63 }, value: { volumeByte: 127 },
      }]),
    )).toThrow(expect.objectContaining({
      code: "AREA_UPDATE_OBJECT_MUTATION_INVALID",
    }));
  });

  it("plans one provenance-bound retained Sound Hours/Times schedule mutation", () => {
    const sound = {
      ...retained(
        "obj_snd_animalcriesday", "sound", "sounds", "animalcriesday",
        "AnimalCriesDay", 4, 5,
      ),
      bearing: 0,
    };
    const mutation = {
      kind: "sound" as const,
      sourceObjectId: "obj_snd_animalcriesday",
      sourceIndex: 0,
      expectedValue: { hoursMask: 0, timesByte: 3 },
      value: { hoursMask: 0x800001, timesByte: 0 },
    };
    const plan = planExistingAreaObjectDeletions(
      sourceGit({ includeSound: true }),
      editing([sound], [], [], [], [], [], [mutation]),
    );
    expect(plan.soundScheduleMutations).toEqual([mutation]);
  });

  it.each([
    ["Hours", { hoursMask: 1, timesByte: 3 }],
    ["Times", { hoursMask: 0, timesByte: 2 }],
  ])("rejects stale retained Sound %s schedule provenance before the writer", (_label, expectedValue) => {
    const sound = {
      ...retained(
        "obj_snd_animalcriesday", "sound", "sounds", "animalcriesday",
        "AnimalCriesDay", 4, 5,
      ),
      bearing: 0,
    };
    expect(() => planExistingAreaObjectDeletions(
      sourceGit({ includeSound: true }),
      editing([sound], [], [], [], [], [], [{
        kind: "sound", sourceObjectId: "obj_snd_animalcriesday", sourceIndex: 0,
        expectedValue, value: { hoursMask: 0x800001, timesByte: 0 },
      }]),
    )).toThrow(expect.objectContaining({
      message: "Sound schedule expected value differs from exact source GIT provenance.",
    }));
  });

  it("plans one provenance-bound retained Sound Active mutation", () => {
    const sound = {
      ...retained(
        "obj_snd_animalcriesday", "sound", "sounds", "animalcriesday",
        "AnimalCriesDay", 4, 5,
      ),
      bearing: 0,
    };
    const mutation = {
      kind: "sound" as const, sourceObjectId: "obj_snd_animalcriesday", sourceIndex: 0,
      expectedValue: { activeByte: 1 as const }, value: { activeByte: 0 as const },
    };
    const plan = planExistingAreaObjectDeletions(
      sourceGit({ includeSound: true }),
      editing([sound], [], [], [], [], [], [], [mutation]),
    );
    expect(plan.soundActiveMutations).toEqual([mutation]);
  });

  it("plans one provenance-bound retained Sound Play Order mutation", () => {
    const sound = {
      ...retained(
        "obj_snd_animalcriesday", "sound", "sounds", "animalcriesday",
        "AnimalCriesDay", 4, 5,
      ),
      bearing: 0,
    };
    const mutation = {
      kind: "sound" as const, sourceObjectId: "obj_snd_animalcriesday", sourceIndex: 0,
      expectedValue: { randomByte: 0 as const }, value: { randomByte: 1 as const },
    };
    const plan = planExistingAreaObjectDeletions(
      sourceGit({ includeSound: true }),
      editing([sound], [], [], [], [], [], [], [], [mutation]),
    );
    expect(plan.soundPlayOrderMutations).toEqual([mutation]);
  });

  it("independently replans one complete retained Sound Play Style CAS", () => {
    const sound = {
      ...retained(
        "obj_snd_animalcriesday", "sound", "sounds", "animalcriesday",
        "AnimalCriesDay", 4, 5,
      ),
      bearing: 0,
    };
    const mutation = {
      kind: "sound" as const, sourceObjectId: "obj_snd_animalcriesday", sourceIndex: 0,
      expectedValue: {
        loopingByte: 0 as const, continuousByte: 1 as const, priorityByte: 20 as const,
        positionalByte: 1 as const, soundsCount: 4, intervalDword: 25_000,
        intervalVariationDword: 5_000,
      },
      value: {
        loopingByte: 1 as const, continuousByte: 0 as const, priorityByte: 3 as const,
        positionalByte: 1 as const, soundsCount: 4, intervalDword: 25_000,
        intervalVariationDword: 5_000,
      },
    };
    const input = editing([sound]) as any;
    input.soundPlayStyleMutations = [mutation];
    const plan = planExistingAreaObjectDeletions(sourceGit({ includeSound: true }), input) as any;
    expect(plan.soundPlayStyleMutations).toEqual([mutation]);
  });

  it("independently replans one complete retained Sound playback-list CAS", () => {
    const sound = {
      ...retained(
        "obj_snd_animalcriesday", "sound", "sounds", "animalcriesday",
        "AnimalCriesDay", 4, 5,
      ),
      bearing: 0,
    };
    const mutation = {
      kind: "sound" as const,
      sourceObjectId: "obj_snd_animalcriesday",
      sourceIndex: 0,
      expectedValue: {
        sounds: ["snd_a", "snd_b", "snd_c", "snd_d"],
        loopingByte: 0 as const, continuousByte: 1 as const, priorityByte: 20 as const,
        positionalByte: 1 as const, intervalDword: 25_000,
        intervalVariationDword: 5_000,
      },
      value: {
        sounds: ["snd_d", "snd_d", "snd_a"],
        loopingByte: 1 as const, continuousByte: 0 as const, priorityByte: 3 as const,
        positionalByte: 1 as const, intervalDword: 25_000,
        intervalVariationDword: 5_000,
      },
    };
    const input = editing([sound]) as any;
    input.soundPlaybackMutations = [mutation];
    const plan = planExistingAreaObjectDeletions(sourceGit({ includeSound: true }), input) as any;
    expect(plan.soundPlaybackMutations).toEqual([mutation]);
  });

  it("rejects stale retained Sound playback-list provenance before the writer", () => {
    const sound = {
      ...retained(
        "obj_snd_animalcriesday", "sound", "sounds", "animalcriesday",
        "AnimalCriesDay", 4, 5,
      ),
      bearing: 0,
    };
    const input = editing([sound]) as any;
    input.soundPlaybackMutations = [{
      kind: "sound", sourceObjectId: "obj_snd_animalcriesday", sourceIndex: 0,
      expectedValue: {
        sounds: ["stale_sound"],
        loopingByte: 0, continuousByte: 1, priorityByte: 20, positionalByte: 1,
        intervalDword: 25_000, intervalVariationDword: 5_000,
      },
      value: {
        sounds: ["snd_a"],
        loopingByte: 0, continuousByte: 1, priorityByte: 20, positionalByte: 1,
        intervalDword: 25_000, intervalVariationDword: 5_000,
      },
    }];
    expect(() => planExistingAreaObjectDeletions(
      sourceGit({ includeSound: true }),
      input,
    )).toThrow(expect.objectContaining({
      message: "Sound playback expected value differs from exact source GIT provenance.",
    }));
  });

  it("independently replans one complete retained Sound playback and spatial profile CAS", () => {
    const sound = {
      ...retained(
        "obj_snd_animalcriesday", "sound", "sounds", "animalcriesday",
        "AnimalCriesDay", 4, 5,
      ),
      bearing: 0,
    };
    const mutation = {
      kind: "sound" as const,
      sourceObjectId: "obj_snd_animalcriesday",
      sourceIndex: 0,
      expectedValue: {
        sounds: ["snd_a", "snd_b", "snd_c", "snd_d"],
        loopingByte: 0 as const, continuousByte: 1 as const, priorityByte: 20 as const,
        positionalByte: 1 as const, randomPositionByte: 0 as const,
        elevationFloat32: 0, maxDistanceFloat32: 14, minDistanceFloat32: 2,
        randomRangeXFloat32: 0, randomRangeYFloat32: 0,
        intervalDword: 25_000, intervalVariationDword: 5_000,
      },
      value: {
        sounds: ["snd_d", "snd_d", "snd_a"],
        loopingByte: 1 as const, continuousByte: 0 as const, priorityByte: 3 as const,
        positionalByte: 1 as const, randomPositionByte: 1 as const,
        elevationFloat32: 1.25, maxDistanceFloat32: 20, minDistanceFloat32: 4,
        randomRangeXFloat32: 8, randomRangeYFloat32: 9,
        intervalDword: 25_000, intervalVariationDword: 5_000,
      },
    };
    const input = editing([sound]) as any;
    input.soundProfileMutations = [mutation];
    const plan = planExistingAreaObjectDeletions(sourceGit({ includeSound: true }), input) as any;
    expect(plan.soundProfileMutations).toEqual([mutation]);
  });

  it("rejects a Sound profile mutation coexisting with legacy playback on one ordinal", () => {
    const sound = {
      ...retained(
        "obj_snd_animalcriesday", "sound", "sounds", "animalcriesday",
        "AnimalCriesDay", 4, 5,
      ),
      bearing: 0,
    };
    const input = editing([sound]) as any;
    input.soundProfileMutations = [{
      kind: "sound", sourceObjectId: "obj_snd_animalcriesday", sourceIndex: 0,
      expectedValue: {
        sounds: ["snd_a", "snd_b", "snd_c", "snd_d"],
        loopingByte: 0, continuousByte: 1, priorityByte: 20,
        positionalByte: 1, randomPositionByte: 0,
        elevationFloat32: 0, maxDistanceFloat32: 14, minDistanceFloat32: 2,
        randomRangeXFloat32: 0, randomRangeYFloat32: 0,
        intervalDword: 25_000, intervalVariationDword: 5_000,
      },
      value: {
        sounds: ["snd_a"], loopingByte: 1, continuousByte: 0, priorityByte: 3,
        positionalByte: 1, randomPositionByte: 0,
        elevationFloat32: 0, maxDistanceFloat32: 20, minDistanceFloat32: 2,
        randomRangeXFloat32: 0, randomRangeYFloat32: 0,
        intervalDword: 25_000, intervalVariationDword: 5_000,
      },
    }];
    input.soundPlaybackMutations = [{
      kind: "sound", sourceObjectId: "obj_snd_animalcriesday", sourceIndex: 0,
      expectedValue: {
        sounds: ["snd_a", "snd_b", "snd_c", "snd_d"],
        loopingByte: 0, continuousByte: 1, priorityByte: 20, positionalByte: 1,
        intervalDword: 25_000, intervalVariationDword: 5_000,
      },
      value: {
        sounds: ["snd_a"], loopingByte: 1, continuousByte: 0, priorityByte: 3,
        positionalByte: 1, intervalDword: 25_000, intervalVariationDword: 5_000,
      },
    }];
    expect(() => planExistingAreaObjectDeletions(
      sourceGit({ includeSound: true }),
      input,
    )).toThrow(expect.objectContaining({
      message: "A Sound profile mutation cannot coexist with a playback or legacy Play Style mutation.",
    }));
  });

  it("rejects stale retained Sound Play Order provenance before the writer", () => {
    const sound = {
      ...retained(
        "obj_snd_animalcriesday", "sound", "sounds", "animalcriesday",
        "AnimalCriesDay", 4, 5,
      ),
      bearing: 0,
    };
    expect(() => planExistingAreaObjectDeletions(
      sourceGit({ includeSound: true }),
      editing([sound], [], [], [], [], [], [], [], [{
        kind: "sound", sourceObjectId: "obj_snd_animalcriesday", sourceIndex: 0,
        expectedValue: { randomByte: 1 }, value: { randomByte: 0 },
      }]),
    )).toThrow(expect.objectContaining({
      message: "Sound Play Order expected value differs from exact source GIT provenance.",
    }));
  });

  it("rejects stale retained Sound Active provenance before the writer", () => {
    const sound = {
      ...retained(
        "obj_snd_animalcriesday", "sound", "sounds", "animalcriesday",
        "AnimalCriesDay", 4, 5,
      ),
      bearing: 0,
    };
    expect(() => planExistingAreaObjectDeletions(
      sourceGit({ includeSound: true }),
      editing([sound], [], [], [], [], [], [], [{
        kind: "sound", sourceObjectId: "obj_snd_animalcriesday", sourceIndex: 0,
        expectedValue: { activeByte: 0 }, value: { activeByte: 1 },
      }]),
    )).toThrow(expect.objectContaining({
      message: "Sound Active expected value differs from exact source GIT provenance.",
    }));
  });

  it("rejects a payload that repeats one retained identity", () => {
    const creature = retained("obj_cre_nw_guard", "creature", "creatures", "nw_guard", "NW_GUARD", 1, 2);
    expect(planError(sourceGit(), [creature, creature])).toMatchObject({
      code: "AREA_UPDATE_OBJECT_MUTATION_INVALID",
      message: "One source object identity is retained more than once.",
      details: ["obj_cre_nw_guard"],
    });
  });

  it("returns bounded exact diagnostics for unknown identity and wrong family", () => {
    expect(planError(sourceGit(), [
      retained("obj_cre_missing", "creature", "creatures", "nw_guard", "NW_GUARD", 1, 2),
    ])).toMatchObject({
      name: "AreaExistingObjectDeletionPlanError",
      code: "AREA_UPDATE_OBJECT_MUTATION_INVALID",
      message: "A retained object does not exist in the exact source GIT.",
      details: ["obj_cre_missing"],
    });
    expect(planError(sourceGit(), [
      retained("obj_cre_nw_guard", "item", "items", "nw_guard", "NW_GUARD", 1, 2),
    ])).toMatchObject({
      message: "A retained object identifies another GIT family.",
      details: ["obj_cre_nw_guard", "expected=creature", "actual=item"],
    });
  });

  it("reports exact immutable identity changes without misclassifying an admitted transform", () => {
    const changed = {
      ...retained("obj_cre_nw_guard", "creature", "creatures", "changed", "CHANGED", 1.5, 2.5),
      z: 0.5,
      bearing: 0,
    };
    expect(planError(sourceGit(), [changed])).toMatchObject({
      message: "Existing-object deletion cannot silently persist other object mutations.",
      details: [
        "obj_cre_nw_guard",
        "resRef expected=nw_guard actual=changed",
        "tag expected=NW_GUARD actual=CHANGED",
      ],
    });
  });

  it("accepts source records with absent optional resref or tag without inventing a comparison", () => {
    const noResRef = sourceGit({ creatureResRef: undefined });
    expect(planExistingAreaObjectDeletions(noResRef, editing([
      retained("obj_cre_nw_guard", "creature", "creatures", "fallback", "NW_GUARD", 1, 2),
    ])).retainedObjectCount).toBe(1);

    const noTag = sourceGit({ creatureTag: undefined });
    expect(planExistingAreaObjectDeletions(noTag, editing([
      retained("obj_cre_nw_guard", "creature", "creatures", "nw_guard", "FALLBACK", 1, 2),
    ])).retainedObjectCount).toBe(1);
  });

  it("compares a present native Creature Tag verbatim without trimming", () => {
    expect(planExistingAreaObjectDeletions(
      sourceGit({ creatureTag: "  NW_GUARD  " }),
      editing([retained(
        "obj_cre_nw_guard",
        "creature",
        "creatures",
        "nw_guard",
        "  NW_GUARD  ",
        1,
        2,
      )]),
    ).retainedObjectCount).toBe(1);

    expect(planError(
      sourceGit({ creatureTag: "  NW_GUARD  " }),
      [retained("obj_cre_nw_guard", "creature", "creatures", "nw_guard", "NW_GUARD", 1, 2)],
    )).toMatchObject({
      message: "Existing-object deletion cannot silently persist other object mutations.",
      details: [
        "obj_cre_nw_guard",
        "tag expected=  NW_GUARD   actual=NW_GUARD",
      ],
    });
  });

  it("admits the exact numeric comparison tolerance boundary", () => {
    expect(planExistingAreaObjectDeletions(
      sourceGit({ creatureX: 0 }),
      editing([retained("obj_cre_nw_guard", "creature", "creatures", "nw_guard", "NW_GUARD", 1e-6, 2)]),
    ).retainedObjectCount).toBe(1);
  });

  it("does not invent a transform from native float32 position precision", () => {
    const plan = planExistingAreaObjectDeletions(
      sourceGit({ creatureX: 60.9686 }),
      editing([retained(
        "obj_cre_nw_guard",
        "creature",
        "creatures",
        "nw_guard",
        "NW_GUARD",
        6.09686,
        2,
      )]),
    );
    expect(plan.transforms).toEqual([]);
  });

  it("treats full-turn-equivalent bearings as unchanged", () => {
    const unchanged = {
      ...retained("obj_cre_nw_guard", "creature", "creatures", "nw_guard", "NW_GUARD", 1, 2),
      bearing: Math.PI / 2 + Math.PI * 2,
    };
    expect(planExistingAreaObjectDeletions(sourceGit(), editing([unchanged])).transforms)
      .toEqual([]);
  });

  it("plans a bearing-only creature transform", () => {
    const rotated = {
      ...retained("obj_cre_nw_guard", "creature", "creatures", "nw_guard", "NW_GUARD", 1, 2),
      bearing: -Math.PI / 3,
    };
    expect(planExistingAreaObjectDeletions(sourceGit(), editing([rotated])).transforms)
      .toEqual([{
        kind: "creature",
        sourceIndex: 0,
        x: 1,
        y: 2,
        z: 0,
        bearing: -Math.PI / 3,
      }]);
  });

  it("plans the audited X/Y/Z/Bearing transform for one retained placeable", () => {
    const source = sourceGit({ includePlaceable: true });
    const creature = retained(
      "obj_cre_nw_guard",
      "creature",
      "creatures",
      "nw_guard",
      "NW_GUARD",
      1,
      2,
    );
    const movedPlaceable = {
      ...retained(
        "obj_plc_chest",
        "placeable",
        "placeables",
        "plc_chest",
        "CHEST",
        4.5,
        5.5,
      ),
      z: 0.25,
      bearing: Math.PI / 4,
    };

    const plan = planExistingAreaObjectDeletions(source, editing([creature, movedPlaceable]));

    expect(plan.transforms).toEqual([{
      kind: "placeable",
      sourceIndex: 0,
      x: 4.5,
      y: 5.5,
      z: 0.25,
      bearing: Math.PI / 4,
    }]);
    expect(plan.deletions).toEqual([{ kind: "item", sourceIndex: 0 }]);
  });

  it("resolves a provenance-bound placeable OnUsed mutation to the immutable family ordinal", () => {
    const source = sourceGit({ includePlaceable: true });
    const plan = planExistingAreaObjectDeletions(source, editing(
      [
        retained("obj_cre_nw_guard", "creature", "creatures", "nw_guard", "NW_GUARD", 1, 2),
        retained("obj_plc_chest", "placeable", "placeables", "plc_chest", "CHEST", 4, 5),
      ],
      [{
        kind: "placeable",
        sourceObjectId: "obj_plc_chest",
        expectedOnUsed: "",
        onUsed: "s04_plcprobe",
      }],
    ));

    expect(plan.propertyMutations).toEqual([{
      kind: "placeable",
      sourceIndex: 0,
      expectedOnUsed: "",
      onUsed: "s04_plcprobe",
    }]);
  });

  it("resolves a provenance-bound Door transition trio to the immutable family ordinal", () => {
    const door = {
      ...retained("obj_dr_door", "door", "doors", "nw_door", "DOOR", 4, 5),
      sourceIndex: 0,
      bearing: 0,
    };
    const plan = planExistingAreaObjectDeletions(
      sourceGit({ includeDoor: true }),
      editing([door], [], [{
        kind: "door",
        sourceObjectId: "obj_dr_door",
        sourceIndex: 0,
        transition: {
          expectedValue: { linkedTo: "OLD_DEST", linkedToFlags: 1, loadScreenId: 0 },
          value: { linkedTo: "NEW_DEST", linkedToFlags: 2, loadScreenId: 7 },
        },
      }]),
    );

    expect(plan.doorTransitionMutations).toEqual([{
      kind: "door",
      sourceIndex: 0,
      transition: {
        expectedValue: { linkedTo: "OLD_DEST", linkedToFlags: 1, loadScreenId: 0 },
        value: { linkedTo: "NEW_DEST", linkedToFlags: 2, loadScreenId: 7 },
      },
    }]);
  });

  it("rejects a Door transition mutation whose complete expected trio is stale", () => {
    const door = {
      ...retained("obj_dr_door", "door", "doors", "nw_door", "DOOR", 4, 5),
      sourceIndex: 0,
      bearing: 0,
    };

    expect(() => planExistingAreaObjectDeletions(
      sourceGit({ includeDoor: true }),
      editing([door], [], [{
        kind: "door",
        sourceObjectId: "obj_dr_door",
        sourceIndex: 0,
        transition: {
          expectedValue: { linkedTo: "STALE_DEST", linkedToFlags: 1, loadScreenId: 0 },
          value: { linkedTo: "NEW_DEST", linkedToFlags: 2, loadScreenId: 7 },
        },
      }]),
    )).toThrow(expect.objectContaining({
      message: "Door transition expected value differs from exact source GIT provenance.",
      details: ["obj_dr_door", "ordinal=0"],
    }));
  });

  it("rejects a Door transition mutation when its exact ordinal is not retained", () => {
    expect(() => planExistingAreaObjectDeletions(
      sourceGit({ includeDoor: true }),
      editing([], [], [{
        kind: "door",
        sourceObjectId: "obj_dr_door",
        sourceIndex: 0,
        transition: {
          expectedValue: { linkedTo: "OLD_DEST", linkedToFlags: 1, loadScreenId: 0 },
          value: { linkedTo: "NEW_DEST", linkedToFlags: 2, loadScreenId: 7 },
        },
      }]),
    )).toThrow(expect.objectContaining({
      message: "A Door transition mutation target is not retained in the editable scene.",
      details: ["obj_dr_door"],
    }));
  });

  it("resolves combined placeable script and boolean property mutations to one immutable ordinal", () => {
    const source = sourceGit({ includePlaceable: true });
    const plan = planExistingAreaObjectDeletions(source, editing(
      [
        retained("obj_cre_nw_guard", "creature", "creatures", "nw_guard", "NW_GUARD", 1, 2),
        retained("obj_plc_chest", "placeable", "placeables", "plc_chest", "CHEST", 4, 5),
      ],
      [{
        kind: "placeable",
        sourceObjectId: "obj_plc_chest",
        expectedOnUsed: "",
        onUsed: "s04_plcprobe",
        expectedStatic: true,
        static: false,
        expectedUseable: false,
        useable: true,
        expectedPlot: false,
        plot: true,
        expectedHasInventory: false,
        hasInventory: true,
      }],
    ));

    expect(plan.propertyMutations).toEqual([{
      kind: "placeable",
      sourceIndex: 0,
      expectedOnUsed: "",
      onUsed: "s04_plcprobe",
      expectedStatic: true,
      static: false,
      expectedUseable: false,
      useable: true,
      expectedPlot: false,
      plot: true,
      expectedHasInventory: false,
      hasInventory: true,
    }]);
  });

  it("resolves an exact Placeable inventory replacement against parsed native provenance", () => {
    const source = sourceGit({
      includePlaceable: true,
      placeableInventory: [
        { resRef: "nw_it_mpotion001", x: 0, y: 0 },
        { resRef: "nw_sword", x: 1, y: 0 },
      ],
    });
    const expectedEntries = [
      { sourceIndex: 0, resRef: "nw_it_mpotion001", x: 0, y: 0 },
      { sourceIndex: 1, resRef: "nw_sword", x: 1, y: 0 },
    ];
    const entries = [
      { sourceIndex: 1, resRef: "nw_sword", x: 4, y: 5 },
      {
        resRef: "nw_cloth022",
        itemResRef: "nw_cloth022",
        itemSourceObjectKey: "nwn-base-key-uti-nw-cloth022-v1",
        itemSourceFingerprint: "606788a4d7e44de76e4c3f38ce4b2b7bae06d64721140995efa011066b5279a6",
        x: 6,
        y: 7,
      },
    ];

    const plan = planExistingAreaObjectDeletions(source, editing(
      [
        retained("obj_cre_nw_guard", "creature", "creatures", "nw_guard", "NW_GUARD", 1, 2),
        retained("obj_plc_chest", "placeable", "placeables", "plc_chest", "CHEST", 4, 5),
      ],
      [{
        kind: "placeable",
        sourceObjectId: "obj_plc_chest",
        inventory: { expectedEntries, entries },
      }],
    ));

    expect(plan.propertyMutations).toEqual([{
      kind: "placeable",
      sourceIndex: 0,
      inventory: { expectedEntries, entries },
    }]);
    expect(Object.isFrozen((plan.propertyMutations[0] as any).inventory)).toBe(true);
    expect(Object.isFrozen((plan.propertyMutations[0] as any).inventory.entries)).toBe(true);
  });

  it("resolves an exact Creature inventory replacement against mode-0 native provenance", () => {
    const source = sourceGit({
      creatureInventory: [{
        resRef: "nw_sword",
        x: 1,
        y: 0,
        dropable: true,
        pickpocketable: false,
      }],
    });
    const expectedEntries = [{
      sourceIndex: 0,
      resRef: "nw_sword",
      x: 1,
      y: 0,
      dropable: true,
      pickpocketable: false,
    }];
    const entries = [{
      ...expectedEntries[0],
      x: 4,
      y: 5,
      dropable: false,
      pickpocketable: true,
    }];
    const creature = {
      ...retained(
        "obj_cre_nw_guard",
        "creature",
        "creatures",
        "nw_guard",
        "NW_GUARD",
        1,
        2,
      ),
      sourceIndex: 0,
    };

    const plan = planExistingAreaObjectDeletions(source, editing(
      [creature],
      [{
        kind: "creature",
        sourceObjectId: "obj_cre_nw_guard",
        sourceIndex: 0,
        inventory: { expectedEntries, entries },
      }],
    ));

    expect(plan.propertyMutations).toEqual([{
      kind: "creature",
      sourceIndex: 0,
      inventory: { expectedEntries, entries },
    }]);
    expect(Object.isFrozen((plan.propertyMutations[0] as any).inventory)).toBe(true);
    expect(Object.isFrozen((plan.propertyMutations[0] as any).inventory.entries)).toBe(true);
  });

  it("resolves an exact Creature Tag mutation by immutable family ordinal", () => {
    const source = sourceGit({ creatureTag: "  NW_GUARD  " });
    const creature = {
      ...retained(
        "obj_cre_display_identity",
        "creature",
        "creatures",
        "nw_guard",
        "",
        1,
        2,
      ),
      sourceIndex: 0,
    };

    const plan = planExistingAreaObjectDeletions(source, editing([creature], [{
      kind: "creature",
      sourceObjectId: "obj_cre_display_identity",
      sourceIndex: 0,
      tag: { expectedValue: "  NW_GUARD  ", value: "" },
    }]));

    expect(plan.propertyMutations).toEqual([{
      kind: "creature",
      sourceIndex: 0,
      tag: { expectedValue: "  NW_GUARD  ", value: "" },
    }]);
    expect(Object.isFrozen((plan.propertyMutations[0] as any).tag)).toBe(true);
  });

  it("resolves one exact Creature Conversation mutation by immutable family ordinal", () => {
    const source = sourceGit({
      creatureConversationFields: [{
        label: "Conversation",
        type: "resref",
        value: "Guard_Dialog",
      }],
    });
    const creature = {
      ...retained(
        "obj_cre_display_identity",
        "creature",
        "creatures",
        "nw_guard",
        "NW_GUARD",
        1,
        2,
      ),
      sourceIndex: 0,
    };

    const plan = planExistingAreaObjectDeletions(source, editing([creature], [{
      kind: "creature",
      sourceObjectId: "obj_cre_display_identity",
      sourceIndex: 0,
      conversation: { expectedResRef: "Guard_Dialog", resRef: "guard_dialog" },
    }]));

    expect(plan.propertyMutations).toEqual([{
      kind: "creature",
      sourceIndex: 0,
      conversation: { expectedResRef: "Guard_Dialog", resRef: "guard_dialog" },
    }]);
    expect(Object.isFrozen((plan.propertyMutations[0] as any).conversation)).toBe(true);
  });

  it("resolves one exact Creature Interruptable Byte mutation by immutable family ordinal", () => {
    const source = sourceGit({
      creatureInterruptableFields: [{
        label: "Interruptable",
        type: "byte",
        value: 1,
      }],
    });
    const creature = {
      ...retained(
        "obj_cre_display_identity",
        "creature",
        "creatures",
        "nw_guard",
        "NW_GUARD",
        1,
        2,
      ),
      sourceIndex: 0,
    };

    const plan = planExistingAreaObjectDeletions(source, editing([creature], [{
      kind: "creature",
      sourceObjectId: "obj_cre_display_identity",
      sourceIndex: 0,
      interruptable: { expectedValue: 1, value: 0 },
    } as never]));

    expect(plan.propertyMutations).toEqual([{
      kind: "creature",
      sourceIndex: 0,
      interruptable: { expectedValue: 1, value: 0 },
    }]);
    expect(Object.isFrozen((plan.propertyMutations[0] as any).interruptable)).toBe(true);
  });

  it("resolves an exact subset of Creature advanced Byte flag mutations by immutable family ordinal", () => {
    const source = sourceGit({
      creatureAdvancedFlagFields: [
        { label: "Disarmable", type: "byte", value: 1 },
        { label: "Plot", type: "byte", value: 0 },
        { label: "IsImmortal", type: "byte", value: 0 },
        { label: "Lootable", type: "byte", value: 1 },
        { label: "NoPermDeath", type: "byte", value: 0 },
      ],
    });
    const creature = {
      ...retained(
        "obj_cre_display_identity",
        "creature",
        "creatures",
        "nw_guard",
        "NW_GUARD",
        1,
        2,
      ),
      sourceIndex: 0,
    };

    const plan = planExistingAreaObjectDeletions(source, editing([creature], [{
      kind: "creature",
      sourceObjectId: "obj_cre_display_identity",
      sourceIndex: 0,
      advancedFlags: {
        disarmable: { expectedValue: 1, value: 0 },
        plot: { expectedValue: 0, value: 1 },
      },
    } as never]));

    expect(plan.propertyMutations).toEqual([{
      kind: "creature",
      sourceIndex: 0,
      advancedFlags: {
        disarmable: { expectedValue: 1, value: 0 },
        plot: { expectedValue: 0, value: 1 },
      },
    }]);
    expect(Object.isFrozen((plan.propertyMutations[0] as any).advancedFlags)).toBe(true);
    expect(Object.isFrozen((plan.propertyMutations[0] as any).advancedFlags.disarmable)).toBe(true);
    expect(Object.isFrozen((plan.propertyMutations[0] as any).advancedFlags.plot)).toBe(true);
  });

  it("resolves exact Creature BodyBag and DecayTime CAS by immutable family ordinal", () => {
    const source = sourceGit({
      creatureDeathRemainsFields: [
        { label: "BodyBag", type: "byte", value: 0 },
        { label: "DecayTime", type: "dword", value: 5000 },
      ],
    });
    const creature = {
      ...retained(
        "obj_cre_display_identity",
        "creature",
        "creatures",
        "nw_guard",
        "NW_GUARD",
        1,
        2,
      ),
      sourceIndex: 0,
    };

    const plan = planExistingAreaObjectDeletions(source, editing([creature], [{
      kind: "creature",
      sourceObjectId: "obj_cre_display_identity",
      sourceIndex: 0,
      bodyBag: {
        expectedValue: 0,
        value: 3,
        tableSha256: "e".repeat(64),
        tableRowCount: 7,
      },
      decayTime: { expectedMilliseconds: 5000, valueMilliseconds: 12_000 },
    } as never]));

    expect(plan.propertyMutations).toEqual([{
      kind: "creature",
      sourceIndex: 0,
      bodyBag: {
        expectedValue: 0,
        value: 3,
        tableSha256: "e".repeat(64),
        tableRowCount: 7,
      },
      decayTime: { expectedMilliseconds: 5000, valueMilliseconds: 12_000 },
    }]);
    expect(Object.isFrozen((plan.propertyMutations[0] as any).bodyBag)).toBe(true);
    expect(Object.isFrozen((plan.propertyMutations[0] as any).decayTime)).toBe(true);
  });

  it("resolves and stale-checks one exact Creature FactionID Word CAS", () => {
    const source = sourceGit({
      creatureFactionFields: [{ label: "FactionID", type: "word", value: 1 }],
    });
    const creature = {
      ...retained(
        "obj_cre_display_identity",
        "creature",
        "creatures",
        "nw_guard",
        "NW_GUARD",
        1,
        2,
      ),
      sourceIndex: 0,
    };
    const faction = {
      expectedValue: 1,
      value: 4,
      catalogSha256: "f".repeat(64),
      catalogFactionCount: 5,
    };
    const plan = planExistingAreaObjectDeletions(source, editing([creature], [{
      kind: "creature",
      sourceObjectId: "obj_cre_display_identity",
      sourceIndex: 0,
      faction,
    } as never]));
    expect(plan.propertyMutations).toEqual([{
      kind: "creature",
      sourceIndex: 0,
      faction,
    }]);
    for (const [fields, expected] of [
      [[], "FactionID missing_canonical_word"],
      [[{ label: "FactionID", type: "dword", value: 1 }], "FactionID missing_canonical_word"],
      [[{ label: "FactionID", type: "word", value: 2 }], "FactionID expected=1 actual=2"],
    ] as const) {
      expect(() => planExistingAreaObjectDeletions(
        sourceGit({ creatureFactionFields: fields as readonly SupportedGffField[] }),
        editing([creature], [{
          kind: "creature",
          sourceObjectId: "obj_cre_display_identity",
          sourceIndex: 0,
          faction,
        } as never]),
      )).toThrow(expect.objectContaining({ details: expect.arrayContaining([expected]) }));
    }
  });

  it("resolves and stale-checks one exact Creature TemplateResRef CAS", () => {
    const creature = {
      ...retained(
        "obj_cre_display_identity",
        "creature",
        "creatures",
        "nw_guard",
        "NW_GUARD",
        1,
        2,
      ),
      sourceIndex: 0,
    };
    const templateResRef = {
      expectedResRef: "nw_guard",
      resRef: "nw_guard_alt",
    };
    const plan = planExistingAreaObjectDeletions(sourceGit(), editing([creature], [{
      kind: "creature",
      sourceObjectId: "obj_cre_display_identity",
      sourceIndex: 0,
      templateResRef,
    } as never]));
    expect(plan.propertyMutations).toEqual([{
      kind: "creature",
      sourceIndex: 0,
      templateResRef,
    }]);
    expect(Object.isFrozen((plan.propertyMutations[0] as any).templateResRef)).toBe(true);
    for (const [fields, expected] of [
      [[], "TemplateResRef missing_canonical_resref"],
      [[{ label: "TemplateResRef", type: "cexostring", value: "nw_guard" }], "TemplateResRef missing_canonical_resref"],
      [[{ label: "TemplateResRef", type: "resref", value: "nw_other" }], "TemplateResRef expected=nw_guard actual=nw_other"],
    ] as const) {
      expect(() => planExistingAreaObjectDeletions(
        sourceGit({ creatureTemplateResRefFields: fields as readonly SupportedGffField[] }),
        editing([creature], [{
          kind: "creature",
          sourceObjectId: "obj_cre_display_identity",
          sourceIndex: 0,
          templateResRef,
        } as never]),
      )).toThrow(expect.objectContaining({ details: expect.arrayContaining([expected]) }));
    }
  });

  it("resolves and stale-checks exact Creature Subrace and Deity CAS pairs", () => {
    const creature = {
      ...retained(
        "obj_cre_display_identity",
        "creature",
        "creatures",
        "nw_guard",
        "NW_GUARD",
        1,
        2,
      ),
      sourceIndex: 0,
    };
    const source = sourceGit({
      creatureSpecialIdentityStringFields: [
        { label: "Subrace", type: "cexostring", value: "Moon Elf" },
        { label: "Deity", type: "cexostring", value: "" },
      ],
    });
    const specialIdentityStrings = {
      subrace: { expectedValue: "Moon Elf", value: "Sun Elf" },
      deity: { expectedValue: "", value: "Mystra" },
    };
    const plan = planExistingAreaObjectDeletions(source, editing([creature], [{
      kind: "creature",
      sourceObjectId: "obj_cre_display_identity",
      sourceIndex: 0,
      specialIdentityStrings,
    } as never]));
    expect(plan.propertyMutations).toEqual([{
      kind: "creature",
      sourceIndex: 0,
      specialIdentityStrings,
    }]);
    expect(Object.isFrozen((plan.propertyMutations[0] as any).specialIdentityStrings)).toBe(true);
    expect(Object.isFrozen((plan.propertyMutations[0] as any).specialIdentityStrings.subrace)).toBe(true);

    for (const [fields, mutation, expected] of [
      [
        [{ label: "Deity", type: "cexostring", value: "" }],
        { subrace: { expectedValue: "Moon Elf", value: "Sun Elf" } },
        "Subrace missing_canonical_cexostring",
      ],
      [
        [{ label: "Subrace", type: "resref", value: "moon_elf" }],
        { subrace: { expectedValue: "Moon Elf", value: "Sun Elf" } },
        "Subrace missing_canonical_cexostring",
      ],
      [
        [{ label: "Subrace", type: "cexostring", value: "Wild Elf" }],
        { subrace: { expectedValue: "Moon Elf", value: "Sun Elf" } },
        "Subrace expected=Moon Elf actual=Wild Elf",
      ],
    ] as const) {
      expect(() => planExistingAreaObjectDeletions(
        sourceGit({
          creatureSpecialIdentityStringFields: fields as readonly SupportedGffField[],
        }),
        editing([creature], [{
          kind: "creature",
          sourceObjectId: "obj_cre_display_identity",
          sourceIndex: 0,
          specialIdentityStrings: mutation,
        } as never]),
      )).toThrow(expect.objectContaining({ details: expect.arrayContaining([expected]) }));
    }
  });

  it("resolves canonical ordered Creature script ResRef CAS pairs and rejects stale source", () => {
    const creature = {
      ...retained(
        "obj_cre_display_identity",
        "creature",
        "creatures",
        "nw_guard",
        "NW_GUARD",
        1,
        2,
      ),
      sourceIndex: 0,
    };
    const source = sourceGit({
      creatureScriptResRefFields: [
        { label: "ScriptHeartbeat", type: "resref", value: "NW_C2_DEFAULT1" },
        { label: "ScriptSpawn", type: "resref", value: "nw_c2_default9" },
      ],
    });
    const scripts = [
      { field: "ScriptHeartbeat", expectedResRef: "NW_C2_DEFAULT1", resRef: "main" },
      { field: "ScriptSpawn", expectedResRef: "nw_c2_default9", resRef: "spawn_probe" },
    ];
    const plan = planExistingAreaObjectDeletions(source, editing([creature], [{
      kind: "creature",
      sourceObjectId: "obj_cre_display_identity",
      sourceIndex: 0,
      scripts,
    } as never]));

    expect(plan.propertyMutations).toEqual([{
      kind: "creature",
      sourceIndex: 0,
      scripts,
    }]);
    expect(Object.isFrozen((plan.propertyMutations[0] as any).scripts)).toBe(true);
    expect(Object.isFrozen((plan.propertyMutations[0] as any).scripts[0])).toBe(true);

    expect(() => planExistingAreaObjectDeletions(
      sourceGit({
        creatureScriptResRefFields: [
          { label: "ScriptSpawn", type: "resref", value: "other" },
        ],
      }),
      editing([creature], [{
        kind: "creature",
        sourceObjectId: "obj_cre_display_identity",
        sourceIndex: 0,
        scripts: [{
          field: "ScriptSpawn",
          expectedResRef: "nw_c2_default9",
          resRef: "spawn_probe",
        }],
      } as never]),
    )).toThrow(expect.objectContaining({
      details: expect.arrayContaining([
        "ScriptSpawn expected=nw_c2_default9 actual=other",
      ]),
    }));
  });

  it.each([
    [
      "missing BodyBag",
      [{ label: "DecayTime", type: "dword" as const, value: 5000 }],
      { bodyBag: { expectedValue: 0, value: 3, tableSha256: "e".repeat(64), tableRowCount: 7 } },
      "Creature BodyBag mutation requires one exact present native Byte.",
      "field=BodyBag",
    ],
    [
      "wrong-case BodyBag",
      [{ label: "bodybag", type: "byte" as const, value: 0 }],
      { bodyBag: { expectedValue: 0, value: 3, tableSha256: "e".repeat(64), tableRowCount: 7 } },
      "Creature BodyBag mutation requires one exact present native Byte.",
      "field=BodyBag",
    ],
    [
      "wrong-type BodyBag",
      [{ label: "BodyBag", type: "word" as const, value: 0 }],
      { bodyBag: { expectedValue: 0, value: 3, tableSha256: "e".repeat(64), tableRowCount: 7 } },
      "Creature BodyBag mutation requires one exact present native Byte.",
      "field=BodyBag",
    ],
    [
      "duplicate BodyBag",
      [
        { label: "BodyBag", type: "byte" as const, value: 0 },
        { label: "BodyBag", type: "byte" as const, value: 1 },
      ],
      { bodyBag: { expectedValue: 0, value: 3, tableSha256: "e".repeat(64), tableRowCount: 7 } },
      "Creature BodyBag mutation requires one exact present native Byte.",
      "field=BodyBag",
    ],
    [
      "stale BodyBag",
      [{ label: "BodyBag", type: "byte" as const, value: 0 }],
      { bodyBag: { expectedValue: 1, value: 3, tableSha256: "e".repeat(64), tableRowCount: 7 } },
      "Creature BodyBag expected value differs from exact source GIT.",
      "field=BodyBag",
    ],
    [
      "missing DecayTime",
      [{ label: "BodyBag", type: "byte" as const, value: 0 }],
      { decayTime: { expectedMilliseconds: 5000, valueMilliseconds: 12_000 } },
      "Creature DecayTime mutation requires one exact present native DWord.",
      "field=DecayTime",
    ],
    [
      "wrong-case DecayTime",
      [{ label: "decaytime", type: "dword" as const, value: 5000 }],
      { decayTime: { expectedMilliseconds: 5000, valueMilliseconds: 12_000 } },
      "Creature DecayTime mutation requires one exact present native DWord.",
      "field=DecayTime",
    ],
    [
      "wrong-type DecayTime",
      [{ label: "DecayTime", type: "int" as const, value: 5000 }],
      { decayTime: { expectedMilliseconds: 5000, valueMilliseconds: 12_000 } },
      "Creature DecayTime mutation requires one exact present native DWord.",
      "field=DecayTime",
    ],
    [
      "duplicate DecayTime",
      [
        { label: "DecayTime", type: "dword" as const, value: 5000 },
        { label: "DecayTime", type: "dword" as const, value: 6000 },
      ],
      { decayTime: { expectedMilliseconds: 5000, valueMilliseconds: 12_000 } },
      "Creature DecayTime mutation requires one exact present native DWord.",
      "field=DecayTime",
    ],
    [
      "noncanonical retained DecayTime",
      [{ label: "DecayTime", type: "dword" as const, value: 5001 }],
      { decayTime: { expectedMilliseconds: 5000, valueMilliseconds: 12_000 } },
      "Creature DecayTime expected value differs from exact source GIT.",
      "field=DecayTime",
    ],
  ] as const)("rejects Creature death-remains replanning with %s", (
    _label,
    creatureDeathRemainsFields,
    mutationMembers,
    diagnostic,
    fieldDiagnostic,
  ) => {
    const creature = {
      ...retained(
        "obj_cre_display_identity",
        "creature",
        "creatures",
        "nw_guard",
        "NW_GUARD",
        1,
        2,
      ),
      sourceIndex: 0,
    };

    expect(propertyPlanError(sourceGit({ creatureDeathRemainsFields }), editing([creature], [{
      kind: "creature",
      sourceObjectId: "obj_cre_display_identity",
      sourceIndex: 0,
      ...mutationMembers,
    } as never]))).toMatchObject({
      message: diagnostic,
      details: expect.arrayContaining([
        "obj_cre_display_identity",
        "ordinal=0",
        fieldDiagnostic,
      ]),
    });
  });

  it("resolves one exact digest-bound Creature Appearance_Type mutation by immutable family ordinal", () => {
    const source = sourceGit({
      creatureAppearanceFields: [{ label: "Appearance_Type", type: "word", value: 249 }],
    });
    const creature = {
      ...retained(
        "obj_cre_display_identity",
        "creature",
        "creatures",
        "nw_guard",
        "NW_GUARD",
        1,
        2,
      ),
      sourceIndex: 0,
    };

    const plan = planExistingAreaObjectDeletions(source, editing([creature], [{
      kind: "creature",
      sourceObjectId: "obj_cre_display_identity",
      sourceIndex: 0,
      appearance: {
        expectedValue: 249,
        value: 52,
        tableSha256: "a".repeat(64),
        rowCount: 1000,
      },
    } as never]));

    expect(plan.propertyMutations).toEqual([{
      kind: "creature",
      sourceIndex: 0,
      appearance: {
        expectedValue: 249,
        value: 52,
        tableSha256: "a".repeat(64),
        rowCount: 1000,
      },
    }]);
    expect(Object.isFrozen((plan.propertyMutations[0] as any).appearance)).toBe(true);
  });

  it("resolves one exact digest-bound Creature Gender mutation by immutable family ordinal", () => {
    const source = sourceGit({
      creatureGenderFields: [{ label: "Gender", type: "byte", value: 4 }],
    });
    const creature = {
      ...retained(
        "obj_cre_display_identity",
        "creature",
        "creatures",
        "nw_guard",
        "NW_GUARD",
        1,
        2,
      ),
      sourceIndex: 0,
    };
    expect(planExistingAreaObjectDeletions(source, editing([creature], [{
      kind: "creature",
      sourceObjectId: "obj_cre_display_identity",
      sourceIndex: 0,
      gender: {
        expectedValue: 4,
        value: 0,
        tableSha256: "c".repeat(64),
        rowCount: 5,
      },
    } as never])).propertyMutations).toEqual([{
      kind: "creature",
      sourceIndex: 0,
      gender: {
        expectedValue: 4,
        value: 0,
        tableSha256: "c".repeat(64),
        rowCount: 5,
      },
    }]);
  });

  it("resolves one exact ranges.2da-bound Creature PerceptionRange mutation", () => {
    const source = sourceGit({
      creaturePerceptionRangeFields: [{ label: "PerceptionRange", type: "byte", value: 11 }],
    });
    const creature = {
      ...retained(
        "obj_cre_display_identity",
        "creature",
        "creatures",
        "nw_guard",
        "NW_GUARD",
        1,
        2,
      ),
      sourceIndex: 0,
    };
    expect(planExistingAreaObjectDeletions(source, editing([creature], [{
      kind: "creature",
      sourceObjectId: "obj_cre_display_identity",
      sourceIndex: 0,
      perceptionRange: {
        expectedValue: 11,
        value: 9,
        tableSha256: "e".repeat(64),
        rowCount: 12,
      },
    } as never])).propertyMutations).toEqual([{
      kind: "creature",
      sourceIndex: 0,
      perceptionRange: {
        expectedValue: 11,
        value: 9,
        tableSha256: "e".repeat(64),
        rowCount: 12,
      },
    }]);
  });

  it("resolves one exact creaturespeed.2da-bound Creature WalkRate mutation", () => {
    const source = sourceGit({
      creatureWalkRateFields: [{ label: "WalkRate", type: "int", value: 4 }],
    });
    const creature = {
      ...retained(
        "obj_cre_display_identity",
        "creature",
        "creatures",
        "nw_guard",
        "NW_GUARD",
        1,
        2,
      ),
      sourceIndex: 0,
    };
    expect(planExistingAreaObjectDeletions(source, editing([creature], [{
      kind: "creature",
      sourceObjectId: "obj_cre_display_identity",
      sourceIndex: 0,
      walkRate: {
        expectedValue: 4,
        value: 2,
        tableSha256: "d".repeat(64),
        rowCount: 9,
      },
    } as never])).propertyMutations).toEqual([{
      kind: "creature",
      sourceIndex: 0,
      walkRate: {
        expectedValue: 4,
        value: 2,
        tableSha256: "d".repeat(64),
        rowCount: 9,
      },
    }]);
  });

  it("resolves one exact soundset.2da-bound Creature SoundSetFile mutation including row zero", () => {
    const source = sourceGit({
      creatureSoundSetFileFields: [{ label: "SoundSetFile", type: "word", value: 0 }],
    });
    const creature = {
      ...retained(
        "obj_cre_display_identity",
        "creature",
        "creatures",
        "nw_guard",
        "NW_GUARD",
        1,
        2,
      ),
      sourceIndex: 0,
    };
    expect(planExistingAreaObjectDeletions(source, editing([creature], [{
      kind: "creature",
      sourceObjectId: "obj_cre_display_identity",
      sourceIndex: 0,
      soundSetFile: {
        expectedValue: 0,
        value: 27,
        tableSha256: "a".repeat(64),
        rowCount: 5_100,
      },
    } as never])).propertyMutations).toEqual([{
      kind: "creature",
      sourceIndex: 0,
      soundSetFile: {
        expectedValue: 0,
        value: 27,
        tableSha256: "a".repeat(64),
        rowCount: 5_100,
      },
    }]);
  });

  it("resolves one exact packages.2da- and ClassList-bound Creature StartingPackage mutation", () => {
    const source = sourceGit({
      creatureStartingPackageFields: [
        { label: "StartingPackage", type: "byte", value: 0 },
        {
          label: "ClassList",
          type: "list",
          value: [{
            typeId: 2,
            fields: [
              { label: "Class", type: "int", value: 4 },
              { label: "ClassLevel", type: "short", value: 3 },
            ],
          }],
        },
      ],
    });
    const creature = {
      ...retained(
        "obj_cre_display_identity",
        "creature",
        "creatures",
        "nw_guard",
        "NW_GUARD",
        0,
        2,
      ),
      sourceIndex: 0,
    };
    expect(planExistingAreaObjectDeletions(source, editing([creature], [{
      kind: "creature",
      sourceObjectId: "obj_cre_display_identity",
      sourceIndex: 0,
      startingPackage: {
        expectedValue: 0,
        value: 2,
        expectedClassIds: [4],
        tableSha256: "c".repeat(64),
        rowCount: 132,
      },
    } as never])).propertyMutations).toEqual([{
      kind: "creature",
      sourceIndex: 0,
      startingPackage: {
        expectedValue: 0,
        value: 2,
        expectedClassIds: [4],
        tableSha256: "c".repeat(64),
        rowCount: 132,
      },
    }]);
  });

  it("resolves one exact physical Creature SkillList vector mutation", () => {
    const source = sourceGit({
      creatureSkillListFields: [{
        label: "SkillList",
        type: "list",
        value: [
          {
            typeId: 0,
            fields: [
              { label: "Rank", type: "byte", value: 4 },
              { label: "Opaque", type: "cexostring", value: "preserve" },
            ],
          },
          { typeId: 0, fields: [{ label: "Rank", type: "byte", value: 0 }] },
        ],
      }],
    });
    const creature = {
      ...retained(
        "obj_cre_display_identity",
        "creature",
        "creatures",
        "nw_guard",
        "NW_GUARD",
        0,
        2,
      ),
      sourceIndex: 0,
    };
    expect(planExistingAreaObjectDeletions(source, editing([creature], [{
      kind: "creature",
      sourceObjectId: "obj_cre_display_identity",
      sourceIndex: 0,
      skillList: {
        expectedRanks: [4, 0],
        ranks: [7, 0, 2],
        tableSha256: "c".repeat(64),
        rowCount: 3,
        resizeMode: "expand_zero_tail",
        confirmTruncation: false,
      },
    } as never])).propertyMutations).toEqual([{
      kind: "creature",
      sourceIndex: 0,
      skillList: {
        expectedRanks: [4, 0],
        ranks: [7, 0, 2],
        tableSha256: "c".repeat(64),
        rowCount: 3,
        resizeMode: "expand_zero_tail",
        confirmTruncation: false,
      },
    }]);
  });

  it("resolves one exact selector-bound Creature PortraitId mutation by immutable ordinal", () => {
    const source = sourceGit({
      creaturePortraitFields: [
        { label: "PortraitId", type: "word", value: 10 },
        { label: "Gender", type: "byte", value: 0 },
        { label: "Race", type: "byte", value: 4 },
      ],
    });
    const creature = {
      ...retained(
        "obj_cre_display_identity",
        "creature",
        "creatures",
        "nw_guard",
        "NW_GUARD",
        1,
        2,
      ),
      sourceIndex: 0,
    };
    const mutation = {
      expectedValue: 10,
      value: 11,
      tableSha256: "f".repeat(64),
      rowCount: 16_001,
      genderExpectedValue: 0,
      raceExpectedValue: 4,
    };
    expect(planExistingAreaObjectDeletions(source, editing([creature], [{
      kind: "creature",
      sourceObjectId: "obj_cre_display_identity",
      sourceIndex: 0,
      portrait: mutation,
    } as never])).propertyMutations).toEqual([{
      kind: "creature",
      sourceIndex: 0,
      portrait: mutation,
    }]);
  });

  it("resolves one exact Creature ChallengeRating Float mutation by immutable family ordinal", () => {
    const source = sourceGit({
      creatureChallengeRatingFields: [{
        label: "ChallengeRating",
        type: "float",
        value: 11.5,
      }],
    });
    const creature = {
      ...retained(
        "obj_cre_display_identity",
        "creature",
        "creatures",
        "nw_guard",
        "NW_GUARD",
        1,
        2,
      ),
      sourceIndex: 0,
    };
    const plan = planExistingAreaObjectDeletions(source, editing([creature], [{
      kind: "creature",
      sourceObjectId: "obj_cre_display_identity",
      sourceIndex: 0,
      challengeRating: {
        expectedValue: 11.5,
        value: 0.5,
      },
    } as never]));

    expect(plan.propertyMutations).toEqual([{
      kind: "creature",
      sourceIndex: 0,
      challengeRating: {
        expectedValue: 11.5,
        value: 0.5,
      },
    }]);
    expect(Object.isFrozen((plan.propertyMutations[0] as any).challengeRating)).toBe(true);
  });

  it("resolves one exact Creature NaturalAC Byte mutation by immutable family ordinal", () => {
    const source = sourceGit({
      creatureNaturalArmorClassFields: [{
        label: "NaturalAC",
        type: "byte",
        value: 0,
      }],
    });
    const creature = {
      ...retained(
        "obj_cre_display_identity",
        "creature",
        "creatures",
        "nw_guard",
        "NW_GUARD",
        1,
        2,
      ),
      sourceIndex: 0,
    };
    const plan = planExistingAreaObjectDeletions(source, editing([creature], [{
      kind: "creature",
      sourceObjectId: "obj_cre_display_identity",
      sourceIndex: 0,
      naturalArmorClass: { expectedValue: 0, value: 2 },
    } as never]));

    expect(plan.propertyMutations).toEqual([{
      kind: "creature",
      sourceIndex: 0,
      naturalArmorClass: { expectedValue: 0, value: 2 },
    }]);
    expect(Object.isFrozen((plan.propertyMutations[0] as any).naturalArmorClass)).toBe(true);
  });

  it("resolves exact Creature saving-throw Short mutations by immutable family ordinal", () => {
    const source = sourceGit({
      creatureSavingThrowBonusFields: [
        { label: "refbonus", type: "short", value: 1 },
        { label: "willbonus", type: "short", value: 2 },
        { label: "fortbonus", type: "short", value: 3 },
      ],
    });
    const creature = {
      ...retained(
        "obj_cre_display_identity",
        "creature",
        "creatures",
        "nw_guard",
        "NW_GUARD",
        1,
        2,
      ),
      sourceIndex: 0,
    };
    const plan = planExistingAreaObjectDeletions(source, editing([creature], [{
      kind: "creature",
      sourceObjectId: "obj_cre_display_identity",
      sourceIndex: 0,
      savingThrowBonuses: {
        reflex: { expectedValue: 1, value: 4 },
        fortitude: { expectedValue: 3, value: 5 },
      },
    } as never]));

    expect(plan.propertyMutations).toEqual([{
      kind: "creature",
      sourceIndex: 0,
      savingThrowBonuses: {
        reflex: { expectedValue: 1, value: 4 },
        fortitude: { expectedValue: 3, value: 5 },
      },
    }]);
    expect(Object.isFrozen(
      (plan.propertyMutations[0] as any).savingThrowBonuses,
    )).toBe(true);
  });

  it("resolves one coupled exact Creature alignment mutation by immutable family ordinal", () => {
    const source = sourceGit({
      creatureAlignmentFields: [
        { label: "GoodEvil", type: "byte", value: 50 },
        { label: "LawfulChaotic", type: "byte", value: 50 },
      ],
    });
    const creature = {
      ...retained(
        "obj_cre_display_identity",
        "creature",
        "creatures",
        "nw_guard",
        "NW_GUARD",
        1,
        2,
      ),
      sourceIndex: 0,
    };
    const plan = planExistingAreaObjectDeletions(source, editing([creature], [{
      kind: "creature",
      sourceObjectId: "obj_cre_display_identity",
      sourceIndex: 0,
      alignment: {
        expectedGoodEvil: 50,
        expectedLawfulChaotic: 50,
        goodEvil: 100,
        lawfulChaotic: 100,
      },
    } as never]));

    expect(plan.propertyMutations).toEqual([{
      kind: "creature",
      sourceIndex: 0,
      alignment: {
        expectedGoodEvil: 50,
        expectedLawfulChaotic: 50,
        goodEvil: 100,
        lawfulChaotic: 100,
      },
    }]);
    expect(Object.isFrozen((plan.propertyMutations[0] as any).alignment)).toBe(true);
  });

  it("resolves changed present Creature base ability-score Byte mutations by immutable family ordinal", () => {
    const source = sourceGit({
      creatureAbilityScoreFields: [
        { label: "Str", type: "byte", value: 15 },
        { label: "Dex", type: "byte", value: 12 },
        { label: "Con", type: "byte", value: 14 },
        { label: "Int", type: "byte", value: 10 },
        { label: "Wis", type: "byte", value: 11 },
        { label: "Cha", type: "byte", value: 8 },
      ],
    });
    const creature = {
      ...retained(
        "obj_cre_display_identity",
        "creature",
        "creatures",
        "nw_guard",
        "NW_GUARD",
        1,
        2,
      ),
      sourceIndex: 0,
    };
    const plan = planExistingAreaObjectDeletions(source, editing([creature], [{
      kind: "creature",
      sourceObjectId: "obj_cre_display_identity",
      sourceIndex: 0,
      abilityScores: {
        strength: { expectedValue: 15, value: 17 },
        charisma: { expectedValue: 8, value: 10 },
      },
    } as never]));

    expect(plan.propertyMutations).toEqual([{
      kind: "creature",
      sourceIndex: 0,
      abilityScores: {
        strength: { expectedValue: 15, value: 17 },
        charisma: { expectedValue: 8, value: 10 },
      },
    }]);
    expect(Object.isFrozen((plan.propertyMutations[0] as any).abilityScores)).toBe(true);
    expect(Object.isFrozen((plan.propertyMutations[0] as any).abilityScores.strength)).toBe(true);
  });

  it("resolves changed present Creature appearance-color Byte mutations by immutable family ordinal", () => {
    const source = sourceGit({
      creatureAppearanceColorFields: [
        { label: "Color_Skin", type: "byte", value: 11 },
        { label: "Color_Hair", type: "byte", value: 22 },
        { label: "Color_Tattoo1", type: "byte", value: 33 },
        { label: "Color_Tattoo2", type: "byte", value: 44 },
      ],
    });
    const creature = {
      ...retained(
        "obj_cre_display_identity",
        "creature",
        "creatures",
        "nw_guard",
        "NW_GUARD",
        1,
        2,
      ),
      sourceIndex: 0,
    };
    const plan = planExistingAreaObjectDeletions(source, editing([creature], [{
      kind: "creature",
      sourceObjectId: "obj_cre_display_identity",
      sourceIndex: 0,
      appearanceColors: {
        skin: { expectedValue: 11, value: 12 },
        tattoo2: { expectedValue: 44, value: 45 },
      },
    } as never]));

    expect(plan.propertyMutations).toEqual([{
      kind: "creature",
      sourceIndex: 0,
      appearanceColors: {
        skin: { expectedValue: 11, value: 12 },
        tattoo2: { expectedValue: 44, value: 45 },
      },
    }]);
    expect(Object.isFrozen((plan.propertyMutations[0] as any).appearanceColors)).toBe(true);
    expect(Object.isFrozen((plan.propertyMutations[0] as any).appearanceColors.skin)).toBe(true);
  });

  it("reparses and CAS-checks Creature body-part compatibility mutations by immutable family ordinal", () => {
    const source = sourceGit({
      creatureBodyPartFields: [
        { label: "ArmorPart_RFoot", type: "byte", value: 12 },
        { label: "BodyPart_Torso", type: "byte", value: 0 },
        { label: "xBodyPart_Torso", type: "word", value: 4096 },
        { label: "xBodyPart_RShoul", type: "word", value: 1023 },
      ],
    });
    const creature = {
      ...retained(
        "obj_cre_display_identity",
        "creature",
        "creatures",
        "nw_guard",
        "NW_GUARD",
        1,
        2,
      ),
      sourceIndex: 0,
    };
    const plan = planExistingAreaObjectDeletions(source, editing([creature], [{
      kind: "creature",
      sourceObjectId: "obj_cre_display_identity",
      sourceIndex: 0,
      bodyParts: {
        rightFoot: { expectedValue: 12, value: 13 },
        torso: { expectedValue: 4096, value: 5000 },
        rightShoulder: { expectedValue: 1023, value: 1024 },
      },
    } as never]));

    expect(plan.propertyMutations).toEqual([{
      kind: "creature",
      sourceIndex: 0,
      bodyParts: {
        rightFoot: { expectedValue: 12, value: 13 },
        torso: { expectedValue: 4096, value: 5000 },
        rightShoulder: { expectedValue: 1023, value: 1024 },
      },
    }]);
    expect(Object.isFrozen((plan.propertyMutations[0] as any).bodyParts)).toBe(true);
    expect(Object.isFrozen((plan.propertyMutations[0] as any).bodyParts.torso)).toBe(true);
  });

  it("rejects a Creature body-part CAS target outside its retained native capacity", () => {
    const source = sourceGit({
      creatureBodyPartFields: [
        { label: "ArmorPart_RFoot", type: "byte", value: 12 },
      ],
    });
    const creature = {
      ...retained(
        "obj_cre_display_identity",
        "creature",
        "creatures",
        "nw_guard",
        "NW_GUARD",
        1,
        2,
      ),
      sourceIndex: 0,
    };

    expect(() => planExistingAreaObjectDeletions(source, editing([creature], [{
      kind: "creature",
      sourceObjectId: "obj_cre_display_identity",
      sourceIndex: 0,
      bodyParts: { rightFoot: { expectedValue: 12, value: 256 } },
    } as never]))).toThrow("native capacity");
  });

  it("reparses a modern Creature appendage DWord and retains catalog CAS provenance", () => {
    const tableSha256 = "a".repeat(64);
    const source = sourceGit({
      creatureAppendageFields: [
        { label: "Wings_New", type: "dword", value: 1 },
        { label: "Wings", type: "byte", value: 2 },
        { label: "Tail_New", type: "dword", value: 3 },
      ],
    });
    const creature = {
      ...retained(
        "obj_cre_display_identity",
        "creature",
        "creatures",
        "nw_guard",
        "NW_GUARD",
        1,
        2,
      ),
      sourceIndex: 0,
    };
    const plan = planExistingAreaObjectDeletions(source, editing([creature], [{
      kind: "creature",
      sourceObjectId: "obj_cre_display_identity",
      sourceIndex: 0,
      appendages: {
        wings: { expectedValue: 1, value: 7, tableSha256, rowCount: 8 },
      },
    } as never]));

    expect(plan.propertyMutations).toEqual([{
      kind: "creature",
      sourceIndex: 0,
      appendages: {
        wings: { expectedValue: 1, value: 7, tableSha256, rowCount: 8 },
      },
    }]);
    expect(Object.isFrozen((plan.propertyMutations[0] as any).appendages)).toBe(true);
    expect(Object.isFrozen((plan.propertyMutations[0] as any).appendages.wings)).toBe(true);
  });

  it("does not admit a legacy-only Creature appendage mutation", () => {
    const source = sourceGit({
      creatureAppendageFields: [{ label: "Tail", type: "byte", value: 3 }],
    });
    const creature = {
      ...retained(
        "obj_cre_display_identity",
        "creature",
        "creatures",
        "nw_guard",
        "NW_GUARD",
        1,
        2,
      ),
      sourceIndex: 0,
    };
    expect(() => planExistingAreaObjectDeletions(source, editing([creature], [{
      kind: "creature",
      sourceObjectId: "obj_cre_display_identity",
      sourceIndex: 0,
      appendages: {
        tail: { expectedValue: 3, value: 4, tableSha256: "a".repeat(64), rowCount: 8 },
      },
    } as never]))).toThrow("modern DWord");
  });

  it("reparses and CAS-checks the complete coupled Creature HP mutation", () => {
    const source = sourceGit({
      creatureHitPointFields: exactCreatureHitPointGffFields(),
    });
    const creature = {
      ...retained(
        "obj_cre_display_identity",
        "creature",
        "creatures",
        "nw_guard",
        "NW_GUARD",
        1,
        2,
      ),
      sourceIndex: 0,
    };
    const hitPoints = {
      expectedHitPoints: 10,
      expectedCurrentHitPoints: 7,
      expectedMaxHitPoints: 99,
      hitPoints: 12,
      currentHitPoints: 10,
      maxHitPoints: 27,
      expectedConstitution: 14,
      constitution: 14,
      race: 1,
      classLevels: [3, 2],
      featRow40Present: false,
      racialConstitutionAdjust: 2,
      racialTypesSha256: "a".repeat(64),
      racialTypesRowCount: 5,
    };
    const plan = planExistingAreaObjectDeletions(source, editing([creature], [{
      kind: "creature",
      sourceObjectId: "obj_cre_display_identity",
      sourceIndex: 0,
      hitPoints,
    } as never]));
    expect(plan.propertyMutations).toEqual([{
      kind: "creature",
      sourceIndex: 0,
      hitPoints,
    }]);
    expect(Object.isFrozen((plan.propertyMutations[0] as any).hitPoints)).toBe(true);
  });

  it("rejects stale HP siblings and an uncoupled Constitution mutation", () => {
    const source = sourceGit({
      creatureHitPointFields: exactCreatureHitPointGffFields(),
    });
    const creature = {
      ...retained("obj_cre_display_identity", "creature", "creatures", "nw_guard", "NW_GUARD", 1, 2),
      sourceIndex: 0,
    };
    const base = {
      kind: "creature",
      sourceObjectId: "obj_cre_display_identity",
      sourceIndex: 0,
      hitPoints: {
        expectedHitPoints: 10,
        expectedCurrentHitPoints: 8,
        expectedMaxHitPoints: 99,
        hitPoints: 12,
        currentHitPoints: 10,
        maxHitPoints: 27,
        expectedConstitution: 14,
        constitution: 14,
        race: 1,
        classLevels: [3, 2],
        featRow40Present: false,
        racialConstitutionAdjust: 2,
        racialTypesSha256: "a".repeat(64),
        racialTypesRowCount: 5,
      },
    };
    expect(() => planExistingAreaObjectDeletions(
      source,
      editing([creature], [base as never]),
    )).toThrow("expected triplet differs");
    expect(() => planExistingAreaObjectDeletions(source, editing([creature], [{
      kind: "creature",
      sourceObjectId: "obj_cre_display_identity",
      sourceIndex: 0,
      abilityScores: { constitution: { expectedValue: 14, value: 15 } },
    } as never]))).toThrow("requires the coupled hit-point mutation");
  });

  it("resolves exact Creature FirstName, LastName, and Description mutations by ordinal", () => {
    const source = sourceGit({
      creatureLocalizedStringFields: [
        { label: "FirstName", type: "cexolocstring", value: {
          strRef: 0xffff_ffff,
          entries: [{ languageId: 0, text: "Guard" }],
        } },
        { label: "LastName", type: "cexolocstring", value: {
          strRef: 0xffff_ffff,
          entries: [],
        } },
        { label: "Description", type: "cexolocstring", value: {
          strRef: 0xffff_ffff,
          entries: [{ languageId: 0, text: "Old description" }],
        } },
      ],
    });
    const creature = {
      ...retained("diagnostic_only", "creature", "creatures", "nw_guard", "NW_GUARD", 1, 2),
      sourceIndex: 0,
    };

    const plan = planExistingAreaObjectDeletions(source, editing([creature], [{
      kind: "creature",
      sourceObjectId: "diagnostic_only",
      sourceIndex: 0,
      localizedStrings: [
        { field: "FirstName", expectedValue: "Guard", value: " Captain " },
        { field: "LastName", expectedValue: "", value: "Aribeth" },
        { field: "Description", expectedValue: "Old description", value: "New description" },
      ],
    } as never]));

    expect(plan.propertyMutations).toEqual([{
      kind: "creature",
      sourceIndex: 0,
      localizedStrings: [
        { field: "FirstName", expectedValue: "Guard", value: " Captain " },
        { field: "LastName", expectedValue: "", value: "Aribeth" },
        { field: "Description", expectedValue: "Old description", value: "New description" },
      ],
    }]);
    expect(Object.isFrozen((plan.propertyMutations[0] as any).localizedStrings)).toBe(true);
  });

  it("revalidates complete ordered Creature localized-string source lists by ordinal", () => {
    const source = sourceGit({
      creatureLocalizedStringFields: [{
        label: "FirstName",
        type: "cexolocstring",
        value: {
          strRef: 0xffff_ffff,
          entries: [
            { languageId: 42, text: "Legacy" },
            { languageId: 0, text: "Guard" },
          ],
        },
      }],
    });
    const creature = {
      ...retained("diagnostic_only", "creature", "creatures", "nw_guard", "NW_GUARD", 1, 2),
      sourceIndex: 0,
    };
    const localizedStrings = [{
      field: "FirstName",
      expectedValue: "Guard",
      value: "Captain",
      expectedProfile: "multi_entry_inline_ascii",
      expectedEntries: [
        { languageId: 42, text: "Legacy" },
        { languageId: 0, text: "Guard" },
      ],
      valueEntries: [
        { languageId: 0, text: "Captain" },
        { languageId: 2, text: "Capitaine" },
        { languageId: 42, text: "Legacy 2" },
      ],
    }];

    expect(planExistingAreaObjectDeletions(source, editing([creature], [{
      kind: "creature",
      sourceObjectId: "diagnostic_only",
      sourceIndex: 0,
      localizedStrings,
    } as never])).propertyMutations).toEqual([{
      kind: "creature",
      sourceIndex: 0,
      localizedStrings,
    }]);

    expect(() => planExistingAreaObjectDeletions(source, editing([creature], [{
      kind: "creature",
      sourceObjectId: "diagnostic_only",
      sourceIndex: 0,
      localizedStrings: [{
        ...localizedStrings[0],
        expectedEntries: [...localizedStrings[0]!.expectedEntries].reverse(),
      }],
    } as never]))).toThrow("differs from immutable provenance");
  });

  it.each([
    ["stale source", [
      { label: "FirstName", type: "cexolocstring" as const, value: {
        strRef: 0xffff_ffff,
        entries: [{ languageId: 0, text: "Actual" }],
      } },
    ], [{ field: "FirstName", expectedValue: "Stale", value: "New" }], "FirstName stale_source"],
    ["TLK-backed source", [
      { label: "FirstName", type: "cexolocstring" as const, value: {
        strRef: 12_416,
        entries: [],
      } },
    ], [{ field: "FirstName", expectedValue: "Chicken", value: "Hen" }], "FirstName unsupported_source"],
    ["reordered pair", [
      { label: "FirstName", type: "cexolocstring" as const, value: {
        strRef: 0xffff_ffff,
        entries: [{ languageId: 0, text: "Guard" }],
      } },
      { label: "LastName", type: "cexolocstring" as const, value: {
        strRef: 0xffff_ffff,
        entries: [{ languageId: 0, text: "Old" }],
      } },
    ], [
      { field: "LastName", expectedValue: "Old", value: "New" },
      { field: "FirstName", expectedValue: "Guard", value: "Captain" },
    ], "localizedStrings invalid_pair"],
  ])("rejects a Creature localized-string mutation with %s without exposing content", (
    _label,
    creatureLocalizedStringFields,
    localizedStrings,
    detail,
  ) => {
    const creature = {
      ...retained("obj_cre_guard", "creature", "creatures", "nw_guard", "NW_GUARD", 1, 2),
      sourceIndex: 0,
    };
    const error = propertyPlanError(
      sourceGit({ creatureLocalizedStringFields }),
      editing([creature], [{
        kind: "creature",
        sourceObjectId: "obj_cre_guard",
        sourceIndex: 0,
        localizedStrings,
      } as never]),
    );

    expect(error.details).toEqual(["obj_cre_guard", detail]);
    expect(error.details.join(" ")).not.toContain("Actual");
    expect(error.details.join(" ")).not.toContain("Stale");
    expect(error.details.join(" ")).not.toContain("Chicken");
  });

  it.each([
    ["stale expected value", sourceGit(), "STALE", "Creature Tag expected value differs from exact source GIT."],
    ["absent native field", sourceGit({ creatureTag: undefined }), "NW_GUARD", "Creature Tag mutation requires one exact present native Tag."],
  ])("rejects a Creature Tag mutation with %s", (_label, source, expectedValue, diagnostic) => {
    const creature = {
      ...retained("obj_cre_nw_guard", "creature", "creatures", "nw_guard", "NW_GUARD", 1, 2),
      sourceIndex: 0,
    };

    expect(propertyPlanError(source, editing([creature], [{
      kind: "creature",
      sourceObjectId: "obj_cre_nw_guard",
      sourceIndex: 0,
      tag: { expectedValue, value: "NW_GUARD_RENAMED" },
    }]))).toMatchObject({
      message: diagnostic,
      details: expect.arrayContaining(["obj_cre_nw_guard", "ordinal=0"]),
    });
  });

  it.each([
    ["stale source", [{ label: "Conversation", type: "resref" as const, value: "actual_dialog" }], "stale_dialog", "Creature Conversation expected ResRef differs from exact source GIT."],
    ["absent native field", [], "guard_dialog", "Creature Conversation mutation requires one exact present native ResRef."],
    ["wrong native type", [{ label: "Conversation", type: "cexostring" as const, value: "guard_dialog" }], "guard_dialog", "Creature Conversation mutation requires one exact present native ResRef."],
  ])("rejects a Creature Conversation mutation with %s", (
    _label,
    creatureConversationFields,
    expectedResRef,
    diagnostic,
  ) => {
    const creature = {
      ...retained("obj_cre_nw_guard", "creature", "creatures", "nw_guard", "NW_GUARD", 1, 2),
      sourceIndex: 0,
    };

    expect(propertyPlanError(sourceGit({ creatureConversationFields }), editing([creature], [{
      kind: "creature",
      sourceObjectId: "obj_cre_nw_guard",
      sourceIndex: 0,
      conversation: { expectedResRef, resRef: "new_dialog" },
    }]))).toMatchObject({
      message: diagnostic,
      details: expect.arrayContaining(["obj_cre_nw_guard", "ordinal=0"]),
    });
  });

  it.each([
    ["missing native field", [], 1, "Creature Interruptable mutation requires one exact present native Byte."],
    ["wrong-case native field", [{ label: "interruptable", type: "byte" as const, value: 1 }], 1, "Creature Interruptable mutation requires one exact present native Byte."],
    ["wrong native type", [{ label: "Interruptable", type: "word" as const, value: 1 }], 1, "Creature Interruptable mutation requires one exact present native Byte."],
    ["duplicate native field", [
      { label: "Interruptable", type: "byte" as const, value: 1 },
      { label: "Interruptable", type: "byte" as const, value: 0 },
    ], 1, "Creature Interruptable mutation requires one exact present native Byte."],
    ["invalid native value", [{ label: "Interruptable", type: "byte" as const, value: 2 }], 1, "Creature Interruptable mutation requires one exact present native Byte."],
    ["stale source", [{ label: "Interruptable", type: "byte" as const, value: 1 }], 0, "Creature Interruptable expected value differs from exact source GIT."],
  ] as const)("rejects a Creature Interruptable mutation with %s", (
    _label,
    creatureInterruptableFields,
    expectedValue,
    diagnostic,
  ) => {
    const creature = {
      ...retained("obj_cre_nw_guard", "creature", "creatures", "nw_guard", "NW_GUARD", 1, 2),
      sourceIndex: 0,
    };

    expect(propertyPlanError(sourceGit({ creatureInterruptableFields }), editing([creature], [{
      kind: "creature",
      sourceObjectId: "obj_cre_nw_guard",
      sourceIndex: 0,
      interruptable: { expectedValue, value: expectedValue === 1 ? 0 : 1 },
    } as never]))).toMatchObject({
      message: diagnostic,
      details: expect.arrayContaining(["obj_cre_nw_guard", "ordinal=0"]),
    });
  });

  it.each([
    ["missing native field", [
      { label: "Disarmable", type: "byte" as const, value: 1 },
    ], { plot: { expectedValue: 0, value: 1 } }, "Plot", "Creature advanced flag mutation requires one exact present native Byte."],
    ["wrong-case native field", [
      { label: "plot", type: "byte" as const, value: 0 },
    ], { plot: { expectedValue: 0, value: 1 } }, "Plot", "Creature advanced flag mutation requires one exact present native Byte."],
    ["wrong native type", [
      { label: "Plot", type: "word" as const, value: 0 },
    ], { plot: { expectedValue: 0, value: 1 } }, "Plot", "Creature advanced flag mutation requires one exact present native Byte."],
    ["duplicate native field", [
      { label: "Plot", type: "byte" as const, value: 0 },
      { label: "Plot", type: "byte" as const, value: 1 },
    ], { plot: { expectedValue: 0, value: 1 } }, "Plot", "Creature advanced flag mutation requires one exact present native Byte."],
    ["invalid native value", [
      { label: "Plot", type: "byte" as const, value: 2 },
    ], { plot: { expectedValue: 0, value: 1 } }, "Plot", "Creature advanced flag mutation requires one exact present native Byte."],
    ["stale source", [
      { label: "Plot", type: "byte" as const, value: 0 },
    ], { plot: { expectedValue: 1, value: 0 } }, "Plot", "Creature advanced flag expected value differs from exact source GIT."],
  ] as const)("rejects a Creature advanced flag mutation with %s", (
    _label,
    creatureAdvancedFlagFields,
    advancedFlags,
    nativeLabel,
    diagnostic,
  ) => {
    const creature = {
      ...retained("obj_cre_nw_guard", "creature", "creatures", "nw_guard", "NW_GUARD", 1, 2),
      sourceIndex: 0,
    };

    expect(propertyPlanError(sourceGit({ creatureAdvancedFlagFields }), editing([creature], [{
      kind: "creature",
      sourceObjectId: "obj_cre_nw_guard",
      sourceIndex: 0,
      advancedFlags,
    } as never]))).toMatchObject({
      message: diagnostic,
      details: expect.arrayContaining(["obj_cre_nw_guard", "ordinal=0", `field=${nativeLabel}`]),
    });
  });

  it.each([
    ["empty", {}],
    ["unchanged", { plot: { expectedValue: 0, value: 0 } }],
    ["unknown key", { plot: { expectedValue: 0, value: 1 }, extra: true }],
  ])("rejects an invalid Creature advanced flag %s mutation group", (_label, advancedFlags) => {
    const creature = {
      ...retained("obj_cre_nw_guard", "creature", "creatures", "nw_guard", "NW_GUARD", 1, 2),
      sourceIndex: 0,
    };

    expect(propertyPlanError(sourceGit({
      creatureAdvancedFlagFields: [{ label: "Plot", type: "byte", value: 0 }],
    }), editing([creature], [{
      kind: "creature",
      sourceObjectId: "obj_cre_nw_guard",
      sourceIndex: 0,
      advancedFlags,
    } as never]))).toMatchObject({
      message: "Creature advanced flag mutation is invalid.",
      details: expect.arrayContaining(["obj_cre_nw_guard", "ordinal=0"]),
    });
  });

  it.each([
    ["missing native field", [], 249, "Creature Appearance mutation requires one exact present native Appearance_Type Word."],
    ["wrong-case native field", [{ label: "appearance_type", type: "word" as const, value: 249 }], 249, "Creature Appearance mutation requires one exact present native Appearance_Type Word."],
    ["wrong native type", [{ label: "Appearance_Type", type: "dword" as const, value: 249 }], 249, "Creature Appearance mutation requires one exact present native Appearance_Type Word."],
    ["duplicate native field", [
      { label: "Appearance_Type", type: "word" as const, value: 249 },
      { label: "Appearance_Type", type: "word" as const, value: 52 },
    ], 249, "Creature Appearance mutation requires one exact present native Appearance_Type Word."],
    ["stale source", [{ label: "Appearance_Type", type: "word" as const, value: 249 }], 248, "Creature Appearance expected value differs from exact source GIT."],
  ] as const)("rejects a Creature Appearance_Type mutation with %s", (
    _label,
    creatureAppearanceFields,
    expectedValue,
    diagnostic,
  ) => {
    const creature = {
      ...retained("obj_cre_nw_guard", "creature", "creatures", "nw_guard", "NW_GUARD", 1, 2),
      sourceIndex: 0,
    };

    expect(propertyPlanError(sourceGit({ creatureAppearanceFields }), editing([creature], [{
      kind: "creature",
      sourceObjectId: "obj_cre_nw_guard",
      sourceIndex: 0,
      appearance: {
        expectedValue,
        value: 52,
        tableSha256: "a".repeat(64),
        rowCount: 1000,
      },
    } as never]))).toMatchObject({
      message: diagnostic,
      details: expect.arrayContaining(["obj_cre_nw_guard", "ordinal=0"]),
    });
  });

  it("rejects stale Creature inventory flag provenance before the writer", () => {
    const source = sourceGit({
      creatureInventory: [{
        resRef: "nw_sword",
        x: 1,
        y: 0,
        dropable: true,
        pickpocketable: false,
      }],
    });
    const creature = {
      ...retained(
        "obj_cre_nw_guard",
        "creature",
        "creatures",
        "nw_guard",
        "NW_GUARD",
        1,
        2,
      ),
      sourceIndex: 0,
    };

    expect(propertyPlanError(source, editing([creature], [{
      kind: "creature",
      sourceObjectId: "obj_cre_nw_guard",
      sourceIndex: 0,
      inventory: {
        expectedEntries: [{
          sourceIndex: 0,
          resRef: "nw_sword",
          x: 1,
          y: 0,
          dropable: false,
          pickpocketable: false,
        }],
        entries: [],
      },
    }])).details).toEqual([
      "obj_cre_nw_guard",
      "inventory expected entry 0 differs from exact source GIT",
    ]);
  });

  it("resolves retained Creature Tag, inventory and equipment against exact native provenance", () => {
    const source = sourceGit({
      creatureInventory: [{
        resRef: "nw_potion001",
        x: 1,
        y: 0,
        dropable: false,
        pickpocketable: false,
      }],
      creatureEquipment: [
        {
          resRef: "nw_helm001",
          slotMask: 1,
          dropable: false,
          pickpocketable: false,
        },
        {
          resRef: "nw_sword001",
          slotMask: 16,
          dropable: true,
          pickpocketable: false,
        },
      ],
    });
    const expectedInventory = [{
      sourceIndex: 0,
      resRef: "nw_potion001",
      x: 1,
      y: 0,
      dropable: false,
      pickpocketable: false,
    }];
    const expectedEquipment = [
      { sourceIndex: 0, resRef: "nw_helm001", slotMask: 1, dropable: false, pickpocketable: false },
      { sourceIndex: 1, resRef: "nw_sword001", slotMask: 16, dropable: true, pickpocketable: false },
    ];
    const creature = {
      ...retained("obj_cre_nw_guard", "creature", "creatures", "nw_guard", "NW_GUARD", 1, 2),
      sourceIndex: 0,
    };

    const plan = planExistingAreaObjectDeletions(source, editing([creature], [{
      kind: "creature",
      sourceObjectId: "obj_cre_nw_guard",
      sourceIndex: 0,
      tag: { expectedValue: "NW_GUARD", value: "NW_GUARD_RENAMED" },
      inventory: { expectedEntries: expectedInventory, entries: [] },
      equipment: {
        expectedEntries: expectedEquipment,
        entries: [{ ...expectedEquipment[0], pickpocketable: true }],
      },
    }]));

    expect(plan.propertyMutations).toEqual([{
      kind: "creature",
      sourceIndex: 0,
      tag: { expectedValue: "NW_GUARD", value: "NW_GUARD_RENAMED" },
      inventory: { expectedEntries: expectedInventory, entries: [] },
      equipment: {
        expectedEntries: expectedEquipment,
        entries: [{ ...expectedEquipment[0], pickpocketable: true }],
      },
    }]);
    expect(Object.isFrozen((plan.propertyMutations[0] as any).equipment)).toBe(true);
  });

  it("rejects stale Creature equipment slot provenance before the writer", () => {
    const source = sourceGit({
      creatureEquipment: [{
        resRef: "nw_helm001",
        slotMask: 1,
        dropable: false,
        pickpocketable: false,
      }],
    });
    const creature = {
      ...retained("obj_cre_nw_guard", "creature", "creatures", "nw_guard", "NW_GUARD", 1, 2),
      sourceIndex: 0,
    };

    expect(propertyPlanError(source, editing([creature], [{
      kind: "creature",
      sourceObjectId: "obj_cre_nw_guard",
      sourceIndex: 0,
      equipment: {
        expectedEntries: [{
          sourceIndex: 0,
          resRef: "nw_helm001",
          slotMask: 2,
          dropable: false,
          pickpocketable: false,
        }],
        entries: [],
      },
    }])).details).toEqual([
      "obj_cre_nw_guard",
      "equipment expected entry 0 differs from exact source GIT",
    ]);
  });

  it("plans empty Placeable inventory entries independently from HasInventory", () => {
    const source = sourceGit({
      includePlaceable: true,
      placeableInventory: [{ resRef: "nw_sword", x: 1, y: 0 }],
    });
    const plan = planExistingAreaObjectDeletions(source, editing(
      [retained("obj_plc_chest", "placeable", "placeables", "plc_chest", "CHEST", 4, 5)],
      [{
        kind: "placeable",
        sourceObjectId: "obj_plc_chest",
        expectedHasInventory: false,
        hasInventory: true,
        inventory: {
          expectedEntries: [{ sourceIndex: 0, resRef: "nw_sword", x: 1, y: 0 }],
          entries: [],
        },
      }],
    ));

    expect(plan.propertyMutations).toEqual([{
      kind: "placeable",
      sourceIndex: 0,
      expectedHasInventory: false,
      hasInventory: true,
      inventory: {
        expectedEntries: [{ sourceIndex: 0, resRef: "nw_sword", x: 1, y: 0 }],
        entries: [],
      },
    }]);
  });

  it.each([
    [
      "stale expected identity",
      {},
      {
        expectedEntries: [{ sourceIndex: 0, resRef: "changed", x: 1, y: 0 }],
        entries: [],
      },
      "inventory expected entry 0 differs from exact source GIT",
    ],
    [
      "stale expected coordinates",
      {},
      {
        expectedEntries: [{ sourceIndex: 0, resRef: "nw_sword", x: 2, y: 0 }],
        entries: [],
      },
      "inventory expected entry 0 differs from exact source GIT",
    ],
    [
      "stale expected Y coordinate",
      {},
      {
        expectedEntries: [{ sourceIndex: 0, resRef: "nw_sword", x: 1, y: 1 }],
        entries: [],
      },
      "inventory expected entry 0 differs from exact source GIT",
    ],
    [
      "stale expected cardinality",
      {},
      {
        expectedEntries: [],
        entries: [{
          resRef: "nw_cloth022",
          itemResRef: "nw_cloth022",
          itemSourceObjectKey: "nwn-base-key-uti-nw-cloth022-v1",
          itemSourceFingerprint: "606788a4d7e44de76e4c3f38ce4b2b7bae06d64721140995efa011066b5279a6",
          x: 0,
          y: 0,
        }],
      },
      "inventory expected count=0 actual=1",
    ],
    [
      "duplicate target source ordinal",
      {},
      {
        expectedEntries: [{ sourceIndex: 0, resRef: "nw_sword", x: 1, y: 0 }],
        entries: [
          { sourceIndex: 0, resRef: "nw_sword", x: 1, y: 0 },
          { sourceIndex: 0, resRef: "nw_sword", x: 2, y: 0 },
        ],
      },
      "inventory.entries.1.sourceIndex",
    ],
    [
      "unchanged pair",
      {},
      {
        expectedEntries: [{ sourceIndex: 0, resRef: "nw_sword", x: 1, y: 0 }],
        entries: [{ sourceIndex: 0, resRef: "nw_sword", x: 1, y: 0 }],
      },
      "must change the source value",
    ],
  ])("rejects a Placeable inventory mutation with %s", (
    _label,
    sourceOptions,
    inventory,
    expectedDiagnostic,
  ) => {
    const error = propertyPlanError(
      sourceGit({
        includePlaceable: true,
        placeableInventory: [{ resRef: "nw_sword", x: 1, y: 0 }],
        ...sourceOptions,
      }),
      editing(
        [retained("obj_plc_chest", "placeable", "placeables", "plc_chest", "CHEST", 4, 5)],
        [{ kind: "placeable", sourceObjectId: "obj_plc_chest", inventory }],
      ),
    );

    expect(error.details).toEqual(expect.arrayContaining(["obj_plc_chest"]));
    expect([error.message, ...error.details].join(" ")).toContain(expectedDiagnostic);
  });

  it("resolves provenance-bound Placeable lock byte mutations in frozen order", () => {
    const source = sourceGit({ includePlaceable: true });
    const plan = planExistingAreaObjectDeletions(source, editing(
      [
        retained("obj_cre_nw_guard", "creature", "creatures", "nw_guard", "NW_GUARD", 1, 2),
        retained("obj_plc_chest", "placeable", "placeables", "plc_chest", "CHEST", 4, 5),
      ],
      [{
        kind: "placeable",
        sourceObjectId: "obj_plc_chest",
        lockFields: [
          { field: "Locked", expectedValue: false, value: true },
          { field: "Lockable", expectedValue: false, value: true },
          { field: "AutoRemoveKey", expectedValue: false, value: true },
          { field: "KeyRequired", expectedValue: false, value: true },
          { field: "OpenLockDC", expectedValue: 18, value: 255 },
          { field: "CloseLockDC", expectedValue: 0, value: 12 },
        ],
      }],
    ));

    expect(plan.propertyMutations).toEqual([{
      kind: "placeable",
      sourceIndex: 0,
      lockFields: [
        { field: "Locked", expectedValue: false, value: true },
        { field: "Lockable", expectedValue: false, value: true },
        { field: "AutoRemoveKey", expectedValue: false, value: true },
        { field: "KeyRequired", expectedValue: false, value: true },
        { field: "OpenLockDC", expectedValue: 18, value: 255 },
        { field: "CloseLockDC", expectedValue: 0, value: 12 },
      ],
    }]);
  });

  it("resolves provenance-bound Placeable durability/save byte mutations in frozen native order", () => {
    const plan = planExistingAreaObjectDeletions(
      sourceGit({ includePlaceable: true }),
      editing(
        [retained("obj_plc_chest", "placeable", "placeables", "plc_chest", "CHEST", 4, 5)],
        [{
          kind: "placeable",
          sourceObjectId: "obj_plc_chest",
          basicByteFields: [
            { field: "Hardness", expectedValue: 5, value: 8 },
            { field: "Fort", expectedValue: 16, value: 20 },
            { field: "Ref", expectedValue: 0, value: 12 },
            { field: "Will", expectedValue: 0, value: 10 },
          ],
        }],
      ),
    );

    expect(plan.propertyMutations).toEqual([{
      kind: "placeable",
      sourceIndex: 0,
      basicByteFields: [
        { field: "Hardness", expectedValue: 5, value: 8 },
        { field: "Fort", expectedValue: 16, value: 20 },
        { field: "Ref", expectedValue: 0, value: 12 },
        { field: "Will", expectedValue: 0, value: 10 },
      ],
    }]);
    expect(Object.isFrozen((plan.propertyMutations[0] as any).basicByteFields)).toBe(true);
  });

  it("accepts an ordered proper subset of Placeable durability/save byte mutations", () => {
    const plan = planExistingAreaObjectDeletions(
      sourceGit({ includePlaceable: true }),
      editing(
        [retained("obj_plc_chest", "placeable", "placeables", "plc_chest", "CHEST", 4, 5)],
        [{
          kind: "placeable",
          sourceObjectId: "obj_plc_chest",
          basicByteFields: [
            { field: "Fort", expectedValue: 16, value: 17 },
            { field: "Will", expectedValue: 0, value: 1 },
          ],
        }],
      ),
    );

    expect(plan.propertyMutations).toEqual([{
      kind: "placeable",
      sourceIndex: 0,
      basicByteFields: [
        { field: "Fort", expectedValue: 16, value: 17 },
        { field: "Will", expectedValue: 0, value: 1 },
      ],
    }]);
  });

  it.each([
    ["non-array list", null, {}, ["obj_plc_chest", "basicByteFields invalid_list"]],
    ["empty list", [], {}, ["obj_plc_chest", "basicByteFields empty"]],
    ["null entry", [null], {}, ["obj_plc_chest", "basicByteFields entry invalid"]],
    ["array entry", [[]], {}, ["obj_plc_chest", "basicByteFields entry invalid"]],
    ["primitive entry", [1], {}, ["obj_plc_chest", "basicByteFields entry invalid"]],
    ["unsupported field", [{ field: "HP", expectedValue: 10, value: 11 }], {}, ["obj_plc_chest", "HP unsupported_basic_byte_field"]],
    ["unexpected entry key", [{ field: "Hardness", expectedValue: 5, value: 6, hp: 10 }], {}, ["obj_plc_chest", "Hardness unexpected_key=hp"]],
    ["duplicate field", [
      { field: "Hardness", expectedValue: 5, value: 6 },
      { field: "Hardness", expectedValue: 5, value: 7 },
    ], {}, ["obj_plc_chest", "Hardness duplicate"]],
    ["out-of-order field", [
      { field: "Will", expectedValue: 0, value: 1 },
      { field: "Fort", expectedValue: 16, value: 17 },
    ], {}, ["obj_plc_chest", "Fort out_of_order"]],
    ["missing expected value", [{ field: "Hardness", value: 6 }], {}, ["obj_plc_chest", "Hardness incomplete"]],
    ["missing target value", [{ field: "Hardness", expectedValue: 5 }], {}, ["obj_plc_chest", "Hardness incomplete"]],
    ["invalid expected byte", [{ field: "Hardness", expectedValue: "5", value: 6 }], {}, ["obj_plc_chest", "Hardness invalid_expected_byte"]],
    ["out-of-range target", [{ field: "Hardness", expectedValue: 5, value: 256 }], {}, ["obj_plc_chest", "Hardness invalid_byte"]],
    ["negative target", [{ field: "Hardness", expectedValue: 5, value: -1 }], {}, ["obj_plc_chest", "Hardness invalid_byte"]],
    ["fractional target", [{ field: "Hardness", expectedValue: 5, value: 1.5 }], {}, ["obj_plc_chest", "Hardness invalid_byte"]],
    ["stale provenance", [{ field: "Fort", expectedValue: 15, value: 17 }], {}, ["obj_plc_chest", "Fort expected=15 actual=16"]],
    ["unchanged target", [{ field: "Ref", expectedValue: 0, value: 0 }], {}, ["obj_plc_chest"]],
    ["missing native field", [{ field: "Will", expectedValue: 0, value: 1 }], { omitPlaceableBasicByteField: "Will" }, ["obj_plc_chest", "Will missing"]],
  ])("rejects a Placeable durability/save byte mutation with %s", (
    _label,
    basicByteFields,
    sourceOptions,
    details,
  ) => {
    expect(propertyPlanError(
      sourceGit({ includePlaceable: true, ...sourceOptions }),
      editing(
        [retained("obj_plc_chest", "placeable", "placeables", "plc_chest", "CHEST", 4, 5)],
        [{ kind: "placeable", sourceObjectId: "obj_plc_chest", basicByteFields } as never],
      ),
    ).details).toEqual(details);
  });

  it("rejects Placeable durability/save byte provenance bound to another GIT family", () => {
    expect(propertyPlanError(
      sourceGit(),
      editing(
        [retained("obj_cre_nw_guard", "creature", "creatures", "nw_guard", "NW_GUARD", 1, 2)],
        [{
          kind: "placeable",
          sourceObjectId: "obj_cre_nw_guard",
          basicByteFields: [{ field: "Hardness", expectedValue: 5, value: 6 }],
        } as never],
      ),
    ).details).toEqual(["obj_cre_nw_guard"]);
  });

  it("resolves exact Placeable Conversation and Interruptable pairs to one immutable ordinal", () => {
    const plan = planExistingAreaObjectDeletions(
      sourceGit({ includePlaceable: true }),
      editing(
        [retained("obj_plc_chest", "placeable", "placeables", "plc_chest", "CHEST", 4, 5)],
        [{
          kind: "placeable",
          sourceObjectId: "obj_plc_chest",
          conversation: { expectedResRef: "", resRef: "chest_dialog" },
          interruptable: { expectedValue: 1, value: 0 },
        }],
      ),
    );

    expect(plan.propertyMutations).toEqual([{
      kind: "placeable",
      sourceIndex: 0,
      conversation: { expectedResRef: "", resRef: "chest_dialog" },
      interruptable: { expectedValue: 1, value: 0 },
    }]);
  });

  it("resolves one exact Placeable TemplateResRef pair by immutable ordinal", () => {
    const plan = planExistingAreaObjectDeletions(
      sourceGit({ includePlaceable: true }),
      editing(
        [retained("obj_plc_chest", "placeable", "placeables", "plc_chest", "CHEST", 4, 5)],
        [{
          kind: "placeable",
          sourceObjectId: "obj_plc_chest",
          templateResRef: { expectedResRef: "plc_chest", resRef: "plc_chest_alt" },
        } as never],
      ),
    );

    expect(plan.propertyMutations).toEqual([{
      kind: "placeable",
      sourceIndex: 0,
      templateResRef: { expectedResRef: "plc_chest", resRef: "plc_chest_alt" },
    }]);
    expect(Object.isFrozen((plan.propertyMutations[0] as any).templateResRef)).toBe(true);
  });

  it.each([
    ["non-object", null, undefined, ["obj_plc_chest", "TemplateResRef invalid_pair"]],
    ["missing expected", { resRef: "plc_alt" }, undefined, ["obj_plc_chest", "TemplateResRef incomplete"]],
    ["missing target", { expectedResRef: "plc_chest" }, undefined, ["obj_plc_chest", "TemplateResRef incomplete"]],
    ["unknown key", { expectedResRef: "plc_chest", resRef: "plc_alt", extra: 1 }, undefined, ["obj_plc_chest", "TemplateResRef unexpected_key=extra"]],
    ["invalid expected", { expectedResRef: "PLC_CHEST", resRef: "plc_alt" }, undefined, ["obj_plc_chest", "TemplateResRef invalid_expected"]],
    ["invalid target", { expectedResRef: "plc_chest", resRef: "bad-alt" }, undefined, ["obj_plc_chest", "TemplateResRef invalid"]],
    ["stale", { expectedResRef: "plc_other", resRef: "plc_alt" }, undefined, ["obj_plc_chest", "TemplateResRef expected=plc_other actual=plc_chest"]],
    ["unchanged", { expectedResRef: "plc_chest", resRef: "plc_chest" }, undefined, ["obj_plc_chest"]],
    ["missing native", { expectedResRef: "plc_chest", resRef: "plc_alt" }, [], ["obj_plc_chest", "TemplateResRef missing"]],
    ["wrong native type", { expectedResRef: "plc_chest", resRef: "plc_alt" }, [{ label: "TemplateResRef", type: "cexostring", value: "plc_chest" }], ["obj_plc_chest", "TemplateResRef missing"]],
    ["duplicate native", { expectedResRef: "plc_chest", resRef: "plc_alt" }, [
      { label: "TemplateResRef", type: "resref", value: "plc_chest" },
      { label: "TemplateResRef", type: "resref", value: "plc_chest" },
    ], ["obj_plc_chest", "TemplateResRef missing"]],
  ])("rejects Placeable TemplateResRef %s", (_label, templateResRef, fields, details) => {
    expect(propertyPlanError(
      sourceGit({ includePlaceable: true, ...(fields === undefined
        ? {}
        : { placeableTemplateResRefFields: fields as readonly SupportedGffField[] }) }),
      editing(
        [retained("obj_plc_chest", "placeable", "placeables", "plc_chest", "CHEST", 4, 5)],
        [{ kind: "placeable", sourceObjectId: "obj_plc_chest", templateResRef } as never],
      ),
    ).details).toEqual(details);
  });

  it.each([
    ["non-object", null, {}, ["obj_plc_chest", "Conversation invalid_pair"]],
    ["primitive", 42, {}, ["obj_plc_chest", "Conversation invalid_pair"]],
    ["missing expected", { resRef: "dialog" }, {}, ["obj_plc_chest", "Conversation incomplete"]],
    ["missing target", { expectedResRef: "" }, {}, ["obj_plc_chest", "Conversation incomplete"]],
    ["unexpected key", { expectedResRef: "", resRef: "dialog", tag: "x" }, {}, ["obj_plc_chest", "Conversation unexpected_key=tag"]],
    ["invalid expected ResRef", { expectedResRef: "bad-dialog", resRef: "dialog" }, {}, ["obj_plc_chest", "Conversation invalid_expected"]],
    ["invalid target ResRef", { expectedResRef: "", resRef: "bad-dialog" }, {}, ["obj_plc_chest", "Conversation invalid"]],
    ["stale provenance", { expectedResRef: "other", resRef: "dialog" }, {}, ["obj_plc_chest", "Conversation expected=other actual="]],
    ["unchanged target", { expectedResRef: "", resRef: "" }, {}, ["obj_plc_chest"]],
    ["missing native field", { expectedResRef: "", resRef: "dialog" }, { omitPlaceableConversation: true }, ["obj_plc_chest", "Conversation missing"]],
  ])("rejects a Placeable Conversation mutation with %s", (
    _label,
    conversation,
    sourceOptions,
    details,
  ) => {
    expect(propertyPlanError(
      sourceGit({ includePlaceable: true, ...sourceOptions }),
      editing(
        [retained("obj_plc_chest", "placeable", "placeables", "plc_chest", "CHEST", 4, 5)],
        [{ kind: "placeable", sourceObjectId: "obj_plc_chest", conversation } as never],
      ),
    ).details).toEqual(details);
  });

  it.each([
    ["non-object", null, {}, ["obj_plc_chest", "Interruptable invalid_pair"]],
    ["primitive", 42, {}, ["obj_plc_chest", "Interruptable invalid_pair"]],
    ["missing expected", { value: 0 }, {}, ["obj_plc_chest", "Interruptable incomplete"]],
    ["missing target", { expectedValue: 1 }, {}, ["obj_plc_chest", "Interruptable incomplete"]],
    ["unexpected key", { expectedValue: 1, value: 0, noInterrupt: true }, {}, ["obj_plc_chest", "Interruptable unexpected_key=noInterrupt"]],
    ["invalid expected byte", { expectedValue: true, value: 0 }, {}, ["obj_plc_chest", "Interruptable invalid_expected"]],
    ["invalid target byte", { expectedValue: 1, value: 2 }, {}, ["obj_plc_chest", "Interruptable invalid"]],
    ["stale provenance", { expectedValue: 0, value: 1 }, {}, ["obj_plc_chest", "Interruptable expected=0 actual=1"]],
    ["unchanged target", { expectedValue: 1, value: 1 }, {}, ["obj_plc_chest"]],
    ["missing native field", { expectedValue: 1, value: 0 }, { omitPlaceableInterruptable: true }, ["obj_plc_chest", "Interruptable missing"]],
  ])("rejects a Placeable Interruptable mutation with %s", (
    _label,
    interruptable,
    sourceOptions,
    details,
  ) => {
    expect(propertyPlanError(
      sourceGit({ includePlaceable: true, ...sourceOptions }),
      editing(
        [retained("obj_plc_chest", "placeable", "placeables", "plc_chest", "CHEST", 4, 5)],
        [{ kind: "placeable", sourceObjectId: "obj_plc_chest", interruptable } as never],
      ),
    ).details).toEqual(details);
  });

  it("rejects Placeable Conversation/Interruptable provenance bound to another GIT family", () => {
    expect(propertyPlanError(
      sourceGit(),
      editing(
        [retained("obj_cre_nw_guard", "creature", "creatures", "nw_guard", "NW_GUARD", 1, 2)],
        [{
          kind: "placeable",
          sourceObjectId: "obj_cre_nw_guard",
          conversation: { expectedResRef: "", resRef: "dialog" },
        } as never],
      ),
    ).details).toEqual(["obj_cre_nw_guard"]);
  });

  it("resolves one exact provenance-bound Placeable AnimationState pair", () => {
    const plan = planExistingAreaObjectDeletions(
      sourceGit({ includePlaceable: true }),
      editing(
        [retained("obj_plc_chest", "placeable", "placeables", "plc_chest", "CHEST", 4, 5)],
        [{
          kind: "placeable",
          sourceObjectId: "obj_plc_chest",
          animationState: { expectedValue: 0, value: 2 },
        } as never],
      ),
    );

    expect(plan.propertyMutations).toEqual([{
      kind: "placeable",
      sourceIndex: 0,
      animationState: { expectedValue: 0, value: 2 },
    }]);
    expect(Object.isFrozen((plan.propertyMutations[0] as any).animationState)).toBe(true);
  });

  it("resolves one exact native Placeable HP / derived CurrentHP pair", () => {
    const hitPoints = {
      expectedHitPoints: 15,
      hitPoints: 30,
      expectedCurrentHitPoints: 45,
      currentHitPoints: 90,
    };
    const plan = planExistingAreaObjectDeletions(
      sourceGit({ includePlaceable: true }),
      editing(
        [retained("obj_plc_chest", "placeable", "placeables", "plc_chest", "CHEST", 4, 5)],
        [{ kind: "placeable", sourceObjectId: "obj_plc_chest", hitPoints } as never],
      ),
    );

    expect(plan.propertyMutations).toEqual([{
      kind: "placeable",
      sourceIndex: 0,
      hitPoints,
    }]);
    expect(Object.isFrozen((plan.propertyMutations[0] as any).hitPoints)).toBe(true);
  });

  it("resolves an explicit Placeable Tag delta by immutable family ordinal instead of tag-derived ID", () => {
    const sourceObjectId = "retained_diagnostic_id";
    const retainedPlaceable = {
      ...retained(sourceObjectId, "placeable", "placeables", "plc_chest", " New Chest ", 4, 5),
      sourceIndex: 0,
    };
    const plan = planExistingAreaObjectDeletions(
      sourceGit({ includePlaceable: true }),
      editing(
        [retainedPlaceable],
        [{
          kind: "placeable",
          sourceObjectId: "unrelated_mutation_diagnostic_id",
          sourceIndex: 0,
          tag: { expectedValue: "CHEST", value: " New Chest " },
        } as never],
      ),
    );

    expect(plan.deletions).toEqual([
      { kind: "creature", sourceIndex: 0 },
      { kind: "item", sourceIndex: 0 },
    ]);
    expect(plan.propertyMutations).toEqual([{
      kind: "placeable",
      sourceIndex: 0,
      tag: { expectedValue: "CHEST", value: " New Chest " },
    }]);
  });

  it("resolves exact bounded LocName and Description pairs by immutable family ordinal", () => {
    const plan = planExistingAreaObjectDeletions(
      sourceGit({
        includePlaceable: true,
        placeableLocalizedStringFields: [
          {
            label: "LocName",
            type: "cexolocstring",
            value: { strRef: 0xffff_ffff, entries: [{ languageId: 0, text: "Chest" }] },
          },
          {
            label: "Description",
            type: "cexolocstring",
            value: { strRef: 0xffff_ffff, entries: [{ languageId: 0, text: "Storage" }] },
          },
        ],
      }),
      editing(
        [{
          ...retained("obj_plc_chest", "placeable", "placeables", "plc_chest", "CHEST", 4, 5),
          sourceIndex: 0,
        }],
        [{
          kind: "placeable",
          sourceObjectId: "diagnostic_only",
          sourceIndex: 0,
          localizedStrings: [
            { field: "LocName", expectedValue: "Chest", value: " Chest " },
            { field: "Description", expectedValue: "Storage", value: "Storage room" },
          ],
        } as never],
      ),
    );

    expect(plan.propertyMutations).toEqual([{
      kind: "placeable",
      sourceIndex: 0,
      localizedStrings: [
        { field: "LocName", expectedValue: "Chest", value: " Chest " },
        { field: "Description", expectedValue: "Storage", value: "Storage room" },
      ],
    }]);
    expect(Object.isFrozen((plan.propertyMutations[0] as any).localizedStrings)).toBe(true);
  });

  it("revalidates and detaches a complete ordered Placeable localized-string CAS", () => {
    const localizedStrings = [{
      field: "LocName",
      expectedValue: "Chest",
      value: "Chest",
      expectedProfile: "multi_entry_inline_ascii",
      expectedEntries: [
        { languageId: 0, text: "Chest" },
        { languageId: 2, text: "Coffre" },
      ],
      valueEntries: [
        { languageId: 10, text: "Skrzynia" },
        { languageId: 0, text: "Chest" },
      ],
    }];
    const plan = planExistingAreaObjectDeletions(
      sourceGit({
        includePlaceable: true,
        placeableLocalizedStringFields: [{
          label: "LocName",
          type: "cexolocstring",
          value: {
            strRef: 0xffff_ffff,
            entries: [
              { languageId: 0, text: "Chest" },
              { languageId: 2, text: "Coffre" },
            ],
          },
        }],
      }),
      editing(
        [{
          ...retained("obj_plc_chest", "placeable", "placeables", "plc_chest", "CHEST", 4, 5),
          sourceIndex: 0,
        }],
        [{
          kind: "placeable",
          sourceObjectId: "diagnostic_only",
          sourceIndex: 0,
          localizedStrings,
        } as never],
      ),
    );

    expect(plan.propertyMutations).toEqual([{
      kind: "placeable",
      sourceIndex: 0,
      localizedStrings,
    }]);
    const plannedMutation = (plan.propertyMutations[0] as any).localizedStrings[0];
    expect(plannedMutation.expectedEntries).not.toBe(localizedStrings[0]!.expectedEntries);
    expect(Object.isFrozen(plannedMutation.valueEntries)).toBe(true);
  });

  it.each([
    ["stale expected value", [
      { label: "LocName", type: "cexolocstring" as const, value: {
        strRef: 0xffff_ffff,
        entries: [{ languageId: 0, text: "Actual" }],
      } },
      { label: "Description", type: "cexolocstring" as const, value: {
        strRef: 0xffff_ffff,
        entries: [],
      } },
    ], [{ field: "LocName", expectedValue: "Expected", value: "New" }], "LocName expected=Expected actual=Actual"],
    ["TLK-backed source", [
      { label: "LocName", type: "cexolocstring" as const, value: { strRef: 1, entries: [] } },
      { label: "Description", type: "cexolocstring" as const, value: {
        strRef: 0xffff_ffff,
        entries: [],
      } },
    ], [{ field: "LocName", expectedValue: "", value: "New" }], "LocName unsupported_source"],
    ["wrong native type", [
      { label: "LocName", type: "cexostring" as const, value: "Chest" },
      { label: "Description", type: "cexolocstring" as const, value: {
        strRef: 0xffff_ffff,
        entries: [],
      } },
    ], [{ field: "LocName", expectedValue: "Chest", value: "New" }], "LocName unsupported_source"],
    ["reordered pair", [
      { label: "LocName", type: "cexolocstring" as const, value: {
        strRef: 0xffff_ffff,
        entries: [{ languageId: 0, text: "Chest" }],
      } },
      { label: "Description", type: "cexolocstring" as const, value: {
        strRef: 0xffff_ffff,
        entries: [{ languageId: 0, text: "Storage" }],
      } },
    ], [
      { field: "Description", expectedValue: "Storage", value: "New description" },
      { field: "LocName", expectedValue: "Chest", value: "New name" },
    ], "localizedStrings invalid_pair"],
  ])("rejects a bounded localized-string mutation with %s", (
    _label,
    placeableLocalizedStringFields,
    localizedStrings,
    detail,
  ) => {
    const error = propertyPlanError(
      sourceGit({ includePlaceable: true, placeableLocalizedStringFields }),
      editing(
        [{
          ...retained("obj_plc_chest", "placeable", "placeables", "plc_chest", "CHEST", 4, 5),
          sourceIndex: 0,
        }],
        [{
          kind: "placeable",
          sourceObjectId: "obj_plc_chest",
          sourceIndex: 0,
          localizedStrings,
        } as never],
      ),
    );
    expect(error.details).toContain(detail);
  });

  it("compares an exact whitespace-bearing native Placeable Tag without generic trimming", () => {
    const sourceObjectId = "diagnostic_id_from_old_snapshot";
    const retainedPlaceable = {
      ...retained(sourceObjectId, "placeable", "placeables", "plc_chest", "new", 4, 5),
      sourceIndex: 0,
    };
    const plan = planExistingAreaObjectDeletions(
      sourceGit({ includePlaceable: true, placeableTag: " CHEST " }),
      editing([retainedPlaceable], [{
        kind: "placeable",
        sourceObjectId,
        sourceIndex: 0,
        tag: { expectedValue: " CHEST ", value: "new" },
      } as never]),
    );
    expect(plan.propertyMutations).toEqual([{
      kind: "placeable",
      sourceIndex: 0,
      tag: { expectedValue: " CHEST ", value: "new" },
    }]);
  });

  it("rejects a Tag pair whose target differs from the retained ordinal target", () => {
    const sourceObjectId = "diagnostic_id_from_old_snapshot";
    const retainedPlaceable = {
      ...retained(sourceObjectId, "placeable", "placeables", "plc_chest", "different", 4, 5),
      sourceIndex: 0,
    };
    expect(propertyPlanError(
      sourceGit({ includePlaceable: true }),
      editing([retainedPlaceable], [{
        kind: "placeable",
        sourceObjectId,
        sourceIndex: 0,
        tag: { expectedValue: "CHEST", value: "new" },
      } as never]),
    ).details).toContain("tag expected=CHEST actual=different");
  });

  it("rejects a Tag mutation when the exact native Placeable Tag is absent", () => {
    const sourceObjectId = "diagnostic_id_from_old_snapshot";
    const retainedPlaceable = {
      ...retained(sourceObjectId, "placeable", "placeables", "plc_chest", "new", 4, 5),
      sourceIndex: 0,
    };
    expect(propertyPlanError(
      sourceGit({ includePlaceable: true, placeableTagFields: [] }),
      editing([retainedPlaceable], [{
        kind: "placeable",
        sourceObjectId,
        sourceIndex: 0,
        tag: { expectedValue: "CHEST", value: "new" },
      } as never]),
    ).details).toEqual(expect.arrayContaining(["Tag missing"]));
  });

  it.each([
    ["missing mutation ordinal", undefined, { expectedValue: "CHEST", value: "new" }, ["ordinal missing"]],
    ["wrong mutation ordinal", 1, { expectedValue: "CHEST", value: "new" }, ["ordinal=1"]],
    ["stale expected value", 0, { expectedValue: "OLD", value: "new" }, ["Tag expected=OLD actual=CHEST"]],
    ["invalid pair", 0, { expectedValue: "CHEST", value: "x".repeat(33) }, ["Tag invalid_pair"]],
  ])("rejects a Placeable Tag mutation with %s", (_label, sourceIndex, tag, details) => {
    const sourceObjectId = "diagnostic_id_from_old_snapshot";
    const retainedPlaceable = {
      ...retained(sourceObjectId, "placeable", "placeables", "plc_chest", "new", 4, 5),
      sourceIndex: 0,
    };
    expect(propertyPlanError(
      sourceGit({ includePlaceable: true }),
      editing(
        [retainedPlaceable],
        [{ kind: "placeable", sourceObjectId, sourceIndex, tag } as never],
      ),
    ).details).toEqual(expect.arrayContaining(details));
  });

  it.each([
    ["invalid pair", null, undefined, ["obj_plc_chest", "HP invalid_pair"]],
    ["unexpected key", {
      expectedHitPoints: 15, hitPoints: 30, expectedCurrentHitPoints: 45, currentHitPoints: 90, extra: true,
    }, undefined, ["obj_plc_chest", "HP invalid_pair"]],
    ["incorrect derived CurrentHP", {
      expectedHitPoints: 15, hitPoints: 30, expectedCurrentHitPoints: 45, currentHitPoints: 89,
    }, undefined, ["obj_plc_chest", "HP invalid_pair"]],
    ["stale HP", {
      expectedHitPoints: 14, hitPoints: 30, expectedCurrentHitPoints: 45, currentHitPoints: 90,
    }, undefined, ["obj_plc_chest", "HP expected=14 actual=15"]],
    ["stale CurrentHP", {
      expectedHitPoints: 15, hitPoints: 30, expectedCurrentHitPoints: 44, currentHitPoints: 60,
    }, undefined, ["obj_plc_chest", "CurrentHP expected=44 actual=45"]],
    ["missing native pair", {
      expectedHitPoints: 15, hitPoints: 30, expectedCurrentHitPoints: 45, currentHitPoints: 90,
    }, [], ["obj_plc_chest", "HP missing"]],
    ["wrong native HP type", {
      expectedHitPoints: 15, hitPoints: 30, expectedCurrentHitPoints: 45, currentHitPoints: 90,
    }, [
      { label: "HP", type: "word", value: 15 },
      { label: "CurrentHP", type: "short", value: 45 },
    ], ["obj_plc_chest", "HP missing"]],
    ["noncanonical native label", {
      expectedHitPoints: 15, hitPoints: 30, expectedCurrentHitPoints: 45, currentHitPoints: 90,
    }, [
      { label: "hp", type: "short", value: 15 },
      { label: "CurrentHP", type: "short", value: 45 },
    ], ["obj_plc_chest", "HP missing"]],
  ])("rejects a Placeable HP mutation with %s", (_label, hitPoints, fields, details) => {
    expect(propertyPlanError(
      sourceGit({ includePlaceable: true, placeableHitPointFields: fields as any }),
      editing(
        [retained("obj_plc_chest", "placeable", "placeables", "plc_chest", "CHEST", 4, 5)],
        [{ kind: "placeable", sourceObjectId: "obj_plc_chest", hitPoints } as never],
      ),
    ).details).toEqual(details);
  });

  it("resolves one exact digest-bound Placeable Appearance DWord pair", () => {
    const appearance = {
      expectedValue: 104,
      value: 105,
      tableSha256: "c".repeat(64),
      rowCount: 200,
    };
    const plan = planExistingAreaObjectDeletions(
      sourceGit({
        includePlaceable: true,
        placeableAppearanceFields: [{ label: "Appearance", type: "dword", value: 104 }],
      }),
      editing(
        [retained("obj_plc_chest", "placeable", "placeables", "plc_chest", "CHEST", 4, 5)],
        [{ kind: "placeable", sourceObjectId: "obj_plc_chest", appearance } as never],
      ),
    );

    expect(plan.propertyMutations).toEqual([{
      kind: "placeable",
      sourceIndex: 0,
      appearance,
    }]);
    expect(Object.isFrozen((plan.propertyMutations[0] as any).appearance)).toBe(true);
  });

  it.each([
    ["invalid pair", null, [{ label: "Appearance", type: "dword", value: 104 }], ["obj_plc_chest", "Appearance invalid_pair"]],
    ["unexpected key", { expectedValue: 104, value: 105, tableSha256: "c".repeat(64), rowCount: 200, label: "Chest" }, [{ label: "Appearance", type: "dword", value: 104 }], ["obj_plc_chest", "Appearance invalid_pair"]],
    ["stale expected", { expectedValue: 103, value: 105, tableSha256: "c".repeat(64), rowCount: 200 }, [{ label: "Appearance", type: "dword", value: 104 }], ["obj_plc_chest", "Appearance expected=103 actual=104"]],
    ["missing native field", { expectedValue: 104, value: 105, tableSha256: "c".repeat(64), rowCount: 200 }, [], ["obj_plc_chest", "Appearance missing_canonical_dword"]],
    ["legacy Byte native field", { expectedValue: 104, value: 105, tableSha256: "c".repeat(64), rowCount: 200 }, [{ label: "Appearance", type: "byte", value: 104 }], ["obj_plc_chest", "Appearance missing_canonical_dword"]],
    ["unchanged", { expectedValue: 104, value: 104, tableSha256: "c".repeat(64), rowCount: 200 }, [{ label: "Appearance", type: "dword", value: 104 }], ["obj_plc_chest", "Appearance invalid_pair"]],
  ])("rejects a Placeable Appearance mutation with %s", (_label, appearance, fields, details) => {
    expect(propertyPlanError(
      sourceGit({ includePlaceable: true, placeableAppearanceFields: fields as any }),
      editing(
        [retained("obj_plc_chest", "placeable", "placeables", "plc_chest", "CHEST", 4, 5)],
        [{ kind: "placeable", sourceObjectId: "obj_plc_chest", appearance } as never],
      ),
    ).details).toEqual(details);
  });

  it("resolves one exact digest-bound Placeable TrapType Byte pair", () => {
    const trapType = {
      expectedValue: 3,
      value: 7,
      tableSha256: "d".repeat(64),
      tableRowCount: 48,
    };
    const plan = planExistingAreaObjectDeletions(
      sourceGit({
        includePlaceable: true,
        placeableTrapTypeFields: [{ label: "TrapType", type: "byte", value: 3 }],
      }),
      editing(
        [retained("obj_plc_chest", "placeable", "placeables", "plc_chest", "CHEST", 4, 5)],
        [{ kind: "placeable", sourceObjectId: "obj_plc_chest", trapType } as never],
      ),
    );

    expect(plan.propertyMutations).toEqual([{
      kind: "placeable",
      sourceIndex: 0,
      trapType,
    }]);
  });

  it.each([
    ["invalid pair", null, [{ label: "TrapType", type: "byte", value: 3 }], ["obj_plc_chest", "TrapType invalid_pair"]],
    ["stale expected", { expectedValue: 2, value: 7, tableSha256: "d".repeat(64), tableRowCount: 48 }, [{ label: "TrapType", type: "byte", value: 3 }], ["obj_plc_chest", "TrapType expected=2 actual=3"]],
    ["missing native field", { expectedValue: 3, value: 7, tableSha256: "d".repeat(64), tableRowCount: 48 }, [], ["obj_plc_chest", "TrapType missing_canonical_byte"]],
    ["wrong native type", { expectedValue: 3, value: 7, tableSha256: "d".repeat(64), tableRowCount: 48 }, [{ label: "TrapType", type: "word", value: 3 }], ["obj_plc_chest", "TrapType missing_canonical_byte"]],
  ])("rejects a Placeable TrapType mutation with %s", (_label, trapType, fields, details) => {
    expect(propertyPlanError(
      sourceGit({ includePlaceable: true, placeableTrapTypeFields: fields as any }),
      editing(
        [retained("obj_plc_chest", "placeable", "placeables", "plc_chest", "CHEST", 4, 5)],
        [{ kind: "placeable", sourceObjectId: "obj_plc_chest", trapType } as never],
      ),
    ).details).toEqual(details);
  });

  it("resolves and stale-checks one exact digest-bound Placeable BodyBag Byte pair", () => {
    const bodyBag = {
      expectedValue: 0,
      value: 3,
      tableSha256: "e".repeat(64),
      tableRowCount: 7,
    };
    const plan = planExistingAreaObjectDeletions(
      sourceGit({
        includePlaceable: true,
        placeableBodyBagFields: [{ label: "BodyBag", type: "byte", value: 0 }],
      }),
      editing(
        [retained("obj_plc_chest", "placeable", "placeables", "plc_chest", "CHEST", 4, 5)],
        [{ kind: "placeable", sourceObjectId: "obj_plc_chest", bodyBag } as never],
      ),
    );
    expect(plan.propertyMutations).toEqual([{ kind: "placeable", sourceIndex: 0, bodyBag }]);

    for (const [candidate, fields, details] of [
      [null, [{ label: "BodyBag", type: "byte", value: 0 }], ["obj_plc_chest", "BodyBag invalid_pair"]],
      [{ ...bodyBag, expectedValue: 1 }, [{ label: "BodyBag", type: "byte", value: 0 }], ["obj_plc_chest", "BodyBag expected=1 actual=0"]],
      [bodyBag, [], ["obj_plc_chest", "BodyBag missing_canonical_byte"]],
      [bodyBag, [{ label: "BodyBag", type: "word", value: 0 }], ["obj_plc_chest", "BodyBag missing_canonical_byte"]],
    ] as const) {
      expect(propertyPlanError(
        sourceGit({ includePlaceable: true, placeableBodyBagFields: fields as any }),
        editing(
          [retained("obj_plc_chest", "placeable", "placeables", "plc_chest", "CHEST", 4, 5)],
          [{ kind: "placeable", sourceObjectId: "obj_plc_chest", bodyBag: candidate } as never],
        ),
      ).details).toEqual(details);
    }
  });

  it("resolves and stale-checks one exact digest-bound Placeable PortraitId Word pair", () => {
    const portrait = {
      expectedValue: 462,
      value: 463,
      tableSha256: "a".repeat(64),
      tableRowCount: 700,
    };
    const plan = planExistingAreaObjectDeletions(
      sourceGit({
        includePlaceable: true,
        placeablePortraitFields: [{ label: "PortraitId", type: "word", value: 462 }],
      }),
      editing(
        [retained("obj_plc_chest", "placeable", "placeables", "plc_chest", "CHEST", 4, 5)],
        [{ kind: "placeable", sourceObjectId: "obj_plc_chest", portrait } as never],
      ),
    );
    expect(plan.propertyMutations).toEqual([{ kind: "placeable", sourceIndex: 0, portrait }]);

    for (const [candidate, fields, details] of [
      [null, [{ label: "PortraitId", type: "word", value: 462 }], ["obj_plc_chest", "PortraitId invalid_pair"]],
      [{ ...portrait, expectedValue: 461 }, [{ label: "PortraitId", type: "word", value: 462 }], ["obj_plc_chest", "PortraitId expected=461 actual=462"]],
      [portrait, [], ["obj_plc_chest", "PortraitId missing_canonical_word"]],
      [portrait, [{ label: "PortraitId", type: "dword", value: 462 }], ["obj_plc_chest", "PortraitId missing_canonical_word"]],
    ] as const) {
      expect(propertyPlanError(
        sourceGit({ includePlaceable: true, placeablePortraitFields: fields as any }),
        editing(
          [retained("obj_plc_chest", "placeable", "placeables", "plc_chest", "CHEST", 4, 5)],
          [{ kind: "placeable", sourceObjectId: "obj_plc_chest", portrait: candidate } as never],
        ),
      ).details).toEqual(details);
    }
  });

  it("resolves and stale-checks one exact digest-bound Placeable Faction DWord pair", () => {
    const faction = {
      expectedValue: 2,
      value: 3,
      catalogSha256: "f".repeat(64),
      catalogFactionCount: 5,
    };
    const plan = planExistingAreaObjectDeletions(
      sourceGit({
        includePlaceable: true,
        placeableFactionFields: [{ label: "Faction", type: "dword", value: 2 }],
      }),
      editing(
        [retained("obj_plc_chest", "placeable", "placeables", "plc_chest", "CHEST", 4, 5)],
        [{ kind: "placeable", sourceObjectId: "obj_plc_chest", faction } as never],
      ),
    );
    expect(plan.propertyMutations).toEqual([{ kind: "placeable", sourceIndex: 0, faction }]);

    for (const [candidate, fields, details] of [
      [null, [{ label: "Faction", type: "dword", value: 2 }], ["obj_plc_chest", "Faction invalid_pair"]],
      [{ ...faction, expectedValue: 1 }, [{ label: "Faction", type: "dword", value: 2 }], ["obj_plc_chest", "Faction expected=1 actual=2"]],
      [faction, [], ["obj_plc_chest", "Faction missing_canonical_dword"]],
      [faction, [{ label: "Faction", type: "word", value: 2 }], ["obj_plc_chest", "Faction missing_canonical_dword"]],
    ] as const) {
      expect(propertyPlanError(
        sourceGit({ includePlaceable: true, placeableFactionFields: fields as any }),
        editing(
          [retained("obj_plc_chest", "placeable", "placeables", "plc_chest", "CHEST", 4, 5)],
          [{ kind: "placeable", sourceObjectId: "obj_plc_chest", faction: candidate } as never],
        ),
      ).details).toEqual(details);
    }
  });

  it("resolves and stale-checks one exact ordered Placeable VarTable mutation", () => {
    const nativeVariables: SupportedGffField[] = [{
      label: "VarTable", type: "list", value: [
        { typeId: 0, fields: [
          { label: "Name", type: "cexostring", value: "Counter" },
          { label: "Type", type: "dword", value: 1 },
          { label: "Value", type: "int", value: 1 },
        ] },
      ],
    }];
    const variables = {
      expectedEntries: [{ sourceIndex: 0, name: "Counter", type: "int" as const, value: 1 }],
      entries: [{ name: "Counter", type: "int" as const, value: 2 }],
    };
    const plan = planExistingAreaObjectDeletions(
      sourceGit({ includePlaceable: true, placeableVariableFields: nativeVariables }),
      editing(
        [retained("obj_plc_chest", "placeable", "placeables", "plc_chest", "CHEST", 4, 5)],
        [{ kind: "placeable", sourceObjectId: "obj_plc_chest", variables } as never],
      ),
    );
    expect(plan.propertyMutations).toEqual([{
      kind: "placeable", sourceIndex: 0, variables,
    }]);

    expect(propertyPlanError(
      sourceGit({ includePlaceable: true, placeableVariableFields: nativeVariables }),
      editing(
        [retained("obj_plc_chest", "placeable", "placeables", "plc_chest", "CHEST", 4, 5)],
        [{ kind: "placeable", sourceObjectId: "obj_plc_chest", variables: {
          ...variables,
          expectedEntries: [{ sourceIndex: 0, name: "Counter", type: "int", value: 9 }],
        } } as never],
      ),
    ).details).toEqual(["obj_plc_chest", "VarTable stale"]);
  });

  it("admits adding the first Placeable variable only when native VarTable is absent", () => {
    const variables = {
      expectedEntries: [],
      entries: [{ name: "Created", type: "string" as const, value: "yes" }],
    };
    const plan = planExistingAreaObjectDeletions(
      sourceGit({ includePlaceable: true }),
      editing(
        [retained("obj_plc_chest", "placeable", "placeables", "plc_chest", "CHEST", 4, 5)],
        [{ kind: "placeable", sourceObjectId: "obj_plc_chest", variables } as never],
      ),
    );
    expect(plan.propertyMutations[0]).toMatchObject({ variables });
    expect(propertyPlanError(
      sourceGit({ includePlaceable: true, placeableVariableFields: [{
        label: "vartable", type: "list", value: [],
      }] }),
      editing(
        [retained("obj_plc_chest", "placeable", "placeables", "plc_chest", "CHEST", 4, 5)],
        [{ kind: "placeable", sourceObjectId: "obj_plc_chest", variables } as never],
      ),
    ).details).toEqual(["obj_plc_chest", "VarTable malformed_or_unsupported"]);
  });

  it.each([
    ["non-object", null, {}, ["obj_plc_chest", "AnimationState invalid_pair"]],
    ["primitive", 42, {}, ["obj_plc_chest", "AnimationState invalid_pair"]],
    ["array", [], {}, ["obj_plc_chest", "AnimationState invalid_pair"]],
    ["missing expected", { value: 1 }, {}, ["obj_plc_chest", "AnimationState incomplete"]],
    ["missing target", { expectedValue: 0 }, {}, ["obj_plc_chest", "AnimationState incomplete"]],
    ["unexpected key", { expectedValue: 0, value: 1, openState: 1 }, {}, ["obj_plc_chest", "AnimationState unexpected_key=openState"]],
    ["negative expected", { expectedValue: -1, value: 1 }, {}, ["obj_plc_chest", "AnimationState invalid_expected"]],
    ["fractional expected", { expectedValue: 0.5, value: 1 }, {}, ["obj_plc_chest", "AnimationState invalid_expected"]],
    ["out-of-set target", { expectedValue: 0, value: 3 }, {}, ["obj_plc_chest", "AnimationState invalid"]],
    ["stale provenance", { expectedValue: 1, value: 2 }, {}, ["obj_plc_chest", "AnimationState expected=1 actual=0"]],
    ["unchanged target", { expectedValue: 0, value: 0 }, {}, ["obj_plc_chest"]],
    ["missing native field", { expectedValue: 0, value: 1 }, { omitPlaceableAnimationState: true }, ["obj_plc_chest", "AnimationState missing"]],
    ["wrong native type", { expectedValue: 0, value: 1 }, {
      placeableAnimationStateFields: [{ label: "AnimationState", type: "word", value: 0 }],
    }, ["obj_plc_chest", "AnimationState missing"]],
    ["out-of-set native byte", { expectedValue: 0, value: 1 }, {
      placeableAnimationStateFields: [{ label: "AnimationState", type: "byte", value: 3 }],
    }, ["obj_plc_chest", "AnimationState missing"]],
  ])("rejects a Placeable AnimationState mutation with %s", (
    _label,
    animationState,
    sourceOptions,
    details,
  ) => {
    expect(propertyPlanError(
      sourceGit({ includePlaceable: true, ...sourceOptions } as any),
      editing(
        [retained("obj_plc_chest", "placeable", "placeables", "plc_chest", "CHEST", 4, 5)],
        [{ kind: "placeable", sourceObjectId: "obj_plc_chest", animationState } as never],
      ),
    ).details).toEqual(details);
  });

  it("rejects Placeable AnimationState provenance bound to another GIT family", () => {
    expect(propertyPlanError(
      sourceGit(),
      editing(
        [retained("obj_cre_nw_guard", "creature", "creatures", "nw_guard", "NW_GUARD", 1, 2)],
        [{
          kind: "placeable",
          sourceObjectId: "obj_cre_nw_guard",
          animationState: { expectedValue: 0, value: 1 },
        } as never],
      ),
    ).details).toEqual(["obj_cre_nw_guard"]);
  });

  it("rejects a Placeable AnimationState mutation colliding with implicit deletion", () => {
    expect(propertyPlanError(
      sourceGit({ includePlaceable: true }),
      editing([], [{
        kind: "placeable",
        sourceObjectId: "obj_plc_chest",
        animationState: { expectedValue: 0, value: 1 },
      } as never]),
    ).details).toEqual(["obj_plc_chest"]);
  });

  it("resolves one exact provenance-bound paired-GIC Placeable editor comment", () => {
    const plan = planExistingAreaObjectDeletions(
      sourceGit({ includePlaceable: true }),
      editing(
        [retained("obj_plc_chest", "placeable", "placeables", "plc_chest", "CHEST", 4, 5)],
        [{
          kind: "placeable",
          sourceObjectId: "obj_plc_chest",
          editorComment: { expectedValue: "Water Trough", value: "West wall trough" },
        } as never],
      ),
      sourceGic(["Water Trough"]),
    );

    expect(plan.propertyMutations).toEqual([{
      kind: "placeable",
      sourceIndex: 0,
      editorComment: { expectedValue: "Water Trough", value: "West wall trough" },
    }]);
    expect(Object.isFrozen((plan.propertyMutations[0] as any).editorComment)).toBe(true);
  });

  it("resolves one exact provenance-bound paired-GIC Creature editor comment", () => {
    const plan = planExistingAreaObjectDeletions(
      sourceGit(),
      editing(
        [retained("obj_cre_nw_guard", "creature", "creatures", "nw_guard", "NW_GUARD", 1, 2)],
        [{
          kind: "creature",
          sourceObjectId: "obj_cre_nw_guard",
          sourceIndex: 0,
          editorComment: { expectedValue: "Guard", value: "West gate guard" },
        } as never],
      ),
      sourceGic([], { creatureComments: ["Guard"] }),
    );

    expect(plan.propertyMutations).toEqual([{
      kind: "creature",
      sourceIndex: 0,
      editorComment: { expectedValue: "Guard", value: "West gate guard" },
    }]);
    expect(Object.isFrozen((plan.propertyMutations[0] as any).editorComment)).toBe(true);
  });

  it("resolves one exact provenance-bound paired-GIC ground-item editor comment", () => {
    const plan = planExistingAreaObjectDeletions(
      sourceGit(),
      editing(
        [
          retained("obj_cre_nw_guard", "creature", "creatures", "nw_guard", "NW_GUARD", 1, 2),
          retained("obj_itm_nw_sword", "item", "items", "nw_sword", "NW_SWORD", 3, 4),
        ],
        [{
          kind: "item",
          sourceObjectId: "obj_itm_nw_sword",
          sourceIndex: 0,
          editorComment: { expectedValue: "Ground item", value: "West wall item" },
        } as never],
      ),
      sourceGic([], { creatureComments: [""], itemComments: ["Ground item"] }),
    );

    expect(plan.propertyMutations).toEqual([{
      kind: "item",
      sourceIndex: 0,
      editorComment: { expectedValue: "Ground item", value: "West wall item" },
    }]);
  });

  it("resolves one exact provenance-bound paired-GIC Store editor comment", () => {
    const plan = planExistingAreaObjectDeletions(
      sourceGit({ includeStore: true }),
      editing(
        [
          retained("obj_cre_nw_guard", "creature", "creatures", "nw_guard", "NW_GUARD", 1, 2),
          retained(
            "obj_sto_x2_merc_dye",
            "store",
            "stores",
            "x2_merc_dye",
            "x2_merc_dye",
            4.291445541381836,
            5.039402770996094,
          ),
        ],
        [{
          kind: "store",
          sourceObjectId: "obj_sto_x2_merc_dye",
          sourceIndex: 0,
          editorComment: {
            expectedValue: "Sample Dye Store",
            value: "West wall dye merchant",
          },
        } as never],
      ),
      sourceGic([], {
        creatureComments: [""],
        itemComments: [""],
        storeComments: ["Sample Dye Store"],
      }),
    );

    expect(plan.propertyMutations).toEqual([{
      kind: "store",
      sourceIndex: 0,
      editorComment: {
        expectedValue: "Sample Dye Store",
        value: "West wall dye merchant",
      },
    }]);
    expect(Object.isFrozen((plan.propertyMutations[0] as any).editorComment)).toBe(true);
  });

  it("resolves one exact provenance-bound paired-GIC Encounter editor comment", () => {
    const plan = planExistingAreaObjectDeletions(
      sourceGit({ includeEncounter: true }),
      editing(
        [{ ...retained(
          "obj_enc_x2_gnoll001",
          "encounter",
          "encounters",
          "x2_gnoll001",
          "X2_GNOLL001",
          2.241201591491699,
          4.51970329284668,
        ), bearing: 0 }],
        [{
          kind: "encounter",
          sourceObjectId: "obj_enc_x2_gnoll001",
          sourceIndex: 0,
          editorComment: { expectedValue: " source ", value: " target " },
        } as never],
      ),
      sourceGic([], { encounterComments: [" source "] }),
    );

    expect(plan.propertyMutations).toEqual([{
      kind: "encounter",
      sourceIndex: 0,
      editorComment: { expectedValue: " source ", value: " target " },
    }]);
    expect(Object.isFrozen((plan.propertyMutations[0] as any).editorComment)).toBe(true);
  });

  it("resolves one exact provenance-bound retained Store commerce-vector CAS", () => {
    const sourceCommerce = storeCommerce();
    const plan = planExistingAreaObjectDeletions(
      sourceGit({ includeStore: true }),
      editing(
        [
          retained("obj_cre_nw_guard", "creature", "creatures", "nw_guard", "NW_GUARD", 1, 2),
          retained(
            "obj_sto_x2_merc_dye",
            "store",
            "stores",
            "x2_merc_dye",
            "x2_merc_dye",
            4.291445541381836,
            5.039402770996094,
          ),
        ],
        [{
          kind: "store",
          sourceObjectId: "obj_sto_x2_merc_dye",
          sourceIndex: 0,
          commerce: {
            expectedValue: sourceCommerce,
            value: { ...sourceCommerce, markDown: 70, storeGold: 2500 },
          },
        } as never],
      ),
    );

    expect(plan.propertyMutations).toEqual([{
      kind: "store",
      sourceIndex: 0,
      commerce: {
        expectedValue: sourceCommerce,
        value: { ...sourceCommerce, markDown: 70, storeGold: 2500 },
      },
    }]);
    expect(Object.isFrozen((plan.propertyMutations[0] as any).commerce)).toBe(true);
  });

  it("resolves one exact provenance-bound retained Store script-ResRef pair CAS", () => {
    const sourceScripts = { onOpenStore: "store_open", onStoreClosed: "store_closed" };
    const plan = planExistingAreaObjectDeletions(
      sourceGit({ includeStore: true }),
      editing(
        [
          retained("obj_cre_nw_guard", "creature", "creatures", "nw_guard", "NW_GUARD", 1, 2),
          retained(
            "obj_sto_x2_merc_dye",
            "store",
            "stores",
            "x2_merc_dye",
            "x2_merc_dye",
            4.291445541381836,
            5.039402770996094,
          ),
        ],
        [{
          kind: "store",
          sourceObjectId: "obj_sto_x2_merc_dye",
          sourceIndex: 0,
          scripts: {
            expectedValue: sourceScripts,
            value: { onOpenStore: "nw_store_open", onStoreClosed: "nw_store_close" },
          },
        } as never],
      ),
    );

    expect(plan.propertyMutations).toEqual([{
      kind: "store",
      sourceIndex: 0,
      scripts: {
        expectedValue: sourceScripts,
        value: { onOpenStore: "nw_store_open", onStoreClosed: "nw_store_close" },
      },
    }]);
    expect(Object.isFrozen((plan.propertyMutations[0] as any).scripts)).toBe(true);
  });

  it("rejects a stale retained Store script-ResRef expected pair", () => {
    expect(() => planExistingAreaObjectDeletions(
      sourceGit({ includeStore: true }),
      editing(
        [
          retained("obj_cre_nw_guard", "creature", "creatures", "nw_guard", "NW_GUARD", 1, 2),
          retained(
            "obj_sto_x2_merc_dye",
            "store",
            "stores",
            "x2_merc_dye",
            "x2_merc_dye",
            4.291445541381836,
            5.039402770996094,
          ),
        ],
        [{
          kind: "store",
          sourceObjectId: "obj_sto_x2_merc_dye",
          sourceIndex: 0,
          scripts: {
            expectedValue: { onOpenStore: "stale", onStoreClosed: "store_closed" },
            value: { onOpenStore: "nw_store_open", onStoreClosed: "nw_store_close" },
          },
        } as never],
      ),
    )).toThrow("The retained Store script ResRef provenance differs from the exact source GIT.");
  });

  it("resolves one exact provenance-bound retained Store VarTable CAS", () => {
    const entries = [
      { name: "Counter", type: "int" as const, value: 1 },
      { name: "Label", type: "string" as const, value: "created" },
    ];
    const plan = planExistingAreaObjectDeletions(
      sourceGit({ includeStore: true }),
      editing(
        [
          retained("obj_cre_nw_guard", "creature", "creatures", "nw_guard", "NW_GUARD", 1, 2),
          retained(
            "obj_sto_x2_merc_dye",
            "store",
            "stores",
            "x2_merc_dye",
            "x2_merc_dye",
            4.291445541381836,
            5.039402770996094,
          ),
        ],
        [{
          kind: "store",
          sourceObjectId: "obj_sto_x2_merc_dye",
          sourceIndex: 0,
          variables: { expectedEntries: [], entries },
        } as never],
      ),
    );

    expect(plan.propertyMutations).toEqual([{
      kind: "store",
      sourceIndex: 0,
      variables: { expectedEntries: [], entries },
    }]);
    expect(Object.isFrozen((plan.propertyMutations[0] as any).variables)).toBe(true);
  });

  it("resolves one exact ordered retained Store restrictions pair CAS", () => {
    const expectedValue = {
      willNotBuy: { present: true, baseItemIds: [2, 1, 2] },
      willOnlyBuy: { present: true, baseItemIds: [0] },
    };
    const value = { willNotBuy: [1, 2, 1], willOnlyBuy: [0, 0] };
    const plan = planExistingAreaObjectDeletions(
      sourceGit({
        includeStore: true,
        storeRestrictionFields: storeRestrictionFields([2, 1, 2], [0]),
      }),
      editing(
        [
          retained("obj_cre_nw_guard", "creature", "creatures", "nw_guard", "NW_GUARD", 1, 2),
          retained(
            "obj_sto_x2_merc_dye",
            "store",
            "stores",
            "x2_merc_dye",
            "x2_merc_dye",
            4.291445541381836,
            5.039402770996094,
          ),
        ],
        [{
          kind: "store",
          sourceObjectId: "obj_sto_x2_merc_dye",
          sourceIndex: 0,
          restrictions: {
            expectedValue,
            value,
            tableSha256: "e".repeat(64),
            tableRowCount: 4,
          },
        } as never],
      ),
    );

    expect(plan.propertyMutations).toEqual([{
      kind: "store",
      sourceIndex: 0,
      restrictions: {
        expectedValue,
        value,
        tableSha256: "e".repeat(64),
        tableRowCount: 4,
      },
    }]);
    expect(Object.isFrozen((plan.propertyMutations[0] as any).restrictions)).toBe(true);
    expect(Object.isFrozen((plan.propertyMutations[0] as any).restrictions.value.willOnlyBuy))
      .toBe(true);
  });

  it("rejects stale physical presence or ordered values in a Store restrictions CAS", () => {
    expect(() => planExistingAreaObjectDeletions(
      sourceGit({
        includeStore: true,
        storeRestrictionFields: storeRestrictionFields([2, 1, 2], [0]),
      }),
      editing(
        [
          retained("obj_cre_nw_guard", "creature", "creatures", "nw_guard", "NW_GUARD", 1, 2),
          retained(
            "obj_sto_x2_merc_dye",
            "store",
            "stores",
            "x2_merc_dye",
            "x2_merc_dye",
            4.291445541381836,
            5.039402770996094,
          ),
        ],
        [{
          kind: "store",
          sourceObjectId: "obj_sto_x2_merc_dye",
          sourceIndex: 0,
          restrictions: {
            expectedValue: {
              willNotBuy: { present: false, baseItemIds: [] },
              willOnlyBuy: { present: true, baseItemIds: [0] },
            },
            value: { willNotBuy: [1], willOnlyBuy: [0] },
            tableSha256: "e".repeat(64),
            tableRowCount: 4,
          },
        } as never],
      ),
    )).toThrow("The retained Store restrictions provenance differs from the exact source GIT.");
  });

  it("rejects a stale retained Store VarTable expected list", () => {
    expect(() => planExistingAreaObjectDeletions(
      sourceGit({ includeStore: true }),
      editing(
        [
          retained("obj_cre_nw_guard", "creature", "creatures", "nw_guard", "NW_GUARD", 1, 2),
          retained(
            "obj_sto_x2_merc_dye",
            "store",
            "stores",
            "x2_merc_dye",
            "x2_merc_dye",
            4.291445541381836,
            5.039402770996094,
          ),
        ],
        [{
          kind: "store",
          sourceObjectId: "obj_sto_x2_merc_dye",
          sourceIndex: 0,
          variables: {
            expectedEntries: [{ sourceIndex: 0, name: "STALE", type: "int", value: 1 }],
            entries: [{ name: "Counter", type: "int", value: 1 }],
          },
        } as never],
      ),
    )).toThrow("The retained Store VarTable provenance differs from the exact source GIT.");
  });

  it("rejects a stale retained Store commerce expected vector", () => {
    const sourceCommerce = storeCommerce();
    expect(() => planExistingAreaObjectDeletions(
      sourceGit({ includeStore: true }),
      editing(
        [
          retained("obj_cre_nw_guard", "creature", "creatures", "nw_guard", "NW_GUARD", 1, 2),
          retained(
            "obj_sto_x2_merc_dye",
            "store",
            "stores",
            "x2_merc_dye",
            "x2_merc_dye",
            4.291445541381836,
            5.039402770996094,
          ),
        ],
        [{
          kind: "store",
          sourceObjectId: "obj_sto_x2_merc_dye",
          sourceIndex: 0,
          commerce: {
            expectedValue: { ...sourceCommerce, storeGold: 99 },
            value: { ...sourceCommerce, storeGold: 100 },
          },
        } as never],
      ),
    )).toThrow("The retained Store commerce provenance differs from the exact source GIT.");
  });

  it("resolves one exact provenance-bound retained ground-item Tag CAS", () => {
    const plan = planExistingAreaObjectDeletions(
      sourceGit(),
      editing(
        [
          retained("obj_cre_nw_guard", "creature", "creatures", "nw_guard", "NW_GUARD", 1, 2),
          retained("obj_itm_nw_sword", "item", "items", "nw_sword", "NW_SWORD", 3, 4),
        ],
        [{
          kind: "item",
          sourceObjectId: "obj_itm_nw_sword",
          sourceIndex: 0,
          tag: { expectedValue: "NW_SWORD", value: "  WEST_WALL_LOOT  " },
        } as never],
      ),
    );

    expect(plan.propertyMutations).toEqual([{
      kind: "item",
      sourceIndex: 0,
      tag: { expectedValue: "NW_SWORD", value: "  WEST_WALL_LOOT  " },
    }]);
    expect(Object.isFrozen((plan.propertyMutations[0] as any).tag)).toBe(true);
  });

  it.each([
    ["an incomplete pair", { expectedValue: "NW_SWORD" }, "Tag invalid_pair"],
    ["an unchanged pair", { expectedValue: "NW_SWORD", value: "NW_SWORD" }, "Tag invalid_pair"],
    ["an over-budget target", { expectedValue: "NW_SWORD", value: "x".repeat(33) }, "Tag invalid_pair"],
    ["a stale expected value", { expectedValue: "STALE", value: "NEW_TAG" }, "Tag expected=STALE actual=NW_SWORD"],
  ])("rejects retained ground-item Tag CAS with %s", (_label, tag, detail) => {
    const error = propertyPlanError(
      sourceGit(),
      editing(
        [
          retained("obj_cre_nw_guard", "creature", "creatures", "nw_guard", "NW_GUARD", 1, 2),
          retained("obj_itm_nw_sword", "item", "items", "nw_sword", "NW_SWORD", 3, 4),
        ],
        [{
          kind: "item",
          sourceObjectId: "obj_itm_nw_sword",
          sourceIndex: 0,
          tag,
        } as never],
      ),
    );

    expect(error.details).toEqual(["obj_itm_nw_sword", detail]);
  });

  it("resolves one exact provenance-bound retained Trigger Tag CAS", () => {
    const plan = planExistingAreaObjectDeletions(
      sourceGit({ includeTrigger: true }),
      editing(
        [{
          ...retained(
            "obj_trg_generictrigger",
            "trigger",
            "triggers",
            "newgeneric",
            "GenericTrigger",
            3.547599411010742,
            4.491108703613281,
          ),
          bearing: 0,
        }],
        [{
          kind: "trigger",
          sourceObjectId: "obj_trg_generictrigger",
          sourceIndex: 0,
          tag: { expectedValue: "GenericTrigger", value: "  AREA_EXIT  " },
        } as never],
      ),
    );

    expect(plan.propertyMutations).toEqual([{
      kind: "trigger",
      sourceIndex: 0,
      tag: { expectedValue: "GenericTrigger", value: "  AREA_EXIT  " },
    }]);
    expect(Object.isFrozen((plan.propertyMutations[0] as any).tag)).toBe(true);
  });

  it.each([
    ["an incomplete pair", { expectedValue: "GenericTrigger" }, "Tag invalid_pair"],
    ["an unchanged pair", { expectedValue: "GenericTrigger", value: "GenericTrigger" }, "Tag invalid_pair"],
    ["an over-budget target", { expectedValue: "GenericTrigger", value: "x".repeat(33) }, "Tag invalid_pair"],
    ["a stale expected value", { expectedValue: "STALE", value: "AREA_EXIT" }, "Tag expected=STALE actual=GenericTrigger"],
  ])("rejects retained Trigger Tag CAS with %s", (_label, tag, detail) => {
    const error = propertyPlanError(
      sourceGit({ includeTrigger: true }),
      editing(
        [{
          ...retained(
            "obj_trg_generictrigger",
            "trigger",
            "triggers",
            "newgeneric",
            "GenericTrigger",
            3.547599411010742,
            4.491108703613281,
          ),
          bearing: 0,
        }],
        [{
          kind: "trigger",
          sourceObjectId: "obj_trg_generictrigger",
          sourceIndex: 0,
          tag,
        } as never],
      ),
    );

    expect(error.details).toEqual(["obj_trg_generictrigger", detail]);
  });

  it("resolves one complete provenance-bound retained Trigger transition tuple CAS", () => {
    const expectedValue = triggerTransitionStorage();
    const value = {
      linkedTo: " NEW_DESTINATION ",
      linkedToFlags: 2,
      loadScreenId: 7,
    };
    const plan = planExistingAreaObjectDeletions(
      sourceGit({ includeTrigger: true }),
      editing(
        [{
          ...retained(
            "obj_trg_generictrigger",
            "trigger",
            "triggers",
            "newgeneric",
            "GenericTrigger",
            3.547599411010742,
            4.491108703613281,
          ),
          bearing: 0,
        }],
        [{
          kind: "trigger",
          sourceObjectId: "obj_trg_generictrigger",
          sourceIndex: 0,
          transitionStorage: { expectedValue, value },
        } as never],
      ),
    );

    expect(plan.propertyMutations).toEqual([{
      kind: "trigger",
      sourceIndex: 0,
      transitionStorage: { expectedValue, value },
    }]);
    expect(Object.isFrozen((plan.propertyMutations[0] as any).transitionStorage)).toBe(true);
  });

  it.each([
    ["partial tuple", {
      expectedValue: triggerTransitionStorage(),
      value: { linkedTo: "NEW", linkedToFlags: 1 },
    }, "transitionStorage invalid_tuple"],
    ["stale tuple", {
      expectedValue: { ...triggerTransitionStorage(), linkedToFlags: 2 },
      value: { ...triggerTransitionStorage(), linkedTo: "NEW" },
    }, "transitionStorage stale"],
  ])("rejects retained Trigger transition storage with %s", (_label, transitionStorage, detail) => {
    const error = propertyPlanError(
      sourceGit({ includeTrigger: true }),
      editing(
        [{
          ...retained(
            "obj_trg_generictrigger",
            "trigger",
            "triggers",
            "newgeneric",
            "GenericTrigger",
            3.547599411010742,
            4.491108703613281,
          ),
          bearing: 0,
        }],
        [{
          kind: "trigger",
          sourceObjectId: "obj_trg_generictrigger",
          sourceIndex: 0,
          transitionStorage,
        } as never],
      ),
    );

    expect(error.details).toEqual(["obj_trg_generictrigger", detail]);
  });

  it("resolves one complete provenance-bound retained Trigger script tuple CAS", () => {
    const expectedValue = triggerScripts();
    const value = { ...expectedValue, onClick: "trg_click", onEnter: "trg_inside" };
    const plan = planExistingAreaObjectDeletions(
      sourceGit({ includeTrigger: true }),
      editing(
        [{
          ...retained(
            "obj_trg_generictrigger",
            "trigger",
            "triggers",
            "newgeneric",
            "GenericTrigger",
            3.547599411010742,
            4.491108703613281,
          ),
          bearing: 0,
        }],
        [{
          kind: "trigger",
          sourceObjectId: "obj_trg_generictrigger",
          sourceIndex: 0,
          scripts: { expectedValue, value },
        } as never],
      ),
    );

    expect(plan.propertyMutations).toEqual([{
      kind: "trigger",
      sourceIndex: 0,
      scripts: { expectedValue, value },
    }]);
    expect(Object.isFrozen((plan.propertyMutations[0] as any).scripts)).toBe(true);
  });

  it.each([
    ["partial tuple", { expectedValue: triggerScripts(), value: { onClick: "trg_click" } }, "scripts invalid_tuple"],
    ["stale tuple", {
      expectedValue: { ...triggerScripts(), onExit: "stale" },
      value: { ...triggerScripts(), onClick: "trg_click" },
    }, "scripts stale"],
  ])("rejects retained Trigger scripts with %s", (_label, scripts, detail) => {
    const error = propertyPlanError(
      sourceGit({ includeTrigger: true }),
      editing(
        [{
          ...retained(
            "obj_trg_generictrigger",
            "trigger",
            "triggers",
            "newgeneric",
            "GenericTrigger",
            3.547599411010742,
            4.491108703613281,
          ),
          bearing: 0,
        }],
        [{
          kind: "trigger",
          sourceObjectId: "obj_trg_generictrigger",
          sourceIndex: 0,
          scripts,
        } as never],
      ),
    );

    expect(error.details).toEqual(["obj_trg_generictrigger", detail]);
  });

  it("resolves one exact provenance-bound retained Waypoint Tag CAS", () => {
    const plan = planExistingAreaObjectDeletions(
      sourceGit({ includeWaypoint: true }),
      editing(
        [{
          ...retained(
            "obj_wpt_waypoint",
            "waypoint",
            "waypoints",
            "nw_waypoint001",
            "WAYPOINT",
            Math.fround(33.1162) / 10,
            Math.fround(47.7472) / 10,
          ),
          bearing: Math.PI * 1.5,
        }],
        [{
          kind: "waypoint",
          sourceObjectId: "obj_wpt_waypoint",
          sourceIndex: 0,
          tag: { expectedValue: "WAYPOINT", value: "  AREA_DESTINATION  " },
        } as never],
      ),
    );

    expect(plan.propertyMutations).toEqual([{
      kind: "waypoint",
      sourceIndex: 0,
      tag: { expectedValue: "WAYPOINT", value: "  AREA_DESTINATION  " },
    }]);
    expect(Object.isFrozen((plan.propertyMutations[0] as any).tag)).toBe(true);
  });

  it("resolves one exact provenance-bound retained Waypoint TemplateResRef CAS", () => {
    const plan = planExistingAreaObjectDeletions(
      sourceGit({ includeWaypoint: true }),
      editing(
        [{
          ...retained(
            "obj_wpt_waypoint",
            "waypoint",
            "waypoints",
            "nw_waypoint001",
            "WAYPOINT",
            Math.fround(33.1162) / 10,
            Math.fround(47.7472) / 10,
          ),
          bearing: Math.PI * 1.5,
        }],
        [{
          kind: "waypoint",
          sourceObjectId: "obj_wpt_waypoint",
          sourceIndex: 0,
          templateResRef: {
            expectedResRef: "nw_waypoint001",
            resRef: "custom_waypoint",
          },
        } as never],
      ),
    );

    expect(plan.propertyMutations).toEqual([{
      kind: "waypoint",
      sourceIndex: 0,
      templateResRef: {
        expectedResRef: "nw_waypoint001",
        resRef: "custom_waypoint",
      },
    }]);
    expect(Object.isFrozen((plan.propertyMutations[0] as any).templateResRef)).toBe(true);
  });

  it.each([
    ["a stale expected value", undefined, {
      expectedResRef: "stale_waypoint",
      resRef: "custom_waypoint",
    }, "TemplateResRef expected=stale_waypoint actual=nw_waypoint001"],
    ["an absent native field", [], {
      expectedResRef: "nw_waypoint001",
      resRef: "custom_waypoint",
    }, "TemplateResRef missing_canonical_resref"],
    ["a malformed pair", undefined, {
      expectedResRef: "nw_waypoint001",
      resRef: "CUSTOM_WAYPOINT",
    }, "TemplateResRef invalid_pair"],
  ] as const)("rejects Waypoint TemplateResRef CAS with %s", (
    _label,
    waypointTemplateResRefFields,
    templateResRef,
    detail,
  ) => {
    const error = propertyPlanError(
      sourceGit({ includeWaypoint: true, waypointTemplateResRefFields }),
      editing(
        [{
          ...retained(
            "obj_wpt_waypoint",
            "waypoint",
            "waypoints",
            "nw_waypoint001",
            "WAYPOINT",
            Math.fround(33.1162) / 10,
            Math.fround(47.7472) / 10,
          ),
          bearing: Math.PI * 1.5,
        }],
        [{
          kind: "waypoint",
          sourceObjectId: "obj_wpt_waypoint",
          sourceIndex: 0,
          templateResRef,
        } as never],
      ),
    );

    expect(error.details).toEqual(["obj_wpt_waypoint", detail]);
  });

  it("resolves one exact retained Waypoint LocalizedName CAS beside optional Tag", () => {
    const plan = planExistingAreaObjectDeletions(
      sourceGit({
        includeWaypoint: true,
        waypointLocalizedNameFields: [{
          label: "LocalizedName",
          type: "cexolocstring",
          value: {
            strRef: 0xffff_ffff,
            entries: [{ languageId: 0, text: "Patrol Point" }],
          },
        }],
      }),
      editing(
        [{
          ...retained(
            "obj_wpt_waypoint",
            "waypoint",
            "waypoints",
            "nw_waypoint001",
            "WAYPOINT",
            Math.fround(33.1162) / 10,
            Math.fround(47.7472) / 10,
          ),
          bearing: Math.PI * 1.5,
        }],
        [{
          kind: "waypoint",
          sourceObjectId: "obj_wpt_waypoint",
          sourceIndex: 0,
          tag: { expectedValue: "WAYPOINT", value: "NORTH_PATROL" },
          localizedName: {
            expectedValue: "Patrol Point",
            value: " North Patrol Point ",
          },
        } as never],
      ),
    );

    expect(plan.propertyMutations).toEqual([{
      kind: "waypoint",
      sourceIndex: 0,
      tag: { expectedValue: "WAYPOINT", value: "NORTH_PATROL" },
      localizedName: {
        expectedValue: "Patrol Point",
        value: " North Patrol Point ",
      },
    }]);
    expect(Object.isFrozen((plan.propertyMutations[0] as any).localizedName)).toBe(true);
  });

  it("resolves one exact retained Waypoint Description CAS beside Tag and LocalizedName", () => {
    const plan = planExistingAreaObjectDeletions(
      sourceGit({
        includeWaypoint: true,
        waypointLocalizedNameFields: [{
          label: "LocalizedName",
          type: "cexolocstring",
          value: {
            strRef: 0xffff_ffff,
            entries: [{ languageId: 0, text: "Patrol Point" }],
          },
        }],
        waypointDescriptionFields: [{
          label: "Description",
          type: "cexolocstring",
          value: {
            strRef: 0xffff_ffff,
            entries: [{ languageId: 0, text: "Patrol route" }],
          },
        }],
      }),
      editing(
        [{
          ...retained(
            "obj_wpt_waypoint",
            "waypoint",
            "waypoints",
            "nw_waypoint001",
            "WAYPOINT",
            Math.fround(33.1162) / 10,
            Math.fround(47.7472) / 10,
          ),
          bearing: Math.PI * 1.5,
        }],
        [{
          kind: "waypoint",
          sourceObjectId: "obj_wpt_waypoint",
          sourceIndex: 0,
          tag: { expectedValue: "WAYPOINT", value: "NORTH_PATROL" },
          localizedName: {
            expectedValue: "Patrol Point",
            value: " North Patrol Point ",
          },
          description: {
            expectedValue: "Patrol route",
            value: "Northern patrol route",
          },
        } as never],
      ),
    );

    expect(plan.propertyMutations).toEqual([{
      kind: "waypoint",
      sourceIndex: 0,
      tag: { expectedValue: "WAYPOINT", value: "NORTH_PATROL" },
      localizedName: {
        expectedValue: "Patrol Point",
        value: " North Patrol Point ",
      },
      description: {
        expectedValue: "Patrol route",
        value: "Northern patrol route",
      },
    }]);
    expect(Object.isFrozen((plan.propertyMutations[0] as any).description)).toBe(true);
  });

  it("resolves one exact paired-GIC Waypoint editor Comment CAS", () => {
    const git = sourceGit({ includeWaypoint: true });
    const plan = planExistingAreaObjectDeletions(
      git,
      editing(
        [{
          ...retained(
            "obj_wpt_waypoint",
            "waypoint",
            "waypoints",
            "nw_waypoint001",
            "WAYPOINT",
            Math.fround(33.1162) / 10,
            Math.fround(47.7472) / 10,
          ),
          bearing: Math.PI * 1.5,
        }],
        [{
          kind: "waypoint",
          sourceObjectId: "obj_wpt_waypoint",
          sourceIndex: 0,
          editorComment: { expectedValue: " source note ", value: " updated note " },
        } as never],
      ),
      sourceGicForGit(git, { waypointComments: [" source note "] }),
    );

    expect(plan.propertyMutations).toEqual([{
      kind: "waypoint",
      sourceIndex: 0,
      editorComment: { expectedValue: " source note ", value: " updated note " },
    }]);
    expect(Object.isFrozen((plan.propertyMutations[0] as any).editorComment)).toBe(true);
  });

  it.each([
    ["an incomplete pair", { expectedValue: "WAYPOINT" }, "Tag invalid_pair"],
    ["an unchanged pair", { expectedValue: "WAYPOINT", value: "WAYPOINT" }, "Tag invalid_pair"],
    ["an over-budget target", { expectedValue: "WAYPOINT", value: "x".repeat(33) }, "Tag invalid_pair"],
    ["a stale expected value", { expectedValue: "STALE", value: "DEST" }, "Tag expected=STALE actual=WAYPOINT"],
  ])("rejects retained Waypoint Tag CAS with %s", (_label, tag, detail) => {
    const error = propertyPlanError(
      sourceGit({ includeWaypoint: true }),
      editing(
        [{
          ...retained(
            "obj_wpt_waypoint",
            "waypoint",
            "waypoints",
            "nw_waypoint001",
            "WAYPOINT",
            Math.fround(33.1162) / 10,
            Math.fround(47.7472) / 10,
          ),
          bearing: Math.PI * 1.5,
        }],
        [{
          kind: "waypoint",
          sourceObjectId: "obj_wpt_waypoint",
          sourceIndex: 0,
          tag,
        } as never],
      ),
    );

    expect(error.details).toEqual(["obj_wpt_waypoint", detail]);
  });

  it("resolves one exact provenance-bound retained Encounter Tag CAS", () => {
    const plan = planExistingAreaObjectDeletions(
      sourceGit({ includeEncounter: true }),
      editing(
        [{
          ...retained(
            "obj_enc_x2_gnoll001",
            "encounter",
            "encounters",
            "x2_gnoll001",
            "X2_GNOLL001",
            2.241201591491699,
            4.51970329284668,
          ),
          bearing: 0,
        }],
        [{
          kind: "encounter",
          sourceObjectId: "obj_enc_x2_gnoll001",
          sourceIndex: 0,
          tag: { expectedValue: "X2_GNOLL001", value: "  GNOLL_AMBUSH  " },
        } as never],
      ),
    );

    expect(plan.propertyMutations).toEqual([{
      kind: "encounter",
      sourceIndex: 0,
      tag: { expectedValue: "X2_GNOLL001", value: "  GNOLL_AMBUSH  " },
    }]);
    expect(Object.isFrozen((plan.propertyMutations[0] as any).tag)).toBe(true);
  });

  it("resolves one exact provenance-bound retained Encounter TemplateResRef CAS", () => {
    const plan = planExistingAreaObjectDeletions(
      sourceGit({ includeEncounter: true }),
      editing(
        [{
          ...retained(
            "obj_enc_x2_gnoll001",
            "encounter",
            "encounters",
            "x2_gnoll001",
            "X2_GNOLL001",
            2.241201591491699,
            4.51970329284668,
          ),
          bearing: 0,
        }],
        [{
          kind: "encounter",
          sourceObjectId: "obj_enc_x2_gnoll001",
          sourceIndex: 0,
          templateResRef: {
            expectedResRef: "x2_gnoll001",
            resRef: "custom_encounter",
          },
        } as never],
      ),
    );

    expect(plan.propertyMutations).toEqual([{
      kind: "encounter",
      sourceIndex: 0,
      templateResRef: {
        expectedResRef: "x2_gnoll001",
        resRef: "custom_encounter",
      },
    }]);
    expect(Object.isFrozen((plan.propertyMutations[0] as any).templateResRef)).toBe(true);
  });

  it.each([
    ["a stale expected value", undefined, {
      expectedResRef: "stale_encounter",
      resRef: "custom_encounter",
    }, "TemplateResRef expected=stale_encounter actual=x2_gnoll001"],
    ["an absent native field", [], {
      expectedResRef: "x2_gnoll001",
      resRef: "custom_encounter",
    }, "TemplateResRef missing_canonical_resref"],
    ["a malformed pair", undefined, {
      expectedResRef: "x2_gnoll001",
      resRef: "CUSTOM_ENCOUNTER",
    }, "TemplateResRef invalid_pair"],
  ] as const)("rejects Encounter TemplateResRef CAS with %s", (
    _label,
    encounterTemplateResRefFields,
    templateResRef,
    detail,
  ) => {
    const error = propertyPlanError(
      sourceGit({ includeEncounter: true, encounterTemplateResRefFields }),
      editing(
        [{
          ...retained(
            "obj_enc_x2_gnoll001", "encounter", "encounters", "x2_gnoll001",
            "X2_GNOLL001", 2.241201591491699, 4.51970329284668,
          ),
          bearing: 0,
        }],
        [{
          kind: "encounter",
          sourceObjectId: "obj_enc_x2_gnoll001",
          sourceIndex: 0,
          templateResRef,
        } as never],
      ),
    );

    expect(error.details).toEqual(["obj_enc_x2_gnoll001", detail]);
  });

  it("resolves one exact ordered retained Encounter VarTable CAS", () => {
    const plan = planExistingAreaObjectDeletions(
      sourceGit({ includeEncounter: true }),
      editing(
        [{
          ...retained(
            "obj_enc_x2_gnoll001", "encounter", "encounters", "x2_gnoll001",
            "X2_GNOLL001", 2.241201591491699, 4.51970329284668,
          ),
          bearing: 0,
        }],
        [{
          kind: "encounter",
          sourceObjectId: "obj_enc_x2_gnoll001",
          sourceIndex: 0,
          variables: {
            expectedEntries: [],
            entries: [
              { name: "Counter", type: "int", value: 7 },
              { name: "Counter", type: "string", value: " exact " },
            ],
          },
        } as never],
      ),
    );

    expect(plan.propertyMutations).toEqual([{
      kind: "encounter",
      sourceIndex: 0,
      variables: {
        expectedEntries: [],
        entries: [
          { name: "Counter", type: "int", value: 7 },
          { name: "Counter", type: "string", value: " exact " },
        ],
      },
    }]);
  });

  it("resolves one exact retained Encounter CreatureList SingleSpawn vector CAS", () => {
    const expectedEntries = [
      {
        sourceIndex: 0, appearance: 388, challengeRating: 1,
        resRef: "nw_gnoll001", singleSpawnByte: 0 as const,
      },
      {
        sourceIndex: 1, appearance: 389, challengeRating: 3,
        resRef: "nw_gnoll002", singleSpawnByte: 1 as const,
      },
    ];
    const entries = [
      { ...expectedEntries[0], singleSpawnByte: 1 as const },
      expectedEntries[1],
    ];
    const plan = planExistingAreaObjectDeletions(
      sourceGit({ includeEncounter: true }),
      editing(
        [{
          ...retained(
            "obj_enc_x2_gnoll001", "encounter", "encounters", "x2_gnoll001",
            "X2_GNOLL001", 2.241201591491699, 4.51970329284668,
          ),
          bearing: 0,
        }],
        [{
          kind: "encounter",
          sourceObjectId: "obj_enc_x2_gnoll001",
          sourceIndex: 0,
          creatureList: { expectedEntries, entries },
        } as never],
      ),
    );

    expect(plan.propertyMutations).toEqual([{
      kind: "encounter",
      sourceIndex: 0,
      creatureList: { expectedEntries, entries },
    }]);
  });

  it("resolves one catalog-bound structural Encounter CreatureList CAS", () => {
    const expectedEntries = [
      {
        sourceIndex: 0, appearance: 388, challengeRating: 1,
        resRef: "nw_gnoll001", singleSpawnByte: 0 as const,
      },
      {
        sourceIndex: 1, appearance: 389, challengeRating: 3,
        resRef: "nw_gnoll002", singleSpawnByte: 1 as const,
      },
    ];
    const entries = [
      {
        entryKind: "retained" as const,
        sourceIndex: 1,
        appearance: 389,
        challengeRating: 3,
        resRef: "nw_gnoll002",
        singleSpawn: false,
      },
      {
        entryKind: "effective_blueprint" as const,
        sourceProfileId: "effective-catalog-utc-encounter-creature-list-v1" as const,
        templateId: "cre_wolf_alpha",
        resRef: "nw_wolf001",
        appearance: 225,
        challengeRating: Math.fround(2.5),
        sourceObjectKey: "module/catalog/creatures/nw_wolf001.utc",
        sourceSizeBytes: 4096,
        sourceSha256: "a".repeat(64),
        singleSpawn: true,
      },
    ];
    const plan = planExistingAreaObjectDeletions(
      sourceGit({ includeEncounter: true }),
      editing(
        [{
          ...retained(
            "obj_enc_x2_gnoll001", "encounter", "encounters", "x2_gnoll001",
            "X2_GNOLL001", 2.241201591491699, 4.51970329284668,
          ),
          bearing: 0,
        }],
        [{
          kind: "encounter",
          sourceObjectId: "obj_enc_x2_gnoll001",
          sourceIndex: 0,
          creatureList: { expectedEntries, entries },
        } as never],
      ),
    );

    expect(plan.propertyMutations).toEqual([{
      kind: "encounter",
      sourceIndex: 0,
      creatureList: { expectedEntries, entries },
    }]);
  });

  it("resolves one exact structural Encounter SpawnPointList vector CAS", () => {
    const entries = [
      { nativeX: 22.5, nativeY: 45.25, nativeZ: 0, orientation: 1.5 },
      { nativeX: -3.75, nativeY: 9.5, nativeZ: 0.125, orientation: -2.25 },
    ];
    const plan = planExistingAreaObjectDeletions(
      sourceGit({ includeEncounter: true }),
      editing(
        [{
          ...retained(
            "obj_enc_x2_gnoll001", "encounter", "encounters", "x2_gnoll001",
            "X2_GNOLL001", 2.241201591491699, 4.51970329284668,
          ),
          bearing: 0,
        }],
        [{
          kind: "encounter",
          sourceObjectId: "obj_enc_x2_gnoll001",
          sourceIndex: 0,
          spawnPoints: { expectedEntries: [], entries },
        } as never],
      ),
    );

    expect(plan.propertyMutations).toEqual([{
      kind: "encounter",
      sourceIndex: 0,
      spawnPoints: { expectedEntries: [], entries },
    }]);
  });

  it("resolves exact retained Encounter name, Tag, flags, reset, spawn, count, scripts, Faction, and Difficulty CAS on one ordinal", () => {
    const plan = planExistingAreaObjectDeletions(
      sourceGit({ includeEncounter: true }),
      editing(
        [{
          ...retained(
            "obj_enc_x2_gnoll001", "encounter", "encounters", "x2_gnoll001",
            "X2_GNOLL001", 2.241201591491699, 4.51970329284668,
          ),
          bearing: 0,
        }],
        [{
          kind: "encounter",
          sourceObjectId: "obj_enc_x2_gnoll001",
          sourceIndex: 0,
          localizedName: {
            expectedValue: "Gnoll Ambush",
            value: "Night Ambush",
          },
          tag: { expectedValue: "X2_GNOLL001", value: "GNOLL_AMBUSH" },
          active: {
            expectedValue: { activeByte: 1 },
            value: { activeByte: 0 },
          },
          playerOnly: {
            expectedValue: { playerOnlyByte: 1 },
            value: { playerOnlyByte: 0 },
          },
          reset: {
            expectedValue: { resetByte: 1 },
            value: { resetByte: 0 },
          },
          resetTime: {
            expectedValue: { resetTime: 60 },
            value: { resetTime: 90 },
          },
          spawnOption: {
            expectedValue: { spawnOption: 1 },
            value: { spawnOption: 0 },
          },
          respawns: {
            expectedValue: { respawns: 0 },
            value: { respawns: -1 },
          },
          creatureCounts: {
            expectedValue: { maxCreatures: 4, recCreatures: 2 },
            value: { maxCreatures: 3, recCreatures: 3 },
          },
          scripts: {
            expectedValue: {
              onEntered: "enc_enter",
              onExit: "enc_exit",
              onExhausted: "",
              onHeartbeat: "enc_heartbeat",
              onUserDefined: "enc_user",
            },
            value: {
              onEntered: "new_enter",
              onExit: "new_exit",
              onExhausted: "new_exhausted",
              onHeartbeat: "new_heartbeat",
              onUserDefined: "new_user",
            },
          },
          faction: {
            expectedValue: 1,
            value: 4,
            catalogSha256: "f".repeat(64),
            catalogFactionCount: 5,
          },
          difficulty: {
            expectedValue: { difficulty: 1, difficultyIndex: 2 },
            value: { difficulty: 3, difficultyIndex: 4 },
            catalogSha256: "d".repeat(64),
            catalogRowCount: 5,
          },
        }],
      ),
    );

    expect(plan.propertyMutations).toEqual([{
      kind: "encounter",
      sourceIndex: 0,
      localizedName: {
        expectedValue: "Gnoll Ambush",
        value: "Night Ambush",
      },
      tag: { expectedValue: "X2_GNOLL001", value: "GNOLL_AMBUSH" },
      active: {
        expectedValue: { activeByte: 1 },
        value: { activeByte: 0 },
      },
      playerOnly: {
        expectedValue: { playerOnlyByte: 1 },
        value: { playerOnlyByte: 0 },
      },
      reset: {
        expectedValue: { resetByte: 1 },
        value: { resetByte: 0 },
      },
      resetTime: {
        expectedValue: { resetTime: 60 },
        value: { resetTime: 90 },
      },
      spawnOption: {
        expectedValue: { spawnOption: 1 },
        value: { spawnOption: 0 },
      },
      respawns: {
        expectedValue: { respawns: 0 },
        value: { respawns: -1 },
      },
      creatureCounts: {
        expectedValue: { maxCreatures: 4, recCreatures: 2 },
        value: { maxCreatures: 3, recCreatures: 3 },
      },
      scripts: {
        expectedValue: {
          onEntered: "enc_enter",
          onExit: "enc_exit",
          onExhausted: "",
          onHeartbeat: "enc_heartbeat",
          onUserDefined: "enc_user",
        },
        value: {
          onEntered: "new_enter",
          onExit: "new_exit",
          onExhausted: "new_exhausted",
          onHeartbeat: "new_heartbeat",
          onUserDefined: "new_user",
        },
      },
      faction: {
        expectedValue: 1,
        value: 4,
        catalogSha256: "f".repeat(64),
        catalogFactionCount: 5,
      },
      difficulty: {
        expectedValue: { difficulty: 1, difficultyIndex: 2 },
        value: { difficulty: 3, difficultyIndex: 4 },
        catalogSha256: "d".repeat(64),
        catalogRowCount: 5,
      },
    }]);
  });

  it("rejects stale retained Encounter Difficulty provenance before the writer", () => {
    const error = propertyPlanError(
      sourceGit({ includeEncounter: true }),
      editing(
        [{
          ...retained(
            "obj_enc_x2_gnoll001", "encounter", "encounters", "x2_gnoll001",
            "X2_GNOLL001", 2.241201591491699, 4.51970329284668,
          ),
          bearing: 0,
        }],
        [{
          kind: "encounter",
          sourceObjectId: "obj_enc_x2_gnoll001",
          sourceIndex: 0,
          difficulty: {
            expectedValue: { difficulty: 0, difficultyIndex: 2 },
            value: { difficulty: 3, difficultyIndex: 4 },
            catalogSha256: "d".repeat(64),
            catalogRowCount: 5,
          },
        }],
      ),
    );

    expect(error.message).toBe(
      "The retained Encounter Difficulty provenance differs from the exact source GIT.",
    );
  });

  it("rejects stale retained Encounter Faction provenance before the writer", () => {
    const error = propertyPlanError(
      sourceGit({ includeEncounter: true }),
      editing(
        [{
          ...retained(
            "obj_enc_x2_gnoll001", "encounter", "encounters", "x2_gnoll001",
            "X2_GNOLL001", 2.241201591491699, 4.51970329284668,
          ),
          bearing: 0,
        }],
        [{
          kind: "encounter",
          sourceObjectId: "obj_enc_x2_gnoll001",
          sourceIndex: 0,
          faction: {
            expectedValue: 2,
            value: 4,
            catalogSha256: "f".repeat(64),
            catalogFactionCount: 5,
          },
        }],
      ),
    );

    expect(error.message).toBe(
      "The retained Encounter Faction provenance differs from the exact source GIT.",
    );
  });

  it("rejects stale retained Encounter Active provenance before the writer", () => {
    const error = propertyPlanError(
      sourceGit({ includeEncounter: true }),
      editing(
        [{
          ...retained(
            "obj_enc_x2_gnoll001", "encounter", "encounters", "x2_gnoll001",
            "X2_GNOLL001", 2.241201591491699, 4.51970329284668,
          ),
          bearing: 0,
        }],
        [{
          kind: "encounter",
          sourceObjectId: "obj_enc_x2_gnoll001",
          sourceIndex: 0,
          active: {
            expectedValue: { activeByte: 0 },
            value: { activeByte: 1 },
          },
        }],
      ),
    );

    expect(error.message).toBe(
      "The retained Encounter Active provenance differs from the exact source GIT.",
    );
  });

  it("rejects stale retained Encounter PlayerOnly provenance before the writer", () => {
    const error = propertyPlanError(
      sourceGit({ includeEncounter: true }),
      editing(
        [{
          ...retained(
            "obj_enc_x2_gnoll001", "encounter", "encounters", "x2_gnoll001",
            "X2_GNOLL001", 2.241201591491699, 4.51970329284668,
          ),
          bearing: 0,
        }],
        [{
          kind: "encounter",
          sourceObjectId: "obj_enc_x2_gnoll001",
          sourceIndex: 0,
          playerOnly: {
            expectedValue: { playerOnlyByte: 0 },
            value: { playerOnlyByte: 1 },
          },
        }],
      ),
    );

    expect(error.message).toBe(
      "The retained Encounter PlayerOnly provenance differs from the exact source GIT.",
    );
  });

  it("rejects stale retained Encounter Reset provenance before the writer", () => {
    const error = propertyPlanError(
      sourceGit({ includeEncounter: true }),
      editing(
        [{
          ...retained(
            "obj_enc_x2_gnoll001", "encounter", "encounters", "x2_gnoll001",
            "X2_GNOLL001", 2.241201591491699, 4.51970329284668,
          ),
          bearing: 0,
        }],
        [{
          kind: "encounter",
          sourceObjectId: "obj_enc_x2_gnoll001",
          sourceIndex: 0,
          reset: {
            expectedValue: { resetByte: 0 },
            value: { resetByte: 1 },
          },
        }],
      ),
    );

    expect(error.message).toBe(
      "The retained Encounter Reset provenance differs from the exact source GIT.",
    );
  });

  it("rejects stale retained Encounter ResetTime provenance before the writer", () => {
    const error = propertyPlanError(
      sourceGit({ includeEncounter: true }),
      editing(
        [{
          ...retained(
            "obj_enc_x2_gnoll001", "encounter", "encounters", "x2_gnoll001",
            "X2_GNOLL001", 2.241201591491699, 4.51970329284668,
          ),
          bearing: 0,
        }],
        [{
          kind: "encounter",
          sourceObjectId: "obj_enc_x2_gnoll001",
          sourceIndex: 0,
          resetTime: {
            expectedValue: { resetTime: 90 },
            value: { resetTime: 120 },
          },
        }],
      ),
    );

    expect(error.message).toBe(
      "The retained Encounter ResetTime provenance differs from the exact source GIT.",
    );
  });

  it("rejects stale retained Encounter SpawnOption provenance before the writer", () => {
    const error = propertyPlanError(
      sourceGit({ includeEncounter: true }),
      editing(
        [{
          ...retained(
            "obj_enc_x2_gnoll001", "encounter", "encounters", "x2_gnoll001",
            "X2_GNOLL001", 2.241201591491699, 4.51970329284668,
          ),
          bearing: 0,
        }],
        [{
          kind: "encounter",
          sourceObjectId: "obj_enc_x2_gnoll001",
          sourceIndex: 0,
          spawnOption: {
            expectedValue: { spawnOption: 0 },
            value: { spawnOption: 1 },
          },
        }],
      ),
    );

    expect(error.message).toBe(
      "The retained Encounter SpawnOption provenance differs from the exact source GIT.",
    );
  });

  it("rejects stale retained Encounter Respawns provenance before the writer", () => {
    const error = propertyPlanError(
      sourceGit({ includeEncounter: true }),
      editing(
        [{
          ...retained(
            "obj_enc_x2_gnoll001", "encounter", "encounters", "x2_gnoll001",
            "X2_GNOLL001", 2.241201591491699, 4.51970329284668,
          ),
          bearing: 0,
        }],
        [{
          kind: "encounter",
          sourceObjectId: "obj_enc_x2_gnoll001",
          sourceIndex: 0,
          respawns: {
            expectedValue: { respawns: 1 },
            value: { respawns: -1 },
          },
        }],
      ),
    );

    expect(error.message).toBe(
      "The retained Encounter Respawns provenance differs from the exact source GIT.",
    );
  });

  it.each([
    ["an incomplete pair", { expectedValue: "X2_GNOLL001" }, "Tag invalid_pair"],
    ["an unchanged pair", { expectedValue: "X2_GNOLL001", value: "X2_GNOLL001" }, "Tag invalid_pair"],
    ["an over-budget target", { expectedValue: "X2_GNOLL001", value: "x".repeat(33) }, "Tag invalid_pair"],
    ["a stale expected value", { expectedValue: "STALE", value: "GNOLL_AMBUSH" }, "Tag expected=STALE actual=X2_GNOLL001"],
  ])("rejects retained Encounter Tag CAS with %s", (_label, tag, detail) => {
    const error = propertyPlanError(
      sourceGit({ includeEncounter: true }),
      editing(
        [{
          ...retained(
            "obj_enc_x2_gnoll001",
            "encounter",
            "encounters",
            "x2_gnoll001",
            "X2_GNOLL001",
            2.241201591491699,
            4.51970329284668,
          ),
          bearing: 0,
        }],
        [{
          kind: "encounter",
          sourceObjectId: "obj_enc_x2_gnoll001",
          sourceIndex: 0,
          tag,
        } as never],
      ),
    );

    expect(error.details).toEqual(["obj_enc_x2_gnoll001", detail]);
  });

  it("resolves one exact provenance-bound retained ground-item TemplateResRef CAS", () => {
    const item = retained(
      "obj_itm_nw_sword",
      "item",
      "items",
      "custom_sword",
      "NW_SWORD",
      3,
      4,
    );
    const plan = planExistingAreaObjectDeletions(
      sourceGit(),
      editing(
        [
          retained("obj_cre_nw_guard", "creature", "creatures", "nw_guard", "NW_GUARD", 1, 2),
          item,
        ],
        [{
          kind: "item",
          sourceObjectId: "obj_itm_nw_sword",
          sourceIndex: 0,
          templateResRef: {
            expectedResRef: "nw_sword",
            resRef: "custom_sword",
          },
        } as never],
      ),
    );

    expect(plan.propertyMutations).toEqual([{
      kind: "item",
      sourceIndex: 0,
      templateResRef: {
        expectedResRef: "nw_sword",
        resRef: "custom_sword",
      },
    }]);
    expect(Object.isFrozen((plan.propertyMutations[0] as any).templateResRef)).toBe(true);
  });

  it("replans exact ground-item localized strings against the native source ordinal", () => {
    const source = sourceGit({
      itemLocalizedStringFields: [
        {
          label: "LocalizedName",
          type: "cexolocstring",
          value: {
            strRef: 0xffff_ffff,
            entries: [{ languageId: 0, text: "Sword" }],
          },
        },
        {
          label: "Description",
          type: "cexolocstring",
          value: { strRef: 0xffff_ffff, entries: [] },
        },
        {
          label: "DescIdentified",
          type: "cexolocstring",
          value: { strRef: 7, entries: [] },
        },
      ],
    });
    const plan = planExistingAreaObjectDeletions(
      source,
      editing(
        [
          retained("obj_cre_nw_guard", "creature", "creatures", "nw_guard", "NW_GUARD", 1, 2),
          retained("obj_itm_nw_sword", "item", "items", "nw_sword", "NW_SWORD", 3, 4),
        ],
        [{
          kind: "item",
          sourceObjectId: "obj_itm_nw_sword",
          sourceIndex: 0,
          localizedStrings: [
            { field: "LocalizedName", expectedValue: "Sword", value: "Sword 2" },
            { field: "Description", expectedValue: "", value: "Unknown blade" },
          ],
        } as never],
      ),
    );

    expect(plan.propertyMutations).toEqual([{
      kind: "item",
      sourceIndex: 0,
      localizedStrings: [
        { field: "LocalizedName", expectedValue: "Sword", value: "Sword 2" },
        { field: "Description", expectedValue: "", value: "Unknown blade" },
      ],
    }]);
  });

  it("replans and detaches a complete ordered ground-item localized-string list CAS", () => {
    const localizedStrings = [{
      field: "LocalizedName",
      expectedValue: "Sword",
      value: "Sword 2",
      expectedProfile: "multi_entry_inline_ascii",
      expectedEntries: [
        { languageId: 42, text: "Legacy" },
        { languageId: 0, text: "Sword" },
      ],
      valueEntries: [
        { languageId: 0, text: "Sword 2" },
        { languageId: 2, text: "Epee" },
        { languageId: 42, text: "Legacy 2" },
      ],
    }];
    const plan = planExistingAreaObjectDeletions(
      sourceGit({
        itemLocalizedStringFields: [{
          label: "LocalizedName",
          type: "cexolocstring",
          value: {
            strRef: 0xffff_ffff,
            entries: [
              { languageId: 42, text: "Legacy" },
              { languageId: 0, text: "Sword" },
            ],
          },
        }],
      }),
      editing(
        [
          retained("obj_cre_nw_guard", "creature", "creatures", "nw_guard", "NW_GUARD", 1, 2),
          retained("obj_itm_nw_sword", "item", "items", "nw_sword", "NW_SWORD", 3, 4),
        ],
        [{
          kind: "item",
          sourceObjectId: "obj_itm_nw_sword",
          sourceIndex: 0,
          localizedStrings,
        } as never],
      ),
    );

    expect(plan.propertyMutations).toEqual([{
      kind: "item",
      sourceIndex: 0,
      localizedStrings,
    }]);
    expect((plan.propertyMutations[0] as any).localizedStrings).not.toBe(localizedStrings);
    expect((plan.propertyMutations[0] as any).localizedStrings[0].valueEntries)
      .not.toBe(localizedStrings[0]!.valueEntries);
  });

  it("replans one exact retained ground-item PropertiesList CAS by immutable ordinal", () => {
    const expectedEntries = [{
      sourceIndex: 0,
      propertyName: 1,
      subtype: 0xffff,
      costTable: 2,
      costValue: 3,
      param1: 0xff,
      param1Value: 0,
      chanceAppear: 100,
    }];
    const entries = [{
      propertyName: 48,
      subtype: 7,
      costTable: 24,
      costValue: 9,
      param1: 1,
      param1Value: 2,
      chanceAppear: 75,
    }];
    const plan = planExistingAreaObjectDeletions(
      sourceGit({ itemPropertyListFields: [itemPropertyListField()] }),
      editing(
        [
          retained("obj_cre_nw_guard", "creature", "creatures", "nw_guard", "NW_GUARD", 1, 2),
          retained("obj_itm_nw_sword", "item", "items", "nw_sword", "NW_SWORD", 3, 4),
        ],
        [{
          kind: "item",
          sourceObjectId: "obj_itm_nw_sword",
          sourceIndex: 0,
          propertyList: {
            expectedValue: { present: true, expectedEntries },
            entries,
          },
        } as never],
      ),
    );

    expect(plan.propertyMutations).toEqual([{
      kind: "item",
      sourceIndex: 0,
      propertyList: {
        expectedValue: { present: true, expectedEntries },
        entries,
      },
    }]);
    expect(Object.isFrozen((plan.propertyMutations[0] as any).propertyList)).toBe(true);
  });

  it("replans one exact retained ground-Item ItemList CAS by immutable ordinal", () => {
    const expectedEntries = [
      { sourceIndex: 0, resRef: "nested_a", x: 1, y: 2 },
      { sourceIndex: 1, resRef: "nested_b", x: 3, y: 4 },
    ];
    const entries = [
      { sourceIndex: 1, resRef: "nested_b", x: 30, y: 40 },
      { sourceIndex: 0, resRef: "nested_a", x: 10, y: 20 },
    ];
    const plan = planExistingAreaObjectDeletions(
      sourceGit({ itemInventory: expectedEntries }),
      editing(
        [
          retained("obj_cre_nw_guard", "creature", "creatures", "nw_guard", "NW_GUARD", 1, 2),
          retained("obj_itm_nw_sword", "item", "items", "nw_sword", "NW_SWORD", 3, 4),
        ],
        [{
          kind: "item",
          sourceObjectId: "obj_itm_nw_sword",
          sourceIndex: 0,
          inventory: { expectedEntries, entries },
        } as never],
      ),
    );

    expect(plan.propertyMutations).toEqual([{
      kind: "item",
      sourceIndex: 0,
      inventory: { expectedEntries, entries },
    }]);
    expect(Object.isFrozen((plan.propertyMutations[0] as any).inventory)).toBe(true);
  });

  it("rejects stale retained ground-Item ItemList provenance", () => {
    const error = propertyPlanError(
      sourceGit({ itemInventory: [
        { sourceIndex: 0, resRef: "nested_a", x: 1, y: 2 },
      ] }),
      editing(
        [
          retained("obj_cre_nw_guard", "creature", "creatures", "nw_guard", "NW_GUARD", 1, 2),
          retained("obj_itm_nw_sword", "item", "items", "nw_sword", "NW_SWORD", 3, 4),
        ],
        [{
          kind: "item",
          sourceObjectId: "obj_itm_nw_sword",
          sourceIndex: 0,
          inventory: {
            expectedEntries: [
              { sourceIndex: 0, resRef: "nested_a", x: 9, y: 2 },
            ],
            entries: [],
          },
        } as never],
      ),
    );

    expect(error.details).toEqual(["obj_itm_nw_sword", "ItemList stale"]);
  });

  it("replans one exact retained ground-Item static visual-transform CAS", () => {
    const expectedValue = itemVisualTransformStorage();
    const plan = planExistingAreaObjectDeletions(
      sourceGit({ itemVisualTransformFields: [itemVisualTransformField()] }),
      editing(
        [
          retained("obj_cre_nw_guard", "creature", "creatures", "nw_guard", "NW_GUARD", 1, 2),
          retained("obj_itm_nw_sword", "item", "items", "nw_sword", "NW_SWORD", 3, 4),
        ],
        [{
          kind: "item",
          sourceObjectId: "obj_itm_nw_sword",
          sourceIndex: 0,
          visualTransform: {
            expectedValue,
            value: { present: false },
          },
        } as never],
      ),
    );

    expect(plan.propertyMutations).toEqual([{
      kind: "item",
      sourceIndex: 0,
      visualTransform: {
        expectedValue,
        value: { present: false },
      },
    }]);
    expect(Object.isFrozen((plan.propertyMutations[0] as any).visualTransform)).toBe(true);
  });

  it("rejects stale retained ground-Item static visual-transform provenance", () => {
    const expectedValue = itemVisualTransformStorage();
    const error = propertyPlanError(
      sourceGit({ itemVisualTransformFields: [itemVisualTransformField()] }),
      editing(
        [
          retained("obj_cre_nw_guard", "creature", "creatures", "nw_guard", "NW_GUARD", 1, 2),
          retained("obj_itm_nw_sword", "item", "items", "nw_sword", "NW_SWORD", 3, 4),
        ],
        [{
          kind: "item",
          sourceObjectId: "obj_itm_nw_sword",
          sourceIndex: 0,
          visualTransform: {
            expectedValue: {
              ...expectedValue,
              value: { ...expectedValue.value, rotateZ: Math.fround(91) },
            },
            value: { present: false },
          },
        } as never],
      ),
    );

    expect(error.details).toEqual([
      "obj_itm_nw_sword",
      "VisTransformList stale",
    ]);
  });

  it("rejects stale retained ground-item PropertiesList provenance", () => {
    const error = propertyPlanError(
      sourceGit({ itemPropertyListFields: [itemPropertyListField()] }),
      editing(
        [
          retained("obj_cre_nw_guard", "creature", "creatures", "nw_guard", "NW_GUARD", 1, 2),
          retained("obj_itm_nw_sword", "item", "items", "nw_sword", "NW_SWORD", 3, 4),
        ],
        [{
          kind: "item",
          sourceObjectId: "obj_itm_nw_sword",
          sourceIndex: 0,
          propertyList: {
            expectedValue: {
              present: true,
              expectedEntries: [{
                sourceIndex: 0,
                propertyName: 1,
                subtype: 0xffff,
                costTable: 2,
                costValue: 99,
                param1: 0xff,
                param1Value: 0,
                chanceAppear: 100,
              }],
            },
            entries: [],
          },
        } as never],
      ),
    );

    expect(error.details).toEqual(["obj_itm_nw_sword", "PropertiesList stale"]);
  });

  it.each([
    ["an incomplete pair", { expectedResRef: "nw_sword" }, "TemplateResRef invalid_pair"],
    [
      "an unchanged pair",
      { expectedResRef: "nw_sword", resRef: "nw_sword" },
      "TemplateResRef invalid_pair",
    ],
    [
      "a noncanonical target",
      { expectedResRef: "nw_sword", resRef: "CUSTOM_SWORD" },
      "TemplateResRef invalid_pair",
    ],
    [
      "a stale expected value",
      { expectedResRef: "stale", resRef: "custom_sword" },
      "TemplateResRef expected=stale actual=nw_sword",
    ],
  ])("rejects retained ground-item TemplateResRef CAS with %s", (
    _label,
    templateResRef,
    detail,
  ) => {
    const error = propertyPlanError(
      sourceGit(),
      editing(
        [
          retained("obj_cre_nw_guard", "creature", "creatures", "nw_guard", "NW_GUARD", 1, 2),
          retained("obj_itm_nw_sword", "item", "items", "nw_sword", "NW_SWORD", 3, 4),
        ],
        [{
          kind: "item",
          sourceObjectId: "obj_itm_nw_sword",
          sourceIndex: 0,
          templateResRef,
        } as never],
      ),
    );

    expect(error.details).toEqual(["obj_itm_nw_sword", detail]);
  });

  it("replans one exact retained ground-item instance-state CAS by immutable ordinal", () => {
    const expectedValue = {
      presentFields: [],
      values: {
        charges: 50, cost: 0, stolen: false, stackSize: 1,
        plot: false, addCost: 0, identified: false, cursed: false,
      },
    } as const;
    const value = { ...expectedValue.values, charges: 12, stackSize: 3, identified: true };
    const plan = planExistingAreaObjectDeletions(
      sourceGit(),
      editing(
        [
          retained("obj_cre_nw_guard", "creature", "creatures", "nw_guard", "NW_GUARD", 1, 2),
          retained("obj_itm_nw_sword", "item", "items", "nw_sword", "NW_SWORD", 3, 4),
        ],
        [{
          kind: "item",
          sourceObjectId: "obj_itm_nw_sword",
          sourceIndex: 0,
          instanceState: { expectedValue, value },
        } as never],
      ),
    );

    expect(plan.propertyMutations).toEqual([{
      kind: "item",
      sourceIndex: 0,
      instanceState: { expectedValue, value },
    }]);
    expect(Object.isFrozen((plan.propertyMutations[0] as any).instanceState)).toBe(true);
  });

  it("rejects stale retained ground-item instance-state provenance", () => {
    const error = propertyPlanError(
      sourceGit(),
      editing(
        [
          retained("obj_cre_nw_guard", "creature", "creatures", "nw_guard", "NW_GUARD", 1, 2),
          retained("obj_itm_nw_sword", "item", "items", "nw_sword", "NW_SWORD", 3, 4),
        ],
        [{
          kind: "item",
          sourceObjectId: "obj_itm_nw_sword",
          sourceIndex: 0,
          instanceState: {
            expectedValue: {
              presentFields: ["charges"],
              values: {
                charges: 7, cost: 0, stolen: false, stackSize: 1,
                plot: false, addCost: 0, identified: false, cursed: false,
              },
            },
            value: {
              charges: 8, cost: 0, stolen: false, stackSize: 1,
              plot: false, addCost: 0, identified: false, cursed: false,
            },
          },
        } as never],
      ),
    );
    expect(error.details).toEqual(["obj_itm_nw_sword", "instance_state stale_storage"]);
  });

  it.each([
    ["non-object", null, sourceGic(["Water Trough"]), ["obj_plc_chest", "Comment invalid_pair"]],
    ["primitive", 42, sourceGic(["Water Trough"]), ["obj_plc_chest", "Comment invalid_pair"]],
    ["array", [], sourceGic(["Water Trough"]), ["obj_plc_chest", "Comment invalid_pair"]],
    ["missing expected", { value: "new" }, sourceGic(["Water Trough"]), ["obj_plc_chest", "Comment incomplete"]],
    ["missing target", { expectedValue: "Water Trough" }, sourceGic(["Water Trough"]), ["obj_plc_chest", "Comment incomplete"]],
    ["unexpected key", { expectedValue: "Water Trough", value: "new", trim: true }, sourceGic(["Water Trough"]), ["obj_plc_chest", "Comment unexpected_key=trim"]],
    ["invalid expected", { expectedValue: "bad\0comment", value: "new" }, sourceGic(["Water Trough"]), ["obj_plc_chest", "Comment invalid_expected"]],
    ["over-budget target", { expectedValue: "Water Trough", value: "x".repeat(4097) }, sourceGic(["Water Trough"]), ["obj_plc_chest", "Comment invalid"]],
    ["NUL target", { expectedValue: "Water Trough", value: "bad\0comment" }, sourceGic(["Water Trough"]), ["obj_plc_chest", "Comment invalid"]],
    ["stale provenance", { expectedValue: "Other", value: "new" }, sourceGic(["Water Trough"]), ["obj_plc_chest", "Comment expected=Other actual=Water Trough"]],
    ["unchanged target", { expectedValue: "Water Trough", value: "Water Trough" }, sourceGic(["Water Trough"]), ["obj_plc_chest"]],
    ["missing native field", { expectedValue: "", value: "new" }, sourceGic([undefined]), ["obj_plc_chest", "Comment missing"]],
  ])("rejects a Placeable editor-comment mutation with %s", (
    _label,
    editorComment,
    gic,
    details,
  ) => {
    expect(propertyPlanError(
      sourceGit({ includePlaceable: true }),
      editing(
        [retained("obj_plc_chest", "placeable", "placeables", "plc_chest", "CHEST", 4, 5)],
        [{ kind: "placeable", sourceObjectId: "obj_plc_chest", editorComment } as never],
      ),
      gic as Buffer,
    ).details).toEqual(details);
  });

  it.each([
    ["a missing paired ordinal", sourceGic([])],
    ["a wrong paired struct type", sourceGic(["Water Trough"], { structTypeId: 8 })],
    ["a duplicate native Comment", sourceGic(["Water Trough"], { duplicateComment: true })],
    ["a wrong native Comment type", sourceGic(["Water Trough"], { commentType: "resref" })],
  ])("rejects a Placeable editor-comment mutation against GIC with %s", (_label, gic) => {
    const error = propertyPlanError(
      sourceGit({ includePlaceable: true }),
      editing(
        [retained("obj_plc_chest", "placeable", "placeables", "plc_chest", "CHEST", 4, 5)],
        [{
          kind: "placeable",
          sourceObjectId: "obj_plc_chest",
          editorComment: { expectedValue: "Water Trough", value: "new" },
        } as never],
      ),
      gic,
    );
    expect(error.message).toMatch(/GIC/u);
  });

  it("rejects Placeable editor-comment provenance bound to another family or implicit deletion", () => {
    expect(propertyPlanError(
      sourceGit(),
      editing(
        [retained("obj_cre_nw_guard", "creature", "creatures", "nw_guard", "NW_GUARD", 1, 2)],
        [{
          kind: "placeable",
          sourceObjectId: "obj_cre_nw_guard",
          editorComment: { expectedValue: "", value: "new" },
        } as never],
      ),
      sourceGic([]),
    ).details).toEqual(["obj_cre_nw_guard"]);
    expect(propertyPlanError(
      sourceGit({ includePlaceable: true }),
      editing([], [{
        kind: "placeable",
        sourceObjectId: "obj_plc_chest",
        editorComment: { expectedValue: "Water Trough", value: "new" },
      } as never]),
      sourceGic(["Water Trough"]),
    ).details).toEqual(["obj_plc_chest"]);
  });

  it("resolves provenance-bound Placeable trap byte mutations in fixed native order", () => {
    const plan = planExistingAreaObjectDeletions(
      sourceGit({ includePlaceable: true }),
      editing(
        [retained("obj_plc_chest", "placeable", "placeables", "plc_chest", "CHEST", 4, 5)],
        [{
          kind: "placeable",
          sourceObjectId: "obj_plc_chest",
          trapFields: [
            { field: "TrapFlag", expectedValue: 0, value: 1 },
            { field: "TrapDetectable", expectedValue: 1, value: 0 },
            { field: "TrapDisarmable", expectedValue: 1, value: 0 },
            { field: "TrapOneShot", expectedValue: 1, value: 0 },
            { field: "TrapDetectDC", expectedValue: 0, value: 24 },
            { field: "DisarmDC", expectedValue: 15, value: 30 },
          ],
        }],
      ),
    );

    expect(plan.propertyMutations).toEqual([{
      kind: "placeable",
      sourceIndex: 0,
      trapFields: [
        { field: "TrapFlag", expectedValue: 0, value: 1 },
        { field: "TrapDetectable", expectedValue: 1, value: 0 },
        { field: "TrapDisarmable", expectedValue: 1, value: 0 },
        { field: "TrapOneShot", expectedValue: 1, value: 0 },
        { field: "TrapDetectDC", expectedValue: 0, value: 24 },
        { field: "DisarmDC", expectedValue: 15, value: 30 },
      ],
    }]);
    expect(Object.isFrozen((plan.propertyMutations[0] as any).trapFields)).toBe(true);
  });

  it("accepts an ordered proper subset of Placeable trap byte mutations", () => {
    const plan = planExistingAreaObjectDeletions(
      sourceGit({ includePlaceable: true }),
      editing(
        [retained("obj_plc_chest", "placeable", "placeables", "plc_chest", "CHEST", 4, 5)],
        [{
          kind: "placeable",
          sourceObjectId: "obj_plc_chest",
          trapFields: [
            { field: "TrapDetectable", expectedValue: 1, value: 0 },
            { field: "DisarmDC", expectedValue: 15, value: 16 },
          ],
        }],
      ),
    );

    expect(plan.propertyMutations).toEqual([{
      kind: "placeable",
      sourceIndex: 0,
      trapFields: [
        { field: "TrapDetectable", expectedValue: 1, value: 0 },
        { field: "DisarmDC", expectedValue: 15, value: 16 },
      ],
    }]);
  });

  it.each([
    ["non-array list", null, {}, ["obj_plc_chest", "trapFields invalid_list"]],
    ["empty list", [], {}, ["obj_plc_chest", "trapFields empty"]],
    ["null entry", [null], {}, ["obj_plc_chest", "trapFields entry invalid"]],
    ["array entry", [[]], {}, ["obj_plc_chest", "trapFields entry invalid"]],
    ["primitive entry", [1], {}, ["obj_plc_chest", "trapFields entry invalid"]],
    ["excluded TrapType", [{ field: "TrapType", expectedValue: 0, value: 1 }], {}, ["obj_plc_chest", "TrapType unsupported_trap_field"]],
    ["unexpected entry key", [{ field: "TrapFlag", expectedValue: 0, value: 1, setDc: 12 }], {}, ["obj_plc_chest", "TrapFlag unexpected_key=setDc"]],
    ["duplicate field", [
      { field: "TrapFlag", expectedValue: 0, value: 1 },
      { field: "TrapFlag", expectedValue: 0, value: 1 },
    ], {}, ["obj_plc_chest", "TrapFlag duplicate"]],
    ["out-of-order field", [
      { field: "DisarmDC", expectedValue: 15, value: 16 },
      { field: "TrapDetectable", expectedValue: 1, value: 0 },
    ], {}, ["obj_plc_chest", "TrapDetectable out_of_order"]],
    ["missing expected value", [{ field: "TrapFlag", value: 1 }], {}, ["obj_plc_chest", "TrapFlag incomplete"]],
    ["missing target value", [{ field: "TrapFlag", expectedValue: 0 }], {}, ["obj_plc_chest", "TrapFlag incomplete"]],
    ["invalid expected flag", [{ field: "TrapFlag", expectedValue: false, value: 1 }], {}, ["obj_plc_chest", "TrapFlag invalid_expected_flag"]],
    ["invalid target flag", [{ field: "TrapFlag", expectedValue: 0, value: 2 }], {}, ["obj_plc_chest", "TrapFlag invalid_flag"]],
    ["invalid expected DC", [{ field: "TrapDetectDC", expectedValue: "0", value: 12 }], {}, ["obj_plc_chest", "TrapDetectDC invalid_expected_byte"]],
    ["out-of-range target DC", [{ field: "TrapDetectDC", expectedValue: 0, value: 256 }], {}, ["obj_plc_chest", "TrapDetectDC invalid_byte"]],
    ["stale flag provenance", [{ field: "TrapOneShot", expectedValue: 0, value: 1 }], {}, ["obj_plc_chest", "TrapOneShot expected=0 actual=1"]],
    ["stale DC provenance", [{ field: "DisarmDC", expectedValue: 14, value: 16 }], {}, ["obj_plc_chest", "DisarmDC expected=14 actual=15"]],
    ["unchanged target", [{ field: "TrapDetectable", expectedValue: 1, value: 1 }], {}, ["obj_plc_chest"]],
    ["missing native field", [{ field: "TrapDisarmable", expectedValue: 1, value: 0 }], { omitPlaceableTrapByteField: "TrapDisarmable" }, ["obj_plc_chest", "TrapDisarmable missing"]],
  ])("rejects a Placeable trap byte mutation with %s", (
    _label,
    trapFields,
    sourceOptions,
    details,
  ) => {
    expect(propertyPlanError(
      sourceGit({ includePlaceable: true, ...sourceOptions }),
      editing(
        [retained("obj_plc_chest", "placeable", "placeables", "plc_chest", "CHEST", 4, 5)],
        [{ kind: "placeable", sourceObjectId: "obj_plc_chest", trapFields } as never],
      ),
    ).details).toEqual(details);
  });

  it("rejects Placeable trap byte provenance bound to another GIT family", () => {
    expect(propertyPlanError(
      sourceGit(),
      editing(
        [retained("obj_cre_nw_guard", "creature", "creatures", "nw_guard", "NW_GUARD", 1, 2)],
        [{
          kind: "placeable",
          sourceObjectId: "obj_cre_nw_guard",
          trapFields: [{ field: "TrapFlag", expectedValue: 0, value: 1 }],
        } as never],
      ),
    ).details).toEqual(["obj_cre_nw_guard"]);
  });

  it("accepts an ordered proper subset of provenance-bound Placeable lock bytes", () => {
    const plan = planExistingAreaObjectDeletions(
      sourceGit({ includePlaceable: true }),
      editing(
        [
          retained("obj_cre_nw_guard", "creature", "creatures", "nw_guard", "NW_GUARD", 1, 2),
          retained("obj_plc_chest", "placeable", "placeables", "plc_chest", "CHEST", 4, 5),
        ],
        [{
          kind: "placeable",
          sourceObjectId: "obj_plc_chest",
          lockFields: [
            { field: "Lockable", expectedValue: false, value: true },
            { field: "OpenLockDC", expectedValue: 18, value: 24 },
          ],
        }],
      ),
    );

    expect(plan.propertyMutations).toEqual([{
      kind: "placeable",
      sourceIndex: 0,
      lockFields: [
        { field: "Lockable", expectedValue: false, value: true },
        { field: "OpenLockDC", expectedValue: 18, value: 24 },
      ],
    }]);
  });

  it("resolves a provenance-bound Placeable KeyName to the immutable ordinal", () => {
    const plan = planExistingAreaObjectDeletions(
      sourceGit({ includePlaceable: true }),
      editing(
        [
          retained("obj_cre_nw_guard", "creature", "creatures", "nw_guard", "NW_GUARD", 1, 2),
          retained("obj_plc_chest", "placeable", "placeables", "plc_chest", "CHEST", 4, 5),
        ],
        [{
          kind: "placeable",
          sourceObjectId: "obj_plc_chest",
          keyName: { expectedValue: "", value: "CHEST_KEY_01" },
        }],
      ),
    );
    expect(plan.propertyMutations).toEqual([{
      kind: "placeable",
      sourceIndex: 0,
      keyName: { expectedValue: "", value: "CHEST_KEY_01" },
    }]);
  });

  it.each([
    ["non-object", null, ["obj_plc_chest", "KeyName invalid_pair"]],
    ["primitive", 7, ["obj_plc_chest", "KeyName invalid_pair"]],
    ["array", [], ["obj_plc_chest", "KeyName invalid_pair"]],
    ["missing expected", { value: "key" }, ["obj_plc_chest", "KeyName incomplete"]],
    ["missing target", { expectedValue: "" }, ["obj_plc_chest", "KeyName incomplete"]],
    ["non-string expected", { expectedValue: 7, value: "key" }, ["obj_plc_chest", "KeyName invalid_expected"]],
    ["over-limit target", { expectedValue: "", value: "K".repeat(33) }, ["obj_plc_chest", "KeyName invalid"]],
    ["NUL target", { expectedValue: "", value: "bad\0key" }, ["obj_plc_chest", "KeyName invalid"]],
    ["stale provenance", { expectedValue: "other", value: "key" }, ["obj_plc_chest", "KeyName expected=other actual="]],
    ["unchanged target", { expectedValue: "", value: "" }, ["obj_plc_chest"]],
  ])("rejects a Placeable KeyName mutation with %s", (_label, keyName, details) => {
    expect(propertyPlanError(
      sourceGit({ includePlaceable: true }),
      editing([
        retained("obj_cre_nw_guard", "creature", "creatures", "nw_guard", "NW_GUARD", 1, 2),
        retained("obj_plc_chest", "placeable", "placeables", "plc_chest", "CHEST", 4, 5),
      ], [{ kind: "placeable", sourceObjectId: "obj_plc_chest", keyName } as never]),
    ).details).toEqual(details);
  });

  it("rejects a Placeable KeyName mutation when exact source provenance is absent", () => {
    expect(propertyPlanError(
      sourceGit({ includePlaceable: true, omitPlaceableKeyName: true }),
      editing([
        retained("obj_cre_nw_guard", "creature", "creatures", "nw_guard", "NW_GUARD", 1, 2),
        retained("obj_plc_chest", "placeable", "placeables", "plc_chest", "CHEST", 4, 5),
      ], [{
        kind: "placeable",
        sourceObjectId: "obj_plc_chest",
        keyName: { expectedValue: "", value: "key" },
      }] as never),
    ).details).toEqual(["obj_plc_chest", "KeyName missing"]);
  });

  it.each([
    ["non-array list", null, ["obj_plc_chest", "lockFields invalid_list"]],
    ["empty list", [], ["obj_plc_chest", "lockFields empty"]],
    ["null entry", [null], ["obj_plc_chest", "lockFields entry invalid"]],
    ["primitive entry", [7], ["obj_plc_chest", "lockFields entry invalid"]],
    ["array entry", [[]], ["obj_plc_chest", "lockFields entry invalid"]],
    ["unsupported field", [{ field: "KeyName", expectedValue: "", value: "key" }], ["obj_plc_chest", "KeyName unsupported_lock_field"]],
    ["duplicate field", [
      { field: "Locked", expectedValue: false, value: true },
      { field: "Locked", expectedValue: false, value: true },
    ], ["obj_plc_chest", "Locked duplicate"]],
    ["out-of-order field", [
      { field: "OpenLockDC", expectedValue: 18, value: 24 },
      { field: "Locked", expectedValue: false, value: true },
    ], ["obj_plc_chest", "Locked out_of_order"]],
    ["missing expected value", [{ field: "Locked", value: true }], ["obj_plc_chest", "Locked incomplete"]],
    ["missing target value", [{ field: "Locked", expectedValue: false }], ["obj_plc_chest", "Locked incomplete"]],
    ["invalid expected boolean", [{ field: "Locked", expectedValue: 0, value: true }], ["obj_plc_chest", "Locked invalid_expected_boolean"]],
    ["invalid target boolean", [{ field: "Locked", expectedValue: false, value: 1 }], ["obj_plc_chest", "Locked invalid_boolean"]],
    ["invalid expected DC", [{ field: "OpenLockDC", expectedValue: "18", value: 24 }], ["obj_plc_chest", "OpenLockDC invalid_expected_byte"]],
    ["stale provenance", [{ field: "OpenLockDC", expectedValue: 17, value: 24 }], ["obj_plc_chest", "OpenLockDC expected=17 actual=18"]],
    ["out-of-range target", [{ field: "OpenLockDC", expectedValue: 18, value: 256 }], ["obj_plc_chest", "OpenLockDC invalid_byte"]],
    ["negative target", [{ field: "OpenLockDC", expectedValue: 18, value: -1 }], ["obj_plc_chest", "OpenLockDC invalid_byte"]],
    ["fractional target", [{ field: "OpenLockDC", expectedValue: 18, value: 1.5 }], ["obj_plc_chest", "OpenLockDC invalid_byte"]],
    ["unchanged target", [{ field: "OpenLockDC", expectedValue: 18, value: 18 }], ["obj_plc_chest"]],
  ])("rejects a Placeable lock mutation with %s", (_label, lockFields, details) => {
    expect(propertyPlanError(
      sourceGit({ includePlaceable: true }),
      editing([
        retained("obj_cre_nw_guard", "creature", "creatures", "nw_guard", "NW_GUARD", 1, 2),
        retained("obj_plc_chest", "placeable", "placeables", "plc_chest", "CHEST", 4, 5),
      ], [{ kind: "placeable", sourceObjectId: "obj_plc_chest", lockFields } as never]),
    ).details).toEqual(details);
  });

  it("rejects a Placeable lock mutation whose exact source Byte is absent", () => {
    expect(propertyPlanError(
      sourceGit({ includePlaceable: true, omitPlaceableLockField: "Locked" }),
      editing([
        retained("obj_cre_nw_guard", "creature", "creatures", "nw_guard", "NW_GUARD", 1, 2),
        retained("obj_plc_chest", "placeable", "placeables", "plc_chest", "CHEST", 4, 5),
      ], [{
        kind: "placeable",
        sourceObjectId: "obj_plc_chest",
        lockFields: [{ field: "Locked", expectedValue: false, value: true }],
      }]),
    ).details).toEqual(["obj_plc_chest", "Locked missing"]);
  });

  it("resolves provenance-bound placeable script ResRefs to one immutable ordinal", () => {
    const source = sourceGit({ includePlaceable: true });
    const plan = planExistingAreaObjectDeletions(source, editing(
      [
        retained("obj_cre_nw_guard", "creature", "creatures", "nw_guard", "NW_GUARD", 1, 2),
        retained("obj_plc_chest", "placeable", "placeables", "plc_chest", "CHEST", 4, 5),
      ],
      [{
        kind: "placeable",
        sourceObjectId: "obj_plc_chest",
        scripts: [
          { field: "OnClick", expectedResRef: "", resRef: "new_click" },
          { field: "OnLock", expectedResRef: "old_lock", resRef: "new_lock" },
          { field: "OnOpen", expectedResRef: "old_open", resRef: "new_open" },
        ],
      }],
    ));

    expect(plan.propertyMutations).toEqual([{
      kind: "placeable",
      sourceIndex: 0,
      scripts: [
        { field: "OnClick", expectedResRef: "", resRef: "new_click" },
        { field: "OnLock", expectedResRef: "old_lock", resRef: "new_lock" },
        { field: "OnOpen", expectedResRef: "old_open", resRef: "new_open" },
      ],
    }]);
    expect(Object.isFrozen(plan.propertyMutations[0]?.scripts)).toBe(true);
  });

  it("resolves provenance-bound placeable trap script ResRefs to one immutable ordinal", () => {
    const source = sourceGit({ includePlaceable: true });
    const plan = planExistingAreaObjectDeletions(source, editing(
      [
        retained("obj_cre_nw_guard", "creature", "creatures", "nw_guard", "NW_GUARD", 1, 2),
        retained("obj_plc_chest", "placeable", "placeables", "plc_chest", "CHEST", 4, 5),
      ],
      [{
        kind: "placeable",
        sourceObjectId: "obj_plc_chest",
        trapScripts: [
          { field: "OnDisarm", expectedResRef: "old_disarm", resRef: "new_disarm" },
          { field: "OnTrapTriggered", expectedResRef: "old_trap", resRef: "new_trap" },
        ],
      }],
    ));

    expect(plan.propertyMutations).toEqual([{
      kind: "placeable",
      sourceIndex: 0,
      trapScripts: [
        { field: "OnDisarm", expectedResRef: "old_disarm", resRef: "new_disarm" },
        { field: "OnTrapTriggered", expectedResRef: "old_trap", resRef: "new_trap" },
      ],
    }]);
    expect(Object.isFrozen(plan.propertyMutations[0]?.trapScripts)).toBe(true);
  });

  it.each([
    ["a non-array list", "invalid", {}, ["obj_plc_chest", "trapScripts invalid"]],
    ["an empty list", [], {}, ["obj_plc_chest", "trapScripts empty"]],
    ["an invalid entry", [null], {}, ["obj_plc_chest", "trap script entry invalid"]],
    ["a primitive entry", ["invalid"], {}, ["obj_plc_chest", "trap script entry invalid"]],
    ["an array entry", [[]], {}, ["obj_plc_chest", "trap script entry invalid"]],
    ["an unsupported field", [{ field: "OnOpen", expectedResRef: "", resRef: "new_open" }], {}, ["obj_plc_chest", "field=OnOpen"]],
    ["a duplicate field", [
      { field: "OnDisarm", expectedResRef: "old_disarm", resRef: "new_disarm" },
      { field: "OnDisarm", expectedResRef: "old_disarm", resRef: "other_disarm" },
    ], {}, ["obj_plc_chest", "OnDisarm duplicate"]],
    ["an incomplete pair", [{ field: "OnDisarm", expectedResRef: "old_disarm" }], {}, ["obj_plc_chest", "OnDisarm incomplete"]],
    ["a pair without an expected value", [{ field: "OnDisarm", resRef: "new_disarm" }], {}, ["obj_plc_chest", "OnDisarm incomplete"]],
    ["an invalid expected value", [{ field: "OnDisarm", expectedResRef: "bad-script", resRef: "new_disarm" }], {}, ["obj_plc_chest", "OnDisarm invalid expected ResRef"]],
    ["an invalid target value", [{ field: "OnDisarm", expectedResRef: "old_disarm", resRef: "bad-script" }], {}, ["obj_plc_chest", "OnDisarm invalid target ResRef"]],
    ["a missing native field", [{ field: "OnDisarm", expectedResRef: "old_disarm", resRef: "new_disarm" }], { omitPlaceableScriptField: "OnDisarm" }, ["obj_plc_chest", "OnDisarm missing"]],
    ["stale provenance", [{ field: "OnDisarm", expectedResRef: "stale", resRef: "new_disarm" }], {}, ["obj_plc_chest", "OnDisarm expected=stale actual=old_disarm"]],
    ["an unchanged value", [{ field: "OnDisarm", expectedResRef: "old_disarm", resRef: "old_disarm" }], {}, ["obj_plc_chest", "OnDisarm unchanged"]],
  ])("rejects a placeable trap script mutation with %s", (_label, trapScripts, sourceOptions, details) => {
    const retainedObjects = [
      retained("obj_cre_nw_guard", "creature", "creatures", "nw_guard", "NW_GUARD", 1, 2),
      retained("obj_plc_chest", "placeable", "placeables", "plc_chest", "CHEST", 4, 5),
    ];
    expect(propertyPlanError(
      sourceGit({ includePlaceable: true, ...sourceOptions }),
      editing(retainedObjects, [{
        kind: "placeable",
        sourceObjectId: "obj_plc_chest",
        trapScripts,
      } as never]),
    ).details).toEqual(details);
  });

  it.each([
    ["a non-array script list", "invalid", {}, ["obj_plc_chest", "scripts invalid"]],
    ["an empty script list", [], {}, ["obj_plc_chest", "scripts empty"]],
    ["a null entry", [null], {}, ["obj_plc_chest", "script entry invalid"]],
    ["a primitive entry", ["invalid"], {}, ["obj_plc_chest", "script entry invalid"]],
    ["an array entry", [[]], {}, ["obj_plc_chest", "script entry invalid"]],
    [
      "a stale expected value",
      [{ field: "OnOpen", expectedResRef: "stale", resRef: "new_open" }],
      {},
      ["obj_plc_chest", "OnOpen expected=stale actual=old_open"],
    ],
    [
      "a missing native field",
      [{ field: "OnOpen", expectedResRef: "old_open", resRef: "new_open" }],
      { omitPlaceableScriptField: "OnOpen" },
      ["obj_plc_chest", "OnOpen missing"],
    ],
    [
      "a duplicate field",
      [
        { field: "OnOpen", expectedResRef: "old_open", resRef: "new_open" },
        { field: "OnOpen", expectedResRef: "old_open", resRef: "other_open" },
      ],
      {},
      ["obj_plc_chest", "OnOpen duplicate"],
    ],
    [
      "an unsupported field",
      [{ field: "OnFailToOpen", expectedResRef: "", resRef: "new_fail" }],
      {},
      ["obj_plc_chest", "field=OnFailToOpen"],
    ],
    [
      "an invalid expected ResRef",
      [{ field: "OnOpen", expectedResRef: "bad-script", resRef: "new_open" }],
      {},
      ["obj_plc_chest", "OnOpen invalid expected ResRef"],
    ],
    [
      "an invalid target ResRef",
      [{ field: "OnOpen", expectedResRef: "old_open", resRef: "bad-script" }],
      {},
      ["obj_plc_chest", "OnOpen invalid target ResRef"],
    ],
    [
      "an unchanged value",
      [{ field: "OnOpen", expectedResRef: "old_open", resRef: "old_open" }],
      {},
      ["obj_plc_chest", "OnOpen unchanged"],
    ],
    [
      "an incomplete entry",
      [{ field: "OnOpen", expectedResRef: "old_open" }],
      {},
      ["obj_plc_chest", "OnOpen incomplete"],
    ],
    [
      "an entry without an expected value",
      [{ field: "OnOpen", resRef: "new_open" }],
      {},
      ["obj_plc_chest", "OnOpen incomplete"],
    ],
  ])("rejects a placeable script mutation with %s", (_label, scripts, sourceOptions, details) => {
    const retainedObjects = [
      retained("obj_cre_nw_guard", "creature", "creatures", "nw_guard", "NW_GUARD", 1, 2),
      retained("obj_plc_chest", "placeable", "placeables", "plc_chest", "CHEST", 4, 5),
    ];
    expect(propertyPlanError(
      sourceGit({ includePlaceable: true, ...sourceOptions }),
      editing(retainedObjects, [{
        kind: "placeable",
        sourceObjectId: "obj_plc_chest",
        scripts,
      } as never]),
    ).details).toEqual(details);
  });

  it.each([
    ["Static", { expectedStatic: false, static: true }, "Static expected=false actual=true"],
    ["Useable", { expectedUseable: true, useable: false }, "Useable expected=true actual=false"],
    ["Plot", { expectedPlot: true, plot: false }, "Plot expected=true actual=false"],
    ["HasInventory", { expectedHasInventory: true, hasInventory: false }, "HasInventory expected=true actual=false"],
  ])("rejects stale placeable %s provenance", (_label, values, diagnostic) => {
    const retainedObjects = [
      retained("obj_cre_nw_guard", "creature", "creatures", "nw_guard", "NW_GUARD", 1, 2),
      retained("obj_plc_chest", "placeable", "placeables", "plc_chest", "CHEST", 4, 5),
    ];
    expect(propertyPlanError(
      sourceGit({ includePlaceable: true }),
      editing(retainedObjects, [{
        kind: "placeable",
        sourceObjectId: "obj_plc_chest",
        ...values,
      }]),
    ).details).toEqual(["obj_plc_chest", diagnostic]);
  });

  it.each([
    ["Static", { omitPlaceableStatic: true }, { expectedStatic: true, static: false }, "Static missing"],
    ["Useable", { omitPlaceableUseable: true }, { expectedUseable: false, useable: true }, "Useable missing"],
    ["Plot", { omitPlaceablePlot: true }, { expectedPlot: false, plot: true }, "Plot missing"],
    ["HasInventory", { omitPlaceableHasInventory: true }, { expectedHasInventory: false, hasInventory: true }, "HasInventory missing"],
  ])("rejects a property mutation when the native placeable has no %s field", (_label, sourceOptions, values, diagnostic) => {
    const retainedObjects = [
      retained("obj_cre_nw_guard", "creature", "creatures", "nw_guard", "NW_GUARD", 1, 2),
      retained("obj_plc_chest", "placeable", "placeables", "plc_chest", "CHEST", 4, 5),
    ];
    expect(propertyPlanError(
      sourceGit({ includePlaceable: true, ...sourceOptions }),
      editing(retainedObjects, [{
        kind: "placeable",
        sourceObjectId: "obj_plc_chest",
        ...values,
      }]),
    ).details).toEqual(["obj_plc_chest", diagnostic]);
  });

  it("rejects a placeable OnUsed mutation whose retained source value differs from the exact GIT", () => {
    const source = sourceGit({ includePlaceable: true });
    expect(() => planExistingAreaObjectDeletions(source, editing(
      [
        retained("obj_cre_nw_guard", "creature", "creatures", "nw_guard", "NW_GUARD", 1, 2),
        retained("obj_plc_chest", "placeable", "placeables", "plc_chest", "CHEST", 4, 5),
      ],
      [{
        kind: "placeable",
        sourceObjectId: "obj_plc_chest",
        expectedOnUsed: "stale_value",
        onUsed: "s04_plcprobe",
      }],
    ))).toThrow(expect.objectContaining({
      details: expect.arrayContaining(["obj_plc_chest", "OnUsed expected=stale_value actual="])
    }));
  });

  it.each([
    ["not retained", "obj_plc_chest", [], "not retained", ["obj_plc_chest"]],
    [
      "wrong family",
      "obj_cre_nw_guard",
      [retained("obj_cre_nw_guard", "creature", "creatures", "nw_guard", "NW_GUARD", 1, 2)],
      "another GIT family",
      ["obj_cre_nw_guard"],
    ],
    [
      "missing source identity",
      "obj_plc_unknown",
      [retained("obj_plc_chest", "placeable", "placeables", "plc_chest", "CHEST", 4, 5)],
      "not retained",
      ["obj_plc_unknown"],
    ],
  ])("rejects a placeable property target that is %s", (_label, sourceObjectId, retainedObjects, message, details) => {
    const error = propertyPlanError(
      sourceGit({ includePlaceable: true }),
      editing(
        retainedObjects as ProjectedAreaObjectEditing["retainedObjects"],
        [{ kind: "placeable", sourceObjectId, expectedOnUsed: "", onUsed: "s04_plcprobe" }],
      ),
    );
    expect(error.message).toContain(message);
    expect(error.details).toEqual(details);
  });

  it("rejects duplicate and unchanged placeable property mutations", () => {
    const retainedObjects = [
      retained("obj_cre_nw_guard", "creature", "creatures", "nw_guard", "NW_GUARD", 1, 2),
      retained("obj_plc_chest", "placeable", "placeables", "plc_chest", "CHEST", 4, 5),
    ];
    const mutation = {
      kind: "placeable" as const,
      sourceObjectId: "obj_plc_chest",
      expectedOnUsed: "",
      onUsed: "s04_plcprobe",
    };
    expect(propertyPlanError(
      sourceGit({ includePlaceable: true }),
      editing(retainedObjects, [mutation, mutation]),
    ).details).toEqual(["obj_plc_chest"]);
    expect(propertyPlanError(
      sourceGit({ includePlaceable: true }),
      editing(retainedObjects, [{ ...mutation, onUsed: "" }]),
    ).details).toEqual(["obj_plc_chest"]);
  });

  it("rejects an unsupported Creature property before ordinal resolution", () => {
    const retainedObjects = [
      retained("obj_cre_nw_guard", "creature", "creatures", "nw_guard", "NW_GUARD", 1, 2),
    ];
    expect(propertyPlanError(
      sourceGit(),
      editing(retainedObjects, [{
        kind: "creature",
        sourceObjectId: "obj_cre_nw_guard",
        expectedOnUsed: "",
        onUsed: "s04_plcprobe",
      } as never]),
    ).details).toEqual(["obj_cre_nw_guard", "field=expectedOnUsed"]);
  });

  it("rejects a property mutation when the native placeable has no OnUsed field", () => {
    const retainedObjects = [
      retained("obj_cre_nw_guard", "creature", "creatures", "nw_guard", "NW_GUARD", 1, 2),
      retained("obj_plc_chest", "placeable", "placeables", "plc_chest", "CHEST", 4, 5),
    ];
    expect(propertyPlanError(
      sourceGit({ includePlaceable: true, omitPlaceableOnUsed: true }),
      editing(retainedObjects, [{
        kind: "placeable",
        sourceObjectId: "obj_plc_chest",
        expectedOnUsed: "",
        onUsed: "s04_plcprobe",
      }]),
    ).details).toEqual(["obj_plc_chest", "OnUsed missing"]);
  });

  it.each([
    ["empty", {}, ["obj_plc_chest"]],
    ["OnUsed expected only", { expectedOnUsed: "old_script" }, ["obj_plc_chest", "OnUsed incomplete"]],
    ["OnUsed target only", { onUsed: "new_script" }, ["obj_plc_chest", "OnUsed incomplete"]],
    ["Static expected only", { expectedStatic: true }, ["obj_plc_chest", "Static incomplete"]],
    ["Static target only", { static: false }, ["obj_plc_chest", "Static incomplete"]],
    ["Useable expected only", { expectedUseable: false }, ["obj_plc_chest", "Useable incomplete"]],
    ["Useable target only", { useable: true }, ["obj_plc_chest", "Useable incomplete"]],
    ["Plot expected only", { expectedPlot: false }, ["obj_plc_chest", "Plot incomplete"]],
    ["Plot target only", { plot: true }, ["obj_plc_chest", "Plot incomplete"]],
    ["HasInventory expected only", { expectedHasInventory: false }, ["obj_plc_chest", "HasInventory incomplete"]],
    ["HasInventory target only", { hasInventory: true }, ["obj_plc_chest", "HasInventory incomplete"]],
    ["unchanged Static", { expectedStatic: true, static: true }, ["obj_plc_chest"]],
    ["unchanged Useable", { expectedUseable: false, useable: false }, ["obj_plc_chest"]],
    ["unchanged Plot", { expectedPlot: false, plot: false }, ["obj_plc_chest"]],
    ["unchanged HasInventory", { expectedHasInventory: false, hasInventory: false }, ["obj_plc_chest"]],
  ])("rejects a %s placeable property mutation", (_label, values, details) => {
    const retainedObjects = [
      retained("obj_cre_nw_guard", "creature", "creatures", "nw_guard", "NW_GUARD", 1, 2),
      retained("obj_plc_chest", "placeable", "placeables", "plc_chest", "CHEST", 4, 5),
    ];
    expect(propertyPlanError(
      sourceGit({ includePlaceable: true }),
      editing(retainedObjects, [{
        kind: "placeable",
        sourceObjectId: "obj_plc_chest",
        ...values,
      }]),
    ).details).toEqual(details);
  });

  it("plans the audited waypoint position and orientation-vector transform", () => {
    const source = sourceGit({ includeWaypoint: true });
    const creature = retained(
      "obj_cre_nw_guard",
      "creature",
      "creatures",
      "nw_guard",
      "NW_GUARD",
      1,
      2,
    );
    const movedWaypoint = {
      ...retained(
        "obj_wpt_waypoint",
        "waypoint",
        "waypoints",
        "nw_waypoint001",
        "WAYPOINT",
        3.5,
        4.75,
      ),
      z: 0.35,
      bearing: Math.PI * 1.25,
    };

    const plan = planExistingAreaObjectDeletions(source, editing([creature, movedWaypoint]));

    expect(plan.transforms).toEqual([{
      kind: "waypoint",
      sourceIndex: 0,
      x: 3.5,
      y: 4.75,
      z: 0.35,
      bearing: Math.PI * 1.25,
    }]);
    expect(plan.deletions).toEqual([{ kind: "item", sourceIndex: 0 }]);
  });

  it("plans the audited store position and orientation-vector transform", () => {
    const source = sourceGit({ includeStore: true });
    const creature = retained(
      "obj_cre_nw_guard",
      "creature",
      "creatures",
      "nw_guard",
      "NW_GUARD",
      1,
      2,
    );
    const movedStore = {
      ...retained(
        "obj_sto_x2_merc_dye",
        "store",
        "stores",
        "x2_merc_dye",
        "x2_merc_dye",
        4.75,
        5.25,
      ),
      z: 0.1,
      bearing: Math.PI / 3,
    };

    const plan = planExistingAreaObjectDeletions(source, editing([creature, movedStore]));

    expect(plan.transforms).toEqual([{
      kind: "store",
      sourceIndex: 0,
      x: 4.75,
      y: 5.25,
      z: 0.1,
      bearing: Math.PI / 3,
    }]);
    expect(plan.deletions).toEqual([{ kind: "item", sourceIndex: 0 }]);
  });

  it("plans the audited position-only transform for one retained trigger origin", () => {
    const source = sourceGit({ includeTrigger: true });
    const movedTrigger = {
      ...retained(
        "obj_trg_generictrigger",
        "trigger",
        "triggers",
        "newgeneric",
        "GenericTrigger",
        4.25,
        5.75,
      ),
      z: 0.5,
      bearing: 0,
    };

    const plan = planExistingAreaObjectDeletions(source, editing([movedTrigger]));

    expect(plan.transforms).toEqual([{
      kind: "trigger",
      sourceIndex: 0,
      x: 4.25,
      y: 5.75,
      z: 0.5,
    }]);
  });

  it("rejects a trigger bearing delta without inventing native orientation", () => {
    const rotatedTrigger = {
      ...retained(
        "obj_trg_generictrigger",
        "trigger",
        "triggers",
        "newgeneric",
        "GenericTrigger",
        3.547599411010742,
        4.49111,
      ),
      bearing: Math.PI / 2,
    };

    expect(planError(sourceGit({ includeTrigger: true }), [rotatedTrigger])).toMatchObject({
      code: "AREA_UPDATE_OBJECT_MUTATION_INVALID",
      message: "Existing trigger bearing cannot be materialized without proven rotation authority.",
      details: [
        "obj_trg_generictrigger",
        `bearing expected=0 actual=${Math.PI / 2}`,
      ],
    });
  });

  it("binds one Trigger polygon CAS pair to the exact retained family ordinal", () => {
    const retainedTrigger = {
      ...retained(
      "obj_trg_generictrigger",
      "trigger",
      "triggers",
      "newgeneric",
      "GenericTrigger",
      3.547599411010742,
      4.491108703613281,
      ),
      bearing: 0,
    };
    const mutation = {
      kind: "trigger" as const,
      sourceObjectId: "obj_trg_generictrigger",
      sourceIndex: 0,
      expectedGeometry: nativeTriggerPolygon(),
      geometry: polygon([[-1, -1, 0], [3, -1, 0], [0, 4, 0.5]]),
    };

    const plan = planExistingAreaObjectDeletions(
      sourceGit({ includeTrigger: true }),
      editing([retainedTrigger], [], [], [mutation]),
    );

    expect(plan.polygonMutations).toEqual([mutation]);
    expect(plan.deletions).toEqual([
      { kind: "creature", sourceIndex: 0 },
      { kind: "item", sourceIndex: 0 },
    ]);
  });

  it("rejects stale Trigger polygon provenance before the writer", () => {
    const retainedTrigger = {
      ...retained(
      "obj_trg_generictrigger",
      "trigger",
      "triggers",
      "newgeneric",
      "GenericTrigger",
      3.547599411010742,
      4.491108703613281,
      ),
      bearing: 0,
    };
    const stale = nativeTriggerPolygon();
    stale.points[0] = { ...stale.points[0]!, x: stale.points[0]!.x - 1 };
    expect(() => planExistingAreaObjectDeletions(
      sourceGit({ includeTrigger: true }),
      editing([retainedTrigger], [], [], [{
        kind: "trigger",
        sourceObjectId: "obj_trg_generictrigger",
        sourceIndex: 0,
        expectedGeometry: stale,
        geometry: polygon([[-1, -1, 0], [3, -1, 0], [0, 4, 0.5]]),
      }]),
    )).toThrow(expect.objectContaining({
      message: "Polygon expected value differs from exact source GIT provenance.",
    }));
  });

  it("plans the audited position-only transform for one retained encounter with empty spawn points", () => {
    const movedEncounter = {
      ...retained(
        "obj_enc_x2_gnoll001",
        "encounter",
        "encounters",
        "x2_gnoll001",
        "X2_GNOLL001",
        4.25,
        5.75,
      ),
      z: 0.5,
      bearing: 0,
    };

    const plan = planExistingAreaObjectDeletions(
      sourceGit({ includeEncounter: true }),
      editing([movedEncounter]),
    );

    expect(plan.transforms).toEqual([{
      kind: "encounter",
      sourceIndex: 0,
      x: 4.25,
      y: 5.75,
      z: 0.5,
    }]);
  });

  it("rejects an encounter bearing delta without inventing native orientation", () => {
    const rotatedEncounter = {
      ...retained(
        "obj_enc_x2_gnoll001",
        "encounter",
        "encounters",
        "x2_gnoll001",
        "X2_GNOLL001",
        2.2412,
        4.5197,
      ),
      bearing: Math.PI / 2,
    };

    expect(planError(sourceGit({ includeEncounter: true }), [rotatedEncounter])).toMatchObject({
      code: "AREA_UPDATE_OBJECT_MUTATION_INVALID",
      message: "Existing encounter bearing cannot be materialized without proven rotation authority.",
      details: [
        "obj_enc_x2_gnoll001",
        `bearing expected=0 actual=${Math.PI / 2}`,
      ],
    });
  });

  it("rejects malformed source GIT with the default immutable diagnostic list", () => {
    const error = planError(Buffer.from("not-a-git"), []);
    expect(error).toMatchObject({
      name: "AreaExistingObjectDeletionPlanError",
      code: "AREA_UPDATE_OBJECT_MUTATION_INVALID",
      message: "The exact source GIT/GIC pair cannot be parsed as paired Area object resources.",
      details: [],
    });
    expect(Object.isFrozen(error.details)).toBe(true);
  });

  it("constructs the exported error with an empty default detail list", () => {
    const error = new AreaExistingObjectDeletionPlanError("diagnostic");
    expect(error).toMatchObject({
      name: "AreaExistingObjectDeletionPlanError",
      code: "AREA_UPDATE_OBJECT_MUTATION_INVALID",
      message: "diagnostic",
      details: [],
    });
  });
});

function exactCreatureHitPointGffFields(): readonly SupportedGffField[] {
  return [
    { label: "HitPoints", type: "short", value: 10 },
    { label: "CurrentHitPoints", type: "short", value: 7 },
    { label: "MaxHitPoints", type: "short", value: 99 },
    { label: "Con", type: "byte", value: 14 },
    { label: "Race", type: "byte", value: 1 },
    {
      label: "ClassList",
      type: "list",
      value: [
        { typeId: 0, fields: [{ label: "ClassLevel", type: "short", value: 3 }] },
        { typeId: 1, fields: [{ label: "ClassLevel", type: "short", value: 2 }] },
      ],
    },
    { label: "FeatList", type: "list", value: [] },
  ];
}

function sourceGit(options: Readonly<{
  creatureResRef?: string;
  creatureTag?: string;
  creatureConversationFields?: readonly SupportedGffField[];
  creatureInterruptableFields?: readonly SupportedGffField[];
  creatureAdvancedFlagFields?: readonly SupportedGffField[];
  creatureDeathRemainsFields?: readonly SupportedGffField[];
  creatureFactionFields?: readonly SupportedGffField[];
  creatureTemplateResRefFields?: readonly SupportedGffField[];
  creatureSpecialIdentityStringFields?: readonly SupportedGffField[];
  creatureScriptResRefFields?: readonly SupportedGffField[];
  creatureAppearanceFields?: readonly SupportedGffField[];
  creatureGenderFields?: readonly SupportedGffField[];
  creaturePerceptionRangeFields?: readonly SupportedGffField[];
  creatureWalkRateFields?: readonly SupportedGffField[];
  creatureSoundSetFileFields?: readonly SupportedGffField[];
  creatureStartingPackageFields?: readonly SupportedGffField[];
  creatureSkillListFields?: readonly SupportedGffField[];
  creaturePortraitFields?: readonly SupportedGffField[];
  creatureChallengeRatingFields?: readonly SupportedGffField[];
  creatureAbilityScoreFields?: readonly SupportedGffField[];
  creatureAppearanceColorFields?: readonly SupportedGffField[];
  creatureBodyPartFields?: readonly SupportedGffField[];
  creatureAppendageFields?: readonly SupportedGffField[];
  creatureHitPointFields?: readonly SupportedGffField[];
  creatureNaturalArmorClassFields?: readonly SupportedGffField[];
  creatureSavingThrowBonusFields?: readonly SupportedGffField[];
  creatureAlignmentFields?: readonly SupportedGffField[];
  creatureX?: number;
  creatureInventory?: readonly Readonly<{
    resRef: string;
    x: number;
    y: number;
    dropable: boolean;
    pickpocketable: boolean;
  }>[];
  creatureEquipment?: readonly Readonly<{
    resRef: string;
    slotMask: number;
    dropable: boolean;
    pickpocketable: boolean;
  }>[];
  creatureLocalizedStringFields?: readonly SupportedGffField[];
  includeDoor?: boolean;
  includeEncounter?: boolean;
  encounterTemplateResRefFields?: readonly SupportedGffField[];
  includePlaceable?: boolean;
  omitPlaceableOnUsed?: boolean;
  omitPlaceableStatic?: boolean;
  omitPlaceableUseable?: boolean;
  omitPlaceablePlot?: boolean;
  omitPlaceableHasInventory?: boolean;
  omitPlaceableLockField?: string;
  omitPlaceableKeyName?: boolean;
  omitPlaceableScriptField?: string;
  omitPlaceableBasicByteField?: string;
  omitPlaceableConversation?: boolean;
  omitPlaceableInterruptable?: boolean;
  omitPlaceableAnimationState?: boolean;
  placeableAnimationStateFields?: readonly SupportedGffField[];
  placeableAppearanceFields?: readonly SupportedGffField[];
  placeableTrapTypeFields?: readonly SupportedGffField[];
  placeableBodyBagFields?: readonly SupportedGffField[];
  placeablePortraitFields?: readonly SupportedGffField[];
  placeableFactionFields?: readonly SupportedGffField[];
  placeableVariableFields?: readonly SupportedGffField[];
  placeableTemplateResRefFields?: readonly SupportedGffField[];
  placeableHitPointFields?: readonly SupportedGffField[];
  placeableTag?: string;
  placeableTagFields?: readonly SupportedGffField[];
  placeableLocalizedStringFields?: readonly SupportedGffField[];
  omitPlaceableTrapByteField?: string;
  placeableInventory?: readonly Readonly<{ resRef: string; x: number; y: number }>[];
  itemLocalizedStringFields?: readonly SupportedGffField[];
  itemPropertyListFields?: readonly SupportedGffField[];
  itemInventory?: readonly Readonly<{
    sourceIndex: number;
    resRef: string;
    x: number;
    y: number;
  }>[];
  itemVisualTransformFields?: readonly SupportedGffField[];
  includeSound?: boolean;
  includeStore?: boolean;
  storeCommerceFields?: readonly SupportedGffField[];
  storeRestrictionFields?: readonly SupportedGffField[];
  includeTrigger?: boolean;
  includeWaypoint?: boolean;
  waypointLocalizedNameFields?: readonly SupportedGffField[];
  waypointDescriptionFields?: readonly SupportedGffField[];
  waypointTemplateResRefFields?: readonly SupportedGffField[];
}> = { creatureResRef: "nw_guard", creatureTag: "NW_GUARD" }): Buffer {
  const creatureResRef = Object.prototype.hasOwnProperty.call(options, "creatureResRef")
    ? options.creatureResRef
    : "nw_guard";
  const creatureTag = Object.prototype.hasOwnProperty.call(options, "creatureTag")
    ? options.creatureTag
    : "NW_GUARD";
  const creatureX = options.creatureX ?? 10;
  const fields: SupportedGffField[] = FAMILIES.map(([label, typeId]) => ({
    label,
    type: "list",
    value: label === "Creature List"
      ? [{
          ...placement(typeId, creatureResRef, creatureTag, creatureX, 20, Math.PI / 2),
          fields: [
            ...placement(typeId, creatureResRef, creatureTag, creatureX, 20, Math.PI / 2).fields
              .filter((field) =>
                options.creatureTemplateResRefFields === undefined ||
                field.label !== "TemplateResRef"
              ),
            ...(options.creatureTemplateResRefFields ?? []),
            ...(options.creatureConversationFields ?? []),
            ...(options.creatureInterruptableFields ?? []),
            ...(options.creatureAdvancedFlagFields ?? []),
            ...(options.creatureDeathRemainsFields ?? []),
            ...(options.creatureFactionFields ?? []),
            ...(options.creatureSpecialIdentityStringFields ?? []),
            ...(options.creatureScriptResRefFields ?? []),
            ...(options.creatureAppearanceFields ?? []),
            ...(options.creatureGenderFields ?? []),
            ...(options.creaturePerceptionRangeFields ?? []),
            ...(options.creatureWalkRateFields ?? []),
            ...(options.creatureSoundSetFileFields ?? []),
            ...(options.creatureStartingPackageFields ?? []),
            ...(options.creatureSkillListFields ?? []),
            ...(options.creaturePortraitFields ?? []),
            ...(options.creatureChallengeRatingFields ?? []),
            ...(options.creatureAbilityScoreFields ?? []),
            ...(options.creatureAppearanceColorFields ?? []),
            ...(options.creatureBodyPartFields ?? []),
            ...(options.creatureAppendageFields ?? []),
            ...(options.creatureHitPointFields ?? []),
            ...(options.creatureNaturalArmorClassFields ?? []),
            ...(options.creatureSavingThrowBonusFields ?? []),
            ...(options.creatureAlignmentFields ?? []),
            ...(options.creatureLocalizedStringFields ?? []),
            ...(options.creatureInventory
              ? [{
                  label: "ItemList",
                  type: "list" as const,
                  value: options.creatureInventory.map((entry, sourceIndex) => ({
                    typeId: sourceIndex,
                    fields: [
                      { label: "TemplateResRef", type: "resref" as const, value: entry.resRef },
                      { label: "InventoryProbe", type: "dword" as const, value: 0x87654321 },
                      { label: "Repos_PosX", type: "word" as const, value: entry.x },
                      { label: "Repos_Posy", type: "word" as const, value: entry.y },
                      ...(entry.dropable
                        ? [{ label: "Dropable", type: "byte" as const, value: 1 }]
                        : []),
                      ...(entry.pickpocketable
                        ? [{ label: "Pickpocketable", type: "byte" as const, value: 1 }]
                        : []),
                    ],
                  })),
                }]
              : []),
            ...(options.creatureEquipment
              ? [{
                  label: "Equip_ItemList",
                  type: "list" as const,
                  value: options.creatureEquipment.map((entry) => ({
                    typeId: entry.slotMask,
                    fields: [
                      { label: "TemplateResRef", type: "resref" as const, value: entry.resRef },
                      { label: "EquipmentProbe", type: "dword" as const, value: 0x76543210 },
                      ...(entry.dropable
                        ? [{ label: "Dropable", type: "byte" as const, value: 1 }]
                        : []),
                      ...(entry.pickpocketable
                        ? [{ label: "Pickpocketable", type: "byte" as const, value: 1 }]
                        : []),
                    ],
                  })),
                }]
              : []),
          ],
        }]
      : label === "Door List" && options.includeDoor
        ? [{
            ...placement(typeId, "nw_door", "DOOR", 40, 50, 0),
            fields: [
              ...placement(typeId, "nw_door", "DOOR", 40, 50, 0).fields,
              { label: "LinkedTo", type: "cexostring" as const, value: "OLD_DEST" },
              { label: "LinkedToFlags", type: "byte" as const, value: 1 },
              { label: "LoadScreenID", type: "word" as const, value: 0 },
            ],
          }]
      : label === "Encounter List" && options.includeEncounter
        ? [encounterPlacement(typeId, options.encounterTemplateResRefFields)]
      : label === "Placeable List" && options.includePlaceable
        ? [{
            ...placement(typeId, "plc_chest", options.placeableTag ?? "CHEST", 40, 50, 0),
            fields: [
              ...(options.placeableTagFields === undefined
                ? placement(typeId, "plc_chest", options.placeableTag ?? "CHEST", 40, 50, 0).fields
                : [
                    ...placement(typeId, "plc_chest", options.placeableTag ?? "CHEST", 40, 50, 0)
                      .fields.filter((field) => field.label !== "Tag"),
                    ...options.placeableTagFields,
                  ]).filter((field) =>
                    options.placeableTemplateResRefFields === undefined ||
                    field.label !== "TemplateResRef"
                  ),
              ...(options.placeableTemplateResRefFields === undefined
                ? []
                : options.placeableTemplateResRefFields),
              ...(options.omitPlaceableOnUsed
                ? []
                : [{ label: "OnUsed", type: "resref" as const, value: "" }]),
              ...(options.omitPlaceableStatic
                ? []
                : [{ label: "Static", type: "byte" as const, value: 1 }]),
              ...(options.omitPlaceableUseable
                ? []
                : [{ label: "Useable", type: "byte" as const, value: 0 }]),
              ...(options.omitPlaceablePlot
                ? []
                : [{ label: "Plot", type: "byte" as const, value: 0 }]),
              ...(options.omitPlaceableHasInventory
                ? []
                : [{ label: "HasInventory", type: "byte" as const, value: 0 }]),
              ...(options.omitPlaceableKeyName
                ? []
                : [{ label: "KeyName", type: "cexostring" as const, value: "" }]),
              ...([
                { label: "Hardness", type: "byte" as const, value: 5 },
                { label: "Fort", type: "byte" as const, value: 16 },
                { label: "Ref", type: "byte" as const, value: 0 },
                { label: "Will", type: "byte" as const, value: 0 },
              ].filter((field) => field.label !== options.omitPlaceableBasicByteField)),
              ...(options.omitPlaceableConversation
                ? []
                : [{ label: "Conversation", type: "resref" as const, value: "" }]),
              ...(options.omitPlaceableInterruptable
                ? []
                : [{ label: "Interruptable", type: "byte" as const, value: 1 }]),
              ...(options.placeableAnimationStateFields
                ? options.placeableAnimationStateFields
                : options.omitPlaceableAnimationState
                  ? []
                  : [{ label: "AnimationState", type: "byte" as const, value: 0 }]),
              ...(options.placeableAppearanceFields ?? []),
              ...(options.placeableTrapTypeFields ?? []),
              ...(options.placeableBodyBagFields ?? []),
              ...(options.placeablePortraitFields ?? []),
              ...(options.placeableFactionFields ?? []),
              ...(options.placeableVariableFields ?? []),
              ...(options.placeableHitPointFields ?? [
                { label: "HP", type: "short" as const, value: 15 },
                { label: "CurrentHP", type: "short" as const, value: 45 },
              ]),
              ...(options.placeableLocalizedStringFields ?? []),
              ...([
                { label: "TrapFlag", type: "byte" as const, value: 0 },
                { label: "TrapDetectable", type: "byte" as const, value: 1 },
                { label: "TrapDisarmable", type: "byte" as const, value: 1 },
                { label: "TrapOneShot", type: "byte" as const, value: 1 },
                { label: "TrapDetectDC", type: "byte" as const, value: 0 },
                { label: "DisarmDC", type: "byte" as const, value: 15 },
              ].filter((field) => field.label !== options.omitPlaceableTrapByteField)),
              ...([
                { label: "Locked", type: "byte" as const, value: 0 },
                { label: "Lockable", type: "byte" as const, value: 0 },
                { label: "AutoRemoveKey", type: "byte" as const, value: 0 },
                { label: "KeyRequired", type: "byte" as const, value: 0 },
                { label: "OpenLockDC", type: "byte" as const, value: 18 },
                { label: "CloseLockDC", type: "byte" as const, value: 0 },
              ].filter((field) => field.label !== options.omitPlaceableLockField)),
              ...([
                ["OnClick", ""],
                ["OnClosed", "old_closed"],
                ["OnDamaged", "old_damaged"],
                ["OnDeath", "old_death"],
                ["OnHeartbeat", "old_heartbeat"],
                ["OnInvDisturbed", "old_inv"],
                ["OnLock", "old_lock"],
                ["OnMeleeAttacked", "old_melee"],
                ["OnOpen", "old_open"],
                ["OnSpellCastAt", "old_spell"],
                ["OnUnlock", "old_unlock"],
                ["OnUserDefined", "old_user"],
                ["OnDisarm", "old_disarm"],
                ["OnTrapTriggered", "old_trap"],
              ] as const)
                .filter(([field]) => field !== options.omitPlaceableScriptField)
                .map(([label, value]) => ({ label, type: "resref" as const, value })),
              ...(options.placeableInventory
                ? [{
                    label: "ItemList",
                    type: "list" as const,
                    value: options.placeableInventory.map((entry, sourceIndex) => ({
                      typeId: sourceIndex,
                      fields: [
                        { label: "TemplateResRef", type: "resref" as const, value: entry.resRef },
                        { label: "InventoryProbe", type: "dword" as const, value: 0x12345678 },
                        { label: "Repos_PosX", type: "word" as const, value: entry.x },
                        { label: "Repos_Posy", type: "word" as const, value: entry.y },
                      ],
                    })),
                  }]
                : []),
            ],
          }]
      : label === "SoundList" && options.includeSound
        ? [{
            ...placement(typeId, "animalcriesday", "AnimalCriesDay", 40, 50, 0),
            fields: [
              ...placement(typeId, "animalcriesday", "AnimalCriesDay", 40, 50, 0).fields,
              { label: "Interval", type: "dword" as const, value: 25_000 },
              { label: "IntervalVrtn", type: "dword" as const, value: 5_000 },
              { label: "PitchVariation", type: "float" as const, value: Math.fround(0.2) },
              { label: "VolumeVrtn", type: "byte" as const, value: 64 },
              { label: "Volume", type: "byte" as const, value: 64 },
              { label: "Hours", type: "dword" as const, value: 0 },
              { label: "Times", type: "byte" as const, value: 3 },
              { label: "Active", type: "byte" as const, value: 1 },
              { label: "Random", type: "byte" as const, value: 0 },
              { label: "Continuous", type: "byte" as const, value: 1 },
              { label: "Looping", type: "byte" as const, value: 0 },
              { label: "Positional", type: "byte" as const, value: 1 },
              { label: "RandomPosition", type: "byte" as const, value: 0 },
              { label: "Elevation", type: "float" as const, value: 0 },
              { label: "MaxDistance", type: "float" as const, value: 14 },
              { label: "MinDistance", type: "float" as const, value: 2 },
              { label: "RandomRangeX", type: "float" as const, value: 0 },
              { label: "RandomRangeY", type: "float" as const, value: 0 },
              { label: "Priority", type: "byte" as const, value: 20 },
              {
                label: "Sounds",
                type: "list" as const,
                value: ["snd_a", "snd_b", "snd_c", "snd_d"].map((value) => ({
                  typeId: 0,
                  fields: [{ label: "Sound", type: "resref" as const, value }],
                })),
              },
            ],
          }]
      : label === "StoreList" && options.includeStore
        ? [{
            ...placement(typeId, "x2_merc_dye", "x2_merc_dye", 42.91445541381836, 50.39402770996094, Math.PI * 1.5),
            fields: [
              ...placement(typeId, "x2_merc_dye", "x2_merc_dye", 42.91445541381836, 50.39402770996094, Math.PI * 1.5).fields,
              ...(options.storeCommerceFields ?? storeCommerceFields()),
              { label: "OnOpenStore", type: "resref" as const, value: "store_open" },
              { label: "OnStoreClosed", type: "resref" as const, value: "store_closed" },
              ...(options.storeRestrictionFields ?? []),
            ],
          }]
      : label === "TriggerList" && options.includeTrigger
        ? [triggerPlacement(typeId)]
      : label === "WaypointList" && options.includeWaypoint
        ? [{
            ...placement(
              typeId,
              "nw_waypoint001",
              "WAYPOINT",
              33.1162,
              47.7472,
              Math.PI * 1.5,
            ),
            fields: [
              ...placement(
                typeId,
                "nw_waypoint001",
                "WAYPOINT",
                33.1162,
                47.7472,
                Math.PI * 1.5,
              ).fields.filter((field) =>
                options.waypointTemplateResRefFields === undefined ||
                field.label !== "TemplateResRef"
              ),
              ...(options.waypointTemplateResRefFields ?? []),
              ...(options.waypointLocalizedNameFields ?? []),
              ...(options.waypointDescriptionFields ?? []),
            ],
          }]
      : label === "List"
        ? [{
            ...placement(typeId, "nw_sword", "NW_SWORD", 30, 40, 0),
            fields: [
              ...placement(typeId, "nw_sword", "NW_SWORD", 30, 40, 0).fields,
              ...(options.itemLocalizedStringFields ?? []),
              ...(options.itemPropertyListFields ?? []),
              ...(options.itemInventory
                ? [{
                    label: "ItemList",
                    type: "list" as const,
                    value: options.itemInventory.map((entry) => ({
                      typeId: entry.sourceIndex,
                      fields: [
                        { label: "TemplateResRef", type: "resref" as const, value: entry.resRef },
                        { label: "InventoryProbe", type: "dword" as const, value: 0x13572468 },
                        { label: "Repos_PosX", type: "word" as const, value: entry.x },
                        { label: "Repos_Posy", type: "word" as const, value: entry.y },
                      ],
                    })),
                  }]
                : []),
              ...(options.itemVisualTransformFields ?? []),
            ],
          }]
        : [],
  }));
  return buildGffBuffer(fields, "GIT ", ROOT_TYPE);
}

function storeCommerce() {
  return {
    markUp: 100,
    markDown: 65,
    blackMarket: false,
    blackMarketMarkDown: 25,
    identifyPrice: 100,
    maxBuyPrice: -1,
    storeGold: -1,
  } as const;
}

function storeCommerceFields(): SupportedGffField[] {
  return [
    { label: "MarkUp", type: "int", value: 100 },
    { label: "MarkDown", type: "int", value: 65 },
    { label: "BlackMarket", type: "byte", value: 0 },
    { label: "BM_MarkDown", type: "int", value: 25 },
    { label: "IdentifyPrice", type: "int", value: 100 },
    { label: "MaxBuyPrice", type: "int", value: -1 },
    { label: "StoreGold", type: "int", value: -1 },
  ];
}

function storeRestrictionFields(
  willNotBuy: readonly number[],
  willOnlyBuy: readonly number[],
): SupportedGffField[] {
  const list = (label: "WillNotBuy" | "WillOnlyBuy", baseItemIds: readonly number[]) => ({
    label,
    type: "list" as const,
    value: baseItemIds.map((value) => ({
      typeId: 0x0001_7e4d,
      fields: [{ label: "BaseItem", type: "int" as const, value }],
    })),
  });
  return [list("WillNotBuy", willNotBuy), list("WillOnlyBuy", willOnlyBuy)];
}

function itemPropertyListField(): SupportedGffField {
  return {
    label: "PropertiesList",
    type: "list",
    value: [{
      typeId: 0,
      fields: [
        { label: "PropertyName", type: "word", value: 1 },
        { label: "Subtype", type: "word", value: 0xffff },
        { label: "CostTable", type: "byte", value: 2 },
        { label: "CostValue", type: "word", value: 3 },
        { label: "Param1", type: "byte", value: 0xff },
        { label: "Param1Value", type: "byte", value: 0 },
        { label: "ChanceAppear", type: "byte", value: 100 },
      ],
    }],
  };
}

function itemVisualTransformStorage() {
  return {
    present: true as const,
    value: {
      scaleX: Math.fround(0.5),
      scaleY: Math.fround(0.75),
      scaleZ: Math.fround(1.25),
      rotateX: Math.fround(-15),
      rotateY: Math.fround(30),
      rotateZ: Math.fround(90),
      translateX: Math.fround(20),
      translateY: Math.fround(-30),
      translateZ: Math.fround(40),
    },
  };
}

function itemVisualTransformField(): SupportedGffField {
  const value = itemVisualTransformStorage().value;
  const controller = (controllerValue: number) => ({
    typeId: 0,
    fields: [
      { label: "TimerType", type: "int" as const, value: 0 },
      { label: "ValueTo", type: "float" as const, value: controllerValue },
      { label: "LerpType", type: "int" as const, value: 0 },
    ],
  });
  return {
    label: "VisTransformList",
    type: "list",
    value: [{
      typeId: 6,
      fields: [
        { label: "Scope", type: "int", value: 0 },
        { label: "AnimationSpeed", type: "struct", value: controller(1) },
        { label: "ScaleX", type: "struct", value: controller(value.scaleX) },
        { label: "ScaleY", type: "struct", value: controller(value.scaleY) },
        { label: "ScaleZ", type: "struct", value: controller(value.scaleZ) },
        { label: "RotateX", type: "struct", value: controller(value.rotateX) },
        { label: "RotateY", type: "struct", value: controller(value.rotateY) },
        { label: "RotateZ", type: "struct", value: controller(value.rotateZ) },
        { label: "TranslateX", type: "struct", value: controller(value.translateX) },
        { label: "TranslateY", type: "struct", value: controller(value.translateY) },
        { label: "TranslateZ", type: "struct", value: controller(value.translateZ) },
      ],
    }],
  };
}

function placement(
  typeId: number,
  resRef: string | undefined,
  tag: string | undefined,
  x: number,
  y: number,
  bearing: number,
) {
  const orientationFields = typeId === 6
    ? []
    : typeId === 0 || typeId === 4 || typeId === 5 || typeId === 11
    ? [
        { label: "XOrientation", type: "float" as const, value: Math.cos(bearing) },
        { label: "YOrientation", type: "float" as const, value: -Math.sin(bearing) },
      ]
    : [{ label: "Bearing", type: "float" as const, value: bearing }];
  return {
    typeId,
    fields: [
      ...(resRef === undefined ? [] : [{ label: "TemplateResRef", type: "resref" as const, value: resRef }]),
      ...(tag === undefined ? [] : [{ label: "Tag", type: "cexostring" as const, value: tag }]),
      { label: "XPosition", type: "float" as const, value: x },
      { label: "YPosition", type: "float" as const, value: y },
      { label: "ZPosition", type: "float" as const, value: 0 },
      ...orientationFields,
    ],
  };
}

function triggerPlacement(typeId: number) {
  return {
    typeId,
    fields: [
      { label: "TemplateResRef", type: "resref" as const, value: "newgeneric" },
      { label: "Tag", type: "cexostring" as const, value: "GenericTrigger" },
      { label: "LinkedTo", type: "cexostring" as const, value: " OLD_DESTINATION " },
      { label: "LinkedToFlags", type: "byte" as const, value: 1 },
      { label: "LoadScreenID", type: "word" as const, value: 0 },
      ...Object.entries(triggerScripts()).map(([label, value]) => ({
        label: ({
          onDisarm: "OnDisarm",
          onTrapTriggered: "OnTrapTriggered",
          onClick: "OnClick",
          onHeartbeat: "ScriptHeartbeat",
          onEnter: "ScriptOnEnter",
          onExit: "ScriptOnExit",
          onUserDefined: "ScriptUserDefine",
        } as const)[label as keyof ReturnType<typeof triggerScripts>],
        type: "resref" as const,
        value,
      })),
      { label: "XPosition", type: "float" as const, value: 35.47599411010742 },
      { label: "YPosition", type: "float" as const, value: 44.91108703613281 },
      { label: "ZPosition", type: "float" as const, value: 0 },
      { label: "XOrientation", type: "float" as const, value: 0 },
      { label: "YOrientation", type: "float" as const, value: 0 },
      { label: "ZOrientation", type: "float" as const, value: 0 },
      {
        label: "Geometry",
        type: "list" as const,
        value: [
          geometryPoint(-0.2990303039550781, -4.833713531494141, 0.02500000037252903),
          geometryPoint(4.8592987060546875, -4.833709716796875, 0.025000499561429024),
          geometryPoint(4.8592987060546875, 0.324615478515625, 0.025000499561429024),
          geometryPoint(0, 0, 3.125),
        ],
      },
    ],
  };
}

function triggerScripts() {
  return {
    onDisarm: "trg_disarm",
    onTrapTriggered: "trg_trapped",
    onClick: "",
    onHeartbeat: "trg_heartbeat",
    onEnter: "trg_enter",
    onExit: "trg_exit",
    onUserDefined: "trg_user",
  };
}

function triggerTransitionStorage() {
  return {
    linkedTo: " OLD_DESTINATION ",
    linkedToFlags: 1,
    loadScreenId: 0,
  };
}

function encounterPlacement(
  typeId: number,
  templateResRefFields?: readonly SupportedGffField[],
) {
  return {
    typeId,
    fields: [
      ...(templateResRefFields ?? [{
        label: "TemplateResRef",
        type: "resref" as const,
        value: "x2_gnoll001",
      }]),
      { label: "Tag", type: "cexostring" as const, value: "X2_GNOLL001" },
      {
        label: "LocalizedName",
        type: "cexolocstring" as const,
        value: {
          strRef: 0xffff_ffff,
          entries: [{ languageId: 0, text: "Gnoll Ambush" }],
        },
      },
      { label: "Active", type: "byte" as const, value: 1 },
      { label: "PlayerOnly", type: "byte" as const, value: 1 },
      { label: "Reset", type: "byte" as const, value: 1 },
      { label: "ResetTime", type: "int" as const, value: 60 },
      { label: "SpawnOption", type: "int" as const, value: 1 },
      { label: "Respawns", type: "int" as const, value: 0 },
      { label: "MaxCreatures", type: "int" as const, value: 4 },
      { label: "RecCreatures", type: "int" as const, value: 2 },
      { label: "OnEntered", type: "resref" as const, value: "enc_enter" },
      { label: "OnExit", type: "resref" as const, value: "enc_exit" },
      { label: "OnExhausted", type: "resref" as const, value: "" },
      { label: "OnHeartbeat", type: "resref" as const, value: "enc_heartbeat" },
      { label: "OnUserDefined", type: "resref" as const, value: "enc_user" },
      {
        label: "CreatureList",
        type: "list" as const,
        value: [
          { typeId: 0, fields: [
            { label: "Appearance", type: "int" as const, value: 388 },
            { label: "CR", type: "float" as const, value: 1 },
            { label: "ResRef", type: "resref" as const, value: "nw_gnoll001" },
            { label: "SingleSpawn", type: "byte" as const, value: 0 },
          ] },
          { typeId: 0, fields: [
            { label: "Appearance", type: "int" as const, value: 389 },
            { label: "CR", type: "float" as const, value: 3 },
            { label: "ResRef", type: "resref" as const, value: "nw_gnoll002" },
            { label: "SingleSpawn", type: "byte" as const, value: 1 },
          ] },
        ],
      },
      { label: "Faction", type: "dword" as const, value: 1 },
      { label: "Difficulty", type: "int" as const, value: 1 },
      { label: "DifficultyIndex", type: "int" as const, value: 2 },
      { label: "XPosition", type: "float" as const, value: 22.412015914916992 },
      { label: "YPosition", type: "float" as const, value: 45.1970329284668 },
      { label: "ZPosition", type: "float" as const, value: 0 },
      {
        label: "Geometry",
        type: "list" as const,
        value: [
          encounterGeometryPoint(-0.13086700439453125, -6.151325225830078, 0.0250005591660738),
          encounterGeometryPoint(6.059123992919922, -6.1513214111328125, 0.025000499561429024),
          encounterGeometryPoint(6.059125900268555, 0.038669586181640625, 0.025000059977173805),
          encounterGeometryPoint(0, 0, 0.02500000037252903),
        ],
      },
      { label: "SpawnPointList", type: "list" as const, value: [] },
    ],
  };
}

function encounterGeometryPoint(x: number, y: number, z: number) {
  return {
    typeId: 1,
    fields: [
      { label: "X", type: "float" as const, value: x },
      { label: "Y", type: "float" as const, value: y },
      { label: "Z", type: "float" as const, value: z },
    ],
  };
}

function geometryPoint(x: number, y: number, z: number) {
  return {
    typeId: 3,
    fields: [
      { label: "PointX", type: "float" as const, value: x },
      { label: "PointY", type: "float" as const, value: y },
      { label: "PointZ", type: "float" as const, value: z },
    ],
  };
}

function editing(
  retainedObjects: ProjectedAreaObjectEditing["retainedObjects"],
  propertyMutations: NonNullable<ProjectedAreaObjectEditing["propertyMutations"]> = [],
  doorTransitionMutations: NonNullable<ProjectedAreaObjectEditing["doorTransitionMutations"]> = [],
  polygonMutations: NonNullable<ProjectedAreaObjectEditing["polygonMutations"]> = [],
  soundIntervalVariationMutations:
    NonNullable<ProjectedAreaObjectEditing["soundIntervalVariationMutations"]> = [],
  soundVolumeMutations: NonNullable<ProjectedAreaObjectEditing["soundVolumeMutations"]> = [],
  soundScheduleMutations: NonNullable<ProjectedAreaObjectEditing["soundScheduleMutations"]> = [],
  soundActiveMutations: NonNullable<ProjectedAreaObjectEditing["soundActiveMutations"]> = [],
  soundPlayOrderMutations:
    NonNullable<ProjectedAreaObjectEditing["soundPlayOrderMutations"]> = [],
): ProjectedAreaObjectEditing {
  return {
    sourceGitSha256: "b".repeat(64),
    retainedObjects,
    newObjects: [],
    ...(propertyMutations.length > 0 ? { propertyMutations } : {}),
    ...(doorTransitionMutations.length > 0 ? { doorTransitionMutations } : {}),
    ...(polygonMutations.length > 0 ? { polygonMutations } : {}),
    ...(soundIntervalVariationMutations.length > 0
      ? { soundIntervalVariationMutations }
      : {}),
    ...(soundVolumeMutations.length > 0 ? { soundVolumeMutations } : {}),
    ...(soundScheduleMutations.length > 0 ? { soundScheduleMutations } : {}),
    ...(soundActiveMutations.length > 0 ? { soundActiveMutations } : {}),
    ...(soundPlayOrderMutations.length > 0 ? { soundPlayOrderMutations } : {}),
  };
}

function nativeTriggerPolygon() {
  return polygon([
    [-0.2990303039550781, -4.833713531494141, 0.02500000037252903],
    [4.8592987060546875, -4.833709716796875, 0.025000499561429024],
    [4.8592987060546875, 0.324615478515625, 0.025000499561429024],
    [0, 0, 3.125],
  ]);
}

function polygon(points: ReadonlyArray<readonly [number, number, number]>) {
  return {
    coordinateSpace: "native_local" as const,
    points: points.map(([x, y, z]) => ({ x, y, z })),
  };
}

function planExistingAreaObjectDeletions(
  git: Buffer,
  value: ProjectedAreaObjectEditing,
  gic: Buffer = sourceGicForGit(git),
) {
  return planExistingAreaObjectDeletionsFromPair(git, gic, value);
}

function sourceGicForGit(
  git: Buffer,
  overrides: Readonly<{
    waypointComments?: readonly (string | undefined)[];
  }> = {},
): Buffer {
  const parsed = parseAreaObjectsFromGitGff(git);
  const count = parsed?.placeables.length ?? 0;
  const creatureCount = parsed?.creatures.length ?? 0;
  const itemCount = parsed?.items.length ?? 0;
  const storeCount = parsed?.stores.length ?? 0;
  const encounterCount = parsed?.encounters.length ?? 0;
  const triggerCount = parsed?.triggers.length ?? 0;
  const waypointCount = parsed?.waypoints.length ?? 0;
  return sourceGic(
    Array.from({ length: count }, () => undefined),
    {
      creatureComments: Array.from({ length: creatureCount }, () => ""),
      itemComments: Array.from({ length: itemCount }, () => ""),
      storeComments: Array.from({ length: storeCount }, () => ""),
      encounterComments: Array.from({ length: encounterCount }, () => ""),
      triggerComments: Array.from({ length: triggerCount }, () => ""),
      waypointComments: overrides.waypointComments ??
        Array.from({ length: waypointCount }, () => ""),
    },
  );
}

function sourceGic(
  comments: readonly (string | undefined)[],
  options: Readonly<{
    structTypeId?: number;
    duplicateComment?: boolean;
    commentType?: "cexostring" | "resref";
    creatureComments?: readonly (string | undefined)[];
    itemComments?: readonly (string | undefined)[];
    storeComments?: readonly (string | undefined)[];
    encounterComments?: readonly (string | undefined)[];
    triggerComments?: readonly (string | undefined)[];
    waypointComments?: readonly (string | undefined)[];
  }> = {},
): Buffer {
  return buildGffBuffer([
    {
      label: "Placeable List",
      type: "list",
      value: comments.map((comment) => ({
        typeId: options.structTypeId ?? 9,
        fields: comment === undefined
          ? []
          : [
              { label: "Comment", type: options.commentType ?? "cexostring", value: comment },
              ...(options.duplicateComment
                ? [{ label: "Comment", type: "cexostring" as const, value: `${comment} duplicate` }]
                : []),
            ],
      })),
    },
    {
      label: "Creature List",
      type: "list",
      value: (options.creatureComments ?? [""]).map((comment) => ({
        typeId: 4,
        fields: comment === undefined
          ? []
          : [{ label: "Comment", type: "cexostring", value: comment }],
      })),
    },
    {
      label: "List",
      type: "list",
      value: (options.itemComments ?? [""]).map((comment) => ({
        typeId: 0,
        fields: comment === undefined
          ? []
          : [{ label: "Comment", type: "cexostring", value: comment }],
      })),
    },
    {
      label: "StoreList",
      type: "list",
      value: (options.storeComments ?? []).map((comment) => ({
        typeId: 11,
        fields: comment === undefined
          ? []
          : [{ label: "Comment", type: "cexostring", value: comment }],
      })),
    },
    {
      label: "Encounter List",
      type: "list",
      value: (options.encounterComments ?? []).map((comment) => ({
        typeId: 7,
        fields: comment === undefined
          ? []
          : [{ label: "Comment", type: "cexostring", value: comment }],
      })),
    },
    {
      label: "TriggerList",
      type: "list",
      value: (options.triggerComments ?? []).map((comment) => ({
        typeId: 1,
        fields: comment === undefined
          ? []
          : [{ label: "Comment", type: "cexostring", value: comment }],
      })),
    },
    {
      label: "WaypointList",
      type: "list",
      value: (options.waypointComments ?? []).map((comment) => ({
        typeId: 5,
        fields: comment === undefined
          ? []
          : [{ label: "Comment", type: "cexostring", value: comment }],
      })),
    },
  ], "GIC ", ROOT_TYPE);
}

function retained(
  sourceObjectId: string,
  sourceKind: ProjectedAreaObjectEditing["retainedObjects"][number]["sourceKind"],
  sceneKind: ProjectedAreaObjectEditing["retainedObjects"][number]["sceneKind"],
  resRef: string,
  tag: string,
  x: number,
  y: number,
) {
  return { sourceObjectId, sourceKind, sceneKind, resRef, tag, x, y, z: 0, bearing: Math.PI / 2 };
}

function planError(
  git: Buffer,
  retainedObjects: ProjectedAreaObjectEditing["retainedObjects"],
): AreaExistingObjectDeletionPlanError {
  try {
    planExistingAreaObjectDeletions(git, editing(retainedObjects));
  } catch (error) {
    if (error instanceof AreaExistingObjectDeletionPlanError) return error;
    throw error;
  }
  throw new Error("Expected Area object deletion planning to fail.");
}

function propertyPlanError(
  git: Buffer,
  value: ProjectedAreaObjectEditing,
  gic: Buffer = sourceGicForGit(git),
): AreaExistingObjectDeletionPlanError {
  try {
    planExistingAreaObjectDeletions(git, value, gic);
  } catch (error) {
    if (error instanceof AreaExistingObjectDeletionPlanError) return error;
    throw error;
  }
  throw new Error("Expected Area object property mutation planning to fail.");
}
