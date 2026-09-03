import { describe, expect, it } from "vitest";
import { mapEncounterApiListItemToSceneObject } from "../../../../src/modules/encounters/application/encounterSceneObjectMapper";
import type { EncounterApiListItem } from "../../../../src/modules/encounters/contracts";

describe("encounterSceneObjectMapper", () => {
  it("maps backend encounter metadata into scene encounter properties", () => {
    const item: EncounterApiListItem = {
      templateId: "enc_forest_ambush",
      resref: "enc_forest",
      name: "Forest Ambush",
      category: "encounter",
      tags: ["forest"],
      previewImageUrl: "/api/v1/catalog/encounters/enc_forest_ambush/thumbnail",
      metadata: {
        templateResRef: "enc_forest",
        tag: "ambush_a",
        localizedName: "Ambush Alpha",
        description: "A source-backed encounter.",
        active: true,
        difficulty: 7,
        difficultyIndex: 2,
        factionId: 1,
        maxCreatures: 4,
        recCreatures: 2,
        playerOnly: false,
        reset: true,
        resetTime: 30,
        respawns: 3,
        spawnOption: 1,
        "script.onentered": "enc_entered",
        "script.onexhausted": "enc_done",
        encounterCreatureListEntries: JSON.stringify([
          {
            resRef: "nw_wolf001",
            appearance: 101,
            challengeRating: 0.5,
            singleSpawn: true
          }
        ])
      }
    };

    const object = mapEncounterApiListItemToSceneObject(item, 7);

    expect(object).toMatchObject({
      id: "enc_template_enc_forest_ambush",
      kind: "encounters",
      name: "Ambush Alpha",
      resRef: "enc_forest",
      tag: "AMBUSH_A",
      previewImageUrl: "/api/v1/catalog/encounters/enc_forest_ambush/thumbnail",
      source: {
        sourceKind: "encounter",
        templateId: "enc_forest_ambush"
      },
      encounterProperties: {
        localizedName: "Ambush Alpha",
        description: "A source-backed encounter.",
        active: true,
        difficulty: 7,
        difficultyIndex: 2,
        factionId: 1,
        maxCreatures: 4,
        recCreatures: 2,
        playerOnly: false,
        reset: true,
        resetTime: 30,
        respawns: 3,
        spawnOption: 1,
        creatureList: [
          {
            resRef: "nw_wolf001",
            appearance: 101,
            challengeRating: 0.5,
            singleSpawn: true
          }
        ],
        scripts: {
          onentered: "enc_entered",
          onexhausted: "enc_done"
        }
      }
    });
  });

  it("falls back to display name and ignores malformed CreatureList metadata", () => {
    const object = mapEncounterApiListItemToSceneObject({
      templateId: "enc_minimal",
      resref: "enc_minimal",
      name: "Minimal Encounter",
      category: "encounter",
      tags: [],
      previewImageUrl: "",
      metadata: {
        displayName: "Displayed Encounter",
        encounterCreatureListEntries: "not json"
      }
    });

    expect(object.name).toBe("Displayed Encounter");
    expect(object.previewImageUrl).toBeUndefined();
    expect(object.encounterProperties?.creatureList).toBeUndefined();
  });

  it("maps exact effective UTE provenance into an Area-constructible Encounter template", () => {
    const object = mapEncounterApiListItemToSceneObject({
      templateId: "enc_enc_dynamic",
      resref: "enc_dynamic",
      name: "Dynamic Encounter",
      category: "encounter",
      tags: ["encounter"],
      previewImageUrl: "",
      metadata: {
        templateResRef: "enc_dynamic",
        tag: "Dynamic_Encounter",
        sourceObjectKey: "modules/current/blueprints/encounters/enc_dynamic.ute",
        sourceSizeBytes: 4096,
        sourceSha256: "a".repeat(64),
        sourceExtension: "ute",
        sourceFileType: "UTE ",
        sourceFileVersion: "V3.2",
        sourceStructTypeId: 0xffffffff,
      },
    });

    expect(object).toMatchObject({
      kind: "encounters",
      resRef: "enc_dynamic",
      tag: "Dynamic_Encounter",
      source: {
        type: "aurora_blueprint",
        sourceKind: "encounter",
        sourceProfileId: "effective-catalog-ute-encounter-copy-v1",
        templateId: "enc_enc_dynamic",
        templateResRef: "enc_dynamic",
        sourceObjectKey: "modules/current/blueprints/encounters/enc_dynamic.ute",
        sourceSizeBytes: 4096,
        sourceEtag: "a".repeat(64),
        sourceFileType: "UTE ",
        sourceFileVersion: "V3.2",
        sourceStructTypeId: 0xffffffff,
      },
    });
  });
});
